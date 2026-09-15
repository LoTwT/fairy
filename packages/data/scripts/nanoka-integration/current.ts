import { DatabaseSync } from "node:sqlite"
import {
  link,
  lstat,
  mkdir,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path"
import type { HistoricalIntegratedIndex } from "../../src/integration/agent-types.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import { isObject } from "../../src/integration/source-json.ts"
import { loadSourcePolicy, validateSourcePolicy } from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import { buildNanokaAgents } from "./build.ts"
import {
  checkedPath,
  directoryRoot,
  parseBytes,
  readBytes,
  sha256,
} from "./files.ts"
import { outputExpansionLimit, verifyNanokaAgentArtifact } from "./verify.ts"

/** 稳定目录的验证配置；恢复不依赖 raw 或当前来源配置的语言顺序。 */
interface DatasetDescriptor {
  indexSha256: string
  rulesVersion: string
  policy: SourcePolicy
}

type DatasetState = {
  protocol: "fairy-nanoka-current/1"
  targetDirectory: string
} & (
  | { phase: "idle"; current: DatasetDescriptor | null }
  | {
      phase: "prepared"
      before: DatasetDescriptor | null
      after: DatasetDescriptor
    }
)

/** 错误码区分活跃访问、待恢复状态与不能自动处理的异常现场。 */
export class NanokaCurrentError extends Error {
  readonly code:
    | "BUSY"
    | "RECOVERY_REQUIRED"
    | "INVALID_STATE"
    | "UPDATE_FAILED"
  constructor(
    code: NanokaCurrentError["code"],
    message: string,
    cause?: unknown,
  ) {
    super(`${code}: ${message}`, { cause })
    this.name = "NanokaCurrentError"
    this.code = code
  }
}

/** 内部故障注入边界；无环境变量或 CLI 后门，真实子进程测试通过回调停在已完成的操作后。 */
export type CurrentCheckpoint =
  | "locked"
  | "initialization-written"
  | "initialized"
  | "building"
  | "candidate-ready"
  | "journal-written"
  | "prepared"
  | "old-moved"
  | "new-installed"
  | "report-installed"
  | "backup-cleaned"
  | "work-cleaned"
  | "idle"
  | "old-restored"
type Checkpoint = (stage: CurrentCheckpoint) => void | Promise<void>

interface CurrentPaths {
  target: string
  control: string
  work: string
  candidate: string
  backup: string
}

const localLocks = new Set<string>()
const controlNames = new Set([
  "lock.sqlite",
  "lock.sqlite-journal",
  "state.json",
  "state.next",
  "maintenance.json",
  "work",
  "backup",
])
const stateLimit = 1024 * 1024
function invalid(message: string): never {
  throw new NanokaCurrentError("INVALID_STATE", message)
}
async function exists(path: string) {
  try {
    return await lstat(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}
function overlaps(first: string, second: string) {
  const path = relative(first, second)
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
  )
}

/** 先解析已有祖先，再逐级检查；只在验证 raw 边界之后创建目标父目录。 */
async function pathsFor(targetDirectory: string): Promise<CurrentPaths> {
  const target = resolve(targetDirectory)
  if (target === dirname(target)) invalid("目标不能是文件系统根目录")
  let ancestor = dirname(target)
  const missing: string[] = []
  while (!(await exists(ancestor))) {
    missing.unshift(basename(ancestor))
    ancestor = dirname(ancestor)
  }
  const parent = join(await directoryRoot(ancestor), ...missing)
  const canonicalTarget = join(parent, basename(target))
  const control = join(parent, `.${basename(target)}.fairy-state`)
  return {
    target: canonicalTarget,
    control,
    work: join(control, "work"),
    candidate: join(control, "work/candidate"),
    backup: join(control, "backup"),
  }
}

async function checkControl(paths: CurrentPaths) {
  const stat = await exists(paths.control)
  if (!stat?.isDirectory() || stat.isSymbolicLink())
    invalid("控制路径必须是普通目录")
  for (const name of await readdir(paths.control)) {
    if (!controlNames.has(name)) invalid(`控制目录有未登记成员：${name}`)
    const child = await lstat(join(paths.control, name))
    if (name === "work" || name === "backup") {
      if (!child.isDirectory() || child.isSymbolicLink())
        invalid(`${name}: 不是普通目录`)
    } else if (!child.isFile() || child.nlink !== 1)
      invalid(`${name}: 不是独占普通文件`)
  }
  const target = await exists(paths.target)
  if (target && (!target.isDirectory() || target.isSymbolicLink()))
    invalid("目标不是普通目录")
  if (target && target.dev !== stat.dev)
    invalid("目标和控制目录必须在同一文件系统")
}

async function locked<T>(
  paths: CurrentPaths,
  create: boolean,
  callback: () => Promise<T>,
): Promise<T> {
  if (process.platform !== "darwin" && process.platform !== "linux")
    invalid("当前协议仅支持本机 macOS/Linux 文件系统")
  if (create) {
    await mkdir(dirname(paths.target), { recursive: true })
    await mkdir(paths.control).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error
    })
  }
  const controlStat = await exists(paths.control)
  if (!controlStat?.isDirectory() || controlStat.isSymbolicLink())
    invalid("控制路径必须是普通目录")
  // SQLite 打开时就可能操作辅助文件；锁前只检查成员名，允许合法临时成员并发出现或消失。
  for (const name of await readdir(paths.control))
    if (!controlNames.has(name)) invalid(`控制目录有未登记成员：${name}`)
  for (const name of ["lock.sqlite", "lock.sqlite-journal"]) {
    const lockStat = await exists(join(paths.control, name))
    if (lockStat && (!lockStat.isFile() || lockStat.nlink !== 1))
      invalid(`${name}: 不是独占普通文件`)
  }
  if (
    (await exists(join(paths.control, "state.json"))) &&
    !(await exists(join(paths.control, "lock.sqlite")))
  )
    invalid("受管理目录缺失永久锁数据库；保留现场，不自动重建锁")
  if (localLocks.has(paths.control))
    throw new NanokaCurrentError("BUSY", "当前数据集正在使用，请重试")
  localLocks.add(paths.control)
  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(join(paths.control, "lock.sqlite"), {
      timeout: 0,
    })
    try {
      database.exec("BEGIN EXCLUSIVE")
    } catch (error) {
      if ((error as { errcode?: number }).errcode === 5)
        throw new NanokaCurrentError(
          "BUSY",
          "当前数据集正在使用，请重试",
          error,
        )
      throw error
    }
    const mode = database.prepare("PRAGMA journal_mode").get()
    if (mode?.journal_mode !== "delete")
      invalid("锁数据库必须使用 rollback journal DELETE 模式")
    await checkControl(paths)
    return await callback()
  } finally {
    database?.close()
    localLocks.delete(paths.control)
  }
}

function descriptor(value: unknown): DatasetDescriptor {
  if (
    !isObject(value) ||
    Object.keys(value).toSorted().join() !==
      "indexSha256,policy,rulesVersion" ||
    typeof value.indexSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.indexSha256) ||
    typeof value.rulesVersion !== "string" ||
    !/^nanoka-agent-reference\/[1-9]\d*$/u.test(value.rulesVersion)
  )
    invalid("无效数据集验证描述符")
  return {
    indexSha256: value.indexSha256,
    rulesVersion: value.rulesVersion,
    policy: validateSourcePolicy(value.policy, { historicalLanguages: true }),
  }
}
async function readState(
  paths: CurrentPaths,
): Promise<DatasetState | undefined> {
  if (!(await exists(join(paths.control, "state.json")))) return undefined
  const value = parseBytes(
    await readBytes(paths.control, "state.json", stateLimit),
    "state.json",
    {
      entityId: "",
      locale: "index",
      pointer: "",
    },
  )
  if (
    !isObject(value) ||
    value.protocol !== "fairy-nanoka-current/1" ||
    value.targetDirectory !== paths.target
  )
    invalid("控制记录的归属或协议不匹配")
  const base = {
    protocol: "fairy-nanoka-current/1",
    targetDirectory: paths.target,
  } as const
  if (
    value.phase === "idle" &&
    Object.keys(value).toSorted().join() ===
      "current,phase,protocol,targetDirectory"
  )
    return {
      ...base,
      phase: "idle",
      current: value.current === null ? null : descriptor(value.current),
    }
  if (
    value.phase === "prepared" &&
    Object.keys(value).toSorted().join() ===
      "after,before,phase,protocol,targetDirectory"
  )
    return {
      ...base,
      phase: "prepared",
      before: value.before === null ? null : descriptor(value.before),
      after: descriptor(value.after),
    }
  return invalid("无效事务状态")
}
async function writeState(
  paths: CurrentPaths,
  state: DatasetState,
  checkpoint?: Checkpoint,
) {
  const bytes = serializeJson(state)
  if (bytes.byteLength > stateLimit) invalid("状态记录超过上限")
  await writeFile(join(paths.control, "state.next"), bytes)
  if (state.phase === "prepared") await checkpoint?.("journal-written")
  else if (!(await exists(join(paths.control, "state.json"))))
    await checkpoint?.("initialization-written")
  await rename(
    join(paths.control, "state.next"),
    join(paths.control, "state.json"),
  )
}
function idle(
  paths: CurrentPaths,
  current: DatasetDescriptor | null,
): DatasetState {
  return {
    protocol: "fairy-nanoka-current/1",
    targetDirectory: paths.target,
    phase: "idle",
    current,
  }
}
async function verifyDescriptor(
  root: string,
  expected: DatasetDescriptor,
): Promise<HistoricalIntegratedIndex<string>> {
  const maximumBytes =
    expected.policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
  if (
    sha256(await readBytes(root, "index.json", maximumBytes)) !==
    expected.indexSha256
  )
    invalid(`${root}: 索引与管理记录摘要不一致`)
  return verifyNanokaAgentArtifact({
    artifactDirectory: root,
    policy: expected.policy,
    rulesVersion: expected.rulesVersion,
    historicalLanguages: true,
  })
}
async function verifyCurrent(
  paths: CurrentPaths,
  expected: DatasetDescriptor | null,
) {
  if (expected) return verifyDescriptor(paths.target, expected)
  if (await exists(paths.target)) invalid("未登记的目标目录；不自动接管或删除")
  return undefined
}
async function removeWork(paths: CurrentPaths) {
  await rm(paths.work, { recursive: true, force: true })
  await rm(join(paths.control, "state.next"), { force: true })
}
/** 报告只归档不消费；提交前限大小，提交后恢复只做路径及文件类型检查。 */
async function checkedMaintenanceReport(
  paths: CurrentPaths,
  maximumBytes?: number,
) {
  const path = await checkedPath(paths.work, "maintenance.json")
  const stat = await lstat(path)
  if (!stat.isFile() || stat.nlink !== 1)
    invalid("maintenance.json: 不是独占普通文件")
  if (maximumBytes !== undefined && stat.size > maximumBytes)
    invalid(`maintenance.json: 字节数超过上限 ${maximumBytes}`)
  return path
}
async function finish(
  paths: CurrentPaths,
  current: DatasetDescriptor | null,
  committed: boolean,
  checkpoint?: Checkpoint,
) {
  // 提交以后只能向前清理；任何失败都保留 prepared，不能删除当前目标。
  if (committed) {
    if (await exists(join(paths.work, "maintenance.json"))) {
      await rename(
        await checkedMaintenanceReport(paths),
        join(paths.control, "maintenance.json"),
      )
    }
    await checkpoint?.("report-installed")
    await rm(paths.backup, { recursive: true, force: true })
    await checkpoint?.("backup-cleaned")
  } else {
    if (await exists(paths.backup)) invalid("回滚清理前仍存在备份")
    // 先记录回滚选择，候选可被部分删除；再次中断走 idle 的旧集复验与清理。
    await writeState(paths, idle(paths, current))
  }
  await removeWork(paths)
  await checkpoint?.("work-cleaned")
  await writeState(paths, idle(paths, current))
  await checkpoint?.("idle")
}

/** 调用时已持锁；失败保留现场，再次执行同一状态机而不是从头删除重建。 */
async function recoverLocked(
  paths: CurrentPaths,
  checkpoint?: Checkpoint,
  initializationPolicy?: SourcePolicy,
) {
  let state = await readState(paths)
  if (!state) {
    const names = await readdir(paths.control)
    if (
      names.some(
        (name) =>
          !["lock.sqlite", "lock.sqlite-journal", "state.next"].includes(name),
      )
    )
      invalid("没有归属记录的异常控制目录")
    let current: DatasetDescriptor | null = null
    if (initializationPolicy && (await exists(paths.target))) {
      // 仅显式生成可登记静态制品；默认验证拒绝未知规则及不完整语言。
      const index = await verifyNanokaAgentArtifact({
        artifactDirectory: paths.target,
        policy: initializationPolicy,
      })
      current = {
        indexSha256: sha256(
          await readBytes(
            paths.target,
            "index.json",
            initializationPolicy.fetchLimits.maximumBytesPerRun *
              outputExpansionLimit,
          ),
        ),
        rulesVersion: index.rulesVersion,
        policy: initializationPolicy,
      }
      await verifyDescriptor(paths.target, current)
    } else {
      await verifyCurrent(paths, null)
    }
    state = idle(paths, current)
    if (current && (await exists(join(paths.control, "state.next")))) {
      // 初始化写入可在任意字节处中断；仅重试本次已验证描述符的完整记录或前缀。
      // 其他记录（包括 prepared）不能作为首次初始化覆盖。
      const pending = await readBytes(paths.control, "state.next", stateLimit)
      const expected = serializeJson(state)
      if (
        !Buffer.from(expected.subarray(0, pending.byteLength)).equals(pending)
      )
        invalid("初始暂存记录与已验证数据不一致，保留现场")
    }
    await writeState(paths, state, checkpoint)
    await checkpoint?.("initialized")
  }
  if (state.phase === "idle") {
    const index = await verifyCurrent(paths, state.current)
    if (await exists(paths.backup)) invalid("稳定状态有异常备份，保留现场")
    await removeWork(paths)
    return { current: state.current, index, outcome: "unchanged" as const }
  }
  const target = await exists(paths.target)
  const backup = await exists(paths.backup)
  const candidate = await exists(paths.candidate)
  if (target && !candidate) {
    // 新目录已经安装：提交点已过，包括清理一半的备份。
    const index = await verifyDescriptor(paths.target, state.after)
    await finish(paths, state.after, true, checkpoint)
    return { current: state.after, index, outcome: "committed" as const }
  }
  if (target && backup) invalid("目标、候选和备份同时存在")
  if (state.before) {
    if (!target && backup && candidate) {
      await verifyDescriptor(paths.backup, state.before)
      await rename(paths.backup, paths.target)
      await checkpoint?.("old-restored")
    } else if (!target || backup || !candidate)
      invalid("旧数据集位置异常，不能自动恢复")
  } else if (target || backup || !candidate) invalid("首次创建事务位置异常")
  const index = await verifyCurrent(paths, state.before)
  await finish(paths, state.before, false, checkpoint)
  return { current: state.before, index, outcome: "rolled-back" as const }
}

/** 不读 raw，持同一锁幂等恢复；永久锁文件和最新报告不删除。 */
export async function recoverNanokaAgents(options: {
  targetDirectory: string
  checkpoint?: Checkpoint
}) {
  const paths = await pathsFor(options.targetDirectory)
  return locked(paths, false, async () => {
    const result = await recoverLocked(paths, options.checkpoint)
    return {
      artifactDirectory: paths.target,
      outcome: result.outcome,
      available: result.current !== null,
    }
  })
}

/** 内部读取租约；回调须在返回前消费文件字节，不能返回路径后再读取。 */
export async function withNanokaCurrentDataset<T>(
  targetDirectory: string,
  read: (
    artifactDirectory: string,
    index: HistoricalIntegratedIndex<string>,
  ) => Promise<T>,
): Promise<T> {
  const paths = await pathsFor(targetDirectory)
  return locked(paths, false, async () => {
    const state = await readState(paths)
    if (
      !state ||
      state.phase !== "idle" ||
      (await exists(paths.work)) ||
      (await exists(paths.backup)) ||
      (await exists(join(paths.control, "state.next")))
    )
      throw new NanokaCurrentError(
        "RECOVERY_REQUIRED",
        "当前数据集需要先恢复再重试读取",
      )
    const index = await verifyCurrent(paths, state.current)
    if (!index) invalid("当前数据集尚未生成")
    return read(paths.target, index)
  })
}

interface UpdateNanokaAgentsOptions {
  rawRoot: string
  version: string
  targetDirectory: string
  policy?: SourcePolicy
  checkpoint?: Checkpoint
}

/** 显式生成：缺少记录时完整验证已有制品，再复用同一更新流程。 */
export function generateNanokaAgents(options: UpdateNanokaAgentsOptions) {
  return updateCurrent(options, true)
}

/** 内部更新保留原契约，不登记已有非受管理制品。 */
export function updateNanokaAgents(options: UpdateNanokaAgentsOptions) {
  return updateCurrent(options, false)
}

/** 全量候选输入复验后按实际输出字节复用当前 inode，再以可恢复协议提交。 */
async function updateCurrent(
  options: UpdateNanokaAgentsOptions,
  initializeExisting: boolean,
) {
  const rawRoot = await directoryRoot(options.rawRoot)
  const paths = await pathsFor(options.targetDirectory)
  if (
    [paths.target, paths.control].some(
      (path) => overlaps(rawRoot, path) || overlaps(path, rawRoot),
    )
  )
    invalid("目标及控制目录不能与只读 raw 范围重叠")
  const policy = validateSourcePolicy(
    options.policy ?? (await loadSourcePolicy()),
  )
  return locked(paths, true, async () => {
    await options.checkpoint?.("locked")
    const previous = await recoverLocked(
      paths,
      options.checkpoint,
      initializeExisting ? policy : undefined,
    )
    try {
      await mkdir(paths.work)
      await options.checkpoint?.("building")
      const build = await buildNanokaAgents({
        rawRoot,
        version: options.version,
        temporaryParent: paths.work,
        policy,
      })
      await rename(build.artifactDirectory, paths.candidate)
      await rename(
        build.maintenanceReportPath,
        join(paths.work, "maintenance.json"),
      )
      await checkedMaintenanceReport(
        paths,
        policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit,
      )
      const maximumBytes =
        policy.requestPolicy.maximumResponseBytes * outputExpansionLimit
      let reusedEntityFiles = 0
      let changedEntityFiles = 0
      for (const id of build.index.scope.agentIds) {
        const files = build.index.agents[id].files
        const old = previous.index?.agents[id]?.files
        for (const reference of [
          files.stats,
          ...build.index.source.detailLocales.map(
            (locale) => files.content[locale],
          ),
        ]) {
          const oldReference =
            old &&
            [old.stats, ...Object.values(old.content)].find(
              (file) => file.path === reference.path,
            )
          if (
            oldReference &&
            Buffer.from(
              await readBytes(
                paths.target,
                reference.path,
                previous.current!.policy.requestPolicy.maximumResponseBytes *
                  outputExpansionLimit,
              ),
            ).equals(
              await readBytes(paths.candidate, reference.path, maximumBytes),
            )
          ) {
            await rm(join(paths.candidate, reference.path))
            await link(
              join(paths.target, reference.path),
              join(paths.candidate, reference.path),
            )
            reusedEntityFiles++
          } else changedEntityFiles++
        }
      }
      await verifyNanokaAgentArtifact({
        artifactDirectory: paths.candidate,
        policy,
        expectedIndex: build.index,
      })
      const after: DatasetDescriptor = {
        indexSha256: sha256(
          await readBytes(
            paths.candidate,
            "index.json",
            policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit,
          ),
        ),
        rulesVersion: build.index.rulesVersion,
        policy,
      }
      await options.checkpoint?.("candidate-ready")
      const result = {
        artifactDirectory: paths.target,
        maintenanceReportPath: join(paths.control, "maintenance.json"),
        agentCount: build.index.scope.agentIds.length,
        detailLocales: build.index.source.detailLocales,
        inputFileCount: build.inputFileCount,
        outputFileCount: build.outputFileCount,
        reusedEntityFiles,
        /** 新建或字节改变的实体文件数，不含索引与临时构建写入次数。 */
        changedEntityFiles,
        removedEntityFiles: previous.index
          ? Object.values(previous.index.agents)
              .flatMap((agent) => [
                agent.files.stats,
                ...Object.values(agent.files.content),
              ])
              .filter((reference) => {
                const parts = reference.path.split("/")
                const next = build.index.agents[parts[1]]
                return (
                  !next ||
                  ![
                    next.files.stats,
                    ...Object.values(next.files.content),
                  ].some((file) => file.path === reference.path)
                )
              }).length
          : 0,
        unknownFieldCount: build.maintenance.diagnostics.length,
        codeNameDifferenceCount: build.maintenance.codeNameDifferences.length,
      }
      if (previous.current?.indexSha256 === after.indexSha256) {
        await rename(
          join(paths.work, "maintenance.json"),
          result.maintenanceReportPath,
        )
        await removeWork(paths)
        // 即使输出未变，也保存本次经过验证的资源配置。
        await writeState(paths, idle(paths, after))
        return { ...result, outcome: "unchanged" as const }
      }
      await writeState(
        paths,
        {
          protocol: "fairy-nanoka-current/1",
          targetDirectory: paths.target,
          phase: "prepared",
          before: previous.current,
          after,
        },
        options.checkpoint,
      )
      await options.checkpoint?.("prepared")
      if (previous.current) await rename(paths.target, paths.backup)
      await options.checkpoint?.("old-moved")
      await rename(paths.candidate, paths.target)
      await options.checkpoint?.("new-installed")
      await verifyDescriptor(paths.target, after)
      await finish(paths, after, true, options.checkpoint)
      return { ...result, outcome: "committed" as const }
    } catch (error) {
      // 普通失败走与重启相同的恢复状态机；恢复自身失败则保留现场。
      let recovery = ""
      try {
        recovery = `恢复结果：${(await recoverLocked(paths)).outcome}。`
      } catch (recoveryError) {
        recovery = `仍需恢复：${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}。`
      }
      throw new NanokaCurrentError(
        "UPDATE_FAILED",
        `更新未正常结束；${recovery}已提交的数据会保留，可运行 recover:nanoka:agents 后复验。${error instanceof Error ? error.message : String(error)}`,
        error,
      )
    }
  })
}

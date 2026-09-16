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
import type {
  ExportFileReference,
  HistoricalIntegratedIndex,
  IntegratedIndex,
} from "../../src/integration/agent-types.ts"
import { integratedSnapshotFormat } from "../../src/integration/snapshot-types.ts"
import type {
  HistoricalIntegratedSnapshotIndex,
  IntegratedSnapshotIndex,
} from "../../src/integration/snapshot-types.ts"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import { isObject } from "../../src/integration/source-json.ts"
import type { JsonObject } from "../../src/integration/source-json.ts"
import { supportedLanguages } from "../../src/nanoka-identity.ts"
import { loadSourcePolicy, validateSourcePolicy } from "../nanoka/policy.ts"
import type { SourcePolicy } from "../nanoka/policy.ts"
import { outputExpansionLimit } from "./artifact-files.ts"
import {
  checkedPath,
  directoryRoot,
  parseBytes,
  readBytes,
  sha256,
} from "./files.ts"
import { convertNanokaAgentsArtifactToSnapshot } from "./snapshot-convert.ts"
import { buildIntegratedSnapshot } from "./snapshot-build.ts"
import { onboardedSnapshotEntities } from "./snapshot-entities.ts"
import type {
  IntegratedSnapshotEntityContract,
  IntegratedSnapshotEntityProducer,
} from "./snapshot-entities.ts"
import { verifyIntegratedSnapshot } from "./snapshot-verify.ts"
import {
  comparedSnapshotFromIndex,
  comparedSnapshotFromLegacyIndex,
  compareSnapshotUpdate,
  summarizeUpdateReport,
} from "./update-report.ts"
import { verifyNanokaAgentArtifact } from "./verify.ts"

/** v2 外壳的格式标记；管理记录用它区分需要显式迁移的旧数据集。 */
const legacyIntegratedSnapshotFormat: IntegratedIndex["format"] =
  "fairy-nanoka-integrated/v2"

/**
 * 管理记录协议版本；与索引外壳版本、实体整合规则版本互相独立，不共用一个版本号。
 *
 * v2 协议记录按记录或静态输入验证的 v2 与 v3 数据集；v1 协议只描述单实体 v2 数据集。
 * 出现未完成的 v1 事务时按 v1 协议恢复，只有显式迁移才写入 v2 协议。
 */
const managementProtocol = "fairy-nanoka-current/2"
const legacyManagementProtocol = "fairy-nanoka-current/1"

/** 数据集使用的索引外壳版本。 */
export type DatasetIndexFormat =
  | IntegratedIndex["format"]
  | typeof integratedSnapshotFormat

/** 一个类别的整合规则版本；类别名由已接入类别登记表定义。 */
export interface DatasetEntityContext {
  /** 该类别的整合规则版本，如 nanoka-agent-reference/4。 */
  rulesVersion: string
}

/**
 * 稳定数据集的验证上下文；持久状态只保存这些数据。
 *
 * 按记录即可重建完整复验：索引外壳决定验证器，类别与规则版本决定预期成员规则，
 * 来源配置提供语言顺序与全部本地预算。不保存验证函数、可执行地址或任意清理路径。
 */
export interface DatasetDescriptor {
  /** 索引外壳版本，决定使用哪个完整验证器与索引布局。 */
  format: DatasetIndexFormat

  /** 当前索引文件实际字节的 SHA-256；与记录不一致时拒绝自动修复。 */
  indexSha256: string

  /** 复验使用的来源配置，含语言顺序与预算；允许历史语言子集与历史预算。 */
  policy: SourcePolicy

  /** 类别名 → 该类别的规则版本；成员身份检查由当前类别登记表提供。 */
  entities: Record<string, DatasetEntityContext>
}

/** 协议无关的事务状态；两类管理协议只在序列化形状上不同。 */
type NormalizedState =
  | { phase: "idle"; current: DatasetDescriptor | null }
  | {
      phase: "prepared"
      before: DatasetDescriptor | null
      after: DatasetDescriptor
    }

/** 一类管理记录的读写编解码；写入时按实际数据集外壳选择，不静默跨协议改写。 */
interface ManagementRecordCodec {
  readonly protocol: string
  read(value: JsonObject): NormalizedState
  write(paths: CurrentPaths, state: NormalizedState): JsonObject
}

/** 错误码区分活跃访问、待恢复状态、待迁移设备、语言不完整与不能自动处理的异常现场。 */
export class NanokaCurrentError extends Error {
  readonly code:
    | "BUSY"
    | "RECOVERY_REQUIRED"
    | "MIGRATION_REQUIRED"
    | "INCOMPLETE_LANGUAGES"
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
  | "copied"
  | "converted"
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
const initializationControlNames = new Set([
  "lock.sqlite",
  "lock.sqlite-journal",
  "state.next",
])
const stateLimit = 1024 * 1024
const entityNamePattern = /^[a-z][a-z0-9-]*$/u
const rulesVersionPattern = /^[a-z0-9-]+\/[1-9]\d*$/u
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

/** 一个类别的规则版本；只接受非空、格式正确的值，不从其他类别或根索引推断。 */
function entityContext(value: unknown, path: string): DatasetEntityContext {
  if (
    !isObject(value) ||
    Object.keys(value).join() !== "rulesVersion" ||
    typeof value.rulesVersion !== "string" ||
    !rulesVersionPattern.test(value.rulesVersion)
  )
    invalid(`${path}: 无效类别规则版本`)
  return { rulesVersion: value.rulesVersion }
}

function entitiesContext(
  value: unknown,
  format: DatasetIndexFormat,
  path: string,
): Record<string, DatasetEntityContext> {
  if (!isObject(value)) invalid(`${path}: 无效类别验证上下文`)
  const names = Object.keys(value)
  if (!names.length || names.length > 64) invalid(`${path}: 无效类别验证上下文`)
  const entities: Record<string, DatasetEntityContext> = {}
  for (const name of names) {
    if (name.length > 64 || !entityNamePattern.test(name))
      invalid(`${path}: 无效类别名`)
    entities[name] = entityContext(value[name], `${path}/${name}`)
  }
  // v2 外壳只描述单一代理人数据集，不能借记录扩展其他类别。
  if (
    format === legacyIntegratedSnapshotFormat &&
    (names.length !== 1 || names[0] !== "agents")
  )
    invalid(`${path}: v2 外壳只能登记 agents 类别`)
  return entities
}

/** 当前协议的数据集验证上下文；策略允许历史语言与历史预算。 */
function datasetDescriptor(value: unknown, path: string): DatasetDescriptor {
  if (!isObject(value)) invalid(`${path}: 无效数据集验证上下文`)
  if (
    Object.keys(value).toSorted().join() !==
    "entities,format,indexSha256,policy"
  )
    invalid(`${path}: 无效数据集验证上下文`)
  if (
    value.format !== legacyIntegratedSnapshotFormat &&
    value.format !== integratedSnapshotFormat
  )
    invalid(`${path}: 索引格式不受支持`)
  if (
    typeof value.indexSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.indexSha256)
  )
    invalid(`${path}: 无效索引摘要`)
  return {
    format: value.format,
    indexSha256: value.indexSha256,
    policy: validateSourcePolicy(value.policy, { historicalLanguages: true }),
    entities: entitiesContext(value.entities, value.format, `${path}/entities`),
  }
}

/** v1 协议的数据集验证上下文：单一代理人规则版本，只描述 v2 外壳。 */
function legacyDatasetDescriptor(
  value: unknown,
  path: string,
): DatasetDescriptor {
  if (
    !isObject(value) ||
    Object.keys(value).toSorted().join() !==
      "indexSha256,policy,rulesVersion" ||
    typeof value.indexSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.indexSha256) ||
    typeof value.rulesVersion !== "string" ||
    !/^nanoka-agent-reference\/[1-9]\d*$/u.test(value.rulesVersion)
  )
    invalid(`${path}: 无效数据集验证描述符`)
  return {
    format: legacyIntegratedSnapshotFormat,
    indexSha256: value.indexSha256,
    policy: validateSourcePolicy(value.policy, { historicalLanguages: true }),
    entities: { agents: { rulesVersion: value.rulesVersion } },
  }
}

function descriptorData(
  descriptor: DatasetDescriptor,
  protocol: string,
): JsonObject {
  // v1 记录不能表达 v3 外壳；出现 v3 数据集时写入新协议，不降级也不改写旧记录形状。
  if (protocol === legacyManagementProtocol) {
    if (descriptor.format !== legacyIntegratedSnapshotFormat)
      invalid("旧管理协议不能记录 v3 数据集")
    const agents = descriptor.entities["agents"]
    if (!agents) invalid("旧管理协议缺少 agents 规则版本")
    return {
      indexSha256: descriptor.indexSha256,
      policy: descriptor.policy as unknown as JsonObject,
      rulesVersion: agents.rulesVersion,
    }
  }
  const entities: Record<string, JsonObject> = {}
  for (const [name, context] of Object.entries(descriptor.entities))
    entities[name] = { rulesVersion: context.rulesVersion }
  return {
    format: descriptor.format,
    indexSha256: descriptor.indexSha256,
    policy: descriptor.policy as unknown as JsonObject,
    entities,
  }
}

const currentRecord: ManagementRecordCodec = {
  protocol: managementProtocol,
  read(value) {
    const base = Object.keys(value).toSorted().join()
    if (
      value.phase === "idle" &&
      base === "current,phase,protocol,targetDirectory"
    )
      return {
        phase: "idle",
        current:
          value.current === null
            ? null
            : datasetDescriptor(value.current, "state.current"),
      }
    if (
      value.phase === "prepared" &&
      base === "after,before,phase,protocol,targetDirectory"
    )
      return {
        phase: "prepared",
        before:
          value.before === null
            ? null
            : datasetDescriptor(value.before, "state.before"),
        after: datasetDescriptor(value.after, "state.after"),
      }
    return invalid("无效事务状态")
  },
  write(paths, state) {
    const base = {
      protocol: managementProtocol,
      targetDirectory: paths.target,
    }
    if (state.phase === "idle")
      return {
        ...base,
        phase: "idle",
        current:
          state.current && descriptorData(state.current, managementProtocol),
      }
    return {
      ...base,
      phase: "prepared",
      before: state.before && descriptorData(state.before, managementProtocol),
      after: descriptorData(state.after, managementProtocol),
    }
  },
}

const legacyRecord: ManagementRecordCodec = {
  protocol: legacyManagementProtocol,
  read(value) {
    const base = Object.keys(value).toSorted().join()
    if (
      value.phase === "idle" &&
      base === "current,phase,protocol,targetDirectory"
    )
      return {
        phase: "idle",
        current:
          value.current === null
            ? null
            : legacyDatasetDescriptor(value.current, "state.current"),
      }
    if (
      value.phase === "prepared" &&
      base === "after,before,phase,protocol,targetDirectory"
    )
      return {
        phase: "prepared",
        before:
          value.before === null
            ? null
            : legacyDatasetDescriptor(value.before, "state.before"),
        after: legacyDatasetDescriptor(value.after, "state.after"),
      }
    return invalid("无效事务状态")
  },
  write(paths, state) {
    const base = {
      protocol: legacyManagementProtocol,
      targetDirectory: paths.target,
    }
    if (state.phase === "idle")
      return {
        ...base,
        phase: "idle",
        current:
          state.current &&
          descriptorData(state.current, legacyManagementProtocol),
      }
    return {
      ...base,
      phase: "prepared",
      before:
        state.before && descriptorData(state.before, legacyManagementProtocol),
      after: descriptorData(state.after, legacyManagementProtocol),
    }
  },
}

/** 稳定记录保持原协议；只有出现 v3 数据集时才升级为新协议，不静默改写其他状态。 */
function writeCodec(
  previous: ManagementRecordCodec | undefined,
  state: NormalizedState,
): ManagementRecordCodec {
  if (!previous || previous.protocol === managementProtocol)
    return currentRecord
  const descriptors =
    state.phase === "idle" ? [state.current] : [state.before, state.after]
  return descriptors.some(
    (descriptor) => descriptor?.format === integratedSnapshotFormat,
  )
    ? currentRecord
    : previous
}

async function readState(paths: CurrentPaths): Promise<
  | {
      codec: ManagementRecordCodec
      state: NormalizedState
    }
  | undefined
> {
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
  if (!isObject(value)) invalid("控制记录必须是普通对象")
  const codec =
    value.protocol === managementProtocol
      ? currentRecord
      : value.protocol === legacyManagementProtocol
        ? legacyRecord
        : undefined
  if (!codec) invalid("控制记录的协议不受支持")
  if (value.targetDirectory !== paths.target)
    invalid("控制记录的归属或协议不匹配")
  return { codec, state: codec.read(value) }
}

async function writeState(
  paths: CurrentPaths,
  codec: ManagementRecordCodec,
  state: NormalizedState,
  checkpoint?: Checkpoint,
) {
  const bytes = serializeJson(codec.write(paths, state))
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

function idle(current: DatasetDescriptor | null): NormalizedState {
  return { phase: "idle", current }
}

/** 索引自身同时受单文件上限与整库累计输出预算约束。 */
function indexReadLimit(policy: SourcePolicy): number {
  return Math.min(
    policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
    policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit,
  )
}

/** 从完整验证后的 v3 索引整理实体文件引用与类别成员计数；不含索引自身。 */
function summarizeIndex(index: HistoricalIntegratedSnapshotIndex): {
  files: ExportFileReference[]
  memberCounts: Record<string, number>
} {
  const files: ExportFileReference[] = []
  const memberCounts: Record<string, number> = {}
  for (const [name, entity] of Object.entries(index.entities)) {
    memberCounts[name] = entity.memberIds.length
    for (const memberId of entity.memberIds) {
      const member = entity.members[memberId]
      if (!member) invalid(`/entities/${name}/members/${memberId}: 成员缺失`)
      files.push(member.files.data)
      for (const locale of entity.detailLocales) {
        const reference: ExportFileReference | undefined =
          member.files.details[locale]
        if (!reference)
          invalid(`/entities/${name}/members/${memberId}: 缺少 ${locale} 引用`)
        files.push(reference)
      }
    }
  }
  return { files, memberCounts }
}

/** 已完整验证的数据集；v2 外壳不投影为当前索引类型，只保留文件引用、计数与完整旧索引。 */
interface VerifiedDataset {
  format: DatasetIndexFormat

  /**
   * 当前格式的索引；严格验证后语言引用完整，按记录的类别与语言复验时可能缺失。
   * 消费前必须经过 completeLanguageIndex 的运行时检查，不能直接断言为完整语言索引。
   */
  index?: HistoricalIntegratedSnapshotIndex

  /** v2 外壳的完整验证索引；只用于把受管理旧基线纳入同一比较口径。 */
  legacyIndex?: HistoricalIntegratedIndex

  files: ExportFileReference[]
  memberCounts: Record<string, number>
}

/** 严格验证的结果：当前格式且语言引用完整，可直接用于建立记录或计算描述符。 */
interface CompleteVerifiedDataset extends VerifiedDataset {
  format: typeof integratedSnapshotFormat
  index: IntegratedSnapshotIndex
}

/**
 * 收窄为完整语言索引：先按实际索引确认每个类别都覆盖全部支持语言且引用存在，再断言类型。
 * 历史语言子集在这里明确失败，消费回调不会拿到可能缺失的引用。
 */
function completeLanguageIndex(
  index: HistoricalIntegratedSnapshotIndex,
): IntegratedSnapshotIndex {
  for (const [name, entity] of Object.entries(index.entities)) {
    for (const locale of supportedLanguages)
      if (!entity.detailLocales.includes(locale))
        throw new NanokaCurrentError(
          "INCOMPLETE_LANGUAGES",
          `当前数据集缺少 ${locale} 详情（类别 ${name}）；普通读取与发布会要求完整语言配置，请先按当前完整语言配置重新生成`,
        )
    for (const memberId of entity.memberIds) {
      const member = entity.members[memberId]
      if (!member) invalid(`/entities/${name}/members/${memberId}: 成员缺失`)
      for (const locale of supportedLanguages)
        if (!member.files.details[locale])
          invalid(
            `/entities/${name}/members/${memberId}: 缺少 ${locale} 详情文件引用`,
          )
    }
  }
  // 以上逐项检查即完整语言契约；此处只做类型收窄，不新增运行时假设。
  return index as IntegratedSnapshotIndex
}

/**
 * 本次操作的已接入类别登记表：类别名、来源实体、规则版本与成员身份检查。
 * 默认当前代码登记表（生产只用它）；显式注入只用于合成类别验收，不从制品内容推断。
 */
type EntityRegistry = readonly IntegratedSnapshotEntityProducer[]

/** 按记录构造复验契约：身份检查来自本次登记表，规则版本取记录的旧值。 */
function verificationContracts(
  descriptor: DatasetDescriptor,
  registry: readonly IntegratedSnapshotEntityProducer[],
): IntegratedSnapshotEntityContract[] {
  return Object.entries(descriptor.entities).map(([name, context]) => {
    const registered = registry.find((entity) => entity.name === name)
    if (!registered)
      throw new NanokaCurrentError(
        "INVALID_STATE",
        `管理记录的类别未在当前登记表中登记，不能复验：${name}`,
      )
    return {
      name: registered.name,
      sourceEntity: registered.sourceEntity,
      rulesVersion: context.rulesVersion,
      verifyMemberFile: registered.verifyMemberFile,
    }
  })
}

/**
 * 复验记录指向的数据集：先核对索引实际字节摘要，再按记录的外壳、类别规则、语言与预算完整验证。
 * 只使用记录、登记表与本地制品，不读取 raw、不联网，也不采用当前生成配置。
 */
async function verifyDataset(
  root: string,
  descriptor: DatasetDescriptor,
  registry: readonly IntegratedSnapshotEntityProducer[],
): Promise<VerifiedDataset> {
  if (
    sha256(
      await readBytes(root, "index.json", indexReadLimit(descriptor.policy)),
    ) !== descriptor.indexSha256
  )
    invalid(`${root}: 索引与管理记录摘要不一致`)
  if (descriptor.format === legacyIntegratedSnapshotFormat) {
    const agents = descriptor.entities["agents"]
    if (!agents) invalid("v2 外壳缺少 agents 规则版本")
    const index = await verifyNanokaAgentArtifact({
      artifactDirectory: root,
      policy: descriptor.policy,
      rulesVersion: agents.rulesVersion,
      historicalLanguages: true,
    })
    const files: ExportFileReference[] = []
    for (const id of index.scope.agentIds) {
      const member = index.agents[id]
      if (!member) invalid(`/agents/${id}: 成员缺失`)
      files.push(member.files.stats)
      for (const locale of descriptor.policy.languages) {
        const reference = member.files.content[locale]
        if (!reference) invalid(`/agents/${id}: 缺少 ${locale} 引用`)
        files.push(reference)
      }
    }
    return {
      format: descriptor.format,
      legacyIndex: index,
      files,
      memberCounts: { agents: index.scope.agentIds.length },
    }
  }
  const index = await verifyIntegratedSnapshot({
    artifactDirectory: root,
    policy: descriptor.policy,
    entities: verificationContracts(descriptor, registry),
    historicalLanguages: true,
  })
  return { format: descriptor.format, index, ...summarizeIndex(index) }
}

/** 当前格式的完整验证；登记已有静态制品与候选复验共用，历史规则与语言子集在此拒绝。 */
async function verifyCurrentFormat(
  root: string,
  policy: SourcePolicy,
  registry: readonly IntegratedSnapshotEntityProducer[],
): Promise<CompleteVerifiedDataset> {
  const index = await verifyIntegratedSnapshot({
    artifactDirectory: root,
    policy,
    entities: registry,
  })
  return { format: index.format, index, ...summarizeIndex(index) }
}

function descriptorFor(
  index: IntegratedSnapshotIndex,
  indexSha256: string,
  policy: SourcePolicy,
): DatasetDescriptor {
  const entities: Record<string, DatasetEntityContext> = {}
  for (const [name, entity] of Object.entries(index.entities))
    entities[name] = { rulesVersion: entity.rulesVersion }
  return {
    format: index.format,
    indexSha256,
    policy,
    entities,
  }
}

async function verifyCurrent(
  paths: CurrentPaths,
  expected: DatasetDescriptor | null,
  registry: readonly IntegratedSnapshotEntityProducer[],
): Promise<VerifiedDataset | undefined> {
  if (expected) return verifyDataset(paths.target, expected, registry)
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
  codec: ManagementRecordCodec,
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
    await writeState(paths, writeCodec(codec, idle(current)), idle(current))
  }
  await removeWork(paths)
  await checkpoint?.("work-cleaned")
  await writeState(
    paths,
    writeCodec(codec, idle(current)),
    idle(current),
    checkpoint,
  )
  await checkpoint?.("idle")
}

/** 没有归属记录时，只在控制目录至多含锁文件与暂存记录时允许登记或迁移。 */
async function requireUnattributedControl(paths: CurrentPaths) {
  const names = await readdir(paths.control)
  if (names.some((name) => !initializationControlNames.has(name)))
    invalid("没有归属记录的异常控制目录")
}

/** 只读索引外壳；用于在完整验证之前区分需要迁移的 v2 制品与不受支持的输入。 */
async function readIndexFormat(
  root: string,
  policy: SourcePolicy,
): Promise<unknown> {
  const bytes = await readBytes(root, "index.json", indexReadLimit(policy))
  const value = parseBytes(bytes, "index.json", {
    entityId: "",
    locale: "index",
    pointer: "",
  })
  return isObject(value) ? value.format : undefined
}

/**
 * 发布一份已验证的初始记录；写入可在任意字节处中断。
 *
 * 已有 state.next 必须等于本次记录的完整内容或字节前缀（允许写入途中终止），
 * 其他内容（包括来自别的数据集或别的阶段的记录）一律保留现场并拒绝覆盖。
 */
async function establishRecord(
  paths: CurrentPaths,
  codec: ManagementRecordCodec,
  state: NormalizedState,
  checkpoint?: Checkpoint,
) {
  if (await exists(join(paths.control, "state.next"))) {
    const pending = await readBytes(paths.control, "state.next", stateLimit)
    const expected = serializeJson(codec.write(paths, state))
    if (!Buffer.from(expected.subarray(0, pending.byteLength)).equals(pending))
      invalid("暂存记录与本次已验证数据不一致，保留现场")
  }
  await writeState(paths, codec, state, checkpoint)
}

/**
 * 初始化本机记录：只在控制目录至多含锁文件与暂存记录，且目标为当前格式完整制品时登记。
 * v2 制品需要显式迁移，历史规则或历史语言子集的制品不被登记；初始化不写已有 JSON。
 */
async function initializeLocked(
  paths: CurrentPaths,
  checkpoint: Checkpoint | undefined,
  registry: EntityRegistry,
  policy?: SourcePolicy,
) {
  await requireUnattributedControl(paths)
  let current: DatasetDescriptor | null = null
  let dataset: VerifiedDataset | undefined
  if (policy && (await exists(paths.target))) {
    const format = await readIndexFormat(paths.target, policy)
    if (format === legacyIntegratedSnapshotFormat)
      throw new NanokaCurrentError(
        "MIGRATION_REQUIRED",
        "目标仍是 v2 外壳；先执行显式迁移命令，再登记、生成或读取",
      )
    if (format !== integratedSnapshotFormat)
      invalid("目标索引格式不受支持；不自动接管或重建")
    const initial = await verifyCurrentFormat(paths.target, policy, registry)
    current = descriptorFor(
      initial.index,
      sha256(
        await readBytes(paths.target, "index.json", indexReadLimit(policy)),
      ),
      policy,
    )
    // 记录建立后仍按记录复验一次，确保记录与实际字节一致。
    dataset = await verifyDataset(paths.target, current, registry)
  } else {
    await verifyCurrent(paths, null, registry)
  }
  const state = idle(current)
  if (current) await establishRecord(paths, currentRecord, state, checkpoint)
  else await writeState(paths, currentRecord, state, checkpoint)
  await checkpoint?.("initialized")
  return {
    codec: currentRecord,
    current,
    dataset,
    outcome: "unchanged" as const,
  }
}

/** 调用时已持锁；失败保留现场，再次执行同一状态机而不是从头删除重建。 */
async function recoverLocked(
  paths: CurrentPaths,
  registry: EntityRegistry,
  checkpoint?: Checkpoint,
  initializationPolicy?: SourcePolicy,
) {
  const record = await readState(paths)
  if (!record)
    return initializeLocked(paths, checkpoint, registry, initializationPolicy)
  const { codec, state } = record
  if (state.phase === "idle") {
    const dataset = await verifyCurrent(paths, state.current, registry)
    if (await exists(paths.backup)) invalid("稳定状态有异常备份，保留现场")
    await removeWork(paths)
    return {
      codec,
      current: state.current,
      dataset,
      outcome: "unchanged" as const,
    }
  }
  const target = await exists(paths.target)
  const backup = await exists(paths.backup)
  const candidate = await exists(paths.candidate)
  if (target && !candidate) {
    // 新目录已经安装：提交点已过，包括清理一半的备份。
    const dataset = await verifyDataset(paths.target, state.after, registry)
    await finish(paths, codec, state.after, true, checkpoint)
    return {
      codec,
      current: state.after,
      dataset,
      outcome: "committed" as const,
    }
  }
  if (target && backup) invalid("目标、候选和备份同时存在")
  if (state.before) {
    if (!target && backup && candidate) {
      await verifyDataset(paths.backup, state.before, registry)
      await rename(paths.backup, paths.target)
      await checkpoint?.("old-restored")
    } else if (!target || backup || !candidate)
      invalid("旧数据集位置异常，不能自动恢复")
  } else if (target || backup || !candidate) invalid("首次创建事务位置异常")
  const dataset = await verifyCurrent(paths, state.before, registry)
  await finish(paths, codec, state.before, false, checkpoint)
  return {
    codec,
    current: state.before,
    dataset,
    outcome: "rolled-back" as const,
  }
}

/** 不读 raw，持同一锁幂等恢复；永久锁文件和最新报告不删除。 */
export async function recoverCurrentDataset(options: {
  targetDirectory: string
  checkpoint?: Checkpoint
  /** 本次复验的类别登记表；默认当前已接入类别，测试可注入合成类别。 */
  entities?: EntityRegistry
}) {
  const paths = await pathsFor(options.targetDirectory)
  const registry = options.entities ?? onboardedSnapshotEntities
  return locked(paths, false, async () => {
    const result = await recoverLocked(paths, registry, options.checkpoint)
    return {
      artifactDirectory: paths.target,
      outcome: result.outcome,
      available: result.current !== null,
      format: result.current?.format ?? null,
    }
  })
}

/** 内部读取租约；回调须在返回前消费文件字节，不能返回路径后再读取。 */
export async function withCurrentDataset<T>(
  targetDirectory: string,
  read: (
    artifactDirectory: string,
    index: IntegratedSnapshotIndex,
  ) => Promise<T>,
  options: {
    /** 本次复验的类别登记表；默认当前已接入类别，测试可注入合成类别。 */
    entities?: EntityRegistry
  } = {},
): Promise<T> {
  const paths = await pathsFor(targetDirectory)
  const registry = options.entities ?? onboardedSnapshotEntities
  return locked(paths, false, async () => {
    const record = await readState(paths)
    if (
      !record ||
      record.state.phase !== "idle" ||
      (await exists(paths.work)) ||
      (await exists(paths.backup)) ||
      (await exists(join(paths.control, "state.next")))
    )
      throw new NanokaCurrentError(
        "RECOVERY_REQUIRED",
        "当前数据集需要先恢复再重试读取",
      )
    const dataset = await verifyCurrent(paths, record.state.current, registry)
    if (!dataset) invalid("当前数据集尚未生成")
    if (!dataset.index)
      throw new NanokaCurrentError(
        "MIGRATION_REQUIRED",
        "当前数据集仍是 v2 外壳；先执行显式迁移命令，再读取或发布",
      )
    // 进入消费回调之前确认完整语言配置；历史语言子集只用于复验、恢复与迁移。
    return read(paths.target, completeLanguageIndex(dataset.index))
  })
}

interface UpdateCurrentDatasetOptions {
  rawRoot: string
  version: string
  targetDirectory: string
  policy?: SourcePolicy
  checkpoint?: Checkpoint
  /** 本次生成的类别；默认当前已接入类别登记表，测试可注入合成类别。 */
  entities?: EntityRegistry
}

/** 显式生成：缺少记录时完整验证已有当前格式制品，再复用同一更新流程。 */
export function generateCurrentDataset(options: UpdateCurrentDatasetOptions) {
  return updateCurrent(options, true)
}

/** 内部更新保留原契约，不登记已有非受管理制品。 */
export function updateCurrentDataset(options: UpdateCurrentDatasetOptions) {
  return updateCurrent(options, false)
}

/**
 * 复用旧基线中字节相同的实体文件，保留其 inode 与 mtime；两侧分别按各自预算读取。
 *
 * 旧文件使用记录中的旧预算，候选使用本次新预算，允许合法缩小预算的迁移；
 * 索引已登记的类别与成员是一个数据集，复用后仍作为整体复验与提交。
 */
async function reuseEntityFiles(options: {
  /** 候选制品根目录；复用成功后其成员文件换成既有文件的硬链接。 */
  candidateRoot: string
  /** 既有制品根目录；文件字节与候选一致时成为保留的那一份。 */
  existingRoot: string
  /** 既有制品中允许复用的文件路径；未登记路径不参与比较。 */
  existingPaths: ReadonlySet<string>
  /** 候选成员文件引用；顺序即处理顺序。 */
  candidateFiles: ExportFileReference[]
  candidateMaximum: number
  existingMaximum: number
}) {
  let reusedEntityFiles = 0
  let changedEntityFiles = 0
  for (const reference of options.candidateFiles) {
    if (
      options.existingPaths.has(reference.path) &&
      Buffer.from(
        await readBytes(
          options.existingRoot,
          reference.path,
          options.existingMaximum,
        ),
      ).equals(
        await readBytes(
          options.candidateRoot,
          reference.path,
          options.candidateMaximum,
        ),
      )
    ) {
      await rm(join(options.candidateRoot, reference.path))
      await link(
        join(options.existingRoot, reference.path),
        join(options.candidateRoot, reference.path),
      )
      reusedEntityFiles++
    } else changedEntityFiles++
  }
  return { reusedEntityFiles, changedEntityFiles }
}

/** 全量候选输入复验后按实际输出字节复用旧基线文件，再以可恢复协议提交整个数据集。 */
async function updateCurrent(
  options: UpdateCurrentDatasetOptions,
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
  const registry = options.entities ?? onboardedSnapshotEntities
  return locked(paths, true, async () => {
    await options.checkpoint?.("locked")
    const previous = await recoverLocked(
      paths,
      registry,
      options.checkpoint,
      initializeExisting ? policy : undefined,
    )
    try {
      await mkdir(paths.work)
      await options.checkpoint?.("building")
      // 候选始终由当前代码规则与当前来源配置完整重建；旧基线只用于复用相同字节。
      const build = await buildIntegratedSnapshot({
        rawRoot,
        version: options.version,
        temporaryParent: paths.work,
        policy,
        entities: registry,
      })
      await rename(build.artifactDirectory, paths.candidate)
      const counts = await reuseEntityFiles({
        candidateRoot: paths.candidate,
        existingRoot: paths.target,
        existingPaths: new Set(
          (previous.dataset?.files ?? []).map((reference) => reference.path),
        ),
        candidateFiles: summarizeIndex(build.index).files,
        candidateMaximum:
          policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
        existingMaximum: previous.current
          ? previous.current.policy.requestPolicy.maximumResponseBytes *
            outputExpansionLimit
          : 0,
      })
      const candidatePaths = new Set(
        summarizeIndex(build.index).files.map((reference) => reference.path),
      )
      const removedEntityFiles = (previous.dataset?.files ?? []).filter(
        (reference) => !candidatePaths.has(reference.path),
      ).length
      const verified = await verifyIntegratedSnapshot({
        artifactDirectory: paths.candidate,
        policy,
        entities: registry,
        expectedIndex: build.index,
      })
      const after = descriptorFor(
        verified,
        sha256(
          await readBytes(
            paths.candidate,
            "index.json",
            indexReadLimit(policy),
          ),
        ),
        policy,
      )
      // 差异只比较本次已完整验证的旧基线与候选：候选尚未安装，旧基线尚未移动，
      // 提交后不再重新读取可变目录，也不在恢复时重算差异。
      const baselineView = previous.dataset?.index
        ? comparedSnapshotFromIndex(previous.dataset.index)
        : previous.dataset?.legacyIndex
          ? comparedSnapshotFromLegacyIndex(previous.dataset.legacyIndex)
          : undefined
      if (previous.current && !baselineView) invalid("旧基线的比较视图缺失")
      const report = await compareSnapshotUpdate({
        baseline:
          previous.current && baselineView
            ? {
                side: "baseline",
                root: paths.target,
                snapshot: baselineView,
                maximumBytes:
                  previous.current.policy.requestPolicy.maximumResponseBytes *
                  outputExpansionLimit,
              }
            : null,
        candidate: {
          side: "candidate",
          root: paths.candidate,
          snapshot: comparedSnapshotFromIndex(verified),
          maximumBytes:
            policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
        },
      })
      // 候选维护信息与本次差异报告合并为同一份制品外报告；构建器的独立报告不单独保留。
      await rm(build.buildDirectory, { recursive: true, force: true })
      await writeFile(
        join(paths.work, "maintenance.json"),
        serializeJson({ categories: build.maintenance, update: report }),
        { flag: "wx" },
      )
      // 报告生成与预算检查都在提交之前：失败或超限时既不写 prepared，也不切换当前数据。
      await checkedMaintenanceReport(
        paths,
        policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit,
      )
      await options.checkpoint?.("candidate-ready")
      const summary = summarizeIndex(verified)
      const result = {
        artifactDirectory: paths.target,
        maintenanceReportPath: join(paths.control, "maintenance.json"),
        format: verified.format,
        memberCounts: summary.memberCounts,
        entityFileCount: summary.files.length,
        inputFileCount: build.inputFileCount,
        outputFileCount: build.outputFileCount,
        ...counts,
        removedEntityFiles,
        ...summarizeUpdateReport(report),
      }
      if (previous.current?.indexSha256 === after.indexSha256) {
        await rename(
          join(paths.work, "maintenance.json"),
          result.maintenanceReportPath,
        )
        await removeWork(paths)
        // 即使输出未变，也保存本次经过验证的资源配置。
        await writeState(
          paths,
          writeCodec(previous.codec, idle(after)),
          idle(after),
        )
        return { ...result, outcome: "unchanged" as const }
      }
      await writeState(
        paths,
        writeCodec(previous.codec, {
          phase: "prepared",
          before: previous.current,
          after,
        }),
        {
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
      await verifyDataset(paths.target, after, registry)
      await finish(
        paths,
        writeCodec(previous.codec, idle(after)),
        after,
        true,
        options.checkpoint,
      )
      return { ...result, outcome: "committed" as const }
    } catch (error) {
      // 普通失败走与重启相同的恢复状态机；恢复自身失败则保留现场。
      let recovery = ""
      try {
        recovery = `恢复结果：${(await recoverLocked(paths, registry)).outcome}。`
      } catch (recoveryError) {
        recovery = `仍需恢复：${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}。`
      }
      throw new NanokaCurrentError(
        "UPDATE_FAILED",
        `更新未正常结束；${recovery}已提交的数据会保留，可运行 recover:nanoka:current 后复验。${error instanceof Error ? error.message : String(error)}`,
        error,
      )
    }
  })
}

/** 迁移结果；只有显式迁移会改写数据集外壳。 */
export interface MigrateCurrentDatasetResult {
  artifactDirectory: string

  /** migrated 表示本次完成格式迁移；unchanged 表示已经是 v3 数据集。 */
  outcome: "migrated" | "unchanged"

  /** 迁移后的索引外壳版本。 */
  format: DatasetIndexFormat

  /** 类别 → 成员数。 */
  memberCounts: Record<string, number>

  /** 实体文件数，不含索引。 */
  entityFileCount: number
}

/**
 * 显式迁移入口：把稳定 v2 数据集按当前规则与完整语言配置转换为 v3 外壳。
 *
 * 受管理源在同一锁内复验并取得稳定副本，转换器只处理该静态副本；实体文件保持原字节与
 * `sourceRecord` 原值，只改写索引外壳。未完成的旧事务必须先按原协议恢复；损坏、归属不符、
 * 历史规则或历史语言子集的输入明确拒绝，不猜测迁移。迁移可重复执行。
 */
export async function migrateCurrentDataset(options: {
  targetDirectory: string
  checkpoint?: Checkpoint
  /** 本次复验的类别登记表；默认当前已接入类别，测试可注入合成类别。 */
  entities?: EntityRegistry
}): Promise<MigrateCurrentDatasetResult> {
  const paths = await pathsFor(options.targetDirectory)
  const registry = options.entities ?? onboardedSnapshotEntities
  const policy = validateSourcePolicy(await loadSourcePolicy())
  return locked(paths, true, async () => {
    await options.checkpoint?.("locked")
    const record = await readState(paths)
    if (record?.state.phase === "prepared")
      throw new NanokaCurrentError(
        "RECOVERY_REQUIRED",
        "存在未完成的旧事务；先运行恢复命令按其原协议恢复到稳定状态，再执行迁移",
      )
    const recorded =
      record?.state.phase === "idle" ? record.state.current : null
    if (recorded?.format === integratedSnapshotFormat) {
      const dataset = await verifyDataset(paths.target, recorded, registry)
      return {
        artifactDirectory: paths.target,
        outcome: "unchanged" as const,
        format: dataset.format,
        memberCounts: dataset.memberCounts,
        entityFileCount: dataset.files.length,
      }
    }
    if (!recorded && !(await exists(paths.target)))
      invalid("没有可迁移的数据集")
    let baseline: DatasetDescriptor
    let baselineDataset: VerifiedDataset
    let journalWritten = false
    if (recorded) {
      baseline = recorded
      baselineDataset = await verifyDataset(paths.target, recorded, registry)
    } else {
      await requireUnattributedControl(paths)
      const format = await readIndexFormat(paths.target, policy)
      if (format === integratedSnapshotFormat) {
        // 已经迁移完成但尚未登记：按初始化契约登记本机记录，不改写数据。
        const initialized = await initializeLocked(
          paths,
          options.checkpoint,
          registry,
          policy,
        )
        const dataset = initialized.dataset
        if (!dataset) invalid("当前格式验证未返回索引")
        return {
          artifactDirectory: paths.target,
          outcome: "unchanged" as const,
          format: dataset.format,
          memberCounts: dataset.memberCounts,
          entityFileCount: dataset.files.length,
        }
      }
      const index = await verifyNanokaAgentArtifact({
        artifactDirectory: paths.target,
        policy,
      })
      baseline = {
        format: legacyIntegratedSnapshotFormat,
        indexSha256: sha256(
          await readBytes(paths.target, "index.json", indexReadLimit(policy)),
        ),
        policy,
        entities: { agents: { rulesVersion: index.rulesVersion } },
      }
      baselineDataset = await verifyDataset(paths.target, baseline, registry)
      // 在创建任何工作材料之前登记本次迁移的归属与基线：此后无论中断在初始化、复制、
      // 转换还是日志写入的哪一步，恢复都能按记录识别并只清理本次迁移的材料。
      // 登记本身同样可中断：state.next 只接受本次已验证记录的完整内容或字节前缀。
      await establishRecord(
        paths,
        currentRecord,
        idle(baseline),
        options.checkpoint,
      )
      await options.checkpoint?.("initialized")
    }
    try {
      await mkdir(paths.work)
      // 持锁复制稳定集合：转换器只接受静态副本，复制完成后不再回头读取原目录。
      const source = join(paths.work, "source")
      await mkdir(source)
      let copiedBytes = 0
      const maximumBytes =
        baseline.policy.requestPolicy.maximumResponseBytes *
        outputExpansionLimit
      const maximumTotalBytes =
        baseline.policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
      for (const path of [
        "index.json",
        ...baselineDataset.files.map((reference) => reference.path),
      ]) {
        const bytes = await readBytes(
          paths.target,
          path,
          Math.min(maximumBytes, maximumTotalBytes - copiedBytes),
        )
        copiedBytes += bytes.byteLength
        const destination = join(source, path)
        await mkdir(dirname(destination), { recursive: true })
        await writeFile(destination, bytes, { flag: "wx" })
      }
      await options.checkpoint?.("copied")
      const conversion = await convertNanokaAgentsArtifactToSnapshot({
        artifactDirectory: source,
        outputParent: paths.work,
        policy,
      }).catch((error: unknown) => {
        throw new NanokaCurrentError(
          "INVALID_STATE",
          `迁移只支持当前规则与完整语言配置的 v2 数据集；历史规则或语言子集需要按当前规则从 raw 重新生成。${error instanceof Error ? error.message : String(error)}`,
          error,
        )
      })
      await options.checkpoint?.("converted")
      await rename(conversion.artifactDirectory, paths.candidate)
      // 实体文件与源逐字节相同时复用原文件，保留原 inode 与 mtime；复用后整体复验。
      await reuseEntityFiles({
        candidateRoot: paths.candidate,
        existingRoot: paths.target,
        existingPaths: new Set(
          baselineDataset.files.map((reference) => reference.path),
        ),
        candidateFiles: [...baselineDataset.files],
        candidateMaximum:
          policy.requestPolicy.maximumResponseBytes * outputExpansionLimit,
        existingMaximum:
          baseline.policy.requestPolicy.maximumResponseBytes *
          outputExpansionLimit,
      })
      const verified = await verifyIntegratedSnapshot({
        artifactDirectory: paths.candidate,
        policy,
        expectedIndex: conversion.index,
      })
      const after = descriptorFor(
        verified,
        sha256(
          await readBytes(
            paths.candidate,
            "index.json",
            indexReadLimit(policy),
          ),
        ),
        policy,
      )
      const summary = summarizeIndex(verified)
      const state: NormalizedState = {
        phase: "prepared",
        before: baseline,
        after,
      }
      const codec = writeCodec(record?.codec, state)
      await writeState(paths, codec, state, options.checkpoint)
      journalWritten = true
      await options.checkpoint?.("prepared")
      await rename(paths.target, paths.backup)
      await options.checkpoint?.("old-moved")
      await rename(paths.candidate, paths.target)
      await options.checkpoint?.("new-installed")
      await verifyDataset(paths.target, after, registry)
      await finish(paths, codec, after, true, options.checkpoint)
      return {
        artifactDirectory: paths.target,
        outcome: "migrated" as const,
        format: after.format,
        memberCounts: summary.memberCounts,
        entityFileCount: summary.files.length,
      }
    } catch (error) {
      // 普通失败走与重启相同的恢复状态机；恢复自身失败则保留现场。
      let recovery = ""
      try {
        recovery = `恢复结果：${(await recoverLocked(paths, registry)).outcome}。`
      } catch (recoveryError) {
        recovery = `仍需恢复：${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}。`
      }
      // 提交前已经明确的拒绝保留原错误与错误码，失败的准备材料由恢复清理。
      if (!journalWritten && error instanceof NanokaCurrentError) throw error
      throw new NanokaCurrentError(
        "UPDATE_FAILED",
        `迁移未正常结束；${recovery}未提交时保留原 v2 数据集，可运行 recover:nanoka:current 后重试。${error instanceof Error ? error.message : String(error)}`,
        error,
      )
    }
  })
}

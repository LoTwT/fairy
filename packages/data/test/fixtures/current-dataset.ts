import { spawn, spawnSync } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { expect } from "vitest"
import {
  updateCurrentDataset,
  withCurrentDataset,
} from "../../scripts/nanoka-integration/current.ts"
import { buildIntegratedSnapshot } from "../../scripts/nanoka-integration/snapshot-build.ts"
import type { IntegratedSnapshotEntityProducer } from "../../scripts/nanoka-integration/snapshot-entities.ts"
import {
  nanokaAgentsSnapshotEntity,
  onboardedSnapshotEntities,
} from "../../scripts/nanoka-integration/snapshot-entities.ts"
import type { SourcePolicy } from "../../scripts/nanoka/policy.ts"
import { loadSourcePolicy } from "../../scripts/nanoka/policy.ts"
import { syntheticSnapshotEntity } from "./snapshot-entities.ts"
import {
  rewriteAsLegacyV2Artifact,
  writeSyntheticRaw,
} from "./synthetic-dataset.ts"

export const integratedSnapshotFormat = "fairy-nanoka-integrated/v3"
export const currentProtocol = "fairy-nanoka-current/2"
export const legacyProtocol = "fairy-nanoka-current/1"

/**
 * 通用事务协议测试的稳定最小类别集合：代理人加合成第二类别（widgets）。
 * 生产登记表（agents + drive-discs + w-engines）的接入行为由显式标记的用例与 CLI、发布链路测试覆盖，
 * 这样新增生产类别不会放大全部协议测试的准备成本。
 */
export const syntheticEntityRegistry = [
  nanokaAgentsSnapshotEntity,
  syntheticSnapshotEntity,
] as const
export const productionEntityRegistry = onboardedSnapshotEntities
export type CurrentEntityRegistry = "synthetic" | "production"

export interface CurrentDatasetFixture {
  root: string
  rawRoot: string
  version: string
  entities: readonly IntegratedSnapshotEntityProducer[]
  registry: CurrentEntityRegistry
  targetDirectory: string
  policy: SourcePolicy
}

/** 合成数据集选项：默认最小合成集合；显式 production 使用生产登记表与驱动盘、WEngine 输入。 */
export interface CurrentDatasetFixtureOptions {
  production?: boolean
  widgetIds?: readonly string[]
}

const repositoryDirectory = fileURLToPath(
  new URL("../../../../", import.meta.url),
)
const processScript = fileURLToPath(
  new URL("./current-agent-process.ts", import.meta.url),
)

export const digest = (content: Uint8Array) =>
  createHash("sha256").update(content).digest("hex")

export async function writeJson(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}

export async function editJson(path: string, mutate: (value: any) => void) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  mutate(value)
  await writeJson(path, value)
}

export function control(input: CurrentDatasetFixture) {
  return join(dirname(input.targetDirectory), ".integrated.fairy-state")
}

export async function bytes(root: string): Promise<Record<string, Buffer>> {
  const result: Record<string, Buffer> = {}
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory())
      for (const [path, content] of Object.entries(
        await bytes(join(root, entry.name)),
      ))
        result[`${entry.name}/${path}`] = content
    else result[entry.name] = await fs.readFile(join(root, entry.name))
  }
  return result
}

export async function fingerprints(root: string) {
  const result: Record<
    string,
    { ino: bigint; dev: bigint; mtimeNs: bigint; hash: string }
  > = {}
  for (const [path, content] of Object.entries(await bytes(root))) {
    const stat = await fs.stat(join(root, path), { bigint: true })
    result[path] = {
      ino: stat.ino,
      dev: stat.dev,
      mtimeNs: stat.mtimeNs,
      hash: digest(content),
    }
  }
  return result
}

export async function verified(input: CurrentDatasetFixture) {
  return withCurrentDataset(
    input.targetDirectory,
    async (directory, index) => ({ index, bytes: await bytes(directory) }),
    { entities: input.entities },
  )
}

/** 稳定状态断言：控制目录只留登记成员，制品与索引完全一致，记录摘要与索引字节一致。 */
export async function clean(input: CurrentDatasetFixture) {
  const names = (await fs.readdir(control(input))).toSorted()
  expect(names).toContain("lock.sqlite")
  expect(names).toContain("state.json")
  expect(
    names.every((name) =>
      ["lock.sqlite", "maintenance.json", "state.json"].includes(name),
    ),
  ).toBe(true)
  const result = await verified(input)
  const expected = [
    "index.json",
    ...Object.values(result.index.entities)
      .flatMap((entity) =>
        entity.memberIds.flatMap((memberId) => {
          const member = entity.members[memberId]
          return [member.files.data, ...Object.values(member.files.details)]
        }),
      )
      .map((file) => file.path),
  ].toSorted()
  expect(Object.keys(result.bytes).toSorted()).toEqual(expected)
  for (const entity of Object.values(result.index.entities))
    for (const memberId of entity.memberIds) {
      const member = entity.members[memberId]
      for (const file of [
        member.files.data,
        ...Object.values(member.files.details),
      ])
        expect(digest(result.bytes[file.path])).toBe(file.sha256)
    }
  const state = JSON.parse(
    await fs.readFile(join(control(input), "state.json"), "utf8"),
  )
  expect(state.protocol).toBe(currentProtocol)
  expect(state.current.indexSha256).toBe(digest(result.bytes["index.json"]))
  return result
}

/** 独占构建一份完整制品并安装为目标；v2 形状由合成 fixture 改写索引外壳得到。 */
export async function staticArtifact(
  input: CurrentDatasetFixture,
  shape: "v3" | "v2" = "v3",
) {
  const build = await buildIntegratedSnapshot({
    rawRoot: input.rawRoot,
    version: input.version,
    temporaryParent: input.root,
    // v2 外壳只描述单一代理人制品：改写前必须构建合法的 agents-only 制品，
    // 不能把双类别制品改名冒充 v2（残留类别文件会破坏精确文件集合）。
    entities: shape === "v2" ? [nanokaAgentsSnapshotEntity] : input.entities,
  })
  await fs.rename(build.artifactDirectory, input.targetDirectory)
  await fs.rm(build.buildDirectory, { recursive: true })
  if (shape === "v2") await rewriteAsLegacyV2Artifact(input.targetDirectory)
  return input
}

export async function readState(input: CurrentDatasetFixture) {
  return JSON.parse(
    await fs.readFile(join(control(input), "state.json"), "utf8"),
  )
}

/**
 * 把已生成的 v3 数据集改写成此前只登记 en 的历史语言子集，并同步管理记录。
 * 只用于合成复验、读取边界与迁移边界测试；当前构建不会产出语言子集。
 */
export async function restrictToEnglish(input: CurrentDatasetFixture) {
  const indexPath = join(input.targetDirectory, "index.json")
  const index = JSON.parse(await fs.readFile(indexPath, "utf8"))
  // 记录的语言配置作用于全部类别：历史子集构造也必须覆盖每个已登记类别。
  for (const [name, entity] of Object.entries<any>(index.entities)) {
    entity.detailLocales = ["en"]
    entity.inputs = entity.inputs.filter(
      (entry: { resource: string }) => !entry.resource.includes("/zh/"),
    )
    for (const memberId of entity.memberIds) {
      delete entity.members[memberId].files.details.zh
      await fs.rm(
        join(input.targetDirectory, name, memberId, "details.zh.json"),
      )
    }
  }
  await writeJson(indexPath, index)
  const hash = digest(await fs.readFile(indexPath))
  await editJson(join(control(input), "state.json"), (state) => {
    state.current.policy.languages = ["en"]
    state.current.indexSha256 = hash
  })
}

/** 通过真实包脚本调用；脚本映射与包目录调用行为由 CLI 与工作区测试覆盖。 */
export function command(name: string, commandArguments: string[]) {
  return spawnSync(
    "pnpm",
    ["--silent", "--filter", "@randomplay/data", name, ...commandArguments],
    {
      cwd: repositoryDirectory,
      encoding: "utf8",
      timeout: 20000,
    },
  )
}

export async function change(input: CurrentDatasetFixture) {
  await editJson(
    join(input.rawRoot, input.version, "zh/character/2.json"),
    (value) => {
      value.name = "changed"
    },
  )
}

/**
 * 单个测试文件的事务 fixture harness：目录与子进程状态由调用方持有并统一清理，
 * 不同测试文件之间不共享可变的准备状态。
 */
export function createCurrentDatasetHarness() {
  const roots: string[] = []
  const children: ChildProcess[] = []

  async function cleanup() {
    for (const processChild of children.splice(0)) {
      if (processChild.exitCode === null && processChild.signalCode === null) {
        const exited = new Promise((resolve) =>
          processChild.once("exit", resolve),
        )
        processChild.kill("SIGKILL")
        await exited
      }
    }
    for (const root of roots.splice(0))
      await fs.rm(root, { recursive: true, force: true })
  }

  async function fixture(
    options: CurrentDatasetFixtureOptions = {},
  ): Promise<CurrentDatasetFixture> {
    const root = await fs.realpath(
      await fs.mkdtemp(join(tmpdir(), "fairy-current-dataset-test-")),
    )
    roots.push(root)
    const rawRoot = join(root, "raw/nanoka")
    const version = "synthetic-1"
    const registry: CurrentEntityRegistry = options.production
      ? "production"
      : "synthetic"
    await writeSyntheticRaw({
      rawRoot,
      version,
      agentIds: ["2", "10"],
      ...(registry === "synthetic"
        ? { widgetIds: options.widgetIds ?? ["3", "7"] }
        : {}),
    })
    return {
      root,
      rawRoot,
      version,
      registry,
      entities:
        registry === "production"
          ? productionEntityRegistry
          : syntheticEntityRegistry,
      targetDirectory: join(root, "integrated"),
      policy: await loadSourcePolicy(),
    }
  }

  /**
   * 受管理的 v2 数据集：制品为 v2 外壳，管理记录为旧协议稳定记录。
   * 只用于合成迁移验收；生产不会用本函数创建或接管数据。
   */
  async function managedLegacyFixture(
    options: { rulesVersion?: string; production?: boolean } = {},
  ) {
    const input = await staticArtifact(
      await fixture(options.production ? { production: true } : {}),
      "v2",
    )
    const rulesVersion = options.rulesVersion ?? "nanoka-agent-reference/4"
    if (rulesVersion !== "nanoka-agent-reference/4") {
      await editJson(join(input.targetDirectory, "index.json"), (index) => {
        index.rulesVersion = rulesVersion
      })
    }
    await fs.mkdir(control(input))
    new DatabaseSync(join(control(input), "lock.sqlite")).close()
    await writeJson(join(control(input), "state.json"), {
      protocol: legacyProtocol,
      targetDirectory: input.targetDirectory,
      phase: "idle",
      current: {
        indexSha256: digest(
          await fs.readFile(join(input.targetDirectory, "index.json")),
        ),
        rulesVersion,
        policy: input.policy,
      },
    })
    return input
  }

  /** 受管理的稳定数据集：v2 用旧协议稳定记录，v3 由整库更新生成。 */
  async function managedFixture(shape: "v2" | "v3") {
    if (shape === "v2") return managedLegacyFixture()
    const input = await fixture()
    await updateCurrentDataset(input)
    return input
  }

  async function child(
    input: CurrentDatasetFixture,
    extra: Record<string, unknown> = {},
  ) {
    const path = join(input.root, `process-${crypto.randomUUID()}.json`)
    // 子进程只接受可序列化参数；类别登记表带函数，改用 registry 标记选择同一最小集合。
    const { entities, ...serializable } = input
    void entities
    await writeJson(path, { ...serializable, ...extra })
    const process = spawn(
      globalThis.process.execPath,
      ["--disable-warning=ExperimentalWarning", processScript, path],
      { stdio: ["ignore", "pipe", "pipe", "ipc"] },
    )
    children.push(process)
    let stdout = ""
    let stderr = ""
    process.stdout!.on("data", (chunk) => {
      stdout += chunk
    })
    process.stderr!.on("data", (chunk) => {
      stderr += chunk
    })
    const done = new Promise<{
      code: number | null
      signal: NodeJS.Signals | null
      stdout: string
      stderr: string
    }>((resolve, reject) => {
      process.once("error", reject)
      process.once("close", (code, signal) =>
        resolve({ code, signal, stdout, stderr }),
      )
    })
    const paused = new Promise<void>((resolve, reject) => {
      if (!extra.pause) {
        resolve()
        return
      }
      const timer = setTimeout(
        () =>
          reject(new Error(`checkpoint timeout: ${extra.pause}; ${stderr}`)),
        10000,
      )
      process.once("message", (message) => {
        clearTimeout(timer)
        expect(message).toEqual({ stage: extra.pause })
        resolve()
      })
      process.once("exit", () => {
        clearTimeout(timer)
        reject(new Error(`exited before ${extra.pause}: ${stderr}`))
      })
    })
    await paused
    return { process, done }
  }

  return {
    fixture,
    managedLegacyFixture,
    managedFixture,
    child,
    cleanup,
    // 无状态 helper 直接复用模块级定义，便于各测试文件按需解构。
    control,
    bytes,
    fingerprints,
    verified,
    clean,
    staticArtifact,
    restrictToEnglish,
    readState,
    command,
    digest,
    writeJson,
    editJson,
  }
}

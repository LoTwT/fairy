import { spawn, spawnSync } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { DatabaseSync } from "node:sqlite"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  generateCurrentDataset,
  migrateCurrentDataset,
  recoverCurrentDataset,
  updateCurrentDataset,
  withCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import type { CurrentCheckpoint } from "../scripts/nanoka-integration/current.ts"
import * as formatting from "../scripts/nanoka-integration/format.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { onboardedSnapshotEntities } from "../scripts/nanoka-integration/snapshot-entities.ts"
import type { IntegratedSnapshotEntityProducer } from "../scripts/nanoka-integration/snapshot-entities.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import {
  legacyV2Format,
  rewriteAsLegacyV2Artifact,
  writeSyntheticRaw,
} from "./fixtures/synthetic-dataset.ts"
import { syntheticSnapshotEntity } from "./fixtures/snapshot-entities.ts"

const integratedSnapshotFormat = "fairy-nanoka-integrated/v3"
const currentProtocol = "fairy-nanoka-current/2"
const legacyProtocol = "fairy-nanoka-current/1"

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))
vi.mock("../scripts/nanoka-integration/format.ts", async (original) => ({
  ...(await original<
    typeof import("../scripts/nanoka-integration/format.ts")
  >()),
}))
const roots: string[] = []
const children: ChildProcess[] = []
afterEach(async () => {
  vi.restoreAllMocks()
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
})
const digest = (content: Uint8Array) =>
  createHash("sha256").update(content).digest("hex")
async function writeJson(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}
async function editJson(path: string, mutate: (value: any) => void) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  mutate(value)
  await writeJson(path, value)
}

/** 合成数据集：两个代理人，以及可选的合成第二类别。 */
async function fixture(options: { widgets?: readonly string[] } = {}) {
  const root = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), "fairy-current-dataset-test-")),
  )
  roots.push(root)
  const rawRoot = join(root, "raw/nanoka")
  const version = "synthetic-1"
  const entities: readonly IntegratedSnapshotEntityProducer[] = options.widgets
    ? [...onboardedSnapshotEntities, syntheticSnapshotEntity]
    : onboardedSnapshotEntities
  await writeSyntheticRaw({
    rawRoot,
    version,
    agentIds: ["2", "10"],
    ...(options.widgets ? { widgetIds: options.widgets } : {}),
  })
  return {
    root,
    rawRoot,
    version,
    entities,
    targetDirectory: join(root, "integrated"),
    policy: await loadSourcePolicy(),
  }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
function control(input: Fixture) {
  return join(dirname(input.targetDirectory), ".integrated.fairy-state")
}
async function bytes(root: string): Promise<Record<string, Buffer>> {
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
async function fingerprints(root: string) {
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
async function verified(input: Fixture) {
  return withCurrentDataset(
    input.targetDirectory,
    async (directory, index) => ({ index, bytes: await bytes(directory) }),
    { entities: input.entities },
  )
}
/** 稳定状态断言：控制目录只留登记成员，制品与索引完全一致，记录摘要与索引字节一致。 */
async function clean(input: Fixture) {
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
async function staticArtifact(input: Fixture, shape: "v3" | "v2" = "v3") {
  const build = await buildIntegratedSnapshot({
    rawRoot: input.rawRoot,
    version: input.version,
    temporaryParent: input.root,
    entities: input.entities,
  })
  await fs.rename(build.artifactDirectory, input.targetDirectory)
  await fs.rm(build.buildDirectory, { recursive: true })
  if (shape === "v2") await rewriteAsLegacyV2Artifact(input.targetDirectory)
  return input
}

/**
 * 受管理的 v2 数据集：制品为 v2 外壳，管理记录为旧协议稳定记录。
 * 只用于合成迁移验收；生产不会用本函数创建或接管数据。
 */
async function managedLegacyFixture(options: { rulesVersion?: string } = {}) {
  const input = await staticArtifact(await fixture(), "v2")
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

/**
 * 把已生成的 v3 数据集改写成此前只登记 en 的历史语言子集，并同步管理记录。
 * 只用于合成复验、读取边界与迁移边界测试；当前构建不会产出语言子集。
 */
async function restrictToEnglish(input: Fixture) {
  await editJson(join(input.targetDirectory, "index.json"), (index) => {
    const agents = index.entities.agents
    agents.detailLocales = ["en"]
    agents.inputs = agents.inputs.filter(
      (entry: { resource: string }) => !entry.resource.includes("/zh/"),
    )
    for (const memberId of agents.memberIds)
      delete agents.members[memberId].files.details.zh
  })
  for (const id of ["2", "10"])
    await fs.rm(join(input.targetDirectory, `agents/${id}/details.zh.json`))
  const hash = digest(
    await fs.readFile(join(input.targetDirectory, "index.json")),
  )
  await editJson(join(control(input), "state.json"), (state) => {
    state.current.policy.languages = ["en"]
    state.current.indexSha256 = hash
  })
}

async function readState(input: Fixture) {
  return JSON.parse(
    await fs.readFile(join(control(input), "state.json"), "utf8"),
  )
}

const processScript = fileURLToPath(
  new URL("./fixtures/current-agent-process.ts", import.meta.url),
)
async function child(input: Fixture, extra: Record<string, unknown> = {}) {
  const path = join(input.root, `process-${crypto.randomUUID()}.json`)
  // 子进程只接受可序列化参数；类别登记表带函数，不能被 JSON 传递，子进程使用生产登记表。
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
      () => reject(new Error(`checkpoint timeout: ${extra.pause}; ${stderr}`)),
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
async function change(input: Fixture) {
  await editJson(
    join(input.rawRoot, input.version, "zh/character/2.json"),
    (value) => {
      value.name = "changed"
    },
  )
}

async function reportHeavySource(input: Fixture) {
  for (const locale of input.policy.languages)
    await editJson(
      join(input.rawRoot, input.version, locale, "character/2.json"),
      (value) => {
        const skill = value.skill["g/~"]
        delete value.skill["g/~"]
        value.skill[`longkey${"X".repeat(2000)}`] = skill
        for (let i = 0; i < 1000; i++) skill.description[0][`future${i}`] = 0
      },
    )
  return (
    Object.values(await bytes(input.rawRoot)).reduce(
      (total, content) => total + content.length,
      0,
    ) + 1
  )
}

describe("current multi-entity dataset", () => {
  it.each(["generate", "update", "recover", "migrate", "read"] as const)(
    "rejects SQLite sidecars before opening the database and preserves the external hardlink: %s",
    async (mode) => {
      const input = await fixture()
      await fs.mkdir(control(input), { recursive: true })
      const database = new DatabaseSync(join(control(input), "lock.sqlite"))
      try {
        database.exec(
          "PRAGMA journal_mode=WAL; CREATE TABLE probe (value INTEGER)",
        )
      } finally {
        database.close()
      }
      const external = join(input.root, "external.json")
      const original = Buffer.from(`${" ".repeat(65534)}{}`)
      await fs.writeFile(external, original)
      await fs.link(external, join(control(input), "lock.sqlite-shm"))
      const before = await fingerprints(control(input))
      const externalBefore = await fs.stat(external, { bigint: true })
      const operation =
        mode === "generate"
          ? generateCurrentDataset(input)
          : mode === "update"
            ? updateCurrentDataset(input)
            : mode === "recover"
              ? recoverCurrentDataset(input)
              : mode === "migrate"
                ? migrateCurrentDataset(input)
                : withCurrentDataset(
                    input.targetDirectory,
                    async () => "unexpected read",
                  )
      await expect(operation).rejects.toThrow(
        /INVALID_STATE.*未登记成员.*lock.sqlite-shm/,
      )
      const after = await fs.readFile(external)
      expect(after.equals(original)).toBe(true)
      expect(after.length).toBe(65536)
      expect(digest(after)).toBe(digest(original))
      expect(await fs.stat(external, { bigint: true })).toMatchObject({
        size: externalBefore.size,
        ino: externalBefore.ino,
        dev: externalBefore.dev,
        mtimeNs: externalBefore.mtimeNs,
        nlink: externalBefore.nlink,
      })
      expect(await fingerprints(control(input))).toEqual(before)
      await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
        code: "ENOENT",
      })
    },
  )

  it("uses the saved budget for old files when the new dataset lowers its budget", async () => {
    const input = await fixture()
    for (const locale of input.policy.languages)
      await editJson(
        join(input.rawRoot, input.version, locale, "character/2.json"),
        (value) => {
          value.name = "x".repeat(200000)
        },
      )
    await updateCurrentDataset(input)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
    })
    input.policy.requestPolicy.maximumResponseBytes = 5000
    const limit =
      input.policy.requestPolicy.maximumResponseBytes *
      (await import("../scripts/nanoka-integration/artifact-files.ts"))
        .outputExpansionLimit
    expect(
      (await fs.stat(join(input.targetDirectory, "agents/2/details.zh.json")))
        .size,
    ).toBeGreaterThan(limit)
    const candidate = await buildIntegratedSnapshot({
      ...input,
      temporaryParent: input.root,
    })
    expect(
      (
        await fs.stat(
          join(candidate.artifactDirectory, "agents/2/details.zh.json"),
        )
      ).size,
    ).toBeLessThan(limit)
    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await clean(input)).bytes).toEqual(
      await bytes(candidate.artifactDirectory),
    )
  })

  it.each([true, false])(
    "rejects an oversized report before commit, first=%s",
    async (initial) => {
      const input = await fixture()
      if (!initial) await updateCurrentDataset(input)
      const before = initial
        ? undefined
        : await fingerprints(input.targetDirectory)
      input.policy.fetchLimits.maximumBytesPerRun =
        await reportHeavySource(input)
      const candidate = await buildIntegratedSnapshot({
        ...input,
        temporaryParent: input.root,
      })
      expect(
        (await fs.stat(candidate.maintenanceReportPath)).size,
      ).toBeGreaterThan(
        input.policy.fetchLimits.maximumBytesPerRun *
          (await import("../scripts/nanoka-integration/artifact-files.ts"))
            .outputExpansionLimit,
      )
      const stages: CurrentCheckpoint[] = []
      await expect(
        updateCurrentDataset({
          ...input,
          checkpoint: (stage) => {
            stages.push(stage)
          },
        }),
      ).rejects.toThrow(/maintenance.json.*字节数超过上限/)
      expect(stages).toContain("building")
      expect(stages).not.toContain("prepared")
      for (let i = 0; i < 2; i++)
        expect(await recoverCurrentDataset(input)).toMatchObject({
          outcome: "unchanged",
          available: !initial,
        })
      if (initial)
        await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
          code: "ENOENT",
        })
      else {
        expect(await fingerprints(input.targetDirectory)).toEqual(before)
        await clean(input)
      }
    },
  )

  it("recovers a legacy committed oversized report after process termination", async () => {
    const input = await fixture()
    const legacyBudget = await reportHeavySource(input)
    const writer = await child(input, { pause: "new-installed" })
    writer.process.kill("SIGKILL")
    expect((await writer.done).signal).toBe("SIGKILL")
    // Emulate the saved descriptor from the older updater, which committed before checking report size.
    await editJson(join(control(input), "state.json"), (state) => {
      state.after.policy.fetchLimits.maximumBytesPerRun = legacyBudget
    })
    const pending = await fs.readFile(
      join(control(input), "work/maintenance.json"),
    )
    expect(pending.length).toBeGreaterThan(
      legacyBudget *
        (await import("../scripts/nanoka-integration/artifact-files.ts"))
          .outputExpansionLimit,
    )
    const before = await fingerprints(input.targetDirectory)
    const recovery = await child(input, { mode: "recover" })
    expect(await recovery.done).toMatchObject({ code: 0 })
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    expect(
      (await fs.readFile(join(control(input), "maintenance.json"))).equals(
        pending,
      ),
    ).toBe(true)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await clean(input)
  })

  it("creates a complete dataset, repeats without writes to current files, and preserves every inode and mtime", async () => {
    const input = await fixture()
    const raw = await bytes(input.rawRoot)
    const first = await updateCurrentDataset(input)
    expect(first.outcome).toBe("committed")
    expect(first).toMatchObject({
      format: integratedSnapshotFormat,
      memberCounts: { agents: 2 },
      entityFileCount: 6,
    })
    const before = await fingerprints(input.targetDirectory)
    const writes = vi.spyOn(fs, "writeFile")
    const format = formatting.formatGeneratedJson
    const formatted = vi
      .spyOn(formatting, "formatGeneratedJson")
      .mockImplementation(async (root, paths) => {
        expect(root.startsWith(`${control(input)}/work/`)).toBe(true)
        for (const path of paths)
          expect((await fs.stat(join(root, path))).nlink).toBe(1)
        await format(root, paths)
      })
    const second = await updateCurrentDataset(input)
    expect(second.outcome).toBe("unchanged")
    expect(second.reusedEntityFiles).toBe(Object.keys(before).length - 1)
    expect(second.changedEntityFiles).toBe(0)
    expect(formatted).toHaveBeenCalledTimes(2)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(
      writes.mock.calls.filter(([path]) =>
        String(path).startsWith(`${input.targetDirectory}/`),
      ),
    ).toEqual([])
    expect(
      writes.mock.calls.filter(
        ([path]) =>
          String(path).startsWith(`${control(input)}/work/`) &&
          String(path).includes("/integrated/agents/"),
      ),
    ).toHaveLength(Object.keys(before).length - 1)
    expect(await bytes(input.rawRoot)).toEqual(raw)
    await clean(input)
  })

  it.each(["entities", "index"])(
    "preserves current data and recovers after actual oxfmt failure on %s",
    async (stage) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const before = await fingerprints(input.targetDirectory)
      const rawBefore = await fingerprints(input.rawRoot)
      const stateBefore = await fs.readFile(join(control(input), "state.json"))
      const format = formatting.formatGeneratedJson
      const formatted = vi
        .spyOn(formatting, "formatGeneratedJson")
        .mockImplementation(async (root, paths) => {
          if ((stage === "index") === paths.includes("index.json"))
            await fs.writeFile(join(root, paths[0]), "{ invalid JSON")
          await format(root, paths)
        })
      const links = vi.spyOn(fs, "link")
      await expect(updateCurrentDataset(input)).rejects.toThrow(/oxfmt/)
      expect(formatted).toHaveBeenCalledTimes(stage === "index" ? 2 : 1)
      expect(links).not.toHaveBeenCalled()
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(await fingerprints(input.rawRoot)).toEqual(rawBefore)
      expect(await fs.readFile(join(control(input), "state.json"))).toEqual(
        stateBefore,
      )
      await clean(input)
      formatted.mockRestore()
      expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
      expect((await updateCurrentDataset(input)).outcome).toBe("unchanged")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
    },
  )

  it("adds, changes and legally removes members while reusing unchanged current inodes", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10", "30"],
    })
    await change(input)
    const added = await updateCurrentDataset(input)
    expect(added.changedEntityFiles).toBe(4)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && file !== "agents/2/details.zh.json",
    ))
      expect(after[path]).toEqual(before[path])
    expect(after["agents/2/details.zh.json"].ino).not.toBe(
      before["agents/2/details.zh.json"].ino,
    )
    await editJson(
      join(input.rawRoot, input.version, "character.json"),
      (value) => {
        delete value["10"]
      },
    )
    const removed = await updateCurrentDataset(input)
    expect(removed.removedEntityFiles).toBe(3)
    expect((await clean(input)).index.entities.agents.memberIds).toEqual([
      "2",
      "30",
    ])
  })

  it("keeps both registered categories when only one changes and never drops a category", async () => {
    const input = await fixture({ widgets: ["3", "7"] })
    const first = await updateCurrentDataset(input)
    expect(first).toMatchObject({
      outcome: "committed",
      memberCounts: { agents: 2, widgets: 2 },
      entityFileCount: 12,
    })
    const before = await fingerprints(input.targetDirectory)
    // 只改一个合成类别的来源记录：另一个类别必须原样复用，且在索引中仍然完整。
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].label = "changed"
      },
    )
    const changed = await updateCurrentDataset(input)
    expect(changed).toMatchObject({
      outcome: "committed",
      memberCounts: { agents: 2, widgets: 2 },
      changedEntityFiles: 1,
      reusedEntityFiles: 11,
    })
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && file !== "widgets/3/data.json",
    ))
      expect(after[path]).toEqual(before[path])
    let index = (await clean(input)).index
    expect(index.entities.agents.memberIds).toEqual(["2", "10"])
    expect(index.entities.widgets.memberIds).toEqual(["3", "7"])
    // 合法移除一个类别的成员：完整来源索引决定成员集合。
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
      widgetIds: ["3"],
    })
    const removed = await updateCurrentDataset(input)
    expect(removed.removedEntityFiles).toBe(3)
    index = (await clean(input)).index
    expect(index.entities.widgets.memberIds).toEqual(["3"])
    expect(index.entities.agents.memberIds).toEqual(["2", "10"])
    // 缺失输入不是删除：候选失败，整库（含两个类别）保持可用。
    await fs.rm(join(input.rawRoot, input.version, "en/equipment/3.json"))
    const intact = await bytes(input.targetDirectory)
    await expect(updateCurrentDataset(input)).rejects.toThrow("UPDATE_FAILED")
    expect(await bytes(input.targetDirectory)).toEqual(intact)
    index = (await clean(input)).index
    expect(Object.keys(index.entities)).toEqual(["agents", "widgets"])
  })

  it("records source byte and source record changes without rewriting equal entity output", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    const oldIndex = (await verified(input)).index
    const detailPath = join(input.rawRoot, input.version, "en/character/2.json")
    await fs.appendFile(detailPath, "\n  ")
    await editJson(
      join(input.rawRoot, input.version, "character.json"),
      (value) => {
        value["2"].new_key = [0, ""]
      },
    )
    const result = await updateCurrentDataset(input)
    expect(result.outcome).toBe("committed")
    expect(result.changedEntityFiles).toBe(0)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    const { index } = await clean(input)
    expect(index.entities.agents.inputs).not.toEqual(
      oldIndex.entities.agents.inputs,
    )
    expect(index.source.inputs).toEqual(oldIndex.source.inputs)
    expect(index.entities.agents.members["2"].sourceRecord.new_key).toEqual([
      0,
      "",
    ])
  })

  it("switches full source version and configuration order, while rejecting an incomplete language policy", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: "synthetic-2",
      agentIds: ["2", "10"],
    })
    input.version = "synthetic-2"
    expect((await updateCurrentDataset(input)).changedEntityFiles).toBe(0)
    expect((await clean(input)).index.source.version).toBe(input.version)
    input.policy.languages.reverse()
    await updateCurrentDataset(input)
    expect((await clean(input)).index.entities.agents.detailLocales).toEqual(
      input.policy.languages,
    )
    const beforeInvalidPolicy = await verified(input)
    input.policy.languages = ["en"]
    await expect(updateCurrentDataset(input)).rejects.toThrow("来源配置无效")
    expect(await verified(input)).toEqual(beforeInvalidPolicy)
    await clean(input)
  })

  it("verifies a recorded historical category rule but rebuilds candidates with current rules", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const original = await bytes(input.targetDirectory)
    // 历史契约：索引与记录同时登记旧规则版本，构成一份完整旧快照。
    await editJson(join(input.targetDirectory, "index.json"), (index) => {
      index.entities.agents.rulesVersion = "nanoka-agent-reference/3"
    })
    const hash = digest(
      await fs.readFile(join(input.targetDirectory, "index.json")),
    )
    await editJson(join(control(input), "state.json"), (state) => {
      state.current.entities.agents.rulesVersion = "nanoka-agent-reference/3"
      state.current.indexSha256 = hash
    })
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    expect((await verified(input)).index.entities.agents.rulesVersion).toBe(
      "nanoka-agent-reference/3",
    )
    // 旧快照只用于复验：新候选必须按当前代码规则重建，不能用改标记代替。
    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await clean(input)).index.entities.agents.rulesVersion).toBe(
      "nanoka-agent-reference/4",
    )
    expect((await clean(input)).bytes).toEqual(original)
  })

  it("recovers a recorded historical language subset and expands it with complete new inputs", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await restrictToEnglish(input)
    const before = await fingerprints(input.targetDirectory)
    // 记录中的合法语言子集仍可复验与恢复，且不改写任何文件。
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await fs.rm(join(input.rawRoot, input.version, "zh/character/2.json"))
    await expect(updateCurrentDataset(input)).rejects.toThrow(
      "zh/character/2.json",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
    })
    expect((await updateCurrentDataset(input)).changedEntityFiles).toBe(2)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && !file.endsWith("details.zh.json"),
    ))
      expect(after[path]).toEqual(before[path])
    const { index } = await clean(input)
    expect(index.entities.agents.detailLocales).toEqual(["zh", "en"])
    expect(index.entities.agents.memberIds).toEqual(["2", "10"])
  })

  it("refuses normal reads and current verification of a recorded historical language subset", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await restrictToEnglish(input)
    const before = await fingerprints(input.targetDirectory)
    // 复验与恢复仍支持记录中的语言子集。
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    // 普通读取在进入消费回调之前就要求完整语言配置。
    let callbackEntered = false
    await expect(
      withCurrentDataset(input.targetDirectory, async () => {
        callbackEntered = true
        return "unexpected"
      }),
    ).rejects.toThrow(/INCOMPLETE_LANGUAGES.*缺少 zh 详情/)
    expect(callbackEntered).toBe(false)
    // 当前验证命令同样明确失败，不返回 verified: true。
    const checked = command("verify:nanoka:current", [input.targetDirectory])
    expect(checked.status).toBe(1)
    expect(checked.stdout).toBe("")
    expect(checked.stderr).toContain("INCOMPLETE_LANGUAGES")
    expect(checked.stderr).not.toContain("verified")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    // 完整语言配置恢复后可再次正常读取；整个过程不改写历史数据。
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
    })
    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await verified(input)).index.entities.agents.detailLocales).toEqual(
      ["zh", "en"],
    )
    const checkedFull = command("verify:nanoka:current", [
      input.targetDirectory,
    ])
    expect(checkedFull.status, checkedFull.stderr).toBe(0)
    expect(JSON.parse(checkedFull.stdout).verified).toBe(true)
  })

  it("rejects a recorded category the current registry no longer registers", async () => {
    const input = await fixture({ widgets: ["3"] })
    await updateCurrentDataset(input)
    const before = await bytes(input.targetDirectory)
    // 只按代理人登记表复验：记录中的合成类别无法取得身份检查，明确拒绝且保留现场。
    await expect(
      recoverCurrentDataset({
        targetDirectory: input.targetDirectory,
        entities: onboardedSnapshotEntities,
      }),
    ).rejects.toThrow(/未在当前登记表中登记.*widgets/)
    await expect(
      withCurrentDataset(input.targetDirectory, async () => "unexpected", {
        entities: onboardedSnapshotEntities,
      }),
    ).rejects.toThrow(/未在当前登记表中登记.*widgets/)
    expect(await bytes(input.targetDirectory)).toEqual(before)
  })

  it.each(["missing", "parse", "invalid", "index", "version"])(
    "rejects incomplete/illegal %s input and leaves the old dataset usable",
    async (kind) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const before = await verified(input)
      const detailPath = join(
        input.rawRoot,
        input.version,
        "en/character/2.json",
      )
      if (kind === "missing") await fs.rm(detailPath)
      if (kind === "parse") await fs.writeFile(detailPath, "{")
      if (kind === "invalid")
        await editJson(detailPath, (value) => {
          value.id = 3
        })
      if (kind === "index")
        await writeJson(join(input.rawRoot, input.version, "character.json"), {
          "2": null,
        })
      if (kind === "version") {
        input.version = "incomplete-version"
        await writeSyntheticRaw({
          rawRoot: input.rawRoot,
          version: input.version,
          agentIds: ["2", "10"],
        })
        await fs.rm(join(input.rawRoot, input.version, "en/character/2.json"))
      }
      await expect(updateCurrentDataset(input)).rejects.toThrow("UPDATE_FAILED")
      expect(await verified(input)).toEqual(before)
      await clean(input)
    },
  )

  it.each(["content", "extra", "index", "state", "symlink"])(
    "preserves abnormal existing %s and never treats damage as unchanged",
    async (kind) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const data = join(input.targetDirectory, "agents/2/data.json")
      if (kind === "content") await fs.writeFile(data, "damaged")
      if (kind === "extra")
        await fs.mkdir(join(input.targetDirectory, "unexpected"))
      if (kind === "index")
        await fs.appendFile(join(input.targetDirectory, "index.json"), " ")
      if (kind === "state")
        await fs.writeFile(join(control(input), "state.json"), "{}")
      if (kind === "symlink") {
        await fs.rm(data)
        await fs.symlink(
          join(input.rawRoot, input.version, "character.json"),
          data,
        )
      }
      const before = await bytes(input.targetDirectory)
      await expect(updateCurrentDataset(input)).rejects.toThrow()
      expect(await bytes(input.targetDirectory)).toEqual(before)
    },
  )

  it("does not adopt existing directories or delete unknown control material, and rejects raw overlap", async () => {
    const input = await fixture()
    await fs.mkdir(input.targetDirectory, { recursive: true })
    await fs.writeFile(join(input.targetDirectory, "keep"), "keep")
    await expect(updateCurrentDataset(input)).rejects.toThrow("未登记")
    expect(await fs.readFile(join(input.targetDirectory, "keep"), "utf8")).toBe(
      "keep",
    )
    await fs.writeFile(join(control(input), "foreign"), "keep")
    await expect(recoverCurrentDataset(input)).rejects.toThrow("未登记成员")
    await expect(
      updateCurrentDataset({
        ...input,
        targetDirectory: join(input.rawRoot, "current"),
      }),
    ).rejects.toThrow("raw")
    await expect(
      updateCurrentDataset({
        ...input,
        targetDirectory: join(input.root, "raw"),
      }),
    ).rejects.toThrow("raw")
  })

  it("serializes same-process readers and writers for the entire read callback", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await withCurrentDataset(
      input.targetDirectory,
      async () => {
        await expect(updateCurrentDataset(input)).rejects.toThrow("BUSY")
        await expect(recoverCurrentDataset(input)).rejects.toThrow("BUSY")
        await expect(migrateCurrentDataset(input)).rejects.toThrow("BUSY")
        await expect(verified(input)).rejects.toThrow("BUSY")
      },
      { entities: input.entities },
    )
    await clean(input)
  })

  it.each([
    "candidate-ready",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "report-installed",
    "backup-cleaned",
    "work-cleaned",
    "idle",
  ] as const)(
    "recovers ordinary failure at %s without deleting committed data",
    async (stage) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const before = await bytes(input.targetDirectory)
      await change(input)
      await expect(
        updateCurrentDataset({
          ...input,
          checkpoint: (point) => {
            if (point === stage) throw new Error(`injected ${stage}`)
          },
        }),
      ).rejects.toThrow(`injected ${stage}`)
      const after = (await clean(input)).bytes
      if (
        [
          "candidate-ready",
          "journal-written",
          "prepared",
          "old-moved",
        ].includes(stage)
      )
        expect(after).toEqual(before)
      else expect(after).not.toEqual(before)
      expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    },
  )

  it("retains a committed dataset when report installation repeatedly fails, then recovers", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await change(input)
    const rename = fs.rename
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(to) === join(control(input), "maintenance.json"))
        throw new Error("report unavailable")
      return rename(from, to)
    })
    await expect(updateCurrentDataset(input)).rejects.toThrow("仍需恢复")
    expect(
      JSON.parse(
        await fs.readFile(
          join(input.targetDirectory, "agents/2/details.zh.json"),
          "utf8",
        ),
      ).name,
    ).toBe("changed")
    await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
    vi.restoreAllMocks()
    expect((await recoverCurrentDataset(input)).outcome).toBe("committed")
    await clean(input)
  })

  it("rejects candidate corruption after hard-link reuse before preparing a commit", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    await change(input)
    const link = fs.link
    let injected = false
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      if (!injected) {
        injected = true
        return link(join(input.targetDirectory, "index.json"), to)
      }
      return link(from, to)
    })
    const stages: CurrentCheckpoint[] = []
    await expect(
      updateCurrentDataset({
        ...input,
        checkpoint: (stage) => {
          stages.push(stage)
        },
      }),
    ).rejects.toThrow()
    expect(injected).toBe(true)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(stages).not.toContain("candidate-ready")
    expect(stages).not.toContain("prepared")
    await clean(input)
  })

  it("fails hard-link preparation without rewriting or losing current files", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    vi.spyOn(fs, "link").mockRejectedValue(new Error("link unsupported"))
    await expect(updateCurrentDataset(input)).rejects.toThrow(
      "link unsupported",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await clean(input)
  })
})

describe("migration to the multi-entity shell", () => {
  it("migrates a valid static v2 artifact without changing entity bytes and never implicitly", async () => {
    const input = await staticArtifact(await fixture(), "v2")
    const before = await fingerprints(input.targetDirectory)
    const beforeBytes = await bytes(input.targetDirectory)
    // 生成入口只登记当前格式：v2 制品必须走显式迁移。
    await expect(generateCurrentDataset(input)).rejects.toThrow(
      "MIGRATION_REQUIRED",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await expect(
      fs.stat(join(control(input), "state.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
    const migrated = await migrateCurrentDataset(input)
    expect(migrated).toMatchObject({
      outcome: "migrated",
      format: integratedSnapshotFormat,
      memberCounts: { agents: 2 },
      entityFileCount: 6,
    })
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    expect(after["index.json"].hash).not.toBe(before["index.json"].hash)
    expect((await bytes(input.targetDirectory))["index.json"]).not.toEqual(
      beforeBytes["index.json"],
    )
    const state = await readState(input)
    expect(state.protocol).toBe(currentProtocol)
    expect(state.phase).toBe("idle")
    expect(state.current.format).toBe(integratedSnapshotFormat)
    expect(state.current.entities).toEqual({
      agents: { rulesVersion: "nanoka-agent-reference/4" },
    })
    expect((await clean(input)).index.entities.agents.memberIds).toEqual([
      "2",
      "10",
    ])
    // 重复执行有明确且安全的结果。
    expect(await migrateCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      format: integratedSnapshotFormat,
    })
    expect(await fingerprints(input.targetDirectory)).toEqual(after)
  })

  it("migrates a stable managed v2 dataset after verifying it under its original protocol", async () => {
    const input = await managedLegacyFixture()
    const before = await fingerprints(input.targetDirectory)
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: legacyV2Format,
    })
    await expect(
      withCurrentDataset(input.targetDirectory, async () => "unexpected"),
    ).rejects.toThrow("MIGRATION_REQUIRED")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    const state = await readState(input)
    expect(state.protocol).toBe(currentProtocol)
    expect(state.current.format).toBe(integratedSnapshotFormat)
    await clean(input)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    expect(await fingerprints(input.targetDirectory)).toEqual(after)
  })

  it.each(["empty", "non-empty"] as const)(
    "refuses to migrate a stable managed dataset whose site has an abnormal backup: %s",
    async (residue) => {
      const input = await managedLegacyFixture()
      const backup = join(control(input), "backup")
      await fs.mkdir(backup)
      if (residue === "non-empty")
        await fs.writeFile(join(backup, "unattributed"), "keep")
      const before = await bytes(input.root)
      await expect(migrateCurrentDataset(input)).rejects.toThrow(
        "稳定状态有异常备份，保留现场",
      )
      // 现场全部保留：记录、v2 数据集、异常备份及其中内容都不变，也不新增迁移工作材料。
      expect(await bytes(input.root)).toEqual(before)
      expect((await fs.readdir(control(input))).toSorted()).toEqual(
        ["backup", "lock.sqlite", "state.json"].toSorted(),
      )
      expect((await readState(input)).protocol).toBe(legacyProtocol)
      expect((await readState(input)).phase).toBe("idle")
      expect(await fs.readdir(backup)).toEqual(
        residue === "empty" ? [] : ["unattributed"],
      )
      // 独立恢复对同一现场给出同样的结论：两处共用一份稳定状态判断。
      await expect(recoverCurrentDataset(input)).rejects.toThrow(
        "稳定状态有异常备份，保留现场",
      )
      expect(await bytes(input.root)).toEqual(before)
    },
    30000,
  )

  it.each(["empty", "non-empty"] as const)(
    "never reports the v3 dataset unchanged while its site has an abnormal backup: %s",
    async (residue) => {
      const input = await managedFixture("v3")
      const backup = join(control(input), "backup")
      await fs.mkdir(backup)
      if (residue === "non-empty")
        await fs.writeFile(join(backup, "unattributed"), "keep")
      const before = await bytes(input.root)
      await expect(migrateCurrentDataset(input)).rejects.toThrow(
        "稳定状态有异常备份，保留现场",
      )
      expect(await bytes(input.root)).toEqual(before)
      expect((await readState(input)).phase).toBe("idle")
      // 人工清理异常现场后，幂等迁移与正常读取仍然可用。
      await fs.rm(backup, { recursive: true })
      expect(await migrateCurrentDataset(input)).toMatchObject({
        outcome: "unchanged",
        format: integratedSnapshotFormat,
      })
      expect((await verified(input)).index.format).toBe(
        integratedSnapshotFormat,
      )
      await clean(input)
    },
    30000,
  )

  it.each(["v2", "v3"] as const)(
    "cleans the residual work materials of a stable record before reporting a migration result: %s",
    async (shape) => {
      const input = await managedFixture(shape)
      const before = await bytes(input.targetDirectory)
      await fs.mkdir(join(control(input), "work", "candidate"), {
        recursive: true,
      })
      await fs.writeFile(
        join(control(input), "work", "candidate", "index.json"),
        "partial",
      )
      await fs.writeFile(join(control(input), "state.next"), "partial")
      expect((await migrateCurrentDataset(input)).outcome).toBe(
        shape === "v2" ? "migrated" : "unchanged",
      )
      // 残留工作材料按恢复契约清理，迁移不把待恢复现场报告为成功。
      const names = await fs.readdir(control(input))
      expect(names).not.toContain("work")
      expect(names).not.toContain("state.next")
      const after = await bytes(input.targetDirectory)
      for (const path of Object.keys(before))
        if (path !== "index.json") expect(after[path]).toEqual(before[path])
      await clean(input)
    },
    30000,
  )

  it("requires recovering an unfinished legacy transaction under its original protocol first", async () => {
    const input = await fixture()
    // before：稳定 v2 数据集；after：内容不同的 v2 数据集，已在目标位置。
    const beforeArtifact = join(input.root, "before-artifact")
    await staticArtifact(input, "v2")
    await fs.rename(input.targetDirectory, beforeArtifact)
    await change(input)
    await staticArtifact(input, "v2")
    await fs.mkdir(control(input))
    new DatabaseSync(join(control(input), "lock.sqlite")).close()
    await fs.mkdir(join(control(input), "backup"))
    for (const [from, to] of await Promise.all(
      Object.keys(await bytes(beforeArtifact)).map(
        async (path) =>
          [
            join(beforeArtifact, path),
            join(control(input), "backup", path),
          ] as const,
      ),
    )) {
      await fs.mkdir(dirname(to), { recursive: true })
      await fs.rename(from, to)
    }
    await fs.rm(beforeArtifact, { recursive: true, force: true })
    const beforeIndex = digest(
      await fs.readFile(join(control(input), "backup", "index.json")),
    )
    const afterIndex = digest(
      await fs.readFile(join(input.targetDirectory, "index.json")),
    )
    const descriptor = (indexSha256: string) => ({
      indexSha256,
      rulesVersion: "nanoka-agent-reference/4",
      policy: input.policy,
    })
    await writeJson(join(control(input), "state.json"), {
      protocol: legacyProtocol,
      targetDirectory: input.targetDirectory,
      phase: "prepared",
      before: descriptor(beforeIndex),
      after: descriptor(afterIndex),
    })
    // 未完成的旧事务不能靠迁移覆盖：先按原协议恢复。
    await expect(migrateCurrentDataset(input)).rejects.toThrow(
      "RECOVERY_REQUIRED",
    )
    const recovery = await recoverCurrentDataset(input)
    expect(recovery).toMatchObject({
      outcome: "committed",
      available: true,
      format: legacyV2Format,
    })
    const state = await readState(input)
    expect(state.protocol).toBe(legacyProtocol)
    expect(state.phase).toBe("idle")
    const committed = await fingerprints(input.targetDirectory)
    expect(committed["index.json"].hash).toBe(afterIndex)
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      format: legacyV2Format,
    })
    // 恢复稳定后才执行显式迁移。
    expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(committed).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(committed[path])
    expect((await readState(input)).protocol).toBe(currentProtocol)
    await clean(input)
  })

  it.each(["damaged", "rules", "languages", "foreign", "unsupported"])(
    "refuses to migrate %s input and preserves the site",
    async (kind) => {
      const input = await managedLegacyFixture(
        kind === "rules" ? { rulesVersion: "nanoka-agent-reference/3" } : {},
      )
      if (kind === "rules")
        await editJson(join(input.targetDirectory, "index.json"), (index) => {
          index.rulesVersion = "nanoka-agent-reference/3"
        })
      if (kind === "damaged")
        await fs.appendFile(
          join(input.targetDirectory, "agents/2/data.json"),
          " ",
        )
      if (kind === "languages") {
        await editJson(join(input.targetDirectory, "index.json"), (index) => {
          index.source.detailLocales = ["en"]
          index.source.inputs = index.source.inputs.filter(
            (entry: { resource: string }) => !entry.resource.includes("/zh/"),
          )
          for (const memberId of Object.keys(index.agents))
            delete index.agents[memberId].files.content.zh
        })
        for (const id of ["2", "10"])
          await fs.rm(
            join(input.targetDirectory, `agents/${id}/details.zh.json`),
          )
        const trimmedIndex = digest(
          await fs.readFile(join(input.targetDirectory, "index.json")),
        )
        await editJson(join(control(input), "state.json"), (state) => {
          state.current.policy.languages = ["en"]
          state.current.indexSha256 = trimmedIndex
        })
      }
      if (kind === "foreign")
        await editJson(join(control(input), "state.json"), (state) => {
          state.targetDirectory = join(input.root, "elsewhere")
        })
      if (kind === "unsupported")
        await editJson(join(input.targetDirectory, "index.json"), (index) => {
          index.format = "fairy-nanoka-integrated/unknown"
        })
      const before = await bytes(input.root)
      await expect(migrateCurrentDataset(input)).rejects.toThrow()
      expect(await bytes(input.root)).toEqual(before)
      expect((await readState(input)).protocol).toBe(legacyProtocol)
    },
  )

  it.each([
    "copied",
    "converted",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "idle",
  ] as const)(
    "resumes or repeats migration after SIGKILL at %s",
    async (stage) => {
      const input = await managedLegacyFixture()
      const beforeBytes = await bytes(input.targetDirectory)
      const before = await fingerprints(input.targetDirectory)
      const running = await child(input, { mode: "migrate", pause: stage })
      running.process.kill("SIGKILL")
      expect((await running.done).signal).toBe("SIGKILL")
      const recovered = await child(input, { mode: "recover" })
      const result = await recovered.done
      expect(result, result.stderr).toMatchObject({ code: 0, stderr: "" })
      const committed = [
        "new-installed",
        "report-installed",
        "backup-cleaned",
        "work-cleaned",
        "idle",
      ].includes(stage)
      expect(JSON.parse(result.stdout).format).toBe(
        committed ? integratedSnapshotFormat : legacyV2Format,
      )
      const again = await child(input, { mode: "recover" })
      expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
      if (!committed) {
        // 未提交：原 v2 数据逐字节保留，重跑迁移即可完成。
        expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
        expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
      } else {
        expect((await migrateCurrentDataset(input)).outcome).toBe("unchanged")
      }
      const after = await fingerprints(input.targetDirectory)
      for (const path of Object.keys(before).filter(
        (file) => file !== "index.json",
      ))
        expect(after[path]).toEqual(before[path])
      await clean(input)
    },
    30000,
  )

  it("repeats migration after an interrupted rollback of the first attempt", async () => {
    const input = await managedLegacyFixture()
    const before = await bytes(input.targetDirectory)
    const writer = await child(input, { mode: "migrate", pause: "old-moved" })
    writer.process.kill("SIGKILL")
    await writer.done
    const recovery = await child(input, {
      mode: "recover",
      pause: "old-restored",
    })
    recovery.process.kill("SIGKILL")
    await recovery.done
    const again = await child(input, { mode: "recover" })
    expect((await again.done).code).toBe(0)
    expect(await bytes(input.targetDirectory)).toEqual(before)
    // 迁移事务已经写入新协议记录；回滚后是「新协议 + v2 数据集」，仍需显式迁移完成。
    const rolledBack = await readState(input)
    expect(rolledBack.protocol).toBe(currentProtocol)
    expect(rolledBack.current.format).toBe(legacyV2Format)
    expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
    await clean(input)
  })

  it.each([
    "initialization-partially-written",
    "initialization-written",
    "initialized",
    "copied",
    "converted",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "idle",
  ] as const)(
    "recovers or retries a first migration of an unmanaged static v2 artifact after SIGKILL at %s",
    async (stage) => {
      const input = await staticArtifact(await fixture(), "v2")
      const beforeBytes = await bytes(input.targetDirectory)
      const before = await fingerprints(input.targetDirectory)
      const running = await child(input, { mode: "migrate", pause: stage })
      const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
        bigint: true,
      })
      running.process.kill("SIGKILL")
      expect((await running.done).signal).toBe("SIGKILL")
      // 首次迁移在登记归属之前被中断：还没有可归属的工作材料，独立恢复按既有边界拒绝接管。
      const unregistered = [
        "initialization-partially-written",
        "initialization-written",
      ].includes(stage)
      if (unregistered) {
        // 归属记录尚未发布；此时只有 state.next 等待重试，数据未被触碰。
        expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
        await expect(recoverCurrentDataset(input)).rejects.toThrow(
          "未登记的目标目录",
        )
        expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
        // 重试迁移接受本次记录的完整内容或字节前缀，继续完成。
        expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
      } else {
        const recovered = await child(input, { mode: "recover" })
        const result = await recovered.done
        expect(result, result.stderr).toMatchObject({ code: 0, stderr: "" })
        const committed = [
          "new-installed",
          "report-installed",
          "backup-cleaned",
          "work-cleaned",
          "idle",
        ].includes(stage)
        expect(JSON.parse(result.stdout).format).toBe(
          committed ? integratedSnapshotFormat : legacyV2Format,
        )
        // 重复恢复有明确结果，不重复清理。
        const again = await child(input, { mode: "recover" })
        expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
        if (committed) {
          expect((await migrateCurrentDataset(input)).outcome).toBe("unchanged")
        } else {
          // 未提交：原 v2 数据逐字节保留，重试迁移即可完成。
          expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
          expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
        }
      }
      // 实体文件字节、inode、mtime 全程保持；永久锁身份不变。
      const after = await fingerprints(input.targetDirectory)
      for (const path of Object.keys(before))
        if (path !== "index.json") expect(after[path]).toEqual(before[path])
      expect(
        (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
          .ino,
      ).toBe(lockBefore.ino)
      expect(await bytes(input.targetDirectory)).not.toEqual(beforeBytes)
      await clean(input)
    },
    30000,
  )
})

describe("real process interruption and restart", () => {
  const checkpoints: CurrentCheckpoint[] = [
    "locked",
    "initialized",
    "building",
    "candidate-ready",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "report-installed",
    "backup-cleaned",
    "work-cleaned",
    "idle",
  ]
  for (const initial of [true, false])
    it.each(checkpoints.filter((stage) => initial || stage !== "initialized"))(
      `SIGKILL first=${initial} at %s`,
      async (stage) => {
        const input = await fixture()
        if (!initial) await updateCurrentDataset(input)
        const before = initial ? undefined : await bytes(input.targetDirectory)
        await change(input)
        const running = await child(input, { pause: stage })
        const competitor = await child(input)
        const conflict = await competitor.done
        expect(conflict.code).toBe(1)
        expect(conflict.stderr).toContain("BUSY")
        const reader = await child(input, { mode: "read" })
        expect((await reader.done).stderr).toContain("BUSY")
        running.process.kill("SIGKILL")
        expect((await running.done).signal).toBe("SIGKILL")
        // 新进程取到残留数据库的锁；没有删除或按 PID 解锁。
        const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
          bigint: true,
        })
        const recovery = await child(input, { mode: "recover" })
        const recovered = await recovery.done
        expect(recovered, recovered.stderr).toMatchObject({
          code: 0,
          stderr: "",
        })
        const committed = [
          "new-installed",
          "report-installed",
          "backup-cleaned",
          "work-cleaned",
          "idle",
        ].includes(stage)
        if (committed) {
          expect(
            JSON.parse(
              (await clean(input)).bytes["agents/2/details.zh.json"].toString(),
            ).name,
          ).toBe("changed")
        } else if (initial) {
          expect(JSON.parse(recovered.stdout).available).toBe(false)
          await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
            code: "ENOENT",
          })
        } else expect((await clean(input)).bytes).toEqual(before)
        const again = await child(input, { mode: "recover" })
        expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
        expect(
          (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
            .ino,
        ).toBe(lockBefore.ino)
        await updateCurrentDataset(input)
        await clean(input)
      },
      20000,
    )

  it("rejects reads after interrupted commit until recovery, and recovers an interrupted rollback", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await bytes(input.targetDirectory)
    await change(input)
    const writer = await child(input, { pause: "old-moved" })
    writer.process.kill("SIGKILL")
    await writer.done
    await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
    const recovery = await child(input, {
      mode: "recover",
      pause: "old-restored",
    })
    recovery.process.kill("SIGKILL")
    await recovery.done
    const again = await child(input, { mode: "recover" })
    expect((await again.done).code).toBe(0)
    expect((await clean(input)).bytes).toEqual(before)
  })

  it("blocks a writer while another process is reading, then releases the dead reader's lock", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const reader = await child(input, { mode: "read", pause: "reading" })
    await expect(updateCurrentDataset(input)).rejects.toThrow("BUSY")
    reader.process.kill("SIGKILL")
    await reader.done
    expect((await updateCurrentDataset(input)).outcome).toBe("unchanged")
    await clean(input)
  })
})

const repository = fileURLToPath(new URL("../../..", import.meta.url))
function command(name: string, args: string[]) {
  return spawnSync(
    "pnpm",
    ["--silent", "--filter", "@randomplay/data", name, ...args],
    { cwd: repository, encoding: "utf8", timeout: 20000 },
  )
}
describe("current workspace commands", () => {
  it("initializes a fresh clone through the generation command without rewriting files", async () => {
    const input = await staticArtifact(await fixture())
    const before = await fingerprints(input.targetDirectory)
    for (let run = 0; run < 2; run++) {
      const result = command("generate:integrated", [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      expect(result.status, result.stderr).toBe(0)
      expect(JSON.parse(result.stdout)).toMatchObject({
        outcome: "unchanged",
        reusedEntityFiles: 6,
        changedEntityFiles: 0,
      })
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
    }
    await clean(input)
  }, 30000)

  it("formats workspace sources while preserving managed integrated data", async () => {
    const input = await fixture()
    const workspace = join(input.root, "workspace")
    input.targetDirectory = join(workspace, "packages/data/integrated")
    await fs.mkdir(dirname(input.targetDirectory), { recursive: true })
    for (const path of ["package.json", "oxfmt.config.ts", ".gitignore"])
      await fs.copyFile(join(repository, path), join(workspace, path))
    await fs.symlink(
      join(repository, "node_modules"),
      join(workspace, "node_modules"),
      "dir",
    )
    function workspaceCommand(name: "format" | "format:check") {
      // 独占测试工作区复用已安装依赖；禁止 pnpm 自动安装或校验依赖快照。
      const result = spawnSync(
        "pnpm",
        ["--config.verifyDepsBeforeRun=false", name],
        {
          cwd: workspace,
          encoding: "utf8",
          timeout: 20000,
        },
      )
      expect(result.error).toBeUndefined()
      expect(result.signal).toBeNull()
      return result
    }
    await updateCurrentDataset(input)
    const original = await clean(input)
    const legacyIndex = structuredClone(original.index)
    // 只在合成 fixture 中构造合法旧排版，并同步实体及控制记录摘要。
    for (const entity of Object.values(legacyIndex.entities))
      for (const memberId of entity.memberIds) {
        const member = entity.members[memberId]
        for (const reference of [
          member.files.data,
          ...Object.values(member.files.details),
        ]) {
          const content = Buffer.from(
            `${JSON.stringify(JSON.parse(original.bytes[reference.path].toString()), null, 4)}\n`,
          )
          await fs.writeFile(
            join(input.targetDirectory, reference.path),
            content,
          )
          reference.sha256 = digest(content)
        }
      }
    const indexBytes = Buffer.from(`${JSON.stringify(legacyIndex, null, 4)}\n`)
    await fs.writeFile(join(input.targetDirectory, "index.json"), indexBytes)
    await editJson(join(control(input), "state.json"), (state) => {
      state.current.indexSha256 = digest(indexBytes)
    })
    await clean(input)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")

    // 真实 oxfmt 确实会改写此样本；探针副本不属于当前数据集。
    const probe = join(input.root, "legacy-probe.json")
    await fs.writeFile(probe, indexBytes)
    const rewritten = spawnSync(
      process.execPath,
      [
        join(repository, "node_modules/oxfmt/bin/oxfmt"),
        "--write",
        "--config",
        join(repository, "oxfmt.config.ts"),
        probe,
      ],
      { cwd: input.root, encoding: "utf8", timeout: 20000 },
    )
    expect(rewritten.status, rewritten.stderr).toBe(0)
    expect(await fs.readFile(probe)).not.toEqual(indexBytes)
    expect(JSON.parse(await fs.readFile(probe, "utf8"))).toEqual(legacyIndex)

    const sourcePath = join(workspace, "source.ts")
    await fs.writeFile(sourcePath, "export const value={answer:42};")
    const before = await fingerprints(input.targetDirectory)
    const controlBefore = await fingerprints(control(input))
    const formatted = workspaceCommand("format")
    expect(formatted.status, formatted.stderr).toBe(0)
    expect(await fs.readFile(sourcePath, "utf8")).toBe(
      "export const value = { answer: 42 }\n",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(await fingerprints(control(input))).toEqual(controlBefore)
    await clean(input)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    const checked = workspaceCommand("format:check")
    expect(checked.status).toBe(1)
    expect(checked.stdout + checked.stderr).toContain(
      "packages/data/integrated/",
    )

    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await clean(input)).bytes).toEqual(original.bytes)
    const rechecked = workspaceCommand("format:check")
    expect(rechecked.status, rechecked.stdout + rechecked.stderr).toBe(0)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
  }, 30000)

  it("generates, updates, verifies, recovers and migrates through explicit pnpm scripts", async () => {
    const input = await fixture()
    const args = [input.rawRoot, input.version, input.targetDirectory]
    for (const expected of ["committed", "unchanged"]) {
      const result = command("generate:integrated", args)
      expect(result, result.stderr).toMatchObject({ status: 0, stderr: "" })
      expect(JSON.parse(result.stdout).outcome).toBe(expected)
    }
    const verify = command("verify:nanoka:current", [input.targetDirectory])
    expect(verify.status, verify.stderr).toBe(0)
    expect(JSON.parse(verify.stdout)).toMatchObject({
      verified: true,
      format: integratedSnapshotFormat,
      categories: { agents: { memberCount: 2, detailLocales: ["zh", "en"] } },
    })
    const recover = command("recover:nanoka:current", [input.targetDirectory])
    expect(recover.status, recover.stderr).toBe(0)
    expect(JSON.parse(recover.stdout).outcome).toBe("unchanged")
    const migrate = command("migrate:nanoka:current", [input.targetDirectory])
    expect(migrate.status, migrate.stderr).toBe(0)
    expect(JSON.parse(migrate.stdout)).toMatchObject({
      outcome: "unchanged",
      format: integratedSnapshotFormat,
    })
    const snapshot = command("verify:nanoka:snapshot", [input.targetDirectory])
    expect(snapshot.status, snapshot.stderr).toBe(0)
    expect(JSON.parse(snapshot.stdout).verified).toBe(true)
    await clean(input)
  }, 30000)

  it("keeps read-only snapshot verification away from the managed record", async () => {
    const input = await managedLegacyFixture()
    const before = await fingerprints(input.root)
    const legacy = command("verify:nanoka:snapshot", [input.targetDirectory])
    expect(legacy.status).toBe(1)
    expect(legacy.stdout).toBe("")
    expect(legacy.stderr).toContain("格式版本错误")
    expect(await fingerprints(input.root)).toEqual(before)
    // 显式生成入口按当前规则整库重建，不是只读路径：实体字节不变，记录切到新协议。
    const entityBytes = await bytes(input.targetDirectory)
    const generated = command("generate:integrated", [
      input.rawRoot,
      input.version,
      input.targetDirectory,
    ])
    expect(generated.status, generated.stderr).toBe(0)
    expect(JSON.parse(generated.stdout)).toMatchObject({
      outcome: "committed",
      format: integratedSnapshotFormat,
    })
    const state = await readState(input)
    expect(state.protocol).toBe(currentProtocol)
    expect(state.current.format).toBe(integratedSnapshotFormat)
    expect((await migrateCurrentDataset(input)).outcome).toBe("unchanged")
    const after = await bytes(input.targetDirectory)
    for (const path of Object.keys(entityBytes))
      if (path !== "index.json") expect(after[path]).toEqual(entityBytes[path])
    await clean(input)
  }, 30000)

  it.each([
    "generate:integrated",
    "verify:nanoka:current",
    "recover:nanoka:current",
    "migrate:nanoka:current",
    "verify:nanoka:snapshot",
  ])(
    "%s supports help and rejects invalid arguments before any input access",
    (name) => {
      for (const help of ["-h", "--help"]) {
        const result = command(name, [help])
        expect(result).toMatchObject({ status: 0, stderr: "" })
        expect(result.stdout).toContain(`用法：${name}`)
      }
      for (const args of [
        [],
        [""],
        ["--unknown"],
        ["--help", "x"],
        ["a", "b", "c", "d"],
      ]) {
        const result = command(name, args)
        expect(result).toMatchObject({ status: 1, stdout: "" })
        expect(result.stderr).toContain(`用法：${name}`)
        expect(result.stderr).not.toContain("ENOENT")
        expect(result.stderr).not.toContain("    at ")
      }
    },
    30000,
  )
})

it("recovers forward after partial backup deletion and rollback after failed candidate rename", async () => {
  const input = await fixture()
  await updateCurrentDataset(input)
  const before = await verified(input)
  await change(input)
  const rename = fs.rename
  vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
    if (
      String(from).endsWith("work/candidate") &&
      String(to) === input.targetDirectory
    )
      throw new Error("rename failed")
    return rename(from, to)
  })
  await expect(updateCurrentDataset(input)).rejects.toThrow("rename failed")
  expect(await verified(input)).toEqual(before)
  vi.restoreAllMocks()
  const remove = fs.rm
  vi.spyOn(fs, "rm").mockImplementation(async (path, options) => {
    if (String(path) === join(control(input), "backup")) {
      await remove(join(String(path), "agents/2/data.json"), { force: true })
      throw new Error("partial cleanup")
    }
    return remove(path, options)
  })
  await expect(updateCurrentDataset(input)).rejects.toThrow("仍需恢复")
  vi.restoreAllMocks()
  expect((await recoverCurrentDataset(input)).outcome).toBe("committed")
  expect((await clean(input)).bytes).not.toEqual(before.bytes)
})

it("resumes rollback even after its candidate has been deleted and another recovery process is killed", async () => {
  const input = await fixture()
  await updateCurrentDataset(input)
  const before = await verified(input)
  await change(input)
  const writer = await child(input, { pause: "prepared" })
  writer.process.kill("SIGKILL")
  await writer.done
  const recovery = await child(input, {
    mode: "recover",
    pause: "work-cleaned",
  })
  recovery.process.kill("SIGKILL")
  await recovery.done
  const again = await child(input, { mode: "recover" })
  expect((await again.done).code).toBe(0)
  expect(await verified(input)).toEqual(before)
  await clean(input)
})

it("preserves partial initial state writes and refuses foreign recovery paths", async () => {
  const input = await fixture()
  await fs.mkdir(control(input), { recursive: true })
  await fs.writeFile(join(control(input), "state.next"), "{partial")
  expect((await recoverCurrentDataset(input)).available).toBe(false)
  expect((await updateCurrentDataset(input)).outcome).toBe("committed")
  const before = await bytes(input.targetDirectory)
  await editJson(join(control(input), "state.json"), (value) => {
    value.targetDirectory = input.rawRoot
  })
  await expect(recoverCurrentDataset(input)).rejects.toThrow("归属")
  expect(await bytes(input.targetDirectory)).toEqual(before)
})

it.each(["backup-partially-cleaned", "work-partially-cleaned"])(
  "restarts after SIGKILL in actual partial cleanup: %s",
  async (pause) => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await verified(input)
    await change(input)
    if (pause === "work-partially-cleaned") {
      const writer = await child(input, { pause: "prepared" })
      writer.process.kill("SIGKILL")
      await writer.done
    }
    const interrupted = await child(input, {
      mode: pause === "work-partially-cleaned" ? "recover" : "update",
      pause,
    })
    interrupted.process.kill("SIGKILL")
    expect((await interrupted.done).signal).toBe("SIGKILL")
    const recovery = await child(input, { mode: "recover" })
    expect((await recovery.done).code).toBe(0)
    const after = await clean(input)
    if (pause === "work-partially-cleaned") expect(after).toEqual(before)
    else expect(after.bytes).not.toEqual(before.bytes)
    const repeated = await child(input, { mode: "recover" })
    expect(JSON.parse((await repeated.done).stdout).outcome).toBe("unchanged")
  },
)

it("refuses to recreate a missing permanent lock in an already managed directory", async () => {
  const input = await fixture()
  await updateCurrentDataset(input)
  const before = await bytes(input.targetDirectory)
  await fs.rm(join(control(input), "lock.sqlite"))
  await expect(updateCurrentDataset(input)).rejects.toThrow("缺失永久锁")
  await expect(recoverCurrentDataset(input)).rejects.toThrow("缺失永久锁")
  await expect(migrateCurrentDataset(input)).rejects.toThrow("缺失永久锁")
  expect(await bytes(input.targetDirectory)).toEqual(before)
  await expect(
    fs.lstat(join(control(input), "lock.sqlite")),
  ).rejects.toMatchObject({ code: "ENOENT" })
})

describe("explicit generation initialization", () => {
  it.each([
    "format",
    "rules",
    "members",
    "languages",
    "digest",
    "missing",
    "extra",
    "empty-directory",
    "symlink",
  ])(
    "rejects invalid clone %s and preserves existing files",
    async (damage) => {
      const input = await staticArtifact(await fixture())
      const indexPath = join(input.targetDirectory, "index.json")
      if (damage === "format")
        await editJson(indexPath, (index) => {
          index.format = "unknown"
        })
      if (damage === "rules")
        await editJson(indexPath, (index) => {
          index.entities.agents.rulesVersion = "nanoka-agent-reference/999"
        })
      if (damage === "members")
        await editJson(indexPath, (index) => {
          index.entities.agents.memberIds = ["2"]
        })
      if (damage === "languages")
        await editJson(indexPath, (index) => {
          index.entities.agents.detailLocales = ["en"]
        })
      if (damage === "digest")
        await fs.appendFile(
          join(input.targetDirectory, "agents/2/data.json"),
          " ",
        )
      if (damage === "missing")
        await fs.rm(join(input.targetDirectory, "agents/2/details.en.json"))
      if (damage === "extra")
        await fs.writeFile(join(input.targetDirectory, "extra.json"), "{}")
      if (damage === "empty-directory")
        await fs.mkdir(join(input.targetDirectory, "extra"))
      if (damage === "symlink") {
        await fs.rename(
          join(input.targetDirectory, "agents/2/data.json"),
          join(input.root, "external.json"),
        )
        await fs.symlink(
          join(input.root, "external.json"),
          join(input.targetDirectory, "agents/2/data.json"),
        )
      }
      const before = await fingerprints(input.targetDirectory)
      const names = await fs.readdir(input.targetDirectory, { recursive: true })
      const result = command("generate:integrated", [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      expect(result.status, result.stderr).toBe(1)
      expect(result.stdout).toBe("")
      expect(result.stderr).toContain("失败")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(
        await fs.readdir(input.targetDirectory, { recursive: true }),
      ).toEqual(names)
      await expect(
        fs.stat(join(control(input), "state.json")),
      ).rejects.toMatchObject({ code: "ENOENT" })
    },
    20000,
  )

  it.each([
    "damaged-record",
    "index-mismatch",
    "missing-lock",
    "orphan-work",
    "orphan-backup",
    "orphan-report",
    "orphan-prepared",
    "damaged-initial-record",
  ])(
    "does not reset an existing management failure: %s",
    async (damage) => {
      const input = await staticArtifact(await fixture())
      if (
        ["damaged-record", "index-mismatch", "missing-lock"].includes(damage)
      ) {
        await generateCurrentDataset(input)
        if (damage === "damaged-record")
          await fs.writeFile(join(control(input), "state.json"), "{broken")
        if (damage === "index-mismatch")
          await fs.appendFile(join(input.targetDirectory, "index.json"), " ")
        if (damage === "missing-lock")
          await fs.rm(join(control(input), "lock.sqlite"))
      } else {
        await fs.mkdir(control(input))
        const db = new DatabaseSync(join(control(input), "lock.sqlite"))
        db.close()
        if (damage === "orphan-work")
          await fs.mkdir(join(control(input), "work"))
        if (damage === "orphan-backup")
          await fs.mkdir(join(control(input), "backup"))
        if (damage === "orphan-report")
          await fs.writeFile(join(control(input), "maintenance.json"), "{}")
        if (damage === "orphan-prepared")
          await writeJson(join(control(input), "state.next"), {
            phase: "prepared",
          })
        if (damage === "damaged-initial-record")
          await fs.writeFile(join(control(input), "state.next"), "{broken")
      }
      const before = await fingerprints(input.root)
      const names = await fs.readdir(input.root, { recursive: true })
      const result = command("generate:integrated", [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      expect(result.status, result.stderr).toBe(1)
      expect(result.stdout).toBe("")
      expect(await fingerprints(input.root)).toEqual(before)
      expect(await fs.readdir(input.root, { recursive: true })).toEqual(names)
    },
    20000,
  )

  it.each([
    "locked",
    "initialization-partially-written",
    "initialization-written",
    "initialized",
  ])(
    "retries initialization after SIGKILL at %s using the same permanent lock",
    async (pause) => {
      const input = await staticArtifact(await fixture())
      const before = await fingerprints(input.targetDirectory)
      const writer = await child(input, { mode: "generate", pause })
      const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
        bigint: true,
      })
      for (const operation of [
        () => generateCurrentDataset(input),
        () => recoverCurrentDataset(input),
        () => verified(input),
      ])
        await expect(operation()).rejects.toThrow("BUSY")
      writer.process.kill("SIGKILL")
      expect((await writer.done).signal).toBe("SIGKILL")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      if (pause !== "initialized") {
        await expect(recoverCurrentDataset(input)).rejects.toThrow(
          "未登记的目标目录",
        )
        await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
      } else {
        expect((await recoverCurrentDataset(input)).available).toBe(true)
      }
      const retry = await child(input, { mode: "generate" })
      const result = await retry.done
      expect(result.code, result.stderr).toBe(0)
      expect(JSON.parse(result.stdout).outcome).toBe("unchanged")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(
        (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
          .ino,
      ).toBe(lockBefore.ino)
      await clean(input)
      expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    },
    20000,
  )

  it("initializes existing bytes before a changed-input update and recovers a prepared transaction", async () => {
    const input = await staticArtifact(await fixture())
    const before = await fingerprints(input.targetDirectory)
    await change(input)
    const writer = await child(input, { mode: "generate", pause: "prepared" })
    writer.process.kill("SIGKILL")
    await writer.done
    expect((await recoverCurrentDataset(input)).outcome).toBe("rolled-back")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    const result = await generateCurrentDataset(input)
    expect(result).toMatchObject({
      outcome: "committed",
      changedEntityFiles: 1,
      reusedEntityFiles: 5,
    })
    await clean(input)
  })
})

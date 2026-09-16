import { spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  generateCurrentDataset,
  recoverCurrentDataset,
  updateCurrentDataset,
  withCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import { onboardedSnapshotEntities } from "../scripts/nanoka-integration/snapshot-entities.ts"
import type { IntegratedSnapshotEntityProducer } from "../scripts/nanoka-integration/snapshot-entities.ts"
import { compareJsonValues } from "../scripts/nanoka-integration/snapshot-diff.ts"
import type {
  ComparisonSnapshot,
  UpdateReport,
} from "../scripts/nanoka-integration/update-report.ts"
import { compareSnapshotUpdate } from "../scripts/nanoka-integration/update-report.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import {
  legacyV2Format,
  rewriteAsLegacyV2Artifact,
  writeSyntheticRaw,
} from "./fixtures/synthetic-dataset.ts"
import { syntheticSnapshotEntity } from "./fixtures/snapshot-entities.ts"
import type { DetailLocale } from "../src/integration/agent-types.ts"

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))

const integratedSnapshotFormat = "fairy-nanoka-integrated/v3"
const legacyProtocol = "fairy-nanoka-current/1"
const reportVersion = "fairy-nanoka-update-report/1"
const processScript = fileURLToPath(
  new URL("./fixtures/current-agent-process.ts", import.meta.url),
)

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

/** 差异引擎单元测试的合成文件引用；两侧摘要相同，因此不会读取任何文件。 */
const comparisonFile = (path: string) => ({ path, sha256: "a".repeat(64) })

async function writeJson(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}

async function editJson(path: string, mutate: (value: any) => void) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  mutate(value)
  await writeJson(path, value)
}

/** 合成数据集：两个代理人，以及可选的合成第二类别。两个类别都不读取真实 raw。 */
async function fixture(options: { widgets?: readonly string[] } = {}) {
  const root = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), "fairy-update-report-test-")),
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

function reportPath(input: Fixture) {
  return join(control(input), "maintenance.json")
}

/** 制品外维护报告的本次更新段；详细差异只在报告里，回执只给摘要。 */
async function updateReport(input: Fixture): Promise<UpdateReport> {
  const maintenance = JSON.parse(await fs.readFile(reportPath(input), "utf8"))
  expect(maintenance.update.reportVersion).toBe(reportVersion)
  return maintenance.update
}

function category(report: UpdateReport, name: string) {
  const found = report.categories.find((entry) => entry.name === name)
  if (!found) throw new Error(`报告缺少类别 ${name}`)
  return found
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

async function rawByteTotal(rawRoot: string) {
  return Object.values(await bytes(rawRoot)).reduce(
    (total, content) => total + content.length,
    0,
  )
}

async function child(input: Fixture, extra: Record<string, unknown> = {}) {
  const path = join(input.root, `process-${crypto.randomUUID()}.json`)
  const { entities, ...serializable } = input
  void entities
  await writeJson(path, { ...serializable, ...extra })
  const processChild = spawn(
    globalThis.process.execPath,
    ["--disable-warning=ExperimentalWarning", processScript, path],
    { stdio: ["ignore", "pipe", "pipe", "ipc"] },
  )
  children.push(processChild)
  let stderr = ""
  processChild.stderr!.on("data", (chunk) => {
    stderr += chunk
  })
  const done = new Promise<{
    code: number | null
    signal: NodeJS.Signals | null
  }>((resolve, reject) => {
    processChild.once("error", reject)
    processChild.once("close", (code, signal) => resolve({ code, signal }))
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
    processChild.once("message", (message) => {
      clearTimeout(timer)
      expect(message).toEqual({ stage: extra.pause })
      resolve()
    })
    processChild.once("exit", () => {
      clearTimeout(timer)
      reject(new Error(`exited before ${extra.pause}: ${stderr}`))
    })
  })
  await paused
  return { process: processChild, done }
}

describe("update report diff engine", () => {
  it("records added, removed and changed fields while keeping type distinctions", () => {
    // 缺失用「记录里没有对应一侧」表达；null、0、false、空字符串各自保留类型与值。
    expect(
      compareJsonValues(
        {
          kept: 1,
          nullRemoved: null,
          zeroToNull: 0,
          falseToEmpty: false,
          emptyToMissing: "",
        },
        { kept: 1, zeroToNull: null, falseToEmpty: "", addedFalse: false },
      ),
    ).toEqual([
      {
        pointer: "/addedFalse",
        change: "added",
        after: { kind: "boolean", value: false },
      },
      {
        pointer: "/emptyToMissing",
        change: "removed",
        before: { kind: "string", value: "" },
      },
      {
        pointer: "/falseToEmpty",
        change: "changed",
        before: { kind: "boolean", value: false },
        after: { kind: "string", value: "" },
      },
      {
        pointer: "/nullRemoved",
        change: "removed",
        before: { kind: "null" },
      },
      {
        pointer: "/zeroToNull",
        change: "changed",
        before: { kind: "number", value: 0 },
        after: { kind: "null" },
      },
    ])
    const removed = compareJsonValues({ field: null }, {})[0]!
    expect(Object.hasOwn(removed, "after")).toBe(false)
    expect(Object.hasOwn(removed, "before")).toBe(true)
  })

  it("expands containers and keeps array length, element and order changes", () => {
    expect(
      compareJsonValues(
        { list: [1, 2], nested: { keep: 1, gone: true } },
        { list: [1, 2, 3], nested: { keep: 1, added: true } },
      ),
    ).toEqual([
      {
        pointer: "/list",
        change: "changed",
        before: { kind: "array", length: 2 },
        after: { kind: "array", length: 3 },
      },
      {
        pointer: "/list/2",
        change: "added",
        after: { kind: "number", value: 3 },
      },
      {
        pointer: "/nested/added",
        change: "added",
        after: { kind: "boolean", value: true },
      },
      {
        pointer: "/nested/gone",
        change: "removed",
        before: { kind: "boolean", value: true },
      },
    ])
    // 顺序变化保留为对应下标的差异；报告不排序数组来掩盖变化。
    expect(
      compareJsonValues({ values: [1, 0, 2] }, { values: [2, 0, 1] }),
    ).toEqual([
      {
        pointer: "/values/0",
        change: "changed",
        before: { kind: "number", value: 1 },
        after: { kind: "number", value: 2 },
      },
      {
        pointer: "/values/2",
        change: "changed",
        before: { kind: "number", value: 2 },
        after: { kind: "number", value: 1 },
      },
    ])
    expect(compareJsonValues([1, 0, 2], [1, 0, 2])).toEqual([])
    expect(compareJsonValues({ a: 1 }, { a: 1 })).toEqual([])
  })

  it("expands both sides when a container is replaced by another container type", () => {
    // 对象 → 数组：保留父节点类型变化，并逐条记录旧内容被删除、新内容被新增。
    expect(
      compareJsonValues({ field: { rate: 1 } }, { field: [9, 11] }),
    ).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "object", size: 1 },
        after: { kind: "array", length: 2 },
      },
      {
        pointer: "/field/rate",
        change: "removed",
        before: { kind: "number", value: 1 },
      },
      {
        pointer: "/field/0",
        change: "added",
        after: { kind: "number", value: 9 },
      },
      {
        pointer: "/field/1",
        change: "added",
        after: { kind: "number", value: 11 },
      },
    ])
    // 数组 → 对象：同样不丢掉任何一侧的内容。
    expect(
      compareJsonValues({ field: [9, 11] }, { field: { note: "x" } }),
    ).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "array", length: 2 },
        after: { kind: "object", size: 1 },
      },
      {
        pointer: "/field/0",
        change: "removed",
        before: { kind: "number", value: 9 },
      },
      {
        pointer: "/field/1",
        change: "removed",
        before: { kind: "number", value: 11 },
      },
      {
        pointer: "/field/note",
        change: "added",
        after: { kind: "string", value: "x" },
      },
    ])
    // 同大小的不同内容必须给出不同报告，不能只报容器形状。
    expect(compareJsonValues({ field: { a: 1 } }, { field: [2] })).not.toEqual(
      compareJsonValues({ field: { b: 3 } }, { field: [4] }),
    )
  })

  it("keeps object numeric keys and array indices apart when containers swap", () => {
    // 数字对象键与数组下标得到相同 Pointer 时仍分属两侧结构：一条删除、一条新增，绝不互相抵消。
    expect(compareJsonValues({ field: { 0: "old" } }, { field: [9] })).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "object", size: 1 },
        after: { kind: "array", length: 1 },
      },
      {
        pointer: "/field/0",
        change: "removed",
        before: { kind: "string", value: "old" },
      },
      {
        pointer: "/field/0",
        change: "added",
        after: { kind: "number", value: 9 },
      },
    ])
    // 两侧值相同也不能抵消：数组下标与对象键的结构语义不同。
    expect(
      compareJsonValues({ field: ["same"] }, { field: { 0: "same" } }),
    ).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "array", length: 1 },
        after: { kind: "object", size: 1 },
      },
      {
        pointer: "/field/0",
        change: "removed",
        before: { kind: "string", value: "same" },
      },
      {
        pointer: "/field/0",
        change: "added",
        after: { kind: "string", value: "same" },
      },
    ])
  })

  it("expands containers replaced by scalars and scalars replaced by containers", () => {
    // 容器 → 标量：旧容器的全部内容按删除逐条保留，含空容器与嵌套数组。
    expect(
      compareJsonValues(
        { field: { rate: 1, tags: [], nested: { deep: [2] } } },
        { field: null },
      ),
    ).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "object", size: 3 },
        after: { kind: "null" },
      },
      {
        pointer: "/field/nested",
        change: "removed",
        before: { kind: "object", size: 1 },
      },
      {
        pointer: "/field/nested/deep",
        change: "removed",
        before: { kind: "array", length: 1 },
      },
      {
        pointer: "/field/nested/deep/0",
        change: "removed",
        before: { kind: "number", value: 2 },
      },
      {
        pointer: "/field/rate",
        change: "removed",
        before: { kind: "number", value: 1 },
      },
      {
        pointer: "/field/tags",
        change: "removed",
        before: { kind: "array", length: 0 },
      },
    ])
    // 标量 → 容器：新容器的全部内容按新增逐条保留。
    expect(
      compareJsonValues(
        { field: 0 },
        { field: { empty: {}, list: [1], flag: false } },
      ),
    ).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "number", value: 0 },
        after: { kind: "object", size: 3 },
      },
      {
        pointer: "/field/empty",
        change: "added",
        after: { kind: "object", size: 0 },
      },
      {
        pointer: "/field/flag",
        change: "added",
        after: { kind: "boolean", value: false },
      },
      {
        pointer: "/field/list",
        change: "added",
        after: { kind: "array", length: 1 },
      },
      {
        pointer: "/field/list/0",
        change: "added",
        after: { kind: "number", value: 1 },
      },
    ])
    // 空容器与 false、空字符串、缺失彼此不混淆。
    expect(compareJsonValues({ field: [] }, { field: false })).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "array", length: 0 },
        after: { kind: "boolean", value: false },
      },
    ])
    expect(compareJsonValues({ field: {} }, { field: "" })).toEqual([
      {
        pointer: "/field",
        change: "changed",
        before: { kind: "object", size: 0 },
        after: { kind: "string", value: "" },
      },
    ])
    expect(compareJsonValues({ field: {} }, {})).toEqual([
      {
        pointer: "/field",
        change: "removed",
        before: { kind: "object", size: 0 },
      },
    ])
  })

  it("escapes pointer segments and stays deterministic for replaced containers", () => {
    const expected = [
      "/field",
      "/field/2",
      "/field/10",
      "/field/g~1~0",
      "/field/0",
      "/field/0/a~1b",
      "/field/1",
    ]
    const records = compareJsonValues(
      { field: { "10": 2, "2": 3, "g/~": 1 } },
      { field: [{ "a/b": 4 }, 0] },
    )
    expect(records.map(({ pointer }) => pointer)).toEqual(expected)
    expect(records.filter(({ change }) => change === "removed")).toEqual([
      {
        pointer: "/field/2",
        change: "removed",
        before: { kind: "number", value: 3 },
      },
      {
        pointer: "/field/10",
        change: "removed",
        before: { kind: "number", value: 2 },
      },
      {
        pointer: "/field/g~1~0",
        change: "removed",
        before: { kind: "number", value: 1 },
      },
    ])
    expect(records.filter(({ change }) => change === "added")).toEqual([
      {
        pointer: "/field/0",
        change: "added",
        after: { kind: "object", size: 1 },
      },
      {
        pointer: "/field/0/a~1b",
        change: "added",
        after: { kind: "number", value: 4 },
      },
      {
        pointer: "/field/1",
        change: "added",
        after: { kind: "number", value: 0 },
      },
    ])
    // 对象成员排列不影响顺序；数组仍按原始下标顺序展开。
    expect(
      compareJsonValues(
        { field: { "2": 3, "g/~": 1, "10": 2 } },
        { field: [{ "a/b": 4 }, 0] },
      ).map(({ pointer }) => pointer),
    ).toEqual(expected)
  })

  it("orders pointers deterministically and escapes pointer segments", () => {
    const expected = ["/2", "/10", "/alpha", "/g~1~0"]
    expect(
      compareJsonValues(
        { "10": 1, "2": 2, "alpha": 3, "g/~": 4 },
        { "alpha": 0, "g/~": 5, "2": 1, "10": 0 },
      ).map(({ pointer }) => pointer),
    ).toEqual(expected)
    // 对象成员排列不影响记录顺序；整块删除仍逐条给出内容与被删除的容器形状。
    expect(
      compareJsonValues(
        { "alpha": 0, "g/~": 5, "2": 1, "10": 0 },
        { "10": 1, "2": 2, "alpha": 3, "g/~": 4 },
      ).map(({ pointer }) => pointer),
    ).toEqual(expected)
    expect(
      compareJsonValues({ subtree: { b: 1, a: 2 } }, { replacement: 0 }),
    ).toEqual([
      {
        pointer: "/replacement",
        change: "added",
        after: { kind: "number", value: 0 },
      },
      {
        pointer: "/subtree",
        change: "removed",
        before: { kind: "object", size: 2 },
      },
      {
        pointer: "/subtree/a",
        change: "removed",
        before: { kind: "number", value: 2 },
      },
      {
        pointer: "/subtree/b",
        change: "removed",
        before: { kind: "number", value: 1 },
      },
    ])
  })

  it("marks a category only present in the baseline as removed and not checked", async () => {
    const member = (name: string) => ({
      files: {
        data: comparisonFile(`${name}/2/data.json`),
        details: new Map<DetailLocale, { path: string; sha256: string }>([
          ["zh", comparisonFile(`${name}/2/details.zh.json`)],
        ]),
      },
      sourceRecord: { id: 2 },
    })
    const entity = (name: string, rulesVersion: string) => ({
      name,
      rulesVersion,
      detailLocales: ["zh" as const],
      memberIds: ["2"],
      inputs: [
        { resource: `zzz/synthetic-1/${name}.json`, sha256: "b".repeat(64) },
      ],
      members: new Map([["2", member(name)]]),
    })
    const baseline: ComparisonSnapshot = {
      format: integratedSnapshotFormat,
      sourceVersion: "synthetic-1",
      inputs: [{ resource: "manifest.json", sha256: "c".repeat(64) }],
      entities: new Map([
        ["agents", entity("agents", "nanoka-agent-reference/4")],
        ["widgets", entity("widgets", "widget-reference/1")],
      ]),
    }
    const candidate: ComparisonSnapshot = {
      format: integratedSnapshotFormat,
      sourceVersion: "synthetic-1",
      inputs: [{ resource: "manifest.json", sha256: "c".repeat(64) }],
      entities: new Map([
        ["agents", entity("agents", "nanoka-agent-reference/4")],
      ]),
    }
    const report = await compareSnapshotUpdate({
      baseline: {
        side: "baseline",
        root: "/nonexistent-baseline",
        snapshot: baseline,
        maximumBytes: 1,
      },
      candidate: {
        side: "candidate",
        root: "/nonexistent-candidate",
        snapshot: candidate,
        maximumBytes: 1,
      },
    })
    expect(category(report, "agents").result).toBe("unchanged")
    expect(category(report, "widgets")).toMatchObject({
      checked: false,
      presence: "removed",
      result: "changed",
      rulesVersion: {
        before: "widget-reference/1",
        after: null,
        changed: false,
      },
      members: { beforeCount: 1, afterCount: 0, removed: ["2"] },
      files: {
        beforeCount: 2,
        afterCount: 0,
        removed: ["widgets/2/data.json", "widgets/2/details.zh.json"],
      },
      review: { required: true, removedMembers: 1, removedFiles: 2 },
      cause: {
        sourceChanged: false,
        rulesChanged: false,
        attributedTo: "neither",
      },
    })
    expect(report.checked).toBe(true)
    expect(report.result).toBe("changed")
  })
})

describe("current dataset update report", () => {
  it("reports a first generation explicitly instead of a version update", async () => {
    const input = await fixture()
    const result = await generateCurrentDataset(input)
    expect(result.outcome).toBe("committed")
    expect(result).toMatchObject({
      reportVersion,
      firstGeneration: true,
      result: "changed",
      sourceChanged: false,
      rulesChanged: false,
      reviewRequired: false,
      sourceVersion: { before: null, after: input.version, changed: false },
      categories: {
        agents: {
          checked: true,
          presence: "added",
          result: "changed",
          members: {
            before: 0,
            after: 2,
            added: 2,
            removed: 0,
            changed: 0,
            unchanged: 0,
          },
          files: {
            before: 0,
            after: 6,
            added: 6,
            removed: 0,
            semanticChanged: 0,
            formatOnlyChanged: 0,
            unchanged: 0,
          },
          sourceRecordsChanged: 0,
          rulesVersionChanged: false,
          reviewRequired: false,
        },
      },
    })
    const report = await updateReport(input)
    expect(report).toMatchObject({
      reportVersion,
      baseline: { kind: "none" },
      candidate: {
        format: integratedSnapshotFormat,
        sourceVersion: input.version,
      },
      checked: true,
      result: "changed",
      source: {
        version: { before: null, after: input.version, changed: false },
        changed: false,
        unchangedInputCount: 0,
      },
      rules: {
        categories: [
          {
            name: "agents",
            before: null,
            after: "nanoka-agent-reference/4",
            changed: false,
          },
        ],
        changed: false,
      },
      changeCause: {
        sourceChanged: false,
        rulesChanged: false,
        attributedTo: "neither",
      },
    })
    // 首次生成没有旧基线：全部资源按新增记录，来源材料本身没有可比的变化。
    expect(
      report.source.inputs.map(({ category: scope, change }) => [
        scope,
        change,
      ]),
    ).toEqual([
      [null, "added"],
      ["agents", "added"],
      ["agents", "added"],
      ["agents", "added"],
      ["agents", "added"],
      ["agents", "added"],
    ])
    // 首次生成没有旧基线：成员与文件全部是新增，不伪装成一次普通版本更新。
    const agents = category(report, "agents")
    expect(agents.presence).toBe("added")
    expect(agents.members.added).toEqual(["2", "10"])
    expect(agents.files.added).toEqual([
      "agents/2/data.json",
      "agents/2/details.zh.json",
      "agents/2/details.en.json",
      "agents/10/data.json",
      "agents/10/details.zh.json",
      "agents/10/details.en.json",
    ])
    expect(agents.fileChanges).toEqual([])
    expect(agents.review).toMatchObject({
      required: false,
      removedMembers: 0,
      removedFiles: 0,
      semanticChangedFiles: 0,
      removedFields: 0,
      changedFields: 0,
      addedFields: 0,
    })
    // 未知字段提示等既有维护信息与差异报告在同一份制品外报告里。
    const maintenance = JSON.parse(await fs.readFile(reportPath(input), "utf8"))
    expect(Object.keys(maintenance).toSorted()).toEqual([
      "categories",
      "update",
    ])
    expect(
      maintenance.categories.agents.map(
        (entry: { memberId: string }) => entry.memberId,
      ),
    ).toEqual(["2", "10"])
  })

  it("reports every category as checked and unchanged on repeated identical generation", async () => {
    const input = await fixture({ widgets: ["3", "7"] })
    await generateCurrentDataset(input)
    const first = await fingerprints(input.targetDirectory)
    const second = await generateCurrentDataset(input)
    expect(second.outcome).toBe("unchanged")
    const report = await updateReport(input)
    expect(report.baseline).toEqual({
      kind: "snapshot",
      format: integratedSnapshotFormat,
      sourceVersion: input.version,
    })
    expect(report.result).toBe("unchanged")
    expect(report.source).toMatchObject({
      version: {
        before: input.version,
        after: input.version,
        changed: false,
      },
      inputs: [],
      unchangedInputCount: 11,
      changed: false,
    })
    expect(report.rules).toEqual({
      categories: [
        {
          name: "agents",
          before: "nanoka-agent-reference/4",
          after: "nanoka-agent-reference/4",
          changed: false,
        },
        {
          name: "widgets",
          before: "widget-reference/1",
          after: "widget-reference/1",
          changed: false,
        },
      ],
      changed: false,
    })
    for (const name of ["agents", "widgets"]) {
      const entry = category(report, name)
      expect(entry.presence).toBe("present")
      expect(entry.checked).toBe(true)
      expect(entry.result).toBe("unchanged")
      expect(entry.files).toMatchObject({
        added: [],
        removed: [],
        semanticChanged: [],
        formatOnlyChanged: [],
      })
      expect(entry.sourceRecords.changed).toEqual([])
      expect(entry.fileChanges).toEqual([])
      expect(entry.review.required).toBe(false)
      expect(entry.members.changed).toEqual([])
    }
    expect(category(report, "agents").members.unchanged).toEqual(["2", "10"])
    expect(category(report, "widgets").members.unchanged).toEqual(["3", "7"])
    expect(category(report, "agents").files.unchangedCount).toBe(6)
    expect(category(report, "widgets").files.unchangedCount).toBe(6)
    expect(second.reusedEntityFiles).toBe(12)
    expect(second.changedEntityFiles).toBe(0)
    // 未变化实体文件保持字节、inode 与纳秒 mtime；相同输入重复生成得到相同报告。
    expect(await fingerprints(input.targetDirectory)).toEqual(first)
    const repeatedReport = await fs.readFile(reportPath(input))
    await generateCurrentDataset(input)
    expect(await fs.readFile(reportPath(input))).toEqual(repeatedReport)
    expect((await updateReport(input)).result).toBe("unchanged")
  })

  it("reports a source version switch while entity output stays unchanged", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: "synthetic-2",
      agentIds: ["2", "10"],
    })
    input.version = "synthetic-2"
    const result = await generateCurrentDataset(input)
    expect(result.outcome).toBe("committed")
    expect(result.changedEntityFiles).toBe(0)
    expect(result.sourceVersion).toEqual({
      before: "synthetic-1",
      after: "synthetic-2",
      changed: true,
    })
    const report = await updateReport(input)
    expect(report.baseline).toEqual({
      kind: "snapshot",
      format: integratedSnapshotFormat,
      sourceVersion: "synthetic-1",
    })
    expect(report.source.version).toEqual({
      before: "synthetic-1",
      after: "synthetic-2",
      changed: true,
    })
    // 版本切换只体现为资源名的新增与移除；来源版本号变化不等于实体内容变化。
    // 顺序为先候选顺序，再仅基线存在的资源。
    expect(
      report.source.inputs.map(({ category: scope, resource, change }) => [
        scope,
        resource,
        change,
      ]),
    ).toEqual([
      [null, "manifest.json", "changed"],
      ["agents", `zzz/${input.version}/character.json`, "added"],
      ["agents", `zzz/${input.version}/zh/character/2.json`, "added"],
      ["agents", `zzz/${input.version}/en/character/2.json`, "added"],
      ["agents", `zzz/${input.version}/zh/character/10.json`, "added"],
      ["agents", `zzz/${input.version}/en/character/10.json`, "added"],
      ["agents", "zzz/synthetic-1/character.json", "removed"],
      ["agents", "zzz/synthetic-1/zh/character/2.json", "removed"],
      ["agents", "zzz/synthetic-1/en/character/2.json", "removed"],
      ["agents", "zzz/synthetic-1/zh/character/10.json", "removed"],
      ["agents", "zzz/synthetic-1/en/character/10.json", "removed"],
    ])
    expect(report.source.changed).toBe(true)
    expect(report.result).toBe("unchanged")
    expect(report.changeCause).toEqual({
      sourceChanged: true,
      rulesChanged: false,
      attributedTo: "source",
    })
    const agents = category(report, "agents")
    expect(agents.result).toBe("unchanged")
    expect(agents.cause).toEqual({
      sourceChanged: true,
      rulesChanged: false,
      attributedTo: "source",
    })
    expect(agents.files.semanticChanged).toEqual([])
    expect(agents.files.unchangedCount).toBe(6)
    // 来源版本变化只改写总索引；全部实体文件的字节、inode 与 mtime 保持不变。
    const after = await fingerprints(input.targetDirectory)
    expect(after["index.json"]).not.toEqual(before["index.json"])
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
  })

  it("reports a source traceability change while entity output stays unchanged", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    // 只在来源侧改动：详情文件追加空白（输入字节变化，输出不变），索引记录新增未知字段（sourceRecord 变化）。
    await fs.appendFile(
      join(input.rawRoot, input.version, "zh/character/10.json"),
      "\n  ",
    )
    await editJson(
      join(input.rawRoot, input.version, "character.json"),
      (value) => {
        value["2"].new_key = [0, ""]
      },
    )
    const result = await updateCurrentDataset(input)
    expect(result).toMatchObject({
      outcome: "committed",
      changedEntityFiles: 0,
      sourceChanged: true,
      rulesChanged: false,
      result: "changed",
      reviewRequired: true,
    })
    const report = await updateReport(input)
    const agents = category(report, "agents")
    // 实体输出完全不变：全部成员文件字节相同，没有文件级字段差异。
    expect(agents.files.semanticChanged).toEqual([])
    expect(agents.files.formatOnlyChanged).toEqual([])
    expect(agents.files.unchangedCount).toBe(6)
    expect(agents.fileChanges).toEqual([])
    // 成员状态含来源记录：只有 sourceRecord 变化的成员记为 changed，文件字节仍全部相同。
    expect(agents.members.changed).toEqual(["2"])
    expect(agents.members.unchanged).toEqual(["10"])
    // 来源记录变化仍然可见，即使实体输出没有变化。
    expect(agents.sourceRecords.changed).toEqual(["2"])
    expect(agents.sourceRecords.changes).toEqual([
      {
        memberId: "2",
        changes: [
          {
            pointer: "/new_key",
            change: "added",
            after: { kind: "array", length: 2 },
          },
          {
            pointer: "/new_key/0",
            change: "added",
            after: { kind: "number", value: 0 },
          },
          {
            pointer: "/new_key/1",
            change: "added",
            after: { kind: "string", value: "" },
          },
        ],
      },
    ])
    expect(
      report.source.inputs.map(({ resource, change }) => [resource, change]),
    ).toEqual([
      ["zzz/synthetic-1/character.json", "changed"],
      ["zzz/synthetic-1/zh/character/10.json", "changed"],
    ])
    expect(report.source.unchangedInputCount).toBe(4)
    expect(report.source.changed).toBe(true)
    expect(report.changeCause).toMatchObject({ attributedTo: "source" })
    expect(agents.review).toMatchObject({
      required: true,
      semanticChangedFiles: 0,
      changedSourceRecords: 1,
      removedFields: 0,
      changedFields: 0,
      addedFields: 3,
    })
    // 只有索引改变；实体文件的字节、inode 与 mtime 保持。
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
  })

  it("separates a rules-only change from source and rules changing together", async () => {
    const input = await fixture({ widgets: ["3"] })
    await generateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    const bumpedRules = [
      ...onboardedSnapshotEntities,
      { ...syntheticSnapshotEntity, rulesVersion: "widget-reference/2" },
    ]
    // 仅规则版本变化：来源未变、实体输出未改写，只登记规则版本变化。
    await updateCurrentDataset({ ...input, entities: bumpedRules })
    const rulesOnly = await updateReport(input)
    expect(rulesOnly.rules).toEqual({
      categories: [
        {
          name: "agents",
          before: "nanoka-agent-reference/4",
          after: "nanoka-agent-reference/4",
          changed: false,
        },
        {
          name: "widgets",
          before: "widget-reference/1",
          after: "widget-reference/2",
          changed: true,
        },
      ],
      changed: true,
    })
    expect(rulesOnly.source.changed).toBe(false)
    expect(rulesOnly.result).toBe("unchanged")
    expect(rulesOnly.changeCause).toEqual({
      sourceChanged: false,
      rulesChanged: true,
      attributedTo: "rules",
    })
    expect(category(rulesOnly, "widgets")).toMatchObject({
      result: "unchanged",
      rulesVersion: {
        before: "widget-reference/1",
        after: "widget-reference/2",
        changed: true,
      },
      cause: {
        sourceChanged: false,
        rulesChanged: true,
        attributedTo: "rules",
      },
    })
    const unchanged = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(unchanged[path]).toEqual(before[path])
    // 来源与规则同时变化：报告保留「字段差异不能唯一归因」这一不确定性。
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].label = "changed"
      },
    )
    await updateCurrentDataset({
      ...input,
      entities: [
        ...onboardedSnapshotEntities,
        { ...syntheticSnapshotEntity, rulesVersion: "widget-reference/3" },
      ],
    })
    const both = await updateReport(input)
    expect(both.source.changed).toBe(true)
    expect(both.rules.changed).toBe(true)
    expect(both.changeCause).toEqual({
      sourceChanged: true,
      rulesChanged: true,
      attributedTo: "undetermined",
    })
    const widgets = category(both, "widgets")
    expect(widgets.cause).toEqual({
      sourceChanged: true,
      rulesChanged: true,
      attributedTo: "undetermined",
    })
    expect(widgets.files.semanticChanged).toEqual(["widgets/3/data.json"])
    expect(widgets.fileChanges[0]!.changes).toEqual([
      {
        pointer: "/label",
        change: "changed",
        before: { kind: "string", value: "合成-3" },
        after: { kind: "string", value: "changed" },
      },
    ])
    expect(category(both, "agents").cause).toEqual({
      sourceChanged: false,
      rulesChanged: false,
      attributedTo: "neither",
    })
  })

  it("keeps the unchanged synthetic category explicitly checked when only the other changes", async () => {
    const input = await fixture({ widgets: ["3", "7"] })
    await generateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].label = "changed"
        value["3"].values = [2, 0, 1]
      },
    )
    const result = await updateCurrentDataset(input)
    expect(result.outcome).toBe("committed")
    expect(result.categories.agents).toMatchObject({
      checked: true,
      result: "unchanged",
      reviewRequired: false,
    })
    expect(result.categories.widgets).toMatchObject({
      checked: true,
      result: "changed",
      reviewRequired: true,
      sourceRecordsChanged: 1,
    })
    const report = await updateReport(input)
    const agents = category(report, "agents")
    expect(agents.result).toBe("unchanged")
    expect(agents.members.unchanged).toEqual(["2", "10"])
    expect(agents.review.required).toBe(false)
    const widgets = category(report, "widgets")
    expect(widgets.checked).toBe(true)
    expect(widgets.members).toMatchObject({
      beforeCount: 2,
      afterCount: 2,
      added: [],
      removed: [],
      changed: ["3"],
      unchanged: ["7"],
    })
    expect(widgets.files.semanticChanged).toEqual(["widgets/3/data.json"])
    expect(widgets.files.unchangedCount).toBe(5)
    expect(widgets.sourceRecords.changed).toEqual(["3"])
    expect(widgets.fileChanges).toEqual([
      {
        path: "widgets/3/data.json",
        memberId: "3",
        changes: [
          {
            pointer: "/label",
            change: "changed",
            before: { kind: "string", value: "合成-3" },
            after: { kind: "string", value: "changed" },
          },
          {
            pointer: "/values/0",
            change: "changed",
            before: { kind: "number", value: 1 },
            after: { kind: "number", value: 2 },
          },
          {
            pointer: "/values/2",
            change: "changed",
            before: { kind: "number", value: 2 },
            after: { kind: "number", value: 1 },
          },
        ],
      },
    ])
    expect(widgets.sourceRecords.changes).toEqual([
      {
        memberId: "3",
        changes: [
          {
            pointer: "/label",
            change: "changed",
            before: { kind: "string", value: "合成-3" },
            after: { kind: "string", value: "changed" },
          },
          {
            pointer: "/values/0",
            change: "changed",
            before: { kind: "number", value: 1 },
            after: { kind: "number", value: 2 },
          },
          {
            pointer: "/values/2",
            change: "changed",
            before: { kind: "number", value: 2 },
            after: { kind: "number", value: 1 },
          },
        ],
      },
    ])
    expect(widgets.review).toMatchObject({
      required: true,
      removedMembers: 0,
      removedFiles: 0,
      semanticChangedFiles: 1,
      changedSourceRecords: 1,
      removedFields: 0,
      changedFields: 6,
      addedFields: 0,
    })
    // 只有变化类别被改写：另一个类别连同索引以外的一切保持原 inode 与 mtime。
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && !file.startsWith("widgets/3/"),
    ))
      expect(after[path]).toEqual(before[path])
    expect(after["widgets/7/data.json"]).toEqual(before["widgets/7/data.json"])
  })

  it("reports member, file and field additions, changes and removals", async () => {
    const input = await fixture({ widgets: ["3", "7"] })
    await generateCurrentDataset(input)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10", "30"],
      widgetIds: ["3"],
    })
    await editJson(
      join(input.rawRoot, input.version, "zh/character/2.json"),
      (value) => {
        value.name = "changed"
        value.future_field = { inner: 1 }
      },
    )
    const result = await updateCurrentDataset(input)
    const added = await updateReport(input)
    expect(result.reviewRequired).toBe(true)
    expect(result.categories.agents.members.added).toBe(1)
    expect(result.categories.widgets.members.removed).toBe(1)
    const agents = category(added, "agents")
    expect(agents.members).toMatchObject({
      beforeCount: 2,
      afterCount: 3,
      added: ["30"],
      removed: [],
      changed: ["2"],
      unchanged: ["10"],
    })
    expect(agents.files.added).toEqual([
      "agents/30/data.json",
      "agents/30/details.zh.json",
      "agents/30/details.en.json",
    ])
    expect(agents.files.removed).toEqual([])
    expect(agents.files.semanticChanged).toEqual(["agents/2/details.zh.json"])
    expect(agents.fileChanges).toEqual([
      {
        path: "agents/2/details.zh.json",
        memberId: "2",
        changes: [
          {
            pointer: "/future_field",
            change: "added",
            after: { kind: "object", size: 1 },
          },
          {
            pointer: "/future_field/inner",
            change: "added",
            after: { kind: "number", value: 1 },
          },
          {
            pointer: "/name",
            change: "changed",
            before: { kind: "string", value: "示例" },
            after: { kind: "string", value: "changed" },
          },
        ],
      },
    ])
    expect(agents.review).toMatchObject({
      required: true,
      removedMembers: 0,
      removedFiles: 0,
      semanticChangedFiles: 1,
      changedSourceRecords: 0,
      removedFields: 0,
      changedFields: 1,
      addedFields: 2,
    })
    const widgets = category(added, "widgets")
    expect(widgets.members).toMatchObject({
      beforeCount: 2,
      afterCount: 1,
      added: [],
      removed: ["7"],
      changed: [],
      unchanged: ["3"],
    })
    expect(widgets.files.removed).toEqual([
      "widgets/7/data.json",
      "widgets/7/details.zh.json",
      "widgets/7/details.en.json",
    ])
    expect(widgets.review).toMatchObject({
      required: true,
      removedMembers: 1,
      removedFiles: 3,
      semanticChangedFiles: 0,
    })
    expect(added.result).toBe("changed")
    // 撤销一个既有字段：删除既有内容必须显著提示，并保留被删除的原值。
    await editJson(
      join(input.rawRoot, input.version, "zh/character/2.json"),
      (value) => {
        delete value.future_field
      },
    )
    await updateCurrentDataset(input)
    const removed = await updateReport(input)
    expect(category(removed, "agents").fileChanges).toEqual([
      {
        path: "agents/2/details.zh.json",
        memberId: "2",
        changes: [
          {
            pointer: "/future_field",
            change: "removed",
            before: { kind: "object", size: 1 },
          },
          {
            pointer: "/future_field/inner",
            change: "removed",
            before: { kind: "number", value: 1 },
          },
        ],
      },
    ])
    expect(category(removed, "agents").review).toMatchObject({
      required: true,
      semanticChangedFiles: 1,
      removedFields: 2,
      changedFields: 0,
      addedFields: 0,
    })
  })

  it("reports container type replacements in source records and existing entity files", async () => {
    const input = await fixture({ widgets: ["3"] })
    await generateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    // 来源记录中的容器类型替换：extra 不影响实体输出，实体文件必须完全不变。
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].extra = { rate: 1 }
      },
    )
    await updateCurrentDataset(input)
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].extra = [9, 11]
      },
    )
    await updateCurrentDataset(input)
    const report = await updateReport(input)
    const widgets = category(report, "widgets")
    // 父节点记录类型变化，旧容器内容按删除、新容器内容按新增逐条保留。
    expect(widgets.sourceRecords.changes).toEqual([
      {
        memberId: "3",
        changes: [
          {
            pointer: "/extra",
            change: "changed",
            before: { kind: "object", size: 1 },
            after: { kind: "array", length: 2 },
          },
          {
            pointer: "/extra/rate",
            change: "removed",
            before: { kind: "number", value: 1 },
          },
          {
            pointer: "/extra/0",
            change: "added",
            after: { kind: "number", value: 9 },
          },
          {
            pointer: "/extra/1",
            change: "added",
            after: { kind: "number", value: 11 },
          },
        ],
      },
    ])
    expect(widgets.fileChanges).toEqual([])
    expect(widgets.files.unchangedCount).toBe(3)
    expect(widgets.review).toMatchObject({
      required: true,
      changedSourceRecords: 1,
      semanticChangedFiles: 0,
      removedFields: 1,
      changedFields: 1,
      addedFields: 2,
    })
    // 实体侧只有索引改变，未变化实体文件的字节、inode 与 mtime 保持。
    const afterSourceRecord = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(afterSourceRecord[path]).toEqual(before[path])
    // 已有实体文件中的容器类型替换：合成第二类别的 values 由数组改成同大小对象。
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].values = { 0: 2, 1: 1, 2: 0 }
      },
    )
    await updateCurrentDataset(input)
    const replaced = await updateReport(input)
    const replacedWidgets = category(replaced, "widgets")
    const valueChanges = replacedWidgets.fileChanges.find(
      ({ path }) => path === "widgets/3/data.json",
    )?.changes
    expect(valueChanges).toEqual([
      {
        pointer: "/values",
        change: "changed",
        before: { kind: "array", length: 3 },
        after: { kind: "object", size: 3 },
      },
      {
        pointer: "/values/0",
        change: "removed",
        before: { kind: "number", value: 1 },
      },
      {
        pointer: "/values/1",
        change: "removed",
        before: { kind: "number", value: 0 },
      },
      {
        pointer: "/values/2",
        change: "removed",
        before: { kind: "number", value: 2 },
      },
      {
        pointer: "/values/0",
        change: "added",
        after: { kind: "number", value: 2 },
      },
      {
        pointer: "/values/1",
        change: "added",
        after: { kind: "number", value: 1 },
      },
      {
        pointer: "/values/2",
        change: "added",
        after: { kind: "number", value: 0 },
      },
    ])
    expect(replacedWidgets.files.semanticChanged).toEqual([
      "widgets/3/data.json",
    ])
    // 统计必须与实际条目一致：在这里直接按报告的条目重新计数核对。
    const records = [
      ...replacedWidgets.fileChanges.flatMap((entry) => entry.changes),
      ...replacedWidgets.sourceRecords.changes.flatMap(
        (entry) => entry.changes,
      ),
    ]
    const countOf = (change: string) =>
      records.filter((record) => record.change === change).length
    expect(replacedWidgets.review).toMatchObject({
      required: true,
      semanticChangedFiles: 1,
      removedFields: countOf("removed"),
      changedFields: countOf("changed"),
      addedFields: countOf("added"),
    })
    expect(countOf("changed")).toBe(2)
    expect(countOf("removed")).toBe(6)
    expect(countOf("added")).toBe(6)
    expect(replacedWidgets.sourceRecords.changes[0]!.changes).toEqual(
      valueChanges,
    )
  })

  it("separates formatting-only rewrites from semantic output changes", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    // 把既有实体文件重排成紧凑 JSON 并把实际字节摘要写回索引与管理记录：
    // 旧基线仍然完整合法，只有排版与 oxfmt 候选不同。
    const entityPath = join(input.targetDirectory, "agents/2/data.json")
    const value = JSON.parse(await fs.readFile(entityPath, "utf8"))
    await fs.writeFile(entityPath, JSON.stringify(value))
    const entitySha256 = digest(await fs.readFile(entityPath))
    await editJson(join(input.targetDirectory, "index.json"), (index) => {
      index.entities.agents.members["2"].files.data.sha256 = entitySha256
    })
    const indexSha256 = digest(
      await fs.readFile(join(input.targetDirectory, "index.json")),
    )
    await editJson(join(control(input), "state.json"), (state) => {
      state.current.indexSha256 = indexSha256
    })
    const result = await updateCurrentDataset(input)
    expect(result.outcome).toBe("committed")
    expect(result.result).toBe("format-only")
    expect(result.categories.agents).toMatchObject({
      result: "format-only",
      reviewRequired: false,
    })
    const report = await updateReport(input)
    expect(report.result).toBe("format-only")
    const agents = category(report, "agents")
    expect(agents.files.formatOnlyChanged).toEqual(["agents/2/data.json"])
    expect(agents.files.semanticChanged).toEqual([])
    expect(agents.fileChanges).toEqual([])
    expect(agents.members.changed).toEqual(["2"])
    expect(agents.review.required).toBe(false)
    // 纯格式变化不改变 JSON 值，重排后的文件仍是同一份数据。
    expect(JSON.parse(await fs.readFile(entityPath, "utf8"))).toEqual(value)
  })

  it("reports a legacy v2 baseline and a category added by the current registry", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    const entityBytes = await bytes(input.targetDirectory)
    // 把 v3 制品改写为 v2 外壳并登记旧协议稳定记录：实体文件与来源记录保持原值。
    await rewriteAsLegacyV2Artifact(input.targetDirectory)
    const state = JSON.parse(
      await fs.readFile(join(control(input), "state.json"), "utf8"),
    )
    await writeJson(join(control(input), "state.json"), {
      protocol: legacyProtocol,
      targetDirectory: input.targetDirectory,
      phase: "idle",
      current: {
        indexSha256: digest(
          await fs.readFile(join(input.targetDirectory, "index.json")),
        ),
        rulesVersion: "nanoka-agent-reference/4",
        policy: state.current.policy,
      },
    })
    expect(
      JSON.parse(
        await fs.readFile(join(input.targetDirectory, "index.json"), "utf8"),
      ).format,
    ).toBe(legacyV2Format)
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      format: legacyV2Format,
    })
    // 当前登记表新增合成第二类别，且来源版本已有它的完整输入。
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
      widgetIds: ["3"],
    })
    const result = await generateCurrentDataset({
      ...input,
      entities: [...onboardedSnapshotEntities, syntheticSnapshotEntity],
    })
    expect(result.outcome).toBe("committed")
    const report = await updateReport(input)
    expect(report.baseline).toEqual({
      kind: "snapshot",
      format: legacyV2Format,
      sourceVersion: input.version,
    })
    // 同一份来源内容只换了索引外壳：既有类别、成员与实体文件全部无变化，
    // 新增类别只以新增资源与新增成员/文件体现，既有来源材料没有摘要变化。
    expect(report.result).toBe("changed")
    expect(
      report.source.inputs.map(({ category: scope, resource, change }) => [
        scope,
        resource,
        change,
      ]),
    ).toEqual([
      ["widgets", "zzz/synthetic-1/equipment.json", "added"],
      ["widgets", "zzz/synthetic-1/zh/equipment/3.json", "added"],
      ["widgets", "zzz/synthetic-1/en/equipment/3.json", "added"],
    ])
    expect(report.source.changed).toBe(false)
    expect(category(report, "agents")).toMatchObject({
      checked: true,
      presence: "present",
      result: "unchanged",
    })
    expect(category(report, "agents").files.unchangedCount).toBe(6)
    const widgets = category(report, "widgets")
    expect(widgets).toMatchObject({
      checked: true,
      presence: "added",
      result: "changed",
      rulesVersion: {
        before: null,
        after: "widget-reference/1",
        changed: false,
      },
      cause: {
        sourceChanged: false,
        rulesChanged: false,
        attributedTo: "neither",
      },
    })
    expect(widgets.members.added).toEqual(["3"])
    expect(widgets.files.added).toEqual([
      "widgets/3/data.json",
      "widgets/3/details.zh.json",
      "widgets/3/details.en.json",
    ])
    expect(widgets.review.required).toBe(false)
    for (const [path, content] of Object.entries(entityBytes))
      if (path !== "index.json" && !path.startsWith("widgets/"))
        expect(await fs.readFile(join(input.targetDirectory, path))).toEqual(
          content,
        )
  })

  it("fails without reporting success or no change when new version inputs are missing or corrupt", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    const previousReport = await fs.readFile(reportPath(input))
    const before = await fingerprints(input.targetDirectory)
    // 缺失详情：不得解释为删除，也不得报告成功或无变化。
    await fs.rm(join(input.rawRoot, input.version, "en/character/10.json"))
    await expect(updateCurrentDataset(input)).rejects.toThrow("UPDATE_FAILED")
    await fs.rm(join(input.rawRoot, input.version, "zh/character/10.json"))
    // 损坏的新版输入：同样明确失败，并且不安装未提交候选的报告。
    await writeJson(join(input.rawRoot, "synthetic-2/manifest.json"), {
      zzz: {
        available: ["synthetic-2"],
        latest: "synthetic-2",
        live: "synthetic-2",
      },
    })
    await fs.writeFile(
      join(input.rawRoot, "synthetic-2/character.json"),
      "{not json",
    )
    input.version = "synthetic-2"
    await expect(generateCurrentDataset(input)).rejects.toThrow("UPDATE_FAILED")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(await fs.readFile(reportPath(input))).toEqual(previousReport)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
  })

  it("keeps the current data and report when report writing fails", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    await editJson(
      join(input.rawRoot, input.version, "zh/character/2.json"),
      (value) => {
        value.name = "changed"
      },
    )
    const before = await fingerprints(input.targetDirectory)
    const previousReport = await fs.readFile(reportPath(input))
    const write = fs.writeFile
    vi.spyOn(fs, "writeFile").mockImplementation((async (
      path: Parameters<typeof write>[0],
      data: Parameters<typeof write>[1],
      options?: Parameters<typeof write>[2],
    ) => {
      if (String(path) === join(control(input), "work/maintenance.json"))
        throw new Error("report unavailable")
      return write(path, data, options as never)
    }) as typeof write)
    await expect(updateCurrentDataset(input)).rejects.toThrow(
      /report unavailable/,
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(await fs.readFile(reportPath(input))).toEqual(previousReport)
    vi.restoreAllMocks()
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
    })
  })

  it("rejects an over-limit update report instead of truncating it", async () => {
    const input = await fixture({ widgets: ["3"] })
    // 大量数组元素顺序变化会生成同等规模的差异条目，报告因此远大于原始输入。
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].values = Array.from({ length: 6000 }, (_, index) => index)
      },
    )
    await generateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    const previousReport = await fs.readFile(reportPath(input))
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].values = (value["3"].values as number[]).toReversed()
      },
    )
    // 预算刚好覆盖原始输入，报告上限是它的 16 倍；完整报告仍然超限时必须失败。
    input.policy.fetchLimits.maximumBytesPerRun =
      (await rawByteTotal(input.rawRoot)) + 1
    await expect(updateCurrentDataset(input)).rejects.toThrow(
      /maintenance.json.*字节数超过上限/,
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(await fs.readFile(reportPath(input))).toEqual(previousReport)
    await expect(recoverCurrentDataset(input)).resolves.toMatchObject({
      outcome: "unchanged",
      available: true,
    })
  })

  it("keeps the report and the data consistent across process interruptions before and after commit", async () => {
    const input = await fixture()
    await generateCurrentDataset(input)
    const previousReport = await fs.readFile(reportPath(input))
    const before = await fingerprints(input.targetDirectory)
    await editJson(
      join(input.rawRoot, input.version, "zh/character/2.json"),
      (value) => {
        value.name = "changed"
      },
    )
    // 提交点之前中断：恢复回滚旧数据，报告仍是上次成功更新的那一份。
    const writer = await child(input, { mode: "update", pause: "prepared" })
    writer.process.kill("SIGKILL")
    expect((await writer.done).signal).toBe("SIGKILL")
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "rolled-back",
      available: true,
    })
    expect(await fs.readFile(reportPath(input))).toEqual(previousReport)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    // 提交点之后中断：恢复向前完成，已安装的报告描述刚提交的数据。
    const committed = await child(input, {
      mode: "update",
      pause: "new-installed",
    })
    committed.process.kill("SIGKILL")
    expect((await committed.done).signal).toBe("SIGKILL")
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "committed",
      available: true,
    })
    const report = await updateReport(input)
    expect(report.result).toBe("changed")
    expect(report.baseline).toEqual({
      kind: "snapshot",
      format: integratedSnapshotFormat,
      sourceVersion: input.version,
    })
    expect(category(report, "agents").fileChanges).toEqual([
      {
        path: "agents/2/details.zh.json",
        memberId: "2",
        changes: [
          {
            pointer: "/name",
            change: "changed",
            before: { kind: "string", value: "示例" },
            after: { kind: "string", value: "changed" },
          },
        ],
      },
    ])
    const verified = await withCurrentDataset(
      input.targetDirectory,
      async (directory, index) => ({
        index,
        bytes: await bytes(directory),
      }),
      { entities: input.entities },
    )
    expect(
      JSON.parse(verified.bytes["agents/2/details.zh.json"]!.toString()).name,
    ).toBe("changed")
    expect(verified.index.entities.agents.memberIds).toEqual(["2", "10"])
  })
})

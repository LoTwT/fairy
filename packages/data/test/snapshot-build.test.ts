import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { IntegratedSnapshotEntityContract } from "../scripts/nanoka-integration/snapshot-entities.ts"
import {
  nanokaAgentsSnapshotEntity,
  validateSnapshotEntityContracts,
} from "../scripts/nanoka-integration/snapshot-entities.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { outputExpansionLimit } from "../scripts/nanoka-integration/artifact-files.ts"
import { checkedPath, readBytes } from "../scripts/nanoka-integration/files.ts"
import { verifyIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-verify.ts"
import * as formatting from "../scripts/nanoka-integration/format.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import { agentInput } from "./fixtures/agent-source.ts"
import {
  syntheticEntityDetails,
  syntheticEntityRecord,
  syntheticSnapshotEntity,
} from "./fixtures/snapshot-entities.ts"

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
}))
vi.mock("../scripts/nanoka-integration/format.ts", async (original) => ({
  ...(await original<
    typeof import("../scripts/nanoka-integration/format.ts")
  >()),
}))

const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url))
const temporaryDirectories: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const path of temporaryDirectories.splice(0))
    await fs.rm(path, { force: true, recursive: true })
})

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex")

const expectedFiles = [
  "agents/10/data.json",
  "agents/10/details.en.json",
  "agents/10/details.zh.json",
  "agents/2/data.json",
  "agents/2/details.en.json",
  "agents/2/details.zh.json",
  "index.json",
  "widgets/9001/data.json",
  "widgets/9001/details.en.json",
  "widgets/9001/details.zh.json",
  "widgets/9002/data.json",
  "widgets/9002/details.en.json",
  "widgets/9002/details.zh.json",
].toSorted()

function checkFormatting(artifactDirectory: string) {
  return execFileSync(
    process.execPath,
    [
      join(workspaceRoot, "node_modules/oxfmt/bin/oxfmt"),
      "--check",
      "--config",
      join(workspaceRoot, "oxfmt.config.ts"),
      "--disable-nested-config",
      ...expectedFiles,
    ],
    { cwd: artifactDirectory, encoding: "utf8" },
  )
}

/** 测试侧只用于改写来源排列与构造篡改后的普通索引；不调用生产序列化生成预期。 */
function arranged(value: unknown, reverse = false): unknown {
  if (Array.isArray(value)) return value.map((item) => arranged(item, reverse))
  if (value && typeof value === "object") {
    const entries = Object.entries(value).toSorted(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )
    if (reverse) entries.reverse()
    return Object.fromEntries(
      entries.map(([key, item]) => [key, arranged(item, reverse)]),
    )
  }
  return value
}

async function write(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}

async function edit(path: string, change: (value: any) => void) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  change(value)
  await fs.writeFile(path, `${JSON.stringify(arranged(value), null, 2)}\n`)
}

async function allBytes(
  root: string,
  prefix = "",
): Promise<Record<string, Buffer>> {
  const result: Record<string, Buffer> = {}
  for (const entry of await fs.readdir(join(root, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(result, await allBytes(root, path))
    else result[path] = await fs.readFile(join(root, path))
  }
  return result
}

async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), "fairy-snapshot-build-test-"))
  temporaryDirectories.push(root)
  const rawRoot = join(root, "raw", "nanoka")
  const version = "synthetic-1"
  const versionRoot = join(rawRoot, version)
  const temporaryParent = join(root, "output")
  await fs.mkdir(temporaryParent)
  await write(join(versionRoot, "manifest.json"), {
    zzz: { live: version, latest: version, available: [version] },
  })
  const sourceRecord = agentInput().sourceRecord
  await write(join(versionRoot, "character.json"), {
    "10": sourceRecord,
    "2": sourceRecord,
  })
  for (const id of ["10", "2"])
    for (const locale of ["zh", "en"] as const)
      await write(join(versionRoot, locale, "character", `${id}.json`), {
        ...agentInput().details[locale],
        id: Number(id),
        code_name: locale === "zh" ? "中文原值" : "English value",
      })
  await write(join(versionRoot, "equipment.json"), {
    "9001": syntheticEntityRecord("9001"),
    "9002": syntheticEntityRecord("9002"),
  })
  for (const id of ["9001", "9002"])
    for (const locale of ["zh", "en"] as const)
      await write(
        join(versionRoot, locale, "equipment", `${id}.json`),
        syntheticEntityDetails(id, locale),
      )
  return {
    rawRoot,
    version,
    versionRoot,
    temporaryParent,
    policy: await loadSourcePolicy(),
    entities: [nanokaAgentsSnapshotEntity, syntheticSnapshotEntity],
  }
}

/** 只更新索引中该文件的摘要；用于证明身份或语言违规不能靠同步摘要掩盖。 */
async function syncDigest(artifactDirectory: string, filePath: string) {
  const bytes = await fs.readFile(join(artifactDirectory, filePath))
  await edit(join(artifactDirectory, "index.json"), (value) => {
    for (const category of Object.values(value.entities) as any[])
      for (const member of Object.values(category.members) as any[])
        for (const reference of [
          member.files.data,
          ...Object.values(member.files.details),
        ] as any[])
          if (reference.path === filePath) reference.sha256 = digest(bytes)
  })
}

describe("multi-entity snapshot build", () => {
  it("builds a complete two-category artifact with exact files and index", async () => {
    const options = await fixture()
    const rawBefore = await allBytes(options.rawRoot)
    const build = await buildIntegratedSnapshot(options)
    const bytes = await allBytes(build.artifactDirectory)
    expect(Object.keys(bytes).toSorted()).toEqual(expectedFiles)
    expect(build.outputFileCount).toBe(expectedFiles.length)
    expect(build.inputFileCount).toBe(1 + 5 + 5)
    expect(build.index.format).toBe("fairy-nanoka-integrated/v3")
    expect(build.index.source).toEqual({
      id: "nanoka-zzz",
      version: options.version,
      inputs: [
        {
          resource: "manifest.json",
          sha256: digest(
            await fs.readFile(join(options.versionRoot, "manifest.json")),
          ),
        },
      ],
    })
    expect(Object.keys(build.index.entities).toSorted()).toEqual([
      "agents",
      "widgets",
    ])
    expect(build.index.entities.agents).toMatchObject({
      rulesVersion: "nanoka-agent-reference/4",
      detailLocales: ["zh", "en"],
      complete: true,
      memberIds: ["2", "10"],
    })
    expect(build.index.entities.widgets).toMatchObject({
      rulesVersion: "widget-reference/1",
      detailLocales: ["zh", "en"],
      complete: true,
      memberIds: ["9001", "9002"],
    })
    let inputBytes = (await fs.stat(join(options.versionRoot, "manifest.json")))
      .size
    for (const [name, entity, memberIds] of [
      ["agents", "character", ["2", "10"]],
      ["widgets", "equipment", ["9001", "9002"]],
    ] as const) {
      const category = build.index.entities[name]!
      const resources = [
        `zzz/${options.version}/${entity}.json`,
        ...memberIds.flatMap((id) =>
          ["zh", "en"].map(
            (locale) => `zzz/${options.version}/${locale}/${entity}/${id}.json`,
          ),
        ),
      ]
      expect(category.inputs.map((input) => input.resource)).toEqual(resources)
      for (const [offset, resource] of resources.entries()) {
        const raw = await fs.readFile(
          join(
            options.versionRoot,
            resource.slice(`zzz/${options.version}/`.length),
          ),
        )
        inputBytes += raw.length
        expect(category.inputs[offset]!.sha256).toBe(digest(raw))
      }
      for (const memberId of memberIds) {
        const member = category.members[memberId]!
        expect(member.sourceRecord).toEqual(
          JSON.parse(
            await fs.readFile(
              join(
                options.versionRoot,
                `zzz/${options.version}/${entity}.json`.slice(
                  `zzz/${options.version}/`.length,
                ),
              ),
              "utf8",
            ),
          )[memberId],
        )
        const references = [
          member.files.data,
          member.files.details.zh,
          member.files.details.en,
        ]
        expect(references.map((reference) => reference.path)).toEqual([
          `${name}/${memberId}/data.json`,
          `${name}/${memberId}/details.zh.json`,
          `${name}/${memberId}/details.en.json`,
        ])
        for (const reference of references)
          expect(reference.sha256).toBe(digest(bytes[reference.path]!))
      }
    }
    expect(build.inputBytes).toBe(inputBytes)
    expect(build.maintenance.widgets).toEqual([
      { memberId: "9001", maintenance: { note: "widgets-9001" } },
      { memberId: "9002", maintenance: { note: "widgets-9002" } },
    ])
    expect(
      build.maintenanceReportPath.startsWith(build.artifactDirectory),
    ).toBe(false)
    expect(
      JSON.parse(await fs.readFile(build.maintenanceReportPath, "utf8")),
    ).toEqual({ categories: build.maintenance })
    expect(checkFormatting(build.artifactDirectory)).toContain(
      "All matched files use the correct format",
    )
    expect(
      await verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: options.policy,
        entities: options.entities,
        expectedIndex: build.index,
      }),
    ).toEqual(build.index)
    expect(await allBytes(options.rawRoot)).toEqual(rawBefore)
  })

  it("formats every file without changing JSON values and digests formatted bytes", async () => {
    const options = await fixture()
    const format = formatting.formatGeneratedJson
    const calls = vi
      .spyOn(formatting, "formatGeneratedJson")
      .mockImplementation(async (root, paths) => {
        const before = await Promise.all(
          paths.map((path) => fs.readFile(join(root, path))),
        )
        await format(root, paths)
        const after = await Promise.all(
          paths.map((path) => fs.readFile(join(root, path))),
        )
        for (const [offset, bytes] of after.entries()) {
          expect(JSON.parse(bytes.toString())).toEqual(
            JSON.parse(before[offset]!.toString()),
          )
          expect(JSON.stringify(JSON.parse(bytes.toString()))).toBe(
            JSON.stringify(JSON.parse(before[offset]!.toString())),
          )
        }
      })
    const build = await buildIntegratedSnapshot(options)
    expect(calls.mock.calls.map(([, paths]) => paths.length)).toEqual([6, 6, 1])
    const files = await allBytes(build.artifactDirectory)
    for (const category of Object.values(build.index.entities))
      for (const member of Object.values(category.members))
        for (const reference of [
          member.files.data,
          ...Object.values(member.files.details),
        ])
          expect(reference.sha256).toBe(digest(files[reference.path]!))
    expect(files["index.json"]!.at(-1)).toBe(10)
    expect(checkFormatting(build.artifactDirectory)).toContain(
      "All matched files use the correct format",
    )
  })

  it("rejects changed member values even when formatting succeeds", async () => {
    const options = await fixture()
    const format = formatting.formatGeneratedJson
    vi.spyOn(formatting, "formatGeneratedJson").mockImplementation(
      async (root, paths) => {
        await format(root, paths)
        if (paths.includes("widgets/9001/data.json"))
          await edit(join(root, "widgets/9001/data.json"), (value) => {
            value.values = [9, 9]
          })
      },
    )
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
      "格式化后的 JSON 值与整合结果不一致",
    )
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  const identityCases: [string, string, (value: any) => void][] = [
    ["data id", "widgets/9001/data.json", (value) => (value.id = 9002)],
    [
      "details id",
      "widgets/9001/details.en.json",
      (value) => (value.id = 9002),
    ],
    [
      "agents details id",
      "agents/2/details.en.json",
      (value) => (value.id = 10),
    ],
    [
      "details locale",
      "agents/2/details.en.json",
      (value) => (value.locale = "zh"),
    ],
    ["data locale", "agents/10/data.json", (value) => (value.locale = "zh")],
    ["absent data id", "widgets/9002/data.json", (value) => delete value.id],
  ]
  it.each(identityCases)(
    "rejects %s identity errors even with updated digests",
    async (_name, filePath, change) => {
      const options = await fixture()
      const build = await buildIntegratedSnapshot(options)
      await edit(join(build.artifactDirectory, filePath), change)
      await syncDigest(build.artifactDirectory, filePath)
      const expected =
        _name === "details locale" || _name === "data locale"
          ? "语言错误"
          : "身份错误"
      await expect(
        verifyIntegratedSnapshot({
          artifactDirectory: build.artifactDirectory,
          policy: options.policy,
          entities: options.entities,
        }),
      ).rejects.toThrow(expected)
    },
  )

  const indexEdits: [string, (index: any) => void, string][] = [
    [
      "member order",
      (index) => index.entities.agents.memberIds.reverse(),
      "成员须数值升序",
    ],
    [
      "member set",
      (index) => delete index.entities.agents.members["2"],
      "成员须数值升序",
    ],
    [
      "member duplication",
      (index) => index.entities.agents.memberIds.push("10"),
      "成员须数值升序",
    ],
    [
      "rules version",
      (index) =>
        (index.entities.agents.rulesVersion = "nanoka-agent-reference/3"),
      "规则版本错误",
    ],
    [
      "detail locales",
      (index) => (index.entities.agents.detailLocales = ["zh"]),
      "详情语言",
    ],
    [
      "completeness",
      (index) => (index.entities.agents.complete = false),
      "不是完整类别",
    ],
    [
      "source record",
      (index) => (index.entities.agents.members["2"].sourceRecord = "tampered"),
      "必须是普通对象",
    ],
    [
      "input order",
      (index) => index.entities.agents.inputs.reverse(),
      "资源路径、顺序或唯一性错误",
    ],
    [
      "snapshot input",
      (index) =>
        (index.source.inputs[0].resource = "zzz/synthetic-1/character.json"),
      "资源路径、顺序或唯一性错误",
    ],
    [
      "root version",
      (index) => (index.source.version = "other-version"),
      "资源路径、顺序或唯一性错误",
    ],
    [
      "file path",
      (index) =>
        (index.entities.agents.members["2"].files.data.path =
          "../agents/2/data.json"),
      "文件路径错误",
    ],
    [
      "absolute file path",
      (index) =>
        (index.entities.widgets.members["9001"].files.data.path =
          "/etc/passwd"),
      "文件路径错误",
    ],
    [
      "unknown field",
      (index) => (index.entities.agents.extra = true),
      "字段集合不一致",
    ],
  ]
  it.each(indexEdits)(
    "rejects inconsistent index %s",
    async (_name, change, message) => {
      const options = await fixture()
      const build = await buildIntegratedSnapshot(options)
      await edit(join(build.artifactDirectory, "index.json"), change)
      await expect(
        verifyIntegratedSnapshot({
          artifactDirectory: build.artifactDirectory,
          policy: options.policy,
          entities: options.entities,
        }),
      ).rejects.toThrow(message)
    },
  )

  const damages: [string, (root: string) => Promise<unknown>, string][] = [
    [
      "missing file",
      (root) => fs.rm(join(root, "widgets/9002/details.zh.json")),
      "ENOENT",
    ],
    [
      "extra file",
      (root) => fs.writeFile(join(root, "widgets/9002/extra.json"), "{}"),
      "未登记的文件或目录",
    ],
    [
      "extra directory",
      (root) => fs.mkdir(join(root, "agents/2/empty")),
      "未登记的文件或目录",
    ],
    [
      "symbolic link",
      async (root) => {
        await fs.rm(join(root, "widgets/9001/data.json"))
        await fs.symlink(
          join(root, "widgets/9002/data.json"),
          join(root, "widgets/9001/data.json"),
        )
      },
      "符号链接",
    ],
    [
      "damaged bytes",
      (root) => fs.appendFile(join(root, "agents/10/data.json"), " "),
      "摘要不一致",
    ],
    [
      "damaged json",
      async (root) => {
        await fs.writeFile(join(root, "widgets/9001/data.json"), "{")
        await syncDigest(root, "widgets/9001/data.json")
      },
      "不是有效 JSON",
    ],
  ]
  it.each(damages)(
    "rejects a file set with %s",
    async (_name, damage, message) => {
      const options = await fixture()
      const build = await buildIntegratedSnapshot(options)
      await damage(build.artifactDirectory)
      await expect(
        verifyIntegratedSnapshot({
          artifactDirectory: build.artifactDirectory,
          policy: options.policy,
          entities: options.entities,
        }),
      ).rejects.toThrow(message)
    },
  )

  it("accounts raw input bytes across categories instead of per category", async () => {
    const options = await fixture()
    const resources = {
      agents: [
        "manifest.json",
        "character.json",
        "zh/character/2.json",
        "en/character/2.json",
        "zh/character/10.json",
        "en/character/10.json",
      ],
      widgets: [
        "manifest.json",
        "equipment.json",
        "zh/equipment/9001.json",
        "en/equipment/9001.json",
        "zh/equipment/9002.json",
        "en/equipment/9002.json",
      ],
    }
    const bytesFor = async (paths: string[]) =>
      (
        await Promise.all(
          paths.map((path) => fs.stat(join(options.versionRoot, path))),
        )
      ).reduce((sum, stat) => sum + stat.size, 0)
    const agentsBytes = await bytesFor(resources.agents)
    const widgetsBytes = await bytesFor(resources.widgets)
    const manifestBytes = (
      await fs.stat(join(options.versionRoot, "manifest.json"))
    ).size
    const total = agentsBytes + widgetsBytes - manifestBytes
    // 正例：额度等于全部输入字节时构建通过，说明失败来自累计口径而不是单个文件。
    const complete = await buildIntegratedSnapshot({
      ...options,
      policy: {
        ...options.policy,
        fetchLimits: {
          ...options.policy.fetchLimits,
          maximumBytesPerRun: total,
        },
      },
    })
    expect(complete.inputBytes).toBe(total)
    // 额度取第一类别的实际字节：两个类别各自都在额度内，合计必须超限。
    expect(widgetsBytes).toBeLessThanOrEqual(agentsBytes)
    expect(agentsBytes).toBeLessThan(total)
    await expect(
      buildIntegratedSnapshot({
        ...options,
        policy: {
          ...options.policy,
          fetchLimits: {
            ...options.policy.fetchLimits,
            maximumBytesPerRun: agentsBytes,
          },
        },
      }),
    ).rejects.toThrow("原始输入字节合计超过上限")
  })

  const limitCases: [string, object, object, string][] = [
    ["per file bytes", { maximumResponseBytes: 100 }, {}, "字节数超过上限"],
    [
      "per category members",
      {},
      { maximumRecordsPerEntity: 1 },
      "记录数超过上限",
    ],
    [
      "cumulative resources",
      {},
      { maximumAssetsPerRun: 5 },
      "输入资源数超过上限",
    ],
  ]
  it.each(limitCases)(
    "enforces %s limits",
    async (_name, requestLimits, fetchLimits, message) => {
      const options = await fixture()
      await expect(
        buildIntegratedSnapshot({
          ...options,
          policy: {
            ...options.policy,
            requestPolicy: {
              ...options.policy.requestPolicy,
              ...requestLimits,
            },
            fetchLimits: { ...options.policy.fetchLimits, ...fetchLimits },
          },
        }),
      ).rejects.toThrow(message)
    },
  )

  it("applies the single file limit to the index and counts its bytes in the artifact", async () => {
    const options = await fixture()
    const build = await buildIntegratedSnapshot(options)
    const indexPath = join(build.artifactDirectory, "index.json")
    // 只让索引变大：来源记录允许任意原值，其余结构与文件保持合法。
    await edit(indexPath, (index) => {
      index.entities.agents.members["2"].sourceRecord.reviewProbe = "x".repeat(
        200_000,
      )
    })
    const indexSize = (await fs.stat(indexPath)).size
    const entitySizes = Object.entries(await allBytes(build.artifactDirectory))
      .filter(([path]) => path !== "index.json")
      .map(([, bytes]) => bytes.byteLength)
    // 单文件额度取“刚好容不下索引”的 16 字节倍数；实体文件仍全部在该额度内。
    const maximumResponseBytes = Math.floor((indexSize - 1) / 16)
    expect(Math.max(...entitySizes)).toBeLessThanOrEqual(
      maximumResponseBytes * 16,
    )
    const policyWith = (
      requestLimits: object,
      fetchLimits: object = {},
    ): typeof options.policy => ({
      ...options.policy,
      requestPolicy: { ...options.policy.requestPolicy, ...requestLimits },
      fetchLimits: { ...options.policy.fetchLimits, ...fetchLimits },
    })
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: policyWith({ maximumResponseBytes }),
        entities: options.entities,
      }),
    ).rejects.toThrow("index.json: 字节数超过上限")
    // 边界正例：额度刚好容纳索引（仍远小于整库上限）时，同一制品通过验证。
    const boundaryResponseBytes = Math.ceil(indexSize / 16)
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: policyWith({ maximumResponseBytes: boundaryResponseBytes }),
        entities: options.entities,
      }),
    ).resolves.toMatchObject({ format: "fairy-nanoka-integrated/v3" })
    // 索引字节仍计入整库累计输出预算：只够除索引以外全部字节时仍必须拒绝。
    const totalBytes =
      indexSize + entitySizes.reduce((sum, size) => sum + size, 0)
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: policyWith(
          { maximumResponseBytes: boundaryResponseBytes },
          {
            maximumBytesPerRun: Math.floor(
              (totalBytes - 1) / outputExpansionLimit,
            ),
          },
        ),
        entities: options.entities,
      }),
    ).rejects.toThrow("上限")
  })

  it("rejects cumulative count budgets from the index before reading entity files", async () => {
    const options = await fixture()
    const build = await buildIntegratedSnapshot(options)
    // 每类单独都在数量约束内（1 个索引 + 2 成员 × 2 语言 = 5），加根输入共 11 个资源。
    expect(build.inputFileCount).toBe(11)
    const open = vi.spyOn(fs, "open")
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: {
          ...options.policy,
          fetchLimits: {
            ...options.policy.fetchLimits,
            maximumAssetsPerRun: 6,
          },
        },
        entities: options.entities,
      }),
    ).rejects.toThrow("输入资源数超过上限")
    const opened = open.mock.calls.map(([path]) => String(path))
    // 观测真实文件读取：拒绝发生在打开任何实体文件之前，只读取了 index.json。
    expect(opened.filter((path) => path.endsWith("/index.json"))).toHaveLength(
      1,
    )
    expect(opened.filter((path) => !path.endsWith("/index.json"))).toEqual([])
    // 恰好等于上限时通过：数量预算本身不会阻止合法制品。
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: {
          ...options.policy,
          fetchLimits: {
            ...options.policy.fetchLimits,
            maximumAssetsPerRun: build.inputFileCount,
          },
        },
        entities: options.entities,
      }),
    ).resolves.toMatchObject({ format: "fairy-nanoka-integrated/v3" })
  })

  it.each(["member", "index"])(
    "enforces limits on final formatted %s bytes",
    async (kind) => {
      const options = await fixture()
      const policy = {
        ...options.policy,
        requestPolicy: {
          ...options.policy.requestPolicy,
          maximumResponseBytes: 10000,
        },
        fetchLimits: {
          ...options.policy.fetchLimits,
          maximumBytesPerRun: 20000,
        },
      }
      const format = formatting.formatGeneratedJson
      vi.spyOn(formatting, "formatGeneratedJson").mockImplementation(
        async (root, paths) => {
          await format(root, paths)
          if ((kind === "index") === paths.includes("index.json"))
            await fs.appendFile(join(root, paths[0]!), " ".repeat(320001))
        },
      )
      await expect(
        buildIntegratedSnapshot({ ...options, policy }),
      ).rejects.toThrow("上限")
      expect(await fs.readdir(options.temporaryParent)).toEqual([])
    },
  )

  it.each(["source record", "input digest", "output digest"])(
    "rejects a changed final index %s after write",
    async (kind) => {
      const options = await fixture()
      const originalWrite = fs.writeFile
      vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
        await originalWrite(...args)
        if (String(args[0]).endsWith("/index.json")) {
          const index = JSON.parse(await fs.readFile(args[0], "utf8"))
          if (kind === "source record")
            index.entities.agents.members["2"].sourceRecord.future = "tampered"
          else if (kind === "input digest")
            index.source.inputs[0].sha256 = "a".repeat(64)
          else
            index.entities.widgets.members["9001"].files.data.sha256 =
              "a".repeat(64)
          await originalWrite(
            args[0],
            `${JSON.stringify(arranged(index), null, 2)}\n`,
          )
        }
      })
      await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
        "与完整输入构建结果不一致",
      )
      expect(await fs.readdir(options.temporaryParent)).toEqual([])
    },
  )

  it("returns identical bytes and keeps array order across repeated builds", async () => {
    const options = await fixture()
    const first = await buildIntegratedSnapshot(options)
    const second = await buildIntegratedSnapshot(options)
    const firstBytes = await allBytes(first.artifactDirectory)
    expect(await allBytes(second.artifactDirectory)).toEqual(firstBytes)
    // 来源对象 key 顺序变化只改变原始输入摘要，不改变任何实体制品字节。
    const detailPath = join(options.versionRoot, "zh/character/2.json")
    await write(
      detailPath,
      arranged(JSON.parse(await fs.readFile(detailPath, "utf8")), true),
    )
    const reordered = await buildIntegratedSnapshot(options)
    const reorderedBytes = await allBytes(reordered.artifactDirectory)
    for (const memberPath of expectedFiles.filter(
      (path) => path !== "index.json",
    ))
      expect(reorderedBytes[memberPath], memberPath).toEqual(
        firstBytes[memberPath],
      )
    expect(reordered.index.entities.agents!.inputs[1]!.sha256).not.toBe(
      first.index.entities.agents!.inputs[1]!.sha256,
    )
    // 只有记录输入摘要的索引字节变化，实体文件字节不变。
    expect(reorderedBytes["index.json"]).not.toEqual(firstBytes["index.json"])
    // 数组顺序属于来源值：按原序保留，只影响对应成员的语言详情。
    await edit(join(options.versionRoot, "zh/character/2.json"), (value) =>
      value.skill["g/~"].description.reverse(),
    )
    const reversedNames = JSON.parse(
      await fs.readFile(
        join(options.versionRoot, "zh/character/2.json"),
        "utf8",
      ),
    ).skill["g/~"].description.map((entry: { name: string }) => entry.name)
    const reversedArray = await buildIntegratedSnapshot(options)
    const arrayBytes = await allBytes(reversedArray.artifactDirectory)
    expect(arrayBytes["agents/2/details.zh.json"]).not.toEqual(
      firstBytes["agents/2/details.zh.json"],
    )
    expect(arrayBytes["agents/2/data.json"]).toEqual(
      firstBytes["agents/2/data.json"],
    )
    expect(arrayBytes["agents/10/details.zh.json"]).toEqual(
      firstBytes["agents/10/details.zh.json"],
    )
    expect(
      JSON.parse(arrayBytes["agents/2/details.zh.json"]!.toString()).skill[
        "g/~"
      ].description.map((entry: { name: string }) => entry.name),
    ).toEqual(reversedNames)
    expect(
      JSON.parse(arrayBytes["agents/2/data.json"]!.toString())
        .classificationIds,
    ).toEqual({
      weaponType: ["2", "10"],
      elementType: ["203"],
      hitType: ["101"],
      camp: ["1"],
    })
  })

  it("rejects artifacts that omit an onboarded category or add an unknown one", async () => {
    const options = await fixture()
    const agentsOnly = await buildIntegratedSnapshot({
      ...options,
      entities: [nanokaAgentsSnapshotEntity],
    })
    // 代码新增类别后，旧快照仍能按原契约复验……
    const historical = await verifyIntegratedSnapshot({
      artifactDirectory: agentsOnly.artifactDirectory,
      policy: options.policy,
      entities: [nanokaAgentsSnapshotEntity],
    })
    expect(Object.keys(historical.entities)).toEqual(["agents"])
    // ……但不能作为满足当前完整类别要求的新候选。
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: agentsOnly.artifactDirectory,
        policy: options.policy,
        entities: options.entities,
      }),
    ).rejects.toThrow("类别集合与本次期望的已接入类别不一致")
    const twoCategories = await buildIntegratedSnapshot(options)
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: twoCategories.artifactDirectory,
        policy: options.policy,
      }),
    ).rejects.toThrow("类别集合与本次期望的已接入类别不一致")
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: twoCategories.artifactDirectory,
        policy: options.policy,
        entities: [syntheticSnapshotEntity, nanokaAgentsSnapshotEntity],
      }),
    ).resolves.toMatchObject({ format: "fairy-nanoka-integrated/v3" })
  })

  it("requires every registered category to verify member file identity", () => {
    expect(() =>
      validateSnapshotEntityContracts([
        {
          ...syntheticSnapshotEntity,
          verifyMemberFile: undefined,
        } as unknown as IntegratedSnapshotEntityContract,
      ]),
    ).toThrow("缺少成员文件身份检查")
    expect(() =>
      validateSnapshotEntityContracts([
        { ...syntheticSnapshotEntity, name: "Widgets" },
      ]),
    ).toThrow("类别登记名无效")
    expect(() =>
      validateSnapshotEntityContracts([
        syntheticSnapshotEntity,
        { ...nanokaAgentsSnapshotEntity, sourceEntity: "equipment" },
      ]),
    ).toThrow("已被其他类别使用")
    expect(() =>
      validateSnapshotEntityContracts([
        { ...syntheticSnapshotEntity, rulesVersion: "widgets" },
      ]),
    ).toThrow("规则版本无效")
    expect(() => validateSnapshotEntityContracts([])).toThrow(
      "已接入类别登记表不能为空",
    )
  })

  it("cleans only its owned directory after write failures", async () => {
    const options = await fixture()
    const originalWrite = fs.writeFile
    vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
      if (String(args[0]).endsWith("widgets/9002/data.json")) {
        await originalWrite(args[0], "partial", args[2])
        throw new Error("synthetic disk failure")
      }
      return originalWrite(...args)
    })
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
      "synthetic disk failure",
    )
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })
})

/** 维护报告按类别 → 成员分组；取出指定代理人成员的整合维护信息。 */
function agentMemberMaintenance(
  build: Awaited<ReturnType<typeof buildIntegratedSnapshot>>,
  memberId: string,
): {
  diagnostics: {
    entityId: string
    locale: string
    pointer: string
    kind: string
  }[]
  codeNameDifferences: {
    entityId: string
    locale: string
    pointer: string
    selectedLocale: string
    selectedValue: string
    value: string
  }[]
} {
  const entry = build.maintenance.agents?.find(
    (item) => item.memberId === memberId,
  )
  if (!entry) throw new Error(`维护报告缺少代理人成员 ${memberId}`)
  return entry.maintenance as ReturnType<typeof agentMemberMaintenance>
}

/**
 * v2 单实体构建器（scripts/nanoka-integration/build.ts）的输入侧与构建完整性回归。
 *
 * 断言含义与 v2 测试一致，但按多实体构建器的读取顺序、类别分块索引与按成员分组的维护报告改写；
 * 只用合成 raw 与独占临时目录，不读取真实缓存、不访问网络、不写入既有 integrated 数据集。
 */
describe("multi-entity snapshot build input-side coverage", () => {
  it("rejects a temporary parent inside the read-only raw root and keeps raw bytes", async () => {
    const options = await fixture()
    const before = await allBytes(options.rawRoot)
    for (const temporaryParent of [options.versionRoot, options.rawRoot]) {
      await expect(
        buildIntegratedSnapshot({ ...options, temporaryParent }),
      ).rejects.toThrow("只读 raw")
      expect(await allBytes(options.rawRoot)).toEqual(before)
    }
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  it("enforces streaming byte limits when a raw file grows after stat", async () => {
    const options = await fixture()
    const originalOpen = fs.open
    let grown = false
    vi.spyOn(fs, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args)
      const originalStat = handle.stat.bind(handle)
      vi.spyOn(handle, "stat").mockImplementation(async () => {
        const stat = await originalStat()
        // 只在句柄完成静态大小观察之后增长；读取必须继续受流式字节上限约束。
        if (!grown && String(args[0]).endsWith("/manifest.json")) {
          grown = true
          await fs.appendFile(
            join(options.versionRoot, "manifest.json"),
            " ".repeat(1000),
          )
        }
        return stat
      })
      return handle
    })
    const policy = {
      ...options.policy,
      requestPolicy: {
        ...options.policy.requestPolicy,
        maximumResponseBytes: 500,
      },
    }
    await expect(
      buildIntegratedSnapshot({ ...options, policy }),
    ).rejects.toThrow("字节数超过上限")
    expect(grown).toBe(true)
    // manifest 读取失败发生在创建构建目录之前，临时父目录保持为空。
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  it("uses one read for input decoding and digest even if raw changes immediately afterwards", async () => {
    const options = await fixture()
    const targetPath = join(options.versionRoot, "en/character/10.json")
    const originalBytes = await fs.readFile(targetPath)
    const originalOpen = fs.open
    let reads = 0
    vi.spyOn(fs, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args)
      if (String(args[0]).endsWith("synthetic-1/en/character/10.json")) {
        reads += 1
        const close = handle.close.bind(handle)
        vi.spyOn(handle, "close").mockImplementation(async () => {
          await close()
          await edit(targetPath, (value) => {
            value.code_name = "Changed after read"
          })
        })
      }
      return handle
    })
    const build = await buildIntegratedSnapshot(options)
    expect(reads).toBe(1)
    // 该资源是代理人类别最后一个输入；摘要必须描述已被解码的那一批字节。
    const inputs = build.index.entities.agents!.inputs
    expect(inputs.at(-1)!.sha256).toBe(digest(originalBytes))
    expect(inputs.at(-1)!.sha256).not.toBe(
      digest(await fs.readFile(targetPath)),
    )
    expect(
      agentMemberMaintenance(build, "10").codeNameDifferences.at(-1)!.value,
    ).toBe("English value")
  })

  it.each([
    "../outside.json",
    "/outside.json",
    "zh/../character.json",
    "zh\\character.json",
    "",
  ])("confines raw file reads to the version root: %s", async (path) => {
    const options = await fixture()
    const root = await fs.realpath(options.versionRoot)
    await expect(readBytes(root, path, 100)).rejects.toThrow(/路径/)
    await expect(checkedPath(root, path)).rejects.toThrow(/路径/)
    // 正例：规范相对路径仍被接受，拒绝来自路径规范而不是恒定失败。
    await expect(checkedPath(root, "zh/character/2.json")).resolves.toContain(
      "zh/character/2.json",
    )
  })

  it.each([
    "file link outside",
    "file link inside",
    "directory link",
    "version link",
    "directory file",
    "fifo",
  ])("rejects unsafe raw file kind: %s", async (kind) => {
    const options = await fixture()
    const path = join(options.versionRoot, "en/character/10.json")
    if (kind === "version link") {
      await fs.rename(options.versionRoot, join(options.rawRoot, "elsewhere"))
      await fs.symlink(join(options.rawRoot, "elsewhere"), options.versionRoot)
    } else if (kind === "directory link") {
      await fs.rename(
        join(options.versionRoot, "en"),
        join(options.rawRoot, "elsewhere"),
      )
      await fs.symlink(
        join(options.rawRoot, "elsewhere"),
        join(options.versionRoot, "en"),
      )
    } else {
      const bytes = await fs.readFile(path)
      await fs.rm(path)
      if (kind === "directory file") await fs.mkdir(path)
      else if (kind === "fifo") execFileSync("mkfifo", [path])
      else {
        const target =
          kind === "file link outside"
            ? join(options.temporaryParent, "outside.json")
            : join(options.versionRoot, "en/character/2.json")
        if (kind === "file link outside") await fs.writeFile(target, bytes)
        await fs.symlink(target, path)
      }
    }
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
      /符号链接|普通文件/,
    )
    // 只允许清理本次构建独占的目录；临时父目录不留任何构建残留（同用例自建的链接目标除外）。
    expect(
      (await fs.readdir(options.temporaryParent)).filter((name) =>
        name.startsWith("fairy-integrated-snapshot-"),
      ),
    ).toEqual([])
  })

  it("never fills missing details from another version or language", async () => {
    const options = await fixture()
    await fs.cp(options.versionRoot, join(options.rawRoot, "other-version"), {
      recursive: true,
    })
    await fs.rm(join(options.versionRoot, "en"), { recursive: true })
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
      "en/character/2.json",
    )
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  it.each(["manifest.json", "character.json", "en/character/10.json"])(
    "strictly decodes and validates every input kind: %s",
    async (resource) => {
      const options = await fixture()
      const path = join(options.versionRoot, resource)
      const original = await fs.readFile(path, "utf8")
      for (const [bytes, message] of [
        [Buffer.from([0x7b, 0x22, 0xc3, 0x28]), "UTF-8"],
        [Buffer.from('{"broken":'), "JSON"],
        ...["1e400", "9007199254740993", "-0"].map(
          (value) =>
            [
              Buffer.from(`{"bad/~":${value},${original.slice(1)}`),
              "非法数值",
            ] as const,
        ),
      ] as const) {
        await fs.writeFile(path, bytes)
        await expect(buildIntegratedSnapshot(options)).rejects.toThrow(message)
        expect(await fs.readdir(options.temporaryParent)).toEqual([])
      }
    },
  )

  it.each([
    ["empty", {}],
    ["array", []],
    ["noncanonical ID", { "02": {} }],
    ["traversal ID", { "../2": {} }],
    ["long ID", { ["1".repeat(33)]: {} }],
    ["member array", { "2": [] }],
    ["member null", { "2": null }],
    ["member scalar", { "2": 1 }],
  ])("rejects invalid source entity index: %s", async (_name, value) => {
    const options = await fixture()
    await write(join(options.versionRoot, "character.json"), value)
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
      "character.json",
    )
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  it.each([
    {},
    { zzz: { live: "x", latest: "x", available: [] } },
    { zzz: { live: "x", latest: "x", available: ["x", "x"] } },
    { zzz: { live: "x", latest: "x", available: ["x", "X"] } },
    { zzz: { live: "missing", latest: "x", available: ["x"] } },
    { zzz: { live: "x", latest: "x", available: ["x"] } },
  ])("rejects manifest or unavailable version %j", async (manifest) => {
    const options = await fixture()
    await write(join(options.versionRoot, "manifest.json"), manifest)
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow("manifest")
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  it("uses validated reversed configuration order for detailLocales, input order and codeName", async () => {
    const options = await fixture()
    const rawBefore = await allBytes(options.rawRoot)
    const build = await buildIntegratedSnapshot({
      ...options,
      policy: { ...options.policy, languages: ["en", "zh"] },
    })
    // 语言顺序贯穿全部类别：类别语言、详情读取顺序与索引登记顺序一致反转。
    expect(build.index.entities.agents!.detailLocales).toEqual(["en", "zh"])
    expect(build.index.entities.widgets!.detailLocales).toEqual(["en", "zh"])
    expect(
      build.index.entities
        .agents!.inputs.slice(1)
        .map((input) => input.resource),
    ).toEqual([
      "zzz/synthetic-1/en/character/2.json",
      "zzz/synthetic-1/zh/character/2.json",
      "zzz/synthetic-1/en/character/10.json",
      "zzz/synthetic-1/zh/character/10.json",
    ])
    expect(
      build.index.entities
        .widgets!.inputs.slice(1)
        .map((input) => input.resource),
    ).toEqual([
      "zzz/synthetic-1/en/equipment/9001.json",
      "zzz/synthetic-1/zh/equipment/9001.json",
      "zzz/synthetic-1/en/equipment/9002.json",
      "zzz/synthetic-1/zh/equipment/9002.json",
    ])
    const bytes = await allBytes(build.artifactDirectory)
    expect(JSON.parse(bytes["agents/2/data.json"]!.toString()).codeName).toBe(
      "English value",
    )
    expect(
      JSON.parse(bytes["agents/2/details.en.json"]!.toString()).locale,
    ).toBe("en")
    expect(agentMemberMaintenance(build, "2").codeNameDifferences[0]).toEqual({
      entityId: "2",
      locale: "zh",
      pointer: "/code_name",
      selectedLocale: "en",
      selectedValue: "English value",
      value: "中文原值",
    })
    // 顺序反转只改变读取顺序与取值特例，不改变 raw 字节。
    expect(await allBytes(options.rawRoot)).toEqual(rawBefore)
    // 已完成的构建目录归调用方所有；失败的语言配置不得再留下任何新目录。
    const afterSuccessfulBuild = await fs.readdir(options.temporaryParent)
    await expect(
      buildIntegratedSnapshot({
        ...options,
        policy: { ...options.policy, languages: ["zh"] },
      }),
    ).rejects.toThrow("来源配置无效")
    expect(await fs.readdir(options.temporaryParent)).toEqual(
      afterSuccessfulBuild,
    )
  })

  it("preserves a large unregistered diagnostic set within the source byte budgets", async () => {
    const options = await fixture()
    const unknownKeys = Array.from(
      { length: 5_000 },
      (_, index) => `unregistered_${index}`,
    )
    for (const locale of ["zh", "en"] as const) {
      const path = join(options.versionRoot, locale, "character", "2.json")
      await edit(path, (value) => {
        for (const key of unknownKeys) value[key] = 0
      })
      expect((await fs.stat(path)).size).toBeLessThan(
        options.policy.requestPolicy.maximumResponseBytes,
      )
    }
    const build = await buildIntegratedSnapshot(options)
    const maintenance = agentMemberMaintenance(build, "2")
    expect(maintenance.diagnostics).toHaveLength(unknownKeys.length * 2)
    const bytes = await allBytes(build.artifactDirectory)
    for (const locale of ["zh", "en"] as const) {
      // 诊断按配置语言与来源路径的确定性顺序排列。
      expect(
        maintenance.diagnostics
          .filter(
            (item) =>
              item.locale === locale &&
              item.pointer.startsWith("/unregistered_"),
          )
          .map((item) => item.pointer),
      ).toEqual(unknownKeys.toSorted().map((key) => `/${key}`))
      const details = JSON.parse(
        bytes[`agents/2/details.${locale}.json`]!.toString(),
      )
      expect(
        unknownKeys.every(
          (key) => Object.hasOwn(details, key) && details[key] === 0,
        ),
      ).toBe(true)
    }
    // 未注入未登记字段的成员没有对应诊断；诊断只登记位置，不猜测原值。
    expect(
      agentMemberMaintenance(build, "10").diagnostics.filter((item) =>
        item.pointer.startsWith("/unregistered_"),
      ),
    ).toEqual([])
    expect(build.inputBytes).toBeLessThan(
      options.policy.fetchLimits.maximumBytesPerRun,
    )
    expect(build.outputFileCount).toBe(expectedFiles.length)
    expect(
      JSON.parse(await fs.readFile(build.maintenanceReportPath, "utf8")),
    ).toEqual({ categories: build.maintenance })
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: options.policy,
        entities: options.entities,
      }),
    ).resolves.toMatchObject({ format: "fairy-nanoka-integrated/v3" })
  }, 30_000)

  it("keeps member content, own keys, codeName and maintenance counts exact", async () => {
    const options = await fixture()
    // 来源索引注入特殊自有 key；详情注入未登记字段，覆盖原值保留与诊断计数。
    await edit(join(options.versionRoot, "character.json"), (value) => {
      for (const record of Object.values(value) as Record<string, unknown>[]) {
        // 用定义自有属性写入，避免触发 __proto__ setter 或命中继承的 constructor。
        for (const key of ["__proto__", "constructor"] as const)
          Object.defineProperty(record, key, {
            value: { source_key: 0 },
            enumerable: true,
            configurable: true,
            writable: true,
          })
      }
    })
    for (const locale of ["zh", "en"] as const)
      await edit(
        join(options.versionRoot, locale, "character", "2.json"),
        (value) => {
          value.future_field = JSON.parse(
            '{"__proto__":null,"some_key":[0,"",null]}',
          )
        },
      )
    const build = await buildIntegratedSnapshot(options)
    const bytes = await allBytes(build.artifactDirectory)
    expect(Object.keys(bytes).toSorted()).toEqual(expectedFiles)
    // 规范键顺序由真实序列化决定；数组顺序保留。
    for (const fileBytes of Object.values(bytes)) {
      const value = JSON.parse(fileBytes.toString())
      expect(JSON.stringify(value)).toBe(JSON.stringify(arranged(value)))
    }
    for (const memberId of ["2", "10"]) {
      const member = build.index.entities.agents!.members[memberId]!
      expect(Object.hasOwn(member.sourceRecord, "__proto__")).toBe(true)
      expect(Object.hasOwn(member.sourceRecord, "constructor")).toBe(true)
      expect(member.sourceRecord.code_name).toBe("Index identity")
      expect(
        JSON.parse(bytes[`agents/${memberId}/data.json`]!.toString()).codeName,
      ).toBe("中文原值")
    }
    // 未登记字段的原值（含特殊自有 key 与数组顺序）保留在详情中。
    const details = JSON.parse(bytes["agents/2/details.en.json"]!.toString())
    expect(details).toMatchObject({
      id: 2,
      locale: "en",
      future_field: { some_key: [0, "", null] },
    })
    expect(Object.hasOwn(details.future_field, "__proto__")).toBe(true)
    expect(
      JSON.parse(bytes["agents/10/details.en.json"]!.toString()),
    ).not.toHaveProperty("future_field")
    // codeName 差异与诊断按成员分组，只写入制品外的维护报告。
    expect(build.maintenance.agents).toEqual([
      {
        memberId: "2",
        maintenance: {
          diagnostics: [
            {
              entityId: "2",
              locale: "zh",
              pointer: "/future_field",
              kind: "unknown-field",
            },
            {
              entityId: "2",
              locale: "en",
              pointer: "/future_field",
              kind: "unknown-field",
            },
          ],
          codeNameDifferences: [
            {
              entityId: "2",
              locale: "en",
              pointer: "/code_name",
              selectedLocale: "zh",
              selectedValue: "中文原值",
              value: "English value",
            },
          ],
        },
      },
      {
        memberId: "10",
        maintenance: {
          diagnostics: [],
          codeNameDifferences: [
            {
              entityId: "10",
              locale: "en",
              pointer: "/code_name",
              selectedLocale: "zh",
              selectedValue: "中文原值",
              value: "English value",
            },
          ],
        },
      },
    ])
    expect(
      build.maintenanceReportPath.startsWith(build.artifactDirectory),
    ).toBe(false)
    expect(
      JSON.parse(await fs.readFile(build.maintenanceReportPath, "utf8")),
    ).toEqual({ categories: build.maintenance })
    expect(build.outputFileCount).toBe(expectedFiles.length)
  })

  it.each(["agents/10/details.en.json", "index.json", "maintenance.json"])(
    "cleans only its owned directory and keeps an unrelated sibling: %s",
    async (failedPath) => {
      const options = await fixture()
      const sibling = join(options.temporaryParent, "unrelated")
      await fs.mkdir(sibling)
      await fs.writeFile(join(sibling, "keep"), "unrelated dataset")
      const originalWrite = fs.writeFile
      vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
        if (String(args[0]).endsWith(failedPath)) {
          await originalWrite(args[0], "partial", args[2])
          throw new Error("synthetic disk failure")
        }
        return originalWrite(...args)
      })
      await expect(buildIntegratedSnapshot(options)).rejects.toThrow(
        "synthetic disk failure",
      )
      // 成员文件、索引与维护报告三种写失败都只清理本次构建目录。
      expect(await fs.readdir(options.temporaryParent)).toEqual(["unrelated"])
      expect(await fs.readFile(join(sibling, "keep"), "utf8")).toBe(
        "unrelated dataset",
      )
    },
  )

  it("does not return success when post-write verification detects member damage", async () => {
    const options = await fixture()
    const format = formatting.formatGeneratedJson
    vi.spyOn(formatting, "formatGeneratedJson").mockImplementation(
      async (root, paths) => {
        await format(root, paths)
        if (paths.includes("index.json"))
          await fs.appendFile(join(root, "agents/10/data.json"), " ")
      },
    )
    // 成员文件在写入并登记摘要之后被破坏：整次构建必须失败，不能返回成功路径。
    await expect(buildIntegratedSnapshot(options)).rejects.toThrow("摘要不一致")
    expect(await fs.readdir(options.temporaryParent)).toEqual([])
  })

  it("keeps final LF and identical artifact bytes under an outer EditorConfig", async () => {
    const options = await fixture()
    const ordinaryParent = join(options.temporaryParent, "ordinary")
    const editorConfigParent = join(options.temporaryParent, "editorconfig")
    await fs.mkdir(ordinaryParent)
    await fs.mkdir(editorConfigParent)
    // 隔离测试宿主可能存在的配置，仅在第二个父目录禁止末尾换行。
    await fs.writeFile(join(ordinaryParent, ".editorconfig"), "root = true\n")
    await fs.writeFile(
      join(editorConfigParent, ".editorconfig"),
      "root = true\n[*]\ninsert_final_newline = false\n",
    )
    const ordinary = await buildIntegratedSnapshot({
      ...options,
      temporaryParent: ordinaryParent,
    })
    const withEditorConfig = await buildIntegratedSnapshot({
      ...options,
      temporaryParent: editorConfigParent,
    })
    const ordinaryBytes = await allBytes(ordinary.artifactDirectory)
    const editorConfigBytes = await allBytes(withEditorConfig.artifactDirectory)
    expect(Object.keys(editorConfigBytes).toSorted()).toEqual(expectedFiles)
    for (const path of expectedFiles) {
      expect(ordinaryBytes[path]!.at(-1), path).toBe(10)
      expect(editorConfigBytes[path]!.at(-1), path).toBe(10)
      expect(editorConfigBytes[path]!, path).toEqual(ordinaryBytes[path]!)
    }
    for (const build of [ordinary, withEditorConfig]) {
      const files = await allBytes(build.artifactDirectory)
      for (const category of Object.values(build.index.entities))
        for (const member of Object.values(category.members))
          for (const reference of [
            member.files.data,
            ...Object.values(member.files.details),
          ])
            expect(reference.sha256).toBe(digest(files[reference.path]!))
      await expect(
        verifyIntegratedSnapshot({
          artifactDirectory: build.artifactDirectory,
          policy: options.policy,
          entities: options.entities,
          expectedIndex: build.index,
        }),
      ).resolves.toEqual(build.index)
      expect(checkFormatting(build.artifactDirectory)).toContain(
        "All matched files use the correct format",
      )
    }
  }, 30_000)

  it("batch formats members and the index without changing JSON values or key order", async () => {
    const options = await fixture()
    const format = formatting.formatGeneratedJson
    const calls = vi
      .spyOn(formatting, "formatGeneratedJson")
      .mockImplementation(async (root, paths) => {
        const before = await Promise.all(
          paths.map((path) => fs.readFile(join(root, path))),
        )
        await format(root, paths)
        const after = await Promise.all(
          paths.map((path) => fs.readFile(join(root, path))),
        )
        // 排版不是空操作：每一批都必须至少改变一个文件的字节。
        expect(
          after.some((bytes, offset) => !bytes.equals(before[offset]!)),
        ).toBe(true)
        for (const [offset, bytes] of after.entries()) {
          expect(JSON.parse(bytes.toString())).toEqual(
            JSON.parse(before[offset]!.toString()),
          )
          expect(JSON.stringify(JSON.parse(bytes.toString()))).toBe(
            JSON.stringify(JSON.parse(before[offset]!.toString())),
          )
        }
      })
    const build = await buildIntegratedSnapshot(options)
    // 两个类别的成员文件各自成批，索引单独一批。
    expect(calls.mock.calls.map(([, paths]) => paths.length)).toEqual([6, 6, 1])
    const files = await allBytes(build.artifactDirectory)
    for (const category of Object.values(build.index.entities))
      for (const member of Object.values(category.members))
        for (const reference of [
          member.files.data,
          ...Object.values(member.files.details),
        ])
          expect(reference.sha256).toBe(digest(files[reference.path]!))
    expect(files["index.json"]!.at(-1)).toBe(10)
    expect(checkFormatting(build.artifactDirectory)).toContain(
      "All matched files use the correct format",
    )
  })

  const budgetCases: [string, object, string][] = [
    ["records", { maximumRecordsPerEntity: 1 }, "记录数超过上限"],
    ["resources", { maximumAssetsPerRun: 5 }, "输入资源数超过上限"],
  ]
  it.each(budgetCases)(
    "rejects the %s budget before opening any detail file",
    async (_name, fetchLimits, message) => {
      const options = await fixture()
      const open = vi.spyOn(fs, "open")
      const mkdtemp = vi.spyOn(fs, "mkdtemp")
      await expect(
        buildIntegratedSnapshot({
          ...options,
          policy: {
            ...options.policy,
            fetchLimits: { ...options.policy.fetchLimits, ...fetchLimits },
          },
        }),
      ).rejects.toThrow(message)
      const opened = open.mock.calls.map(([path]) => String(path))
      // 观测有效：类别索引确实已被读取；被拒绝的是尚未开始的详情读取。
      expect(opened.some((path) => path.endsWith("character.json"))).toBe(true)
      expect(opened.filter((path) => path.includes("/character/"))).toEqual([])
      // 与 v2 不同：manifest 必须先读取，构建目录在预算检查之前创建，随后被整体清理。
      expect(mkdtemp).toHaveBeenCalledTimes(1)
      expect(await fs.readdir(options.temporaryParent)).toEqual([])
    },
  )
})

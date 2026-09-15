import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { buildNanokaAgents } from "../scripts/nanoka-integration/build.ts"
import { readBytes } from "../scripts/nanoka-integration/files.ts"
import { verifyNanokaAgentArtifact } from "../scripts/nanoka-integration/verify.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import { agentInput } from "./fixtures/agent-source.ts"

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
}))

const temporaryDirectories: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const path of temporaryDirectories.splice(0))
    await fs.rm(path, { force: true, recursive: true })
})

async function write(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}

async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), "fairy-agent-build-test-"))
  temporaryDirectories.push(root)
  const rawRoot = join(root, "raw", "nanoka")
  const temporaryParent = join(root, "output")
  await fs.mkdir(temporaryParent)
  await fs.mkdir(join(temporaryParent, "integrated", "nanoka"), {
    recursive: true,
  })
  await fs.writeFile(
    join(temporaryParent, "integrated", "nanoka", "keep"),
    "existing dataset",
  )
  const version = "synthetic-1"
  const versionRoot = join(rawRoot, version)
  await write(join(versionRoot, "manifest.json"), {
    zzz: { live: version, latest: version, available: [version] },
  })
  const record = {
    ...agentInput().sourceRecord,
    ...JSON.parse('{"__proto__":{"source_key":0},"future_field":["z","a"]}'),
  }
  await write(join(versionRoot, "character.json"), {
    "10": record,
    "2": record,
  })
  for (const id of ["10", "2"]) {
    const details = agentInput().details
    for (const locale of ["zh", "en"] as const) {
      await write(join(versionRoot, locale, "character", `${id}.json`), {
        ...details[locale],
        id: Number(id),
        code_name: locale === "zh" ? "中文原值" : "English value",
        future_field: JSON.parse('{"__proto__":null,"some_key":[0,"",null]}'),
      })
    }
  }
  return {
    rawRoot,
    version,
    temporaryParent,
    versionRoot,
    policy: await loadSourcePolicy(),
  }
}

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
]
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

// 测试侧只用于改写来源排列与构造篡改后的普通索引；不调用生产序列化生成预期。
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
async function edit(
  path: string,
  change: (value: any) => void,
  canonical = false,
) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  change(value)
  await fs.writeFile(
    path,
    canonical
      ? `${JSON.stringify(arranged(value), null, 2)}\n`
      : JSON.stringify(value),
  )
}

async function preserved(options: Awaited<ReturnType<typeof fixture>>) {
  expect(await fs.readdir(options.temporaryParent)).toEqual(["integrated"])
  expect(
    await fs.readFile(
      join(options.temporaryParent, "integrated/nanoka/keep"),
      "utf8",
    ),
  ).toBe("existing dataset")
}

describe("offline full Nanoka agent build", () => {
  it("infers verification rules from the expected index while respecting an explicit override", async () => {
    const build = await buildNanokaAgents(await fixture())
    const expectedIndex = {
      ...build.index,
      rulesVersion: "nanoka-agent-reference/3" as const,
    }
    await edit(
      join(build.artifactDirectory, "index.json"),
      (value) => {
        value.rulesVersion = expectedIndex.rulesVersion
      },
      true,
    )
    await expect(
      verifyNanokaAgentArtifact({
        artifactDirectory: build.artifactDirectory,
        expectedIndex,
      }),
    ).resolves.toEqual(expectedIndex)
    await expect(
      verifyNanokaAgentArtifact({ artifactDirectory: build.artifactDirectory }),
    ).rejects.toThrow("规则版本错误")
    await expect(
      verifyNanokaAgentArtifact({
        artifactDirectory: build.artifactDirectory,
        expectedIndex,
        rulesVersion: "nanoka-agent-reference/4",
      }),
    ).rejects.toThrow("规则版本错误")
  })

  it("builds every indexed member and configured language with independent byte digests", async () => {
    const options = await fixture()
    await fs.writeFile(
      join(options.versionRoot, "zh/character/999.json"),
      "broken old cache",
    )
    const rawBefore = await allBytes(options.rawRoot)
    const result = await buildNanokaAgents(options)
    expect(result.index.scope).toEqual({
      kind: "full-index",
      agentIds: ["2", "10"],
      completeDataset: true,
    })
    expect(result.index.format).toBe("fairy-nanoka-integrated/v2")
    expect(result.index.rulesVersion).toBe("nanoka-agent-reference/4")
    expect(result.index.source.detailLocales).toEqual(["zh", "en"])
    expect(result.inputFileCount).toBe(6)
    expect(result.outputFileCount).toBe(7)
    const bytes = await allBytes(result.artifactDirectory)
    expect(Object.keys(bytes).toSorted()).toEqual(expectedFiles)
    // 当前合成输入的 key 均可由此独立排序表达规范格式；不调用生产序列化器生成预期。
    for (const fileBytes of Object.values(bytes)) {
      const expected = `${JSON.stringify(arranged(JSON.parse(fileBytes.toString())), null, 2)}\n`
      expect(fileBytes.toString()).toBe(expected)
    }
    const resources = [
      "manifest.json",
      "zzz/synthetic-1/character.json",
      "zzz/synthetic-1/zh/character/2.json",
      "zzz/synthetic-1/en/character/2.json",
      "zzz/synthetic-1/zh/character/10.json",
      "zzz/synthetic-1/en/character/10.json",
    ]
    expect(result.index.source.inputs.map((entry) => entry.resource)).toEqual(
      resources,
    )
    let inputBytes = 0
    for (const [offset, resource] of resources.entries()) {
      const path =
        resource === "manifest.json"
          ? resource
          : resource.slice("zzz/synthetic-1/".length)
      const raw = await fs.readFile(join(options.versionRoot, path))
      inputBytes += raw.length
      expect(result.index.source.inputs[offset]).toEqual({
        resource,
        sha256: digest(raw),
      })
    }
    expect(result.inputBytes).toBe(inputBytes)
    for (const id of ["2", "10"]) {
      const agent = result.index.agents[id]
      expect(agent.sourceRecord).toEqual(
        JSON.parse(
          await fs.readFile(
            join(options.versionRoot, "character.json"),
            "utf8",
          ),
        )[id],
      )
      expect(Object.hasOwn(agent.sourceRecord, "__proto__")).toBe(true)
      for (const reference of [
        agent.files.stats,
        agent.files.content.zh,
        agent.files.content.en,
      ]) {
        expect(reference.sha256).toBe(digest(bytes[reference.path]))
        expect(bytes[reference.path].at(-1)).toBe(10)
      }
      expect(
        JSON.parse(bytes[`agents/${id}/data.json`].toString()).codeName,
      ).toBe("中文原值")
      expect(
        JSON.parse(bytes[`agents/${id}/details.en.json`].toString()),
      ).toMatchObject({
        id: Number(id),
        locale: "en",
        future_field: { some_key: [0, "", null] },
      })
    }
    expect(result.maintenance.codeNameDifferences).toHaveLength(2)
    expect(result.maintenance.diagnostics).toHaveLength(4)
    expect(
      result.maintenanceReportPath.startsWith(result.artifactDirectory),
    ).toBe(false)
    expect(
      JSON.parse(await fs.readFile(result.maintenanceReportPath, "utf8")),
    ).toEqual(result.maintenance)
    expect(await allBytes(options.rawRoot)).toEqual(rawBefore)
    expect(
      await verifyNanokaAgentArtifact({
        artifactDirectory: result.artifactDirectory,
      }),
    ).toEqual(result.index)
  })

  it("preserves a large diagnostic set within the source byte budgets", async () => {
    const options = await fixture()
    const unknownKeys = Array.from(
      { length: 70_000 },
      (_, index) => `unregistered_${index}`,
    )
    for (const locale of ["zh", "en"] as const) {
      const path = join(options.versionRoot, `${locale}/character/2.json`)
      await edit(path, (value) => {
        for (const key of unknownKeys) value[key] = 0
      })
      expect((await fs.stat(path)).size).toBeLessThan(
        options.policy.requestPolicy.maximumResponseBytes,
      )
    }
    const result = await buildNanokaAgents(options)
    expect(result.maintenance.diagnostics).toHaveLength(140_004)
    for (const locale of ["zh", "en"] as const) {
      const diagnostics = result.maintenance.diagnostics.filter(
        (item) =>
          item.entityId === "2" &&
          item.locale === locale &&
          item.pointer.startsWith("/unregistered_"),
      )
      expect(diagnostics.map((item) => item.pointer)).toEqual(
        unknownKeys.toSorted().map((key) => `/${key}`),
      )
      const details = JSON.parse(
        await fs.readFile(
          join(result.artifactDirectory, `agents/2/details.${locale}.json`),
          "utf8",
        ),
      )
      expect(
        unknownKeys.every(
          (key) => Object.hasOwn(details, key) && details[key] === 0,
        ),
      ).toBe(true)
    }
    expect(result.inputBytes).toBeLessThan(
      options.policy.fetchLimits.maximumBytesPerRun,
    )
    expect(result.outputFileCount).toBe(7)
    expect(
      JSON.parse(await fs.readFile(result.maintenanceReportPath, "utf8")),
    ).toEqual(result.maintenance)
  }, 30_000)

  it("repeats identical bytes and keeps entity bytes stable when raw whitespace/key order changes", async () => {
    const options = await fixture()
    const first = await buildNanokaAgents(options)
    const second = await buildNanokaAgents(options)
    expect(first.artifactDirectory).not.toBe(second.artifactDirectory)
    const original = await allBytes(first.artifactDirectory)
    expect(await allBytes(second.artifactDirectory)).toEqual(original)
    for (const [path, bytes] of Object.entries(
      await allBytes(options.versionRoot),
    )) {
      await fs.writeFile(
        join(options.versionRoot, path),
        `  ${JSON.stringify(arranged(JSON.parse(bytes.toString()), true), null, 3)}\n\n`,
      )
    }
    const third = await buildNanokaAgents(options)
    const changed = await allBytes(third.artifactDirectory)
    for (const path of expectedFiles.filter((file) => file !== "index.json"))
      expect(changed[path]).toEqual(original[path])
    expect(changed["index.json"]).not.toEqual(original["index.json"])
    for (const [offset, input] of third.index.source.inputs.entries()) {
      expect(input.sha256).not.toBe(first.index.source.inputs[offset].sha256)
      const path =
        input.resource === "manifest.json"
          ? input.resource
          : input.resource.slice("zzz/synthetic-1/".length)
      expect(input.sha256).toBe(
        digest(await fs.readFile(join(options.versionRoot, path))),
      )
    }
    expect(await fs.readFile(third.maintenanceReportPath)).toEqual(
      await fs.readFile(first.maintenanceReportPath),
    )
  })

  it("uses validated reversed configuration order for codeName and input registration", async () => {
    const options = await fixture()
    options.policy.languages = ["en", "zh"]
    const result = await buildNanokaAgents(options)
    expect(result.index.source.detailLocales).toEqual(["en", "zh"])
    expect(
      result.index.source.inputs.slice(2).map((input) => input.resource),
    ).toEqual([
      "zzz/synthetic-1/en/character/2.json",
      "zzz/synthetic-1/zh/character/2.json",
      "zzz/synthetic-1/en/character/10.json",
      "zzz/synthetic-1/zh/character/10.json",
    ])
    expect(
      JSON.parse(
        await fs.readFile(
          join(result.artifactDirectory, "agents/2/data.json"),
          "utf8",
        ),
      ).codeName,
    ).toBe("English value")
    expect(result.maintenance.codeNameDifferences[0]).toEqual({
      entityId: "2",
      locale: "zh",
      pointer: "/code_name",
      selectedLocale: "en",
      selectedValue: "English value",
      value: "中文原值",
    })
    options.policy.languages = ["zh"]
    await expect(buildNanokaAgents(options)).rejects.toThrow("来源配置无效")
  })

  it.each([
    ["empty", {}],
    ["array", []],
    ["noncanonical ID", { "02": {} }],
    ["traversal ID", { "../2": {} }],
    ["long ID", { ["1".repeat(33)]: {} }],
    ["member array", { "2": [] }],
    ["member null", { "2": null }],
    ["member scalar", { "2": 1 }],
  ])("rejects invalid index: %s", async (_name, value) => {
    const options = await fixture()
    await write(join(options.versionRoot, "character.json"), value)
    await expect(buildNanokaAgents(options)).rejects.toThrow("character.json")
    await preserved(options)
  })

  it.each([
    "missing",
    "wrong identity",
    "missing identity",
    "missing field",
    "wrong shape",
    "shared conflict",
  ])("rejects detail: %s after earlier member succeeded", async (kind) => {
    const options = await fixture()
    const path = join(options.versionRoot, "en/character/10.json")
    if (kind === "missing") await fs.rm(path)
    else
      await edit(path, (value) => {
        if (kind === "wrong identity") value.id = 2
        if (kind === "missing identity") delete value.id
        if (kind === "missing field") delete value.code_name
        if (kind === "wrong shape") value.partner_info = []
        if (kind === "shared conflict") value.stats.armor = 1
      })
    await expect(buildNanokaAgents(options)).rejects.toThrow(
      /zzz\/synthetic-1\/en\/character\/10.json/,
    )
    await preserved(options)
  })

  it("never fills missing details from other versions or languages", async () => {
    const options = await fixture()
    await fs.cp(options.versionRoot, join(options.rawRoot, "other-version"), {
      recursive: true,
    })
    await fs.rm(join(options.versionRoot, "en"), { recursive: true })
    await expect(buildNanokaAgents(options)).rejects.toThrow(
      "en/character/2.json",
    )
    await preserved(options)
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
    await expect(buildNanokaAgents(options)).rejects.toThrow("manifest")
    await preserved(options)
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
        await expect(buildNanokaAgents(options)).rejects.toThrow(message)
        await preserved(options)
      }
    },
  )

  it.each(["single bytes", "total bytes", "records", "resources"])(
    "enforces source resource budget: %s",
    async (kind) => {
      const options = await fixture()
      if (kind === "single bytes")
        options.policy.requestPolicy.maximumResponseBytes = 10
      if (kind === "total bytes")
        options.policy.fetchLimits.maximumBytesPerRun = 5000
      if (kind === "records")
        options.policy.fetchLimits.maximumRecordsPerEntity = 1
      if (kind === "resources")
        options.policy.fetchLimits.maximumAssetsPerRun = 5
      await expect(buildNanokaAgents(options)).rejects.toThrow("上限")
      await preserved(options)
    },
  )

  it.each(["records", "resources"])(
    "rejects %s budget before reading details or creating output",
    async (kind) => {
      const options = await fixture()
      if (kind === "records")
        options.policy.fetchLimits.maximumRecordsPerEntity = 1
      else options.policy.fetchLimits.maximumAssetsPerRun = 5
      const open = vi.spyOn(fs, "open")
      const mkdtemp = vi.spyOn(fs, "mkdtemp")
      await expect(buildNanokaAgents(options)).rejects.toThrow()
      expect(
        open.mock.calls.some(([path]) => String(path).includes("/character/")),
      ).toBe(false)
      expect(mkdtemp).not.toHaveBeenCalled()
      await preserved(options)
    },
  )

  it.each(["../synthetic-1", "/synthetic-1", "x/y", "", "x\\y"])(
    "rejects unsafe explicit version %s",
    async (version) => {
      const options = await fixture()
      await expect(buildNanokaAgents({ ...options, version })).rejects.toThrow(
        "版本号不安全",
      )
      await preserved(options)
    },
  )

  it.each([
    "../outside.json",
    "/outside.json",
    "zh/../character.json",
    "zh\\character.json",
  ])("confines file reads: %s", async (path) => {
    const options = await fixture()
    await expect(
      readBytes(await fs.realpath(options.versionRoot), path, 100),
    ).rejects.toThrow(/路径/)
  })

  it.each([
    "file link outside",
    "file link inside",
    "directory link",
    "version link",
    "directory file",
    "fifo",
  ])("rejects unsafe file kind: %s", async (kind) => {
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
    await expect(buildNanokaAgents(options)).rejects.toThrow(
      /符号链接|普通文件/,
    )
    expect(
      (await fs.readdir(options.temporaryParent)).filter((name) =>
        name.startsWith("fairy-nanoka-agents-"),
      ),
    ).toEqual([])
  })

  it("uses one read for input decoding and digest even if raw changes immediately afterwards", async () => {
    const options = await fixture()
    const originalPath = join(options.versionRoot, "en/character/10.json")
    const originalBytes = await fs.readFile(originalPath)
    const originalOpen = fs.open
    let reads = 0
    vi.spyOn(fs, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args)
      if (String(args[0]).endsWith("synthetic-1/en/character/10.json")) {
        reads += 1
        const close = handle.close.bind(handle)
        vi.spyOn(handle, "close").mockImplementation(async () => {
          await close()
          await edit(originalPath, (value) => {
            value.code_name = "Changed after read"
          })
        })
      }
      return handle
    })
    const result = await buildNanokaAgents(options)
    expect(reads).toBe(1)
    expect(result.index.source.inputs.at(-1)?.sha256).toBe(
      digest(originalBytes),
    )
    expect(result.index.source.inputs.at(-1)?.sha256).not.toBe(
      digest(await fs.readFile(originalPath)),
    )
    expect(result.maintenance.codeNameDifferences.at(-1)?.value).toBe(
      "English value",
    )
  })

  it("rejects an output parent inside the read-only raw boundary", async () => {
    const options = await fixture()
    const before = await allBytes(options.rawRoot)
    await expect(
      buildNanokaAgents({ ...options, temporaryParent: options.versionRoot }),
    ).rejects.toThrow("只读 raw")
    expect(await allBytes(options.rawRoot)).toEqual(before)
  })

  it("runs the explicit workspace entry with synthetic files and no network", async () => {
    const options = await fixture()
    const preloadPath = join(options.temporaryParent, "offline.mjs")
    await fs.writeFile(
      preloadPath,
      "globalThis.fetch = () => { throw new Error('unexpected network') }",
    )
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        preloadPath,
        "scripts/build-nanoka-agents.ts",
        options.rawRoot,
        options.version,
        options.temporaryParent,
      ],
      { encoding: "utf8" },
    )
    const receipt = JSON.parse(output)
    expect(receipt.agentCount).toBe(2)
    expect(receipt.inputFileCount).toBe(6)
    expect(receipt.outputFileCount).toBe(7)
    expect(
      (
        await verifyNanokaAgentArtifact({
          artifactDirectory: receipt.artifactDirectory,
        })
      ).scope.agentIds,
    ).toEqual(["2", "10"])
  })

  it("enforces streaming limits when a file grows after stat", async () => {
    const options = await fixture()
    const originalOpen = fs.open
    vi.spyOn(fs, "open").mockImplementation(async (...args) => {
      const handle = await originalOpen(...args)
      const originalStat = handle.stat.bind(handle)
      vi.spyOn(handle, "stat").mockImplementation(async () => {
        const stat = await originalStat()
        await fs.appendFile(
          join(options.versionRoot, "manifest.json"),
          " ".repeat(1000),
        )
        return stat
      })
      return handle
    })
    await expect(
      readBytes(await fs.realpath(options.versionRoot), "manifest.json", 500),
    ).rejects.toThrow("上限")
  })

  it.each(["agents/10/details.en.json", "index.json", "maintenance.json"])(
    "cleans only its owned directory after write failure: %s",
    async (failedPath) => {
      const options = await fixture()
      const originalWrite = fs.writeFile
      vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
        if (String(args[0]).endsWith(failedPath)) {
          await originalWrite(args[0], "partial", args[2])
          throw new Error("synthetic disk failure")
        }
        return originalWrite(...args)
      })
      await expect(buildNanokaAgents(options)).rejects.toThrow(
        "synthetic disk failure",
      )
      await preserved(options)
    },
  )

  it("rejects a changed final index source record after write", async () => {
    const options = await fixture()
    const originalWrite = fs.writeFile
    vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
      await originalWrite(...args)
      if (String(args[0]).endsWith("/index.json")) {
        const index = JSON.parse(await fs.readFile(args[0], "utf8"))
        index.agents["2"].sourceRecord.future_field = ["tampered"]
        await originalWrite(
          args[0],
          `${JSON.stringify(arranged(index), null, 2)}\n`,
        )
      }
    })
    await expect(buildNanokaAgents(options)).rejects.toThrow(
      "与完整输入构建结果不一致",
    )
    await preserved(options)
  })

  it("does not return success when post-write verification detects damage", async () => {
    const options = await fixture()
    const originalWrite = fs.writeFile
    vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
      await originalWrite(...args)
      if (String(args[0]).endsWith("agents/10/data.json"))
        await fs.appendFile(args[0], " ")
    })
    await expect(buildNanokaAgents(options)).rejects.toThrow("摘要不一致")
    await preserved(options)
  })
})

describe("complete artifact verifier", () => {
  it.each(["data", "zh", "en", "all"])(
    "accepts reserialized %s files with updated digests",
    async (selection) => {
      const options = await fixture()
      const result = await buildNanokaAgents(options)
      const index = structuredClone(result.index)
      for (const agent of Object.values(index.agents)) {
        const references =
          selection === "all"
            ? [agent.files.stats, ...Object.values(agent.files.content)]
            : [
                selection === "data"
                  ? agent.files.stats
                  : agent.files.content[selection as "zh" | "en"],
              ]
        for (const reference of references) {
          const path = join(result.artifactDirectory, reference.path)
          const original = JSON.parse(await fs.readFile(path, "utf8"))
          const bytes = Buffer.from(
            `${JSON.stringify(arranged(original, true))}\n`,
          )
          expect(JSON.parse(bytes.toString())).toEqual(original)
          await fs.writeFile(path, bytes)
          reference.sha256 = digest(bytes)
        }
      }
      await fs.writeFile(
        join(result.artifactDirectory, "index.json"),
        `${JSON.stringify(arranged(index), null, 2)}\n`,
      )
      expect(
        await verifyNanokaAgentArtifact({
          artifactDirectory: result.artifactDirectory,
        }),
      ).toEqual(index)
    },
  )

  it.each([undefined, 4])(
    "accepts reserialized index with indentation %s",
    async (indentation) => {
      const result = await buildNanokaAgents(await fixture())
      await fs.writeFile(
        join(result.artifactDirectory, "index.json"),
        `${JSON.stringify(arranged(result.index, true), null, indentation)}\n`,
      )
      expect(
        await verifyNanokaAgentArtifact({
          artifactDirectory: result.artifactDirectory,
        }),
      ).toEqual(result.index)
      await expect(
        verifyNanokaAgentArtifact({
          artifactDirectory: result.artifactDirectory,
          expectedIndex: result.index,
        }),
      ).rejects.toThrow("与完整输入构建结果不一致")
    },
  )

  it("rejects reserialized entity bytes when the digest is not updated", async () => {
    const result = await buildNanokaAgents(await fixture())
    const path = join(result.artifactDirectory, "agents/2/details.en.json")
    await edit(path, () => {})
    await expect(
      verifyNanokaAgentArtifact({
        artifactDirectory: result.artifactDirectory,
      }),
    ).rejects.toThrow("摘要不一致")
  })

  it.each([
    "missing",
    "tampered",
    "wrong path",
    "absolute path",
    "wrong identity",
    "wrong locale",
    "extra file",
    "extra entity",
    "extra empty directory",
    "maintenance",
    "symlink",
    "missing index",
    "index bytes",
    "input duplicate",
    "input pointer",
    "input hash",
    "member order",
    "member duplicate",
    "member mismatch",
    "languages",
    "complete",
    "record type",
    "extra index field",
  ])("rejects %s", async (kind) => {
    const options = await fixture()
    const result = await buildNanokaAgents(options)
    const root = result.artifactDirectory
    const indexPath = join(root, "index.json")
    const detailPath = join(root, "agents/10/details.en.json")
    if (kind === "missing") await fs.rm(detailPath)
    else if (kind === "tampered") await fs.appendFile(detailPath, " ")
    else if (kind === "missing index") await fs.rm(indexPath)
    else if (kind === "index bytes")
      await fs.writeFile(indexPath, Buffer.from([0xff]))
    else if (kind === "symlink") {
      await fs.rm(detailPath)
      await fs.symlink(join(root, "agents/2/details.en.json"), detailPath)
    } else if (["extra file", "extra entity", "maintenance"].includes(kind)) {
      await write(
        join(
          root,
          kind === "extra file"
            ? "agents/10/extra.json"
            : kind === "extra entity"
              ? "agents/999/data.json"
              : "maintenance.json",
        ),
        {},
      )
    } else if (kind === "extra empty directory")
      await fs.mkdir(join(root, "unexpected"))
    else {
      if (kind === "wrong identity" || kind === "wrong locale") {
        await edit(
          detailPath,
          (value) => {
            if (kind === "wrong identity") value.id = 2
            else value.locale = "zh"
          },
          true,
        )
      }
      const detailDigest = digest(await fs.readFile(detailPath))
      await edit(
        indexPath,
        (index) => {
          if (kind === "wrong path")
            index.agents["10"].files.content.en.path = "../escape.json"
          if (kind === "absolute path")
            index.agents["10"].files.content.en.path = detailPath
          if (kind === "wrong identity" || kind === "wrong locale")
            index.agents["10"].files.content.en.sha256 = detailDigest
          if (kind === "input duplicate")
            index.source.inputs[3] = index.source.inputs[2]
          if (kind === "input pointer") index.source.inputs[1].pointer = "/2"
          if (kind === "input hash")
            index.source.inputs[0].sha256 = "A".repeat(64)
          if (kind === "member order") index.scope.agentIds.reverse()
          if (kind === "member duplicate")
            index.scope.agentIds = ["2", "2", "10"]
          if (kind === "member mismatch") delete index.agents["10"]
          if (kind === "languages") index.source.detailLocales.reverse()
          if (kind === "complete") index.scope.completeDataset = false
          if (kind === "record type") index.agents["2"].sourceRecord = []
          if (kind === "extra index field") index.maintenance = {}
        },
        true,
      )
    }
    await expect(
      verifyNanokaAgentArtifact({ artifactDirectory: root }),
    ).rejects.toThrow()
  })
})

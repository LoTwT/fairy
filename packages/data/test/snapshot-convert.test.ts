import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import { convertNanokaAgentsArtifactToSnapshot } from "../scripts/nanoka-integration/snapshot-convert.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { nanokaAgentsSnapshotEntity } from "../scripts/nanoka-integration/snapshot-entities.ts"
import { verifyIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-verify.ts"
import { agentInput } from "./fixtures/agent-source.ts"
import { rewriteAsLegacyV2Artifact } from "./fixtures/synthetic-dataset.ts"

const temporaryDirectories: string[] = []
afterEach(async () => {
  for (const path of temporaryDirectories.splice(0))
    await fs.rm(path, { force: true, recursive: true })
})

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex")

async function write(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}

async function edit(path: string, change: (value: any) => void) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  change(value)
  await fs.writeFile(path, JSON.stringify(value))
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

/** 合成 raw 与已完整验证的 v2 制品；不读取真实 raw，也不接触真实 integrated。 */
async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), "fairy-snapshot-convert-test-"))
  temporaryDirectories.push(root)
  const rawRoot = join(root, "raw", "nanoka")
  const version = "synthetic-1"
  const versionRoot = join(rawRoot, version)
  const temporaryParent = join(root, "output")
  const outputParent = join(root, "conversion")
  await fs.mkdir(temporaryParent)
  await fs.mkdir(outputParent)
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
  const policy = await loadSourcePolicy()
  const build = await buildIntegratedSnapshot({
    rawRoot,
    version,
    temporaryParent,
    policy,
    // v2 外壳只描述单一代理人制品：转换链路显式使用 agents-only 登记表，不含生产 drive-discs 类别。
    entities: [nanokaAgentsSnapshotEntity],
  })
  // 合成 v2 静态制品：v3 构建结果改写索引外壳，成员文件与摘要保持原字节。
  const artifactDirectory = join(root, "source-artifact")
  await fs.rename(build.artifactDirectory, artifactDirectory)
  await fs.rm(build.buildDirectory, { recursive: true })
  await rewriteAsLegacyV2Artifact(artifactDirectory)
  const index = JSON.parse(
    await fs.readFile(join(artifactDirectory, "index.json"), "utf8"),
  )
  return {
    root,
    rawRoot,
    versionRoot,
    outputParent,
    policy,
    source: { artifactDirectory, index },
  }
}

describe("v2 agent artifact conversion", () => {
  it("converts without changing entity bytes, source records or the input", async () => {
    const options = await fixture()
    const sourceBytes = await allBytes(options.source.artifactDirectory)
    const sourceStats = new Map<string, number>()
    for (const path of Object.keys(sourceBytes))
      sourceStats.set(
        path,
        (await fs.stat(join(options.source.artifactDirectory, path))).mtimeMs,
      )
    const conversion = await convertNanokaAgentsArtifactToSnapshot({
      artifactDirectory: options.source.artifactDirectory,
      outputParent: options.outputParent,
      policy: options.policy,
    })
    // 输入制品逐字节、逐 mtime 不变；转换结果写在独占新目录。
    expect(await allBytes(options.source.artifactDirectory)).toEqual(
      sourceBytes,
    )
    for (const path of Object.keys(sourceBytes))
      expect(
        (await fs.stat(join(options.source.artifactDirectory, path))).mtimeMs,
        path,
      ).toBe(sourceStats.get(path))
    expect(
      conversion.artifactDirectory.startsWith(options.source.artifactDirectory),
    ).toBe(false)
    expect(conversion.memberCount).toBe(2)
    expect(conversion.outputFileCount).toBe(7)
    expect(conversion.inputFileCount).toBe(
      options.source.index.source.inputs.length,
    )
    // 实体文件逐字节相同，来源索引记录原值保留。
    const convertedBytes = await allBytes(conversion.artifactDirectory)
    expect(
      Object.keys(convertedBytes)
        .toSorted()
        .filter((path) => path !== "index.json"),
    ).toEqual(
      Object.keys(sourceBytes)
        .toSorted()
        .filter((path) => path !== "index.json"),
    )
    for (const [path, bytes] of Object.entries(convertedBytes))
      if (path !== "index.json") expect(bytes, path).toEqual(sourceBytes[path])
    const sourceIndex = options.source.index
    expect(conversion.index).toMatchObject({
      format: "fairy-nanoka-integrated/v3",
      source: {
        id: "nanoka-zzz",
        version: sourceIndex.source.version,
        inputs: [sourceIndex.source.inputs[0]!],
      },
    })
    expect(Object.keys(conversion.index.entities)).toEqual(["agents"])
    const agents = conversion.index.entities.agents!
    expect(agents.rulesVersion).toBe(sourceIndex.rulesVersion)
    expect(agents.detailLocales).toEqual(sourceIndex.source.detailLocales)
    expect(agents.complete).toBe(true)
    expect(agents.memberIds).toEqual(sourceIndex.scope.agentIds)
    expect(agents.inputs).toEqual(sourceIndex.source.inputs.slice(1))
    for (const id of sourceIndex.scope.agentIds) {
      const member = agents.members[id]!
      const original = sourceIndex.agents[id]!
      expect(member.sourceRecord).toEqual(original.sourceRecord)
      expect(member.files.data).toEqual(original.files.stats)
      expect(member.files.details).toEqual(original.files.content)
      for (const reference of [
        member.files.data,
        ...Object.values(member.files.details),
      ])
        expect(reference.sha256).toBe(digest(convertedBytes[reference.path]!))
    }
    expect(
      await verifyIntegratedSnapshot({
        artifactDirectory: conversion.artifactDirectory,
        policy: options.policy,
        entities: [nanokaAgentsSnapshotEntity],
        expectedIndex: conversion.index,
      }),
    ).toEqual(conversion.index)
  })

  it("rejects an output parent inside the input artifact, including path aliases", async () => {
    const options = await fixture()
    const inside = join(options.source.artifactDirectory, "nested")
    await fs.mkdir(inside)
    await expect(
      convertNanokaAgentsArtifactToSnapshot({
        artifactDirectory: options.source.artifactDirectory,
        outputParent: inside,
        policy: options.policy,
      }),
    ).rejects.toThrow("输出父目录不能位于输入制品目录内")
    const alias = join(options.root, "alias")
    await fs.symlink(options.source.artifactDirectory, alias)
    await expect(
      convertNanokaAgentsArtifactToSnapshot({
        artifactDirectory: options.source.artifactDirectory,
        outputParent: alias,
        policy: options.policy,
      }),
    ).rejects.toThrow("输出父目录不能位于输入制品目录内")
    await fs.rm(inside, { recursive: true })
    expect(
      (await fs.readdir(options.source.artifactDirectory)).toSorted(),
    ).toEqual(["agents", "index.json"])
    expect(await fs.readdir(options.outputParent)).toEqual([])
  })

  const unsupported: [
    string,
    (options: Awaited<ReturnType<typeof fixture>>) => Promise<void>,
    string?,
  ][] = [
    [
      "v3 format",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.format = "fairy-nanoka-integrated/v3"
        }),
      "格式版本错误",
    ],
    [
      "other agent rules",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.rulesVersion = "nanoka-agent-reference/5"
        }),
      "规则版本错误",
    ],
    [
      "historical agent rules",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.rulesVersion = "nanoka-agent-reference/3"
        }),
      "规则版本错误",
    ],
    [
      "single agent example",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.scope.kind = "single-agent-example"
          index.scope.completeDataset = false
        }),
      "不是完整数据集",
    ],
    [
      "language subset",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.source.detailLocales = ["en"]
        }),
      "详情语言",
    ],
    [
      "excerpted input",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.source.inputs[1].pointer = "/2"
        }),
      "字段集合不一致",
    ],
    [
      "missing member file",
      async ({ source }) =>
        fs.rm(join(source.artifactDirectory, "agents/2/details.zh.json")),
      "ENOENT",
    ],
    [
      "changed member bytes",
      async ({ source }) =>
        fs.appendFile(
          join(source.artifactDirectory, "agents/10/data.json"),
          " ",
        ),
      "摘要不一致",
    ],
    [
      "changed recorded digest",
      async ({ source }) =>
        edit(join(source.artifactDirectory, "index.json"), (index) => {
          index.agents["2"].files.stats.sha256 = "a".repeat(64)
        }),
      "摘要不一致",
    ],
    [
      "symbolic link",
      async ({ source }) => {
        await fs.rm(join(source.artifactDirectory, "agents/2/data.json"))
        await fs.symlink(
          join(source.artifactDirectory, "agents/10/data.json"),
          join(source.artifactDirectory, "agents/2/data.json"),
        )
      },
      "符号链接",
    ],
    [
      "damaged index",
      async ({ source }) =>
        fs.writeFile(join(source.artifactDirectory, "index.json"), "{"),
      "不是有效 JSON",
    ],
  ]
  it.each(unsupported)(
    "rejects unsupported or damaged input: %s",
    async (_name, damage, reason) => {
      const options = await fixture()
      await damage(options)
      const rejection = convertNanokaAgentsArtifactToSnapshot({
        artifactDirectory: options.source.artifactDirectory,
        outputParent: options.outputParent,
        policy: options.policy,
      })
      await expect(rejection).rejects.toThrow(
        "输入制品未通过 v2 完整验证，不执行转换",
      )
      if (reason) await expect(rejection).rejects.toThrow(reason)
      expect(await fs.readdir(options.outputParent)).toEqual([])
    },
  )
})

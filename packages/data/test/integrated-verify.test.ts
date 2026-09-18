import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { IntegratedSnapshotEntityProducer } from "../scripts/nanoka-integration/snapshot-entities.ts"
import { nanokaAgentsSnapshotEntity } from "../scripts/nanoka-integration/snapshot-entities.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { verifyIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-verify.ts"
import { verifyNanokaAgentArtifact } from "../scripts/nanoka-integration/verify.ts"
import type {
  SourcePolicy,
  SupportedLanguage,
} from "../scripts/nanoka/policy.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import { syntheticSnapshotEntity } from "./fixtures/snapshot-entities.ts"
import {
  rewriteAsLegacyV2Artifact,
  writeSyntheticRaw,
} from "./fixtures/synthetic-dataset.ts"

/**
 * 两个验证器的结构拒绝与重新序列化接受范围。
 *
 * v2 外壳（verifyNanokaAgentArtifact）仍在显式迁移与旧数据集复验中使用，v3 完整制品
 * （verifyIntegratedSnapshot）是新链条的验证器；两者都必须只按索引值、实际字节与文件集合判断，
 * 不把排版或序列化方式当作证据。全部输入为合成来源，不读取真实 raw 与 integrated，也不访问网络。
 *
 * 这些用例关注摘要、身份与文件集合等结构边界，不验证格式化本身：构建器仍走生产序列化、
 * 摘要计算与完整复验，只是把 oxfmt 调用替换为确定性的空操作，避免每个 fixture 都启动格式化子进程。
 * 真实 oxfmt 调用、格式化后数据保真与发布链路由 snapshot-build.test.ts 与打包验收继续覆盖。
 */
vi.mock("../scripts/nanoka-integration/format.ts", () => ({
  formatGeneratedJson: async () => {},
}))

const temporaryDirectories: string[] = []
afterEach(async () => {
  for (const path of temporaryDirectories.splice(0))
    await fs.rm(path, { force: true, recursive: true })
})

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex")

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

async function readJson(path: string): Promise<any> {
  return JSON.parse(await fs.readFile(path, "utf8"))
}

/** canonical 为真时按排序后的 key、两空格缩进写入，用于构造与制品排版不同的索引或成员文件。 */
async function edit(
  path: string,
  change: (value: any) => void,
  canonical = false,
) {
  const value = await readJson(path)
  change(value)
  await fs.writeFile(
    path,
    canonical
      ? `${JSON.stringify(arranged(value), null, 2)}\n`
      : JSON.stringify(value),
  )
}

async function fixture(options: { widgets?: boolean } = {}) {
  const root = await fs.mkdtemp(join(tmpdir(), "fairy-integrated-verify-test-"))
  temporaryDirectories.push(root)
  const rawRoot = join(root, "raw", "nanoka")
  const version = "synthetic-1"
  const temporaryParent = join(root, "output")
  await fs.mkdir(temporaryParent)
  await writeSyntheticRaw({
    rawRoot,
    version,
    agentIds: ["2", "10"],
    widgetIds: options.widgets ? ["9001", "9002"] : [],
  })
  return {
    rawRoot,
    version,
    temporaryParent,
    policy: await loadSourcePolicy(),
    entities: (options.widgets
      ? [nanokaAgentsSnapshotEntity, syntheticSnapshotEntity]
      : [
          nanokaAgentsSnapshotEntity,
        ]) as readonly IntegratedSnapshotEntityProducer[],
  }
}

type Fixture = Awaited<ReturnType<typeof fixture>>

function buildSnapshot(
  options: Fixture,
  entities: readonly IntegratedSnapshotEntityProducer[] = options.entities,
) {
  return buildIntegratedSnapshot({
    rawRoot: options.rawRoot,
    version: options.version,
    temporaryParent: options.temporaryParent,
    policy: options.policy,
    entities,
  })
}

/** v3 构建结果再改写为 v2 外壳：成员文件字节与引用路径与 v3 结果完全一致。 */
async function buildLegacyV2Artifact(options: Fixture) {
  const build = await buildSnapshot(options)
  await rewriteAsLegacyV2Artifact(build.artifactDirectory)
  return build
}

describe("复验 v2 外壳制品", () => {
  it.each(["data", "zh", "en", "all"])(
    "接受按实际字节重算摘要的重新序列化 %s 文件",
    async (selection) => {
      const options = await fixture()
      const { artifactDirectory: root } = await buildLegacyV2Artifact(options)
      const index = await readJson(join(root, "index.json"))
      for (const agent of Object.values(index.agents) as any[]) {
        const references: any[] =
          selection === "all"
            ? [agent.files.stats, ...Object.values(agent.files.content)]
            : [
                selection === "data"
                  ? agent.files.stats
                  : agent.files.content[selection],
              ]
        for (const reference of references) {
          const path = join(root, reference.path)
          const original = await readJson(path)
          const bytes = Buffer.from(
            `${JSON.stringify(arranged(original, true))}\n`,
          )
          expect(JSON.parse(bytes.toString())).toEqual(original)
          expect(bytes.equals(await fs.readFile(path))).toBe(false)
          await fs.writeFile(path, bytes)
          reference.sha256 = digest(bytes)
        }
      }
      await fs.writeFile(
        join(root, "index.json"),
        `${JSON.stringify(arranged(index), null, 2)}\n`,
      )
      expect(
        await verifyNanokaAgentArtifact({ artifactDirectory: root }),
      ).toEqual(index)
    },
  )

  it.each([undefined, 4])(
    "接受以缩进 %s 重新序列化的索引",
    async (indentation) => {
      const options = await fixture()
      const { artifactDirectory: root } = await buildLegacyV2Artifact(options)
      const index = await readJson(join(root, "index.json"))
      await fs.writeFile(
        join(root, "index.json"),
        `${JSON.stringify(arranged(index, true), null, indentation)}\n`,
      )
      expect(
        await verifyNanokaAgentArtifact({ artifactDirectory: root }),
      ).toEqual(index)
      // 提供完整输入构建结果时同样只看 JSON 值，不要求索引排版一致。
      await expect(
        verifyNanokaAgentArtifact({
          artifactDirectory: root,
          expectedIndex: index,
        }),
      ).resolves.toEqual(index)
    },
  )

  it("拒绝未重算摘要的重新序列化成员文件", async () => {
    const options = await fixture()
    const { artifactDirectory: root } = await buildLegacyV2Artifact(options)
    await edit(join(root, "agents/2/details.en.json"), () => {})
    await expect(
      verifyNanokaAgentArtifact({ artifactDirectory: root }),
    ).rejects.toThrow("摘要不一致")
  })

  const legacyDamages: [string, string][] = [
    ["缺失成员文件", "ENOENT"],
    ["篡改字节", "摘要不一致"],
    ["错误路径", "文件路径错误"],
    ["绝对路径", "文件路径错误"],
    ["身份错误", "身份错误"],
    ["语言错误", "语言错误"],
    ["成员目录内的多余文件", "未登记的文件或目录"],
    ["多余实体文件", "未登记的文件或目录"],
    ["多余的完整成员目录", "未登记的文件或目录"],
    ["成员目录内的多余子目录", "未登记的文件或目录"],
    ["制品根的多余类别目录", "未登记的文件或目录"],
    ["多余空目录", "未登记的文件或目录"],
    ["制品根维护文件", "未登记的文件或目录"],
    ["符号链接", "不允许符号链接"],
    ["缺失索引", "ENOENT"],
    ["索引非 UTF-8", "不是有效 UTF-8"],
    ["重复输入资源", "资源路径、顺序或唯一性错误"],
    ["输入残留 pointer 字段", "字段集合不一致"],
    ["输入摘要为大写", "输入 SHA-256 格式错误"],
    ["输入摘要长度错误", "输入 SHA-256 格式错误"],
    ["成员顺序颠倒", "成员须数值升序、无重复且与 agents 完全一致"],
    ["成员 ID 重复", "成员须数值升序、无重复且与 agents 完全一致"],
    ["成员集合不一致", "成员须数值升序、无重复且与 agents 完全一致"],
    ["语言集合不一致", "详情语言或配置顺序不一致"],
    ["非完整数据集", "不是完整数据集"],
    ["来源记录不是普通对象", "必须是普通对象"],
    ["多余根级索引字段", "字段集合不一致"],
  ]
  it.each(legacyDamages)("拒绝 v2 外壳的 %s", async (kind, message) => {
    const options = await fixture()
    const { artifactDirectory: root } = await buildLegacyV2Artifact(options)
    const indexPath = join(root, "index.json")
    const detailPath = join(root, "agents/10/details.en.json")
    if (kind === "缺失成员文件") await fs.rm(detailPath)
    else if (kind === "篡改字节") await fs.appendFile(detailPath, " ")
    else if (kind === "缺失索引") await fs.rm(indexPath)
    else if (kind === "索引非 UTF-8")
      await fs.writeFile(indexPath, Buffer.from([0xff]))
    else if (kind === "符号链接") {
      await fs.rm(detailPath)
      await fs.symlink(join(root, "agents/2/details.en.json"), detailPath)
    } else if (kind === "成员目录内的多余文件")
      await write(join(root, "agents/10/extra.json"), {})
    else if (kind === "多余实体文件")
      await write(join(root, "agents/999/data.json"), {})
    else if (kind === "多余的完整成员目录") {
      // 整个成员目录都未登记：第一个不匹配的名字在 agents 一级就暴露。
      for (const name of ["data.json", "details.zh.json", "details.en.json"])
        await write(join(root, "agents/999", name), {})
    } else if (kind === "成员目录内的多余子目录")
      await write(join(root, "agents/2/nested/extra.json"), {})
    else if (kind === "制品根的多余类别目录")
      await write(join(root, "extra-category/data.json"), {})
    else if (kind === "多余空目录") await fs.mkdir(join(root, "unexpected"))
    else if (kind === "制品根维护文件")
      await write(join(root, "maintenance.json"), {})
    else {
      if (kind === "身份错误" || kind === "语言错误")
        await edit(
          detailPath,
          (value) => {
            if (kind === "身份错误") value.id = 2
            else value.locale = "zh"
          },
          true,
        )
      const detailDigest = digest(await fs.readFile(detailPath))
      await edit(
        indexPath,
        (index) => {
          if (kind === "错误路径")
            index.agents["10"].files.content.en.path = "../escape.json"
          if (kind === "绝对路径")
            index.agents["10"].files.content.en.path = detailPath
          if (kind === "身份错误" || kind === "语言错误")
            index.agents["10"].files.content.en.sha256 = detailDigest
          if (kind === "重复输入资源")
            index.source.inputs[3] = index.source.inputs[2]
          if (kind === "输入残留 pointer 字段")
            index.source.inputs[1].pointer = "/2"
          if (kind === "输入摘要为大写")
            index.source.inputs[0].sha256 = "A".repeat(64)
          if (kind === "输入摘要长度错误") index.source.inputs[0].sha256 = "abc"
          if (kind === "成员顺序颠倒") index.scope.agentIds.reverse()
          if (kind === "成员 ID 重复") index.scope.agentIds = ["2", "2", "10"]
          if (kind === "成员集合不一致") delete index.agents["10"]
          if (kind === "语言集合不一致") index.source.detailLocales.reverse()
          if (kind === "非完整数据集") index.scope.completeDataset = false
          if (kind === "来源记录不是普通对象")
            index.agents["2"].sourceRecord = []
          if (kind === "多余根级索引字段") index.maintenance = {}
        },
        true,
      )
    }
    await expect(
      verifyNanokaAgentArtifact({ artifactDirectory: root }),
    ).rejects.toThrow(message)
  })
})

describe("复验 v3 完整制品", () => {
  it.each(["data", "zh", "en", "all"])(
    "接受按实际字节重算摘要的重新序列化 %s 文件",
    async (selection) => {
      const options = await fixture({ widgets: true })
      const build = await buildSnapshot(options)
      const root = build.artifactDirectory
      const index = await readJson(join(root, "index.json"))
      for (const category of Object.values(index.entities) as any[]) {
        for (const memberId of category.memberIds) {
          const member = category.members[memberId]
          const references: any[] =
            selection === "all"
              ? [member.files.data, ...Object.values(member.files.details)]
              : [
                  selection === "data"
                    ? member.files.data
                    : member.files.details[selection],
                ]
          for (const reference of references) {
            const path = join(root, reference.path)
            const original = await readJson(path)
            const bytes = Buffer.from(
              `${JSON.stringify(arranged(original, true))}\n`,
            )
            expect(JSON.parse(bytes.toString())).toEqual(original)
            // 重新序列化确实改变了排版：通过验证的只能是重算后的实际字节摘要。
            expect(bytes.equals(await fs.readFile(path))).toBe(false)
            await fs.writeFile(path, bytes)
            reference.sha256 = digest(bytes)
            expect(reference.sha256).toBe(digest(await fs.readFile(path)))
          }
        }
      }
      await fs.writeFile(
        join(root, "index.json"),
        `${JSON.stringify(arranged(index), null, 2)}\n`,
      )
      expect(
        await verifyIntegratedSnapshot({
          artifactDirectory: root,
          policy: options.policy,
          entities: options.entities,
        }),
      ).toEqual(index)
    },
  )

  it.each([undefined, 4])(
    "接受以缩进 %s 重新序列化的索引",
    async (indentation) => {
      const options = await fixture()
      const build = await buildSnapshot(options)
      const root = build.artifactDirectory
      const index = await readJson(join(root, "index.json"))
      await fs.writeFile(
        join(root, "index.json"),
        `${JSON.stringify(arranged(index, true), null, indentation)}\n`,
      )
      expect(
        await verifyIntegratedSnapshot({
          artifactDirectory: root,
          policy: options.policy,
          entities: options.entities,
        }),
      ).toEqual(index)
      await expect(
        verifyIntegratedSnapshot({
          artifactDirectory: root,
          policy: options.policy,
          entities: options.entities,
          expectedIndex: index,
        }),
      ).resolves.toEqual(index)
    },
  )

  it("拒绝未重算摘要的重新序列化成员文件", async () => {
    const options = await fixture()
    const build = await buildSnapshot(options)
    await edit(
      join(build.artifactDirectory, "agents/2/details.en.json"),
      () => {},
    )
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: options.policy,
        entities: options.entities,
      }),
    ).rejects.toThrow("摘要不一致")
  })

  it("仅在历史开关下接受此前登记的详情语言子集", async () => {
    const options = await fixture()
    const build = await buildSnapshot(options)
    await restrictDetailLocales(options, build, ["zh"])
    const historicalPolicy: SourcePolicy = {
      ...options.policy,
      languages: ["zh"] as SourcePolicy["languages"],
    }
    // 默认调用要求当前完整语言配置，在读取任何文件之前就拒绝。
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: historicalPolicy,
        entities: options.entities,
      }),
    ).rejects.toThrow("来源配置无效")
    expect(
      await verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: historicalPolicy,
        entities: options.entities,
        historicalLanguages: true,
      }),
    ).toMatchObject({
      format: "fairy-nanoka-integrated/v3",
      entities: { agents: { detailLocales: ["zh"] } },
    })
  })

  it("按历史类别契约复验旧 rulesVersion 的类别", async () => {
    const options = await fixture()
    const build = await buildSnapshot(options)
    const historicalRulesVersion = "nanoka-agent-reference/3"
    await edit(join(build.artifactDirectory, "index.json"), (index) => {
      index.entities.agents.rulesVersion = historicalRulesVersion
    })
    // 旧快照不能作为新候选：按其原有 agents-only 契约（当前规则版本）复验时明确拒绝旧规则版本。
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: options.policy,
        entities: [nanokaAgentsSnapshotEntity],
      }),
    ).rejects.toThrow("规则版本错误")
    expect(
      await verifyIntegratedSnapshot({
        artifactDirectory: build.artifactDirectory,
        policy: options.policy,
        entities: [
          {
            ...nanokaAgentsSnapshotEntity,
            rulesVersion: historicalRulesVersion,
          },
        ],
      }),
    ).toMatchObject({
      entities: { agents: { rulesVersion: historicalRulesVersion } },
    })
  })

  const snapshotDamages: [
    string,
    (root: string) => Promise<unknown>,
    string,
  ][] = [
    [
      "多余实体目录",
      (root) => write(join(root, "agents/999/data.json"), {}),
      "未登记的文件或目录",
    ],
    [
      "制品根维护文件",
      (root) => write(join(root, "maintenance.json"), {}),
      "未登记的文件或目录",
    ],
    ["缺失索引", (root) => fs.rm(join(root, "index.json")), "ENOENT"],
    [
      "索引非 UTF-8",
      (root) => fs.writeFile(join(root, "index.json"), Buffer.from([0xff])),
      "不是有效 UTF-8",
    ],
    [
      "重复登记输入资源",
      (root) =>
        edit(join(root, "index.json"), (index) => {
          index.entities.agents.inputs[2] = index.entities.agents.inputs[1]
        }),
      "资源路径、顺序或唯一性错误",
    ],
    [
      "重复登记快照输入资源",
      (root) =>
        edit(join(root, "index.json"), (index) => {
          index.source.inputs.push(index.source.inputs[0])
        }),
      "输入资源集合不一致",
    ],
    [
      "输入残留 pointer 字段",
      (root) =>
        edit(join(root, "index.json"), (index) => {
          index.entities.agents.inputs[1].pointer = "/2"
        }),
      "字段集合不一致",
    ],
    [
      "输入摘要为大写",
      (root) =>
        edit(join(root, "index.json"), (index) => {
          index.entities.agents.inputs[1].sha256 = "A".repeat(64)
        }),
      "输入 SHA-256 格式错误",
    ],
    [
      "输入摘要长度错误",
      (root) =>
        edit(join(root, "index.json"), (index) => {
          index.entities.agents.inputs[1].sha256 = "abc"
        }),
      "输入 SHA-256 格式错误",
    ],
    [
      "多余根级索引字段",
      (root) =>
        edit(join(root, "index.json"), (index) => {
          index.maintenance = {}
        }),
      "字段集合不一致",
    ],
  ]
  it.each(snapshotDamages)(
    "拒绝 v3 制品的 %s",
    async (_name, damage, message) => {
      const options = await fixture({ widgets: true })
      const build = await buildSnapshot(options)
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

  it("拒绝缺少已登记类别或多出未登记类别的制品", async () => {
    const options = await fixture({ widgets: true })
    // 只构建 agents：当前登记表要求的第二个类别缺失即拒绝。
    const agentsOnly = await buildSnapshot(options, [
      nanokaAgentsSnapshotEntity,
    ])
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: agentsOnly.artifactDirectory,
        policy: options.policy,
        entities: options.entities,
      }),
    ).rejects.toThrow("类别集合与本次期望的已接入类别不一致")
    // 构建两个类别但只按 agents 复验：制品多出未登记类别同样拒绝。
    const complete = await buildSnapshot(options)
    await expect(
      verifyIntegratedSnapshot({
        artifactDirectory: complete.artifactDirectory,
        policy: options.policy,
        entities: [nanokaAgentsSnapshotEntity],
      }),
    ).rejects.toThrow("类别集合与本次期望的已接入类别不一致")
  })
})

/**
 * 把完整 v3 制品改写为历史登记的详情语言子集制品。
 *
 * 构建器要求完整当前语言，因此子集制品只能这样构造：删除子集外的详情文件与引用，
 * 并按同一子集重排该类别输入清单；成员文件字节、摘要与来源记录保持构建时的原值。
 */
async function restrictDetailLocales(
  options: Fixture,
  build: { artifactDirectory: string },
  keep: readonly SupportedLanguage[],
) {
  const root = build.artifactDirectory
  const index = await readJson(join(root, "index.json"))
  for (const entity of options.entities) {
    const category = index.entities[entity.name]
    const dropped = (category.detailLocales as string[]).filter(
      (locale) => !keep.includes(locale as SupportedLanguage),
    )
    const resourceFor = (locale: string, memberId: string) =>
      `zzz/${options.version}/${locale}/${entity.sourceEntity}/${memberId}.json`
    const inputFor = (resource: string) =>
      category.inputs.find((input: any) => input.resource === resource)
    category.detailLocales = [...keep]
    category.inputs = [
      inputFor(`zzz/${options.version}/${entity.sourceEntity}.json`),
      ...category.memberIds.flatMap((memberId: string) =>
        keep.map((locale) => inputFor(resourceFor(locale, memberId))),
      ),
    ]
    for (const memberId of category.memberIds) {
      const member = category.members[memberId]
      for (const locale of dropped) {
        delete member.files.details[locale]
        await fs.rm(join(root, entity.name, memberId, `details.${locale}.json`))
      }
    }
  }
  await fs.writeFile(join(root, "index.json"), JSON.stringify(index))
}

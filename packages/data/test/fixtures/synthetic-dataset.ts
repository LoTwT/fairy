import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import { agentInput } from "./agent-source.ts"
import {
  syntheticEntityDetails,
  syntheticEntityRecord,
} from "./snapshot-entities.ts"

/** v2 外壳的格式标记；合成测试用它构造需要显式迁移的旧制品。 */
export const legacyV2Format = "fairy-nanoka-integrated/v2"

/** 与代理人类别当前登记一致的默认规则版本；调用方可显式传入旧版本。 */
const defaultRulesVersion = "nanoka-agent-reference/4"

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value))
}

/**
 * 合成 raw 输入：manifest、指定来源实体的索引与配置语言详情。
 *
 * 代理人使用 agent-source fixture，合成第二类别使用 snapshot-entities fixture；
 * 两者都不读取真实 raw，也不代表真实领域模型。
 */
export async function writeSyntheticRaw(options: {
  rawRoot: string
  version: string
  agentIds?: readonly string[]
  widgetIds?: readonly string[]
}) {
  const root = join(options.rawRoot, options.version)
  await writeJson(join(root, "manifest.json"), {
    zzz: {
      live: options.version,
      latest: options.version,
      available: [options.version],
    },
  })
  const agentIds = options.agentIds ?? []
  if (agentIds.length) {
    const input = agentInput()
    await writeJson(
      join(root, "character.json"),
      Object.fromEntries(agentIds.map((id) => [id, input.sourceRecord])),
    )
    for (const id of agentIds)
      for (const locale of input.detailLocales)
        await writeJson(join(root, locale, "character", `${id}.json`), {
          ...input.details[locale],
          id: Number(id),
        })
  }
  const widgetIds = options.widgetIds ?? []
  if (widgetIds.length) {
    await writeJson(
      join(root, "equipment.json"),
      Object.fromEntries(
        widgetIds.map((id) => [id, syntheticEntityRecord(id)]),
      ),
    )
    for (const id of widgetIds)
      for (const locale of ["zh", "en"])
        await writeJson(
          join(root, locale, "equipment", `${id}.json`),
          syntheticEntityDetails(id, locale),
        )
  }
}

/**
 * 把一份 v3 完整制品改写为 v2 外壳：只重写 index.json。
 *
 * 成员文件与其引用路径、实际字节摘要原样保留，因此改写的制品与 v3 构建结果逐字节一致；
 * 只用于合成测试构造迁移输入，生产不存在反向转换能力。
 */
export async function rewriteAsLegacyV2Artifact(
  artifactDirectory: string,
  options: { rulesVersion?: string } = {},
): Promise<void> {
  const index = JSON.parse(
    await readFile(join(artifactDirectory, "index.json"), "utf8"),
  )
  const entity = index?.entities?.agents
  if (!entity) throw new Error("合成制品缺少 agents 类别")
  const agents: Record<string, unknown> = {}
  for (const memberId of entity.memberIds) {
    const member = entity.members[memberId]
    agents[memberId] = {
      files: { stats: member.files.data, content: member.files.details },
      sourceRecord: member.sourceRecord,
    }
  }
  await writeFile(
    join(artifactDirectory, "index.json"),
    serializeJson({
      format: legacyV2Format,
      rulesVersion: options.rulesVersion ?? defaultRulesVersion,
      scope: {
        kind: "full-index",
        agentIds: [...entity.memberIds],
        completeDataset: true,
      },
      source: {
        id: index.source.id,
        version: index.source.version,
        detailLocales: [...entity.detailLocales],
        inputs: [...index.source.inputs, ...entity.inputs],
      },
      agents,
    }),
  )
}

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { serializeJson } from "../../src/integration/serialize-json.ts"
import { agentInput } from "./agent-source.ts"
import {
  driveDiscInput,
  syntheticDriveDiscEnglishName,
} from "./drive-disc-source.ts"
import {
  syntheticEntityDetails,
  syntheticEntityRecord,
} from "./snapshot-entities.ts"
import { syntheticWEngineEnglishName, wEngineInput } from "./w-engine-source.ts"

/** v2 外壳的格式标记；合成测试用它构造需要显式迁移的旧制品。 */
export const legacyV2Format = "fairy-nanoka-integrated/v2"

/** 与代理人类别当前登记一致的默认规则版本；调用方可显式传入旧版本。 */
const defaultRulesVersion = "nanoka-agent-reference/4"

/** 生产登记表默认使用的合成驱动盘成员；details.id 按成员改写，摘要与语言详情复用同一真实结构 fixture。 */
export const syntheticDriveDiscIds = ["930001", "930002"] as const

/** 生产登记表默认使用的合成 WEngine 成员；details.id 按成员改写，索引记录与语言详情复用同一真实结构 fixture。 */
export const syntheticWEngineIds = ["940001", "940002"] as const

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value))
}

/**
 * 合成 raw 输入：manifest、指定来源实体的索引与配置语言详情。
 *
 * 代理人使用 agent-source fixture，驱动盘使用真实结构的 drive-disc-source fixture，
 * WEngine 使用真实结构的 w-engine-source fixture，合成第二类别使用 snapshot-entities fixture；
 * 都不读取真实 raw。
 * 驱动盘与 widgets 都来自 equipment 资源，不能同时写入：同一输入文件会被后者覆盖。
 * widgets 用例使用独立的测试登记表，因此默认不写驱动盘与 WEngine 输入。
 */
export async function writeSyntheticRaw(options: {
  rawRoot: string
  version: string
  agentIds?: readonly string[]
  /** 真实驱动盘结构的 equipment 输入；默认写入生产登记表所需的合成成员，传入空数组显式省略。 */
  driveDiscIds?: readonly string[]
  /** 真实 WEngine 结构的 weapon 输入；默认写入生产登记表所需的合成成员，传入空数组显式省略。 */
  weaponIds?: readonly string[]
  /** 合成第二类别（widgets）的 equipment 输入；仅供显式测试登记表使用。 */
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
  const driveDiscIds =
    options.driveDiscIds ?? (widgetIds.length ? [] : syntheticDriveDiscIds)
  if (widgetIds.length && driveDiscIds.length)
    throw new Error(
      "widgets 与驱动盘共用 equipment 来源，不能同时写入同一合成输入",
    )
  if (driveDiscIds.length) {
    const input = driveDiscInput()
    await writeJson(
      join(root, "equipment.json"),
      Object.fromEntries(driveDiscIds.map((id) => [id, input.sourceRecord])),
    )
    for (const id of driveDiscIds)
      for (const locale of input.detailLocales)
        await writeJson(join(root, locale, "equipment", `${id}.json`), {
          ...input.details[locale],
          id: Number(id),
          // 英文详情名称按成员唯一，与 sourceRecord.en.name 不同；供发布链路间接使用的输入保持同一约定。
          name:
            locale === "en"
              ? syntheticDriveDiscEnglishName(id)
              : `示例驱动盘 ${id}`,
        })
  }
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
  const weaponIds =
    options.weaponIds ?? (widgetIds.length ? [] : syntheticWEngineIds)
  if (weaponIds.length) {
    const input = wEngineInput()
    await writeJson(
      join(root, "weapon.json"),
      Object.fromEntries(weaponIds.map((id) => [id, input.sourceRecord])),
    )
    for (const id of weaponIds)
      for (const locale of input.detailLocales)
        await writeJson(join(root, locale, "weapon", `${id}.json`), {
          ...input.details[locale],
          id: Number(id),
          // 英文详情名称按成员唯一，与 sourceRecord.en 不同；供发布链路间接使用的输入保持同一约定。
          name:
            locale === "en"
              ? syntheticWEngineEnglishName(id)
              : `示例音擎 ${id}`,
        })
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
  if (Object.keys(index?.entities ?? {}).length > 1)
    throw new Error(
      "v2 外壳只描述单一代理人制品：拒绝改写包含其他类别的多类别制品",
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

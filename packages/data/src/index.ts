import type {
  AgentData,
  AgentDetails,
  DetailLocale,
} from "./integration/agent-types.ts"
import type { IntegratedSnapshotIndex } from "./integration/snapshot-types.ts"
import {
  agentNames,
  agentSourceIds,
  agentLoaders,
  indexLoader,
} from "../.generated/catalog.ts"
import type { AgentName } from "../.generated/catalog.ts"

/** 正式字段类型：实体结构、文件引用、来源身份与多实体完整制品索引。 */
export type {
  AgentData,
  AgentDetails,
  DetailLocale,
  ExportFileReference,
  MaterialCounts,
  PropertyText,
  RecommendationProperty,
  SkillDescriptionSection,
  SkillParameterRow,
  SourceBaseStats,
  SourceEmptyObject,
  SourceExtraProperty,
  SourceId,
  SourceJson,
  SourceLevelStage,
  SourceParameter,
  SourcePotentialDetail,
  SourceSkillPriority,
} from "./integration/agent-types.ts"
export type {
  IntegratedSnapshotEntity,
  IntegratedSnapshotIndex,
  IntegratedSnapshotMember,
  IntegratedSnapshotSourceInput,
} from "./integration/snapshot-types.ts"
export type { AgentName } from "../.generated/catalog.ts"
export { agentNames } from "../.generated/catalog.ts"

/** 指定语言的完整代理人资料；公共与本地化字段分别保留，不合并。 */
export interface LocalizedAgent {
  /** 原有公共资料结构。 */
  data: AgentData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: AgentDetails
}

function assertName(name: unknown): asserts name is string {
  if (typeof name !== "string") throw new TypeError("name must be a string")
}

function assertLocale(locale: unknown): asserts locale is DetailLocale {
  if (locale !== "zh" && locale !== "en")
    throw new TypeError("locale must be zh or en")
}

function sourceId(name: AgentName): string | undefined {
  assertName(name)
  return Object.hasOwn(agentSourceIds, name) ? agentSourceIds[name] : undefined
}

/** 加载完整原样索引及来源记录，不加载实体；每次返回独立对象树。加载失败时拒绝 Promise。 */
export async function loadIndex(): Promise<IntegratedSnapshotIndex> {
  return structuredClone(await indexLoader())
}

/** 精确英文名称对应的公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引或详情，每次返回独立对象树。 */
export async function loadAgentData(
  name: AgentName,
): Promise<AgentData | undefined> {
  const id = sourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await agentLoaders[id]!.data())
}

/** 只读取指定成员显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadAgentDetails(
  name: AgentName,
  locale: DetailLocale,
): Promise<AgentDetails | undefined> {
  assertLocale(locale)
  const id = sourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await agentLoaders[id]![locale]())
}

/** 显式加载全部公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。每次返回独立对象树。 */
export async function loadAllAgents(
  locale: DetailLocale,
): Promise<Record<AgentName, LocalizedAgent>> {
  assertLocale(locale)
  return Object.fromEntries(
    await Promise.all(
      agentNames.map(async (name) => {
        const loaders = agentLoaders[agentSourceIds[name]]!
        const [data, details] = await Promise.all([
          loaders.data(),
          loaders[locale](),
        ])
        return [name, structuredClone({ data, details })]
      }),
    ),
  ) as Record<AgentName, LocalizedAgent>
}

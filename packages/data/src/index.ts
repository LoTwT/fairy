import type {
  AgentData,
  AgentDetails,
  DetailLocale,
} from "./integration/agent-types.ts"
import type {
  DriveDiscData,
  DriveDiscDetails,
} from "./integration/drive-disc-types.ts"
import type {
  WEngineData,
  WEngineDetails,
} from "./integration/w-engine-types.ts"
import type { IntegratedSnapshotIndex } from "./integration/snapshot-types.ts"
import {
  agentNames,
  agentSourceIds,
  agentLoaders,
  driveDiscNames,
  driveDiscSourceIds,
  driveDiscLoaders,
  wEngineNames,
  wEngineSourceIds,
  wEngineLoaders,
  indexLoader,
} from "../.generated/catalog.ts"
import type {
  AgentName,
  DriveDiscName,
  WEngineName,
} from "../.generated/catalog.ts"

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
  DriveDiscData,
  DriveDiscDetails,
} from "./integration/drive-disc-types.ts"
export type {
  WEngineClassificationIds,
  WEngineData,
  WEngineDetails,
  WEngineLevelStage,
  WEnginePropertyText,
  WEnginePropertyValue,
  WEngineStarsStage,
  WEngineTalent,
} from "./integration/w-engine-types.ts"
export type {
  IntegratedSnapshotEntity,
  IntegratedSnapshotIndex,
  IntegratedSnapshotMember,
  IntegratedSnapshotSourceInput,
} from "./integration/snapshot-types.ts"
export type {
  AgentName,
  DriveDiscName,
  WEngineName,
} from "../.generated/catalog.ts"
export {
  agentNames,
  driveDiscNames,
  wEngineNames,
} from "../.generated/catalog.ts"

/** 指定语言的完整代理人资料；公共与本地化字段分别保留，不合并。 */
export interface LocalizedAgent {
  /** 原有公共资料结构。 */
  data: AgentData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: AgentDetails
}

/** 指定语言的完整驱动盘套装资料；公共与本地化字段分别保留，不合并。 */
export interface LocalizedDriveDisc {
  /** 原有公共资料结构。 */
  data: DriveDiscData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: DriveDiscDetails
}

/** 指定语言的完整 WEngine 资料；公共与本地化字段分别保留，不合并。 */
export interface LocalizedWEngine {
  /** 原有公共资料结构。 */
  data: WEngineData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: WEngineDetails
}

function assertName(name: unknown): asserts name is string {
  if (typeof name !== "string") throw new TypeError("name must be a string")
}

function assertLocale(locale: unknown): asserts locale is DetailLocale {
  if (locale !== "zh" && locale !== "en")
    throw new TypeError("locale must be zh or en")
}

function agentSourceId(name: AgentName): string | undefined {
  assertName(name)
  return Object.hasOwn(agentSourceIds, name) ? agentSourceIds[name] : undefined
}

function driveDiscSourceId(name: DriveDiscName): string | undefined {
  assertName(name)
  return Object.hasOwn(driveDiscSourceIds, name)
    ? driveDiscSourceIds[name]
    : undefined
}

function wEngineSourceId(name: WEngineName): string | undefined {
  assertName(name)
  return Object.hasOwn(wEngineSourceIds, name)
    ? wEngineSourceIds[name]
    : undefined
}

/** 加载完整原样索引及来源记录，不加载实体；每次返回独立对象树。加载失败时拒绝 Promise。 */
export async function loadIndex(): Promise<IntegratedSnapshotIndex> {
  return structuredClone(await indexLoader())
}

/** 精确英文名称对应的公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引或详情，每次返回独立对象树。 */
export async function loadAgentData(
  name: AgentName,
): Promise<AgentData | undefined> {
  const id = agentSourceId(name)
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
  const id = agentSourceId(name)
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

/** 精确英文名称对应的驱动盘套装公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引、详情或代理人，每次返回独立对象树。 */
export async function loadDriveDiscData(
  name: DriveDiscName,
): Promise<DriveDiscData | undefined> {
  const id = driveDiscSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await driveDiscLoaders[id]!.data())
}

/** 只读取指定驱动盘套装显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadDriveDiscDetails(
  name: DriveDiscName,
  locale: DetailLocale,
): Promise<DriveDiscDetails | undefined> {
  assertLocale(locale)
  const id = driveDiscSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await driveDiscLoaders[id]![locale]())
}

/** 显式加载全部驱动盘套装公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。不加载代理人或索引，每次返回独立对象树。 */
export async function loadAllDriveDiscs(
  locale: DetailLocale,
): Promise<Record<DriveDiscName, LocalizedDriveDisc>> {
  assertLocale(locale)
  return Object.fromEntries(
    await Promise.all(
      driveDiscNames.map(async (name) => {
        const loaders = driveDiscLoaders[driveDiscSourceIds[name]]!
        const [data, details] = await Promise.all([
          loaders.data(),
          loaders[locale](),
        ])
        return [name, structuredClone({ data, details })]
      }),
    ),
  ) as Record<DriveDiscName, LocalizedDriveDisc>
}

/** 精确英文名称对应的 WEngine 公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引、详情或其他类别，每次返回独立对象树。 */
export async function loadWEngineData(
  name: WEngineName,
): Promise<WEngineData | undefined> {
  const id = wEngineSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await wEngineLoaders[id]!.data())
}

/** 只读取指定 WEngine 显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadWEngineDetails(
  name: WEngineName,
  locale: DetailLocale,
): Promise<WEngineDetails | undefined> {
  assertLocale(locale)
  const id = wEngineSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await wEngineLoaders[id]![locale]())
}

/** 显式加载全部 WEngine 公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。不加载代理人、驱动盘或索引，每次返回独立对象树。 */
export async function loadAllWEngines(
  locale: DetailLocale,
): Promise<Record<WEngineName, LocalizedWEngine>> {
  assertLocale(locale)
  return Object.fromEntries(
    await Promise.all(
      wEngineNames.map(async (name) => {
        const loaders = wEngineLoaders[wEngineSourceIds[name]]!
        const [data, details] = await Promise.all([
          loaders.data(),
          loaders[locale](),
        ])
        return [name, structuredClone({ data, details })]
      }),
    ),
  ) as Record<WEngineName, LocalizedWEngine>
}

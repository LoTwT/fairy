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
import type {
  BangbooData,
  BangbooDetails,
} from "./integration/bangboo-types.ts"
import type {
  MonsterData,
  MonsterDetails,
} from "./integration/monster-types.ts"
import type { ShiyuData, ShiyuDetails } from "./integration/shiyu-types.ts"
import type { BossData, BossDetails } from "./integration/boss-types.ts"
export type {
  SimulAdjustEntry,
  SimulData,
  SimulDetails,
  SimulBuff,
  SimulEncounter,
  SimulLayer,
  SimulNode,
  SimulRecordEntry,
  SimulRoom,
  SimulStoryChoice,
  SimulStoryEventGroup,
  SimulStoryPage,
  SimulBattle,
} from "./integration/simul-types.ts"
import type { SimulData, SimulDetails } from "./integration/simul-types.ts"
import type { IntegratedSnapshotIndex } from "./integration/snapshot-types.ts"
import { supportedLanguages } from "./nanoka-identity.ts"
import type { AgentActions } from "./skills/types.ts"
import type {
  AgentLevel60Attributes,
  WEngineLevel60Attributes,
  SDriveDiscMaxLevelAffixes,
} from "./attributes/types.ts"
import type {
  AgentName,
  AgentSourceId,
  DriveDiscName,
  WEngineName,
  WEngineSourceId,
  BangbooName,
  MonsterId,
  ShiyuId,
  BossId,
  SimulId,
} from "../.generated/catalog.ts"
import {
  agentNames,
  agentSourceIds,
  agentNamesBySourceId,
  agentLoaders,
  driveDiscNames,
  driveDiscSourceIds,
  driveDiscLoaders,
  wEngineNames,
  wEngineSourceIds,
  wEngineNamesBySourceId,
  wEngineLoaders,
  bangbooNames,
  bangbooSourceIds,
  bangbooLoaders,
  monsterIds,
  monsterLoaders,
  shiyuIds,
  shiyuLoaders,
  bossIds,
  bossLoaders,
  simulIds,
  simulLoaders,
  indexLoader,
  agentAttributeLoaders,
  wEngineAttributeLoaders,
  driveDiscAffixesLoader,
  agentActionLoaders,
  staticEffectDefinitionsLoader,
  staticEffectCatalogLoader,
} from "../.generated/catalog.ts"

export type {
  AgentActions,
  AgentAction,
  AgentActionId,
  AgentActionCalculation,
  AgentActionManifest,
  ActionDamageElement,
  ActionDamageItem,
  ActionDamageSegment,
  ActionIssue,
  ActionScalingStat,
  ActionSkillCategory,
  ActionSourceReference,
  ResolveAgentActionInput,
  ResolvedAgentAction,
  ResolvedActionSegment,
  ResolvedSkillLevel,
  SkillCoefficientCurve,
  SkillLevelGroup,
  SkillLevelInput,
} from "./skills/types.ts"
export { resolveAgentSkillLevel, resolveAgentAction } from "./skills/resolve.ts"

export type {
  AgentLevel60Attributes,
  WEngineLevel60Attributes,
  SDriveDiscMaxLevelAffixes,
  PanelAttribute,
  PanelAttributeUnitMap,
  PanelAttributeValues,
  PanelAttributeBonus,
  PanelAttributeManifest,
  PanelCoreSkillLevel,
  DriveDiscSlot,
  DriveDiscDamageElement,
} from "./attributes/types.ts"

/** 正式字段类型：实体结构、文件引用、来源身份与多实体完整制品索引。 */
export type {
  AgentData,
  AgentDetails,
  AgentSourceNames,
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
  BangbooData,
  BangbooDetails,
  BangbooLevelExtraLocalization,
  BangbooLevelExtraShared,
  BangbooLevelStage,
  BangbooLevelStageLocalization,
  BangbooSkillCategory,
  BangbooSkillLevelEntry,
  BangbooSkillProp,
  BangbooSkillPropParameter,
  BangbooStats,
} from "./integration/bangboo-types.ts"
export type {
  MonsterData,
  MonsterDetails,
  MonsterGrowthCurve,
  MonsterInfoUnit,
} from "./integration/monster-types.ts"
export type {
  ShiyuData,
  ShiyuDetails,
  ShiyuZoneBuff,
  ShiyuZoneEncounter,
  ShiyuZoneRoom,
  ShiyuZoneStage,
} from "./integration/shiyu-types.ts"
export type {
  BossAdjustEntry,
  BossData,
  BossDetails,
  BossLiveTimeWindow,
  BossMode,
  BossZoneBuff,
  BossZoneEncounter,
  BossZoneRoom,
  BossZoneStage,
} from "./integration/boss-types.ts"
export type {
  IntegratedSnapshotEntity,
  IntegratedSnapshotIndex,
  IntegratedSnapshotInfo,
  IntegratedSnapshotCategory,
  IntegratedSnapshotMember,
  IntegratedSnapshotSourceInput,
} from "./integration/snapshot-types.ts"
export type {
  AgentName,
  AgentSourceId,
  DriveDiscName,
  DriveDiscSourceId,
  WEngineName,
  WEngineSourceId,
  BangbooName,
  BangbooSourceId,
  MonsterId,
  ShiyuId,
  BossId,
  SimulId,
} from "../.generated/catalog.ts"
export {
  agentNames,
  driveDiscNames,
  wEngineNames,
  bangbooNames,
  monsterIds,
  shiyuIds,
  bossIds,
  simulIds,
  agentSourceIds,
  driveDiscSourceIds,
  wEngineSourceIds,
  bangbooSourceIds,
  agentNamesBySourceId,
  driveDiscNamesBySourceId,
  wEngineNamesBySourceId,
  bangbooNamesBySourceId,
  snapshotInfo,
} from "../.generated/catalog.ts"

/** 指定语言的完整实体资料；公共与本地化字段分别保留，不合并同名字段。 */
export interface Localized<Data, Details> {
  /** 原有公共资料结构。 */
  data: Data
  /** 指定语言详情，locale 与调用参数一致。 */
  details: Details
}

/** 指定语言的完整代理人资料。 */
export type LocalizedAgent = Localized<AgentData, AgentDetails>

/** 指定语言的完整驱动盘套装资料。 */
export type LocalizedDriveDisc = Localized<DriveDiscData, DriveDiscDetails>

/** 指定语言的完整 WEngine 资料。 */
export type LocalizedWEngine = Localized<WEngineData, WEngineDetails>

/** 指定语言的完整邦布资料。 */
export type LocalizedBangboo = Localized<BangbooData, BangbooDetails>

/** 指定语言的完整怪物资料。 */
export type LocalizedMonster = Localized<MonsterData, MonsterDetails>

/** 指定语言的完整 Shiyu 区域资料。 */
export type LocalizedShiyu = Localized<ShiyuData, ShiyuDetails>

/** 指定语言的完整 Boss 试炼资料。 */
export type LocalizedBoss = Localized<BossData, BossDetails>

/** 一个 Simul 模拟战的公共资料与指定语言详情。 */
export type LocalizedSimul = Localized<SimulData, SimulDetails>

/** 校验字符串身份参数；非字符串以 TypeError 拒绝，label 说明参数用途。 */
function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string")
    throw new TypeError(`${label} must be a string`)
}

/** 校验已支持的详情语言；不默认、不转换、不回退，语言集合由 supportedLanguages 推导。 */
function assertLocale(locale: unknown): asserts locale is DetailLocale {
  if (!(supportedLanguages as readonly unknown[]).includes(locale))
    throw new TypeError(`locale must be ${supportedLanguages.join(" or ")}`)
}

/** 名称身份 → 来源 ID；非字符串以 TypeError 拒绝，未登记名称返回 undefined。 */
function createNameSourceIdResolver<Name extends string>(
  sourceIds: Readonly<Record<Name, string>>,
): (name: Name) => string | undefined {
  return (name) => {
    assertString(name, "name")
    return Object.hasOwn(sourceIds, name) ? sourceIds[name] : undefined
  }
}

/** 已登记 ID 身份的直通解析；非字符串以 TypeError 拒绝，未登记 ID 返回 undefined。 */
function createRegisteredSourceIdResolver<Id extends string>(
  loaders: Readonly<Record<string, unknown>>,
): (id: Id) => string | undefined {
  return (id) => {
    assertString(id, "id")
    return Object.hasOwn(loaders, id) ? id : undefined
  }
}

/** 单个成员三个实体文件的显式懒加载器；data 与两种语言 details 相互独立。 */
interface MemberFileLoaders<Data, Details> {
  readonly data: () => Promise<Data>
  readonly zh: () => Promise<Details>
  readonly en: () => Promise<Details>
}

/** 一个类别按公开身份读取的内部实现；隔离、校验顺序与加载边界遵循公开函数契约。 */
interface EntityReader<Identity extends string, Data, Details> {
  loadData(identity: Identity): Promise<Data | undefined>
  loadDetails(
    identity: Identity,
    locale: DetailLocale,
  ): Promise<Details | undefined>
  loadAll(
    locale: DetailLocale,
  ): Promise<Record<Identity, Localized<Data, Details>>>
  loadAllData(): Promise<Record<Identity, Data>>
}

function createEntityReader<Identity extends string, Data, Details>(options: {
  readonly identities: readonly Identity[]
  readonly resolveSourceId: (identity: Identity) => string | undefined
  readonly loaders: Readonly<Record<string, MemberFileLoaders<Data, Details>>>
}): EntityReader<Identity, Data, Details> {
  const memberLoaders = (
    identity: Identity,
  ): MemberFileLoaders<Data, Details> | undefined => {
    const sourceId = options.resolveSourceId(identity)
    return sourceId === undefined ? undefined : options.loaders[sourceId]
  }
  return {
    async loadData(identity) {
      const loaders = memberLoaders(identity)
      return loaders === undefined
        ? undefined
        : structuredClone(await loaders.data())
    },
    async loadDetails(identity, locale) {
      assertLocale(locale)
      const loaders = memberLoaders(identity)
      return loaders === undefined
        ? undefined
        : structuredClone(await loaders[locale]())
    },
    async loadAll(locale) {
      assertLocale(locale)
      return Object.fromEntries(
        await Promise.all(
          options.identities.map(async (identity) => {
            const loaders = memberLoaders(identity)!
            const [data, details] = await Promise.all([
              loaders.data(),
              loaders[locale](),
            ])
            return [identity, structuredClone({ data, details })] as const
          }),
        ),
      ) as Record<Identity, Localized<Data, Details>>
    },
    async loadAllData() {
      return Object.fromEntries(
        await Promise.all(
          options.identities.map(async (identity) => {
            const loaders = memberLoaders(identity)!
            return [identity, structuredClone(await loaders.data())] as const
          }),
        ),
      ) as Record<Identity, Data>
    },
  }
}

const agentReader = createEntityReader({
  identities: agentNames,
  resolveSourceId: createNameSourceIdResolver(agentSourceIds),
  loaders: agentLoaders,
})
const driveDiscReader = createEntityReader({
  identities: driveDiscNames,
  resolveSourceId: createNameSourceIdResolver(driveDiscSourceIds),
  loaders: driveDiscLoaders,
})
const wEngineReader = createEntityReader({
  identities: wEngineNames,
  resolveSourceId: createNameSourceIdResolver(wEngineSourceIds),
  loaders: wEngineLoaders,
})
const bangbooReader = createEntityReader({
  identities: bangbooNames,
  resolveSourceId: createNameSourceIdResolver(bangbooSourceIds),
  loaders: bangbooLoaders,
})
const monsterReader = createEntityReader({
  identities: monsterIds,
  resolveSourceId: createRegisteredSourceIdResolver(monsterLoaders),
  loaders: monsterLoaders,
})
const shiyuReader = createEntityReader({
  identities: shiyuIds,
  resolveSourceId: createRegisteredSourceIdResolver(shiyuLoaders),
  loaders: shiyuLoaders,
})
const bossReader = createEntityReader({
  identities: bossIds,
  resolveSourceId: createRegisteredSourceIdResolver(bossLoaders),
  loaders: bossLoaders,
})
const simulReader = createEntityReader({
  identities: simulIds,
  resolveSourceId: createRegisteredSourceIdResolver(simulLoaders),
  loaders: simulLoaders,
})

const agentSourceId = createNameSourceIdResolver(agentSourceIds)
const wEngineSourceId = createNameSourceIdResolver(wEngineSourceIds)

/** 单个角色的动作目录；返回独立对象，根入口不读取技能 JSON。 */
export async function loadAgentActions(
  name: AgentName,
): Promise<AgentActions | undefined> {
  const id = agentSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await agentActionLoaders[id]!())
}

/** 60 级满突破、独立核心培养表；不含配装、被动属性转化或战斗增益。 */
export async function loadAgentLevel60Attributes(
  name: AgentName,
): Promise<AgentLevel60Attributes | undefined> {
  const id = agentSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await agentAttributeLoaders[id]!())
}

/** 60 级满突破的音擎基础/高级属性；不含精炼效果。 */
export async function loadWEngineLevel60Attributes(
  name: WEngineName,
): Promise<WEngineLevel60Attributes | undefined> {
  const id = wEngineSourceId(name)
  return id === undefined
    ? undefined
    : structuredClone(await wEngineAttributeLoaders[id]!())
}

/** S 级满强化主词条与副词条每档值；每次读取返回独立对象树。 */
export async function loadSDriveDiscMaxLevelAffixes(): Promise<SDriveDiscMaxLevelAffixes> {
  return structuredClone(await driveDiscAffixesLoader())
}

/** 加载完整索引及来源记录（发布排版已压缩，值与键顺序不变），不加载实体；每次返回独立对象树。加载失败时拒绝 Promise。 */
export async function loadIndex(): Promise<IntegratedSnapshotIndex> {
  return structuredClone(await indexLoader())
}

/** 精确英文名称对应的公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引或详情，每次返回独立对象树。 */
export async function loadAgentData(
  name: AgentName,
): Promise<AgentData | undefined> {
  return agentReader.loadData(name)
}

/** 只读取指定成员显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadAgentDetails(
  name: AgentName,
  locale: DetailLocale,
): Promise<AgentDetails | undefined> {
  return agentReader.loadDetails(name, locale)
}

/** 显式加载全部公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。每次返回独立对象树。 */
export async function loadAllAgents(
  locale: DetailLocale,
): Promise<Record<AgentName, LocalizedAgent>> {
  return agentReader.loadAll(locale)
}

/** 显式加载全部代理人公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllAgentData(): Promise<
  Record<AgentName, AgentData>
> {
  return agentReader.loadAllData()
}

/** 精确英文名称对应的驱动盘套装公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引、详情或代理人，每次返回独立对象树。 */
export async function loadDriveDiscData(
  name: DriveDiscName,
): Promise<DriveDiscData | undefined> {
  return driveDiscReader.loadData(name)
}

/** 只读取指定驱动盘套装显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadDriveDiscDetails(
  name: DriveDiscName,
  locale: DetailLocale,
): Promise<DriveDiscDetails | undefined> {
  return driveDiscReader.loadDetails(name, locale)
}

/** 显式加载全部驱动盘套装公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。不加载代理人或索引，每次返回独立对象树。 */
export async function loadAllDriveDiscs(
  locale: DetailLocale,
): Promise<Record<DriveDiscName, LocalizedDriveDisc>> {
  return driveDiscReader.loadAll(locale)
}

/** 显式加载全部驱动盘套装公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllDriveDiscData(): Promise<
  Record<DriveDiscName, DriveDiscData>
> {
  return driveDiscReader.loadAllData()
}

/** 精确英文名称对应的 WEngine 公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引、详情或其他类别，每次返回独立对象树。 */
export async function loadWEngineData(
  name: WEngineName,
): Promise<WEngineData | undefined> {
  return wEngineReader.loadData(name)
}

/** 只读取指定 WEngine 显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadWEngineDetails(
  name: WEngineName,
  locale: DetailLocale,
): Promise<WEngineDetails | undefined> {
  return wEngineReader.loadDetails(name, locale)
}

/** 显式加载全部 WEngine 公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。不加载代理人、驱动盘或索引，每次返回独立对象树。 */
export async function loadAllWEngines(
  locale: DetailLocale,
): Promise<Record<WEngineName, LocalizedWEngine>> {
  return wEngineReader.loadAll(locale)
}

/** 显式加载全部 WEngine 公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllWEngineData(): Promise<
  Record<WEngineName, WEngineData>
> {
  return wEngineReader.loadAllData()
}

/** 精确英文名称对应的邦布公共资料；未知字符串返回 undefined，非字符串以 TypeError 拒绝。不加载索引、详情或其他类别，每次返回独立对象树。 */
export async function loadBangbooData(
  name: BangbooName,
): Promise<BangbooData | undefined> {
  return bangbooReader.loadData(name)
}

/** 只读取指定邦布显式 zh/en 详情，无语言回退；未知字符串返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadBangbooDetails(
  name: BangbooName,
  locale: DetailLocale,
): Promise<BangbooDetails | undefined> {
  return bangbooReader.loadDetails(name, locale)
}

/** 显式加载全部邦布公共资料和指定语言详情，以英文名称为 key；任一必要文件失败则整体拒绝。不加载代理人、驱动盘、WEngine 或索引，每次返回独立对象树。 */
export async function loadAllBangboos(
  locale: DetailLocale,
): Promise<Record<BangbooName, LocalizedBangboo>> {
  return bangbooReader.loadAll(locale)
}

/** 显式加载全部邦布公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllBangbooData(): Promise<
  Record<BangbooName, BangbooData>
> {
  return bangbooReader.loadAllData()
}

/**
 * 精确来源 ID 对应的怪物公共资料；ID 是规范十进制字符串，不 trim、不转换数值、
 * 不解析科学计数法或补零。未登记字符串返回 undefined，非字符串以 TypeError 拒绝。
 * 不加载索引、详情或其他类别，每次返回独立对象树。
 */
export async function loadMonsterData(
  id: MonsterId,
): Promise<MonsterData | undefined> {
  return monsterReader.loadData(id)
}

/** 只读取指定怪物显式 zh/en 详情，无语言回退；未登记 ID 返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadMonsterDetails(
  id: MonsterId,
  locale: DetailLocale,
): Promise<MonsterDetails | undefined> {
  return monsterReader.loadDetails(id, locale)
}

/** 显式加载全部怪物公共资料和指定语言详情，以来源 ID 为 key；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllMonsters(
  locale: DetailLocale,
): Promise<Record<MonsterId, LocalizedMonster>> {
  return monsterReader.loadAll(locale)
}

/** 显式加载全部怪物公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllMonsterData(): Promise<
  Record<MonsterId, MonsterData>
> {
  return monsterReader.loadAllData()
}

/**
 * 精确来源 ID 对应的 Shiyu 区域公共资料；ID 是规范十进制字符串，不 trim、不转换数值、
 * 不解析科学计数法或补零。未登记字符串返回 undefined，非字符串以 TypeError 拒绝。
 * 不加载索引、详情或其他类别，每次返回独立对象树。
 */
export async function loadShiyuData(
  id: ShiyuId,
): Promise<ShiyuData | undefined> {
  return shiyuReader.loadData(id)
}

/** 只读取指定 Shiyu 区域显式 zh/en 详情，无语言回退；未登记 ID 返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadShiyuDetails(
  id: ShiyuId,
  locale: DetailLocale,
): Promise<ShiyuDetails | undefined> {
  return shiyuReader.loadDetails(id, locale)
}

/** 显式加载全部 Shiyu 区域公共资料和指定语言详情，以来源 ID 为 key；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllShiyu(
  locale: DetailLocale,
): Promise<Record<ShiyuId, LocalizedShiyu>> {
  return shiyuReader.loadAll(locale)
}

/** 显式加载全部 Shiyu 区域公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllShiyuData(): Promise<Record<ShiyuId, ShiyuData>> {
  return shiyuReader.loadAllData()
}

/**
 * 精确来源 ID 对应的 Boss 试炼公共资料；ID 是规范十进制字符串，不 trim、不转换数值、
 * 不解析科学计数法或补零。未登记字符串返回 undefined，非字符串以 TypeError 拒绝。
 * 不加载索引、详情或其他类别，每次返回独立对象树。
 */
export async function loadBossData(id: BossId): Promise<BossData | undefined> {
  return bossReader.loadData(id)
}

/** 只读取指定 Boss 试炼显式 zh/en 详情，无语言回退；未登记 ID 返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadBossDetails(
  id: BossId,
  locale: DetailLocale,
): Promise<BossDetails | undefined> {
  return bossReader.loadDetails(id, locale)
}

/** 显式加载全部 Boss 试炼公共资料和指定语言详情，以来源 ID 为 key；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllBosses(
  locale: DetailLocale,
): Promise<Record<BossId, LocalizedBoss>> {
  return bossReader.loadAll(locale)
}

/** 显式加载全部 Boss 试炼公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllBossData(): Promise<Record<BossId, BossData>> {
  return bossReader.loadAllData()
}

/**
 * 精确来源 ID 对应的 Simul 模拟战公共资料；ID 是规范十进制字符串，不 trim、不转换数值、
 * 不解析科学计数法或补零。未登记字符串返回 undefined，非字符串以 TypeError 拒绝。
 * 不加载索引、详情或其他类别，每次返回独立对象树。
 */
export async function loadSimulData(
  id: SimulId,
): Promise<SimulData | undefined> {
  return simulReader.loadData(id)
}

/** 只读取指定 Simul 模拟战显式 zh/en 详情，无语言回退；未登记 ID 返回 undefined，非法参数以 TypeError 拒绝。加载失败不吞错，每次返回独立对象树。 */
export async function loadSimulDetails(
  id: SimulId,
  locale: DetailLocale,
): Promise<SimulDetails | undefined> {
  return simulReader.loadDetails(id, locale)
}

/** 显式加载全部 Simul 模拟战公共资料和指定语言详情，以来源 ID 为 key；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllSimul(
  locale: DetailLocale,
): Promise<Record<SimulId, LocalizedSimul>> {
  return simulReader.loadAll(locale)
}

/** 显式加载全部 Simul 模拟战公共资料，不加载任何详情；任一必要文件失败则整体拒绝。不加载其他类别或索引，每次返回独立对象树。 */
export async function loadAllSimulData(): Promise<Record<SimulId, SimulData>> {
  return simulReader.loadAllData()
}

export { calculationDataVersion } from "../.generated/calculation-data.ts"
import {
  calculationDataVersion,
  staticPanelRules,
} from "../.generated/calculation-data.ts"
import type { StaticCalculationData } from "@randomplay/shared"
export type {
  StaticCalculationData,
  CalculationDataVersion,
  StaticPanelRules,
  AgentPanelRules,
} from "@randomplay/shared"

/** 选择包含未登记来源 ID 时 loadStaticCalculationData 的拒绝原因；一次列出全部未知 ID，不因第一个失败短路。 */
export class UnknownCalculationEntitiesError extends Error {
  /** 未登记的代理人来源 ID；保持选择中的原序与重复。 */
  readonly agents: readonly string[]
  /** 未登记的 WEngine 来源 ID；保持选择中的原序与重复。 */
  readonly wEngines: readonly string[]

  constructor(agents: readonly string[], wEngines: readonly string[]) {
    super(
      `Unknown calculation entities: agents [${agents.join(", ")}], w-engines [${wEngines.join(", ")}]`,
    )
    this.name = "UnknownCalculationEntitiesError"
    this.agents = agents
    this.wEngines = wEngines
  }
}

function assertSourceIdArray(
  value: unknown,
  label: string,
): asserts value is readonly string[] {
  if (!Array.isArray(value))
    throw new TypeError(`${label} must be an array of source IDs`)
  for (const id of value)
    if (typeof id !== "string")
      throw new TypeError(`${label} must be an array of source IDs`)
}

/**
 * 按需读取一次静态计算所需的同版资料。core 只接收返回值，不调用本包。
 * selection 必须是含 agents、wEngines 两个来源 ID 字符串数组的对象，否则以 TypeError 拒绝；
 * 任一未登记 ID（含传入英文名称）以 UnknownCalculationEntitiesError 一次性列出全部未知项后拒绝，
 * 已登记文件缺失或解析失败同样拒绝，不转换为部分结果。
 */
export async function loadStaticCalculationData(selection: {
  readonly agents: readonly AgentSourceId[]
  readonly wEngines: readonly WEngineSourceId[]
}): Promise<StaticCalculationData> {
  if (typeof selection !== "object" || selection === null)
    throw new TypeError(
      "selection must be an object with agents and wEngines arrays",
    )
  assertSourceIdArray(selection.agents, "agents")
  assertSourceIdArray(selection.wEngines, "wEngines")
  const unknownAgents = selection.agents.filter(
    (id) => !Object.hasOwn(agentNamesBySourceId, id),
  )
  const unknownWEngines = selection.wEngines.filter(
    (id) => !Object.hasOwn(wEngineNamesBySourceId, id),
  )
  if (unknownAgents.length > 0 || unknownWEngines.length > 0)
    throw new UnknownCalculationEntitiesError(unknownAgents, unknownWEngines)
  const [agents, wEngines, driveDiscAffixes, definitions, catalog] =
    await Promise.all([
      Promise.all(
        selection.agents.map(async (id) => {
          const [attributes, actions] = await Promise.all([
            agentAttributeLoaders[id]!(),
            agentActionLoaders[id]!(),
          ])
          return { attributes, actions }
        }),
      ),
      Promise.all(
        selection.wEngines.map((id) => wEngineAttributeLoaders[id]!()),
      ),
      driveDiscAffixesLoader(),
      staticEffectDefinitionsLoader(),
      staticEffectCatalogLoader(),
    ])
  return structuredClone({
    version: calculationDataVersion,
    agents,
    wEngines,
    driveDiscAffixes,
    definitions,
    catalog,
    panelRules: staticPanelRules,
  })
}

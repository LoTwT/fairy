import type {
  AgentAttributeLabel,
  AgentDetails,
  AgentListItem,
  AgentSpecialtyLabel,
  AttackTypeLabel,
  GachabaseId,
  GachabaseMaxLevel,
  GachabaseName,
  GachabasePromotion,
  GachabaseRarity,
  GachabaseStatId,
  GachabaseStatValue,
} from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { calcAgentStat } from "zzz-data"
import {
  findBestMatch,
  findTopMatches,
  loadJson,
  normalizeAttribute,
  normalizeSpecialty,
  stripHtml,
} from "./utils"

export type LookupAgentQueryName = string

export type LookupAgentLocale = "en" | "zh-CN"

export type LookupAgentId = GachabaseId

export type LookupAgentName = GachabaseName

export type LookupAgentRarity = GachabaseRarity

export type LookupAgentSpecialty = AgentSpecialtyLabel

export type LookupAgentAttribute = AgentAttributeLabel

export type LookupAgentAttributeList = LookupAgentAttribute[]

export type LookupAgentAttackType = AttackTypeLabel

export type LookupAgentAttackTypeList = LookupAgentAttackType[]

export interface LookupAgentListItemSummary {
  id: LookupAgentId
  name: LookupAgentName
  rarity: LookupAgentRarity
  specialty: LookupAgentSpecialty
  attributes: LookupAgentAttributeList
  attackTypes: LookupAgentAttackTypeList
}

export type LookupAgentListItemSummaryList = LookupAgentListItemSummary[]

export interface LookupAgentCandidate {
  name: LookupAgentName
  rarity: LookupAgentRarity
  specialty: LookupAgentSpecialty
}

export type LookupAgentCandidateList = LookupAgentCandidate[]

export type LookupAgentSkillTypeValue = string

export type LookupAgentSkillTypeList = LookupAgentSkillTypeValue[]

export type LookupAgentCalculatedStatName = string

export type LookupAgentCalculatedStatValue = number

export type LookupAgentCalculatedStatMap = Record<
  LookupAgentCalculatedStatName,
  LookupAgentCalculatedStatValue
>

export type LookupAgentStatBoostStatId = GachabaseStatId

export type LookupAgentStatBoostValue = GachabaseStatValue

export interface LookupAgentStatBoostEntry {
  statId: LookupAgentStatBoostStatId
  value: LookupAgentStatBoostValue
}

export type LookupAgentStatBoostEntryList = LookupAgentStatBoostEntry[]

export type LookupAgentPromotionValue = GachabasePromotion

export type LookupAgentPromotionMaxLevel = GachabaseMaxLevel

export interface LookupAgentPromotionEntry {
  promotion: LookupAgentPromotionValue
  maxLevel: LookupAgentPromotionMaxLevel
  statBoosts: LookupAgentStatBoostEntryList
}

export type LookupAgentPromotionList = LookupAgentPromotionEntry[]

export type LookupAgentSkillGroupId = string

export type LookupAgentSkillGroupName = string

export type LookupAgentSkillDescriptionName = string

export type LookupAgentSkillDescriptionText = string

export interface LookupAgentSkillDescriptionEntry {
  name: LookupAgentSkillDescriptionName
  description: LookupAgentSkillDescriptionText
}

export type LookupAgentSkillDescriptionEntryList =
  LookupAgentSkillDescriptionEntry[]

export type LookupAgentSkillStatName = string

export type LookupAgentSkillStatValueText = string

export type LookupAgentSkillStatValueList = LookupAgentSkillStatValueText[]

export interface LookupAgentSkillStatEntry {
  name: LookupAgentSkillStatName
  values: LookupAgentSkillStatValueList
}

export type LookupAgentSkillStatEntryList = LookupAgentSkillStatEntry[]

export interface LookupAgentSkillGroupEntry {
  typeId: LookupAgentSkillGroupId
  typeName: LookupAgentSkillGroupName
  descriptions: LookupAgentSkillDescriptionEntryList
  stats: LookupAgentSkillStatEntryList
}

export type LookupAgentSkillGroupEntryList = LookupAgentSkillGroupEntry[]

export type LookupAgentCoreSkillLevel = number

export type LookupAgentCoreSkillTypeName = string

export interface LookupAgentCoreSkillEntry {
  level: LookupAgentCoreSkillLevel
  typeName: LookupAgentCoreSkillTypeName
  skills: LookupAgentSkillDescriptionEntryList
  statBoosts: LookupAgentStatBoostEntryList
}

export type LookupAgentCoreSkillEntryList = LookupAgentCoreSkillEntry[]

export type LookupAgentMindscapeLevel = number

export type LookupAgentMindscapeName = string

export type LookupAgentMindscapeDescriptionText = string

export interface LookupAgentMindscapeEntry {
  level: LookupAgentMindscapeLevel
  name: LookupAgentMindscapeName
  description: LookupAgentMindscapeDescriptionText
}

export type LookupAgentMindscapeEntryList = LookupAgentMindscapeEntry[]

export type LookupAgentStatEntryId = string

export type LookupAgentStatEntryName = string

export type LookupAgentStatEntryValue = number

export type LookupAgentStatGrowthPerLevel = number | null

export interface LookupAgentStatEntry {
  id: LookupAgentStatEntryId
  name: LookupAgentStatEntryName
  value: LookupAgentStatEntryValue
  growthPerLevel: LookupAgentStatGrowthPerLevel
}

export type LookupAgentStatEntryList = LookupAgentStatEntry[]

export type LookupAgentFullName = GachabaseName

export type LookupAgentOptionalRarity = LookupAgentRarity | undefined

export type LookupAgentOptionalSpecialty = LookupAgentSpecialty | undefined

export type LookupAgentOptionalAttributeList =
  | LookupAgentAttributeList
  | undefined

export type LookupAgentOptionalAttackTypeList =
  | LookupAgentAttackTypeList
  | undefined

export interface LookupAgentTrimmedResult {
  id: LookupAgentId
  fullName: LookupAgentFullName
  name: LookupAgentName | LookupAgentFullName
  rarity: LookupAgentOptionalRarity
  specialty: LookupAgentOptionalSpecialty
  attributes: LookupAgentOptionalAttributeList
  attackTypes: LookupAgentOptionalAttackTypeList
  calculatedStats: LookupAgentCalculatedStatMap | undefined
  skills: LookupAgentSkillGroupEntryList
  coreSkills: LookupAgentCoreSkillEntryList
  mindscapes: LookupAgentMindscapeEntryList
  stats?: LookupAgentStatEntryList
  promotions?: LookupAgentPromotionList
}

function findAgent(name: LookupAgentQueryName, locale: LookupAgentLocale) {
  const details = loadJson<AgentDetails[]>(`data/${locale}/agent-details.json`)
  const list = loadJson<AgentListItem[]>(`data/${locale}/agents.json`)

  // Try matching against short name/slug in list first (most common input)
  let detail: AgentDetails | undefined
  const listMatch = findBestMatch(list, name, [(a) => a.name, (a) => a.slug])
  if (listMatch) {
    detail = details.find((a) => a.id === listMatch.id)
  }

  // Fallback: match against fullName in details
  if (!detail) {
    detail = findBestMatch(details, name, [(a) => a.fullName])
  }

  if (!detail) return null

  const listItem = list.find((a) => a.id === detail!.id)
  return { detail, listItem }
}

function normalizeSkillToken(
  value: LookupAgentSkillTypeValue,
): LookupAgentSkillTypeValue {
  return value.toLowerCase().replace(/[\s\-_·・.()（）【】[\]「」]/g, "")
}

function trimAgent(
  detail: AgentDetails,
  listItem: AgentListItem | undefined,
  level?: number,
  promotion?: number,
  coreSkillLevel?: number,
  mindscape?: number,
  compact = false,
  skillTypes?: LookupAgentSkillTypeList,
) {
  // Calculate stats if level params provided
  let calculatedStats: LookupAgentCalculatedStatMap | undefined
  if (level !== undefined) {
    const promo = promotion ?? 6
    const coreLevel = coreSkillLevel ?? 7
    calculatedStats = {}

    for (const stat of detail.stats) {
      let promoBoost = 0
      const promoData = detail.promotions[promo - 1]
      if (promoData) {
        const boost = promoData.statBoosts.find((b) => b.statId === stat.id)
        if (boost) promoBoost = boost.value
      }

      let coreBoost = 0
      const coreData = detail.coreSkills.find((c) => c.level === coreLevel)
      if (coreData) {
        const boost = coreData.statBoosts.find((b) => b.statId === stat.id)
        if (boost) coreBoost = boost.value
      }

      if (stat.growthPerLevel !== null) {
        calculatedStats[stat.name] = calcAgentStat(
          stat.value,
          stat.growthPerLevel,
          level,
          promoBoost,
          coreBoost,
        )
      } else {
        calculatedStats[stat.name] = stat.value + promoBoost + coreBoost
      }
    }
  }

  // Trim skills — strip HTML, keep descriptions and stats
  const requestedSkillTypes: LookupAgentSkillTypeList =
    skillTypes?.map(normalizeSkillToken) ?? []
  const skills: LookupAgentSkillGroupEntryList = detail.skills
    .filter((sg) => {
      if (!requestedSkillTypes.length) return true
      return requestedSkillTypes.some(
        (token) =>
          normalizeSkillToken(sg.typeId) === token ||
          normalizeSkillToken(sg.typeName) === token,
      )
    })
    .map(
      (sg) =>
        ({
          typeId: sg.typeId,
          typeName: sg.typeName,
          descriptions: sg.descriptions.map(
            (d) =>
              ({
                name: d.name,
                description: stripHtml(d.description),
              }) satisfies LookupAgentSkillDescriptionEntry,
          ),
          stats: sg.stats.map(
            (s) =>
              ({
                name: s.name,
                values: s.values,
              }) satisfies LookupAgentSkillStatEntry,
          ),
        }) satisfies LookupAgentSkillGroupEntry,
    )

  // Trim core skills — filter first, then map to avoid unnecessary stripHtml
  const filteredCoreSkills: LookupAgentCoreSkillEntryList = (
    coreSkillLevel !== undefined
      ? detail.coreSkills.filter((c) => c.level === coreSkillLevel)
      : detail.coreSkills
  ).map(
    (c) =>
      ({
        level: c.level,
        typeName: c.typeName,
        skills: c.skills.map(
          (s) =>
            ({
              name: s.name,
              description: stripHtml(s.description),
            }) satisfies LookupAgentSkillDescriptionEntry,
        ),
        statBoosts: c.statBoosts.map(
          (boost) =>
            ({
              statId: boost.statId,
              value: boost.value,
            }) satisfies LookupAgentStatBoostEntry,
        ),
      }) satisfies LookupAgentCoreSkillEntry,
  )

  // Trim mindscapes — only include up to requested level; 0 or undefined → empty
  const mindscapes: LookupAgentMindscapeEntryList =
    mindscape !== undefined && mindscape > 0
      ? detail.mindscapes
          .filter((m) => m.level <= mindscape)
          .map(
            (m) =>
              ({
                level: m.level,
                name: m.name,
                description: stripHtml(m.description),
              }) satisfies LookupAgentMindscapeEntry,
          )
      : []

  // When calculatedStats is available, omit raw stats/promotions to reduce context
  const result: LookupAgentTrimmedResult = {
    id: detail.id,
    fullName: detail.fullName,
    name: listItem?.name ?? detail.fullName,
    rarity: listItem?.rarity,
    specialty: listItem?.specialty,
    attributes: listItem?.attributes,
    attackTypes: listItem?.attackTypes,
    calculatedStats,
    skills,
    coreSkills: filteredCoreSkills,
    mindscapes,
  }

  if (!compact && !calculatedStats) {
    result.stats = detail.stats.map(
      (s) =>
        ({
          id: s.id,
          name: s.name,
          value: s.value,
          growthPerLevel: s.growthPerLevel,
        }) satisfies LookupAgentStatEntry,
    )
    result.promotions = detail.promotions.map(
      (promotion) =>
        ({
          promotion: promotion.promotion,
          maxLevel: promotion.maxLevel,
          statBoosts: promotion.statBoosts.map(
            (boost) =>
              ({
                statId: boost.statId,
                value: boost.value,
              }) satisfies LookupAgentStatBoostEntry,
          ),
        }) satisfies LookupAgentPromotionEntry,
    )
  }

  return result
}

export const lookupAgent = createTool({
  id: "lookup-agent",
  description:
    "查询绝区零代理人详细数据（属性、技能、核心技、影画），可选计算指定等级下的面板属性。不传 name 时返回代理人简要列表（支持筛选）。",
  inputSchema: z.object({
    name: z
      .string()
      .optional()
      .describe("代理人名称（支持模糊匹配，中英文均可）。不传则返回列表"),
    rarity: z
      .number()
      .optional()
      .describe("按稀有度筛选（如 4=S级, 3=A级），仅列表模式"),
    specialty: z
      .string()
      .optional()
      .describe(
        "按定位筛选（Attack/Stun/Anomaly/Support/Defense 或中文），仅列表模式",
      ),
    attribute: z
      .string()
      .optional()
      .describe(
        "按属性筛选（Ice/Fire/Electric/Ether/Physical 或中文），仅列表模式",
      ),
    level: z
      .number()
      .min(1)
      .max(60)
      .optional()
      .describe("代理人等级 1-60，传入则计算属性"),
    compact: z
      .boolean()
      .optional()
      .default(false)
      .describe("详细查询时仅返回伤害计算常用字段，减少上下文体积"),
    skillTypes: z
      .array(z.string())
      .optional()
      .describe(
        "仅返回指定技能组，如 ['普通攻击', '特殊技', '终结技'] 或内部 typeId/typeName",
      ),
    promotion: z
      .number()
      .min(0)
      .max(6)
      .optional()
      .describe("突破等级 0-6，默认 6"),
    coreSkillLevel: z
      .number()
      .min(1)
      .max(7)
      .optional()
      .describe("核心技等级：1=无核心技，2-7=A-F，默认 7(F)"),
    mindscape: z
      .number()
      .min(0)
      .max(6)
      .optional()
      .describe("影画等级 0-6，0=无影画"),
    locale: z
      .enum(["en", "zh-CN"])
      .optional()
      .default("zh-CN")
      .describe("数据语言"),
  }),
  execute: async (input) => {
    const {
      name,
      rarity,
      specialty,
      attribute,
      level,
      compact,
      skillTypes,
      promotion,
      coreSkillLevel,
      mindscape,
      locale,
    } = input
    const list = loadJson<AgentListItem[]>(`data/${locale}/agents.json`)

    // List mode: no name provided
    if (!name) {
      let filtered = list
      if (rarity !== undefined)
        filtered = filtered.filter((a) => a.rarity === rarity)
      if (specialty) {
        const specialtyKey = normalizeSpecialty(specialty)
        filtered = specialtyKey
          ? filtered.filter(
              (a) => normalizeSpecialty(a.specialty) === specialtyKey,
            )
          : []
      }
      if (attribute) {
        const attributeKey = normalizeAttribute(attribute)
        filtered = attributeKey
          ? filtered.filter((a) =>
              a.attributes.some(
                (attr) => normalizeAttribute(attr) === attributeKey,
              ),
            )
          : []
      }
      return {
        found: true,
        total: filtered.length,
        agents: filtered.map(
          (a) =>
            ({
              id: a.id,
              name: a.name,
              rarity: a.rarity,
              specialty: a.specialty,
              attributes: a.attributes,
              attackTypes: a.attackTypes,
            }) satisfies LookupAgentListItemSummary,
        ),
      }
    }

    // Lookup mode
    const result = findAgent(name, locale)
    if (!result) {
      const candidates = findTopMatches(
        list,
        name,
        [(a) => a.name, (a) => a.slug],
        3,
      )
      return {
        found: false,
        message: `未找到名称包含「${name}」的代理人`,
        candidates: candidates.map(
          (a) =>
            ({
              name: a.name,
              rarity: a.rarity,
              specialty: a.specialty,
            }) satisfies LookupAgentCandidate,
        ),
      }
    }
    return {
      found: true,
      agent: trimAgent(
        result.detail,
        result.listItem,
        level,
        promotion,
        coreSkillLevel,
        mindscape,
        compact,
        skillTypes,
      ),
    }
  },
})

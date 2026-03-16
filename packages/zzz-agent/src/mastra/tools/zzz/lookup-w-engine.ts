import type { WEngineDetails, WEngineListItem } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { calcWEngineBaseATK, calcWEngineSecondaryStat } from "zzz-data"
import {
  findBestMatch,
  findTopMatches,
  loadJson,
  normalizeSpecialty,
  stripHtml,
} from "./utils"

export type LookupWEngineQueryName = string

export type LookupWEngineLocale = "en" | "zh-CN"

export type LookupWEngineListItemId = WEngineListItem["id"]

export type LookupWEngineListItemName = WEngineListItem["name"]

export type LookupWEngineListItemRarity = WEngineListItem["rarity"]

export type LookupWEngineSpecialtyName = string

export type LookupWEngineExclusiveAgentName = string | undefined

export interface LookupWEngineListItemSummary {
  id: LookupWEngineListItemId
  name: LookupWEngineListItemName
  rarity: LookupWEngineListItemRarity
  specialty: LookupWEngineSpecialtyName
  exclusiveAgentName: LookupWEngineExclusiveAgentName
}

export type LookupWEngineListItemSummaryList = LookupWEngineListItemSummary[]

export interface LookupWEngineCandidate {
  name: LookupWEngineListItemName
  rarity: LookupWEngineListItemRarity
  specialty: LookupWEngineSpecialtyName
}

export type LookupWEngineCandidateList = LookupWEngineCandidate[]

export type LookupWEngineCalculatedAttack = number | undefined

export type LookupWEngineCalculatedSecondaryStatName = string

export type LookupWEngineCalculatedSecondaryStatValue = number

export interface LookupWEngineCalculatedSecondaryStat {
  name: LookupWEngineCalculatedSecondaryStatName
  value: LookupWEngineCalculatedSecondaryStatValue
}

export type LookupWEngineEffectLevel = number

export type LookupWEngineEffectName = string

export type LookupWEngineEffectText = string

export interface LookupWEngineActiveEffect {
  level: LookupWEngineEffectLevel
  name: LookupWEngineEffectName
  effect: LookupWEngineEffectText
}

export type LookupWEngineTrimmedResultKey = string

export type LookupWEngineTrimmedValue = unknown

export type LookupWEngineTrimmedResult = Record<
  LookupWEngineTrimmedResultKey,
  LookupWEngineTrimmedValue
>

export const lookupWEngine = createTool({
  id: "lookup-w-engine",
  description:
    "查询绝区零音擎数据（基础攻击力、副属性、被动效果），可选计算指定等级/突破下的面板数值。不传 name 时返回音擎简要列表（支持筛选）。",
  inputSchema: z.object({
    name: z
      .string()
      .optional()
      .describe("音擎名称（支持模糊匹配，中英文均可）。不传则返回列表"),
    rarity: z
      .number()
      .optional()
      .describe("按稀有度筛选（如 4=S级, 3=A级, 2=B级），仅列表模式"),
    specialty: z
      .string()
      .optional()
      .describe(
        "按适用定位筛选（Attack/Stun/Anomaly/Support/Defense 或中文），仅列表模式",
      ),
    level: z
      .number()
      .min(1)
      .max(60)
      .optional()
      .describe("音擎等级 1-60，传入则计算属性"),
    compact: z
      .boolean()
      .optional()
      .default(false)
      .describe("详细查询时仅返回伤害计算常用字段，减少上下文体积"),
    star: z.number().min(1).max(5).optional().describe("突破星级 1-5，默认 5"),
    refinement: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .describe("精炼等级 1-5，默认 1"),
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
      level,
      compact,
      star,
      refinement,
      locale,
    } = input
    const engines = loadJson<WEngineListItem[]>(`data/${locale}/w-engines.json`)

    // List mode: no name provided
    if (!name) {
      let filtered = engines
      if (rarity !== undefined)
        filtered = filtered.filter((e) => e.rarity === rarity)
      if (specialty) {
        const specialtyKey = normalizeSpecialty(specialty)
        filtered = specialtyKey
          ? filtered.filter(
              (e) => normalizeSpecialty(e.specialty.name) === specialtyKey,
            )
          : []
      }
      return {
        found: true,
        total: filtered.length,
        wEngines: filtered.map(
          (e) =>
            ({
              id: e.id,
              name: e.name,
              rarity: e.rarity,
              specialty: e.specialty.name,
              exclusiveAgentName: e.exclusiveAgentName,
            }) satisfies LookupWEngineListItemSummary,
        ),
      }
    }

    // Lookup mode
    const engine = findBestMatch(engines, name, [(e) => e.name, (e) => e.slug])
    if (!engine) {
      const candidates = findTopMatches(
        engines,
        name,
        [(e) => e.name, (e) => e.slug],
        3,
      )
      return {
        found: false,
        message: `未找到名称包含「${name}」的音擎`,
        candidates: candidates.map(
          (e) =>
            ({
              name: e.name,
              rarity: e.rarity,
              specialty: e.specialty.name,
            }) satisfies LookupWEngineCandidate,
        ),
      }
    }

    const details = loadJson<WEngineDetails[]>(
      `data/${locale}/w-engine-details.json`,
    )
    const detail = details.find((d) => d.id === engine.id)

    // Calculate stats if level provided
    let calculatedATK: LookupWEngineCalculatedAttack
    let calculatedSecondaryStat:
      | LookupWEngineCalculatedSecondaryStat
      | undefined

    if (level !== undefined && detail) {
      const s = star ?? 5
      const lvData = detail.levels.find((l) => l.level === level)
      const starData = detail.stars.find((st) => st.star === s)

      if (lvData && starData) {
        calculatedATK = calcWEngineBaseATK(
          engine.baseStat.value,
          lvData.baseStatGrowth,
          starData.baseStatGrowth,
        )
        calculatedSecondaryStat = {
          name: engine.advancedStat.name,
          value: calcWEngineSecondaryStat(
            engine.advancedStat.value,
            starData.advancedStatGrowth,
          ),
        }
      }
    }

    // Pick the refinement-level effect
    const ref = refinement ?? 1
    const activeEffect = engine.effects[ref - 1]

    // When calculated values are available, omit raw baseStat/advancedStat to reduce context
    const wEngine: LookupWEngineTrimmedResult = {
      id: engine.id,
      name: engine.name,
      rarity: engine.rarity,
      specialty: engine.specialty.name,
      exclusiveAgentName: engine.exclusiveAgentName,
      calculatedATK,
      calculatedSecondaryStat,
      activeEffect: activeEffect
        ? ({
            level: activeEffect.level,
            name: activeEffect.name,
            effect: stripHtml(activeEffect.effect),
          } satisfies LookupWEngineActiveEffect)
        : null,
    }

    if (!compact && !calculatedATK) {
      wEngine.baseStat = engine.baseStat
      wEngine.advancedStat = engine.advancedStat
    }

    return { found: true, wEngine }
  },
})

import type { BangbooItem } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { calcBangbooStat } from "zzz-data"
import { findBestMatch, findTopMatches, loadJson, stripHtml } from "./utils"

export type LookupBangbooQueryName = string

export type LookupBangbooLocale = "en" | "zh-CN"

export type LookupBangbooId = BangbooItem["id"]

export type LookupBangbooName = BangbooItem["name"]

export type LookupBangbooRarity = BangbooItem["rarity"]

export interface LookupBangbooListItemSummary {
  id: LookupBangbooId
  name: LookupBangbooName
  rarity: LookupBangbooRarity
}

export type LookupBangbooListItemSummaryList = LookupBangbooListItemSummary[]

export interface LookupBangbooCandidate {
  name: LookupBangbooName
  rarity: LookupBangbooRarity
}

export type LookupBangbooCandidateList = LookupBangbooCandidate[]

export type LookupBangbooCalculatedStatName = string

export type LookupBangbooCalculatedStatValue = number

export type LookupBangbooCalculatedStatMap = Record<
  LookupBangbooCalculatedStatName,
  LookupBangbooCalculatedStatValue
>

export type LookupBangbooSkillTypeId = string

export type LookupBangbooSkillName = string

export type LookupBangbooSkillDescriptionText = string

export type LookupBangbooSkillStatTitle =
  BangbooItem["skills"][number]["stats"][number]["title"]

export type LookupBangbooSkillStatValueText = string

export type LookupBangbooSkillStatValueList = LookupBangbooSkillStatValueText[]

export interface LookupBangbooSkillStatEntry {
  title: LookupBangbooSkillStatTitle
  values: LookupBangbooSkillStatValueList
}

export type LookupBangbooSkillStatList = LookupBangbooSkillStatEntry[]

export interface LookupBangbooSkillEntry {
  typeId: LookupBangbooSkillTypeId
  name: LookupBangbooSkillName
  description: LookupBangbooSkillDescriptionText
  stats: LookupBangbooSkillStatList
}

export type LookupBangbooSkillEntryList = LookupBangbooSkillEntry[]

export type LookupBangbooBaseStatId = BangbooItem["baseStats"][number]["id"]

export type LookupBangbooBaseStatName = BangbooItem["baseStats"][number]["name"]

export type LookupBangbooBaseStatValue =
  BangbooItem["baseStats"][number]["value"]

export type LookupBangbooBaseStatGrowthPerLevel =
  BangbooItem["baseStats"][number]["growthPerLevel"]

export interface LookupBangbooBaseStatEntry {
  id: LookupBangbooBaseStatId
  name: LookupBangbooBaseStatName
  value: LookupBangbooBaseStatValue
  growthPerLevel: LookupBangbooBaseStatGrowthPerLevel
}

export type LookupBangbooBaseStatList = LookupBangbooBaseStatEntry[]

export interface LookupBangbooTrimmedResult {
  id: LookupBangbooId
  name: LookupBangbooName
  rarity: LookupBangbooRarity
  calculatedStats: LookupBangbooCalculatedStatMap | undefined
  skills: LookupBangbooSkillEntryList
  baseStats?: LookupBangbooBaseStatList
}

export const lookupBangboo = createTool({
  id: "lookup-bangboo",
  description:
    "查询绝区零邦布数据（属性、技能），可选计算指定等级/优化等级下的面板属性。不传 name 时返回邦布简要列表（支持筛选）。",
  inputSchema: z.object({
    name: z
      .string()
      .optional()
      .describe("邦布名称（支持模糊匹配，中英文均可）。不传则返回列表"),
    rarity: z
      .number()
      .optional()
      .describe("按稀有度筛选（如 4=S级, 3=A级, 2=B级），仅列表模式"),
    level: z
      .number()
      .min(1)
      .max(60)
      .optional()
      .describe("邦布等级 1-60，传入则计算属性"),
    optimization: z
      .number()
      .min(0)
      .max(6)
      .optional()
      .describe("优化等级 0-6，默认 6"),
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
      level,
      optimization,
      locale,
    }: {
      name?: LookupBangbooQueryName
      rarity?: number
      level?: number
      optimization?: number
      locale: LookupBangbooLocale
    } = input
    const bangboos = loadJson<BangbooItem[]>(`data/${locale}/bangboo.json`)

    // List mode: no name provided
    if (!name) {
      let filtered = bangboos
      if (rarity !== undefined)
        filtered = filtered.filter((b) => b.rarity === rarity)
      return {
        found: true,
        total: filtered.length,
        bangboos: filtered.map(
          (b) =>
            ({
              id: b.id,
              name: b.name,
              rarity: b.rarity,
            }) satisfies LookupBangbooListItemSummary,
        ),
      }
    }

    // Lookup mode
    const bangboo = findBestMatch(bangboos, name, [
      (b) => b.name,
      (b) => b.slug,
    ])
    if (!bangboo) {
      const candidates = findTopMatches(
        bangboos,
        name,
        [(b) => b.name, (b) => b.slug],
        3,
      )
      return {
        found: false,
        message: `未找到名称包含「${name}」的邦布`,
        candidates: candidates.map(
          (b) =>
            ({
              name: b.name,
              rarity: b.rarity,
            }) satisfies LookupBangbooCandidate,
        ),
      }
    }

    // Calculate stats if level provided
    let calculatedStats: LookupBangbooCalculatedStatMap | undefined
    if (level !== undefined) {
      const opt = optimization ?? 6
      calculatedStats = {}

      for (const stat of bangboo.baseStats) {
        let optBoost = 0
        const optData = bangboo.optimizations[opt - 1]
        if (optData) {
          const boost = optData.statBoosts.find((b) => b.statId === stat.id)
          if (boost) optBoost = boost.value
        }

        calculatedStats[stat.name] = calcBangbooStat(
          stat.value,
          stat.growthPerLevel ?? null,
          level,
          optBoost,
        )
      }
    }

    // When calculatedStats is available, omit raw baseStats to reduce context
    const result: LookupBangbooTrimmedResult = {
      id: bangboo.id,
      name: bangboo.name,
      rarity: bangboo.rarity,
      calculatedStats,
      skills: bangboo.skills.map(
        (s) =>
          ({
            typeId: s.typeId,
            name: s.name,
            description: stripHtml(s.description),
            stats: s.stats.map(
              (stat) =>
                ({
                  title: stat.title,
                  values: [...stat.values],
                }) satisfies LookupBangbooSkillStatEntry,
            ),
          }) satisfies LookupBangbooSkillEntry,
      ) satisfies LookupBangbooSkillEntryList,
    }

    if (!calculatedStats) {
      result.baseStats = bangboo.baseStats.map(
        (stat) =>
          ({
            id: stat.id,
            name: stat.name,
            value: stat.value,
            growthPerLevel: stat.growthPerLevel,
          }) satisfies LookupBangbooBaseStatEntry,
      )
    }

    return { found: true, bangboo: result }
  },
})

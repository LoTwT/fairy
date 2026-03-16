import type {
  AgentAttributeLabel,
  DeadlyAssaultJson,
  EncounterDamageContext,
  FlattenedEnemyView,
  ShiyuDefenseJson,
  ThresholdSimulationJson,
} from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  buildDADamageContext,
  buildSDDamageContext,
  buildTSDamageContext,
  findDAVersion,
  findDAVersionsByEnemyName,
  findSDVersion,
  findSDVersionsByEnemyName,
  findTSVersion,
  findTSVersionsByEnemyName,
  flattenSDEnemies,
  flattenTSEnemies,
  selectDAEnemy,
  selectSDEnemy,
  selectSDMode,
  selectTSEnemy,
  selectTSMode,
} from "zzz-data"
import { loadJson, normalizeDamageAttribute } from "./utils"

export type LookupGameModeAttributeInput = string | undefined

export type LookupGameModeEncounterCandidateName = string

export type LookupGameModeEncounterNode = number | undefined

export type LookupGameModeEncounterSide = number | undefined

export type LookupGameModeEncounterWave = number | undefined

export interface LookupGameModeEncounterCandidate {
  name: LookupGameModeEncounterCandidateName
  node: LookupGameModeEncounterNode
  side: LookupGameModeEncounterSide
  wave: LookupGameModeEncounterWave
}

export type LookupGameModeRecommendedResistance = number

export interface LookupGameModeDamageContext {
  enemyName: string
  attribute: NonNullable<ReturnType<typeof normalizeDamageAttribute>>
  elementMultiplier: number
  defenderBaseDefense: number
  recommendedDefenderResistance: LookupGameModeRecommendedResistance
  weaknesses: EncounterDamageContext["weaknesses"] | undefined
  resistances: EncounterDamageContext["resistances"] | undefined
  mechanics: EncounterDamageContext["mechanics"]
  node: EncounterDamageContext["node"]
  side: EncounterDamageContext["side"]
  wave: EncounterDamageContext["wave"]
  sideElementMultiplier: EncounterDamageContext["sideElementMultiplier"]
}

function toLookupDamageContext(
  context: EncounterDamageContext | undefined,
  attributeInput: LookupGameModeAttributeInput,
): LookupGameModeDamageContext | undefined {
  if (!context) return undefined

  const attribute = normalizeDamageAttribute(attributeInput)
  if (!attribute) return undefined

  return {
    enemyName: context.enemyName,
    attribute,
    elementMultiplier: context.elementMultiplier,
    defenderBaseDefense: context.baseDefense,
    recommendedDefenderResistance: Number(
      (1 - context.elementMultiplier).toFixed(4),
    ),
    weaknesses: context.weaknesses.length > 0 ? context.weaknesses : undefined,
    resistances:
      context.resistances.length > 0 ? context.resistances : undefined,
    mechanics: context.mechanics,
    node: context.node,
    side: context.side,
    wave: context.wave,
    sideElementMultiplier: context.sideElementMultiplier,
  }
}

function toEncounterCandidate(
  candidate: FlattenedEnemyView,
): LookupGameModeEncounterCandidate {
  return {
    name: candidate.enemy.name,
    node: candidate.node,
    side: candidate.side,
    wave: candidate.wave,
  }
}

export const lookupGameMode = createTool({
  id: "lookup-game-mode",
  description:
    "查询绝区零游戏模式数据（危局强袭战 DA / 式舆防卫战 SD / 零号空洞模拟 TS）。返回指定版本的敌人、buff等信息。不传 version 则返回最新一期。SD/TS 可通过 difficulty 指定难度。可通过 boss 搜索包含指定 boss 的版本，也可用 enemyName + attribute 生成用于 calcDamage 的 damageContext。",
  inputSchema: z.object({
    mode: z
      .enum(["DA", "SD", "TS"])
      .describe("游戏模式：DA=危局强袭战，SD=式舆防卫战，TS=零号空洞模拟"),
    version: z
      .string()
      .optional()
      .describe("版本号如 '2.5.1'，不传则返回最新一期"),
    difficulty: z
      .string()
      .optional()
      .describe(
        "难度名称（仅 SD/TS），如 'Stable'/'Critical'/'Hard'，也支持完整名称如 'Critical Node'",
      ),
    boss: z
      .string()
      .optional()
      .describe("按 boss 名称搜索（模糊匹配），返回包含该 boss 的版本列表"),
    enemyName: z
      .string()
      .optional()
      .describe("在已选中的版本内按敌人名称定位，用于返回 damageContext"),
    attribute: z
      .string()
      .optional()
      .describe(
        "要计算的伤害属性。支持冰/火/电/以太/物理，也支持烈霜/玄墨/凛刃；用于生成 damageContext",
      ),
    node: z
      .number()
      .min(1)
      .optional()
      .describe("指定节点编号（仅 SD/TS），用于缩小 damageContext 的敌人范围"),
    side: z
      .number()
      .min(1)
      .optional()
      .describe(
        "指定 side 编号。SD 中 1/2 表示上下半；TS 中 1=boss side，2..n=regular side",
      ),
    locale: z
      .enum(["en", "zh-CN"])
      .optional()
      .default("zh-CN")
      .describe("数据语言"),
  }),
  execute: async (input) => {
    const {
      mode,
      version,
      difficulty,
      boss,
      enemyName,
      attribute,
      node,
      side,
      locale,
    } = input
    const attributeLabel = attribute as AgentAttributeLabel | undefined

    if (mode === "DA") {
      const data = loadJson<DeadlyAssaultJson>(
        `data/${locale}/deadly-assault.json`,
      )

      // Boss search mode
      if (boss) {
        const matches = findDAVersionsByEnemyName(data, boss)
        return {
          found: matches.length > 0,
          mode: "DA",
          message: matches.length
            ? undefined
            : `未找到包含 boss「${boss}」的 DA 版本`,
          results: matches.map((v) => ({
            versionKey: v.versionKey,
            versionName: v.versionName,
            bosses: v.versionEnemies.map((e) => e.name),
          })),
        }
      }

      const item = findDAVersion(data, version)

      if (!item) {
        return {
          found: false,
          message: `未找到 DA 版本 ${version}`,
          availableVersions: data.map((v) => v.versionKey),
        }
      }

      const selection = selectDAEnemy(item, enemyName)

      return {
        found: true,
        mode: "DA",
        data: item,
        selectedEnemy: selection.selected
          ? { name: selection.selected.enemy.name }
          : undefined,
        enemyCandidates:
          !selection.selected && (enemyName || attribute)
            ? selection.candidates
            : undefined,
        damageContext: toLookupDamageContext(
          buildDADamageContext(item, attributeLabel, enemyName),
          attribute,
        ),
      }
    }

    if (mode === "SD") {
      const data = loadJson<ShiyuDefenseJson>(
        `data/${locale}/shiyu-defense.json`,
      )

      // Resolve difficulty
      const modeItem = selectSDMode(data, difficulty)
      if (!modeItem) {
        return {
          found: false,
          message: `未找到 SD 难度「${difficulty}」`,
          availableDifficulties: data.map((m) => m.name),
        }
      }

      // Boss search mode
      if (boss) {
        const matches = findSDVersionsByEnemyName(modeItem, boss)
        return {
          found: matches.length > 0,
          mode: "SD",
          difficulty: modeItem.name,
          message: matches.length
            ? undefined
            : `未找到包含 boss「${boss}」的 SD 版本`,
          results: matches.map((v) => ({
            versionKey: v.versionKey,
            versionName: v.versionName,
          })),
        }
      }

      const vItem = findSDVersion(data, {
        modeName: modeItem.name,
        versionKey: version,
      })
      if (!vItem) {
        return {
          found: false,
          message: `未找到 SD ${modeItem.name} 版本 ${version}`,
          availableVersions: modeItem.versions.map((v) => v.versionKey),
        }
      }

      const selection = selectSDEnemy(vItem, { node, side, enemyName })
      const candidateSource =
        selection.matches.length > 0
          ? selection.matches
          : flattenSDEnemies(vItem, { node, side })
      return {
        found: true,
        mode: "SD",
        difficulty: modeItem.name,
        data: vItem,
        selectedEnemy: selection.selected
          ? {
              name: selection.selected.enemy.name,
              node: selection.selected.node,
              side: selection.selected.side,
              wave: selection.selected.wave,
            }
          : undefined,
        enemyCandidates:
          !selection.selected && (enemyName || attribute || node || side)
            ? candidateSource.map(toEncounterCandidate)
            : undefined,
        damageContext: toLookupDamageContext(
          buildSDDamageContext(vItem, attributeLabel, {
            node,
            side,
            enemyName,
          }),
          attribute,
        ),
      }
    }

    // TS
    const data = loadJson<ThresholdSimulationJson>(
      `data/${locale}/threshold-simulation.json`,
    )

    // Resolve difficulty
    const modeItem = selectTSMode(data, difficulty)
    if (!modeItem) {
      return {
        found: false,
        message: `未找到 TS 难度「${difficulty}」`,
        availableDifficulties: data.map((m) => m.name),
      }
    }

    // Boss search mode
    if (boss) {
      const matches = findTSVersionsByEnemyName(modeItem, boss)
      return {
        found: matches.length > 0,
        mode: "TS",
        difficulty: modeItem.name,
        message: matches.length
          ? undefined
          : `未找到包含 boss「${boss}」的 TS 版本`,
        results: matches.map((v) => ({
          versionKey: v.versionKey,
          versionName: v.versionName,
        })),
      }
    }

    const vItem = findTSVersion(data, {
      modeName: modeItem.name,
      versionKey: version,
    })
    if (!vItem) {
      return {
        found: false,
        message: `未找到 TS ${modeItem.name} 版本 ${version}`,
        availableVersions: modeItem.versions.map((v) => v.versionKey),
      }
    }

    const selection = selectTSEnemy(vItem, { node, side, enemyName })
    const candidateSource =
      selection.matches.length > 0
        ? selection.matches
        : flattenTSEnemies(vItem, { node, side })
    return {
      found: true,
      mode: "TS",
      difficulty: modeItem.name,
      data: vItem,
      selectedEnemy: selection.selected
        ? {
            name: selection.selected.enemy.name,
            node: selection.selected.node,
            side: selection.selected.side,
            wave: selection.selected.wave,
          }
        : undefined,
      enemyCandidates:
        !selection.selected && (enemyName || attribute || node || side)
          ? candidateSource.map(toEncounterCandidate)
          : undefined,
      damageContext: toLookupDamageContext(
        buildTSDamageContext(vItem, attributeLabel, { node, side, enemyName }),
        attribute,
      ),
    }
  },
})

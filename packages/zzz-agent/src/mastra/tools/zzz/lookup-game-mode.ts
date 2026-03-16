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

export type LookupGameModeMode = "DA" | "SD" | "TS"

export type LookupGameModeAttributeInput = string | undefined

export type LookupGameModeEncounterCandidateName = string

export type LookupGameModeEnemyName = string

export type LookupGameModeEncounterNode = number | undefined

export type LookupGameModeEncounterSide = number | undefined

export type LookupGameModeEncounterWave = number | undefined

export interface LookupGameModeEncounterCandidate {
  name: LookupGameModeEncounterCandidateName
  node: LookupGameModeEncounterNode
  side: LookupGameModeEncounterSide
  wave: LookupGameModeEncounterWave
}

export type LookupGameModeEncounterCandidateList =
  LookupGameModeEncounterCandidate[]

export type LookupGameModeSelectedEnemy = LookupGameModeEncounterCandidate

export type LookupGameModeDifficultyName = string

export type LookupGameModeDifficultyList = LookupGameModeDifficultyName[]

export type LookupGameModeVersionKey = string

export type LookupGameModeVersionKeyList = LookupGameModeVersionKey[]

export type LookupGameModeVersionName = string

export type LookupGameModeBossName = string

export type LookupGameModeBossNameList = LookupGameModeBossName[]

export interface LookupGameModeVersionSearchResult {
  versionKey: LookupGameModeVersionKey
  versionName: LookupGameModeVersionName
}

export type LookupGameModeVersionSearchResultList =
  LookupGameModeVersionSearchResult[]

export interface LookupGameModeDAVersionSearchResult extends LookupGameModeVersionSearchResult {
  bosses: LookupGameModeBossNameList
}

export type LookupGameModeDAVersionSearchResultList =
  LookupGameModeDAVersionSearchResult[]

export interface LookupGameModeVersionEnemyRef {
  name: LookupGameModeEnemyName
}

export type LookupGameModeVersionEnemyRefList = LookupGameModeVersionEnemyRef[]

export type LookupGameModeRecommendedResistance = number

export type LookupGameModeLookupMessage = string

export type LookupGameModeOptionalLookupMessage =
  | LookupGameModeLookupMessage
  | undefined

export type LookupGameModeFoundFlag = boolean

export interface LookupGameModeUnavailableVersionsResult {
  found: false
  message: LookupGameModeLookupMessage
  availableVersions: LookupGameModeVersionKeyList
}

export interface LookupGameModeUnavailableDifficultiesResult {
  found: false
  message: LookupGameModeLookupMessage
  availableDifficulties: LookupGameModeDifficultyList
}

export interface LookupGameModeDABossSearchResult {
  found: LookupGameModeFoundFlag
  mode: LookupGameModeMode
  message: LookupGameModeOptionalLookupMessage
  results: LookupGameModeDAVersionSearchResultList
}

export interface LookupGameModeBossSearchResult {
  found: LookupGameModeFoundFlag
  mode: LookupGameModeMode
  difficulty: LookupGameModeDifficultyName
  message: LookupGameModeOptionalLookupMessage
  results: LookupGameModeVersionSearchResultList
}

export type LookupGameModeDAData = DeadlyAssaultJson[number]

export type LookupGameModeSDData = ShiyuDefenseJson[number]["versions"][number]

export type LookupGameModeTSData =
  ThresholdSimulationJson[number]["versions"][number]

export type LookupGameModeSelectedEnemyValue =
  | LookupGameModeSelectedEnemy
  | undefined

export type LookupGameModeEncounterCandidateValueList =
  | LookupGameModeEncounterCandidateList
  | undefined

export type LookupGameModeDamageContextValue =
  | LookupGameModeDamageContext
  | undefined

export interface LookupGameModeDAResolvedResult {
  found: true
  mode: LookupGameModeMode
  data: LookupGameModeDAData
  selectedEnemy: LookupGameModeSelectedEnemyValue
  enemyCandidates: LookupGameModeEncounterCandidateValueList
  damageContext: LookupGameModeDamageContextValue
}

export interface LookupGameModeSDResolvedResult {
  found: true
  mode: LookupGameModeMode
  difficulty: LookupGameModeDifficultyName
  data: LookupGameModeSDData
  selectedEnemy: LookupGameModeSelectedEnemyValue
  enemyCandidates: LookupGameModeEncounterCandidateValueList
  damageContext: LookupGameModeDamageContextValue
}

export interface LookupGameModeTSResolvedResult {
  found: true
  mode: LookupGameModeMode
  difficulty: LookupGameModeDifficultyName
  data: LookupGameModeTSData
  selectedEnemy: LookupGameModeSelectedEnemyValue
  enemyCandidates: LookupGameModeEncounterCandidateValueList
  damageContext: LookupGameModeDamageContextValue
}

export interface LookupGameModeDamageContext {
  enemyName: LookupGameModeEnemyName
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

function toSelectedEnemy(
  candidate: FlattenedEnemyView,
): LookupGameModeSelectedEnemy {
  return {
    name: candidate.enemy.name,
    node: candidate.node,
    side: candidate.side,
    wave: candidate.wave,
  }
}

function toEncounterCandidateFromName(
  name: LookupGameModeEnemyName,
): LookupGameModeEncounterCandidate {
  return {
    name,
    node: undefined,
    side: undefined,
    wave: undefined,
  }
}

function toVersionSearchResult(version: {
  versionKey: string
  versionName: string
}): LookupGameModeVersionSearchResult {
  return {
    versionKey: version.versionKey,
    versionName: version.versionName,
  }
}

function toDAVersionSearchResult(version: {
  versionKey: string
  versionName: string
  versionEnemies: LookupGameModeVersionEnemyRefList
}): LookupGameModeDAVersionSearchResult {
  return {
    versionKey: version.versionKey,
    versionName: version.versionName,
    bosses: version.versionEnemies.map(
      (enemy): LookupGameModeBossName => enemy.name,
    ),
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
          mode: "DA" satisfies LookupGameModeMode,
          message: matches.length
            ? undefined
            : `未找到包含 boss「${boss}」的 DA 版本`,
          results: matches.map(toDAVersionSearchResult),
        } satisfies LookupGameModeDABossSearchResult
      }

      const item = findDAVersion(data, version)

      if (!item) {
        return {
          found: false,
          message: `未找到 DA 版本 ${version}`,
          availableVersions: data.map(
            (v): LookupGameModeVersionKey => v.versionKey,
          ),
        } satisfies LookupGameModeUnavailableVersionsResult
      }

      const selection = selectDAEnemy(item, enemyName)

      return {
        found: true,
        mode: "DA" satisfies LookupGameModeMode,
        data: item,
        selectedEnemy: selection.selected
          ? ({
              name: selection.selected.enemy.name,
              node: undefined,
              side: undefined,
              wave: undefined,
            } satisfies LookupGameModeSelectedEnemy)
          : undefined,
        enemyCandidates:
          !selection.selected && (enemyName || attribute)
            ? selection.candidates.map(toEncounterCandidateFromName)
            : undefined,
        damageContext: toLookupDamageContext(
          buildDADamageContext(item, attributeLabel, enemyName),
          attribute,
        ),
      } satisfies LookupGameModeDAResolvedResult
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
          availableDifficulties: data.map(
            (m): LookupGameModeDifficultyName => m.name,
          ),
        } satisfies LookupGameModeUnavailableDifficultiesResult
      }

      // Boss search mode
      if (boss) {
        const matches = findSDVersionsByEnemyName(modeItem, boss)
        return {
          found: matches.length > 0,
          mode: "SD" satisfies LookupGameModeMode,
          difficulty: modeItem.name,
          message: matches.length
            ? undefined
            : `未找到包含 boss「${boss}」的 SD 版本`,
          results: matches.map(toVersionSearchResult),
        } satisfies LookupGameModeBossSearchResult
      }

      const vItem = findSDVersion(data, {
        modeName: modeItem.name,
        versionKey: version,
      })
      if (!vItem) {
        return {
          found: false,
          message: `未找到 SD ${modeItem.name} 版本 ${version}`,
          availableVersions: modeItem.versions.map(
            (v): LookupGameModeVersionKey => v.versionKey,
          ),
        } satisfies LookupGameModeUnavailableVersionsResult
      }

      const selection = selectSDEnemy(vItem, { node, side, enemyName })
      const candidateSource =
        selection.matches.length > 0
          ? selection.matches
          : flattenSDEnemies(vItem, { node, side })
      return {
        found: true,
        mode: "SD" satisfies LookupGameModeMode,
        difficulty: modeItem.name,
        data: vItem,
        selectedEnemy: selection.selected
          ? toSelectedEnemy(selection.selected)
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
      } satisfies LookupGameModeSDResolvedResult
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
        availableDifficulties: data.map(
          (m): LookupGameModeDifficultyName => m.name,
        ),
      } satisfies LookupGameModeUnavailableDifficultiesResult
    }

    // Boss search mode
    if (boss) {
      const matches = findTSVersionsByEnemyName(modeItem, boss)
      return {
        found: matches.length > 0,
        mode: "TS" satisfies LookupGameModeMode,
        difficulty: modeItem.name,
        message: matches.length
          ? undefined
          : `未找到包含 boss「${boss}」的 TS 版本`,
        results: matches.map(toVersionSearchResult),
      } satisfies LookupGameModeBossSearchResult
    }

    const vItem = findTSVersion(data, {
      modeName: modeItem.name,
      versionKey: version,
    })
    if (!vItem) {
      return {
        found: false,
        message: `未找到 TS ${modeItem.name} 版本 ${version}`,
        availableVersions: modeItem.versions.map(
          (v): LookupGameModeVersionKey => v.versionKey,
        ),
      } satisfies LookupGameModeUnavailableVersionsResult
    }

    const selection = selectTSEnemy(vItem, { node, side, enemyName })
    const candidateSource =
      selection.matches.length > 0
        ? selection.matches
        : flattenTSEnemies(vItem, { node, side })
    return {
      found: true,
      mode: "TS" satisfies LookupGameModeMode,
      difficulty: modeItem.name,
      data: vItem,
      selectedEnemy: selection.selected
        ? toSelectedEnemy(selection.selected)
        : undefined,
      enemyCandidates:
        !selection.selected && (enemyName || attribute || node || side)
          ? candidateSource.map(toEncounterCandidate)
          : undefined,
      damageContext: toLookupDamageContext(
        buildTSDamageContext(vItem, attributeLabel, { node, side, enemyName }),
        attribute,
      ),
    } satisfies LookupGameModeTSResolvedResult
  },
})

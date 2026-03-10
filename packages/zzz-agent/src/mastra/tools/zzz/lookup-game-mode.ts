import type {
  DeadlyAssaultJson,
  ShiyuDefenseJson,
  ThresholdSimulationJson,
} from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  damageAttributeOrder,
  loadJson,
  normalizeDamageAttribute,
} from "./utils"

const difficultyRanks = [
  ["stable", "Stable Node"],
  ["disputed", "Disputed Node"],
  ["ambush", "Ambush Node"],
  ["critical", "Critical Node"],
  ["easy", "Easy Mode"],
  ["hard", "Hard Mode"],
] as const

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[\s\-_]/g, "")
}

function resolveDifficultyName(input: string | undefined, options: string[]) {
  if (!input) return undefined

  const normalizedInput = normalizeText(input)

  for (const option of options) {
    if (normalizeText(option) === normalizedInput) return option
  }

  for (const [key, canonical] of difficultyRanks) {
    if (
      normalizedInput === key ||
      normalizedInput === normalizeText(canonical)
    ) {
      return options.find(
        (option) => normalizeText(option) === normalizeText(canonical),
      )
    }
  }

  return options.find((option) =>
    normalizeText(option).includes(normalizedInput),
  )
}

function getDefaultDifficulty<T extends { name: string }>(options: T[]) {
  const ranked = options
    .map((option) => ({
      option,
      rank: difficultyRanks.findIndex(
        ([, canonical]) =>
          normalizeText(option.name) === normalizeText(canonical),
      ),
    }))
    .filter((item) => item.rank >= 0)
    .sort((a, b) => b.rank - a.rank)

  return ranked[0]?.option ?? options[0]
}

function getLatestVersion<T>(items: T[]) {
  return items[0]
}

interface EnemyContext {
  enemy: {
    name: string
    def: number
    elementMult: number[]
    weaknesses?: string[]
    resistances?: string[]
  }
  node?: number
  side?: number
  wave?: number
}

function pickEnemyContext(candidates: EnemyContext[], enemyName?: string) {
  if (enemyName) {
    return candidates.find((candidate) =>
      candidate.enemy.name.toLowerCase().includes(enemyName.toLowerCase()),
    )
  }

  return candidates.length === 1 ? candidates[0] : undefined
}

function buildDamageContext(
  selected: EnemyContext | undefined,
  attributeInput: string | undefined,
) {
  if (!selected || !attributeInput) return undefined

  const attribute = normalizeDamageAttribute(attributeInput)
  if (!attribute) return undefined

  const attributeIndex = damageAttributeOrder.indexOf(attribute)
  const elementMultiplier = selected.enemy.elementMult[attributeIndex] ?? 1

  return {
    enemyName: selected.enemy.name,
    attribute,
    elementMultiplier,
    defenderBaseDefense: selected.enemy.def,
    recommendedDefenderResistance: Number((1 - elementMultiplier).toFixed(4)),
    weaknesses: selected.enemy.weaknesses,
    resistances: selected.enemy.resistances,
    node: selected.node,
    side: selected.side,
    wave: selected.wave,
  }
}

function flattenVersionEnemies(
  version: {
    nodes: Array<{
      sides: Array<{
        waves: Array<{ enemies: Array<EnemyContext["enemy"]> }>
      } | null>
    }>
  },
  node?: number,
  side?: number,
) {
  const enemies: EnemyContext[] = []

  for (const [nodeIndex, currentNode] of version.nodes.entries()) {
    if (node && nodeIndex + 1 !== node) continue

    for (const [sideIndex, currentSide] of currentNode.sides.entries()) {
      if (!currentSide) continue
      if (side && sideIndex + 1 !== side) continue

      for (const [waveIndex, wave] of currentSide.waves.entries()) {
        for (const enemy of wave.enemies) {
          enemies.push({
            enemy,
            node: nodeIndex + 1,
            side: sideIndex + 1,
            wave: waveIndex + 1,
          })
        }
      }
    }
  }

  return enemies
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
      .max(2)
      .optional()
      .describe("指定上下半编号（仅 SD/TS，1=上半，2=下半）"),
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

    if (mode === "DA") {
      const data = loadJson<DeadlyAssaultJson>(
        `data/${locale}/deadly-assault.json`,
      )

      // Boss search mode
      if (boss) {
        const matches = data.filter((v) =>
          v.versionEnemies.some((e) =>
            e.name.toLowerCase().includes(boss.toLowerCase()),
          ),
        )
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

      const item = version
        ? data.find((v) => v.versionKey === version)
        : getLatestVersion(data)

      if (!item) {
        return {
          found: false,
          message: `未找到 DA 版本 ${version}`,
          availableVersions: data.map((v) => v.versionKey),
        }
      }

      const selectedEnemy = pickEnemyContext(
        item.versionEnemies.map((enemy) => ({ enemy })),
        enemyName,
      )

      return {
        found: true,
        mode: "DA",
        data: item,
        selectedEnemy: selectedEnemy
          ? { name: selectedEnemy.enemy.name }
          : undefined,
        enemyCandidates:
          !selectedEnemy && (enemyName || attribute)
            ? item.versionEnemies.map((enemy) => enemy.name)
            : undefined,
        damageContext: buildDamageContext(selectedEnemy, attribute),
      }
    }

    if (mode === "SD") {
      const data = loadJson<ShiyuDefenseJson>(
        `data/${locale}/shiyu-defense.json`,
      )

      // Resolve difficulty
      const modeItem = difficulty
        ? data.find(
            (m) =>
              m.name ===
              resolveDifficultyName(
                difficulty,
                data.map((item) => item.name),
              ),
          )
        : getDefaultDifficulty(data)
      if (!modeItem) {
        return {
          found: false,
          message: `未找到 SD 难度「${difficulty}」`,
          availableDifficulties: data.map((m) => m.name),
        }
      }

      // Boss search mode
      if (boss) {
        const matches = modeItem.versions.filter((v) =>
          v.nodes.some((n) =>
            n.sides.some(
              (s) =>
                s &&
                s.waves.some((w) =>
                  w.enemies.some((e) =>
                    e.name.toLowerCase().includes(boss.toLowerCase()),
                  ),
                ),
            ),
          ),
        )
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

      const vItem = version
        ? modeItem.versions.find((v) => v.versionKey === version)
        : getLatestVersion(modeItem.versions)
      if (!vItem) {
        return {
          found: false,
          message: `未找到 SD ${modeItem.name} 版本 ${version}`,
          availableVersions: modeItem.versions.map((v) => v.versionKey),
        }
      }

      const selectedEnemy = pickEnemyContext(
        flattenVersionEnemies(vItem, node, side),
        enemyName,
      )
      return {
        found: true,
        mode: "SD",
        difficulty: modeItem.name,
        data: vItem,
        selectedEnemy: selectedEnemy
          ? {
              name: selectedEnemy.enemy.name,
              node: selectedEnemy.node,
              side: selectedEnemy.side,
              wave: selectedEnemy.wave,
            }
          : undefined,
        enemyCandidates:
          !selectedEnemy && (enemyName || attribute || node || side)
            ? flattenVersionEnemies(vItem, node, side).map((candidate) => ({
                name: candidate.enemy.name,
                node: candidate.node,
                side: candidate.side,
                wave: candidate.wave,
              }))
            : undefined,
        damageContext: buildDamageContext(selectedEnemy, attribute),
      }
    }

    // TS
    const data = loadJson<ThresholdSimulationJson>(
      `data/${locale}/threshold-simulation.json`,
    )

    // Resolve difficulty
    const modeItem = difficulty
      ? data.find(
          (m) =>
            m.name ===
            resolveDifficultyName(
              difficulty,
              data.map((item) => item.name),
            ),
        )
      : getDefaultDifficulty(data)
    if (!modeItem) {
      return {
        found: false,
        message: `未找到 TS 难度「${difficulty}」`,
        availableDifficulties: data.map((m) => m.name),
      }
    }

    // Boss search mode
    if (boss) {
      const matches = modeItem.versions.filter((v) =>
        v.nodes.some((n) =>
          n.sides.some(
            (s) =>
              s &&
              s.waves.some((w) =>
                w.enemies.some((e) =>
                  e.name.toLowerCase().includes(boss.toLowerCase()),
                ),
              ),
          ),
        ),
      )
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

    const vItem = version
      ? modeItem.versions.find((v) => v.versionKey === version)
      : getLatestVersion(modeItem.versions)
    if (!vItem) {
      return {
        found: false,
        message: `未找到 TS ${modeItem.name} 版本 ${version}`,
        availableVersions: modeItem.versions.map((v) => v.versionKey),
      }
    }

    const selectedEnemy = pickEnemyContext(
      flattenVersionEnemies(vItem, node, side),
      enemyName,
    )
    return {
      found: true,
      mode: "TS",
      difficulty: modeItem.name,
      data: vItem,
      selectedEnemy: selectedEnemy
        ? {
            name: selectedEnemy.enemy.name,
            node: selectedEnemy.node,
            side: selectedEnemy.side,
            wave: selectedEnemy.wave,
          }
        : undefined,
      enemyCandidates:
        !selectedEnemy && (enemyName || attribute || node || side)
          ? flattenVersionEnemies(vItem, node, side).map((candidate) => ({
              name: candidate.enemy.name,
              node: candidate.node,
              side: candidate.side,
              wave: candidate.wave,
            }))
          : undefined,
      damageContext: buildDamageContext(selectedEnemy, attribute),
    }
  },
})

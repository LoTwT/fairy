import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  resolveStaticBuildSkillMatrix,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildWEngines,
} from "zzz-data"

interface CatalogItem {
  id: string
  name: string
  aliases: readonly string[]
}

function normalizeCatalogValue(value: string) {
  return value.toLowerCase().replace(/[\s\-_·・.()（）【】[\]「」]/g, "")
}

function getCatalogFields(item: CatalogItem) {
  return [item.name, item.id, ...item.aliases].filter(Boolean)
}

function findCatalogItem<T extends CatalogItem>(
  items: readonly T[],
  query: string,
): T | undefined {
  const qLow = query.toLowerCase()
  const qNorm = normalizeCatalogValue(query)

  let bestItem: T | undefined
  let bestScore = 0

  for (const item of items) {
    for (const field of getCatalogFields(item)) {
      if (field.toLowerCase() === qLow) return item
      const normalized = normalizeCatalogValue(field)
      if (normalized === qNorm) return item
      if (!normalized.includes(qNorm)) continue

      let score = qNorm.length / normalized.length
      if (normalized.startsWith(qNorm)) score += 1
      if (score > bestScore) {
        bestScore = score
        bestItem = item
      }
    }
  }

  return bestScore >= 0.6 ? bestItem : undefined
}

function findCatalogCandidates<T extends CatalogItem>(
  items: readonly T[],
  query: string,
) {
  const qNorm = normalizeCatalogValue(query)
  if (!qNorm) return []

  const scored: Array<{ item: T; score: number }> = []
  for (const item of items) {
    let bestScore = 0
    for (const field of getCatalogFields(item)) {
      const normalized = normalizeCatalogValue(field)
      if (!normalized.includes(qNorm) && !qNorm.includes(normalized)) continue

      let score = 0
      if (normalized.includes(qNorm)) {
        score = qNorm.length / normalized.length
        if (normalized.startsWith(qNorm)) score += 1
      } else {
        score = normalized.length / qNorm.length
        if (qNorm.startsWith(normalized)) score += 1
      }
      bestScore = Math.max(bestScore, score)
    }
    if (bestScore > 0) scored.push({ item, score: bestScore })
  }

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.item)
}

const bucketLabels = {
  attackPercent: "攻击%",
  flatAttack: "固定攻击",
  bonusDamageSum: "增伤",
  critRate: "暴击率",
  critDamage: "暴击伤害",
  penetrationRate: "穿透率",
  penetrationValue: "穿透值",
  resistanceReduction: "减抗",
  ignoreResistance: "无视抗性",
  vulnerabilityBonus: "易伤",
  damageReduction: "减伤",
  stunVulnerability: "失衡易伤",
  nonStunVulnerability: "非失衡易伤",
  sheerBonusSum: "贯穿增伤",
  skillMultiplierFactor: "技能倍率",
} as const

function formatValue(value: number) {
  const normalized = Number.parseFloat(value.toFixed(3))
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toString()
}

function formatModifier(
  bucket: keyof typeof bucketLabels,
  value: number,
  combine: "sum" | "multiply",
) {
  if (combine === "multiply") {
    const percent = (value - 1) * 100
    return `×${formatValue(value)}（${percent >= 0 ? "+" : ""}${formatValue(percent)}%）`
  }

  if (
    bucket === "critRate" ||
    bucket === "critDamage" ||
    bucket === "bonusDamageSum" ||
    bucket === "penetrationRate" ||
    bucket === "resistanceReduction" ||
    bucket === "ignoreResistance" ||
    bucket === "vulnerabilityBonus" ||
    bucket === "damageReduction" ||
    bucket === "stunVulnerability" ||
    bucket === "nonStunVulnerability" ||
    bucket === "sheerBonusSum"
  ) {
    return `${value >= 0 ? "+" : ""}${formatValue(value * 100)}%`
  }

  return `${value >= 0 ? "+" : ""}${formatValue(value)}`
}

function summarizeEffects(
  matrix: ReturnType<typeof resolveStaticBuildSkillMatrix>,
) {
  const summary = new Map<
    string,
    {
      effectId: string
      sourceName: string
      label: string
      bucketTexts: Set<string>
      valueTexts: Set<string>
      rows: Set<string>
    }
  >()

  for (const row of matrix.rows) {
    for (const trace of row.build.trace) {
      if (trace.status !== "applied" || !trace.modifiers?.length) continue

      let item = summary.get(trace.effectId)
      if (!item) {
        item = {
          effectId: trace.effectId,
          sourceName: trace.sourceName,
          label: trace.label,
          bucketTexts: new Set<string>(),
          valueTexts: new Set<string>(),
          rows: new Set<string>(),
        }
        summary.set(trace.effectId, item)
      }

      item.rows.add(row.id)
      for (const modifier of trace.modifiers) {
        item.bucketTexts.add(bucketLabels[modifier.bucket] ?? modifier.bucket)
        item.valueTexts.add(
          formatModifier(modifier.bucket, modifier.value, modifier.combine),
        )
      }
    }
  }

  return [...summary.values()].map((item) => ({
    effectId: item.effectId,
    sourceName: item.sourceName,
    label: item.label,
    bucket: [...item.bucketTexts].join(" + "),
    value: [...item.valueTexts].join("；"),
    condition:
      item.rows.size === matrix.rows.length
        ? "当前矩阵全部生效"
        : `部分技能生效（${item.rows.size}/${matrix.rows.length}）`,
  }))
}

function summarizeBuckets(
  matrix: ReturnType<typeof resolveStaticBuildSkillMatrix>,
) {
  const first = matrix.rows[0]?.build.resolvedBuckets
  if (!first) {
    return {
      commonBuckets: {} as Record<string, number>,
      variableBuckets: [] as string[],
    }
  }

  const commonBuckets: Record<string, number> = {}
  const variableBuckets: string[] = []

  for (const [bucket, value] of Object.entries(first)) {
    const same = matrix.rows.every(
      (row) =>
        row.build.resolvedBuckets[bucket as keyof typeof first] === value,
    )
    if (same) {
      commonBuckets[bucket] = value
    } else {
      variableBuckets.push(bucket)
    }
  }

  return { commonBuckets, variableBuckets }
}

function summarizeFormulaMultipliers(
  matrix: ReturnType<typeof resolveStaticBuildSkillMatrix>,
) {
  const first = matrix.rows[0]?.build.damage.expected.breakdown
  if (!first) {
    return {
      commonFormulaMultipliers: {} as Record<string, number>,
      variableFormulaMultipliers: [] as string[],
    }
  }

  const commonFormulaMultipliers: Record<string, number> = {}
  const variableFormulaMultipliers: string[] = []

  for (const [bucket, value] of Object.entries(first)) {
    if (bucket === "baseDamage") continue
    const same = matrix.rows.every(
      (row) =>
        row.build.damage.expected.breakdown[bucket as keyof typeof first] ===
        value,
    )
    if (same) {
      commonFormulaMultipliers[bucket] = value
    } else {
      variableFormulaMultipliers.push(bucket)
    }
  }

  return { commonFormulaMultipliers, variableFormulaMultipliers }
}

function compactMatrix(
  matrix: ReturnType<typeof resolveStaticBuildSkillMatrix>,
  includeDetails: boolean,
) {
  const first = matrix.rows[0]?.build
  const { commonBuckets, variableBuckets } = summarizeBuckets(matrix)
  const { commonFormulaMultipliers, variableFormulaMultipliers } =
    summarizeFormulaMultipliers(matrix)

  return {
    profile: matrix.profile,
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: matrix.loadout,
    summary: first
      ? {
          baseDamageStat: first.resolvedPanel.baseDamageStat,
          baseDamageValue: first.resolvedPanel.baseDamageValue,
          attack: first.resolvedPanel.attack,
          hp: first.resolvedPanel.hp,
          sheerForce: first.resolvedPanel.sheerForce,
          critRate: first.resolvedPanel.critRate,
          critDamage: first.resolvedPanel.critDamage,
          penetrationRate: first.resolvedPanel.penetrationRate,
          penetrationValue: first.resolvedPanel.penetrationValue,
          commonBuckets,
          variableBuckets,
          commonFormulaMultipliers,
          variableFormulaMultipliers,
        }
      : undefined,
    effectSummary: summarizeEffects(matrix),
    assumptions: matrix.assumptions,
    rows: matrix.rows.map((row) => ({
      id: row.id,
      group: row.group,
      label: row.label,
      metadata: row.metadata,
      skillTag: row.skillTag,
      damageType: row.damageType,
      attribute: row.attribute,
      combatTags: row.combatTags,
      skillMultiplier: row.skillMultiplier,
      damage: {
        expected: row.build.damage.expected.total,
        crit: row.build.damage.crit.total,
        noCrit: row.build.damage.noCrit.total,
      },
      resolvedBuckets: row.build.resolvedBuckets,
      assumptions: row.build.assumptions,
      unsupportedEffects: row.build.unsupportedEffects,
      ...(includeDetails ? { build: row.build } : {}),
    })),
  }
}

export const resolveBuildSkillMatrix = createTool({
  id: "resolve-build-skill-matrix",
  description:
    "基于 zzz-data 的静态构筑解析器批量计算全技能/全段伤害矩阵。当前支持全部强攻/命破代理人及其专属音擎；驱动盘仍支持炎狱重金属 / 极地重金属 / 雷暴重金属 / 啄木鸟电音 / 河豚电音 / 云岿如我。",
  inputSchema: z.object({
    agent: z.string().describe("代理人名称或 ID"),
    wEngine: z.string().optional().describe("音擎名称或 ID"),
    driveDiscs: z
      .array(
        z.object({
          name: z.string().describe("驱动盘名称或 ID"),
          pieces: z.union([z.literal(2), z.literal(4)]),
        }),
      )
      .optional(),
    coreSkillLevel: z.number().min(1).max(7).optional().default(7),
    wEngineRefinement: z.number().min(1).max(5).optional().default(1),
    mode: z
      .enum(["baseline", "full-buff", "manual"])
      .optional()
      .default("baseline"),
    manualBaseMode: z.enum(["baseline", "full-buff"]).optional(),
    finalPanel: z.object({
      attack: z.number(),
      baseAttack: z.number().optional(),
      critRate: z.number(),
      critDamage: z.number(),
      hp: z.number().optional(),
      sheerForce: z.number().optional(),
      penetrationRate: z.number().optional(),
      penetrationValue: z.number().optional(),
    }),
    context: z.object({
      attribute: z.string().optional(),
      extraAbilityActive: z.boolean().optional(),
      combatTags: z.array(z.string()).optional(),
      enemy: z.object({
        attackerLevel: z.number().optional().default(60),
        defenderBaseDefense: z.number(),
        defenderResistance: z.number(),
        defenseBonus: z.number().optional().default(0),
        defenseReduction: z.number().optional().default(0),
        resistanceReduction: z.number().optional().default(0),
        ignoreResistance: z.number().optional().default(0),
        vulnerabilityBonus: z.number().optional().default(0),
        damageReduction: z.number().optional().default(0),
        isStunned: z.boolean().optional().default(false),
        stunVulnerability: z.number().optional().default(0),
        nonStunVulnerability: z.number().optional().default(0),
        specialMultiplier: z.number().optional().default(1),
      }),
    }),
    effectOverrides: z
      .array(
        z.object({
          effectId: z.string(),
          enabled: z.boolean().optional(),
          stacks: z.number().int().min(0).optional(),
        }),
      )
      .optional(),
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回每行完整 build 结果（trace、damageParams 等）。默认 false，以避免上下文过大。",
      ),
  }),
  execute: async (input) => {
    const agent = findCatalogItem(supportedStaticBuildAgents, input.agent)
    if (!agent) {
      return {
        found: false,
        message: `当前 skill matrix 暂不支持代理人「${input.agent}」`,
        supportedAgents: supportedStaticBuildAgents.map((item) => item.name),
        candidates: findCatalogCandidates(
          supportedStaticBuildAgents,
          input.agent,
        ).map((item) => item.name),
      }
    }

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      return {
        found: false,
        message: `当前 skill matrix 暂不支持音擎「${input.wEngine}」`,
        supportedWEngines: supportedStaticBuildWEngines.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildWEngines,
          input.wEngine,
        ).map((item) => item.name),
      }
    }

    const driveDiscSets = []
    for (const discInput of input.driveDiscs ?? []) {
      const disc = findCatalogItem(
        supportedStaticBuildDriveDiscs,
        discInput.name,
      )
      if (!disc) {
        return {
          found: false,
          message: `当前 skill matrix 暂不支持驱动盘「${discInput.name}」`,
          supportedDriveDiscs: supportedStaticBuildDriveDiscs.map(
            (item) => item.name,
          ),
          candidates: findCatalogCandidates(
            supportedStaticBuildDriveDiscs,
            discInput.name,
          ).map((item) => item.name),
        }
      }
      driveDiscSets.push({ id: disc.id, pieces: discInput.pieces })
    }

    const matrix = resolveStaticBuildSkillMatrix({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout: {
        agentId: agent.id,
        wEngineId: wEngine?.id,
        driveDiscSets,
        coreSkillLevel: input.coreSkillLevel,
        wEngineRefinement: input.wEngineRefinement,
      },
      panel: input.finalPanel,
      context: {
        ...input.context,
        attribute: input.context.attribute as AgentAttributeLabel | undefined,
      },
      effectOverrides: input.effectOverrides,
    })

    return {
      found: true,
      matrix: compactMatrix(matrix, input.includeDetails),
    }
  },
})

import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSkillMatrix,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildMatrixAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"

interface CatalogItem {
  id: string
  name: string
  aliases: readonly string[]
}

const specialtyLabels = {
  Attack: "强攻",
  Stun: "击破",
  Anomaly: "异常",
  Support: "支援",
  Defense: "防护",
  Rupture: "命破",
} as const

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

function compactMatrix(
  matrix: ReturnType<typeof resolveStaticBuildSkillMatrix>,
  includeDetails: boolean,
) {
  return {
    profile: matrix.profile,
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: matrix.loadout,
    summary: matrix.summary,
    effectSummary: matrix.effectSummary,
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
    "基于 zzz-data 的静态构筑解析器批量计算全技能/全段伤害矩阵。当前仅支持强攻/命破代理人，以及对应特性的强攻/命破音擎；异常代理人暂只支持单次 resolver。",
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
    agentMindscape: z.number().int().min(0).max(6).optional(),
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
      energyGenerationRate: z.number().optional(),
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
    const agent = findCatalogItem(supportedStaticBuildMatrixAgents, input.agent)
    if (!agent) {
      return {
        found: false,
        message: `当前 skill matrix 暂不支持代理人「${input.agent}」`,
        supportedAgents: supportedStaticBuildMatrixAgents.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildMatrixAgents,
          input.agent,
        ).map((item) => item.name),
      }
    }

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return {
        found: false,
        message: `当前 skill matrix 暂不支持音擎「${input.wEngine}」`,
        supportedWEngines: compatibleWEngines.map((item) => item.name),
        candidates: findCatalogCandidates(
          compatibleWEngines,
          input.wEngine,
        ).map((item) => item.name),
      }
    }
    if (wEngine && wEngine.specialty !== agent.specialty) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return {
        found: false,
        message: `${agent.name} 为 ${specialtyLabels[agent.specialty]}代理人，无法使用 ${wEngine.name}（${specialtyLabels[wEngine.specialty]}音擎）`,
        supportedWEngines: compatibleWEngines.map((item) => item.name),
        candidates: findCatalogCandidates(
          compatibleWEngines,
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
        agentMindscape: input.agentMindscape,
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

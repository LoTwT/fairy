import type { AnomalyType } from "zzz-data"
import { z } from "zod"

export interface CatalogItem {
  id: string
  name: string
  aliases: readonly string[]
  specialty?: string
}

export const buildToolScopeLabels = {
  resolver: "resolver",
  skillMatrix: "skill matrix",
  triggerMatrix: "trigger-entry matrix",
  sourceDamageView: "source-specific damage view",
  sourceUtilityView: "source-specific utility view",
  sourceEntryCollection: "source-entry collection",
} as const

export type BuildToolScopeLabel =
  (typeof buildToolScopeLabels)[keyof typeof buildToolScopeLabels]

export interface BuildToolUnsupportedAgentResponse {
  found: false
  message: string
  supportedAgents: string[]
  candidates: string[]
}

export interface BuildToolUnsupportedWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
  candidates: string[]
}

export interface BuildToolIncompatibleWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
  candidates: string[]
}

export interface BuildToolUnsupportedDriveDiscResponse {
  found: false
  message: string
  supportedDriveDiscs: string[]
  candidates: string[]
}

export interface BuildToolUnsupportedAnomalyTypeResponse {
  found: false
  message: string
  supportedAnomalyTypes: readonly string[]
}

export interface BuildToolUnsupportedDamageTypeResponse {
  found: false
  message: string
  supportedDamageTypes: readonly string[]
}

export interface BuildToolUncoveredSourceDamageViewResponse {
  found: false
  message: string
  supportedAgents: string[]
  candidates: string[]
}

export interface BuildToolMissingSourceUtilityWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
}

export interface BuildToolUncoveredSourceUtilityWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
  candidates: string[]
}

export interface BuildToolMissingFinalPanelResponse {
  found: false
  message: string
}

export interface BuildToolUncoveredSourceEntryUtilityOnlyResponse {
  found: false
  message: string
  supportedUtilityWEngines: string[]
}

export interface BuildToolUncoveredSourceEntryCoverageResponse {
  found: false
  message: string
  supportedSourceViewAgents: string[]
  supportedUtilityWEngines: string[]
  candidates?: string[]
}

export const specialtyLabels = {
  Attack: "强攻",
  Stun: "击破",
  Anomaly: "异常",
  Support: "支援",
  Defense: "防护",
  Rupture: "命破",
} as const

export const skillTagSchema = z.enum([
  "basic",
  "dash",
  "special",
  "enhancedSpecial",
  "chain",
  "ultimate",
  "assist",
])

export const enemySchema = z.object({
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
})

export const dynamicSnapshotSchema = z
  .object({
    flags: z
      .object({
        ariaDreamtime: z.boolean().optional(),
        burniceEmberState: z.boolean().optional(),
      })
      .optional(),
    counts: z
      .object({
        burniceEmberExtraTriggers: z.number().int().min(0).optional(),
      })
      .optional(),
    values: z
      .object({
        ariaExflowDamageRatio: z.number().min(0).optional(),
        ariaStunnedDamageRatio: z.number().min(0).optional(),
        burniceEmberDamageRatio: z.number().min(0).optional(),
      })
      .optional(),
  })
  .optional()

export const stateSnapshotSchema = z
  .object({
    flags: z
      .object({
        alicePolarityAssaultState: z.boolean().optional(),
        miyabiFrostburnBreakState: z.boolean().optional(),
      })
      .optional(),
    values: z
      .object({
        alicePolarityAssaultDamageRatio: z.number().min(0).optional(),
        miyabiFrostburnBreakDamageRatio: z.number().min(0).optional(),
      })
      .optional(),
  })
  .optional()

export const resolvedSnapshotSchema = z
  .object({
    bucketDeltas: z
      .object({
        bonusDamageSum: z.number().optional(),
        defenseReduction: z.number().optional(),
        penetrationRate: z.number().optional(),
        resistanceReduction: z.number().optional(),
        ignoreResistance: z.number().optional(),
        sheerBonusSum: z.number().optional(),
        anomalyProficiency: z.number().optional(),
        anomalyBonusDamageSum: z.number().optional(),
        anomalyCritRate: z.number().optional(),
        anomalyCritDamage: z.number().optional(),
      })
      .optional(),
    multiplierFactors: z
      .object({
        skillMultiplierFactor: z.number().min(0).optional(),
      })
      .optional(),
  })
  .optional()

export const finalPanelSchema = z.object({
  attack: z.number(),
  baseAttack: z.number().optional(),
  critRate: z.number(),
  critDamage: z.number(),
  hp: z.number().optional(),
  sheerForce: z.number().optional(),
  energyGenerationRate: z.number().optional(),
  anomalyProficiency: z.number().optional(),
  anomalyMastery: z.number().optional(),
  anomalyCritRate: z.number().optional(),
  anomalyCritDamage: z.number().optional(),
  penetrationRate: z.number().optional(),
  penetrationValue: z.number().optional(),
})

export const resolveBuildScenarioSchema = z.discriminatedUnion("damageType", [
  z.object({
    damageType: z.literal("normal"),
    skillTag: skillTagSchema,
    skillMultiplier: z.union([z.number(), z.string()]),
    attribute: z.string().optional(),
    extraAbilityActive: z.boolean().optional(),
    combatTags: z.array(z.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  z.object({
    damageType: z.literal("sheer"),
    skillTag: skillTagSchema,
    skillMultiplier: z.union([z.number(), z.string()]),
    attribute: z.string().optional(),
    extraAbilityActive: z.boolean().optional(),
    combatTags: z.array(z.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  z.object({
    damageType: z.literal("anomaly"),
    skillTag: skillTagSchema,
    damageMultiplier: z.union([z.number(), z.string()]),
    attribute: z.string().optional(),
    extraAbilityActive: z.boolean().optional(),
    combatTags: z.array(z.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  z.object({
    damageType: z.literal("disorder"),
    skillTag: skillTagSchema,
    anomalyType: z.string(),
    remainingTime: z.number().min(0),
    attribute: z.string().optional(),
    extraAbilityActive: z.boolean().optional(),
    combatTags: z.array(z.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
])

export const resolveBuildInputSchema = z.object({
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
  agentLevel: z.number().min(1).max(60).optional(),
  agentMindscape: z.number().int().min(0).max(6).optional(),
  mode: z
    .enum(["baseline", "full-buff", "manual"])
    .optional()
    .default("baseline"),
  manualBaseMode: z.enum(["baseline", "full-buff"]).optional(),
  finalPanel: finalPanelSchema,
  scenario: resolveBuildScenarioSchema,
  effectOverrides: z
    .array(
      z.object({
        effectId: z.string(),
        enabled: z.boolean().optional(),
        stacks: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
})

export const resolveBuildSourceUtilityInputSchema = z.object({
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
  agentLevel: z.number().min(1).max(60).optional(),
  agentMindscape: z.number().int().min(0).max(6).optional(),
  finalPanel: finalPanelSchema.partial().optional(),
})

export const resolveBuildSourceEntriesInputSchema =
  resolveBuildSourceUtilityInputSchema.extend({
    mode: z
      .enum(["baseline", "full-buff", "manual"])
      .optional()
      .default("baseline"),
    manualBaseMode: z.enum(["baseline", "full-buff"]).optional(),
    scenario: resolveBuildScenarioSchema.optional(),
    effectOverrides: z
      .array(
        z.object({
          effectId: z.string(),
          enabled: z.boolean().optional(),
          stacks: z.number().int().min(0).optional(),
        }),
      )
      .optional(),
  })

export function normalizeCatalogValue(value: string) {
  return value.toLowerCase().replace(/[\s\-_·・.()（）【】[\]「」]/g, "")
}

function getCatalogFields(item: CatalogItem) {
  return [item.name, item.id, ...item.aliases].filter(Boolean)
}

export function findCatalogItem<T extends CatalogItem>(
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

export function findCatalogCandidates<T extends CatalogItem>(
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

export function catalogNames<T extends CatalogItem>(items: readonly T[]) {
  return items.map((item) => item.name)
}

export function candidateNames<T extends CatalogItem>(
  items: readonly T[],
  query: string,
) {
  return findCatalogCandidates(items, query).map((item) => item.name)
}

export function buildUnsupportedAgentResponse<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  items: readonly T[],
  query: string,
): BuildToolUnsupportedAgentResponse {
  return {
    found: false as const,
    message: `当前 ${scopeLabel} 暂不支持代理人「${query}」`,
    supportedAgents: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function buildUnsupportedWEngineResponse<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  items: readonly T[],
  query: string,
): BuildToolUnsupportedWEngineResponse {
  return {
    found: false as const,
    message: `当前 ${scopeLabel} 暂不支持音擎「${query}」`,
    supportedWEngines: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function buildIncompatibleWEngineResponse<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
>(
  agent: TAgent,
  wEngine: TWEngine,
  compatibleWEngines: readonly CatalogItem[],
  query: string,
): BuildToolIncompatibleWEngineResponse {
  return {
    found: false as const,
    message: `${agent.name} 为 ${specialtyLabels[agent.specialty]}代理人，无法使用 ${wEngine.name}（${specialtyLabels[wEngine.specialty]}音擎）`,
    supportedWEngines: catalogNames(compatibleWEngines),
    candidates: candidateNames(compatibleWEngines, query),
  }
}

export function buildUnsupportedDriveDiscResponse<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  items: readonly T[],
  query: string,
): BuildToolUnsupportedDriveDiscResponse {
  return {
    found: false as const,
    message: `当前 ${scopeLabel} 暂不支持驱动盘「${query}」`,
    supportedDriveDiscs: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function buildUnsupportedAnomalyTypeResponse(
  query: string,
): BuildToolUnsupportedAnomalyTypeResponse {
  return {
    found: false as const,
    message: `当前 resolver 无法识别异常类型「${query}」`,
    supportedAnomalyTypes: [
      "fire",
      "electric",
      "ether",
      "ice",
      "physical",
      "auricInk",
      "frost",
    ],
  }
}

export function buildUnsupportedDamageTypeResponse(
  scopeLabel: BuildToolScopeLabel,
  supportedDamageTypes: readonly string[],
): BuildToolUnsupportedDamageTypeResponse {
  return {
    found: false,
    message: `${scopeLabel} 只适用于 ${supportedDamageTypes.join(" / ")}。`,
    supportedDamageTypes,
  }
}

export function buildUncoveredSourceDamageViewResponse<T extends CatalogItem>(
  items: readonly T[],
  query: string,
): BuildToolUncoveredSourceDamageViewResponse {
  return {
    found: false as const,
    message: `当前 ${buildToolScopeLabels.sourceDamageView} 暂未覆盖代理人「${query}」`,
    supportedAgents: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function buildMissingSourceUtilityWEngineResponse<T extends CatalogItem>(
  agentName: string,
  items: readonly T[],
): BuildToolMissingSourceUtilityWEngineResponse {
  return {
    found: false as const,
    message: `请先提供 ${agentName} 当前使用的音擎；${buildToolScopeLabels.sourceUtilityView} 目前只覆盖音擎来源。`,
    supportedWEngines: catalogNames(items),
  }
}

export function buildUncoveredSourceUtilityWEngineResponse<
  T extends CatalogItem,
>(
  items: readonly T[],
  query: string,
): BuildToolUncoveredSourceUtilityWEngineResponse {
  return {
    found: false as const,
    message: `当前 ${buildToolScopeLabels.sourceUtilityView} 暂未覆盖音擎「${query}」`,
    supportedWEngines: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function buildMissingSourceEntryFinalPanelResponse(): BuildToolMissingFinalPanelResponse {
  return {
    found: false,
    message: `anomaly / disorder 的 ${buildToolScopeLabels.sourceEntryCollection} 需要完整 finalPanel（至少 attack、critRate、critDamage，以及异常相关面板）。`,
  }
}

export function buildUncoveredSourceEntryUtilityOnlyResponse(
  agentName: string,
  supportedUtilityWEngines: string[],
): BuildToolUncoveredSourceEntryUtilityOnlyResponse {
  return {
    found: false,
    message: `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agentName} 的可返回条目；${buildToolScopeLabels.sourceUtilityView} 目前只覆盖音擎来源。`,
    supportedUtilityWEngines,
  }
}

export function buildUncoveredSourceEntryCoverageResponse<
  T extends CatalogItem,
>(
  agentName: string,
  sourceViewAgents: readonly T[],
  supportedUtilityWEngines: string[],
  candidates?: string[],
): BuildToolUncoveredSourceEntryCoverageResponse {
  return {
    found: false,
    message: `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agentName} 这套构筑的额外来源条目。`,
    supportedSourceViewAgents: catalogNames(sourceViewAgents),
    supportedUtilityWEngines,
    ...(candidates && candidates.length > 0 ? { candidates } : {}),
  }
}

export function normalizeAnomalyType(value: string): AnomalyType | undefined {
  const normalized = normalizeCatalogValue(value)
  switch (normalized) {
    case "fire":
    case "火":
    case "火属性":
    case "burn":
    case "灼烧":
      return "fire"
    case "electric":
    case "电":
    case "电属性":
    case "shock":
    case "感电":
      return "electric"
    case "ether":
    case "以太":
    case "以太属性":
    case "corruption":
    case "侵蚀":
      return "ether"
    case "ice":
    case "冰":
    case "冰属性":
    case "freeze":
    case "冻结":
      return "ice"
    case "physical":
    case "物理":
    case "物理属性":
    case "assault":
    case "强击":
      return "physical"
    case "auricink":
    case "auric":
    case "玄墨":
      return "auricInk"
    case "frost":
    case "烈霜":
      return "frost"
    default:
      return undefined
  }
}

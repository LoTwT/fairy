import type {
  AgentAttributeLabel,
  AnomalyType,
  CompactStaticBuildResult,
  CompactStaticBuildSkillMatrixResult,
  CompactStaticBuildSourceDamageViewsResult,
  CompactStaticBuildSourceEntryCollection,
  CompactStaticBuildSourceUtilityViewsResult,
  CompactStaticBuildTriggerMatrixResult,
  ResolveStaticBuildSourceEntriesInput,
  StaticBuildDriveDiscSetInput,
  StaticBuildLoadoutInput,
} from "zzz-data"
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

export interface BuildToolDamageSuccessResponse {
  found: true
  build: CompactStaticBuildResult
}

export interface BuildToolSkillMatrixSuccessResponse {
  found: true
  matrix: CompactStaticBuildSkillMatrixResult
}

export interface BuildToolTriggerMatrixSuccessResponse {
  found: true
  matrix: CompactStaticBuildTriggerMatrixResult
}

export interface BuildToolSourceDamageViewsSuccessResponse {
  found: true
  views: CompactStaticBuildSourceDamageViewsResult
}

export interface BuildToolSourceUtilityViewsSuccessResponse {
  found: true
  views: CompactStaticBuildSourceUtilityViewsResult
}

export interface BuildToolSourceEntryCollectionSuccessResponse {
  found: true
  collection: CompactStaticBuildSourceEntryCollection
}

export interface BuildToolResolvedDriveDiscSets {
  ok: true
  driveDiscSets: StaticBuildDriveDiscSetInput[]
}

export interface BuildToolResolvedLoadoutContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  compatibleWEngines: readonly TWEngine[]
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
}

export interface BuildToolResolvedAgent<T extends CatalogItem> {
  ok: true
  agent: T
}

export interface BuildToolRejectedAgent {
  ok: false
  response: BuildToolUnsupportedAgentResponse
}

export interface BuildToolResolvedWEngine<T extends CatalogItem> {
  ok: true
  wEngine: T | undefined
}

export interface BuildToolRejectedWEngine {
  ok: false
  response:
    | BuildToolUnsupportedWEngineResponse
    | BuildToolIncompatibleWEngineResponse
}

export interface BuildToolRejectedDriveDiscSets {
  ok: false
  response: BuildToolUnsupportedDriveDiscResponse
}

export interface BuildToolLoadoutInputOptions {
  agentId: string
  wEngineId?: string
  driveDiscSets?: StaticBuildDriveDiscSetInput[]
  agentLevel?: number
  agentMindscape?: number
  coreSkillLevel?: number
  wEngineRefinement?: number
}

export interface BuildToolProgressionInput {
  agentLevel?: number
  agentMindscape?: number
  coreSkillLevel?: number
  wEngineRefinement?: number
}

export interface BuildToolResolvedLoadoutOptions extends BuildToolProgressionInput {
  agent: Pick<CatalogItem, "id">
  wEngine?: Pick<CatalogItem, "id">
  driveDiscSets?: StaticBuildDriveDiscSetInput[]
}

export type BuildToolScenarioInput = z.infer<typeof resolveBuildScenarioSchema>

export type BuildToolResolvedScenario =
  | (Omit<
      Exclude<BuildToolScenarioInput, { damageType: "disorder" }>,
      "attribute"
    > & {
      attribute?: AgentAttributeLabel
    })
  | (Omit<
      Extract<BuildToolScenarioInput, { damageType: "disorder" }>,
      "anomalyType" | "attribute"
    > & {
      anomalyType: AnomalyType
      attribute?: AgentAttributeLabel
    })

export interface BuildToolSourceUtilitySupport<T extends CatalogItem> {
  items: T[]
  names: string[]
}

export interface BuildToolResolveLoadoutContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolProgressionInput {
  scopeLabel: BuildToolScopeLabel
  supportedAgents: readonly TAgent[]
  supportedWEngines: readonly TWEngine[]
  supportedDriveDiscs: readonly TDriveDisc[]
  agentQuery: string
  wEngineQuery?: string
  driveDiscs?:
    | Array<{
        name: string
        pieces: 2 | 4
      }>
    | undefined
  getCompatibleWEngines: (agent: TAgent) => readonly TWEngine[]
}

export interface BuildToolResolveTriggeredDamageContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  scenario: BuildToolScenarioInput
}

export interface BuildToolResolvedSourceEntriesContext {
  utilityOnly: boolean
  scenario: ResolveStaticBuildSourceEntriesInput["scenario"]
  panel: ResolveStaticBuildSourceEntriesInput["panel"]
}

export interface BuildToolResolveSourceUtilityCoverageResponseOptions<
  TWEngine extends CatalogItem,
> {
  agentName: string
  supportedWEngines: readonly TWEngine[]
  wEngine?: TWEngine
}

export interface BuildToolResolveSourceEntryCoverageResponseOptions<
  TSourceViewAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  agentName: string
  utilityOnly: boolean
  wEngine?: TWEngine
  wEngineQuery?: string
  compatibleWEngines: readonly TWEngine[]
  supportedSourceViewAgents: readonly TSourceViewAgent[]
  supportedUtilityWEngines: string[]
}

export interface BuildToolResolvedTriggeredDamageContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  loadout: StaticBuildLoadoutInput
  scenario: Extract<
    BuildToolResolvedScenario,
    { damageType: "anomaly" | "disorder" }
  >
  wEngine: TWEngine | undefined
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

export const skillMatrixFinalPanelSchema = finalPanelSchema.pick({
  attack: true,
  baseAttack: true,
  critRate: true,
  critDamage: true,
  hp: true,
  sheerForce: true,
  energyGenerationRate: true,
  penetrationRate: true,
  penetrationValue: true,
})

export const resolveBuildSkillMatrixContextSchema = z.object({
  attribute: z.string().optional(),
  extraAbilityActive: z.boolean().optional(),
  combatTags: z.array(z.string()).optional(),
  enemy: enemySchema,
})

export const resolveBuildSkillMatrixInputSchema = z.object({
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
  finalPanel: skillMatrixFinalPanelSchema,
  context: resolveBuildSkillMatrixContextSchema,
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
      "是否返回 skill matrix 完整明细，包括顶层 matrix.assumptions / matrix.unsupportedEffects，以及每行的 row.assumptions / row.unsupportedEffects / row.diagnostics / row.sourceNotes / build。默认 false，以避免上下文过大。",
    ),
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

export function resolveBuildToolAgent<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  supportedAgents: readonly T[],
  query: string,
): BuildToolResolvedAgent<T> | BuildToolRejectedAgent {
  const agent = findCatalogItem(supportedAgents, query)
  if (!agent) {
    return {
      ok: false,
      response: buildUnsupportedAgentResponse(
        scopeLabel,
        supportedAgents,
        query,
      ),
    }
  }

  return {
    ok: true,
    agent,
  }
}

export function resolveBuildToolWEngine<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
>(
  scopeLabel: BuildToolScopeLabel,
  supportedWEngines: readonly TWEngine[],
  compatibleWEngines: readonly TWEngine[],
  query: string | undefined,
  agent: TAgent,
): BuildToolResolvedWEngine<TWEngine> | BuildToolRejectedWEngine {
  if (!query) {
    return {
      ok: true,
      wEngine: undefined,
    }
  }

  const wEngine = findCatalogItem(supportedWEngines, query)
  if (!wEngine) {
    return {
      ok: false,
      response: buildUnsupportedWEngineResponse(
        scopeLabel,
        compatibleWEngines,
        query,
      ),
    }
  }

  if (wEngine.specialty !== agent.specialty) {
    return {
      ok: false,
      response: buildIncompatibleWEngineResponse(
        agent,
        wEngine,
        compatibleWEngines,
        query,
      ),
    }
  }

  return {
    ok: true,
    wEngine,
  }
}

export function resolveBuildToolDriveDiscSets<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  driveDiscs:
    | Array<{
        name: string
        pieces: 2 | 4
      }>
    | undefined,
  supportedDriveDiscs: readonly T[],
): BuildToolResolvedDriveDiscSets | BuildToolRejectedDriveDiscSets {
  const driveDiscSets: StaticBuildDriveDiscSetInput[] = []

  for (const discInput of driveDiscs ?? []) {
    const disc = findCatalogItem(supportedDriveDiscs, discInput.name)
    if (!disc) {
      return {
        ok: false,
        response: buildUnsupportedDriveDiscResponse(
          scopeLabel,
          supportedDriveDiscs,
          discInput.name,
        ),
      }
    }

    driveDiscSets.push({
      id: disc.id,
      pieces: discInput.pieces,
    })
  }

  return {
    ok: true,
    driveDiscSets,
  }
}

export function buildToolLoadoutInput({
  agentId,
  wEngineId,
  driveDiscSets,
  agentLevel,
  agentMindscape,
  coreSkillLevel,
  wEngineRefinement,
}: BuildToolLoadoutInputOptions): StaticBuildLoadoutInput {
  return {
    agentId,
    wEngineId,
    driveDiscSets,
    agentLevel,
    agentMindscape,
    coreSkillLevel,
    wEngineRefinement,
  }
}

export function buildToolResolvedLoadoutInput({
  agent,
  wEngine,
  driveDiscSets,
  agentLevel,
  agentMindscape,
  coreSkillLevel,
  wEngineRefinement,
}: BuildToolResolvedLoadoutOptions): StaticBuildLoadoutInput {
  return buildToolLoadoutInput({
    agentId: agent.id,
    wEngineId: wEngine?.id,
    driveDiscSets,
    agentLevel,
    agentMindscape,
    coreSkillLevel,
    wEngineRefinement,
  })
}

export function resolveBuildToolSourceUtilitySupport<
  T extends CatalogItem & { specialty?: string },
>(
  supportedWEngines: readonly T[],
  specialty: string | undefined,
): BuildToolSourceUtilitySupport<T> {
  const items = supportedWEngines.filter((item) => item.specialty === specialty)

  return {
    items,
    names: catalogNames(items),
  }
}

export function resolveBuildToolLoadoutContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc>,
):
  | BuildToolResolvedLoadoutContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  const agentResolution = resolveBuildToolAgent(
    options.scopeLabel,
    options.supportedAgents,
    options.agentQuery,
  )
  if (!agentResolution.ok) {
    return agentResolution
  }

  const agent = agentResolution.agent
  const compatibleWEngines = options.getCompatibleWEngines(agent)
  const wEngineResolution = resolveBuildToolWEngine(
    options.scopeLabel,
    options.supportedWEngines,
    compatibleWEngines,
    options.wEngineQuery,
    agent,
  )
  if (!wEngineResolution.ok) {
    return wEngineResolution
  }

  const driveDiscResolution = resolveBuildToolDriveDiscSets(
    options.scopeLabel,
    options.driveDiscs,
    options.supportedDriveDiscs,
  )
  if (!driveDiscResolution.ok) {
    return driveDiscResolution
  }

  return {
    ok: true,
    agent,
    compatibleWEngines,
    wEngine: wEngineResolution.wEngine,
    loadout: buildToolResolvedLoadoutInput({
      agent,
      wEngine: wEngineResolution.wEngine,
      driveDiscSets: driveDiscResolution.driveDiscSets,
      agentLevel: options.agentLevel,
      agentMindscape: options.agentMindscape,
      coreSkillLevel: options.coreSkillLevel,
      wEngineRefinement: options.wEngineRefinement,
    }),
  }
}

export function resolveBuildToolTriggeredDamageContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveTriggeredDamageContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedTriggeredDamageContext<TAgent, TWEngine>
  | {
      ok: false
      response:
        | BuildToolUnsupportedDamageTypeResponse
        | BuildToolUnsupportedAnomalyTypeResponse
        | BuildToolUnsupportedAgentResponse
        | BuildToolUnsupportedWEngineResponse
        | BuildToolIncompatibleWEngineResponse
        | BuildToolUnsupportedDriveDiscResponse
    } {
  const damageTypeResolution = resolveBuildToolDamageType(
    options.scopeLabel,
    options.scenario.damageType,
    ["anomaly", "disorder"],
  )
  if (!damageTypeResolution.ok) {
    return damageTypeResolution
  }

  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const scenarioResolution = resolveBuildToolResolvedScenario(options.scenario)
  if (!scenarioResolution.ok) {
    return scenarioResolution
  }

  return {
    ok: true,
    agent: loadoutResolution.agent,
    loadout: loadoutResolution.loadout,
    scenario: scenarioResolution.scenario as Extract<
      BuildToolResolvedScenario,
      { damageType: "anomaly" | "disorder" }
    >,
    wEngine: loadoutResolution.wEngine,
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

export function normalizeBuildToolAttribute(
  value: string | undefined,
): AgentAttributeLabel | undefined {
  return value as AgentAttributeLabel | undefined
}

export function resolveBuildToolScenario<T extends { attribute?: string }>(
  scenario: T,
): Omit<T, "attribute"> & { attribute?: AgentAttributeLabel } {
  return {
    ...scenario,
    attribute: normalizeBuildToolAttribute(scenario.attribute),
  }
}

export function resolveBuildToolDisorderScenario<
  T extends {
    anomalyType: string
    attribute?: string
  },
>(
  scenario: T,
):
  | {
      ok: true
      scenario: Omit<T, "anomalyType" | "attribute"> & {
        anomalyType: AnomalyType
        attribute?: AgentAttributeLabel
      }
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  const anomalyType = normalizeAnomalyType(scenario.anomalyType)
  if (!anomalyType) {
    return {
      ok: false,
      response: buildUnsupportedAnomalyTypeResponse(scenario.anomalyType),
    }
  }

  return {
    ok: true,
    scenario: {
      ...scenario,
      anomalyType,
      attribute: normalizeBuildToolAttribute(scenario.attribute),
    },
  }
}

export function resolveBuildToolResolvedScenario(
  scenario: BuildToolScenarioInput,
):
  | {
      ok: true
      scenario: BuildToolResolvedScenario
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  if (scenario.damageType === "disorder") {
    return resolveBuildToolDisorderScenario(scenario)
  }

  return {
    ok: true,
    scenario: resolveBuildToolScenario(scenario),
  }
}

export function resolveBuildToolOptionalScenario(
  scenario: BuildToolScenarioInput | undefined,
):
  | {
      ok: true
      scenario: BuildToolResolvedScenario | undefined
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  if (!scenario) {
    return {
      ok: true,
      scenario: undefined,
    }
  }

  return resolveBuildToolResolvedScenario(scenario)
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

export function resolveBuildToolDamageType<TDamageType extends string>(
  scopeLabel: BuildToolScopeLabel,
  damageType: string,
  supportedDamageTypes: readonly TDamageType[],
):
  | {
      ok: true
      damageType: TDamageType
    }
  | {
      ok: false
      response: BuildToolUnsupportedDamageTypeResponse
    } {
  if (!supportedDamageTypes.includes(damageType as TDamageType)) {
    return {
      ok: false,
      response: buildUnsupportedDamageTypeResponse(
        scopeLabel,
        supportedDamageTypes,
      ),
    }
  }

  return {
    ok: true,
    damageType: damageType as TDamageType,
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

export function resolveBuildToolSourceUtilityCoverageResponse<
  TWEngine extends CatalogItem,
>(
  options: BuildToolResolveSourceUtilityCoverageResponseOptions<TWEngine>,
):
  | BuildToolMissingSourceUtilityWEngineResponse
  | BuildToolUncoveredSourceUtilityWEngineResponse {
  if (!options.wEngine) {
    return buildMissingSourceUtilityWEngineResponse(
      options.agentName,
      options.supportedWEngines,
    )
  }

  return buildUncoveredSourceUtilityWEngineResponse(
    options.supportedWEngines,
    options.wEngine.name,
  )
}

export function buildMissingSourceEntryFinalPanelResponse(): BuildToolMissingFinalPanelResponse {
  return {
    found: false,
    message: `anomaly / disorder 的 ${buildToolScopeLabels.sourceEntryCollection} 需要完整 finalPanel（至少 attack、critRate、critDamage，以及异常相关面板）。`,
  }
}

export function resolveBuildToolSourceEntriesContext(input: {
  scenario: BuildToolScenarioInput | undefined
  finalPanel: z.input<typeof finalPanelSchema> | undefined
}):
  | {
      ok: true
      context: BuildToolResolvedSourceEntriesContext
    }
  | {
      ok: false
      response:
        | BuildToolMissingFinalPanelResponse
        | BuildToolUnsupportedAnomalyTypeResponse
    } {
  const utilityOnly =
    !input.scenario ||
    input.scenario.damageType === "normal" ||
    input.scenario.damageType === "sheer"

  const scenarioResolution = resolveBuildToolOptionalScenario(input.scenario)
  if (!scenarioResolution.ok) {
    return scenarioResolution
  }

  const scenario = scenarioResolution.scenario
  let panel: ResolveStaticBuildSourceEntriesInput["panel"]

  if (
    scenario &&
    (scenario.damageType === "anomaly" || scenario.damageType === "disorder")
  ) {
    const fullPanel = finalPanelSchema.safeParse(input.finalPanel)
    if (!fullPanel.success) {
      return {
        ok: false,
        response: buildMissingSourceEntryFinalPanelResponse(),
      }
    }
    panel = fullPanel.data
  } else if (input.finalPanel) {
    panel = {
      attack: input.finalPanel.attack ?? 0,
      critRate: input.finalPanel.critRate ?? 0,
      critDamage: input.finalPanel.critDamage ?? 0,
      ...input.finalPanel,
    }
  }

  return {
    ok: true,
    context: {
      utilityOnly,
      scenario,
      panel,
    },
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

export function resolveBuildToolUncoveredSourceEntryResponse<
  TSourceViewAgent extends CatalogItem,
  TWEngine extends CatalogItem,
>(
  options: BuildToolResolveSourceEntryCoverageResponseOptions<
    TSourceViewAgent,
    TWEngine
  >,
):
  | BuildToolUncoveredSourceEntryUtilityOnlyResponse
  | BuildToolUncoveredSourceEntryCoverageResponse {
  if (options.utilityOnly || !options.wEngine) {
    return buildUncoveredSourceEntryUtilityOnlyResponse(
      options.agentName,
      options.supportedUtilityWEngines,
    )
  }

  return buildUncoveredSourceEntryCoverageResponse(
    options.agentName,
    options.supportedSourceViewAgents,
    options.supportedUtilityWEngines,
    options.wEngineQuery
      ? candidateNames(options.compatibleWEngines, options.wEngineQuery)
      : [],
  )
}

export function buildDamageSuccessResponse(
  build: CompactStaticBuildResult,
): BuildToolDamageSuccessResponse {
  return {
    found: true,
    build,
  }
}

export function buildSkillMatrixSuccessResponse(
  matrix: CompactStaticBuildSkillMatrixResult,
): BuildToolSkillMatrixSuccessResponse {
  return {
    found: true,
    matrix,
  }
}

export function buildTriggerMatrixSuccessResponse(
  matrix: CompactStaticBuildTriggerMatrixResult,
): BuildToolTriggerMatrixSuccessResponse {
  return {
    found: true,
    matrix,
  }
}

export function buildSourceDamageViewsSuccessResponse(
  views: CompactStaticBuildSourceDamageViewsResult,
): BuildToolSourceDamageViewsSuccessResponse {
  return {
    found: true,
    views,
  }
}

export function buildSourceUtilityViewsSuccessResponse(
  views: CompactStaticBuildSourceUtilityViewsResult,
): BuildToolSourceUtilityViewsSuccessResponse {
  return {
    found: true,
    views,
  }
}

export function buildSourceEntryCollectionSuccessResponse(
  collection: CompactStaticBuildSourceEntryCollection,
): BuildToolSourceEntryCollectionSuccessResponse {
  return {
    found: true,
    collection,
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

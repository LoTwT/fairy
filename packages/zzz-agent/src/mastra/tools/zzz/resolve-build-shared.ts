import type {
  AgentAttributeLabel,
  AnomalyType,
  ResolveStaticBuildSourceEntriesInput,
  StaticBuildDriveDiscSetInput,
  StaticBuildLoadoutInput,
} from "zzz-data"
import type {
  BuildToolIncompatibleWEngineResponse,
  BuildToolMissingFinalPanelResponse,
  BuildToolScopeLabel,
  BuildToolUnsupportedAgentResponse,
  BuildToolUnsupportedAnomalyTypeResponse,
  BuildToolUnsupportedDamageTypeResponse,
  BuildToolUnsupportedDriveDiscResponse,
  BuildToolUnsupportedWEngineResponse,
  CatalogItem,
} from "./resolve-build-contracts"
import type { specialtyLabels } from "./resolve-build-labels"
import { z } from "zod"
import {
  catalogNames,
  findCatalogItem,
  normalizeCatalogValue,
} from "./resolve-build-catalog"
import {
  buildIncompatibleWEngineResponse,
  buildMissingSourceEntryFinalPanelResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDamageTypeResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
} from "./resolve-build-responses"

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

export interface BuildToolResolvedDamageExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  scenario: BuildToolResolvedScenario
}

export interface BuildToolResolvedSkillMatrixExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  context: BuildToolResolvedSkillMatrixContext
}

export interface BuildToolResolvedSourceUtilityExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  supportedUtilityWEngines: TWEngine[]
  supportedUtilityWEngineNames: string[]
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

export type BuildToolSkillMatrixContextInput = z.infer<
  typeof resolveBuildSkillMatrixContextSchema
>

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

export type BuildToolResolvedSkillMatrixContext = Omit<
  BuildToolSkillMatrixContextInput,
  "attribute"
> & {
  attribute?: AgentAttributeLabel
}

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

export interface BuildToolResolveSourceEntriesLoadoutContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolProgressionInput {
  utilityOnly: boolean
  scopeLabel: BuildToolScopeLabel
  supportedAgents: readonly TAgent[]
  supportedUtilityAgents: readonly TAgent[]
  supportedWEngines: readonly TWEngine[]
  supportedUtilityWEngines: readonly TWEngine[]
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
  getCompatibleUtilityWEngines: (agent: TAgent) => readonly TWEngine[]
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

export interface BuildToolResolvedSourceEntriesExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  utilityOnly: boolean
  scenario: ResolveStaticBuildSourceEntriesInput["scenario"]
  panel: ResolveStaticBuildSourceEntriesInput["panel"]
  agent: TAgent
  compatibleWEngines: readonly TWEngine[]
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  supportedUtilityWEngines: string[]
}

export interface BuildToolResolveSourceEntriesExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveSourceEntriesLoadoutContextOptions<
  TAgent,
  TWEngine,
  TDriveDisc
> {
  scenario: BuildToolScenarioInput | undefined
  finalPanel: z.input<typeof finalPanelSchema> | undefined
  supportedSourceUtilityWEngines: readonly TWEngine[]
}

export interface BuildToolResolveDamageExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  scenario: BuildToolScenarioInput
}

export interface BuildToolResolveSkillMatrixExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  context: BuildToolSkillMatrixContextInput
}

export interface BuildToolResolveSourceUtilityExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  supportedSourceUtilityWEngines: readonly TWEngine[]
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

export const resolveBuildDamageIncludeDetailsSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回完整单场景 build 细节（assumptions、unsupportedEffects、diagnostics/sourceNotes、trace、damageParams）。默认 false，以避免上下文过大。",
  )

export const resolveBuildTriggerMatrixIncludeDetailsSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 trigger matrix 完整明细，包括顶层 matrix.assumptions，以及每行的 row.assumptions / row.requirements / row.diagnostics / row.sourceNotes；在原始结果带 build 时也透传 row.build。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

export const resolveBuildSourceDamageViewsIncludeDetailsSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 source-damage-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；在原始结果带 build 时也透传 entry.build。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

export const resolveBuildSourceUtilityViewsIncludeDetailsSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 source-utility-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

export const resolveBuildSourceEntriesIncludeDetailsSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 source-entry collection 完整明细，包括顶层 collection.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；若某条 source-damage-view entry 原始结果带有 build，也会一并返回完整 build 结果（trace、damageParams 等）。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

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

export function resolveBuildToolSourceEntriesLoadoutContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSourceEntriesLoadoutContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedLoadoutContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  return resolveBuildToolLoadoutContext({
    scopeLabel: options.scopeLabel,
    supportedAgents: options.utilityOnly
      ? options.supportedUtilityAgents
      : options.supportedAgents,
    supportedWEngines: options.utilityOnly
      ? options.supportedUtilityWEngines
      : options.supportedWEngines,
    supportedDriveDiscs: options.supportedDriveDiscs,
    agentQuery: options.agentQuery,
    wEngineQuery: options.wEngineQuery,
    driveDiscs: options.driveDiscs,
    getCompatibleWEngines: options.utilityOnly
      ? options.getCompatibleUtilityWEngines
      : options.getCompatibleWEngines,
    agentLevel: options.agentLevel,
    agentMindscape: options.agentMindscape,
    coreSkillLevel: options.coreSkillLevel,
    wEngineRefinement: options.wEngineRefinement,
  })
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

export function resolveBuildToolResolvedSkillMatrixContext(
  context: BuildToolSkillMatrixContextInput,
): BuildToolResolvedSkillMatrixContext {
  return resolveBuildToolScenario(context)
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

export function resolveBuildToolSourceEntriesExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSourceEntriesExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedSourceEntriesExecutionContext<TAgent, TWEngine>
  | {
      ok: false
      response:
        | BuildToolMissingFinalPanelResponse
        | BuildToolUnsupportedAnomalyTypeResponse
        | BuildToolUnsupportedAgentResponse
        | BuildToolUnsupportedWEngineResponse
        | BuildToolIncompatibleWEngineResponse
        | BuildToolUnsupportedDriveDiscResponse
    } {
  const sourceEntriesContext = resolveBuildToolSourceEntriesContext({
    scenario: options.scenario,
    finalPanel: options.finalPanel,
  })
  if (!sourceEntriesContext.ok) {
    return sourceEntriesContext
  }

  const loadoutResolution = resolveBuildToolSourceEntriesLoadoutContext({
    ...options,
    utilityOnly: sourceEntriesContext.context.utilityOnly,
  })
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
    options.supportedSourceUtilityWEngines,
    loadoutResolution.agent.specialty,
  )

  return {
    ok: true,
    utilityOnly: sourceEntriesContext.context.utilityOnly,
    scenario: sourceEntriesContext.context.scenario,
    panel: sourceEntriesContext.context.panel,
    agent: loadoutResolution.agent,
    compatibleWEngines: loadoutResolution.compatibleWEngines,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    supportedUtilityWEngines: sourceUtilitySupport.names,
  }
}

export function resolveBuildToolDamageExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveDamageExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedDamageExecutionContext<TAgent, TWEngine>
  | {
      ok: false
      response:
        | BuildToolUnsupportedAnomalyTypeResponse
        | BuildToolUnsupportedAgentResponse
        | BuildToolUnsupportedWEngineResponse
        | BuildToolIncompatibleWEngineResponse
        | BuildToolUnsupportedDriveDiscResponse
    } {
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
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    scenario: scenarioResolution.scenario,
  }
}

export function resolveBuildToolSkillMatrixExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSkillMatrixExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedSkillMatrixExecutionContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  return {
    ok: true,
    agent: loadoutResolution.agent,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    context: resolveBuildToolResolvedSkillMatrixContext(options.context),
  }
}

export function resolveBuildToolSourceUtilityExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSourceUtilityExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedSourceUtilityExecutionContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
    options.supportedSourceUtilityWEngines,
    loadoutResolution.agent.specialty,
  )

  return {
    ok: true,
    agent: loadoutResolution.agent,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    supportedUtilityWEngines: sourceUtilitySupport.items,
    supportedUtilityWEngineNames: sourceUtilitySupport.names,
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

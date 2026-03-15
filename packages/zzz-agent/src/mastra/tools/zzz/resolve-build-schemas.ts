import type {
  StaticBuildAnomalyCritDamage,
  StaticBuildAnomalyCritRate,
  StaticBuildAnomalyMastery,
  StaticBuildAnomalyProficiency,
  StaticBuildAttack,
  StaticBuildBaseAttack,
  StaticBuildCritDamage,
  StaticBuildCritRate,
  StaticBuildDamageType,
  StaticBuildDriveDiscPieces,
  StaticBuildEnergyGenerationRate,
  StaticBuildHP,
  StaticBuildPenetrationRate,
  StaticBuildPenetrationValue,
  StaticBuildRemainingTime,
  StaticBuildSheerForce,
  StaticBuildSkillTag,
} from "zzz-data"
import { z as zod } from "zod"

export const skillTagSchema = zod.enum([
  "basic",
  "dash",
  "special",
  "enhancedSpecial",
  "chain",
  "ultimate",
  "assist",
])

export type BuildToolSkillTag = StaticBuildSkillTag

export interface BuildToolDriveDiscSetInput {
  name: string
  pieces: StaticBuildDriveDiscPieces
}

export interface BuildToolEnemyInput {
  attackerLevel?: number
  defenderBaseDefense: number
  defenderResistance: number
  defenseBonus?: number
  defenseReduction?: number
  resistanceReduction?: number
  ignoreResistance?: number
  vulnerabilityBonus?: number
  damageReduction?: number
  isStunned?: boolean
  stunVulnerability?: number
  nonStunVulnerability?: number
  specialMultiplier?: number
}

export interface BuildToolDynamicSnapshotInput {
  flags?: {
    ariaDreamtime?: boolean
    burniceEmberState?: boolean
  }
  counts?: {
    burniceEmberExtraTriggers?: number
  }
  values?: {
    ariaExflowDamageRatio?: number
    ariaStunnedDamageRatio?: number
    burniceEmberDamageRatio?: number
  }
}

export interface BuildToolStateSnapshotInput {
  flags?: {
    alicePolarityAssaultState?: boolean
    miyabiFrostburnBreakState?: boolean
  }
  values?: {
    alicePolarityAssaultDamageRatio?: number
    miyabiFrostburnBreakDamageRatio?: number
  }
}

export interface BuildToolResolvedSnapshotInput {
  bucketDeltas?: {
    bonusDamageSum?: number
    defenseReduction?: number
    penetrationRate?: number
    resistanceReduction?: number
    ignoreResistance?: number
    sheerBonusSum?: number
    anomalyProficiency?: number
    anomalyBonusDamageSum?: number
    anomalyCritRate?: number
    anomalyCritDamage?: number
  }
  multiplierFactors?: {
    skillMultiplierFactor?: number
  }
}

export type BuildToolDamageType = StaticBuildDamageType

interface BuildToolBaseScenarioInput {
  attribute?: string
  extraAbilityActive?: boolean
  combatTags?: string[]
  dynamicSnapshot?: BuildToolDynamicSnapshotInput
  stateSnapshot?: BuildToolStateSnapshotInput
  resolvedSnapshot?: BuildToolResolvedSnapshotInput
  enemy: BuildToolEnemyInput
}

export interface BuildToolNormalScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "normal"
  skillTag: BuildToolSkillTag
  skillMultiplier: number | string
}

export interface BuildToolSheerScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "sheer"
  skillTag: BuildToolSkillTag
  skillMultiplier: number | string
}

export interface BuildToolAnomalyScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "anomaly"
  skillTag: BuildToolSkillTag
  damageMultiplier: number | string
}

export interface BuildToolDisorderScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "disorder"
  skillTag: BuildToolSkillTag
  anomalyType: string
  remainingTime: StaticBuildRemainingTime
}

export type BuildToolScenarioInput =
  | BuildToolNormalScenarioInput
  | BuildToolSheerScenarioInput
  | BuildToolAnomalyScenarioInput
  | BuildToolDisorderScenarioInput

export interface BuildToolSkillMatrixContextInput {
  attribute?: string
  extraAbilityActive?: boolean
  combatTags?: string[]
  enemy: BuildToolEnemyInput
}

export interface BuildToolFinalPanelInput {
  attack: StaticBuildAttack
  baseAttack?: StaticBuildBaseAttack
  critRate: StaticBuildCritRate
  critDamage: StaticBuildCritDamage
  hp?: StaticBuildHP
  sheerForce?: StaticBuildSheerForce
  energyGenerationRate?: StaticBuildEnergyGenerationRate
  anomalyProficiency?: StaticBuildAnomalyProficiency
  anomalyMastery?: StaticBuildAnomalyMastery
  anomalyCritRate?: StaticBuildAnomalyCritRate
  anomalyCritDamage?: StaticBuildAnomalyCritDamage
  penetrationRate?: StaticBuildPenetrationRate
  penetrationValue?: StaticBuildPenetrationValue
}

export const enemySchema = zod.object({
  attackerLevel: zod.number().optional().default(60),
  defenderBaseDefense: zod.number(),
  defenderResistance: zod.number(),
  defenseBonus: zod.number().optional().default(0),
  defenseReduction: zod.number().optional().default(0),
  resistanceReduction: zod.number().optional().default(0),
  ignoreResistance: zod.number().optional().default(0),
  vulnerabilityBonus: zod.number().optional().default(0),
  damageReduction: zod.number().optional().default(0),
  isStunned: zod.boolean().optional().default(false),
  stunVulnerability: zod.number().optional().default(0),
  nonStunVulnerability: zod.number().optional().default(0),
  specialMultiplier: zod.number().optional().default(1),
})

export const dynamicSnapshotSchema = zod
  .object({
    flags: zod
      .object({
        ariaDreamtime: zod.boolean().optional(),
        burniceEmberState: zod.boolean().optional(),
      })
      .optional(),
    counts: zod
      .object({
        burniceEmberExtraTriggers: zod.number().int().min(0).optional(),
      })
      .optional(),
    values: zod
      .object({
        ariaExflowDamageRatio: zod.number().min(0).optional(),
        ariaStunnedDamageRatio: zod.number().min(0).optional(),
        burniceEmberDamageRatio: zod.number().min(0).optional(),
      })
      .optional(),
  })
  .optional()

export const stateSnapshotSchema = zod
  .object({
    flags: zod
      .object({
        alicePolarityAssaultState: zod.boolean().optional(),
        miyabiFrostburnBreakState: zod.boolean().optional(),
      })
      .optional(),
    values: zod
      .object({
        alicePolarityAssaultDamageRatio: zod.number().min(0).optional(),
        miyabiFrostburnBreakDamageRatio: zod.number().min(0).optional(),
      })
      .optional(),
  })
  .optional()

export const resolvedSnapshotSchema = zod
  .object({
    bucketDeltas: zod
      .object({
        bonusDamageSum: zod.number().optional(),
        defenseReduction: zod.number().optional(),
        penetrationRate: zod.number().optional(),
        resistanceReduction: zod.number().optional(),
        ignoreResistance: zod.number().optional(),
        sheerBonusSum: zod.number().optional(),
        anomalyProficiency: zod.number().optional(),
        anomalyBonusDamageSum: zod.number().optional(),
        anomalyCritRate: zod.number().optional(),
        anomalyCritDamage: zod.number().optional(),
      })
      .optional(),
    multiplierFactors: zod
      .object({
        skillMultiplierFactor: zod.number().min(0).optional(),
      })
      .optional(),
  })
  .optional()

export const finalPanelSchema = zod.object({
  attack: zod.number(),
  baseAttack: zod.number().optional(),
  critRate: zod.number(),
  critDamage: zod.number(),
  hp: zod.number().optional(),
  sheerForce: zod.number().optional(),
  energyGenerationRate: zod.number().optional(),
  anomalyProficiency: zod.number().optional(),
  anomalyMastery: zod.number().optional(),
  anomalyCritRate: zod.number().optional(),
  anomalyCritDamage: zod.number().optional(),
  penetrationRate: zod.number().optional(),
  penetrationValue: zod.number().optional(),
})

export const resolveBuildScenarioSchema = zod.discriminatedUnion("damageType", [
  zod.object({
    damageType: zod.literal("normal"),
    skillTag: skillTagSchema,
    skillMultiplier: zod.union([zod.number(), zod.string()]),
    attribute: zod.string().optional(),
    extraAbilityActive: zod.boolean().optional(),
    combatTags: zod.array(zod.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  zod.object({
    damageType: zod.literal("sheer"),
    skillTag: skillTagSchema,
    skillMultiplier: zod.union([zod.number(), zod.string()]),
    attribute: zod.string().optional(),
    extraAbilityActive: zod.boolean().optional(),
    combatTags: zod.array(zod.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  zod.object({
    damageType: zod.literal("anomaly"),
    skillTag: skillTagSchema,
    damageMultiplier: zod.union([zod.number(), zod.string()]),
    attribute: zod.string().optional(),
    extraAbilityActive: zod.boolean().optional(),
    combatTags: zod.array(zod.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  zod.object({
    damageType: zod.literal("disorder"),
    skillTag: skillTagSchema,
    anomalyType: zod.string(),
    remainingTime: zod.number().min(0),
    attribute: zod.string().optional(),
    extraAbilityActive: zod.boolean().optional(),
    combatTags: zod.array(zod.string()).optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
])

export const driveDiscSetSchema = zod.object({
  name: zod.string().describe("驱动盘名称或 ID"),
  pieces: zod.union([zod.literal(2), zod.literal(4)]),
})

export const resolveBuildInputSchema = zod.object({
  agent: zod.string().describe("代理人名称或 ID"),
  wEngine: zod.string().optional().describe("音擎名称或 ID"),
  driveDiscs: zod.array(driveDiscSetSchema).optional(),
  coreSkillLevel: zod.number().min(1).max(7).optional().default(7),
  wEngineRefinement: zod.number().min(1).max(5).optional().default(1),
  agentLevel: zod.number().min(1).max(60).optional(),
  agentMindscape: zod.number().int().min(0).max(6).optional(),
  mode: zod
    .enum(["baseline", "full-buff", "manual"])
    .optional()
    .default("baseline"),
  manualBaseMode: zod.enum(["baseline", "full-buff"]).optional(),
  finalPanel: finalPanelSchema,
  scenario: resolveBuildScenarioSchema,
  effectOverrides: zod
    .array(
      zod.object({
        effectId: zod.string(),
        enabled: zod.boolean().optional(),
        stacks: zod.number().int().min(0).optional(),
      }),
    )
    .optional(),
})

export const resolveBuildSourceUtilityInputSchema = zod.object({
  agent: zod.string().describe("代理人名称或 ID"),
  wEngine: zod.string().optional().describe("音擎名称或 ID"),
  driveDiscs: zod.array(driveDiscSetSchema).optional(),
  coreSkillLevel: zod.number().min(1).max(7).optional().default(7),
  wEngineRefinement: zod.number().min(1).max(5).optional().default(1),
  agentLevel: zod.number().min(1).max(60).optional(),
  agentMindscape: zod.number().int().min(0).max(6).optional(),
  finalPanel: finalPanelSchema.partial().optional(),
})

export const resolveBuildSourceEntriesInputSchema =
  resolveBuildSourceUtilityInputSchema.extend({
    mode: zod
      .enum(["baseline", "full-buff", "manual"])
      .optional()
      .default("baseline"),
    manualBaseMode: zod.enum(["baseline", "full-buff"]).optional(),
    scenario: resolveBuildScenarioSchema.optional(),
    effectOverrides: zod
      .array(
        zod.object({
          effectId: zod.string(),
          enabled: zod.boolean().optional(),
          stacks: zod.number().int().min(0).optional(),
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

export const resolveBuildSkillMatrixContextSchema = zod.object({
  attribute: zod.string().optional(),
  extraAbilityActive: zod.boolean().optional(),
  combatTags: zod.array(zod.string()).optional(),
  enemy: enemySchema,
})

export const resolveBuildSkillMatrixInputSchema = zod.object({
  agent: zod.string().describe("代理人名称或 ID"),
  wEngine: zod.string().optional().describe("音擎名称或 ID"),
  driveDiscs: zod.array(driveDiscSetSchema).optional(),
  agentMindscape: zod.number().int().min(0).max(6).optional(),
  coreSkillLevel: zod.number().min(1).max(7).optional().default(7),
  wEngineRefinement: zod.number().min(1).max(5).optional().default(1),
  mode: zod
    .enum(["baseline", "full-buff", "manual"])
    .optional()
    .default("baseline"),
  manualBaseMode: zod.enum(["baseline", "full-buff"]).optional(),
  finalPanel: skillMatrixFinalPanelSchema,
  context: resolveBuildSkillMatrixContextSchema,
  effectOverrides: zod
    .array(
      zod.object({
        effectId: zod.string(),
        enabled: zod.boolean().optional(),
        stacks: zod.number().int().min(0).optional(),
      }),
    )
    .optional(),
  includeDetails: zod
    .boolean()
    .optional()
    .default(false)
    .describe(
      "是否返回 skill matrix 完整明细，包括顶层 matrix.assumptions / matrix.unsupportedEffects，以及每行的 row.assumptions / row.unsupportedEffects / row.diagnostics / row.sourceNotes / build。默认 false，以避免上下文过大。",
    ),
})

export const resolveBuildDamageIncludeDetailsSchema = zod
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回完整单场景 build 细节（assumptions、unsupportedEffects、diagnostics/sourceNotes、trace、damageParams）。默认 false，以避免上下文过大。",
  )

export const resolveBuildTriggerMatrixIncludeDetailsSchema = zod
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 trigger matrix 完整明细，包括顶层 matrix.assumptions，以及每行的 row.assumptions / row.requirements / row.diagnostics / row.sourceNotes；在原始结果带 build 时也透传 row.build。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

export const resolveBuildSourceDamageViewsIncludeDetailsSchema = zod
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 source-damage-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；在原始结果带 build 时也透传 entry.build。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

export const resolveBuildSourceUtilityViewsIncludeDetailsSchema = zod
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 source-utility-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

export const resolveBuildSourceEntriesIncludeDetailsSchema = zod
  .boolean()
  .optional()
  .default(false)
  .describe(
    "是否返回 source-entry collection 完整明细，包括顶层 collection.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；若某条 source-damage-view entry 原始结果带有 build，也会一并返回完整 build 结果（trace、damageParams 等）。默认 false，只保留各类 *Summary 与紧凑字段。",
  )

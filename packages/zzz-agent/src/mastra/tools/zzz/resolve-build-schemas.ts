import type {
  StaticBuildAgentLevel,
  StaticBuildAnomalyCritDamage,
  StaticBuildAnomalyCritRate,
  StaticBuildAnomalyMastery,
  StaticBuildAnomalyProficiency,
  StaticBuildAttack,
  StaticBuildBaseAttack,
  StaticBuildCombatTagList,
  StaticBuildCritDamage,
  StaticBuildCritRate,
  StaticBuildDamageMultiplierInputValue,
  StaticBuildDamageReduction,
  StaticBuildDamageType,
  StaticBuildDefenderBaseDefense,
  StaticBuildDefenderResistance,
  StaticBuildDefenseBonus,
  StaticBuildDefenseReduction,
  StaticBuildDriveDiscPieces,
  StaticBuildEnergyGenerationRate,
  StaticBuildHP,
  StaticBuildIgnoreResistance,
  StaticBuildNonStunVulnerability,
  StaticBuildPenetrationRate,
  StaticBuildPenetrationValue,
  StaticBuildRemainingTime,
  StaticBuildResistanceReduction,
  StaticBuildSheerForce,
  StaticBuildSkillMultiplierInputValue,
  StaticBuildSkillTag,
  StaticBuildSpecialMultiplier,
  StaticBuildStunVulnerability,
  StaticBuildVulnerabilityBonus,
} from "zzz-data"
import type {
  BuildToolAnomalyTypeValue,
  BuildToolAttributeValue,
  BuildToolCatalogValue,
} from "./resolve-build-contracts"
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

export const combatTagListSchema = zod.array(zod.string())

export type BuildToolSkillTag = StaticBuildSkillTag

export type BuildToolDriveDiscSetName = BuildToolCatalogValue

export type BuildToolEnemyStunnedFlag = boolean

export type BuildToolDynamicSnapshotFlag = boolean

export type BuildToolStateSnapshotFlag = boolean

export type BuildToolDynamicSnapshotCount = number

export type BuildToolSnapshotRatio = number

export type BuildToolResolvedSnapshotDeltaValue = number

export type BuildToolResolvedSnapshotMultiplierFactorValue = number

export type BuildToolScenarioAttributeValue = BuildToolAttributeValue

export type BuildToolScenarioExtraAbilityFlag = boolean

export type BuildToolScenarioCombatTagList = StaticBuildCombatTagList

export interface BuildToolDynamicSnapshotFlags {
  ariaDreamtime?: BuildToolDynamicSnapshotFlag
  burniceEmberState?: BuildToolDynamicSnapshotFlag
}

export interface BuildToolDynamicSnapshotCounts {
  burniceEmberExtraTriggers?: BuildToolDynamicSnapshotCount
}

export interface BuildToolDynamicSnapshotValues {
  ariaExflowDamageRatio?: BuildToolSnapshotRatio
  ariaStunnedDamageRatio?: BuildToolSnapshotRatio
  burniceEmberDamageRatio?: BuildToolSnapshotRatio
}

export interface BuildToolStateSnapshotFlags {
  alicePolarityAssaultState?: BuildToolStateSnapshotFlag
  miyabiFrostburnBreakState?: BuildToolStateSnapshotFlag
}

export interface BuildToolStateSnapshotValues {
  alicePolarityAssaultDamageRatio?: BuildToolSnapshotRatio
  miyabiFrostburnBreakDamageRatio?: BuildToolSnapshotRatio
}

export interface BuildToolResolvedSnapshotBucketDeltas {
  bonusDamageSum?: BuildToolResolvedSnapshotDeltaValue
  defenseReduction?: BuildToolResolvedSnapshotDeltaValue
  penetrationRate?: BuildToolResolvedSnapshotDeltaValue
  resistanceReduction?: BuildToolResolvedSnapshotDeltaValue
  ignoreResistance?: BuildToolResolvedSnapshotDeltaValue
  sheerBonusSum?: BuildToolResolvedSnapshotDeltaValue
  anomalyProficiency?: BuildToolResolvedSnapshotDeltaValue
  anomalyBonusDamageSum?: BuildToolResolvedSnapshotDeltaValue
  anomalyCritRate?: BuildToolResolvedSnapshotDeltaValue
  anomalyCritDamage?: BuildToolResolvedSnapshotDeltaValue
}

export interface BuildToolResolvedSnapshotMultiplierFactors {
  skillMultiplierFactor?: BuildToolResolvedSnapshotMultiplierFactorValue
}

export interface BuildToolDriveDiscSetInput {
  name: BuildToolDriveDiscSetName
  pieces: StaticBuildDriveDiscPieces
}

export interface BuildToolEffectOverrideInput {
  effectId: string
  enabled?: boolean
  stacks?: number
}

export interface BuildToolEnemyInput {
  attackerLevel?: StaticBuildAgentLevel
  defenderBaseDefense: StaticBuildDefenderBaseDefense
  defenderResistance: StaticBuildDefenderResistance
  defenseBonus?: StaticBuildDefenseBonus
  defenseReduction?: StaticBuildDefenseReduction
  resistanceReduction?: StaticBuildResistanceReduction
  ignoreResistance?: StaticBuildIgnoreResistance
  vulnerabilityBonus?: StaticBuildVulnerabilityBonus
  damageReduction?: StaticBuildDamageReduction
  isStunned?: BuildToolEnemyStunnedFlag
  stunVulnerability?: StaticBuildStunVulnerability
  nonStunVulnerability?: StaticBuildNonStunVulnerability
  specialMultiplier?: StaticBuildSpecialMultiplier
}

export interface BuildToolDynamicSnapshotInput {
  flags?: BuildToolDynamicSnapshotFlags
  counts?: BuildToolDynamicSnapshotCounts
  values?: BuildToolDynamicSnapshotValues
}

export interface BuildToolStateSnapshotInput {
  flags?: BuildToolStateSnapshotFlags
  values?: BuildToolStateSnapshotValues
}

export interface BuildToolResolvedSnapshotInput {
  bucketDeltas?: BuildToolResolvedSnapshotBucketDeltas
  multiplierFactors?: BuildToolResolvedSnapshotMultiplierFactors
}

export type BuildToolDamageType = StaticBuildDamageType

interface BuildToolBaseScenarioInput {
  attribute?: BuildToolScenarioAttributeValue
  extraAbilityActive?: BuildToolScenarioExtraAbilityFlag
  combatTags?: BuildToolScenarioCombatTagList
  dynamicSnapshot?: BuildToolDynamicSnapshotInput
  stateSnapshot?: BuildToolStateSnapshotInput
  resolvedSnapshot?: BuildToolResolvedSnapshotInput
  enemy: BuildToolEnemyInput
}

export interface BuildToolNormalScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "normal"
  skillTag: BuildToolSkillTag
  skillMultiplier: StaticBuildSkillMultiplierInputValue
}

export interface BuildToolSheerScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "sheer"
  skillTag: BuildToolSkillTag
  skillMultiplier: StaticBuildSkillMultiplierInputValue
}

export interface BuildToolAnomalyScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "anomaly"
  skillTag: BuildToolSkillTag
  damageMultiplier: StaticBuildDamageMultiplierInputValue
}

export interface BuildToolDisorderScenarioInput extends BuildToolBaseScenarioInput {
  damageType: "disorder"
  skillTag: BuildToolSkillTag
  anomalyType: BuildToolAnomalyTypeValue
  remainingTime: StaticBuildRemainingTime
}

export type BuildToolScenarioInput =
  | BuildToolNormalScenarioInput
  | BuildToolSheerScenarioInput
  | BuildToolAnomalyScenarioInput
  | BuildToolDisorderScenarioInput

export interface BuildToolSkillMatrixContextInput {
  attribute?: BuildToolScenarioAttributeValue
  extraAbilityActive?: BuildToolScenarioExtraAbilityFlag
  combatTags?: BuildToolScenarioCombatTagList
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

export const enemyAttackerLevelSchema = zod.number().optional().default(60)

export const enemyDefenderBaseDefenseSchema = zod.number()

export const enemyDefenderResistanceSchema = zod.number()

export const enemyDefenseBonusSchema = zod.number().optional().default(0)

export const enemyDefenseReductionSchema = zod.number().optional().default(0)

export const enemyResistanceReductionSchema = zod.number().optional().default(0)

export const enemyIgnoreResistanceSchema = zod.number().optional().default(0)

export const enemyVulnerabilityBonusSchema = zod.number().optional().default(0)

export const enemyDamageReductionSchema = zod.number().optional().default(0)

export const enemyIsStunnedSchema = zod.boolean().optional().default(false)

export const enemyStunVulnerabilitySchema = zod.number().optional().default(0)

export const enemyNonStunVulnerabilitySchema = zod
  .number()
  .optional()
  .default(0)

export const enemySpecialMultiplierSchema = zod.number().optional().default(1)

export const enemySchema = zod.object({
  attackerLevel: enemyAttackerLevelSchema,
  defenderBaseDefense: enemyDefenderBaseDefenseSchema,
  defenderResistance: enemyDefenderResistanceSchema,
  defenseBonus: enemyDefenseBonusSchema,
  defenseReduction: enemyDefenseReductionSchema,
  resistanceReduction: enemyResistanceReductionSchema,
  ignoreResistance: enemyIgnoreResistanceSchema,
  vulnerabilityBonus: enemyVulnerabilityBonusSchema,
  damageReduction: enemyDamageReductionSchema,
  isStunned: enemyIsStunnedSchema,
  stunVulnerability: enemyStunVulnerabilitySchema,
  nonStunVulnerability: enemyNonStunVulnerabilitySchema,
  specialMultiplier: enemySpecialMultiplierSchema,
})

export const dynamicSnapshotFlagsSchema = zod.object({
  ariaDreamtime: zod.boolean().optional(),
  burniceEmberState: zod.boolean().optional(),
})

export const dynamicSnapshotCountsSchema = zod.object({
  burniceEmberExtraTriggers: zod.number().int().min(0).optional(),
})

export const dynamicSnapshotValuesSchema = zod.object({
  ariaExflowDamageRatio: zod.number().min(0).optional(),
  ariaStunnedDamageRatio: zod.number().min(0).optional(),
  burniceEmberDamageRatio: zod.number().min(0).optional(),
})

export const dynamicSnapshotSchema = zod
  .object({
    flags: dynamicSnapshotFlagsSchema.optional(),
    counts: dynamicSnapshotCountsSchema.optional(),
    values: dynamicSnapshotValuesSchema.optional(),
  })
  .optional()

export const stateSnapshotFlagsSchema = zod.object({
  alicePolarityAssaultState: zod.boolean().optional(),
  miyabiFrostburnBreakState: zod.boolean().optional(),
})

export const stateSnapshotValuesSchema = zod.object({
  alicePolarityAssaultDamageRatio: zod.number().min(0).optional(),
  miyabiFrostburnBreakDamageRatio: zod.number().min(0).optional(),
})

export const stateSnapshotSchema = zod
  .object({
    flags: stateSnapshotFlagsSchema.optional(),
    values: stateSnapshotValuesSchema.optional(),
  })
  .optional()

export const resolvedSnapshotBucketDeltasSchema = zod.object({
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

export const resolvedSnapshotMultiplierFactorsSchema = zod.object({
  skillMultiplierFactor: zod.number().min(0).optional(),
})

export const resolvedSnapshotSchema = zod
  .object({
    bucketDeltas: resolvedSnapshotBucketDeltasSchema.optional(),
    multiplierFactors: resolvedSnapshotMultiplierFactorsSchema.optional(),
  })
  .optional()

export const finalPanelAttackSchema = zod.number()

export const finalPanelBaseAttackSchema = zod.number().optional()

export const finalPanelCritRateSchema = zod.number()

export const finalPanelCritDamageSchema = zod.number()

export const finalPanelHPSchema = zod.number().optional()

export const finalPanelSheerForceSchema = zod.number().optional()

export const finalPanelEnergyGenerationRateSchema = zod.number().optional()

export const finalPanelAnomalyProficiencySchema = zod.number().optional()

export const finalPanelAnomalyMasterySchema = zod.number().optional()

export const finalPanelAnomalyCritRateSchema = zod.number().optional()

export const finalPanelAnomalyCritDamageSchema = zod.number().optional()

export const finalPanelPenetrationRateSchema = zod.number().optional()

export const finalPanelPenetrationValueSchema = zod.number().optional()

export const finalPanelSchema = zod.object({
  attack: finalPanelAttackSchema,
  baseAttack: finalPanelBaseAttackSchema,
  critRate: finalPanelCritRateSchema,
  critDamage: finalPanelCritDamageSchema,
  hp: finalPanelHPSchema,
  sheerForce: finalPanelSheerForceSchema,
  energyGenerationRate: finalPanelEnergyGenerationRateSchema,
  anomalyProficiency: finalPanelAnomalyProficiencySchema,
  anomalyMastery: finalPanelAnomalyMasterySchema,
  anomalyCritRate: finalPanelAnomalyCritRateSchema,
  anomalyCritDamage: finalPanelAnomalyCritDamageSchema,
  penetrationRate: finalPanelPenetrationRateSchema,
  penetrationValue: finalPanelPenetrationValueSchema,
})

export const scenarioAttributeSchema = zod.string().optional()

export const scenarioExtraAbilityActiveSchema = zod.boolean().optional()

export const scenarioSkillMultiplierSchema = zod.union([
  zod.number(),
  zod.string(),
])

export const scenarioDamageMultiplierSchema = zod.union([
  zod.number(),
  zod.string(),
])

export const scenarioAnomalyTypeSchema = zod.string()

export const scenarioRemainingTimeSchema = zod.number().min(0)

export const resolveBuildScenarioSchema = zod.discriminatedUnion("damageType", [
  zod.object({
    damageType: zod.literal("normal"),
    skillTag: skillTagSchema,
    skillMultiplier: scenarioSkillMultiplierSchema,
    attribute: scenarioAttributeSchema,
    extraAbilityActive: scenarioExtraAbilityActiveSchema,
    combatTags: combatTagListSchema.optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  zod.object({
    damageType: zod.literal("sheer"),
    skillTag: skillTagSchema,
    skillMultiplier: scenarioSkillMultiplierSchema,
    attribute: scenarioAttributeSchema,
    extraAbilityActive: scenarioExtraAbilityActiveSchema,
    combatTags: combatTagListSchema.optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  zod.object({
    damageType: zod.literal("anomaly"),
    skillTag: skillTagSchema,
    damageMultiplier: scenarioDamageMultiplierSchema,
    attribute: scenarioAttributeSchema,
    extraAbilityActive: scenarioExtraAbilityActiveSchema,
    combatTags: combatTagListSchema.optional(),
    dynamicSnapshot: dynamicSnapshotSchema,
    stateSnapshot: stateSnapshotSchema,
    resolvedSnapshot: resolvedSnapshotSchema,
    enemy: enemySchema,
  }),
  zod.object({
    damageType: zod.literal("disorder"),
    skillTag: skillTagSchema,
    anomalyType: scenarioAnomalyTypeSchema,
    remainingTime: scenarioRemainingTimeSchema,
    attribute: scenarioAttributeSchema,
    extraAbilityActive: scenarioExtraAbilityActiveSchema,
    combatTags: combatTagListSchema.optional(),
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

export const agentIdentifierSchema = zod.string().describe("代理人名称或 ID")

export const wEngineIdentifierSchema = zod
  .string()
  .optional()
  .describe("音擎名称或 ID")

export const coreSkillLevelSchema = zod
  .number()
  .min(1)
  .max(7)
  .optional()
  .default(7)

export const wEngineRefinementSchema = zod
  .number()
  .min(1)
  .max(5)
  .optional()
  .default(1)

export const agentLevelSchema = zod.number().min(1).max(60).optional()

export const agentMindscapeSchema = zod.number().int().min(0).max(6).optional()

export const buildModeSchema = zod
  .enum(["baseline", "full-buff", "manual"])
  .optional()
  .default("baseline")

export const manualBaseModeSchema = zod
  .enum(["baseline", "full-buff"])
  .optional()

export const effectOverrideSchema = zod.object({
  effectId: zod.string(),
  enabled: zod.boolean().optional(),
  stacks: zod.number().int().min(0).optional(),
})

export const resolveBuildInputSchema = zod.object({
  agent: agentIdentifierSchema,
  wEngine: wEngineIdentifierSchema,
  driveDiscs: zod.array(driveDiscSetSchema).optional(),
  coreSkillLevel: coreSkillLevelSchema,
  wEngineRefinement: wEngineRefinementSchema,
  agentLevel: agentLevelSchema,
  agentMindscape: agentMindscapeSchema,
  mode: buildModeSchema,
  manualBaseMode: manualBaseModeSchema,
  finalPanel: finalPanelSchema,
  scenario: resolveBuildScenarioSchema,
  effectOverrides: zod.array(effectOverrideSchema).optional(),
})

export const resolveBuildSourceUtilityInputSchema = zod.object({
  agent: agentIdentifierSchema,
  wEngine: wEngineIdentifierSchema,
  driveDiscs: zod.array(driveDiscSetSchema).optional(),
  coreSkillLevel: coreSkillLevelSchema,
  wEngineRefinement: wEngineRefinementSchema,
  agentLevel: agentLevelSchema,
  agentMindscape: agentMindscapeSchema,
  finalPanel: finalPanelSchema.partial().optional(),
})

export const resolveBuildSourceEntriesInputSchema =
  resolveBuildSourceUtilityInputSchema.extend({
    mode: buildModeSchema,
    manualBaseMode: manualBaseModeSchema,
    scenario: resolveBuildScenarioSchema.optional(),
    effectOverrides: zod.array(effectOverrideSchema).optional(),
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
  attribute: scenarioAttributeSchema,
  extraAbilityActive: scenarioExtraAbilityActiveSchema,
  combatTags: combatTagListSchema.optional(),
  enemy: enemySchema,
})

export const resolveBuildSkillMatrixInputSchema = zod.object({
  agent: agentIdentifierSchema,
  wEngine: wEngineIdentifierSchema,
  driveDiscs: zod.array(driveDiscSetSchema).optional(),
  agentMindscape: agentMindscapeSchema,
  coreSkillLevel: coreSkillLevelSchema,
  wEngineRefinement: wEngineRefinementSchema,
  mode: buildModeSchema,
  manualBaseMode: manualBaseModeSchema,
  finalPanel: skillMatrixFinalPanelSchema,
  context: resolveBuildSkillMatrixContextSchema,
  effectOverrides: zod.array(effectOverrideSchema).optional(),
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

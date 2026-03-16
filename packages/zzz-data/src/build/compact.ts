import type {
  AnomalyDamageParams,
  AnomalyType,
  CritParams,
  DamageBreakdown,
  DamageResult,
  DazeVulnerabilityParams,
  DefenseParams,
  DisorderDamageParams,
  NormalDamageParams,
  ResistanceParams,
  SheerDamageParams,
  VulnerabilityParams,
} from "../calculator/types.js"
import type { AgentAttribute, AgentSpecialty } from "../terms.js"
import type {
  ResolveStaticBuildResult,
  ResolveStaticBuildSkillMatrixResult,
  ResolveStaticBuildSourceDamageViewsResult,
  ResolveStaticBuildSourceEntriesResult,
  ResolveStaticBuildSourceUtilityViewsResult,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildActionName,
  StaticBuildAgentLevel,
  StaticBuildAgentMindscape,
  StaticBuildAliasList,
  StaticBuildAnomalyBonusDamageSum,
  StaticBuildAnomalyCritDamage,
  StaticBuildAnomalyCritMultiplier,
  StaticBuildAnomalyCritRate,
  StaticBuildAnomalyMastery,
  StaticBuildAnomalyProficiency,
  StaticBuildAnomalyProficiencyMultiplier,
  StaticBuildAppliedEntryCount,
  StaticBuildAppliedRowCount,
  StaticBuildAssumptionCount,
  StaticBuildAssumptionList,
  StaticBuildAssumptionSummary,
  StaticBuildAttack,
  StaticBuildAttackerLevelBase,
  StaticBuildAttackPercent,
  StaticBuildBaseAttack,
  StaticBuildBaseDamage,
  StaticBuildBaseDamageValue,
  StaticBuildBaseMode,
  StaticBuildBonusDamageSum,
  StaticBuildBonusMultiplier,
  StaticBuildBucket,
  StaticBuildBucketValueMap,
  StaticBuildCanonicalLabel,
  StaticBuildCaveatSummary,
  StaticBuildCombatTagList,
  StaticBuildConditionLabel,
  StaticBuildCooldownSeconds,
  StaticBuildCoreSkillLevel,
  StaticBuildCritDamage,
  StaticBuildCriticalTotal,
  StaticBuildCritMultiplier,
  StaticBuildCritRate,
  StaticBuildDamageLevelMultiplier,
  StaticBuildDamageMultiplier,
  StaticBuildDamageMultiplierFactor,
  StaticBuildDamageReduction,
  StaticBuildDamageResultTotal,
  StaticBuildDazeVulnerabilityMultiplier,
  StaticBuildDefenderBaseDefense,
  StaticBuildDefenderResistance,
  StaticBuildDefenseBonus,
  StaticBuildDefenseMultiplier,
  StaticBuildDefenseReduction,
  StaticBuildDeltaCount,
  StaticBuildDiagnosticCount,
  StaticBuildDiagnosticEntry,
  StaticBuildDiagnosticKeyList,
  StaticBuildDiagnosticKind,
  StaticBuildDiagnosticMessage,
  StaticBuildDiagnosticOwner,
  StaticBuildDiagnosticSummary,
  StaticBuildDisplayName,
  StaticBuildEffectId,
  StaticBuildEffectLabel,
  StaticBuildEffectSummaryBucket,
  StaticBuildEffectSummaryCondition,
  StaticBuildEffectSummaryValue,
  StaticBuildEnergyGenerationRate,
  StaticBuildEntryCaveatSummary,
  StaticBuildEntryCount,
  StaticBuildEntryDamage,
  StaticBuildEntryId,
  StaticBuildEntryLabel,
  StaticBuildExpectedTotal,
  StaticBuildFlatAttack,
  StaticBuildFormulaMultiplierMap,
  StaticBuildGroupCount,
  StaticBuildGroupLabel,
  StaticBuildHP,
  StaticBuildIgnoreResistance,
  StaticBuildMainFormulaCount,
  StaticBuildMode,
  StaticBuildModifierCombine,
  StaticBuildModifierValue,
  StaticBuildNonCriticalTotal,
  StaticBuildNonStunVulnerability,
  StaticBuildOrder,
  StaticBuildPenetrationRate,
  StaticBuildPenetrationValue,
  StaticBuildProfileResult,
  StaticBuildRateCount,
  StaticBuildRemainingTime,
  StaticBuildRequirementCount,
  StaticBuildRequirementKey,
  StaticBuildRequirementSummary,
  StaticBuildRequirementSummaryGroup,
  StaticBuildResistanceMultiplier,
  StaticBuildResistanceReduction,
  StaticBuildResolvedBuckets,
  StaticBuildResolvedLoadout,
  StaticBuildResolvedPanel,
  StaticBuildResolveEffectSummaryItem,
  StaticBuildResolveSummary,
  StaticBuildRowCount,
  StaticBuildRowId,
  StaticBuildRowLabel,
  StaticBuildSatisfiedRequirementCount,
  StaticBuildSegmentIndex,
  StaticBuildSegmentLabel,
  StaticBuildSheerBonusMultiplier,
  StaticBuildSheerBonusSum,
  StaticBuildSheerForce,
  StaticBuildSkillMatrixEffectSummaryItem,
  StaticBuildSkillMatrixGroupKey,
  StaticBuildSkillMatrixRow,
  StaticBuildSkillMatrixRowDamageSummary,
  StaticBuildSkillMatrixRowMeta,
  StaticBuildSkillMatrixSummary,
  StaticBuildSkillMultiplierFactor,
  StaticBuildSkillMultiplierText,
  StaticBuildSkillName,
  StaticBuildSkillQualifierList,
  StaticBuildSkillTag,
  StaticBuildSourceDamageViewCount,
  StaticBuildSourceDamageViewEffectSummaryItem,
  StaticBuildSourceDamageViewEntry,
  StaticBuildSourceDamageViewGroupKey,
  StaticBuildSourceDamageViewMeta,
  StaticBuildSourceDamageViewRequirement,
  StaticBuildSourceDamageViewRequirementKind,
  StaticBuildSourceDamageViewSummary,
  StaticBuildSourceEntry,
  StaticBuildSourceEntryCollectionSummary,
  StaticBuildSourceEntryGroupKey,
  StaticBuildSourceId,
  StaticBuildSourceName,
  StaticBuildSourceNoteCount,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceNoteGuidance,
  StaticBuildSourceNoteGuidanceKind,
  StaticBuildSourceNoteGuidanceTarget,
  StaticBuildSourceNoteKeyList,
  StaticBuildSourceNoteMessage,
  StaticBuildSourceNoteOwner,
  StaticBuildSourceNoteStatus,
  StaticBuildSourceNoteSummary,
  StaticBuildSourceOccurrence,
  StaticBuildSourceSkillTypeId,
  StaticBuildSourceStatId,
  StaticBuildSourceStatName,
  StaticBuildSourceUtilityViewCount,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildSourceUtilityViewEntrySummary,
  StaticBuildSourceUtilityViewGroupKey,
  StaticBuildSourceUtilityViewMeta,
  StaticBuildSourceUtilityViewRequirement,
  StaticBuildSourceUtilityViewRequirementKind,
  StaticBuildSourceUtilityViewSummary,
  StaticBuildSourceViewCount,
  StaticBuildSourceViewId,
  StaticBuildSpecialMultiplier,
  StaticBuildStableKey,
  StaticBuildStandaloneCount,
  StaticBuildStunVulnerability,
  StaticBuildSupportedCount,
  StaticBuildTotalEntryCount,
  StaticBuildTotalRowCount,
  StaticBuildTraceItem,
  StaticBuildTraceModifier,
  StaticBuildTraceReason,
  StaticBuildTriggerCount,
  StaticBuildTriggerLabel,
  StaticBuildTriggerMatrixEffectSummaryItem,
  StaticBuildTriggerMatrixRow,
  StaticBuildTriggerMatrixRowMeta,
  StaticBuildTriggerMatrixSummary,
  StaticBuildUnsatisfiedRequirementCount,
  StaticBuildUnsupportedCount,
  StaticBuildUnsupportedEffectCount,
  StaticBuildUnsupportedEffectList,
  StaticBuildUtilityValue,
  StaticBuildVariableBucketList,
  StaticBuildVariableFormulaMultiplierList,
  StaticBuildVirtualAgentAnomalyProficiency,
  StaticBuildVirtualAgentAttack,
  StaticBuildVirtualAgentLevel,
  StaticBuildVulnerabilityBonus,
  StaticBuildVulnerabilityMultiplier,
  StaticBuildWEngineRefinement,
} from "./types.js"

export type CompactStaticBuildSourceType = "agent" | "w-engine" | "drive-disc"

export type CompactStaticBuildSourceUtilityType =
  | "energy-refund"
  | "energy-regen-rate"
  | "decibel-gain"

export type CompactStaticBuildSourceUtilityResolutionMode = "trigger" | "rate"

export type CompactStaticBuildSourceUtilityTargetScope =
  | "self"
  | "ally"
  | "team"

export type CompactStaticBuildSourceUtilityUnit =
  | "energy"
  | "energy-per-second"
  | "decibel"

export type CompactStaticBuildSourceDamageType =
  | "normal"
  | "sheer"
  | "anomaly"
  | "disorder"

export type CompactStaticBuildSourceDamageViewResolutionMode =
  | "standalone"
  | "delta"

export type CompactStaticBuildTriggerMatrixEntryKind =
  | "main-formula"
  | "source-view"

export type CompactStaticBuildTriggerMatrixTemplateSource =
  | "main-formula"
  | "source-view"

export type CompactStaticBuildSkillMatrixTemplateSource =
  | "curated"
  | "generated"

export type CompactStaticBuildSkillMatrixAttributeSource =
  | "agent-default"
  | "context"
  | "template"

export type CompactStaticBuildSkillMatrixEntryType =
  | "hit"
  | "total"
  | "extra"
  | "variant"
  | "size-variant"

export type CompactStaticBuildSkillMatrixAggregationType =
  | "per-hit"
  | "whole-entry"

export type CompactStaticBuildSkillMatrixVariantAxis =
  | "segment"
  | "target-size"
  | "condition"

export type CompactStaticBuildTargetSize = "small" | "medium" | "large"

export type CompactStaticBuildBaseDamageStat = "attack" | "sheerForce"

export type CompactStaticBuildProfileId =
  | "standard-normal"
  | "standard-sheer"
  | "standard-anomaly"
  | "standard-disorder"
  | "yixuan-sheer"

export type CompactStaticBuildAgentSpecialty = AgentSpecialty

export type CompactStaticBuildAgentAttribute = AgentAttribute

export type CompactStaticBuildTraceStatus =
  | "applied"
  | "skipped"
  | "unsupported"

export type CompactStaticBuildSkillTag = StaticBuildSkillTag
export type CompactStaticBuildFormulaMultiplierMap =
  StaticBuildFormulaMultiplierMap
export type CompactStaticBuildBucketValueMap = StaticBuildBucketValueMap
export type CompactStaticBuildVariableBucketList = StaticBuildVariableBucketList
export type CompactStaticBuildVariableFormulaMultiplierList =
  StaticBuildVariableFormulaMultiplierList
export type CompactStaticBuildDisplayName = StaticBuildDisplayName
export type CompactStaticBuildAgentLevel = StaticBuildAgentLevel
export type CompactStaticBuildAgentMindscape = StaticBuildAgentMindscape
export type CompactStaticBuildAttack = StaticBuildAttack
export type CompactStaticBuildAttackPercent = StaticBuildAttackPercent
export type CompactStaticBuildAttackerLevelBase = StaticBuildAttackerLevelBase
export type CompactStaticBuildBaseAttack = StaticBuildBaseAttack
export type CompactStaticBuildHP = StaticBuildHP
export type CompactStaticBuildFlatAttack = StaticBuildFlatAttack
export type CompactStaticBuildBonusDamageSum = StaticBuildBonusDamageSum
export type CompactStaticBuildCritRate = StaticBuildCritRate
export type CompactStaticBuildCritDamage = StaticBuildCritDamage
export type CompactStaticBuildSheerForce = StaticBuildSheerForce
export type CompactStaticBuildEnergyGenerationRate =
  StaticBuildEnergyGenerationRate
export type CompactStaticBuildAnomalyMastery = StaticBuildAnomalyMastery
export type CompactStaticBuildAnomalyProficiency = StaticBuildAnomalyProficiency
export type CompactStaticBuildAnomalyBonusDamageSum =
  StaticBuildAnomalyBonusDamageSum
export type CompactStaticBuildAnomalyCritRate = StaticBuildAnomalyCritRate
export type CompactStaticBuildAnomalyCritDamage = StaticBuildAnomalyCritDamage
export type CompactStaticBuildPenetrationRate = StaticBuildPenetrationRate
export type CompactStaticBuildPenetrationValue = StaticBuildPenetrationValue
export type CompactStaticBuildDefenseReduction = StaticBuildDefenseReduction
export type CompactStaticBuildResistanceReduction =
  StaticBuildResistanceReduction
export type CompactStaticBuildIgnoreResistance = StaticBuildIgnoreResistance
export type CompactStaticBuildVulnerabilityBonus = StaticBuildVulnerabilityBonus
export type CompactStaticBuildDamageReduction = StaticBuildDamageReduction
export type CompactStaticBuildStunVulnerability = StaticBuildStunVulnerability
export type CompactStaticBuildNonStunVulnerability =
  StaticBuildNonStunVulnerability
export type CompactStaticBuildSheerBonusSum = StaticBuildSheerBonusSum
export type CompactStaticBuildSkillMultiplierFactor =
  StaticBuildSkillMultiplierFactor
export type CompactStaticBuildModifierValue = StaticBuildModifierValue
export type CompactStaticBuildModifierCombine = StaticBuildModifierCombine
export type CompactStaticBuildBaseDamageValue = StaticBuildBaseDamageValue
export type CompactStaticBuildBaseDamage = StaticBuildBaseDamage
export type CompactStaticBuildExpectedTotal = StaticBuildExpectedTotal
export type CompactStaticBuildCriticalTotal = StaticBuildCriticalTotal
export type CompactStaticBuildNonCriticalTotal = StaticBuildNonCriticalTotal
export type CompactStaticBuildDamageResultTotal = StaticBuildDamageResultTotal
export type CompactStaticBuildDiagnosticCount = StaticBuildDiagnosticCount
export type CompactStaticBuildSourceNoteCount = StaticBuildSourceNoteCount
export type CompactStaticBuildAssumptionCount = StaticBuildAssumptionCount
export type CompactStaticBuildUnsupportedEffectCount =
  StaticBuildUnsupportedEffectCount
export type CompactStaticBuildRequirementCount = StaticBuildRequirementCount
export type CompactStaticBuildSatisfiedRequirementCount =
  StaticBuildSatisfiedRequirementCount
export type CompactStaticBuildUnsatisfiedRequirementCount =
  StaticBuildUnsatisfiedRequirementCount
export type CompactStaticBuildGroupCount = StaticBuildGroupCount
export type CompactStaticBuildSupportedCount = StaticBuildSupportedCount
export type CompactStaticBuildUnsupportedCount = StaticBuildUnsupportedCount
export type CompactStaticBuildEntryCount = StaticBuildEntryCount
export type CompactStaticBuildStandaloneCount = StaticBuildStandaloneCount
export type CompactStaticBuildDeltaCount = StaticBuildDeltaCount
export type CompactStaticBuildTriggerCount = StaticBuildTriggerCount
export type CompactStaticBuildRateCount = StaticBuildRateCount
export type CompactStaticBuildSourceDamageViewCount =
  StaticBuildSourceDamageViewCount
export type CompactStaticBuildSourceUtilityViewCount =
  StaticBuildSourceUtilityViewCount
export type CompactStaticBuildRowCount = StaticBuildRowCount
export type CompactStaticBuildMainFormulaCount = StaticBuildMainFormulaCount
export type CompactStaticBuildSourceViewCount = StaticBuildSourceViewCount
export type CompactStaticBuildAppliedEntryCount = StaticBuildAppliedEntryCount
export type CompactStaticBuildTotalEntryCount = StaticBuildTotalEntryCount
export type CompactStaticBuildAppliedRowCount = StaticBuildAppliedRowCount
export type CompactStaticBuildTotalRowCount = StaticBuildTotalRowCount
export type CompactStaticBuildDefenderBaseDefense =
  StaticBuildDefenderBaseDefense
export type CompactStaticBuildDefenderResistance = StaticBuildDefenderResistance
export type CompactStaticBuildDefenseBonus = StaticBuildDefenseBonus
export type CompactStaticBuildSpecialMultiplier = StaticBuildSpecialMultiplier
export type CompactStaticBuildEntryId = StaticBuildEntryId
export type CompactStaticBuildEntryLabel = StaticBuildEntryLabel
export type CompactStaticBuildRowId = StaticBuildRowId
export type CompactStaticBuildRowLabel = StaticBuildRowLabel
export type CompactStaticBuildActionName = StaticBuildActionName
export type CompactStaticBuildSkillName = StaticBuildSkillName
export type CompactStaticBuildCanonicalLabel = StaticBuildCanonicalLabel
export type CompactStaticBuildStableKey = StaticBuildStableKey
export type CompactStaticBuildSourceId = StaticBuildSourceId
export type CompactStaticBuildSourceViewId = StaticBuildSourceViewId
export type CompactStaticBuildSourceName = StaticBuildSourceName
export type CompactStaticBuildSourceSkillTypeId = StaticBuildSourceSkillTypeId
export type CompactStaticBuildSourceStatId = StaticBuildSourceStatId
export type CompactStaticBuildSourceStatName = StaticBuildSourceStatName
export type CompactStaticBuildSourceOccurrence = StaticBuildSourceOccurrence
export type CompactStaticBuildOrder = StaticBuildOrder
export type CompactStaticBuildEffectId = StaticBuildEffectId
export type CompactStaticBuildEffectLabel = StaticBuildEffectLabel
export type CompactStaticBuildEffectSummaryBucket =
  StaticBuildEffectSummaryBucket
export type CompactStaticBuildEffectSummaryValue = StaticBuildEffectSummaryValue
export type CompactStaticBuildEffectSummaryCondition =
  StaticBuildEffectSummaryCondition
export type CompactStaticBuildTraceReason = StaticBuildTraceReason
export type CompactStaticBuildTriggerLabel = StaticBuildTriggerLabel
export type CompactStaticBuildConditionLabel = StaticBuildConditionLabel
export type CompactStaticBuildSegmentLabel = StaticBuildSegmentLabel
export type CompactStaticBuildSegmentIndex = StaticBuildSegmentIndex
export type CompactStaticBuildGroupLabel = StaticBuildGroupLabel
export type CompactStaticBuildSkillMatrixGroupKey =
  StaticBuildSkillMatrixGroupKey
export type CompactStaticBuildSkillMultiplierText =
  StaticBuildSkillMultiplierText
export type CompactStaticBuildSourceDamageViewGroupKey =
  StaticBuildSourceDamageViewGroupKey
export type CompactStaticBuildSourceUtilityViewGroupKey =
  StaticBuildSourceUtilityViewGroupKey
export type CompactStaticBuildSourceEntryGroupKey =
  StaticBuildSourceEntryGroupKey
export type CompactStaticBuildAliasList = StaticBuildAliasList
export type CompactStaticBuildAssumptionList = StaticBuildAssumptionList
export type CompactStaticBuildUnsupportedEffectList =
  StaticBuildUnsupportedEffectList
export type CompactStaticBuildDiagnosticKeyList = StaticBuildDiagnosticKeyList
export type CompactStaticBuildSourceNoteKeyList = StaticBuildSourceNoteKeyList
export type CompactStaticBuildCombatTagList = StaticBuildCombatTagList
export type CompactStaticBuildSkillQualifierList = StaticBuildSkillQualifierList
export type CompactStaticBuildRequirementKey = StaticBuildRequirementKey
export type CompactStaticBuildDiagnosticMessage = StaticBuildDiagnosticMessage
export type CompactStaticBuildSourceNoteMessage = StaticBuildSourceNoteMessage
export type CompactStaticBuildUtilityValue = StaticBuildUtilityValue
export type CompactStaticBuildCooldownSeconds = StaticBuildCooldownSeconds
export type CompactStaticBuildCoreSkillLevel = StaticBuildCoreSkillLevel
export type CompactStaticBuildWEngineRefinement = StaticBuildWEngineRefinement
export type CompactStaticBuildVirtualAgentLevel = StaticBuildVirtualAgentLevel
export type CompactStaticBuildVirtualAgentAttack = StaticBuildVirtualAgentAttack
export type CompactStaticBuildVirtualAgentAnomalyProficiency =
  StaticBuildVirtualAgentAnomalyProficiency
export type CompactStaticBuildDamageMultiplier = StaticBuildDamageMultiplier
export type CompactStaticBuildDamageMultiplierFactor =
  StaticBuildDamageMultiplierFactor
export type CompactStaticBuildBonusMultiplier = StaticBuildBonusMultiplier
export type CompactStaticBuildCritMultiplier = StaticBuildCritMultiplier
export type CompactStaticBuildDefenseMultiplier = StaticBuildDefenseMultiplier
export type CompactStaticBuildResistanceMultiplier =
  StaticBuildResistanceMultiplier
export type CompactStaticBuildVulnerabilityMultiplier =
  StaticBuildVulnerabilityMultiplier
export type CompactStaticBuildDazeVulnerabilityMultiplier =
  StaticBuildDazeVulnerabilityMultiplier
export type CompactStaticBuildSheerBonusMultiplier =
  StaticBuildSheerBonusMultiplier
export type CompactStaticBuildAnomalyProficiencyMultiplier =
  StaticBuildAnomalyProficiencyMultiplier
export type CompactStaticBuildDamageLevelMultiplier =
  StaticBuildDamageLevelMultiplier
export type CompactStaticBuildAnomalyBonusMultiplier =
  StaticBuildAnomalyBonusMultiplier
export type CompactStaticBuildAnomalyCritMultiplier =
  StaticBuildAnomalyCritMultiplier
export type CompactStaticBuildRemainingTime = StaticBuildRemainingTime
export type CompactStaticBuildStackCount = StaticBuildStackCount

export interface CompactStaticBuildResult {
  profile: CompactStaticBuildProfile
  mode: CompactStaticBuildMode
  manualBaseMode?: CompactStaticBuildBaseMode
  loadout: CompactStaticBuildLoadout
  summary: CompactStaticBuildResolveSummary
  effectSummary: CompactStaticBuildResolveEffectSummaryItem[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  resolvedPanel: CompactStaticBuildResolvedPanel
  resolvedBuckets: CompactStaticBuildResolvedBuckets
  damage: {
    expected: CompactStaticBuildDamageResult
    crit: CompactStaticBuildDamageResult
    noCrit: CompactStaticBuildDamageResult
  }
  diagnostics?: CompactStaticBuildDiagnosticEntry[]
  sourceNotes?: CompactStaticBuildSourceNoteEntry[]
  assumptions?: CompactStaticBuildAssumptionList
  unsupportedEffects?: CompactStaticBuildUnsupportedEffectList
  damageParams?:
    | CompactStaticBuildNormalDamageParams
    | CompactStaticBuildSheerDamageParams
    | CompactStaticBuildAnomalyDamageParams
    | CompactStaticBuildDisorderDamageParams
  trace?: CompactStaticBuildTraceItem[]
}

export interface CompactStaticBuildResolveSummary {
  baseDamageStat: CompactStaticBuildBaseDamageStat
  baseDamageValue: CompactStaticBuildBaseDamageValue
  expectedTotal: CompactStaticBuildExpectedTotal
  critTotal: CompactStaticBuildCriticalTotal
  noCritTotal: CompactStaticBuildNonCriticalTotal
  formulaMultipliers: CompactStaticBuildFormulaMultiplierMap
  assumptionCount: CompactStaticBuildAssumptionCount
  diagnosticCount: CompactStaticBuildDiagnosticCount
  sourceNoteCount: CompactStaticBuildSourceNoteCount
  unsupportedEffectCount: CompactStaticBuildUnsupportedEffectCount
  hasDiagnostics: boolean
  hasSourceNotes: boolean
  hasUnsupportedEffects: boolean
  hasDefaultedInput: boolean
  hasCoverageGap: boolean
  hasUnsupportedEffect: boolean
  hasFallback: boolean
  hasMissingInputSourceNote: boolean
  hasProcessOnlySourceNote: boolean
  hasResearchOnlySourceNote: boolean
  diagnosticGroups: CompactStaticBuildDiagnosticGroupSummary[]
  sourceNoteGroups: CompactStaticBuildSourceNoteGroupSummary[]
}

export type CompactStaticBuildMode = StaticBuildMode

export type CompactStaticBuildBaseMode = StaticBuildBaseMode

export interface CompactStaticBuildProfile {
  id: CompactStaticBuildProfileId
  name: CompactStaticBuildDisplayName
}

export interface CompactStaticBuildCatalogEntry {
  id: CompactStaticBuildSourceId
  name: CompactStaticBuildDisplayName
  aliases: CompactStaticBuildAliasList
}

export interface CompactStaticBuildAgentCatalogEntry extends CompactStaticBuildCatalogEntry {
  specialty: CompactStaticBuildAgentSpecialty
  defaultAttribute: CompactStaticBuildAgentAttribute
  defaultDamageType?: CompactStaticBuildSourceDamageType
  profileId?: CompactStaticBuildProfileId
}

export interface CompactStaticBuildWEngineCatalogEntry extends CompactStaticBuildCatalogEntry {
  specialty: CompactStaticBuildAgentSpecialty
}

export interface CompactStaticBuildDriveDiscSet {
  id: CompactStaticBuildSourceId
  name: CompactStaticBuildDisplayName
  aliases: CompactStaticBuildAliasList
  pieces: 2 | 4
}

export interface CompactStaticBuildLoadout {
  agent: CompactStaticBuildAgentCatalogEntry
  wEngine?: CompactStaticBuildWEngineCatalogEntry
  driveDiscSets: CompactStaticBuildDriveDiscSet[]
  agentLevel: CompactStaticBuildAgentLevel
  agentMindscape: CompactStaticBuildAgentMindscape
  coreSkillLevel: CompactStaticBuildCoreSkillLevel
  wEngineRefinement: CompactStaticBuildWEngineRefinement
}

export interface CompactStaticBuildResolvedBuckets {
  attackPercent: CompactStaticBuildAttackPercent
  flatAttack: CompactStaticBuildFlatAttack
  bonusDamageSum: CompactStaticBuildBonusDamageSum
  critRate: CompactStaticBuildCritRate
  critDamage: CompactStaticBuildCritDamage
  defenseReduction: CompactStaticBuildDefenseReduction
  penetrationRate: CompactStaticBuildPenetrationRate
  penetrationValue: CompactStaticBuildPenetrationValue
  resistanceReduction: CompactStaticBuildResistanceReduction
  ignoreResistance: CompactStaticBuildIgnoreResistance
  vulnerabilityBonus: CompactStaticBuildVulnerabilityBonus
  damageReduction: CompactStaticBuildDamageReduction
  stunVulnerability: CompactStaticBuildStunVulnerability
  nonStunVulnerability: CompactStaticBuildNonStunVulnerability
  sheerBonusSum: CompactStaticBuildSheerBonusSum
  anomalyMastery: CompactStaticBuildAnomalyMastery
  anomalyProficiency: CompactStaticBuildAnomalyProficiency
  anomalyBonusDamageSum: CompactStaticBuildAnomalyBonusDamageSum
  anomalyCritRate: CompactStaticBuildAnomalyCritRate
  anomalyCritDamage: CompactStaticBuildAnomalyCritDamage
  skillMultiplierFactor: CompactStaticBuildSkillMultiplierFactor
}

export interface CompactStaticBuildResolvedPanel {
  attack: CompactStaticBuildAttack
  baseAttack?: CompactStaticBuildBaseAttack
  agentLevel: CompactStaticBuildAgentLevel
  critRate: CompactStaticBuildCritRate
  critDamage: CompactStaticBuildCritDamage
  hp?: CompactStaticBuildHP
  sheerForce?: CompactStaticBuildSheerForce
  energyGenerationRate?: CompactStaticBuildEnergyGenerationRate
  anomalyProficiency: CompactStaticBuildAnomalyProficiency
  anomalyMastery?: CompactStaticBuildAnomalyMastery
  anomalyCritRate: CompactStaticBuildAnomalyCritRate
  anomalyCritDamage: CompactStaticBuildAnomalyCritDamage
  penetrationRate: CompactStaticBuildPenetrationRate
  penetrationValue: CompactStaticBuildPenetrationValue
  baseDamageStat: "attack" | "sheerForce"
  baseDamageValue: CompactStaticBuildBaseDamageValue
}

export interface CompactStaticBuildDefenseParams {
  attackerLevelBase: CompactStaticBuildAttackerLevelBase
  defenderBaseDefense: CompactStaticBuildDefenderBaseDefense
  defenseBonus: CompactStaticBuildDefenseBonus
  defenseReduction: CompactStaticBuildDefenseReduction
  penetrationRate: CompactStaticBuildPenetrationRate
  penetrationValue: CompactStaticBuildPenetrationValue
}

export interface CompactStaticBuildResistanceParams {
  defenderResistance: CompactStaticBuildDefenderResistance
  resistanceReduction: CompactStaticBuildResistanceReduction
  ignoreResistance: CompactStaticBuildIgnoreResistance
}

export interface CompactStaticBuildVulnerabilityParams {
  vulnerabilityBonus: CompactStaticBuildVulnerabilityBonus
  damageReduction: CompactStaticBuildDamageReduction
}

export interface CompactStaticBuildDazeVulnerabilityParams {
  isStunned: boolean
  stunVulnerability: CompactStaticBuildStunVulnerability
  nonStunVulnerability: CompactStaticBuildNonStunVulnerability
}

export interface CompactStaticBuildCritParams {
  critRate: CompactStaticBuildCritRate
  critDamage: CompactStaticBuildCritDamage
}

export interface CompactStaticBuildNormalDamageParams {
  baseDamage: CompactStaticBuildBaseDamage
  bonusDamageSum: CompactStaticBuildBonusDamageSum
  crit: CompactStaticBuildCritParams
  defense: CompactStaticBuildDefenseParams
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  specialMultiplier?: CompactStaticBuildSpecialMultiplier
}

export interface CompactStaticBuildSheerDamageParams {
  baseDamage: CompactStaticBuildBaseDamage
  bonusDamageSum: CompactStaticBuildBonusDamageSum
  crit: CompactStaticBuildCritParams
  sheerBonusSum: CompactStaticBuildSheerBonusSum
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  specialMultiplier?: CompactStaticBuildSpecialMultiplier
}

export interface CompactStaticBuildAnomalyDamageParams {
  virtualAgentLevel: CompactStaticBuildVirtualAgentLevel
  virtualAgentAttack: CompactStaticBuildVirtualAgentAttack
  virtualAgentAnomalyProficiency: CompactStaticBuildVirtualAgentAnomalyProficiency
  damageMultiplier: CompactStaticBuildDamageMultiplier
  bonusDamageSum: CompactStaticBuildBonusDamageSum
  defense: CompactStaticBuildDefenseParams
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  anomalyBonusDamageSum: CompactStaticBuildAnomalyBonusDamageSum
  anomalyCritRate: CompactStaticBuildAnomalyCritRate
  anomalyCritDamage: CompactStaticBuildAnomalyCritDamage
}

export interface CompactStaticBuildDisorderDamageParams {
  virtualAgentLevel: CompactStaticBuildVirtualAgentLevel
  virtualAgentAttack: CompactStaticBuildVirtualAgentAttack
  virtualAgentAnomalyProficiency: CompactStaticBuildVirtualAgentAnomalyProficiency
  bonusDamageSum: CompactStaticBuildBonusDamageSum
  defense: CompactStaticBuildDefenseParams
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  anomalyBonusDamageSum: CompactStaticBuildAnomalyBonusDamageSum
  anomalyCritRate: CompactStaticBuildAnomalyCritRate
  anomalyCritDamage: CompactStaticBuildAnomalyCritDamage
  damageMultiplierFactor?: CompactStaticBuildDamageMultiplierFactor
  anomalyType: AnomalyType
  remainingTime: CompactStaticBuildRemainingTime
}

export interface CompactStaticBuildDamageBreakdown {
  baseDamage: CompactStaticBuildBaseDamage
  bonusMultiplier: CompactStaticBuildBonusMultiplier
  critMultiplier: CompactStaticBuildCritMultiplier
  defenseMultiplier: CompactStaticBuildDefenseMultiplier
  resistanceMultiplier: CompactStaticBuildResistanceMultiplier
  vulnerabilityMultiplier: CompactStaticBuildVulnerabilityMultiplier
  dazeVulnerabilityMultiplier: CompactStaticBuildDazeVulnerabilityMultiplier
  sheerBonusMultiplier: CompactStaticBuildSheerBonusMultiplier
  anomalyProficiencyMultiplier: CompactStaticBuildAnomalyProficiencyMultiplier
  damageLevelMultiplier: CompactStaticBuildDamageLevelMultiplier
  anomalyBonusMultiplier: CompactStaticBuildAnomalyBonusMultiplier
  anomalyCritMultiplier: CompactStaticBuildAnomalyCritMultiplier
  specialMultiplier: CompactStaticBuildSpecialMultiplier
}

export interface CompactStaticBuildDamageResult {
  total: CompactStaticBuildDamageResultTotal
  breakdown: CompactStaticBuildDamageBreakdown
}

export interface CompactStaticBuildDiagnosticGroupSummary {
  key: StaticBuildDiagnosticKind
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildDiagnosticCount
}

export interface CompactStaticBuildDiagnosticOwnerGroupSummary {
  key: StaticBuildDiagnosticOwner
  count: CompactStaticBuildDiagnosticCount
}

export interface CompactStaticBuildDiagnosticEntry {
  kind: StaticBuildDiagnosticKind
  owner: StaticBuildDiagnosticOwner
  sourceType?: CompactStaticBuildSourceType
  sourceId?: CompactStaticBuildSourceId
  keys: CompactStaticBuildDiagnosticKeyList
  message: CompactStaticBuildDiagnosticMessage
}

export interface CompactStaticBuildDiagnosticSummary {
  count: CompactStaticBuildDiagnosticCount
  hasDiagnostics: boolean
  hasDefaultedInput: boolean
  hasCoverageGap: boolean
  hasUnsupportedEffect: boolean
  hasFallback: boolean
  kindGroups: CompactStaticBuildDiagnosticGroupSummary[]
  ownerGroups: CompactStaticBuildDiagnosticOwnerGroupSummary[]
}

export interface CompactStaticBuildSourceNoteGroupSummary {
  key: StaticBuildSourceNoteStatus
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildSourceNoteCount
}

export interface CompactStaticBuildSourceNoteOwnerGroupSummary {
  key: StaticBuildSourceNoteOwner
  count: CompactStaticBuildSourceNoteCount
}

export interface CompactStaticBuildSourceNoteGuidance {
  kind: StaticBuildSourceNoteGuidanceKind
  target?: StaticBuildSourceNoteGuidanceTarget
}

export interface CompactStaticBuildSourceNoteEntry {
  id: CompactStaticBuildEntryId
  sourceType: CompactStaticBuildSourceType
  sourceId: CompactStaticBuildSourceId
  owner: StaticBuildSourceNoteOwner
  status: StaticBuildSourceNoteStatus
  guidance: CompactStaticBuildSourceNoteGuidance
  keys: CompactStaticBuildSourceNoteKeyList
  message: CompactStaticBuildSourceNoteMessage
}

export interface CompactStaticBuildSourceNoteSummary {
  count: CompactStaticBuildSourceNoteCount
  hasSourceNotes: boolean
  hasMissingInput: boolean
  hasProcessOnly: boolean
  hasResearchOnly: boolean
  statusGroups: CompactStaticBuildSourceNoteGroupSummary[]
  ownerGroups: CompactStaticBuildSourceNoteOwnerGroupSummary[]
}

export interface CompactStaticBuildAssumptionSummary {
  count: CompactStaticBuildAssumptionCount
  hasAssumptions: boolean
}

export interface CompactStaticBuildCaveatSummary {
  assumptionCount: CompactStaticBuildAssumptionCount
  unsupportedEffectCount: CompactStaticBuildUnsupportedEffectCount
  hasAssumptions: boolean
  hasUnsupportedEffects: boolean
}

export interface CompactStaticBuildTraceModifier {
  bucket: StaticBuildBucket
  value: CompactStaticBuildModifierValue
  combine: CompactStaticBuildModifierCombine
}

export interface CompactStaticBuildTraceItem {
  effectId: CompactStaticBuildEffectId
  sourceType: CompactStaticBuildSourceType
  sourceName: CompactStaticBuildSourceName
  label: CompactStaticBuildEffectLabel
  status: CompactStaticBuildTraceStatus
  reason?: CompactStaticBuildTraceReason
  stacks?: CompactStaticBuildStackCount
  modifiers?: CompactStaticBuildTraceModifier[]
}

export interface CompactStaticBuildEntryCaveatSummary {
  assumptionCount: CompactStaticBuildAssumptionCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  hasAssumptions: boolean
  hasUnsupported: boolean
}

export interface CompactStaticBuildRequirementSummaryGroup<
  TKey extends string = string,
> {
  key: TKey
  count: CompactStaticBuildRequirementCount
  satisfiedCount: CompactStaticBuildSatisfiedRequirementCount
  unsatisfiedCount: CompactStaticBuildUnsatisfiedRequirementCount
}

export interface CompactStaticBuildRequirementSummary<
  TKey extends string = string,
> {
  count: CompactStaticBuildRequirementCount
  satisfiedCount: CompactStaticBuildSatisfiedRequirementCount
  unsatisfiedCount: CompactStaticBuildUnsatisfiedRequirementCount
  hasUnsatisfied: boolean
  groups: CompactStaticBuildRequirementSummaryGroup<TKey>[]
}

export type CompactStaticBuildSourceDamageViewRequirementSummary =
  CompactStaticBuildRequirementSummary<StaticBuildSourceDamageViewRequirementKind>

export type CompactStaticBuildSourceUtilityViewRequirementSummary =
  CompactStaticBuildRequirementSummary<StaticBuildSourceUtilityViewRequirementKind>

export interface CompactStaticBuildSourceDamageViewRequirement {
  kind: StaticBuildSourceDamageViewRequirementKind
  key: CompactStaticBuildRequirementKey
  satisfied: boolean
}

export interface CompactStaticBuildSourceUtilityViewRequirement {
  kind: StaticBuildSourceUtilityViewRequirementKind
  key: CompactStaticBuildRequirementKey
  satisfied: boolean
}

export interface CompactStaticBuildResolveEffectSummaryItem {
  effectId: CompactStaticBuildEffectId
  sourceName: CompactStaticBuildSourceName
  label: CompactStaticBuildEffectLabel
  bucket: CompactStaticBuildEffectSummaryBucket
  value: CompactStaticBuildEffectSummaryValue
}

export interface CompactStaticBuildAppliedRowEffectSummaryItem {
  effectId: CompactStaticBuildEffectId
  sourceName: CompactStaticBuildSourceName
  label: CompactStaticBuildEffectLabel
  bucket: CompactStaticBuildEffectSummaryBucket
  value: CompactStaticBuildEffectSummaryValue
  appliedRowCount: CompactStaticBuildAppliedRowCount
  totalRowCount: CompactStaticBuildTotalRowCount
  appliesToAllRows: boolean
  condition: CompactStaticBuildEffectSummaryCondition
}

export interface CompactStaticBuildAppliedEntryEffectSummaryItem {
  effectId: CompactStaticBuildEffectId
  sourceName: CompactStaticBuildSourceName
  label: CompactStaticBuildEffectLabel
  bucket: CompactStaticBuildEffectSummaryBucket
  value: CompactStaticBuildEffectSummaryValue
  appliedEntryCount: CompactStaticBuildAppliedEntryCount
  totalEntryCount: CompactStaticBuildTotalEntryCount
  appliesToAllEntries: boolean
  condition: CompactStaticBuildEffectSummaryCondition
}

export type CompactStaticBuildSkillMatrixEffectSummaryItem =
  CompactStaticBuildAppliedRowEffectSummaryItem

export type CompactStaticBuildTriggerMatrixEffectSummaryItem =
  CompactStaticBuildAppliedRowEffectSummaryItem

export type CompactStaticBuildSourceDamageViewEffectSummaryItem =
  CompactStaticBuildAppliedEntryEffectSummaryItem

export type CompactStaticBuildSourceUtilityViewEffectSummaryItem =
  CompactStaticBuildAppliedEntryEffectSummaryItem

export type CompactStaticBuildSourceEntryEffectSummaryItem =
  CompactStaticBuildAppliedEntryEffectSummaryItem

export interface StaticBuildCompactSkillMatrixRow {
  id: CompactStaticBuildRowId
  group: CompactStaticBuildSkillMatrixGroupKey
  label: CompactStaticBuildRowLabel
  metadata: CompactStaticBuildSkillMatrixRowMeta
  skillTag: CompactStaticBuildSkillTag
  damageType: CompactStaticBuildSourceDamageType
  attribute: CompactStaticBuildAgentAttribute
  combatTags: CompactStaticBuildCombatTagList
  skillMultiplier: CompactStaticBuildSkillMultiplierText
  damage: StaticBuildSkillMatrixRowDamageSummary
  summary: CompactStaticBuildResolveSummary
  resolvedBuckets: CompactStaticBuildResolvedBuckets
  diagnostics?: CompactStaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: CompactStaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  assumptions?: CompactStaticBuildAssumptionList
  unsupportedEffects?: CompactStaticBuildUnsupportedEffectList
  build?: CompactStaticBuildResult
}

export interface CompactStaticBuildSkillMatrixResult {
  profile: CompactStaticBuildProfile
  mode: CompactStaticBuildMode
  manualBaseMode?: CompactStaticBuildBaseMode
  loadout: CompactStaticBuildLoadout
  summary: CompactStaticBuildSkillMatrixSummary
  effectSummary: CompactStaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptions?: CompactStaticBuildAssumptionList
  unsupportedEffects?: CompactStaticBuildUnsupportedEffectList
  rows: StaticBuildCompactSkillMatrixRow[]
}

export interface CompactStaticBuildSkillMatrixRowMeta {
  order: CompactStaticBuildOrder
  actionName: CompactStaticBuildActionName
  skillName: CompactStaticBuildSkillName
  qualifiers: CompactStaticBuildSkillQualifierList
  canonicalLabel: CompactStaticBuildCanonicalLabel
  stableKey: CompactStaticBuildStableKey
  templateSource: CompactStaticBuildSkillMatrixTemplateSource
  sourceSkillTypeId: CompactStaticBuildSourceSkillTypeId
  sourceStatId: CompactStaticBuildSourceStatId
  sourceStatName: CompactStaticBuildSourceStatName
  sourceOccurrence: CompactStaticBuildSourceOccurrence
  attributeSource: CompactStaticBuildSkillMatrixAttributeSource
  templateCombatTags: CompactStaticBuildCombatTagList
  entryType: CompactStaticBuildSkillMatrixEntryType
  aggregationType: CompactStaticBuildSkillMatrixAggregationType
  isAdditionalDamage: boolean
  variantAxis?: CompactStaticBuildSkillMatrixVariantAxis
  segmentLabel?: CompactStaticBuildSegmentLabel
  segmentIndex?: CompactStaticBuildSegmentIndex
  targetSize?: CompactStaticBuildTargetSize
}

export interface CompactStaticBuildSkillMatrixGroupSummary {
  key: CompactStaticBuildSkillMatrixGroupKey
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildGroupCount
  commonBuckets: CompactStaticBuildBucketValueMap
  variableBuckets: CompactStaticBuildVariableBucketList
  commonFormulaMultipliers: CompactStaticBuildFormulaMultiplierMap
  variableFormulaMultipliers: CompactStaticBuildVariableFormulaMultiplierList
  effectSummary: CompactStaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptions?: CompactStaticBuildAssumptionList
  unsupportedEffects?: CompactStaticBuildUnsupportedEffectList
}

export interface CompactStaticBuildSkillMatrixSummary {
  rowCount: CompactStaticBuildRowCount
  baseDamageStat: CompactStaticBuildBaseDamageStat
  baseDamageValue: CompactStaticBuildBaseDamageValue
  attack?: CompactStaticBuildAttack
  hp?: CompactStaticBuildHP
  sheerForce?: CompactStaticBuildSheerForce
  critRate: CompactStaticBuildCritRate
  critDamage: CompactStaticBuildCritDamage
  penetrationRate: CompactStaticBuildPenetrationRate
  penetrationValue: CompactStaticBuildPenetrationValue
  commonBuckets: CompactStaticBuildBucketValueMap
  variableBuckets: CompactStaticBuildVariableBucketList
  commonFormulaMultipliers: CompactStaticBuildFormulaMultiplierMap
  variableFormulaMultipliers: CompactStaticBuildVariableFormulaMultiplierList
  effectSummary: CompactStaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  groups: CompactStaticBuildSkillMatrixGroupSummary[]
}

export function compactStaticBuildResult(
  build: ResolveStaticBuildResult,
  includeDetails = false,
): CompactStaticBuildResult {
  return {
    profile: compactStaticBuildProfile(build.profile),
    mode: build.mode,
    manualBaseMode: build.manualBaseMode,
    loadout: compactStaticBuildLoadout(build.loadout),
    summary: compactStaticBuildResolveSummary(build.summary),
    effectSummary: build.effectSummary.map((item) =>
      compactStaticBuildResolveEffectSummaryItem(item),
    ),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      build.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      build.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      build.assumptionSummary,
    ),
    caveatSummary: compactStaticBuildCaveatSummary(build.caveatSummary),
    resolvedPanel: compactStaticBuildResolvedPanel(build.resolvedPanel),
    resolvedBuckets: compactStaticBuildResolvedBuckets(build.resolvedBuckets),
    damage: {
      expected: compactStaticBuildDamageResult(build.damage.expected),
      crit: compactStaticBuildDamageResult(build.damage.crit),
      noCrit: compactStaticBuildDamageResult(build.damage.noCrit),
    },
    ...(includeDetails
      ? {
          assumptions: build.assumptions,
          unsupportedEffects: build.unsupportedEffects,
          diagnostics: build.diagnostics?.map((entry) =>
            compactStaticBuildDiagnosticEntry(entry),
          ),
          sourceNotes: build.sourceNotes?.map((entry) =>
            compactStaticBuildSourceNoteEntry(entry),
          ),
          damageParams: compactStaticBuildDamageParams(build.damageParams),
          trace: build.trace?.map((item) => compactStaticBuildTraceItem(item)),
        }
      : {}),
  }
}

export function compactStaticBuildProfile(
  profile: StaticBuildProfileResult,
): CompactStaticBuildProfile {
  return {
    id: profile.id,
    name: profile.name,
  }
}

export function compactStaticBuildLoadout(
  loadout: StaticBuildResolvedLoadout,
): CompactStaticBuildLoadout {
  return {
    agent: {
      id: loadout.agent.id,
      name: loadout.agent.name,
      aliases: [...loadout.agent.aliases],
      specialty: loadout.agent.specialty,
      defaultAttribute: loadout.agent.defaultAttribute,
      defaultDamageType:
        "defaultDamageType" in loadout.agent
          ? loadout.agent.defaultDamageType
          : undefined,
      profileId:
        "profileId" in loadout.agent ? loadout.agent.profileId : undefined,
    },
    wEngine: loadout.wEngine
      ? {
          id: loadout.wEngine.id,
          name: loadout.wEngine.name,
          aliases: [...loadout.wEngine.aliases],
          specialty: loadout.wEngine.specialty,
        }
      : undefined,
    driveDiscSets: loadout.driveDiscSets.map((set) => ({
      id: set.id,
      name: set.name,
      aliases: [...set.aliases],
      pieces: set.pieces,
    })),
    agentLevel: loadout.agentLevel,
    agentMindscape: loadout.agentMindscape,
    coreSkillLevel: loadout.coreSkillLevel,
    wEngineRefinement: loadout.wEngineRefinement,
  }
}

export function compactStaticBuildResolveSummary(
  summary: StaticBuildResolveSummary,
): CompactStaticBuildResolveSummary {
  return {
    baseDamageStat: summary.baseDamageStat,
    baseDamageValue: summary.baseDamageValue,
    expectedTotal: summary.expectedTotal,
    critTotal: summary.critTotal,
    noCritTotal: summary.noCritTotal,
    formulaMultipliers: summary.formulaMultipliers,
    assumptionCount: summary.assumptionCount,
    diagnosticCount: summary.diagnosticCount,
    sourceNoteCount: summary.sourceNoteCount,
    unsupportedEffectCount: summary.unsupportedEffectCount,
    hasDiagnostics: summary.hasDiagnostics,
    hasSourceNotes: summary.hasSourceNotes,
    hasUnsupportedEffects: summary.hasUnsupportedEffects,
    hasDefaultedInput: summary.hasDefaultedInput,
    hasCoverageGap: summary.hasCoverageGap,
    hasUnsupportedEffect: summary.hasUnsupportedEffect,
    hasFallback: summary.hasFallback,
    hasMissingInputSourceNote: summary.hasMissingInputSourceNote,
    hasProcessOnlySourceNote: summary.hasProcessOnlySourceNote,
    hasResearchOnlySourceNote: summary.hasResearchOnlySourceNote,
    diagnosticGroups: summary.diagnosticGroups.map((group) =>
      compactStaticBuildDiagnosticGroupSummary(group),
    ),
    sourceNoteGroups: summary.sourceNoteGroups.map((group) =>
      compactStaticBuildSourceNoteGroupSummary(group),
    ),
  }
}

export function compactStaticBuildResolvedBuckets(
  buckets: StaticBuildResolvedBuckets,
): CompactStaticBuildResolvedBuckets {
  return {
    attackPercent: buckets.attackPercent,
    flatAttack: buckets.flatAttack,
    bonusDamageSum: buckets.bonusDamageSum,
    critRate: buckets.critRate,
    critDamage: buckets.critDamage,
    defenseReduction: buckets.defenseReduction,
    penetrationRate: buckets.penetrationRate,
    penetrationValue: buckets.penetrationValue,
    resistanceReduction: buckets.resistanceReduction,
    ignoreResistance: buckets.ignoreResistance,
    vulnerabilityBonus: buckets.vulnerabilityBonus,
    damageReduction: buckets.damageReduction,
    stunVulnerability: buckets.stunVulnerability,
    nonStunVulnerability: buckets.nonStunVulnerability,
    sheerBonusSum: buckets.sheerBonusSum,
    anomalyMastery: buckets.anomalyMastery,
    anomalyProficiency: buckets.anomalyProficiency,
    anomalyBonusDamageSum: buckets.anomalyBonusDamageSum,
    anomalyCritRate: buckets.anomalyCritRate,
    anomalyCritDamage: buckets.anomalyCritDamage,
    skillMultiplierFactor: buckets.skillMultiplierFactor,
  }
}

export function compactStaticBuildResolvedPanel(
  panel: StaticBuildResolvedPanel,
): CompactStaticBuildResolvedPanel {
  return {
    attack: panel.attack,
    baseAttack: panel.baseAttack,
    agentLevel: panel.agentLevel,
    critRate: panel.critRate,
    critDamage: panel.critDamage,
    hp: panel.hp,
    sheerForce: panel.sheerForce,
    energyGenerationRate: panel.energyGenerationRate,
    anomalyProficiency: panel.anomalyProficiency,
    anomalyMastery: panel.anomalyMastery,
    anomalyCritRate: panel.anomalyCritRate,
    anomalyCritDamage: panel.anomalyCritDamage,
    penetrationRate: panel.penetrationRate,
    penetrationValue: panel.penetrationValue,
    baseDamageStat: panel.baseDamageStat,
    baseDamageValue: panel.baseDamageValue,
  }
}

export function compactStaticBuildDefenseParams(
  params: DefenseParams,
): CompactStaticBuildDefenseParams {
  return {
    attackerLevelBase: params.attackerLevelBase,
    defenderBaseDefense: params.defenderBaseDefense,
    defenseBonus: params.defenseBonus,
    defenseReduction: params.defenseReduction,
    penetrationRate: params.penetrationRate,
    penetrationValue: params.penetrationValue,
  }
}

export function compactStaticBuildResistanceParams(
  params: ResistanceParams,
): CompactStaticBuildResistanceParams {
  return {
    defenderResistance: params.defenderResistance,
    resistanceReduction: params.resistanceReduction,
    ignoreResistance: params.ignoreResistance,
  }
}

export function compactStaticBuildVulnerabilityParams(
  params: VulnerabilityParams,
): CompactStaticBuildVulnerabilityParams {
  return {
    vulnerabilityBonus: params.vulnerabilityBonus,
    damageReduction: params.damageReduction,
  }
}

export function compactStaticBuildDazeVulnerabilityParams(
  params: DazeVulnerabilityParams,
): CompactStaticBuildDazeVulnerabilityParams {
  return {
    isStunned: params.isStunned,
    stunVulnerability: params.stunVulnerability,
    nonStunVulnerability: params.nonStunVulnerability,
  }
}

export function compactStaticBuildCritParams(
  params: CritParams,
): CompactStaticBuildCritParams {
  return {
    critRate: params.critRate,
    critDamage: params.critDamage,
  }
}

export function compactStaticBuildNormalDamageParams(
  params: NormalDamageParams,
): CompactStaticBuildNormalDamageParams {
  return {
    baseDamage: params.baseDamage,
    bonusDamageSum: params.bonusDamageSum,
    crit: compactStaticBuildCritParams(params.crit),
    defense: compactStaticBuildDefenseParams(params.defense),
    resistance: compactStaticBuildResistanceParams(params.resistance),
    vulnerability: compactStaticBuildVulnerabilityParams(params.vulnerability),
    dazeVulnerability: compactStaticBuildDazeVulnerabilityParams(
      params.dazeVulnerability,
    ),
    specialMultiplier: params.specialMultiplier,
  }
}

export function compactStaticBuildSheerDamageParams(
  params: SheerDamageParams,
): CompactStaticBuildSheerDamageParams {
  return {
    baseDamage: params.baseDamage,
    bonusDamageSum: params.bonusDamageSum,
    crit: compactStaticBuildCritParams(params.crit),
    sheerBonusSum: params.sheerBonusSum,
    resistance: compactStaticBuildResistanceParams(params.resistance),
    vulnerability: compactStaticBuildVulnerabilityParams(params.vulnerability),
    dazeVulnerability: compactStaticBuildDazeVulnerabilityParams(
      params.dazeVulnerability,
    ),
    specialMultiplier: params.specialMultiplier,
  }
}

export function compactStaticBuildAnomalyDamageParams(
  params: AnomalyDamageParams,
): CompactStaticBuildAnomalyDamageParams {
  return {
    virtualAgentLevel: params.virtualAgentLevel,
    virtualAgentAttack: params.virtualAgentAttack,
    virtualAgentAnomalyProficiency: params.virtualAgentAnomalyProficiency,
    damageMultiplier: params.damageMultiplier,
    bonusDamageSum: params.bonusDamageSum,
    defense: compactStaticBuildDefenseParams(params.defense),
    resistance: compactStaticBuildResistanceParams(params.resistance),
    vulnerability: compactStaticBuildVulnerabilityParams(params.vulnerability),
    dazeVulnerability: compactStaticBuildDazeVulnerabilityParams(
      params.dazeVulnerability,
    ),
    anomalyBonusDamageSum: params.anomalyBonusDamageSum,
    anomalyCritRate: params.anomalyCritRate,
    anomalyCritDamage: params.anomalyCritDamage,
  }
}

export function compactStaticBuildDisorderDamageParams(
  params: DisorderDamageParams,
): CompactStaticBuildDisorderDamageParams {
  return {
    virtualAgentLevel: params.virtualAgentLevel,
    virtualAgentAttack: params.virtualAgentAttack,
    virtualAgentAnomalyProficiency: params.virtualAgentAnomalyProficiency,
    bonusDamageSum: params.bonusDamageSum,
    defense: compactStaticBuildDefenseParams(params.defense),
    resistance: compactStaticBuildResistanceParams(params.resistance),
    vulnerability: compactStaticBuildVulnerabilityParams(params.vulnerability),
    dazeVulnerability: compactStaticBuildDazeVulnerabilityParams(
      params.dazeVulnerability,
    ),
    anomalyBonusDamageSum: params.anomalyBonusDamageSum,
    anomalyCritRate: params.anomalyCritRate,
    anomalyCritDamage: params.anomalyCritDamage,
    damageMultiplierFactor: params.damageMultiplierFactor,
    anomalyType: params.anomalyType,
    remainingTime: params.remainingTime,
  }
}

export function compactStaticBuildDamageParams(
  params:
    | NormalDamageParams
    | SheerDamageParams
    | AnomalyDamageParams
    | DisorderDamageParams,
):
  | CompactStaticBuildNormalDamageParams
  | CompactStaticBuildSheerDamageParams
  | CompactStaticBuildAnomalyDamageParams
  | CompactStaticBuildDisorderDamageParams {
  if ("anomalyType" in params || "remainingTime" in params) {
    return compactStaticBuildDisorderDamageParams(params)
  }

  if ("damageMultiplier" in params) {
    return compactStaticBuildAnomalyDamageParams(params)
  }

  if ("sheerBonusSum" in params) {
    return compactStaticBuildSheerDamageParams(params)
  }

  return compactStaticBuildNormalDamageParams(params)
}

export function compactStaticBuildDamageBreakdown(
  breakdown: DamageBreakdown,
): CompactStaticBuildDamageBreakdown {
  return {
    baseDamage: breakdown.baseDamage,
    bonusMultiplier: breakdown.bonusMultiplier,
    critMultiplier: breakdown.critMultiplier,
    defenseMultiplier: breakdown.defenseMultiplier,
    resistanceMultiplier: breakdown.resistanceMultiplier,
    vulnerabilityMultiplier: breakdown.vulnerabilityMultiplier,
    dazeVulnerabilityMultiplier: breakdown.dazeVulnerabilityMultiplier,
    sheerBonusMultiplier: breakdown.sheerBonusMultiplier,
    anomalyProficiencyMultiplier: breakdown.anomalyProficiencyMultiplier,
    damageLevelMultiplier: breakdown.damageLevelMultiplier,
    anomalyBonusMultiplier: breakdown.anomalyBonusMultiplier,
    anomalyCritMultiplier: breakdown.anomalyCritMultiplier,
    specialMultiplier: breakdown.specialMultiplier,
  }
}

export function compactStaticBuildDamageResult(
  result: DamageResult,
): CompactStaticBuildDamageResult {
  return {
    total: result.total,
    breakdown: compactStaticBuildDamageBreakdown(result.breakdown),
  }
}

export function compactStaticBuildDiagnosticEntry(
  entry: StaticBuildDiagnosticEntry,
): CompactStaticBuildDiagnosticEntry {
  return {
    kind: entry.kind,
    owner: entry.owner,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    keys: entry.keys,
    message: entry.message,
  }
}

export function compactStaticBuildDiagnosticGroupSummary(
  group: StaticBuildDiagnosticGroupSummary,
): CompactStaticBuildDiagnosticGroupSummary {
  return {
    key: group.key,
    label: group.label,
    count: group.count,
  }
}

export function compactStaticBuildDiagnosticOwnerGroupSummary(
  group: StaticBuildDiagnosticOwnerGroupSummary,
): CompactStaticBuildDiagnosticOwnerGroupSummary {
  return {
    key: group.key,
    count: group.count,
  }
}

export function compactStaticBuildDiagnosticSummary(
  summary: StaticBuildDiagnosticSummary,
): CompactStaticBuildDiagnosticSummary {
  return {
    count: summary.count,
    hasDiagnostics: summary.hasDiagnostics,
    hasDefaultedInput: summary.hasDefaultedInput,
    hasCoverageGap: summary.hasCoverageGap,
    hasUnsupportedEffect: summary.hasUnsupportedEffect,
    hasFallback: summary.hasFallback,
    kindGroups: summary.kindGroups.map((group) =>
      compactStaticBuildDiagnosticGroupSummary(group),
    ),
    ownerGroups: summary.ownerGroups.map((group) =>
      compactStaticBuildDiagnosticOwnerGroupSummary(group),
    ),
  }
}

export function compactStaticBuildSourceNoteGuidance(
  guidance: StaticBuildSourceNoteGuidance,
): CompactStaticBuildSourceNoteGuidance {
  return {
    kind: guidance.kind,
    target: guidance.target,
  }
}

export function compactStaticBuildSourceNoteGroupSummary(
  group: StaticBuildSourceNoteGroupSummary,
): CompactStaticBuildSourceNoteGroupSummary {
  return {
    key: group.key,
    label: group.label,
    count: group.count,
  }
}

export function compactStaticBuildSourceNoteOwnerGroupSummary(
  group: StaticBuildSourceNoteOwnerGroupSummary,
): CompactStaticBuildSourceNoteOwnerGroupSummary {
  return {
    key: group.key,
    count: group.count,
  }
}

export function compactStaticBuildSourceNoteEntry(
  entry: StaticBuildSourceNoteEntry,
): CompactStaticBuildSourceNoteEntry {
  return {
    id: entry.id,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    owner: entry.owner,
    status: entry.status,
    guidance: compactStaticBuildSourceNoteGuidance(entry.guidance),
    keys: entry.keys,
    message: entry.message,
  }
}

export function compactStaticBuildSourceNoteSummary(
  summary: StaticBuildSourceNoteSummary,
): CompactStaticBuildSourceNoteSummary {
  return {
    count: summary.count,
    hasSourceNotes: summary.hasSourceNotes,
    hasMissingInput: summary.hasMissingInput,
    hasProcessOnly: summary.hasProcessOnly,
    hasResearchOnly: summary.hasResearchOnly,
    statusGroups: summary.statusGroups.map((group) =>
      compactStaticBuildSourceNoteGroupSummary(group),
    ),
    ownerGroups: summary.ownerGroups.map((group) =>
      compactStaticBuildSourceNoteOwnerGroupSummary(group),
    ),
  }
}

export function compactStaticBuildAssumptionSummary(
  summary: StaticBuildAssumptionSummary,
): CompactStaticBuildAssumptionSummary {
  return {
    count: summary.count,
    hasAssumptions: summary.hasAssumptions,
  }
}

export function compactStaticBuildCaveatSummary(
  summary: StaticBuildCaveatSummary,
): CompactStaticBuildCaveatSummary {
  return {
    assumptionCount: summary.assumptionCount,
    unsupportedEffectCount: summary.unsupportedEffectCount,
    hasAssumptions: summary.hasAssumptions,
    hasUnsupportedEffects: summary.hasUnsupportedEffects,
  }
}

export function compactStaticBuildEntryCaveatSummary(
  summary: StaticBuildEntryCaveatSummary,
): CompactStaticBuildEntryCaveatSummary {
  return {
    assumptionCount: summary.assumptionCount,
    unsupportedCount: summary.unsupportedCount,
    hasAssumptions: summary.hasAssumptions,
    hasUnsupported: summary.hasUnsupported,
  }
}

export function compactStaticBuildRequirementSummaryGroup<
  TKey extends string = string,
>(
  group: StaticBuildRequirementSummaryGroup<TKey>,
): CompactStaticBuildRequirementSummaryGroup<TKey> {
  return {
    key: group.key,
    count: group.count,
    satisfiedCount: group.satisfiedCount,
    unsatisfiedCount: group.unsatisfiedCount,
  }
}

export function compactStaticBuildRequirementSummary<
  TKey extends string = string,
>(
  summary: StaticBuildRequirementSummary<TKey>,
): CompactStaticBuildRequirementSummary<TKey> {
  return {
    count: summary.count,
    satisfiedCount: summary.satisfiedCount,
    unsatisfiedCount: summary.unsatisfiedCount,
    hasUnsatisfied: summary.hasUnsatisfied,
    groups: summary.groups.map((group) =>
      compactStaticBuildRequirementSummaryGroup(group),
    ),
  }
}

export function compactStaticBuildSourceDamageViewRequirement(
  requirement: StaticBuildSourceDamageViewRequirement,
): CompactStaticBuildSourceDamageViewRequirement {
  return {
    kind: requirement.kind,
    key: requirement.key,
    satisfied: requirement.satisfied,
  }
}

export function compactStaticBuildSourceUtilityViewRequirement(
  requirement: StaticBuildSourceUtilityViewRequirement,
): CompactStaticBuildSourceUtilityViewRequirement {
  return {
    kind: requirement.kind,
    key: requirement.key,
    satisfied: requirement.satisfied,
  }
}

export function compactStaticBuildTraceModifier(
  modifier: StaticBuildTraceModifier,
): CompactStaticBuildTraceModifier {
  return {
    bucket: modifier.bucket,
    value: modifier.value,
    combine: modifier.combine,
  }
}

export function compactStaticBuildTraceItem(
  item: StaticBuildTraceItem,
): CompactStaticBuildTraceItem {
  return {
    effectId: item.effectId,
    sourceType: item.sourceType,
    sourceName: item.sourceName,
    label: item.label,
    status: item.status,
    reason: item.reason,
    stacks: item.stacks,
    modifiers: item.modifiers?.map((modifier) =>
      compactStaticBuildTraceModifier(modifier),
    ),
  }
}

export function compactStaticBuildResolveEffectSummaryItem(
  item: StaticBuildResolveEffectSummaryItem,
): CompactStaticBuildResolveEffectSummaryItem {
  return {
    effectId: item.effectId,
    sourceName: item.sourceName,
    label: item.label,
    bucket: item.bucket,
    value: item.value,
  }
}

export function compactStaticBuildAppliedRowEffectSummaryItem(
  item:
    | StaticBuildSkillMatrixEffectSummaryItem
    | StaticBuildTriggerMatrixEffectSummaryItem,
): CompactStaticBuildAppliedRowEffectSummaryItem {
  return {
    effectId: item.effectId,
    sourceName: item.sourceName,
    label: item.label,
    bucket: item.bucket,
    value: item.value,
    appliedRowCount: item.appliedRowCount,
    totalRowCount: item.totalRowCount,
    appliesToAllRows: item.appliesToAllRows,
    condition: item.condition,
  }
}

export function compactStaticBuildAppliedEntryEffectSummaryItem(
  item: StaticBuildSourceDamageViewEffectSummaryItem,
): CompactStaticBuildAppliedEntryEffectSummaryItem {
  return {
    effectId: item.effectId,
    sourceName: item.sourceName,
    label: item.label,
    bucket: item.bucket,
    value: item.value,
    appliedEntryCount: item.appliedEntryCount,
    totalEntryCount: item.totalEntryCount,
    appliesToAllEntries: item.appliesToAllEntries,
    condition: item.condition,
  }
}

export interface StaticBuildCompactTriggerMatrixRow {
  id: CompactStaticBuildRowId
  label: CompactStaticBuildRowLabel
  supported: boolean
  metadata: CompactStaticBuildTriggerMatrixRowMeta
  effectSummary: CompactStaticBuildTriggerMatrixEffectSummaryItem[]
  requirements?: CompactStaticBuildSourceDamageViewRequirement[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  diagnostics?: CompactStaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: CompactStaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
  damage?: CompactStaticBuildEntryDamageSummary
  summary?: CompactStaticBuildResolveSummary
  build?: CompactStaticBuildResult
}

export interface CompactStaticBuildTriggerMatrixGroupSummary {
  key: StaticBuildTriggerMatrixEntryKind
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildGroupCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  effectSummary: CompactStaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildTriggerMatrixRowMeta {
  canonicalLabel: CompactStaticBuildCanonicalLabel
  stableKey: CompactStaticBuildStableKey
  entryKind: CompactStaticBuildTriggerMatrixEntryKind
  templateSource: CompactStaticBuildTriggerMatrixTemplateSource
  damageType: Extract<
    CompactStaticBuildSourceDamageType,
    "anomaly" | "disorder"
  >
  sourceType?: CompactStaticBuildSourceType
  sourceId?: CompactStaticBuildSourceId
  sourceStableKey?: CompactStaticBuildStableKey
  sourceViewId?: CompactStaticBuildSourceViewId
  sourceViewResolutionMode?: CompactStaticBuildSourceDamageViewResolutionMode
}

export interface CompactStaticBuildTriggerMatrixSummary {
  rowCount: CompactStaticBuildRowCount
  mainFormulaCount: CompactStaticBuildMainFormulaCount
  sourceViewCount: CompactStaticBuildSourceViewCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  hasSourceViews: boolean
  effectSummary: CompactStaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildTriggerMatrixGroupSummary[]
}

export interface CompactStaticBuildTriggerMatrixResult {
  profile: CompactStaticBuildProfile
  mode: CompactStaticBuildMode
  manualBaseMode?: CompactStaticBuildBaseMode
  loadout: CompactStaticBuildLoadout
  summary: CompactStaticBuildTriggerMatrixSummary
  effectSummary: CompactStaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
  rows: StaticBuildCompactTriggerMatrixRow[]
}

export interface StaticBuildCompactSourceDamageViewEntry {
  id: CompactStaticBuildEntryId
  label: CompactStaticBuildEntryLabel
  metadata: CompactStaticBuildSourceDamageViewMeta
  supported: boolean
  sourceType: CompactStaticBuildSourceType
  sourceId: CompactStaticBuildSourceId
  damageType: CompactStaticBuildSourceDamageType
  resolutionMode: CompactStaticBuildSourceDamageViewResolutionMode
  requirements?: CompactStaticBuildSourceDamageViewRequirement[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  diagnostics?: CompactStaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: CompactStaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  effectSummary: CompactStaticBuildSourceDamageViewEffectSummaryItem[]
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
  damage?: CompactStaticBuildEntryDamageSummary
  summary?: CompactStaticBuildResolveSummary
  build?: CompactStaticBuildResult
}

export interface CompactStaticBuildSourceDamageViewGroupSummary {
  key: CompactStaticBuildSourceDamageViewGroupKey
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildGroupCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  effectSummary: CompactStaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildSourceDamageViewsSummary {
  entryCount: CompactStaticBuildEntryCount
  standaloneCount: CompactStaticBuildStandaloneCount
  deltaCount: CompactStaticBuildDeltaCount
  triggerCount: CompactStaticBuildTriggerCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  effectSummary: CompactStaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildSourceDamageViewGroupSummary[]
}

export interface StaticBuildCompactSourceUtilityViewEntry {
  id: CompactStaticBuildEntryId
  label: CompactStaticBuildEntryLabel
  metadata: CompactStaticBuildSourceUtilityViewMeta
  supported: boolean
  sourceType: CompactStaticBuildSourceType
  sourceId: CompactStaticBuildSourceId
  utilityType: CompactStaticBuildSourceUtilityType
  resolutionMode: CompactStaticBuildSourceUtilityResolutionMode
  targetScope: CompactStaticBuildSourceUtilityTargetScope
  requirements?: CompactStaticBuildSourceUtilityViewRequirement[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  value: CompactStaticBuildUtilityValue
  unit: CompactStaticBuildSourceUtilityUnit
  triggerLabel?: CompactStaticBuildTriggerLabel
  conditionLabel?: CompactStaticBuildConditionLabel
  cooldownSeconds?: CompactStaticBuildCooldownSeconds
  summary: CompactStaticBuildSourceUtilityViewEntrySummary
  diagnostics?: CompactStaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: CompactStaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  effectSummary: CompactStaticBuildSourceUtilityViewEffectSummaryItem[]
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
}

export type StaticBuildCompactSourceEntry =
  | StaticBuildCompactSourceDamageViewEntry
  | StaticBuildCompactSourceUtilityViewEntry

export interface CompactStaticBuildSourceUtilityViewEntrySummary {
  value: CompactStaticBuildUtilityValue
  unit: CompactStaticBuildSourceUtilityUnit
  resolutionMode: CompactStaticBuildSourceUtilityResolutionMode
  targetScope: CompactStaticBuildSourceUtilityTargetScope
  requirementCount: CompactStaticBuildRequirementCount
  hasUnsatisfiedRequirements: boolean
  diagnosticCount: CompactStaticBuildDiagnosticCount
  sourceNoteCount: CompactStaticBuildSourceNoteCount
  assumptionCount: CompactStaticBuildAssumptionCount
  hasUnsupported: boolean
}

export interface CompactStaticBuildEntryDamageSummary {
  expected: CompactStaticBuildExpectedTotal
  crit: CompactStaticBuildCriticalTotal
  noCrit: CompactStaticBuildNonCriticalTotal
}

export interface CompactStaticBuildSourceDamageViewMeta {
  canonicalLabel: CompactStaticBuildCanonicalLabel
  stableKey: CompactStaticBuildStableKey
  entryKind: "source-damage-view"
  damageType: Extract<
    CompactStaticBuildSourceDamageType,
    "anomaly" | "disorder"
  >
  resolutionMode: CompactStaticBuildSourceDamageViewResolutionMode
}

export interface CompactStaticBuildSourceUtilityViewMeta {
  canonicalLabel: CompactStaticBuildCanonicalLabel
  stableKey: CompactStaticBuildStableKey
  entryKind: "source-utility-view"
  utilityType: CompactStaticBuildSourceUtilityType
  resolutionMode: CompactStaticBuildSourceUtilityResolutionMode
  targetScope: CompactStaticBuildSourceUtilityTargetScope
  unit: CompactStaticBuildSourceUtilityUnit
}

export interface CompactStaticBuildSourceEntryGroupSummary {
  key: CompactStaticBuildSourceEntryGroupKey
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildGroupCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  effectSummary: CompactStaticBuildSourceEntryEffectSummaryItem[]
  sourceDamageRequirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildSourceEntryCollectionSummary {
  entryCount: CompactStaticBuildEntryCount
  sourceDamageViewCount: CompactStaticBuildSourceDamageViewCount
  sourceUtilityViewCount: CompactStaticBuildSourceUtilityViewCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  isUtilityOnly: boolean
  effectSummary: CompactStaticBuildSourceEntryEffectSummaryItem[]
  sourceDamageRequirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildSourceEntryGroupSummary[]
}

export interface CompactStaticBuildSourceEntryCollection {
  loadout: CompactStaticBuildLoadout
  summary: CompactStaticBuildSourceEntryCollectionSummary
  effectSummary: CompactStaticBuildSourceEntryEffectSummaryItem[]
  sourceDamageRequirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
  entries: StaticBuildCompactSourceEntry[]
}

export interface CompactStaticBuildSourceUtilityViewGroupSummary {
  key: CompactStaticBuildSourceUtilityViewGroupKey
  label: CompactStaticBuildGroupLabel
  count: CompactStaticBuildGroupCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  effectSummary: CompactStaticBuildSourceUtilityViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildSourceUtilityViewsSummary {
  entryCount: CompactStaticBuildEntryCount
  triggerCount: CompactStaticBuildTriggerCount
  rateCount: CompactStaticBuildRateCount
  supportedCount: CompactStaticBuildSupportedCount
  unsupportedCount: CompactStaticBuildUnsupportedCount
  effectSummary: CompactStaticBuildSourceUtilityViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildSourceUtilityViewGroupSummary[]
}

export interface CompactStaticBuildSourceDamageViewsResult {
  mode: CompactStaticBuildMode
  manualBaseMode?: CompactStaticBuildBaseMode
  loadout: CompactStaticBuildLoadout
  summary: CompactStaticBuildSourceDamageViewsSummary
  effectSummary: CompactStaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
  entries: StaticBuildCompactSourceDamageViewEntry[]
}

export interface CompactStaticBuildSourceUtilityViewsResult {
  loadout: CompactStaticBuildLoadout
  summary: CompactStaticBuildSourceUtilityViewsSummary
  effectSummary: CompactStaticBuildSourceUtilityViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: CompactStaticBuildAssumptionList
  entries: StaticBuildCompactSourceUtilityViewEntry[]
}

export function compactStaticBuildSkillMatrixResult(
  matrix: ResolveStaticBuildSkillMatrixResult,
  includeDetails = false,
): CompactStaticBuildSkillMatrixResult {
  return {
    profile: compactStaticBuildProfile(matrix.profile),
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: compactStaticBuildLoadout(matrix.loadout),
    summary: compactStaticBuildSkillMatrixSummary(
      matrix.summary,
      includeDetails,
    ),
    effectSummary: matrix.effectSummary.map((item) =>
      compactStaticBuildAppliedRowEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      matrix.requirementSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      matrix.assumptionSummary,
    ),
    caveatSummary: compactStaticBuildCaveatSummary(matrix.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      matrix.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      matrix.sourceNoteSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: matrix.assumptions,
          unsupportedEffects: matrix.unsupportedEffects,
        }
      : {}),
    rows: matrix.rows.map((row) =>
      compactStaticBuildSkillMatrixRow(row, includeDetails),
    ),
  }
}

export function compactStaticBuildSkillMatrixSummary(
  summary: StaticBuildSkillMatrixSummary,
  includeDetails = false,
): CompactStaticBuildSkillMatrixSummary {
  return {
    ...summary,
    effectSummary: summary.effectSummary.map((item) =>
      compactStaticBuildAppliedRowEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      summary.requirementSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      summary.assumptionSummary,
    ),
    caveatSummary: compactStaticBuildCaveatSummary(summary.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      summary.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      summary.sourceNoteSummary,
    ),
    groups: summary.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      commonBuckets: group.commonBuckets,
      variableBuckets: group.variableBuckets,
      commonFormulaMultipliers: group.commonFormulaMultipliers,
      variableFormulaMultipliers: group.variableFormulaMultipliers,
      effectSummary: group.effectSummary.map((item) =>
        compactStaticBuildAppliedRowEffectSummaryItem(item),
      ),
      requirementSummary: compactStaticBuildRequirementSummary(
        group.requirementSummary,
      ),
      assumptionSummary: compactStaticBuildAssumptionSummary(
        group.assumptionSummary,
      ),
      caveatSummary: compactStaticBuildCaveatSummary(group.caveatSummary),
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        group.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        group.sourceNoteSummary,
      ),
      ...(includeDetails
        ? {
            assumptions: group.assumptions,
            unsupportedEffects: group.unsupportedEffects,
          }
        : {}),
    })),
  }
}

export function compactStaticBuildSkillMatrixRow(
  row: StaticBuildSkillMatrixRow,
  includeDetails = false,
): StaticBuildCompactSkillMatrixRow {
  return {
    id: row.id,
    group: row.group,
    label: row.label,
    metadata: compactStaticBuildSkillMatrixRowMeta(row.metadata),
    skillTag: row.skillTag,
    damageType: row.damageType,
    attribute: row.attribute,
    combatTags: row.combatTags,
    skillMultiplier: row.skillMultiplier,
    damage: row.damageSummary,
    summary: compactStaticBuildResolveSummary(row.summary),
    resolvedBuckets: compactStaticBuildResolvedBuckets(row.resolvedBuckets),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      row.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      row.sourceNoteSummary,
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      row.requirementSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      row.assumptionSummary,
    ),
    caveatSummary: compactStaticBuildCaveatSummary(row.caveatSummary),
    ...(includeDetails
      ? {
          assumptions: row.assumptions,
          unsupportedEffects: row.unsupportedEffects,
          diagnostics: row.diagnostics?.map((entry) =>
            compactStaticBuildDiagnosticEntry(entry),
          ),
          sourceNotes: row.sourceNotes?.map((entry) =>
            compactStaticBuildSourceNoteEntry(entry),
          ),
          ...(row.build
            ? { build: compactStaticBuildResult(row.build, true) }
            : {}),
        }
      : {}),
  }
}

export function compactStaticBuildSkillMatrixRowMeta(
  metadata: StaticBuildSkillMatrixRowMeta,
): CompactStaticBuildSkillMatrixRowMeta {
  return {
    order: metadata.order,
    actionName: metadata.actionName,
    skillName: metadata.skillName,
    qualifiers: [...metadata.qualifiers],
    canonicalLabel: metadata.canonicalLabel,
    stableKey: metadata.stableKey,
    templateSource: metadata.templateSource,
    sourceSkillTypeId: metadata.sourceSkillTypeId,
    sourceStatId: metadata.sourceStatId,
    sourceStatName: metadata.sourceStatName,
    sourceOccurrence: metadata.sourceOccurrence,
    attributeSource: metadata.attributeSource,
    templateCombatTags: [...metadata.templateCombatTags],
    entryType: metadata.entryType,
    aggregationType: metadata.aggregationType,
    isAdditionalDamage: metadata.isAdditionalDamage,
    variantAxis: metadata.variantAxis,
    segmentLabel: metadata.segmentLabel,
    segmentIndex: metadata.segmentIndex,
    targetSize: metadata.targetSize,
  }
}

export function compactStaticBuildTriggerMatrixResult(
  matrix: ResolveStaticBuildTriggerMatrixResult,
  includeDetails = false,
): CompactStaticBuildTriggerMatrixResult {
  return {
    profile: compactStaticBuildProfile(matrix.profile),
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: compactStaticBuildLoadout(matrix.loadout),
    summary: compactStaticBuildTriggerMatrixSummary(matrix.summary),
    effectSummary: matrix.effectSummary.map((item) =>
      compactStaticBuildAppliedRowEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      matrix.requirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(matrix.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      matrix.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      matrix.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      matrix.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: matrix.assumptions,
        }
      : {}),
    rows: matrix.rows.map((row) =>
      compactStaticBuildTriggerMatrixRow(row, includeDetails),
    ),
  }
}

export function compactStaticBuildTriggerMatrixSummary(
  summary: StaticBuildTriggerMatrixSummary,
): CompactStaticBuildTriggerMatrixSummary {
  return {
    rowCount: summary.rowCount,
    mainFormulaCount: summary.mainFormulaCount,
    sourceViewCount: summary.sourceViewCount,
    supportedCount: summary.supportedCount,
    unsupportedCount: summary.unsupportedCount,
    hasSourceViews: summary.hasSourceViews,
    effectSummary: summary.effectSummary.map((item) =>
      compactStaticBuildAppliedRowEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      summary.requirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(summary.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      summary.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      summary.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      summary.assumptionSummary,
    ),
    groups: summary.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      supportedCount: group.supportedCount,
      unsupportedCount: group.unsupportedCount,
      effectSummary: group.effectSummary.map((item) =>
        compactStaticBuildAppliedRowEffectSummaryItem(item),
      ),
      requirementSummary: compactStaticBuildRequirementSummary(
        group.requirementSummary,
      ),
      caveatSummary: compactStaticBuildEntryCaveatSummary(group.caveatSummary),
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        group.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        group.sourceNoteSummary,
      ),
      assumptionSummary: compactStaticBuildAssumptionSummary(
        group.assumptionSummary,
      ),
    })),
  }
}

export function compactStaticBuildTriggerMatrixRow(
  row: StaticBuildTriggerMatrixRow,
  includeDetails = false,
): StaticBuildCompactTriggerMatrixRow {
  return {
    id: row.id,
    label: row.label,
    supported: row.supported,
    metadata: compactStaticBuildTriggerMatrixRowMeta(row.metadata),
    effectSummary: row.effectSummary.map((item) =>
      compactStaticBuildAppliedRowEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      row.requirementSummary,
    ),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      row.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      row.sourceNoteSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(row.caveatSummary),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      row.assumptionSummary,
    ),
    ...(row.damage
      ? { damage: compactStaticBuildEntryDamageSummary(row.damage) }
      : {}),
    ...(row.summary
      ? {
          summary: compactStaticBuildResolveSummary(row.summary),
        }
      : {}),
    ...(includeDetails
      ? {
          assumptions: row.assumptions,
          requirements: row.requirements?.map((item) =>
            compactStaticBuildSourceDamageViewRequirement(item),
          ),
          diagnostics: row.diagnostics?.map((entry) =>
            compactStaticBuildDiagnosticEntry(entry),
          ),
          sourceNotes: row.sourceNotes?.map((entry) =>
            compactStaticBuildSourceNoteEntry(entry),
          ),
          ...(row.build
            ? { build: compactStaticBuildResult(row.build, true) }
            : {}),
        }
      : {}),
  }
}

export function compactStaticBuildEntryDamageSummary(
  damage: StaticBuildEntryDamage,
): CompactStaticBuildEntryDamageSummary {
  return {
    expected: damage.expected,
    crit: damage.crit,
    noCrit: damage.noCrit,
  }
}

export function compactStaticBuildTriggerMatrixRowMeta(
  metadata: StaticBuildTriggerMatrixRowMeta,
): CompactStaticBuildTriggerMatrixRowMeta {
  return {
    canonicalLabel: metadata.canonicalLabel,
    stableKey: metadata.stableKey,
    entryKind: metadata.entryKind,
    templateSource: metadata.templateSource,
    damageType: metadata.damageType,
    sourceType: metadata.sourceType,
    sourceId: metadata.sourceId,
    sourceStableKey: metadata.sourceStableKey,
    sourceViewId: metadata.sourceViewId,
    sourceViewResolutionMode: metadata.sourceViewResolutionMode,
  }
}

export function compactStaticBuildSourceEntryCollection(
  collection: ResolveStaticBuildSourceEntriesResult,
  includeDetails = false,
): CompactStaticBuildSourceEntryCollection {
  return {
    loadout: compactStaticBuildLoadout(collection.loadout),
    summary: compactStaticBuildSourceEntryCollectionSummary(collection.summary),
    effectSummary: collection.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    sourceDamageRequirementSummary: compactStaticBuildRequirementSummary(
      collection.sourceDamageRequirementSummary,
    ),
    sourceUtilityRequirementSummary: compactStaticBuildRequirementSummary(
      collection.sourceUtilityRequirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(
      collection.caveatSummary,
    ),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      collection.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      collection.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      collection.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: collection.assumptions,
        }
      : {}),
    entries: collection.entries.map((entry) =>
      compactStaticBuildSourceEntry(entry, includeDetails),
    ),
  }
}

export function compactStaticBuildSourceEntryCollectionSummary(
  summary: StaticBuildSourceEntryCollectionSummary,
): CompactStaticBuildSourceEntryCollectionSummary {
  return {
    entryCount: summary.entryCount,
    sourceDamageViewCount: summary.sourceDamageViewCount,
    sourceUtilityViewCount: summary.sourceUtilityViewCount,
    supportedCount: summary.supportedCount,
    unsupportedCount: summary.unsupportedCount,
    isUtilityOnly: summary.isUtilityOnly,
    effectSummary: summary.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    sourceDamageRequirementSummary: compactStaticBuildRequirementSummary(
      summary.sourceDamageRequirementSummary,
    ),
    sourceUtilityRequirementSummary: compactStaticBuildRequirementSummary(
      summary.sourceUtilityRequirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(summary.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      summary.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      summary.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      summary.assumptionSummary,
    ),
    groups: summary.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      supportedCount: group.supportedCount,
      unsupportedCount: group.unsupportedCount,
      effectSummary: group.effectSummary.map((item) =>
        compactStaticBuildAppliedEntryEffectSummaryItem(item),
      ),
      sourceDamageRequirementSummary: compactStaticBuildRequirementSummary(
        group.sourceDamageRequirementSummary,
      ),
      sourceUtilityRequirementSummary: compactStaticBuildRequirementSummary(
        group.sourceUtilityRequirementSummary,
      ),
      caveatSummary: compactStaticBuildEntryCaveatSummary(group.caveatSummary),
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        group.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        group.sourceNoteSummary,
      ),
      assumptionSummary: compactStaticBuildAssumptionSummary(
        group.assumptionSummary,
      ),
    })),
  }
}

export function compactStaticBuildSourceDamageViewsResult(
  views: ResolveStaticBuildSourceDamageViewsResult,
  includeDetails = false,
): CompactStaticBuildSourceDamageViewsResult {
  return {
    mode: views.mode,
    manualBaseMode: views.manualBaseMode,
    loadout: compactStaticBuildLoadout(views.loadout),
    summary: compactStaticBuildSourceDamageViewsSummary(views.summary),
    effectSummary: views.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      views.requirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(views.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      views.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      views.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      views.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: views.assumptions,
        }
      : {}),
    entries: views.entries.map((entry) =>
      compactStaticBuildSourceDamageViewEntry(entry, includeDetails),
    ),
  }
}

export function compactStaticBuildSourceDamageViewsSummary(
  summary: StaticBuildSourceDamageViewSummary,
): CompactStaticBuildSourceDamageViewsSummary {
  return {
    entryCount: summary.entryCount,
    standaloneCount: summary.standaloneCount,
    deltaCount: summary.deltaCount,
    supportedCount: summary.supportedCount,
    unsupportedCount: summary.unsupportedCount,
    effectSummary: summary.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      summary.requirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(summary.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      summary.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      summary.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      summary.assumptionSummary,
    ),
    groups: summary.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      supportedCount: group.supportedCount,
      unsupportedCount: group.unsupportedCount,
      effectSummary: group.effectSummary.map((item) =>
        compactStaticBuildAppliedEntryEffectSummaryItem(item),
      ),
      requirementSummary: compactStaticBuildRequirementSummary(
        group.requirementSummary,
      ),
      caveatSummary: compactStaticBuildEntryCaveatSummary(group.caveatSummary),
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        group.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        group.sourceNoteSummary,
      ),
      assumptionSummary: compactStaticBuildAssumptionSummary(
        group.assumptionSummary,
      ),
    })),
  }
}

export function compactStaticBuildSourceDamageViewEntry(
  entry: StaticBuildSourceDamageViewEntry,
  includeDetails = false,
): StaticBuildCompactSourceDamageViewEntry {
  return {
    id: entry.id,
    label: entry.label,
    metadata: compactStaticBuildSourceDamageViewMeta(entry.metadata),
    supported: entry.supported,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    damageType: entry.damageType,
    resolutionMode: entry.resolutionMode,
    requirementSummary: compactStaticBuildRequirementSummary(
      entry.requirementSummary,
    ),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      entry.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      entry.sourceNoteSummary,
    ),
    effectSummary: entry.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(entry.caveatSummary),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      entry.assumptionSummary,
    ),
    ...(entry.damage
      ? { damage: compactStaticBuildEntryDamageSummary(entry.damage) }
      : {}),
    ...(entry.summary
      ? {
          summary: compactStaticBuildResolveSummary(entry.summary),
        }
      : {}),
    ...(includeDetails
      ? {
          assumptions: entry.assumptions,
          requirements: entry.requirements?.map((item) =>
            compactStaticBuildSourceDamageViewRequirement(item),
          ),
          diagnostics: entry.diagnostics?.map((item) =>
            compactStaticBuildDiagnosticEntry(item),
          ),
          sourceNotes: entry.sourceNotes?.map((item) =>
            compactStaticBuildSourceNoteEntry(item),
          ),
          ...(entry.build
            ? { build: compactStaticBuildResult(entry.build, true) }
            : {}),
        }
      : {}),
  }
}

export function compactStaticBuildSourceDamageViewMeta(
  metadata: StaticBuildSourceDamageViewMeta,
): CompactStaticBuildSourceDamageViewMeta {
  return {
    canonicalLabel: metadata.canonicalLabel,
    stableKey: metadata.stableKey,
    entryKind: metadata.entryKind,
    damageType: metadata.damageType,
    resolutionMode: metadata.resolutionMode,
  }
}

export function compactStaticBuildSourceUtilityViewsResult(
  views: ResolveStaticBuildSourceUtilityViewsResult,
  includeDetails = false,
): CompactStaticBuildSourceUtilityViewsResult {
  return {
    loadout: compactStaticBuildLoadout(views.loadout),
    summary: compactStaticBuildSourceUtilityViewsSummary(views.summary),
    effectSummary: views.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      views.requirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(views.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      views.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      views.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      views.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: views.assumptions,
        }
      : {}),
    entries: views.entries.map((entry) =>
      compactStaticBuildSourceUtilityViewEntry(entry, includeDetails),
    ),
  }
}

export function compactStaticBuildSourceUtilityViewsSummary(
  summary: StaticBuildSourceUtilityViewSummary,
): CompactStaticBuildSourceUtilityViewsSummary {
  return {
    entryCount: summary.entryCount,
    triggerCount: summary.triggerCount,
    rateCount: summary.rateCount,
    supportedCount: summary.supportedCount,
    unsupportedCount: summary.unsupportedCount,
    effectSummary: summary.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    requirementSummary: compactStaticBuildRequirementSummary(
      summary.requirementSummary,
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(summary.caveatSummary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      summary.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      summary.sourceNoteSummary,
    ),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      summary.assumptionSummary,
    ),
    groups: summary.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      supportedCount: group.supportedCount,
      unsupportedCount: group.unsupportedCount,
      effectSummary: group.effectSummary.map((item) =>
        compactStaticBuildAppliedEntryEffectSummaryItem(item),
      ),
      requirementSummary: compactStaticBuildRequirementSummary(
        group.requirementSummary,
      ),
      caveatSummary: compactStaticBuildEntryCaveatSummary(group.caveatSummary),
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        group.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        group.sourceNoteSummary,
      ),
      assumptionSummary: compactStaticBuildAssumptionSummary(
        group.assumptionSummary,
      ),
    })),
  }
}

export function compactStaticBuildSourceUtilityViewEntrySummary(
  summary: StaticBuildSourceUtilityViewEntrySummary,
): CompactStaticBuildSourceUtilityViewEntrySummary {
  return {
    value: summary.value,
    unit: summary.unit,
    resolutionMode: summary.resolutionMode,
    targetScope: summary.targetScope,
    requirementCount: summary.requirementCount,
    hasUnsatisfiedRequirements: summary.hasUnsatisfiedRequirements,
    diagnosticCount: summary.diagnosticCount,
    sourceNoteCount: summary.sourceNoteCount,
    assumptionCount: summary.assumptionCount,
    hasUnsupported: summary.hasUnsupported,
  }
}

export function compactStaticBuildSourceUtilityViewEntry(
  entry: StaticBuildSourceUtilityViewEntry,
  includeDetails = false,
): StaticBuildCompactSourceUtilityViewEntry {
  return {
    id: entry.id,
    label: entry.label,
    metadata: compactStaticBuildSourceUtilityViewMeta(entry.metadata),
    supported: entry.supported,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    utilityType: entry.utilityType,
    resolutionMode: entry.resolutionMode,
    targetScope: entry.targetScope,
    requirementSummary: compactStaticBuildRequirementSummary(
      entry.requirementSummary,
    ),
    value: entry.value,
    unit: entry.unit,
    triggerLabel: entry.triggerLabel,
    conditionLabel: entry.conditionLabel,
    cooldownSeconds: entry.cooldownSeconds,
    summary: compactStaticBuildSourceUtilityViewEntrySummary(entry.summary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      entry.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      entry.sourceNoteSummary,
    ),
    effectSummary: entry.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(entry.caveatSummary),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      entry.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: entry.assumptions,
          requirements: entry.requirements?.map((item) =>
            compactStaticBuildSourceUtilityViewRequirement(item),
          ),
          diagnostics: entry.diagnostics?.map((item) =>
            compactStaticBuildDiagnosticEntry(item),
          ),
          sourceNotes: entry.sourceNotes?.map((item) =>
            compactStaticBuildSourceNoteEntry(item),
          ),
        }
      : {}),
  }
}

export function compactStaticBuildSourceUtilityViewMeta(
  metadata: StaticBuildSourceUtilityViewMeta,
): CompactStaticBuildSourceUtilityViewMeta {
  return {
    canonicalLabel: metadata.canonicalLabel,
    stableKey: metadata.stableKey,
    entryKind: metadata.entryKind,
    utilityType: metadata.utilityType,
    resolutionMode: metadata.resolutionMode,
    targetScope: metadata.targetScope,
    unit: metadata.unit,
  }
}

export function compactStaticBuildSourceEntry(
  entry: StaticBuildSourceEntry,
  includeDetails = false,
): StaticBuildCompactSourceEntry {
  if (entry.metadata.entryKind === "source-damage-view") {
    return {
      id: entry.id,
      label: entry.label,
      metadata: entry.metadata,
      supported: entry.supported,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      damageType: entry.damageType,
      resolutionMode: entry.resolutionMode,
      requirementSummary: compactStaticBuildRequirementSummary(
        entry.requirementSummary,
      ),
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        entry.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        entry.sourceNoteSummary,
      ),
      effectSummary: entry.effectSummary.map((item) =>
        compactStaticBuildAppliedEntryEffectSummaryItem(item),
      ),
      caveatSummary: compactStaticBuildEntryCaveatSummary(entry.caveatSummary),
      assumptionSummary: compactStaticBuildAssumptionSummary(
        entry.assumptionSummary,
      ),
      damage: entry.damage,
      ...(entry.summary
        ? {
            summary: compactStaticBuildResolveSummary(entry.summary),
          }
        : {}),
      ...(includeDetails
        ? {
            assumptions: entry.assumptions,
            requirements: entry.requirements?.map((item) =>
              compactStaticBuildSourceDamageViewRequirement(item),
            ),
            diagnostics: entry.diagnostics?.map((item) =>
              compactStaticBuildDiagnosticEntry(item),
            ),
            sourceNotes: entry.sourceNotes?.map((item) =>
              compactStaticBuildSourceNoteEntry(item),
            ),
            ...(entry.build ? { build: entry.build } : {}),
          }
        : {}),
    }
  }

  return {
    id: entry.id,
    label: entry.label,
    metadata: entry.metadata,
    supported: entry.supported,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    utilityType: entry.utilityType,
    resolutionMode: entry.resolutionMode,
    targetScope: entry.targetScope,
    requirementSummary: compactStaticBuildRequirementSummary(
      entry.requirementSummary,
    ),
    value: entry.value,
    unit: entry.unit,
    triggerLabel: entry.triggerLabel,
    conditionLabel: entry.conditionLabel,
    cooldownSeconds: entry.cooldownSeconds,
    summary: compactStaticBuildSourceUtilityViewEntrySummary(entry.summary),
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      entry.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      entry.sourceNoteSummary,
    ),
    effectSummary: entry.effectSummary.map((item) =>
      compactStaticBuildAppliedEntryEffectSummaryItem(item),
    ),
    caveatSummary: compactStaticBuildEntryCaveatSummary(entry.caveatSummary),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      entry.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: entry.assumptions,
          requirements: entry.requirements?.map((item) =>
            compactStaticBuildSourceUtilityViewRequirement(item),
          ),
          diagnostics: entry.diagnostics?.map((item) =>
            compactStaticBuildDiagnosticEntry(item),
          ),
          sourceNotes: entry.sourceNotes?.map((item) =>
            compactStaticBuildSourceNoteEntry(item),
          ),
        }
      : {}),
  }
}

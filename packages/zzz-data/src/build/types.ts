import type {
  AnomalyDamageParams,
  AnomalyType,
  DamageResult,
  DisorderDamageParams,
  NormalDamageParams,
  SheerDamageParams,
} from "../calculator/types.js"
import type {
  AgentAttribute,
  AgentAttributeLabel,
  AgentSpecialty,
} from "../terms.js"

export type StaticBuildMode = "baseline" | "full-buff" | "manual"
export type StaticBuildBaseMode = Exclude<StaticBuildMode, "manual">
export type StaticBuildDamageType = "normal" | "sheer" | "anomaly" | "disorder"
export type StaticBuildSourceType = "agent" | "w-engine" | "drive-disc"
export type StaticBuildEffectId = string
export type StaticBuildSourceName = string
export type StaticBuildEffectLabel = string
export type StaticBuildEffectSummaryBucket = string
export type StaticBuildEffectSummaryValue = string
export type StaticBuildEffectSummaryCondition = string
export type StaticBuildGroupLabel = string
export type StaticBuildDisplayName = string
export type StaticBuildTraceReason = string
export type StaticBuildTriggerLabel = string
export type StaticBuildConditionLabel = string
export type StaticBuildBaseDamageStat = "attack" | "sheerForce"
export type StaticBuildSpecialty = AgentSpecialty

export type StaticBuildSkillTag =
  | "basic"
  | "dash"
  | "special"
  | "enhancedSpecial"
  | "chain"
  | "ultimate"
  | "assist"

export type StaticBuildSkillMatrixEntryType =
  | "hit"
  | "total"
  | "extra"
  | "variant"
  | "size-variant"

export type StaticBuildTargetSize = "small" | "medium" | "large"

export type StaticBuildSkillMatrixAggregationType = "per-hit" | "whole-entry"

export type StaticBuildSkillMatrixVariantAxis =
  | "segment"
  | "target-size"
  | "condition"

export type StaticBuildSkillMatrixTemplateSource = "curated" | "generated"

export type StaticBuildSkillMatrixAttributeSource =
  | "agent-default"
  | "context"
  | "template"

export type StaticBuildSkillQualifier = string
export type StaticBuildSkillQualifierList = StaticBuildSkillQualifier[]

export type StaticBuildBucket =
  | "attackPercent"
  | "flatAttack"
  | "bonusDamageSum"
  | "critRate"
  | "critDamage"
  | "defenseReduction"
  | "penetrationRate"
  | "penetrationValue"
  | "resistanceReduction"
  | "ignoreResistance"
  | "vulnerabilityBonus"
  | "damageReduction"
  | "stunVulnerability"
  | "nonStunVulnerability"
  | "sheerBonusSum"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "anomalyBonusDamageSum"
  | "anomalyCritRate"
  | "anomalyCritDamage"
  | "skillMultiplierFactor"

export type StaticBuildDynamicFlagKey = "ariaDreamtime" | "burniceEmberState"

export type StaticBuildDynamicCountKey = "burniceEmberExtraTriggers"

export type StaticBuildDynamicValueKey =
  | "ariaExflowDamageRatio"
  | "ariaStunnedDamageRatio"
  | "burniceEmberDamageRatio"

export type StaticBuildStateFlagKey =
  | "alicePolarityAssaultState"
  | "miyabiFrostburnBreakState"

export type StaticBuildStateValueKey =
  | "alicePolarityAssaultDamageRatio"
  | "miyabiFrostburnBreakDamageRatio"

export type StaticBuildResolvedSnapshotBucketKey =
  | "bonusDamageSum"
  | "defenseReduction"
  | "penetrationRate"
  | "resistanceReduction"
  | "ignoreResistance"
  | "sheerBonusSum"
  | "anomalyProficiency"
  | "anomalyBonusDamageSum"
  | "anomalyCritRate"
  | "anomalyCritDamage"

export type StaticBuildResolvedSnapshotMultiplierKey = "skillMultiplierFactor"
export type StaticBuildDriveDiscPieces = 2 | 4
export type StaticBuildAgentLevel = number
export type StaticBuildAgentMindscape = number
export type StaticBuildCoreSkillLevel = number
export type StaticBuildWEngineRefinement = number
export type StaticBuildAttackerLevelBase = number
export type StaticBuildEnergyGenerationRate = number
export type StaticBuildAnomalyMastery = number
export type StaticBuildAttack = number
export type StaticBuildBaseAttack = number
export type StaticBuildAttackPercent = number
export type StaticBuildFlatAttack = number
export type StaticBuildBonusDamageSum = number
export type StaticBuildCritRate = number
export type StaticBuildCritDamage = number
export type StaticBuildHP = number
export type StaticBuildSheerForce = number
export type StaticBuildSheerBonusSum = number
export type StaticBuildAnomalyProficiency = number
export type StaticBuildAnomalyCritRate = number
export type StaticBuildAnomalyCritDamage = number
export type StaticBuildAnomalyBonusDamageSum = number
export type StaticBuildPenetrationRate = number
export type StaticBuildPenetrationValue = number
export type StaticBuildSkillMultiplierFactor = number
export type StaticBuildModifierValue = number
export type StaticBuildBaseDamageValue = number
export type StaticBuildBaseDamage = number
export type StaticBuildExpectedTotal = number
export type StaticBuildCriticalTotal = number
export type StaticBuildNonCriticalTotal = number
export type StaticBuildDamageResultTotal = number
export type StaticBuildDiagnosticCount = number
export type StaticBuildSourceNoteCount = number
export type StaticBuildAssumptionCount = number
export type StaticBuildUnsupportedEffectCount = number
export type StaticBuildRequirementCount = number
export type StaticBuildSatisfiedRequirementCount = number
export type StaticBuildUnsatisfiedRequirementCount = number
export type StaticBuildGroupCount = number
export type StaticBuildSupportedCount = number
export type StaticBuildUnsupportedCount = number
export type StaticBuildEntryCount = number
export type StaticBuildStandaloneCount = number
export type StaticBuildDeltaCount = number
export type StaticBuildTriggerCount = number
export type StaticBuildRateCount = number
export type StaticBuildSourceDamageViewCount = number
export type StaticBuildSourceUtilityViewCount = number
export type StaticBuildRowCount = number
export type StaticBuildMainFormulaCount = number
export type StaticBuildSourceViewCount = number
export type StaticBuildAppliedEntryCount = number
export type StaticBuildTotalEntryCount = number
export type StaticBuildAppliedRowCount = number
export type StaticBuildTotalRowCount = number
export type StaticBuildStackCount = number
export type StaticBuildVirtualAgentLevel = number
export type StaticBuildVirtualAgentAttack = number
export type StaticBuildVirtualAgentAnomalyProficiency = number
export type StaticBuildDamageMultiplier = number
export type StaticBuildDamageMultiplierFactor = number
export type StaticBuildBonusMultiplier = number
export type StaticBuildCritMultiplier = number
export type StaticBuildDefenseMultiplier = number
export type StaticBuildResistanceMultiplier = number
export type StaticBuildVulnerabilityMultiplier = number
export type StaticBuildDazeVulnerabilityMultiplier = number
export type StaticBuildSheerBonusMultiplier = number
export type StaticBuildAnomalyProficiencyMultiplier = number
export type StaticBuildDamageLevelMultiplier = number
export type StaticBuildAnomalyBonusMultiplier = number
export type StaticBuildAnomalyCritMultiplier = number
export type StaticBuildOrder = number
export type StaticBuildSourceSkillTypeId = number
export type StaticBuildSourceOccurrence = number
export type StaticBuildSegmentIndex = number
export type StaticBuildUtilityValue = number
export type StaticBuildCooldownSeconds = number
export type StaticBuildBucketKey = string
export type StaticBuildFormulaMultiplierKey = string
export type StaticBuildBucketValueMap = Record<
  StaticBuildBucketKey,
  StaticBuildModifierValue
>
export type StaticBuildFormulaMultiplierMap = Record<
  StaticBuildFormulaMultiplierKey,
  StaticBuildModifierValue
>
export type StaticBuildVariableBucketList = StaticBuildBucketKey[]
export type StaticBuildVariableFormulaMultiplierList =
  StaticBuildFormulaMultiplierKey[]
export type StaticBuildAssumptionText = string
export type StaticBuildUnsupportedEffectText = string
export type StaticBuildCombatTag = string
export type StaticBuildAlias = string
export type StaticBuildSourceNoteKey = string
export type StaticBuildDynamicCountMap = Partial<
  Record<StaticBuildDynamicCountKey, StaticBuildStackCount>
>
export type StaticBuildDynamicValueMap = Partial<
  Record<StaticBuildDynamicValueKey, StaticBuildModifierValue>
>
export type StaticBuildStateValueMap = Partial<
  Record<StaticBuildStateValueKey, StaticBuildModifierValue>
>
export type StaticBuildResolvedSnapshotBucketDeltaMap = Partial<
  Record<StaticBuildResolvedSnapshotBucketKey, StaticBuildModifierValue>
>
export type StaticBuildResolvedSnapshotMultiplierFactorMap = Partial<
  Record<StaticBuildResolvedSnapshotMultiplierKey, StaticBuildModifierValue>
>
export type StaticBuildAssumptionList = StaticBuildAssumptionText[]
export type StaticBuildUnsupportedEffectList =
  StaticBuildUnsupportedEffectText[]
export type StaticBuildCombatTagList = StaticBuildCombatTag[]
export type StaticBuildAliasList = StaticBuildAlias[]
export type StaticBuildSourceNoteKeyList = StaticBuildSourceNoteKey[]
export type StaticBuildDefenderBaseDefense = number
export type StaticBuildDefenderResistance = number
export type StaticBuildDefenseBonus = number
export type StaticBuildDefenseReduction = number
export type StaticBuildResistanceReduction = number
export type StaticBuildIgnoreResistance = number
export type StaticBuildVulnerabilityBonus = number
export type StaticBuildDamageReduction = number
export type StaticBuildStunVulnerability = number
export type StaticBuildNonStunVulnerability = number
export type StaticBuildSpecialMultiplier = number
export type StaticBuildResolvedAnomalyProficiency = number
export type StaticBuildRemainingTime = number
export type StaticBuildSkillMultiplierInputValue = number | string
export type StaticBuildDamageMultiplierInputValue = number | string
export type StaticBuildEffectStacks = StaticBuildStackCount

export interface StaticBuildDynamicSnapshotInput {
  flags?: Partial<Record<StaticBuildDynamicFlagKey, boolean>>
  counts?: StaticBuildDynamicCountMap
  values?: StaticBuildDynamicValueMap
}

export interface StaticBuildStateSnapshotInput {
  flags?: Partial<Record<StaticBuildStateFlagKey, boolean>>
  values?: StaticBuildStateValueMap
}

export interface StaticBuildResolvedSnapshotInput {
  bucketDeltas?: StaticBuildResolvedSnapshotBucketDeltaMap
  multiplierFactors?: StaticBuildResolvedSnapshotMultiplierFactorMap
}

export interface StaticBuildDriveDiscSetInput {
  id: StaticBuildCatalogId
  pieces: StaticBuildDriveDiscPieces
}

export type StaticBuildDriveDiscSetsInput =
  | StaticBuildDriveDiscSetInput[]
  | undefined

export interface StaticBuildLoadoutInput {
  agentId: StaticBuildCatalogId
  wEngineId?: StaticBuildCatalogId
  driveDiscSets?: StaticBuildDriveDiscSetsInput
  agentLevel?: StaticBuildAgentLevel
  agentMindscape?: StaticBuildAgentMindscape
  coreSkillLevel?: StaticBuildCoreSkillLevel
  wEngineRefinement?: StaticBuildWEngineRefinement
}

export interface StaticBuildFinalPanelInput {
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

export interface StaticBuildEnemyInput {
  attackerLevel?: StaticBuildAgentLevel
  defenderBaseDefense: StaticBuildDefenderBaseDefense
  defenderResistance: StaticBuildDefenderResistance
  defenseBonus?: StaticBuildDefenseBonus
  defenseReduction?: StaticBuildDefenseReduction
  resistanceReduction?: StaticBuildResistanceReduction
  ignoreResistance?: StaticBuildIgnoreResistance
  vulnerabilityBonus?: StaticBuildVulnerabilityBonus
  damageReduction?: StaticBuildDamageReduction
  isStunned?: boolean
  stunVulnerability?: StaticBuildStunVulnerability
  nonStunVulnerability?: StaticBuildNonStunVulnerability
  specialMultiplier?: StaticBuildSpecialMultiplier
}

interface StaticBuildScenarioBaseInput {
  attribute?: AgentAttributeLabel
  extraAbilityActive?: boolean
  combatTags?: StaticBuildCombatTagList
  dynamicSnapshot?: StaticBuildDynamicSnapshotInput
  stateSnapshot?: StaticBuildStateSnapshotInput
  resolvedSnapshot?: StaticBuildResolvedSnapshotInput
  enemy: StaticBuildEnemyInput
}

interface StaticBuildSkillMultiplierScenarioInput extends StaticBuildScenarioBaseInput {
  skillTag: StaticBuildSkillTag
  skillMultiplier: StaticBuildSkillMultiplierInputValue
}

export interface StaticBuildNormalScenarioInput extends StaticBuildSkillMultiplierScenarioInput {
  damageType: "normal"
}

export interface StaticBuildSheerScenarioInput extends StaticBuildSkillMultiplierScenarioInput {
  damageType: "sheer"
}

export interface StaticBuildAnomalyScenarioInput extends StaticBuildScenarioBaseInput {
  damageType: "anomaly"
  skillTag: StaticBuildSkillTag
  damageMultiplier: StaticBuildDamageMultiplierInputValue
}

export interface StaticBuildDisorderScenarioInput extends StaticBuildScenarioBaseInput {
  damageType: "disorder"
  skillTag: StaticBuildSkillTag
  anomalyType: AnomalyType
  remainingTime: StaticBuildRemainingTime
}

export type StaticBuildScenarioInput =
  | StaticBuildNormalScenarioInput
  | StaticBuildSheerScenarioInput
  | StaticBuildAnomalyScenarioInput
  | StaticBuildDisorderScenarioInput

export interface StaticBuildEffectOverride {
  effectId: StaticBuildEffectId
  enabled?: boolean
  stacks?: StaticBuildEffectStacks
}

export interface ResolveStaticBuildInput {
  mode?: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildLoadoutInput
  panel: StaticBuildFinalPanelInput
  scenario: StaticBuildScenarioInput
  effectOverrides?: StaticBuildEffectOverride[]
}

export interface StaticBuildSkillMatrixContextInput {
  attribute?: AgentAttributeLabel
  extraAbilityActive?: boolean
  combatTags?: StaticBuildCombatTagList
  enemy: StaticBuildEnemyInput
}

export interface ResolveStaticBuildSkillMatrixInput {
  mode?: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildLoadoutInput
  panel: StaticBuildFinalPanelInput
  context: StaticBuildSkillMatrixContextInput
  effectOverrides?: StaticBuildEffectOverride[]
}

export type StaticBuildCatalogId = string

export interface StaticBuildCatalogEntry {
  id: StaticBuildCatalogId
  name: StaticBuildDisplayName
  aliases: StaticBuildAliasList
}

export interface StaticBuildBaseAgentCatalogEntry extends StaticBuildCatalogEntry {
  specialty: StaticBuildSpecialty
  defaultAttribute: AgentAttribute
}

export interface StaticBuildAgentCatalogEntry extends StaticBuildBaseAgentCatalogEntry {
  defaultDamageType: StaticBuildDamageType
  profileId: StaticBuildProfileId
}

export type StaticBuildUtilityAgentCatalogEntry =
  StaticBuildBaseAgentCatalogEntry

export interface StaticBuildWEngineCatalogEntry extends StaticBuildCatalogEntry {
  specialty: StaticBuildSpecialty
}

export type StaticBuildProfileId =
  | "standard-normal"
  | "standard-sheer"
  | "standard-anomaly"
  | "standard-disorder"
  | "yixuan-sheer"

export interface StaticBuildEffectCondition {
  damageTypes?: StaticBuildDamageType[]
  skillTags?: StaticBuildSkillTag[]
  attributes?: AgentAttribute[]
  disorderSourceTypes?: AnomalyType[]
  minimumMindscape?: StaticBuildAgentMindscape
  requireExtraAbility?: boolean
  requireStunned?: boolean
  combatTags?: StaticBuildCombatTagList
  dynamicSnapshotFlags?: StaticBuildDynamicFlagKey[]
  stateSnapshotFlags?: StaticBuildStateFlagKey[]
  requiredDynamicCounts?: StaticBuildDynamicCountKey[]
  requiredDynamicValues?: StaticBuildDynamicValueKey[]
  requiredStateValues?: StaticBuildStateValueKey[]
  minimumDynamicCounts?: StaticBuildDynamicCountMap
  minimumDynamicValues?: StaticBuildDynamicValueMap
  minimumStateValues?: StaticBuildStateValueMap
  minimumResolvedCritRate?: StaticBuildCritRate
  minimumResolvedAnomalyProficiency?: StaticBuildResolvedAnomalyProficiency
}

export interface StaticBuildValueContext {
  agentMindscape: StaticBuildAgentMindscape
  coreSkillLevel: StaticBuildCoreSkillLevel
  wEngineRefinement: StaticBuildWEngineRefinement
  energyGenerationRate?: StaticBuildEnergyGenerationRate
  anomalyMastery?: StaticBuildAnomalyMastery
  resolvedAnomalyProficiency?: StaticBuildResolvedAnomalyProficiency
  remainingTime?: StaticBuildRemainingTime
  dynamicSnapshot?: StaticBuildDynamicSnapshotInput
  stateSnapshot?: StaticBuildStateSnapshotInput
}

export interface StaticBuildModifierDefinition {
  bucket: StaticBuildBucket
  combine?: "sum" | "multiply"
  value: (context: StaticBuildValueContext) => number
}

export type StaticBuildSourceId = string

export interface StaticBuildEffectDefinition {
  id: StaticBuildEffectId
  sourceType: StaticBuildSourceType
  sourceId: StaticBuildSourceId
  sourceName: StaticBuildSourceName
  label: StaticBuildEffectLabel
  alreadyInPanel?: boolean
  maxStacks?: StaticBuildEffectStacks
  baselineEnabled?: boolean
  fullBuffEnabled?: boolean
  baselineStacks?: StaticBuildEffectStacks
  fullBuffStacks?: StaticBuildEffectStacks
  condition?: StaticBuildEffectCondition
  modifiers: StaticBuildModifierDefinition[]
}

export interface StaticBuildResolvedBuckets {
  attackPercent: StaticBuildAttackPercent
  flatAttack: StaticBuildFlatAttack
  bonusDamageSum: StaticBuildBonusDamageSum
  critRate: StaticBuildCritRate
  critDamage: StaticBuildCritDamage
  defenseReduction: StaticBuildDefenseReduction
  penetrationRate: StaticBuildPenetrationRate
  penetrationValue: StaticBuildPenetrationValue
  resistanceReduction: StaticBuildResistanceReduction
  ignoreResistance: StaticBuildIgnoreResistance
  vulnerabilityBonus: StaticBuildVulnerabilityBonus
  damageReduction: StaticBuildDamageReduction
  stunVulnerability: StaticBuildStunVulnerability
  nonStunVulnerability: StaticBuildNonStunVulnerability
  sheerBonusSum: StaticBuildSheerBonusSum
  anomalyMastery: StaticBuildAnomalyMastery
  anomalyProficiency: StaticBuildAnomalyProficiency
  anomalyBonusDamageSum: StaticBuildAnomalyBonusDamageSum
  anomalyCritRate: StaticBuildAnomalyCritRate
  anomalyCritDamage: StaticBuildAnomalyCritDamage
  skillMultiplierFactor: StaticBuildSkillMultiplierFactor
}

export interface StaticBuildResolvedPanel {
  attack: StaticBuildAttack
  baseAttack?: StaticBuildBaseAttack
  agentLevel: StaticBuildAgentLevel
  critRate: StaticBuildCritRate
  critDamage: StaticBuildCritDamage
  hp?: StaticBuildHP
  sheerForce?: StaticBuildSheerForce
  energyGenerationRate?: StaticBuildEnergyGenerationRate
  anomalyProficiency: StaticBuildAnomalyProficiency
  anomalyMastery?: StaticBuildAnomalyMastery
  anomalyCritRate: StaticBuildAnomalyCritRate
  anomalyCritDamage: StaticBuildAnomalyCritDamage
  penetrationRate: StaticBuildPenetrationRate
  penetrationValue: StaticBuildPenetrationValue
  baseDamageStat: StaticBuildBaseDamageStat
  baseDamageValue: StaticBuildBaseDamageValue
}

export interface StaticBuildTraceModifier {
  bucket: StaticBuildBucket
  value: StaticBuildModifierValue
  combine: "sum" | "multiply"
}

export interface StaticBuildTraceItem {
  effectId: StaticBuildEffectId
  sourceType: StaticBuildSourceType
  sourceName: StaticBuildSourceName
  label: StaticBuildEffectLabel
  status: "applied" | "skipped" | "unsupported"
  reason?: StaticBuildTraceReason
  stacks?: StaticBuildEffectStacks
  modifiers?: StaticBuildTraceModifier[]
}

export interface StaticBuildProfileResult {
  id: StaticBuildProfileId
  name: StaticBuildDisplayName
}

export interface StaticBuildResolvedLoadout {
  agent: StaticBuildAgentCatalogEntry | StaticBuildUtilityAgentCatalogEntry
  wEngine?: StaticBuildWEngineCatalogEntry
  driveDiscSets: Array<
    StaticBuildCatalogEntry & {
      pieces: StaticBuildDriveDiscPieces
    }
  >
  agentLevel: StaticBuildAgentLevel
  agentMindscape: StaticBuildAgentMindscape
  coreSkillLevel: StaticBuildCoreSkillLevel
  wEngineRefinement: StaticBuildWEngineRefinement
}

export type StaticBuildSourceNoteOwner =
  | "finalPanel"
  | "dynamicSnapshot"
  | "stateSnapshot"
  | "resolvedSnapshot"
  | "sourceView"
  | "process"

export type StaticBuildSourceNoteStatus =
  | "missing-input"
  | "resolved"
  | "process-only"
  | "research-only"

export type StaticBuildSourceNoteGuidanceKind =
  | "provide-input"
  | "input-applied"
  | "keep-process-only"
  | "keep-research-only"

export type StaticBuildSourceNoteGuidanceTarget = Exclude<
  StaticBuildSourceNoteOwner,
  "sourceView" | "process"
>

export interface StaticBuildSourceNoteGuidance {
  kind: StaticBuildSourceNoteGuidanceKind
  target?: StaticBuildSourceNoteGuidanceTarget
}

export type StaticBuildSourceNoteMessage = string
export type StaticBuildEntryId = string
export type StaticBuildRowId = string

export interface StaticBuildSourceNoteEntry {
  id: StaticBuildEntryId
  sourceType: StaticBuildSourceType
  sourceId: StaticBuildSourceId
  owner: StaticBuildSourceNoteOwner
  status: StaticBuildSourceNoteStatus
  guidance: StaticBuildSourceNoteGuidance
  keys: StaticBuildSourceNoteKeyList
  message: StaticBuildSourceNoteMessage
}

export type StaticBuildDiagnosticKind =
  | "defaulted-input"
  | "coverage-gap"
  | "unsupported-effect"
  | "fallback"

export type StaticBuildDiagnosticOwner =
  | "loadout"
  | "finalPanel"
  | "scenario"
  | "source"
  | "process"

export type StaticBuildDiagnosticKey = string
export type StaticBuildDiagnosticKeyList = StaticBuildDiagnosticKey[]

export type StaticBuildDiagnosticMessage = string

export interface StaticBuildDiagnosticEntry {
  kind: StaticBuildDiagnosticKind
  owner: StaticBuildDiagnosticOwner
  sourceType?: StaticBuildSourceType
  sourceId?: StaticBuildSourceId
  keys: StaticBuildDiagnosticKeyList
  message: StaticBuildDiagnosticMessage
}

export interface StaticBuildDiagnosticGroupSummary {
  key: StaticBuildDiagnosticKind
  label: StaticBuildGroupLabel
  count: StaticBuildDiagnosticCount
}

export interface StaticBuildDiagnosticOwnerGroupSummary {
  key: StaticBuildDiagnosticOwner
  count: StaticBuildDiagnosticCount
}

export interface StaticBuildDiagnosticSummary {
  count: StaticBuildDiagnosticCount
  hasDiagnostics: boolean
  hasDefaultedInput: boolean
  hasCoverageGap: boolean
  hasUnsupportedEffect: boolean
  hasFallback: boolean
  kindGroups: StaticBuildDiagnosticGroupSummary[]
  ownerGroups: StaticBuildDiagnosticOwnerGroupSummary[]
}

export interface StaticBuildSourceNoteGroupSummary {
  key: StaticBuildSourceNoteStatus
  label: StaticBuildGroupLabel
  count: StaticBuildSourceNoteCount
}

export interface StaticBuildSourceNoteOwnerGroupSummary {
  key: StaticBuildSourceNoteOwner
  count: StaticBuildSourceNoteCount
}

export interface StaticBuildSourceNoteSummary {
  count: StaticBuildSourceNoteCount
  hasSourceNotes: boolean
  hasMissingInput: boolean
  hasProcessOnly: boolean
  hasResearchOnly: boolean
  statusGroups: StaticBuildSourceNoteGroupSummary[]
  ownerGroups: StaticBuildSourceNoteOwnerGroupSummary[]
}

export interface StaticBuildCaveatSummary {
  assumptionCount: StaticBuildAssumptionCount
  unsupportedEffectCount: StaticBuildUnsupportedEffectCount
  hasAssumptions: boolean
  hasUnsupportedEffects: boolean
}

export interface StaticBuildResolveSummary {
  baseDamageStat: StaticBuildBaseDamageStat
  baseDamageValue: StaticBuildBaseDamageValue
  expectedTotal: StaticBuildExpectedTotal
  critTotal: StaticBuildCriticalTotal
  noCritTotal: StaticBuildNonCriticalTotal
  formulaMultipliers: StaticBuildFormulaMultiplierMap
  assumptionCount: StaticBuildAssumptionCount
  diagnosticCount: StaticBuildDiagnosticCount
  sourceNoteCount: StaticBuildSourceNoteCount
  unsupportedEffectCount: StaticBuildUnsupportedEffectCount
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
  diagnosticGroups: StaticBuildDiagnosticGroupSummary[]
  sourceNoteGroups: StaticBuildSourceNoteGroupSummary[]
}

export interface StaticBuildResolveEffectSummaryItem {
  effectId: StaticBuildEffectId
  sourceName: StaticBuildSourceName
  label: StaticBuildEffectLabel
  bucket: StaticBuildEffectSummaryBucket
  value: StaticBuildEffectSummaryValue
}

export interface ResolveStaticBuildResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildResolveSummary
  effectSummary: StaticBuildResolveEffectSummaryItem[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  resolvedPanel: StaticBuildResolvedPanel
  resolvedBuckets: StaticBuildResolvedBuckets
  damageParams:
    | NormalDamageParams
    | SheerDamageParams
    | AnomalyDamageParams
    | DisorderDamageParams
  damage: {
    expected: DamageResult
    crit: DamageResult
    noCrit: DamageResult
  }
  trace: StaticBuildTraceItem[]
  diagnostics: StaticBuildDiagnosticEntry[]
  sourceNotes: StaticBuildSourceNoteEntry[]
  assumptions: StaticBuildAssumptionList
  unsupportedEffects: StaticBuildUnsupportedEffectList
}

export type StaticBuildSourceDamageViewRequirementKind =
  | "combat-tag"
  | "panel-value"
  | "scenario-value"
  | "dynamic-flag"
  | "dynamic-count"
  | "dynamic-value"
  | "state-flag"
  | "state-value"
  | "resolved-bucket"
  | "resolved-multiplier"

export interface StaticBuildSourceDamageViewRequirement {
  kind: StaticBuildSourceDamageViewRequirementKind
  key: StaticBuildRequirementKey
  satisfied: boolean
}

export interface StaticBuildEntryDamage {
  expected: StaticBuildExpectedTotal
  crit: StaticBuildCriticalTotal
  noCrit: StaticBuildNonCriticalTotal
}

export type StaticBuildRequirementKey = string

export interface StaticBuildRequirementSummaryGroup<
  TKey extends StaticBuildRequirementKey = StaticBuildRequirementKey,
> {
  key: TKey
  count: StaticBuildRequirementCount
  satisfiedCount: StaticBuildSatisfiedRequirementCount
  unsatisfiedCount: StaticBuildUnsatisfiedRequirementCount
}

export interface StaticBuildRequirementSummary<
  TKey extends StaticBuildRequirementKey = StaticBuildRequirementKey,
> {
  count: StaticBuildRequirementCount
  satisfiedCount: StaticBuildSatisfiedRequirementCount
  unsatisfiedCount: StaticBuildUnsatisfiedRequirementCount
  hasUnsatisfied: boolean
  groups: StaticBuildRequirementSummaryGroup<TKey>[]
}

export interface StaticBuildAssumptionSummary {
  count: StaticBuildAssumptionCount
  hasAssumptions: boolean
}

export type StaticBuildSourceDamageViewRequirementSummary =
  StaticBuildRequirementSummary<StaticBuildSourceDamageViewRequirementKind>

export type StaticBuildSourceDamageViewResolutionMode = "standalone" | "delta"
export type StaticBuildEntryLabel = string
export type StaticBuildRowLabel = string
export type StaticBuildCanonicalLabel = string
export type StaticBuildStableKey = string
export type StaticBuildSourceViewId = StaticBuildEntryId

export interface StaticBuildSourceDamageViewMeta {
  canonicalLabel: StaticBuildCanonicalLabel
  stableKey: StaticBuildStableKey
  entryKind: "source-damage-view"
  damageType: Extract<StaticBuildDamageType, "anomaly" | "disorder">
  resolutionMode: StaticBuildSourceDamageViewResolutionMode
}

export interface StaticBuildSourceDamageViewEntry {
  id: StaticBuildEntryId
  label: StaticBuildEntryLabel
  metadata: StaticBuildSourceDamageViewMeta
  sourceType: StaticBuildSourceType
  sourceId: StaticBuildSourceId
  damageType: StaticBuildDamageType
  supported: boolean
  resolutionMode: StaticBuildSourceDamageViewResolutionMode
  requirements: StaticBuildSourceDamageViewRequirement[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  caveatSummary: StaticBuildEntryCaveatSummary
  assumptionSummary: StaticBuildAssumptionSummary
  assumptions: StaticBuildAssumptionList
  damage?: StaticBuildEntryDamage
  summary?: StaticBuildResolveSummary
  build?: ResolveStaticBuildResult
}

export interface StaticBuildSourceDamageViewEffectSummaryItem {
  effectId: StaticBuildEffectId
  sourceName: StaticBuildSourceName
  label: StaticBuildEffectLabel
  bucket: StaticBuildEffectSummaryBucket
  value: StaticBuildEffectSummaryValue
  appliedEntryCount: StaticBuildAppliedEntryCount
  totalEntryCount: StaticBuildTotalEntryCount
  appliesToAllEntries: boolean
  condition: StaticBuildEffectSummaryCondition
}

export type StaticBuildSourceDamageViewGroupKey = "standalone" | "delta"

export interface StaticBuildSourceDamageViewGroupSummary {
  key: StaticBuildSourceDamageViewGroupKey
  label: StaticBuildGroupLabel
  count: StaticBuildGroupCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildSourceDamageViewSummary {
  entryCount: StaticBuildEntryCount
  standaloneCount: StaticBuildStandaloneCount
  deltaCount: StaticBuildDeltaCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  groups: StaticBuildSourceDamageViewGroupSummary[]
}

export interface ResolveStaticBuildSourceDamageViewsResult {
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildSourceDamageViewSummary
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  entries: StaticBuildSourceDamageViewEntry[]
  assumptions: StaticBuildAssumptionList
}

export type StaticBuildSourceUtilityViewType =
  | "energy-refund"
  | "energy-regen-rate"
  | "decibel-gain"

export type StaticBuildSourceUtilityViewResolutionMode = "trigger" | "rate"

export type StaticBuildSourceUtilityViewTargetScope = "self" | "ally" | "team"

export type StaticBuildSourceUtilityViewRequirementKind =
  | "trigger"
  | "condition"
  | "cooldown"
  | "panel-value"

export interface StaticBuildSourceUtilityViewRequirement {
  kind: StaticBuildSourceUtilityViewRequirementKind
  key: StaticBuildRequirementKey
  satisfied: boolean
}

export type StaticBuildSourceUtilityViewRequirementSummary =
  StaticBuildRequirementSummary<StaticBuildSourceUtilityViewRequirementKind>

export interface ResolveStaticBuildSourceUtilityViewsInput {
  loadout: StaticBuildLoadoutInput
  panel?: Pick<
    StaticBuildFinalPanelInput,
    "energyGenerationRate" | "anomalyMastery" | "anomalyProficiency"
  >
}

export interface StaticBuildSourceUtilityViewMeta {
  canonicalLabel: StaticBuildCanonicalLabel
  stableKey: StaticBuildStableKey
  entryKind: "source-utility-view"
  utilityType: StaticBuildSourceUtilityViewType
  resolutionMode: StaticBuildSourceUtilityViewResolutionMode
  targetScope: StaticBuildSourceUtilityViewTargetScope
  unit: "energy" | "energy-per-second" | "decibel"
}

export interface StaticBuildSourceUtilityViewEntry {
  id: StaticBuildEntryId
  label: StaticBuildEntryLabel
  metadata: StaticBuildSourceUtilityViewMeta
  sourceType: StaticBuildSourceType
  sourceId: StaticBuildSourceId
  supported: boolean
  utilityType: StaticBuildSourceUtilityViewType
  resolutionMode: StaticBuildSourceUtilityViewResolutionMode
  targetScope: StaticBuildSourceUtilityViewTargetScope
  requirements: StaticBuildSourceUtilityViewRequirement[]
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  value: StaticBuildUtilityValue
  unit: "energy" | "energy-per-second" | "decibel"
  triggerLabel?: StaticBuildTriggerLabel
  conditionLabel?: StaticBuildConditionLabel
  cooldownSeconds?: StaticBuildCooldownSeconds
  summary: StaticBuildSourceUtilityViewEntrySummary
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  caveatSummary: StaticBuildEntryCaveatSummary
  assumptionSummary: StaticBuildAssumptionSummary
  assumptions: StaticBuildAssumptionList
}

export interface StaticBuildSourceUtilityViewEntrySummary {
  value: StaticBuildUtilityValue
  unit: "energy" | "energy-per-second" | "decibel"
  resolutionMode: StaticBuildSourceUtilityViewResolutionMode
  targetScope: StaticBuildSourceUtilityViewTargetScope
  requirementCount: StaticBuildRequirementCount
  hasUnsatisfiedRequirements: boolean
  diagnosticCount: StaticBuildDiagnosticCount
  sourceNoteCount: StaticBuildSourceNoteCount
  assumptionCount: StaticBuildAssumptionCount
  hasUnsupported: boolean
}

export type StaticBuildSourceUtilityViewGroupKey = "trigger" | "rate"

export interface StaticBuildSourceUtilityViewGroupSummary {
  key: StaticBuildSourceUtilityViewGroupKey
  label: StaticBuildGroupLabel
  count: StaticBuildGroupCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildSourceUtilityViewSummary {
  entryCount: StaticBuildEntryCount
  triggerCount: StaticBuildTriggerCount
  rateCount: StaticBuildRateCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  groups: StaticBuildSourceUtilityViewGroupSummary[]
}

export interface StaticBuildEntryCaveatSummary {
  assumptionCount: StaticBuildAssumptionCount
  unsupportedCount: StaticBuildUnsupportedCount
  hasAssumptions: boolean
  hasUnsupported: boolean
}

export interface ResolveStaticBuildSourceUtilityViewsResult {
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildSourceUtilityViewSummary
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  entries: StaticBuildSourceUtilityViewEntry[]
  assumptions: StaticBuildAssumptionList
}

export interface ResolveStaticBuildSourceEntriesInput {
  loadout: StaticBuildLoadoutInput
  panel?: StaticBuildFinalPanelInput
  scenario?: StaticBuildScenarioInput
  effectOverrides?: StaticBuildEffectOverride[]
}

export type StaticBuildSourceEntry =
  | StaticBuildSourceDamageViewEntry
  | StaticBuildSourceUtilityViewEntry

export type StaticBuildSourceEntryGroupKey =
  | "source-damage-view"
  | "source-utility-view"

export interface StaticBuildSourceEntryGroupSummary {
  key: StaticBuildSourceEntryGroupKey
  label: StaticBuildGroupLabel
  count: StaticBuildGroupCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildSourceEntryCollectionSummary {
  entryCount: StaticBuildEntryCount
  sourceDamageViewCount: StaticBuildSourceDamageViewCount
  sourceUtilityViewCount: StaticBuildSourceUtilityViewCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  isUtilityOnly: boolean
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  groups: StaticBuildSourceEntryGroupSummary[]
}

export interface ResolveStaticBuildSourceEntriesResult {
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildSourceEntryCollectionSummary
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  entries: StaticBuildSourceEntry[]
  assumptions: StaticBuildAssumptionList
}

export type StaticBuildTriggerMatrixEntryKind = "main-formula" | "source-view"

export interface StaticBuildTriggerMatrixGroupSummary {
  key: StaticBuildTriggerMatrixEntryKind
  label: StaticBuildGroupLabel
  count: StaticBuildGroupCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildTriggerMatrixSummary {
  rowCount: StaticBuildRowCount
  mainFormulaCount: StaticBuildMainFormulaCount
  sourceViewCount: StaticBuildSourceViewCount
  supportedCount: StaticBuildSupportedCount
  unsupportedCount: StaticBuildUnsupportedCount
  hasSourceViews: boolean
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  groups: StaticBuildTriggerMatrixGroupSummary[]
}

export interface StaticBuildTriggerMatrixEffectSummaryItem {
  effectId: StaticBuildEffectId
  sourceName: StaticBuildSourceName
  label: StaticBuildEffectLabel
  bucket: StaticBuildEffectSummaryBucket
  value: StaticBuildEffectSummaryValue
  appliedRowCount: StaticBuildAppliedRowCount
  totalRowCount: StaticBuildTotalRowCount
  appliesToAllRows: boolean
  condition: StaticBuildEffectSummaryCondition
}

export type StaticBuildTriggerMatrixTemplateSource =
  | "main-formula"
  | "source-view"

export interface StaticBuildTriggerMatrixRowMeta {
  canonicalLabel: StaticBuildCanonicalLabel
  stableKey: StaticBuildStableKey
  entryKind: StaticBuildTriggerMatrixEntryKind
  templateSource: StaticBuildTriggerMatrixTemplateSource
  damageType: Extract<StaticBuildDamageType, "anomaly" | "disorder">
  sourceType?: StaticBuildSourceType
  sourceId?: StaticBuildSourceId
  sourceStableKey?: StaticBuildStableKey
  sourceViewId?: StaticBuildSourceViewId
  sourceViewResolutionMode?: StaticBuildSourceDamageViewResolutionMode
}

export interface StaticBuildTriggerMatrixRow {
  id: StaticBuildRowId
  label: StaticBuildRowLabel
  supported: boolean
  metadata: StaticBuildTriggerMatrixRowMeta
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirements: StaticBuildSourceDamageViewRequirement[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  assumptions: StaticBuildAssumptionList
  damage?: StaticBuildEntryDamage
  summary?: StaticBuildResolveSummary
  build?: ResolveStaticBuildResult
}

export type ResolveStaticBuildTriggerMatrixInput = ResolveStaticBuildInput

export interface ResolveStaticBuildTriggerMatrixResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildTriggerMatrixSummary
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  rows: StaticBuildTriggerMatrixRow[]
  assumptions: StaticBuildAssumptionList
}

export interface StaticBuildSkillMatrixRowMeta {
  order: StaticBuildOrder
  actionName: StaticBuildActionName
  skillName: StaticBuildSkillName
  qualifiers: StaticBuildSkillQualifierList
  canonicalLabel: StaticBuildCanonicalLabel
  stableKey: StaticBuildStableKey
  templateSource: StaticBuildSkillMatrixTemplateSource
  sourceSkillTypeId: StaticBuildSourceSkillTypeId
  sourceStatId: StaticBuildSourceStatId
  sourceStatName: StaticBuildSourceStatName
  sourceOccurrence: StaticBuildSourceOccurrence
  attributeSource: StaticBuildSkillMatrixAttributeSource
  templateCombatTags: StaticBuildCombatTagList
  entryType: StaticBuildSkillMatrixEntryType
  aggregationType: StaticBuildSkillMatrixAggregationType
  isAdditionalDamage: boolean
  variantAxis?: StaticBuildSkillMatrixVariantAxis
  segmentLabel?: StaticBuildSegmentLabel
  segmentIndex?: StaticBuildSegmentIndex
  targetSize?: StaticBuildTargetSize
}

export interface StaticBuildSkillMatrixRowDamageSummary {
  expected: StaticBuildExpectedTotal
  crit: StaticBuildCriticalTotal
  noCrit: StaticBuildNonCriticalTotal
}

export type StaticBuildSkillMatrixGroupKey = string
export type StaticBuildActionName = string
export type StaticBuildSkillName = string
export type StaticBuildSourceStatId = string
export type StaticBuildSourceStatName = string
export type StaticBuildSegmentLabel = string
export type StaticBuildSkillMultiplierText = string

export interface StaticBuildSkillMatrixRow {
  id: StaticBuildRowId
  group: StaticBuildSkillMatrixGroupKey
  label: StaticBuildRowLabel
  metadata: StaticBuildSkillMatrixRowMeta
  skillTag: StaticBuildSkillTag
  damageType: StaticBuildDamageType
  attribute: AgentAttribute
  combatTags: StaticBuildCombatTagList
  skillMultiplier: StaticBuildSkillMultiplierText
  damageSummary: StaticBuildSkillMatrixRowDamageSummary
  summary: StaticBuildResolveSummary
  resolvedBuckets: StaticBuildResolvedBuckets
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  assumptions: StaticBuildAssumptionList
  unsupportedEffects: StaticBuildUnsupportedEffectList
  build: ResolveStaticBuildResult
}

export interface StaticBuildSkillMatrixSummary {
  rowCount: StaticBuildRowCount
  baseDamageStat: StaticBuildBaseDamageStat
  baseDamageValue: StaticBuildBaseDamageValue
  attack?: StaticBuildAttack
  hp?: StaticBuildHP
  sheerForce?: StaticBuildSheerForce
  critRate: StaticBuildCritRate
  critDamage: StaticBuildCritDamage
  penetrationRate: StaticBuildPenetrationRate
  penetrationValue: StaticBuildPenetrationValue
  commonBuckets: StaticBuildBucketValueMap
  variableBuckets: StaticBuildVariableBucketList
  commonFormulaMultipliers: StaticBuildFormulaMultiplierMap
  variableFormulaMultipliers: StaticBuildVariableFormulaMultiplierList
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  groups: StaticBuildSkillMatrixGroupSummary[]
}

export interface StaticBuildSkillMatrixGroupSummary {
  key: StaticBuildSkillMatrixGroupKey
  label: StaticBuildGroupLabel
  count: StaticBuildGroupCount
  commonBuckets: StaticBuildBucketValueMap
  variableBuckets: StaticBuildVariableBucketList
  commonFormulaMultipliers: StaticBuildFormulaMultiplierMap
  variableFormulaMultipliers: StaticBuildVariableFormulaMultiplierList
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptions: StaticBuildAssumptionList
  unsupportedEffects: StaticBuildUnsupportedEffectList
}

export interface StaticBuildSkillMatrixEffectSummaryItem {
  effectId: StaticBuildEffectId
  sourceName: StaticBuildSourceName
  label: StaticBuildEffectLabel
  bucket: StaticBuildEffectSummaryBucket
  value: StaticBuildEffectSummaryValue
  appliedRowCount: StaticBuildAppliedRowCount
  totalRowCount: StaticBuildTotalRowCount
  appliesToAllRows: boolean
  condition: StaticBuildEffectSummaryCondition
}

export interface ResolveStaticBuildSkillMatrixResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildSkillMatrixSummary
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  rows: StaticBuildSkillMatrixRow[]
  assumptions: StaticBuildAssumptionList
  unsupportedEffects: StaticBuildUnsupportedEffectList
}

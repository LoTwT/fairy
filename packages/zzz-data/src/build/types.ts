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

export interface StaticBuildDynamicSnapshotInput {
  flags?: Partial<Record<StaticBuildDynamicFlagKey, boolean>>
  counts?: Partial<Record<StaticBuildDynamicCountKey, number>>
  values?: Partial<Record<StaticBuildDynamicValueKey, number>>
}

export interface StaticBuildStateSnapshotInput {
  flags?: Partial<Record<StaticBuildStateFlagKey, boolean>>
  values?: Partial<Record<StaticBuildStateValueKey, number>>
}

export interface StaticBuildResolvedSnapshotInput {
  bucketDeltas?: Partial<Record<StaticBuildResolvedSnapshotBucketKey, number>>
  multiplierFactors?: Partial<
    Record<StaticBuildResolvedSnapshotMultiplierKey, number>
  >
}

export interface StaticBuildDriveDiscSetInput {
  id: string
  pieces: 2 | 4
}

export interface StaticBuildLoadoutInput {
  agentId: string
  wEngineId?: string
  driveDiscSets?: StaticBuildDriveDiscSetInput[]
  agentLevel?: number
  agentMindscape?: number
  coreSkillLevel?: number
  wEngineRefinement?: number
}

export interface StaticBuildFinalPanelInput {
  attack: number
  baseAttack?: number
  critRate: number
  critDamage: number
  hp?: number
  sheerForce?: number
  energyGenerationRate?: number
  anomalyProficiency?: number
  anomalyMastery?: number
  anomalyCritRate?: number
  anomalyCritDamage?: number
  penetrationRate?: number
  penetrationValue?: number
}

export interface StaticBuildEnemyInput {
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

interface StaticBuildScenarioBaseInput {
  attribute?: AgentAttributeLabel
  extraAbilityActive?: boolean
  combatTags?: string[]
  dynamicSnapshot?: StaticBuildDynamicSnapshotInput
  stateSnapshot?: StaticBuildStateSnapshotInput
  resolvedSnapshot?: StaticBuildResolvedSnapshotInput
  enemy: StaticBuildEnemyInput
}

interface StaticBuildSkillMultiplierScenarioInput extends StaticBuildScenarioBaseInput {
  skillTag: StaticBuildSkillTag
  skillMultiplier: number | string
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
  damageMultiplier: number | string
}

export interface StaticBuildDisorderScenarioInput extends StaticBuildScenarioBaseInput {
  damageType: "disorder"
  skillTag: StaticBuildSkillTag
  anomalyType: AnomalyType
  remainingTime: number
}

export type StaticBuildScenarioInput =
  | StaticBuildNormalScenarioInput
  | StaticBuildSheerScenarioInput
  | StaticBuildAnomalyScenarioInput
  | StaticBuildDisorderScenarioInput

export interface StaticBuildEffectOverride {
  effectId: string
  enabled?: boolean
  stacks?: number
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
  combatTags?: string[]
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

export interface StaticBuildCatalogEntry {
  id: string
  name: string
  aliases: string[]
}

export interface StaticBuildBaseAgentCatalogEntry extends StaticBuildCatalogEntry {
  specialty: AgentSpecialty
  defaultAttribute: AgentAttribute
}

export interface StaticBuildAgentCatalogEntry extends StaticBuildBaseAgentCatalogEntry {
  defaultDamageType: StaticBuildDamageType
  profileId: StaticBuildProfileId
}

export type StaticBuildUtilityAgentCatalogEntry =
  StaticBuildBaseAgentCatalogEntry

export interface StaticBuildWEngineCatalogEntry extends StaticBuildCatalogEntry {
  specialty: AgentSpecialty
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
  minimumMindscape?: number
  requireExtraAbility?: boolean
  requireStunned?: boolean
  combatTags?: string[]
  dynamicSnapshotFlags?: StaticBuildDynamicFlagKey[]
  stateSnapshotFlags?: StaticBuildStateFlagKey[]
  requiredDynamicCounts?: StaticBuildDynamicCountKey[]
  requiredDynamicValues?: StaticBuildDynamicValueKey[]
  requiredStateValues?: StaticBuildStateValueKey[]
  minimumDynamicCounts?: Partial<Record<StaticBuildDynamicCountKey, number>>
  minimumDynamicValues?: Partial<Record<StaticBuildDynamicValueKey, number>>
  minimumStateValues?: Partial<Record<StaticBuildStateValueKey, number>>
  minimumResolvedCritRate?: number
  minimumResolvedAnomalyProficiency?: number
}

export interface StaticBuildValueContext {
  agentMindscape: number
  coreSkillLevel: number
  wEngineRefinement: number
  energyGenerationRate?: number
  anomalyMastery?: number
  resolvedAnomalyProficiency?: number
  remainingTime?: number
  dynamicSnapshot?: StaticBuildDynamicSnapshotInput
  stateSnapshot?: StaticBuildStateSnapshotInput
}

export interface StaticBuildModifierDefinition {
  bucket: StaticBuildBucket
  combine?: "sum" | "multiply"
  value: (context: StaticBuildValueContext) => number
}

export interface StaticBuildEffectDefinition {
  id: string
  sourceType: "agent" | "w-engine" | "drive-disc"
  sourceId: string
  sourceName: string
  label: string
  alreadyInPanel?: boolean
  maxStacks?: number
  baselineEnabled?: boolean
  fullBuffEnabled?: boolean
  baselineStacks?: number
  fullBuffStacks?: number
  condition?: StaticBuildEffectCondition
  modifiers: StaticBuildModifierDefinition[]
}

export interface StaticBuildResolvedBuckets {
  attackPercent: number
  flatAttack: number
  bonusDamageSum: number
  critRate: number
  critDamage: number
  defenseReduction: number
  penetrationRate: number
  penetrationValue: number
  resistanceReduction: number
  ignoreResistance: number
  vulnerabilityBonus: number
  damageReduction: number
  stunVulnerability: number
  nonStunVulnerability: number
  sheerBonusSum: number
  anomalyMastery: number
  anomalyProficiency: number
  anomalyBonusDamageSum: number
  anomalyCritRate: number
  anomalyCritDamage: number
  skillMultiplierFactor: number
}

export interface StaticBuildResolvedPanel {
  attack: number
  baseAttack?: number
  agentLevel: number
  critRate: number
  critDamage: number
  hp?: number
  sheerForce?: number
  energyGenerationRate?: number
  anomalyProficiency: number
  anomalyMastery?: number
  anomalyCritRate: number
  anomalyCritDamage: number
  penetrationRate: number
  penetrationValue: number
  baseDamageStat: "attack" | "sheerForce"
  baseDamageValue: number
}

export interface StaticBuildTraceModifier {
  bucket: StaticBuildBucket
  value: number
  combine: "sum" | "multiply"
}

export interface StaticBuildTraceItem {
  effectId: string
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceName: string
  label: string
  status: "applied" | "skipped" | "unsupported"
  reason?: string
  stacks?: number
  modifiers?: StaticBuildTraceModifier[]
}

export interface StaticBuildProfileResult {
  id: StaticBuildProfileId
  name: string
}

export interface StaticBuildResolvedLoadout {
  agent: StaticBuildAgentCatalogEntry | StaticBuildUtilityAgentCatalogEntry
  wEngine?: StaticBuildWEngineCatalogEntry
  driveDiscSets: Array<
    StaticBuildCatalogEntry & {
      pieces: 2 | 4
    }
  >
  agentLevel: number
  agentMindscape: number
  coreSkillLevel: number
  wEngineRefinement: number
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

export interface StaticBuildSourceNoteEntry {
  id: string
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId: string
  owner: StaticBuildSourceNoteOwner
  status: StaticBuildSourceNoteStatus
  guidance: StaticBuildSourceNoteGuidance
  keys: string[]
  message: string
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

export interface StaticBuildDiagnosticEntry {
  kind: StaticBuildDiagnosticKind
  owner: StaticBuildDiagnosticOwner
  sourceType?: StaticBuildEffectDefinition["sourceType"]
  sourceId?: string
  keys: string[]
  message: string
}

export interface StaticBuildDiagnosticGroupSummary {
  key: StaticBuildDiagnosticKind
  label: string
  count: number
}

export interface StaticBuildDiagnosticOwnerGroupSummary {
  key: StaticBuildDiagnosticOwner
  count: number
}

export interface StaticBuildDiagnosticSummary {
  count: number
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
  label: string
  count: number
}

export interface StaticBuildSourceNoteOwnerGroupSummary {
  key: StaticBuildSourceNoteOwner
  count: number
}

export interface StaticBuildSourceNoteSummary {
  count: number
  hasSourceNotes: boolean
  hasMissingInput: boolean
  hasProcessOnly: boolean
  hasResearchOnly: boolean
  statusGroups: StaticBuildSourceNoteGroupSummary[]
  ownerGroups: StaticBuildSourceNoteOwnerGroupSummary[]
}

export interface StaticBuildCaveatSummary {
  assumptionCount: number
  unsupportedEffectCount: number
  hasAssumptions: boolean
  hasUnsupportedEffects: boolean
}

export interface StaticBuildResolveSummary {
  baseDamageStat: StaticBuildResolvedPanel["baseDamageStat"]
  baseDamageValue: number
  expectedTotal: number
  critTotal: number
  noCritTotal: number
  formulaMultipliers: Record<string, number>
  assumptionCount: number
  diagnosticCount: number
  sourceNoteCount: number
  unsupportedEffectCount: number
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

export interface ResolveStaticBuildResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildResolveSummary
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
  assumptions: string[]
  unsupportedEffects: string[]
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
  key: string
  satisfied: boolean
}

export interface StaticBuildRequirementSummaryGroup<
  TKey extends string = string,
> {
  key: TKey
  count: number
  satisfiedCount: number
  unsatisfiedCount: number
}

export interface StaticBuildRequirementSummary<TKey extends string = string> {
  count: number
  satisfiedCount: number
  unsatisfiedCount: number
  hasUnsatisfied: boolean
  groups: StaticBuildRequirementSummaryGroup<TKey>[]
}

export interface StaticBuildAssumptionSummary {
  count: number
  hasAssumptions: boolean
}

export type StaticBuildSourceDamageViewRequirementSummary =
  StaticBuildRequirementSummary<StaticBuildSourceDamageViewRequirementKind>

export interface StaticBuildSourceDamageViewMeta {
  canonicalLabel: string
  stableKey: string
  entryKind: "source-damage-view"
  damageType: Extract<StaticBuildDamageType, "anomaly" | "disorder">
  resolutionMode: "standalone" | "delta"
}

export interface StaticBuildSourceDamageViewEntry {
  id: string
  label: string
  metadata: StaticBuildSourceDamageViewMeta
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId: string
  damageType: StaticBuildDamageType
  supported: boolean
  resolutionMode: "standalone" | "delta"
  requirements: StaticBuildSourceDamageViewRequirement[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  assumptionSummary: StaticBuildAssumptionSummary
  assumptions: string[]
  damage?: {
    expected: number
    crit: number
    noCrit: number
  }
  summary?: StaticBuildResolveSummary
  build?: ResolveStaticBuildResult
}

export type StaticBuildSourceDamageViewGroupKey = "standalone" | "delta"

export interface StaticBuildSourceDamageViewGroupSummary {
  key: StaticBuildSourceDamageViewGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildSourceDamageViewSummary {
  entryCount: number
  standaloneCount: number
  deltaCount: number
  supportedCount: number
  unsupportedCount: number
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
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  entries: StaticBuildSourceDamageViewEntry[]
  assumptions: string[]
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
  key: string
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
  canonicalLabel: string
  stableKey: string
  entryKind: "source-utility-view"
  utilityType: StaticBuildSourceUtilityViewType
  resolutionMode: StaticBuildSourceUtilityViewResolutionMode
  targetScope: StaticBuildSourceUtilityViewTargetScope
  unit: "energy" | "energy-per-second" | "decibel"
}

export interface StaticBuildSourceUtilityViewEntry {
  id: string
  label: string
  metadata: StaticBuildSourceUtilityViewMeta
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId: string
  supported: boolean
  utilityType: StaticBuildSourceUtilityViewType
  resolutionMode: StaticBuildSourceUtilityViewResolutionMode
  targetScope: StaticBuildSourceUtilityViewTargetScope
  requirements: StaticBuildSourceUtilityViewRequirement[]
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  value: number
  unit: "energy" | "energy-per-second" | "decibel"
  triggerLabel?: string
  conditionLabel?: string
  cooldownSeconds?: number
  summary: StaticBuildSourceUtilityViewEntrySummary
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  assumptionSummary: StaticBuildAssumptionSummary
  assumptions: string[]
}

export interface StaticBuildSourceUtilityViewEntrySummary {
  value: number
  unit: "energy" | "energy-per-second" | "decibel"
  resolutionMode: StaticBuildSourceUtilityViewResolutionMode
  targetScope: StaticBuildSourceUtilityViewTargetScope
  requirementCount: number
  hasUnsatisfiedRequirements: boolean
  diagnosticCount: number
  sourceNoteCount: number
  assumptionCount: number
  hasUnsupported: boolean
}

export type StaticBuildSourceUtilityViewGroupKey = "trigger" | "rate"

export interface StaticBuildSourceUtilityViewGroupSummary {
  key: StaticBuildSourceUtilityViewGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildSourceUtilityViewSummary {
  entryCount: number
  triggerCount: number
  rateCount: number
  supportedCount: number
  unsupportedCount: number
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  groups: StaticBuildSourceUtilityViewGroupSummary[]
}

export interface StaticBuildEntryCaveatSummary {
  assumptionCount: number
  unsupportedCount: number
  hasAssumptions: boolean
  hasUnsupported: boolean
}

export interface ResolveStaticBuildSourceUtilityViewsResult {
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildSourceUtilityViewSummary
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  entries: StaticBuildSourceUtilityViewEntry[]
  assumptions: string[]
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
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildSourceEntryCollectionSummary {
  entryCount: number
  sourceDamageViewCount: number
  sourceUtilityViewCount: number
  supportedCount: number
  unsupportedCount: number
  isUtilityOnly: boolean
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
  sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  entries: StaticBuildSourceEntry[]
  assumptions: string[]
}

export type StaticBuildTriggerMatrixEntryKind = "main-formula" | "source-view"

export interface StaticBuildTriggerMatrixGroupSummary {
  key: StaticBuildTriggerMatrixEntryKind
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: StaticBuildEntryCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
}

export interface StaticBuildTriggerMatrixSummary {
  rowCount: number
  mainFormulaCount: number
  sourceViewCount: number
  supportedCount: number
  unsupportedCount: number
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
  effectId: string
  sourceName: string
  label: string
  bucket: string
  value: string
  appliedRowCount: number
  totalRowCount: number
  appliesToAllRows: boolean
  condition: string
}

export type StaticBuildTriggerMatrixTemplateSource =
  | "main-formula"
  | "source-view"

export interface StaticBuildTriggerMatrixRowMeta {
  canonicalLabel: string
  stableKey: string
  entryKind: StaticBuildTriggerMatrixEntryKind
  templateSource: StaticBuildTriggerMatrixTemplateSource
  damageType: Extract<StaticBuildDamageType, "anomaly" | "disorder">
  sourceType?: StaticBuildEffectDefinition["sourceType"]
  sourceId?: string
  sourceStableKey?: string
  sourceViewId?: string
  sourceViewResolutionMode?: StaticBuildSourceDamageViewEntry["resolutionMode"]
}

export interface StaticBuildTriggerMatrixRow {
  id: string
  label: string
  supported: boolean
  metadata: StaticBuildTriggerMatrixRowMeta
  requirements: StaticBuildSourceDamageViewRequirement[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  assumptions: string[]
  damage?: {
    expected: number
    crit: number
    noCrit: number
  }
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
  assumptions: string[]
}

export interface StaticBuildSkillMatrixRowMeta {
  order: number
  actionName: string
  skillName: string
  qualifiers: string[]
  canonicalLabel: string
  stableKey: string
  templateSource: StaticBuildSkillMatrixTemplateSource
  sourceSkillTypeId: number
  sourceStatId: string
  sourceStatName: string
  sourceOccurrence: number
  attributeSource: StaticBuildSkillMatrixAttributeSource
  templateCombatTags: string[]
  entryType: StaticBuildSkillMatrixEntryType
  aggregationType: StaticBuildSkillMatrixAggregationType
  isAdditionalDamage: boolean
  variantAxis?: StaticBuildSkillMatrixVariantAxis
  segmentLabel?: string
  segmentIndex?: number
  targetSize?: StaticBuildTargetSize
}

export interface StaticBuildSkillMatrixRowDamageSummary {
  expected: number
  crit: number
  noCrit: number
}

export interface StaticBuildSkillMatrixRow {
  id: string
  group: string
  label: string
  metadata: StaticBuildSkillMatrixRowMeta
  skillTag: StaticBuildSkillTag
  damageType: StaticBuildDamageType
  attribute: AgentAttribute
  combatTags: string[]
  skillMultiplier: string
  damageSummary: StaticBuildSkillMatrixRowDamageSummary
  summary: StaticBuildResolveSummary
  resolvedBuckets: StaticBuildResolvedBuckets
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  assumptions: string[]
  unsupportedEffects: string[]
  build: ResolveStaticBuildResult
}

export interface StaticBuildSkillMatrixSummary {
  rowCount: number
  baseDamageStat: StaticBuildResolvedPanel["baseDamageStat"]
  baseDamageValue: number
  attack?: number
  hp?: number
  sheerForce?: number
  critRate: number
  critDamage: number
  penetrationRate: number
  penetrationValue: number
  commonBuckets: Record<string, number>
  variableBuckets: string[]
  commonFormulaMultipliers: Record<string, number>
  variableFormulaMultipliers: string[]
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  groups: StaticBuildSkillMatrixGroupSummary[]
}

export interface StaticBuildSkillMatrixGroupSummary {
  key: string
  label: string
  count: number
  commonBuckets: Record<string, number>
  variableBuckets: string[]
  commonFormulaMultipliers: Record<string, number>
  variableFormulaMultipliers: string[]
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  assumptions: string[]
  unsupportedEffects: string[]
}

export interface StaticBuildSkillMatrixEffectSummaryItem {
  effectId: string
  sourceName: string
  label: string
  bucket: string
  value: string
  appliedRowCount: number
  totalRowCount: number
  appliesToAllRows: boolean
  condition: string
}

export interface ResolveStaticBuildSkillMatrixResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildSkillMatrixSummary
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  assumptionSummary: StaticBuildAssumptionSummary
  caveatSummary: StaticBuildCaveatSummary
  diagnosticSummary: StaticBuildDiagnosticSummary
  sourceNoteSummary: StaticBuildSourceNoteSummary
  rows: StaticBuildSkillMatrixRow[]
  assumptions: string[]
  unsupportedEffects: string[]
}

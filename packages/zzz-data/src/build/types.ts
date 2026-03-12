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

export interface StaticBuildAgentCatalogEntry extends StaticBuildCatalogEntry {
  specialty: AgentSpecialty
  defaultAttribute: AgentAttribute
  defaultDamageType: StaticBuildDamageType
  profileId: StaticBuildProfileId
}

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
  agent: StaticBuildAgentCatalogEntry
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

export interface StaticBuildSourceNoteEntry {
  id: string
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId: string
  owner: StaticBuildSourceNoteOwner
  status: StaticBuildSourceNoteStatus
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

export interface ResolveStaticBuildResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
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

export interface StaticBuildSourceDamageViewEntry {
  id: string
  label: string
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId: string
  damageType: StaticBuildDamageType
  supported: boolean
  resolutionMode: "standalone" | "delta"
  requirements: StaticBuildSourceDamageViewRequirement[]
  diagnostics: StaticBuildDiagnosticEntry[]
  sourceNotes: StaticBuildSourceNoteEntry[]
  assumptions: string[]
  damage?: {
    expected: number
    crit: number
    noCrit: number
  }
  build?: ResolveStaticBuildResult
}

export interface ResolveStaticBuildSourceDamageViewsResult {
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  entries: StaticBuildSourceDamageViewEntry[]
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
  build: ResolveStaticBuildResult
}

export interface ResolveStaticBuildSkillMatrixResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  rows: StaticBuildSkillMatrixRow[]
  assumptions: string[]
}

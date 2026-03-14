import type {
  AnomalyDamageParams,
  AnomalyType,
  CritParams,
  DamageResult,
  DazeVulnerabilityParams,
  DefenseParams,
  DisorderDamageParams,
  NormalDamageParams,
  ResistanceParams,
  SheerDamageParams,
  VulnerabilityParams,
} from "../calculator/types.js"
import type {
  ResolveStaticBuildResult,
  ResolveStaticBuildSkillMatrixResult,
  ResolveStaticBuildSourceDamageViewsResult,
  ResolveStaticBuildSourceEntriesResult,
  ResolveStaticBuildSourceUtilityViewsResult,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildAgentCatalogEntry,
  StaticBuildAssumptionSummary,
  StaticBuildBaseMode,
  StaticBuildBucket,
  StaticBuildCaveatSummary,
  StaticBuildDiagnosticEntry,
  StaticBuildDiagnosticKind,
  StaticBuildDiagnosticOwner,
  StaticBuildDiagnosticSummary,
  StaticBuildEntryCaveatSummary,
  StaticBuildMode,
  StaticBuildProfileResult,
  StaticBuildRequirementSummary,
  StaticBuildRequirementSummaryGroup,
  StaticBuildResolvedBuckets,
  StaticBuildResolvedLoadout,
  StaticBuildResolvedPanel,
  StaticBuildResolveEffectSummaryItem,
  StaticBuildResolveSummary,
  StaticBuildSkillMatrixEffectSummaryItem,
  StaticBuildSkillMatrixRow,
  StaticBuildSkillMatrixRowDamageSummary,
  StaticBuildSkillMatrixRowMeta,
  StaticBuildSourceDamageViewEffectSummaryItem,
  StaticBuildSourceDamageViewEntry,
  StaticBuildSourceDamageViewRequirement,
  StaticBuildSourceDamageViewRequirementKind,
  StaticBuildSourceEntry,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceNoteGuidance,
  StaticBuildSourceNoteGuidanceKind,
  StaticBuildSourceNoteGuidanceTarget,
  StaticBuildSourceNoteOwner,
  StaticBuildSourceNoteStatus,
  StaticBuildSourceNoteSummary,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildSourceUtilityViewRequirement,
  StaticBuildSourceUtilityViewRequirementKind,
  StaticBuildTraceItem,
  StaticBuildTraceModifier,
  StaticBuildTriggerMatrixEffectSummaryItem,
  StaticBuildTriggerMatrixRow,
  StaticBuildTriggerMatrixRowMeta,
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
  assumptions?: string[]
  unsupportedEffects?: string[]
  damageParams?:
    | CompactStaticBuildNormalDamageParams
    | CompactStaticBuildSheerDamageParams
    | CompactStaticBuildAnomalyDamageParams
    | CompactStaticBuildDisorderDamageParams
  trace?: CompactStaticBuildTraceItem[]
}

export interface CompactStaticBuildResolveSummary {
  baseDamageStat: StaticBuildResolveSummary["baseDamageStat"]
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
  diagnosticGroups: CompactStaticBuildDiagnosticGroupSummary[]
  sourceNoteGroups: CompactStaticBuildSourceNoteGroupSummary[]
}

export type CompactStaticBuildMode = StaticBuildMode

export type CompactStaticBuildBaseMode = StaticBuildBaseMode

export interface CompactStaticBuildProfile {
  id: StaticBuildProfileResult["id"]
  name: string
}

export interface CompactStaticBuildCatalogEntry {
  id: string
  name: string
  aliases: string[]
}

export interface CompactStaticBuildAgentCatalogEntry extends CompactStaticBuildCatalogEntry {
  specialty: StaticBuildResolvedLoadout["agent"]["specialty"]
  defaultAttribute: StaticBuildResolvedLoadout["agent"]["defaultAttribute"]
  defaultDamageType?: StaticBuildAgentCatalogEntry["defaultDamageType"]
  profileId?: StaticBuildAgentCatalogEntry["profileId"]
}

export interface CompactStaticBuildWEngineCatalogEntry extends CompactStaticBuildCatalogEntry {
  specialty: NonNullable<StaticBuildResolvedLoadout["wEngine"]>["specialty"]
}

export interface CompactStaticBuildDriveDiscSet {
  id: string
  name: string
  aliases: string[]
  pieces: 2 | 4
}

export interface CompactStaticBuildLoadout {
  agent: CompactStaticBuildAgentCatalogEntry
  wEngine?: CompactStaticBuildWEngineCatalogEntry
  driveDiscSets: CompactStaticBuildDriveDiscSet[]
  agentLevel: number
  agentMindscape: number
  coreSkillLevel: number
  wEngineRefinement: number
}

export interface CompactStaticBuildResolvedBuckets {
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

export interface CompactStaticBuildResolvedPanel {
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

export interface CompactStaticBuildDefenseParams {
  attackerLevelBase: number
  defenderBaseDefense: number
  defenseBonus: number
  defenseReduction: number
  penetrationRate: number
  penetrationValue: number
}

export interface CompactStaticBuildResistanceParams {
  defenderResistance: number
  resistanceReduction: number
  ignoreResistance: number
}

export interface CompactStaticBuildVulnerabilityParams {
  vulnerabilityBonus: number
  damageReduction: number
}

export interface CompactStaticBuildDazeVulnerabilityParams {
  isStunned: boolean
  stunVulnerability: number
  nonStunVulnerability: number
}

export interface CompactStaticBuildCritParams {
  critRate: number
  critDamage: number
}

export interface CompactStaticBuildNormalDamageParams {
  baseDamage: number
  bonusDamageSum: number
  crit: CompactStaticBuildCritParams
  defense: CompactStaticBuildDefenseParams
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  specialMultiplier?: number
}

export interface CompactStaticBuildSheerDamageParams {
  baseDamage: number
  bonusDamageSum: number
  crit: CompactStaticBuildCritParams
  sheerBonusSum: number
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  specialMultiplier?: number
}

export interface CompactStaticBuildAnomalyDamageParams {
  virtualAgentLevel: number
  virtualAgentAttack: number
  virtualAgentAnomalyProficiency: number
  damageMultiplier: number
  bonusDamageSum: number
  defense: CompactStaticBuildDefenseParams
  resistance: CompactStaticBuildResistanceParams
  vulnerability: CompactStaticBuildVulnerabilityParams
  dazeVulnerability: CompactStaticBuildDazeVulnerabilityParams
  anomalyBonusDamageSum: number
  anomalyCritRate: number
  anomalyCritDamage: number
}

export interface CompactStaticBuildDisorderDamageParams extends Omit<
  CompactStaticBuildAnomalyDamageParams,
  "damageMultiplier"
> {
  damageMultiplierFactor?: number
  anomalyType: AnomalyType
  remainingTime: number
}

export interface CompactStaticBuildDamageBreakdown {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  defenseMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  sheerBonusMultiplier: number
  anomalyProficiencyMultiplier: number
  damageLevelMultiplier: number
  anomalyBonusMultiplier: number
  anomalyCritMultiplier: number
  specialMultiplier: number
}

export interface CompactStaticBuildDamageResult {
  total: number
  breakdown: CompactStaticBuildDamageBreakdown
}

export interface CompactStaticBuildDiagnosticGroupSummary {
  key: StaticBuildDiagnosticKind
  label: string
  count: number
}

export interface CompactStaticBuildDiagnosticOwnerGroupSummary {
  key: StaticBuildDiagnosticOwner
  count: number
}

export interface CompactStaticBuildDiagnosticEntry {
  kind: StaticBuildDiagnosticKind
  owner: StaticBuildDiagnosticOwner
  sourceType?: StaticBuildDiagnosticEntry["sourceType"]
  sourceId?: string
  keys: string[]
  message: string
}

export interface CompactStaticBuildDiagnosticSummary {
  count: number
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
  label: string
  count: number
}

export interface CompactStaticBuildSourceNoteOwnerGroupSummary {
  key: StaticBuildSourceNoteOwner
  count: number
}

export interface CompactStaticBuildSourceNoteGuidance {
  kind: StaticBuildSourceNoteGuidanceKind
  target?: StaticBuildSourceNoteGuidanceTarget
}

export interface CompactStaticBuildSourceNoteEntry {
  id: string
  sourceType: StaticBuildSourceNoteEntry["sourceType"]
  sourceId: string
  owner: StaticBuildSourceNoteOwner
  status: StaticBuildSourceNoteStatus
  guidance: CompactStaticBuildSourceNoteGuidance
  keys: string[]
  message: string
}

export interface CompactStaticBuildSourceNoteSummary {
  count: number
  hasSourceNotes: boolean
  hasMissingInput: boolean
  hasProcessOnly: boolean
  hasResearchOnly: boolean
  statusGroups: CompactStaticBuildSourceNoteGroupSummary[]
  ownerGroups: CompactStaticBuildSourceNoteOwnerGroupSummary[]
}

export interface CompactStaticBuildAssumptionSummary {
  count: number
  hasAssumptions: boolean
}

export interface CompactStaticBuildCaveatSummary {
  assumptionCount: number
  unsupportedEffectCount: number
  hasAssumptions: boolean
  hasUnsupportedEffects: boolean
}

export interface CompactStaticBuildTraceModifier {
  bucket: StaticBuildBucket
  value: number
  combine: "sum" | "multiply"
}

export interface CompactStaticBuildTraceItem {
  effectId: string
  sourceType: StaticBuildTraceItem["sourceType"]
  sourceName: string
  label: string
  status: StaticBuildTraceItem["status"]
  reason?: string
  stacks?: number
  modifiers?: CompactStaticBuildTraceModifier[]
}

export interface CompactStaticBuildEntryCaveatSummary {
  assumptionCount: number
  unsupportedCount: number
  hasAssumptions: boolean
  hasUnsupported: boolean
}

export interface CompactStaticBuildRequirementSummaryGroup<
  TKey extends string = string,
> {
  key: TKey
  count: number
  satisfiedCount: number
  unsatisfiedCount: number
}

export interface CompactStaticBuildRequirementSummary<
  TKey extends string = string,
> {
  count: number
  satisfiedCount: number
  unsatisfiedCount: number
  hasUnsatisfied: boolean
  groups: CompactStaticBuildRequirementSummaryGroup<TKey>[]
}

export type CompactStaticBuildSourceDamageViewRequirementSummary =
  CompactStaticBuildRequirementSummary<StaticBuildSourceDamageViewRequirementKind>

export type CompactStaticBuildSourceUtilityViewRequirementSummary =
  CompactStaticBuildRequirementSummary<StaticBuildSourceUtilityViewRequirementKind>

export interface CompactStaticBuildSourceDamageViewRequirement {
  kind: StaticBuildSourceDamageViewRequirementKind
  key: string
  satisfied: boolean
}

export interface CompactStaticBuildSourceUtilityViewRequirement {
  kind: StaticBuildSourceUtilityViewRequirementKind
  key: string
  satisfied: boolean
}

export interface CompactStaticBuildResolveEffectSummaryItem {
  effectId: string
  sourceName: string
  label: string
  bucket: string
  value: string
}

export interface CompactStaticBuildAppliedRowEffectSummaryItem {
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

export interface CompactStaticBuildAppliedEntryEffectSummaryItem {
  effectId: string
  sourceName: string
  label: string
  bucket: string
  value: string
  appliedEntryCount: number
  totalEntryCount: number
  appliesToAllEntries: boolean
  condition: string
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
  id: string
  group: string
  label: string
  metadata: CompactStaticBuildSkillMatrixRowMeta
  skillTag: StaticBuildSkillMatrixRow["skillTag"]
  damageType: StaticBuildSkillMatrixRow["damageType"]
  attribute: StaticBuildSkillMatrixRow["attribute"]
  combatTags: string[]
  skillMultiplier: string
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
  assumptions?: string[]
  unsupportedEffects?: string[]
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
  assumptions?: string[]
  unsupportedEffects?: string[]
  rows: StaticBuildCompactSkillMatrixRow[]
}

export interface CompactStaticBuildSkillMatrixRowMeta {
  order: number
  actionName: string
  skillName: string
  qualifiers: string[]
  canonicalLabel: string
  stableKey: string
  templateSource: StaticBuildSkillMatrixRowMeta["templateSource"]
  sourceSkillTypeId: number
  sourceStatId: string
  sourceStatName: string
  sourceOccurrence: number
  attributeSource: StaticBuildSkillMatrixRowMeta["attributeSource"]
  templateCombatTags: string[]
  entryType: StaticBuildSkillMatrixRowMeta["entryType"]
  aggregationType: StaticBuildSkillMatrixRowMeta["aggregationType"]
  isAdditionalDamage: boolean
  variantAxis?: StaticBuildSkillMatrixRowMeta["variantAxis"]
  segmentLabel?: string
  segmentIndex?: number
  targetSize?: StaticBuildSkillMatrixRowMeta["targetSize"]
}

export interface CompactStaticBuildSkillMatrixGroupSummary {
  key: string
  label: string
  count: number
  commonBuckets: Record<string, number>
  variableBuckets: string[]
  commonFormulaMultipliers: Record<string, number>
  variableFormulaMultipliers: string[]
  effectSummary: CompactStaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptions?: string[]
  unsupportedEffects?: string[]
}

export interface CompactStaticBuildSkillMatrixSummary {
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
  breakdown: DamageResult["breakdown"],
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
  id: string
  label: string
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
  assumptions?: string[]
  damage?: CompactStaticBuildEntryDamageSummary
  summary?: CompactStaticBuildResolveSummary
  build?: CompactStaticBuildResult
}

export interface CompactStaticBuildTriggerMatrixGroupSummary {
  key: StaticBuildTriggerMatrixEntryKind
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: CompactStaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildTriggerMatrixRowMeta {
  canonicalLabel: string
  stableKey: string
  entryKind: CompactStaticBuildTriggerMatrixEntryKind
  templateSource: CompactStaticBuildTriggerMatrixTemplateSource
  damageType: Extract<
    CompactStaticBuildSourceDamageType,
    "anomaly" | "disorder"
  >
  sourceType?: CompactStaticBuildSourceType
  sourceId?: string
  sourceStableKey?: string
  sourceViewId?: string
  sourceViewResolutionMode?: CompactStaticBuildSourceDamageViewResolutionMode
}

export interface CompactStaticBuildTriggerMatrixSummary {
  rowCount: number
  mainFormulaCount: number
  sourceViewCount: number
  supportedCount: number
  unsupportedCount: number
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
  assumptions?: string[]
  rows: StaticBuildCompactTriggerMatrixRow[]
}

export interface StaticBuildCompactSourceDamageViewEntry {
  id: string
  label: string
  metadata: CompactStaticBuildSourceDamageViewMeta
  supported: boolean
  sourceType: CompactStaticBuildSourceType
  sourceId: string
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
  assumptions?: string[]
  damage?: CompactStaticBuildEntryDamageSummary
  summary?: CompactStaticBuildResolveSummary
  build?: CompactStaticBuildResult
}

export interface CompactStaticBuildSourceDamageViewGroupSummary {
  key: StaticBuildSourceDamageViewGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: CompactStaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildSourceDamageViewsSummary {
  entryCount: number
  standaloneCount: number
  deltaCount: number
  triggerCount: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: CompactStaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildSourceDamageViewGroupSummary[]
}

export interface StaticBuildCompactSourceUtilityViewEntry {
  id: string
  label: string
  metadata: CompactStaticBuildSourceUtilityViewMeta
  supported: boolean
  sourceType: CompactStaticBuildSourceType
  sourceId: string
  utilityType: CompactStaticBuildSourceUtilityType
  resolutionMode: CompactStaticBuildSourceUtilityResolutionMode
  targetScope: CompactStaticBuildSourceUtilityTargetScope
  requirements?: CompactStaticBuildSourceUtilityViewRequirement[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  value: number
  unit: CompactStaticBuildSourceUtilityUnit
  triggerLabel?: string
  conditionLabel?: string
  cooldownSeconds?: number
  summary: CompactStaticBuildSourceUtilityViewEntrySummary
  diagnostics?: CompactStaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: CompactStaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  effectSummary: CompactStaticBuildSourceUtilityViewEffectSummaryItem[]
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: string[]
}

export type StaticBuildCompactSourceEntry =
  | StaticBuildCompactSourceDamageViewEntry
  | StaticBuildCompactSourceUtilityViewEntry

export interface CompactStaticBuildSourceUtilityViewEntrySummary {
  value: number
  unit: CompactStaticBuildSourceUtilityUnit
  resolutionMode: CompactStaticBuildSourceUtilityResolutionMode
  targetScope: CompactStaticBuildSourceUtilityTargetScope
  requirementCount: number
  hasUnsatisfiedRequirements: boolean
  diagnosticCount: number
  sourceNoteCount: number
  assumptionCount: number
  hasUnsupported: boolean
}

export interface CompactStaticBuildEntryDamageSummary {
  expected: number
  crit: number
  noCrit: number
}

export interface CompactStaticBuildSourceDamageViewMeta {
  canonicalLabel: string
  stableKey: string
  entryKind: "source-damage-view"
  damageType: Extract<
    CompactStaticBuildSourceDamageType,
    "anomaly" | "disorder"
  >
  resolutionMode: CompactStaticBuildSourceDamageViewResolutionMode
}

export interface CompactStaticBuildSourceUtilityViewMeta {
  canonicalLabel: string
  stableKey: string
  entryKind: "source-utility-view"
  utilityType: CompactStaticBuildSourceUtilityType
  resolutionMode: CompactStaticBuildSourceUtilityResolutionMode
  targetScope: CompactStaticBuildSourceUtilityTargetScope
  unit: CompactStaticBuildSourceUtilityUnit
}

export interface CompactStaticBuildSourceEntryGroupSummary {
  key: StaticBuildSourceEntryGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: CompactStaticBuildSourceEntryEffectSummaryItem[]
  sourceDamageRequirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildSourceEntryCollectionSummary {
  entryCount: number
  sourceDamageViewCount: number
  sourceUtilityViewCount: number
  supportedCount: number
  unsupportedCount: number
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
  assumptions?: string[]
  entries: StaticBuildCompactSourceEntry[]
}

export interface CompactStaticBuildSourceUtilityViewGroupSummary {
  key: StaticBuildSourceUtilityViewGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: CompactStaticBuildSourceUtilityViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildSourceUtilityViewsSummary {
  entryCount: number
  triggerCount: number
  rateCount: number
  supportedCount: number
  unsupportedCount: number
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
  assumptions?: string[]
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
  assumptions?: string[]
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
  summary: ResolveStaticBuildSkillMatrixResult["summary"],
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
  summary: ResolveStaticBuildTriggerMatrixResult["summary"],
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
  damage:
    | NonNullable<StaticBuildTriggerMatrixRow["damage"]>
    | NonNullable<StaticBuildSourceDamageViewEntry["damage"]>,
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
  summary: ResolveStaticBuildSourceEntriesResult["summary"],
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
  summary: ResolveStaticBuildSourceDamageViewsResult["summary"],
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
  metadata: StaticBuildSourceDamageViewEntry["metadata"],
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
  summary: ResolveStaticBuildSourceUtilityViewsResult["summary"],
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
  summary: StaticBuildSourceUtilityViewEntry["summary"],
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
  metadata: StaticBuildSourceUtilityViewEntry["metadata"],
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

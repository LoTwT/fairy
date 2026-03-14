import type {
  AnomalyDamageParams,
  DamageResult,
  DisorderDamageParams,
  NormalDamageParams,
  SheerDamageParams,
} from "../calculator/types.js"
import type {
  ResolveStaticBuildResult,
  ResolveStaticBuildSkillMatrixResult,
  ResolveStaticBuildSourceDamageViewsResult,
  ResolveStaticBuildSourceEntriesResult,
  ResolveStaticBuildSourceUtilityViewsResult,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildAssumptionSummary,
  StaticBuildCaveatSummary,
  StaticBuildDiagnosticEntry,
  StaticBuildDiagnosticSummary,
  StaticBuildEntryCaveatSummary,
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
  StaticBuildSourceDamageViewRequirementKind,
  StaticBuildSourceEntry,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceNoteSummary,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildSourceUtilityViewRequirementKind,
  StaticBuildTriggerMatrixRow,
  StaticBuildTriggerMatrixRowMeta,
} from "./types.js"

export interface CompactStaticBuildResult {
  profile: ResolveStaticBuildResult["profile"]
  mode: ResolveStaticBuildResult["mode"]
  manualBaseMode?: ResolveStaticBuildResult["manualBaseMode"]
  loadout: StaticBuildResolvedLoadout
  summary: CompactStaticBuildResolveSummary
  effectSummary: StaticBuildResolveEffectSummaryItem[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  resolvedPanel: StaticBuildResolvedPanel
  resolvedBuckets: StaticBuildResolvedBuckets
  damage: {
    expected: DamageResult
    crit: DamageResult
    noCrit: DamageResult
  }
  diagnostics?: StaticBuildDiagnosticEntry[]
  sourceNotes?: StaticBuildSourceNoteEntry[]
  assumptions?: string[]
  unsupportedEffects?: string[]
  damageParams?:
    | NormalDamageParams
    | SheerDamageParams
    | AnomalyDamageParams
    | DisorderDamageParams
  trace?: ResolveStaticBuildResult["trace"]
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
  diagnosticGroups: StaticBuildResolveSummary["diagnosticGroups"]
  sourceNoteGroups: StaticBuildResolveSummary["sourceNoteGroups"]
}

export interface CompactStaticBuildDiagnosticSummary {
  count: number
  hasDiagnostics: boolean
  hasDefaultedInput: boolean
  hasCoverageGap: boolean
  hasUnsupportedEffect: boolean
  hasFallback: boolean
  kindGroups: StaticBuildDiagnosticSummary["kindGroups"]
  ownerGroups: StaticBuildDiagnosticSummary["ownerGroups"]
}

export interface CompactStaticBuildSourceNoteSummary {
  count: number
  hasSourceNotes: boolean
  hasMissingInput: boolean
  hasProcessOnly: boolean
  hasResearchOnly: boolean
  statusGroups: StaticBuildSourceNoteSummary["statusGroups"]
  ownerGroups: StaticBuildSourceNoteSummary["ownerGroups"]
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

export interface StaticBuildCompactSkillMatrixRow {
  id: string
  group: string
  label: string
  metadata: StaticBuildSkillMatrixRowMeta
  skillTag: StaticBuildSkillMatrixRow["skillTag"]
  damageType: StaticBuildSkillMatrixRow["damageType"]
  attribute: StaticBuildSkillMatrixRow["attribute"]
  combatTags: string[]
  skillMultiplier: string
  damage: StaticBuildSkillMatrixRowDamageSummary
  summary: CompactStaticBuildResolveSummary
  resolvedBuckets: StaticBuildResolvedBuckets
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  requirementSummary: StaticBuildSkillMatrixRow["requirementSummary"]
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  assumptions?: string[]
  unsupportedEffects?: string[]
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildSkillMatrixResult {
  profile: ResolveStaticBuildSkillMatrixResult["profile"]
  mode: ResolveStaticBuildSkillMatrixResult["mode"]
  manualBaseMode?: ResolveStaticBuildSkillMatrixResult["manualBaseMode"]
  loadout: ResolveStaticBuildSkillMatrixResult["loadout"]
  summary: CompactStaticBuildSkillMatrixSummary
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  caveatSummary: CompactStaticBuildCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptions?: string[]
  unsupportedEffects?: string[]
  rows: StaticBuildCompactSkillMatrixRow[]
}

export interface CompactStaticBuildSkillMatrixGroupSummary {
  key: string
  label: string
  count: number
  commonBuckets: Record<string, number>
  variableBuckets: string[]
  commonFormulaMultipliers: Record<string, number>
  variableFormulaMultipliers: string[]
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
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
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
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
    profile: build.profile,
    mode: build.mode,
    manualBaseMode: build.manualBaseMode,
    loadout: build.loadout,
    summary: compactStaticBuildResolveSummary(build.summary),
    effectSummary: build.effectSummary,
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
    resolvedPanel: build.resolvedPanel,
    resolvedBuckets: build.resolvedBuckets,
    damage: build.damage,
    ...(includeDetails
      ? {
          assumptions: build.assumptions,
          unsupportedEffects: build.unsupportedEffects,
          diagnostics: build.diagnostics,
          sourceNotes: build.sourceNotes,
          damageParams: build.damageParams,
          trace: build.trace,
        }
      : {}),
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
    diagnosticGroups: summary.diagnosticGroups,
    sourceNoteGroups: summary.sourceNoteGroups,
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
    kindGroups: summary.kindGroups,
    ownerGroups: summary.ownerGroups,
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
    statusGroups: summary.statusGroups,
    ownerGroups: summary.ownerGroups,
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

export interface StaticBuildCompactTriggerMatrixRow {
  id: string
  label: string
  supported: boolean
  metadata: StaticBuildTriggerMatrixRowMeta
  effectSummary: StaticBuildTriggerMatrixRow["effectSummary"]
  requirements?: StaticBuildTriggerMatrixRow["requirements"]
  requirementSummary: StaticBuildTriggerMatrixRow["requirementSummary"]
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: string[]
  damage?: NonNullable<StaticBuildTriggerMatrixRow["damage"]>
  summary?: CompactStaticBuildResolveSummary
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildTriggerMatrixGroupSummary {
  key: StaticBuildTriggerMatrixEntryKind
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
}

export interface CompactStaticBuildTriggerMatrixSummary {
  rowCount: number
  mainFormulaCount: number
  sourceViewCount: number
  supportedCount: number
  unsupportedCount: number
  hasSourceViews: boolean
  effectSummary: StaticBuildTriggerMatrixEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildTriggerMatrixGroupSummary[]
}

export interface CompactStaticBuildTriggerMatrixResult {
  profile: ResolveStaticBuildTriggerMatrixResult["profile"]
  mode: ResolveStaticBuildTriggerMatrixResult["mode"]
  manualBaseMode?: ResolveStaticBuildTriggerMatrixResult["manualBaseMode"]
  loadout: ResolveStaticBuildTriggerMatrixResult["loadout"]
  summary: CompactStaticBuildTriggerMatrixSummary
  effectSummary: ResolveStaticBuildTriggerMatrixResult["effectSummary"]
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
  metadata: StaticBuildSourceDamageViewEntry["metadata"]
  supported: boolean
  sourceType: StaticBuildSourceDamageViewEntry["sourceType"]
  sourceId: string
  damageType: StaticBuildSourceDamageViewEntry["damageType"]
  resolutionMode: StaticBuildSourceDamageViewEntry["resolutionMode"]
  requirements?: StaticBuildSourceDamageViewEntry["requirements"]
  requirementSummary: StaticBuildSourceDamageViewEntry["requirementSummary"]
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  effectSummary: StaticBuildSourceDamageViewEntry["effectSummary"]
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: string[]
  damage?: NonNullable<StaticBuildSourceDamageViewEntry["damage"]>
  summary?: CompactStaticBuildResolveSummary
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildSourceDamageViewGroupSummary {
  key: StaticBuildSourceDamageViewGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceDamageViewRequirementSummary
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
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
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
  metadata: StaticBuildSourceUtilityViewEntry["metadata"]
  supported: boolean
  sourceType: StaticBuildSourceUtilityViewEntry["sourceType"]
  sourceId: string
  utilityType: StaticBuildSourceUtilityViewEntry["utilityType"]
  resolutionMode: StaticBuildSourceUtilityViewEntry["resolutionMode"]
  targetScope: StaticBuildSourceUtilityViewEntry["targetScope"]
  requirements?: StaticBuildSourceUtilityViewEntry["requirements"]
  requirementSummary: StaticBuildSourceUtilityViewEntry["requirementSummary"]
  value: number
  unit: StaticBuildSourceUtilityViewEntry["unit"]
  triggerLabel?: string
  conditionLabel?: string
  cooldownSeconds?: number
  summary: CompactStaticBuildSourceUtilityViewEntrySummary
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  effectSummary: StaticBuildSourceUtilityViewEntry["effectSummary"]
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: string[]
}

export type StaticBuildCompactSourceEntry =
  | StaticBuildCompactSourceDamageViewEntry
  | StaticBuildCompactSourceUtilityViewEntry

export interface CompactStaticBuildSourceUtilityViewEntrySummary {
  value: number
  unit: StaticBuildSourceUtilityViewEntry["unit"]
  resolutionMode: StaticBuildSourceUtilityViewEntry["resolutionMode"]
  targetScope: StaticBuildSourceUtilityViewEntry["targetScope"]
  requirementCount: number
  hasUnsatisfiedRequirements: boolean
  diagnosticCount: number
  sourceNoteCount: number
  assumptionCount: number
  hasUnsupported: boolean
}

export interface CompactStaticBuildSourceEntryGroupSummary {
  key: StaticBuildSourceEntryGroupKey
  label: string
  count: number
  supportedCount: number
  unsupportedCount: number
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  sourceDamageRequirementSummary: StaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: StaticBuildSourceUtilityViewRequirementSummary
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
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  sourceDamageRequirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  sourceUtilityRequirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildSourceEntryGroupSummary[]
}

export interface CompactStaticBuildSourceEntryCollection {
  loadout: ResolveStaticBuildSourceEntriesResult["loadout"]
  summary: CompactStaticBuildSourceEntryCollectionSummary
  effectSummary: ResolveStaticBuildSourceEntriesResult["effectSummary"]
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
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: StaticBuildSourceUtilityViewRequirementSummary
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
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceUtilityViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  groups: CompactStaticBuildSourceUtilityViewGroupSummary[]
}

export interface CompactStaticBuildSourceDamageViewsResult {
  mode: ResolveStaticBuildSourceDamageViewsResult["mode"]
  manualBaseMode?: ResolveStaticBuildSourceDamageViewsResult["manualBaseMode"]
  loadout: ResolveStaticBuildSourceDamageViewsResult["loadout"]
  summary: CompactStaticBuildSourceDamageViewsSummary
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: CompactStaticBuildSourceDamageViewRequirementSummary
  caveatSummary: CompactStaticBuildEntryCaveatSummary
  diagnosticSummary: CompactStaticBuildDiagnosticSummary
  sourceNoteSummary: CompactStaticBuildSourceNoteSummary
  assumptionSummary: CompactStaticBuildAssumptionSummary
  assumptions?: string[]
  entries: StaticBuildCompactSourceDamageViewEntry[]
}

export interface CompactStaticBuildSourceUtilityViewsResult {
  loadout: ResolveStaticBuildSourceUtilityViewsResult["loadout"]
  summary: CompactStaticBuildSourceUtilityViewsSummary
  effectSummary: ResolveStaticBuildSourceUtilityViewsResult["effectSummary"]
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
    profile: matrix.profile,
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: matrix.loadout,
    summary: compactStaticBuildSkillMatrixSummary(
      matrix.summary,
      includeDetails,
    ),
    effectSummary: matrix.effectSummary,
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
      effectSummary: group.effectSummary,
      requirementSummary: group.requirementSummary,
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
    metadata: row.metadata,
    skillTag: row.skillTag,
    damageType: row.damageType,
    attribute: row.attribute,
    combatTags: row.combatTags,
    skillMultiplier: row.skillMultiplier,
    damage: row.damageSummary,
    summary: compactStaticBuildResolveSummary(row.summary),
    resolvedBuckets: row.resolvedBuckets,
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      row.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      row.sourceNoteSummary,
    ),
    requirementSummary: row.requirementSummary,
    assumptionSummary: compactStaticBuildAssumptionSummary(
      row.assumptionSummary,
    ),
    caveatSummary: compactStaticBuildCaveatSummary(row.caveatSummary),
    ...(includeDetails
      ? {
          assumptions: row.assumptions,
          unsupportedEffects: row.unsupportedEffects,
          diagnostics: row.diagnostics,
          sourceNotes: row.sourceNotes,
          build: row.build,
        }
      : {}),
  }
}

export function compactStaticBuildTriggerMatrixResult(
  matrix: ResolveStaticBuildTriggerMatrixResult,
  includeDetails = false,
): CompactStaticBuildTriggerMatrixResult {
  return {
    profile: matrix.profile,
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: matrix.loadout,
    summary: compactStaticBuildTriggerMatrixSummary(matrix.summary),
    effectSummary: matrix.effectSummary,
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
    effectSummary: summary.effectSummary,
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
      effectSummary: group.effectSummary,
      requirementSummary: group.requirementSummary,
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
    metadata: row.metadata,
    effectSummary: row.effectSummary,
    requirementSummary: row.requirementSummary,
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
    damage: row.damage,
    ...(row.summary
      ? {
          summary: compactStaticBuildResolveSummary(row.summary),
        }
      : {}),
    ...(includeDetails
      ? {
          assumptions: row.assumptions,
          requirements: row.requirements,
          diagnostics: row.diagnostics,
          sourceNotes: row.sourceNotes,
          ...(row.build ? { build: row.build } : {}),
        }
      : {}),
  }
}

export function compactStaticBuildSourceEntryCollection(
  collection: ResolveStaticBuildSourceEntriesResult,
  includeDetails = false,
): CompactStaticBuildSourceEntryCollection {
  return {
    loadout: collection.loadout,
    summary: compactStaticBuildSourceEntryCollectionSummary(collection.summary),
    effectSummary: collection.effectSummary,
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
    effectSummary: summary.effectSummary,
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
      effectSummary: group.effectSummary,
      sourceDamageRequirementSummary: group.sourceDamageRequirementSummary,
      sourceUtilityRequirementSummary: group.sourceUtilityRequirementSummary,
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
    loadout: views.loadout,
    summary: compactStaticBuildSourceDamageViewsSummary(views.summary),
    effectSummary: views.effectSummary,
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
    effectSummary: summary.effectSummary,
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
      effectSummary: group.effectSummary,
      requirementSummary: group.requirementSummary,
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
    metadata: entry.metadata,
    supported: entry.supported,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    damageType: entry.damageType,
    resolutionMode: entry.resolutionMode,
    requirementSummary: entry.requirementSummary,
    diagnosticSummary: compactStaticBuildDiagnosticSummary(
      entry.diagnosticSummary,
    ),
    sourceNoteSummary: compactStaticBuildSourceNoteSummary(
      entry.sourceNoteSummary,
    ),
    effectSummary: entry.effectSummary,
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
          requirements: entry.requirements,
          diagnostics: entry.diagnostics,
          sourceNotes: entry.sourceNotes,
          ...(entry.build ? { build: entry.build } : {}),
        }
      : {}),
  }
}

export function compactStaticBuildSourceUtilityViewsResult(
  views: ResolveStaticBuildSourceUtilityViewsResult,
  includeDetails = false,
): CompactStaticBuildSourceUtilityViewsResult {
  return {
    loadout: views.loadout,
    summary: compactStaticBuildSourceUtilityViewsSummary(views.summary),
    effectSummary: views.effectSummary,
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
    effectSummary: summary.effectSummary,
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
      effectSummary: group.effectSummary,
      requirementSummary: group.requirementSummary,
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
    metadata: entry.metadata,
    supported: entry.supported,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    utilityType: entry.utilityType,
    resolutionMode: entry.resolutionMode,
    targetScope: entry.targetScope,
    requirementSummary: entry.requirementSummary,
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
    effectSummary: entry.effectSummary,
    caveatSummary: compactStaticBuildEntryCaveatSummary(entry.caveatSummary),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      entry.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: entry.assumptions,
          requirements: entry.requirements,
          diagnostics: entry.diagnostics,
          sourceNotes: entry.sourceNotes,
        }
      : {}),
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
      requirementSummary: entry.requirementSummary,
      diagnosticSummary: compactStaticBuildDiagnosticSummary(
        entry.diagnosticSummary,
      ),
      sourceNoteSummary: compactStaticBuildSourceNoteSummary(
        entry.sourceNoteSummary,
      ),
      effectSummary: entry.effectSummary,
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
            requirements: entry.requirements,
            diagnostics: entry.diagnostics,
            sourceNotes: entry.sourceNotes,
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
    requirementSummary: entry.requirementSummary,
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
    effectSummary: entry.effectSummary,
    caveatSummary: compactStaticBuildEntryCaveatSummary(entry.caveatSummary),
    assumptionSummary: compactStaticBuildAssumptionSummary(
      entry.assumptionSummary,
    ),
    ...(includeDetails
      ? {
          assumptions: entry.assumptions,
          requirements: entry.requirements,
          diagnostics: entry.diagnostics,
          sourceNotes: entry.sourceNotes,
        }
      : {}),
  }
}

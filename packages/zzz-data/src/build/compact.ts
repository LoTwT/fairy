import type {
  ResolveStaticBuildResult,
  ResolveStaticBuildSkillMatrixResult,
  ResolveStaticBuildSourceDamageViewsResult,
  ResolveStaticBuildSourceEntriesResult,
  ResolveStaticBuildSourceUtilityViewsResult,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildDiagnosticEntry,
  StaticBuildResolvedBuckets,
  StaticBuildSkillMatrixEffectSummaryItem,
  StaticBuildSkillMatrixRow,
  StaticBuildSkillMatrixRowDamageSummary,
  StaticBuildSkillMatrixRowMeta,
  StaticBuildSourceDamageViewEntry,
  StaticBuildSourceEntry,
  StaticBuildSourceEntryCollectionSummary,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildTriggerMatrixRow,
  StaticBuildTriggerMatrixRowMeta,
} from "./types.js"

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
  summary: StaticBuildSkillMatrixRow["summary"]
  resolvedBuckets: StaticBuildResolvedBuckets
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildSkillMatrixRow["diagnosticSummary"]
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSkillMatrixRow["sourceNoteSummary"]
  caveatSummary: StaticBuildSkillMatrixRow["caveatSummary"]
  assumptions: string[]
  unsupportedEffects: string[]
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildSkillMatrixResult {
  profile: ResolveStaticBuildSkillMatrixResult["profile"]
  mode: ResolveStaticBuildSkillMatrixResult["mode"]
  manualBaseMode?: ResolveStaticBuildSkillMatrixResult["manualBaseMode"]
  loadout: ResolveStaticBuildSkillMatrixResult["loadout"]
  summary: ResolveStaticBuildSkillMatrixResult["summary"]
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  caveatSummary: ResolveStaticBuildSkillMatrixResult["caveatSummary"]
  diagnosticSummary: ResolveStaticBuildSkillMatrixResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildSkillMatrixResult["sourceNoteSummary"]
  assumptions: string[]
  unsupportedEffects: string[]
  rows: StaticBuildCompactSkillMatrixRow[]
}

export interface StaticBuildCompactTriggerMatrixRow {
  id: string
  label: string
  supported: boolean
  metadata: StaticBuildTriggerMatrixRowMeta
  requirements: StaticBuildTriggerMatrixRow["requirements"]
  requirementSummary: StaticBuildTriggerMatrixRow["requirementSummary"]
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildTriggerMatrixRow["diagnosticSummary"]
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildTriggerMatrixRow["sourceNoteSummary"]
  assumptionSummary: StaticBuildTriggerMatrixRow["assumptionSummary"]
  assumptions: string[]
  damage?: NonNullable<StaticBuildTriggerMatrixRow["damage"]>
  summary?: StaticBuildTriggerMatrixRow["summary"]
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildTriggerMatrixResult {
  profile: ResolveStaticBuildTriggerMatrixResult["profile"]
  mode: ResolveStaticBuildTriggerMatrixResult["mode"]
  manualBaseMode?: ResolveStaticBuildTriggerMatrixResult["manualBaseMode"]
  loadout: ResolveStaticBuildTriggerMatrixResult["loadout"]
  summary: ResolveStaticBuildTriggerMatrixResult["summary"]
  assumptionSummary: ResolveStaticBuildTriggerMatrixResult["assumptionSummary"]
  assumptions: string[]
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
  requirements: StaticBuildSourceDamageViewEntry["requirements"]
  requirementSummary: StaticBuildSourceDamageViewEntry["requirementSummary"]
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildSourceDamageViewEntry["diagnosticSummary"]
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceDamageViewEntry["sourceNoteSummary"]
  assumptions: string[]
  damage?: NonNullable<StaticBuildSourceDamageViewEntry["damage"]>
  summary?: StaticBuildSourceDamageViewEntry["summary"]
  build?: ResolveStaticBuildResult
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
  requirements: StaticBuildSourceUtilityViewEntry["requirements"]
  requirementSummary: StaticBuildSourceUtilityViewEntry["requirementSummary"]
  value: number
  unit: StaticBuildSourceUtilityViewEntry["unit"]
  triggerLabel?: string
  conditionLabel?: string
  cooldownSeconds?: number
  diagnostics: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildSourceUtilityViewEntry["diagnosticSummary"]
  sourceNotes: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceUtilityViewEntry["sourceNoteSummary"]
  assumptions: string[]
}

export type StaticBuildCompactSourceEntry =
  | StaticBuildCompactSourceDamageViewEntry
  | StaticBuildCompactSourceUtilityViewEntry

export interface CompactStaticBuildSourceEntryCollection {
  loadout: ResolveStaticBuildSourceEntriesResult["loadout"]
  summary: StaticBuildSourceEntryCollectionSummary
  assumptions: string[]
  entries: StaticBuildCompactSourceEntry[]
}

export interface CompactStaticBuildSourceDamageViewsResult {
  mode: ResolveStaticBuildSourceDamageViewsResult["mode"]
  manualBaseMode?: ResolveStaticBuildSourceDamageViewsResult["manualBaseMode"]
  loadout: ResolveStaticBuildSourceDamageViewsResult["loadout"]
  summary: ResolveStaticBuildSourceDamageViewsResult["summary"]
  assumptions: string[]
  entries: StaticBuildCompactSourceDamageViewEntry[]
}

export interface CompactStaticBuildSourceUtilityViewsResult {
  loadout: ResolveStaticBuildSourceUtilityViewsResult["loadout"]
  summary: ResolveStaticBuildSourceUtilityViewsResult["summary"]
  assumptions: string[]
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
    summary: matrix.summary,
    effectSummary: matrix.effectSummary,
    caveatSummary: matrix.caveatSummary,
    diagnosticSummary: matrix.diagnosticSummary,
    sourceNoteSummary: matrix.sourceNoteSummary,
    assumptions: matrix.assumptions,
    unsupportedEffects: matrix.unsupportedEffects,
    rows: matrix.rows.map((row) =>
      compactStaticBuildSkillMatrixRow(row, includeDetails),
    ),
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
    summary: row.summary,
    resolvedBuckets: row.resolvedBuckets,
    diagnostics: row.diagnostics,
    diagnosticSummary: row.diagnosticSummary,
    sourceNotes: row.sourceNotes,
    sourceNoteSummary: row.sourceNoteSummary,
    caveatSummary: row.caveatSummary,
    assumptions: row.assumptions,
    unsupportedEffects: row.unsupportedEffects,
    ...(includeDetails ? { build: row.build } : {}),
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
    summary: matrix.summary,
    assumptionSummary: matrix.assumptionSummary,
    assumptions: matrix.assumptions,
    rows: matrix.rows.map((row) =>
      compactStaticBuildTriggerMatrixRow(row, includeDetails),
    ),
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
    requirements: row.requirements,
    requirementSummary: row.requirementSummary,
    diagnostics: row.diagnostics,
    diagnosticSummary: row.diagnosticSummary,
    sourceNotes: row.sourceNotes,
    sourceNoteSummary: row.sourceNoteSummary,
    assumptionSummary: row.assumptionSummary,
    assumptions: row.assumptions,
    damage: row.damage,
    summary: row.summary,
    ...(includeDetails && row.build ? { build: row.build } : {}),
  }
}

export function compactStaticBuildSourceEntryCollection(
  collection: ResolveStaticBuildSourceEntriesResult,
  includeDetails = false,
): CompactStaticBuildSourceEntryCollection {
  return {
    loadout: collection.loadout,
    summary: collection.summary,
    assumptions: collection.assumptions,
    entries: collection.entries.map((entry) =>
      compactStaticBuildSourceEntry(entry, includeDetails),
    ),
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
    summary: views.summary,
    assumptions: views.assumptions,
    entries: views.entries.map(
      (entry) =>
        compactStaticBuildSourceEntry(
          entry,
          includeDetails,
        ) as StaticBuildCompactSourceDamageViewEntry,
    ),
  }
}

export function compactStaticBuildSourceUtilityViewsResult(
  views: ResolveStaticBuildSourceUtilityViewsResult,
): CompactStaticBuildSourceUtilityViewsResult {
  return {
    loadout: views.loadout,
    summary: views.summary,
    assumptions: views.assumptions,
    entries: views.entries.map(
      (entry) =>
        compactStaticBuildSourceEntry(
          entry,
        ) as StaticBuildCompactSourceUtilityViewEntry,
    ),
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
      requirements: entry.requirements,
      requirementSummary: entry.requirementSummary,
      diagnostics: entry.diagnostics,
      diagnosticSummary: entry.diagnosticSummary,
      sourceNotes: entry.sourceNotes,
      sourceNoteSummary: entry.sourceNoteSummary,
      assumptions: entry.assumptions,
      damage: entry.damage,
      summary: entry.summary,
      ...(includeDetails && entry.build ? { build: entry.build } : {}),
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
    requirements: entry.requirements,
    requirementSummary: entry.requirementSummary,
    value: entry.value,
    unit: entry.unit,
    triggerLabel: entry.triggerLabel,
    conditionLabel: entry.conditionLabel,
    cooldownSeconds: entry.cooldownSeconds,
    diagnostics: entry.diagnostics,
    diagnosticSummary: entry.diagnosticSummary,
    sourceNotes: entry.sourceNotes,
    sourceNoteSummary: entry.sourceNoteSummary,
    assumptions: entry.assumptions,
  }
}

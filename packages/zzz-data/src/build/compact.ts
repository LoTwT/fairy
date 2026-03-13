import type {
  ResolveStaticBuildResult,
  ResolveStaticBuildSkillMatrixResult,
  ResolveStaticBuildSourceEntriesResult,
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
  resolvedBuckets: StaticBuildResolvedBuckets
  diagnostics: StaticBuildDiagnosticEntry[]
  sourceNotes: StaticBuildSourceNoteEntry[]
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
  assumptions: string[]
  rows: StaticBuildCompactSkillMatrixRow[]
}

export interface StaticBuildCompactTriggerMatrixRow {
  id: string
  label: string
  supported: boolean
  metadata: StaticBuildTriggerMatrixRowMeta
  requirements: StaticBuildTriggerMatrixRow["requirements"]
  diagnostics: StaticBuildDiagnosticEntry[]
  sourceNotes: StaticBuildSourceNoteEntry[]
  assumptions: string[]
  damage?: NonNullable<StaticBuildTriggerMatrixRow["damage"]>
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildTriggerMatrixResult {
  profile: ResolveStaticBuildTriggerMatrixResult["profile"]
  mode: ResolveStaticBuildTriggerMatrixResult["mode"]
  manualBaseMode?: ResolveStaticBuildTriggerMatrixResult["manualBaseMode"]
  loadout: ResolveStaticBuildTriggerMatrixResult["loadout"]
  summary: ResolveStaticBuildTriggerMatrixResult["summary"]
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
  diagnostics: StaticBuildDiagnosticEntry[]
  sourceNotes: StaticBuildSourceNoteEntry[]
  assumptions: string[]
  damage?: NonNullable<StaticBuildSourceDamageViewEntry["damage"]>
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
  value: number
  unit: StaticBuildSourceUtilityViewEntry["unit"]
  triggerLabel?: string
  conditionLabel?: string
  cooldownSeconds?: number
  diagnostics: StaticBuildDiagnosticEntry[]
  sourceNotes: StaticBuildSourceNoteEntry[]
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
    assumptions: matrix.assumptions,
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
    resolvedBuckets: row.resolvedBuckets,
    diagnostics: row.diagnostics,
    sourceNotes: row.sourceNotes,
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
    diagnostics: row.diagnostics,
    sourceNotes: row.sourceNotes,
    assumptions: row.assumptions,
    damage: row.damage,
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
      diagnostics: entry.diagnostics,
      sourceNotes: entry.sourceNotes,
      assumptions: entry.assumptions,
      damage: entry.damage,
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
    value: entry.value,
    unit: entry.unit,
    triggerLabel: entry.triggerLabel,
    conditionLabel: entry.conditionLabel,
    cooldownSeconds: entry.cooldownSeconds,
    diagnostics: entry.diagnostics,
    sourceNotes: entry.sourceNotes,
    assumptions: entry.assumptions,
  }
}

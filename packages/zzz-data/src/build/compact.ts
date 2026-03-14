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
  StaticBuildDiagnosticEntry,
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
  StaticBuildSourceEntry,
  StaticBuildSourceEntryCollectionSummary,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildTriggerMatrixRow,
  StaticBuildTriggerMatrixRowMeta,
} from "./types.js"

export interface CompactStaticBuildResult {
  profile: ResolveStaticBuildResult["profile"]
  mode: ResolveStaticBuildResult["mode"]
  manualBaseMode?: ResolveStaticBuildResult["manualBaseMode"]
  loadout: StaticBuildResolvedLoadout
  summary: StaticBuildResolveSummary
  effectSummary: StaticBuildResolveEffectSummaryItem[]
  diagnosticSummary: ResolveStaticBuildResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildResult["sourceNoteSummary"]
  assumptionSummary: ResolveStaticBuildResult["assumptionSummary"]
  caveatSummary: ResolveStaticBuildResult["caveatSummary"]
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
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildSkillMatrixRow["diagnosticSummary"]
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSkillMatrixRow["sourceNoteSummary"]
  requirementSummary: StaticBuildSkillMatrixRow["requirementSummary"]
  assumptionSummary: StaticBuildSkillMatrixRow["assumptionSummary"]
  caveatSummary: StaticBuildSkillMatrixRow["caveatSummary"]
  assumptions?: string[]
  unsupportedEffects?: string[]
  build?: ResolveStaticBuildResult
}

export interface CompactStaticBuildSkillMatrixResult {
  profile: ResolveStaticBuildSkillMatrixResult["profile"]
  mode: ResolveStaticBuildSkillMatrixResult["mode"]
  manualBaseMode?: ResolveStaticBuildSkillMatrixResult["manualBaseMode"]
  loadout: ResolveStaticBuildSkillMatrixResult["loadout"]
  summary: ResolveStaticBuildSkillMatrixResult["summary"]
  effectSummary: StaticBuildSkillMatrixEffectSummaryItem[]
  requirementSummary: ResolveStaticBuildSkillMatrixResult["requirementSummary"]
  assumptionSummary: ResolveStaticBuildSkillMatrixResult["assumptionSummary"]
  caveatSummary: ResolveStaticBuildSkillMatrixResult["caveatSummary"]
  diagnosticSummary: ResolveStaticBuildSkillMatrixResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildSkillMatrixResult["sourceNoteSummary"]
  assumptions?: string[]
  unsupportedEffects?: string[]
  rows: StaticBuildCompactSkillMatrixRow[]
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
    summary: build.summary,
    effectSummary: build.effectSummary,
    diagnosticSummary: build.diagnosticSummary,
    sourceNoteSummary: build.sourceNoteSummary,
    assumptionSummary: build.assumptionSummary,
    caveatSummary: build.caveatSummary,
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

export interface StaticBuildCompactTriggerMatrixRow {
  id: string
  label: string
  supported: boolean
  metadata: StaticBuildTriggerMatrixRowMeta
  effectSummary: StaticBuildTriggerMatrixRow["effectSummary"]
  requirements?: StaticBuildTriggerMatrixRow["requirements"]
  requirementSummary: StaticBuildTriggerMatrixRow["requirementSummary"]
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildTriggerMatrixRow["diagnosticSummary"]
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildTriggerMatrixRow["sourceNoteSummary"]
  caveatSummary: StaticBuildTriggerMatrixRow["caveatSummary"]
  assumptionSummary: StaticBuildTriggerMatrixRow["assumptionSummary"]
  assumptions?: string[]
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
  effectSummary: ResolveStaticBuildTriggerMatrixResult["effectSummary"]
  requirementSummary: ResolveStaticBuildTriggerMatrixResult["requirementSummary"]
  caveatSummary: ResolveStaticBuildTriggerMatrixResult["caveatSummary"]
  diagnosticSummary: ResolveStaticBuildTriggerMatrixResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildTriggerMatrixResult["sourceNoteSummary"]
  assumptionSummary: ResolveStaticBuildTriggerMatrixResult["assumptionSummary"]
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
  diagnosticSummary: StaticBuildSourceDamageViewEntry["diagnosticSummary"]
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceDamageViewEntry["sourceNoteSummary"]
  effectSummary: StaticBuildSourceDamageViewEntry["effectSummary"]
  caveatSummary: StaticBuildSourceDamageViewEntry["caveatSummary"]
  assumptionSummary: StaticBuildSourceDamageViewEntry["assumptionSummary"]
  assumptions?: string[]
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
  requirements?: StaticBuildSourceUtilityViewEntry["requirements"]
  requirementSummary: StaticBuildSourceUtilityViewEntry["requirementSummary"]
  value: number
  unit: StaticBuildSourceUtilityViewEntry["unit"]
  triggerLabel?: string
  conditionLabel?: string
  cooldownSeconds?: number
  summary: StaticBuildSourceUtilityViewEntry["summary"]
  diagnostics?: StaticBuildDiagnosticEntry[]
  diagnosticSummary: StaticBuildSourceUtilityViewEntry["diagnosticSummary"]
  sourceNotes?: StaticBuildSourceNoteEntry[]
  sourceNoteSummary: StaticBuildSourceUtilityViewEntry["sourceNoteSummary"]
  effectSummary: StaticBuildSourceUtilityViewEntry["effectSummary"]
  caveatSummary: StaticBuildSourceUtilityViewEntry["caveatSummary"]
  assumptionSummary: StaticBuildSourceUtilityViewEntry["assumptionSummary"]
  assumptions?: string[]
}

export type StaticBuildCompactSourceEntry =
  | StaticBuildCompactSourceDamageViewEntry
  | StaticBuildCompactSourceUtilityViewEntry

export interface CompactStaticBuildSourceEntryCollection {
  loadout: ResolveStaticBuildSourceEntriesResult["loadout"]
  summary: StaticBuildSourceEntryCollectionSummary
  effectSummary: ResolveStaticBuildSourceEntriesResult["effectSummary"]
  sourceDamageRequirementSummary: ResolveStaticBuildSourceEntriesResult["sourceDamageRequirementSummary"]
  sourceUtilityRequirementSummary: ResolveStaticBuildSourceEntriesResult["sourceUtilityRequirementSummary"]
  caveatSummary: ResolveStaticBuildSourceEntriesResult["caveatSummary"]
  diagnosticSummary: ResolveStaticBuildSourceEntriesResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildSourceEntriesResult["sourceNoteSummary"]
  assumptionSummary: ResolveStaticBuildSourceEntriesResult["assumptionSummary"]
  assumptions?: string[]
  entries: StaticBuildCompactSourceEntry[]
}

export interface CompactStaticBuildSourceDamageViewsResult {
  mode: ResolveStaticBuildSourceDamageViewsResult["mode"]
  manualBaseMode?: ResolveStaticBuildSourceDamageViewsResult["manualBaseMode"]
  loadout: ResolveStaticBuildSourceDamageViewsResult["loadout"]
  summary: ResolveStaticBuildSourceDamageViewsResult["summary"]
  effectSummary: StaticBuildSourceDamageViewEffectSummaryItem[]
  requirementSummary: ResolveStaticBuildSourceDamageViewsResult["requirementSummary"]
  caveatSummary: ResolveStaticBuildSourceDamageViewsResult["caveatSummary"]
  diagnosticSummary: ResolveStaticBuildSourceDamageViewsResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildSourceDamageViewsResult["sourceNoteSummary"]
  assumptionSummary: ResolveStaticBuildSourceDamageViewsResult["assumptionSummary"]
  assumptions?: string[]
  entries: StaticBuildCompactSourceDamageViewEntry[]
}

export interface CompactStaticBuildSourceUtilityViewsResult {
  loadout: ResolveStaticBuildSourceUtilityViewsResult["loadout"]
  summary: ResolveStaticBuildSourceUtilityViewsResult["summary"]
  effectSummary: ResolveStaticBuildSourceUtilityViewsResult["effectSummary"]
  requirementSummary: ResolveStaticBuildSourceUtilityViewsResult["requirementSummary"]
  caveatSummary: ResolveStaticBuildSourceUtilityViewsResult["caveatSummary"]
  diagnosticSummary: ResolveStaticBuildSourceUtilityViewsResult["diagnosticSummary"]
  sourceNoteSummary: ResolveStaticBuildSourceUtilityViewsResult["sourceNoteSummary"]
  assumptionSummary: ResolveStaticBuildSourceUtilityViewsResult["assumptionSummary"]
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
    summary: matrix.summary,
    effectSummary: matrix.effectSummary,
    requirementSummary: matrix.requirementSummary,
    assumptionSummary: matrix.assumptionSummary,
    caveatSummary: matrix.caveatSummary,
    diagnosticSummary: matrix.diagnosticSummary,
    sourceNoteSummary: matrix.sourceNoteSummary,
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
    diagnosticSummary: row.diagnosticSummary,
    sourceNoteSummary: row.sourceNoteSummary,
    requirementSummary: row.requirementSummary,
    assumptionSummary: row.assumptionSummary,
    caveatSummary: row.caveatSummary,
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
    summary: matrix.summary,
    effectSummary: matrix.effectSummary,
    requirementSummary: matrix.requirementSummary,
    caveatSummary: matrix.caveatSummary,
    diagnosticSummary: matrix.diagnosticSummary,
    sourceNoteSummary: matrix.sourceNoteSummary,
    assumptionSummary: matrix.assumptionSummary,
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
    diagnosticSummary: row.diagnosticSummary,
    sourceNoteSummary: row.sourceNoteSummary,
    caveatSummary: row.caveatSummary,
    assumptionSummary: row.assumptionSummary,
    damage: row.damage,
    summary: row.summary,
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
    summary: collection.summary,
    effectSummary: collection.effectSummary,
    sourceDamageRequirementSummary: collection.sourceDamageRequirementSummary,
    sourceUtilityRequirementSummary: collection.sourceUtilityRequirementSummary,
    caveatSummary: collection.caveatSummary,
    diagnosticSummary: collection.diagnosticSummary,
    sourceNoteSummary: collection.sourceNoteSummary,
    assumptionSummary: collection.assumptionSummary,
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

export function compactStaticBuildSourceDamageViewsResult(
  views: ResolveStaticBuildSourceDamageViewsResult,
  includeDetails = false,
): CompactStaticBuildSourceDamageViewsResult {
  return {
    mode: views.mode,
    manualBaseMode: views.manualBaseMode,
    loadout: views.loadout,
    summary: views.summary,
    effectSummary: views.effectSummary,
    requirementSummary: views.requirementSummary,
    caveatSummary: views.caveatSummary,
    diagnosticSummary: views.diagnosticSummary,
    sourceNoteSummary: views.sourceNoteSummary,
    assumptionSummary: views.assumptionSummary,
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
    diagnosticSummary: entry.diagnosticSummary,
    sourceNoteSummary: entry.sourceNoteSummary,
    effectSummary: entry.effectSummary,
    caveatSummary: entry.caveatSummary,
    assumptionSummary: entry.assumptionSummary,
    damage: entry.damage,
    summary: entry.summary,
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
    summary: views.summary,
    effectSummary: views.effectSummary,
    requirementSummary: views.requirementSummary,
    caveatSummary: views.caveatSummary,
    diagnosticSummary: views.diagnosticSummary,
    sourceNoteSummary: views.sourceNoteSummary,
    assumptionSummary: views.assumptionSummary,
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
    summary: entry.summary,
    diagnosticSummary: entry.diagnosticSummary,
    sourceNoteSummary: entry.sourceNoteSummary,
    effectSummary: entry.effectSummary,
    caveatSummary: entry.caveatSummary,
    assumptionSummary: entry.assumptionSummary,
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
      diagnosticSummary: entry.diagnosticSummary,
      sourceNoteSummary: entry.sourceNoteSummary,
      effectSummary: entry.effectSummary,
      caveatSummary: entry.caveatSummary,
      assumptionSummary: entry.assumptionSummary,
      damage: entry.damage,
      summary: entry.summary,
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
    summary: entry.summary,
    diagnosticSummary: entry.diagnosticSummary,
    sourceNoteSummary: entry.sourceNoteSummary,
    effectSummary: entry.effectSummary,
    caveatSummary: entry.caveatSummary,
    assumptionSummary: entry.assumptionSummary,
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

import type {
  ResolveStaticBuildSourceEntriesInput,
  ResolveStaticBuildSourceEntriesResult,
  StaticBuildResolvedLoadout,
  StaticBuildSourceEntry,
  StaticBuildSourceEntryCollectionSummary,
  StaticBuildSourceEntryGroupKey,
} from "./types.js"
import {
  summarizeDiagnosticEntries,
  summarizeSourceNoteEntries,
} from "./resolver.js"
import { resolveStaticBuildSourceUtilityViews } from "./utility-views.js"
import { resolveStaticBuildSourceDamageViews } from "./views.js"

const sourceEntryGroupLabels: Record<StaticBuildSourceEntryGroupKey, string> = {
  "source-damage-view": "额外结算条目",
  "source-utility-view": "回能 / utility 条目",
}

export function resolveStaticBuildSourceEntries(
  input: ResolveStaticBuildSourceEntriesInput,
): ResolveStaticBuildSourceEntriesResult {
  const utilityViews = resolveStaticBuildSourceUtilityViews({
    loadout: input.loadout,
    panel: input.panel
      ? {
          energyGenerationRate: input.panel.energyGenerationRate,
          anomalyMastery: input.panel.anomalyMastery,
          anomalyProficiency: input.panel.anomalyProficiency,
        }
      : undefined,
  })

  const entries: StaticBuildSourceEntry[] = [...utilityViews.entries]
  const assumptions = [...utilityViews.assumptions]

  let loadout: StaticBuildResolvedLoadout = utilityViews.loadout

  if (input.scenario) {
    if (
      input.scenario.damageType === "anomaly" ||
      input.scenario.damageType === "disorder"
    ) {
      if (!input.panel) {
        throw new RangeError(
          "panel is required when collecting anomaly / disorder source entries",
        )
      }

      const damageViews = resolveStaticBuildSourceDamageViews({
        loadout: input.loadout,
        panel: input.panel,
        scenario: input.scenario,
        effectOverrides: input.effectOverrides,
      })
      loadout = damageViews.loadout
      entries.push(...damageViews.entries)
      assumptions.push(...damageViews.assumptions)
    } else {
      assumptions.push(
        "当前 source-entry collection 在 normal / sheer 场景下只返回 utility entries，不展开 source damage views。",
      )
    }
  }

  const sortedEntries = entries.toSorted(compareSourceEntries)

  return {
    loadout,
    summary: summarizeSourceEntries(sortedEntries),
    entries: sortedEntries,
    assumptions: [...new Set(assumptions)],
  }
}

function compareSourceEntries(
  left: StaticBuildSourceEntry,
  right: StaticBuildSourceEntry,
) {
  const leftGroupOrder = getSourceEntryGroupOrder(left)
  const rightGroupOrder = getSourceEntryGroupOrder(right)
  if (leftGroupOrder !== rightGroupOrder) {
    return leftGroupOrder - rightGroupOrder
  }

  const sourceTypeCompare = left.sourceType.localeCompare(right.sourceType)
  if (sourceTypeCompare !== 0) {
    return sourceTypeCompare
  }

  const sourceIdCompare = left.sourceId.localeCompare(right.sourceId)
  if (sourceIdCompare !== 0) {
    return sourceIdCompare
  }

  return left.metadata.stableKey.localeCompare(right.metadata.stableKey)
}

function getSourceEntryGroupOrder(entry: StaticBuildSourceEntry) {
  return entry.metadata.entryKind === "source-damage-view" ? 0 : 1
}

function summarizeSourceEntries(
  entries: StaticBuildSourceEntry[],
): StaticBuildSourceEntryCollectionSummary {
  const sourceDamageEntries = entries.filter(
    (entry) => entry.metadata.entryKind === "source-damage-view",
  )
  const sourceUtilityEntries = entries.filter(
    (entry) => entry.metadata.entryKind === "source-utility-view",
  )
  const supportedCount = entries.filter((entry) => entry.supported).length
  const unsupportedCount = entries.length - supportedCount
  const diagnostics = entries.flatMap((entry) => entry.diagnostics)
  const sourceNotes = entries.flatMap((entry) => entry.sourceNotes)

  const groups: StaticBuildSourceEntryCollectionSummary["groups"] = []
  for (const key of [
    "source-damage-view",
    "source-utility-view",
  ] as const satisfies StaticBuildSourceEntryGroupKey[]) {
    const groupEntries = entries.filter(
      (entry) => entry.metadata.entryKind === key,
    )
    if (groupEntries.length === 0) continue
    const groupSupportedCount = groupEntries.filter(
      (entry) => entry.supported,
    ).length
    groups.push({
      key,
      label: sourceEntryGroupLabels[key],
      count: groupEntries.length,
      supportedCount: groupSupportedCount,
      unsupportedCount: groupEntries.length - groupSupportedCount,
    })
  }

  return {
    entryCount: entries.length,
    sourceDamageViewCount: sourceDamageEntries.length,
    sourceUtilityViewCount: sourceUtilityEntries.length,
    supportedCount,
    unsupportedCount,
    isUtilityOnly:
      sourceUtilityEntries.length > 0 && sourceDamageEntries.length === 0,
    diagnosticSummary: summarizeDiagnosticEntries(diagnostics),
    sourceNoteSummary: summarizeSourceNoteEntries(sourceNotes),
    groups,
  }
}

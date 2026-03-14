import type {
  ResolveStaticBuildTriggerMatrixInput,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildEntryCaveatSummary,
  StaticBuildSourceDamageViewEntry,
  StaticBuildTriggerMatrixEntryKind,
  StaticBuildTriggerMatrixRow,
  StaticBuildTriggerMatrixSummary,
} from "./types.js"
import {
  resolveStaticBuildDamage,
  summarizeAssumptions,
  summarizeDiagnosticEntries,
  summarizeSourceNoteEntries,
} from "./resolver.js"
import {
  hasStaticBuildSourceViewCoverage,
  resolveStaticBuildSourceDamageViews,
  summarizeSourceDamageViewRequirements,
  supportedStaticBuildSourceViewAgents,
} from "./views.js"

export const supportedStaticBuildTriggerMatrixAgents =
  supportedStaticBuildSourceViewAgents

const triggerMatrixGroupLabels: Record<
  StaticBuildTriggerMatrixEntryKind,
  string
> = {
  "main-formula": "主公式结算",
  "source-view": "额外来源结算",
}

export function hasStaticBuildTriggerMatrixCoverage(agentId: string) {
  return hasStaticBuildSourceViewCoverage(agentId)
}

export function resolveStaticBuildTriggerMatrix(
  input: ResolveStaticBuildTriggerMatrixInput,
): ResolveStaticBuildTriggerMatrixResult {
  if (
    input.scenario.damageType !== "anomaly" &&
    input.scenario.damageType !== "disorder"
  ) {
    throw new RangeError(
      "trigger-entry matrix only supports anomaly / disorder",
    )
  }

  const build = resolveStaticBuildDamage(input)
  const views = resolveStaticBuildSourceDamageViews(input)

  const rows: StaticBuildTriggerMatrixRow[] = [
    {
      id: `main-formula:${input.scenario.damageType}`,
      label:
        input.scenario.damageType === "anomaly" ? "主异常结算" : "主紊乱结算",
      supported: true,
      metadata: {
        canonicalLabel:
          input.scenario.damageType === "anomaly" ? "主异常结算" : "主紊乱结算",
        stableKey: `main-formula:${input.scenario.damageType}`,
        entryKind: "main-formula",
        templateSource: "main-formula",
        damageType: input.scenario.damageType,
      },
      requirements: [],
      requirementSummary: summarizeSourceDamageViewRequirements([]),
      diagnostics: build.diagnostics,
      diagnosticSummary: summarizeDiagnosticEntries(build.diagnostics),
      sourceNotes: build.sourceNotes,
      sourceNoteSummary: summarizeSourceNoteEntries(build.sourceNotes),
      caveatSummary: summarizeTriggerMatrixRowCaveat(true, build.assumptions),
      assumptionSummary: summarizeAssumptions(build.assumptions),
      assumptions: build.assumptions,
      damage: {
        expected: build.damage.expected.total,
        crit: build.damage.crit.total,
        noCrit: build.damage.noCrit.total,
      },
      summary: build.summary,
      build,
    },
    ...views.entries.map((entry) => toTriggerMatrixRow(entry)),
  ].toSorted(compareTriggerMatrixRows)

  const assumptions = [...new Set([...build.assumptions, ...views.assumptions])]
  const summary = summarizeTriggerMatrixRows(rows, assumptions)

  return {
    profile: build.profile,
    mode: build.mode,
    manualBaseMode: build.manualBaseMode,
    loadout: build.loadout,
    summary,
    caveatSummary: summarizeTriggerMatrixCaveats(rows, assumptions),
    diagnosticSummary: summary.diagnosticSummary,
    sourceNoteSummary: summary.sourceNoteSummary,
    assumptionSummary: summarizeAssumptions(assumptions),
    rows,
    assumptions,
  }
}

function toTriggerMatrixRow(
  entry: StaticBuildSourceDamageViewEntry,
): StaticBuildTriggerMatrixRow {
  return {
    id: `source-view:${entry.id}`,
    label: entry.label,
    supported: entry.supported,
    metadata: {
      canonicalLabel: entry.label,
      stableKey: `source-view:${entry.id}`,
      entryKind: "source-view",
      templateSource: "source-view",
      damageType: entry.damageType === "disorder" ? "disorder" : "anomaly",
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      sourceStableKey: entry.metadata.stableKey,
      sourceViewId: entry.id,
      sourceViewResolutionMode: entry.resolutionMode,
    },
    requirements: entry.requirements,
    requirementSummary: entry.requirementSummary,
    diagnostics: entry.diagnostics,
    diagnosticSummary: entry.diagnosticSummary,
    sourceNotes: entry.sourceNotes,
    sourceNoteSummary: entry.sourceNoteSummary,
    caveatSummary: summarizeTriggerMatrixRowCaveat(
      entry.supported,
      entry.assumptions,
    ),
    assumptionSummary: summarizeAssumptions(entry.assumptions),
    assumptions: entry.assumptions,
    damage: entry.damage,
    summary: entry.summary,
    build: entry.build,
  }
}

function compareTriggerMatrixRows(
  left: StaticBuildTriggerMatrixRow,
  right: StaticBuildTriggerMatrixRow,
) {
  const leftGroupOrder = getTriggerMatrixGroupOrder(left.metadata.entryKind)
  const rightGroupOrder = getTriggerMatrixGroupOrder(right.metadata.entryKind)
  if (leftGroupOrder !== rightGroupOrder) {
    return leftGroupOrder - rightGroupOrder
  }

  return left.metadata.stableKey.localeCompare(right.metadata.stableKey)
}

function getTriggerMatrixGroupOrder(key: StaticBuildTriggerMatrixEntryKind) {
  return key === "main-formula" ? 0 : 1
}

function summarizeTriggerMatrixRows(
  rows: StaticBuildTriggerMatrixRow[],
  assumptions: string[],
): StaticBuildTriggerMatrixSummary {
  const mainFormulaRows = rows.filter(
    (row) => row.metadata.entryKind === "main-formula",
  )
  const sourceViewRows = rows.filter(
    (row) => row.metadata.entryKind === "source-view",
  )
  const supportedCount = rows.filter((row) => row.supported).length
  const unsupportedCount = rows.length - supportedCount
  const diagnostics = rows.flatMap((row) => row.diagnostics)
  const sourceNotes = rows.flatMap((row) => row.sourceNotes)

  const groups: StaticBuildTriggerMatrixSummary["groups"] = []
  for (const key of [
    "main-formula",
    "source-view",
  ] as const satisfies StaticBuildTriggerMatrixEntryKind[]) {
    const groupRows = rows.filter((row) => row.metadata.entryKind === key)
    if (groupRows.length === 0) continue
    const groupSupportedCount = groupRows.filter((row) => row.supported).length
    groups.push({
      key,
      label: triggerMatrixGroupLabels[key],
      count: groupRows.length,
      supportedCount: groupSupportedCount,
      unsupportedCount: groupRows.length - groupSupportedCount,
      requirementSummary: summarizeSourceDamageViewRequirements(
        groupRows.flatMap((row) => row.requirements),
      ),
      caveatSummary: summarizeTriggerMatrixCaveats(
        groupRows,
        groupRows.flatMap((row) => row.assumptions),
      ),
      diagnosticSummary: summarizeDiagnosticEntries(
        groupRows.flatMap((row) => row.diagnostics),
      ),
      sourceNoteSummary: summarizeSourceNoteEntries(
        groupRows.flatMap((row) => row.sourceNotes),
      ),
      assumptionSummary: summarizeAssumptions(
        groupRows.flatMap((row) => row.assumptions),
      ),
    })
  }

  return {
    rowCount: rows.length,
    mainFormulaCount: mainFormulaRows.length,
    sourceViewCount: sourceViewRows.length,
    supportedCount,
    unsupportedCount,
    hasSourceViews: sourceViewRows.length > 0,
    requirementSummary: summarizeSourceDamageViewRequirements(
      rows.flatMap((row) => row.requirements),
    ),
    caveatSummary: summarizeTriggerMatrixCaveats(rows, assumptions),
    diagnosticSummary: summarizeDiagnosticEntries(diagnostics),
    sourceNoteSummary: summarizeSourceNoteEntries(sourceNotes),
    assumptionSummary: summarizeAssumptions(assumptions),
    groups,
  }
}

function summarizeTriggerMatrixCaveats(
  rows: StaticBuildTriggerMatrixRow[],
  assumptions: string[],
): StaticBuildEntryCaveatSummary {
  const unsupportedCount = rows.filter((row) => !row.supported).length

  return {
    assumptionCount: assumptions.length,
    unsupportedCount,
    hasAssumptions: assumptions.length > 0,
    hasUnsupported: unsupportedCount > 0,
  }
}

function summarizeTriggerMatrixRowCaveat(
  supported: boolean,
  assumptions: string[],
): StaticBuildEntryCaveatSummary {
  return {
    assumptionCount: assumptions.length,
    unsupportedCount: supported ? 0 : 1,
    hasAssumptions: assumptions.length > 0,
    hasUnsupported: !supported,
  }
}

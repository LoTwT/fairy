import type {
  ResolveStaticBuildTriggerMatrixInput,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildAgentId,
  StaticBuildAssumptionList,
  StaticBuildEntryCaveatSummary,
  StaticBuildSourceDamageViewEntry,
  StaticBuildTriggerMatrixEffectSummaryItem,
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

const triggerMatrixBucketLabels = {
  attack: "攻击力",
  hp: "生命值",
  sheerForce: "贯穿力",
  anomalyProficiency: "异常精通",
  anomalyMastery: "异常掌控",
  critRate: "暴击率",
  critDamage: "暴击伤害",
  bonusDamageSum: "增伤区",
  skillMultiplierFactor: "技能倍率",
  penetrationRate: "穿透率",
  penetrationValue: "穿透值",
  resistanceReduction: "减抗",
  ignoreResistance: "无视抗性",
  defenseReduction: "减防",
  vulnerabilityBonus: "易伤",
  damageReduction: "减伤",
  stunVulnerability: "失衡易伤",
  nonStunVulnerability: "非失衡易伤",
  sheerBonusSum: "贯穿增伤",
  anomalyBonusDamageSum: "异常增伤",
  anomalyCritRate: "异常暴击率",
  anomalyCritDamage: "异常暴击伤害",
  energyGenerationRate: "能量自动回复",
} as const

export const supportedStaticBuildTriggerMatrixAgents =
  supportedStaticBuildSourceViewAgents

const triggerMatrixGroupLabels: Record<
  StaticBuildTriggerMatrixEntryKind,
  string
> = {
  "main-formula": "主公式结算",
  "source-view": "额外来源结算",
}

export function hasStaticBuildTriggerMatrixCoverage(
  agentId: StaticBuildAgentId,
) {
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

  const mainFormulaRow: StaticBuildTriggerMatrixRow = {
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
    effectSummary: [],
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
  }
  mainFormulaRow.effectSummary = summarizeTriggerMatrixEffects([mainFormulaRow])

  const rows: StaticBuildTriggerMatrixRow[] = [
    mainFormulaRow,
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
    effectSummary: summary.effectSummary,
    requirementSummary: summary.requirementSummary,
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
  const row: StaticBuildTriggerMatrixRow = {
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
    effectSummary: [],
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
  row.effectSummary = summarizeTriggerMatrixEffects([row])
  return row
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
  assumptions: StaticBuildAssumptionList,
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
      effectSummary: summarizeTriggerMatrixEffects(groupRows),
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
    effectSummary: summarizeTriggerMatrixEffects(rows),
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

function summarizeTriggerMatrixEffects(
  rows: StaticBuildTriggerMatrixRow[],
): StaticBuildTriggerMatrixEffectSummaryItem[] {
  const summary = new Map<
    string,
    {
      effectId: string
      sourceName: string
      label: string
      bucketTexts: Set<string>
      valueTexts: Set<string>
      rows: Set<string>
    }
  >()

  for (const row of rows) {
    if (!row.build) continue
    for (const trace of row.build.trace) {
      if (trace.status !== "applied" || !trace.modifiers?.length) continue

      let item = summary.get(trace.effectId)
      if (!item) {
        item = {
          effectId: trace.effectId,
          sourceName: trace.sourceName,
          label: trace.label,
          bucketTexts: new Set<string>(),
          valueTexts: new Set<string>(),
          rows: new Set<string>(),
        }
        summary.set(trace.effectId, item)
      }

      item.rows.add(row.id)
      for (const modifier of trace.modifiers) {
        item.bucketTexts.add(
          triggerMatrixBucketLabels[
            modifier.bucket as keyof typeof triggerMatrixBucketLabels
          ] ?? modifier.bucket,
        )
        item.valueTexts.add(
          formatTriggerMatrixModifier(
            modifier.bucket,
            modifier.value,
            modifier.combine,
          ),
        )
      }
    }
  }

  return [...summary.values()].map((item) => {
    const appliedRowCount = item.rows.size
    const totalRowCount = rows.length
    const appliesToAllRows = appliedRowCount === totalRowCount
    return {
      effectId: item.effectId,
      sourceName: item.sourceName,
      label: item.label,
      bucket: [...item.bucketTexts].join(" + "),
      value: [...item.valueTexts].join("；"),
      appliedRowCount,
      totalRowCount,
      appliesToAllRows,
      condition: appliesToAllRows
        ? "当前矩阵全部生效"
        : `部分条目生效（${appliedRowCount}/${totalRowCount}）`,
    }
  })
}

function formatTriggerMatrixModifier(
  bucket: string,
  value: number,
  combine: string,
) {
  if (combine === "replace") {
    return `设为 ${formatTriggerMatrixValue(bucket, value)}`
  }

  return `${value >= 0 ? "+" : ""}${formatTriggerMatrixValue(bucket, value)}`
}

function formatTriggerMatrixValue(bucket: string, value: number) {
  if (
    bucket === "critRate" ||
    bucket === "critDamage" ||
    bucket === "bonusDamageSum" ||
    bucket === "skillMultiplierFactor" ||
    bucket === "penetrationRate" ||
    bucket === "resistanceReduction" ||
    bucket === "ignoreResistance" ||
    bucket === "vulnerabilityBonus" ||
    bucket === "damageReduction" ||
    bucket === "stunVulnerability" ||
    bucket === "nonStunVulnerability" ||
    bucket === "sheerBonusSum" ||
    bucket === "anomalyBonusDamageSum" ||
    bucket === "anomalyCritRate" ||
    bucket === "anomalyCritDamage" ||
    bucket === "energyGenerationRate"
  ) {
    return `${formatNumber(value * 100)}%`
  }

  return formatNumber(value)
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

function summarizeTriggerMatrixCaveats(
  rows: StaticBuildTriggerMatrixRow[],
  assumptions: StaticBuildAssumptionList,
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
  assumptions: StaticBuildAssumptionList,
): StaticBuildEntryCaveatSummary {
  return {
    assumptionCount: assumptions.length,
    unsupportedCount: supported ? 0 : 1,
    hasAssumptions: assumptions.length > 0,
    hasUnsupported: !supported,
  }
}

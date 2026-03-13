import type {
  ResolveStaticBuildTriggerMatrixInput,
  ResolveStaticBuildTriggerMatrixResult,
  StaticBuildSourceDamageViewEntry,
  StaticBuildTriggerMatrixRow,
} from "./types.js"
import { resolveStaticBuildDamage } from "./resolver.js"
import {
  hasStaticBuildSourceViewCoverage,
  resolveStaticBuildSourceDamageViews,
  supportedStaticBuildSourceViewAgents,
} from "./views.js"

export const supportedStaticBuildTriggerMatrixAgents =
  supportedStaticBuildSourceViewAgents

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
        damageType: input.scenario.damageType,
      },
      requirements: [],
      diagnostics: build.diagnostics,
      sourceNotes: build.sourceNotes,
      assumptions: build.assumptions,
      damage: {
        expected: build.damage.expected.total,
        crit: build.damage.crit.total,
        noCrit: build.damage.noCrit.total,
      },
      build,
    },
    ...views.entries.map((entry) => toTriggerMatrixRow(entry)),
  ]

  return {
    profile: build.profile,
    mode: build.mode,
    manualBaseMode: build.manualBaseMode,
    loadout: build.loadout,
    rows,
    assumptions: [...new Set([...build.assumptions, ...views.assumptions])],
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
      damageType: entry.damageType === "disorder" ? "disorder" : "anomaly",
      sourceViewId: entry.id,
      sourceViewResolutionMode: entry.resolutionMode,
    },
    requirements: entry.requirements,
    diagnostics: entry.diagnostics,
    sourceNotes: entry.sourceNotes,
    assumptions: entry.assumptions,
    damage: entry.damage,
    build: entry.build,
  }
}

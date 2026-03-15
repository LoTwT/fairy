import type { AnomalyType } from "../calculator/types.js"
import type {
  ResolveStaticBuildInput,
  ResolveStaticBuildResult,
  ResolveStaticBuildSourceDamageViewsResult,
  StaticBuildAgentId,
  StaticBuildAssumptionList,
  StaticBuildBaseMode,
  StaticBuildCatalogEntry,
  StaticBuildDriveDiscSetsInput,
  StaticBuildEntryCaveatSummary,
  StaticBuildResolvedLoadout,
  StaticBuildSourceDamageViewEffectSummaryItem,
  StaticBuildSourceDamageViewEntry,
  StaticBuildSourceDamageViewGroupKey,
  StaticBuildSourceDamageViewRequirement,
  StaticBuildSourceDamageViewRequirementKind,
  StaticBuildSourceDamageViewRequirementSummary,
  StaticBuildSourceDamageViewSummary,
} from "./types.js"
import { toBaseResistanceAttribute } from "../terms.js"
import {
  getStaticBuildAgent,
  getStaticBuildDriveDisc,
  getStaticBuildWEngine,
  supportedStaticBuildAgents,
} from "./catalog.js"
import { getStaticBuildSourceNoteEntries } from "./definitions.js"
import {
  resolveStaticBuildDamage,
  summarizeAssumptions,
  summarizeDiagnosticEntries,
  summarizeSourceNoteEntries,
} from "./resolver.js"

const sourceViewAgentIds = ["1091", "1171", "1331", "1401", "1501"] as const
const sourceViewAgentIdSet = new Set<string>(sourceViewAgentIds)

const vivianExflowRatios = {
  ether: [0.0307, 0.0359, 0.0411, 0.0463, 0.0515, 0.0565, 0.0615],
  electric: [0.016, 0.0186, 0.0212, 0.0238, 0.0264, 0.029, 0.032],
  fire: [0.04, 0.0466, 0.0532, 0.0598, 0.0664, 0.073, 0.08],
  physical: [0.0037, 0.0044, 0.0051, 0.0058, 0.0065, 0.007, 0.0075],
  ice: [0.0054, 0.0063, 0.0072, 0.0081, 0.009, 0.0099, 0.0108],
} as const

export const supportedStaticBuildSourceViewAgents = supportedStaticBuildAgents
  .filter((item) => sourceViewAgentIdSet.has(item.id))
  .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))

const sourceDamageViewGroupLabels: Record<
  StaticBuildSourceDamageViewGroupKey,
  string
> = {
  standalone: "独立结算条目",
  delta: "增量结算条目",
}

const sourceDamageViewBucketLabels = {
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

const sourceDamageViewRequirementKinds = [
  "combat-tag",
  "panel-value",
  "scenario-value",
  "dynamic-flag",
  "dynamic-count",
  "dynamic-value",
  "state-flag",
  "state-value",
  "resolved-bucket",
  "resolved-multiplier",
] as const satisfies StaticBuildSourceDamageViewRequirementKind[]

export function hasStaticBuildSourceViewCoverage(agentId: StaticBuildAgentId) {
  return sourceViewAgentIdSet.has(agentId)
}

function resolveBaseMode(input: ResolveStaticBuildInput): StaticBuildBaseMode {
  if (input.mode === "full-buff") return "full-buff"
  if (input.mode === "manual") return input.manualBaseMode ?? "baseline"
  return "baseline"
}

function resolveDriveDiscSets(
  sets: StaticBuildDriveDiscSetsInput,
): Array<StaticBuildCatalogEntry & { pieces: 2 | 4 }> {
  return (sets ?? []).map((set) => {
    const disc = getStaticBuildDriveDisc(set.id)
    if (!disc) {
      throw new RangeError(`Unsupported driveDiscId: ${set.id}`)
    }
    return {
      ...disc,
      pieces: set.pieces,
    }
  })
}

function resolveLoadout(
  input: ResolveStaticBuildInput,
): StaticBuildResolvedLoadout {
  const agent = getStaticBuildAgent(input.loadout.agentId)
  if (!agent) {
    throw new RangeError(`Unsupported agentId: ${input.loadout.agentId}`)
  }

  const wEngine = getStaticBuildWEngine(input.loadout.wEngineId)
  if (input.loadout.wEngineId && !wEngine) {
    throw new RangeError(`Unsupported wEngineId: ${input.loadout.wEngineId}`)
  }
  if (wEngine && wEngine.specialty !== agent.specialty) {
    throw new RangeError(
      `${wEngine.name} specialty=${wEngine.specialty} is incompatible with ${agent.name} specialty=${agent.specialty}`,
    )
  }

  return {
    agent,
    wEngine,
    driveDiscSets: resolveDriveDiscSets(input.loadout.driveDiscSets),
    agentLevel: input.loadout.agentLevel ?? 60,
    agentMindscape: input.loadout.agentMindscape ?? 0,
    coreSkillLevel: input.loadout.coreSkillLevel ?? 7,
    wEngineRefinement: input.loadout.wEngineRefinement ?? 1,
  }
}

export function resolveStaticBuildSourceDamageViews(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildSourceDamageViewsResult {
  const mode = input.mode ?? "baseline"
  const loadout = resolveLoadout(input)
  const entries: StaticBuildSourceDamageViewEntry[] = []

  if (input.loadout.agentId === "1401") {
    entries.push(resolveAlicePolarityAssaultView(input))
  }

  if (input.loadout.agentId === "1091") {
    entries.push(resolveMiyabiFrostburnBreakView(input))
  }

  if (input.loadout.agentId === "1171") {
    entries.push(resolveBurniceEmberView(input))
  }

  if (input.loadout.agentId === "1331") {
    entries.push(resolveVivianExflowView(input))
  }

  if (input.loadout.agentId === "1501") {
    entries.push(resolveAriaExflowView(input))
  }

  const sortedEntries = entries.toSorted(compareSourceDamageViews)
  const summary = summarizeSourceDamageViews(sortedEntries, [])

  return {
    mode,
    manualBaseMode:
      input.mode === "manual" ? resolveBaseMode(input) : undefined,
    loadout,
    summary,
    effectSummary: summary.effectSummary,
    requirementSummary: summary.requirementSummary,
    caveatSummary: summarizeSourceDamageViewCaveats(sortedEntries, []),
    diagnosticSummary: summary.diagnosticSummary,
    sourceNoteSummary: summary.sourceNoteSummary,
    assumptionSummary: summarizeAssumptions([]),
    entries: sortedEntries,
    assumptions: [],
  }
}

function createRequirement(
  kind: StaticBuildSourceDamageViewRequirement["kind"],
  key: string,
  satisfied: boolean,
): StaticBuildSourceDamageViewRequirement {
  return { kind, key, satisfied }
}

export function summarizeSourceDamageViewRequirements(
  requirements: StaticBuildSourceDamageViewRequirement[],
): StaticBuildSourceDamageViewRequirementSummary {
  const satisfiedCount = requirements.filter((item) => item.satisfied).length
  const unsatisfiedCount = requirements.length - satisfiedCount

  return {
    count: requirements.length,
    satisfiedCount,
    unsatisfiedCount,
    hasUnsatisfied: unsatisfiedCount > 0,
    groups: sourceDamageViewRequirementKinds
      .map((key) => {
        const groupItems = requirements.filter((item) => item.kind === key)
        if (groupItems.length === 0) return undefined
        const groupSatisfiedCount = groupItems.filter(
          (item) => item.satisfied,
        ).length
        return {
          key,
          count: groupItems.length,
          satisfiedCount: groupSatisfiedCount,
          unsatisfiedCount: groupItems.length - groupSatisfiedCount,
        }
      })
      .filter(
        (group): group is NonNullable<typeof group> => group !== undefined,
      ),
  }
}

function compareSourceDamageViews(
  left: StaticBuildSourceDamageViewEntry,
  right: StaticBuildSourceDamageViewEntry,
) {
  const leftGroupOrder = getSourceDamageViewGroupOrder(left.resolutionMode)
  const rightGroupOrder = getSourceDamageViewGroupOrder(right.resolutionMode)
  if (leftGroupOrder !== rightGroupOrder) {
    return leftGroupOrder - rightGroupOrder
  }

  return left.metadata.stableKey.localeCompare(right.metadata.stableKey)
}

function getSourceDamageViewGroupOrder(
  key: StaticBuildSourceDamageViewGroupKey,
) {
  return key === "standalone" ? 0 : 1
}

function summarizeSourceDamageViews(
  entries: StaticBuildSourceDamageViewEntry[],
  assumptions: StaticBuildAssumptionList,
): StaticBuildSourceDamageViewSummary {
  const standaloneEntries = entries.filter(
    (entry) => entry.resolutionMode === "standalone",
  )
  const deltaEntries = entries.filter(
    (entry) => entry.resolutionMode === "delta",
  )
  const supportedCount = entries.filter((entry) => entry.supported).length
  const unsupportedCount = entries.length - supportedCount
  const diagnostics = entries.flatMap((entry) => entry.diagnostics)
  const sourceNotes = entries.flatMap((entry) => entry.sourceNotes)

  const groups: StaticBuildSourceDamageViewSummary["groups"] = []
  for (const key of [
    "standalone",
    "delta",
  ] as const satisfies StaticBuildSourceDamageViewGroupKey[]) {
    const groupEntries = entries.filter((entry) => entry.resolutionMode === key)
    if (groupEntries.length === 0) continue
    const groupSupportedCount = groupEntries.filter(
      (entry) => entry.supported,
    ).length
    groups.push({
      key,
      label: sourceDamageViewGroupLabels[key],
      count: groupEntries.length,
      supportedCount: groupSupportedCount,
      unsupportedCount: groupEntries.length - groupSupportedCount,
      effectSummary: summarizeSourceDamageViewEffects(groupEntries),
      requirementSummary: summarizeSourceDamageViewRequirements(
        groupEntries.flatMap((entry) => entry.requirements),
      ),
      caveatSummary: summarizeSourceDamageViewCaveats(
        groupEntries,
        groupEntries.flatMap((entry) => entry.assumptions),
      ),
      diagnosticSummary: summarizeDiagnosticEntries(
        groupEntries.flatMap((entry) => entry.diagnostics),
      ),
      sourceNoteSummary: summarizeSourceNoteEntries(
        groupEntries.flatMap((entry) => entry.sourceNotes),
      ),
      assumptionSummary: summarizeAssumptions(
        groupEntries.flatMap((entry) => entry.assumptions),
      ),
    })
  }

  return {
    entryCount: entries.length,
    standaloneCount: standaloneEntries.length,
    deltaCount: deltaEntries.length,
    supportedCount,
    unsupportedCount,
    effectSummary: summarizeSourceDamageViewEffects(entries),
    requirementSummary: summarizeSourceDamageViewRequirements(
      entries.flatMap((entry) => entry.requirements),
    ),
    caveatSummary: summarizeSourceDamageViewCaveats(entries, assumptions),
    diagnosticSummary: summarizeDiagnosticEntries(diagnostics),
    sourceNoteSummary: summarizeSourceNoteEntries(sourceNotes),
    assumptionSummary: summarizeAssumptions(assumptions),
    groups,
  }
}

export function summarizeSourceDamageViewEffects(
  entries: StaticBuildSourceDamageViewEntry[],
): StaticBuildSourceDamageViewEffectSummaryItem[] {
  const summary = new Map<
    string,
    {
      effectId: string
      sourceName: string
      label: string
      bucketTexts: Set<string>
      valueTexts: Set<string>
      entries: Set<string>
    }
  >()

  for (const entry of entries) {
    if (!entry.build) continue
    for (const trace of entry.build.trace) {
      if (trace.status !== "applied" || !trace.modifiers?.length) continue

      let item = summary.get(trace.effectId)
      if (!item) {
        item = {
          effectId: trace.effectId,
          sourceName: trace.sourceName,
          label: trace.label,
          bucketTexts: new Set<string>(),
          valueTexts: new Set<string>(),
          entries: new Set<string>(),
        }
        summary.set(trace.effectId, item)
      }

      item.entries.add(entry.id)
      for (const modifier of trace.modifiers) {
        item.bucketTexts.add(
          sourceDamageViewBucketLabels[
            modifier.bucket as keyof typeof sourceDamageViewBucketLabels
          ] ?? modifier.bucket,
        )
        item.valueTexts.add(
          formatSourceDamageViewModifier(
            modifier.bucket,
            modifier.value,
            modifier.combine,
          ),
        )
      }
    }
  }

  return [...summary.values()].map((item) => {
    const appliedEntryCount = item.entries.size
    const totalEntryCount = entries.length
    const appliesToAllEntries = appliedEntryCount === totalEntryCount
    return {
      effectId: item.effectId,
      sourceName: item.sourceName,
      label: item.label,
      bucket: [...item.bucketTexts].join(" + "),
      value: [...item.valueTexts].join("；"),
      appliedEntryCount,
      totalEntryCount,
      appliesToAllEntries,
      condition: appliesToAllEntries
        ? "当前条目全部生效"
        : `部分条目生效（${appliedEntryCount}/${totalEntryCount}）`,
    }
  })
}

function formatSourceDamageViewModifier(
  bucket: string,
  value: number,
  combine: string,
) {
  if (combine === "replace") {
    return `设为 ${formatSourceDamageViewValue(bucket, value)}`
  }

  return `${value >= 0 ? "+" : ""}${formatSourceDamageViewValue(bucket, value)}`
}

function formatSourceDamageViewValue(bucket: string, value: number) {
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
    return `${formatSourceDamageViewNumber(value * 100)}%`
  }

  return formatSourceDamageViewNumber(value)
}

function formatSourceDamageViewNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

function summarizeSourceDamageViewCaveats(
  entries: StaticBuildSourceDamageViewEntry[],
  assumptions: StaticBuildAssumptionList,
): StaticBuildEntryCaveatSummary {
  const unsupportedCount = entries.filter((entry) => !entry.supported).length
  return {
    assumptionCount: assumptions.length,
    unsupportedCount,
    hasAssumptions: assumptions.length > 0,
    hasUnsupported: unsupportedCount > 0,
  }
}

function createEntryBase(
  input: ResolveStaticBuildInput,
  entry: Pick<
    StaticBuildSourceDamageViewEntry,
    "id" | "label" | "sourceType" | "sourceId" | "resolutionMode"
  >,
  requirements: StaticBuildSourceDamageViewRequirement[],
): StaticBuildSourceDamageViewEntry {
  const sourceNotes = getStaticBuildSourceNoteEntries({
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    damageType: input.scenario.damageType,
    agentMindscape: input.loadout.agentMindscape ?? 0,
    energyGenerationRate: input.panel.energyGenerationRate,
    anomalyMastery: input.panel.anomalyMastery,
    dynamicSnapshot: input.scenario.dynamicSnapshot,
    stateSnapshot: input.scenario.stateSnapshot,
    resolvedSnapshot: input.scenario.resolvedSnapshot,
    isStunned: input.scenario.enemy.isStunned,
    disorderSourceType:
      input.scenario.damageType === "disorder"
        ? input.scenario.anomalyType
        : undefined,
  })
  return {
    ...entry,
    metadata: {
      canonicalLabel: entry.label,
      stableKey: `source-view:${entry.id}`,
      entryKind: "source-damage-view",
      damageType:
        input.scenario.damageType === "disorder" ? "disorder" : "anomaly",
      resolutionMode: entry.resolutionMode,
    },
    damageType: input.scenario.damageType,
    supported: requirements.every((item) => item.satisfied),
    requirements,
    requirementSummary: summarizeSourceDamageViewRequirements(requirements),
    diagnostics: [],
    diagnosticSummary: summarizeDiagnosticEntries([]),
    sourceNotes,
    sourceNoteSummary: summarizeSourceNoteEntries(sourceNotes),
    effectSummary: [],
    caveatSummary: {
      assumptionCount: 0,
      unsupportedCount: requirements.every((item) => item.satisfied) ? 0 : 1,
      hasAssumptions: false,
      hasUnsupported: !requirements.every((item) => item.satisfied),
    },
    assumptionSummary: summarizeAssumptions([]),
    assumptions: [],
  }
}

function syncEntryAssumptionSummary(entry: StaticBuildSourceDamageViewEntry) {
  entry.diagnosticSummary = summarizeDiagnosticEntries(entry.diagnostics)
  entry.sourceNoteSummary = summarizeSourceNoteEntries(entry.sourceNotes)
  entry.effectSummary = summarizeSourceDamageViewEffects([entry])
  entry.assumptionSummary = summarizeAssumptions(entry.assumptions)
  entry.caveatSummary = summarizeSourceDamageViewCaveats(
    [entry],
    entry.assumptions,
  )
  return entry
}

function toEntryDamage(result: ResolveStaticBuildResult) {
  return {
    expected: result.damage.expected.total,
    crit: result.damage.crit.total,
    noCrit: result.damage.noCrit.total,
  }
}

function withResolvedSkillMultiplierFactor(
  input: ResolveStaticBuildInput,
  factor: number,
): ResolveStaticBuildInput {
  const previous =
    input.scenario.resolvedSnapshot?.multiplierFactors?.skillMultiplierFactor ??
    1

  return {
    ...input,
    scenario: {
      ...input.scenario,
      resolvedSnapshot: {
        ...input.scenario.resolvedSnapshot,
        multiplierFactors: {
          ...input.scenario.resolvedSnapshot?.multiplierFactors,
          skillMultiplierFactor: previous * factor,
        },
      },
    },
  }
}

function resolveVivianSourceAnomalyType(
  input: ResolveStaticBuildInput,
):
  | Extract<AnomalyType, "electric" | "ether" | "fire" | "ice" | "physical">
  | undefined {
  if (input.scenario.damageType === "disorder") {
    switch (input.scenario.anomalyType) {
      case "auricInk":
        return "ether"
      case "frost":
        return "ice"
      default:
        return input.scenario.anomalyType
    }
  }

  if (!input.scenario.attribute) return undefined
  const baseAttribute = toBaseResistanceAttribute(input.scenario.attribute)
  if (
    baseAttribute === "electric" ||
    baseAttribute === "ether" ||
    baseAttribute === "fire" ||
    baseAttribute === "ice" ||
    baseAttribute === "physical"
  ) {
    return baseAttribute
  }

  return undefined
}

function resolveVivianExflowRatio(input: ResolveStaticBuildInput) {
  const sourceAnomalyType = resolveVivianSourceAnomalyType(input)
  if (!sourceAnomalyType) return undefined
  if (input.panel.anomalyProficiency === undefined) return undefined

  const coreSkillLevel = Math.max(
    1,
    Math.min(input.loadout.coreSkillLevel ?? 7, 7),
  )
  const ratioPerTen =
    vivianExflowRatios[sourceAnomalyType][coreSkillLevel - 1] ?? 0
  const baseRatio = ratioPerTen * (input.panel.anomalyProficiency / 10)
  const mindscapeMultiplier = (input.loadout.agentMindscape ?? 0) >= 2 ? 1.3 : 1
  return baseRatio * mindscapeMultiplier
}

function withoutBurniceEmberSnapshot(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildInput {
  const flags = { ...input.scenario.dynamicSnapshot?.flags }
  const counts = { ...input.scenario.dynamicSnapshot?.counts }
  const values = { ...input.scenario.dynamicSnapshot?.values }

  delete flags.burniceEmberState
  delete counts.burniceEmberExtraTriggers
  delete values.burniceEmberDamageRatio

  return {
    ...input,
    scenario: {
      ...input.scenario,
      dynamicSnapshot: {
        ...input.scenario.dynamicSnapshot,
        flags,
        counts,
        values,
      },
    },
  }
}

function resolveAlicePolarityAssaultView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const requirements = [
    createRequirement(
      "state-flag",
      "alicePolarityAssaultState",
      input.scenario.stateSnapshot?.flags?.alicePolarityAssaultState === true,
    ),
    createRequirement(
      "state-value",
      "alicePolarityAssaultDamageRatio",
      input.scenario.stateSnapshot?.values?.alicePolarityAssaultDamageRatio !==
        undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "alice-polarity-assault",
      label: "爱丽丝：[极性强击]",
      sourceType: "agent",
      sourceId: "1401",
      resolutionMode: "standalone",
    },
    requirements,
  )

  if (!entry.supported) {
    entry.assumptions.push(
      "需要通过 scenario.stateSnapshot 显式提供 [极性强击] 的状态与倍率快照。",
    )
    return syncEntryAssumptionSummary(entry)
  }

  const build = resolveStaticBuildDamage(input)
  entry.build = build
  entry.damage = toEntryDamage(build)
  entry.summary = build.summary
  entry.diagnostics = build.diagnostics
  entry.diagnosticSummary = summarizeDiagnosticEntries(build.diagnostics)
  entry.assumptions.push(
    "当前 view 直接复用主 resolver，并按 scenario.stateSnapshot 记录的 [极性强击] 倍率结算。",
  )
  return syncEntryAssumptionSummary(entry)
}

function resolveMiyabiFrostburnBreakView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const ratio =
    input.scenario.stateSnapshot?.values?.miyabiFrostburnBreakDamageRatio
  const requirements = [
    createRequirement(
      "state-flag",
      "miyabiFrostburnBreakState",
      input.scenario.stateSnapshot?.flags?.miyabiFrostburnBreakState === true,
    ),
    createRequirement(
      "state-value",
      "miyabiFrostburnBreakDamageRatio",
      ratio !== undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "miyabi-frostburn-break",
      label: "雅：[霜灼·破]",
      sourceType: "agent",
      sourceId: "1091",
      resolutionMode: "standalone",
    },
    requirements,
  )

  if (!entry.supported || ratio === undefined) {
    entry.assumptions.push(
      "需要通过 scenario.stateSnapshot 显式提供 [霜灼·破] 的状态与倍率快照。",
    )
    return syncEntryAssumptionSummary(entry)
  }

  const build = resolveStaticBuildDamage(
    withResolvedSkillMultiplierFactor(input, ratio),
  )
  entry.build = build
  entry.damage = toEntryDamage(build)
  entry.summary = build.summary
  entry.diagnostics = build.diagnostics
  entry.diagnosticSummary = summarizeDiagnosticEntries(build.diagnostics)
  entry.assumptions.push(
    "当前 view 以 scenario.stateSnapshot 的 [霜灼·破] 倍率快照驱动独立条目结算，不回写主公式。",
  )
  return syncEntryAssumptionSummary(entry)
}

function resolveBurniceEmberView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const requirements = [
    createRequirement(
      "dynamic-flag",
      "burniceEmberState",
      input.scenario.dynamicSnapshot?.flags?.burniceEmberState === true,
    ),
    createRequirement(
      "dynamic-count",
      "burniceEmberExtraTriggers",
      input.scenario.dynamicSnapshot?.counts?.burniceEmberExtraTriggers !==
        undefined,
    ),
    createRequirement(
      "dynamic-value",
      "burniceEmberDamageRatio",
      input.scenario.dynamicSnapshot?.values?.burniceEmberDamageRatio !==
        undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "burnice-ember",
      label: "柏妮思：[燃点]/[余烬]",
      sourceType: "agent",
      sourceId: "1171",
      resolutionMode: "delta",
    },
    requirements,
  )

  if (!entry.supported) {
    entry.assumptions.push(
      "需要通过 scenario.dynamicSnapshot 显式提供 [燃点]/[余烬] 的状态、次数和倍率快照。",
    )
    return syncEntryAssumptionSummary(entry)
  }

  const withSnapshot = resolveStaticBuildDamage(input)
  const withoutSnapshot = resolveStaticBuildDamage(
    withoutBurniceEmberSnapshot(input),
  )
  entry.diagnostics = withSnapshot.diagnostics
  entry.damage = {
    expected:
      withSnapshot.damage.expected.total -
      withoutSnapshot.damage.expected.total,
    crit: withSnapshot.damage.crit.total - withoutSnapshot.damage.crit.total,
    noCrit:
      withSnapshot.damage.noCrit.total - withoutSnapshot.damage.noCrit.total,
  }
  entry.summary = withSnapshot.summary
  entry.assumptions.push(
    "当前 view 使用“含 [余烬] 快照结果 - 去除 [余烬] 快照结果”的差值，表达额外结算的静态贡献。",
  )
  return syncEntryAssumptionSummary(entry)
}

function withoutAriaExflowSnapshot(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildInput {
  const values = { ...input.scenario.dynamicSnapshot?.values }

  delete values.ariaExflowDamageRatio
  delete values.ariaStunnedDamageRatio

  return {
    ...input,
    scenario: {
      ...input.scenario,
      dynamicSnapshot: {
        ...input.scenario.dynamicSnapshot,
        values,
      },
    },
  }
}

function resolveAriaExflowView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const isStunned = input.scenario.enemy.isStunned === true
  const requirements = [
    createRequirement(
      "dynamic-value",
      "ariaExflowDamageRatio",
      input.scenario.dynamicSnapshot?.values?.ariaExflowDamageRatio !==
        undefined,
    ),
    createRequirement(
      "dynamic-value",
      "ariaStunnedDamageRatio",
      !isStunned ||
        input.scenario.dynamicSnapshot?.values?.ariaStunnedDamageRatio !==
          undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "aria-exflow",
      label: "爱芮：[异放]",
      sourceType: "agent",
      sourceId: "1501",
      resolutionMode: "delta",
    },
    requirements,
  )

  if (!entry.supported) {
    entry.assumptions.push(
      isStunned
        ? "目标处于失衡时，需要通过 scenario.dynamicSnapshot 显式提供 [异放] 基础倍率和失衡追加倍率快照。"
        : "需要通过 scenario.dynamicSnapshot 显式提供 [异放] 基础倍率快照。",
    )
    return syncEntryAssumptionSummary(entry)
  }

  const withSnapshot = resolveStaticBuildDamage(input)
  const withoutSnapshot = resolveStaticBuildDamage(
    withoutAriaExflowSnapshot(input),
  )
  entry.diagnostics = withSnapshot.diagnostics
  entry.damage = {
    expected:
      withSnapshot.damage.expected.total -
      withoutSnapshot.damage.expected.total,
    crit: withSnapshot.damage.crit.total - withoutSnapshot.damage.crit.total,
    noCrit:
      withSnapshot.damage.noCrit.total - withoutSnapshot.damage.noCrit.total,
  }
  entry.summary = withSnapshot.summary
  entry.assumptions.push(
    "当前 view 使用“含 [异放] 快照结果 - 去除 [异放] 快照结果”的差值，表达额外结算的静态贡献。",
  )
  return syncEntryAssumptionSummary(entry)
}

function resolveVivianExflowView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const sourceAnomalyType = resolveVivianSourceAnomalyType(input)
  const derivedRatio = resolveVivianExflowRatio(input)
  const requirements = [
    createRequirement(
      "panel-value",
      "anomalyProficiency",
      input.panel.anomalyProficiency !== undefined,
    ),
    createRequirement(
      "scenario-value",
      "sourceAnomalyType",
      sourceAnomalyType !== undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "vivian-exflow",
      label: "薇薇安：[异放]",
      sourceType: "agent",
      sourceId: "1331",
      resolutionMode: "delta",
    },
    requirements,
  )

  if (!entry.supported || derivedRatio === undefined) {
    entry.assumptions.push(
      sourceAnomalyType === undefined
        ? "需要通过 scenario.attribute（anomaly）或 scenario.anomalyType（disorder）显式提供原异常属性，以推导 [异放] 比例。"
        : "需要提供 finalPanel.anomalyProficiency，以推导薇薇安 [异放] 的额外结算比例。",
    )
    return syncEntryAssumptionSummary(entry)
  }

  const withSnapshot = resolveStaticBuildDamage(
    withResolvedSkillMultiplierFactor(input, 1 + derivedRatio),
  )
  const withoutSnapshot = resolveStaticBuildDamage(input)
  entry.diagnostics = withSnapshot.diagnostics
  entry.damage = {
    expected:
      withSnapshot.damage.expected.total -
      withoutSnapshot.damage.expected.total,
    crit: withSnapshot.damage.crit.total - withoutSnapshot.damage.crit.total,
    noCrit:
      withSnapshot.damage.noCrit.total - withoutSnapshot.damage.noCrit.total,
  }
  entry.summary = withSnapshot.summary
  entry.assumptions.push(
    "当前 view 使用“按 coreSkillLevel 与异常精通推导 [异放] 比例后的结果 - 原主结算结果”的差值，表达额外结算的静态贡献。",
  )
  if ((input.loadout.agentMindscape ?? 0) >= 2) {
    entry.assumptions.push(
      "已按影画2将 [异放] 从异常精通中获得的收益提升至原本的 130%。",
    )
  }
  return syncEntryAssumptionSummary(entry)
}

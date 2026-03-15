import type {
  ResolveStaticBuildSourceUtilityViewsInput,
  ResolveStaticBuildSourceUtilityViewsResult,
  StaticBuildAssumptionList,
  StaticBuildCatalogEntry,
  StaticBuildDriveDiscSetsInput,
  StaticBuildEntryCaveatSummary,
  StaticBuildResolvedLoadout,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildSourceUtilityViewGroupKey,
  StaticBuildSourceUtilityViewRequirement,
  StaticBuildSourceUtilityViewRequirementKind,
  StaticBuildSourceUtilityViewRequirementSummary,
  StaticBuildSourceUtilityViewSummary,
  StaticBuildWEngineId,
  StaticBuildWEngineRefinement,
} from "./types.js"
import {
  getCompatibleStaticBuildUtilityWEngines,
  getStaticBuildDriveDisc,
  getStaticBuildUtilityAgent,
  getStaticBuildUtilityWEngine,
  supportedStaticBuildUtilityWEngines,
} from "./catalog.js"
import {
  summarizeAssumptions,
  summarizeDiagnosticEntries,
  summarizeSourceNoteEntries,
} from "./resolver.js"

const utilityViewWEngineIds = [
  "12003",
  "12012",
  "13002",
  "13106",
  "14117",
] as const
const utilityViewWEngineIdSet = new Set<string>(utilityViewWEngineIds)

const lunarNovilunaEnergyRefund = [3, 3.5, 4, 4.5, 5] as const
const magneticStormCharlieEnergyRefund = [3.5, 4, 4.5, 5, 5.5] as const
const timeSliceEnergyRefund = [0.7, 0.8, 0.9, 1.0, 1.1] as const
const timeSliceDecibelGainByTrigger = {
  dodgeCounter: [20, 23, 26, 29, 32] as const,
  enhancedSpecial: [25, 28.5, 32, 35.5, 40] as const,
  assistAttack: [30, 34.5, 39, 43.5, 48] as const,
  chainAttack: [35, 40, 45, 50, 55] as const,
}
const housekeeperOfffieldEnergyRegen = [0.45, 0.52, 0.58, 0.65, 0.72] as const
const flamemakerShakerOfffieldEnergyRegen = [0.6, 0.75, 0.9, 1.05, 1.2] as const

const timeSliceTriggers = [
  {
    key: "dodgeCounter",
    label: "队伍中任意角色发动[闪避反击]",
  },
  {
    key: "enhancedSpecial",
    label: "队伍中任意角色发动[强化特殊技]",
  },
  {
    key: "assistAttack",
    label: "队伍中任意角色发动[支援攻击]",
  },
  {
    key: "chainAttack",
    label: "队伍中任意角色发动[连携技]",
  },
] as const

function byRefinement(
  values: readonly number[],
  refinement: StaticBuildWEngineRefinement,
) {
  const index = Math.max(1, Math.min(refinement, values.length)) - 1
  return values[index] ?? values[values.length - 1] ?? 0
}

export const supportedStaticBuildSourceUtilityViewWEngines =
  supportedStaticBuildUtilityWEngines
    .filter((item) => utilityViewWEngineIdSet.has(item.id))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))

const sourceUtilityViewGroupLabels: Record<
  StaticBuildSourceUtilityViewGroupKey,
  string
> = {
  trigger: "按次触发条目",
  rate: "按速率条目",
}

const sourceUtilityViewRequirementKinds = [
  "trigger",
  "condition",
  "cooldown",
  "panel-value",
] as const satisfies StaticBuildSourceUtilityViewRequirementKind[]

export function hasStaticBuildSourceUtilityViewCoverage(
  wEngineId?: StaticBuildWEngineId,
) {
  return !!wEngineId && utilityViewWEngineIdSet.has(wEngineId)
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
  input: ResolveStaticBuildSourceUtilityViewsInput,
): StaticBuildResolvedLoadout {
  const agent = getStaticBuildUtilityAgent(input.loadout.agentId)
  if (!agent) {
    throw new RangeError(`Unsupported agentId: ${input.loadout.agentId}`)
  }

  const wEngine = getStaticBuildUtilityWEngine(input.loadout.wEngineId)
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

function createEntry(
  entry: Omit<
    StaticBuildSourceUtilityViewEntry,
    | "metadata"
    | "supported"
    | "requirements"
    | "requirementSummary"
    | "diagnostics"
    | "sourceNotes"
  > & {
    requirements?: StaticBuildSourceUtilityViewRequirement[]
  },
): StaticBuildSourceUtilityViewEntry {
  const requirements = [
    ...(entry.requirements ?? []),
    ...(entry.triggerLabel
      ? [createRequirement("trigger", entry.triggerLabel, true)]
      : []),
    ...(entry.conditionLabel
      ? [createRequirement("condition", entry.conditionLabel, true)]
      : []),
    ...(typeof entry.cooldownSeconds === "number"
      ? [createRequirement("cooldown", `${entry.cooldownSeconds}s`, true)]
      : []),
  ]

  const supportedEntry = {
    ...entry,
    metadata: {
      canonicalLabel: entry.label,
      stableKey: `source-utility:${entry.id}`,
      entryKind: "source-utility-view",
      utilityType: entry.utilityType,
      resolutionMode: entry.resolutionMode,
      targetScope: entry.targetScope,
      unit: entry.unit,
    },
    supported: true,
  }

  return {
    ...supportedEntry,
    requirements,
    requirementSummary: summarizeSourceUtilityViewRequirements(requirements),
    summary: {
      value: entry.value,
      unit: entry.unit,
      resolutionMode: entry.resolutionMode,
      targetScope: entry.targetScope,
      requirementCount: requirements.length,
      hasUnsatisfiedRequirements: false,
      diagnosticCount: 0,
      sourceNoteCount: 0,
      assumptionCount: entry.assumptions.length,
      hasUnsupported: false,
    },
    diagnostics: [],
    diagnosticSummary: summarizeDiagnosticEntries([]),
    sourceNotes: [],
    sourceNoteSummary: summarizeSourceNoteEntries([]),
    effectSummary: [],
    caveatSummary: summarizeSourceUtilityViewCaveats(
      [supportedEntry],
      entry.assumptions,
    ),
    assumptionSummary: summarizeAssumptions(entry.assumptions),
  }
}

function createRequirement(
  kind: StaticBuildSourceUtilityViewRequirement["kind"],
  key: string,
  satisfied: boolean,
): StaticBuildSourceUtilityViewRequirement {
  return { kind, key, satisfied }
}

export function summarizeSourceUtilityViewRequirements(
  requirements: StaticBuildSourceUtilityViewRequirement[],
): StaticBuildSourceUtilityViewRequirementSummary {
  const satisfiedCount = requirements.filter((item) => item.satisfied).length
  const unsatisfiedCount = requirements.length - satisfiedCount

  return {
    count: requirements.length,
    satisfiedCount,
    unsatisfiedCount,
    hasUnsatisfied: unsatisfiedCount > 0,
    groups: sourceUtilityViewRequirementKinds
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

function resolveWEngineUtilityViews(
  loadout: StaticBuildResolvedLoadout,
): StaticBuildSourceUtilityViewEntry[] {
  const wEngine = loadout.wEngine
  if (!wEngine) return []

  switch (wEngine.id) {
    case "12003":
      return [
        createEntry({
          id: "lunar-noviluna-energy-refund",
          label: "「月相」-朔：[新月]",
          sourceType: "w-engine",
          sourceId: "12003",
          utilityType: "energy-refund",
          resolutionMode: "trigger",
          targetScope: "self",
          value: byRefinement(
            lunarNovilunaEnergyRefund,
            loadout.wEngineRefinement,
          ),
          unit: "energy",
          triggerLabel: "发动[强化特殊技]",
          cooldownSeconds: 12,
          assumptions: [
            "当前 utility view 只输出单次触发的能量回复值，不推导战斗内总回复次数。",
          ],
        }),
      ]

    case "12012":
      return [
        createEntry({
          id: "magnetic-storm-charlie-energy-refund",
          label: "「电磁暴」-叁式：[过载电荷]",
          sourceType: "w-engine",
          sourceId: "12012",
          utilityType: "energy-refund",
          resolutionMode: "trigger",
          targetScope: "self",
          value: byRefinement(
            magneticStormCharlieEnergyRefund,
            loadout.wEngineRefinement,
          ),
          unit: "energy",
          triggerLabel: "队伍中任意角色对敌人施加属性异常效果",
          cooldownSeconds: 12,
          assumptions: [
            "当前 utility view 只输出单次触发的能量回复值，不推导队伍异常施加频率。",
          ],
        }),
      ]

    case "13002":
      return timeSliceTriggers.flatMap((trigger) => [
        createEntry({
          id: `time-slice-${trigger.key}-decibel-gain`,
          label: `时光切片：[说「茄子」·${trigger.label}]`,
          sourceType: "w-engine",
          sourceId: "13002",
          utilityType: "decibel-gain",
          resolutionMode: "trigger",
          targetScope: "team",
          value: byRefinement(
            timeSliceDecibelGainByTrigger[trigger.key],
            loadout.wEngineRefinement,
          ),
          unit: "decibel",
          triggerLabel: trigger.label,
          cooldownSeconds: 12,
          assumptions: [
            "当前 utility view 只输出单次触发的喧响值收益，不推导战斗内总触发次数。",
            "时光切片的不同招式触发共享同一被动描述，但分别结算冷却时间，因此按触发类型拆成多条 utility entry。",
          ],
        }),
        createEntry({
          id: `time-slice-${trigger.key}-energy-refund`,
          label: `时光切片：[说「茄子」·${trigger.label}·能量]`,
          sourceType: "w-engine",
          sourceId: "13002",
          utilityType: "energy-refund",
          resolutionMode: "trigger",
          targetScope: "self",
          value: byRefinement(timeSliceEnergyRefund, loadout.wEngineRefinement),
          unit: "energy",
          triggerLabel: trigger.label,
          cooldownSeconds: 12,
          assumptions: [
            "当前 utility view 只输出单次触发的能量回复值，不推导战斗内总回复次数。",
            "时光切片的不同招式触发共享同一被动描述，但分别结算冷却时间，因此按触发类型拆成多条 utility entry。",
          ],
        }),
      ])

    case "13106":
      return [
        createEntry({
          id: "housekeeper-offfield-energy-regen",
          label: "家政员：[安心家用轮锯]",
          sourceType: "w-engine",
          sourceId: "13106",
          utilityType: "energy-regen-rate",
          resolutionMode: "rate",
          targetScope: "self",
          value: byRefinement(
            housekeeperOfffieldEnergyRegen,
            loadout.wEngineRefinement,
          ),
          unit: "energy-per-second",
          conditionLabel: "位于后场时",
          assumptions: [
            "当前 utility view 只输出满足条件时的每秒回能速率，不推导总回复量。",
          ],
        }),
      ]

    case "14117":
      return [
        createEntry({
          id: "flamemaker-shaker-offfield-energy-regen",
          label: "灼心摇壶：[焦油斟注]",
          sourceType: "w-engine",
          sourceId: "14117",
          utilityType: "energy-regen-rate",
          resolutionMode: "rate",
          targetScope: "self",
          value: byRefinement(
            flamemakerShakerOfffieldEnergyRegen,
            loadout.wEngineRefinement,
          ),
          unit: "energy-per-second",
          conditionLabel: "位于后场时",
          assumptions: [
            "当前 utility view 只输出满足条件时的每秒回能速率，不推导总回复量。",
          ],
        }),
      ]

    default:
      return []
  }
}

export function resolveStaticBuildSourceUtilityViews(
  input: ResolveStaticBuildSourceUtilityViewsInput,
): ResolveStaticBuildSourceUtilityViewsResult {
  const loadout = resolveLoadout(input)
  const entries = resolveWEngineUtilityViews(loadout).toSorted(
    compareSourceUtilityViews,
  )
  const compatibleWEngines = getCompatibleStaticBuildUtilityWEngines(
    loadout.agent.specialty,
  )
  const assumptions =
    entries.length > 0 || compatibleWEngines.length > 0
      ? []
      : [`${loadout.agent.name} 当前特性下暂无已收录的 utility-only 音擎条目。`]
  const summary = summarizeSourceUtilityViews(entries, assumptions)

  return {
    loadout,
    summary,
    effectSummary: summary.effectSummary,
    requirementSummary: summary.requirementSummary,
    caveatSummary: summarizeSourceUtilityViewCaveats(entries, assumptions),
    diagnosticSummary: summary.diagnosticSummary,
    sourceNoteSummary: summary.sourceNoteSummary,
    assumptionSummary: summarizeAssumptions(assumptions),
    entries,
    assumptions,
  }
}

function compareSourceUtilityViews(
  left: StaticBuildSourceUtilityViewEntry,
  right: StaticBuildSourceUtilityViewEntry,
) {
  const leftGroupOrder = getSourceUtilityViewGroupOrder(left.resolutionMode)
  const rightGroupOrder = getSourceUtilityViewGroupOrder(right.resolutionMode)
  if (leftGroupOrder !== rightGroupOrder) {
    return leftGroupOrder - rightGroupOrder
  }

  return left.metadata.stableKey.localeCompare(right.metadata.stableKey)
}

function getSourceUtilityViewGroupOrder(
  key: StaticBuildSourceUtilityViewGroupKey,
) {
  return key === "trigger" ? 0 : 1
}

function summarizeSourceUtilityViews(
  entries: StaticBuildSourceUtilityViewEntry[],
  assumptions: StaticBuildAssumptionList,
): StaticBuildSourceUtilityViewSummary {
  const triggerEntries = entries.filter(
    (entry) => entry.resolutionMode === "trigger",
  )
  const rateEntries = entries.filter((entry) => entry.resolutionMode === "rate")
  const supportedCount = entries.filter((entry) => entry.supported).length
  const unsupportedCount = entries.length - supportedCount
  const diagnostics = entries.flatMap((entry) => entry.diagnostics)
  const sourceNotes = entries.flatMap((entry) => entry.sourceNotes)

  const groups: StaticBuildSourceUtilityViewSummary["groups"] = []
  for (const key of [
    "trigger",
    "rate",
  ] as const satisfies StaticBuildSourceUtilityViewGroupKey[]) {
    const groupEntries = entries.filter((entry) => entry.resolutionMode === key)
    if (groupEntries.length === 0) continue
    const groupSupportedCount = groupEntries.filter(
      (entry) => entry.supported,
    ).length
    groups.push({
      key,
      label: sourceUtilityViewGroupLabels[key],
      count: groupEntries.length,
      supportedCount: groupSupportedCount,
      unsupportedCount: groupEntries.length - groupSupportedCount,
      effectSummary: [],
      requirementSummary: summarizeSourceUtilityViewRequirements(
        groupEntries.flatMap((entry) => entry.requirements),
      ),
      caveatSummary: summarizeSourceUtilityViewCaveats(
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
    triggerCount: triggerEntries.length,
    rateCount: rateEntries.length,
    supportedCount,
    unsupportedCount,
    effectSummary: [],
    requirementSummary: summarizeSourceUtilityViewRequirements(
      entries.flatMap((entry) => entry.requirements),
    ),
    caveatSummary: summarizeSourceUtilityViewCaveats(entries, assumptions),
    diagnosticSummary: summarizeDiagnosticEntries(diagnostics),
    sourceNoteSummary: summarizeSourceNoteEntries(sourceNotes),
    assumptionSummary: summarizeAssumptions(assumptions),
    groups,
  }
}

function summarizeSourceUtilityViewCaveats(
  entries: StaticBuildSourceUtilityViewEntry[],
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

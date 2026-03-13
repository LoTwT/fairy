import type {
  ResolveStaticBuildSourceUtilityViewsInput,
  ResolveStaticBuildSourceUtilityViewsResult,
  StaticBuildCatalogEntry,
  StaticBuildResolvedLoadout,
  StaticBuildSourceUtilityViewEntry,
  StaticBuildValueContext,
} from "./types.js"
import {
  getStaticBuildAgent,
  getStaticBuildDriveDisc,
  getStaticBuildWEngine,
  supportedStaticBuildWEngines,
} from "./catalog.js"

const utilityViewWEngineIds = ["12003", "12012", "13106", "14117"] as const
const utilityViewWEngineIdSet = new Set<string>(utilityViewWEngineIds)

const lunarNovilunaEnergyRefund = [3, 3.5, 4, 4.5, 5] as const
const magneticStormCharlieEnergyRefund = [3.5, 4, 4.5, 5, 5.5] as const
const housekeeperOfffieldEnergyRegen = [0.45, 0.52, 0.58, 0.65, 0.72] as const
const flamemakerShakerOfffieldEnergyRegen = [0.6, 0.75, 0.9, 1.05, 1.2] as const

function byRefinement(
  values: readonly number[],
  refinement: StaticBuildValueContext["wEngineRefinement"],
) {
  const index = Math.max(1, Math.min(refinement, values.length)) - 1
  return values[index] ?? values[values.length - 1] ?? 0
}

export const supportedStaticBuildSourceUtilityViewWEngines =
  supportedStaticBuildWEngines
    .filter((item) => utilityViewWEngineIdSet.has(item.id))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))

export function hasStaticBuildSourceUtilityViewCoverage(wEngineId?: string) {
  return !!wEngineId && utilityViewWEngineIdSet.has(wEngineId)
}

function resolveDriveDiscSets(
  sets: ResolveStaticBuildSourceUtilityViewsInput["loadout"]["driveDiscSets"],
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

function createEntry(
  entry: Omit<
    StaticBuildSourceUtilityViewEntry,
    "metadata" | "supported" | "diagnostics" | "sourceNotes"
  >,
): StaticBuildSourceUtilityViewEntry {
  return {
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
    diagnostics: [],
    sourceNotes: [],
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
  const entries = resolveWEngineUtilityViews(loadout)

  return {
    loadout,
    entries,
    assumptions: [],
  }
}

import type {
  ResolveStaticBuildSourceEntriesInput,
  ResolveStaticBuildSourceEntriesResult,
  StaticBuildResolvedLoadout,
  StaticBuildSourceEntry,
} from "./types.js"
import { resolveStaticBuildSourceUtilityViews } from "./utility-views.js"
import { resolveStaticBuildSourceDamageViews } from "./views.js"

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

  return {
    loadout,
    entries,
    assumptions: [...new Set(assumptions)],
  }
}

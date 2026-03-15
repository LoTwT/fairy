import type {
  StaticBuildFinalPanelInput,
  StaticBuildScenarioInput,
} from "zzz-data"
import type {
  BuildToolMissingFinalPanelResponse,
  BuildToolUnsupportedAnomalyTypeResponse,
} from "./resolve-build-contracts"
import type {
  BuildToolFinalPanelInput,
  BuildToolScenarioInput,
} from "./resolve-build-schemas"
import { buildMissingSourceEntryFinalPanelResponse } from "./resolve-build-responses"
import { resolveBuildToolOptionalScenario } from "./resolve-build-scenario"
import { finalPanelSchema } from "./resolve-build-schemas"

export interface BuildToolResolvedSourceEntriesContext {
  utilityOnly: boolean
  scenario: StaticBuildScenarioInput | undefined
  panel: StaticBuildFinalPanelInput | undefined
}

export function resolveBuildToolSourceEntriesContext(input: {
  scenario: BuildToolScenarioInput | undefined
  finalPanel: BuildToolFinalPanelInput | undefined
}):
  | {
      ok: true
      context: BuildToolResolvedSourceEntriesContext
    }
  | {
      ok: false
      response:
        | BuildToolMissingFinalPanelResponse
        | BuildToolUnsupportedAnomalyTypeResponse
    } {
  const utilityOnly =
    !input.scenario ||
    input.scenario.damageType === "normal" ||
    input.scenario.damageType === "sheer"

  const scenarioResolution = resolveBuildToolOptionalScenario(input.scenario)
  if (!scenarioResolution.ok) {
    return scenarioResolution
  }

  const scenario = scenarioResolution.scenario
  let panel: StaticBuildFinalPanelInput | undefined

  if (
    scenario &&
    (scenario.damageType === "anomaly" || scenario.damageType === "disorder")
  ) {
    const fullPanel = finalPanelSchema.safeParse(input.finalPanel)
    if (!fullPanel.success) {
      return {
        ok: false,
        response: buildMissingSourceEntryFinalPanelResponse(),
      }
    }
    panel = fullPanel.data
  } else if (input.finalPanel) {
    panel = {
      attack: input.finalPanel.attack ?? 0,
      critRate: input.finalPanel.critRate ?? 0,
      critDamage: input.finalPanel.critDamage ?? 0,
      ...input.finalPanel,
    }
  }

  return {
    ok: true,
    context: {
      utilityOnly,
      scenario,
      panel,
    },
  }
}

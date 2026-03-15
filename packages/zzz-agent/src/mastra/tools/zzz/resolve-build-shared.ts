import type { z } from "zod"
import type { ResolveStaticBuildSourceEntriesInput } from "zzz-data"
import type {
  BuildToolIncompatibleWEngineResponse,
  BuildToolMissingFinalPanelResponse,
  BuildToolUnsupportedAgentResponse,
  BuildToolUnsupportedAnomalyTypeResponse,
  BuildToolUnsupportedDamageTypeResponse,
  BuildToolUnsupportedDriveDiscResponse,
  BuildToolUnsupportedWEngineResponse,
  CatalogItem,
} from "./resolve-build-contracts"
import type { specialtyLabels } from "./resolve-build-labels"
import type {
  BuildToolRejectedAgent,
  BuildToolRejectedDriveDiscSets,
  BuildToolRejectedWEngine,
  BuildToolResolveLoadoutContextOptions,
  BuildToolResolveSourceEntriesLoadoutContextOptions,
} from "./resolve-build-loadout"
import type {
  BuildToolResolvedScenario,
  BuildToolResolvedSkillMatrixContext,
} from "./resolve-build-scenario"
import type {
  BuildToolScenarioInput,
  BuildToolSkillMatrixContextInput,
} from "./resolve-build-schemas"
import {
  resolveBuildToolLoadoutContext,
  resolveBuildToolSourceEntriesLoadoutContext,
  resolveBuildToolSourceUtilitySupport,
} from "./resolve-build-loadout"
import { buildMissingSourceEntryFinalPanelResponse } from "./resolve-build-responses"
import {
  resolveBuildToolDamageType,
  resolveBuildToolOptionalScenario,
  resolveBuildToolResolvedScenario,
  resolveBuildToolResolvedSkillMatrixContext,
} from "./resolve-build-scenario"
import { finalPanelSchema } from "./resolve-build-schemas"

export interface BuildToolResolvedDamageExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  scenario: BuildToolResolvedScenario
}

export interface BuildToolResolvedSkillMatrixExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  context: BuildToolResolvedSkillMatrixContext
}

export interface BuildToolResolvedSourceUtilityExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  supportedUtilityWEngines: TWEngine[]
  supportedUtilityWEngineNames: string[]
}

export interface BuildToolResolveTriggeredDamageContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  scenario: BuildToolScenarioInput
}

export interface BuildToolResolvedSourceEntriesContext {
  utilityOnly: boolean
  scenario: ResolveStaticBuildSourceEntriesInput["scenario"]
  panel: ResolveStaticBuildSourceEntriesInput["panel"]
}

export interface BuildToolResolvedSourceEntriesExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  utilityOnly: boolean
  scenario: ResolveStaticBuildSourceEntriesInput["scenario"]
  panel: ResolveStaticBuildSourceEntriesInput["panel"]
  agent: TAgent
  compatibleWEngines: readonly TWEngine[]
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  supportedUtilityWEngines: string[]
}

export interface BuildToolResolveSourceEntriesExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveSourceEntriesLoadoutContextOptions<
  TAgent,
  TWEngine,
  TDriveDisc
> {
  scenario: BuildToolScenarioInput | undefined
  finalPanel: z.input<typeof finalPanelSchema> | undefined
  supportedSourceUtilityWEngines: readonly TWEngine[]
}

export interface BuildToolResolveDamageExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  scenario: BuildToolScenarioInput
}

export interface BuildToolResolveSkillMatrixExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  context: BuildToolSkillMatrixContextInput
}

export interface BuildToolResolveSourceUtilityExecutionContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  supportedSourceUtilityWEngines: readonly TWEngine[]
}

export interface BuildToolResolvedTriggeredDamageContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  loadout: StaticBuildLoadoutInput
  scenario: Extract<
    BuildToolResolvedScenario,
    { damageType: "anomaly" | "disorder" }
  >
  wEngine: TWEngine | undefined
}

export function resolveBuildToolTriggeredDamageContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveTriggeredDamageContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedTriggeredDamageContext<TAgent, TWEngine>
  | {
      ok: false
      response:
        | BuildToolUnsupportedDamageTypeResponse
        | BuildToolUnsupportedAnomalyTypeResponse
        | BuildToolUnsupportedAgentResponse
        | BuildToolUnsupportedWEngineResponse
        | BuildToolIncompatibleWEngineResponse
        | BuildToolUnsupportedDriveDiscResponse
    } {
  const damageTypeResolution = resolveBuildToolDamageType(
    options.scopeLabel,
    options.scenario.damageType,
    ["anomaly", "disorder"],
  )
  if (!damageTypeResolution.ok) {
    return damageTypeResolution
  }

  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const scenarioResolution = resolveBuildToolResolvedScenario(options.scenario)
  if (!scenarioResolution.ok) {
    return scenarioResolution
  }

  return {
    ok: true,
    agent: loadoutResolution.agent,
    loadout: loadoutResolution.loadout,
    scenario: scenarioResolution.scenario as Extract<
      BuildToolResolvedScenario,
      { damageType: "anomaly" | "disorder" }
    >,
    wEngine: loadoutResolution.wEngine,
  }
}

export function resolveBuildToolSourceEntriesContext(input: {
  scenario: BuildToolScenarioInput | undefined
  finalPanel: z.input<typeof finalPanelSchema> | undefined
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
  let panel: ResolveStaticBuildSourceEntriesInput["panel"]

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

export function resolveBuildToolSourceEntriesExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSourceEntriesExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedSourceEntriesExecutionContext<TAgent, TWEngine>
  | {
      ok: false
      response:
        | BuildToolMissingFinalPanelResponse
        | BuildToolUnsupportedAnomalyTypeResponse
        | BuildToolUnsupportedAgentResponse
        | BuildToolUnsupportedWEngineResponse
        | BuildToolIncompatibleWEngineResponse
        | BuildToolUnsupportedDriveDiscResponse
    } {
  const sourceEntriesContext = resolveBuildToolSourceEntriesContext({
    scenario: options.scenario,
    finalPanel: options.finalPanel,
  })
  if (!sourceEntriesContext.ok) {
    return sourceEntriesContext
  }

  const loadoutResolution = resolveBuildToolSourceEntriesLoadoutContext({
    ...options,
    utilityOnly: sourceEntriesContext.context.utilityOnly,
  })
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
    options.supportedSourceUtilityWEngines,
    loadoutResolution.agent.specialty,
  )

  return {
    ok: true,
    utilityOnly: sourceEntriesContext.context.utilityOnly,
    scenario: sourceEntriesContext.context.scenario,
    panel: sourceEntriesContext.context.panel,
    agent: loadoutResolution.agent,
    compatibleWEngines: loadoutResolution.compatibleWEngines,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    supportedUtilityWEngines: sourceUtilitySupport.names,
  }
}

export function resolveBuildToolDamageExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveDamageExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedDamageExecutionContext<TAgent, TWEngine>
  | {
      ok: false
      response:
        | BuildToolUnsupportedAnomalyTypeResponse
        | BuildToolUnsupportedAgentResponse
        | BuildToolUnsupportedWEngineResponse
        | BuildToolIncompatibleWEngineResponse
        | BuildToolUnsupportedDriveDiscResponse
    } {
  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const scenarioResolution = resolveBuildToolResolvedScenario(options.scenario)
  if (!scenarioResolution.ok) {
    return scenarioResolution
  }

  return {
    ok: true,
    agent: loadoutResolution.agent,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    scenario: scenarioResolution.scenario,
  }
}

export function resolveBuildToolSkillMatrixExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSkillMatrixExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedSkillMatrixExecutionContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  return {
    ok: true,
    agent: loadoutResolution.agent,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    context: resolveBuildToolResolvedSkillMatrixContext(options.context),
  }
}

export function resolveBuildToolSourceUtilityExecutionContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSourceUtilityExecutionContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedSourceUtilityExecutionContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  const loadoutResolution = resolveBuildToolLoadoutContext(options)
  if (!loadoutResolution.ok) {
    return loadoutResolution
  }

  const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
    options.supportedSourceUtilityWEngines,
    loadoutResolution.agent.specialty,
  )

  return {
    ok: true,
    agent: loadoutResolution.agent,
    wEngine: loadoutResolution.wEngine,
    loadout: loadoutResolution.loadout,
    supportedUtilityWEngines: sourceUtilitySupport.items,
    supportedUtilityWEngineNames: sourceUtilitySupport.names,
  }
}

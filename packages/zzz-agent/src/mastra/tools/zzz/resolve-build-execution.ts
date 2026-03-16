import type {
  StaticBuildFinalPanelInput,
  StaticBuildScenarioInput,
} from "zzz-data"
import type {
  BuildToolIncompatibleWEngineResponse,
  BuildToolSourceEntryUtilityOnlyFlag,
  BuildToolSupportedCatalogNameList,
  BuildToolUnsupportedAgentResponse,
  BuildToolUnsupportedAnomalyTypeResponse,
  BuildToolUnsupportedDamageTypeResponse,
  BuildToolUnsupportedDriveDiscResponse,
  BuildToolUnsupportedWEngineResponse,
  CatalogItem,
  SpecialtyCatalogItem,
} from "./resolve-build-contracts"
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
  BuildToolFinalPanelInput,
  BuildToolScenarioInput,
  BuildToolSkillMatrixContextInput,
} from "./resolve-build-schemas"
import {
  resolveBuildToolLoadoutContext,
  resolveBuildToolSourceEntriesLoadoutContext,
  resolveBuildToolSourceUtilitySupport,
} from "./resolve-build-loadout"
import {
  resolveBuildToolDamageType,
  resolveBuildToolResolvedScenario,
  resolveBuildToolResolvedSkillMatrixContext,
} from "./resolve-build-scenario"
import { resolveBuildToolSourceEntriesContext } from "./resolve-build-source-entry-context"

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
  supportedUtilityWEngineNames: BuildToolSupportedCatalogNameList
}

export interface BuildToolResolveTriggeredDamageContextOptions<
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  scenario: BuildToolScenarioInput
}

export interface BuildToolResolvedSourceEntriesExecutionContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  utilityOnly: BuildToolSourceEntryUtilityOnlyFlag
  scenario: StaticBuildScenarioInput | undefined
  panel: StaticBuildFinalPanelInput | undefined
  agent: TAgent
  compatibleWEngines: readonly TWEngine[]
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
  supportedUtilityWEngines: BuildToolSupportedCatalogNameList
}

export interface BuildToolResolveSourceEntriesExecutionContextOptions<
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveSourceEntriesLoadoutContextOptions<
  TAgent,
  TWEngine,
  TDriveDisc
> {
  scenario: BuildToolScenarioInput | undefined
  finalPanel: BuildToolFinalPanelInput | undefined
  supportedSourceUtilityWEngines: readonly TWEngine[]
}

export interface BuildToolResolveDamageExecutionContextOptions<
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  scenario: BuildToolScenarioInput
}

export interface BuildToolResolveSkillMatrixExecutionContextOptions<
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
  TDriveDisc extends CatalogItem,
> extends BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc> {
  context: BuildToolSkillMatrixContextInput
}

export interface BuildToolResolveSourceUtilityExecutionContextOptions<
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
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
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
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

export function resolveBuildToolSourceEntriesExecutionContext<
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
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
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
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
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
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
  TAgent extends SpecialtyCatalogItem,
  TWEngine extends SpecialtyCatalogItem,
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

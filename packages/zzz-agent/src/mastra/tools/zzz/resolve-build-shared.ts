import type { z } from "zod"
import type {
  AgentAttributeLabel,
  AnomalyType,
  ResolveStaticBuildSourceEntriesInput,
  StaticBuildDriveDiscSetInput,
  StaticBuildLoadoutInput,
} from "zzz-data"
import type {
  BuildToolIncompatibleWEngineResponse,
  BuildToolMissingFinalPanelResponse,
  BuildToolScopeLabel,
  BuildToolUnsupportedAgentResponse,
  BuildToolUnsupportedAnomalyTypeResponse,
  BuildToolUnsupportedDamageTypeResponse,
  BuildToolUnsupportedDriveDiscResponse,
  BuildToolUnsupportedWEngineResponse,
  CatalogItem,
} from "./resolve-build-contracts"
import type { specialtyLabels } from "./resolve-build-labels"
import type {
  BuildToolScenarioInput,
  BuildToolSkillMatrixContextInput,
} from "./resolve-build-schemas"
import {
  catalogNames,
  findCatalogItem,
  normalizeCatalogValue,
} from "./resolve-build-catalog"
import {
  buildIncompatibleWEngineResponse,
  buildMissingSourceEntryFinalPanelResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDamageTypeResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
} from "./resolve-build-responses"
import { finalPanelSchema } from "./resolve-build-schemas"

export interface BuildToolResolvedDriveDiscSets {
  ok: true
  driveDiscSets: StaticBuildDriveDiscSetInput[]
}

export interface BuildToolResolvedLoadoutContext<
  TAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  ok: true
  agent: TAgent
  compatibleWEngines: readonly TWEngine[]
  wEngine: TWEngine | undefined
  loadout: StaticBuildLoadoutInput
}

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

export interface BuildToolResolvedAgent<T extends CatalogItem> {
  ok: true
  agent: T
}

export interface BuildToolRejectedAgent {
  ok: false
  response: BuildToolUnsupportedAgentResponse
}

export interface BuildToolResolvedWEngine<T extends CatalogItem> {
  ok: true
  wEngine: T | undefined
}

export interface BuildToolRejectedWEngine {
  ok: false
  response:
    | BuildToolUnsupportedWEngineResponse
    | BuildToolIncompatibleWEngineResponse
}

export interface BuildToolRejectedDriveDiscSets {
  ok: false
  response: BuildToolUnsupportedDriveDiscResponse
}

export interface BuildToolLoadoutInputOptions {
  agentId: string
  wEngineId?: string
  driveDiscSets?: StaticBuildDriveDiscSetInput[]
  agentLevel?: number
  agentMindscape?: number
  coreSkillLevel?: number
  wEngineRefinement?: number
}

export interface BuildToolProgressionInput {
  agentLevel?: number
  agentMindscape?: number
  coreSkillLevel?: number
  wEngineRefinement?: number
}

export interface BuildToolResolvedLoadoutOptions extends BuildToolProgressionInput {
  agent: Pick<CatalogItem, "id">
  wEngine?: Pick<CatalogItem, "id">
  driveDiscSets?: StaticBuildDriveDiscSetInput[]
}

export type BuildToolResolvedScenario =
  | (Omit<
      Exclude<BuildToolScenarioInput, { damageType: "disorder" }>,
      "attribute"
    > & {
      attribute?: AgentAttributeLabel
    })
  | (Omit<
      Extract<BuildToolScenarioInput, { damageType: "disorder" }>,
      "anomalyType" | "attribute"
    > & {
      anomalyType: AnomalyType
      attribute?: AgentAttributeLabel
    })

export type BuildToolResolvedSkillMatrixContext = Omit<
  BuildToolSkillMatrixContextInput,
  "attribute"
> & {
  attribute?: AgentAttributeLabel
}

export interface BuildToolSourceUtilitySupport<T extends CatalogItem> {
  items: T[]
  names: string[]
}

export interface BuildToolResolveLoadoutContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolProgressionInput {
  scopeLabel: BuildToolScopeLabel
  supportedAgents: readonly TAgent[]
  supportedWEngines: readonly TWEngine[]
  supportedDriveDiscs: readonly TDriveDisc[]
  agentQuery: string
  wEngineQuery?: string
  driveDiscs?:
    | Array<{
        name: string
        pieces: 2 | 4
      }>
    | undefined
  getCompatibleWEngines: (agent: TAgent) => readonly TWEngine[]
}

export interface BuildToolResolveSourceEntriesLoadoutContextOptions<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
> extends BuildToolProgressionInput {
  utilityOnly: boolean
  scopeLabel: BuildToolScopeLabel
  supportedAgents: readonly TAgent[]
  supportedUtilityAgents: readonly TAgent[]
  supportedWEngines: readonly TWEngine[]
  supportedUtilityWEngines: readonly TWEngine[]
  supportedDriveDiscs: readonly TDriveDisc[]
  agentQuery: string
  wEngineQuery?: string
  driveDiscs?:
    | Array<{
        name: string
        pieces: 2 | 4
      }>
    | undefined
  getCompatibleWEngines: (agent: TAgent) => readonly TWEngine[]
  getCompatibleUtilityWEngines: (agent: TAgent) => readonly TWEngine[]
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

export function resolveBuildToolAgent<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  supportedAgents: readonly T[],
  query: string,
): BuildToolResolvedAgent<T> | BuildToolRejectedAgent {
  const agent = findCatalogItem(supportedAgents, query)
  if (!agent) {
    return {
      ok: false,
      response: buildUnsupportedAgentResponse(
        scopeLabel,
        supportedAgents,
        query,
      ),
    }
  }

  return {
    ok: true,
    agent,
  }
}

export function resolveBuildToolWEngine<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
>(
  scopeLabel: BuildToolScopeLabel,
  supportedWEngines: readonly TWEngine[],
  compatibleWEngines: readonly TWEngine[],
  query: string | undefined,
  agent: TAgent,
): BuildToolResolvedWEngine<TWEngine> | BuildToolRejectedWEngine {
  if (!query) {
    return {
      ok: true,
      wEngine: undefined,
    }
  }

  const wEngine = findCatalogItem(supportedWEngines, query)
  if (!wEngine) {
    return {
      ok: false,
      response: buildUnsupportedWEngineResponse(
        scopeLabel,
        compatibleWEngines,
        query,
      ),
    }
  }

  if (wEngine.specialty !== agent.specialty) {
    return {
      ok: false,
      response: buildIncompatibleWEngineResponse(
        agent,
        wEngine,
        compatibleWEngines,
        query,
      ),
    }
  }

  return {
    ok: true,
    wEngine,
  }
}

export function resolveBuildToolDriveDiscSets<T extends CatalogItem>(
  scopeLabel: BuildToolScopeLabel,
  driveDiscs:
    | Array<{
        name: string
        pieces: 2 | 4
      }>
    | undefined,
  supportedDriveDiscs: readonly T[],
): BuildToolResolvedDriveDiscSets | BuildToolRejectedDriveDiscSets {
  const driveDiscSets: StaticBuildDriveDiscSetInput[] = []

  for (const discInput of driveDiscs ?? []) {
    const disc = findCatalogItem(supportedDriveDiscs, discInput.name)
    if (!disc) {
      return {
        ok: false,
        response: buildUnsupportedDriveDiscResponse(
          scopeLabel,
          supportedDriveDiscs,
          discInput.name,
        ),
      }
    }

    driveDiscSets.push({
      id: disc.id,
      pieces: discInput.pieces,
    })
  }

  return {
    ok: true,
    driveDiscSets,
  }
}

export function buildToolLoadoutInput({
  agentId,
  wEngineId,
  driveDiscSets,
  agentLevel,
  agentMindscape,
  coreSkillLevel,
  wEngineRefinement,
}: BuildToolLoadoutInputOptions): StaticBuildLoadoutInput {
  return {
    agentId,
    wEngineId,
    driveDiscSets,
    agentLevel,
    agentMindscape,
    coreSkillLevel,
    wEngineRefinement,
  }
}

export function buildToolResolvedLoadoutInput({
  agent,
  wEngine,
  driveDiscSets,
  agentLevel,
  agentMindscape,
  coreSkillLevel,
  wEngineRefinement,
}: BuildToolResolvedLoadoutOptions): StaticBuildLoadoutInput {
  return buildToolLoadoutInput({
    agentId: agent.id,
    wEngineId: wEngine?.id,
    driveDiscSets,
    agentLevel,
    agentMindscape,
    coreSkillLevel,
    wEngineRefinement,
  })
}

export function resolveBuildToolSourceUtilitySupport<
  T extends CatalogItem & { specialty?: string },
>(
  supportedWEngines: readonly T[],
  specialty: string | undefined,
): BuildToolSourceUtilitySupport<T> {
  const items = supportedWEngines.filter((item) => item.specialty === specialty)

  return {
    items,
    names: catalogNames(items),
  }
}

export function resolveBuildToolLoadoutContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveLoadoutContextOptions<TAgent, TWEngine, TDriveDisc>,
):
  | BuildToolResolvedLoadoutContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  const agentResolution = resolveBuildToolAgent(
    options.scopeLabel,
    options.supportedAgents,
    options.agentQuery,
  )
  if (!agentResolution.ok) {
    return agentResolution
  }

  const agent = agentResolution.agent
  const compatibleWEngines = options.getCompatibleWEngines(agent)
  const wEngineResolution = resolveBuildToolWEngine(
    options.scopeLabel,
    options.supportedWEngines,
    compatibleWEngines,
    options.wEngineQuery,
    agent,
  )
  if (!wEngineResolution.ok) {
    return wEngineResolution
  }

  const driveDiscResolution = resolveBuildToolDriveDiscSets(
    options.scopeLabel,
    options.driveDiscs,
    options.supportedDriveDiscs,
  )
  if (!driveDiscResolution.ok) {
    return driveDiscResolution
  }

  return {
    ok: true,
    agent,
    compatibleWEngines,
    wEngine: wEngineResolution.wEngine,
    loadout: buildToolResolvedLoadoutInput({
      agent,
      wEngine: wEngineResolution.wEngine,
      driveDiscSets: driveDiscResolution.driveDiscSets,
      agentLevel: options.agentLevel,
      agentMindscape: options.agentMindscape,
      coreSkillLevel: options.coreSkillLevel,
      wEngineRefinement: options.wEngineRefinement,
    }),
  }
}

export function resolveBuildToolSourceEntriesLoadoutContext<
  TAgent extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TWEngine extends CatalogItem & { specialty: keyof typeof specialtyLabels },
  TDriveDisc extends CatalogItem,
>(
  options: BuildToolResolveSourceEntriesLoadoutContextOptions<
    TAgent,
    TWEngine,
    TDriveDisc
  >,
):
  | BuildToolResolvedLoadoutContext<TAgent, TWEngine>
  | BuildToolRejectedAgent
  | BuildToolRejectedWEngine
  | BuildToolRejectedDriveDiscSets {
  return resolveBuildToolLoadoutContext({
    scopeLabel: options.scopeLabel,
    supportedAgents: options.utilityOnly
      ? options.supportedUtilityAgents
      : options.supportedAgents,
    supportedWEngines: options.utilityOnly
      ? options.supportedUtilityWEngines
      : options.supportedWEngines,
    supportedDriveDiscs: options.supportedDriveDiscs,
    agentQuery: options.agentQuery,
    wEngineQuery: options.wEngineQuery,
    driveDiscs: options.driveDiscs,
    getCompatibleWEngines: options.utilityOnly
      ? options.getCompatibleUtilityWEngines
      : options.getCompatibleWEngines,
    agentLevel: options.agentLevel,
    agentMindscape: options.agentMindscape,
    coreSkillLevel: options.coreSkillLevel,
    wEngineRefinement: options.wEngineRefinement,
  })
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

export function normalizeBuildToolAttribute(
  value: string | undefined,
): AgentAttributeLabel | undefined {
  return value as AgentAttributeLabel | undefined
}

export function resolveBuildToolScenario<T extends { attribute?: string }>(
  scenario: T,
): Omit<T, "attribute"> & { attribute?: AgentAttributeLabel } {
  return {
    ...scenario,
    attribute: normalizeBuildToolAttribute(scenario.attribute),
  }
}

export function resolveBuildToolDisorderScenario<
  T extends {
    anomalyType: string
    attribute?: string
  },
>(
  scenario: T,
):
  | {
      ok: true
      scenario: Omit<T, "anomalyType" | "attribute"> & {
        anomalyType: AnomalyType
        attribute?: AgentAttributeLabel
      }
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  const anomalyType = normalizeAnomalyType(scenario.anomalyType)
  if (!anomalyType) {
    return {
      ok: false,
      response: buildUnsupportedAnomalyTypeResponse(scenario.anomalyType),
    }
  }

  return {
    ok: true,
    scenario: {
      ...scenario,
      anomalyType,
      attribute: normalizeBuildToolAttribute(scenario.attribute),
    },
  }
}

export function resolveBuildToolResolvedScenario(
  scenario: BuildToolScenarioInput,
):
  | {
      ok: true
      scenario: BuildToolResolvedScenario
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  if (scenario.damageType === "disorder") {
    return resolveBuildToolDisorderScenario(scenario)
  }

  return {
    ok: true,
    scenario: resolveBuildToolScenario(scenario),
  }
}

export function resolveBuildToolResolvedSkillMatrixContext(
  context: BuildToolSkillMatrixContextInput,
): BuildToolResolvedSkillMatrixContext {
  return resolveBuildToolScenario(context)
}

export function resolveBuildToolOptionalScenario(
  scenario: BuildToolScenarioInput | undefined,
):
  | {
      ok: true
      scenario: BuildToolResolvedScenario | undefined
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  if (!scenario) {
    return {
      ok: true,
      scenario: undefined,
    }
  }

  return resolveBuildToolResolvedScenario(scenario)
}

export function resolveBuildToolDamageType<TDamageType extends string>(
  scopeLabel: BuildToolScopeLabel,
  damageType: string,
  supportedDamageTypes: readonly TDamageType[],
):
  | {
      ok: true
      damageType: TDamageType
    }
  | {
      ok: false
      response: BuildToolUnsupportedDamageTypeResponse
    } {
  if (!supportedDamageTypes.includes(damageType as TDamageType)) {
    return {
      ok: false,
      response: buildUnsupportedDamageTypeResponse(
        scopeLabel,
        supportedDamageTypes,
      ),
    }
  }

  return {
    ok: true,
    damageType: damageType as TDamageType,
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

export function normalizeAnomalyType(value: string): AnomalyType | undefined {
  const normalized = normalizeCatalogValue(value)
  switch (normalized) {
    case "fire":
    case "火":
    case "火属性":
    case "burn":
    case "灼烧":
      return "fire"
    case "electric":
    case "电":
    case "电属性":
    case "shock":
    case "感电":
      return "electric"
    case "ether":
    case "以太":
    case "以太属性":
    case "corruption":
    case "侵蚀":
      return "ether"
    case "ice":
    case "冰":
    case "冰属性":
    case "freeze":
    case "冻结":
      return "ice"
    case "physical":
    case "物理":
    case "物理属性":
    case "assault":
    case "强击":
      return "physical"
    case "auricink":
    case "auric":
    case "玄墨":
      return "auricInk"
    case "frost":
    case "烈霜":
      return "frost"
    default:
      return undefined
  }
}

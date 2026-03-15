import type {
  StaticBuildDriveDiscSetInput,
  StaticBuildLoadoutInput,
} from "zzz-data"
import type {
  BuildToolIncompatibleWEngineResponse,
  BuildToolScopeLabel,
  BuildToolUnsupportedAgentResponse,
  BuildToolUnsupportedDriveDiscResponse,
  BuildToolUnsupportedWEngineResponse,
  CatalogItem,
} from "./resolve-build-contracts"
import type { specialtyLabels } from "./resolve-build-labels"
import { catalogNames, findCatalogItem } from "./resolve-build-catalog"
import {
  buildIncompatibleWEngineResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
} from "./resolve-build-responses"

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

  const compatibleWEngines = options.getCompatibleWEngines(
    agentResolution.agent,
  )

  const wEngineResolution = resolveBuildToolWEngine(
    options.scopeLabel,
    options.supportedWEngines,
    compatibleWEngines,
    options.wEngineQuery,
    agentResolution.agent,
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
    agent: agentResolution.agent,
    compatibleWEngines,
    wEngine: wEngineResolution.wEngine,
    loadout: buildToolResolvedLoadoutInput({
      agent: agentResolution.agent,
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
  const supportedAgents = options.utilityOnly
    ? options.supportedUtilityAgents
    : options.supportedAgents

  const getCompatibleWEngines = options.utilityOnly
    ? options.getCompatibleUtilityWEngines
    : options.getCompatibleWEngines

  const supportedWEngines = options.utilityOnly
    ? options.supportedUtilityWEngines
    : options.supportedWEngines

  return resolveBuildToolLoadoutContext({
    ...options,
    supportedAgents,
    supportedWEngines,
    getCompatibleWEngines,
  })
}

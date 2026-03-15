import type {
  CompactStaticBuildResult,
  CompactStaticBuildSkillMatrixResult,
  CompactStaticBuildSourceDamageViewsResult,
  CompactStaticBuildSourceEntryCollection,
  CompactStaticBuildSourceUtilityViewsResult,
  CompactStaticBuildTriggerMatrixResult,
} from "zzz-data"
import type {
  BuildToolDamageSuccessResponse,
  BuildToolMissingFinalPanelResponse,
  BuildToolMissingSourceUtilityWEngineResponse,
  BuildToolScopeLabel,
  BuildToolSkillMatrixSuccessResponse,
  BuildToolSourceDamageViewsSuccessResponse,
  BuildToolSourceEntryCollectionSuccessResponse,
  BuildToolSourceUtilityViewsSuccessResponse,
  BuildToolTriggerMatrixSuccessResponse,
  BuildToolUncoveredSourceDamageViewResponse,
  BuildToolUncoveredSourceEntryCoverageResponse,
  BuildToolUncoveredSourceEntryUtilityOnlyResponse,
  BuildToolUncoveredSourceUtilityWEngineResponse,
  BuildToolUnsupportedAnomalyTypeResponse,
  BuildToolUnsupportedDamageTypeResponse,
  CatalogItem,
} from "./resolve-build-contracts"
import { candidateNames, catalogNames } from "./resolve-build-catalog"
import { buildToolScopeLabels } from "./resolve-build-contracts"

export interface BuildToolResolveSourceUtilityCoverageResponseOptions<
  TWEngine extends CatalogItem,
> {
  agentName: string
  supportedWEngines: readonly TWEngine[]
  wEngine?: TWEngine
}

export interface BuildToolResolveSourceUtilityViewsResponseOptions<
  TWEngine extends CatalogItem,
> extends BuildToolResolveSourceUtilityCoverageResponseOptions<TWEngine> {
  views?: CompactStaticBuildSourceUtilityViewsResult
}

export interface BuildToolResolveSourceDamageCoverageResponseOptions<
  TAgent extends CatalogItem,
> {
  agentName: string
  supportedAgents: readonly TAgent[]
}

export interface BuildToolResolveSourceDamageViewsResponseOptions<
  TAgent extends CatalogItem,
> extends BuildToolResolveSourceDamageCoverageResponseOptions<TAgent> {
  views: CompactStaticBuildSourceDamageViewsResult
}

export interface BuildToolResolveSourceEntryCoverageResponseOptions<
  TSourceViewAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> {
  agentName: string
  utilityOnly: boolean
  wEngine?: TWEngine
  wEngineQuery?: string
  compatibleWEngines: readonly TWEngine[]
  supportedSourceViewAgents: readonly TSourceViewAgent[]
  supportedUtilityWEngines: string[]
}

export interface BuildToolResolveSourceEntryCollectionResponseOptions<
  TSourceViewAgent extends CatalogItem,
  TWEngine extends CatalogItem,
> extends BuildToolResolveSourceEntryCoverageResponseOptions<
  TSourceViewAgent,
  TWEngine
> {
  collection: CompactStaticBuildSourceEntryCollection
}

export function buildUncoveredSourceDamageViewResponse<T extends CatalogItem>(
  items: readonly T[],
  query: string,
): BuildToolUncoveredSourceDamageViewResponse {
  return {
    found: false as const,
    message: `当前 ${buildToolScopeLabels.sourceDamageView} 暂未覆盖代理人「${query}」`,
    supportedAgents: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function resolveBuildToolSourceDamageCoverageResponse<
  TAgent extends CatalogItem,
>(
  options: BuildToolResolveSourceDamageCoverageResponseOptions<TAgent>,
): BuildToolUncoveredSourceDamageViewResponse {
  return buildUncoveredSourceDamageViewResponse(
    options.supportedAgents,
    options.agentName,
  )
}

export function resolveBuildToolSourceDamageViewsResponse<
  TAgent extends CatalogItem,
>(
  options: BuildToolResolveSourceDamageViewsResponseOptions<TAgent>,
):
  | BuildToolUncoveredSourceDamageViewResponse
  | BuildToolSourceDamageViewsSuccessResponse {
  if (options.views.entries.length === 0) {
    return resolveBuildToolSourceDamageCoverageResponse({
      agentName: options.agentName,
      supportedAgents: options.supportedAgents,
    })
  }

  return buildSourceDamageViewsSuccessResponse(options.views)
}

export function buildMissingSourceUtilityWEngineResponse<T extends CatalogItem>(
  agentName: string,
  items: readonly T[],
): BuildToolMissingSourceUtilityWEngineResponse {
  return {
    found: false as const,
    message: `请先提供 ${agentName} 当前使用的音擎；${buildToolScopeLabels.sourceUtilityView} 目前只覆盖音擎来源。`,
    supportedWEngines: catalogNames(items),
  }
}

export function buildUncoveredSourceUtilityWEngineResponse<
  T extends CatalogItem,
>(
  items: readonly T[],
  query: string,
): BuildToolUncoveredSourceUtilityWEngineResponse {
  return {
    found: false as const,
    message: `当前 ${buildToolScopeLabels.sourceUtilityView} 暂未覆盖音擎「${query}」`,
    supportedWEngines: catalogNames(items),
    candidates: candidateNames(items, query),
  }
}

export function resolveBuildToolSourceUtilityCoverageResponse<
  TWEngine extends CatalogItem,
>(
  options: BuildToolResolveSourceUtilityCoverageResponseOptions<TWEngine>,
):
  | BuildToolMissingSourceUtilityWEngineResponse
  | BuildToolUncoveredSourceUtilityWEngineResponse {
  if (!options.wEngine) {
    return buildMissingSourceUtilityWEngineResponse(
      options.agentName,
      options.supportedWEngines,
    )
  }

  return buildUncoveredSourceUtilityWEngineResponse(
    options.supportedWEngines,
    options.wEngine.name,
  )
}

export function resolveBuildToolSourceUtilityViewsResponse<
  TWEngine extends CatalogItem,
>(
  options: BuildToolResolveSourceUtilityViewsResponseOptions<TWEngine>,
):
  | BuildToolMissingSourceUtilityWEngineResponse
  | BuildToolUncoveredSourceUtilityWEngineResponse
  | BuildToolSourceUtilityViewsSuccessResponse {
  if (
    !options.wEngine ||
    !options.views ||
    options.views.entries.length === 0
  ) {
    return resolveBuildToolSourceUtilityCoverageResponse(options)
  }

  return buildSourceUtilityViewsSuccessResponse(options.views)
}

export function buildUncoveredSourceEntryUtilityOnlyResponse(
  agentName: string,
  supportedUtilityWEngines: string[],
): BuildToolUncoveredSourceEntryUtilityOnlyResponse {
  return {
    found: false,
    message: `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agentName} 的可返回条目；${buildToolScopeLabels.sourceUtilityView} 目前只覆盖音擎来源。`,
    supportedUtilityWEngines,
  }
}

export function buildUncoveredSourceEntryCoverageResponse<
  T extends CatalogItem,
>(
  agentName: string,
  sourceViewAgents: readonly T[],
  supportedUtilityWEngines: string[],
  candidates?: string[],
): BuildToolUncoveredSourceEntryCoverageResponse {
  return {
    found: false,
    message: `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agentName} 这套构筑的额外来源条目。`,
    supportedSourceViewAgents: catalogNames(sourceViewAgents),
    supportedUtilityWEngines,
    ...(candidates && candidates.length > 0 ? { candidates } : {}),
  }
}

export function resolveBuildToolUncoveredSourceEntryResponse<
  TSourceViewAgent extends CatalogItem,
  TWEngine extends CatalogItem,
>(
  options: BuildToolResolveSourceEntryCoverageResponseOptions<
    TSourceViewAgent,
    TWEngine
  >,
):
  | BuildToolUncoveredSourceEntryUtilityOnlyResponse
  | BuildToolUncoveredSourceEntryCoverageResponse {
  if (options.utilityOnly || !options.wEngine) {
    return buildUncoveredSourceEntryUtilityOnlyResponse(
      options.agentName,
      options.supportedUtilityWEngines,
    )
  }

  return buildUncoveredSourceEntryCoverageResponse(
    options.agentName,
    options.supportedSourceViewAgents,
    options.supportedUtilityWEngines,
    options.wEngineQuery
      ? candidateNames(options.compatibleWEngines, options.wEngineQuery)
      : [],
  )
}

export function resolveBuildToolSourceEntryCollectionResponse<
  TSourceViewAgent extends CatalogItem,
  TWEngine extends CatalogItem,
>(
  options: BuildToolResolveSourceEntryCollectionResponseOptions<
    TSourceViewAgent,
    TWEngine
  >,
):
  | BuildToolUncoveredSourceEntryUtilityOnlyResponse
  | BuildToolUncoveredSourceEntryCoverageResponse
  | BuildToolSourceEntryCollectionSuccessResponse {
  if (options.collection.entries.length === 0) {
    return resolveBuildToolUncoveredSourceEntryResponse(options)
  }

  return buildSourceEntryCollectionSuccessResponse(options.collection)
}

export function buildDamageSuccessResponse(
  build: CompactStaticBuildResult,
): BuildToolDamageSuccessResponse {
  return {
    found: true,
    build,
  }
}

export function buildSkillMatrixSuccessResponse(
  matrix: CompactStaticBuildSkillMatrixResult,
): BuildToolSkillMatrixSuccessResponse {
  return {
    found: true,
    matrix,
  }
}

export function buildTriggerMatrixSuccessResponse(
  matrix: CompactStaticBuildTriggerMatrixResult,
): BuildToolTriggerMatrixSuccessResponse {
  return {
    found: true,
    matrix,
  }
}

export function buildSourceDamageViewsSuccessResponse(
  views: CompactStaticBuildSourceDamageViewsResult,
): BuildToolSourceDamageViewsSuccessResponse {
  return {
    found: true,
    views,
  }
}

export function buildSourceUtilityViewsSuccessResponse(
  views: CompactStaticBuildSourceUtilityViewsResult,
): BuildToolSourceUtilityViewsSuccessResponse {
  return {
    found: true,
    views,
  }
}

export function buildSourceEntryCollectionSuccessResponse(
  collection: CompactStaticBuildSourceEntryCollection,
): BuildToolSourceEntryCollectionSuccessResponse {
  return {
    found: true,
    collection,
  }
}

export function buildUnsupportedAnomalyTypeResponse(
  value: string,
): BuildToolUnsupportedAnomalyTypeResponse {
  return {
    found: false,
    message: `当前 resolver 仅支持 fire / electric / ether / ice / physical / frost / auric-ink / honed-edge，收到 anomalyType=${value}`,
    supportedAnomalyTypes: [
      "fire",
      "electric",
      "ether",
      "ice",
      "physical",
      "frost",
      "auric-ink",
      "honed-edge",
    ],
  }
}

export function buildUnsupportedDamageTypeResponse(
  scopeLabel: BuildToolScopeLabel,
  supportedDamageTypes: readonly string[],
): BuildToolUnsupportedDamageTypeResponse {
  return {
    found: false,
    message: `当前 ${scopeLabel} 仅支持 ${supportedDamageTypes.join(" / ")}`,
    supportedDamageTypes: [...supportedDamageTypes],
  }
}

export function buildMissingSourceEntryFinalPanelResponse(): BuildToolMissingFinalPanelResponse {
  return {
    found: false,
    message: `anomaly / disorder 的 ${buildToolScopeLabels.sourceEntryCollection} 需要完整 finalPanel（至少 attack、critRate、critDamage，以及异常相关面板）。`,
  }
}

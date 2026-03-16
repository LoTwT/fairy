import type {
  CompactStaticBuildResult,
  CompactStaticBuildSkillMatrixResult,
  CompactStaticBuildSourceDamageViewsResult,
  CompactStaticBuildSourceEntryCollection,
  CompactStaticBuildSourceUtilityViewsResult,
  CompactStaticBuildTriggerMatrixResult,
} from "zzz-data"
import type { BuildToolSpecialtyKey } from "./resolve-build-labels"

export type BuildToolCatalogValue = string

export type BuildToolNormalizedCatalogValue = string

export type BuildToolCatalogId = string

export type BuildToolCatalogName = string

export type BuildToolCatalogNameList = readonly BuildToolCatalogName[]

export type BuildToolSupportedCatalogNameList = BuildToolCatalogName[]

export type BuildToolCandidateCatalogNameList = BuildToolCatalogName[]

export type BuildToolAttributeValue = string

export type BuildToolAnomalyTypeValue = BuildToolCatalogValue

export type BuildToolDamageTypeValue = string

export type BuildToolCatalogSpecialtyValue = string

export type BuildToolSupportedAnomalyTypeList =
  readonly BuildToolAnomalyTypeValue[]

export type BuildToolSupportedDamageTypeList =
  readonly BuildToolDamageTypeValue[]

export type BuildToolResponseMessageText = string

export type BuildToolSourceEntryUtilityOnlyFlag = boolean

export interface CatalogItem<
  TSpecialty extends BuildToolCatalogSpecialtyValue =
    BuildToolCatalogSpecialtyValue,
> {
  id: BuildToolCatalogId
  name: BuildToolCatalogName
  aliases: BuildToolCatalogNameList
  specialty?: TSpecialty
}

export type SpecialtyCatalogItem = CatalogItem<BuildToolSpecialtyKey> & {
  specialty: BuildToolSpecialtyKey
}

export type BuildToolScopeKey =
  | "resolver"
  | "skillMatrix"
  | "triggerMatrix"
  | "sourceDamageView"
  | "sourceUtilityView"
  | "sourceEntryCollection"

export type BuildToolScopeLabel =
  | "resolver"
  | "skill matrix"
  | "trigger-entry matrix"
  | "source-specific damage view"
  | "source-specific utility view"
  | "source-entry collection"

export const buildToolScopeLabels = {
  resolver: "resolver",
  skillMatrix: "skill matrix",
  triggerMatrix: "trigger-entry matrix",
  sourceDamageView: "source-specific damage view",
  sourceUtilityView: "source-specific utility view",
  sourceEntryCollection: "source-entry collection",
} as const satisfies Record<BuildToolScopeKey, BuildToolScopeLabel>

export interface BuildToolUnsupportedAgentResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedAgents: BuildToolSupportedCatalogNameList
  candidates: BuildToolCandidateCatalogNameList
}

export interface BuildToolUnsupportedWEngineResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedWEngines: BuildToolSupportedCatalogNameList
  candidates: BuildToolCandidateCatalogNameList
}

export interface BuildToolIncompatibleWEngineResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedWEngines: BuildToolSupportedCatalogNameList
  candidates: BuildToolCandidateCatalogNameList
}

export interface BuildToolUnsupportedDriveDiscResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedDriveDiscs: BuildToolSupportedCatalogNameList
  candidates: BuildToolCandidateCatalogNameList
}

export interface BuildToolUnsupportedAnomalyTypeResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedAnomalyTypes: BuildToolSupportedAnomalyTypeList
}

export interface BuildToolUnsupportedDamageTypeResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedDamageTypes: BuildToolSupportedDamageTypeList
}

export interface BuildToolUncoveredSourceDamageViewResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedAgents: BuildToolSupportedCatalogNameList
  candidates: BuildToolCandidateCatalogNameList
}

export interface BuildToolMissingSourceUtilityWEngineResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedWEngines: BuildToolSupportedCatalogNameList
}

export interface BuildToolUncoveredSourceUtilityWEngineResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedWEngines: BuildToolSupportedCatalogNameList
  candidates: BuildToolCandidateCatalogNameList
}

export interface BuildToolMissingFinalPanelResponse {
  found: false
  message: BuildToolResponseMessageText
}

export interface BuildToolUncoveredSourceEntryUtilityOnlyResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedUtilityWEngines: BuildToolSupportedCatalogNameList
}

export interface BuildToolUncoveredSourceEntryCoverageResponse {
  found: false
  message: BuildToolResponseMessageText
  supportedSourceViewAgents: BuildToolSupportedCatalogNameList
  supportedUtilityWEngines: BuildToolSupportedCatalogNameList
  candidates?: BuildToolCandidateCatalogNameList
}

export interface BuildToolDamageSuccessResponse {
  found: true
  build: CompactStaticBuildResult
}

export interface BuildToolSkillMatrixSuccessResponse {
  found: true
  matrix: CompactStaticBuildSkillMatrixResult
}

export interface BuildToolTriggerMatrixSuccessResponse {
  found: true
  matrix: CompactStaticBuildTriggerMatrixResult
}

export interface BuildToolSourceDamageViewsSuccessResponse {
  found: true
  views: CompactStaticBuildSourceDamageViewsResult
}

export interface BuildToolSourceUtilityViewsSuccessResponse {
  found: true
  views: CompactStaticBuildSourceUtilityViewsResult
}

export interface BuildToolSourceEntryCollectionSuccessResponse {
  found: true
  collection: CompactStaticBuildSourceEntryCollection
}

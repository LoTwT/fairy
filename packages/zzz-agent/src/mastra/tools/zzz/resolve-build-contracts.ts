import type {
  CompactStaticBuildResult,
  CompactStaticBuildSkillMatrixResult,
  CompactStaticBuildSourceDamageViewsResult,
  CompactStaticBuildSourceEntryCollection,
  CompactStaticBuildSourceUtilityViewsResult,
  CompactStaticBuildTriggerMatrixResult,
} from "zzz-data"
import type { BuildToolSpecialtyKey } from "./resolve-build-labels"

export interface CatalogItem<TSpecialty extends string = string> {
  id: string
  name: string
  aliases: readonly string[]
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
  message: string
  supportedAgents: string[]
  candidates: string[]
}

export interface BuildToolUnsupportedWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
  candidates: string[]
}

export interface BuildToolIncompatibleWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
  candidates: string[]
}

export interface BuildToolUnsupportedDriveDiscResponse {
  found: false
  message: string
  supportedDriveDiscs: string[]
  candidates: string[]
}

export interface BuildToolUnsupportedAnomalyTypeResponse {
  found: false
  message: string
  supportedAnomalyTypes: readonly string[]
}

export interface BuildToolUnsupportedDamageTypeResponse {
  found: false
  message: string
  supportedDamageTypes: readonly string[]
}

export interface BuildToolUncoveredSourceDamageViewResponse {
  found: false
  message: string
  supportedAgents: string[]
  candidates: string[]
}

export interface BuildToolMissingSourceUtilityWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
}

export interface BuildToolUncoveredSourceUtilityWEngineResponse {
  found: false
  message: string
  supportedWEngines: string[]
  candidates: string[]
}

export interface BuildToolMissingFinalPanelResponse {
  found: false
  message: string
}

export interface BuildToolUncoveredSourceEntryUtilityOnlyResponse {
  found: false
  message: string
  supportedUtilityWEngines: string[]
}

export interface BuildToolUncoveredSourceEntryCoverageResponse {
  found: false
  message: string
  supportedSourceViewAgents: string[]
  supportedUtilityWEngines: string[]
  candidates?: string[]
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

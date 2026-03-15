import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildSourceUtilityViewsResult,
  resolveStaticBuildSourceUtilityViews,
} from "zzz-data"
import {
  buildToolDescriptions,
  buildToolSourceUtilityViewCatalogPreset,
} from "./resolve-build-presets"
import {
  buildToolScopeLabels,
  resolveBuildSourceUtilityInputSchema,
  resolveBuildSourceUtilityViewsIncludeDetailsSchema,
  resolveBuildToolSourceUtilityExecutionContext,
  resolveBuildToolSourceUtilityViewsResponse,
} from "./resolve-build-shared"

export const resolveBuildSourceUtilityViews = createTool({
  id: "resolve-build-source-utility-views",
  description: buildToolDescriptions.sourceUtilityView,
  inputSchema: resolveBuildSourceUtilityInputSchema.extend({
    includeDetails: resolveBuildSourceUtilityViewsIncludeDetailsSchema,
  }),
  execute: async (input) => {
    const contextResolution = resolveBuildToolSourceUtilityExecutionContext({
      scopeLabel: buildToolScopeLabels.sourceUtilityView,
      ...buildToolSourceUtilityViewCatalogPreset,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const { agent, wEngine, loadout, supportedUtilityWEngines } =
      contextResolution

    const views = resolveStaticBuildSourceUtilityViews({
      loadout,
      panel: input.finalPanel,
    })

    return resolveBuildToolSourceUtilityViewsResponse({
      agentName: agent.name,
      supportedWEngines: supportedUtilityWEngines,
      wEngine,
      views: compactStaticBuildSourceUtilityViewsResult(
        views,
        input.includeDetails,
      ),
    })
  },
})

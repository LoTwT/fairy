import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildSourceDamageViewsResult,
  resolveStaticBuildSourceDamageViews,
} from "zzz-data"
import { buildToolScopeLabels } from "./resolve-build-contracts"
import {
  buildToolDescriptions,
  buildToolSourceDamageViewCatalogPreset,
} from "./resolve-build-presets"
import { resolveBuildToolSourceDamageViewsResponse } from "./resolve-build-responses"
import {
  resolveBuildInputSchema,
  resolveBuildSourceDamageViewsIncludeDetailsSchema,
  resolveBuildToolTriggeredDamageContext,
} from "./resolve-build-shared"

export const resolveBuildSourceDamageViews = createTool({
  id: "resolve-build-source-damage-views",
  description: buildToolDescriptions.sourceDamageView,
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: resolveBuildSourceDamageViewsIncludeDetailsSchema,
  }),
  execute: async (input) => {
    const contextResolution = resolveBuildToolTriggeredDamageContext({
      scopeLabel: buildToolScopeLabels.sourceDamageView,
      ...buildToolSourceDamageViewCatalogPreset,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
      scenario: input.scenario,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const { agent, loadout, scenario } = contextResolution

    const views = resolveStaticBuildSourceDamageViews({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    return resolveBuildToolSourceDamageViewsResponse({
      agentName: agent.name,
      supportedAgents: buildToolSourceDamageViewCatalogPreset.supportedAgents,
      views: compactStaticBuildSourceDamageViewsResult(
        views,
        input.includeDetails,
      ),
    })
  },
})

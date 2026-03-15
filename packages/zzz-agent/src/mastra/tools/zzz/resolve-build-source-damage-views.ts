import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceDamageViewsResult,
  resolveStaticBuildSourceDamageViews,
} from "zzz-data"
import {
  buildToolDescriptions,
  buildToolSourceDamageViewCatalogPreset,
} from "./resolve-build-presets"
import {
  buildToolScopeLabels,
  resolveBuildInputSchema,
  resolveBuildToolSourceDamageViewsResponse,
  resolveBuildToolTriggeredDamageContext,
} from "./resolve-build-shared"

export const resolveBuildSourceDamageViews = createTool({
  id: "resolve-build-source-damage-views",
  description: buildToolDescriptions.sourceDamageView,
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 source-damage-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；在原始结果带 build 时也透传 entry.build。默认 false，只保留各类 *Summary 与紧凑字段。",
      ),
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

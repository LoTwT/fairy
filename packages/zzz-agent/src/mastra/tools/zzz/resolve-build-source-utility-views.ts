import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceUtilityViewsResult,
  getCompatibleStaticBuildUtilityWEngines,
  resolveStaticBuildSourceUtilityViews,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceUtilityViewWEngines,
  supportedStaticBuildUtilityAgents,
  supportedStaticBuildUtilityWEngines,
} from "zzz-data"
import {
  buildToolScopeLabels,
  resolveBuildSourceUtilityInputSchema,
  resolveBuildToolSourceUtilityExecutionContext,
  resolveBuildToolSourceUtilityViewsResponse,
} from "./resolve-build-shared"

export const resolveBuildSourceUtilityViews = createTool({
  id: "resolve-build-source-utility-views",
  description:
    "查询 source-specific utility / resource 条目。当前覆盖稳定可表达的音擎回能、后场回能速率与喧响值条目，不并回主伤害公式。",
  inputSchema: resolveBuildSourceUtilityInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 source-utility-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes。默认 false，只保留各类 *Summary 与紧凑字段。",
      ),
  }),
  execute: async (input) => {
    const contextResolution = resolveBuildToolSourceUtilityExecutionContext({
      scopeLabel: buildToolScopeLabels.sourceUtilityView,
      supportedAgents: supportedStaticBuildUtilityAgents,
      supportedWEngines: supportedStaticBuildUtilityWEngines,
      supportedSourceUtilityWEngines:
        supportedStaticBuildSourceUtilityViewWEngines,
      supportedDriveDiscs: supportedStaticBuildDriveDiscs,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      getCompatibleWEngines: (agent) =>
        getCompatibleStaticBuildUtilityWEngines(agent.specialty),
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

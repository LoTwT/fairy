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
  buildMissingSourceUtilityWEngineResponse,
  buildSourceUtilityViewsSuccessResponse,
  buildToolLoadoutInput,
  buildToolScopeLabels,
  buildUncoveredSourceUtilityWEngineResponse,
  resolveBuildSourceUtilityInputSchema,
  resolveBuildToolAgent,
  resolveBuildToolDriveDiscSets,
  resolveBuildToolSourceUtilitySupport,
  resolveBuildToolWEngine,
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
    const agentResolution = resolveBuildToolAgent(
      buildToolScopeLabels.sourceUtilityView,
      supportedStaticBuildUtilityAgents,
      input.agent,
    )
    if (!agentResolution.ok) {
      return agentResolution.response
    }
    const agent = agentResolution.agent

    const compatibleWEngines = getCompatibleStaticBuildUtilityWEngines(
      agent.specialty,
    )
    const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
      supportedStaticBuildSourceUtilityViewWEngines,
      agent.specialty,
    )

    const wEngineResolution = resolveBuildToolWEngine(
      buildToolScopeLabels.sourceUtilityView,
      supportedStaticBuildUtilityWEngines,
      compatibleWEngines,
      input.wEngine,
      agent,
    )
    if (!wEngineResolution.ok) {
      return wEngineResolution.response
    }
    const wEngine = wEngineResolution.wEngine

    if (!wEngine) {
      return buildMissingSourceUtilityWEngineResponse(
        agent.name,
        sourceUtilitySupport.items,
      )
    }

    const driveDiscResolution = resolveBuildToolDriveDiscSets(
      buildToolScopeLabels.sourceUtilityView,
      input.driveDiscs,
      supportedStaticBuildDriveDiscs,
    )
    if (!driveDiscResolution.ok) {
      return driveDiscResolution.response
    }
    const loadout = buildToolLoadoutInput({
      agentId: agent.id,
      wEngineId: wEngine.id,
      driveDiscSets: driveDiscResolution.driveDiscSets,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })

    const views = resolveStaticBuildSourceUtilityViews({
      loadout,
      panel: input.finalPanel,
    })

    if (views.entries.length === 0) {
      return buildUncoveredSourceUtilityWEngineResponse(
        sourceUtilitySupport.items,
        wEngine.name,
      )
    }

    return buildSourceUtilityViewsSuccessResponse(
      compactStaticBuildSourceUtilityViewsResult(views, input.includeDetails),
    )
  },
})

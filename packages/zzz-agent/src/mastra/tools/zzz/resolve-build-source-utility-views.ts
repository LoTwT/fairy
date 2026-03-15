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
  buildIncompatibleWEngineResponse,
  buildMissingSourceUtilityWEngineResponse,
  buildSourceUtilityViewsSuccessResponse,
  buildToolScopeLabels,
  buildUncoveredSourceUtilityWEngineResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
  findCatalogItem,
  resolveBuildSourceUtilityInputSchema,
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
    const agent = findCatalogItem(
      supportedStaticBuildUtilityAgents,
      input.agent,
    )
    if (!agent) {
      return buildUnsupportedAgentResponse(
        buildToolScopeLabels.sourceUtilityView,
        supportedStaticBuildUtilityAgents,
        input.agent,
      )
    }

    const compatibleWEngines = getCompatibleStaticBuildUtilityWEngines(
      agent.specialty,
    )

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildUtilityWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      return buildUnsupportedWEngineResponse(
        buildToolScopeLabels.sourceUtilityView,
        compatibleWEngines,
        input.wEngine,
      )
    }
    if (wEngine && wEngine.specialty !== agent.specialty) {
      return buildIncompatibleWEngineResponse(
        agent,
        wEngine,
        compatibleWEngines,
        input.wEngine,
      )
    }

    if (!wEngine) {
      return buildMissingSourceUtilityWEngineResponse(
        agent.name,
        supportedStaticBuildSourceUtilityViewWEngines.filter(
          (item) => item.specialty === agent.specialty,
        ),
      )
    }

    const driveDiscSets = []
    for (const discInput of input.driveDiscs ?? []) {
      const disc = findCatalogItem(
        supportedStaticBuildDriveDiscs,
        discInput.name,
      )
      if (!disc) {
        return buildUnsupportedDriveDiscResponse(
          buildToolScopeLabels.sourceUtilityView,
          supportedStaticBuildDriveDiscs,
          discInput.name,
        )
      }
      driveDiscSets.push({ id: disc.id, pieces: discInput.pieces })
    }

    const views = resolveStaticBuildSourceUtilityViews({
      loadout: {
        agentId: agent.id,
        wEngineId: wEngine.id,
        driveDiscSets,
        agentLevel: input.agentLevel,
        agentMindscape: input.agentMindscape,
        coreSkillLevel: input.coreSkillLevel,
        wEngineRefinement: input.wEngineRefinement,
      },
      panel: input.finalPanel,
    })

    if (views.entries.length === 0) {
      return buildUncoveredSourceUtilityWEngineResponse(
        supportedStaticBuildSourceUtilityViewWEngines.filter(
          (item) => item.specialty === agent.specialty,
        ),
        wEngine.name,
      )
    }

    return buildSourceUtilityViewsSuccessResponse(
      compactStaticBuildSourceUtilityViewsResult(views, input.includeDetails),
    )
  },
})

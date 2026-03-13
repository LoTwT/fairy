import { createTool } from "@mastra/core/tools"
import {
  getCompatibleStaticBuildUtilityWEngines,
  resolveStaticBuildSourceUtilityViews,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceUtilityViewWEngines,
  supportedStaticBuildUtilityAgents,
  supportedStaticBuildUtilityWEngines,
} from "zzz-data"
import {
  buildIncompatibleWEngineResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
  candidateNames,
  catalogNames,
  findCatalogItem,
  resolveBuildSourceUtilityInputSchema,
} from "./resolve-build-shared"

export const resolveBuildSourceUtilityViews = createTool({
  id: "resolve-build-source-utility-views",
  description:
    "查询 source-specific utility / resource 条目。当前覆盖稳定可表达的音擎回能、后场回能速率与喧响值条目，不并回主伤害公式。",
  inputSchema: resolveBuildSourceUtilityInputSchema,
  execute: async (input) => {
    const agent = findCatalogItem(
      supportedStaticBuildUtilityAgents,
      input.agent,
    )
    if (!agent) {
      return buildUnsupportedAgentResponse(
        "source-specific utility view",
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
        "resolver",
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
      return {
        found: false,
        message: `请先提供 ${agent.name} 当前使用的音擎；utility / energy view 目前只覆盖音擎来源。`,
        supportedWEngines: catalogNames(
          supportedStaticBuildSourceUtilityViewWEngines.filter(
            (item) => item.specialty === agent.specialty,
          ),
        ),
      }
    }

    const driveDiscSets = []
    for (const discInput of input.driveDiscs ?? []) {
      const disc = findCatalogItem(
        supportedStaticBuildDriveDiscs,
        discInput.name,
      )
      if (!disc) {
        return buildUnsupportedDriveDiscResponse(
          "resolver",
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
      return {
        found: false,
        message: `当前 source-specific utility view 暂未覆盖音擎「${wEngine.name}」`,
        supportedWEngines: catalogNames(
          supportedStaticBuildSourceUtilityViewWEngines.filter(
            (item) => item.specialty === agent.specialty,
          ),
        ),
        candidates: candidateNames(
          supportedStaticBuildSourceUtilityViewWEngines.filter(
            (item) => item.specialty === agent.specialty,
          ),
          input.wEngine,
        ),
      }
    }

    return {
      found: true,
      views,
    }
  },
})

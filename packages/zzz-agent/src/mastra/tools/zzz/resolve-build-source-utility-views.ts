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
  findCatalogCandidates,
  findCatalogItem,
  resolveBuildSourceUtilityInputSchema,
  specialtyLabels,
} from "./resolve-build-shared"

export const resolveBuildSourceUtilityViews = createTool({
  id: "resolve-build-source-utility-views",
  description:
    "查询 source-specific utility / energy 条目。当前覆盖稳定可表达的音擎回能与后场回能速率，不并回主伤害公式。",
  inputSchema: resolveBuildSourceUtilityInputSchema,
  execute: async (input) => {
    const agent = findCatalogItem(
      supportedStaticBuildUtilityAgents,
      input.agent,
    )
    if (!agent) {
      return {
        found: false,
        message: `当前 source-specific utility view 暂不支持代理人「${input.agent}」`,
        supportedAgents: supportedStaticBuildUtilityAgents.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildUtilityAgents,
          input.agent,
        ).map((item) => item.name),
      }
    }

    const compatibleWEngines = getCompatibleStaticBuildUtilityWEngines(
      agent.specialty,
    )

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildUtilityWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      return {
        found: false,
        message: `当前 resolver 暂不支持音擎「${input.wEngine}」`,
        supportedWEngines: compatibleWEngines.map((item) => item.name),
        candidates: findCatalogCandidates(
          compatibleWEngines,
          input.wEngine,
        ).map((item) => item.name),
      }
    }
    if (wEngine && wEngine.specialty !== agent.specialty) {
      return {
        found: false,
        message: `${agent.name} 为 ${specialtyLabels[agent.specialty]}代理人，无法使用 ${wEngine.name}（${specialtyLabels[wEngine.specialty]}音擎）`,
        supportedWEngines: compatibleWEngines.map((item) => item.name),
        candidates: findCatalogCandidates(
          compatibleWEngines,
          input.wEngine,
        ).map((item) => item.name),
      }
    }

    if (!wEngine) {
      return {
        found: false,
        message: `请先提供 ${agent.name} 当前使用的音擎；utility / energy view 目前只覆盖音擎来源。`,
        supportedWEngines: supportedStaticBuildSourceUtilityViewWEngines
          .filter((item) => item.specialty === agent.specialty)
          .map((item) => item.name),
      }
    }

    const driveDiscSets = []
    for (const discInput of input.driveDiscs ?? []) {
      const disc = findCatalogItem(
        supportedStaticBuildDriveDiscs,
        discInput.name,
      )
      if (!disc) {
        return {
          found: false,
          message: `当前 resolver 暂不支持驱动盘「${discInput.name}」`,
          supportedDriveDiscs: supportedStaticBuildDriveDiscs.map(
            (item) => item.name,
          ),
          candidates: findCatalogCandidates(
            supportedStaticBuildDriveDiscs,
            discInput.name,
          ).map((item) => item.name),
        }
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
        supportedWEngines: supportedStaticBuildSourceUtilityViewWEngines
          .filter((item) => item.specialty === agent.specialty)
          .map((item) => item.name),
        candidates: findCatalogCandidates(
          supportedStaticBuildSourceUtilityViewWEngines.filter(
            (item) => item.specialty === agent.specialty,
          ),
          input.wEngine,
        ).map((item) => item.name),
      }
    }

    return {
      found: true,
      views,
    }
  },
})

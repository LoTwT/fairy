import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceDamageViewsResult,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSourceDamageViews,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceViewAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  buildIncompatibleWEngineResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
  candidateNames,
  catalogNames,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildInputSchema,
} from "./resolve-build-shared"

export const resolveBuildSourceDamageViews = createTool({
  id: "resolve-build-source-damage-views",
  description:
    "查询 anomaly / disorder 的 source-specific 额外结算条目。当前覆盖爱丽丝 [极性强击]、雅 [霜灼·破]、柏妮思 [燃点]/[余烬]、爱芮 [异放]、薇薇安 [异放]，不会把这些条目并回主公式。",
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 source-damage-view 的完整 build 结果（trace、damageParams 等）。默认 false，以避免上下文过大。",
      ),
  }),
  execute: async (input) => {
    if (
      input.scenario.damageType !== "anomaly" &&
      input.scenario.damageType !== "disorder"
    ) {
      return {
        found: false,
        message:
          "source-specific damage view 只用于 anomaly / disorder 的额外结算，不适用于 normal / sheer。",
        supportedDamageTypes: ["anomaly", "disorder"],
      }
    }

    const agent = findCatalogItem(supportedStaticBuildAgents, input.agent)
    if (!agent) {
      return buildUnsupportedAgentResponse(
        "source-specific damage view",
        supportedStaticBuildSourceViewAgents,
        input.agent,
      )
    }

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return buildUnsupportedWEngineResponse(
        "resolver",
        compatibleWEngines,
        input.wEngine,
      )
    }
    if (wEngine && wEngine.specialty !== agent.specialty) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return buildIncompatibleWEngineResponse(
        agent,
        wEngine,
        compatibleWEngines,
        input.wEngine,
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
          "resolver",
          supportedStaticBuildDriveDiscs,
          discInput.name,
        )
      }
      driveDiscSets.push({ id: disc.id, pieces: discInput.pieces })
    }

    if (input.scenario.damageType === "disorder") {
      const anomalyType = normalizeAnomalyType(input.scenario.anomalyType)
      if (!anomalyType) {
        return buildUnsupportedAnomalyTypeResponse(input.scenario.anomalyType)
      }

      const views = resolveStaticBuildSourceDamageViews({
        mode: input.mode,
        manualBaseMode: input.manualBaseMode,
        loadout: {
          agentId: agent.id,
          wEngineId: wEngine?.id,
          driveDiscSets,
          agentLevel: input.agentLevel,
          agentMindscape: input.agentMindscape,
          coreSkillLevel: input.coreSkillLevel,
          wEngineRefinement: input.wEngineRefinement,
        },
        panel: input.finalPanel,
        scenario: {
          ...input.scenario,
          anomalyType,
          attribute: input.scenario.attribute as
            | AgentAttributeLabel
            | undefined,
        },
        effectOverrides: input.effectOverrides,
      })

      if (views.entries.length === 0) {
        return {
          found: false,
          message: `当前 source-specific damage view 暂未覆盖代理人「${agent.name}」`,
          supportedAgents: catalogNames(supportedStaticBuildSourceViewAgents),
          candidates: candidateNames(
            supportedStaticBuildSourceViewAgents,
            input.agent,
          ),
        }
      }

      return {
        found: true,
        views: compactStaticBuildSourceDamageViewsResult(
          views,
          input.includeDetails,
        ),
      }
    }

    const views = resolveStaticBuildSourceDamageViews({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout: {
        agentId: agent.id,
        wEngineId: wEngine?.id,
        driveDiscSets,
        agentLevel: input.agentLevel,
        agentMindscape: input.agentMindscape,
        coreSkillLevel: input.coreSkillLevel,
        wEngineRefinement: input.wEngineRefinement,
      },
      panel: input.finalPanel,
      scenario: {
        ...input.scenario,
        attribute: input.scenario.attribute as AgentAttributeLabel | undefined,
      },
      effectOverrides: input.effectOverrides,
    })

    if (views.entries.length === 0) {
      return {
        found: false,
        message: `当前 source-specific damage view 暂未覆盖代理人「${agent.name}」`,
        supportedAgents: catalogNames(supportedStaticBuildSourceViewAgents),
        candidates: candidateNames(
          supportedStaticBuildSourceViewAgents,
          input.agent,
        ),
      }
    }

    return {
      found: true,
      views: compactStaticBuildSourceDamageViewsResult(
        views,
        input.includeDetails,
      ),
    }
  },
})

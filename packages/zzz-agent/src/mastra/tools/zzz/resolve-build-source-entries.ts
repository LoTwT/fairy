import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceEntryCollection,
  getCompatibleStaticBuildUtilityWEngines,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSourceEntries,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceUtilityViewWEngines,
  supportedStaticBuildSourceViewAgents,
  supportedStaticBuildUtilityAgents,
  supportedStaticBuildUtilityWEngines,
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
  finalPanelSchema,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildSourceEntriesInputSchema,
} from "./resolve-build-shared"

export const resolveBuildSourceEntries = createTool({
  id: "resolve-build-source-entries",
  description:
    "统一查询当前构筑的 source-specific 条目集合：可一次性返回 anomaly / disorder 的独立额外结算条目，以及音擎提供的 utility / resource 条目。不会把这些条目并回主公式。",
  inputSchema: resolveBuildSourceEntriesInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 source-damage entries 的完整 build 结果（trace、damageParams 等）。默认 false，以避免上下文过大。",
      ),
  }),
  execute: async (input) => {
    const utilityOnly =
      !input.scenario ||
      input.scenario.damageType === "normal" ||
      input.scenario.damageType === "sheer"

    const agentCatalog = utilityOnly
      ? supportedStaticBuildUtilityAgents
      : supportedStaticBuildAgents

    const agent = findCatalogItem(agentCatalog, input.agent)
    if (!agent) {
      return buildUnsupportedAgentResponse(
        "source-entry collection",
        agentCatalog,
        input.agent,
      )
    }

    const compatibleWEngines = utilityOnly
      ? getCompatibleStaticBuildUtilityWEngines(agent.specialty)
      : getCompatibleStaticBuildWEngines(agent.specialty)
    const supportedUtilityWEngines = catalogNames(
      supportedStaticBuildSourceUtilityViewWEngines.filter(
        (item) => item.specialty === agent.specialty,
      ),
    )

    const wEngine = input.wEngine
      ? findCatalogItem(
          utilityOnly
            ? supportedStaticBuildUtilityWEngines
            : supportedStaticBuildWEngines,
          input.wEngine,
        )
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

    let scenario = input.scenario
    if (scenario?.damageType === "disorder") {
      const anomalyType = normalizeAnomalyType(scenario.anomalyType)
      if (!anomalyType) {
        return buildUnsupportedAnomalyTypeResponse(scenario.anomalyType)
      }
      scenario = {
        ...scenario,
        anomalyType,
        attribute: scenario.attribute as AgentAttributeLabel | undefined,
      }
    } else if (scenario) {
      scenario = {
        ...scenario,
        attribute: scenario.attribute as AgentAttributeLabel | undefined,
      }
    }

    if (
      scenario &&
      (scenario.damageType === "anomaly" || scenario.damageType === "disorder")
    ) {
      const fullPanel = finalPanelSchema.safeParse(input.finalPanel)
      if (!fullPanel.success) {
        return {
          found: false,
          message:
            "anomaly / disorder 的 source-entry collection 需要完整 finalPanel（至少 attack、critRate、critDamage，以及异常相关面板）。",
        }
      }
    }

    const collection = resolveStaticBuildSourceEntries({
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
      panel: input.finalPanel as any,
      scenario: scenario as any,
      effectOverrides: input.effectOverrides,
    })

    if (collection.entries.length === 0) {
      return {
        found: false,
        message: utilityOnly
          ? `当前 source-entry collection 暂未覆盖 ${agent.name} 的可返回条目；utility entries 目前只覆盖音擎来源。`
          : `当前 source-entry collection 暂未覆盖 ${agent.name} 这套构筑的额外来源条目。`,
        supportedSourceViewAgents: catalogNames(
          supportedStaticBuildSourceViewAgents,
        ),
        supportedUtilityWEngines,
        candidates: input.wEngine
          ? candidateNames(compatibleWEngines, input.wEngine)
          : [],
      }
    }

    return {
      found: true,
      collection: compactStaticBuildSourceEntryCollection(
        collection,
        input.includeDetails,
      ),
    }
  },
})

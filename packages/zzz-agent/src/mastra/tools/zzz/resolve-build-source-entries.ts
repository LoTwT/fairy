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
  buildMissingSourceEntryFinalPanelResponse,
  buildToolScopeLabels,
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
        "是否返回 source-entry collection 完整明细，包括顶层 collection.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；若某条 source-damage-view entry 原始结果带有 build，也会一并返回完整 build 结果（trace、damageParams 等）。默认 false，只保留各类 *Summary 与紧凑字段。",
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
        buildToolScopeLabels.sourceEntryCollection,
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
        buildToolScopeLabels.sourceEntryCollection,
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
          buildToolScopeLabels.sourceEntryCollection,
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
        return buildMissingSourceEntryFinalPanelResponse()
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
      if (utilityOnly && !wEngine) {
        return {
          message: `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agent.name} 的可返回条目；${buildToolScopeLabels.sourceUtilityView} 目前只覆盖音擎来源。`,
          found: false,
          supportedUtilityWEngines,
        }
      }

      if (!utilityOnly && !wEngine) {
        return {
          found: false,
          message: `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agent.name} 这套构筑的额外来源条目。`,
          supportedSourceViewAgents: catalogNames(
            supportedStaticBuildSourceViewAgents,
          ),
          supportedUtilityWEngines,
        }
      }

      return {
        found: false,
        message: utilityOnly
          ? `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agent.name} 的可返回条目；${buildToolScopeLabels.sourceUtilityView} 目前只覆盖音擎来源。`
          : `当前 ${buildToolScopeLabels.sourceEntryCollection} 暂未覆盖 ${agent.name} 这套构筑的额外来源条目。`,
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

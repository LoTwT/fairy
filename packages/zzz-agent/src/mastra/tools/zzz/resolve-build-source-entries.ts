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
  buildSourceEntryCollectionSuccessResponse,
  buildToolScopeLabels,
  resolveBuildSourceEntriesInputSchema,
  resolveBuildToolLoadoutContext,
  resolveBuildToolSourceEntriesContext,
  resolveBuildToolSourceUtilitySupport,
  resolveBuildToolUncoveredSourceEntryResponse,
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
    const contextResolution = resolveBuildToolSourceEntriesContext({
      scenario: input.scenario,
      finalPanel: input.finalPanel,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const { utilityOnly, scenario, panel } = contextResolution.context

    const agentCatalog = utilityOnly
      ? supportedStaticBuildUtilityAgents
      : supportedStaticBuildAgents

    const loadoutResolution = resolveBuildToolLoadoutContext({
      scopeLabel: buildToolScopeLabels.sourceEntryCollection,
      supportedAgents: agentCatalog,
      supportedWEngines: utilityOnly
        ? supportedStaticBuildUtilityWEngines
        : supportedStaticBuildWEngines,
      supportedDriveDiscs: supportedStaticBuildDriveDiscs,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      getCompatibleWEngines: (agent) =>
        utilityOnly
          ? getCompatibleStaticBuildUtilityWEngines(agent.specialty)
          : getCompatibleStaticBuildWEngines(agent.specialty),
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })
    if (!loadoutResolution.ok) {
      return loadoutResolution.response
    }
    const { agent, compatibleWEngines, wEngine } = loadoutResolution

    const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
      supportedStaticBuildSourceUtilityViewWEngines,
      agent.specialty,
    )
    const supportedUtilityWEngines = sourceUtilitySupport.names
    const { loadout } = loadoutResolution

    const collection = resolveStaticBuildSourceEntries({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    if (collection.entries.length === 0) {
      return resolveBuildToolUncoveredSourceEntryResponse({
        agentName: agent.name,
        utilityOnly,
        wEngine,
        wEngineQuery: input.wEngine,
        compatibleWEngines,
        supportedSourceViewAgents: supportedStaticBuildSourceViewAgents,
        supportedUtilityWEngines,
      })
    }

    return buildSourceEntryCollectionSuccessResponse(
      compactStaticBuildSourceEntryCollection(collection, input.includeDetails),
    )
  },
})

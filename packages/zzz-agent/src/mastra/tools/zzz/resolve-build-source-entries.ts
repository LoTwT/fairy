import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceEntryCollection,
  resolveStaticBuildSourceEntries,
} from "zzz-data"
import { buildToolSourceEntryCatalogPreset } from "./resolve-build-presets"
import {
  buildToolScopeLabels,
  resolveBuildSourceEntriesInputSchema,
  resolveBuildToolSourceEntriesExecutionContext,
  resolveBuildToolSourceEntryCollectionResponse,
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
    const contextResolution = resolveBuildToolSourceEntriesExecutionContext({
      utilityOnly: false,
      scopeLabel: buildToolScopeLabels.sourceEntryCollection,
      ...buildToolSourceEntryCatalogPreset,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
      scenario: input.scenario,
      finalPanel: input.finalPanel,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const {
      utilityOnly,
      scenario,
      panel,
      agent,
      compatibleWEngines,
      wEngine,
      loadout,
      supportedUtilityWEngines,
    } = contextResolution

    const collection = resolveStaticBuildSourceEntries({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    return resolveBuildToolSourceEntryCollectionResponse({
      agentName: agent.name,
      utilityOnly,
      wEngine,
      wEngineQuery: input.wEngine,
      compatibleWEngines,
      supportedSourceViewAgents:
        buildToolSourceEntryCatalogPreset.supportedSourceViewAgents,
      supportedUtilityWEngines,
      collection: compactStaticBuildSourceEntryCollection(
        collection,
        input.includeDetails,
      ),
    })
  },
})

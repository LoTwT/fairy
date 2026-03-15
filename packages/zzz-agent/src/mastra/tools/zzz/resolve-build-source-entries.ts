import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildSourceEntryCollection,
  resolveStaticBuildSourceEntries,
} from "zzz-data"
import { buildToolScopeLabels } from "./resolve-build-contracts"
import {
  buildToolDescriptions,
  buildToolSourceEntryCatalogPreset,
} from "./resolve-build-presets"
import { resolveBuildToolSourceEntryCollectionResponse } from "./resolve-build-responses"
import {
  resolveBuildSourceEntriesIncludeDetailsSchema,
  resolveBuildSourceEntriesInputSchema,
  resolveBuildToolSourceEntriesExecutionContext,
} from "./resolve-build-shared"

export const resolveBuildSourceEntries = createTool({
  id: "resolve-build-source-entries",
  description: buildToolDescriptions.sourceEntryCollection,
  inputSchema: resolveBuildSourceEntriesInputSchema.extend({
    includeDetails: resolveBuildSourceEntriesIncludeDetailsSchema,
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

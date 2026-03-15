import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildTriggerMatrixResult,
  resolveStaticBuildTriggerMatrix,
} from "zzz-data"
import {
  buildToolDescriptions,
  buildToolTriggerMatrixCatalogPreset,
} from "./resolve-build-presets"
import {
  buildToolScopeLabels,
  buildTriggerMatrixSuccessResponse,
  resolveBuildInputSchema,
  resolveBuildToolTriggeredDamageContext,
  resolveBuildTriggerMatrixIncludeDetailsSchema,
} from "./resolve-build-shared"

export const resolveBuildTriggerMatrix = createTool({
  id: "resolve-build-trigger-matrix",
  description: buildToolDescriptions.triggerMatrix,
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: resolveBuildTriggerMatrixIncludeDetailsSchema,
  }),
  execute: async (input) => {
    const contextResolution = resolveBuildToolTriggeredDamageContext({
      scopeLabel: buildToolScopeLabels.triggerMatrix,
      ...buildToolTriggerMatrixCatalogPreset,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
      scenario: input.scenario,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const { loadout, scenario } = contextResolution

    const matrix = resolveStaticBuildTriggerMatrix({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    return buildTriggerMatrixSuccessResponse(
      compactStaticBuildTriggerMatrixResult(matrix, input.includeDetails),
    )
  },
})

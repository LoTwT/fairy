import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildTriggerMatrixResult,
  resolveStaticBuildTriggerMatrix,
} from "zzz-data"
import { buildToolScopeLabels } from "./resolve-build-contracts"
import {
  buildToolDescriptions,
  buildToolTriggerMatrixCatalogPreset,
} from "./resolve-build-presets"
import { buildTriggerMatrixSuccessResponse } from "./resolve-build-responses"
import {
  resolveBuildInputSchema,
  resolveBuildTriggerMatrixIncludeDetailsSchema,
} from "./resolve-build-schemas"
import { resolveBuildToolTriggeredDamageContext } from "./resolve-build-shared"

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

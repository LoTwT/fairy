import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildSkillMatrixResult,
  resolveStaticBuildSkillMatrix,
} from "zzz-data"
import { buildToolScopeLabels } from "./resolve-build-contracts"
import {
  buildToolDescriptions,
  buildToolSkillMatrixCatalogPreset,
} from "./resolve-build-presets"
import { buildSkillMatrixSuccessResponse } from "./resolve-build-responses"
import { resolveBuildSkillMatrixInputSchema } from "./resolve-build-schemas"
import { resolveBuildToolSkillMatrixExecutionContext } from "./resolve-build-shared"

export const resolveBuildSkillMatrix = createTool({
  id: "resolve-build-skill-matrix",
  description: buildToolDescriptions.skillMatrix,
  inputSchema: resolveBuildSkillMatrixInputSchema,
  execute: async (input) => {
    const contextResolution = resolveBuildToolSkillMatrixExecutionContext({
      scopeLabel: buildToolScopeLabels.skillMatrix,
      ...buildToolSkillMatrixCatalogPreset,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
      context: input.context,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const { loadout, context } = contextResolution

    const matrix = resolveStaticBuildSkillMatrix({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      context,
      effectOverrides: input.effectOverrides,
    })

    return buildSkillMatrixSuccessResponse(
      compactStaticBuildSkillMatrixResult(matrix, input.includeDetails),
    )
  },
})

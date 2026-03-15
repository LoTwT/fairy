import { createTool } from "@mastra/core/tools"
import { z } from "zod"
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
} from "./resolve-build-shared"

export const resolveBuildTriggerMatrix = createTool({
  id: "resolve-build-trigger-matrix",
  description: buildToolDescriptions.triggerMatrix,
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 trigger matrix 完整明细，包括顶层 matrix.assumptions，以及每行的 row.assumptions / row.requirements / row.diagnostics / row.sourceNotes；在原始结果带 build 时也透传 row.build。默认 false，只保留各类 *Summary 与紧凑字段。",
      ),
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

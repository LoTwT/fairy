import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildTriggerMatrixResult,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildTriggerMatrix,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildTriggerMatrixAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  buildToolScopeLabels,
  buildTriggerMatrixSuccessResponse,
  resolveBuildInputSchema,
  resolveBuildToolDamageType,
  resolveBuildToolLoadoutContext,
  resolveBuildToolResolvedScenario,
} from "./resolve-build-shared"

export const resolveBuildTriggerMatrix = createTool({
  id: "resolve-build-trigger-matrix",
  description:
    "查询 anomaly / disorder 的 trigger-entry matrix。当前只覆盖已有 source view 的异常代理人：爱丽丝、雅、柏妮思、爱芮、薇薇安；结果会并列返回主公式结算与 source-specific 额外结算条目。",
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
    const damageTypeResolution = resolveBuildToolDamageType(
      buildToolScopeLabels.triggerMatrix,
      input.scenario.damageType,
      ["anomaly", "disorder"],
    )
    if (!damageTypeResolution.ok) {
      return damageTypeResolution.response
    }

    const loadoutResolution = resolveBuildToolLoadoutContext({
      scopeLabel: buildToolScopeLabels.triggerMatrix,
      supportedAgents: supportedStaticBuildTriggerMatrixAgents,
      supportedWEngines: supportedStaticBuildWEngines,
      supportedDriveDiscs: supportedStaticBuildDriveDiscs,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      getCompatibleWEngines: (agent) =>
        getCompatibleStaticBuildWEngines(agent.specialty),
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })
    if (!loadoutResolution.ok) {
      return loadoutResolution.response
    }
    const { loadout } = loadoutResolution

    const scenarioResolution = resolveBuildToolResolvedScenario(input.scenario)
    if (!scenarioResolution.ok) {
      return scenarioResolution.response
    }

    const matrix = resolveStaticBuildTriggerMatrix({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario: scenarioResolution.scenario,
      effectOverrides: input.effectOverrides,
    })

    return buildTriggerMatrixSuccessResponse(
      compactStaticBuildTriggerMatrixResult(matrix, input.includeDetails),
    )
  },
})

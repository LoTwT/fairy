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
  buildToolResolvedLoadoutInput,
  buildToolScopeLabels,
  buildTriggerMatrixSuccessResponse,
  resolveBuildInputSchema,
  resolveBuildToolAgent,
  resolveBuildToolDamageType,
  resolveBuildToolDisorderScenario,
  resolveBuildToolDriveDiscSets,
  resolveBuildToolScenario,
  resolveBuildToolWEngine,
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

    const agentResolution = resolveBuildToolAgent(
      buildToolScopeLabels.triggerMatrix,
      supportedStaticBuildTriggerMatrixAgents,
      input.agent,
    )
    if (!agentResolution.ok) {
      return agentResolution.response
    }
    const agent = agentResolution.agent

    const wEngineResolution = resolveBuildToolWEngine(
      buildToolScopeLabels.triggerMatrix,
      supportedStaticBuildWEngines,
      getCompatibleStaticBuildWEngines(agent.specialty),
      input.wEngine,
      agent,
    )
    if (!wEngineResolution.ok) {
      return wEngineResolution.response
    }
    const wEngine = wEngineResolution.wEngine

    const driveDiscResolution = resolveBuildToolDriveDiscSets(
      buildToolScopeLabels.triggerMatrix,
      input.driveDiscs,
      supportedStaticBuildDriveDiscs,
    )
    if (!driveDiscResolution.ok) {
      return driveDiscResolution.response
    }
    const loadout = buildToolResolvedLoadoutInput({
      agent,
      wEngine,
      driveDiscSets: driveDiscResolution.driveDiscSets,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })

    const scenarioResolution =
      damageTypeResolution.damageType === "disorder"
        ? resolveBuildToolDisorderScenario(input.scenario)
        : {
            ok: true as const,
            scenario: resolveBuildToolScenario(input.scenario),
          }
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

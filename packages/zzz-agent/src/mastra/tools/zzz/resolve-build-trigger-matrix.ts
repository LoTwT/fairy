import type { AgentAttributeLabel } from "zzz-data"
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
  buildIncompatibleWEngineResponse,
  buildToolLoadoutInput,
  buildToolScopeLabels,
  buildTriggerMatrixSuccessResponse,
  buildUnsupportedAgentResponse,
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDamageTypeResponse,
  buildUnsupportedWEngineResponse,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildInputSchema,
  resolveBuildToolDriveDiscSets,
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
    if (
      input.scenario.damageType !== "anomaly" &&
      input.scenario.damageType !== "disorder"
    ) {
      return buildUnsupportedDamageTypeResponse(
        buildToolScopeLabels.triggerMatrix,
        ["anomaly", "disorder"],
      )
    }

    const agent = findCatalogItem(
      supportedStaticBuildTriggerMatrixAgents,
      input.agent,
    )
    if (!agent) {
      return buildUnsupportedAgentResponse(
        buildToolScopeLabels.triggerMatrix,
        supportedStaticBuildTriggerMatrixAgents,
        input.agent,
      )
    }

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return buildUnsupportedWEngineResponse(
        buildToolScopeLabels.triggerMatrix,
        compatibleWEngines,
        input.wEngine,
      )
    }
    if (wEngine && wEngine.specialty !== agent.specialty) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return buildIncompatibleWEngineResponse(
        agent,
        wEngine,
        compatibleWEngines,
        input.wEngine,
      )
    }

    const driveDiscResolution = resolveBuildToolDriveDiscSets(
      buildToolScopeLabels.triggerMatrix,
      input.driveDiscs,
      supportedStaticBuildDriveDiscs,
    )
    if (!driveDiscResolution.ok) {
      return driveDiscResolution.response
    }
    const loadout = buildToolLoadoutInput({
      agentId: agent.id,
      wEngineId: wEngine?.id,
      driveDiscSets: driveDiscResolution.driveDiscSets,
      agentLevel: input.agentLevel,
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })

    const scenario =
      input.scenario.damageType === "disorder"
        ? {
            ...input.scenario,
            anomalyType: normalizeAnomalyType(input.scenario.anomalyType),
            attribute: input.scenario.attribute as
              | AgentAttributeLabel
              | undefined,
          }
        : {
            ...input.scenario,
            attribute: input.scenario.attribute as
              | AgentAttributeLabel
              | undefined,
          }

    if (
      input.scenario.damageType === "disorder" &&
      scenario.anomalyType === undefined
    ) {
      return buildUnsupportedAnomalyTypeResponse(input.scenario.anomalyType)
    }

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

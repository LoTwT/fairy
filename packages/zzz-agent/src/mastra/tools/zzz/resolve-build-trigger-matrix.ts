import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildTriggerMatrix,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildTriggerMatrixAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  findCatalogCandidates,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildInputSchema,
  specialtyLabels,
} from "./resolve-build-shared"

function compactTriggerMatrix(
  matrix: ReturnType<typeof resolveStaticBuildTriggerMatrix>,
  includeDetails: boolean,
) {
  return {
    profile: matrix.profile,
    mode: matrix.mode,
    manualBaseMode: matrix.manualBaseMode,
    loadout: matrix.loadout,
    summary: {
      mainFormulaCount: matrix.rows.filter(
        (row) => row.metadata.entryKind === "main-formula",
      ).length,
      sourceViewCount: matrix.rows.filter(
        (row) => row.metadata.entryKind === "source-view",
      ).length,
      unsupportedCount: matrix.rows.filter((row) => !row.supported).length,
    },
    assumptions: matrix.assumptions,
    rows: matrix.rows.map((row) => ({
      id: row.id,
      label: row.label,
      supported: row.supported,
      metadata: row.metadata,
      requirements: row.requirements,
      diagnostics: row.diagnostics,
      sourceNotes: row.sourceNotes,
      assumptions: row.assumptions,
      damage: row.damage,
      ...(includeDetails && row.build ? { build: row.build } : {}),
    })),
  }
}

export const resolveBuildTriggerMatrix = createTool({
  id: "resolve-build-trigger-matrix",
  description:
    "查询 anomaly / disorder 的 trigger-entry matrix。当前只覆盖已有 source view 的异常代理人：爱丽丝、雅、柏妮思、爱芮；结果会并列返回主公式结算与 source-specific 额外结算条目。",
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回每行完整 build 结果（trace、damageParams 等）。默认 false，以避免上下文过大。",
      ),
  }),
  execute: async (input) => {
    if (
      input.scenario.damageType !== "anomaly" &&
      input.scenario.damageType !== "disorder"
    ) {
      return {
        found: false,
        message:
          "trigger-entry matrix 只用于 anomaly / disorder，不适用于 normal / sheer。",
        supportedDamageTypes: ["anomaly", "disorder"],
      }
    }

    const agent = findCatalogItem(
      supportedStaticBuildTriggerMatrixAgents,
      input.agent,
    )
    if (!agent) {
      return {
        found: false,
        message: `当前 trigger-entry matrix 暂不支持代理人「${input.agent}」`,
        supportedAgents: supportedStaticBuildTriggerMatrixAgents.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildTriggerMatrixAgents,
          input.agent,
        ).map((item) => item.name),
      }
    }

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return {
        found: false,
        message: `当前 trigger-entry matrix 暂不支持音擎「${input.wEngine}」`,
        supportedWEngines: compatibleWEngines.map((item) => item.name),
        candidates: findCatalogCandidates(
          compatibleWEngines,
          input.wEngine,
        ).map((item) => item.name),
      }
    }
    if (wEngine && wEngine.specialty !== agent.specialty) {
      const compatibleWEngines = getCompatibleStaticBuildWEngines(
        agent.specialty,
      )
      return {
        found: false,
        message: `${agent.name} 为 ${specialtyLabels[agent.specialty]}代理人，无法使用 ${wEngine.name}（${specialtyLabels[wEngine.specialty]}音擎）`,
        supportedWEngines: compatibleWEngines.map((item) => item.name),
        candidates: findCatalogCandidates(
          compatibleWEngines,
          input.wEngine,
        ).map((item) => item.name),
      }
    }

    const driveDiscSets = []
    for (const discInput of input.driveDiscs ?? []) {
      const disc = findCatalogItem(
        supportedStaticBuildDriveDiscs,
        discInput.name,
      )
      if (!disc) {
        return {
          found: false,
          message: `当前 trigger-entry matrix 暂不支持驱动盘「${discInput.name}」`,
          supportedDriveDiscs: supportedStaticBuildDriveDiscs.map(
            (item) => item.name,
          ),
          candidates: findCatalogCandidates(
            supportedStaticBuildDriveDiscs,
            discInput.name,
          ).map((item) => item.name),
        }
      }
      driveDiscSets.push({ id: disc.id, pieces: discInput.pieces })
    }

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
      return {
        found: false,
        message: `当前 resolver 无法识别异常类型「${input.scenario.anomalyType}」`,
        supportedAnomalyTypes: [
          "fire",
          "electric",
          "ether",
          "ice",
          "physical",
          "auricInk",
          "frost",
        ],
      }
    }

    const matrix = resolveStaticBuildTriggerMatrix({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout: {
        agentId: agent.id,
        wEngineId: wEngine?.id,
        driveDiscSets,
        agentLevel: input.agentLevel,
        agentMindscape: input.agentMindscape,
        coreSkillLevel: input.coreSkillLevel,
        wEngineRefinement: input.wEngineRefinement,
      },
      panel: input.finalPanel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    return {
      found: true,
      matrix: compactTriggerMatrix(matrix, input.includeDetails),
    }
  },
})

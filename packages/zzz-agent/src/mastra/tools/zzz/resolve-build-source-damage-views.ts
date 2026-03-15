import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceDamageViewsResult,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSourceDamageViews,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceViewAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  buildSourceDamageViewsSuccessResponse,
  buildToolLoadoutInput,
  buildToolScopeLabels,
  buildUncoveredSourceDamageViewResponse,
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDamageTypeResponse,
  normalizeAnomalyType,
  resolveBuildInputSchema,
  resolveBuildToolAgent,
  resolveBuildToolDriveDiscSets,
  resolveBuildToolWEngine,
} from "./resolve-build-shared"

export const resolveBuildSourceDamageViews = createTool({
  id: "resolve-build-source-damage-views",
  description:
    "查询 anomaly / disorder 的 source-specific 额外结算条目。当前覆盖爱丽丝 [极性强击]、雅 [霜灼·破]、柏妮思 [燃点]/[余烬]、爱芮 [异放]、薇薇安 [异放]，不会把这些条目并回主公式。",
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 source-damage-view 完整明细，包括顶层 views.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；在原始结果带 build 时也透传 entry.build。默认 false，只保留各类 *Summary 与紧凑字段。",
      ),
  }),
  execute: async (input) => {
    if (
      input.scenario.damageType !== "anomaly" &&
      input.scenario.damageType !== "disorder"
    ) {
      return buildUnsupportedDamageTypeResponse(
        buildToolScopeLabels.sourceDamageView,
        ["anomaly", "disorder"],
      )
    }

    const agentResolution = resolveBuildToolAgent(
      buildToolScopeLabels.sourceDamageView,
      supportedStaticBuildSourceViewAgents,
      input.agent,
    )
    if (!agentResolution.ok) {
      return agentResolution.response
    }
    const agent = agentResolution.agent

    const wEngineResolution = resolveBuildToolWEngine(
      buildToolScopeLabels.sourceDamageView,
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
      buildToolScopeLabels.sourceDamageView,
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

    if (input.scenario.damageType === "disorder") {
      const anomalyType = normalizeAnomalyType(input.scenario.anomalyType)
      if (!anomalyType) {
        return buildUnsupportedAnomalyTypeResponse(input.scenario.anomalyType)
      }

      const views = resolveStaticBuildSourceDamageViews({
        mode: input.mode,
        manualBaseMode: input.manualBaseMode,
        loadout,
        panel: input.finalPanel,
        scenario: {
          ...input.scenario,
          anomalyType,
          attribute: input.scenario.attribute as
            | AgentAttributeLabel
            | undefined,
        },
        effectOverrides: input.effectOverrides,
      })

      if (views.entries.length === 0) {
        return buildUncoveredSourceDamageViewResponse(
          supportedStaticBuildSourceViewAgents,
          agent.name,
        )
      }

      return buildSourceDamageViewsSuccessResponse(
        compactStaticBuildSourceDamageViewsResult(views, input.includeDetails),
      )
    }

    const views = resolveStaticBuildSourceDamageViews({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario: {
        ...input.scenario,
        attribute: input.scenario.attribute as AgentAttributeLabel | undefined,
      },
      effectOverrides: input.effectOverrides,
    })

    if (views.entries.length === 0) {
      return buildUncoveredSourceDamageViewResponse(
        supportedStaticBuildSourceViewAgents,
        agent.name,
      )
    }

    return buildSourceDamageViewsSuccessResponse(
      compactStaticBuildSourceDamageViewsResult(views, input.includeDetails),
    )
  },
})

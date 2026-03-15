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
  buildToolScopeLabels,
  buildUncoveredSourceDamageViewResponse,
  resolveBuildInputSchema,
  resolveBuildToolDamageType,
  resolveBuildToolLoadoutContext,
  resolveBuildToolResolvedScenario,
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
    const damageTypeResolution = resolveBuildToolDamageType(
      buildToolScopeLabels.sourceDamageView,
      input.scenario.damageType,
      ["anomaly", "disorder"],
    )
    if (!damageTypeResolution.ok) {
      return damageTypeResolution.response
    }

    const loadoutResolution = resolveBuildToolLoadoutContext({
      scopeLabel: buildToolScopeLabels.sourceDamageView,
      supportedAgents: supportedStaticBuildSourceViewAgents,
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
    const { agent, loadout } = loadoutResolution

    const scenarioResolution = resolveBuildToolResolvedScenario(input.scenario)
    if (!scenarioResolution.ok) {
      return scenarioResolution.response
    }

    const views = resolveStaticBuildSourceDamageViews({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario: scenarioResolution.scenario,
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

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
  buildToolScopeLabels,
  resolveBuildInputSchema,
  resolveBuildToolSourceDamageViewsResponse,
  resolveBuildToolTriggeredDamageContext,
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
    const contextResolution = resolveBuildToolTriggeredDamageContext({
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
      scenario: input.scenario,
    })
    if (!contextResolution.ok) {
      return contextResolution.response
    }
    const { agent, loadout, scenario } = contextResolution

    const views = resolveStaticBuildSourceDamageViews({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    return resolveBuildToolSourceDamageViewsResponse({
      agentName: agent.name,
      supportedAgents: supportedStaticBuildSourceViewAgents,
      views: compactStaticBuildSourceDamageViewsResult(
        views,
        input.includeDetails,
      ),
    })
  },
})

import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildResult,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildDamage,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  buildDamageSuccessResponse,
  buildToolResolvedLoadoutInput,
  buildToolScopeLabels,
  resolveBuildInputSchema,
  resolveBuildToolAgent,
  resolveBuildToolDriveDiscSets,
  resolveBuildToolResolvedScenario,
  resolveBuildToolWEngine,
} from "./resolve-build-shared"

export const resolveBuildDamage = createTool({
  id: "resolve-build-damage",
  description:
    "基于 zzz-data 的静态构筑解析器直接计算伤害。当前支持全部强攻/命破/异常代理人，以及对应特性的强攻/命破/异常音擎；异常代理人当前支持 anomaly / disorder 单次 resolver，不支持 skill matrix。",
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回完整单场景 build 细节（assumptions、unsupportedEffects、diagnostics/sourceNotes、trace、damageParams）。默认 false，以避免上下文过大。",
      ),
  }),
  execute: async (input) => {
    const agentResolution = resolveBuildToolAgent(
      buildToolScopeLabels.resolver,
      supportedStaticBuildAgents,
      input.agent,
    )
    if (!agentResolution.ok) {
      return agentResolution.response
    }
    const agent = agentResolution.agent

    const wEngineResolution = resolveBuildToolWEngine(
      buildToolScopeLabels.resolver,
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
      buildToolScopeLabels.resolver,
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

    const scenarioResolution = resolveBuildToolResolvedScenario(input.scenario)
    if (!scenarioResolution.ok) {
      return scenarioResolution.response
    }

    const build = resolveStaticBuildDamage({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario: scenarioResolution.scenario,
      effectOverrides: input.effectOverrides,
    })

    return buildDamageSuccessResponse(
      compactStaticBuildResult(build, input.includeDetails),
    )
  },
})

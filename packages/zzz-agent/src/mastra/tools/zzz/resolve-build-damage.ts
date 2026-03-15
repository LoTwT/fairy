import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { compactStaticBuildResult, resolveStaticBuildDamage } from "zzz-data"
import { buildToolDamageCatalogPreset } from "./resolve-build-presets"
import {
  buildDamageSuccessResponse,
  buildToolScopeLabels,
  resolveBuildInputSchema,
  resolveBuildToolDamageExecutionContext,
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
    const contextResolution = resolveBuildToolDamageExecutionContext({
      scopeLabel: buildToolScopeLabels.resolver,
      ...buildToolDamageCatalogPreset,
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

    const build = resolveStaticBuildDamage({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    return buildDamageSuccessResponse(
      compactStaticBuildResult(build, input.includeDetails),
    )
  },
})

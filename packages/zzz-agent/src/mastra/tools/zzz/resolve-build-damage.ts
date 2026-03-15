import { createTool } from "@mastra/core/tools"
import { compactStaticBuildResult, resolveStaticBuildDamage } from "zzz-data"
import { buildToolScopeLabels } from "./resolve-build-contracts"
import {
  buildToolDamageCatalogPreset,
  buildToolDescriptions,
} from "./resolve-build-presets"
import { buildDamageSuccessResponse } from "./resolve-build-responses"
import {
  resolveBuildDamageIncludeDetailsSchema,
  resolveBuildInputSchema,
} from "./resolve-build-schemas"
import { resolveBuildToolDamageExecutionContext } from "./resolve-build-shared"

export const resolveBuildDamage = createTool({
  id: "resolve-build-damage",
  description: buildToolDescriptions.resolver,
  inputSchema: resolveBuildInputSchema.extend({
    includeDetails: resolveBuildDamageIncludeDetailsSchema,
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

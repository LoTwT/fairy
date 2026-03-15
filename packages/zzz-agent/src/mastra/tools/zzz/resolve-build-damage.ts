import type { AgentAttributeLabel } from "zzz-data"
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
  buildIncompatibleWEngineResponse,
  buildToolScopeLabels,
  buildUnsupportedAgentResponse,
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDriveDiscResponse,
  buildUnsupportedWEngineResponse,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildInputSchema,
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
    const agent = findCatalogItem(supportedStaticBuildAgents, input.agent)
    if (!agent) {
      return buildUnsupportedAgentResponse(
        buildToolScopeLabels.resolver,
        supportedStaticBuildAgents,
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
        buildToolScopeLabels.resolver,
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

    const driveDiscSets = []
    for (const discInput of input.driveDiscs ?? []) {
      const disc = findCatalogItem(
        supportedStaticBuildDriveDiscs,
        discInput.name,
      )
      if (!disc) {
        return buildUnsupportedDriveDiscResponse(
          buildToolScopeLabels.resolver,
          supportedStaticBuildDriveDiscs,
          discInput.name,
        )
      }
      driveDiscSets.push({ id: disc.id, pieces: discInput.pieces })
    }

    if (input.scenario.damageType === "disorder") {
      const anomalyType = normalizeAnomalyType(input.scenario.anomalyType)
      if (!anomalyType) {
        return buildUnsupportedAnomalyTypeResponse(input.scenario.anomalyType)
      }

      const build = resolveStaticBuildDamage({
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
        scenario: {
          ...input.scenario,
          anomalyType,
          attribute: input.scenario.attribute as
            | AgentAttributeLabel
            | undefined,
        },
        effectOverrides: input.effectOverrides,
      })

      return {
        found: true,
        build: compactStaticBuildResult(build, input.includeDetails),
      }
    }

    const build = resolveStaticBuildDamage({
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
      scenario: {
        ...input.scenario,
        attribute: input.scenario.attribute as AgentAttributeLabel | undefined,
      },
      effectOverrides: input.effectOverrides,
    })

    return {
      found: true,
      build: compactStaticBuildResult(build, input.includeDetails),
    }
  },
})

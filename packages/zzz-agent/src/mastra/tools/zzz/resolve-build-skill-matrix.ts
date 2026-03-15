import { createTool } from "@mastra/core/tools"
import {
  compactStaticBuildSkillMatrixResult,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSkillMatrix,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildMatrixAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  buildSkillMatrixSuccessResponse,
  buildToolScopeLabels,
  resolveBuildSkillMatrixInputSchema,
  resolveBuildToolLoadoutContext,
  resolveBuildToolScenario,
} from "./resolve-build-shared"

export const resolveBuildSkillMatrix = createTool({
  id: "resolve-build-skill-matrix",
  description:
    "基于 zzz-data 的静态构筑解析器批量计算全技能/全段伤害矩阵。当前仅支持强攻/命破代理人，以及对应特性的强攻/命破音擎；异常代理人暂只支持单次 resolver。",
  inputSchema: resolveBuildSkillMatrixInputSchema,
  execute: async (input) => {
    const loadoutResolution = resolveBuildToolLoadoutContext({
      scopeLabel: buildToolScopeLabels.skillMatrix,
      supportedAgents: supportedStaticBuildMatrixAgents,
      supportedWEngines: supportedStaticBuildWEngines,
      supportedDriveDiscs: supportedStaticBuildDriveDiscs,
      agentQuery: input.agent,
      wEngineQuery: input.wEngine,
      driveDiscs: input.driveDiscs,
      getCompatibleWEngines: (agent) =>
        getCompatibleStaticBuildWEngines(agent.specialty),
      agentMindscape: input.agentMindscape,
      coreSkillLevel: input.coreSkillLevel,
      wEngineRefinement: input.wEngineRefinement,
    })
    if (!loadoutResolution.ok) {
      return loadoutResolution.response
    }
    const { loadout } = loadoutResolution

    const matrix = resolveStaticBuildSkillMatrix({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel: input.finalPanel,
      context: resolveBuildToolScenario(input.context),
      effectOverrides: input.effectOverrides,
    })

    return buildSkillMatrixSuccessResponse(
      compactStaticBuildSkillMatrixResult(matrix, input.includeDetails),
    )
  },
})

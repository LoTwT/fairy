import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import {
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSourceDamageViews,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceViewAgents,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  findCatalogCandidates,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildInputSchema,
  specialtyLabels,
} from "./resolve-build-shared"

export const resolveBuildSourceDamageViews = createTool({
  id: "resolve-build-source-damage-views",
  description:
    "查询 anomaly / disorder 的 source-specific 额外结算条目。当前覆盖爱丽丝 [极性强击]、雅 [霜灼·破]、柏妮思 [燃点]/[余烬]、爱芮 [异放]、薇薇安 [异放]，不会把这些条目并回主公式。",
  inputSchema: resolveBuildInputSchema,
  execute: async (input) => {
    if (
      input.scenario.damageType !== "anomaly" &&
      input.scenario.damageType !== "disorder"
    ) {
      return {
        found: false,
        message:
          "source-specific damage view 只用于 anomaly / disorder 的额外结算，不适用于 normal / sheer。",
        supportedDamageTypes: ["anomaly", "disorder"],
      }
    }

    const agent = findCatalogItem(supportedStaticBuildAgents, input.agent)
    if (!agent) {
      return {
        found: false,
        message: `当前 source-specific damage view 暂不支持代理人「${input.agent}」`,
        supportedAgents: supportedStaticBuildSourceViewAgents.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildSourceViewAgents,
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
        message: `当前 resolver 暂不支持音擎「${input.wEngine}」`,
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
          message: `当前 resolver 暂不支持驱动盘「${discInput.name}」`,
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

    if (input.scenario.damageType === "disorder") {
      const anomalyType = normalizeAnomalyType(input.scenario.anomalyType)
      if (!anomalyType) {
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

      const views = resolveStaticBuildSourceDamageViews({
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

      if (views.entries.length === 0) {
        return {
          found: false,
          message: `当前 source-specific damage view 暂未覆盖代理人「${agent.name}」`,
          supportedAgents: supportedStaticBuildSourceViewAgents.map(
            (item) => item.name,
          ),
          candidates: findCatalogCandidates(
            supportedStaticBuildSourceViewAgents,
            input.agent,
          ).map((item) => item.name),
        }
      }

      return {
        found: true,
        views,
      }
    }

    const views = resolveStaticBuildSourceDamageViews({
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

    if (views.entries.length === 0) {
      return {
        found: false,
        message: `当前 source-specific damage view 暂未覆盖代理人「${agent.name}」`,
        supportedAgents: supportedStaticBuildSourceViewAgents.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildSourceViewAgents,
          input.agent,
        ).map((item) => item.name),
      }
    }

    return {
      found: true,
      views,
    }
  },
})

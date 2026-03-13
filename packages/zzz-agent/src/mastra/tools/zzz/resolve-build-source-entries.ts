import type {
  AgentAttributeLabel,
  StaticBuildSourceDamageViewEntry,
  StaticBuildSourceEntry,
  StaticBuildSourceUtilityViewEntry,
} from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  getCompatibleStaticBuildUtilityWEngines,
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildSourceEntries,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildSourceUtilityViewWEngines,
  supportedStaticBuildSourceViewAgents,
  supportedStaticBuildUtilityAgents,
  supportedStaticBuildUtilityWEngines,
  supportedStaticBuildWEngines,
} from "zzz-data"
import {
  finalPanelSchema,
  findCatalogCandidates,
  findCatalogItem,
  normalizeAnomalyType,
  resolveBuildSourceEntriesInputSchema,
  specialtyLabels,
} from "./resolve-build-shared"

function compactSourceEntries(
  collection: ReturnType<typeof resolveStaticBuildSourceEntries>,
  includeDetails: boolean,
) {
  return {
    loadout: collection.loadout,
    summary: {
      sourceDamageCount: collection.entries.filter(
        (entry) => entry.metadata.entryKind === "source-damage-view",
      ).length,
      sourceUtilityCount: collection.entries.filter(
        (entry) => entry.metadata.entryKind === "source-utility-view",
      ).length,
      unsupportedCount: collection.entries.filter((entry) => !entry.supported)
        .length,
    },
    assumptions: collection.assumptions,
    entries: collection.entries.map((entry) =>
      compactSourceEntry(entry, includeDetails),
    ),
  }
}

function compactSourceEntry(
  entry: StaticBuildSourceEntry,
  includeDetails: boolean,
) {
  if (entry.metadata.entryKind === "source-damage-view") {
    const damageEntry = entry as StaticBuildSourceDamageViewEntry
    return {
      id: damageEntry.id,
      label: damageEntry.label,
      metadata: damageEntry.metadata,
      supported: damageEntry.supported,
      sourceType: damageEntry.sourceType,
      sourceId: damageEntry.sourceId,
      damageType: damageEntry.damageType,
      resolutionMode: damageEntry.resolutionMode,
      requirements: damageEntry.requirements,
      diagnostics: damageEntry.diagnostics,
      sourceNotes: damageEntry.sourceNotes,
      assumptions: damageEntry.assumptions,
      damage: damageEntry.damage,
      ...(includeDetails && damageEntry.build
        ? { build: damageEntry.build }
        : {}),
    }
  }

  const utilityEntry = entry as StaticBuildSourceUtilityViewEntry
  return {
    id: utilityEntry.id,
    label: utilityEntry.label,
    metadata: utilityEntry.metadata,
    supported: utilityEntry.supported,
    sourceType: utilityEntry.sourceType,
    sourceId: utilityEntry.sourceId,
    utilityType: utilityEntry.utilityType,
    resolutionMode: utilityEntry.resolutionMode,
    targetScope: utilityEntry.targetScope,
    value: utilityEntry.value,
    unit: utilityEntry.unit,
    triggerLabel: utilityEntry.triggerLabel,
    conditionLabel: utilityEntry.conditionLabel,
    cooldownSeconds: utilityEntry.cooldownSeconds,
    diagnostics: utilityEntry.diagnostics,
    sourceNotes: utilityEntry.sourceNotes,
    assumptions: utilityEntry.assumptions,
  }
}

export const resolveBuildSourceEntries = createTool({
  id: "resolve-build-source-entries",
  description:
    "统一查询当前构筑的 source-specific 条目集合：可一次性返回 anomaly / disorder 的独立额外结算条目，以及音擎提供的 utility / resource 条目。不会把这些条目并回主公式。",
  inputSchema: resolveBuildSourceEntriesInputSchema.extend({
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "是否返回 source-damage entries 的完整 build 结果（trace、damageParams 等）。默认 false，以避免上下文过大。",
      ),
  }),
  execute: async (input) => {
    const utilityOnly =
      !input.scenario ||
      input.scenario.damageType === "normal" ||
      input.scenario.damageType === "sheer"

    const agentCatalog = utilityOnly
      ? supportedStaticBuildUtilityAgents
      : supportedStaticBuildAgents

    const agent = findCatalogItem(agentCatalog, input.agent)
    if (!agent) {
      return {
        found: false,
        message: `当前 source-entry collection 暂不支持代理人「${input.agent}」`,
        supportedAgents: agentCatalog.map((item) => item.name),
        candidates: findCatalogCandidates(agentCatalog, input.agent).map(
          (item) => item.name,
        ),
      }
    }

    const compatibleWEngines = utilityOnly
      ? getCompatibleStaticBuildUtilityWEngines(agent.specialty)
      : getCompatibleStaticBuildWEngines(agent.specialty)
    const supportedUtilityWEngines =
      supportedStaticBuildSourceUtilityViewWEngines
        .filter((item) => item.specialty === agent.specialty)
        .map((item) => item.name)

    const wEngine = input.wEngine
      ? findCatalogItem(
          utilityOnly
            ? supportedStaticBuildUtilityWEngines
            : supportedStaticBuildWEngines,
          input.wEngine,
        )
      : undefined
    if (input.wEngine && !wEngine) {
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

    let scenario = input.scenario
    if (scenario?.damageType === "disorder") {
      const anomalyType = normalizeAnomalyType(scenario.anomalyType)
      if (!anomalyType) {
        return {
          found: false,
          message: `当前 resolver 无法识别异常类型「${scenario.anomalyType}」`,
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
      scenario = {
        ...scenario,
        anomalyType,
        attribute: scenario.attribute as AgentAttributeLabel | undefined,
      }
    } else if (scenario) {
      scenario = {
        ...scenario,
        attribute: scenario.attribute as AgentAttributeLabel | undefined,
      }
    }

    if (
      scenario &&
      (scenario.damageType === "anomaly" || scenario.damageType === "disorder")
    ) {
      const fullPanel = finalPanelSchema.safeParse(input.finalPanel)
      if (!fullPanel.success) {
        return {
          found: false,
          message:
            "anomaly / disorder 的 source-entry collection 需要完整 finalPanel（至少 attack、critRate、critDamage，以及异常相关面板）。",
        }
      }
    }

    const collection = resolveStaticBuildSourceEntries({
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
      panel: input.finalPanel as any,
      scenario: scenario as any,
      effectOverrides: input.effectOverrides,
    })

    if (collection.entries.length === 0) {
      return {
        found: false,
        message: utilityOnly
          ? `当前 source-entry collection 暂未覆盖 ${agent.name} 的可返回条目；utility entries 目前只覆盖音擎来源。`
          : `当前 source-entry collection 暂未覆盖 ${agent.name} 这套构筑的额外来源条目。`,
        supportedSourceViewAgents: supportedStaticBuildSourceViewAgents.map(
          (item) => item.name,
        ),
        supportedUtilityWEngines,
        candidates: input.wEngine
          ? findCatalogCandidates(compatibleWEngines, input.wEngine).map(
              (item) => item.name,
            )
          : [],
      }
    }

    return {
      found: true,
      collection: compactSourceEntries(collection, input.includeDetails),
    }
  },
})

import type { ResolveStaticBuildSourceEntriesInput } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  compactStaticBuildSourceEntryCollection,
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
  buildMissingSourceEntryFinalPanelResponse,
  buildSourceEntryCollectionSuccessResponse,
  buildToolResolvedLoadoutInput,
  buildToolScopeLabels,
  buildUncoveredSourceEntryCoverageResponse,
  buildUncoveredSourceEntryUtilityOnlyResponse,
  candidateNames,
  finalPanelSchema,
  resolveBuildSourceEntriesInputSchema,
  resolveBuildToolAgent,
  resolveBuildToolDriveDiscSets,
  resolveBuildToolOptionalScenario,
  resolveBuildToolSourceUtilitySupport,
  resolveBuildToolWEngine,
} from "./resolve-build-shared"

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
        "是否返回 source-entry collection 完整明细，包括顶层 collection.assumptions，以及每条 entry 的 entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes；若某条 source-damage-view entry 原始结果带有 build，也会一并返回完整 build 结果（trace、damageParams 等）。默认 false，只保留各类 *Summary 与紧凑字段。",
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

    const agentResolution = resolveBuildToolAgent(
      buildToolScopeLabels.sourceEntryCollection,
      agentCatalog,
      input.agent,
    )
    if (!agentResolution.ok) {
      return agentResolution.response
    }
    const agent = agentResolution.agent

    const compatibleWEngines = utilityOnly
      ? getCompatibleStaticBuildUtilityWEngines(agent.specialty)
      : getCompatibleStaticBuildWEngines(agent.specialty)
    const sourceUtilitySupport = resolveBuildToolSourceUtilitySupport(
      supportedStaticBuildSourceUtilityViewWEngines,
      agent.specialty,
    )
    const supportedUtilityWEngines = sourceUtilitySupport.names

    const wEngineResolution = resolveBuildToolWEngine(
      buildToolScopeLabels.sourceEntryCollection,
      utilityOnly
        ? supportedStaticBuildUtilityWEngines
        : supportedStaticBuildWEngines,
      compatibleWEngines,
      input.wEngine,
      agent,
    )
    if (!wEngineResolution.ok) {
      return wEngineResolution.response
    }
    const wEngine = wEngineResolution.wEngine

    const driveDiscResolution = resolveBuildToolDriveDiscSets(
      buildToolScopeLabels.sourceEntryCollection,
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

    const scenarioResolution = resolveBuildToolOptionalScenario(input.scenario)
    if (!scenarioResolution.ok) {
      return scenarioResolution.response
    }
    const scenario: ResolveStaticBuildSourceEntriesInput["scenario"] =
      scenarioResolution.scenario

    let panel: ResolveStaticBuildSourceEntriesInput["panel"]
    if (
      scenario &&
      (scenario.damageType === "anomaly" || scenario.damageType === "disorder")
    ) {
      const fullPanel = finalPanelSchema.safeParse(input.finalPanel)
      if (!fullPanel.success) {
        return buildMissingSourceEntryFinalPanelResponse()
      }
      panel = fullPanel.data
    } else if (input.finalPanel) {
      panel = {
        attack: input.finalPanel.attack ?? 0,
        critRate: input.finalPanel.critRate ?? 0,
        critDamage: input.finalPanel.critDamage ?? 0,
        ...input.finalPanel,
      }
    }

    const collection = resolveStaticBuildSourceEntries({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout,
      panel,
      scenario,
      effectOverrides: input.effectOverrides,
    })

    if (collection.entries.length === 0) {
      if (utilityOnly && !wEngine) {
        return buildUncoveredSourceEntryUtilityOnlyResponse(
          agent.name,
          supportedUtilityWEngines,
        )
      }

      if (!utilityOnly && !wEngine) {
        return buildUncoveredSourceEntryCoverageResponse(
          agent.name,
          supportedStaticBuildSourceViewAgents,
          supportedUtilityWEngines,
        )
      }

      return utilityOnly
        ? buildUncoveredSourceEntryUtilityOnlyResponse(
            agent.name,
            supportedUtilityWEngines,
          )
        : buildUncoveredSourceEntryCoverageResponse(
            agent.name,
            supportedStaticBuildSourceViewAgents,
            supportedUtilityWEngines,
            input.wEngine
              ? candidateNames(compatibleWEngines, input.wEngine)
              : [],
          )
    }

    return buildSourceEntryCollectionSuccessResponse(
      compactStaticBuildSourceEntryCollection(collection, input.includeDetails),
    )
  },
})

import type { AgentAttributeLabel } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  resolveStaticBuildDamage,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildWEngines,
} from "zzz-data"
import { findBestMatch, findTopMatches } from "./utils"

interface CatalogItem {
  id: string
  name: string
  aliases: readonly string[]
}

function findCatalogItem<T extends CatalogItem>(
  items: readonly T[],
  query: string,
): T | undefined {
  return findBestMatch([...items], query, [
    (item) => item.name,
    (item) => item.id,
    (item) => item.aliases[0],
    (item) => item.aliases[1],
    (item) => item.aliases[2],
  ])
}

function findCatalogCandidates<T extends CatalogItem>(
  items: readonly T[],
  query: string,
) {
  return findTopMatches(
    [...items],
    query,
    [
      (item) => item.name,
      (item) => item.id,
      (item) => item.aliases[0],
      (item) => item.aliases[1],
      (item) => item.aliases[2],
    ],
    3,
  )
}

export const resolveBuildDamage = createTool({
  id: "resolve-build-damage",
  description:
    "基于 zzz-data 的静态构筑解析器直接计算伤害。V1 仅支持：朱鸢 / 伊芙琳 / 仪玄，防暴者Ⅵ型 / 心弦夜响 / 青溟笼舍，啄木鸟电音 / 河豚电音 / 云岿如我。",
  inputSchema: z.object({
    agent: z.string().describe("代理人名称或 ID"),
    wEngine: z.string().optional().describe("音擎名称或 ID"),
    driveDiscs: z
      .array(
        z.object({
          name: z.string().describe("驱动盘名称或 ID"),
          pieces: z.union([z.literal(2), z.literal(4)]),
        }),
      )
      .optional(),
    coreSkillLevel: z.number().min(1).max(7).optional().default(7),
    wEngineRefinement: z.number().min(1).max(5).optional().default(1),
    mode: z
      .enum(["baseline", "full-buff", "manual"])
      .optional()
      .default("baseline"),
    manualBaseMode: z.enum(["baseline", "full-buff"]).optional(),
    finalPanel: z.object({
      attack: z.number(),
      baseAttack: z.number().optional(),
      critRate: z.number(),
      critDamage: z.number(),
      hp: z.number().optional(),
      sheerForce: z.number().optional(),
      penetrationRate: z.number().optional(),
      penetrationValue: z.number().optional(),
    }),
    scenario: z.object({
      damageType: z.enum(["normal", "sheer"]),
      skillTag: z.enum([
        "basic",
        "dash",
        "enhancedSpecial",
        "chain",
        "ultimate",
      ]),
      skillMultiplier: z.union([z.number(), z.string()]),
      attribute: z.string().optional(),
      extraAbilityActive: z.boolean().optional(),
      combatTags: z.array(z.string()).optional(),
      enemy: z.object({
        attackerLevel: z.number().optional().default(60),
        defenderBaseDefense: z.number(),
        defenderResistance: z.number(),
        defenseBonus: z.number().optional().default(0),
        defenseReduction: z.number().optional().default(0),
        resistanceReduction: z.number().optional().default(0),
        ignoreResistance: z.number().optional().default(0),
        vulnerabilityBonus: z.number().optional().default(0),
        damageReduction: z.number().optional().default(0),
        isStunned: z.boolean().optional().default(false),
        stunVulnerability: z.number().optional().default(0),
        nonStunVulnerability: z.number().optional().default(0),
        specialMultiplier: z.number().optional().default(1),
      }),
    }),
    effectOverrides: z
      .array(
        z.object({
          effectId: z.string(),
          enabled: z.boolean().optional(),
          stacks: z.number().int().min(0).optional(),
        }),
      )
      .optional(),
  }),
  execute: async (input) => {
    const agent = findCatalogItem(supportedStaticBuildAgents, input.agent)
    if (!agent) {
      return {
        found: false,
        message: `V1 resolver 暂不支持代理人「${input.agent}」`,
        supportedAgents: supportedStaticBuildAgents.map((item) => item.name),
        candidates: findCatalogCandidates(
          supportedStaticBuildAgents,
          input.agent,
        ).map((item) => item.name),
      }
    }

    const wEngine = input.wEngine
      ? findCatalogItem(supportedStaticBuildWEngines, input.wEngine)
      : undefined
    if (input.wEngine && !wEngine) {
      return {
        found: false,
        message: `V1 resolver 暂不支持音擎「${input.wEngine}」`,
        supportedWEngines: supportedStaticBuildWEngines.map(
          (item) => item.name,
        ),
        candidates: findCatalogCandidates(
          supportedStaticBuildWEngines,
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
          message: `V1 resolver 暂不支持驱动盘「${discInput.name}」`,
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

    return {
      found: true,
      build: resolveStaticBuildDamage({
        mode: input.mode,
        manualBaseMode: input.manualBaseMode,
        loadout: {
          agentId: agent.id,
          wEngineId: wEngine?.id,
          driveDiscSets,
          coreSkillLevel: input.coreSkillLevel,
          wEngineRefinement: input.wEngineRefinement,
        },
        panel: input.finalPanel,
        scenario: {
          ...input.scenario,
          attribute: input.scenario.attribute as
            | AgentAttributeLabel
            | undefined,
        },
        effectOverrides: input.effectOverrides,
      }),
    }
  },
})

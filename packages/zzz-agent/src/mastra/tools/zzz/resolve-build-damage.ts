import type { AgentAttributeLabel, AnomalyType } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  getCompatibleStaticBuildWEngines,
  resolveStaticBuildDamage,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildWEngines,
} from "zzz-data"

interface CatalogItem {
  id: string
  name: string
  aliases: readonly string[]
}

const specialtyLabels = {
  Attack: "强攻",
  Stun: "击破",
  Anomaly: "异常",
  Support: "支援",
  Defense: "防护",
  Rupture: "命破",
} as const

function normalizeCatalogValue(value: string) {
  return value.toLowerCase().replace(/[\s\-_·・.()（）【】[\]「」]/g, "")
}

function getCatalogFields(item: CatalogItem) {
  return [item.name, item.id, ...item.aliases].filter(Boolean)
}

function findCatalogItem<T extends CatalogItem>(
  items: readonly T[],
  query: string,
): T | undefined {
  const qLow = query.toLowerCase()
  const qNorm = normalizeCatalogValue(query)

  let bestItem: T | undefined
  let bestScore = 0

  for (const item of items) {
    for (const field of getCatalogFields(item)) {
      if (field.toLowerCase() === qLow) return item
      const normalized = normalizeCatalogValue(field)
      if (normalized === qNorm) return item
      if (!normalized.includes(qNorm)) continue

      let score = qNorm.length / normalized.length
      if (normalized.startsWith(qNorm)) score += 1
      if (score > bestScore) {
        bestScore = score
        bestItem = item
      }
    }
  }

  return bestScore >= 0.6 ? bestItem : undefined
}

function findCatalogCandidates<T extends CatalogItem>(
  items: readonly T[],
  query: string,
) {
  const qNorm = normalizeCatalogValue(query)
  if (!qNorm) return []

  const scored: Array<{ item: T; score: number }> = []
  for (const item of items) {
    let bestScore = 0
    for (const field of getCatalogFields(item)) {
      const normalized = normalizeCatalogValue(field)
      if (!normalized.includes(qNorm) && !qNorm.includes(normalized)) continue

      let score = 0
      if (normalized.includes(qNorm)) {
        score = qNorm.length / normalized.length
        if (normalized.startsWith(qNorm)) score += 1
      } else {
        score = normalized.length / qNorm.length
        if (qNorm.startsWith(normalized)) score += 1
      }
      bestScore = Math.max(bestScore, score)
    }
    if (bestScore > 0) scored.push({ item, score: bestScore })
  }

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.item)
}

function normalizeAnomalyType(value: string): AnomalyType | undefined {
  const normalized = normalizeCatalogValue(value)
  switch (normalized) {
    case "fire":
    case "火":
    case "火属性":
    case "burn":
    case "灼烧":
      return "fire"
    case "electric":
    case "电":
    case "电属性":
    case "shock":
    case "感电":
      return "electric"
    case "ether":
    case "以太":
    case "以太属性":
    case "corruption":
    case "侵蚀":
      return "ether"
    case "ice":
    case "冰":
    case "冰属性":
    case "freeze":
    case "冻结":
      return "ice"
    case "physical":
    case "物理":
    case "物理属性":
    case "assault":
    case "强击":
      return "physical"
    case "auricink":
    case "auric":
    case "玄墨":
      return "auricInk"
    case "frost":
    case "烈霜":
      return "frost"
    default:
      return undefined
  }
}

export const resolveBuildDamage = createTool({
  id: "resolve-build-damage",
  description:
    "基于 zzz-data 的静态构筑解析器直接计算伤害。当前支持全部强攻/命破/异常代理人，以及对应特性的强攻/命破/异常音擎；异常代理人当前支持 anomaly / disorder 单次 resolver，不支持 skill matrix。",
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
    agentLevel: z.number().min(1).max(60).optional(),
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
      anomalyProficiency: z.number().optional(),
      anomalyCritRate: z.number().optional(),
      anomalyCritDamage: z.number().optional(),
      penetrationRate: z.number().optional(),
      penetrationValue: z.number().optional(),
    }),
    scenario: z.discriminatedUnion("damageType", [
      z.object({
        damageType: z.literal("normal"),
        skillTag: z.enum([
          "basic",
          "dash",
          "special",
          "enhancedSpecial",
          "chain",
          "ultimate",
          "assist",
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
      z.object({
        damageType: z.literal("sheer"),
        skillTag: z.enum([
          "basic",
          "dash",
          "special",
          "enhancedSpecial",
          "chain",
          "ultimate",
          "assist",
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
      z.object({
        damageType: z.literal("anomaly"),
        skillTag: z.enum([
          "basic",
          "dash",
          "special",
          "enhancedSpecial",
          "chain",
          "ultimate",
          "assist",
        ]),
        damageMultiplier: z.union([z.number(), z.string()]),
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
      z.object({
        damageType: z.literal("disorder"),
        skillTag: z.enum([
          "basic",
          "dash",
          "special",
          "enhancedSpecial",
          "chain",
          "ultimate",
          "assist",
        ]),
        anomalyType: z.string(),
        remainingTime: z.number().min(0),
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
    ]),
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
        message: `当前 resolver 暂不支持代理人「${input.agent}」`,
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

      return {
        found: true,
        build: resolveStaticBuildDamage({
          mode: input.mode,
          manualBaseMode: input.manualBaseMode,
          loadout: {
            agentId: agent.id,
            wEngineId: wEngine?.id,
            driveDiscSets,
            agentLevel: input.agentLevel,
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
        }),
      }
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
          agentLevel: input.agentLevel,
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

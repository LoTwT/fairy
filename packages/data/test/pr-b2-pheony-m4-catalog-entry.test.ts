import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/index.ts"
import type { RuleSet } from "@randomplay/shared"

/**
 * PR-B2 发布制品消费：六元素 M4 独立异放经正式 data 装载与 core 目录入口
 * 结算锚点数值；菲欧妮全部动作解析后，直接伤害段不自动携带 M4 独立项、
 * 独立目标或 M4 贡献。数值锚点与目录级回归
 * （packages/core/test/effects/pr-d4b-pheony-m4.test.ts）的独立算式一致。
 */
const M4_TARGET = "zzz-hp:skill:pheony-m4-anomaly-settlement"
const M4_ITEM = "pheony:m4-anomaly-settlement"
const elements = [
  { element: "physical", multiplier: 42.78 },
  { element: "fire", multiplier: 3 },
  { element: "ice", multiplier: 30 },
  { element: "electric", multiplier: 7.5 },
  { element: "ether", multiplier: 3.75 },
  { element: "wind", multiplier: 75 },
] as const

const optionId = (element: string) =>
  `nanoka:agents:1641:m4-anomaly-settlement-${element}`

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["1641", "1301"],
    wEngines: [],
  })
  return loaded
}

const general = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

const damageFor = () => ({
  kind: "anomaly-settlement" as const,
  damageBonus: { settledMultiplier: 1 },
  anomalySource: { entityId: "entity:source", level: 60 },
  defense: {
    attackerLevel: 60,
    targetBaseDefense: 0,
    defensePercentageAdjustments: [],
    penetrationValues: [],
  },
  resistance: {
    targetResistance: 0,
    targetResistanceReductions: [],
    attackerResistanceIgnoreValues: [],
  },
  damageTaken: {
    targetDamageTakenIncreases: [],
    targetDamageTakenReductions: [],
  },
  stunDamage: {
    isTargetStunned: false,
    targetBaseStunDamageMultiplier: 1,
    targetStunDamageMultiplierAdjustments: [],
  },
  anomalyDamageBonus: [],
  refringe: { mode: "settled" as const, multiplier: 1 },
  anomalyCriticalRate: 0,
  anomalyCriticalDamage: [],
  anomalySettlementCriticalRate: 0,
  anomalySettlementCriticalDamage: [],
})

describe("PR-B2 Pheony M4 six-element settlement through the published data package", () => {
  it("consumes all six independent settlements from the published artifacts", async () => {
    const calculationData = await data()
    const parsed = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("59")
    expect(
      catalog.skillTargets.filter((target) => target.targetId === M4_TARGET),
    ).toHaveLength(1)
    for (const { element, multiplier } of elements) {
      expect(
        catalog.options.some((option) => option.optionId === optionId(element)),
        element,
      ).toBe(true)
      const input: StaticCatalogDamageInput = {
        definitions: parsed.value,
        catalog,
        bindings: [
          {
            bindingId: "binding:pheony",
            kind: "agent",
            holderId: "entity:pheony",
            sourceEntityId: "1641",
            eligible: true,
            configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
          },
        ],
        actorSources: [
          { entityId: "entity:pheony", agentEntityId: "1641" },
          { entityId: "entity:source", agentEntityId: "1301" },
        ],
        selections: [
          {
            optionId: optionId(element),
            bindingId: "binding:pheony",
            layers: 1,
          },
        ],
        world: {
          entities: [
            {
              kind: "actor",
              entityId: "entity:pheony",
              teamId: "team:players",
              generalStats: {
                attack: general(2400),
                anomalyProficiency: general(480),
                anomalyMastery: general(200),
              },
              directStats: {
                criticalRate: { baseValue: 0.28, additions: [] },
                criticalDamage: { baseValue: 1.2, additions: [] },
                penetrationRatio: { baseValue: 0.42, additions: [] },
              },
            },
            {
              kind: "actor",
              entityId: "entity:source",
              teamId: "team:players",
              generalStats: {
                attack: general(1200),
                anomalyProficiency: general(115),
              },
              directStats: {
                criticalRate: { baseValue: 0.05, additions: [] },
                criticalDamage: { baseValue: 0.5, additions: [] },
                penetrationRatio: { baseValue: 0, additions: [] },
              },
            },
            {
              kind: "actor",
              entityId: "entity:enemy",
              teamId: "team:enemies",
              generalStats: {},
              directStats: {},
            },
          ],
          states: [],
          distances: [],
        },
        hit: {
          actorId: "entity:pheony",
          targetId: "entity:enemy",
          actionId: "action:m4-settlement",
          skillCategory: "uncategorized",
          element,
          skillTargetIds: [M4_TARGET],
          skillTags: [],
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: M4_ITEM,
              stat: "attack",
              statSource: { entityId: "entity:source" },
              damageMultiplier: 0,
            },
          ],
        },
        damage: damageFor() as unknown as StaticCatalogDamageInput["damage"],
      }
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok, `${element}: ${JSON.stringify(result)}`).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.value.factors.nonCritical.baseDamage, element).toBeCloseTo(
        multiplier * 1200,
        6,
      )
      expect(
        result.value.factors.critical?.anomalyCritical,
        element,
      ).toBeCloseTo(1.4, 9)
    }
  })

  it("keeps the direct-damage action segments free of the M4 item and target", async () => {
    const calculationData = await data()
    const agent = calculationData.agents.find(
      (entry) => entry.actions.entityId === "1641",
    )
    if (!agent) throw new Error("missing Pheony action data")
    const levels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
      ultimate: { mode: "trained" as const, value: 12 },
    }
    let resolvedDamageActions = 0
    for (const action of agent.actions.actions) {
      let resolved: ReturnType<typeof resolveAgentAction>
      try {
        resolved = resolveAgentAction({
          agent: agent.actions,
          actionId: action.actionId,
          mindscapeRank: 4,
          levels,
        })
      } catch {
        // 需要特定潜能或额外能力上下文的动作不属于直接伤害段回归。
        continue
      }
      if (!resolved.ok) continue
      expect(resolved.skillTargetIds, action.actionId).not.toContain(M4_TARGET)
      if (resolved.calculation.kind !== "damage") continue
      resolvedDamageActions += 1
      for (const segment of resolved.calculation.segments)
        for (const item of segment.damageItems)
          expect(item.itemId, action.actionId).not.toBe(M4_ITEM)
    }
    expect(resolvedDamageActions).toBeGreaterThan(0)
  })
})

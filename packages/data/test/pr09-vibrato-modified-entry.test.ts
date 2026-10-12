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
 * PR09 修复回归：完整正式制品经 data 装载与 core 目录公共入口消费南宫羽
 * 影画 6[颤音：改]一次异放结算（两个元素分组完整状态选项）。数值锚点
 * （五非物理属性归一基础 5、物理 7.13×0.7=4.991，每层 ×(1+0.25×L)）沿用
 * 目录级回归（packages/core/test/effects/pr09-vibrato-modified.test.ts）
 * 的独立算式；本文件只验证真实发布制品的装载与消费路径一致（原异常来源
 * 是另一名实体的虚拟面板），并确认南宫羽全部真实动作解析不自动派生
 * [颤音：改]独立项或独立目标（完整动作入口不自动追加 M6 结算段）。
 */
const M6_NONPHYSICAL = "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical"
const M6_PHYSICAL = "nanoka:agents:nangongyu:m6-vibrato-modified-physical"
const M6_ITEM = "nangongyu:vibrato-modified"
const M6_TARGET = "zzz-hp:skill:nangongyu-vibrato-modified"

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["Nangong Yu", "Burnice"],
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

describe("batch 09 Nangongyu vibrato-modified through the published data package", () => {
  it("consumes the two element-group settlements via the catalog entry", async () => {
    const calculationData = await data()
    const definitions = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    if (!definitions.ok) throw new Error(JSON.stringify(definitions.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("25")
    for (const optionId of [M6_NONPHYSICAL, M6_PHYSICAL])
      expect(
        catalog.options.some((o) => o.optionId === optionId),
        optionId,
      ).toBe(true)
    // 正式目录登记共用的独立结算目标（uncategorized 分类）。
    expect(catalog.skillTargets.some((t) => t.targetId === M6_TARGET)).toBe(
      true,
    )
    // 六属性 × 1—4 层经正式装载制品结算：基础伤害区锚点 = 归一基础 ×
    // (1 + 0.25 × L) × 原异常来源虚拟攻击力（1200）。
    for (const [element, base, optionId] of [
      ["ether", 5, M6_NONPHYSICAL],
      ["electric", 5, M6_NONPHYSICAL],
      ["fire", 5, M6_NONPHYSICAL],
      ["ice", 5, M6_NONPHYSICAL],
      ["wind", 5, M6_NONPHYSICAL],
      ["physical", 4.991, M6_PHYSICAL],
    ] as const) {
      for (const layers of [1, 2, 3, 4]) {
        const input: StaticCatalogDamageInput = {
          definitions: definitions.value,
          catalog,
          world: {
            entities: [
              {
                kind: "actor",
                entityId: "entity:nangongyu",
                teamId: "team:players",
                generalStats: {
                  attack: general(2600),
                  anomalyProficiency: general(430),
                },
                directStats: {
                  criticalRate: { baseValue: 0, additions: [] },
                  criticalDamage: { baseValue: 0, additions: [] },
                  penetrationRatio: { baseValue: 0.3, additions: [] },
                },
              },
              {
                // 原异常来源：柏妮思的虚拟面板（与南宫羽明显不同的攻击/精通）。
                kind: "actor",
                entityId: "entity:burnice",
                teamId: "team:players",
                generalStats: {
                  attack: general(1200),
                  anomalyProficiency: general(96),
                },
                directStats: {
                  criticalRate: { baseValue: 0, additions: [] },
                  criticalDamage: { baseValue: 0, additions: [] },
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
          bindings: [
            {
              bindingId: "binding:static",
              kind: "agent",
              holderId: "entity:nangongyu",
              sourceEntityId: "1511",
              eligible: true,
              configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
            },
          ],
          actorSources: [
            { entityId: "entity:nangongyu", agentEntityId: "1511" },
            { entityId: "entity:burnice", agentEntityId: "1171" },
          ],
          selections: [{ optionId, bindingId: "binding:static", layers }],
          hit: {
            actorId: "entity:nangongyu",
            targetId: "entity:enemy",
            actionId: "action:vibrato-modified-settlement",
            skillCategory: "uncategorized",
            element,
            skillTags: [],
            skillTargetIds: [M6_TARGET],
            damageItems: [
              {
                mode: "direct",
                role: "base",
                itemId: M6_ITEM,
                damageMultiplier: 0,
                stat: "attack",
                statSource: { entityId: "entity:burnice" },
              },
            ],
          },
          damage: {
            kind: "anomaly-settlement",
            damageBonus: { settledMultiplier: 1 },
            anomalySource: { entityId: "entity:burnice", level: 60 },
            defense: {
              attackerLevel: 60,
              targetBaseDefense: 1000,
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
              isTargetStunned: true,
              targetBaseStunDamageMultiplier: 1.5,
              targetStunDamageMultiplierAdjustments: [],
            },
            anomalyDamageBonus: [],
            refringe: { mode: "settled", multiplier: 1 },
            anomalyCriticalRate: 0,
            anomalyCriticalDamage: [],
          },
        } as unknown as StaticCatalogDamageInput
        const result = calculateStaticDamageFromCatalog(input)
        expect(
          result.ok,
          `${element} L${layers}: ${JSON.stringify(result)}`,
        ).toBe(true)
        if (!result.ok) throw new Error(JSON.stringify(result.issues))
        const item = result.value.evaluation.hit!.damageItems.find(
          (entry) => entry.itemId === M6_ITEM,
        )!
        expect(
          item.damageMultiplier * item.finalStat,
          `${element} L${layers}`,
        ).toBeCloseTo(base * (1 + 0.25 * layers) * 1200, 6)
        expect(item.finalStat).toBe(1200)
      }
    }
  })

  it("keeps real Nangong Yu action parsing free of the vibrato-modified segment", async () => {
    const calculationData = await data()
    const agent = calculationData.agents.find(
      (entry) => entry.attributes.entityId === "1511",
    )!
    expect(agent).toBeDefined()
    const fullLevels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
      ultimate: { mode: "trained" as const, value: 12 },
    }
    let resolvedActions = 0
    for (const action of agent.actions.actions) {
      let resolved: ReturnType<typeof resolveAgentAction> | undefined
      try {
        resolved = resolveAgentAction({
          agent: agent.actions,
          actionId: action.actionId,
          mindscapeRank: 6,
          levels: fullLevels,
        })
      } catch {
        continue
      }
      if (!resolved.ok) continue
      resolvedActions += 1
      if (resolved.calculation.kind !== "damage") continue
      for (const segment of resolved.calculation.segments)
        for (const item of segment.damageItems)
          expect(
            item.itemId === M6_ITEM,
            `${action.actionId} auto-derives ${item.itemId}`,
          ).toBe(false)
      for (const id of resolved.skillTargetIds ?? [])
        expect(
          id === M6_TARGET,
          `${action.actionId} carries the independent target ${id}`,
        ).toBe(false)
    }
    expect(resolvedActions).toBeGreaterThan(0)
  })
})

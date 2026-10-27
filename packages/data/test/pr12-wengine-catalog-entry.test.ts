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
 * PR12 修复回归：完整正式制品经 data 装载与 core 目录公共入口消费比格
 * 气缸受击附伤与加农转子暴击附伤。数值锚点（600%—960% × 装备者当前防御力、
 * 200% × 装备者当前攻击力）沿用目录级回归（pr12-wengine-additional-damage
 * .test.ts）的独立算式；本文件验证真实发布制品的装载与消费路径一致，并
 * 确认真实普通动作解析不自动派生附伤独立项（完整动作入口不自动追加，
 * 附伤只能经目录独立请求显式结算）。持有者按职业适配选择：比格气缸为
 * 防护职业的凯撒（1071），加农转子为强攻职业的伊芙琳（1321）。
 */
const BIG_CYLINDER = "nanoka:w-engines:13112:retaliation-defense-damage"
const CANNON_ROTOR = "nanoka:w-engines:14001:critical-hit-bonus-damage"
const CANNON_ROTOR_ATK =
  "w-engines:Cannon_Rotor:refinement:blk-legacy:legacy-self-inCombatAtkPercent"
const BIG_CYLINDER_TARGET = "zzz-hp:skill:big-cylinder-retaliation"
const CANNON_ROTOR_TARGET = "zzz-hp:skill:cannon-rotor-bonus-damage"
const ITEM_IDS = new Set([
  "big-cylinder:retaliation",
  "cannon-rotor:bonus-damage",
])
const TARGET_IDS = new Set([BIG_CYLINDER_TARGET, CANNON_ROTOR_TARGET])

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["1071", "1321"],
    wEngines: ["13112", "14001"],
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

function settlementInput(options: {
  readonly engineEntityId: string
  readonly agentEntityId: string
  readonly optionIds: readonly { optionId: string; layers: number }[]
  readonly refinement: number
  readonly itemId: string
  readonly targetId: string
  readonly stat: "defense" | "attack"
  readonly statValue: number
  /** 加农转子附伤的最终暴击概率（无默认值，显式声明）。 */
  readonly declaredCriticalRate?: number
}): StaticCatalogDamageInput {
  return {
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:holder",
          teamId: "team:players",
          generalStats: {
            attack: general(
              options.stat === "attack" ? options.statValue : 1000,
            ),
            defense: general(
              options.stat === "defense" ? options.statValue : 900,
            ),
            health: general(24000),
            impact: general(170),
          },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
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
    bindings: [
      {
        bindingId: "binding:engine",
        kind: "w-engine",
        holderId: "entity:holder",
        sourceEntityId: options.engineEntityId,
        eligible: true,
        configuration: { refinement: options.refinement },
      },
    ],
    actorSources: [
      { entityId: "entity:holder", agentEntityId: options.agentEntityId },
    ],
    selections: options.optionIds.map((selection) => ({
      optionId: selection.optionId,
      bindingId: "binding:engine",
      layers: selection.layers,
    })),
    hit: {
      actorId: "entity:holder",
      targetId: "entity:enemy",
      actionId: "action:wengine-bonus-damage",
      skillCategory: "uncategorized",
      element: "physical",
      skillTags: [],
      ...(options.declaredCriticalRate === undefined
        ? {}
        : { declaredCriticalRate: options.declaredCriticalRate }),
      skillTargetIds: [options.targetId],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: options.itemId,
          damageMultiplier: 0,
          stat: options.stat,
          statSource: { entityId: "entity:holder" },
        },
      ],
    },
    damage: {
      kind: "regular",
      damageBonus: [],
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
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  } as unknown as StaticCatalogDamageInput
}

describe("batch 12 w-engine additional damage through the published data package", () => {
  it("consumes both independent settlements via the catalog entry", async () => {
    const calculationData = await data()
    expect(calculationData.wEngines.map((e) => e.entityId).toSorted()).toEqual([
      "13112",
      "14001",
    ])
    const definitions = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    if (!definitions.ok) throw new Error(JSON.stringify(definitions.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("57")
    for (const optionId of [BIG_CYLINDER, CANNON_ROTOR])
      expect(
        catalog.options.some((o) => o.optionId === optionId),
        optionId,
      ).toBe(true)

    // 比格气缸 R1（凯撒，防御 800）：6 × 800 = 4800，必暴钳制为 1。
    const cylinder = calculateStaticDamageFromCatalog({
      ...settlementInput({
        engineEntityId: "13112",
        agentEntityId: "1071",
        optionIds: [{ optionId: BIG_CYLINDER, layers: 1 }],
        refinement: 1,
        itemId: "big-cylinder:retaliation",
        targetId: BIG_CYLINDER_TARGET,
        stat: "defense",
        statValue: 800,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(cylinder.ok, JSON.stringify(cylinder)).toBe(true)
    if (!cylinder.ok) throw new Error(JSON.stringify(cylinder.issues))
    expect(cylinder.value.factors.nonCritical.baseDamage).toBeCloseTo(4800, 6)
    expect(cylinder.value.criticalRate).toBe(1)
    expect(cylinder.value.expected).toBeCloseTo(cylinder.value.critical!, 9)

    // 比格气缸 R5（防御 1200）：9.6 × 1200 = 11520。
    const cylinderR5 = calculateStaticDamageFromCatalog({
      ...settlementInput({
        engineEntityId: "13112",
        agentEntityId: "1071",
        optionIds: [{ optionId: BIG_CYLINDER, layers: 1 }],
        refinement: 5,
        itemId: "big-cylinder:retaliation",
        targetId: BIG_CYLINDER_TARGET,
        stat: "defense",
        statValue: 1200,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(cylinderR5.ok, JSON.stringify(cylinderR5)).toBe(true)
    if (!cylinderR5.ok) throw new Error(JSON.stringify(cylinderR5.issues))
    expect(cylinderR5.value.factors.nonCritical.baseDamage).toBeCloseTo(
      11520,
      6,
    )

    // 加农转子 R3（伊芙琳，攻击 1000）：2 × 1000 = 2000；最终暴击概率由
    // 调用方显式声明（r=0.25），critical 分支沿用持有者当前普通暴击伤害
    // （条件计算模型，非游戏实测）。
    const rotor = calculateStaticDamageFromCatalog({
      ...settlementInput({
        engineEntityId: "14001",
        agentEntityId: "1321",
        optionIds: [{ optionId: CANNON_ROTOR, layers: 1 }],
        refinement: 3,
        itemId: "cannon-rotor:bonus-damage",
        targetId: CANNON_ROTOR_TARGET,
        stat: "attack",
        statValue: 1000,
        declaredCriticalRate: 0.25,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(rotor.ok, JSON.stringify(rotor)).toBe(true)
    if (!rotor.ok) throw new Error(JSON.stringify(rotor.issues))
    expect(rotor.value.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    expect(rotor.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(rotor.value.expected).toBeCloseTo(
      0.75 * rotor.value.nonCritical + 0.25 * rotor.value.critical!,
      9,
    )

    // 加农转子 R2 与常驻 ATK 选项共存：当前攻击 1000 → 1086，附伤 2 × 1086。
    const both = calculateStaticDamageFromCatalog({
      ...settlementInput({
        engineEntityId: "14001",
        agentEntityId: "1321",
        optionIds: [
          { optionId: CANNON_ROTOR, layers: 1 },
          { optionId: CANNON_ROTOR_ATK, layers: 1 },
        ],
        refinement: 2,
        itemId: "cannon-rotor:bonus-damage",
        targetId: CANNON_ROTOR_TARGET,
        stat: "attack",
        statValue: 1000,
        declaredCriticalRate: 0.25,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(both.ok, JSON.stringify(both)).toBe(true)
    if (!both.ok) throw new Error(JSON.stringify(both.issues))
    expect(both.value.factors.nonCritical.baseDamage).toBeCloseTo(2172, 6)
  })

  it("keeps real action parsing free of the additional-damage segments", async () => {
    const calculationData = await data()
    const fullLevels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
      ultimate: { mode: "trained" as const, value: 12 },
    }
    // 两名持有者的全部可计算动作：解析结果不自动携带附伤独立项或独立目标，
    // 完整动作入口不会自动派生附伤段。
    for (const [name, entityId] of [
      ["Caesar", "1071"],
      ["Evelyn", "1321"],
    ] as const) {
      const agent = calculationData.agents.find(
        (entry) => entry.attributes.entityId === entityId,
      )!
      expect(agent, name).toBeTruthy()
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
        if (resolved.calculation.kind !== "damage") continue
        for (const segment of resolved.calculation.segments)
          for (const item of segment.damageItems)
            expect(
              ITEM_IDS.has(item.itemId),
              `${action.actionId} auto-derives ${item.itemId}`,
            ).toBe(false)
        for (const id of resolved.skillTargetIds ?? [])
          expect(
            TARGET_IDS.has(id),
            `${action.actionId} carries the independent target ${id}`,
          ).toBe(false)
      }
    }
  })
})

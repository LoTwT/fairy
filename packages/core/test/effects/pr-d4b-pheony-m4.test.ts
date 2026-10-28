import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  DamageElement,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * PR-B2：菲欧妮影画 4[生命尽头与冷酷仙境]的六元素异放结算。
 *
 * [烬火追魂]或[普通攻击：焚罪]终结一击命中处于异常状态的敌人时，额外触发
 * 一次[异放]，固定结算 600% 倍率的对应属性异常伤害。ZZZ-HP 的
 * `anomalyBaseExpected` 不含原异常系数，因此最终倍率等于原异常系数 × 6：
 * 物理 7.13×6=42.78、火 0.5×6=3、冰 5×6=30、电 1.25×6=7.5、
 * 以太 0.625×6=3.75、风 12.5×6=75。
 *
 * 每个元素选项是一条 `independent-settlement` 目录变体：独立
 * `uncategorized` 目标、共享零初始倍率伤害项、`anomaly-source` 属性来源；
 * 该次异放暴击时额外暴伤 40% 只进入 `anomaly-settlement-critical-damage`。
 * 固定源常驻 40% 旧位置（rank0 eff-9）保持 semantic-conflict 迁移入口，
 * 不生成常驻贡献。触发招式、异常状态与命中时点由调用方声明。
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog

const M4_TARGET = "zzz-hp:skill:pheony-m4-anomaly-settlement"
const M4_ITEM = "pheony:m4-anomaly-settlement"
const OTHER_SETTLEMENT_TARGET = "zzz-hp:skill:big-cylinder-retaliation"
const ABRASION_M0 = "agents:pheony:mindscape:0:abrasion-core-state"
const ABRASION_M1 = "agents:pheony:mindscape:1:abrasion-mindscape-1-state"
const M6_DEFENSE = "agents:pheony:mindscape:6:blk-mindscapeBuffs-6-1:eff-8"

const cases = [
  { element: "physical", multiplier: 42.78 },
  { element: "fire", multiplier: 3 },
  { element: "ice", multiplier: 30 },
  { element: "electric", multiplier: 7.5 },
  { element: "ether", multiplier: 3.75 },
  { element: "wind", multiplier: 75 },
] as const

const optionId = (element: string) =>
  `nanoka:agents:1641:m4-anomaly-settlement-${element}`
const effectId = (element: string) =>
  `agent:1641:nanoka:m4-anomaly-settlement-${element}:mindscape:4`
const critEffectId = (element: string) => `${effectId(element)}-crit-damage`

const generalDamage = () => ({
  damageBonus: { settledMultiplier: 1 },
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
})

type DamageItem = StaticCatalogDamageInput["hit"]["damageItems"][number]

const damageItem = (options: {
  readonly itemId?: string
  readonly multiplier?: number
  readonly statSourceEntityId?: `entity:${string}`
}): DamageItem => ({
  mode: "direct",
  role: "base",
  itemId: options.itemId ?? M4_ITEM,
  stat: "attack",
  statSource: { entityId: options.statSourceEntityId ?? "entity:source" },
  damageMultiplier: options.multiplier ?? 0,
})

function request(options: {
  readonly element: string
  readonly mindscapeRank?: 0 | 3 | 4 | 5 | 6
  readonly selections?: StaticCatalogDamageInput["selections"]
  readonly itemMultiplier?: number
  readonly skillCategory?: StaticCatalogDamageInput["hit"]["skillCategory"]
  readonly statSourceEntityId?: `entity:${string}`
  readonly itemId?: string
  readonly targetIds?: readonly string[]
  readonly items?: readonly [DamageItem, ...DamageItem[]]
  readonly definitions?: typeof definitions
  readonly catalog?: StaticEffectCatalog
}): StaticCatalogDamageInput {
  const element = options.element as DamageElement
  const holder = "entity:pheony" as const
  const source = "entity:source" as const
  const selections = options.selections ?? [
    {
      optionId: optionId(options.element),
      bindingId: "binding:pheony" as const,
      layers: 1,
    },
  ]
  return {
    ...inputFor(),
    definitions: options.definitions ?? definitions,
    catalog: options.catalog ?? catalog,
    actorSources: [
      { entityId: holder, agentEntityId: "1641" },
      { entityId: source, agentEntityId: "1301" },
    ],
    bindings: [
      {
        bindingId: "binding:pheony",
        kind: "agent",
        holderId: holder,
        sourceEntityId: "1641",
        eligible: true,
        configuration: {
          mindscapeRank: options.mindscapeRank ?? 4,
          coreSkillLevel: 7,
        },
      },
    ],
    selections,
    world: {
      ...inputFor().world,
      entities: [
        {
          kind: "actor",
          entityId: holder,
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
          entityId: source,
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
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
      actorId: holder,
      targetId: "entity:enemy",
      actionId: "action:test",
      skillCategory: options.skillCategory ?? "uncategorized",
      element,
      skillTargetIds: options.targetIds ?? [M4_TARGET],
      skillTags: [],
      damageItems: options.items ?? [
        damageItem({
          ...(options.itemId === undefined ? {} : { itemId: options.itemId }),
          ...(options.itemMultiplier === undefined
            ? {}
            : { multiplier: options.itemMultiplier }),
          ...(options.statSourceEntityId === undefined
            ? {}
            : { statSourceEntityId: options.statSourceEntityId }),
        }),
      ],
    },
    damage: {
      kind: "anomaly-settlement",
      ...generalDamage(),
      anomalySource: { entityId: source, level: 52 },
      anomalySettlementCriticalRate: 0,
      anomalySettlementCriticalDamage: [],
    } as unknown as StaticCatalogDamageInput["damage"],
  }
}

function calculate(value: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(value)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function settledItem(result: StaticDamageResult, itemId = M4_ITEM) {
  const item = result.evaluation.hit!.damageItems.find(
    (entry) => entry.itemId === itemId,
  )
  if (!item) throw new Error(`missing damage item ${itemId}`)
  return item
}

const contributions = (result: StaticDamageResult, id: string) =>
  result.evaluation.contributions.filter(
    (entry) => entry.origin.effectId === id,
  )

const contribution = (result: StaticDamageResult, id: string) =>
  contributions(result, id).reduce((sum, entry) => sum + entry.value.value, 0)

const totalFor = (result: StaticDamageResult, effectIdPart: string) =>
  result.evaluation.contributions
    .filter((entry) => entry.origin.effectId.includes(`:${effectIdPart}:`))
    .reduce((sum, entry) => sum + entry.value.value, 0)

describe("Pheony M4 six-element independent anomaly settlement", () => {
  it.each(cases)(
    "settles $element at the normalized 600% multiplier",
    ({ element, multiplier }) => {
      const result = calculate(request({ element }))
      const item = settledItem(result)
      expect(item.damageMultiplier).toBeCloseTo(multiplier, 9)
      expect(item.finalStat).toBe(1000)
      expect(item.damageMultiplier * item.finalStat).toBeCloseTo(
        multiplier * 1000,
        6,
      )
      expect(result.criticalRate).toBe(0)
      expect(contribution(result, critEffectId(element))).toBeCloseTo(0.4, 9)
    },
  )

  it("applies the independent 40% crit damage only when M4 is selected", () => {
    const withM4 = calculate(request({ element: "physical" }))
    expect(contribution(withM4, critEffectId("physical"))).toBeCloseTo(0.4, 9)

    const withoutM4 = calculate(
      request({
        element: "physical",
        selections: [
          { optionId: ABRASION_M0, bindingId: "binding:pheony", layers: 1 },
        ],
      }),
    )
    expect(settledItem(withoutM4).damageMultiplier).toBe(0)
    expect(contribution(withoutM4, critEffectId("physical"))).toBe(0)
    expect(
      withoutM4.factors.critical?.anomalyCritical ?? 1,
      "the permanent eff-9 record must stay out of the settlement",
    ).toBeCloseTo(1.25, 9)
  })

  it("does not give another anomaly settlement the M4 multiplier or 40%", () => {
    const other = calculate(
      request({
        element: "fire",
        targetIds: [OTHER_SETTLEMENT_TARGET],
      }),
    )
    expect(settledItem(other).damageMultiplier).toBe(0)
    expect(contribution(other, critEffectId("fire"))).toBe(0)
    expect(contribution(other, effectId("fire"))).toBe(0)
  })

  it("adds core 25%, M1 25% and M4 40% once in the dedicated channel", () => {
    const result = calculate(
      request({
        element: "fire",
        selections: [
          { optionId: ABRASION_M1, bindingId: "binding:pheony", layers: 1 },
          {
            optionId: optionId("fire"),
            bindingId: "binding:pheony",
            layers: 1,
          },
        ],
      }),
    )
    expect(totalFor(result, "eff-6")).toBeCloseTo(0.25, 12)
    expect(totalFor(result, "eff-19")).toBeCloseTo(0.25, 12)
    expect(totalFor(result, "eff-10")).toBe(0)
    expect(contributions(result, critEffectId("fire"))).toHaveLength(1)
    expect(contribution(result, critEffectId("fire"))).toBeCloseTo(0.4, 12)
    expect(result.factors.critical?.anomalyCritical).toBeCloseTo(1.9, 9)
    for (const [id, value] of [
      ["eff-6", 0.25],
      ["eff-19", 0.25],
      [critEffectId("fire"), 0.4],
    ] as const) {
      expect(totalFor(result, id) || contribution(result, id), id).toBeCloseTo(
        value,
        9,
      )
    }
    for (const part of ["eff-6", "eff-19"])
      for (const entry of result.evaluation.contributions.filter((entry) =>
        entry.origin.effectId.includes(`:${part}:`),
      ))
        expect(entry.address).toMatchObject({
          kind: "factor",
          channel: "anomaly-settlement-critical-damage",
        })
    for (const entry of contributions(result, critEffectId("fire")))
      expect(entry.address).toMatchObject({
        kind: "factor",
        channel: "anomaly-settlement-critical-damage",
      })
  })

  it("applies the M6 settlement defense adjustment exactly once", () => {
    const withoutM6 = calculate(request({ element: "fire", mindscapeRank: 6 }))
    const withM6 = calculate(
      request({
        element: "fire",
        mindscapeRank: 6,
        selections: [
          { optionId: M6_DEFENSE, bindingId: "binding:pheony", layers: 1 },
          {
            optionId: optionId("fire"),
            bindingId: "binding:pheony",
            layers: 1,
          },
        ],
      }),
    )
    expect(
      withoutM6.evaluation.contributions.filter((entry) =>
        entry.origin.effectId.includes(":eff-8:"),
      ),
    ).toHaveLength(0)
    expect(
      withM6.evaluation.contributions.filter((entry) =>
        entry.origin.effectId.includes(":eff-8:"),
      ),
    ).toHaveLength(1)
    expect(totalFor(withM6, "eff-8")).toBeCloseTo(-0.4, 12)
    expect(settledItem(withM6).damageMultiplier).toBeCloseTo(3, 9)
  })

  it.each([4, 5, 6] as const)(
    "unlocks the settlement at mindscape %s",
    (mindscapeRank) => {
      const result = calculate(request({ element: "fire", mindscapeRank }))
      expect(settledItem(result).damageMultiplier).toBeCloseTo(3, 9)
    },
  )

  it.each([0, 3] as const)("rejects M4 below the unlock rank (%s)", (rank) => {
    const result = calculateStaticDamageFromCatalog(
      request({ element: "fire", mindscapeRank: rank }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
  })

  it("requires the independent item at zero multiplier and the anomaly source", () => {
    const missing = calculateStaticDamageFromCatalog(
      request({ element: "fire", itemId: "other" }),
    )
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
      ).toBe(true)

    const prefilled = calculateStaticDamageFromCatalog(
      request({ element: "fire", itemMultiplier: 1 }),
    )
    expect(prefilled.ok).toBe(false)
    if (!prefilled.ok)
      expect(
        prefilled.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("zero multiplier"),
        ),
      ).toBe(true)

    const wrongSource = calculateStaticDamageFromCatalog(
      request({ element: "fire", statSourceEntityId: "entity:pheony" }),
    )
    expect(wrongSource.ok).toBe(false)
    if (!wrongSource.ok)
      expect(
        wrongSource.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("anomaly source"),
        ),
      ).toBe(true)
  })

  it("rejects trigger skill categories outside the independent settlement contract", () => {
    const result = calculateStaticDamageFromCatalog(
      request({ element: "fire", skillCategory: "basic" }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
  })

  it("does not apply the selected element to another hit element", () => {
    const result = calculate(request({ element: "fire" }))
    const mismatched = calculate(
      request({
        element: "wind",
        selections: [
          {
            optionId: optionId("fire"),
            bindingId: "binding:pheony",
            layers: 1,
          },
        ],
      }),
    )
    expect(settledItem(result).damageMultiplier).toBeCloseTo(3, 9)
    expect(settledItem(mismatched).damageMultiplier).toBe(0)
    expect(contribution(mismatched, critEffectId("fire"))).toBe(0)
  })

  it("scales only the declared M4 item, not another damage item", () => {
    const baseItemId = "action:agent:1641:action:0001:base"
    const result = calculate(
      request({
        element: "fire",
        items: [
          damageItem({ itemId: baseItemId, multiplier: 2 }),
          damageItem({ multiplier: 0 }),
        ],
      }),
    )
    expect(settledItem(result, baseItemId).damageMultiplier).toBe(2)
    expect(settledItem(result).damageMultiplier).toBeCloseTo(3, 9)
    expect(contribution(result, critEffectId("fire"))).toBeCloseTo(0.4, 9)
  })

  it("proves the element multiplier and separate 40% rule are necessary (ablation)", () => {
    const mutableCatalog = structuredClone(catalog) as StaticEffectCatalog
    const physical = mutableCatalog.options.find(
      (option) => option.optionId === optionId("physical"),
    )!
    const variant = physical.variants[0] as unknown as {
      effectIds: string[]
      status: string
      reason?: string
    }
    const mutableDefinitions = structuredClone(definitions) as unknown as {
      effects: { effectId: string }[]
    }
    variant.effectIds = variant.effectIds.filter(
      (id) => id !== critEffectId("physical"),
    )
    mutableDefinitions.effects = mutableDefinitions.effects.filter(
      (rule) => rule.effectId !== critEffectId("physical"),
    )
    const withoutCrit = calculate(
      request({
        element: "physical",
        catalog: mutableCatalog,
        definitions: mutableDefinitions as unknown as typeof definitions,
      }),
    )
    expect(settledItem(withoutCrit).damageMultiplier).toBeCloseTo(42.78, 9)
    expect(withoutCrit.factors.critical?.anomalyCritical).toBeCloseTo(1, 9)
    expect(contribution(withoutCrit, critEffectId("physical"))).toBe(0)

    variant.effectIds = variant.effectIds.filter(
      (id) => id !== effectId("physical"),
    )
    mutableDefinitions.effects = mutableDefinitions.effects.filter(
      (rule) => rule.effectId !== effectId("physical"),
    )
    variant.status = "unsupported"
    variant.reason = "semantic-conflict"
    const withoutMultiplier = calculateStaticDamageFromCatalog(
      request({
        element: "physical",
        catalog: mutableCatalog,
        definitions: mutableDefinitions as unknown as typeof definitions,
      }),
    )
    expect(withoutMultiplier.ok).toBe(false)
    if (!withoutMultiplier.ok)
      expect(withoutMultiplier.issues.length).toBeGreaterThan(0)
  })
})

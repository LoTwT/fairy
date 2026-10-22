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
 * D4-1b：菲欧妮影画 4[生命尽头与冷酷仙境]的六元素异放结算。600% 固定
 * 倍率按固定提交 publicAnomalySkills.ts 的原异常系数归一：
 * 物理 7.13×6=42.78、火 0.5×6=3、冰 5×6=30、电 1.25×6=7.5、
 * 以太 0.625×6=3.75、风 12.5×6=75。该次异放暴击时额外暴伤 40% 只进入
 * anomaly-settlement 通道；触发招式与异常状态由调用方声明。
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
const M2_STATE = "agents:pheony:mindscape:2:abrasion-mindscape-2-state"

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

const generalDamage = {
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
}

function request(options: {
  element: string
  mindscapeRank?: 0 | 3 | 4 | 5 | 6
  selections?: StaticCatalogDamageInput["selections"]
  itemMultiplier?: number
  skillCategory?: StaticCatalogDamageInput["hit"]["skillCategory"]
  statSourceEntityId?: `entity:${string}`
  itemId?: string
}): StaticCatalogDamageInput {
  const element = options.element as DamageElement
  const holder = "entity:pheony" as const
  const source = "entity:source" as const
  const sourceEntityId = options.statSourceEntityId ?? source
  const selections = options.selections ?? [
    {
      optionId: optionId(options.element),
      bindingId: "binding:pheony" as const,
      layers: 1,
    },
  ]
  return {
    ...inputFor(),
    definitions,
    catalog,
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
      skillTargetIds: [M4_TARGET],
      skillTags: [],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: options.itemId ?? M4_ITEM,
          stat: "attack",
          statSource: { entityId: sourceEntityId },
          damageMultiplier: options.itemMultiplier ?? 0,
        },
      ],
    },
    damage: {
      kind: "anomaly-settlement",
      ...generalDamage,
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

function settledItem(result: StaticDamageResult) {
  const item = result.evaluation.hit!.damageItems.find(
    (entry) => entry.itemId === M4_ITEM,
  )
  if (!item) throw new Error("missing M4 item")
  return item
}

const contribution = (result: StaticDamageResult, id: string) =>
  result.evaluation.contributions
    .filter((entry) => entry.origin.effectId === id)
    .reduce((sum, entry) => sum + entry.value.value, 0)

describe("D4 Pheony M4 six-element anomaly settlement", () => {
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
    },
  )

  it("applies the independent 40% crit damage only to the M4 settlement", () => {
    const withM4 = calculate(request({ element: "physical" }))
    expect(contribution(withM4, critEffectId("physical"))).toBeCloseTo(0.4, 9)

    const withoutM4 = calculate(
      request({ element: "physical", selections: [] }),
    )
    expect(settledItem(withoutM4).damageMultiplier).toBe(0)
    expect(contribution(withoutM4, critEffectId("physical"))).toBe(0)
  })

  it("adds the 40% on top of the abrasion core and M1 crit damage", () => {
    const result = calculate(
      request({
        element: "fire",
        selections: [
          { optionId: M2_STATE, bindingId: "binding:pheony", layers: 1 },
          {
            optionId: optionId("fire"),
            bindingId: "binding:pheony",
            layers: 1,
          },
        ],
      }),
    )
    const ids = result.evaluation.contributions.map(
      (entry) => entry.origin.effectId,
    )
    expect(ids.some((id) => id.includes("eff-6:blk-mindscapeBuffs-0-1"))).toBe(
      true,
    )
    expect(ids.some((id) => id.includes("eff-19:blk-mindscapeBuffs-1-1"))).toBe(
      true,
    )
    expect(contribution(result, critEffectId("fire"))).toBeCloseTo(0.4, 9)
  })

  it("keeps the six element options mutually exclusive by hit element", () => {
    const result = calculate(
      request({
        element: "wind",
        selections: cases.map(({ element }) => ({
          optionId: optionId(element),
          bindingId: "binding:pheony" as const,
          layers: 1,
        })),
      }),
    )
    expect(settledItem(result).damageMultiplier).toBeCloseTo(75, 9)
    for (const { element } of cases)
      if (element !== "wind")
        expect(contribution(result, critEffectId(element))).toBe(0)
  })

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
})

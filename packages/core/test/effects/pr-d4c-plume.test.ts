import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { inputFor } from "./static-fixtures.ts"

/**
 * D4-2：涅槃初翎（14164）五档精炼。异常精通是常驻固定值；火属性增伤只在
 * 调用方选中对应精炼选项时生效（选项即“已触发”的声明），不模拟 20 秒
 * 持续或刷新。
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

const tiers = [
  { rank: 1, mastery: 90, fire: 0.4, even: "eff-0", odd: "eff-1" },
  { rank: 2, mastery: 99, fire: 0.44, even: "eff-2", odd: "eff-3" },
  { rank: 3, mastery: 108, fire: 0.48, even: "eff-4", odd: "eff-5" },
  { rank: 4, mastery: 117, fire: 0.52, even: "eff-6", odd: "eff-7" },
  { rank: 5, mastery: 126, fire: 0.56, even: "eff-8", odd: "eff-9" },
] as const

const optionIdFor = (fragment: string) => {
  const option = catalog.options.find(
    (candidate) =>
      candidate.catalogEntityId === "w-engines:Plume_of_Rebirth" &&
      candidate.variants.some((variant) =>
        variant.effectIds.some((effectId) => effectId.includes(fragment)),
      ),
  )
  if (!option) throw new Error(`missing option ${fragment}`)
  return option.optionId
}

function request(options: {
  rank: number
  element?: "fire" | "physical"
  mastery?: boolean
  fire?: boolean
  tierFragment?: string
}): StaticCatalogDamageInput {
  const tier =
    tiers.find((candidate) => candidate.even === options.tierFragment) ??
    tiers.find((candidate) => candidate.rank === options.rank) ??
    tiers[0]
  const selections: StaticCatalogDamageInput["selections"] = [
    ...(options.mastery === false
      ? []
      : [
          {
            optionId: optionIdFor(`w-engine:14164:zzz-hp:${tier.even}:`),
            bindingId: "binding:plume" as const,
            layers: 1,
          },
        ]),
    ...(options.fire === false
      ? []
      : [
          {
            optionId: optionIdFor(`w-engine:14164:zzz-hp:${tier.odd}:`),
            bindingId: "binding:plume" as const,
            layers: 1,
          },
        ]),
  ]
  const base = inputFor()
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:plume",
        kind: "w-engine",
        holderId: "entity:attacker",
        sourceEntityId: "14164",
        eligible: true,
        configuration: { refinement: options.rank as 1 },
      },
    ],
    actorSources: [{ entityId: "entity:attacker", agentEntityId: "1641" }],
    selections,
    hit: {
      ...base.hit,
      actorId: "entity:attacker",
      element: options.element ?? "fire",
      skillCategory: "basic",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "attack",
          stat: "attack",
          statSource: { entityId: "entity:attacker" },
          damageMultiplier: 1,
        },
      ],
    },
    damage: {
      kind: "anomaly",
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
      refringe: { mode: "settled", multiplier: 1 },
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      anomalySource: { entityId: "entity:attacker", level: 60 },
    } as unknown as StaticCatalogDamageInput["damage"],
  }
}

function calculate(value: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(value)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

const fireContribution = (result: StaticDamageResult, rank: number) => {
  const tier = tiers.find((candidate) => candidate.rank === rank)!
  return result.evaluation.contributions
    .filter((entry) => entry.origin.effectId.includes(`${tier.odd}:`))
    .reduce((sum, entry) => sum + entry.value.value, 0)
}

const masteryReading = (result: StaticDamageResult) => {
  const reading = result.evaluation.attributes.find(
    (entry) =>
      entry.entityId === "entity:attacker" &&
      entry.stat === "anomalyProficiency" &&
      entry.stage === "current",
  )
  if (!reading) throw new Error("missing anomalyProficiency reading")
  return reading.value.value
}

describe("D4 Plume of Rebirth refinement behavior", () => {
  it.each(tiers)(
    "adds the R$rank mastery and fire damage once",
    ({ rank, mastery, fire }) => {
      const result = calculate(request({ rank }))
      expect(masteryReading(result)).toBeCloseTo(300 + mastery, 9)
      expect(fireContribution(result, rank)).toBeCloseTo(fire, 9)
    },
  )

  it.each(tiers)(
    "keeps the R$rank fire damage off non-fire hits",
    ({ rank, mastery }) => {
      const result = calculate(request({ rank, element: "physical" }))
      expect(masteryReading(result)).toBeCloseTo(300 + mastery, 9)
      expect(fireContribution(result, rank)).toBe(0)
    },
  )

  it("keeps mastery independent from the fire trigger declaration", () => {
    const masteryOnly = calculate(request({ rank: 3, fire: false }))
    expect(masteryReading(masteryOnly)).toBeCloseTo(408, 9)
    expect(fireContribution(masteryOnly, 3)).toBe(0)

    const fireOnly = calculate(request({ rank: 3, mastery: false }))
    expect(masteryReading(fireOnly)).toBeCloseTo(300, 9)
    expect(fireContribution(fireOnly, 3)).toBeCloseTo(0.48, 9)
  })

  it("rejects a refinement mismatch between binding and option", () => {
    const result = calculateStaticDamageFromCatalog(
      request({ rank: 1, tierFragment: "eff-2" }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues.some((issue) => issue.code === "MISSING_RANK")).toBe(
        true,
      )
  })
})

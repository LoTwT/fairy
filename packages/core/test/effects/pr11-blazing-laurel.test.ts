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
import { inputFor } from "./static-fixtures.ts"

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
const oldOption =
  "w-engines:Blazing_Laurel:refinement:blk-legacy:legacy-team-critDmg"
const r5Option =
  "w-engines:Blazing_Laurel:refinement:blk-legacy:legacy-team-dmgBonus"
const impactOption = "nanoka:w-engines:14116:impact-after-assist"

function request(
  refinement: 1 | 2 | 3 | 4 | 5,
  layers: number | undefined,
  {
    holder = "1101",
    beneficiary = holder,
    element = "fire",
    impact = false,
    sameTeam = true,
  }: {
    holder?: string
    beneficiary?: string
    element?: DamageElement
    impact?: boolean
    sameTeam?: boolean
  } = {},
): StaticCatalogDamageInput {
  const base = inputFor()
  const actor = base.world.entities[0]!
  if (actor.kind !== "actor" || base.damage.kind !== "regular")
    throw new Error("fixture")
  return {
    ...base,
    definitions,
    catalog,
    world: {
      ...base.world,
      entities: [
        ...base.world.entities,
        {
          ...actor,
          entityId: "entity:holder",
          teamId: sameTeam ? "team:players" : "team:other",
        },
      ],
    },
    actorSources: [
      { entityId: "entity:attacker", agentEntityId: beneficiary },
      { entityId: "entity:holder", agentEntityId: holder },
    ],
    bindings: [
      {
        kind: "w-engine",
        bindingId: "binding:weapon",
        holderId: "entity:holder",
        sourceEntityId: "14116",
        eligible: true,
        configuration: { refinement },
      },
    ],
    selections: [
      ...(layers === undefined
        ? []
        : [
            {
              optionId: refinement === 5 ? r5Option : oldOption,
              bindingId: "binding:weapon" as const,
              layers,
            },
          ]),
      ...(impact
        ? [
            {
              optionId: impactOption,
              bindingId: "binding:weapon" as const,
              layers: 1,
            },
          ]
        : []),
    ],
    hit: {
      ...base.hit,
      element,
      // 普攻只是施加状态的触发，受益命中不要求仍为普攻。
      skillCategory: "ultimate",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "attack",
          stat: "attack",
          statSource: { entityId: "entity:attacker" },
          damageMultiplier: 1,
        },
        ...(impact
          ? [
              {
                mode: "direct" as const,
                role: "base" as const,
                itemId: "holder-impact",
                stat: "impact" as const,
                statSource: { entityId: "entity:holder" as const },
                damageMultiplier: 1,
              },
            ]
          : []),
      ],
    },
    damage: {
      ...base.damage,
      damageBonus: [0.2],
      defense: { ...base.damage.defense, targetBaseDefense: 0 },
    },
  }
}

function calculate(input: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function assertWilt(result: StaticDamageResult, expected: number) {
  const contributions = result.evaluation.contributions.filter(
    (entry) => entry.origin.beneficiaryId === "entity:attacker",
  )
  const critical = contributions.filter(
    (entry) =>
      entry.address.kind === "stat" && entry.address.stat === "criticalDamage",
  )
  expect(
    critical.reduce((sum, entry) => sum + entry.value.value, 0),
  ).toBeCloseTo(expected, 12)
  expect(
    contributions.filter(
      (entry) =>
        entry.address.kind === "factor" &&
        entry.address.channel === "damage-bonus",
    ),
  ).toEqual([])
  // 独立算式：ATK1000 × (1 + 20% 增伤)，暴击另乘 (1 + 50% + 萎靡暴伤)。
  expect(result.factors.nonCritical.damageBonus).toBeCloseTo(1.2, 12)
  expect(result.nonCritical).toBeCloseTo(1200, 9)
  expect(result.critical).toBeCloseTo(1200 * (1.5 + expected), 9)
}

describe("Blazing Laurel Wilt critical damage", () => {
  it.each([1, 20])(
    "R5 %i layers contributes critical damage without damage bonus",
    (layers) => {
      assertWilt(calculate(request(5, layers)), layers * 0.024)
    },
  )

  it.each([
    [1, 0.015],
    [2, 0.0172],
    [3, 0.0195],
    [4, 0.0217],
  ] as const)("preserves R%i at the recorded precision", (rank, perLayer) => {
    assertWilt(calculate(request(rank, 20)), perLayer * 20)
  })

  it.each([0, undefined])("disables the state at layers %s", (layers) => {
    assertWilt(calculate(request(5, layers)), 0)
  })

  it.each([-1, 0.5, 21])("rejects illegal layers %s", (layers) => {
    expect(calculateStaticDamageFromCatalog(request(5, layers))).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_INPUT", pointer: "/selections/0/layers" }],
    })
  })

  // 沿用目录按受益角色元素筛选的契约；这里命中与角色元素一致。
  it.each([
    ["1101", "fire", 0.48],
    ["1141", "ice", 0.48],
    ["1041", "fire", 0.48],
    ["1011", "electric", 0],
    ["1061", "physical", 0],
    ["1241", "ether", 0],
  ] as const)(
    "applies the existing element gate to %s / %s",
    (beneficiary, element, expected) => {
      assertWilt(calculate(request(5, 20, { beneficiary, element })), expected)
    },
  )

  it("rejects benefit from a non-stun equipper even when the binding claims eligibility", () => {
    assertWilt(
      calculate(request(5, 20, { holder: "1041", beneficiary: "1101" })),
      0,
    )
  })

  it("also grants the team critical damage to the equipper", () => {
    const input = request(5, 20)
    const result = calculate({
      ...input,
      hit: { ...input.hit, actorId: "entity:holder" },
    })
    expect(result.nonCritical).toBeCloseTo(1200, 9)
    expect(result.critical).toBeCloseTo(2376, 9)
    expect(
      result.evaluation.contributions
        .filter(
          (entry) =>
            entry.origin.beneficiaryId === "entity:holder" &&
            entry.address.kind === "stat" &&
            entry.address.stat === "criticalDamage",
        )
        .reduce((sum, entry) => sum + entry.value.value, 0),
    ).toBeCloseTo(0.48, 12)
  })

  it("does not grant the team effect to another team", () => {
    assertWilt(calculate(request(5, 20, { sameTeam: false })), 0)
  })

  it("coexists with the independent equipper impact state", () => {
    const result = calculate(
      request(5, 20, { impact: true, beneficiary: "1141", element: "ice" }),
    )
    // 装备者冲击 170 × 1.4；队友只有萎靡暴伤，冲击选项没有扩散。
    expect(result.factors.nonCritical.baseDamage).toBeCloseTo(
      1000 + 170 * 1.4,
      9,
    )
    expect(result.nonCritical).toBeCloseTo((1000 + 170 * 1.4) * 1.2, 9)
    expect(result.critical).toBeCloseTo((1000 + 170 * 1.4) * 1.2 * 1.98, 9)
    const impacts = [
      ...result.evaluation.contributions,
      ...(result.preparations ?? []).flatMap(
        (preparation) => preparation.contributions,
      ),
    ].filter(
      (entry) =>
        entry.origin.effectId === "w-engine:14116:nanoka:impact-after-assist",
    )
    expect(impacts.length).toBeGreaterThan(0)
    expect(
      impacts.every((entry) => entry.origin.beneficiaryId === "entity:holder"),
    ).toBe(true)
  })
})

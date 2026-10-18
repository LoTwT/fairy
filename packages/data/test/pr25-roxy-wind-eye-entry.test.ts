import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/index.ts"
import type {
  StaticActionCalculationInput,
  StaticDamageInput,
  StaticCatalogDamageInput,
} from "../../core/src/index.ts"
import type { MindscapeRank } from "@randomplay/shared"
import { makeRoxyMindscapeRequest } from "./fixtures/roxy-mindscape-consumer.ts"

const data = await loadStaticCalculationData({
  agents: ["1621", "1081"],
  wEngines: [],
})
const roxy = data.agents.find((a) => a.actions.entityId === "1621")!
const optionId = "nanoka:agents:1621:m6-giant-windstorm"
const effectId = "agent:1621:nanoka:m6-giant-windstorm"
const targetId = "zzz-hp:skill:roxy-giant-windstorm"
const selection = (slug = "m6-giant-windstorm", layers = 1) => ({
  optionId: `nanoka:agents:1621:${slug}`,
  bindingId: "binding:roxy" as const,
  layers,
})
const ids = ["0022", "0023", "0024"] as const
const resolve = (suffix: string, level = 12, rank: MindscapeRank = 6) => {
  const result = resolveAgentAction({
    agent: roxy.actions,
    actionId: `action:agent:1621:action:${suffix}`,
    mindscapeRank: rank,
    levels: { special: { mode: "effective", value: level } },
  })
  if (
    !result.ok ||
    result.calculation.kind !== "damage" ||
    result.skillCategory === null
  )
    throw new Error(JSON.stringify(result))
  return result
}
function request(
  suffix = "0024",
  level = 12,
  rank: MindscapeRank = 6,
): StaticCatalogDamageInput & {
  damage: Extract<StaticCatalogDamageInput["damage"], { kind: "regular" }>
} {
  const action = resolve(suffix, level, rank)
  if (action.calculation.kind !== "damage") throw new Error("not damage")
  const segment = action.calculation.segments[0]!
  const base = makeRoxyMindscapeRequest(data.definitions, data.catalog, rank)
  const items = segment.damageItems.map((item) => ({
    ...item,
    mode: "direct" as const,
    role: "base" as const,
    statSource: { entityId: "entity:roxy" as const },
  }))
  if (!items[0]) throw new Error("empty items")
  return {
    ...base,
    actorSources: [
      { entityId: "entity:roxy", agentEntityId: "1621", level: 60 },
      { entityId: "entity:other", agentEntityId: "1081", level: 60 },
    ],
    world: {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === "entity:roxy"
          ? {
              ...entity,
              directStats: {
                ...entity.directStats,
                penetrationRatio: { baseValue: 0.2, additions: [] },
              },
            }
          : entity,
      ),
    },
    hit: {
      ...base.hit,
      actionId: action.actionId,
      skillCategory: "special",
      skillTargetIds: action.skillTargetIds,
      element: segment.element,
      damageItems: [items[0], ...items.slice(1)],
    },
    damage: {
      ...base.damage,
      damageBonus: [0.3],
      defense: {
        ...base.damage.defense,
        targetBaseDefense: 1000,
        penetrationValues: [50],
      },
      damageTaken: {
        targetDamageTakenIncreases: [0.1],
        targetDamageTakenReductions: [],
      },
    },
  }
}
function calculate(input: StaticCatalogDamageInput) {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.expected).toBeGreaterThan(0)
  return result.value
}
// Source coefficients and the full numerical expectation are independent of the generated rule.
const coefficient = (suffix: string, level: number) =>
  suffix === "0024"
    ? (20840 + 1900 * (level - 1)) / 10000
    : (5210 + 480 * (level - 1)) / 10000
const nonCritical = (
  multiplier: number,
  bonus = 0.3,
  resistance = 0.7,
  stun = 1.5,
) =>
  1000 *
  multiplier *
  (1 + bonus) *
  (794 / (794 + 1000 * 0.8 - 50)) *
  resistance *
  1.1 *
  stun

describe("Roxy wind-eye original actions and M6 exact item scaling", () => {
  it("has a valid complete rule set", () =>
    expect(parseEffectRuleSet(data.definitions).ok).toBe(true))
  it.each(
    ids.flatMap((suffix) =>
      (
        [
          [0, 1],
          [0, 12],
          [6, 5],
          [6, 12],
          [6, 16],
        ] as const
      ).flatMap(([rank, level]) =>
        (
          [
            [0, 0.5],
            [0.25, 0.5],
            [1, 1.1],
          ] as const
        ).map(([cr, cd]) => ({ suffix, rank, level, cr, cd })),
      ),
    ),
  )(
    "$suffix M$rank L$level CR$cr CD$cd retains original multiplier and ordinary enemy factors",
    ({ suffix, rank, level, cr, cd }) => {
      const input = request(suffix, level, rank)
      const modified = {
        ...input,
        world: {
          ...input.world,
          entities: input.world.entities.map((entity) =>
            entity.kind === "actor" && entity.entityId === "entity:roxy"
              ? {
                  ...entity,
                  directStats: {
                    ...entity.directStats,
                    criticalRate: { baseValue: cr, additions: [] },
                    criticalDamage: { baseValue: cd, additions: [] },
                  },
                }
              : entity,
          ),
        },
      }
      const result = calculate(modified)
      const mult = coefficient(suffix, level)
      expect(result.nonCritical).toBeCloseTo(nonCritical(mult), 8)
      expect(result.critical).toBeCloseTo(nonCritical(mult) * (1 + cd), 8)
      expect(result.expected).toBeCloseTo(nonCritical(mult) * (1 + cr * cd), 8)
      const action = resolve(suffix, level, rank)
      expect(action.sourceDamageMultiplier).toBeCloseTo(mult, 12)
      expect(action.skillTargetIds).toEqual(suffix === "0024" ? [targetId] : [])
      expect(action.calculation).toMatchObject({
        kind: "damage",
        segments: [
          {
            damageKind: "regular",
            element: "wind",
            granularity: "aggregate",
            repeat: 1,
            damageItems: [
              {
                stat: "attack",
                itemId: `action:agent:1621:action:${suffix}:base`,
              },
            ],
          },
        ],
      })
    },
  )
  it.each([5, 12, 16])(
    "L%s applies exactly x2.5 independently of damage bonus and resistance",
    (level) => {
      const input = request("0024", level)
      const closed = calculate(input)
      const zero = calculate({
        ...input,
        selections: [selection(undefined, 0)],
      })
      const open = calculate({ ...input, selections: [selection()] })
      expect(zero.expected).toBe(closed.expected)
      expect(open.expected).toBeCloseTo(
        nonCritical(coefficient("0024", level) * 2.5) * 1.125,
        8,
      )
      expect(open.expected / closed.expected).toBeCloseTo(2.5, 12)
      expect(open.factors.nonCritical["damageBonus"]).toBe(1.3)
      expect(open.factors.nonCritical["resistance"]).toBe(0.7)
      const contributions = open.evaluation.contributions.filter(
        (c) => c.origin.effectId === effectId,
      )
      expect(contributions).toHaveLength(1)
      expect(contributions[0]).toMatchObject({
        origin: {
          bindingId: "binding:roxy" as const,
          beneficiaryId: "entity:roxy",
        },
        value: { value: 2.5 },
      })
    },
  )
  it("scales only the giant in a legal special/wind mixed request", () => {
    const input = request()
    const items = ids.flatMap((suffix) => request(suffix).hit.damageItems)
    const result = calculate({
      ...input,
      hit: { ...input.hit, damageItems: [items[0]!, ...items.slice(1)] },
      selections: [selection()],
    })
    expect(result.nonCritical).toBeCloseTo(
      nonCritical(1.049 + 1.049 + 10.435),
      8,
    )
    expect(result.expected).toBeCloseTo(nonCritical(12.533) * 1.125, 8)
  })
  it.each(ids.slice(0, 2))(
    "%s stays unchanged at zero and rejects enabling without the giant item",
    (suffix) => {
      const input = request(suffix)
      expect(
        calculate({ ...input, selections: [selection(undefined, 0)] }).expected,
      ).toBe(calculate(input).expected)
      const result = calculateStaticDamageFromCatalog({
        ...input,
        selections: [selection()],
      })
      expect(result).toMatchObject({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "MISSING_REFERENCE" }),
        ]),
      })
    },
  )
  it.each([
    { skillTargetIds: [] },
    { skillTargetIds: ["zzz-hp:skill:roxy-requiem-for-the-night-burial"] },
  ])("does not scale with unmatched target %j", ({ skillTargetIds }) => {
    const input = request()
    const result = calculate({
      ...input,
      hit: { ...input.hit, skillTargetIds },
      selections: [selection()],
    })
    expect(result.expected).toBe(calculate(input).expected)
    expect(
      result.evaluation.contributions.filter(
        (c) => c.origin.effectId === effectId,
      ),
    ).toEqual([])
  })
  it.each([
    [
      "M5 cultivation",
      (i: any) => {
        i.bindings[0].configuration.mindscapeRank = 5
      },
    ],
    [
      "negative layers",
      (i: any) => {
        i.selections[0].layers = -1
      },
    ],
    [
      "fraction layers",
      (i: any) => {
        i.selections[0].layers = 0.5
      },
    ],
    [
      "two layers",
      (i: any) => {
        i.selections[0].layers = 2
      },
    ],
    [
      "NaN layers",
      (i: any) => {
        i.selections[0].layers = NaN
      },
    ],
    [
      "duplicate selection",
      (i: any) => {
        i.selections.push({ ...i.selections[0] })
      },
    ],
    [
      "missing binding",
      (i: any) => {
        i.selections[0].bindingId = "binding:missing"
      },
    ],
    [
      "wrong binding identity",
      (i: any) => {
        i.bindings[0].sourceEntityId = "1081"
      },
    ],
    [
      "wrong actor",
      (i: any) => {
        i.hit.actorId = "entity:other"
      },
    ],
    [
      "wrong current provider",
      (i: any) => {
        i.hit.damageItems[0].statSource.entityId = "entity:other"
      },
    ],
    [
      "wrong item",
      (i: any) => {
        i.hit.damageItems[0].itemId = "other-item"
      },
    ],
    [
      "wrong stat",
      (i: any) => {
        i.hit.damageItems[0].stat = "impact"
      },
    ],
    [
      "unknown target",
      (i: any) => {
        i.hit.skillTargetIds = ["zzz-hp:skill:missing"]
      },
    ],
  ] as const)(
    "rejects %s without returning an invented zero",
    (_label, mutate) => {
      const input = structuredClone({ ...request(), selections: [selection()] })
      mutate(input)
      expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
    },
  )
  it("isolates two Roxy bindings and rejects a mismatched item's holder", () => {
    const input = request()
    const second = {
      ...input.bindings[0]!,
      bindingId: "binding:second" as const,
      holderId: "entity:other" as const,
    }
    const both = {
      ...input,
      bindings: [...input.bindings, second],
      actorSources: [
        input.actorSources[0]!,
        { entityId: "entity:other" as const, agentEntityId: "1621", level: 60 },
      ],
    }
    expect(
      calculate({ ...both, selections: [selection()] }).expected,
    ).toBeCloseTo(calculate(input).expected * 2.5, 8)
    expect(
      calculateStaticDamageFromCatalog({
        ...both,
        selections: [{ ...selection(), bindingId: "binding:second" }],
      }).ok,
    ).toBe(false)
    const own = {
      ...both,
      hit: {
        ...both.hit,
        actorId: "entity:other" as const,
        damageItems: [
          {
            ...both.hit.damageItems[0]!,
            statSource: { entityId: "entity:other" as const },
          },
        ] as const,
      },
    }
    const off = calculate(own)
    const on = calculate({
      ...own,
      selections: [{ ...selection(), bindingId: "binding:second" }],
    })
    expect(on.expected / off.expected).toBeCloseTo(2.5, 12)
  })
  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    "combination mask %s preserves independent M6 scale, ignore and PR24 level bonus",
    (mask) => {
      const input = request()
      const slugs = [
        "m6-giant-windstorm",
        "m6-wind-resistance-ignore",
        "additional-level-damage",
      ]
      const enabled = slugs.filter((_, index) => mask & (1 << index))
      const result = calculate({
        ...input,
        selections: enabled.map((slug) => selection(slug)),
      })
      expect(result.expected).toBeCloseTo(
        nonCritical(
          4.174 * (mask & 1 ? 2.5 : 1),
          0.3 + (mask & 4 ? 0.8 : 0),
          mask & 2 ? 0.85 : 0.7,
        ) * 1.125,
        8,
      )
      for (const slug of slugs)
        expect(
          result.evaluation.contributions.some(
            (c) => c.origin.effectId === `agent:1621:nanoka:${slug}`,
          ),
        ).toBe(enabled.includes(slug))
    },
  )
  it("combines M2 and PR24 team stun additions with giant scaling", () => {
    const input = request()
    const result = calculate({
      ...input,
      selections: [
        selection(),
        selection("m2-stun-damage"),
        selection("additional-hit-stun-damage"),
      ],
    })
    expect(result.factors.nonCritical["stunDamage"]).toBeCloseTo(2.1, 12)
    expect(result.expected).toBeCloseTo(
      nonCritical(10.435, 0.3, 0.7, 2.1) * 1.125,
      8,
    )
  })
  it("preserves the old M6 provider boundary on the newly opened giant", () => {
    const input = request()
    const foreign: StaticCatalogDamageInput = {
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          {
            ...input.hit.damageItems[0]!,
            statSource: { entityId: "entity:other" },
          },
        ],
      },
    }
    expect(
      calculate({
        ...foreign,
        selections: [selection("m6-wind-resistance-ignore")],
      }).expected,
    ).toBe(calculate(foreign).expected)
    const mixed: StaticCatalogDamageInput = {
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          input.hit.damageItems[0]!,
          {
            ...request("0023").hit.damageItems[0]!,
            statSource: { entityId: "entity:other" },
          },
        ],
      },
      selections: [selection()],
    }
    expect(calculate(mixed).expected).toBeCloseTo(
      nonCritical(10.435 + 1.049 * 1.7) * 1.125,
      8,
    )
    const rejected = calculateStaticDamageFromCatalog({
      ...mixed,
      selections: [selection(), selection("m6-wind-resistance-ignore")],
    })
    expect(rejected).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "CONTEXT_MISMATCH",
          effectId: "agent:1621:nanoka:m6-wind-resistance-ignore",
        }),
      ]),
    })
  })
  it("keeps the old M6 same-owner historical snapshot positive without enabling new scaling", () => {
    const input = request()
    const historical: StaticCatalogDamageInput = {
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          {
            ...input.hit.damageItems[0]!,
            statSource: {
              entityId: "entity:roxy",
              snapshotId: "snapshot:history",
            },
          },
        ],
      },
      snapshots: [
        {
          snapshotId: "snapshot:history",
          atSeconds: 0,
          world: input.world,
          attributes: [
            {
              entityId: "entity:roxy",
              stat: "attack",
              stage: "current",
              value: { unit: "attack-points", value: 1300 },
            },
          ],
        },
      ],
    }
    const closed = calculate(historical)
    const selected = calculate({
      ...historical,
      selections: [selection("m6-wind-resistance-ignore")],
    })
    expect(closed.nonCritical).toBeCloseTo(nonCritical(4.174) * 1.3, 8)
    expect(selected.expected / closed.expected).toBeCloseTo(0.85 / 0.7, 12)
    expect(
      selected.evaluation.contributions.some(
        (c) => c.origin.effectId === effectId,
      ),
    ).toBe(false)
    expect(
      calculateStaticDamageFromCatalog({
        ...historical,
        selections: [selection()],
      }).ok,
    ).toBe(false)
  })
  it.each(ids)(
    "%s uses the existing ordinary special bonus contract without gaining enhanced-special targets",
    (suffix) => {
      const input = request(suffix)
      // A controlled, valid supplied rule exercises the unchanged public category contract.
      const specialRule = {
        kind: "contribution" as const,
        effectId: "agent:1621:fixture:special-bonus" as const,
        source: {
          identity: { kind: "agent" as const, entityId: "1621" },
          section: "controlled ordinary special bonus",
          references: [
            {
              sourceId: "fixture",
              version: "1",
              locale: "zh",
              resourcePath: "pr25-roxy-wind-eye-entry.test.ts",
              pointer: "/controlled-special-bonus",
            },
          ] as const,
        },
        config: { kind: "constant" as const, value: true },
        parameters: {},
        activation: {
          kind: "supplied" as const,
          maximumLayers: {
            kind: "literal" as const,
            unit: "count" as const,
            value: 1,
          },
        },
        scope: "hit" as const,
        beneficiary: { kind: "holder" as const },
        when: {
          kind: "one-of" as const,
          fact: "hit.skillCategory" as const,
          values: ["special"] as const,
        },
        operation: {
          kind: "factor-contribution" as const,
          channel: "damage-bonus" as const,
          value: {
            kind: "literal" as const,
            unit: "ratio" as const,
            value: 0.2,
          },
        },
      }
      const definitions = {
        ...data.definitions,
        effects: [...data.definitions.effects, specialRule],
      }
      expect(parseEffectRuleSet(definitions).ok).toBe(true)
      const item = input.hit.damageItems[0]!
      if (item.mode !== "direct") throw new Error("direct item required")
      const low: StaticDamageInput = {
        definitions,
        bindings: input.bindings,
        world: input.world,
        damage: input.damage,
        hit: {
          actorId: input.hit.actorId,
          targetId: input.hit.targetId,
          actionId: input.hit.actionId,
          skillCategory: input.hit.skillCategory,
          element: input.hit.element,
          damageItems: [
            {
              itemId: item.itemId,
              stat: item.stat,
              statSource: item.statSource,
              damageMultiplier: item.damageMultiplier,
            },
          ],
        },
        selections: [
          {
            effectId: specialRule.effectId,
            bindingId: "binding:roxy",
            layers: 1,
          },
        ],
      }
      const result = calculateStaticDamage(low)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.value.expected).toBeCloseTo(
        nonCritical(coefficient(suffix, 12), 0.5) * 1.125,
        8,
      )
      expect(resolve(suffix).skillTargetIds).not.toContain(
        "zzz-hp:skill:all-special-ms0fcqv7",
      )
    },
  )
  it.each(ids)("%s never receives the old M4 ultimate bonus", (suffix) => {
    const input = request(suffix)
    expect(
      calculate({ ...input, selections: [selection("m4-ultimate-damage")] })
        .expected,
    ).toBe(calculate(input).expected)
  })
  it("keeps low-level supplied layers strictly positive and permits explicit L1 original scaling", () => {
    const input = request()
    const item = input.hit.damageItems[0]!
    const low: StaticDamageInput = {
      definitions: input.definitions,
      bindings: input.bindings,
      world: input.world,
      hit: {
        actorId: input.hit.actorId,
        actionId: input.hit.actionId,
        targetId: input.hit.targetId,
        skillCategory: input.hit.skillCategory,
        element: input.hit.element,
        skillTags: [targetId],
        damageItems: [
          {
            itemId: item.itemId,
            stat: "attack" as const,
            statSource: item.statSource,
            damageMultiplier: 2.084,
          },
        ] as const,
      },
      damage: input.damage,
      selections: [{ effectId, bindingId: "binding:roxy" as const, layers: 1 }],
    }
    const result = calculateStaticDamage(low)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error("low level failed")
    expect(result.value.expected).toBeCloseTo(nonCritical(5.21) * 1.125, 8)
    expect(
      calculateStaticDamage({
        ...low,
        selections: [
          { effectId, bindingId: "binding:roxy" as const, layers: 0 },
        ],
      }).ok,
    ).toBe(false)
  })
  it.each(
    ids.flatMap((suffix) =>
      ([0, 6] as const).map((rank) => ({ suffix, rank })),
    ),
  )(
    "full action entry $suffix M$rank uses legal final L12",
    ({ suffix, rank }) => {
      const input: StaticActionCalculationInput = {
        data,
        actors: [
          {
            entityId: "entity:roxy",
            teamId: "team:players",
            agentEntityId: "1621",
            coreSkillLevel: 7,
            mindscapeRank: rank,
            wEngine: null,
            driveDiscs: {
              1: null,
              2: null,
              3: null,
              4: null,
              5: null,
              6: null,
            },
            panel: { mode: "equipment" },
          },
        ],
        actorId: "entity:roxy",
        action: resolve(suffix, 12, rank),
        target: {
          entityId: "entity:enemy",
          teamId: "team:enemies",
          baseDefense: 1000,
          resistances: {
            "physical": 0.1,
            "fire": 0.2,
            "ice": 0.2,
            "electric": 0.2,
            "ether": 0.2,
            "auric-ink": 0.2,
            "wind": 0.3,
            "frost": 0.2,
            "lumiflux": 0.2,
          },
          isStunned: true,
          baseStunDamageMultiplier: 1.5,
        },
        selections: [],
      }
      const off = calculateStaticActionDamage(input)
      expect(off.ok, JSON.stringify(off)).toBe(true)
      if (!off.ok || off.value.kind !== "damage")
        throw new Error("full action failed")
      expect(off.value.totals.expected).toBeGreaterThan(0)
      expect(off.value.totals.displayedNonCritical).toBeNull()
      if (rank === 6 && suffix === "0024") {
        const on = calculateStaticActionDamage({
          ...input,
          selections: [{ holderId: "entity:roxy", optionId, layers: 1 }],
        })
        if (!on.ok || on.value.kind !== "damage")
          throw new Error(JSON.stringify(on))
        expect(
          on.value.totals.expected / off.value.totals.expected,
        ).toBeCloseTo(2.5, 12)
      }
      expect(
        calculateStaticActionDamage({ ...input, requireIndividualHits: true })
          .ok,
      ).toBe(false)
    },
  )
  it("rejects an illegal M6 effective L1 instead of treating it as a capability gap", () =>
    expect(() => resolve("0024", 1, 6)).toThrow())
})

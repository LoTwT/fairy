import { describe, expect, it } from "vitest"
import {
  advanceEffects,
  calculateStaticDamage,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../src/index.ts"
import type {
  ContributionRule,
  EffectNumericInput,
  FactorChannel,
  IssueCode,
  Result,
  StaticDamageInput,
  StaticDamageParameters,
} from "../src/index.ts"
import {
  definitions,
  general,
  inputFor,
  literal,
  rule,
} from "./static-fixtures.ts"

function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function issue(
  result: Result<unknown>,
  code: IssueCode,
  pointer?: string,
): void {
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(
    result.issues.some(
      (entry) =>
        entry.code === code &&
        (pointer === undefined || entry.pointer === pointer),
    ),
  ).toBe(true)
}
function factor(channel: FactorChannel, value: number): ContributionRule {
  const unit =
    channel === "attacker-penetration-value"
      ? "defense-points"
      : channel === "stun-damage-adjustment" ||
          channel.startsWith("luminize-multiplier")
        ? "multiplier"
        : "ratio"
  return rule(channel, {
    kind: "factor-contribution",
    channel,
    value: literal(unit, value),
  } as ContributionRule["operation"])
}

const anomalyDamage = (
  kind: "anomaly" | "disorder" | "vortex" | "anomaly-settlement" | "luminize",
): StaticDamageParameters => {
  const common = inputFor().damage
  if (common.kind !== "regular") throw new Error("regular")
  const base = {
    ...common,
    kind,
    anomalyDamageBonus: [],
    refringe: {
      remielleAnomalyProficiency: 100,
      refringeCoefficientIncreases: [],
    },
  }
  return kind === "luminize"
    ? {
        ...base,
        kind,
        luminizeMultiplier: {
          baseLuminizeMultiplier: 2,
          remielleAnomalyProficiency: 100,
          anomalyProficiencyConversionRate: 0.001,
          multiplicativeLuminizeMultiplierAdjustments: [],
        },
      }
    : { ...base, kind, anomalyCriticalRate: 0.4, anomalyCriticalDamage: [0.5] }
}

describe("static damage integrates existing core formulas", () => {
  it("returns final damage and factors with no implicit enemy defaults", () => {
    const result = ok(calculateStaticDamage(inputFor()))
    const expectedBase = (2000 * 794) / 1694
    expect(result.nonCritical).toBeCloseTo(expectedBase, 10)
    expect(result.critical).toBeCloseTo(expectedBase * 1.5, 10)
    expect(result.expected).toBeCloseTo(expectedBase * 1.125, 10)
    expect(result.factors.nonCritical["baseDamage"]).toBe(2000)
    expect(result.notApplicableContributions).toEqual([])
  })

  it("maps defense, flat penetration, resistance, vulnerability and stun contributions", () => {
    const effects = [
      factor("damage-bonus", 0.2),
      factor("target-defense-adjustment", -0.2),
      factor("attacker-penetration-value", 100),
      factor("target-resistance-reduction", 0.1),
      factor("attacker-resistance-ignore", 0.05),
      factor("damage-taken-increase", 0.25),
      factor("damage-taken-reduction", 0.05),
      factor("stun-damage-adjustment", 0.3),
      factor("energy-generation-rate", 0.2),
    ]
    const input = inputFor(effects)
    const result = ok(
      calculateStaticDamage({
        ...input,
        damage: {
          ...input.damage,
          resistance: { ...input.damage.resistance, targetResistance: 0.2 },
          stunDamage: {
            ...input.damage.stunDamage,
            isTargetStunned: true,
            targetBaseStunDamageMultiplier: 1.5,
          },
        },
      }),
    )
    expect(result.nonCritical).toBeCloseTo(
      ((2000 * 1.2 * 794) / 1414) * 0.95 * 1.2 * 1.8,
      10,
    )
    expect(
      result.notApplicableContributions.map((entry) => entry.origin.effectId),
    ).toEqual(["environment:static:energy-generation-rate"])
    expect(
      result.evaluation.contributions.find((entry) =>
        entry.origin.effectId.endsWith("penetration-value"),
      )?.value.unit,
    ).toBe("defense-points")
  })

  it("applies add before scale and keeps adjustments on their designated base damage items", () => {
    const effects = [
      rule("add", {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: ["attack"],
        value: literal("multiplier", 0.5),
      }),
      rule("scale", {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        value: literal("multiplier", 1.2),
      }),
    ]
    const input = inputFor(effects)
    const result = ok(
      calculateStaticDamage({
        ...input,
        hit: {
          ...input.hit,
          damageItems: [
            ...input.hit.damageItems,
            { itemId: "health", damageMultiplier: 0.1, stat: "health" },
          ],
        },
      }),
    )
    expect(
      result.evaluation.hit?.damageItems.map((item) => item.damageMultiplier),
    ).toEqual([3, 0.12])
    expect(result.evaluation.contributions).toHaveLength(3)
    expect(result.factors.nonCritical["baseDamage"]).toBe(5880)
  })

  it("selects one unique multiplier where global and item-specific adjustments overlap", () => {
    const global = {
      ...rule("global", {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        value: literal("multiplier", 1.2),
      }),
      uniqueness: {
        key: "multiplier",
        scope: "global",
        select: { kind: "highest-value" },
      },
    } as const
    const specific = {
      ...global,
      effectId: "environment:static:specific",
      operation: {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        itemIds: ["attack"],
        value: literal("multiplier", 1.5),
      },
    } as const
    const input = inputFor([global, specific])
    const result = ok(
      calculateStaticDamage({
        ...input,
        hit: {
          ...input.hit,
          damageItems: [
            ...input.hit.damageItems,
            { itemId: "health", damageMultiplier: 0.1, stat: "health" },
          ],
        },
      }),
    )
    expect(
      result.evaluation.hit?.damageItems.map((item) => item.damageMultiplier),
    ).toEqual([3, 0.12])
    expect(result.evaluation.contributions).toHaveLength(2)
  })

  it("rejects incompatible reduction operators within one unique multiplier group", () => {
    const effects = (["add", "scale"] as const).map((operator) => ({
      ...rule(operator, {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator,
        value: literal("multiplier", 1.2),
      }),
      uniqueness: {
        key: "incompatible-multiplier",
        scope: "global",
        select: { kind: "highest-value" },
      } as const,
    }))
    issue(calculateStaticDamage(inputFor(effects)), "UNIQUENESS_CONFLICT")
  })

  it("rejects a selected adjustment that names a missing base damage item", () => {
    const effect = rule("missing-item", {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["typo"],
      value: literal("multiplier", 1),
    })
    issue(
      calculateStaticDamage(inputFor([effect])),
      "MISSING_REFERENCE",
      "/hit/damageItems",
    )
  })

  it("calculates sheer damage without reading unused penetration or attack", () => {
    const input = inputFor([factor("sheer-damage-bonus", 0.4)])
    const actor = input.world.entities[0]!
    if (actor.kind !== "actor") throw new Error("actor")
    const result = ok(
      calculateStaticDamage({
        ...input,
        world: {
          ...input.world,
          entities: [
            {
              ...actor,
              generalStats: { sheerForce: general(500) },
              directStats: {
                criticalRate: actor.directStats.criticalRate!,
                criticalDamage: actor.directStats.criticalDamage!,
              },
            },
            input.world.entities[1]!,
          ],
        },
        hit: {
          ...input.hit,
          damageItems: [
            { itemId: "sheer", stat: "sheerForce", damageMultiplier: 2 },
          ],
        },
        damage: {
          kind: "sheer",
          damageBonus: [],
          resistance: input.damage.resistance,
          damageTaken: input.damage.damageTaken,
          stunDamage: input.damage.stunDamage,
          sheerDamageBonus: [],
        },
      }),
    )
    expect(result.nonCritical).toBe(1400)
    expect(result.expected).toBe(1575)
  })

  it.each(["anomaly", "disorder", "vortex", "anomaly-settlement"] as const)(
    "calculates %s through the core anomaly formula",
    (kind) => {
      const input = inputFor([
        factor("damage-bonus", 0.2),
        factor("anomaly-damage-bonus", 0.4),
        factor("anomaly-critical-rate", 0.2),
        factor("anomaly-critical-damage", 0.3),
        factor("refringe-coefficient-increase", 0.1),
      ])
      const result = ok(
        calculateStaticDamage({ ...input, damage: anomalyDamage(kind) }),
      )
      const base = ((2000 * 1.2 * 3 * 794) / 1694) * 2 * 1.4 * 1.12
      expect(result.nonCritical).toBeCloseTo(base, 10)
      expect(result.critical).toBeCloseTo(base * 1.8, 10)
      expect(result.expected).toBeCloseTo(base * 1.48, 10)
    },
  )
  it("maps luminize addition and multiplication and reports its lack of a critical branch", () => {
    const input = inputFor([
      factor("luminize-multiplier-addition", 0.5),
      factor("luminize-multiplier-scale", 1.3),
    ])
    const result = ok(
      calculateStaticDamage({ ...input, damage: anomalyDamage("luminize") }),
    )
    expect(result.factors.nonCritical["luminizeMultiplier"]).toBeCloseTo(
      3.38,
      12,
    )
    expect(result.nonCritical).toBeCloseTo(
      ((2000 * 3 * 794) / 1694) * 2 * 1.02 * 3.38,
      10,
    )
    expect(result.critical).toBeNull()
    expect(result.expected).toBe(result.nonCritical)
  })
  it("preserves an explicitly settled damage bonus instead of adding current buffs twice", () => {
    const input = inputFor([factor("damage-bonus", 0.2)])
    const damage = anomalyDamage("luminize")
    if (damage.kind !== "luminize") throw new Error("luminize")
    const result = ok(
      calculateStaticDamage({
        ...input,
        damage: { ...damage, damageBonus: { settledMultiplier: 2.5 } },
      }),
    )
    expect(result.factors.nonCritical["damageBonus"]).toBe(2.5)
    expect(
      result.notApplicableContributions.map((entry) => entry.origin.effectId),
    ).toEqual(["environment:static:damage-bonus"])
  })
})

describe("partial cultivation tables", () => {
  function rankInput(
    values: Record<number, number> = { 7: 0.2 },
  ): StaticDamageInput {
    const effect: ContributionRule = {
      ...factor("damage-bonus", 0),
      source: {
        ...rule("source", {
          kind: "factor-contribution",
          channel: "damage-bonus",
          value: literal("ratio", 0),
        }).source,
        identity: { kind: "agent", entityId: "rank-test" },
      },
      parameters: {
        bonus: {
          kind: "by-rank",
          rank: "coreSkillLevel",
          unit: "ratio",
          values,
        },
      },
      operation: {
        kind: "factor-contribution",
        channel: "damage-bonus",
        value: { kind: "parameter", unit: "ratio", name: "bonus" },
      },
    }
    const input = inputFor([effect])
    return {
      ...input,
      bindings: [
        {
          kind: "agent",
          sourceEntityId: "rank-test",
          bindingId: "binding:static",
          holderId: "entity:attacker",
          eligible: true,
          configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
        },
      ],
    }
  }
  it("selects a known tier and preserves a confirmed zero", () => {
    expect(
      ok(calculateStaticDamage(rankInput())).factors.nonCritical["damageBonus"],
    ).toBe(1.2)
    expect(
      ok(calculateStaticDamage(rankInput({ 7: 0 }))).factors.nonCritical[
        "damageBonus"
      ],
    ).toBe(1)
  })
  it("rejects missing selected tiers with an exact parameter pointer, without throwing", () => {
    const result = calculateStaticDamage(rankInput({ 6: 0.1 }))
    issue(result, "MISSING_RANK", "/effects/0/parameters/bonus/values/7")
  })
  it.each([{}, { 8: 0.1 }, { 7: Infinity }, { 7: null }])(
    "rejects invalid rank tables: %j",
    (values) => {
      issue(
        calculateStaticDamage(rankInput(values as Record<number, number>)),
        "INVALID_DEFINITION",
      )
    },
  )
  it("does not demand the tiers of disabled supplied rules", () => {
    const input = rankInput({ 6: 0.1 })
    expect(calculateStaticDamage({ ...input, selections: [] }).ok).toBe(true)
    const inactive = {
      ...input.definitions.effects[0]!,
      config: { kind: "constant", value: false },
    } as ContributionRule
    expect(prepareEffects(definitions([inactive]), input.bindings).ok).toBe(
      true,
    )
    issue(
      calculateStaticDamage({ ...input, definitions: definitions([inactive]) }),
      "CONTEXT_MISMATCH",
    )
  })
})

describe("static facts, selection and dependency boundaries", () => {
  it("filters by element, damage kind, category, tag and target state", () => {
    const effect = {
      ...factor("damage-bonus", 0.3),
      when: {
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.element", values: ["fire"] },
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          { kind: "one-of", fact: "hit.skillCategory", values: ["basic"] },
          { kind: "one-of", fact: "hit.skillTag", values: ["finisher"] },
          { kind: "one-of", fact: "hit.targetState", values: ["not-stunned"] },
        ],
      },
    } as const
    const input = inputFor([effect])
    expect(
      ok(
        calculateStaticDamage({
          ...input,
          hit: { ...input.hit, skillTags: ["finisher"] },
        }),
      ).factors.nonCritical["damageBonus"],
    ).toBe(1.3)
    expect(
      ok(calculateStaticDamage(input)).factors.nonCritical["damageBonus"],
    ).toBe(1)
    const { skillTags: _, ...hit } = input.hit
    issue(
      calculateStaticDamage({ ...input, hit }),
      "MISSING_FACT",
      "/hit/skillTag",
    )
  })
  it("requires explicit manual values and checks units and binding-local identities", () => {
    const effect = rule("manual", {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "convert",
        unit: "ratio",
        input: {
          kind: "input",
          name: "activationImpact",
          unit: "impact-points",
        },
        rate: literal("multiplier", 0.001),
      },
    })
    const input = inputFor([effect])
    issue(calculateStaticDamage(input), "MISSING_FACT")
    const value: EffectNumericInput = {
      bindingId: "binding:static",
      name: "activationImpact",
      value: { unit: "impact-points", value: 200 },
    }
    expect(
      ok(calculateStaticDamage({ ...input, inputs: [value] })).factors
        .nonCritical["damageBonus"],
    ).toBe(1.2)
    issue(
      calculateStaticDamage({ ...input, inputs: [value, value] }),
      "DUPLICATE_ID",
      "/inputs/1",
    )
    issue(
      calculateStaticDamage({
        ...input,
        inputs: [{ ...value, value: { unit: "attack-points", value: 200 } }],
      }),
      "UNIT_MISMATCH",
    )
    issue(
      calculateStaticDamage({
        ...input,
        inputs: [{ ...value, bindingId: "binding:absent" }],
      }),
      "MISSING_REFERENCE",
    )
  })
  it("retains cross-stat dependency cycles instead of reading an old panel", () => {
    const attack = {
      ...rule("attack", {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: {
          kind: "convert",
          unit: "attack-points",
          input: {
            kind: "stat",
            unit: "health-points",
            stat: "health",
            stage: "current",
            at: "evaluation",
            entity: { role: "holder" },
          },
          rate: literal("multiplier", 0.02),
        },
      }),
      scope: "entity",
    } as ContributionRule
    const health = {
      ...rule("health", {
        kind: "stat-adjustment",
        stat: "health",
        stage: "final-fixed",
        value: {
          kind: "convert",
          unit: "health-points",
          input: {
            kind: "stat",
            unit: "attack-points",
            stat: "attack",
            stage: "current",
            at: "evaluation",
            entity: { role: "holder" },
          },
          rate: literal("multiplier", 2),
        },
      }),
      scope: "entity",
    } as ContributionRule
    issue(calculateStaticDamage(inputFor([attack, health])), "DEPENDENCY_CYCLE")
  })
  it("enforces layer limits and mutually exclusive choices without a timeline", () => {
    const effect = {
      ...factor("damage-bonus", 0.1),
      activation: {
        kind: "supplied",
        maximumLayers: literal("count", 2),
        exclusiveGroup: "stance",
      },
    } as const
    const other = { ...effect, effectId: "environment:static:other" } as const
    const input = inputFor([effect])
    expect(
      ok(
        calculateStaticDamage({
          ...input,
          selections: [{ ...input.selections[0]!, layers: 2 }],
        }),
      ).factors.nonCritical["damageBonus"],
    ).toBe(1.2)
    issue(
      calculateStaticDamage({
        ...input,
        selections: [{ ...input.selections[0]!, layers: 3 }],
      }),
      "INVALID_INPUT",
      "/selections/0/layers",
    )
    issue(
      calculateStaticDamage(inputFor([effect, other])),
      "UNIQUENESS_CONFLICT",
    )
  })
  it("reports missing action snapshots and never substitutes the current panel", () => {
    const effect = rule("snapshot", {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "stat",
        unit: "attack-points",
        stat: "attack",
        stage: "current",
        at: "action-start",
        entity: { role: "holder" },
      },
    })
    issue(calculateStaticDamage(inputFor([effect])), "MISSING_SNAPSHOT")
  })
  it.each(["add", "scale"] as const)(
    "rejects invalid final hit multipliers from %s",
    (operator) => {
      const effect = rule("bad-multiplier", {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator,
        value: literal("multiplier", -3),
      })
      issue(calculateStaticDamage(inputFor([effect])), "INVALID_DEFINITION")
    },
  )
  it("rejects conversions with mismatched source units or invalid phases", () => {
    const effect = rule("bad-units", {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "convert",
        unit: "ratio",
        input: {
          kind: "stat",
          stat: "attack",
          unit: "health-points",
          entity: { role: "holder" },
          stage: "current",
          at: "evaluation",
        },
        rate: literal("multiplier", 0.1),
      },
    } as never)
    issue(parseEffectRuleSet(definitions([effect])), "UNIT_MISMATCH")
    issue(
      parseEffectRuleSet(
        definitions([
          {
            ...effect,
            config: {
              kind: "compare-number",
              unit: "ratio",
              operator: "gt",
              left: { kind: "input", unit: "ratio", name: "no" },
              right: literal("ratio", 0),
            },
          } as never,
        ]),
      ),
      "INVALID_PHASE",
    )
  })
  it("does not mutate or accumulate across static calls", () => {
    const input = inputFor([factor("damage-bonus", 0.2)])
    const before = structuredClone(input)
    const first = calculateStaticDamage(input)
    expect(calculateStaticDamage(input)).toEqual(first)
    expect(input).toEqual(before)
    expect(
      ok(calculateStaticDamage({ ...input, selections: [] })).factors
        .nonCritical["damageBonus"],
    ).toBe(1)
  })
  it.each([
    null,
    [],
    { ...inputFor(), damage: {} },
    { ...inputFor(), atSeconds: -1 },
    { ...inputFor(), selections: [null] },
    { ...inputFor(), snapshots: null },
    { ...inputFor(), inputs: [null] },
  ])("returns issues for malformed static input", (input) => {
    expect(calculateStaticDamage(input as StaticDamageInput).ok).toBe(false)
  })
  it("rejects unknown core adapter fields and invalid core values", () => {
    const input = inputFor()
    issue(
      calculateStaticDamage({
        ...input,
        damage: {
          ...input.damage,
          defense: {
            attackerLevel: 60,
            targetBaseDefense: 1000,
            defensePercentageAdjustments: [],
            penetrationValues: [],
            misspelled: 1,
          },
        } as never,
      }),
      "INVALID_INPUT",
      "/damage/defense/misspelled",
    )
    issue(
      calculateStaticDamage({
        ...input,
        damage: { ...input.damage, damageBonus: [Infinity] },
      }),
      "INVALID_INPUT",
    )
  })
  it("keeps the low-level API backward compatible and allows explicit additional hit attributes", () => {
    const input = inputFor()
    const prepared = ok(prepareEffects(input.definitions, input.bindings))
    const state = ok(
      supplyEffectState(prepared, {
        sessionId: "session:test",
        atSeconds: 0,
        instances: [],
        snapshots: [],
        cooldowns: [],
        eventHistory: { processedIds: [], last: null },
      }),
    )
    const result = ok(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 0,
        world: input.world,
        observedSnapshots: [],
        hit: {
          ...input.hit,
          hitId: "hit:test",
          actionInstanceId: "action-instance:test",
          actionSnapshotId: "snapshot:test",
          origin: { kind: "direct" },
        },
        stats: ["criticalDamage"],
      }),
    )
    expect(
      result.attributes.find((attribute) => attribute.stat === "criticalDamage")
        ?.value.value,
    ).toBe(0.5)
  })
  it("supports conversion in trigger expressions while preserving the event interface", () => {
    const input = inputFor()
    const contribution = factor("damage-bonus", 0)
    const prepared = ok(
      prepareEffects(
        definitions([
          {
            kind: "instant",
            effectId: "environment:static:converted-energy",
            source: contribution.source,
            config: contribution.config,
            parameters: {},
            beneficiary: { kind: "holder" },
            trigger: {
              eventKinds: ["energy-spent"],
              when: { kind: "constant", value: true },
            },
            operation: {
              kind: "resource-generation",
              resource: "energy",
              amount: {
                kind: "convert",
                unit: "energy-points",
                input: {
                  kind: "stat",
                  unit: "health-points",
                  entity: { role: "holder" },
                  stat: "health",
                  stage: "initial",
                  at: "before-event",
                },
                rate: literal("multiplier", 0.001),
              },
            },
          },
        ]),
        input.bindings,
      ),
    )
    const state = ok(
      supplyEffectState(prepared, {
        sessionId: "session:converted",
        atSeconds: 0,
        instances: [],
        snapshots: [],
        cooldowns: [],
        eventHistory: { processedIds: [], last: null },
      }),
    )
    const result = ok(
      advanceEffects(prepared, state, {
        event: {
          eventId: "event:converted",
          kind: "energy-spent",
          actorId: "entity:attacker",
          energySpent: 1,
          atSeconds: 0,
          sequence: 0,
        },
        before: input.world,
        after: input.world,
        observedSnapshots: [],
      }),
    )
    expect(result.requests).toMatchObject([
      {
        kind: "resource-generation",
        baseAmount: { value: 24, unit: "energy-points" },
      },
    ])
  })
})

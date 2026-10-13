import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../../src/effects/index.ts"
import type {
  ContributionRule,
  HitContext,
  IssueCode,
  Result,
  RuleSet,
  StaticDamageInput,
} from "../../src/effects/index.ts"
import {
  always,
  definitions,
  inputFor,
  literal,
  rule,
} from "./static-fixtures.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const guarantee = () =>
  rule("guarantee", { kind: "guaranteed-critical", itemId: "attack" })
const rateAdjustment = (
  scope: "entity" | "hit",
  value = 0.1,
): ContributionRule =>
  ({
    ...rule(`rate-${scope}`, {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: literal("ratio", value),
    }),
    scope,
  }) as ContributionRule
const missingRate = () =>
  ({
    kind: "stat",
    unit: "ratio",
    entity: { role: "holder" },
    stat: "criticalRate",
    stage: "current",
    at: "evaluation",
  }) as const
function input(effects: readonly ContributionRule[] = [guarantee()]) {
  const i = structuredClone(inputFor(effects)) as Mutable<StaticDamageInput>
  if (i.damage.kind !== "regular") throw new Error("fixture kind")
  i.damage.defense.targetBaseDefense = 0
  return i
}
function actor(i: Mutable<StaticDamageInput>) {
  const a = i.world.entities[0]!
  if (a.kind !== "actor") throw new Error("fixture actor")
  return a
}
function ok<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function issue(result: Result<unknown>, code: IssueCode) {
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (!result.ok)
    expect(
      result.issues.some((entry) => entry.code === code),
      JSON.stringify(result.issues),
    ).toBe(true)
}
function hit(i: StaticDamageInput): HitContext {
  return {
    ...i.hit,
    hitId: "hit:test",
    actionInstanceId: "action-instance:test",
    actionSnapshotId: "snapshot:action",
    damageKind: "regular",
    origin: { kind: "direct" },
  }
}
function querySetup(
  effect = guarantee(),
  options: {
    eligible?: boolean
    active?: boolean
    beneficiary?: "entity:attacker" | "entity:enemy"
    layers?: number
  } = {},
) {
  const i = input([effect])
  const prepared = ok(
    prepareEffects(
      i.definitions,
      i.bindings.map((b) => ({ ...b, eligible: options.eligible ?? true })),
    ),
  )
  const state = ok(
    supplyEffectState(prepared, {
      sessionId: "session:test",
      atSeconds: 0,
      instances:
        options.active === false ||
        options.eligible === false ||
        effect.activation.kind === "continuous"
          ? []
          : [
              {
                instanceId: "instance:test",
                effectId: effect.effectId,
                bindingId: "binding:static",
                beneficiaryIds: [options.beneficiary ?? "entity:attacker"],
                stackKey: [],
                lifetime: { kind: "supplied" },
                layers: Array.from(
                  { length: options.layers ?? 1 },
                  (_, index) => ({
                    layerId: `layer:test:${index}` as const,
                    startedAt: 0,
                    expiresAt: null,
                    trigger: null,
                  }),
                ) as [
                  {
                    layerId: `layer:${string}`
                    startedAt: number
                    expiresAt: null
                    trigger: null
                  },
                ],
              },
            ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }),
  )
  return { i, prepared, state }
}

describe("source-guaranteed critical definition", () => {
  it.each([
    ["entity scope", { scope: "entity" }],
    ["missing item", { operation: { kind: "guaranteed-critical" } }],
    ["empty item", { operation: { kind: "guaranteed-critical", itemId: "" } }],
    [
      "blank item",
      { operation: { kind: "guaranteed-critical", itemId: "   " } },
    ],
    ["numeric item", { operation: { kind: "guaranteed-critical", itemId: 1 } }],
    [
      "arbitrary probability",
      {
        operation: {
          kind: "guaranteed-critical",
          itemId: "attack",
          value: 0.5,
        },
      },
    ],
    [
      "arbitrary stat",
      {
        operation: {
          kind: "guaranteed-critical",
          itemId: "attack",
          stat: "criticalRate",
        },
      },
    ],
    [
      "numeric operator",
      {
        operation: {
          kind: "guaranteed-critical",
          itemId: "attack",
          operator: "scale",
        },
      },
    ],
    [
      "multiple items",
      {
        operation: {
          kind: "guaranteed-critical",
          itemId: "attack",
          itemIds: ["attack", "other"],
        },
      },
    ],
  ])("rejects %s", (_, change) => {
    issue(
      parseEffectRuleSet(
        definitions([{ ...guarantee(), ...change } as ContributionRule]),
      ),
      "INVALID_DEFINITION",
    )
  })
  it.each([
    ["configuration", "add"],
    ["configuration", "scale"],
    ["contribution", "add"],
    ["contribution", "scale"],
  ] as const)(
    "rejects numeric output modification at %s/%s",
    (phase, operator) => {
      const target = guarantee()
      const modification = {
        kind: "modification",
        effectId: "environment:static:modify",
        source: target.source,
        config: always,
        parameters: {},
        phase,
        ...(phase === "contribution" ? { when: always } : {}),
        target: { kind: "effect", effectId: target.effectId },
        modifications: [
          {
            field: "output",
            unit: "ratio",
            change: {
              operator,
              value: literal(operator === "add" ? "ratio" : "multiplier", 0.5),
            },
          },
        ],
      }
      issue(
        parseEffectRuleSet({
          ...definitions([target]),
          effects: [target, modification],
        }),
        "INVALID_MODIFICATION",
      )
    },
  )
  it("rejects contribution parameter modification without an output expression", () => {
    const target = {
      ...guarantee(),
      parameters: { threshold: { kind: "constant", unit: "ratio", value: 0 } },
    } as const
    const modification = {
      kind: "modification",
      effectId: "environment:static:modify",
      source: target.source,
      config: always,
      parameters: {},
      phase: "contribution",
      when: always,
      target: { kind: "effect", effectId: target.effectId },
      modifications: [
        {
          field: "parameter",
          name: "threshold",
          unit: "ratio",
          change: { operator: "add", value: literal("ratio", 0.5) },
        },
      ],
    } as const
    issue(
      parseEffectRuleSet(definitions([target, modification])),
      "INVALID_MODIFICATION",
    )
  })
})

describe("source-guaranteed critical evaluation", () => {
  it("attributes a final guarantee without ordinary CR observations or world mutation", () => {
    const i = input()
    delete actor(i).directStats.criticalRate
    const before = structuredClone(i)
    const result = ok(calculateStaticDamage(i))
    expect([
      result.nonCritical,
      result.critical,
      result.expected,
      result.criticalRate,
    ]).toEqual([2000, 3000, 3000, 1])
    expect(
      result.evaluation.attributes.some((a) => a.stat === "criticalRate"),
    ).toBe(false)
    expect(result.evaluation.contributions).toEqual([
      {
        address: {
          kind: "hit",
          hitId: "hit:static",
          field: "criticalRate",
          itemId: "attack",
        },
        operator: "guarantee",
        value: { unit: "ratio", value: 1 },
        origin: {
          effectId: guarantee().effectId,
          bindingId: "binding:static",
          instanceId: "instance:static:0",
          layerId: "layer:static:0:0",
          beneficiaryId: "entity:attacker",
        },
        appliedModifications: [],
      },
    ])
    expect(i).toEqual(before)
  })
  it.each(["entity", "hit"] as const)(
    "does not evaluate replaced %s CR output or modifications",
    (scope) => {
      const adjustment = rateAdjustment(scope)
      if (adjustment.operation.kind !== "stat-adjustment")
        throw new Error("fixture")
      const unresolved = {
        ...adjustment,
        operation: {
          ...adjustment.operation,
          value: { kind: "input", name: "unused", unit: "ratio" },
        },
      } as ContributionRule
      const i = input([guarantee(), unresolved])
      const modification = {
        kind: "modification",
        effectId: "environment:static:rate-modification",
        source: adjustment.source,
        config: always,
        parameters: {},
        phase: "contribution",
        when: always,
        target: { kind: "effect", effectId: adjustment.effectId },
        modifications: [
          {
            field: "output",
            unit: "ratio",
            change: {
              operator: "add",
              value: {
                kind: "input",
                name: "unused-modification",
                unit: "ratio",
              },
            },
          },
        ],
      } as const
      i.definitions = definitions([
        ...i.definitions.effects,
        modification,
      ]) as Mutable<RuleSet>
      delete actor(i).directStats.criticalRate
      const result = ok(calculateStaticDamage(i))
      expect(result.expected).toBe(3000)
      expect(
        result.evaluation.contributions.map((c) => c.origin.effectId),
      ).toEqual([guarantee().effectId])
      i.selections.shift()
      issue(calculateStaticDamage(i), "MISSING_FACT")
    },
  )
  it.each(["entity", "hit"] as const)(
    "ignores signed %s CR additions without reporting their consumption",
    (scope) => {
      const i = input([guarantee(), rateAdjustment(scope, -3)])
      const result = ok(calculateStaticDamage(i))
      expect(result.criticalRate).toBe(1)
      expect(
        result.evaluation.contributions.some(
          (c) => c.origin.effectId === `environment:static:rate-${scope}`,
        ),
      ).toBe(false)
    },
  )
  it("retains ordinary hit CD contributions", () => {
    const cd = rule("cd", {
      kind: "stat-adjustment",
      stat: "criticalDamage",
      stage: "direct",
      value: literal("ratio", 0.4),
    })
    expect(ok(calculateStaticDamage(input([guarantee(), cd]))).expected).toBe(
      3800,
    )
  })
  it.each([0, 0.25, 1])(
    "rejects low-level declared r=%s only while active",
    (r) => {
      const i = input()
      i.hit.declaredCriticalRate = r
      issue(calculateStaticDamage(i), "CONTEXT_MISMATCH")
      i.selections = []
      expect(ok(calculateStaticDamage(i)).expected).toBe(2000 + 1000 * r)
    },
  )
  it("rejects mixed damage items at the direct core boundary", () => {
    const i = input()
    i.hit.damageItems.push({
      itemId: "other",
      stat: "attack",
      damageMultiplier: 1,
    })
    issue(calculateStaticDamage(i), "CONTEXT_MISMATCH")
  })
  it.each([
    "sheer",
    "sharpen",
    "anomaly",
    "disorder",
    "anomaly-settlement",
    "vortex",
    "luminize",
  ] as const)("rejects an applicable guarantee in a %s hit", (damageKind) => {
    const { i, prepared, state } = querySetup()
    issue(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 0,
        world: i.world,
        observedSnapshots: [],
        hit: { ...hit(i), damageKind },
      }),
      "CONTEXT_MISMATCH",
    )
  })
  it("requires an observed regular kind for an applicable guarantee", () => {
    const { i, prepared, state } = querySetup()
    const { damageKind: _kind, ...missingKind } = hit(i)
    issue(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 0,
        world: i.world,
        observedSnapshots: [],
        hit: missingKind,
      }),
      "MISSING_FACT",
    )
  })
  it("rejects effect-request origin instead of broadening the direct boundary", () => {
    const { i, prepared, state } = querySetup()
    issue(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 0,
        world: i.world,
        observedSnapshots: [],
        hit: {
          ...hit(i),
          origin: {
            kind: "effect-request",
            requestId: "request:test",
            effectId: guarantee().effectId,
            bindingId: "binding:static",
          },
        },
      }),
      "CONTEXT_MISMATCH",
    )
  })
  it.each([
    "unselected",
    "false when",
    "different item",
    "other holder",
  ] as const)("retains ordinary CR source when inactive: %s", (reason) => {
    const effect = guarantee()
    const selected =
      reason === "false when"
        ? { ...effect, when: { kind: "constant", value: false } as const }
        : reason === "different item"
          ? {
              ...effect,
              operation: {
                kind: "guaranteed-critical",
                itemId: "unrelated",
              } as const,
            }
          : effect
    const i = input([selected])
    if (reason === "unselected") i.selections = []
    if (reason === "other holder") i.bindings[0]!.holderId = "entity:enemy"
    i.hit.attributeSources = { criticalRate: { entityId: "entity:attacker" } }
    expect(ok(calculateStaticDamage(i)).expected).toBe(2250)
  })
  it.each([
    { name: "no instance", active: false },
    { name: "ineligible binding", eligible: false },
    { name: "other beneficiary", beneficiary: "entity:enemy" as const },
  ])("uses effective instances and recipients: $name", (options) => {
    const { i, prepared, state } = querySetup(
      { ...guarantee(), beneficiary: { kind: "team" } },
      options,
    )
    expect(
      ok(
        evaluateEffects(prepared, state, {
          kind: "hit",
          atSeconds: 0,
          world: i.world,
          observedSnapshots: [],
          hit: hit(i),
        }),
      ).hit!.criticalRate,
    ).toBe(0.25)
  })
  it("keeps multiple effective layers as one probability and traces each layer", () => {
    const { i, prepared, state } = querySetup(
      {
        ...guarantee(),
        activation: { kind: "supplied", maximumLayers: literal("count", 2) },
      },
      { layers: 2 },
    )
    const result = ok(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 0,
        world: i.world,
        observedSnapshots: [],
        hit: hit(i),
      }),
    )
    expect(result.hit!.criticalRate).toBe(1)
    expect(result.contributions).toHaveLength(2)
    expect(result.contributions.map((c) => c.value.value)).toEqual([1, 1])
  })
  it("supports eligible continuous sources without adding to panel CR", () => {
    const { i, prepared, state } = querySetup({
      ...guarantee(),
      activation: { kind: "continuous" },
    })
    expect(
      ok(
        evaluateEffects(prepared, state, {
          kind: "hit",
          atSeconds: 0,
          world: i.world,
          observedSnapshots: [],
          hit: hit(i),
        }),
      ).hit!.criticalRate,
    ).toBe(1)
    const panel = ok(
      evaluateEffects(prepared, state, {
        kind: "panel",
        atSeconds: 0,
        world: i.world,
        observedSnapshots: [],
        entities: ["entity:attacker"],
        stats: ["criticalRate"],
      }),
    )
    expect(panel.attributes[0]!.value.value).toBe(0.25)
    expect(panel.contributions).toEqual([])
  })
  it("preserves configuration parameter changes to actual when conditions", () => {
    const g = {
      ...guarantee(),
      parameters: { enabled: { kind: "constant", unit: "ratio", value: 0 } },
      when: {
        kind: "compare-number",
        unit: "ratio",
        operator: "gte",
        left: { kind: "parameter", unit: "ratio", name: "enabled" },
        right: literal("ratio", 1),
      },
    } as const
    const i = input([g])
    expect(ok(calculateStaticDamage(i)).expected).toBe(2250)
    i.definitions = definitions([
      g,
      {
        kind: "modification",
        effectId: "environment:static:enable",
        source: g.source,
        config: always,
        parameters: {},
        phase: "configuration",
        target: { kind: "effect", effectId: g.effectId },
        modifications: [
          {
            field: "parameter",
            name: "enabled",
            unit: "ratio",
            change: { operator: "add", value: literal("ratio", 1) },
          },
        ],
      },
    ]) as Mutable<RuleSet>
    const result = ok(calculateStaticDamage(i))
    expect(result.expected).toBe(3000)
    expect(result.evaluation.contributions[0]!.appliedModifications).toEqual([
      "environment:static:enable",
    ])
  })
  it("preserves missing when facts", () => {
    const g = {
      ...guarantee(),
      when: { kind: "one-of", fact: "hit.targetState", values: ["stunned"] },
    } as const
    const { i, prepared, state } = querySetup(g)
    issue(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 0,
        world: i.world,
        observedSnapshots: [],
        hit: hit(i),
      }),
      "MISSING_FACT",
    )
  })
  it.each(["when", "CD expression"] as const)(
    "retains real CR dependency in %s",
    (where) => {
      const g =
        where === "when"
          ? ({
              ...guarantee(),
              when: {
                kind: "compare-number",
                unit: "ratio",
                operator: "gte",
                left: missingRate(),
                right: literal("ratio", 0),
              },
            } as const)
          : guarantee()
      const cd = rule("dependent-cd", {
        kind: "stat-adjustment",
        stat: "criticalDamage",
        stage: "direct",
        value: missingRate(),
      })
      const i = input(where === "when" ? [g] : [g, cd])
      delete actor(i).directStats.criticalRate
      issue(calculateStaticDamage(i), "MISSING_FACT")
      actor(i).directStats.criticalRate = { baseValue: 0.25, additions: [] }
      expect(ok(calculateStaticDamage(i)).expected).toBe(
        where === "when" ? 3000 : 3500,
      )
    },
  )
  it("preserves a real CR dependency cycle used by CD", () => {
    const cycle = rule("cycle", {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: missingRate(),
    })
    const cd = rule("cd", {
      kind: "stat-adjustment",
      stat: "criticalDamage",
      stage: "direct",
      value: missingRate(),
    })
    issue(
      calculateStaticDamage(input([guarantee(), cycle, cd])),
      "DEPENDENCY_CYCLE",
    )
  })
  it("keeps ordinary +100% CR as addition instead of inferring guaranteed semantics", () => {
    const i = input([rateAdjustment("hit", 1)])
    actor(i).directStats.criticalRate = { baseValue: -0.2, additions: [] }
    const result = ok(calculateStaticDamage(i))
    expect(result.criticalRate).toBe(0.8)
    expect(result.expected).toBe(2800)
    expect(result.evaluation.contributions[0]!.operator).toBe("add")
  })
})

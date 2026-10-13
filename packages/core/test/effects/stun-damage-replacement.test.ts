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
  EffectRule,
  HitContext,
  IssueCode,
  Result,
  StaticDamageInput,
  StateInput,
} from "../../src/effects/index.ts"
import {
  always,
  definitions,
  general,
  inputFor,
  literal,
  rule,
} from "./static-fixtures.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const read = (name: string) => ({ kind: "input", unit: "ratio", name }) as const
const entryTrigger = {
  eventId: "event:veil-entry",
  actorId: "entity:enemy",
  activationSnapshotId: "snapshot:veil-entry",
} as const
const veil = (cap = 1.1, name = "veil") =>
  rule(name, {
    kind: "stun-damage-replacement",
    bonus: read("entryBonus"),
    maximumBonus: literal("ratio", cap),
  })
const ordinary = () =>
  rule("ordinary", {
    kind: "factor-contribution",
    channel: "stun-damage-adjustment",
    value: literal("multiplier", 0.25),
  })
const bonus = () =>
  rule("damage-bonus", {
    kind: "factor-contribution",
    channel: "damage-bonus",
    value: literal("ratio", 0.3),
  })
function request(
  effects: readonly ContributionRule[] = [veil(), ordinary(), bonus()],
  value = 0.85,
) {
  const i = structuredClone(inputFor(effects)) as Mutable<StaticDamageInput>
  i.atSeconds = 5
  i.snapshots = [
    {
      snapshotId: entryTrigger.activationSnapshotId,
      atSeconds: 2,
      attributes: [],
      world: structuredClone(i.world),
    },
  ]
  i.selections = i.selections.map((s) => ({
    ...s,
    trigger: structuredClone(entryTrigger),
  }))
  i.inputs = [
    {
      bindingId: "binding:static",
      name: "entryBonus",
      value: { unit: "ratio", value },
    },
  ]
  if (i.damage.kind !== "regular") throw new Error("fixture damage")
  i.damage.defense.targetBaseDefense = 0
  i.damage.stunDamage = {
    isTargetStunned: true,
    targetBaseStunDamageMultiplier: 1.5,
    targetStunDamageMultiplierAdjustments: [0.1],
  }
  return i
}
function ok<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function issue(result: Result<unknown>, code?: IssueCode) {
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (!result.ok && code)
    expect(
      result.issues.map((e) => e.code),
      JSON.stringify(result.issues),
    ).toContain(code)
}
const factor = (i: StaticDamageInput) =>
  ok(calculateStaticDamage(i)).factors.nonCritical["stunDamage"]
const comparedInput = (name = "condition") =>
  ({
    kind: "compare-number",
    unit: "ratio",
    operator: "gt",
    left: read(name),
    right: literal("ratio", 0),
  }) as const

// Independent literal outcomes of the approved conditional calculation, not read from production rules.
describe.each([
  [0, 1, 1],
  [0.85, 1.85, 1.85],
  [1.1, 2.1, 2.1],
  [1.375, 2.1, 2.375],
  [2, 2.1, 3],
  [2.625, 2.1, 3],
])("entry bonus %s", (value, low, high) => {
  it.each([
    [1.1, low],
    [2, high],
  ])(
    "cap %s produces %s across current state and baseline changes",
    (cap, expected) => {
      for (const isTargetStunned of [false, true])
        for (const attack of [713, 1287]) {
          const i = request([veil(cap), ordinary(), bonus()], value)
          const actor = i.world.entities[0]!
          if (actor.kind !== "actor") throw new Error("actor")
          actor.generalStats.attack = structuredClone(
            general(attack),
          ) as Mutable<ReturnType<typeof general>>
          i.damage.stunDamage.isTargetStunned = isTargetStunned
          i.damage.stunDamage.targetBaseStunDamageMultiplier = isTargetStunned
            ? 2.2
            : 0.6
          const result = ok(calculateStaticDamage(i))
          expect(result.factors.nonCritical["stunDamage"]).toBeCloseTo(
            expected!,
          )
          expect(result.nonCritical).toBeCloseTo(attack * 2 * 1.3 * expected!)
          const outputs = result.evaluation.contributions
          expect(
            outputs.filter(
              (c) =>
                c.address.kind === "factor" &&
                c.address.channel === "stun-damage-adjustment",
            ),
          ).toEqual([])
          expect(outputs.find((c) => c.operator === "replace")).toMatchObject({
            address: { kind: "hit", field: "stunDamageMultiplier" },
            value: { unit: "multiplier", value: expected },
            origin: {
              effectId: veil(cap).effectId,
              bindingId: "binding:static",
            },
          })
        }
    },
  )
})

describe("stun replacement definition", () => {
  it.each([
    ["entity scope", { scope: "entity" }],
    ["continuous activation", { activation: { kind: "continuous" } }],
    [
      "uniqueness",
      {
        uniqueness: {
          key: "veil",
          scope: "global",
          select: { kind: "highest-value" },
        },
      },
    ],
    ...[
      ["missing bonus", { maximumBonus: literal("ratio", 1.1) }],
      ["missing cap", { bonus: read("entryBonus") }],
      [
        "wrong unit",
        {
          bonus: literal("multiplier", 0.85),
          maximumBonus: literal("ratio", 1.1),
        },
      ],
      [
        "negative literal",
        { bonus: literal("ratio", -0.01), maximumBonus: literal("ratio", 1.1) },
      ],
      [
        "cap above two",
        { bonus: read("entryBonus"), maximumBonus: literal("ratio", 2.01) },
      ],
      [
        "negative cap",
        { bonus: read("entryBonus"), maximumBonus: literal("ratio", -0.1) },
      ],
      [
        "unknown field",
        {
          bonus: read("entryBonus"),
          maximumBonus: literal("ratio", 1.1),
          value: 5,
        },
      ],
    ].map(([name, operation]): [string, object] => [
      String(name),
      {
        operation: {
          kind: "stun-damage-replacement",
          ...(operation as object),
        },
      },
    ]),
  ])("rejects %s", (_, change) => {
    issue(
      parseEffectRuleSet(
        definitions([{ ...veil(), ...(change as object) } as ContributionRule]),
      ),
    )
  })
  it.each([
    "contribution-parameter",
    "contribution-output",
    "configuration-output",
  ])("rejects %s modification", (kind) => {
    const v = {
      ...veil(),
      parameters: { cap: { kind: "constant", unit: "ratio", value: 1.1 } },
    } as ContributionRule
    const modification = {
      ...v,
      kind: "modification",
      effectId: "environment:static:modify",
      phase: kind.startsWith("contribution") ? "contribution" : "configuration",
      target: { kind: "effect", effectId: v.effectId },
      modifications: [
        {
          field: kind.endsWith("parameter") ? "parameter" : "output",
          ...(kind.endsWith("parameter") ? { name: "cap" } : {}),
          unit: "ratio",
          change: { operator: "add", value: literal("ratio", 0.1) },
        },
      ],
    } as unknown as Record<string, unknown>
    for (const key of ["activation", "operation", "scope", "beneficiary"])
      delete modification[key]
    if (kind === "configuration-output") delete modification["when"]
    issue(
      prepareEffects(
        definitions([v, modification as unknown as EffectRule]),
        request().bindings,
      ),
      "INVALID_MODIFICATION",
    )
  })
  it.each([-0.01, 2.01, Infinity, NaN])(
    "rejects runtime maximum %s",
    (maximum) => {
      const v = rule("veil", {
        ...veil().operation,
        maximumBonus: read("maximum"),
      })
      const i = request([v])
      i.inputs!.push({
        bindingId: "binding:static",
        name: "maximum",
        value: { unit: "ratio", value: maximum },
      })
      issue(calculateStaticDamage(i), "INVALID_INPUT")
    },
  )
  it("preserves configuration parameter modification attribution and checks its final range", () => {
    const v = {
      ...veil(),
      parameters: { cap: { kind: "constant", unit: "ratio", value: 1.1 } },
      operation: {
        ...veil().operation,
        maximumBonus: { kind: "parameter", unit: "ratio", name: "cap" },
      },
    } as ContributionRule
    const modification: EffectRule = {
      kind: "modification",
      effectId: "environment:static:cap-mod",
      source: v.source,
      config: always,
      parameters: {},
      phase: "configuration",
      target: { kind: "effect", effectId: v.effectId },
      modifications: [
        {
          field: "parameter",
          name: "cap",
          unit: "ratio",
          change: { operator: "add", value: literal("ratio", 0.9) },
        },
      ],
    }
    const i = request([v], 1.375)
    i.definitions = definitions([v, modification]) as Mutable<
      StaticDamageInput["definitions"]
    >
    const result = ok(calculateStaticDamage(i))
    expect(result.factors.nonCritical["stunDamage"]).toBe(2.375)
    expect(
      result.evaluation.contributions.find((c) => c.operator === "replace")
        ?.appliedModifications,
    ).toContain(modification.effectId)
  })
})

describe("actual source, capture and consumption", () => {
  it.each(["none", "false condition"])(
    "restores ordinary factor when %s",
    (off) => {
      const i = request()
      if (off === "none") i.selections.shift()
      if (off === "false condition") {
        const v = i.definitions.effects[0]!
        if (v.kind === "contribution")
          v.when = { kind: "constant", value: false }
      }
      i.inputs = []
      expect(factor(i)).toBe(1.85)
    },
  )
  it.each([
    "missing input",
    "negative input",
    "infinite input",
    "NaN input",
    "wrong unit",
    "missing trigger",
    "missing snapshot",
    "future snapshot",
    "empty historical world",
    "historical friendly",
    "current friendly",
    "wrong target",
    "foreign attribute",
    "saved attribute",
    "inherited foreign attribute",
  ])("rejects %s", (change) => {
    const i = request()
    if (change === "missing input") i.inputs = []
    if (change === "negative input") i.inputs![0]!.value.value = -0.01
    if (change === "infinite input") i.inputs![0]!.value.value = Infinity
    if (change === "NaN input") i.inputs![0]!.value.value = NaN
    if (change === "wrong unit") i.inputs![0]!.value.unit = "multiplier"
    if (change === "missing trigger") delete i.selections[0]!.trigger
    if (change === "missing snapshot") i.snapshots = []
    if (change === "future snapshot") i.snapshots![0]!.atSeconds = 6
    if (change === "empty historical world")
      i.snapshots![0]!.world.entities = []
    if (change === "historical friendly") {
      const a = i.snapshots![0]!.world.entities[1]!
      if (a.kind === "actor") a.teamId = "team:players"
    }
    if (change === "current friendly") {
      const a = i.world.entities[1]!
      if (a.kind === "actor") a.teamId = "team:players"
    }
    if (change === "wrong target")
      i.selections[0]!.trigger!.actorId = "entity:attacker"
    if (change === "foreign attribute")
      i.hit.damageItems[0]!.statSource = { entityId: "entity:enemy" }
    if (change === "saved attribute")
      i.hit.damageItems[0]!.statSource = {
        entityId: "entity:attacker",
        snapshotId: entryTrigger.activationSnapshotId,
      }
    if (change === "inherited foreign attribute")
      i.hit.attributeSources = { attack: { entityId: "entity:enemy" } }
    issue(calculateStaticDamage(i))
  })
  it("accepts multiple holder-current damage items and explicit sharpen without modifying classification", () => {
    const i = request()
    const a = i.world.entities[0]!
    if (a.kind !== "actor") throw new Error("actor")
    a.directStats.sharpCriticalDamage = { baseValue: 0.4, additions: [] }
    i.hit.damageItems.push({
      itemId: "second",
      damageMultiplier: 1,
      stat: "attack",
      statSource: { entityId: "entity:attacker" },
    })
    if (i.damage.kind !== "regular") throw new Error("fixture")
    i.damage = { ...i.damage, kind: "sharpen", sharpenDamageBonus: [] }
    expect(factor(i)).toBe(1.85)
    expect(i.damage.kind).toBe("sharpen")
  })
  it.each([false, true])(
    "counts actual replacements before reading either output, reversed=%s",
    (reverse) => {
      const effects = [veil(), veil(2, "other")]
      if (reverse) effects.reverse()
      const i = request(effects)
      i.inputs = []
      issue(calculateStaticDamage(i), "CONTEXT_MISMATCH")
      const second = i.definitions.effects[1]!
      if (second.kind !== "contribution") throw new Error("rule")
      second.when = { kind: "constant", value: false }
      i.inputs = [
        {
          bindingId: "binding:static",
          name: "entryBonus",
          value: { unit: "ratio", value: 0.85 },
        },
      ]
      expect(factor(i)).toBe(1.85)
    },
  )
  it("checks real ordinary conditions but never reads discarded output or output modification facts", () => {
    const o = {
      ...ordinary(),
      when: comparedInput(),
      operation: {
        ...ordinary().operation,
        value: { kind: "input", unit: "multiplier", name: "discarded" },
      },
    } as ContributionRule
    const i = request([veil(), o])
    issue(calculateStaticDamage(i), "MISSING_FACT")
    i.inputs!.push({
      bindingId: "binding:static",
      name: "condition",
      value: { unit: "ratio", value: 1 },
    })
    const modification: EffectRule = {
      kind: "modification",
      effectId: "environment:static:ordinary-mod",
      source: o.source,
      parameters: {},
      config: always,
      phase: "contribution",
      target: { kind: "effect", effectId: o.effectId },
      when: always,
      modifications: [
        {
          field: "output",
          unit: "multiplier",
          change: {
            operator: "add",
            value: { kind: "input", unit: "multiplier", name: "discarded-mod" },
          },
        },
      ],
    }
    i.definitions = definitions([veil(), o, modification]) as Mutable<
      StaticDamageInput["definitions"]
    >
    expect(factor(i)).toBe(1.85)
    i.selections.shift()
    issue(calculateStaticDamage(i), "MISSING_FACT")
  })
  it("skips missing ordinary attributes and value uniqueness, but restores their errors when disabled", () => {
    const missingHealth = {
      kind: "convert",
      unit: "multiplier",
      input: {
        kind: "stat",
        unit: "health-points",
        entity: { role: "holder" },
        stat: "health",
        stage: "current",
        at: "evaluation",
      },
      rate: literal("multiplier", 0.01),
    } as const
    const o = {
      ...ordinary(),
      operation: { ...ordinary().operation, value: missingHealth },
      uniqueness: {
        key: "ordinary",
        scope: "global",
        select: { kind: "highest-value" },
      },
    } as const
    const other = {
      ...o,
      effectId: "environment:static:other-ordinary",
    } as const
    const i = request([veil(), o, other])
    const a = i.world.entities[0]!
    if (a.kind !== "actor") throw new Error("actor")
    delete a.generalStats.health
    expect(factor(i)).toBe(1.85)
    i.selections.shift()
    issue(calculateStaticDamage(i), "MISSING_FACT")
  })
  it("retains missing facts used by another channel even with the same name", () => {
    const i = request([
      veil(),
      rule("other", {
        kind: "factor-contribution",
        channel: "damage-bonus",
        value: read("discarded"),
      }),
    ])
    issue(calculateStaticDamage(i), "MISSING_FACT")
  })
  it("does not sum discarded finite adjustments, while invalid baseline values remain errors", () => {
    const i = request()
    i.damage.stunDamage.targetStunDamageMultiplierAdjustments = [
      Number.MAX_VALUE,
      Number.MAX_VALUE,
    ]
    expect(factor(i)).toBe(1.85)
    i.damage.stunDamage.targetBaseStunDamageMultiplier = -1
    issue(calculateStaticDamage(i))
    i.damage.stunDamage.targetBaseStunDamageMultiplier = 1.5
    i.damage.stunDamage.targetStunDamageMultiplierAdjustments = [Infinity]
    issue(calculateStaticDamage(i))
  })
})

function publicSetup(
  effects: readonly ContributionRule[] = [
    veil(),
    { ...ordinary(), scope: "entity" },
  ],
  count = 1,
) {
  const i = request(effects)
  const prepared = ok(prepareEffects(i.definitions, i.bindings))
  const supplied: StateInput = {
    sessionId: "session:veil",
    atSeconds: 5,
    instances: effects.flatMap((effect, index) =>
      Array.from({ length: index === 0 ? count : 1 }, (_, n) => ({
        instanceId: `instance:${index}:${n}`,
        effectId: effect.effectId,
        bindingId: "binding:static",
        beneficiaryIds: ["entity:attacker"],
        stackKey: [],
        lifetime: { kind: "supplied" },
        layers: [
          {
            layerId: `layer:${index}:${n}`,
            startedAt: 2,
            expiresAt: null,
            trigger: structuredClone(entryTrigger),
          },
        ],
      })),
    ),
    snapshots: i.snapshots!,
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  }
  const hit: HitContext = {
    ...i.hit,
    hitId: "hit:veil",
    actionInstanceId: "action-instance:veil",
    actionSnapshotId: entryTrigger.activationSnapshotId,
    damageKind: "regular",
    origin: { kind: "direct" },
  }
  return { i, prepared, supplied, hit }
}

describe("public evaluation and supplied state", () => {
  it("does not consume hit replacement in panel or contributions queries", () => {
    const { i, prepared, supplied } = publicSetup()
    const state = ok(supplyEffectState(prepared, supplied))
    const common = { atSeconds: 5, world: i.world, observedSnapshots: [] }
    const panel = ok(
      evaluateEffects(prepared, state, {
        ...common,
        kind: "panel",
        entities: ["entity:attacker"],
        stats: ["attack"],
      }),
    )
    expect(panel.contributions.some((c) => c.operator === "replace")).toBe(
      false,
    )
    const contributions = ok(
      evaluateEffects(prepared, state, {
        ...common,
        kind: "contributions",
        beneficiaries: ["entity:attacker"],
      }),
    )
    expect(contributions.contributions).toHaveLength(1)
    expect(contributions.contributions[0]!.value.value).toBe(0.25)
  })
  it("keeps explicitly requested extra attribute facts and rejects a mismatched capture time", () => {
    const { i, prepared, supplied, hit } = publicSetup([veil()])
    const state = ok(supplyEffectState(prepared, supplied))
    issue(
      evaluateEffects(prepared, state, {
        kind: "hit",
        atSeconds: 5,
        world: i.world,
        observedSnapshots: [],
        hit,
        inputs: i.inputs!,
        stats: ["energyRegen"],
      }),
      "MISSING_FACT",
    )
    const mismatch = structuredClone(supplied) as Mutable<StateInput>
    mismatch.instances[0]!.layers[0]!.startedAt = 3
    const changedState = supplyEffectState(prepared, mismatch)
    if (!changedState.ok) issue(changedState)
    else
      issue(
        evaluateEffects(prepared, changedState.value, {
          kind: "hit",
          atSeconds: 5,
          world: i.world,
          observedSnapshots: [],
          hit,
          inputs: i.inputs!,
        }),
        "CONTEXT_MISMATCH",
      )
  })
  it.each([false, true])(
    "rejects two instances but ignores expired layers, reversed=%s",
    (reverse) => {
      const { i, prepared, supplied, hit } = publicSetup(
        [
          {
            ...veil(),
            activation: {
              kind: "supplied",
              maximumLayers: literal("count", 2),
            },
          },
        ],
        2,
      )
      const mutable = structuredClone(supplied) as Mutable<StateInput>
      if (reverse) mutable.instances.reverse()
      const evaluate = () =>
        evaluateEffects(prepared, ok(supplyEffectState(prepared, mutable)), {
          kind: "hit",
          atSeconds: 5,
          world: i.world,
          observedSnapshots: [],
          hit,
          inputs: i.inputs!,
        })
      issue(evaluate(), "CONTEXT_MISMATCH")
      mutable.instances[0]!.layers[0]!.expiresAt = 4
      expect(
        ok(evaluate()).contributions.filter((c) => c.operator === "replace"),
      ).toHaveLength(1)
    },
  )
  it("rejects wrong holder, non-direct origin and anomaly kind for an actually applicable public layer", () => {
    const { i, prepared, supplied, hit } = publicSetup([veil()])
    const state = ok(supplyEffectState(prepared, supplied))
    for (const changed of [
      {
        ...hit,
        origin: {
          kind: "effect-request",
          requestId: "request:test",
          effectId: veil().effectId,
          bindingId: "binding:static",
        },
      },
      { ...hit, damageKind: "anomaly" },
    ]) {
      issue(
        evaluateEffects(prepared, state, {
          kind: "hit",
          atSeconds: 5,
          world: i.world,
          observedSnapshots: [],
          hit: changed as HitContext,
          inputs: i.inputs!,
        }),
        "CONTEXT_MISMATCH",
      )
    }
    const wrongHolder = structuredClone(supplied) as Mutable<StateInput>
    wrongHolder.instances[0]!.beneficiaryIds = ["entity:enemy"]
    const alteredState = supplyEffectState(prepared, wrongHolder)
    if (!alteredState.ok) issue(alteredState)
    else
      issue(
        evaluateEffects(prepared, alteredState.value, {
          kind: "hit",
          atSeconds: 5,
          world: i.world,
          observedSnapshots: [],
          hit: { ...hit, actorId: "entity:enemy" },
          inputs: i.inputs!,
        }),
        "CONTEXT_MISMATCH",
      )
  })
})

import { describe, expect, it } from "vitest"
import {
  advanceEffects,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
  synchronizeSuppliedInstances,
} from "../../src/effects/index.ts"
import type {
  BindingId,
  EffectInstance,
  EffectNumericInput,
  EffectState,
  PreparedEffects,
  Result,
  SourceBinding,
  SuppliedInstancesUpdate,
  SuppliedEffectInstance,
} from "../../src/effects/index.ts"
import {
  syntheticHitQuery,
  syntheticWorld,
} from "../../../../docs/specs/effects/contract-examples.ts"
import { syntheticSource } from "./fixtures.ts"

const always = { kind: "constant", value: true } as const
const holderId = syntheticWorld.entities[0].entityId
const world = { ...syntheticWorld, states: [] }
const literal = (unit: string, value: number) => ({
  kind: "literal",
  unit,
  value,
})
const source = (entityId: string) => ({
  ...syntheticSource,
  identity: { kind: "environment", entityId },
})
const binding = (
  bindingId: BindingId,
  sourceEntityId: string,
): SourceBinding => ({
  kind: "environment",
  bindingId,
  holderId,
  sourceEntityId,
  eligible: true,
  configuration: {},
})
const targetBinding = binding("binding:target", "target")
const modifierBinding = binding("binding:modifier", "modifier")
const inputExpression = { kind: "input", unit: "attack-points", name: "amount" }
const input = (bindingId: BindingId, value: number): EffectNumericInput => ({
  bindingId,
  name: "amount",
  value: { unit: "attack-points", value },
})

function contribution(
  effectId = "environment:target",
  sourceId = "target",
  value: unknown = literal("attack-points", 100),
) {
  return {
    kind: "contribution",
    effectId,
    source: source(sourceId),
    config: always,
    parameters: {},
    activation: { kind: "continuous" },
    beneficiary: { kind: "holder" },
    when: always,
    scope: "entity",
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value,
    },
  }
}

function modification(value: unknown = inputExpression) {
  return {
    kind: "modification",
    effectId: "environment:modifier",
    source: source("modifier"),
    config: always,
    parameters: {},
    phase: "contribution",
    target: { kind: "effect", effectId: "environment:target" },
    when: always,
    modifications: [
      {
        field: "output",
        unit: "attack-points",
        change: { operator: "add", value },
      },
    ],
  }
}

function ok<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function prepare(
  effects: readonly unknown[],
  bindings: readonly SourceBinding[] = [targetBinding, modifierBinding],
) {
  const rules = ok(
    parseEffectRuleSet({
      schemaVersion: 1,
      ruleSetId: "execution-identity",
      revision: "1",
      effects,
      states: [],
      actions: [],
    }),
  )
  return prepareEffects(rules, bindings)
}

function supply(
  prepared: PreparedEffects,
  instances: readonly EffectInstance[] = [],
) {
  return ok(
    supplyEffectState(prepared, {
      sessionId: "session:identity",
      atSeconds: 0,
      instances,
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }),
  )
}

function panel(
  prepared: PreparedEffects,
  state: EffectState,
  inputs: readonly EffectNumericInput[] = [],
) {
  return evaluateEffects(prepared, state, {
    kind: "panel",
    atSeconds: 1,
    world,
    observedSnapshots: [],
    entities: [holderId],
    stats: ["attack"],
    inputs,
  })
}

function attack(
  prepared: PreparedEffects,
  state: EffectState,
  inputs: readonly EffectNumericInput[] = [],
) {
  return ok(panel(prepared, state, inputs)).attributes[0]!.value.value
}

describe("supplied scope identity", () => {
  function fixture() {
    const first = {
      ...contribution("environment:scope", "first"),
      activation: { kind: "supplied" },
    }
    const second = {
      ...contribution(
        "environment:scope binding:left",
        "second",
        literal("attack-points", 200),
      ),
      activation: { kind: "supplied" },
    }
    const bindings = [
      binding("binding:left binding:right", "first"),
      binding("binding:right", "second"),
    ]
    const prepared = ok(prepare([first, second], bindings))
    const instances: SuppliedEffectInstance[] = [first, second].map(
      (rule, index) => ({
        instanceId: `instance:${index}`,
        effectId: rule.effectId as EffectInstance["effectId"],
        bindingId: bindings[index]!.bindingId,
        beneficiaryIds: [holderId],
        stackKey: [],
        lifetime: { kind: "supplied" },
        layers: [
          {
            layerId: `layer:${index}`,
            startedAt: 0,
            expiresAt: 2,
            trigger: null,
          },
        ],
      }),
    )
    const state = supply(prepared, instances)
    const replace = (
      indexes: readonly [number, ...number[]],
      values: readonly SuppliedEffectInstance[] = [],
    ): SuppliedInstancesUpdate => {
      const replacement = (index: number) => ({
        effectId: instances[index]!.effectId,
        bindingId: instances[index]!.bindingId,
        instances: values.filter(
          (entry) => entry.effectId === instances[index]!.effectId,
        ),
      })
      return {
        eventId: "event:replace",
        atSeconds: 1,
        sequence: 0,
        world,
        observedSnapshots: [],
        replacements: [
          replacement(indexes[0]),
          ...indexes.slice(1).map(replacement),
        ],
      }
    }
    return { prepared, state, instances, replace }
  }

  it("clears only the specified tuple, without changing the old state", () => {
    const { prepared, state, replace } = fixture()
    const next = ok(synchronizeSuppliedInstances(prepared, state, replace([0])))
    expect(attack(prepared, next)).toBe(1200)
    expect(attack(prepared, state)).toBe(1300)
  })

  it("accepts both distinct tuples in a batch but rejects a repeated tuple", () => {
    const { prepared, state, replace } = fixture()
    expect(
      attack(
        prepared,
        ok(synchronizeSuppliedInstances(prepared, state, replace([0, 1]))),
      ),
    ).toBe(1000)
    const duplicate = synchronizeSuppliedInstances(
      prepared,
      state,
      replace([0, 0]),
    )
    expect(duplicate).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_INPUT" }],
    })
    expect(attack(prepared, state)).toBe(1300)
  })

  it.each([0, 1])(
    "allows expiry renewal for a tuple with spaces: %s",
    (index) => {
      const { prepared, state, instances, replace } = fixture()
      const instance = instances[index]!
      const renewed: SuppliedEffectInstance = {
        ...instance,
        layers: [{ ...instance.layers[0]!, expiresAt: 10 }],
      }
      expect(
        attack(
          prepared,
          ok(
            synchronizeSuppliedInstances(
              prepared,
              state,
              replace([index], [renewed]),
            ),
          ),
        ),
      ).toBe(1300)
    },
  )

  it.each([
    "start",
    "beneficiaries",
    "instance-owner",
    "layer-owner",
    "retained-instance",
    "retained-layer",
  ])("does not let spaced IDs bypass %s identity checks", (change) => {
    const { prepared, state, instances, replace } = fixture()
    const first = instances[0]!
    const second = instances[1]!
    const changed: SuppliedEffectInstance = {
      ...first,
      ...(change === "beneficiaries"
        ? { beneficiaryIds: ["entity:spec-target" as const] }
        : {}),
      ...(change === "instance-owner" || change === "retained-instance"
        ? { instanceId: second.instanceId }
        : {}),
      layers: [
        {
          ...first.layers[0]!,
          ...(change === "start" ? { startedAt: 0.5 } : {}),
          ...(change === "layer-owner" || change === "retained-layer"
            ? { layerId: second.layers[0]!.layerId }
            : {}),
        },
      ],
    }
    const indexes =
      change === "instance-owner" || change === "layer-owner"
        ? ([0, 1] as const)
        : ([0] as const)
    const result = synchronizeSuppliedInstances(
      prepared,
      state,
      replace(indexes, [changed]),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" || issue.code === "DUPLICATE_ID",
        ),
      ).toBe(true)
    expect(attack(prepared, state)).toBe(1300)
  })
})

describe("contribution modification expression ownership", () => {
  it.each([
    [[input("binding:modifier", 300)], 1400],
    [[input("binding:modifier", 300), input("binding:target", 20)], 1400],
    [[input("binding:modifier", 600), input("binding:target", 20)], 1700],
  ] as const)(
    "reads the modifier binding's operand: %j",
    (inputs, expected) => {
      const prepared = ok(prepare([contribution(), modification()]))
      expect(attack(prepared, supply(prepared), inputs)).toBe(expected)
    },
  )

  const inputCondition = {
    kind: "compare-number",
    unit: "attack-points",
    operator: "gte",
    left: {
      kind: "add",
      unit: "attack-points",
      operands: [inputExpression, literal("attack-points", 0)],
    },
    right: literal("attack-points", 100),
  }

  it("reads inputs in nested when conditions and short-circuits unused inputs", () => {
    const modifier = {
      ...modification(literal("attack-points", 300)),
      when: {
        kind: "all",
        conditions: [
          always,
          {
            kind: "not",
            condition: { kind: "not", condition: inputCondition },
          },
        ],
      },
    }
    const prepared = ok(prepare([contribution(), modifier]))
    expect(
      attack(prepared, supply(prepared), [
        input("binding:modifier", 300),
        input("binding:target", 20),
      ]),
    ).toBe(1400)
    expect(
      attack(prepared, supply(prepared), [
        input("binding:modifier", 20),
        input("binding:target", 300),
      ]),
    ).toBe(1100)
    const shortCircuited = ok(
      prepare([
        contribution(),
        {
          ...modification(),
          when: {
            kind: "all",
            conditions: [{ kind: "constant", value: false }, inputCondition],
          },
        },
      ]),
    )
    expect(attack(shortCircuited, supply(shortCircuited))).toBe(1100)
  })

  it.each(["operand", "condition"])(
    "diagnoses the owning rule and binding for a missing %s input",
    (read) => {
      const modifier =
        read === "operand"
          ? modification()
          : {
              ...modification(literal("attack-points", 300)),
              when: inputCondition,
            }
      const prepared = ok(prepare([contribution(), modifier]))
      expect(
        panel(prepared, supply(prepared), [input("binding:target", 20)]),
      ).toMatchObject({
        ok: false,
        issues: [
          {
            code: "MISSING_FACT",
            effectId: "environment:modifier",
            bindingId: "binding:modifier",
            pointer: "/inputs",
          },
        ],
      })
      expect(
        panel(prepared, supply(prepared), [
          {
            bindingId: "binding:modifier",
            name: "amount",
            value: { unit: "count", value: 300 },
          },
        ]),
      ).toMatchObject({
        ok: false,
        issues: [{ code: "UNIT_MISMATCH", bindingId: "binding:modifier" }],
      })
    },
  )

  it("keeps target inputs and same-source inputs in their own expression views", () => {
    const separate = ok(
      prepare([
        contribution(undefined, undefined, inputExpression),
        modification(),
      ]),
    )
    expect(
      attack(separate, supply(separate), [
        input("binding:target", 20),
        input("binding:modifier", 300),
      ]),
    ).toBe(1320)
    const same = ok(
      prepare(
        [contribution(), { ...modification(), source: source("target") }],
        [targetBinding],
      ),
    )
    expect(attack(same, supply(same), [input("binding:target", 300)])).toBe(
      1400,
    )
  })

  it.each(["initial", "current"] as const)(
    "preserves the target layer, trigger, hit scope and dependency graph for %s stat reads",
    (stage) => {
      const target = {
        ...contribution(),
        activation: { kind: "supplied" },
        scope: "hit",
        parameters: {
          bonus: { kind: "constant", unit: "attack-points", value: 999 },
        },
      }
      const modifier = {
        ...modification({
          kind: "add",
          unit: "attack-points",
          operands: [
            inputExpression,
            { kind: "parameter", unit: "attack-points", name: "bonus" },
            {
              kind: "stat",
              unit: "attack-points",
              stat: "attack",
              stage,
              at: "evaluation",
              entity: { role: "beneficiary" },
            },
          ],
        }),
        parameters: {
          bonus: { kind: "constant", unit: "attack-points", value: 7 },
        },
        when: {
          kind: "all",
          conditions: [
            inputCondition,
            {
              kind: "same-entity",
              left: { role: "beneficiary" },
              right: { role: "triggerActor" },
            },
            { kind: "one-of", fact: "hit.skillCategory", values: ["basic"] },
          ],
        },
      }
      const initial = {
        ...contribution("environment:hit-initial"),
        scope: "hit",
        operation: {
          kind: "stat-adjustment",
          stat: "attack",
          stage: "initial-fixed",
          value: literal("attack-points", 50),
        },
      }
      const prepared = ok(prepare([target, modifier, initial]))
      const state = ok(
        supplyEffectState(prepared, {
          sessionId: "session:hit-identity",
          atSeconds: 0,
          cooldowns: [],
          eventHistory: { processedIds: [], last: null },
          snapshots: [
            {
              snapshotId: "snapshot:activation",
              atSeconds: 0,
              attributes: [],
              world,
            },
          ],
          instances: [
            {
              instanceId: "instance:target",
              effectId: "environment:target",
              bindingId: "binding:target",
              beneficiaryIds: [holderId],
              stackKey: [],
              lifetime: { kind: "supplied" },
              layers: [
                {
                  layerId: "layer:target",
                  startedAt: 0,
                  expiresAt: null,
                  trigger: {
                    eventId: "event:activate",
                    actorId: holderId,
                    activationSnapshotId: "snapshot:activation",
                  },
                },
              ],
            },
          ],
        }),
      )
      const result = evaluateEffects(prepared, state, {
        ...syntheticHitQuery,
        world,
        inputs: [input("binding:modifier", 300)],
      })
      if (stage === "current") {
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "DEPENDENCY_CYCLE"),
          ).toBe(true)
      } else {
        const evaluated = ok(result)
        expect(
          evaluated.attributes.find((attribute) => attribute.stat === "attack")
            ?.value.value,
        ).toBe(2507)
        expect(
          evaluated.contributions.find(
            (entry) => entry.origin.effectId === "environment:target",
          ),
        ).toMatchObject({
          origin: {
            bindingId: "binding:target",
            instanceId: "instance:target",
            layerId: "layer:target",
          },
          appliedModifications: ["environment:modifier"],
        })
      }
    },
  )
})

describe("configuration rank reads", () => {
  const compare = (field: string, value = 1) => ({
    kind: "compare-number",
    unit: "count",
    operator: "gte",
    left: { kind: "configuration-number", unit: "count", field },
    right: literal("count", value),
  })
  it.each([
    ["unused", always, {}, 1100],
    ["missing", compare("specialSkillLevel"), {}, "MISSING_RANK"],
    ["one", compare("specialSkillLevel"), { specialSkillLevel: 1 }, 1100],
    ["sixteen", compare("specialSkillLevel"), { specialSkillLevel: 16 }, 1100],
    ["zero", compare("specialSkillLevel"), { specialSkillLevel: 0 }, "invalid"],
    [
      "all short circuit",
      {
        kind: "all",
        conditions: [
          { kind: "constant", value: false },
          compare("specialSkillLevel"),
        ],
      },
      {},
      1000,
    ],
    [
      "any short circuit",
      { kind: "any", conditions: [always, compare("specialSkillLevel")] },
      {},
      1100,
    ],
    ["potential default", compare("potentialLevel", 0), {}, 1100],
  ] as const)(
    "only requires an actually read special skill level: %s",
    (_, config, extra, expected) => {
      const rule = {
        ...contribution(),
        effectId: "agent:rank",
        source: {
          ...source("agent"),
          identity: { kind: "agent", entityId: "agent" },
        },
        config,
      }
      const prepared = prepare(
        [rule],
        [
          {
            kind: "agent",
            bindingId: "binding:agent",
            sourceEntityId: "agent",
            holderId,
            eligible: true,
            configuration: { mindscapeRank: 0, coreSkillLevel: 6, ...extra },
          } as SourceBinding,
        ],
      )
      if (typeof expected === "number") {
        const value = ok(prepared)
        expect(attack(value, supply(value))).toBe(expected)
      } else {
        expect(prepared.ok).toBe(false)
        if (!prepared.ok && expected === "MISSING_RANK")
          expect(prepared.issues.some((issue) => issue.code === expected)).toBe(
            true,
          )
      }
    },
  )
})

describe("stable modification aggregation", () => {
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]
  it.each(["configuration", "contribution", "activation"])(
    "aggregates %s modifications in stable ID order",
    (phase) => {
      const values = permutations.map((order) => {
        const target =
          phase === "activation"
            ? {
                ...contribution(),
                activation: {
                  kind: "triggered",
                  trigger: { eventKinds: ["entry"], when: always },
                  lifetime: {
                    kind: "timed",
                    seconds: literal("seconds", 10),
                    clock: "per-layer",
                    onRetrigger: { kind: "keep" },
                    refreshExisting: "none",
                  },
                  layering: {
                    recipientPartition: "individual",
                    keys: [],
                    maximum: literal("count", 1),
                    onRetrigger: "keep-count",
                    atCapacity: "ignore-new-layer",
                  },
                },
              }
            : contribution(undefined, undefined, literal("attack-points", 0))
        const modifiers = [1e16, -1e16, 1].map((value, index) => {
          const { when: _when, ...base } = modification()
          return {
            ...base,
            effectId: `environment:modifier-${index}`,
            phase,
            ...(phase === "configuration" ? {} : { when: always }),
            modifications:
              phase === "activation"
                ? [
                    {
                      field: "duration-seconds",
                      change: {
                        operator: "add",
                        value: literal("seconds", value),
                      },
                    },
                  ]
                : [
                    {
                      field: "output",
                      unit: "attack-points",
                      change: {
                        operator: "add",
                        value: literal("attack-points", value),
                      },
                    },
                  ],
          }
        })
        const prepared = ok(
          prepare(
            [target, ...order.map((index) => modifiers[index])],
            [modifierBinding, targetBinding],
          ),
        )
        const state = supply(prepared)
        if (phase !== "activation") return attack(prepared, state)
        const next = ok(
          advanceEffects(prepared, state, {
            event: {
              kind: "entry",
              eventId: "event:entry",
              atSeconds: 0,
              sequence: 0,
              actorId: holderId,
              entryAction: "chain",
            },
            before: world,
            after: world,
            observedSnapshots: [],
          }),
        ).state
        return ok(
          evaluateEffects(prepared, next, {
            kind: "panel",
            atSeconds: 10.5,
            world,
            observedSnapshots: [],
            entities: [holderId],
            stats: ["attack"],
          }),
        ).attributes[0]!.value.value
      })
      expect(values).toEqual(
        Array(6).fill(phase === "activation" ? 1100 : 1001),
      )
    },
  )
})

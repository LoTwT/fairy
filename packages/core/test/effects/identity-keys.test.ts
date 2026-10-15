import { describe, expect, it } from "vitest"
import {
  advanceEffects,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../../src/effects/index.ts"
import type {
  EffectState,
  PreparedEffects,
  Result,
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
  bindingId: string,
  sourceEntityId: string,
  holder = holderId as string,
) => ({
  kind: "environment",
  bindingId,
  sourceEntityId,
  holderId: holder,
  eligible: true,
  configuration: {},
})
const contribution = (
  effectId: string,
  sourceId: string,
  value: unknown = literal("attack-points", 100),
) => ({
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
})
const timed = {
  kind: "timed",
  seconds: literal("seconds", 10),
  clock: "per-layer",
  onRetrigger: { kind: "keep" },
  refreshExisting: "none",
}
const triggered = (
  lifetime: unknown = timed,
  keys: readonly string[] = [],
) => ({
  kind: "triggered",
  trigger: { eventKinds: ["entry"], when: always },
  lifetime,
  layering: {
    recipientPartition: "selected-set",
    keys,
    maximum: literal("count", 1),
    onRetrigger: "keep-count",
    atCapacity: "ignore-new-layer",
  },
})
const statRead = (entityId: string, stage = "current") => ({
  kind: "stat",
  unit: "attack-points",
  stat: "attack",
  stage,
  at: "evaluation",
  entity: { role: "entity", entityId },
})
function ok<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function prepare(
  effects: readonly unknown[],
  bindings: readonly unknown[],
  states: readonly unknown[] = [],
) {
  return ok(
    prepareEffects(
      ok(
        parseEffectRuleSet({
          schemaVersion: 1,
          ruleSetId: "identity-keys",
          revision: "1",
          effects,
          states,
          actions: [],
        }),
      ),
      bindings as never,
    ),
  )
}
function supplyResult(
  prepared: PreparedEffects,
  instances: readonly unknown[] = [],
) {
  return supplyEffectState(prepared, {
    sessionId: "session:identity-keys",
    atSeconds: 0,
    instances,
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  } as never)
}
function panel(
  prepared: PreparedEffects,
  state: EffectState,
  observed: unknown = world,
  entities: readonly string[] = [holderId],
  atSeconds = 1,
) {
  return evaluateEffects(prepared, state, {
    kind: "panel",
    atSeconds,
    world: observed,
    observedSnapshots: [],
    entities,
    stats: ["attack"],
  } as never)
}
function advance(
  prepared: PreparedEffects,
  state: EffectState,
  observed: unknown = world,
  actorId = holderId as string,
  sequence = 0,
) {
  return advanceEffects(prepared, state, {
    event: {
      kind: "entry",
      eventId: `event:entry-${sequence}`,
      atSeconds: sequence,
      sequence,
      actorId,
      entryAction: "chain",
    },
    before: observed,
    after: observed,
    observedSnapshots: [],
  } as never)
}
function importedInstance(
  effectId: string,
  bindingId: string,
  index: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    instanceId: `instance:${index}`,
    effectId,
    bindingId,
    beneficiaryIds: [holderId],
    stackKey: [],
    lifetime: { kind: "timed", firstActivatedAt: 0 },
    layers: [
      { layerId: `layer:${index}`, startedAt: 0, expiresAt: 10, trigger: null },
    ],
    ...overrides,
  }
}

describe("evaluation identity tuples", () => {
  it("keeps team uniqueness keys separate from team identities containing NUL", () => {
    const holders = ["entity:owner-a", "entity:owner-b"]
    const teams = ["team:y", "team:x\u0000team:y"]
    const keys = ["unique\u0000team:x", "unique"]
    const rules = holders.map((_, index) => ({
      ...contribution(
        `environment:team-${index}`,
        String(index),
        literal("attack-points", (index + 1) * 100),
      ),
      activation: triggered(),
      beneficiary: { kind: "holder-and-trigger-actor" },
      uniqueness: {
        key: keys[index],
        scope: "team",
        select: { kind: "highest-value" },
      },
    }))
    const prepared = prepare(
      rules,
      holders.map((entityId, index) =>
        binding(`binding:${index}`, String(index), entityId),
      ),
    )
    const observed = {
      ...world,
      entities: [
        ...world.entities,
        ...holders.map((entityId, index) => ({
          ...world.entities[0],
          entityId,
          teamId: teams[index],
        })),
      ],
    }
    const state = ok(
      advance(prepared, ok(supplyResult(prepared)), observed),
    ).state
    const result = ok(panel(prepared, state, observed))
    expect(result.attributes[0]!.value.value).toBe(1300)
    expect(result.contributions.map(({ origin }) => origin.effectId)).toEqual(
      rules.map((rule) => rule.effectId),
    )
  })

  it("breaks equal-value uniqueness ties by raw IDs rather than encoded lengths", () => {
    const rules = ["aa", "z"].map((id) => ({
      ...contribution(`environment:${id}`, id),
      uniqueness: {
        key: "one",
        scope: "global",
        select: { kind: "highest-value" },
      },
    }))
    for (const order of [rules, rules.toReversed()]) {
      const prepared = prepare(order, [
        binding("binding:z", "z"),
        binding("binding:aa", "aa"),
      ])
      expect(
        ok(panel(prepared, ok(supplyResult(prepared)))).contributions[0]!.origin
          .bindingId,
      ).toBe("binding:aa")
    }
  })
  it("does not merge sources whose binding/effect tuples contain NUL", () => {
    const identities = [
      {
        effectId: "environment:end",
        bindingId: "binding:left\u0000environment:right",
      },
      {
        effectId: "environment:right\u0000environment:end",
        bindingId: "binding:left",
      },
    ]
    const rules = identities.map(({ effectId }, index) => ({
      ...contribution(
        effectId,
        String(index),
        literal("attack-points", 100 * (index + 1)),
      ),
      uniqueness: {
        key: "only-one",
        scope: "global",
        select: { kind: "highest-value" },
      },
    }))
    const prepared = prepare(
      rules,
      identities.map(({ bindingId }, index) =>
        binding(bindingId, String(index)),
      ),
    )
    const result = ok(panel(prepared, ok(supplyResult(prepared))))
    expect(result.attributes[0]!.value.value).toBe(1200)
    expect(result.contributions.map(({ origin }) => origin.effectId)).toEqual([
      identities[1]!.effectId,
    ])
  })
  it.each([false, true])(
    "keeps continuous effect/binding identities and origins distinct (reverse=%s)",
    (reverse) => {
      const effects = [
        contribution("environment:scope", "first"),
        contribution(
          "environment:scope binding:left",
          "second",
          literal("attack-points", 200),
        ),
      ]
      const bindings = [
        binding("binding:left binding:right", "first"),
        binding("binding:right", "second"),
      ]
      const prepared = prepare(
        reverse ? effects.toReversed() : effects,
        bindings,
      )
      const result = ok(panel(prepared, ok(supplyResult(prepared))))
      expect(result.attributes[0]!.value.value).toBe(1300)
      expect(
        result.contributions.map(({ origin }) => [
          origin.effectId,
          origin.bindingId,
        ]),
      ).toEqual([
        [effects[0]!.effectId, bindings[0]!.bindingId],
        [effects[1]!.effectId, bindings[1]!.bindingId],
      ])
    },
  )

  it("keeps instance/layer boundaries and contribution order under input permutations", () => {
    const rule = {
      ...contribution("environment:supplied", "source"),
      activation: { kind: "supplied", maximumLayers: literal("count", 2) },
    }
    const prepared = prepare([rule], [binding("binding:source", "source")])
    const instances = [
      ["instance:a", "layer:x layer:y"],
      ["instance:a layer:x", "layer:y"],
    ].map(([instanceId, layerId], index) =>
      importedInstance(rule.effectId, "binding:source", index, {
        instanceId,
        lifetime: { kind: "supplied" },
        layers: [{ layerId, startedAt: 0, expiresAt: null, trigger: null }],
      }),
    )
    const results = [instances, instances.toReversed()].map((order) =>
      ok(panel(prepared, ok(supplyResult(prepared, order)))),
    )
    expect(results[0]).toEqual(results[1])
    expect(
      results[0]!.contributions.map(({ origin }) => [
        origin.instanceId,
        origin.layerId,
      ]),
    ).toEqual([
      ["instance:a", "layer:x layer:y"],
      ["instance:a layer:x", "layer:y"],
    ])
    expect(results[0]!.attributes[0]!.value.value).toBe(1200)
  })

  it.each(["current", "final-fixed"])(
    "separates entity and hit boundaries in %s nodes",
    (boundary) => {
      const otherId = `${holderId} attack ${boundary} hit:key`
      const hitId = `hit:key attack ${boundary} -`
      const observed = {
        ...world,
        entities: [
          ...world.entities,
          { ...world.entities[0], entityId: otherId },
        ],
      }
      const base = contribution("environment:hit", "hit", statRead(otherId))
      const target = {
        ...base,
        scope: "hit",
        operation: {
          ...base.operation,
          stage: boundary === "final-fixed" ? "initial-fixed" : "final-fixed",
        },
      }
      const other = contribution(
        "environment:other",
        "other",
        literal("attack-points", 200),
      )
      const prepared = prepare(
        [target, other],
        [
          binding("binding:hit", "hit"),
          binding("binding:other", "other", otherId),
        ],
      )
      const result = ok(
        evaluateEffects(prepared, ok(supplyResult(prepared)), {
          ...syntheticHitQuery,
          world: observed,
          hit: { ...syntheticHitQuery.hit, hitId },
        } as never),
      )
      expect(
        result.attributes.find((attribute) => attribute.stat === "attack")!
          .value.value,
      ).toBe(2200)
      expect(result.contributions.map(({ origin }) => origin.effectId)).toEqual(
        ["environment:hit"],
      )
    },
  )

  it("reports an actual cycle with readable, distinct node identities", () => {
    const effectId = "environment:cycle binding:quoted"
    const bindingId = 'binding:with spaces\u0000and"quotes'
    const prepared = prepare(
      [contribution(effectId, "source", statRead(holderId))],
      [binding(bindingId, "source")],
    )
    const result = panel(prepared, ok(supplyResult(prepared)))
    expect(result.ok).toBe(false)
    if (result.ok) return
    const path = result.issues.find(
      (issue) => issue.code === "DEPENDENCY_CYCLE",
    )!.dependencyPath!
    expect(path[0]).toBe(path.at(-1))
    expect(
      path.some(
        (node) =>
          node.includes(JSON.stringify(effectId)) &&
          node.includes(JSON.stringify(bindingId)),
      ),
    ).toBe(true)
    expect(
      path.some(
        (node) =>
          node.includes("stat") && node.includes(JSON.stringify(holderId)),
      ),
    ).toBe(true)
  })
})

describe("world state identity tuples", () => {
  it("indexes distance pairs containing NUL without sharing or inventing observations", () => {
    const actors = ["entity:a", "entity:a\u0000entity:b"]
    const summons = ["entity:b\u0000entity:c", "entity:c"]
    const rules = actors.map((_, index) => ({
      ...contribution(`environment:distance-${index}`, String(index)),
      when: {
        kind: "within-summon-distance",
        entity: { role: "holder" },
        summonOwner: { role: "holder" },
        summonKinds: ["fixture"],
        maximum: literal("meters", 5),
        at: "evaluation",
      },
    }))
    const prepared = prepare(
      rules,
      actors.map((entityId, index) =>
        binding(`binding:${index}`, String(index), entityId),
      ),
    )
    const observed = {
      ...world,
      entities: [
        ...actors.map((entityId) => ({ ...world.entities[0], entityId })),
        ...summons.map((entityId, index) => ({
          kind: "summon",
          entityId,
          ownerId: actors[index],
          teamId: "team:spec",
          summonKind: "fixture",
          deployed: true,
        })),
      ],
      distances: actors.map((first, index) => ({
        first,
        second: summons[index],
        meters: index === 0 ? 3 : 7,
      })),
    }
    const state = ok(supplyResult(prepared))
    expect(
      ok(panel(prepared, state, observed, actors)).attributes.map(
        (attribute) => attribute.value.value,
      ),
    ).toEqual([1100, 1000])
    expect(
      panel(
        prepared,
        state,
        { ...observed, distances: observed.distances.slice(1) },
        actors,
      ),
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FACT" }),
      ]),
    })
    expect(
      panel(
        prepared,
        state,
        {
          ...observed,
          distances: [
            ...observed.distances,
            { ...observed.distances[0], first: summons[0], second: actors[0] },
          ],
        },
        actors,
      ),
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ID" }),
      ]),
    })
  })
  it("indexes colliding state/binding tuples independently and still rejects actual duplicates", () => {
    const states = [
      {
        stateId: "state:scope",
        source: source("first"),
        parameters: {},
        input: "observed",
      },
      {
        stateId: "state:scope binding:left",
        source: source("second"),
        parameters: {},
        input: "observed",
      },
    ]
    const bindings = [
      binding("binding:left binding:right", "first"),
      binding("binding:right", "second"),
    ]
    const effects = states.map((state, index) => ({
      ...contribution(
        `environment:state-${index}`,
        index === 0 ? "first" : "second",
        literal("attack-points", index === 0 ? 100 : 200),
      ),
      when: {
        kind: "state-is",
        stateId: state.stateId,
        owner: { role: "holder" },
        at: "evaluation",
        active: true,
      },
    }))
    const prepared = prepare(effects, bindings, states)
    const observations = states.map((state, index) => ({
      stateId: state.stateId,
      bindingId: bindings[index]!.bindingId,
      ownerId: holderId,
      active: index === 0,
      activationId: index === 0 ? "state-activation:first" : null,
      since: index === 0 ? 0 : null,
    }))
    const state = ok(supplyResult(prepared))
    const observed = { ...world, states: observations }
    expect(
      ok(panel(prepared, state, observed)).attributes[0]!.value.value,
    ).toBe(1100)
    const missing = panel(prepared, state, {
      ...observed,
      states: observations.slice(0, 1),
    })
    expect(missing).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FACT" }),
      ]),
    })
    const duplicate = panel(prepared, state, {
      ...observed,
      states: [...observations, observations[0]],
    })
    expect(duplicate).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ID" }),
      ]),
    })
  })
})

describe("configuration fold identity tuples", () => {
  it.each(["effect", "state"])(
    "keeps holder/%s folds containing NUL separate",
    (kind) => {
      const prefix = kind === "effect" ? "environment" : "state"
      const holders = [`entity:a\u0000${prefix}:b`, "entity:a"]
      const targets = [`${prefix}:c`, `${prefix}:b\u0000${prefix}:c`]
      const definitions = targets.map((id, index) =>
        kind === "effect"
          ? contribution(id, `source-${index}`)
          : {
              stateId: id,
              source: source(`source-${index}`),
              parameters: {
                amount: { kind: "constant", unit: "count", value: 1 },
              },
              input: "observed",
            },
      )
      const modifiers = targets.map((id, index) => ({
        kind: "modification",
        effectId: `environment:modifier-${index}`,
        source: source(`modifier-${index}`),
        config: always,
        parameters: {},
        phase: "configuration",
        target:
          kind === "effect" ? { kind, effectId: id } : { kind, stateId: id },
        modifications: [
          {
            field: kind === "effect" ? "output" : "parameter",
            ...(kind === "state" ? { name: "amount" } : {}),
            unit: kind === "effect" ? "attack-points" : "count",
            change: {
              operator: "add",
              value: literal(
                kind === "effect" ? "attack-points" : "count",
                (index + 1) * 100,
              ),
            },
          },
        ],
      }))
      const bindings = holders.flatMap((entityId, index) => [
        binding(`binding:source-${index}`, `source-${index}`, entityId),
        binding(`binding:modifier-${index}`, `modifier-${index}`, entityId),
      ])
      const prepared = prepare(
        kind === "effect" ? [...definitions, ...modifiers] : modifiers,
        bindings,
        kind === "state" ? definitions : [],
      )
      if (kind === "state") {
        expect(
          prepared.stateParameters.map(
            (entry) => entry.parameters["amount"]!.value,
          ),
        ).toEqual([101, 201])
      } else {
        const observed = {
          ...world,
          entities: holders.map((entityId) => ({
            ...world.entities[0],
            entityId,
          })),
        }
        expect(
          ok(
            panel(prepared, ok(supplyResult(prepared)), observed, holders),
          ).attributes.map((attribute) => attribute.value.value),
        ).toEqual([1200, 1300])
      }
    },
  )
})

describe("cooldown composite identities", () => {
  it("keeps length-encoded partition tuples distinct when joined to arbitrary group IDs", () => {
    const secondPartition = "7:binding9:binding:b"
    const firstBinding = `binding:a ${secondPartition}`
    const firstPartition = `7:binding${firstBinding.length}:${firstBinding}`
    const cooldowns = [
      { groupId: "cooldown", partitionKey: firstPartition, availableAt: 2 },
      {
        groupId: `cooldown 7:binding${firstBinding.length}:binding:a`,
        partitionKey: secondPartition,
        availableAt: 5,
      },
    ]
    const rules = cooldowns.map((cooldown, index) => ({
      ...contribution(
        `environment:cooldown-${index}`,
        String(index),
        literal("attack-points", (index + 1) * 100),
      ),
      activation: {
        ...triggered(),
        layering: {
          ...triggered().layering,
          maximum: literal("count", 2),
          onRetrigger: "add-layer",
        },
        trigger: {
          eventKinds: ["entry"],
          when: always,
          cooldown: {
            groupId: cooldown.groupId,
            partition: "binding",
            seconds: literal("seconds", cooldown.availableAt),
          },
        },
      },
    }))
    const prepared = prepare(rules, [
      binding(firstBinding, "0"),
      binding("binding:b", "1"),
    ])
    const imported = ok(
      supplyEffectState(prepared, {
        sessionId: "session:cooldowns",
        atSeconds: 0,
        instances: [],
        snapshots: [],
        cooldowns,
        eventHistory: { processedIds: [], last: null },
      }),
    )
    expect(
      ok(panel(prepared, ok(advance(prepared, imported)).state)).attributes[0]!
        .value.value,
    ).toBe(1000)
    const next = ok(advance(prepared, ok(supplyResult(prepared)))).state
    expect(ok(panel(prepared, next)).attributes[0]!.value.value).toBe(1300)
    const blocked = ok(advance(prepared, next, world, holderId, 1)).state
    expect(ok(panel(prepared, blocked)).attributes[0]!.value.value).toBe(1300)
    const firstReady = ok(advance(prepared, blocked, world, holderId, 2)).state
    expect(
      ok(panel(prepared, firstReady, world, [holderId], 2)).attributes[0]!.value
        .value,
    ).toBe(1400)
  })
})

describe("instance group identity tuples", () => {
  it("keeps generated instance and layer IDs stable while distinguishing recipient sets", () => {
    const rule = {
      ...contribution("environment:team", "source"),
      activation: triggered(),
      beneficiary: { kind: "team" },
    }
    const prepared = prepare([rule], [binding("binding:source", "source")])
    const empty = ok(supplyResult(prepared))
    const results = [["entity:a", "entity:b"], ["entity:a entity:b"]].map(
      (members) => {
        const observed = {
          ...world,
          entities: [
            world.entities[0],
            ...members.map((entityId) => ({ ...world.entities[0], entityId })),
          ],
        }
        const input = ok(advance(prepared, empty, observed))
        const output = ok(panel(prepared, input.state, observed))
        const reordered = ok(
          advance(prepared, empty, {
            ...observed,
            entities: observed.entities.toReversed(),
          }),
        )
        expect(
          ok(panel(prepared, reordered.state, observed)).contributions,
        ).toEqual(output.contributions)
        return output.contributions[0]!.origin
      },
    )
    expect(results[0]!.instanceId).not.toBe(results[1]!.instanceId)
    expect(results[0]!.layerId).not.toBe(results[1]!.layerId)
  })
  it.each(
    ["timed", "state-bound"].flatMap((kind) =>
      ["import", "advance"].map((mode) => ({ kind, mode })),
    ),
  )(
    "keeps colliding effect/binding groups independent during $mode of $kind layers",
    ({ kind, mode }) => {
      const stateDefinition = {
        stateId: "state:active",
        source: source("first"),
        parameters: {},
        input: "observed",
      }
      const lifetime =
        kind === "timed"
          ? timed
          : {
              kind,
              stateId: stateDefinition.stateId,
              stateOwner: { role: "holder" },
            }
      const rules = [
        {
          ...contribution("environment:scope", "first"),
          activation: triggered(lifetime),
        },
        {
          ...contribution(
            "environment:scope binding:left",
            "second",
            literal("attack-points", 200),
          ),
          activation: triggered(lifetime),
        },
      ]
      const bindings = [
        binding("binding:left binding:right", "first"),
        binding("binding:right", "second"),
      ]
      const prepared = prepare(
        rules,
        bindings,
        kind === "timed" ? [] : [stateDefinition],
      )
      const observed =
        kind === "timed"
          ? world
          : {
              ...world,
              states: [
                {
                  stateId: stateDefinition.stateId,
                  bindingId: bindings[0]!.bindingId,
                  ownerId: holderId,
                  active: true,
                  activationId: "state-activation:active",
                  since: 0,
                },
              ],
            }
      const instances = rules.map((rule, index) =>
        importedInstance(
          rule.effectId,
          bindings[index]!.bindingId,
          index,
          kind === "timed"
            ? {}
            : {
                lifetime: {
                  kind,
                  stateId: stateDefinition.stateId,
                  stateOwnerId: holderId,
                  stateActivationId: "state-activation:active",
                },
                layers: [
                  {
                    layerId: `layer:${index}`,
                    startedAt: 0,
                    expiresAt: null,
                    trigger: null,
                  },
                ],
              },
        ),
      )
      if (mode === "import") {
        const imported = ok(supplyResult(prepared, instances))
        expect(
          ok(panel(prepared, imported, observed)).attributes[0]!.value.value,
        ).toBe(1300)
        return
      }
      const empty = ok(supplyResult(prepared))
      const transitioned = ok(advance(prepared, empty, observed)).state
      const evaluated = ok(panel(prepared, transitioned, observed))
      expect(evaluated.attributes[0]!.value.value).toBe(1300)
      expect(evaluated.contributions).toHaveLength(2)
      expect(
        ok(panel(prepared, empty, observed)).attributes[0]!.value.value,
      ).toBe(1000)
      expect(ok(advance(prepared, empty, observed))).toEqual(
        ok(advance(prepared, empty, observed)),
      )
    },
  )

  it.each(["beneficiary members", "beneficiary/stack boundary"])(
    "preserves %s when importing groups",
    (boundary) => {
      const keys = boundary === "beneficiary members" ? [] : ["trigger-actor"]
      const rule = {
        ...contribution("environment:sets", "source"),
        activation: triggered(timed, keys),
      }
      const prepared = prepare([rule], [binding("binding:source", "source")])
      const groups =
        boundary === "beneficiary members"
          ? [
              { beneficiaryIds: ["entity:a", "entity:b"], stackKey: [] },
              { beneficiaryIds: ["entity:a entity:b"], stackKey: [] },
            ]
          : [
              { beneficiaryIds: ["entity:a"], stackKey: ["entity:b entity:c"] },
              { beneficiaryIds: ["entity:a entity:b"], stackKey: ["entity:c"] },
            ]
      const instances = groups.map((group, index) =>
        importedInstance(rule.effectId, "binding:source", index, group),
      )
      const state = ok(supplyResult(prepared, instances))
      const entities = [
        ...new Set(groups.flatMap((group) => group.beneficiaryIds)),
      ]
      const observed = {
        ...world,
        entities: entities.map((entityId) => ({
          ...world.entities[0],
          entityId,
        })),
      }
      expect(
        ok(panel(prepared, state, observed, entities)).attributes.map(
          (attribute) => attribute.value.value,
        ),
      ).toEqual(entities.map(() => 1100))
      const duplicateGroup = supplyResult(prepared, [
        ...instances,
        importedInstance(rule.effectId, "binding:source", 2, groups[0]),
      ])
      expect(duplicateGroup).toMatchObject({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_INPUT" }),
        ]),
      })
    },
  )

  it("preserves state owner/activation boundaries when advancing lifecycle groups", () => {
    const definition = {
      stateId: "state:active",
      source: source("source"),
      parameters: {},
      input: "observed",
    }
    const rule = {
      ...contribution("environment:state", "source"),
      activation: triggered({
        kind: "state-bound",
        stateId: definition.stateId,
        stateOwner: { role: "triggerActor" },
      }),
    }
    const prepared = prepare(
      [rule],
      [binding("binding:source", "source")],
      [definition],
    )
    const identities = [
      {
        stateOwnerId: "entity:a",
        stateActivationId: "state-activation:x state-activation:y",
      },
      {
        stateOwnerId: "entity:a state-activation:x",
        stateActivationId: "state-activation:y",
      },
    ]
    const observed = {
      ...world,
      entities: [
        ...world.entities,
        ...identities.map(({ stateOwnerId }) => ({
          ...world.entities[0],
          entityId: stateOwnerId,
        })),
      ],
      states: identities.map(({ stateOwnerId, stateActivationId }) => ({
        stateId: definition.stateId,
        bindingId: "binding:source",
        ownerId: stateOwnerId,
        active: true,
        activationId: stateActivationId,
        since: 0,
      })),
    }
    const first = ok(
      advance(
        prepared,
        ok(supplyResult(prepared)),
        observed,
        identities[0]!.stateOwnerId,
      ),
    ).state
    const second = ok(
      advance(prepared, first, observed, identities[1]!.stateOwnerId, 1),
    ).state
    expect(
      ok(panel(prepared, second, observed)).attributes[0]!.value.value,
    ).toBe(1200)
  })
})

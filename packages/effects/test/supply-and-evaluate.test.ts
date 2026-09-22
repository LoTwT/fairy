import { describe, expect, it } from "vitest"
import {
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../src/index.ts"
import type {
  AttributeObservation,
  EffectState,
  EntityId,
  EvaluationInput,
  PreparedEffects,
  SourceBinding,
  StateInput,
} from "../src/index.ts"
import {
  astraCoreNumericCases,
  exampleRuleSet,
  exampleWorld,
  suppliedAstraState,
  syntheticBinding,
  syntheticRuleSet,
  syntheticWorld,
} from "../../../docs/specs/effects/contract-examples.ts"
import { reorderObjectKeys } from "./fixtures.ts"

function prepareSynthetic(): PreparedEffects {
  const parsed = parseEffectRuleSet(syntheticRuleSet)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error("synthetic rule set must parse")
  }
  const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  return prepared.value
}

function astraWorld(holderInitialAttack: number) {
  return {
    ...exampleWorld,
    entities: exampleWorld.entities.map((entity) =>
      entity.entityId === "entity:astra" && entity.kind === "actor"
        ? {
            ...entity,
            generalStats: {
              attack: {
                baseValue: holderInitialAttack,
                initialPercentage: [],
                initialFixed: [],
                finalPercentage: [],
                finalFixed: [],
              },
            },
          }
        : entity,
    ),
  }
}

const astraBinding = (mindscapeRank: number, coreSkillLevel: number) =>
  ({
    kind: "agent",
    bindingId: "binding:astra",
    holderId: "entity:astra",
    sourceEntityId: "1311",
    eligible: true,
    configuration: { mindscapeRank, coreSkillLevel },
  }) as SourceBinding

function prepareAstra(
  mindscapeRank: number,
  coreSkillLevel = 7,
): PreparedEffects {
  const parsed = parseEffectRuleSet(exampleRuleSet)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error("example rule set must parse")
  }
  const prepared = prepareEffects(parsed.value, [
    astraBinding(mindscapeRank, coreSkillLevel),
  ])
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  return prepared.value
}

function supplyAstraState(
  prepared: PreparedEffects,
  holderInitialAttack: number,
  sessionId: string,
): EffectState {
  const world = astraWorld(holderInitialAttack)
  const input: StateInput = {
    ...suppliedAstraState,
    sessionId: sessionId as `session:${string}`,
    snapshots: [
      { snapshotId: "snapshot:entry", atSeconds: 0, attributes: [], world },
    ],
  }
  const state = supplyEffectState(prepared, input)
  expect(state.ok).toBe(true)
  if (!state.ok) {
    throw new Error("state supply must succeed")
  }
  return state.value
}

function evaluateAstraPanel(
  prepared: PreparedEffects,
  state: EffectState,
  holderInitialAttack: number,
): Exclude<ReturnType<typeof evaluateEffects>, { ok: false }>["value"] {
  const result = evaluateEffects(prepared, state, {
    kind: "panel",
    atSeconds: 0,
    world: astraWorld(holderInitialAttack),
    observedSnapshots: [],
    entities: ["entity:attacker"],
    stats: ["attack"],
  } as EvaluationInput)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error("evaluation must succeed")
  }
  return result.value
}

/** 快照属性记录；用于重复身份与快照内容比较用例。 */
function attackAttribute(
  entityId: EntityId,
  value: number,
  stage: "initial" | "current" = "initial",
): AttributeObservation {
  return {
    entityId,
    stat: "attack",
    stage,
    value: { unit: "attack-points", value },
  }
}

function astraContributionValue(
  mindscapeRank: number,
  coreSkillLevel: number,
  holderInitialAttack: number,
): number {
  const prepared = prepareAstra(mindscapeRank, coreSkillLevel)
  const state = supplyAstraState(
    prepared,
    holderInitialAttack,
    `session:astra-${mindscapeRank}-${coreSkillLevel}-${holderInitialAttack}`,
  )
  const result = evaluateAstraPanel(prepared, state, holderInitialAttack)
  const contribution = result.contributions.find(
    (entry) =>
      entry.address.kind === "stat" &&
      entry.address.stat === "attack" &&
      entry.address.stage === "final-fixed",
  )
  expect(contribution).toBeDefined()
  return contribution!.value.value
}

describe("astra core numeric acceptance matrix", () => {
  for (const numericCase of astraCoreNumericCases) {
    for (const mindscapeRank of [0, 1, 2, 3, 4, 5, 6] as const) {
      it(`case ${numericCase.caseId} at mindscape ${mindscapeRank}`, () => {
        const value = astraContributionValue(
          mindscapeRank,
          numericCase.coreSkillLevel,
          numericCase.holderInitialAttack,
        )
        const expected =
          mindscapeRank <= 1
            ? numericCase.expectedBaseAttackBonus
            : numericCase.expectedEnhancedAttackBonus
        expect(Math.abs(value - expected)).toBeLessThanOrEqual(1e-9)
      })
    }
  }
})

describe("astra panel query", () => {
  it("contributes 1600 once at M2 and the beneficiary reaches 3600", () => {
    const prepared = prepareAstra(2)
    const state = supplyAstraState(prepared, 3000, "session:astra-m2")
    const result = evaluateAstraPanel(prepared, state, 3000)
    const attack = result.attributes.find(
      (attribute) =>
        attribute.entityId === "entity:attacker" && attribute.stat === "attack",
    )
    expect(attack?.value.value).toBeCloseTo(3600, 9)
    const astraContributions = result.contributions.filter(
      (contribution) =>
        contribution.origin.effectId === "agent:1311:core:attack-conversion",
    )
    expect(astraContributions).toHaveLength(1)
    expect(astraContributions[0]!.value.value).toBeCloseTo(1600, 9)
    expect(astraContributions[0]!.appliedModifications).toEqual([
      "agent:1311:mindscape-2:core-enhancement",
    ])
    expect(astraContributions[0]!.address).toMatchObject({
      kind: "stat",
      stat: "attack",
      stage: "final-fixed",
      entityId: "entity:attacker",
      hitId: null,
    })
  })

  it("contributes 1050 at M1 and the beneficiary reaches 3050", () => {
    const prepared = prepareAstra(1)
    const state = supplyAstraState(prepared, 3000, "session:astra-m1")
    const result = evaluateAstraPanel(prepared, state, 3000)
    const attack = result.attributes.find(
      (attribute) =>
        attribute.entityId === "entity:attacker" && attribute.stat === "attack",
    )
    expect(attack?.value.value).toBeCloseTo(3050, 9)
    const astraContributions = result.contributions.filter(
      (contribution) =>
        contribution.origin.effectId === "agent:1311:core:attack-conversion",
    )
    expect(astraContributions).toHaveLength(1)
    expect(astraContributions[0]!.value.value).toBeCloseTo(1050, 9)
    expect(astraContributions[0]!.appliedModifications).toEqual([])
  })

  it("repeated queries on the same state produce the same result", () => {
    const prepared = prepareAstra(2)
    const state = supplyAstraState(prepared, 3000, "session:astra-repeat")
    const first = evaluateAstraPanel(prepared, state, 3000)
    const second = evaluateAstraPanel(prepared, state, 3000)
    expect(second).toEqual(first)
  })
})

describe("cross-preparation isolation", () => {
  it("an old state is rejected against a new preparation result", () => {
    const preparedM2 = prepareAstra(2)
    const preparedM1 = prepareAstra(1)
    const stateM2 = supplyAstraState(preparedM2, 3000, "session:astra-iso")
    const mismatch = evaluateEffects(preparedM1, stateM2, {
      kind: "panel",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(mismatch.ok).toBe(false)
    if (!mismatch.ok) {
      expect(
        mismatch.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    }
  })
})

describe("missing facts and snapshots", () => {
  it("reports a missing snapshot instead of substituting current values", () => {
    const prepared = prepareAstra(2)
    const input: StateInput = {
      ...suppliedAstraState,
      snapshots: [],
    }
    const state = supplyEffectState(prepared, input)
    expect(state.ok).toBe(false)
    if (!state.ok) {
      expect(
        state.issues.some((issue) => issue.code === "MISSING_SNAPSHOT"),
      ).toBe(true)
    }
  })

  it("reports a missing raw stat instead of defaulting to zero", () => {
    const prepared = prepareAstra(2)
    const state = supplyAstraState(prepared, 3000, "session:astra-missing")
    const result = evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 0,
      world: {
        ...exampleWorld,
        entities: exampleWorld.entities.filter(
          (entity) => entity.entityId !== "entity:astra",
        ),
      },
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })
})

describe("layer expiry filtering", () => {
  it("filters expired supplied layers at the query time", () => {
    const prepared = prepareAstra(2)
    const world = astraWorld(3000)
    const input: StateInput = {
      ...suppliedAstraState,
      sessionId: "session:astra-expired",
      atSeconds: 10,
      instances: [
        {
          ...suppliedAstraState.instances[0]!,
          layers: [
            {
              ...suppliedAstraState.instances[0]!.layers[0]!,
              startedAt: 0,
              expiresAt: 5,
            },
          ],
        },
      ],
      snapshots: [
        { snapshotId: "snapshot:entry", atSeconds: 0, attributes: [], world },
      ],
    }
    const state = supplyEffectState(prepared, input)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared, state.value, {
      kind: "panel",
      atSeconds: 10,
      world,
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const attack = result.value.attributes.find(
      (attribute) => attribute.stat === "attack",
    )
    expect(attack?.value.value).toBeCloseTo(2000, 9)
    expect(
      result.value.contributions.filter(
        (contribution) =>
          contribution.origin.effectId === "agent:1311:core:attack-conversion",
      ),
    ).toHaveLength(0)
  })

  it("keeps the layer active exactly until its expiry", () => {
    const prepared = prepareAstra(2)
    const world = astraWorld(3000)
    const input: StateInput = {
      ...suppliedAstraState,
      sessionId: "session:astra-boundary",
      atSeconds: 5,
      instances: [
        {
          ...suppliedAstraState.instances[0]!,
          layers: [
            {
              ...suppliedAstraState.instances[0]!.layers[0]!,
              startedAt: 0,
              expiresAt: 5,
            },
          ],
        },
      ],
      snapshots: [
        { snapshotId: "snapshot:entry", atSeconds: 0, attributes: [], world },
      ],
      eventHistory: {
        processedIds: ["event:entry-followup"],
        last: {
          eventId: "event:entry-followup",
          atSeconds: 0,
          sequence: 0,
        },
      },
    }
    const state = supplyEffectState(prepared, input)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const atBoundary = evaluateEffects(prepared, state.value, {
      kind: "panel",
      atSeconds: 5,
      world,
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(atBoundary.ok).toBe(true)
    if (!atBoundary.ok) {
      throw new Error("evaluation must succeed")
    }
    expect(
      atBoundary.value.contributions.filter(
        (contribution) =>
          contribution.origin.effectId === "agent:1311:core:attack-conversion",
      ),
    ).toHaveLength(0)
  })
})

describe("state import validation", () => {
  const prepared = prepareAstra(2)

  it("rejects instances whose rule is not an active contribution under the binding", () => {
    const bad: StateInput = {
      ...suppliedAstraState,
      instances: [
        {
          ...suppliedAstraState.instances[0]!,
          effectId: "agent:1211:core:penetration-conversion",
        },
      ],
    }
    const result = supplyEffectState(prepared, bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    }
  })

  it("rejects timed layers without an expiry", () => {
    const parsed = parseEffectRuleSet(exampleRuleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("example rule set must parse")
    }
    const woodpeckerPrepared = prepareEffects(parsed.value, [
      astraBinding(2, 7),
      {
        kind: "drive-disc",
        bindingId: "binding:woodpecker",
        holderId: "entity:attacker",
        sourceEntityId: "31000",
        eligible: true,
        configuration: { setPieces: 4 },
      },
    ])
    expect(woodpeckerPrepared.ok).toBe(true)
    if (!woodpeckerPrepared.ok) {
      throw new Error("prepare must succeed")
    }
    const woodpeckerState: StateInput = {
      sessionId: "session:woodpecker",
      atSeconds: 1,
      instances: [
        {
          instanceId: "instance:woodpecker-basic",
          effectId: "disc:31000:four-piece:attack",
          bindingId: "binding:woodpecker",
          beneficiaryIds: ["entity:attacker"],
          stackKey: ["basic"],
          lifetime: { kind: "timed", firstActivatedAt: 1 },
          layers: [
            {
              layerId: "layer:woodpecker-basic",
              startedAt: 1,
              expiresAt: null,
              trigger: {
                eventId: "event:basic-critical",
                actorId: "entity:attacker",
                skillCategory: "basic",
                activationSnapshotId: "snapshot:basic-critical",
              },
            },
          ],
        },
      ],
      snapshots: [
        {
          snapshotId: "snapshot:basic-critical",
          atSeconds: 1,
          attributes: [],
          world: exampleWorld,
        },
      ],
      cooldowns: [],
      eventHistory: {
        processedIds: ["event:basic-critical"],
        last: { eventId: "event:basic-critical", atSeconds: 1, sequence: 0 },
      },
    }
    const result = supplyEffectState(woodpeckerPrepared.value, woodpeckerState)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.pointer.includes("expiresAt")),
      ).toBe(true)
    }
  })

  it("rejects a stack key that does not match the declared layering keys", () => {
    const parsed = parseEffectRuleSet(exampleRuleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("example rule set must parse")
    }
    const woodpeckerPrepared = prepareEffects(parsed.value, [
      {
        kind: "drive-disc",
        bindingId: "binding:woodpecker",
        holderId: "entity:attacker",
        sourceEntityId: "31000",
        eligible: true,
        configuration: { setPieces: 4 },
      },
    ])
    expect(woodpeckerPrepared.ok).toBe(true)
    if (!woodpeckerPrepared.ok) {
      throw new Error("prepare must succeed")
    }
    const woodpeckerState: StateInput = {
      sessionId: "session:woodpecker-stack",
      atSeconds: 1,
      instances: [
        {
          instanceId: "instance:woodpecker-basic",
          effectId: "disc:31000:four-piece:attack",
          bindingId: "binding:woodpecker",
          beneficiaryIds: ["entity:attacker"],
          stackKey: [],
          lifetime: { kind: "timed", firstActivatedAt: 1 },
          layers: [
            {
              layerId: "layer:woodpecker-basic",
              startedAt: 1,
              expiresAt: 7,
              trigger: {
                eventId: "event:basic-critical",
                actorId: "entity:attacker",
                skillCategory: "basic",
                activationSnapshotId: "snapshot:basic-critical",
              },
            },
          ],
        },
      ],
      snapshots: [
        {
          snapshotId: "snapshot:basic-critical",
          atSeconds: 1,
          attributes: [],
          world: exampleWorld,
        },
      ],
      cooldowns: [],
      eventHistory: {
        processedIds: ["event:basic-critical"],
        last: { eventId: "event:basic-critical", atSeconds: 1, sequence: 0 },
      },
    }
    const result = supplyEffectState(woodpeckerPrepared.value, woodpeckerState)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.pointer.includes("stackKey")),
      ).toBe(true)
    }
  })
})

describe("configuration expressions in state import", () => {
  const timedEffectId = "environment:spec:timed-effect"

  function prepareWithLayerMaximum(maximum: unknown) {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: Record<string, unknown>[]
    }
    const timed = ruleSet.effects.find(
      (effect) => effect["effectId"] === timedEffectId,
    )!
    const activation = timed["activation"] as {
      layering: { maximum: unknown }
    }
    activation.layering.maximum = maximum
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    return prepared.value
  }

  function supplyLayers(prepared: PreparedEffects, count: number) {
    return supplyEffectState(prepared, {
      sessionId: "session:spec-layer-limit",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:spec-layer-limit",
          effectId: timedEffectId,
          bindingId: "binding:spec",
          beneficiaryIds: ["entity:spec"],
          stackKey: [],
          lifetime: { kind: "timed", firstActivatedAt: 0 },
          layers: Array.from({ length: count }, (_, index) => ({
            layerId: `layer:spec-layer-limit-${index}`,
            startedAt: 0,
            expiresAt: 10,
            trigger: null,
          })),
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    } as never)
  }

  it("counts imported layers against an arithmetic layer maximum", () => {
    const prepared = prepareWithLayerMaximum({
      kind: "add",
      unit: "count",
      operands: [
        { kind: "literal", unit: "count", value: 1 },
        { kind: "literal", unit: "count", value: 1 },
      ],
    })
    expect(supplyLayers(prepared, 2).ok).toBe(true)
    const over = supplyLayers(prepared, 3)
    expect(over.ok).toBe(false)
    if (!over.ok) {
      expect(over.issues.some((issue) => issue.code === "INVALID_INPUT")).toBe(
        true,
      )
    }
  })

  it("rejects a layer maximum that is not a positive integer", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: Record<string, unknown>[]
    }
    const timed = ruleSet.effects.find(
      (effect) => effect["effectId"] === timedEffectId,
    )!
    const activation = timed["activation"] as { layering: { maximum: unknown } }
    activation.layering.maximum = { kind: "literal", unit: "count", value: 0 }
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(false)
  })
})

function deepFreezeValue(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return
  }
  Object.freeze(value)
  for (const nested of Object.values(value)) {
    deepFreezeValue(nested)
  }
}

function syntheticImportInput() {
  return {
    sessionId: "session:spec-import-ownership",
    atSeconds: 0,
    instances: [
      {
        instanceId: "instance:spec-import",
        effectId: "environment:spec:timed-effect",
        bindingId: "binding:spec",
        beneficiaryIds: ["entity:spec"],
        stackKey: [],
        lifetime: { kind: "timed", firstActivatedAt: 0 },
        layers: [
          {
            layerId: "layer:spec-import",
            startedAt: 0,
            expiresAt: 20,
            trigger: null,
          },
        ],
      },
    ],
    snapshots: [
      {
        snapshotId: "snapshot:spec-import",
        atSeconds: 0,
        attributes: [],
        world: structuredClone(syntheticWorld),
      },
    ],
    cooldowns: [
      {
        groupId: "spec-import",
        partitionKey: "6:global6:global",
        availableAt: 5,
      },
    ],
    eventHistory: {
      processedIds: ["event:spec-import"],
      last: { eventId: "event:spec-import", atSeconds: 0, sequence: 0 },
    },
  }
}

describe("state import ownership", () => {
  it("does not freeze caller state inputs", () => {
    const prepared = prepareSynthetic()
    const input = syntheticImportInput()
    const result = supplyEffectState(prepared, input as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("state supply must succeed")
    }
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.instances[0])).toBe(false)
    expect(Object.isFrozen(input.instances[0]!.layers)).toBe(false)
    expect(Object.isFrozen(input.instances[0]!.layers[0])).toBe(false)
    expect(Object.isFrozen(input.snapshots[0])).toBe(false)
    expect(Object.isFrozen(input.cooldowns[0])).toBe(false)
    expect(Object.isFrozen(input.eventHistory)).toBe(false)
    expect(Object.isFrozen(input.eventHistory.last)).toBe(false)
  })

  it("keeps its own copy of imported layers", () => {
    const prepared = prepareSynthetic()
    const input = syntheticImportInput()
    const result = supplyEffectState(prepared, input as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("state supply must succeed")
    }
    // 调用方随后修改原始层不影响已经导入的状态。
    input.instances[0]!.layers[0]!.expiresAt = 1
    const evaluation = evaluateEffects(prepared, result.value, {
      kind: "panel",
      atSeconds: 10,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(evaluation.ok).toBe(true)
    if (!evaluation.ok) {
      throw new Error("panel evaluation must succeed")
    }
    expect(
      evaluation.value.attributes.find(
        (attribute) => attribute.stat === "attack",
      )?.value.value,
    ).toBeCloseTo(1100, 9)
  })

  it("accepts deeply frozen state inputs", () => {
    const prepared = prepareSynthetic()
    const input = syntheticImportInput()
    deepFreezeValue(input)
    const result = supplyEffectState(prepared, input as never)
    expect(result.ok).toBe(true)
  })
})

describe("snapshot attribute identity", () => {
  const entrySnapshot = (
    attributes: readonly unknown[],
    snapshotId = "snapshot:entry",
  ) => ({
    snapshotId,
    atSeconds: 0,
    attributes,
    world: astraWorld(3000),
  })

  function supplyWithSnapshots(
    sessionId: string,
    snapshots: readonly unknown[],
  ) {
    return supplyEffectState(prepareAstra(2), {
      ...suppliedAstraState,
      sessionId,
      snapshots,
    } as never)
  }

  it("rejects two attribute records with one identity in a single snapshot", () => {
    const result = supplyWithSnapshots("session:duplicate-attributes", [
      entrySnapshot([
        attackAttribute("entity:astra", 1000),
        attackAttribute("entity:astra", 2000),
      ]),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("state supply must fail")
    }
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "DUPLICATE_ID" &&
          issue.pointer === "/snapshots/0/attributes/1",
      ),
    ).toBe(true)
  })

  it("rejects duplicate attribute identities even when the values match", () => {
    const result = supplyWithSnapshots("session:duplicate-attribute-values", [
      entrySnapshot([
        attackAttribute("entity:astra", 1000),
        attackAttribute("entity:astra", 1000),
      ]),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("state supply must fail")
    }
    expect(result.issues.some((issue) => issue.code === "DUPLICATE_ID")).toBe(
      true,
    )
  })

  it("rejects duplicate attribute identities regardless of record order", () => {
    const result = supplyWithSnapshots("session:duplicate-attribute-order", [
      entrySnapshot([
        attackAttribute("entity:astra", 2000),
        attackAttribute("entity:astra", 1000),
      ]),
    ])
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("state supply must fail")
    }
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "DUPLICATE_ID" &&
          issue.pointer === "/snapshots/0/attributes/1",
      ),
    ).toBe(true)
  })

  it("leaves the caller input untouched when a snapshot is rejected", () => {
    const input = {
      ...suppliedAstraState,
      sessionId: "session:duplicate-attributes-ownership",
      snapshots: [
        entrySnapshot([
          attackAttribute("entity:astra", 1000),
          attackAttribute("entity:astra", 2000),
        ]),
      ],
    }
    const before = structuredClone(input)
    const result = supplyEffectState(prepareAstra(2), input as never)
    expect(result.ok).toBe(false)
    expect(input).toEqual(before)
  })

  it("keeps distinct entities, stats, and legal stages in one snapshot", () => {
    const result = supplyWithSnapshots("session:distinct-attributes", [
      entrySnapshot([
        attackAttribute("entity:astra", 3000),
        attackAttribute("entity:attacker", 2000),
        attackAttribute("entity:astra", 3000, "current"),
        {
          entityId: "entity:astra",
          stat: "criticalRate",
          stage: "current",
          value: { unit: "ratio", value: 0.05 },
        },
      ]),
    ])
    expect(result.ok).toBe(true)
  })

  it("rejects duplicates in query snapshots and keeps the recorded state usable", () => {
    const prepared = prepareAstra(2)
    const state = supplyAstraState(prepared, 3000, "session:duplicate-query")
    const query = {
      kind: "panel",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [
        entrySnapshot(
          [
            attackAttribute("entity:astra", 1000),
            attackAttribute("entity:astra", 2000),
          ],
          "snapshot:duplicate-query",
        ),
      ],
      entities: ["entity:attacker"],
      stats: ["attack"],
    }
    const failed = evaluateEffects(prepared, state, query as never)
    expect(failed.ok).toBe(false)
    if (failed.ok) {
      throw new Error("query must fail")
    }
    expect(
      failed.issues.some(
        (issue) =>
          issue.code === "DUPLICATE_ID" &&
          issue.pointer === "/observedSnapshots/0/attributes/1",
      ),
    ).toBe(true)
    // 失败不修改已有状态：同一状态上的合法查询仍然成立。
    const after = evaluateEffects(prepared, state, {
      ...query,
      observedSnapshots: [],
    } as never)
    expect(after.ok).toBe(true)
    if (!after.ok) {
      throw new Error("query must succeed")
    }
    expect(
      after.value.attributes.find((attribute) => attribute.stat === "attack")
        ?.value.value,
    ).toBeCloseTo(3600, 9)
  })
})

describe("snapshot content comparison", () => {
  const entryAttributes = [
    {
      entityId: "entity:astra",
      stat: "attack",
      stage: "initial",
      value: { unit: "attack-points", value: 3000 },
    },
    {
      entityId: "entity:attacker",
      stat: "attack",
      stage: "initial",
      value: { unit: "attack-points", value: 2000 },
    },
  ]

  const entrySnapshot = () => ({
    snapshotId: "snapshot:entry",
    atSeconds: 0,
    attributes: structuredClone(entryAttributes),
    world: astraWorld(3000),
  })

  function sessionWithEntrySnapshot(sessionId: string): {
    prepared: PreparedEffects
    state: EffectState
  } {
    const prepared = prepareAstra(2)
    const supplied = supplyEffectState(prepared, {
      ...suppliedAstraState,
      sessionId,
      snapshots: [entrySnapshot()],
    } as never)
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    return { prepared, state: supplied.value }
  }

  function astraPanelQuery(observedSnapshots: readonly unknown[]) {
    return {
      kind: "panel",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots,
      entities: ["entity:attacker"],
      stats: ["attack"],
    }
  }

  it("accepts a repeated snapshot whose object keys are ordered differently", () => {
    const { prepared, state } = sessionWithEntrySnapshot(
      "session:snapshot-key-order",
    )
    const repeated = reorderObjectKeys(entrySnapshot())
    // 内容相同、序列化不同：确认测试数据只改变了键顺序。
    expect(JSON.stringify(repeated)).not.toBe(JSON.stringify(entrySnapshot()))
    const canonical = evaluateEffects(
      prepared,
      state,
      astraPanelQuery([entrySnapshot()]) as never,
    )
    expect(canonical.ok).toBe(true)
    if (!canonical.ok) {
      throw new Error("canonical query must succeed")
    }
    const shuffled = evaluateEffects(
      prepared,
      state,
      astraPanelQuery([repeated]) as never,
    )
    expect(shuffled.ok).toBe(true)
    if (!shuffled.ok) {
      throw new Error("reordered query must succeed")
    }
    expect(shuffled.value).toEqual(canonical.value)
    expect(
      shuffled.value.attributes.find((attribute) => attribute.stat === "attack")
        ?.value.value,
    ).toBeCloseTo(3600, 9)
  })

  it("still rejects a recorded snapshot whose content changed", () => {
    const { prepared, state } = sessionWithEntrySnapshot(
      "session:snapshot-content-conflict",
    )
    const changedTime = evaluateEffects(
      prepared,
      state,
      astraPanelQuery([{ ...entrySnapshot(), atSeconds: 1 }]) as never,
    )
    expect(changedTime.ok).toBe(false)
    if (changedTime.ok) {
      throw new Error("query must fail")
    }
    expect(
      changedTime.issues.some(
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.pointer === "/observedSnapshots",
      ),
    ).toBe(true)
    const changedAttribute = structuredClone(entrySnapshot())
    changedAttribute.attributes[0]!.value.value = 3001
    const nested = evaluateEffects(
      prepared,
      state,
      astraPanelQuery([changedAttribute]) as never,
    )
    expect(nested.ok).toBe(false)
    if (nested.ok) {
      throw new Error("query must fail")
    }
    expect(
      nested.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    ).toBe(true)
    // 冲突不会覆盖旧快照：同一状态用原快照查询仍得到原结果。
    const canonical = evaluateEffects(
      prepared,
      state,
      astraPanelQuery([entrySnapshot()]) as never,
    )
    expect(canonical.ok).toBe(true)
    if (!canonical.ok) {
      throw new Error("canonical query must succeed")
    }
    expect(
      canonical.value.attributes.find(
        (attribute) => attribute.stat === "attack",
      )?.value.value,
    ).toBeCloseTo(3600, 9)
  })

  it("treats array order as part of snapshot content", () => {
    const { prepared, state } = sessionWithEntrySnapshot(
      "session:snapshot-array-order",
    )
    const reversed = entrySnapshot()
    reversed.attributes = reversed.attributes.toReversed()
    const result = evaluateEffects(
      prepared,
      state,
      astraPanelQuery([reversed]) as never,
    )
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("query must fail")
    }
    expect(
      result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    ).toBe(true)
  })
})

describe("evaluation input validation", () => {
  function astraSession(sessionId: string): {
    prepared: PreparedEffects
    state: EffectState
  } {
    const prepared = prepareAstra(2)
    return { prepared, state: supplyAstraState(prepared, 3000, sessionId) }
  }

  const panelInput = (overrides: Record<string, unknown> = {}) => ({
    kind: "panel",
    atSeconds: 0,
    world: astraWorld(3000),
    observedSnapshots: [],
    entities: ["entity:attacker"],
    stats: ["attack"],
    ...overrides,
  })

  it("rejects beneficiary entries that are not entity identities", () => {
    const { prepared, state } = astraSession(
      "session:query-invalid-beneficiary",
    )
    const result = evaluateEffects(prepared, state, {
      kind: "contributions",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
      beneficiaries: [null],
    } as never)
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("query must fail")
    }
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" &&
          issue.pointer === "/beneficiaries/0",
      ),
    ).toBe(true)
  })

  it("rejects panel entities that are not entity identities", () => {
    const { prepared, state } = astraSession("session:query-invalid-entity")
    const result = evaluateEffects(
      prepared,
      state,
      panelInput({ entities: ["entity:attacker", "attacker"] }) as never,
    )
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("query must fail")
    }
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" && issue.pointer === "/entities/1",
      ),
    ).toBe(true)
  })

  it("rejects panel stats outside the registered stat set", () => {
    const { prepared, state } = astraSession("session:query-invalid-stat")
    const result = evaluateEffects(
      prepared,
      state,
      panelInput({ stats: ["attack", "attackPoints"] }) as never,
    )
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("query must fail")
    }
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" && issue.pointer === "/stats/1",
      ),
    ).toBe(true)
  })

  it("rejects unknown fields on the evaluation input", () => {
    const { prepared, state } = astraSession("session:query-unknown-field")
    const result = evaluateEffects(
      prepared,
      state,
      panelInput({ unsupportedField: true }) as never,
    )
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("query must fail")
    }
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" &&
          issue.pointer === "/unsupportedField",
      ),
    ).toBe(true)
  })

  it("rejects fields belonging to another query branch", () => {
    const { prepared, state } = astraSession("session:query-branch-fields")
    const hit = evaluateEffects(prepared, state, {
      kind: "hit",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
      hit: {},
      entities: ["entity:attacker"],
      beneficiaries: ["entity:attacker"],
    } as never)
    expect(hit.ok).toBe(false)
    if (hit.ok) {
      throw new Error("hit query must fail")
    }
    expect(
      hit.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" && issue.pointer === "/entities",
      ),
    ).toBe(true)
    expect(
      hit.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" && issue.pointer === "/beneficiaries",
      ),
    ).toBe(true)
    const panel = evaluateEffects(
      prepared,
      state,
      panelInput({ hit: {} }) as never,
    )
    expect(panel.ok).toBe(false)
    if (panel.ok) {
      throw new Error("panel query must fail")
    }
    expect(
      panel.issues.some(
        (issue) => issue.code === "INVALID_INPUT" && issue.pointer === "/hit",
      ),
    ).toBe(true)
    const contributions = evaluateEffects(prepared, state, {
      kind: "contributions",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
      beneficiaries: ["entity:attacker"],
      entities: ["entity:attacker"],
    } as never)
    expect(contributions.ok).toBe(false)
    if (contributions.ok) {
      throw new Error("contributions query must fail")
    }
    expect(
      contributions.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" && issue.pointer === "/entities",
      ),
    ).toBe(true)
  })

  it("requires the fields of the selected branch", () => {
    const { prepared, state } = astraSession("session:query-missing-fields")
    const panel = evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
      entities: ["entity:attacker"],
    } as never)
    expect(panel.ok).toBe(false)
    if (panel.ok) {
      throw new Error("panel query must fail")
    }
    expect(
      panel.issues.some(
        (issue) => issue.code === "INVALID_INPUT" && issue.pointer === "/stats",
      ),
    ).toBe(true)
    const hit = evaluateEffects(prepared, state, {
      kind: "hit",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
    } as never)
    expect(hit.ok).toBe(false)
    if (hit.ok) {
      throw new Error("hit query must fail")
    }
    expect(
      hit.issues.some(
        (issue) => issue.code === "INVALID_INPUT" && issue.pointer === "/hit",
      ),
    ).toBe(true)
    const contributions = evaluateEffects(prepared, state, {
      kind: "contributions",
      atSeconds: 0,
      world: astraWorld(3000),
      observedSnapshots: [],
    } as never)
    expect(contributions.ok).toBe(false)
    if (contributions.ok) {
      throw new Error("contributions query must fail")
    }
    expect(
      contributions.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" && issue.pointer === "/beneficiaries",
      ),
    ).toBe(true)
  })

  it("keeps reading only the facts the query needs", () => {
    const { prepared, state } = astraSession("session:query-on-demand")
    const attackerOnlyWorld = {
      ...astraWorld(3000),
      entities: astraWorld(3000).entities.filter(
        (entity) => entity.entityId === "entity:attacker",
      ),
    }
    const result = evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 0,
      world: attackerOnlyWorld,
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["criticalRate"],
    } as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("panel query must succeed")
    }
    expect(
      result.value.attributes.find(
        (attribute) => attribute.stat === "criticalRate",
      )?.value.value,
    ).toBeCloseTo(0.05, 9)
  })

  it("keeps accepting repeated query entries", () => {
    const { prepared, state } = astraSession("session:query-repeated-entries")
    const result = evaluateEffects(
      prepared,
      state,
      panelInput({
        entities: ["entity:attacker", "entity:attacker"],
        stats: ["attack", "attack"],
      }) as never,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("panel query must succeed")
    }
    expect(
      result.value.attributes.filter(
        (attribute) => attribute.stat === "attack",
      ),
    ).toHaveLength(1)
  })
})

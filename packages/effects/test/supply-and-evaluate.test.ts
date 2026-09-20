import { describe, expect, it } from "vitest"
import {
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../src/index.ts"
import type {
  EffectState,
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
} from "../../../docs/specs/effects/contract-examples.ts"

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

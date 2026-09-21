import { describe, expect, it } from "vitest"
import {
  advanceEffects,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../src/index.ts"
import type {
  EffectState,
  EventRequest,
  PreparedEffects,
  TransitionInput,
} from "../src/index.ts"
import { readStateInternal } from "../src/internal/state.ts"
import {
  exampleBindings,
  exampleRuleSet,
  exampleWorld,
  stateBeforeReentry,
  stateReentryTransition,
  syntheticBinding,
  syntheticRuleSet,
  syntheticState,
  syntheticWorld,
} from "../../../docs/specs/effects/contract-examples.ts"

const always = { kind: "constant", value: true } as const

function prepareFrom(ruleSet: unknown, bindings: unknown): PreparedEffects {
  const parsed = parseEffectRuleSet(ruleSet)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error("rule set must parse")
  }
  const prepared = prepareEffects(parsed.value, bindings as never)
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  return prepared.value
}

function prepareSynthetic(): PreparedEffects {
  return prepareFrom(syntheticRuleSet, [syntheticBinding])
}

function prepareExamples(): PreparedEffects {
  return prepareFrom(exampleRuleSet, [...exampleBindings])
}

function syntheticSession(atSeconds = 0): {
  prepared: PreparedEffects
  state: EffectState
} {
  const prepared = prepareSynthetic()
  const supplied = supplyEffectState(prepared, {
    sessionId: "session:spec-advance",
    atSeconds,
    instances: [],
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  expect(supplied.ok).toBe(true)
  if (!supplied.ok) {
    throw new Error("state supply must succeed")
  }
  return { prepared, state: supplied.value }
}

function entryEvent(
  atSeconds: number,
  sequence: number,
  eventId: string,
): TransitionInput {
  return {
    event: {
      kind: "entry",
      eventId,
      atSeconds,
      sequence,
      actorId: syntheticBinding.holderId,
      entryAction: "chain",
    },
    before: syntheticWorld,
    after: syntheticWorld,
    observedSnapshots: [],
  } as unknown as TransitionInput
}

function stateObservedEvent(options: {
  atSeconds: number
  sequence: number
  eventId: string
  activationId: string | null
  since?: number
}): TransitionInput {
  const observation = {
    stateId: syntheticState.stateId,
    bindingId: syntheticBinding.bindingId,
    ownerId: syntheticBinding.holderId,
    active: options.activationId !== null,
    activationId: options.activationId,
    since:
      options.activationId === null
        ? null
        : (options.since ?? options.atSeconds),
  }
  const world = {
    ...syntheticWorld,
    states: [observation],
  }
  return {
    event: {
      kind: "state-observed",
      eventId: options.eventId,
      atSeconds: options.atSeconds,
      sequence: options.sequence,
      actorId: syntheticBinding.holderId,
      observation,
    },
    before: syntheticWorld,
    after: world,
    observedSnapshots: [],
  } as unknown as TransitionInput
}

function panelAttack(
  prepared: PreparedEffects,
  state: EffectState,
  atSeconds: number,
  world: unknown = syntheticWorld,
): {
  value: number
  contributions: {
    instanceId: string | null
    layerId: string | null
    value: number
  }[]
} {
  const result = evaluateEffects(prepared, state, {
    kind: "panel",
    atSeconds,
    world,
    observedSnapshots: [],
    entities: [syntheticBinding.holderId],
    stats: ["attack"],
  } as never)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error("panel evaluation must succeed")
  }
  const attribute = result.value.attributes.find(
    (entry) =>
      entry.entityId === syntheticBinding.holderId && entry.stat === "attack",
  )
  expect(attribute).toBeDefined()
  return {
    value: attribute!.value.value,
    contributions: result.value.contributions.map((contribution) => ({
      instanceId: contribution.origin.instanceId,
      layerId: contribution.origin.layerId,
      value: contribution.value.value,
    })),
  }
}

/** 克隆合成规则集并定向调整限时规则的时长与时钟策略。 */
function syntheticTimingVariant(options: {
  seconds?: number
  onRetrigger?: Record<string, unknown>
}): ReturnType<typeof structuredClone> {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: Record<string, unknown>[]
  }
  ruleSet.effects = ruleSet.effects.filter(
    (effect) => effect["effectId"] !== "environment:spec:conditional-duration",
  )
  const timed = ruleSet.effects.find(
    (effect) => effect["effectId"] === "environment:spec:timed-effect",
  ) as Record<string, unknown>
  const activation = timed["activation"] as Record<string, unknown>
  const lifetime = activation["lifetime"] as Record<string, unknown>
  if (options.seconds !== undefined) {
    lifetime["seconds"] = {
      kind: "literal",
      unit: "seconds",
      value: options.seconds,
    }
  }
  if (options.onRetrigger !== undefined) {
    lifetime["onRetrigger"] = options.onRetrigger
  }
  return ruleSet
}

/** 在克隆规则集中加入读取激活时点攻击力的状态绑定规则。 */
function syntheticReentryVariant(): ReturnType<typeof structuredClone> {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: Record<string, unknown>[]
  }
  ruleSet.effects.push({
    kind: "contribution",
    effectId: "environment:spec:state-bound-attack-read",
    source: structuredClone(syntheticRuleSet.effects[0]!["source"]),
    config: always,
    parameters: {},
    beneficiary: { kind: "holder" },
    scope: "entity",
    when: always,
    activation: {
      kind: "triggered",
      trigger: { eventKinds: ["state-observed"], when: always },
      lifetime: {
        kind: "state-bound",
        stateId: syntheticState.stateId,
        stateOwner: { role: "holder" },
      },
      layering: {
        recipientPartition: "individual",
        keys: [],
        maximum: { kind: "literal", unit: "count", value: 1 },
        onRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      },
    },
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "stat",
        unit: "attack-points",
        entity: { role: "holder" },
        stat: "attack",
        stage: "current",
        at: "activation",
      },
    },
  })
  return ruleSet
}

/** 克隆规则集，给状态绑定规则加冷却。 */
function syntheticStateBoundCooldownVariant(): ReturnType<
  typeof structuredClone
> {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: Record<string, unknown>[]
  }
  ruleSet.effects = ruleSet.effects.filter(
    (effect) => effect["effectId"] !== "environment:spec:conditional-duration",
  )
  const bound = ruleSet.effects.find(
    (effect) => effect["effectId"] === "environment:spec:state-bound-effect",
  ) as Record<string, unknown>
  const activation = bound["activation"] as Record<string, unknown>
  const trigger = activation["trigger"] as Record<string, unknown>
  trigger["cooldown"] = {
    groupId: "state-bound-cooldown",
    partition: "binding",
    seconds: { kind: "literal", unit: "seconds", value: 5 },
  }
  return ruleSet
}

describe("advanceEffects lifecycle acceptance", () => {
  it("creates a timed layer on entry and expires it on schedule", () => {
    const prepared = prepareFrom(syntheticTimingVariant({}), [syntheticBinding])
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:spec-baseline",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const advanced = advanceEffects(
      prepared,
      supplied.value,
      entryEvent(0, 0, "event:spec-entry-1"),
    )
    expect(advanced.ok).toBe(true)
    if (!advanced.ok) {
      throw new Error("advance must succeed")
    }
    expect(advanced.value.requests).toEqual([])
    expect(panelAttack(prepared, advanced.value.state, 9.9).value).toBe(1100)
    expect(panelAttack(prepared, advanced.value.state, 10).value).toBe(1000)
  })

  it("applies the activation duration modification only while the condition holds", () => {
    const activeWorlds = entryEvent(0, 0, "event:spec-entry-active")
    const { prepared, state } = syntheticSession()
    const advanced = advanceEffects(prepared, state, activeWorlds)
    expect(advanced.ok).toBe(true)
    if (!advanced.ok) {
      throw new Error("advance must succeed")
    }
    expect(panelAttack(prepared, advanced.value.state, 15.4).value).toBe(1100)
    expect(panelAttack(prepared, advanced.value.state, 15.5).value).toBe(1000)

    const inactiveBefore = {
      ...syntheticWorld,
      states: [
        {
          stateId: syntheticState.stateId,
          bindingId: syntheticBinding.bindingId,
          ownerId: syntheticBinding.holderId,
          active: false,
          activationId: null,
          since: null,
        },
      ],
    } as unknown as typeof syntheticWorld
    const { prepared: preparedIdle, state: stateIdle } = syntheticSession()
    const idle = advanceEffects(preparedIdle, stateIdle, {
      ...activeWorlds,
      before: inactiveBefore,
      after: inactiveBefore,
    })
    expect(idle.ok).toBe(true)
    if (!idle.ok) {
      throw new Error("advance must succeed")
    }
    expect(panelAttack(preparedIdle, idle.value.state, 9.9).value).toBe(1100)
    expect(panelAttack(preparedIdle, idle.value.state, 10).value).toBe(1000)
  })

  it("updates the clock per the extend, since-first-activation, and refresh tables", () => {
    const cases: readonly {
      readonly name: string
      readonly onRetrigger: Record<string, unknown>
      readonly expiresAt: number
    }[] = [
      {
        name: "extend with remaining cap",
        onRetrigger: {
          kind: "extend",
          limit: {
            kind: "remaining",
            maximum: { kind: "literal", unit: "seconds", value: 30 },
          },
        },
        expiresAt: 40,
      },
      {
        name: "extend with first-activation cap",
        onRetrigger: {
          kind: "extend",
          limit: {
            kind: "since-first-activation",
            maximum: { kind: "literal", unit: "seconds", value: 30 },
          },
        },
        expiresAt: 30,
      },
      {
        name: "refresh",
        onRetrigger: { kind: "refresh" },
        expiresAt: 35,
      },
    ]
    for (const testCase of cases) {
      const ruleSet = syntheticTimingVariant({
        seconds: 20,
        onRetrigger: testCase.onRetrigger,
      })
      const prepared = prepareFrom(ruleSet, [syntheticBinding])
      const supplied = supplyEffectState(prepared, {
        sessionId: "session:spec-clock",
        atSeconds: 0,
        instances: [],
        snapshots: [],
        cooldowns: [],
        eventHistory: { processedIds: [], last: null },
      })
      expect(supplied.ok).toBe(true)
      if (!supplied.ok) {
        throw new Error("state supply must succeed")
      }
      const first = advanceEffects(
        prepared,
        supplied.value,
        entryEvent(0, 0, `event:${testCase.name}-1`),
      )
      expect(first.ok).toBe(true)
      if (!first.ok) {
        throw new Error("first advance must succeed")
      }
      const second = advanceEffects(
        prepared,
        first.value.state,
        entryEvent(15, 0, `event:${testCase.name}-2`),
      )
      expect(second.ok).toBe(true)
      if (!second.ok) {
        throw new Error("second advance must succeed")
      }
      const before = panelAttack(
        prepared,
        second.value.state,
        testCase.expiresAt - 0.1,
      )
      expect(before.value, testCase.name).toBe(1100)
      expect(before.contributions, testCase.name).toHaveLength(1)
      const after = panelAttack(
        prepared,
        second.value.state,
        testCase.expiresAt,
      )
      expect(after.value, testCase.name).toBe(1000)
    }
  })

  it("rebuilds the group when the retrigger lands exactly at expiry", () => {
    const ruleSet = syntheticTimingVariant({
      seconds: 6,
      onRetrigger: {
        kind: "extend",
        limit: {
          kind: "since-first-activation",
          maximum: { kind: "literal", unit: "seconds", value: 10 },
        },
      },
    })
    const prepared = prepareFrom(ruleSet, [syntheticBinding])
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:spec-boundary",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const first = advanceEffects(
      prepared,
      supplied.value,
      entryEvent(0, 0, "event:spec-boundary-1"),
    )
    expect(first.ok).toBe(true)
    if (!first.ok) {
      throw new Error("first advance must succeed")
    }
    const exact = advanceEffects(
      prepared,
      first.value.state,
      entryEvent(6, 0, "event:spec-boundary-2"),
    )
    expect(exact.ok).toBe(true)
    if (!exact.ok) {
      throw new Error("boundary advance must succeed")
    }
    const rebuilt = panelAttack(prepared, exact.value.state, 6.5)
    expect(rebuilt.value).toBe(1100)
    expect(rebuilt.contributions).toHaveLength(1)
    const extended = advanceEffects(
      prepared,
      exact.value.state,
      entryEvent(7, 0, "event:spec-boundary-3"),
    )
    expect(extended.ok).toBe(true)
    if (!extended.ok) {
      throw new Error("third advance must succeed")
    }
    // 新组锚点为 6：min(12 + 6, 6 + 10) = 16；若沿用旧锚点则为 10。
    expect(panelAttack(prepared, extended.value.state, 15.9).value).toBe(1100)
    expect(panelAttack(prepared, extended.value.state, 16).value).toBe(1000)
  })

  it("refreshes a full group without adding layers or changing the activation snapshot", () => {
    const ruleSet = syntheticTimingVariant({
      seconds: 10,
      onRetrigger: { kind: "refresh" },
    })
    const prepared = prepareFrom(ruleSet, [syntheticBinding])
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:spec-refresh",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const first = advanceEffects(
      prepared,
      supplied.value,
      entryEvent(0, 0, "event:spec-refresh-1"),
    )
    expect(first.ok).toBe(true)
    if (!first.ok) {
      throw new Error("first advance must succeed")
    }
    const firstPanel = panelAttack(prepared, first.value.state, 1)
    expect(firstPanel.value).toBe(1100)
    const second = advanceEffects(
      prepared,
      first.value.state,
      entryEvent(4, 0, "event:spec-refresh-2"),
    )
    expect(second.ok).toBe(true)
    if (!second.ok) {
      throw new Error("second advance must succeed")
    }
    const secondPanel = panelAttack(prepared, second.value.state, 5)
    expect(secondPanel.value).toBe(1100)
    expect(secondPanel.contributions).toHaveLength(1)
    expect(secondPanel.contributions[0]!.layerId).toBe(
      firstPanel.contributions[0]!.layerId,
    )
    expect(panelAttack(prepared, second.value.state, 13.9).value).toBe(1100)
    expect(panelAttack(prepared, second.value.state, 14).value).toBe(1000)
  })
})

describe("advanceEffects reentry acceptance", () => {
  function prepareReentry(): PreparedEffects {
    return prepareFrom(syntheticReentryVariant(), [syntheticBinding])
  }

  it("freezes the pre-event panel into the new layer's activation snapshot", () => {
    const prepared = prepareReentry()
    const supplied = supplyEffectState(prepared, stateBeforeReentry as never)
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const advanced = advanceEffects(
      prepared,
      supplied.value,
      stateReentryTransition as never,
    )
    expect(advanced.ok).toBe(true)
    if (!advanced.ok) {
      throw new Error("reentry advance must succeed")
    }
    const panel = evaluateEffects(prepared, advanced.value.state, {
      kind: "panel",
      atSeconds: 1,
      world: (
        stateReentryTransition as unknown as { after: typeof syntheticWorld }
      ).after,
      observedSnapshots: [],
      entities: [syntheticBinding.holderId],
      stats: ["attack"],
    } as never)
    expect(panel.ok).toBe(true)
    if (!panel.ok) {
      throw new Error("panel must succeed")
    }
    // 1000（基础）+ 100（新状态绑定层）+ 1100（读取规则引用事件前快照）。
    const attribute = panel.value.attributes.find(
      (entry) =>
        entry.entityId === syntheticBinding.holderId && entry.stat === "attack",
    )
    expect(attribute?.value.value).toBe(2200)
    const readContribution = panel.value.contributions.find(
      (contribution) =>
        contribution.origin.effectId ===
        "environment:spec:state-bound-attack-read",
    )
    expect(readContribution?.value.value).toBe(1100)
  })

  it("keeps the layer identity when the same activation is retriggered", () => {
    const prepared = prepareSynthetic()
    const supplied = supplyEffectState(prepared, stateBeforeReentry as never)
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const before = evaluateEffects(prepared, supplied.value, {
      kind: "panel",
      atSeconds: 0,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: [syntheticBinding.holderId],
      stats: ["attack"],
    } as never)
    expect(before.ok).toBe(true)
    if (!before.ok) {
      throw new Error("panel must succeed")
    }
    const originalLayer = before.value.contributions[0]?.origin.layerId
    const advanced = advanceEffects(
      prepared,
      supplied.value,
      stateObservedEvent({
        atSeconds: 1,
        sequence: 0,
        eventId: "event:spec-same-activation",
        activationId: "state-activation:spec-a",
        since: 0,
      }),
    )
    expect(advanced.ok).toBe(true)
    if (!advanced.ok) {
      throw new Error("advance must succeed")
    }
    const after = evaluateEffects(prepared, advanced.value.state, {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: [syntheticBinding.holderId],
      stats: ["attack"],
    } as never)
    expect(after.ok).toBe(true)
    if (!after.ok) {
      throw new Error("panel must succeed")
    }
    expect(
      after.value.attributes.find((entry) => entry.stat === "attack")?.value
        .value,
    ).toBe(1100)
    expect(after.value.contributions).toHaveLength(1)
    expect(after.value.contributions[0]?.origin.layerId).toBe(originalLayer)
  })

  it("removes only the old group when the retrigger is blocked by cooldown", () => {
    const prepared = prepareFrom(syntheticStateBoundCooldownVariant(), [
      syntheticBinding,
    ])
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:spec-cooldown-block",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const opened = advanceEffects(
      prepared,
      supplied.value,
      stateObservedEvent({
        atSeconds: 0,
        sequence: 0,
        eventId: "event:spec-open",
        activationId: "state-activation:spec-a",
        since: 0,
      }),
    )
    expect(opened.ok).toBe(true)
    if (!opened.ok) {
      throw new Error("open advance must succeed")
    }
    expect(panelAttack(prepared, opened.value.state, 0.5).value).toBe(1100)
    const reentered = advanceEffects(
      prepared,
      opened.value.state,
      stateObservedEvent({
        atSeconds: 1,
        sequence: 0,
        eventId: "event:spec-blocked-reentry",
        activationId: "state-activation:spec-b",
        since: 1,
      }),
    )
    expect(reentered.ok).toBe(true)
    if (!reentered.ok) {
      throw new Error("blocked advance must succeed")
    }
    expect(panelAttack(prepared, reentered.value.state, 1.5).value).toBe(1000)
    const atExpiry = advanceEffects(
      prepared,
      reentered.value.state,
      stateObservedEvent({
        atSeconds: 5,
        sequence: 0,
        eventId: "event:spec-after-cooldown",
        activationId: "state-activation:spec-b",
        since: 1,
      }),
    )
    expect(atExpiry.ok).toBe(true)
    if (!atExpiry.ok) {
      throw new Error("cooldown-expiry advance must succeed")
    }
    const specBWorld = {
      ...syntheticWorld,
      states: [
        {
          stateId: syntheticState.stateId,
          bindingId: syntheticBinding.bindingId,
          ownerId: syntheticBinding.holderId,
          active: true,
          activationId: "state-activation:spec-b",
          since: 1,
        },
      ],
    } as unknown as typeof syntheticWorld
    expect(
      panelAttack(prepared, atExpiry.value.state, 5.5, specBWorld).value,
    ).toBe(1100)
  })
})

const energyRequests = (
  requests: readonly EventRequest[],
): readonly EventRequest[] =>
  requests.filter((request) => request.kind === "resource-generation")
const actionRequests = (
  requests: readonly EventRequest[],
): readonly EventRequest[] =>
  requests.filter((request) => request.kind === "action-request")

function teammateEntry(
  atSeconds: number,
  sequence: number,
  eventId: string,
): TransitionInput {
  return {
    event: {
      kind: "entry",
      eventId,
      atSeconds,
      sequence,
      actorId: "entity:attacker",
      entryAction: "quick-assist",
    },
    before: exampleWorld,
    after: exampleWorld,
    observedSnapshots: [],
  } as unknown as TransitionInput
}

function requestSummary(requests: readonly EventRequest[]): string[] {
  return requests
    .map((request) =>
      [
        request.kind,
        request.effectId,
        request.beneficiaryId,
        "actionId" in request ? request.actionId : "",
        "count" in request ? String(request.count) : "",
        "baseAmount" in request ? String(request.baseAmount.value) : "",
      ].join(" "),
    )
    .toSorted()
}

describe("advanceEffects request and cooldown acceptance", () => {
  function exampleSession(): { prepared: PreparedEffects; state: EffectState } {
    const prepared = prepareExamples()
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:example-advance",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    return { prepared, state: supplied.value }
  }

  it("emits one request per action and one per beneficiary from a teammate entry", () => {
    const { prepared, state } = exampleSession()
    const advanced = advanceEffects(
      prepared,
      state,
      teammateEntry(0, 0, "event:example-entry-1"),
    )
    expect(advanced.ok).toBe(true)
    if (!advanced.ok) {
      throw new Error("advance must succeed")
    }
    expect(advanced.value.requests).toHaveLength(3)
    expect(requestSummary(advanced.value.requests)).toEqual([
      "action-request agent:1311:mindscape-2:entry-actions entity:astra action:astra:tone-cluster 3 ",
      "action-request agent:1311:mindscape-2:entry-actions entity:astra action:astra:tremolo 1 ",
      "resource-generation w-engine:14131:energy-on-entry entity:astra   5",
    ])
    expect(advanced.value.requests.map((request) => request.requestId)).toEqual(
      advanced.value.requests.map((request) => request.requestId).toSorted(),
    )
    for (const request of advanced.value.requests) {
      if (request.kind === "action-request") {
        expect(request.triggerSnapshotId.startsWith("snapshot:")).toBe(true)
      }
    }
  })

  it("blocks before the energy cooldown expires and accepts at the boundary", () => {
    const early = exampleSession()
    const openedEarly = advanceEffects(
      early.prepared,
      early.state,
      teammateEntry(0, 0, "event:example-energy-1"),
    )
    expect(openedEarly.ok).toBe(true)
    if (!openedEarly.ok) {
      throw new Error("first advance must succeed")
    }
    expect(energyRequests(openedEarly.value.requests)).toHaveLength(1)
    const blocked = advanceEffects(
      early.prepared,
      openedEarly.value.state,
      teammateEntry(4.999, 1, "event:example-energy-early"),
    )
    expect(blocked.ok).toBe(true)
    if (!blocked.ok) {
      throw new Error("early advance must succeed")
    }
    expect(energyRequests(blocked.value.requests)).toEqual([])
    expect(actionRequests(blocked.value.requests)).toHaveLength(2)

    const boundary = exampleSession()
    const openedBoundary = advanceEffects(
      boundary.prepared,
      boundary.state,
      teammateEntry(0, 0, "event:example-energy-2"),
    )
    expect(openedBoundary.ok).toBe(true)
    if (!openedBoundary.ok) {
      throw new Error("first advance must succeed")
    }
    const accepted = advanceEffects(
      boundary.prepared,
      openedBoundary.value.state,
      teammateEntry(5, 1, "event:example-energy-boundary"),
    )
    expect(accepted.ok).toBe(true)
    if (!accepted.ok) {
      throw new Error("boundary advance must succeed")
    }
    expect(energyRequests(accepted.value.requests)).toHaveLength(1)
    expect(actionRequests(accepted.value.requests)).toHaveLength(2)
  })

  it("returns identical states and request IDs when the same old state advances twice", () => {
    const { prepared, state } = exampleSession()
    const first = advanceEffects(
      prepared,
      state,
      teammateEntry(0, 0, "event:example-entry-1"),
    )
    expect(first.ok).toBe(true)
    if (!first.ok) {
      throw new Error("first advance must succeed")
    }
    const repeated = advanceEffects(
      prepared,
      state,
      teammateEntry(0, 0, "event:example-entry-1"),
    )
    expect(repeated.ok).toBe(true)
    if (!repeated.ok) {
      throw new Error("repeat advance must succeed")
    }
    expect(repeated.value.requests).toEqual(first.value.requests)
    expect(
      evaluateEffects(prepared, repeated.value.state, {
        kind: "panel",
        atSeconds: 1,
        world: exampleWorld,
        observedSnapshots: [],
        entities: ["entity:astra"],
        stats: ["attack"],
      } as never),
    ).toEqual(
      evaluateEffects(prepared, first.value.state, {
        kind: "panel",
        atSeconds: 1,
        world: exampleWorld,
        observedSnapshots: [],
        entities: ["entity:astra"],
        stats: ["attack"],
      } as never),
    )
    const replay = advanceEffects(
      prepared,
      first.value.state,
      teammateEntry(0, 0, "event:example-entry-1"),
    )
    expect(replay.ok).toBe(false)
    if (replay.ok) {
      throw new Error("replay must fail")
    }
    expect(replay.issues.some((issue) => issue.code === "EVENT_ORDER")).toBe(
      true,
    )
  })
})

describe("advanceEffects hit and stack-key acceptance", () => {
  function exampleSession(): { prepared: PreparedEffects; state: EffectState } {
    const prepared = prepareExamples()
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:example-woodpecker",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    return { prepared, state: supplied.value }
  }

  function criticalHit(options: {
    atSeconds: number
    sequence: number
    eventId: string
    actorId: string
    skillCategory: string
  }): TransitionInput {
    const hit = {
      hitId: `hit:${options.eventId}`,
      actionInstanceId: `action-instance:${options.eventId}`,
      actionId: "action:spec:basic",
      actorId: options.actorId,
      targetId: "entity:spec-target",
      skillCategory: options.skillCategory,
      actionSnapshotId: `snapshot:${options.eventId}`,
      origin: { kind: "direct" },
      damageItems: [{ itemId: "main", damageMultiplier: 1, stat: "attack" }],
    }
    const world = {
      ...exampleWorld,
      entities: exampleWorld.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === options.actorId
          ? entity
          : entity,
      ),
    }
    return {
      event: {
        kind: "hit-resolved",
        eventId: options.eventId,
        atSeconds: options.atSeconds,
        sequence: options.sequence,
        actorId: options.actorId,
        hit,
        isCriticalHit: true,
      },
      before: world,
      after: world,
      observedSnapshots: [
        {
          snapshotId: `snapshot:${options.eventId}`,
          atSeconds: options.atSeconds,
          attributes: [],
          world,
        },
      ],
    } as unknown as TransitionInput
  }

  it("stacks woodpecker layers per skill category and ignores teammate crits", () => {
    const { prepared, state } = exampleSession()
    const ownBasic = advanceEffects(
      prepared,
      state,
      criticalHit({
        atSeconds: 1,
        sequence: 0,
        eventId: "event:woodpecker-own-basic",
        actorId: "entity:attacker",
        skillCategory: "basic",
      }),
    )
    expect(ownBasic.ok).toBe(true)
    if (!ownBasic.ok) {
      throw new Error("own basic advance must succeed")
    }
    const teammateBasic = advanceEffects(
      prepared,
      ownBasic.value.state,
      criticalHit({
        atSeconds: 2,
        sequence: 0,
        eventId: "event:woodpecker-teammate-basic",
        actorId: "entity:astra",
        skillCategory: "basic",
      }),
    )
    expect(teammateBasic.ok).toBe(true)
    if (!teammateBasic.ok) {
      throw new Error("teammate advance must succeed")
    }
    const ownDodgeCounter = advanceEffects(
      prepared,
      teammateBasic.value.state,
      criticalHit({
        atSeconds: 3,
        sequence: 0,
        eventId: "event:woodpecker-own-dodge",
        actorId: "entity:attacker",
        skillCategory: "dodge-counter",
      }),
    )
    expect(ownDodgeCounter.ok).toBe(true)
    if (!ownDodgeCounter.ok) {
      throw new Error("dodge-counter advance must succeed")
    }
    const result = evaluateEffects(prepared, ownDodgeCounter.value.state, {
      kind: "panel",
      atSeconds: 3,
      world: exampleWorld,
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("panel must succeed")
    }
    const woodpecker = result.value.contributions.filter(
      (contribution) =>
        contribution.origin.effectId === "disc:31000:four-piece:attack",
    )
    expect(woodpecker).toHaveLength(2)
    expect(
      new Set(woodpecker.map((entry) => entry.origin.instanceId)).size,
    ).toBe(2)
    // 队友的暴击命中不触发持有者的啄木鸟；两个招式类各自成组。
    const teammateResult = evaluateEffects(
      prepared,
      teammateBasic.value.state,
      {
        kind: "panel",
        atSeconds: 2,
        world: exampleWorld,
        observedSnapshots: [],
        entities: ["entity:attacker"],
        stats: ["attack"],
      } as never,
    )
    expect(teammateResult.ok).toBe(true)
    if (!teammateResult.ok) {
      throw new Error("panel must succeed")
    }
    expect(
      teammateResult.value.contributions.filter(
        (contribution) =>
          contribution.origin.effectId === "disc:31000:four-piece:attack",
      ),
    ).toHaveLength(1)
  })
})

describe("advanceEffects validation acceptance", () => {
  it("rejects a hit-resolved event whose actor is not the hit actor", () => {
    const { prepared, state } = syntheticSession()
    const hit = {
      hitId: "hit:spec-1",
      actionInstanceId: "action-instance:spec-1",
      actionId: "action:spec:basic",
      actorId: syntheticBinding.holderId,
      targetId: "entity:spec-target",
      skillCategory: "basic",
      actionSnapshotId: "snapshot:spec-action",
      origin: { kind: "direct" },
      damageItems: [{ itemId: "main", damageMultiplier: 1, stat: "attack" }],
    }
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "hit-resolved",
        eventId: "event:spec-hit",
        atSeconds: 1,
        sequence: 0,
        actorId: "entity:spec-target",
        hit,
        isCriticalHit: false,
      },
      before: syntheticWorld,
      after: syntheticWorld,
      observedSnapshots: [
        {
          snapshotId: "snapshot:spec-action",
          atSeconds: 1,
          attributes: [],
          world: syntheticWorld,
        },
      ],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("advance must fail")
    }
    expect(
      result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    ).toBe(true)
  })

  it("rejects an entry-followup whose entry event was never processed", () => {
    const { prepared, state } = syntheticSession()
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "entry-followup",
        eventId: "event:spec-followup",
        atSeconds: 1,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        entryAction: "quick-assist",
        entryEventId: "event:spec-never-happened",
        supportActorId: "entity:spec-target",
        energySpent: 0,
        followupActionId: "action:spec:basic",
      },
      before: syntheticWorld,
      after: syntheticWorld,
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("advance must fail")
    }
    expect(
      result.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
    ).toBe(true)
  })

  it("rejects a summon order for a summon owned by another actor", () => {
    const prepared = prepareExamples()
    const supplied = supplyEffectState(prepared, {
      sessionId: "session:example-summons",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(supplied.ok).toBe(true)
    if (!supplied.ok) {
      throw new Error("state supply must succeed")
    }
    const result = advanceEffects(prepared, supplied.value, {
      event: {
        kind: "summon-attack-ordered",
        eventId: "event:example-summon-order",
        atSeconds: 1,
        sequence: 0,
        actorId: "entity:astra",
        summonIds: ["entity:drusilla"],
      },
      before: exampleWorld,
      after: exampleWorld,
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("advance must fail")
    }
    expect(
      result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    ).toBe(true)
  })

  it("rejects a state observation that disagrees with the after world", () => {
    const { prepared, state } = syntheticSession()
    const observation = {
      stateId: syntheticState.stateId,
      bindingId: syntheticBinding.bindingId,
      ownerId: syntheticBinding.holderId,
      active: true,
      activationId: "state-activation:spec-z",
      since: 1,
    }
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "state-observed",
        eventId: "event:spec-state-mismatch",
        atSeconds: 1,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        observation,
      },
      before: syntheticWorld,
      after: syntheticWorld,
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("advance must fail")
    }
    expect(
      result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    ).toBe(true)
  })

  it("rejects replayed, regressing, and non-advancing event order", () => {
    const { prepared, state } = syntheticSession()
    const first = advanceEffects(
      prepared,
      state,
      entryEvent(2, 0, "event:spec-order-1"),
    )
    expect(first.ok).toBe(true)
    if (!first.ok) {
      throw new Error("first advance must succeed")
    }
    const replay = advanceEffects(
      prepared,
      first.value.state,
      entryEvent(3, 0, "event:spec-order-1"),
    )
    expect(replay.ok).toBe(false)
    const sameTimeSameSequence = advanceEffects(
      prepared,
      first.value.state,
      entryEvent(2, 0, "event:spec-order-2"),
    )
    expect(sameTimeSameSequence.ok).toBe(false)
    if (sameTimeSameSequence.ok) {
      throw new Error("advance must fail")
    }
    expect(
      sameTimeSameSequence.issues.some((issue) => issue.code === "EVENT_ORDER"),
    ).toBe(true)
    const earlier = advanceEffects(
      prepared,
      first.value.state,
      entryEvent(1, 1, "event:spec-order-3"),
    )
    expect(earlier.ok).toBe(false)
    const valid = advanceEffects(
      prepared,
      first.value.state,
      entryEvent(2, 1, "event:spec-order-4"),
    )
    expect(valid.ok).toBe(true)
  })

  it("rejects unknown event fields", () => {
    const { prepared, state } = syntheticSession()
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "entry",
        eventId: "event:spec-unknown-field",
        atSeconds: 1,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        entryAction: "chain",
        extraField: true,
      },
      before: syntheticWorld,
      after: syntheticWorld,
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("advance must fail")
    }
    expect(result.issues.some((issue) => issue.code === "INVALID_INPUT")).toBe(
      true,
    )
  })

  it("fails atomically when a required fact is missing and leaves the old state usable", () => {
    const { prepared, state } = syntheticSession()
    const emptyWorld = {
      ...syntheticWorld,
      entities: syntheticWorld.entities.filter(
        (entity) => entity.entityId !== syntheticBinding.holderId,
      ),
    }
    const failing = advanceEffects(prepared, state, {
      ...entryEvent(1, 0, "event:spec-missing-holder"),
      before: emptyWorld,
      after: emptyWorld,
    })
    expect(failing.ok).toBe(false)
    if (failing.ok) {
      throw new Error("advance must fail")
    }
    expect(failing.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
      true,
    )
    expect(panelAttack(prepared, state, 1).value).toBe(1000)
    const recovered = advanceEffects(
      prepared,
      state,
      entryEvent(1, 0, "event:spec-recovered"),
    )
    expect(recovered.ok).toBe(true)
    if (!recovered.ok) {
      throw new Error("recovered advance must succeed")
    }
    expect(panelAttack(prepared, recovered.value.state, 5).value).toBe(1100)
  })
})

const countLiteral = (value: number) =>
  ({ kind: "literal", unit: "count", value }) as const

function supplyEmptySession(
  prepared: PreparedEffects,
  sessionId: `session:${string}`,
): EffectState {
  const supplied = supplyEffectState(prepared, {
    sessionId,
    atSeconds: 0,
    instances: [],
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  expect(supplied.ok).toBe(true)
  if (!supplied.ok) {
    throw new Error("state supply must succeed")
  }
  return supplied.value
}

function advanceOnce(
  prepared: PreparedEffects,
  state: EffectState,
  input: TransitionInput,
): EffectState {
  const result = advanceEffects(prepared, state, input)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(`advance must succeed: ${JSON.stringify(result.issues)}`)
  }
  return result.value.state
}

/** 克隆规则集并给状态绑定规则换一组独立的叠层策略。 */
function syntheticStateBoundLayeringVariant(options: {
  maximum: unknown
  onRetrigger: string
  atCapacity: string
}): ReturnType<typeof structuredClone> {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: Record<string, unknown>[]
  }
  ruleSet.effects = ruleSet.effects.filter(
    (effect) => effect["effectId"] !== "environment:spec:conditional-duration",
  )
  const bound = ruleSet.effects.find(
    (effect) => effect["effectId"] === "environment:spec:state-bound-effect",
  ) as Record<string, unknown>
  const activation = bound["activation"] as Record<string, unknown>
  const layering = activation["layering"] as Record<string, unknown>
  activation["layering"] = {
    ...layering,
    maximum: options.maximum,
    onRetrigger: options.onRetrigger,
    atCapacity: options.atCapacity,
  }
  return ruleSet
}

/** 克隆规则集并给限时规则换一组独立的叠层策略。 */
function syntheticTimedLayeringVariant(options: {
  maximum: unknown
  onRetrigger: string
  atCapacity: string
}): ReturnType<typeof structuredClone> {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: Record<string, unknown>[]
  }
  ruleSet.effects = ruleSet.effects.filter(
    (effect) => effect["effectId"] !== "environment:spec:conditional-duration",
  )
  const timed = ruleSet.effects.find(
    (effect) => effect["effectId"] === "environment:spec:timed-effect",
  ) as Record<string, unknown>
  const activation = timed["activation"] as Record<string, unknown>
  const layering = activation["layering"] as Record<string, unknown>
  activation["layering"] = {
    ...layering,
    maximum: options.maximum,
    onRetrigger: options.onRetrigger,
    atCapacity: options.atCapacity,
  }
  return ruleSet
}

function worldWithStates(states: readonly unknown[]): {
  readonly [key: string]: unknown
} {
  return { ...structuredClone(syntheticWorld), states }
}

function stateIsTransition(options: {
  atSeconds: number
  eventId: string
  states: readonly unknown[]
}): TransitionInput {
  const world = worldWithStates(options.states)
  return {
    event: {
      kind: "entry",
      eventId: options.eventId,
      atSeconds: options.atSeconds,
      sequence: 0,
      actorId: syntheticBinding.holderId,
      entryAction: "chain",
    },
    before: world,
    after: world,
    observedSnapshots: [],
  } as unknown as TransitionInput
}

describe("state-bound layering policy", () => {
  it("keeps one layer when the same activation is retriggered under keep-count", () => {
    const prepared = prepareFrom(
      syntheticStateBoundLayeringVariant({
        maximum: countLiteral(2),
        onRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    let state = supplyEmptySession(prepared, "session:spec-state-bound-keep")
    state = advanceOnce(
      prepared,
      state,
      stateObservedEvent({
        atSeconds: 0,
        sequence: 0,
        eventId: "event:sb-keep-1",
        activationId: "state-activation:spec-a",
      }),
    )
    const first = panelAttack(prepared, state, 0)
    state = advanceOnce(
      prepared,
      state,
      stateObservedEvent({
        atSeconds: 1,
        sequence: 0,
        eventId: "event:sb-keep-2",
        activationId: "state-activation:spec-a",
      }),
    )
    const second = panelAttack(prepared, state, 1)
    expect(first.value).toBeCloseTo(1100, 9)
    expect(second.value).toBeCloseTo(1100, 9)
    expect(second.contributions).toHaveLength(1)
  })

  it("replaces the oldest layer when a full state-bound group retriggers", () => {
    const prepared = prepareFrom(
      syntheticStateBoundLayeringVariant({
        maximum: countLiteral(2),
        onRetrigger: "add-layer",
        atCapacity: "replace-oldest-layer",
      }),
      [syntheticBinding],
    )
    let state = supplyEmptySession(prepared, "session:spec-state-bound-replace")
    for (const atSeconds of [0, 1]) {
      state = advanceOnce(
        prepared,
        state,
        stateObservedEvent({
          atSeconds,
          sequence: 0,
          eventId: `event:sb-replace-${atSeconds}`,
          activationId: "state-activation:spec-a",
        }),
      )
    }
    const full = panelAttack(prepared, state, 1)
    expect(full.contributions).toHaveLength(2)
    expect(full.value).toBeCloseTo(1200, 9)
    const oldestLayerId = full.contributions
      .map((contribution) => contribution.layerId)
      .toSorted()[0]
    state = advanceOnce(
      prepared,
      state,
      stateObservedEvent({
        atSeconds: 2,
        sequence: 0,
        eventId: "event:sb-replace-2",
        activationId: "state-activation:spec-a",
      }),
    )
    const replaced = panelAttack(prepared, state, 2)
    expect(replaced.contributions).toHaveLength(2)
    expect(replaced.value).toBeCloseTo(1200, 9)
    expect(
      replaced.contributions.map((contribution) => contribution.layerId),
    ).not.toContain(oldestLayerId)
  })

  it("creates a new group after the state exits and re-enters", () => {
    const prepared = prepareFrom(
      syntheticStateBoundLayeringVariant({
        maximum: countLiteral(2),
        onRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    let state = supplyEmptySession(prepared, "session:spec-state-bound-reentry")
    state = advanceOnce(
      prepared,
      state,
      stateObservedEvent({
        atSeconds: 0,
        sequence: 0,
        eventId: "event:sb-reentry-1",
        activationId: "state-activation:spec-a",
      }),
    )
    state = advanceOnce(
      prepared,
      state,
      stateObservedEvent({
        atSeconds: 1,
        sequence: 0,
        eventId: "event:sb-reentry-2",
        activationId: null,
      }),
    )
    expect(panelAttack(prepared, state, 1).value).toBeCloseTo(1000, 9)
    state = advanceOnce(
      prepared,
      state,
      stateObservedEvent({
        atSeconds: 2,
        sequence: 0,
        eventId: "event:sb-reentry-3",
        activationId: "state-activation:spec-b",
      }),
    )
    const reentered = panelAttack(
      prepared,
      state,
      2,
      worldWithStates([
        {
          stateId: syntheticState.stateId,
          bindingId: syntheticBinding.bindingId,
          ownerId: syntheticBinding.holderId,
          active: true,
          activationId: "state-activation:spec-b",
          since: 2,
        },
      ]),
    )
    expect(reentered.value).toBeCloseTo(1100, 9)
    expect(reentered.contributions).toHaveLength(1)
  })
})

describe("advanceEffects modification and layer maximum expressions", () => {
  it("reads the activation modification's own condition and duration parameters", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: Record<string, unknown>[]
    }
    const timed = ruleSet.effects.find(
      (effect) => effect["effectId"] === "environment:spec:timed-effect",
    ) as Record<string, unknown>
    // 目标规则也声明 flag，但激活修改的条件与操作数只读自己的参数表。
    timed["parameters"] = {
      flag: { kind: "constant", unit: "count", value: 0 },
    }
    const modification = ruleSet.effects.find(
      (effect) =>
        effect["effectId"] === "environment:spec:conditional-duration",
    ) as Record<string, unknown>
    modification["parameters"] = {
      flag: { kind: "constant", unit: "count", value: 1 },
      extra: { kind: "constant", unit: "seconds", value: 5 },
    }
    modification["when"] = {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: { kind: "parameter", unit: "count", name: "flag" },
      right: countLiteral(1),
    }
    modification["modifications"] = [
      {
        field: "duration-seconds",
        change: {
          operator: "add",
          value: { kind: "parameter", unit: "seconds", name: "extra" },
        },
      },
    ]
    const prepared = prepareFrom(ruleSet, [syntheticBinding])
    let state = supplyEmptySession(
      prepared,
      "session:spec-activation-parameter",
    )
    state = advanceOnce(prepared, state, entryEvent(0, 0, "event:ap-1"))
    // 10 秒基础时长 + 修改自己的 5 秒：第 12 秒仍然有效。
    expect(panelAttack(prepared, state, 12).value).toBeCloseTo(1100, 9)
  })

  it("limits stacking to the configuration-resolved layer maximum", () => {
    const prepared = prepareFrom(
      syntheticTimedLayeringVariant({
        maximum: {
          kind: "add",
          unit: "count",
          operands: [countLiteral(1), countLiteral(1)],
        },
        onRetrigger: "add-layer",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    let state = supplyEmptySession(prepared, "session:spec-layer-maximum")
    for (const atSeconds of [0, 1, 2]) {
      state = advanceOnce(
        prepared,
        state,
        entryEvent(atSeconds, 0, `event:lm-${atSeconds}`),
      )
    }
    const panel = panelAttack(prepared, state, 2)
    expect(panel.contributions).toHaveLength(2)
    expect(panel.value).toBeCloseTo(1200, 9)
  })

  it("fails when a trigger expression overflows", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: Record<string, unknown>[]
    }
    const timed = ruleSet.effects.find(
      (effect) => effect["effectId"] === "environment:spec:timed-effect",
    ) as Record<string, unknown>
    const activation = timed["activation"] as {
      lifetime: Record<string, unknown>
    }
    activation.lifetime["seconds"] = {
      kind: "multiply",
      unit: "seconds",
      value: { kind: "literal", unit: "seconds", value: 1e308 },
      coefficient: { kind: "literal", unit: "multiplier", value: 2 },
    }
    const prepared = prepareFrom(ruleSet, [syntheticBinding])
    const state = supplyEmptySession(prepared, "session:spec-overflow-trigger")
    const result = advanceEffects(
      prepared,
      state,
      entryEvent(0, 0, "event:ov-1"),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

describe("advanceEffects state observation reads", () => {
  const activeState = [
    {
      stateId: syntheticState.stateId,
      bindingId: syntheticBinding.bindingId,
      ownerId: syntheticBinding.holderId,
      active: true,
      activationId: "state-activation:spec-a",
      since: 0,
    },
  ]
  const inactiveState = [
    {
      stateId: syntheticState.stateId,
      bindingId: syntheticBinding.bindingId,
      ownerId: syntheticBinding.holderId,
      active: false,
      activationId: null,
      since: null,
    },
  ]

  it("fails when a trigger condition's state observation is missing", () => {
    const prepared = prepareSynthetic()
    const state = supplyEmptySession(
      prepared,
      "session:spec-trigger-state-missing",
    )
    const result = advanceEffects(
      prepared,
      state,
      stateIsTransition({
        atSeconds: 0,
        eventId: "event:tsm-1",
        states: [],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })

  it("distinguishes an explicit inactive observation from an active one", () => {
    const prepared = prepareSynthetic()
    const inactive = advanceOnce(
      prepared,
      supplyEmptySession(prepared, "session:spec-trigger-state-inactive"),
      stateIsTransition({
        atSeconds: 0,
        eventId: "event:tsi-1",
        states: inactiveState,
      }),
    )
    // 条件为假：时长保持 10 秒，第 12 秒不再有效。
    expect(panelAttack(prepared, inactive, 9).value).toBeCloseTo(1100, 9)
    expect(panelAttack(prepared, inactive, 12).value).toBeCloseTo(1000, 9)
    const active = advanceOnce(
      prepared,
      supplyEmptySession(prepared, "session:spec-trigger-state-active"),
      stateIsTransition({
        atSeconds: 0,
        eventId: "event:tsa-1",
        states: activeState,
      }),
    )
    // 条件为真：10 秒基础时长 + 5.5 秒，第 12 秒仍然有效。
    expect(panelAttack(prepared, active, 12).value).toBeCloseTo(1100, 9)
  })

  it("reads only the observation of the rule's own source binding", () => {
    const prepared = prepareSynthetic()
    const state = supplyEmptySession(
      prepared,
      "session:spec-trigger-state-binding",
    )
    const result = advanceEffects(
      prepared,
      state,
      stateIsTransition({
        atSeconds: 0,
        eventId: "event:tsb-1",
        states: [
          {
            stateId: syntheticState.stateId,
            bindingId: "binding:spec-other",
            ownerId: syntheticBinding.holderId,
            active: true,
            activationId: "state-activation:spec-other",
            since: 0,
          },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
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

function syntheticTransitionInput() {
  return {
    event: {
      kind: "entry",
      eventId: "event:afi-1",
      atSeconds: 0,
      sequence: 0,
      actorId: syntheticBinding.holderId,
      entryAction: "chain",
    },
    before: structuredClone(syntheticWorld),
    after: structuredClone(syntheticWorld),
    observedSnapshots: [
      {
        snapshotId: "snapshot:spec-advance-input",
        atSeconds: 0,
        attributes: [],
        world: structuredClone(syntheticWorld),
      },
    ],
  }
}

describe("advanceEffects input ownership", () => {
  it("does not freeze caller transition inputs", () => {
    const prepared = prepareSynthetic()
    const input = syntheticTransitionInput()
    const state = supplyEmptySession(prepared, "session:spec-advance-ownership")
    const result = advanceEffects(prepared, state, input as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("advance must succeed")
    }
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.event)).toBe(false)
    expect(Object.isFrozen(input.before)).toBe(false)
    expect(Object.isFrozen(input.after)).toBe(false)
    expect(Object.isFrozen(input.observedSnapshots[0])).toBe(false)
    const internal = readStateInternal(result.value.state)!
    const recorded = internal.snapshots.find(
      (snapshot) => snapshot.snapshotId === "snapshot:spec-advance-input",
    )
    expect(recorded).toBeDefined()
    expect(recorded!.world).not.toBe(input.before)
  })

  it("accepts deeply frozen transition inputs", () => {
    const prepared = prepareSynthetic()
    const input = syntheticTransitionInput()
    deepFreezeValue(input)
    const state = supplyEmptySession(prepared, "session:spec-advance-frozen")
    const result = advanceEffects(prepared, state, input as never)
    expect(result.ok).toBe(true)
  })
})

/** 只保留一个合成效果并定向覆盖，避免其他合成规则干扰断言。 */
function singleEffectRuleSet(
  effectId: string,
  override: (effect: Record<string, unknown>) => void,
): ReturnType<typeof structuredClone> {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: Record<string, unknown>[]
  }
  ruleSet.effects = ruleSet.effects.filter(
    (effect) => effect["effectId"] === effectId,
  )
  override(ruleSet.effects[0]!)
  return ruleSet
}

const stateBoundEffectId = "environment:spec:state-bound-effect"

/** 入场触发的状态绑定规则：缺失观察与组级层数上限都走这条路径。 */
function syntheticEntryStateBoundRuleSet(
  options: {
    maximum?: unknown
    onRetrigger?: string
    atCapacity?: string
  } = {},
): ReturnType<typeof structuredClone> {
  return singleEffectRuleSet(stateBoundEffectId, (effect) => {
    const activation = effect["activation"] as Record<string, unknown>
    activation["trigger"] = { eventKinds: ["entry"], when: always }
    activation["layering"] = {
      recipientPartition: "individual",
      keys: [],
      maximum: options.maximum ?? countLiteral(2),
      onRetrigger: options.onRetrigger ?? "add-layer",
      atCapacity: options.atCapacity ?? "ignore-new-layer",
    }
  })
}

function importedStateBoundState(
  atSeconds: number,
  layers: readonly { instanceId: string; layerId: string; startedAt: number }[],
): unknown {
  return {
    sessionId: "session:spec-group-capacity",
    atSeconds,
    instances: layers.map((entry) => ({
      instanceId: entry.instanceId,
      effectId: stateBoundEffectId,
      bindingId: syntheticBinding.bindingId,
      beneficiaryIds: [syntheticBinding.holderId],
      stackKey: [],
      lifetime: {
        kind: "state-bound",
        stateId: syntheticState.stateId,
        stateOwnerId: syntheticBinding.holderId,
        stateActivationId: "state-activation:spec-a",
      },
      layers: [
        {
          layerId: entry.layerId,
          startedAt: entry.startedAt,
          expiresAt: null,
          trigger: null,
        },
      ],
    })),
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  }
}

function supplyImportedState(
  prepared: PreparedEffects,
  input: unknown,
): EffectState {
  const supplied = supplyEffectState(prepared, structuredClone(input) as never)
  expect(supplied.ok).toBe(true)
  if (!supplied.ok) {
    throw new Error(
      `state supply must succeed: ${JSON.stringify(supplied.issues)}`,
    )
  }
  return supplied.value
}

describe("state-bound observation transitions", () => {
  it("fails and keeps the old state usable when the after world omits the observation", () => {
    const prepared = prepareFrom(syntheticEntryStateBoundRuleSet(), [
      syntheticBinding,
    ])
    let state = supplyEmptySession(prepared, "session:spec-missing-after")
    state = advanceOnce(prepared, state, entryEvent(0, 0, "event:ma-1"))
    expect(panelAttack(prepared, state, 0).value).toBeCloseTo(1100, 9)
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "entry",
        eventId: "event:ma-2",
        atSeconds: 1,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        entryAction: "chain",
      },
      before: syntheticWorld,
      after: worldWithStates([]),
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
    // 失败不提交：旧状态仍保留原层并可用于后续查询。
    expect(panelAttack(prepared, state, 1).value).toBeCloseTo(1100, 9)
  })

  it("fails when the first activation has no observation in either world", () => {
    const prepared = prepareFrom(syntheticEntryStateBoundRuleSet(), [
      syntheticBinding,
    ])
    const state = supplyEmptySession(prepared, "session:spec-missing-first")
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "entry",
        eventId: "event:mf-1",
        atSeconds: 0,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        entryAction: "chain",
      },
      before: worldWithStates([]),
      after: worldWithStates([]),
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })

  it("treats an explicit inactive observation as an ended state, not a missing one", () => {
    const prepared = prepareFrom(syntheticEntryStateBoundRuleSet(), [
      syntheticBinding,
    ])
    let state = supplyEmptySession(prepared, "session:spec-explicit-inactive")
    state = advanceOnce(prepared, state, entryEvent(0, 0, "event:ei-1"))
    const inactive = [
      {
        stateId: syntheticState.stateId,
        bindingId: syntheticBinding.bindingId,
        ownerId: syntheticBinding.holderId,
        active: false,
        activationId: null,
        since: null,
      },
    ]
    state = advanceOnce(prepared, state, {
      event: {
        kind: "entry",
        eventId: "event:ei-2",
        atSeconds: 1,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        entryAction: "chain",
      },
      before: syntheticWorld,
      after: worldWithStates(inactive),
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(
      panelAttack(prepared, state, 1, worldWithStates(inactive)).value,
    ).toBe(1000)
  })
})

describe("logical group layer capacity", () => {
  it("counts every imported instance in one state-bound group", () => {
    const prepared = prepareFrom(
      syntheticEntryStateBoundRuleSet({
        maximum: countLiteral(2),
        onRetrigger: "add-layer",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedStateBoundState(0, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:spec-a",
          startedAt: 0,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:spec-b",
          startedAt: 0,
        },
      ]),
    )
    expect(panelAttack(prepared, state, 0).contributions).toHaveLength(2)
    expect(panelAttack(prepared, state, 0).value).toBeCloseTo(1200, 9)
    const advanced = advanceOnce(
      prepared,
      state,
      entryEvent(1, 0, "event:gc-1"),
    )
    const panel = panelAttack(prepared, advanced, 1)
    expect(panel.contributions).toHaveLength(2)
    expect(panel.value).toBeCloseTo(1200, 9)
  })

  it("replaces the oldest layer across every instance in the group", () => {
    const prepared = prepareFrom(
      syntheticEntryStateBoundRuleSet({
        maximum: countLiteral(2),
        onRetrigger: "add-layer",
        atCapacity: "replace-oldest-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedStateBoundState(1, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:spec-a",
          startedAt: 0,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:spec-b",
          startedAt: 1,
        },
      ]),
    )
    const advanced = advanceOnce(
      prepared,
      state,
      entryEvent(2, 0, "event:gr-1"),
    )
    const panel = panelAttack(prepared, advanced, 2)
    const layerIds = panel.contributions.map(
      (contribution) => contribution.layerId,
    )
    expect(layerIds).toHaveLength(2)
    expect(layerIds).not.toContain("layer:spec-a")
    expect(layerIds).toContain("layer:spec-b")
  })

  it("counts every imported instance in one timed group", () => {
    const prepared = prepareFrom(
      singleEffectRuleSet("environment:spec:timed-effect", (effect) => {
        const activation = effect["activation"] as Record<string, unknown>
        activation["lifetime"] = {
          kind: "timed",
          seconds: { kind: "literal", unit: "seconds", value: 10 },
          clock: "per-layer",
          onRetrigger: { kind: "keep" },
          refreshExisting: "none",
        }
        activation["layering"] = {
          recipientPartition: "individual",
          keys: [],
          maximum: countLiteral(2),
          onRetrigger: "add-layer",
          atCapacity: "ignore-new-layer",
        }
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(prepared, {
      sessionId: "session:spec-timed-group",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:spec-timed-a",
          effectId: "environment:spec:timed-effect",
          bindingId: syntheticBinding.bindingId,
          beneficiaryIds: [syntheticBinding.holderId],
          stackKey: [],
          lifetime: { kind: "timed", firstActivatedAt: 0 },
          layers: [
            {
              layerId: "layer:spec-timed-a",
              startedAt: 0,
              expiresAt: 100,
              trigger: null,
            },
          ],
        },
        {
          instanceId: "instance:spec-timed-b",
          effectId: "environment:spec:timed-effect",
          bindingId: syntheticBinding.bindingId,
          beneficiaryIds: [syntheticBinding.holderId],
          stackKey: [],
          lifetime: { kind: "timed", firstActivatedAt: 0 },
          layers: [
            {
              layerId: "layer:spec-timed-b",
              startedAt: 0,
              expiresAt: 100,
              trigger: null,
            },
          ],
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(panelAttack(prepared, state, 0).contributions).toHaveLength(2)
    const advanced = advanceOnce(
      prepared,
      state,
      entryEvent(1, 0, "event:tg-1"),
    )
    const panel = panelAttack(prepared, advanced, 1)
    expect(panel.contributions).toHaveLength(2)
    expect(panel.value).toBeCloseTo(1200, 9)
  })
})

describe("trigger arithmetic boundaries", () => {
  it("fails when an overflowed trigger condition would silently become false", () => {
    const prepared = prepareFrom(
      singleEffectRuleSet("environment:spec:timed-effect", (effect) => {
        const activation = effect["activation"] as Record<string, unknown>
        const trigger = activation["trigger"] as Record<string, unknown>
        trigger["when"] = {
          kind: "compare-number",
          unit: "count",
          operator: "gt",
          left: {
            kind: "multiply",
            unit: "count",
            value: {
              kind: "add",
              unit: "count",
              operands: [countLiteral(1e308), countLiteral(1e308)],
            },
            coefficient: { kind: "literal", unit: "multiplier", value: 0 },
          },
          right: countLiteral(0),
        }
      }),
      [syntheticBinding],
    )
    const state = supplyEmptySession(prepared, "session:spec-trigger-overflow")
    const result = advanceEffects(
      prepared,
      state,
      entryEvent(0, 0, "event:to-1"),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

describe("clock arithmetic boundaries", () => {
  it("fails when the clock arithmetic overflows into a non-finite expiry", () => {
    const prepared = prepareFrom(
      singleEffectRuleSet("environment:spec:timed-effect", (effect) => {
        const activation = effect["activation"] as Record<string, unknown>
        activation["lifetime"] = {
          kind: "timed",
          seconds: { kind: "literal", unit: "seconds", value: 1e308 },
          clock: "per-layer",
          onRetrigger: { kind: "keep" },
          refreshExisting: "none",
        }
      }),
      [syntheticBinding],
    )
    const state = supplyEmptySession(prepared, "session:spec-clock-overflow")
    const result = advanceEffects(
      prepared,
      state,
      entryEvent(1e308, 0, "event:co-1"),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

describe("state-bound working view without a matching trigger", () => {
  it("fails instead of clearing the old group when the after observation is missing", () => {
    const prepared = prepareFrom(
      singleEffectRuleSet(stateBoundEffectId, (effect) => {
        const activation = effect["activation"] as Record<string, unknown>
        activation["trigger"] = {
          eventKinds: ["entry"],
          when: { kind: "constant", value: false },
        }
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedStateBoundState(0, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:spec-a",
          startedAt: 0,
        },
      ]),
    )
    expect(panelAttack(prepared, state, 0).value).toBeCloseTo(1100, 9)
    const result = advanceEffects(prepared, state, {
      event: {
        kind: "entry",
        eventId: "event:wv-1",
        atSeconds: 1,
        sequence: 0,
        actorId: syntheticBinding.holderId,
        entryAction: "chain",
      },
      before: syntheticWorld,
      after: worldWithStates([]),
      observedSnapshots: [],
    } as unknown as TransitionInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
    // 失败不提交：旧层仍然可用。
    expect(panelAttack(prepared, state, 1).value).toBeCloseTo(1100, 9)
  })
})

/** 可配置时钟策略的限时规则：用于多实例计时边界。 */
function timedClockVariantRuleSet(options: {
  clock: "shared" | "per-layer"
  refreshExisting: "all" | "newest" | "none"
  onRetrigger: Record<string, unknown>
  maximum: unknown
  layeringOnRetrigger: string
  atCapacity: string
  seconds?: number
}): ReturnType<typeof structuredClone> {
  return singleEffectRuleSet("environment:spec:timed-effect", (effect) => {
    const activation = effect["activation"] as Record<string, unknown>
    activation["lifetime"] = {
      kind: "timed",
      seconds: {
        kind: "literal",
        unit: "seconds",
        value: options.seconds ?? 10,
      },
      clock: options.clock,
      onRetrigger: options.onRetrigger,
      refreshExisting: options.refreshExisting,
    }
    activation["layering"] = {
      recipientPartition: "individual",
      keys: [],
      maximum: options.maximum,
      onRetrigger: options.layeringOnRetrigger,
      atCapacity: options.atCapacity,
    }
  })
}

function importedTimedGroupState(
  atSeconds: number,
  layers: readonly {
    instanceId: string
    layerId: string
    startedAt: number
    expiresAt: number
  }[],
): unknown {
  return {
    sessionId: "session:spec-timed-clock",
    atSeconds,
    instances: layers.map((entry) => ({
      instanceId: entry.instanceId,
      effectId: "environment:spec:timed-effect",
      bindingId: syntheticBinding.bindingId,
      beneficiaryIds: [syntheticBinding.holderId],
      stackKey: [],
      lifetime: { kind: "timed", firstActivatedAt: 0 },
      layers: [
        {
          layerId: entry.layerId,
          startedAt: entry.startedAt,
          expiresAt: entry.expiresAt,
          trigger: null,
        },
      ],
    })),
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  }
}

describe("timed group clock across instances", () => {
  const refreshAll = { kind: "refresh" }
  const maximumTwo = countLiteral(2)

  function advanceAt(prepared: PreparedEffects, state: EffectState, t: number) {
    return advanceOnce(prepared, state, entryEvent(t, 0, `event:tc-${t}`))
  }

  it("refreshes every instance of a shared group", () => {
    const prepared = prepareFrom(
      timedClockVariantRuleSet({
        clock: "shared",
        refreshExisting: "all",
        onRetrigger: refreshAll,
        maximum: maximumTwo,
        layeringOnRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedTimedGroupState(0, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:a",
          startedAt: 0,
          expiresAt: 10,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:b",
          startedAt: 0,
          expiresAt: 10,
        },
      ]),
    )
    const advanced = advanceAt(prepared, state, 5)
    expect(panelAttack(prepared, advanced, 12).value).toBeCloseTo(1200, 9)
    expect(panelAttack(prepared, advanced, 15).value).toBeCloseTo(1000, 9)
  })

  it("finds the newest layer when it lives outside the representative instance", () => {
    const prepared = prepareFrom(
      timedClockVariantRuleSet({
        clock: "per-layer",
        refreshExisting: "newest",
        onRetrigger: refreshAll,
        maximum: maximumTwo,
        layeringOnRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedTimedGroupState(2, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:newer",
          startedAt: 2,
          expiresAt: 10,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:older",
          startedAt: 0,
          expiresAt: 12,
        },
      ]),
    )
    const advanced = advanceAt(prepared, state, 5)
    expect(panelAttack(prepared, advanced, 11).value).toBeCloseTo(1200, 9)
    expect(panelAttack(prepared, advanced, 13).value).toBeCloseTo(1100, 9)
  })

  it("still refreshes a full group that ignores the new layer", () => {
    const prepared = prepareFrom(
      timedClockVariantRuleSet({
        clock: "shared",
        refreshExisting: "all",
        onRetrigger: refreshAll,
        maximum: maximumTwo,
        layeringOnRetrigger: "add-layer",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedTimedGroupState(0, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:a",
          startedAt: 0,
          expiresAt: 10,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:b",
          startedAt: 0,
          expiresAt: 10,
        },
      ]),
    )
    const advanced = advanceAt(prepared, state, 5)
    const panel = panelAttack(prepared, advanced, 12)
    expect(panel.contributions).toHaveLength(2)
    expect(panel.value).toBeCloseTo(1200, 9)
  })

  it("replaces the oldest layer across instances while refreshing the group", () => {
    const prepared = prepareFrom(
      timedClockVariantRuleSet({
        clock: "shared",
        refreshExisting: "all",
        onRetrigger: refreshAll,
        maximum: maximumTwo,
        layeringOnRetrigger: "add-layer",
        atCapacity: "replace-oldest-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(
      prepared,
      importedTimedGroupState(1, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:a",
          startedAt: 0,
          expiresAt: 10,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:b",
          startedAt: 1,
          expiresAt: 10,
        },
      ]),
    )
    const advanced = advanceAt(prepared, state, 5)
    const panel = panelAttack(prepared, advanced, 12)
    const layerIds = panel.contributions.map(
      (contribution) => contribution.layerId,
    )
    expect(layerIds).toHaveLength(2)
    expect(layerIds).not.toContain("layer:a")
    expect(layerIds).toContain("layer:b")
    expect(panel.value).toBeCloseTo(1200, 9)
  })

  it("does not depend on instance or layer array order", () => {
    const prepared = prepareFrom(
      timedClockVariantRuleSet({
        clock: "shared",
        refreshExisting: "all",
        onRetrigger: refreshAll,
        maximum: maximumTwo,
        layeringOnRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    const forward = supplyImportedState(
      prepared,
      importedTimedGroupState(0, [
        {
          instanceId: "instance:spec-a",
          layerId: "layer:a",
          startedAt: 0,
          expiresAt: 10,
        },
        {
          instanceId: "instance:spec-b",
          layerId: "layer:b",
          startedAt: 0,
          expiresAt: 10,
        },
      ]),
    )
    const reversed = supplyImportedState(
      prepared,
      importedTimedGroupState(0, [
        {
          instanceId: "instance:spec-b",
          layerId: "layer:b",
          startedAt: 0,
          expiresAt: 10,
        },
        {
          instanceId: "instance:spec-a",
          layerId: "layer:a",
          startedAt: 0,
          expiresAt: 10,
        },
      ]),
    )
    const forwardAdvanced = advanceAt(prepared, forward, 5)
    const reversedAdvanced = advanceAt(prepared, reversed, 5)
    expect(panelAttack(prepared, forwardAdvanced, 12).value).toBeCloseTo(
      panelAttack(prepared, reversedAdvanced, 12).value,
      9,
    )
    expect(panelAttack(prepared, forwardAdvanced, 12).value).toBeCloseTo(
      1200,
      9,
    )
  })

  it("fails when the bounded clock overflows before its cap", () => {
    const prepared = prepareFrom(
      timedClockVariantRuleSet({
        clock: "shared",
        refreshExisting: "all",
        seconds: 1e308,
        onRetrigger: {
          kind: "extend",
          limit: {
            kind: "since-first-activation",
            maximum: { kind: "literal", unit: "seconds", value: 1.5e308 },
          },
        },
        maximum: maximumTwo,
        layeringOnRetrigger: "keep-count",
        atCapacity: "ignore-new-layer",
      }),
      [syntheticBinding],
    )
    const state = supplyImportedState(prepared, {
      ...(importedTimedGroupState(0, [
        {
          instanceId: "instance:spec-bound-clock",
          layerId: "layer:bound-clock",
          startedAt: 0,
          expiresAt: 1.1e308,
        },
      ]) as Record<string, unknown>),
    })
    const result = advanceEffects(
      prepared,
      state,
      entryEvent(1e308, 0, "event:tc-overflow"),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

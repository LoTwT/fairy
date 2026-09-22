import { describe, expect, it } from "vitest"
import {
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
  synchronizeSuppliedInstances,
} from "../src/index.ts"
import type {
  EffectState,
  EvaluationInput,
  PreparedEffects,
  StateInput,
  SuppliedInstancesUpdate,
} from "../src/index.ts"
import {
  clearSuppliedAstra,
  exampleBindings,
  exampleRuleSet,
  exampleWorld,
  mixedStateBeforeSynchronization,
  renewSuppliedAstra,
  suppliedAstraState,
  syntheticBinding,
  syntheticHitQuery,
  syntheticRuleSet,
  syntheticWorld,
} from "../../../docs/specs/effects/contract-examples.ts"
import { reorderObjectKeys } from "./fixtures.ts"

function prepareWithExamples(): PreparedEffects {
  const parsed = parseEffectRuleSet(exampleRuleSet)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error("example rule set must parse")
  }
  const prepared = prepareEffects(parsed.value, [...exampleBindings] as never)
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  return prepared.value
}

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

describe("rina mindscape one range acceptance", () => {
  it("applies the output scale only to in-range beneficiaries", () => {
    const prepared = prepareWithExamples()
    const rinaWorld = {
      ...exampleWorld,
      distances: [
        { first: "entity:attacker", second: "entity:drusilla", meters: 8 },
        { first: "entity:astra", second: "entity:drusilla", meters: 12 },
      ],
    }
    const input: StateInput = {
      sessionId: "session:rina",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:rina-core",
          effectId: "agent:1211:core:penetration-conversion",
          bindingId: "binding:rina",
          beneficiaryIds: ["entity:astra", "entity:attacker"],
          stackKey: [],
          lifetime: { kind: "supplied" },
          layers: [
            {
              layerId: "layer:rina-core",
              startedAt: 0,
              expiresAt: null,
              trigger: null,
            },
          ],
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }
    const state = supplyEffectState(prepared, input)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared, state.value, {
      kind: "contributions",
      atSeconds: 0,
      world: rinaWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:astra", "entity:attacker"],
    } as EvaluationInput)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const penetration = (beneficiary: string) =>
      result.value.contributions.find(
        (contribution) =>
          contribution.origin.effectId ===
            "agent:1211:core:penetration-conversion" &&
          contribution.origin.beneficiaryId === beneficiary,
      )
    const inRange = penetration("entity:attacker")
    const outOfRange = penetration("entity:astra")
    expect(inRange).toBeDefined()
    expect(outOfRange).toBeDefined()
    // min(0.25 × 0.40 + 0.12, 0.30) = 0.22；范围内 ×1.3 = 0.286，范围外 0.22。
    expect(inRange!.value.value).toBeCloseTo(0.286, 12)
    expect(outOfRange!.value.value).toBeCloseTo(0.22, 12)
    expect(inRange!.appliedModifications).toEqual([
      "agent:1211:mindscape-1:core-enhancement",
    ])
    expect(outOfRange!.appliedModifications).toEqual([])
  })

  it("caps the base expression before applying the output scale", () => {
    const prepared = prepareWithExamples()
    const rinaWorld = {
      ...exampleWorld,
      entities: exampleWorld.entities.map((entity) =>
        entity.entityId === "entity:rina" && entity.kind === "actor"
          ? {
              ...entity,
              directStats: {
                penetrationRatio: { baseValue: 0.72, additions: [] },
              },
            }
          : entity,
      ),
      distances: [
        { first: "entity:attacker", second: "entity:drusilla", meters: 3 },
      ],
    }
    const input: StateInput = {
      sessionId: "session:rina-capped",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:rina-core",
          effectId: "agent:1211:core:penetration-conversion",
          bindingId: "binding:rina",
          beneficiaryIds: ["entity:attacker"],
          stackKey: [],
          lifetime: { kind: "supplied" },
          layers: [
            {
              layerId: "layer:rina-core",
              startedAt: 0,
              expiresAt: null,
              trigger: null,
            },
          ],
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }
    const state = supplyEffectState(prepared, input)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared, state.value, {
      kind: "contributions",
      atSeconds: 0,
      world: rinaWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:attacker"],
    } as EvaluationInput)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const contribution = result.value.contributions.find(
      (entry) =>
        entry.origin.effectId === "agent:1211:core:penetration-conversion",
    )
    expect(contribution).toBeDefined()
    // 基础在 0.30 封顶，输出修改在封顶后执行：0.30 × 1.3 = 0.39。
    expect(contribution!.value.value).toBeCloseTo(0.39, 12)
  })

  it("reports a missing distance instead of treating it as out of range", () => {
    const prepared = prepareWithExamples()
    const input: StateInput = {
      sessionId: "session:rina-missing-distance",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:rina-core",
          effectId: "agent:1211:core:penetration-conversion",
          bindingId: "binding:rina",
          beneficiaryIds: ["entity:attacker"],
          stackKey: [],
          lifetime: { kind: "supplied" },
          layers: [
            {
              layerId: "layer:rina-core",
              startedAt: 0,
              expiresAt: null,
              trigger: null,
            },
          ],
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }
    const state = supplyEffectState(prepared, input)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared, state.value, {
      kind: "contributions",
      atSeconds: 0,
      world: { ...exampleWorld, distances: [] },
      observedSnapshots: [],
      beneficiaries: ["entity:attacker"],
    } as EvaluationInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })
})

describe("synthetic hit query uniqueness acceptance", () => {
  const stateInput: StateInput = {
    sessionId: "session:spec",
    atSeconds: 0,
    instances: [],
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  }

  it("selects the hit contribution in the shared uniqueness group", () => {
    const prepared = prepareSynthetic()
    const state = supplyEffectState(prepared, stateInput)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared, state.value, {
      ...syntheticHitQuery,
    } as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const damageBonus = result.value.contributions.filter(
      (contribution) => contribution.address.kind === "factor",
    )
    expect(damageBonus).toHaveLength(1)
    expect(damageBonus[0]!.value.value).toBeCloseTo(0.2, 12)
    expect(damageBonus[0]!.address).toMatchObject({
      kind: "factor",
      channel: "damage-bonus",
      entityId: "entity:spec",
      hitId: "hit:spec-basic",
    })
    expect(result.value.hit?.criticalRate).toBeCloseTo(0.05, 12)
    expect(result.value.hit?.damageItems[0]?.damageMultiplier).toBeCloseTo(
      1,
      12,
    )
    expect(result.value.hit?.damageItems[0]?.finalStat).toBeCloseTo(1000, 12)
  })

  it("returns the general contribution for non-matching queries", () => {
    const prepared = prepareSynthetic()
    const state = supplyEffectState(prepared, stateInput)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const contributions = evaluateEffects(prepared, state.value, {
      kind: "contributions",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:spec"],
    } as EvaluationInput)
    expect(contributions.ok).toBe(true)
    if (!contributions.ok) {
      throw new Error("evaluation must succeed")
    }
    const damageBonus = contributions.value.contributions.filter(
      (contribution) => contribution.address.kind === "factor",
    )
    expect(damageBonus).toHaveLength(1)
    expect(damageBonus[0]!.value.value).toBeCloseTo(0.1, 12)
    expect(damageBonus[0]!.address).toMatchObject({ hitId: null })
  })

  it("sums both contributions without the uniqueness declaration", () => {
    const withoutUniqueness = structuredClone(syntheticRuleSet)
    for (const effect of withoutUniqueness.effects) {
      if (effect.kind === "contribution") {
        delete (effect as { uniqueness?: unknown }).uniqueness
      }
    }
    const parsed = parseEffectRuleSet(withoutUniqueness)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    const state = supplyEffectState(prepared.value, stateInput)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared.value, state.value, {
      ...syntheticHitQuery,
    } as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const damageBonus = result.value.contributions.filter(
      (contribution) => contribution.address.kind === "factor",
    )
    expect(damageBonus).toHaveLength(2)
    const total = damageBonus.reduce((sum, entry) => sum + entry.value.value, 0)
    expect(total).toBeCloseTo(0.3, 12)
  })
})

describe("general and hit-local contributions dedupe at the hit address", () => {
  it("selects once at the hit while the panel keeps the general value", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as typeof syntheticRuleSet
    // 构造：通用攻击力 +100 与命中攻击力 +200 共用唯一键，原始攻击力 1000。
    const generalAttack = {
      kind: "contribution",
      effectId: "environment:spec:general-attack",
      source: ruleSet.effects[0]!.source,
      config: { kind: "constant", value: true },
      parameters: {},
      activation: { kind: "continuous" },
      beneficiary: { kind: "holder" },
      scope: "entity",
      when: { kind: "constant", value: true },
      operation: {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: { kind: "literal", unit: "attack-points", value: 100 },
      },
      uniqueness: {
        key: "spec-exclusive-attack",
        scope: "team",
        select: { kind: "highest-value" },
      },
    } as const
    const hitAttack = {
      ...generalAttack,
      effectId: "environment:spec:hit-attack",
      scope: "hit",
      operation: {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: { kind: "literal", unit: "attack-points", value: 200 },
      },
    } as const
    ;(ruleSet.effects as unknown as unknown[]).push(generalAttack, hitAttack)
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
    const state = supplyEffectState(prepared.value, {
      sessionId: "session:spec",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const hitResult = evaluateEffects(prepared.value, state.value, {
      ...syntheticHitQuery,
    } as never)
    expect(hitResult.ok).toBe(true)
    if (!hitResult.ok) {
      throw new Error("hit evaluation must succeed")
    }
    expect(hitResult.value.hit?.damageItems[0]?.finalStat).toBeCloseTo(1200, 9)
    const attackContributions = hitResult.value.contributions.filter(
      (contribution) =>
        contribution.address.kind === "stat" &&
        contribution.address.stat === "attack",
    )
    expect(attackContributions).toHaveLength(1)
    expect(attackContributions[0]!.value.value).toBeCloseTo(200, 9)
    expect(attackContributions[0]!.address).toMatchObject({
      hitId: "hit:spec-basic",
    })
    const panelResult = evaluateEffects(prepared.value, state.value, {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(panelResult.ok).toBe(true)
    if (!panelResult.ok) {
      throw new Error("panel evaluation must succeed")
    }
    const attack = panelResult.value.attributes.find(
      (attribute) => attribute.stat === "attack",
    )
    expect(attack?.value.value).toBeCloseTo(1100, 9)
    const panelAttackContributions = panelResult.value.contributions.filter(
      (contribution) =>
        contribution.address.kind === "stat" &&
        contribution.address.stat === "attack",
    )
    expect(panelAttackContributions).toHaveLength(1)
    expect(panelAttackContributions[0]!.value.value).toBeCloseTo(100, 9)
    expect(panelAttackContributions[0]!.address).toMatchObject({
      hitId: null,
    })
  })
})

describe("external instance synchronization acceptance", () => {
  function prepareMixed(): { prepared: PreparedEffects; state: EffectState } {
    const prepared = prepareWithExamples()
    const state = supplyEffectState(prepared, {
      ...mixedStateBeforeSynchronization,
    } as never)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("mixed state supply must succeed")
    }
    return { prepared, state: state.value }
  }

  it("renews the supplied astra core layer while preserving everything else", () => {
    const { prepared, state } = prepareMixed()
    const renewed = synchronizeSuppliedInstances(prepared, state, {
      ...renewSuppliedAstra,
    } as SuppliedInstancesUpdate)
    expect(renewed.ok).toBe(true)
    if (!renewed.ok) {
      throw new Error("synchronization must succeed")
    }
    const woodpeckerInstance = renewed.value
    void woodpeckerInstance
    const nextStateResult = renewed
    expect(nextStateResult.ok).toBe(true)
    const renewAgain = synchronizeSuppliedInstances(prepared, state, {
      ...renewSuppliedAstra,
    } as SuppliedInstancesUpdate)
    expect(renewAgain.ok).toBe(true)
    if (!renewAgain.ok) {
      throw new Error("repeated synchronization must succeed")
    }
    // 同一旧状态重复同步得到相同结果。
    const evaluateRenewed = (target: EffectState): number | undefined => {
      const result = evaluateEffects(prepared, target, {
        kind: "panel",
        atSeconds: 2,
        world: exampleWorld,
        observedSnapshots: [],
        entities: ["entity:attacker"],
        stats: ["attack"],
      } as EvaluationInput)
      expect(result.ok).toBe(true)
      if (!result.ok) {
        throw new Error("evaluation must succeed")
      }
      return result.value.attributes.find(
        (attribute) => attribute.stat === "attack",
      )?.value.value
    }
    // 啄木鸟自动层（+9% 最终百分比）与耀嘉音核心（+1600）同时有效：2000×1.09+1600。
    expect(evaluateRenewed(renewed.value)).toBeCloseTo(3780, 9)
    expect(evaluateRenewed(renewAgain.value)).toBeCloseTo(3780, 9)
    // 同步后的新状态重放同一同步输入报错。
    const replay = synchronizeSuppliedInstances(prepared, renewed.value, {
      ...renewSuppliedAstra,
    } as SuppliedInstancesUpdate)
    expect(replay.ok).toBe(false)
    if (!replay.ok) {
      expect(replay.issues.some((issue) => issue.code === "EVENT_ORDER")).toBe(
        true,
      )
    }
  })

  it("clears only the specified supplied scope", () => {
    const { prepared, state } = prepareMixed()
    const renewed = synchronizeSuppliedInstances(prepared, state, {
      ...renewSuppliedAstra,
    } as SuppliedInstancesUpdate)
    expect(renewed.ok).toBe(true)
    if (!renewed.ok) {
      throw new Error("synchronization must succeed")
    }
    const cleared = synchronizeSuppliedInstances(prepared, renewed.value, {
      ...clearSuppliedAstra,
      atSeconds: 3,
    } as SuppliedInstancesUpdate)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) {
      throw new Error("clear must succeed")
    }
    const result = evaluateEffects(prepared, cleared.value, {
      kind: "panel",
      atSeconds: 3,
      world: exampleWorld,
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats: ["attack", "criticalRate"],
    } as EvaluationInput)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const attack = result.value.attributes.find(
      (attribute) => attribute.stat === "attack",
    )
    // 耀嘉音核心实例被清除；啄木鸟自动层（到期 7 > 3）保留：2000×1.09。
    expect(attack?.value.value).toBeCloseTo(2180, 9)
    const contributionsQuery = evaluateEffects(prepared, cleared.value, {
      kind: "contributions",
      atSeconds: 3,
      world: exampleWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:attacker", "entity:astra", "entity:rina"],
    } as EvaluationInput)
    expect(contributionsQuery.ok).toBe(true)
    if (!contributionsQuery.ok) {
      throw new Error("contributions query must succeed")
    }
    // 音擎增伤 supplied 实例保留。
    expect(
      contributionsQuery.value.contributions.some(
        (contribution) =>
          contribution.origin.effectId ===
          "w-engine:14131:damage-on-energy-spend",
      ),
    ).toBe(true)
  })

  it("rejects a batch with duplicated scopes and keeps the old state", () => {
    const { prepared, state } = prepareMixed()
    const duplicate = {
      ...renewSuppliedAstra,
      replacements: [
        ...renewSuppliedAstra.replacements,
        ...renewSuppliedAstra.replacements,
      ],
    } as SuppliedInstancesUpdate
    const result = synchronizeSuppliedInstances(prepared, state, duplicate)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.pointer.includes("replacements")),
      ).toBe(true)
    }
  })

  it("rejects replacing an engine-managed triggered scope", () => {
    const { prepared, state } = prepareMixed()
    const result = synchronizeSuppliedInstances(prepared, state, {
      eventId: "event:sync-woodpecker",
      atSeconds: 2,
      sequence: 0,
      replacements: [
        {
          effectId: "disc:31000:four-piece:attack",
          bindingId: "binding:woodpecker",
          instances: [],
        },
      ],
      world: exampleWorld,
      observedSnapshots: [],
    } as SuppliedInstancesUpdate)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "INVALID_MODIFICATION" ||
            issue.code === "CONTEXT_MISMATCH",
        ),
      ).toBe(true)
    }
  })

  it("rejects a conflicting snapshot id", () => {
    const { prepared, state } = prepareMixed()
    const conflictingSnapshot = {
      snapshotId: "snapshot:basic-critical",
      atSeconds: 1,
      attributes: [
        {
          entityId: "entity:attacker",
          stat: "attack",
          stage: "initial",
          value: { unit: "attack-points", value: 9999 },
        },
      ],
      world: exampleWorld,
    }
    const result = synchronizeSuppliedInstances(prepared, state, {
      ...renewSuppliedAstra,
      observedSnapshots: [conflictingSnapshot],
    } as SuppliedInstancesUpdate)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    }
  })

  it("accepts a repeated snapshot whose object keys are ordered differently", () => {
    const { prepared, state } = prepareMixed()
    const recorded = mixedStateBeforeSynchronization.snapshots[0]
    const repeated = reorderObjectKeys(recorded)
    expect(JSON.stringify(repeated)).not.toBe(JSON.stringify(recorded))
    const result = synchronizeSuppliedInstances(prepared, state, {
      ...renewSuppliedAstra,
      observedSnapshots: [repeated],
    } as SuppliedInstancesUpdate)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("synchronization must succeed")
    }
    // 既有快照未被键顺序不同的重复提供覆盖：改变内容的同 ID 快照仍然冲突。
    const conflict = synchronizeSuppliedInstances(prepared, result.value, {
      ...renewSuppliedAstra,
      eventId: "event:sync-astra-core-conflict",
      atSeconds: 3,
      sequence: 1,
      observedSnapshots: [{ ...recorded, atSeconds: 1 }],
    } as SuppliedInstancesUpdate)
    expect(conflict.ok).toBe(false)
    if (conflict.ok) {
      throw new Error("synchronization must fail")
    }
    expect(
      conflict.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    ).toBe(true)
  })

  it("replays are rejected on the synchronized state", () => {
    const { prepared, state } = prepareMixed()
    const renewed = synchronizeSuppliedInstances(prepared, state, {
      ...renewSuppliedAstra,
    } as SuppliedInstancesUpdate)
    expect(renewed.ok).toBe(true)
    if (!renewed.ok) {
      throw new Error("synchronization must succeed")
    }
    const replay = synchronizeSuppliedInstances(prepared, renewed.value, {
      ...renewSuppliedAstra,
    } as SuppliedInstancesUpdate)
    expect(replay.ok).toBe(false)
  })
})

describe("state-bound instance filtering", () => {
  it("keeps state-bound instances only while the activation identity matches", () => {
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
    const stateInput: StateInput = {
      sessionId: "session:spec-bound",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:spec-a",
          effectId: "environment:spec:state-bound-effect",
          bindingId: "binding:spec",
          beneficiaryIds: ["entity:spec"],
          stackKey: [],
          lifetime: {
            kind: "state-bound",
            stateId: "state:spec:linger",
            stateOwnerId: "entity:spec",
            stateActivationId: "state-activation:spec-a",
          },
          layers: [
            {
              layerId: "layer:spec-a",
              startedAt: 0,
              expiresAt: null,
              trigger: null,
            },
          ],
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }
    const state = supplyEffectState(prepared.value, stateInput)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const activeWorld = {
      ...syntheticWorld,
      states: [
        {
          stateId: "state:spec:linger",
          bindingId: "binding:spec",
          ownerId: "entity:spec",
          active: true,
          activationId: "state-activation:spec-a",
          since: 0,
        },
      ],
    }
    const activeResult = evaluateEffects(prepared.value, state.value, {
      kind: "contributions",
      atSeconds: 1,
      world: activeWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:spec"],
    } as EvaluationInput)
    expect(activeResult.ok).toBe(true)
    if (!activeResult.ok) {
      throw new Error("evaluation must succeed")
    }
    expect(
      activeResult.value.contributions.some(
        (contribution) =>
          contribution.origin.effectId ===
          "environment:spec:state-bound-effect",
      ),
    ).toBe(true)
    const reenteredWorld = {
      ...syntheticWorld,
      states: [
        {
          stateId: "state:spec:linger",
          bindingId: "binding:spec",
          ownerId: "entity:spec",
          active: true,
          activationId: "state-activation:spec-b",
          since: 1,
        },
      ],
    }
    const reenteredResult = evaluateEffects(prepared.value, state.value, {
      kind: "contributions",
      atSeconds: 1,
      world: reenteredWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:spec"],
    } as EvaluationInput)
    expect(reenteredResult.ok).toBe(true)
    if (!reenteredResult.ok) {
      throw new Error("evaluation must succeed")
    }
    expect(
      reenteredResult.value.contributions.some(
        (contribution) =>
          contribution.origin.effectId ===
          "environment:spec:state-bound-effect",
      ),
    ).toBe(false)
    const inactiveWorld = {
      ...syntheticWorld,
      states: [
        {
          stateId: "state:spec:linger",
          bindingId: "binding:spec",
          ownerId: "entity:spec",
          active: false,
          activationId: null,
          since: null,
        },
      ],
    }
    const inactiveResult = evaluateEffects(prepared.value, state.value, {
      kind: "contributions",
      atSeconds: 1,
      world: inactiveWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:spec"],
    } as EvaluationInput)
    expect(inactiveResult.ok).toBe(true)
    if (!inactiveResult.ok) {
      throw new Error("evaluation must succeed")
    }
    expect(
      inactiveResult.value.contributions.some(
        (contribution) =>
          contribution.origin.effectId ===
          "environment:spec:state-bound-effect",
      ),
    ).toBe(false)
  })
})

describe("dependency cycles", () => {
  it("reports a real cycle with the full path", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as typeof syntheticRuleSet
    const selfReading = {
      kind: "contribution",
      effectId: "environment:spec:self-reading",
      source: ruleSet.effects[0]!.source,
      config: { kind: "constant", value: true },
      parameters: {},
      activation: { kind: "continuous" },
      beneficiary: { kind: "holder" },
      scope: "entity",
      when: { kind: "constant", value: true },
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
          at: "evaluation",
        },
      },
    } as const
    ;(ruleSet.effects as unknown as unknown[]).push(selfReading)
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
    const state = supplyEffectState(prepared.value, {
      sessionId: "session:spec-cycle",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared.value, state.value, {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const cycle = result.issues.find(
        (issue) => issue.code === "DEPENDENCY_CYCLE",
      )
      expect(cycle).toBeDefined()
      expect(cycle!.dependencyPath).toBeDefined()
      expect(cycle!.dependencyPath!.length).toBeGreaterThanOrEqual(2)
    }
  })

  it("cross-entity same-name stat dependencies do not form a false cycle", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as typeof syntheticRuleSet
    const crossEntity = {
      kind: "contribution",
      effectId: "environment:spec:cross-entity",
      source: ruleSet.effects[0]!.source,
      config: { kind: "constant", value: true },
      parameters: {},
      activation: { kind: "continuous" },
      beneficiary: { kind: "holder" },
      scope: "entity",
      when: { kind: "constant", value: true },
      operation: {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: {
          kind: "stat",
          unit: "attack-points",
          entity: { role: "entity", entityId: "entity:spec-target" },
          stat: "attack",
          stage: "initial",
          at: "evaluation",
        },
      },
    } as const
    ;(ruleSet.effects as unknown as unknown[]).push(crossEntity)
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
    const state = supplyEffectState(prepared.value, {
      sessionId: "session:spec-cross",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const result = evaluateEffects(prepared.value, state.value, {
      kind: "panel",
      atSeconds: 1,
      world: {
        ...syntheticWorld,
        entities: syntheticWorld.entities.map((entity) =>
          entity.entityId === "entity:spec-target" && entity.kind === "actor"
            ? {
                ...entity,
                generalStats: {
                  attack: {
                    baseValue: 500,
                    initialPercentage: [],
                    initialFixed: [],
                    finalPercentage: [],
                    finalFixed: [],
                  },
                },
              }
            : entity,
        ),
      },
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as EvaluationInput)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("evaluation must succeed")
    }
    const attack = result.value.attributes.find(
      (attribute) => attribute.stat === "attack",
    )
    expect(attack?.value.value).toBeCloseTo(1500, 9)
  })
})

void suppliedAstraState

function prepareAstraM6(): PreparedEffects {
  const parsed = parseEffectRuleSet(exampleRuleSet)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error("example rule set must parse")
  }
  const prepared = prepareEffects(parsed.value, [
    {
      kind: "agent",
      bindingId: "binding:astra",
      holderId: "entity:astra",
      sourceEntityId: "1311",
      eligible: true,
      configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
    },
  ])
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  return prepared.value
}

describe("action-origin matching for automatic third hit", () => {
  const m6World = {
    ...exampleWorld,
    entities: exampleWorld.entities.map((entity) =>
      entity.entityId === "entity:astra" && entity.kind === "actor"
        ? {
            ...entity,
            directStats: {
              criticalRate: { baseValue: 0.05, additions: [] },
            },
          }
        : entity,
    ),
  }

  const baseState: StateInput = {
    sessionId: "session:astra-m6",
    atSeconds: 1,
    instances: [],
    snapshots: [
      {
        snapshotId: "snapshot:astra-action",
        atSeconds: 1,
        attributes: [],
        world: m6World,
      },
    ],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  }

  it("grants the critical rate only to hits originating from the effect request", () => {
    const prepared = prepareAstraM6()
    const state = supplyEffectState(prepared, baseState)
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const automaticHit: EvaluationInput = {
      kind: "hit",
      atSeconds: 1,
      world: m6World,
      observedSnapshots: [],
      hit: {
        hitId: "hit:astra-auto-third",
        actionInstanceId: "action-instance:astra-auto-third",
        actionId: "action:astra:charged-basic-third",
        actorId: "entity:astra",
        targetId: "entity:spec-target",
        skillCategory: "basic",
        actionSnapshotId: "snapshot:astra-action",
        origin: {
          kind: "effect-request",
          requestId: "request:astra-auto",
          effectId: "agent:1311:mindscape-6:automatic-third-hit",
          bindingId: "binding:astra",
        },
        damageItems: [{ itemId: "main", damageMultiplier: 1, stat: "attack" }],
      },
    } as never
    const autoResult = evaluateEffects(prepared, state.value, automaticHit)
    expect(autoResult.ok).toBe(true)
    if (!autoResult.ok) {
      throw new Error("evaluation must succeed")
    }
    expect(autoResult.value.hit?.criticalRate).toBeCloseTo(0.85, 12)
    const manualHit = {
      ...(automaticHit as object),
      hit: {
        ...((automaticHit as { hit: object }).hit as object),
        hitId: "hit:astra-manual-third",
        actionInstanceId: "action-instance:astra-manual-third",
        origin: { kind: "direct" },
      },
    } as never
    const manualResult = evaluateEffects(prepared, state.value, manualHit)
    expect(manualResult.ok).toBe(true)
    if (!manualResult.ok) {
      throw new Error("evaluation must succeed")
    }
    expect(manualResult.value.hit?.criticalRate).toBeCloseTo(0.05, 12)
    const panel = evaluateEffects(prepared, state.value, {
      kind: "panel",
      atSeconds: 1,
      world: m6World,
      observedSnapshots: [],
      entities: ["entity:astra"],
      stats: ["criticalRate"],
    } as EvaluationInput)
    expect(panel.ok).toBe(true)
    if (!panel.ok) {
      throw new Error("evaluation must succeed")
    }
    const criticalRate = panel.value.attributes.find(
      (attribute) => attribute.stat === "criticalRate",
    )
    expect(criticalRate?.value.value).toBeCloseTo(0.05, 12)
  })
})

describe("rule order stability", () => {
  it("reordering the rule array does not change results or identities", () => {
    const original = structuredClone(exampleRuleSet)
    const reordered = structuredClone(exampleRuleSet) as unknown as {
      effects: unknown[]
    }
    reordered.effects = [...reordered.effects].toReversed()
    const results: number[] = []
    for (const ruleSet of [original, reordered]) {
      const parsed = parseEffectRuleSet(ruleSet)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) {
        throw new Error("rule set must parse")
      }
      const prepared = prepareEffects(parsed.value, [
        {
          kind: "agent",
          bindingId: "binding:astra",
          holderId: "entity:astra",
          sourceEntityId: "1311",
          eligible: true,
          configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
        },
      ])
      expect(prepared.ok).toBe(true)
      if (!prepared.ok) {
        throw new Error("prepare must succeed")
      }
      const world = {
        ...exampleWorld,
        entities: exampleWorld.entities.map((entity) =>
          entity.entityId === "entity:astra" && entity.kind === "actor"
            ? {
                ...entity,
                generalStats: {
                  attack: {
                    baseValue: 3000,
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
      const state = supplyEffectState(prepared.value, {
        ...suppliedAstraState,
        snapshots: [
          { snapshotId: "snapshot:entry", atSeconds: 0, attributes: [], world },
        ],
      } as never)
      expect(state.ok).toBe(true)
      if (!state.ok) {
        throw new Error("state supply must succeed")
      }
      const result = evaluateEffects(prepared.value, state.value, {
        kind: "panel",
        atSeconds: 0,
        world,
        observedSnapshots: [],
        entities: ["entity:attacker"],
        stats: ["attack"],
      } as EvaluationInput)
      expect(result.ok).toBe(true)
      if (!result.ok) {
        throw new Error("evaluation must succeed")
      }
      results.push(
        result.value.attributes.find((attribute) => attribute.stat === "attack")
          ?.value.value ?? Number.NaN,
      )
    }
    expect(results[0]).toBeCloseTo(results[1]!, 12)
  })
})

const alwaysCondition = { kind: "constant", value: true } as const
const attackPointsLiteral = (value: number) =>
  ({ kind: "literal", unit: "attack-points", value }) as const
const ratioLiteral = (value: number) =>
  ({ kind: "literal", unit: "ratio", value }) as const
const multiplierLiteral = (value: number) =>
  ({ kind: "literal", unit: "multiplier", value }) as const
const countLiteral = (value: number) =>
  ({ kind: "literal", unit: "count", value }) as const
const parameterReference = (unit: string, name: string) =>
  ({ kind: "parameter", unit, name }) as const
const fixedAttack = (value: unknown) => ({
  kind: "stat-adjustment",
  stat: "attack",
  stage: "final-fixed",
  value: typeof value === "number" ? attackPointsLiteral(value) : value,
})

/** 合成来源的贡献规则；额外字段覆盖 scope、when、parameters、uniqueness 等声明。 */
function syntheticContribution(
  effectId: string,
  operation: unknown,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    kind: "contribution",
    effectId,
    source: structuredClone(syntheticRuleSet.effects[0]!.source),
    config: alwaysCondition,
    parameters: {},
    activation: { kind: "continuous" },
    beneficiary: { kind: "holder" },
    scope: "entity",
    when: alwaysCondition,
    operation,
    ...extra,
  }
}

/** 贡献阶段的修改规则；目标默认指向同一持有者的效果。 */
function syntheticContributionModification(
  effectId: string,
  targetEffectId: string,
  modifications: readonly unknown[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    kind: "modification",
    effectId,
    source: structuredClone(syntheticRuleSet.effects[0]!.source),
    config: alwaysCondition,
    parameters: {},
    phase: "contribution",
    target: { kind: "effect", effectId: targetEffectId },
    when: alwaysCondition,
    modifications,
    ...extra,
  }
}

function prepareSyntheticWithEffects(
  extraEffects: readonly unknown[],
): PreparedEffects {
  const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
    effects: unknown[]
  }
  ruleSet.effects.push(...(structuredClone(extraEffects) as unknown[]))
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

function supplySyntheticState(prepared: PreparedEffects): EffectState {
  const state = supplyEffectState(prepared, {
    sessionId: "session:spec-review",
    atSeconds: 0,
    instances: [],
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  expect(state.ok).toBe(true)
  if (!state.ok) {
    throw new Error("state supply must succeed")
  }
  return state.value
}

function panelAttack(
  prepared: PreparedEffects,
  state: EffectState,
  world: unknown = syntheticWorld,
): number {
  const result = evaluateEffects(prepared, state, {
    kind: "panel",
    atSeconds: 1,
    world,
    observedSnapshots: [],
    entities: ["entity:spec"],
    stats: ["attack"],
  } as never)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error("panel evaluation must succeed")
  }
  const attack = result.value.attributes.find(
    (attribute) => attribute.stat === "attack",
  )
  return attack?.value.value ?? Number.NaN
}

function withSyntheticStates(
  states: readonly unknown[],
): Record<string, unknown> {
  return { ...structuredClone(syntheticWorld), states }
}

describe("contribution-phase modification parameter scope", () => {
  it("reads the modification rule's own parameters, not the target's", () => {
    const target = syntheticContribution(
      "environment:spec:parameter-target",
      fixedAttack(100),
      {
        parameters: {
          bonus: { kind: "constant", unit: "attack-points", value: 900 },
        },
      },
    )
    const modification = syntheticContributionModification(
      "environment:spec:parameter-modification",
      "environment:spec:parameter-target",
      [
        {
          field: "output",
          unit: "attack-points",
          change: {
            operator: "add",
            value: parameterReference("attack-points", "bonus"),
          },
        },
      ],
      {
        parameters: {
          bonus: { kind: "constant", unit: "attack-points", value: 50 },
        },
      },
    )
    const prepared = prepareSyntheticWithEffects([target, modification])
    // 目标规则也声明 bonus = 900，但修改操作数只读修改规则自己的 50。
    expect(panelAttack(prepared, supplySyntheticState(prepared))).toBeCloseTo(
      1150,
      9,
    )
  })

  it("rejects an expression that references an undeclared parameter", () => {
    const target = syntheticContribution(
      "environment:spec:missing-parameter-target",
      fixedAttack(100),
    )
    const modification = syntheticContributionModification(
      "environment:spec:missing-parameter-modification",
      "environment:spec:missing-parameter-target",
      [
        {
          field: "output",
          unit: "attack-points",
          change: {
            operator: "add",
            value: parameterReference("attack-points", "absent"),
          },
        },
      ],
    )
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: unknown[]
    }
    ruleSet.effects.push(target, modification)
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(
        parsed.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
      ).toBe(true)
    }
  })
})

describe("contribution-phase field normalization", () => {
  const parameterTarget = syntheticContribution(
    "environment:spec:field-target",
    fixedAttack(parameterReference("attack-points", "amount")),
    {
      parameters: {
        amount: { kind: "constant", unit: "attack-points", value: 100 },
      },
    },
  )
  const scaleAmount = {
    field: "parameter",
    name: "amount",
    unit: "attack-points",
    change: { operator: "scale", value: multiplierLiteral(2) },
  }
  const addAmount = {
    field: "parameter",
    name: "amount",
    unit: "attack-points",
    change: { operator: "add", value: attackPointsLiteral(10) },
  }
  const setAmount = (value: number) => ({
    field: "parameter",
    name: "amount",
    unit: "attack-points",
    change: { operator: "set", value: attackPointsLiteral(value) },
  })

  it("applies (set or base + adds) × scales per field regardless of order", () => {
    for (const changes of [
      [scaleAmount, addAmount],
      [addAmount, scaleAmount],
    ]) {
      const prepared = prepareSyntheticWithEffects([
        parameterTarget,
        syntheticContributionModification(
          "environment:spec:field-modification",
          "environment:spec:field-target",
          changes,
        ),
      ])
      // (100 + 10) × 2 = 220，声明顺序不改变结果。
      expect(panelAttack(prepared, supplySyntheticState(prepared))).toBeCloseTo(
        1220,
        9,
      )
    }
  })

  it("merges equal set values", () => {
    const prepared = prepareSyntheticWithEffects([
      parameterTarget,
      syntheticContributionModification(
        "environment:spec:set-a",
        "environment:spec:field-target",
        [setAmount(200)],
      ),
      syntheticContributionModification(
        "environment:spec:set-b",
        "environment:spec:field-target",
        [setAmount(200)],
      ),
    ])
    expect(panelAttack(prepared, supplySyntheticState(prepared))).toBeCloseTo(
      1200,
      9,
    )
  })

  it("reports conflicting effective set values", () => {
    const prepared = prepareSyntheticWithEffects([
      parameterTarget,
      syntheticContributionModification(
        "environment:spec:set-conflict",
        "environment:spec:field-target",
        [setAmount(200), setAmount(300)],
      ),
    ])
    const result = evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "MODIFICATION_CONFLICT"),
      ).toBe(true)
    }
  })

  it("normalizes output modifications on the layer result", () => {
    const prepared = prepareSyntheticWithEffects([
      syntheticContribution("environment:spec:output-target", fixedAttack(100)),
      syntheticContributionModification(
        "environment:spec:output-modification",
        "environment:spec:output-target",
        [
          {
            field: "output",
            unit: "attack-points",
            change: { operator: "add", value: attackPointsLiteral(5) },
          },
          {
            field: "output",
            unit: "attack-points",
            change: { operator: "scale", value: multiplierLiteral(1.3) },
          },
        ],
      ),
    ])
    // 1000 + (100 + 5) × 1.3 = 1136.5
    expect(panelAttack(prepared, supplySyntheticState(prepared))).toBeCloseTo(
      1136.5,
      9,
    )
  })
})

describe("hit-local attribute isolation", () => {
  it("keeps hit-local contributions out of the general attribute node", () => {
    const conversion = syntheticContribution(
      "environment:spec:conversion",
      fixedAttack({
        kind: "multiply",
        unit: "attack-points",
        coefficient: ratioLiteral(0.1),
        value: {
          kind: "stat",
          unit: "attack-points",
          entity: { role: "holder" },
          stat: "attack",
          stage: "initial",
          at: "evaluation",
        },
      }),
    )
    const hitInitialAttack = syntheticContribution(
      "environment:spec:hit-initial-attack",
      {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "initial-fixed",
        value: attackPointsLiteral(100),
      },
      { scope: "hit" },
    )
    const prepared = prepareSyntheticWithEffects([conversion, hitInitialAttack])
    const state = supplySyntheticState(prepared)
    // 通用初始攻击力 1000 的 10% 只按通用节点计算，命中局部 +100 不得混入。
    expect(panelAttack(prepared, state)).toBeCloseTo(1100, 9)
    const hitResult = evaluateEffects(prepared, state, {
      ...structuredClone(syntheticHitQuery),
    } as never)
    expect(hitResult.ok).toBe(true)
    if (!hitResult.ok) {
      throw new Error("hit evaluation must succeed")
    }
    expect(hitResult.value.hit?.damageItems[0]?.finalStat).toBeCloseTo(1200, 9)
  })

  it("keeps hit-local nodes separate across hits", () => {
    const basicOnlyAttack = syntheticContribution(
      "environment:spec:basic-only-attack",
      {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "initial-fixed",
        value: attackPointsLiteral(100),
      },
      {
        scope: "hit",
        when: {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["basic"],
        },
      },
    )
    const prepared = prepareSyntheticWithEffects([basicOnlyAttack])
    const state = supplySyntheticState(prepared)
    const basicResult = evaluateEffects(prepared, state, {
      ...structuredClone(syntheticHitQuery),
    } as never)
    const chainResult = evaluateEffects(prepared, state, {
      ...structuredClone(syntheticHitQuery),
      hit: {
        ...syntheticHitQuery.hit,
        hitId: "hit:spec-chain",
        skillCategory: "chain",
      },
    } as never)
    expect(basicResult.ok).toBe(true)
    expect(chainResult.ok).toBe(true)
    if (!basicResult.ok || !chainResult.ok) {
      throw new Error("hit evaluations must succeed")
    }
    expect(basicResult.value.hit?.damageItems[0]?.finalStat).toBeCloseTo(
      1100,
      9,
    )
    expect(chainResult.value.hit?.damageItems[0]?.finalStat).toBeCloseTo(
      1000,
      9,
    )
    expect(panelAttack(prepared, state)).toBeCloseTo(1000, 9)
  })
})

describe("hit multiplier beneficiary scoping", () => {
  it("applies a team-wide hit multiplier once to the current attacker", () => {
    const teamMultiplier = syntheticContribution(
      "environment:spec:team-hit-multiplier",
      {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        value: multiplierLiteral(2),
      },
      { scope: "hit", beneficiary: { kind: "team" } },
    )
    const otherMemberMultiplier = syntheticContribution(
      "environment:spec:other-member-multiplier",
      {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        value: multiplierLiteral(3),
      },
      { scope: "hit", beneficiary: { kind: "team-except-holder" } },
    )
    const prepared = prepareSyntheticWithEffects([
      teamMultiplier,
      otherMemberMultiplier,
    ])
    const state = supplySyntheticState(prepared)
    const world = structuredClone(syntheticWorld) as unknown as {
      entities: { entityId: string; teamId: string }[]
    }
    for (const entity of world.entities) {
      entity.teamId = "team:spec"
    }
    const result = evaluateEffects(prepared, state, {
      ...structuredClone(syntheticHitQuery),
      world,
    } as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("hit evaluation must succeed")
    }
    // 全队 ×2 只按当前进攻者消费一次；只作用于其他队员的 ×3 不进入本次命中。
    expect(result.value.hit?.damageItems[0]?.damageMultiplier).toBeCloseTo(2, 9)
  })
})

describe("configuration expressions in uniqueness selection", () => {
  it("selects the higher priority computed from an arithmetic expression", () => {
    const prepared = prepareSyntheticWithEffects([
      syntheticContribution("environment:spec:priority-one", fixedAttack(100), {
        uniqueness: {
          key: "spec-priority",
          scope: "global",
          select: { kind: "priority", priority: countLiteral(1) },
        },
      }),
      syntheticContribution("environment:spec:priority-two", fixedAttack(200), {
        uniqueness: {
          key: "spec-priority",
          scope: "global",
          select: {
            kind: "priority",
            priority: {
              kind: "add",
              unit: "count",
              operands: [countLiteral(1), countLiteral(1)],
            },
          },
        },
      }),
    ])
    expect(panelAttack(prepared, supplySyntheticState(prepared))).toBeCloseTo(
      1200,
      9,
    )
  })

  it("rejects a priority expression that is not an integer", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: unknown[]
    }
    ruleSet.effects.push(
      syntheticContribution(
        "environment:spec:fractional-priority",
        fixedAttack(100),
        {
          uniqueness: {
            key: "spec-priority",
            scope: "global",
            select: { kind: "priority", priority: countLiteral(1.5) },
          },
        },
      ),
    )
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(false)
    if (!prepared.ok) {
      expect(
        prepared.issues.some(
          (issue) =>
            issue.code === "INVALID_DEFINITION" &&
            issue.pointer.includes("uniqueness/select/priority"),
        ),
      ).toBe(true)
    }
  })

  it("reads applicable configuration numbers in priority expressions", () => {
    const ruleSet = structuredClone(exampleRuleSet) as unknown as {
      effects: unknown[]
    }
    const source = (ruleSet.effects[0] as { source: unknown }).source
    const withPriority = (
      effectId: string,
      priority: unknown,
      value: number,
    ): Record<string, unknown> => ({
      kind: "contribution",
      effectId,
      source: structuredClone(source),
      config: alwaysCondition,
      parameters: {},
      activation: { kind: "continuous" },
      beneficiary: { kind: "holder" },
      scope: "entity",
      when: alwaysCondition,
      uniqueness: {
        key: "spec-configuration-priority",
        scope: "global",
        select: { kind: "priority", priority },
      },
      operation: {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: attackPointsLiteral(value),
      },
    })
    ruleSet.effects.push(
      withPriority("agent:1311:priority-literal", countLiteral(1), 100),
      withPriority(
        "agent:1311:priority-configuration",
        { kind: "configuration-number", unit: "count", field: "mindscapeRank" },
        200,
      ),
    )
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [
      {
        kind: "agent",
        bindingId: "binding:astra",
        holderId: "entity:astra",
        sourceEntityId: "1311",
        eligible: true,
        configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
      },
    ])
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error("prepare must succeed")
    }
    const state = supplyEffectState(prepared.value, {
      sessionId: "session:spec-configuration-priority",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const world = {
      ...structuredClone(exampleWorld),
      entities: exampleWorld.entities.map((entity) =>
        entity.entityId === "entity:astra" && entity.kind === "actor"
          ? {
              ...entity,
              generalStats: {
                attack: {
                  baseValue: 3000,
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
    const result = evaluateEffects(prepared.value, state.value, {
      kind: "panel",
      atSeconds: 0,
      world,
      observedSnapshots: [],
      entities: ["entity:astra"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("panel evaluation must succeed")
    }
    // mindscapeRank = 2 胜过字面量 1：只保留 +200。
    expect(
      result.value.attributes.find((attribute) => attribute.stat === "attack")
        ?.value.value,
    ).toBeCloseTo(3200, 9)
  })
})

describe("non-finite evaluation boundaries", () => {
  it("fails instead of returning an overflowed direct stat", () => {
    const prepared = prepareSyntheticWithEffects([
      syntheticContribution("environment:spec:overflowing-rate", {
        kind: "stat-adjustment",
        stat: "criticalRate",
        stage: "direct",
        value: {
          kind: "multiply",
          unit: "ratio",
          value: ratioLiteral(1e308),
          coefficient: multiplierLiteral(2),
        },
      }),
    ])
    const result = evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["criticalRate"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when aggregated contributions overflow", () => {
    const prepared = prepareSyntheticWithEffects([
      syntheticContribution("environment:spec:huge-a", fixedAttack(1e308)),
      syntheticContribution("environment:spec:huge-b", fixedAttack(1e308)),
    ])
    const result = evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(false)
  })

  it("fails when a hit multiplier product overflows", () => {
    const hugeMultiplier = (effectId: string) =>
      syntheticContribution(
        effectId,
        {
          kind: "hit-adjustment",
          field: "damageMultiplier",
          operator: "scale",
          value: multiplierLiteral(1e308),
        },
        { scope: "hit" },
      )
    const prepared = prepareSyntheticWithEffects([
      hugeMultiplier("environment:spec:huge-multiplier-a"),
      hugeMultiplier("environment:spec:huge-multiplier-b"),
    ])
    const result = evaluateEffects(prepared, supplySyntheticState(prepared), {
      ...structuredClone(syntheticHitQuery),
    } as never)
    expect(result.ok).toBe(false)
  })

  it("keeps signed ratios and values above one hundred percent valid", () => {
    const prepared = prepareSyntheticWithEffects([
      syntheticContribution("environment:spec:large-damage-bonus", {
        kind: "factor-contribution",
        channel: "damage-bonus",
        value: ratioLiteral(2.5),
      }),
      syntheticContribution("environment:spec:negative-critical-rate", {
        kind: "stat-adjustment",
        stat: "criticalRate",
        stage: "direct",
        value: ratioLiteral(-0.02),
      }),
    ])
    const state = supplySyntheticState(prepared)
    const panel = evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["criticalRate"],
    } as never)
    expect(panel.ok).toBe(true)
    if (!panel.ok) {
      throw new Error("panel evaluation must succeed")
    }
    expect(
      panel.value.attributes.find(
        (attribute) => attribute.stat === "criticalRate",
      )?.value.value,
    ).toBeCloseTo(0.03, 12)
    const contributions = evaluateEffects(prepared, state, {
      kind: "contributions",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      beneficiaries: ["entity:spec"],
    } as EvaluationInput)
    expect(contributions.ok).toBe(true)
    if (!contributions.ok) {
      throw new Error("contribution evaluation must succeed")
    }
    const damageBonus = contributions.value.contributions.find(
      (contribution) =>
        contribution.address.kind === "factor" &&
        contribution.origin.effectId === "environment:spec:large-damage-bonus",
    )
    expect(damageBonus?.value.value).toBeCloseTo(2.5, 12)
  })
})

describe("state observation reads", () => {
  const inactiveStateBonus = syntheticContribution(
    "environment:spec:inactive-state-bonus",
    fixedAttack(100),
    {
      when: {
        kind: "state-is",
        stateId: "state:spec:linger",
        owner: { role: "holder" },
        at: "evaluation",
        active: false,
      },
    },
  )

  function panelResult(prepared: PreparedEffects, world: unknown) {
    return evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
  }

  it("fails when a required state observation is missing", () => {
    const prepared = prepareSyntheticWithEffects([inactiveStateBonus])
    const result = panelResult(prepared, withSyntheticStates([]))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })

  it("distinguishes an explicit inactive observation from an active one", () => {
    const prepared = prepareSyntheticWithEffects([inactiveStateBonus])
    const inactive = withSyntheticStates([
      {
        stateId: "state:spec:linger",
        bindingId: "binding:spec",
        ownerId: "entity:spec",
        active: false,
        activationId: null,
        since: null,
      },
    ])
    expect(
      panelAttack(prepared, supplySyntheticState(prepared), inactive),
    ).toBeCloseTo(1100, 9)
    const active = withSyntheticStates([
      {
        stateId: "state:spec:linger",
        bindingId: "binding:spec",
        ownerId: "entity:spec",
        active: true,
        activationId: "state-activation:spec-a",
        since: 0,
      },
    ])
    expect(
      panelAttack(prepared, supplySyntheticState(prepared), active),
    ).toBeCloseTo(1000, 9)
  })

  it("reads only the observation of the rule's own source binding", () => {
    const prepared = prepareSyntheticWithEffects([inactiveStateBonus])
    const foreignBindingRecord = withSyntheticStates([
      {
        stateId: "state:spec:linger",
        bindingId: "binding:spec-other",
        ownerId: "entity:spec",
        active: true,
        activationId: "state-activation:spec-other",
        since: 0,
      },
    ])
    const foreignResult = panelResult(prepared, foreignBindingRecord)
    expect(foreignResult.ok).toBe(false)
    if (!foreignResult.ok) {
      expect(
        foreignResult.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    }
    const ownRecord = {
      ...foreignBindingRecord,
      states: [
        ...(foreignBindingRecord["states"] as unknown[]),
        {
          stateId: "state:spec:linger",
          bindingId: "binding:spec",
          ownerId: "entity:spec",
          active: false,
          activationId: null,
          since: null,
        },
      ],
    }
    expect(
      panelAttack(prepared, supplySyntheticState(prepared), ownRecord),
    ).toBeCloseTo(1100, 9)
  })

  it("does not require state observations this evaluation never reads", () => {
    const prepared = prepareSynthetic()
    expect(
      panelAttack(
        prepared,
        supplySyntheticState(prepared),
        withSyntheticStates([]),
      ),
    ).toBeCloseTo(1000, 9)
  })
})

/** 状态绑定贡献规则：以外部导入层覆盖求值侧的观察与唯一性边界。 */
function stateBoundContribution(
  effectId: string,
  operation: unknown,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return syntheticContribution(effectId, operation, {
    activation: {
      kind: "triggered",
      trigger: { eventKinds: ["state-observed"], when: alwaysCondition },
      lifetime: {
        kind: "state-bound",
        stateId: "state:spec:linger",
        stateOwner: { role: "holder" },
      },
      layering: {
        recipientPartition: "individual",
        keys: [],
        maximum: countLiteral(2),
        onRetrigger: "add-layer",
        atCapacity: "ignore-new-layer",
      },
    },
    ...extra,
  })
}

function stateBoundLayerInstance(
  instanceId: string,
  effectId: string,
  options: {
    layerId: string
    startedAt: number
    stateActivationId?: string
  },
): Record<string, unknown> {
  return {
    instanceId,
    effectId,
    bindingId: "binding:spec",
    beneficiaryIds: ["entity:spec"],
    stackKey: [],
    lifetime: {
      kind: "state-bound",
      stateId: "state:spec:linger",
      stateOwnerId: "entity:spec",
      stateActivationId: options.stateActivationId ?? "state-activation:spec-a",
    },
    layers: [
      {
        layerId: options.layerId,
        startedAt: options.startedAt,
        expiresAt: null,
        trigger: null,
      },
    ],
  }
}

function supplyInstances(
  prepared: PreparedEffects,
  instances: readonly unknown[],
  atSeconds = 0,
): EffectState {
  const state = supplyEffectState(prepared, {
    sessionId: "session:spec-observation-boundary",
    atSeconds,
    instances: structuredClone(instances) as never,
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  expect(state.ok).toBe(true)
  if (!state.ok) {
    throw new Error(
      `state supply must succeed: ${JSON.stringify(state.issues)}`,
    )
  }
  return state.value
}

/** 贡献查询中落到攻击力地址的来源；合成规则集的其他通道不属于本次断言。 */
function contributionEffects(
  prepared: PreparedEffects,
  state: EffectState,
  world: unknown,
): readonly string[] {
  const result = evaluateEffects(prepared, state, {
    kind: "contributions",
    atSeconds: 1,
    world,
    observedSnapshots: [],
    beneficiaries: ["entity:spec"],
  } as never)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(
      `contribution query must succeed: ${JSON.stringify(result.issues)}`,
    )
  }
  return result.value.contributions
    .filter(
      (contribution) =>
        contribution.address.kind === "stat" &&
        contribution.address.stat === "attack",
    )
    .map((contribution) => contribution.origin.effectId)
}

const activeSyntheticStateRecord = {
  stateId: "state:spec:linger",
  bindingId: "binding:spec",
  ownerId: "entity:spec",
  active: true,
  activationId: "state-activation:spec-a",
  since: 0,
} as const

describe("state-bound observation boundaries", () => {
  const boundEffectId = "environment:spec:bound-attack"
  const boundAttack = stateBoundContribution(boundEffectId, fixedAttack(100))
  const boundInstance = stateBoundLayerInstance(
    "instance:spec-bound",
    boundEffectId,
    { layerId: "layer:spec-bound", startedAt: 0 },
  )

  it("fails when a consumed state-bound instance has no observation", () => {
    const prepared = prepareSyntheticWithEffects([boundAttack])
    const state = supplyInstances(prepared, [boundInstance])
    const result = evaluateEffects(prepared, state, {
      kind: "contributions",
      atSeconds: 1,
      world: withSyntheticStates([]),
      observedSnapshots: [],
      beneficiaries: ["entity:spec"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })

  it("keeps the instance while the activation identity matches", () => {
    const prepared = prepareSyntheticWithEffects([boundAttack])
    const state = supplyInstances(prepared, [boundInstance])
    expect(
      contributionEffects(
        prepared,
        state,
        withSyntheticStates([activeSyntheticStateRecord]),
      ),
    ).toContain(boundEffectId)
    expect(
      panelAttack(
        prepared,
        state,
        withSyntheticStates([activeSyntheticStateRecord]),
      ),
    ).toBeCloseTo(1100, 9)
  })

  it("drops the instance when the state ended or the activation identity changed", () => {
    const prepared = prepareSyntheticWithEffects([boundAttack])
    const state = supplyInstances(prepared, [boundInstance])
    const ended = withSyntheticStates([
      {
        stateId: "state:spec:linger",
        bindingId: "binding:spec",
        ownerId: "entity:spec",
        active: false,
        activationId: null,
        since: null,
      },
    ])
    expect(contributionEffects(prepared, state, ended)).not.toContain(
      boundEffectId,
    )
    expect(panelAttack(prepared, state, ended)).toBeCloseTo(1000, 9)
    const reentered = withSyntheticStates([
      {
        ...activeSyntheticStateRecord,
        activationId: "state-activation:spec-b",
      },
    ])
    expect(contributionEffects(prepared, state, reentered)).not.toContain(
      boundEffectId,
    )
    expect(panelAttack(prepared, state, reentered)).toBeCloseTo(1000, 9)
  })

  it("does not require the observation of a state-bound instance this query never consumes", () => {
    const rateEffectId = "environment:spec:bound-rate"
    const boundRate = stateBoundContribution(rateEffectId, {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: ratioLiteral(0.5),
    })
    const prepared = prepareSyntheticWithEffects([boundRate])
    const state = supplyInstances(prepared, [
      stateBoundLayerInstance("instance:spec-rate", rateEffectId, {
        layerId: "layer:spec-rate",
        startedAt: 0,
      }),
    ])
    // attack 查询不消费该状态绑定实例，因此不需要它的观察记录。
    expect(panelAttack(prepared, state, withSyntheticStates([]))).toBeCloseTo(
      1000,
      9,
    )
    // 真正消费该实例的查询仍然要求观察记录。
    const consumed = evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 1,
      world: withSyntheticStates([]),
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["criticalRate"],
    } as never)
    expect(consumed.ok).toBe(false)
    if (!consumed.ok) {
      expect(
        consumed.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    }
  })
})

describe("uniqueness selection boundaries", () => {
  const latestActivation = {
    key: "spec-latest",
    scope: "global",
    select: { kind: "latest-activation" },
  } as const
  const prioritySelection = (priority: number) => ({
    key: "spec-priority",
    scope: "global",
    select: { kind: "priority", priority: countLiteral(priority) },
  })
  const activeWorld = withSyntheticStates([activeSyntheticStateRecord])

  function latestRule(effectId: string, value: number) {
    return stateBoundContribution(effectId, fixedAttack(value), {
      uniqueness: latestActivation,
    })
  }

  it("reports a conflict when the newest activations tie with unequal values", () => {
    const prepared = prepareSyntheticWithEffects([
      latestRule("environment:spec:latest-a", 100),
      latestRule("environment:spec:latest-b", 200),
    ])
    const state = supplyInstances(prepared, [
      stateBoundLayerInstance(
        "instance:spec-latest-a",
        "environment:spec:latest-a",
        { layerId: "layer:spec-latest-a", startedAt: 0 },
      ),
      stateBoundLayerInstance(
        "instance:spec-latest-b",
        "environment:spec:latest-b",
        { layerId: "layer:spec-latest-b", startedAt: 0 },
      ),
    ])
    const result = evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 1,
      world: activeWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "UNIQUENESS_CONFLICT"),
      ).toBe(true)
    }
  })

  it("selects a stable source when the tied newest values agree", () => {
    const prepared = prepareSyntheticWithEffects([
      latestRule("environment:spec:latest-a", 100),
      latestRule("environment:spec:latest-b", 100),
    ])
    const state = supplyInstances(prepared, [
      stateBoundLayerInstance(
        "instance:spec-latest-a",
        "environment:spec:latest-a",
        { layerId: "layer:spec-latest-a", startedAt: 0 },
      ),
      stateBoundLayerInstance(
        "instance:spec-latest-b",
        "environment:spec:latest-b",
        { layerId: "layer:spec-latest-b", startedAt: 0 },
      ),
    ])
    const contributions = contributionEffects(prepared, state, activeWorld)
    expect(contributions).toEqual(["environment:spec:latest-a"])
    expect(panelAttack(prepared, state, activeWorld)).toBeCloseTo(1100, 9)
  })

  it("ignores differences among earlier candidates once a newer activation wins", () => {
    const prepared = prepareSyntheticWithEffects([
      latestRule("environment:spec:latest-a", 100),
      latestRule("environment:spec:latest-b", 200),
      latestRule("environment:spec:latest-c", 300),
    ])
    const state = supplyInstances(
      prepared,
      [
        stateBoundLayerInstance(
          "instance:spec-latest-a",
          "environment:spec:latest-a",
          { layerId: "layer:spec-latest-a", startedAt: 0 },
        ),
        stateBoundLayerInstance(
          "instance:spec-latest-b",
          "environment:spec:latest-b",
          { layerId: "layer:spec-latest-b", startedAt: 0 },
        ),
        stateBoundLayerInstance(
          "instance:spec-latest-c",
          "environment:spec:latest-c",
          { layerId: "layer:spec-latest-c", startedAt: 1 },
        ),
      ],
      1,
    )
    const contributions = contributionEffects(prepared, state, activeWorld)
    expect(contributions).toEqual(["environment:spec:latest-c"])
    expect(panelAttack(prepared, state, activeWorld)).toBeCloseTo(1300, 9)
  })

  function priorityRule(effectId: string, priority: number, value: number) {
    return syntheticContribution(effectId, fixedAttack(value), {
      uniqueness: prioritySelection(priority),
    })
  }

  it("resolves the highest priority before checking ties among the top candidates", () => {
    const prepared = prepareSyntheticWithEffects([
      priorityRule("environment:spec:priority-a", 1, 100),
      priorityRule("environment:spec:priority-b", 1, 200),
      priorityRule("environment:spec:priority-c", 2, 300),
    ])
    const state = supplySyntheticState(prepared)
    const contributions = contributionEffects(prepared, state, syntheticWorld)
    expect(contributions).toEqual(["environment:spec:priority-c"])
    expect(panelAttack(prepared, state)).toBeCloseTo(1300, 9)
  })

  it("reports a conflict only when the top-priority candidates disagree", () => {
    const conflicting = prepareSyntheticWithEffects([
      priorityRule("environment:spec:priority-a", 1, 100),
      priorityRule("environment:spec:priority-b", 1, 200),
      priorityRule("environment:spec:priority-c", 2, 300),
      priorityRule("environment:spec:priority-d", 2, 400),
    ])
    const state = supplySyntheticState(conflicting)
    const result = evaluateEffects(conflicting, state, {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "UNIQUENESS_CONFLICT"),
      ).toBe(true)
    }
  })

  it("selects a stable source when the top-priority candidates agree", () => {
    const prepared = prepareSyntheticWithEffects([
      priorityRule("environment:spec:priority-a", 1, 100),
      priorityRule("environment:spec:priority-b", 2, 200),
      priorityRule("environment:spec:priority-c", 2, 200),
    ])
    const state = supplySyntheticState(prepared)
    expect(contributionEffects(prepared, state, syntheticWorld)).toEqual([
      "environment:spec:priority-b",
    ])
    expect(panelAttack(prepared, state)).toBeCloseTo(1200, 9)
  })

  it("keeps the verdict when rule, binding, and instance order change", () => {
    const forwardRules = [
      priorityRule("environment:spec:priority-a", 1, 100),
      priorityRule("environment:spec:priority-b", 1, 200),
      priorityRule("environment:spec:priority-c", 2, 300),
    ]
    const forward = prepareSyntheticWithEffects(forwardRules)
    expect(
      contributionEffects(
        forward,
        supplySyntheticState(forward),
        syntheticWorld,
      ),
    ).toEqual(["environment:spec:priority-c"])
    const reversed = prepareSyntheticWithEffects(forwardRules.toReversed())
    expect(
      contributionEffects(
        reversed,
        supplySyntheticState(reversed),
        syntheticWorld,
      ),
    ).toEqual(["environment:spec:priority-c"])
    expect(panelAttack(forward, supplySyntheticState(forward))).toBeCloseTo(
      panelAttack(reversed, supplySyntheticState(reversed)),
      9,
    )
  })
})

const overflowingSumExpression = (unit: string) => ({
  kind: "add",
  unit,
  operands: [
    { kind: "literal", unit, value: 1e308 },
    { kind: "literal", unit, value: 1e308 },
  ],
})

describe("intermediate overflow boundaries", () => {
  const criticalRatePanel = (prepared: PreparedEffects) =>
    evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["criticalRate"],
    } as never)

  function criticalRateContribution(effectId: string, value: unknown) {
    return syntheticContribution(effectId, {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value,
    })
  }

  it("fails instead of throwing when an overflowed sum is multiplied by zero", () => {
    const prepared = prepareSyntheticWithEffects([
      criticalRateContribution("environment:spec:nan-product", {
        kind: "multiply",
        unit: "ratio",
        value: overflowingSumExpression("ratio"),
        coefficient: multiplierLiteral(0),
      }),
    ])
    const result = criticalRatePanel(prepared)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("does not let a minimum or maximum operand mask an overflow", () => {
    for (const kind of ["minimum", "maximum"] as const) {
      const prepared = prepareSyntheticWithEffects([
        criticalRateContribution(`environment:spec:masked-${kind}`, {
          kind,
          unit: "ratio",
          operands: [overflowingSumExpression("ratio"), ratioLiteral(0.2)],
        }),
      ])
      const result = criticalRatePanel(prepared)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(
          result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
        ).toBe(true)
      }
    }
  })

  it("fails when a contribution-phase parameter modification overflows", () => {
    const target = syntheticContribution(
      "environment:spec:parameter-overflow-target",
      {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: {
          kind: "multiply",
          unit: "attack-points",
          value: parameterReference("attack-points", "amount"),
          coefficient: multiplierLiteral(0),
        },
      },
      {
        parameters: {
          amount: { kind: "constant", unit: "attack-points", value: 1 },
        },
      },
    )
    const modification = syntheticContributionModification(
      "environment:spec:parameter-overflow",
      "environment:spec:parameter-overflow-target",
      [
        {
          field: "parameter",
          name: "amount",
          unit: "attack-points",
          change: {
            operator: "add",
            value: overflowingSumExpression("attack-points"),
          },
        },
      ],
    )
    const prepared = prepareSyntheticWithEffects([target, modification])
    const result = evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when a configuration-stage expression overflows", () => {
    const overflowingConfig = syntheticContribution(
      "environment:spec:config-overflow",
      fixedAttack(100),
      {
        config: {
          kind: "compare-number",
          unit: "count",
          operator: "gt",
          left: overflowingSumExpression("count"),
          right: countLiteral(0),
        },
      },
    )
    const parsed = parseEffectRuleSet(
      (() => {
        const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
          effects: unknown[]
        }
        ruleSet.effects.push(overflowingConfig)
        return ruleSet
      })(),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(false)
    if (!prepared.ok) {
      expect(
        prepared.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when a configuration-stage layer maximum hides an overflow", () => {
    const overflowingMaximum = stateBoundContribution(
      "environment:spec:maximum-overflow",
      fixedAttack(100),
      {
        activation: {
          kind: "triggered",
          trigger: { eventKinds: ["entry"], when: alwaysCondition },
          lifetime: {
            kind: "state-bound",
            stateId: "state:spec:linger",
            stateOwner: { role: "holder" },
          },
          layering: {
            recipientPartition: "individual",
            keys: [],
            maximum: {
              kind: "minimum",
              unit: "count",
              operands: [overflowingSumExpression("count"), countLiteral(2)],
            },
            onRetrigger: "add-layer",
            atCapacity: "ignore-new-layer",
          },
        },
      },
    )
    const parsed = parseEffectRuleSet(
      (() => {
        const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
          effects: unknown[]
        }
        ruleSet.effects.push(overflowingMaximum)
        return ruleSet
      })(),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(false)
    if (!prepared.ok) {
      expect(
        prepared.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

describe("modification accumulation boundaries", () => {
  const hugeAddOperand = {
    field: "parameter",
    name: "amount",
    unit: "attack-points",
    change: {
      operator: "add",
      value: { kind: "literal", unit: "attack-points", value: 1e308 },
    },
  }

  /** 目标规则不读取被修改的参数：只有归约本身能发现累加溢出。 */
  function unusedParameterTarget() {
    return syntheticContribution(
      "environment:spec:accumulation-target",
      fixedAttack(100),
      {
        parameters: {
          amount: { kind: "constant", unit: "attack-points", value: 1 },
        },
      },
    )
  }

  it("fails when two contribution-phase modifications overflow the accumulated addends", () => {
    const prepared = prepareSyntheticWithEffects([
      unusedParameterTarget(),
      syntheticContributionModification(
        "environment:spec:accumulation-a",
        "environment:spec:accumulation-target",
        [hugeAddOperand],
      ),
      syntheticContributionModification(
        "environment:spec:accumulation-b",
        "environment:spec:accumulation-target",
        [hugeAddOperand],
      ),
    ])
    const result = evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when a configuration-phase modification overflows a state parameter", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: unknown[]
      states: { parameters: Record<string, { value: number }> }[]
    }
    ruleSet.states[0]!.parameters["lingerSeconds"]!.value = 1e308
    ruleSet.effects.push({
      kind: "modification",
      effectId: "environment:spec:state-parameter-overflow",
      source: structuredClone(syntheticRuleSet.effects[0]!.source),
      config: alwaysCondition,
      parameters: {},
      phase: "configuration",
      target: { kind: "state", stateId: "state:spec:linger" },
      modifications: [
        {
          field: "parameter",
          name: "lingerSeconds",
          unit: "seconds",
          change: {
            operator: "add",
            value: { kind: "literal", unit: "seconds", value: 1e308 },
          },
        },
      ],
    })
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(false)
    if (!prepared.ok) {
      expect(
        prepared.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when two configuration-phase modifications overflow the accumulated addends", () => {
    const configurationModification = (
      effectId: string,
    ): Record<string, unknown> => ({
      kind: "modification",
      effectId,
      source: structuredClone(syntheticRuleSet.effects[0]!.source),
      config: alwaysCondition,
      parameters: {},
      phase: "configuration",
      target: {
        kind: "effect",
        effectId: "environment:spec:accumulation-target",
      },
      modifications: [hugeAddOperand],
    })
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: unknown[]
    }
    ruleSet.effects.push(
      unusedParameterTarget(),
      configurationModification("environment:spec:accumulation-config-a"),
      configurationModification("environment:spec:accumulation-config-b"),
    )
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(false)
    if (!prepared.ok) {
      expect(
        prepared.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

/** 状态绑定贡献规则：以外部导入层覆盖求值侧的观察边界。 */
function stateBoundObservationRule(
  effectId: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return stateBoundContribution(effectId, fixedAttack(100), extra)
}

/** 同一队伍的第二个实体，用于验证受益者与依赖节点的按需读取。 */
function twoActorWorld(): {
  readonly [key: string]: unknown
} {
  const world = structuredClone(syntheticWorld) as unknown as {
    entities: {
      entityId: string
      teamId: string
      generalStats?: unknown
      directStats?: unknown
    }[]
    states: unknown[]
  }
  const source = world.entities.find(
    (entity) => entity.entityId === "entity:spec",
  )!
  const target = world.entities.find(
    (entity) => entity.entityId === "entity:spec-target",
  )!
  target.teamId = source.teamId
  target.generalStats = structuredClone(source.generalStats)
  target.directStats = structuredClone(source.directStats)
  world.states = []
  return world as unknown as { readonly [key: string]: unknown }
}

const beneficiaryBoundEffectId = "environment:spec:beneficiary-bound"
const beneficiaryBoundInstance = () =>
  stateBoundLayerInstance("instance:spec-bound", beneficiaryBoundEffectId, {
    layerId: "layer:spec-bound",
    startedAt: 0,
  })

function panelForEntity(
  prepared: PreparedEffects,
  state: EffectState,
  entityId: string,
  world: unknown,
  stats: readonly string[] = ["attack"],
) {
  return evaluateEffects(prepared, state, {
    kind: "panel",
    atSeconds: 1,
    world,
    observedSnapshots: [],
    entities: [entityId],
    stats,
  } as never)
}

describe("on-demand state observation by beneficiary", () => {
  function preparedWithBoundEffect(
    extraEffects: readonly unknown[] = [],
  ): PreparedEffects {
    return prepareSyntheticWithEffects([
      stateBoundObservationRule(beneficiaryBoundEffectId),
      ...extraEffects,
    ])
  }

  it("does not block another beneficiary's query when the observation is missing", () => {
    const prepared = preparedWithBoundEffect()
    const state = supplyInstances(prepared, [beneficiaryBoundInstance()])
    const result = panelForEntity(
      prepared,
      state,
      "entity:spec-target",
      twoActorWorld(),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(`panel must succeed: ${JSON.stringify(result.issues)}`)
    }
    expect(
      result.value.attributes.find(
        (attribute) => attribute.entityId === "entity:spec-target",
      )?.value.value,
    ).toBeCloseTo(1000, 9)
  })

  it("still fails when the query consumes the unobserved instance", () => {
    const prepared = preparedWithBoundEffect()
    const state = supplyInstances(prepared, [beneficiaryBoundInstance()])
    const result = panelForEntity(
      prepared,
      state,
      "entity:spec",
      twoActorWorld(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
    }
  })

  it("keeps missing, inactive and re-entered observations distinct", () => {
    const prepared = preparedWithBoundEffect()
    const state = supplyInstances(prepared, [beneficiaryBoundInstance()])
    const base = twoActorWorld() as { states: unknown[] }
    const inactive = panelForEntity(prepared, state, "entity:spec", {
      ...base,
      states: [
        {
          ...activeSyntheticStateRecord,
          active: false,
          activationId: null,
          since: null,
        },
      ],
    })
    expect(inactive.ok).toBe(true)
    if (inactive.ok) {
      expect(inactive.value.attributes[0]?.value.value).toBeCloseTo(1000, 9)
    }
    const reentered = panelForEntity(prepared, state, "entity:spec", {
      ...base,
      states: [
        {
          ...activeSyntheticStateRecord,
          activationId: "state-activation:spec-b",
        },
      ],
    })
    expect(reentered.ok).toBe(true)
    if (reentered.ok) {
      expect(reentered.value.attributes[0]?.value.value).toBeCloseTo(1000, 9)
    }
  })

  it("reads the observation only for the hit actor that consumes the instance", () => {
    const prepared = preparedWithBoundEffect()
    const state = supplyInstances(prepared, [beneficiaryBoundInstance()])
    const world = twoActorWorld()
    const query = structuredClone(syntheticHitQuery) as unknown as {
      world: unknown
      hit: { actorId: string; targetId: string }
    }
    query.world = world
    query.hit.actorId = "entity:spec-target"
    query.hit.targetId = "entity:spec"
    const otherActor = evaluateEffects(prepared, state, query as never)
    expect(otherActor.ok).toBe(true)
    const ownActor = structuredClone(syntheticHitQuery) as unknown as {
      world: unknown
    }
    ownActor.world = world
    const consuming = evaluateEffects(prepared, state, ownActor as never)
    expect(consuming.ok).toBe(false)
    if (!consuming.ok) {
      expect(
        consuming.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    }
  })

  it("requires the observation when an internal dependency node consumes the instance", () => {
    const dependencyRule = syntheticContribution(
      "environment:spec:dependency-reader",
      {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: {
          kind: "stat",
          unit: "attack-points",
          entity: { role: "entity", entityId: "entity:spec" },
          stat: "attack",
          stage: "current",
          at: "evaluation",
        },
      },
      { beneficiary: { kind: "team-except-holder" } },
    )
    const prepared = preparedWithBoundEffect([dependencyRule])
    const state = supplyInstances(prepared, [beneficiaryBoundInstance()])
    const consuming = panelForEntity(
      prepared,
      state,
      "entity:spec-target",
      twoActorWorld(),
    )
    expect(consuming.ok).toBe(false)
    if (!consuming.ok) {
      expect(
        consuming.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    }
    const unrelated = panelForEntity(
      prepared,
      state,
      "entity:spec-target",
      twoActorWorld(),
      ["criticalRate"],
    )
    expect(unrelated.ok).toBe(true)
  })
})

describe("numeric reduction boundaries in modifications and multipliers", () => {
  const hugeScale = (field: string, name?: string) => ({
    field,
    ...(name === undefined ? {} : { name }),
    unit: "attack-points",
    change: {
      operator: "scale",
      value: multiplierLiteral(1e308),
    },
  })

  function attackPanel(prepared: PreparedEffects) {
    return evaluateEffects(prepared, supplySyntheticState(prepared), {
      kind: "panel",
      atSeconds: 1,
      world: syntheticWorld,
      observedSnapshots: [],
      entities: ["entity:spec"],
      stats: ["attack"],
    } as never)
  }

  it("fails when two output scales overflow before the zero output", () => {
    const target = syntheticContribution(
      "environment:spec:zero-output-target",
      fixedAttack(0),
    )
    const prepared = prepareSyntheticWithEffects([
      target,
      syntheticContributionModification(
        "environment:spec:output-scale-overflow",
        "environment:spec:zero-output-target",
        [hugeScale("output"), hugeScale("output")],
      ),
    ])
    const result = attackPanel(prepared)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when two parameter scales overflow from a zero parameter", () => {
    const target = syntheticContribution(
      "environment:spec:zero-parameter-target",
      {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: parameterReference("attack-points", "amount"),
      },
      {
        parameters: {
          amount: { kind: "constant", unit: "attack-points", value: 0 },
        },
      },
    )
    const prepared = prepareSyntheticWithEffects([
      target,
      syntheticContributionModification(
        "environment:spec:parameter-scale-overflow",
        "environment:spec:zero-parameter-target",
        [hugeScale("parameter", "amount"), hugeScale("parameter", "amount")],
      ),
    ])
    const result = attackPanel(prepared)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails in prepare when two configuration parameter scales overflow", () => {
    const ruleSet = structuredClone(syntheticRuleSet) as unknown as {
      effects: unknown[]
    }
    ruleSet.effects.push(
      syntheticContribution(
        "environment:spec:configuration-scale-target",
        fixedAttack({
          kind: "parameter",
          unit: "attack-points",
          name: "amount",
        }),
        {
          parameters: {
            amount: { kind: "constant", unit: "attack-points", value: 0 },
          },
        },
      ),
      {
        kind: "modification",
        effectId: "environment:spec:configuration-scale-overflow",
        source: structuredClone(syntheticRuleSet.effects[0]!.source),
        config: alwaysCondition,
        parameters: {},
        phase: "configuration",
        target: {
          kind: "effect",
          effectId: "environment:spec:configuration-scale-target",
        },
        modifications: [
          hugeScale("parameter", "amount"),
          hugeScale("parameter", "amount"),
        ],
      },
    )
    const parsed = parseEffectRuleSet(ruleSet)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error("rule set must parse")
    }
    const prepared = prepareEffects(parsed.value, [syntheticBinding] as never)
    expect(prepared.ok).toBe(false)
    if (!prepared.ok) {
      expect(
        prepared.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  const hitMultiplierRule = (effectId: string, value: number) =>
    syntheticContribution(
      effectId,
      {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        value: multiplierLiteral(value),
      },
      { scope: "hit" },
    )

  it("fails instead of throwing when hit multipliers overflow before zero", () => {
    const prepared = prepareSyntheticWithEffects([
      hitMultiplierRule("environment:spec:multiplier-a", 1e308),
      hitMultiplierRule("environment:spec:multiplier-b", 1e308),
      hitMultiplierRule("environment:spec:multiplier-c", 0),
    ])
    const query = structuredClone(syntheticHitQuery) as unknown as {
      world: unknown
    }
    query.world = syntheticWorld
    const result = evaluateEffects(
      prepared,
      supplySyntheticState(prepared),
      query as never,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("fails when one source's stacked layers overflow during reduction", () => {
    const stackedMultiplier = syntheticContribution(
      "environment:spec:stacked-multiplier",
      {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        value: multiplierLiteral(1e308),
      },
      {
        scope: "hit",
        activation: {
          kind: "triggered",
          trigger: { eventKinds: ["entry"], when: alwaysCondition },
          lifetime: {
            kind: "timed",
            seconds: { kind: "literal", unit: "seconds", value: 10 },
            clock: "per-layer",
            onRetrigger: { kind: "keep" },
            refreshExisting: "none",
          },
          layering: {
            recipientPartition: "individual",
            keys: [],
            maximum: countLiteral(3),
            onRetrigger: "add-layer",
            atCapacity: "ignore-new-layer",
          },
        },
      },
    )
    const prepared = prepareSyntheticWithEffects([stackedMultiplier])
    const state = supplyEffectState(prepared, {
      sessionId: "session:spec-stacked-multiplier",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:spec-stacked",
          effectId: "environment:spec:stacked-multiplier",
          bindingId: "binding:spec",
          beneficiaryIds: ["entity:spec"],
          stackKey: [],
          lifetime: { kind: "timed", firstActivatedAt: 0 },
          layers: [
            {
              layerId: "layer:stack-a",
              startedAt: 0,
              expiresAt: 100,
              trigger: null,
            },
            {
              layerId: "layer:stack-b",
              startedAt: 0,
              expiresAt: 100,
              trigger: null,
            },
            {
              layerId: "layer:stack-c",
              startedAt: 0,
              expiresAt: 100,
              trigger: null,
            },
          ],
        },
      ] as never,
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(state.ok).toBe(true)
    if (!state.ok) {
      throw new Error("state supply must succeed")
    }
    const query = structuredClone(syntheticHitQuery) as unknown as {
      world: unknown
    }
    query.world = syntheticWorld
    const result = evaluateEffects(prepared, state.value, query as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })
})

function stackedLayerState(
  prepared: PreparedEffects,
  inputs: readonly number[],
) {
  const state = supplyEffectState(prepared, {
    sessionId: "session:spec-source-reduction",
    atSeconds: 2,
    instances: [
      {
        instanceId: "instance:spec-source-reduction",
        effectId: "environment:spec:varying-multiplier",
        bindingId: "binding:spec",
        beneficiaryIds: ["entity:spec"],
        stackKey: [],
        lifetime: { kind: "supplied" },
        layers: inputs.map((_, index) => ({
          layerId: `layer:source-${index}`,
          startedAt: index,
          expiresAt: null,
          trigger: {
            eventId: `event:source-${index}`,
            actorId: "entity:spec",
            activationSnapshotId: `snapshot:source-${index}`,
          },
        })),
      },
    ] as never,
    snapshots: inputs.map((value, index) => ({
      snapshotId: `snapshot:source-${index}`,
      atSeconds: index,
      attributes: [
        {
          entityId: "entity:spec",
          stat: "criticalRate",
          stage: "current",
          value: { unit: "ratio", value },
        },
      ],
      world: structuredClone(syntheticWorld),
    })) as never,
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  expect(state.ok).toBe(true)
  if (!state.ok) {
    throw new Error(
      `state supply must succeed: ${JSON.stringify(state.issues)}`,
    )
  }
  return state.value
}

describe("source-layer reduction boundaries", () => {
  /** 同一来源、同一消费地址的三个有效层，各自通过激活快照给出不同倍率。 */
  function varyingMultiplierPrepared(): PreparedEffects {
    return prepareSyntheticWithEffects([
      syntheticContribution(
        "environment:spec:varying-multiplier",
        {
          kind: "hit-adjustment",
          field: "damageMultiplier",
          operator: "scale",
          value: {
            kind: "multiply",
            unit: "multiplier",
            value: multiplierLiteral(1),
            coefficient: {
              kind: "stat",
              unit: "ratio",
              entity: { role: "holder" },
              stat: "criticalRate",
              stage: "current",
              at: "activation",
            },
          },
        },
        { scope: "hit", activation: { kind: "supplied" } },
      ),
    ])
  }

  function hitQueryAt(atSeconds: number) {
    const query = structuredClone(syntheticHitQuery) as unknown as {
      atSeconds: number
      world: unknown
      observedSnapshots: { atSeconds: number }[]
    }
    query.atSeconds = atSeconds
    query.observedSnapshots[0]!.atSeconds = atSeconds
    query.world = withSyntheticStates([])
    return query
  }

  it("fails instead of throwing when one source's layers overflow before zero", () => {
    const prepared = varyingMultiplierPrepared()
    const state = stackedLayerState(prepared, [1e308, 1e308, 0])
    const result = evaluateEffects(prepared, state, hitQueryAt(3) as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.code === "INVALID_DEFINITION"),
      ).toBe(true)
    }
  })

  it("keeps the same source's finite layer reduction valid", () => {
    const prepared = varyingMultiplierPrepared()
    const state = stackedLayerState(prepared, [2, 3, 0.5])
    const result = evaluateEffects(prepared, state, hitQueryAt(3) as never)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.hit?.damageItems[0]?.damageMultiplier).toBeCloseTo(
        3,
        9,
      )
    }
  })
})

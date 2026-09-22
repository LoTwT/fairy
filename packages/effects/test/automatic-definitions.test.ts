import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  advanceEffects,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../src/index.ts"
import type {
  BindingId,
  EntityId,
  EntryAction,
  Event,
  PreparedEffects,
  RefinementRank,
  Result,
  SourceBinding,
  TransitionInput,
  WorldObservation,
} from "../src/index.ts"

// 正式规则只读取发布源；以下世界与事件是执行契约的合成输入，不是游戏实测。
const definitions: unknown = JSON.parse(
  readFileSync(
    new URL("../../data/definitions/effects/automatic.json", import.meta.url),
    "utf8",
  ),
)
const effectId = "w-engine:14131:energy-on-entry"
const entryActions: EntryAction[] = [
  "quick-assist",
  "chain",
  "defensive-assist",
  "evasive-assist",
]
const ranks: RefinementRank[] = [1, 2, 3, 4, 5]
const amounts = [5, 5.5, 6, 6.5, 7]

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function binding(
  refinement: RefinementRank = 1,
  holderId: EntityId = "entity:holder",
  bindingId: BindingId = "binding:weapon",
): SourceBinding {
  return {
    kind: "w-engine",
    bindingId,
    holderId,
    sourceEntityId: "14131",
    eligible: true,
    configuration: { refinement },
  }
}
const world: WorldObservation = {
  entities: ["holder", "teammate", "other"].map((name) => ({
    kind: "actor",
    entityId: `entity:${name}`,
    teamId: name === "other" ? "team:other" : "team:one",
    generalStats: {},
    directStats: { criticalRate: { baseValue: 0.05, additions: [] } },
  })),
  states: [],
  distances: [],
}
function prepare(bindings: SourceBinding[] = [binding()]) {
  return value(prepareEffects(value(parseEffectRuleSet(definitions)), bindings))
}
function supply(prepared: PreparedEffects) {
  return value(
    supplyEffectState(prepared, {
      sessionId: "session:automatic",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }),
  )
}
function entry(
  atSeconds = 0,
  sequence = 0,
  actorId: EntityId = "entity:teammate",
  entryAction: EntryAction = "chain",
): TransitionInput {
  return {
    event: {
      kind: "entry",
      eventId: `event:${atSeconds}-${sequence}`,
      atSeconds,
      sequence,
      actorId,
      entryAction,
    },
    before: world,
    after: world,
    observedSnapshots: [],
  }
}
function expectIssue(result: Result<unknown>, code: string, pointer?: string) {
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error("Expected rejection")
  expect(result.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code,
        ...(pointer === undefined ? {} : { pointer }),
      }),
    ]),
  )
}

describe("automatic definitions public acceptance", () => {
  it("publishes only the verified instant clause and references both languages at every rank", () => {
    const rules = value(parseEffectRuleSet(definitions))
    expect(rules).toMatchObject({
      schemaVersion: 1,
      ruleSetId: "automatic-effects",
      revision: "1",
      states: [],
      actions: [],
    })
    expect(rules.effects.map((effect) => effect.effectId)).toEqual([effectId])
    expect(rules.effects[0]?.source.references).toEqual(
      ["zh", "en"].flatMap((locale) =>
        ranks.map((rank) => ({
          sourceId: "nanoka-zzz",
          version: "3.1",
          locale,
          resourcePath: `zzz/3.1/${locale}/weapon/14131.json`,
          pointer: `/talents/${rank}/desc`,
        })),
      ),
    )
  })

  for (const refinement of ranks)
    for (const entryAction of entryActions)
      for (const actorId of ["entity:holder", "entity:teammate"] as const) {
        it(`rank ${refinement}, ${entryAction}, ${actorId}: requests energy for the holder`, () => {
          const prepared = prepare([binding(refinement)])
          const input = entry(0, 0, actorId, entryAction)
          const result = value(
            advanceEffects(prepared, supply(prepared), input),
          )
          expect(result.requests).toEqual([
            {
              requestId: expect.stringMatching(/^request:/u),
              eventId: input.event.eventId,
              effectId,
              bindingId: "binding:weapon",
              beneficiaryId: "entity:holder",
              kind: "resource-generation",
              resource: "energy",
              baseAmount: {
                unit: "energy-points",
                value: amounts[refinement - 1],
              },
            },
          ])
        })
      }

  it.each([
    { ...binding(), eligible: false },
    { ...binding(), sourceEntityId: "other-weapon" },
    {
      kind: "agent",
      bindingId: "binding:agent",
      holderId: "entity:holder",
      sourceEntityId: "14131",
      eligible: true,
      configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
    } satisfies SourceBinding,
  ])(
    "ignores ineligible or unmatched binding $kind/$sourceEntityId/$eligible",
    (source) => {
      const prepared = prepare([source])
      expect(
        value(advanceEffects(prepared, supply(prepared), entry())).requests,
      ).toEqual([])
    },
  )

  it("does not spend cooldown on another team's entry and respects the five-second boundary and cursor", () => {
    const prepared = prepare()
    const other = value(
      advanceEffects(prepared, supply(prepared), entry(0, 0, "entity:other")),
    )
    expect(other.requests).toEqual([])
    const first = value(advanceEffects(prepared, other.state, entry(0, 1)))
    expect(first.requests).toHaveLength(1)
    expectIssue(
      advanceEffects(prepared, first.state, {
        ...entry(0, 1),
        event: { ...entry(0, 1).event, eventId: "event:equal-cursor" },
      }),
      "EVENT_ORDER",
    )
    const sameTime = value(advanceEffects(prepared, first.state, entry(0, 2)))
    expect(sameTime.requests).toEqual([])
    const beforeBoundary = value(
      advanceEffects(prepared, sameTime.state, entry(5 - 1e-6, 3)),
    )
    expect(beforeBoundary.requests).toEqual([])
    const atBoundary = value(
      advanceEffects(prepared, beforeBoundary.state, entry(5, 4)),
    )
    expect(atBoundary.requests).toHaveLength(1)
    expect(atBoundary.requests[0]?.requestId).not.toBe(
      first.requests[0]?.requestId,
    )
  })

  it("keeps holder amounts, requests and cooldowns independent when a second binding becomes eligible to trigger", () => {
    const prepared = prepare([
      binding(1),
      binding(5, "entity:teammate", "binding:second"),
    ])
    const splitTeams: WorldObservation = {
      ...world,
      entities: world.entities.map((entity) =>
        entity.entityId === "entity:teammate"
          ? { ...entity, teamId: "team:other" }
          : entity,
      ),
    }
    const firstInput = {
      ...entry(0, 0, "entity:holder"),
      before: splitTeams,
      after: splitTeams,
    }
    const first = value(advanceEffects(prepared, supply(prepared), firstInput))
    expect(first.requests.map((request) => request.bindingId)).toEqual([
      "binding:weapon",
    ])
    const second = value(advanceEffects(prepared, first.state, entry(1, 1)))
    expect(second.requests).toMatchObject([
      {
        bindingId: "binding:second",
        beneficiaryId: "entity:teammate",
        baseAmount: { value: 7 },
      },
    ])
    const both = value(advanceEffects(prepared, second.state, entry(6, 2)))
    expect(both.requests).toHaveLength(2)
    expect(both.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bindingId: "binding:weapon",
          beneficiaryId: "entity:holder",
          baseAmount: { unit: "energy-points", value: 5 },
        }),
        expect.objectContaining({
          bindingId: "binding:second",
          beneficiaryId: "entity:teammate",
          baseAmount: { unit: "energy-points", value: 7 },
        }),
      ]),
    )
    expect(
      new Set(both.requests.map((request) => request.requestId)).size,
    ).toBe(2)
  })

  it("ignores non-entry events and the related followup, without consuming cooldown", () => {
    const prepared = prepare()
    let state = supply(prepared)
    for (const event of [
      {
        kind: "energy-spent",
        energySpent: 25,
        eventId: "event:spend",
        atSeconds: 0,
        sequence: 0,
        actorId: "entity:holder",
      },
      {
        kind: "precision-support",
        eventId: "event:support",
        atSeconds: 0,
        sequence: 1,
        actorId: "entity:holder",
      },
    ] satisfies Event[]) {
      const result = value(
        advanceEffects(prepared, state, { ...entry(), event }),
      )
      expect(result.requests).toEqual([])
      state = result.state
    }
    const first = value(advanceEffects(prepared, state, entry(0, 2)))
    expect(first.requests).toHaveLength(1)
    // 冷却已结束仍不能把追加攻击当成第二次入场。
    const followup = value(
      advanceEffects(prepared, first.state, {
        ...entry(),
        event: {
          kind: "entry-followup",
          eventId: "event:followup",
          atSeconds: 5,
          sequence: 3,
          actorId: "entity:teammate",
          entryAction: "chain",
          entryEventId: "event:0-2",
          supportActorId: "entity:holder",
          energySpent: 25,
          followupActionId: "action:synthetic-followup",
        },
      }),
    )
    expect(followup.requests).toEqual([])
    expect(
      value(advanceEffects(prepared, followup.state, entry(5, 4))).requests,
    ).toHaveLength(1)
  })

  it("rejects unsupported entry labels and missing team/entity facts explicitly", () => {
    const prepared = prepare()
    const state = supply(prepared)
    const input = entry()
    expectIssue(
      advanceEffects(prepared, state, {
        ...input,
        event: { ...input.event, entryAction: "normal-switch" },
      } as unknown as TransitionInput),
      "INVALID_INPUT",
      "/event/entryAction",
    )
    for (const missingId of ["entity:holder", "entity:teammate"]) {
      const incomplete = {
        ...world,
        entities: world.entities.filter(
          (entity) => entity.entityId !== missingId,
        ),
      }
      expectIssue(
        advanceEffects(prepared, state, {
          ...input,
          before: incomplete,
          after: incomplete,
        }),
        "MISSING_FACT",
      )
    }
    const missingTeam = {
      ...world,
      entities: world.entities.map((entity) =>
        entity.entityId === "entity:holder"
          ? { ...entity, teamId: undefined }
          : entity,
      ),
    }
    expectIssue(
      advanceEffects(prepared, state, {
        ...input,
        before: missingTeam,
        after: missingTeam,
      } as unknown as TransitionInput),
      "INVALID_INPUT",
      "/before/entities/0/teamId",
    )
  })

  it("replays deterministically from old state, rejects replay into new state, and leaves inputs and panel queries unchanged", () => {
    const prepared = prepare()
    const state = supply(prepared)
    const input = entry()
    const before = structuredClone({ definitions, input, state })
    const first = value(advanceEffects(prepared, state, input))
    expect(value(advanceEffects(prepared, state, input)).requests).toEqual(
      first.requests,
    )
    expectIssue(advanceEffects(prepared, first.state, input), "EVENT_ORDER")
    const panel = {
      kind: "panel",
      atSeconds: 0,
      world,
      observedSnapshots: [],
      entities: ["entity:holder"],
      stats: ["criticalRate"],
    } as const
    const query = value(evaluateEffects(prepared, first.state, panel))
    expect(query.contributions).toEqual([])
    expect(query).not.toHaveProperty("requests")
    expect(value(evaluateEffects(prepared, first.state, panel))).toEqual(query)
    expect(
      value(advanceEffects(prepared, first.state, entry(5, 1))).requests,
    ).toHaveLength(1)
    expect({ definitions, input, state }).toEqual(before)
  })
})

import {
  makeWindsweptLuminizeRequest,
  roxyWeatheredConsumerSource,
} from "./fixtures/roxy-weathered-direct-damage-consumer.ts"
import { describe, expect, expectTypeOf, it } from "vitest"
import * as api from "../src/index.ts"
import * as engine from "../../core/src/index.ts"
import type { StaticActionCalculationInput } from "../../core/src/static/types.ts"
import { roxyMindscapeConsumerSource } from "./fixtures/roxy-mindscape-consumer.ts"
import {
  roxyAdditionalConsumerSource,
  roxyAdditionalLevelOption,
  roxyAdditionalLevelInput,
} from "./fixtures/roxy-additional-consumer.ts"

const data = await api.loadStaticCalculationData({
  agents: ["1621", "1111"],
  wEngines: [],
})
const roxy = data.agents.find((record) => record.actions.entityId === "1621")!
const resolved = api.resolveAgentAction({
  agent: roxy.actions,
  actionId: "action:agent:1621:action:0013",
  mindscapeRank: 6,
  levels: { chain: { mode: "effective", value: 12 } },
})
if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
const request = (): StaticActionCalculationInput => ({
  data,
  actors: [
    { entityId: "entity:roxy", agentEntityId: "1621" },
    { entityId: "entity:qualifier", agentEntityId: "1111" },
  ].map(({ entityId, agentEntityId }) => ({
    entityId: entityId as `entity:${string}`,
    agentEntityId,
    teamId: "team:players",
    coreSkillLevel: 7,
    mindscapeRank: 6,
    wEngine: null,
    driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    panel: {
      mode: "out-of-combat",
      stats: {
        attack: { unit: "attack-points", value: 1000 },
        criticalRate: { unit: "ratio", value: 0.25 },
        criticalDamage: { unit: "ratio", value: 0.5 },
        penetrationRatio: { unit: "ratio", value: 0 },
      },
      penetrationValue: 0,
      damageBonuses: { wind: 0 },
    },
  })),
  actorId: "entity:roxy",
  action: resolved,
  target: {
    entityId: "entity:enemy",
    teamId: "team:enemies",
    baseDefense: 0,
    resistances: { wind: 0.3 },
    isStunned: true,
    baseStunDamageMultiplier: 1.5,
  },
  selections: [
    { holderId: "entity:roxy", optionId: roxyAdditionalLevelOption, layers: 1 },
  ],
})

const luminizeRequest = await makeWindsweptLuminizeRequest(api)
it("forbids structurally reused luminize payloads with low-level windswept state", () => {
  type Payload = NonNullable<StaticActionCalculationInput["luminize"]>
  type Fields = Omit<Payload, "targetWindswept">
  expectTypeOf<
    Fields & { targetWindswept: undefined }
  >().not.toExtend<Payload>()
  expectTypeOf<
    Fields & { targetWindswept: { targetId: "entity:enemy"; status: "absent" } }
  >().not.toExtend<Payload>()
})
describe.each(["ordinary", "luminize"] as const)(
  "nested windswept routing: %s",
  (route) => {
    const inputForRoute = (): StaticActionCalculationInput =>
      route === "luminize"
        ? structuredClone(luminizeRequest)
        : {
            ...request(),
            directAttack: true,
            target: {
              ...request().target,
              windswept: {
                status: "active",
                applierActorId: "entity:roxy",
                contaminationElement: null,
                baseCoefficient: { unit: "ratio", value: 0.1 },
              },
            },
          }
    it("accepts the real action with target.windswept as the only state source", () => {
      const input = inputForRoute()
      expect(input.action.ok && input.action.calculation.kind).toBe(
        route === "luminize" ? "luminize" : "damage",
      )
      const result = engine.calculateStaticActionDamage(input)
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (result.ok && result.value.kind === "damage")
        expect(result.value.totals.nonCritical).toBeGreaterThan(0)
    })
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["absent", { targetId: "entity:enemy", status: "absent" }],
      [
        "invalid active",
        {
          targetId: "entity:wrong",
          status: "active",
          applierActorId: "entity:missing",
          contaminationElement: null,
          baseCoefficient: { unit: "ratio", value: -1 },
        },
      ],
    ])(
      "rejects nested low-level state %s by presence before action routing",
      (_label, state) => {
        const input = inputForRoute()
        const result = engine.calculateStaticActionDamage({
          ...input,
          luminize: { ...input.luminize, targetWindswept: state },
        } as unknown as StaticActionCalculationInput)
        expect(result.ok, JSON.stringify(result)).toBe(false)
        if (!result.ok)
          expect(result.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: "INVALID_INPUT",
                pointer: "/luminize/targetWindswept",
              }),
            ]),
          )
      },
    )
  },
)

describe("Roxy formal high-level data and shared installed-consumer behavior", () => {
  it("runs the same nonzero own, teammate, M2 and high-level cases used by Node and Vite", async () => {
    const verify = new Function(
      "api",
      "engine",
      `${roxyMindscapeConsumerSource}\n${roxyAdditionalConsumerSource}\nreturn verifyRoxyAdditionalConsumer(api, engine)`,
    )
    const result = await verify(api, engine)
    expect(result.own).toBeCloseTo(3780, 9)
    expect(result.team).toBeCloseTo(4998, 9)
    expect(result.high).toBeCloseTo(112806.918, 8)
    expect(result.missingRejected).toBe(true)
  })
  it("derives L60 from the validated actor attribute record", () => {
    const input = request()
    expect(roxy.attributes.level).toBe(60)
    const result = engine.calculateStaticActionDamage(input)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok || result.value.kind !== "damage")
      throw new Error("expected damage")
    expect(result.value.totals.nonCritical).toBeCloseTo(80576.37, 8)
    expect(
      result.value.segments[0]!.damage.factors.nonCritical.damageBonus,
    ).toBeCloseTo(1.8, 12)
  })
  it.each(["roxy level", "teammate level", "mismatched record"])(
    "rejects invalid high-level %s instead of inventing a level",
    (mode) => {
      const input: any = structuredClone(request())
      const record = input.data.agents.find(
        (entry: any) =>
          entry.attributes.entityId ===
          (mode === "teammate level" ? "1111" : "1621"),
      )
      if (mode === "mismatched record") record.attributes.entityId = "1251"
      else record.attributes.level = 30
      const result = engine.calculateStaticActionDamage(input)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" ||
              issue.code === "MISSING_REFERENCE",
          ),
        ).toBe(true)
    },
  )
  it.each([30, 60])(
    "rejects hand-filled high-level holder input %s",
    (level) => {
      const input = request()
      const result = engine.calculateStaticActionDamage({
        ...input,
        inputs: [
          {
            bindingId: engine.staticSourceBindingId(
              "entity:roxy",
              "agent",
              "1621",
            ),
            name: roxyAdditionalLevelInput,
            value: { unit: "count", value: level },
          },
        ],
      })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: "CONTEXT_MISMATCH",
              pointer: "/inputs/0",
            }),
          ]),
        )
    },
  )
})

it("shares C4 coefficient and independent-item acceptance with installed Node and Chromium", async () => {
  const verify = new Function(
    "api",
    "engine",
    `${roxyMindscapeConsumerSource}\n${roxyAdditionalConsumerSource}\n${roxyWeatheredConsumerSource}\nreturn verifyRoxyWeatheredConsumer(api, engine)`,
  )
  const result = await verify(api, engine)
  expect(result).toEqual({
    nonCritical: expect.closeTo(2761.2, 8),
    cannon: expect.closeTo(2655, 8),
    high: expect.closeTo(52822.287, 8),
    unknownRejected: true,
  })
})

it.each([
  [
    "low-level state on the high-level root",
    "/targetWindswept",
    (input: any): void => {
      input.targetWindswept = {
        targetId: "entity:enemy",
        status: "active",
        applierActorId: "entity:roxy",
        contaminationElement: null,
        baseCoefficient: { unit: "ratio", value: 0.1 },
      }
    },
  ],
  [
    "nested classification on the luminize override",
    "/luminize/hit/directAttack",
    (input: any): void => {
      input.directAttack = false
      input.luminize = { hit: { directAttack: true } }
    },
  ],
] as const)(
  "rejects %s instead of silently discarding the new opt-in",
  (_label, pointer, mutate) => {
    const input = request()
    mutate(input)
    const result = engine.calculateStaticActionDamage(input)
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_INPUT", pointer }),
        ]),
      )
  },
)

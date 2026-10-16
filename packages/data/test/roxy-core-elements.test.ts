import { describe, expect, it } from "vitest"
import * as api from "../src/index.ts"
import { calculateStaticActionDamage } from "../../core/src/index.ts"
import type { StaticActionCalculationInput } from "../../core/src/static/types.ts"
import { roxyCoreElementsConsumerSource } from "./fixtures/roxy-core-elements-consumer.ts"

const fixtureData = new Function(
  "api",
  `${roxyCoreElementsConsumerSource}\nreturn makeRoxyCoreElementsFixture(api)`,
)(api) as Promise<{
  request: (
    agentId?: string,
    ordinal?: string,
    elements?: string[],
    coreSkillLevel?: number,
    cr?: number,
  ) => StaticActionCalculationInput
}>
const fixture = () => fixtureData

const consumerSummary = {
  electric: 5627.075,
  unactivated: 5387.625,
  wind: 1236.1,
  sharp: 2138.77,
  sourceCriticalRate: 0.634,
  equipped: 5691.2476,
}
const consumerScenarios = new Function(
  "engine",
  `${roxyCoreElementsConsumerSource}\nreturn makeRoxyCoreElementsConsumerScenarios(engine)`,
)({ calculateStaticActionDamage }) as {
  name: string
  verify: (
    fixture: Awaited<typeof fixtureData>,
  ) => Partial<typeof consumerSummary>
}[]

function damage(input: StaticActionCalculationInput) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}

function reject(input: StaticActionCalculationInput, code: string) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok).toBe(false)
  if (!result.ok)
    expect(
      result.issues.some((issue) => issue.code === code),
      JSON.stringify(result),
    ).toBe(true)
}

describe("Roxy explicitly active elemental core buffs", () => {
  it.each(consumerScenarios)(
    "shares consumer acceptance: $name",
    async ({ verify }) => {
      const result = verify(await fixture())
      for (const [key, actual] of Object.entries(result))
        expect(actual).toBeCloseTo(
          consumerSummary[key as keyof typeof consumerSummary],
          8,
        )
    },
  )
  it("covers Anby's real electric fourth basic attack from the declared electric buff", async () => {
    const { request } = await fixture()
    const result = calculateStaticActionDamage(request())
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok || result.value.kind !== "damage") return
    // Nanoka 3.2 /skill/basic/description/2/param/3: 2.391 + 11 × .218 = 4.789.
    // ATK 1000 × 4.789 × (1 + .25 × (.5 + min(.4, .4 × .5))).
    expect(result.value.totals.expected).toBeCloseTo(5627.075, 8)
  })

  it("keeps two Roxy holders' state and CR facts separate, rejecting only overlapping consumed sources", async () => {
    const { request } = await fixture()
    const input: any = request("1011", "0009", ["fire"])
    input.actors.push({
      ...input.actors[0],
      entityId: "entity:roxy2",
      coreSkillLevel: 1,
    })
    input.selections.push(
      ...input.selections.map((s: any) => ({
        ...s,
        holderId: "entity:roxy2",
        activeBuffElements: ["electric"],
      })),
    )
    input.inputs.push({
      bindingId: "binding:entity:roxy2:agent:1621",
      name: "roxy:core:external-critical-rate",
      value: { unit: "ratio", value: 0.75 },
    })
    // Second holder's core1 caps .4 × .75 at .22; first holder's fire state is irrelevant.
    expect(damage(input).totals.expected).toBeCloseTo(5651.02, 8)
    input.selections[0].activeBuffElements = ["electric"]
    input.selections[1].activeBuffElements = ["electric"]
    reject(input, "UNIQUENESS_CONFLICT")
    input.actors[2].teamId = "team:other"
    expect(damage(input).totals.expected).toBeCloseTo(5627.075, 8)
  })

  it("preserves wind-only legacy scope and rejects mixed state models even on a non-wind hit", async () => {
    const { request } = await fixture()
    const input = request()
    const legacy = input.selections.map(
      ({ activeBuffElements: _elements, ...s }) => ({
        ...s,
        optionId: s.optionId.replace("core-element", "core-wind"),
      }),
    )
    expect(
      damage({ ...input, selections: legacy }).totals.expected,
    ).toBeCloseTo(5387.625, 8)
    reject(
      { ...input, selections: [...input.selections, legacy[0]!] },
      "CONTEXT_MISMATCH",
    )
    expect(
      damage({
        ...input,
        selections: [...input.selections, { ...legacy[0]!, layers: 0 }],
      }).totals.expected,
    ).toBeCloseTo(5627.075, 8)
  })

  it.each(
    (
      [
        ["normal", "1011", 0.4, [0.22, 0.25, 0.28, 0.31, 0.34, 0.37, 0.4]],
        ["Armorer", "1611", 0.2, [0.1, 0.115, 0.13, 0.145, 0.16, 0.175, 0.2]],
      ] as const
    ).flatMap(([profession, agentId, coefficient, caps]) =>
      caps.map((cap, i) => ({
        profession,
        agentId,
        coefficient,
        cap,
        coreSkillLevel: i + 1,
      })),
    ),
  )(
    "$profession core $coreSkillLevel uses its independently evidenced cap below, at and above the source-CR threshold",
    async ({ agentId, coefficient, cap, coreSkillLevel }) => {
      const { request } = await fixture()
      for (const cr of [
        -0.5,
        cap / coefficient - 1e-6,
        cap / coefficient,
        cap / coefficient + 1e-6,
      ]) {
        const value = damage(
          request(agentId, "0009", ["electric"], coreSkillLevel, cr),
        )
        const bonus = Math.min(cap, coefficient * Math.max(0, cr))
        expect(value.totals.expected, `source CR ${cr}`).toBeCloseTo(
          value.totals.nonCritical * (1 + 0.25 * (0.5 + bonus)),
          8,
        )
      }
    },
  )

  it.each([
    [
      "empty set",
      (i: any) => {
        i.selections[0].activeBuffElements = []
      },
      "INVALID_INPUT",
    ],
    [
      "non-array",
      (i: any) => {
        i.selections[0].activeBuffElements = "electric"
      },
      "INVALID_INPUT",
    ],
    [
      "unknown element",
      (i: any) => {
        i.selections[0].activeBuffElements = ["honed_edge"]
      },
      "INVALID_INPUT",
    ],
    [
      "lumiflux",
      (i: any) => {
        i.selections[0].activeBuffElements = ["lumiflux"]
      },
      "INVALID_INPUT",
    ],
    [
      "frost state alias",
      (i: any) => {
        i.selections[0].activeBuffElements = ["frost"]
      },
      "INVALID_INPUT",
    ],
    [
      "auric-ink state alias",
      (i: any) => {
        i.selections[0].activeBuffElements = ["auric-ink"]
      },
      "INVALID_INPUT",
    ],
    [
      "disagreeing profession branches",
      (i: any) => {
        i.selections[1].activeBuffElements = ["fire"]
      },
      "CONTEXT_MISMATCH",
    ],
    [
      "missing CR",
      (i: any) => {
        i.inputs = []
      },
      "MISSING_FACT",
    ],
    [
      "nonfinite CR",
      (i: any) => {
        i.inputs[0].value.value = NaN
      },
      "INVALID_INPUT",
    ],
    [
      "wrong CR unit",
      (i: any) => {
        i.inputs[0].value.unit = "count"
      },
      "UNIT_MISMATCH",
    ],
    [
      "foreign CR binding",
      (i: any) => {
        i.inputs[0].bindingId = "binding:foreign"
      },
      "MISSING_REFERENCE",
    ],
    [
      "wrong holder identity",
      (i: any) => {
        i.selections[0].holderId = "entity:attacker"
      },
      "CONTEXT_MISMATCH",
    ],
    [
      "duplicate option",
      (i: any) => {
        i.selections.push(i.selections[0])
      },
      "DUPLICATE_ID",
    ],
    [
      "illegal layers",
      (i: any) => {
        i.selections[0].layers = 2
      },
      "INVALID_INPUT",
    ],
    [
      "unrelated option with state",
      (i: any) => {
        i.selections[0].optionId =
          "nanoka:agents:1621:core-wind-critical-damage"
      },
      "CONTEXT_MISMATCH",
    ],
  ] as const)("rejects %s", async (_name, mutate, code) => {
    const { request } = await fixture()
    const input = request()
    mutate(input)
    reject(input, code)
  })
})

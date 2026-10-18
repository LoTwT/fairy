import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  calculateStaticDamage,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import { inputFor } from "../../core/test/effects/static-fixtures.ts"
import type { ContributionRule } from "@randomplay/shared"
import { verifyClaretInitialConversionConsumer } from "./fixtures/claret-initial-conversion-consumer.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
  StaticPanelResult,
} from "../../core/src/index.ts"

const conversionEffect =
  "agent:1611:zzz-hp:eff-mtskqyss-1toefw:blk-mtrf598z-wr4jqt:mindscape:0"
const conversionOption =
  "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtskqyss-1toefw"
const stateOption =
  "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtrf598z-80y7hh"
const holderId = "entity:claret"
const bindingId = staticSourceBindingId(holderId, "agent", "1611")

async function fixture(): Promise<StaticActionCalculationInput> {
  const data = await loadStaticCalculationData({
    agents: ["1611"],
    wEngines: ["14161"],
  })
  const discs = Object.fromEntries(
    ([1, 2, 3, 4, 5, 6] as const).map((slot) => [
      slot,
      {
        setEntityId: slot <= 4 ? "31500" : "31000",
        mainStat:
          slot === 1
            ? { attribute: "health" }
            : slot === 2
              ? { attribute: "attack" }
              : slot === 3 || slot === 6
                ? { attribute: "defense" }
                : slot === 4
                  ? { attribute: "criticalDamage" }
                  : { attribute: "damageBonus", element: "electric" },
        substats: [
          {
            attribute: "criticalRate",
            operation: "ratio-add",
            rolls: slot === 4 ? 3 : 2,
          },
          ...(slot === 4
            ? []
            : [
                {
                  attribute: "criticalDamage",
                  operation: "ratio-add",
                  rolls: 3,
                },
              ]),
        ],
      },
    ]),
  ) as unknown as StaticActorConfiguration["driveDiscs"]
  return {
    data,
    actorId: holderId,
    actors: [
      {
        entityId: holderId,
        teamId: "team:players",
        agentEntityId: "1611",
        coreSkillLevel: 7,
        mindscapeRank: 0,
        wEngine: { entityId: "14161", refinement: 1, eligible: true },
        driveDiscs: discs,
        panel: { mode: "equipment" },
      },
    ],
    action: resolveAgentAction({
      agent: data.agents[0]!.actions,
      actionId: "action:agent:1611:action:0019",
      mindscapeRank: 0,
      levels: { chain: { mode: "effective", value: 12 } },
    }),
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 1000,
      resistances: { electric: 0 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [{ holderId, optionId: stateOption, layers: 1 }],
  }
}

function calculate(input: StaticActionCalculationInput) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}

function withLegacySelection(
  input: StaticActionCalculationInput,
): StaticActionCalculationInput {
  return {
    ...input,
    selections: [
      ...input.selections,
      { holderId, optionId: conversionOption, layers: 1 },
    ],
    inputs: [
      {
        bindingId,
        name: `${conversionEffect}:source`,
        value: { unit: "ratio", value: 1.7 },
      },
    ],
  }
}

function withManualPanel(
  input: StaticActionCalculationInput,
  panel: StaticPanelResult,
): StaticActionCalculationInput {
  return {
    ...input,
    actors: [
      {
        ...input.actors[0]!,
        panel: {
          mode: "out-of-combat",
          stats: panel.stats,
          penetrationValue: panel.penetrationValue,
          damageBonuses: panel.damageBonuses,
        },
      },
    ],
  }
}

describe("Claret permanent initial critical conversion", () => {
  it("uses the same public entry checks as the installed package and browser", async () => {
    await verifyClaretInitialConversionConsumer(
      { loadStaticCalculationData, resolveAgentAction },
      { calculateStaticActionDamage, staticSourceBindingId },
    )
  })
  it("includes the conversion in the equipment panel without an explicit option", async () => {
    const result = calculate(await fixture())
    expect(result.panels[0]!.stats.criticalDamage!.value).toBeCloseTo(1.7, 12)
    expect(result.panels[0]!.stats.criticalRate!.value).toBeCloseTo(1.325, 12)
    expect(result.segments[0]!.damage.evaluation.hit!.criticalRate).toBeCloseTo(
      1.625,
      12,
    )
  })

  it("does not add the legacy conversion again to a known settled external panel", async () => {
    const input = withLegacySelection(await fixture())
    const panel = calculate(input).panels[0]!
    const result = calculate(
      withManualPanel(input, {
        ...panel,
        stats: {
          ...panel.stats,
          criticalRate: { unit: "ratio", value: 1.325 },
        },
      }),
    )
    expect(result.panels[0]!.stats.criticalRate!.value).toBe(1.325)
    expect(result.segments[0]!.damage.evaluation.hit!.criticalRate).toBeCloseTo(
      1.625,
      12,
    )
  })

  it.each([1, 2, 3, 4, 5, 6, 7] as const)(
    "settles core %s once across equipment, legacy selection and returned manual panels",
    async (coreSkillLevel) => {
      const base = await fixture()
      const input = {
        ...base,
        actors: [{ ...base.actors[0]!, coreSkillLevel }],
      }
      const before = structuredClone(input)
      const expectedInitial = 1.037 + (coreSkillLevel - 1) * 0.048
      const expectedHit = expectedInitial + 0.15 + (coreSkillLevel - 1) * 0.025
      const equipment = calculate(input)
      expect(equipment.panels[0]!.stats.criticalRate!.value).toBeCloseTo(
        expectedInitial,
        12,
      )
      expect(
        equipment.segments[0]!.damage.evaluation.hit!.criticalRate,
      ).toBeCloseTo(expectedHit, 12)
      expect(
        equipment.panels[0]!.contributions.filter(
          (c) => c.origin.effectId === conversionEffect,
        ),
      ).toHaveLength(1)
      expect(
        equipment.segments[0]!.damage.evaluation.contributions.filter(
          (c) => c.origin.effectId === conversionEffect,
        ),
      ).toHaveLength(0)
      for (const candidate of [input, withLegacySelection(input)]) {
        const automatic = calculate(candidate)
        const manual = calculate(
          withManualPanel(candidate, automatic.panels[0]!),
        )
        expect(automatic.panels[0]!.stats).toEqual(equipment.panels[0]!.stats)
        expect(manual.panels[0]!.stats).toEqual(automatic.panels[0]!.stats)
        expect(automatic.segments).toEqual(equipment.segments)
        expect(manual.segments).toEqual(automatic.segments)
        expect(manual.totals).toEqual(equipment.totals)
      }
      expect(input).toEqual(before)
    },
  )

  it("keeps the conditional core state out of the panel and applies it only to the selected hit", async () => {
    const input = await fixture()
    const off = calculate({ ...input, selections: [] })
    const on = calculate(input)
    expect(off.panels[0]!.stats).toEqual(on.panels[0]!.stats)
    expect(off.segments[0]!.damage.evaluation.hit!.criticalRate).toBeCloseTo(
      1.325,
      12,
    )
    expect(on.segments[0]!.damage.evaluation.hit!.criticalRate).toBeCloseTo(
      1.625,
      12,
    )
    expect(calculate({ ...input, selections: [] }).totals).toEqual(off.totals)
  })

  it("includes two-piece initial critical damage but never feeds battle critical damage back into the conversion", async () => {
    const base = await fixture()
    const input: StaticActionCalculationInput = {
      ...base,
      actors: [
        {
          ...base.actors[0]!,
          driveDiscs: Object.fromEntries(
            Object.entries(base.actors[0]!.driveDiscs).map(([slot, disc]) => [
              slot,
              {
                ...disc!,
                setEntityId: Number(slot) <= 4 ? "32700" : "31000",
              },
            ]),
          ) as StaticActorConfiguration["driveDiscs"],
        },
      ],
    }
    const off = calculate(input)
    const onInput: StaticActionCalculationInput = {
      ...input,
      selections: [
        ...input.selections,
        {
          holderId,
          optionId:
            "drive-discs:SuitBranch%26BladeSong:setPieces:4:blk-legacy:legacy-self-critDmg",
          layers: 1,
        },
      ],
    }
    const on = calculate(onInput)
    expect(off.panels[0]!.stats.criticalDamage!.value).toBeCloseTo(1.86, 12)
    expect(off.panels[0]!.stats.criticalRate!.value).toBeCloseTo(1.381, 12)
    expect(on.panels[0]!.stats).toEqual(off.panels[0]!.stats)
    const battleEffect =
      "disc:32700:zzz-hp:legacy-self-critDmg:blk-legacy:setPieces:4"
    // 锐化命中不消费普通暴伤；用普通伤害探针确认所选战斗规则确实能增加暴伤。
    const probe = inputFor([
      input.data.definitions.effects.find(
        (rule) => rule.effectId === battleEffect,
      ) as ContributionRule,
    ])
    const battleDamage = calculateStaticDamage({
      ...probe,
      bindings: [
        {
          kind: "drive-disc",
          bindingId: "binding:static",
          holderId: "entity:attacker",
          sourceEntityId: "32700",
          eligible: true,
          configuration: { setPieces: 4 },
        },
      ],
    })
    expect(battleDamage.ok, JSON.stringify(battleDamage)).toBe(true)
    if (!battleDamage.ok) throw new Error(JSON.stringify(battleDamage.issues))
    expect(
      battleDamage.value.evaluation.contributions.find(
        (c) => c.origin.effectId === battleEffect,
      )?.value.value,
    ).toBe(0.3)
    expect(on.segments[0]!.damage.evaluation.hit!.criticalRate).toBeCloseTo(
      1.681,
      12,
    )
    expect(on.totals).toEqual(off.totals)
    expect(calculate(withManualPanel(onInput, on.panels[0]!)).totals).toEqual(
      on.totals,
    )
  })

  it("isolates two Claret holders and an unrelated agent, including mixed panel modes", async () => {
    const input = withLegacySelection(await fixture())
    const data = await loadStaticCalculationData({
      agents: ["1611", "1121"],
      wEngines: ["14161"],
    })
    const emptyDiscs = {
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    } as const
    const second: StaticActorConfiguration = {
      ...input.actors[0]!,
      entityId: "entity:second-claret",
      coreSkillLevel: 1,
      driveDiscs: emptyDiscs,
      wEngine: null,
    }
    const ben: StaticActorConfiguration = {
      ...second,
      entityId: "entity:ben",
      agentEntityId: "1121",
    }
    const teamInput: StaticActionCalculationInput = {
      ...input,
      data,
      actors: [...input.actors, second, ben],
      selections: [
        ...input.selections,
        { holderId: second.entityId, optionId: conversionOption, layers: 1 },
        { holderId: second.entityId, optionId: stateOption, layers: 1 },
      ],
      inputs: [
        ...input.inputs!,
        {
          bindingId: staticSourceBindingId(second.entityId, "agent", "1611"),
          name: `${conversionEffect}:source`,
          value: { unit: "ratio", value: 0.5 },
        },
      ],
    }
    const result = calculate(teamInput)
    for (const [index, expected] of [1.325, 0.225, 0.05].entries())
      expect(result.panels[index]!.stats.criticalRate!.value).toBeCloseTo(
        expected,
        12,
      )
    expect(result.segments[0]!.damage.evaluation.hit!.criticalRate).toBeCloseTo(
      1.625,
      12,
    )
    const mixed = calculate({
      ...teamInput,
      actors: [
        withManualPanel(input, result.panels[0]!).actors[0]!,
        second,
        ben,
      ],
    })
    expect(mixed.panels.map((p) => p.stats)).toEqual(
      result.panels.map((p) => p.stats),
    )
    expect(mixed.totals).toEqual(result.totals)
  })

  it("treats a zero-layer legacy option as closed without disabling the permanent panel conversion", async () => {
    const input = await fixture()
    const baseline = calculate(input)
    const result = calculate({
      ...input,
      selections: [
        ...input.selections,
        { holderId, optionId: conversionOption, layers: 0 },
      ],
    })
    expect(result.panels).toEqual(baseline.panels)
    expect(result.totals).toEqual(baseline.totals)
  })

  it("retains finite legacy inputs as compatibility declarations without letting them override the panel source", async () => {
    const input = withLegacySelection(await fixture())
    const baseline = calculate(input)
    const result = calculate({
      ...input,
      inputs: [{ ...input.inputs![0]!, value: { unit: "ratio", value: 99 } }],
    })
    expect(result.panels).toEqual(baseline.panels)
    expect(result.totals).toEqual(baseline.totals)
  })

  it.each([
    "missing",
    "wrong-unit",
    "nonfinite",
    "wrong-binding",
    "wrong-holder",
    "layers",
    "duplicate",
  ] as const)(
    "still rejects %s legacy source input or selection",
    async (kind) => {
      const input = withLegacySelection(await fixture())
      let invalid: StaticActionCalculationInput
      if (kind === "missing") invalid = { ...input, inputs: [] }
      else if (kind === "wrong-unit")
        invalid = {
          ...input,
          inputs: [
            {
              ...input.inputs![0]!,
              value: { unit: "attack-points", value: 1.7 },
            },
          ],
        }
      else if (kind === "nonfinite")
        invalid = {
          ...input,
          inputs: [
            {
              ...input.inputs![0]!,
              value: { unit: "ratio", value: Number.NaN },
            },
          ],
        }
      else if (kind === "wrong-binding")
        invalid = {
          ...input,
          inputs: [{ ...input.inputs![0]!, bindingId: "binding:missing" }],
        }
      else if (kind === "duplicate")
        invalid = {
          ...input,
          selections: [...input.selections, input.selections[1]!],
        }
      else
        invalid = {
          ...input,
          selections: [
            {
              ...input.selections[1]!,
              ...(kind === "wrong-holder"
                ? { holderId: "entity:missing" as const }
                : { layers: 2 }),
            },
          ],
        }
      const result = calculateStaticActionDamage(invalid)
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error("Invalid legacy input was accepted")
      const code =
        kind === "missing"
          ? "MISSING_FACT"
          : kind === "wrong-binding"
            ? "MISSING_REFERENCE"
            : kind === "wrong-unit"
              ? "UNIT_MISMATCH"
              : kind === "wrong-holder"
                ? "CONTEXT_MISMATCH"
                : kind === "duplicate"
                  ? "DUPLICATE_ID"
                  : "INVALID_INPUT"
      expect(
        result.issues.some((issue) => issue.code === code),
        JSON.stringify(result.issues),
      ).toBe(true)
    },
  )
})

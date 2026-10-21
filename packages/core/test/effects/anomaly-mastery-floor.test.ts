import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  evaluateEffects,
  prepareEffects,
  supplyEffectState,
} from "../../src/effects/index.ts"
import type {
  ContributionRule,
  EvaluationInput,
  GeneralStatInput,
  Result,
  SavedSnapshot,
  Stat,
  StaticDamageInput,
} from "../../src/effects/index.ts"
import {
  definitions,
  general,
  inputFor,
  literal,
  rule,
} from "./static-fixtures.ts"

function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function anomalyMastery(value: number): GeneralStatInput {
  return general(value)
}

function worldWithAnomalyMastery(
  input: StaticDamageInput,
  value: number,
): StaticDamageInput["world"] {
  return {
    ...input.world,
    entities: input.world.entities.map((entity) =>
      entity.entityId === "entity:attacker" && entity.kind === "actor"
        ? {
            ...entity,
            generalStats: {
              ...entity.generalStats,
              anomalyMastery: anomalyMastery(value),
            },
          }
        : entity,
    ),
  }
}

function panelAttributes(
  world: StaticDamageInput["world"],
  stats: readonly [Stat, ...Stat[]],
): ReadonlyMap<Stat, number> {
  const input = inputFor()
  const prepared = ok(prepareEffects(definitions([]), input.bindings))
  const state = ok(
    supplyEffectState(prepared, {
      sessionId: "session:anomaly-mastery-floor",
      atSeconds: 0,
      instances: [],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    }),
  )
  const result = ok(
    evaluateEffects(prepared, state, {
      kind: "panel",
      atSeconds: 0,
      world,
      observedSnapshots: [],
      entities: ["entity:attacker"],
      stats,
    } as EvaluationInput),
  )
  return new Map(
    result.attributes.map((attribute) => [
      attribute.stat,
      attribute.value.value,
    ]),
  )
}

function contributionValue(
  effects: readonly ContributionRule[],
  world: StaticDamageInput["world"],
  extra: Partial<StaticDamageInput> = {},
): number {
  const input = inputFor(effects)
  const result = ok(
    calculateStaticDamage({
      ...input,
      ...extra,
      world,
    }),
  )
  const effectId = effects[0]!.effectId
  const contribution = result.evaluation.contributions.find(
    (entry) => entry.origin.effectId === effectId,
  )
  expect(contribution).toBeDefined()
  return contribution!.value.value
}

const readAnomalyMastery = (
  stage: "initial" | "current",
  at: "evaluation" | "activation",
): ContributionRule =>
  rule("read-anomaly-mastery", {
    kind: "factor-contribution",
    channel: "damage-bonus",
    value: {
      kind: "convert",
      unit: "ratio",
      input: {
        kind: "stat",
        unit: "anomaly-mastery-points",
        entity: { role: "holder" },
        stat: "anomalyMastery",
        stage,
        at,
      },
      rate: literal("multiplier", 0.01),
    },
  }) as ContributionRule

describe("anomaly mastery read floor", () => {
  it.each([
    [209.76, 209],
    [155.9, 155],
    [209, 209],
  ])("floors panel anomalyMastery %s to %s", (raw, expected) => {
    const input = inputFor()
    const values = panelAttributes(worldWithAnomalyMastery(input, raw), [
      "anomalyMastery",
    ])
    expect(values.get("anomalyMastery")).toBe(expected)
  })

  it("keeps decimals on other panel stats", () => {
    const input = inputFor()
    const world = worldWithAnomalyMastery(input, 209.76)
    const values = panelAttributes(
      {
        ...world,
        entities: world.entities.map((entity) =>
          entity.entityId === "entity:attacker" && entity.kind === "actor"
            ? {
                ...entity,
                generalStats: {
                  ...entity.generalStats,
                  attack: general(1000.5),
                  anomalyProficiency: general(300.25),
                },
              }
            : entity,
        ),
      },
      ["anomalyMastery", "attack", "anomalyProficiency", "criticalRate"],
    )
    expect(values.get("anomalyMastery")).toBe(209)
    expect(values.get("attack")).toBe(1000.5)
    expect(values.get("anomalyProficiency")).toBe(300.25)
    expect(values.get("criticalRate")).toBe(0.25)
  })

  it("floors an initial-stage expression read", () => {
    const effect = readAnomalyMastery("initial", "evaluation")
    const input = inputFor([effect])
    const value = contributionValue(
      [effect],
      worldWithAnomalyMastery(input, 155.9),
    )
    expect(value).toBeCloseTo(1.55, 12)
  })

  it("floors a snapshot expression read", () => {
    const effect = readAnomalyMastery("current", "activation")
    const input = inputFor([effect])
    const world = worldWithAnomalyMastery(input, 0)
    const snapshot: SavedSnapshot = {
      snapshotId: "snapshot:anomaly-mastery-action",
      atSeconds: 0,
      attributes: [
        {
          entityId: "entity:attacker",
          stat: "anomalyMastery",
          stage: "current",
          value: { unit: "anomaly-mastery-points", value: 209.76 },
        },
      ],
      world,
    }
    const value = contributionValue([effect], world, {
      selections: input.selections.map((selection) => ({
        ...selection,
        trigger: {
          eventId: "event:anomaly-mastery",
          actorId: "entity:attacker",
          activationSnapshotId: snapshot.snapshotId,
        },
      })),
      snapshots: [snapshot],
    })
    expect(value).toBeCloseTo(2.09, 12)
  })

  it("floors a hit attribute read from a snapshot", () => {
    const input = inputFor()
    const world = worldWithAnomalyMastery(input, 0)
    const snapshot: SavedSnapshot = {
      snapshotId: "snapshot:anomaly-mastery-damage-item",
      atSeconds: 0,
      attributes: [
        {
          entityId: "entity:attacker",
          stat: "anomalyMastery",
          stage: "current",
          value: { unit: "anomaly-mastery-points", value: 209.76 },
        },
      ],
      world,
    }
    const result = ok(
      calculateStaticDamage({
        ...input,
        world,
        hit: {
          ...input.hit,
          actionSnapshotId: snapshot.snapshotId,
          damageItems: [
            {
              itemId: "anomaly-mastery",
              stat: "anomalyMastery",
              damageMultiplier: 1,
              statSource: {
                entityId: "entity:attacker",
                snapshotId: snapshot.snapshotId,
              },
            },
          ],
        },
        snapshots: [snapshot],
      }),
    )
    expect(result.evaluation.hit?.damageItems[0]?.finalStat).toBe(209)
  })

  it("feeds the floored value into a 155-threshold conversion", () => {
    const effect = rule("fione-threshold-conversion", {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "convert",
        unit: "ratio",
        input: {
          kind: "add",
          unit: "anomaly-mastery-points",
          operands: [
            {
              kind: "stat",
              unit: "anomaly-mastery-points",
              entity: { role: "holder" },
              stat: "anomalyMastery",
              stage: "current",
              at: "evaluation",
            },
            literal("anomaly-mastery-points", -155),
          ],
        },
        rate: literal("multiplier", 0.01),
      },
    }) as ContributionRule
    const input = inputFor([effect])
    const value = contributionValue(
      [effect],
      worldWithAnomalyMastery(input, 209.76),
    )
    // 209（向下取整）- 155 = 54，再按 1% 转化；未取整会得到 0.5476。
    expect(value).toBeCloseTo(0.54, 12)
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { calculateStaticDamage } from "../../src/effects/index.ts"
import type {
  ContributionRule,
  GeneralStat,
  NumericExpression,
  RuleSource,
  StaticDamageInput,
  Unit,
} from "../../src/effects/index.ts"
import { astraCore, astraMindscapeTwo } from "./fixtures.ts"
import {
  always,
  definitions,
  general,
  inputFor,
  literal,
} from "./static-fixtures.ts"

interface ConversionRecord {
  id: string
  pointer: `/${string}`
  effect: {
    id: string
    convert: {
      from: string
      panelSource: string
      ratioPercent: number
      cap: number | null
      initialBase: number
    }
  }
  cases: { input: number; upstream: number }[]
}
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/zzz-hp-static.json", import.meta.url),
    "utf8",
  ),
) as {
  revision: string
  resourcePath: string
  conversions: ConversionRecord[]
  refinements: {
    rank: number
    pointer: `/${string}`
    effect: { valuePerStack: number }
    cases: { layers: number; upstream: number }[]
  }[]
  knownDifferences: {
    id: string
    input: number
    upstream: number
    fairy: number
  }[]
}

function source(
  kind: RuleSource["identity"]["kind"],
  entityId: string,
  pointer: `/${string}`,
): RuleSource {
  return {
    identity: { kind, entityId },
    section: "pinned-zzz-hp-test",
    references: [
      {
        sourceId: "zzz-hp",
        version: reference.revision,
        locale: "zh",
        resourcePath: reference.resourcePath,
        pointer,
      },
    ],
  }
}

// 只转换已列出的四条验收规则；全量数据转换由下一阶段实现。
function convertedRule(record: ConversionRecord): ContributionRule {
  const { convert } = record.effect
  const inputStat =
    record.id === "jane"
      ? "anomalyProficiency"
      : record.id === "lucia"
        ? "health"
        : "impact"
  const inputUnit =
    inputStat === "anomalyProficiency"
      ? "anomaly-proficiency-points"
      : inputStat === "health"
        ? "health-points"
        : "impact-points"
  const outputUnit =
    record.id === "lighter"
      ? "ratio"
      : record.id === "lucia"
        ? "sheer-force-points"
        : "attack-points"
  const outputScale = outputUnit === "ratio" ? 100 : 1
  const base: NumericExpression<Unit, "contribution"> =
    convert.panelSource === "manual"
      ? { kind: "input", unit: inputUnit, name: "conversionBase" }
      : ({
          kind: "stat",
          unit: inputUnit,
          stat: inputStat,
          entity: { role: "holder" },
          stage: convert.panelSource === "external" ? "initial" : "current",
          at: "evaluation",
        } as NumericExpression<Unit, "contribution">)
  const conversion: NumericExpression<Unit, "contribution"> = {
    kind: "convert",
    unit: outputUnit,
    input: {
      kind: "maximum",
      unit: inputUnit,
      operands: [
        literal(inputUnit, 0),
        {
          kind: "add",
          unit: inputUnit,
          operands: [base, literal(inputUnit, -convert.initialBase)],
        },
      ],
    },
    rate: { kind: "parameter", unit: "multiplier", name: "rate" },
  }
  const value =
    convert.cap === null
      ? conversion
      : ({
          kind: "minimum",
          unit: outputUnit,
          operands: [
            conversion,
            literal(outputUnit, convert.cap / outputScale),
          ],
        } as NumericExpression<Unit, "contribution">)
  return {
    kind: "contribution",
    effectId: `agent:zzz-hp:${record.id}:${record.effect.id}`,
    source: source("agent", record.id, record.pointer),
    config: always,
    parameters: {
      rate: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: { 7: convert.ratioPercent / 100 / outputScale },
      },
    },
    activation: { kind: "supplied", maximumLayers: literal("count", 1) },
    beneficiary: {
      kind:
        record.id === "lighter" || record.id === "lucia" ? "team" : "holder",
    },
    when:
      record.id === "lighter"
        ? { kind: "one-of", fact: "hit.element", values: ["fire", "ice"] }
        : always,
    scope: record.id === "lighter" ? "hit" : "entity",
    operation:
      record.id === "lighter"
        ? { kind: "factor-contribution", channel: "damage-bonus", value }
        : {
            kind: "stat-adjustment",
            stat: record.id === "lucia" ? "sheerForce" : "attack",
            stage: "final-fixed",
            value,
          },
  } as ContributionRule
}

describe("fixed ZZZ-HP revision fac6240 static conversion fixtures", () => {
  for (const record of reference.conversions) {
    it.each(record.cases)(
      `${record.id}: input $input matches upstream $upstream`,
      ({ input: sourceValue, upstream }) => {
        const effect = convertedRule(record)
        const base = inputFor([effect])
        const actor = base.world.entities[0]!
        if (actor.kind !== "actor") throw new Error("actor")
        const sourceStat: GeneralStat =
          record.id === "jane"
            ? "anomalyProficiency"
            : record.id === "lucia"
              ? "health"
              : "impact"
        const input: StaticDamageInput = {
          ...base,
          bindings: [
            {
              kind: "agent",
              bindingId: "binding:static",
              holderId: "entity:attacker",
              sourceEntityId: record.id,
              eligible: true,
              configuration: { coreSkillLevel: 7, mindscapeRank: 0 },
            },
          ],
          world: {
            ...base.world,
            entities: [
              {
                ...actor,
                generalStats: {
                  ...actor.generalStats,
                  [sourceStat]: general(sourceValue),
                },
              },
              base.world.entities[1]!,
            ],
          },
          inputs:
            record.id === "lighter"
              ? [
                  {
                    bindingId: "binding:static",
                    name: "conversionBase",
                    value: { unit: "impact-points", value: sourceValue },
                  },
                ]
              : [],
        }
        const result = calculateStaticDamage(
          record.id === "lucia"
            ? {
                ...input,
                hit: {
                  ...input.hit,
                  damageItems: [
                    {
                      itemId: "sheer",
                      damageMultiplier: 2,
                      stat: "sheerForce",
                    },
                  ],
                },
                damage: {
                  kind: "sheer",
                  damageBonus: [],
                  sheerDamageBonus: [],
                  resistance: input.damage.resistance,
                  stunDamage: input.damage.stunDamage,
                  damageTaken: input.damage.damageTaken,
                },
              }
            : input,
        )
        if (!result.ok) throw new Error(JSON.stringify(result.issues))
        const contribution = result.value.evaluation.contributions.find(
          (entry) => entry.origin.effectId === effect.effectId,
        )
        expect(contribution?.value.value).toBeCloseTo(
          record.id === "lighter" ? upstream / 100 : upstream,
          12,
        )
        if (record.id === "qingyi" || record.id === "jane") {
          expect(result.value.evaluation.hit?.damageItems[0]?.finalStat).toBe(
            1000 + upstream,
          )
          expect(result.value.nonCritical).toBeCloseTo(
            ((1000 + upstream) * 2 * 794) / 1694,
            10,
          )
        } else if (record.id === "lucia") {
          expect(result.value.nonCritical).toBeCloseTo((500 + upstream) * 2, 10)
        } else {
          expect(result.value.nonCritical).toBeCloseTo(
            (2000 * (1 + upstream / 100) * 794) / 1694,
            10,
          )
        }
      },
    )
  }

  const refinementEffect: ContributionRule = {
    kind: "contribution",
    effectId: "w-engine:zzz-hp:Elegant_Vanity:damage-bonus",
    source: {
      ...source(
        "w-engine",
        "Elegant_Vanity",
        reference.refinements[0]!.pointer,
      ),
      references: reference.refinements.map(
        (rank) =>
          source("w-engine", "Elegant_Vanity", rank.pointer).references[0]!,
      ) as unknown as RuleSource["references"],
    },
    config: always,
    parameters: {
      bonus: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: Object.fromEntries(
          reference.refinements.map((rank) => [
            rank.rank,
            rank.effect.valuePerStack / 100,
          ]),
        ),
      },
    },
    activation: { kind: "supplied", maximumLayers: literal("count", 2) },
    beneficiary: { kind: "team" },
    scope: "entity",
    when: always,
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "bonus" },
    },
  }
  for (const rank of reference.refinements) {
    it.each(rank.cases)(
      `Elegant Vanity R${rank.rank} at $layers layers matches $upstream%`,
      ({ layers, upstream }) => {
        const input = inputFor([refinementEffect])
        const result = calculateStaticDamage({
          ...input,
          bindings: [
            {
              kind: "w-engine",
              bindingId: "binding:static",
              holderId: "entity:attacker",
              sourceEntityId: "Elegant_Vanity",
              eligible: true,
              configuration: { refinement: rank.rank as 1 | 2 | 3 | 4 | 5 },
            },
          ],
          selections: layers === 0 ? [] : [{ ...input.selections[0]!, layers }],
        })
        if (!result.ok) throw new Error(JSON.stringify(result.issues))
        expect(result.value.factors.nonCritical["damageBonus"]).toBeCloseTo(
          1 + upstream / 100,
          12,
        )
      },
    )
  }

  it.each([0, 1, 2, 4, 6] as const)(
    "preserves the Astra M2 parameter modification at mindscape %s without duplicating enhancements",
    (mindscapeRank) => {
      const difference = reference.knownDifferences[0]!
      const input = inputFor()
      const actor = input.world.entities[0]!
      if (actor.kind !== "actor") throw new Error("actor")
      const world = {
        ...input.world,
        entities: [
          {
            ...actor,
            generalStats: {
              ...actor.generalStats,
              attack: general(difference.input),
            },
          },
          input.world.entities[1]!,
        ],
      }
      const result = calculateStaticDamage({
        ...input,
        world,
        definitions: definitions([
          astraCore,
          astraMindscapeTwo,
        ] as unknown as ContributionRule[]),
        bindings: [
          {
            kind: "agent",
            bindingId: "binding:static",
            holderId: "entity:attacker",
            sourceEntityId: "1311",
            eligible: true,
            configuration: { mindscapeRank, coreSkillLevel: 7 },
          },
        ],
        selections: [
          {
            effectId: "agent:1311:core:attack-conversion",
            bindingId: "binding:static",
            layers: 1,
            trigger: {
              actorId: "entity:attacker",
              eventId: "event:static",
              activationSnapshotId: "snapshot:activation",
            },
          },
        ],
        snapshots: [
          {
            snapshotId: "snapshot:activation",
            atSeconds: 0,
            attributes: [],
            world,
          },
        ],
      })
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      const contribution = result.value.evaluation.contributions.find(
        (entry) => entry.origin.effectId === astraCore.effectId,
      )!
      expect(contribution.value.value).toBe(
        mindscapeRank < 2 ? 1200 : difference.fairy,
      )
      if (mindscapeRank >= 2) {
        expect(difference.upstream).toBe(1600)
        expect(contribution.appliedModifications).toEqual([
          astraMindscapeTwo.effectId,
        ])
      }
    },
  )
})

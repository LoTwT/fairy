import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../src/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../src/index.ts"
import { general, inputFor } from "./static-fixtures.ts"
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog
const oracle = read("./fixtures/zzz-hp-static-catalog.json") as {
  sourceCommit: string
  tables: Record<string, unknown[]>
  cases: {
    pointer: string
    input: Record<string, number>
    expected: number
    unit: string
    effectIds: string[]
  }[]
}
const coverage = read(
  "../../data/definitions/effects/static-coverage.json",
) as { records: { pointer: string; status: string }[] }

function agentInput(
  agentEntityId: string,
  optionIds: readonly string[],
  mindscapeRank: 0 | 2 | 6 = 0,
): StaticCatalogDamageInput {
  const base = inputFor()
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: agentEntityId,
        eligible: true,
        configuration: { mindscapeRank, coreSkillLevel: 7 },
      },
    ],
    actorSources: [{ entityId: "entity:attacker", agentEntityId }],
    selections: optionIds.map((optionId) => ({
      optionId,
      bindingId: "binding:static",
      layers: 1,
    })),
    hit: {
      ...base.hit,
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "base",
          stat: "attack",
          statSource: { entityId: "entity:attacker" },
          damageMultiplier: 2,
        },
      ],
    },
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
  }
}

describe("fixed-source catalog conformance", () => {
  it("preserves The Vault's different self/team targets across refinement ranks", () => {
    const option = catalog.options.find(
      (o) =>
        o.optionId ===
        "w-engines:The_Vault:refinement:blk-legacy:legacy-self-dmgBonus",
    )!
    const input = agentInput("1311", [])
    const holder = input.world.entities[0]!
    if (holder.kind !== "actor") throw new Error("fixture")
    for (const [refinement, expectedBonus] of [
      [1, 0],
      [2, 0.175],
    ] as const) {
      const result = calculateStaticDamageFromCatalog({
        ...input,
        world: {
          ...input.world,
          entities: [
            ...input.world.entities,
            { ...holder, entityId: "entity:teammate" },
          ],
        },
        actorSources: [
          ...input.actorSources,
          { entityId: "entity:teammate", agentEntityId: "1311" },
        ],
        bindings: [
          {
            kind: "w-engine",
            bindingId: "binding:weapon",
            sourceEntityId: "13103",
            holderId: "entity:attacker",
            eligible: true,
            configuration: { refinement },
          },
        ],
        selections: [
          { optionId: option.optionId, bindingId: "binding:weapon", layers: 1 },
        ],
        hit: {
          ...input.hit,
          actorId: "entity:teammate",
          element: "ether",
          damageItems: [
            {
              ...input.hit.damageItems[0],
              statSource: { entityId: "entity:teammate" },
            },
          ],
        },
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (result.ok)
        expect(result.value.factors.nonCritical["damageBonus"]).toBe(
          1 + expectedBonus,
        )
    }
  })
  it("accounts for every converted source position with an independent reference result", () => {
    expect(oracle.sourceCommit).toBe(catalog.source.commit)
    expect(oracle.cases.map((c) => c.pointer).toSorted()).toEqual(
      coverage.records
        .filter((r) => r.status === "converted")
        .map((r) => r.pointer)
        .toSorted(),
    )
  })
  it("matches each converted record in its actual rank and hit context", () => {
    for (const vector of oracle.cases) {
      const values = Object.fromEntries(
        Object.entries(vector.input).map(([key, index]) => [
          key,
          oracle.tables[key]![index],
        ]),
      )
      const input = {
        ...values,
        definitions,
        catalog,
      } as unknown as StaticCatalogDamageInput
      const result = calculateStaticDamageFromCatalog(input)
      expect(
        result.ok,
        `${vector.pointer}: ${result.ok ? "" : JSON.stringify(result.issues)}`,
      ).toBe(true)
      if (!result.ok) continue
      const contributions = [
        ...result.value.evaluation.contributions,
        ...(result.value.preparations ?? []).flatMap((p) => p.contributions),
      ]
      const actual = contributions
        .filter(
          (c) =>
            vector.effectIds.includes(c.origin.effectId) &&
            c.origin.beneficiaryId === input.hit.actorId,
        )
        .reduce((sum, c) => sum + c.value.value, 0)
      expect(actual, vector.pointer).toBeCloseTo(
        vector.expected,
        vector.unit === "ratio" || vector.unit === "multiplier" ? 6 : 4,
      )
    }
  }, 120_000)
  it("keeps Astra M2 as one parameter modification at every verified core level", () => {
    const base = catalog.options.find((o) =>
      o.optionId.endsWith("eff-ms38hwcr-m9hn4v"),
    )!
    const corrected = catalog.options.filter((o) =>
      o.variants.some((v) => v.differences.includes("astra-mindscape-2")),
    )
    const rates = [0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.35]
    for (const mindscape of [0, 2, 6] as const)
      for (const [i, rate] of rates.entries()) {
        const input = agentInput(
          "1311",
          [
            base.optionId,
            ...(mindscape >= 2 ? corrected.map((o) => o.optionId) : []),
          ],
          mindscape,
        )
        const result = calculateStaticDamageFromCatalog({
          ...input,
          bindings: [
            {
              ...input.bindings[0]!,
              configuration: {
                coreSkillLevel: (i + 1) as 1,
                mindscapeRank: mindscape,
              },
            } as StaticCatalogDamageInput["bindings"][number],
          ],
          inputs: [
            {
              bindingId: "binding:static",
              name: base.variants[0].inputs[0]!.name,
              value: { unit: "attack-points", value: 1000 },
            },
          ],
        })
        expect(result.ok).toBe(true)
        if (result.ok)
          expect(result.value.factors.nonCritical["baseDamage"]).toBeCloseTo(
            2 * (1000 + 1000 * (rate + (mindscape >= 2 ? 0.19 : 0))),
            8,
          )
      }
    for (const [attack, expected] of [
      [0, 0],
      [4000, 1600],
    ]) {
      const input = agentInput(
        "1311",
        [base.optionId, ...corrected.map((o) => o.optionId)],
        6,
      )
      const result = calculateStaticDamageFromCatalog({
        ...input,
        inputs: [
          {
            bindingId: "binding:static",
            name: base.variants[0].inputs[0]!.name,
            value: { unit: "attack-points", value: attack! },
          },
        ],
      })
      expect(result.ok).toBe(true)
      // Fixed upstream at 4000: 1200 + 1600 - 1400 = 1400; the documented correction caps one conversion at 1600.
      if (result.ok)
        expect(result.value.factors.nonCritical["baseDamage"]).toBe(
          2 * (1000 + expected!),
        )
    }
  })
  it("consumes the actual luminize mapping once and preserves both explicit-lumiflux M6 corrections", () => {
    const mapping = catalog.options.find((o) =>
      o.variants.some((v) => v.parameterMapping),
    )!
    const m6 = catalog.options.filter((o) =>
      o.variants.some((v) =>
        v.differences.includes("luminize-explicit-element"),
      ),
    )
    const input = agentInput("1581", [mapping.optionId], 6)
    if (input.damage.kind !== "regular") throw new Error("fixture")
    const history = {
      kind: "actor",
      entityId: "entity:source",
      teamId: "team:players",
      generalStats: {},
      directStats: {},
    } as const
    const luminous: StaticCatalogDamageInput = {
      ...input,
      world: {
        ...input.world,
        entities: input.world.entities.map((e) =>
          e.kind === "actor" && e.entityId === "entity:attacker"
            ? {
                ...e,
                generalStats: {
                  ...e.generalStats,
                  anomalyProficiency: general(400),
                },
              }
            : e,
        ),
      },
      actorSources: [
        ...input.actorSources,
        { entityId: "entity:source", agentEntityId: "1311" },
      ],
      snapshots: [
        {
          snapshotId: "snapshot:source",
          atSeconds: 0,
          world: {
            ...input.world,
            entities: [...input.world.entities, history],
          },
          attributes: [
            {
              entityId: "entity:source",
              stat: "attack",
              stage: "current",
              value: { unit: "attack-points", value: 2500 },
            },
            {
              entityId: "entity:source",
              stat: "anomalyProficiency",
              stage: "current",
              value: { unit: "anomaly-proficiency-points", value: 300 },
            },
          ],
        },
      ],
      hit: {
        ...input.hit,
        element: "lumiflux",
        damageItems: [
          {
            ...input.hit.damageItems[0],
            statSource: {
              entityId: "entity:source",
              snapshotId: "snapshot:source",
            },
          },
        ],
      },
      damage: {
        ...input.damage,
        kind: "luminize",
        anomalyDamageBonus: [],
        refringe: { mode: "settled", multiplier: 1.38 },
        anomalySource: {
          entityId: "entity:source",
          snapshotId: "snapshot:source",
          level: 50,
        },
        luminizeMultiplier: {
          baseLuminizeMultiplier: 3.2,
          multiplicativeLuminizeMultiplierAdjustments: [],
        },
      },
    }
    const result = calculateStaticDamageFromCatalog(luminous)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) {
      expect(result.value.factors.nonCritical["luminizeMultiplier"]).toBe(4)
      expect(result.value.factors.nonCritical["anomalyProficiency"]).toBe(3)
      expect(result.value.factors.nonCritical["baseDamage"]).toBe(5000)
      expect(result.value.factors.nonCritical["refringe"]).toBe(1.38)
    }
    const enhanced = calculateStaticDamageFromCatalog({
      ...luminous,
      hit: {
        ...luminous.hit,
        skillTargetIds: ["zzz-hp:skill:remiel-basic-ms95pjew"],
      },
      selections: [
        ...luminous.selections,
        ...m6.map((o) => ({
          optionId: o.optionId,
          bindingId: "binding:static" as const,
          layers: 1,
        })),
      ],
    })
    expect(enhanced.ok).toBe(true)
    if (enhanced.ok)
      expect(
        enhanced.value.factors.nonCritical["luminizeMultiplier"],
      ).toBeCloseTo((3.2 + 0.8 + 1.8) * 0.25, 10)
    expect(
      calculateStaticDamageFromCatalog({ ...luminous, selections: [] }).ok,
    ).toBe(false)
    expect(
      calculateStaticDamageFromCatalog({
        ...luminous,
        damage: {
          ...luminous.damage,
          anomalySource: { entityId: "entity:attacker", level: 60 },
        } as StaticCatalogDamageInput["damage"],
      }).ok,
    ).toBe(false)
  })
})

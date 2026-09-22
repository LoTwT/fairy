import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../src/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageResult,
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

function referenceInput(pointer: string): StaticCatalogDamageInput {
  const vector = oracle.cases.find((entry) => entry.pointer === pointer)
  if (!vector) throw new Error(`Missing source fixture: ${pointer}`)
  return {
    ...Object.fromEntries(
      Object.entries(vector.input).map(([key, index]) => [
        key,
        structuredClone(oracle.tables[key]![index]),
      ]),
    ),
    definitions,
    catalog,
  } as unknown as StaticCatalogDamageInput
}

function calculateCatalogResult(
  input: StaticCatalogDamageInput,
): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

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
  it.each(["anomaly", "anomaly-settlement", "vortex", "disorder"] as const)(
    "consumes generic anomaly bonuses in the final %s damage path",
    (kind) => {
      const input = referenceInput(
        "/driveDiscs/4/fourPieceBuffs/effectBlocks/0/effects/1",
      )
      if (input.damage.kind !== "anomaly") throw new Error("fixture")
      const request = { ...input, damage: { ...input.damage, kind } }
      const selected = calculateCatalogResult(request)
      const disabled = calculateCatalogResult({ ...request, selections: [] })
      // Fixed-source Chained four-piece: +16% in anomaly/release/vortex, not disorder.
      const multiplier = kind === "disorder" ? 1 : 1.16
      expect(selected.factors.nonCritical["anomalyDamageBonus"]).toBeCloseTo(
        multiplier,
        12,
      )
      expect(selected.expected / disabled.expected).toBeCloseTo(multiplier, 12)
    },
  )
  it.each(["anomaly", "anomaly-settlement", "vortex", "disorder"] as const)(
    "consumes generic anomaly critical contributions in the final %s damage path",
    (kind) => {
      const input = referenceInput(
        "/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/1",
      )
      const criticalDamage = referenceInput(
        "/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/2",
      )
      if (input.damage.kind !== "anomaly") throw new Error("fixture")
      const request = {
        ...input,
        selections: [...input.selections, ...criticalDamage.selections],
        damage: { ...input.damage, kind },
      }
      const selected = calculateCatalogResult(request)
      const disabled = calculateCatalogResult({ ...request, selections: [] })
      // Jane's explicit 40% anomaly critical rate and 50% damage are summed once.
      expect(selected.criticalRate).toBe(kind === "disorder" ? 0 : 0.4)
      expect(selected.expected / disabled.expected).toBeCloseTo(
        kind === "disorder" ? 1 : 1 + 0.4 * 0.5,
        12,
      )
    },
  )
  it("keeps an explicit anomaly scope narrower than a generic anomaly bonus", () => {
    const input = referenceInput(
      "/agents/37/mindscapeBuffs/2/effectBlocks/0/effects/0",
    )
    if (input.damage.kind !== "anomaly") throw new Error("fixture")
    for (const kind of ["anomaly", "anomaly-settlement", "vortex"] as const) {
      const request = { ...input, damage: { ...input.damage, kind } }
      const selected = calculateCatalogResult(request)
      const disabled = calculateCatalogResult({ ...request, selections: [] })
      expect(selected.expected / disabled.expected).toBeCloseTo(
        kind === "anomaly" ? 1.15 : 1,
        12,
      )
    }
  })
  it("consumes Burnice's skill multiplier only for the selected matching hit", () => {
    const input = referenceInput(
      "/agents/26/mindscapeBuffs/0/effectBlocks/1/effects/0",
    )
    const selected = calculateCatalogResult(input)
    const disabled = calculateCatalogResult({ ...input, selections: [] })
    expect(
      selected.factors.nonCritical["baseDamage"]! -
        disabled.factors.nonCritical["baseDamage"]!,
    ).toBeCloseTo(3.5 * 500, 12)
    expect(selected.expected / disabled.expected).toBeCloseTo(23.5 / 20, 12)
    const unrelated: StaticCatalogDamageInput = {
      ...input,
      hit: {
        ...input.hit,
        skillCategory: "basic",
        skillTargetIds: [],
        skillTags: [],
      },
    }
    expect(calculateCatalogResult(unrelated).expected).toBe(
      calculateCatalogResult({ ...unrelated, selections: [] }).expected,
    )
  })
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
            {
              entityId: "entity:source",
              stat: "penetrationRatio",
              stage: "current",
              value: { unit: "ratio", value: 0.25 },
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
      const withAnomalyBonus = calculateCatalogResult({
        ...luminous,
        bindings: [
          ...luminous.bindings,
          {
            kind: "drive-disc",
            bindingId: "binding:disc",
            sourceEntityId: "33800",
            holderId: "entity:attacker",
            eligible: true,
            configuration: { setPieces: 4 },
          },
        ],
        selections: [
          ...luminous.selections,
          {
            optionId:
              "drive-discs:SuitNotesFromtheChained:setPieces:4:blk-legacy:legacy-self-anomalyDmgBonus",
            bindingId: "binding:disc",
            layers: 1,
          },
        ],
      })
      expect(withAnomalyBonus.factors.nonCritical["anomalyDamageBonus"]).toBe(
        1.16,
      )
      expect(withAnomalyBonus.expected / result.value.expected).toBeCloseTo(
        1.16,
        12,
      )
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

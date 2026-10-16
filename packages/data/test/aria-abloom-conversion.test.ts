import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/aria-abloom-source.json" with { type: "json" }

const source = (): SourceData => ({
  agents: [structuredClone(fixture.raw) as SourceEntity],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
})
const normalization = (
  normalized = structuredClone(fixture.normalized) as SourceEntity,
): SourceNormalization => ({
  normalizeAgent: () => normalized,
  normalizeWengine: (entity) => entity,
  normalizeDriveDisc: (entity) => entity,
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
})
const block = (entity: SourceEntity) =>
  entity.mindscapeBuffs![0]!.effectBlocks![0]!

describe("Aria Abloom frozen conversion evidence", () => {
  it("corrects only the three rounded rates, retaining source identities and core-7 limits", () => {
    const result = convertSource(source(), normalization(), [], [])
    for (const [id, percent, base] of [
      ["eff-ms36k7q1-vqttu0", 27.5, 0.625],
      ["eff-ms36muwl-79wv54", 14.3, 1.25],
      ["eff-ms36oy6h-izqgcq", 2.5, 7.13],
    ] as const) {
      const rule = result.definitions.effects.find((rule) =>
        rule.effectId.includes(id),
      )!
      expect(rule).toMatchObject({
        parameters: {
          rate: {
            kind: "constant",
            unit: "multiplier",
            value: (percent * base) / 1000,
          },
        },
      })
      expect(
        result.catalog.options.find((option) => option.optionId.endsWith(id))!
          .variants[0],
      ).toMatchObject({
        status: "corrected",
        configuration: { coreSkillLevels: [7] },
        effectIds: [rule.effectId],
      })
    }
    expect(
      result.coverage.records.filter((record) => record.status === "corrected"),
    ).toHaveLength(3)
    const reorder = source()
    block(reorder.agents[0]!).effects.reverse()
    const reorderedNormalized = structuredClone(
      fixture.normalized,
    ) as SourceEntity
    block(reorderedNormalized).effects.reverse()
    const reordered = convertSource(
      reorder,
      normalization(reorderedNormalized),
      [],
      [],
    )
    expect(
      reordered.definitions.effects.map((rule) => [
        rule.effectId,
        "parameters" in rule ? rule.parameters : null,
      ]),
    ).toEqual(
      result.definitions.effects.map((rule) => [
        rule.effectId,
        "parameters" in rule ? rule.parameters : null,
      ]),
    )
  })

  it("rejects raw and normalized encoding, identity and full-note drift before fallback", () => {
    const mutations: ((entity: SourceEntity) => void)[] = [
      (entity) => {
        block(entity).effects[1]!.convert!.ratioPercent = 171.875
      },
      (entity) => {
        block(entity).effects[1]!.convert!.panelSource = "final"
      },
      (entity) => {
        block(entity).effects[1]!.convert!.initialBase = 100
      },
      (entity) => {
        block(entity).effects[1]!.elementFilter = ["火"]
      },
      (entity) => {
        block(entity).effects[1]!.stat = "unsupported-new-stat"
      },
      (entity) => {
        block(entity).effects.splice(1, 1)
      },
      (entity) => {
        block(entity).effects[1]!.id += "-renamed"
      },
      (entity) => {
        block(entity).id += "-moved"
      },
      (entity) => {
        block(entity).note += " changed"
      },
    ]
    for (const mutate of mutations) {
      const data = source()
      mutate(data.agents[0]!)
      expect(() => convertSource(data, normalization(), [], [])).toThrow(
        /drift|lost|unaccounted source effects/,
      )
      const normalized = structuredClone(fixture.normalized) as SourceEntity
      mutate(normalized)
      expect(() =>
        convertSource(source(), normalization(normalized), [], []),
      ).toThrow(/drift|lost|unaccounted source effects/)
    }
  })
})

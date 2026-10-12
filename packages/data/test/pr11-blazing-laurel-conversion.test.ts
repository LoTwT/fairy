import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"
import { blazingLaurelR5Block } from "./fixtures/blazing-laurel-source.ts"

const normalize = (entity: SourceEntity): SourceEntity => ({
  ...structuredClone(entity),
  refinementBuffs: Array.from({ length: 5 }, (_, rank) =>
    structuredClone(entity.refinementBuffs?.[rank] ?? {}),
  ),
  mindscapeBuffs: Array.from({ length: 7 }, (_, rank) =>
    structuredClone(entity.mindscapeBuffs?.[rank] ?? {}),
  ),
})
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: (pack: SourcePack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}
const source = (): SourceData => ({
  agents: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
  wengines: [
    {
      id: "Blazing_Laurel",
      name: "焰心桂冠",
      profession: "击破",
      refinementBuffs: [
        {},
        {},
        {},
        {},
        { effectBlocks: [blazingLaurelR5Block()] },
      ],
    },
  ],
})
const block = (entity: SourceEntity) =>
  entity.refinementBuffs![4]!.effectBlocks![0]!
const convert = (data: SourceData, normalization = functions) =>
  convertSource(data, normalization, [], [])
const optionId =
  "w-engines:Blazing_Laurel:refinement:blk-legacy:legacy-team-dmgBonus"
const effectId =
  "w-engine:14116:zzz-hp:legacy-team-dmgBonus:blk-legacy:refinement:5"

describe("Blazing Laurel R5 named source-stat correction", () => {
  it("compiles the frozen record as critical damage while preserving its public identity and raw evidence", () => {
    const input = source()
    const before = structuredClone(input)
    const result = convert(input)
    expect(input).toEqual(before)
    expect(result.definitions.effects).toMatchObject([
      {
        effectId,
        scope: "entity",
        beneficiary: { kind: "team" },
        parameters: { amount: { unit: "ratio", value: 0.024 } },
        activation: { kind: "supplied", maximumLayers: { value: 20 } },
        operation: {
          kind: "stat-adjustment",
          stat: "criticalDamage",
          stage: "direct",
        },
      },
    ])
    expect(result.catalog.options).toMatchObject([
      {
        optionId,
        name: "精5 · critDmg",
        target: "team",
        variants: [
          {
            status: "corrected",
            effectIds: [effectId],
            maximumLayers: 20,
            differences: ["blazing-laurel-r5-wilt-critical-damage"],
            applicability: { beneficiaryElements: ["fire", "ice"] },
          },
        ],
      },
    ])
    expect(result.catalog.options[0]!.conditionDescription).toContain(
      "暴击伤害提升2.4%",
    )
    expect(result.catalog.options[0]!.variants[0]!.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: "zh",
          resourcePath: "w-engines/14116/details.zh.json",
          pointer: "/talents/5/desc",
        }),
        expect.objectContaining({
          locale: "en",
          resourcePath: "w-engines/14116/details.en.json",
          pointer: "/talents/5/desc",
        }),
      ]),
    )
    expect(result.coverage.records).toMatchObject([
      {
        stat: "dmgBonus",
        status: "corrected",
        optionId,
        effectIds: [effectId],
        normalizationChanges: [],
      },
    ])
  })

  const drifts: [string, Partial<SourceEffect>][] = [
    ["stat", { stat: "special" }],
    ["kind", { kind: "fixed" }],
    ["scope", { scope: "skill" }],
    ["value", { value: 2.4 }],
    ["valuePerStack", { valuePerStack: 3 }],
    ["maxStacks", { maxStacks: 21 }],
    ["stackable", { stackable: true }],
    ["target", { applyTarget: "self" }],
    ["element", { elementFilter: "all" }],
    ["situation", { applySituation: "stagger" }],
    ["profession", { applyProfession: "强攻" }],
    ["teamProfession", { teamProfession: "击破" }],
    ["teamProfessionValues", { teamProfessionValues: [1, 2, 3] }],
    ["teamProfessionMinCount", { teamProfessionMinCount: 2 }],
    ["skillTargets", { skillTargets: [{ category: "basic" }] }],
    ["skillCategory", { skillCategory: "basic" }],
    ["skillSubcategoryId", { skillSubcategoryId: "other" }],
    ["anomaly", { appliesToAnomaly: false }],
    ["convert", { convert: { from: "atk", ratioPercent: 1 } }],
  ]
  it.each(
    drifts.flatMap(([field, changes]) =>
      (["raw", "normalized"] as const).map((representation) => ({
        field,
        changes,
        representation,
      })),
    ),
  )(
    "rejects $representation $field drift before unsupported fallback",
    ({ changes, representation }) => {
      const data = source()
      if (representation === "raw")
        Object.assign(block(data.wengines[0]!).effects[0]!, changes)
      const normalization = {
        ...functions,
        normalizeWengine: (entity: SourceEntity) => {
          const normalized = normalize(entity)
          if (representation === "normalized")
            Object.assign(block(normalized).effects[0]!, changes)
          return normalized
        },
      }
      expect(() => convert(data, normalization)).toThrow(
        /Source-stat correction.*field drift/,
      )
    },
  )

  it.each(["raw", "normalized"] as const)(
    "rejects %s note drift",
    (representation) => {
      const data = source()
      if (representation === "raw") block(data.wengines[0]!).note += "变义"
      expect(() =>
        convert(data, {
          ...functions,
          normalizeWengine: (entity) => {
            const normalized = normalize(entity)
            if (representation === "normalized") block(normalized).note = ""
            return normalized
          },
        }),
      ).toThrow(/Source-stat correction.*block note drift/)
    },
  )

  const identityChanges: [string, (entity: SourceEntity) => void][] = [
    [
      "effect deleted",
      (entity) => {
        block(entity).effects = []
      },
    ],
    [
      "effect renamed",
      (entity) => {
        block(entity).effects[0]!.id = "renamed"
      },
    ],
    [
      "block deleted",
      (entity) => {
        entity.refinementBuffs![4]!.effectBlocks = []
      },
    ],
    [
      "block renamed",
      (entity) => {
        block(entity).id = "renamed"
      },
    ],
    [
      "refinement moved",
      (entity) => {
        entity.refinementBuffs![3] = entity.refinementBuffs![4]!
        entity.refinementBuffs![4] = {}
      },
    ],
    [
      "cultivation domain moved",
      (entity) => {
        entity.fixedBuffs = entity.refinementBuffs![4]!
        entity.refinementBuffs![4] = {}
      },
    ],
  ]
  it.each(
    identityChanges.flatMap(([change, mutate]) =>
      (["raw", "normalized"] as const).map((representation) => ({
        change,
        mutate,
        representation,
      })),
    ),
  )(
    "rejects $representation $change instead of losing the correction",
    ({ change, mutate, representation }) => {
      const data = source()
      if (representation === "raw") mutate(data.wengines[0]!)
      expect(() =>
        convert(data, {
          ...functions,
          normalizeWengine: (entity) => {
            const normalized = normalize(entity)
            if (representation === "normalized") mutate(normalized)
            return normalized
          },
        }),
      ).toThrow(
        representation === "normalized" &&
          [
            "effect renamed",
            "refinement moved",
            "cultivation domain moved",
          ].includes(change)
          ? /Normalization generated unaccounted source effects/
          : /Source-stat correction/,
      )
    },
  )

  it("rejects equipper profession drift", () => {
    const data = source()
    data.wengines[0]!.profession = "强攻"
    expect(() => convert(data)).toThrow(/entity profession drift/)
  })

  it("preserves identities under entity, block and effect reorder without correcting another entity's local ID", () => {
    const data = source()
    const other = structuredClone(data.wengines[0]!)
    other.id = "Identity_Base"
    other.profession = "防护"
    data.wengines.push(other)
    const target = block(data.wengines[0]!)
    target.effects.push({
      id: "other",
      stat: "critRate",
      value: 1,
      kind: "fixed",
      scope: "general",
      applyTarget: "self",
    })
    data.wengines[0]!.refinementBuffs![4]!.effectBlocks!.push({
      id: "other-block",
      name: "other",
      effects: [],
    })
    const before = convert(data)
    data.wengines.reverse()
    for (const entity of data.wengines) {
      entity.refinementBuffs![4]!.effectBlocks!.reverse()
      for (const sourceBlock of entity.refinementBuffs![4]!.effectBlocks!)
        sourceBlock.effects.reverse()
    }
    const after = convert(data)
    expect(after.definitions.effects.map((rule) => rule.effectId)).toEqual(
      before.definitions.effects.map((rule) => rule.effectId),
    )
    expect(after.catalog.options.map((option) => option.optionId)).toEqual(
      before.catalog.options.map((option) => option.optionId),
    )
    const operations = (result: ReturnType<typeof convert>) =>
      result.definitions.effects.map((rule) =>
        rule.kind === "contribution"
          ? [
              rule.effectId,
              rule.operation,
              rule.parameters,
              rule.when,
              rule.config,
            ]
          : rule,
      )
    expect(operations(after)).toEqual(operations(before))
    const otherRule = after.definitions.effects.find(
      (rule) =>
        rule.effectId ===
        "w-engine:12013:zzz-hp:legacy-team-dmgBonus:blk-legacy:refinement:5",
    )
    expect(otherRule).toMatchObject({
      operation: { kind: "factor-contribution", channel: "damage-bonus" },
    })
    expect(
      after.coverage.records.find(
        (record) => record.catalogEntityId === "w-engines:Identity_Base",
      )?.status,
    ).toBe("converted")
  })
})

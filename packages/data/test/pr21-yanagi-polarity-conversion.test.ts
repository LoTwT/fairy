import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/yanagi-polarity-source.json" with { type: "json" }
import { yanagiPolarityMigrations } from "./fixtures/yanagi-polarity-consumer.ts"

const source = (): SourceData => ({
  agents: [
    structuredClone(fixture.raw) as SourceEntity,
    structuredClone(fixture.reorderCompanion.raw) as SourceEntity,
  ],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
})
const normalization: SourceNormalization = {
  normalizeAgent: (entity) => structuredClone(entity),
  normalizeWengine: (entity) => structuredClone(entity),
  normalizeDriveDisc: (entity) => structuredClone(entity),
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}
const yanagi = (data: SourceData) =>
  data.agents.find((entity) => entity.id === "yanagi")!
const block = (data: SourceData, rank: number) =>
  yanagi(data).mindscapeBuffs![rank]!.effectBlocks![0]!
type Migration = (typeof yanagiPolarityMigrations)[number]
const record = (data: SourceData, migration: Migration) =>
  block(data, migration.rank).effects.find(
    (effect) => effect.id === migration.sourceEffectId,
  )!
const convert = (data = source(), functions = normalization) =>
  convertSource(data, functions, [], [])

describe("Yanagi real-source polarity isolation", () => {
  it("preserves real raw/normalized records, notes and the M6 coexisting bonus", () => {
    expect(fixture.raw).toEqual(fixture.normalized)
    expect(fixture.reorderCompanion.raw).toEqual(
      fixture.reorderCompanion.normalized,
    )
    expect(fixture.nanoka.zh.talent["2"].desc).toContain("20%")
    expect(fixture.nanoka.en.talent["6"].desc).toContain("increases to 4")
    const result = convert()
    const options = result.catalog.options.filter(
      (option) => option.catalogEntityId === "agents:yanagi",
    )
    expect(options).toHaveLength(11)
    expect(
      result.definitions.effects.filter(
        (effect) => effect.source.identity.entityId === "1221",
      ),
    ).toHaveLength(8)
    for (const migration of yanagiPolarityMigrations) {
      const optionId = `agents:yanagi:mindscape:${migration.rank}:${migration.blockId}:${migration.sourceEffectId}`
      const option = options.find((entry) => entry.optionId === optionId)!
      expect(option.variants).toHaveLength(1)
      expect(option.variants[0]).toMatchObject({
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
        configuration: { minimumMindscape: migration.rank },
      })
      expect(option.variants[0]!.references).toHaveLength(3)
      expect(
        result.coverage.records.find((entry) => entry.optionId === optionId),
      ).toMatchObject({
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
      })
      expect(
        result.definitions.effects.some((entry) =>
          entry.effectId.includes(migration.sourceEffectId),
        ),
      ).toBe(false)
    }
    const sibling = result.definitions.effects.find(
      (entry) =>
        entry.effectId ===
        "agent:1221:zzz-hp:eff-ms4qn0z7-u05br2:blk-ms4qn0z7-6fc8g6:mindscape:6",
    )!
    expect(sibling).toMatchObject({
      parameters: { amount: { value: 0.2 } },
      operation: { kind: "factor-contribution", channel: "damage-bonus" },
    })
  })

  const drifts: ReadonlyArray<
    readonly [string, (data: SourceData, migration: Migration) => void]
  > = [
    [
      "entity identity",
      (data) => {
        yanagi(data).id = "ellen"
      },
    ],
    [
      "record deletion",
      (data, migration) => {
        block(data, migration.rank).effects = block(
          data,
          migration.rank,
        ).effects.filter((effect) => effect.id !== migration.sourceEffectId)
      },
    ],
    [
      "record identity",
      (data, migration) => {
        record(data, migration).id += "-changed"
      },
    ],
    [
      "block identity",
      (data, migration) => {
        block(data, migration.rank).id += "-changed"
      },
    ],
    [
      "rank relocation",
      (data, migration) => {
        const entity = yanagi(data)
        ;[entity.mindscapeBuffs![migration.rank], entity.mindscapeBuffs![3]] = [
          entity.mindscapeBuffs![3]!,
          entity.mindscapeBuffs![migration.rank]!,
        ]
      },
    ],
    [
      "block relocation",
      (data, migration) => {
        const original = block(data, migration.rank)
        const effect = record(data, migration)
        original.effects = original.effects.filter(
          (entry) => entry.id !== effect.id,
        )
        yanagi(data).mindscapeBuffs![migration.rank]!.effectBlocks!.push({
          ...original,
          id: "moved",
          effects: [effect],
        })
      },
    ],
    [
      "note appended",
      (data, migration) => {
        block(data, migration.rank).note += "新增条款"
      },
    ],
    [
      "note deletion",
      (data, migration) => {
        delete block(data, migration.rank).note
      },
    ],
    [
      "unknown field",
      (data, migration) => {
        Object.assign(record(data, migration), { newExecutionField: true })
      },
    ],
    [
      "unknown undefined field",
      (data, migration) => {
        Object.assign(record(data, migration), { newExecutionField: undefined })
      },
    ],
    [
      "additional unknown record",
      (data, migration) => {
        block(data, migration.rank).effects.push({
          ...record(data, migration),
          id: "new-polarity",
          stat: "unreviewedPolarity",
        })
      },
    ],
    [
      "additional conflict in another rank",
      (data, migration) => {
        yanagi(data).mindscapeBuffs![3] = {
          effectBlocks: [
            {
              ...block(data, migration.rank),
              id: "new-polarity-block",
              effects: [{ ...record(data, migration), id: "new-polarity" }],
            },
          ],
        }
      },
    ],
    ...Object.entries({
      origin: "changed",
      scope: "general",
      applyTarget: "team",
      applySituation: "stagger",
      applyProfession: "击破",
      teamProfession: "强攻",
      teamProfessionValues: [1, 2, 3],
      teamProfessionMinCount: 2,
      skillCategory: "ultimate",
      skillSubcategoryId: "changed",
      skillTargets: [{ category: "ultimate", subcategoryId: null }],
      elementFilter: ["火"],
      kind: "convert",
      stat: "unknownStat",
      value: 9,
      stackable: true,
      maxStacks: 4,
      valuePerStack: 99,
      defaultStacks: 0,
      convert: { from: "atk", ratioPercent: 100 },
      appliesToAnomaly: false,
      enabledDefault: false,
      note: "changed",
    }).map(
      ([field, value]) =>
        [
          field,
          (data: SourceData, migration: Migration) => {
            Object.assign(record(data, migration), { [field]: value })
          },
        ] as const,
    ),
  ]
  const driftCases = yanagiPolarityMigrations.flatMap((migration) =>
    ["raw", "normalized"].flatMap((stage) =>
      drifts.map(([name, mutate]) => ({
        identity: migration.sourceEffectId,
        stage,
        name,
        migration,
        mutate,
      })),
    ),
  )
  it.each(driftCases)(
    "rejects $stage $name drift for $identity before unsupported fallback",
    ({ stage, migration, mutate }) => {
      const data = source()
      if (stage === "raw") mutate(data, migration)
      const functions: SourceNormalization = {
        ...normalization,
        normalizeAgent: (entity) => {
          const copy = structuredClone(entity)
          if (stage === "normalized" && copy.id === "yanagi")
            mutate({ ...data, agents: [copy] }, migration)
          return copy
        },
      }
      expect(() => convert(data, functions)).toThrow(
        /Polarity|polarity|unaccounted source effects|Duplicate source effect/,
      )
    },
  )

  const duplicateCases = yanagiPolarityMigrations.flatMap((migration) =>
    ["identical", "execution conflict", "other block and note"].flatMap(
      (duplicateKind) =>
        ["before", "after"].map((order) => ({
          identity: migration.sourceEffectId,
          migration,
          duplicateKind,
          order,
        })),
    ),
  )
  it.each(duplicateCases)(
    "rejects normalized $duplicateKind duplicate $order original for $identity",
    ({ migration, duplicateKind, order }) => {
      const data = source()
      const functions: SourceNormalization = {
        ...normalization,
        normalizeAgent: (entity) => {
          const copy = structuredClone(entity)
          if (copy.id !== "yanagi") return copy
          const pack = copy.mindscapeBuffs![migration.rank]!
          const original = pack.effectBlocks!.find(
            (entry) => entry.id === migration.blockId,
          )!
          const duplicate = structuredClone(
            original.effects.find(
              (entry) => entry.id === migration.sourceEffectId,
            )!,
          )
          if (duplicateKind === "execution conflict") {
            if (duplicate.kind === "stacked") duplicate.valuePerStack = 999
            else duplicate.value = 999
          }
          if (duplicateKind === "other block and note") {
            const moved = {
              ...original,
              id: "duplicate-polarity-block",
              note: "不同条款的重复记录",
              effects: [duplicate],
            }
            if (order === "before") pack.effectBlocks!.unshift(moved)
            else pack.effectBlocks!.push(moved)
          } else if (order === "before") original.effects.unshift(duplicate)
          else original.effects.push(duplicate)
          return copy
        },
      }
      expect(() => convert(data, functions)).toThrow(migration.sourceEffectId)
    },
  )

  it.each(
    yanagiPolarityMigrations.flatMap((migration) =>
      ["before", "after"].map((order) => ({ ...migration, order })),
    ),
  )(
    "retains raw duplicate rejection $order original for $sourceEffectId",
    (migration) => {
      const data = source()
      const original = block(data, migration.rank)
      const duplicate = structuredClone(record(data, migration))
      if (migration.order === "before") original.effects.unshift(duplicate)
      else original.effects.push(duplicate)
      expect(() => convert(data)).toThrow(
        new RegExp(`Duplicate source effect.*${migration.sourceEffectId}`),
      )
    },
  )

  it("accepts the normalized real-source blocks with their derived flat mirror", () => {
    const functions: SourceNormalization = {
      ...normalization,
      normalizeAgent: (entity) => {
        const copy = structuredClone(
          entity.id === "yanagi"
            ? fixture.normalized
            : fixture.reorderCompanion.normalized,
        ) as SourceEntity
        for (const pack of copy.mindscapeBuffs ?? [])
          if (pack.effectBlocks?.length)
            expect(pack.effects).toEqual(
              pack.effectBlocks.flatMap((entry) => entry.effects),
            )
        return copy
      },
    }
    expect(convert(source(), functions)).toEqual(convert())
  })

  it("allows an entity without Yanagi and preserves its real semantics", () => {
    const data = source()
    data.agents = data.agents.filter((entry) => entry.id !== "yanagi")
    const result = convert(data)
    expect(
      result.catalog.entities.map((entry) => entry.catalogEntityId),
    ).toEqual(["agents:anby"])
    expect(result.definitions.effects.length).toBeGreaterThan(0)
  })

  it("preserves the complete semantic tree on real entity/block/effect reordering", () => {
    const before = source()
    const after = source()
    after.agents.reverse()
    for (const entity of after.agents)
      for (const pack of entity.mindscapeBuffs ?? []) {
        pack.effectBlocks?.reverse()
        for (const block of pack.effectBlocks ?? []) block.effects.reverse()
        pack.effects?.reverse()
      }
    const canonical = (data: SourceData) => {
      const result = convert(data)
      // 只重写已知的数组位置 pointer；source、版本、实体、references 及数值全部保留。
      const stable = JSON.parse(
        JSON.stringify(result, (key, value) =>
          key === "pointer" &&
          typeof value === "string" &&
          /^\/(agents|wengines|driveDiscs)\/\d+(?:\/|$)/.test(value)
            ? "<source-array-position>"
            : value,
        ),
      ) as typeof result
      stable.coverage.records.sort((a, b) =>
        a.optionId.localeCompare(b.optionId),
      )
      stable.coverage.packs.sort(
        (a, b) =>
          a.catalogEntityId.localeCompare(b.catalogEntityId) ||
          a.rankKind.localeCompare(b.rankKind) ||
          a.rank - b.rank,
      )
      return {
        ...stable,
        catalog: {
          ...stable.catalog,
          differences: stable.catalog.differences.map((difference) => ({
            ...difference,
            references: [...difference.references].sort((a, b) =>
              a.pointer.localeCompare(b.pointer),
            ),
          })),
        },
      }
    }
    expect(canonical(after)).toEqual(canonical(before))
  })
})

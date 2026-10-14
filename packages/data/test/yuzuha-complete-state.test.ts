import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import type {
  SourceData,
  SourceEffect,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"

const completeOptionId = "agents:yuzuha:mindscape:0:tanuki-wish-complete-state"
// 小型固定源夹具：只保留本组八条，未从语义登记反向生成。
const baseNote =
  "队伍中存在[异常]角色或与自身阵营相同的角色时触发：\n若柚叶的异常掌控大于100点，每超过1点异常掌控会使拥有[狸之愿]效果的角色的属性异常积蓄效率提升0.2%，最多提升20%，还会使其所有属性异常伤害和[紊乱]伤害提升0.2%，最多提升20%，当柚叶的异常掌控达到200点时，上述增益效果达到最大值。"
const m1Note =
  "处于[甜蜜惊吓]状态下的敌人全属性伤害抗性降低10%；[额外能力]中属性异常伤害和[紊乱]伤害增益效果提升至原本的130%。"
function source(): SourceData {
  const entries: readonly (readonly [
    string,
    string,
    number,
    boolean,
    boolean,
  ])[][] = [
    [
      ["eff-ms38y9v7-2ded3l", "anomalyDmgBonus", 0, true, true],
      ["eff-ms3969fx-lmmkyw", "disorderDmgBonus", 0, true, false],
      ["eff-ms396xt1-3qbf2a", "anomalyDmgBonus", -20, false, true],
      ["eff-ms39auzc-mtr7ac", "disorderDmgBonus", -20, false, true],
    ],
    [
      ["eff-ms44bnmi-zp616x", "anomalyDmgBonus", 0, true, true],
      ["eff-ms44dh8h-xb20mu", "disorderDmgBonus", 0, true, true],
      ["eff-ms44eue1-n53aou", "anomalyDmgBonus", -6, false, true],
      ["eff-ms44fa80-f595zx", "disorderDmgBonus", -6, false, true],
    ],
  ]
  return {
    agents: [
      {
        id: "yuzuha",
        name: "柚叶",
        mindscapeBuffs: entries.map((rows, rank) => ({
          effectBlocks: [
            {
              id: rank === 0 ? "blk-ms38y9v7-07td4j" : "blk-legacy",
              name: rank === 0 ? "额外能力：人多乐趣大" : "影画1",
              note: rank === 0 ? baseNote : m1Note,
              effects: rows.map(([id, stat, value, conversion, applies]) => ({
                id,
                origin: "",
                scope: "general",
                applyTarget: "team",
                applySituation: "global",
                applyProfession: null,
                teamProfession: null,
                teamProfessionValues: null,
                teamProfessionMinCount: null,
                skillSubcategoryId: null,
                elementFilter: "all",
                kind: conversion ? "convert" : "fixed",
                stat,
                value,
                stackable: false,
                maxStacks: 1,
                valuePerStack: 0,
                defaultStacks: 1,
                enabledDefault: true,
                note: "",
                ...(applies ? { appliesToAnomaly: true } : {}),
                ...(conversion
                  ? {
                      convert: {
                        from: "anomalyControl",
                        panelSource: "manual",
                        ratioPercent: rank === 0 ? 20 : 6,
                        cap: rank === 0 ? 40 : 12,
                        defaultBase: 201,
                        initialBase: 0,
                      },
                    }
                  : {}),
              })),
            },
          ],
        })),
      },
    ],
    wengines: [],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
  }
}
const normalization: SourceNormalization = {
  normalizeAgent: (entity) => ({
    ...structuredClone(entity),
    mindscapeBuffs: Array.from({ length: 7 }, (_, i) =>
      structuredClone(entity.mindscapeBuffs?.[i] ?? {}),
    ),
  }),
  normalizeWengine: (entity) => entity,
  normalizeDriveDisc: (entity) => entity,
  collectEffectsFromPack: (pack) =>
    pack.effectBlocks?.flatMap((block) => block.effects) ?? pack.effects ?? [],
  applyAnomalyFlagsToPack: (pack) => pack,
}
const records = (data: SourceData) =>
  data.agents[0]!.mindscapeBuffs!.flatMap((pack) =>
    (pack.effectBlocks ?? []).flatMap((block) => block.effects),
  )
const convert = (data = source(), functions = normalization) =>
  convertSource(data, functions, [], [])

describe("Yuzuha complete state source guards", () => {
  it("creates two complete contributions and two configuration scales while retiring all eight partial rules", () => {
    const result = convert()
    expect(result.definitions.revision).toBe("36")
    expect(
      result.definitions.effects.filter((rule) => rule.kind === "contribution"),
    ).toHaveLength(2)
    expect(
      result.definitions.effects.filter((rule) => rule.kind === "modification"),
    ).toHaveLength(2)
    expect(
      result.catalog.options.find(
        (option) => option.optionId === completeOptionId,
      )?.variants[0],
    ).toMatchObject({
      status: "corrected",
      maximumLayers: 1,
      configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    })
    expect(result.coverage.summary).toMatchObject({
      rawEffects: 8,
      unsupported: 8,
    })
    for (const record of result.coverage.records) {
      expect(record).toMatchObject({
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
      })
      expect(record.explanation).toContain(completeOptionId)
    }
  })

  it("keeps identities stable after agent, block and effect reorder and ignores legal cross-entity local ID reuse", () => {
    const data = source()
    const other = structuredClone(data.agents[0]!)
    other.id = "anby"
    other.name = "安比"
    data.agents.push(other)
    const baseline = convert(data)
    data.agents.reverse()
    for (const agent of data.agents)
      for (const pack of agent.mindscapeBuffs!) {
        pack.effectBlocks!.push({
          id: "unrelated",
          name: "unrelated",
          effects: [],
        })
        pack.effectBlocks!.reverse()
        for (const block of pack.effectBlocks!) block.effects.reverse()
      }
    const reordered = convert(data)
    const stripReferences = (value: unknown): unknown =>
      JSON.parse(
        JSON.stringify(value, (key, item) =>
          key === "references"
            ? undefined
            : key === "explanation" && typeof item === "string"
              ? item.replace(/来源 .*。$/, "")
              : item,
        ),
      )
    expect(stripReferences(reordered.definitions)).toEqual(
      stripReferences(baseline.definitions),
    )
    expect(stripReferences(reordered.catalog.options)).toEqual(
      stripReferences(baseline.catalog.options),
    )
    expect(
      reordered.definitions.effects.some((rule) =>
        rule.effectId.startsWith("agent:1011:zzz-hp:eff-ms38y9v7-2ded3l:"),
      ),
    ).toBe(true)
  })

  it("rejects any missing record, including an empty registered group, and duplicate identities", () => {
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const data = source()
      data.agents[0]!.mindscapeBuffs![
        Math.floor(index / 4)
      ]!.effectBlocks![0]!.effects.splice(index % 4, 1)
      expect(() => convert(data)).toThrow(
        /Complete-state tanuki-wish.*source record/,
      )
    }
    const empty = source()
    empty.agents[0]!.mindscapeBuffs = []
    expect(() => convert(empty)).toThrow(
      /Complete-state tanuki-wish.*source record/,
    )
    const duplicate = source()
    const block = duplicate.agents[0]!.mindscapeBuffs![0]!.effectBlocks![0]!
    block.effects.push(structuredClone(block.effects[0]!))
    expect(() => convert(duplicate)).toThrow(/Duplicate|duplicate/)
  })

  it("rejects raw and normalized field drift before generic unsupported handling", () => {
    const changes: [string, (effect: SourceEffect) => void][] = [
      [
        "stat",
        (effect) => {
          effect.stat = "special"
        },
      ],
      [
        "scope",
        (effect) => {
          effect.scope = "skill"
        },
      ],
      [
        "target",
        (effect) => {
          effect.applyTarget = "self"
        },
      ],
      [
        "kind",
        (effect) => {
          effect.kind = "stacked"
        },
      ],
      [
        "value",
        (effect) => {
          effect.value += 1
        },
      ],
      [
        "stackable",
        (effect) => {
          effect.stackable = true
        },
      ],
      [
        "maxStacks",
        (effect) => {
          effect.maxStacks = 2
        },
      ],
      [
        "defaultStacks",
        (effect) => {
          effect.defaultStacks = 0
        },
      ],
      [
        "valuePerStack",
        (effect) => {
          effect.valuePerStack = 1
        },
      ],
      [
        "situation",
        (effect) => {
          effect.applySituation = "stagger"
        },
      ],
      [
        "profession",
        (effect) => {
          effect.applyProfession = "异常"
        },
      ],
      [
        "team",
        (effect) => {
          effect.teamProfession = "异常"
        },
      ],
      [
        "counts",
        (effect) => {
          effect.teamProfessionValues = [1]
        },
      ],
      [
        "count",
        (effect) => {
          effect.teamProfessionMinCount = 1
        },
      ],
      [
        "elements",
        (effect) => {
          effect.elementFilter = ["物理"]
        },
      ],
      [
        "anomaly",
        (effect) => {
          effect.appliesToAnomaly = false
        },
      ],
      [
        "skill",
        (effect) => {
          effect.skillCategory = "basic"
        },
      ],
      [
        "target IDs",
        (effect) => {
          effect.skillTargets = [{ category: "basic" }]
        },
      ],
      [
        "subcategory",
        (effect) => {
          effect.skillSubcategoryId = "basic"
        },
      ],
      [
        "note",
        (effect) => {
          effect.note = "changed"
        },
      ],
    ]
    for (const key of [
      "from",
      "panelSource",
      "ratioPercent",
      "cap",
      "initialBase",
      "defaultBase",
    ] as const)
      changes.push([
        key,
        (effect) => {
          if (effect.convert)
            Object.assign(effect.convert, {
              [key]: typeof effect.convert[key] === "number" ? 999 : "final",
            })
          else effect.convert = { from: "anomalyControl", ratioPercent: 20 }
        },
      ])
    for (let index = 0; index < 8; index++)
      for (const [name, mutate] of changes) {
        const raw = source()
        mutate(records(raw)[index]!)
        expect(() => convert(raw), `${index}/${name}/raw`).toThrow(
          /Complete-state tanuki-wish/,
        )
        const functions = {
          ...normalization,
          normalizeAgent: (entity: SourceData["agents"][number]) => {
            const normalized = normalization.normalizeAgent(entity)
            mutate(records({ ...source(), agents: [normalized] })[index]!)
            return normalized
          },
        }
        expect(
          () => convert(source(), functions),
          `${index}/${name}/normalized`,
        ).toThrow(/Complete-state tanuki-wish/)
      }
    expect(() =>
      convert(source(), {
        ...normalization,
        normalizeAgent: (entity) => ({
          ...entity,
          mindscapeBuffs: Array.from({ length: 7 }, () => ({})),
        }),
      }),
    ).toThrow(/Complete-state tanuki-wish.*normalized/)
  })

  it.each([
    "大于100点",
    "每超过1点",
    "0.2%",
    "20%",
    "200点",
    "拥有[狸之愿]",
    "队伍中存在",
    "130%",
  ])("rejects changed mechanism note clause %s", (clause) => {
    const data = source()
    for (const pack of data.agents[0]!.mindscapeBuffs!)
      for (const block of pack.effectBlocks!)
        block.note = block.note!.replaceAll(clause, "changed")
    expect(() => convert(data)).toThrow(
      /Complete-state tanuki-wish.*note drift/,
    )
    expect(() =>
      convert(source(), {
        ...normalization,
        normalizeAgent: (entity) => {
          const normalized = normalization.normalizeAgent(entity)
          for (const pack of normalized.mindscapeBuffs!)
            for (const block of pack.effectBlocks ?? [])
              block.note = block.note!.replaceAll(clause, "changed")
          return normalized
        },
      }),
    ).toThrow(/Complete-state tanuki-wish.*note drift/)
  })
})

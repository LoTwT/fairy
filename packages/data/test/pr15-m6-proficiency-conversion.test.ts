import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import { m6SourceData } from "./fixtures/m6-proficiency-source.ts"

const supplements = SUPPLEMENTS.filter((s) =>
  [
    "nanoka:agents:jane:m6-proficiency-damage",
    "nanoka:agents:alice:m6-proficiency-damage",
  ].includes(s.supplementId),
)
const normalize = (entity: SourceEntity): SourceEntity => ({
  ...structuredClone(entity),
  mindscapeBuffs: structuredClone(
    Array.from({ length: 7 }, (_, i) => entity.mindscapeBuffs?.[i] ?? {}),
  ),
  refinementBuffs: Array.from({ length: 5 }, () => ({})),
})
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: (p) =>
    p.effectBlocks?.flatMap((b) => b.effects).length
      ? p.effectBlocks.flatMap((b) => b.effects)
      : (p.effects ?? []),
  applyAnomalyFlagsToPack: (p) => p,
}
const convert = (
  data: SourceData = m6SourceData(),
  normalization = functions,
) => convertSource(data, normalization, [], supplements)
const pack = (data: SourceData, id = "jane") =>
  data.agents.find((a) => a.id === id)!.mindscapeBuffs![6]!
const future = (): SourceEffect => ({
  ...m6SourceData().agents[0]!.mindscapeBuffs![6]!.effects![0]!,
  id: "future-encoding",
  stat: "directDmgMult",
  value: 16,
})

// 只删除位置型 ZZZ-HP pointer；实体身份、section、引用成员及元数据均保留。
function withoutSourcePositions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSourcePositions)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, v]) =>
          !(
            key === "pointer" &&
            typeof v === "string" &&
            /^\/agents\/\d+(?:\/|$)/.test(v)
          ),
      )
      .map(([key, v]) => [key, withoutSourcePositions(v)]),
  )
}
const byId = (values: readonly unknown[], key: string) =>
  values
    .map(withoutSourcePositions)
    .sort((a, b) =>
      String((a as Record<string, unknown>)[key]).localeCompare(
        String((b as Record<string, unknown>)[key]),
      ),
    )

describe("PR15 fixed M6 contexts and supplement compilation", () => {
  it("keeps Jane's actual CR/CD block and Alice's actual empty pack, adding three rules and two options", () => {
    const result = convert()
    expect(result.definitions.revision).toBe("36")
    expect(result.definitions.effects).toHaveLength(5)
    expect(result.catalog.options).toHaveLength(4)
    for (const [id, value] of [
      ["critRate", 0.2],
      ["critDmg", 0.4],
    ] as const) {
      const rule = result.definitions.effects.find(
        (e) =>
          e.effectId ===
          `agent:1261:zzz-hp:legacy-self-${id}:blk-legacy:mindscape:6`,
      )!
      expect(rule).toMatchObject({
        kind: "contribution",
        scope: "entity",
        parameters: { amount: { value } },
      })
    }
    for (const [name, id, multiplier, ruleCount] of [
      ["jane", "1261", 16, 1],
      ["alice", "1401", 33, 2],
    ] as const) {
      const option = result.catalog.options.find(
        (o) => o.optionId === `nanoka:agents:${name}:m6-proficiency-damage`,
      )!
      expect(option.variants[0]).toMatchObject({
        configuration: { minimumMindscape: 6 },
        maximumLayers: 1,
        exclusiveDamageItem: true,
        damageItemRequirements: [
          {
            itemId: `${name}:m6-proficiency-damage`,
            stat: "anomalyProficiency",
            source: "holder-current",
            requiredDirectMultiplier: 0,
            requiredSkillCategory: "uncategorized",
          },
        ],
      })
      expect(
        option.variants[0]!.damageItemRequirements![0]!
          .requiredCriticalRateDeclaration,
      ).toBe(name === "jane" ? true : undefined)
      expect(
        result.definitions.effects.filter((e) =>
          e.effectId.startsWith(`agent:${id}:nanoka:m6-proficiency-damage`),
        ),
      ).toHaveLength(ruleCount)
      expect(
        result.definitions.effects.find(
          (e) =>
            e.effectId ===
            `agent:${id}:nanoka:m6-proficiency-damage:mindscape:6`,
        ),
      ).toMatchObject({
        parameters: { amount: { value: multiplier } },
        operation: {
          kind: "hit-adjustment",
          itemIds: [`${name}:m6-proficiency-damage`],
        },
      })
    }
  })

  const rawDrifts: readonly [string, (data: SourceData) => void][] = [
    [
      "anchor deletion",
      (d) => {
        pack(d).effectBlocks = []
      },
    ],
    [
      "anchor rename",
      (d) => {
        pack(d).effectBlocks![0]!.id = "moved"
      },
    ],
    [
      "anchor display name",
      (d) => {
        pack(d).effectBlocks![0]!.name += "changed"
      },
    ],
    [
      "anchor disabled",
      (d) => {
        pack(d).effectBlocks![0]!.enabledDefault = false
      },
    ],
    [
      "note appended",
      (d) => {
        pack(d).effectBlocks![0]!.note += "new clause"
      },
    ],
    [
      "note inserted",
      (d) => {
        pack(d).effectBlocks![0]!.note = "new" + pack(d).effectBlocks![0]!.note
      },
    ],
    [
      "note replaced",
      (d) => {
        pack(d).effectBlocks![0]!.note = "replacement"
      },
    ],
    [
      "record deleted",
      (d) => {
        pack(d).effectBlocks![0]!.effects.pop()
      },
    ],
    [
      "record renamed",
      (d) => {
        pack(d).effectBlocks![0]!.effects[0]!.id = "new-id"
      },
    ],
    [
      "record duplicated",
      (d) => {
        pack(d).effectBlocks![0]!.effects.push({ ...pack(d).effects![0]! })
      },
    ],
    [
      "record moved to rank 5",
      (d) => {
        d.agents[0]!.mindscapeBuffs![5] = {
          effects: [pack(d).effectBlocks![0]!.effects.pop()!],
        }
      },
    ],
    [
      "record moved to new block",
      (d) => {
        pack(d).effectBlocks!.push({
          id: "other",
          name: "other",
          effects: [pack(d).effectBlocks![0]!.effects.pop()!],
        })
      },
    ],
    [
      "new encoding in anchor",
      (d) => {
        pack(d).effectBlocks![0]!.effects.push(future())
      },
    ],
    [
      "unknown stat in new block",
      (d) => {
        pack(d).effectBlocks!.push({
          id: "new",
          name: "new",
          effects: [{ ...future(), stat: "unknownFutureStat" }],
        })
      },
    ],
    [
      "new flattened encoding",
      (d) => {
        pack(d).effects!.push(future())
      },
    ],
    [
      "flattened value drift",
      (d) => {
        pack(d).effects![0]!.value = 99
      },
    ],
    [
      "empty Alice gets note-only block",
      (d) => {
        pack(d, "alice").effectBlocks!.push({
          id: "future",
          name: "future",
          note: "new",
          effects: [],
        })
      },
    ],
    [
      "empty Alice gets machine record",
      (d) => {
        pack(d, "alice").effects!.push(future())
      },
    ],
  ]
  it.each(rawDrifts)("rejects raw %s", (_, change) => {
    const data = m6SourceData()
    change(data)
    expect(() => convert(data)).toThrow()
  })

  const fieldDrifts: readonly [string, unknown][] = [
    ["origin", "changed"],
    ["scope", "skill"],
    ["applyTarget", "team"],
    ["applySituation", "off-field"],
    ["applyProfession", "anomaly"],
    ["teamProfession", "support"],
    ["teamProfessionValues", [1]],
    ["teamProfessionMinCount", 2],
    ["skillCategory", "basic"],
    ["skillSubcategoryId", "new"],
    ["skillTargets", [{ category: "basic", subcategoryId: null }]],
    ["elementFilter", ["物理"]],
    ["kind", "stacked"],
    ["stat", "directDmgMult"],
    ["value", 99],
    ["stackable", true],
    ["maxStacks", 2],
    ["valuePerStack", 5],
    ["defaultStacks", 0],
    ["convert", { from: "mastery", ratioPercent: 100 }],
    ["appliesToAnomaly", true],
    ["enabledDefault", false],
    ["note", "changed"],
  ]
  describe.each(["raw", "normalized"] as const)(
    "%s record",
    (representation) => {
      it.each(fieldDrifts)("rejects %s drift", (field, value) => {
        const data = m6SourceData()
        const mutate = (entity: SourceEntity) => {
          if (entity.id === "jane")
            Object.assign(
              entity.mindscapeBuffs![6]!.effectBlocks![0]!.effects[0]!,
              { [field]: value },
            )
          return entity
        }
        if (representation === "raw") mutate(data.agents[0]!)
        const normalization =
          representation === "raw"
            ? functions
            : {
                ...functions,
                normalizeAgent: (e: SourceEntity) => mutate(normalize(e)),
              }
        expect(() => convert(data, normalization)).toThrow()
      })
    },
  )
  it.each([
    "disappears",
    "renamed",
    "duplicated",
    "moved",
    "note changed",
    "Alice note-only",
  ])("rejects normalized context: %s", (change) => {
    const normalization = {
      ...functions,
      normalizeAgent: (e: SourceEntity) => {
        const n = normalize(e),
          p = n.mindscapeBuffs![6]!
        if (n.id === "alice" && change === "Alice note-only")
          p.effectBlocks!.push({
            id: "new",
            name: "new",
            note: "new",
            effects: [],
          })
        if (n.id !== "jane") return n
        if (change === "disappears") {
          p.effectBlocks![0]!.effects = []
          p.effects = []
        }
        if (change === "renamed") p.effectBlocks![0]!.effects[0]!.id = "new"
        if (change === "duplicated")
          p.effectBlocks![0]!.effects.push({ ...p.effects![0]! })
        if (change === "moved") p.effectBlocks![0]!.id = "moved"
        if (change === "note changed") p.effectBlocks![0]!.note += "changed"
        return n
      },
    }
    expect(() => convert(m6SourceData(), normalization)).toThrow()
  })
  it("allows unrelated ranks and preserves complete identities under actual entity/block/record reordering", () => {
    const data = m6SourceData()
    for (const entity of data.agents)
      entity.mindscapeBuffs![1] = {
        effectBlocks: [
          {
            id: "independent-a",
            name: "独立 A",
            note: "其他 rank 的暴率",
            effects: [
              { ...future(), id: "other-cr", stat: "critRate", value: 10 },
            ],
          },
          {
            id: "independent-b",
            name: "独立 B",
            note: "其他 rank 的暴伤",
            effects: [
              { ...future(), id: "other-cd", stat: "critDmg", value: 30 },
            ],
          },
        ],
      }
    const first = convert(data)
    const shuffled = structuredClone(data)
    shuffled.agents.reverse()
    for (const entity of shuffled.agents)
      for (const p of entity.mindscapeBuffs!) {
        p.effectBlocks?.reverse()
        p.effects?.reverse()
        for (const b of p.effectBlocks ?? []) b.effects.reverse()
      }
    expect(shuffled.agents.map((a) => a.id)).not.toEqual(
      data.agents.map((a) => a.id),
    )
    expect(
      pack(shuffled).effectBlocks![0]!.effects.map((e) => e.id),
    ).not.toEqual(pack(data).effectBlocks![0]!.effects.map((e) => e.id))
    expect(
      shuffled.agents[0]!.mindscapeBuffs![1]!.effectBlocks!.map((b) => b.id),
    ).not.toEqual(
      data.agents[1]!.mindscapeBuffs![1]!.effectBlocks!.map((b) => b.id),
    )
    const second = convert(shuffled)
    expect(byId(second.definitions.effects, "effectId")).toEqual(
      byId(first.definitions.effects, "effectId"),
    )
    expect(byId(second.catalog.options, "optionId")).toEqual(
      byId(first.catalog.options, "optionId"),
    )
    expect(byId(second.catalog.entities, "catalogEntityId")).toEqual(
      byId(first.catalog.entities, "catalogEntityId"),
    )
    expect(byId(second.catalog.skillTargets, "targetId")).toEqual(
      byId(first.catalog.skillTargets, "targetId"),
    )
    expect(byId(second.coverage.records, "optionId")).toEqual(
      byId(first.coverage.records, "optionId"),
    )
  })
})

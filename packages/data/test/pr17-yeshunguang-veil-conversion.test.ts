import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"
import fixedSource from "./fixtures/yeshunguang-veil-source.json" with { type: "json" }

// 独立摘录 fac62407 的真实完整七档 pack，不以待测补充登记构造夹具。
const source = () => structuredClone(fixedSource) as SourceData
const supplements = SUPPLEMENTS.filter(
  (s) => s.supplementId === "nanoka:agents:yeshunguang:veil-vulnerability",
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
const convert = (data = source(), normalization = functions) =>
  convertSource(data, normalization, [], supplements)
const veil = (data: SourceData) =>
  data.agents.find((e) => e.id === "yeshunguang")!
const future = (stat = "staggerVulnerable"): SourceEffect => ({
  id: "new-veil-encoding",
  scope: "general",
  applyTarget: "self",
  elementFilter: "all",
  kind: "fixed",
  stat,
  value: 110,
})
const drifts: readonly [string, (pack: SourcePack) => void][] = [
  [
    "anchor deletion",
    (p) => {
      p.effectBlocks = []
    },
  ],
  [
    "anchor identity",
    (p) => {
      p.effectBlocks![0]!.id = "renamed"
    },
  ],
  [
    "anchor display name",
    (p) => {
      p.effectBlocks![0]!.name += "changed"
    },
  ],
  [
    "anchor disabled",
    (p) => {
      p.effectBlocks![0]!.enabledDefault = false
    },
  ],
  [
    "anchor duplicate",
    (p) => {
      p.effectBlocks!.push(structuredClone(p.effectBlocks![0]!))
    },
  ],
  [
    "note append",
    (p) => {
      p.effectBlocks![0]!.note += "帷幕数值改为300%。"
    },
  ],
  [
    "note prepend",
    (p) => {
      p.effectBlocks![0]!.note = "变更；" + p.effectBlocks![0]!.note
    },
  ],
  [
    "note replacement",
    (p) => {
      p.effectBlocks![0]!.note = "new"
    },
  ],
  [
    "conflicting encoding",
    (p) => {
      p.effectBlocks![0]!.effects.push(future())
    },
  ],
  [
    "unknown encoding before unsupported",
    (p) => {
      p.effectBlocks![0]!.effects.push(future("futureUnknownVeil"))
    },
  ],
  [
    "flat-only encoding",
    (p) => {
      p.effects!.push(future())
    },
  ],
  [
    "new note-only block",
    (p) => {
      p.effectBlocks!.push({
        id: "new",
        name: "new",
        note: "新帷幕",
        effects: [],
      })
    },
  ],
]
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

describe("Ye Shunguang veil fixed source guards", () => {
  it("adds exactly one rule and option while preserving every existing identity and the real M4 note-only block", () => {
    expect(supplements).toHaveLength(1)
    const before = convertSource(source(), functions, [], [])
    const after = convert()
    expect(after.definitions.revision).toBe("36")
    expect(after.definitions.effects).toHaveLength(
      before.definitions.effects.length + 1,
    )
    expect(after.catalog.options).toHaveLength(
      before.catalog.options.length + 1,
    )
    for (const old of before.definitions.effects)
      expect(
        after.definitions.effects.find((r) => r.effectId === old.effectId),
      ).toEqual(old)
    for (const old of before.catalog.options)
      expect(
        after.catalog.options.find((o) => o.optionId === old.optionId),
      ).toEqual(old)
    expect(after.catalog.entities).toEqual(before.catalog.entities)
    expect(after.catalog.skillTargets).toEqual(before.catalog.skillTargets)
    expect(after.coverage.records).toEqual(before.coverage.records)
    const m4 = veil(source()).mindscapeBuffs![4]!
    expect(m4.effectBlocks).toHaveLength(1)
    expect(m4.effectBlocks![0]).toMatchObject({
      id: "blk-ms33yyc3-xr2q7r",
      name: "影画4",
      effects: [],
    })
    expect(m4.effectBlocks![0]!.note).toContain("180秒")
  })
  describe.each([0, 4])("rank %i", (rank) => {
    describe.each(["raw", "normalized"] as const)(
      "%s context",
      (representation) => {
        it.each(drifts)("rejects %s", (_, change) => {
          const data = source()
          const mutate = (entity: SourceEntity) => {
            if (entity.id === "yeshunguang")
              change(entity.mindscapeBuffs![rank]!)
            return entity
          }
          if (representation === "raw") mutate(veil(data))
          const normalization =
            representation === "raw"
              ? functions
              : {
                  ...functions,
                  normalizeAgent: (e: SourceEntity) => mutate(normalize(e)),
                }
          expect(() => convert(data, normalization)).toThrow(
            /veil-vulnerability|Duplicate|Normalization generated unaccounted source effects/,
          )
        })
      },
    )
    it("rejects moving the complete rank to another position", () => {
      const data = source(),
        agent = veil(data)
      agent.mindscapeBuffs![3] = agent.mindscapeBuffs![rank]!
      agent.mindscapeBuffs![rank] = {}
      expect(() => convert(data)).toThrow()
    })
  })
  const fieldDrifts: readonly [string, unknown][] = [
    ["id", "new"],
    ["origin", "new"],
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
    ["stat", "staggerVulnerable"],
    ["value", 99],
    ["stackable", true],
    ["maxStacks", 2],
    ["valuePerStack", 5],
    ["defaultStacks", 0],
    ["convert", { from: "mastery", ratioPercent: 100 }],
    ["appliesToAnomaly", true],
    ["enabledDefault", false],
    ["note", "new"],
  ]
  describe.each(["raw", "normalized"] as const)(
    "%s Unity coexistence",
    (representation) => {
      it.each(fieldDrifts)("rejects changed %s", (field, value) => {
        const data = source()
        const mutate = (entity: SourceEntity) => {
          if (entity.id === "yeshunguang")
            Object.assign(
              entity.mindscapeBuffs![0]!.effectBlocks![0]!.effects[0]!,
              { [field]: value },
            )
          return entity
        }
        if (representation === "raw") mutate(veil(data))
        expect(() =>
          convert(
            data,
            representation === "raw"
              ? functions
              : { ...functions, normalizeAgent: (e) => mutate(normalize(e)) },
          ),
        ).toThrow()
      })
      it.each(["deleted", "duplicated", "moved", "flattened drift"])(
        "rejects record %s",
        (change) => {
          const data = source()
          const mutate = (entity: SourceEntity) => {
            if (entity.id !== "yeshunguang") return entity
            const p = entity.mindscapeBuffs![0]!
            if (change === "deleted") p.effectBlocks![0]!.effects.pop()
            if (change === "duplicated")
              p.effectBlocks![0]!.effects.push(structuredClone(p.effects![0]!))
            if (change === "moved")
              entity.mindscapeBuffs![3]!.effects!.push(
                p.effectBlocks![0]!.effects.pop()!,
              )
            if (change === "flattened drift") p.effects![0]!.value = 99
            return entity
          }
          if (representation === "raw") mutate(veil(data))
          expect(() =>
            convert(
              data,
              representation === "raw"
                ? functions
                : { ...functions, normalizeAgent: (e) => mutate(normalize(e)) },
            ),
          ).toThrow()
        },
      )
    },
  )
  it("allows independent ranks and absent entities, and compares full identities after actual reordering", () => {
    const data = source()
    veil(data).mindscapeBuffs![3] = {
      effectBlocks: [
        {
          id: "independent-a",
          name: "A",
          note: "independent",
          effects: [
            { ...future(), id: "other-cr", stat: "critRate", value: 10 },
          ],
        },
        {
          id: "independent-b",
          name: "B",
          note: "independent",
          effects: [
            { ...future(), id: "other-cd", stat: "critDmg", value: 20 },
          ],
        },
      ],
    }
    const first = convert(data),
      shuffled = structuredClone(data)
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
      veil(shuffled).mindscapeBuffs![0]!.effects!.map((e) => e.id),
    ).not.toEqual(veil(data).mindscapeBuffs![0]!.effects!.map((e) => e.id))
    expect(
      veil(shuffled).mindscapeBuffs![3]!.effectBlocks!.map((b) => b.id),
    ).not.toEqual(veil(data).mindscapeBuffs![3]!.effectBlocks!.map((b) => b.id))
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
    const absent = source()
    absent.agents = absent.agents.filter((e) => e.id !== "yeshunguang")
    // 注册仍存在但实体丢失是既有 fail-closed 边界；一起移除该实体与其声明时，其他来源不受影响。
    expect(() => convert(absent)).toThrow(
      "Unknown supplement catalog entity: agents:yeshunguang",
    )
    const remaining = convertSource(absent, functions, [], [])
    expect(
      remaining.catalog.entities.some(
        (e) => e.catalogEntityId === "agents:yeshunguang",
      ),
    ).toBe(false)
    expect(
      remaining.catalog.entities.some(
        (e) => e.catalogEntityId === "agents:anby",
      ),
    ).toBe(true)
  })
})

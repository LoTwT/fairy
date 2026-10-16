import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixedSource from "./fixtures/grace-grenade-source.json" with { type: "json" }

// Independent exact fac62407 /agents/29 packs, plus the referenced skill targets.
// The fixture is extracted from the pinned raw source, never from SUPPLEMENTS.
const source = () => structuredClone(fixedSource) as SourceData
const supplements = SUPPLEMENTS.filter((s) =>
  s.supplementId.startsWith("nanoka:agents:grace:m6-"),
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
const grace = (data: SourceData) => data.agents.find((e) => e.id === "grace")!
const future = (stat = "directDmgMult"): SourceEffect => ({
  id: "future-m6-encoding",
  scope: "general",
  applyTarget: "self",
  elementFilter: "all",
  kind: "fixed",
  stat,
  value: 200,
})
const mutations: readonly [string, (e: SourceEntity) => void][] = [
  [
    "anchor deleted",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks = []
    },
  ],
  [
    "anchor renamed",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.id = "renamed"
    },
  ],
  [
    "anchor moved",
    (e) => {
      e.mindscapeBuffs![5] = e.mindscapeBuffs![6]!
      e.mindscapeBuffs![6] = {}
    },
  ],
  [
    "anchor duplicated",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks!.push(
        structuredClone(e.mindscapeBuffs![6]!.effectBlocks![0]!),
      )
    },
  ],
  [
    "name changed",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.name = "renamed"
    },
  ],
  [
    "disabled",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.enabledDefault = false
    },
  ],
  [
    "note appended",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.note += "每颗改为300%。"
    },
  ],
  [
    "note inserted",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.note =
        "新增条款" + e.mindscapeBuffs![6]!.effectBlocks![0]!.note
    },
  ],
  [
    "note replaced",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.note = "changed"
    },
  ],
  [
    "note missing",
    (e) => {
      delete e.mindscapeBuffs![6]!.effectBlocks![0]!.note
    },
  ],
  [
    "anchor gains encoding",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.effects.push(future())
    },
  ],
  [
    "flattened encoding",
    (e) => {
      e.mindscapeBuffs![6]!.effects!.push(future())
    },
  ],
  [
    "unknown stat",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks![0]!.effects.push(
        future("unknownFutureStat"),
      )
    },
  ],
  [
    "new conflicting block",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks!.push({
        id: "new",
        name: "new",
        effects: [future()],
      })
    },
  ],
  [
    "new note-only block",
    (e) => {
      e.mindscapeBuffs![6]!.effectBlocks!.push({
        id: "new",
        name: "new",
        note: "new",
        effects: [],
      })
    },
  ],
]

// Remove only unstable source array positions; keep identities, sections and every member.
function withoutPositions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPositions)
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
      .map(([key, v]) => [key, withoutPositions(v)]),
  )
}
const byId = (values: readonly unknown[], key: string) =>
  values
    .map(withoutPositions)
    .sort((a, b) =>
      String((a as Record<string, unknown>)[key]).localeCompare(
        String((b as Record<string, unknown>)[key]),
      ),
    )

describe("Grace M6 frozen note-only clause and precise scale compilation", () => {
  it("compiles two exact existing-item scales while preserving all earlier Grace clauses", () => {
    expect(supplements).toHaveLength(2)
    const result = convert()
    const before = convertSource(source(), functions, [], [])
    expect(result.definitions.revision).toBe("42")
    for (const rule of before.definitions.effects)
      expect(
        result.definitions.effects.find((e) => e.effectId === rule.effectId),
      ).toEqual(rule)
    for (const option of before.catalog.options)
      expect(
        result.catalog.options.find((o) => o.optionId === option.optionId),
      ).toEqual(option)
    expect(result.coverage.records).toEqual(before.coverage.records)
    expect(
      result.definitions.effects.length - before.definitions.effects.length,
    ).toBe(2)
    for (const [suffix, action, amount] of [
      ["special", "0012", 4],
      ["ex-special", "0013", 3],
    ] as const) {
      expect(
        result.definitions.effects.find(
          (e) =>
            e.effectId ===
            `agent:1181:nanoka:m6-${suffix}-grenades:mindscape:6`,
        ),
      ).toMatchObject({
        parameters: { amount: { value: amount } },
        operation: {
          kind: "hit-adjustment",
          operator: "scale",
          itemIds: [`action:agent:1181:action:${action}:base`],
        },
      })
      const requirement = result.catalog.options.find(
        (o) => o.optionId === `nanoka:agents:grace:m6-${suffix}-grenades`,
      )!.variants[0]!.damageItemRequirements![0]!
      expect(requirement).toEqual({
        itemId: `action:agent:1181:action:${action}:base`,
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
      })
    }
  })

  describe.each(["raw", "normalized"] as const)(
    "%s source guards",
    (representation) => {
      it.each(mutations)(
        "rejects %s before unsupported fallback",
        (name, change) => {
          const data = source()
          if (representation === "raw") change(grace(data))
          const normalization =
            representation === "raw"
              ? functions
              : {
                  ...functions,
                  normalizeAgent: (e: SourceEntity) => {
                    const result = normalize(e)
                    if (e.id === "grace") change(result)
                    return result
                  },
                }
          const expected =
            representation === "normalized" &&
            [
              "anchor gains encoding",
              "flattened encoding",
              "unknown stat",
              "new conflicting block",
            ].includes(name)
              ? "Normalization generated unaccounted source effects at /agents/0/mindscapeBuffs/6"
              : representation === "raw" && name === "unknown stat"
                ? "Supplement nanoka:agents:grace:m6-special-grenades coexisting clause drift"
                : /anchor|clause|re-review/
          expect(() => convert(data, normalization)).toThrow(expected)
        },
      )
    },
  )

  it("allows independent rank clauses with the same stat family", () => {
    const data = source()
    grace(data).mindscapeBuffs![4] = {
      effectBlocks: [
        {
          id: "independent-rank4",
          name: "独立条款",
          note: "独立倍率",
          effects: [future()],
        },
      ],
    }
    const result = convert(data)
    const record = result.coverage.records.find(
      (r) => r.rank === 4 && r.catalogEntityId === "agents:grace",
    )
    expect(record).toMatchObject({ stat: "directDmgMult", status: "converted" })
    expect(record!.effectIds).toHaveLength(1)
    expect(
      result.catalog.options.some((o) =>
        o.optionId.includes("m6-special-grenades"),
      ),
    ).toBe(true)
  })

  it("preserves full rules/options/source/entities under a real source reorder", () => {
    const original = source()
    const reordered = source()
    reordered.agents.reverse()
    const pack = grace(reordered).mindscapeBuffs![0]!
    pack.effectBlocks!.reverse()
    pack.effects!.reverse()
    for (const block of pack.effectBlocks!) block.effects.reverse()
    expect(reordered.agents.map((e) => e.id)).not.toEqual(
      original.agents.map((e) => e.id),
    )
    expect(pack.effectBlocks!.map((b) => b.id)).not.toEqual(
      grace(original).mindscapeBuffs![0]!.effectBlocks!.map((b) => b.id),
    )
    const before = convert(original),
      after = convert(reordered)
    expect(byId(after.definitions.effects, "effectId")).toEqual(
      byId(before.definitions.effects, "effectId"),
    )
    expect(byId(after.catalog.options, "optionId")).toEqual(
      byId(before.catalog.options, "optionId"),
    )
    expect(byId(after.catalog.entities, "catalogEntityId")).toEqual(
      byId(before.catalog.entities, "catalogEntityId"),
    )
    expect(after.catalog.source).toEqual(before.catalog.source)
    expect(after.catalog.skillTargets).toEqual(before.catalog.skillTargets)
    expect(after.coverage.supplementalRecords).toEqual(
      before.coverage.supplementalRecords,
    )
  })
})

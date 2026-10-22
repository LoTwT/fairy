import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/astrayao-m4-source.json" with { type: "json" }

const optionId = "nanoka:agents:astrayao:m4-quick-assist-bonus-damage"
const registrations = () => {
  const rows = SUPPLEMENTS.filter((s) => s.supplementId === optionId)
  expect(rows).toHaveLength(1)
  return rows
}
const data = (): SourceData => ({
  agents: [structuredClone(fixture.raw) as unknown as SourceEntity],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
})
const normalization: SourceNormalization = {
  normalizeAgent: (agent) => {
    const value = structuredClone(agent)
    // rank1 的真实固定归一化与 raw 不同；使用独立原件保存的该位置输出。
    if (value.id === "astrayao" && value.mindscapeBuffs)
      value.mindscapeBuffs[1] = structuredClone(
        fixture.normalized.mindscapeBuffs[1],
      ) as SourceEntity["mindscapeBuffs"] extends (infer T)[] | undefined
        ? T
        : never
    return value
  },
  normalizeWengine: (a) => structuredClone(a),
  normalizeDriveDisc: (a) => structuredClone(a),
  collectEffectsFromPack: (p) =>
    p?.effectBlocks?.flatMap((b) => b.effects) ?? p?.effects ?? [],
  applyAnomalyFlagsToPack: (p) => p,
}
const convert = (d = data(), f = normalization) =>
  convertSource(d, f, [], registrations())
const pack = (d: SourceData) =>
  d.agents.find((a) => a.id === "astrayao")!.mindscapeBuffs![4]!
const actor = (d: SourceData) => d.agents.find((a) => a.id === "astrayao")!

describe("Astra Yao M4 real existing empty cultivation context", () => {
  it("locks independently copied raw, normalized and bilingual evidence", () => {
    expect(fixture.raw.mindscapeBuffs[4]).toEqual(
      fixture.normalized.mindscapeBuffs[4],
    )
    expect(fixture.raw.mindscapeBuffs[4]!.effectBlocks).toEqual([])
    expect(Object.keys(fixture.raw.mindscapeBuffs[4]!.selfMods)).toHaveLength(
      67,
    )
    expect(fixture.raw.mindscapeNotes[4]).toBe("")
    expect(fixture.nanoka.zh.desc).toContain("等同于耀嘉音300%攻击力")
    expect(fixture.nanoka.en.desc).toContain("300% of Astra Yao's ATK")
    const result = convert()
    expect(result.catalog.options.some((o) => o.optionId === optionId)).toBe(
      true,
    )
    expect(
      result.catalog.mechanisms!.filter(
        (m) => m.mechanism === "astra-yao-m4-quick-assist-damage",
      ),
    ).toHaveLength(1)
    expect(result.coverage.records.length).toBeGreaterThan(0)
    for (const rank of [0, 1, 2, 6])
      expect(
        actor(data()).mindscapeBuffs![rank]!.effectBlocks!.length,
      ).toBeGreaterThan(0)
  })
  const drifts: readonly [string, (d: SourceData) => void][] = [
    [
      "missing slot",
      (d) => {
        delete actor(d).mindscapeBuffs![4]
      },
    ],
    [
      "empty object",
      (d) => {
        actor(d).mindscapeBuffs![4] = {}
      },
    ],
    [
      "missing self mods",
      (d) => {
        delete pack(d).selfMods
      },
    ],
    [
      "missing team mods",
      (d) => {
        delete pack(d).teamMods
      },
    ],
    [
      "nonzero self mod",
      (d) => {
        pack(d).selfMods!.atk = 1
      },
    ],
    [
      "nonzero team mod",
      (d) => {
        pack(d).teamMods!.critRate = 1
      },
    ],
    [
      "deleted zero key",
      (d) => {
        delete pack(d).selfMods!.atk
      },
    ],
    [
      "missing effects",
      (d) => {
        delete pack(d).effects
      },
    ],
    [
      "missing blocks",
      (d) => {
        delete pack(d).effectBlocks
      },
    ],
    [
      "added block",
      (d) => {
        pack(d).effectBlocks!.push({
          id: "new-m4",
          name: "new",
          note: "new",
          effects: [],
        })
      },
    ],
    [
      "added record",
      (d) => {
        pack(d).effects!.push({
          id: "new-m4",
          scope: "team",
          applyTarget: "team",
          kind: "fixed",
          stat: "newIndependentDamage",
          value: 300,
        })
      },
    ],
    [
      "changed note",
      (d) => {
        actor(d).mindscapeNotes![4] = "new M4 clause"
      },
    ],
    [
      "missing note",
      (d) => {
        delete actor(d).mindscapeNotes![4]
      },
    ],
  ]
  it.each(drifts)("raw %s refuses regeneration", (_name, mutate) => {
    const d = data()
    mutate(d)
    expect(() => convert(d)).toThrow(/Supplement|unaccounted/i)
  })
  it.each(drifts)(
    "normalized %s cannot hide behind raw emptiness",
    (_name, mutate) => {
      const f = {
        ...normalization,
        normalizeAgent: (a: SourceEntity) => {
          const normalized = normalization.normalizeAgent(a)
          if (a.id === "astrayao") {
            const d = { ...data(), agents: [normalized] }
            mutate(d)
            return d.agents[0]!
          }
          return normalized
        },
      }
      expect(() => convert(data(), f)).toThrow(/Supplement|unaccounted/i)
    },
  )
  it("a fixture without this entity and registration remains a valid partial conversion", () => {
    const absent = { ...data(), agents: [] }
    const result = convertSource(absent, normalization, [], [])
    expect(result.catalog.options).toHaveLength(0)
    expect(result.definitions.effects).toHaveLength(0)
  })
  it("genuine entity/block/effect reorder preserves identities and complete reference members", () => {
    const before = data()
    before.agents.push({
      id: "nekomata",
      name: "猫又",
      profession: "强攻",
      element: "物理",
      mindscapeBuffs: [],
    })
    const shuffled = structuredClone(before)
    shuffled.agents.reverse()
    for (const p of actor(shuffled).mindscapeBuffs!) {
      p.effectBlocks?.reverse()
      p.effects?.reverse()
      for (const b of p.effectBlocks ?? []) b.effects.reverse()
    }
    expect(shuffled.agents.map((a) => a.id)).not.toEqual(
      before.agents.map((a) => a.id),
    )
    expect(
      actor(shuffled).mindscapeBuffs![0]!.effectBlocks!.map((b) => b.id),
    ).not.toEqual(
      actor(before).mindscapeBuffs![0]!.effectBlocks!.map((b) => b.id),
    )
    const clean = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(clean)
      if (!value || typeof value !== "object") return value
      const object = value as Record<string, unknown>
      return Object.fromEntries(
        Object.entries(object)
          .filter(
            ([key]) => !(key === "pointer" && object.sourceId === "zzz-hp"),
          )
          .map(([key, v]) => [key, clean(v)]),
      )
    }
    const rows = (values: readonly unknown[], key: string) =>
      values
        .map(clean)
        .sort((a, b) =>
          String((a as Record<string, unknown>)[key]).localeCompare(
            String((b as Record<string, unknown>)[key]),
          ),
        )
    const first = convert(before),
      second = convert(shuffled)
    expect(rows(second.definitions.effects, "effectId")).toEqual(
      rows(first.definitions.effects, "effectId"),
    )
    for (const [key, id] of [
      ["entities", "catalogEntityId"],
      ["options", "optionId"],
      ["skillTargets", "targetId"],
    ] as const)
      expect(rows(second.catalog[key], id)).toEqual(
        rows(first.catalog[key], id),
      )
  })
})

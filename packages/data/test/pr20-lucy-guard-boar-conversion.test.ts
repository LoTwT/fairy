import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/lucy-guard-boar-source.json" with { type: "json" }
const registrations = () => {
  const values = SUPPLEMENTS.filter((s) =>
    [
      "nanoka:agents:lucy:guard-boar-inheritance",
      "nanoka:agents:lucy:m6-boar-rain",
    ].includes(s.supplementId),
  )
  expect(values).toHaveLength(2)
  return values
}
const data = (): SourceData => ({
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
  // 原件中的 Lucy raw 与固定 normalizeAgent 输出完全相同，独立副本见 fixture.normalized。
  normalizeAgent: (a) => structuredClone(a),
  normalizeWengine: (a) => structuredClone(a),
  normalizeDriveDisc: (a) => structuredClone(a),
  collectEffectsFromPack: (p) =>
    p.effectBlocks?.flatMap((b) => b.effects) ?? p.effects ?? [],
  applyAnomalyFlagsToPack: (p) => p,
}
const lucy = (d: SourceData) => d.agents.find((a) => a.id === "lucy")!
const pack = (d: SourceData, rank: number) => lucy(d).mindscapeBuffs![rank]!
const convert = (d = data(), f = normalization) =>
  convertSource(d, f, [], registrations())

describe("Lucy real source guards", () => {
  it("locks three coexisting records, seven real cultivation slots and bilingual inheritance/M6", () => {
    expect(fixture.raw).toEqual(fixture.normalized)
    expect(fixture.raw.mindscapeBuffs).toHaveLength(7)
    expect(
      fixture.raw.mindscapeBuffs[0]!.effectBlocks[0]!.effects.map((e) => e.id),
    ).toEqual(["legacy-team-atk", "eff-ms384fjz-fgct7r"])
    expect(fixture.raw.mindscapeBuffs[4]!.effects.map((e) => e.id)).toEqual([
      "legacy-team-critDmg",
    ])
    expect(fixture.raw.mindscapeBuffs[6]!.effectBlocks).toEqual([])
    expect(fixture.raw.mindscapeBuffs[6]!.effects).toEqual([])
    expect(Object.keys(fixture.raw.mindscapeBuffs[6]!.selfMods)).toHaveLength(
      67,
    )
    expect(
      Object.values(fixture.raw.mindscapeBuffs[6]!.teamMods).every(
        (n) => n === 0,
      ),
    ).toBe(true)
    expect(fixture.nanoka.en.talent["6"].desc).toContain(
      "300% of the guard boar's ATK",
    )
    expect(fixture.nanoka.en.talent["6"].desc).toContain("another squad member")
    const result = convert()
    const rules = result.definitions.effects.filter(
      (r) => r.source.identity.entityId === "1151",
    )
    expect(rules).toHaveLength(5)
    expect(
      result.catalog.options.filter((o) => o.catalogEntityId === "agents:lucy"),
    ).toHaveLength(5)
    expect(
      result.catalog.skillTargets.find(
        (t) => t.targetId === "nanoka:lucy-m6-boar-rain",
      ),
    ).toMatchObject({
      agentEntityId: "1151",
      upstreamId: null,
      category: "uncategorized",
      countsAsFollowUp: false,
    })
    expect(
      result.coverage.records.filter(
        (r) => r.catalogEntityId === "agents:lucy",
      ),
    ).toHaveLength(3)
  })
  const emptyDrifts: readonly [string, (d: SourceData) => void][] = [
    [
      "missing slot",
      (d) => {
        delete lucy(d).mindscapeBuffs![6]
      },
    ],
    [
      "empty object",
      (d) => {
        lucy(d).mindscapeBuffs![6] = {}
      },
    ],
    [
      "missing effects",
      (d) => {
        delete pack(d, 6).effects
      },
    ],
    [
      "missing blocks",
      (d) => {
        delete pack(d, 6).effectBlocks
      },
    ],
    [
      "missing self modifiers",
      (d) => {
        delete pack(d, 6).selfMods
      },
    ],
    [
      "missing team modifiers",
      (d) => {
        delete pack(d, 6).teamMods
      },
    ],
    [
      "nonzero modifier",
      (d) => {
        pack(d, 6).teamMods!.atk = 1
      },
    ],
    [
      "deleted zero modifier",
      (d) => {
        delete pack(d, 6).selfMods!.hp
      },
    ],
    [
      "nonempty note",
      (d) => {
        lucy(d).mindscapeNotes![6] = "new M6"
      },
    ],
    [
      "missing note",
      (d) => {
        delete lucy(d).mindscapeNotes![6]
      },
    ],
    [
      "new empty block",
      (d) => {
        pack(d, 6).effectBlocks!.push({
          id: "new-m6",
          name: "new M6",
          note: "new",
          effects: [],
        })
      },
    ],
    [
      "new flat encoding",
      (d) => {
        pack(d, 6).effects!.push({
          id: "new-m6",
          scope: "general",
          applyTarget: "self",
          kind: "fixed",
          stat: "newDamage",
          value: 300,
        })
      },
    ],
    [
      "new block encoding",
      (d) => {
        pack(d, 6).effectBlocks!.push({
          id: "new-m6",
          name: "new M6",
          effects: [
            {
              id: "new-m6",
              scope: "general",
              applyTarget: "self",
              kind: "fixed",
              stat: "newDamage",
              value: 300,
            },
          ],
        })
      },
    ],
    [
      "encoding moved to M5",
      (d) => {
        pack(d, 5).effectBlocks!.push({
          id: "moved-m6",
          name: "M6",
          effects: [],
        })
      },
    ],
  ]
  const coexistingDrifts: readonly [
    string,
    (p: SourcePack, a: SourceEntity, rank: number) => void,
  ][] = [
    [
      "missing pack",
      (_p, a, rank) => {
        delete a.mindscapeBuffs![rank]
      },
    ],
    [
      "missing block",
      (p) => {
        p.effectBlocks = []
      },
    ],
    [
      "block id",
      (p) => {
        p.effectBlocks![0]!.id = "renamed"
      },
    ],
    [
      "block name",
      (p) => {
        p.effectBlocks![0]!.name += "new"
      },
    ],
    [
      "block note",
      (p) => {
        p.effectBlocks![0]!.note += "new"
      },
    ],
    [
      "block enabled",
      (p) => {
        p.effectBlocks![0]!.enabledDefault = false
      },
    ],
    [
      "block new field",
      (p) => {
        Object.assign(p.effectBlocks![0]!, { newField: true })
      },
    ],
    [
      "record missing",
      (p) => {
        p.effectBlocks![0]!.effects.pop()
      },
    ],
    [
      "record id",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.id = "new-id"
      },
    ],
    [
      "record scope",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.scope = "skill"
      },
    ],
    [
      "record stat",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.stat = "unknown-new-stat"
      },
    ],
    [
      "record value",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.value += 1
      },
    ],
    [
      "record target",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.applyTarget = "self"
      },
    ],
    [
      "record condition",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.applySituation = "onHit"
      },
    ],
    [
      "record new field",
      (p) => {
        Object.assign(p.effectBlocks![0]!.effects[0]!, {
          newExecutableField: true,
        })
      },
    ],
    [
      "record stack",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.maxStacks = 2
      },
    ],
    [
      "record note",
      (p) => {
        p.effectBlocks![0]!.effects[0]!.note = "added clause"
      },
    ],
    [
      "flat mirror value",
      (p) => {
        p.effects![0]!.value += 1
      },
    ],
    [
      "flat mirror missing",
      (p) => {
        delete p.effects
      },
    ],
    [
      "flat mirror extra",
      (p) => {
        p.effects!.push({ ...p.effects![0]!, id: "additional" })
      },
    ],
    [
      "modifier mirror value",
      (p) => {
        p.teamMods!.atk += 1
      },
    ],
    [
      "modifier mirror missing",
      (p) => {
        delete p.selfMods
      },
    ],
    [
      "note mirror",
      (_p, a, rank) => {
        a.mindscapeNotes![rank] = "changed"
      },
    ],
    [
      "record moved",
      (p, a, rank) => {
        a.mindscapeBuffs![rank + 1] = structuredClone(p)
        a.mindscapeBuffs![rank] = structuredClone(a.mindscapeBuffs![6]!)
      },
    ],
  ]
  const mutations = [
    ...emptyDrifts,
    ...[0, 4].flatMap((rank) =>
      coexistingDrifts.map(
        ([name, mutate]) =>
          [
            "rank" + rank + " " + name,
            (d: SourceData) => mutate(pack(d, rank), lucy(d), rank),
          ] as const,
      ),
    ),
  ]
  it.each(
    mutations.flatMap(([name, mutate]) =>
      ["raw", "normalized"].map((representation) => ({
        name,
        mutate,
        representation,
      })),
    ),
  )(
    "$representation rejects $name before ordinary conversion",
    ({ mutate, representation }) => {
      const d = data()
      let f = normalization
      if (representation === "raw") mutate(d)
      else
        f = {
          ...normalization,
          normalizeAgent: (a) => {
            const value = normalization.normalizeAgent(a)
            if (a.id === "lucy") {
              const transformed = { ...data(), agents: [value] }
              mutate(transformed)
              return transformed.agents[0]!
            }
            return value
          },
        }
      expect(() => convert(d, f)).toThrow(
        /Supplement|unaccounted|Duplicate source effect/,
      )
    },
  )
  it("accepts the fixed normalizer's known undefined optional fields but rejects unknown undefined keys", () => {
    const actualOptionalFields: SourceNormalization = {
      ...normalization,
      normalizeAgent: (source) => {
        const value = normalization.normalizeAgent(source)
        if (source.id === "lucy")
          for (const rank of [0, 4]) {
            for (const record of value.mindscapeBuffs![rank]!.effectBlocks![0]!
              .effects) {
              Object.assign(record, {
                skillTargets: undefined,
                skillCategory: undefined,
              })
              if (record.id !== "eff-ms384fjz-fgct7r")
                Object.assign(record, { convert: undefined })
              if (rank === 4)
                Object.assign(record, { appliesToAnomaly: undefined })
            }
          }
        return value
      },
    }
    expect(
      convert(data(), actualOptionalFields).definitions.effects.filter(
        (r) => r.source.identity.entityId === "1151",
      ),
    ).toHaveLength(5)
    const drift = data()
    Object.assign(pack(drift, 0).effectBlocks![0]!.effects[0]!, {
      newExecutableField: undefined,
    })
    expect(() => convert(drift)).toThrow(/record field set drifted/)
  })
  it("unknown or absent Lucy cannot retain its registrations", () => {
    const renamed = data()
    lucy(renamed).id = "lucy-renamed"
    expect(() => convert(renamed)).toThrow(/identity|Supplement/i)
    const absent = data()
    absent.agents = absent.agents.filter((a) => a.id !== "lucy")
    expect(() => convert(absent)).toThrow(/Supplement|Lucy/i)
    const ordinary = convertSource(
      { ...absent, agents: [] },
      normalization,
      [],
      [],
    )
    expect(ordinary.catalog.options).toHaveLength(0)
  })
  it("real entity and record reordering preserves complete identities and references except positional ZZZ-HP pointers", () => {
    const before = data(),
      after = structuredClone(before)
    after.agents.reverse()
    const p = pack(after, 0)
    p.effects!.reverse()
    p.effectBlocks![0]!.effects.reverse()
    expect(before.agents.map((a) => a.id)).not.toEqual(
      after.agents.map((a) => a.id),
    )
    expect(pack(before, 0).effects!.map((e) => e.id)).not.toEqual(
      p.effects!.map((e) => e.id),
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
    const a = convert(before),
      b = convert(after)
    expect(rows(a.definitions.effects, "effectId")).toEqual(
      rows(b.definitions.effects, "effectId"),
    )
    for (const [key, id] of [
      ["options", "optionId"],
      ["entities", "catalogEntityId"],
      ["skillTargets", "targetId"],
    ] as const)
      expect(rows(a.catalog[key], id)).toEqual(rows(b.catalog[key], id))
    expect(clean(a.catalog.mechanisms)).toEqual(clean(b.catalog.mechanisms))
  })
})

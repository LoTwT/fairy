import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import { SUPPLEMENTS } from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/alice-core-periodic-source.json" with { type: "json" }

const optionId = "nanoka:agents:alice:core-periodic-damage"
const registrations = () => {
  const selected = SUPPLEMENTS.filter((s) => s.supplementId === optionId)
  expect(selected).toHaveLength(1)
  return selected
}
const data = (): SourceData => ({
  agents: [structuredClone(fixture.raw) as SourceEntity],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
})
const normalization: SourceNormalization = {
  normalizeAgent: (a) => structuredClone(a),
  normalizeWengine: (a) => structuredClone(a),
  normalizeDriveDisc: (a) => structuredClone(a),
  collectEffectsFromPack: (p) =>
    p?.effectBlocks?.flatMap((b) => b.effects) ?? p?.effects ?? [],
  applyAnomalyFlagsToPack: (p) => p,
}
const convert = (d = data(), f = normalization) =>
  convertSource(d, f, [], registrations())
const core = (d: SourceData) =>
  d.agents.find((a) => a.id === "alice")!.mindscapeBuffs![0]!

// 仅移除 ZZZ-HP 引用的位置型 pointer；不删除 source、引用或实体元数据。
function semantic(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semantic)
  if (!value || typeof value !== "object") return value
  const object = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(object)
      .filter(
        ([key, v]) =>
          !(
            key === "pointer" &&
            object.sourceId === "zzz-hp" &&
            typeof v === "string" &&
            /^\/agents\/\d+(?:\/|$)/.test(v)
          ),
      )
      .map(([key, v]) => [key, semantic(v)]),
  )
}
const byId = (rows: readonly unknown[], key: string) =>
  rows
    .map(semantic)
    .sort((a, b) =>
      String((a as Record<string, unknown>)[key]).localeCompare(
        String((b as Record<string, unknown>)[key]),
      ),
    )

describe("Alice periodic clause uses the real nonempty core pack", () => {
  it("independently preserves raw and normalized core context", () => {
    expect(fixture.raw.mindscapeBuffs[0]).toEqual(
      fixture.normalized.mindscapeBuffs[0],
    )
    expect(core(data()).effectBlocks!.map((b) => b.id)).toEqual([
      "blk-legacy",
      "blk-ms4sp1go-wduvv6",
    ])
    expect(core(data()).effectBlocks![0]!.effects).toHaveLength(1)
    const result = convert()
    expect(
      result.definitions.effects.some(
        (e) =>
          e.effectId ===
          "agent:1401:zzz-hp:legacy-self-disorderBaseMult:blk-legacy:mindscape:0",
      ),
    ).toBe(true)
    expect(
      result.catalog.options.find((o) => o.optionId === optionId),
    ).toBeDefined()
  })

  const drifts: readonly [string, (d: SourceData) => void][] = [
    ["missing anchor", (d) => core(d).effectBlocks!.shift()],
    [
      "anchor identity",
      (d) => {
        core(d).effectBlocks![0]!.id = "changed"
      },
    ],
    [
      "anchor name",
      (d) => {
        core(d).effectBlocks![0]!.name += "changed"
      },
    ],
    [
      "anchor disabled",
      (d) => {
        core(d).effectBlocks![0]!.enabledDefault = false
      },
    ],
    [
      "periodic note changed",
      (d) => {
        core(d).effectBlocks![0]!.note = core(
          d,
        ).effectBlocks![0]!.note!.replace("2.5%", "3%")
      },
    ],
    [
      "note appended",
      (d) => {
        core(d).effectBlocks![0]!.note += "new clause"
      },
    ],
    [
      "missing coexistence record",
      (d) => core(d).effectBlocks![0]!.effects.pop(),
    ],
    [
      "record identity",
      (d) => {
        core(d).effectBlocks![0]!.effects[0]!.id = "changed"
      },
    ],
    [
      "record moved to rank",
      (d) => {
        d.agents[0]!.mindscapeBuffs![5]!.effectBlocks!.push({
          id: "moved",
          name: "moved",
          effects: [core(d).effectBlocks![0]!.effects.pop()!],
        })
      },
    ],
    [
      "record moved to another core block",
      (d) => {
        core(d).effectBlocks![1]!.effects.push(
          core(d).effectBlocks![0]!.effects.pop()!,
        )
      },
    ],
    [
      "new known encoding",
      (d) => {
        core(d).effectBlocks![0]!.effects.push({
          ...core(d).effectBlocks![0]!.effects[0]!,
          id: "new",
          stat: "directDmgMult",
          value: 2.5,
        })
      },
    ],
    [
      "unknown encoding before fallback",
      (d) => {
        core(d).effectBlocks![0]!.effects.push({
          ...core(d).effectBlocks![0]!.effects[0]!,
          id: "future",
          stat: "futurePeriodicDamage",
        })
      },
    ],
    [
      "flattened-only encoding",
      (d) => {
        core(d).effects!.push({ ...core(d).effects![0]!, id: "flat-new" })
      },
    ],
    ["flattened missing record", (d) => core(d).effects!.pop()],
    [
      "coexisting scope",
      (d) => {
        core(d).effectBlocks![0]!.effects[0]!.scope = "general"
      },
    ],
    [
      "coexisting target",
      (d) => {
        core(d).effectBlocks![0]!.effects[0]!.applyTarget = "self"
      },
    ],
    [
      "coexisting value",
      (d) => {
        core(d).effectBlocks![0]!.effects[0]!.valuePerStack = 19
      },
    ],
    [
      "coexisting source filter",
      (d) => {
        core(d).effectBlocks![0]!.effects[0]!.elementFilter = "all"
      },
    ],
    [
      "coexisting conversion",
      (d) => {
        core(d).effectBlocks![1]!.effects[0]!.convert!.ratioPercent = 161
      },
    ],
  ]

  it.each(drifts)("rejects raw %s before generic fallback", (_name, mutate) => {
    const input = data()
    mutate(input)
    expect(() => convert(input)).toThrow(
      /anchor|coexisting|clause|Normalization generated unaccounted source effects/,
    )
  })

  it.each(drifts)("rejects normalized %s", (_name, mutate) => {
    expect(() =>
      convert(data(), {
        ...normalization,
        normalizeAgent: (agent) => {
          const altered = data()
          altered.agents = [structuredClone(agent)]
          mutate(altered)
          return altered.agents[0]!
        },
      }),
    ).toThrow(
      /anchor|coexisting|clause|Normalization generated unaccounted source effects/,
    )
  })

  it("allows unrelated rank changes and a source with no Alice", () => {
    const changed = data()
    changed.agents[0]!.mindscapeBuffs![1]!.effectBlocks![0]!.note +=
      " independent"
    expect(() => convert(changed)).not.toThrow()
    const empty = data()
    empty.agents = []
    expect(
      convertSource(empty, normalization, [], []).catalog.options.some(
        (o) => o.optionId === optionId,
      ),
    ).toBe(false)
  })

  it("really reorders entities, blocks and records while preserving complete semantics", () => {
    const before = data()
    before.agents.push({
      id: "soldier11",
      name: "独立正控",
      mindscapeBuffs: [],
    })
    const reordered = structuredClone(before)
    reordered.agents.reverse()
    core(reordered).effectBlocks!.reverse()
    core(reordered).effects!.reverse()
    expect(reordered.agents.map((a) => a.id)).not.toEqual(
      before.agents.map((a) => a.id),
    )
    expect(core(reordered).effectBlocks!.map((b) => b.id)).not.toEqual(
      core(before).effectBlocks!.map((b) => b.id),
    )
    expect(core(reordered).effects!.map((e) => e.id)).not.toEqual(
      core(before).effects!.map((e) => e.id),
    )
    const a = convert(before),
      b = convert(reordered)
    expect(byId(a.definitions.effects, "effectId")).toEqual(
      byId(b.definitions.effects, "effectId"),
    )
    expect(byId(a.catalog.options, "optionId")).toEqual(
      byId(b.catalog.options, "optionId"),
    )
    expect(byId(a.catalog.entities, "catalogEntityId")).toEqual(
      byId(b.catalog.entities, "catalogEntityId"),
    )
  })
})

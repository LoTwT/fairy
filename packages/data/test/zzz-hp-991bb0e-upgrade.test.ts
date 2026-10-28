import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../definitions/effects/${name}`, import.meta.url),
      "utf8",
    ),
  )
const catalog = read("static-catalog.json")
const definitions = read("static.json")
const coverage = read("static-coverage.json")

const option = (optionId: string) =>
  catalog.options.find(
    (entry: { optionId: string }) => entry.optionId === optionId,
  )
const rule = (effectId: string) =>
  definitions.effects.find(
    (entry: { effectId: string }) => entry.effectId === effectId,
  )
const coverageRecord = (pointer: string, catalogEntityId: string) =>
  coverage.records.find(
    (entry: { pointer: string; catalogEntityId: string }) =>
      entry.pointer === pointer && entry.catalogEntityId === catalogEntityId,
  )

describe("ZZZ-HP 991bb0e source upgrade", () => {
  it("keeps the anby M2/M6 public identities while correcting their scope", () => {
    const m2OptionId =
      "agents:anby:mindscape:2:blk-ms47xm3l-3pumvj:eff-ms47xm3l-nf7ga7"
    const m2RuleId =
      "agent:1011:zzz-hp:eff-ms47xm3l-nf7ga7:blk-ms47xm3l-3pumvj:mindscape:2"
    const m2 = option(m2OptionId)
    expect(m2?.variants[0]).toMatchObject({
      status: "corrected",
      differences: ["anby-m2-beneficiary-target"],
      effectIds: [m2RuleId],
    })
    expect(rule(m2RuleId)?.beneficiary).toEqual({ kind: "holder" })
    expect(JSON.stringify(rule(m2RuleId)?.when)).toContain(
      "zzz-hp:skill:anby-basic-ms47yaat",
    )
    expect(JSON.stringify(rule(m2RuleId)?.when)).not.toContain("team")

    const m6OptionId =
      "agents:anby:mindscape:6:blk-legacy:legacy-self-skillDmgBonus"
    const m6RuleId =
      "agent:1011:zzz-hp:legacy-self-skillDmgBonus:blk-legacy:mindscape:6"
    const m6 = option(m6OptionId)
    expect(m6?.variants[0]).toMatchObject({
      status: "corrected",
      differences: ["anby-m6-all-basic-skill-targets"],
      effectIds: [m6RuleId],
    })
    expect(JSON.stringify(rule(m6RuleId)?.when)).toContain(
      "zzz-hp:category:basic",
    )
    expect(JSON.stringify(rule(m6RuleId)?.when)).toContain(
      "zzz-hp:skill:all-dodge-ms0dnpmr",
    )
    expect(
      definitions.effects.some((entry: { effectId: string }) =>
        entry.effectId.includes("eff-1-3"),
      ),
    ).toBe(false)
  })

  it("registers Alice/Jane subtype records as non-executable conflicts", () => {
    for (const effectId of ["eff-mvhhq6pm-b", "eff-mvhhq6pm-d"]) {
      const entry = option(`agents:alice:mindscape:2:blk-legacy:${effectId}`)
      expect(entry?.variants[0]).toMatchObject({
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
      })
    }
    const janeEffectIds = [
      "eff-mvjcx1mw-5",
      "eff-mvjcx1mw-6",
      "eff-mvjcx52e-9",
      "eff-mvjcx52e-a",
      "eff-mvjcx8vt-b",
      "eff-mvjcx8vt-c",
      "eff-mvhhtmvu-3",
      "eff-mvhhtmvu-4",
      "eff-mvhhtu2b-7",
      "eff-mvhhtu2b-8",
      "eff-mvhhs5hr-l",
      "eff-mvhhs5hr-m",
    ]
    for (const effectId of janeEffectIds) {
      const rank = effectId.startsWith("eff-mvhhs5hr") ? 2 : 0
      const blockId = effectId.startsWith("eff-mvjcx")
        ? "blk-ms349twy-zgu7b6"
        : effectId.startsWith("eff-mvhhtmvu") ||
            effectId.startsWith("eff-mvhhtu2b")
          ? "blk-ms34gorp-m9dlxw"
          : "blk-legacy"
      const entry = option(
        `agents:jane:mindscape:${rank}:${blockId}:${effectId}`,
      )
      expect(entry?.variants[0]).toMatchObject({
        status: "unsupported",
        reason: "semantic-conflict",
        effectIds: [],
      })
      expect(
        definitions.effects.some((ruleEntry: { effectId: string }) =>
          ruleEntry.effectId.includes(effectId),
        ),
      ).toBe(false)
    }
  })

  it("declares the anby M2 daze and Plume zero-block gaps without rules", () => {
    expect(
      option("nanoka:agents:anby:m2-enhanced-special-daze")?.variants[0],
    ).toMatchObject({
      status: "unsupported",
      reason: "formula-out-of-scope",
      effectIds: [],
    })
    expect(
      option(
        "w-engines:Plume_of_Rebirth:refinement:blk-mviwn8gu-b8fedl:eff-mviwn8gu-8wi5ap",
      )?.variants[0],
    ).toMatchObject({
      status: "unsupported",
      reason: "semantic-conflict",
      effectIds: [],
    })
  })

  it("compiles the duplicate Drill Rig slug as one canonical entity", () => {
    const drill = catalog.entities.filter(
      (entry: { identity?: { entityId?: string } }) =>
        entry.identity?.entityId === "13111",
    )
    expect(drill).toHaveLength(1)
    expect(drill[0]).toMatchObject({
      catalogEntityId: "w-engines:Drill_Rig_Red-Axis",
      upstreamId: "Drill_Rig_Red-Axis",
    })
    expect(
      catalog.entities.some(
        (entry: { catalogEntityId: string }) =>
          entry.catalogEntityId === "w-engines:Drill_Rig_Red_Axis",
      ),
    ).toBe(false)
  })

  it("records the new conflict/corrected positions in the coverage report", () => {
    expect(coverage.summary).toMatchObject({
      rawEffects: 1375,
      rules: 935,
      options: 1002,
      converted: 1149,
      corrected: 138,
      unsupported: 88,
    })
    expect(
      coverageRecord(
        "/agents/38/mindscapeBuffs/2/effectBlocks/0/effects/1",
        "agents:alice",
      ),
    ).toMatchObject({ status: "unsupported", reason: "semantic-conflict" })
    expect(
      coverageRecord(
        "/agents/16/mindscapeBuffs/2/effectBlocks/0/effects/0",
        "agents:anby",
      ),
    ).toMatchObject({ status: "corrected" })
  })
})

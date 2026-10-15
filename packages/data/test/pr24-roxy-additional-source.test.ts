import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import original from "./fixtures/roxy-additional-source.json" with { type: "json" }

describe("Roxy additional ability independent fixed originals", () => {
  it.each(["zh", "en"] as const)(
    "preserves %s source bytes, version and seven complete clauses",
    async (locale) => {
      const source = original.languages[locale]
      const bytes = await readFile(
        new URL(`../integrated/${source.resourcePath}`, import.meta.url),
      )
      const details = JSON.parse(bytes.toString())
      const data = JSON.parse(
        await readFile(
          new URL("../integrated/agents/1621/data.json", import.meta.url),
          "utf8",
        ),
      )
      expect(original.nanokaVersion).toBe("3.2")
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        source.integratedSha256,
      )
      expect(source.clauses.map((clause) => clause.coreSkillLevel)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ])
      for (const clause of source.clauses) {
        const id = String(1621500 + clause.coreSkillLevel)
        expect(clause.pointer).toBe(`/passive/level/${id}/desc/1`)
        expect(data.passive.level[id].level).toBe(clause.coreSkillLevel)
        expect(details.passive.level[id].desc[1]).toBe(clause.text)
        expect(details.passive.level[id].name[1]).toBe(clause.name)
        for (const term of locale === "zh"
          ? ["[强攻]", "[命破]", "[锋御]", "8%", "1.2%", "80%", "30%"]
          : [
              "another character",
              "Attack",
              "Rupture",
              "Armorer",
              "8%",
              "1.2%",
              "80%",
              "30%",
            ])
          expect(clause.text).toContain(term)
      }
    },
  )

  it("keeps the independent fixed block and its excluded conflicting special18 record", () => {
    expect(original.upstreamCommit).toBe(
      "7a4f2776bf4a44cb108fcd7f5834f63606ade914",
    )
    expect(original.upstream.pointer).toBe("/agents/33/mindscapeBuffs/0")
    expect(original.upstream.block.id).toBe("blk-muppaptc-wl5q5a")
    expect(original.upstream.block.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "eff-muppaptc-fn832t",
          stat: "dmgBonus",
          value: 8,
          applyTarget: "self",
        }),
        expect.objectContaining({
          id: "eff-muppd7di-hf2fx8",
          stat: "dmgBonus",
          convert: expect.objectContaining({
            from: "level",
            ratioPercent: 120,
            cap: 72,
          }),
        }),
        expect.objectContaining({
          id: "eff-muppdqhh-3qsii7",
          stat: "staggerVulnerable",
          value: 30,
          applyTarget: "team",
        }),
        expect.objectContaining({
          id: "eff-muppe3ty-86s1uf",
          stat: "special",
          value: 18,
        }),
      ]),
    )
    expect(original.independentExpectations.levelCases).toEqual([
      { level: 1, bonus: 0.092 },
      { level: 30, bonus: 0.44 },
      { level: 60, bonus: 0.8 },
    ])
  })
})

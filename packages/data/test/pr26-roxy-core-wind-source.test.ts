import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import original from "./fixtures/roxy-core-wind-source.json" with { type: "json" }

describe("Roxy core single-state wind independent fixed source", () => {
  it.each(["zh", "en"] as const)(
    "preserves all seven complete %s clauses and identity metadata",
    async (locale) => {
      const source = original.languages[locale]
      const bytes = await readFile(
        new URL(`../integrated/${source.resourcePath}`, import.meta.url),
      )
      const detail = JSON.parse(bytes.toString())
      const data = JSON.parse(
        await readFile(
          new URL("../integrated/agents/1621/data.json", import.meta.url),
          "utf8",
        ),
      )
      expect(original.nanokaVersion).toBe("3.2")
      expect(original.entityId).toBe("1621")
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        source.integratedSha256,
      )
      expect(source.clauses.map((row) => row.coreSkillLevel)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ])
      for (const row of source.clauses) {
        const id = String(1621500 + row.coreSkillLevel)
        expect(data.passive.level[id].level).toBe(row.coreSkillLevel)
        expect(row.pointer).toBe(`/passive/level/${id}/desc/0`)
        expect(detail.passive.level[id].desc[0]).toBe(row.text)
        expect(detail.passive.level[id].name[0]).toBe(row.name)
        const text = row.text.replace(/<[^>]+>/g, "")
        for (const term of locale === "zh"
          ? ["非[锋御]", "风属性", "0.4%", "0.2%", "50秒", "刷新"]
          : ["non-Armorer", "Wind DMG", "0.4%", "0.2%", "50s", "reset"])
          expect(text).toContain(term)
        expect(text).toContain(
          `${Number((row.criticalDamageCap * 100).toFixed(6))}%`,
        )
        expect(text).toContain(
          `${Number((row.sharpCriticalDamageCap * 100).toFixed(6))}%`,
        )
      }
    },
  )
  it.each([
    [1, 0.22, 0.1],
    [2, 0.25, 0.115],
    [3, 0.28, 0.13],
    [4, 0.31, 0.145],
    [5, 0.34, 0.16],
    [6, 0.37, 0.175],
    [7, 0.4, 0.2],
  ])(
    "freezes core %s caps %s / %s independently of generation",
    (rank, normal, sharp) => {
      expect(original.independentExpectations[rank! - 1]).toEqual({
        coreSkillLevel: rank,
        criticalDamageCoefficient: 0.4,
        criticalDamageCap: normal,
        sharpCriticalDamageCoefficient: 0.2,
        sharpCriticalDamageCap: sharp,
      })
    },
  )
})

import { expect, it } from "vitest"
import {
  findBestMatch,
  findTopMatches,
  normalizeAttribute,
  normalizeDamageAttribute,
  normalizeSpecialty,
  stripHtml,
} from "../src/mastra/tools/zzz/utils"

it("strips html tags and decodes common entities", () => {
  expect(stripHtml("<b>朱鸢</b>&nbsp;&amp;&lt;test&gt;")).toBe("朱鸢 &<test>")
})

it("normalizes specialty and attribute labels", () => {
  expect(normalizeSpecialty("强攻")).toBe("attack")
  expect(normalizeAttribute("玄墨")).toBe("auricInk")
  expect(normalizeDamageAttribute("玄墨")).toBe("ether")
})

it("prefers exact and prefix matches for lookup helpers", () => {
  const items = [
    { name: "朱鸢", alias: "zhuyuan" },
    { name: "伊芙琳", alias: "evelyn" },
    { name: "仪玄", alias: "yixuan" },
  ]

  expect(findBestMatch(items, "伊芙琳", [(item) => item.name])).toEqual(
    items[1],
  )
  expect(
    findTopMatches(
      items,
      "evel",
      [(item) => item.name, (item) => item.alias],
      2,
    ),
  ).toEqual([items[1]])
})

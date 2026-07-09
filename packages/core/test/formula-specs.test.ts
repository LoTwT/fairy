import { describe, expect, it } from "vitest"
import { getFormulaSpec, listBuckets } from "../src/index"

describe("formula specs", () => {
  it("lists regular_damage buckets in calculation order", () => {
    expect(listBuckets("regular_damage")).toEqual([
      "base_damage",
      "damage_bonus",
      "crit",
      "defense",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ])
  })

  it("lists sheer_damage buckets and the ignored defense boundary", () => {
    expect(getFormulaSpec("sheer_damage")).toMatchObject({
      formulaId: "sheer_damage",
      requiredBuckets: ["base_damage"],
      ignoredBuckets: ["defense"],
    })

    expect(listBuckets("sheer_damage")).toEqual([
      "base_damage",
      "damage_bonus",
      "crit",
      "sheer_damage_bonus",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ])
  })
})

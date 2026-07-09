import { describe, expect, it } from "vitest"
import { calculate, getFormulaSpec, listBuckets } from "../src/index"
import type { BucketId, FormulaSpec } from "../src/index"

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

  it("returns defensive copies that cannot corrupt later calculations", () => {
    const returnedBuckets = listBuckets("regular_damage") as BucketId[]
    returnedBuckets.splice(1)

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

    const returnedSpec = getFormulaSpec("sheer_damage") as FormulaSpec & {
      ignoredBuckets: BucketId[]
    }
    const returnedSpecBuckets = returnedSpec.buckets as BucketId[]

    returnedSpecBuckets.splice(1)
    returnedSpec.ignoredBuckets.length = 0

    expect(getFormulaSpec("sheer_damage")).toMatchObject({
      buckets: [
        "base_damage",
        "damage_bonus",
        "crit",
        "sheer_damage_bonus",
        "resistance",
        "damage_taken",
        "stun_damage_taken",
        "special",
      ],
      ignoredBuckets: ["defense"],
    })

    const regularResult = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "crit", value: 2 },
      ],
    })

    expect(regularResult).toMatchObject({
      ok: true,
      value: 200,
    })

    const sheerResult = calculate({
      formulaId: "sheer_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "defense", value: 0.1 },
      ],
    })

    expect(sheerResult.ok).toBe(true)
    expect(sheerResult.ok && sheerResult.warnings).toContainEqual(
      expect.objectContaining({
        code: "ignored_bucket",
        bucketId: "defense",
      }),
    )
  })
})

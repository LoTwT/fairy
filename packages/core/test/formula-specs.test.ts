import { describe, expect, it } from "vitest"
import { getBucketSpecCount, isBucketId } from "../src/bucket-specs"
import {
  getFormulaSpecById,
  isFormulaId,
  listRegisteredFormulaIds,
  validateFormulaRegistry,
  validateFormulaSpec,
} from "../src/formula-specs"
import { calculate, getFormulaSpec, listBuckets } from "../src/index"
import type { BucketId, FormulaSpec } from "../src/index"

describe("formula specs", () => {
  it("derives trusted bucket ids from registry own properties", () => {
    const bucketIds = [
      "base_damage",
      "damage_bonus",
      "crit",
      "defense",
      "sheer_damage_bonus",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ] as const satisfies readonly BucketId[]

    expect(getBucketSpecCount()).toBe(bucketIds.length)
    for (const bucketId of bucketIds) {
      expect(isBucketId(bucketId)).toBe(true)
    }

    expect(isBucketId("not_a_bucket")).toBe(false)
    expect(isBucketId("constructor")).toBe(false)
    expect(isBucketId("toString")).toBe(false)
    expect(isBucketId("__proto__")).toBe(false)
    expect(isBucketId(["base_damage"])).toBe(false)
    expect(isBucketId(Symbol("base_damage"))).toBe(false)
  })

  it("derives supported formula ids from registry own properties", () => {
    const formulaIds = listRegisteredFormulaIds()
    expect(formulaIds).toEqual(["regular_damage", "sheer_damage"])
    for (const formulaId of formulaIds) {
      expect(isFormulaId(formulaId)).toBe(true)
      expect(getFormulaSpecById(formulaId)?.formulaId).toBe(formulaId)
    }

    expect(isFormulaId("constructor")).toBe(false)
    expect(isFormulaId("toString")).toBe(false)
    expect(isFormulaId(["regular_damage"])).toBe(false)
    expect(isFormulaId(Symbol("regular_damage"))).toBe(false)
    expect(getFormulaSpecById("__proto__")).toBeUndefined()
  })

  it("rejects inconsistent required and optional bucket partitions", () => {
    expect(() =>
      validateFormulaSpec({
        formulaId: "regular_damage",
        buckets: ["base_damage"],
        requiredBuckets: [],
        optionalBuckets: ["base_damage"],
      }),
    ).toThrow("optional bucket base_damage must define a default value")

    expect(() =>
      validateFormulaSpec({
        formulaId: "regular_damage",
        buckets: ["base_damage"],
        requiredBuckets: [],
        optionalBuckets: [],
      }),
    ).toThrow(
      "base_damage must appear in exactly one of requiredBuckets or optionalBuckets",
    )

    expect(() =>
      validateFormulaSpec({
        formulaId: "regular_damage",
        buckets: ["base_damage"],
        requiredBuckets: ["base_damage"],
        optionalBuckets: ["base_damage"],
      }),
    ).toThrow(
      "base_damage must appear in exactly one of requiredBuckets or optionalBuckets",
    )

    expect(() =>
      validateFormulaSpec({
        formulaId: "regular_damage",
        buckets: ["base_damage", "crit"],
        requiredBuckets: ["base_damage"],
        optionalBuckets: ["crit", "crit"],
      }),
    ).toThrow("optionalBuckets contains duplicates")

    expect(() =>
      validateFormulaSpec({
        formulaId: "regular_damage",
        buckets: ["base_damage"],
        requiredBuckets: ["base_damage"],
        optionalBuckets: ["crit"],
      }),
    ).toThrow("crit is classified but absent from buckets")

    const sheerDamageSpec = getFormulaSpec("sheer_damage")
    expect(() =>
      validateFormulaSpec({
        ...sheerDamageSpec,
        buckets: sheerDamageSpec.buckets.filter(
          (bucketId) => bucketId !== "base_damage",
        ),
        requiredBuckets: [],
        ignoredBuckets: [
          ...(sheerDamageSpec.ignoredBuckets ?? []),
          "base_damage",
        ],
      }),
    ).toThrow("ignored bucket base_damage must define a default value")
  })

  it("rejects formula registry key and entry identity drift", () => {
    expect(() =>
      validateFormulaRegistry({
        regular_damage: {
          ...getFormulaSpec("regular_damage"),
          formulaId: "sheer_damage",
        },
        sheer_damage: getFormulaSpec("sheer_damage"),
      }),
    ).toThrow(
      "formula registry key regular_damage does not match entry identity sheer_damage",
    )
  })

  it("uses each formula partition as the requiredness authority", () => {
    for (const formulaId of listRegisteredFormulaIds()) {
      const missingRequired = calculate({ formulaId, buckets: [] })
      expect(missingRequired).toMatchObject({
        ok: false,
        error: {
          code: "missing_required_bucket",
          bucketId: "base_damage",
        },
      })

      const defaultedOptional = calculate({
        formulaId,
        buckets: [{ bucketId: "base_damage", value: 100 }],
      })
      expect(defaultedOptional.ok).toBe(true)
      expect(
        defaultedOptional.ok &&
          defaultedOptional.buckets.filter(
            (bucket) => bucket.source === "default",
          ),
      ).not.toHaveLength(0)
    }
  })

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

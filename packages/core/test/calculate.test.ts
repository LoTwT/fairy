import { describe, expect, it } from "vitest"
import { calculate } from "../src/index"
import type { Bucket, CalculationInput } from "../src/index"

describe("calculate", () => {
  it("calculates regular_damage with contribution reducers, defaults, and trace", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 1000 },
        {
          bucketId: "damage_bonus",
          contributions: [
            { value: 0.3, source: "skill_buff" },
            { value: 0.15, source: "drive_disc" },
          ],
        },
        { bucketId: "crit", value: 2 },
        { bucketId: "defense", value: 0.5 },
        { bucketId: "resistance", value: 0.9 },
        { bucketId: "stun_damage_taken", value: 1.5 },
      ],
      options: { trace: true },
    })

    expect(result).toMatchObject({
      ok: true,
      formulaId: "regular_damage",
      value: 1957.5,
      warnings: [
        { code: "defaulted_bucket", bucketId: "damage_taken" },
        { code: "defaulted_bucket", bucketId: "special" },
      ],
      trace: [
        "regular_damage = base_damage * damage_bonus * crit * defense * resistance * damage_taken * stun_damage_taken * special",
        "regular_damage = 1000 * 1.45 * 2 * 0.5 * 0.9 * 1 * 1.5 * 1",
      ],
    })

    expect(result.ok && result.buckets).toEqual([
      { bucketId: "base_damage", value: 1000, source: "input_value" },
      {
        bucketId: "damage_bonus",
        value: 1.45,
        source: "contributions",
        contributions: [
          { value: 0.3, source: "skill_buff" },
          { value: 0.15, source: "drive_disc" },
        ],
      },
      { bucketId: "crit", value: 2, source: "input_value" },
      { bucketId: "defense", value: 0.5, source: "input_value" },
      { bucketId: "resistance", value: 0.9, source: "input_value" },
      {
        bucketId: "damage_taken",
        value: 1,
        source: "default",
        defaulted: true,
        warnings: [
          {
            code: "defaulted_bucket",
            bucketId: "damage_taken",
            message: "damage_taken defaulted to neutral value 1.",
          },
        ],
      },
      { bucketId: "stun_damage_taken", value: 1.5, source: "input_value" },
      {
        bucketId: "special",
        value: 1,
        source: "default",
        defaulted: true,
        warnings: [
          {
            code: "defaulted_bucket",
            bucketId: "special",
            message: "special defaulted to neutral value 1.",
          },
        ],
      },
    ])
  })

  it("calculates sheer_damage and ignores direct defense with a warning", () => {
    const result = calculate({
      formulaId: "sheer_damage",
      buckets: [
        { bucketId: "base_damage", value: 1000 },
        {
          bucketId: "damage_bonus",
          contributions: [
            { value: 0.3, source: "skill_buff" },
            { value: 0.15, source: "drive_disc" },
          ],
        },
        { bucketId: "crit", value: 2 },
        { bucketId: "sheer_damage_bonus", value: 1.25 },
        { bucketId: "resistance", value: 0.9 },
        { bucketId: "damage_taken", value: 1.2 },
        { bucketId: "defense", value: 0.1 },
      ],
      options: { trace: true },
    })

    expect(result).toMatchObject({
      ok: true,
      formulaId: "sheer_damage",
      value: 3915,
      warnings: [
        { code: "ignored_bucket", bucketId: "defense" },
        { code: "defaulted_bucket", bucketId: "stun_damage_taken" },
        { code: "defaulted_bucket", bucketId: "special" },
      ],
    })

    expect(result.ok && result.buckets.at(-1)).toMatchObject({
      bucketId: "defense",
      value: 0.1,
      source: "ignored",
      warnings: [{ code: "ignored_bucket", bucketId: "defense" }],
    })
  })

  it("marks derived direct values in breakdown provenance", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        {
          bucketId: "defense",
          value: 0.5,
          provenance: { kind: "derived", source: "deriveDefenseBucket" },
        },
      ],
    })

    expect(
      result.ok &&
        result.buckets.find((bucket) => bucket.bucketId === "defense"),
    ).toMatchObject({
      bucketId: "defense",
      value: 0.5,
      source: "derived",
      provenance: { kind: "derived", source: "deriveDefenseBucket" },
    })
  })

  it("returns unsupported_formula before bucket validation", () => {
    const result = calculate({
      formulaId: "daze_buildup",
      buckets: [
        { bucketId: "damage_bonus", value: 1 },
        { bucketId: "damage_bonus", value: 1.2 },
      ],
    } as unknown as CalculationInput)

    expect(result).toMatchObject({
      ok: false,
      formulaId: "daze_buildup",
      error: { code: "unsupported_formula" },
      warnings: [],
    })
  })

  it("returns duplicate_bucket before unsupported bucket validation", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "sheer_damage_bonus", value: 1 },
        { bucketId: "sheer_damage_bonus", value: 1.2 },
      ],
    } as unknown as CalculationInput)

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "duplicate_bucket", bucketId: "sheer_damage_bonus" },
      warnings: [],
    })
  })

  it("returns unsupported_bucket before bucket input validation", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        {
          bucketId: "sheer_damage_bonus",
          value: Number.NaN,
          contributions: [{ value: 0.2 }],
        },
      ],
    } as unknown as CalculationInput)

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "unsupported_bucket", bucketId: "sheer_damage_bonus" },
      warnings: [],
    })
  })

  it("returns conflicting_bucket_input before numeric validation", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        {
          bucketId: "damage_bonus",
          value: Number.NaN,
          contributions: [{ value: 0.2 }],
        },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "conflicting_bucket_input", bucketId: "damage_bonus" },
      warnings: [],
    })
  })

  it("returns invalid_number for direct values", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [{ bucketId: "base_damage", value: Number.POSITIVE_INFINITY }],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "invalid_number", bucketId: "base_damage" },
      warnings: [],
    })
  })

  it("returns invalid_number for contribution values before unsupported_contributions", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "crit", contributions: [{ value: Number.NaN }] },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "invalid_number", bucketId: "crit" },
      warnings: [],
    })
  })

  it("returns empty_contributions before unsupported_contributions", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "crit", contributions: [] },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "empty_contributions", bucketId: "crit" },
      warnings: [],
    })
  })

  it("returns unsupported_contributions for direct-value-only buckets", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "crit", contributions: [{ value: 1 }] },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "unsupported_contributions", bucketId: "crit" },
      warnings: [],
    })
  })

  it("returns unsupported_contributions for ignored defense contributions", () => {
    const result = calculate({
      formulaId: "sheer_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "defense", contributions: [{ value: 0.2 }] },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "sheer_damage",
      error: { code: "unsupported_contributions", bucketId: "defense" },
      warnings: [],
    })
  })

  it("returns missing_required_bucket when base_damage is absent", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [{ bucketId: "damage_bonus", value: 1.2 }],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "missing_required_bucket", bucketId: "base_damage" },
    })
  })

  it("returns missing_required_bucket when explicit base_damage has no value", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [{ bucketId: "base_damage" } as Bucket],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "missing_required_bucket", bucketId: "base_damage" },
      warnings: [],
    })
  })
})

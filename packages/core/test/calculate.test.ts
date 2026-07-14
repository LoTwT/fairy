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

  it("preserves ignored default and derived breakdown shapes", () => {
    const defaulted = calculate({
      formulaId: "sheer_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        { bucketId: "defense" },
      ],
    })

    expect(defaulted.ok && defaulted.buckets.at(-1)).toMatchObject({
      bucketId: "defense",
      value: 1,
      source: "ignored",
      defaulted: true,
      warnings: [
        { code: "defaulted_bucket", bucketId: "defense" },
        { code: "ignored_bucket", bucketId: "defense" },
      ],
    })

    const derived = calculate({
      formulaId: "sheer_damage",
      buckets: [
        { bucketId: "base_damage", value: 100 },
        {
          bucketId: "defense",
          value: 0.5,
          provenance: { kind: "derived", source: "deriveDefenseBucket" },
        },
      ],
    })

    expect(derived.ok && derived.buckets.at(-1)).toMatchObject({
      bucketId: "defense",
      value: 0.5,
      source: "ignored",
      provenance: { kind: "derived", source: "deriveDefenseBucket" },
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

  it.each([
    ["regular_damage", "base_damage"],
    ["regular_damage", "damage_bonus"],
    ["regular_damage", "crit"],
    ["sheer_damage", "sheer_damage_bonus"],
    ["regular_damage", "resistance"],
    ["regular_damage", "damage_taken"],
    ["regular_damage", "stun_damage_taken"],
    ["regular_damage", "special"],
  ] as const)(
    "rejects derived direct values for %s/%s",
    (formulaId, bucketId) => {
      const buckets: Bucket[] =
        bucketId === "base_damage"
          ? [
              {
                bucketId,
                value: 100,
                provenance: { kind: "derived", source: "unsupportedHelper" },
              },
            ]
          : [
              { bucketId: "base_damage", value: 100 },
              {
                bucketId,
                value: 1,
                provenance: { kind: "derived", source: "unsupportedHelper" },
              },
            ]

      expect(calculate({ formulaId, buckets })).toMatchObject({
        ok: false,
        formulaId,
        error: {
          code: "unsupported_derived_value",
          bucketId,
          message: `${bucketId} does not support derived values in Phase 6A; pass a manual normalized value.`,
        },
        warnings: [],
      })
    },
  )

  it("uses global validation priority regardless of bucket order", () => {
    const buckets: Bucket[] = [
      { bucketId: "base_damage", value: Number.NaN },
      {
        bucketId: "crit",
        value: 1,
        provenance: { kind: "derived", source: "unsupportedHelper" },
      },
    ]
    const expected = {
      ok: false,
      formulaId: "regular_damage",
      error: {
        code: "unsupported_derived_value",
        bucketId: "crit",
      },
      warnings: [],
    }

    const forward = calculate({ formulaId: "regular_damage", buckets })
    const reverse = calculate({
      formulaId: "regular_damage",
      buckets: [buckets[1], buckets[0]],
    })

    expect(forward).toMatchObject(expected)
    expect(reverse).toEqual(forward)
  })

  it("uses canonical bucket order to break same-class validation ties", () => {
    const buckets: Bucket[] = [
      { bucketId: "crit", value: Number.POSITIVE_INFINITY },
      { bucketId: "base_damage", value: Number.NaN },
    ]
    const expected = {
      ok: false,
      formulaId: "regular_damage",
      error: { code: "invalid_number", bucketId: "base_damage" },
      warnings: [],
    }

    const forward = calculate({ formulaId: "regular_damage", buckets })
    const reverse = calculate({
      formulaId: "regular_damage",
      buckets: [buckets[1], buckets[0]],
    })

    expect(forward).toMatchObject(expected)
    expect(reverse).toEqual(forward)
  })

  it("uses canonical bucket order to break derived-value ties", () => {
    const buckets: Bucket[] = [
      {
        bucketId: "crit",
        value: 1,
        provenance: { kind: "derived", source: "derivedCrit" },
      },
      {
        bucketId: "base_damage",
        value: 100,
        provenance: { kind: "derived", source: "derivedBaseDamage" },
      },
    ]
    const expected = {
      ok: false,
      formulaId: "regular_damage",
      error: {
        code: "unsupported_derived_value",
        bucketId: "base_damage",
      },
      warnings: [],
    }

    const forward = calculate({ formulaId: "regular_damage", buckets })
    const reverse = calculate({
      formulaId: "regular_damage",
      buckets: [buckets[1], buckets[0]],
    })

    expect(forward).toMatchObject(expected)
    expect(reverse).toEqual(forward)
  })

  it("uses canonical bucket order to break duplicate bucket ties", () => {
    const buckets: Bucket[] = [
      { bucketId: "crit", value: 1 },
      { bucketId: "crit", value: 2 },
      { bucketId: "base_damage", value: 100 },
      { bucketId: "base_damage", value: 200 },
    ]
    const expected = {
      ok: false,
      formulaId: "regular_damage",
      error: { code: "duplicate_bucket", bucketId: "base_damage" },
      warnings: [],
    }

    const forward = calculate({ formulaId: "regular_damage", buckets })
    const reverse = calculate({
      formulaId: "regular_damage",
      buckets: [buckets[3], buckets[2], buckets[1], buckets[0]],
    })

    expect(forward).toMatchObject(expected)
    expect(reverse).toEqual(forward)
  })

  it("returns result snapshots that do not alias caller input", () => {
    const directProvenance = {
      kind: "manual" as const,
      source: "manualBaseDamage",
      note: "before",
    }
    const contribution = {
      value: 0.2,
      source: "skill_buff",
      note: "before",
    }
    const contributions = [contribution]
    const contributionProvenance = {
      kind: "manual" as const,
      source: "manual_input",
      note: "before",
    }

    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        {
          bucketId: "base_damage",
          value: 100,
          provenance: directProvenance,
        },
        {
          bucketId: "damage_bonus",
          contributions,
          provenance: contributionProvenance,
        },
        { bucketId: "defense", value: 1 },
      ],
    })

    expect(result).toMatchObject({
      ok: true,
      value: 120,
    })

    directProvenance.source = "mutated_base"
    directProvenance.note = "after"
    contribution.value = 999
    contribution.source = "mutated_contribution"
    contribution.note = "after"
    contributions.push({ value: 1, source: "late_contribution", note: "late" })
    contributionProvenance.source = "mutated_provenance"
    contributionProvenance.note = "after"

    if (!result.ok) {
      throw new Error("expected regular_damage calculation to succeed")
    }

    expect(
      result.buckets.find((bucket) => bucket.bucketId === "base_damage"),
    ).toMatchObject({
      provenance: {
        kind: "manual",
        source: "manualBaseDamage",
        note: "before",
      },
    })

    expect(
      result.buckets.find((bucket) => bucket.bucketId === "damage_bonus"),
    ).toMatchObject({
      contributions: [{ value: 0.2, source: "skill_buff", note: "before" }],
      provenance: {
        kind: "manual",
        source: "manual_input",
        note: "before",
      },
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

  it("rejects non-string formula ids without property-key coercion", () => {
    let coercions = 0
    const statefulFormulaId = {
      [Symbol.toPrimitive]() {
        coercions += 1
        return coercions === 1 ? "regular_damage" : "constructor"
      },
    }
    const invalidFormulaIds: unknown[] = [
      ["regular_damage"],
      { toString: () => "regular_damage" },
      Symbol("regular_damage"),
      statefulFormulaId,
    ]

    for (const formulaId of invalidFormulaIds) {
      const result = calculate({
        formulaId,
        buckets: [{ bucketId: "base_damage", value: 100 }],
      } as unknown as CalculationInput)

      expect(result).toMatchObject({
        ok: false,
        error: { code: "unsupported_formula" },
        warnings: [],
      })
      expect(!result.ok && result.formulaId).toBeUndefined()
    }

    expect(coercions).toBe(0)
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

  it("returns bucket-level invalid_number when finite contributions overflow", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        {
          bucketId: "base_damage",
          contributions: [
            { value: Number.MAX_VALUE },
            { value: Number.MAX_VALUE },
          ],
        },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "invalid_number", bucketId: "base_damage" },
      warnings: [],
    })
  })

  it("rejects an overflowed contribution bucket before it can multiply by zero", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: 0 },
        {
          bucketId: "damage_bonus",
          contributions: [
            { value: Number.MAX_VALUE },
            { value: Number.MAX_VALUE },
          ],
        },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: { code: "invalid_number", bucketId: "damage_bonus" },
      warnings: [],
    })
  })

  it("returns formula-level invalid_number when finite factors overflow", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: Number.MAX_VALUE },
        { bucketId: "crit", value: 2 },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: {
        code: "invalid_number",
        message: "Calculation result must be a finite number.",
      },
    })
    expect(result.ok || result.error).not.toHaveProperty("bucketId")
  })

  it("returns formula-level invalid_number when finite factors become NaN", () => {
    const result = calculate({
      formulaId: "regular_damage",
      buckets: [
        { bucketId: "base_damage", value: Number.MAX_VALUE },
        { bucketId: "damage_bonus", value: 2 },
        { bucketId: "crit", value: 0 },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      formulaId: "regular_damage",
      error: {
        code: "invalid_number",
        message: "Calculation result must be a finite number.",
      },
    })
    expect(result.ok || result.error).not.toHaveProperty("bucketId")
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

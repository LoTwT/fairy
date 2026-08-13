import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_BUILDUP_FORMULA_ID,
  DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  anomalyBuildupFormula,
  calculateAnomalyTriggerThreshold,
  type AnomalyBuildupFormulaInput,
  type AnomalyBuildupRateFactorInput,
  type AnomalyMasteryFactorInput,
  type AnomalyTriggerThresholdKind,
  type AnomalyTriggerThresholdTier,
  type BaseAnomalyBuildupFactorInput,
  type CalculateAnomalyTriggerThresholdParams,
  type Formula,
  type ResistanceFactorInput,
} from "../src/index.ts"

function createAnomalyBuildupInput(
  baseAnomalyBuildup: BaseAnomalyBuildupFactorInput,
): AnomalyBuildupFormulaInput {
  return {
    baseAnomalyBuildup,
    anomalyMastery: DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
    anomalyBuildupRate: DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
  }
}

function createAnomalyTriggerThresholdParams(): CalculateAnomalyTriggerThresholdParams {
  return {
    thresholdTier: "normal",
    thresholdKind: "standard",
    previousAnomalyTriggerCountForAttribute: 0,
    baseThresholdMultiplier: 1,
    scenarioThresholdMultiplier: 1,
  }
}

const ANOMALY_TRIGGER_THRESHOLD_TABLE_CASES = [
  ["normal", "standard", [600, 612, 624, 636, 648, 660, 673, 686, 699, 712]],
  ["normal", "physical", [720, 734, 748, 762, 777, 792, 807, 823, 839, 855]],
  [
    "elite",
    "standard",
    [2250, 2295, 2340, 2386, 2433, 2481, 2530, 2580, 2631, 2683],
  ],
  [
    "elite",
    "physical",
    [2700, 2754, 2809, 2865, 2922, 2980, 3039, 3099, 3160, 3223],
  ],
  [
    "boss",
    "standard",
    [3000, 3060, 3121, 3183, 3246, 3310, 3376, 3443, 3511, 3581],
  ],
  [
    "boss",
    "physical",
    [3600, 3672, 3745, 3819, 3895, 3972, 4051, 4132, 4214, 4298],
  ],
] as const satisfies readonly (readonly [
  AnomalyTriggerThresholdTier,
  AnomalyTriggerThresholdKind,
  readonly number[],
])[]

describe("anomalyBuildupFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyBuildupFormulaInput>().toEqualTypeOf<{
      readonly baseAnomalyBuildup: BaseAnomalyBuildupFactorInput
      readonly anomalyMastery: AnomalyMasteryFactorInput
      readonly anomalyBuildupRate: AnomalyBuildupRateFactorInput
      readonly resistance: ResistanceFactorInput
    }>()
    expectTypeOf(ANOMALY_BUILDUP_FORMULA_ID).toEqualTypeOf<"anomaly_buildup">()
    expectTypeOf(anomalyBuildupFormula).toEqualTypeOf<
      Formula<AnomalyBuildupFormulaInput>
    >()

    expect(ANOMALY_BUILDUP_FORMULA_ID).toBe("anomaly_buildup")
    expect(anomalyBuildupFormula.formulaId).toBe(ANOMALY_BUILDUP_FORMULA_ID)
    expect(Object.isFrozen(anomalyBuildupFormula)).toBe(true)
  })

  it("uses explicit default inputs as identity multipliers", () => {
    const result = anomalyBuildupFormula.calculate(
      createAnomalyBuildupInput(123),
    )

    expect(result).toEqual({
      value: 123,
      factorResults: {
        baseAnomalyBuildup: 123,
        anomalyMastery: 1,
        anomalyBuildupRate: 1,
        resistance: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseAnomalyBuildup",
      "anomalyMastery",
      "anomalyBuildupRate",
      "resistance",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for zero base anomaly buildup", () => {
    expect(
      anomalyBuildupFormula.calculate(createAnomalyBuildupInput(0)),
    ).toEqual({
      value: 0,
      factorResults: {
        baseAnomalyBuildup: 0,
        anomalyMastery: 1,
        anomalyBuildupRate: 1,
        resistance: 1,
      },
    })
  })

  it("calculates and returns every factor result without additional rounding", () => {
    const baseAnomalyBuildup = 100
    const anomalyMastery = Math.floor(150.9) / 100
    const anomalyBuildupRate = 1 + (0.2 - 0.05)
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const input: AnomalyBuildupFormulaInput = {
      baseAnomalyBuildup,
      anomalyMastery: 150.9,
      anomalyBuildupRate: [0.2, -0.05],
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
    }

    expect(anomalyBuildupFormula.calculate(input)).toEqual({
      value:
        baseAnomalyBuildup * anomalyMastery * anomalyBuildupRate * resistance,
      factorResults: {
        baseAnomalyBuildup,
        anomalyMastery,
        anomalyBuildupRate,
        resistance,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const anomalyBuildupRate = Object.freeze([0.2, -0.05])
    const targetResistanceReductions = Object.freeze([0.1])
    const attackerResistanceIgnoreValues = Object.freeze([0.05])
    const resistance = Object.freeze({
      targetResistance: 0.2,
      targetResistanceReductions,
      attackerResistanceIgnoreValues,
    })
    const input = Object.freeze({
      baseAnomalyBuildup: 100,
      anomalyMastery: 150.9,
      anomalyBuildupRate,
      resistance,
    })

    anomalyBuildupFormula.calculate(input)

    expect(input).toEqual({
      baseAnomalyBuildup: 100,
      anomalyMastery: 150.9,
      anomalyBuildupRate: [0.2, -0.05],
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(anomalyBuildupRate)).toBe(true)
    expect(Object.isFrozen(resistance)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createAnomalyBuildupInput(100)
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        anomalyBuildupFormula.calculate(
          input as unknown as AnomalyBuildupFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseAnomalyBuildup",
    "anomalyMastery",
    "anomalyBuildupRate",
    "resistance",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createAnomalyBuildupInput(100)
    const missingInput: Partial<AnomalyBuildupFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as AnomalyBuildupFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        anomalyBuildupFormula.calculate(
          input as unknown as AnomalyBuildupFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating later factors when base anomaly buildup is zero", () => {
    const input = {
      ...createAnomalyBuildupInput(0),
      resistance: {
        targetResistance: NaN,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
    }

    expect(() => anomalyBuildupFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating later factors when an earlier multiplier is zero", () => {
    const input = {
      ...createAnomalyBuildupInput(100),
      anomalyBuildupRate: [-1],
      resistance: {
        targetResistance: NaN,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
    }

    expect(() => anomalyBuildupFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: AnomalyBuildupFormulaInput = {
      ...createAnomalyBuildupInput(Number.MAX_VALUE),
      anomalyMastery: 300,
      anomalyBuildupRate: [-1],
    }

    expect(() => anomalyBuildupFormula.calculate(input)).toThrow(RangeError)
  })
})

describe("calculateAnomalyTriggerThreshold", () => {
  it("exposes its public parameter and function types", () => {
    expectTypeOf<AnomalyTriggerThresholdTier>().toEqualTypeOf<
      "normal" | "elite" | "boss"
    >()
    expectTypeOf<AnomalyTriggerThresholdKind>().toEqualTypeOf<
      "standard" | "physical"
    >()
    expectTypeOf<CalculateAnomalyTriggerThresholdParams>().toEqualTypeOf<{
      readonly thresholdTier: AnomalyTriggerThresholdTier
      readonly thresholdKind: AnomalyTriggerThresholdKind
      readonly previousAnomalyTriggerCountForAttribute: number
      readonly baseThresholdMultiplier: number
      readonly scenarioThresholdMultiplier: number
    }>()
    expectTypeOf(calculateAnomalyTriggerThreshold).toEqualTypeOf<
      (params: CalculateAnomalyTriggerThresholdParams) => number
    >()
  })

  it.each(ANOMALY_TRIGGER_THRESHOLD_TABLE_CASES)(
    "returns every %s %s fixed threshold",
    (thresholdTier, thresholdKind, thresholds) => {
      for (const [
        previousAnomalyTriggerCountForAttribute,
        expected,
      ] of thresholds.entries()) {
        expect(
          calculateAnomalyTriggerThreshold({
            thresholdTier,
            thresholdKind,
            previousAnomalyTriggerCountForAttribute,
            baseThresholdMultiplier: 1,
            scenarioThresholdMultiplier: 1,
          }),
        ).toBe(expected)
      }
    },
  )

  it("uses the fixed physical table instead of deriving it from the standard table", () => {
    const threshold = calculateAnomalyTriggerThreshold({
      thresholdTier: "normal",
      thresholdKind: "physical",
      previousAnomalyTriggerCountForAttribute: 1,
      baseThresholdMultiplier: 1,
      scenarioThresholdMultiplier: 1,
    })

    expect(threshold).toBe(734)
    expect(threshold).not.toBe(612 * 1.2)
  })

  it.each([9, 10, 100, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE])(
    "uses the 9+ threshold for the trigger count %s",
    (previousAnomalyTriggerCountForAttribute) => {
      expect(
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          previousAnomalyTriggerCountForAttribute,
        }),
      ).toBe(712)
    },
  )

  it("preserves the table, base multiplier, scenario multiplier order", () => {
    const tableThreshold = 600
    const baseThresholdMultiplier = 1.1
    const scenarioThresholdMultiplier = 1.3
    const expected =
      tableThreshold * baseThresholdMultiplier * scenarioThresholdMultiplier
    const swapped =
      tableThreshold * scenarioThresholdMultiplier * baseThresholdMultiplier
    const regrouped =
      tableThreshold * (baseThresholdMultiplier * scenarioThresholdMultiplier)

    expect(expected).not.toBe(swapped)
    expect(expected).not.toBe(regrouped)
    expect(
      calculateAnomalyTriggerThreshold({
        ...createAnomalyTriggerThresholdParams(),
        baseThresholdMultiplier,
        scenarioThresholdMultiplier,
      }),
    ).toBe(expected)
  })

  it("preserves IEEE 754 error without rounding the guide example", () => {
    const threshold = calculateAnomalyTriggerThreshold({
      thresholdTier: "boss",
      thresholdKind: "standard",
      previousAnomalyTriggerCountForAttribute: 0,
      baseThresholdMultiplier: 1.2,
      scenarioThresholdMultiplier: 1.1,
    })

    expect(threshold).toBe(3000 * 1.2 * 1.1)
    expect(threshold).not.toBe(3960)
  })

  it("accepts a multiplier above the documented examples when the result stays finite", () => {
    const baseThresholdMultiplier = Number.MAX_VALUE / 1000

    expect(
      calculateAnomalyTriggerThreshold({
        ...createAnomalyTriggerThresholdParams(),
        baseThresholdMultiplier,
      }),
    ).toBe(600 * baseThresholdMultiplier)
  })

  it("does not modify its parameter object", () => {
    const params = Object.freeze({
      thresholdTier: "elite" as const,
      thresholdKind: "physical" as const,
      previousAnomalyTriggerCountForAttribute: 3,
      baseThresholdMultiplier: 1.2,
      scenarioThresholdMultiplier: 1.1,
    })

    calculateAnomalyTriggerThreshold(params)

    expect(params).toEqual({
      thresholdTier: "elite",
      thresholdKind: "physical",
      previousAnomalyTriggerCountForAttribute: 3,
      baseThresholdMultiplier: 1.2,
      scenarioThresholdMultiplier: 1.1,
    })
    expect(Object.isFrozen(params)).toBe(true)
  })

  it("rejects parameters that are not non-array objects", () => {
    const fields = createAnomalyTriggerThresholdParams()
    const invalidParams = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const params of invalidParams) {
      expect(() =>
        calculateAnomalyTriggerThreshold(
          params as unknown as CalculateAnomalyTriggerThresholdParams,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([undefined, null, 1, true, {}])(
    "rejects the non-string threshold tier %s",
    (thresholdTier) => {
      expect(() =>
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          thresholdTier,
        } as unknown as CalculateAnomalyTriggerThresholdParams),
      ).toThrow(TypeError)
    },
  )

  it.each(["", "Normal", "normal ", "unknown"])(
    "rejects the unsupported threshold tier %s",
    (thresholdTier) => {
      expect(() =>
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          thresholdTier,
        } as CalculateAnomalyTriggerThresholdParams),
      ).toThrow(RangeError)
    },
  )

  it.each([undefined, null, 1, true, {}])(
    "rejects the non-string threshold kind %s",
    (thresholdKind) => {
      expect(() =>
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          thresholdKind,
        } as unknown as CalculateAnomalyTriggerThresholdParams),
      ).toThrow(TypeError)
    },
  )

  it.each(["", "Standard", "standard ", "wind", "unknown"])(
    "rejects the unsupported threshold kind %s",
    (thresholdKind) => {
      expect(() =>
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          thresholdKind,
        } as CalculateAnomalyTriggerThresholdParams),
      ).toThrow(RangeError)
    },
  )

  it.each([undefined, null, "0", true])(
    "rejects the non-number trigger count %s",
    (previousAnomalyTriggerCountForAttribute) => {
      expect(() =>
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          previousAnomalyTriggerCountForAttribute,
        } as unknown as CalculateAnomalyTriggerThresholdParams),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, -1, -Number.EPSILON, 0.5])(
    "rejects the invalid trigger count %s",
    (previousAnomalyTriggerCountForAttribute) => {
      expect(() =>
        calculateAnomalyTriggerThreshold({
          ...createAnomalyTriggerThresholdParams(),
          previousAnomalyTriggerCountForAttribute,
        }),
      ).toThrow(RangeError)
    },
  )

  it.each(["baseThresholdMultiplier", "scenarioThresholdMultiplier"] as const)(
    "rejects non-number values for %s",
    (field) => {
      for (const invalidMultiplier of [undefined, null, "1", true]) {
        expect(() =>
          calculateAnomalyTriggerThreshold({
            ...createAnomalyTriggerThresholdParams(),
            [field]: invalidMultiplier,
          } as unknown as CalculateAnomalyTriggerThresholdParams),
        ).toThrow(TypeError)
      }
    },
  )

  it.each(["baseThresholdMultiplier", "scenarioThresholdMultiplier"] as const)(
    "rejects invalid numeric values for %s",
    (field) => {
      for (const invalidMultiplier of [
        NaN,
        Infinity,
        -Infinity,
        -1,
        0,
        1 - Number.EPSILON,
      ]) {
        expect(() =>
          calculateAnomalyTriggerThreshold({
            ...createAnomalyTriggerThresholdParams(),
            [field]: invalidMultiplier,
          }),
        ).toThrow(RangeError)
      }
    },
  )

  it("rejects a non-finite calculated threshold", () => {
    expect(() =>
      calculateAnomalyTriggerThreshold({
        ...createAnomalyTriggerThresholdParams(),
        baseThresholdMultiplier: Number.MAX_VALUE,
      }),
    ).toThrow(RangeError)
  })
})

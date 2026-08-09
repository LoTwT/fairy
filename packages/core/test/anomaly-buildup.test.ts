import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_BUILDUP_FORMULA_ID,
  DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  anomalyBuildupFormula,
  type AnomalyBuildupFormulaInput,
  type AnomalyBuildupRateFactorInput,
  type AnomalyMasteryFactorInput,
  type BaseAnomalyBuildupFactorInput,
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

import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DECIBEL_GENERATION_FORMULA_ID,
  decibelGenerationFormula,
  type AccompanyingDecibelGenerationRateFactorInput,
  type BaseDecibelGenerationFactorInput,
  type DecibelGenerationFormulaInput,
  type DecibelGenerationRateFactorInput,
  type Formula,
} from "../src/index.ts"

function createDecibelGenerationInput(
  baseDecibelGeneration: BaseDecibelGenerationFactorInput,
): DecibelGenerationFormulaInput {
  return {
    baseDecibelGeneration,
    decibelGenerationRate: DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
    accompanyingDecibelGenerationRate:
      DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  }
}

describe("decibelGenerationFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DecibelGenerationFormulaInput>().toEqualTypeOf<{
      readonly baseDecibelGeneration: BaseDecibelGenerationFactorInput
      readonly decibelGenerationRate: DecibelGenerationRateFactorInput
      readonly accompanyingDecibelGenerationRate: AccompanyingDecibelGenerationRateFactorInput
    }>()
    expectTypeOf(
      DECIBEL_GENERATION_FORMULA_ID,
    ).toEqualTypeOf<"decibel_generation">()
    expectTypeOf(decibelGenerationFormula).toEqualTypeOf<
      Formula<DecibelGenerationFormulaInput>
    >()

    expect(DECIBEL_GENERATION_FORMULA_ID).toBe("decibel_generation")
    expect(decibelGenerationFormula.formulaId).toBe(
      DECIBEL_GENERATION_FORMULA_ID,
    )
    expect(Object.isFrozen(decibelGenerationFormula)).toBe(true)
  })

  it("uses the explicit default multiplier inputs as identity multipliers", () => {
    const result = decibelGenerationFormula.calculate(
      createDecibelGenerationInput(100),
    )

    expect(result).toEqual({
      value: 100,
      factorResults: {
        baseDecibelGeneration: 100,
        decibelGenerationRate: 1,
        accompanyingDecibelGenerationRate: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseDecibelGeneration",
      "decibelGenerationRate",
      "accompanyingDecibelGenerationRate",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for zero base generation", () => {
    expect(
      decibelGenerationFormula.calculate(createDecibelGenerationInput(0)),
    ).toEqual({
      value: 0,
      factorResults: {
        baseDecibelGeneration: 0,
        decibelGenerationRate: 1,
        accompanyingDecibelGenerationRate: 1,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseDecibelGeneration = 100.5
    const decibelGenerationRate = 1 + (0.2 - 0.05)
    const accompanyingDecibelGenerationRate = 0.525
    const input: DecibelGenerationFormulaInput = {
      baseDecibelGeneration,
      decibelGenerationRate: [0.2, -0.05],
      accompanyingDecibelGenerationRate,
    }

    expect(decibelGenerationFormula.calculate(input)).toEqual({
      value:
        baseDecibelGeneration *
        decibelGenerationRate *
        accompanyingDecibelGenerationRate,
      factorResults: {
        baseDecibelGeneration,
        decibelGenerationRate,
        accompanyingDecibelGenerationRate,
      },
    })
  })

  it("does not modify the formula input or nested factor input", () => {
    const decibelGenerationRate = Object.freeze([0.2, -0.05])
    const input = Object.freeze({
      baseDecibelGeneration: 100.5,
      decibelGenerationRate,
      accompanyingDecibelGenerationRate: 0.525,
    })

    decibelGenerationFormula.calculate(input)

    expect(input).toEqual({
      baseDecibelGeneration: 100.5,
      decibelGenerationRate: [0.2, -0.05],
      accompanyingDecibelGenerationRate: 0.525,
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(decibelGenerationRate)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createDecibelGenerationInput(100)
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        decibelGenerationFormula.calculate(
          input as unknown as DecibelGenerationFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseDecibelGeneration",
    "decibelGenerationRate",
    "accompanyingDecibelGenerationRate",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createDecibelGenerationInput(100)
    const missingInput: Partial<DecibelGenerationFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as DecibelGenerationFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        decibelGenerationFormula.calculate(
          input as unknown as DecibelGenerationFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating the generation rate when base generation is zero", () => {
    const input = {
      ...createDecibelGenerationInput(0),
      decibelGenerationRate: [NaN],
    }

    expect(() => decibelGenerationFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating the accompanying rate when an earlier multiplier is zero", () => {
    const input: DecibelGenerationFormulaInput = {
      baseDecibelGeneration: 100,
      decibelGenerationRate: [-1],
      accompanyingDecibelGenerationRate: NaN,
    }

    expect(() => decibelGenerationFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflow followed by zero", () => {
    const input: DecibelGenerationFormulaInput = {
      baseDecibelGeneration: Number.MAX_VALUE,
      decibelGenerationRate: [2],
      accompanyingDecibelGenerationRate: 0,
    }

    expect(() => decibelGenerationFormula.calculate(input)).toThrow(RangeError)
  })
})

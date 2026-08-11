import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ADRENALINE_GENERATION_FORMULA_ID,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  adrenalineGenerationFormula,
  type AdrenalineGenerationFormulaInput,
  type AdrenalineGenerationRateFactorInput,
  type BaseAdrenalineGenerationFactorInput,
  type Formula,
} from "../src/index.ts"

function createAdrenalineGenerationInput(
  baseAdrenalineGeneration: BaseAdrenalineGenerationFactorInput,
): AdrenalineGenerationFormulaInput {
  return {
    baseAdrenalineGeneration,
    adrenalineGenerationRate: DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  }
}

describe("adrenalineGenerationFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AdrenalineGenerationFormulaInput>().toEqualTypeOf<{
      readonly baseAdrenalineGeneration: BaseAdrenalineGenerationFactorInput
      readonly adrenalineGenerationRate: AdrenalineGenerationRateFactorInput
    }>()
    expectTypeOf(
      ADRENALINE_GENERATION_FORMULA_ID,
    ).toEqualTypeOf<"adrenaline_generation">()
    expectTypeOf(adrenalineGenerationFormula).toEqualTypeOf<
      Formula<AdrenalineGenerationFormulaInput>
    >()

    expect(ADRENALINE_GENERATION_FORMULA_ID).toBe("adrenaline_generation")
    expect(adrenalineGenerationFormula.formulaId).toBe(
      ADRENALINE_GENERATION_FORMULA_ID,
    )
    expect(Object.isFrozen(adrenalineGenerationFormula)).toBe(true)
  })

  it("uses the explicit default adrenaline generation rate as an identity multiplier", () => {
    const result = adrenalineGenerationFormula.calculate(
      createAdrenalineGenerationInput({
        baseAdrenalineGenerationValues: [10],
        finalAdrenalineRegen: 5,
        effectiveAdrenalineRegenDurationInSeconds: 2,
      }),
    )

    expect(result).toEqual({
      value: 20,
      factorResults: {
        baseAdrenalineGeneration: 20,
        adrenalineGenerationRate: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseAdrenalineGeneration",
      "adrenalineGenerationRate",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for zero base adrenaline generation", () => {
    expect(
      adrenalineGenerationFormula.calculate(
        createAdrenalineGenerationInput({
          baseAdrenalineGenerationValues: [],
          finalAdrenalineRegen: 0,
          effectiveAdrenalineRegenDurationInSeconds: 0,
        }),
      ),
    ).toEqual({
      value: 0,
      factorResults: {
        baseAdrenalineGeneration: 0,
        adrenalineGenerationRate: 1,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseAdrenalineGeneration = 10.5 + 2.25 + 1.2 * 2.5
    const adrenalineGenerationRate = 1 + (0.15 - 0.05)
    const input: AdrenalineGenerationFormulaInput = {
      baseAdrenalineGeneration: {
        baseAdrenalineGenerationValues: [10.5, 2.25],
        finalAdrenalineRegen: 1.2,
        effectiveAdrenalineRegenDurationInSeconds: 2.5,
      },
      adrenalineGenerationRate: [0.15, -0.05],
    }

    expect(adrenalineGenerationFormula.calculate(input)).toEqual({
      value: baseAdrenalineGeneration * adrenalineGenerationRate,
      factorResults: {
        baseAdrenalineGeneration,
        adrenalineGenerationRate,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const baseAdrenalineGenerationValues = Object.freeze([10.5, 2.25])
    const baseAdrenalineGeneration = Object.freeze({
      baseAdrenalineGenerationValues,
      finalAdrenalineRegen: 1.2,
      effectiveAdrenalineRegenDurationInSeconds: 2.5,
    })
    const adrenalineGenerationRate = Object.freeze([0.15, -0.05])
    const input = Object.freeze({
      baseAdrenalineGeneration,
      adrenalineGenerationRate,
    })

    adrenalineGenerationFormula.calculate(input)

    expect(input).toEqual({
      baseAdrenalineGeneration: {
        baseAdrenalineGenerationValues: [10.5, 2.25],
        finalAdrenalineRegen: 1.2,
        effectiveAdrenalineRegenDurationInSeconds: 2.5,
      },
      adrenalineGenerationRate: [0.15, -0.05],
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseAdrenalineGeneration)).toBe(true)
    expect(Object.isFrozen(baseAdrenalineGenerationValues)).toBe(true)
    expect(Object.isFrozen(adrenalineGenerationRate)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createAdrenalineGenerationInput({
      baseAdrenalineGenerationValues: [],
      finalAdrenalineRegen: 0,
      effectiveAdrenalineRegenDurationInSeconds: 0,
    })
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        adrenalineGenerationFormula.calculate(
          input as unknown as AdrenalineGenerationFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each(["baseAdrenalineGeneration", "adrenalineGenerationRate"] as const)(
    "rejects a missing or undefined %s input",
    (field) => {
      const completeInput = createAdrenalineGenerationInput({
        baseAdrenalineGenerationValues: [10],
        finalAdrenalineRegen: 5,
        effectiveAdrenalineRegenDurationInSeconds: 2,
      })
      const missingInput: Partial<AdrenalineGenerationFormulaInput> = {
        ...completeInput,
      }
      const undefinedInput = {
        ...completeInput,
        [field]: undefined,
      } as unknown as AdrenalineGenerationFormulaInput

      delete missingInput[field]

      for (const input of [missingInput, undefinedInput]) {
        expect(() =>
          adrenalineGenerationFormula.calculate(
            input as unknown as AdrenalineGenerationFormulaInput,
          ),
        ).toThrow(TypeError)
      }
    },
  )

  it("does not stop validating adrenaline generation rate when base adrenaline generation is zero", () => {
    const input = {
      ...createAdrenalineGenerationInput({
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
      adrenalineGenerationRate: [NaN],
    }

    expect(() => adrenalineGenerationFormula.calculate(input)).toThrow(
      RangeError,
    )
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: AdrenalineGenerationFormulaInput = {
      baseAdrenalineGeneration: {
        baseAdrenalineGenerationValues: [Number.MAX_VALUE],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      },
      adrenalineGenerationRate: [1],
    }

    expect(() => adrenalineGenerationFormula.calculate(input)).toThrow(
      RangeError,
    )
  })
})

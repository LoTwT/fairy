import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  ENERGY_GENERATION_FORMULA_ID,
  energyGenerationFormula,
  type BaseEnergyGenerationFactorInput,
  type EnergyGenerationFormulaInput,
  type EnergyGenerationRateFactorInput,
  type Formula,
} from "../src/index.ts"

function createEnergyGenerationInput(
  baseEnergyGeneration: BaseEnergyGenerationFactorInput,
): EnergyGenerationFormulaInput {
  return {
    baseEnergyGeneration,
    energyGenerationRate: DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  }
}

describe("energyGenerationFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<EnergyGenerationFormulaInput>().toEqualTypeOf<{
      readonly baseEnergyGeneration: BaseEnergyGenerationFactorInput
      readonly energyGenerationRate: EnergyGenerationRateFactorInput
    }>()
    expectTypeOf(
      ENERGY_GENERATION_FORMULA_ID,
    ).toEqualTypeOf<"energy_generation">()
    expectTypeOf(energyGenerationFormula).toEqualTypeOf<
      Formula<EnergyGenerationFormulaInput>
    >()

    expect(ENERGY_GENERATION_FORMULA_ID).toBe("energy_generation")
    expect(energyGenerationFormula.formulaId).toBe(ENERGY_GENERATION_FORMULA_ID)
    expect(Object.isFrozen(energyGenerationFormula)).toBe(true)
  })

  it("uses the explicit default energy generation rate as an identity multiplier", () => {
    const result = energyGenerationFormula.calculate(
      createEnergyGenerationInput({
        baseEnergyGenerationValues: [10],
        finalEnergyRegen: 5,
        effectiveEnergyRegenDurationInSeconds: 2,
      }),
    )

    expect(result).toEqual({
      value: 20,
      factorResults: {
        baseEnergyGeneration: 20,
        energyGenerationRate: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseEnergyGeneration",
      "energyGenerationRate",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for zero base energy generation", () => {
    expect(
      energyGenerationFormula.calculate(
        createEnergyGenerationInput({
          baseEnergyGenerationValues: [],
          finalEnergyRegen: 0,
          effectiveEnergyRegenDurationInSeconds: 0,
        }),
      ),
    ).toEqual({
      value: 0,
      factorResults: {
        baseEnergyGeneration: 0,
        energyGenerationRate: 1,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseEnergyGeneration = 10.5 + 2.25 + 1.2 * 2.5
    const energyGenerationRate = 1 + (0.15 - 0.05)
    const input: EnergyGenerationFormulaInput = {
      baseEnergyGeneration: {
        baseEnergyGenerationValues: [10.5, 2.25],
        finalEnergyRegen: 1.2,
        effectiveEnergyRegenDurationInSeconds: 2.5,
      },
      energyGenerationRate: [0.15, -0.05],
    }

    expect(energyGenerationFormula.calculate(input)).toEqual({
      value: baseEnergyGeneration * energyGenerationRate,
      factorResults: {
        baseEnergyGeneration,
        energyGenerationRate,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const baseEnergyGenerationValues = Object.freeze([10.5, 2.25])
    const baseEnergyGeneration = Object.freeze({
      baseEnergyGenerationValues,
      finalEnergyRegen: 1.2,
      effectiveEnergyRegenDurationInSeconds: 2.5,
    })
    const energyGenerationRate = Object.freeze([0.15, -0.05])
    const input = Object.freeze({
      baseEnergyGeneration,
      energyGenerationRate,
    })

    energyGenerationFormula.calculate(input)

    expect(input).toEqual({
      baseEnergyGeneration: {
        baseEnergyGenerationValues: [10.5, 2.25],
        finalEnergyRegen: 1.2,
        effectiveEnergyRegenDurationInSeconds: 2.5,
      },
      energyGenerationRate: [0.15, -0.05],
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseEnergyGeneration)).toBe(true)
    expect(Object.isFrozen(baseEnergyGenerationValues)).toBe(true)
    expect(Object.isFrozen(energyGenerationRate)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createEnergyGenerationInput({
      baseEnergyGenerationValues: [],
      finalEnergyRegen: 0,
      effectiveEnergyRegenDurationInSeconds: 0,
    })
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        energyGenerationFormula.calculate(
          input as unknown as EnergyGenerationFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each(["baseEnergyGeneration", "energyGenerationRate"] as const)(
    "rejects a missing or undefined %s input",
    (field) => {
      const completeInput = createEnergyGenerationInput({
        baseEnergyGenerationValues: [10],
        finalEnergyRegen: 5,
        effectiveEnergyRegenDurationInSeconds: 2,
      })
      const missingInput: Partial<EnergyGenerationFormulaInput> = {
        ...completeInput,
      }
      const undefinedInput = {
        ...completeInput,
        [field]: undefined,
      } as unknown as EnergyGenerationFormulaInput

      delete missingInput[field]

      for (const input of [missingInput, undefinedInput]) {
        expect(() =>
          energyGenerationFormula.calculate(
            input as unknown as EnergyGenerationFormulaInput,
          ),
        ).toThrow(TypeError)
      }
    },
  )

  it("does not stop validating energy generation rate when base energy generation is zero", () => {
    const input = {
      ...createEnergyGenerationInput({
        baseEnergyGenerationValues: [],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
      energyGenerationRate: [NaN],
    }

    expect(() => energyGenerationFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: EnergyGenerationFormulaInput = {
      baseEnergyGeneration: {
        baseEnergyGenerationValues: [Number.MAX_VALUE],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      },
      energyGenerationRate: [2],
    }

    expect(() => energyGenerationFormula.calculate(input)).toThrow(RangeError)
  })
})

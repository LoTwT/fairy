import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
  miasmicShieldReductionFormula,
  type BaseMiasmicShieldReductionFactorInput,
  type Formula,
  type MiasmicShieldReductionFormulaInput,
  type MiasmicShieldReductionRateFactorInput,
  type MiasmicShieldReductionTakenRateFactorInput,
} from "../src/index.ts"

function createMiasmicShieldReductionInput(
  baseMiasmicShieldReduction: BaseMiasmicShieldReductionFactorInput,
): MiasmicShieldReductionFormulaInput {
  return {
    baseMiasmicShieldReduction,
    miasmicShieldReductionRate:
      DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
    miasmicShieldReductionTakenRate:
      DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  }
}

describe("miasmicShieldReductionFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<MiasmicShieldReductionFormulaInput>().toEqualTypeOf<{
      readonly baseMiasmicShieldReduction: BaseMiasmicShieldReductionFactorInput
      readonly miasmicShieldReductionRate: MiasmicShieldReductionRateFactorInput
      readonly miasmicShieldReductionTakenRate: MiasmicShieldReductionTakenRateFactorInput
    }>()
    expectTypeOf(
      MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
    ).toEqualTypeOf<"miasmic_shield_reduction">()
    expectTypeOf(miasmicShieldReductionFormula).toEqualTypeOf<
      Formula<MiasmicShieldReductionFormulaInput>
    >()

    expect(MIASMIC_SHIELD_REDUCTION_FORMULA_ID).toBe("miasmic_shield_reduction")
    expect(miasmicShieldReductionFormula.formulaId).toBe(
      MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
    )
    expect(Object.isFrozen(miasmicShieldReductionFormula)).toBe(true)
  })

  it("uses the explicit default rate inputs as identity multipliers", () => {
    const result = miasmicShieldReductionFormula.calculate(
      createMiasmicShieldReductionInput(100),
    )

    expect(result).toEqual({
      value: 100,
      factorResults: {
        baseMiasmicShieldReduction: 100,
        miasmicShieldReductionRate: 1,
        miasmicShieldReductionTakenRate: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseMiasmicShieldReduction",
      "miasmicShieldReductionRate",
      "miasmicShieldReductionTakenRate",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for zero base reduction", () => {
    expect(
      miasmicShieldReductionFormula.calculate(
        createMiasmicShieldReductionInput(0),
      ),
    ).toEqual({
      value: 0,
      factorResults: {
        baseMiasmicShieldReduction: 0,
        miasmicShieldReductionRate: 1,
        miasmicShieldReductionTakenRate: 1,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseMiasmicShieldReduction = 100.5
    const miasmicShieldReductionRate = 1 + (0.2 - 0.05)
    const miasmicShieldReductionTakenRate = 1 + (0.1 - 0.025)
    const input: MiasmicShieldReductionFormulaInput = {
      baseMiasmicShieldReduction,
      miasmicShieldReductionRate: [0.2, -0.05],
      miasmicShieldReductionTakenRate: [0.1, -0.025],
    }

    expect(miasmicShieldReductionFormula.calculate(input)).toEqual({
      value:
        baseMiasmicShieldReduction *
        miasmicShieldReductionRate *
        miasmicShieldReductionTakenRate,
      factorResults: {
        baseMiasmicShieldReduction,
        miasmicShieldReductionRate,
        miasmicShieldReductionTakenRate,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const miasmicShieldReductionRate = Object.freeze([0.2, -0.05])
    const miasmicShieldReductionTakenRate = Object.freeze([0.1, -0.025])
    const input = Object.freeze({
      baseMiasmicShieldReduction: 100.5,
      miasmicShieldReductionRate,
      miasmicShieldReductionTakenRate,
    })

    miasmicShieldReductionFormula.calculate(input)

    expect(input).toEqual({
      baseMiasmicShieldReduction: 100.5,
      miasmicShieldReductionRate: [0.2, -0.05],
      miasmicShieldReductionTakenRate: [0.1, -0.025],
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(miasmicShieldReductionRate)).toBe(true)
    expect(Object.isFrozen(miasmicShieldReductionTakenRate)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createMiasmicShieldReductionInput(100)
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        miasmicShieldReductionFormula.calculate(
          input as unknown as MiasmicShieldReductionFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseMiasmicShieldReduction",
    "miasmicShieldReductionRate",
    "miasmicShieldReductionTakenRate",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createMiasmicShieldReductionInput(100)
    const missingInput: Partial<MiasmicShieldReductionFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as MiasmicShieldReductionFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        miasmicShieldReductionFormula.calculate(
          input as unknown as MiasmicShieldReductionFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating the reduction rate when base reduction is zero", () => {
    const input = {
      ...createMiasmicShieldReductionInput(0),
      miasmicShieldReductionRate: [NaN],
    }

    expect(() => miasmicShieldReductionFormula.calculate(input)).toThrow(
      RangeError,
    )
  })

  it("does not stop validating the taken rate when base reduction is zero", () => {
    const input = {
      ...createMiasmicShieldReductionInput(0),
      miasmicShieldReductionTakenRate: [NaN],
    }

    expect(() => miasmicShieldReductionFormula.calculate(input)).toThrow(
      RangeError,
    )
  })

  it("preserves multiplication order and rejects an overflow followed by the minimum taken rate", () => {
    const input: MiasmicShieldReductionFormulaInput = {
      baseMiasmicShieldReduction: Number.MAX_VALUE,
      miasmicShieldReductionRate: [1],
      miasmicShieldReductionTakenRate: [-0.8],
    }

    expect(() => miasmicShieldReductionFormula.calculate(input)).toThrow(
      RangeError,
    )
  })
})

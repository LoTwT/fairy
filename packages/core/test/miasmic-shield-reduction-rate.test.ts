import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
  miasmicShieldReductionRateFactor,
  type Factor,
  type MiasmicShieldReductionRateFactorInput,
} from "../src/index.ts"

describe("miasmicShieldReductionRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<MiasmicShieldReductionRateFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
    ).toEqualTypeOf<"miasmic_shield_reduction_rate">()
    expectTypeOf(
      DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<MiasmicShieldReductionRateFactorInput>()
    expectTypeOf(miasmicShieldReductionRateFactor).toEqualTypeOf<
      Factor<MiasmicShieldReductionRateFactorInput>
    >()

    expect(MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID).toBe(
      "miasmic_shield_reduction_rate",
    )
    expect(miasmicShieldReductionRateFactor.factorId).toBe(
      MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(miasmicShieldReductionRateFactor)).toBe(true)
  })

  it("provides an independently frozen default input with an identity result", () => {
    expect(DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT).toEqual([])
    expect(
      Object.isFrozen(DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT),
    ).toBe(true)
    expect(DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT).not.toBe(
      DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
    )
    expect(
      miasmicShieldReductionRateFactor.calculate(
        DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(miasmicShieldReductionRateFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(miasmicShieldReductionRateFactor.calculate([0.5, 0.25])).toBe(1.75)
    expect(miasmicShieldReductionRateFactor.calculate([0.5, -0.25])).toBe(1.25)
    expect(miasmicShieldReductionRateFactor.calculate([0.5, 0.5])).toBe(2)
  })

  it("sums inputs in array index order", () => {
    const largeValue = 2 ** 53

    expect(
      miasmicShieldReductionRateFactor.calculate([largeValue, -largeValue, 1]),
    ).toBe(2)
    expect(
      miasmicShieldReductionRateFactor.calculate([largeValue, 1, -largeValue]),
    ).toBe(1)
  })

  it("ignores a custom array iterator", () => {
    const inputs = [0.5, 0.25]

    Object.defineProperty(inputs, Symbol.iterator, {
      value: function* () {
        yield 10
      },
    })

    expect(miasmicShieldReductionRateFactor.calculate(inputs)).toBe(1.75)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(miasmicShieldReductionRateFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from 0.2 to three", () => {
    expect(miasmicShieldReductionRateFactor.calculate([-0.8])).toBe(0.2)
    expect(miasmicShieldReductionRateFactor.calculate([-10])).toBe(0.2)
    expect(miasmicShieldReductionRateFactor.calculate([2])).toBe(3)
    expect(miasmicShieldReductionRateFactor.calculate([10])).toBe(3)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.5, -0.25])

    expect(miasmicShieldReductionRateFactor.calculate(inputs)).toBe(1.25)
    expect(inputs).toEqual([0.5, -0.25])
  })

  it("rejects a non-array input", () => {
    const input = new Set([
      0.5,
    ]) as unknown as MiasmicShieldReductionRateFactorInput

    expect(() => miasmicShieldReductionRateFactor.calculate(input)).toThrow(
      TypeError,
    )
  })

  it.each([
    ["string", "0.5"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.5 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as MiasmicShieldReductionRateFactorInput

    expect(() => miasmicShieldReductionRateFactor.calculate(inputs)).toThrow(
      TypeError,
    )
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => miasmicShieldReductionRateFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => miasmicShieldReductionRateFactor.calculate(inputs)).toThrow(
      RangeError,
    )
  })
})

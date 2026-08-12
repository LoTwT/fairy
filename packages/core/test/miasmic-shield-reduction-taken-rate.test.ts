import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
  miasmicShieldReductionTakenRateFactor,
  type Factor,
  type MiasmicShieldReductionTakenRateFactorInput,
} from "../src/index.ts"

describe("miasmicShieldReductionTakenRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<MiasmicShieldReductionTakenRateFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
    ).toEqualTypeOf<"miasmic_shield_reduction_taken_rate">()
    expectTypeOf(
      DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<MiasmicShieldReductionTakenRateFactorInput>()
    expectTypeOf(miasmicShieldReductionTakenRateFactor).toEqualTypeOf<
      Factor<MiasmicShieldReductionTakenRateFactorInput>
    >()

    expect(MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID).toBe(
      "miasmic_shield_reduction_taken_rate",
    )
    expect(miasmicShieldReductionTakenRateFactor.factorId).toBe(
      MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(miasmicShieldReductionTakenRateFactor)).toBe(true)
  })

  it("provides an independently frozen default input with an identity result", () => {
    expect(DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT).toEqual([])
    expect(
      Object.isFrozen(DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT),
    ).toBe(true)
    expect(DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT).not.toBe(
      DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
    )
    expect(
      miasmicShieldReductionTakenRateFactor.calculate(
        DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(miasmicShieldReductionTakenRateFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(miasmicShieldReductionTakenRateFactor.calculate([0.025, 0.5])).toBe(
      1.525,
    )
    expect(miasmicShieldReductionTakenRateFactor.calculate([0.025, -0.5])).toBe(
      0.525,
    )
    expect(
      miasmicShieldReductionTakenRateFactor.calculate([0.025, 0.025]),
    ).toBe(1.05)
  })

  it("sums inputs in array index order", () => {
    const largeValue = 2 ** 53

    expect(
      miasmicShieldReductionTakenRateFactor.calculate([
        largeValue,
        -largeValue,
        1,
      ]),
    ).toBe(2)
    expect(
      miasmicShieldReductionTakenRateFactor.calculate([
        largeValue,
        1,
        -largeValue,
      ]),
    ).toBe(1)
  })

  it("ignores a custom array iterator", () => {
    const inputs = [0.025, -0.5]

    Object.defineProperty(inputs, Symbol.iterator, {
      value: function* () {
        yield 10
      },
    })

    expect(miasmicShieldReductionTakenRateFactor.calculate(inputs)).toBe(0.525)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(miasmicShieldReductionTakenRateFactor.calculate([input])).toBe(
      1 + input,
    )
  })

  it("clamps the result to the inclusive range from 0.2 to three", () => {
    expect(miasmicShieldReductionTakenRateFactor.calculate([-0.8])).toBe(0.2)
    expect(miasmicShieldReductionTakenRateFactor.calculate([-10])).toBe(0.2)
    expect(miasmicShieldReductionTakenRateFactor.calculate([2])).toBe(3)
    expect(miasmicShieldReductionTakenRateFactor.calculate([10])).toBe(3)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.025, -0.5])

    expect(miasmicShieldReductionTakenRateFactor.calculate(inputs)).toBe(0.525)
    expect(inputs).toEqual([0.025, -0.5])
  })

  it("rejects a non-array input", () => {
    const input = new Set([
      0.025,
    ]) as unknown as MiasmicShieldReductionTakenRateFactorInput

    expect(() =>
      miasmicShieldReductionTakenRateFactor.calculate(input),
    ).toThrow(TypeError)
  })

  it.each([
    ["string", "0.025"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.025 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [
      input,
    ] as unknown as MiasmicShieldReductionTakenRateFactorInput

    expect(() =>
      miasmicShieldReductionTakenRateFactor.calculate(inputs),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() =>
        miasmicShieldReductionTakenRateFactor.calculate([input]),
      ).toThrow(RangeError)
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() =>
      miasmicShieldReductionTakenRateFactor.calculate(inputs),
    ).toThrow(RangeError)
  })
})

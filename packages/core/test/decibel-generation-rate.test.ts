import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DECIBEL_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  decibelGenerationRateFactor,
  type DecibelGenerationRateFactorInput,
  type Factor,
} from "../src/index.ts"

describe("decibelGenerationRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DecibelGenerationRateFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      DECIBEL_GENERATION_RATE_FACTOR_ID,
    ).toEqualTypeOf<"decibel_generation_rate">()
    expectTypeOf(
      DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<DecibelGenerationRateFactorInput>()
    expectTypeOf(decibelGenerationRateFactor).toEqualTypeOf<
      Factor<DecibelGenerationRateFactorInput>
    >()

    expect(DECIBEL_GENERATION_RATE_FACTOR_ID).toBe("decibel_generation_rate")
    expect(decibelGenerationRateFactor.factorId).toBe(
      DECIBEL_GENERATION_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(decibelGenerationRateFactor)).toBe(true)
  })

  it("provides an independently frozen default input with an identity result", () => {
    expect(DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT).toEqual([])
    expect(Object.isFrozen(DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT)).toBe(
      true,
    )
    expect(DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT).not.toBe(
      DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
    )
    expect(DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT).not.toBe(
      DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
    )
    expect(
      decibelGenerationRateFactor.calculate(
        DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(decibelGenerationRateFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(decibelGenerationRateFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(decibelGenerationRateFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(decibelGenerationRateFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(
      decibelGenerationRateFactor.calculate([largeValue, -largeValue, 1]),
    ).toBe(2)
    expect(
      decibelGenerationRateFactor.calculate([largeValue, 1, -largeValue]),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(decibelGenerationRateFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from zero to three", () => {
    expect(decibelGenerationRateFactor.calculate([-2])).toBe(0)
    expect(decibelGenerationRateFactor.calculate([-1])).toBe(0)
    expect(decibelGenerationRateFactor.calculate([2])).toBe(3)
    expect(decibelGenerationRateFactor.calculate([10])).toBe(3)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(decibelGenerationRateFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([0.25]) as unknown as DecibelGenerationRateFactorInput

    expect(() => decibelGenerationRateFactor.calculate(input)).toThrow(
      TypeError,
    )
  })

  it.each([
    ["string", "0.25"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.25 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as DecibelGenerationRateFactorInput

    expect(() => decibelGenerationRateFactor.calculate(inputs)).toThrow(
      TypeError,
    )
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => decibelGenerationRateFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => decibelGenerationRateFactor.calculate(inputs)).toThrow(
      RangeError,
    )
  })
})

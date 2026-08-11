import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ADRENALINE_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  adrenalineGenerationRateFactor,
  type AdrenalineGenerationRateFactorInput,
  type Factor,
} from "../src/index.ts"

describe("adrenalineGenerationRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AdrenalineGenerationRateFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      ADRENALINE_GENERATION_RATE_FACTOR_ID,
    ).toEqualTypeOf<"adrenaline_generation_rate">()
    expectTypeOf(
      DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<AdrenalineGenerationRateFactorInput>()
    expectTypeOf(adrenalineGenerationRateFactor).toEqualTypeOf<
      Factor<AdrenalineGenerationRateFactorInput>
    >()

    expect(ADRENALINE_GENERATION_RATE_FACTOR_ID).toBe(
      "adrenaline_generation_rate",
    )
    expect(adrenalineGenerationRateFactor.factorId).toBe(
      ADRENALINE_GENERATION_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(adrenalineGenerationRateFactor)).toBe(true)
  })

  it("provides a frozen default input with an identity result", () => {
    expect(DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT).toEqual([])
    expect(
      Object.isFrozen(DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT),
    ).toBe(true)
    expect(DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT).not.toBe(
      DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
    )
    expect(
      adrenalineGenerationRateFactor.calculate(
        DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(adrenalineGenerationRateFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(adrenalineGenerationRateFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(adrenalineGenerationRateFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(adrenalineGenerationRateFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(
      adrenalineGenerationRateFactor.calculate([largeValue, -largeValue, 1]),
    ).toBe(2)
    expect(
      adrenalineGenerationRateFactor.calculate([largeValue, 1, -largeValue]),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(adrenalineGenerationRateFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from zero to three", () => {
    expect(adrenalineGenerationRateFactor.calculate([-2])).toBe(0)
    expect(adrenalineGenerationRateFactor.calculate([-1])).toBe(0)
    expect(adrenalineGenerationRateFactor.calculate([2])).toBe(3)
    expect(adrenalineGenerationRateFactor.calculate([10])).toBe(3)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(adrenalineGenerationRateFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([
      0.25,
    ]) as unknown as AdrenalineGenerationRateFactorInput

    expect(() => adrenalineGenerationRateFactor.calculate(input)).toThrow(
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
    const inputs = [input] as unknown as AdrenalineGenerationRateFactorInput

    expect(() => adrenalineGenerationRateFactor.calculate(inputs)).toThrow(
      TypeError,
    )
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => adrenalineGenerationRateFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => adrenalineGenerationRateFactor.calculate(inputs)).toThrow(
      RangeError,
    )
  })
})

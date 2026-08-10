import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  ENERGY_GENERATION_RATE_FACTOR_ID,
  energyGenerationRateFactor,
  type EnergyGenerationRateFactorInput,
  type Factor,
} from "../src/index.ts"

describe("energyGenerationRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<EnergyGenerationRateFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      ENERGY_GENERATION_RATE_FACTOR_ID,
    ).toEqualTypeOf<"energy_generation_rate">()
    expectTypeOf(
      DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<EnergyGenerationRateFactorInput>()
    expectTypeOf(energyGenerationRateFactor).toEqualTypeOf<
      Factor<EnergyGenerationRateFactorInput>
    >()

    expect(ENERGY_GENERATION_RATE_FACTOR_ID).toBe("energy_generation_rate")
    expect(energyGenerationRateFactor.factorId).toBe(
      ENERGY_GENERATION_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(energyGenerationRateFactor)).toBe(true)
  })

  it("provides a frozen default input with an identity result", () => {
    expect(DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT).toEqual([])
    expect(Object.isFrozen(DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT)).toBe(
      true,
    )
    expect(
      energyGenerationRateFactor.calculate(
        DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(energyGenerationRateFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(energyGenerationRateFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(energyGenerationRateFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(energyGenerationRateFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(
      energyGenerationRateFactor.calculate([largeValue, -largeValue, 1]),
    ).toBe(2)
    expect(
      energyGenerationRateFactor.calculate([largeValue, 1, -largeValue]),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(energyGenerationRateFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from zero to three", () => {
    expect(energyGenerationRateFactor.calculate([-2])).toBe(0)
    expect(energyGenerationRateFactor.calculate([-1])).toBe(0)
    expect(energyGenerationRateFactor.calculate([2])).toBe(3)
    expect(energyGenerationRateFactor.calculate([10])).toBe(3)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(energyGenerationRateFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([0.25]) as unknown as EnergyGenerationRateFactorInput

    expect(() => energyGenerationRateFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([
    ["string", "0.25"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.25 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as EnergyGenerationRateFactorInput

    expect(() => energyGenerationRateFactor.calculate(inputs)).toThrow(
      TypeError,
    )
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => energyGenerationRateFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => energyGenerationRateFactor.calculate(inputs)).toThrow(
      RangeError,
    )
  })
})

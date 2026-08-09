import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_BUILDUP_RATE_FACTOR_ID,
  DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  anomalyBuildupRateFactor,
  type AnomalyBuildupRateFactorInput,
  type Factor,
} from "../src/index.ts"

describe("anomalyBuildupRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyBuildupRateFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      ANOMALY_BUILDUP_RATE_FACTOR_ID,
    ).toEqualTypeOf<"anomaly_buildup_rate">()
    expectTypeOf(
      DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<AnomalyBuildupRateFactorInput>()
    expectTypeOf(anomalyBuildupRateFactor).toEqualTypeOf<
      Factor<AnomalyBuildupRateFactorInput>
    >()

    expect(ANOMALY_BUILDUP_RATE_FACTOR_ID).toBe("anomaly_buildup_rate")
    expect(anomalyBuildupRateFactor.factorId).toBe(
      ANOMALY_BUILDUP_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(anomalyBuildupRateFactor)).toBe(true)
  })

  it("provides a frozen default input with an identity result", () => {
    expect(DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT).toEqual([])
    expect(Object.isFrozen(DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT)).toBe(
      true,
    )
    expect(
      anomalyBuildupRateFactor.calculate(
        DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(anomalyBuildupRateFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(anomalyBuildupRateFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(anomalyBuildupRateFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(anomalyBuildupRateFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(
      anomalyBuildupRateFactor.calculate([largeValue, -largeValue, 1]),
    ).toBe(2)
    expect(
      anomalyBuildupRateFactor.calculate([largeValue, 1, -largeValue]),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(anomalyBuildupRateFactor.calculate([input])).toBe(1 + input)
  })

  it("accepts a zero result", () => {
    expect(anomalyBuildupRateFactor.calculate([-1])).toBe(0)
  })

  it("does not impose an unconfirmed finite upper bound", () => {
    expect(anomalyBuildupRateFactor.calculate([Number.MAX_VALUE])).toBe(
      Number.MAX_VALUE,
    )
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(anomalyBuildupRateFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([0.25]) as unknown as AnomalyBuildupRateFactorInput

    expect(() => anomalyBuildupRateFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([
    ["string", "0.25"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.25 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as AnomalyBuildupRateFactorInput

    expect(() => anomalyBuildupRateFactor.calculate(inputs)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => anomalyBuildupRateFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that produces an invalid result", (...inputs) => {
    expect(() => anomalyBuildupRateFactor.calculate(inputs)).toThrow(RangeError)
  })

  it("rejects a negative result instead of clamping it to zero", () => {
    expect(() => anomalyBuildupRateFactor.calculate([-1.25])).toThrow(
      RangeError,
    )
  })
})

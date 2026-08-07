import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_DAMAGE_BONUS_FACTOR_ID,
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  anomalyDamageBonusFactor,
  type AnomalyDamageBonusFactorInput,
  type Factor,
} from "../src/index.ts"

describe("anomalyDamageBonusFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyDamageBonusFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      ANOMALY_DAMAGE_BONUS_FACTOR_ID,
    ).toEqualTypeOf<"anomaly_damage_bonus">()
    expectTypeOf(
      DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
    ).toEqualTypeOf<AnomalyDamageBonusFactorInput>()
    expectTypeOf(anomalyDamageBonusFactor).toEqualTypeOf<
      Factor<AnomalyDamageBonusFactorInput>
    >()

    expect(ANOMALY_DAMAGE_BONUS_FACTOR_ID).toBe("anomaly_damage_bonus")
    expect(anomalyDamageBonusFactor.factorId).toBe(
      ANOMALY_DAMAGE_BONUS_FACTOR_ID,
    )
    expect(Object.isFrozen(anomalyDamageBonusFactor)).toBe(true)
  })

  it("provides a frozen default input with an identity result", () => {
    expect(DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT).toEqual([])
    expect(Object.isFrozen(DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT)).toBe(
      true,
    )
    expect(
      anomalyDamageBonusFactor.calculate(
        DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(anomalyDamageBonusFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(anomalyDamageBonusFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(anomalyDamageBonusFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(anomalyDamageBonusFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(
      anomalyDamageBonusFactor.calculate([largeValue, -largeValue, 1]),
    ).toBe(2)
    expect(
      anomalyDamageBonusFactor.calculate([largeValue, 1, -largeValue]),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(anomalyDamageBonusFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from zero to three", () => {
    expect(anomalyDamageBonusFactor.calculate([-2])).toBe(0)
    expect(anomalyDamageBonusFactor.calculate([-1])).toBe(0)
    expect(anomalyDamageBonusFactor.calculate([2])).toBe(3)
    expect(anomalyDamageBonusFactor.calculate([10])).toBe(3)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(anomalyDamageBonusFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([0.25]) as unknown as AnomalyDamageBonusFactorInput

    expect(() => anomalyDamageBonusFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([
    ["string", "0.25"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.25 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as AnomalyDamageBonusFactorInput

    expect(() => anomalyDamageBonusFactor.calculate(inputs)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => anomalyDamageBonusFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => anomalyDamageBonusFactor.calculate(inputs)).toThrow(RangeError)
  })
})

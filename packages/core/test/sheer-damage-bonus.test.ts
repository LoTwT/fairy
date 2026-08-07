import { describe, expect, expectTypeOf, it } from "vitest"
import {
  SHEER_DAMAGE_BONUS_FACTOR_ID,
  sheerDamageBonusFactor,
  type Factor,
  type SheerDamageBonusFactorInput,
} from "../src/index.ts"

describe("sheerDamageBonusFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SheerDamageBonusFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      SHEER_DAMAGE_BONUS_FACTOR_ID,
    ).toEqualTypeOf<"sheer_damage_bonus">()
    expectTypeOf(sheerDamageBonusFactor).toEqualTypeOf<
      Factor<SheerDamageBonusFactorInput>
    >()

    expect(SHEER_DAMAGE_BONUS_FACTOR_ID).toBe("sheer_damage_bonus")
    expect(sheerDamageBonusFactor.factorId).toBe(SHEER_DAMAGE_BONUS_FACTOR_ID)
    expect(Object.isFrozen(sheerDamageBonusFactor)).toBe(true)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(sheerDamageBonusFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(sheerDamageBonusFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(sheerDamageBonusFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(sheerDamageBonusFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(sheerDamageBonusFactor.calculate([largeValue, -largeValue, 1])).toBe(
      2,
    )
    expect(sheerDamageBonusFactor.calculate([largeValue, 1, -largeValue])).toBe(
      1,
    )
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(sheerDamageBonusFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from 0.2 to 9", () => {
    expect(sheerDamageBonusFactor.calculate([-2])).toBe(0.2)
    expect(sheerDamageBonusFactor.calculate([-0.75])).toBe(0.25)
    expect(sheerDamageBonusFactor.calculate([8])).toBe(9)
    expect(sheerDamageBonusFactor.calculate([10])).toBe(9)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(sheerDamageBonusFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([0.25]) as unknown as SheerDamageBonusFactorInput

    expect(() => sheerDamageBonusFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([
    ["string", "0.25"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.25 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as SheerDamageBonusFactorInput

    expect(() => sheerDamageBonusFactor.calculate(inputs)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => sheerDamageBonusFactor.calculate([input])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => sheerDamageBonusFactor.calculate(inputs)).toThrow(RangeError)
  })
})

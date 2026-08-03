import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DAMAGE_BONUS_FACTOR_ID,
  damageBonusFactor,
  type DamageBonusFactorInput,
  type Factor,
} from "../src/index.ts"

describe("damageBonusFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DamageBonusFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(DAMAGE_BONUS_FACTOR_ID).toEqualTypeOf<"damage_bonus">()
    expectTypeOf(damageBonusFactor).toEqualTypeOf<
      Factor<DamageBonusFactorInput>
    >()

    expect(DAMAGE_BONUS_FACTOR_ID).toBe("damage_bonus")
    expect(damageBonusFactor.factorId).toBe(DAMAGE_BONUS_FACTOR_ID)
    expect(Object.isFrozen(damageBonusFactor)).toBe(true)
  })

  it("returns the base multiplier for an empty input array", () => {
    expect(damageBonusFactor.calculate([])).toBe(1)
  })

  it("sums signed inputs without merging duplicate values", () => {
    expect(damageBonusFactor.calculate([0.25, 0.5])).toBe(1.75)
    expect(damageBonusFactor.calculate([0.25, -0.125])).toBe(1.125)
    expect(damageBonusFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(damageBonusFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps the result to the inclusive range from zero to six", () => {
    expect(damageBonusFactor.calculate([-2])).toBe(0)
    expect(damageBonusFactor.calculate([-1])).toBe(0)
    expect(damageBonusFactor.calculate([5])).toBe(6)
    expect(damageBonusFactor.calculate([10])).toBe(6)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.25, -0.125])

    expect(damageBonusFactor.calculate(inputs)).toBe(1.125)
    expect(inputs).toEqual([0.25, -0.125])
  })

  it.each([
    ["string", "0.25"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.25 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as readonly DamageBonusFactorInput[]

    expect(() => damageBonusFactor.calculate(inputs)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => damageBonusFactor.calculate([input])).toThrow(RangeError)
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => damageBonusFactor.calculate(inputs)).toThrow(RangeError)
  })

  it("checks overflow in input order", () => {
    expect(() =>
      damageBonusFactor.calculate([
        Number.MAX_VALUE,
        Number.MAX_VALUE,
        -Number.MAX_VALUE,
      ]),
    ).toThrow(RangeError)

    expect(
      damageBonusFactor.calculate([
        Number.MAX_VALUE,
        -Number.MAX_VALUE,
        Number.MAX_VALUE,
      ]),
    ).toBe(6)
  })
})

import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
  SETTLED_DAMAGE_BONUS_FACTOR_ID,
  settledDamageBonusFactor,
  type Factor,
  type SettledDamageBonusFactorInput,
} from "../src/index.ts"

describe("settledDamageBonusFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SettledDamageBonusFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      SETTLED_DAMAGE_BONUS_FACTOR_ID,
    ).toEqualTypeOf<"settled_damage_bonus">()
    expectTypeOf(
      DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
    ).toEqualTypeOf<SettledDamageBonusFactorInput>()
    expectTypeOf(settledDamageBonusFactor).toEqualTypeOf<
      Factor<SettledDamageBonusFactorInput>
    >()

    expect(SETTLED_DAMAGE_BONUS_FACTOR_ID).toBe("settled_damage_bonus")
    expect(settledDamageBonusFactor.factorId).toBe(
      SETTLED_DAMAGE_BONUS_FACTOR_ID,
    )
    expect(Object.isFrozen(settledDamageBonusFactor)).toBe(true)
  })

  it("provides a primitive identity default input", () => {
    expect(DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT).toBe(1)
    expect(
      settledDamageBonusFactor.calculate(
        DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it.each([0, 1, 1.23456789, 6])(
    "returns the in-range multiplier %s unchanged",
    (input) => {
      expect(settledDamageBonusFactor.calculate(input)).toBe(input)
    },
  )

  it.each([
    ["string", "1"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { multiplier: 1 }],
    ["array", [1]],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      settledDamageBonusFactor.calculate(
        input as unknown as SettledDamageBonusFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => settledDamageBonusFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )

  it.each([-Number.EPSILON, -1, 6.000000000000001, 7])(
    "rejects the out-of-range input %s",
    (input) => {
      expect(() => settledDamageBonusFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )
})

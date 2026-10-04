import { describe, expect, expectTypeOf, it } from "vitest"
import {
  anomalyDamageLevelFactor,
  DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT,
  SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID,
  specialVoidflareDamageLevelFactor,
  type Factor,
  type SpecialVoidflareDamageLevelFactorInput,
} from "../src/index.ts"
import { nonFiniteFactorInputs } from "./fixtures/factor-input-cases.ts"

describe("specialVoidflareDamageLevelFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SpecialVoidflareDamageLevelFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID,
    ).toEqualTypeOf<"special_voidflare_damage_level">()
    expectTypeOf(
      DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT,
    ).toEqualTypeOf<SpecialVoidflareDamageLevelFactorInput>()
    expectTypeOf(specialVoidflareDamageLevelFactor).toEqualTypeOf<
      Factor<SpecialVoidflareDamageLevelFactorInput>
    >()

    expect(SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID).toBe(
      "special_voidflare_damage_level",
    )
    expect(specialVoidflareDamageLevelFactor.factorId).toBe(
      SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID,
    )
    expect(Object.isFrozen(specialVoidflareDamageLevelFactor)).toBe(true)
  })

  it("provides an identity default input", () => {
    expect(DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT).toBe(1)
    expect(
      specialVoidflareDamageLevelFactor.calculate(
        DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it.each([
    [1, 1],
    [2, 60 / 59],
    [13, 71 / 59],
    [30, 88 / 59],
    [45, 103 / 59],
    [59, 117 / 59],
    [60, 2],
  ])("calculates the multiplier for level %i", (level, multiplier) => {
    expect(specialVoidflareDamageLevelFactor.calculate(level)).toBe(multiplier)
  })

  it("does not truncate the level multiplier to four decimal places", () => {
    expect(specialVoidflareDamageLevelFactor.calculate(2)).toBe(60 / 59)
    expect(specialVoidflareDamageLevelFactor.calculate(30)).toBe(88 / 59)
    expect(anomalyDamageLevelFactor.calculate(2)).toBe(1.0169)
    expect(specialVoidflareDamageLevelFactor.calculate(2)).not.toBe(
      anomalyDamageLevelFactor.calculate(2),
    )
    expect(specialVoidflareDamageLevelFactor.calculate(30)).not.toBe(
      anomalyDamageLevelFactor.calculate(30),
    )
  })

  it.each([
    ["string", "1"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { level: 1 }],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      specialVoidflareDamageLevelFactor.calculate(
        input as unknown as SpecialVoidflareDamageLevelFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each(nonFiniteFactorInputs)("rejects the non-finite input %s", (input) => {
    expect(() => specialVoidflareDamageLevelFactor.calculate(input)).toThrow(
      RangeError,
    )
  })

  it.each([1.5, 59.9999])("rejects the non-integer input %s", (input) => {
    expect(() => specialVoidflareDamageLevelFactor.calculate(input)).toThrow(
      RangeError,
    )
  })

  it.each([0, -1, 61])("rejects the out-of-range input %s", (input) => {
    expect(() => specialVoidflareDamageLevelFactor.calculate(input)).toThrow(
      RangeError,
    )
  })
})

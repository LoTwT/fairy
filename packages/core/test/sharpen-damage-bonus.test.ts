import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT,
  SHARPEN_DAMAGE_BONUS_FACTOR_ID,
  sharpenDamageBonusFactor,
  type Factor,
  type SharpenDamageBonusFactorInput,
} from "../src/index.ts"

describe("sharpenDamageBonusFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SharpenDamageBonusFactorInput>().toEqualTypeOf<
      readonly number[]
    >()
    expectTypeOf(
      SHARPEN_DAMAGE_BONUS_FACTOR_ID,
    ).toEqualTypeOf<"sharpen_damage_bonus">()
    expectTypeOf(sharpenDamageBonusFactor).toEqualTypeOf<
      Factor<SharpenDamageBonusFactorInput>
    >()

    expect(SHARPEN_DAMAGE_BONUS_FACTOR_ID).toBe("sharpen_damage_bonus")
    expect(sharpenDamageBonusFactor.factorId).toBe(
      SHARPEN_DAMAGE_BONUS_FACTOR_ID,
    )
    expect(Object.isFrozen(sharpenDamageBonusFactor)).toBe(true)
    expect(Object.isFrozen(DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT)).toBe(
      true,
    )
  })

  it("uses an empty contribution list as the identity multiplier", () => {
    expect(sharpenDamageBonusFactor.calculate([])).toBe(1)
    expect(
      sharpenDamageBonusFactor.calculate(
        DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it("sums contributions independently from the regular damage bonus zone", () => {
    expect(sharpenDamageBonusFactor.calculate([0.1])).toBeCloseTo(1.1, 12)
    expect(sharpenDamageBonusFactor.calculate([0.1, 0.16])).toBeCloseTo(
      1.26,
      12,
    )
  })

  it("clamps only at the lower bound zero instead of a regular-bonus ceiling", () => {
    // 锐化专用契约：max(0, 1 + Σ贡献)，无上限钳制；这是固定来源的独立乘区语义。
    expect(sharpenDamageBonusFactor.calculate([8])).toBe(9)
    expect(sharpenDamageBonusFactor.calculate([-1])).toBe(0)
    expect(sharpenDamageBonusFactor.calculate([-2, 0.5])).toBe(0)
  })

  it("rejects invalid input shapes and non-finite numbers", () => {
    expect(() =>
      sharpenDamageBonusFactor.calculate(null as unknown as readonly number[]),
    ).toThrow(TypeError)
    expect(() => sharpenDamageBonusFactor.calculate([Number.NaN])).toThrow(
      RangeError,
    )
    expect(() =>
      sharpenDamageBonusFactor.calculate([Number.NEGATIVE_INFINITY]),
    ).toThrow(RangeError)
  })
})

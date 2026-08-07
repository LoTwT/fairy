import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_DAMAGE_FACTOR_ID,
  baseDamageFactor,
  type BaseDamageFactorInput,
  type BaseDamageFactorInputItem,
  type Factor,
} from "../src/index.ts"

describe("baseDamageFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseDamageFactorInputItem>().toEqualTypeOf<{
      readonly damageMultiplier: number
      readonly finalStat: number
    }>()
    expectTypeOf<BaseDamageFactorInput>().toEqualTypeOf<
      readonly BaseDamageFactorInputItem[]
    >()
    expectTypeOf(BASE_DAMAGE_FACTOR_ID).toEqualTypeOf<"base_damage">()
    expectTypeOf(baseDamageFactor).toEqualTypeOf<
      Factor<BaseDamageFactorInput>
    >()

    expect(BASE_DAMAGE_FACTOR_ID).toBe("base_damage")
    expect(baseDamageFactor.factorId).toBe(BASE_DAMAGE_FACTOR_ID)
    expect(Object.isFrozen(baseDamageFactor)).toBe(true)
  })

  it("returns zero for an empty input array", () => {
    expect(baseDamageFactor.calculate([])).toBe(0)
  })

  it("multiplies each damage multiplier by its corresponding final stat", () => {
    expect(
      baseDamageFactor.calculate([
        { damageMultiplier: 2, finalStat: 10 },
        { damageMultiplier: 3, finalStat: 20 },
      ]),
    ).toBe(80)
  })

  it("counts duplicate inputs independently", () => {
    const input = { damageMultiplier: 1.5, finalStat: 20 }

    expect(baseDamageFactor.calculate([input, input])).toBe(60)
  })

  it("accumulates inputs in array order", () => {
    const largeValue = 2 ** 53
    const largeInput = { damageMultiplier: 1, finalStat: largeValue }
    const smallInput = { damageMultiplier: 1, finalStat: 1 }

    expect(
      baseDamageFactor.calculate([largeInput, smallInput, smallInput]),
    ).toBe(largeValue)
    expect(
      baseDamageFactor.calculate([smallInput, smallInput, largeInput]),
    ).toBe(largeValue + 2)
  })

  it("accepts zero for either input field", () => {
    expect(
      baseDamageFactor.calculate([
        { damageMultiplier: 0, finalStat: 100 },
        { damageMultiplier: 2, finalStat: 0 },
      ]),
    ).toBe(0)
  })

  it("does not round or clamp a valid result", () => {
    const damageMultiplier = 0.123456789
    const finalStat = 10.987654321

    expect(baseDamageFactor.calculate([{ damageMultiplier, finalStat }])).toBe(
      damageMultiplier * finalStat,
    )
  })

  it("does not modify the input array or its members", () => {
    const input = Object.freeze({ damageMultiplier: 1.5, finalStat: 20 })
    const inputs = Object.freeze([input])

    expect(baseDamageFactor.calculate(inputs)).toBe(30)
    expect(inputs).toEqual([input])
    expect(input).toEqual({ damageMultiplier: 1.5, finalStat: 20 })
  })

  it("rejects a non-array input", () => {
    const input = new Set([
      { damageMultiplier: 1, finalStat: 1 },
    ]) as unknown as BaseDamageFactorInput

    expect(() => baseDamageFactor.calculate(input)).toThrow(TypeError)
  })

  it("rejects a null input", () => {
    const inputs = [null] as unknown as BaseDamageFactorInput

    expect(() => baseDamageFactor.calculate(inputs)).toThrow(TypeError)
  })

  it("rejects callable and array inputs even when their fields are valid", () => {
    const fields = {
      damageMultiplier: 1,
      finalStat: 1,
    }

    for (const input of [
      Object.assign(() => undefined, fields),
      Object.assign([], fields),
    ]) {
      expect(() => baseDamageFactor.calculate([input])).toThrow(TypeError)
    }
  })

  describe.each(["damageMultiplier", "finalStat"] as const)(
    "%s validation",
    (field) => {
      it("rejects a non-number value", () => {
        const input = {
          damageMultiplier: 1,
          finalStat: 1,
          [field]: "1",
        } as unknown as BaseDamageFactorInputItem

        expect(() => baseDamageFactor.calculate([input])).toThrow(TypeError)
      })

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite value %s",
        (value) => {
          const input = {
            damageMultiplier: 1,
            finalStat: 1,
            [field]: value,
          }

          expect(() => baseDamageFactor.calculate([input])).toThrow(RangeError)
        },
      )

      it("rejects a negative value", () => {
        const input = {
          damageMultiplier: 1,
          finalStat: 1,
          [field]: -1,
        }

        expect(() => baseDamageFactor.calculate([input])).toThrow(RangeError)
      })
    },
  )

  it("rejects a non-finite result caused by multiplication overflow", () => {
    expect(() =>
      baseDamageFactor.calculate([
        { damageMultiplier: Number.MAX_VALUE, finalStat: 2 },
      ]),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by addition overflow", () => {
    expect(() =>
      baseDamageFactor.calculate([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
    ).toThrow(RangeError)
  })

  it("does not impose an unconfirmed finite upper bound", () => {
    expect(
      baseDamageFactor.calculate([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
    ).toBe(Number.MAX_VALUE)
  })
})

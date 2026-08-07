import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DAMAGE_TAKEN_FACTOR_ID,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  damageTakenFactor,
  type DamageTakenFactorInput,
  type Factor,
} from "../src/index.ts"

describe("damageTakenFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DamageTakenFactorInput>().toEqualTypeOf<{
      readonly targetDamageTakenIncreases: readonly number[]
      readonly targetDamageTakenReductions: readonly number[]
    }>()
    expectTypeOf(DAMAGE_TAKEN_FACTOR_ID).toEqualTypeOf<"damage_taken">()
    expectTypeOf(
      DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    ).toEqualTypeOf<DamageTakenFactorInput>()
    expectTypeOf(damageTakenFactor).toEqualTypeOf<
      Factor<DamageTakenFactorInput>
    >()

    expect(DAMAGE_TAKEN_FACTOR_ID).toBe("damage_taken")
    expect(damageTakenFactor.factorId).toBe(DAMAGE_TAKEN_FACTOR_ID)
    expect(Object.isFrozen(damageTakenFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT).toEqual({
      targetDamageTakenIncreases: [],
      targetDamageTakenReductions: [],
    })
    expect(Object.isFrozen(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT.targetDamageTakenIncreases,
      ),
    ).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT.targetDamageTakenReductions,
      ),
    ).toBe(true)
    expect(damageTakenFactor.calculate(DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT)).toBe(
      1,
    )
  })

  it("returns the base multiplier when both contribution arrays are empty", () => {
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      }),
    ).toBe(1)
  })

  it("adds increases and subtracts reductions without merging duplicates", () => {
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [0.25, 0.5],
        targetDamageTakenReductions: [0.125],
      }),
    ).toBe(1 + (0.25 + 0.5) - 0.125)
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [0.25, 0.25],
        targetDamageTakenReductions: [0.125, 0.125],
      }),
    ).toBe(1.25)
  })

  it("sums contributions in each array's order", () => {
    const smallValue = Number.EPSILON / 4

    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [
          smallValue,
          smallValue,
          smallValue,
          smallValue,
          0.5,
        ],
        targetDamageTakenReductions: [],
      }),
    ).toBe(1.5 + Number.EPSILON)
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [
          0.5,
          smallValue,
          smallValue,
          smallValue,
          smallValue,
        ],
        targetDamageTakenReductions: [],
      }),
    ).toBe(1.5)
  })

  it("does not round a valid result", () => {
    const targetDamageTakenIncrease = 0.123456789

    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [targetDamageTakenIncrease],
        targetDamageTakenReductions: [],
      }),
    ).toBe(1 + targetDamageTakenIncrease)
  })

  it("clamps the result to the inclusive range [0.2, 2]", () => {
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [1],
      }),
    ).toBe(0.2)
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [2],
      }),
    ).toBe(0.2)
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [1],
        targetDamageTakenReductions: [],
      }),
    ).toBe(2)
    expect(
      damageTakenFactor.calculate({
        targetDamageTakenIncreases: [2],
        targetDamageTakenReductions: [],
      }),
    ).toBe(2)
  })

  it("does not modify its input or contribution arrays", () => {
    const targetDamageTakenIncreases = Object.freeze([0.25])
    const targetDamageTakenReductions = Object.freeze([0.125])
    const input = Object.freeze({
      targetDamageTakenIncreases,
      targetDamageTakenReductions,
    })

    expect(damageTakenFactor.calculate(input)).toBe(1.125)
    expect(input).toEqual({
      targetDamageTakenIncreases: [0.25],
      targetDamageTakenReductions: [0.125],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      targetDamageTakenIncreases: [],
      targetDamageTakenReductions: [],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        damageTakenFactor.calculate(input as unknown as DamageTakenFactorInput),
      ).toThrow(TypeError)
    }
  })

  describe.each([
    "targetDamageTakenIncreases",
    "targetDamageTakenReductions",
  ] as const)("%s validation", (field) => {
    it("rejects a value that is not an array", () => {
      const input = {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
        [field]: new Set([0.25]),
      } as unknown as DamageTakenFactorInput

      expect(() => damageTakenFactor.calculate(input)).toThrow(TypeError)
    })

    it("rejects a non-number array member", () => {
      const input = {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
        [field]: ["0.25"],
      } as unknown as DamageTakenFactorInput

      expect(() => damageTakenFactor.calculate(input)).toThrow(TypeError)
    })

    it.each([NaN, Infinity, -Infinity])(
      "rejects the non-finite array member %s",
      (value) => {
        const input = {
          targetDamageTakenIncreases: [],
          targetDamageTakenReductions: [],
          [field]: [value],
        }

        expect(() => damageTakenFactor.calculate(input)).toThrow(RangeError)
      },
    )

    it("rejects a negative array member", () => {
      const input = {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
        [field]: [-0.25],
      }

      expect(() => damageTakenFactor.calculate(input)).toThrow(RangeError)
    })

    it("rejects an unclamped result that overflows", () => {
      const input = {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
        [field]: [Number.MAX_VALUE, Number.MAX_VALUE],
      }

      expect(() => damageTakenFactor.calculate(input)).toThrow(RangeError)
    })
  })
})

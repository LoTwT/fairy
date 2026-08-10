import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DAZE_TAKEN_FACTOR_ID,
  DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  dazeTakenFactor,
  type DazeTakenFactorInput,
  type Factor,
} from "../src/index.ts"

describe("dazeTakenFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DazeTakenFactorInput>().toEqualTypeOf<{
      readonly targetDazeTakenIncreases: readonly number[]
      readonly targetDazeTakenReductions: readonly number[]
    }>()
    expectTypeOf(DAZE_TAKEN_FACTOR_ID).toEqualTypeOf<"daze_taken">()
    expectTypeOf(
      DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
    ).toEqualTypeOf<DazeTakenFactorInput>()
    expectTypeOf(dazeTakenFactor).toEqualTypeOf<Factor<DazeTakenFactorInput>>()

    expect(DAZE_TAKEN_FACTOR_ID).toBe("daze_taken")
    expect(dazeTakenFactor.factorId).toBe(DAZE_TAKEN_FACTOR_ID)
    expect(Object.isFrozen(dazeTakenFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_DAZE_TAKEN_FACTOR_INPUT).toEqual({
      targetDazeTakenIncreases: [],
      targetDazeTakenReductions: [],
    })
    expect(Object.isFrozen(DEFAULT_DAZE_TAKEN_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(DEFAULT_DAZE_TAKEN_FACTOR_INPUT.targetDazeTakenIncreases),
    ).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_DAZE_TAKEN_FACTOR_INPUT.targetDazeTakenReductions,
      ),
    ).toBe(true)
    expect(dazeTakenFactor.calculate(DEFAULT_DAZE_TAKEN_FACTOR_INPUT)).toBe(1)
  })

  it("returns the base multiplier when both contribution arrays are empty", () => {
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [],
      }),
    ).toBe(1)
  })

  it("accepts zero-valued contributions", () => {
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [0],
        targetDazeTakenReductions: [0],
      }),
    ).toBe(1)
  })

  it("adds increases and subtracts reductions without merging duplicates", () => {
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [0.25, 0.5],
        targetDazeTakenReductions: [0.125],
      }),
    ).toBe(1 + (0.25 + 0.5) - 0.125)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [0.25, 0.25],
        targetDazeTakenReductions: [0.125, 0.125],
      }),
    ).toBe(1.25)
  })

  it("sums contributions in each array's order", () => {
    const smallValue = Number.EPSILON / 4

    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [
          smallValue,
          smallValue,
          smallValue,
          smallValue,
          0.5,
        ],
        targetDazeTakenReductions: [],
      }),
    ).toBe(1.5 + Number.EPSILON)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [
          0.5,
          smallValue,
          smallValue,
          smallValue,
          smallValue,
        ],
        targetDazeTakenReductions: [],
      }),
    ).toBe(1.5)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [
          smallValue,
          smallValue,
          smallValue,
          smallValue,
          0.5,
        ],
      }),
    ).toBe(0.5 - Number.EPSILON)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [
          0.5,
          smallValue,
          smallValue,
          smallValue,
          smallValue,
        ],
      }),
    ).toBe(0.5)
  })

  it("does not round a valid result", () => {
    const targetDazeTakenIncrease = 0.123456789

    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [targetDazeTakenIncrease],
        targetDazeTakenReductions: [],
      }),
    ).toBe(1 + targetDazeTakenIncrease)
  })

  it("clamps the result to the inclusive range [0, 4]", () => {
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [1],
      }),
    ).toBe(0)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [2],
      }),
    ).toBe(0)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [3],
        targetDazeTakenReductions: [],
      }),
    ).toBe(4)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [4],
        targetDazeTakenReductions: [],
      }),
    ).toBe(4)
  })

  it("does not impose an unconfirmed upper bound on one contribution", () => {
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [Number.MAX_VALUE],
        targetDazeTakenReductions: [],
      }),
    ).toBe(4)
    expect(
      dazeTakenFactor.calculate({
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [Number.MAX_VALUE],
      }),
    ).toBe(0)
  })

  it("does not modify its input or contribution arrays", () => {
    const targetDazeTakenIncreases = Object.freeze([0.25])
    const targetDazeTakenReductions = Object.freeze([0.125])
    const input = Object.freeze({
      targetDazeTakenIncreases,
      targetDazeTakenReductions,
    })

    expect(dazeTakenFactor.calculate(input)).toBe(1.125)
    expect(input).toEqual({
      targetDazeTakenIncreases: [0.25],
      targetDazeTakenReductions: [0.125],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      targetDazeTakenIncreases: [],
      targetDazeTakenReductions: [],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        dazeTakenFactor.calculate(input as unknown as DazeTakenFactorInput),
      ).toThrow(TypeError)
    }
  })

  describe.each([
    "targetDazeTakenIncreases",
    "targetDazeTakenReductions",
  ] as const)("%s validation", (field) => {
    it("rejects a value that is not an array", () => {
      const input = {
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [],
        [field]: new Set([0.25]),
      } as unknown as DazeTakenFactorInput

      expect(() => dazeTakenFactor.calculate(input)).toThrow(TypeError)
    })

    it("rejects a non-number array member", () => {
      const input = {
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [],
        [field]: ["0.25"],
      } as unknown as DazeTakenFactorInput

      expect(() => dazeTakenFactor.calculate(input)).toThrow(TypeError)
    })

    it.each([NaN, Infinity, -Infinity])(
      "rejects the non-finite array member %s",
      (value) => {
        const input = {
          targetDazeTakenIncreases: [],
          targetDazeTakenReductions: [],
          [field]: [value],
        }

        expect(() => dazeTakenFactor.calculate(input)).toThrow(RangeError)
      },
    )

    it("rejects a negative array member", () => {
      const input = {
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [],
        [field]: [-0.25],
      }

      expect(() => dazeTakenFactor.calculate(input)).toThrow(RangeError)
    })

    it("rejects an unclamped result that overflows", () => {
      const input = {
        targetDazeTakenIncreases: [],
        targetDazeTakenReductions: [],
        [field]: [Number.MAX_VALUE, Number.MAX_VALUE],
      }

      expect(() => dazeTakenFactor.calculate(input)).toThrow(RangeError)
    })
  })
})

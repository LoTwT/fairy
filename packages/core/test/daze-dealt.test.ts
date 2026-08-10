import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DAZE_DEALT_FACTOR_ID,
  DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  dazeDealtFactor,
  type DazeDealtFactorInput,
  type Factor,
} from "../src/index.ts"

describe("dazeDealtFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DazeDealtFactorInput>().toEqualTypeOf<{
      readonly dazeDealtIncreases: readonly number[]
      readonly dazeDealtReductions: readonly number[]
    }>()
    expectTypeOf(DAZE_DEALT_FACTOR_ID).toEqualTypeOf<"daze_dealt">()
    expectTypeOf(
      DEFAULT_DAZE_DEALT_FACTOR_INPUT,
    ).toEqualTypeOf<DazeDealtFactorInput>()
    expectTypeOf(dazeDealtFactor).toEqualTypeOf<Factor<DazeDealtFactorInput>>()

    expect(DAZE_DEALT_FACTOR_ID).toBe("daze_dealt")
    expect(dazeDealtFactor.factorId).toBe(DAZE_DEALT_FACTOR_ID)
    expect(Object.isFrozen(dazeDealtFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_DAZE_DEALT_FACTOR_INPUT).toEqual({
      dazeDealtIncreases: [],
      dazeDealtReductions: [],
    })
    expect(Object.isFrozen(DEFAULT_DAZE_DEALT_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(DEFAULT_DAZE_DEALT_FACTOR_INPUT.dazeDealtIncreases),
    ).toBe(true)
    expect(
      Object.isFrozen(DEFAULT_DAZE_DEALT_FACTOR_INPUT.dazeDealtReductions),
    ).toBe(true)
    expect(dazeDealtFactor.calculate(DEFAULT_DAZE_DEALT_FACTOR_INPUT)).toBe(1)
  })

  it("returns the base multiplier when both contribution arrays are empty", () => {
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [],
        dazeDealtReductions: [],
      }),
    ).toBe(1)
  })

  it("accepts zero-valued contributions", () => {
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [0],
        dazeDealtReductions: [0],
      }),
    ).toBe(1)
  })

  it("adds increases and subtracts reductions without merging duplicates", () => {
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [0.25, 0.5],
        dazeDealtReductions: [0.125],
      }),
    ).toBe(1 + (0.25 + 0.5) - 0.125)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [0.25, 0.25],
        dazeDealtReductions: [0.125, 0.125],
      }),
    ).toBe(1.25)
  })

  it("sums contributions in each array's order", () => {
    const smallValue = Number.EPSILON / 4

    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [
          smallValue,
          smallValue,
          smallValue,
          smallValue,
          0.5,
        ],
        dazeDealtReductions: [],
      }),
    ).toBe(1.5 + Number.EPSILON)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [
          0.5,
          smallValue,
          smallValue,
          smallValue,
          smallValue,
        ],
        dazeDealtReductions: [],
      }),
    ).toBe(1.5)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [],
        dazeDealtReductions: [
          smallValue,
          smallValue,
          smallValue,
          smallValue,
          0.5,
        ],
      }),
    ).toBe(0.5 - Number.EPSILON)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [],
        dazeDealtReductions: [
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
    const dazeDealtIncrease = 0.123456789

    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [dazeDealtIncrease],
        dazeDealtReductions: [],
      }),
    ).toBe(1 + dazeDealtIncrease)
  })

  it("clamps the result to the inclusive range [0, 4]", () => {
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [],
        dazeDealtReductions: [1],
      }),
    ).toBe(0)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [],
        dazeDealtReductions: [2],
      }),
    ).toBe(0)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [3],
        dazeDealtReductions: [],
      }),
    ).toBe(4)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [4],
        dazeDealtReductions: [],
      }),
    ).toBe(4)
  })

  it("does not impose an unconfirmed upper bound on one contribution", () => {
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [Number.MAX_VALUE],
        dazeDealtReductions: [],
      }),
    ).toBe(4)
    expect(
      dazeDealtFactor.calculate({
        dazeDealtIncreases: [],
        dazeDealtReductions: [Number.MAX_VALUE],
      }),
    ).toBe(0)
  })

  it("does not modify its input or contribution arrays", () => {
    const dazeDealtIncreases = Object.freeze([0.25])
    const dazeDealtReductions = Object.freeze([0.125])
    const input = Object.freeze({
      dazeDealtIncreases,
      dazeDealtReductions,
    })

    expect(dazeDealtFactor.calculate(input)).toBe(1.125)
    expect(input).toEqual({
      dazeDealtIncreases: [0.25],
      dazeDealtReductions: [0.125],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      dazeDealtIncreases: [],
      dazeDealtReductions: [],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        dazeDealtFactor.calculate(input as unknown as DazeDealtFactorInput),
      ).toThrow(TypeError)
    }
  })

  describe.each(["dazeDealtIncreases", "dazeDealtReductions"] as const)(
    "%s validation",
    (field) => {
      it("rejects a value that is not an array", () => {
        const input = {
          dazeDealtIncreases: [],
          dazeDealtReductions: [],
          [field]: new Set([0.25]),
        } as unknown as DazeDealtFactorInput

        expect(() => dazeDealtFactor.calculate(input)).toThrow(TypeError)
      })

      it("rejects a non-number array member", () => {
        const input = {
          dazeDealtIncreases: [],
          dazeDealtReductions: [],
          [field]: ["0.25"],
        } as unknown as DazeDealtFactorInput

        expect(() => dazeDealtFactor.calculate(input)).toThrow(TypeError)
      })

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite array member %s",
        (value) => {
          const input = {
            dazeDealtIncreases: [],
            dazeDealtReductions: [],
            [field]: [value],
          }

          expect(() => dazeDealtFactor.calculate(input)).toThrow(RangeError)
        },
      )

      it("rejects a negative array member", () => {
        const input = {
          dazeDealtIncreases: [],
          dazeDealtReductions: [],
          [field]: [-0.25],
        }

        expect(() => dazeDealtFactor.calculate(input)).toThrow(RangeError)
      })

      it("rejects an unclamped result that overflows", () => {
        const input = {
          dazeDealtIncreases: [],
          dazeDealtReductions: [],
          [field]: [Number.MAX_VALUE, Number.MAX_VALUE],
        }

        expect(() => dazeDealtFactor.calculate(input)).toThrow(RangeError)
      })
    },
  )
})

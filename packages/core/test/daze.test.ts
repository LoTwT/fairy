import { describe, expect, expectTypeOf, it } from "vitest"
import {
  calculateDisplayedDazePercentage,
  type CalculateDisplayedDazePercentageParams,
} from "../src/index.ts"

function calculate(accumulatedDaze: unknown, maximumDaze: unknown): number {
  return calculateDisplayedDazePercentage({
    accumulatedDaze,
    maximumDaze,
  } as CalculateDisplayedDazePercentageParams)
}

describe("calculateDisplayedDazePercentage", () => {
  it("exposes its public parameter and function types", () => {
    expectTypeOf<CalculateDisplayedDazePercentageParams>().toEqualTypeOf<{
      readonly accumulatedDaze: number
      readonly maximumDaze: number
    }>()
    expectTypeOf(calculateDisplayedDazePercentage).toEqualTypeOf<
      (params: CalculateDisplayedDazePercentageParams) => number
    >()
  })

  it.each([
    [0, 1000, 0],
    [995, 1000, 99],
    [1000, 1000, 100],
  ])(
    "calculates accumulated Daze %s from maximum Daze %s as %s%%",
    (accumulatedDaze, maximumDaze, expected) => {
      expect(calculate(accumulatedDaze, maximumDaze)).toBe(expected)
    },
  )

  it("multiplies before dividing to preserve an integer boundary", () => {
    expect((29 / 100) * 100).toBeLessThan(29)
    expect(calculate(29, 100)).toBe(29)
  })

  it("rounds a fractional percentage down", () => {
    expect(calculate(1234, 2000)).toBe(61)
  })

  it("does not clamp a percentage above 100", () => {
    expect(calculate(1100, 1000)).toBe(110)
  })

  it("does not impose a safe-integer upper bound", () => {
    expect(calculate(1e20, 100)).toBe(1e20)
  })

  it("scales both inputs when multiplying accumulated Daze would overflow", () => {
    expect(1e307 * 100).toBe(Infinity)
    expect(calculate(1e307, 1e308)).toBe(10)
    expect(calculate(Number.MAX_VALUE, Number.MAX_VALUE)).toBe(100)
  })

  it("does not modify, freeze, or reject a frozen parameter object", () => {
    const mutableParams = {
      accumulatedDaze: 995,
      maximumDaze: 1000,
    }
    const originalParams = { ...mutableParams }

    expect(calculateDisplayedDazePercentage(mutableParams)).toBe(99)
    expect(mutableParams).toEqual(originalParams)
    expect(Object.isFrozen(mutableParams)).toBe(false)

    const frozenParams = Object.freeze({
      accumulatedDaze: 995,
      maximumDaze: 1000,
    })

    expect(calculateDisplayedDazePercentage(frozenParams)).toBe(99)
    expect(frozenParams).toEqual({
      accumulatedDaze: 995,
      maximumDaze: 1000,
    })
  })

  it("rejects parameters that are not non-array objects", () => {
    const fields = { accumulatedDaze: 995, maximumDaze: 1000 }
    const invalidParams = [
      null,
      0,
      "params",
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const params of invalidParams) {
      expect(() =>
        calculateDisplayedDazePercentage(
          params as unknown as CalculateDisplayedDazePercentageParams,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    ["accumulatedDaze", { maximumDaze: 1000 }],
    ["maximumDaze", { accumulatedDaze: 995 }],
  ] as const)(
    "rejects a missing or undefined %s",
    (field, incompleteParams) => {
      for (const params of [
        incompleteParams,
        { ...incompleteParams, [field]: undefined },
      ]) {
        expect(() =>
          calculateDisplayedDazePercentage(
            params as unknown as CalculateDisplayedDazePercentageParams,
          ),
        ).toThrow(TypeError)
      }
    },
  )

  it.each([
    ["accumulatedDaze", "995", 1000],
    ["maximumDaze", 995, "1000"],
  ])("rejects a non-number %s", (_field, accumulatedDaze, maximumDaze) => {
    expect(() => calculate(accumulatedDaze, maximumDaze)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite accumulated Daze %s",
    (accumulatedDaze) => {
      expect(() => calculate(accumulatedDaze, 1000)).toThrow(RangeError)
    },
  )

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite maximum Daze %s",
    (maximumDaze) => {
      expect(() => calculate(995, maximumDaze)).toThrow(RangeError)
    },
  )

  it("rejects negative accumulated Daze", () => {
    expect(() => calculate(-1, 1000)).toThrow(RangeError)
  })

  it.each([0, -1])("rejects non-positive maximum Daze %s", (maximumDaze) => {
    expect(() => calculate(995, maximumDaze)).toThrow(RangeError)
  })

  it("rejects a non-finite displayed percentage", () => {
    expect(() => calculate(1, Number.MIN_VALUE)).toThrow(RangeError)
  })

  it("rejects a non-finite displayed percentage after overflow-safe scaling", () => {
    expect(() => calculate(Number.MAX_VALUE, 1)).toThrow(RangeError)
  })
})

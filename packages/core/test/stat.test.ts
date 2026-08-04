import { describe, expect, expectTypeOf, it } from "vitest"
import {
  baseDamageFactor,
  calculateFinalStat,
  calculateInitialStat,
  type CalculateFinalStatParams,
  type CalculateInitialStatParams,
} from "../src/index.ts"

interface StatCalculatorCase {
  readonly name: string
  readonly calculate: (
    sourceStat: unknown,
    percentageAdjustments: unknown,
    fixedValueAdjustments: unknown,
  ) => number
  readonly calculateWithParams: (params: unknown) => number
}

const statCalculatorCases: readonly StatCalculatorCase[] = [
  {
    name: "calculateInitialStat",
    calculate: (
      baseStat,
      initialStatPercentageAdjustments,
      initialStatFixedValueAdjustments,
    ) =>
      calculateInitialStat({
        baseStat,
        initialStatPercentageAdjustments,
        initialStatFixedValueAdjustments,
      } as unknown as CalculateInitialStatParams),
    calculateWithParams: (params) =>
      calculateInitialStat(params as CalculateInitialStatParams),
  },
  {
    name: "calculateFinalStat",
    calculate: (
      initialStat,
      finalStatPercentageAdjustments,
      finalStatFixedValueAdjustments,
    ) =>
      calculateFinalStat({
        initialStat,
        finalStatPercentageAdjustments,
        finalStatFixedValueAdjustments,
      } as unknown as CalculateFinalStatParams),
    calculateWithParams: (params) =>
      calculateFinalStat(params as CalculateFinalStatParams),
  },
]

describe("stat calculation helpers", () => {
  it("exposes the public parameter and function types", () => {
    expectTypeOf<CalculateInitialStatParams>().toEqualTypeOf<{
      readonly baseStat: number
      readonly initialStatPercentageAdjustments: readonly number[]
      readonly initialStatFixedValueAdjustments: readonly number[]
    }>()
    expectTypeOf<CalculateFinalStatParams>().toEqualTypeOf<{
      readonly initialStat: number
      readonly finalStatPercentageAdjustments: readonly number[]
      readonly finalStatFixedValueAdjustments: readonly number[]
    }>()
    expectTypeOf(calculateInitialStat).toEqualTypeOf<
      (params: CalculateInitialStatParams) => number
    >()
    expectTypeOf(calculateFinalStat).toEqualTypeOf<
      (params: CalculateFinalStatParams) => number
    >()
  })

  it("calculates initial and final stats that can feed base damage", () => {
    const initialStat = calculateInitialStat({
      baseStat: 80,
      initialStatPercentageAdjustments: [0.25, -0.125],
      initialStatFixedValueAdjustments: [10, -5],
    })
    const finalStat = calculateFinalStat({
      initialStat,
      finalStatPercentageAdjustments: [0.5, -0.25],
      finalStatFixedValueAdjustments: [5, -0.75],
    })

    expect(initialStat).toBe(95)
    expect(finalStat).toBe(123)
    expect(
      baseDamageFactor.calculate([{ damageMultiplier: 2, finalStat }]),
    ).toBe(246)
  })

  it("does not modify initial stat parameters or adjustment arrays", () => {
    const initialStatPercentageAdjustments = Object.freeze([0.25, -0.125])
    const initialStatFixedValueAdjustments = Object.freeze([10, -5])
    const params = Object.freeze({
      baseStat: 80,
      initialStatPercentageAdjustments,
      initialStatFixedValueAdjustments,
    })

    expect(calculateInitialStat(params)).toBe(95)
    expect(params).toEqual({
      baseStat: 80,
      initialStatPercentageAdjustments: [0.25, -0.125],
      initialStatFixedValueAdjustments: [10, -5],
    })
  })

  it("does not modify final stat parameters or adjustment arrays", () => {
    const finalStatPercentageAdjustments = Object.freeze([0.5, -0.25])
    const finalStatFixedValueAdjustments = Object.freeze([5, -0.75])
    const params = Object.freeze({
      initialStat: 95,
      finalStatPercentageAdjustments,
      finalStatFixedValueAdjustments,
    })

    expect(calculateFinalStat(params)).toBe(123)
    expect(params).toEqual({
      initialStat: 95,
      finalStatPercentageAdjustments: [0.5, -0.25],
      finalStatFixedValueAdjustments: [5, -0.75],
    })
  })

  describe.each(statCalculatorCases)(
    "$name",
    ({ calculate, calculateWithParams }) => {
      it("returns the source stat when both adjustment arrays are empty", () => {
        expect(calculate(80, [], [])).toBe(80)
      })

      it("accepts a zero source stat", () => {
        expect(calculate(0, [], [])).toBe(0)
      })

      it("accepts a zero percentage multiplier and zero result", () => {
        expect(calculate(80, [-1], [])).toBe(0)
      })

      it("counts duplicate adjustments independently", () => {
        expect(calculate(8, [0.25, 0.25], [2, 2])).toBe(16)
      })

      it("accepts signed adjustments when the result remains non-negative", () => {
        expect(calculate(80, [0.25, -0.125], [10, -5])).toBe(95)
      })

      it("does not round a valid result", () => {
        const sourceStat = 0.123456789
        const percentageAdjustment = 0.234567891
        const fixedValueAdjustment = 0.345678912

        expect(
          calculate(sourceStat, [percentageAdjustment], [fixedValueAdjustment]),
        ).toBe(sourceStat * (1 + percentageAdjustment) + fixedValueAdjustment)
      })

      it.each([null, undefined, 1, "params", [], () => undefined])(
        "rejects the invalid params value %#",
        (params) => {
          expect(() => calculateWithParams(params)).toThrow(TypeError)
        },
      )

      it.each([null, undefined, 1, "adjustments", {}, new Set<number>()])(
        "rejects the non-array percentage adjustments %#",
        (adjustments) => {
          expect(() => calculate(80, adjustments, [])).toThrow(TypeError)
        },
      )

      it.each([null, undefined, 1, "adjustments", {}, new Set<number>()])(
        "rejects the non-array fixed value adjustments %#",
        (adjustments) => {
          expect(() => calculate(80, [], adjustments)).toThrow(TypeError)
        },
      )

      it.each(["80", true, null, undefined, {}])(
        "rejects the non-number source stat %#",
        (sourceStat) => {
          expect(() => calculate(sourceStat, [], [])).toThrow(TypeError)
        },
      )

      it.each(["0.25", true, null, undefined, {}])(
        "rejects the non-number percentage adjustment %#",
        (adjustment) => {
          expect(() => calculate(80, [adjustment], [])).toThrow(TypeError)
        },
      )

      it.each(["10", true, null, undefined, {}])(
        "rejects the non-number fixed value adjustment %#",
        (adjustment) => {
          expect(() => calculate(80, [], [adjustment])).toThrow(TypeError)
        },
      )

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite source stat %s",
        (sourceStat) => {
          expect(() => calculate(sourceStat, [], [])).toThrow(RangeError)
        },
      )

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite percentage adjustment %s",
        (adjustment) => {
          expect(() => calculate(80, [adjustment], [])).toThrow(RangeError)
        },
      )

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite fixed value adjustment %s",
        (adjustment) => {
          expect(() => calculate(80, [], [adjustment])).toThrow(RangeError)
        },
      )

      it("rejects a negative source stat", () => {
        expect(() => calculate(-1, [], [])).toThrow(RangeError)
      })

      it("rejects a negative percentage multiplier", () => {
        expect(() => calculate(80, [-1.25], [])).toThrow(RangeError)
      })

      it("rejects a negative result", () => {
        expect(() => calculate(0, [], [-1])).toThrow(RangeError)
      })

      it("rejects percentage adjustment overflow before later cancellation", () => {
        expect(() =>
          calculate(
            1,
            [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE],
            [],
          ),
        ).toThrow(RangeError)
      })

      it("sums percentage adjustments in input order", () => {
        expect(
          calculate(
            1,
            [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE],
            [],
          ),
        ).toBe(Number.MAX_VALUE)
      })

      it("rejects multiplication overflow before fixed value adjustments", () => {
        expect(() =>
          calculate(Number.MAX_VALUE, [1], [-Number.MAX_VALUE]),
        ).toThrow(RangeError)
      })

      it("rejects fixed value adjustment overflow before later cancellation", () => {
        expect(() =>
          calculate(
            0,
            [],
            [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE],
          ),
        ).toThrow(RangeError)
      })

      it("sums fixed value adjustments in input order", () => {
        expect(
          calculate(
            0,
            [],
            [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE],
          ),
        ).toBe(Number.MAX_VALUE)
      })

      it("rejects final addition overflow", () => {
        expect(() =>
          calculate(Number.MAX_VALUE, [], [Number.MAX_VALUE]),
        ).toThrow(RangeError)
      })

      it("does not impose an unconfirmed finite upper bound", () => {
        expect(calculate(Number.MAX_VALUE, [], [])).toBe(Number.MAX_VALUE)
      })
    },
  )
})

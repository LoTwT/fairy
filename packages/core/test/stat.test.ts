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
  readonly createStructurallyCompleteInvalidParams: () => readonly unknown[]
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
    createStructurallyCompleteInvalidParams: () => {
      const fields = {
        baseStat: 80,
        initialStatPercentageAdjustments: [],
        initialStatFixedValueAdjustments: [],
      }

      return [Object.assign([], fields), Object.assign(() => undefined, fields)]
    },
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
    createStructurallyCompleteInvalidParams: () => {
      const fields = {
        initialStat: 80,
        finalStatPercentageAdjustments: [],
        finalStatFixedValueAdjustments: [],
      }

      return [Object.assign([], fields), Object.assign(() => undefined, fields)]
    },
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
    ({
      calculate,
      calculateWithParams,
      createStructurallyCompleteInvalidParams,
    }) => {
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

      it("sums percentage adjustments in array order", () => {
        const largeValue = 2 ** 53

        expect(calculate(1, [largeValue, -largeValue, 1], [])).toBe(2)
        expect(calculate(1, [largeValue, 1, -largeValue], [])).toBe(1)
      })

      it("sums fixed value adjustments in array order", () => {
        const largeValue = 2 ** 53

        expect(calculate(0, [], [largeValue, -largeValue, 1])).toBe(1)
        expect(calculate(0, [], [largeValue, 1, -largeValue])).toBe(0)
      })

      it("does not round a valid result", () => {
        const sourceStat = 0.123456789
        const percentageAdjustment = 0.234567891
        const fixedValueAdjustment = 0.345678912

        expect(
          calculate(sourceStat, [percentageAdjustment], [fixedValueAdjustment]),
        ).toBe(sourceStat * (1 + percentageAdjustment) + fixedValueAdjustment)
      })

      it("rejects null params", () => {
        expect(() => calculateWithParams(null)).toThrow(TypeError)
      })

      it("rejects callable and array params with otherwise valid fields", () => {
        for (const params of createStructurallyCompleteInvalidParams()) {
          expect(() => calculateWithParams(params)).toThrow(TypeError)
        }
      })

      it("rejects iterable non-array percentage adjustments", () => {
        expect(() => calculate(80, new Set([0.25]), [])).toThrow(TypeError)
      })

      it("rejects iterable non-array fixed value adjustments", () => {
        expect(() => calculate(80, [], new Set([10]))).toThrow(TypeError)
      })

      it("rejects a non-number source stat", () => {
        expect(() => calculate("80", [], [])).toThrow(TypeError)
      })

      it("rejects a non-number percentage adjustment", () => {
        expect(() => calculate(80, ["0.25"], [])).toThrow(TypeError)
      })

      it("rejects a non-number fixed value adjustment", () => {
        expect(() => calculate(80, [], ["10"])).toThrow(TypeError)
      })

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

      it("rejects a negative source stat even when the result would be zero", () => {
        expect(() => calculate(-1, [-1], [])).toThrow(RangeError)
      })

      it("rejects a negative percentage multiplier for a zero source stat", () => {
        expect(() => calculate(0, [-1.25], [])).toThrow(RangeError)
      })

      it("rejects a negative result", () => {
        expect(() => calculate(0, [], [-1])).toThrow(RangeError)
      })

      it("rejects a non-finite percentage adjustment result", () => {
        expect(() =>
          calculate(1, [Number.MAX_VALUE, Number.MAX_VALUE], []),
        ).toThrow(RangeError)
      })

      it("rejects a non-finite multiplication result", () => {
        expect(() => calculate(Number.MAX_VALUE, [1], [])).toThrow(RangeError)
      })

      it("rejects a non-finite fixed value adjustment result", () => {
        expect(() =>
          calculate(0, [], [Number.MAX_VALUE, Number.MAX_VALUE]),
        ).toThrow(RangeError)
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

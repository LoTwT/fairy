import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_REFRINGE_FACTOR_INPUT,
  REFRINGE_FACTOR_ID,
  calculateRefringeMultiplier,
  refringeFactor,
  type CalculateRefringeMultiplierParams,
  type Factor,
  type RefringeFactorInput,
} from "../src/index.ts"

describe("refringeFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<RefringeFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(REFRINGE_FACTOR_ID).toEqualTypeOf<"refringe">()
    expectTypeOf(DEFAULT_REFRINGE_FACTOR_INPUT).toEqualTypeOf<number>()
    expectTypeOf(refringeFactor).toEqualTypeOf<Factor<RefringeFactorInput>>()

    expect(REFRINGE_FACTOR_ID).toBe("refringe")
    expect(refringeFactor.factorId).toBe(REFRINGE_FACTOR_ID)
    expect(Object.isFrozen(refringeFactor)).toBe(true)
  })

  it("provides the primitive identity input", () => {
    expect(DEFAULT_REFRINGE_FACTOR_INPUT).toBe(1)
    expect(refringeFactor.calculate(DEFAULT_REFRINGE_FACTOR_INPUT)).toBe(1)
  })

  it.each([1, 1.08, 1.38, Number.MAX_VALUE])(
    "returns the valid settled multiplier %s unchanged",
    (input) => {
      expect(refringeFactor.calculate(input)).toBe(input)
    },
  )

  it.each([undefined, null, "1", true, {}, [1]])(
    "rejects the non-number input %s",
    (input) => {
      expect(() =>
        refringeFactor.calculate(input as unknown as RefringeFactorInput),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, 1 - Number.EPSILON, 0, -1])(
    "rejects the invalid multiplier %s",
    (input) => {
      expect(() => refringeFactor.calculate(input)).toThrow(RangeError)
    },
  )
})

describe("calculateRefringeMultiplier", () => {
  it("exposes its public parameter and function types", () => {
    expectTypeOf<CalculateRefringeMultiplierParams>().toEqualTypeOf<{
      readonly remielleAnomalyProficiency: number
      readonly refringeCoefficientIncreases: readonly number[]
    }>()
    expectTypeOf(calculateRefringeMultiplier).toEqualTypeOf<
      (params: CalculateRefringeMultiplierParams) => number
    >()
  })

  it.each([
    [0, [], 1],
    [400, [], 1.08],
    [400, [0.1], 1.18],
    [400, [0.1, 0.2], 1.38],
  ] as const)(
    "calculates AP %s and coefficient increases %s",
    (remielleAnomalyProficiency, refringeCoefficientIncreases, expected) => {
      expect(
        calculateRefringeMultiplier({
          remielleAnomalyProficiency,
          refringeCoefficientIncreases,
        }),
      ).toBe(expected)
    },
  )

  it("preserves indexed contribution order and repeated values", () => {
    const refringeCoefficientIncreases = [0.2, 0.1, 0.2]
    const expected = 1 + (400 * 0.0002 + 0.2 + 0.1 + 0.2)

    expect(
      calculateRefringeMultiplier({
        remielleAnomalyProficiency: 400,
        refringeCoefficientIncreases,
      }),
    ).toBe(expected)
  })

  it("uses array indices rather than a caller-controlled iterator", () => {
    const refringeCoefficientIncreases = [0.1, 0.2]
    Object.defineProperty(refringeCoefficientIncreases, Symbol.iterator, {
      value: function* () {
        yield 10
      },
    })

    expect(
      calculateRefringeMultiplier({
        remielleAnomalyProficiency: 400,
        refringeCoefficientIncreases,
      }),
    ).toBe(1.38)
  })

  it("does not modify or freeze its parameter object or contribution array", () => {
    const refringeCoefficientIncreases = Object.freeze([0.1, 0.2])
    const params = Object.freeze({
      remielleAnomalyProficiency: 400,
      refringeCoefficientIncreases,
    })

    calculateRefringeMultiplier(params)

    expect(params).toEqual({
      remielleAnomalyProficiency: 400,
      refringeCoefficientIncreases: [0.1, 0.2],
    })
    expect(Object.isFrozen(params)).toBe(true)
    expect(Object.isFrozen(refringeCoefficientIncreases)).toBe(true)
  })

  it("rejects parameters that are not non-array objects", () => {
    const fields = {
      remielleAnomalyProficiency: 400,
      refringeCoefficientIncreases: [],
    }

    for (const params of [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]) {
      expect(() =>
        calculateRefringeMultiplier(
          params as unknown as CalculateRefringeMultiplierParams,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([undefined, null, "400", true])(
    "rejects the non-number anomaly proficiency %s",
    (remielleAnomalyProficiency) => {
      expect(() =>
        calculateRefringeMultiplier({
          remielleAnomalyProficiency,
          refringeCoefficientIncreases: [],
        } as unknown as CalculateRefringeMultiplierParams),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, -1])(
    "rejects the invalid anomaly proficiency %s",
    (remielleAnomalyProficiency) => {
      expect(() =>
        calculateRefringeMultiplier({
          remielleAnomalyProficiency,
          refringeCoefficientIncreases: [],
        }),
      ).toThrow(RangeError)
    },
  )

  it.each([undefined, null, {}, "0.1", new Float64Array([0.1])])(
    "rejects the non-array coefficient increases %s",
    (refringeCoefficientIncreases) => {
      expect(() =>
        calculateRefringeMultiplier({
          remielleAnomalyProficiency: 400,
          refringeCoefficientIncreases,
        } as unknown as CalculateRefringeMultiplierParams),
      ).toThrow(TypeError)
    },
  )

  it("rejects a sparse coefficient increases array", () => {
    const refringeCoefficientIncreases = [0]
    delete refringeCoefficientIncreases[0]

    expect(() =>
      calculateRefringeMultiplier({
        remielleAnomalyProficiency: 400,
        refringeCoefficientIncreases,
      }),
    ).toThrow(TypeError)
  })

  it.each([undefined, null, "0.1", true])(
    "rejects the non-number coefficient increase %s",
    (increase) => {
      expect(() =>
        calculateRefringeMultiplier({
          remielleAnomalyProficiency: 400,
          refringeCoefficientIncreases: [increase as unknown as number],
        }),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, -Number.EPSILON, -1])(
    "rejects the invalid coefficient increase %s",
    (increase) => {
      expect(() =>
        calculateRefringeMultiplier({
          remielleAnomalyProficiency: 400,
          refringeCoefficientIncreases: [increase],
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects an overflowing sequential coefficient sum", () => {
    expect(() =>
      calculateRefringeMultiplier({
        remielleAnomalyProficiency: 0,
        refringeCoefficientIncreases: [Number.MAX_VALUE, Number.MAX_VALUE],
      }),
    ).toThrow(RangeError)
  })
})

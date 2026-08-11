import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_ADRENALINE_GENERATION_FACTOR_ID,
  baseAdrenalineGenerationFactor,
  type BaseAdrenalineGenerationFactorInput,
  type Factor,
} from "../src/index.ts"

describe("baseAdrenalineGenerationFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseAdrenalineGenerationFactorInput>().toEqualTypeOf<{
      readonly baseAdrenalineGenerationValues: readonly number[]
      readonly finalAdrenalineRegen: number
      readonly effectiveAdrenalineRegenDurationInSeconds: number
    }>()
    expectTypeOf(
      BASE_ADRENALINE_GENERATION_FACTOR_ID,
    ).toEqualTypeOf<"base_adrenaline_generation">()
    expectTypeOf(baseAdrenalineGenerationFactor).toEqualTypeOf<
      Factor<BaseAdrenalineGenerationFactorInput>
    >()

    expect(BASE_ADRENALINE_GENERATION_FACTOR_ID).toBe(
      "base_adrenaline_generation",
    )
    expect(baseAdrenalineGenerationFactor.factorId).toBe(
      BASE_ADRENALINE_GENERATION_FACTOR_ID,
    )
    expect(Object.isFrozen(baseAdrenalineGenerationFactor)).toBe(true)
  })

  it("returns zero for empty one-time generation and zero automatic generation", () => {
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toBe(0)
  })

  it("adds one-time generation to automatic generation", () => {
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [10, 20],
        finalAdrenalineRegen: 2.5,
        effectiveAdrenalineRegenDurationInSeconds: 4,
      }),
    ).toBe(40)
  })

  it("counts duplicate one-time generation values independently", () => {
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [15, 15],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toBe(30)
  })

  it("accumulates one-time generation values in array order", () => {
    const largeValue = 2 ** 53

    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [largeValue, 1, 1],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toBe(largeValue)
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [1, 1, largeValue],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toBe(largeValue + 2)
  })

  it("accepts zero in every numeric input position", () => {
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [0, 10],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 10,
      }),
    ).toBe(10)
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: 10,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toBe(0)
  })

  it("does not round or clamp a valid result", () => {
    const baseAdrenalineGenerationValue = 0.123456789
    const finalAdrenalineRegen = 10.987654321
    const effectiveAdrenalineRegenDurationInSeconds = 0.25

    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [baseAdrenalineGenerationValue],
        finalAdrenalineRegen,
        effectiveAdrenalineRegenDurationInSeconds,
      }),
    ).toBe(
      baseAdrenalineGenerationValue +
        finalAdrenalineRegen * effectiveAdrenalineRegenDurationInSeconds,
    )
  })

  it("does not modify its input or one-time generation array", () => {
    const baseAdrenalineGenerationValues = Object.freeze([10, 20])
    const input = Object.freeze({
      baseAdrenalineGenerationValues,
      finalAdrenalineRegen: 2.5,
      effectiveAdrenalineRegenDurationInSeconds: 4,
    })

    expect(baseAdrenalineGenerationFactor.calculate(input)).toBe(40)
    expect(input).toEqual({
      baseAdrenalineGenerationValues: [10, 20],
      finalAdrenalineRegen: 2.5,
      effectiveAdrenalineRegenDurationInSeconds: 4,
    })
    expect(Object.isFrozen(baseAdrenalineGenerationValues)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      baseAdrenalineGenerationValues: [],
      finalAdrenalineRegen: 0,
      effectiveAdrenalineRegenDurationInSeconds: 0,
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        baseAdrenalineGenerationFactor.calculate(
          input as unknown as BaseAdrenalineGenerationFactorInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-array one-time generation field", () => {
    const input = {
      baseAdrenalineGenerationValues: new Set([10]),
      finalAdrenalineRegen: 0,
      effectiveAdrenalineRegenDurationInSeconds: 0,
    } as unknown as BaseAdrenalineGenerationFactorInput

    expect(() => baseAdrenalineGenerationFactor.calculate(input)).toThrow(
      TypeError,
    )
  })

  it("rejects a non-number one-time generation value", () => {
    const input = {
      baseAdrenalineGenerationValues: ["10"],
      finalAdrenalineRegen: 0,
      effectiveAdrenalineRegenDurationInSeconds: 0,
    } as unknown as BaseAdrenalineGenerationFactorInput

    expect(() => baseAdrenalineGenerationFactor.calculate(input)).toThrow(
      TypeError,
    )
  })

  describe.each([
    "finalAdrenalineRegen",
    "effectiveAdrenalineRegenDurationInSeconds",
  ] as const)("%s validation", (field) => {
    it("rejects a non-number value", () => {
      const input = {
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
        [field]: "1",
      } as unknown as BaseAdrenalineGenerationFactorInput

      expect(() => baseAdrenalineGenerationFactor.calculate(input)).toThrow(
        TypeError,
      )
    })

    it.each([NaN, Infinity, -Infinity])(
      "rejects the non-finite value %s",
      (value) => {
        const input = {
          baseAdrenalineGenerationValues: [],
          finalAdrenalineRegen: 0,
          effectiveAdrenalineRegenDurationInSeconds: 0,
          [field]: value,
        }

        expect(() => baseAdrenalineGenerationFactor.calculate(input)).toThrow(
          RangeError,
        )
      },
    )

    it("rejects a negative value", () => {
      const input = {
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
        [field]: -1,
      }

      expect(() => baseAdrenalineGenerationFactor.calculate(input)).toThrow(
        RangeError,
      )
    })
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite one-time generation value %s",
    (value) => {
      expect(() =>
        baseAdrenalineGenerationFactor.calculate({
          baseAdrenalineGenerationValues: [value],
          finalAdrenalineRegen: 0,
          effectiveAdrenalineRegenDurationInSeconds: 0,
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects a negative one-time generation value", () => {
    expect(() =>
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [-1],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by one-time generation overflow", () => {
    expect(() =>
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [Number.MAX_VALUE, Number.MAX_VALUE],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by automatic generation overflow", () => {
    expect(() =>
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: Number.MAX_VALUE,
        effectiveAdrenalineRegenDurationInSeconds: 2,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by final addition overflow", () => {
    expect(() =>
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [Number.MAX_VALUE],
        finalAdrenalineRegen: Number.MAX_VALUE,
        effectiveAdrenalineRegenDurationInSeconds: 1,
      }),
    ).toThrow(RangeError)
  })

  it("does not impose unconfirmed finite upper bounds", () => {
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [Number.MAX_VALUE],
        finalAdrenalineRegen: 0,
        effectiveAdrenalineRegenDurationInSeconds: 0,
      }),
    ).toBe(Number.MAX_VALUE)
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: Number.MAX_VALUE,
        effectiveAdrenalineRegenDurationInSeconds: 1,
      }),
    ).toBe(Number.MAX_VALUE)
    expect(
      baseAdrenalineGenerationFactor.calculate({
        baseAdrenalineGenerationValues: [],
        finalAdrenalineRegen: 1,
        effectiveAdrenalineRegenDurationInSeconds: Number.MAX_VALUE,
      }),
    ).toBe(Number.MAX_VALUE)
  })
})

import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_ENERGY_GENERATION_FACTOR_ID,
  baseEnergyGenerationFactor,
  type BaseEnergyGenerationFactorInput,
  type Factor,
} from "../src/index.ts"

describe("baseEnergyGenerationFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseEnergyGenerationFactorInput>().toEqualTypeOf<{
      readonly baseEnergyGenerationValues: readonly number[]
      readonly finalEnergyRegen: number
      readonly effectiveEnergyRegenDurationInSeconds: number
    }>()
    expectTypeOf(
      BASE_ENERGY_GENERATION_FACTOR_ID,
    ).toEqualTypeOf<"base_energy_generation">()
    expectTypeOf(baseEnergyGenerationFactor).toEqualTypeOf<
      Factor<BaseEnergyGenerationFactorInput>
    >()

    expect(BASE_ENERGY_GENERATION_FACTOR_ID).toBe("base_energy_generation")
    expect(baseEnergyGenerationFactor.factorId).toBe(
      BASE_ENERGY_GENERATION_FACTOR_ID,
    )
    expect(Object.isFrozen(baseEnergyGenerationFactor)).toBe(true)
  })

  it("returns zero for empty one-time generation and zero automatic generation", () => {
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toBe(0)
  })

  it("adds one-time generation to automatic generation", () => {
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [10, 20],
        finalEnergyRegen: 2.5,
        effectiveEnergyRegenDurationInSeconds: 4,
      }),
    ).toBe(40)
  })

  it("counts duplicate one-time generation values independently", () => {
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [15, 15],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toBe(30)
  })

  it("accumulates one-time generation values in array order", () => {
    const largeValue = 2 ** 53

    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [largeValue, 1, 1],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toBe(largeValue)
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [1, 1, largeValue],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toBe(largeValue + 2)
  })

  it("accepts zero in every numeric input position", () => {
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [0, 10],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 10,
      }),
    ).toBe(10)
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [],
        finalEnergyRegen: 10,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toBe(0)
  })

  it("does not round or clamp a valid result", () => {
    const baseEnergyGenerationValue = 0.123456789
    const finalEnergyRegen = 10.987654321
    const effectiveEnergyRegenDurationInSeconds = 0.25

    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [baseEnergyGenerationValue],
        finalEnergyRegen,
        effectiveEnergyRegenDurationInSeconds,
      }),
    ).toBe(
      baseEnergyGenerationValue +
        finalEnergyRegen * effectiveEnergyRegenDurationInSeconds,
    )
  })

  it("does not modify its input or one-time generation array", () => {
    const baseEnergyGenerationValues = Object.freeze([10, 20])
    const input = Object.freeze({
      baseEnergyGenerationValues,
      finalEnergyRegen: 2.5,
      effectiveEnergyRegenDurationInSeconds: 4,
    })

    expect(baseEnergyGenerationFactor.calculate(input)).toBe(40)
    expect(input).toEqual({
      baseEnergyGenerationValues: [10, 20],
      finalEnergyRegen: 2.5,
      effectiveEnergyRegenDurationInSeconds: 4,
    })
    expect(Object.isFrozen(baseEnergyGenerationValues)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      baseEnergyGenerationValues: [],
      finalEnergyRegen: 0,
      effectiveEnergyRegenDurationInSeconds: 0,
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        baseEnergyGenerationFactor.calculate(
          input as unknown as BaseEnergyGenerationFactorInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-array one-time generation field", () => {
    const input = {
      baseEnergyGenerationValues: new Set([10]),
      finalEnergyRegen: 0,
      effectiveEnergyRegenDurationInSeconds: 0,
    } as unknown as BaseEnergyGenerationFactorInput

    expect(() => baseEnergyGenerationFactor.calculate(input)).toThrow(TypeError)
  })

  it("rejects a non-number one-time generation value", () => {
    const input = {
      baseEnergyGenerationValues: ["10"],
      finalEnergyRegen: 0,
      effectiveEnergyRegenDurationInSeconds: 0,
    } as unknown as BaseEnergyGenerationFactorInput

    expect(() => baseEnergyGenerationFactor.calculate(input)).toThrow(TypeError)
  })

  describe.each([
    "finalEnergyRegen",
    "effectiveEnergyRegenDurationInSeconds",
  ] as const)("%s validation", (field) => {
    it("rejects a non-number value", () => {
      const input = {
        baseEnergyGenerationValues: [],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
        [field]: "1",
      } as unknown as BaseEnergyGenerationFactorInput

      expect(() => baseEnergyGenerationFactor.calculate(input)).toThrow(
        TypeError,
      )
    })

    it.each([NaN, Infinity, -Infinity])(
      "rejects the non-finite value %s",
      (value) => {
        const input = {
          baseEnergyGenerationValues: [],
          finalEnergyRegen: 0,
          effectiveEnergyRegenDurationInSeconds: 0,
          [field]: value,
        }

        expect(() => baseEnergyGenerationFactor.calculate(input)).toThrow(
          RangeError,
        )
      },
    )

    it("rejects a negative value", () => {
      const input = {
        baseEnergyGenerationValues: [],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
        [field]: -1,
      }

      expect(() => baseEnergyGenerationFactor.calculate(input)).toThrow(
        RangeError,
      )
    })
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite one-time generation value %s",
    (value) => {
      expect(() =>
        baseEnergyGenerationFactor.calculate({
          baseEnergyGenerationValues: [value],
          finalEnergyRegen: 0,
          effectiveEnergyRegenDurationInSeconds: 0,
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects a negative one-time generation value", () => {
    expect(() =>
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [-1],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by one-time generation overflow", () => {
    expect(() =>
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [Number.MAX_VALUE, Number.MAX_VALUE],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by automatic generation overflow", () => {
    expect(() =>
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [],
        finalEnergyRegen: Number.MAX_VALUE,
        effectiveEnergyRegenDurationInSeconds: 2,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by final addition overflow", () => {
    expect(() =>
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [Number.MAX_VALUE],
        finalEnergyRegen: Number.MAX_VALUE,
        effectiveEnergyRegenDurationInSeconds: 1,
      }),
    ).toThrow(RangeError)
  })

  it("does not impose unconfirmed finite upper bounds", () => {
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [Number.MAX_VALUE],
        finalEnergyRegen: 0,
        effectiveEnergyRegenDurationInSeconds: 0,
      }),
    ).toBe(Number.MAX_VALUE)
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [],
        finalEnergyRegen: Number.MAX_VALUE,
        effectiveEnergyRegenDurationInSeconds: 1,
      }),
    ).toBe(Number.MAX_VALUE)
    expect(
      baseEnergyGenerationFactor.calculate({
        baseEnergyGenerationValues: [],
        finalEnergyRegen: 1,
        effectiveEnergyRegenDurationInSeconds: Number.MAX_VALUE,
      }),
    ).toBe(Number.MAX_VALUE)
  })
})

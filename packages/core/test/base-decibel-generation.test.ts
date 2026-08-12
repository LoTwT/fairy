import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_DECIBEL_GENERATION_FACTOR_ID,
  baseDecibelGenerationFactor,
  type BaseDecibelGenerationFactorInput,
  type Factor,
} from "../src/index.ts"

describe("baseDecibelGenerationFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseDecibelGenerationFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      BASE_DECIBEL_GENERATION_FACTOR_ID,
    ).toEqualTypeOf<"base_decibel_generation">()
    expectTypeOf(baseDecibelGenerationFactor).toEqualTypeOf<
      Factor<BaseDecibelGenerationFactorInput>
    >()

    expect(BASE_DECIBEL_GENERATION_FACTOR_ID).toBe("base_decibel_generation")
    expect(baseDecibelGenerationFactor.factorId).toBe(
      BASE_DECIBEL_GENERATION_FACTOR_ID,
    )
    expect(Object.isFrozen(baseDecibelGenerationFactor)).toBe(true)
  })

  it.each([0, 1, 123.456789, Number.MAX_VALUE])(
    "returns the finite non-negative input %s unchanged",
    (input) => {
      expect(baseDecibelGenerationFactor.calculate(input)).toBe(input)
    },
  )

  it.each([
    ["string", "100"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 100 }],
    ["array", [100]],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      baseDecibelGenerationFactor.calculate(
        input as unknown as BaseDecibelGenerationFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => baseDecibelGenerationFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )

  it("rejects a negative input", () => {
    expect(() => baseDecibelGenerationFactor.calculate(-1)).toThrow(RangeError)
  })
})

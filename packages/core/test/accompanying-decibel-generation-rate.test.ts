import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  accompanyingDecibelGenerationRateFactor,
  type AccompanyingDecibelGenerationRateFactorInput,
  type Factor,
} from "../src/index.ts"

describe("accompanyingDecibelGenerationRateFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AccompanyingDecibelGenerationRateFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
    ).toEqualTypeOf<"accompanying_decibel_generation_rate">()
    expectTypeOf(
      DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
    ).toEqualTypeOf<AccompanyingDecibelGenerationRateFactorInput>()
    expectTypeOf(accompanyingDecibelGenerationRateFactor).toEqualTypeOf<
      Factor<AccompanyingDecibelGenerationRateFactorInput>
    >()

    expect(ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID).toBe(
      "accompanying_decibel_generation_rate",
    )
    expect(accompanyingDecibelGenerationRateFactor.factorId).toBe(
      ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
    )
    expect(Object.isFrozen(accompanyingDecibelGenerationRateFactor)).toBe(true)
  })

  it("provides an immutable primitive default input with an identity result", () => {
    expect(DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT).toBe(1)
    expect(
      accompanyingDecibelGenerationRateFactor.calculate(
        DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it.each([0, 0.5, 0.525, 1, 1.23456789])(
    "returns the finite non-negative multiplier %s unchanged",
    (input) => {
      expect(accompanyingDecibelGenerationRateFactor.calculate(input)).toBe(
        input,
      )
    },
  )

  it("does not impose an upper bound or clamp the multiplier", () => {
    expect(accompanyingDecibelGenerationRateFactor.calculate(2)).toBe(2)
    expect(
      accompanyingDecibelGenerationRateFactor.calculate(Number.MAX_VALUE),
    ).toBe(Number.MAX_VALUE)
  })

  it.each([
    ["string", "1"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { multiplier: 1 }],
    ["array", [1]],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      accompanyingDecibelGenerationRateFactor.calculate(
        input as unknown as AccompanyingDecibelGenerationRateFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() =>
        accompanyingDecibelGenerationRateFactor.calculate(input),
      ).toThrow(RangeError)
    },
  )

  it.each([-Number.EPSILON, -1, -Number.MAX_VALUE])(
    "rejects the negative input %s",
    (input) => {
      expect(() =>
        accompanyingDecibelGenerationRateFactor.calculate(input),
      ).toThrow(RangeError)
    },
  )
})

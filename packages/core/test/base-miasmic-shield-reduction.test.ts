import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
  baseMiasmicShieldReductionFactor,
  type BaseMiasmicShieldReductionFactorInput,
  type Factor,
} from "../src/index.ts"

describe("baseMiasmicShieldReductionFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseMiasmicShieldReductionFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
    ).toEqualTypeOf<"base_miasmic_shield_reduction">()
    expectTypeOf(baseMiasmicShieldReductionFactor).toEqualTypeOf<
      Factor<BaseMiasmicShieldReductionFactorInput>
    >()

    expect(BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID).toBe(
      "base_miasmic_shield_reduction",
    )
    expect(baseMiasmicShieldReductionFactor.factorId).toBe(
      BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
    )
    expect(Object.isFrozen(baseMiasmicShieldReductionFactor)).toBe(true)
  })

  it.each([0, 1, 123.456789, Number.MAX_VALUE])(
    "returns the finite non-negative input %s unchanged",
    (input) => {
      expect(baseMiasmicShieldReductionFactor.calculate(input)).toBe(input)
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
      baseMiasmicShieldReductionFactor.calculate(
        input as unknown as BaseMiasmicShieldReductionFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => baseMiasmicShieldReductionFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )

  it("rejects a negative input", () => {
    expect(() => baseMiasmicShieldReductionFactor.calculate(-1)).toThrow(
      RangeError,
    )
  })
})

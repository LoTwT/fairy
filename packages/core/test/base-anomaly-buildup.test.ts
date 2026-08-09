import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_ANOMALY_BUILDUP_FACTOR_ID,
  baseAnomalyBuildupFactor,
  type BaseAnomalyBuildupFactorInput,
  type Factor,
} from "../src/index.ts"

describe("baseAnomalyBuildupFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseAnomalyBuildupFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      BASE_ANOMALY_BUILDUP_FACTOR_ID,
    ).toEqualTypeOf<"base_anomaly_buildup">()
    expectTypeOf(baseAnomalyBuildupFactor).toEqualTypeOf<
      Factor<BaseAnomalyBuildupFactorInput>
    >()

    expect(BASE_ANOMALY_BUILDUP_FACTOR_ID).toBe("base_anomaly_buildup")
    expect(baseAnomalyBuildupFactor.factorId).toBe(
      BASE_ANOMALY_BUILDUP_FACTOR_ID,
    )
    expect(Object.isFrozen(baseAnomalyBuildupFactor)).toBe(true)
  })

  it.each([0, 1, 123.456789, Number.MAX_VALUE])(
    "returns the finite non-negative input %s unchanged",
    (input) => {
      expect(baseAnomalyBuildupFactor.calculate(input)).toBe(input)
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
      baseAnomalyBuildupFactor.calculate(
        input as unknown as BaseAnomalyBuildupFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => baseAnomalyBuildupFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )

  it("rejects a negative input", () => {
    expect(() => baseAnomalyBuildupFactor.calculate(-1)).toThrow(RangeError)
  })
})

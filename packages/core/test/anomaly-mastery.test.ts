import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_MASTERY_FACTOR_ID,
  DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  anomalyMasteryFactor,
  type AnomalyMasteryFactorInput,
  type Factor,
} from "../src/index.ts"

describe("anomalyMasteryFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyMasteryFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(ANOMALY_MASTERY_FACTOR_ID).toEqualTypeOf<"anomaly_mastery">()
    expectTypeOf(
      DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
    ).toEqualTypeOf<AnomalyMasteryFactorInput>()
    expectTypeOf(anomalyMasteryFactor).toEqualTypeOf<
      Factor<AnomalyMasteryFactorInput>
    >()

    expect(ANOMALY_MASTERY_FACTOR_ID).toBe("anomaly_mastery")
    expect(anomalyMasteryFactor.factorId).toBe(ANOMALY_MASTERY_FACTOR_ID)
    expect(Object.isFrozen(anomalyMasteryFactor)).toBe(true)
  })

  it("provides a default input with an identity result", () => {
    expect(DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT).toBe(100)
    expect(
      anomalyMasteryFactor.calculate(DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT),
    ).toBe(1)
  })

  it.each([
    [0, 0],
    [99.9, 0.99],
    [100, 1],
    [100.9, 1],
    [299.9, 2.99],
    [300, 3],
    [300.9, 3],
  ])(
    "converts anomaly mastery %s to multiplier %s",
    (anomalyMastery, expectedMultiplier) => {
      expect(anomalyMasteryFactor.calculate(anomalyMastery)).toBe(
        expectedMultiplier,
      )
    },
  )

  it("clamps the multiplier to three without imposing an input upper bound", () => {
    expect(anomalyMasteryFactor.calculate(301)).toBe(3)
    expect(anomalyMasteryFactor.calculate(Number.MAX_VALUE)).toBe(3)
  })

  it.each([
    ["string", "100"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 100 }],
    ["array", [100]],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      anomalyMasteryFactor.calculate(
        input as unknown as AnomalyMasteryFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s before flooring and clamping",
    (input) => {
      expect(() => anomalyMasteryFactor.calculate(input)).toThrow(RangeError)
    },
  )

  it("rejects a negative input", () => {
    expect(() => anomalyMasteryFactor.calculate(-1)).toThrow(RangeError)
  })
})

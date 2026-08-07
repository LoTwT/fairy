import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_PROFICIENCY_FACTOR_ID,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  anomalyProficiencyFactor,
  type AnomalyProficiencyFactorInput,
  type Factor,
} from "../src/index.ts"

describe("anomalyProficiencyFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyProficiencyFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      ANOMALY_PROFICIENCY_FACTOR_ID,
    ).toEqualTypeOf<"anomaly_proficiency">()
    expectTypeOf(
      DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
    ).toEqualTypeOf<AnomalyProficiencyFactorInput>()
    expectTypeOf(anomalyProficiencyFactor).toEqualTypeOf<
      Factor<AnomalyProficiencyFactorInput>
    >()

    expect(ANOMALY_PROFICIENCY_FACTOR_ID).toBe("anomaly_proficiency")
    expect(anomalyProficiencyFactor.factorId).toBe(
      ANOMALY_PROFICIENCY_FACTOR_ID,
    )
    expect(Object.isFrozen(anomalyProficiencyFactor)).toBe(true)
  })

  it("provides a default input with an identity result", () => {
    expect(DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT).toBe(100)
    expect(
      anomalyProficiencyFactor.calculate(
        DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it.each([
    [0, 0],
    [100, 1],
    [250, 2.5],
    [1000, 10],
  ])(
    "converts anomaly proficiency %s to multiplier %s",
    (anomalyProficiency, expectedMultiplier) => {
      expect(anomalyProficiencyFactor.calculate(anomalyProficiency)).toBe(
        expectedMultiplier,
      )
    },
  )

  it("does not round a valid result", () => {
    const anomalyProficiency = 123.456789

    expect(anomalyProficiencyFactor.calculate(anomalyProficiency)).toBe(
      anomalyProficiency / 100,
    )
  })

  it("clamps the multiplier to ten without imposing an input upper bound", () => {
    expect(anomalyProficiencyFactor.calculate(1000)).toBe(10)
    expect(anomalyProficiencyFactor.calculate(1001)).toBe(10)
    expect(anomalyProficiencyFactor.calculate(Number.MAX_VALUE)).toBe(10)
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
      anomalyProficiencyFactor.calculate(
        input as unknown as AnomalyProficiencyFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => anomalyProficiencyFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )

  it("rejects a negative input", () => {
    expect(() => anomalyProficiencyFactor.calculate(-1)).toThrow(RangeError)
  })
})

import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  anomalyDamageLevelFactor,
  type AnomalyDamageLevelFactorInput,
  type Factor,
} from "../src/index.ts"

describe("anomalyDamageLevelFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyDamageLevelFactorInput>().toEqualTypeOf<number>()
    expectTypeOf(
      ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
    ).toEqualTypeOf<"anomaly_damage_level">()
    expectTypeOf(
      DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
    ).toEqualTypeOf<AnomalyDamageLevelFactorInput>()
    expectTypeOf(anomalyDamageLevelFactor).toEqualTypeOf<
      Factor<AnomalyDamageLevelFactorInput>
    >()

    expect(ANOMALY_DAMAGE_LEVEL_FACTOR_ID).toBe("anomaly_damage_level")
    expect(anomalyDamageLevelFactor.factorId).toBe(
      ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
    )
    expect(Object.isFrozen(anomalyDamageLevelFactor)).toBe(true)
  })

  it("provides an identity default input", () => {
    expect(DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT).toBe(1)
    expect(
      anomalyDamageLevelFactor.calculate(
        DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
      ),
    ).toBe(1)
  })

  it.each([
    [1, 1],
    [2, 1.0169],
    [30, 1.4915],
    [60, 2],
  ])("calculates the multiplier for level %i", (level, multiplier) => {
    expect(anomalyDamageLevelFactor.calculate(level)).toBe(multiplier)
  })

  it("truncates to four decimal places instead of rounding", () => {
    expect(anomalyDamageLevelFactor.calculate(2)).toBe(1.0169)
    expect(anomalyDamageLevelFactor.calculate(2)).not.toBe(1.017)
  })

  it.each([
    ["string", "1"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { level: 1 }],
  ])("rejects a non-number %s input", (_name, input) => {
    expect(() =>
      anomalyDamageLevelFactor.calculate(
        input as unknown as AnomalyDamageLevelFactorInput,
      ),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => anomalyDamageLevelFactor.calculate(input)).toThrow(
        RangeError,
      )
    },
  )

  it.each([1.5, 59.9999])("rejects the non-integer input %s", (input) => {
    expect(() => anomalyDamageLevelFactor.calculate(input)).toThrow(RangeError)
  })

  it.each([0, -1, 61])("rejects the out-of-range input %s", (input) => {
    expect(() => anomalyDamageLevelFactor.calculate(input)).toThrow(RangeError)
  })
})

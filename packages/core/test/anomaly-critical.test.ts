import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_CRITICAL_FACTOR_ID,
  DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  anomalyCriticalFactor,
  type AnomalyCriticalFactorInput,
  type Factor,
} from "../src/index.ts"

function createAnomalyCriticalInput(
  anomalyCriticalDamageContributions: readonly number[],
): AnomalyCriticalFactorInput {
  return {
    isAnomalyCritical: true,
    anomalyCriticalDamageContributions,
  }
}

describe("anomalyCriticalFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyCriticalFactorInput>().toEqualTypeOf<{
      readonly isAnomalyCritical: boolean
      readonly anomalyCriticalDamageContributions: readonly number[]
    }>()
    expectTypeOf(ANOMALY_CRITICAL_FACTOR_ID).toEqualTypeOf<"anomaly_critical">()
    expectTypeOf(
      DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
    ).toEqualTypeOf<AnomalyCriticalFactorInput>()
    expectTypeOf(anomalyCriticalFactor).toEqualTypeOf<
      Factor<AnomalyCriticalFactorInput>
    >()

    expect(ANOMALY_CRITICAL_FACTOR_ID).toBe("anomaly_critical")
    expect(anomalyCriticalFactor.factorId).toBe(ANOMALY_CRITICAL_FACTOR_ID)
    expect(Object.isFrozen(anomalyCriticalFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT).toEqual({
      isAnomalyCritical: false,
      anomalyCriticalDamageContributions: [],
    })
    expect(Object.isFrozen(DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT.anomalyCriticalDamageContributions,
      ),
    ).toBe(true)
    expect(
      anomalyCriticalFactor.calculate(DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT),
    ).toBe(1)
  })

  it("returns one for an anomaly critical hit without damage contributions", () => {
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([])),
    ).toBe(1)
  })

  it("sums signed damage contributions for an anomaly critical hit", () => {
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([0.5])),
    ).toBe(1.5)
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([0.5, 0.25])),
    ).toBe(1.75)
    expect(
      anomalyCriticalFactor.calculate(
        createAnomalyCriticalInput([0.5, -0.125]),
      ),
    ).toBe(1.375)
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([0.25, 0.25])),
    ).toBe(1.5)
  })

  it("returns one and ignores valid contributions when not anomaly critical", () => {
    expect(
      anomalyCriticalFactor.calculate({
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [0.5, 2, -1],
      }),
    ).toBe(1)
  })

  it("does not sum contributions when not anomaly critical", () => {
    expect(
      anomalyCriticalFactor.calculate({
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [
          Number.MAX_VALUE,
          Number.MAX_VALUE,
        ],
      }),
    ).toBe(1)
  })

  it("sums contributions in array order", () => {
    const largeValue = 2 ** 53

    expect(
      anomalyCriticalFactor.calculate(
        createAnomalyCriticalInput([largeValue, -largeValue, 1]),
      ),
    ).toBe(2)
    expect(
      anomalyCriticalFactor.calculate(
        createAnomalyCriticalInput([largeValue, 1, -largeValue]),
      ),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const contribution = 0.123456789

    expect(
      anomalyCriticalFactor.calculate(
        createAnomalyCriticalInput([contribution]),
      ),
    ).toBe(1 + contribution)
  })

  it("clamps anomaly critical damage to the inclusive range from zero to two", () => {
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([-1])),
    ).toBe(1)
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([0])),
    ).toBe(1)
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([2])),
    ).toBe(3)
    expect(
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput([10])),
    ).toBe(3)
  })

  it("does not modify the input object or contribution array", () => {
    const anomalyCriticalDamageContributions = Object.freeze([0.5, -0.125])
    const input = Object.freeze({
      isAnomalyCritical: true,
      anomalyCriticalDamageContributions,
    })

    expect(anomalyCriticalFactor.calculate(input)).toBe(1.375)
    expect(input).toEqual({
      isAnomalyCritical: true,
      anomalyCriticalDamageContributions: [0.5, -0.125],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      isAnomalyCritical: true,
      anomalyCriticalDamageContributions: [0.5],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        anomalyCriticalFactor.calculate(
          input as unknown as AnomalyCriticalFactorInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-boolean isAnomalyCritical value", () => {
    expect(() =>
      anomalyCriticalFactor.calculate({
        isAnomalyCritical: "true" as unknown as boolean,
        anomalyCriticalDamageContributions: [0.5],
      }),
    ).toThrow(TypeError)
  })

  it("rejects a contribution value that is not an array", () => {
    expect(() =>
      anomalyCriticalFactor.calculate({
        isAnomalyCritical: true,
        anomalyCriticalDamageContributions: new Set([
          0.5,
        ]) as unknown as readonly number[],
      }),
    ).toThrow(TypeError)
  })

  it.each([
    ["string", "0.5"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.5 }],
  ])("rejects a non-number %s contribution", (_name, contribution) => {
    const input = {
      isAnomalyCritical: true,
      anomalyCriticalDamageContributions: [contribution],
    } as unknown as AnomalyCriticalFactorInput

    expect(() => anomalyCriticalFactor.calculate(input)).toThrow(TypeError)
  })

  it("validates contribution members when not anomaly critical", () => {
    const input = {
      isAnomalyCritical: false,
      anomalyCriticalDamageContributions: ["0.5"],
    } as unknown as AnomalyCriticalFactorInput

    expect(() => anomalyCriticalFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite contribution %s",
    (contribution) => {
      expect(() =>
        anomalyCriticalFactor.calculate(
          createAnomalyCriticalInput([contribution]),
        ),
      ).toThrow(RangeError)
    },
  )

  it("validates non-finite contributions when not anomaly critical", () => {
    expect(() =>
      anomalyCriticalFactor.calculate({
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [NaN],
      }),
    ).toThrow(RangeError)
  })

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an anomaly critical damage sum that overflows", (...values) => {
    expect(() =>
      anomalyCriticalFactor.calculate(createAnomalyCriticalInput(values)),
    ).toThrow(RangeError)
  })
})

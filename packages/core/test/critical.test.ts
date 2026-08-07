import { describe, expect, expectTypeOf, it } from "vitest"
import {
  CRITICAL_FACTOR_ID,
  DEFAULT_CRITICAL_FACTOR_INPUT,
  criticalFactor,
  type CriticalFactorInput,
  type Factor,
} from "../src/index.ts"

function createCriticalInput(
  criticalDamageContributions: readonly number[],
): CriticalFactorInput {
  return {
    isCritical: true,
    criticalDamageContributions,
  }
}

describe("criticalFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<CriticalFactorInput>().toEqualTypeOf<{
      readonly isCritical: boolean
      readonly criticalDamageContributions: readonly number[]
    }>()
    expectTypeOf(CRITICAL_FACTOR_ID).toEqualTypeOf<"critical">()
    expectTypeOf(
      DEFAULT_CRITICAL_FACTOR_INPUT,
    ).toEqualTypeOf<CriticalFactorInput>()
    expectTypeOf(criticalFactor).toEqualTypeOf<Factor<CriticalFactorInput>>()

    expect(CRITICAL_FACTOR_ID).toBe("critical")
    expect(criticalFactor.factorId).toBe(CRITICAL_FACTOR_ID)
    expect(Object.isFrozen(criticalFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_CRITICAL_FACTOR_INPUT).toEqual({
      isCritical: false,
      criticalDamageContributions: [],
    })
    expect(Object.isFrozen(DEFAULT_CRITICAL_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_CRITICAL_FACTOR_INPUT.criticalDamageContributions,
      ),
    ).toBe(true)
    expect(criticalFactor.calculate(DEFAULT_CRITICAL_FACTOR_INPUT)).toBe(1)
  })

  it("returns one for a critical hit without critical damage contributions", () => {
    expect(criticalFactor.calculate(createCriticalInput([]))).toBe(1)
  })

  it("sums signed critical damage contributions for a critical hit", () => {
    expect(criticalFactor.calculate(createCriticalInput([0.5]))).toBe(1.5)
    expect(criticalFactor.calculate(createCriticalInput([0.5, 0.25]))).toBe(
      1.75,
    )
    expect(criticalFactor.calculate(createCriticalInput([0.5, -0.125]))).toBe(
      1.375,
    )
    expect(criticalFactor.calculate(createCriticalInput([0.25, 0.25]))).toBe(
      1.5,
    )
  })

  it("returns one and ignores valid contributions when the hit is not critical", () => {
    expect(
      criticalFactor.calculate({
        isCritical: false,
        criticalDamageContributions: [0.5, 5, -1],
      }),
    ).toBe(1)
  })

  it("does not sum contributions when the hit is not critical", () => {
    expect(
      criticalFactor.calculate({
        isCritical: false,
        criticalDamageContributions: [Number.MAX_VALUE, Number.MAX_VALUE],
      }),
    ).toBe(1)
  })

  it("sums contributions in array order", () => {
    const largeValue = 2 ** 53

    expect(
      criticalFactor.calculate(
        createCriticalInput([largeValue, -largeValue, 1]),
      ),
    ).toBe(2)
    expect(
      criticalFactor.calculate(
        createCriticalInput([largeValue, 1, -largeValue]),
      ),
    ).toBe(1)
  })

  it("does not round a valid result", () => {
    const contribution = 0.123456789

    expect(criticalFactor.calculate(createCriticalInput([contribution]))).toBe(
      1 + contribution,
    )
  })

  it("clamps critical damage to the inclusive range from zero to five", () => {
    expect(criticalFactor.calculate(createCriticalInput([-1]))).toBe(1)
    expect(criticalFactor.calculate(createCriticalInput([0]))).toBe(1)
    expect(criticalFactor.calculate(createCriticalInput([5]))).toBe(6)
    expect(criticalFactor.calculate(createCriticalInput([10]))).toBe(6)
  })

  it("does not modify the input object or contribution array", () => {
    const criticalDamageContributions = Object.freeze([0.5, -0.125])
    const input = Object.freeze({
      isCritical: true,
      criticalDamageContributions,
    })

    expect(criticalFactor.calculate(input)).toBe(1.375)
    expect(input).toEqual({
      isCritical: true,
      criticalDamageContributions: [0.5, -0.125],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      isCritical: true,
      criticalDamageContributions: [0.5],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        criticalFactor.calculate(input as unknown as CriticalFactorInput),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-boolean isCritical value", () => {
    expect(() =>
      criticalFactor.calculate({
        isCritical: "true" as unknown as boolean,
        criticalDamageContributions: [0.5],
      }),
    ).toThrow(TypeError)
  })

  it("rejects a contribution value that is not an array", () => {
    expect(() =>
      criticalFactor.calculate({
        isCritical: true,
        criticalDamageContributions: new Set([
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
      isCritical: true,
      criticalDamageContributions: [contribution],
    } as unknown as CriticalFactorInput

    expect(() => criticalFactor.calculate(input)).toThrow(TypeError)
  })

  it("validates contribution members when the hit is not critical", () => {
    const input = {
      isCritical: false,
      criticalDamageContributions: ["0.5"],
    } as unknown as CriticalFactorInput

    expect(() => criticalFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite contribution %s",
    (contribution) => {
      expect(() =>
        criticalFactor.calculate(createCriticalInput([contribution])),
      ).toThrow(RangeError)
    },
  )

  it("validates non-finite contributions when the hit is not critical", () => {
    expect(() =>
      criticalFactor.calculate({
        isCritical: false,
        criticalDamageContributions: [NaN],
      }),
    ).toThrow(RangeError)
  })

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects a critical damage sum that overflows", (...contributions) => {
    expect(() =>
      criticalFactor.calculate(createCriticalInput(contributions)),
    ).toThrow(RangeError)
  })
})

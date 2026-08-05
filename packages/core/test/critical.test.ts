import { describe, expect, expectTypeOf, it } from "vitest"
import {
  CRITICAL_FACTOR_ID,
  criticalFactor,
  type CriticalFactorInput,
  type Factor,
} from "../src/index.ts"

describe("criticalFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<CriticalFactorInput>().toEqualTypeOf<readonly number[]>()
    expectTypeOf(CRITICAL_FACTOR_ID).toEqualTypeOf<"critical">()
    expectTypeOf(criticalFactor).toEqualTypeOf<Factor<CriticalFactorInput>>()

    expect(CRITICAL_FACTOR_ID).toBe("critical")
    expect(criticalFactor.factorId).toBe(CRITICAL_FACTOR_ID)
    expect(Object.isFrozen(criticalFactor)).toBe(true)
  })

  it("returns one when there are no critical damage contributions", () => {
    expect(criticalFactor.calculate([])).toBe(1)
  })

  it("sums signed critical damage contributions", () => {
    expect(criticalFactor.calculate([0.5])).toBe(1.5)
    expect(criticalFactor.calculate([0.5, 0.25])).toBe(1.75)
    expect(criticalFactor.calculate([0.5, -0.125])).toBe(1.375)
    expect(criticalFactor.calculate([0.25, 0.25])).toBe(1.5)
  })

  it("sums inputs in array order", () => {
    const largeValue = 2 ** 53

    expect(criticalFactor.calculate([largeValue, -largeValue, 1])).toBe(2)
    expect(criticalFactor.calculate([largeValue, 1, -largeValue])).toBe(1)
  })

  it("does not round a valid result", () => {
    const input = 0.123456789

    expect(criticalFactor.calculate([input])).toBe(1 + input)
  })

  it("clamps critical damage to the inclusive range from zero to five", () => {
    expect(criticalFactor.calculate([-1])).toBe(1)
    expect(criticalFactor.calculate([0])).toBe(1)
    expect(criticalFactor.calculate([5])).toBe(6)
    expect(criticalFactor.calculate([10])).toBe(6)
  })

  it("does not modify the input array", () => {
    const inputs = Object.freeze([0.5, -0.125])

    expect(criticalFactor.calculate(inputs)).toBe(1.375)
    expect(inputs).toEqual([0.5, -0.125])
  })

  it("rejects a non-array input", () => {
    const input = new Set([0.5]) as unknown as CriticalFactorInput

    expect(() => criticalFactor.calculate(input)).toThrow(TypeError)
  })

  it.each([
    ["string", "0.5"],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["object", { value: 0.5 }],
  ])("rejects a non-number %s input", (_name, input) => {
    const inputs = [input] as unknown as CriticalFactorInput

    expect(() => criticalFactor.calculate(inputs)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite input %s",
    (input) => {
      expect(() => criticalFactor.calculate([input])).toThrow(RangeError)
    },
  )

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
  ])("rejects an input sum that overflows", (...inputs) => {
    expect(() => criticalFactor.calculate(inputs)).toThrow(RangeError)
  })
})

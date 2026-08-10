import { describe, expect, expectTypeOf, it } from "vitest"
import {
  BASE_DAZE_FACTOR_ID,
  baseDazeFactor,
  type BaseDazeFactorInput,
  type BaseDazeFactorInputItem,
  type Factor,
} from "../src/index.ts"

describe("baseDazeFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<BaseDazeFactorInputItem>().toEqualTypeOf<{
      readonly finalImpact: number
      readonly dazeMultiplier: number
    }>()
    expectTypeOf<BaseDazeFactorInput>().toEqualTypeOf<
      readonly BaseDazeFactorInputItem[]
    >()
    expectTypeOf(BASE_DAZE_FACTOR_ID).toEqualTypeOf<"base_daze">()
    expectTypeOf(baseDazeFactor).toEqualTypeOf<Factor<BaseDazeFactorInput>>()

    expect(BASE_DAZE_FACTOR_ID).toBe("base_daze")
    expect(baseDazeFactor.factorId).toBe(BASE_DAZE_FACTOR_ID)
    expect(Object.isFrozen(baseDazeFactor)).toBe(true)
  })

  it("returns zero for an empty input array", () => {
    expect(baseDazeFactor.calculate([])).toBe(0)
  })

  it("multiplies each effective impact by its corresponding daze multiplier", () => {
    expect(
      baseDazeFactor.calculate([
        { finalImpact: 10, dazeMultiplier: 2 },
        { finalImpact: 20, dazeMultiplier: 3 },
      ]),
    ).toBe(80)
  })

  it("counts duplicate inputs independently", () => {
    const input = { finalImpact: 20, dazeMultiplier: 1.5 }

    expect(baseDazeFactor.calculate([input, input])).toBe(60)
  })

  it("accumulates inputs in array order", () => {
    const largeValue = 2 ** 53
    const largeInput = { finalImpact: 1, dazeMultiplier: largeValue }
    const smallInput = { finalImpact: 1, dazeMultiplier: 1 }

    expect(baseDazeFactor.calculate([largeInput, smallInput, smallInput])).toBe(
      largeValue,
    )
    expect(baseDazeFactor.calculate([smallInput, smallInput, largeInput])).toBe(
      largeValue + 2,
    )
  })

  it("accepts zero for either input field", () => {
    expect(
      baseDazeFactor.calculate([
        { finalImpact: 100, dazeMultiplier: 0 },
        { finalImpact: 0, dazeMultiplier: 2 },
      ]),
    ).toBe(0)
  })

  it("clamps final impact to its confirmed effective range", () => {
    expect(
      baseDazeFactor.calculate([
        { finalImpact: 1000, dazeMultiplier: 2 },
        { finalImpact: 1001, dazeMultiplier: 3 },
      ]),
    ).toBe(5000)
  })

  it("does not round a valid result", () => {
    const finalImpact = 10.987654321
    const dazeMultiplier = 0.123456789

    expect(baseDazeFactor.calculate([{ finalImpact, dazeMultiplier }])).toBe(
      finalImpact * dazeMultiplier,
    )
  })

  it("does not modify the input array or its members", () => {
    const input = Object.freeze({ finalImpact: 20, dazeMultiplier: 1.5 })
    const inputs = Object.freeze([input])

    expect(baseDazeFactor.calculate(inputs)).toBe(30)
    expect(inputs).toEqual([input])
    expect(input).toEqual({ finalImpact: 20, dazeMultiplier: 1.5 })
  })

  it("rejects a non-array input", () => {
    const input = new Set([
      { finalImpact: 1, dazeMultiplier: 1 },
    ]) as unknown as BaseDazeFactorInput

    expect(() => baseDazeFactor.calculate(input)).toThrow(TypeError)
  })

  it("rejects a null input item", () => {
    const inputs = [null] as unknown as BaseDazeFactorInput

    expect(() => baseDazeFactor.calculate(inputs)).toThrow(TypeError)
  })

  it("rejects callable and array input items even when their fields are valid", () => {
    const fields = {
      finalImpact: 1,
      dazeMultiplier: 1,
    }

    for (const input of [
      Object.assign(() => undefined, fields),
      Object.assign([], fields),
    ]) {
      expect(() => baseDazeFactor.calculate([input])).toThrow(TypeError)
    }
  })

  describe.each(["finalImpact", "dazeMultiplier"] as const)(
    "%s validation",
    (field) => {
      it("rejects a non-number value", () => {
        const input = {
          finalImpact: 1,
          dazeMultiplier: 1,
          [field]: "1",
        } as unknown as BaseDazeFactorInputItem

        expect(() => baseDazeFactor.calculate([input])).toThrow(TypeError)
      })

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite value %s",
        (value) => {
          const input = {
            finalImpact: 1,
            dazeMultiplier: 1,
            [field]: value,
          }

          expect(() => baseDazeFactor.calculate([input])).toThrow(RangeError)
        },
      )

      it("rejects a negative value", () => {
        const input = {
          finalImpact: 1,
          dazeMultiplier: 1,
          [field]: -1,
        }

        expect(() => baseDazeFactor.calculate([input])).toThrow(RangeError)
      })
    },
  )

  it("rejects a non-finite result caused by multiplication overflow", () => {
    expect(() =>
      baseDazeFactor.calculate([
        { finalImpact: 2, dazeMultiplier: Number.MAX_VALUE },
      ]),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by addition overflow", () => {
    expect(() =>
      baseDazeFactor.calculate([
        { finalImpact: 1, dazeMultiplier: Number.MAX_VALUE },
        { finalImpact: 1, dazeMultiplier: Number.MAX_VALUE },
      ]),
    ).toThrow(RangeError)
  })

  it("does not impose an unconfirmed daze multiplier upper bound", () => {
    expect(
      baseDazeFactor.calculate([
        { finalImpact: 1, dazeMultiplier: Number.MAX_VALUE },
      ]),
    ).toBe(Number.MAX_VALUE)
  })
})

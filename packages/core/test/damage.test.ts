import { describe, expect, expectTypeOf, it } from "vitest"
import { calculateTotalDisplayedDamage } from "../src/index.ts"

describe("calculateTotalDisplayedDamage", () => {
  it("exposes its public function type", () => {
    expectTypeOf(calculateTotalDisplayedDamage).toEqualTypeOf<
      (unroundedSegmentDamageValues: readonly number[]) => number
    >()
  })

  it("rounds a single segment up", () => {
    expect(calculateTotalDisplayedDamage([10.2])).toBe(11)
  })

  it("rounds each segment before summing", () => {
    expect(calculateTotalDisplayedDamage([10.2, 20.1])).toBe(32)
  })

  it("returns zero for an empty array", () => {
    expect(calculateTotalDisplayedDamage([])).toBe(0)
  })

  it("accepts zero segment damage", () => {
    expect(calculateTotalDisplayedDamage([0, 0])).toBe(0)
  })

  it("counts duplicate segments independently", () => {
    expect(calculateTotalDisplayedDamage([10.2, 10.2])).toBe(22)
  })

  it("reads segments by ascending numeric index", () => {
    const readIndexes: number[] = []
    const unroundedSegmentDamageValues = [0, 0, 0]

    for (const index of unroundedSegmentDamageValues.keys()) {
      Object.defineProperty(unroundedSegmentDamageValues, index, {
        configurable: true,
        enumerable: true,
        get: () => {
          readIndexes.push(index)

          return index + 0.2
        },
      })
    }

    expect(calculateTotalDisplayedDamage(unroundedSegmentDamageValues)).toBe(6)
    expect(readIndexes).toEqual([0, 1, 2])
  })

  it("accumulates rounded segments in array order", () => {
    const largeValue = 2 ** 53

    expect(calculateTotalDisplayedDamage([largeValue, 1, 1])).toBe(largeValue)
    expect(calculateTotalDisplayedDamage([1, 1, largeValue])).toBe(
      largeValue + 2,
    )
  })

  it("does not modify or freeze the input array", () => {
    const mutableInput = [10.2, 20.1]
    const originalInput = [...mutableInput]

    expect(calculateTotalDisplayedDamage(mutableInput)).toBe(32)
    expect(mutableInput).toEqual(originalInput)
    expect(Object.isFrozen(mutableInput)).toBe(false)

    const frozenInput = Object.freeze([10.2, 20.1])

    expect(calculateTotalDisplayedDamage(frozenInput)).toBe(32)
    expect(frozenInput).toEqual([10.2, 20.1])
  })

  it("rejects a sparse array hole as an undefined member", () => {
    const unroundedSegmentDamageValues: number[] = []
    unroundedSegmentDamageValues.length = 3
    unroundedSegmentDamageValues[0] = 10.2
    unroundedSegmentDamageValues[2] = 20.1

    expect(() =>
      calculateTotalDisplayedDamage(unroundedSegmentDamageValues),
    ).toThrow(TypeError)
  })

  it("does not fill a sparse array hole from the prototype chain", () => {
    const inheritedSegments = Object.assign(Object.create(Array.prototype), {
      0: 10.2,
    })
    const unroundedSegmentDamageValues: number[] = []
    unroundedSegmentDamageValues.length = 1
    Object.setPrototypeOf(unroundedSegmentDamageValues, inheritedSegments)

    expect(() =>
      calculateTotalDisplayedDamage(unroundedSegmentDamageValues),
    ).toThrow(TypeError)
  })

  it("rejects a non-array input", () => {
    for (const input of [null, new Set([10.2])]) {
      expect(() =>
        calculateTotalDisplayedDamage(input as unknown as readonly number[]),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-number member", () => {
    expect(() =>
      calculateTotalDisplayedDamage(["10.2"] as unknown as readonly number[]),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite member %s",
    (value) => {
      expect(() => calculateTotalDisplayedDamage([value])).toThrow(RangeError)
    },
  )

  it("rejects a negative member", () => {
    expect(() => calculateTotalDisplayedDamage([-1])).toThrow(RangeError)
  })

  it("rejects final addition overflow", () => {
    expect(() =>
      calculateTotalDisplayedDamage([Number.MAX_VALUE, Number.MAX_VALUE]),
    ).toThrow(RangeError)
  })

  it("does not impose an unconfirmed finite upper bound", () => {
    expect(calculateTotalDisplayedDamage([Number.MAX_VALUE])).toBe(
      Number.MAX_VALUE,
    )
  })
})

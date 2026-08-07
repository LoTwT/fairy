import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  RESISTANCE_FACTOR_ID,
  resistanceFactor,
  type Factor,
  type ResistanceFactorInput,
} from "../src/index.ts"

describe("resistanceFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<ResistanceFactorInput>().toEqualTypeOf<{
      readonly targetResistance: number
      readonly targetResistanceReductions: readonly number[]
      readonly attackerResistanceIgnoreValues: readonly number[]
    }>()
    expectTypeOf(RESISTANCE_FACTOR_ID).toEqualTypeOf<"resistance">()
    expectTypeOf(
      DEFAULT_RESISTANCE_FACTOR_INPUT,
    ).toEqualTypeOf<ResistanceFactorInput>()
    expectTypeOf(resistanceFactor).toEqualTypeOf<
      Factor<ResistanceFactorInput>
    >()

    expect(RESISTANCE_FACTOR_ID).toBe("resistance")
    expect(resistanceFactor.factorId).toBe(RESISTANCE_FACTOR_ID)
    expect(Object.isFrozen(resistanceFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_RESISTANCE_FACTOR_INPUT).toEqual({
      targetResistance: 0,
      targetResistanceReductions: [],
      attackerResistanceIgnoreValues: [],
    })
    expect(Object.isFrozen(DEFAULT_RESISTANCE_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_RESISTANCE_FACTOR_INPUT.targetResistanceReductions,
      ),
    ).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_RESISTANCE_FACTOR_INPUT.attackerResistanceIgnoreValues,
      ),
    ).toBe(true)
    expect(resistanceFactor.calculate(DEFAULT_RESISTANCE_FACTOR_INPUT)).toBe(1)
  })

  it.each([-0.2, 0.2, 0.4])(
    "calculates the multiplier for target resistance %s",
    (targetResistance) => {
      expect(
        resistanceFactor.calculate({
          targetResistance,
          targetResistanceReductions: [],
          attackerResistanceIgnoreValues: [],
        }),
      ).toBe(1 - targetResistance)
    },
  )

  it("adds target resistance reductions and attacker resistance ignore values", () => {
    expect(
      resistanceFactor.calculate({
        targetResistance: 0.4,
        targetResistanceReductions: [0.1, 0.2],
        attackerResistanceIgnoreValues: [0.05],
      }),
    ).toBe(1 - 0.4 + (0.1 + 0.2) + 0.05)
  })

  it("sums each adjustment array in array order", () => {
    const halfEpsilon = Number.EPSILON / 4

    expect(
      resistanceFactor.calculate({
        targetResistance: 1,
        targetResistanceReductions: [halfEpsilon, halfEpsilon, 0.5],
        attackerResistanceIgnoreValues: [],
      }),
    ).toBe(0.5 + Number.EPSILON / 2)
    expect(
      resistanceFactor.calculate({
        targetResistance: 1,
        targetResistanceReductions: [0.5, halfEpsilon, halfEpsilon],
        attackerResistanceIgnoreValues: [],
      }),
    ).toBe(0.5)
  })

  it("does not merge duplicate adjustment values", () => {
    expect(
      resistanceFactor.calculate({
        targetResistance: 1,
        targetResistanceReductions: [0.25, 0.25],
        attackerResistanceIgnoreValues: [0.125, 0.125],
      }),
    ).toBe(0.75)
  })

  it("clamps the result to the inclusive range from zero to two", () => {
    expect(
      resistanceFactor.calculate({
        targetResistance: 1,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      }),
    ).toBe(0)
    expect(
      resistanceFactor.calculate({
        targetResistance: 2,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      }),
    ).toBe(0)
    expect(
      resistanceFactor.calculate({
        targetResistance: -1,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      }),
    ).toBe(2)
    expect(
      resistanceFactor.calculate({
        targetResistance: -2,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      }),
    ).toBe(2)
  })

  it("does not modify its input or adjustment arrays", () => {
    const targetResistanceReductions = Object.freeze([0.1, 0.2])
    const attackerResistanceIgnoreValues = Object.freeze([0.05])
    const input = Object.freeze({
      targetResistance: 0.4,
      targetResistanceReductions,
      attackerResistanceIgnoreValues,
    })

    resistanceFactor.calculate(input)

    expect(input).toEqual({
      targetResistance: 0.4,
      targetResistanceReductions: [0.1, 0.2],
      attackerResistanceIgnoreValues: [0.05],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      targetResistance: 0.2,
      targetResistanceReductions: [],
      attackerResistanceIgnoreValues: [],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        resistanceFactor.calculate(input as unknown as ResistanceFactorInput),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-number target resistance", () => {
    expect(() =>
      resistanceFactor.calculate({
        targetResistance: "0.2" as unknown as number,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      }),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite target resistance %s",
    (targetResistance) => {
      expect(() =>
        resistanceFactor.calculate({
          targetResistance,
          targetResistanceReductions: [],
          attackerResistanceIgnoreValues: [],
        }),
      ).toThrow(RangeError)
    },
  )

  describe.each([
    "targetResistanceReductions",
    "attackerResistanceIgnoreValues",
  ] as const)("%s validation", (field) => {
    it("rejects a value that is not an array", () => {
      const input = {
        targetResistance: 0.2,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
        [field]: new Set([0.1]),
      } as unknown as ResistanceFactorInput

      expect(() => resistanceFactor.calculate(input)).toThrow(TypeError)
    })

    it("rejects a non-number array member", () => {
      const input = {
        targetResistance: 0.2,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
        [field]: ["0.1"],
      } as unknown as ResistanceFactorInput

      expect(() => resistanceFactor.calculate(input)).toThrow(TypeError)
    })

    it.each([NaN, Infinity, -Infinity])(
      "rejects the non-finite array member %s",
      (value) => {
        const input = {
          targetResistance: 0.2,
          targetResistanceReductions: [],
          attackerResistanceIgnoreValues: [],
          [field]: [value],
        }

        expect(() => resistanceFactor.calculate(input)).toThrow(RangeError)
      },
    )

    it("rejects a negative array member", () => {
      const input = {
        targetResistance: 0.2,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
        [field]: [-0.1],
      }

      expect(() => resistanceFactor.calculate(input)).toThrow(RangeError)
    })
  })

  it("rejects an unclamped result that overflows", () => {
    expect(() =>
      resistanceFactor.calculate({
        targetResistance: -Number.MAX_VALUE,
        targetResistanceReductions: [Number.MAX_VALUE],
        attackerResistanceIgnoreValues: [],
      }),
    ).toThrow(RangeError)
  })
})

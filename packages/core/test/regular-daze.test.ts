import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  REGULAR_DAZE_FORMULA_ID,
  regularDazeFormula,
  type BaseDazeFactorInput,
  type DazeDealtFactorInput,
  type DazeTakenFactorInput,
  type Formula,
  type RegularDazeFormulaInput,
  type ResistanceFactorInput,
} from "../src/index.ts"

function createRegularDazeInput(
  baseDaze: BaseDazeFactorInput,
): RegularDazeFormulaInput {
  return {
    baseDaze,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    dazeDealt: DEFAULT_DAZE_DEALT_FACTOR_INPUT,
    dazeTaken: DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  }
}

describe("regularDazeFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<RegularDazeFormulaInput>().toEqualTypeOf<{
      readonly baseDaze: BaseDazeFactorInput
      readonly resistance: ResistanceFactorInput
      readonly dazeDealt: DazeDealtFactorInput
      readonly dazeTaken: DazeTakenFactorInput
    }>()
    expectTypeOf(REGULAR_DAZE_FORMULA_ID).toEqualTypeOf<"regular_daze">()
    expectTypeOf(regularDazeFormula).toEqualTypeOf<
      Formula<RegularDazeFormulaInput>
    >()

    expect(REGULAR_DAZE_FORMULA_ID).toBe("regular_daze")
    expect(regularDazeFormula.formulaId).toBe(REGULAR_DAZE_FORMULA_ID)
    expect(Object.isFrozen(regularDazeFormula)).toBe(true)
  })

  it("uses explicit default inputs as identity multipliers", () => {
    const result = regularDazeFormula.calculate(
      createRegularDazeInput([{ finalImpact: 100, dazeMultiplier: 2 }]),
    )

    expect(result).toEqual({
      value: 200,
      factorResults: {
        baseDaze: 200,
        resistance: 1,
        dazeDealt: 1,
        dazeTaken: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseDaze",
      "resistance",
      "dazeDealt",
      "dazeTaken",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for an empty base daze input", () => {
    expect(regularDazeFormula.calculate(createRegularDazeInput([]))).toEqual({
      value: 0,
      factorResults: {
        baseDaze: 0,
        resistance: 1,
        dazeDealt: 1,
        dazeTaken: 1,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseDaze = 100 * 2 + 40 * 1.5
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const dazeDealt = 1 + 0.25 - 0.05
    const dazeTaken = 1 + 0.5 - 0.1
    const input: RegularDazeFormulaInput = {
      baseDaze: [
        { finalImpact: 100, dazeMultiplier: 2 },
        { finalImpact: 40, dazeMultiplier: 1.5 },
      ],
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
      dazeDealt: {
        dazeDealtIncreases: [0.25],
        dazeDealtReductions: [0.05],
      },
      dazeTaken: {
        targetDazeTakenIncreases: [0.5],
        targetDazeTakenReductions: [0.1],
      },
    }

    expect(regularDazeFormula.calculate(input)).toEqual({
      value: baseDaze * resistance * dazeDealt * dazeTaken,
      factorResults: {
        baseDaze,
        resistance,
        dazeDealt,
        dazeTaken,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const baseDazeItem = Object.freeze({
      finalImpact: 100,
      dazeMultiplier: 2,
    })
    const baseDaze = Object.freeze([baseDazeItem])
    const targetResistanceReductions = Object.freeze([0.1])
    const attackerResistanceIgnoreValues = Object.freeze([0.05])
    const resistance = Object.freeze({
      targetResistance: 0.2,
      targetResistanceReductions,
      attackerResistanceIgnoreValues,
    })
    const dazeDealtIncreases = Object.freeze([0.25])
    const dazeDealtReductions = Object.freeze([0.05])
    const dazeDealt = Object.freeze({
      dazeDealtIncreases,
      dazeDealtReductions,
    })
    const targetDazeTakenIncreases = Object.freeze([0.5])
    const targetDazeTakenReductions = Object.freeze([0.1])
    const dazeTaken = Object.freeze({
      targetDazeTakenIncreases,
      targetDazeTakenReductions,
    })
    const input = Object.freeze({
      baseDaze,
      resistance,
      dazeDealt,
      dazeTaken,
    })

    regularDazeFormula.calculate(input)

    expect(input).toEqual({
      baseDaze: [{ finalImpact: 100, dazeMultiplier: 2 }],
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
      dazeDealt: {
        dazeDealtIncreases: [0.25],
        dazeDealtReductions: [0.05],
      },
      dazeTaken: {
        targetDazeTakenIncreases: [0.5],
        targetDazeTakenReductions: [0.1],
      },
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseDaze)).toBe(true)
    expect(Object.isFrozen(resistance)).toBe(true)
    expect(Object.isFrozen(dazeDealt)).toBe(true)
    expect(Object.isFrozen(dazeTaken)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createRegularDazeInput([])
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        regularDazeFormula.calculate(
          input as unknown as RegularDazeFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each(["baseDaze", "resistance", "dazeDealt", "dazeTaken"] as const)(
    "rejects a missing or undefined %s input",
    (field) => {
      const completeInput = createRegularDazeInput([
        { finalImpact: 100, dazeMultiplier: 2 },
      ])
      const missingInput: Partial<RegularDazeFormulaInput> = {
        ...completeInput,
      }
      const undefinedInput = {
        ...completeInput,
        [field]: undefined,
      } as unknown as RegularDazeFormulaInput

      delete missingInput[field]

      for (const input of [missingInput, undefinedInput]) {
        expect(() =>
          regularDazeFormula.calculate(
            input as unknown as RegularDazeFormulaInput,
          ),
        ).toThrow(TypeError)
      }
    },
  )

  it("does not stop validating later factors when base daze is zero", () => {
    const input = {
      ...createRegularDazeInput([]),
      dazeTaken: {
        targetDazeTakenIncreases: [NaN],
        targetDazeTakenReductions: [],
      },
    }

    expect(() => regularDazeFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating later factors when an earlier multiplier is zero", () => {
    const input = {
      ...createRegularDazeInput([{ finalImpact: 100, dazeMultiplier: 2 }]),
      resistance: {
        targetResistance: 1,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      dazeTaken: {
        targetDazeTakenIncreases: [NaN],
        targetDazeTakenReductions: [],
      },
    }

    expect(() => regularDazeFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: RegularDazeFormulaInput = {
      ...createRegularDazeInput([
        { finalImpact: 1, dazeMultiplier: Number.MAX_VALUE },
      ]),
      resistance: {
        targetResistance: -1,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      dazeDealt: {
        dazeDealtIncreases: [],
        dazeDealtReductions: [1],
      },
    }

    expect(() => regularDazeFormula.calculate(input)).toThrow(RangeError)
  })
})

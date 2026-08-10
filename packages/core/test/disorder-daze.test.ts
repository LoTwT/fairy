import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  DEFAULT_DISORDER_DAZE_MULTIPLIER,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DISORDER_DAZE_FORMULA_ID,
  disorderDazeFormula,
  type BaseDazeFactorInput,
  type DazeTakenFactorInput,
  type DisorderDazeDealtFactorInput,
  type DisorderDazeFormulaInput,
  type DisorderDazeLevelFactorInput,
  type Formula,
  type ResistanceFactorInput,
} from "../src/index.ts"

function createDisorderDazeInput(
  baseDaze: BaseDazeFactorInput,
  disorderDazeLevel: DisorderDazeLevelFactorInput,
): DisorderDazeFormulaInput {
  return {
    baseDaze,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    disorderDazeDealt: DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
    dazeTaken: DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
    disorderDazeLevel,
  }
}

describe("disorderDazeFormula", () => {
  it("exposes its public identity, standard multiplier, and types", () => {
    expectTypeOf<DisorderDazeFormulaInput>().toEqualTypeOf<{
      readonly baseDaze: BaseDazeFactorInput
      readonly resistance: ResistanceFactorInput
      readonly disorderDazeDealt: DisorderDazeDealtFactorInput
      readonly dazeTaken: DazeTakenFactorInput
      readonly disorderDazeLevel: DisorderDazeLevelFactorInput
    }>()
    expectTypeOf(DISORDER_DAZE_FORMULA_ID).toEqualTypeOf<"disorder_daze">()
    expectTypeOf(DEFAULT_DISORDER_DAZE_MULTIPLIER).toEqualTypeOf<2>()
    expectTypeOf(disorderDazeFormula).toEqualTypeOf<
      Formula<DisorderDazeFormulaInput>
    >()

    expect(DISORDER_DAZE_FORMULA_ID).toBe("disorder_daze")
    expect(DEFAULT_DISORDER_DAZE_MULTIPLIER).toBe(2)
    expect(disorderDazeFormula.formulaId).toBe(DISORDER_DAZE_FORMULA_ID)
    expect(Object.isFrozen(disorderDazeFormula)).toBe(true)
  })

  it("uses explicit default inputs as identity multipliers", () => {
    const disorderDazeLevel = 1 + 0.0075
    const result = disorderDazeFormula.calculate(
      createDisorderDazeInput(
        [
          {
            finalImpact: 100,
            dazeMultiplier: DEFAULT_DISORDER_DAZE_MULTIPLIER,
          },
        ],
        1,
      ),
    )

    expect(result).toEqual({
      value: 200 * disorderDazeLevel,
      factorResults: {
        baseDaze: 200,
        resistance: 1,
        disorderDazeDealt: 1,
        dazeTaken: 1,
        disorderDazeLevel,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseDaze",
      "resistance",
      "disorderDazeDealt",
      "dazeTaken",
      "disorderDazeLevel",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for an empty base daze input", () => {
    const disorderDazeLevel = 1 + 0.0075

    expect(
      disorderDazeFormula.calculate(createDisorderDazeInput([], 1)),
    ).toEqual({
      value: 0,
      factorResults: {
        baseDaze: 0,
        resistance: 1,
        disorderDazeDealt: 1,
        dazeTaken: 1,
        disorderDazeLevel,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseDaze = 100 * 2 + 40 * 1.5
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const disorderDazeDealt = 1.2
    const dazeTaken = 1 + 0.5 - 0.1
    const disorderDazeLevel = 1 + 0.0075 * 50
    const input: DisorderDazeFormulaInput = {
      baseDaze: [
        { finalImpact: 100, dazeMultiplier: 2 },
        { finalImpact: 40, dazeMultiplier: 1.5 },
      ],
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
      disorderDazeDealt,
      dazeTaken: {
        targetDazeTakenIncreases: [0.5],
        targetDazeTakenReductions: [0.1],
      },
      disorderDazeLevel: 50,
    }

    expect(disorderDazeFormula.calculate(input)).toEqual({
      value:
        baseDaze *
        resistance *
        disorderDazeDealt *
        dazeTaken *
        disorderDazeLevel,
      factorResults: {
        baseDaze,
        resistance,
        disorderDazeDealt,
        dazeTaken,
        disorderDazeLevel,
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
    const targetDazeTakenIncreases = Object.freeze([0.5])
    const targetDazeTakenReductions = Object.freeze([0.1])
    const dazeTaken = Object.freeze({
      targetDazeTakenIncreases,
      targetDazeTakenReductions,
    })
    const input = Object.freeze({
      baseDaze,
      resistance,
      disorderDazeDealt: 1.2,
      dazeTaken,
      disorderDazeLevel: 50,
    })

    disorderDazeFormula.calculate(input)

    expect(input).toEqual({
      baseDaze: [{ finalImpact: 100, dazeMultiplier: 2 }],
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
      disorderDazeDealt: 1.2,
      dazeTaken: {
        targetDazeTakenIncreases: [0.5],
        targetDazeTakenReductions: [0.1],
      },
      disorderDazeLevel: 50,
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseDaze)).toBe(true)
    expect(Object.isFrozen(resistance)).toBe(true)
    expect(Object.isFrozen(dazeTaken)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createDisorderDazeInput([], 1)
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        disorderDazeFormula.calculate(
          input as unknown as DisorderDazeFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseDaze",
    "resistance",
    "disorderDazeDealt",
    "dazeTaken",
    "disorderDazeLevel",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createDisorderDazeInput(
      [{ finalImpact: 100, dazeMultiplier: 2 }],
      1,
    )
    const missingInput: Partial<DisorderDazeFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as DisorderDazeFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        disorderDazeFormula.calculate(
          input as unknown as DisorderDazeFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating later factors when base daze is zero", () => {
    const input = {
      ...createDisorderDazeInput([], 1),
      disorderDazeLevel: NaN,
    }

    expect(() => disorderDazeFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating later factors when an earlier multiplier is zero", () => {
    const input = {
      ...createDisorderDazeInput([{ finalImpact: 100, dazeMultiplier: 2 }], 1),
      resistance: {
        targetResistance: 1,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      disorderDazeLevel: NaN,
    }

    expect(() => disorderDazeFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: DisorderDazeFormulaInput = {
      ...createDisorderDazeInput(
        [{ finalImpact: 1, dazeMultiplier: Number.MAX_VALUE }],
        1,
      ),
      resistance: {
        targetResistance: -1,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      disorderDazeDealt: 0,
    }

    expect(() => disorderDazeFormula.calculate(input)).toThrow(RangeError)
  })
})

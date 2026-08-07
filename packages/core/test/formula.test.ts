import { describe, expect, expectTypeOf, it } from "vitest"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
  type FormulaParams,
  type FormulaResult,
} from "../src/index.ts"

interface ValueFormulaInput {
  readonly base: number
  readonly multiplier: number
}

function createValueFormulaParams(): FormulaParams<ValueFormulaInput> {
  return {
    formulaId: "value",
    calculate: (input) => ({
      value: input.base * input.multiplier,
      factorResults: {
        base: input.base,
        multiplier: input.multiplier,
      },
    }),
  }
}

describe("defineFormula", () => {
  it("defines a typed formula and calculates a finite result", () => {
    const params = createValueFormulaParams()
    const formula = defineFormula(params)
    const result = formula.calculate({ base: 2, multiplier: 3 })

    expectTypeOf(formula).toEqualTypeOf<Formula<ValueFormulaInput>>()
    expectTypeOf(result).toEqualTypeOf<FormulaResult<ValueFormulaInput>>()
    expectTypeOf<FormulaFactorResults<ValueFormulaInput>>().toEqualTypeOf<{
      readonly base: number
      readonly multiplier: number
    }>()

    expect(formula.formulaId).toBe("value")
    expect(result).toEqual({
      value: 6,
      factorResults: { base: 2, multiplier: 3 },
    })
  })

  it("freezes the returned Formula", () => {
    const formula = defineFormula(createValueFormulaParams())

    expect(Object.isFrozen(formula)).toBe(true)
    expect(() => {
      ;(formula as { formulaId: string }).formulaId = "changed-formula"
    }).toThrow(TypeError)
    expect(formula.formulaId).toBe("value")
  })

  it("snapshots mutable FormulaParams", () => {
    const params = createValueFormulaParams()
    const formula = defineFormula(params)

    params.formulaId = "changed-formula"
    params.calculate = () => ({
      value: 0,
      factorResults: { base: 0, multiplier: 0 },
    })

    expect(Object.isFrozen(params)).toBe(false)
    expect(formula.formulaId).toBe("value")
    expect(formula.calculate({ base: 2, multiplier: 3 }).value).toBe(6)
  })

  it.each(["", " \n\t"])("rejects an empty formulaId %#", (formulaId) => {
    expect(() =>
      defineFormula<ValueFormulaInput>({
        formulaId,
        calculate: createValueFormulaParams().calculate,
      }),
    ).toThrow(TypeError)
  })

  it("rejects a non-string formulaId even when it provides trim", () => {
    expect(() =>
      defineFormula({
        formulaId: { trim: () => "object-formula" },
        calculate: createValueFormulaParams().calculate,
      } as unknown as FormulaParams<ValueFormulaInput>),
    ).toThrow(TypeError)
  })

  it("rejects a non-function calculate value", () => {
    expect(() =>
      defineFormula({
        formulaId: "invalid-calculation",
        calculate: {},
      } as unknown as FormulaParams<ValueFormulaInput>),
    ).toThrow(TypeError)
  })

  it.each([null, [], () => undefined])(
    "rejects the non-object calculation result %#",
    (calculationResult) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "invalid-result",
        calculate: () =>
          calculationResult as unknown as FormulaResult<ValueFormulaInput>,
      })

      expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
        TypeError,
      )
    },
  )

  it.each([null, [], () => undefined])(
    "rejects the non-object factorResults %#",
    (factorResults) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "invalid-factor-results",
        calculate: () => ({
          value: 1,
          factorResults:
            factorResults as unknown as FormulaFactorResults<ValueFormulaInput>,
        }),
      })

      expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
        TypeError,
      )
    },
  )

  it("rejects factor results provided by prototype getters", () => {
    class PrototypeFactorResults implements FormulaFactorResults<ValueFormulaInput> {
      get base(): number {
        return 2
      }

      get multiplier(): number {
        return 3
      }
    }

    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "prototype-factor-results",
      calculate: () => ({
        value: 6,
        factorResults: new PrototypeFactorResults(),
      }),
    })

    expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
      TypeError,
    )
  })

  it("rejects non-enumerable factor result properties", () => {
    const factorResults: FormulaFactorResults<ValueFormulaInput> = {
      base: 2,
      multiplier: 3,
    }
    Object.defineProperty(factorResults, "base", { enumerable: false })

    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "non-enumerable-factor-results",
      calculate: () => ({ value: 6, factorResults }),
    })

    expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
      TypeError,
    )
  })

  it("accepts factor results with a null prototype", () => {
    const factorResults: FormulaFactorResults<ValueFormulaInput> =
      Object.assign(Object.create(null), { base: 2, multiplier: 3 })
    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "null-prototype-factor-results",
      calculate: () => ({ value: 6, factorResults }),
    })

    expect(formula.calculate({ base: 2, multiplier: 3 })).toEqual({
      value: 6,
      factorResults: { base: 2, multiplier: 3 },
    })
  })

  it.each(["1", true, null, undefined, {}])(
    "rejects the non-number value %#",
    (value) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "invalid-value",
        calculate: () => ({
          value: value as unknown as number,
          factorResults: { base: 1, multiplier: 1 },
        }),
      })

      expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
        TypeError,
      )
    },
  )

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite value %s",
    (value) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "invalid-value",
        calculate: () => ({
          value,
          factorResults: { base: 1, multiplier: 1 },
        }),
      })

      expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
        RangeError,
      )
    },
  )

  it.each([0, -1, Number.MIN_VALUE, Number.MAX_VALUE])(
    "accepts the finite value and factor result %s",
    (value) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "finite-result",
        calculate: () => ({
          value,
          factorResults: { base: value, multiplier: value },
        }),
      })

      expect(formula.calculate({ base: 0, multiplier: 0 })).toEqual({
        value,
        factorResults: { base: value, multiplier: value },
      })
    },
  )

  it.each(["1", true, null, undefined, {}])(
    "rejects the non-number factor result %#",
    (factorResult) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "invalid-factor-result",
        calculate: () => ({
          value: 1,
          factorResults: {
            base: factorResult as unknown as number,
            multiplier: 1,
          },
        }),
      })

      expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
        TypeError,
      )
    },
  )

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite factor result %s",
    (factorResult) => {
      const formula = defineFormula<ValueFormulaInput>({
        formulaId: "invalid-factor-result",
        calculate: () => ({
          value: 1,
          factorResults: { base: factorResult, multiplier: 1 },
        }),
      })

      expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
        RangeError,
      )
    },
  )

  it("validates enumerable symbol factor results", () => {
    const symbolFactor = Symbol("symbol-factor")
    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "symbol-factor-result",
      calculate: () => ({
        value: 1,
        factorResults: {
          base: 1,
          multiplier: 1,
          [symbolFactor]: Infinity,
        },
      }),
    })

    expect(() => formula.calculate({ base: 2, multiplier: 3 })).toThrow(
      RangeError,
    )
  })

  it("copies and freezes FormulaResult and factorResults", () => {
    const factorResults = { base: 2, multiplier: 3 }
    const calculationResult = {
      value: 6,
      factorResults,
      internal: "not public",
    }
    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "result-snapshot",
      calculate: () => calculationResult,
    })
    const result = formula.calculate({ base: 2, multiplier: 3 })

    factorResults.base = 10
    calculationResult.value = 30

    expect(result).toEqual({
      value: 6,
      factorResults: { base: 2, multiplier: 3 },
    })
    expect(Object.keys(result)).toEqual(["value", "factorResults"])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
    expect(result.factorResults).not.toBe(factorResults)
  })

  it("passes the input through without copying or freezing it", () => {
    const input: ValueFormulaInput = { base: 2, multiplier: 3 }
    let receivedInput: ValueFormulaInput | undefined
    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "input-identity",
      calculate: (currentInput) => {
        receivedInput = currentInput
        return {
          value: currentInput.base * currentInput.multiplier,
          factorResults: {
            base: currentInput.base,
            multiplier: currentInput.multiplier,
          },
        }
      },
    })

    formula.calculate(input)

    expect(receivedInput).toBe(input)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it("does not compare FormulaInput and factorResults keys at runtime", () => {
    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "unchecked-result-keys",
      calculate: () => ({
        value: 1,
        factorResults: {} as FormulaFactorResults<ValueFormulaInput>,
      }),
    })

    expect(formula.calculate({ base: 2, multiplier: 3 })).toEqual({
      value: 1,
      factorResults: {},
    })
  })

  it("propagates errors from the provided calculation function", () => {
    const expectedError = new Error("invalid input")
    const formula = defineFormula<ValueFormulaInput>({
      formulaId: "throwing-formula",
      calculate: () => {
        throw expectedError
      },
    })
    let actualError: unknown

    try {
      formula.calculate({ base: 2, multiplier: 3 })
    } catch (error) {
      actualError = error
    }

    expect(actualError).toBe(expectedError)
  })
})

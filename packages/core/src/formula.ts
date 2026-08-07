import type { FactorResult } from "./factor.ts"
import {
  assertFiniteNumber,
  assertFunction,
  assertNonArrayObject,
  assertNonEmptyString,
} from "./internal/assert.ts"

function assertFormulaFactorResultsRecord(
  value: unknown,
  name: string,
): asserts value is object {
  assertNonArrayObject(value, name)

  const prototype = Object.getPrototypeOf(value)

  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} must be a plain object`)
  }

  for (const propertyKey of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, propertyKey)

    if (descriptor?.enumerable !== true) {
      throw new TypeError(
        `${name} property "${String(propertyKey)}" must be enumerable`,
      )
    }
  }
}

export type FormulaFactorResults<FormulaInput extends object> = {
  readonly [FactorName in keyof FormulaInput]-?: FactorResult
}

export interface FormulaResult<FormulaInput extends object> {
  readonly value: number
  readonly factorResults: FormulaFactorResults<FormulaInput>
}

export interface FormulaParams<FormulaInput extends object> {
  formulaId: string
  calculate: (input: FormulaInput) => FormulaResult<FormulaInput>
}

export interface Formula<FormulaInput extends object> {
  readonly formulaId: string
  readonly calculate: (input: FormulaInput) => FormulaResult<FormulaInput>
}

export function defineFormula<FormulaInput extends object>(
  params: FormulaParams<FormulaInput>,
): Formula<FormulaInput> {
  const { formulaId, calculate } = params

  assertNonEmptyString(formulaId, "formulaId")
  assertFunction(calculate, "calculate")

  const formula: Formula<FormulaInput> = {
    formulaId,
    calculate: (input) => {
      const calculationResult = calculate(input)

      assertNonArrayObject(calculationResult, `Formula "${formulaId}" result`)

      const { value, factorResults } = calculationResult

      assertFiniteNumber(value, `Formula "${formulaId}" value`)
      assertFormulaFactorResultsRecord(
        factorResults,
        `Formula "${formulaId}" factor results`,
      )

      const factorResultsSnapshot = {
        ...factorResults,
      } as FormulaFactorResults<FormulaInput>

      for (const factorName of Reflect.ownKeys(factorResultsSnapshot)) {
        assertFiniteNumber(
          Reflect.get(factorResultsSnapshot, factorName),
          `Formula "${formulaId}" factor result "${String(factorName)}"`,
        )
      }

      const result: FormulaResult<FormulaInput> = {
        value,
        factorResults: Object.freeze(factorResultsSnapshot),
      }

      return Object.freeze(result)
    },
  }

  return Object.freeze(formula)
}

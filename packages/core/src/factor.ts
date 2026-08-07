import {
  assertFiniteResult,
  assertFunction,
  assertNonEmptyString,
} from "./internal/assert.ts"

export type FactorResult = number

export interface FactorParams<FactorInput> {
  factorId: string
  calculate: (input: FactorInput) => FactorResult
}

export interface Factor<FactorInput> {
  readonly factorId: string
  readonly calculate: (input: FactorInput) => FactorResult
}

export function defineFactor<FactorInput>(
  params: FactorParams<FactorInput>,
): Factor<FactorInput> {
  const { factorId, calculate } = params

  assertNonEmptyString(factorId, "factorId")
  assertFunction(calculate, "calculate")

  const factor: Factor<FactorInput> = {
    factorId,
    calculate: (input) => {
      const result = calculate(input)

      assertFiniteResult(result, `Factor "${factorId}" result`)

      return result
    },
  }

  return Object.freeze(factor)
}

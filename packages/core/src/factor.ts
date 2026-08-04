import { assertArray, assertFiniteResult } from "./internal/assert.ts"

export type FactorResult = number

export interface FactorParams<FactorInput> {
  factorId: string
  calculate: (inputs: readonly FactorInput[]) => FactorResult
}

export interface Factor<FactorInput> {
  readonly factorId: string
  readonly calculate: (inputs: readonly FactorInput[]) => FactorResult
}

export function defineFactor<FactorInput>(
  params: FactorParams<FactorInput>,
): Factor<FactorInput> {
  const { factorId, calculate } = params

  if (typeof factorId !== "string" || factorId.trim().length === 0) {
    throw new TypeError("factorId must be a non-empty string")
  }

  if (typeof calculate !== "function") {
    throw new TypeError("calculate must be a function")
  }

  const factor: Factor<FactorInput> = {
    factorId,
    calculate: (inputs) => {
      assertArray(inputs, "Factor inputs")

      const result = calculate(inputs)

      assertFiniteResult(result, `Factor "${factorId}" result`)

      return result
    },
  }

  return Object.freeze(factor)
}

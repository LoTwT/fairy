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

  const factor: Factor<FactorInput> = {
    factorId,
    calculate: (inputs) => {
      const result = calculate(inputs)

      if (!Number.isFinite(result)) {
        throw new RangeError(`Factor "${factorId}" must return a finite number`)
      }

      return result
    },
  }

  return Object.freeze(factor)
}

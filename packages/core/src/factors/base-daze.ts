import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const MIN_EFFECTIVE_IMPACT = 0
const MAX_EFFECTIVE_IMPACT = 1000

export interface BaseDazeFactorInputItem {
  readonly finalImpact: number
  readonly dazeMultiplier: number
}

export type BaseDazeFactorInput = readonly BaseDazeFactorInputItem[]

export const BASE_DAZE_FACTOR_ID = "base_daze" as const

export const baseDazeFactor: Factor<BaseDazeFactorInput> =
  defineFactor<BaseDazeFactorInput>({
    factorId: BASE_DAZE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Base daze factor input")

      let totalBaseDaze = 0

      for (const input of inputs) {
        const { finalImpact, dazeMultiplier } =
          getValidatedBaseDazeFactorInputItem(input)
        const effectiveImpact = Math.min(
          Math.max(finalImpact, MIN_EFFECTIVE_IMPACT),
          MAX_EFFECTIVE_IMPACT,
        )

        totalBaseDaze += effectiveImpact * dazeMultiplier
      }

      return totalBaseDaze
    },
  })

function getValidatedBaseDazeFactorInputItem(
  input: unknown,
): BaseDazeFactorInputItem {
  assertNonArrayObject(input, "Base daze factor input item")

  const { finalImpact, dazeMultiplier } = input as BaseDazeFactorInputItem

  assertNonNegativeFiniteNumber(finalImpact, "Base daze final impact")
  assertNonNegativeFiniteNumber(dazeMultiplier, "Base daze multiplier")

  return { finalImpact, dazeMultiplier }
}

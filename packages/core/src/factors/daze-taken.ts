import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const BASE_DAZE_TAKEN_MULTIPLIER = 1
const MIN_DAZE_TAKEN_MULTIPLIER = 0
const MAX_DAZE_TAKEN_MULTIPLIER = 4

export interface DazeTakenFactorInput {
  readonly targetDazeTakenIncreases: readonly number[]
  readonly targetDazeTakenReductions: readonly number[]
}

export const DAZE_TAKEN_FACTOR_ID = "daze_taken" as const
export const DEFAULT_DAZE_TAKEN_FACTOR_INPUT: DazeTakenFactorInput =
  Object.freeze({
    targetDazeTakenIncreases: Object.freeze([]),
    targetDazeTakenReductions: Object.freeze([]),
  })

export const dazeTakenFactor: Factor<DazeTakenFactorInput> =
  defineFactor<DazeTakenFactorInput>({
    factorId: DAZE_TAKEN_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Daze taken factor input")

      const { targetDazeTakenIncreases, targetDazeTakenReductions } = input

      assertArray(targetDazeTakenIncreases, "Target daze taken increases")
      assertArray(targetDazeTakenReductions, "Target daze taken reductions")

      const totalTargetDazeTakenIncrease = sumNonNegativeFiniteValues(
        targetDazeTakenIncreases,
        "Target daze taken increases",
      )
      const totalTargetDazeTakenReduction = sumNonNegativeFiniteValues(
        targetDazeTakenReductions,
        "Target daze taken reductions",
      )

      const unclampedMultiplier =
        BASE_DAZE_TAKEN_MULTIPLIER +
        totalTargetDazeTakenIncrease -
        totalTargetDazeTakenReduction

      assertFiniteResult(unclampedMultiplier, "Unclamped daze taken multiplier")

      return Math.min(
        MAX_DAZE_TAKEN_MULTIPLIER,
        Math.max(MIN_DAZE_TAKEN_MULTIPLIER, unclampedMultiplier),
      )
    },
  })

function sumNonNegativeFiniteValues(
  values: readonly unknown[],
  name: string,
): number {
  let total = 0

  for (const value of values) {
    assertNonNegativeFiniteNumber(value, `${name} entries`)

    total += value
  }

  return total
}

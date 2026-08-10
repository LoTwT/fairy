import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const BASE_DAZE_DEALT_MULTIPLIER = 1
const MIN_DAZE_DEALT_MULTIPLIER = 0
const MAX_DAZE_DEALT_MULTIPLIER = 4

export interface DazeDealtFactorInput {
  readonly dazeDealtIncreases: readonly number[]
  readonly dazeDealtReductions: readonly number[]
}

export const DAZE_DEALT_FACTOR_ID = "daze_dealt" as const
export const DEFAULT_DAZE_DEALT_FACTOR_INPUT: DazeDealtFactorInput =
  Object.freeze({
    dazeDealtIncreases: Object.freeze([]),
    dazeDealtReductions: Object.freeze([]),
  })

export const dazeDealtFactor: Factor<DazeDealtFactorInput> =
  defineFactor<DazeDealtFactorInput>({
    factorId: DAZE_DEALT_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Daze dealt factor input")

      const { dazeDealtIncreases, dazeDealtReductions } = input

      assertArray(dazeDealtIncreases, "Daze dealt increases")
      assertArray(dazeDealtReductions, "Daze dealt reductions")

      const totalDazeDealtIncrease = sumNonNegativeFiniteValues(
        dazeDealtIncreases,
        "Daze dealt increases",
      )
      const totalDazeDealtReduction = sumNonNegativeFiniteValues(
        dazeDealtReductions,
        "Daze dealt reductions",
      )

      const unclampedMultiplier =
        BASE_DAZE_DEALT_MULTIPLIER +
        totalDazeDealtIncrease -
        totalDazeDealtReduction

      assertFiniteResult(unclampedMultiplier, "Unclamped daze dealt multiplier")

      return Math.min(
        MAX_DAZE_DEALT_MULTIPLIER,
        Math.max(MIN_DAZE_DEALT_MULTIPLIER, unclampedMultiplier),
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

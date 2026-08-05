import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const BASE_RESISTANCE_MULTIPLIER = 1
const MIN_RESISTANCE_MULTIPLIER = 0
const MAX_RESISTANCE_MULTIPLIER = 2

export interface ResistanceFactorInput {
  readonly targetResistance: number
  readonly targetResistanceReductions: readonly number[]
  readonly attackerResistanceIgnoreValues: readonly number[]
}

export const RESISTANCE_FACTOR_ID = "resistance" as const

export const resistanceFactor: Factor<ResistanceFactorInput> =
  defineFactor<ResistanceFactorInput>({
    factorId: RESISTANCE_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Resistance factor input")

      const {
        targetResistance,
        targetResistanceReductions,
        attackerResistanceIgnoreValues,
      } = input

      assertFiniteNumber(targetResistance, "Target resistance")
      assertArray(targetResistanceReductions, "Target resistance reductions")
      assertArray(
        attackerResistanceIgnoreValues,
        "Attacker resistance ignore values",
      )

      const totalTargetResistanceReduction = sumNonNegativeFiniteValues(
        targetResistanceReductions,
        "Target resistance reductions",
      )
      const totalAttackerResistanceIgnore = sumNonNegativeFiniteValues(
        attackerResistanceIgnoreValues,
        "Attacker resistance ignore values",
      )
      const unclampedMultiplier =
        BASE_RESISTANCE_MULTIPLIER -
        targetResistance +
        totalTargetResistanceReduction +
        totalAttackerResistanceIgnore

      assertFiniteResult(unclampedMultiplier, "Unclamped resistance multiplier")

      return Math.min(
        MAX_RESISTANCE_MULTIPLIER,
        Math.max(MIN_RESISTANCE_MULTIPLIER, unclampedMultiplier),
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

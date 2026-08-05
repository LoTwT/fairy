import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const BASE_DAMAGE_TAKEN_MULTIPLIER = 1
const MIN_DAMAGE_TAKEN_MULTIPLIER = 0.2
const MAX_DAMAGE_TAKEN_MULTIPLIER = 2

export interface DamageTakenFactorInput {
  readonly targetDamageTakenIncreases: readonly number[]
  readonly targetDamageTakenReductions: readonly number[]
}

export const DAMAGE_TAKEN_FACTOR_ID = "damage_taken" as const

export const damageTakenFactor: Factor<DamageTakenFactorInput> =
  defineFactor<DamageTakenFactorInput>({
    factorId: DAMAGE_TAKEN_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Damage taken factor input")

      const { targetDamageTakenIncreases, targetDamageTakenReductions } = input

      assertArray(targetDamageTakenIncreases, "Target damage taken increases")
      assertArray(targetDamageTakenReductions, "Target damage taken reductions")

      const totalTargetDamageTakenIncrease = sumNonNegativeFiniteValues(
        targetDamageTakenIncreases,
        "Target damage taken increases",
      )
      const totalTargetDamageTakenReduction = sumNonNegativeFiniteValues(
        targetDamageTakenReductions,
        "Target damage taken reductions",
      )

      const unclampedMultiplier =
        BASE_DAMAGE_TAKEN_MULTIPLIER +
        totalTargetDamageTakenIncrease -
        totalTargetDamageTakenReduction

      assertFiniteResult(
        unclampedMultiplier,
        "Unclamped damage taken multiplier",
      )

      return Math.min(
        MAX_DAMAGE_TAKEN_MULTIPLIER,
        Math.max(MIN_DAMAGE_TAKEN_MULTIPLIER, unclampedMultiplier),
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

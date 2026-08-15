import { defineFactor, type Factor } from "../factor.ts"
import { assertFiniteNumber } from "../internal/assert.ts"

const MIN_SETTLED_DAMAGE_BONUS_MULTIPLIER = 0
const MAX_SETTLED_DAMAGE_BONUS_MULTIPLIER = 6

export type SettledDamageBonusFactorInput = number

export const SETTLED_DAMAGE_BONUS_FACTOR_ID = "settled_damage_bonus" as const

export const DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT: SettledDamageBonusFactorInput = 1

export const settledDamageBonusFactor: Factor<SettledDamageBonusFactorInput> =
  defineFactor<SettledDamageBonusFactorInput>({
    factorId: SETTLED_DAMAGE_BONUS_FACTOR_ID,
    calculate: (input) => {
      assertFiniteNumber(input, "Settled damage bonus factor input")

      if (
        input < MIN_SETTLED_DAMAGE_BONUS_MULTIPLIER ||
        input > MAX_SETTLED_DAMAGE_BONUS_MULTIPLIER
      ) {
        throw new RangeError(
          `Settled damage bonus factor input must be between ${MIN_SETTLED_DAMAGE_BONUS_MULTIPLIER} and ${MAX_SETTLED_DAMAGE_BONUS_MULTIPLIER}`,
        )
      }

      return input
    },
  })

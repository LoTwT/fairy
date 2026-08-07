import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_DAMAGE_BONUS_MULTIPLIER = 1
const MIN_DAMAGE_BONUS_MULTIPLIER = 0
const MAX_DAMAGE_BONUS_MULTIPLIER = 6

export type DamageBonusFactorInput = readonly number[]

export const DAMAGE_BONUS_FACTOR_ID = "damage_bonus" as const
export const DEFAULT_DAMAGE_BONUS_FACTOR_INPUT: DamageBonusFactorInput =
  Object.freeze([])

export const damageBonusFactor: Factor<DamageBonusFactorInput> =
  defineFactor<DamageBonusFactorInput>({
    factorId: DAMAGE_BONUS_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Damage bonus factor input")

      let totalDamageBonus = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Damage bonus factor input")

        totalDamageBonus += input
      }

      const multiplier = BASE_DAMAGE_BONUS_MULTIPLIER + totalDamageBonus

      assertFiniteResult(multiplier, "Damage bonus multiplier")

      return Math.min(
        MAX_DAMAGE_BONUS_MULTIPLIER,
        Math.max(MIN_DAMAGE_BONUS_MULTIPLIER, multiplier),
      )
    },
  })

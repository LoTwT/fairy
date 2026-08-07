import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_SHEER_DAMAGE_BONUS_MULTIPLIER = 1
const MIN_SHEER_DAMAGE_BONUS_MULTIPLIER = 0.2
const MAX_SHEER_DAMAGE_BONUS_MULTIPLIER = 9

export type SheerDamageBonusFactorInput = readonly number[]

export const SHEER_DAMAGE_BONUS_FACTOR_ID = "sheer_damage_bonus" as const
export const DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT: SheerDamageBonusFactorInput =
  Object.freeze([])

export const sheerDamageBonusFactor: Factor<SheerDamageBonusFactorInput> =
  defineFactor<SheerDamageBonusFactorInput>({
    factorId: SHEER_DAMAGE_BONUS_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Sheer damage bonus factor input")

      let totalSheerDamageBonus = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Sheer damage bonus factor input")

        totalSheerDamageBonus += input
      }

      const multiplier =
        BASE_SHEER_DAMAGE_BONUS_MULTIPLIER + totalSheerDamageBonus

      assertFiniteResult(multiplier, "Sheer damage bonus multiplier")

      return Math.min(
        MAX_SHEER_DAMAGE_BONUS_MULTIPLIER,
        Math.max(MIN_SHEER_DAMAGE_BONUS_MULTIPLIER, multiplier),
      )
    },
  })

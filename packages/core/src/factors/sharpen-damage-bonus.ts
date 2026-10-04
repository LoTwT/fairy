import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

/**
 * 锐化伤害提升乘区：max(0, 1 + Σ贡献)，独立于普通增伤乘区。
 * 锐化专用契约只设下界 0（固定来源 `Math.max(0, 1 + combatSharpenDmgBonus / 100)`），
 * 不沿用普通增伤乘区的上限钳制；负贡献可以把乘区压到 0，但不产生负值。
 */
const BASE_SHARPEN_DAMAGE_BONUS_MULTIPLIER = 1
const MIN_SHARPEN_DAMAGE_BONUS_MULTIPLIER = 0

export type SharpenDamageBonusFactorInput = readonly number[]

export const SHARPEN_DAMAGE_BONUS_FACTOR_ID = "sharpen_damage_bonus" as const
export const DEFAULT_SHARPEN_DAMAGE_BONUS_FACTOR_INPUT: SharpenDamageBonusFactorInput =
  Object.freeze([])

export const sharpenDamageBonusFactor: Factor<SharpenDamageBonusFactorInput> =
  defineFactor<SharpenDamageBonusFactorInput>({
    factorId: SHARPEN_DAMAGE_BONUS_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Sharpen damage bonus factor input")

      let totalSharpenDamageBonus = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Sharpen damage bonus factor input")

        totalSharpenDamageBonus += input
      }

      const multiplier =
        BASE_SHARPEN_DAMAGE_BONUS_MULTIPLIER + totalSharpenDamageBonus

      assertFiniteResult(multiplier, "Sharpen damage bonus multiplier")

      return Math.max(MIN_SHARPEN_DAMAGE_BONUS_MULTIPLIER, multiplier)
    },
  })

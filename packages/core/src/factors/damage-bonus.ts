import { defineFactor, type Factor } from "../factor.ts"

const BASE_DAMAGE_BONUS_MULTIPLIER = 1
const MIN_DAMAGE_BONUS_MULTIPLIER = 0
const MAX_DAMAGE_BONUS_MULTIPLIER = 6

export type DamageBonusFactorInput = number

export const DAMAGE_BONUS_FACTOR_ID = "damage_bonus" as const

export const damageBonusFactor: Factor<DamageBonusFactorInput> =
  defineFactor<DamageBonusFactorInput>({
    factorId: DAMAGE_BONUS_FACTOR_ID,
    calculate: (inputs) => {
      let totalDamageBonus = 0

      for (const input of inputs) {
        assertValidDamageBonusFactorInput(input)

        totalDamageBonus += input

        if (!Number.isFinite(totalDamageBonus)) {
          throw new RangeError("Damage bonus input sum must be finite")
        }
      }

      const multiplier = BASE_DAMAGE_BONUS_MULTIPLIER + totalDamageBonus

      if (!Number.isFinite(multiplier)) {
        throw new RangeError("Damage bonus multiplier must be finite")
      }

      return Math.min(
        MAX_DAMAGE_BONUS_MULTIPLIER,
        Math.max(MIN_DAMAGE_BONUS_MULTIPLIER, multiplier),
      )
    },
  })

function assertValidDamageBonusFactorInput(
  input: unknown,
): asserts input is DamageBonusFactorInput {
  if (typeof input !== "number") {
    throw new TypeError("Damage bonus factor inputs must be numbers")
  }

  if (!Number.isFinite(input)) {
    throw new RangeError("Damage bonus factor inputs must be finite")
  }
}

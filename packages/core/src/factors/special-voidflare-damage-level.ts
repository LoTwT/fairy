import { defineFactor, type Factor } from "../factor.ts"
import { assertFiniteNumber } from "../internal/assert.ts"

const MIN_SPECIAL_VOIDFLARE_DAMAGE_LEVEL = 1
const MAX_SPECIAL_VOIDFLARE_DAMAGE_LEVEL = 60
const SPECIAL_VOIDFLARE_DAMAGE_LEVEL_OFFSET = 1
const SPECIAL_VOIDFLARE_DAMAGE_LEVEL_DIVISOR = 59

export type SpecialVoidflareDamageLevelFactorInput = number

export const SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID =
  "special_voidflare_damage_level" as const
export const DEFAULT_SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_INPUT: SpecialVoidflareDamageLevelFactorInput =
  MIN_SPECIAL_VOIDFLARE_DAMAGE_LEVEL

export const specialVoidflareDamageLevelFactor: Factor<SpecialVoidflareDamageLevelFactorInput> =
  defineFactor<SpecialVoidflareDamageLevelFactorInput>({
    factorId: SPECIAL_VOIDFLARE_DAMAGE_LEVEL_FACTOR_ID,
    calculate: (level) => {
      assertFiniteNumber(level, "Special Voidflare damage level factor input")

      if (
        !Number.isInteger(level) ||
        level < MIN_SPECIAL_VOIDFLARE_DAMAGE_LEVEL ||
        level > MAX_SPECIAL_VOIDFLARE_DAMAGE_LEVEL
      ) {
        throw new RangeError(
          `Special Voidflare damage level factor input must be an integer from ${MIN_SPECIAL_VOIDFLARE_DAMAGE_LEVEL} to ${MAX_SPECIAL_VOIDFLARE_DAMAGE_LEVEL}`,
        )
      }

      return (
        1 +
        (level - SPECIAL_VOIDFLARE_DAMAGE_LEVEL_OFFSET) /
          SPECIAL_VOIDFLARE_DAMAGE_LEVEL_DIVISOR
      )
    },
  })

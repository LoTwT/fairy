import { defineFactor, type Factor } from "../factor.ts"
import {
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface BaseDamageFactorInput {
  readonly damageMultiplier: number
  readonly finalStat: number
}

export const BASE_DAMAGE_FACTOR_ID = "base_damage" as const

export const baseDamageFactor: Factor<BaseDamageFactorInput> =
  defineFactor<BaseDamageFactorInput>({
    factorId: BASE_DAMAGE_FACTOR_ID,
    calculate: (inputs) => {
      let totalBaseDamage = 0

      for (const input of inputs) {
        const { damageMultiplier, finalStat } =
          getValidatedBaseDamageFactorInput(input)

        totalBaseDamage += damageMultiplier * finalStat
      }

      return totalBaseDamage
    },
  })

function getValidatedBaseDamageFactorInput(
  input: unknown,
): BaseDamageFactorInput {
  assertNonArrayObject(input, "Base damage factor input")

  const { damageMultiplier, finalStat } = input as BaseDamageFactorInput

  assertNonNegativeFiniteNumber(damageMultiplier, "Base damage multiplier")
  assertNonNegativeFiniteNumber(finalStat, "Base damage final stat")

  return { damageMultiplier, finalStat }
}

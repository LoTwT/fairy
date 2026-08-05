import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface BaseDamageFactorInputItem {
  readonly damageMultiplier: number
  readonly finalStat: number
}

export type BaseDamageFactorInput = readonly BaseDamageFactorInputItem[]

export const BASE_DAMAGE_FACTOR_ID = "base_damage" as const

export const baseDamageFactor: Factor<BaseDamageFactorInput> =
  defineFactor<BaseDamageFactorInput>({
    factorId: BASE_DAMAGE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Base damage factor input")

      let totalBaseDamage = 0

      for (const input of inputs) {
        const { damageMultiplier, finalStat } =
          getValidatedBaseDamageFactorInputItem(input)

        totalBaseDamage += damageMultiplier * finalStat
      }

      return totalBaseDamage
    },
  })

function getValidatedBaseDamageFactorInputItem(
  input: unknown,
): BaseDamageFactorInputItem {
  assertNonArrayObject(input, "Base damage factor input item")

  const { damageMultiplier, finalStat } = input as BaseDamageFactorInputItem

  assertNonNegativeFiniteNumber(damageMultiplier, "Base damage multiplier")
  assertNonNegativeFiniteNumber(finalStat, "Base damage final stat")

  return { damageMultiplier, finalStat }
}

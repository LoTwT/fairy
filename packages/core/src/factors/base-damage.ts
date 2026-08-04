import { defineFactor, type Factor } from "../factor.ts"

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

        const baseDamage = damageMultiplier * finalStat

        if (!Number.isFinite(baseDamage)) {
          throw new RangeError("Base damage input product must be finite")
        }

        totalBaseDamage += baseDamage

        if (!Number.isFinite(totalBaseDamage)) {
          throw new RangeError("Base damage input sum must be finite")
        }
      }

      return totalBaseDamage
    },
  })

function getValidatedBaseDamageFactorInput(
  input: unknown,
): BaseDamageFactorInput {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Base damage factor inputs must be objects")
  }

  const { damageMultiplier, finalStat } = input as BaseDamageFactorInput

  assertNonNegativeFiniteNumber(damageMultiplier, "Base damage multiplier")
  assertNonNegativeFiniteNumber(finalStat, "Base damage final stat")

  return { damageMultiplier, finalStat }
}

function assertNonNegativeFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  if (typeof value !== "number") {
    throw new TypeError(`${name} must be a number`)
  }

  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }

  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`)
  }
}

import { defineFactor, type Factor } from "../factor.ts"

const BASE_CRITICAL_MULTIPLIER = 1
const MIN_CRITICAL_DAMAGE = 0
const MAX_CRITICAL_DAMAGE = 5

export type CriticalFactorInput = number

export const CRITICAL_FACTOR_ID = "critical" as const

export const criticalFactor: Factor<CriticalFactorInput> =
  defineFactor<CriticalFactorInput>({
    factorId: CRITICAL_FACTOR_ID,
    calculate: (inputs) => {
      let totalCriticalDamage = 0

      for (const input of inputs) {
        assertValidCriticalFactorInput(input)

        totalCriticalDamage += input

        if (!Number.isFinite(totalCriticalDamage)) {
          throw new RangeError("Critical damage input sum must be finite")
        }
      }

      const effectiveCriticalDamage = Math.min(
        MAX_CRITICAL_DAMAGE,
        Math.max(MIN_CRITICAL_DAMAGE, totalCriticalDamage),
      )

      return BASE_CRITICAL_MULTIPLIER + effectiveCriticalDamage
    },
  })

function assertValidCriticalFactorInput(
  input: unknown,
): asserts input is CriticalFactorInput {
  if (typeof input !== "number") {
    throw new TypeError("Critical factor inputs must be numbers")
  }

  if (!Number.isFinite(input)) {
    throw new RangeError("Critical factor inputs must be finite")
  }
}

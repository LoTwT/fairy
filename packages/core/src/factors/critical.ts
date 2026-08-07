import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertBoolean,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
} from "../internal/assert.ts"

const BASE_CRITICAL_MULTIPLIER = 1
const MIN_CRITICAL_DAMAGE = 0
const MAX_CRITICAL_DAMAGE = 5

export interface CriticalFactorInput {
  readonly isCritical: boolean
  readonly criticalDamageContributions: readonly number[]
}

export const CRITICAL_FACTOR_ID = "critical" as const
export const DEFAULT_CRITICAL_FACTOR_INPUT: CriticalFactorInput = Object.freeze(
  {
    isCritical: false,
    criticalDamageContributions: Object.freeze([]),
  },
)

export const criticalFactor: Factor<CriticalFactorInput> =
  defineFactor<CriticalFactorInput>({
    factorId: CRITICAL_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Critical factor input")

      const { isCritical, criticalDamageContributions } = input

      assertBoolean(isCritical, "isCritical")
      assertArray(criticalDamageContributions, "Critical damage contributions")

      let totalCriticalDamage = 0

      for (const criticalDamageContribution of criticalDamageContributions) {
        assertFiniteNumber(
          criticalDamageContribution,
          "Critical damage contribution",
        )

        if (isCritical) {
          totalCriticalDamage += criticalDamageContribution
        }
      }

      if (!isCritical) {
        return BASE_CRITICAL_MULTIPLIER
      }

      assertFiniteResult(
        totalCriticalDamage,
        "Critical damage contribution sum",
      )

      const effectiveCriticalDamage = Math.min(
        MAX_CRITICAL_DAMAGE,
        Math.max(MIN_CRITICAL_DAMAGE, totalCriticalDamage),
      )

      return BASE_CRITICAL_MULTIPLIER + effectiveCriticalDamage
    },
  })

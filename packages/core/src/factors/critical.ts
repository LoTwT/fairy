import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_CRITICAL_MULTIPLIER = 1
const MIN_CRITICAL_DAMAGE = 0
const MAX_CRITICAL_DAMAGE = 5

export type CriticalFactorInput = readonly number[]

export const CRITICAL_FACTOR_ID = "critical" as const

export const criticalFactor: Factor<CriticalFactorInput> =
  defineFactor<CriticalFactorInput>({
    factorId: CRITICAL_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Critical factor input")

      let totalCriticalDamage = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Critical factor input")

        totalCriticalDamage += input
      }

      assertFiniteResult(totalCriticalDamage, "Critical damage input sum")

      const effectiveCriticalDamage = Math.min(
        MAX_CRITICAL_DAMAGE,
        Math.max(MIN_CRITICAL_DAMAGE, totalCriticalDamage),
      )

      return BASE_CRITICAL_MULTIPLIER + effectiveCriticalDamage
    },
  })

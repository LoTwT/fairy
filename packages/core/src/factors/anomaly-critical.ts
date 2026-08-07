import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertBoolean,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
} from "../internal/assert.ts"

const BASE_ANOMALY_CRITICAL_MULTIPLIER = 1
const MIN_ANOMALY_CRITICAL_DAMAGE = 0
const MAX_ANOMALY_CRITICAL_DAMAGE = 2

export interface AnomalyCriticalFactorInput {
  readonly isAnomalyCritical: boolean
  readonly anomalyCriticalDamageContributions: readonly number[]
}

export const ANOMALY_CRITICAL_FACTOR_ID = "anomaly_critical" as const
export const DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT: AnomalyCriticalFactorInput =
  Object.freeze({
    isAnomalyCritical: false,
    anomalyCriticalDamageContributions: Object.freeze([]),
  })

export const anomalyCriticalFactor: Factor<AnomalyCriticalFactorInput> =
  defineFactor<AnomalyCriticalFactorInput>({
    factorId: ANOMALY_CRITICAL_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Anomaly critical factor input")

      const { isAnomalyCritical, anomalyCriticalDamageContributions } = input

      assertBoolean(isAnomalyCritical, "isAnomalyCritical")
      assertArray(
        anomalyCriticalDamageContributions,
        "Anomaly critical damage contributions",
      )

      let totalAnomalyCriticalDamage = 0

      for (const anomalyCriticalDamageContribution of anomalyCriticalDamageContributions) {
        assertFiniteNumber(
          anomalyCriticalDamageContribution,
          "Anomaly critical damage contribution",
        )

        if (isAnomalyCritical) {
          totalAnomalyCriticalDamage += anomalyCriticalDamageContribution
        }
      }

      if (!isAnomalyCritical) {
        return BASE_ANOMALY_CRITICAL_MULTIPLIER
      }

      assertFiniteResult(
        totalAnomalyCriticalDamage,
        "Anomaly critical damage contribution sum",
      )

      const effectiveAnomalyCriticalDamage = Math.min(
        MAX_ANOMALY_CRITICAL_DAMAGE,
        Math.max(MIN_ANOMALY_CRITICAL_DAMAGE, totalAnomalyCriticalDamage),
      )

      return BASE_ANOMALY_CRITICAL_MULTIPLIER + effectiveAnomalyCriticalDamage
    },
  })

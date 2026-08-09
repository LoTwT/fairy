import { defineFactor, type Factor } from "../factor.ts"
import { assertNonNegativeFiniteNumber } from "../internal/assert.ts"

const ANOMALY_MASTERY_MULTIPLIER_DIVISOR = 100
const MIN_ANOMALY_MASTERY_MULTIPLIER = 0
const MAX_ANOMALY_MASTERY_MULTIPLIER = 3

export type AnomalyMasteryFactorInput = number

export const ANOMALY_MASTERY_FACTOR_ID = "anomaly_mastery" as const
export const DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT: AnomalyMasteryFactorInput = 100

export const anomalyMasteryFactor: Factor<AnomalyMasteryFactorInput> =
  defineFactor<AnomalyMasteryFactorInput>({
    factorId: ANOMALY_MASTERY_FACTOR_ID,
    calculate: (anomalyMastery) => {
      assertNonNegativeFiniteNumber(
        anomalyMastery,
        "Anomaly mastery factor input",
      )

      const flooredAnomalyMastery = Math.floor(anomalyMastery)
      const multiplier =
        flooredAnomalyMastery / ANOMALY_MASTERY_MULTIPLIER_DIVISOR

      return Math.min(
        MAX_ANOMALY_MASTERY_MULTIPLIER,
        Math.max(MIN_ANOMALY_MASTERY_MULTIPLIER, multiplier),
      )
    },
  })

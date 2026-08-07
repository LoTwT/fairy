import { defineFactor, type Factor } from "../factor.ts"
import { assertNonNegativeFiniteNumber } from "../internal/assert.ts"

const ANOMALY_PROFICIENCY_MULTIPLIER_DIVISOR = 100
const MIN_ANOMALY_PROFICIENCY_MULTIPLIER = 0
const MAX_ANOMALY_PROFICIENCY_MULTIPLIER = 10

export type AnomalyProficiencyFactorInput = number

export const ANOMALY_PROFICIENCY_FACTOR_ID = "anomaly_proficiency" as const
export const DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT: AnomalyProficiencyFactorInput = 100

export const anomalyProficiencyFactor: Factor<AnomalyProficiencyFactorInput> =
  defineFactor<AnomalyProficiencyFactorInput>({
    factorId: ANOMALY_PROFICIENCY_FACTOR_ID,
    calculate: (anomalyProficiency) => {
      assertNonNegativeFiniteNumber(
        anomalyProficiency,
        "Anomaly proficiency factor input",
      )

      const multiplier =
        anomalyProficiency / ANOMALY_PROFICIENCY_MULTIPLIER_DIVISOR

      return Math.min(
        MAX_ANOMALY_PROFICIENCY_MULTIPLIER,
        Math.max(MIN_ANOMALY_PROFICIENCY_MULTIPLIER, multiplier),
      )
    },
  })

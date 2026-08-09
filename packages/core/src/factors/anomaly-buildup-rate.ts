import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_ANOMALY_BUILDUP_RATE_MULTIPLIER = 1

export type AnomalyBuildupRateFactorInput = readonly number[]

export const ANOMALY_BUILDUP_RATE_FACTOR_ID = "anomaly_buildup_rate" as const
export const DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT: AnomalyBuildupRateFactorInput =
  Object.freeze([])

export const anomalyBuildupRateFactor: Factor<AnomalyBuildupRateFactorInput> =
  defineFactor<AnomalyBuildupRateFactorInput>({
    factorId: ANOMALY_BUILDUP_RATE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Anomaly buildup rate factor input")

      let totalAnomalyBuildupRate = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Anomaly buildup rate factor input")

        totalAnomalyBuildupRate += input
      }

      const multiplier =
        BASE_ANOMALY_BUILDUP_RATE_MULTIPLIER + totalAnomalyBuildupRate

      assertFiniteResult(multiplier, "Anomaly buildup rate multiplier")

      if (multiplier < 0) {
        throw new RangeError(
          "Anomaly buildup rate multiplier must be non-negative",
        )
      }

      return multiplier
    },
  })

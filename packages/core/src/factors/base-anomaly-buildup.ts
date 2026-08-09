import { defineFactor, type Factor } from "../factor.ts"
import { assertNonNegativeFiniteNumber } from "../internal/assert.ts"

export type BaseAnomalyBuildupFactorInput = number

export const BASE_ANOMALY_BUILDUP_FACTOR_ID = "base_anomaly_buildup" as const

export const baseAnomalyBuildupFactor: Factor<BaseAnomalyBuildupFactorInput> =
  defineFactor<BaseAnomalyBuildupFactorInput>({
    factorId: BASE_ANOMALY_BUILDUP_FACTOR_ID,
    calculate: (baseAnomalyBuildup) => {
      assertNonNegativeFiniteNumber(
        baseAnomalyBuildup,
        "Base anomaly buildup factor input",
      )

      return baseAnomalyBuildup
    },
  })

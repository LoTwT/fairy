import { defineFactor, type Factor } from "../factor.ts"
import { assertNonNegativeFiniteNumber } from "../internal/assert.ts"

export type AccompanyingDecibelGenerationRateFactorInput = number

export const ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID =
  "accompanying_decibel_generation_rate" as const
export const DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT: AccompanyingDecibelGenerationRateFactorInput = 1

export const accompanyingDecibelGenerationRateFactor: Factor<AccompanyingDecibelGenerationRateFactorInput> =
  defineFactor<AccompanyingDecibelGenerationRateFactorInput>({
    factorId: ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
    calculate: (accompanyingDecibelGenerationRateMultiplier) => {
      assertNonNegativeFiniteNumber(
        accompanyingDecibelGenerationRateMultiplier,
        "Accompanying decibel generation rate factor input",
      )

      return accompanyingDecibelGenerationRateMultiplier
    },
  })

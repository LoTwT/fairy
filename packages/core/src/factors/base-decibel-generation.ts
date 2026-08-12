import { defineFactor, type Factor } from "../factor.ts"
import { assertNonNegativeFiniteNumber } from "../internal/assert.ts"

export type BaseDecibelGenerationFactorInput = number

export const BASE_DECIBEL_GENERATION_FACTOR_ID =
  "base_decibel_generation" as const

export const baseDecibelGenerationFactor: Factor<BaseDecibelGenerationFactorInput> =
  defineFactor<BaseDecibelGenerationFactorInput>({
    factorId: BASE_DECIBEL_GENERATION_FACTOR_ID,
    calculate: (baseDecibelGeneration) => {
      assertNonNegativeFiniteNumber(
        baseDecibelGeneration,
        "Base decibel generation factor input",
      )

      return baseDecibelGeneration
    },
  })

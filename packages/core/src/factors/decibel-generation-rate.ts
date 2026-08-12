import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_DECIBEL_GENERATION_RATE_MULTIPLIER = 1
const MIN_DECIBEL_GENERATION_RATE_MULTIPLIER = 0
const MAX_DECIBEL_GENERATION_RATE_MULTIPLIER = 3

export type DecibelGenerationRateFactorInput = readonly number[]

export const DECIBEL_GENERATION_RATE_FACTOR_ID =
  "decibel_generation_rate" as const
export const DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT: DecibelGenerationRateFactorInput =
  Object.freeze([])

export const decibelGenerationRateFactor: Factor<DecibelGenerationRateFactorInput> =
  defineFactor<DecibelGenerationRateFactorInput>({
    factorId: DECIBEL_GENERATION_RATE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Decibel generation rate factor input")

      let totalDecibelGenerationRate = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Decibel generation rate factor input")

        totalDecibelGenerationRate += input
      }

      const multiplier =
        BASE_DECIBEL_GENERATION_RATE_MULTIPLIER + totalDecibelGenerationRate

      assertFiniteResult(multiplier, "Decibel generation rate multiplier")

      return Math.min(
        MAX_DECIBEL_GENERATION_RATE_MULTIPLIER,
        Math.max(MIN_DECIBEL_GENERATION_RATE_MULTIPLIER, multiplier),
      )
    },
  })

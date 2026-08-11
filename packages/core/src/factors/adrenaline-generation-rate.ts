import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_ADRENALINE_GENERATION_RATE_MULTIPLIER = 1
const MIN_ADRENALINE_GENERATION_RATE_MULTIPLIER = 0
const MAX_ADRENALINE_GENERATION_RATE_MULTIPLIER = 3

export type AdrenalineGenerationRateFactorInput = readonly number[]

export const ADRENALINE_GENERATION_RATE_FACTOR_ID =
  "adrenaline_generation_rate" as const
export const DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT: AdrenalineGenerationRateFactorInput =
  Object.freeze([])

export const adrenalineGenerationRateFactor: Factor<AdrenalineGenerationRateFactorInput> =
  defineFactor<AdrenalineGenerationRateFactorInput>({
    factorId: ADRENALINE_GENERATION_RATE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Adrenaline generation rate factor input")

      let totalAdrenalineGenerationRate = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Adrenaline generation rate factor input")

        totalAdrenalineGenerationRate += input
      }

      const multiplier =
        BASE_ADRENALINE_GENERATION_RATE_MULTIPLIER +
        totalAdrenalineGenerationRate

      assertFiniteResult(multiplier, "Adrenaline generation rate multiplier")

      return Math.min(
        MAX_ADRENALINE_GENERATION_RATE_MULTIPLIER,
        Math.max(MIN_ADRENALINE_GENERATION_RATE_MULTIPLIER, multiplier),
      )
    },
  })

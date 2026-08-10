import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_ENERGY_GENERATION_RATE_MULTIPLIER = 1
const MIN_ENERGY_GENERATION_RATE_MULTIPLIER = 0
const MAX_ENERGY_GENERATION_RATE_MULTIPLIER = 3

export type EnergyGenerationRateFactorInput = readonly number[]

export const ENERGY_GENERATION_RATE_FACTOR_ID =
  "energy_generation_rate" as const
export const DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT: EnergyGenerationRateFactorInput =
  Object.freeze([])

export const energyGenerationRateFactor: Factor<EnergyGenerationRateFactorInput> =
  defineFactor<EnergyGenerationRateFactorInput>({
    factorId: ENERGY_GENERATION_RATE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Energy generation rate factor input")

      let totalEnergyGenerationRate = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Energy generation rate factor input")

        totalEnergyGenerationRate += input
      }

      const multiplier =
        BASE_ENERGY_GENERATION_RATE_MULTIPLIER + totalEnergyGenerationRate

      assertFiniteResult(multiplier, "Energy generation rate multiplier")

      return Math.min(
        MAX_ENERGY_GENERATION_RATE_MULTIPLIER,
        Math.max(MIN_ENERGY_GENERATION_RATE_MULTIPLIER, multiplier),
      )
    },
  })

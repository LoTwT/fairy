import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_MIASMIC_SHIELD_REDUCTION_RATE_MULTIPLIER = 1
const MIN_MIASMIC_SHIELD_REDUCTION_RATE_MULTIPLIER = 0.2
const MAX_MIASMIC_SHIELD_REDUCTION_RATE_MULTIPLIER = 3

export type MiasmicShieldReductionRateFactorInput = readonly number[]

export const MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID =
  "miasmic_shield_reduction_rate" as const
export const DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT: MiasmicShieldReductionRateFactorInput =
  Object.freeze([])

export const miasmicShieldReductionRateFactor: Factor<MiasmicShieldReductionRateFactorInput> =
  defineFactor<MiasmicShieldReductionRateFactorInput>({
    factorId: MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Miasmic shield reduction rate factor input")

      let totalMiasmicShieldReductionRateContribution = 0

      for (let index = 0; index < inputs.length; index += 1) {
        const input = inputs[index]

        assertFiniteNumber(input, "Miasmic shield reduction rate factor input")

        totalMiasmicShieldReductionRateContribution += input
      }

      const multiplier =
        BASE_MIASMIC_SHIELD_REDUCTION_RATE_MULTIPLIER +
        totalMiasmicShieldReductionRateContribution

      assertFiniteResult(multiplier, "Miasmic shield reduction rate multiplier")

      return Math.min(
        MAX_MIASMIC_SHIELD_REDUCTION_RATE_MULTIPLIER,
        Math.max(MIN_MIASMIC_SHIELD_REDUCTION_RATE_MULTIPLIER, multiplier),
      )
    },
  })

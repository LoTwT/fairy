import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_MULTIPLIER = 1
const MIN_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_MULTIPLIER = 0.2
const MAX_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_MULTIPLIER = 3

export type MiasmicShieldReductionTakenRateFactorInput = readonly number[]

export const MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID =
  "miasmic_shield_reduction_taken_rate" as const
export const DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT: MiasmicShieldReductionTakenRateFactorInput =
  Object.freeze([])

export const miasmicShieldReductionTakenRateFactor: Factor<MiasmicShieldReductionTakenRateFactorInput> =
  defineFactor<MiasmicShieldReductionTakenRateFactorInput>({
    factorId: MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Miasmic shield reduction taken rate factor input")

      let totalMiasmicShieldReductionTakenRateContribution = 0

      for (let index = 0; index < inputs.length; index += 1) {
        const input = inputs[index]

        assertFiniteNumber(
          input,
          "Miasmic shield reduction taken rate factor input",
        )

        totalMiasmicShieldReductionTakenRateContribution += input
      }

      const multiplier =
        BASE_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_MULTIPLIER +
        totalMiasmicShieldReductionTakenRateContribution

      assertFiniteResult(
        multiplier,
        "Miasmic shield reduction taken rate multiplier",
      )

      return Math.min(
        MAX_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_MULTIPLIER,
        Math.max(
          MIN_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_MULTIPLIER,
          multiplier,
        ),
      )
    },
  })

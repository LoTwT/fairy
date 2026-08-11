import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface BaseAdrenalineGenerationFactorInput {
  readonly baseAdrenalineGenerationValues: readonly number[]
  readonly finalAdrenalineRegen: number
  readonly effectiveAdrenalineRegenDurationInSeconds: number
}

export const BASE_ADRENALINE_GENERATION_FACTOR_ID =
  "base_adrenaline_generation" as const

export const baseAdrenalineGenerationFactor: Factor<BaseAdrenalineGenerationFactorInput> =
  defineFactor<BaseAdrenalineGenerationFactorInput>({
    factorId: BASE_ADRENALINE_GENERATION_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Base adrenaline generation factor input")

      const {
        baseAdrenalineGenerationValues,
        finalAdrenalineRegen,
        effectiveAdrenalineRegenDurationInSeconds,
      } = input

      assertArray(
        baseAdrenalineGenerationValues,
        "Base adrenaline generation values",
      )
      assertNonNegativeFiniteNumber(
        finalAdrenalineRegen,
        "Final adrenaline regen",
      )
      assertNonNegativeFiniteNumber(
        effectiveAdrenalineRegenDurationInSeconds,
        "Effective adrenaline regen duration in seconds",
      )

      let totalBaseAdrenalineGeneration = 0

      for (const baseAdrenalineGenerationValue of baseAdrenalineGenerationValues) {
        assertNonNegativeFiniteNumber(
          baseAdrenalineGenerationValue,
          "Base adrenaline generation value",
        )

        totalBaseAdrenalineGeneration += baseAdrenalineGenerationValue
      }

      const automaticAdrenalineGeneration =
        finalAdrenalineRegen * effectiveAdrenalineRegenDurationInSeconds

      return totalBaseAdrenalineGeneration + automaticAdrenalineGeneration
    },
  })

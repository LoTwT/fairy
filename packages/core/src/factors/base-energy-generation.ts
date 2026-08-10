import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface BaseEnergyGenerationFactorInput {
  readonly baseEnergyGenerationValues: readonly number[]
  readonly finalEnergyRegen: number
  readonly effectiveEnergyRegenDurationInSeconds: number
}

export const BASE_ENERGY_GENERATION_FACTOR_ID =
  "base_energy_generation" as const

export const baseEnergyGenerationFactor: Factor<BaseEnergyGenerationFactorInput> =
  defineFactor<BaseEnergyGenerationFactorInput>({
    factorId: BASE_ENERGY_GENERATION_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Base energy generation factor input")

      const {
        baseEnergyGenerationValues,
        finalEnergyRegen,
        effectiveEnergyRegenDurationInSeconds,
      } = input

      assertArray(baseEnergyGenerationValues, "Base energy generation values")
      assertNonNegativeFiniteNumber(finalEnergyRegen, "Final energy regen")
      assertNonNegativeFiniteNumber(
        effectiveEnergyRegenDurationInSeconds,
        "Effective energy regen duration in seconds",
      )

      let totalBaseEnergyGeneration = 0

      for (const baseEnergyGenerationValue of baseEnergyGenerationValues) {
        assertNonNegativeFiniteNumber(
          baseEnergyGenerationValue,
          "Base energy generation value",
        )

        totalBaseEnergyGeneration += baseEnergyGenerationValue
      }

      const automaticEnergyGeneration =
        finalEnergyRegen * effectiveEnergyRegenDurationInSeconds

      return totalBaseEnergyGeneration + automaticEnergyGeneration
    },
  })

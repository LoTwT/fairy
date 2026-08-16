import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface LuminizeMultiplierFactorInput {
  readonly baseLuminizeMultiplier: number
  readonly remielleAnomalyProficiency: number
  readonly anomalyProficiencyConversionRate: number
  readonly multiplicativeLuminizeMultiplierAdjustments: readonly number[]
}

export const LUMINIZE_MULTIPLIER_FACTOR_ID = "luminize_multiplier" as const

export const luminizeMultiplierFactor: Factor<LuminizeMultiplierFactorInput> =
  defineFactor<LuminizeMultiplierFactorInput>({
    factorId: LUMINIZE_MULTIPLIER_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Luminize multiplier factor input")

      const {
        baseLuminizeMultiplier,
        remielleAnomalyProficiency,
        anomalyProficiencyConversionRate,
        multiplicativeLuminizeMultiplierAdjustments,
      } = input

      assertNonNegativeFiniteNumber(
        baseLuminizeMultiplier,
        "Base Luminize multiplier",
      )
      assertNonNegativeFiniteNumber(
        remielleAnomalyProficiency,
        "Remielle anomaly proficiency",
      )
      assertNonNegativeFiniteNumber(
        anomalyProficiencyConversionRate,
        "Anomaly proficiency conversion rate",
      )
      assertArray(
        multiplicativeLuminizeMultiplierAdjustments,
        "Multiplicative Luminize multiplier adjustments",
      )

      const anomalyProficiencyMultiplier =
        remielleAnomalyProficiency * anomalyProficiencyConversionRate
      assertFiniteResult(
        anomalyProficiencyMultiplier,
        "Anomaly proficiency Luminize multiplier",
      )

      let luminizeMultiplier =
        baseLuminizeMultiplier + anomalyProficiencyMultiplier
      assertFiniteResult(luminizeMultiplier, "Additive Luminize multiplier")

      const adjustmentCount = multiplicativeLuminizeMultiplierAdjustments.length

      for (let index = 0; index < adjustmentCount; index += 1) {
        const adjustment = Object.hasOwn(
          multiplicativeLuminizeMultiplierAdjustments,
          index,
        )
          ? multiplicativeLuminizeMultiplierAdjustments[index]
          : undefined

        assertNonNegativeFiniteNumber(
          adjustment,
          "Multiplicative Luminize multiplier adjustment",
        )

        luminizeMultiplier *= adjustment
      }

      assertFiniteResult(luminizeMultiplier, "Luminize multiplier")

      return luminizeMultiplier
    },
  })

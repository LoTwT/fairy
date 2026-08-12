import {
  accompanyingDecibelGenerationRateFactor,
  type AccompanyingDecibelGenerationRateFactorInput,
} from "../factors/accompanying-decibel-generation-rate.ts"
import {
  baseDecibelGenerationFactor,
  type BaseDecibelGenerationFactorInput,
} from "../factors/base-decibel-generation.ts"
import {
  decibelGenerationRateFactor,
  type DecibelGenerationRateFactorInput,
} from "../factors/decibel-generation-rate.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface DecibelGenerationFormulaInput {
  readonly baseDecibelGeneration: BaseDecibelGenerationFactorInput
  readonly decibelGenerationRate: DecibelGenerationRateFactorInput
  readonly accompanyingDecibelGenerationRate: AccompanyingDecibelGenerationRateFactorInput
}

export const DECIBEL_GENERATION_FORMULA_ID = "decibel_generation" as const

export const decibelGenerationFormula: Formula<DecibelGenerationFormulaInput> =
  defineFormula<DecibelGenerationFormulaInput>({
    formulaId: DECIBEL_GENERATION_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Decibel generation formula input")

      const factorResults = {
        baseDecibelGeneration: baseDecibelGenerationFactor.calculate(
          input.baseDecibelGeneration,
        ),
        decibelGenerationRate: decibelGenerationRateFactor.calculate(
          input.decibelGenerationRate,
        ),
        accompanyingDecibelGenerationRate:
          accompanyingDecibelGenerationRateFactor.calculate(
            input.accompanyingDecibelGenerationRate,
          ),
      } satisfies FormulaFactorResults<DecibelGenerationFormulaInput>

      const value =
        factorResults.baseDecibelGeneration *
        factorResults.decibelGenerationRate *
        factorResults.accompanyingDecibelGenerationRate

      return { value, factorResults }
    },
  })

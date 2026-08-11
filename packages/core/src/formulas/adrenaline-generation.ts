import {
  baseAdrenalineGenerationFactor,
  type BaseAdrenalineGenerationFactorInput,
} from "../factors/base-adrenaline-generation.ts"
import {
  adrenalineGenerationRateFactor,
  type AdrenalineGenerationRateFactorInput,
} from "../factors/adrenaline-generation-rate.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface AdrenalineGenerationFormulaInput {
  readonly baseAdrenalineGeneration: BaseAdrenalineGenerationFactorInput
  readonly adrenalineGenerationRate: AdrenalineGenerationRateFactorInput
}

export const ADRENALINE_GENERATION_FORMULA_ID = "adrenaline_generation" as const

export const adrenalineGenerationFormula: Formula<AdrenalineGenerationFormulaInput> =
  defineFormula<AdrenalineGenerationFormulaInput>({
    formulaId: ADRENALINE_GENERATION_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Adrenaline generation formula input")

      const factorResults = {
        baseAdrenalineGeneration: baseAdrenalineGenerationFactor.calculate(
          input.baseAdrenalineGeneration,
        ),
        adrenalineGenerationRate: adrenalineGenerationRateFactor.calculate(
          input.adrenalineGenerationRate,
        ),
      } satisfies FormulaFactorResults<AdrenalineGenerationFormulaInput>

      const value =
        factorResults.baseAdrenalineGeneration *
        factorResults.adrenalineGenerationRate

      return { value, factorResults }
    },
  })

import {
  baseEnergyGenerationFactor,
  type BaseEnergyGenerationFactorInput,
} from "../factors/base-energy-generation.ts"
import {
  energyGenerationRateFactor,
  type EnergyGenerationRateFactorInput,
} from "../factors/energy-generation-rate.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface EnergyGenerationFormulaInput {
  readonly baseEnergyGeneration: BaseEnergyGenerationFactorInput
  readonly energyGenerationRate: EnergyGenerationRateFactorInput
}

export const ENERGY_GENERATION_FORMULA_ID = "energy_generation" as const

export const energyGenerationFormula: Formula<EnergyGenerationFormulaInput> =
  defineFormula<EnergyGenerationFormulaInput>({
    formulaId: ENERGY_GENERATION_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Energy generation formula input")

      const factorResults = {
        baseEnergyGeneration: baseEnergyGenerationFactor.calculate(
          input.baseEnergyGeneration,
        ),
        energyGenerationRate: energyGenerationRateFactor.calculate(
          input.energyGenerationRate,
        ),
      } satisfies FormulaFactorResults<EnergyGenerationFormulaInput>

      const value =
        factorResults.baseEnergyGeneration * factorResults.energyGenerationRate

      return { value, factorResults }
    },
  })

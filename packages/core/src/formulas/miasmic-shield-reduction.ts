import {
  baseMiasmicShieldReductionFactor,
  type BaseMiasmicShieldReductionFactorInput,
} from "../factors/base-miasmic-shield-reduction.ts"
import {
  miasmicShieldReductionRateFactor,
  type MiasmicShieldReductionRateFactorInput,
} from "../factors/miasmic-shield-reduction-rate.ts"
import {
  miasmicShieldReductionTakenRateFactor,
  type MiasmicShieldReductionTakenRateFactorInput,
} from "../factors/miasmic-shield-reduction-taken-rate.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface MiasmicShieldReductionFormulaInput {
  readonly baseMiasmicShieldReduction: BaseMiasmicShieldReductionFactorInput
  readonly miasmicShieldReductionRate: MiasmicShieldReductionRateFactorInput
  readonly miasmicShieldReductionTakenRate: MiasmicShieldReductionTakenRateFactorInput
}

export const MIASMIC_SHIELD_REDUCTION_FORMULA_ID =
  "miasmic_shield_reduction" as const

export const miasmicShieldReductionFormula: Formula<MiasmicShieldReductionFormulaInput> =
  defineFormula<MiasmicShieldReductionFormulaInput>({
    formulaId: MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Miasmic shield reduction formula input")

      const factorResults = {
        baseMiasmicShieldReduction: baseMiasmicShieldReductionFactor.calculate(
          input.baseMiasmicShieldReduction,
        ),
        miasmicShieldReductionRate: miasmicShieldReductionRateFactor.calculate(
          input.miasmicShieldReductionRate,
        ),
        miasmicShieldReductionTakenRate:
          miasmicShieldReductionTakenRateFactor.calculate(
            input.miasmicShieldReductionTakenRate,
          ),
      } satisfies FormulaFactorResults<MiasmicShieldReductionFormulaInput>

      const value =
        factorResults.baseMiasmicShieldReduction *
        factorResults.miasmicShieldReductionRate *
        factorResults.miasmicShieldReductionTakenRate

      return { value, factorResults }
    },
  })

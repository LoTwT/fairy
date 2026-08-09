import {
  baseAnomalyBuildupFactor,
  type BaseAnomalyBuildupFactorInput,
} from "../factors/base-anomaly-buildup.ts"
import {
  anomalyMasteryFactor,
  type AnomalyMasteryFactorInput,
} from "../factors/anomaly-mastery.ts"
import {
  anomalyBuildupRateFactor,
  type AnomalyBuildupRateFactorInput,
} from "../factors/anomaly-buildup-rate.ts"
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface AnomalyBuildupFormulaInput {
  readonly baseAnomalyBuildup: BaseAnomalyBuildupFactorInput
  readonly anomalyMastery: AnomalyMasteryFactorInput
  readonly anomalyBuildupRate: AnomalyBuildupRateFactorInput
  readonly resistance: ResistanceFactorInput
}

export const ANOMALY_BUILDUP_FORMULA_ID = "anomaly_buildup" as const

export const anomalyBuildupFormula: Formula<AnomalyBuildupFormulaInput> =
  defineFormula<AnomalyBuildupFormulaInput>({
    formulaId: ANOMALY_BUILDUP_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Anomaly buildup formula input")

      const factorResults = {
        baseAnomalyBuildup: baseAnomalyBuildupFactor.calculate(
          input.baseAnomalyBuildup,
        ),
        anomalyMastery: anomalyMasteryFactor.calculate(input.anomalyMastery),
        anomalyBuildupRate: anomalyBuildupRateFactor.calculate(
          input.anomalyBuildupRate,
        ),
        resistance: resistanceFactor.calculate(input.resistance),
      } satisfies FormulaFactorResults<AnomalyBuildupFormulaInput>

      const value =
        factorResults.baseAnomalyBuildup *
        factorResults.anomalyMastery *
        factorResults.anomalyBuildupRate *
        factorResults.resistance

      return { value, factorResults }
    },
  })

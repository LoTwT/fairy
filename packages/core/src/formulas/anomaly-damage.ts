import {
  baseDamageFactor,
  type BaseDamageFactorInput,
} from "../factors/base-damage.ts"
import {
  damageBonusFactor,
  type DamageBonusFactorInput,
} from "../factors/damage-bonus.ts"
import {
  anomalyProficiencyFactor,
  type AnomalyProficiencyFactorInput,
} from "../factors/anomaly-proficiency.ts"
import { defenseFactor, type DefenseFactorInput } from "../factors/defense.ts"
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  damageTakenFactor,
  type DamageTakenFactorInput,
} from "../factors/damage-taken.ts"
import {
  stunDamageFactor,
  type StunDamageFactorInput,
} from "../factors/stun-damage.ts"
import {
  anomalyDamageLevelFactor,
  type AnomalyDamageLevelFactorInput,
} from "../factors/anomaly-damage-level.ts"
import {
  anomalyDamageBonusFactor,
  type AnomalyDamageBonusFactorInput,
} from "../factors/anomaly-damage-bonus.ts"
import {
  anomalyCriticalFactor,
  type AnomalyCriticalFactorInput,
} from "../factors/anomaly-critical.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface AnomalyDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly anomalyProficiency: AnomalyProficiencyFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
  readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
  readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
  readonly anomalyCritical: AnomalyCriticalFactorInput
}

export const ANOMALY_DAMAGE_FORMULA_ID = "anomaly_damage" as const

export const anomalyDamageFormula: Formula<AnomalyDamageFormulaInput> =
  defineFormula<AnomalyDamageFormulaInput>({
    formulaId: ANOMALY_DAMAGE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Anomaly damage formula input")

      const factorResults = {
        baseDamage: baseDamageFactor.calculate(input.baseDamage),
        damageBonus: damageBonusFactor.calculate(input.damageBonus),
        anomalyProficiency: anomalyProficiencyFactor.calculate(
          input.anomalyProficiency,
        ),
        defense: defenseFactor.calculate(input.defense),
        resistance: resistanceFactor.calculate(input.resistance),
        damageTaken: damageTakenFactor.calculate(input.damageTaken),
        stunDamage: stunDamageFactor.calculate(input.stunDamage),
        anomalyDamageLevel: anomalyDamageLevelFactor.calculate(
          input.anomalyDamageLevel,
        ),
        anomalyDamageBonus: anomalyDamageBonusFactor.calculate(
          input.anomalyDamageBonus,
        ),
        anomalyCritical: anomalyCriticalFactor.calculate(input.anomalyCritical),
      } satisfies FormulaFactorResults<AnomalyDamageFormulaInput>

      const value =
        factorResults.baseDamage *
        factorResults.damageBonus *
        factorResults.anomalyProficiency *
        factorResults.defense *
        factorResults.resistance *
        factorResults.damageTaken *
        factorResults.stunDamage *
        factorResults.anomalyDamageLevel *
        factorResults.anomalyDamageBonus *
        factorResults.anomalyCritical

      return { value, factorResults }
    },
  })

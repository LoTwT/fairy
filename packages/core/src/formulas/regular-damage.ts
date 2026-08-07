import {
  baseDamageFactor,
  type BaseDamageFactorInput,
} from "../factors/base-damage.ts"
import {
  criticalFactor,
  type CriticalFactorInput,
} from "../factors/critical.ts"
import {
  damageBonusFactor,
  type DamageBonusFactorInput,
} from "../factors/damage-bonus.ts"
import {
  damageTakenFactor,
  type DamageTakenFactorInput,
} from "../factors/damage-taken.ts"
import { defenseFactor, type DefenseFactorInput } from "../factors/defense.ts"
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  stunDamageFactor,
  type StunDamageFactorInput,
} from "../factors/stun-damage.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface RegularDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly critical: CriticalFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
}

export const REGULAR_DAMAGE_FORMULA_ID = "regular_damage" as const

export const regularDamageFormula: Formula<RegularDamageFormulaInput> =
  defineFormula<RegularDamageFormulaInput>({
    formulaId: REGULAR_DAMAGE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Regular damage formula input")

      const factorResults = {
        baseDamage: baseDamageFactor.calculate(input.baseDamage),
        damageBonus: damageBonusFactor.calculate(input.damageBonus),
        critical: criticalFactor.calculate(input.critical),
        defense: defenseFactor.calculate(input.defense),
        resistance: resistanceFactor.calculate(input.resistance),
        damageTaken: damageTakenFactor.calculate(input.damageTaken),
        stunDamage: stunDamageFactor.calculate(input.stunDamage),
      } satisfies FormulaFactorResults<RegularDamageFormulaInput>

      const value =
        factorResults.baseDamage *
        factorResults.damageBonus *
        factorResults.critical *
        factorResults.defense *
        factorResults.resistance *
        factorResults.damageTaken *
        factorResults.stunDamage

      return { value, factorResults }
    },
  })

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
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  sheerDamageBonusFactor,
  type SheerDamageBonusFactorInput,
} from "../factors/sheer-damage-bonus.ts"
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

export interface SheerDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly critical: CriticalFactorInput
  readonly sheerDamageBonus: SheerDamageBonusFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
}

export const SHEER_DAMAGE_FORMULA_ID = "sheer_damage" as const

export const sheerDamageFormula: Formula<SheerDamageFormulaInput> =
  defineFormula<SheerDamageFormulaInput>({
    formulaId: SHEER_DAMAGE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Sheer damage formula input")

      const factorResults = {
        baseDamage: baseDamageFactor.calculate(input.baseDamage),
        damageBonus: damageBonusFactor.calculate(input.damageBonus),
        critical: criticalFactor.calculate(input.critical),
        sheerDamageBonus: sheerDamageBonusFactor.calculate(
          input.sheerDamageBonus,
        ),
        resistance: resistanceFactor.calculate(input.resistance),
        damageTaken: damageTakenFactor.calculate(input.damageTaken),
        stunDamage: stunDamageFactor.calculate(input.stunDamage),
      } satisfies FormulaFactorResults<SheerDamageFormulaInput>

      const value =
        factorResults.baseDamage *
        factorResults.damageBonus *
        factorResults.critical *
        factorResults.sheerDamageBonus *
        factorResults.resistance *
        factorResults.damageTaken *
        factorResults.stunDamage

      return { value, factorResults }
    },
  })

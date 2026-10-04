import {
  baseDamageFactor,
  type BaseDamageFactorInput,
} from "../factors/base-damage.ts"
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
  sharpenDamageBonusFactor,
  type SharpenDamageBonusFactorInput,
} from "../factors/sharpen-damage-bonus.ts"
import {
  sharpCriticalFactor,
  type SharpCriticalFactorInput,
} from "../factors/sharp-critical.ts"
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

/**
 * 锐化伤害：锋御以最终防御缩放基础伤害，暴击改按锐暴区结算。
 *
 * 最终锐化 = 基础伤害 × 普通增伤 × 锐化增伤 × 锐暴区 × 防御区 × 抗性区 × 易伤区 × 失衡易伤区
 *
 * 普通暴击乘区、贯穿增伤、直伤决算加成与异常相关乘区不参与本公式；
 * 上游通用特殊乘区按[特殊乘区边界](../../../docs/specs/core/factors/special.md)
 * 不移植，等价于恒等倍率 1。锐暴分支的语义由 StaticDamageResult 的
 * criticalSemantics 具名表达。
 */
export interface SharpenDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: DamageBonusFactorInput
  readonly sharpenDamageBonus: SharpenDamageBonusFactorInput
  readonly sharpCritical: SharpCriticalFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
}

export const SHARPEN_DAMAGE_FORMULA_ID = "sharpen_damage" as const

export const sharpenDamageFormula: Formula<SharpenDamageFormulaInput> =
  defineFormula<SharpenDamageFormulaInput>({
    formulaId: SHARPEN_DAMAGE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Sharpen damage formula input")

      const factorResults = {
        baseDamage: baseDamageFactor.calculate(input.baseDamage),
        damageBonus: damageBonusFactor.calculate(input.damageBonus),
        sharpenDamageBonus: sharpenDamageBonusFactor.calculate(
          input.sharpenDamageBonus,
        ),
        sharpCritical: sharpCriticalFactor.calculate(input.sharpCritical),
        defense: defenseFactor.calculate(input.defense),
        resistance: resistanceFactor.calculate(input.resistance),
        damageTaken: damageTakenFactor.calculate(input.damageTaken),
        stunDamage: stunDamageFactor.calculate(input.stunDamage),
      } satisfies FormulaFactorResults<SharpenDamageFormulaInput>

      const value =
        factorResults.baseDamage *
        factorResults.damageBonus *
        factorResults.sharpenDamageBonus *
        factorResults.sharpCritical *
        factorResults.defense *
        factorResults.resistance *
        factorResults.damageTaken *
        factorResults.stunDamage

      return { value, factorResults }
    },
  })

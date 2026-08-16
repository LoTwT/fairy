import {
  anomalyDamageBonusFactor,
  type AnomalyDamageBonusFactorInput,
} from "../factors/anomaly-damage-bonus.ts"
import {
  anomalyDamageLevelFactor,
  type AnomalyDamageLevelFactorInput,
} from "../factors/anomaly-damage-level.ts"
import {
  anomalyProficiencyFactor,
  type AnomalyProficiencyFactorInput,
} from "../factors/anomaly-proficiency.ts"
import {
  baseDamageFactor,
  type BaseDamageFactorInput,
} from "../factors/base-damage.ts"
import {
  damageTakenFactor,
  type DamageTakenFactorInput,
} from "../factors/damage-taken.ts"
import { defenseFactor, type DefenseFactorInput } from "../factors/defense.ts"
import {
  luminizeMultiplierFactor,
  type LuminizeMultiplierFactorInput,
} from "../factors/luminize-multiplier.ts"
import {
  refringeFactor,
  type RefringeFactorInput,
} from "../factors/refringe.ts"
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  settledDamageBonusFactor,
  type SettledDamageBonusFactorInput,
} from "../factors/settled-damage-bonus.ts"
import {
  stunDamageFactor,
  type StunDamageFactorInput,
} from "../factors/stun-damage.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import {
  assertFiniteResult,
  assertFiniteNumber,
  assertNonArrayObject,
} from "../internal/assert.ts"

const MIN_AGENT_LEVEL = 1
const MAX_AGENT_LEVEL = 60
const SPECIAL_VOIDFLARE_DAMAGE_BONUS_PER_LEVEL = 0.025
const BASE_DAMAGE_BONUS_MULTIPLIER = 1

export interface LuminizeDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: SettledDamageBonusFactorInput
  readonly anomalyProficiency: AnomalyProficiencyFactorInput
  readonly refringe: RefringeFactorInput
  readonly luminizeMultiplier: LuminizeMultiplierFactorInput
  readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
  readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
}

export const LUMINIZE_DAMAGE_FORMULA_ID = "luminize_damage" as const

/** 根据代理人等级计算特殊虚曜使用的已结算增伤区倍率。 */
export function calculateSpecialVoidflareDamageBonusMultiplier(
  agentLevel: number,
): number {
  assertFiniteNumber(agentLevel, "Agent level")

  if (
    !Number.isInteger(agentLevel) ||
    agentLevel < MIN_AGENT_LEVEL ||
    agentLevel > MAX_AGENT_LEVEL
  ) {
    throw new RangeError(
      `Agent level must be an integer from ${MIN_AGENT_LEVEL} to ${MAX_AGENT_LEVEL}`,
    )
  }

  const damageBonusMultiplier =
    BASE_DAMAGE_BONUS_MULTIPLIER +
    agentLevel * SPECIAL_VOIDFLARE_DAMAGE_BONUS_PER_LEVEL

  assertFiniteResult(
    damageBonusMultiplier,
    "Special Voidflare damage bonus multiplier",
  )

  return damageBonusMultiplier
}

export const luminizeDamageFormula: Formula<LuminizeDamageFormulaInput> =
  defineFormula<LuminizeDamageFormulaInput>({
    formulaId: LUMINIZE_DAMAGE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Luminize damage formula input")

      const factorResults = {
        baseDamage: baseDamageFactor.calculate(input.baseDamage),
        damageBonus: settledDamageBonusFactor.calculate(input.damageBonus),
        anomalyProficiency: anomalyProficiencyFactor.calculate(
          input.anomalyProficiency,
        ),
        refringe: refringeFactor.calculate(input.refringe),
        luminizeMultiplier: luminizeMultiplierFactor.calculate(
          input.luminizeMultiplier,
        ),
        anomalyDamageBonus: anomalyDamageBonusFactor.calculate(
          input.anomalyDamageBonus,
        ),
        defense: defenseFactor.calculate(input.defense),
        resistance: resistanceFactor.calculate(input.resistance),
        damageTaken: damageTakenFactor.calculate(input.damageTaken),
        stunDamage: stunDamageFactor.calculate(input.stunDamage),
        anomalyDamageLevel: anomalyDamageLevelFactor.calculate(
          input.anomalyDamageLevel,
        ),
      } satisfies FormulaFactorResults<LuminizeDamageFormulaInput>

      const value =
        factorResults.baseDamage *
        factorResults.damageBonus *
        factorResults.anomalyProficiency *
        factorResults.refringe *
        factorResults.luminizeMultiplier *
        factorResults.anomalyDamageBonus *
        factorResults.defense *
        factorResults.resistance *
        factorResults.damageTaken *
        factorResults.stunDamage *
        factorResults.anomalyDamageLevel

      return { value, factorResults }
    },
  })

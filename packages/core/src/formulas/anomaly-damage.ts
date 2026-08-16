import {
  baseDamageFactor,
  type BaseDamageFactorInput,
} from "../factors/base-damage.ts"
import {
  settledDamageBonusFactor,
  type SettledDamageBonusFactorInput,
} from "../factors/settled-damage-bonus.ts"
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
  refringeFactor,
  type RefringeFactorInput,
} from "../factors/refringe.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import {
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface AnomalyDamageFormulaInput {
  readonly baseDamage: BaseDamageFactorInput
  readonly damageBonus: SettledDamageBonusFactorInput
  readonly anomalyProficiency: AnomalyProficiencyFactorInput
  readonly defense: DefenseFactorInput
  readonly resistance: ResistanceFactorInput
  readonly damageTaken: DamageTakenFactorInput
  readonly stunDamage: StunDamageFactorInput
  readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
  readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
  readonly anomalyCritical: AnomalyCriticalFactorInput
  readonly refringe: RefringeFactorInput
}

export type DisorderSourceAttribute =
  | "fire"
  | "electric"
  | "ether"
  | "ice"
  | "physical"
  | "auric_ink"
  | "frost"

export interface CalculateStandardDisorderDamageMultiplierParams {
  readonly originalAnomalyAttribute: DisorderSourceAttribute
  readonly remainingAnomalyDurationInSeconds: number
}

export type VortexDamageMultiplierProfile =
  | "corruption"
  | "shock"
  | "burn"
  | "assault"
  | "frostbite"
  | "frost"

export interface CalculateStandardVortexDamageMultiplierParams {
  readonly vortexDamageMultiplierProfile: VortexDamageMultiplierProfile
  readonly sourceAnomalyDurationInSeconds: number
}

export const ANOMALY_DAMAGE_FORMULA_ID = "anomaly_damage" as const

/** 根据原异常属性与剩余持续时间计算普通紊乱的标准伤害倍率。 */
export function calculateStandardDisorderDamageMultiplier(
  params: CalculateStandardDisorderDamageMultiplierParams,
): number {
  assertNonArrayObject(
    params,
    "calculateStandardDisorderDamageMultiplier params",
  )

  const { originalAnomalyAttribute, remainingAnomalyDurationInSeconds } = params

  if (typeof originalAnomalyAttribute !== "string") {
    throw new TypeError("Original anomaly attribute must be a string")
  }

  assertNonNegativeFiniteNumber(
    remainingAnomalyDurationInSeconds,
    "Remaining anomaly duration in seconds",
  )

  let damageMultiplier: number

  switch (originalAnomalyAttribute) {
    case "fire":
      damageMultiplier =
        4.5 + Math.floor(remainingAnomalyDurationInSeconds / 0.5) * 0.5
      break
    case "electric":
      damageMultiplier =
        4.5 + Math.floor(remainingAnomalyDurationInSeconds) * 1.25
      break
    case "ether":
      damageMultiplier =
        4.5 + Math.floor(remainingAnomalyDurationInSeconds / 0.5) * 0.625
      break
    case "ice":
      damageMultiplier =
        4.5 + Math.floor(remainingAnomalyDurationInSeconds) * 0.075
      break
    case "physical":
      damageMultiplier =
        4.5 + Math.floor(remainingAnomalyDurationInSeconds) * 0.075
      break
    case "auric_ink":
      damageMultiplier =
        4.5 + Math.floor(remainingAnomalyDurationInSeconds / 0.5) * 0.625
      break
    case "frost":
      damageMultiplier =
        6 + Math.floor(remainingAnomalyDurationInSeconds) * 0.75
      break
    default:
      throw new RangeError(
        `Unsupported original anomaly attribute: ${originalAnomalyAttribute}`,
      )
  }

  assertFiniteResult(damageMultiplier, "Standard Disorder damage multiplier")

  return damageMultiplier
}

/** 根据被乱流消耗的非风异常及其持续时间计算标准乱流伤害倍率。 */
export function calculateStandardVortexDamageMultiplier(
  params: CalculateStandardVortexDamageMultiplierParams,
): number {
  assertNonArrayObject(params, "calculateStandardVortexDamageMultiplier params")

  const { vortexDamageMultiplierProfile, sourceAnomalyDurationInSeconds } =
    params

  if (typeof vortexDamageMultiplierProfile !== "string") {
    throw new TypeError("Vortex damage multiplier profile must be a string")
  }

  assertNonNegativeFiniteNumber(
    sourceAnomalyDurationInSeconds,
    "Source anomaly duration in seconds",
  )

  let damageMultiplier: number

  switch (vortexDamageMultiplierProfile) {
    case "corruption":
      damageMultiplier = 6.5 + 0.625 * sourceAnomalyDurationInSeconds * 2
      break
    case "shock":
      damageMultiplier = 6.5 + 1.25 * sourceAnomalyDurationInSeconds
      break
    case "burn":
      damageMultiplier = 9 + 0.5 * sourceAnomalyDurationInSeconds * 2
      break
    case "assault":
      damageMultiplier = 8 + 0.075 * sourceAnomalyDurationInSeconds
      break
    case "frostbite":
      damageMultiplier = 13 + 0.075 * sourceAnomalyDurationInSeconds
      break
    case "frost":
      damageMultiplier = 0 + 0.75 * sourceAnomalyDurationInSeconds
      break
    default:
      throw new RangeError(
        `Unsupported Vortex damage multiplier profile: ${vortexDamageMultiplierProfile}`,
      )
  }

  assertFiniteResult(damageMultiplier, "Standard Vortex damage multiplier")

  return damageMultiplier
}

export const anomalyDamageFormula: Formula<AnomalyDamageFormulaInput> =
  defineFormula<AnomalyDamageFormulaInput>({
    formulaId: ANOMALY_DAMAGE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Anomaly damage formula input")

      const factorResults = {
        baseDamage: baseDamageFactor.calculate(input.baseDamage),
        damageBonus: settledDamageBonusFactor.calculate(input.damageBonus),
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
        refringe: refringeFactor.calculate(input.refringe),
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
        factorResults.anomalyCritical *
        factorResults.refringe

      return { value, factorResults }
    },
  })

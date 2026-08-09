export { defineFactor } from "./factor.ts"
export type { Factor, FactorParams, FactorResult } from "./factor.ts"
export { defineFormula } from "./formula.ts"
export type {
  Formula,
  FormulaFactorResults,
  FormulaParams,
  FormulaResult,
} from "./formula.ts"
export {
  BASE_DAMAGE_FACTOR_ID,
  baseDamageFactor,
} from "./factors/base-damage.ts"
export type {
  BaseDamageFactorInput,
  BaseDamageFactorInputItem,
} from "./factors/base-damage.ts"
export {
  DAMAGE_BONUS_FACTOR_ID,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  damageBonusFactor,
} from "./factors/damage-bonus.ts"
export type { DamageBonusFactorInput } from "./factors/damage-bonus.ts"
export {
  CRITICAL_FACTOR_ID,
  DEFAULT_CRITICAL_FACTOR_INPUT,
  criticalFactor,
} from "./factors/critical.ts"
export type { CriticalFactorInput } from "./factors/critical.ts"
export {
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFENSE_FACTOR_ID,
  defenseFactor,
} from "./factors/defense.ts"
export type {
  CalculateTargetBaseDefenseParams,
  CalculateTargetEffectiveDefenseParams,
  DefenseFactorInput,
} from "./factors/defense.ts"
export {
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  RESISTANCE_FACTOR_ID,
  resistanceFactor,
} from "./factors/resistance.ts"
export type { ResistanceFactorInput } from "./factors/resistance.ts"
export {
  DAMAGE_TAKEN_FACTOR_ID,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  damageTakenFactor,
} from "./factors/damage-taken.ts"
export type { DamageTakenFactorInput } from "./factors/damage-taken.ts"
export {
  DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  SHEER_DAMAGE_BONUS_FACTOR_ID,
  sheerDamageBonusFactor,
} from "./factors/sheer-damage-bonus.ts"
export type { SheerDamageBonusFactorInput } from "./factors/sheer-damage-bonus.ts"
export {
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  STUN_DAMAGE_FACTOR_ID,
  stunDamageFactor,
} from "./factors/stun-damage.ts"
export type { StunDamageFactorInput } from "./factors/stun-damage.ts"
export {
  ANOMALY_PROFICIENCY_FACTOR_ID,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  anomalyProficiencyFactor,
} from "./factors/anomaly-proficiency.ts"
export type { AnomalyProficiencyFactorInput } from "./factors/anomaly-proficiency.ts"
export {
  ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  anomalyDamageLevelFactor,
} from "./factors/anomaly-damage-level.ts"
export type { AnomalyDamageLevelFactorInput } from "./factors/anomaly-damage-level.ts"
export {
  ANOMALY_DAMAGE_BONUS_FACTOR_ID,
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  anomalyDamageBonusFactor,
} from "./factors/anomaly-damage-bonus.ts"
export type { AnomalyDamageBonusFactorInput } from "./factors/anomaly-damage-bonus.ts"
export {
  ANOMALY_CRITICAL_FACTOR_ID,
  DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  anomalyCriticalFactor,
} from "./factors/anomaly-critical.ts"
export type { AnomalyCriticalFactorInput } from "./factors/anomaly-critical.ts"
export {
  REGULAR_DAMAGE_FORMULA_ID,
  regularDamageFormula,
} from "./formulas/regular-damage.ts"
export type { RegularDamageFormulaInput } from "./formulas/regular-damage.ts"
export {
  SHEER_DAMAGE_FORMULA_ID,
  sheerDamageFormula,
} from "./formulas/sheer-damage.ts"
export type { SheerDamageFormulaInput } from "./formulas/sheer-damage.ts"
export {
  ANOMALY_DAMAGE_FORMULA_ID,
  anomalyDamageFormula,
} from "./formulas/anomaly-damage.ts"
export type { AnomalyDamageFormulaInput } from "./formulas/anomaly-damage.ts"
export { calculateFinalStat, calculateInitialStat } from "./stat.ts"
export type {
  CalculateFinalStatParams,
  CalculateInitialStatParams,
} from "./stat.ts"

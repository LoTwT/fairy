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
export { BASE_DAZE_FACTOR_ID, baseDazeFactor } from "./factors/base-daze.ts"
export type {
  BaseDazeFactorInput,
  BaseDazeFactorInputItem,
} from "./factors/base-daze.ts"
export {
  BASE_ENERGY_GENERATION_FACTOR_ID,
  baseEnergyGenerationFactor,
} from "./factors/base-energy-generation.ts"
export type { BaseEnergyGenerationFactorInput } from "./factors/base-energy-generation.ts"
export {
  DEFAULT_ENERGY_GENERATION_RATE_FACTOR_INPUT,
  ENERGY_GENERATION_RATE_FACTOR_ID,
  energyGenerationRateFactor,
} from "./factors/energy-generation-rate.ts"
export type { EnergyGenerationRateFactorInput } from "./factors/energy-generation-rate.ts"
export {
  BASE_ADRENALINE_GENERATION_FACTOR_ID,
  baseAdrenalineGenerationFactor,
} from "./factors/base-adrenaline-generation.ts"
export type { BaseAdrenalineGenerationFactorInput } from "./factors/base-adrenaline-generation.ts"
export {
  ADRENALINE_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ADRENALINE_GENERATION_RATE_FACTOR_INPUT,
  adrenalineGenerationRateFactor,
} from "./factors/adrenaline-generation-rate.ts"
export type { AdrenalineGenerationRateFactorInput } from "./factors/adrenaline-generation-rate.ts"
export {
  BASE_DECIBEL_GENERATION_FACTOR_ID,
  baseDecibelGenerationFactor,
} from "./factors/base-decibel-generation.ts"
export type { BaseDecibelGenerationFactorInput } from "./factors/base-decibel-generation.ts"
export {
  DECIBEL_GENERATION_RATE_FACTOR_ID,
  DEFAULT_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  decibelGenerationRateFactor,
} from "./factors/decibel-generation-rate.ts"
export type { DecibelGenerationRateFactorInput } from "./factors/decibel-generation-rate.ts"
export {
  ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_ID,
  DEFAULT_ACCOMPANYING_DECIBEL_GENERATION_RATE_FACTOR_INPUT,
  accompanyingDecibelGenerationRateFactor,
} from "./factors/accompanying-decibel-generation-rate.ts"
export type { AccompanyingDecibelGenerationRateFactorInput } from "./factors/accompanying-decibel-generation-rate.ts"
export {
  BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
  baseMiasmicShieldReductionFactor,
} from "./factors/base-miasmic-shield-reduction.ts"
export type { BaseMiasmicShieldReductionFactorInput } from "./factors/base-miasmic-shield-reduction.ts"
export {
  DEFAULT_MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_INPUT,
  MIASMIC_SHIELD_REDUCTION_RATE_FACTOR_ID,
  miasmicShieldReductionRateFactor,
} from "./factors/miasmic-shield-reduction-rate.ts"
export type { MiasmicShieldReductionRateFactorInput } from "./factors/miasmic-shield-reduction-rate.ts"
export {
  DEFAULT_MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_INPUT,
  MIASMIC_SHIELD_REDUCTION_TAKEN_RATE_FACTOR_ID,
  miasmicShieldReductionTakenRateFactor,
} from "./factors/miasmic-shield-reduction-taken-rate.ts"
export type { MiasmicShieldReductionTakenRateFactorInput } from "./factors/miasmic-shield-reduction-taken-rate.ts"
export {
  DAMAGE_BONUS_FACTOR_ID,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  damageBonusFactor,
} from "./factors/damage-bonus.ts"
export type { DamageBonusFactorInput } from "./factors/damage-bonus.ts"
export {
  DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
  SETTLED_DAMAGE_BONUS_FACTOR_ID,
  settledDamageBonusFactor,
} from "./factors/settled-damage-bonus.ts"
export type { SettledDamageBonusFactorInput } from "./factors/settled-damage-bonus.ts"
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
  DAZE_DEALT_FACTOR_ID,
  DEFAULT_DAZE_DEALT_FACTOR_INPUT,
  dazeDealtFactor,
} from "./factors/daze-dealt.ts"
export type { DazeDealtFactorInput } from "./factors/daze-dealt.ts"
export {
  DAZE_TAKEN_FACTOR_ID,
  DEFAULT_DAZE_TAKEN_FACTOR_INPUT,
  dazeTakenFactor,
} from "./factors/daze-taken.ts"
export type { DazeTakenFactorInput } from "./factors/daze-taken.ts"
export {
  DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT,
  DISORDER_DAZE_DEALT_FACTOR_ID,
  disorderDazeDealtFactor,
} from "./factors/disorder-daze-dealt.ts"
export type { DisorderDazeDealtFactorInput } from "./factors/disorder-daze-dealt.ts"
export {
  DISORDER_DAZE_LEVEL_FACTOR_ID,
  disorderDazeLevelFactor,
} from "./factors/disorder-daze-level.ts"
export type { DisorderDazeLevelFactorInput } from "./factors/disorder-daze-level.ts"
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
  BASE_ANOMALY_BUILDUP_FACTOR_ID,
  baseAnomalyBuildupFactor,
} from "./factors/base-anomaly-buildup.ts"
export type { BaseAnomalyBuildupFactorInput } from "./factors/base-anomaly-buildup.ts"
export {
  ANOMALY_MASTERY_FACTOR_ID,
  DEFAULT_ANOMALY_MASTERY_FACTOR_INPUT,
  anomalyMasteryFactor,
} from "./factors/anomaly-mastery.ts"
export type { AnomalyMasteryFactorInput } from "./factors/anomaly-mastery.ts"
export {
  ANOMALY_BUILDUP_RATE_FACTOR_ID,
  DEFAULT_ANOMALY_BUILDUP_RATE_FACTOR_INPUT,
  anomalyBuildupRateFactor,
} from "./factors/anomaly-buildup-rate.ts"
export type { AnomalyBuildupRateFactorInput } from "./factors/anomaly-buildup-rate.ts"
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
  DEFAULT_REFRINGE_FACTOR_INPUT,
  REFRINGE_FACTOR_ID,
  calculateRefringeMultiplier,
  refringeFactor,
} from "./factors/refringe.ts"
export type {
  CalculateRefringeMultiplierParams,
  RefringeFactorInput,
} from "./factors/refringe.ts"
export {
  LUMINIZE_MULTIPLIER_FACTOR_ID,
  luminizeMultiplierFactor,
} from "./factors/luminize-multiplier.ts"
export type { LuminizeMultiplierFactorInput } from "./factors/luminize-multiplier.ts"
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
  calculateStandardDisorderDamageMultiplier,
  calculateStandardVortexDamageMultiplier,
} from "./formulas/anomaly-damage.ts"
export type {
  AnomalyDamageFormulaInput,
  CalculateStandardDisorderDamageMultiplierParams,
  CalculateStandardVortexDamageMultiplierParams,
  DisorderSourceAttribute,
  VortexDamageMultiplierProfile,
} from "./formulas/anomaly-damage.ts"
export {
  LUMINIZE_DAMAGE_FORMULA_ID,
  calculateSpecialVoidflareDamageBonusMultiplier,
  luminizeDamageFormula,
} from "./formulas/luminize-damage.ts"
export type { LuminizeDamageFormulaInput } from "./formulas/luminize-damage.ts"
export {
  ANOMALY_BUILDUP_FORMULA_ID,
  anomalyBuildupFormula,
  calculateAnomalyTriggerThreshold,
} from "./formulas/anomaly-buildup.ts"
export type {
  AnomalyBuildupFormulaInput,
  AnomalyTriggerThresholdKind,
  AnomalyTriggerThresholdTier,
  CalculateAnomalyTriggerThresholdParams,
} from "./formulas/anomaly-buildup.ts"
export {
  REGULAR_DAZE_FORMULA_ID,
  regularDazeFormula,
} from "./formulas/regular-daze.ts"
export type { RegularDazeFormulaInput } from "./formulas/regular-daze.ts"
export {
  DEFAULT_DISORDER_DAZE_MULTIPLIER,
  DISORDER_DAZE_FORMULA_ID,
  disorderDazeFormula,
} from "./formulas/disorder-daze.ts"
export type { DisorderDazeFormulaInput } from "./formulas/disorder-daze.ts"
export {
  ENERGY_GENERATION_FORMULA_ID,
  energyGenerationFormula,
} from "./formulas/energy-generation.ts"
export type { EnergyGenerationFormulaInput } from "./formulas/energy-generation.ts"
export {
  ADRENALINE_GENERATION_FORMULA_ID,
  adrenalineGenerationFormula,
} from "./formulas/adrenaline-generation.ts"
export type { AdrenalineGenerationFormulaInput } from "./formulas/adrenaline-generation.ts"
export {
  DECIBEL_GENERATION_FORMULA_ID,
  decibelGenerationFormula,
} from "./formulas/decibel-generation.ts"
export type { DecibelGenerationFormulaInput } from "./formulas/decibel-generation.ts"
export {
  MIASMIC_SHIELD_REDUCTION_FORMULA_ID,
  miasmicShieldReductionFormula,
} from "./formulas/miasmic-shield-reduction.ts"
export type { MiasmicShieldReductionFormulaInput } from "./formulas/miasmic-shield-reduction.ts"
export { calculateTotalDisplayedDamage } from "./damage.ts"
export { calculateDisplayedDazePercentage } from "./daze.ts"
export type { CalculateDisplayedDazePercentageParams } from "./daze.ts"
export { calculateVirtualAgentSnapshot } from "./anomaly.ts"
export type {
  VirtualAgentContributionRecord,
  VirtualAgentSnapshot,
} from "./anomaly.ts"
export { calculateFinalStat, calculateInitialStat } from "./stat.ts"
export type {
  CalculateFinalStatParams,
  CalculateInitialStatParams,
} from "./stat.ts"

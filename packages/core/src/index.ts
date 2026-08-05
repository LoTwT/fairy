export { defineFactor } from "./factor.ts"
export type { Factor, FactorParams, FactorResult } from "./factor.ts"
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
  damageBonusFactor,
} from "./factors/damage-bonus.ts"
export type { DamageBonusFactorInput } from "./factors/damage-bonus.ts"
export { CRITICAL_FACTOR_ID, criticalFactor } from "./factors/critical.ts"
export type { CriticalFactorInput } from "./factors/critical.ts"
export {
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  DEFENSE_FACTOR_ID,
  defenseFactor,
} from "./factors/defense.ts"
export type {
  CalculateTargetBaseDefenseParams,
  CalculateTargetEffectiveDefenseParams,
  DefenseFactorInput,
} from "./factors/defense.ts"
export { RESISTANCE_FACTOR_ID, resistanceFactor } from "./factors/resistance.ts"
export type { ResistanceFactorInput } from "./factors/resistance.ts"
export {
  DAMAGE_TAKEN_FACTOR_ID,
  damageTakenFactor,
} from "./factors/damage-taken.ts"
export type { DamageTakenFactorInput } from "./factors/damage-taken.ts"
export {
  STUN_DAMAGE_FACTOR_ID,
  stunDamageFactor,
} from "./factors/stun-damage.ts"
export type { StunDamageFactorInput } from "./factors/stun-damage.ts"
export { calculateFinalStat, calculateInitialStat } from "./stat.ts"
export type {
  CalculateFinalStatParams,
  CalculateInitialStatParams,
} from "./stat.ts"

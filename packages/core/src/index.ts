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
export { calculateFinalStat, calculateInitialStat } from "./stat.ts"
export type {
  CalculateFinalStatParams,
  CalculateInitialStatParams,
} from "./stat.ts"

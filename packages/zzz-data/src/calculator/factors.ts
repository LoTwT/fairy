// Shared multiplier factor functions — each exported independently for composability
// Based on: https://ngabbs.com/read.php?tid=44468012

import type {
  AnomalyDamageParams,
  AnomalyType,
  AttackerLevel,
  CritParams,
  DazeVulnerabilityParams,
  DefenseParams,
  NormalDamageParams,
  ResistanceParams,
  SheerDamageParams,
  VulnerabilityParams,
} from "./types.js"

// ---------- Attacker level base lookup table ----------

/** Level base values for the attacker (攻击方等级基数). Levels 60+ all use 794. */
export const ATTACKER_LEVEL_BASE: Readonly<Record<number, number>> = {
  1: 50,
  2: 54,
  3: 58,
  4: 62,
  5: 66,
  6: 71,
  7: 76,
  8: 82,
  9: 88,
  10: 94,
  11: 100,
  12: 107,
  13: 114,
  14: 121,
  15: 129,
  16: 137,
  17: 145,
  18: 153,
  19: 162,
  20: 172,
  21: 181,
  22: 191,
  23: 201,
  24: 211,
  25: 222,
  26: 233,
  27: 245,
  28: 256,
  29: 268,
  30: 281,
  31: 293,
  32: 306,
  33: 319,
  34: 333,
  35: 347,
  36: 361,
  37: 375,
  38: 390,
  39: 405,
  40: 421,
  41: 436,
  42: 452,
  43: 469,
  44: 485,
  45: 502,
  46: 519,
  47: 537,
  48: 555,
  49: 573,
  50: 592,
  51: 610,
  52: 629,
  53: 649,
  54: 669,
  55: 689,
  56: 709,
  57: 730,
  58: 751,
  59: 772,
  60: 794,
}

/**
 * Returns the attacker level base for the given level.
 * Levels above 60 return 794.
 */
export function getAttackerLevelBase(
  level: AttackerLevel,
): DefenseParams["attackerLevelBase"] {
  const clamped = Math.max(1, Math.min(level, 60))
  return ATTACKER_LEVEL_BASE[clamped] ?? 794
}

// ---------- Defense multiplier ----------

/**
 * 防御区
 * = attackerLevelBase / (effectiveDefense + attackerLevelBase)
 *
 * effectiveDefense = defenderBaseDefense × (1 + defenseBonus - defenseReduction)
 *                     × (1 - penetrationRate) - penetrationValue  [clamped ≥ 0]
 */
export function calcDefenseMultiplier(params: DefenseParams): number {
  const {
    attackerLevelBase,
    defenderBaseDefense,
    defenseBonus,
    defenseReduction,
    penetrationRate,
    penetrationValue,
  } = params
  const defenderDefense =
    defenderBaseDefense * (1 + defenseBonus - defenseReduction)
  const effectiveDefense = Math.max(
    0,
    defenderDefense * (1 - penetrationRate) - penetrationValue,
  )
  return attackerLevelBase / (effectiveDefense + attackerLevelBase)
}

// ---------- Resistance multiplier ----------

/**
 * 抗性区
 * = 1 - defenderResistance + resistanceReduction + ignoreResistance
 * Clamped to [0, 2].
 */
export function calcResistanceMultiplier(params: ResistanceParams): number {
  const { defenderResistance, resistanceReduction, ignoreResistance } = params
  const value = 1 - defenderResistance + resistanceReduction + ignoreResistance
  return Math.min(2, Math.max(0, value))
}

// ---------- Vulnerability multiplier ----------

/**
 * 减易伤区
 * = 1 + vulnerabilityBonus - damageReduction
 * Clamped to [0.2, 2].
 */
export function calcVulnerabilityMultiplier(
  params: VulnerabilityParams,
): number {
  const { vulnerabilityBonus, damageReduction } = params
  const value = 1 + vulnerabilityBonus - damageReduction
  return Math.min(2, Math.max(0.2, value))
}

// ---------- Daze vulnerability multiplier ----------

/**
 * 失衡易伤区
 * = 1 + stunVulnerability  (when stunned, clamped to [0.2, 5])
 * = 1 + nonStunVulnerability  (when not stunned, clamped to [1, 3])
 */
export function calcDazeVulnerabilityMultiplier(
  params: DazeVulnerabilityParams,
): number {
  const { isStunned, stunVulnerability, nonStunVulnerability } = params
  if (isStunned) {
    return Math.min(5, Math.max(0.2, 1 + stunVulnerability))
  }
  return Math.min(3, Math.max(1, 1 + nonStunVulnerability))
}

// ---------- Crit multiplier ----------

/**
 * 暴击区
 * = 1 + critDamage (crit), 1 (no crit)
 * critRate clamped to [0, 1], critDamage clamped to [0, 5].
 */
export function calcCritMultiplier(
  params: CritParams,
  isCrit: boolean,
): number {
  if (!isCrit) return 1
  const critDamage = Math.min(5, Math.max(0, params.critDamage))
  return 1 + critDamage
}

/**
 * Expected crit multiplier = 1 + critRate × critDamage
 */
export function calcExpectedCritMultiplier(params: CritParams): number {
  const critRate = Math.min(1, Math.max(0, params.critRate))
  const critDamage = Math.min(5, Math.max(0, params.critDamage))
  return 1 + critRate * critDamage
}

// ---------- Bonus damage multiplier ----------

/**
 * 增伤区
 * = 1 + bonusDamageSum
 * Clamped to [0, 6] per spec, but we clamp at [0, ∞) in practice
 * (engine enforces the cap, not this function).
 */
export function calcBonusMultiplier(
  bonusDamageSum: NormalDamageParams["bonusDamageSum"],
): number {
  return Math.max(0, 1 + bonusDamageSum)
}

// ---------- Sheer damage bonus multiplier ----------

/**
 * 贯穿增伤区
 * = 1 + sheerBonusSum
 * Clamped to [0.2, 9].
 */
export function calcSheerBonusMultiplier(
  sheerBonusSum: SheerDamageParams["sheerBonusSum"],
): number {
  return Math.min(9, Math.max(0.2, 1 + sheerBonusSum))
}

// ---------- Anomaly proficiency multiplier ----------

/**
 * 异常精通区
 * = floor(anomalyProficiency) / 100
 * Clamped to [0, 10].
 */
export function calcAnomalyProficiencyMultiplier(
  anomalyProficiency: AnomalyDamageParams["virtualAgentAnomalyProficiency"],
): number {
  const floored = Math.floor(anomalyProficiency)
  return Math.min(10, Math.max(0, floored / 100))
}

// ---------- Damage level multiplier ----------

/**
 * 伤害等级区
 * = trunc(1 + (level - 1) / 59, 4)
 * where trunc(x, 4) truncates to 4 decimal places.
 */
export function calcDamageLevelMultiplier(
  level: AnomalyDamageParams["virtualAgentLevel"],
): number {
  const raw = 1 + (level - 1) / 59
  return Math.trunc(raw * 10000) / 10000
}

// ---------- Anomaly bonus multiplier ----------

/**
 * 异常增伤区
 * = 1 + anomalyBonusDamageSum
 * Clamped to [0, 3].
 */
export function calcAnomalyBonusMultiplier(
  anomalyBonusDamageSum: AnomalyDamageParams["anomalyBonusDamageSum"],
): number {
  return Math.min(3, Math.max(0, 1 + anomalyBonusDamageSum))
}

// ---------- Anomaly crit multiplier ----------

/**
 * 异常暴击区 (replaces normal crit for anomaly damage)
 * = 1 + anomalyCritDamage (crit), 1 (no crit)
 * Clamped to [1, 3].
 */
export function calcAnomalyCritMultiplier(
  anomalyCritDamage: AnomalyDamageParams["anomalyCritDamage"],
  isCrit: boolean,
): number {
  if (!isCrit) return 1
  return Math.min(3, Math.max(1, 1 + anomalyCritDamage))
}

/**
 * Expected anomaly crit multiplier = 1 + anomalyCritRate × anomalyCritDamage
 * anomalyCritRate clamped to [0, 1]; anomalyCritDamage clamped to [0, 2] (matching [1, 3] crit range).
 */
export function calcExpectedAnomalyCritMultiplier(
  anomalyCritRate: number,
  anomalyCritDamage: number,
): number {
  const rate = Math.min(1, Math.max(0, anomalyCritRate))
  const damage = Math.min(2, Math.max(0, anomalyCritDamage))
  return 1 + rate * damage
}

// ---------- Disorder (紊乱) damage multiplier formula ----------

/**
 * Returns the disorder damage multiplier as a decimal for a given anomaly type and remaining time T.
 *
 * Formula per anomaly type:
 * - fire:     450% + floor(T / 0.5) × 50%
 * - electric: 450% + floor(T) × 125%
 * - ether:    450% + floor(T / 0.5) × 62.5%
 * - ice:      450% + floor(T) × 7.5%
 * - physical: 450% + floor(T) × 7.5%
 * - auricInk: 450% + floor(T / 0.5) × 62.5%
 * - frost:    600% + floor(T) × 75%   (initial duration 20s)
 */
export function calcDisorderDamageMultiplier(
  anomalyType: AnomalyType,
  remainingTime: number,
): number {
  const t = Math.max(0, remainingTime)
  switch (anomalyType) {
    case "fire":
      return 4.5 + Math.floor(t / 0.5) * 0.5
    case "electric":
      return 4.5 + Math.floor(t) * 1.25
    case "ether":
      return 4.5 + Math.floor(t / 0.5) * 0.625
    case "ice":
      return 4.5 + Math.floor(t) * 0.075
    case "physical":
      return 4.5 + Math.floor(t) * 0.075
    case "auricInk":
      return 4.5 + Math.floor(t / 0.5) * 0.625
    case "frost":
      return 6.0 + Math.floor(t) * 0.75
  }
}

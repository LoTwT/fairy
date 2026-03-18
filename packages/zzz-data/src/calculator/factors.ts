import type {
  CritParams,
  DazeVulnerabilityParams,
  DefenseParams,
  ResistanceParams,
  VulnerabilityParams,
} from "./types.js"

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function calcBaseDamage(
  attributeValue: number,
  multipliers: readonly number[],
): number {
  return attributeValue * multipliers.reduce((sum, value) => sum + value, 0)
}

export function getAttackerLevelBase(level: number): number {
  const clampedLevel = clamp(Math.trunc(level), 1, 60)
  return ATTACKER_LEVEL_BASE[clampedLevel] ?? ATTACKER_LEVEL_BASE[60]
}

export function calcBonusMultiplier(sum: number): number {
  return clamp(1 + sum, 0, 6)
}

export function calcCritMultiplier(
  params: CritParams,
  isCrit: boolean,
): number {
  if (!isCrit) {
    return 1
  }

  return 1 + clamp(params.critDamage, 0, 5)
}

export function calcExpectedCritMultiplier(params: CritParams): number {
  const critRate = clamp(params.critRate, 0, 1)
  const critDamage = clamp(params.critDamage, 0, 5)
  return 1 + critRate * critDamage
}

export function calcDefenseMultiplier(params: DefenseParams): number {
  const defenderDefense =
    params.defenderBaseDefense *
    (1 + params.defenseBonus - params.defenseReduction)
  const effectiveDefense = Math.max(
    0,
    defenderDefense * (1 - params.penetrationRate) - params.penetrationValue,
  )

  return (
    params.attackerLevelBase / (effectiveDefense + params.attackerLevelBase)
  )
}

export function calcResistanceMultiplier(params: ResistanceParams): number {
  return clamp(
    1 -
      params.defenderResistance +
      params.resistanceReduction +
      params.ignoreResistance,
    0,
    2,
  )
}

export function calcVulnerabilityMultiplier(
  params: VulnerabilityParams,
): number {
  return clamp(1 + params.vulnerabilityBonus - params.damageReduction, 0.2, 2)
}

export function calcDazeVulnerabilityMultiplier(
  params: DazeVulnerabilityParams,
): number {
  if (params.isStunned) {
    return clamp(1 + params.stunVulnerability, 0.2, 5)
  }

  return clamp(1 + params.nonStunVulnerability, 1, 3)
}

export function calcSheerBonusMultiplier(sum: number): number {
  return clamp(1 + sum, 0.2, 9)
}

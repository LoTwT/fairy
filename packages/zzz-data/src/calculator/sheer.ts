// Sheer damage pipeline — 贯穿伤害
// Formula: baseDamage × bonusMultiplier × critMultiplier × sheerBonusMultiplier
//          × resistanceMultiplier × vulnerabilityMultiplier × dazeVulnerabilityMultiplier
//          × specialMultiplier
//
// Key difference from normal damage:
//   - NO defense multiplier (防御区 skipped)
//   - HAS sheer bonus multiplier (贯穿增伤区) instead

import type { DamageResult, SheerDamageParams } from "./types.js"
import {
  calcBonusMultiplier,
  calcCritMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcExpectedCritMultiplier,
  calcResistanceMultiplier,
  calcSheerBonusMultiplier,
  calcVulnerabilityMultiplier,
} from "./factors.js"

function buildResult(
  params: SheerDamageParams,
  critMultiplier: number,
): DamageResult {
  const bonusMultiplier = calcBonusMultiplier(params.bonusDamageSum)
  const sheerBonusMultiplier = calcSheerBonusMultiplier(params.sheerBonusSum)
  const resistanceMultiplier = calcResistanceMultiplier(params.resistance)
  const vulnerabilityMultiplier = calcVulnerabilityMultiplier(
    params.vulnerability,
  )
  const dazeVulnerabilityMultiplier = calcDazeVulnerabilityMultiplier(
    params.dazeVulnerability,
  )
  const specialMultiplier = params.specialMultiplier ?? 1

  const total =
    params.baseDamage *
    bonusMultiplier *
    critMultiplier *
    sheerBonusMultiplier *
    resistanceMultiplier *
    vulnerabilityMultiplier *
    dazeVulnerabilityMultiplier *
    specialMultiplier

  return {
    total,
    breakdown: {
      baseDamage: params.baseDamage,
      bonusMultiplier,
      critMultiplier,
      defenseMultiplier: 1, // N/A — sheer damage skips the defense multiplier
      resistanceMultiplier,
      vulnerabilityMultiplier,
      dazeVulnerabilityMultiplier,
      sheerBonusMultiplier,
      anomalyProficiencyMultiplier: 1,
      damageLevelMultiplier: 1,
      anomalyBonusMultiplier: 1,
      anomalyCritMultiplier: 1,
      specialMultiplier,
    },
  }
}

/**
 * Calculate sheer damage for a crit hit.
 */
export function calcSheerDamageCrit(params: SheerDamageParams): DamageResult {
  return buildResult(params, calcCritMultiplier(params.crit, true))
}

/**
 * Calculate sheer damage for a non-crit hit.
 */
export function calcSheerDamageNoCrit(params: SheerDamageParams): DamageResult {
  return buildResult(params, 1)
}

/**
 * Calculate sheer damage using expected crit multiplier.
 */
export function calcSheerDamage(params: SheerDamageParams): DamageResult {
  return buildResult(params, calcExpectedCritMultiplier(params.crit))
}

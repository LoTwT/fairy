// Normal damage pipeline — 常规伤害
// Formula: baseDamage × bonusMultiplier × critMultiplier × defenseMultiplier
//          × resistanceMultiplier × vulnerabilityMultiplier × dazeVulnerabilityMultiplier
//          × specialMultiplier

import type { DamageResult, NormalDamageParams } from "./types.js"
import {
  calcBonusMultiplier,
  calcCritMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcExpectedCritMultiplier,
  calcResistanceMultiplier,
  calcVulnerabilityMultiplier,
} from "./factors.js"

function buildResult(
  params: NormalDamageParams,
  critMultiplier: number,
): DamageResult {
  const bonusMultiplier = calcBonusMultiplier(params.bonusDamageSum)
  const defenseMultiplier = calcDefenseMultiplier(params.defense)
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
    defenseMultiplier *
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
      defenseMultiplier,
      resistanceMultiplier,
      vulnerabilityMultiplier,
      dazeVulnerabilityMultiplier,
      sheerBonusMultiplier: 1,
      anomalyProficiencyMultiplier: 1,
      damageLevelMultiplier: 1,
      anomalyBonusMultiplier: 1,
      anomalyCritMultiplier: 1,
      specialMultiplier,
    },
  }
}

/**
 * Calculate normal damage for a crit hit.
 */
export function calcNormalDamageCrit(params: NormalDamageParams): DamageResult {
  return buildResult(params, calcCritMultiplier(params.crit, true))
}

/**
 * Calculate normal damage for a non-crit hit.
 */
export function calcNormalDamageNoCrit(
  params: NormalDamageParams,
): DamageResult {
  return buildResult(params, 1)
}

/**
 * Calculate normal damage using the expected crit multiplier (1 + critRate × critDamage).
 * Useful for DPS calculations.
 */
export function calcNormalDamage(params: NormalDamageParams): DamageResult {
  return buildResult(params, calcExpectedCritMultiplier(params.crit))
}

// Disorder damage pipeline — 紊乱伤害
// Same multiplier structure as anomaly damage, but damage multiplier is derived
// from the original anomaly type and its remaining time T.
//
// Disorder damage multiplier formulas (per anomaly type):
//   fire:     450% + floor(T / 0.5) × 50%
//   electric: 450% + floor(T) × 125%
//   ether:    450% + floor(T / 0.5) × 62.5%
//   ice:      450% + floor(T) × 7.5%
//   physical: 450% + floor(T) × 7.5%
//   auricInk: 450% + floor(T / 0.5) × 62.5%
//   frost:    600% + floor(T) × 75%   (initial T = 20s)

import type { DamageResult, DisorderDamageParams } from "./types.js"
import {
  calcAnomalyBonusMultiplier,
  calcAnomalyCritMultiplier,
  calcAnomalyProficiencyMultiplier,
  calcBonusMultiplier,
  calcDamageLevelMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcDisorderDamageMultiplier,
  calcExpectedAnomalyCritMultiplier,
  calcResistanceMultiplier,
  calcVulnerabilityMultiplier,
} from "./factors.js"

function buildResult(
  params: DisorderDamageParams,
  anomalyCritMultiplier: number,
): DamageResult {
  const damageMultiplier =
    calcDisorderDamageMultiplier(params.anomalyType, params.remainingTime) *
    (params.damageMultiplierFactor ?? 1)
  const baseDamage = params.virtualAgentAttack * damageMultiplier
  const bonusMultiplier = calcBonusMultiplier(params.bonusDamageSum)
  const anomalyProficiencyMultiplier = calcAnomalyProficiencyMultiplier(
    params.virtualAgentAnomalyProficiency,
  )
  const defenseMultiplier = calcDefenseMultiplier(params.defense)
  const resistanceMultiplier = calcResistanceMultiplier(params.resistance)
  const vulnerabilityMultiplier = calcVulnerabilityMultiplier(
    params.vulnerability,
  )
  const dazeVulnerabilityMultiplier = calcDazeVulnerabilityMultiplier(
    params.dazeVulnerability,
  )
  const damageLevelMultiplier = calcDamageLevelMultiplier(
    params.virtualAgentLevel,
  )
  const anomalyBonusMultiplier = calcAnomalyBonusMultiplier(
    params.anomalyBonusDamageSum,
  )

  const total =
    baseDamage *
    bonusMultiplier *
    anomalyProficiencyMultiplier *
    defenseMultiplier *
    resistanceMultiplier *
    vulnerabilityMultiplier *
    dazeVulnerabilityMultiplier *
    damageLevelMultiplier *
    anomalyBonusMultiplier *
    anomalyCritMultiplier

  return {
    total,
    breakdown: {
      baseDamage,
      bonusMultiplier,
      critMultiplier: 1,
      defenseMultiplier,
      resistanceMultiplier,
      vulnerabilityMultiplier,
      dazeVulnerabilityMultiplier,
      sheerBonusMultiplier: 1,
      anomalyProficiencyMultiplier,
      damageLevelMultiplier,
      anomalyBonusMultiplier,
      anomalyCritMultiplier,
      specialMultiplier: 1,
    },
  }
}

/**
 * Calculate disorder damage using expected anomaly crit multiplier.
 */
export function calcDisorderDamage(params: DisorderDamageParams): DamageResult {
  const expectedCrit = calcExpectedAnomalyCritMultiplier(
    params.anomalyCritRate,
    params.anomalyCritDamage,
  )
  return buildResult(params, expectedCrit)
}

/**
 * Calculate disorder damage for a crit hit.
 */
export function calcDisorderDamageCrit(
  params: DisorderDamageParams,
): DamageResult {
  return buildResult(
    params,
    calcAnomalyCritMultiplier(params.anomalyCritDamage, true),
  )
}

/**
 * Calculate disorder damage for a non-crit hit.
 */
export function calcDisorderDamageNoCrit(
  params: DisorderDamageParams,
): DamageResult {
  return buildResult(params, 1)
}

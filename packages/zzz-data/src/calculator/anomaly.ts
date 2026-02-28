// Anomaly damage pipeline — 异常伤害
// Formula: baseDamage × bonusMultiplier × anomalyProficiencyMultiplier × defenseMultiplier
//          × resistanceMultiplier × vulnerabilityMultiplier × dazeVulnerabilityMultiplier
//          × damageLevelMultiplier × anomalyBonusMultiplier × anomalyCritMultiplier
//
// Key differences from normal damage:
//   - NO normal crit (异常暴击区 replaces it)
//   - HAS anomaly proficiency multiplier (异常精通区)
//   - HAS damage level multiplier (伤害等级区)
//   - HAS anomaly bonus multiplier (异常增伤区)
//   - baseDamage uses virtual agent's attack × damage multiplier

import type { AnomalyDamageParams, DamageResult } from "./types.js"
import {
  calcAnomalyBonusMultiplier,
  calcAnomalyCritMultiplier,
  calcAnomalyProficiencyMultiplier,
  calcBonusMultiplier,
  calcDamageLevelMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcExpectedAnomalyCritMultiplier,
  calcResistanceMultiplier,
  calcVulnerabilityMultiplier,
} from "./factors.js"

function buildResult(
  params: AnomalyDamageParams,
  anomalyCritMultiplier: number,
): DamageResult {
  const baseDamage = params.virtualAgentAttack * params.damageMultiplier
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
 * Calculate anomaly damage using expected anomaly crit multiplier.
 */
export function calcAnomalyDamage(params: AnomalyDamageParams): DamageResult {
  const expectedCrit = calcExpectedAnomalyCritMultiplier(
    params.anomalyCritRate,
    params.anomalyCritDamage,
  )
  return buildResult(params, expectedCrit)
}

/**
 * Calculate anomaly damage for an anomaly crit hit.
 */
export function calcAnomalyDamageCrit(
  params: AnomalyDamageParams,
): DamageResult {
  return buildResult(
    params,
    calcAnomalyCritMultiplier(params.anomalyCritDamage, true),
  )
}

/**
 * Calculate anomaly damage for a non-crit anomaly hit.
 */
export function calcAnomalyDamageNoCrit(
  params: AnomalyDamageParams,
): DamageResult {
  return buildResult(params, 1)
}

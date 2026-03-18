export interface CritParams {
  critRate: number
  critDamage: number
}

export interface DefenseParams {
  attackerLevel: number
  defenderBaseDefense: number
  defenseBonus: number
  defenseReduction: number
  penetrationRate: number
  penetrationValue: number
}

export interface ResistanceParams {
  defenderResistance: number
  resistanceReduction: number
  ignoreResistance: number
}

export interface VulnerabilityParams {
  vulnerabilityBonus: number
  damageReduction: number
}

export interface DazeVulnerabilityParams {
  isStunned: boolean
  stunVulnerability: number
  nonStunVulnerability: number
}

export interface ResolvedNormalDamageInput {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  defenseMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  specialMultiplier?: number
}

export interface ResolvedSheerDamageInput {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  sheerBonusMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  specialMultiplier?: number
}

export interface DamageBreakdown {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  defenseMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  sheerBonusMultiplier: number
  specialMultiplier: number
}

export interface DamageResult {
  total: number
  breakdown: DamageBreakdown
}

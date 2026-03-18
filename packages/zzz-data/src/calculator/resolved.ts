import type {
  DamageResult,
  ResolvedNormalDamageInput,
  ResolvedSheerDamageInput,
} from "./types.js"

export function calcResolvedNormalDamage(
  input: ResolvedNormalDamageInput,
): DamageResult {
  const specialMultiplier = input.specialMultiplier ?? 1
  const total =
    input.baseDamage *
    input.bonusMultiplier *
    input.critMultiplier *
    input.defenseMultiplier *
    input.resistanceMultiplier *
    input.vulnerabilityMultiplier *
    input.dazeVulnerabilityMultiplier *
    specialMultiplier

  return {
    total,
    breakdown: {
      baseDamage: input.baseDamage,
      bonusMultiplier: input.bonusMultiplier,
      critMultiplier: input.critMultiplier,
      defenseMultiplier: input.defenseMultiplier,
      resistanceMultiplier: input.resistanceMultiplier,
      vulnerabilityMultiplier: input.vulnerabilityMultiplier,
      dazeVulnerabilityMultiplier: input.dazeVulnerabilityMultiplier,
      sheerBonusMultiplier: 1,
      specialMultiplier,
    },
  }
}

export function calcResolvedSheerDamage(
  input: ResolvedSheerDamageInput,
): DamageResult {
  const specialMultiplier = input.specialMultiplier ?? 1
  const total =
    input.baseDamage *
    input.bonusMultiplier *
    input.critMultiplier *
    input.sheerBonusMultiplier *
    input.resistanceMultiplier *
    input.vulnerabilityMultiplier *
    input.dazeVulnerabilityMultiplier *
    specialMultiplier

  return {
    total,
    breakdown: {
      baseDamage: input.baseDamage,
      bonusMultiplier: input.bonusMultiplier,
      critMultiplier: input.critMultiplier,
      defenseMultiplier: 1,
      resistanceMultiplier: input.resistanceMultiplier,
      vulnerabilityMultiplier: input.vulnerabilityMultiplier,
      dazeVulnerabilityMultiplier: input.dazeVulnerabilityMultiplier,
      sheerBonusMultiplier: input.sheerBonusMultiplier,
      specialMultiplier,
    },
  }
}

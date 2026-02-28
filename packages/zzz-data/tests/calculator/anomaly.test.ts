import type { AnomalyDamageParams } from "../../src/calculator/index.js"
import { describe, expect, it } from "vitest"
import {
  calcAnomalyDamage,
  calcAnomalyDamageCrit,
  calcAnomalyDamageNoCrit,
} from "../../src/calculator/index.js"

const defaultParams: AnomalyDamageParams = {
  virtualAgentLevel: 60,
  virtualAgentAttack: 1000,
  virtualAgentAnomalyProficiency: 100, // mastery multiplier = 1.0
  damageMultiplier: 1.0,
  bonusDamageSum: 0,
  defense: {
    attackerLevelBase: 794,
    defenderBaseDefense: 952.8,
    defenseBonus: 0,
    defenseReduction: 0,
    penetrationRate: 0,
    penetrationValue: 0,
  },
  resistance: {
    defenderResistance: 0,
    resistanceReduction: 0,
    ignoreResistance: 0,
  },
  vulnerability: { vulnerabilityBonus: 0, damageReduction: 0 },
  dazeVulnerability: {
    isStunned: false,
    stunVulnerability: 0.5,
    nonStunVulnerability: 0,
  },
  anomalyBonusDamageSum: 0,
  anomalyCritRate: 0,
  anomalyCritDamage: 0,
}

describe("calcAnomalyDamage", () => {
  // Level 60: damageLevelMultiplier = 2.0
  // baseDamage = 1000 × 1.0 = 1000
  // total = 1000 × 1 (bonus) × 1 (mastery=100 → 1.0) × 0.4545 (defense)
  //       × 1 (resistance) × 1 (vuln) × 1 (daze) × 2.0 (level) × 1 (anomaly bonus)
  //       × 1 (anomaly crit) ≈ 909
  it("level 60 agent: damageLevelMultiplier = 2.0 doubles base", () => {
    const result = calcAnomalyDamage(defaultParams)
    const defenseMultiplier = 794 / (952.8 + 794)
    const expected =
      1000 * 1.0 * 1.0 * defenseMultiplier * 1 * 1 * 1 * 2.0 * 1 * 1
    expect(result.total).toBeCloseTo(expected, 2)
  })

  it("breakdown has anomaly-specific fields", () => {
    const result = calcAnomalyDamage(defaultParams)
    expect(result.breakdown.anomalyProficiencyMultiplier).toBe(1.0) // mastery=100
    expect(result.breakdown.damageLevelMultiplier).toBe(2.0) // level=60
    expect(result.breakdown.critMultiplier).toBe(1)
    expect(result.breakdown.sheerBonusMultiplier).toBe(1)
  })

  it("level 1 agent: damageLevelMultiplier = 1.0", () => {
    const params: AnomalyDamageParams = {
      ...defaultParams,
      virtualAgentLevel: 1,
    }
    const result = calcAnomalyDamage(params)
    expect(result.breakdown.damageLevelMultiplier).toBe(1.0)
  })

  it("anomaly mastery 200 → multiplier = 2.0", () => {
    const params: AnomalyDamageParams = {
      ...defaultParams,
      virtualAgentAnomalyProficiency: 200,
    }
    const base = calcAnomalyDamage(defaultParams)
    const withMastery = calcAnomalyDamage(params)
    expect(withMastery.total).toBeCloseTo(base.total * 2.0, 5)
  })

  it("500% damage multiplier (灼烧 base): 5x baseDamage", () => {
    const params: AnomalyDamageParams = {
      ...defaultParams,
      damageMultiplier: 5.0,
    }
    const base = calcAnomalyDamage(defaultParams)
    const withMultiplier = calcAnomalyDamage(params)
    expect(withMultiplier.total).toBeCloseTo(base.total * 5.0, 5)
  })

  it("anomaly bonus damage 0.5: 1.5x total", () => {
    const params: AnomalyDamageParams = {
      ...defaultParams,
      anomalyBonusDamageSum: 0.5,
    }
    const base = calcAnomalyDamage(defaultParams)
    const withBonus = calcAnomalyDamage(params)
    expect(withBonus.total).toBeCloseTo(base.total * 1.5, 5)
  })
})

describe("calcAnomalyDamageNoCrit", () => {
  it("no anomaly crit: anomalyCritMultiplier = 1 in breakdown", () => {
    const result = calcAnomalyDamageNoCrit(defaultParams)
    expect(result.breakdown.anomalyCritMultiplier).toBe(1)
  })
})

describe("calcAnomalyDamageCrit", () => {
  it("anomaly crit 100% rate, 50% damage: 1.5x non-crit", () => {
    const critParams: AnomalyDamageParams = {
      ...defaultParams,
      anomalyCritRate: 1.0,
      anomalyCritDamage: 0.5,
    }
    const noCrit = calcAnomalyDamageNoCrit(critParams)
    const crit = calcAnomalyDamageCrit(critParams)
    expect(crit.total).toBeCloseTo(noCrit.total * 1.5, 5)
  })
})

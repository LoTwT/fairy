import type { DisorderDamageParams } from "../../src/calculator/index.js"
import { describe, expect, it } from "vitest"
import {
  calcDisorderDamage,
  calcDisorderDamageCrit,
  calcDisorderDamageNoCrit,
} from "../../src/calculator/index.js"

const sharedParams = {
  virtualAgentLevel: 60,
  virtualAgentAttack: 1000,
  virtualAgentAnomalyProficiency: 100,
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

describe("calcDisorderDamage — fire 灼烧", () => {
  // fire T=10s: multiplier = 450% + 20×50% = 1450% = 14.5
  // baseDamage = 1000 × 14.5 = 14500
  // total = 14500 × 1 (bonus) × 1.0 (mastery=100) × 0.4545 (defense)
  //       × 1 × 1 × 1 × 2.0 (level=60) × 1 × 1
  //       = 14500 × 0.4545 × 2.0 ≈ 13181
  it("fire T=10s: baseDamage = 14500, total includes all multipliers", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "fire",
      remainingTime: 10,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(1000 * 14.5, 2)
    const defenseMultiplier = 794 / (952.8 + 794)
    const expected =
      1000 * 14.5 * 1 * 1.0 * defenseMultiplier * 1 * 1 * 1 * 2.0 * 1 * 1
    expect(result.total).toBeCloseTo(expected, 1)
  })

  it("fire T=0s: baseDamage = 4500 (450%)", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "fire",
      remainingTime: 0,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(1000 * 4.5, 2)
  })
})

describe("calcDisorderDamage — electric 感电", () => {
  // electric T=10s: 450% + 10×125% = 1700% = 17.0
  it("electric T=10s: baseDamage = 17000", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "electric",
      remainingTime: 10,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(1000 * 17.0, 2)
  })
})

describe("calcDisorderDamage — frost 烈霜", () => {
  // frost T=20s: 600% + 20×75% = 2100% = 21.0
  it("frost T=20s: baseDamage = 21000", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "frost",
      remainingTime: 20,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(1000 * 21.0, 2)
  })

  it("frost T=0s: baseDamage = 6000 (600%)", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "frost",
      remainingTime: 0,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(1000 * 6.0, 2)
  })
})

describe("calcDisorderDamage — remainingTime edge cases", () => {
  // T < 0 is clamped to 0, same result as T=0
  it("fire T=-0.3s: clamped to T=0, baseDamage = 4500 (450%)", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "fire",
      remainingTime: -0.3,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(1000 * 4.5, 5)
  })
})

describe("calcDisorderDamage — anomaly crit", () => {
  it("crit hit: 1.5x non-crit when anomalyCritDamage=0.5", () => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      anomalyType: "fire",
      remainingTime: 10,
      anomalyCritRate: 1.0,
      anomalyCritDamage: 0.5,
    }
    const noCrit = calcDisorderDamageNoCrit(params)
    const crit = calcDisorderDamageCrit(params)
    expect(crit.total).toBeCloseTo(noCrit.total * 1.5, 5)
  })
})

describe("calcDisorderDamage — all anomaly types T=10s baseDamage", () => {
  const attack = 1000

  it.each([
    ["fire", 10, 14.5 * attack],
    ["electric", 10, 17.0 * attack],
    ["ether", 10, 17.0 * attack],
    ["ice", 10, 5.25 * attack],
    ["physical", 10, 5.25 * attack],
    ["auricInk", 10, 17.0 * attack],
    ["frost", 20, 21.0 * attack],
  ] as const)("%s T=%ss: baseDamage ≈ %s", (anomalyType, t, expectedBase) => {
    const params: DisorderDamageParams = {
      ...sharedParams,
      virtualAgentAttack: attack,
      anomalyType,
      remainingTime: t,
    }
    const result = calcDisorderDamage(params)
    expect(result.breakdown.baseDamage).toBeCloseTo(expectedBase, 1)
  })
})

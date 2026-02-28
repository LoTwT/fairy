import type { NormalDamageParams } from "../../src/calculator/index.js"
import { describe, expect, it } from "vitest"
import {
  calcNormalDamage,
  calcNormalDamageCrit,
  calcNormalDamageNoCrit,
} from "../../src/calculator/index.js"

const defaultParams: NormalDamageParams = {
  baseDamage: 1000,
  bonusDamageSum: 0,
  crit: { critRate: 0, critDamage: 0.5 },
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
}

describe("calcNormalDamage (expected crit)", () => {
  it("base case: 1000 × 0.4545 (defense) ≈ 454.5", () => {
    const result = calcNormalDamage(defaultParams)
    // 1000 × 1 (bonus) × 1 (crit expect, 0% rate) × 0.4545 (defense) × 1 × 1 × 1 = ~454.5
    expect(result.total).toBeCloseTo(1000 * (794 / (952.8 + 794)), 2)
  })

  it("breakdown has correct keys", () => {
    const result = calcNormalDamage(defaultParams)
    expect(result.breakdown).toHaveProperty("baseDamage")
    expect(result.breakdown).toHaveProperty("bonusMultiplier")
    expect(result.breakdown).toHaveProperty("critMultiplier")
    expect(result.breakdown).toHaveProperty("defenseMultiplier")
    expect(result.breakdown).toHaveProperty("resistanceMultiplier")
    expect(result.breakdown).toHaveProperty("vulnerabilityMultiplier")
    expect(result.breakdown).toHaveProperty("dazeVulnerabilityMultiplier")
    expect(result.breakdown).toHaveProperty("sheerBonusMultiplier")
    expect(result.breakdown).toHaveProperty("anomalyProficiencyMultiplier")
    expect(result.breakdown).toHaveProperty("damageLevelMultiplier")
    expect(result.breakdown).toHaveProperty("anomalyBonusMultiplier")
    expect(result.breakdown).toHaveProperty("anomalyCritMultiplier")
    expect(result.breakdown).toHaveProperty("specialMultiplier")
  })

  it("non-anomaly fields default to 1 in breakdown", () => {
    const result = calcNormalDamage(defaultParams)
    expect(result.breakdown.sheerBonusMultiplier).toBe(1)
    expect(result.breakdown.anomalyProficiencyMultiplier).toBe(1)
    expect(result.breakdown.damageLevelMultiplier).toBe(1)
    expect(result.breakdown.anomalyBonusMultiplier).toBe(1)
    expect(result.breakdown.anomalyCritMultiplier).toBe(1)
    expect(result.breakdown.specialMultiplier).toBe(1)
  })

  it("applies 30% bonus damage correctly", () => {
    const params: NormalDamageParams = { ...defaultParams, bonusDamageSum: 0.3 }
    const base = calcNormalDamage(defaultParams)
    const withBonus = calcNormalDamage(params)
    expect(withBonus.total).toBeCloseTo(base.total * 1.3, 5)
  })

  it("applies weakness resistance (1.2x) correctly", () => {
    const params: NormalDamageParams = {
      ...defaultParams,
      resistance: {
        defenderResistance: -0.2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      },
    }
    const base = calcNormalDamage(defaultParams)
    const withWeakness = calcNormalDamage(params)
    expect(withWeakness.total).toBeCloseTo(base.total * 1.2, 5)
  })

  it("stunned enemy with 50% vulnerability: 1.5x damage", () => {
    const params: NormalDamageParams = {
      ...defaultParams,
      dazeVulnerability: {
        isStunned: true,
        stunVulnerability: 0.5,
        nonStunVulnerability: 0,
      },
    }
    const base = calcNormalDamage(defaultParams)
    const stunned = calcNormalDamage(params)
    expect(stunned.total).toBeCloseTo(base.total * 1.5, 5)
  })

  it("distance falloff special multiplier reduces damage", () => {
    const params: NormalDamageParams = {
      ...defaultParams,
      specialMultiplier: 0.75,
    }
    const base = calcNormalDamage(defaultParams)
    const withFalloff = calcNormalDamage(params)
    expect(withFalloff.total).toBeCloseTo(base.total * 0.75, 5)
  })
})

describe("calcNormalDamageCrit", () => {
  it("crit with 50% critDamage: 1.5x non-crit", () => {
    const critParams: NormalDamageParams = {
      ...defaultParams,
      crit: { critRate: 1, critDamage: 0.5 },
    }
    const noCrit = calcNormalDamageNoCrit(critParams)
    const crit = calcNormalDamageCrit(critParams)
    expect(crit.total).toBeCloseTo(noCrit.total * 1.5, 5)
  })
})

describe("calcNormalDamageNoCrit", () => {
  it("no crit: crit multiplier = 1", () => {
    const result = calcNormalDamageNoCrit(defaultParams)
    expect(result.breakdown.critMultiplier).toBe(1)
  })
})

describe("real game data: 安比 Lv60 普通攻击一段 (Lv16) vs 杜拉罕 Lv70", () => {
  // ATK: 658
  // 技能倍率: 0.312 + 15 × 0.029 = 0.747
  // baseDamage: 658 × 0.747 = 491.526
  // 防御区: 794 / (921.04 + 794) = 794 / 1715.04 ≈ 0.46296
  //   杜拉罕 Lv70 防御 = def(Lv1) 58 / 50 × 794 = 921.04
  // 抗性区: 1 − 0 = 1.0（安比电属性，杜拉罕电抗为 0）
  // 非失衡，无其他增益
  const anbyVsDullahanParams: NormalDamageParams = {
    baseDamage: 658 * (0.312 + 15 * 0.029), // 491.526
    bonusDamageSum: 0,
    crit: { critRate: 0.05, critDamage: 0.5 },
    defense: {
      attackerLevelBase: 794,
      defenderBaseDefense: 921.04,
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
  }

  it("non-crit: ceil = 228", () => {
    const result = calcNormalDamageNoCrit(anbyVsDullahanParams)
    expect(Math.ceil(result.total)).toBe(228)
  })

  it("crit: ceil = 342", () => {
    const result = calcNormalDamageCrit(anbyVsDullahanParams)
    expect(Math.ceil(result.total)).toBe(342)
  })
})

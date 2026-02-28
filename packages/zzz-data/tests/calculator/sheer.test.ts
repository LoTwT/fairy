import type {
  NormalDamageParams,
  SheerDamageParams,
} from "../../src/calculator/index.js"
import { describe, expect, it } from "vitest"
import {
  calcNormalDamage,
  calcSheerDamage,
  calcSheerDamageCrit,
  calcSheerDamageNoCrit,
} from "../../src/calculator/index.js"

const sharedFields = {
  bonusDamageSum: 0,
  crit: { critRate: 0, critDamage: 0.5 },
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

const bossDef = {
  attackerLevelBase: 794,
  defenderBaseDefense: 952.8,
  defenseBonus: 0,
  defenseReduction: 0,
  penetrationRate: 0,
  penetrationValue: 0,
}

const normalParams: NormalDamageParams = {
  baseDamage: 1000,
  ...sharedFields,
  defense: bossDef,
}

const sheerParams: SheerDamageParams = {
  baseDamage: 1000,
  ...sharedFields,
  sheerBonusSum: 0,
}

describe("calcSheerDamage vs calcNormalDamage", () => {
  // Sheer skips defense, so with no sheer bonus (multiplier=1):
  // sheer total = 1000 × 1 × 1 × 1 (sheer bonus) × 1 × 1 × 1 = 1000
  // normal total = 1000 × 1 × 1 × 0.4545 × 1 × 1 × 1 ≈ 454.5
  // ratio ≈ 2.2 (1/0.4545)
  it("sheer has no defense multiplier (≈2.2x vs normal for boss default)", () => {
    const normal = calcNormalDamage(normalParams)
    const sheer = calcSheerDamage(sheerParams)
    const ratio = sheer.total / normal.total
    expect(ratio).toBeCloseTo(1 / (794 / (952.8 + 794)), 2) // ≈ 2.2
  })

  it("defense multiplier is 1 in breakdown for sheer damage", () => {
    const result = calcSheerDamage(sheerParams)
    expect(result.breakdown.defenseMultiplier).toBe(1)
  })

  it("sheer bonus multiplier is in breakdown", () => {
    const result = calcSheerDamage(sheerParams)
    expect(result.breakdown.sheerBonusMultiplier).toBe(1)
  })
})

describe("calcSheerDamage with bonus", () => {
  it("50% sheer bonus: 1.5x", () => {
    const base = calcSheerDamage(sheerParams)
    const withBonus = calcSheerDamage({ ...sheerParams, sheerBonusSum: 0.5 })
    expect(withBonus.total).toBeCloseTo(base.total * 1.5, 5)
  })
})

describe("calcSheerDamageCrit", () => {
  it("crit with 50% critDamage: 1.5x non-crit", () => {
    const params: SheerDamageParams = {
      ...sheerParams,
      crit: { critRate: 1, critDamage: 0.5 },
    }
    const noCrit = calcSheerDamageNoCrit(params)
    const crit = calcSheerDamageCrit(params)
    expect(crit.total).toBeCloseTo(noCrit.total * 1.5, 5)
  })
})

describe("秽盾 scenario", () => {
  // With 秽盾: defenseBonus = 0.8, damageReduction = 0.25
  // Normal defense multiplier: 794 / (952.8 * 1.8 + 794) ≈ 0.3165
  // Sheer skips defense but 秽盾 still applies -25% damage reduction
  it("sheer with 秽盾: ≈3.16x normal with 秽盾", () => {
    const normalWithShield: NormalDamageParams = {
      ...normalParams,
      defense: { ...bossDef, defenseBonus: 0.8 },
      vulnerability: { vulnerabilityBonus: 0, damageReduction: 0.25 },
    }
    const sheerWithShield: SheerDamageParams = {
      ...sheerParams,
      vulnerability: { vulnerabilityBonus: 0, damageReduction: 0.25 },
    }
    const normal = calcNormalDamage(normalWithShield)
    const sheer = calcSheerDamage(sheerWithShield)
    // Ratio ≈ 1 / 0.3165 (defense) — both have same 0.75 vulnerability
    expect(sheer.total / normal.total).toBeCloseTo(1 / 0.3165, 1)
  })
})

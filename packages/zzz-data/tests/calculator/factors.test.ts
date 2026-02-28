import { describe, expect, it } from "vitest"
import {
  calcAnomalyBonusMultiplier,
  calcAnomalyCritMultiplier,
  calcAnomalyProficiencyMultiplier,
  calcBonusMultiplier,
  calcCritMultiplier,
  calcDamageLevelMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcDisorderDamageMultiplier,
  calcExpectedAnomalyCritMultiplier,
  calcExpectedCritMultiplier,
  calcResistanceMultiplier,
  calcSheerBonusMultiplier,
  calcVulnerabilityMultiplier,
  getAttackerLevelBase,
} from "../../src/calculator/index.js"

describe("getAttackerLevelBase", () => {
  it("returns correct values for key levels", () => {
    expect(getAttackerLevelBase(1)).toBe(50)
    expect(getAttackerLevelBase(30)).toBe(281)
    expect(getAttackerLevelBase(60)).toBe(794)
  })

  it("clamps levels above 60 to 794", () => {
    expect(getAttackerLevelBase(61)).toBe(794)
    expect(getAttackerLevelBase(100)).toBe(794)
  })

  it("clamps levels below 1 to level 1 (returns 50)", () => {
    expect(getAttackerLevelBase(0)).toBe(50)
    expect(getAttackerLevelBase(-10)).toBe(50)
  })
})

describe("calcDefenseMultiplier", () => {
  // Reference: 60-level attacker vs 60+ boss, no penetration/reduction
  // 794 / (952.8 + 794) = 0.4545...
  it("matches reference: 60-level attacker vs 60+ boss, default", () => {
    const result = calcDefenseMultiplier({
      attackerLevelBase: 794,
      defenderBaseDefense: 952.8,
      defenseBonus: 0,
      defenseReduction: 0,
      penetrationRate: 0,
      penetrationValue: 0,
    })
    expect(result).toBeCloseTo(0.4545, 3)
  })

  // Reference: with 秽盾 (+80% defense)
  // 794 / (952.8 * 1.8 + 794) = 794 / (1715.04 + 794) = 794 / 2509.04 ≈ 0.3165
  it("matches reference: 60-level attacker vs 60+ boss with 秽盾 (defense +80%)", () => {
    const result = calcDefenseMultiplier({
      attackerLevelBase: 794,
      defenderBaseDefense: 952.8,
      defenseBonus: 0.8,
      defenseReduction: 0,
      penetrationRate: 0,
      penetrationValue: 0,
    })
    expect(result).toBeCloseTo(0.3165, 3)
  })

  // With 24% penetration rate
  // effectiveDefense = 952.8 * (1 - 0.24) = 952.8 * 0.76 = 724.128
  // defense multiplier = 794 / (724.128 + 794) = 794 / 1518.128 ≈ 0.5230
  it("applies penetration rate correctly", () => {
    const result = calcDefenseMultiplier({
      attackerLevelBase: 794,
      defenderBaseDefense: 952.8,
      defenseBonus: 0,
      defenseReduction: 0,
      penetrationRate: 0.24,
      penetrationValue: 0,
    })
    expect(result).toBeCloseTo(794 / (952.8 * 0.76 + 794), 5)
  })

  // With Nicole's 40% defense reduction (无视防御)
  // effectiveDefense = 952.8 * (1 + 0 - 0.4) = 952.8 * 0.6 = 571.68
  // defense multiplier = 794 / (571.68 + 794) = 794 / 1365.68 ≈ 0.5814
  it("applies defense reduction (无视防御) correctly", () => {
    const result = calcDefenseMultiplier({
      attackerLevelBase: 794,
      defenderBaseDefense: 952.8,
      defenseBonus: 0,
      defenseReduction: 0.4,
      penetrationRate: 0,
      penetrationValue: 0,
    })
    expect(result).toBeCloseTo(794 / (952.8 * 0.6 + 794), 5)
  })

  // With penetrationValue = 200
  // effectiveDefense = 952.8 - 200 = 752.8
  // defense multiplier = 794 / (752.8 + 794) ≈ 0.5132
  it("applies penetration value correctly", () => {
    const result = calcDefenseMultiplier({
      attackerLevelBase: 794,
      defenderBaseDefense: 952.8,
      defenseBonus: 0,
      defenseReduction: 0,
      penetrationRate: 0,
      penetrationValue: 200,
    })
    expect(result).toBeCloseTo(794 / (752.8 + 794), 5)
  })

  it("clamps effective defense to 0 when penetration exceeds defense", () => {
    const result = calcDefenseMultiplier({
      attackerLevelBase: 794,
      defenderBaseDefense: 100,
      defenseBonus: 0,
      defenseReduction: 0,
      penetrationRate: 0,
      penetrationValue: 9999,
    })
    // effectiveDefense = max(0, 100 - 9999) = 0 → defense multiplier = 1
    expect(result).toBe(1)
  })
})

describe("calcResistanceMultiplier", () => {
  it("default (no resistance): 1 - 0 + 0 + 0 = 1", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: 0,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(1)
  })

  it("weakness attribute (-20% resistance): 1 - (-0.2) = 1.2", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: -0.2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(1.2)
  })

  it("resistant attribute (+20% resistance): 1 - 0.2 = 0.8", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: 0.2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(0.8)
  })

  it("clamps to minimum 0", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: 2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(0)
  })

  it("clamps to maximum 2", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: -2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(2)
  })
})

describe("calcVulnerabilityMultiplier", () => {
  it("default: 1 + 0 - 0 = 1", () => {
    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: 0,
        damageReduction: 0,
      }),
    ).toBe(1)
  })

  it("秽盾 25% damage reduction: 1 + 0 - 0.25 = 0.75", () => {
    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: 0,
        damageReduction: 0.25,
      }),
    ).toBe(0.75)
  })

  it("clamps to minimum 0.2", () => {
    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: 0,
        damageReduction: 10,
      }),
    ).toBe(0.2)
  })

  it("clamps to maximum 2", () => {
    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: 5,
        damageReduction: 0,
      }),
    ).toBe(2)
  })
})

describe("calcDazeVulnerabilityMultiplier", () => {
  it("stunned with 50% vulnerability: 1 + 0.5 = 1.5", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: true,
        stunVulnerability: 0.5,
        nonStunVulnerability: 0,
      }),
    ).toBe(1.5)
  })

  it("not stunned (default): 1 + 0 = 1", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: false,
        stunVulnerability: 0.5,
        nonStunVulnerability: 0,
      }),
    ).toBe(1)
  })

  it("stunned: clamps to minimum 0.2", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: true,
        stunVulnerability: -10,
        nonStunVulnerability: 0,
      }),
    ).toBe(0.2)
  })

  it("stunned: clamps to maximum 5", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: true,
        stunVulnerability: 10,
        nonStunVulnerability: 0,
      }),
    ).toBe(5)
  })

  it("not stunned: clamps to minimum 1", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: false,
        stunVulnerability: 0,
        nonStunVulnerability: -1,
      }),
    ).toBe(1)
  })

  it("not stunned: clamps to maximum 3", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: false,
        stunVulnerability: 0,
        nonStunVulnerability: 5,
      }),
    ).toBe(3)
  })
})

describe("calcBonusMultiplier", () => {
  it("0% bonus: 1", () => expect(calcBonusMultiplier(0)).toBe(1))
  it("50% bonus: 1.5", () => expect(calcBonusMultiplier(0.5)).toBe(1.5))
  it("clamps to minimum 0", () => expect(calcBonusMultiplier(-2)).toBe(0))
})

describe("calcCritMultiplier", () => {
  it("non-crit: always 1 regardless of critDamage", () => {
    expect(calcCritMultiplier({ critRate: 1, critDamage: 0.5 }, false)).toBe(1)
  })

  it("crit with 50% critDamage: 1.5", () => {
    expect(calcCritMultiplier({ critRate: 1, critDamage: 0.5 }, true)).toBe(1.5)
  })

  it("crit: clamps critDamage to maximum 5 → 6", () => {
    expect(calcCritMultiplier({ critRate: 1, critDamage: 10 }, true)).toBe(6)
  })

  it("crit: clamps negative critDamage to 0 → 1", () => {
    expect(calcCritMultiplier({ critRate: 1, critDamage: -1 }, true)).toBe(1)
  })
})

describe("calcExpectedCritMultiplier", () => {
  // Default: 5% rate, 50% damage → 1 + 0.05 * 0.5 = 1.025
  it("matches default agent crit values", () => {
    expect(
      calcExpectedCritMultiplier({ critRate: 0.05, critDamage: 0.5 }),
    ).toBeCloseTo(1.025)
  })
})

describe("calcSheerBonusMultiplier", () => {
  it("0 bonus: 1", () => expect(calcSheerBonusMultiplier(0)).toBe(1))
  it("0.5 bonus: 1.5", () => expect(calcSheerBonusMultiplier(0.5)).toBe(1.5))
  it("clamps to minimum 0.2", () =>
    expect(calcSheerBonusMultiplier(-5)).toBe(0.2))
  it("clamps to maximum 9", () => expect(calcSheerBonusMultiplier(20)).toBe(9))
})

describe("calcAnomalyProficiencyMultiplier", () => {
  it("0 mastery: 0", () => expect(calcAnomalyProficiencyMultiplier(0)).toBe(0))
  it("100 mastery: 1", () =>
    expect(calcAnomalyProficiencyMultiplier(100)).toBe(1))
  it("115.9 proficiency floors to 115: 1.15", () =>
    expect(calcAnomalyProficiencyMultiplier(115.9)).toBe(1.15))
  it("clamps to maximum 10", () =>
    expect(calcAnomalyProficiencyMultiplier(1500)).toBe(10))
})

describe("calcDamageLevelMultiplier", () => {
  it("level 1: 1.0000", () => expect(calcDamageLevelMultiplier(1)).toBe(1.0))
  it("level 60: 2.0000", () => expect(calcDamageLevelMultiplier(60)).toBe(2.0))
  // trunc(1 + 29/59, 4) = trunc(1.491525..., 4) = 1.4915
  it("level 30: truncates to 4 decimal places", () => {
    expect(calcDamageLevelMultiplier(30)).toBe(1.4915)
  })
})

describe("calcAnomalyCritMultiplier", () => {
  it("non-crit: always 1", () => {
    expect(calcAnomalyCritMultiplier(0.5, false)).toBe(1)
  })

  it("crit with 50% anomalyCritDamage: 1.5", () => {
    expect(calcAnomalyCritMultiplier(0.5, true)).toBe(1.5)
  })

  it("crit: clamps to maximum 3", () => {
    expect(calcAnomalyCritMultiplier(5, true)).toBe(3)
  })

  it("crit: clamps to minimum 1", () => {
    expect(calcAnomalyCritMultiplier(-1, true)).toBe(1)
  })
})

describe("calcExpectedAnomalyCritMultiplier", () => {
  it("0 crit rate: 1", () => {
    expect(calcExpectedAnomalyCritMultiplier(0, 0.5)).toBe(1)
  })

  it("100% crit rate, 50% damage: 1 + 1×0.5 = 1.5", () => {
    expect(calcExpectedAnomalyCritMultiplier(1, 0.5)).toBe(1.5)
  })

  it("clamps anomalyCritRate above 1 to 1", () => {
    expect(calcExpectedAnomalyCritMultiplier(2, 0.5)).toBe(1.5)
  })

  it("clamps anomalyCritDamage above 2 to 2", () => {
    // rate=1, damage clamped to 2 → 1 + 1×2 = 3
    expect(calcExpectedAnomalyCritMultiplier(1, 5)).toBe(3)
  })
})

describe("calcAnomalyBonusMultiplier", () => {
  it("0 bonus: 1", () => expect(calcAnomalyBonusMultiplier(0)).toBe(1))
  it("0.5 bonus: 1.5", () => expect(calcAnomalyBonusMultiplier(0.5)).toBe(1.5))
  it("clamps to minimum 0", () =>
    expect(calcAnomalyBonusMultiplier(-5)).toBe(0))
  it("clamps to maximum 3", () =>
    expect(calcAnomalyBonusMultiplier(10)).toBe(3))
})

describe("calcDisorderDamageMultiplier", () => {
  // Reference: fire, T=10s → 450% + floor(10/0.5) × 50% = 450% + 20×50% = 1450% = 14.5
  it("fire T=10s: 14.5 (1450%)", () => {
    expect(calcDisorderDamageMultiplier("fire", 10)).toBe(14.5)
  })

  // T=9.9s → floor(9.9/0.5) = floor(19.8) = 19 → 4.5 + 19×0.5 = 14.0
  it("fire T=9.9s: 14.0 (1400%)", () => {
    expect(calcDisorderDamageMultiplier("fire", 9.9)).toBe(14.0)
  })

  // fire T=0s → 450% + 0 = 4.5
  it("fire T=0s: 4.5 (450%)", () => {
    expect(calcDisorderDamageMultiplier("fire", 0)).toBe(4.5)
  })

  // electric, T=10s → 450% + floor(10)×125% = 4.5 + 10×1.25 = 4.5 + 12.5 = 17.0
  it("electric T=10s: 17.0 (1700%)", () => {
    expect(calcDisorderDamageMultiplier("electric", 10)).toBe(17.0)
  })

  // ether, T=10s → 450% + floor(10/0.5)×62.5% = 4.5 + 20×0.625 = 4.5 + 12.5 = 17.0
  it("ether T=10s: 17.0 (1700%)", () => {
    expect(calcDisorderDamageMultiplier("ether", 10)).toBe(17.0)
  })

  // ice, T=10s → 450% + floor(10)×7.5% = 4.5 + 10×0.075 = 4.5 + 0.75 = 5.25
  it("ice T=10s: 5.25 (525%)", () => {
    expect(calcDisorderDamageMultiplier("ice", 10)).toBe(5.25)
  })

  // physical, T=10s → same as ice
  it("physical T=10s: 5.25 (525%)", () => {
    expect(calcDisorderDamageMultiplier("physical", 10)).toBe(5.25)
  })

  // auricInk, T=10s → same as ether
  it("auricInk T=10s: 17.0 (1700%)", () => {
    expect(calcDisorderDamageMultiplier("auricInk", 10)).toBe(17.0)
  })

  // frost, T=20s → 600% + floor(20)×75% = 6.0 + 20×0.75 = 6.0 + 15.0 = 21.0
  it("frost T=20s: 21.0 (2100%)", () => {
    expect(calcDisorderDamageMultiplier("frost", 20)).toBe(21.0)
  })

  // frost, T=0s → 600% = 6.0
  it("frost T=0s: 6.0 (600%)", () => {
    expect(calcDisorderDamageMultiplier("frost", 0)).toBe(6.0)
  })
})

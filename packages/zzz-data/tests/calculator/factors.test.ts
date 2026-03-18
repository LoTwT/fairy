import { describe, expect, it } from "vitest"
import {
  calcBaseDamage,
  calcBonusMultiplier,
  calcCritMultiplier,
  calcDazeVulnerabilityMultiplier,
  calcDefenseMultiplier,
  calcExpectedCritMultiplier,
  calcResistanceMultiplier,
  calcSheerBonusMultiplier,
  calcVulnerabilityMultiplier,
  getAttackerLevelBase,
} from "../../src/index.js"

describe("calcBaseDamage", () => {
  it("multiplies attribute value by the summed multipliers", () => {
    expect(calcBaseDamage(658, [0.312, 0.435])).toBeCloseTo(491.526, 6)
  })
})

describe("getAttackerLevelBase", () => {
  it("returns the expected lookup values", () => {
    expect(getAttackerLevelBase(1)).toBe(50)
    expect(getAttackerLevelBase(30)).toBe(281)
    expect(getAttackerLevelBase(60)).toBe(794)
  })

  it("clamps levels below 1 to the first lookup value", () => {
    expect(getAttackerLevelBase(0)).toBe(50)
  })

  it("clamps levels above 60", () => {
    expect(getAttackerLevelBase(70)).toBe(794)
  })
})

describe("calcBonusMultiplier", () => {
  it("applies bonus damage additively", () => {
    expect(calcBonusMultiplier(0.3)).toBe(1.3)
  })

  it("clamps the multiplier to the documented range", () => {
    expect(calcBonusMultiplier(-5)).toBe(0)
    expect(calcBonusMultiplier(10)).toBe(6)
  })
})

describe("calcCritMultiplier", () => {
  it("returns 1 when the hit does not crit", () => {
    expect(calcCritMultiplier({ critRate: 0.5, critDamage: 1.2 }, false)).toBe(
      1,
    )
  })

  it("adds crit damage when the hit crits", () => {
    expect(calcCritMultiplier({ critRate: 0.5, critDamage: 1.2 }, true)).toBe(
      2.2,
    )
  })

  it("clamps crit damage to the documented range", () => {
    expect(calcCritMultiplier({ critRate: 0.5, critDamage: -2 }, true)).toBe(1)
    expect(calcCritMultiplier({ critRate: 0.5, critDamage: 10 }, true)).toBe(6)
  })
})

describe("calcExpectedCritMultiplier", () => {
  it("matches the expected crit formula", () => {
    expect(
      calcExpectedCritMultiplier({ critRate: 0.68, critDamage: 1.24 }),
    ).toBeCloseTo(1.8432, 6)
  })

  it("clamps crit rate and crit damage before calculating expected value", () => {
    expect(
      calcExpectedCritMultiplier({ critRate: -1, critDamage: 10 }),
    ).toBeCloseTo(1, 6)
    expect(
      calcExpectedCritMultiplier({ critRate: 2, critDamage: 10 }),
    ).toBeCloseTo(6, 6)
  })
})

describe("calcDefenseMultiplier", () => {
  it("matches the default Lv60 attacker vs 60+ boss case", () => {
    expect(
      calcDefenseMultiplier({
        attackerLevel: 60,
        defenderBaseDefense: 952.8,
        defenseBonus: 0,
        defenseReduction: 0,
        penetrationRate: 0,
        penetrationValue: 0,
      }),
    ).toBeCloseTo(794 / (952.8 + 794), 6)
  })

  it("matches the shielded 80% defense bonus case", () => {
    expect(
      calcDefenseMultiplier({
        attackerLevel: 60,
        defenderBaseDefense: 952.8,
        defenseBonus: 0.8,
        defenseReduction: 0,
        penetrationRate: 0,
        penetrationValue: 0,
      }),
    ).toBeCloseTo(794 / (952.8 * 1.8 + 794), 6)
  })

  it("supports penetration rate, defense reduction, and penetration value", () => {
    expect(
      calcDefenseMultiplier({
        attackerLevel: 60,
        defenderBaseDefense: 952.8,
        defenseBonus: 0,
        defenseReduction: 0.4,
        penetrationRate: 0.24,
        penetrationValue: 200,
      }),
    ).toBeCloseTo(794 / (Math.max(0, 952.8 * 0.6 * 0.76 - 200) + 794), 6)
  })

  it("clamps effective defense to zero", () => {
    expect(
      calcDefenseMultiplier({
        attackerLevel: 60,
        defenderBaseDefense: 952.8,
        defenseBonus: 0,
        defenseReduction: 1,
        penetrationRate: 1,
        penetrationValue: 9999,
      }),
    ).toBe(1)
  })

  it("clamps attacker level using the shared lookup helper", () => {
    expect(
      calcDefenseMultiplier({
        attackerLevel: 70,
        defenderBaseDefense: 952.8,
        defenseBonus: 0,
        defenseReduction: 0,
        penetrationRate: 0,
        penetrationValue: 0,
      }),
    ).toBeCloseTo(794 / (952.8 + 794), 6)
  })
})

describe("calcResistanceMultiplier", () => {
  it("supports weakness and resistance attributes", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: -0.2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(1.2)

    expect(
      calcResistanceMultiplier({
        defenderResistance: 0.2,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(0.8)
  })

  it("clamps the multiplier to the documented range", () => {
    expect(
      calcResistanceMultiplier({
        defenderResistance: 5,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(0)

    expect(
      calcResistanceMultiplier({
        defenderResistance: -5,
        resistanceReduction: 0,
        ignoreResistance: 0,
      }),
    ).toBe(2)
  })
})

describe("calcVulnerabilityMultiplier", () => {
  it("applies damage reduction and vulnerability additively", () => {
    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: 0.2,
        damageReduction: 0.1,
      }),
    ).toBeCloseTo(1.1, 6)
  })

  it("clamps the multiplier to the documented range", () => {
    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: -5,
        damageReduction: 0,
      }),
    ).toBe(0.2)

    expect(
      calcVulnerabilityMultiplier({
        vulnerabilityBonus: 5,
        damageReduction: 0,
      }),
    ).toBe(2)
  })
})

describe("calcDazeVulnerabilityMultiplier", () => {
  it("uses the stunned branch when the target is stunned", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: true,
        stunVulnerability: 0.5,
        nonStunVulnerability: 0,
      }),
    ).toBe(1.5)
  })

  it("uses the non-stunned branch otherwise", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: false,
        stunVulnerability: 0.5,
        nonStunVulnerability: 0.3,
      }),
    ).toBe(1.3)
  })

  it("clamps both stunned and non-stunned branches to the documented ranges", () => {
    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: true,
        stunVulnerability: -5,
        nonStunVulnerability: 0,
      }),
    ).toBe(0.2)

    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: true,
        stunVulnerability: 10,
        nonStunVulnerability: 0,
      }),
    ).toBe(5)

    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: false,
        stunVulnerability: 0,
        nonStunVulnerability: -5,
      }),
    ).toBe(1)

    expect(
      calcDazeVulnerabilityMultiplier({
        isStunned: false,
        stunVulnerability: 0,
        nonStunVulnerability: 10,
      }),
    ).toBe(3)
  })
})

describe("calcSheerBonusMultiplier", () => {
  it("applies sheer damage bonus additively", () => {
    expect(calcSheerBonusMultiplier(0.35)).toBe(1.35)
  })

  it("clamps the multiplier to the documented range", () => {
    expect(calcSheerBonusMultiplier(-5)).toBe(0.2)
    expect(calcSheerBonusMultiplier(10)).toBe(9)
  })
})

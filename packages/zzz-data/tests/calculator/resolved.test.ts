import { describe, expect, it } from "vitest"
import {
  calcResolvedNormalDamage,
  calcResolvedSheerDamage,
} from "../../src/index.js"

describe("calcResolvedNormalDamage", () => {
  it("multiplies all normal damage factors together", () => {
    const result = calcResolvedNormalDamage({
      baseDamage: 1000,
      bonusMultiplier: 1.3,
      critMultiplier: 1.5,
      defenseMultiplier: 0.4545,
      resistanceMultiplier: 1.2,
      vulnerabilityMultiplier: 1.1,
      dazeVulnerabilityMultiplier: 1.5,
      specialMultiplier: 0.75,
    })

    expect(result.total).toBeCloseTo(
      1000 * 1.3 * 1.5 * 0.4545 * 1.2 * 1.1 * 1.5 * 0.75,
      6,
    )
    expect(result.breakdown.sheerBonusMultiplier).toBe(1)
  })

  it("defaults specialMultiplier to 1", () => {
    const result = calcResolvedNormalDamage({
      baseDamage: 1000,
      bonusMultiplier: 1,
      critMultiplier: 1,
      defenseMultiplier: 0.4545,
      resistanceMultiplier: 1,
      vulnerabilityMultiplier: 1,
      dazeVulnerabilityMultiplier: 1,
    })

    expect(result.total).toBeCloseTo(454.5, 6)
    expect(result.breakdown.specialMultiplier).toBe(1)
  })
})

describe("calcResolvedSheerDamage", () => {
  it("multiplies all sheer damage factors together", () => {
    const result = calcResolvedSheerDamage({
      baseDamage: 1000,
      bonusMultiplier: 1.3,
      critMultiplier: 1.5,
      sheerBonusMultiplier: 1.4,
      resistanceMultiplier: 1.2,
      vulnerabilityMultiplier: 1.1,
      dazeVulnerabilityMultiplier: 1.5,
      specialMultiplier: 0.75,
    })

    expect(result.total).toBeCloseTo(
      1000 * 1.3 * 1.5 * 1.4 * 1.2 * 1.1 * 1.5 * 0.75,
      6,
    )
    expect(result.breakdown.defenseMultiplier).toBe(1)
  })

  it("outdamages normal damage by the skipped defense multiplier", () => {
    const normal = calcResolvedNormalDamage({
      baseDamage: 1000,
      bonusMultiplier: 1,
      critMultiplier: 1,
      defenseMultiplier: 794 / (952.8 + 794),
      resistanceMultiplier: 1,
      vulnerabilityMultiplier: 1,
      dazeVulnerabilityMultiplier: 1,
    })
    const sheer = calcResolvedSheerDamage({
      baseDamage: 1000,
      bonusMultiplier: 1,
      critMultiplier: 1,
      sheerBonusMultiplier: 1,
      resistanceMultiplier: 1,
      vulnerabilityMultiplier: 1,
      dazeVulnerabilityMultiplier: 1,
    })

    expect(sheer.total / normal.total).toBeCloseTo(1 / (794 / (952.8 + 794)), 3)
  })
})

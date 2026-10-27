import { describe, expect, it } from "vitest"
import {
  anomalyDamageFormula,
  calculateTargetEffectiveDefense,
  defenseFactor,
  regularDamageFormula,
  type AnomalyDamageFormulaInput,
  type RegularDamageFormulaInput,
} from "../src/index.ts"

/**
 * 固定来源：ZZZ-HP `991bb0ef2a00387f8a1fa18293bbda17256d7270` 的
 * `zzz-hp/scripts/test-formula-align-compare.mjs` 与
 * `zzz-hp/scripts/test-defense-zone-clamp.mjs`。
 *
 * 只迁移公式层面的完整输入；上游的 UI 字段、面板拼装和展示舍入不在此重复。
 * 期望伤害按上游整数与 `Math.round(Fairy 精确值)` 对照。
 */
describe("ZZZ-HP 991bb0e formula backport", () => {
  it("settles the stagger direct and anomaly chains with the documented rounding", () => {
    // ZZZ-HP 991bb0e zzz-hp/scripts/test-formula-align-compare.mjs:90-206
    const targetEffectiveDefense = calculateTargetEffectiveDefense({
      targetBaseDefense: 794,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [],
    })
    const shared = {
      baseDamage: [{ damageMultiplier: 1, finalStat: 3000 }] as const,
      damageBonus: [0.5] as const,
      defense: { attackerLevelBase: 794, targetEffectiveDefense },
      resistance: {
        targetResistance: 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      stunDamage: {
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.5,
        targetStunDamageMultiplierAdjustments: [0.25, 0.1, 0.05],
      },
    }
    const regularInput: RegularDamageFormulaInput = {
      ...shared,
      damageTaken: {
        targetDamageTakenIncreases: [0.3, 0.2],
        targetDamageTakenReductions: [0.1, 0.05],
      },
      critical: {
        isCritical: false,
        criticalDamageContributions: [1],
      },
    }
    const nonCritical = regularDamageFormula.calculate(regularInput).value
    const critical = regularDamageFormula.calculate({
      ...regularInput,
      critical: { isCritical: true, criticalDamageContributions: [1] },
    }).value
    const expected = nonCritical * 0.5 + critical * 0.5
    // 按上游同一场景的乘区手算，非暴击 5771.25、暴击 11542.5，按 50% 暴击率取期望。
    expect(nonCritical).toBeCloseTo(5771.25, 9)
    expect(critical).toBeCloseTo(11542.5, 9)
    expect(expected).toBeCloseTo(8656.875, 9)
    expect(Math.round(expected)).toBe(8657)

    const anomalyInput: AnomalyDamageFormulaInput = {
      ...shared,
      baseDamage: [{ damageMultiplier: 5, finalStat: 3000 }],
      damageBonus: 1.5,
      anomalyProficiency: 300,
      damageTaken: {
        targetDamageTakenIncreases: [0.3, 0.4],
        targetDamageTakenReductions: [0.1],
      },
      anomalyDamageLevel: 60,
      anomalyDamageBonus: [],
      anomalyCritical: {
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [1],
      },
      refringe: 1,
    }
    const anomalyExpected = anomalyDamageFormula.calculate(anomalyInput).value
    expect(anomalyExpected).toBeCloseTo(205200, 9)
    expect(Math.round(anomalyExpected)).toBe(205200)

    const nonStagger = anomalyDamageFormula.calculate({
      ...anomalyInput,
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [0.25],
      },
    }).value
    expect(nonStagger).toBeCloseTo(135000, 9)
    expect(Math.round(nonStagger)).toBe(135000)
  })

  it("clamps the defense zone when flat penetration reaches the target defense", () => {
    // ZZZ-HP 991bb0e zzz-hp/scripts/test-defense-zone-clamp.mjs:39-46
    const atTargetDefense = calculateTargetEffectiveDefense({
      targetBaseDefense: 953,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [953],
    })
    // ZZZ-HP 991bb0e zzz-hp/scripts/test-defense-zone-clamp.mjs:59-69
    const beyondTargetDefense = calculateTargetEffectiveDefense({
      targetBaseDefense: 953,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [2859],
    })
    const atTargetZone = defenseFactor.calculate({
      attackerLevelBase: 794,
      targetEffectiveDefense: atTargetDefense,
    })
    const beyondTargetZone = defenseFactor.calculate({
      attackerLevelBase: 794,
      targetEffectiveDefense: beyondTargetDefense,
    })
    // 上游 :43 只断言有效防御 ≥ 0；0 是 Fairy 整体钳制后的推导值。
    expect(atTargetDefense).toBe(0)
    expect(beyondTargetDefense).toBe(0)
    expect(atTargetZone).toBe(1)
    // 上游 :64 的饱和语义：穿透 953 与 ENEMY_DEF × 3 = 2859 的防御区相同。
    expect(beyondTargetZone).toBe(atTargetZone)
  })
})

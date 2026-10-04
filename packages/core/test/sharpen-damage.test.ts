import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  SHARPEN_DAMAGE_FORMULA_ID,
  calculateDefenseLevelBase,
  sharpenDamageFormula,
  type BaseDamageFactorInput,
  type DamageBonusFactorInput,
  type DamageTakenFactorInput,
  type DefenseFactorInput,
  type Formula,
  type FormulaResult,
  type ResistanceFactorInput,
  type SharpenDamageBonusFactorInput,
  type SharpenDamageFormulaInput,
  type SharpCriticalFactorInput,
  type StunDamageFactorInput,
} from "../src/index.ts"

/**
 * 固定来源独立算式的基线（ZZZ-HP fac62407 computeDamageResult 锐化链）：
 * 最终防御 1500、技能倍率 200%、普通增伤 50%、锐暴 150%、暴击率 135%、
 * 有效敌防 953、抗性 0、易伤 1、未失衡 1、穿透与减防为 0。
 * 上游不乘普通暴击区、贯穿增伤与直伤决算；Fairy 的锐化公式同口径。
 */
const BASELINE = {
  finalDefense: 1500,
  multiplier: 2,
  defenseInput: {
    attackerLevelBase: calculateDefenseLevelBase(60),
    targetEffectiveDefense: 953,
  } as DefenseFactorInput,
  nonCriticalWithoutSharpZone: 2045.220377790498,
  expectedWithBaselineSharpZone: 7797.402690326274,
}

function createSharpenInput(
  sharpCritical: SharpCriticalFactorInput,
  overrides: Partial<
    Pick<
      SharpenDamageFormulaInput,
      "baseDamage" | "damageBonus" | "sharpenDamageBonus" | "defense"
    >
  > = {},
): SharpenDamageFormulaInput {
  return {
    baseDamage: [
      {
        damageMultiplier: BASELINE.multiplier,
        finalStat: BASELINE.finalDefense,
      },
    ],
    damageBonus: [0.5],
    sharpenDamageBonus: [],
    sharpCritical,
    defense: BASELINE.defenseInput,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
    ...overrides,
  }
}

const forcedFirstLayer = (rate: number, contributions: readonly number[]) =>
  sharpenDamageFormula.calculate(
    createSharpenInput({
      isSharpCritical: true,
      criticalRate: rate,
      sharpCriticalDamageContributions: contributions,
    }),
  )

const nonSharpBranch = (rate: number, contributions: readonly number[]) =>
  sharpenDamageFormula.calculate(
    createSharpenInput({
      isSharpCritical: false,
      criticalRate: rate,
      sharpCriticalDamageContributions: contributions,
    }),
  )

/** 与 static 结果组装一致的期望组合：(1 − min(1, r)) × 非锐暴 + min(1, r) × 锐暴。 */
function expectedZone(
  rate: number,
  contributions: readonly number[],
): FormulaResult<SharpenDamageFormulaInput>["value"] {
  const nonCritical = nonSharpBranch(rate, contributions)
  const critical = forcedFirstLayer(rate, contributions)
  const weight = Math.min(1, Math.max(0, rate))
  return (1 - weight) * nonCritical.value + weight * critical.value
}

describe("sharpenDamageFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SharpenDamageFormulaInput>().toEqualTypeOf<{
      readonly baseDamage: BaseDamageFactorInput
      readonly damageBonus: DamageBonusFactorInput
      readonly sharpenDamageBonus: SharpenDamageBonusFactorInput
      readonly sharpCritical: SharpCriticalFactorInput
      readonly defense: DefenseFactorInput
      readonly resistance: ResistanceFactorInput
      readonly damageTaken: DamageTakenFactorInput
      readonly stunDamage: StunDamageFactorInput
    }>()
    expectTypeOf(SHARPEN_DAMAGE_FORMULA_ID).toEqualTypeOf<"sharpen_damage">()
    expectTypeOf(sharpenDamageFormula).toEqualTypeOf<
      Formula<SharpenDamageFormulaInput>
    >()

    expect(SHARPEN_DAMAGE_FORMULA_ID).toBe("sharpen_damage")
    expect(sharpenDamageFormula.formulaId).toBe(SHARPEN_DAMAGE_FORMULA_ID)
    expect(Object.isFrozen(sharpenDamageFormula)).toBe(true)
  })

  it("scales the final defense by the skill multiplier for the non-sharp branch", () => {
    const result = nonSharpBranch(1.35, [1.5])
    expect(result.value).toBeCloseTo(BASELINE.nonCriticalWithoutSharpZone, 9)
    expect(result.factorResults.sharpCritical).toBe(1)
    expect(result.factorResults).toEqual({
      baseDamage: 3000,
      damageBonus: 1.5,
      sharpenDamageBonus: 1,
      sharpCritical: 1,
      defense: 794 / 1747,
      resistance: 1,
      damageTaken: 1,
      stunDamage: 1,
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("reproduces the fixed-source baseline expectation and forced-first-layer zone", () => {
    // r = 1.35、B = 1.5：(1 + B) × (1 + B × (r − 1)) = 2.5 × 1.525 = 3.8125。
    expect(
      forcedFirstLayer(1.35, [1.5]).factorResults.sharpCritical,
    ).toBeCloseTo(3.8125, 12)
    expect(forcedFirstLayer(1.35, [1.5]).value).toBeCloseTo(
      BASELINE.expectedWithBaselineSharpZone,
      9,
    )
    expect(expectedZone(1.35, [1.5])).toBeCloseTo(
      BASELINE.expectedWithBaselineSharpZone,
      9,
    )
  })

  it("applies the independent sharpen damage bonus zone once", () => {
    const result = sharpenDamageFormula.calculate(
      createSharpenInput(
        {
          isSharpCritical: true,
          criticalRate: 1.35,
          sharpCriticalDamageContributions: [1.5],
        },
        { sharpenDamageBonus: [0.3] },
      ),
    )
    expect(result.factorResults.sharpenDamageBonus).toBeCloseTo(1.3, 12)
    expect(result.value).toBeCloseTo(10136.623497424156, 9)
  })

  it("raises the sharp critical zone by added sharp critical damage points", () => {
    // B = 1.62：(1 + B) × (1 + B × 0.35) = 2.62 × 1.567 = 4.10554。
    const result = forcedFirstLayer(1.35, [1.62])
    expect(result.factorResults.sharpCritical).toBeCloseTo(4.10554, 12)
    expect(result.value).toBeCloseTo(8396.734069834001, 9)
  })

  it("subtracts weakness damage from the shared damage bonus zone", () => {
    // 弱伤 20 个百分点：增伤 50% − 20% = 30%，其余不变。
    const result = sharpenDamageFormula.calculate(
      createSharpenInput(
        {
          isSharpCritical: true,
          criticalRate: 1.35,
          sharpCriticalDamageContributions: [1.5],
        },
        { damageBonus: [0.3] },
      ),
    )
    expect(result.factorResults.damageBonus).toBeCloseTo(1.3, 12)
    expect(result.value).toBeCloseTo(6757.748998282771, 9)
  })

  it("scales with the final defense of the damage source", () => {
    const result = sharpenDamageFormula.calculate(
      createSharpenInput(
        {
          isSharpCritical: true,
          criticalRate: 1.35,
          sharpCriticalDamageContributions: [1.5],
        },
        { baseDamage: [{ damageMultiplier: 2, finalStat: 1800 }] },
      ),
    )
    expect(result.value).toBeCloseTo(9356.883228391529, 9)
  })

  it("keeps the sharp result independent of regular critical damage and attack", () => {
    // 公式输入不读取普通暴伤或攻击力：固定来源只改普通暴伤（999%）或攻击力
    // （9999）时锐化结果不变；类型层面同样没有普通暴击区或攻击力字段。
    expectTypeOf<keyof SharpenDamageFormulaInput>().toEqualTypeOf<
      | "baseDamage"
      | "damageBonus"
      | "sharpenDamageBonus"
      | "sharpCritical"
      | "defense"
      | "resistance"
      | "damageTaken"
      | "stunDamage"
    >()
    expect(forcedFirstLayer(1.35, [1.5]).value).toBeCloseTo(
      BASELINE.expectedWithBaselineSharpZone,
      9,
    )
  })

  it("matches the fixed-source expectation matrix across the rate domain", () => {
    // B = 1.5 时，期望区随暴击率 −10/0/50/100/135/200/250% 变化；
    // 250% 与 200% 相同（锋御暴击率上限 200%）。
    for (const [rate, expected] of [
      [-0.1, 1],
      [0, 1],
      [0.5, 1.75],
      [1, 2.5],
      [1.35, 3.8125],
      [2, 6.25],
      [2.5, 6.25],
    ] as const) {
      expect(
        expectedZone(rate, [1.5]) / BASELINE.nonCriticalWithoutSharpZone,
      ).toBeCloseTo(expected, 12)
    }
  })

  it("keeps a zero sharp critical damage at the identity expectation", () => {
    expect(expectedZone(2, [0])).toBeCloseTo(
      BASELINE.nonCriticalWithoutSharpZone,
      9,
    )
  })

  it("returns zero with complete factor results for an empty base damage input", () => {
    const result = sharpenDamageFormula.calculate(
      createSharpenInput(
        {
          isSharpCritical: true,
          criticalRate: 1.35,
          sharpCriticalDamageContributions: [1.5],
        },
        { baseDamage: [] },
      ),
    )
    expect(result.value).toBe(0)
    expect(result.factorResults.baseDamage).toBe(0)
    expect(Object.keys(result.factorResults)).toHaveLength(8)
  })

  it("rejects invalid input shapes", () => {
    expect(() =>
      sharpenDamageFormula.calculate(
        null as unknown as SharpenDamageFormulaInput,
      ),
    ).toThrow(TypeError)
    expect(() =>
      sharpenDamageFormula.calculate(
        [] as unknown as SharpenDamageFormulaInput,
      ),
    ).toThrow(TypeError)
  })

  it("reuses the identity default inputs of the shared zones", () => {
    const result = sharpenDamageFormula.calculate({
      baseDamage: [{ damageMultiplier: 2, finalStat: 1500 }],
      damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
      sharpenDamageBonus: [],
      sharpCritical: {
        isSharpCritical: true,
        criticalRate: 1.35,
        sharpCriticalDamageContributions: [1.5],
      },
      defense: BASELINE.defenseInput,
      resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
      damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
      stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
    })
    // 默认增伤为空列表（恒等倍率 1）：2045.2204 / 1.5 × 3.8125。
    expect(result.value).toBeCloseTo(5198.268460217517, 9)
  })
})

import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_REFRINGE_FACTOR_INPUT,
  DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  LUMINIZE_DAMAGE_FORMULA_ID,
  calculateSpecialVoidflareDamageBonusMultiplier,
  luminizeDamageFormula,
  type AnomalyDamageBonusFactorInput,
  type AnomalyDamageLevelFactorInput,
  type AnomalyProficiencyFactorInput,
  type BaseDamageFactorInput,
  type DamageTakenFactorInput,
  type DefenseFactorInput,
  type Formula,
  type LuminizeDamageFormulaInput,
  type LuminizeMultiplierFactorInput,
  type RefringeFactorInput,
  type ResistanceFactorInput,
  type SettledDamageBonusFactorInput,
  type StunDamageFactorInput,
} from "../src/index.ts"

function createLuminizeDamageInput(
  baseDamage: BaseDamageFactorInput,
): LuminizeDamageFormulaInput {
  return {
    baseDamage,
    damageBonus: DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
    anomalyProficiency: DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
    refringe: DEFAULT_REFRINGE_FACTOR_INPUT,
    luminizeMultiplier: {
      baseLuminizeMultiplier: 1,
      remielleAnomalyProficiency: 0,
      anomalyProficiencyConversionRate: 0,
      multiplicativeLuminizeMultiplierAdjustments: [],
    },
    anomalyDamageBonus: DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
    defense: DEFAULT_DEFENSE_FACTOR_INPUT,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
    anomalyDamageLevel: DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  }
}

describe("luminizeDamageFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<LuminizeDamageFormulaInput>().toEqualTypeOf<{
      readonly baseDamage: BaseDamageFactorInput
      readonly damageBonus: SettledDamageBonusFactorInput
      readonly anomalyProficiency: AnomalyProficiencyFactorInput
      readonly refringe: RefringeFactorInput
      readonly luminizeMultiplier: LuminizeMultiplierFactorInput
      readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
      readonly defense: DefenseFactorInput
      readonly resistance: ResistanceFactorInput
      readonly damageTaken: DamageTakenFactorInput
      readonly stunDamage: StunDamageFactorInput
      readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
    }>()
    expectTypeOf(LUMINIZE_DAMAGE_FORMULA_ID).toEqualTypeOf<"luminize_damage">()
    expectTypeOf(luminizeDamageFormula).toEqualTypeOf<
      Formula<LuminizeDamageFormulaInput>
    >()

    expect(LUMINIZE_DAMAGE_FORMULA_ID).toBe("luminize_damage")
    expect(luminizeDamageFormula.formulaId).toBe(LUMINIZE_DAMAGE_FORMULA_ID)
    expect(Object.isFrozen(luminizeDamageFormula)).toBe(true)
  })

  it("uses explicit identity inputs", () => {
    const result = luminizeDamageFormula.calculate(
      createLuminizeDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
    )

    expect(result).toEqual({
      value: 200,
      factorResults: {
        baseDamage: 200,
        damageBonus: 1,
        anomalyProficiency: 1,
        refringe: 1,
        luminizeMultiplier: 1,
        anomalyDamageBonus: 1,
        defense: 1,
        resistance: 1,
        damageTaken: 1,
        stunDamage: 1,
        anomalyDamageLevel: 1,
      },
    })
    expect(Object.keys(result.factorResults)).toEqual([
      "baseDamage",
      "damageBonus",
      "anomalyProficiency",
      "refringe",
      "luminizeMultiplier",
      "anomalyDamageBonus",
      "defense",
      "resistance",
      "damageTaken",
      "stunDamage",
      "anomalyDamageLevel",
    ])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("calculates all eleven factors in the specified order without rounding", () => {
    const baseDamage = 100
    const damageBonus = 1.2
    const anomalyProficiency = 1.25
    const refringe = 1.38
    const luminizeMultiplier = (3.2 + 400 * 0.002) * 1.12
    const anomalyDamageBonus = 1 + (0.5 - 0.125)
    const defense = 50 / (50 + 50)
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const damageTaken = 1 + 0.25 - 0.1
    const stunDamage = 1.5 + 0.25
    const anomalyDamageLevel = Math.trunc(((50 + 58) * 10_000) / 59) / 10_000
    const input: LuminizeDamageFormulaInput = {
      baseDamage: [{ damageMultiplier: 1, finalStat: 100 }],
      damageBonus,
      anomalyProficiency: 125,
      refringe,
      luminizeMultiplier: {
        baseLuminizeMultiplier: 3.2,
        remielleAnomalyProficiency: 400,
        anomalyProficiencyConversionRate: 0.002,
        multiplicativeLuminizeMultiplierAdjustments: [1.12],
      },
      anomalyDamageBonus: [0.5, -0.125],
      defense: {
        attackerLevelBase: 50,
        targetEffectiveDefense: 50,
      },
      resistance: {
        targetResistance: 0.2,
        targetResistanceReductions: [0.1],
        attackerResistanceIgnoreValues: [0.05],
      },
      damageTaken: {
        targetDamageTakenIncreases: [0.25],
        targetDamageTakenReductions: [0.1],
      },
      stunDamage: {
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.5,
        targetStunDamageMultiplierAdjustments: [0.25],
      },
      anomalyDamageLevel: 50,
    }

    expect(luminizeDamageFormula.calculate(input)).toEqual({
      value:
        baseDamage *
        damageBonus *
        anomalyProficiency *
        refringe *
        luminizeMultiplier *
        anomalyDamageBonus *
        defense *
        resistance *
        damageTaken *
        stunDamage *
        anomalyDamageLevel,
      factorResults: {
        baseDamage,
        damageBonus,
        anomalyProficiency,
        refringe,
        luminizeMultiplier,
        anomalyDamageBonus,
        defense,
        resistance,
        damageTaken,
        stunDamage,
        anomalyDamageLevel,
      },
    })
  })

  it("uses the special Voidflare damage bonus as a settled multiplier", () => {
    const damageBonus = calculateSpecialVoidflareDamageBonusMultiplier(60)
    const input = {
      ...createLuminizeDamageInput([{ damageMultiplier: 1, finalStat: 100 }]),
      damageBonus,
    }
    const result = luminizeDamageFormula.calculate(input)

    expect(result.value).toBe(250)
    expect(result.factorResults.damageBonus).toBe(2.5)
  })

  it("returns zero with complete factor results for an empty base damage input", () => {
    const result = luminizeDamageFormula.calculate(
      createLuminizeDamageInput([]),
    )

    expect(result.value).toBe(0)
    expect(Object.keys(result.factorResults)).toHaveLength(11)
  })

  it("does not modify the formula input or nested inputs", () => {
    const baseDamage = Object.freeze([
      Object.freeze({ damageMultiplier: 1, finalStat: 100 }),
    ])
    const adjustments = Object.freeze([1.12])
    const luminizeMultiplier = Object.freeze({
      baseLuminizeMultiplier: 3.2,
      remielleAnomalyProficiency: 400,
      anomalyProficiencyConversionRate: 0.002,
      multiplicativeLuminizeMultiplierAdjustments: adjustments,
    })
    const input = Object.freeze({
      ...createLuminizeDamageInput(baseDamage),
      luminizeMultiplier,
    })

    luminizeDamageFormula.calculate(input)

    expect(input.baseDamage).toEqual([{ damageMultiplier: 1, finalStat: 100 }])
    expect(input.luminizeMultiplier).toEqual({
      baseLuminizeMultiplier: 3.2,
      remielleAnomalyProficiency: 400,
      anomalyProficiencyConversionRate: 0.002,
      multiplicativeLuminizeMultiplierAdjustments: [1.12],
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseDamage)).toBe(true)
    expect(Object.isFrozen(luminizeMultiplier)).toBe(true)
    expect(Object.isFrozen(adjustments)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createLuminizeDamageInput([])

    for (const input of [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]) {
      expect(() =>
        luminizeDamageFormula.calculate(
          input as unknown as LuminizeDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseDamage",
    "damageBonus",
    "anomalyProficiency",
    "refringe",
    "luminizeMultiplier",
    "anomalyDamageBonus",
    "defense",
    "resistance",
    "damageTaken",
    "stunDamage",
    "anomalyDamageLevel",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createLuminizeDamageInput([
      { damageMultiplier: 1, finalStat: 100 },
    ])
    const missingInput: Partial<LuminizeDamageFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as LuminizeDamageFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        luminizeDamageFormula.calculate(
          input as unknown as LuminizeDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating later factors when an earlier result is zero", () => {
    const input = {
      ...createLuminizeDamageInput([]),
      anomalyDamageLevel: 0,
    }

    expect(() => luminizeDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects overflow before a later zero", () => {
    const input: LuminizeDamageFormulaInput = {
      ...createLuminizeDamageInput([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
      damageBonus: 2,
      anomalyProficiency: 0,
    }

    expect(() => luminizeDamageFormula.calculate(input)).toThrow(RangeError)
  })
})

describe("calculateSpecialVoidflareDamageBonusMultiplier", () => {
  it("exposes its public function type", () => {
    expectTypeOf(calculateSpecialVoidflareDamageBonusMultiplier).toEqualTypeOf<
      (agentLevel: number) => number
    >()
  })

  it.each([
    [1, 1.025],
    [20, 1.5],
    [40, 2],
    [60, 2.5],
  ] as const)("calculates the level %s multiplier", (agentLevel, expected) => {
    expect(calculateSpecialVoidflareDamageBonusMultiplier(agentLevel)).toBe(
      expected,
    )
  })

  it.each([undefined, null, "60", true, {}, []])(
    "rejects the non-number level %s",
    (agentLevel) => {
      expect(() =>
        calculateSpecialVoidflareDamageBonusMultiplier(
          agentLevel as unknown as number,
        ),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, 1.5, 0, -1, 61])(
    "rejects the invalid level %s",
    (agentLevel) => {
      expect(() =>
        calculateSpecialVoidflareDamageBonusMultiplier(agentLevel),
      ).toThrow(RangeError)
    },
  )
})

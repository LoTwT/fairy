import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_DAMAGE_FORMULA_ID,
  DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  anomalyDamageFormula,
  type AnomalyCriticalFactorInput,
  type AnomalyDamageBonusFactorInput,
  type AnomalyDamageFormulaInput,
  type AnomalyDamageLevelFactorInput,
  type AnomalyProficiencyFactorInput,
  type BaseDamageFactorInput,
  type DamageBonusFactorInput,
  type DamageTakenFactorInput,
  type DefenseFactorInput,
  type Formula,
  type ResistanceFactorInput,
  type StunDamageFactorInput,
} from "../src/index.ts"

function createAnomalyDamageInput(
  baseDamage: BaseDamageFactorInput,
): AnomalyDamageFormulaInput {
  return {
    baseDamage,
    damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
    anomalyProficiency: DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
    defense: DEFAULT_DEFENSE_FACTOR_INPUT,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
    anomalyDamageLevel: DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
    anomalyDamageBonus: DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
    anomalyCritical: DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  }
}

describe("anomalyDamageFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<AnomalyDamageFormulaInput>().toEqualTypeOf<{
      readonly baseDamage: BaseDamageFactorInput
      readonly damageBonus: DamageBonusFactorInput
      readonly anomalyProficiency: AnomalyProficiencyFactorInput
      readonly defense: DefenseFactorInput
      readonly resistance: ResistanceFactorInput
      readonly damageTaken: DamageTakenFactorInput
      readonly stunDamage: StunDamageFactorInput
      readonly anomalyDamageLevel: AnomalyDamageLevelFactorInput
      readonly anomalyDamageBonus: AnomalyDamageBonusFactorInput
      readonly anomalyCritical: AnomalyCriticalFactorInput
    }>()
    expectTypeOf(ANOMALY_DAMAGE_FORMULA_ID).toEqualTypeOf<"anomaly_damage">()
    expectTypeOf(anomalyDamageFormula).toEqualTypeOf<
      Formula<AnomalyDamageFormulaInput>
    >()

    expect(ANOMALY_DAMAGE_FORMULA_ID).toBe("anomaly_damage")
    expect(anomalyDamageFormula.formulaId).toBe(ANOMALY_DAMAGE_FORMULA_ID)
    expect(Object.isFrozen(anomalyDamageFormula)).toBe(true)
  })

  it("uses explicit default inputs as identity multipliers", () => {
    const result = anomalyDamageFormula.calculate(
      createAnomalyDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
    )

    expect(result).toEqual({
      value: 200,
      factorResults: {
        baseDamage: 200,
        damageBonus: 1,
        anomalyProficiency: 1,
        defense: 1,
        resistance: 1,
        damageTaken: 1,
        stunDamage: 1,
        anomalyDamageLevel: 1,
        anomalyDamageBonus: 1,
        anomalyCritical: 1,
      },
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for an empty base damage input", () => {
    expect(
      anomalyDamageFormula.calculate(createAnomalyDamageInput([])),
    ).toEqual({
      value: 0,
      factorResults: {
        baseDamage: 0,
        damageBonus: 1,
        anomalyProficiency: 1,
        defense: 1,
        resistance: 1,
        damageTaken: 1,
        stunDamage: 1,
        anomalyDamageLevel: 1,
        anomalyDamageBonus: 1,
        anomalyCritical: 1,
      },
    })
  })

  it("calculates and returns every factor result without additional rounding", () => {
    const baseDamage = 2 * 100 + 1.5 * 40
    const damageBonus = 1 + (0.25 - 0.05)
    const anomalyProficiency = 125 / 100
    const defense = 50 / (50 + 50)
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const damageTaken = 1 + 0.25 - 0.1
    const stunDamage = 1.5 + 0.25
    const anomalyDamageLevel = Math.trunc(((50 + 58) * 10_000) / 59) / 10_000
    const anomalyDamageBonus = 1 + (0.5 - 0.125)
    const anomalyCritical = 1 + (0.5 + 0.25)
    const input: AnomalyDamageFormulaInput = {
      baseDamage: [
        { damageMultiplier: 2, finalStat: 100 },
        { damageMultiplier: 1.5, finalStat: 40 },
      ],
      damageBonus: [0.25, -0.05],
      anomalyProficiency: 125,
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
      anomalyDamageBonus: [0.5, -0.125],
      anomalyCritical: {
        isAnomalyCritical: true,
        anomalyCriticalDamageContributions: [0.5, 0.25],
      },
    }

    expect(anomalyDamageFormula.calculate(input)).toEqual({
      value:
        baseDamage *
        damageBonus *
        anomalyProficiency *
        defense *
        resistance *
        damageTaken *
        stunDamage *
        anomalyDamageLevel *
        anomalyDamageBonus *
        anomalyCritical,
      factorResults: {
        baseDamage,
        damageBonus,
        anomalyProficiency,
        defense,
        resistance,
        damageTaken,
        stunDamage,
        anomalyDamageLevel,
        anomalyDamageBonus,
        anomalyCritical,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const baseDamageItem = Object.freeze({
      damageMultiplier: 2,
      finalStat: 100,
    })
    const baseDamage = Object.freeze([baseDamageItem])
    const input = Object.freeze(createAnomalyDamageInput(baseDamage))

    anomalyDamageFormula.calculate(input)

    expect(input).toEqual(createAnomalyDamageInput([baseDamageItem]))
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseDamage)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createAnomalyDamageInput([])
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        anomalyDamageFormula.calculate(
          input as unknown as AnomalyDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseDamage",
    "damageBonus",
    "anomalyProficiency",
    "defense",
    "resistance",
    "damageTaken",
    "stunDamage",
    "anomalyDamageLevel",
    "anomalyDamageBonus",
    "anomalyCritical",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createAnomalyDamageInput([
      { damageMultiplier: 2, finalStat: 100 },
    ])
    const missingInput: Partial<AnomalyDamageFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as AnomalyDamageFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        anomalyDamageFormula.calculate(
          input as unknown as AnomalyDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating later factors when base damage is zero", () => {
    const input = {
      ...createAnomalyDamageInput([]),
      anomalyCritical: {
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [NaN],
      },
    }

    expect(() => anomalyDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating later factors when an earlier multiplier is zero", () => {
    const input = {
      ...createAnomalyDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
      damageBonus: [-1],
      anomalyCritical: {
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [NaN],
      },
    }

    expect(() => anomalyDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: AnomalyDamageFormulaInput = {
      ...createAnomalyDamageInput([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
      damageBonus: [1],
      anomalyProficiency: 0,
    }

    expect(() => anomalyDamageFormula.calculate(input)).toThrow(RangeError)
  })
})

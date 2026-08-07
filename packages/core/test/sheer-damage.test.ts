import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  SHEER_DAMAGE_FORMULA_ID,
  sheerDamageFormula,
  type BaseDamageFactorInput,
  type CriticalFactorInput,
  type DamageBonusFactorInput,
  type DamageTakenFactorInput,
  type Formula,
  type ResistanceFactorInput,
  type SheerDamageBonusFactorInput,
  type SheerDamageFormulaInput,
  type StunDamageFactorInput,
} from "../src/index.ts"

function createSheerDamageInput(
  baseDamage: BaseDamageFactorInput,
): SheerDamageFormulaInput {
  return {
    baseDamage,
    damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
    critical: DEFAULT_CRITICAL_FACTOR_INPUT,
    sheerDamageBonus: DEFAULT_SHEER_DAMAGE_BONUS_FACTOR_INPUT,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  }
}

describe("sheerDamageFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SheerDamageFormulaInput>().toEqualTypeOf<{
      readonly baseDamage: BaseDamageFactorInput
      readonly damageBonus: DamageBonusFactorInput
      readonly critical: CriticalFactorInput
      readonly sheerDamageBonus: SheerDamageBonusFactorInput
      readonly resistance: ResistanceFactorInput
      readonly damageTaken: DamageTakenFactorInput
      readonly stunDamage: StunDamageFactorInput
    }>()
    expectTypeOf(SHEER_DAMAGE_FORMULA_ID).toEqualTypeOf<"sheer_damage">()
    expectTypeOf(sheerDamageFormula).toEqualTypeOf<
      Formula<SheerDamageFormulaInput>
    >()

    expect(SHEER_DAMAGE_FORMULA_ID).toBe("sheer_damage")
    expect(sheerDamageFormula.formulaId).toBe(SHEER_DAMAGE_FORMULA_ID)
    expect(Object.isFrozen(sheerDamageFormula)).toBe(true)
  })

  it("uses explicit default inputs as identity multipliers", () => {
    const result = sheerDamageFormula.calculate(
      createSheerDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
    )

    expect(result).toEqual({
      value: 200,
      factorResults: {
        baseDamage: 200,
        damageBonus: 1,
        critical: 1,
        sheerDamageBonus: 1,
        resistance: 1,
        damageTaken: 1,
        stunDamage: 1,
      },
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for an empty base damage input", () => {
    expect(sheerDamageFormula.calculate(createSheerDamageInput([]))).toEqual({
      value: 0,
      factorResults: {
        baseDamage: 0,
        damageBonus: 1,
        critical: 1,
        sheerDamageBonus: 1,
        resistance: 1,
        damageTaken: 1,
        stunDamage: 1,
      },
    })
  })

  it("calculates and returns every factor result without rounding", () => {
    const baseDamage = 2 * 100 + 1.5 * 40
    const damageBonus = 1 + (0.25 - 0.05)
    const critical = 1 + (0.5 + 0.25)
    const sheerDamageBonus = 1 + (0.5 - 0.125)
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const damageTaken = 1 + 0.25 - 0.1
    const stunDamage = 1.5 + 0.25
    const input: SheerDamageFormulaInput = {
      baseDamage: [
        { damageMultiplier: 2, finalStat: 100 },
        { damageMultiplier: 1.5, finalStat: 40 },
      ],
      damageBonus: [0.25, -0.05],
      critical: {
        isCritical: true,
        criticalDamageContributions: [0.5, 0.25],
      },
      sheerDamageBonus: [0.5, -0.125],
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
    }

    expect(sheerDamageFormula.calculate(input)).toEqual({
      value:
        baseDamage *
        damageBonus *
        critical *
        sheerDamageBonus *
        resistance *
        damageTaken *
        stunDamage,
      factorResults: {
        baseDamage,
        damageBonus,
        critical,
        sheerDamageBonus,
        resistance,
        damageTaken,
        stunDamage,
      },
    })
  })

  it("does not modify the formula input or nested factor inputs", () => {
    const baseDamageItem = Object.freeze({
      damageMultiplier: 2,
      finalStat: 100,
    })
    const baseDamage = Object.freeze([baseDamageItem])
    const input = Object.freeze(createSheerDamageInput(baseDamage))

    sheerDamageFormula.calculate(input)

    expect(input).toEqual(createSheerDamageInput([baseDamageItem]))
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseDamage)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createSheerDamageInput([])
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        sheerDamageFormula.calculate(
          input as unknown as SheerDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseDamage",
    "damageBonus",
    "critical",
    "sheerDamageBonus",
    "resistance",
    "damageTaken",
    "stunDamage",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const completeInput = createSheerDamageInput([
      { damageMultiplier: 2, finalStat: 100 },
    ])
    const missingInput: Partial<SheerDamageFormulaInput> = {
      ...completeInput,
    }
    const undefinedInput = {
      ...completeInput,
      [field]: undefined,
    } as unknown as SheerDamageFormulaInput

    delete missingInput[field]

    for (const input of [missingInput, undefinedInput]) {
      expect(() =>
        sheerDamageFormula.calculate(
          input as unknown as SheerDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it("does not stop validating later factors when base damage is zero", () => {
    const input = {
      ...createSheerDamageInput([]),
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [NaN],
      },
    }

    expect(() => sheerDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating later factors when an earlier multiplier is zero", () => {
    const input = {
      ...createSheerDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
      damageBonus: [-1],
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [NaN],
      },
    }

    expect(() => sheerDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: SheerDamageFormulaInput = {
      ...createSheerDamageInput([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
      damageBonus: [1],
      sheerDamageBonus: [-1],
    }

    expect(() => sheerDamageFormula.calculate(input)).toThrow(RangeError)
  })
})

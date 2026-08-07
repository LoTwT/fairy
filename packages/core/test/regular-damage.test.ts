import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_CRITICAL_FACTOR_INPUT,
  DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  REGULAR_DAMAGE_FORMULA_ID,
  regularDamageFormula,
  type BaseDamageFactorInput,
  type CriticalFactorInput,
  type DamageBonusFactorInput,
  type DamageTakenFactorInput,
  type DefenseFactorInput,
  type Formula,
  type RegularDamageFormulaInput,
  type ResistanceFactorInput,
  type StunDamageFactorInput,
} from "../src/index.ts"

function createRegularDamageInput(
  baseDamage: BaseDamageFactorInput,
): RegularDamageFormulaInput {
  return {
    baseDamage,
    damageBonus: DEFAULT_DAMAGE_BONUS_FACTOR_INPUT,
    critical: DEFAULT_CRITICAL_FACTOR_INPUT,
    defense: DEFAULT_DEFENSE_FACTOR_INPUT,
    resistance: DEFAULT_RESISTANCE_FACTOR_INPUT,
    damageTaken: DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
    stunDamage: DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  }
}

describe("regularDamageFormula", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<RegularDamageFormulaInput>().toEqualTypeOf<{
      readonly baseDamage: BaseDamageFactorInput
      readonly damageBonus: DamageBonusFactorInput
      readonly critical: CriticalFactorInput
      readonly defense: DefenseFactorInput
      readonly resistance: ResistanceFactorInput
      readonly damageTaken: DamageTakenFactorInput
      readonly stunDamage: StunDamageFactorInput
    }>()
    expectTypeOf(REGULAR_DAMAGE_FORMULA_ID).toEqualTypeOf<"regular_damage">()
    expectTypeOf(regularDamageFormula).toEqualTypeOf<
      Formula<RegularDamageFormulaInput>
    >()

    expect(REGULAR_DAMAGE_FORMULA_ID).toBe("regular_damage")
    expect(regularDamageFormula.formulaId).toBe(REGULAR_DAMAGE_FORMULA_ID)
    expect(Object.isFrozen(regularDamageFormula)).toBe(true)
  })

  it("uses explicit default inputs as identity multipliers", () => {
    const result = regularDamageFormula.calculate(
      createRegularDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
    )

    expect(result).toEqual({
      value: 200,
      factorResults: {
        baseDamage: 200,
        damageBonus: 1,
        critical: 1,
        defense: 1,
        resistance: 1,
        damageTaken: 1,
        stunDamage: 1,
      },
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.factorResults)).toBe(true)
  })

  it("returns zero with complete factor results for an empty base damage input", () => {
    expect(
      regularDamageFormula.calculate(createRegularDamageInput([])),
    ).toEqual({
      value: 0,
      factorResults: {
        baseDamage: 0,
        damageBonus: 1,
        critical: 1,
        defense: 1,
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
    const defense = 50 / (50 + 50)
    const resistance = 1 - 0.2 + 0.1 + 0.05
    const damageTaken = 1 + 0.25 - 0.1
    const stunDamage = 1.5 + 0.25
    const input: RegularDamageFormulaInput = {
      baseDamage: [
        { damageMultiplier: 2, finalStat: 100 },
        { damageMultiplier: 1.5, finalStat: 40 },
      ],
      damageBonus: [0.25, -0.05],
      critical: {
        isCritical: true,
        criticalDamageContributions: [0.5, 0.25],
      },
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
    }

    expect(regularDamageFormula.calculate(input)).toEqual({
      value:
        baseDamage *
        damageBonus *
        critical *
        defense *
        resistance *
        damageTaken *
        stunDamage,
      factorResults: {
        baseDamage,
        damageBonus,
        critical,
        defense,
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
    const input = Object.freeze(createRegularDamageInput(baseDamage))

    regularDamageFormula.calculate(input)

    expect(input).toEqual(createRegularDamageInput([baseDamageItem]))
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(baseDamage)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createRegularDamageInput([])
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        regularDamageFormula.calculate(
          input as unknown as RegularDamageFormulaInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseDamage",
    "damageBonus",
    "critical",
    "defense",
    "resistance",
    "damageTaken",
    "stunDamage",
  ] as const)("rejects a missing or undefined %s input", (field) => {
    const input = {
      ...createRegularDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
      [field]: undefined,
    } as unknown as RegularDamageFormulaInput

    expect(() => regularDamageFormula.calculate(input)).toThrow(TypeError)
  })

  it("does not stop validating later factors when base damage is zero", () => {
    const input = {
      ...createRegularDamageInput([]),
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [NaN],
      },
    }

    expect(() => regularDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("does not stop validating later factors when an earlier multiplier is zero", () => {
    const input = {
      ...createRegularDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
      damageBonus: [-1],
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [NaN],
      },
    }

    expect(() => regularDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: RegularDamageFormulaInput = {
      ...createRegularDamageInput([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
      damageBonus: [5],
      defense: {
        attackerLevelBase: 1,
        targetEffectiveDefense: 5,
      },
    }

    expect(() => regularDamageFormula.calculate(input)).toThrow(RangeError)
  })
})

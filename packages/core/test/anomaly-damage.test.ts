import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ANOMALY_DAMAGE_FORMULA_ID,
  DEFAULT_ANOMALY_CRITICAL_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT,
  DEFAULT_ANOMALY_PROFICIENCY_FACTOR_INPUT,
  DEFAULT_DAMAGE_TAKEN_FACTOR_INPUT,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFAULT_RESISTANCE_FACTOR_INPUT,
  DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  anomalyDamageFormula,
  calculateStandardDisorderDamageMultiplier,
  type AnomalyCriticalFactorInput,
  type AnomalyDamageBonusFactorInput,
  type AnomalyDamageFormulaInput,
  type AnomalyDamageLevelFactorInput,
  type AnomalyProficiencyFactorInput,
  type BaseDamageFactorInput,
  type CalculateStandardDisorderDamageMultiplierParams,
  type DamageTakenFactorInput,
  type DefenseFactorInput,
  type DisorderSourceAttribute,
  type Formula,
  type ResistanceFactorInput,
  type SettledDamageBonusFactorInput,
  type StunDamageFactorInput,
} from "../src/index.ts"

function createAnomalyDamageInput(
  baseDamage: BaseDamageFactorInput,
): AnomalyDamageFormulaInput {
  return {
    baseDamage,
    damageBonus: DEFAULT_SETTLED_DAMAGE_BONUS_FACTOR_INPUT,
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
      readonly damageBonus: SettledDamageBonusFactorInput
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
    const damageBonus = 1.2
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
      damageBonus,
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
      damageBonus: 0,
      anomalyCritical: {
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [NaN],
      },
    }

    expect(() => anomalyDamageFormula.calculate(input)).toThrow(RangeError)
  })

  it("rejects an unsettled damage bonus contribution array", () => {
    const input = {
      ...createAnomalyDamageInput([{ damageMultiplier: 2, finalStat: 100 }]),
      damageBonus: [0.2],
    }

    expect(() =>
      anomalyDamageFormula.calculate(
        input as unknown as AnomalyDamageFormulaInput,
      ),
    ).toThrow(TypeError)
  })

  it("preserves multiplication order and rejects an overflowing final value", () => {
    const input: AnomalyDamageFormulaInput = {
      ...createAnomalyDamageInput([
        { damageMultiplier: 1, finalStat: Number.MAX_VALUE },
      ]),
      damageBonus: 2,
      anomalyProficiency: 0,
    }

    expect(() => anomalyDamageFormula.calculate(input)).toThrow(RangeError)
  })
})

describe("calculateStandardDisorderDamageMultiplier", () => {
  it("exposes its public parameter and function types", () => {
    expectTypeOf<DisorderSourceAttribute>().toEqualTypeOf<
      "fire" | "electric" | "ether" | "ice" | "physical" | "auric_ink" | "frost"
    >()
    expectTypeOf<CalculateStandardDisorderDamageMultiplierParams>().toEqualTypeOf<{
      readonly originalAnomalyAttribute: DisorderSourceAttribute
      readonly remainingAnomalyDurationInSeconds: number
    }>()
    expectTypeOf(calculateStandardDisorderDamageMultiplier).toEqualTypeOf<
      (params: CalculateStandardDisorderDamageMultiplierParams) => number
    >()
  })

  it.each([
    ["fire", 10, 14.5],
    ["electric", 10, 17],
    ["ether", 10, 17],
    ["ice", 10, 5.25],
    ["physical", 10, 5.25],
    ["auric_ink", 10, 17],
    ["frost", 20, 21],
  ] as const)(
    "calculates the %s standard multiplier at a representative duration",
    (originalAnomalyAttribute, remainingAnomalyDurationInSeconds, expected) => {
      expect(
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds,
        }),
      ).toBe(expected)
    },
  )

  it.each([
    ["fire", 0.5 - Number.EPSILON, 4.5],
    ["fire", 0.5, 5],
    ["electric", 1 - Number.EPSILON, 4.5],
    ["electric", 1, 5.75],
    ["ether", 0.5 - Number.EPSILON, 4.5],
    ["ether", 0.5, 5.125],
    ["ice", 1 - Number.EPSILON, 4.5],
    ["ice", 1, 4.575],
    ["physical", 1 - Number.EPSILON, 4.5],
    ["physical", 1, 4.575],
    ["auric_ink", 0.5 - Number.EPSILON, 4.5],
    ["auric_ink", 0.5, 5.125],
    ["frost", 1 - Number.EPSILON, 6],
    ["frost", 1, 6.75],
  ] as const)(
    "preserves the %s duration step at %s seconds",
    (originalAnomalyAttribute, remainingAnomalyDurationInSeconds, expected) => {
      expect(
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds,
        }),
      ).toBe(expected)
    },
  )

  it.each([
    ["fire", 4.5],
    ["electric", 4.5],
    ["ether", 4.5],
    ["ice", 4.5],
    ["physical", 4.5],
    ["auric_ink", 4.5],
    ["frost", 6],
  ] as const)(
    "returns the %s constant part when no duration remains",
    (originalAnomalyAttribute, expected) => {
      expect(
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds: 0,
        }),
      ).toBe(expected)
    },
  )

  it("uses the actual duration without capping it to the initial duration", () => {
    expect(
      calculateStandardDisorderDamageMultiplier({
        originalAnomalyAttribute: "fire",
        remainingAnomalyDurationInSeconds: 12,
      }),
    ).toBe(16.5)
    expect(
      calculateStandardDisorderDamageMultiplier({
        originalAnomalyAttribute: "frost",
        remainingAnomalyDurationInSeconds: 25,
      }),
    ).toBe(24.75)
  })

  it("produces a multiplier that composes with the base damage factor", () => {
    const damageMultiplier = calculateStandardDisorderDamageMultiplier({
      originalAnomalyAttribute: "fire",
      remainingAnomalyDurationInSeconds: 10,
    })
    const result = anomalyDamageFormula.calculate(
      createAnomalyDamageInput([{ damageMultiplier, finalStat: 100 }]),
    )

    expect(result.value).toBe(1_450)
    expect(result.factorResults.baseDamage).toBe(1_450)
  })

  it("does not modify its parameter object", () => {
    const params = Object.freeze({
      originalAnomalyAttribute: "electric" as const,
      remainingAnomalyDurationInSeconds: 10,
    })

    expect(calculateStandardDisorderDamageMultiplier(params)).toBe(17)
    expect(params).toEqual({
      originalAnomalyAttribute: "electric",
      remainingAnomalyDurationInSeconds: 10,
    })
    expect(Object.isFrozen(params)).toBe(true)
  })

  it("rejects parameters that are not non-array objects", () => {
    const fields = {
      originalAnomalyAttribute: "fire",
      remainingAnomalyDurationInSeconds: 10,
    }
    const invalidParams = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const params of invalidParams) {
      expect(() =>
        calculateStandardDisorderDamageMultiplier(
          params as unknown as CalculateStandardDisorderDamageMultiplierParams,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([undefined, null, 1, true])(
    "rejects the non-string source attribute %s",
    (originalAnomalyAttribute) => {
      expect(() =>
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds: 10,
        } as unknown as CalculateStandardDisorderDamageMultiplierParams),
      ).toThrow(TypeError)
    },
  )

  it.each(["", "wind", "honed_edge", "Fire", "unknown"])(
    "rejects the unsupported source attribute %s",
    (originalAnomalyAttribute) => {
      expect(() =>
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute,
          remainingAnomalyDurationInSeconds: 10,
        } as CalculateStandardDisorderDamageMultiplierParams),
      ).toThrow(RangeError)
    },
  )

  it.each([undefined, null, "10", true])(
    "rejects the non-number remaining duration %s",
    (remainingAnomalyDurationInSeconds) => {
      expect(() =>
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute: "fire",
          remainingAnomalyDurationInSeconds,
        } as unknown as CalculateStandardDisorderDamageMultiplierParams),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, -1])(
    "rejects the invalid remaining duration %s",
    (remainingAnomalyDurationInSeconds) => {
      expect(() =>
        calculateStandardDisorderDamageMultiplier({
          originalAnomalyAttribute: "fire",
          remainingAnomalyDurationInSeconds,
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects a non-finite calculated multiplier", () => {
    expect(() =>
      calculateStandardDisorderDamageMultiplier({
        originalAnomalyAttribute: "fire",
        remainingAnomalyDurationInSeconds: Number.MAX_VALUE,
      }),
    ).toThrow(RangeError)
  })
})

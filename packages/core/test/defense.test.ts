import { describe, expect, expectTypeOf, it } from "vitest"
import {
  calculateDefenseLevelBase,
  calculateTargetBaseDefense,
  calculateTargetEffectiveDefense,
  DEFAULT_DEFENSE_FACTOR_INPUT,
  DEFENSE_FACTOR_ID,
  defenseFactor,
  type CalculateTargetBaseDefenseParams,
  type CalculateTargetEffectiveDefenseParams,
  type DefenseFactorInput,
  type Factor,
} from "../src/index.ts"

const LEVEL_BASES_BELOW_SIXTY = [
  50, 54, 58, 62, 66, 71, 76, 82, 88, 94, 100, 107, 114, 121, 129, 137, 145,
  153, 162, 172, 181, 191, 201, 211, 222, 233, 245, 256, 268, 281, 293, 306,
  319, 333, 347, 361, 375, 390, 405, 421, 436, 452, 469, 485, 502, 519, 537,
  555, 573, 592, 610, 629, 649, 669, 689, 709, 730, 751, 772,
] as const

describe("defenseFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<DefenseFactorInput>().toEqualTypeOf<{
      readonly attackerLevelBase: number
      readonly targetEffectiveDefense: number
    }>()
    expectTypeOf(DEFENSE_FACTOR_ID).toEqualTypeOf<"defense">()
    expectTypeOf(
      DEFAULT_DEFENSE_FACTOR_INPUT,
    ).toEqualTypeOf<DefenseFactorInput>()
    expectTypeOf(defenseFactor).toEqualTypeOf<Factor<DefenseFactorInput>>()

    expect(DEFENSE_FACTOR_ID).toBe("defense")
    expect(defenseFactor.factorId).toBe(DEFENSE_FACTOR_ID)
    expect(Object.isFrozen(defenseFactor)).toBe(true)
  })

  it("provides a frozen default input with an identity result", () => {
    expect(DEFAULT_DEFENSE_FACTOR_INPUT).toEqual({
      attackerLevelBase: 50,
      targetEffectiveDefense: 0,
    })
    expect(Object.isFrozen(DEFAULT_DEFENSE_FACTOR_INPUT)).toBe(true)
    expect(defenseFactor.calculate(DEFAULT_DEFENSE_FACTOR_INPUT)).toBe(1)
  })

  it("calculates the defense multiplier without rounding", () => {
    const attackerLevelBase = 794
    const targetEffectiveDefense = 952.8

    expect(
      defenseFactor.calculate({
        attackerLevelBase,
        targetEffectiveDefense,
      }),
    ).toBe(attackerLevelBase / (targetEffectiveDefense + attackerLevelBase))
  })

  it("returns one when target effective defense is zero", () => {
    expect(
      defenseFactor.calculate({
        attackerLevelBase: 794,
        targetEffectiveDefense: 0,
      }),
    ).toBe(1)
  })

  it("accepts values calculated by the companion helpers", () => {
    const attackerLevelBase = calculateDefenseLevelBase(60)
    const targetLevelBase = calculateDefenseLevelBase(60)
    const targetBaseDefense = calculateTargetBaseDefense({
      targetLevelBase,
      targetLevelOneBaseDefense: 60,
    })
    const targetEffectiveDefense = calculateTargetEffectiveDefense({
      targetBaseDefense,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [],
    })

    expect(
      defenseFactor.calculate({
        attackerLevelBase,
        targetEffectiveDefense,
      }),
    ).toBe(794 / (952.8 + 794))
  })

  it("does not modify its input", () => {
    const input = Object.freeze({
      attackerLevelBase: 794,
      targetEffectiveDefense: 952.8,
    })

    defenseFactor.calculate(input)

    expect(input).toEqual({
      attackerLevelBase: 794,
      targetEffectiveDefense: 952.8,
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      attackerLevelBase: 794,
      targetEffectiveDefense: 952.8,
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        defenseFactor.calculate(input as unknown as DefenseFactorInput),
      ).toThrow(TypeError)
    }
  })

  describe.each(["attackerLevelBase", "targetEffectiveDefense"] as const)(
    "%s validation",
    (field) => {
      it("rejects a non-number value", () => {
        const input = {
          attackerLevelBase: 794,
          targetEffectiveDefense: 952.8,
          [field]: "1",
        } as unknown as DefenseFactorInput

        expect(() => defenseFactor.calculate(input)).toThrow(TypeError)
      })

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite value %s",
        (value) => {
          const input = {
            attackerLevelBase: 794,
            targetEffectiveDefense: 952.8,
            [field]: value,
          }

          expect(() => defenseFactor.calculate(input)).toThrow(RangeError)
        },
      )
    },
  )

  it.each([0, -1])(
    "rejects the non-positive attacker level base %s",
    (value) => {
      expect(() =>
        defenseFactor.calculate({
          attackerLevelBase: value,
          targetEffectiveDefense: 0,
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects a negative target effective defense", () => {
    expect(() =>
      defenseFactor.calculate({
        attackerLevelBase: 794,
        targetEffectiveDefense: -1,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a result outside the open-closed range from zero to one", () => {
    expect(() =>
      defenseFactor.calculate({
        attackerLevelBase: Number.MAX_VALUE,
        targetEffectiveDefense: Number.MAX_VALUE,
      }),
    ).toThrow(RangeError)
  })
})

describe("calculateDefenseLevelBase", () => {
  it("exposes its public function type", () => {
    expectTypeOf(calculateDefenseLevelBase).toEqualTypeOf<
      (level: number) => number
    >()
  })

  it.each(
    LEVEL_BASES_BELOW_SIXTY.map(
      (levelBase, index) => [index + 1, levelBase] as const,
    ),
  )("returns %s level's fixed base", (level, levelBase) => {
    expect(calculateDefenseLevelBase(level)).toBe(levelBase)
  })

  it.each([60, 61, 100])("returns the capped base for level %s", (level) => {
    expect(calculateDefenseLevelBase(level)).toBe(794)
  })

  it("rejects a non-number level", () => {
    expect(() => calculateDefenseLevelBase("60" as unknown as number)).toThrow(
      TypeError,
    )
  })

  it.each([NaN, Infinity, -Infinity, 0, -1, 1.5])(
    "rejects the invalid level %s",
    (level) => {
      expect(() => calculateDefenseLevelBase(level)).toThrow(RangeError)
    },
  )
})

describe("calculateTargetBaseDefense", () => {
  it("exposes its public parameter and function types", () => {
    expectTypeOf<CalculateTargetBaseDefenseParams>().toEqualTypeOf<{
      readonly targetLevelBase: number
      readonly targetLevelOneBaseDefense: number
    }>()
    expectTypeOf(calculateTargetBaseDefense).toEqualTypeOf<
      (params: CalculateTargetBaseDefenseParams) => number
    >()
  })

  it("calculates target base defense without rounding", () => {
    expect(
      calculateTargetBaseDefense({
        targetLevelBase: 794,
        targetLevelOneBaseDefense: 60,
      }),
    ).toBe((60 / 50) * 794)
  })

  it("accepts zero target level one base defense", () => {
    expect(
      calculateTargetBaseDefense({
        targetLevelBase: 794,
        targetLevelOneBaseDefense: 0,
      }),
    ).toBe(0)
  })

  it("does not impose an unconfirmed finite upper bound", () => {
    expect(
      calculateTargetBaseDefense({
        targetLevelBase: Number.MAX_VALUE,
        targetLevelOneBaseDefense: 50,
      }),
    ).toBe(Number.MAX_VALUE)
  })

  it("does not modify its parameters", () => {
    const params = Object.freeze({
      targetLevelBase: 794,
      targetLevelOneBaseDefense: 60,
    })

    calculateTargetBaseDefense(params)

    expect(params).toEqual({
      targetLevelBase: 794,
      targetLevelOneBaseDefense: 60,
    })
  })

  it("rejects parameters that are not non-array objects", () => {
    const fields = {
      targetLevelBase: 794,
      targetLevelOneBaseDefense: 60,
    }
    const invalidParams = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const params of invalidParams) {
      expect(() =>
        calculateTargetBaseDefense(
          params as unknown as CalculateTargetBaseDefenseParams,
        ),
      ).toThrow(TypeError)
    }
  })

  describe.each(["targetLevelBase", "targetLevelOneBaseDefense"] as const)(
    "%s validation",
    (field) => {
      it("rejects a non-number value", () => {
        const params = {
          targetLevelBase: 794,
          targetLevelOneBaseDefense: 60,
          [field]: "1",
        } as unknown as CalculateTargetBaseDefenseParams

        expect(() => calculateTargetBaseDefense(params)).toThrow(TypeError)
      })

      it.each([NaN, Infinity, -Infinity])(
        "rejects the non-finite value %s",
        (value) => {
          const params = {
            targetLevelBase: 794,
            targetLevelOneBaseDefense: 60,
            [field]: value,
          }

          expect(() => calculateTargetBaseDefense(params)).toThrow(RangeError)
        },
      )
    },
  )

  it.each([0, -1])("rejects the non-positive target level base %s", (value) => {
    expect(() =>
      calculateTargetBaseDefense({
        targetLevelBase: value,
        targetLevelOneBaseDefense: 60,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a negative target level one base defense", () => {
    expect(() =>
      calculateTargetBaseDefense({
        targetLevelBase: 794,
        targetLevelOneBaseDefense: -1,
      }),
    ).toThrow(RangeError)
  })

  it("rejects a non-finite result caused by multiplication overflow", () => {
    expect(() =>
      calculateTargetBaseDefense({
        targetLevelBase: Number.MAX_VALUE,
        targetLevelOneBaseDefense: 100,
      }),
    ).toThrow(RangeError)
  })
})

describe("calculateTargetEffectiveDefense", () => {
  it("exposes its public parameter and function types", () => {
    expectTypeOf<CalculateTargetEffectiveDefenseParams>().toEqualTypeOf<{
      readonly targetBaseDefense: number
      readonly defensePercentageAdjustments: readonly number[]
      readonly penetrationRatios: readonly number[]
      readonly penetrationValues: readonly number[]
    }>()
    expectTypeOf(calculateTargetEffectiveDefense).toEqualTypeOf<
      (params: CalculateTargetEffectiveDefenseParams) => number
    >()
  })

  it("returns target base defense when all adjustment arrays are empty", () => {
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 952.8,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toBe(952.8)
  })

  it("calculates signed adjustments without rounding", () => {
    const targetBaseDefense = 1000
    const defensePercentageAdjustments = [-0.3, 0.1]
    const penetrationRatios = [0.2, -0.05]
    const penetrationValues = [20, -5]

    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense,
        defensePercentageAdjustments,
        penetrationRatios,
        penetrationValues,
      }),
    ).toBe(
      targetBaseDefense * (1 + (-0.3 + 0.1)) * (1 - (0.2 + -0.05)) - (20 + -5),
    )
  })

  it("counts duplicate adjustments independently", () => {
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 100,
        defensePercentageAdjustments: [0.1, 0.1],
        penetrationRatios: [0.1, 0.1],
        penetrationValues: [10, 10],
      }),
    ).toBe(100 * (1 + (0.1 + 0.1)) * (1 - (0.1 + 0.1)) - (10 + 10))
  })

  it("sums defense percentage adjustments in array order", () => {
    const largeValue = 2 ** 53

    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 1,
        defensePercentageAdjustments: [largeValue, -largeValue, 1],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toBe(2)
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 1,
        defensePercentageAdjustments: [largeValue, 1, -largeValue],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toBe(1)
  })

  it("sums penetration ratios in array order", () => {
    const largeValue = 2 ** 53

    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 1,
        defensePercentageAdjustments: [],
        penetrationRatios: [largeValue, -largeValue, 1],
        penetrationValues: [],
      }),
    ).toBe(0)
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 1,
        defensePercentageAdjustments: [],
        penetrationRatios: [largeValue, 1, -largeValue],
        penetrationValues: [],
      }),
    ).toBe(1)
  })

  it("sums penetration values in array order", () => {
    const largeValue = 2 ** 53

    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 10,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [largeValue, -largeValue, 1],
      }),
    ).toBe(9)
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 10,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [largeValue, 1, -largeValue],
      }),
    ).toBe(10)
  })

  it("clamps a negative effective defense to zero", () => {
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 100,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [150],
      }),
    ).toBe(0)
  })

  it("accepts a negative defense adjustment multiplier and clamps its result", () => {
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: 100,
        defensePercentageAdjustments: [-2],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toBe(0)
  })

  it("does not impose an unconfirmed finite upper bound", () => {
    expect(
      calculateTargetEffectiveDefense({
        targetBaseDefense: Number.MAX_VALUE,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toBe(Number.MAX_VALUE)
  })

  it("does not modify its parameters or adjustment arrays", () => {
    const defensePercentageAdjustments = Object.freeze([-0.3, 0.1])
    const penetrationRatios = Object.freeze([0.2, -0.05])
    const penetrationValues = Object.freeze([20, -5])
    const params = Object.freeze({
      targetBaseDefense: 1000,
      defensePercentageAdjustments,
      penetrationRatios,
      penetrationValues,
    })

    calculateTargetEffectiveDefense(params)

    expect(params).toEqual({
      targetBaseDefense: 1000,
      defensePercentageAdjustments: [-0.3, 0.1],
      penetrationRatios: [0.2, -0.05],
      penetrationValues: [20, -5],
    })
  })

  it("rejects parameters that are not non-array objects", () => {
    const fields = {
      targetBaseDefense: 100,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [],
    }
    const invalidParams = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const params of invalidParams) {
      expect(() =>
        calculateTargetEffectiveDefense(
          params as unknown as CalculateTargetEffectiveDefenseParams,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "defensePercentageAdjustments",
    "penetrationRatios",
    "penetrationValues",
  ] as const)("rejects a non-array %s field", (field) => {
    const params = {
      targetBaseDefense: 100,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [],
      [field]: new Set([0.1]),
    } as unknown as CalculateTargetEffectiveDefenseParams

    expect(() => calculateTargetEffectiveDefense(params)).toThrow(TypeError)
  })

  it("rejects a non-number target base defense", () => {
    const params = {
      targetBaseDefense: "100",
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [],
    } as unknown as CalculateTargetEffectiveDefenseParams

    expect(() => calculateTargetEffectiveDefense(params)).toThrow(TypeError)
  })

  it.each([
    "defensePercentageAdjustments",
    "penetrationRatios",
    "penetrationValues",
  ] as const)("rejects a non-number %s entry", (field) => {
    const params = {
      targetBaseDefense: 100,
      defensePercentageAdjustments: [],
      penetrationRatios: [],
      penetrationValues: [],
      [field]: ["0.1"],
    } as unknown as CalculateTargetEffectiveDefenseParams

    expect(() => calculateTargetEffectiveDefense(params)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite target base defense %s",
    (targetBaseDefense) => {
      expect(() =>
        calculateTargetEffectiveDefense({
          targetBaseDefense,
          defensePercentageAdjustments: [],
          penetrationRatios: [],
          penetrationValues: [],
        }),
      ).toThrow(RangeError)
    },
  )

  it.each([
    "defensePercentageAdjustments",
    "penetrationRatios",
    "penetrationValues",
  ] as const)("rejects a non-finite %s entry", (field) => {
    for (const value of [NaN, Infinity, -Infinity]) {
      const params = {
        targetBaseDefense: 100,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [],
        [field]: [value],
      }

      expect(() => calculateTargetEffectiveDefense(params)).toThrow(RangeError)
    }
  })

  it("rejects a negative target base defense", () => {
    expect(() =>
      calculateTargetEffectiveDefense({
        targetBaseDefense: -1,
        defensePercentageAdjustments: [],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toThrow(RangeError)
  })

  it.each([
    [
      "defense percentage adjustment",
      [Number.MAX_VALUE, Number.MAX_VALUE],
      [],
      [],
    ],
    ["penetration ratio", [], [Number.MAX_VALUE, Number.MAX_VALUE], []],
    ["penetration value", [], [], [Number.MAX_VALUE, Number.MAX_VALUE]],
  ] as const)(
    "rejects an unclamped result made non-finite by %s overflow",
    (
      _name,
      defensePercentageAdjustments,
      penetrationRatios,
      penetrationValues,
    ) => {
      expect(() =>
        calculateTargetEffectiveDefense({
          targetBaseDefense: 1,
          defensePercentageAdjustments,
          penetrationRatios,
          penetrationValues,
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects an unclamped result made non-finite by multiplication", () => {
    expect(() =>
      calculateTargetEffectiveDefense({
        targetBaseDefense: Number.MAX_VALUE,
        defensePercentageAdjustments: [1],
        penetrationRatios: [],
        penetrationValues: [],
      }),
    ).toThrow(RangeError)
  })
})

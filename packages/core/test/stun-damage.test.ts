import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
  STUN_DAMAGE_FACTOR_ID,
  stunDamageFactor,
  type Factor,
  type StunDamageFactorInput,
} from "../src/index.ts"

describe("stunDamageFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<StunDamageFactorInput>().toEqualTypeOf<{
      readonly isTargetStunned: boolean
      readonly targetBaseStunDamageMultiplier: number
      readonly targetStunDamageMultiplierAdjustments: readonly number[]
    }>()
    expectTypeOf(STUN_DAMAGE_FACTOR_ID).toEqualTypeOf<"stun_damage">()
    expectTypeOf(
      DEFAULT_STUN_DAMAGE_FACTOR_INPUT,
    ).toEqualTypeOf<StunDamageFactorInput>()
    expectTypeOf(stunDamageFactor).toEqualTypeOf<
      Factor<StunDamageFactorInput>
    >()

    expect(STUN_DAMAGE_FACTOR_ID).toBe("stun_damage")
    expect(stunDamageFactor.factorId).toBe(STUN_DAMAGE_FACTOR_ID)
    expect(Object.isFrozen(stunDamageFactor)).toBe(true)
  })

  it("provides a deeply frozen default input with an identity result", () => {
    expect(DEFAULT_STUN_DAMAGE_FACTOR_INPUT).toEqual({
      isTargetStunned: false,
      targetBaseStunDamageMultiplier: 1,
      targetStunDamageMultiplierAdjustments: [],
    })
    expect(Object.isFrozen(DEFAULT_STUN_DAMAGE_FACTOR_INPUT)).toBe(true)
    expect(
      Object.isFrozen(
        DEFAULT_STUN_DAMAGE_FACTOR_INPUT.targetStunDamageMultiplierAdjustments,
      ),
    ).toBe(true)
    expect(stunDamageFactor.calculate(DEFAULT_STUN_DAMAGE_FACTOR_INPUT)).toBe(1)
  })

  it.each([true, false])(
    "uses the base multiplier directly when isTargetStunned is %s",
    (isTargetStunned) => {
      expect(
        stunDamageFactor.calculate({
          isTargetStunned,
          targetBaseStunDamageMultiplier: 1.5,
          targetStunDamageMultiplierAdjustments: [],
        }),
      ).toBe(1.5)
    },
  )

  it.each([true, false])(
    "adds signed adjustments without merging duplicates when isTargetStunned is %s",
    (isTargetStunned) => {
      expect(
        stunDamageFactor.calculate({
          isTargetStunned,
          targetBaseStunDamageMultiplier: 1.5,
          targetStunDamageMultiplierAdjustments: [0.25, 0.25, -0.125, -0.125],
        }),
      ).toBe(1.75)
    },
  )

  it("sums adjustments in array order", () => {
    const smallValue = Number.EPSILON / 4

    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [
          smallValue,
          smallValue,
          smallValue,
          smallValue,
          0.5,
        ],
      }),
    ).toBe(1.5 + Number.EPSILON)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [
          0.5,
          smallValue,
          smallValue,
          smallValue,
          smallValue,
        ],
      }),
    ).toBe(1.5)
  })

  it("does not round a valid result", () => {
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.123456789,
        targetStunDamageMultiplierAdjustments: [0.000000001],
      }),
    ).toBe(1.12345679)
  })

  it("clamps the stunned result to the inclusive range [0.2, 5]", () => {
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 0.2,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toBe(0.2)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 0,
        targetStunDamageMultiplierAdjustments: [-1],
      }),
    ).toBe(0.2)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 5,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toBe(5)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 6,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toBe(5)
  })

  it("clamps the unstunned result to the inclusive range [1, 3]", () => {
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toBe(1)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 0,
        targetStunDamageMultiplierAdjustments: [-1],
      }),
    ).toBe(1)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 3,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toBe(3)
    expect(
      stunDamageFactor.calculate({
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 4,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toBe(3)
  })

  it("does not modify its input or adjustment array", () => {
    const targetStunDamageMultiplierAdjustments = Object.freeze([0.25, -0.125])
    const input = Object.freeze({
      isTargetStunned: true,
      targetBaseStunDamageMultiplier: 1.5,
      targetStunDamageMultiplierAdjustments,
    })

    expect(stunDamageFactor.calculate(input)).toBe(1.625)
    expect(input).toEqual({
      isTargetStunned: true,
      targetBaseStunDamageMultiplier: 1.5,
      targetStunDamageMultiplierAdjustments: [0.25, -0.125],
    })
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = {
      isTargetStunned: true,
      targetBaseStunDamageMultiplier: 1.5,
      targetStunDamageMultiplierAdjustments: [],
    }
    const invalidInputs = [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]

    for (const input of invalidInputs) {
      expect(() =>
        stunDamageFactor.calculate(input as unknown as StunDamageFactorInput),
      ).toThrow(TypeError)
    }
  })

  it("rejects a non-boolean isTargetStunned value", () => {
    expect(() =>
      stunDamageFactor.calculate({
        isTargetStunned: "true" as unknown as boolean,
        targetBaseStunDamageMultiplier: 1.5,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toThrow(TypeError)
  })

  it("rejects a non-number base multiplier", () => {
    expect(() =>
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: "1.5" as unknown as number,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite base multiplier %s",
    (targetBaseStunDamageMultiplier) => {
      expect(() =>
        stunDamageFactor.calculate({
          isTargetStunned: true,
          targetBaseStunDamageMultiplier,
          targetStunDamageMultiplierAdjustments: [],
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects a negative base multiplier", () => {
    expect(() =>
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: -0.5,
        targetStunDamageMultiplierAdjustments: [],
      }),
    ).toThrow(RangeError)
  })

  it("rejects an adjustments value that is not an array", () => {
    expect(() =>
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.5,
        targetStunDamageMultiplierAdjustments: new Set([
          0.25,
        ]) as unknown as readonly number[],
      }),
    ).toThrow(TypeError)
  })

  it("rejects a non-number adjustment", () => {
    expect(() =>
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.5,
        targetStunDamageMultiplierAdjustments: ["0.25" as unknown as number],
      }),
    ).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])(
    "rejects the non-finite adjustment %s",
    (adjustment) => {
      expect(() =>
        stunDamageFactor.calculate({
          isTargetStunned: true,
          targetBaseStunDamageMultiplier: 1.5,
          targetStunDamageMultiplierAdjustments: [adjustment],
        }),
      ).toThrow(RangeError)
    },
  )

  it("rejects an unclamped multiplier that overflows", () => {
    expect(() =>
      stunDamageFactor.calculate({
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: Number.MAX_VALUE,
        targetStunDamageMultiplierAdjustments: [Number.MAX_VALUE],
      }),
    ).toThrow(RangeError)
  })
})

import { describe, expect, expectTypeOf, it } from "vitest"
import {
  SHARP_CRITICAL_FACTOR_ID,
  sharpCriticalFactor,
  type Factor,
  type SharpCriticalFactorInput,
} from "../src/index.ts"

const sharpCriticalInput = (
  criticalRate: number,
  sharpCriticalDamageContributions: readonly number[],
): SharpCriticalFactorInput => ({
  isSharpCritical: false,
  criticalRate,
  sharpCriticalDamageContributions,
})

describe("sharpCriticalFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<SharpCriticalFactorInput>().toEqualTypeOf<{
      readonly isSharpCritical: boolean
      readonly criticalRate: number
      readonly sharpCriticalDamageContributions: readonly number[]
    }>()
    expectTypeOf(SHARP_CRITICAL_FACTOR_ID).toEqualTypeOf<"sharp_critical">()
    expectTypeOf(sharpCriticalFactor).toEqualTypeOf<
      Factor<SharpCriticalFactorInput>
    >()

    expect(SHARP_CRITICAL_FACTOR_ID).toBe("sharp_critical")
    expect(sharpCriticalFactor.factorId).toBe(SHARP_CRITICAL_FACTOR_ID)
    expect(Object.isFrozen(sharpCriticalFactor)).toBe(true)
  })

  it("keeps the non-sharp-critical branch at the identity multiplier", () => {
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(1.35, [1.5]),
        isSharpCritical: false,
      }),
    ).toBe(1)
  })

  it("applies 1 + B for the forced first layer when the rate does not overflow", () => {
    // 固定来源 computeSharpenCritFullCritZone：r ≤ 1 时强制首段为 1 + B。
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(0.5, [1.5]),
        isSharpCritical: true,
      }),
    ).toBe(2.5)
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(1, [1.5]),
        isSharpCritical: true,
      }),
    ).toBe(2.5)
  })

  it("keeps the overflow layer as an expectation instead of a second forced layer", () => {
    // r > 1：(1 + B) × (1 + B × (r − 1))；r = 1.35、B = 1.5 → 2.5 × 1.525。
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(1.35, [1.5]),
        isSharpCritical: true,
      }),
    ).toBeCloseTo(3.8125, 12)
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(2, [1.5]),
        isSharpCritical: true,
      }),
    ).toBeCloseTo(6.25, 12)
  })

  it("clamps the rate to 0–2 and never forces a second sharp critical", () => {
    // 暴击率钳制到 [0, 2]：r ≤ 1 时强制首段为 1 + B；250% 与 200% 的
    // 溢出段相同，不解释为保证连续两次锐暴。
    for (const [rate, expected] of [
      [-0.1, 2.5],
      [0, 2.5],
      [0.5, 2.5],
      [1, 2.5],
      [1.35, 3.8125],
      [2, 6.25],
      [2.5, 6.25],
    ] as const) {
      expect(
        sharpCriticalFactor.calculate({
          ...sharpCriticalInput(rate, [1.5]),
          isSharpCritical: true,
        }),
      ).toBeCloseTo(expected, 12)
    }
  })

  it("keeps a zero sharp critical damage at the identity multiplier even with a full rate", () => {
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(2, [0]),
        isSharpCritical: true,
      }),
    ).toBe(1)
  })

  it("sums contributions without the regular critical damage clamp", () => {
    // B 不沿用普通暴伤的钳制：分段贡献相加后直接进入公式。
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(1.35, [1.5, 0.12]),
        isSharpCritical: true,
      }),
    ).toBeCloseTo(4.10554, 12)
    expect(
      sharpCriticalFactor.calculate({
        ...sharpCriticalInput(0, [6]),
        isSharpCritical: true,
      }),
    ).toBe(7)
  })

  it("rejects invalid input shapes and non-finite numbers", () => {
    expect(() =>
      sharpCriticalFactor.calculate(
        null as unknown as SharpCriticalFactorInput,
      ),
    ).toThrow(TypeError)
    expect(() =>
      sharpCriticalFactor.calculate([] as unknown as SharpCriticalFactorInput),
    ).toThrow(TypeError)
    expect(() =>
      sharpCriticalFactor.calculate({
        isSharpCritical: true,
        criticalRate: Number.NaN,
        sharpCriticalDamageContributions: [],
      }),
    ).toThrow(RangeError)
    expect(() =>
      sharpCriticalFactor.calculate({
        isSharpCritical: true,
        criticalRate: 1,
        sharpCriticalDamageContributions: [Number.POSITIVE_INFINITY],
      }),
    ).toThrow(RangeError)
    expect(() =>
      sharpCriticalFactor.calculate({
        isSharpCritical: true,
        criticalRate: 1,
        sharpCriticalDamageContributions: 5 as unknown as readonly number[],
      }),
    ).toThrow(TypeError)
  })

  it("validates the contribution sum even on the non-sharp-critical branch", () => {
    const contributions = [Number.MAX_VALUE, Number.MAX_VALUE]
    expect(() =>
      sharpCriticalFactor.calculate({
        isSharpCritical: true,
        criticalRate: 1,
        sharpCriticalDamageContributions: contributions,
      }),
    ).toThrow(RangeError)
    expect(() =>
      sharpCriticalFactor.calculate({
        isSharpCritical: false,
        criticalRate: 1,
        sharpCriticalDamageContributions: contributions,
      }),
    ).toThrow(RangeError)
  })
})

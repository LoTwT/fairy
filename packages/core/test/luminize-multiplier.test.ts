import { describe, expect, expectTypeOf, it } from "vitest"
import {
  LUMINIZE_MULTIPLIER_FACTOR_ID,
  luminizeMultiplierFactor,
  type Factor,
  type LuminizeMultiplierFactorInput,
} from "../src/index.ts"

function createInput(
  overrides: Partial<LuminizeMultiplierFactorInput> = {},
): LuminizeMultiplierFactorInput {
  return {
    baseLuminizeMultiplier: 3.2,
    remielleAnomalyProficiency: 400,
    anomalyProficiencyConversionRate: 0.002,
    multiplicativeLuminizeMultiplierAdjustments: [],
    ...overrides,
  }
}

describe("luminizeMultiplierFactor", () => {
  it("exposes its public identity and types", () => {
    expectTypeOf<LuminizeMultiplierFactorInput>().toEqualTypeOf<{
      readonly baseLuminizeMultiplier: number
      readonly remielleAnomalyProficiency: number
      readonly anomalyProficiencyConversionRate: number
      readonly multiplicativeLuminizeMultiplierAdjustments: readonly number[]
    }>()
    expectTypeOf(
      LUMINIZE_MULTIPLIER_FACTOR_ID,
    ).toEqualTypeOf<"luminize_multiplier">()
    expectTypeOf(luminizeMultiplierFactor).toEqualTypeOf<
      Factor<LuminizeMultiplierFactorInput>
    >()

    expect(LUMINIZE_MULTIPLIER_FACTOR_ID).toBe("luminize_multiplier")
    expect(luminizeMultiplierFactor.factorId).toBe(
      LUMINIZE_MULTIPLIER_FACTOR_ID,
    )
    expect(Object.isFrozen(luminizeMultiplierFactor)).toBe(true)
  })

  it.each([
    [createInput(), 4],
    [
      createInput({ multiplicativeLuminizeMultiplierAdjustments: [1.12] }),
      4.48,
    ],
    [
      createInput({
        multiplicativeLuminizeMultiplierAdjustments: [1.12, 0.25],
      }),
      1.12,
    ],
    [
      createInput({
        baseLuminizeMultiplier: 0,
        remielleAnomalyProficiency: 0,
        anomalyProficiencyConversionRate: 0,
      }),
      0,
    ],
  ] as const)("calculates the Luminize multiplier", (input, expected) => {
    expect(luminizeMultiplierFactor.calculate(input)).toBe(expected)
  })

  it("applies repeated adjustments in array index order", () => {
    const input = createInput({
      multiplicativeLuminizeMultiplierAdjustments: [1.12, 0.25, 1.12],
    })
    const expected = 4 * 1.12 * 0.25 * 1.12

    expect(luminizeMultiplierFactor.calculate(input)).toBe(expected)
  })

  it("uses array indices rather than a caller-controlled iterator", () => {
    const adjustments = [1.12, 0.25]
    Object.defineProperty(adjustments, Symbol.iterator, {
      value: function* () {
        yield 10
      },
    })

    expect(
      luminizeMultiplierFactor.calculate(
        createInput({
          multiplicativeLuminizeMultiplierAdjustments: adjustments,
        }),
      ),
    ).toBe(4 * 1.12 * 0.25)
  })

  it("does not modify or freeze its input or adjustment array", () => {
    const adjustments = Object.freeze([1.12, 0.25])
    const input = Object.freeze(
      createInput({
        multiplicativeLuminizeMultiplierAdjustments: adjustments,
      }),
    )

    luminizeMultiplierFactor.calculate(input)

    expect(input).toEqual({
      baseLuminizeMultiplier: 3.2,
      remielleAnomalyProficiency: 400,
      anomalyProficiencyConversionRate: 0.002,
      multiplicativeLuminizeMultiplierAdjustments: [1.12, 0.25],
    })
    expect(Object.isFrozen(input)).toBe(true)
    expect(Object.isFrozen(adjustments)).toBe(true)
  })

  it("rejects inputs that are not non-array objects", () => {
    const fields = createInput()

    for (const input of [
      null,
      Object.assign([], fields),
      Object.assign(() => undefined, fields),
    ]) {
      expect(() =>
        luminizeMultiplierFactor.calculate(
          input as unknown as LuminizeMultiplierFactorInput,
        ),
      ).toThrow(TypeError)
    }
  })

  it.each([
    "baseLuminizeMultiplier",
    "remielleAnomalyProficiency",
    "anomalyProficiencyConversionRate",
  ] as const)("rejects invalid values for %s", (field) => {
    expect(() =>
      luminizeMultiplierFactor.calculate(createInput({ [field]: undefined })),
    ).toThrow(TypeError)
    expect(() =>
      luminizeMultiplierFactor.calculate(createInput({ [field]: NaN })),
    ).toThrow(RangeError)
    expect(() =>
      luminizeMultiplierFactor.calculate(createInput({ [field]: -1 })),
    ).toThrow(RangeError)
  })

  it.each([undefined, null, {}, "1.12", new Float64Array([1.12])])(
    "rejects the non-array multiplier adjustments %s",
    (multiplicativeLuminizeMultiplierAdjustments) => {
      expect(() =>
        luminizeMultiplierFactor.calculate(
          createInput({
            multiplicativeLuminizeMultiplierAdjustments,
          } as unknown as Partial<LuminizeMultiplierFactorInput>),
        ),
      ).toThrow(TypeError)
    },
  )

  it("rejects a sparse multiplier adjustment array", () => {
    const multiplicativeLuminizeMultiplierAdjustments = [0]
    delete multiplicativeLuminizeMultiplierAdjustments[0]

    expect(() =>
      luminizeMultiplierFactor.calculate(
        createInput({
          multiplicativeLuminizeMultiplierAdjustments,
        }),
      ),
    ).toThrow(TypeError)
  })

  it.each([undefined, null, "1.12", true])(
    "rejects the non-number multiplier adjustment %s",
    (adjustment) => {
      expect(() =>
        luminizeMultiplierFactor.calculate(
          createInput({
            multiplicativeLuminizeMultiplierAdjustments: [
              adjustment as unknown as number,
            ],
          }),
        ),
      ).toThrow(TypeError)
    },
  )

  it.each([NaN, Infinity, -Infinity, -Number.EPSILON, -1])(
    "rejects the invalid multiplier adjustment %s",
    (adjustment) => {
      expect(() =>
        luminizeMultiplierFactor.calculate(
          createInput({
            multiplicativeLuminizeMultiplierAdjustments: [adjustment],
          }),
        ),
      ).toThrow(RangeError)
    },
  )

  it("rejects an overflowing anomaly proficiency conversion", () => {
    expect(() =>
      luminizeMultiplierFactor.calculate(
        createInput({
          remielleAnomalyProficiency: Number.MAX_VALUE,
          anomalyProficiencyConversionRate: 2,
        }),
      ),
    ).toThrow(RangeError)
  })

  it("preserves multiplication order and rejects overflow before a zero adjustment", () => {
    expect(() =>
      luminizeMultiplierFactor.calculate(
        createInput({
          baseLuminizeMultiplier: Number.MAX_VALUE,
          remielleAnomalyProficiency: 0,
          anomalyProficiencyConversionRate: 0,
          multiplicativeLuminizeMultiplierAdjustments: [2, 0],
        }),
      ),
    ).toThrow(RangeError)
  })
})

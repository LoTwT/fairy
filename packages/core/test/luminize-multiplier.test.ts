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

/** 代表值 A 的乘算期望：基础倍率 ×(1 + 400 × 0.002)。 */
const baseScaledByProficiency = (base: number) => base * (1 + 400 * 0.002)

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
    [createInput(), baseScaledByProficiency(3.2)],
    [
      createInput({ multiplicativeLuminizeMultiplierAdjustments: [1.12] }),
      baseScaledByProficiency(3.2) * 1.12,
    ],
    [
      createInput({
        multiplicativeLuminizeMultiplierAdjustments: [1.12, 0.25],
      }),
      baseScaledByProficiency(3.2) * 1.12 * 0.25,
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

  it("scales the base multiplier by the proficiency conversion instead of adding it", () => {
    // 独立算式：结果 = 基础倍率 × (1 + 当前异常精通 × 换算率) × 各独立调整，
    // 对应固定上游 computeRadianceMultZone：
    // max(0, radianceMult/100) × multFactorPercentToRatio(radianceMultFactor)，
    // 其中 radianceMult 为本次招式倍率百分点、radianceMultFactor 为
    // 100 + 异常精通 × ratioPercent。精通 630、换算率 0.002 得到 ×2.26。
    const proficiency = 630
    const rate = 0.002
    const m4 = 1.12
    /**
     * 按固定公式独立写出的乘算期望（`max(0, radianceMult/100) × 倍率修正/100`，
     * `radianceMult` 为招式倍率百分点、倍率修正为 `100 + 精通 × ratioPercent`）；
     * 它不执行上游原函数，实际执行摘要核对原函数的是参考生成器与父会话探针。
     */
    const upstreamRadianceMultZone = (
      actionMultiplier: number,
      adjustments: readonly number[],
    ) => {
      const radianceMultPercent = actionMultiplier * 100
      const radianceMultFactorPercent = 100 + proficiency * rate * 100
      return (
        Math.max(0, radianceMultPercent / 100) *
        (radianceMultFactorPercent / 100) *
        adjustments.reduce((product, adjustment) => product * adjustment, 1)
      )
    }
    const calculate = (base: number, adjustments: readonly number[]) =>
      luminizeMultiplierFactor.calculate(
        createInput({
          baseLuminizeMultiplier: base,
          remielleAnomalyProficiency: proficiency,
          anomalyProficiencyConversionRate: rate,
          multiplicativeLuminizeMultiplierAdjustments: adjustments,
        }),
      )

    for (const base of [0, 1, 1.8, 3.2])
      expect(calculate(base, [m4]), `base ${base}`).toBe(
        upstreamRadianceMultZone(base, [m4]),
      )
    // 十进制对照值，与加算口径（3.2 时为 4.9952）不同。
    expect(calculate(0, [m4])).toBe(0)
    expect(calculate(1, [m4])).toBeCloseTo(2.5312, 12)
    expect(calculate(1.8, [m4])).toBeCloseTo(4.55616, 12)
    expect(calculate(3.2, [m4])).toBeCloseTo(8.09984, 12)
  })

  it("keeps the base multiplier for zero proficiency or a zero conversion rate", () => {
    for (const input of [
      createInput({
        remielleAnomalyProficiency: 0,
        multiplicativeLuminizeMultiplierAdjustments: [1.12],
      }),
      createInput({
        anomalyProficiencyConversionRate: 0,
        multiplicativeLuminizeMultiplierAdjustments: [1.12],
      }),
    ])
      expect(luminizeMultiplierFactor.calculate(input)).toBe(3.2 * 1.12)
  })

  it("applies repeated adjustments in array index order", () => {
    const input = createInput({
      multiplicativeLuminizeMultiplierAdjustments: [1.12, 0.25, 1.12],
    })
    const expected = baseScaledByProficiency(3.2) * 1.12 * 0.25 * 1.12

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
    ).toBe(baseScaledByProficiency(3.2) * 1.12 * 0.25)
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

  it("rejects a sparse hole even when its prototype supplies a number", () => {
    const multiplicativeLuminizeMultiplierAdjustments: number[] = []
    multiplicativeLuminizeMultiplierAdjustments.length = 1
    const inheritedValues = Object.assign(Object.create(Array.prototype), {
      0: 0.2,
    })
    Object.setPrototypeOf(
      multiplicativeLuminizeMultiplierAdjustments,
      inheritedValues,
    )
    expect(() =>
      luminizeMultiplierFactor.calculate(
        createInput({ multiplicativeLuminizeMultiplierAdjustments }),
      ),
    ).toThrow(TypeError)
  })

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

  it("rejects a proficiency conversion that overflows the multiplied base", () => {
    // 乘法口径的边界：MAX_VALUE ×(1 + 1 × 1) 溢出；旧加算口径返回 MAX_VALUE + 1。
    expect(() =>
      luminizeMultiplierFactor.calculate(
        createInput({
          baseLuminizeMultiplier: Number.MAX_VALUE,
          remielleAnomalyProficiency: 1,
          anomalyProficiencyConversionRate: 1,
        }),
      ),
    ).toThrow(RangeError)
    // 恒等换算仍合法：MAX_VALUE ×(1 + 0) 保持有限。
    expect(
      luminizeMultiplierFactor.calculate(
        createInput({
          baseLuminizeMultiplier: Number.MAX_VALUE,
          remielleAnomalyProficiency: 0,
          anomalyProficiencyConversionRate: 0,
        }),
      ),
    ).toBe(Number.MAX_VALUE)
  })
})

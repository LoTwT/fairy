import { describe, expect, it } from "vitest"
import { levelValue } from "../scripts/static-effects/convert.ts"

// convert.ts 的约定：等级表达式取值按 12 位小数归一，base + growth × level 的
// 十进制结果与二进制浮点误差解耦，生成表与验收值逐字一致。
describe("static effects level value 12-digit normalization", () => {
  it("normalizes binary floating-point traces to the exact decimal value", () => {
    // 0.1 + 0.2 × 3 与 0.4 + 0.3 × 3 的原始双精度结果分别高于、低于十进制
    // 精确值；先证明输入确实带浮点痕迹，再断言归一后严格等于十进制精确值。
    expect(0.1 + 0.2 * 3).not.toBe(0.7)
    expect(0.4 + 0.3 * 3).not.toBe(1.3)
    expect(levelValue(0.1, 0.2, 3)).toBe(0.7)
    expect(levelValue(0.4, 0.3, 3)).toBe(1.3)
    // 真实语义曲线同样带痕迹：露西·加油 rate（0.13 + 0.008 × L）在 L2 与 L10。
    expect(0.13 + 0.008 * 2).not.toBe(0.146)
    expect(0.13 + 0.008 * 10).not.toBe(0.21)
    expect(levelValue(0.13, 0.008, 2)).toBe(0.146)
    expect(levelValue(0.13, 0.008, 10)).toBe(0.21)
  })

  it("passes values without floating-point traces through unchanged", () => {
    // 整数与本身无痕迹的十进制结果保持原值，归一不引入新的偏差。
    expect(levelValue(40, 4, 12)).toBe(88)
    expect(levelValue(560, -4, 1)).toBe(556)
    expect(levelValue(0.13, 0.008, 12)).toBe(0.226)
  })

  it("rounds repeating decimals at exactly twelve fractional digits", () => {
    // 循环小数在 12 位小数处归一；更粗的精度（如 6 位）会得到不同取值，
    // 该断言钉住“12 位”这一口径本身。
    expect(levelValue(0, 1 / 300, 1)).toBe(0.003333333333)
  })
})

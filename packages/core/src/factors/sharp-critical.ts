import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertBoolean,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
} from "../internal/assert.ts"

/**
 * 锐暴区（锋御锐化的暴击判定区）。
 *
 * B = Σ锐暴伤害加成贡献（固定来源不以普通暴伤的方式钳制 B）；
 * r = clamp(暴击率, 0, 2)（锋御暴击率可溢出到 200%）。
 *
 * - 非锐暴分支（isSharpCritical = false）恒为 1；
 * - 锐暴分支（isSharpCritical = true）只强制第一层锐暴：
 *   r ≤ 1 时为 1 + B；r > 1 时为 (1 + B) × (1 + B × (r − 1))，溢出层仍按期望，
 *   不能解释为保证连续两次锐暴。
 * 期望倍率由调用方按 (1 − min(1, r)) × 非锐暴 + min(1, r) × 锐暴 组合，
 * 与固定来源的锐暴期望区一致。
 */
const NON_SHARP_CRITICAL_MULTIPLIER = 1
const MIN_SHARP_CRITICAL_RATE = 0
const MAX_SHARP_CRITICAL_RATE = 2

export interface SharpCriticalFactorInput {
  readonly isSharpCritical: boolean
  readonly criticalRate: number
  readonly sharpCriticalDamageContributions: readonly number[]
}

export const SHARP_CRITICAL_FACTOR_ID = "sharp_critical" as const

export const sharpCriticalFactor: Factor<SharpCriticalFactorInput> =
  defineFactor<SharpCriticalFactorInput>({
    factorId: SHARP_CRITICAL_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Sharp critical factor input")

      const {
        isSharpCritical,
        criticalRate,
        sharpCriticalDamageContributions,
      } = input

      assertBoolean(isSharpCritical, "isSharpCritical")
      assertFiniteNumber(criticalRate, "Sharp critical rate")
      assertArray(
        sharpCriticalDamageContributions,
        "Sharp critical damage contributions",
      )

      let totalSharpCriticalDamage = 0
      for (const contribution of sharpCriticalDamageContributions) {
        assertFiniteNumber(contribution, "Sharp critical damage contribution")

        totalSharpCriticalDamage += contribution
      }

      assertFiniteResult(
        totalSharpCriticalDamage,
        "Sharp critical damage contribution sum",
      )

      if (!isSharpCritical) return NON_SHARP_CRITICAL_MULTIPLIER

      const sharpCriticalDamage = totalSharpCriticalDamage
      const clampedCriticalRate = Math.min(
        MAX_SHARP_CRITICAL_RATE,
        Math.max(MIN_SHARP_CRITICAL_RATE, criticalRate),
      )
      const overflowRate = Math.max(0, clampedCriticalRate - 1)
      const multiplier =
        (1 + sharpCriticalDamage) * (1 + sharpCriticalDamage * overflowRate)

      assertFiniteResult(multiplier, "Sharp critical multiplier")

      return multiplier
    },
  })

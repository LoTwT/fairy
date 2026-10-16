import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

export interface WindsweptDirectDamageFactorInput {
  /** 已解析的基础风化系数，不含本次 coefficientIncreases；无默认基础值。 */
  readonly baseCoefficient: number
  readonly coefficientIncreases: readonly number[]
}

export const WINDSWEPT_DIRECT_DAMAGE_FACTOR_ID =
  "windswept_direct_damage" as const

export const windsweptDirectDamageFactor: Factor<WindsweptDirectDamageFactorInput> =
  defineFactor<WindsweptDirectDamageFactorInput>({
    factorId: WINDSWEPT_DIRECT_DAMAGE_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Windswept direct damage input")
      assertNonNegativeFiniteNumber(
        input.baseCoefficient,
        "Base windswept coefficient",
      )
      assertArray(input.coefficientIncreases, "Windswept coefficient increases")
      let coefficient = input.baseCoefficient
      for (const increase of input.coefficientIncreases) {
        assertNonNegativeFiniteNumber(
          increase,
          "Windswept coefficient increase",
        )
        coefficient += increase
        assertFiniteResult(coefficient, "Windswept coefficient sum")
      }
      const multiplier = 1 + coefficient
      assertFiniteResult(multiplier, "Windswept direct damage multiplier")
      return multiplier
    },
  })

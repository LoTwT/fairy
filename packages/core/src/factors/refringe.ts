import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const BASE_REFRINGE_MULTIPLIER = 1
const REMIELLE_ANOMALY_PROFICIENCY_CONVERSION_RATE = 0.0002
const MIN_REFRINGE_MULTIPLIER = 1

export interface CalculateRefringeMultiplierParams {
  readonly remielleAnomalyProficiency: number
  readonly refringeCoefficientIncreases: readonly number[]
}

export type RefringeFactorInput = number

export const REFRINGE_FACTOR_ID = "refringe" as const
export const DEFAULT_REFRINGE_FACTOR_INPUT: RefringeFactorInput = 1

/** 根据异化触发时蕾米埃尔的异常精通与系数提升计算最终异化倍率。 */
export function calculateRefringeMultiplier(
  params: CalculateRefringeMultiplierParams,
): number {
  assertNonArrayObject(params, "Calculate Refringe multiplier params")

  const { remielleAnomalyProficiency, refringeCoefficientIncreases } = params

  assertNonNegativeFiniteNumber(
    remielleAnomalyProficiency,
    "Remielle anomaly proficiency",
  )
  assertArray(refringeCoefficientIncreases, "Refringe coefficient increases")

  let refringeCoefficient =
    remielleAnomalyProficiency * REMIELLE_ANOMALY_PROFICIENCY_CONVERSION_RATE
  const increaseCount = refringeCoefficientIncreases.length

  for (let index = 0; index < increaseCount; index += 1) {
    const increase = Object.hasOwn(refringeCoefficientIncreases, index)
      ? refringeCoefficientIncreases[index]
      : undefined

    assertNonNegativeFiniteNumber(increase, "Refringe coefficient increase")

    refringeCoefficient += increase
  }

  assertFiniteResult(refringeCoefficient, "Refringe coefficient")

  const refringeMultiplier = BASE_REFRINGE_MULTIPLIER + refringeCoefficient

  assertFiniteResult(refringeMultiplier, "Refringe multiplier")

  return refringeMultiplier
}

export const refringeFactor: Factor<RefringeFactorInput> =
  defineFactor<RefringeFactorInput>({
    factorId: REFRINGE_FACTOR_ID,
    calculate: (refringeMultiplier) => {
      assertFiniteNumber(refringeMultiplier, "Refringe factor input")

      if (refringeMultiplier < MIN_REFRINGE_MULTIPLIER) {
        throw new RangeError(
          `Refringe factor input must be at least ${MIN_REFRINGE_MULTIPLIER}`,
        )
      }

      return refringeMultiplier
    },
  })

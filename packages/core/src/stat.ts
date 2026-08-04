import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "./internal/assert.ts"

export interface CalculateInitialStatParams {
  readonly baseStat: number
  readonly initialStatPercentageAdjustments: readonly number[]
  readonly initialStatFixedValueAdjustments: readonly number[]
}

export interface CalculateFinalStatParams {
  readonly initialStat: number
  readonly finalStatPercentageAdjustments: readonly number[]
  readonly finalStatFixedValueAdjustments: readonly number[]
}

/** 根据基础属性、初始属性百分比调整和初始属性固定值调整计算初始属性。 */
export function calculateInitialStat(
  params: CalculateInitialStatParams,
): number {
  assertNonArrayObject(params, "calculateInitialStat params")

  const {
    baseStat,
    initialStatPercentageAdjustments,
    initialStatFixedValueAdjustments,
  } = params

  assertArray(
    initialStatPercentageAdjustments,
    "initialStatPercentageAdjustments",
  )
  assertArray(
    initialStatFixedValueAdjustments,
    "initialStatFixedValueAdjustments",
  )

  return calculateStat(
    baseStat,
    "baseStat",
    initialStatPercentageAdjustments,
    "initialStatPercentageAdjustments",
    initialStatFixedValueAdjustments,
    "initialStatFixedValueAdjustments",
  )
}

/** 根据初始属性、最终属性百分比调整和最终属性固定值调整计算最终属性。 */
export function calculateFinalStat(params: CalculateFinalStatParams): number {
  assertNonArrayObject(params, "calculateFinalStat params")

  const {
    initialStat,
    finalStatPercentageAdjustments,
    finalStatFixedValueAdjustments,
  } = params

  assertArray(finalStatPercentageAdjustments, "finalStatPercentageAdjustments")
  assertArray(finalStatFixedValueAdjustments, "finalStatFixedValueAdjustments")

  return calculateStat(
    initialStat,
    "initialStat",
    finalStatPercentageAdjustments,
    "finalStatPercentageAdjustments",
    finalStatFixedValueAdjustments,
    "finalStatFixedValueAdjustments",
  )
}

function calculateStat(
  sourceStat: unknown,
  sourceStatName: string,
  percentageAdjustments: readonly unknown[],
  percentageAdjustmentsName: string,
  fixedValueAdjustments: readonly unknown[],
  fixedValueAdjustmentsName: string,
): number {
  assertNonNegativeFiniteNumber(sourceStat, sourceStatName)

  const percentageAdjustment = sumFiniteAdjustments(
    percentageAdjustments,
    percentageAdjustmentsName,
  )
  const percentageMultiplier = 1 + percentageAdjustment

  if (percentageMultiplier < 0) {
    throw new RangeError(
      `${percentageAdjustmentsName} multiplier must be non-negative`,
    )
  }

  const adjustedStat = sourceStat * percentageMultiplier

  const fixedValueAdjustment = sumFiniteAdjustments(
    fixedValueAdjustments,
    fixedValueAdjustmentsName,
  )
  const result = adjustedStat + fixedValueAdjustment

  assertFiniteResult(result, "Calculated stat")

  if (result < 0) {
    throw new RangeError("Calculated stat must be non-negative")
  }

  return result
}

function sumFiniteAdjustments(
  adjustments: readonly unknown[],
  name: string,
): number {
  let total = 0

  for (const adjustment of adjustments) {
    assertFiniteNumber(adjustment, `${name} entries`)

    total += adjustment
  }

  return total
}

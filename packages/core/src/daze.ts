import {
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
  assertPositiveFiniteNumber,
} from "./internal/assert.ts"

const DAZE_PERCENTAGE_MULTIPLIER = 100
const OVERFLOW_SAFE_SCALE_DIVISOR = 128

export interface CalculateDisplayedDazePercentageParams {
  readonly accumulatedDaze: number
  readonly maximumDaze: number
}

/** 根据累计失衡值和失衡值上限计算向下取整后的失衡比例显示值。 */
export function calculateDisplayedDazePercentage(
  params: CalculateDisplayedDazePercentageParams,
): number {
  assertNonArrayObject(params, "calculateDisplayedDazePercentage params")

  const { accumulatedDaze, maximumDaze } = params

  assertNonNegativeFiniteNumber(accumulatedDaze, "Accumulated daze")
  assertPositiveFiniteNumber(maximumDaze, "Maximum daze")

  let percentageNumerator = accumulatedDaze * DAZE_PERCENTAGE_MULTIPLIER
  let percentageDenominator = maximumDaze

  if (!Number.isFinite(percentageNumerator)) {
    percentageNumerator =
      (accumulatedDaze / OVERFLOW_SAFE_SCALE_DIVISOR) *
      DAZE_PERCENTAGE_MULTIPLIER
    percentageDenominator = maximumDaze / OVERFLOW_SAFE_SCALE_DIVISOR
  }

  const displayedDazePercentage = Math.floor(
    percentageNumerator / percentageDenominator,
  )

  assertFiniteResult(displayedDazePercentage, "Displayed daze percentage")

  return displayedDazePercentage
}

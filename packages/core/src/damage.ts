import {
  assertArray,
  assertFiniteResult,
  assertNonNegativeFiniteNumber,
} from "./internal/assert.ts"

/** 将每段未显示取整的伤害分别向上取整后，按顺序汇总为显示伤害总值。 */
export function calculateTotalDisplayedDamage(
  unroundedSegmentDamageValues: readonly number[],
): number {
  assertArray(unroundedSegmentDamageValues, "Unrounded segment damage values")

  let totalDisplayedDamage = 0

  for (let index = 0; index < unroundedSegmentDamageValues.length; index += 1) {
    const unroundedSegmentDamageValue = Object.hasOwn(
      unroundedSegmentDamageValues,
      index,
    )
      ? unroundedSegmentDamageValues[index]
      : undefined

    assertNonNegativeFiniteNumber(
      unroundedSegmentDamageValue,
      `Unrounded segment damage value at index ${index}`,
    )

    totalDisplayedDamage += Math.ceil(unroundedSegmentDamageValue)
  }

  assertFiniteResult(totalDisplayedDamage, "Total displayed damage")

  return totalDisplayedDamage
}

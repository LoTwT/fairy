import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
  assertPositiveFiniteNumber,
} from "../internal/assert.ts"

const LEVEL_ONE_LEVEL_BASE = 50
const MAX_LEVEL_BASE = 794
const LEVEL_BASES_BELOW_SIXTY = [
  50, 54, 58, 62, 66, 71, 76, 82, 88, 94, 100, 107, 114, 121, 129, 137, 145,
  153, 162, 172, 181, 191, 201, 211, 222, 233, 245, 256, 268, 281, 293, 306,
  319, 333, 347, 361, 375, 390, 405, 421, 436, 452, 469, 485, 502, 519, 537,
  555, 573, 592, 610, 629, 649, 669, 689, 709, 730, 751, 772,
] as const

export interface DefenseFactorInput {
  readonly attackerLevelBase: number
  readonly targetEffectiveDefense: number
}

export interface CalculateTargetBaseDefenseParams {
  readonly targetLevelBase: number
  readonly targetLevelOneBaseDefense: number
}

export interface CalculateTargetEffectiveDefenseParams {
  readonly targetBaseDefense: number
  readonly defensePercentageAdjustments: readonly number[]
  readonly penetrationRatios: readonly number[]
  readonly penetrationValues: readonly number[]
}

export const DEFENSE_FACTOR_ID = "defense" as const

export function calculateDefenseLevelBase(level: number): number {
  assertFiniteNumber(level, "Level")

  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("Level must be a positive integer")
  }

  const levelBase =
    level >= 60 ? MAX_LEVEL_BASE : LEVEL_BASES_BELOW_SIXTY[level - 1]!

  assertFiniteResult(levelBase, "Level base")

  return levelBase
}

export function calculateTargetBaseDefense(
  params: CalculateTargetBaseDefenseParams,
): number {
  assertNonArrayObject(params, "calculateTargetBaseDefense params")

  const { targetLevelBase, targetLevelOneBaseDefense } = params

  assertPositiveFiniteNumber(targetLevelBase, "Target level base")
  assertNonNegativeFiniteNumber(
    targetLevelOneBaseDefense,
    "Target level one base defense",
  )

  const targetBaseDefense =
    (targetLevelOneBaseDefense / LEVEL_ONE_LEVEL_BASE) * targetLevelBase

  assertFiniteResult(targetBaseDefense, "Target base defense")

  return targetBaseDefense
}

export function calculateTargetEffectiveDefense(
  params: CalculateTargetEffectiveDefenseParams,
): number {
  assertNonArrayObject(params, "calculateTargetEffectiveDefense params")

  const {
    targetBaseDefense,
    defensePercentageAdjustments,
    penetrationRatios,
    penetrationValues,
  } = params

  assertNonNegativeFiniteNumber(targetBaseDefense, "Target base defense")
  assertArray(defensePercentageAdjustments, "Defense percentage adjustments")
  assertArray(penetrationRatios, "Penetration ratios")
  assertArray(penetrationValues, "Penetration values")

  const defensePercentageAdjustment = sumFiniteValues(
    defensePercentageAdjustments,
    "Defense percentage adjustments",
  )
  const penetrationRatio = sumFiniteValues(
    penetrationRatios,
    "Penetration ratios",
  )
  const penetrationValue = sumFiniteValues(
    penetrationValues,
    "Penetration values",
  )

  const unclampedTargetEffectiveDefense =
    targetBaseDefense *
      (1 + defensePercentageAdjustment) *
      (1 - penetrationRatio) -
    penetrationValue

  assertFiniteResult(
    unclampedTargetEffectiveDefense,
    "Unclamped target effective defense",
  )

  const targetEffectiveDefense = Math.max(unclampedTargetEffectiveDefense, 0)

  assertFiniteResult(targetEffectiveDefense, "Target effective defense")

  return targetEffectiveDefense
}

export const defenseFactor: Factor<DefenseFactorInput> =
  defineFactor<DefenseFactorInput>({
    factorId: DEFENSE_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Defense factor input")

      const { attackerLevelBase, targetEffectiveDefense } = input

      assertPositiveFiniteNumber(attackerLevelBase, "Attacker level base")
      assertNonNegativeFiniteNumber(
        targetEffectiveDefense,
        "Target effective defense",
      )

      const result =
        attackerLevelBase / (targetEffectiveDefense + attackerLevelBase)

      if (result <= 0 || result > 1) {
        throw new RangeError("Defense factor result must be within (0, 1]")
      }

      return result
    },
  })

function sumFiniteValues(values: readonly unknown[], name: string): number {
  let total = 0

  for (const value of values) {
    assertFiniteNumber(value, `${name} entries`)

    total += value
  }

  return total
}

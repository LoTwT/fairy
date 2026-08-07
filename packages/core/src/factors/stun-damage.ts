import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertBoolean,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
} from "../internal/assert.ts"

const MIN_STUNNED_DAMAGE_MULTIPLIER = 0.2
const MAX_STUNNED_DAMAGE_MULTIPLIER = 5
const MIN_UNSTUNNED_DAMAGE_MULTIPLIER = 1
const MAX_UNSTUNNED_DAMAGE_MULTIPLIER = 3

export interface StunDamageFactorInput {
  readonly isTargetStunned: boolean
  readonly targetBaseStunDamageMultiplier: number
  readonly targetStunDamageMultiplierAdjustments: readonly number[]
}

export const STUN_DAMAGE_FACTOR_ID = "stun_damage" as const
export const DEFAULT_STUN_DAMAGE_FACTOR_INPUT: StunDamageFactorInput =
  Object.freeze({
    isTargetStunned: false,
    targetBaseStunDamageMultiplier: 1,
    targetStunDamageMultiplierAdjustments: Object.freeze([]),
  })

export const stunDamageFactor: Factor<StunDamageFactorInput> =
  defineFactor<StunDamageFactorInput>({
    factorId: STUN_DAMAGE_FACTOR_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Stun damage factor input")

      const {
        isTargetStunned,
        targetBaseStunDamageMultiplier,
        targetStunDamageMultiplierAdjustments,
      } = input

      assertBoolean(isTargetStunned, "isTargetStunned")

      assertNonNegativeFiniteNumber(
        targetBaseStunDamageMultiplier,
        "Target base stun damage multiplier",
      )
      assertArray(
        targetStunDamageMultiplierAdjustments,
        "Target stun damage multiplier adjustments",
      )

      const totalTargetStunDamageMultiplierAdjustment = sumFiniteValues(
        targetStunDamageMultiplierAdjustments,
        "Target stun damage multiplier adjustments",
      )
      const unclampedMultiplier =
        targetBaseStunDamageMultiplier +
        totalTargetStunDamageMultiplierAdjustment

      assertFiniteResult(
        unclampedMultiplier,
        "Unclamped stun damage multiplier",
      )

      const minimumMultiplier = isTargetStunned
        ? MIN_STUNNED_DAMAGE_MULTIPLIER
        : MIN_UNSTUNNED_DAMAGE_MULTIPLIER
      const maximumMultiplier = isTargetStunned
        ? MAX_STUNNED_DAMAGE_MULTIPLIER
        : MAX_UNSTUNNED_DAMAGE_MULTIPLIER

      return Math.min(
        maximumMultiplier,
        Math.max(minimumMultiplier, unclampedMultiplier),
      )
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

import { defineFactor, type Factor } from "../factor.ts"
import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
} from "../internal/assert.ts"

const BASE_ANOMALY_DAMAGE_BONUS_MULTIPLIER = 1
const MIN_ANOMALY_DAMAGE_BONUS_MULTIPLIER = 0
const MAX_ANOMALY_DAMAGE_BONUS_MULTIPLIER = 3

export type AnomalyDamageBonusFactorInput = readonly number[]

export const ANOMALY_DAMAGE_BONUS_FACTOR_ID = "anomaly_damage_bonus" as const
export const DEFAULT_ANOMALY_DAMAGE_BONUS_FACTOR_INPUT: AnomalyDamageBonusFactorInput =
  Object.freeze([])

export const anomalyDamageBonusFactor: Factor<AnomalyDamageBonusFactorInput> =
  defineFactor<AnomalyDamageBonusFactorInput>({
    factorId: ANOMALY_DAMAGE_BONUS_FACTOR_ID,
    calculate: (inputs) => {
      assertArray(inputs, "Anomaly damage bonus factor input")

      let totalAnomalyDamageBonus = 0

      for (const input of inputs) {
        assertFiniteNumber(input, "Anomaly damage bonus factor input")

        totalAnomalyDamageBonus += input
      }

      const multiplier =
        BASE_ANOMALY_DAMAGE_BONUS_MULTIPLIER + totalAnomalyDamageBonus

      assertFiniteResult(multiplier, "Anomaly damage bonus multiplier")

      return Math.min(
        MAX_ANOMALY_DAMAGE_BONUS_MULTIPLIER,
        Math.max(MIN_ANOMALY_DAMAGE_BONUS_MULTIPLIER, multiplier),
      )
    },
  })

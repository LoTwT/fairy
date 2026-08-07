import { defineFactor, type Factor } from "../factor.ts"
import { assertFiniteNumber } from "../internal/assert.ts"

const MIN_ANOMALY_DAMAGE_LEVEL = 1
const MAX_ANOMALY_DAMAGE_LEVEL = 60
const ANOMALY_DAMAGE_LEVEL_OFFSET = 58
const ANOMALY_DAMAGE_LEVEL_DIVISOR = 59
const ANOMALY_DAMAGE_LEVEL_PRECISION_SCALE = 10_000

export type AnomalyDamageLevelFactorInput = number

export const ANOMALY_DAMAGE_LEVEL_FACTOR_ID = "anomaly_damage_level" as const
export const DEFAULT_ANOMALY_DAMAGE_LEVEL_FACTOR_INPUT: AnomalyDamageLevelFactorInput =
  MIN_ANOMALY_DAMAGE_LEVEL

export const anomalyDamageLevelFactor: Factor<AnomalyDamageLevelFactorInput> =
  defineFactor<AnomalyDamageLevelFactorInput>({
    factorId: ANOMALY_DAMAGE_LEVEL_FACTOR_ID,
    calculate: (level) => {
      assertFiniteNumber(level, "Anomaly damage level factor input")

      if (
        !Number.isInteger(level) ||
        level < MIN_ANOMALY_DAMAGE_LEVEL ||
        level > MAX_ANOMALY_DAMAGE_LEVEL
      ) {
        throw new RangeError(
          `Anomaly damage level factor input must be an integer from ${MIN_ANOMALY_DAMAGE_LEVEL} to ${MAX_ANOMALY_DAMAGE_LEVEL}`,
        )
      }

      const scaledMultiplier =
        ((level + ANOMALY_DAMAGE_LEVEL_OFFSET) *
          ANOMALY_DAMAGE_LEVEL_PRECISION_SCALE) /
        ANOMALY_DAMAGE_LEVEL_DIVISOR

      return Math.trunc(scaledMultiplier) / ANOMALY_DAMAGE_LEVEL_PRECISION_SCALE
    },
  })

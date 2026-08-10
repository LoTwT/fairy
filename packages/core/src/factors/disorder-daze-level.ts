import { defineFactor, type Factor } from "../factor.ts"
import { assertFiniteNumber } from "../internal/assert.ts"

const MIN_DISORDER_DAZE_LEVEL = 1
const MAX_DISORDER_DAZE_LEVEL = 60
const BASE_DISORDER_DAZE_LEVEL_MULTIPLIER = 1
const DISORDER_DAZE_LEVEL_MULTIPLIER_INCREMENT_PER_LEVEL = 0.0075

export type DisorderDazeLevelFactorInput = number

export const DISORDER_DAZE_LEVEL_FACTOR_ID = "disorder_daze_level" as const

export const disorderDazeLevelFactor: Factor<DisorderDazeLevelFactorInput> =
  defineFactor<DisorderDazeLevelFactorInput>({
    factorId: DISORDER_DAZE_LEVEL_FACTOR_ID,
    calculate: (level) => {
      assertFiniteNumber(level, "Disorder daze level factor input")

      if (
        !Number.isInteger(level) ||
        level < MIN_DISORDER_DAZE_LEVEL ||
        level > MAX_DISORDER_DAZE_LEVEL
      ) {
        throw new RangeError(
          `Disorder daze level factor input must be an integer from ${MIN_DISORDER_DAZE_LEVEL} to ${MAX_DISORDER_DAZE_LEVEL}`,
        )
      }

      return (
        BASE_DISORDER_DAZE_LEVEL_MULTIPLIER +
        DISORDER_DAZE_LEVEL_MULTIPLIER_INCREMENT_PER_LEVEL * level
      )
    },
  })

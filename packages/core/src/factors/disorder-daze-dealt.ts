import { defineFactor, type Factor } from "../factor.ts"
import { assertFiniteNumber } from "../internal/assert.ts"

const MIN_DISORDER_DAZE_DEALT_MULTIPLIER = 0
const MAX_DISORDER_DAZE_DEALT_MULTIPLIER = 4

export type DisorderDazeDealtFactorInput = number

export const DISORDER_DAZE_DEALT_FACTOR_ID = "disorder_daze_dealt" as const
export const DEFAULT_DISORDER_DAZE_DEALT_FACTOR_INPUT: DisorderDazeDealtFactorInput = 1

export const disorderDazeDealtFactor: Factor<DisorderDazeDealtFactorInput> =
  defineFactor<DisorderDazeDealtFactorInput>({
    factorId: DISORDER_DAZE_DEALT_FACTOR_ID,
    calculate: (disorderDazeDealtMultiplier) => {
      assertFiniteNumber(
        disorderDazeDealtMultiplier,
        "Disorder daze dealt factor input",
      )

      if (
        disorderDazeDealtMultiplier < MIN_DISORDER_DAZE_DEALT_MULTIPLIER ||
        disorderDazeDealtMultiplier > MAX_DISORDER_DAZE_DEALT_MULTIPLIER
      ) {
        throw new RangeError(
          `Disorder daze dealt factor input must be from ${MIN_DISORDER_DAZE_DEALT_MULTIPLIER} to ${MAX_DISORDER_DAZE_DEALT_MULTIPLIER}`,
        )
      }

      return disorderDazeDealtMultiplier
    },
  })

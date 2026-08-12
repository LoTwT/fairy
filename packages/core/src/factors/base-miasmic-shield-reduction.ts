import { defineFactor, type Factor } from "../factor.ts"
import { assertNonNegativeFiniteNumber } from "../internal/assert.ts"

export type BaseMiasmicShieldReductionFactorInput = number

export const BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID =
  "base_miasmic_shield_reduction" as const

export const baseMiasmicShieldReductionFactor: Factor<BaseMiasmicShieldReductionFactorInput> =
  defineFactor<BaseMiasmicShieldReductionFactorInput>({
    factorId: BASE_MIASMIC_SHIELD_REDUCTION_FACTOR_ID,
    calculate: (baseMiasmicShieldReduction) => {
      assertNonNegativeFiniteNumber(
        baseMiasmicShieldReduction,
        "Base miasmic shield reduction factor input",
      )

      return baseMiasmicShieldReduction
    },
  })

import {
  baseDazeFactor,
  type BaseDazeFactorInput,
} from "../factors/base-daze.ts"
import {
  dazeTakenFactor,
  type DazeTakenFactorInput,
} from "../factors/daze-taken.ts"
import {
  disorderDazeDealtFactor,
  type DisorderDazeDealtFactorInput,
} from "../factors/disorder-daze-dealt.ts"
import {
  disorderDazeLevelFactor,
  type DisorderDazeLevelFactorInput,
} from "../factors/disorder-daze-level.ts"
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import { assertNonArrayObject } from "../internal/assert.ts"

export interface DisorderDazeFormulaInput {
  readonly baseDaze: BaseDazeFactorInput
  readonly resistance: ResistanceFactorInput
  readonly disorderDazeDealt: DisorderDazeDealtFactorInput
  readonly dazeTaken: DazeTakenFactorInput
  readonly disorderDazeLevel: DisorderDazeLevelFactorInput
}

export const DISORDER_DAZE_FORMULA_ID = "disorder_daze" as const
export const DEFAULT_DISORDER_DAZE_MULTIPLIER = 2 as const

export const disorderDazeFormula: Formula<DisorderDazeFormulaInput> =
  defineFormula<DisorderDazeFormulaInput>({
    formulaId: DISORDER_DAZE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Disorder daze formula input")

      const factorResults = {
        baseDaze: baseDazeFactor.calculate(input.baseDaze),
        resistance: resistanceFactor.calculate(input.resistance),
        disorderDazeDealt: disorderDazeDealtFactor.calculate(
          input.disorderDazeDealt,
        ),
        dazeTaken: dazeTakenFactor.calculate(input.dazeTaken),
        disorderDazeLevel: disorderDazeLevelFactor.calculate(
          input.disorderDazeLevel,
        ),
      } satisfies FormulaFactorResults<DisorderDazeFormulaInput>

      const value =
        factorResults.baseDaze *
        factorResults.resistance *
        factorResults.disorderDazeDealt *
        factorResults.dazeTaken *
        factorResults.disorderDazeLevel

      return { value, factorResults }
    },
  })

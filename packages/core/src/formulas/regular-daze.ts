import {
  baseDazeFactor,
  type BaseDazeFactorInput,
} from "../factors/base-daze.ts"
import {
  dazeDealtFactor,
  type DazeDealtFactorInput,
} from "../factors/daze-dealt.ts"
import {
  dazeTakenFactor,
  type DazeTakenFactorInput,
} from "../factors/daze-taken.ts"
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

export interface RegularDazeFormulaInput {
  readonly baseDaze: BaseDazeFactorInput
  readonly resistance: ResistanceFactorInput
  readonly dazeDealt: DazeDealtFactorInput
  readonly dazeTaken: DazeTakenFactorInput
}

export const REGULAR_DAZE_FORMULA_ID = "regular_daze" as const

export const regularDazeFormula: Formula<RegularDazeFormulaInput> =
  defineFormula<RegularDazeFormulaInput>({
    formulaId: REGULAR_DAZE_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Regular daze formula input")

      const factorResults = {
        baseDaze: baseDazeFactor.calculate(input.baseDaze),
        resistance: resistanceFactor.calculate(input.resistance),
        dazeDealt: dazeDealtFactor.calculate(input.dazeDealt),
        dazeTaken: dazeTakenFactor.calculate(input.dazeTaken),
      } satisfies FormulaFactorResults<RegularDazeFormulaInput>

      const value =
        factorResults.baseDaze *
        factorResults.resistance *
        factorResults.dazeDealt *
        factorResults.dazeTaken

      return { value, factorResults }
    },
  })

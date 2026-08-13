import {
  baseAnomalyBuildupFactor,
  type BaseAnomalyBuildupFactorInput,
} from "../factors/base-anomaly-buildup.ts"
import {
  anomalyMasteryFactor,
  type AnomalyMasteryFactorInput,
} from "../factors/anomaly-mastery.ts"
import {
  anomalyBuildupRateFactor,
  type AnomalyBuildupRateFactorInput,
} from "../factors/anomaly-buildup-rate.ts"
import {
  resistanceFactor,
  type ResistanceFactorInput,
} from "../factors/resistance.ts"
import {
  defineFormula,
  type Formula,
  type FormulaFactorResults,
} from "../formula.ts"
import {
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
} from "../internal/assert.ts"

const MAX_ANOMALY_TRIGGER_THRESHOLD_TABLE_INDEX = 9
const MIN_ANOMALY_TRIGGER_THRESHOLD_MULTIPLIER = 1

export type AnomalyTriggerThresholdTier = "normal" | "elite" | "boss"

export type AnomalyTriggerThresholdKind = "standard" | "physical"

export interface CalculateAnomalyTriggerThresholdParams {
  readonly thresholdTier: AnomalyTriggerThresholdTier
  readonly thresholdKind: AnomalyTriggerThresholdKind
  readonly previousAnomalyTriggerCountForAttribute: number
  readonly baseThresholdMultiplier: number
  readonly scenarioThresholdMultiplier: number
}

const ANOMALY_TRIGGER_THRESHOLDS = {
  normal: {
    standard: [600, 612, 624, 636, 648, 660, 673, 686, 699, 712],
    physical: [720, 734, 748, 762, 777, 792, 807, 823, 839, 855],
  },
  elite: {
    standard: [2250, 2295, 2340, 2386, 2433, 2481, 2530, 2580, 2631, 2683],
    physical: [2700, 2754, 2809, 2865, 2922, 2980, 3039, 3099, 3160, 3223],
  },
  boss: {
    standard: [3000, 3060, 3121, 3183, 3246, 3310, 3376, 3443, 3511, 3581],
    physical: [3600, 3672, 3745, 3819, 3895, 3972, 4051, 4132, 4214, 4298],
  },
} as const

export interface AnomalyBuildupFormulaInput {
  readonly baseAnomalyBuildup: BaseAnomalyBuildupFactorInput
  readonly anomalyMastery: AnomalyMasteryFactorInput
  readonly anomalyBuildupRate: AnomalyBuildupRateFactorInput
  readonly resistance: ResistanceFactorInput
}

export const ANOMALY_BUILDUP_FORMULA_ID = "anomaly_buildup" as const

/** 根据已确认的阈值表条件和倍率计算异常触发阈值。 */
export function calculateAnomalyTriggerThreshold(
  params: CalculateAnomalyTriggerThresholdParams,
): number {
  assertNonArrayObject(params, "calculateAnomalyTriggerThreshold params")

  const {
    thresholdTier,
    thresholdKind,
    previousAnomalyTriggerCountForAttribute,
    baseThresholdMultiplier,
    scenarioThresholdMultiplier,
  } = params

  assertAnomalyTriggerThresholdTier(thresholdTier)
  assertAnomalyTriggerThresholdKind(thresholdKind)
  assertAnomalyTriggerCount(previousAnomalyTriggerCountForAttribute)
  assertAnomalyTriggerThresholdMultiplier(
    baseThresholdMultiplier,
    "Base threshold multiplier",
  )
  assertAnomalyTriggerThresholdMultiplier(
    scenarioThresholdMultiplier,
    "Scenario threshold multiplier",
  )

  const tableIndex = Math.min(
    previousAnomalyTriggerCountForAttribute,
    MAX_ANOMALY_TRIGGER_THRESHOLD_TABLE_INDEX,
  )
  const tableThreshold =
    ANOMALY_TRIGGER_THRESHOLDS[thresholdTier][thresholdKind][tableIndex]!
  const anomalyTriggerThreshold =
    tableThreshold * baseThresholdMultiplier * scenarioThresholdMultiplier

  assertFiniteResult(anomalyTriggerThreshold, "Anomaly trigger threshold")

  return anomalyTriggerThreshold
}

export const anomalyBuildupFormula: Formula<AnomalyBuildupFormulaInput> =
  defineFormula<AnomalyBuildupFormulaInput>({
    formulaId: ANOMALY_BUILDUP_FORMULA_ID,
    calculate: (input) => {
      assertNonArrayObject(input, "Anomaly buildup formula input")

      const factorResults = {
        baseAnomalyBuildup: baseAnomalyBuildupFactor.calculate(
          input.baseAnomalyBuildup,
        ),
        anomalyMastery: anomalyMasteryFactor.calculate(input.anomalyMastery),
        anomalyBuildupRate: anomalyBuildupRateFactor.calculate(
          input.anomalyBuildupRate,
        ),
        resistance: resistanceFactor.calculate(input.resistance),
      } satisfies FormulaFactorResults<AnomalyBuildupFormulaInput>

      const value =
        factorResults.baseAnomalyBuildup *
        factorResults.anomalyMastery *
        factorResults.anomalyBuildupRate *
        factorResults.resistance

      return { value, factorResults }
    },
  })

function assertAnomalyTriggerThresholdTier(
  value: unknown,
): asserts value is AnomalyTriggerThresholdTier {
  if (typeof value !== "string") {
    throw new TypeError("Anomaly trigger threshold tier must be a string")
  }

  if (value !== "normal" && value !== "elite" && value !== "boss") {
    throw new RangeError(`Unsupported anomaly trigger threshold tier: ${value}`)
  }
}

function assertAnomalyTriggerThresholdKind(
  value: unknown,
): asserts value is AnomalyTriggerThresholdKind {
  if (typeof value !== "string") {
    throw new TypeError("Anomaly trigger threshold kind must be a string")
  }

  if (value !== "standard" && value !== "physical") {
    throw new RangeError(`Unsupported anomaly trigger threshold kind: ${value}`)
  }
}

function assertAnomalyTriggerCount(value: unknown): asserts value is number {
  assertFiniteNumber(value, "Previous anomaly trigger count for attribute")

  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      "Previous anomaly trigger count for attribute must be a non-negative integer",
    )
  }
}

function assertAnomalyTriggerThresholdMultiplier(
  value: unknown,
  name: string,
): asserts value is number {
  assertFiniteNumber(value, name)

  if (value < MIN_ANOMALY_TRIGGER_THRESHOLD_MULTIPLIER) {
    throw new RangeError(
      `${name} must be at least ${MIN_ANOMALY_TRIGGER_THRESHOLD_MULTIPLIER}`,
    )
  }
}

export interface CalculateInitialStatParams {
  readonly baseStat: number
  readonly initialStatPercentageAdjustments: readonly number[]
  readonly initialStatFixedValueAdjustments: readonly number[]
}

export interface CalculateFinalStatParams {
  readonly initialStat: number
  readonly finalStatPercentageAdjustments: readonly number[]
  readonly finalStatFixedValueAdjustments: readonly number[]
}

/** 根据基础属性、初始属性百分比调整和初始属性固定值调整计算初始属性。 */
export function calculateInitialStat(
  params: CalculateInitialStatParams,
): number {
  assertNonArrayObject(params, "calculateInitialStat params")

  const {
    baseStat,
    initialStatPercentageAdjustments,
    initialStatFixedValueAdjustments,
  } = params

  assertAdjustmentArray(
    initialStatPercentageAdjustments,
    "initialStatPercentageAdjustments",
  )
  assertAdjustmentArray(
    initialStatFixedValueAdjustments,
    "initialStatFixedValueAdjustments",
  )

  return calculateStat(
    baseStat,
    "baseStat",
    initialStatPercentageAdjustments,
    "initialStatPercentageAdjustments",
    initialStatFixedValueAdjustments,
    "initialStatFixedValueAdjustments",
  )
}

/** 根据初始属性、最终属性百分比调整和最终属性固定值调整计算最终属性。 */
export function calculateFinalStat(params: CalculateFinalStatParams): number {
  assertNonArrayObject(params, "calculateFinalStat params")

  const {
    initialStat,
    finalStatPercentageAdjustments,
    finalStatFixedValueAdjustments,
  } = params

  assertAdjustmentArray(
    finalStatPercentageAdjustments,
    "finalStatPercentageAdjustments",
  )
  assertAdjustmentArray(
    finalStatFixedValueAdjustments,
    "finalStatFixedValueAdjustments",
  )

  return calculateStat(
    initialStat,
    "initialStat",
    finalStatPercentageAdjustments,
    "finalStatPercentageAdjustments",
    finalStatFixedValueAdjustments,
    "finalStatFixedValueAdjustments",
  )
}

function calculateStat(
  sourceStat: unknown,
  sourceStatName: string,
  percentageAdjustments: readonly unknown[],
  percentageAdjustmentsName: string,
  fixedValueAdjustments: readonly unknown[],
  fixedValueAdjustmentsName: string,
): number {
  assertNonNegativeFiniteNumber(sourceStat, sourceStatName)

  const percentageAdjustment = sumFiniteAdjustments(
    percentageAdjustments,
    percentageAdjustmentsName,
  )
  const percentageMultiplier = 1 + percentageAdjustment

  assertFiniteCalculationResult(
    percentageMultiplier,
    `${percentageAdjustmentsName} multiplier`,
  )

  if (percentageMultiplier < 0) {
    throw new RangeError(
      `${percentageAdjustmentsName} multiplier must be non-negative`,
    )
  }

  const adjustedStat = sourceStat * percentageMultiplier

  assertFiniteCalculationResult(adjustedStat, `${sourceStatName} product`)

  const fixedValueAdjustment = sumFiniteAdjustments(
    fixedValueAdjustments,
    fixedValueAdjustmentsName,
  )
  const result = adjustedStat + fixedValueAdjustment

  assertFiniteCalculationResult(result, "Calculated stat")

  if (result < 0) {
    throw new RangeError("Calculated stat must be non-negative")
  }

  return result
}

function sumFiniteAdjustments(
  adjustments: readonly unknown[],
  name: string,
): number {
  let total = 0

  for (const adjustment of adjustments) {
    assertFiniteNumber(adjustment, `${name} entries`)

    total += adjustment

    if (!Number.isFinite(total)) {
      throw new RangeError(`${name} sum must be finite`)
    }
  }

  return total
}

function assertNonArrayObject(
  value: unknown,
  name: string,
): asserts value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a non-array object`)
  }
}

function assertAdjustmentArray(
  value: unknown,
  name: string,
): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`)
  }
}

function assertNonNegativeFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  assertFiniteNumber(value, name)

  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`)
  }
}

function assertFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  if (typeof value !== "number") {
    throw new TypeError(`${name} must be a number`)
  }

  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function assertFiniteCalculationResult(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

import {
  assertArray,
  assertFiniteNumber,
  assertFiniteResult,
  assertNonArrayObject,
  assertNonNegativeFiniteNumber,
  assertPositiveFiniteNumber,
} from "./internal/assert.ts"

export interface VirtualAgentContributionRecord {
  readonly effectiveAnomalyBuildup: number
  readonly level: number
  readonly anomalyProficiency: number
  readonly finalAttack: number
  readonly finalImpact: number
  readonly penetrationRatio: number
  readonly penetrationValue: number
  readonly damageBonusFactorResult: number
  readonly dazeDealtFactorResult: number
}

export interface VirtualAgentSnapshot {
  readonly level: number
  readonly anomalyProficiency: number
  readonly finalAttack: number
  readonly finalImpact: number
  readonly penetrationRatio: number
  readonly penetrationValue: number
  readonly damageBonusFactorResult: number
  readonly dazeDealtFactorResult: number
}

type ContinuousSnapshotField = Exclude<keyof VirtualAgentSnapshot, "level">

interface CachedContributionRecord extends VirtualAgentContributionRecord {
  readonly weightInMinimumUnits: bigint
}

interface Binary64Codec {
  readonly decodeToMinimumUnits: (value: number) => bigint
  readonly encodeFromMinimumUnits: (
    absoluteMinimumUnits: bigint,
    isNegative: boolean,
  ) => number
}

const BINARY64_FRACTION_BITS = 52
const BINARY64_EXPONENT_MASK = 0x7ffn
const BINARY64_FRACTION_MASK = (1n << 52n) - 1n
const BINARY64_HIDDEN_BIT = 1n << 52n
const BINARY64_SIGN_MASK = 1n << 63n
const BINARY64_MAX_FINITE_EXPONENT = 2046n

function createBinary64Codec(): Binary64Codec {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)

  return {
    decodeToMinimumUnits: (value) => {
      view.setFloat64(0, value, false)
      const bits = view.getBigUint64(0, false)
      const exponent = (bits >> 52n) & BINARY64_EXPONENT_MASK
      const fraction = bits & BINARY64_FRACTION_MASK

      let absoluteMinimumUnits: bigint

      if (exponent === 0n) {
        absoluteMinimumUnits = fraction
      } else {
        absoluteMinimumUnits =
          (BINARY64_HIDDEN_BIT + fraction) << (exponent - 1n)
      }

      if (absoluteMinimumUnits === 0n) {
        return 0n
      }

      return (bits & BINARY64_SIGN_MASK) === 0n
        ? absoluteMinimumUnits
        : -absoluteMinimumUnits
    },
    encodeFromMinimumUnits: (absoluteMinimumUnits, isNegative) => {
      let exponent = 0n
      let fraction: bigint

      if (absoluteMinimumUnits < BINARY64_HIDDEN_BIT) {
        fraction = absoluteMinimumUnits
      } else {
        const shift = bitLength(absoluteMinimumUnits) - 53
        const significand = absoluteMinimumUnits >> BigInt(shift)

        exponent = BigInt(shift + 1)
        fraction = significand - BINARY64_HIDDEN_BIT

        if (exponent > BINARY64_MAX_FINITE_EXPONENT) {
          throw new RangeError(
            "Virtual agent snapshot binary64 exponent must remain finite",
          )
        }
      }

      const bits =
        (isNegative ? BINARY64_SIGN_MASK : 0n) | (exponent << 52n) | fraction

      view.setBigUint64(0, bits, false)

      return view.getFloat64(0, false)
    },
  }
}

function bitLength(value: bigint): number {
  return value.toString(2).length
}

function assertFactorResultRange(
  value: unknown,
  name: string,
  maximum: number,
): asserts value is number {
  assertFiniteNumber(value, name)

  if (value < 0 || value > maximum) {
    throw new RangeError(`${name} must be between 0 and ${maximum}`)
  }
}

function cacheContributionRecord(
  value: unknown,
  index: number,
  codec: Binary64Codec,
): CachedContributionRecord {
  const name = `Virtual agent contribution record at index ${index}`

  assertNonArrayObject(value, name)

  const record = value as Partial<VirtualAgentContributionRecord>
  const {
    effectiveAnomalyBuildup,
    level,
    anomalyProficiency,
    finalAttack,
    finalImpact,
    penetrationRatio,
    penetrationValue,
    damageBonusFactorResult,
    dazeDealtFactorResult,
  } = record

  assertPositiveFiniteNumber(
    effectiveAnomalyBuildup,
    `${name} effectiveAnomalyBuildup`,
  )
  assertFiniteNumber(level, `${name} level`)

  if (!Number.isInteger(level) || level < 1 || level > 60) {
    throw new RangeError(`${name} level must be an integer between 1 and 60`)
  }

  assertNonNegativeFiniteNumber(
    anomalyProficiency,
    `${name} anomalyProficiency`,
  )
  assertNonNegativeFiniteNumber(finalAttack, `${name} finalAttack`)
  assertNonNegativeFiniteNumber(finalImpact, `${name} finalImpact`)
  assertFiniteNumber(penetrationRatio, `${name} penetrationRatio`)
  assertFiniteNumber(penetrationValue, `${name} penetrationValue`)
  assertFactorResultRange(
    damageBonusFactorResult,
    `${name} damageBonusFactorResult`,
    6,
  )
  assertFactorResultRange(
    dazeDealtFactorResult,
    `${name} dazeDealtFactorResult`,
    4,
  )

  const weightInMinimumUnits = codec.decodeToMinimumUnits(
    effectiveAnomalyBuildup,
  )

  if (weightInMinimumUnits <= 0n) {
    throw new RangeError(`${name} weight must be positive`)
  }

  return {
    effectiveAnomalyBuildup,
    level,
    anomalyProficiency,
    finalAttack,
    finalImpact,
    penetrationRatio,
    penetrationValue,
    damageBonusFactorResult,
    dazeDealtFactorResult,
    weightInMinimumUnits,
  }
}

function roundExactWeightedValue(
  numerator: bigint,
  denominator: bigint,
  codec: Binary64Codec,
): number {
  if (numerator === 0n) {
    return 0
  }

  const isNegative = numerator < 0n
  const absoluteNumerator = isNegative ? -numerator : numerator
  let binaryExponent = bitLength(absoluteNumerator) - bitLength(denominator)

  const estimateIsTooHigh =
    binaryExponent >= 0
      ? absoluteNumerator < denominator << BigInt(binaryExponent)
      : absoluteNumerator << BigInt(-binaryExponent) < denominator

  if (estimateIsTooHigh) {
    binaryExponent -= 1
  }

  const precisionShift = Math.max(0, binaryExponent - BINARY64_FRACTION_BITS)
  const divisor = denominator << BigInt(precisionShift)
  let quotient = absoluteNumerator / divisor
  const remainder = absoluteNumerator % divisor
  const doubledRemainder = remainder << 1n

  if (
    doubledRemainder > divisor ||
    (doubledRemainder === divisor && (quotient & 1n) === 1n)
  ) {
    quotient += 1n
  }

  const roundedMinimumUnits = quotient << BigInt(precisionShift)

  return codec.encodeFromMinimumUnits(roundedMinimumUnits, isNegative)
}

function calculateWeightedField(
  records: readonly CachedContributionRecord[],
  field: ContinuousSnapshotField,
  denominator: bigint,
  codec: Binary64Codec,
): number {
  let numerator = 0n

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]

    numerator +=
      record.weightInMinimumUnits * codec.decodeToMinimumUnits(record[field])
  }

  return roundExactWeightedValue(numerator, denominator, codec)
}

function assertWeightedFieldInvariant(
  value: number,
  field: ContinuousSnapshotField,
  records: readonly CachedContributionRecord[],
): void {
  assertFiniteResult(value, `Virtual agent snapshot ${field}`)

  let minimum = records[0][field]
  let maximum = records[0][field]

  for (let index = 1; index < records.length; index += 1) {
    const inputValue = records[index][field]

    if (inputValue < minimum) {
      minimum = inputValue
    }

    if (inputValue > maximum) {
      maximum = inputValue
    }
  }

  if (value < minimum || value > maximum) {
    throw new RangeError(
      `Virtual agent snapshot ${field} must remain within its input range`,
    )
  }

  switch (field) {
    case "anomalyProficiency":
    case "finalAttack":
    case "finalImpact":
      assertNonNegativeFiniteNumber(value, `Virtual agent snapshot ${field}`)
      break
    case "damageBonusFactorResult":
      assertFactorResultRange(value, `Virtual agent snapshot ${field}`, 6)
      break
    case "dazeDealtFactorResult":
      assertFactorResultRange(value, `Virtual agent snapshot ${field}`, 4)
      break
    case "penetrationRatio":
    case "penetrationValue":
      break
  }
}

/** 根据已经筛选并裁剪的有效代理人异常积蓄记录计算虚拟代理人快照。 */
export function calculateVirtualAgentSnapshot(
  contributionRecords: readonly VirtualAgentContributionRecord[],
): VirtualAgentSnapshot {
  assertArray(contributionRecords, "Virtual agent contribution records")
  const recordCount = contributionRecords.length

  if (recordCount === 0) {
    throw new RangeError("Virtual agent contribution records must not be empty")
  }

  const codec = createBinary64Codec()
  const records: CachedContributionRecord[] = []

  for (let index = 0; index < recordCount; index += 1) {
    const value = Object.hasOwn(contributionRecords, index)
      ? contributionRecords[index]
      : undefined

    records.push(cacheContributionRecord(value, index, codec))
  }

  let denominator = 0n
  let levelNumerator = 0n

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]

    denominator += record.weightInMinimumUnits
    levelNumerator += record.weightInMinimumUnits * BigInt(record.level)
  }

  const level = Number(levelNumerator / denominator)
  const snapshot: VirtualAgentSnapshot = {
    level,
    anomalyProficiency: calculateWeightedField(
      records,
      "anomalyProficiency",
      denominator,
      codec,
    ),
    finalAttack: calculateWeightedField(
      records,
      "finalAttack",
      denominator,
      codec,
    ),
    finalImpact: calculateWeightedField(
      records,
      "finalImpact",
      denominator,
      codec,
    ),
    penetrationRatio: calculateWeightedField(
      records,
      "penetrationRatio",
      denominator,
      codec,
    ),
    penetrationValue: calculateWeightedField(
      records,
      "penetrationValue",
      denominator,
      codec,
    ),
    damageBonusFactorResult: calculateWeightedField(
      records,
      "damageBonusFactorResult",
      denominator,
      codec,
    ),
    dazeDealtFactorResult: calculateWeightedField(
      records,
      "dazeDealtFactorResult",
      denominator,
      codec,
    ),
  }

  let minimumLevel = records[0].level
  let maximumLevel = records[0].level

  for (let index = 1; index < records.length; index += 1) {
    minimumLevel = Math.min(minimumLevel, records[index].level)
    maximumLevel = Math.max(maximumLevel, records[index].level)
  }

  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level > 60 ||
    level < minimumLevel ||
    level > maximumLevel
  ) {
    throw new RangeError(
      "Virtual agent snapshot level must remain within its integer input range",
    )
  }

  const continuousFields = [
    "anomalyProficiency",
    "finalAttack",
    "finalImpact",
    "penetrationRatio",
    "penetrationValue",
    "damageBonusFactorResult",
    "dazeDealtFactorResult",
  ] as const satisfies readonly ContinuousSnapshotField[]

  for (const field of continuousFields) {
    assertWeightedFieldInvariant(snapshot[field], field, records)
  }

  return Object.freeze(snapshot)
}

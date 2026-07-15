import { getBucketSpec } from "./bucket-specs"
import {
  trustedHasOwn,
  trustedObjectKeys,
  trustedSetArrayItem,
} from "./trusted-intrinsics"
import type { BucketId, FormulaId, FormulaSpec } from "./types"

const formulaSpecs = {
  regular_damage: {
    formulaId: "regular_damage",
    buckets: [
      "base_damage",
      "damage_bonus",
      "crit",
      "defense",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ],
    requiredBuckets: ["base_damage"],
    optionalBuckets: [
      "damage_bonus",
      "crit",
      "defense",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ],
  },
  sheer_damage: {
    formulaId: "sheer_damage",
    buckets: [
      "base_damage",
      "damage_bonus",
      "crit",
      "sheer_damage_bonus",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ],
    requiredBuckets: ["base_damage"],
    optionalBuckets: [
      "damage_bonus",
      "crit",
      "sheer_damage_bonus",
      "resistance",
      "damage_taken",
      "stun_damage_taken",
      "special",
    ],
    ignoredBuckets: ["defense"],
  },
} satisfies Record<FormulaId, FormulaSpec>

const registeredFormulaIds = trustedObjectKeys(formulaSpecs) as FormulaId[]

validateFormulaRegistry(formulaSpecs)
freezeFormulaSpecs(formulaSpecs)

export function getFormulaSpec(formulaId: FormulaId): FormulaSpec {
  return copyFormulaSpec(formulaSpecs[formulaId])
}

export function listBuckets(formulaId: FormulaId): readonly BucketId[] {
  return copyArray(formulaSpecs[formulaId].buckets)
}

export function getFormulaSpecById(
  formulaId: unknown,
): FormulaSpec | undefined {
  if (isFormulaId(formulaId)) {
    return formulaSpecs[formulaId]
  }

  return undefined
}

export function isFormulaId(formulaId: unknown): formulaId is FormulaId {
  return typeof formulaId === "string" && trustedHasOwn(formulaSpecs, formulaId)
}

export function listRegisteredFormulaIds(): readonly FormulaId[] {
  return copyArray(registeredFormulaIds)
}

export function validateFormulaSpec(formulaSpec: FormulaSpec): void {
  assertUniqueBucketIds(formulaSpec, "buckets", formulaSpec.buckets)
  assertUniqueBucketIds(
    formulaSpec,
    "requiredBuckets",
    formulaSpec.requiredBuckets,
  )
  assertUniqueBucketIds(
    formulaSpec,
    "optionalBuckets",
    formulaSpec.optionalBuckets,
  )

  for (let index = 0; index < formulaSpec.buckets.length; index += 1) {
    const bucketId = formulaSpec.buckets[index]!
    const isRequired = includesBucketId(formulaSpec.requiredBuckets, bucketId)
    const isOptional = includesBucketId(formulaSpec.optionalBuckets, bucketId)
    if (isRequired === isOptional) {
      throw new Error(
        `${formulaSpec.formulaId}: ${bucketId} must appear in exactly one of requiredBuckets or optionalBuckets`,
      )
    }
  }

  assertClassifiedBucketsPresent(formulaSpec, formulaSpec.requiredBuckets)
  assertClassifiedBucketsPresent(formulaSpec, formulaSpec.optionalBuckets)

  for (let index = 0; index < formulaSpec.optionalBuckets.length; index += 1) {
    const bucketId = formulaSpec.optionalBuckets[index]!
    if (getBucketSpec(bucketId).defaultValue === undefined) {
      throw new Error(
        `${formulaSpec.formulaId}: optional bucket ${bucketId} must define a default value`,
      )
    }
  }

  const ignoredBuckets = formulaSpec.ignoredBuckets ?? []
  assertUniqueBucketIds(formulaSpec, "ignoredBuckets", ignoredBuckets)
  for (let index = 0; index < ignoredBuckets.length; index += 1) {
    const bucketId = ignoredBuckets[index]!
    if (includesBucketId(formulaSpec.buckets, bucketId)) {
      throw new Error(
        `${formulaSpec.formulaId}: ${bucketId} cannot be both calculated and ignored`,
      )
    }

    if (getBucketSpec(bucketId).defaultValue === undefined) {
      throw new Error(
        `${formulaSpec.formulaId}: ignored bucket ${bucketId} must define a default value`,
      )
    }
  }
}

export function validateFormulaRegistry(
  specs: Record<FormulaId, FormulaSpec>,
): void {
  const formulaIds = trustedObjectKeys(specs) as FormulaId[]
  for (let index = 0; index < formulaIds.length; index += 1) {
    const formulaId = formulaIds[index]!
    const formulaSpec = specs[formulaId]
    if (formulaId !== formulaSpec.formulaId) {
      throw new Error(
        `formula registry key ${formulaId} does not match entry identity ${formulaSpec.formulaId}`,
      )
    }

    validateFormulaSpec(formulaSpec)
  }
}

function copyFormulaSpec(formulaSpec: FormulaSpec): FormulaSpec {
  return {
    formulaId: formulaSpec.formulaId,
    buckets: copyArray(formulaSpec.buckets),
    requiredBuckets: copyArray(formulaSpec.requiredBuckets),
    optionalBuckets: copyArray(formulaSpec.optionalBuckets),
    ignoredBuckets:
      formulaSpec.ignoredBuckets === undefined
        ? undefined
        : copyArray(formulaSpec.ignoredBuckets),
  }
}

function copyArray<T>(values: readonly T[]): T[] {
  const copy: T[] = []
  for (let index = 0; index < values.length; index += 1) {
    trustedSetArrayItem(copy, index, values[index]!)
  }
  return copy
}

function freezeFormulaSpecs(specs: Record<FormulaId, FormulaSpec>): void {
  const formulaIds = trustedObjectKeys(specs) as FormulaId[]
  for (let index = 0; index < formulaIds.length; index += 1) {
    const formulaSpec = specs[formulaIds[index]!]
    Object.freeze(formulaSpec.buckets)
    Object.freeze(formulaSpec.requiredBuckets)
    Object.freeze(formulaSpec.optionalBuckets)

    if (formulaSpec.ignoredBuckets !== undefined) {
      Object.freeze(formulaSpec.ignoredBuckets)
    }

    Object.freeze(formulaSpec)
  }

  Object.freeze(specs)
}

function assertUniqueBucketIds(
  formulaSpec: FormulaSpec,
  field: string,
  bucketIds: readonly BucketId[],
): void {
  for (let index = 0; index < bucketIds.length; index += 1) {
    for (let seenIndex = 0; seenIndex < index; seenIndex += 1) {
      if (bucketIds[index] === bucketIds[seenIndex]) {
        throw new Error(
          `${formulaSpec.formulaId}: ${field} contains duplicates`,
        )
      }
    }
  }
}

function assertClassifiedBucketsPresent(
  formulaSpec: FormulaSpec,
  classifiedBucketIds: readonly BucketId[],
): void {
  for (let index = 0; index < classifiedBucketIds.length; index += 1) {
    const bucketId = classifiedBucketIds[index]!
    if (!includesBucketId(formulaSpec.buckets, bucketId)) {
      throw new Error(
        `${formulaSpec.formulaId}: ${bucketId} is classified but absent from buckets`,
      )
    }
  }
}

function includesBucketId(
  bucketIds: readonly BucketId[],
  bucketId: BucketId,
): boolean {
  for (let index = 0; index < bucketIds.length; index += 1) {
    if (bucketIds[index] === bucketId) {
      return true
    }
  }

  return false
}

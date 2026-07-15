import { getBucketSpec } from "./bucket-specs"
import { trustedHasOwn } from "./trusted-intrinsics"
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

validateFormulaRegistry(formulaSpecs)
freezeFormulaSpecs(formulaSpecs)

export function getFormulaSpec(formulaId: FormulaId): FormulaSpec {
  return copyFormulaSpec(formulaSpecs[formulaId])
}

export function listBuckets(formulaId: FormulaId): readonly BucketId[] {
  return [...formulaSpecs[formulaId].buckets]
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
  return Object.keys(formulaSpecs) as FormulaId[]
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

  const buckets = new Set(formulaSpec.buckets)
  const requiredBuckets = new Set(formulaSpec.requiredBuckets)
  const optionalBuckets = new Set(formulaSpec.optionalBuckets)

  for (const bucketId of formulaSpec.buckets) {
    const isRequired = requiredBuckets.has(bucketId)
    const isOptional = optionalBuckets.has(bucketId)
    if (isRequired === isOptional) {
      throw new Error(
        `${formulaSpec.formulaId}: ${bucketId} must appear in exactly one of requiredBuckets or optionalBuckets`,
      )
    }
  }

  for (const bucketId of [
    ...formulaSpec.requiredBuckets,
    ...formulaSpec.optionalBuckets,
  ]) {
    if (!buckets.has(bucketId)) {
      throw new Error(
        `${formulaSpec.formulaId}: ${bucketId} is classified but absent from buckets`,
      )
    }
  }

  for (const bucketId of formulaSpec.optionalBuckets) {
    if (getBucketSpec(bucketId).defaultValue === undefined) {
      throw new Error(
        `${formulaSpec.formulaId}: optional bucket ${bucketId} must define a default value`,
      )
    }
  }

  const ignoredBuckets = formulaSpec.ignoredBuckets ?? []
  assertUniqueBucketIds(formulaSpec, "ignoredBuckets", ignoredBuckets)
  for (const bucketId of ignoredBuckets) {
    if (buckets.has(bucketId)) {
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
  for (const [formulaId, formulaSpec] of Object.entries(specs) as [
    FormulaId,
    FormulaSpec,
  ][]) {
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
    buckets: [...formulaSpec.buckets],
    requiredBuckets: [...formulaSpec.requiredBuckets],
    optionalBuckets: [...formulaSpec.optionalBuckets],
    ignoredBuckets:
      formulaSpec.ignoredBuckets === undefined
        ? undefined
        : [...formulaSpec.ignoredBuckets],
  }
}

function freezeFormulaSpecs(specs: Record<FormulaId, FormulaSpec>): void {
  for (const formulaSpec of Object.values(specs)) {
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
  if (new Set(bucketIds).size !== bucketIds.length) {
    throw new Error(`${formulaSpec.formulaId}: ${field} contains duplicates`)
  }
}

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

freezeFormulaSpecs(formulaSpecs)

export function getFormulaSpec(formulaId: FormulaId): FormulaSpec {
  return copyFormulaSpec(formulaSpecs[formulaId])
}

export function listBuckets(formulaId: FormulaId): readonly BucketId[] {
  return [...formulaSpecs[formulaId].buckets]
}

export function getFormulaSpecById(formulaId: string): FormulaSpec | undefined {
  if (isFormulaId(formulaId)) {
    return formulaSpecs[formulaId]
  }

  return undefined
}

export function isFormulaId(formulaId: string): formulaId is FormulaId {
  return formulaId === "regular_damage" || formulaId === "sheer_damage"
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

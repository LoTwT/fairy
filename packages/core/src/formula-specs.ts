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

export function getFormulaSpec(formulaId: FormulaId): FormulaSpec {
  return formulaSpecs[formulaId]
}

export function listBuckets(formulaId: FormulaId): readonly BucketId[] {
  return getFormulaSpec(formulaId).buckets
}

export function getFormulaSpecById(formulaId: string): FormulaSpec | undefined {
  if (isFormulaId(formulaId)) {
    return getFormulaSpec(formulaId)
  }

  return undefined
}

export function isFormulaId(formulaId: string): formulaId is FormulaId {
  return formulaId === "regular_damage" || formulaId === "sheer_damage"
}

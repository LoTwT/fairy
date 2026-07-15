import { trustedHasOwn, trustedObjectKeys } from "./trusted-intrinsics"
import type { BucketId, BucketSpec } from "./types"

const bucketSpecs = {
  base_damage: {
    bucketId: "base_damage",
    acceptsDirectValue: true,
    contributionReducer: "sum",
  },
  damage_bonus: {
    bucketId: "damage_bonus",
    acceptsDirectValue: true,
    contributionReducer: "one_plus_sum",
    defaultValue: 1,
  },
  crit: {
    bucketId: "crit",
    acceptsDirectValue: true,
    defaultValue: 1,
  },
  defense: {
    bucketId: "defense",
    acceptsDirectValue: true,
    acceptsDerivedValue: true,
    defaultValue: 1,
  },
  sheer_damage_bonus: {
    bucketId: "sheer_damage_bonus",
    acceptsDirectValue: true,
    contributionReducer: "one_plus_sum",
    defaultValue: 1,
  },
  resistance: {
    bucketId: "resistance",
    acceptsDirectValue: true,
    defaultValue: 1,
  },
  damage_taken: {
    bucketId: "damage_taken",
    acceptsDirectValue: true,
    contributionReducer: "one_plus_sum",
    defaultValue: 1,
  },
  stun_damage_taken: {
    bucketId: "stun_damage_taken",
    acceptsDirectValue: true,
    contributionReducer: "one_plus_sum",
    defaultValue: 1,
  },
  special: {
    bucketId: "special",
    acceptsDirectValue: true,
    defaultValue: 1,
  },
} satisfies Record<BucketId, BucketSpec>

const bucketSpecCount = trustedObjectKeys(bucketSpecs).length

export function getBucketSpec(bucketId: BucketId): BucketSpec {
  return bucketSpecs[bucketId]
}

export function getBucketSpecCount(): number {
  return bucketSpecCount
}

export function isBucketId(bucketId: unknown): bucketId is BucketId {
  return typeof bucketId === "string" && trustedHasOwn(bucketSpecs, bucketId)
}

import type {
  Attribute,
  BucketContributor,
  BucketResult,
  EnemySnapshot,
  MultiplierBucket,
  SourceRef,
} from "../schema"
import type { BucketInput } from "./types"
import { clamp, getDefaultEnemyBaseDefense, getLevelBase } from "./math"

const attributeDamageBonusField: Record<Attribute, string> = {
  fire: "fireDamageBonus",
  electric: "electricDamageBonus",
  ice: "iceDamageBonus",
  physical: "physicalDamageBonus",
  ether: "etherDamageBonus",
  frost: "iceDamageBonus",
  auricInk: "etherDamageBonus",
}

const resistanceAttributeByAttribute: Record<Attribute, "fire" | "electric" | "ice" | "physical" | "ether"> = {
  fire: "fire",
  electric: "electric",
  ice: "ice",
  physical: "physical",
  ether: "ether",
  frost: "ice",
  auricInk: "ether",
}

export function getDamageBonusField(attribute: Attribute): string {
  return attributeDamageBonusField[attribute]
}

export function getResistanceAttribute(attribute: Attribute): "fire" | "electric" | "ice" | "physical" | "ether" {
  return resistanceAttributeByAttribute[attribute]
}

export function makeContributor(input: {
  id: string
  value: number
  operation?: BucketContributor["operation"]
  active?: boolean
  source?: SourceRef
  sourceAnchor?: string
  modifierId?: string
  inactiveReason?: string
  sourceMissing?: boolean
  diagnosticRefs?: string[]
}): BucketContributor {
  return {
    id: input.id,
    value: input.value,
    operation: input.operation ?? "add",
    active: input.active ?? true,
    ...(input.source === undefined ? {} : { source: input.source }),
    ...(input.sourceAnchor === undefined ? {} : { sourceAnchor: input.sourceAnchor }),
    ...(input.modifierId === undefined ? {} : { modifierId: input.modifierId }),
    ...(input.inactiveReason === undefined ? {} : { inactiveReason: input.inactiveReason }),
    ...(input.sourceMissing === undefined ? {} : { sourceMissing: input.sourceMissing }),
    ...(input.diagnosticRefs === undefined ? {} : { diagnosticRefs: input.diagnosticRefs }),
  }
}

export function makeBucket(input: BucketInput): BucketResult {
  return {
    bucketId: input.bucketId,
    before: input.before ?? 1,
    after: input.after,
    effectiveMultiplier: input.effectiveMultiplier,
    contributors: input.contributors ?? [],
    traceRefs: input.traceRefs ?? [],
  }
}

export function getAttributeDamageBonus(panel: Record<string, unknown>, attribute: Attribute): number {
  const field = getDamageBonusField(attribute)
  const value = panel[field]
  return typeof value === "number" ? value : 0
}

export function getResistance(enemy: EnemySnapshot, attribute: Attribute): number {
  return enemy.resistance?.[getResistanceAttribute(attribute)] ?? 0
}

export function getEnemyDefense(enemy: EnemySnapshot, attackerLevel: number): number {
  return enemy.defense ?? getDefaultEnemyBaseDefense(Math.min(attackerLevel, enemy.level), enemy.rank)
}

export function getDefenseMultiplier(input: {
  attackerLevel: number
  enemy: EnemySnapshot
  penetrationRate?: number
  flatPenetration?: number
  defenseReduction?: number
}): {
  levelBase: number
  baseDefense: number
  effectiveDefense: number
  multiplier: number
} {
  const levelBase = getLevelBase(input.attackerLevel)
  const baseDefense = getEnemyDefense(input.enemy, input.attackerLevel)
  const corruptedShieldMultiplier = input.enemy.corruptedShield?.active
    ? input.enemy.corruptedShield.defenseMultiplier ?? 1.8
    : 1
  const effectiveDefense = Math.max(
    0,
    baseDefense
    * corruptedShieldMultiplier
    * (1 - (input.defenseReduction ?? 0))
    * (1 - (input.penetrationRate ?? 0))
    - (input.flatPenetration ?? 0),
  )

  return {
    levelBase,
    baseDefense,
    effectiveDefense,
    multiplier: levelBase / (effectiveDefense + levelBase),
  }
}

export function getResistanceMultiplier(resistance: number, resistanceReduction = 0): number {
  return clamp(1 - resistance + resistanceReduction, 0, 2)
}

export function getVulnerabilityMultiplier(vulnerability = 0, reduction = 0): number {
  return clamp(1 + vulnerability - reduction, 0.2, 2)
}

export function getDazeVulnerabilityMultiplier(isDazed: boolean, dazeVulnerability = 0.5, nonDazeVulnerability = 0): number {
  return isDazed
    ? clamp(1 + dazeVulnerability, 0.2, 5)
    : clamp(1 + nonDazeVulnerability, 1, 3)
}

export function isEnemyDazed(enemy: EnemySnapshot): boolean {
  return enemy.states?.includes("dazed") ?? false
}

export function getCorruptedShieldDamageReduction(enemy: EnemySnapshot): number {
  return enemy.corruptedShield?.active ? 0.25 : 0
}

export { clamp }

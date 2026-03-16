// Canonical terminology layer for public consumers.
//
// The published JSON files keep source-compatible field names and localized
// display values. This module provides a normalized contract on top of those
// raw values so downstream code does not need to guess string literals or
// maintain its own mapping tables.

type ValuesOf<T> = T[keyof T] extends readonly (infer U)[] ? U : never

export type CanonicalTermText = string

export type NormalizedCanonicalTermText = string

export type CanonicalTermGroupMap = Record<string, readonly CanonicalTermText[]>

function normalizeTerm(value: CanonicalTermText): NormalizedCanonicalTermText {
  return value.toLowerCase().replace(/[\s\-_]/g, "")
}

function createCanonicalizer<T extends CanonicalTermGroupMap>(groups: T) {
  const lookup = new Map<string, keyof T>()

  for (const [canonical, labels] of Object.entries(groups)) {
    lookup.set(normalizeTerm(canonical), canonical)
    for (const label of labels) {
      lookup.set(normalizeTerm(label), canonical)
    }
  }

  return (value: string | undefined): keyof T | undefined => {
    if (!value) return undefined
    return lookup.get(normalizeTerm(value))
  }
}

export const agentSpecialtyLabels = {
  Attack: ["Attack", "强攻"],
  Stun: ["Stun", "击破"],
  Anomaly: ["Anomaly", "异常"],
  Support: ["Support", "支援"],
  Defense: ["Defense", "防护"],
  Rupture: ["Rupture", "命破"],
} as const

export type AgentSpecialty = keyof typeof agentSpecialtyLabels
export type AgentSpecialtyLabel =
  | AgentSpecialty
  | ValuesOf<typeof agentSpecialtyLabels>

export const attributeLabels = {
  "Electric": ["Electric", "电属性"],
  "Fire": ["Fire", "火属性"],
  "Ice": ["Ice", "冰属性"],
  "Ether": ["Ether", "以太"],
  "Physical": ["Physical", "物理"],
  // Special attributes keep their own canonical names even when they share
  // the same resistance bucket as a base attribute.
  "Auric Ink": ["Auric Ink", "玄墨"],
  "Frost": ["Frost", "烈霜"],
  "Honed Edge": ["Honed Edge", "凛刃"],
} as const

export type AgentAttribute = keyof typeof attributeLabels
export type AgentAttributeLabel =
  | AgentAttribute
  | ValuesOf<typeof attributeLabels>

export const attackTypeLabels = {
  Slash: ["Slash", "斩击"],
  Strike: ["Strike", "打击"],
  Pierce: ["Pierce", "穿透"],
} as const

export type AttackType = keyof typeof attackTypeLabels
export type AttackTypeLabel = AttackType | ValuesOf<typeof attackTypeLabels>

export const baseResistanceAttributes = [
  "ice",
  "fire",
  "electric",
  "ether",
  "physical",
] as const

export type BaseResistanceAttribute = (typeof baseResistanceAttributes)[number]

export type CanonicalTermLookupText = string | undefined

export type BaseResistanceIndex = number

// This order matches game-modes `elementMult`.
export const ELEMENT_MULT_ORDER = baseResistanceAttributes

export const ATTRIBUTE_TO_BASE_RESISTANCE = {
  "Electric": "electric",
  "Fire": "fire",
  "Ice": "ice",
  "Ether": "ether",
  "Physical": "physical",
  "Auric Ink": "ether",
  "Frost": "ice",
  "Honed Edge": "physical",
} as const satisfies Record<AgentAttribute, BaseResistanceAttribute>

const canonicalizeSpecialty = createCanonicalizer(agentSpecialtyLabels)
const canonicalizeAttribute = createCanonicalizer(attributeLabels)
const canonicalizeAttackType = createCanonicalizer(attackTypeLabels)

export function toAgentSpecialty(
  value: CanonicalTermLookupText,
): AgentSpecialty | undefined {
  return canonicalizeSpecialty(value) as AgentSpecialty | undefined
}

export function toAgentAttribute(
  value: CanonicalTermLookupText,
): AgentAttribute | undefined {
  return canonicalizeAttribute(value) as AgentAttribute | undefined
}

export function toAttackType(
  value: CanonicalTermLookupText,
): AttackType | undefined {
  return canonicalizeAttackType(value) as AttackType | undefined
}

export function toBaseResistanceAttribute(
  value: CanonicalTermLookupText,
): BaseResistanceAttribute | undefined {
  const attribute = toAgentAttribute(value)
  if (!attribute) return undefined
  return ATTRIBUTE_TO_BASE_RESISTANCE[attribute]
}

export function getElementMultIndex(
  value: CanonicalTermLookupText,
): BaseResistanceIndex | undefined {
  const attribute = toBaseResistanceAttribute(value)
  if (!attribute) return undefined
  return ELEMENT_MULT_ORDER.indexOf(attribute)
}

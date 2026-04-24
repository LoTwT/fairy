import type { AnomalyType, Attribute, AttributeChannel, ClampRange, ModifierTag } from './types.js'

export const LEVEL_COEFFICIENT_TABLE = Object.freeze(
  Array.from({ length: 61 }, (_, index) => {
    if (index === 0)
      return 0

    const value = 100 + (index * 18) + ((index ** 2) * 0.75)
    return Number(value.toFixed(2))
  }),
)

export const ENEMY_BASE_DEFENSE_GROWTH_CAP_LEVEL = 60

export const DEFAULT_AGENT_CRIT_RATE = 0.05
export const DEFAULT_AGENT_CRIT_DAMAGE = 0.5
export const DEFAULT_ENEMY_CRIT_RATE = 0
export const DEFAULT_ENEMY_CRIT_DAMAGE = 0

export const ATTRIBUTE_TAGS = Object.freeze([
  'fire',
  'electric',
  'ice',
  'physical',
  'ether',
  'frost',
  'auricInk',
] satisfies readonly Attribute[])

export const DAMAGE_TYPE_TAGS = Object.freeze([
  'regular',
  'pierce',
  'true',
] as const)

export const ANOMALY_TAGS = Object.freeze([
  'burn',
  'shock',
  'freeze',
  'frostbite',
  'assault',
  'corrupt',
  'disorder',
] satisfies readonly AnomalyType[])

export const ACTION_TAGS = Object.freeze([
  'basic',
  'dash',
  'dodgeCounter',
  'special',
  'enhancedSpecial',
  'chain',
  'ultimate',
  'quickAssist',
  'defensiveAssist',
  'evasiveAssist',
  'followUp',
] as const)

export const TAG_VOCABULARY: readonly ModifierTag[] = Object.freeze([
  ...ATTRIBUTE_TAGS,
  ...DAMAGE_TYPE_TAGS,
  ...ANOMALY_TAGS,
  ...ACTION_TAGS,
])

export const ATTRIBUTE_ALIAS_MAP: Readonly<Record<Attribute, AttributeChannel>> = Object.freeze({
  fire: 'fire',
  electric: 'electric',
  ice: 'ice',
  physical: 'physical',
  ether: 'ether',
  frost: 'ice',
  auricInk: 'ether',
})

export function getAttributeModifierTags(attribute: Attribute): readonly Attribute[] {
  const alias = ATTRIBUTE_ALIAS_MAP[attribute]
  return alias === attribute ? [attribute] : [attribute, alias]
}

export const ROUNDING_RULES = Object.freeze({
  damageSegmentDisplay: 'ceil',
  anomalyMasteryForUse: 'floor',
  damageLevelRegion: 'trunc4',
  virtualAgentLevel: 'floor',
  dazeRatioDisplay: 'floor',
} as const)

export const BUCKET_CLAMP_RANGES: Readonly<Record<string, ClampRange>> = Object.freeze({
  damageBonus: { min: -1, max: 5 },
  critRate: { min: 0, max: 1 },
  critDamage: { min: 0, max: 5 },
  damageResistance: { min: -1, max: 0.95 },
  dazeResistance: { min: -1, max: 0.95 },
  anomalyBuildupResistance: { min: -1, max: 0.95 },
  vulnerability: { min: -1, max: 3 },
  dazedVulnerability: { min: -1, max: 2.5 },
  preDazeVulnerability: { min: -1, max: 1.5 },
  pierceDamageBonus: { min: -1, max: 3 },
  anomalyMasteryArea: { min: 0, max: 5000 },
  anomalyProficiencyArea: { min: 0, max: 5000 },
  anomalyDamageBonus: { min: -1, max: 4 },
  anomalyCritArea: { min: 0, max: 5 },
  energyGainEfficiency: { min: -1, max: 3 },
  flashGainEfficiency: { min: -1, max: 3 },
  noiseGainEfficiency: { min: -1, max: 3 },
  shieldReductionEfficiency: { min: -1, max: 3 },
  shieldBeingReducedEfficiency: { min: -1, max: 3 },
  corruptionGainEfficiency: { min: -1, max: 3 },
  distanceDecay: { min: -1, max: 1 },
  defenseReduction: { min: 0, max: 1 },
  defensePenetrationRate: { min: 0, max: 1 },
  defensePenetrationFlat: { min: 0, max: Number.POSITIVE_INFINITY },
  dazeRecoverySpeed: { min: 0.01, max: 100 },
  antiInterrupt: { min: 0, max: 999 },
})

export const ANOMALY_TRIGGER_THRESHOLD_TABLE: Readonly<Record<AnomalyType, number>> = Object.freeze({
  burn: 100,
  shock: 100,
  freeze: 110,
  frostbite: 110,
  assault: 120,
  corrupt: 125,
  disorder: 0,
})

export const DEFAULT_STATUS_DURATIONS: Readonly<Record<'freeze' | 'burn' | 'shock' | 'frostbite' | 'assault' | 'corrupt', number>> = Object.freeze({
  freeze: 4,
  burn: 10,
  shock: 10,
  frostbite: 12,
  assault: 7,
  corrupt: 12,
})

export const DEFAULT_CORRUPTION_BURST_MULTIPLIER = 1.2
export const DEFAULT_SHIELD_PURGE_DAMAGE_MULTIPLIER = 0.8
export const DEFAULT_DISORDER_DAMAGE_MULTIPLIER = 1.35
export const DISORDER_DAZE_LEVEL_REGION_COEFFICIENT = 0.25
export const DEFAULT_SUPPORT_PARRY_INTERRUPT_LEVEL = 1

export function getLevelCoefficient(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const cappedLevel = Math.min(safeLevel, ENEMY_BASE_DEFENSE_GROWTH_CAP_LEVEL)
  return LEVEL_COEFFICIENT_TABLE[cappedLevel] ?? LEVEL_COEFFICIENT_TABLE[ENEMY_BASE_DEFENSE_GROWTH_CAP_LEVEL]
}

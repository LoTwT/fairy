import type {
  CoreSkillLevel,
  DirectStat,
  DamageElement,
  DamageKind,
  FactorChannel,
  FactorChannelUnitMap,
  EffectId,
  EntityId,
  GeneralStat,
  MindscapeRank,
  Phase,
  RefinementRank,
  SetPieceCount,
  SourceKind,
  Stat,
  StatUnitMap,
  Unit,
} from "../types.ts"

export const DAMAGE_ELEMENTS: readonly DamageElement[] = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
  "auric-ink",
  "frost",
  "lumiflux",
]
export const DAMAGE_KINDS: readonly DamageKind[] = [
  "regular",
  "sheer",
  "anomaly",
  "disorder",
  "vortex",
  "anomaly-settlement",
  "luminize",
]
export const FACTOR_CHANNEL_UNITS: FactorChannelUnitMap = {
  "damage-bonus": "ratio",
  "daze-dealt-increase": "ratio",
  "daze-dealt-reduction": "ratio",
  "target-resistance-reduction": "ratio",
  "attacker-resistance-ignore": "ratio",
  "energy-generation-rate": "ratio",
  "target-defense-adjustment": "ratio",
  "attacker-penetration-value": "defense-points",
  "damage-taken-increase": "ratio",
  "damage-taken-reduction": "ratio",
  "stun-damage-adjustment": "multiplier",
  "sheer-damage-bonus": "ratio",
  "anomaly-damage-bonus": "ratio",
  "anomaly-critical-rate": "ratio",
  "anomaly-critical-damage": "ratio",
  "luminize-multiplier-addition": "multiplier",
  "luminize-multiplier-scale": "multiplier",
  "refringe-coefficient-increase": "ratio",
  "base-multiplier-addition": "multiplier",
  "base-multiplier-increase": "ratio",
  "settlement-multiplier-addition": "multiplier",
  "anomaly-duration-addition": "seconds",
  "luminize-multiplier-increase": "ratio",
  "luminize-special-addition": "ratio",
  "luminize-special-increase": "ratio",
  "luminize-proficiency-input": "anomaly-proficiency-points",
}
export const FACTOR_CHANNELS = Object.keys(
  FACTOR_CHANNEL_UNITS,
) as FactorChannel[]

export const STAT_UNIT_MAP: Readonly<Record<Stat, StatUnitMap[Stat]>> = {
  attack: "attack-points",
  health: "health-points",
  defense: "defense-points",
  impact: "impact-points",
  sheerForce: "sheer-force-points",
  anomalyProficiency: "anomaly-proficiency-points",
  anomalyMastery: "anomaly-mastery-points",
  energyRegen: "energy-per-second",
  adrenalineRegen: "adrenaline-per-second",
  criticalRate: "ratio",
  criticalDamage: "ratio",
  penetrationRatio: "ratio",
}

export const DIRECT_STATS: ReadonlySet<DirectStat> = new Set([
  "criticalRate",
  "criticalDamage",
  "penetrationRatio",
])

export const GENERAL_STATS: ReadonlySet<GeneralStat> = new Set(
  (Object.keys(STAT_UNIT_MAP) as Stat[]).filter(
    (stat): stat is GeneralStat => !DIRECT_STATS.has(stat as DirectStat),
  ),
)

/** 正式属性枚举；查询属性与快照属性都必须取其中的值。 */
export const STATS: ReadonlySet<Stat> = new Set([
  ...GENERAL_STATS,
  ...DIRECT_STATS,
])

export const UNITS: ReadonlySet<Unit> = new Set([
  ...new Set(Object.values(STAT_UNIT_MAP) as Unit[]),
  "multiplier",
  "energy-points",
  "seconds",
  "meters",
  "count",
])

export const SOURCE_KINDS: ReadonlySet<SourceKind> = new Set([
  "agent",
  "drive-disc",
  "w-engine",
  "bangboo",
  "monster",
  "environment",
])

/** 各来源种类的配置字段；空数组表示该来源没有培养配置。 */
export const SOURCE_CONFIGURATION_FIELDS: Readonly<
  Record<
    SourceKind,
    readonly ("mindscapeRank" | "coreSkillLevel" | "refinement" | "setPieces")[]
  >
> = {
  "agent": ["mindscapeRank", "coreSkillLevel"],
  "drive-disc": ["setPieces"],
  "w-engine": ["refinement"],
  "bangboo": [],
  "monster": [],
  "environment": [],
}

export type RankField = "coreSkillLevel" | "mindscapeRank" | "refinement"

export const RANK_TIERS: Readonly<
  Record<RankField, readonly (number | string)[]>
> = {
  mindscapeRank: [0, 1, 2, 3, 4, 5, 6],
  coreSkillLevel: [1, 2, 3, 4, 5, 6, 7],
  refinement: [1, 2, 3, 4, 5],
}

export type ConfigurationNumberField =
  | "mindscapeRank"
  | "coreSkillLevel"
  | "refinement"
  | "setPieces"

/** 配置字段可由哪些来源种类提供；读取未列出的字段即定义与来源不相容。 */
export const CONFIGURATION_FIELD_SOURCES: Readonly<
  Record<ConfigurationNumberField, readonly SourceKind[]>
> = {
  mindscapeRank: ["agent"],
  coreSkillLevel: ["agent"],
  refinement: ["w-engine"],
  setPieces: ["drive-disc"],
}

export const PHASES: ReadonlySet<Phase> = new Set([
  "configuration",
  "trigger",
  "contribution",
])

export interface IdentityPrefix {
  readonly prefix: string
}

const IDENTITY_PREFIXES: ReadonlySet<string> = new Set([
  "entity",
  "team",
  "binding",
  "instance",
  "layer",
  "snapshot",
  "event",
  "action-instance",
  "hit",
  "request",
  "session",
  "state",
  "state-activation",
  "action",
])

const EFFECT_ID_PREFIXES: ReadonlySet<string> = new Set([
  "agent",
  "disc",
  "w-engine",
  "bangboo",
  "monster",
  "environment",
])

/** 校验 `prefix:value` 形式的身份；后缀必须非空。 */
export function isIdentityString(value: unknown, prefix: string): boolean {
  if (typeof value !== "string" || !value.startsWith(`${prefix}:`)) {
    return false
  }
  return value.length > prefix.length + 1
}

export function isEntityId(value: unknown): value is EntityId {
  return isIdentityString(value, "entity")
}

export function isTeamId(value: unknown): boolean {
  return isIdentityString(value, "team")
}

export function isPrefixedIdentity(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }
  const separator = value.indexOf(":")
  if (separator <= 0) {
    return false
  }
  return (
    IDENTITY_PREFIXES.has(value.slice(0, separator)) &&
    value.length > separator + 1
  )
}

export function isEffectId(value: unknown): value is EffectId {
  if (typeof value !== "string") {
    return false
  }
  const separator = value.indexOf(":")
  if (separator <= 0) {
    return false
  }
  return (
    EFFECT_ID_PREFIXES.has(value.slice(0, separator)) &&
    value.length > separator + 1
  )
}

export function isMindscapeRank(value: unknown): value is MindscapeRank {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  )
}

export function isCoreSkillLevel(value: unknown): value is CoreSkillLevel {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  )
}

export function isRefinementRank(value: unknown): value is RefinementRank {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  )
}

export function isSetPieceCount(value: unknown): value is SetPieceCount {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  )
}

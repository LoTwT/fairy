// Damage calculation types — based on https://ngabbs.com/read.php?tid=44468012

export type AnomalyType =
  | "fire"
  | "electric"
  | "ether"
  | "ice"
  | "physical"
  | "auricInk"
  | "frost"

export type AttackerLevel = number

// ---------- Per-multiplier parameter types ----------

export interface DefenseParams {
  /** Attacker level base (lookup attackerLevelBase table) */
  attackerLevelBase: number
  /**
   * Defender effective base defense — should already include initial attribute
   * bonuses (初始属性加成). Only the defense bonus/reduction/penetration layer
   * is applied here.
   */
  defenderBaseDefense: number
  /** Defense bonus % as decimal (e.g. 0.8 = 80%) */
  defenseBonus: number
  /** Defense reduction % as decimal (无视防御 + 减防, additive) */
  defenseReduction: number
  /** Penetration rate as decimal (穿透率, e.g. 0.24 = 24%) */
  penetrationRate: number
  /** Penetration value (穿透值, flat reduction after rate) */
  penetrationValue: number
}

export interface ResistanceParams {
  /** Defender attribute resistance (e.g. -0.2 = weakness, 0.2 = resistant) */
  defenderResistance: number
  /** Attacker resistance reduction (added to offset resistance) */
  resistanceReduction: number
  /** Attacker ignore resistance */
  ignoreResistance: number
}

export interface VulnerabilityParams {
  /** Vulnerability bonus — "受到的伤害提升" as decimal */
  vulnerabilityBonus: number
  /** Damage reduction — "受到的伤害降低" as decimal */
  damageReduction: number
}

export interface DazeVulnerabilityParams {
  /** Whether target is currently stunned (失衡状态) */
  isStunned: boolean
  /** Stun vulnerability multiplier as decimal (e.g. 0.5 = 50%) */
  stunVulnerability: number
  /** Non-stun vulnerability multiplier as decimal (default 0) */
  nonStunVulnerability: number
}

export interface CritParams {
  /** Crit rate as decimal (e.g. 0.05 = 5%) */
  critRate: number
  /** Crit damage as decimal (e.g. 0.5 = 50%) */
  critDamage: number
}

// ---------- Full damage type parameter interfaces ----------

export interface NormalDamageParams {
  /** Pre-computed base damage (攻击力 × 伤害倍率) */
  baseDamage: number
  /** Sum of all bonus damage (增伤区 Σ, as decimal) */
  bonusDamageSum: number
  crit: CritParams
  defense: DefenseParams
  resistance: ResistanceParams
  vulnerability: VulnerabilityParams
  dazeVulnerability: DazeVulnerabilityParams
  /** Special multiplier (distance falloff etc.), defaults to 1 */
  specialMultiplier?: number
}

export interface SheerDamageParams {
  /** Pre-computed base damage (贯穿力 × 伤害倍率) */
  baseDamage: number
  /** Sum of all bonus damage (增伤区 Σ, as decimal) */
  bonusDamageSum: number
  crit: CritParams
  /** Sum of sheer damage bonus (贯穿增伤 Σ, as decimal) */
  sheerBonusSum: number
  resistance: ResistanceParams
  vulnerability: VulnerabilityParams
  dazeVulnerability: DazeVulnerabilityParams
  /** Special multiplier, defaults to 1 */
  specialMultiplier?: number
}

export interface AnomalyDamageParams {
  // Virtual agent attributes
  /** Virtual agent level (floor of weighted average) */
  virtualAgentLevel: number
  /** Virtual agent final attack */
  virtualAgentAttack: number
  /** Virtual agent anomaly proficiency (异常精通, will be floored internally) */
  virtualAgentAnomalyProficiency: number
  /** Anomaly damage multiplier as decimal (e.g. 5.0 = 500%) */
  damageMultiplier: number
  /** Sum of bonus damage from virtual agent snapshot */
  bonusDamageSum: number
  // Enemy multipliers (resolved at calc time)
  defense: DefenseParams
  resistance: ResistanceParams
  vulnerability: VulnerabilityParams
  dazeVulnerability: DazeVulnerabilityParams
  // Anomaly-specific
  /**
   * Sum of anomaly bonus damage (异常增伤区 Σ, as decimal).
   * For disorder damage, single-attribute anomaly bonuses do not apply by
   * default — pass 0 unless applying universal anomaly bonus only.
   */
  anomalyBonusDamageSum: number
  /** Anomaly crit rate as decimal */
  anomalyCritRate: number
  /** Anomaly crit damage as decimal */
  anomalyCritDamage: number
}

export interface DisorderDamageParams extends Omit<
  AnomalyDamageParams,
  "damageMultiplier"
> {
  /** Optional extra multiplier factor applied on top of disorder base multiplier */
  damageMultiplierFactor?: number
  /** Anomaly type of the original status being consumed */
  anomalyType: AnomalyType
  /** Remaining duration of the original anomaly status in seconds (must be ≥ 0) */
  remainingTime: number
}

// ---------- Return type ----------

export interface DamageBreakdown {
  baseDamage: number
  bonusMultiplier: number
  critMultiplier: number
  defenseMultiplier: number
  resistanceMultiplier: number
  vulnerabilityMultiplier: number
  dazeVulnerabilityMultiplier: number
  sheerBonusMultiplier: number
  anomalyProficiencyMultiplier: number
  damageLevelMultiplier: number
  anomalyBonusMultiplier: number
  anomalyCritMultiplier: number
  specialMultiplier: number
}

export interface DamageResult {
  /** Final damage value (unrounded) */
  total: number
  /** Per-multiplier breakdown for debugging / display */
  breakdown: DamageBreakdown
}

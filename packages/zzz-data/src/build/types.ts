import type {
  DamageResult,
  NormalDamageParams,
  SheerDamageParams,
} from "../calculator/types.js"
import type { AgentAttribute, AgentAttributeLabel } from "../terms.js"

export type StaticBuildMode = "baseline" | "full-buff" | "manual"
export type StaticBuildBaseMode = Exclude<StaticBuildMode, "manual">
export type StaticBuildDamageType = "normal" | "sheer"

export type StaticBuildSkillTag =
  | "basic"
  | "dash"
  | "special"
  | "enhancedSpecial"
  | "chain"
  | "ultimate"
  | "assist"

export type StaticBuildBucket =
  | "attackPercent"
  | "flatAttack"
  | "bonusDamageSum"
  | "critRate"
  | "critDamage"
  | "penetrationRate"
  | "penetrationValue"
  | "resistanceReduction"
  | "ignoreResistance"
  | "vulnerabilityBonus"
  | "damageReduction"
  | "stunVulnerability"
  | "nonStunVulnerability"
  | "sheerBonusSum"
  | "skillMultiplierFactor"

export interface StaticBuildDriveDiscSetInput {
  id: string
  pieces: 2 | 4
}

export interface StaticBuildLoadoutInput {
  agentId: string
  wEngineId?: string
  driveDiscSets?: StaticBuildDriveDiscSetInput[]
  coreSkillLevel?: number
  wEngineRefinement?: number
}

export interface StaticBuildFinalPanelInput {
  attack: number
  baseAttack?: number
  critRate: number
  critDamage: number
  hp?: number
  sheerForce?: number
  penetrationRate?: number
  penetrationValue?: number
}

export interface StaticBuildEnemyInput {
  attackerLevel?: number
  defenderBaseDefense: number
  defenderResistance: number
  defenseBonus?: number
  defenseReduction?: number
  resistanceReduction?: number
  ignoreResistance?: number
  vulnerabilityBonus?: number
  damageReduction?: number
  isStunned?: boolean
  stunVulnerability?: number
  nonStunVulnerability?: number
  specialMultiplier?: number
}

export interface StaticBuildScenarioInput {
  damageType: StaticBuildDamageType
  skillTag: StaticBuildSkillTag
  skillMultiplier: number | string
  attribute?: AgentAttributeLabel
  extraAbilityActive?: boolean
  combatTags?: string[]
  enemy: StaticBuildEnemyInput
}

export interface StaticBuildEffectOverride {
  effectId: string
  enabled?: boolean
  stacks?: number
}

export interface ResolveStaticBuildInput {
  mode?: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildLoadoutInput
  panel: StaticBuildFinalPanelInput
  scenario: StaticBuildScenarioInput
  effectOverrides?: StaticBuildEffectOverride[]
}

export interface StaticBuildSkillMatrixContextInput {
  attribute?: AgentAttributeLabel
  extraAbilityActive?: boolean
  combatTags?: string[]
  enemy: StaticBuildEnemyInput
}

export interface ResolveStaticBuildSkillMatrixInput {
  mode?: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildLoadoutInput
  panel: StaticBuildFinalPanelInput
  context: StaticBuildSkillMatrixContextInput
  effectOverrides?: StaticBuildEffectOverride[]
}

export interface StaticBuildCatalogEntry {
  id: string
  name: string
  aliases: string[]
}

export interface StaticBuildAgentCatalogEntry extends StaticBuildCatalogEntry {
  defaultAttribute: AgentAttribute
  defaultDamageType: StaticBuildDamageType
  profileId: StaticBuildProfileId
}

export type StaticBuildProfileId = "standard-normal" | "yixuan-sheer"

export interface StaticBuildEffectCondition {
  damageTypes?: StaticBuildDamageType[]
  skillTags?: StaticBuildSkillTag[]
  attributes?: AgentAttribute[]
  requireExtraAbility?: boolean
  requireStunned?: boolean
  combatTags?: string[]
  minimumResolvedCritRate?: number
}

export interface StaticBuildValueContext {
  coreSkillLevel: number
  wEngineRefinement: number
}

export interface StaticBuildModifierDefinition {
  bucket: StaticBuildBucket
  combine?: "sum" | "multiply"
  value: (context: StaticBuildValueContext) => number
}

export interface StaticBuildEffectDefinition {
  id: string
  sourceType: "agent" | "w-engine" | "drive-disc"
  sourceId: string
  sourceName: string
  label: string
  alreadyInPanel?: boolean
  maxStacks?: number
  baselineEnabled?: boolean
  fullBuffEnabled?: boolean
  baselineStacks?: number
  fullBuffStacks?: number
  condition?: StaticBuildEffectCondition
  modifiers: StaticBuildModifierDefinition[]
}

export interface StaticBuildResolvedBuckets {
  attackPercent: number
  flatAttack: number
  bonusDamageSum: number
  critRate: number
  critDamage: number
  penetrationRate: number
  penetrationValue: number
  resistanceReduction: number
  ignoreResistance: number
  vulnerabilityBonus: number
  damageReduction: number
  stunVulnerability: number
  nonStunVulnerability: number
  sheerBonusSum: number
  skillMultiplierFactor: number
}

export interface StaticBuildResolvedPanel {
  attack: number
  baseAttack?: number
  critRate: number
  critDamage: number
  hp?: number
  sheerForce?: number
  penetrationRate: number
  penetrationValue: number
  baseDamageStat: "attack" | "sheerForce"
  baseDamageValue: number
}

export interface StaticBuildTraceModifier {
  bucket: StaticBuildBucket
  value: number
  combine: "sum" | "multiply"
}

export interface StaticBuildTraceItem {
  effectId: string
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceName: string
  label: string
  status: "applied" | "skipped" | "unsupported"
  reason?: string
  stacks?: number
  modifiers?: StaticBuildTraceModifier[]
}

export interface StaticBuildProfileResult {
  id: StaticBuildProfileId
  name: string
}

export interface StaticBuildResolvedLoadout {
  agent: StaticBuildAgentCatalogEntry
  wEngine?: StaticBuildCatalogEntry
  driveDiscSets: Array<
    StaticBuildCatalogEntry & {
      pieces: 2 | 4
    }
  >
  coreSkillLevel: number
  wEngineRefinement: number
}

export interface ResolveStaticBuildResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  resolvedPanel: StaticBuildResolvedPanel
  resolvedBuckets: StaticBuildResolvedBuckets
  damageParams: NormalDamageParams | SheerDamageParams
  damage: {
    expected: DamageResult
    crit: DamageResult
    noCrit: DamageResult
  }
  trace: StaticBuildTraceItem[]
  assumptions: string[]
  unsupportedEffects: string[]
}

export interface StaticBuildSkillMatrixRow {
  id: string
  group: string
  label: string
  skillTag: StaticBuildSkillTag
  damageType: StaticBuildDamageType
  attribute: AgentAttribute
  combatTags: string[]
  skillMultiplier: string
  build: ResolveStaticBuildResult
}

export interface ResolveStaticBuildSkillMatrixResult {
  profile: StaticBuildProfileResult
  mode: StaticBuildMode
  manualBaseMode?: StaticBuildBaseMode
  loadout: StaticBuildResolvedLoadout
  rows: StaticBuildSkillMatrixRow[]
  assumptions: string[]
}

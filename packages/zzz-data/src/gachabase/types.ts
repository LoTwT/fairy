import type {
  AgentAttributeLabel,
  AgentSpecialtyLabel,
  AttackTypeLabel,
} from "../terms.js"
import type { RichTextString } from "../text.js"

// ─── Shared ───────────────────────────────────────────────────────────────────

export type GachabaseId = string
export type GachabaseSlug = string
export type GachabaseName = string
export type GachabaseUrl = string
export type GachabaseIcon = string
export type GachabaseRarity = number
export type GachabaseStatId = string
export type GachabaseStatValue = number
export type GachabaseStatName = string
export type GachabaseGrowthPerLevel = number | null
export type GachabaseLevel = number
export type GachabasePromotion = number
export type GachabaseMaxLevel = number
export type GachabaseMinLevel = number
export type GachabaseGender = string
export type GachabaseHeight = string
export type GachabaseBirthday = string
export type GachabaseAssetPath = string
export type GachabaseStringValueList = string[]
export type GachabaseEffectLevel = number
export type GachabaseDescriptionText = string
export type AgentAttributeLabelList = AgentAttributeLabel[]
export type AgentAttackTypeLabelList = AttackTypeLabel[]

export interface StatBoost {
  statId: GachabaseStatId
  value: GachabaseStatValue
}

export interface SplashArt {
  url: GachabaseUrl
  width: number
  height: number
}

// ─── agents.json ──────────────────────────────────────────────────────────────

export interface AgentListItem {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
  rarity: GachabaseRarity
  /** Localized display label. Normalize with `toAgentSpecialty()` for logic. */
  specialty: AgentSpecialtyLabel
  /** Localized display labels. Normalize with `toAgentAttribute()` for logic. */
  attributes: AgentAttributeLabelList
  /** Localized display labels. Normalize with `toAttackType()` for logic. */
  attackTypes: AgentAttackTypeLabelList
  url: GachabaseUrl
}

// ─── agent-details.json ───────────────────────────────────────────────────────

export interface AgentStat {
  id: GachabaseStatId
  name: GachabaseStatName
  value: GachabaseStatValue
  growthPerLevel: GachabaseGrowthPerLevel
}

export interface AgentPromotion {
  promotion: GachabasePromotion
  maxLevel: GachabaseMaxLevel
  statBoosts: StatBoost[]
}

export interface AgentSkillDescription {
  id: GachabaseId
  name: GachabaseName
  /** Source-compatible rich text string with inline HTML-like markup. */
  description: RichTextString
}

export interface AgentSkillStat {
  id: GachabaseId
  name: GachabaseName
  values: GachabaseStringValueList
}

export interface AgentSkillGroup {
  typeId: GachabaseId
  typeName: GachabaseName
  descriptions: AgentSkillDescription[]
  stats: AgentSkillStat[]
}

export interface CoreSkillLevel {
  typeName: GachabaseName
  level: GachabaseLevel
  skills: AgentSkillDescription[]
  statBoosts: StatBoost[]
}

export interface AgentSkinAssets {
  menuIcon: GachabaseAssetPath
  tabIcon: GachabaseAssetPath
  circleIcon: GachabaseAssetPath
  splashArt: SplashArt
}

export interface AgentSkin {
  id: GachabaseId
  name: GachabaseName
  assets: AgentSkinAssets
}

export interface AgentMindscape {
  level: GachabaseLevel
  name: GachabaseName
  /** Source-compatible rich text string with inline HTML-like markup. */
  description: RichTextString
}

export interface AgentPotentialVision {
  id: GachabaseId
  name: GachabaseName
  abilityName: GachabaseName
  /** Source-compatible rich text string with inline HTML-like markup. */
  abilityDesc: RichTextString
}

export interface AgentFactionRef {
  id: GachabaseId
  name: GachabaseName
  icon: GachabaseIcon
}

export interface AgentExclusiveWeaponRef {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
}

export interface AgentDetailsAssets {
  mindscapeImages: SplashArt[]
}

export interface AgentProfile {
  gender: GachabaseGender
  height: GachabaseHeight
  birthday: GachabaseBirthday
}

export interface AgentDetails {
  id: GachabaseId
  fullName: GachabaseName
  faction: AgentFactionRef | null
  /**
   * Raw source-compatible field name from gachabase.
   * In ZZZ terminology this means the agent's signature W-Engine.
   */
  exclusiveWeapon: AgentExclusiveWeaponRef | null
  assets: AgentDetailsAssets
  profile: AgentProfile
  skins: AgentSkin[]
  stats: AgentStat[]
  promotions: AgentPromotion[]
  skills: AgentSkillGroup[]
  coreSkills: CoreSkillLevel[]
  potentialVisions: AgentPotentialVision[]
  mindscapes: AgentMindscape[]
}

// ─── w-engines.json ───────────────────────────────────────────────────────────

export interface WEngineEffect {
  level: GachabaseEffectLevel
  name: GachabaseName
  /** Source-compatible rich text string with inline HTML-like markup. */
  effect: RichTextString
}

export interface WEngineSpecialtyRef {
  id: GachabaseId
  name: AgentSpecialtyLabel
}

export interface WEngineStatValue {
  id: GachabaseStatId
  name: GachabaseStatName
  value: GachabaseStatValue
}

export interface WEngineListItem {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
  icon: GachabaseIcon
  rarity: GachabaseRarity
  /** `specialty.name` is localized; normalize with `toAgentSpecialty()` */
  specialty: WEngineSpecialtyRef
  exclusiveAgentName: GachabaseName | null
  baseStat: WEngineStatValue
  advancedStat: WEngineStatValue
  effects: WEngineEffect[]
}

// ─── w-engine-details.json ────────────────────────────────────────────────────

export interface WEngineLevel {
  level: GachabaseLevel
  baseStatGrowth: GachabaseStatValue
}

export interface WEngineStar {
  star: GachabaseLevel
  minLevel: GachabaseMinLevel
  maxLevel: GachabaseMaxLevel
  baseStatGrowth: GachabaseStatValue
  advancedStatGrowth: GachabaseStatValue
}

export interface WEngineExclusiveAgentRef {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
}

export interface WEngineDetailsAssets {
  splashArt: SplashArt
}

export interface WEngineDetails {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
  exclusiveAgent: WEngineExclusiveAgentRef | null
  assets: WEngineDetailsAssets
  levels: WEngineLevel[]
  stars: WEngineStar[]
}

// ─── bangboo.json ─────────────────────────────────────────────────────────────

export interface BangbooStat {
  id: GachabaseStatId
  name: GachabaseStatName
  value: GachabaseStatValue
  growthPerLevel: GachabaseStatValue
}

export interface BangbooOptimization {
  level: GachabaseLevel
  maxLevel: GachabaseMaxLevel
  statBoosts: StatBoost[]
  statAdditions: StatBoost[]
}

export interface BangbooSkillStat {
  title: GachabaseName
  values: GachabaseStringValueList
}

export interface BangbooSkill {
  typeId: GachabaseId
  name: GachabaseName
  /** Source-compatible rich text string with inline HTML-like markup. */
  description: RichTextString
  stats: BangbooSkillStat[]
}

export interface BangbooAssets {
  circleIcon: GachabaseAssetPath
  splashArt: SplashArt
}

export interface BangbooItem {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
  rarity: GachabaseRarity
  description: GachabaseDescriptionText
  assets: BangbooAssets
  baseStats: BangbooStat[]
  optimizations: BangbooOptimization[]
  skills: BangbooSkill[]
}

// ─── drive-discs.json ─────────────────────────────────────────────────────────

export interface DriveDiscSetEffect {
  pieces: GachabaseLevel
  /** Source-compatible rich text string with inline HTML-like markup. */
  bonus: RichTextString
}

export interface DriveDiscItem {
  id: GachabaseId
  slug: GachabaseSlug
  name: GachabaseName
  icon: GachabaseIcon
  tag: GachabaseName
  setEffects: DriveDiscSetEffect[]
}

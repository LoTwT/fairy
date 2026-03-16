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
export type GachabaseGender = string
export type GachabaseHeight = string
export type GachabaseBirthday = string
export type GachabaseAssetPath = string
export type GachabaseStringValueList = string[]

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
  attributes: AgentAttributeLabel[]
  /** Localized display labels. Normalize with `toAttackType()` for logic. */
  attackTypes: AttackTypeLabel[]
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

export interface AgentSkin {
  id: GachabaseId
  name: GachabaseName
  assets: {
    menuIcon: GachabaseAssetPath
    tabIcon: GachabaseAssetPath
    circleIcon: GachabaseAssetPath
    splashArt: SplashArt
  }
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
  level: number
  name: string
  /** Source-compatible rich text string with inline HTML-like markup. */
  effect: RichTextString
}

export interface WEngineListItem {
  id: string
  slug: string
  name: string
  icon: string
  rarity: number
  /** `specialty.name` is localized; normalize with `toAgentSpecialty()` */
  specialty: { id: string; name: AgentSpecialtyLabel }
  exclusiveAgentName: string | null
  baseStat: { id: string; name: string; value: number }
  advancedStat: { id: string; name: string; value: number }
  effects: WEngineEffect[]
}

// ─── w-engine-details.json ────────────────────────────────────────────────────

export interface WEngineLevel {
  level: number
  baseStatGrowth: number
}

export interface WEngineStar {
  star: number
  minLevel: number
  maxLevel: number
  baseStatGrowth: number
  advancedStatGrowth: number
}

export interface WEngineDetails {
  id: string
  slug: string
  name: string
  exclusiveAgent: { id: string; slug: string; name: string } | null
  assets: { splashArt: SplashArt }
  levels: WEngineLevel[]
  stars: WEngineStar[]
}

// ─── bangboo.json ─────────────────────────────────────────────────────────────

export interface BangbooStat {
  id: string
  name: string
  value: number
  growthPerLevel: number
}

export interface BangbooOptimization {
  level: number
  maxLevel: number
  statBoosts: StatBoost[]
  statAdditions: StatBoost[]
}

export interface BangbooSkillStat {
  title: string
  values: string[]
}

export interface BangbooSkill {
  typeId: string
  name: string
  /** Source-compatible rich text string with inline HTML-like markup. */
  description: RichTextString
  stats: BangbooSkillStat[]
}

export interface BangbooItem {
  id: string
  slug: string
  name: string
  rarity: number
  description: string
  assets: {
    circleIcon: string
    splashArt: SplashArt
  }
  baseStats: BangbooStat[]
  optimizations: BangbooOptimization[]
  skills: BangbooSkill[]
}

// ─── drive-discs.json ─────────────────────────────────────────────────────────

export interface DriveDiscSetEffect {
  pieces: number
  /** Source-compatible rich text string with inline HTML-like markup. */
  bonus: RichTextString
}

export interface DriveDiscItem {
  id: string
  slug: string
  name: string
  icon: string
  tag: string
  setEffects: DriveDiscSetEffect[]
}

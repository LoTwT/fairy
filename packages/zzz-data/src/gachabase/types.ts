// ─── Shared ───────────────────────────────────────────────────────────────────

export interface StatBoost {
  statId: string
  value: number
}

export interface SplashArt {
  url: string
  width: number
  height: number
}

// ─── agents.json ──────────────────────────────────────────────────────────────

export interface AgentListItem {
  id: string
  slug: string
  name: string
  rarity: number
  specialty: string
  attributes: string[]
  attackTypes: string[]
  url: string
}

// ─── agent-details.json ───────────────────────────────────────────────────────

export interface AgentStat {
  id: string
  name: string
  value: number
  growthPerLevel: number | null
}

export interface AgentPromotion {
  promotion: number
  maxLevel: number
  statBoosts: StatBoost[]
}

export interface AgentSkillDescription {
  id: string
  name: string
  description: string
}

export interface AgentSkillStat {
  id: string
  name: string
  values: string[]
}

export interface AgentSkillGroup {
  typeId: string
  typeName: string
  descriptions: AgentSkillDescription[]
  stats: AgentSkillStat[]
}

export interface CoreSkillLevel {
  typeName: string
  level: number
  skills: AgentSkillDescription[]
  statBoosts: StatBoost[]
}

export interface AgentSkin {
  id: string
  name: string
  assets: {
    menuIcon: string
    tabIcon: string
    circleIcon: string
    splashArt: SplashArt
  }
}

export interface AgentMindscape {
  level: number
  name: string
  description: string
}

export interface AgentPotentialVision {
  id: string
  name: string
  abilityName: string
  abilityDesc: string
}

export interface AgentDetails {
  id: string
  fullName: string
  faction: { id: string; name: string; icon: string } | null
  exclusiveWeapon: { id: string; slug: string; name: string } | null
  assets: {
    mindscapeImages: SplashArt[]
  }
  profile: {
    gender: string
    height: string
    birthday: string
  }
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
  effect: string
}

export interface WEngineListItem {
  id: string
  slug: string
  name: string
  icon: string
  rarity: number
  specialty: { id: string; name: string }
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
  description: string
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
  bonus: string
}

export interface DriveDiscItem {
  id: string
  slug: string
  name: string
  icon: string
  tag: string
  setEffects: DriveDiscSetEffect[]
}

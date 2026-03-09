// Published game-mode types — describe data/en/*.json and data/zh-CN/*.json
// (buffs, deadly-assault, shiyu-defense, threshold-simulation)
//
// Optional fields (name, iconUrl, weaknesses, resistances, mechanics) are
// present only in zh-CN locale.

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Elemental damage multipliers [ice, fire, electric, ether, physical] */
export type ElementMult = [number, number, number, number, number]

export interface EnemyBase {
  id: string
  name: string
  image: string
  elementMult: ElementMult
  stunMult: number
  stunTime: number
  hp: number
  def: number
  daze: number
}

// ─── buffs.json ───────────────────────────────────────────────────────────────

export interface BuffItem {
  /** zh-CN only */
  name?: string
  /** zh-CN only */
  iconUrl?: string
  effect: string
}

/** `buffs.json` top-level shape — key is camelCase buff name */
export type BuffsJson = Record<string, BuffItem>

// ─── deadly-assault.json ──────────────────────────────────────────────────────

export interface DABuff {
  key: string
  /** zh-CN only */
  name?: string
  /** zh-CN only */
  iconUrl?: string
  effect: string
}

export interface DAEnemyItem extends EnemyBase {
  type: number
  mult: number
  altHp: number
  /** zh-CN only */
  weaknesses?: string[]
  /** zh-CN only */
  resistances?: string[]
  /** zh-CN only */
  mechanics?: string
}

export interface DAVersionItem {
  versionKey: string
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  buffs: DABuff[]
  versionEnemies: DAEnemyItem[]
}

/** `deadly-assault.json` top-level shape */
export type DeadlyAssaultJson = DAVersionItem[]

// ─── shiyu-defense.json ───────────────────────────────────────────────────────

export interface SDEnemyItem extends EnemyBase {
  type: number
  count: number
}

export interface SDSideItem {
  sideElementMult: ElementMult
  sideHPMult: number
  nodeLvl: number
  hp60k: number
  altHp: number
  waves: Array<{ enemies: SDEnemyItem[] }>
}

export interface SDNodeItem {
  buffName?: string | string[]
  buffDesc?: string | string[]
  sides: (SDSideItem | null)[]
}

export interface SDVersionItem {
  versionKey: string
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  nodes: SDNodeItem[]
}

export interface SDModeItem {
  name: string
  versions: SDVersionItem[]
}

/** `shiyu-defense.json` top-level shape */
export type ShiyuDefenseJson = SDModeItem[]

// ─── threshold-simulation.json ────────────────────────────────────────────────

export interface TSBossEnemyItem extends EnemyBase {
  type: number
  mult: number
  altHp: number
  /** zh-CN only */
  weaknesses?: string[]
  /** zh-CN only */
  resistances?: string[]
  /** zh-CN only */
  mechanics?: string
}

export interface TSRegularEnemyItem extends EnemyBase {
  type: number
  count: number
}

export interface TSBossSideItem {
  nodeLvl: number
  hp60k: number
  altHp: number
  waves: Array<{ enemies: TSBossEnemyItem[] }>
}

export interface TSRegularSideItem {
  sideElementMult?: ElementMult
  sideHPMult: number
  nodeLvl: number
  hp60k: number
  altHp: number
  waves: Array<{ enemies: TSRegularEnemyItem[] }>
}

export interface TSNodeItem {
  buffNames: string[]
  /** sides[0] = boss side; sides[1..n] = regular enemy sides */
  sides: (TSBossSideItem | TSRegularSideItem | null)[]
}

export interface TSVersionItem {
  versionKey: string
  versionName: string
  versionTime: string
  versionBossDazeMult: number
  versionEnemyDazeMult: number
  versionBossAnomMult: number
  versionEnemyAnomMult: number
  nodes: TSNodeItem[]
}

export interface TSModeItem {
  name: string
  versions: TSVersionItem[]
}

/** `threshold-simulation.json` top-level shape */
export type ThresholdSimulationJson = TSModeItem[]

// Published game-mode types — describe data/en/*.json and data/zh-CN/*.json
// (buffs, deadly-assault, shiyu-defense, threshold-simulation)
//
// Optional fields (name, iconUrl, weaknesses, resistances, mechanics) are
// present only in zh-CN locale.
//
// These interfaces intentionally preserve raw published field names for
// source/data compatibility. Use helpers from `src/terms.ts` to interpret
// `elementMult` and related attribute buckets instead of hard-coding indexes.

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Raw multiplier buckets in `ELEMENT_MULT_ORDER`: [ice, fire, electric, ether, physical] */
export type ElementMult = [number, number, number, number, number]

/**
 * Currently observed raw upstream enemy category codes.
 *
 * These values are preserved as-is for source compatibility. Their exact
 * gameplay semantics are not yet documented upstream, so consumers should
 * treat them as raw category codes rather than stable business names.
 */
export const enemyCategoryCodes = [0, 1] as const

export type EnemyCategoryCode = (typeof enemyCategoryCodes)[number]

export type EnemyCategoryCodeInput = number

export function isEnemyCategoryCode(
  value: EnemyCategoryCodeInput,
): value is EnemyCategoryCode {
  return enemyCategoryCodes.includes(value as EnemyCategoryCode)
}

export interface EnemyBase {
  id: string
  name: string
  /** Enemy image asset slug/key from published data, not a full URL. */
  image: string
  /** Raw source-compatible multiplier buckets, not per-locale labels. */
  elementMult: ElementMult
  /** Raw source-compatible field for daze/失衡倍率. */
  stunMult: number
  /** Raw source-compatible field for daze/失衡持续时间. */
  stunTime: number
  hp: number
  /** Enemy base defense, directly usable in damage calculations. */
  def: number
  /** Enemy daze gauge / 失衡值. */
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
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  /** Raw source-compatible HP multiplier bucket from upstream data. */
  mult: number
  /** Raw source-compatible alternative HP value from upstream data. */
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
  /** Display-only time range string from published data, not a stable date format. */
  versionTime: string
  /** Raw daze multiplier applied to this DA season. */
  versionDazeMult: number
  /** Raw anomaly multiplier applied to this DA season. */
  versionAnomMult: number
  buffs: DABuff[]
  versionEnemies: DAEnemyItem[]
}

/** `deadly-assault.json` top-level shape */
export type DeadlyAssaultJson = DAVersionItem[]

// ─── shiyu-defense.json ───────────────────────────────────────────────────────

export interface SDEnemyItem extends EnemyBase {
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  count: number
}

export interface SDSideItem {
  /** Side-wide raw multiplier buckets in the same order as `ElementMult`. */
  sideElementMult: ElementMult
  /** Raw side HP multiplier from published data. */
  sideHPMult: number
  /** Node enemy level in published data. */
  nodeLvl: number
  /** Raw HP normalization field from upstream data. */
  hp60k: number
  /** Raw alternative HP value from upstream data. */
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
  /** Display-only time range string from published data, not a stable date format. */
  versionTime: string
  /** Raw daze multiplier applied to this SD version. */
  versionDazeMult: number
  /** Raw anomaly multiplier applied to this SD version. */
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
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  /** Raw source-compatible HP multiplier bucket from upstream data. */
  mult: number
  /** Raw source-compatible alternative HP value from upstream data. */
  altHp: number
  /** zh-CN only */
  weaknesses?: string[]
  /** zh-CN only */
  resistances?: string[]
  /** zh-CN only */
  mechanics?: string
}

export interface TSRegularEnemyItem extends EnemyBase {
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  /** Raw source-compatible enemy count from upstream data. */
  count: number
}

export interface TSBossSideItem {
  /** Node enemy level in published data. */
  nodeLvl: number
  /** Raw HP normalization field from upstream data. */
  hp60k: number
  /** Raw alternative HP value from upstream data. */
  altHp: number
  waves: Array<{ enemies: TSBossEnemyItem[] }>
}

export interface TSRegularSideItem {
  /** Optional side-wide raw multiplier buckets in the same order as `ElementMult`. */
  sideElementMult?: ElementMult
  /** Raw side HP multiplier from published data. */
  sideHPMult: number
  /** Node enemy level in published data. */
  nodeLvl: number
  /** Raw HP normalization field from upstream data. */
  hp60k: number
  /** Raw alternative HP value from upstream data. */
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
  /** Display-only time range string from published data, not a stable date format. */
  versionTime: string
  /** Raw boss-side daze multiplier applied to this TS version. */
  versionBossDazeMult: number
  /** Raw regular-enemy daze multiplier applied to this TS version. */
  versionEnemyDazeMult: number
  /** Raw boss-side anomaly multiplier applied to this TS version. */
  versionBossAnomMult: number
  /** Raw regular-enemy anomaly multiplier applied to this TS version. */
  versionEnemyAnomMult: number
  nodes: TSNodeItem[]
}

export interface TSModeItem {
  name: string
  versions: TSVersionItem[]
}

/** `threshold-simulation.json` top-level shape */
export type ThresholdSimulationJson = TSModeItem[]

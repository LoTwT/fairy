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

export type GameModeEnemyId = string
export type GameModeEnemyName = string
export type GameModeImageSlug = string
export type GameModeStunMultiplier = number
export type GameModeStunTime = number
export type GameModeEnemyHP = number
export type GameModeEnemyDefense = number
export type GameModeEnemyDaze = number
export type GameModeBuffName = string
export type GameModeBuffKey = string
export type GameModeBuffRecordKey = string
export type GameModeBuffIconUrl = string
export type GameModeBuffEffect = string
export type GameModeBuffEffectList = GameModeBuffEffect[]
export type GameModeAttributeText = string
export type GameModeAttributeTextList = GameModeAttributeText[]
export type GameModeMechanicsText = string
export type GameModeEnemyCount = number
export type GameModeEnemyHPMult = number
export type GameModeBossHPMult = number
export type GameModeNodeLevel = number
export type GameModeHP60k = number
export type GameModeAltHP = number
export type GameModeVersionKey = string
export type GameModeVersionName = string
export type GameModeVersionTime = string
export type GameModeVersionDazeMultiplier = number
export type GameModeVersionAnomalyMultiplier = number
export type GameModeModeName = string
export type GameModeBuffNameList = GameModeBuffName[]

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
  id: GameModeEnemyId
  name: GameModeEnemyName
  /** Enemy image asset slug/key from published data, not a full URL. */
  image: GameModeImageSlug
  /** Raw source-compatible multiplier buckets, not per-locale labels. */
  elementMult: ElementMult
  /** Raw source-compatible field for daze/失衡倍率. */
  stunMult: GameModeStunMultiplier
  /** Raw source-compatible field for daze/失衡持续时间. */
  stunTime: GameModeStunTime
  hp: GameModeEnemyHP
  /** Enemy base defense, directly usable in damage calculations. */
  def: GameModeEnemyDefense
  /** Enemy daze gauge / 失衡值. */
  daze: GameModeEnemyDaze
}

// ─── buffs.json ───────────────────────────────────────────────────────────────

export interface BuffItem {
  /** zh-CN only */
  name?: GameModeBuffName
  /** zh-CN only */
  iconUrl?: GameModeBuffIconUrl
  effect: GameModeBuffEffect
}

export type GameModeBuffRecordValue = BuffItem

/** `buffs.json` top-level shape — key is camelCase buff name */
export type BuffsJson = Record<GameModeBuffRecordKey, GameModeBuffRecordValue>

// ─── deadly-assault.json ──────────────────────────────────────────────────────

export interface DABuff {
  key: GameModeBuffKey
  /** zh-CN only */
  name?: GameModeBuffName
  /** zh-CN only */
  iconUrl?: GameModeBuffIconUrl
  effect: GameModeBuffEffect
}
export type DABuffList = DABuff[]

export interface DAEnemyItem extends EnemyBase {
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  /** Raw source-compatible HP multiplier bucket from upstream data. */
  mult: GameModeBossHPMult
  /** Raw source-compatible alternative HP value from upstream data. */
  altHp: GameModeAltHP
  /** zh-CN only */
  weaknesses?: GameModeAttributeTextList
  /** zh-CN only */
  resistances?: GameModeAttributeTextList
  /** zh-CN only */
  mechanics?: GameModeMechanicsText
}
export type DAEnemyItemList = DAEnemyItem[]

export interface DAVersionItem {
  versionKey: GameModeVersionKey
  versionName: GameModeVersionName
  /** Display-only time range string from published data, not a stable date format. */
  versionTime: GameModeVersionTime
  /** Raw daze multiplier applied to this DA season. */
  versionDazeMult: GameModeVersionDazeMultiplier
  /** Raw anomaly multiplier applied to this DA season. */
  versionAnomMult: GameModeVersionAnomalyMultiplier
  buffs: DABuffList
  versionEnemies: DAEnemyItemList
}
export type DAVersionItemList = DAVersionItem[]

/** `deadly-assault.json` top-level shape */
export type DeadlyAssaultJson = DAVersionItemList

// ─── shiyu-defense.json ───────────────────────────────────────────────────────

export interface SDEnemyItem extends EnemyBase {
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  count: GameModeEnemyCount
}
export type SDEnemyItemList = SDEnemyItem[]

export interface SDWaveItem {
  enemies: SDEnemyItemList
}
export type SDWaveItemList = SDWaveItem[]

export interface SDSideItem {
  /** Side-wide raw multiplier buckets in the same order as `ElementMult`. */
  sideElementMult: ElementMult
  /** Raw side HP multiplier from published data. */
  sideHPMult: GameModeEnemyHPMult
  /** Node enemy level in published data. */
  nodeLvl: GameModeNodeLevel
  /** Raw HP normalization field from upstream data. */
  hp60k: GameModeHP60k
  /** Raw alternative HP value from upstream data. */
  altHp: GameModeAltHP
  waves: SDWaveItemList
}
export type SDSideSlot = SDSideItem | null
export type SDSideSlotList = SDSideSlot[]

export interface SDNodeItem {
  buffName?: GameModeBuffName | GameModeBuffNameList
  buffDesc?: GameModeBuffEffect | GameModeBuffEffectList
  sides: SDSideSlotList
}
export type SDNodeItemList = SDNodeItem[]

export interface SDVersionItem {
  versionKey: GameModeVersionKey
  versionName: GameModeVersionName
  /** Display-only time range string from published data, not a stable date format. */
  versionTime: GameModeVersionTime
  /** Raw daze multiplier applied to this SD version. */
  versionDazeMult: GameModeVersionDazeMultiplier
  /** Raw anomaly multiplier applied to this SD version. */
  versionAnomMult: GameModeVersionAnomalyMultiplier
  nodes: SDNodeItemList
}
export type SDVersionItemList = SDVersionItem[]

export interface SDModeItem {
  name: GameModeModeName
  versions: SDVersionItemList
}
export type SDModeItemList = SDModeItem[]

/** `shiyu-defense.json` top-level shape */
export type ShiyuDefenseJson = SDModeItemList

// ─── threshold-simulation.json ────────────────────────────────────────────────

export interface TSBossEnemyItem extends EnemyBase {
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  /** Raw source-compatible HP multiplier bucket from upstream data. */
  mult: GameModeBossHPMult
  /** Raw source-compatible alternative HP value from upstream data. */
  altHp: GameModeAltHP
  /** zh-CN only */
  weaknesses?: GameModeAttributeTextList
  /** zh-CN only */
  resistances?: GameModeAttributeTextList
  /** zh-CN only */
  mechanics?: GameModeMechanicsText
}
export type TSBossEnemyItemList = TSBossEnemyItem[]

export interface TSRegularEnemyItem extends EnemyBase {
  /** Raw source-compatible enemy category from upstream data. */
  type: EnemyCategoryCode
  /** Raw source-compatible enemy count from upstream data. */
  count: GameModeEnemyCount
}
export type TSRegularEnemyItemList = TSRegularEnemyItem[]

export interface TSBossWaveItem {
  enemies: TSBossEnemyItemList
}
export type TSBossWaveItemList = TSBossWaveItem[]

export interface TSRegularWaveItem {
  enemies: TSRegularEnemyItemList
}
export type TSRegularWaveItemList = TSRegularWaveItem[]

export interface TSBossSideItem {
  /** Node enemy level in published data. */
  nodeLvl: GameModeNodeLevel
  /** Raw HP normalization field from upstream data. */
  hp60k: GameModeHP60k
  /** Raw alternative HP value from upstream data. */
  altHp: GameModeAltHP
  waves: TSBossWaveItemList
}

export interface TSRegularSideItem {
  /** Optional side-wide raw multiplier buckets in the same order as `ElementMult`. */
  sideElementMult?: ElementMult
  /** Raw side HP multiplier from published data. */
  sideHPMult: GameModeEnemyHPMult
  /** Node enemy level in published data. */
  nodeLvl: GameModeNodeLevel
  /** Raw HP normalization field from upstream data. */
  hp60k: GameModeHP60k
  /** Raw alternative HP value from upstream data. */
  altHp: GameModeAltHP
  waves: TSRegularWaveItemList
}
export type TSSideSlot = TSBossSideItem | TSRegularSideItem | null
export type TSSideSlotList = TSSideSlot[]

export interface TSNodeItem {
  buffNames: GameModeBuffNameList
  /** sides[0] = boss side; sides[1..n] = regular enemy sides */
  sides: TSSideSlotList
}
export type TSNodeItemList = TSNodeItem[]

export interface TSVersionItem {
  versionKey: GameModeVersionKey
  versionName: GameModeVersionName
  /** Display-only time range string from published data, not a stable date format. */
  versionTime: GameModeVersionTime
  /** Raw boss-side daze multiplier applied to this TS version. */
  versionBossDazeMult: GameModeVersionDazeMultiplier
  /** Raw regular-enemy daze multiplier applied to this TS version. */
  versionEnemyDazeMult: GameModeVersionDazeMultiplier
  /** Raw boss-side anomaly multiplier applied to this TS version. */
  versionBossAnomMult: GameModeVersionAnomalyMultiplier
  /** Raw regular-enemy anomaly multiplier applied to this TS version. */
  versionEnemyAnomMult: GameModeVersionAnomalyMultiplier
  nodes: TSNodeItemList
}
export type TSVersionItemList = TSVersionItem[]

export interface TSModeItem {
  name: GameModeModeName
  versions: TSVersionItemList
}
export type TSModeItemList = TSModeItem[]

/** `threshold-simulation.json` top-level shape */
export type ThresholdSimulationJson = TSModeItemList

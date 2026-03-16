/**
 * buhflipexplode.org data utilities
 *
 * Pure functions, constants, and TypeScript types for working with raw crawl
 * data from data/crawl/en/buhflipexplode/*.json (sourced from buhflipexplode.org).
 *
 * All formulas are extracted and verified against the site's sd.js / da.js / ts.js
 * source code.
 */

// ─── Node multiplier tables ───────────────────────────────────────────────────
// 70 entries each; index = nodeLvl − 1 (i.e. table[0] corresponds to level 1).
// Extracted from sd.js / ts.js source.

/* eslint-disable antfu/consistent-list-newline */

/**
 * HP multiplier per node level for SD enemies and DA/TS bosses.
 * Formula: `Math.round(baseHP × NODE_HP_MULT[nodeLvl − 1] / 10000)`
 * Source: sd.js `nodeBossHPMult` / ts.js
 */
// prettier-ignore
export const NODE_HP_MULT: readonly number[] = [
  100, 116, 135, 157, 181, 193, 206, 220, 235, 271, 291, 314, 338, 364, 419,
  431, 444, 458, 472, 543, 618, 703, 801, 912, 1049, 1134, 1227, 1328, 1437,
  1653, 1792, 1942, 2106, 2283, 2626, 2865, 3126, 3411, 3722, 4281, 4717, 5197,
  5727, 6311, 7258, 7691, 8151, 8637, 9153, 10527, 11227, 11975, 12772, 13623,
  15667, 15957, 16252, 16553, 16860, 19389, 19716, 20049, 20387, 20731, 21081,
  21437, 21799, 22167, 22541, 24795,
]

/**
 * HP multiplier per node level for TS regular (non-boss) enemies.
 * Formula: `Math.round(baseHP × sideHPMult × NODE_ENEMY_HP_MULT[nodeLvl − 1] / 10000)`
 * Source: ts.js `nodeEnemyHPMult`
 */
// prettier-ignore
export const NODE_ENEMY_HP_MULT: readonly number[] = [
  100, 116, 135, 157, 181, 193, 206, 220, 235, 271, 291, 314, 338, 364, 419,
  431, 444, 458, 472, 543, 618, 703, 801, 912, 1049, 1111, 1176, 1246, 1320,
  1518, 1609, 1706, 1809, 1919, 2207, 2320, 2440, 2566, 2698, 3103, 3404, 3734,
  4097, 4494, 5169, 5591, 6049, 6544, 7079, 8141, 8826, 9569, 10374, 11246,
  12934, 13260, 13595, 13938, 14290, 16434, 16774, 17121, 17475, 17837, 18206,
  18583, 18968, 19361, 19761, 21738,
]

/**
 * DEF multiplier per node level.
 * Capped at level 60 value (1588) for levels 61–70.
 * Formula: `baseDEF × NODE_DEF_MULT[nodeLvl − 1] / 100`
 * Source: sd.js / ts.js `nodeDEFMult`
 */
// prettier-ignore
export const NODE_DEF_MULT: readonly number[] = [
  100, 108, 116, 124, 132, 142, 152, 164, 176, 188, 200, 214, 228, 242, 258,
  274, 290, 306, 324, 344, 362, 382, 402, 422, 444, 466, 490, 512, 536, 562,
  586, 612, 638, 666, 694, 722, 750, 780, 810, 842, 872, 904, 938, 970, 1004,
  1038, 1074, 1110, 1146, 1184, 1220, 1258, 1298, 1338, 1378, 1418, 1460, 1502,
  1544, 1588, 1588, 1588, 1588, 1588, 1588, 1588, 1588, 1588, 1588, 1588,
]

/**
 * Daze multiplier per node level.
 * Formula: `baseDaze × NODE_DAZE_MULT[nodeLvl − 1] / 100`
 * Then multiply by `versionDazeMult / 100` to apply the per-version modifier.
 * Source: sd.js / ts.js `nodeDazeMult`
 */
// prettier-ignore
export const NODE_DAZE_MULT: readonly number[] = [
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  100, 100, 100, 100, 100, 100, 101, 102, 103, 104, 104, 105, 106, 107, 108,
  110, 113, 115, 118, 120, 123, 125, 128, 130, 133, 137, 142, 146, 151, 155,
  160, 164, 169, 173, 178, 180, 183, 186, 189, 192, 195, 197, 200, 203, 206,
  209, 212, 215, 217, 220, 223, 226, 229, 232, 235,
]

/* eslint-enable antfu/consistent-list-newline */

// ─── SD node level constants ──────────────────────────────────────────────────
// Node levels used for each SD group, extracted from sd.js.
// Index corresponds to node index within the version (0-based).

/** Stable Node: node levels per node index */
// prettier-ignore
export const SD_STABLE_NODE_LVLS = [25, 28, 30, 33, 35, 38, 40, 43, 45, 50] as const
/** Disputed Node: node levels per node index */
// prettier-ignore
export const SD_DISPUTED_NODE_LVLS = [40, 43, 45, 48, 50, 53, 55, 60] as const
/** Ambush Node: node levels per node index */
// prettier-ignore
export const SD_AMBUSH_NODE_LVLS = [50, 53, 55, 60, 65] as const
/** Critical Node: node levels per node index (versions before 2.5) */
// prettier-ignore
export const SD_PRE25_CRIT_NODE_LVLS = [50, 53, 55, 58, 60, 65, 70] as const
/** Critical Node: node levels per node index (versions from 2.5 onward) */
// prettier-ignore
export const SD_POST25_CRIT_NODE_LVLS = [50, 55, 60, 65, 70] as const

/**
 * 1-based Critical Node version index at which the post-2.5 layout begins.
 * Versions with index < SD_V25_BOUNDARY use SD_PRE25_CRIT_NODE_LVLS.
 */
export const SD_V25_BOUNDARY = 38

// ─── TS node level constants ──────────────────────────────────────────────────

/** Easy Mode: node levels per node index */
// prettier-ignore
export const TS_EASY_NODE_LVLS = [55, 58, 60, 65] as const
/** Hard Mode: node levels per node index (versions before 2.6) */
// prettier-ignore
export const TS_PRE26_HARD_NODE_LVLS = [60, 63, 65, 70, 70, 70] as const
/** Hard Mode: node levels per node index (versions from 2.6 onward) */
// prettier-ignore
export const TS_POST26_HARD_NODE_LVLS = [60, 65, 70, 70, 70] as const

/**
 * 1-based Hard Mode version index at which the post-2.6 layout begins.
 * Versions with index < TS_V26_BOUNDARY use TS_PRE26_HARD_NODE_LVLS.
 */
export const TS_V26_BOUNDARY = 2

// ─── Shared formula constants ─────────────────────────────────────────────────

/** Boss HP base coefficient used in DA and TS boss HP formulas (from da.js / ts.js) */
export const BOSS_HP_COEFF = 8.74

/** DA bosses are always level 70; equals NODE_HP_MULT[69] */
export const DA_NODE_HP_MULT = NODE_HP_MULT[69] // 24795

/**
 * Fraction of 60k PP total HP that corresponds to the 20k PP threshold.
 * `pp20k = Math.ceil(PP20K_FACTOR × total60k)`
 */
export const PP20K_FACTOR = 0.281083138

// ─── Types ────────────────────────────────────────────────────────────────────

export type BuhflipNodeLevel = number

export type BuhflipEnemyBaseDefense = number

export type BuhflipEnemyBaseDaze = number

export type BuhflipEnemyBaseHP = number

export type BuhflipEnemyBaseDazePair = readonly [
  BuhflipEnemyBaseDaze,
  BuhflipEnemyBaseDaze,
]

export type BuhflipEnemyBaseHPPair = readonly [
  BuhflipEnemyBaseHP,
  BuhflipEnemyBaseHP,
]

export type BuhflipEnemyHPMult = number

export type BuhflipBossHPMult = number

export type BuhflipPP60kTotalHP = number

export type BuhflipEnemyTag = string

export type BuhflipEnemyTagList = readonly BuhflipEnemyTag[]

export type BuhflipEnemyModifier = string

export type BuhflipEnemyModifierList = readonly BuhflipEnemyModifier[]

export type BuhflipBuffText = string

export type BuhflipBuffTextList = BuhflipBuffText[]

export type BuhflipBuffTextValue = BuhflipBuffText | BuhflipBuffTextList

export type BuhflipEnemyId = string

export type BuhflipVersionIndex = number

export type BuhflipVersionRecordKey = string

export type BuhflipEnemyName = string

export type BuhflipEnemyImage = string

export type BuhflipVersionName = string

export type BuhflipVersionTime = string

export type BuhflipVersionsModeName = string

export type BuhflipTextPairValue = string

export type BuhflipTextPair = [BuhflipTextPairValue, BuhflipTextPairValue]

export type BuhflipEnemyMiscText = string

export type BuhflipEnemySpoilerText = string

export type BuhflipElementMultiplier = number

export type BuhflipElementMultiplierTuple = [
  BuhflipElementMultiplier,
  BuhflipElementMultiplier,
  BuhflipElementMultiplier,
  BuhflipElementMultiplier,
  BuhflipElementMultiplier,
]

export type BuhflipEnemyRefType = number

export type BuhflipEnemyCount = number

export type BuhflipEnemyStunMultiplier = number

export type BuhflipEnemyStunTime = number

export type BuhflipEnemyBaseAnomaly = number

export type BuhflipVersionDazeMultiplier = number

export type BuhflipVersionAnomalyMultiplier = number

export type BuhflipMainBuffNum = number

export type BuhflipEnemyDefense = number

export type BuhflipEnemyDaze = number

export type BuhflipEnemyHP = number

export type BuhflipBossHP = number

export type BuhflipPP20kHP = number

export type BuhflipAltHPReduction = number

/**
 * Single enemy entry from buhflipexplode-enemies.json.
 * The top-level object is `Record<BuhflipEnemyId, BuhflipEnemy>` keyed by enemy ID.
 */
export interface BuhflipEnemy {
  name: BuhflipEnemyName
  /** [type 0 base HP, type 1 base HP] */
  baseHP: BuhflipEnemyBaseHPPair
  baseDEF: BuhflipEnemyBaseDefense
  /** [type 0 base daze, type 1 base daze] */
  baseDaze: BuhflipEnemyBaseDazePair
  /** Stun damage multiplier (%) */
  stunMult: BuhflipEnemyStunMultiplier
  /** Stun duration in seconds */
  stunTime: BuhflipEnemyStunTime
  baseAnom: BuhflipEnemyBaseAnomaly
  image: BuhflipEnemyImage
  /**
   * Elemental damage multipliers [ice, fire, electric, ether, physical].
   * Values < 1 mean the enemy resists that element; > 1 means weakness.
   */
  elementMult: BuhflipElementMultiplierTuple
  tags: BuhflipEnemyTagList
  /** In-combat modifiers, e.g. "40-dmg-res", "no-freeze" */
  mods: BuhflipEnemyModifierList
  desc?: BuhflipTextPair
  perf?: BuhflipTextPair
  misc?: BuhflipEnemyMiscText
  spoilerDesc?: BuhflipEnemySpoilerText
  spoilerPerf?: BuhflipEnemySpoilerText
}

/** `buhflipexplode-enemies.json` top-level shape */
export type BuhflipEnemyDB = Record<BuhflipEnemyId, BuhflipEnemy>

// ── SD raw types ──

export interface SDEnemyRef {
  id: BuhflipEnemyId
  /** Selects baseHP[type] / baseDaze[type] */
  type: BuhflipEnemyRefType
  count: BuhflipEnemyCount
}
export type SDEnemyRefList = SDEnemyRef[]
export interface SDWave {
  enemies: SDEnemyRefList
}
export type SDWaveList = SDWave[]
export interface SDSide {
  /** Elemental damage multipliers [ice, fire, electric, ether, physical] for this side */
  sideElementMult: BuhflipElementMultiplierTuple
  sideHPMult: BuhflipEnemyHPMult
  waves: SDWaveList
}
export type SDSideSlot = SDSide | null
export type SDSideSlotList = SDSideSlot[]
export interface SDNode {
  buffName: BuhflipBuffTextValue
  buffDesc: BuhflipBuffTextValue
  sides: SDSideSlotList
}
export type SDNodeList = SDNode[]
export interface SDVersionEnemies {
  nodes: SDNodeList
}
export interface SDVersionData {
  versionName: BuhflipVersionName
  versionTime: BuhflipVersionTime
  versionDazeMult: BuhflipVersionDazeMultiplier
  versionAnomMult: BuhflipVersionAnomalyMultiplier
  versionEnemies: SDVersionEnemies
  /** Critical Node only: version-level buff (overrides node.buffName post-2.5) */
  buffName?: BuhflipBuffTextValue
  buffDesc?: BuhflipBuffTextValue
  mainBuffNum?: BuhflipMainBuffNum
}
export type SDVersionRecord = Record<BuhflipVersionRecordKey, SDVersionData>
export interface SDVersionsMode {
  name: BuhflipVersionsModeName
  versions: SDVersionRecord
}
export type SDVersionsModeList = SDVersionsMode[]
/** `buhflipexplode-shiyu-defense.json` top-level shape */
export type SDVersionsJson = SDVersionsModeList

// ── DA raw types ──

export interface DAEnemyRef {
  id: BuhflipEnemyId
  type: BuhflipEnemyRefType
  /** Boss HP multiplier (e.g. 180 for Wandering Hunter) */
  mult: BuhflipBossHPMult
}
export type DAEnemyRefList = DAEnemyRef[]
export interface DAVersionData {
  versionName: BuhflipVersionName
  versionTime: BuhflipVersionTime
  versionDazeMult: BuhflipVersionDazeMultiplier
  versionAnomMult: BuhflipVersionAnomalyMultiplier
  buffNames: BuhflipBuffTextList
  versionEnemies: DAEnemyRefList
}
export type DAVersionRecord = Record<BuhflipVersionRecordKey, DAVersionData>
/** `buhflipexplode-deadly-assault.json` top-level shape */
export type DAVersionsJson = DAVersionRecord

// ── TS raw types ──

export interface TSEnemyRef {
  id: BuhflipEnemyId
  type: BuhflipEnemyRefType
  count?: BuhflipEnemyCount
  /** Boss mult (absent for regular enemies) */
  mult?: BuhflipBossHPMult
}
export type TSEnemyRefList = TSEnemyRef[]
export interface TSWave {
  enemies: TSEnemyRefList
}
export type TSWaveList = TSWave[]
export interface TSSide {
  sideHPMult?: BuhflipEnemyHPMult
  waves: TSWaveList
}
export type TSSideSlot = TSSide | null
export type TSSideSlotList = TSSideSlot[]
export interface TSNode {
  buffNames: BuhflipBuffTextList
  /** sides[0] = boss side; sides[1..n] = regular enemy sides */
  sides: TSSideSlotList
}
export type TSNodeList = TSNode[]
export interface TSVersionEnemies {
  nodes: TSNodeList
}
export interface TSVersionData {
  versionName: BuhflipVersionName
  versionTime: BuhflipVersionTime
  versionBossDazeMult: BuhflipVersionDazeMultiplier
  versionEnemyDazeMult: BuhflipVersionDazeMultiplier
  versionBossAnomMult: BuhflipVersionAnomalyMultiplier
  versionEnemyAnomMult: BuhflipVersionAnomalyMultiplier
  versionEnemies: TSVersionEnemies
}
export type TSVersionRecord = Record<BuhflipVersionRecordKey, TSVersionData>
export interface TSVersionsMode {
  name: BuhflipVersionsModeName
  versions: TSVersionRecord
}
export type TSVersionsModeList = TSVersionsMode[]
/** `buhflipexplode-threshold-simulation.json` top-level shape */
export type TSVersionsJson = TSVersionsModeList

// ─── Enemy stat calculations ──────────────────────────────────────────────────

/**
 * Calculates enemy DEF at a given node level.
 *
 * Formula (sd.js / da.js): `baseDEF × NODE_DEF_MULT[nodeLvl − 1] / 100`
 * DEF is capped at level 60 (1588) for levels 61–70.
 *
 * @param baseDEF - `BuhflipEnemy.baseDEF`
 * @param nodeLvl - 1-based node level (1–70)
 */
export function calcEnemyDEF(
  baseDEF: BuhflipEnemyBaseDefense,
  nodeLvl: BuhflipNodeLevel,
): BuhflipEnemyDefense {
  return (baseDEF * NODE_DEF_MULT[nodeLvl - 1]) / 100
}

/**
 * Calculates enemy daze at a given node level (before version modifier).
 *
 * Formula (sd.js): `baseDaze × NODE_DAZE_MULT[nodeLvl − 1] / 100`
 * To get the final daze value, multiply the result by `versionDazeMult / 100`.
 *
 * @param baseDaze - daze for one side: `BuhflipEnemy.baseDaze[0]` or `[1]`
 * @param nodeLvl - 1-based node level (1–70)
 */
export function calcEnemyDaze(
  baseDaze: BuhflipEnemyBaseDaze,
  nodeLvl: BuhflipNodeLevel,
): BuhflipEnemyDaze {
  return (baseDaze * NODE_DAZE_MULT[nodeLvl - 1]) / 100
}

// ─── HP calculations ──────────────────────────────────────────────────────────

/**
 * Calculates a single SD enemy's HP at a given node level.
 *
 * Formula (sd.js): `Math.round(sideHPMult × baseHP × NODE_HP_MULT[nodeLvl − 1] / 10000)`
 *
 * @param baseHP   - `BuhflipEnemy.baseHP[ref.type]`
 * @param sideHPMult - `SDSide.sideHPMult`
 * @param nodeLvl  - 1-based node level
 */
export function calcSDEnemyHP(
  baseHP: BuhflipEnemyBaseHP,
  sideHPMult: BuhflipEnemyHPMult,
  nodeLvl: BuhflipNodeLevel,
): BuhflipEnemyHP {
  return Math.round((sideHPMult * baseHP * NODE_HP_MULT[nodeLvl - 1]) / 10000)
}

/**
 * Calculates a single TS regular (non-boss) enemy's HP at a given node level.
 * Uses NODE_ENEMY_HP_MULT, which has a slower growth curve than the boss table.
 *
 * Formula (ts.js): `Math.round(baseHP × sideHPMult × NODE_ENEMY_HP_MULT[nodeLvl − 1] / 10000)`
 *
 * @param baseHP     - `BuhflipEnemy.baseHP[ref.type]`
 * @param sideHPMult - `TSSide.sideHPMult` (defaults to 100 when absent)
 * @param nodeLvl    - 1-based node level
 */
export function calcTSEnemyHP(
  baseHP: BuhflipEnemyBaseHP,
  sideHPMult: BuhflipEnemyHPMult,
  nodeLvl: BuhflipNodeLevel,
): BuhflipEnemyHP {
  return Math.round(
    (baseHP * sideHPMult * NODE_ENEMY_HP_MULT[nodeLvl - 1]) / 10000,
  )
}

/**
 * Calculates a DA or TS boss raw HP (the 60k PP value before altHP adjustments).
 *
 * Formula (da.js / ts.js):
 * `Math.floor(BOSS_HP_COEFF × baseHP × NODE_HP_MULT[nodeLvl − 1] × mult / 10000)`
 *
 * For DA, `nodeLvl` is always 70 (use DA_NODE_HP_MULT directly if preferred).
 *
 * @param baseHP  - `BuhflipEnemy.baseHP[ref.type]`
 * @param nodeLvl - 1-based node level (DA: always 70)
 * @param mult    - boss mult from version data (e.g. `DAEnemyRef.mult`)
 */
export function calcBossHP(
  baseHP: BuhflipEnemyBaseHP,
  nodeLvl: BuhflipNodeLevel,
  mult: BuhflipBossHPMult,
): BuhflipBossHP {
  return Math.floor(
    (BOSS_HP_COEFF * baseHP * NODE_HP_MULT[nodeLvl - 1] * mult) / 10000,
  )
}

/**
 * Calculates the 20k PP HP threshold from the summed 60k PP total.
 *
 * Formula: `Math.ceil(PP20K_FACTOR × total60k)`
 */
export function calcPP20k(total60k: BuhflipPP60kTotalHP): BuhflipPP20kHP {
  return Math.ceil(PP20K_FACTOR * total60k)
}

// ─── AltHP reduction helpers ──────────────────────────────────────────────────
//
// "altHP" is buhflipexplode's metric for estimated HP under non-AoE play,
// accounting for enemies that can be safely ignored or are harder to reach.
// It equals rawHP minus the sum of (hp × reductionFraction) for each enemy.

/**
 * Returns the altHP reduction fraction for a single SD enemy occurrence.
 *
 * Rules (extracted from sd.js):
 * - `palicus` tag:  −25%
 * - `robot` tag:    −10%
 * - `brute` tag:    −8%
 * - `miasma` tag:   −30% if id `"26202"`, else −8.125%
 *   ⚠ sd.js bug: `"2" == t[2]` accesses numeric property 2 of the enemy ref
 *   object (always `undefined`), so the 0.15 branch is dead code. The effective
 *   rate is always 0.08125 except for id "26202".
 * - No qualifying tags + not first in wave: −100% (surplus enemy, fully ignored)
 * - First enemy in wave: 0 (always counted regardless of tags)
 *
 * @returns reduction fraction (0–1); multiply by the enemy's HP to get the amount to subtract
 */
export function calcSDEnemyAltHPReduction(
  tags: BuhflipEnemyTagList,
  id: BuhflipEnemyId,
  isFirstInWave: boolean,
): BuhflipAltHPReduction {
  const hasSpecial =
    tags.length >= 1 &&
    !(tags.length === 1 && (tags.includes("spoiler") || tags.includes("hitch")))

  if (hasSpecial) {
    let r = 0
    if (tags.includes("palicus")) r += 0.25
    if (tags.includes("robot")) r += 0.1
    if (tags.includes("brute")) r += 0.08
    if (tags.includes("miasma")) r += id === "26202" ? 0.3 : 0.08125
    return r
  }

  return isFirstInWave ? 0 : 1
}

/**
 * Returns the altHP reduction fraction for a TS regular enemy occurrence.
 * Same logic as SD but with a different miasma rate (from ts.js buildHPData).
 *
 * Difference from SD:
 * - `miasma` tag: −30% if id `"26202"`, else −15% (ts.js uses the correct 0.15 value)
 *
 * @returns reduction fraction (0–1)
 */
export function calcTSEnemyAltHPReduction(
  tags: BuhflipEnemyTagList,
  id: BuhflipEnemyId,
  isFirstInWave: boolean,
): BuhflipAltHPReduction {
  const hasSpecial =
    tags.length >= 1 &&
    !(tags.length === 1 && (tags.includes("spoiler") || tags.includes("hitch")))

  if (hasSpecial) {
    let r = 0
    if (tags.includes("palicus")) r += 0.25
    if (tags.includes("robot")) r += 0.1
    if (tags.includes("brute")) r += 0.08
    if (tags.includes("miasma")) r += id === "26202" ? 0.3 : 0.15
    return r
  }

  return isFirstInWave ? 0 : 1
}

/**
 * Returns the altHP reduction fraction for a DA boss.
 * `altHP = Math.ceil(rawHP × (1 − reduction))`
 *
 * Rules (da.js):
 * - No tags / only `"spoiler"` tag: 0 (no reduction)
 * - `ucc` tag:      −3.6%
 * - `hunter` tag:   −1%
 * - `miasma` tag:   −4.5% if id `"25300"`; −2.5% if `versionIdx ≥ 19`; else −3%
 * - `shutdown` tag: −3% if id `"26300"`; else −1.5%
 * - `convert` tag:  −3%
 *
 * @param tags - enemy tags from BuhflipEnemy
 * @param id - enemy ID string
 * @param versionIdx - 1-based DA version index (determines miasma rate)
 * @returns reduction fraction (0–1)
 */
export function calcDABossAltHPReduction(
  tags: BuhflipEnemyTagList,
  id: BuhflipEnemyId,
  versionIdx: BuhflipVersionIndex,
): BuhflipAltHPReduction {
  if (tags.length < 1 || (tags.length === 1 && tags.includes("spoiler")))
    return 0
  let r = 0
  if (tags.includes("ucc")) r += 0.036
  if (tags.includes("hunter")) r += 0.01
  if (tags.includes("miasma"))
    r += id === "25300" ? 0.045 : versionIdx >= 19 ? 0.025 : 0.03
  if (tags.includes("shutdown")) r += id === "26300" ? 0.03 : 0.015
  if (tags.includes("convert")) r += 0.03
  return r
}

/**
 * Returns the altHP reduction fraction for a TS boss.
 * Same logic as DA but the miasma rate has no version dependency (always −2.5%).
 *
 * @returns reduction fraction (0–1)
 * @see calcDABossAltHPReduction
 */
export function calcTSBossAltHPReduction(
  tags: BuhflipEnemyTagList,
  id: BuhflipEnemyId,
): BuhflipAltHPReduction {
  if (tags.length < 1 || (tags.length === 1 && tags.includes("spoiler")))
    return 0
  let r = 0
  if (tags.includes("ucc")) r += 0.036
  if (tags.includes("hunter")) r += 0.01
  if (tags.includes("miasma")) r += id === "25300" ? 0.045 : 0.025
  if (tags.includes("shutdown")) r += id === "26300" ? 0.03 : 0.015
  if (tags.includes("convert")) r += 0.03
  return r
}

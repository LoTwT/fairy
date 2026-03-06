import type { CrawlTask } from "./shared.js"
import { fetchJson } from "./shared.js"

const BASE_URL = "https://www.buhflipexplode.org"

// ─── Level multiplier tables (extracted from *.js source) ────────────────────

/* eslint-disable antfu/consistent-list-newline */
/** Used by SD enemies and TS bosses (from sd.js / ts.js nodeBossHPMult) */
// prettier-ignore
const nodeHPMult = [
  100, 116, 135, 157, 181, 193, 206, 220, 235, 271, 291, 314, 338, 364, 419,
  431, 444, 458, 472, 543, 618, 703, 801, 912, 1049, 1134, 1227, 1328, 1437,
  1653, 1792, 1942, 2106, 2283, 2626, 2865, 3126, 3411, 3722, 4281, 4717, 5197,
  5727, 6311, 7258, 7691, 8151, 8637, 9153, 10527, 11227, 11975, 12772, 13623,
  15667, 15957, 16252, 16553, 16860, 19389, 19716, 20049, 20387, 20731, 21081,
  21437, 21799, 22167, 22541, 24795,
]

/** Used by TS regular enemies (from ts.js nodeEnemyHPMult) */
// prettier-ignore
const nodeEnemyHPMult = [
  100, 116, 135, 157, 181, 193, 206, 220, 235, 271, 291, 314, 338, 364, 419,
  431, 444, 458, 472, 543, 618, 703, 801, 912, 1049, 1111, 1176, 1246, 1320,
  1518, 1609, 1706, 1809, 1919, 2207, 2320, 2440, 2566, 2698, 3103, 3404, 3734,
  4097, 4494, 5169, 5591, 6049, 6544, 7079, 8141, 8826, 9569, 10374, 11246,
  12934, 13260, 13595, 13938, 14290, 16434, 16774, 17121, 17475, 17837, 18206,
  18583, 18968, 19361, 19761, 21738,
]
/* eslint-enable antfu/consistent-list-newline */

// ─── SD constants ─────────────────────────────────────────────────────────────

const stableNodeLvls = [25, 28, 30, 33, 35, 38, 40, 43, 45, 50]
const disputedNodeLvls = [40, 43, 45, 48, 50, 53, 55, 60]
const ambushNodeLvls = [50, 53, 55, 60, 65]
const pre25CritNodeLvls = [50, 53, 55, 58, 60, 65, 70]
const post25CritNodeLvls = [50, 55, 60, 65, 70]
/** 1-based critical version index from which post-2.5 data applies */
const SD_V25 = 38

// ─── TS constants ─────────────────────────────────────────────────────────────

const easyNodeLvls = [55, 58, 60, 65]
const pre26HardNodeLvls = [60, 63, 65, 70, 70, 70]
const post26HardNodeLvls = [60, 65, 70, 70, 70]
/** 1-based hard version index from which post-2.6 data applies */
const TS_V26 = 2

// ─── DA constants ─────────────────────────────────────────────────────────────

/** DA bosses are always Lv70 → nodeHPMult[69] */
const DA_HP_MULT = nodeHPMult[69] // 24795
/** Boss HP coefficient shared by DA and TS */
const BOSS_COEFF = 8.74
/** 20k PP is this fraction of 60k PP total HP */
const PP20K_FACTOR = 0.281083138

// ─── Raw JSON types ───────────────────────────────────────────────────────────

interface EnemyEntry {
  name: string
  baseHP: [number, number]
  tags: string[]
}
type EnemyDB = Record<string, EnemyEntry>

// SD
interface SDEnemyRef {
  id: string
  type: number
  count: number
}
interface SDSide {
  sideHPMult: number
  waves: Array<{ enemies: SDEnemyRef[] }>
}
interface SDNode {
  buffName: string | string[]
  buffDesc: string | string[]
  sides: (SDSide | null)[]
}
interface SDVersionData {
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  versionEnemies: { nodes: SDNode[] }
  // post-2.5 critical node fields
  buffName?: string | string[]
  buffDesc?: string | string[]
  mainBuffNum?: number
}
type SDVersionsJson = Array<{
  name: string
  versions: Record<string, SDVersionData>
}>

// DA
interface DAEnemyRef {
  id: string
  type: number
  mult: number
}
interface DAVersionData {
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  buffNames: string[]
  versionEnemies: DAEnemyRef[]
}
type DAVersionsJson = Record<string, DAVersionData>

// TS
interface TSEnemyRef {
  id: string
  type: number
  count?: number
  mult?: number
}
interface TSSide {
  sideHPMult?: number
  waves: Array<{ enemies: TSEnemyRef[] }>
}
interface TSNode {
  buffNames: string[]
  sides: (TSSide | null)[]
}
interface TSVersionData {
  versionName: string
  versionTime: string
  versionBossDazeMult: number
  versionEnemyDazeMult: number
  versionBossAnomMult: number
  versionEnemyAnomMult: number
  versionEnemies: { nodes: TSNode[] }
}
type TSVersionsJson = Array<{
  name: string
  versions: Record<string, TSVersionData>
}>

// ─── SD HP calculation ────────────────────────────────────────────────────────

function calcSDNodeHP(
  node: SDNode,
  nodeLvl: number,
  enemies: EnemyDB,
): { rawHP: number; aoeHP: number; altHP: number } {
  let rawHP = 0
  let aoeHP = 0
  let altHP = 0

  for (const side of node.sides) {
    if (side === null) continue
    const { sideHPMult, waves } = side

    for (const wave of waves) {
      let firstInWave = true

      for (const ref of wave.enemies) {
        const e = enemies[ref.id]
        if (!e) continue
        const hp = Math.round(
          (sideHPMult * e.baseHP[ref.type] * nodeHPMult[nodeLvl - 1]) / 10000,
        )
        const tags = e.tags
        const hasSpecial =
          tags.length >= 1 &&
          !(
            tags.length === 1 &&
            (tags.includes("spoiler") || tags.includes("hitch"))
          )

        for (let c = 0; c < ref.count; c++) {
          rawHP += ref.id !== "14000" ? hp : 1
          if (firstInWave) aoeHP += hp
          altHP += hp

          if (hasSpecial) {
            if (tags.includes("palicus")) altHP -= 0.25 * hp
            if (tags.includes("robot")) altHP -= 0.1 * hp
            if (tags.includes("brute")) altHP -= 0.08 * hp
            if (tags.includes("miasma")) {
              // In sd.js: `"2"==t[2]` accesses property 2 of the enemy ref object,
              // which is always undefined → the 0.15 branch never fires.
              // So SD miasma is always 0.08125 (except id "26202" = 0.3).
              const r = ref.id === "26202" ? 0.3 : 0.08125
              altHP -= hp * r
            }
          } else if (!firstInWave) {
            altHP -= hp
          }

          firstInWave = false
        }
      }
    }
  }

  return { rawHP, aoeHP, altHP: Math.ceil(altHP) }
}

// ─── DA HP calculation ────────────────────────────────────────────────────────

function calcDABossRawHP(ref: DAEnemyRef, e: EnemyEntry): number {
  return Math.floor(
    (BOSS_COEFF * e.baseHP[ref.type] * DA_HP_MULT * ref.mult) / 10000,
  )
}

function calcDABossAltHP(
  rawHP: number,
  ref: DAEnemyRef,
  e: EnemyEntry,
  versionIdx: number, // 1-based
): number {
  const tags = e.tags
  if (tags.length < 1 || (tags.length === 1 && tags.includes("spoiler")))
    return rawHP
  let alt = rawHP
  if (tags.includes("ucc")) alt -= 0.036 * rawHP
  if (tags.includes("hunter")) alt -= 0.01 * rawHP
  if (tags.includes("miasma")) {
    const r = ref.id === "25300" ? 0.045 : versionIdx >= 19 ? 0.025 : 0.03
    alt -= rawHP * r
  }
  if (tags.includes("shutdown"))
    alt -= (ref.id === "26300" ? 0.03 : 0.015) * rawHP
  if (tags.includes("convert")) alt -= 0.03 * rawHP
  return Math.ceil(alt)
}

// ─── TS HP calculation ────────────────────────────────────────────────────────

function calcTSBossRawHP(
  ref: TSEnemyRef,
  e: EnemyEntry,
  nodeLvl: number,
): number {
  return Math.floor(
    (BOSS_COEFF *
      e.baseHP[ref.type] *
      nodeHPMult[nodeLvl - 1] *
      (ref.mult ?? 100)) /
      10000,
  )
}

function calcTSBossAltHP(
  rawHP: number,
  ref: TSEnemyRef,
  e: EnemyEntry,
): number {
  const tags = e.tags
  if (tags.length < 1 || (tags.length === 1 && tags.includes("spoiler")))
    return rawHP
  let alt = rawHP
  if (tags.includes("ucc")) alt -= 0.036 * rawHP
  if (tags.includes("hunter")) alt -= 0.01 * rawHP
  if (tags.includes("miasma")) {
    const r = ref.id === "25300" ? 0.045 : 0.025
    alt -= rawHP * r
  }
  if (tags.includes("shutdown"))
    alt -= (ref.id === "26300" ? 0.03 : 0.015) * rawHP
  if (tags.includes("convert")) alt -= 0.03 * rawHP
  return Math.ceil(alt)
}

function calcTSEnemiesHP(
  node: TSNode,
  nodeLvl: number,
  enemies: EnemyDB,
): { rawHP: number; aoeHP: number; altHP: number } {
  // sides[0] = boss, sides[1..4] = regular enemy sides
  let rawHP = 0
  let aoeHP = 0
  let altHP = 0

  for (let si = 1; si < node.sides.length; si++) {
    const side = node.sides[si]
    if (side === null) continue
    const sideHPMult = side.sideHPMult ?? 100

    for (const wave of side.waves) {
      let firstInWave = true

      for (const ref of wave.enemies) {
        const e = enemies[ref.id]
        if (!e) continue
        const count = ref.count ?? 1
        const hp = Math.round(
          (e.baseHP[ref.type] * sideHPMult * nodeEnemyHPMult[nodeLvl - 1]) /
            10000,
        )
        const tags = e.tags
        const hasSpecial =
          tags.length >= 1 &&
          !(
            tags.length === 1 &&
            (tags.includes("spoiler") || tags.includes("hitch"))
          )

        for (let c = 0; c < count; c++) {
          rawHP += ref.id !== "14000" ? hp : 1
          if (firstInWave) aoeHP += hp
          altHP += hp

          if (hasSpecial) {
            if (tags.includes("palicus")) altHP -= 0.25 * hp
            if (tags.includes("robot")) altHP -= 0.1 * hp
            if (tags.includes("brute")) altHP -= 0.08 * hp
            if (tags.includes("miasma")) {
              const r = ref.id === "26202" ? 0.3 : 0.15
              altHP -= hp * r
            }
          } else if (!firstInWave) {
            altHP -= hp
          }

          firstInWave = false
        }
      }
    }
  }

  return { rawHP, aoeHP, altHP: Math.ceil(altHP) }
}

// ─── SD output builder ────────────────────────────────────────────────────────

function buildSDOutput(versionsData: SDVersionsJson, enemies: EnemyDB) {
  const GROUP_NODE_LVLS = [
    stableNodeLvls,
    disputedNodeLvls,
    ambushNodeLvls,
    null, // critical: version-dependent
  ]

  return versionsData.map((group, groupIdx) => {
    const isCritical = groupIdx === 3
    const isAmbush = groupIdx === 2
    const versionEntries = Object.entries(group.versions)

    const versions = versionEntries.map(([versionId, ver], vIdx) => {
      const versionNum = vIdx + 1 // 1-based
      const nodeLvls = isCritical
        ? versionNum < SD_V25
          ? pre25CritNodeLvls
          : post25CritNodeLvls
        : (GROUP_NODE_LVLS[groupIdx] as number[])

      const nodes = ver.versionEnemies.nodes
        .map((node, nIdx) => {
          const nodeLvl = nodeLvls[nIdx]
          if (nodeLvl === undefined) return null
          const hp = calcSDNodeHP(node, nodeLvl, enemies)

          // buffName: from node for non-critical, from version for critical
          let buffNames: string[]
          if (isCritical) {
            const raw = ver.buffName ?? node.buffName
            buffNames = Array.isArray(raw) ? raw : [raw as string]
          } else {
            const raw = node.buffName
            buffNames = Array.isArray(raw) ? raw : [raw]
          }

          return {
            node: nIdx + 1,
            level: nodeLvl,
            buffNames,
            rawHP: hp.rawHP,
            aoeHP: hp.aoeHP,
            altHP: isAmbush ? null : hp.altHP,
          }
        })
        .filter(Boolean)

      return {
        id: versionId,
        name: ver.versionName,
        time: ver.versionTime,
        dazeMult: ver.versionDazeMult,
        anomMult: ver.versionAnomMult,
        nodes,
      }
    })

    return { name: group.name, versions }
  })
}

// ─── DA output builder ────────────────────────────────────────────────────────

function buildDAOutput(versionsData: DAVersionsJson, enemies: EnemyDB) {
  return Object.entries(versionsData).map(([versionId, ver], vIdx) => {
    const versionNum = vIdx + 1 // 1-based, used for miasma version check

    let raw60k = 0
    let alt60k = 0

    const bosses = ver.versionEnemies
      .map((ref) => {
        const e = enemies[ref.id]
        if (!e) return null
        const rawHP = calcDABossRawHP(ref, e)
        const altHP = calcDABossAltHP(rawHP, ref, e, versionNum)
        raw60k += rawHP
        alt60k += altHP
        return {
          id: ref.id,
          name: e.name,
          type: ref.type,
          mult: ref.mult,
          rawHP,
          altHP,
        }
      })
      .filter(Boolean)

    return {
      id: versionId,
      name: ver.versionName,
      time: ver.versionTime,
      dazeMult: ver.versionDazeMult,
      anomMult: ver.versionAnomMult,
      buffNames: ver.buffNames,
      hp: {
        raw20k: Math.ceil(PP20K_FACTOR * raw60k),
        raw60k,
        alt20k: Math.ceil(PP20K_FACTOR * alt60k),
        alt60k,
      },
      bosses,
    }
  })
}

// ─── TS output builder ────────────────────────────────────────────────────────

function buildTSOutput(versionsData: TSVersionsJson, enemies: EnemyDB) {
  return versionsData.map((group, groupIdx) => {
    const isHard = groupIdx === 1
    const versionEntries = Object.entries(group.versions)

    const versions = versionEntries.map(([versionId, ver], vIdx) => {
      const versionNum = vIdx + 1 // 1-based
      const nodeLvls = isHard
        ? versionNum < TS_V26
          ? pre26HardNodeLvls
          : post26HardNodeLvls
        : easyNodeLvls

      const nodes = ver.versionEnemies.nodes
        .map((node, nIdx) => {
          const nodeLvl = nodeLvls[nIdx]
          if (nodeLvl === undefined) return null

          // sides[0] = boss
          const bossRef = node.sides[0]?.waves[0]?.enemies[0]
          const bossEntry = bossRef ? enemies[bossRef.id] : undefined

          let boss: {
            id: string
            name: string
            type: number
            mult: number
            raw20k: number
            raw60k: number
            alt20k: number
            alt60k: number
          } | null = null

          if (bossRef && bossEntry) {
            const bossRaw60k = calcTSBossRawHP(bossRef, bossEntry, nodeLvl)
            const bossAlt60k = calcTSBossAltHP(bossRaw60k, bossRef, bossEntry)
            boss = {
              id: bossRef.id,
              name: bossEntry.name,
              type: bossRef.type,
              mult: bossRef.mult ?? 100,
              raw20k: Math.ceil(PP20K_FACTOR * bossRaw60k),
              raw60k: bossRaw60k,
              alt20k: Math.ceil(PP20K_FACTOR * bossAlt60k),
              alt60k: bossAlt60k,
            }
          }

          const enemy = calcTSEnemiesHP(node, nodeLvl, enemies)

          return {
            node: nIdx + 1,
            level: nodeLvl,
            buffNames: node.buffNames,
            boss,
            enemy,
          }
        })
        .filter(Boolean)

      return {
        id: versionId,
        name: ver.versionName,
        time: ver.versionTime,
        bossDazeMult: ver.versionBossDazeMult,
        enemyDazeMult: ver.versionEnemyDazeMult,
        bossAnomMult: ver.versionBossAnomMult,
        enemyAnomMult: ver.versionEnemyAnomMult,
        nodes,
      }
    })

    return { name: group.name, versions }
  })
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks: CrawlTask[] = [
  {
    name: "en/buhflipexplode-shiyu-defense",
    url: `${BASE_URL}/zzz/sd/sd-versions.json`,
    extract: async (_, html) => {
      const versionsData = JSON.parse(html) as SDVersionsJson
      const enemies = await fetchJson<EnemyDB>(
        `${BASE_URL}/assets/zzz/enemies.json`,
      )
      return buildSDOutput(versionsData, enemies)
    },
  },
  {
    name: "en/buhflipexplode-deadly-assault",
    url: `${BASE_URL}/zzz/da/da-versions.json`,
    extract: async (_, html) => {
      const versionsData = JSON.parse(html) as DAVersionsJson
      const enemies = await fetchJson<EnemyDB>(
        `${BASE_URL}/assets/zzz/enemies.json`,
      )
      return buildDAOutput(versionsData, enemies)
    },
  },
  {
    name: "en/buhflipexplode-threshold-simulation",
    url: `${BASE_URL}/zzz/ts/ts-versions.json`,
    extract: async (_, html) => {
      const versionsData = JSON.parse(html) as TSVersionsJson
      const enemies = await fetchJson<EnemyDB>(
        `${BASE_URL}/assets/zzz/enemies.json`,
      )
      return buildTSOutput(versionsData, enemies)
    },
  },
]

import type {
  BuhflipEnemy,
  BuhflipEnemyDB,
  SDVersionsJson,
  TSVersionsJson,
} from "../../src/buhflipexplode/index.js"
import {
  calcBossHP,
  calcDABossAltHPReduction,
  calcEnemyDaze,
  calcEnemyDEF,
  calcSDEnemyAltHPReduction,
  calcSDEnemyHP,
  calcTSBossAltHPReduction,
  calcTSEnemyAltHPReduction,
  calcTSEnemyHP,
  SD_AMBUSH_NODE_LVLS,
  SD_DISPUTED_NODE_LVLS,
  SD_POST25_CRIT_NODE_LVLS,
  SD_PRE25_CRIT_NODE_LVLS,
  SD_STABLE_NODE_LVLS,
  SD_V25_BOUNDARY,
  TS_EASY_NODE_LVLS,
  TS_POST26_HARD_NODE_LVLS,
  TS_PRE26_HARD_NODE_LVLS,
  TS_V26_BOUNDARY,
} from "../../src/buhflipexplode/index.js"
import { readRaw, readXlsx, writeI18n, writeOut } from "./shared.js"

// ─── Input types ──────────────────────────────────────────────────────────────

interface RawEnDAEntry {
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  buffNames: string[]
  versionEnemies: Array<{ id: string; type: number; mult: number }>
}

interface RawEnDA {
  [versionKey: string]: RawEnDAEntry
}

interface RawEnBuffs {
  [name: string]: string
}

interface ZhBuff {
  name: string
  iconUrl: string
  effect: string
}

interface ZhBoss {
  name: string
  weaknesses: string[]
  resistances: string[]
  mechanics: string
}

interface RawZhDAEntry {
  period: number
  buffs: ZhBuff[]
  bosses: ZhBoss[]
}

interface BuffNameEntry {
  name: string
  iconUrl?: string
  effect: string
}

interface XlsxEnemy {
  fullName: string
  fullNameCn: string
}

// ─── Utility functions ────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim()
}

function toCamelCase(name: string): string {
  return name
    .split(" ")
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join("")
}

function extractNumbers(text: string): number[] {
  return (text.match(/[\d.]+/g) ?? []).map(Number).sort((a, b) => a - b)
}

function multisetIntersection(a: number[], b: number[]): number {
  let i = 0
  let j = 0
  let count = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      count++
      i++
      j++
    } else if (a[i]! < b[j]!) {
      i++
    } else {
      j++
    }
  }
  return count
}

function sortVersionKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [am = 0, an = 0, ap = 0] = a.split(".").map(Number)
    const [bm = 0, bn = 0, bp = 0] = b.split(".").map(Number)
    return am - bm || an - bn || ap - bp
  })
}

function isReleased(entry: RawEnDAEntry): boolean {
  return !entry.versionTime.includes("xx")
}

// ─── Name lookup helpers ──────────────────────────────────────────────────────

/** Build EN name (lowercase) → ZH name map from xlsx enemy-stat.json */
function buildXlsxZhMap(xlsx: XlsxEnemy[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of xlsx) {
    if (e.fullName && e.fullNameCn)
      map.set(e.fullName.toLowerCase(), e.fullNameCn)
  }
  return map
}

/** Build enemy id → ZhBoss map from DA mihoyo-wiki data (positional alignment) */
function buildDABossZhMap(
  enDA: RawEnDA,
  zhDA: RawZhDAEntry[],
  periodMap: Record<string, number>,
): Map<string, ZhBoss> {
  const map = new Map<string, ZhBoss>()
  const zhByPeriod = new Map(zhDA.map((e) => [e.period, e]))

  for (const [versionKey, entry] of Object.entries(enDA)) {
    if (!isReleased(entry)) continue
    const period = periodMap[versionKey]
    if (period === undefined) continue
    const zhEntry = zhByPeriod.get(period)
    if (!zhEntry) continue

    entry.versionEnemies.forEach((ref, i) => {
      const zhBoss = zhEntry.bosses[i]
      if (zhBoss && !map.has(ref.id)) map.set(ref.id, zhBoss)
    })
  }
  return map
}

/** Resolve enemy ZH name: DA wiki → xlsx → English fallback */
function getZhName(
  id: string,
  enName: string,
  daZhMap: Map<string, ZhBoss>,
  xlsxZhMap: Map<string, string>,
): string {
  return daZhMap.get(id)?.name ?? xlsxZhMap.get(enName.toLowerCase()) ?? enName
}

// ─── Node level helpers ───────────────────────────────────────────────────────

function getSDNodeLvl(
  modeName: string,
  nodeIdx: number,
  versionIdx: number,
): number {
  switch (modeName) {
    case "Stable Node":
      return SD_STABLE_NODE_LVLS[nodeIdx] ?? 50
    case "Disputed Node":
      return SD_DISPUTED_NODE_LVLS[nodeIdx] ?? 60
    case "Ambush Node":
      return SD_AMBUSH_NODE_LVLS[nodeIdx] ?? 65
    case "Critical Node": {
      const lvls =
        versionIdx < SD_V25_BOUNDARY
          ? SD_PRE25_CRIT_NODE_LVLS
          : SD_POST25_CRIT_NODE_LVLS
      return lvls[nodeIdx] ?? 70
    }
    default:
      return 60
  }
}

function getTSNodeLvl(
  modeName: string,
  nodeIdx: number,
  versionIdx: number,
): number {
  if (modeName === "Easy Mode") return TS_EASY_NODE_LVLS[nodeIdx] ?? 65
  const lvls =
    versionIdx < TS_V26_BOUNDARY
      ? TS_PRE26_HARD_NODE_LVLS
      : TS_POST26_HARD_NODE_LVLS
  return lvls[nodeIdx] ?? 70
}

// ─── Enemy stat calculation helpers ──────────────────────────────────────────

function computeDaze(
  enemy: BuhflipEnemy,
  type: number,
  nodeLvl: number,
  dazeMult: number,
): number {
  return Math.round(
    (calcEnemyDaze(enemy.baseDaze[type]!, nodeLvl) * dazeMult) / 100,
  )
}

function baseEnemyFields(
  enemy: BuhflipEnemy,
  type: number,
  name: string,
  hp: number,
  nodeLvl: number,
  dazeMult: number,
) {
  return {
    name,
    image: enemy.image,
    elementMult: enemy.elementMult,
    stunMult: enemy.stunMult,
    stunTime: enemy.stunTime,
    hp,
    def: Math.floor(calcEnemyDEF(enemy.baseDEF, nodeLvl)),
    daze: computeDaze(enemy, type, nodeLvl, dazeMult),
  }
}

// ─── Core logic: DA ──────────────────────────────────────────────────────────

function buildPeriodMap(enDA: RawEnDA): Record<string, number> {
  const releasedKeys = sortVersionKeys(Object.keys(enDA)).filter((k) =>
    isReleased(enDA[k]!),
  )
  return Object.fromEntries(releasedKeys.map((k, i) => [k, i + 1]))
}

function buildBuffNameMap(
  enDA: RawEnDA,
  enBuffs: RawEnBuffs,
  zhDA: RawZhDAEntry[],
  periodMap: Record<string, number>,
): Record<string, BuffNameEntry> {
  const result: Record<string, BuffNameEntry> = {}
  const zhByPeriod = new Map(zhDA.map((e) => [e.period, e]))

  for (const [versionKey, entry] of Object.entries(enDA)) {
    if (!isReleased(entry)) continue
    const period = periodMap[versionKey]
    if (period === undefined) continue
    const zhEntry = zhByPeriod.get(period)
    if (!zhEntry) continue

    const { buffNames } = entry
    const zhBuffs = zhEntry.buffs

    interface Candidate {
      enIdx: number
      zhIdx: number
      score: number
    }
    const candidates: Candidate[] = []

    for (let i = 0; i < buffNames.length; i++) {
      const enEffect = stripHtml(enBuffs[buffNames[i]!] ?? "")
      const enNums = extractNumbers(enEffect)
      for (let j = 0; j < zhBuffs.length; j++) {
        const zhNums = extractNumbers(zhBuffs[j]!.effect)
        candidates.push({
          enIdx: i,
          zhIdx: j,
          score: multisetIntersection(enNums, zhNums),
        })
      }
    }

    candidates.sort((a, b) => b.score - a.score)

    const assignedEn = new Set<number>()
    const assignedZh = new Set<number>()

    for (const { enIdx, zhIdx } of candidates) {
      if (assignedEn.has(enIdx) || assignedZh.has(zhIdx)) continue
      const camelKey = toCamelCase(buffNames[enIdx]!)
      if (!result[camelKey]) {
        result[camelKey] = {
          name: zhBuffs[zhIdx]!.name,
          iconUrl: zhBuffs[zhIdx]!.iconUrl,
          effect: zhBuffs[zhIdx]!.effect,
        }
      }
      assignedEn.add(enIdx)
      assignedZh.add(zhIdx)
    }
  }

  return result
}

function expandDAEnemy(
  ref: { id: string; type: number; mult: number },
  enemyDB: BuhflipEnemyDB,
  versionDazeMult: number,
  periodIdx: number,
  daZhMap: Map<string, ZhBoss>,
  locale: string,
) {
  const enemy = enemyDB[ref.id]!
  const hp = calcBossHP(enemy.baseHP[ref.type]!, 70, ref.mult)
  const reduction = calcDABossAltHPReduction(enemy.tags, ref.id, periodIdx)
  const altHp = Math.ceil(hp * (1 - reduction))
  const zhBoss = daZhMap.get(ref.id)
  const name = locale === "zh-CN" && zhBoss ? zhBoss.name : enemy.name

  const base = {
    id: ref.id,
    type: ref.type,
    mult: ref.mult,
    ...baseEnemyFields(enemy, ref.type, name, hp, 70, versionDazeMult),
    altHp,
  }

  if (locale === "zh-CN" && zhBoss) {
    return {
      ...base,
      weaknesses: zhBoss.weaknesses,
      resistances: zhBoss.resistances,
      mechanics: zhBoss.mechanics,
    }
  }
  return base
}

// ─── Core logic: SD ──────────────────────────────────────────────────────────

function expandSDSide(
  side: {
    sideElementMult: [number, number, number, number, number]
    sideHPMult: number
    waves: Array<{
      enemies: Array<{ id: string; type: number; count: number }>
    }>
  },
  nodeLvl: number,
  versionDazeMult: number,
  enemyDB: BuhflipEnemyDB,
  daZhMap: Map<string, ZhBoss>,
  xlsxZhMap: Map<string, string>,
  locale: string,
) {
  let hp60k = 0
  let altHp = 0

  const waves = side.waves.map((wave) => {
    const enemies = wave.enemies.map((ref, i) => {
      const isFirst = i === 0
      const enemy = enemyDB[ref.id]!
      const hp = calcSDEnemyHP(
        enemy.baseHP[ref.type]!,
        side.sideHPMult,
        nodeLvl,
      )
      const reduction = calcSDEnemyAltHPReduction(enemy.tags, ref.id, isFirst)
      hp60k += hp * ref.count
      altHp += Math.round(hp * (1 - reduction)) * ref.count
      const name =
        locale === "zh-CN"
          ? getZhName(ref.id, enemy.name, daZhMap, xlsxZhMap)
          : enemy.name
      return {
        id: ref.id,
        type: ref.type,
        count: ref.count,
        ...baseEnemyFields(enemy, ref.type, name, hp, nodeLvl, versionDazeMult),
      }
    })
    return { enemies }
  })

  return {
    sideElementMult: side.sideElementMult,
    sideHPMult: side.sideHPMult,
    nodeLvl,
    hp60k,
    altHp,
    waves,
  }
}

// ─── Core logic: TS ──────────────────────────────────────────────────────────

function expandTSBossSide(
  side: {
    waves: Array<{
      enemies: Array<{ id: string; type: number; mult?: number }>
    }>
  },
  nodeLvl: number,
  versionBossDazeMult: number,
  enemyDB: BuhflipEnemyDB,
  daZhMap: Map<string, ZhBoss>,
  locale: string,
) {
  let hp60k = 0
  let altHp = 0

  const waves = side.waves.map((wave) => {
    const enemies = wave.enemies.map((ref) => {
      const enemy = enemyDB[ref.id]!
      const mult = ref.mult ?? 100
      const hp = calcBossHP(enemy.baseHP[ref.type]!, nodeLvl, mult)
      const reduction = calcTSBossAltHPReduction(enemy.tags, ref.id)
      const bossAltHp = Math.ceil(hp * (1 - reduction))
      hp60k += hp
      altHp += bossAltHp
      const zhBoss = daZhMap.get(ref.id)
      const name = locale === "zh-CN" && zhBoss ? zhBoss.name : enemy.name

      const base = {
        id: ref.id,
        type: ref.type,
        mult,
        ...baseEnemyFields(
          enemy,
          ref.type,
          name,
          hp,
          nodeLvl,
          versionBossDazeMult,
        ),
        altHp: bossAltHp,
      }

      if (locale === "zh-CN" && zhBoss) {
        return {
          ...base,
          weaknesses: zhBoss.weaknesses,
          resistances: zhBoss.resistances,
          mechanics: zhBoss.mechanics,
        }
      }
      return base
    })
    return { enemies }
  })

  return { nodeLvl, hp60k, altHp, waves }
}

function expandTSEnemySide(
  side: {
    sideElementMult?: [number, number, number, number, number]
    sideHPMult?: number
    waves: Array<{
      enemies: Array<{ id: string; type: number; count?: number }>
    }>
  },
  nodeLvl: number,
  versionEnemyDazeMult: number,
  enemyDB: BuhflipEnemyDB,
  daZhMap: Map<string, ZhBoss>,
  xlsxZhMap: Map<string, string>,
  locale: string,
) {
  const sideHPMult = side.sideHPMult ?? 100
  let hp60k = 0
  let altHp = 0

  const waves = side.waves.map((wave) => {
    const enemies = wave.enemies.map((ref, i) => {
      const isFirst = i === 0
      const enemy = enemyDB[ref.id]!
      const count = ref.count ?? 1
      const hp = calcTSEnemyHP(enemy.baseHP[ref.type]!, sideHPMult, nodeLvl)
      const reduction = calcTSEnemyAltHPReduction(enemy.tags, ref.id, isFirst)
      hp60k += hp * count
      altHp += Math.round(hp * (1 - reduction)) * count
      const name =
        locale === "zh-CN"
          ? getZhName(ref.id, enemy.name, daZhMap, xlsxZhMap)
          : enemy.name
      return {
        id: ref.id,
        type: ref.type,
        count,
        ...baseEnemyFields(
          enemy,
          ref.type,
          name,
          hp,
          nodeLvl,
          versionEnemyDazeMult,
        ),
      }
    })
    return { enemies }
  })

  return {
    ...(side.sideElementMult ? { sideElementMult: side.sideElementMult } : {}),
    sideHPMult,
    nodeLvl,
    hp60k,
    altHp,
    waves,
  }
}

// ─── Merge tasks ──────────────────────────────────────────────────────────────

export function mergeBuffs(
  enBuffs: RawEnBuffs,
  buffNameMap: Record<string, BuffNameEntry>,
): void {
  const enOut: Record<string, { effect: string }> = {}
  for (const [name, effect] of Object.entries(enBuffs)) {
    if (name === "TBD") continue
    enOut[toCamelCase(name)] = { effect: stripHtml(effect) }
  }
  writeOut("en", "buffs", enOut)

  const zhOut: Record<
    string,
    { name: string; iconUrl?: string; effect: string }
  > = {}
  for (const [name, effect] of Object.entries(enBuffs)) {
    if (name === "TBD") continue
    const camelKey = toCamelCase(name)
    const zh = buffNameMap[camelKey]
    zhOut[camelKey] = zh
      ? {
          name: zh.name,
          ...(zh.iconUrl ? { iconUrl: zh.iconUrl } : {}),
          effect: zh.effect,
        }
      : { name, effect: stripHtml(effect) }
  }
  writeOut("zh-CN", "buffs", zhOut)
}

export function mergeDeadlyAssault(
  enDA: RawEnDA,
  enBuffs: RawEnBuffs,
  zhDA: RawZhDAEntry[],
  periodMap: Record<string, number>,
  buffNameMap: Record<string, BuffNameEntry>,
  enemyDB: BuhflipEnemyDB,
  daZhMap: Map<string, ZhBoss>,
): void {
  const sortedKeys = sortVersionKeys(Object.keys(enDA)).reverse()
  const zhByPeriod = new Map(zhDA.map((e) => [e.period, e]))

  for (const locale of ["en", "zh-CN"]) {
    const out = sortedKeys.map((versionKey) => {
      const entry = enDA[versionKey]!
      const period = periodMap[versionKey]
      const zhEntry = period !== undefined ? zhByPeriod.get(period) : undefined

      const buffs =
        zhEntry && locale === "zh-CN"
          ? zhEntry.buffs.map((zh) => {
              const camelKey =
                entry.buffNames
                  .map(toCamelCase)
                  .find((k) => buffNameMap[k]?.name === zh.name) ?? zh.name
              return {
                key: camelKey,
                name: zh.name,
                ...(zh.iconUrl ? { iconUrl: zh.iconUrl } : {}),
                effect: zh.effect,
              }
            })
          : entry.buffNames.map((name) => {
              const camelKey = toCamelCase(name)
              const zh = buffNameMap[camelKey]
              return locale === "zh-CN" && zh
                ? {
                    key: camelKey,
                    name: zh.name,
                    ...(zh.iconUrl ? { iconUrl: zh.iconUrl } : {}),
                    effect: zh.effect,
                  }
                : { key: camelKey, effect: stripHtml(enBuffs[name] ?? "") }
            })

      const versionEnemies = entry.versionEnemies.map((ref) =>
        expandDAEnemy(
          ref,
          enemyDB,
          entry.versionDazeMult,
          period ?? 0,
          daZhMap,
          locale,
        ),
      )

      return {
        versionKey,
        versionName: entry.versionName,
        versionTime: entry.versionTime,
        versionDazeMult: entry.versionDazeMult,
        versionAnomMult: entry.versionAnomMult,
        buffs,
        versionEnemies,
      }
    })
    writeOut(locale, "deadly-assault", out)
  }
}

export function mergeShiyuDefense(
  sdJson: SDVersionsJson,
  enemyDB: BuhflipEnemyDB,
  daZhMap: Map<string, ZhBoss>,
  xlsxZhMap: Map<string, string>,
): void {
  for (const locale of ["en", "zh-CN"]) {
    const out = sdJson.map((mode) => {
      const versionEntries = Object.entries(mode.versions)
      const versions = versionEntries
        .map(([versionKey, ver], versionIdx) => {
          const nodes = ver.versionEnemies.nodes.map((node, nodeIdx) => {
            const nodeLvl = getSDNodeLvl(mode.name, nodeIdx, versionIdx + 1)

            const sides = node.sides.map((side) => {
              if (side === null) return null
              return expandSDSide(
                side as Parameters<typeof expandSDSide>[0],
                nodeLvl,
                ver.versionDazeMult,
                enemyDB,
                daZhMap,
                xlsxZhMap,
                locale,
              )
            })
            // Critical Node stores buff at version level; other modes at node level
            const rawBuffName = node.buffName ?? ver.buffName
            const rawBuffDesc = node.buffDesc ?? ver.buffDesc
            const buffName =
              rawBuffName == null
                ? undefined
                : Array.isArray(rawBuffName)
                  ? rawBuffName.map(stripHtml)
                  : stripHtml(rawBuffName as string)
            const buffDesc =
              rawBuffDesc == null
                ? undefined
                : Array.isArray(rawBuffDesc)
                  ? rawBuffDesc.map(stripHtml)
                  : stripHtml(rawBuffDesc as string)
            return { buffName, buffDesc, sides }
          })
          return {
            versionKey,
            versionName: ver.versionName,
            versionTime: ver.versionTime,
            versionDazeMult: ver.versionDazeMult,
            versionAnomMult: ver.versionAnomMult,
            nodes,
          }
        })
        .reverse()
      return { name: mode.name, versions }
    })
    writeOut(locale, "shiyu-defense", out)
  }
}

export function mergeThresholdSimulation(
  tsJson: TSVersionsJson,
  enemyDB: BuhflipEnemyDB,
  daZhMap: Map<string, ZhBoss>,
  xlsxZhMap: Map<string, string>,
): void {
  for (const locale of ["en", "zh-CN"]) {
    const out = tsJson.map((mode) => {
      const versionEntries = Object.entries(mode.versions)
      const versions = versionEntries
        .map(([versionKey, ver], versionIdx) => {
          const nodes = ver.versionEnemies.nodes.map((node, nodeIdx) => {
            const nodeLvl = getTSNodeLvl(mode.name, nodeIdx, versionIdx + 1)
            const sides = node.sides.map((side, sideIdx) => {
              if (side === null) return null
              // sides[0] = boss side (enemies have `mult`), others = regular enemy sides
              if (sideIdx === 0) {
                return expandTSBossSide(
                  side as Parameters<typeof expandTSBossSide>[0],
                  nodeLvl,
                  ver.versionBossDazeMult,
                  enemyDB,
                  daZhMap,
                  locale,
                )
              }
              return expandTSEnemySide(
                side as Parameters<typeof expandTSEnemySide>[0],
                nodeLvl,
                ver.versionEnemyDazeMult,
                enemyDB,
                daZhMap,
                xlsxZhMap,
                locale,
              )
            })
            return { buffNames: node.buffNames, sides }
          })
          return {
            versionKey,
            versionName: ver.versionName,
            versionTime: ver.versionTime,
            versionBossDazeMult: ver.versionBossDazeMult,
            versionEnemyDazeMult: ver.versionEnemyDazeMult,
            versionBossAnomMult: ver.versionBossAnomMult,
            versionEnemyAnomMult: ver.versionEnemyAnomMult,
            nodes,
          }
        })
        .reverse()
      return { name: mode.name, versions }
    })
    writeOut(locale, "threshold-simulation", out)
  }
}

export function mergeBuhflipexplode(): void {
  console.log("Merging buhflipexplode...")

  const enDA = readRaw<RawEnDA>("en/buhflipexplode/deadly-assault.json")
  const enBuffs = readRaw<RawEnBuffs>("en/buhflipexplode/buffs.json")
  const zhDA = readRaw<RawZhDAEntry[]>("zh-CN/mihoyo-wiki/deadly-assault.json")
  const sdJson = readRaw<SDVersionsJson>("en/buhflipexplode/shiyu-defense.json")
  const tsJson = readRaw<TSVersionsJson>(
    "en/buhflipexplode/threshold-simulation.json",
  )
  const enemyDB = readRaw<BuhflipEnemyDB>("en/buhflipexplode/enemies.json")
  const xlsxEnemies = readXlsx<XlsxEnemy[]>("enemy-stat.json")

  const periodMap = buildPeriodMap(enDA)
  const buffNameMap = buildBuffNameMap(enDA, enBuffs, zhDA, periodMap)
  const daZhMap = buildDABossZhMap(enDA, zhDA, periodMap)
  const xlsxZhMap = buildXlsxZhMap(xlsxEnemies)

  writeI18n("da-version-period.json", periodMap)
  writeI18n(
    "buff-names.zh-CN.json",
    Object.fromEntries(
      Object.entries(buffNameMap).map(([k, v]) => [
        k,
        { name: v.name, iconUrl: v.iconUrl },
      ]),
    ),
  )

  mergeBuffs(enBuffs, buffNameMap)
  mergeDeadlyAssault(
    enDA,
    enBuffs,
    zhDA,
    periodMap,
    buffNameMap,
    enemyDB,
    daZhMap,
  )
  mergeShiyuDefense(sdJson, enemyDB, daZhMap, xlsxZhMap)
  mergeThresholdSimulation(tsJson, enemyDB, daZhMap, xlsxZhMap)
}

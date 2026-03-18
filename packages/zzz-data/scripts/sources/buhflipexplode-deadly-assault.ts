const DEADLY_ASSAULT_SCORE_20K_RATIO = 0.281083138
const DEADLY_ASSAULT_HP_FACTOR = (8.74 * 24795) / 10000
const DEADLY_ASSAULT_DEF_FACTOR = 1588 / 100
const DEADLY_ASSAULT_DAZE_FACTOR = 2.35
const DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT = 32
const DEADLY_ASSAULT_BETA_VERSION_INDEX = 33
const DEADLY_ASSAULT_POMPEY_PERF_OVERRIDE_VERSION_INDEX = 6
const SPECIAL_DAZE_PENALTY_ENEMY_ID = "24300"

const ELEMENTS = ["ice", "fire", "electric", "ether", "physical"] as const
const ANOMALY_ELEMENT_FACTORS = [1, 1, 1, 1, 1.2] as const

const POMPEY_PERF_OVERRIDE =
  "• Successfully triggering <span style='font-weight:bold;'>Perfect Assist</span> grants <span style='color:#ffaf2c;font-weight:bold;'>300 Performance Points</span>. A maximum of 5000 Performance Points can be obtained."

export const DEADLY_ASSAULT_PAGE_DATA_TASK_NAME =
  "en/buhflipexplode/deadly-assault-page-data"

type ElementName = (typeof ELEMENTS)[number]

interface DeadlyAssaultVersionEnemy {
  id: string
  type: number
  mult: number
}

interface DeadlyAssaultVersionRecord {
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  buffNames: string[]
  versionEnemies: DeadlyAssaultVersionEnemy[]
}

interface EnemyRecord {
  name: string
  baseHP: number[]
  baseDEF: number
  baseDaze: number[]
  stunMult: number
  stunTime: number
  baseAnom: number
  image: string
  elementMult: number[]
  tags: string[]
  mods: string[]
  desc?: string[]
  perf?: string[]
  misc?: string
  spoilerDesc?: string
  spoilerPerf?: string
}

interface AltHpAdjustment {
  key: "ucc" | "hunter" | "miasma" | "shutdown" | "convert"
  label: string
  rate: number
  triggerCount: number
  note?: string
}

interface DeadlyAssaultPageSide {
  side: number
  enemyId: string
  enemyType: number
  hpMultiplier: number
  dazeMultiplier: number
  anomalyMultiplier: number
  isSpoilerHidden: boolean
  sourceName: string
  displayName: string
  sourceImage: string
  displayImage: string
  rawHp: number
  altHp: number
  altHpExact: number
  altHpAdjustments: AltHpAdjustment[]
  defense: number
  maxDaze: number
  stunDamageMultiplier: number
  stunTime: number
  maxAnomalyBuildup: Record<ElementName, number> | null
  weaknesses: ElementName[]
  resistances: ElementName[]
  immunities: string[]
  tags: string[]
  mods: string[]
  description: string
  performance: string
  misc: string
}

interface DeadlyAssaultBossHpEntry {
  versionKey: string
  versionIndex: number
  versionName: string
  rawHp: number
  altHp: number
}

interface DeadlyAssaultPageVersion {
  versionIndex: number
  pageId: string
  isLive: boolean
  isBeta: boolean
  hasLeaks: boolean
  versionName: string
  versionTime: string
  versionDazeMult: number
  versionAnomMult: number
  buffs: Array<{
    name: string
    description: string
  }>
  totalHp: {
    raw: {
      score20000: number
      score60000: number
    }
    alt: {
      score20000: number
      score60000: number
    }
  }
  sides: DeadlyAssaultPageSide[]
}

interface DeadlyAssaultPageData {
  metadata: {
    source: "buhflipexplode"
    page: "deadly-assault"
    sourceUrls: {
      versions: string
      enemies: string
      buffs: string
    }
    rulesSource: string
    noLeaksVersionCount: number
    betaVersionIndex: number
    defaultLeaksEnabled: false
    defaultSpoilersEnabled: false
  }
  versionOrder: string[]
  versions: Record<string, DeadlyAssaultPageVersion>
  bossHpByEnemyId: Record<string, DeadlyAssaultBossHpEntry[]>
}

function assertNumber(value: number | undefined, message: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(message)
  }
  return value
}

function getPageId(versionIndex: number, isBeta: boolean): string {
  return `690${versionIndex.toString().padStart(2, "0")}${isBeta ? "1" : ""}`
}

function roundTo(value: number, digits: number): number {
  return Math.round(value * 10 ** digits) / 10 ** digits
}

function calculateRawHp(baseHp: number, hpMultiplier: number): number {
  return Math.floor(DEADLY_ASSAULT_HP_FACTOR * baseHp * hpMultiplier)
}

function getAltHpAdjustments(
  enemyId: string,
  tags: string[],
  versionIndex: number,
): AltHpAdjustment[] {
  const adjustments: AltHpAdjustment[] = []

  if (tags.includes("ucc")) {
    adjustments.push({
      key: "ucc",
      label: "IMPAIRED!!",
      rate: 0.036,
      triggerCount: 3,
      note: "on legs, 3 time(s) on core",
    })
  }

  if (tags.includes("hunter")) {
    adjustments.push({
      key: "hunter",
      label: "IMPAIRED!!",
      rate: 0.01,
      triggerCount: 1,
    })
  }

  if (tags.includes("miasma")) {
    adjustments.push({
      key: "miasma",
      label: "PURIFIED!!",
      rate: enemyId === "25300" ? 0.045 : versionIndex >= 19 ? 0.025 : 0.03,
      triggerCount: enemyId === "25300" ? 3 : 1,
    })
  }

  if (tags.includes("shutdown")) {
    adjustments.push({
      key: "shutdown",
      label: "SHUTDOWN!!",
      rate: enemyId === "27300" ? 0.025 : enemyId === "26300" ? 0.04 : 0.015,
      triggerCount: enemyId === "26300" ? 2 : 1,
    })
  }

  if (tags.includes("convert")) {
    adjustments.push({
      key: "convert",
      label: "CONVERT!!",
      rate: 0.04,
      triggerCount: 1,
    })
  }

  return adjustments
}

function calculateAltHp(rawHp: number, adjustments: AltHpAdjustment[]): number {
  return adjustments.reduce(
    (value, adjustment) => value - rawHp * adjustment.rate,
    rawHp,
  )
}

function getDisplayDescription(enemy: EnemyRecord, enemyType: number): string {
  if (enemy.tags.includes("spoiler")) {
    return enemy.spoilerDesc ?? enemy.desc?.[enemyType] ?? ""
  }

  return enemy.desc?.[enemyType] ?? ""
}

function getDisplayPerformance(
  enemy: EnemyRecord,
  enemyId: string,
  enemyType: number,
  versionIndex: number,
): string {
  if (
    enemyId === "14301" &&
    versionIndex === DEADLY_ASSAULT_POMPEY_PERF_OVERRIDE_VERSION_INDEX
  ) {
    return POMPEY_PERF_OVERRIDE
  }

  if (enemy.tags.includes("spoiler")) {
    return enemy.spoilerPerf ?? enemy.perf?.[enemyType] ?? ""
  }

  return enemy.perf?.[enemyType] ?? ""
}

function getDisplayMisc(
  enemy: EnemyRecord,
  enemyId: string,
  versionIndex: number,
): string {
  if (enemyId.startsWith("2") || (enemyId === "14303" && versionIndex >= 4)) {
    return enemy.misc ?? ""
  }

  return ""
}

function getImmunities(mods: string[]): string[] {
  const immunities: string[] = []

  if (mods.includes("no-anom")) {
    immunities.push("anomaly")
  }

  if (mods.includes("no-freeze")) {
    immunities.push("freeze")
  }

  return immunities
}

function buildSide(
  side: number,
  versionEnemy: DeadlyAssaultVersionEnemy,
  version: DeadlyAssaultVersionRecord,
  versionIndex: number,
  enemy: EnemyRecord,
): DeadlyAssaultPageSide {
  const baseHp = assertNumber(
    enemy.baseHP[versionEnemy.type],
    `enemy ${versionEnemy.id} missing baseHP for type ${versionEnemy.type}`,
  )
  const baseDaze = assertNumber(
    enemy.baseDaze[versionEnemy.type],
    `enemy ${versionEnemy.id} missing baseDaze for type ${versionEnemy.type}`,
  )

  const rawHp = calculateRawHp(baseHp, versionEnemy.mult)
  const altHpAdjustments = getAltHpAdjustments(
    versionEnemy.id,
    enemy.tags,
    versionIndex,
  )
  const altHpExact = calculateAltHp(rawHp, altHpAdjustments)
  const displayImage = enemy.tags.includes("spoiler")
    ? "doppelganger-i"
    : enemy.image
  const anomalyBase = (version.versionAnomMult / 100) * enemy.baseAnom

  const maxAnomalyBuildup = enemy.mods.includes("no-anom")
    ? null
    : (Object.fromEntries(
        ELEMENTS.map((element, index) => [
          element,
          roundTo(
            anomalyBase *
              ANOMALY_ELEMENT_FACTORS[index] *
              (1 / (2 - enemy.elementMult[index])),
            2,
          ),
        ]),
      ) as Record<ElementName, number>)

  return {
    side,
    enemyId: versionEnemy.id,
    enemyType: versionEnemy.type,
    hpMultiplier: versionEnemy.mult,
    dazeMultiplier: version.versionDazeMult,
    anomalyMultiplier: version.versionAnomMult,
    isSpoilerHidden: enemy.tags.includes("spoiler"),
    sourceName: enemy.name,
    displayName: enemy.tags.includes("spoiler") ? "SPOILER BOSS" : enemy.name,
    sourceImage: enemy.image,
    displayImage,
    rawHp,
    altHp: Math.ceil(altHpExact),
    altHpExact,
    altHpAdjustments,
    defense: Math.ceil(DEADLY_ASSAULT_DEF_FACTOR * enemy.baseDEF),
    maxDaze: roundTo(
      DEADLY_ASSAULT_DAZE_FACTOR *
        baseDaze *
        (versionEnemy.id === SPECIAL_DAZE_PENALTY_ENEMY_ID ? 0.8 : 1),
      4,
    ),
    stunDamageMultiplier: enemy.stunMult,
    stunTime: enemy.stunTime,
    maxAnomalyBuildup,
    weaknesses: ELEMENTS.filter((_, index) => enemy.elementMult[index] < 1),
    resistances: ELEMENTS.filter((_, index) => enemy.elementMult[index] > 1),
    immunities: getImmunities(enemy.mods),
    tags: enemy.tags,
    mods: enemy.mods,
    description: getDisplayDescription(enemy, versionEnemy.type),
    performance: getDisplayPerformance(
      enemy,
      versionEnemy.id,
      versionEnemy.type,
      versionIndex,
    ),
    misc: getDisplayMisc(enemy, versionEnemy.id, versionIndex),
  }
}

export function buildDeadlyAssaultPageData(
  versionData: Record<string, DeadlyAssaultVersionRecord>,
  enemyData: Record<string, EnemyRecord>,
  buffData: Record<string, string>,
): DeadlyAssaultPageData {
  const versionOrder = Object.keys(versionData)
  const versions: Record<string, DeadlyAssaultPageVersion> = {}
  const bossHpByEnemyId: Record<string, DeadlyAssaultBossHpEntry[]> = {}

  versionOrder.forEach((versionKey, index) => {
    const version = versionData[versionKey]
    const versionIndex = index + 1
    const isBeta = versionIndex >= DEADLY_ASSAULT_BETA_VERSION_INDEX
    const sides = version.versionEnemies.map((versionEnemy, sideIndex) => {
      const enemy = enemyData[versionEnemy.id]

      if (!enemy) {
        throw new Error(`missing enemy ${versionEnemy.id} for ${versionKey}`)
      }

      const side = buildSide(
        sideIndex + 1,
        versionEnemy,
        version,
        versionIndex,
        enemy,
      )

      if (!bossHpByEnemyId[versionEnemy.id]) {
        bossHpByEnemyId[versionEnemy.id] = []
      }

      bossHpByEnemyId[versionEnemy.id].push({
        versionKey,
        versionIndex,
        versionName: version.versionName,
        rawHp: side.rawHp,
        altHp: side.altHp,
      })

      return side
    })

    const rawHpTotal = sides.reduce((total, side) => total + side.rawHp, 0)
    const altHpTotalExact = sides.reduce(
      (total, side) => total + side.altHpExact,
      0,
    )

    versions[versionKey] = {
      versionIndex,
      pageId: getPageId(versionIndex, isBeta),
      isLive: versionIndex === DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT,
      isBeta,
      hasLeaks: versionIndex > DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT,
      versionName: version.versionName,
      versionTime: version.versionTime,
      versionDazeMult: version.versionDazeMult,
      versionAnomMult: version.versionAnomMult,
      buffs: version.buffNames.map((name) => ({
        name,
        description: buffData[name] ?? "",
      })),
      totalHp: {
        raw: {
          score20000: Math.ceil(DEADLY_ASSAULT_SCORE_20K_RATIO * rawHpTotal),
          score60000: Math.ceil(rawHpTotal),
        },
        alt: {
          score20000: Math.ceil(
            DEADLY_ASSAULT_SCORE_20K_RATIO * altHpTotalExact,
          ),
          score60000: Math.ceil(altHpTotalExact),
        },
      },
      sides,
    }
  })

  return {
    metadata: {
      source: "buhflipexplode",
      page: "deadly-assault",
      sourceUrls: {
        versions: "https://www.buhflipexplode.org/zzz/da/da-versions.json",
        enemies: "https://www.buhflipexplode.org/assets/zzz/enemies.json",
        buffs: "https://www.buhflipexplode.org/assets/zzz/buffs.json",
      },
      rulesSource: "https://www.buhflipexplode.org/zzz/da/da.js",
      noLeaksVersionCount: DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT,
      betaVersionIndex: DEADLY_ASSAULT_BETA_VERSION_INDEX,
      defaultLeaksEnabled: false,
      defaultSpoilersEnabled: false,
    },
    versionOrder,
    versions,
    bossHpByEnemyId,
  }
}

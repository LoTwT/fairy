import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../../data")
const SOURCE_DIR = path.join(DATA_DIR, "source")
const OUTPUT_DIR = path.join(DATA_DIR, "enemy")

const ELEMENT_KEYS = ["ice", "fire", "electric", "ether", "physical"] as const
const PROFILE_LOCALES = ["en", "zh-CN"] as const

type Locale = (typeof PROFILE_LOCALES)[number]
type ElementKey = (typeof ELEMENT_KEYS)[number]
type EnemyId = string
type EnemyType = 0 | 1

interface MihoyoWikiAppearanceRef {
  versionId: string
  side: 1 | 2 | 3
}

type EnemySourceRef =
  | { source: "buhflipexplode"; enemyId: string }
  | { source: "mihoyo-wiki"; appearances: MihoyoWikiAppearanceRef[] }

interface AltHpAdjustment {
  key: "ucc" | "hunter" | "miasma" | "shutdown" | "convert"
  label: string
  rate: number
  triggerCount: number
  note?: string
}

interface BuhflipexplodeEnemyRecord {
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
}

interface DeadlyAssaultPageSide {
  side: 1 | 2 | 3
  enemyId: string
  enemyType: number
  hpMultiplier: number
  dazeMultiplier: number
  anomalyMultiplier: number
  rawHp: number
  altHp: number
  altHpAdjustments: AltHpAdjustment[]
  defense: number
  maxDaze: number
  maxAnomalyBuildup: Record<ElementKey, number> | null
  description: string
  performance: string
  misc: string
}

interface DeadlyAssaultPageVersion {
  versionIndex: number
  versionName: string
  versionTime: string
  sides: DeadlyAssaultPageSide[]
}

interface DeadlyAssaultPageData {
  versionOrder: string[]
  versions: Record<string, DeadlyAssaultPageVersion>
  bossHpByEnemyId: Record<string, unknown[]>
}

interface MihoyoWikiBossRecord {
  name: string
  weaknesses: string[]
  resistances: string[]
  mechanics: string
}

interface MihoyoWikiVersionRecord {
  id: string
  title: string
  period: number
  bosses: MihoyoWikiBossRecord[]
}

interface EnemyIndexEntry {
  id: EnemyId
  slug: string
  names: Partial<Record<Locale, string>>
  imageKey?: string
  tags: string[]
  locales: Locale[]
  modes: ["deadly-assault"]
  sourceRefs: EnemySourceRef[]
}

interface EnemyProfileAppearance {
  version: string
  versionName: string
  versionTime: string
  side: 1 | 2 | 3
  description?: string
  performance?: string
  misc?: string
}

interface EnemyProfileFile {
  id: EnemyId
  locale: Locale
  name: string
  aliases: string[]
  imageKey?: string
  tags: string[]
  summary?: string
  modes: {
    deadlyAssault: {
      appearances: EnemyProfileAppearance[]
    }
  }
}

interface EnemyBaseTypeStats {
  enemyType: EnemyType
  baseHp: number
  baseDaze: number
}

interface EnemyMechanicsAppearance {
  version: string
  versionName: string
  versionTime: string
  side: 1 | 2 | 3
  enemyType: EnemyType
  hpMultiplierPercent: number
  dazeMultiplierPercent: number
  anomalyMultiplierPercent: number
  rawHp: number
  altHp: number
  altHpAdjustments: AltHpAdjustment[]
  defense: number
  maxDaze: number
  maxAnomalyBuildup: Record<ElementKey, number> | null
}

interface EnemyMechanicsFile {
  id: EnemyId
  base: {
    typeStats: EnemyBaseTypeStats[]
    baseDefense: number
    stunDamageMultiplierPercent: number
    stunDurationSeconds: number
    anomalyBaseBuildup: number
    resistanceByElement: Record<ElementKey, number>
    immunities: Array<"anomaly" | "freeze">
  }
  trace?: {
    buhflipexplode?: {
      tags: string[]
      mods: string[]
    }
  }
  modes: {
    deadlyAssault: {
      history: EnemyMechanicsAppearance[]
    }
  }
}

interface EnemyAppearanceContext {
  enemyId: EnemyId
  version: string
  versionIndex: number
  versionName: string
  versionTime: string
  side: DeadlyAssaultPageSide
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`generate enemy failed: ${message}`)
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
  console.log(`  → ${filePath}`)
}

function createStageDir(): string {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  return fs.mkdtempSync(path.join(DATA_DIR, ".generate-stage-"))
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function makeOptionalText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const normalized = normalizeWhitespace(value)
  return normalized.length > 0 ? normalized : undefined
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildResistanceByElement(
  elementMult: number[],
): Record<ElementKey, number> {
  return Object.fromEntries(
    ELEMENT_KEYS.map((element, index) => [
      element,
      Number((elementMult[index] - 1).toFixed(4)),
    ]),
  ) as Record<ElementKey, number>
}

function getImmunities(mods: string[]): Array<"anomaly" | "freeze"> {
  const immunities: Array<"anomaly" | "freeze"> = []

  if (mods.includes("no-anom")) {
    immunities.push("anomaly")
  }

  if (mods.includes("no-freeze")) {
    immunities.push("freeze")
  }

  return immunities
}

function selectPrimaryName(names: string[]): string {
  assert(names.length > 0, "expected at least one localized name")

  const counts = new Map<string, number>()
  names.forEach((name) => {
    const normalized = normalizeWhitespace(name)
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  })

  let primary = normalizeWhitespace(names[0])
  let bestCount = counts.get(primary) ?? 0
  let bestLastIndex = names.lastIndexOf(primary)

  counts.forEach((count, name) => {
    const lastIndex = names.lastIndexOf(name)

    if (
      count > bestCount ||
      (count === bestCount && lastIndex > bestLastIndex)
    ) {
      primary = name
      bestCount = count
      bestLastIndex = lastIndex
    }
  })

  return primary
}

function getAliases(primary: string, names: string[]): string[] {
  return [...new Set(names.map(normalizeWhitespace))].filter(
    (name) => name !== primary,
  )
}

function getSummary(appearances: EnemyProfileAppearance[]): string | undefined {
  const latest = [...appearances]
    .reverse()
    .find((appearance) => appearance.description)

  return latest?.description
}

function buildAppearanceContexts(
  pageData: DeadlyAssaultPageData,
): Map<EnemyId, EnemyAppearanceContext[]> {
  const appearancesByEnemyId = new Map<EnemyId, EnemyAppearanceContext[]>()

  pageData.versionOrder.forEach((versionKey, index) => {
    const version = pageData.versions[versionKey]
    const versionIndex = index + 1

    version.sides.forEach((side) => {
      const appearances = appearancesByEnemyId.get(side.enemyId) ?? []

      appearances.push({
        enemyId: side.enemyId,
        version: versionKey,
        versionIndex,
        versionName: version.versionName,
        versionTime: version.versionTime,
        side,
      })

      appearancesByEnemyId.set(side.enemyId, appearances)
    })
  })

  return appearancesByEnemyId
}

function buildWikiPeriodMap(
  wikiVersions: MihoyoWikiVersionRecord[],
  expectedPeriodCount: number,
): Map<number, MihoyoWikiVersionRecord> {
  const byPeriod = new Map(
    wikiVersions.map((version) => [version.period, version]),
  )

  for (let period = 1; period <= expectedPeriodCount; period += 1) {
    assert(
      byPeriod.has(period),
      `missing mihoyo-wiki deadly assault period ${period}`,
    )
  }

  return byPeriod
}

function getWikiBossRecord(
  byPeriod: Map<number, MihoyoWikiVersionRecord>,
  appearance: EnemyAppearanceContext,
): { wikiVersionId: string; boss: MihoyoWikiBossRecord } {
  const wikiVersion = byPeriod.get(appearance.versionIndex)
  assert(
    wikiVersion,
    `missing mihoyo-wiki period ${appearance.versionIndex} for ${appearance.enemyId}`,
  )

  const boss = wikiVersion.bosses[appearance.side.side - 1]
  assert(
    boss,
    `missing mihoyo-wiki boss for period ${appearance.versionIndex} side ${appearance.side.side}`,
  )

  return {
    wikiVersionId: wikiVersion.id,
    boss,
  }
}

function generateEnemyData(): void {
  const pageData = readJson<DeadlyAssaultPageData>(
    path.join(SOURCE_DIR, "buhflipexplode/en/deadly-assault-page-data.json"),
  )
  const enemySource = readJson<Record<EnemyId, BuhflipexplodeEnemyRecord>>(
    path.join(SOURCE_DIR, "buhflipexplode/en/enemies.json"),
  )
  const wikiVersions = readJson<MihoyoWikiVersionRecord[]>(
    path.join(SOURCE_DIR, "mihoyo-wiki/zh-CN/deadly-assault.json"),
  )

  const appearancesByEnemyId = buildAppearanceContexts(pageData)
  const wikiByPeriod = buildWikiPeriodMap(
    wikiVersions,
    pageData.versionOrder.length,
  )
  const enemyIds = Object.keys(pageData.bossHpByEnemyId).sort()

  const index: Record<EnemyId, EnemyIndexEntry> = {}
  const profilesByLocale = new Map<Locale, Record<EnemyId, EnemyProfileFile>>(
    PROFILE_LOCALES.map((locale) => [locale, {}]),
  )
  const mechanics: Record<EnemyId, EnemyMechanicsFile> = {}

  enemyIds.forEach((enemyId) => {
    const enemy = enemySource[enemyId]
    const appearances = appearancesByEnemyId.get(enemyId) ?? []

    assert(enemy, `missing buhflipexplode enemy ${enemyId}`)
    assert(appearances.length > 0, `missing appearances for enemy ${enemyId}`)

    const profileEnAppearances: EnemyProfileAppearance[] = appearances.map(
      (appearance) => ({
        version: appearance.version,
        versionName: appearance.versionName,
        versionTime: appearance.versionTime,
        side: appearance.side.side,
        description: makeOptionalText(appearance.side.description),
        performance: makeOptionalText(appearance.side.performance),
        misc: makeOptionalText(appearance.side.misc),
      }),
    )

    const zhNames: string[] = []
    const wikiAppearances: MihoyoWikiAppearanceRef[] = []
    const seenWikiAppearanceKeys = new Set<string>()
    const profileZhAppearances: EnemyProfileAppearance[] = appearances.map(
      (appearance) => {
        const { wikiVersionId, boss } = getWikiBossRecord(
          wikiByPeriod,
          appearance,
        )
        const wikiAppearanceKey = `${wikiVersionId}:${appearance.side.side}`
        if (!seenWikiAppearanceKeys.has(wikiAppearanceKey)) {
          seenWikiAppearanceKeys.add(wikiAppearanceKey)
          wikiAppearances.push({
            versionId: wikiVersionId,
            side: appearance.side.side,
          })
        }
        zhNames.push(boss.name)

        return {
          version: appearance.version,
          versionName: appearance.versionName,
          versionTime: appearance.versionTime,
          side: appearance.side.side,
          description: makeOptionalText(boss.mechanics),
        }
      },
    )

    const primaryEnName = selectPrimaryName([enemy.name])
    const primaryZhName = selectPrimaryName(zhNames)

    profilesByLocale.get("en")![enemyId] = {
      id: enemyId,
      locale: "en",
      name: primaryEnName,
      aliases: getAliases(primaryEnName, [enemy.name]),
      imageKey: enemy.image,
      tags: enemy.tags,
      summary: getSummary(profileEnAppearances),
      modes: {
        deadlyAssault: {
          appearances: profileEnAppearances,
        },
      },
    }

    profilesByLocale.get("zh-CN")![enemyId] = {
      id: enemyId,
      locale: "zh-CN",
      name: primaryZhName,
      aliases: getAliases(primaryZhName, zhNames),
      imageKey: enemy.image,
      tags: enemy.tags,
      summary: getSummary(profileZhAppearances),
      modes: {
        deadlyAssault: {
          appearances: profileZhAppearances,
        },
      },
    }

    const resistanceByElement = buildResistanceByElement(enemy.elementMult)

    mechanics[enemyId] = {
      id: enemyId,
      base: {
        typeStats: enemy.baseHP.map((baseHp, index) => ({
          enemyType: index as EnemyType,
          baseHp,
          baseDaze: enemy.baseDaze[index] ?? 0,
        })),
        baseDefense: enemy.baseDEF,
        stunDamageMultiplierPercent: enemy.stunMult,
        stunDurationSeconds: enemy.stunTime,
        anomalyBaseBuildup: enemy.baseAnom,
        resistanceByElement,
        immunities: getImmunities(enemy.mods),
      },
      trace: {
        buhflipexplode: {
          tags: enemy.tags,
          mods: enemy.mods,
        },
      },
      modes: {
        deadlyAssault: {
          history: appearances.map((appearance) => ({
            version: appearance.version,
            versionName: appearance.versionName,
            versionTime: appearance.versionTime,
            side: appearance.side.side,
            enemyType: appearance.side.enemyType as EnemyType,
            hpMultiplierPercent: appearance.side.hpMultiplier,
            dazeMultiplierPercent: appearance.side.dazeMultiplier,
            anomalyMultiplierPercent: appearance.side.anomalyMultiplier,
            rawHp: appearance.side.rawHp,
            altHp: appearance.side.altHp,
            altHpAdjustments: appearance.side.altHpAdjustments,
            defense: appearance.side.defense,
            maxDaze: appearance.side.maxDaze,
            maxAnomalyBuildup: appearance.side.maxAnomalyBuildup,
          })),
        },
      },
    }

    index[enemyId] = {
      id: enemyId,
      slug: slugify(primaryEnName),
      names: {
        "en": primaryEnName,
        "zh-CN": primaryZhName,
      },
      imageKey: enemy.image,
      tags: enemy.tags,
      locales: [...PROFILE_LOCALES],
      modes: ["deadly-assault"],
      sourceRefs: [
        { source: "buhflipexplode", enemyId },
        { source: "mihoyo-wiki", appearances: wikiAppearances },
      ],
    }
  })

  const stageDir = createStageDir()

  try {
    const stageEnemyDir = path.join(stageDir, "enemy")
    writeJson(path.join(stageEnemyDir, "index.json"), index)

    PROFILE_LOCALES.forEach((locale) => {
      const profiles = profilesByLocale.get(locale)!

      Object.entries(profiles).forEach(([enemyId, profile]) => {
        writeJson(
          path.join(stageEnemyDir, "profile", locale, `${enemyId}.json`),
          profile,
        )
      })
    })

    Object.entries(mechanics).forEach(([enemyId, data]) => {
      writeJson(path.join(stageEnemyDir, "mechanics", `${enemyId}.json`), data)
    })

    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(OUTPUT_DIR), { recursive: true })
    fs.renameSync(stageEnemyDir, OUTPUT_DIR)
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true })
  }
}

generateEnemyData()

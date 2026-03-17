import type { CrawlTask } from "./shared.js"

const BASE_URL = "https://www.buhflipexplode.org"

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`buhflipexplode schema mismatch: ${message}`)
  }
}

function parseJson(url: string, html: string): unknown {
  try {
    return JSON.parse(html)
  } catch (error) {
    throw new Error(`parse ${url} failed`, { cause: error })
  }
}

function assertVersionRecord(value: unknown, source: string): void {
  assert(isRecord(value), `${source} expected object`)
  assert(
    typeof value.versionName === "string",
    `${source}.versionName expected string`,
  )
  assert(
    typeof value.versionTime === "string",
    `${source}.versionTime expected string`,
  )
  assert(
    isRecord(value.versionEnemies),
    `${source}.versionEnemies expected object`,
  )
}

function assertVersionList(data: unknown, source: string): void {
  assert(Array.isArray(data), `${source} expected array`)
  assert(data.length > 0, `${source} expected non-empty array`)

  data.forEach((item, index) => {
    assert(isRecord(item), `${source}[${index}] expected object`)
    assert(
      typeof item.name === "string",
      `${source}[${index}].name expected string`,
    )
    assert(
      isRecord(item.versions),
      `${source}[${index}].versions expected object`,
    )
    assert(
      Object.keys(item.versions).length > 0,
      `${source}[${index}].versions expected non-empty object`,
    )

    Object.entries(item.versions).forEach(([versionKey, version]) => {
      assertVersionRecord(version, `${source}[${index}].versions.${versionKey}`)
    })
  })
}

function assertDeadlyAssaultMap(data: unknown, source: string): void {
  assert(isRecord(data), `${source} expected object`)
  assert(Object.keys(data).length > 0, `${source} expected non-empty object`)

  Object.entries(data).forEach(([versionKey, version]) => {
    assert(isRecord(version), `${source}.${versionKey} expected object`)
    assert(
      typeof version.versionName === "string",
      `${source}.${versionKey}.versionName expected string`,
    )
    assert(
      typeof version.versionTime === "string",
      `${source}.${versionKey}.versionTime expected string`,
    )
    assert(
      Array.isArray(version.buffNames),
      `${source}.${versionKey}.buffNames expected array`,
    )
    assert(
      Array.isArray(version.versionEnemies),
      `${source}.${versionKey}.versionEnemies expected array`,
    )
  })
}

function assertEnemyMap(data: unknown, source: string): void {
  assert(isRecord(data), `${source} expected object`)
  assert(Object.keys(data).length > 0, `${source} expected non-empty object`)

  Object.entries(data).forEach(([enemyId, enemy]) => {
    assert(isRecord(enemy), `${source}.${enemyId} expected object`)
    assert(
      typeof enemy.name === "string",
      `${source}.${enemyId}.name expected string`,
    )
    assert(
      Array.isArray(enemy.baseHP),
      `${source}.${enemyId}.baseHP expected array`,
    )
    assert(
      typeof enemy.baseDEF === "number",
      `${source}.${enemyId}.baseDEF expected number`,
    )
    assert(
      Array.isArray(enemy.elementMult),
      `${source}.${enemyId}.elementMult expected array`,
    )
    assert(
      typeof enemy.image === "string",
      `${source}.${enemyId}.image expected string`,
    )
  })
}

function assertBuffMap(data: unknown, source: string): void {
  assert(isRecord(data), `${source} expected object`)
  assert(Object.keys(data).length > 0, `${source} expected non-empty object`)

  Object.entries(data).forEach(([buffName, description]) => {
    assert(
      typeof description === "string",
      `${source}.${buffName} expected string`,
    )
  })
}

function createJsonTask(
  name: string,
  url: string,
  assertPayload: (data: unknown, source: string) => void,
): CrawlTask {
  return {
    name,
    url,
    extract: (_, html) => {
      const data = parseJson(url, html)
      assertPayload(data, name)
      return data
    },
  }
}

export const tasks: CrawlTask[] = [
  createJsonTask(
    "en/buhflipexplode/shiyu-defense",
    `${BASE_URL}/zzz/sd/sd-versions.json`,
    assertVersionList,
  ),
  createJsonTask(
    "en/buhflipexplode/deadly-assault",
    `${BASE_URL}/zzz/da/da-versions.json`,
    assertDeadlyAssaultMap,
  ),
  createJsonTask(
    "en/buhflipexplode/threshold-simulation",
    `${BASE_URL}/zzz/ts/ts-versions.json`,
    assertVersionList,
  ),
  createJsonTask(
    "en/buhflipexplode/enemies",
    `${BASE_URL}/assets/zzz/enemies.json`,
    assertEnemyMap,
  ),
  createJsonTask(
    "en/buhflipexplode/buffs",
    `${BASE_URL}/assets/zzz/buffs.json`,
    assertBuffMap,
  ),
]

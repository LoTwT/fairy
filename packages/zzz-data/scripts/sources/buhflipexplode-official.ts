export const DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT = 32
export const DEADLY_ASSAULT_BETA_VERSION_INDEX = 33
export const SHIYU_DEFENSE_CRITICAL_NO_LEAKS_VERSION_COUNT = 43
export const SHIYU_DEFENSE_BETA_VERSION_INDEX = 45
export const THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT = 2
export const THRESHOLD_SIMULATION_BETA_VERSION_INDEX = 3

type JsonRecord = Record<string, unknown>

interface DeadlyAssaultVersionEnemy {
  id: string
}

interface DeadlyAssaultVersionRecord {
  buffNames: string[]
  versionEnemies: DeadlyAssaultVersionEnemy[]
}

interface VersionEnemyRef {
  id: string
}

interface ModeVersionRecord {
  versionEnemies: JsonRecord
  [key: string]: unknown
}

interface ModeVersionListItem {
  name: string
  versions: Record<string, ModeVersionRecord>
}

type ModeVersionList = ModeVersionListItem[]

type EnemyMap = Record<string, unknown>
type BuffMap = Record<string, string>

export interface BuhflipexplodeSourceData {
  shiyuDefense: ModeVersionList
  deadlyAssault: Record<string, DeadlyAssaultVersionRecord>
  thresholdSimulation: ModeVersionList
  enemies: EnemyMap
  buffs: BuffMap
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isVersionEnemyRef(value: unknown): value is VersionEnemyRef {
  return isRecord(value) && typeof value.id === "string"
}

function takeLeadingEntries<T>(
  record: Record<string, T>,
  count: number,
): Record<string, T> {
  return Object.fromEntries(Object.entries(record).slice(0, count))
}

function filterShiyuDefenseVersions(data: ModeVersionList): ModeVersionList {
  return data.map((item) =>
    item.name === "Critical Node"
      ? {
          ...item,
          versions: takeLeadingEntries(
            item.versions,
            SHIYU_DEFENSE_CRITICAL_NO_LEAKS_VERSION_COUNT,
          ),
        }
      : item,
  )
}

function filterDeadlyAssaultVersions(
  data: Record<string, DeadlyAssaultVersionRecord>,
): Record<string, DeadlyAssaultVersionRecord> {
  return takeLeadingEntries(data, DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT)
}

function filterThresholdSimulationVersions(
  data: ModeVersionList,
): ModeVersionList {
  return data.map((item) =>
    item.name === "Hard Mode"
      ? {
          ...item,
          versions: takeLeadingEntries(
            item.versions,
            THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT,
          ),
        }
      : item,
  )
}

function collectReferencedKeys(
  value: unknown,
  enemyIds: Set<string>,
  buffNames: Set<string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      collectReferencedKeys(entry, enemyIds, buffNames)
    })
    return
  }

  if (!isRecord(value)) {
    return
  }

  if (isVersionEnemyRef(value)) {
    enemyIds.add(value.id)
  }

  if (typeof value.buffName === "string") {
    buffNames.add(value.buffName)
  }

  if (Array.isArray(value.buffNames)) {
    value.buffNames.forEach((name) => {
      if (typeof name === "string") {
        buffNames.add(name)
      }
    })
  }

  Object.values(value).forEach((entry) => {
    collectReferencedKeys(entry, enemyIds, buffNames)
  })
}

function filterMapByKeys<T>(
  map: Record<string, T>,
  allowedKeys: Set<string>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(map).filter(([key]) => allowedKeys.has(key)),
  )
}

export function filterBuhflipexplodeOfficialData(
  data: BuhflipexplodeSourceData,
): BuhflipexplodeSourceData {
  const shiyuDefense = filterShiyuDefenseVersions(data.shiyuDefense)
  const deadlyAssault = filterDeadlyAssaultVersions(data.deadlyAssault)
  const thresholdSimulation = filterThresholdSimulationVersions(
    data.thresholdSimulation,
  )

  const enemyIds = new Set<string>()
  const buffNames = new Set<string>()

  Object.values(deadlyAssault).forEach((version) => {
    version.versionEnemies.forEach((enemy) => {
      enemyIds.add(enemy.id)
    })

    version.buffNames.forEach((name) => {
      buffNames.add(name)
    })
  })

  shiyuDefense.forEach((item) => {
    Object.values(item.versions).forEach((version) => {
      collectReferencedKeys(version, enemyIds, buffNames)
    })
  })

  thresholdSimulation.forEach((item) => {
    Object.values(item.versions).forEach((version) => {
      collectReferencedKeys(version, enemyIds, buffNames)
    })
  })

  return {
    shiyuDefense,
    deadlyAssault,
    thresholdSimulation,
    enemies: filterMapByKeys(data.enemies, enemyIds),
    buffs: filterMapByKeys(data.buffs, buffNames),
  }
}

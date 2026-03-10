import type {
  DAVersionItem,
  DeadlyAssaultJson,
  SDModeItem,
  SDVersionItem,
  ShiyuDefenseJson,
  ThresholdSimulationJson,
  TSModeItem,
  TSVersionItem,
} from "../game-modes.js"
import type { VersionPeriodInfo } from "./types.js"

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s\-_]/g, "")
}

function getLeadingItem<T>(items: readonly T[]): T | undefined {
  return items[0]
}

const sdModeRanks = [
  "Stable Node",
  "Disputed Node",
  "Ambush Node",
  "Critical Node",
] as const

const tsModeRanks = ["Easy Mode", "Hard Mode"] as const

const sdModeAliases = [
  ["stable", "Stable Node"],
  ["disputed", "Disputed Node"],
  ["ambush", "Ambush Node"],
  ["critical", "Critical Node"],
] as const

const tsModeAliases = [
  ["easy", "Easy Mode"],
  ["hard", "Hard Mode"],
] as const

function findModeByName<T extends { name: string }>(
  modes: readonly T[],
  modeName: string,
): T | undefined {
  const normalizedName = normalizeKey(modeName)

  return modes.find((mode) => normalizeKey(mode.name) === normalizedName)
}

function getRankedDefaultMode<T extends { name: string }>(
  modes: readonly T[],
  ranking: readonly string[],
): T | undefined {
  const rankedModes = modes
    .map((mode) => ({
      mode,
      rank: ranking.findIndex(
        (name) => normalizeKey(name) === normalizeKey(mode.name),
      ),
    }))
    .sort((left, right) => right.rank - left.rank)

  return rankedModes[0]?.mode ?? modes[0]
}

function resolveModeName<T extends { name: string }>(
  modes: readonly T[],
  input: string | undefined,
  aliases: readonly (readonly [string, string])[],
): string | undefined {
  if (!input) return undefined

  const normalizedInput = normalizeKey(input)
  const directMatch = modes.find(
    (mode) => normalizeKey(mode.name) === normalizedInput,
  )
  if (directMatch) return directMatch.name

  for (const [key, canonical] of aliases) {
    if (
      normalizedInput === normalizeKey(key) ||
      normalizedInput === normalizeKey(canonical)
    ) {
      const aliased = modes.find(
        (mode) => normalizeKey(mode.name) === normalizeKey(canonical),
      )
      if (aliased) return aliased.name
    }
  }

  return modes.find((mode) => normalizeKey(mode.name).includes(normalizedInput))
    ?.name
}

export function analyzeVersionPeriod(versionTime: string): VersionPeriodInfo {
  const raw = versionTime.trim()
  const parts = raw.split(/\s*-\s*/).filter(Boolean)
  const [startLabel, endLabel] = parts

  return {
    raw,
    startLabel,
    endLabel,
    isRange: parts.length >= 2,
    isOngoing: endLabel?.toUpperCase() === "PRESENT",
    isPlaceholder: /xx\/xx\/20xx/i.test(raw),
  }
}

export function getLatestDAVersion(
  data: DeadlyAssaultJson,
): DAVersionItem | undefined {
  return getLeadingItem(data)
}

export function findDAVersion(
  data: DeadlyAssaultJson,
  versionKey?: string,
): DAVersionItem | undefined {
  if (!versionKey) return getLatestDAVersion(data)
  return data.find((version) => version.versionKey === versionKey)
}

export function findSDMode(
  data: ShiyuDefenseJson,
  modeName: string,
): SDModeItem | undefined {
  return findModeByName(data, modeName)
}

export function resolveSDModeName(
  data: ShiyuDefenseJson,
  modeName?: string,
): string | undefined {
  return modeName
    ? resolveModeName(data, modeName, sdModeAliases)
    : getDefaultSDMode(data)?.name
}

export function getDefaultSDMode(
  data: ShiyuDefenseJson,
): SDModeItem | undefined {
  return getRankedDefaultMode(data, sdModeRanks)
}

export function selectSDMode(
  data: ShiyuDefenseJson,
  modeName?: string,
): SDModeItem | undefined {
  const resolvedModeName = resolveSDModeName(data, modeName)
  return resolvedModeName ? findSDMode(data, resolvedModeName) : undefined
}

export function getLatestSDVersion(
  data: ShiyuDefenseJson,
  modeName: string,
): SDVersionItem | undefined {
  return getLeadingItem(selectSDMode(data, modeName)?.versions ?? [])
}

export function findSDVersion(
  data: ShiyuDefenseJson,
  options: { modeName?: string; versionKey?: string } = {},
): SDVersionItem | undefined {
  const mode = selectSDMode(data, options.modeName)
  if (!mode) return undefined
  if (!options.versionKey) return getLeadingItem(mode.versions)
  return mode.versions.find(
    (version) => version.versionKey === options.versionKey,
  )
}

export function findTSMode(
  data: ThresholdSimulationJson,
  modeName: string,
): TSModeItem | undefined {
  return findModeByName(data, modeName)
}

export function resolveTSModeName(
  data: ThresholdSimulationJson,
  modeName?: string,
): string | undefined {
  return modeName
    ? resolveModeName(data, modeName, tsModeAliases)
    : getDefaultTSMode(data)?.name
}

export function getDefaultTSMode(
  data: ThresholdSimulationJson,
): TSModeItem | undefined {
  return getRankedDefaultMode(data, tsModeRanks)
}

export function selectTSMode(
  data: ThresholdSimulationJson,
  modeName?: string,
): TSModeItem | undefined {
  const resolvedModeName = resolveTSModeName(data, modeName)
  return resolvedModeName ? findTSMode(data, resolvedModeName) : undefined
}

export function getLatestTSVersion(
  data: ThresholdSimulationJson,
  modeName: string,
): TSVersionItem | undefined {
  return getLeadingItem(selectTSMode(data, modeName)?.versions ?? [])
}

export function findTSVersion(
  data: ThresholdSimulationJson,
  options: { modeName?: string; versionKey?: string } = {},
): TSVersionItem | undefined {
  const mode = selectTSMode(data, options.modeName)
  if (!mode) return undefined
  if (!options.versionKey) return getLeadingItem(mode.versions)
  return mode.versions.find(
    (version) => version.versionKey === options.versionKey,
  )
}

export interface NanokaPromotionExtraStatRaw {
  prop?: unknown
  name?: unknown
  format?: unknown
  value?: unknown
}

export interface NanokaPromotionExtraLevelRaw {
  max_level?: unknown
  extra?: Record<string, NanokaPromotionExtraStatRaw>
}

export interface NanokaPromotionExtraSource {
  extra_level?: Record<string, NanokaPromotionExtraLevelRaw>
}

export interface NanokaPromotionExtraStat {
  phase: number
  maxLevel: number
  prop: number
  canonicalField: "maxHp" | "attack" | "critRate"
  sourceName: string
  rawValue: number
  normalizedValue: number
  unitRule: "raw" | "basis-points-to-ratio"
  sourcePath: string
}

export interface NanokaPromotionExtraStatsArtifact {
  sourceVersion: string
  agentId: number
  stats: NanokaPromotionExtraStat[]
  runtimeCutoverReady: false
}

const promotionExtraPropRules: Record<number, {
  canonicalField: NanokaPromotionExtraStat["canonicalField"]
  unitRule: NanokaPromotionExtraStat["unitRule"]
}> = {
  11101: {
    canonicalField: "maxHp",
    unitRule: "raw",
  },
  12101: {
    canonicalField: "attack",
    unitRule: "raw",
  },
  20101: {
    canonicalField: "critRate",
    unitRule: "basis-points-to-ratio",
  },
}

export function deriveNanokaPromotionExtraStats(
  source: NanokaPromotionExtraSource,
  options: {
    sourceVersion: string
    agentId: number
  },
): NanokaPromotionExtraStatsArtifact {
  const extraLevels = requiredObject(source.extra_level, "extra_level") as Record<string, NanokaPromotionExtraLevelRaw>
  const stats: NanokaPromotionExtraStat[] = []

  for (const phaseKey of sortedNumericKeys(extraLevels, "extra_level")) {
    const phaseRaw = extraLevels[phaseKey]!
    const phase = Number(phaseKey)
    const maxLevel = requiredFinite(phaseRaw.max_level, `extra_level.${phaseKey}.max_level`)
    const extras = requiredObject(phaseRaw.extra, `extra_level.${phaseKey}.extra`)

    for (const propKey of sortedNumericKeys(extras, `extra_level.${phaseKey}.extra`)) {
      const rawStat = extras[propKey] as NanokaPromotionExtraStatRaw
      const prop = requiredFinite(rawStat.prop, `extra_level.${phaseKey}.extra.${propKey}.prop`)
      if (prop !== Number(propKey))
        throw new Error(`extra_level.${phaseKey}.extra.${propKey}: prop id mismatch`)

      const rule = promotionExtraPropRules[prop]
      if (rule === undefined)
        throw new Error(`extra_level.${phaseKey}.extra.${propKey}: unmapped promotion extra prop ${prop}`)

      const rawValue = requiredFinite(rawStat.value, `extra_level.${phaseKey}.extra.${propKey}.value`)
      stats.push({
        phase,
        maxLevel,
        prop,
        canonicalField: rule.canonicalField,
        sourceName: requiredString(rawStat.name, `extra_level.${phaseKey}.extra.${propKey}.name`),
        rawValue,
        normalizedValue: normalizePromotionExtraValue(rawValue, rule.unitRule),
        unitRule: rule.unitRule,
        sourcePath: `/extra_level/${phaseKey}/extra/${propKey}`,
      })
    }
  }

  return {
    sourceVersion: options.sourceVersion,
    agentId: options.agentId,
    stats,
    runtimeCutoverReady: false,
  }
}

function normalizePromotionExtraValue(
  value: number,
  unitRule: NanokaPromotionExtraStat["unitRule"],
): number {
  if (unitRule === "basis-points-to-ratio")
    return value / 10000
  return value
}

function sortedNumericKeys(value: Record<string, unknown>, path: string): string[] {
  const keys = Object.keys(value)
  if (keys.length === 0)
    throw new Error(`Missing nanoka promotion extra entries ${path}`)
  for (const key of keys) {
    if (!/^\d+$/.test(key))
      throw new Error(`Invalid numeric key ${path}.${key}`)
  }
  return keys.sort((left, right) => Number(left) - Number(right))
}

function requiredObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Missing object nanoka promotion extra field ${path}`)
  return value as Record<string, unknown>
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Missing text nanoka promotion extra field ${path}`)
  return value
}

function requiredFinite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing numeric nanoka promotion extra field ${path}`)
  return value
}

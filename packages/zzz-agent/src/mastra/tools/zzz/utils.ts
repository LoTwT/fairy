import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"

const _require = createRequire(import.meta.url)

let zzzDataRoot: string
try {
  const mainEntry = _require.resolve("zzz-data")
  // mainEntry => /path/to/packages/zzz-data/dist/index.mjs
  zzzDataRoot = resolve(dirname(mainEntry), "..")
} catch {
  // fallback for bundled env: resolve relative to this file
  zzzDataRoot = resolve(
    dirname(new URL(import.meta.url).pathname),
    "../../../../../zzz-data",
  )
}

const jsonCache = new Map<string, unknown>()

/**
 * Load a JSON file relative to the zzz-data package root.
 * Results are cached in memory.
 */
export function loadJson<T>(relativePath: string): T {
  if (jsonCache.has(relativePath)) return jsonCache.get(relativePath) as T
  const fullPath = resolve(zzzDataRoot, relativePath)
  const data = JSON.parse(readFileSync(fullPath, "utf-8")) as T
  jsonCache.set(relativePath, data)
  return data
}

/** Strip HTML tags and decode common entities */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim()
}

/**
 * Normalize a string for fuzzy matching:
 * lowercase, remove spaces/punctuation/special chars
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_·・.()（）【】[\]「」]/g, "")
}

function createAliasLookup(groups: Record<string, string[]>) {
  const lookup: Record<string, string> = {}

  for (const [canonical, aliases] of Object.entries(groups)) {
    lookup[normalize(canonical)] = canonical
    for (const alias of aliases) {
      lookup[normalize(alias)] = canonical
    }
  }

  return lookup
}

const specialtyLookup = createAliasLookup({
  attack: ["Attack", "强攻"],
  stun: ["Stun", "击破"],
  rupture: ["Rupture", "命破"],
  anomaly: ["Anomaly", "异常"],
  support: ["Support", "支援"],
  defense: ["Defense", "防护"],
})

const attributeLookup = createAliasLookup({
  electric: ["Electric", "电属性"],
  fire: ["Fire", "火属性"],
  ice: ["Ice", "冰属性"],
  ether: ["Ether", "以太"],
  physical: ["Physical", "物理"],
  auricInk: ["Auric Ink", "玄墨"],
  frost: ["Frost", "烈霜"],
  honedEdge: ["Honed Edge", "凛刃"],
})

export type NormalizedSpecialtyKey =
  | "attack"
  | "stun"
  | "rupture"
  | "anomaly"
  | "support"
  | "defense"

export type NormalizedAttributeKey =
  | "electric"
  | "fire"
  | "ice"
  | "ether"
  | "physical"
  | "auricInk"
  | "frost"
  | "honedEdge"

export function normalizeSpecialty(
  value: string | undefined,
): NormalizedSpecialtyKey | undefined {
  if (!value) return undefined
  return specialtyLookup[normalize(value)] as NormalizedSpecialtyKey | undefined
}

export function normalizeAttribute(
  value: string | undefined,
): NormalizedAttributeKey | undefined {
  if (!value) return undefined
  return attributeLookup[normalize(value)] as NormalizedAttributeKey | undefined
}

export type BaseDamageAttribute =
  | "electric"
  | "fire"
  | "ice"
  | "ether"
  | "physical"

const baseDamageAttributeMap = {
  electric: "electric",
  fire: "fire",
  ice: "ice",
  ether: "ether",
  physical: "physical",
  auricInk: "ether",
  frost: "ice",
  honedEdge: "physical",
} as const satisfies Record<NormalizedAttributeKey, BaseDamageAttribute>

export const damageAttributeOrder = [
  "ice",
  "fire",
  "electric",
  "ether",
  "physical",
] as const satisfies BaseDamageAttribute[]

export function normalizeDamageAttribute(
  value: string | undefined,
): BaseDamageAttribute | undefined {
  const attribute = normalizeAttribute(value)
  if (!attribute) return undefined
  return baseDamageAttributeMap[attribute]
}

/**
 * Find the best match from a list of items.
 * Priority: exact match → normalized exact → scored substring (prefix + coverage).
 */
export function findBestMatch<T>(
  items: T[],
  query: string,
  matchFields: ((item: T) => string | undefined)[],
): T | undefined {
  const qLow = query.toLowerCase()
  const qNorm = normalize(query)

  // Pass 1: exact match (case-insensitive)
  for (const item of items) {
    for (const getField of matchFields) {
      const val = getField(item)
      if (val && val.toLowerCase() === qLow) return item
    }
  }

  // Pass 2: normalized exact match
  for (const item of items) {
    for (const getField of matchFields) {
      const val = getField(item)
      if (val && normalize(val) === qNorm) return item
    }
  }

  // Pass 3: scored substring match
  // Prefer: prefix > non-prefix, higher coverage ratio > lower
  let bestItem: T | undefined
  let bestScore = 0

  for (const item of items) {
    for (const getField of matchFields) {
      const val = getField(item)
      if (!val) continue

      const vNorm = normalize(val)
      if (!vNorm.includes(qNorm)) continue

      // Coverage ratio: how much of the field the query covers
      let score = qNorm.length / vNorm.length
      // Prefix bonus
      if (vNorm.startsWith(qNorm)) score += 1

      if (score > bestScore) {
        bestScore = score
        bestItem = item
      }
    }
  }

  return bestItem
}

/**
 * Return top N matches by score (substring + prefix bonus).
 * Used to suggest candidates when exact match fails.
 */
export function findTopMatches<T>(
  items: T[],
  query: string,
  matchFields: ((item: T) => string | undefined)[],
  limit = 3,
): T[] {
  const qNorm = normalize(query)
  if (!qNorm) return []

  const scored: { item: T; score: number }[] = []

  for (const item of items) {
    let bestScore = 0
    for (const getField of matchFields) {
      const val = getField(item)
      if (!val) continue
      const vNorm = normalize(val)

      let score = 0
      if (vNorm.includes(qNorm)) {
        score = qNorm.length / vNorm.length
        if (vNorm.startsWith(qNorm)) score += 1
      } else if (qNorm.includes(vNorm)) {
        score = vNorm.length / qNorm.length
        if (qNorm.startsWith(vNorm)) score += 1
      }

      bestScore = Math.max(bestScore, score)
    }
    if (bestScore > 0) scored.push({ item, score: bestScore })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}

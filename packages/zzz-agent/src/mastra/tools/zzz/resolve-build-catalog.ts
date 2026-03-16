import type {
  BuildToolCatalogNameList,
  BuildToolCatalogValue,
  BuildToolNormalizedCatalogValue,
  CatalogItem,
} from "./resolve-build-contracts"

export type BuildToolCatalogFieldValue = BuildToolCatalogValue

export type BuildToolCatalogFieldList = BuildToolCatalogFieldValue[]

export type BuildToolCatalogCandidateScore = number

export interface BuildToolScoredCatalogCandidate<T> {
  item: T
  score: BuildToolCatalogCandidateScore
}

export type BuildToolScoredCatalogCandidateList<T> =
  BuildToolScoredCatalogCandidate<T>[]

export function normalizeCatalogValue(
  value: BuildToolCatalogValue,
): BuildToolNormalizedCatalogValue {
  return value.toLowerCase().replace(/[\s\-_·・.()（）【】[\]「」]/g, "")
}

function getCatalogFields(item: CatalogItem): BuildToolCatalogFieldList {
  return [item.name, item.id, ...item.aliases].filter(Boolean)
}

export function findCatalogItem<T extends CatalogItem>(
  items: readonly T[],
  query: BuildToolCatalogValue,
): T | undefined {
  const qLow = query.toLowerCase()
  const qNorm = normalizeCatalogValue(query)

  let bestItem: T | undefined
  let bestScore: BuildToolCatalogCandidateScore = 0

  for (const item of items) {
    for (const field of getCatalogFields(item)) {
      if (field.toLowerCase() === qLow) return item
      const normalized = normalizeCatalogValue(field)
      if (normalized === qNorm) return item
      if (!normalized.includes(qNorm)) continue
      const score = qNorm.length / normalized.length
      if (score > bestScore) {
        bestScore = score
        bestItem = item
      }
    }
  }

  return bestScore >= 0.6 ? bestItem : undefined
}

export function findCatalogCandidates<T extends CatalogItem>(
  items: readonly T[],
  query: BuildToolCatalogValue,
) {
  const qNorm = normalizeCatalogValue(query)
  if (!qNorm) return []

  const scored: BuildToolScoredCatalogCandidateList<T> = []
  for (const item of items) {
    let bestScore: BuildToolCatalogCandidateScore = 0
    for (const field of getCatalogFields(item)) {
      const normalized = normalizeCatalogValue(field)
      if (!normalized.includes(qNorm) && !qNorm.includes(normalized)) continue

      let score: BuildToolCatalogCandidateScore = 0
      if (normalized.includes(qNorm)) {
        score = qNorm.length / normalized.length
        if (normalized.startsWith(qNorm)) score += 1
      } else {
        score = normalized.length / qNorm.length
        if (qNorm.startsWith(normalized)) score += 1
      }
      bestScore = Math.max(bestScore, score)
    }
    if (bestScore > 0) scored.push({ item, score: bestScore })
  }

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.item)
}

export function catalogNames<T extends CatalogItem>(
  items: readonly T[],
): BuildToolCatalogNameList {
  return items.map((item) => item.name)
}

export function candidateNames<T extends CatalogItem>(
  items: readonly T[],
  query: BuildToolCatalogValue,
): BuildToolCatalogNameList {
  return findCatalogCandidates(items, query).map((item) => item.name)
}

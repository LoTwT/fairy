export interface NanokaPanelFieldRule {
  baseKey: string
  levelKey: string
  growthKey?: string
}

export interface NanokaPanelSource {
  stats: Record<string, number>
  level: Record<string, Record<string, number>>
}

export function deriveNanokaPanelValue(
  source: NanokaPanelSource,
  rule: NanokaPanelFieldRule,
  options: {
    promotionPhase?: string
    level?: number
  } = {},
): number {
  const promotionPhase = options.promotionPhase ?? "6"
  const level = options.level ?? 60
  const phase = source.level[promotionPhase]
  if (phase === undefined)
    throw new Error(`Missing nanoka level phase ${promotionPhase}`)

  const base = requiredNumber(source.stats[rule.baseKey], `stats.${rule.baseKey}`)
  const promotion = requiredNumber(phase[rule.levelKey], `level.${promotionPhase}.${rule.levelKey}`)
  const growth = rule.growthKey === undefined
    ? 0
    : requiredNumber(source.stats[rule.growthKey], `stats.${rule.growthKey}`) * (level - 1) / 10000

  return base + promotion + growth
}

function requiredNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing numeric nanoka panel field ${path}`)
  return value
}

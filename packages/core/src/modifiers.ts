import type {
  BucketResolution,
  BucketTraceOperation,
  ClampRange,
  DefenseAreaResolution,
  ModifierOperation,
  ModifierTag,
} from './types.js'
import { BUCKET_CLAMP_RANGES, getLevelCoefficient } from './constants.js'
import { clamp, sum } from './math.js'

export interface ResolveBucketOptions {
  bucket: string
  base: number
  modifiers?: readonly ModifierOperation[]
  tags?: readonly ModifierTag[]
  clampRange?: ClampRange
}

function matchesTags(modifier: ModifierOperation, tags: readonly ModifierTag[]): boolean {
  if (!modifier.tags || modifier.tags.length === 0)
    return true

  return modifier.tags.some(tag => tags.includes(tag))
}

export function resolveBucket(options: ResolveBucketOptions): BucketResolution {
  const {
    bucket,
    base,
    modifiers = [],
    tags = [],
    clampRange = BUCKET_CLAMP_RANGES[bucket],
  } = options

  const matched = modifiers.filter(modifier =>
    modifier.bucket === bucket
    && modifier.active !== false
    && matchesTags(modifier, tags),
  )

  const operations: BucketTraceOperation[] = []
  const adds = matched.filter(modifier => modifier.mode === 'add')
  const subtracts = matched.filter(modifier => modifier.mode === 'subtract')
  const replaces = matched.filter(modifier => modifier.mode === 'replace')
  const forces = matched.filter((modifier) => {
    if (modifier.mode !== 'force')
      return false

    if (!modifier.exitCondition)
      throw new Error(`Forced modifier "${modifier.sourceId}" on "${bucket}" is missing an exit condition.`)

    return true
  })

  const preReplacementValue = base + sum(adds.map(modifier => modifier.value)) - sum(subtracts.map(modifier => modifier.value))
  const replacement = replaces.at(-1) ?? null
  const forced = forces.at(-1) ?? null
  const preClampValue = forced
    ? forced.value
    : replacement
      ? replacement.value
      : preReplacementValue
  const finalValue = clamp(preClampValue, clampRange)

  for (const modifier of matched) {
    let applied = false
    let reason: string | undefined

    if (modifier.mode === 'add' || modifier.mode === 'subtract') {
      applied = !replacement && !forced
      reason = applied ? undefined : 'preempted-by-replacement'
    }

    if (modifier.mode === 'replace') {
      applied = replacement?.sourceId === modifier.sourceId && !forced
      reason = applied ? undefined : 'superseded'
    }

    if (modifier.mode === 'force') {
      applied = forced?.sourceId === modifier.sourceId
      reason = applied ? undefined : 'superseded'
    }

    operations.push({
      sourceId: modifier.sourceId,
      mode: modifier.mode,
      value: modifier.value,
      applied,
      reason,
    })
  }

  return {
    value: finalValue,
    trace: {
      bucket,
      base,
      preReplacementValue,
      preClampValue,
      replacementSourceId: replacement?.sourceId ?? null,
      forcedOverrideSourceId: forced?.sourceId ?? null,
      forcedOverrideExitCondition: forced?.exitCondition ?? null,
      finalValue,
      clampRange: clampRange ?? null,
      operations,
    },
  }
}

export interface ResolveDefenseAreaOptions {
  attackerLevel: number
  enemyDefense: number
  penetrationRate?: number
  penetrationFlat?: number
  modifiers?: readonly ModifierOperation[]
  tags?: readonly ModifierTag[]
}

export function resolveDefenseArea(options: ResolveDefenseAreaOptions): DefenseAreaResolution {
  const {
    attackerLevel,
    enemyDefense,
    penetrationRate: penetrationRateBase = 0,
    penetrationFlat = 0,
    modifiers = [],
    tags = [],
  } = options

  const reduction = resolveBucket({
    bucket: 'defenseReduction',
    base: 0,
    modifiers,
    tags,
  })
  const penetrationRate = resolveBucket({
    bucket: 'defensePenetrationRate',
    base: penetrationRateBase,
    modifiers,
    tags,
  })
  const flat = resolveBucket({
    bucket: 'defensePenetrationFlat',
    base: penetrationFlat,
    modifiers,
    tags,
  })

  const effectiveDefense = Math.max(
    0,
    ((enemyDefense * (1 - reduction.value)) * (1 - penetrationRate.value)) - flat.value,
  )
  const levelCoefficient = getLevelCoefficient(attackerLevel)
  const multiplier = levelCoefficient / (levelCoefficient + effectiveDefense)

  return {
    reduction,
    penetrationRate,
    penetrationFlat: flat,
    effectiveDefense,
    multiplier,
  }
}

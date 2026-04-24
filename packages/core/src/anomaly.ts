import type {
  ActionEvent,
  AnomalyBuildupEvaluation,
  AnomalyContributionRecord,
  AnomalyDamageEvaluation,
  AnomalyStateRecord,
  AnomalyType,
  BucketTrace,
  DisorderEvaluation,
  ModifierOperation,
  ModifierTag,
  ResolvedAgentFrameSnapshot,
  ResolvedEnemyFrameSnapshot,
  StatusDurationResult,
  VirtualAgentSnapshot,
} from './types.js'
import {
  ANOMALY_TRIGGER_THRESHOLD_TABLE,
  DEFAULT_DISORDER_DAMAGE_MULTIPLIER,
  DISORDER_DAZE_LEVEL_REGION_COEFFICIENT,
  getAttributeModifierTags,
} from './constants.js'
import { floorInt, sum, trunc4 } from './math.js'
import { resolveBucket, resolveDefenseArea } from './modifiers.js'
import { calculateStatusDuration } from './status.js'

function buildTags(event: ActionEvent, anomalyType: AnomalyType): ModifierTag[] {
  if (anomalyType === 'disorder')
    return [...event.tags, ...getAttributeModifierTags(event.attribute), 'disorder']

  return [...event.tags, ...getAttributeModifierTags(event.attribute), anomalyType]
}

function calculateDamageLevelRegion(level: number): number {
  return trunc4(1 + (level / 100))
}

export function calculateAnomalyTriggerThreshold(
  anomalyType: Exclude<AnomalyType, 'disorder'>,
  override?: number,
): number {
  return override ?? ANOMALY_TRIGGER_THRESHOLD_TABLE[anomalyType]
}

export function buildVirtualAgent(
  contributions: readonly AnomalyContributionRecord[],
): VirtualAgentSnapshot | undefined {
  const filtered = contributions.filter(contribution =>
    contribution.sourceType !== 'bangboo' && contribution.appliedBuildup > 0,
  )

  const totalWeight = sum(filtered.map(contribution => contribution.appliedBuildup))
  if (totalWeight === 0)
    return undefined

  const weightedAverage = (selector: (contribution: AnomalyContributionRecord) => number): number =>
    sum(filtered.map(contribution => selector(contribution) * contribution.appliedBuildup)) / totalWeight

  return {
    level: floorInt(weightedAverage(contribution => contribution.level)),
    anomalyMastery: weightedAverage(contribution => contribution.anomalyMastery),
    anomalyProficiency: weightedAverage(contribution => contribution.anomalyProficiency),
    attack: weightedAverage(contribution => contribution.attack),
    impact: weightedAverage(contribution => contribution.impact),
    penetrationRate: weightedAverage(contribution => contribution.penetrationRate),
    penetrationFlat: weightedAverage(contribution => contribution.penetrationFlat),
    resolvedDamageBonus: weightedAverage(contribution => contribution.resolvedDamageBonus),
    resolvedOutgoingDazeBonus: weightedAverage(contribution => contribution.resolvedOutgoingDazeBonus),
  }
}

export interface AnomalyBuildupOptions {
  actor: ResolvedAgentFrameSnapshot
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  modifiers?: readonly ModifierOperation[]
}

export function calculateAnomalyBuildup(options: AnomalyBuildupOptions): AnomalyBuildupEvaluation | undefined {
  const anomalyType = options.event.anomalyType
  if (!anomalyType)
    return undefined

  const { actor, enemy, event, modifiers = [] } = options
  const tags = buildTags(event, anomalyType)
  const anomalyMastery = resolveBucket({
    bucket: 'anomalyMasteryArea',
    base: actor.stats.anomalyMastery,
    modifiers,
    tags,
  })
  const anomalyProficiency = resolveBucket({
    bucket: 'anomalyProficiencyArea',
    base: actor.stats.anomalyProficiency,
    modifiers,
    tags,
  })
  const buildupResistance = resolveBucket({
    bucket: 'anomalyBuildupResistance',
    base: 0,
    modifiers,
    tags,
  })
  const distanceDecay = resolveBucket({
    bucket: 'distanceDecay',
    base: 0,
    modifiers,
    tags,
  })
  const damageBonus = resolveBucket({
    bucket: 'damageBonus',
    base: 0,
    modifiers,
    tags,
  })
  const outgoingDazeBonus = resolveBucket({
    bucket: 'outgoingDazeBonus',
    base: 0,
    modifiers,
    tags,
  })
  const penetrationRate = resolveBucket({
    bucket: 'defensePenetrationRate',
    base: 0,
    modifiers,
    tags,
  })

  const threshold = calculateAnomalyTriggerThreshold(
    anomalyType,
    enemy.anomalyState?.[anomalyType]?.threshold,
  )
  const current = enemy.anomalyState?.[anomalyType]?.current ?? 0
  let remainingThreshold = Math.max(0, threshold - current)

  const contributions: AnomalyContributionRecord[] = []
  const appliedTotals = event.segments.map((segment) => {
    const rawApplied = (segment.anomalyBuildup ?? 0)
      * (1 + (floorInt(anomalyMastery.value) / 1000))
      * (1 + (anomalyProficiency.value / 1000))
      * (1 - buildupResistance.value)
      * (1 - distanceDecay.value)

    const appliedBuildup = Math.max(0, Math.min(rawApplied, remainingThreshold))
    remainingThreshold = Math.max(0, remainingThreshold - appliedBuildup)

    if (appliedBuildup > 0) {
      contributions.push({
        sourceId: actor.id,
        sourceType: actor.sourceType,
        appliedBuildup,
        level: actor.level,
        anomalyMastery: anomalyMastery.value,
        anomalyProficiency: anomalyProficiency.value,
        attack: actor.stats.attack,
        impact: actor.stats.impact,
        penetrationRate: penetrationRate.value,
        penetrationFlat: actor.stats.pierceForce,
        resolvedDamageBonus: damageBonus.value,
        resolvedOutgoingDazeBonus: outgoingDazeBonus.value,
      })
    }

    return appliedBuildup
  })

  const totalApplied = sum(appliedTotals)
  const existingState = enemy.anomalyState?.[anomalyType]
  const virtualAgent = buildVirtualAgent([
    ...(existingState?.contributionHistory ?? []),
    ...contributions,
  ])

  return {
    anomalyType,
    totalApplied,
    nextBuildup: current + totalApplied,
    threshold,
    triggered: (current + totalApplied) >= threshold,
    contributions,
    virtualAgent,
    bucketTraces: {
      anomalyMasteryArea: anomalyMastery.trace,
      anomalyProficiencyArea: anomalyProficiency.trace,
      anomalyBuildupResistance: buildupResistance.trace,
      distanceDecay: distanceDecay.trace,
      damageBonus: damageBonus.trace,
      defensePenetrationRate: penetrationRate.trace,
      outgoingDazeBonus: outgoingDazeBonus.trace,
    },
  }
}

interface AnomalyDamageSource {
  level: number
  attack: number
  anomalyProficiency: number
  penetrationRate: number
  penetrationFlat: number
  resolvedDamageBonus: number
}

function calculateLiveAnomalyDamage(
  source: AnomalyDamageSource,
  enemy: ResolvedEnemyFrameSnapshot,
  event: ActionEvent,
  anomalyType: AnomalyType,
  modifiers: readonly ModifierOperation[],
): { rawDamage: number, critMultiplier: number, levelRegion: number, traces: Readonly<Record<string, BucketTrace>> } {
  const tags = buildTags(event, anomalyType)
  const anomalyDamageBonus = resolveBucket({
    bucket: 'anomalyDamageBonus',
    base: 0,
    modifiers,
    tags,
  })
  const anomalyCritArea = resolveBucket({
    bucket: 'anomalyCritArea',
    base: 0,
    modifiers,
    tags,
  })
  const damageResistance = resolveBucket({
    bucket: 'damageResistance',
    base: 0,
    modifiers,
    tags,
  })
  const vulnerability = resolveBucket({
    bucket: 'vulnerability',
    base: 0,
    modifiers,
    tags,
  })
  const dazedVulnerability = resolveBucket({
    bucket: enemy.dazeState.isDazed ? 'dazedVulnerability' : 'preDazeVulnerability',
    base: 0,
    modifiers,
    tags,
  })
  const defenseArea = resolveDefenseArea({
    attackerLevel: source.level,
    enemyDefense: enemy.stats.defense,
    penetrationRate: source.penetrationRate,
    penetrationFlat: source.penetrationFlat,
    modifiers,
    tags,
  })
  const levelRegion = calculateDamageLevelRegion(source.level)
  const critMultiplier = 1 + anomalyCritArea.value
  const rawDamage = source.attack
    * (1 + (source.anomalyProficiency / 1000))
    * levelRegion
    * (1 + source.resolvedDamageBonus)
    * (1 + anomalyDamageBonus.value)
    * critMultiplier
    * defenseArea.multiplier
    * (1 - damageResistance.value)
    * (1 + vulnerability.value)
    * (1 + dazedVulnerability.value)

  return {
    rawDamage,
    critMultiplier,
    levelRegion,
    traces: {
      anomalyDamageBonus: anomalyDamageBonus.trace,
      anomalyCritArea: anomalyCritArea.trace,
      damageResistance: damageResistance.trace,
      vulnerability: vulnerability.trace,
      dazedVulnerability: dazedVulnerability.trace,
      defenseReduction: defenseArea.reduction.trace,
      defensePenetrationRate: defenseArea.penetrationRate.trace,
      defensePenetrationFlat: defenseArea.penetrationFlat.trace,
    },
  }
}

export function calculateAnomalyDamage(options: {
  source: VirtualAgentSnapshot | ResolvedAgentFrameSnapshot
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  anomalyType: Exclude<AnomalyType, 'disorder'>
  modifiers?: readonly ModifierOperation[]
}): AnomalyDamageEvaluation {
  const result = calculateLiveAnomalyDamage(
    {
      level: options.source.level,
      attack: 'stats' in options.source ? options.source.stats.attack : options.source.attack,
      anomalyProficiency: 'stats' in options.source
        ? options.source.stats.anomalyProficiency
        : options.source.anomalyProficiency,
      penetrationRate: 'stats' in options.source ? 0 : options.source.penetrationRate,
      penetrationFlat: 'stats' in options.source ? options.source.stats.pierceForce : options.source.penetrationFlat,
      resolvedDamageBonus: 'stats' in options.source ? 0 : options.source.resolvedDamageBonus,
    },
    options.enemy,
    options.event,
    options.anomalyType,
    options.modifiers ?? [],
  )

  return {
    anomalyType: options.anomalyType,
    rawDamage: result.rawDamage,
    critMultiplier: result.critMultiplier,
    levelRegion: result.levelRegion,
    bucketTraces: result.traces,
  }
}

export function calculateDisorderDamage(options: {
  originalState: AnomalyStateRecord
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  modifiers?: readonly ModifierOperation[]
}): DisorderEvaluation | undefined {
  const source = options.originalState.virtualAgent ?? buildVirtualAgent(options.originalState.contributionHistory)
  if (!source)
    return undefined

  const result = calculateLiveAnomalyDamage(
    {
      level: source.level,
      attack: source.attack * DEFAULT_DISORDER_DAMAGE_MULTIPLIER,
      anomalyProficiency: source.anomalyProficiency,
      penetrationRate: source.penetrationRate,
      penetrationFlat: source.penetrationFlat,
      resolvedDamageBonus: source.resolvedDamageBonus,
    },
    options.enemy,
    options.event,
    'disorder',
    options.modifiers ?? [],
  )
  const dazeResistance = resolveBucket({
    bucket: 'dazeResistance',
    base: 0,
    modifiers: options.modifiers,
    tags: [...options.event.tags, ...getAttributeModifierTags(options.event.attribute), 'disorder'],
  })
  const daze = source.impact
    * result.levelRegion
    * DISORDER_DAZE_LEVEL_REGION_COEFFICIENT
    * (1 + source.resolvedOutgoingDazeBonus)
    * (1 - dazeResistance.value)

  return {
    rawDamage: result.rawDamage,
    daze,
    levelRegion: result.levelRegion,
    bucketTraces: {
      ...result.traces,
      dazeResistance: dazeResistance.trace,
    },
  }
}

export function calculateAnomalyStatusDuration(options: {
  anomalyType: Exclude<AnomalyType, 'disorder'>
  anomalyMastery: number
  anomalyProficiency: number
  durationBonus?: number
}): StatusDurationResult {
  return calculateStatusDuration({
    kind: options.anomalyType,
    anomalyMastery: options.anomalyMastery,
    anomalyProficiency: options.anomalyProficiency,
    durationBonus: options.durationBonus,
  })
}

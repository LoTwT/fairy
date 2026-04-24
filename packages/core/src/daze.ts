import type {
  ActionEvent,
  DazeEvaluation,
  ModifierOperation,
  ModifierTag,
  ResolvedAgentFrameSnapshot,
  ResolvedEnemyFrameSnapshot,
} from './types.js'
import { getAttributeModifierTags } from './constants.js'
import { floorInt, sum } from './math.js'
import { resolveBucket } from './modifiers.js'

function buildTags(event: ActionEvent): ModifierTag[] {
  return [...event.tags, ...getAttributeModifierTags(event.attribute), event.damageType]
}

export function convertDurationPercentToSpeedDelta(durationPercent: number, baseSpeed = 1): number {
  return (baseSpeed / (1 + durationPercent)) - baseSpeed
}

export interface DazeOptions {
  actor: ResolvedAgentFrameSnapshot
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  modifiers?: readonly ModifierOperation[]
}

export function calculateDazeRecovery(options: DazeOptions): Pick<DazeEvaluation, 'recoverySpeed' | 'recoveryDuration' | 'fixedRecoveryDelay' | 'bucketTraces'> {
  const tags = buildTags(options.event)
  const durationPercent = resolveBucket({
    bucket: 'dazeRecoveryDurationPercent',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })
  const durationSpeedDelta = convertDurationPercentToSpeedDelta(
    durationPercent.value,
    options.enemy.dazeState.recoverySpeed,
  )
  const durationSpeedModifier: ModifierOperation = {
    sourceId: 'daze-recovery-duration-percent',
    bucket: 'dazeRecoverySpeed',
    mode: 'add',
    value: durationSpeedDelta,
  }
  const hasDurationModifier = durationPercent.trace.operations.length > 0
  const speedModifiers = hasDurationModifier
    ? [...(options.modifiers ?? []), durationSpeedModifier]
    : options.modifiers

  const recoverySpeed = resolveBucket({
    bucket: 'dazeRecoverySpeed',
    base: options.enemy.dazeState.recoverySpeed,
    modifiers: speedModifiers,
    tags,
  })

  return {
    recoverySpeed: recoverySpeed.value,
    recoveryDuration: 1 / recoverySpeed.value,
    fixedRecoveryDelay: options.enemy.dazeState.fixedRecoveryDelay,
    bucketTraces: {
      dazeRecoveryDurationPercent: durationPercent.trace,
      dazeRecoverySpeed: recoverySpeed.trace,
    },
  }
}

export function calculateDazeContribution(options: DazeOptions): DazeEvaluation {
  const { actor, enemy, event, modifiers = [] } = options
  const tags = buildTags(event)
  const dazeResistance = resolveBucket({
    bucket: 'dazeResistance',
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
  const incomingDazeBonus = resolveBucket({
    bucket: 'incomingDazeBonus',
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

  const recovery = calculateDazeRecovery(options)
  const total = enemy.dazeState.locked
    ? 0
    : sum(event.segments.map((segment) => {
        const base = actor.stats.impact * (segment.dazeMultiplier ?? 0)
        const multiplier = (1 + outgoingDazeBonus.value)
          * (1 + incomingDazeBonus.value)
          * (1 - distanceDecay.value)
          * (1 - dazeResistance.value)
        return (base * multiplier) + (segment.directDazeDelta ?? 0)
      }))

  const nextRatio = enemy.dazeState.limit === 0
    ? 0
    : (enemy.dazeState.current + total) / enemy.dazeState.limit

  return {
    total,
    nextRatio,
    displayRatio: floorInt(nextRatio * 100),
    recoverySpeed: recovery.recoverySpeed,
    recoveryDuration: recovery.recoveryDuration,
    fixedRecoveryDelay: recovery.fixedRecoveryDelay,
    bucketTraces: {
      dazeResistance: dazeResistance.trace,
      outgoingDazeBonus: outgoingDazeBonus.trace,
      incomingDazeBonus: incomingDazeBonus.trace,
      distanceDecay: distanceDecay.trace,
      ...recovery.bucketTraces,
    },
  }
}

import type {
  ActionEvent,
  BattleContext,
  EnemyFrameSnapshot,
  FrameEvaluation,
  ModifierOperation,
  TeamFrameSnapshot,
  TriggeredOutputEvaluation,
} from './types.js'
import {
  calculateAnomalyBuildup,
  calculateAnomalyDamage,
  calculateDisorderDamage,
} from './anomaly.js'
import { calculateDirectDamage } from './damage.js'
import { calculateDazeContribution } from './daze.js'
import { calculateInterruptOutcome } from './interrupt.js'
import { calculateResources } from './resources.js'
import { resolveAgentStats, resolveEnemyStats } from './stats.js'

function collectModifiers(
  team: TeamFrameSnapshot,
  enemy: EnemyFrameSnapshot,
  context: BattleContext,
  event: ActionEvent,
): readonly ModifierOperation[] {
  const contextDistanceDecay = context.distanceDecay === undefined
    ? []
    : [{
        sourceId: 'battle-context-distance-decay',
        bucket: 'distanceDecay',
        mode: 'add' as const,
        value: context.distanceDecay,
      }]

  return [
    ...(team.modifiers ?? []),
    ...team.agents.flatMap(agent => agent.modifiers ?? []),
    ...(enemy.modifiers ?? []),
    ...contextDistanceDecay,
    ...(context.modifiers ?? []),
    ...(event.modifiers ?? []),
  ]
}

function evaluateTriggeredOutputs(event: ActionEvent, attack: number, impact: number, enemyHp: number): readonly TriggeredOutputEvaluation[] {
  return (event.triggeredOutputs ?? []).map(output => ({
    id: output.id,
    sourceId: output.sourceId,
    label: output.label,
    damage: output.damageMultiplier ? attack * output.damageMultiplier : undefined,
    daze: output.dazeMultiplier ? impact * output.dazeMultiplier : undefined,
    percentCurrentHpDamage: output.percentCurrentHpDamage
      ? enemyHp * output.percentCurrentHpDamage
      : undefined,
  }))
}

export function evaluateFrameEvent(options: {
  team: TeamFrameSnapshot
  enemy: EnemyFrameSnapshot
  context: BattleContext
  event: ActionEvent
}): FrameEvaluation {
  const actorSnapshot = options.team.agents.find(agent => agent.id === options.event.sourceId)
  if (!actorSnapshot)
    throw new Error(`Actor "${options.event.sourceId}" is not present in the team snapshot.`)

  const actor = resolveAgentStats(actorSnapshot)
  const enemy = resolveEnemyStats(options.enemy)
  const modifiers = collectModifiers(options.team, options.enemy, options.context, options.event)

  const damage = options.event.segments.some(segment => segment.damageMultiplier !== undefined)
    ? calculateDirectDamage({
        actor,
        enemy,
        event: options.event,
        modifiers,
      })
    : undefined

  const daze = options.event.segments.some(segment =>
    segment.dazeMultiplier !== undefined || segment.directDazeDelta !== undefined,
  )
    ? calculateDazeContribution({
        actor,
        enemy,
        event: options.event,
        modifiers,
      })
    : undefined

  const anomalyBuildup = options.event.segments.some(segment => segment.anomalyBuildup !== undefined)
    ? calculateAnomalyBuildup({
        actor,
        enemy,
        event: options.event,
        modifiers,
      })
    : undefined

  const anomalyDamage = anomalyBuildup?.triggered && anomalyBuildup.virtualAgent && options.event.anomalyType
    ? calculateAnomalyDamage({
        source: anomalyBuildup.virtualAgent,
        enemy,
        event: options.event,
        anomalyType: options.event.anomalyType,
        modifiers,
      })
    : undefined

  const disorderSource = options.event.disorderSourceAnomaly
    ? options.enemy.anomalyState?.[options.event.disorderSourceAnomaly]
    : undefined
  const disorder = disorderSource
    ? calculateDisorderDamage({
        originalState: disorderSource,
        enemy,
        event: options.event,
        modifiers,
      })
    : undefined

  const resources = calculateResources({
    actor,
    enemy,
    event: options.event,
    modifiers,
  })

  const interrupt = calculateInterruptOutcome({
    actor,
    enemy,
    event: options.event,
    modifiers,
  })

  const triggeredOutputs = evaluateTriggeredOutputs(
    options.event,
    actor.stats.attack,
    actor.stats.impact,
    enemy.stats.hp,
  )

  return {
    eventId: options.event.id,
    sourceId: options.event.sourceId,
    damage,
    daze,
    anomalyBuildup,
    anomalyDamage,
    disorder,
    resources,
    interrupt,
    segments: damage?.segments ?? [],
    bucketTraces: {
      ...(damage?.bucketTraces ?? {}),
      ...(daze?.bucketTraces ?? {}),
      ...(anomalyBuildup?.bucketTraces ?? {}),
      ...(anomalyDamage?.bucketTraces ?? {}),
      ...(disorder?.bucketTraces ?? {}),
      ...(resources?.bucketTraces ?? {}),
      ...(interrupt ? { antiInterrupt: interrupt.trace } : {}),
    },
    triggeredOutputs,
  }
}

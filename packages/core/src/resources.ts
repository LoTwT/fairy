import type {
  ActionEvent,
  BucketTrace,
  ModifierOperation,
  ModifierTag,
  ResolvedAgentFrameSnapshot,
  ResolvedEnemyFrameSnapshot,
  ResourceEvaluation,
} from './types.js'
import {
  DEFAULT_CORRUPTION_BURST_MULTIPLIER,
  DEFAULT_SHIELD_PURGE_DAMAGE_MULTIPLIER,
  getAttributeModifierTags,
} from './constants.js'
import { sum } from './math.js'
import { resolveBucket } from './modifiers.js'
import { calculateFreezeDuration } from './status.js'

function buildTags(event: ActionEvent): ModifierTag[] {
  return [...event.tags, ...getAttributeModifierTags(event.attribute), event.damageType]
}

export interface ResourceOptions {
  actor: ResolvedAgentFrameSnapshot
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  modifiers?: readonly ModifierOperation[]
}

interface ResourceAmountResolution {
  value: number
  trace: BucketTrace
}

function resolveEnergyGain(options: ResourceOptions): ResourceAmountResolution {
  const tags = buildTags(options.event)
  const efficiency = resolveBucket({
    bucket: 'energyGainEfficiency',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })

  return {
    value: sum(options.event.segments.map(segment =>
      (segment.energyGain ?? 0) * options.actor.stats.energyRegen * (1 + efficiency.value),
    )),
    trace: efficiency.trace,
  }
}

export function calculateEnergyGain(options: ResourceOptions): number {
  return resolveEnergyGain(options).value
}

function resolveFlashGain(options: ResourceOptions): ResourceAmountResolution {
  const tags = buildTags(options.event)
  const efficiency = resolveBucket({
    bucket: 'flashGainEfficiency',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })

  return {
    value: sum(options.event.segments.map(segment =>
      (segment.flashGain ?? 0) * options.actor.stats.flashRegen * (1 + efficiency.value),
    )),
    trace: efficiency.trace,
  }
}

export function calculateFlashGain(options: ResourceOptions): number {
  return resolveFlashGain(options).value
}

function resolveNoiseGain(options: ResourceOptions): ResourceAmountResolution {
  const tags = buildTags(options.event)
  const efficiency = resolveBucket({
    bucket: 'noiseGainEfficiency',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })

  return {
    value: sum(options.event.segments.map(segment =>
      (segment.noiseGain ?? 0) * (1 + efficiency.value),
    )),
    trace: efficiency.trace,
  }
}

export function calculateNoiseGain(options: ResourceOptions): number {
  return resolveNoiseGain(options).value
}

function resolveCorruptionGain(options: ResourceOptions): ResourceAmountResolution {
  const tags = buildTags(options.event)
  const efficiency = resolveBucket({
    bucket: 'corruptionGainEfficiency',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })

  return {
    value: sum(options.event.segments.map(segment =>
      (segment.corruptionGain ?? 0) * (1 + efficiency.value),
    )),
    trace: efficiency.trace,
  }
}

export function calculateCorruptionGain(options: ResourceOptions): number {
  return resolveCorruptionGain(options).value
}

export function calculateCorruptionBurst(options: ResourceOptions): number {
  return calculateCorruptionGain(options)
    * DEFAULT_CORRUPTION_BURST_MULTIPLIER
    * (1 + (options.actor.stats.anomalyProficiency / 1000))
}

export function calculateShieldReduction(options: ResourceOptions): Pick<ResourceEvaluation, 'shieldReduction' | 'shieldPurgeDamage' | 'bucketTraces'> {
  const tags = buildTags(options.event)
  const shieldReductionEfficiency = resolveBucket({
    bucket: 'shieldReductionEfficiency',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })
  const shieldBeingReducedEfficiency = resolveBucket({
    bucket: 'shieldBeingReducedEfficiency',
    base: 0,
    modifiers: options.modifiers,
    tags,
  })

  const shieldReduction = options.actor.sourceType === 'bangboo'
    ? 0
    : sum(options.event.segments.map(segment =>
        (segment.shieldReduction ?? 0)
        * options.actor.stats.attack
        * (1 + shieldReductionEfficiency.value)
        * (1 + shieldBeingReducedEfficiency.value),
      ))

  const purgeDamage = options.enemy.shieldState && shieldReduction >= options.enemy.shieldState.current
    ? options.actor.stats.attack * (
      options.event.segments.at(-1)?.purgeDamageMultiplier
      ?? options.enemy.shieldState.purgeDamageMultiplier
      ?? DEFAULT_SHIELD_PURGE_DAMAGE_MULTIPLIER
    )
    : 0

  return {
    shieldReduction,
    shieldPurgeDamage: purgeDamage,
    bucketTraces: {
      shieldReductionEfficiency: shieldReductionEfficiency.trace,
      shieldBeingReducedEfficiency: shieldBeingReducedEfficiency.trace,
    },
  }
}

export function calculateFreezeStatusDuration(durationBonus = 0): number {
  return calculateFreezeDuration({ durationBonus })
}

export function calculateResources(options: ResourceOptions): ResourceEvaluation {
  const energy = resolveEnergyGain(options)
  const flash = resolveFlashGain(options)
  const noise = resolveNoiseGain(options)
  const corruptionGain = resolveCorruptionGain(options)
  const corruptionBurst = corruptionGain.value
    * DEFAULT_CORRUPTION_BURST_MULTIPLIER
    * (1 + (options.actor.stats.anomalyProficiency / 1000))
  const shield = calculateShieldReduction(options)

  return {
    energy: energy.value,
    flash: flash.value,
    noise: noise.value,
    corruptionGain: corruptionGain.value,
    corruptionBurst,
    shieldReduction: shield.shieldReduction,
    shieldPurgeDamage: shield.shieldPurgeDamage,
    bucketTraces: {
      energyGainEfficiency: energy.trace,
      flashGainEfficiency: flash.trace,
      noiseGainEfficiency: noise.trace,
      corruptionGainEfficiency: corruptionGain.trace,
      ...shield.bucketTraces,
    },
  }
}

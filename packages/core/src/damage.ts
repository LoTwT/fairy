import type {
  ActionEvent,
  DamageEvaluation,
  ModifierOperation,
  ModifierTag,
  ResolvedAgentFrameSnapshot,
  ResolvedEnemyFrameSnapshot,
  SegmentEvaluation,
} from './types.js'
import { BUCKET_CLAMP_RANGES, getAttributeModifierTags } from './constants.js'
import { ceilDisplay, sum } from './math.js'
import { resolveBucket, resolveDefenseArea } from './modifiers.js'

export interface DirectDamageOptions {
  actor: ResolvedAgentFrameSnapshot
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  modifiers?: readonly ModifierOperation[]
}

function buildTags(event: ActionEvent): ModifierTag[] {
  return [...event.tags, ...getAttributeModifierTags(event.attribute), event.damageType]
}

export function calculateDamageSegments(options: DirectDamageOptions): readonly SegmentEvaluation[] {
  const { actor, enemy, event, modifiers = [] } = options
  const tags = buildTags(event)
  const damageBonus = resolveBucket({
    bucket: 'damageBonus',
    base: 0,
    modifiers,
    tags,
  })
  const critRate = resolveBucket({
    bucket: 'critRate',
    base: actor.stats.critRate,
    modifiers,
    tags,
    clampRange: BUCKET_CLAMP_RANGES.critRate,
  })
  const critDamage = resolveBucket({
    bucket: 'critDamage',
    base: actor.stats.critDamage,
    modifiers,
    tags,
    clampRange: BUCKET_CLAMP_RANGES.critDamage,
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
  const pierceDamageBonus = resolveBucket({
    bucket: 'pierceDamageBonus',
    base: 0,
    modifiers,
    tags,
  })
  const specialMultiplier = resolveBucket({
    bucket: 'specialMultiplier',
    base: 0,
    modifiers,
    tags,
  })

  const critMultiplier = event.forceCrit
    ? (1 + critDamage.value)
    : (1 + (critRate.value * critDamage.value))

  return event.segments.map((segment) => {
    const baseDamage = actor.stats.attack * (segment.damageMultiplier ?? 0)
    const commonTraces = {
      damageBonus: damageBonus.trace,
      critRate: critRate.trace,
      critDamage: critDamage.trace,
      damageResistance: damageResistance.trace,
      vulnerability: vulnerability.trace,
      dazedVulnerability: dazedVulnerability.trace,
      pierceDamageBonus: pierceDamageBonus.trace,
      specialMultiplier: specialMultiplier.trace,
    } as const

    if (event.damageType === 'true') {
      return {
        id: segment.id,
        rawValue: baseDamage,
        displayValue: ceilDisplay(baseDamage),
        bucketTraces: commonTraces,
      }
    }

    const defenseArea = resolveDefenseArea({
      attackerLevel: actor.level,
      enemyDefense: enemy.stats.defense,
      penetrationFlat: actor.stats.pierceForce,
      modifiers,
      tags,
    })

    const bonusMultiplier = 1 + damageBonus.value
    const resistanceMultiplier = 1 - damageResistance.value
    const vulnerabilityMultiplier = 1 + vulnerability.value
    const dazeMultiplier = 1 + dazedVulnerability.value
    const specialAreaMultiplier = 1 + specialMultiplier.value
    const defenseMultiplier = event.damageType === 'regular' ? defenseArea.multiplier : 1
    const pierceMultiplier = event.damageType === 'pierce' ? (1 + pierceDamageBonus.value) : 1

    const rawValue = baseDamage
      * bonusMultiplier
      * critMultiplier
      * resistanceMultiplier
      * vulnerabilityMultiplier
      * dazeMultiplier
      * specialAreaMultiplier
      * defenseMultiplier
      * pierceMultiplier

    return {
      id: segment.id,
      rawValue,
      displayValue: ceilDisplay(rawValue),
      bucketTraces: {
        ...commonTraces,
        defenseReduction: defenseArea.reduction.trace,
        defensePenetrationRate: defenseArea.penetrationRate.trace,
        defensePenetrationFlat: defenseArea.penetrationFlat.trace,
      },
    }
  })
}

export function calculateDirectDamage(options: DirectDamageOptions): DamageEvaluation {
  const segments = calculateDamageSegments(options)
  const tags = buildTags(options.event)
  const critRate = resolveBucket({
    bucket: 'critRate',
    base: options.actor.stats.critRate,
    modifiers: options.modifiers,
    tags,
    clampRange: BUCKET_CLAMP_RANGES.critRate,
  })
  const critDamage = resolveBucket({
    bucket: 'critDamage',
    base: options.actor.stats.critDamage,
    modifiers: options.modifiers,
    tags,
    clampRange: BUCKET_CLAMP_RANGES.critDamage,
  })
  const critMultiplier = options.event.forceCrit
    ? (1 + critDamage.value)
    : (1 + (critRate.value * critDamage.value))

  return {
    type: options.event.damageType,
    totalRaw: sum(segments.map(segment => segment.rawValue)),
    totalDisplay: sum(segments.map(segment => segment.displayValue)),
    critMultiplier,
    segments,
    bucketTraces: segments[0]?.bucketTraces ?? {},
  }
}

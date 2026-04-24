import type {
  ActionEvent,
  InterruptOutcome,
  ModifierOperation,
  ModifierTag,
  ResolvedAgentFrameSnapshot,
  ResolvedEnemyFrameSnapshot,
} from './types.js'
import { DEFAULT_SUPPORT_PARRY_INTERRUPT_LEVEL, getAttributeModifierTags } from './constants.js'
import { resolveBucket } from './modifiers.js'

function buildTags(event: ActionEvent): ModifierTag[] {
  return [...event.tags, ...getAttributeModifierTags(event.attribute), event.damageType]
}

export function calculateInterruptOutcome(options: {
  actor: ResolvedAgentFrameSnapshot
  enemy: ResolvedEnemyFrameSnapshot
  event: ActionEvent
  modifiers?: readonly ModifierOperation[]
}): InterruptOutcome {
  const tags = buildTags(options.event)
  const antiInterrupt = resolveBucket({
    bucket: 'antiInterrupt',
    base: options.enemy.interruptState?.antiInterruptLevel ?? DEFAULT_SUPPORT_PARRY_INTERRUPT_LEVEL,
    modifiers: [
      ...(options.modifiers ?? []),
      ...(options.enemy.interruptState?.modifiers ?? []),
    ],
    tags,
  })

  const effectiveLevel = options.actor.level + (options.event.baseInterruptLevel ?? 0)

  return {
    effectiveLevel,
    antiInterruptLevel: antiInterrupt.value,
    interrupted: effectiveLevel >= antiInterrupt.value,
    trace: antiInterrupt.trace,
  }
}

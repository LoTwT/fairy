import { describe, expect, it } from 'vitest'

import {
  calculateInterruptOutcome,
  resolveAgentStats,
  resolveEnemyStats,
} from '../../packages/core/src/index.js'
import { createAgent, createEnemy, createEvent } from './fixtures.js'

describe('interrupt', () => {
  it('respects forced anti-interrupt overrides', () => {
    const enemy = createEnemy({
      interruptState: {
        antiInterruptLevel: 10,
        modifiers: [
          { sourceId: 'replace', bucket: 'antiInterrupt', mode: 'replace', value: 5 },
          {
            sourceId: 'phase-lock',
            bucket: 'antiInterrupt',
            mode: 'force',
            value: 100,
            exitCondition: 'phase-end',
          },
        ],
      },
    })

    const result = calculateInterruptOutcome({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(enemy),
      event: createEvent(),
      modifiers: [],
    })

    expect(result.interrupted).toBe(false)
    expect(result.trace.forcedOverrideSourceId).toBe('phase-lock')
  })
})

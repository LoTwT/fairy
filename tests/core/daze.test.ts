import { describe, expect, it } from 'vitest'

import {
  calculateDazeContribution,
  calculateDazeRecovery,
  convertDurationPercentToSpeedDelta,
  resolveAgentStats,
  resolveEnemyStats,
} from '../../packages/core/src/index.js'
import { createAgent, createEnemy, createEvent } from './fixtures.js'

describe('daze', () => {
  it('applies distance decay through the daze path and rounds the ratio down', () => {
    const result = calculateDazeContribution({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent(),
      modifiers: [
        { sourceId: 'outgoing', bucket: 'outgoingDazeBonus', mode: 'add', value: 0.2 },
        { sourceId: 'incoming', bucket: 'incomingDazeBonus', mode: 'add', value: 0.1 },
        { sourceId: 'distance', bucket: 'distanceDecay', mode: 'add', value: 0.5 },
        { sourceId: 'resistance', bucket: 'dazeResistance', mode: 'add', value: 0.1 },
      ],
    })

    expect(result.total).toBeCloseTo(29.7)
    expect(result.displayRatio).toBe(49)
  })

  it('converts stun duration modifiers into speed deltas before resolution', () => {
    expect(convertDurationPercentToSpeedDelta(-0.4)).toBeCloseTo(0.6666666667)
    expect(convertDurationPercentToSpeedDelta(-0.4, 2)).toBeCloseTo(1.3333333333)

    const result = calculateDazeRecovery({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent(),
      modifiers: [
        { sourceId: 'duration', bucket: 'dazeRecoveryDurationPercent', mode: 'add', value: -0.4 },
      ],
    })

    expect(result.recoverySpeed).toBeCloseTo(1.6666666667)
    expect(result.recoveryDuration).toBeCloseTo(0.6)

    const nonDefaultBase = calculateDazeRecovery({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy({
        dazeState: {
          ...createEnemy().dazeState,
          recoverySpeed: 2,
        },
      })),
      event: createEvent(),
      modifiers: [
        { sourceId: 'duration', bucket: 'dazeRecoveryDurationPercent', mode: 'add', value: -0.4 },
      ],
    })

    expect(nonDefaultBase.recoverySpeed).toBeCloseTo(3.3333333333)
    expect(nonDefaultBase.recoveryDuration).toBeCloseTo(0.3)
  })

  it('resolves duration percent modifiers as a bucket before converting to speed', () => {
    const additive = calculateDazeRecovery({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent(),
      modifiers: [
        { sourceId: 'first', bucket: 'dazeRecoveryDurationPercent', mode: 'add', value: -0.2 },
        { sourceId: 'second', bucket: 'dazeRecoveryDurationPercent', mode: 'add', value: -0.2 },
      ],
    })
    const replaced = calculateDazeRecovery({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy({
        dazeState: {
          ...createEnemy().dazeState,
          recoverySpeed: 2,
        },
      })),
      event: createEvent(),
      modifiers: [
        { sourceId: 'ignored-add', bucket: 'dazeRecoveryDurationPercent', mode: 'add', value: -0.4 },
        { sourceId: 'replace', bucket: 'dazeRecoveryDurationPercent', mode: 'replace', value: 0.25 },
      ],
    })

    expect(additive.recoverySpeed).toBeCloseTo(1.6666666667)
    expect(additive.bucketTraces.dazeRecoveryDurationPercent.finalValue).toBeCloseTo(-0.4)
    expect(replaced.recoverySpeed).toBeCloseTo(1.6)
    expect(replaced.bucketTraces.dazeRecoveryDurationPercent.replacementSourceId).toBe('replace')
  })

  it('keeps fixed delay independent from speed changes', () => {
    const result = calculateDazeRecovery({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent(),
      modifiers: [
        { sourceId: 'duration', bucket: 'dazeRecoveryDurationPercent', mode: 'add', value: -0.4 },
      ],
    })

    expect(result.fixedRecoveryDelay).toBe(0.75)
  })
})

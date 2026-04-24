import { describe, expect, it } from 'vitest'

import { calculateDirectDamage, resolveAgentStats, resolveEnemyStats } from '../../packages/core/src/index.js'
import { createAgent, createEnemy, createEvent } from './fixtures.js'

describe('damage', () => {
  it('distinguishes regular, pierce, and true damage', () => {
    const actor = resolveAgentStats(createAgent())
    const enemy = resolveEnemyStats(createEnemy())
    const modifiers = [
      { sourceId: 'damage-bonus', bucket: 'damageBonus', mode: 'add' as const, value: 0.5 },
      { sourceId: 'crit-rate', bucket: 'critRate', mode: 'add' as const, value: 0.8 },
      { sourceId: 'crit-damage', bucket: 'critDamage', mode: 'add' as const, value: 0.5 },
      { sourceId: 'reduction', bucket: 'defenseReduction', mode: 'add' as const, value: 0.2 },
      { sourceId: 'pen-rate', bucket: 'defensePenetrationRate', mode: 'add' as const, value: 0.2 },
      { sourceId: 'pierce-bonus', bucket: 'pierceDamageBonus', mode: 'add' as const, value: 0.5 },
    ]

    const regular = calculateDirectDamage({
      actor,
      enemy,
      event: createEvent({ damageType: 'regular' }),
      modifiers,
    })
    const pierce = calculateDirectDamage({
      actor,
      enemy,
      event: createEvent({ damageType: 'pierce' }),
      modifiers,
    })
    const trueDamage = calculateDirectDamage({
      actor,
      enemy,
      event: createEvent({ damageType: 'true' }),
      modifiers,
    })

    expect(pierce.totalRaw).toBeGreaterThan(regular.totalRaw)
    expect(trueDamage.totalRaw).toBe(100)
  })

  it('applies crit defaults and clamp ranges', () => {
    const actor = createAgent({
      stats: {
        ...createAgent().stats,
        critRate: { base: 0.2 },
        critDamage: { base: 0.5 },
      },
    })
    const enemy = createEnemy({
      stats: {
        hp: { base: 1000 },
        defense: { base: 0 },
        impact: { base: 0 },
      },
    })
    const result = calculateDirectDamage({
      actor: resolveAgentStats(actor),
      enemy: resolveEnemyStats(enemy),
      event: createEvent({
        segments: [{ id: 'seg-1', damageMultiplier: 1 }],
      }),
      modifiers: [
        { sourceId: 'crit-rate', bucket: 'critRate', mode: 'add', value: 5 },
        { sourceId: 'crit-damage', bucket: 'critDamage', mode: 'add', value: 10 },
      ],
    })

    expect(result.critMultiplier).toBe(6)
  })

  it('keeps active and pre-daze vulnerability channels separate', () => {
    const actor = resolveAgentStats(createAgent())
    const modifiers = [
      { sourceId: 'active', bucket: 'dazedVulnerability', mode: 'add' as const, value: 1 },
      { sourceId: 'pre', bucket: 'preDazeVulnerability', mode: 'add' as const, value: 0.1 },
    ]

    const preDaze = calculateDirectDamage({
      actor,
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent(),
      modifiers,
    })
    const activeDaze = calculateDirectDamage({
      actor,
      enemy: resolveEnemyStats(createEnemy({
        dazeState: {
          ...createEnemy().dazeState,
          isDazed: true,
        },
      })),
      event: createEvent(),
      modifiers,
    })

    expect(activeDaze.totalRaw).toBeGreaterThan(preDaze.totalRaw)
  })

  it('rounds each segment up before summing display damage', () => {
    const actor = createAgent({
      stats: {
        ...createAgent().stats,
        attack: { base: 10 },
      },
    })
    const enemy = createEnemy({
      stats: {
        hp: { base: 1000 },
        defense: { base: 0 },
        impact: { base: 0 },
      },
    })
    const result = calculateDirectDamage({
      actor: resolveAgentStats(actor),
      enemy: resolveEnemyStats(enemy),
      event: createEvent({
        damageType: 'true',
        segments: [
          { id: 'seg-1', damageMultiplier: 0.11 },
          { id: 'seg-2', damageMultiplier: 0.11 },
        ],
      }),
      modifiers: [],
    })

    expect(result.totalRaw).toBeCloseTo(2.2)
    expect(result.totalDisplay).toBe(4)
  })
})

import { describe, expect, it } from 'vitest'

import { resolveAgentStats, resolveEnemyStats } from '../../packages/core/src/index.js'
import { createAgent, createEnemy } from './fixtures.js'

describe('stats', () => {
  it('resolves the documented initial/final stat pipeline', () => {
    const agent = createAgent({
      stats: {
        ...createAgent().stats,
        attack: {
          base: 100,
          initialPercentDelta: 0.2,
          initialFlatDelta: 10,
          finalPercentDelta: 0.5,
          finalFlatDelta: 5,
        },
      },
    })

    expect(resolveAgentStats(agent).stats.attack).toBe(200)
  })

  it('fills enemy defaults for omitted derived stats', () => {
    const enemy = createEnemy({
      stats: {
        hp: { base: 1000 },
        defense: { base: 200 },
        impact: { base: 0 },
      },
    })

    const resolved = resolveEnemyStats(enemy).stats
    expect(resolved.attack).toBe(0)
    expect(resolved.critRate).toBe(0)
    expect(resolved.critDamage).toBe(0)
  })
})

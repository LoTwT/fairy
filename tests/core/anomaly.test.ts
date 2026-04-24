import { describe, expect, it } from 'vitest'

import {
  buildVirtualAgent,
  calculateAnomalyBuildup,
  calculateAnomalyDamage,
  calculateDisorderDamage,
  resolveAgentStats,
  resolveEnemyStats,
} from '../../packages/core/src/index.js'
import { createAgent, createEnemy, createEvent } from './fixtures.js'

describe('anomaly', () => {
  it('floors anomaly mastery before buildup and isolates buildup resistance', () => {
    const actor = createAgent({
      stats: {
        ...createAgent().stats,
        anomalyMastery: { base: 123.8 },
        anomalyProficiency: { base: 0 },
      },
    })
    const enemy = createEnemy({
      modifiers: [
        { sourceId: 'damage-resistance', bucket: 'damageResistance', mode: 'add', value: 0.9 },
        { sourceId: 'daze-resistance', bucket: 'dazeResistance', mode: 'add', value: 0.9 },
        { sourceId: 'buildup-resistance', bucket: 'anomalyBuildupResistance', mode: 'add', value: 0.25 },
      ],
    })
    const result = calculateAnomalyBuildup({
      actor: resolveAgentStats(actor),
      enemy: resolveEnemyStats(enemy),
      event: createEvent({
        segments: [{ id: 'seg-1', anomalyBuildup: 100 }],
      }),
      modifiers: enemy.modifiers,
    })

    expect(result?.totalApplied).toBeCloseTo(84.225)
  })

  it('excludes overflow buildup from totalApplied and nextBuildup', () => {
    const result = calculateAnomalyBuildup({
      actor: resolveAgentStats(createAgent({
        stats: {
          ...createAgent().stats,
          anomalyMastery: { base: 0 },
          anomalyProficiency: { base: 0 },
        },
      })),
      enemy: resolveEnemyStats(createEnemy({
        anomalyState: {
          burn: {
            current: 95,
            threshold: 100,
            contributionHistory: [],
          },
        },
      })),
      event: createEvent({
        segments: [{ id: 'seg-1', anomalyBuildup: 20 }],
      }),
      modifiers: [],
    })

    expect(result?.totalApplied).toBe(5)
    expect(result?.nextBuildup).toBe(100)
    expect(result?.contributions[0]?.appliedBuildup).toBe(5)
  })

  it('builds the virtual agent from capped non-bangboo contributions and floors the level', () => {
    const virtualAgent = buildVirtualAgent([
      {
        sourceId: 'agent-a',
        sourceType: 'agent',
        appliedBuildup: 40,
        level: 60,
        anomalyMastery: 200,
        anomalyProficiency: 150,
        attack: 100,
        impact: 50,
        penetrationRate: 0.1,
        penetrationFlat: 10,
        resolvedDamageBonus: 0.4,
        resolvedOutgoingDazeBonus: 0.2,
      },
      {
        sourceId: 'bangboo',
        sourceType: 'bangboo',
        appliedBuildup: 999,
        level: 60,
        anomalyMastery: 999,
        anomalyProficiency: 999,
        attack: 999,
        impact: 999,
        penetrationRate: 999,
        penetrationFlat: 999,
        resolvedDamageBonus: 999,
        resolvedOutgoingDazeBonus: 999,
      },
      {
        sourceId: 'agent-b',
        sourceType: 'agent',
        appliedBuildup: 15,
        level: 57,
        anomalyMastery: 100,
        anomalyProficiency: 90,
        attack: 80,
        impact: 35,
        penetrationRate: 0.05,
        penetrationFlat: 5,
        resolvedDamageBonus: 0.1,
        resolvedOutgoingDazeBonus: 0.05,
      },
    ])

    expect(virtualAgent?.level).toBe(59)
    expect(virtualAgent?.attack).toBeCloseTo((40 * 100 + 15 * 80) / 55)
    expect(virtualAgent?.resolvedDamageBonus).toBeCloseTo((40 * 0.4 + 15 * 0.1) / 55)
  })

  it('resolves anomaly damage against live enemy multipliers', () => {
    const source = buildVirtualAgent([
      {
        sourceId: 'agent-a',
        sourceType: 'agent',
        appliedBuildup: 50,
        level: 60,
        anomalyMastery: 140,
        anomalyProficiency: 120,
        attack: 100,
        impact: 50,
        penetrationRate: 0,
        penetrationFlat: 10,
        resolvedDamageBonus: 0.2,
        resolvedOutgoingDazeBonus: 0.1,
      },
    ])!
    const event = createEvent()
    const enemy = resolveEnemyStats(createEnemy())
    const reducedEnemy = resolveEnemyStats(createEnemy({
      modifiers: [
        { sourceId: 'resistance', bucket: 'damageResistance', mode: 'add', value: 0.5 },
      ],
    }))

    const normal = calculateAnomalyDamage({
      source,
      enemy,
      event,
      anomalyType: 'burn',
      modifiers: [],
    })
    const reduced = calculateAnomalyDamage({
      source,
      enemy: reducedEnemy,
      event,
      anomalyType: 'burn',
      modifiers: reducedEnemy.modifiers,
    })

    expect(reduced.rawDamage).toBeLessThan(normal.rawDamage)
    expect(normal.levelRegion).toBe(1.6)
  })

  it('applies captured damage bonus when resolving anomaly and disorder damage', () => {
    const enemy = resolveEnemyStats(createEnemy())
    const event = createEvent()
    const source = {
      level: 60,
      anomalyMastery: 140,
      anomalyProficiency: 120,
      attack: 100,
      impact: 50,
      penetrationRate: 0,
      penetrationFlat: 10,
      resolvedDamageBonus: 0,
      resolvedOutgoingDazeBonus: 0.1,
    }
    const boostedSource = {
      ...source,
      resolvedDamageBonus: 0.5,
    }

    const anomalyBase = calculateAnomalyDamage({
      source,
      enemy,
      event,
      anomalyType: 'burn',
      modifiers: [],
    })
    const anomalyBoosted = calculateAnomalyDamage({
      source: boostedSource,
      enemy,
      event,
      anomalyType: 'burn',
      modifiers: [],
    })
    const disorderBase = calculateDisorderDamage({
      originalState: {
        current: 100,
        contributionHistory: [],
        virtualAgent: source,
      },
      enemy,
      event,
      modifiers: [],
    })
    const disorderBoosted = calculateDisorderDamage({
      originalState: {
        current: 100,
        contributionHistory: [],
        virtualAgent: boostedSource,
      },
      enemy,
      event,
      modifiers: [],
    })

    expect(anomalyBoosted.rawDamage).toBeCloseTo(anomalyBase.rawDamage * 1.5)
    expect(disorderBoosted?.rawDamage).toBeCloseTo(disorderBase!.rawDamage * 1.5)
  })

  it('applies captured penetration rate when resolving anomaly damage', () => {
    const event = createEvent()
    const enemy = resolveEnemyStats(createEnemy())

    const base = calculateAnomalyDamage({
      source: {
        level: 60,
        anomalyMastery: 140,
        anomalyProficiency: 120,
        attack: 100,
        impact: 50,
        penetrationRate: 0,
        penetrationFlat: 10,
        resolvedDamageBonus: 0.2,
        resolvedOutgoingDazeBonus: 0.1,
      },
      enemy,
      event,
      anomalyType: 'burn',
      modifiers: [],
    })
    const penetrated = calculateAnomalyDamage({
      source: {
        level: 60,
        anomalyMastery: 140,
        anomalyProficiency: 120,
        attack: 100,
        impact: 50,
        penetrationRate: 0.5,
        penetrationFlat: 10,
        resolvedDamageBonus: 0.2,
        resolvedOutgoingDazeBonus: 0.1,
      },
      enemy,
      event,
      anomalyType: 'burn',
      modifiers: [],
    })

    expect(penetrated.rawDamage).toBeGreaterThan(base.rawDamage)
  })

  it('keeps burn-only modifiers off disorder damage unless disorder is tagged too', () => {
    const result = calculateDisorderDamage({
      originalState: {
        current: 100,
        contributionHistory: [],
        virtualAgent: {
          level: 60,
          anomalyMastery: 150,
          anomalyProficiency: 120,
          attack: 100,
          impact: 40,
          penetrationRate: 0,
          penetrationFlat: 10,
          resolvedDamageBonus: 0,
          resolvedOutgoingDazeBonus: 0.2,
        },
      },
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent({
        tags: ['followUp'],
      }),
      modifiers: [
        { sourceId: 'burn-only', bucket: 'anomalyDamageBonus', mode: 'add', value: 2, tags: ['burn'] },
        { sourceId: 'disorder', bucket: 'anomalyDamageBonus', mode: 'add', value: 0.5, tags: ['disorder'] },
      ],
    })

    expect(result?.rawDamage).toBeGreaterThan(0)
    expect(result?.bucketTraces.anomalyDamageBonus.finalValue).toBe(0.5)
  })

  it('resolves disorder from the explicit overwritten anomaly state instead of hard-coded burn', () => {
    const enemy = createEnemy({
      anomalyState: {
        shock: {
          current: 100,
          contributionHistory: [],
          virtualAgent: {
            level: 60,
            anomalyMastery: 150,
            anomalyProficiency: 120,
            attack: 100,
            impact: 40,
            penetrationRate: 0.2,
            penetrationFlat: 10,
            resolvedDamageBonus: 0,
            resolvedOutgoingDazeBonus: 0.2,
          },
        },
      },
    })

    const result = calculateDisorderDamage({
      originalState: enemy.anomalyState!.shock!,
      enemy: resolveEnemyStats(enemy),
      event: createEvent({
        tags: ['followUp'],
      }),
      modifiers: [],
    })

    expect(result?.rawDamage).toBeGreaterThan(0)
  })
})

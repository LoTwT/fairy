import { describe, expect, it } from 'vitest'

import { evaluateFrameEvent } from '../../packages/core/src/index.js'
import {
  createAgent,
  createContext,
  createEnemy,
  createEvaluationFixture,
  createEvent,
  createTeam,
} from './fixtures.js'

describe('evaluateFrameEvent', () => {
  it('composes damage, daze, anomaly, resources, interrupt, and triggered outputs', () => {
    const fixture = createEvaluationFixture([
      {
        sourceId: 'team-buff',
        bucket: 'damageBonus',
        mode: 'add',
        value: 0.1,
        tags: ['fire'],
      },
    ])

    const result = evaluateFrameEvent(fixture)

    expect(result.damage?.totalRaw).toBeGreaterThan(0)
    expect(result.daze?.total).toBeGreaterThan(0)
    expect(result.anomalyBuildup?.triggered).toBe(true)
    expect(result.anomalyDamage?.rawDamage).toBeGreaterThan(0)
    expect(result.resources?.energy).toBeGreaterThan(0)
    expect(result.interrupt?.effectiveLevel).toBe(60)
    expect(result.triggeredOutputs).toEqual([
      expect.objectContaining({
        id: 'part-break',
        sourceId: 'part-break',
        damage: 50,
        daze: 12.5,
      }),
    ])
  })

  it('applies battle context distance decay through aggregate evaluation', () => {
    const fixture = createEvaluationFixture()
    fixture.enemy.anomalyState = {
      burn: {
        current: 0,
        threshold: 100,
        contributionHistory: [],
      },
    }
    const baseline = evaluateFrameEvent(fixture)
    fixture.context = {
      ...fixture.context,
      distanceDecay: 0.5,
    }
    const decayed = evaluateFrameEvent(fixture)

    expect(decayed.daze?.total).toBeLessThan(baseline.daze!.total)
    expect(decayed.anomalyBuildup?.totalApplied).toBeLessThan(baseline.anomalyBuildup!.totalApplied)
    expect(decayed.bucketTraces.distanceDecay.operations.some(operation =>
      operation.sourceId === 'battle-context-distance-decay' && operation.applied,
    )).toBe(true)
  })

  it('applies attribute aliases through aggregate bucket matching', () => {
    const frost = evaluateFrameEvent({
      team: {
        ...createTeam(createAgent({ modifiers: [] })),
        modifiers: [
          { sourceId: 'ice-damage', bucket: 'damageBonus', mode: 'add', value: 0.5, tags: ['ice'] },
          { sourceId: 'ice-daze', bucket: 'outgoingDazeBonus', mode: 'add', value: 0.25, tags: ['ice'] },
          { sourceId: 'ice-energy', bucket: 'energyGainEfficiency', mode: 'add', value: 0.5, tags: ['ice'] },
          { sourceId: 'ice-buildup-resistance', bucket: 'anomalyBuildupResistance', mode: 'add', value: 0.2, tags: ['ice'] },
        ],
      },
      enemy: createEnemy({
        anomalyState: {
          freeze: {
            current: 0,
            threshold: 110,
            contributionHistory: [],
          },
        },
      }),
      context: createContext(),
      event: createEvent({
        attribute: 'frost',
        anomalyType: 'freeze',
        tags: ['basic'],
        segments: [
          {
            id: 'seg-1',
            damageMultiplier: 1,
            dazeMultiplier: 1,
            anomalyBuildup: 10,
            energyGain: 5,
          },
        ],
      }),
    })
    const auricInk = evaluateFrameEvent({
      team: {
        ...createTeam(createAgent({ modifiers: [] })),
        modifiers: [
          { sourceId: 'ether-damage', bucket: 'damageBonus', mode: 'add', value: 0.4, tags: ['ether'] },
          { sourceId: 'ether-energy', bucket: 'energyGainEfficiency', mode: 'add', value: 0.75, tags: ['ether'] },
        ],
      },
      enemy: createEnemy(),
      context: createContext(),
      event: createEvent({
        attribute: 'auricInk',
        tags: ['basic'],
      }),
    })

    expect(frost.bucketTraces.damageBonus.finalValue).toBe(0.5)
    expect(frost.bucketTraces.outgoingDazeBonus.finalValue).toBe(0.25)
    expect(frost.bucketTraces.energyGainEfficiency.finalValue).toBe(0.5)
    expect(frost.bucketTraces.anomalyBuildupResistance.finalValue).toBe(0.2)
    expect(auricInk.bucketTraces.damageBonus.finalValue).toBe(0.4)
    expect(auricInk.bucketTraces.energyGainEfficiency.finalValue).toBe(0.75)
  })

  it('uses the explicit disorder source anomaly in the aggregate evaluator', () => {
    const fixture = createEvaluationFixture()
    fixture.enemy.anomalyState = {
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
    }
    fixture.event = {
      ...fixture.event,
      anomalyType: undefined,
      disorderSourceAnomaly: 'shock',
      tags: ['followUp'],
      segments: [{ id: 'seg-1' }],
      triggeredOutputs: [],
    }

    const result = evaluateFrameEvent(fixture)

    expect(result.disorder?.rawDamage).toBeGreaterThan(0)
  })
})

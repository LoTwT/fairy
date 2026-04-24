import { describe, expect, it } from 'vitest'

import {
  calculateCorruptionBurst,
  calculateCorruptionGain,
  calculateEnergyGain,
  calculateFlashGain,
  calculateNoiseGain,
  calculateResources,
  calculateShieldReduction,
  calculateStatusDuration,
  resolveAgentStats,
  resolveEnemyStats,
} from '../../packages/core/src/index.js'
import { createAgent, createBangboo, createEnemy, createEvent } from './fixtures.js'

describe('resources', () => {
  it('calculates energy, flash, noise, and corruption gains through efficiency buckets', () => {
    const actor = resolveAgentStats(createAgent())
    const enemy = resolveEnemyStats(createEnemy())
    const event = createEvent()
    const modifiers = [
      { sourceId: 'energy', bucket: 'energyGainEfficiency', mode: 'add' as const, value: 0.5 },
      { sourceId: 'flash', bucket: 'flashGainEfficiency', mode: 'add' as const, value: 0.25 },
      { sourceId: 'noise', bucket: 'noiseGainEfficiency', mode: 'add' as const, value: 1 },
      { sourceId: 'corruption', bucket: 'corruptionGainEfficiency', mode: 'add' as const, value: 0.5 },
    ]

    expect(calculateEnergyGain({ actor, enemy, event, modifiers })).toBe(7.5)
    expect(calculateFlashGain({ actor, enemy, event, modifiers })).toBe(5)
    expect(calculateNoiseGain({ actor, enemy, event, modifiers })).toBe(6)
    expect(calculateCorruptionGain({ actor, enemy, event, modifiers })).toBe(3)
    expect(calculateCorruptionBurst({ actor, enemy, event, modifiers })).toBeCloseTo(4.032)
  })

  it('keeps bangboo out of shield reduction where excluded', () => {
    const enemy = resolveEnemyStats(createEnemy())
    const event = createEvent()

    const agentResult = calculateShieldReduction({
      actor: resolveAgentStats(createAgent()),
      enemy,
      event,
      modifiers: [],
    })
    const bangbooResult = calculateShieldReduction({
      actor: resolveAgentStats(createBangboo()),
      enemy,
      event: {
        ...event,
        sourceType: 'agent',
        sourceId: 'bangboo-1',
      },
      modifiers: [],
    })

    expect(agentResult.shieldReduction).toBeGreaterThan(0)
    expect(bangbooResult.shieldReduction).toBe(0)
  })

  it('returns resource efficiency bucket traces', () => {
    const result = calculateResources({
      actor: resolveAgentStats(createAgent()),
      enemy: resolveEnemyStats(createEnemy()),
      event: createEvent(),
      modifiers: [
        { sourceId: 'energy', bucket: 'energyGainEfficiency', mode: 'add', value: 0.5 },
        { sourceId: 'flash', bucket: 'flashGainEfficiency', mode: 'add', value: 0.25 },
        { sourceId: 'noise', bucket: 'noiseGainEfficiency', mode: 'add', value: 1 },
        { sourceId: 'corruption', bucket: 'corruptionGainEfficiency', mode: 'add', value: 0.5 },
      ],
    })

    expect(result.bucketTraces.energyGainEfficiency.finalValue).toBe(0.5)
    expect(result.bucketTraces.flashGainEfficiency.finalValue).toBe(0.25)
    expect(result.bucketTraces.noiseGainEfficiency.finalValue).toBe(1)
    expect(result.bucketTraces.corruptionGainEfficiency.finalValue).toBe(0.5)
    expect(result.bucketTraces.shieldReductionEfficiency.finalValue).toBe(0)
  })

  it('dispatches status duration formulas explicitly', () => {
    const freeze = calculateStatusDuration({
      kind: 'freeze',
      baseDuration: 4,
      durationBonus: 0.5,
    })
    const burn = calculateStatusDuration({
      kind: 'burn',
      baseDuration: 10,
      anomalyMastery: 150,
      anomalyProficiency: 100,
      durationBonus: 0.2,
    })

    expect(freeze.duration).toBe(6)
    expect(burn.duration).toBeCloseTo(15.18)
  })
})

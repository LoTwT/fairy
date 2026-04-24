import { describe, expect, it } from 'vitest'

import { resolveBucket, resolveDefenseArea } from '../../packages/core/src/index.js'

describe('modifiers', () => {
  it('resolves add, subtract, replace, and force with a trace', () => {
    const result = resolveBucket({
      bucket: 'damageBonus',
      base: 1,
      modifiers: [
        { sourceId: 'add', bucket: 'damageBonus', mode: 'add', value: 0.3 },
        { sourceId: 'subtract', bucket: 'damageBonus', mode: 'subtract', value: 0.1 },
        { sourceId: 'replace', bucket: 'damageBonus', mode: 'replace', value: 2 },
        {
          sourceId: 'force',
          bucket: 'damageBonus',
          mode: 'force',
          value: 4,
          exitCondition: 'phase-end',
        },
      ],
    })

    expect(result.value).toBe(4)
    expect(result.trace.preReplacementValue).toBeCloseTo(1.2)
    expect(result.trace.replacementSourceId).toBe('replace')
    expect(result.trace.forcedOverrideSourceId).toBe('force')
    expect(result.trace.forcedOverrideExitCondition).toBe('phase-end')
  })

  it('clamps bucket output after replacement logic', () => {
    const result = resolveBucket({
      bucket: 'critRate',
      base: 0.4,
      modifiers: [
        { sourceId: 'boost', bucket: 'critRate', mode: 'add', value: 2 },
      ],
    })

    expect(result.value).toBe(1)
    expect(result.trace.preClampValue).toBe(2.4)
  })

  it('composes structured defense groups deterministically', () => {
    const result = resolveDefenseArea({
      attackerLevel: 60,
      enemyDefense: 200,
      penetrationFlat: 5,
      modifiers: [
        { sourceId: 'reduction', bucket: 'defenseReduction', mode: 'add', value: 0.2 },
        { sourceId: 'rate', bucket: 'defensePenetrationRate', mode: 'add', value: 0.25 },
        { sourceId: 'flat', bucket: 'defensePenetrationFlat', mode: 'add', value: 5 },
      ],
    })

    expect(result.effectiveDefense).toBeCloseTo(110)
    expect(result.multiplier).toBeGreaterThan(0)
    expect(result.multiplier).toBeLessThan(1)
  })
})

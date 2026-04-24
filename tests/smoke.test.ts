import { describe, expect, it, vi } from 'vitest'

import { NOT_IMPLEMENTED_MESSAGE, run } from '../packages/cli/src/index.js'
import * as core from '../packages/core/src/index.js'
import { DATA_VERSION } from '../packages/data/src/index.js'
import { createEvaluationFixture } from './core/fixtures.js'

describe('repo scaffold smoke tests', () => {
  it('exports the data placeholder version', () => {
    expect(DATA_VERSION).toBe('0.0.0')
  })

  it('exports the core public entry points and evaluates deterministically', () => {
    expect(core.evaluateFrameEvent).toBeTypeOf('function')
    expect(core.calculateDirectDamage).toBeTypeOf('function')
    expect(core.calculateStatusDuration).toBeTypeOf('function')

    const fixture = createEvaluationFixture()
    const first = core.evaluateFrameEvent(fixture)
    const second = core.evaluateFrameEvent(fixture)

    expect(second).toEqual(first)
  })

  it('prints the CLI placeholder message', () => {
    const log = vi.fn()
    const result = run({ log })

    expect(result).toBe(NOT_IMPLEMENTED_MESSAGE)
    expect(log).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(NOT_IMPLEMENTED_MESSAGE)
  })
})

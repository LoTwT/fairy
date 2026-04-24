import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

function toModuleUrl(path) {
  return pathToFileURL(resolve(path)).href
}

async function main() {
  const dataModule = await import(toModuleUrl('packages/data/dist/index.js'))
  const coreModule = await import(toModuleUrl('packages/core/dist/index.js'))
  const cliModule = await import(toModuleUrl('packages/cli/dist/index.js'))

  if (dataModule.DATA_VERSION !== '0.0.0') {
    throw new Error('Unexpected DATA_VERSION export from built data package')
  }

  if (typeof coreModule.evaluateFrameEvent !== 'function') {
    throw new TypeError('Built core package is missing evaluateFrameEvent()')
  }

  const minimalFixture = {
    team: {
      agents: [
        {
          id: 'agent-1',
          sourceType: 'agent',
          level: 60,
          stats: {
            attack: { base: 100 },
            hp: { base: 1000 },
            defense: { base: 100 },
            impact: { base: 50 },
            pierceForce: { base: 10 },
            anomalyProficiency: { base: 120 },
            anomalyMastery: { base: 140 },
            energyRegen: { base: 1 },
            flashRegen: { base: 1 },
            critRate: { base: 0.2 },
            critDamage: { base: 0.5 },
          },
          modifiers: [],
          resources: {},
        },
        {
          id: 'agent-2',
          sourceType: 'agent',
          level: 60,
          stats: {
            attack: { base: 80 },
            hp: { base: 1000 },
            defense: { base: 100 },
            impact: { base: 40 },
            pierceForce: { base: 0 },
            anomalyProficiency: { base: 0 },
            anomalyMastery: { base: 0 },
            energyRegen: { base: 1 },
            flashRegen: { base: 1 },
            critRate: { base: 0.05 },
            critDamage: { base: 0.5 },
          },
          modifiers: [],
          resources: {},
        },
        {
          id: 'agent-3',
          sourceType: 'agent',
          level: 60,
          stats: {
            attack: { base: 80 },
            hp: { base: 1000 },
            defense: { base: 100 },
            impact: { base: 40 },
            pierceForce: { base: 0 },
            anomalyProficiency: { base: 0 },
            anomalyMastery: { base: 0 },
            energyRegen: { base: 1 },
            flashRegen: { base: 1 },
            critRate: { base: 0.05 },
            critDamage: { base: 0.5 },
          },
          modifiers: [],
          resources: {},
        },
      ],
      frontLineAgentId: 'agent-1',
      modifiers: [],
    },
    enemy: {
      id: 'enemy-1',
      level: 60,
      stats: {
        hp: { base: 5000 },
        defense: { base: 200 },
        impact: { base: 0 },
      },
      modifiers: [],
      dazeState: {
        current: 20,
        limit: 100,
        isDazed: false,
        recoverySpeed: 1,
        fixedRecoveryDelay: 0.75,
      },
      anomalyState: {
        burn: {
          current: 95,
          threshold: 100,
          contributionHistory: [],
        },
      },
      shieldState: {
        current: 150,
      },
      interruptState: {
        antiInterruptLevel: 30,
        modifiers: [],
      },
    },
    context: {
      frontLineAgentId: 'agent-1',
      modifiers: [],
    },
    event: {
      id: 'event-1',
      sourceId: 'agent-1',
      sourceType: 'agent',
      attribute: 'fire',
      damageType: 'regular',
      anomalyType: 'burn',
      tags: ['special'],
      baseInterruptLevel: 0,
      modifiers: [],
      segments: [
        {
          id: 'seg-1',
          damageMultiplier: 1,
          dazeMultiplier: 1,
          anomalyBuildup: 10,
          energyGain: 5,
          flashGain: 4,
          noiseGain: 3,
          shieldReduction: 0.5,
          corruptionGain: 2,
        },
      ],
      triggeredOutputs: [],
    },
  }

  const first = coreModule.evaluateFrameEvent(minimalFixture)
  const second = coreModule.evaluateFrameEvent(minimalFixture)

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error('Built core evaluator is not deterministic')
  }

  if (cliModule.NOT_IMPLEMENTED_MESSAGE !== 'fairy CLI is not yet implemented.') {
    throw new Error('Unexpected CLI placeholder export from built CLI package')
  }

  const cliEntry = await readFile(resolve('packages/cli/dist/index.js'), 'utf8')

  if (!cliEntry.startsWith('#!/usr/bin/env node')) {
    throw new Error('Built CLI entry is missing the expected shebang')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

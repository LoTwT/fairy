import type {
  ActionEvent,
  AgentFrameSnapshot,
  BattleContext,
  EnemyFrameSnapshot,
  ModifierOperation,
  StatFormulaInput,
  TeamFrameSnapshot,
} from '../../packages/core/src/index.js'

function stat(base: number, overrides: Partial<StatFormulaInput> = {}): StatFormulaInput {
  return {
    base,
    ...overrides,
  }
}

export function createAgent(overrides: Partial<AgentFrameSnapshot> = {}): AgentFrameSnapshot {
  const base: AgentFrameSnapshot = {
    id: 'agent-1',
    sourceType: 'agent',
    level: 60,
    stats: {
      attack: stat(100),
      hp: stat(1000),
      defense: stat(100),
      impact: stat(50),
      pierceForce: stat(10),
      anomalyProficiency: stat(120),
      anomalyMastery: stat(140),
      energyRegen: stat(1),
      flashRegen: stat(1),
      critRate: stat(0.2),
      critDamage: stat(0.5),
    },
    modifiers: [],
    resources: {
      energy: 0,
      flash: 0,
      noise: 0,
      corruption: 0,
    },
  }

  return {
    ...base,
    ...overrides,
    stats: overrides.stats ?? base.stats,
    modifiers: overrides.modifiers ?? base.modifiers,
    resources: overrides.resources ?? base.resources,
  }
}

export function createBangboo(overrides: Partial<AgentFrameSnapshot> = {}): AgentFrameSnapshot {
  return createAgent({
    id: 'bangboo-1',
    sourceType: 'bangboo',
    level: 60,
    stats: {
      attack: stat(40),
      hp: stat(300),
      defense: stat(40),
      impact: stat(20),
      pierceForce: stat(0),
      anomalyProficiency: stat(60),
      anomalyMastery: stat(60),
      energyRegen: stat(1),
      flashRegen: stat(1),
      critRate: stat(0.05),
      critDamage: stat(0.25),
    },
    ...overrides,
  })
}

export function createEnemy(overrides: Partial<EnemyFrameSnapshot> = {}): EnemyFrameSnapshot {
  const base: EnemyFrameSnapshot = {
    id: 'enemy-1',
    level: 60,
    stats: {
      hp: stat(5000),
      defense: stat(200),
      impact: stat(0),
      critRate: stat(0),
      critDamage: stat(0),
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
        current: 0,
        contributionHistory: [],
      },
    },
    shieldState: {
      current: 150,
      purgeDamageMultiplier: 0.6,
    },
    interruptState: {
      antiInterruptLevel: 30,
      modifiers: [],
    },
  }

  return {
    ...base,
    ...overrides,
    stats: overrides.stats ?? base.stats,
    modifiers: overrides.modifiers ?? base.modifiers,
    dazeState: overrides.dazeState ?? base.dazeState,
    anomalyState: overrides.anomalyState ?? base.anomalyState,
    shieldState: overrides.shieldState ?? base.shieldState,
    interruptState: overrides.interruptState ?? base.interruptState,
  }
}

export function createTeam(
  actor: AgentFrameSnapshot = createAgent(),
  teammateModifiers: readonly ModifierOperation[] = [],
): TeamFrameSnapshot {
  const teammateA = createAgent({
    id: 'agent-2',
    modifiers: teammateModifiers,
  })
  const teammateB = createAgent({
    id: 'agent-3',
  })

  return {
    agents: [actor, teammateA, teammateB],
    frontLineAgentId: actor.id,
    modifiers: [],
  }
}

export function createContext(overrides: Partial<BattleContext> = {}): BattleContext {
  return {
    distanceDecay: 0,
    frontLineAgentId: 'agent-1',
    modifiers: [],
    ...overrides,
    modifiers: overrides.modifiers ?? [],
  }
}

export function createEvent(overrides: Partial<ActionEvent> = {}): ActionEvent {
  const base: ActionEvent = {
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
        purgeDamageMultiplier: 0.8,
      },
    ],
    triggeredOutputs: [],
  }

  return {
    ...base,
    ...overrides,
    modifiers: overrides.modifiers ?? base.modifiers,
    segments: overrides.segments ?? base.segments,
    tags: overrides.tags ?? base.tags,
    triggeredOutputs: overrides.triggeredOutputs ?? base.triggeredOutputs,
  }
}

export function createEvaluationFixture(teamModifiers: readonly ModifierOperation[] = []): {
  team: TeamFrameSnapshot
  enemy: EnemyFrameSnapshot
  context: BattleContext
  event: ActionEvent
} {
  const actor = createAgent({
    modifiers: [
      {
        sourceId: 'self-damage',
        bucket: 'damageBonus',
        mode: 'add',
        value: 0.25,
        tags: ['fire', 'special'],
      },
      {
        sourceId: 'self-daze',
        bucket: 'outgoingDazeBonus',
        mode: 'add',
        value: 0.1,
      },
    ],
  })
  const enemy = createEnemy({
    modifiers: [
      {
        sourceId: 'enemy-vulnerability',
        bucket: 'vulnerability',
        mode: 'add',
        value: 0.15,
      },
    ],
    anomalyState: {
      burn: {
        current: 95,
        threshold: 100,
        contributionHistory: [],
      },
    },
  })
  const event = createEvent({
    segments: [
      {
        id: 'seg-1',
        damageMultiplier: 1.1,
        dazeMultiplier: 0.8,
        anomalyBuildup: 12,
        energyGain: 5,
        flashGain: 2,
        noiseGain: 3,
        shieldReduction: 0.75,
        corruptionGain: 1,
      },
      {
        id: 'seg-2',
        damageMultiplier: 0.6,
        dazeMultiplier: 0.4,
        anomalyBuildup: 8,
      },
    ],
    triggeredOutputs: [
      {
        id: 'part-break',
        sourceId: 'part-break',
        label: 'Part Break',
        damageMultiplier: 0.5,
        dazeMultiplier: 0.25,
      },
    ],
  })

  return {
    team: createTeam(actor, teamModifiers),
    enemy,
    context: createContext(),
    event,
  }
}

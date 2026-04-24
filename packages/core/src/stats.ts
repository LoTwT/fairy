import type {
  AgentFrameSnapshot,
  EnemyFrameSnapshot,
  ResolvedAgentFrameSnapshot,
  ResolvedEnemyFrameSnapshot,
  ResolvedStats,
  StatFormulaInput,
} from './types.js'
import {
  DEFAULT_AGENT_CRIT_DAMAGE,
  DEFAULT_AGENT_CRIT_RATE,
  DEFAULT_ENEMY_CRIT_DAMAGE,
  DEFAULT_ENEMY_CRIT_RATE,
} from './constants.js'

function resolveStatValue(input: StatFormulaInput | undefined, fallbackBase = 0): number {
  const base = input?.base ?? fallbackBase
  const initial = base * (1 + (input?.initialPercentDelta ?? 0)) + (input?.initialFlatDelta ?? 0)
  return initial * (1 + (input?.finalPercentDelta ?? 0)) + (input?.finalFlatDelta ?? 0)
}

export function resolveAgentStats(agent: AgentFrameSnapshot): ResolvedAgentFrameSnapshot {
  const stats: ResolvedStats = {
    attack: resolveStatValue(agent.stats.attack),
    hp: resolveStatValue(agent.stats.hp),
    defense: resolveStatValue(agent.stats.defense),
    impact: resolveStatValue(agent.stats.impact),
    pierceForce: resolveStatValue(agent.stats.pierceForce),
    anomalyProficiency: resolveStatValue(agent.stats.anomalyProficiency),
    anomalyMastery: resolveStatValue(agent.stats.anomalyMastery),
    energyRegen: resolveStatValue(agent.stats.energyRegen, 1),
    flashRegen: resolveStatValue(agent.stats.flashRegen, 1),
    critRate: resolveStatValue(agent.stats.critRate, DEFAULT_AGENT_CRIT_RATE),
    critDamage: resolveStatValue(agent.stats.critDamage, DEFAULT_AGENT_CRIT_DAMAGE),
  }

  return {
    ...agent,
    stats,
  }
}

export function resolveEnemyStats(enemy: EnemyFrameSnapshot): ResolvedEnemyFrameSnapshot {
  const stats: ResolvedStats = {
    attack: resolveStatValue(enemy.stats.attack),
    hp: resolveStatValue(enemy.stats.hp),
    defense: resolveStatValue(enemy.stats.defense),
    impact: resolveStatValue(enemy.stats.impact),
    pierceForce: 0,
    anomalyProficiency: 0,
    anomalyMastery: 0,
    energyRegen: 1,
    flashRegen: 1,
    critRate: resolveStatValue(enemy.stats.critRate, DEFAULT_ENEMY_CRIT_RATE),
    critDamage: resolveStatValue(enemy.stats.critDamage, DEFAULT_ENEMY_CRIT_DAMAGE),
  }

  return {
    ...enemy,
    stats,
  }
}

import { describe, expect, it } from "vitest"
import {
  agentSourceIds,
  loadStaticCalculationData,
  resolveAgentAction,
} from "../src/index.ts"
import { calculateStaticActionDamage } from "../../core/src/index.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/index.ts"

const ZHAO = agentSourceIds.Zhao
const emptyDiscs = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
} as const

const actions = [
  {
    suffix: "0006",
    baseMultiplier: 7.324,
    healthMultiplierPerCharge: 0.24,
    nonCriticalAtZero: 7324,
    nonCriticalAtFive: 8524,
  },
  {
    suffix: "0012",
    baseMultiplier: 1.401,
    healthMultiplierPerCharge: 0.24,
    nonCriticalAtZero: 1401,
    nonCriticalAtFive: 2601,
  },
  {
    suffix: "0013",
    baseMultiplier: 15.419,
    healthMultiplierPerCharge: 0.24,
    nonCriticalAtZero: 15419,
    nonCriticalAtFive: 16619,
  },
] as const

function zhaoActor(): StaticActorConfiguration {
  return {
    entityId: "entity:zhao",
    teamId: "team:players",
    agentEntityId: ZHAO,
    coreSkillLevel: 7,
    mindscapeRank: 0,
    skillLevels: {
      basic: { mode: "effective", value: 12 },
      dodge: { mode: "effective", value: 12 },
      assist: { mode: "effective", value: 12 },
      special: { mode: "effective", value: 12 },
      chain: { mode: "effective", value: 12 },
    },
    wEngine: null,
    driveDiscs: emptyDiscs,
    panel: {
      mode: "out-of-combat",
      stats: {
        health: { unit: "health-points", value: 1000 },
        attack: { unit: "attack-points", value: 1000 },
        criticalRate: { unit: "ratio", value: 0 },
        criticalDamage: { unit: "ratio", value: 0.5 },
        penetrationRatio: { unit: "ratio", value: 0 },
      },
      penetrationValue: 0,
      damageBonuses: { ice: 0 },
    },
  }
}

async function baseInput(
  data: Awaited<ReturnType<typeof loadStaticCalculationData>>,
  suffix: string,
  chargeSeconds: number,
): Promise<StaticActionCalculationInput> {
  const agent = data.agents[0]!.actions
  const action = resolveAgentAction({
    agent,
    actionId: `action:agent:${ZHAO}:action:${suffix}`,
    mindscapeRank: 0,
    levels: {
      basic: { mode: "effective", value: 12 },
      dodge: { mode: "effective", value: 12 },
      assist: { mode: "effective", value: 12 },
      special: { mode: "effective", value: 12 },
      chain: { mode: "effective", value: 12 },
    },
    inputs: { chargeSeconds },
  })
  expect(action.ok, JSON.stringify(action)).toBe(true)
  if (!action.ok) throw new Error(JSON.stringify(action.issues))
  return {
    data,
    actors: [zhaoActor()],
    actorId: "entity:zhao",
    action,
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 0,
      resistances: { ice: 0 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [],
  }
}

describe("Zhao charged actions through the public static entry", () => {
  it.each(actions)(
    "settles $suffix with chargeSeconds=0 and 5 without leaking resolve metadata",
    async (spec) => {
      const data = await loadStaticCalculationData({
        agents: [ZHAO],
        wEngines: [],
      })
      for (const [chargeSeconds, expected] of [
        [0, spec.nonCriticalAtZero],
        [5, spec.nonCriticalAtFive],
      ] as const) {
        const result = calculateStaticActionDamage(
          await baseInput(data, spec.suffix, chargeSeconds),
        )
        expect(result.ok, JSON.stringify(result)).toBe(true)
        if (!result.ok || result.value.kind !== "damage")
          throw new Error(JSON.stringify(result))
        const segment = result.value.segments[0]!
        const items = segment.damage.evaluation.hit!.damageItems
        expect(items).toHaveLength(2)
        expect(items[0]!.damageMultiplier).toBeCloseTo(spec.baseMultiplier, 10)
        expect(items[1]!.damageMultiplier).toBeCloseTo(
          spec.healthMultiplierPerCharge * chargeSeconds,
          10,
        )
        for (const item of items)
          expect(
            (item as unknown as Record<string, unknown>).multiplyByInput,
          ).toBeUndefined()
        expect(result.value.totals.nonCritical).toBeCloseTo(expected, 8)
        expect(result.value.totals.expected).toBeCloseTo(expected, 8)
        expect(result.value.totals.displayedNonCritical).toBeNull()
      }
    },
  )
})

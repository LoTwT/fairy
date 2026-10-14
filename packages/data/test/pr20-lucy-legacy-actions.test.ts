import assert from "node:assert/strict"
import { describe, expect, it } from "vitest"
import * as data from "../src/index.ts"
import * as core from "../../core/src/index.ts"

const loaded = await data.loadStaticCalculationData({
  agents: ["Lucy"],
  wEngines: [],
})
const agent = loaded.agents[0]!.actions
const ids = Array.from(
  { length: 22 },
  (_, i) => "action:agent:1151:action:" + String(i + 1).padStart(4, "0"),
)
assert.deepEqual(agent.actions.map((a) => a.actionId).sort(), ids)
const base = {
  data: loaded,
  actors: [
    {
      entityId: "entity:lucy",
      teamId: "team:players",
      agentEntityId: "1151",
      coreSkillLevel: 1,
      mindscapeRank: 0,
      skillLevels: { special: { mode: "effective", value: 12 } },
      wEngine: null,
      driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      panel: {
        mode: "out-of-combat",
        stats: {
          attack: { unit: "attack-points", value: 1173.25 },
          criticalRate: { unit: "ratio", value: 0.37 },
          criticalDamage: { unit: "ratio", value: 0.83 },
          penetrationRatio: { unit: "ratio", value: 0.17 },
        },
        penetrationValue: 23.4,
        damageBonuses: { fire: 0.173, physical: 0.891 },
      },
    },
  ],
  actorId: "entity:lucy",
  target: {
    entityId: "entity:enemy",
    teamId: "team:enemies",
    baseDefense: 833.7,
    resistances: { fire: 0.23, physical: 0.79 },
    isStunned: true,
    baseStunDamageMultiplier: 1.75,
  },
  selections: [],
}
function resolve(id: string, rank: number, level: number) {
  const r = data.resolveAgentAction({
    agent,
    actionId: id,
    mindscapeRank: rank as 0 | 6,
    levels: Object.fromEntries(
      ["basic", "dodge", "assist", "special", "chain"].map((k) => [
        k,
        { mode: "effective" as const, value: level },
      ]),
    ),
  })
  assert.equal(r.ok, true, JSON.stringify(r))
  return r
}
function calculate(input: unknown) {
  const before = JSON.stringify(input)
  const r = core.calculateStaticActionDamage(
    input as core.StaticActionCalculationInput,
  )
  assert.equal(JSON.stringify(input), before)
  assert.equal(r.ok, true, JSON.stringify(r))
  return r.value
}

const buffs = [
  "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk",
  "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r",
  "agents:lucy:mindscape:4:blk-legacy:legacy-team-critDmg",
]
const source =
  "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0:source"
const rows = [
  ["0011", [0.925, 1.86, 2.2]],
  ["0012", [1.275, 2.551, 3.015]],
  ["0013", [1.75, 3.51, 4.15]],
  ["0014", [2.5, 5.008, 5.92]],
] as const
const zone = ((1.173 * 794) / (794 + 833.7 * 0.83 - 23.4)) * 0.77 * 1.75

describe("Lucy legacy action identity and fire panel proxies", () => {
  it.each(ids)(
    "resolves %s and preserves its classification and nonempty items",
    (id) => {
      const action = resolve(id, 0, 12),
        result = calculate({ ...base, action })
      const isDaze = ["0002", "0003", "0004"].some((s) => id.endsWith(s))
      expect(result.kind).toBe(isDaze ? "daze-only" : "damage")
      if (!isDaze) {
        assert.equal(result.kind, "damage")
        expect(result.segments.length).toBeGreaterThan(0)
        for (const segment of result.segments) {
          expect(
            segment.damage.evaluation.hit!.damageItems.length,
          ).toBeGreaterThan(0)
          expect(segment.damage.nonCritical).toBeGreaterThan(0)
        }
      }
    },
  )
  it("locks the 19 damage and 3 daze rows", () => {
    const actions = ids.map((id) => resolve(id, 0, 12))
    expect(actions.filter((a) => a.calculation.kind === "damage")).toHaveLength(
      19,
    )
    expect(
      actions.filter((a) => a.calculation.kind === "daze-only"),
    ).toHaveLength(3)
  })
  it.each(
    rows.flatMap(([suffix, mults]) =>
      [1, 12, 16].map((level, index) => ({
        suffix,
        level,
        multiplier: mults[index]!,
      })),
    ),
  )(
    "$suffix L$level retains the fire proxy independent of core rank",
    ({ suffix, level, multiplier }) => {
      const rank = level === 16 ? 6 : 0,
        action = resolve("action:agent:1151:action:" + suffix, rank, level)
      assert.equal(action.calculation.kind, "damage")
      expect(action.calculation.segments[0]).toMatchObject({
        element: "fire",
        repeat: 1,
        granularity: "aggregate",
      })
      const results = []
      for (const coreSkillLevel of [1, 7]) {
        const input = {
            ...base,
            action,
            actors: [
              { ...base.actors[0]!, mindscapeRank: rank, coreSkillLevel },
            ],
          },
          result = calculate(input)
        assert.equal(result.kind, "damage")
        expect(result.segments).toHaveLength(1)
        expect(result.totals.nonCritical).toBeCloseTo(
          1173.25 * multiplier * zone,
          8,
        )
        const changedPhysical = calculate({
          ...input,
          target: {
            ...input.target,
            resistances: { ...input.target.resistances, physical: -0.99 },
          },
          actors: [
            {
              ...input.actors[0]!,
              panel: {
                ...input.actors[0]!.panel,
                damageBonuses: { fire: 0.173, physical: 1.991 },
              },
            },
          ],
        })
        assert.equal(changedPhysical.kind, "damage")
        expect(changedPhysical.totals).toEqual(result.totals)
        results.push(result.totals)
      }
      expect(results[0]).toEqual(results[1])
    },
  )
  it.each(
    [1, 7].flatMap((coreSkillLevel) =>
      [false, true].map((enabled) => ({ coreSkillLevel, enabled })),
    ),
  )(
    "core$coreSkillLevel cheer/M4=$enabled apply once",
    ({ coreSkillLevel, enabled }) => {
      const action = resolve("action:agent:1151:action:0014", 6, 12)
      const input = {
        ...base,
        action,
        actors: [{ ...base.actors[0]!, mindscapeRank: 6, coreSkillLevel }],
        selections: enabled
          ? buffs.map((optionId) => ({
              holderId: "entity:lucy",
              optionId,
              layers: 1,
            }))
          : [],
        inputs: enabled
          ? [
              {
                bindingId: "binding:entity:lucy:agent:1151",
                name: source,
                value: { unit: "attack-points", value: 2000 },
              },
            ]
          : [],
      }
      const r = calculate(input),
        expected = (1173.25 + (enabled ? 540 : 0)) * 5.008 * zone
      assert.equal(r.kind, "damage")
      expect(r.segments).toHaveLength(1)
      expect(r.totals.nonCritical).toBeCloseTo(expected, 8)
      expect(r.totals.critical).toBeCloseTo(
        expected * (1 + 0.83 + (enabled ? 0.1 : 0)),
        8,
      )
    },
  )
})

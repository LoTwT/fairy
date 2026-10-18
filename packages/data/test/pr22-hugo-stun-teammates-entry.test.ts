import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  calculateStaticDamage,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  CoreSkillLevel,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/types.ts"
import definitionsJson from "../definitions/effects/static.json" with { type: "json" }
import catalogJson from "../definitions/effects/static-catalog.json" with { type: "json" }
import {
  hugoAttackEffectId,
  hugoAttackOptionId,
  hugoTeammateCountInputName,
  makeHugoAttackRequest,
} from "./fixtures/hugo-stun-teammates-consumer.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import { loadStaticCalculationData } from "../src/index.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import type { StaticActionCalculationInput } from "../../core/src/static/types.ts"

const parsed = parseEffectRuleSet(definitionsJson)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = catalogJson as unknown as StaticEffectCatalog
const amounts = [
  [0, 25, 75],
  [0, 50, 150],
  [0, 80, 240],
  [0, 120, 360],
  [0, 180, 540],
  [0, 270, 810],
  [0, 300, 900],
] as const
const selection = (layers: number) => ({
  optionId: hugoAttackOptionId,
  bindingId: "binding:hugo" as const,
  layers,
})
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const request = (core: CoreSkillLevel = 7, attack = 1000) =>
  makeHugoAttackRequest(definitions, catalog, core, attack) as Mutable<
    ReturnType<typeof makeHugoAttackRequest>
  >
function calculate(input: StaticCatalogDamageInput) {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function lowInput(count: number = 2): StaticDamageInput {
  const { definitions, bindings, world, hit, damage } = request()
  const lowHit: StaticDamageInput["hit"] = {
    actorId: hit.actorId,
    targetId: hit.targetId,
    actionId: hit.actionId,
    skillCategory: hit.skillCategory,
    skillTags: [],
    element: hit.element,
    damageItems: [
      {
        itemId: "base",
        stat: "attack",
        statSource: { entityId: "entity:hugo" },
        damageMultiplier: 2,
      },
    ],
  }
  return {
    definitions,
    bindings,
    world,
    hit: lowHit,
    damage,
    selections: [
      { effectId: hugoAttackEffectId, bindingId: "binding:hugo", layers: 1 },
    ],
    inputs: [
      {
        bindingId: "binding:hugo",
        name: hugoTeammateCountInputName,
        value: { unit: "count", value: count },
      },
    ],
  }
}

describe("Hugo declared other Stun teammate count", () => {
  it.each(
    amounts.flatMap((row, index) =>
      row.map((amount, count) => ({
        core: (index + 1) as CoreSkillLevel,
        count,
        amount,
      })),
    ),
  )(
    "core $core / $count teammates contributes $amount final-fixed ATK once",
    ({ core, count, amount }) => {
      const input = makeHugoAttackRequest(definitions, catalog, core)
      const result = calculateStaticDamageFromCatalog({
        ...input,
        selections: [selection(count)],
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.value.nonCritical).toBeCloseTo((1000 + amount) * 2)
      const contributions = result.value.evaluation.contributions.filter(
        (c) => c.origin.effectId === hugoAttackEffectId,
      )
      expect(contributions).toHaveLength(count === 0 ? 0 : 1)
      if (count !== 0)
        expect(contributions[0]).toMatchObject({
          address: {
            kind: "stat",
            stat: "attack",
            stage: "final-fixed",
            entityId: "entity:hugo",
          },
          value: { unit: "attack-points", value: amount },
        })
    },
  )
  it.each([
    -1,
    0.5,
    3,
    4,
    Number.MAX_SAFE_INTEGER + 1,
    NaN,
    Infinity,
    -Infinity,
  ])("rejects invalid declared count %s", (count) => {
    const result = calculateStaticDamageFromCatalog({
      ...makeHugoAttackRequest(definitions, catalog),
      selections: [selection(count)],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_INPUT",
          pointer: "/selections/0/layers",
        }),
      )
  })

  it.each([250, 1000, 2345])(
    "adds fixed points after percentage and other fixed bonuses at base ATK %s",
    (baseAttack) => {
      const input = request(7, baseAttack)
      const actor = input.world.entities[0]!
      if (actor.kind !== "actor") throw new Error("Actor fixture required")
      actor.generalStats.attack = {
        baseValue: baseAttack,
        initialPercentage: [0.2],
        initialFixed: [30],
        finalPercentage: [0.4],
        finalFixed: [80],
      }
      const before = calculate(input),
        after = calculate({ ...input, selections: [selection(2)] })
      const attack = (baseAttack * 1.2 + 30) * 1.4 + 80
      expect(before.nonCritical).toBeCloseTo(attack * 2)
      expect(after.nonCritical).toBeCloseTo((attack + 900) * 2)
      expect(after.nonCritical - before.nonCritical).toBeCloseTo(1800)
    },
  )

  it.each([false, true])(
    "does not require stun or Dark Abyss state (stunned=%s)",
    (stunned) => {
      const input = request()
      input.damage.stunDamage.isTargetStunned = stunned
      expect(input.world.states).toEqual([])
      expect(calculate(input).nonCritical).toBe(2000)
      expect(
        calculate({ ...input, selections: [selection(0)] }).nonCritical,
      ).toBe(2000)
      expect(
        calculate({ ...input, selections: [selection(2)] }).nonCritical,
      ).toBe(3800)
    },
  )

  it("keeps the same-block critical bonus independent and its original core limit", () => {
    const crit = {
      optionId: "agents:hugo:mindscape:0:blk-legacy:legacy-self-critRate",
      bindingId: "binding:hugo" as const,
      layers: 1,
    }
    const input = request()
    input.damage.stunDamage.isTargetStunned = true
    const only = calculate({ ...input, selections: [crit] })
    expect(only.nonCritical).toBe(2000)
    expect(only.criticalRate).toBeCloseTo(0.37)
    const together = calculate({ ...input, selections: [selection(2), crit] })
    expect(together.nonCritical).toBe(3800)
    expect(together.criticalRate).toBeCloseTo(0.37)
    const lower = request(1)
    lower.damage.stunDamage.isTargetStunned = true
    const result = calculateStaticDamageFromCatalog({
      ...lower,
      selections: [selection(2), crit],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "MISSING_RANK",
          pointer: "/selections/1",
        }),
      )
  })

  it.each([
    "duplicate selection",
    "duplicate derived input",
    "wrong holder",
    "wrong binding",
    "wrong actor source",
  ] as const)("rejects %s on a nonzero request", (kind) => {
    const input = request()
    input.selections = [selection(2)]
    if (kind === "duplicate selection") input.selections.push(selection(2))
    if (kind === "duplicate derived input")
      input.inputs = [
        {
          bindingId: "binding:hugo",
          name: hugoTeammateCountInputName,
          value: { unit: "count", value: 2 },
        },
      ]
    if (kind === "wrong holder") input.bindings[0]!.holderId = "entity:enemy"
    if (kind === "wrong binding")
      input.selections[0]!.bindingId = "binding:missing"
    if (kind === "wrong actor source")
      input.actorSources[0]!.agentEntityId = "1011"
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok, JSON.stringify(result)).toBe(false)
    const expected = {
      "duplicate selection": { code: "DUPLICATE_ID", pointer: "/selections/1" },
      "duplicate derived input": { code: "DUPLICATE_ID", pointer: "/inputs" },
      "wrong holder": { code: "MISSING_FACT", pointer: "/bindings/0/holderId" },
      "wrong binding": { code: "MISSING_REFERENCE", pointer: "/selections/0" },
      "wrong actor source": {
        code: "CONTEXT_MISMATCH",
        pointer: "/bindings/0",
      },
    }[kind]
    if (!result.ok)
      expect(result.issues).toContainEqual(expect.objectContaining(expected))
  })

  it("isolates two bindings with different cores and teammate counts", () => {
    const input = request(2)
    const first = input.bindings[0]!
    if (first.kind !== "agent") throw new Error("Agent fixture required")
    input.bindings.push({
      ...first,
      bindingId: "binding:hugo-b",
      holderId: "entity:hugo-b",
      configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
    })
    input.actorSources.push({
      entityId: "entity:hugo-b",
      agentEntityId: "1291",
    })
    input.world.entities.push({
      ...structuredClone(input.world.entities[0]!),
      entityId: "entity:hugo-b",
    })
    input.selections = [
      selection(2),
      { optionId: hugoAttackOptionId, bindingId: "binding:hugo-b", layers: 1 },
    ]
    const a = calculate(input)
    expect(a.nonCritical).toBe(2300)
    input.hit.actorId = "entity:hugo-b"
    input.hit.damageItems[0]!.statSource = { entityId: "entity:hugo-b" }
    const b = calculate(input)
    expect(b.nonCritical).toBe(2600)
    input.selections = [selection(2)]
    expect(calculate(input).nonCritical).toBe(2000)
  })

  it.each([0, 1, 2])(
    "executes one low-level supplied layer with explicit count %s",
    (count) => {
      const result = calculateStaticDamage(lowInput(count))
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (result.ok)
        expect(result.value.nonCritical).toBe(
          (1000 + [0, 300, 900][count]!) * 2,
        )
    },
  )
  it.each([
    "missing count",
    "duplicate count",
    "wrong count unit",
    "wrong count binding",
    "zero layers",
  ] as const)("retains structured low-level rejection: %s", (kind) => {
    const input = lowInput() as Mutable<StaticDamageInput>
    if (kind === "missing count") input.inputs = []
    if (kind === "duplicate count")
      input.inputs!.push(structuredClone(input.inputs![0]!))
    if (kind === "wrong count unit")
      input.inputs![0]!.value = { unit: "ratio", value: 2 }
    if (kind === "wrong count binding")
      input.inputs![0]!.bindingId = "binding:missing"
    if (kind === "zero layers") input.selections[0]!.layers = 0
    const result = calculateStaticDamage(input)
    expect(result.ok, JSON.stringify(result)).toBe(false)
    const expected = {
      "missing count": { code: "MISSING_FACT", pointer: "/inputs" },
      "duplicate count": { code: "DUPLICATE_ID", pointer: "/inputs/1" },
      "wrong count unit": { code: "UNIT_MISMATCH", pointer: "/inputs" },
      "wrong count binding": {
        code: "MISSING_REFERENCE",
        pointer: "/inputs/0/bindingId",
      },
      "zero layers": { code: "INVALID_INPUT", pointer: "/selections/0/layers" },
    }[kind]!
    if (!result.ok)
      expect(result.issues).toContainEqual(expect.objectContaining(expected))
  })
  it("preserves the low-level finite count contract and unselected closure", () => {
    const fraction = calculateStaticDamage(lowInput(1.5))
    expect(fraction.ok, JSON.stringify(fraction)).toBe(true)
    if (fraction.ok) expect(fraction.value.nonCritical).toBe(3200)
    const input = lowInput()
    const closed = calculateStaticDamage({
      ...input,
      selections: [],
      inputs: [],
    })
    expect(closed.ok).toBe(true)
    if (closed.ok) expect(closed.value.nonCritical).toBe(2000)
  })

  it("applies the ATK count through a resolved real action at the high-level entry", async () => {
    const data = await loadStaticCalculationData({
      agents: ["1291"],
      wEngines: [],
    })
    const actions = data.agents[0]!.actions
    const action = actions.actions.find(
      (entry) =>
        entry.skillCategory === "basic" &&
        entry.calculation.kind === "damage" &&
        entry.inputs.length === 0,
    )!
    expect(action).toBeDefined()
    const input: StaticActionCalculationInput = {
      data,
      actors: [
        {
          entityId: "entity:hugo",
          teamId: "team:players",
          agentEntityId: "1291",
          mindscapeRank: 0,
          coreSkillLevel: 7,
          wEngine: null,
          driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
          panel: {
            mode: "out-of-combat",
            stats: {
              attack: { unit: "attack-points", value: 1000 },
              criticalRate: { unit: "ratio", value: 0.25 },
              criticalDamage: { unit: "ratio", value: 0.5 },
              penetrationRatio: { unit: "ratio", value: 0 },
            },
            penetrationValue: 0,
            damageBonuses: { physical: 0, ice: 0 },
          },
        },
      ],
      actorId: "entity:hugo",
      action: resolveAgentAction({
        agent: actions,
        actionId: action.actionId,
        mindscapeRank: 0,
        levels: {
          basic: { mode: "effective", value: 12 },
          dodge: { mode: "effective", value: 12 },
          assist: { mode: "effective", value: 12 },
          special: { mode: "effective", value: 12 },
          chain: { mode: "effective", value: 12 },
        },
      }),
      target: {
        entityId: "entity:enemy",
        teamId: "team:enemies",
        baseDefense: 0,
        resistances: { physical: 0, ice: 0 },
        isStunned: false,
        baseStunDamageMultiplier: 1,
      },
      selections: [],
    }
    const before = calculateStaticActionDamage(input)
    const after = calculateStaticActionDamage({
      ...input,
      selections: [
        { optionId: hugoAttackOptionId, holderId: "entity:hugo", layers: 2 },
      ],
    })
    expect(before.ok, JSON.stringify(before)).toBe(true)
    expect(after.ok, JSON.stringify(after)).toBe(true)
    if (
      !before.ok ||
      !after.ok ||
      before.value.kind !== "damage" ||
      after.value.kind !== "damage"
    )
      throw new Error("Damage required")
    expect(before.value.totals.nonCritical).toBeGreaterThan(0)
    expect(after.value.totals.nonCritical).toBeGreaterThan(
      before.value.totals.nonCritical,
    )
    expect(
      after.value.totals.nonCritical / before.value.totals.nonCritical,
    ).toBeCloseTo(1.9, 8)
    for (const segment of after.value.segments) {
      const attack = segment.damage.evaluation.contributions.filter(
        (entry) => entry.origin.effectId === hugoAttackEffectId,
      )
      expect(attack).toHaveLength(1)
      expect(attack[0]!.value).toEqual({ unit: "attack-points", value: 900 })
    }
    const closed = calculateStaticActionDamage({
      ...input,
      selections: [
        { optionId: hugoAttackOptionId, holderId: "entity:hugo", layers: 0 },
      ],
    })
    expect(closed.ok).toBe(true)
    if (closed.ok && closed.value.kind === "damage")
      expect(closed.value.totals).toEqual(before.value.totals)
    const old = calculateStaticActionDamage({
      ...input,
      selections: [
        { optionId: hugoAttackOptionId, holderId: "entity:hugo", layers: 3 },
      ],
    })
    expect(old.ok).toBe(false)
    if (!old.ok)
      expect(
        old.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" && issue.pointer.endsWith("/layers"),
        ),
      ).toBe(true)
  })
})

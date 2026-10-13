import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  staticSourceBindingId,
} from "../../core/src/static/calculate.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  CoreSkillLevel,
  MindscapeRank,
  Result,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
  WorldObservation,
} from "../../core/src/effects/index.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
const optionId = "nanoka:agents:yeshunguang:veil-vulnerability"
const lycaonOption =
  "agents:lycaon:mindscape:0:blk-ms49npw0-1i75ne:eff-ms49npw0-qzil8p"
const trigger = {
  eventId: "event:entry",
  actorId: "entity:enemy",
  activationSnapshotId: "snapshot:entry",
} as const
const general = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})
let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
let definitions: RuleSet | undefined
async function data() {
  loaded ??= await loadStaticCalculationData({
    agents: ["Ye Shunguang", "Lycaon", "Lighter"],
    wEngines: [],
  })
  definitions ??= ok(parseEffectRuleSet(loaded.definitions))
  return { loaded, definitions, catalog: loaded.catalog as StaticEffectCatalog }
}
function ok<T>(r: Result<T>): T {
  expect(r.ok, JSON.stringify(r)).toBe(true)
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r.value
}
function actor(
  entityId: StaticActorConfiguration["entityId"],
  agentEntityId: string,
  mindscapeRank: MindscapeRank = 0,
  coreSkillLevel: CoreSkillLevel = 7,
): StaticActorConfiguration {
  return {
    entityId,
    teamId: "team:players",
    agentEntityId,
    mindscapeRank,
    coreSkillLevel,
    wEngine: null,
    driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    panel: {
      mode: "out-of-combat",
      stats: {
        attack: { unit: "attack-points", value: 1000 },
        criticalRate: { unit: "ratio", value: 0.25 },
        criticalDamage: { unit: "ratio", value: 0.5 },
        penetrationRatio: { unit: "ratio", value: 0 },
        energyRegen: { unit: "energy-per-second", value: 1.2 },
      },
      penetrationValue: 0,
      damageBonuses: { physical: 0.3, ice: 0.3, fire: 0.3 },
    },
  }
}
function world(): Mutable<WorldObservation> {
  return {
    entities: ["ye", "lycaon", "lighter", "enemy"].map((name) => ({
      kind: "actor",
      entityId: `entity:${name}`,
      teamId: name === "enemy" ? "team:enemies" : "team:players",
      generalStats: { attack: general(1000), energyRegen: general(1.2) },
      directStats: {
        criticalRate: { baseValue: 0.25, additions: [] },
        criticalDamage: { baseValue: 0.5, additions: [] },
        sharpCriticalDamage: { baseValue: 0.4, additions: [] },
        penetrationRatio: { baseValue: 0, additions: [] },
      },
    })),
    states: [],
    distances: [],
  }
}
async function catalogInput(
  rank: MindscapeRank = 0,
  core: CoreSkillLevel = 7,
): Promise<Mutable<StaticCatalogDamageInput>> {
  const d = await data()
  const input: StaticCatalogDamageInput = {
    definitions: d.definitions,
    catalog: d.catalog,
    bindings: [
      {
        bindingId: "binding:ye",
        kind: "agent",
        holderId: "entity:ye",
        sourceEntityId: "1431",
        eligible: true,
        configuration: { coreSkillLevel: core, mindscapeRank: rank },
      },
      {
        bindingId: "binding:lycaon",
        kind: "agent",
        holderId: "entity:lycaon",
        sourceEntityId: "1141",
        eligible: true,
        configuration: { coreSkillLevel: 7, mindscapeRank: 0 },
      },
    ],
    actorSources: [
      { entityId: "entity:ye", agentEntityId: "1431" },
      { entityId: "entity:lycaon", agentEntityId: "1141" },
      { entityId: "entity:lighter", agentEntityId: "1161" },
    ],
    selections: [
      { optionId, bindingId: "binding:ye", layers: 1, trigger },
      { optionId: lycaonOption, bindingId: "binding:lycaon", layers: 1 },
    ],
    world: world(),
    atSeconds: 5,
    snapshots: [
      {
        snapshotId: trigger.activationSnapshotId,
        atSeconds: 2,
        attributes: [],
        world: world(),
      },
    ],
    inputs: [
      {
        bindingId: "binding:ye",
        name: "veilVulnerabilityBonusAtEntry",
        value: { unit: "ratio", value: 1.375 },
      },
    ],
    hit: {
      actorId: "entity:ye",
      targetId: "entity:enemy",
      actionId: "action:agent:1431:action:0001",
      element: "physical",
      skillCategory: "assist",
      skillTags: [],
      damageItems: [
        {
          itemId: "attack",
          mode: "direct",
          role: "base",
          stat: "attack",
          damageMultiplier: 2,
          statSource: { entityId: "entity:ye" },
        },
      ],
    },
    damage: {
      kind: "regular",
      damageBonus: [0.3],
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 0,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
      resistance: {
        targetResistance: 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.6,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  }
  return structuredClone(input) as Mutable<StaticCatalogDamageInput>
}
async function actionInput(
  rank: MindscapeRank = 0,
  core: CoreSkillLevel = 7,
  suffix = "0001",
): Promise<
  Mutable<Omit<StaticActionCalculationInput, "data" | "action">> &
    Pick<StaticActionCalculationInput, "data" | "action">
> {
  const d = await data(),
    agent = d.loaded.agents.find(
      (e) => e.attributes.entityId === "1431",
    )!.actions
  const entry = agent.actions.find(
    (e) => e.actionId === `action:agent:1431:action:${suffix}`,
  )!
  const result: StaticActionCalculationInput = {
    data: d.loaded,
    actors: [
      actor("entity:ye", "1431", rank, core),
      actor("entity:lycaon", "1141"),
    ],
    actorId: "entity:ye",
    action: resolveAgentAction({
      agent,
      actionId: entry.actionId,
      mindscapeRank: rank,
      levels: { [entry.levelGroup]: { mode: "effective", value: 12 } },
    }),
    target: {
      entityId: "entity:enemy",
      teamId: "team:enemies",
      baseDefense: 0,
      resistances: { physical: 0, ice: 0 },
      isStunned: true,
      baseStunDamageMultiplier: 1.6,
    },
    selections: [
      { holderId: "entity:ye", optionId, layers: 1, trigger },
      { holderId: "entity:lycaon", optionId: lycaonOption, layers: 1 },
    ],
    inputs: [
      {
        bindingId: staticSourceBindingId("entity:ye", "agent", "1431"),
        name: "veilVulnerabilityBonusAtEntry",
        value: { unit: "ratio", value: 1.375 },
      },
    ],
    atSeconds: 5,
    snapshots: [
      {
        snapshotId: trigger.activationSnapshotId,
        atSeconds: 2,
        attributes: [],
        world: world(),
      },
    ],
  }
  return structuredClone(result) as Awaited<ReturnType<typeof actionInput>>
}
function damageResult(input: StaticActionCalculationInput) {
  const value = ok(calculateStaticActionDamage(input))
  if (value.kind !== "damage") throw new Error("expected damage")
  return value
}

describe.each([0, 1, 2, 3, 4, 5, 6] as const)("Ye veil M%i", (rank) => {
  it.each([1, 2, 3, 4, 5, 6, 7] as const)(
    "core %i has the declared cap at catalog and full action entry",
    async (core) => {
      const expected = rank < 4 ? 2.1 : 2.375
      const i = await catalogInput(rank, core)
      expect(
        ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
          "stunDamage"
        ],
      ).toBe(expected)
      const full = await actionInput(rank, core),
        calculated = damageResult(full)
      expect(
        calculated.segments[0]!.damage.factors.nonCritical["stunDamage"],
      ).toBe(expected)
      // Nanoka assist level 12 is 800.8%; ATK1000, 30% other-zone bonus, zero defense/resistance.
      expect(calculated.totals.nonCritical).toBeCloseTo(
        1000 * 8.008 * 1.3 * expected,
      )
    },
  )
})

describe("production veil source boundaries", () => {
  it.each([false, true])(
    "entry snapshot remains stable when current stunned=%s",
    async (stunned) => {
      const i = await catalogInput(4)
      i.damage.stunDamage.isTargetStunned = stunned
      i.damage.stunDamage.targetBaseStunDamageMultiplier = stunned ? 2.2 : 0.6
      i.damage.stunDamage.targetStunDamageMultiplierAdjustments = [0.4]
      expect(
        ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
          "stunDamage"
        ],
      ).toBe(2.375)
      const next = structuredClone(i)
      next.selections[0]!.trigger = {
        ...trigger,
        eventId: "event:new-entry",
        activationSnapshotId: "snapshot:new-entry",
      }
      next.snapshots = [
        {
          snapshotId: "snapshot:new-entry",
          atSeconds: 4,
          attributes: [],
          world: world(),
        },
      ]
      next.inputs![0]!.value.value = 0.85
      expect(
        ok(calculateStaticDamageFromCatalog(next)).factors.nonCritical[
          "stunDamage"
        ],
      ).toBe(1.85)
    },
  )
  it.each(["zero", "absent", "ineligible"])(
    "ordinary Lycaon contribution returns when %s",
    async (off) => {
      const i = await catalogInput()
      if (off === "zero") i.selections[0]!.layers = 0
      if (off === "absent") i.selections.shift()
      if (off === "ineligible") i.bindings[0]!.eligible = false
      if (off !== "ineligible") {
        i.inputs = []
        delete i.selections[0]!.trigger
      }
      expect(
        ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
          "stunDamage"
        ],
      ).toBeCloseTo(1.95)
      const full = await actionInput()
      full.selections[0]!.layers = 0
      full.inputs = []
      delete full.selections[0]!.trigger
      expect(
        damageResult(full).segments[0]!.damage.factors.nonCritical[
          "stunDamage"
        ],
      ).toBeCloseTo(1.95)
    },
  )
  it("zero declared bonus is active replacement, and existing teammate declaration stays independent", async () => {
    const full = await actionInput(4)
    full.actors.push(
      structuredClone(
        actor("entity:lighter", "1161", 4),
      ) as Mutable<StaticActorConfiguration>,
    )
    full.selections.push({
      holderId: "entity:lighter",
      optionId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
      layers: 1,
      beneficiaryActorId: "entity:ye",
    })
    full.inputs![0]!.value.value = 0
    const r = damageResult(full)
    expect(r.segments[0]!.damage.factors.nonCritical["stunDamage"]).toBe(1)
    expect(
      r.panels.find((p) => p.entityId === "entity:ye")!.stats.energyRegen!
        .value,
    ).toBeCloseTo(1.2)
    expect(full.selections[0]!.trigger).toEqual(trigger)
    delete full.selections[2]!.beneficiaryActorId
    expect(calculateStaticActionDamage(full).ok).toBe(false)
  })
  it("same-world other teammate hit remains ordinary despite the selected Ye veil", async () => {
    const i = await catalogInput()
    i.hit.actorId = "entity:lycaon"
    i.hit.damageItems[0]!.statSource = { entityId: "entity:lycaon" }
    expect(
      ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical["stunDamage"],
    ).toBeCloseTo(1.95)
  })
  it.each([false, true])(
    "isolates same-name holders and binding-scoped values, reverse=%s",
    async (reverse) => {
      const i = await catalogInput(4)
      const twin = structuredClone(i.world.entities[0]!)
      twin.entityId = "entity:ye-two"
      i.world.entities.push(twin)
      i.snapshots![0]!.world = structuredClone(i.world)
      i.bindings.push({
        ...i.bindings[0]!,
        bindingId: "binding:ye-two",
        holderId: "entity:ye-two",
      })
      i.actorSources.push({ entityId: "entity:ye-two", agentEntityId: "1431" })
      i.selections.push({
        optionId,
        bindingId: "binding:ye-two",
        layers: 1,
        trigger,
      })
      i.inputs!.push({
        bindingId: "binding:ye-two",
        name: "veilVulnerabilityBonusAtEntry",
        value: { unit: "ratio", value: 0.85 },
      })
      if (reverse) {
        i.selections.reverse()
        i.bindings.reverse()
        i.definitions.effects.reverse()
      }
      expect(
        ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
          "stunDamage"
        ],
      ).toBe(2.375)
      i.hit.actorId = "entity:ye-two"
      i.hit.damageItems[0]!.statSource = { entityId: "entity:ye-two" }
      expect(
        ok(calculateStaticDamageFromCatalog(i)).factors.nonCritical[
          "stunDamage"
        ],
      ).toBe(1.85)
    },
  )
  it.each([
    "missing B",
    "missing trigger",
    "missing snapshot",
    "wrong captured target",
    "negative B",
    "wrong B unit",
    "invalid rank",
    "invalid core",
  ])("rejects %s at catalog and full action entry", async (change) => {
    const i = await catalogInput(),
      full = await actionInput()
    if (change === "missing B") {
      i.inputs = []
      full.inputs = []
    }
    if (change === "missing trigger") {
      delete i.selections[0]!.trigger
      delete full.selections[0]!.trigger
    }
    if (change === "missing snapshot") {
      i.snapshots = []
      full.snapshots = []
    }
    if (change === "wrong captured target") {
      i.selections[0]!.trigger!.actorId = "entity:lycaon"
      full.selections[0]!.trigger!.actorId = "entity:lycaon"
    }
    if (change === "negative B") {
      i.inputs![0]!.value.value = -0.1
      full.inputs![0]!.value.value = -0.1
    }
    if (change === "wrong B unit") {
      i.inputs![0]!.value.unit = "multiplier"
      full.inputs![0]!.value.unit = "multiplier"
    }
    const binding = i.bindings[0]!
    if (binding.kind !== "agent") throw new Error("fixture binding")
    if (change === "invalid rank") {
      binding.configuration.mindscapeRank = 7 as never
      full.actors[0]!.mindscapeRank = 7 as never
    }
    if (change === "invalid core") {
      binding.configuration.coreSkillLevel = 8 as never
      full.actors[0]!.coreSkillLevel = 8 as never
    }
    expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
    expect(calculateStaticActionDamage(full).ok).toBe(false)
  })
  it.each(Array.from({ length: 35 }, (_, i) => String(i + 1).padStart(4, "0")))(
    "resolves and consumes unchanged formal action %s without catch or skips",
    async (suffix) => {
      const full = await actionInput(0, 7, suffix)
      expect(full.action.ok, JSON.stringify(full.action)).toBe(true)
      if (!full.action.ok) throw new Error(JSON.stringify(full.action.issues))
      const result = ok(calculateStaticActionDamage(full))
      if (full.action.calculation.kind === "daze-only") {
        expect(result.kind).toBe("daze-only")
      } else {
        if (full.action.calculation.kind !== "damage")
          throw new Error("unexpected action classification")
        expect(full.action.calculation.segments.length).toBeGreaterThan(0)
        for (const s of full.action.calculation.segments) {
          expect(s.damageItems.length).toBeGreaterThan(0)
          expect(s.damageKind).toBe("regular")
        }
        if (result.kind !== "damage") throw new Error("missing damage")
        for (const s of result.segments)
          expect(s.damage.factors.nonCritical["stunDamage"]).toBe(2.1)
      }
    },
  )
})

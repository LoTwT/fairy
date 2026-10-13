import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/index.ts"
import type { StaticActionCalculationInput } from "../../core/src/static/types.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
type CatalogInput = Mutable<
  Omit<StaticCatalogDamageInput, "definitions" | "catalog">
> &
  Pick<StaticCatalogDamageInput, "definitions" | "catalog">
type ActionInput = Mutable<
  Omit<StaticActionCalculationInput, "data" | "action">
> & {
  data: StaticActionCalculationInput["data"]
  action: StaticActionCalculationInput["action"]
}
type Suffix = "0012" | "0013"
const actionId = (suffix: string) => `action:agent:1181:action:${suffix}`
const optionId = (suffix: Suffix) =>
  `nanoka:agents:grace:m6-${suffix === "0012" ? "special" : "ex-special"}-grenades`
const targetId = (suffix: Suffix) =>
  `zzz-hp:skill:grace-${suffix === "0012" ? "special" : "ex-special"}-grenades`
const general = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})
let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
let parsed: RuleSet | undefined
async function data() {
  loaded ??= await loadStaticCalculationData({
    agents: ["Grace", "Anby"],
    wEngines: [],
  })
  if (!parsed) {
    const result = parseEffectRuleSet(loaded.definitions)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    parsed = result.value
  }
  return {
    loaded,
    definitions: parsed,
    catalog: loaded.catalog as StaticEffectCatalog,
  }
}

async function actionInput(
  suffix: string = "0012",
  level = 12,
): Promise<ActionInput> {
  const d = await data()
  const agent = d.loaded.agents.find(
    (a) => a.attributes.entityId === "1181",
  )!.actions
  const entry = agent.actions.find((a) => a.actionId === actionId(suffix))!
  return {
    data: d.loaded,
    actors: [
      {
        entityId: "entity:grace",
        teamId: "team:players",
        agentEntityId: "1181",
        mindscapeRank: 6,
        coreSkillLevel: 7,
        potentialLevel: entry.potentialLevels ? 1 : 0,
        wEngine: null,
        driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        panel: {
          mode: "out-of-combat",
          stats: {
            attack: { unit: "attack-points", value: 1000 },
            criticalRate: { unit: "ratio", value: 0 },
            criticalDamage: { unit: "ratio", value: 0.5 },
            penetrationRatio: { unit: "ratio", value: 0 },
          },
          penetrationValue: 0,
          damageBonuses: { electric: 0, physical: 0 },
        },
      },
    ],
    actorId: "entity:grace",
    action: resolveAgentAction({
      agent,
      actionId: entry.actionId,
      mindscapeRank: 6,
      levels: { [entry.levelGroup]: { mode: "effective", value: level } },
      ...(entry.potentialLevels ? { potentialLevel: 1 } : {}),
    }),
    target: {
      entityId: "entity:enemy",
      teamId: "team:enemies",
      baseDefense: 0,
      resistances: { electric: 0, physical: 0 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [],
  } as ActionInput
}

async function catalogInput(
  suffix: Suffix,
  level = 12,
  attack = 1000,
): Promise<CatalogInput> {
  const d = await data()
  // Independent literal Nanoka formulas, including EX's original two grenades.
  const multiplier =
    suffix === "0012"
      ? (4210 + 390 * (level - 1)) / 10000
      : ((16690 + 1520 * (level - 1)) * 2) / 10000
  return {
    definitions: d.definitions,
    catalog: d.catalog,
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:grace",
          teamId: "team:players",
          generalStats: { attack: general(attack) },
          directStats: {
            criticalRate: { baseValue: 0, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:enemy",
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    bindings: [
      {
        bindingId: "binding:grace",
        kind: "agent",
        holderId: "entity:grace",
        sourceEntityId: "1181",
        eligible: true,
        configuration: {
          mindscapeRank: 6,
          coreSkillLevel: 7,
          potentialLevel: 0,
        },
      },
    ],
    actorSources: [{ entityId: "entity:grace", agentEntityId: "1181" }],
    selections: [],
    hit: {
      actorId: "entity:grace",
      targetId: "entity:enemy",
      actionId: actionId(suffix),
      element: "electric",
      skillCategory: suffix === "0012" ? "special" : "enhanced-special",
      skillTags: [],
      skillTargetIds: [],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: `${actionId(suffix)}:base`,
          damageMultiplier: multiplier,
          stat: "attack",
          statSource: { entityId: "entity:grace" },
        },
      ],
    },
    damage: {
      kind: "regular",
      damageBonus: [],
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
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  } as CatalogInput
}

function activate(input: CatalogInput, suffix: Suffix) {
  input.selections = [
    { bindingId: "binding:grace", optionId: optionId(suffix), layers: 1 },
  ]
  input.hit.skillTargetIds = [targetId(suffix)]
  return input
}
function graceBinding(input: CatalogInput) {
  const binding = input.bindings[0]!
  if (binding.kind !== "agent") throw new Error("expected agent binding")
  return binding
}
function calculate(input: CatalogInput) {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function actionResult(input: ActionInput) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}

describe("Grace M6 original grenade combinations through official catalog and actions", () => {
  it.each([
    ["0012", 850, 3400],
    ["0013", 6682, 20046],
  ] as const)(
    "%s effective L12 preserves original multiplier and scales the complete combination",
    async (suffix, baseline, enhanced) => {
      const input = await actionInput(suffix)
      const before = calculateStaticActionDamage(input)
      expect(before.ok, JSON.stringify(before)).toBe(true)
      if (!before.ok || before.value.kind !== "damage")
        throw new Error(JSON.stringify(before))
      expect(before.value.totals.nonCritical).toBeCloseTo(baseline)
      input.selections = [
        { holderId: input.actorId, optionId: optionId(suffix), layers: 1 },
      ]
      const after = calculateStaticActionDamage(input)
      expect(after.ok, JSON.stringify(after)).toBe(true)
      if (!after.ok || after.value.kind !== "damage")
        throw new Error(JSON.stringify(after))
      expect(after.value.totals.nonCritical).toBeCloseTo(enhanced)
    },
  )

  it("rejects M6 effective L1 as an invalid test configuration", async () => {
    await expect(actionInput("0012", 1)).rejects.toThrow()
  })

  it.each([
    ["0012", 421, 1684],
    ["0013", 3338, 10014],
  ] as const)(
    "%s literal L1 low-level anchor %s -> %s",
    async (suffix, baseline, enhanced) => {
      const input = await catalogInput(suffix, 1)
      const before = calculateStaticDamageFromCatalog(input)
      expect(before.ok, JSON.stringify(before)).toBe(true)
      if (!before.ok) throw new Error(JSON.stringify(before.issues))
      expect(before.value.nonCritical).toBeCloseTo(baseline)
      input.selections = [
        { bindingId: "binding:grace", optionId: optionId(suffix), layers: 1 },
      ]
      input.hit.skillTargetIds = [targetId(suffix)]
      const after = calculateStaticDamageFromCatalog(input)
      expect(after.ok, JSON.stringify(after)).toBe(true)
      if (!after.ok) throw new Error(JSON.stringify(after.issues))
      expect(after.value.nonCritical).toBeCloseTo(enhanced)
    },
  )

  it.each([
    ["0012", 12, 1234, 0.5, 4],
    ["0013", 12, 1731, 0.37, 3],
    ["0012", 16, 2000, 0.2, 4],
    ["0013", 16, 2000, 0.2, 3],
  ] as const)(
    "%s L%s ATK%s damageBonus%s is a base scale x%s",
    async (suffix, level, attack, bonus, scale) => {
      const input = activate(await catalogInput(suffix, level, attack), suffix)
      input.damage.damageBonus = [bonus]
      const perGrenade =
        suffix === "0012"
          ? (4210 + 390 * (level - 1)) / 10000
          : (16690 + 1520 * (level - 1)) / 10000
      const count = suffix === "0012" ? 2 : 3
      const result = calculate(input)
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(
        attack * perGrenade * count * 2,
      )
      expect(result.nonCritical).toBeCloseTo(
        attack * perGrenade * count * 2 * (1 + bonus),
      )
      expect(
        result.evaluation.contributions.filter((c) =>
          c.origin.effectId.includes("1181:nanoka:m6-"),
        ),
      ).toHaveLength(1)
      const actor = input.world.entities[0]!
      if (actor.kind !== "actor") throw new Error("expected actor")
      actor.directStats.criticalRate = { baseValue: 0.25, additions: [] }
      const withCritical = calculate(input)
      expect(withCritical.critical).toBeCloseTo(result.nonCritical * 1.5)
      expect(withCritical.expected).toBeCloseTo(result.nonCritical * 1.125)
      input.selections[0]!.layers = 0
      expect(calculate(input).nonCritical * scale).toBeCloseTo(
        result.nonCritical,
      )
    },
  )

  it.each([0, 1, 2, 3, 4, 5] as const)(
    "rejects active M6 selection at M%s",
    async (rank) => {
      const input = activate(await catalogInput("0012"), "0012")
      graceBinding(input).configuration.mindscapeRank = rank
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.startsWith("Option is not unlocked;"),
          ),
        ).toBe(true)
      input.selections = []
      expect(calculate(input).nonCritical).toBeCloseTo(850)
    },
  )

  it.each([-1, 2, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects layers %s",
    async (layers) => {
      const input = activate(await catalogInput("0012"), "0012")
      input.selections[0]!.layers = layers
      expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
    },
  )

  it.each([-1, 7, 1.5, NaN])(
    "rejects invalid configuration rank %s",
    async (rank) => {
      const input = activate(await catalogInput("0012"), "0012")
      graceBinding(input).configuration.mindscapeRank = rank as never
      expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
    },
  )

  it.each([0, 1, 2, 3, 4, 5, 6] as const)(
    "supports both original combinations at potential %s",
    async (potentialLevel) => {
      for (const [suffix, enhanced] of [
        ["0012", 3400],
        ["0013", 20046],
      ] as const) {
        const input = await actionInput(suffix)
        input.actors[0]!.potentialLevel = potentialLevel
        input.selections = [
          { holderId: input.actorId, optionId: optionId(suffix), layers: 1 },
        ]
        expect(actionResult(input).totals.nonCritical).toBeCloseTo(enhanced)
      }
    },
  )

  it("keeps trained/effective skill levels and the resolved item unchanged", async () => {
    const input = await actionInput("0012")
    const agent = input.data.agents.find(
      (a) => a.attributes.entityId === "1181",
    )!.actions
    input.action = resolveAgentAction({
      agent,
      actionId: actionId("0012"),
      mindscapeRank: 6,
      levels: { special: { mode: "trained", value: 1 } },
    }) as ActionInput["action"]
    expect(input.action.ok).toBe(true)
    if (!input.action.ok || input.action.calculation.kind !== "damage")
      throw new Error("expected action")
    expect(input.action.levels.special?.effective).toBe(5)
    const saved = structuredClone(input.action)
    input.selections = [
      { holderId: input.actorId, optionId: optionId("0012"), layers: 1 },
    ]
    expect(actionResult(input).totals.nonCritical).toBeCloseTo(2308)
    expect(input.action).toEqual(saved)
    expect(actionResult(input).totals.nonCritical).toBeCloseTo(2308)
    input.requireIndividualHits = true
    expect(calculateStaticActionDamage(input).ok).toBe(false)
  })

  it.each([
    ["0001", "quick-assist"],
    ["0002", "assist-follow-up"],
    ["0003", "basic"],
    ["0004", "basic"],
    ["0005", "basic"],
    ["0006", "basic"],
    ["0007", "basic"],
    ["0008", "chain"],
    ["0009", "ultimate"],
    ["0010", "dash"],
    ["0011", "dodge-counter"],
    ["0012", "special"],
    ["0013", "enhanced-special"],
    ["0014", "special"],
    ["0015", "special"],
    ["0016", "special"],
  ] as const)(
    "resolves original action %s as %s with nonempty damage items",
    async (suffix, category) => {
      const input = await actionInput(suffix)
      expect(input.action.ok).toBe(true)
      if (!input.action.ok || input.action.calculation.kind !== "damage")
        throw new Error("expected real damage action")
      expect(input.action.skillCategory).toBe(category)
      expect(input.action.calculation.segments.length).toBeGreaterThan(0)
      for (const segment of input.action.calculation.segments)
        expect(segment.damageItems.length).toBeGreaterThan(0)
      const before = actionResult(input)
      input.selections = [
        { holderId: input.actorId, optionId: optionId("0012"), layers: 0 },
      ]
      expect(actionResult(input).totals).toEqual(before.totals)
      if (suffix !== "0012" && suffix !== "0013") {
        expect(input.action.skillTargetIds).not.toContain(targetId("0012"))
        expect(input.action.skillTargetIds).not.toContain(targetId("0013"))
        input.selections[0]!.layers = 1
        const wrongSelection = calculateStaticActionDamage(input)
        expect(wrongSelection.ok).toBe(false)
        if (!wrongSelection.ok)
          expect(
            wrongSelection.issues.some(
              (issue) => issue.code === "MISSING_REFERENCE",
            ),
          ).toBe(true)
      }
    },
  )

  it.each(["0014", "0015", "0016"])(
    "keeps %s restricted to supported potential levels",
    async (suffix) => {
      const input = await actionInput(suffix)
      const agent = input.data.agents.find(
        (a) => a.attributes.entityId === "1181",
      )!.actions
      expect(() =>
        resolveAgentAction({
          agent,
          actionId: actionId(suffix),
          mindscapeRank: 6,
          potentialLevel: 0,
          levels: { special: { mode: "effective", value: 12 } },
        }),
      ).toThrow()
    },
  )

  it.each([
    "missing-target",
    "wrong-element",
    "wrong-category",
    "ineligible",
  ] as const)("has no scale for %s", async (change) => {
    const input = activate(await catalogInput("0012"), "0012")
    if (change === "missing-target") input.hit.skillTargetIds = []
    if (change === "wrong-element") input.hit.element = "fire"
    if (change === "wrong-category")
      input.hit.skillCategory = "enhanced-special"
    if (change === "ineligible") input.bindings[0]!.eligible = false
    expect(calculate(input).nonCritical).toBeCloseTo(850)
  })

  it("scales only the original grenade item in a mixed item request", async () => {
    const input = activate(await catalogInput("0012", 1), "0012")
    input.hit.damageItems.push({
      mode: "direct",
      role: "base",
      itemId: `${actionId("0013")}:base`,
      damageMultiplier: 2,
      stat: "attack",
      statSource: { entityId: input.hit.actorId },
    })
    input.damage.damageBonus = [0.5]
    const result = calculate(input)
    expect(result.nonCritical).toBeCloseTo((1684 + 2000) * 1.5)
    expect(
      result.evaluation.hit!.damageItems.map((item) => item.damageMultiplier),
    ).toEqual([1.684, 2])
  })

  it.each([
    ["0012", "0013", 850],
    ["0013", "0012", 6682],
  ] as const)(
    "rejects selecting %s's counterpart %s without its original item",
    async (suffix, counterpart, baseline) => {
      const input = await actionInput(suffix)
      input.selections = [
        { holderId: input.actorId, optionId: optionId(counterpart), layers: 1 },
      ]
      const result = calculateStaticActionDamage(input)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
        ).toBe(true)
      input.selections[0]!.layers = 0
      expect(actionResult(input).totals.nonCritical).toBeCloseTo(baseline)
      input.selections[0]!.layers = 1
      input.selections.push({
        holderId: input.actorId,
        optionId: optionId(suffix),
        layers: 1,
      })
      const bothSelected = calculateStaticActionDamage(input)
      expect(bothSelected.ok).toBe(false)
      if (!bothSelected.ok)
        expect(
          bothSelected.issues.some(
            (issue) => issue.code === "MISSING_REFERENCE",
          ),
        ).toBe(true)
    },
  )

  it.each([
    ["0012", 1.684, 3.338],
    ["0013", 0.421, 10.014],
  ] as const)(
    "with both original items and both options, only %s's hit category applies",
    async (suffix, specialMultiplier, exMultiplier) => {
      const input = await catalogInput(suffix, 1)
      input.hit.damageItems = [
        (await catalogInput("0012", 1)).hit.damageItems[0]!,
        (await catalogInput("0013", 1)).hit.damageItems[0]!,
      ]
      input.hit.skillTargetIds = [targetId("0012"), targetId("0013")]
      input.selections = ["0012", "0013"].map((selectionSuffix) => ({
        bindingId: "binding:grace",
        optionId: optionId(selectionSuffix as Suffix),
        layers: 1,
      }))
      input.damage.damageBonus = [0.5]
      const result = calculate(input)
      expect(result.nonCritical).toBeCloseTo(
        (specialMultiplier + exMultiplier) * 1000 * 1.5,
      )
      const adjusted = result.evaluation.hit!.damageItems
      expect(adjusted).toHaveLength(2)
      expect(adjusted[0]!.damageMultiplier).toBeCloseTo(specialMultiplier)
      expect(adjusted[1]!.damageMultiplier).toBeCloseTo(exMultiplier)
      expect(result.evaluation.contributions).toHaveLength(1)
      expect(result.evaluation.contributions[0]!.origin.effectId).toBe(
        `agent:1181:nanoka:m6-${suffix === "0012" ? "special" : "ex-special"}-grenades:mindscape:6`,
      )
    },
  )

  it.each([
    "missing-item",
    "wrong-stat",
    "wrong-source",
    "wrong-role",
    "wrong-binding",
    "duplicate-selection",
  ] as const)("rejects %s", async (change) => {
    const input = activate(await catalogInput("0012"), "0012")
    if (change === "missing-item")
      input.hit.damageItems[0]!.itemId = "unrelated-item"
    if (change === "wrong-stat") input.hit.damageItems[0]!.stat = "defense"
    if (change === "wrong-source")
      input.hit.damageItems[0]!.statSource.entityId = "entity:enemy"
    if (change === "wrong-role") input.hit.damageItems[0]!.role = "settlement"
    if (change === "wrong-binding") input.bindings[0]!.sourceEntityId = "1011"
    if (change === "duplicate-selection")
      input.selections.push({ ...input.selections[0]! })
    expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
  })

  it("keeps same-name Grace instances isolated by their actual holder", async () => {
    const input = activate(await catalogInput("0012"), "0012")
    const second = structuredClone(input.world.entities[0]!)
    second.entityId = "entity:second-grace"
    input.world.entities.push(second)
    input.actorSources.push({
      entityId: second.entityId,
      agentEntityId: "1181",
    })
    input.bindings.push({
      ...input.bindings[0]!,
      bindingId: "binding:second",
      holderId: second.entityId,
    })
    expect(calculate(input).nonCritical).toBeCloseTo(3400)
    input.selections[0]!.bindingId = "binding:second"
    expect(calculateStaticDamageFromCatalog(input).ok).toBe(false)
    input.selections[0]!.layers = 0
    expect(calculate(input).nonCritical).toBeCloseTo(850)
  })

  it("preserves EX's existing Chaos Jazz category target and 20% special bonus", async () => {
    const input = await actionInput("0013")
    for (const slot of [1, 2, 3, 4] as const)
      input.actors[0]!.driveDiscs[slot] = { setEntityId: "31800" }
    input.selections = [
      { holderId: input.actorId, optionId: optionId("0013"), layers: 1 },
      {
        holderId: input.actorId,
        optionId:
          "drive-discs:chaos-jazz:setPieces:4:blk-legacy:eff-ms0fbqh9-y74dup",
        layers: 1,
      },
    ]
    expect(actionResult(input).totals.nonCritical).toBeCloseTo(20046 * 1.2)
    input.action = (await actionInput("0012")).action
    input.selections[0]!.optionId = optionId("0012")
    expect(actionResult(input).totals.nonCritical).toBeCloseTo(3400)
  })

  it("coexists once with Grace's potential electric bonus and does not consume Shock bonus", async () => {
    const input = await actionInput("0012")
    input.actors[0]!.potentialLevel = 6
    input.selections = [
      { holderId: input.actorId, optionId: optionId("0012"), layers: 1 },
      {
        holderId: input.actorId,
        optionId:
          "agents:grace:mindscape:0:blk-ms4o8tep-z28y9w:eff-ms4o8tep-htm584",
        layers: 1,
      },
      {
        holderId: input.actorId,
        optionId:
          "agents:grace:mindscape:0:blk-ms4o80e9-dqsih3:eff-ms4o80e9-lgnv30",
        layers: 2,
      },
    ]
    expect(actionResult(input).totals.nonCritical).toBeCloseTo(3400 * 1.3)
  })

  it.each(["anomaly", "anomaly-settlement"] as const)(
    "does not scale %s even if it carries the original item and target",
    async (kind) => {
      const input = activate(await catalogInput("0012"), "0012")
      const actor = input.world.entities[0]!
      if (actor.kind !== "actor") throw new Error("expected actor")
      actor.generalStats.anomalyProficiency = general(100)
      input.damage = {
        ...input.damage,
        kind,
        anomalySource: { entityId: input.hit.actorId, level: 60 },
        anomalyDamageBonus: [],
        anomalyCriticalRate: 0,
        anomalyCriticalDamage: [],
        refringe: { mode: "settled", multiplier: 1 },
      } as CatalogInput["damage"]
      const before = calculate(input)
      input.selections = []
      expect(calculate(input).nonCritical).toBeCloseTo(before.nonCritical)
      expect(before.evaluation.contributions).toHaveLength(0)
    },
  )
})

import { describe, expect, it } from "vitest"
import { loadStaticCalculationData } from "../src/index.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  HitContext,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/index.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
type Input = { definitions: RuleSet; catalog: StaticEffectCatalog } & Mutable<
  Omit<StaticCatalogDamageInput, "hit" | "definitions" | "catalog"> & {
    hit: StaticCatalogDamageInput["hit"] & Pick<HitContext, "attributeSources">
  }
>
const sources = [
  {
    name: "Alice M6",
    agent: "1401",
    option: "nanoka:agents:alice:m6-proficiency-damage",
    item: "alice:m6-proficiency-damage",
    target: "zzz-hp:skill:alice-m6-proficiency-damage",
    base: 13200,
    critical: 19800,
    stat: "anomalyProficiency",
  },
  {
    name: "Big Cylinder",
    agent: "1071",
    option: "nanoka:w-engines:13112:retaliation-defense-damage",
    item: "big-cylinder:retaliation",
    target: "zzz-hp:skill:big-cylinder-retaliation",
    base: 4800,
    critical: 7200,
    stat: "defense",
  },
] as const
type Source = (typeof sources)[number]
const general = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})
let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
let definitions: RuleSet | undefined
async function input(source: Source): Promise<Input> {
  loaded ??= await loadStaticCalculationData({
    agents: ["Alice", "Caesar", "Jane"],
    wEngines: ["Big Cylinder"],
  })
  if (!definitions) {
    const parsed = parseEffectRuleSet(loaded.definitions)
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
    definitions = parsed.value
  }
  return {
    definitions,
    catalog: loaded.catalog as StaticEffectCatalog,
    world: {
      entities: [
        ...(["holder", "teammate"] as const).map((name) => ({
          kind: "actor",
          entityId: `entity:${name}`,
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            defense: general(800),
            anomalyProficiency: general(400),
          },
          directStats: {
            criticalRate: { baseValue: 0.2, additions: [] },
            criticalDamage: {
              baseValue: name === "holder" ? 0.5 : 1,
              additions: [],
            },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        })),
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
        bindingId: "binding:source",
        holderId: "entity:holder",
        eligible: true,
        ...(source.name === "Alice M6"
          ? {
              kind: "agent",
              sourceEntityId: "1401",
              configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
            }
          : {
              kind: "w-engine",
              sourceEntityId: "13112",
              configuration: { refinement: 1 },
            }),
      },
    ],
    actorSources: [
      { entityId: "entity:holder", agentEntityId: source.agent },
      { entityId: "entity:teammate", agentEntityId: "1261" },
    ],
    selections: [
      { bindingId: "binding:source", optionId: source.option, layers: 1 },
    ],
    hit: {
      actorId: "entity:holder",
      targetId: "entity:enemy",
      actionId: "action:extra",
      skillCategory: "uncategorized",
      element: "physical",
      skillTags: [],
      skillTargetIds: [source.target],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: source.item,
          damageMultiplier: 0,
          stat: source.stat,
          statSource: { entityId: "entity:holder" },
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
  } as Input
}
function actor(i: Input, entityId = "entity:holder") {
  const entity = i.world.entities.find((e) => e.entityId === entityId)
  if (entity?.kind !== "actor") throw new Error("Missing fixture actor")
  return entity
}
function calculate(i: Input) {
  const result = calculateStaticDamageFromCatalog(i)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function saveAttribute(
  i: Input,
  entityId: "entity:holder" | "entity:teammate",
  stat: "criticalRate" | "criticalDamage",
  value: number,
) {
  i.snapshots = [
    {
      snapshotId: "snapshot:saved",
      atSeconds: 0,
      world: structuredClone(i.world),
      attributes: [
        { entityId, stat, stage: "current", value: { unit: "ratio", value } },
      ],
    },
  ]
  return { entityId, snapshotId: "snapshot:saved" as const }
}

describe.each(sources)(
  "source guaranteed critical through official catalog: $name",
  (source) => {
    it.each([
      { name: "default", rate: 0.2, additions: [] },
      { name: "negative base", rate: -0.2, additions: [] },
      { name: "negative addition", rate: 0.05, additions: [-0.4] },
      { name: "large finite negative base", rate: -1e6, additions: [] },
    ])(
      "fixes final probability at one with $name",
      async ({ rate, additions }) => {
        const i = await input(source)
        actor(i).directStats.criticalRate = { baseValue: rate, additions }
        const result = calculate(i)
        expect(result.nonCritical).toBe(source.base)
        expect(result.criticalRate).toBe(1)
        expect(result.critical).toBe(source.critical)
        expect(result.expected).toBe(source.critical)
      },
    )
    it.each([
      { name: "holder current", entityId: "entity:holder", snapshot: false },
      {
        name: "teammate current",
        entityId: "entity:teammate",
        snapshot: false,
      },
      {
        name: "holder valid snapshot",
        entityId: "entity:holder",
        snapshot: true,
      },
      {
        name: "teammate valid snapshot",
        entityId: "entity:teammate",
        snapshot: true,
      },
    ] as const)(
      "rejects a competing CR source: $name",
      async ({ entityId, snapshot }) => {
        const i = await input(source)
        i.hit.attributeSources = {
          criticalRate: snapshot
            ? saveAttribute(i, entityId, "criticalRate", 0.3)
            : { entityId },
        }
        // The same current/saved source succeeds when this guarantee is disabled.
        const inactive = structuredClone(i)
        inactive.selections[0]!.layers = 0
        expect(calculate(inactive).criticalRate).toBe(snapshot ? 0.3 : 0.2)
        const result = calculateStaticDamageFromCatalog(i)
        expect(result.ok, JSON.stringify(result)).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
          ).toBe(true)
      },
    )
    it("does not require ordinary CR when no actual dependency reads it", async () => {
      const i = await input(source)
      delete actor(i).directStats.criticalRate
      const result = calculate(i)
      expect(result.expected).toBe(source.critical)
      expect(
        result.evaluation.attributes.some((a) => a.stat === "criticalRate"),
      ).toBe(false)
    })
    it("keeps a nonzero ordinary hit and explicit CR source after zero-layer closure", async () => {
      const i = await input(source)
      i.selections[0]!.layers = 0
      i.hit.skillTargetIds = []
      i.hit.skillCategory = "basic"
      i.hit.damageItems = [
        {
          mode: "direct",
          role: "base",
          itemId: "ordinary",
          damageMultiplier: 2,
          stat: "attack",
          statSource: { entityId: "entity:holder" },
        },
      ]
      i.hit.attributeSources = { criticalRate: { entityId: "entity:teammate" } }
      const result = calculate(i)
      expect(result.expected).toBe(2200)
      expect(result.criticalRate).toBe(0.2)
      expect(
        result.evaluation.contributions.some((c) => c.operator === "guarantee"),
      ).toBe(false)
    })
    it("does not reject explicit CR when the independent target is absent", async () => {
      const i = await input(source)
      i.hit.skillTargetIds = []
      i.hit.attributeSources = { criticalRate: { entityId: "entity:teammate" } }
      const result = calculate(i)
      expect(result.expected).toBe(0)
      expect(result.criticalRate).toBe(0.2)
      expect(
        result.evaluation.contributions.some((c) => c.operator === "guarantee"),
      ).toBe(false)
    })
    it.each(["entity", "holder snapshot", "teammate snapshot"] as const)(
      "preserves the ordinary CD %s source",
      async (kind) => {
        const i = await input(source)
        i.hit.attributeSources = {
          criticalDamage:
            kind === "entity"
              ? { entityId: "entity:teammate" }
              : saveAttribute(
                  i,
                  kind === "holder snapshot"
                    ? "entity:holder"
                    : "entity:teammate",
                  "criticalDamage",
                  1,
                ),
        }
        delete actor(i).directStats.criticalDamage
        const result = calculate(i)
        expect(result.criticalRate).toBe(1)
        expect(result.expected).toBe(source.base * 2)
      },
    )
    it("still rejects missing required CD", async () => {
      const i = await input(source)
      delete actor(i).directStats.criticalDamage
      const result = calculateStaticDamageFromCatalog(i)
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "MISSING_FACT"),
        ).toBe(true)
    })
    it.each([0, 0.25, 1])(
      "retains catalog no-owner rejection for declared r=%s",
      async (rate) => {
        const i = await input(source)
        i.hit.declaredCriticalRate = rate
        const result = calculateStaticDamageFromCatalog(i)
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "INVALID_INPUT"),
          ).toBe(true)
      },
    )
  },
)

it.each([
  [1, 7200],
  [2, 8280],
  [3, 9360],
  [4, 10440],
  [5, 11520],
])(
  "Big Cylinder R%s preserves DEF800/CD0.5 expected %s",
  async (refinement, expected) => {
    const i = await input(sources[1])
    Object.assign(i.bindings[0]!.configuration, { refinement })
    expect(calculate(i).expected).toBeCloseTo(expected!, 8)
  },
)

it.each(
  sources.flatMap((source) =>
    (["fire", "ice", "frost", "electric", "ether"] as const).map((element) => ({
      source,
      name: source.name,
      element,
    })),
  ),
)(
  "$name retains its element boundary for $element",
  async ({ source, element }) => {
    const i = await input(source)
    i.hit.element = element
    if (source.name === "Alice M6")
      i.hit.attributeSources = { criticalRate: { entityId: "entity:teammate" } }
    const result = calculate(i)
    expect(result.criticalRate).toBe(source.name === "Alice M6" ? 0.2 : 1)
    expect(result.expected).toBe(source.name === "Alice M6" ? 0 : 7200)
  },
)

it("does not activate Big Cylinder on an incompatible anomaly profession", async () => {
  const i = await input(sources[1])
  i.actorSources[0]!.agentEntityId = "1401"
  i.hit.attributeSources = { criticalRate: { entityId: "entity:teammate" } }
  expect(calculate(i).criticalRate).toBe(0.2)
  expect(calculate(i).expected).toBe(0)
})

it.each(sources)(
  "isolates $name in a world containing both guaranteed-critical sources",
  async (source) => {
    const i = await input(source)
    const other = source.name === "Alice M6" ? sources[1] : sources[0]
    const otherInput = await input(other)
    const otherActor = structuredClone(actor(otherInput))
    otherActor.entityId = "entity:other-holder"
    i.world.entities.push(otherActor)
    i.bindings.push({
      ...otherInput.bindings[0]!,
      bindingId: "binding:other",
      holderId: "entity:other-holder",
    })
    i.actorSources.push({
      entityId: "entity:other-holder",
      agentEntityId: other.agent,
    })
    i.selections.push({
      optionId: other.option,
      bindingId: "binding:other",
      layers: 0,
    })
    const before = structuredClone(i.world)
    expect(calculate(i).expected).toBe(source.critical)
    expect(i.world).toEqual(before)
  },
)

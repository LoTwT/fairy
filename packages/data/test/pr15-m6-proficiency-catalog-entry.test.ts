import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/index.ts"

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }
type Input = Mutable<StaticCatalogDamageInput>
type Name = "jane" | "alice"
const identities = { jane: "1261", alice: "1401" } as const
const option = (name: Name) => `nanoka:agents:${name}:m6-proficiency-damage`
const target = (name: Name) => `zzz-hp:skill:${name}-m6-proficiency-damage`
const item = (name: Name) => `${name}:m6-proficiency-damage`
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
    agents: ["1261", "1401"],
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

async function input(name: Name, proficiency = 400): Promise<Input> {
  const d = await data()
  return {
    definitions: d.definitions,
    catalog: d.catalog,
    world: {
      entities: [
        ...(["jane", "alice"] as const).map((n) => ({
          kind: "actor",
          entityId: `entity:${n}`,
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            defense: general(700),
            health: general(20000),
            anomalyMastery: general(140),
            anomalyProficiency: general(n === name ? proficiency : 913),
          },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
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
    bindings: (["jane", "alice"] as const).map((n) => ({
      bindingId: `binding:${n}`,
      kind: "agent",
      holderId: `entity:${n}`,
      sourceEntityId: identities[n],
      eligible: true,
      configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
    })),
    actorSources: (["jane", "alice"] as const).map((n) => ({
      entityId: `entity:${n}`,
      agentEntityId: identities[n],
    })),
    selections: [
      { bindingId: `binding:${name}`, optionId: option(name), layers: 1 },
    ],
    hit: {
      actorId: `entity:${name}`,
      targetId: "entity:enemy",
      actionId: "action:m6-extra",
      element: "physical",
      skillCategory: "uncategorized",
      skillTags: [],
      skillTargetIds: [target(name)],
      ...(name === "jane" ? { declaredCriticalRate: 0.25 } : {}),
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: item(name),
          damageMultiplier: 0,
          stat: "anomalyProficiency",
          statSource: { entityId: `entity:${name}` },
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
  } as unknown as Input
}
function actor(i: Input, name: Name) {
  const a = i.world.entities.find((e) => e.entityId === `entity:${name}`)!
  if (a.kind !== "actor") throw new Error("expected actor")
  return a
}
function calculate(i: Input) {
  const result = calculateStaticDamageFromCatalog(i)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function ordinary(i: Input) {
  delete i.hit.declaredCriticalRate
  i.hit.skillCategory = "basic"
  i.hit.skillTargetIds = []
  i.hit.damageItems = [
    {
      mode: "direct",
      role: "base",
      itemId: "ordinary",
      damageMultiplier: 2,
      stat: "attack",
      statSource: { entityId: i.hit.actorId },
    },
  ]
  i.selections[0]!.layers = 0
  return i
}
function select(i: Input, name: Name, id: string) {
  i.selections.push({ bindingId: `binding:${name}`, optionId: id, layers: 1 })
}

describe("PR15 M6 AP additional damage through official data exports and catalog", () => {
  it.each([
    ["jane", 0, 6400, 9600, 6400],
    ["jane", 0.25, 6400, 9600, 7200],
    ["jane", 1, 6400, 9600, 9600],
    ["alice", undefined, 13200, 19800, 19800],
  ] as const)(
    "%s AP400 declared r=%s yields %s / %s / %s",
    async (name, r, base, critical, expected) => {
      const i = await input(name)
      if (r !== undefined) i.hit.declaredCriticalRate = r
      const result = calculate(i)
      expect(i.catalog.revision).toBe("46")
      expect(result.factors.nonCritical.baseDamage).toBe(base)
      expect(result.nonCritical).toBe(base)
      expect(result.critical).toBe(critical)
      expect(result.expected).toBe(expected)
      expect(result.criticalRate).toBe(r ?? 1)
    },
  )
  it.each(["jane", "alice"] as const)(
    "%s AP250 reads holder points despite different ATK/DEF/AM and teammate AP",
    async (name) => {
      const i = await input(name, 250)
      actor(i, name).generalStats.attack = general(7777)
      actor(i, name).generalStats.defense = general(9999)
      actor(i, name).generalStats.anomalyMastery = general(200)
      const teammate = name === "jane" ? "alice" : "jane"
      actor(i, teammate).generalStats.anomalyProficiency = general(3456)
      expect(calculate(i).expected).toBe(name === "jane" ? 4500 : 12375)
      actor(i, teammate).generalStats.anomalyProficiency = general(50)
      expect(calculate(i).expected).toBe(name === "jane" ? 4500 : 12375)
    },
  )
  describe.each(["jane", "alice"] as const)("%s boundaries", (name) => {
    it.each([0, 1, 2, 3, 4, 5])("rejects M%s", async (rank) => {
      const i = await input(name)
      Object.assign(
        i.bindings.find((b) => b.holderId === i.hit.actorId)!.configuration,
        { mindscapeRank: rank },
      )
      expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
    })
    it.each([-1, 0.5, 2, NaN, Infinity])("rejects layer %s", async (layers) => {
      const i = await input(name)
      i.selections[0]!.layers = layers
      expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
    })
    it("closes at zero without requiring the independent item; ordinary damage stays nonzero", async () => {
      const i = ordinary(await input(name))
      const result = calculate(i)
      expect(result.expected).toBe(2250)
      expect(result.criticalRate).toBe(0.25)
      expect(
        result.evaluation.contributions.some((c) =>
          c.origin.effectId.includes("nanoka:m6-proficiency-damage"),
        ),
      ).toBe(false)
    })
    it("closes the zero-multiplier item; a closed Jane declaration has no owner", async () => {
      const i = await input(name)
      i.selections[0]!.layers = 0
      if (name === "jane")
        expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
      delete i.hit.declaredCriticalRate
      expect(calculate(i).expected).toBe(0)
    })
    const invalid: readonly [string, (i: Input) => void][] = [
      [
        "missing configuration",
        (i) => {
          Reflect.deleteProperty(
            i.bindings.find((b) => b.holderId === i.hit.actorId)!.configuration,
            "mindscapeRank",
          )
        },
      ],
      [
        "invalid configuration",
        (i) => {
          Object.assign(
            i.bindings.find((b) => b.holderId === i.hit.actorId)!.configuration,
            { mindscapeRank: 7 },
          )
        },
      ],
      [
        "missing item",
        (i) => {
          Object.assign(i.hit, { damageItems: [] })
        },
      ],
      [
        "wrong item",
        (i) => {
          i.hit.damageItems[0]!.itemId = "wrong"
        },
      ],
      [
        "nonzero initial multiplier",
        (i) => {
          Object.assign(i.hit.damageItems[0]!, { damageMultiplier: 1 })
        },
      ],
      [
        "ATK instead of AP",
        (i) => {
          Object.assign(i.hit.damageItems[0]!, { stat: "attack" })
        },
      ],
      [
        "AM instead of AP",
        (i) => {
          Object.assign(i.hit.damageItems[0]!, { stat: "anomalyMastery" })
        },
      ],
      [
        "trigger teammate source",
        (i) => {
          Object.assign(i.hit.damageItems[0]!, {
            statSource: {
              entityId: `entity:${name === "jane" ? "alice" : "jane"}`,
            },
          })
        },
      ],
      [
        "snapshot source",
        (i) => {
          Object.assign(i.hit.damageItems[0]!, {
            statSource: { entityId: i.hit.actorId, snapshotId: "snapshot:old" },
          })
        },
      ],
      [
        "missing AP",
        (i) => {
          delete actor(i, name).generalStats.anomalyProficiency
        },
      ],
      [
        "basic category",
        (i) => {
          i.hit.skillCategory = "basic"
        },
      ],
      [
        "chain category tag",
        (i) => {
          i.hit.skillTags = ["zzz-hp:category:chain"]
        },
      ],
      [
        "follow-up tag",
        (i) => {
          i.hit.skillTags = ["zzz-hp:follow-up"]
        },
      ],
      [
        "ordinary named target",
        (i) => {
          // 两位角色的正式冲刺攻击均引用这一真实公共目标。
          const ordinaryTarget = i.catalog.skillTargets.find(
            (t) => t.targetId === "zzz-hp:skill:all-dodge-ms0dnpmr",
          )!
          expect(ordinaryTarget).toBeDefined()
          i.hit.skillTargetIds!.push(ordinaryTarget.targetId)
        },
      ],
      [
        "foreign independent target",
        (i) => {
          i.hit.skillTargetIds = [target(name === "jane" ? "alice" : "jane")]
        },
      ],
      [
        "mixed ordinary item",
        (i) => {
          i.hit.damageItems.push({
            mode: "direct",
            role: "base",
            itemId: "ordinary",
            stat: "attack",
            damageMultiplier: 2,
            statSource: { entityId: i.hit.actorId },
          })
        },
      ],
      [
        "duplicate selection",
        (i) => {
          i.selections.push({ ...i.selections[0]! })
        },
      ],
      [
        "missing ordinary CD",
        (i) => {
          delete actor(i, name).directStats.criticalDamage
        },
      ],
    ]
    it.each(invalid)("rejects %s", async (_, mutate) => {
      const i = await input(name)
      mutate(i)
      expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
    })
    it.each(["fire", "ice", "frost", "electric", "ether"] as const)(
      "gives no physical event contribution to %s",
      async (element) => {
        const i = await input(name)
        i.hit.element = element
        const result = calculate(i)
        expect(result.expected).toBe(0)
        expect(
          result.evaluation.contributions.filter((c) =>
            c.origin.effectId.includes("nanoka:m6-proficiency-damage"),
          ),
        ).toEqual([])
      },
    )
    it("missing independent target cannot activate the event", async () => {
      const i = await input(name)
      i.hit.skillTargetIds = []
      expect(calculate(i).expected).toBe(0)
    })
    it("rejects same-holder double binding and isolates a second holder's own request", async () => {
      const i = await input(name)
      const binding = i.bindings.find((b) => b.holderId === i.hit.actorId)!
      i.bindings.push({ ...binding, bindingId: "binding:duplicate" })
      i.selections.push({ ...i.selections[0]!, bindingId: "binding:duplicate" })
      expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
      const separate = await input(name)
      const copy = structuredClone(actor(separate, name))
      copy.entityId = "entity:second"
      copy.generalStats.anomalyProficiency = general(250)
      separate.world.entities.push(copy)
      separate.bindings.push({
        ...binding,
        bindingId: "binding:second",
        holderId: "entity:second",
      })
      separate.actorSources.push({
        entityId: "entity:second",
        agentEntityId: identities[name],
      })
      separate.selections = [
        { ...separate.selections[0]!, bindingId: "binding:second" },
      ]
      separate.hit.actorId = "entity:second"
      Object.assign(separate.hit.damageItems[0]!, {
        statSource: { entityId: "entity:second" },
      })
      expect(calculate(separate).expected).toBe(name === "jane" ? 4500 : 12375)
      Object.assign(separate.hit.damageItems[0]!, {
        statSource: { entityId: `entity:${name}` },
      })
      expect(calculateStaticDamageFromCatalog(separate).ok).toBe(false)
    })
  })
  it.each([undefined, -0.1, 1.1, NaN, Infinity, "0.25"])(
    "Jane requires an explicit valid new-attack probability: %s",
    async (value) => {
      const i = await input("jane")
      if (value === undefined) delete i.hit.declaredCriticalRate
      else Object.assign(i.hit, { declaredCriticalRate: value })
      expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
    },
  )
  it.each([0, 0.25, 1])(
    "Alice rejects a second probability source r=%s",
    async (r) => {
      const i = await input("alice")
      i.hit.declaredCriticalRate = r
      expect(calculateStaticDamageFromCatalog(i).ok).toBe(false)
    },
  )
  it("Jane old CR/CD remain independent; declared CR replaces ordinary CR and ordinary CD coexists", async () => {
    const i = await input("jane")
    const cr = "agents:jane:mindscape:6:blk-legacy:legacy-self-critRate",
      cd = "agents:jane:mindscape:6:blk-legacy:legacy-self-critDmg"
    select(i, "jane", cr)
    select(i, "jane", cd)
    const extra = calculate(i)
    expect(extra.criticalRate).toBe(0.25)
    expect(extra.critical).toBe(12160)
    expect(extra.expected).toBe(7840)
    const regular = calculate(ordinary(i))
    expect(regular.criticalRate).toBeCloseTo(0.45)
    expect(regular.critical).toBe(3800)
    expect(regular.expected).toBe(2810)
  })
  it("preserves the engine's explicit ordinary CD source instead of forcing holder CD", async () => {
    const i = await input("jane")
    actor(i, "alice").directStats.criticalDamage = {
      baseValue: 1,
      additions: [],
    }
    const explicitSource = {
      ...i,
      hit: {
        ...i.hit,
        attributeSources: {
          criticalDamage: { entityId: "entity:alice" as const },
        },
      },
    }
    expect(calculate(explicitSource).expected).toBe(8000)
  })
  it("Alice current AP includes the existing nonzero AM conversion without multiplying by AM again", async () => {
    const i = await input("alice")
    actor(i, "alice").generalStats.anomalyMastery = general(200)
    select(
      i,
      "alice",
      "agents:alice:mindscape:0:blk-ms4sp1go-wduvv6:eff-ms4sp1go-l0zxis",
    )
    // (400 + (200 - 140) * 1.6) * 33 * 1.5 = 24552.
    expect(calculate(i).expected).toBeCloseTo(24552, 8)
  })
  it("Jane Assault CR/CD and anomaly bonus contribute to a nonzero Assault but not its independent regular extra attack", async () => {
    const i = await input("jane")
    for (const id of [
      "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34bcgu-8f1m63",
      "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34c40c-3b3j3z",
      "agents:jane:mindscape:2:blk-legacy:legacy-team-anomalyCritDmg",
      "agents:jane:mindscape:4:blk-legacy:legacy-team-anomalyDmgBonus",
    ])
      select(i, "jane", id)
    expect(calculate(i).expected).toBe(7200)
    ordinary(i)
    if (i.damage.kind !== "regular") throw new Error("regular")
    i.damage = {
      ...i.damage,
      kind: "anomaly",
      anomalySource: { entityId: "entity:jane", level: 1 },
      anomalyDamageBonus: [],
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      refringe: { mode: "settled", multiplier: 1 },
    }
    const assault = calculate(i)
    expect(assault.nonCritical).toBeGreaterThan(0)
    expect(assault.criticalRate).toBeGreaterThan(0)
    expect(assault.critical).toBeGreaterThan(assault.nonCritical)
    const control = structuredClone(i)
    control.selections = []
    expect(assault.expected).toBeGreaterThan(calculate(control).expected)
  })
  it("same world supports both separate events and Alice's guaranteed hit leaves ordinary hits unchanged", async () => {
    const jane = await input("jane"),
      alice = await input("alice")
    actor(jane, "alice").generalStats.anomalyProficiency = general(400)
    alice.world = jane.world
    alice.bindings = jane.bindings
    alice.actorSources = jane.actorSources
    const before = structuredClone(alice.world)
    expect(calculate(jane).expected).toBe(7200)
    expect(calculate(alice).expected).toBe(19800)
    expect(alice.world).toEqual(before)
    expect(calculate(ordinary(alice)).expected).toBe(2250)
    expect(actor(alice, "alice").directStats.criticalRate!.baseValue).toBe(0.25)
  })
  it.each(["1261", "1401"])(
    "all formal %s actions resolve by identity without automatic M6 items",
    async (id) => {
      const { loaded: calculationData } = await data()
      const agent = calculationData.agents.find(
        (a) => a.attributes.entityId === id,
      )!
      expect(agent.actions.actions.length).toBeGreaterThan(0)
      for (const action of agent.actions.actions) {
        const resolved = resolveAgentAction({
          agent: agent.actions,
          actionId: action.actionId,
          mindscapeRank: 6,
          potentialLevel: action.potentialLevels?.[0] ?? 0,
          levels: {
            basic: { mode: "trained", value: 12 },
            dodge: { mode: "trained", value: 12 },
            assist: { mode: "trained", value: 12 },
            special: { mode: "trained", value: 12 },
            chain: { mode: "trained", value: 12 },
          },
        })
        expect(resolved.ok, action.actionId).toBe(true)
        if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
        if (resolved.calculation.kind === "damage") {
          expect(
            resolved.calculation.segments.length,
            action.actionId,
          ).toBeGreaterThan(0)
          for (const segment of resolved.calculation.segments) {
            expect(segment.damageItems.length, action.actionId).toBeGreaterThan(
              0,
            )
            for (const damageItem of segment.damageItems)
              expect([item("jane"), item("alice")]).not.toContain(
                damageItem.itemId,
              )
          }
        } else expect(resolved.calculation.kind).toBe("daze-only")
        for (const skillTarget of resolved.skillTargetIds)
          expect([target("jane"), target("alice")]).not.toContain(skillTarget)
      }
    },
  )
})

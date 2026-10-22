import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog

const abrasionCore = "agents:pheony:mindscape:0:abrasion-core-state"
const abrasionM1 = "agents:pheony:mindscape:1:abrasion-mindscape-1-state"
const abrasionM2 = "agents:pheony:mindscape:2:abrasion-mindscape-2-state"
const oldM1Single = "agents:pheony:mindscape:1:blk-mindscapeBuffs-1-1:eff-19"
const oldM2Single = "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-6"
const m6ResPen = "agents:pheony:mindscape:6:blk-mindscapeBuffs-6-1:eff-7"
const m6Defense = "agents:pheony:mindscape:6:blk-mindscapeBuffs-6-1:eff-8"

const general = (value: number) => ({
  baseValue: value,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

type Channel = "anomaly" | "anomaly-settlement" | "vortex" | "luminize"

function input(options: {
  mindscapeRank: 0 | 1 | 2 | 6
  anomalyMastery: number
  channel: Channel
  actor?: "pheony" | "ally"
  extraSelections?: readonly string[]
}): StaticCatalogDamageInput {
  const actor = options.actor ?? "pheony"
  const pheonyBinding = "binding:pheony" as const
  const actorId = `entity:${actor}` as const
  const completeState =
    options.mindscapeRank === 0
      ? abrasionCore
      : options.mindscapeRank === 1
        ? abrasionM1
        : abrasionM2
  const selections: {
    optionId: string
    bindingId: `binding:${string}`
    layers: number
  }[] = [
    { optionId: completeState, bindingId: pheonyBinding, layers: 1 },
    ...(options.extraSelections ?? []).map((optionId) => ({
      optionId,
      bindingId: pheonyBinding,
      layers: 1,
    })),
  ]
  const commonDamage = {
    damageBonus: { settledMultiplier: 1 },
    anomalySource: { entityId: "entity:pheony", level: 60 },
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
    anomalyDamageBonus: [],
    refringe: { mode: "settled" as const, multiplier: 1 },
    anomalyCriticalRate: 0,
    anomalyCriticalDamage: [],
  }
  const damage =
    options.channel === "luminize"
      ? {
          kind: "luminize" as const,
          damageBonus: { settledMultiplier: 1 },
          anomalySource: { entityId: "entity:pheony", level: 60 },
          defense: commonDamage.defense,
          resistance: commonDamage.resistance,
          damageTaken: commonDamage.damageTaken,
          stunDamage: commonDamage.stunDamage,
          anomalyDamageBonus: [],
          refringe: commonDamage.refringe,
          luminizeCriticalRate: 0,
          luminizeCriticalDamage: [],
          luminizeMultiplier: {
            baseLuminizeMultiplier: 1,
            multiplicativeLuminizeMultiplierAdjustments: [],
          },
        }
      : options.channel === "anomaly-settlement"
        ? {
            kind: "anomaly-settlement" as const,
            ...commonDamage,
            anomalySettlementCriticalRate: 0,
            anomalySettlementCriticalDamage: [],
          }
        : options.channel === "vortex"
          ? {
              kind: "vortex" as const,
              ...commonDamage,
              vortexCriticalRate: 0,
              vortexCriticalDamage: [],
            }
          : { kind: "anomaly" as const, ...commonDamage }
  return {
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:pheony",
        kind: "agent",
        holderId: "entity:pheony",
        sourceEntityId: "1641",
        eligible: true,
        configuration: {
          mindscapeRank: options.mindscapeRank,
          coreSkillLevel: 7,
        },
      },
    ],
    actorSources: [
      { entityId: "entity:pheony", agentEntityId: "1641" },
      { entityId: "entity:ally", agentEntityId: "1301" },
    ],
    selections,
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:pheony",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            health: general(24000),
            impact: general(100),
            anomalyProficiency: general(300),
            anomalyMastery: general(options.anomalyMastery),
          },
          directStats: {
            criticalRate: { baseValue: 0.05, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:ally",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            health: general(24000),
            anomalyProficiency: general(300),
          },
          directStats: {
            criticalRate: { baseValue: 0.05, additions: [] },
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
    hit: {
      actorId,
      targetId: "entity:enemy",
      actionId: "action:test",
      skillCategory: "basic",
      element: "fire",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "test",
          stat: "attack",
          statSource: { entityId: "entity:pheony" },
          damageMultiplier: 1,
        },
      ],
      skillTags: [],
    },
    damage: damage as unknown as StaticCatalogDamageInput["damage"],
  }
}

const ok = (value: StaticCatalogDamageInput) => {
  const result = calculateStaticDamageFromCatalog(value)
  if (!result.ok) {
    console.error("STATIC FAILURE", JSON.stringify(result.issues))
    throw new Error("static failure")
  }
  return result.value
}

const contributionIds = (value: StaticCatalogDamageInput) =>
  ok(value).evaluation.contributions.map(
    (contribution) => contribution.origin.effectId,
  )

describe("D4 Pheony abrasion catalog behavior", () => {
  it("applies core crit rate 30% plus AP conversion at the 155/255 boundaries", () => {
    expect(
      ok(input({ mindscapeRank: 0, anomalyMastery: 155, channel: "anomaly" }))
        .criticalRate,
    ).toBeCloseTo(0.3, 10)
    expect(
      ok(input({ mindscapeRank: 0, anomalyMastery: 200, channel: "anomaly" }))
        .criticalRate,
    ).toBeCloseTo(0.615, 10)
    expect(
      ok(input({ mindscapeRank: 0, anomalyMastery: 255, channel: "anomaly" }))
        .criticalRate,
    ).toBeCloseTo(1, 10)
    expect(
      ok(input({ mindscapeRank: 0, anomalyMastery: 300, channel: "anomaly" }))
        .criticalRate,
    ).toBeCloseTo(1, 10)
  })

  it("applies the four anomaly channels independently", () => {
    // 耀变的目录入口要求恰好一条精通换算映射；Pheony 的核心记录不提供该
    // 映射，因此四通道在数据层断言 luminize-critical-* 规则，这里只跑
    // 可独立结算的三个异常子类。
    for (const [channel, expected] of [
      ["anomaly", 0.3],
      ["anomaly-settlement", 0.3],
      ["vortex", 0.3],
    ] as const) {
      const result = ok(
        input({ mindscapeRank: 0, anomalyMastery: 155, channel }),
      )
      expect(result.criticalRate, channel).toBeCloseTo(expected, 10)
    }
  })

  it("gates M1 and M2 inside the single complete-state option", () => {
    const atM0 = contributionIds(
      input({
        mindscapeRank: 0,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
      }),
    )
    expect(
      atM0.some((id) => id.includes("eff-19:blk-mindscapeBuffs-1-1")),
    ).toBe(false)
    expect(atM0.some((id) => id.includes("eff-6:blk-mindscapeBuffs-2-1"))).toBe(
      false,
    )

    const atM1 = contributionIds(
      input({
        mindscapeRank: 1,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
      }),
    )
    expect(
      atM1.some((id) => id.includes("eff-19:blk-mindscapeBuffs-1-1")),
    ).toBe(true)
    expect(atM1.some((id) => id.includes("eff-6:blk-mindscapeBuffs-2-1"))).toBe(
      false,
    )

    const atM2 = contributionIds(
      input({
        mindscapeRank: 2,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
      }),
    )
    expect(
      atM2.some((id) => id.includes("eff-19:blk-mindscapeBuffs-1-1")),
    ).toBe(true)
    expect(atM2.some((id) => id.includes("eff-6:blk-mindscapeBuffs-2-1"))).toBe(
      true,
    )
  })

  it("keeps the M2 30% damage bonus on the holder and off teammates", () => {
    const holder = contributionIds(
      input({
        mindscapeRank: 2,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
      }),
    )
    expect(
      holder.some((id) => id.includes("eff-6:blk-mindscapeBuffs-2-1")),
    ).toBe(true)
    const ally = contributionIds(
      input({
        mindscapeRank: 2,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
        actor: "ally",
      }),
    )
    expect(ally.some((id) => id.includes("eff-6:blk-mindscapeBuffs-2-1"))).toBe(
      false,
    )
    expect(
      ally.some((id) => id.includes("eff-19:blk-mindscapeBuffs-1-1")),
    ).toBe(true)
  })

  it("keeps M6 resistance ignore and anomaly-release defense ignore independent", () => {
    const settlement = ok(
      input({
        mindscapeRank: 6,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
        extraSelections: [m6ResPen, m6Defense],
      }),
    )
    const ids = settlement.evaluation.contributions.map(
      (contribution) => contribution.origin.effectId,
    )
    expect(ids.some((id) => id.includes("eff-7:blk-mindscapeBuffs-6-1"))).toBe(
      true,
    )
    expect(ids.some((id) => id.includes("eff-8:blk-mindscapeBuffs-6-1"))).toBe(
      true,
    )

    const anomaly = ok(
      input({
        mindscapeRank: 6,
        anomalyMastery: 155,
        channel: "anomaly",
        extraSelections: [m6ResPen, m6Defense],
      }),
    )
    const anomalyIds = anomaly.evaluation.contributions.map(
      (contribution) => contribution.origin.effectId,
    )
    expect(
      anomalyIds.some((id) => id.includes("eff-7:blk-mindscapeBuffs-6-1")),
    ).toBe(true)
    expect(
      anomalyIds.some((id) => id.includes("eff-8:blk-mindscapeBuffs-6-1")),
    ).toBe(false)
  })

  it("rejects selecting two cumulative complete-state tiers", () => {
    const result = calculateStaticDamageFromCatalog(
      input({
        mindscapeRank: 1,
        anomalyMastery: 155,
        channel: "anomaly-settlement",
        extraSelections: [abrasionCore],
      }),
    )
    expect(result.ok).toBe(false)
  })

  it("rejects the old half-state M1/M2 options", () => {
    for (const optionId of [oldM1Single, oldM2Single]) {
      const result = calculateStaticDamageFromCatalog(
        input({
          mindscapeRank: 2,
          anomalyMastery: 155,
          channel: "anomaly-settlement",
          extraSelections: [optionId],
        }),
      )
      expect(result.ok, optionId).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.message.includes("semantic-conflict"),
          ),
          optionId,
        ).toBe(true)
    }
  })

  it("rejects explicitly unsupported resource and action clauses", () => {
    for (const optionId of [
      "nanoka:agents:1641:rising-change",
      "nanoka:agents:1641:abrasion-periodic-fire",
      "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-4",
      "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-9",
      "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-mvdz21so-s2au9j",
    ]) {
      const result = calculateStaticDamageFromCatalog(
        input({
          mindscapeRank: 2,
          anomalyMastery: 155,
          channel: "anomaly",
          extraSelections: [optionId],
        }),
      )
      expect(result.ok, optionId).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.message.includes("formula-out-of-scope"),
          ) ||
            result.issues.some(
              (issue) =>
                issue.code === "INVALID_INPUT" &&
                issue.message.includes("semantic-conflict"),
            ),
          optionId,
        ).toBe(true)
    }
  })
})

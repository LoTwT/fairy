import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"

/**
 * PR-B1：菲欧妮额外能力[黑枝王牌]的 15% 暴伤必须同时满足
 * - 敌人处于[灼蚀]（选中本选项即声明该状态）；
 * - 同队存在另一名[异常]职业角色，或另一名的同阵营（camp 12）角色。
 *
 * 两条队友资格取 OR，并与受益职业、元素、队内人数等其他适用条件取 AND；
 * 持有者本人与异队成员都不满足资格。
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const committedCatalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog

const abrasionCore = "agents:pheony:mindscape:0:abrasion-core-state"
const abrasionM1 = "agents:pheony:mindscape:1:abrasion-mindscape-1-state"
const abrasionM2 = "agents:pheony:mindscape:2:abrasion-mindscape-2-state"
const extra = {
  anomaly: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-4",
  anomalySettlement: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-10",
  vortex: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-11",
  luminize: "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-12",
} as const

type Channel = "anomaly" | "anomaly-settlement" | "vortex" | "luminize"
type Teammate =
  | { readonly agentEntityId: string; readonly team?: "same" | "other" }
  | undefined

const general = (value: number) => ({
  baseValue: value,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

const commonDamage = () => ({
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
})

const damageFor = (channel: Channel) =>
  channel === "luminize"
    ? {
        kind: "luminize" as const,
        damageBonus: { settledMultiplier: 1 },
        anomalySource: { entityId: "entity:pheony", level: 60 },
        defense: commonDamage().defense,
        resistance: commonDamage().resistance,
        damageTaken: commonDamage().damageTaken,
        stunDamage: commonDamage().stunDamage,
        anomalyDamageBonus: [],
        refringe: commonDamage().refringe,
        luminizeCriticalRate: 0,
        luminizeCriticalDamage: [],
        luminizeMultiplier: {
          baseLuminizeMultiplier: 1,
          multiplicativeLuminizeMultiplierAdjustments: [],
        },
      }
    : channel === "anomaly-settlement"
      ? {
          kind: "anomaly-settlement" as const,
          ...commonDamage(),
          anomalySettlementCriticalRate: 0,
          anomalySettlementCriticalDamage: [],
        }
      : channel === "vortex"
        ? {
            kind: "vortex" as const,
            ...commonDamage(),
            vortexCriticalRate: 0,
            vortexCriticalDamage: [],
          }
        : { kind: "anomaly" as const, ...commonDamage() }

const optionSelection = (
  optionId: string,
  bindingId: `binding:${string}` = "binding:pheony",
  layers = 1,
) => ({ optionId, bindingId, layers })

function request(options: {
  readonly channel?: Channel
  readonly teammate?: Teammate
  readonly extraTeammates?: readonly NonNullable<Teammate>[]
  readonly mindscapeRank?: 0 | 1 | 2
  readonly includeState?: boolean
  readonly includeExtra?: boolean
  readonly hitActor?: "pheony" | "teammate"
  readonly catalog?: StaticEffectCatalog
  readonly mutate?: (variant: StaticCatalogVariantView) => void
  readonly omitTeammateIdentity?: boolean
  readonly selectedExtra?: string
}): StaticCatalogDamageInput {
  const catalog =
    options.mutate === undefined
      ? (options.catalog ?? committedCatalog)
      : structuredClone(options.catalog ?? committedCatalog)
  const channel = options.channel ?? "anomaly-settlement"
  const rank = options.mindscapeRank ?? 0
  const state = rank === 0 ? abrasionCore : rank === 1 ? abrasionM1 : abrasionM2
  const teammate = options.teammate
  const extraTeammates = options.extraTeammates ?? []
  const teammateEntity = teammate === undefined ? undefined : "entity:teammate"
  const actorSources: StaticCatalogDamageInput["actorSources"][number][] = [
    { entityId: "entity:pheony", agentEntityId: "1641" },
  ]
  const worldEntities: StaticCatalogDamageInput["world"]["entities"][number][] =
    [
      {
        kind: "actor",
        entityId: "entity:pheony",
        teamId: "team:players",
        generalStats: {
          attack: general(1000),
          health: general(24000),
          impact: general(100),
          anomalyProficiency: general(300),
          anomalyMastery: general(155),
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
    ]
  for (const [index, entry] of [teammate, ...extraTeammates].entries()) {
    if (entry === undefined) continue
    const entityId = (
      index === 0 ? "entity:teammate" : `entity:teammate-${index}`
    ) as `entity:${string}`
    if (!(index === 0 && options.omitTeammateIdentity === true))
      actorSources.push({ entityId, agentEntityId: entry.agentEntityId })
    worldEntities.push({
      kind: "actor",
      entityId,
      teamId: entry.team === "other" ? "team:other" : "team:players",
      generalStats: {
        attack: general(1000),
        health: general(24000),
        anomalyProficiency: general(100),
      },
      directStats: {
        criticalRate: { baseValue: 0.05, additions: [] },
        criticalDamage: { baseValue: 0.5, additions: [] },
        penetrationRatio: { baseValue: 0, additions: [] },
      },
    })
  }
  if (options.mutate) {
    const optionId = options.selectedExtra ?? extra[channelKey(channel)]
    const option = catalog.options.find((entry) => entry.optionId === optionId)
    if (!option) throw new Error(`missing fixture option ${optionId}`)
    options.mutate(option.variants[0] as StaticCatalogVariantView)
  }
  const selections: StaticCatalogDamageInput["selections"][number][] = [
    ...(options.includeState === false ? [] : [optionSelection(state)]),
    ...(options.includeExtra === false
      ? []
      : [optionSelection(options.selectedExtra ?? extra[channelKey(channel)])]),
  ]
  const hitActor =
    options.hitActor === "teammate" && teammateEntity !== undefined
      ? teammateEntity
      : "entity:pheony"
  const hitElement = options.hitActor === "teammate" ? "physical" : "fire"
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
          mindscapeRank: rank,
          coreSkillLevel: 7,
        },
      },
    ],
    actorSources,
    selections,
    world: {
      entities: worldEntities,
      states: [],
      distances: [],
    },
    hit: {
      actorId: hitActor,
      targetId: "entity:enemy",
      actionId: "action:test",
      skillCategory: "basic",
      element: hitElement,
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
    damage: damageFor(channel) as unknown as StaticCatalogDamageInput["damage"],
  }
}

function channelKey(channel: Channel) {
  return channel === "anomaly-settlement" ? "anomalySettlement" : channel
}

interface StaticCatalogVariantView {
  applicability: {
    beneficiaryProfession?: string
    beneficiaryElements?: readonly string[]
    otherTeammateProfessions?: readonly string[]
    otherTeammateAgentEntityIds?: readonly string[]
    teamProfession?: { profession: string; counts: readonly number[] }
  }
}

const ok = (input: StaticCatalogDamageInput) => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

const contributionsFor = (result: StaticDamageResult, effectIdPart: string) =>
  result.evaluation.contributions.filter((entry) =>
    entry.origin.effectId.includes(`:${effectIdPart}:`),
  )

const totalFor = (result: StaticDamageResult, effectIdPart: string) =>
  contributionsFor(result, effectIdPart).reduce(
    (sum, entry) => sum + entry.value.value,
    0,
  )

describe("Pheony additional ability team eligibility", () => {
  it.each([
    ["Jane (another Anomaly character)", "1261"],
    ["Dialyn (same faction, non-Anomaly)", "1481"],
    ["a second Pheony instance", "1641"],
  ])("qualifies when %s is on the same team", (_label, agentEntityId) => {
    const result = ok(
      request({ teammate: { agentEntityId }, includeExtra: true }),
    )
    expect(totalFor(result, "eff-10")).toBeCloseTo(0.15, 12)
    expect(totalFor(result, "eff-6")).toBeCloseTo(0.25, 12)
  })

  it("does not qualify with only the holder", () => {
    const result = ok(request({ includeExtra: true }))
    expect(totalFor(result, "eff-10")).toBe(0)
    expect(totalFor(result, "eff-6")).toBeCloseTo(0.25, 12)
  })

  it("does not qualify with a non-Anomaly, non-faction teammate", () => {
    const result = ok(
      request({
        teammate: { agentEntityId: "1301" },
        includeExtra: true,
      }),
    )
    expect(totalFor(result, "eff-10")).toBe(0)
    expect(totalFor(result, "eff-6")).toBeCloseTo(0.25, 12)
  })

  it("does not qualify with a same-profession teammate on another team", () => {
    const result = ok(
      request({
        teammate: { agentEntityId: "1261", team: "other" },
        includeExtra: true,
      }),
    )
    expect(totalFor(result, "eff-10")).toBe(0)
  })

  it("does not apply the 15% unless the state-declaring option is selected", () => {
    const result = ok(
      request({
        teammate: { agentEntityId: "1261" },
        includeExtra: false,
      }),
    )
    expect(totalFor(result, "eff-10")).toBe(0)
    expect(totalFor(result, "eff-6")).toBeCloseTo(0.25, 12)
  })

  it("rejects a missing same-team identity fact instead of guessing", () => {
    const result = calculateStaticDamageFromCatalog(
      request({
        teammate: { agentEntityId: "1261" },
        omitTeammateIdentity: true,
        includeExtra: true,
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected structured rejection")
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_FACT",
          pointer: "/actorSources",
          message: expect.stringContaining("Missing teammate identity"),
        }),
      ]),
    )
  })

  it("takes the two teammate qualifications as OR", () => {
    const byFaction = ok(
      request({
        teammate: { agentEntityId: "1481" },
        mutate: (variant) => {
          variant.applicability.otherTeammateProfessions = ["异常"]
          variant.applicability.otherTeammateAgentEntityIds = ["1481"]
        },
        includeExtra: true,
      }),
    )
    expect(totalFor(byFaction, "eff-10")).toBeCloseTo(0.15, 12)

    const byProfession = ok(
      request({
        teammate: { agentEntityId: "1261" },
        mutate: (variant) => {
          variant.applicability.otherTeammateProfessions = ["异常"]
          variant.applicability.otherTeammateAgentEntityIds = ["1481"]
        },
        includeExtra: true,
      }),
    )
    expect(totalFor(byProfession, "eff-10")).toBeCloseTo(0.15, 12)

    const neither = ok(
      request({
        teammate: { agentEntityId: "1301" },
        mutate: (variant) => {
          variant.applicability.otherTeammateProfessions = ["异常"]
          variant.applicability.otherTeammateAgentEntityIds = ["1481"]
        },
        includeExtra: true,
      }),
    )
    expect(totalFor(neither, "eff-10")).toBe(0)
  })

  it("cannot be expressed by a profession-only substitute (ablation)", () => {
    // 只按 camp 12 的职业并集近似阵营时，非阵营击破角色 Trigger（1361）
    // 会误满足；只按“异常”职业又会漏掉同阵营的 Dialyn（1481）。
    const nonFaction = ok(
      request({
        teammate: { agentEntityId: "1361" },
        includeExtra: true,
      }),
    )
    expect(totalFor(nonFaction, "eff-10")).toBe(0)

    const professionSubstitute = ok(
      request({
        teammate: { agentEntityId: "1361" },
        mutate: (variant) => {
          variant.applicability.otherTeammateProfessions = [
            "异常",
            "击破",
            "命破",
            "防护",
          ]
          delete (variant.applicability as Record<string, unknown>)[
            "otherTeammateAgentEntityIds"
          ]
        },
        includeExtra: true,
      }),
    )
    expect(totalFor(professionSubstitute, "eff-10")).toBeCloseTo(0.15, 12)

    const anomalyOnlySubstitute = ok(
      request({
        teammate: { agentEntityId: "1481" },
        mutate: (variant) => {
          variant.applicability.otherTeammateProfessions = ["异常"]
          delete (variant.applicability as Record<string, unknown>)[
            "otherTeammateAgentEntityIds"
          ]
        },
        includeExtra: true,
      }),
    )
    expect(totalFor(anomalyOnlySubstitute, "eff-10")).toBe(0)
  })

  it("keeps the existing beneficiary and team-count filters as AND", () => {
    const input = request({
      teammate: { agentEntityId: "1481" },
      extraTeammates: [{ agentEntityId: "1301" }],
      hitActor: "teammate",
      mutate: (variant) => {
        variant.applicability.beneficiaryProfession = "击破"
      },
      includeExtra: true,
    })
    expect(totalFor(ok(input), "eff-10")).toBeCloseTo(0.15, 12)

    const wrongProfession = request({
      teammate: { agentEntityId: "1481" },
      hitActor: "pheony",
      mutate: (variant) => {
        variant.applicability.beneficiaryProfession = "击破"
      },
      includeExtra: true,
    })
    expect(totalFor(ok(wrongProfession), "eff-10")).toBe(0)

    const wrongElement = request({
      teammate: { agentEntityId: "1481" },
      hitActor: "teammate",
      mutate: (variant) => {
        variant.applicability.beneficiaryElements = ["wind"]
      },
      includeExtra: true,
    })
    expect(totalFor(ok(wrongElement), "eff-10")).toBe(0)

    const missingTeamProfession = request({
      teammate: { agentEntityId: "1481" },
      hitActor: "teammate",
      mutate: (variant) => {
        variant.applicability.teamProfession = {
          profession: "强攻",
          counts: [2],
        }
      },
      includeExtra: true,
    })
    expect(totalFor(ok(missingTeamProfession), "eff-10")).toBe(0)

    const satisfiedTeamProfession = request({
      teammate: { agentEntityId: "1481" },
      extraTeammates: [{ agentEntityId: "1301" }],
      hitActor: "teammate",
      mutate: (variant) => {
        variant.applicability.teamProfession = {
          profession: "强攻",
          counts: [1],
        }
      },
      includeExtra: true,
    })
    expect(totalFor(ok(satisfiedTeamProfession), "eff-10")).toBeCloseTo(
      0.15,
      12,
    )
  })

  it("rejects malformed agent-identity OR lists before selection", () => {
    for (const value of [[], ["1481", "1481"], [""], [1481]]) {
      const result = calculateStaticDamageFromCatalog(
        request({
          includeExtra: true,
          mutate: (variant) => {
            ;(variant.applicability as Record<string, unknown>)[
              "otherTeammateAgentEntityIds"
            ] = value
          },
        }),
      )
      expect(result.ok, JSON.stringify(value)).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer?.startsWith(
                "/catalog/options/" +
                  committedCatalog.options.findIndex((entry) =>
                    entry.optionId.includes(":eff-10"),
                  ) +
                  "/variants/0/applicability/otherTeammateAgentEntityIds",
              ),
          ),
          JSON.stringify(result.issues),
        ).toBe(true)
    }
  })
})

describe("Pheony abrasion and additional-ability crit damage composition", () => {
  it("adds core 25%, M1 25% and the extra 15% once in the dedicated settlement channel", () => {
    const input = request({
      mindscapeRank: 1,
      teammate: { agentEntityId: "1481" },
      includeExtra: true,
      channel: "anomaly-settlement",
    })
    const result = ok(input)
    expect(totalFor(result, "eff-6")).toBeCloseTo(0.25, 12)
    expect(totalFor(result, "eff-19")).toBeCloseTo(0.25, 12)
    expect(totalFor(result, "eff-10")).toBeCloseTo(0.15, 12)
    expect(contributionsFor(result, "eff-10")).toHaveLength(1)
    for (const id of ["eff-6", "eff-19", "eff-10"])
      for (const entry of contributionsFor(result, id))
        expect(entry.address).toMatchObject({
          kind: "factor",
          channel: "anomaly-settlement-critical-damage",
        })
  })

  it.each([
    ["anomaly", "eff-4", "anomaly-critical-damage"],
    ["vortex", "eff-11", "turbulence-critical-damage"],
  ] as const)(
    "applies the extra 15%% once on the %s channel",
    (channel, effectId, factorChannel) => {
      const result = ok(
        request({
          channel,
          teammate: { agentEntityId: "1261" },
          includeExtra: true,
        }),
      )
      expect(contributionsFor(result, effectId)).toHaveLength(1)
      expect(totalFor(result, effectId)).toBeCloseTo(0.15, 12)
      expect(contributionsFor(result, effectId)[0]!.address).toMatchObject({
        kind: "factor",
        channel: factorChannel,
      })
    },
  )

  it("keeps the extra 15% out of a settlement with explicit dedicated crit fields", () => {
    const result = ok(
      request({
        channel: "anomaly-settlement",
        teammate: { agentEntityId: "1261" },
        includeExtra: true,
      }),
    )
    expect(totalFor(result, "eff-10")).toBeCloseTo(0.15, 12)
    expect(contributionsFor(result, "eff-10")[0]!.address).toMatchObject({
      kind: "factor",
      channel: "anomaly-settlement-critical-damage",
    })
  })

  it("does not duplicate the extra contribution across M0/M1/M2", () => {
    for (const rank of [0, 1, 2] as const) {
      const result = ok(
        request({
          mindscapeRank: rank,
          teammate: { agentEntityId: "1481" },
          includeExtra: true,
        }),
      )
      expect(contributionsFor(result, "eff-10"), String(rank)).toHaveLength(1)
      expect(totalFor(result, "eff-10"), String(rank)).toBeCloseTo(0.15, 12)
    }
  })
})

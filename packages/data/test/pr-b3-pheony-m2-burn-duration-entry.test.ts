import { describe, expect, it } from "vitest"
import { loadStaticCalculationData } from "../src/index.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/index.ts"
import type { RuleSet } from "@randomplay/shared"

/**
 * PR-B3 发布制品消费：菲欧妮影画 2 的“[灼烧]持续时间提升2秒”经正式 data
 * 装载与 core 目录入口结算。火属性紊乱与燃烧 profile 的标准乱流都能读取
 * 菲欧妮自己施加的原灼烧；队友施加的火异常、错属主或快照被明确拒绝；
 * 非火原异常没有持续贡献；M0/M1 不可选，M2 起可用。
 */
const OPTION_ID =
  "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-mvdz21so-s2au9j"
const ITEM_ID = "pheony:m2-burn-duration"

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["1641"],
    wEngines: [],
  })
  return loaded
}

const general = (baseValue: number) => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

interface RequestOptions {
  readonly category?: "disorder" | "vortex"
  readonly profile?: "burn" | "shock"
  readonly originalAnomalyAttribute?: "fire" | "electric"
  readonly mindscapeRank?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  readonly elapsedSeconds?: number
  readonly selected?: boolean
  readonly layers?: number
  readonly hitActorId?: `entity:${string}`
  readonly anomalySourceEntityId?: `entity:${string}`
  readonly statSourceEntityId?: `entity:${string}`
  readonly anomalySourceSnapshotId?: `snapshot:${string}`
  readonly statSourceSnapshotId?: `snapshot:${string}`
}

const damageFor = (
  kind: "disorder" | "vortex",
  anomalySource: { entityId: string; snapshotId?: string; level: number },
) => ({
  kind,
  damageBonus: [],
  anomalySource,
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
  refringe: { mode: "from-effects" as const },
  anomalyCriticalRate: 0,
  anomalyCriticalDamage: [],
})

async function request(
  options: RequestOptions = {},
): Promise<StaticCatalogDamageInput> {
  const calculationData = await data()
  const parsed = parseEffectRuleSet(
    calculationData.definitions as unknown as RuleSet,
  )
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
  const catalog = calculationData.catalog as StaticEffectCatalog
  const category = options.category ?? "disorder"
  const profile = options.profile ?? "burn"
  const originalAnomalyAttribute = options.originalAnomalyAttribute ?? "fire"
  const statSourceEntityId = options.statSourceEntityId ?? "entity:pheony"
  const anomalySourceEntityId = options.anomalySourceEntityId ?? "entity:pheony"
  const statSource = {
    entityId: statSourceEntityId,
    ...(options.statSourceSnapshotId === undefined
      ? {}
      : { snapshotId: options.statSourceSnapshotId }),
  }
  const anomalySource = {
    entityId: anomalySourceEntityId,
    ...(options.anomalySourceSnapshotId === undefined
      ? {}
      : { snapshotId: options.anomalySourceSnapshotId }),
    level: 60,
  }
  const item =
    category === "disorder"
      ? {
          mode: "standard-disorder" as const,
          role: "base" as const,
          itemId: ITEM_ID,
          stat: "attack" as const,
          statSource,
          originalAnomalyAttribute,
          baseDurationSeconds: 10,
          elapsedSeconds: options.elapsedSeconds ?? 3,
        }
      : {
          mode: "standard-vortex" as const,
          role: "base" as const,
          itemId: ITEM_ID,
          stat: "attack" as const,
          statSource,
          profile,
          baseDurationSeconds: 10,
        }
  const element =
    category === "disorder"
      ? originalAnomalyAttribute
      : profile === "burn"
        ? "fire"
        : "electric"
  const world: StaticCatalogDamageInput["world"] = {
    entities: [
      {
        kind: "actor" as const,
        entityId: "entity:pheony",
        teamId: "team:players",
        generalStats: {
          attack: general(2400),
          anomalyProficiency: general(480),
          anomalyMastery: general(200),
        },
        directStats: {
          criticalRate: { baseValue: 0.28, additions: [] },
          criticalDamage: { baseValue: 1.2, additions: [] },
          penetrationRatio: { baseValue: 0.42, additions: [] },
        },
      },
      {
        kind: "actor" as const,
        entityId: "entity:teammate",
        teamId: "team:players",
        generalStats: {
          attack: general(1200),
          anomalyProficiency: general(115),
          anomalyMastery: general(150),
        },
        directStats: {
          criticalRate: { baseValue: 0.2, additions: [] },
          criticalDamage: { baseValue: 1, additions: [] },
          penetrationRatio: { baseValue: 0.3, additions: [] },
        },
      },
      {
        kind: "actor" as const,
        entityId: "entity:enemy",
        teamId: "team:enemies",
        generalStats: {},
        directStats: {},
      },
    ],
    states: [],
    distances: [],
  }
  return {
    definitions: parsed.value,
    catalog,
    bindings: [
      {
        bindingId: "binding:pheony",
        kind: "agent",
        holderId: "entity:pheony",
        sourceEntityId: "1641",
        eligible: true,
        configuration: {
          mindscapeRank: options.mindscapeRank ?? 2,
          coreSkillLevel: 7,
        },
      },
    ],
    actorSources: [
      { entityId: "entity:pheony", agentEntityId: "1641" },
      { entityId: "entity:teammate", agentEntityId: "1261" },
    ],
    selections:
      options.selected === false
        ? []
        : [
            {
              optionId: OPTION_ID,
              bindingId: "binding:pheony",
              layers: options.layers ?? 1,
            },
          ],
    world,
    ...(options.anomalySourceSnapshotId !== undefined &&
    options.statSourceSnapshotId === options.anomalySourceSnapshotId
      ? {
          snapshots: [
            {
              snapshotId: options.anomalySourceSnapshotId,
              atSeconds: 0,
              world,
              attributes: [
                {
                  entityId: "entity:pheony",
                  stat: "attack",
                  stage: "current",
                  value: { unit: "attack-points", value: 2400 },
                },
                {
                  entityId: "entity:pheony",
                  stat: "anomalyProficiency",
                  stage: "current",
                  value: { unit: "anomaly-proficiency-points", value: 480 },
                },
                {
                  entityId: "entity:pheony",
                  stat: "penetrationRatio",
                  stage: "current",
                  value: { unit: "ratio", value: 0.42 },
                },
              ],
            },
          ],
        }
      : {}),
    hit: {
      actorId: options.hitActorId ?? "entity:pheony",
      targetId: "entity:enemy",
      actionId: "action:m2-burn-duration",
      skillCategory: "uncategorized",
      element,
      skillTags: [],
      damageItems: [item] as StaticCatalogDamageInput["hit"]["damageItems"],
    },
    damage: damageFor(
      category,
      anomalySource,
    ) as unknown as StaticCatalogDamageInput["damage"],
  }
}

function settle(input: StaticCatalogDamageInput) {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function durationAdjustment(result: ReturnType<typeof settle>): number {
  return (
    result.preparations?.reduce(
      (sum, preparation) => sum + preparation.durationAdjustment,
      0,
    ) ?? 0
  )
}

function preparedMultiplier(result: ReturnType<typeof settle>): number {
  const item = result.evaluation.hit?.damageItems[0]
  if (item === undefined) throw new Error("missing prepared damage item")
  return item.damageMultiplier
}

describe("PR-B3 Pheony M2 burn duration through the published data package", () => {
  it("publishes the corrected M2 option and the holder source requirement", async () => {
    const calculationData = await data()
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("59")
    const option = catalog.options.find((entry) => entry.optionId === OPTION_ID)
    expect(option).toBeDefined()
    expect(option!.variants[0]).toMatchObject({
      status: "corrected",
      configuration: { minimumMindscape: 2 },
      mechanism: {
        kind: "independent-settlement",
        damageItemRequirements: [
          {
            itemId: ITEM_ID,
            stat: "attack",
            role: "base",
            allowedModes: ["standard-disorder", "standard-vortex"],
            source: "holder-anomaly-source",
          },
        ],
      },
    })
  })

  it("adds two seconds to a fire disorder applied by Pheony", async () => {
    const withM2 = settle(await request())
    const withoutM2 = settle(await request({ selected: false }))
    expect(durationAdjustment(withM2)).toBe(2)
    expect(preparedMultiplier(withoutM2)).toBeCloseTo(11.5, 10)
    expect(preparedMultiplier(withM2)).toBeCloseTo(13.5, 10)
  })

  it("clamps elapsed time and applies the seconds once", async () => {
    const partiallyElapsed = settle(await request({ elapsedSeconds: 11 }))
    expect(durationAdjustment(partiallyElapsed)).toBe(2)
    expect(preparedMultiplier(partiallyElapsed)).toBeCloseTo(5.5, 10)
    const fullyElapsed = settle(await request({ elapsedSeconds: 12 }))
    expect(durationAdjustment(fullyElapsed)).toBe(2)
    expect(preparedMultiplier(fullyElapsed)).toBeCloseTo(4.5, 10)
  })

  it("reads the burn profile of a standard vortex without a turbulence channel", async () => {
    const withM2 = settle(await request({ category: "vortex" }))
    const withoutM2 = settle(
      await request({ category: "vortex", selected: false }),
    )
    expect(durationAdjustment(withM2)).toBe(2)
    expect(preparedMultiplier(withoutM2)).toBeCloseTo(19, 10)
    expect(preparedMultiplier(withM2)).toBeCloseTo(21, 10)
    const contributions = withM2.preparations?.[0]?.contributions ?? []
    expect(contributions.length).toBeGreaterThan(0)
    for (const contribution of contributions)
      expect(contribution.address).toMatchObject({
        kind: "factor",
        channel: "anomaly-duration-addition",
      })
    expect(JSON.stringify(contributions)).not.toContain("turbulence")
  })

  it("does not contribute to a non-fire original anomaly", async () => {
    const withM2 = settle(
      await request({ originalAnomalyAttribute: "electric" }),
    )
    const withoutM2 = settle(
      await request({ originalAnomalyAttribute: "electric", selected: false }),
    )
    expect(durationAdjustment(withM2)).toBe(0)
    expect(preparedMultiplier(withM2)).toBeCloseTo(13.25, 10)
    expect(preparedMultiplier(withoutM2)).toBeCloseTo(13.25, 10)
  })

  it("lets a teammate trigger the disorder on Pheony's burn", async () => {
    const withM2 = settle(await request({ hitActorId: "entity:teammate" }))
    expect(durationAdjustment(withM2)).toBe(2)
    expect(preparedMultiplier(withM2)).toBeCloseTo(13.5, 10)
  })

  it("rejects a fire anomaly applied by another actor or a mismatched source", async () => {
    for (const options of [
      {
        anomalySourceEntityId: "entity:teammate",
        statSourceEntityId: "entity:teammate",
      },
      {
        anomalySourceEntityId: "entity:pheony",
        statSourceEntityId: "entity:teammate",
      },
      {
        anomalySourceSnapshotId: "snapshot:applied",
        statSourceSnapshotId: "snapshot:other",
      },
    ] satisfies RequestOptions[]) {
      const input = await request(options)
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("holder's applied anomaly source"),
          ),
        ).toBe(true)
      }
    }
  })

  it("accepts matching holder and snapshot identities", async () => {
    const input = await request({
      anomalySourceSnapshotId: "snapshot:applied",
      statSourceSnapshotId: "snapshot:applied",
    })
    const withSnapshot = settle(input)
    expect(durationAdjustment(withSnapshot)).toBe(2)
    expect(preparedMultiplier(withSnapshot)).toBeCloseTo(13.5, 10)
  })

  it("rejects M0/M1 and more than one layer, and unlocks at M2", async () => {
    for (const mindscapeRank of [0, 1] as const) {
      const result = calculateStaticDamageFromCatalog(
        await request({ mindscapeRank }),
      )
      expect(result.ok, String(mindscapeRank)).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
        ).toBe(true)
    }
    for (const mindscapeRank of [2, 6] as const)
      expect(durationAdjustment(settle(await request({ mindscapeRank })))).toBe(
        2,
      )
    expect((await request({ layers: 2 })).selections[0]?.layers).toBe(2)
    expect(
      calculateStaticDamageFromCatalog(await request({ layers: 2 })).ok,
    ).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { calculateStaticDamageFromCatalog } from "../../src/effects/index.ts"
import type {
  ContributionRule,
  StaticCatalogDamageInput,
  StaticCatalogDamageItemRequirement,
  StaticCatalogVariant,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { always, general, inputFor, literal } from "./static-fixtures.ts"

/**
 * PR-B3：菲欧妮（1641）影画 2[好奇心害不死猫]的“[灼烧]持续时间提升2秒”。
 *
 * 该效果只能作用于绑定持有者菲欧妮自己施加的火属性原异常：目录伤害项要求
 * `holder-anomaly-source` 同时核对 binding.holderId、damage.anomalySource
 * 与 damageItem.statSource 的实体和快照身份。持续秒数继续进入既有
 * `anomaly-duration-addition` 准备通道，不新增机制 arm，也不模拟时间线。
 */
const ITEM_ID = "pheony:m2-burn-duration"
const OPTION_ID =
  "agents:pheony:mindscape:2:blk-mindscapeBuffs-2-1:eff-mvdz21so-s2au9j"
const EFFECT_ID =
  "agent:1641:zzz-hp:eff-mvdz21so-s2au9j:blk-mindscapeBuffs-2-1:mindscape:2"
const FIXED_POINTER = "/agents/52/mindscapeBuffs/2/effectBlocks/0/effects/1"

type RequirementSource = "holder-anomaly-source" | "anomaly-source"

const fixedReference = {
  sourceId: "zzz-hp",
  version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
  locale: "zh",
  resourcePath: "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
  pointer: FIXED_POINTER,
} as const

const requirement = (
  source: RequirementSource,
): StaticCatalogDamageItemRequirement => ({
  itemId: ITEM_ID,
  stat: "attack",
  role: "base",
  allowedModes: ["standard-disorder", "standard-vortex"],
  source,
})

const m2Rule = (): Extract<ContributionRule, { readonly scope: "hit" }> => ({
  kind: "contribution",
  effectId: EFFECT_ID,
  source: {
    identity: { kind: "agent", entityId: "1641" },
    section: "2 影",
    references: [fixedReference],
  },
  config: always,
  parameters: {
    amount: { kind: "constant", unit: "seconds", value: 2 },
  },
  activation: {
    kind: "supplied",
    maximumLayers: literal("count", 1),
  },
  scope: "hit",
  beneficiary: { kind: "team" },
  when: {
    kind: "all",
    conditions: [
      {
        kind: "one-of",
        fact: "hit.damageKind",
        values: ["disorder", "vortex"],
      },
      { kind: "one-of", fact: "hit.element", values: ["fire"] },
    ],
  },
  operation: {
    kind: "factor-contribution",
    channel: "anomaly-duration-addition",
    value: { kind: "parameter", unit: "seconds", name: "amount" },
  },
})

interface RequestOptions {
  readonly source?: RequirementSource
  readonly mindscapeRank?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  readonly mode?: "standard-disorder" | "standard-vortex"
  readonly originalAnomalyAttribute?: "fire" | "electric"
  readonly profile?: "burn" | "shock"
  readonly elapsedSeconds?: number
  readonly hitActorId?: `entity:${string}`
  readonly anomalySourceEntityId?: `entity:${string}`
  readonly statSourceEntityId?: `entity:${string}`
  readonly anomalySourceSnapshotId?: `snapshot:${string}`
  readonly statSourceSnapshotId?: `snapshot:${string}`
  readonly selected?: boolean
  readonly layers?: number
  readonly itemId?: string
  readonly extraItem?: {
    readonly itemId: string
    readonly statSourceEntityId: `entity:${string}`
  }
}

function request(options: RequestOptions = {}): StaticCatalogDamageInput {
  const mode = options.mode ?? "standard-disorder"
  const originalAnomalyAttribute = options.originalAnomalyAttribute ?? "fire"
  const profile = options.profile ?? "burn"
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
  const declaredItemId = options.itemId ?? ITEM_ID
  const buildItem = (
    itemId: string,
    source: { entityId: string; snapshotId?: string },
  ) =>
    mode === "standard-disorder"
      ? {
          mode,
          role: "base" as const,
          itemId,
          stat: "attack" as const,
          statSource: source,
          originalAnomalyAttribute,
          baseDurationSeconds: 10,
          elapsedSeconds: options.elapsedSeconds ?? 3,
        }
      : {
          mode,
          role: "base" as const,
          itemId,
          stat: "attack" as const,
          statSource: source,
          profile,
          baseDurationSeconds: 10,
        }
  const item = buildItem(declaredItemId, statSource)
  const extraItems =
    options.extraItem === undefined
      ? []
      : [
          buildItem(options.extraItem.itemId, {
            entityId: options.extraItem.statSourceEntityId,
          }),
        ]
  const element =
    mode === "standard-disorder"
      ? originalAnomalyAttribute
      : profile === "burn"
        ? "fire"
        : "electric"
  const variant: StaticCatalogVariant = {
    configuration: { minimumMindscape: 2 },
    status: "corrected",
    references: [fixedReference],
    effectIds: [EFFECT_ID],
    maximumLayers: 1,
    inputs: [],
    applicability: { beneficiaryElements: ["fire"] },
    differences: [],
    mechanism: {
      kind: "independent-settlement",
      isolateDamageItems: true,
      damageItemRequirements: [
        requirement(options.source ?? "holder-anomaly-source"),
      ],
    },
  }
  const catalog: StaticEffectCatalog = {
    schemaVersion: 2,
    ruleSetId: "static-tests",
    revision: "1",
    source: { repository: "test", commit: "1", files: [] },
    entities: [
      {
        catalogEntityId: "agents:pheony",
        upstreamId: "pheony",
        name: "Pheony",
        identity: { kind: "agent", entityId: "1641" },
        status: "mapped",
        profession: "异常",
        element: "fire",
      },
      {
        catalogEntityId: "agents:jane",
        upstreamId: "jane",
        name: "Jane",
        identity: { kind: "agent", entityId: "1261" },
        status: "mapped",
        profession: "异常",
        element: "physical",
      },
    ],
    options: [
      {
        optionId: OPTION_ID,
        catalogEntityId: "agents:pheony",
        name: "M2 burn duration",
        conditionDescription: "test condition",
        target: "team",
        variants: [variant],
      },
    ],
    skillTargets: [],
    differences: [],
  }
  const world: StaticCatalogDamageInput["world"] = {
    entities: [
      {
        kind: "actor" as const,
        entityId: "entity:pheony",
        teamId: "team:players",
        generalStats: {
          attack: general(1000),
          anomalyProficiency: general(115),
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
          attack: general(900),
          anomalyProficiency: general(100),
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
  const base = inputFor([m2Rule()])
  return {
    ...base,
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
    actorSources: [
      { entityId: "entity:pheony", agentEntityId: "1641" },
      { entityId: "entity:teammate", agentEntityId: "1261" },
    ],
    world,
    hit: {
      ...base.hit,
      actorId: options.hitActorId ?? "entity:pheony",
      targetId: "entity:enemy",
      actionId: "action:disorder",
      skillCategory: "uncategorized",
      element,
      skillTags: [],
      damageItems: [
        item,
        ...extraItems,
      ] as StaticCatalogDamageInput["hit"]["damageItems"],
    },
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
                  value: { unit: "attack-points", value: 1000 },
                },
                {
                  entityId: "entity:pheony",
                  stat: "anomalyProficiency",
                  stage: "current",
                  value: {
                    unit: "anomaly-proficiency-points",
                    value: 115,
                  },
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
    damage: {
      kind: mode === "standard-disorder" ? "disorder" : "vortex",
      damageBonus: [],
      anomalyDamageBonus: [],
      anomalyCriticalDamage: [],
      anomalyCriticalRate: 0,
      refringe: { mode: "from-effects" },
      anomalySource,
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 1000,
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
    } as unknown as StaticCatalogDamageInput["damage"],
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

function expectContextMismatch(input: StaticCatalogDamageInput): void {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error("expected a rejected request")
  expect(result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH")).toBe(
    true,
  )
  expect(
    result.issues.some((issue) =>
      issue.message.includes("holder's applied anomaly source"),
    ),
  ).toBe(true)
}

describe("Pheony M2 holder-applied burn duration", () => {
  it("adds two seconds once to a fire disorder and settles the prepared remaining time", () => {
    const withM2 = settle(request())
    const withoutM2 = settle(request({ selected: false }))
    expect(
      withM2.preparations?.map((entry) => entry.durationAdjustment),
    ).toEqual([2])
    // 10 秒灼烧、已过 3 秒：剩余 7 → 9；火紊乱倍率 11.5 → 13.5。
    expect(preparedMultiplier(withoutM2)).toBeCloseTo(11.5, 10)
    expect(preparedMultiplier(withM2)).toBeCloseTo(13.5, 10)
    expect(
      preparedMultiplier(withM2) - preparedMultiplier(withoutM2),
    ).toBeCloseTo(2, 10)
  })

  it("clamps elapsed time and applies the two seconds exactly once", () => {
    const partiallyElapsed = settle(request({ elapsedSeconds: 11 }))
    expect(durationAdjustment(partiallyElapsed)).toBe(2)
    // max(0, 10 + 2 − 11) = 1；若 +2 被计算两次会得到 2 秒。
    expect(preparedMultiplier(partiallyElapsed)).toBeCloseTo(5.5, 10)
    expect(
      preparedMultiplier(
        settle(request({ elapsedSeconds: 11, selected: false })),
      ),
    ).toBeCloseTo(4.5, 10)

    const fullyElapsed = settle(request({ elapsedSeconds: 12 }))
    expect(durationAdjustment(fullyElapsed)).toBe(2)
    expect(preparedMultiplier(fullyElapsed)).toBeCloseTo(4.5, 10)
    expect(
      preparedMultiplier(
        settle(request({ elapsedSeconds: 12, selected: false })),
      ),
    ).toBeCloseTo(4.5, 10)
  })

  it("does not contribute to a non-fire original anomaly", () => {
    const withM2 = settle(request({ originalAnomalyAttribute: "electric" }))
    const withoutM2 = settle(
      request({ originalAnomalyAttribute: "electric", selected: false }),
    )
    expect(durationAdjustment(withM2)).toBe(0)
    expect(preparedMultiplier(withM2)).toBeCloseTo(13.25, 10)
    expect(preparedMultiplier(withoutM2)).toBeCloseTo(13.25, 10)
  })

  it("reads a burn-profile standard vortex without a turbulence-only channel", () => {
    const withM2 = settle(request({ mode: "standard-vortex", profile: "burn" }))
    const withoutM2 = settle(
      request({
        mode: "standard-vortex",
        profile: "burn",
        selected: false,
      }),
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

    const shock = settle(request({ mode: "standard-vortex", profile: "shock" }))
    expect(durationAdjustment(shock)).toBe(0)
    expect(preparedMultiplier(shock)).toBeCloseTo(19, 10)
  })

  it("rejects a mixed second fire item instead of granting the duration to both", () => {
    const mixed = calculateStaticDamageFromCatalog(
      request({
        extraItem: {
          itemId: "unqualified",
          statSourceEntityId: "entity:teammate",
        },
      }),
    )
    expect(mixed.ok).toBe(false)
    if (!mixed.ok)
      expect(
        mixed.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("sole damage item"),
        ),
      ).toBe(true)

    const onlyUnqualified = calculateStaticDamageFromCatalog(
      request({
        itemId: "unqualified",
        statSourceEntityId: "entity:teammate",
      }),
    )
    expect(onlyUnqualified.ok).toBe(false)
    if (!onlyUnqualified.ok)
      expect(
        onlyUnqualified.issues.some(
          (issue) => issue.code === "MISSING_REFERENCE",
        ),
      ).toBe(true)

    expect(durationAdjustment(settle(request()))).toBe(2)
  })

  it("rejects a fire anomaly applied by another actor or a mismatched source", () => {
    expectContextMismatch(
      request({
        anomalySourceEntityId: "entity:teammate",
        statSourceEntityId: "entity:teammate",
      }),
    )
    expectContextMismatch(
      request({
        anomalySourceEntityId: "entity:pheony",
        statSourceEntityId: "entity:teammate",
      }),
    )
    expectContextMismatch(
      request({
        anomalySourceSnapshotId: "snapshot:applied",
        statSourceSnapshotId: "snapshot:other",
      }),
    )
  })

  it("accepts matching holder and snapshot identities", () => {
    const withSnapshot = settle(
      request({
        anomalySourceSnapshotId: "snapshot:applied",
        statSourceSnapshotId: "snapshot:applied",
      }),
    )
    expect(durationAdjustment(withSnapshot)).toBe(2)
    expect(preparedMultiplier(withSnapshot)).toBeCloseTo(13.5, 10)
  })

  it("proves the holder source restriction is necessary beyond element and profession", () => {
    // 菲欧妮与简都是[异常]职业；元素/职业条件不能区分实际施加者。
    expect(
      new Set(request().catalog.entities.map((entity) => entity.profession)),
    ).toEqual(new Set(["异常"]))
    const teammateApplied = {
      anomalySourceEntityId: "entity:teammate",
      statSourceEntityId: "entity:teammate",
    } as const
    // 通用 anomaly-source 只要求 statSource = anomalySource，因此队友施加的
    // 火属性原异常仍会获得 +2，证明元素条件本身不能阻止跨持有者误用。
    const generic = settle(
      request({ ...teammateApplied, source: "anomaly-source" }),
    )
    expect(durationAdjustment(generic)).toBe(2)
    // 只增加持有者来源约束后，同一输入被明确拒绝。
    expectContextMismatch(
      request({ ...teammateApplied, source: "holder-anomaly-source" }),
    )
  })

  it("rejects M0/M1 and more than one layer, and unlocks at M2", () => {
    for (const mindscapeRank of [0, 1] as const) {
      const result = calculateStaticDamageFromCatalog(
        request({ mindscapeRank }),
      )
      expect(result.ok, String(mindscapeRank)).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
        ).toBe(true)
    }
    for (const mindscapeRank of [2, 6] as const) {
      const result = settle(request({ mindscapeRank }))
      expect(durationAdjustment(result)).toBe(2)
    }
    expect(calculateStaticDamageFromCatalog(request({ layers: 2 })).ok).toBe(
      false,
    )
  })
})

import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageResult,
} from "../../src/effects/types.ts"
import rawDefinitions from "../../../data/definitions/effects/static.json" with { type: "json" }
import rawCatalog from "../../../data/definitions/effects/static-catalog.json" with { type: "json" }
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 批次 27 目录级回归：仪玄（1371）影画 2[符法千重-破]、影画 1 落雷与
 * 额外能力[玄墨暗涌]落雷的三条独立结算补充。倍率锚点（12/0.5/2.25 ×
 * 当前贯穿力 2400）是独立算式，不读取生成参数；影画门槛（M2 ≥2、
 * M1 ≥1）与额外能力队伍资格按目录契约拒绝或零贡献，贯穿伤害走面板
 * 暴击模型。真实发布制品的装载链路由 pr27-yixuan-thunder-catalog-entry
 * 覆盖；本文件直接消费正式目录文件。
 */
const M2_OPTION = "nanoka:agents:yixuan:m2-talisman-suppression-break-damage"
const M1_OPTION = "nanoka:agents:yixuan:m1-falling-thunder-damage"
const AA_OPTION = "nanoka:agents:yixuan:aa-falling-thunder-damage"
const M2_TARGET = "zzz-hp:skill:yixuan-talisman-suppression-break"
const M1_TARGET = "zzz-hp:skill:yixuan-m1-falling-thunder"
const AA_TARGET = "zzz-hp:skill:yixuan-aa-falling-thunder"
const M2_ITEM = "yixuan:talisman-suppression-break-damage"
const M1_ITEM = "yixuan:m1-falling-thunder-damage"
const AA_ITEM = "yixuan:aa-falling-thunder-damage"
const CORE_PASSIVE_60 =
  "agents:yixuan:mindscape:0:blk-legacy:legacy-self-skillDmgBonus"
const ALL_SPECIAL_TARGET = "zzz-hp:skill:all-special-ms0fcqv7"
/**
 * 贯穿力读数按仪玄核心被动派生建模（damageBasis 语义）：无 settled 基线时
 * 最终贯穿力 = 基值 + 0.1×当前生命值 + 0.3×当前攻击力；这里取
 * 0 + 0.1×21000 + 0.3×1000 = 2400 作为受控面板。
 */

const parsed = parseEffectRuleSet(rawDefinitions)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = rawCatalog as unknown as StaticCatalogDamageInput["catalog"]

interface YixuanInputOverrides {
  readonly mindscapeRank?: number
  readonly optionIds?: readonly { optionId: string; layers: number }[]
  readonly itemId?: string
  readonly targetIds?: readonly string[]
  readonly skillCategory?: string
  readonly damageKind?: "sheer" | "regular"
  readonly damageMultiplier?: number
  readonly stat?: "sheerForce" | "attack"
  readonly qualifierAgentEntityId?: string
}

function yixuanInput(
  overrides: YixuanInputOverrides = {},
): StaticCatalogDamageInput {
  const base = inputFor()
  const hitActor = base.world.entities.find(
    (entity) => entity.kind === "actor" && entity.entityId === base.hit.actorId,
  )!
  const qualifier = {
    ...hitActor,
    entityId: "entity:qualifier" as typeof hitActor.entityId,
  }
  const damage =
    overrides.damageKind === "regular"
      ? ({
          ...base.damage,
          defense: {
            attackerLevel: 60,
            targetBaseDefense: 0,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
        } as Extract<StaticCatalogDamageInput["damage"], { kind: "regular" }>)
      : ({
          kind: "sheer",
          damageBonus: [],
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
          sheerDamageBonus: [],
        } as Extract<StaticCatalogDamageInput["damage"], { kind: "sheer" }>)
  return {
    ...base,
    definitions,
    catalog,
    damage,
    world: {
      ...base.world,
      entities: [
        ...base.world.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId === base.hit.actorId
            ? {
                ...entity,
                generalStats: {
                  ...entity.generalStats,
                  sheerForce: general(0),
                  attack: general(1000),
                  health: general(21000),
                },
                directStats: {
                  criticalRate: { baseValue: 0.25, additions: [] },
                  criticalDamage: { baseValue: 0.5, additions: [] },
                  penetrationRatio: { baseValue: 0, additions: [] },
                },
              }
            : entity,
        ),
        qualifier,
      ],
    },
    actorSources: [
      { entityId: base.hit.actorId, agentEntityId: "1371" },
      {
        entityId: "entity:qualifier",
        agentEntityId: overrides.qualifierAgentEntityId ?? "1011",
      },
    ],
    bindings: [
      {
        bindingId: "binding:yixuan",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: "1371",
        eligible: true,
        configuration: {
          mindscapeRank: overrides.mindscapeRank ?? 6,
          coreSkillLevel: 7,
        },
      },
    ],
    selections: (
      overrides.optionIds ?? [{ optionId: M2_OPTION, layers: 1 }]
    ).map((selection) => ({
      optionId: selection.optionId,
      bindingId: "binding:yixuan",
      layers: selection.layers,
    })),
    hit: {
      ...base.hit,
      actorId: "entity:attacker",
      actionId: "action:yixuan-thunder-settlement",
      skillCategory: (overrides.skillCategory ?? "special") as "special",
      element: "auric-ink",
      skillTags: [],
      skillTargetIds: [...(overrides.targetIds ?? [M2_TARGET])],
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: overrides.itemId ?? M2_ITEM,
          damageMultiplier: overrides.damageMultiplier ?? 0,
          stat: overrides.stat ?? ("sheerForce" as const),
          statSource: { entityId: "entity:attacker" },
        },
      ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    },
  } as unknown as StaticCatalogDamageInput
}

const calculate = (input: StaticCatalogDamageInput): StaticDamageResult => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

const rejected = (input: StaticCatalogDamageInput, code: string) => {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (result.ok) throw new Error("expected structured rejection")
  expect(result.issues).toEqual(
    expect.arrayContaining([expect.objectContaining({ code })]),
  )
}

const contributionsOf = (result: StaticDamageResult, optionId: string) => {
  const effectId = {
    [M2_OPTION]:
      "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
    [M1_OPTION]: "agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1",
    [AA_OPTION]: "agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0",
  }[optionId] as `agent:${string}`
  return result.evaluation.contributions.filter(
    (entry) => entry.origin.effectId === effectId,
  )
}

describe("batch 27 Yixuan mindscape 2 and falling thunder settlements", () => {
  it.each([
    [M2_OPTION, M2_TARGET, M2_ITEM, "special", 12, 28800, 43200, 32400],
    [M1_OPTION, M1_TARGET, M1_ITEM, "uncategorized", 0.5, 1200, 1800, 1350],
    [AA_OPTION, AA_TARGET, AA_ITEM, "uncategorized", 2.25, 5400, 8100, 6075],
  ])(
    "settles %s at sheer force %s with the panel crit model",
    (
      option,
      target,
      item,
      category,
      multiplier,
      nonCritical,
      critical,
      expected,
    ) => {
      const result = calculate(
        yixuanInput({
          optionIds: [{ optionId: option, layers: 1 }],
          itemId: item,
          targetIds: [target],
          skillCategory: category,
        }),
      )
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(nonCritical!, 9)
      expect(result.criticalRate).toBeCloseTo(0.25, 12)
      expect(result.critical).toBeCloseTo(critical!, 9)
      expect(result.nonCritical).toBeCloseTo(nonCritical!, 9)
      expect(result.expected).toBeCloseTo(expected!, 9)
      expect(contributionsOf(result, option)).toHaveLength(1)
      expect(contributionsOf(result, option)[0]!.value.value).toBeCloseTo(
        multiplier!,
        12,
      )
    },
  )

  it.each([
    [M2_OPTION, M2_TARGET, M2_ITEM, 1],
    [M1_OPTION, M1_TARGET, M1_ITEM, 0],
  ])(
    "keeps the mindscape gate: %s stays locked below its rank",
    (option, target, item, belowRank) => {
      // 未解锁档位的选择（含 0 层）一律按 CONTEXT_MISMATCH 拒绝，不静默关闭。
      rejected(
        yixuanInput({
          mindscapeRank: belowRank,
          optionIds: [{ optionId: option, layers: 1 }],
          itemId: item,
          targetIds: [target],
        }),
        "CONTEXT_MISMATCH",
      )
      rejected(
        yixuanInput({
          mindscapeRank: belowRank,
          optionIds: [{ optionId: option, layers: 0 }],
          itemId: item,
          targetIds: [target],
        }),
        "CONTEXT_MISMATCH",
      )
      // 已解锁档位的 0 层关闭：不要求伤害项、不贡献倍率。
      const closed = calculate(
        yixuanInput({
          mindscapeRank: 6,
          optionIds: [{ optionId: option, layers: 0 }],
          itemId: item,
          targetIds: [target],
          damageMultiplier: 0,
        }),
      )
      expect(closed.factors.nonCritical.baseDamage).toBe(0)
    },
  )

  it("requires the additional ability squad qualification for the AA thunder", () => {
    // Anby（1011）为击破职业，满足击破/支援/防护资格。
    const qualified = calculate(
      yixuanInput({
        optionIds: [{ optionId: AA_OPTION, layers: 1 }],
        itemId: AA_ITEM,
        targetIds: [AA_TARGET],
        skillCategory: "uncategorized",
      }),
    )
    expect(qualified.factors.nonCritical.baseDamage).toBeCloseTo(5400, 9)
    expect(contributionsOf(qualified, AA_OPTION)).toHaveLength(1)
    // 11 号（1111）为强攻职业，不满足资格：选择保留但零贡献，不自动推断队伍构成。
    const unqualified = calculate(
      yixuanInput({
        optionIds: [{ optionId: AA_OPTION, layers: 1 }],
        itemId: AA_ITEM,
        targetIds: [AA_TARGET],
        skillCategory: "uncategorized",
        qualifierAgentEntityId: "1111",
      }),
    )
    expect(unqualified.factors.nonCritical.baseDamage).toBe(0)
    expect(contributionsOf(unqualified, AA_OPTION)).toHaveLength(0)
  })

  it("locks the independent item contract: stat, category, and zero initial multiplier", () => {
    // 倍率基：伤害项必须读贯穿力，不接受攻击力代读。
    rejected(
      yixuanInput({
        optionIds: [{ optionId: M2_OPTION, layers: 1 }],
        itemId: M2_ITEM,
        targetIds: [M2_TARGET],
        stat: "attack",
      }),
      "CONTEXT_MISMATCH",
    )
    // M2 独立项以 special 分类结算；uncategorized 命中被明确拒绝。
    rejected(
      yixuanInput({
        optionIds: [{ optionId: M2_OPTION, layers: 1 }],
        itemId: M2_ITEM,
        targetIds: [M2_TARGET],
        skillCategory: "uncategorized",
      }),
      "CONTEXT_MISMATCH",
    )
    // 落雷独立项锁定 uncategorized；special 命中被明确拒绝。
    rejected(
      yixuanInput({
        optionIds: [{ optionId: M1_OPTION, layers: 1 }],
        itemId: M1_ITEM,
        targetIds: [M1_TARGET],
        skillCategory: "special",
      }),
      "CONTEXT_MISMATCH",
    )
    // 独立项必须零初始倍率，由规则一次赋值。
    rejected(
      yixuanInput({
        optionIds: [{ optionId: M2_OPTION, layers: 1 }],
        itemId: M2_ITEM,
        targetIds: [M2_TARGET],
        damageMultiplier: 3,
      }),
      "CONTEXT_MISMATCH",
    )
    // 缺少要求的独立项：MISSING_REFERENCE，不能视为零伤害。
    rejected(
      yixuanInput({
        optionIds: [{ optionId: AA_OPTION, layers: 1 }],
        itemId: "yixuan:other-item",
        targetIds: [AA_TARGET],
        skillCategory: "uncategorized",
      }),
      "MISSING_REFERENCE",
    )
  })

  it("only contributes to sheer damage settlements", () => {
    // 贯穿伤害规则不匹配普通伤害命中：同一独立项在 regular 命中零贡献。
    const regular = calculate(
      yixuanInput({
        optionIds: [{ optionId: M2_OPTION, layers: 1 }],
        itemId: M2_ITEM,
        targetIds: [M2_TARGET],
        damageKind: "regular",
      }),
    )
    expect(contributionsOf(regular, M2_OPTION)).toHaveLength(0)
    expect(regular.factors.nonCritical.baseDamage).toBe(0)
  })

  it("composes with the special-scope passive once the all-special target is declared", () => {
    // 符法千重-破 以 special 分类结算：调用方同时声明 all-special 目标后，
    // 核心被动 60% 增伤作用一次（28800 × 1.6 = 46080）；与动作目录强化
    // 特殊技动作的目标组合一致，本补充不自动附加该目标。
    const composed = calculate(
      yixuanInput({
        optionIds: [
          { optionId: M2_OPTION, layers: 1 },
          { optionId: CORE_PASSIVE_60, layers: 1 },
        ],
        itemId: M2_ITEM,
        targetIds: [M2_TARGET, ALL_SPECIAL_TARGET],
      }),
    )
    expect(composed.factors.nonCritical.baseDamage).toBeCloseTo(28800, 9)
    expect(composed.factors.nonCritical.damageBonus).toBeCloseTo(1.6, 12)
    expect(composed.nonCritical).toBeCloseTo(46080, 9)
    // 不声明 all-special 目标时，60% 选项保留但不匹配该命中。
    const withoutTarget = calculate(
      yixuanInput({
        optionIds: [
          { optionId: M2_OPTION, layers: 1 },
          { optionId: CORE_PASSIVE_60, layers: 1 },
        ],
        itemId: M2_ITEM,
        targetIds: [M2_TARGET],
      }),
    )
    expect(withoutTarget.factors.nonCritical.baseDamage).toBeCloseTo(28800, 9)
    expect(withoutTarget.factors.nonCritical.damageBonus).toBeCloseTo(1, 12)
    expect(withoutTarget.nonCritical).toBeCloseTo(28800, 9)
  })

  it("rejects mixing locked categories in one hit and settles each item separately", () => {
    // M2 锁 special、两道落雷锁 uncategorized：同一命中混合两类目标会被
    // 逐要求明确拒绝，不静默丢弃冲突输入；三条互不独占，各自独立请求
    // 分别结算（12/0.5/2.25 × 2400）。
    const base = yixuanInput({
      optionIds: [
        { optionId: M2_OPTION, layers: 1 },
        { optionId: M1_OPTION, layers: 1 },
        { optionId: AA_OPTION, layers: 1 },
      ],
      itemId: M2_ITEM,
      targetIds: [M2_TARGET, M1_TARGET, AA_TARGET],
      skillCategory: "special",
    })
    const input: StaticCatalogDamageInput = {
      ...base,
      hit: {
        ...base.hit,
        skillCategory: "special",
        damageItems: [M2_ITEM, M1_ITEM, AA_ITEM].map((itemId) => ({
          mode: "direct" as const,
          role: "base" as const,
          itemId,
          damageMultiplier: 0,
          stat: "sheerForce" as const,
          statSource: { entityId: "entity:attacker" },
        })) as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    }
    rejected(input, "CONTEXT_MISMATCH")
    for (const [option, target, item, expectedDamage] of [
      [M2_OPTION, M2_TARGET, M2_ITEM, 28800],
      [M1_OPTION, M1_TARGET, M1_ITEM, 1200],
      [AA_OPTION, AA_TARGET, AA_ITEM, 5400],
    ] as const) {
      const single = calculate(
        yixuanInput({
          optionIds: [{ optionId: option, layers: 1 }],
          itemId: item,
          targetIds: [target],
          skillCategory: option === M2_OPTION ? "special" : "uncategorized",
        }),
      )
      expect(single.factors.nonCritical.baseDamage).toBeCloseTo(
        expectedDamage,
        9,
      )
    }
  })
})

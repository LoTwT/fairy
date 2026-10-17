import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  EntityId,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 增益修复批次 13（修订 28）：本（Ben，1121）影画 2[以守为攻]格挡反击附伤
 * 的具名回归。期望值全部来自冻结 Nanoka 3.2 天赋原文（中英文交叉核对：
 * 在[特殊技]或[强化特殊技]中成功触发格挡反击时，额外造成本 300% 防御力的
 * 伤害）与独立算式（3 × 本当前防御力；其他乘区为 1、CD 0.5 时
 * non/critical = 3×DEF / 4.5×DEF），不从生成器反推。触发已发生由调用方
 * 选中本选项并提供独立项断言：不检测格挡输入、时间窗、追击次数、盾值或
 * 冷却。附伤元素与暴击能力来源未标注：元素由调用方声明（规则不筛选），
 * 最终暴击概率由调用方以 hit.declaredCriticalRate 显式声明（无默认值、
 * 替换最终概率，r=0/1/中间值是调用方自选的条件计算假设，不是游戏结论）；
 * critical 分支沿用普通暴击伤害来源及本命中合法暴伤贡献（本文件算式
 * 使用默认来源：本当前普通暴击伤害）。uncategorized 分类、独立目标、零
 * 初始倍率、逐次声明与独占结算是本项目采用的独立结算契约，不是游戏证据。
 * 影画 4 反击增伤（skillTargets 只含 special 分类）与影画 0 团队暴率
 * （实体作用域）保持身份/原值：与新增附伤的精确作用域逐项验证。与比格
 * 气缸（若本装备）是两个来源、两个事件：合法共存是同一装备/世界下的
 * 两次独立结算，混合请求明确拒绝。
 */
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

function calculateCatalogResult(
  input: StaticCatalogDamageInput,
): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function contributionOf(
  result: StaticDamageResult,
  effectId: string,
  beneficiaryId: EntityId = "entity:attacker",
): number {
  return [
    ...result.evaluation.contributions,
    ...(result.preparations ?? []).flatMap((p) => p.contributions),
  ]
    .filter(
      (c) =>
        c.origin.effectId === effectId &&
        c.origin.beneficiaryId === beneficiaryId,
    )
    .reduce((sum, c) => sum + c.value.value, 0)
}

const BEN_M2 = "nanoka:agents:benbigger:m2-block-counter-defense-damage"
const BEN_M2_DAMAGE =
  "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2"
const BEN_M2_ITEM = "benbigger:block-counter-bonus-damage"
const BEN_M2_TARGET = "zzz-hp:skill:benbigger-block-counter-bonus-damage"
/** 固定来源既有选项：影画 0 团队暴率与影画 4 反击增伤（身份保持）。 */
const BEN_M0_OPTION =
  "agents:benbigger:mindscape:0:blk-legacy:legacy-team-critRate"
const BEN_M0_EFFECT =
  "agent:1121:zzz-hp:legacy-team-critRate:blk-legacy:mindscape:0"
const BEN_M4_OPTION =
  "agents:benbigger:mindscape:4:blk-ms207p9g-r0k49k:eff-ms207p9g-eg5grw"
const BEN_M4_EFFECT =
  "agent:1121:zzz-hp:eff-ms207p9g-eg5grw:blk-ms207p9g-r0k49k:mindscape:4"
/** 比格气缸（防护音擎，本可装备）：批次 12 的受击附伤与必暴通道。 */
const BIG_CYLINDER = "nanoka:w-engines:13112:retaliation-defense-damage"
const BIG_CYLINDER_DAMAGE = "w-engine:13112:nanoka:retaliation-defense-damage"
const BIG_CYLINDER_CRIT =
  "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical"
const BIG_CYLINDER_ITEM = "big-cylinder:retaliation"
const BIG_CYLINDER_TARGET = "zzz-hp:skill:big-cylinder-retaliation"
/** 触发动作导航：特殊技格挡反击（0014，physical）与强化特殊技格挡反击（0017，fire）。 */
const TRIGGER_ACTIONS = [
  {
    label: "special block counter (action 0014)",
    skillCategory: "special" as const,
    element: "physical" as const,
  },
  {
    label: "enhanced-special block counter (action 0017)",
    skillCategory: "enhanced-special" as const,
    element: "fire" as const,
  },
]

interface BenInputOverrides {
  readonly mindscapeRank?: number
  readonly layers?: number
  readonly defense?: number
  readonly attack?: number
  readonly critRate?: number
  readonly critDmg?: number
  readonly omitCriticalRateFact?: boolean
  readonly stat?: "defense" | "attack" | "impact"
  readonly role?: "base" | "settlement"
  readonly damageMultiplier?: number
  readonly statSourceEntityId?: string
  readonly statSourceSnapshotId?: string
  readonly omitItem?: boolean
  readonly skillCategory?: string
  readonly skillTags?: readonly string[]
  readonly skillTargetIds?: readonly string[]
  readonly element?: string
  readonly declaredCriticalRate?: number
  readonly declaredCriticalRateRaw?: unknown
  readonly selections?: StaticCatalogDamageInput["selections"]
  readonly bindings?: StaticCatalogDamageInput["bindings"]
  readonly actorSources?: StaticCatalogDamageInput["actorSources"]
  readonly world?: StaticCatalogDamageInput["world"]
  readonly hitActorId?: EntityId
  readonly extraItem?: {
    readonly itemId: string
    readonly damageMultiplier: number
  }
}

function benInput(overrides: BenInputOverrides = {}): StaticCatalogDamageInput {
  const base = inputFor()
  const items = overrides.omitItem
    ? [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "base",
          damageMultiplier: 2,
          stat: "attack" as const,
          statSource: { entityId: "entity:attacker" },
        },
      ]
    : [
        {
          mode: "direct" as const,
          role: overrides.role ?? ("base" as const),
          itemId: BEN_M2_ITEM,
          damageMultiplier: overrides.damageMultiplier ?? 0,
          stat: overrides.stat ?? ("defense" as const),
          statSource: {
            entityId: overrides.statSourceEntityId ?? "entity:attacker",
            ...(overrides.statSourceSnapshotId === undefined
              ? {}
              : { snapshotId: overrides.statSourceSnapshotId }),
          },
        },
        ...(overrides.extraItem
          ? [
              {
                mode: "direct" as const,
                role: "base" as const,
                itemId: overrides.extraItem.itemId,
                damageMultiplier: overrides.extraItem.damageMultiplier,
                stat: "defense" as const,
                statSource: { entityId: "entity:attacker" },
              },
            ]
          : []),
      ]
  const request: StaticCatalogDamageInput = {
    ...base,
    definitions,
    catalog,
    // 其余乘区全 1（目标基础防御 0）：non/critical = 3×DEF / 4.5×DEF。
    damage: {
      ...base.damage,
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 0,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
    } as Extract<StaticCatalogDamageInput["damage"], { kind: "regular" }>,
    world:
      overrides.world ??
      ({
        ...base.world,
        entities: base.world.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId === base.hit.actorId
            ? {
                ...entity,
                generalStats: {
                  ...entity.generalStats,
                  attack: general(overrides.attack ?? 1000),
                  defense: general(overrides.defense ?? 900),
                },
                directStats: {
                  ...(overrides.omitCriticalRateFact
                    ? {}
                    : {
                        criticalRate: {
                          baseValue: overrides.critRate ?? 0.25,
                          additions: [],
                        },
                      }),
                  criticalDamage: {
                    baseValue: overrides.critDmg ?? 0.5,
                    additions: [],
                  },
                  penetrationRatio: { baseValue: 0, additions: [] },
                },
              }
            : entity,
        ),
      } as StaticCatalogDamageInput["world"]),
    bindings:
      overrides.bindings ??
      ([
        {
          bindingId: "binding:ben",
          kind: "agent" as const,
          holderId: "entity:attacker",
          sourceEntityId: "1121",
          eligible: true,
          configuration: {
            mindscapeRank: (overrides.mindscapeRank ?? 6) as never,
            coreSkillLevel: 7 as never,
          },
        },
      ] as unknown as StaticCatalogDamageInput["bindings"]),
    actorSources:
      overrides.actorSources ??
      ([
        { entityId: "entity:attacker", agentEntityId: "1121" },
      ] as StaticCatalogDamageInput["actorSources"]),
    selections:
      overrides.selections ??
      ([
        {
          optionId: BEN_M2,
          bindingId: "binding:ben",
          layers: overrides.layers ?? 1,
        },
      ] as StaticCatalogDamageInput["selections"]),
    hit: {
      ...base.hit,
      ...(overrides.declaredCriticalRate === undefined
        ? {}
        : { declaredCriticalRate: overrides.declaredCriticalRate }),
      actorId: (overrides.hitActorId ?? base.hit.actorId) as "entity:attacker",
      skillCategory: (overrides.skillCategory ??
        "uncategorized") as "uncategorized",
      element: (overrides.element ?? "physical") as "physical",
      skillTags: [
        ...(base.hit.skillTags ?? []),
        ...(overrides.skillTags ?? []),
      ],
      skillTargetIds:
        overrides.skillTargetIds === undefined
          ? [BEN_M2_TARGET]
          : [...overrides.skillTargetIds],
      damageItems:
        items as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    },
  }
  if (overrides.declaredCriticalRateRaw !== undefined)
    (request.hit as { declaredCriticalRate?: unknown }).declaredCriticalRate =
      overrides.declaredCriticalRateRaw
  return request
}

describe("batch 13 Ben mindscape 2 block counter additional damage", () => {
  it("registers the independent target, option, and rule under revision 28 beside the preserved fixed-source options", () => {
    expect(catalog.revision).toBe("46")
    const target = catalog.skillTargets.find(
      (t) => t.targetId === BEN_M2_TARGET,
    )!
    expect(target).toMatchObject({
      upstreamId: null,
      agentEntityId: "1121",
      category: "uncategorized",
      name: "本格挡反击附伤",
      countsAsFollowUp: false,
    })
    const option = catalog.options.find((o) => o.optionId === BEN_M2)!
    expect(option.variants).toHaveLength(1)
    const variant = option.variants[0]!
    expect(variant.status).toBe("converted")
    expect(variant.configuration).toEqual({ minimumMindscape: 2 })
    expect(variant.maximumLayers).toBe(1)
    expect(variant.effectIds).toEqual([BEN_M2_DAMAGE])
    expect(variant.exclusiveDamageItem).toBe(true)
    expect(variant.damageItemRequirements).toEqual([
      {
        itemId: BEN_M2_ITEM,
        stat: "defense",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        requiredCriticalRateDeclaration: true,
      },
    ])
    expect(variant.references).toEqual([
      {
        sourceId: "nanoka-integrated",
        version: "3.2",
        locale: "zh",
        resourcePath: "agents/1121/details.zh.json",
        pointer: "/talent/2/desc",
      },
    ])
    const damageRule = definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === BEN_M2_DAMAGE,
    )!
    expect(damageRule.parameters).toEqual({
      amount: { kind: "constant", unit: "multiplier", value: 3 },
    })
    // 规则条件：目标标签 + regular 直伤；不按元素筛选（元素由调用方声明）。
    expect((damageRule as { when: unknown }).when).toMatchObject({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        { kind: "one-of", fact: "hit.skillTag", values: [BEN_M2_TARGET] },
      ],
    })
    // 既有固定来源选项身份保持：影画 0 团队暴率与影画 4 反击增伤原样共存。
    for (const [optionId, effectId] of [
      [BEN_M0_OPTION, BEN_M0_EFFECT],
      [BEN_M4_OPTION, BEN_M4_EFFECT],
    ] as const) {
      const existing = catalog.options.find((o) => o.optionId === optionId)!
      expect(existing.variants[0]!.effectIds).toEqual([effectId])
      expect(existing.variants[0]!.status).toBe("converted")
      expect(
        definitions.effects.some(
          (e) => e.kind === "contribution" && e.effectId === effectId,
        ),
        optionId,
      ).toBe(true)
    }
  })

  it.each([2, 3, 4, 5, 6].map((rank) => ({ rank })))(
    "settles 3x Ben DEF at mindscape rank $rank",
    ({ rank }: { rank: number }) => {
      // 影画 2 起解锁（M2—6 全档同值 300% 防御力）。
      const result = calculateCatalogResult(
        benInput({
          mindscapeRank: rank,
          defense: 900,
          declaredCriticalRate: 0.25,
        }),
      )
      expect(contributionOf(result, BEN_M2_DAMAGE)).toBeCloseTo(3, 8)
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(2700, 6)
    },
  )

  it.each([0, 1].map((rank) => ({ rank })))(
    "rejects selection below mindscape 2 at rank $rank",
    ({ rank }: { rank: number }) => {
      // M0/M1 未解锁：影画门槛拒绝，不索取本事件必填事实。
      const result = calculateStaticDamageFromCatalog(
        benInput({ mindscapeRank: rank, declaredCriticalRate: 0.25 }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("not unlocked"),
          ),
        ).toBe(true)
    },
  )

  it.each([
    { defense: 900, attack: 1000, expected: 2700 },
    { defense: 1200, attack: 1000, expected: 3600 },
    { defense: 900, attack: 1400, expected: 2700 },
  ])(
    "settles the independent arithmetic at defense $defense and attack $attack",
    ({ defense, attack, expected }) => {
      // 两个防御力锚点独立算式；攻击力变化不进入附伤（不误读 ATK）。
      const result = calculateCatalogResult(
        benInput({ defense, attack, declaredCriticalRate: 0.25 }),
      )
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(expected, 6)
      expect(result.critical).toBeCloseTo(expected * 1.5, 6)
    },
  )

  it.each([0, 0.25, 0.5, 1].map((r) => ({ label: `r=${String(r)}`, r })))(
    "settles the declared critical rate $label without reading the panel",
    ({ r }: { r: number }) => {
      // 声明 r 替换最终概率：expected = (1−r)×非暴 + r×暴；critical 分支
      // 沿用普通暴击伤害来源及本命中合法暴伤贡献，本例使用默认来源（本当前
      // 普通暴击伤害，条件计算模型，非游戏实测）。面板 CR 不参与。
      for (const panelRate of [0.25, 0.75]) {
        const result = calculateCatalogResult(
          benInput({ declaredCriticalRate: r, critRate: panelRate }),
        )
        expect(result.criticalRate, `panel ${String(panelRate)}`).toBe(r)
        expect(result.factors.nonCritical.baseDamage).toBeCloseTo(2700, 6)
        expect(result.critical).toBeCloseTo(4050, 6)
        expect(result.nonCritical).toBeCloseTo(2700, 6)
        expect(result.expected).toBeCloseTo((1 - r) * 2700 + r * 4050, 6)
        expect(
          result.evaluation.attributes.some(
            (attribute) =>
              attribute.stat === "criticalRate" &&
              attribute.entityId === "entity:attacker" &&
              attribute.hitId === "hit:static",
          ),
          `panel ${String(panelRate)}`,
        ).toBe(false)
      }
    },
  )

  it("repeat queries do not accumulate", () => {
    const input = benInput({ declaredCriticalRate: 0.25 })
    const first = calculateCatalogResult(input)
    const second = calculateCatalogResult(input)
    expect(second.factors.nonCritical.baseDamage ?? 0).toBeCloseTo(
      first.factors.nonCritical.baseDamage ?? 0,
      9,
    )
  })

  it("closes at zero layers without demanding the declared fact", () => {
    // 0 层关闭：独立项保持零倍率零贡献，声明概率不被索取，暴击率保持面板值。
    const off = calculateCatalogResult(benInput({ layers: 0 }))
    expect(contributionOf(off, BEN_M2_DAMAGE)).toBe(0)
    expect(off.factors.nonCritical.baseDamage).toBe(0)
    expect(off.criticalRate).toBeCloseTo(0.25, 12)
  })

  it.each([-1, 0.5, 2].map((layers) => ({ layers })))(
    "rejects illegal layers $layers",
    ({ layers }: { layers: number }) => {
      // 一次状态严格 0/1：负数、分数与 2 层都拒绝。
      const result = calculateStaticDamageFromCatalog(
        benInput({ layers, declaredCriticalRate: 0.25 }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "INVALID_INPUT"),
        ).toBe(true)
    },
  )

  it("rejects an enabled settlement without a declared critical rate", () => {
    // 启用（layers 1、影画 6、携带独立项）而未声明最终暴击概率：不默许
    // 读取本面板普通暴击率充当该次独立命中的概率。
    const result = calculateStaticDamageFromCatalog(benInput())
    expect(result.ok, JSON.stringify(result)).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "MISSING_FACT" &&
            issue.pointer.includes("declaredCriticalRate") &&
            issue.message.includes(BEN_M2_ITEM),
        ),
      ).toBe(true)
  })

  it.each([
    { label: "below zero", value: -0.1 },
    { label: "above one", value: 1.1 },
    { label: "NaN", value: Number.NaN },
    { label: "Infinity", value: Number.POSITIVE_INFINITY },
    { label: "non-number", value: "0.25" },
  ] as const)("rejects an invalid declared rate ($label)", ({ value }) => {
    const result = calculateStaticDamageFromCatalog(
      benInput({ declaredCriticalRateRaw: value }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" &&
            issue.pointer === "/hit/declaredCriticalRate",
        ),
      ).toBe(true)
  })

  it("rejects mis-declared independent items and borrowed identities", () => {
    const expectIssue = (
      input: StaticCatalogDamageInput,
      match: (issue: { code: string; message: string }) => boolean,
      label: string,
    ) => {
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok, label).toBe(false)
      if (!result.ok) expect(result.issues.some(match), label).toBe(true)
    }
    const rate = { declaredCriticalRate: 0.25 }
    // 缺独立项：MISSING_REFERENCE（调用方须为附伤单独结算）。
    expectIssue(
      benInput({ ...rate, omitItem: true }),
      (issue) => issue.code.includes("MISSING_REFERENCE"),
      "missing item",
    )
    // 预填机制倍率：不能加倍。
    expectIssue(
      benInput({ ...rate, damageMultiplier: 2 }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("zero multiplier"),
      "prefilled multiplier",
    )
    // 错属性：附伤按本防御力缩放，攻击力/冲击力拒绝。
    for (const stat of ["attack", "impact"] as const) {
      expectIssue(
        benInput({ ...rate, stat }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("scales") &&
          issue.message.includes("expected"),
        `wrong stat ${stat}`,
      )
    }
    // 错角色。
    expectIssue(
      benInput({ ...rate, role: "settlement" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("role settlement, expected base"),
      "wrong role",
    )
    // 读取他人当前属性 / 历史快照：holder-current 拒绝（跨持有者不串用）。
    expectIssue(
      benInput({ ...rate, statSourceEntityId: "entity:enemy" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("bound holder's current attributes"),
      "foreign stat source",
    )
    expectIssue(
      benInput({ ...rate, statSourceSnapshotId: "snapshot:history" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("bound holder's current attributes"),
      "snapshot stat source",
    )
    // 借用触发动作的分类结算（特殊技/强化特殊技格挡反击的 special 分类）：
    // 独立项必须按 uncategorized 结算。
    for (const skillCategory of ["special", "enhanced-special"]) {
      expectIssue(
        benInput({ ...rate, skillCategory }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("must settle as"),
        `borrowed category ${skillCategory}`,
      )
    }
    // 保留的分类标签同样参与最终有效分类校验。
    expectIssue(
      benInput({ ...rate, skillTags: ["zzz-hp:category:special"] }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("must settle as"),
      "retained category tag",
    )
    // 另一来源的独立目标（比格气缸）：目标真实登记（无 MISSING_REFERENCE），
    // 但规则按目标身份匹配——本 M2 规则不作用，独立项保持零贡献。
    const otherTarget = calculateCatalogResult(
      benInput({ ...rate, skillTargetIds: [BIG_CYLINDER_TARGET] }),
    )
    expect(contributionOf(otherTarget, BEN_M2_DAMAGE)).toBe(0)
    expect(otherTarget.factors.nonCritical.baseDamage).toBe(0)
  })

  it("does not filter the independent item by element; the caller declares it", () => {
    // 来源未标注附伤元素：同一声明目标在任一声明元素下都得到同一倍率贡献
    // （不把本固有火属性或触发动作的 physical/fire 当作证据）。
    for (const element of ["physical", "fire", "electric"] as const) {
      const result = calculateCatalogResult(
        benInput({ element, declaredCriticalRate: 0.25 }),
      )
      expect(contributionOf(result, BEN_M2_DAMAGE), element).toBeCloseTo(3, 8)
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(2700, 6)
    }
    // 缺目标：合法但不匹配，独立项保持零贡献。
    const missing = calculateCatalogResult(
      benInput({ declaredCriticalRate: 0.25, skillTargetIds: [] }),
    )
    expect(contributionOf(missing, BEN_M2_DAMAGE)).toBe(0)
    expect(missing.factors.nonCritical.baseDamage).toBe(0)
  })

  it.each(TRIGGER_ACTIONS)(
    "keeps the $label action path free of the additional damage while the option stays usable",
    (action) => {
      // 两条触发路径的真实动作身份（特殊技/强化特殊技分类、physical/fire
      // 元素）不经本选项自动派生附伤：启用中请求独立项在场（MISSING_REFERENCE
      // 要求单独结算），关闭（0 层）时动作段完全不受影响。
      const actionHit = {
        ...benInput({ layers: 1 }).hit,
        skillCategory: action.skillCategory,
        element: action.element,
        skillTargetIds: [],
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "counter",
            damageMultiplier: 2,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      }
      const rejected = calculateStaticDamageFromCatalog({
        ...benInput({ layers: 1 }),
        hit: actionHit,
      })
      expect(rejected.ok).toBe(false)
      if (!rejected.ok)
        expect(
          rejected.issues.some(
            (issue) =>
              issue.code.includes("MISSING_REFERENCE") &&
              issue.message.includes(BEN_M2_ITEM),
          ),
        ).toBe(true)
      const off = calculateCatalogResult({
        ...benInput({ layers: 0 }),
        hit: actionHit,
      })
      expect(contributionOf(off, BEN_M2_DAMAGE)).toBe(0)
      expect(off.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
      // 影画 4 反击增伤非零对照：两条格挡反击动作段都按 special 分类吃到
      // +30%（skillTargets 只含 special；身份/原值保持），基础区不变。
      const withM4 = calculateCatalogResult({
        ...benInput({
          layers: 0,
          selections: [
            { optionId: BEN_M2, bindingId: "binding:ben", layers: 0 },
            { optionId: BEN_M4_OPTION, bindingId: "binding:ben", layers: 1 },
          ],
        }),
        hit: actionHit,
      })
      expect(contributionOf(withM4, BEN_M4_EFFECT)).toBeCloseTo(0.3, 8)
      expect(withM4.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
      expect(withM4.nonCritical).toBeCloseTo(2600, 6)
      // 影画 0 团队暴率非零对照：普通命中的最终暴击率吃到 +16%（实体作用域）。
      const withM0 = calculateCatalogResult({
        ...benInput({
          layers: 0,
          selections: [
            { optionId: BEN_M2, bindingId: "binding:ben", layers: 0 },
            { optionId: BEN_M0_OPTION, bindingId: "binding:ben", layers: 1 },
          ],
        }),
        hit: actionHit,
      })
      expect(contributionOf(withM0, BEN_M0_EFFECT)).toBeCloseTo(0.16, 8)
      expect(withM0.criticalRate).toBeCloseTo(0.41, 12)
    },
  )

  it("keeps the M0 team critical rate and the M4 counter bonus outside the independent settlement", () => {
    // 精确作用域：影画 0 团队暴率是实体作用域增益，不参与也不冲突本独立项
    // 的声明概率（显式暴击概率契约）；影画 4 反击增伤的 skillTargets 只含 special
    // 分类，uncategorized 独立项零贡献（覆盖关系未经游戏实测，属登记边界）。
    const both = calculateCatalogResult(
      benInput({
        declaredCriticalRate: 0.25,
        selections: [
          { optionId: BEN_M2, bindingId: "binding:ben", layers: 1 },
          { optionId: BEN_M0_OPTION, bindingId: "binding:ben", layers: 1 },
          { optionId: BEN_M4_OPTION, bindingId: "binding:ben", layers: 1 },
        ],
      }),
    )
    expect(contributionOf(both, BEN_M4_EFFECT)).toBe(0)
    expect(both.factors.nonCritical.baseDamage).toBeCloseTo(2700, 6)
    expect(both.criticalRate).toBe(0.25)
    // 实体作用域暴率（影画 0）被声明替换：不参与形成最终概率，也不被伪报
    // 为概率消费（显式暴击概率契约）；普通命中的非零对照见触发路径用例。
    expect(
      both.evaluation.contributions.some(
        (contribution) =>
          contribution.origin.effectId === BEN_M0_EFFECT &&
          contribution.address.kind === "stat" &&
          contribution.address.stat === "criticalRate",
      ),
    ).toBe(false)
    expect(both.expected).toBeCloseTo(0.75 * 2700 + 0.25 * 4050, 6)
  })

  it("coexists with the equipped big cylinder as two independent settlements in one world", () => {
    // 同一装备/世界：本（影画 6）装备比格气缸 R1，agent 与 w-engine 绑定
    // 同时在场。两个来源、两个事件：合法共存是两次独立请求，各启用本
    // 事件相关选项、其余关闭。
    const world: StaticCatalogDamageInput["world"] = benInput().world
    const bindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:ben",
        kind: "agent" as const,
        holderId: "entity:attacker",
        sourceEntityId: "1121",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      } as unknown as StaticCatalogDamageInput["bindings"][number],
      {
        bindingId: "binding:engine",
        kind: "w-engine" as const,
        holderId: "entity:attacker",
        sourceEntityId: "13112",
        eligible: true,
        configuration: { refinement: 1 },
      },
    ]
    const shared = {
      definitions,
      catalog,
      world,
      bindings,
      actorSources: [
        {
          entityId: "entity:attacker" as EntityId,
          agentEntityId: "1121",
        },
      ] satisfies StaticCatalogDamageInput["actorSources"],
      damage: benInput().damage,
    }
    // 请求 A：本 M2 附伤（比格气缸关闭）——3×DEF、声明概率 r=0.25。
    const m2 = calculateCatalogResult({
      ...shared,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben", layers: 1 },
        { optionId: BIG_CYLINDER, bindingId: "binding:engine", layers: 0 },
      ],
      hit: {
        ...benInput({ declaredCriticalRate: 0.25 }).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BEN_M2_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    expect(m2.factors.nonCritical.baseDamage).toBeCloseTo(2700, 6)
    expect(m2.criticalRate).toBeCloseTo(0.25, 12)
    // 比格气缸必暴通道不污染本 M2 的声明概率（另一选项关闭）。
    expect(contributionOf(m2, BIG_CYLINDER_CRIT)).toBe(0)
    // 请求 B：比格气缸受击附伤（本 M2 关闭）——6×DEF、附伤独立命中必暴。
    const cylinder = calculateCatalogResult({
      ...shared,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben", layers: 0 },
        { optionId: BIG_CYLINDER, bindingId: "binding:engine", layers: 1 },
      ],
      hit: {
        ...benInput().hit,
        skillTargetIds: [BIG_CYLINDER_TARGET],
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BIG_CYLINDER_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    expect(cylinder.factors.nonCritical.baseDamage).toBeCloseTo(5400, 6)
    expect(contributionOf(cylinder, BIG_CYLINDER_DAMAGE)).toBeCloseTo(6, 8)
    expect(cylinder.criticalRate).toBe(1)
    expect(cylinder.expected).toBeCloseTo(cylinder.critical!, 9)
    expect(contributionOf(cylinder, BIG_CYLINDER_CRIT)).toBeCloseTo(1, 8)
    // 混合请求一：两选项同时启用、只带本 M2 项——比格气缸独占拒绝
    // （不是把两项塞进同一命中，也不能让必暴污染声明概率）。
    const bothEnabled = calculateStaticDamageFromCatalog({
      ...shared,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben", layers: 1 },
        { optionId: BIG_CYLINDER, bindingId: "binding:engine", layers: 1 },
      ],
      hit: {
        ...benInput({ declaredCriticalRate: 0.25 }).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BEN_M2_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    expect(bothEnabled.ok).toBe(false)
    if (!bothEnabled.ok)
      expect(
        bothEnabled.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("sole damage item"),
        ),
      ).toBe(true)
    // 混合请求二：同一命中携带两个独立项（无论哪个选项启用）都按独占拒绝。
    const mixedItems = calculateStaticDamageFromCatalog({
      ...shared,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben", layers: 1 },
        { optionId: BIG_CYLINDER, bindingId: "binding:engine", layers: 0 },
      ],
      hit: {
        ...benInput({ declaredCriticalRate: 0.25 }).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BEN_M2_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:attacker" },
          },
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BIG_CYLINDER_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    expect(mixedItems.ok).toBe(false)
    if (!mixedItems.ok)
      expect(
        mixedItems.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("sole damage item"),
        ),
      ).toBe(true)
  })

  it("settles each Ben instance separately with the other binding closed", () => {
    // 两名本同场（同实体 1121 的两个绑定）：同一独立项不能同时读取两名
    // 持有者的当前属性，各归各结算（另一绑定 0 层关闭）；同时启用被
    // holder-current/声明归属拒绝，不串用面板。
    const benA = "entity:ben-a" as EntityId
    const benB = "entity:ben-b" as EntityId
    const world: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: benA,
          teamId: "team:players",
          generalStats: { attack: general(1000), defense: general(900) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: benB,
          teamId: "team:players",
          generalStats: { attack: general(1000), defense: general(1200) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:enemy" as EntityId,
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
    }
    const bindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:ben-a",
        kind: "agent" as const,
        holderId: benA,
        sourceEntityId: "1121",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      } as unknown as StaticCatalogDamageInput["bindings"][number],
      {
        bindingId: "binding:ben-b",
        kind: "agent" as const,
        holderId: benB,
        sourceEntityId: "1121",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      } as unknown as StaticCatalogDamageInput["bindings"][number],
    ]
    const actorSources: StaticCatalogDamageInput["actorSources"] = [
      { entityId: benA, agentEntityId: "1121" },
      { entityId: benB, agentEntityId: "1121" },
    ]
    const hitFor = (actorId: EntityId) => ({
      ...benInput({ declaredCriticalRate: 0.25 }).hit,
      actorId,
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: BEN_M2_ITEM,
          damageMultiplier: 0,
          stat: "defense" as const,
          statSource: { entityId: actorId },
        },
      ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    })
    const damage = benInput().damage
    // 本 A（DEF 900）单独结算：2700。
    const a = calculateCatalogResult({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben-a", layers: 1 },
        { optionId: BEN_M2, bindingId: "binding:ben-b", layers: 0 },
      ],
      hit: hitFor(benA),
    })
    expect(a.factors.nonCritical.baseDamage).toBeCloseTo(2700, 6)
    expect(a.criticalRate).toBe(0.25)
    // 本 B（DEF 1200）单独结算：3600（各读各的当前防御力）。
    const b = calculateCatalogResult({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben-a", layers: 0 },
        { optionId: BEN_M2, bindingId: "binding:ben-b", layers: 1 },
      ],
      hit: hitFor(benB),
    })
    expect(b.factors.nonCritical.baseDamage).toBeCloseTo(3600, 6)
    // 同时启用：结算本 A 的项时另一绑定不串用（holder-current/声明归属拒绝）。
    const bothOpen = calculateStaticDamageFromCatalog({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben-a", layers: 1 },
        { optionId: BEN_M2, bindingId: "binding:ben-b", layers: 1 },
      ],
      hit: hitFor(benA),
    })
    expect(bothOpen.ok).toBe(false)
    if (!bothOpen.ok)
      expect(
        bothOpen.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    // 跨持有者读取：本 A 的绑定启用、独立项读本 B 的当前属性——拒绝。
    const crossHolder = calculateStaticDamageFromCatalog({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: BEN_M2, bindingId: "binding:ben-a", layers: 1 },
        { optionId: BEN_M2, bindingId: "binding:ben-b", layers: 0 },
      ],
      hit: {
        ...hitFor(benA),
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BEN_M2_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: benB },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    expect(crossHolder.ok).toBe(false)
    if (!crossHolder.ok)
      expect(
        crossHolder.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("bound holder's current attributes"),
        ),
      ).toBe(true)
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  EntityId,
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 增益修复批次 08（修订 23）：伊芙琳[月辉丝·弦]、零号·安比电磁涡流与
 * 琉音余音三条影画 6 独立追击的具名回归。期望值全部来自冻结 Nanoka 3.2
 * 天赋原文（中英文交叉核对）与独立算式（375%/1000%/480% × 自身当前
 * 攻击力），不从生成器反推；触发事实由调用方显式声明并结算一次，16/12
 * 次上限、20 秒/1 秒与刷新不模拟，不乘次数、不计作触发招式本身。伊芙琳
 * 旧 125% 具名倍率规则对新目标明确排除（普通连携/终结保持 25%）。
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

const EVELYN_M6 = "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up"
const EVELYN_M6_EFFECT =
  "agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6"
const EVELYN_125 =
  "agents:evelyn:mindscape:0:blk-ms4j94x5-1mflp4:eff-ms4j9nhd-9ya68m"
const EVELYN_125_EFFECT =
  "agent:1321:zzz-hp:eff-ms4j9nhd-9ya68m:blk-ms4j94x5-1mflp4:mindscape:0"
const EVELYN_30 =
  "agents:evelyn:mindscape:0:blk-ms4j94x5-1mflp4:eff-ms4j94x5-3elaxq"
const EVELYN_30_EFFECT =
  "agent:1321:zzz-hp:eff-ms4j94x5-3elaxq:blk-ms4j94x5-1mflp4:mindscape:0"
const S0ANBY_M6 = "nanoka:agents:s0anby:m6-electromagnetic-vortex"
const S0ANBY_M6_EFFECT =
  "agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6"
const S0ANBY_FU =
  "agents:s0anby:mindscape:0:blk-ms4jqdq1-rkmmm3:eff-ms4jqsm1-qkfx1a"
const DIALYN_M6 = "nanoka:agents:dialyn:m6-aftertone-echo"
const DIALYN_M6_EFFECT = "agent:1481:nanoka:m6-aftertone-echo:mindscape:6"
const LUNAR_BASIC =
  "w-engines:Lunar_Pleniluna:refinement:blk-legacy:legacy-self-skillDmgBonus"
const CHAOS_JAZZ_SPECIAL =
  "drive-discs:chaos-jazz:setPieces:4:blk-legacy:eff-ms0fbqh9-y74dup"

interface M6Case {
  readonly label: string
  readonly agentEntityId: string
  readonly optionId: string
  readonly effectId: string
  readonly itemId: string
  readonly targetId: string
  readonly element: "fire" | "electric" | "physical"
  readonly skillCategory: "chain" | "follow-up" | "enhanced-special"
  readonly multiplier: number
}
const M6_CASES: readonly M6Case[] = [
  {
    label: "Evelyn Lunalux Garrote",
    agentEntityId: "1321",
    optionId: EVELYN_M6,
    effectId: EVELYN_M6_EFFECT,
    itemId: "evelyn:lunalux-garrote",
    targetId: "zzz-hp:skill:evelyn-lunalux-garrote",
    element: "fire",
    skillCategory: "chain",
    multiplier: 3.75,
  },
  {
    label: "Soldier 0 - Anby electromagnetic vortex",
    agentEntityId: "1381",
    optionId: S0ANBY_M6,
    effectId: S0ANBY_M6_EFFECT,
    itemId: "s0anby:electromagnetic-vortex",
    targetId: "zzz-hp:skill:s0anby-electromagnetic-vortex",
    element: "electric",
    skillCategory: "follow-up",
    multiplier: 10,
  },
  {
    label: "Dialyn Aftertone echo",
    agentEntityId: "1481",
    optionId: DIALYN_M6,
    effectId: DIALYN_M6_EFFECT,
    itemId: "dialyn:aftertone-echo",
    targetId: "zzz-hp:skill:dialyn-aftertone-echo",
    element: "physical",
    skillCategory: "enhanced-special",
    multiplier: 4.8,
  },
]

function m6Input(
  m6: M6Case,
  overrides: {
    attack?: number
    mindscapeRank?: MindscapeRank
    potentialLevel?: number
    layers?: number
    skillCategory?: string
    element?: string
    skillTargetIds?: readonly string[]
    skillTags?: readonly string[]
    damageMultiplier?: number
    stat?: "attack" | "impact"
    role?: "base" | "settlement"
    statSourceEntityId?: string
    statSourceSnapshotId?: string
    omitItem?: boolean
    actorId?: string
    bindings?: StaticCatalogDamageInput["bindings"]
    selections?: StaticCatalogDamageInput["selections"]
    actorSources?: StaticCatalogDamageInput["actorSources"]
    world?: StaticCatalogDamageInput["world"]
  } = {},
): StaticCatalogDamageInput {
  const base = inputFor()
  const independentItem = {
    mode: "direct" as const,
    role: overrides.role ?? ("base" as const),
    itemId: m6.itemId,
    damageMultiplier: overrides.damageMultiplier ?? 0,
    stat: overrides.stat ?? ("attack" as const),
    statSource: {
      entityId: overrides.statSourceEntityId ?? "entity:attacker",
      ...(overrides.statSourceSnapshotId === undefined
        ? {}
        : { snapshotId: overrides.statSourceSnapshotId }),
    },
  }
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
    : [independentItem]
  return {
    ...base,
    definitions,
    catalog,
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
    world: overrides.world ?? {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === base.hit.actorId
          ? {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                attack: general(overrides.attack ?? 1000),
              },
            }
          : entity,
      ),
    },
    bindings: overrides.bindings ?? [
      {
        bindingId: "binding:static",
        kind: "agent" as const,
        holderId: "entity:attacker",
        sourceEntityId: m6.agentEntityId,
        eligible: true,
        configuration: {
          mindscapeRank: (overrides.mindscapeRank ?? 6) as MindscapeRank,
          coreSkillLevel: 7 as CoreSkillLevel,
          ...(overrides.potentialLevel === undefined
            ? {}
            : { potentialLevel: overrides.potentialLevel as 1 }),
        },
      },
    ],
    actorSources: overrides.actorSources ?? [
      { entityId: "entity:attacker", agentEntityId: m6.agentEntityId },
    ],
    selections: overrides.selections ?? [
      {
        optionId: m6.optionId,
        bindingId: "binding:static",
        layers: overrides.layers ?? 1,
      },
    ],
    hit: {
      ...base.hit,
      actorId: (overrides.actorId ?? base.hit.actorId) as "entity:attacker",
      targetId: base.hit.targetId,
      skillCategory: (overrides.skillCategory ?? m6.skillCategory) as "chain",
      element: (overrides.element ?? m6.element) as "fire",
      skillTargetIds:
        overrides.skillTargetIds === undefined
          ? [m6.targetId]
          : [...overrides.skillTargetIds],
      skillTags: [
        ...(base.hit.skillTags ?? []),
        ...(overrides.skillTags ?? []),
      ],
      damageItems:
        items as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    },
  }
}

describe("batch 08 M6 independent follow-ups", () => {
  it("registers the three targets, requirements, and rules under revision 23", () => {
    expect(catalog.revision).toBe("44")
    const expectedTargets: readonly (readonly [
      targetId: string,
      category: string,
      countsAsFollowUp: boolean,
    ])[] = [
      ["zzz-hp:skill:evelyn-lunalux-garrote", "chain", false],
      ["zzz-hp:skill:s0anby-electromagnetic-vortex", "follow-up", true],
      ["zzz-hp:skill:dialyn-aftertone-echo", "special", false],
    ]
    for (const [targetId, category, countsAsFollowUp] of expectedTargets) {
      const target = catalog.skillTargets.find((t) => t.targetId === targetId)!
      expect(target, targetId).toMatchObject({
        upstreamId: null,
        category,
        countsAsFollowUp,
      })
    }
    for (const m6 of M6_CASES) {
      const option = catalog.options.find((o) => o.optionId === m6.optionId)!
      expect(option.variants, m6.label).toHaveLength(1)
      const variant = option.variants[0]!
      expect(variant.status, m6.label).toBe("converted")
      expect(variant.configuration, m6.label).toEqual({ minimumMindscape: 6 })
      expect(variant.maximumLayers, m6.label).toBe(1)
      expect(variant.damageItemRequirements, m6.label).toEqual([
        {
          itemId: m6.itemId,
          stat: "attack",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: m6.skillCategory,
        },
      ])
      const rule = definitions.effects.find((e) => e.effectId === m6.effectId)!
      expect(rule.kind, m6.label).toBe("contribution")
      if (rule.kind !== "contribution") throw new Error("unreachable")
      expect(rule.operation, m6.label).toEqual({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [m6.itemId],
        value: { kind: "parameter", unit: "multiplier", name: "amount" },
      })
      expect(rule.parameters, m6.label).toEqual({
        amount: { kind: "constant", unit: "multiplier", value: m6.multiplier },
      })
      expect(rule.scope, m6.label).toBe("hit")
      // 独立命中条件：声明目标、证据元素与 regular 直伤种类。
      expect(rule.when, m6.label).toEqual({
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          { kind: "one-of", fact: "hit.element", values: [m6.element] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: [m6.targetId],
          },
        ],
      })
    }
  })

  it.each(M6_CASES)(
    "settles $label once per declared hit at the fixed multiplier",
    (m6) => {
      // 攻击 1000：3750 / 10000 / 4800；500 验证线性；不乘 16/12/6 次。
      for (const attack of [1000, 500]) {
        const result = calculateCatalogResult(m6Input(m6, { attack }))
        expect(contributionOf(result, m6.effectId)).toBeCloseTo(
          m6.multiplier,
          8,
        )
        expect(result.factors.nonCritical.baseDamage).toBeCloseTo(
          m6.multiplier * attack,
          6,
        )
      }
      // 重复查询同一输入不积累。
      const input = m6Input(m6)
      const first = calculateCatalogResult(input)
      const second = calculateCatalogResult(input)
      const firstBase = first.factors.nonCritical.baseDamage ?? 0
      expect(second.factors.nonCritical.baseDamage ?? 0).toBeCloseTo(
        firstBase,
        9,
      )
      // 0 层关闭：独立项保持零倍率零贡献。
      const off = calculateCatalogResult(m6Input(m6, { layers: 0 }))
      expect(contributionOf(off, m6.effectId)).toBe(0)
      expect(off.factors.nonCritical.baseDamage).toBe(0)
      // M0—M5 未解锁。
      for (const mindscapeRank of [0, 5] as const) {
        const result = calculateStaticDamageFromCatalog(
          m6Input(m6, { mindscapeRank }),
        )
        expect(result.ok, `mindscape ${mindscapeRank}`).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some(
              (issue) =>
                issue.code === "CONTEXT_MISMATCH" &&
                issue.message.includes("not unlocked"),
            ),
            `mindscape ${mindscapeRank}`,
          ).toBe(true)
      }
      // 非法层 -1 / 0.5 / 2。
      for (const layers of [-1, 0.5, 2] as const) {
        const result = calculateStaticDamageFromCatalog(m6Input(m6, { layers }))
        expect(result.ok, `layers ${String(layers)}`).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "INVALID_INPUT"),
            `layers ${String(layers)}`,
          ).toBe(true)
      }
    },
  )

  it("rejects mis-declared independent items and borrowed identities", () => {
    const evelyn = M6_CASES[0]!
    const expectIssue = (
      input: StaticCatalogDamageInput,
      match: (issue: { code: string; message: string }) => boolean,
    ) => {
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok, JSON.stringify(result)).toBe(false)
      if (!result.ok) expect(result.issues.some(match)).toBe(true)
    }
    // 缺独立项：MISSING_REFERENCE。
    expectIssue(m6Input(evelyn, { omitItem: true }), (issue) =>
      issue.code.includes("MISSING_REFERENCE"),
    )
    // 预填机制倍率：不能变成 7.5。
    expectIssue(
      m6Input(evelyn, { damageMultiplier: 3.75 }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("zero multiplier"),
    )
    // 错属性 / 错角色 / 错模式。
    expectIssue(
      m6Input(evelyn, { stat: "impact" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("scales impact, expected attack"),
    )
    expectIssue(
      m6Input(evelyn, { role: "settlement" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("role settlement, expected base"),
    )
    // 读取他人当前属性 / 历史快照：holder-current 拒绝。
    expectIssue(
      m6Input(evelyn, { statSourceEntityId: "entity:enemy" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("bound holder's current attributes"),
    )
    expectIssue(
      m6Input(evelyn, { statSourceSnapshotId: "snapshot:history" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("bound holder's current attributes"),
    )
    // 借用其他分类结算（普攻）：独立项必须按 chain 结算。
    expectIssue(
      m6Input(evelyn, { skillCategory: "basic" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("must settle as"),
    )
    // 错误元素 / 缺目标：合法但不匹配，独立项保持零贡献。
    for (const [label, overrides] of [
      ["element", { element: "ice" }],
      ["target", { skillTargetIds: [] }],
    ] as const) {
      const result = calculateCatalogResult(m6Input(evelyn, overrides))
      expect(contributionOf(result, evelyn.effectId), label).toBe(0)
      expect(result.factors.nonCritical.baseDamage, label).toBe(0)
    }
    // 另一角色的具名目标：目标属于另一代理人。
    const s0anby = M6_CASES[1]!
    expectIssue(
      m6Input(s0anby, { skillTargetIds: [evelyn.targetId] }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("belongs to another agent"),
    )
    // 两个来源同场（两名持有者）：各归各的贡献，互不串用。
    const twoHolderWorld: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: "entity:evelyn" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000) },
          directStats: {
            criticalRate: { baseValue: 0, additions: [] },
            criticalDamage: { baseValue: 0, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
            sharpCriticalDamage: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:s0anby" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000) },
          directStats: {
            criticalRate: { baseValue: 0, additions: [] },
            criticalDamage: { baseValue: 0, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
            sharpCriticalDamage: { baseValue: 0, additions: [] },
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
    const bothBindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:evelyn",
        kind: "agent" as const,
        holderId: "entity:evelyn",
        sourceEntityId: "1321",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
      {
        bindingId: "binding:s0anby",
        kind: "agent" as const,
        holderId: "entity:s0anby",
        sourceEntityId: "1381",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
    ]
    const bothActorSources: StaticCatalogDamageInput["actorSources"] = [
      { entityId: "entity:evelyn", agentEntityId: "1321" },
      { entityId: "entity:s0anby", agentEntityId: "1381" },
    ]
    const garrote = calculateCatalogResult({
      ...m6Input(evelyn, {
        bindings: bothBindings,
        actorSources: bothActorSources,
        world: twoHolderWorld,
        actorId: "entity:evelyn",
        statSourceEntityId: "entity:evelyn",
        // 同场两名持有者：只有本次结算的追击启用（另一名关闭），同一实体
        // 不能同时是两名代理人，选择与持有者身份必须一致。
        selections: [
          { optionId: EVELYN_M6, bindingId: "binding:evelyn", layers: 1 },
          { optionId: S0ANBY_M6, bindingId: "binding:s0anby", layers: 0 },
        ],
      }),
    })
    expect(
      contributionOf(garrote, EVELYN_M6_EFFECT, "entity:evelyn"),
    ).toBeCloseTo(3.75, 8)
    expect(garrote.factors.nonCritical.baseDamage).toBeCloseTo(3750, 6)
    const vortex = calculateCatalogResult({
      ...m6Input(s0anby, {
        bindings: bothBindings,
        actorSources: bothActorSources,
        world: twoHolderWorld,
        actorId: "entity:s0anby",
        statSourceEntityId: "entity:s0anby",
        selections: [
          { optionId: EVELYN_M6, bindingId: "binding:evelyn", layers: 0 },
          { optionId: S0ANBY_M6, bindingId: "binding:s0anby", layers: 1 },
        ],
      }),
    })
    expect(
      contributionOf(vortex, S0ANBY_M6_EFFECT, "entity:s0anby"),
    ).toBeCloseTo(10, 8)
    expect(vortex.factors.nonCritical.baseDamage).toBeCloseTo(10000, 6)
  })

  it("keeps the Evelyn 125% named-skill multiplier on ordinary chain hits only", () => {
    const evelyn = M6_CASES[0]!
    // 普通连携命中（基础倍率 2，不选 M6）：125% 进入基础倍率区 → 2×1000×1.25；
    // 通用 30% 是增伤乘区（damageBonus 1.3）。
    const ordinary = calculateCatalogResult({
      ...m6Input(evelyn, {
        selections: [
          { optionId: EVELYN_125, bindingId: "binding:static", layers: 1 },
          { optionId: EVELYN_30, bindingId: "binding:static", layers: 1 },
        ],
        omitItem: true,
        skillTargetIds: [],
      }),
    })
    expect(contributionOf(ordinary, EVELYN_125_EFFECT)).toBeCloseTo(0.25, 8)
    expect(contributionOf(ordinary, EVELYN_30_EFFECT)).toBeCloseTo(0.3, 8)
    expect(ordinary.factors.nonCritical.baseDamage).toBeCloseTo(2500, 6)
    expect(ordinary.factors.nonCritical.damageBonus).toBeCloseTo(1.3, 8)
    // 月辉丝·弦独立命中：通用 30% 生效，旧 125% 被具名范围修正排除。
    const garrote = calculateCatalogResult(
      m6Input(evelyn, {
        selections: [
          { optionId: EVELYN_M6, bindingId: "binding:static", layers: 1 },
          { optionId: EVELYN_125, bindingId: "binding:static", layers: 1 },
          { optionId: EVELYN_30, bindingId: "binding:static", layers: 1 },
        ],
      }),
    )
    expect(contributionOf(garrote, EVELYN_125_EFFECT)).toBe(0)
    expect(contributionOf(garrote, EVELYN_30_EFFECT)).toBeCloseTo(0.3, 8)
    // 弦的基础区保持 3750（无 1.25 放大）；通用 30% 走增伤乘区。
    expect(garrote.factors.nonCritical.baseDamage).toBeCloseTo(3750, 6)
    expect(garrote.factors.nonCritical.damageBonus).toBeCloseTo(1.3, 8)
    // 只选 M6 与 125%（无 30%）：基础区 3750、增伤区 1，无任何放大。
    const garroteNoBonus = calculateCatalogResult(
      m6Input(evelyn, {
        selections: [
          { optionId: EVELYN_M6, bindingId: "binding:static", layers: 1 },
          { optionId: EVELYN_125, bindingId: "binding:static", layers: 1 },
        ],
      }),
    )
    expect(garroteNoBonus.factors.nonCritical.baseDamage).toBeCloseTo(3750, 6)
    expect(garroteNoBonus.factors.nonCritical.damageBonus).toBe(1)
  })

  it("keeps basic-attack-only gains away from the Evelyn follow-up", () => {
    const evelyn = M6_CASES[0]!
    const lunarBindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:static",
        kind: "agent" as const,
        holderId: "entity:attacker",
        sourceEntityId: "1321",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
      {
        bindingId: "binding:lunar",
        kind: "w-engine" as const,
        holderId: "entity:attacker",
        sourceEntityId: "12001",
        eligible: true,
        configuration: { refinement: 1 },
      },
    ]
    // 弦是连携分类的火伤：普攻专属 +12% 不作用（基础区与增伤区都不变）。
    const garrote = calculateCatalogResult(
      m6Input(evelyn, {
        bindings: lunarBindings,
        selections: [
          { optionId: EVELYN_M6, bindingId: "binding:static", layers: 1 },
          { optionId: LUNAR_BASIC, bindingId: "binding:lunar", layers: 1 },
        ],
      }),
    )
    expect(garrote.factors.nonCritical.baseDamage).toBeCloseTo(3750, 6)
    expect(garrote.factors.nonCritical.damageBonus).toBe(1)
    // 同配置只把命中换成普通普攻（倍率 2，不选 M6）：+12% 生效（2240 正例）。
    const basicHit = calculateCatalogResult({
      ...m6Input(evelyn, {
        bindings: lunarBindings,
        selections: [
          { optionId: LUNAR_BASIC, bindingId: "binding:lunar", layers: 1 },
        ],
        omitItem: true,
        skillTargetIds: [],
      }),
      hit: {
        ...m6Input(evelyn, { omitItem: true, skillTargetIds: [] }).hit,
        skillCategory: "basic" as const,
      },
    })
    expect(basicHit.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    expect(basicHit.factors.nonCritical.damageBonus).toBeCloseTo(1.12, 8)
  })

  it("feeds the vortex Aftershock identity through the real follow-up gain", () => {
    const s0anby = M6_CASES[1]!
    const fuSelections: StaticCatalogDamageInput["selections"] = [
      { optionId: S0ANBY_M6, bindingId: "binding:static", layers: 1 },
      { optionId: S0ANBY_FU, bindingId: "binding:static", layers: 1 },
    ]
    // [电极化]的追加攻击增伤按潜能完整档位：0 档 25%（增伤区 1.25）；
    // 涡流的 Aftershock 身份经目标 countsAsFollowUp 自动吃到该增益。
    const potential0 = calculateCatalogResult(
      m6Input(s0anby, { selections: fuSelections, potentialLevel: 0 }),
    )
    expect(potential0.factors.nonCritical.baseDamage).toBeCloseTo(10000, 6)
    expect(potential0.factors.nonCritical.damageBonus).toBeCloseTo(1.25, 8)
    // 潜能 6 档 50%（档位沿既有选项契约）。
    const potential6 = calculateCatalogResult(
      m6Input(s0anby, { selections: fuSelections, potentialLevel: 6 }),
    )
    expect(potential6.factors.nonCritical.damageBonus).toBeCloseTo(1.5, 8)
    // 不选追加攻击增伤：增伤区保持 1。
    const alone = calculateCatalogResult(m6Input(s0anby))
    expect(alone.factors.nonCritical.damageBonus).toBe(1)
    // 白雷是特殊技身份：借用特殊技分类结算涡流被独立项分类校验拒绝。
    const borrowed = calculateStaticDamageFromCatalog(
      m6Input(s0anby, {
        skillTags: ["zzz-hp:category:special"],
      }),
    )
    expect(borrowed.ok, JSON.stringify(borrowed)).toBe(false)
    if (!borrowed.ok)
      expect(
        borrowed.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("must settle as follow-up"),
        ),
      ).toBe(true)
  })

  it("settles the Aftertone echo on Dialyn's own panel with the EX-special identity", () => {
    const dialyn = M6_CASES[2]!
    // 自身面板线性：1000 → 4800；5000 → 24000。
    for (const attack of [1000, 5000]) {
      const result = calculateCatalogResult(m6Input(dialyn, { attack }))
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(4.8 * attack, 6)
    }
    // 队友只是触发者：改变同队队友的攻击不影响本次伤害。
    const teammateWorld = (
      attack: number,
    ): StaticCatalogDamageInput["world"] => {
      const base = inputFor()
      return {
        ...base.world,
        entities: [
          ...base.world.entities.map((entity) =>
            entity.kind === "actor" && entity.entityId === base.hit.actorId
              ? {
                  ...entity,
                  generalStats: {
                    ...entity.generalStats,
                    attack: general(1000),
                  },
                }
              : entity,
          ),
          {
            kind: "actor" as const,
            entityId: "entity:teammate" as EntityId,
            teamId: "team:players",
            generalStats: { attack: general(attack) },
            directStats: {
              criticalRate: { baseValue: 0, additions: [] },
              criticalDamage: { baseValue: 0, additions: [] },
              penetrationRatio: { baseValue: 0, additions: [] },
              sharpCriticalDamage: { baseValue: 0, additions: [] },
            },
          },
        ],
      }
    }
    const withWeakTeammate = calculateCatalogResult(
      m6Input(dialyn, {
        world: teammateWorld(5000),
        actorSources: [
          { entityId: "entity:attacker", agentEntityId: "1481" },
          { entityId: "entity:teammate", agentEntityId: "1251" },
        ],
      }),
    )
    const withStrongTeammate = calculateCatalogResult(
      m6Input(dialyn, {
        world: teammateWorld(8000),
        actorSources: [
          { entityId: "entity:attacker", agentEntityId: "1481" },
          { entityId: "entity:teammate", agentEntityId: "1251" },
        ],
      }),
    )
    expect(withWeakTeammate.factors.nonCritical.baseDamage).toBeCloseTo(4800, 6)
    expect(withStrongTeammate.factors.nonCritical.baseDamage).toBeCloseTo(
      4800,
      6,
    )
    // 把余音队友伪装成面板来源：独立项必须读持有者当前属性。
    const borrowed = calculateStaticDamageFromCatalog(
      m6Input(dialyn, { statSourceEntityId: "entity:teammate" }),
    )
    expect(borrowed.ok).toBe(false)
    if (!borrowed.ok)
      expect(
        borrowed.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("bound holder's current attributes"),
        ),
      ).toBe(true)
    // 借用普攻分类结算被拒；强化特殊技分类通过（别名归一为 special）。
    const basicCategory = calculateStaticDamageFromCatalog(
      m6Input(dialyn, { skillCategory: "basic" }),
    )
    expect(basicCategory.ok).toBe(false)
    if (!basicCategory.ok)
      expect(
        basicCategory.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("must settle as"),
        ),
      ).toBe(true)
    // 声明强化特殊技大类身份（all-special 子类目标）后，真实强化特殊技
    // 四件套增伤作用于余音；不声明时不自动侵入。
    const jazzBindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:static",
        kind: "agent" as const,
        holderId: "entity:attacker",
        sourceEntityId: "1481",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
      {
        bindingId: "binding:disc",
        kind: "drive-disc" as const,
        holderId: "entity:attacker",
        sourceEntityId: "31800",
        eligible: true,
        configuration: { setPieces: 4 },
      },
    ]
    const jazzSelections: StaticCatalogDamageInput["selections"] = [
      { optionId: DIALYN_M6, bindingId: "binding:static", layers: 1 },
      {
        optionId: CHAOS_JAZZ_SPECIAL,
        bindingId: "binding:disc",
        layers: 1,
      },
    ]
    const withoutSpecialIdentity = calculateCatalogResult(
      m6Input(dialyn, {
        bindings: jazzBindings,
        selections: jazzSelections,
      }),
    )
    expect(withoutSpecialIdentity.factors.nonCritical.baseDamage).toBeCloseTo(
      4800,
      6,
    )
    expect(withoutSpecialIdentity.factors.nonCritical.damageBonus).toBe(1)
    const withSpecialIdentity = calculateCatalogResult(
      m6Input(dialyn, {
        bindings: jazzBindings,
        selections: jazzSelections,
        skillTargetIds: [dialyn.targetId, "zzz-hp:skill:all-special-ms0fcqv7"],
      }),
    )
    expect(withSpecialIdentity.factors.nonCritical.baseDamage).toBeCloseTo(
      4800,
      6,
    )
    expect(withSpecialIdentity.factors.nonCritical.damageBonus).toBeCloseTo(
      1.2,
      8,
    )
  })
})

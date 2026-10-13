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
 * 增益修复批次 14（修订 29）：星见雅（Miyabi，1091）核心被动[寒炎]
 * [霜灼·破]一次独立伤害与影画 4[皲裂]同事件增伤的具名回归。期望值全部
 * 来自冻结 Nanoka 3.2 中英文原文（对附着[冰焰]的敌人施加[霜寒]时触发
 * [霜灼·破]，造成星见雅 750/875/1000/1125/1250/1375/1500% 攻击力的烈霜
 * 伤害，按核心 1—7；影画 4 起[霜灼·破]造成的伤害提升 30%）与独立算式
 * （ATK 1000、其他乘区中性：基础 = 倍率 × ATK；M4 非暴击 = 基础 × 1.30；
 * 再叠加独立 +0.50 增伤 = 基础 × 1.80），不从生成器反推。触发已发生由
 * 调用方选中本选项并提供独立项断言：不模拟异常积蓄、冰焰/霜寒/霜灼
 * 状态机、落霜取得、10 秒触发间隔与 250 喧响值。烈霜命中按 frost 结算
 * （规则限定 hit.element=frost，非烈霜命中零贡献，不伪装 ice）。最终
 * 暴击概率由调用方以 hit.declaredCriticalRate 显式声明（无默认值、替换
 * 最终概率，r=0/1/中间值是调用方自选的条件计算假设，不是游戏结论）；
 * critical 分支沿用普通暴击伤害来源及本命中合法暴伤贡献（本文件算式
 * 使用默认来源：星见雅当前普通暴击伤害）。uncategorized 分类、独立目标、
 * 零初始倍率、逐次声明与独占结算是本项目采用的独立结算契约，不是游戏
 * 证据。影画 4[皲裂]以同变体 additionalRules 自动生效一次（M0—3 不生效、
 * 0 层关闭不再产出），不生成第二份可漏选的完整附伤。M0 终结技冰伤与
 * 额外能力冰抗忽视的 frost 覆盖来自批次 14 元素修正（两条完整身份保留
 * ice 并加入 frost），与莱特昂扬的既有 frost 覆盖互不扩大。
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

const FROSTBURN = "nanoka:agents:miyabi:frostburn-break-damage"
const FROSTBURN_DAMAGE = "agent:1091:nanoka:frostburn-break-damage:mindscape:0"
const FROSTBURN_M4 =
  "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4"
const FROSTBURN_ITEM = "miyabi:frostburn-break-damage"
const FROSTBURN_TARGET = "zzz-hp:skill:miyabi-frostburn-break-damage"
/** 固定来源既有选项（身份保持；两条元素修正的差异核验见登记用例）。 */
const MIYABI_ULT_OPTION =
  "agents:miyabi:mindscape:0:blk-legacy:legacy-self-dmgBonus"
const MIYABI_ULT_EFFECT =
  "agent:1091:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0"
const MIYABI_AA_DMG_OPTION =
  "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4msho4-rjt6sj"
const MIYABI_AA_DMG_EFFECT =
  "agent:1091:zzz-hp:eff-ms4msho4-rjt6sj:blk-ms4msho4-fuuot6:mindscape:0"
const MIYABI_RES_PEN_OPTION =
  "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4mu14z-vj4c3r"
const MIYABI_RES_PEN_EFFECT =
  "agent:1091:zzz-hp:eff-ms4mu14z-vj4c3r:blk-ms4msho4-fuuot6:mindscape:0"
const MIYABI_M1_OPTION =
  "agents:miyabi:mindscape:1:blk-legacy:legacy-self-reduceDefense"
const MIYABI_M1_EFFECT =
  "agent:1091:zzz-hp:legacy-self-reduceDefense:blk-legacy:mindscape:1"
const MIYABI_M2_DMG_OPTION =
  "agents:miyabi:mindscape:2:blk-legacy:eff-ms4mw15z-atxapn"
const MIYABI_M2_DMG_EFFECT =
  "agent:1091:zzz-hp:eff-ms4mw15z-atxapn:blk-legacy:mindscape:2"
const MIYABI_M2_CRIT_OPTION =
  "agents:miyabi:mindscape:2:blk-legacy:eff-ms4mx2vp-r5319p"
const MIYABI_M2_CRIT_EFFECT =
  "agent:1091:zzz-hp:eff-ms4mx2vp-r5319p:blk-legacy:mindscape:2"
const MIYABI_M6_OPTION =
  "agents:miyabi:mindscape:6:blk-legacy:legacy-self-skillDmgBonus"
const MIYABI_M6_EFFECT =
  "agent:1091:zzz-hp:legacy-self-skillDmgBonus:blk-legacy:mindscape:6"
/** 莱特昂扬完整状态（既有 frost 覆盖的非零元素对照，不扩大其规则）。 */
const LIGHTER_ELATION_OPTION =
  "agents:lighter:mindscape:0:elation-complete-state"
const LIGHTER_ELATION_EFFECT =
  "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0"
/** 另一来源的独立目标（本 M2）：按归属拒绝借用。 */
const BEN_M2_TARGET = "zzz-hp:skill:benbigger-block-counter-bonus-damage"
/** 触发导航：真实霜月动作（0011，frost、basic、霜月目标）。 */
const SHIMOTSUKI_ACTION = "action:agent:1091:action:0011"
const SHIMOTSUKI_TARGET = "zzz-hp:skill:miyabi-basic-ms4mtpk5"

/** 核心 1—7 的霜灼·破倍率（来源字面值，独立算式锚点）。 */
const CORE_MULTIPLIERS = [7.5, 8.75, 10, 11.25, 12.5, 13.75, 15] as const

interface FrostburnInputOverrides {
  readonly mindscapeRank?: number
  readonly coreSkillLevel?: number
  readonly layers?: number
  readonly attack?: number
  readonly defense?: number
  readonly anomalyProficiency?: number
  readonly critRate?: number
  readonly critDmg?: number
  readonly omitCriticalRateFact?: boolean
  readonly stat?: "attack" | "defense" | "impact"
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
  /** 独立增伤输入（damage 乘区的调用方侧加数）。 */
  readonly damageBonus?: readonly number[]
  /** 伤害乘区为中性时的输入（默认目标基础防御 0）。 */
  readonly actionDamageItems?: StaticCatalogDamageInput["hit"]["damageItems"]
}

function frostburnInput(
  overrides: FrostburnInputOverrides = {},
): StaticCatalogDamageInput {
  const base = inputFor()
  const items = overrides.actionDamageItems ?? [
    {
      mode: "direct" as const,
      role: overrides.role ?? ("base" as const),
      itemId: overrides.omitItem ? "base" : FROSTBURN_ITEM,
      damageMultiplier: overrides.omitItem
        ? 2
        : (overrides.damageMultiplier ?? 0),
      stat: overrides.stat ?? ("attack" as const),
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
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ]
      : []),
  ]
  const request: StaticCatalogDamageInput = {
    ...base,
    definitions,
    catalog,
    // 其余乘区全 1（目标基础防御 0）：非暴击 = 倍率 × ATK × (1 + 增伤)。
    damage: {
      ...base.damage,
      ...(overrides.damageBonus === undefined
        ? {}
        : { damageBonus: [...overrides.damageBonus] }),
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
                  anomalyProficiency: general(
                    overrides.anomalyProficiency ?? 300,
                  ),
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
          bindingId: "binding:miyabi",
          kind: "agent" as const,
          holderId: "entity:attacker",
          sourceEntityId: "1091",
          eligible: true,
          configuration: {
            mindscapeRank: (overrides.mindscapeRank ?? 6) as never,
            coreSkillLevel: (overrides.coreSkillLevel ?? 7) as never,
          },
        },
      ] as unknown as StaticCatalogDamageInput["bindings"]),
    actorSources:
      overrides.actorSources ??
      ([
        { entityId: "entity:attacker", agentEntityId: "1091" },
      ] as StaticCatalogDamageInput["actorSources"]),
    selections:
      overrides.selections ??
      ([
        {
          optionId: FROSTBURN,
          bindingId: "binding:miyabi",
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
      element: (overrides.element ?? "frost") as "frost",
      skillTags: [
        ...(base.hit.skillTags ?? []),
        ...(overrides.skillTags ?? []),
      ],
      skillTargetIds:
        overrides.skillTargetIds === undefined
          ? [FROSTBURN_TARGET]
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

describe("batch 14 Miyabi frostburn break and mindscape 4 rupture", () => {
  it("registers the independent target, option, and both rules under revision 29 beside the preserved fixed-source options", () => {
    expect(catalog.revision).toBe("32")
    const target = catalog.skillTargets.find(
      (t) => t.targetId === FROSTBURN_TARGET,
    )!
    expect(target).toMatchObject({
      upstreamId: null,
      agentEntityId: "1091",
      category: "uncategorized",
      name: "霜灼·破",
      countsAsFollowUp: false,
    })
    const option = catalog.options.find((o) => o.optionId === FROSTBURN)!
    expect(option.variants).toHaveLength(1)
    const variant = option.variants[0]!
    expect(variant.status).toBe("converted")
    expect(variant.configuration).toEqual({
      coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
    })
    expect(variant.maximumLayers).toBe(1)
    expect(variant.effectIds).toEqual([FROSTBURN_DAMAGE, FROSTBURN_M4])
    expect(variant.exclusiveDamageItem).toBe(true)
    expect(variant.damageItemRequirements).toEqual([
      {
        itemId: FROSTBURN_ITEM,
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        requiredCriticalRateDeclaration: true,
      },
    ])
    // 主规则：按核心档位取倍率；条件 = regular + 独立目标 + 烈霜元素。
    const damageRule = definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === FROSTBURN_DAMAGE,
    )!
    expect(damageRule.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: {
          1: 7.5,
          2: 8.75,
          3: 10,
          4: 11.25,
          5: 12.5,
          6: 13.75,
          7: 15,
        },
      },
    })
    expect((damageRule as { when: unknown }).when).toMatchObject({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        { kind: "one-of", fact: "hit.skillTag", values: [FROSTBURN_TARGET] },
        { kind: "one-of", fact: "hit.element", values: ["frost"] },
      ],
    })
    expect((damageRule as { operation: unknown }).operation).toMatchObject({
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: [FROSTBURN_ITEM],
    })
    // M4 规则：同事件增伤（按绑定影画档位查表：M0—3 为 0、M4—6 为 0.3，
    // 全档显式列出不缺档；不用配置门槛——那会把 M0—3 的整个选择拒绝）。
    const m4Rule = definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === FROSTBURN_M4,
    )!
    expect((m4Rule as { config: unknown }).config).toEqual({
      kind: "constant",
      value: true,
    })
    expect(m4Rule.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "mindscapeRank",
        unit: "ratio",
        values: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.3, 6: 0.3 },
      },
    })
    expect((m4Rule as { when: unknown }).when).toMatchObject({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        { kind: "one-of", fact: "hit.skillTag", values: [FROSTBURN_TARGET] },
        { kind: "one-of", fact: "hit.element", values: ["frost"] },
      ],
    })
    expect((m4Rule as { operation: unknown }).operation).toMatchObject({
      kind: "factor-contribution",
      channel: "damage-bonus",
    })
    // 既有固定来源选项身份保持：七条星见雅选项全部照常转换。
    for (const [optionId, effectId] of [
      [MIYABI_ULT_OPTION, MIYABI_ULT_EFFECT],
      [MIYABI_AA_DMG_OPTION, MIYABI_AA_DMG_EFFECT],
      [MIYABI_RES_PEN_OPTION, MIYABI_RES_PEN_EFFECT],
      [MIYABI_M1_OPTION, MIYABI_M1_EFFECT],
      [MIYABI_M2_DMG_OPTION, MIYABI_M2_DMG_EFFECT],
      [MIYABI_M2_CRIT_OPTION, MIYABI_M2_CRIT_EFFECT],
      [MIYABI_M6_OPTION, MIYABI_M6_EFFECT],
    ] as const) {
      const existing = catalog.options.find((o) => o.optionId === optionId)!
      expect(existing.variants[0]!.effectIds, optionId).toEqual([effectId])
      expect(
        definitions.effects.some(
          (e) => e.kind === "contribution" && e.effectId === effectId,
        ),
        optionId,
      ).toBe(true)
    }
    // 两条元素修正：状态 corrected、差异登记、frost 引用可见。
    const difference = catalog.differences.find(
      (d) => d.differenceId === "miyabi-frost-settlement-element-scope",
    )!
    expect(difference).toBeDefined()
    for (const optionId of [MIYABI_ULT_OPTION, MIYABI_RES_PEN_OPTION]) {
      const corrected = catalog.options.find((o) => o.optionId === optionId)!
      expect(corrected.variants[0]!.status, optionId).toBe("corrected")
      expect(corrected.variants[0]!.differences, optionId).toContainEqual(
        "miyabi-frost-settlement-element-scope",
      )
    }
    const ultRule = definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === MIYABI_ULT_EFFECT,
    )! as unknown as {
      when: { conditions: { fact?: string; values?: string[] }[] }
    }
    expect(ultRule.when.conditions).toContainEqual({
      kind: "one-of",
      fact: "hit.element",
      values: ["ice", "frost"],
    })
    const resPenRule = definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === MIYABI_RES_PEN_EFFECT,
    )! as unknown as {
      when: { conditions: { fact?: string; values?: string[] }[] }
    }
    expect(resPenRule.when.conditions).toContainEqual({
      kind: "one-of",
      fact: "hit.element",
      values: ["ice", "frost"],
    })
  })

  it.each(
    CORE_MULTIPLIERS.map((multiplier, index) => ({
      multiplier,
      core: index + 1,
    })),
  )(
    "settles the frostburn break at core $core without mindscape 4 (base $multiplier x ATK)",
    ({ multiplier, core }: { multiplier: number; core: number }) => {
      // 影画 0—3：主事件倍率一次赋值，无[皲裂]增伤。
      for (const mindscapeRank of [0, 3]) {
        const result = calculateCatalogResult(
          frostburnInput({
            mindscapeRank,
            coreSkillLevel: core as 1,
            attack: 1000,
            declaredCriticalRate: 0.25,
          }),
        )
        expect(
          result.factors.nonCritical.baseDamage,
          `M${String(mindscapeRank)}`,
        ).toBeCloseTo(multiplier * 1000, 6)
        expect(
          contributionOf(result, FROSTBURN_M4),
          `M${String(mindscapeRank)}`,
        ).toBe(0)
      }
    },
  )

  it.each(
    CORE_MULTIPLIERS.map((multiplier, index) => ({
      multiplier,
      core: index + 1,
    })),
  )(
    "settles the frostburn break at core $core with mindscape 4 rupture (x 1.30)",
    ({ multiplier, core }: { multiplier: number; core: number }) => {
      // 影画 4 起：同一事件自动 +0.30 一次（damage-bonus 通道加法）。
      for (const mindscapeRank of [4, 5, 6]) {
        const result = calculateCatalogResult(
          frostburnInput({
            mindscapeRank,
            coreSkillLevel: core as 1,
            attack: 1000,
            declaredCriticalRate: 0,
          }),
        )
        expect(
          result.factors.nonCritical.baseDamage,
          `M${String(mindscapeRank)}`,
        ).toBeCloseTo(multiplier * 1000, 6)
        expect(
          contributionOf(result, FROSTBURN_M4),
          `M${String(mindscapeRank)}`,
        ).toBeCloseTo(0.3, 8)
        expect(result.nonCritical, `M${String(mindscapeRank)}`).toBeCloseTo(
          multiplier * 1000 * 1.3,
          6,
        )
        // M4 只加一次：伤害乘区合计恰为 1 + 0.30，不随倍率或重复实例叠加。
        expect(
          result.factors.nonCritical.damageBonus,
          `M${String(mindscapeRank)}`,
        ).toBeCloseTo(1.3, 8)
      }
    },
  )

  it("adds an independent +0.50 damage bonus additively (x 1.80, not x 1.3 x 1.5)", () => {
    // 独立 +0.50 增伤与 M4 +0.30 同通道加法合并：基础 × 1.80；
    // 区别于把基础 × 1.3 再乘 1.5（= ×1.95）的乘法错读。
    const result = calculateCatalogResult(
      frostburnInput({
        mindscapeRank: 4,
        coreSkillLevel: 7,
        attack: 1000,
        declaredCriticalRate: 0,
        damageBonus: [0.5],
      }),
    )
    expect(result.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
    expect(result.nonCritical).toBeCloseTo(15000 * 1.8, 6)
  })

  it("reads the holder's current attack only (second ATK anchor; defense and AP do not enter)", () => {
    // 第二个攻击力锚点进入；防御力/异常精通不进入霜灼·破读数。
    for (const [attack, expected] of [
      [1600, 24000],
      [1000, 15000],
    ] as const) {
      const result = calculateCatalogResult(
        frostburnInput({
          mindscapeRank: 4,
          coreSkillLevel: 7,
          attack,
          defense: 900,
          anomalyProficiency: 300,
          declaredCriticalRate: 0,
        }),
      )
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(expected, 6)
      expect(result.nonCritical).toBeCloseTo(expected * 1.3, 6)
    }
    const foreignDefense = calculateCatalogResult(
      frostburnInput({
        mindscapeRank: 4,
        coreSkillLevel: 7,
        attack: 1000,
        defense: 2400,
        declaredCriticalRate: 0,
      }),
    )
    expect(foreignDefense.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
  })

  it.each([0, 0.25, 0.5, 1].map((r) => ({ label: `r=${String(r)}`, r })))(
    "settles the declared critical rate $label without reading the panel",
    ({ r }: { r: number }) => {
      // 声明 r 替换最终概率：expected = (1−r)×非暴 + r×暴；critical 分支
      // 沿用普通暴击伤害来源及本命中合法暴伤贡献，本例使用默认来源（星见雅
      // 当前普通暴击伤害，条件计算模型，非游戏实测）。面板 CR 不参与。
      for (const panelRate of [0.25, 0.75]) {
        const result = calculateCatalogResult(
          frostburnInput({
            mindscapeRank: 6,
            coreSkillLevel: 7,
            declaredCriticalRate: r,
            critRate: panelRate,
          }),
        )
        expect(result.criticalRate, `panel ${String(panelRate)}`).toBe(r)
        expect(result.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
        expect(result.critical).toBeCloseTo(29250, 6)
        expect(result.nonCritical).toBeCloseTo(19500, 6)
        expect(result.expected).toBeCloseTo((1 - r) * 19500 + r * 29250, 6)
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
    const input = frostburnInput({
      mindscapeRank: 4,
      declaredCriticalRate: 0.25,
    })
    const first = calculateCatalogResult(input)
    const second = calculateCatalogResult(input)
    expect(second.factors.nonCritical.baseDamage ?? 0).toBeCloseTo(
      first.factors.nonCritical.baseDamage ?? 0,
      9,
    )
    expect(contributionOf(second, FROSTBURN_M4)).toBeCloseTo(0.3, 8)
  })

  it("closes at zero layers without demanding the declared fact or leaking mindscape 4", () => {
    // 0 层关闭：独立项保持零倍率零贡献，声明概率不被索取，[皲裂]不再产出，
    // 暴击率保持面板值。
    const off = calculateCatalogResult(frostburnInput({ layers: 0 }))
    expect(contributionOf(off, FROSTBURN_DAMAGE)).toBe(0)
    expect(contributionOf(off, FROSTBURN_M4)).toBe(0)
    expect(off.factors.nonCritical.baseDamage).toBe(0)
    expect(off.criticalRate).toBeCloseTo(0.25, 12)
  })

  it.each([-1, 0.5, 2].map((layers) => ({ layers })))(
    "rejects illegal layers $layers",
    ({ layers }: { layers: number }) => {
      // 一次状态严格 0/1：负数、分数与 2 层都拒绝。
      const result = calculateStaticDamageFromCatalog(
        frostburnInput({ layers, declaredCriticalRate: 0.25 }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "INVALID_INPUT"),
        ).toBe(true)
    },
  )

  it.each([0].map((core) => ({ core })))(
    "rejects the invalid core level $core",
    ({ core }: { core: number }) => {
      // 核心档位全档显式列出（1—7）：0 档是绑定配置的非法档位值，按
      // INVALID_INPUT 拒绝；不存在可触发“缺档 MISSING_RANK”的中间档。
      const result = calculateStaticDamageFromCatalog(
        frostburnInput({
          coreSkillLevel: core as 1,
          declaredCriticalRate: 0.25,
        }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.message.includes("coreSkillLevel"),
          ),
        ).toBe(true)
    },
  )

  it("rejects an enabled settlement without a declared critical rate", () => {
    // 启用（layers 1、携带独立项）而未声明最终暴击概率：不默许读取星见雅
    // 面板普通暴击率充当该次独立命中的概率。
    const result = calculateStaticDamageFromCatalog(frostburnInput())
    expect(result.ok, JSON.stringify(result)).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "MISSING_FACT" &&
            issue.pointer.includes("declaredCriticalRate") &&
            issue.message.includes(FROSTBURN_ITEM),
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
      frostburnInput({ declaredCriticalRateRaw: value }),
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
    // 缺独立项：MISSING_REFERENCE（调用方须为霜灼·破单独结算）。
    expectIssue(
      frostburnInput({ ...rate, omitItem: true }),
      (issue) => issue.code.includes("MISSING_REFERENCE"),
      "missing item",
    )
    // 预填机制倍率：不能加倍。
    expectIssue(
      frostburnInput({ ...rate, damageMultiplier: 2 }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("zero multiplier"),
      "prefilled multiplier",
    )
    // 错属性：霜灼·破按星见雅攻击力缩放，防御力/冲击力拒绝。
    for (const stat of ["defense", "impact"] as const) {
      expectIssue(
        frostburnInput({ ...rate, stat }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("scales") &&
          issue.message.includes("expected"),
        `wrong stat ${stat}`,
      )
    }
    // 错角色。
    expectIssue(
      frostburnInput({ ...rate, role: "settlement" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("role settlement, expected base"),
      "wrong role",
    )
    // 读取他人当前属性 / 历史快照：holder-current 拒绝（跨持有者不串用）。
    expectIssue(
      frostburnInput({ ...rate, statSourceEntityId: "entity:enemy" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("bound holder's current attributes"),
      "foreign stat source",
    )
    expectIssue(
      frostburnInput({ ...rate, statSourceSnapshotId: "snapshot:history" }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("bound holder's current attributes"),
      "snapshot stat source",
    )
    // 借用普通动作的分类结算（霜月的 basic、连携的 chain、追加攻击）：
    // 独立项必须按 uncategorized 结算。
    for (const skillCategory of [
      "basic",
      "chain",
      "follow-up",
      "enhanced-special",
    ]) {
      expectIssue(
        frostburnInput({ ...rate, skillCategory }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("must settle as"),
        `borrowed category ${skillCategory}`,
      )
    }
    // 保留的分类标签同样参与最终有效分类校验。
    expectIssue(
      frostburnInput({ ...rate, skillTags: ["zzz-hp:category:basic"] }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("must settle as"),
      "retained category tag",
    )
    // 借用真实霜月目标（basic 分类）：目标展开 zzz-hp:category:basic 标签，
    // 与独立项的 uncategorized 分类锁冲突——按 CONTEXT_MISMATCH 拒绝，不把
    // 普通动作目标当独立结算身份。
    expectIssue(
      frostburnInput({ ...rate, skillTargetIds: [SHIMOTSUKI_TARGET] }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("must settle as"),
      "borrowed shimotsuki target",
    )
    // 另一来源的独立目标（本 M2，属代理人 1121）：星见雅命中携带该目标按
    // 归属拒绝（“目标属于另一代理人”），不把他人独立结算身份借给本事件。
    expectIssue(
      frostburnInput({ ...rate, skillTargetIds: [BEN_M2_TARGET] }),
      (issue) =>
        issue.code === "CONTEXT_MISMATCH" &&
        issue.message.includes("another agent"),
      "another agent's independent target",
    )
  })

  it("keeps the frost settlement boundary: non-frost hits contribute zero without being rejected", () => {
    // 烈霜按 frost 结算（来源明文）：声明其他元素是零贡献的真实边界，
    // 不通过伪装 hit.element=ice 绕过；主规则与[皲裂]都不作用。
    for (const element of ["ice", "physical", "fire"] as const) {
      const result = calculateCatalogResult(
        frostburnInput({
          element,
          mindscapeRank: 4,
          declaredCriticalRate: 0.25,
        }),
      )
      expect(contributionOf(result, FROSTBURN_DAMAGE), element).toBe(0)
      expect(contributionOf(result, FROSTBURN_M4), element).toBe(0)
      expect(result.factors.nonCritical.baseDamage, element).toBe(0)
    }
    // 缺目标：合法但不匹配，独立项保持零贡献。
    const missing = calculateCatalogResult(
      frostburnInput({ declaredCriticalRate: 0.25, skillTargetIds: [] }),
    )
    expect(contributionOf(missing, FROSTBURN_DAMAGE)).toBe(0)
    expect(missing.factors.nonCritical.baseDamage).toBe(0)
  })

  it("coexists with the corrected ultimate ice bonus additively on the same frost event", () => {
    // M0 终结技冰伤 +30%（批次 14 修正后覆盖 frost）与 M4[皲裂] +30% 同通道
    // 加法共存：基础 × 1.60；关闭事件（0 层）时 M0 条款不再作用于该独立项。
    const both = calculateCatalogResult(
      frostburnInput({
        mindscapeRank: 4,
        declaredCriticalRate: 0,
        selections: [
          { optionId: FROSTBURN, bindingId: "binding:miyabi", layers: 1 },
          {
            optionId: MIYABI_ULT_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
        ],
      }),
    )
    expect(contributionOf(both, MIYABI_ULT_EFFECT)).toBeCloseTo(0.3, 8)
    expect(contributionOf(both, FROSTBURN_M4)).toBeCloseTo(0.3, 8)
    expect(both.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
    expect(both.nonCritical).toBeCloseTo(15000 * 1.6, 6)
    // 事件关闭（0 层）：不索取声明概率；M0 条款作用于零倍率独立项之外
    // 也没有泄漏通道，暴击率保持面板值。
    const off = calculateCatalogResult(
      frostburnInput({
        mindscapeRank: 4,
        selections: [
          { optionId: FROSTBURN, bindingId: "binding:miyabi", layers: 0 },
          {
            optionId: MIYABI_ULT_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
        ],
      }),
    )
    expect(off.factors.nonCritical.baseDamage).toBe(0)
    expect(off.criticalRate).toBeCloseTo(0.25, 12)
  })

  it("keeps the additional-ability clauses and M1/M2/M6 outside the independent settlement", () => {
    // 额外能力的霜月 +60% 增伤与 30% 冰抗忽视保持 basic+霜月精确目标：
    // 真实霜月 frost 动作非零（修正后），uncategorized 独立事件不适用；
    // M1 减防、M2 普攻/闪反增伤、M6 霜月增伤同理不借目标污染；M2 实体
    // 暴率不擅自改变声明 r。
    const allEnabled = calculateCatalogResult(
      frostburnInput({
        mindscapeRank: 6,
        declaredCriticalRate: 0.25,
        selections: [
          { optionId: FROSTBURN, bindingId: "binding:miyabi", layers: 1 },
          {
            optionId: MIYABI_AA_DMG_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
          {
            optionId: MIYABI_RES_PEN_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
          {
            optionId: MIYABI_M1_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
          {
            optionId: MIYABI_M2_DMG_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
          {
            optionId: MIYABI_M2_CRIT_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
          {
            optionId: MIYABI_M6_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
        ],
      }),
    )
    expect(contributionOf(allEnabled, MIYABI_AA_DMG_EFFECT)).toBe(0)
    expect(contributionOf(allEnabled, MIYABI_RES_PEN_EFFECT)).toBe(0)
    expect(contributionOf(allEnabled, MIYABI_M1_EFFECT)).toBe(0)
    expect(contributionOf(allEnabled, MIYABI_M2_DMG_EFFECT)).toBe(0)
    expect(contributionOf(allEnabled, MIYABI_M6_EFFECT)).toBe(0)
    // 霜灼·破本体照常：基础 15000 × (1 + 0.3[皲裂]) = 19500。
    expect(allEnabled.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
    expect(allEnabled.nonCritical).toBeCloseTo(19500, 6)
    // M2 实体暴率不参与声明概率：最终概率仍是声明值。
    expect(allEnabled.criticalRate).toBe(0.25)
    expect(
      allEnabled.evaluation.contributions.some(
        (contribution) =>
          contribution.origin.effectId === MIYABI_M2_CRIT_EFFECT &&
          contribution.address.kind === "stat" &&
          contribution.address.stat === "criticalRate",
      ),
    ).toBe(false)
  })

  it("settles the additional-ability clauses non-zero on the real Shimotsuki frost action after the correction", () => {
    // 修正的直接收益：真实霜月动作（0011，frost、basic、霜月目标）吃到
    // 霜月 +60% 增伤与 30% 冰抗忽视（修正前两条 ice-only 规则在 frost 命中
    // 上零贡献）；莱特昂扬的既有 frost 覆盖作为非零元素对照，不扩大其规则。
    const actionHit = {
      ...frostburnInput({ layers: 0 }).hit,
      actionId: SHIMOTSUKI_ACTION,
      skillCategory: "basic" as const,
      element: "frost" as const,
      skillTargetIds: [SHIMOTSUKI_TARGET],
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "action:agent:1091:action:0011:base",
          damageMultiplier: 1.2,
          stat: "attack" as const,
          statSource: { entityId: "entity:attacker" as const },
        },
      ],
    } as unknown as StaticCatalogDamageInput["hit"]
    const corrected = calculateCatalogResult({
      ...frostburnInput({
        layers: 0,
        selections: [
          { optionId: FROSTBURN, bindingId: "binding:miyabi", layers: 0 },
          {
            optionId: MIYABI_AA_DMG_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
          {
            optionId: MIYABI_RES_PEN_OPTION,
            bindingId: "binding:miyabi",
            layers: 1,
          },
        ],
      }),
      hit: actionHit,
    })
    expect(corrected.factors.nonCritical.baseDamage).toBeCloseTo(1200, 6)
    expect(contributionOf(corrected, MIYABI_AA_DMG_EFFECT)).toBeCloseTo(0.6, 8)
    expect(contributionOf(corrected, MIYABI_RES_PEN_EFFECT)).toBeCloseTo(0.3, 8)
    // 事件关闭下霜灼·破规则不作用（不自动派生）。
    expect(contributionOf(corrected, FROSTBURN_DAMAGE)).toBe(0)
    expect(contributionOf(corrected, FROSTBURN_M4)).toBe(0)
  })

  it("reuses the existing Lighter elation frost coverage as a non-zero element control", () => {
    // 莱特昂扬完整状态的命中元素条件已显式覆盖 frost（既有覆盖，不扩大）：
    // 同一 frost 独立事件下昂扬贡献非零，证明修正后的元素条件按命中枚举
    // 正常消费，不需要把 frost 归并为 ice。
    const elationVariant = catalog.options.find(
      (o) => o.optionId === LIGHTER_ELATION_OPTION,
    )!.variants[0]!
    const impactInputName = elationVariant.inputs[0]!.name
    const lighter: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: "entity:attacker" as const,
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
          entityId: "entity:lighter" as const,
          teamId: "team:players",
          generalStats: { impact: general(170) },
          directStats: {},
        },
        {
          kind: "actor" as const,
          entityId: "entity:enemy" as const,
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
    }
    const result = calculateCatalogResult({
      ...frostburnInput({
        mindscapeRank: 4,
        declaredCriticalRate: 0,
        world: lighter,
        bindings: [
          {
            bindingId: "binding:miyabi",
            kind: "agent" as const,
            holderId: "entity:attacker",
            sourceEntityId: "1091",
            eligible: true,
            configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
          } as never,
          {
            bindingId: "binding:lighter",
            kind: "agent" as const,
            holderId: "entity:lighter",
            sourceEntityId: "1161",
            eligible: true,
            configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
          } as never,
        ],
        selections: [
          { optionId: FROSTBURN, bindingId: "binding:miyabi", layers: 1 },
          {
            optionId: LIGHTER_ELATION_OPTION,
            bindingId: "binding:lighter",
            layers: 5,
          },
        ],
        actorSources: [
          { entityId: "entity:attacker", agentEntityId: "1091" },
          { entityId: "entity:lighter", agentEntityId: "1161" },
        ] as never,
      }),
      inputs: [
        {
          bindingId: "binding:lighter",
          name: impactInputName,
          value: { unit: "impact-points" as const, value: 170 },
        },
      ] as never,
    })
    expect(contributionOf(result, LIGHTER_ELATION_EFFECT)).toBeCloseTo(
      0.0625,
      8,
    )
    // 霜灼·破本体照常（昂扬不影响独立项倍率）：15000 × (0.3 + 0.0625 + 1)。
    expect(result.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
    expect(result.nonCritical).toBeCloseTo(15000 * 1.3625, 6)
  })

  it("keeps the real Shimotsuki action free of the independent damage while the option stays usable", () => {
    // 真实霜月动作（0011，frost、basic、霜月目标）不经本选项自动派生独立
    // 项：启用中请求独立项在场（MISSING_REFERENCE 要求单独结算），关闭
    //（0 层）时动作段完全不受影响。
    const actionHit = {
      ...frostburnInput({ layers: 1 }).hit,
      actionId: SHIMOTSUKI_ACTION,
      skillCategory: "basic" as const,
      element: "frost" as const,
      skillTargetIds: [SHIMOTSUKI_TARGET],
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "action:agent:1091:action:0011:base",
          damageMultiplier: 1.2,
          stat: "attack" as const,
          statSource: { entityId: "entity:attacker" as const },
        },
      ],
    } as unknown as StaticCatalogDamageInput["hit"]
    const rejected = calculateStaticDamageFromCatalog({
      ...frostburnInput({ layers: 1, declaredCriticalRate: 0.25 }),
      hit: actionHit,
    })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(
        rejected.issues.some(
          (issue) =>
            issue.code.includes("MISSING_REFERENCE") &&
            issue.message.includes(FROSTBURN_ITEM),
        ),
      ).toBe(true)
    const off = calculateCatalogResult({
      ...frostburnInput({ layers: 0 }),
      hit: actionHit,
    })
    expect(contributionOf(off, FROSTBURN_DAMAGE)).toBe(0)
    expect(contributionOf(off, FROSTBURN_M4)).toBe(0)
    expect(off.factors.nonCritical.baseDamage).toBeCloseTo(1200, 6)
  })

  it("settles each Miyabi instance separately with the other binding closed", () => {
    // 两名星见雅同场（同实体 1091 的两个绑定）：同一独立项不能同时读取
    // 两名持有者的当前属性，各归各结算（另一绑定 0 层关闭）；同时启用被
    // holder-current/声明归属拒绝，不串用面板。
    const miyabiA = "entity:miyabi-a" as EntityId
    const miyabiB = "entity:miyabi-b" as EntityId
    const world: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: miyabiA,
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
          entityId: miyabiB,
          teamId: "team:players",
          generalStats: { attack: general(1600), defense: general(900) },
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
        bindingId: "binding:miyabi-a",
        kind: "agent" as const,
        holderId: miyabiA,
        sourceEntityId: "1091",
        eligible: true,
        configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
      } as unknown as StaticCatalogDamageInput["bindings"][number],
      {
        bindingId: "binding:miyabi-b",
        kind: "agent" as const,
        holderId: miyabiB,
        sourceEntityId: "1091",
        eligible: true,
        configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
      } as unknown as StaticCatalogDamageInput["bindings"][number],
    ]
    const actorSources: StaticCatalogDamageInput["actorSources"] = [
      { entityId: miyabiA, agentEntityId: "1091" },
      { entityId: miyabiB, agentEntityId: "1091" },
    ]
    const hitFor = (actorId: EntityId) => ({
      ...frostburnInput({ declaredCriticalRate: 0.25 }).hit,
      actorId,
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: FROSTBURN_ITEM,
          damageMultiplier: 0,
          stat: "attack" as const,
          statSource: { entityId: actorId },
        },
      ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    })
    const damage = frostburnInput().damage
    // 星见雅 A（ATK 1000）单独结算：15000 × 1.3 = 19500。
    const a = calculateCatalogResult({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: FROSTBURN, bindingId: "binding:miyabi-a", layers: 1 },
        { optionId: FROSTBURN, bindingId: "binding:miyabi-b", layers: 0 },
      ],
      hit: hitFor(miyabiA),
    })
    expect(a.factors.nonCritical.baseDamage).toBeCloseTo(15000, 6)
    expect(a.nonCritical).toBeCloseTo(19500, 6)
    expect(a.criticalRate).toBe(0.25)
    // 星见雅 B（ATK 1600）单独结算：24000 × 1.3 = 31200（各读各的当前攻击力）。
    const b = calculateCatalogResult({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: FROSTBURN, bindingId: "binding:miyabi-a", layers: 0 },
        { optionId: FROSTBURN, bindingId: "binding:miyabi-b", layers: 1 },
      ],
      hit: hitFor(miyabiB),
    })
    expect(b.factors.nonCritical.baseDamage).toBeCloseTo(24000, 6)
    expect(b.nonCritical).toBeCloseTo(31200, 6)
    // 同时启用：结算 A 的项时另一绑定不串用（holder-current/声明归属拒绝）。
    const bothOpen = calculateStaticDamageFromCatalog({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: FROSTBURN, bindingId: "binding:miyabi-a", layers: 1 },
        { optionId: FROSTBURN, bindingId: "binding:miyabi-b", layers: 1 },
      ],
      hit: hitFor(miyabiA),
    })
    expect(bothOpen.ok).toBe(false)
    if (!bothOpen.ok)
      expect(
        bothOpen.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
    // 跨持有者读取：A 的绑定启用、独立项读 B 的当前属性——拒绝。
    const crossHolder = calculateStaticDamageFromCatalog({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      damage,
      selections: [
        { optionId: FROSTBURN, bindingId: "binding:miyabi-a", layers: 1 },
        { optionId: FROSTBURN, bindingId: "binding:miyabi-b", layers: 0 },
      ],
      hit: {
        ...hitFor(miyabiA),
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: FROSTBURN_ITEM,
            damageMultiplier: 0,
            stat: "attack" as const,
            statSource: { entityId: miyabiB },
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

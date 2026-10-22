import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import type {
  EntityId,
  RefinementRank,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 增益修复批次 12（修订 27）：比格气缸受击附伤与加农转子暴击附伤的具名
 * 回归。期望值全部来自冻结 Nanoka 3.2 天赋原文（中英文交叉核对）与独立
 * 算式（600/690/780/870/960% × 装备者当前防御力；200% × 装备者当前攻击力），
 * 不从生成器反推。触发事实（受击后的下一次攻击命中 / 触发攻击暴击）由调用
 * 方显式声明并结算一次，冷却与次数上限不模拟。比格气缸“必定触发暴击”按
 * 中文语法只作用于附伤独立命中（hit 作用域暴击率 +1.0，见补充登记的
 * verification）；加农转子附伤按引擎既有直伤契约参与暴击期望。两音擎附伤
 * 元素来源未标注：规则不按元素筛选，元素由调用方声明——uncategorized 分类、
 * 独立目标、零初始倍率与逐次声明是本项目采用的独立结算契约，不是游戏证据。
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

const BIG_CYLINDER = "nanoka:w-engines:13112:retaliation-defense-damage"
const BIG_CYLINDER_DAMAGE = "w-engine:13112:nanoka:retaliation-defense-damage"
const BIG_CYLINDER_CRIT =
  "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical"
const CANNON_ROTOR = "nanoka:w-engines:14001:critical-hit-bonus-damage"
const CANNON_ROTOR_DAMAGE = "w-engine:14001:nanoka:critical-hit-bonus-damage"
const CANNON_ROTOR_ATK =
  "w-engines:Cannon_Rotor:refinement:blk-legacy:legacy-self-inCombatAtkPercent"
const BIG_CYLINDER_TARGET = "zzz-hp:skill:big-cylinder-retaliation"
const CANNON_ROTOR_TARGET = "zzz-hp:skill:cannon-rotor-bonus-damage"
/** 比格气缸防护职业持有者（凯撒 1071）；加农转子强攻职业持有者（伊芙琳 1321）。 */
const DEFENSE_HOLDER = { engine: "13112", agent: "1071" }
const ATTACK_HOLDER = { engine: "14001", agent: "1321" }
const BIG_CYLINDER_MULTIPLIERS = [6, 6.9, 7.8, 8.7, 9.6] as const
const CANNON_ROTOR_MULTIPLIER = 2

interface EngineCase {
  readonly engineEntityId: string
  readonly agentEntityId: string
  readonly optionId: string
  readonly damageEffectId: string
  readonly critEffectId: string | null
  readonly itemId: string
  readonly targetId: string
  readonly stat: "defense" | "attack"
}
const ENGINE_CASES: readonly EngineCase[] = [
  {
    engineEntityId: DEFENSE_HOLDER.engine,
    agentEntityId: DEFENSE_HOLDER.agent,
    optionId: BIG_CYLINDER,
    damageEffectId: BIG_CYLINDER_DAMAGE,
    critEffectId: BIG_CYLINDER_CRIT,
    itemId: "big-cylinder:retaliation",
    targetId: BIG_CYLINDER_TARGET,
    stat: "defense",
  },
  {
    engineEntityId: ATTACK_HOLDER.engine,
    agentEntityId: ATTACK_HOLDER.agent,
    optionId: CANNON_ROTOR,
    damageEffectId: CANNON_ROTOR_DAMAGE,
    critEffectId: null,
    itemId: "cannon-rotor:bonus-damage",
    targetId: CANNON_ROTOR_TARGET,
    stat: "attack",
  },
]

function engineInput(
  engine: EngineCase,
  overrides: {
    holderAgentEntityId?: string
    refinement?: RefinementRank
    layers?: number
    statValue?: number
    stat?: "attack" | "defense" | "impact"
    role?: "base" | "settlement"
    damageMultiplier?: number
    statSourceEntityId?: string
    statSourceSnapshotId?: string
    omitItem?: boolean
    skillCategory?: string
    skillTags?: readonly string[]
    skillTargetIds?: readonly string[]
    element?: string
    critRate?: number
    critDmg?: number
    declaredCriticalRate?: number
    selections?: StaticCatalogDamageInput["selections"]
  } = {},
): StaticCatalogDamageInput {
  const base = inputFor()
  const refinement = overrides.refinement ?? 1
  const holderAgent = overrides.holderAgentEntityId ?? engine.agentEntityId
  const independentItem = {
    mode: "direct" as const,
    role: overrides.role ?? ("base" as const),
    itemId: engine.itemId,
    damageMultiplier: overrides.damageMultiplier ?? 0,
    stat: overrides.stat ?? engine.stat,
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
    world: {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === base.hit.actorId
          ? {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                attack: general(1000),
                defense: general(900),
                ...(overrides.statValue === undefined
                  ? {}
                  : {
                      [engine.stat === "defense" ? "defense" : "attack"]:
                        general(overrides.statValue),
                    }),
              },
              directStats: {
                ...entity.directStats,
                criticalRate: {
                  baseValue: overrides.critRate ?? 0.25,
                  additions: [],
                },
                criticalDamage: {
                  baseValue: overrides.critDmg ?? 0.5,
                  additions: [],
                },
              },
            }
          : entity,
      ),
    },
    bindings: [
      {
        bindingId: "binding:engine",
        kind: "w-engine" as const,
        holderId: "entity:attacker",
        sourceEntityId: engine.engineEntityId,
        eligible: true,
        configuration: { refinement },
      },
    ],
    actorSources: [{ entityId: "entity:attacker", agentEntityId: holderAgent }],
    selections: overrides.selections ?? [
      {
        optionId: engine.optionId,
        bindingId: "binding:engine",
        layers: overrides.layers ?? 1,
      },
    ],
    hit: {
      ...base.hit,
      ...(overrides.declaredCriticalRate === undefined
        ? {}
        : { declaredCriticalRate: overrides.declaredCriticalRate }),
      actorId: base.hit.actorId as "entity:attacker",
      targetId: base.hit.targetId,
      skillCategory: (overrides.skillCategory ??
        "uncategorized") as "uncategorized",
      element: (overrides.element ?? "physical") as "physical",
      skillTargetIds:
        overrides.skillTargetIds === undefined
          ? [engine.targetId]
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

describe("batch 12 w-engine additional damage", () => {
  it("registers the two independent targets, options, and rules under revision 27", () => {
    expect(catalog.revision).toBe("49")
    for (const engine of ENGINE_CASES) {
      const target = catalog.skillTargets.find(
        (t) => t.targetId === engine.targetId,
      )!
      // 音擎附伤目标不属于任何固定代理人：任意适配职业的装备者都可能是
      // 命中角色，agentEntityId 为 null，不参与“目标属于另一代理人”校验。
      expect(target, engine.targetId).toMatchObject({
        upstreamId: null,
        agentEntityId: null,
        category: "uncategorized",
        countsAsFollowUp: false,
      })
      const option = catalog.options.find(
        (o) => o.optionId === engine.optionId,
      )!
      expect(option.variants).toHaveLength(1)
      const variant = option.variants[0]!
      expect(variant.status).toBe("converted")
      expect(variant.configuration).toEqual({ refinements: [1, 2, 3, 4, 5] })
      expect(variant.maximumLayers).toBe(1)
      expect(variant.inputs).toEqual([])
      // 比格气缸独占（命中级必暴卷入全部伤害项）；加农转子独占且唯一要求
      // 项声明最终暴击概率（无默认、替换语义）。
      if (engine.optionId === BIG_CYLINDER) {
        expect(variant.exclusiveDamageItem).toBe(true)
        expect(variant.damageItemRequirements).toEqual([
          {
            itemId: engine.itemId,
            stat: engine.stat,
            role: "base",
            allowedModes: ["direct"],
            source: "holder-current",
            requiredDirectMultiplier: 0,
            requiredSkillCategory: "uncategorized",
          },
        ])
      } else {
        expect(variant.exclusiveDamageItem).toBe(true)
        expect(variant.damageItemRequirements).toEqual([
          {
            itemId: engine.itemId,
            stat: engine.stat,
            role: "base",
            allowedModes: ["direct"],
            source: "holder-current",
            requiredDirectMultiplier: 0,
            requiredSkillCategory: "uncategorized",
            requiredCriticalRateDeclaration: true,
          },
        ])
      }
      expect(variant.references.map((r) => r.pointer)).toEqual(
        ([1, 2, 3, 4, 5] as const).map(
          (tier) => `/talents/${String(tier)}/desc`,
        ),
      )
      expect(variant.effectIds).toEqual(
        engine.critEffectId === null
          ? [engine.damageEffectId]
          : [engine.damageEffectId, engine.critEffectId],
      )
      const damageRule = definitions.effects.find(
        (e) => e.effectId === engine.damageEffectId,
      )!
      expect(damageRule.kind).toBe("contribution")
      if (damageRule.kind !== "contribution") throw new Error("unreachable")
      expect(damageRule.scope).toBe("hit")
      expect(damageRule.operation).toEqual({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [engine.itemId],
        value: { kind: "parameter", unit: "multiplier", name: "amount" },
      })
      // 独立命中条件：声明目标与 regular 直伤种类；来源未标注元素，规则不
      // 按元素筛选，元素由调用方在 hit.element 声明。
      expect(damageRule.when).toEqual({
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: [engine.targetId],
          },
        ],
      })
    }
    // 比格气缸：五档倍率 6.0—9.6 × 装备者防御力。
    expect(
      definitions.effects.find((e) => e.effectId === BIG_CYLINDER_DAMAGE)!
        .kind === "contribution" &&
        (
          definitions.effects.find(
            (e) => e.effectId === BIG_CYLINDER_DAMAGE,
          )! as { parameters: unknown }
        ).parameters,
    ).toEqual({
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "multiplier",
        values: { 1: 6, 2: 6.9, 3: 7.8, 4: 8.7, 5: 9.6 },
      },
    })
    // 加农转子：五档同值 2.0 × 装备者攻击力。
    expect(
      (
        definitions.effects.find(
          (e) => e.effectId === CANNON_ROTOR_DAMAGE,
        )! as { parameters: unknown }
      ).parameters,
    ).toEqual({
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "multiplier",
        values: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
      },
    })
    // 比格气缸必定暴击：来源保证最终概率为 1，只随独立目标
    // 参与求值（窄解释：不作用于触发招式整段，见补充登记 verification）。
    const critRule = definitions.effects.find(
      (e) => e.effectId === BIG_CYLINDER_CRIT,
    )!
    expect(critRule.kind).toBe("contribution")
    if (critRule.kind !== "contribution") throw new Error("unreachable")
    expect(critRule.scope).toBe("hit")
    expect(critRule.operation).toEqual({
      kind: "guaranteed-critical",
      itemId: "big-cylinder:retaliation",
    })
    expect(critRule.when).toEqual({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: [BIG_CYLINDER_TARGET],
        },
      ],
    })
  })

  // 五精炼 × 两面板锚点（800/1200）× 两音擎的独立算式矩阵：逐组合命名，
  // 可按引擎/精炼档/面板锚点定位。期望值 = 冻结倍率 × 装备者当前属性，
  // 不从生成器反推。
  const SETTLEMENT_ANCHORS = [800, 1200] as const
  interface SettlementCase {
    readonly label: string
    readonly engine: EngineCase
    readonly refinement: RefinementRank
    readonly statValue: number
    readonly multiplier: number
  }
  const SETTLEMENT_CASES: readonly SettlementCase[] = ENGINE_CASES.flatMap(
    (engine) =>
      ([1, 2, 3, 4, 5] as const).flatMap((refinement, index) =>
        SETTLEMENT_ANCHORS.map((statValue) => ({
          label: `${engine.optionId} R${String(refinement)} ${engine.stat} ${String(statValue)}`,
          engine,
          refinement,
          statValue,
          multiplier:
            engine.optionId === BIG_CYLINDER
              ? BIG_CYLINDER_MULTIPLIERS[index]!
              : CANNON_ROTOR_MULTIPLIER,
        })),
      ),
  )
  it.each(SETTLEMENT_CASES)(
    "settles $label once per declared hit at the per-refinement multiplier",
    ({ engine, refinement, statValue, multiplier }) => {
      const result = calculateCatalogResult(
        engineInput(engine, {
          refinement,
          statValue,
          // 加农转子显式声明最终暴击概率（r=0.25）；倍率与基础区独立算式
          // 不因概率声明改变。
          ...(engine.optionId === CANNON_ROTOR
            ? { declaredCriticalRate: 0.25 }
            : {}),
        }),
      )
      expect(contributionOf(result, engine.damageEffectId)).toBeCloseTo(
        multiplier,
        8,
      )
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(
        multiplier * statValue,
        6,
      )
    },
  )

  it.each(ENGINE_CASES)(
    "$optionId repeat queries do not accumulate",
    (engine) => {
      const declaredCriticalRate =
        engine.optionId === CANNON_ROTOR ? { declaredCriticalRate: 0.25 } : {}
      const input = engineInput(engine, declaredCriticalRate)
      const first = calculateCatalogResult(input)
      const second = calculateCatalogResult(input)
      expect(second.factors.nonCritical.baseDamage ?? 0).toBeCloseTo(
        first.factors.nonCritical.baseDamage ?? 0,
        9,
      )
    },
  )

  it.each(ENGINE_CASES)("$optionId closes at zero layers", (engine) => {
    // 0 层关闭：独立项保持零倍率零贡献，暴击通道不参与（基础暴击率保持）。
    const off = calculateCatalogResult(engineInput(engine, { layers: 0 }))
    expect(contributionOf(off, engine.damageEffectId)).toBe(0)
    expect(off.factors.nonCritical.baseDamage).toBe(0)
    expect(off.criticalRate).toBeCloseTo(0.25, 12)
  })

  it.each(ENGINE_CASES)("rejects illegal layers for $optionId", (engine) => {
    for (const layers of [-1, 0.5, 2] as const) {
      const result = calculateStaticDamageFromCatalog(
        engineInput(engine, { layers }),
      )
      expect(result.ok, `layers ${String(layers)}`).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "INVALID_INPUT"),
          `layers ${String(layers)}`,
        ).toBe(true)
    }
  })

  it.each(ENGINE_CASES)(
    "rejects refinement ranks outside 1-5 for $optionId",
    (engine) => {
      // 精炼档 0/6 是非法档位值：绑定配置校验直接拒绝。
      for (const refinement of [0, 6] as const) {
        const result = calculateStaticDamageFromCatalog(
          engineInput(engine, { refinement: refinement as 1 }),
        )
        expect(result.ok, `refinement ${String(refinement)}`).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some(
              (issue) =>
                issue.code === "INVALID_INPUT" &&
                issue.pointer.endsWith("/configuration/refinement"),
            ),
            `refinement ${String(refinement)}`,
          ).toBe(true)
      }
    },
  )

  it("applies the guaranteed critical only to the big cylinder independent hit", () => {
    const engine = ENGINE_CASES[0]!
    // 持有者基础暴击率 0.25：附伤结算的最终暴击率钳制为 1，期望与暴击值一致。
    for (const critRate of [0, 0.25, 0.9]) {
      const result = calculateCatalogResult(
        engineInput(engine, { critRate, statValue: 800, refinement: 1 }),
      )
      expect(result.criticalRate, `critRate ${String(critRate)}`).toBe(1)
      expect(result.critical).not.toBeNull()
      expect(result.expected).toBeCloseTo(result.critical!, 9)
      expect(
        contributionOf(result, BIG_CYLINDER_CRIT),
        `critRate ${String(critRate)}`,
      ).toBeCloseTo(1, 8)
      expect(result.factors.nonCritical.baseDamage).toBeCloseTo(6 * 800, 6)
    }
    // 0 层关闭时暴击通道不参与（普通暴击率保持 0.25）。
    const off = calculateCatalogResult(engineInput(engine, { layers: 0 }))
    expect(contributionOf(off, BIG_CYLINDER_CRIT)).toBe(0)
    expect(off.criticalRate).toBeCloseTo(0.25, 12)
    // 加农转子：无必暴规则，最终暴击率由调用方显式声明（无默认值）；
    // 未声明的拒绝行为见 pr12-critical-rate-declaration.test.ts。
    const rotor = ENGINE_CASES[1]!
    const rotorResult = calculateCatalogResult(
      engineInput(rotor, { declaredCriticalRate: 0.25 }),
    )
    expect(contributionOf(rotorResult, BIG_CYLINDER_CRIT)).toBe(0)
    expect(rotorResult.criticalRate).toBeCloseTo(0.25, 12)
  })

  it("settles the cannon rotor bonus damage at the declared probability", () => {
    const engine = ENGINE_CASES[1]!
    // 声明 r 替换最终概率：期望 = (1−r)×非暴 + r×暴；critical 分支沿用
    // 普通暴击伤害（条件计算模型，非游戏实测）。声明契约的完整矩阵见
    // pr12-critical-rate-declaration.test.ts。
    const result = calculateCatalogResult(
      engineInput(engine, {
        statValue: 1000,
        critRate: 0.75,
        critDmg: 0.5,
        declaredCriticalRate: 0.25,
      }),
    )
    expect(result.criticalRate).toBeCloseTo(0.25, 12)
    expect(result.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    expect(result.expected).toBeCloseTo(
      0.75 * result.nonCritical + 0.25 * result.critical!,
      9,
    )
    // r=0 时期望退化为非暴值。
    const zero = calculateCatalogResult(
      engineInput(engine, { critRate: 0.25, declaredCriticalRate: 0 }),
    )
    expect(zero.expected).toBeCloseTo(zero.nonCritical, 9)
  })

  it("does not filter the independent items by element; the caller declares it", () => {
    // 来源未标注附伤元素：同一声明目标在任一声明元素下都得到同一倍率贡献
    // （抗性/元素增伤乘区消费的是调用方声明的元素，不来自本规则）。
    const declaredFor = (engine: EngineCase) =>
      engine.optionId === CANNON_ROTOR
        ? { declaredCriticalRate: 0.25 }
        : ({} as { declaredCriticalRate?: number })
    for (const engine of ENGINE_CASES) {
      const physical = calculateCatalogResult(
        engineInput(engine, {
          element: "physical",
          statValue: 800,
          ...declaredFor(engine),
        }),
      )
      const electric = calculateCatalogResult(
        engineInput(engine, {
          element: "electric",
          statValue: 800,
          ...declaredFor(engine),
        }),
      )
      expect(
        contributionOf(electric, engine.damageEffectId),
        engine.optionId,
      ).toBeCloseTo(contributionOf(physical, engine.damageEffectId), 8)
      // 声明元素参与抗性乘区：本用例目标抗性为 0，两个元素的基础区一致。
      expect(electric.factors.nonCritical.baseDamage).toBeCloseTo(
        physical.factors.nonCritical.baseDamage ?? 0,
        6,
      )
      // 缺目标：合法但不匹配，独立项保持零贡献。
      const missing = calculateCatalogResult(
        engineInput(engine, { skillTargetIds: [], ...declaredFor(engine) }),
      )
      expect(contributionOf(missing, engine.damageEffectId)).toBe(0)
      expect(missing.factors.nonCritical.baseDamage).toBe(0)
    }
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
    for (const engine of ENGINE_CASES) {
      const label = engine.optionId
      // 缺独立项：MISSING_REFERENCE。
      expectIssue(
        engineInput(engine, { omitItem: true }),
        (issue) => issue.code.includes("MISSING_REFERENCE"),
        `${label} missing item`,
      )
      // 预填机制倍率：不能加倍。
      expectIssue(
        engineInput(engine, { damageMultiplier: 2 }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("zero multiplier"),
        `${label} prefilled multiplier`,
      )
      // 错属性（比格气缸防御缩放 / 加农转子攻击缩放互换）。
      expectIssue(
        engineInput(engine, {
          stat: engine.stat === "defense" ? "attack" : "defense",
        }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("scales") &&
          issue.message.includes("expected"),
        `${label} wrong stat`,
      )
      // 错角色。
      expectIssue(
        engineInput(engine, { role: "settlement" }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("role settlement, expected base"),
        `${label} wrong role`,
      )
      // 读取他人当前属性 / 历史快照：holder-current 拒绝。
      expectIssue(
        engineInput(engine, { statSourceEntityId: "entity:enemy" }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("bound holder's current attributes"),
        `${label} foreign stat source`,
      )
      expectIssue(
        engineInput(engine, { statSourceSnapshotId: "snapshot:history" }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("bound holder's current attributes"),
        `${label} snapshot stat source`,
      )
      // 借用其他分类结算（普攻）：独立项必须按 uncategorized 结算。
      expectIssue(
        engineInput(engine, { skillCategory: "basic" }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("must settle as"),
        `${label} borrowed category`,
      )
      // 保留的分类标签同样参与最终有效分类校验。
      expectIssue(
        engineInput(engine, { skillTags: ["zzz-hp:category:basic"] }),
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.message.includes("must settle as"),
        `${label} retained category tag`,
      )
      // 另一音擎的独立目标：两个目标都真实登记（无 MISSING_REFERENCE），
      // 但规则按目标身份匹配——本音擎规则不作用，独立项保持零贡献。
      const otherTarget = calculateCatalogResult(
        engineInput(engine, {
          ...(engine.optionId === CANNON_ROTOR
            ? { declaredCriticalRate: 0.25 }
            : {}),
          skillTargetIds: [
            engine.targetId === BIG_CYLINDER_TARGET
              ? CANNON_ROTOR_TARGET
              : BIG_CYLINDER_TARGET,
          ],
          ...(engine.optionId === CANNON_ROTOR
            ? { declaredCriticalRate: 0.25 }
            : {}),
        }),
      )
      expect(
        contributionOf(otherTarget, engine.damageEffectId),
        `${label} other engine target`,
      ).toBe(0)
      expect(
        otherTarget.factors.nonCritical.baseDamage,
        `${label} other engine target`,
      ).toBe(0)
    }
  })

  it("keeps profession-ineligible holders at zero contribution", () => {
    // 比格气缸（防护）由强攻职业装备、加农转子（强攻）由防护职业装备：
    // 独立项仍按契约校验，但两条规则都不贡献（既有目录职业门槛语义）。
    const mismatched = [
      [
        ENGINE_CASES[0]!,
        ATTACK_HOLDER.agent,
        BIG_CYLINDER_DAMAGE,
        BIG_CYLINDER_CRIT,
      ],
      [
        ENGINE_CASES[1]!,
        DEFENSE_HOLDER.agent,
        CANNON_ROTOR_DAMAGE,
        null as unknown as string,
      ],
    ] as const
    for (const [engine, agent, damageEffectId, critEffectId] of mismatched) {
      const result = calculateCatalogResult(
        engineInput(engine, {
          holderAgentEntityId: agent,
          statValue: 800,
        }),
      )
      expect(
        contributionOf(result, damageEffectId as string),
        engine.optionId,
      ).toBe(0)
      expect(result.factors.nonCritical.baseDamage).toBe(0)
      if (typeof critEffectId === "string") {
        expect(contributionOf(result, critEffectId)).toBe(0)
        expect(result.criticalRate).toBeCloseTo(0.25, 12)
      }
    }
  })

  it("does not pollute normal actions or the other binding", () => {
    const engine = ENGINE_CASES[0]!
    // 普通动作请求（普攻分类、普通伤害项、未携带独立目标）：启用中的附伤
    // 选项要求独立项在场（MISSING_REFERENCE），调用方按契约为其单独结算；
    // 关闭（0 层）时普通动作完全不受影响，暴击率保持基础值。
    const normalAction = {
      ...engineInput(engine, {
        skillCategory: "basic",
        skillTargetIds: [],
        layers: 1,
      }),
      hit: {
        ...engineInput(engine).hit,
        skillCategory: "basic" as const,
        skillTargetIds: [],
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "attack",
            damageMultiplier: 2,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    }
    const rejected = calculateStaticDamageFromCatalog(normalAction)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(
        rejected.issues.some(
          (issue) =>
            issue.code.includes("MISSING_REFERENCE") &&
            issue.message.includes(engine.itemId),
        ),
      ).toBe(true)
    const normalOff = calculateStaticDamageFromCatalog({
      ...normalAction,
      selections: [
        { optionId: engine.optionId, bindingId: "binding:engine", layers: 0 },
      ],
    })
    expect(normalOff.ok).toBe(true)
    if (normalOff.ok) {
      expect(contributionOf(normalOff.value, BIG_CYLINDER_DAMAGE)).toBe(0)
      expect(normalOff.value.factors.nonCritical.baseDamage).toBeCloseTo(
        2000,
        6,
      )
      expect(normalOff.value.criticalRate).toBeCloseTo(0.25, 12)
    }

    // 两名持有者同场（凯撒持比格气缸、伊芙琳持加农转子）：各自结算各归各，
    // 另一绑定关闭；同请求启用两个附伤选项会因缺另一独立项被拒绝。
    const twoHolderWorld: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: "entity:caesar" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000), defense: general(800) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
            sharpCriticalDamage: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:evelyn" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000), defense: general(800) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
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
        bindingId: "binding:big-cylinder",
        kind: "w-engine" as const,
        holderId: "entity:caesar",
        sourceEntityId: "13112",
        eligible: true,
        configuration: { refinement: 1 },
      },
      {
        bindingId: "binding:cannon-rotor",
        kind: "w-engine" as const,
        holderId: "entity:evelyn",
        sourceEntityId: "14001",
        eligible: true,
        configuration: { refinement: 1 },
      },
    ]
    const bothActorSources: StaticCatalogDamageInput["actorSources"] = [
      { entityId: "entity:caesar", agentEntityId: "1071" },
      { entityId: "entity:evelyn", agentEntityId: "1321" },
    ]
    const cylinderSettlement = calculateCatalogResult({
      ...engineInput(ENGINE_CASES[0]!, { statValue: 800 }),
      world: {
        ...twoHolderWorld,
        entities: twoHolderWorld.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId === "entity:caesar"
            ? {
                ...entity,
                generalStats: { ...entity.generalStats, defense: general(800) },
              }
            : entity,
        ),
      },
      bindings: bothBindings,
      actorSources: bothActorSources,
      hit: {
        ...engineInput(ENGINE_CASES[0]!, { statValue: 800 }).hit,
        actorId: "entity:caesar",
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "big-cylinder:retaliation",
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:caesar" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
      selections: [
        {
          optionId: BIG_CYLINDER,
          bindingId: "binding:big-cylinder",
          layers: 1,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:cannon-rotor",
          layers: 0,
        },
      ],
    })
    expect(
      contributionOf(cylinderSettlement, BIG_CYLINDER_DAMAGE, "entity:caesar"),
    ).toBeCloseTo(6, 8)
    expect(cylinderSettlement.factors.nonCritical.baseDamage).toBeCloseTo(
      4800,
      6,
    )
    expect(cylinderSettlement.criticalRate).toBe(1)
    const rotorSettlement = calculateCatalogResult({
      ...engineInput(ENGINE_CASES[1]!, {
        statValue: 1000,
        declaredCriticalRate: 0.25,
      }),
      world: twoHolderWorld,
      bindings: bothBindings,
      actorSources: bothActorSources,
      hit: {
        ...engineInput(ENGINE_CASES[1]!, {
          statValue: 1000,
          declaredCriticalRate: 0.25,
        }).hit,
        actorId: "entity:evelyn",
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            stat: "attack" as const,
            statSource: { entityId: "entity:evelyn" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
      selections: [
        {
          optionId: BIG_CYLINDER,
          bindingId: "binding:big-cylinder",
          layers: 0,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:cannon-rotor",
          layers: 1,
        },
      ],
    })
    expect(
      contributionOf(rotorSettlement, CANNON_ROTOR_DAMAGE, "entity:evelyn"),
    ).toBeCloseTo(2, 8)
    expect(rotorSettlement.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    // 加农转子结算不吃比格气缸的必暴通道（另一绑定关闭）。
    expect(rotorSettlement.criticalRate).toBeCloseTo(0.25, 12)
    // 同一请求启用两个附伤选项：另一独立项缺场被拒绝，调用方按契约分开结算。
    const bothEnabled = calculateStaticDamageFromCatalog({
      ...rotorSettlementInput(),
      world: twoHolderWorld,
      bindings: bothBindings,
      actorSources: bothActorSources,
      selections: [
        {
          optionId: BIG_CYLINDER,
          bindingId: "binding:big-cylinder",
          layers: 1,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:cannon-rotor",
          layers: 1,
        },
      ],
    })
    expect(bothEnabled.ok).toBe(false)
    if (!bothEnabled.ok)
      expect(
        bothEnabled.issues.some(
          (issue) =>
            issue.code.includes("MISSING_REFERENCE") &&
            issue.message.includes("big-cylinder:retaliation"),
        ),
      ).toBe(true)
    // 同一音擎两名合法强攻持有者（伊芙琳与零号·安比）各持完整绑定、同时
    // 启用：同一独立项不能同时读取两名持有者的当前属性，绑定隔离按
    // holder-current 拒绝第二个选择，不串用面板；先验证合法对照（单一启用）。
    const twoRotorHoldersWorld: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: "entity:evelyn" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000), defense: general(800) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
            sharpCriticalDamage: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:s0anby" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000), defense: general(800) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
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
    const twoRotorBindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:rotor-evelyn",
        kind: "w-engine" as const,
        holderId: "entity:evelyn",
        sourceEntityId: "14001",
        eligible: true,
        configuration: { refinement: 1 },
      },
      {
        bindingId: "binding:rotor-s0anby",
        kind: "w-engine" as const,
        holderId: "entity:s0anby",
        sourceEntityId: "14001",
        eligible: true,
        configuration: { refinement: 1 },
      },
    ]
    const twoRotorActorSources: StaticCatalogDamageInput["actorSources"] = [
      { entityId: "entity:evelyn", agentEntityId: "1321" },
      { entityId: "entity:s0anby", agentEntityId: "1381" },
    ]
    const rotorHitForEvelyn = {
      actorId: "entity:evelyn" as EntityId,
      targetId: rotorSettlementInput().hit.targetId,
      actionId: rotorSettlementInput().hit.actionId,
      skillCategory: "uncategorized" as const,
      element: "physical" as const,
      skillTags: [],
      declaredCriticalRate: 0.25,
      skillTargetIds: [CANNON_ROTOR_TARGET],
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "cannon-rotor:bonus-damage",
          damageMultiplier: 0,
          stat: "attack" as const,
          statSource: { entityId: "entity:evelyn" },
        },
      ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    }
    const singleEnabled = calculateCatalogResult({
      ...rotorSettlementInput(),
      world: twoRotorHoldersWorld,
      bindings: twoRotorBindings,
      actorSources: twoRotorActorSources,
      hit: rotorHitForEvelyn,
      selections: [
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-evelyn",
          layers: 1,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-s0anby",
          layers: 0,
        },
      ],
    })
    expect(
      contributionOf(singleEnabled, CANNON_ROTOR_DAMAGE, "entity:evelyn"),
    ).toBeCloseTo(2, 8)
    expect(singleEnabled.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    const duplicateHolder = calculateStaticDamageFromCatalog({
      ...rotorSettlementInput(),
      world: twoRotorHoldersWorld,
      bindings: twoRotorBindings,
      actorSources: twoRotorActorSources,
      hit: rotorHitForEvelyn,
      selections: [
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-evelyn",
          layers: 1,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-s0anby",
          layers: 1,
        },
      ],
    })
    expect(duplicateHolder.ok).toBe(false)
    if (!duplicateHolder.ok)
      expect(
        duplicateHolder.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("bound holder's current attributes"),
        ),
      ).toBe(true)
  })

  /** 加农转子独立结算请求的本地构造（两持有者用例复用；显式声明概率）。 */
  function rotorSettlementInput(): StaticCatalogDamageInput {
    return engineInput(ENGINE_CASES[1]!, {
      statValue: 1000,
      declaredCriticalRate: 0.25,
    })
  }

  it("rejects mixed requests when the big cylinder option demands its sole damage item", () => {
    const engine = ENGINE_CASES[0]!
    const bcInput = (critRate: number) =>
      engineInput(engine, { statValue: 800, critRate, refinement: 1 })
    // 独立算式对照：比格气缸单独结算 800×6×1.5 = 7200；另一 ATK×2 项单独
    // 结算 1000×2×(1+0.25×0.5) = 2250；合计 9450。混合请求使另一项也被
    // 强制暴击（10200，多出 750），必须被独占约束明确拒绝。
    const mixedItems = (extraMultiplier: number) =>
      [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "big-cylinder:retaliation",
          damageMultiplier: 0,
          stat: "defense" as const,
          statSource: { entityId: "entity:attacker" },
        },
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "other:bonus",
          damageMultiplier: extraMultiplier,
          stat: "attack" as const,
          statSource: { entityId: "entity:attacker" },
        },
      ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"]
    for (const [label, extraMultiplier] of [
      ["non-zero item", 2],
      ["zero-multiplier item", 0],
    ] as const) {
      const mixed = {
        ...bcInput(0.25),
        hit: { ...bcInput(0.25).hit, damageItems: mixedItems(extraMultiplier) },
      }
      const result = calculateStaticDamageFromCatalog(mixed)
      expect(result.ok, label).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("big-cylinder:retaliation") &&
              issue.message.includes("sole"),
          ),
          label,
        ).toBe(true)
    }
    // 另一来源的独立项同样不允许混合。
    const foreignItem = {
      ...bcInput(0.25),
      hit: {
        ...bcInput(0.25).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "big-cylinder:retaliation",
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:attacker" },
          },
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    }
    const foreign = calculateStaticDamageFromCatalog(foreignItem)
    expect(foreign.ok).toBe(false)
    if (!foreign.ok)
      expect(
        foreign.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" && issue.message.includes("sole"),
        ),
      ).toBe(true)
    // 0 层关闭：不施加独占要求，普通多项非零请求保持公开契约。
    const off: StaticCatalogDamageInput = {
      ...bcInput(0.25),
      selections: [
        { optionId: BIG_CYLINDER, bindingId: "binding:engine", layers: 0 },
      ],
      hit: { ...bcInput(0.25).hit, damageItems: mixedItems(2) },
    }
    const offResult = calculateCatalogResult(off)
    expect(offResult.criticalRate).toBeCloseTo(0.25, 12)
    expect(offResult.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    expect(offResult.expected).toBeCloseTo(
      0.75 * offResult.nonCritical + 0.25 * offResult.critical!,
      9,
    )
    // 未声明独占的普通多项公开契约由既有 PR09 等回归保持；本批两项附伤
    // 选项均独占。加农转子混合额外项（即使带声明）同样被独占拒绝。
    const rotor = ENGINE_CASES[1]!
    const rotorMixed = {
      ...engineInput(rotor, {
        statValue: 1000,
        refinement: 1,
        declaredCriticalRate: 0.25,
      }),
      hit: {
        ...engineInput(rotor, {
          statValue: 1000,
          refinement: 1,
          declaredCriticalRate: 0.25,
        }).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "other:bonus",
            damageMultiplier: 2,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    }
    const rotorMixedResult = calculateStaticDamageFromCatalog(rotorMixed)
    expect(rotorMixedResult.ok).toBe(false)
    if (!rotorMixedResult.ok)
      expect(
        rotorMixedResult.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("sole damage item"),
        ),
      ).toBe(true)
  })

  it("rejects invalid exclusive damage item declarations at the definition stage", () => {
    const mutatedCatalog = (
      mutate: (value: StaticEffectCatalog) => void,
    ): StaticEffectCatalog => {
      const clone = structuredClone(catalog)
      mutate(clone)
      return clone
    }
    // 正常登记先通过：比格气缸声明独占且恰好一个伤害项要求。
    const validated = validateStaticCatalog(catalog, definitions)
    expect(validated.ok, JSON.stringify(validated)).toBe(true)
    // 非字面量 true。
    const nonLiteral = mutatedCatalog((clone) => {
      const option = clone.options.find((o) => o.optionId === BIG_CYLINDER)!
      ;(
        option.variants[0] as { exclusiveDamageItem?: unknown }
      ).exclusiveDamageItem = "yes"
    })
    const nonLiteralResult = validateStaticCatalog(nonLiteral, definitions)
    expect(nonLiteralResult.ok).toBe(false)
    if (!nonLiteralResult.ok)
      expect(
        nonLiteralResult.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" &&
            issue.pointer.endsWith("/exclusiveDamageItem"),
        ),
      ).toBe(true)
    // 声明独占但移除伤害项要求（零要求）。
    const noRequirements = mutatedCatalog((clone) => {
      const option = clone.options.find((o) => o.optionId === BIG_CYLINDER)!
      ;(
        option.variants[0] as { damageItemRequirements?: unknown }
      ).damageItemRequirements = []
    })
    const noRequirementsResult = validateStaticCatalog(
      noRequirements,
      definitions,
    )
    expect(noRequirementsResult.ok).toBe(false)
    if (!noRequirementsResult.ok)
      expect(
        noRequirementsResult.issues.some(
          (issue) =>
            issue.code === "INVALID_DEFINITION" &&
            issue.pointer.endsWith("/exclusiveDamageItem"),
        ),
      ).toBe(true)
    // 声明独占但登记两个伤害项要求。
    const twoRequirements = mutatedCatalog((clone) => {
      const option = clone.options.find((o) => o.optionId === BIG_CYLINDER)!
      const variant = option.variants[0] as {
        damageItemRequirements?: readonly unknown[]
      }
      ;(
        variant as { damageItemRequirements?: unknown[] }
      ).damageItemRequirements = [
        ...variant.damageItemRequirements!,
        {
          ...variant.damageItemRequirements![0]!,
          itemId: "big-cylinder:other",
        },
      ]
    })
    const twoRequirementsResult = validateStaticCatalog(
      twoRequirements,
      definitions,
    )
    expect(twoRequirementsResult.ok).toBe(false)
    if (!twoRequirementsResult.ok)
      expect(
        twoRequirementsResult.issues.some(
          (issue) =>
            issue.code === "INVALID_DEFINITION" &&
            issue.pointer.endsWith("/exclusiveDamageItem"),
        ),
      ).toBe(true)
  })

  it("keeps the cannon rotor resident attack option independent and coexisting", () => {
    const engine = ENGINE_CASES[1]!
    // 常驻攻击力选项保持既有公开 ID 与数值（R2 +8.6%），与附伤选项同选时
    // 各贡献一次：附伤读取包含常驻增益后的当前攻击力（1000 → 1086）。
    const legacy = calculateCatalogResult({
      ...engineInput(engine, {
        refinement: 2,
        statValue: 1000,
        layers: 0,
        declaredCriticalRate: 0.25,
      }),
      selections: [
        {
          optionId: CANNON_ROTOR_ATK,
          bindingId: "binding:engine",
          layers: 1,
        },
      ],
      hit: {
        ...engineInput(engine).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "attack",
            damageMultiplier: 2,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    // 常驻选项单独结算（未选附伤，普通 uncategorized 命中亦可）：当前攻击
    // 1086 × 倍率 2 = 2172。
    expect(legacy.factors.nonCritical.baseDamage).toBeCloseTo(2172, 6)
    const both = calculateCatalogResult({
      ...engineInput(engine, {
        refinement: 2,
        statValue: 1000,
        declaredCriticalRate: 0.25,
      }),
      selections: [
        { optionId: CANNON_ROTOR, bindingId: "binding:engine", layers: 1 },
        {
          optionId: CANNON_ROTOR_ATK,
          bindingId: "binding:engine",
          layers: 1,
        },
      ],
    })
    expect(contributionOf(both, CANNON_ROTOR_DAMAGE)).toBeCloseTo(2, 8)
    expect(both.factors.nonCritical.baseDamage).toBeCloseTo(2172, 6)
  })
})

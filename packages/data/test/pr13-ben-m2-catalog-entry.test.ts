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

/**
 * PR13 修复回归：完整正式制品经 data 装载与 core 目录公共入口消费本
 * （Ben，1121）影画 2[以守为攻]格挡反击附伤。数值锚点（3 × 本当前防御力）
 * 沿用目录级回归（pr13-ben-m2-block-counter.test.ts）的独立算式；本文件
 * 验证真实发布制品的装载与消费路径一致，并确认真实动作解析不自动派生
 * 附伤独立项（完整动作入口不自动追加，附伤只能经目录独立请求显式结算，
 * 特殊技/强化特殊技的主动攻击、追加攻击与格挡追击段均不经本选项）：全部
 * 已发布动作逐身份解析成功并明确分类为伤害行或失衡行，伤害结构非空，
 * 0013—0018 六行逐身份锁定，两条格挡反击触发路径与其余段落区分保持。
 * 比格气缸共存复用同一装载：同一装备/世界下的两次独立请求各得正确的
 * 防御力倍率与暴击语义。
 */
const BEN_M2 = "nanoka:agents:benbigger:m2-block-counter-defense-damage"
const BIG_CYLINDER = "nanoka:w-engines:13112:retaliation-defense-damage"
const BEN_M2_TARGET = "zzz-hp:skill:benbigger-block-counter-bonus-damage"
const BIG_CYLINDER_TARGET = "zzz-hp:skill:big-cylinder-retaliation"
const BEN_M2_ITEM = "benbigger:block-counter-bonus-damage"
const BIG_CYLINDER_ITEM = "big-cylinder:retaliation"
const ITEM_IDS = new Set([BEN_M2_ITEM, BIG_CYLINDER_ITEM])
const TARGET_IDS = new Set([BEN_M2_TARGET, BIG_CYLINDER_TARGET])

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["Ben"],
    wEngines: ["Big Cylinder"],
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

function settlementInput(options: {
  readonly optionIds: readonly { optionId: string; layers: number }[]
  readonly itemId: string
  readonly targetId: string
  readonly stat: "defense" | "attack"
  readonly statValue: number
  /** 本 M2 附伤的最终暴击概率（无默认值，显式声明）。 */
  readonly declaredCriticalRate?: number
}): StaticCatalogDamageInput {
  return {
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:holder",
          teamId: "team:players",
          generalStats: {
            attack: general(
              options.stat === "attack" ? options.statValue : 1000,
            ),
            defense: general(
              options.stat === "defense" ? options.statValue : 900,
            ),
            health: general(24000),
            impact: general(170),
          },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
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
    bindings: [
      {
        bindingId: "binding:ben",
        kind: "agent",
        holderId: "entity:holder",
        sourceEntityId: "1121",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
      {
        bindingId: "binding:engine",
        kind: "w-engine",
        holderId: "entity:holder",
        sourceEntityId: "13112",
        eligible: true,
        configuration: { refinement: 1 },
      },
    ],
    actorSources: [{ entityId: "entity:holder", agentEntityId: "1121" }],
    selections: options.optionIds.map((selection) => ({
      optionId: selection.optionId,
      bindingId:
        selection.optionId === BEN_M2 ? "binding:ben" : "binding:engine",
      layers: selection.layers,
    })),
    hit: {
      actorId: "entity:holder",
      targetId: "entity:enemy",
      actionId: "action:ben-m2-settlement",
      skillCategory: "uncategorized",
      element: "physical",
      skillTags: [],
      ...(options.declaredCriticalRate === undefined
        ? {}
        : { declaredCriticalRate: options.declaredCriticalRate }),
      skillTargetIds: [options.targetId],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: options.itemId,
          damageMultiplier: 0,
          stat: options.stat,
          statSource: { entityId: "entity:holder" },
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
  } as unknown as StaticCatalogDamageInput
}

describe("batch 13 Ben M2 block counter additional damage through the published data package", () => {
  it("consumes the independent settlement via the catalog entry and coexists with the big cylinder", async () => {
    const calculationData = await data()
    expect(calculationData.agents.map((a) => a.attributes.entityId)).toContain(
      "1121",
    )
    expect(calculationData.wEngines.map((e) => e.entityId)).toContain("13112")
    const definitions = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    expect(definitions.ok, JSON.stringify(definitions)).toBe(true)
    if (!definitions.ok) throw new Error(JSON.stringify(definitions.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("42")
    expect(catalog.skillTargets.some((t) => t.targetId === BEN_M2_TARGET)).toBe(
      true,
    )
    expect(catalog.options.some((o) => o.optionId === BEN_M2)).toBe(true)

    // 本 M2 附伤（比格气缸关闭）：3 × 本当前防御力 1200 = 3600；最终暴击
    // 概率由调用方显式声明（r=0.25），critical 分支沿用普通暴击伤害来源及
    // 本命中合法暴伤贡献，本例使用默认来源（本当前普通暴击伤害，条件计算
    // 模型，非游戏实测）。
    const m2 = calculateStaticDamageFromCatalog({
      ...settlementInput({
        optionIds: [
          { optionId: BEN_M2, layers: 1 },
          { optionId: BIG_CYLINDER, layers: 0 },
        ],
        itemId: BEN_M2_ITEM,
        targetId: BEN_M2_TARGET,
        stat: "defense",
        statValue: 1200,
        declaredCriticalRate: 0.25,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(m2.ok, JSON.stringify(m2)).toBe(true)
    if (!m2.ok) throw new Error(JSON.stringify(m2.issues))
    expect(m2.value.factors.nonCritical.baseDamage).toBeCloseTo(3600, 6)
    expect(m2.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(m2.value.expected).toBeCloseTo(
      0.75 * m2.value.nonCritical + 0.25 * m2.value.critical!,
      9,
    )

    // 比格气缸受击附伤（本 M2 关闭，同一装备/世界下的另一次独立请求）：
    // R1 6 × 装备者当前防御力 1200 = 7200，附伤独立命中必暴。
    const cylinder = calculateStaticDamageFromCatalog({
      ...settlementInput({
        optionIds: [
          { optionId: BEN_M2, layers: 0 },
          { optionId: BIG_CYLINDER, layers: 1 },
        ],
        itemId: BIG_CYLINDER_ITEM,
        targetId: BIG_CYLINDER_TARGET,
        stat: "defense",
        statValue: 1200,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(cylinder.ok, JSON.stringify(cylinder)).toBe(true)
    if (!cylinder.ok) throw new Error(JSON.stringify(cylinder.issues))
    expect(cylinder.value.factors.nonCritical.baseDamage).toBeCloseTo(7200, 6)
    expect(cylinder.value.criticalRate).toBe(1)
    expect(cylinder.value.expected).toBeCloseTo(cylinder.value.critical!, 9)

    // 混合请求：同一命中携带两个独立项被独占契约明确拒绝，不把两项塞进
    // 同一命中，也不让必暴污染本 M2 的声明概率。
    const mixedRequest = {
      ...settlementInput({
        optionIds: [
          { optionId: BEN_M2, layers: 1 },
          { optionId: BIG_CYLINDER, layers: 0 },
        ],
        itemId: BEN_M2_ITEM,
        targetId: BEN_M2_TARGET,
        stat: "defense",
        statValue: 1200,
        declaredCriticalRate: 0.25,
      }),
      definitions: definitions.value,
      catalog,
      hit: {
        ...settlementInput({
          optionIds: [],
          itemId: BEN_M2_ITEM,
          targetId: BEN_M2_TARGET,
          stat: "defense",
          statValue: 1200,
        }).hit,
        skillTargetIds: [BEN_M2_TARGET, BIG_CYLINDER_TARGET],
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BEN_M2_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:holder" },
          },
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: BIG_CYLINDER_ITEM,
            damageMultiplier: 0,
            stat: "defense" as const,
            statSource: { entityId: "entity:holder" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    }
    const mixedResult = calculateStaticDamageFromCatalog(mixedRequest)
    expect(mixedResult.ok).toBe(false)
    if (!mixedResult.ok)
      expect(
        mixedResult.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("sole damage item"),
        ),
      ).toBe(true)
  })

  it("resolves every published Ben action with an explicit computability classification", async () => {
    const calculationData = await data()
    const fullLevels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
    }
    const ben = calculationData.agents.find(
      (entry) => entry.attributes.entityId === "1121",
    )!
    expect(ben.actions.actions).toHaveLength(18)
    // 本目录当前的可计算性分类：15 个伤害行（含 0013—0018 的特殊技/强化
    // 特殊技六行）与 0002—0004 三个招架支援失衡行（daze-only）。不静默
    // 跳过任何动作：解析失败、空伤害结构、自动附伤项或未分类 kind 都直接
    // 失败；未来新增不可计算动作必须先在此明确分类，不能用跳过掩盖故障。
    const damageRows: string[] = []
    const dazeOnlyRows: string[] = []
    for (const action of ben.actions.actions) {
      const resolved = resolveAgentAction({
        agent: ben.actions,
        actionId: action.actionId,
        mindscapeRank: 6,
        levels: fullLevels,
      })
      expect(resolved.ok, action.actionId).toBe(true)
      if (!resolved.ok)
        throw new Error(
          `${action.actionId} failed to resolve: ${JSON.stringify(resolved.issues)}`,
        )
      if (resolved.calculation.kind === "damage") {
        expect(
          resolved.calculation.segments.length,
          `${action.actionId} segments`,
        ).toBeGreaterThan(0)
        for (const [
          index,
          segment,
        ] of resolved.calculation.segments.entries()) {
          expect(
            segment.damageItems.length,
            `${action.actionId} segment ${String(index)} damageItems`,
          ).toBeGreaterThan(0)
          for (const item of segment.damageItems)
            expect(
              ITEM_IDS.has(item.itemId),
              `${action.actionId} auto-derives ${item.itemId}`,
            ).toBe(false)
        }
        for (const id of resolved.skillTargetIds)
          expect(
            TARGET_IDS.has(id),
            `${action.actionId} carries the independent target ${id}`,
          ).toBe(false)
        damageRows.push(action.actionId)
      } else if (resolved.calculation.kind === "daze-only") {
        dazeOnlyRows.push(action.actionId)
      } else {
        throw new Error(
          `${action.actionId} resolves to an unclassified calculation kind: ${resolved.calculation.kind}`,
        )
      }
    }
    expect(damageRows.toSorted()).toEqual([
      "action:agent:1121:action:0001",
      "action:agent:1121:action:0005",
      "action:agent:1121:action:0006",
      "action:agent:1121:action:0007",
      "action:agent:1121:action:0008",
      "action:agent:1121:action:0009",
      "action:agent:1121:action:0010",
      "action:agent:1121:action:0011",
      "action:agent:1121:action:0012",
      "action:agent:1121:action:0013",
      "action:agent:1121:action:0014",
      "action:agent:1121:action:0015",
      "action:agent:1121:action:0016",
      "action:agent:1121:action:0017",
      "action:agent:1121:action:0018",
    ])
    expect(dazeOnlyRows.toSorted()).toEqual([
      "action:agent:1121:action:0002",
      "action:agent:1121:action:0003",
      "action:agent:1121:action:0004",
    ])
  })

  it.each([
    {
      actionId: "action:agent:1121:action:0013",
      label: "special active attack row (0013)",
    },
    {
      actionId: "action:agent:1121:action:0014",
      label: "special block counter row (0014, M2 trigger path)",
    },
    {
      actionId: "action:agent:1121:action:0015",
      label: "enhanced-special active attack row (0015)",
    },
    {
      actionId: "action:agent:1121:action:0016",
      label: "enhanced-special additional attack row (0016)",
    },
    {
      actionId: "action:agent:1121:action:0017",
      label: "enhanced-special block counter row (0017, M2 trigger path)",
    },
    {
      actionId: "action:agent:1121:action:0018",
      label: "enhanced-special block pursuit row (0018)",
    },
  ])(
    "$label resolves a non-empty damage structure without the additional damage",
    async ({ actionId }) => {
      // 逐身份锁定特殊技/强化特殊技六行：两条格挡反击触发路径与其余
      // 主动/追加/追击段都正常解析为非空伤害结构，且都不自动携带附伤
      // 独立项或独立目标——附伤只能经目录独立请求显式结算。
      const calculationData = await data()
      const ben = calculationData.agents.find(
        (entry) => entry.attributes.entityId === "1121",
      )!
      const resolved = resolveAgentAction({
        agent: ben.actions,
        actionId,
        mindscapeRank: 6,
        levels: {
          basic: { mode: "trained" as const, value: 12 },
          special: { mode: "trained" as const, value: 12 },
          dodge: { mode: "trained" as const, value: 12 },
          assist: { mode: "trained" as const, value: 12 },
          chain: { mode: "trained" as const, value: 12 },
        },
      })
      expect(resolved.ok, actionId).toBe(true)
      if (!resolved.ok)
        throw new Error(
          `${actionId} failed to resolve: ${JSON.stringify(resolved.issues)}`,
        )
      expect(resolved.calculation.kind, actionId).toBe("damage")
      if (resolved.calculation.kind !== "damage")
        throw new Error(`${actionId} is not a damage row`)
      expect(resolved.calculation.segments.length).toBeGreaterThan(0)
      for (const [index, segment] of resolved.calculation.segments.entries()) {
        expect(
          segment.damageItems.length,
          `${actionId} segment ${String(index)} damageItems`,
        ).toBeGreaterThan(0)
        for (const item of segment.damageItems)
          expect(
            ITEM_IDS.has(item.itemId),
            `${actionId} auto-derives ${item.itemId}`,
          ).toBe(false)
      }
      expect(
        resolved.skillTargetIds.some((id) => TARGET_IDS.has(id)),
        actionId,
      ).toBe(false)
    },
  )
})

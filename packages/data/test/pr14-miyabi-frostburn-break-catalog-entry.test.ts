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
 * PR14 修复回归：完整正式制品经 data 装载与 core 目录公共入口消费星见雅
 * （Miyabi，1091）核心被动[寒炎][霜灼·破]一次独立伤害与影画 4[皲裂]同事件
 * 增伤。数值锚点（750%—1500% × 星见雅当前攻击力；M4 × 1.30；独立 +0.50
 * 增伤 × 1.80）沿用目录级回归（pr14-miyabi-frostburn-break.test.ts）的
 * 独立算式；本文件验证真实发布制品的装载与消费路径一致，并确认真实动作
 * 解析不自动派生独立项（完整动作入口不自动追加，霜灼·破只能经目录独立
 * 请求显式结算）：全部已发布动作逐身份解析成功并明确分类为伤害行或失衡
 * 行，伤害结构非空，霜月（0011—0013）与普通 frost 路径逐身份锁定，两条
 * 元素修正（终结技冰伤 +30% 与霜月 30% 冰抗忽视）在真实 frost 命中上
 * 非零、对 uncategorized 独立事件不泄漏。
 */
const FROSTBURN = "nanoka:agents:miyabi:frostburn-break-damage"
const FROSTBURN_DAMAGE = "agent:1091:nanoka:frostburn-break-damage:mindscape:0"
const FROSTBURN_M4 =
  "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4"
const FROSTBURN_TARGET = "zzz-hp:skill:miyabi-frostburn-break-damage"
const FROSTBURN_ITEM = "miyabi:frostburn-break-damage"
const MIYABI_ULT_OPTION =
  "agents:miyabi:mindscape:0:blk-legacy:legacy-self-dmgBonus"
const MIYABI_ULT_EFFECT =
  "agent:1091:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0"
const MIYABI_RES_PEN_OPTION =
  "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4mu14z-vj4c3r"
const MIYABI_RES_PEN_EFFECT =
  "agent:1091:zzz-hp:eff-ms4mu14z-vj4c3r:blk-ms4msho4-fuuot6:mindscape:0"
const ITEM_IDS = new Set([FROSTBURN_ITEM])
const TARGET_IDS = new Set([FROSTBURN_TARGET])

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["Miyabi"],
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

function settlementInput(options: {
  readonly optionIds: readonly { optionId: string; layers: number }[]
  readonly itemId: string
  readonly targetId: string
  readonly statValue: number
  readonly stat?: "attack" | "defense"
  readonly damageBonus?: readonly number[]
  /** 霜灼·破独立命中的最终暴击概率（无默认值，显式声明）。 */
  readonly declaredCriticalRate?: number
  readonly element?: "frost" | "ice"
  readonly skillCategory?: string
  readonly skillTargetIds?: readonly string[]
  readonly damageItems?: StaticCatalogDamageInput["hit"]["damageItems"]
}): StaticCatalogDamageInput {
  return {
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:holder",
          teamId: "team:players",
          generalStats: {
            attack: general(options.statValue),
            defense: general(900),
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
        bindingId: "binding:miyabi",
        kind: "agent",
        holderId: "entity:holder",
        sourceEntityId: "1091",
        eligible: true,
        configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
      },
    ],
    actorSources: [{ entityId: "entity:holder", agentEntityId: "1091" }],
    selections: options.optionIds.map((selection) => ({
      optionId: selection.optionId,
      bindingId: "binding:miyabi",
      layers: selection.layers,
    })),
    hit: {
      actorId: "entity:holder",
      targetId: "entity:enemy",
      actionId: "action:miyabi-frostburn-settlement",
      skillCategory: (options.skillCategory ??
        "uncategorized") as "uncategorized",
      element: (options.element ?? "frost") as "frost",
      skillTags: [],
      ...(options.declaredCriticalRate === undefined
        ? {}
        : { declaredCriticalRate: options.declaredCriticalRate }),
      skillTargetIds:
        options.skillTargetIds === undefined
          ? [options.targetId]
          : [...options.skillTargetIds],
      damageItems: options.damageItems ?? [
        {
          mode: "direct",
          role: "base",
          itemId: options.itemId,
          damageMultiplier: 0,
          stat: options.stat ?? "attack",
          statSource: { entityId: "entity:holder" },
        },
      ],
    },
    damage: {
      kind: "regular",
      ...(options.damageBonus === undefined
        ? { damageBonus: [] }
        : { damageBonus: [...options.damageBonus] }),
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

const contributionOf = (
  result: Extract<
    ReturnType<typeof calculateStaticDamageFromCatalog>,
    { ok: true }
  >["value"],
  effectId: string,
): number =>
  [
    ...result.evaluation.contributions,
    ...(result.preparations ?? []).flatMap((p) => p.contributions),
  ]
    .filter((c) => c.origin.effectId === effectId)
    .reduce((sum, c) => sum + c.value.value, 0)

describe("batch 14 Miyabi frostburn break through the published data package", () => {
  it("consumes the independent settlement via the catalog entry with the mindscape 4 rupture and element corrections", async () => {
    const calculationData = await data()
    expect(calculationData.agents.map((a) => a.attributes.entityId)).toContain(
      "1091",
    )
    const definitions = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    expect(definitions.ok, JSON.stringify(definitions)).toBe(true)
    if (!definitions.ok) throw new Error(JSON.stringify(definitions.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("31")
    expect(
      catalog.skillTargets.some((t) => t.targetId === FROSTBURN_TARGET),
    ).toBe(true)
    expect(catalog.options.some((o) => o.optionId === FROSTBURN)).toBe(true)
    expect(
      catalog.differences.some(
        (d) => d.differenceId === "miyabi-frost-settlement-element-scope",
      ),
    ).toBe(true)

    // 霜灼·破独立结算（核心 7、影画 4、ATK 1200）：基础 18000、[皲裂]
    // ×1.30 = 23400；最终暴击概率由调用方显式声明（r=0.25），critical 分支
    // 沿用普通暴击伤害来源及本命中合法暴伤贡献（默认来源，条件计算模型）。
    const settle = calculateStaticDamageFromCatalog({
      ...settlementInput({
        optionIds: [{ optionId: FROSTBURN, layers: 1 }],
        itemId: FROSTBURN_ITEM,
        targetId: FROSTBURN_TARGET,
        statValue: 1200,
        declaredCriticalRate: 0.25,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(settle.ok, JSON.stringify(settle)).toBe(true)
    if (!settle.ok) throw new Error(JSON.stringify(settle.issues))
    expect(settle.value.factors.nonCritical.baseDamage).toBeCloseTo(18000, 6)
    expect(contributionOf(settle.value, FROSTBURN_DAMAGE)).toBeCloseTo(15, 8)
    expect(contributionOf(settle.value, FROSTBURN_M4)).toBeCloseTo(0.3, 8)
    expect(settle.value.nonCritical).toBeCloseTo(23400, 6)
    expect(settle.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(settle.value.expected).toBeCloseTo(
      0.75 * 23400 + 0.25 * 23400 * 1.5,
      6,
    )

    // 独立 +0.50 增伤（damage 乘区输入）与 [皲裂] 同通道加法：18000 × 1.80。
    const withBonus = calculateStaticDamageFromCatalog({
      ...settlementInput({
        optionIds: [{ optionId: FROSTBURN, layers: 1 }],
        itemId: FROSTBURN_ITEM,
        targetId: FROSTBURN_TARGET,
        statValue: 1200,
        declaredCriticalRate: 0,
        damageBonus: [0.5],
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(withBonus.ok, JSON.stringify(withBonus)).toBe(true)
    if (!withBonus.ok) throw new Error(JSON.stringify(withBonus.issues))
    expect(withBonus.value.nonCritical).toBeCloseTo(18000 * 1.8, 6)

    // 两条元素修正的直接收益（同一装载）：M0 终结技冰伤 +30% 与霜月 30%
    // 冰抗忽视在真实 frost 命中上非零（修正前 ice-only 零贡献，红测复现）；
    // 二者对 uncategorized 独立事件按精确目标/元素条件不泄漏（M0 通用冰伤
    // 除外——它按元素而非目标筛选，修正后是独立事件的同通道共存项）。
    const frostWithCorrections = calculateStaticDamageFromCatalog({
      ...settlementInput({
        optionIds: [
          { optionId: FROSTBURN, layers: 1 },
          { optionId: MIYABI_ULT_OPTION, layers: 1 },
          { optionId: MIYABI_RES_PEN_OPTION, layers: 1 },
        ],
        itemId: FROSTBURN_ITEM,
        targetId: FROSTBURN_TARGET,
        statValue: 1200,
        declaredCriticalRate: 0,
      }),
      definitions: definitions.value,
      catalog,
    })
    expect(frostWithCorrections.ok, JSON.stringify(frostWithCorrections)).toBe(
      true,
    )
    if (!frostWithCorrections.ok)
      throw new Error(JSON.stringify(frostWithCorrections.issues))
    expect(contributionOf(frostWithCorrections.value, MIYABI_ULT_EFFECT)).toBe(
      0.3,
    )
    expect(
      contributionOf(frostWithCorrections.value, MIYABI_RES_PEN_EFFECT),
    ).toBe(0)
    // M0 与 M4 同通道加法：18000 × (1 + 0.3 + 0.3) = 28800。
    expect(frostWithCorrections.value.nonCritical).toBeCloseTo(28800, 6)
  })

  it("resolves every published Miyabi action with an explicit computability classification", async () => {
    const calculationData = await data()
    const fullLevels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
    }
    const miyabi = calculationData.agents.find(
      (entry) => entry.attributes.entityId === "1091",
    )!
    expect(miyabi.actions.actions).toHaveLength(20)
    // 本目录当前的可计算性分类：17 个伤害行（14 行 frost + 3 行 physical）
    // 与 0002—0004 三个招架支援失衡行（daze-only）。不静默跳过任何动作：
    // 解析失败、空伤害结构、自动独立项或未分类 kind 都直接失败；未来新增
    // 不可计算动作必须先在此明确分类，不能用跳过掩盖故障。
    const damageRows: string[] = []
    const dazeOnlyRows: string[] = []
    const frostRows: string[] = []
    for (const action of miyabi.actions.actions) {
      const resolved = resolveAgentAction({
        agent: miyabi.actions,
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
          if (segment.element === "frost") frostRows.push(action.actionId)
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
    expect(damageRows).toHaveLength(17)
    expect(dazeOnlyRows.toSorted()).toEqual([
      "action:agent:1091:action:0002",
      "action:agent:1091:action:0003",
      "action:agent:1091:action:0004",
    ])
    // 真实 frost 路径：14 行（霜月 0011—0013、风花后三段 0008—0010、
    // 快速/支援 0001/0005、连携 0014、终结 0015、闪反 0017、特殊/强化
    // 特殊 0018—0020）。
    expect(new Set(frostRows).size).toBe(14)
  })

  it.each([
    {
      actionId: "action:agent:1091:action:0011",
      label: "Shimotsuki first charged slash row (0011, real frost path)",
    },
    {
      actionId: "action:agent:1091:action:0013",
      label: "Shimotsuki third charged slash row (0013, real frost path)",
    },
    {
      actionId: "action:agent:1091:action:0008",
      label: "windflower third stage row (0008, ordinary frost path)",
    },
    {
      actionId: "action:agent:1091:action:0015",
      label: "ultimate row (0015, real frost path)",
    },
    {
      actionId: "action:agent:1091:action:0006",
      label: "windflower first stage row (0006, physical control)",
    },
  ])(
    "$label resolves a non-empty damage structure without the independent item",
    async ({ actionId }) => {
      // 逐身份锁定真实霜月/普通 frost 路径：正常解析为非空伤害结构，且都
      // 不自动携带霜灼·破独立项或独立目标——独立伤害只能经目录独立请求
      // 显式结算；physical 行作对照确认分类不混。
      const calculationData = await data()
      const miyabi = calculationData.agents.find(
        (entry) => entry.attributes.entityId === "1091",
      )!
      const resolved = resolveAgentAction({
        agent: miyabi.actions,
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

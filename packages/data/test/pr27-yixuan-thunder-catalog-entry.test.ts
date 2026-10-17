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
 * PR27 修复回归：完整正式制品经 data 装载与 core 目录公共入口消费仪玄
 * （Yixuan，1371）影画 2[符法千重-破]、影画 1 落雷与额外能力[玄墨暗涌]
 * 落雷。数值锚点（12/0.5/2.25 × 派生贯穿力）沿用目录级回归
 * （pr27-yixuan-thunder.test.ts）的独立算式；本文件验证真实发布制品的
 * 装载与消费路径一致，并确认全部已发布动作（25 条，含青溟震击-破 0023）
 * 逐身份解析成功且分类明确，不自动派生三条独立项；影画门槛与额外能力
 * 队伍资格按目录契约执行。
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

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["Yixuan", "Anby"],
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
  readonly skillCategory: "special" | "uncategorized"
  readonly mindscapeRank: number
}): StaticCatalogDamageInput {
  return {
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:holder",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            health: general(21000),
            impact: general(170),
            sheerForce: general(0),
          },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:qualifier",
          teamId: "team:players",
          generalStats: {},
          directStats: {},
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
        bindingId: "binding:yixuan",
        kind: "agent",
        holderId: "entity:holder",
        sourceEntityId: "1371",
        eligible: true,
        configuration: {
          mindscapeRank: options.mindscapeRank,
          coreSkillLevel: 7,
        },
      },
    ],
    actorSources: [
      { entityId: "entity:holder", agentEntityId: "1371" },
      { entityId: "entity:qualifier", agentEntityId: "1011" },
    ],
    selections: options.optionIds.map((selection) => ({
      optionId: selection.optionId,
      bindingId: "binding:yixuan",
      layers: selection.layers,
    })),
    hit: {
      actorId: "entity:holder",
      targetId: "entity:enemy",
      actionId: "action:yixuan-thunder-settlement",
      skillCategory: options.skillCategory,
      element: "auric-ink",
      skillTags: [],
      skillTargetIds: [options.targetId],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: options.itemId,
          damageMultiplier: 0,
          stat: "sheerForce",
          statSource: { entityId: "entity:holder" },
        },
      ],
    },
    damage: {
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
    },
  } as unknown as StaticCatalogDamageInput
}

describe("batch 27 Yixuan thunder settlements through the published data package", () => {
  it("consumes all three independent settlements via the loaded catalog", async () => {
    const calculationData = await data()
    expect(calculationData.agents.map((a) => a.attributes.entityId)).toContain(
      "1371",
    )
    const definitions = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    expect(definitions.ok, JSON.stringify(definitions)).toBe(true)
    if (!definitions.ok) throw new Error(JSON.stringify(definitions.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("46")
    for (const target of [M2_TARGET, M1_TARGET, AA_TARGET])
      expect(catalog.skillTargets.some((t) => t.targetId === target)).toBe(true)
    for (const option of [M2_OPTION, M1_OPTION, AA_OPTION])
      expect(catalog.options.some((o) => o.optionId === option)).toBe(true)

    // 派生贯穿力 = 0 + 0.1×21000 + 0.3×1000 = 2400：M2 28800、M1 1200、
    // AA 5400（非暴击）；面板暴击率 0.25、暴伤 0.5。
    for (const [option, target, item, category, expectedDamage] of [
      [M2_OPTION, M2_TARGET, M2_ITEM, "special", 28800],
      [M1_OPTION, M1_TARGET, M1_ITEM, "uncategorized", 1200],
      [AA_OPTION, AA_TARGET, AA_ITEM, "uncategorized", 5400],
    ] as const) {
      const result = calculateStaticDamageFromCatalog({
        ...settlementInput({
          optionIds: [{ optionId: option, layers: 1 }],
          itemId: item,
          targetId: target,
          skillCategory: category,
          mindscapeRank: 6,
        }),
        definitions: definitions.value,
        catalog,
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.value.factors.nonCritical.baseDamage).toBeCloseTo(
        expectedDamage,
        9,
      )
      expect(result.value.criticalRate).toBeCloseTo(0.25, 12)
    }

    // 影画门槛：M2 在影画 1、M1 在影画 0 被目录明确拒绝（CONTEXT_MISMATCH）。
    for (const [option, target, item, category, belowRank] of [
      [M2_OPTION, M2_TARGET, M2_ITEM, "special", 1],
      [M1_OPTION, M1_TARGET, M1_ITEM, "uncategorized", 0],
    ] as const) {
      const result = calculateStaticDamageFromCatalog({
        ...settlementInput({
          optionIds: [{ optionId: option, layers: 1 }],
          itemId: item,
          targetId: target,
          skillCategory: category,
          mindscapeRank: belowRank,
        }),
        definitions: definitions.value,
        catalog,
      })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("not unlocked"),
          ),
        ).toBe(true)
    }

    // 额外能力队伍资格：无合格队友（仅仪玄与安比不同队场景下由调用方组装）
    // 的零贡献契约在目录级回归覆盖；本装载路径保持 Anby（击破）在场。
  })

  it("resolves every published Yixuan action without deriving the independent items", async () => {
    const calculationData = await data()
    const fullLevels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
    }
    const yixuan = calculationData.agents.find(
      (entry) => entry.attributes.entityId === "1371",
    )!
    expect(yixuan.actions.actions).toHaveLength(25)
    // 青溟震击-破 已有独立倍率行并保持可计算（action 0023，Skill:1371025）；
    // 触发导航身份（0016 终结技符法千重、0023 强化特殊技青溟震击-破）不经
    // 本批选项结算，解析结果不携带三条独立项或其目标。
    const damageRows: string[] = []
    for (const action of yixuan.actions.actions) {
      const resolved = resolveAgentAction({
        agent: yixuan.actions,
        actionId: action.actionId,
        mindscapeRank: 6,
        levels: fullLevels,
      })
      expect(resolved.ok, action.actionId).toBe(true)
      if (!resolved.ok)
        throw new Error(
          `${action.actionId} failed to resolve: ${JSON.stringify(resolved.issues)}`,
        )
      expect(resolved.calculation.kind).not.toBe("unavailable")
      if (resolved.calculation.kind === "damage") {
        expect(resolved.calculation.segments.length).toBeGreaterThan(0)
        damageRows.push(action.actionId)
        expect(resolved.skillTargetIds).not.toContain(M2_TARGET)
        expect(resolved.skillTargetIds).not.toContain(M1_TARGET)
        expect(resolved.skillTargetIds).not.toContain(AA_TARGET)
      }
    }
    expect(damageRows).toHaveLength(22)
    const action0023 = yixuan.actions.actions.find(
      (action) => action.actionId === "action:agent:1371:action:0023",
    )!
    expect(action0023.upstreamSkillId).toBe(
      "sk-yixuan-nk-1371025-强化特殊技-青溟震击-破-总",
    )
  })
})

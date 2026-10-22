import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
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
 * PR08 修复回归：完整正式制品经 data 装载与 core 目录公共入口消费三条
 * 影画 6 独立追击（伊芙琳[月辉丝·弦]、零号·安比电磁涡流、琉音余音）。
 * 数值锚点（3.75/10/4.8 × 自身当前攻击力）沿用目录级回归
 * （pr08-m6-independent-followups.test.ts）的独立算式；本文件只验证真实
 * 发布制品的装载与消费路径一致，并确认真实普通动作解析不自动派生 M6 段
 * （完整动作入口不自动追加独立追击，M6 只能经目录独立请求显式结算）。
 */
const EVELYN_M6 = "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up"
const S0ANBY_M6 = "nanoka:agents:s0anby:m6-electromagnetic-vortex"
const DIALYN_M6 = "nanoka:agents:dialyn:m6-aftertone-echo"

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["1321", "1381", "1481"],
    wEngines: [],
  })
  return loaded
}

describe("batch 08 M6 follow-ups through the published data package", () => {
  it("consumes the three independent follow-ups via the catalog entry", async () => {
    const calculationData = await data()
    const definitions = parseEffectRuleSet(
      calculationData.definitions as unknown as RuleSet,
    )
    if (!definitions.ok) throw new Error(JSON.stringify(definitions.issues))
    const catalog = calculationData.catalog as StaticEffectCatalog
    expect(catalog.revision).toBe("50")
    // 正式目录登记三条选项与三个具名独立目标。
    for (const optionId of [EVELYN_M6, S0ANBY_M6, DIALYN_M6])
      expect(
        catalog.options.some((o) => o.optionId === optionId),
        optionId,
      ).toBe(true)
    const expected: readonly (readonly [
      agentEntityId: string,
      optionId: string,
      itemId: string,
      targetId: string,
      element: "fire" | "electric" | "physical",
      skillCategory: "chain" | "follow-up" | "enhanced-special",
      multiplier: number,
    ])[] = [
      [
        "1321",
        EVELYN_M6,
        "evelyn:lunalux-garrote",
        "zzz-hp:skill:evelyn-lunalux-garrote",
        "fire",
        "chain",
        3.75,
      ],
      [
        "1381",
        S0ANBY_M6,
        "s0anby:electromagnetic-vortex",
        "zzz-hp:skill:s0anby-electromagnetic-vortex",
        "electric",
        "follow-up",
        10,
      ],
      [
        "1481",
        DIALYN_M6,
        "dialyn:aftertone-echo",
        "zzz-hp:skill:dialyn-aftertone-echo",
        "physical",
        "enhanced-special",
        4.8,
      ],
    ]
    for (const [
      agentEntityId,
      optionId,
      itemId,
      targetId,
      element,
      skillCategory,
      multiplier,
    ] of expected) {
      const input: StaticCatalogDamageInput = {
        definitions: definitions.value,
        catalog,
        world: {
          entities: [
            {
              kind: "actor",
              entityId: "entity:holder",
              teamId: "team:players",
              generalStats: {
                attack: {
                  baseValue: 1000,
                  initialPercentage: [],
                  initialFixed: [],
                  finalPercentage: [],
                  finalFixed: [],
                },
                health: {
                  baseValue: 24000,
                  initialPercentage: [],
                  initialFixed: [],
                  finalPercentage: [],
                  finalFixed: [],
                },
                impact: {
                  baseValue: 170,
                  initialPercentage: [],
                  initialFixed: [],
                  finalPercentage: [],
                  finalFixed: [],
                },
                sheerForce: {
                  baseValue: 500,
                  initialPercentage: [],
                  initialFixed: [],
                  finalPercentage: [],
                  finalFixed: [],
                },
                anomalyProficiency: {
                  baseValue: 300,
                  initialPercentage: [],
                  initialFixed: [],
                  finalPercentage: [],
                  finalFixed: [],
                },
              },
              directStats: {
                criticalRate: { baseValue: 0, additions: [] },
                criticalDamage: { baseValue: 0, additions: [] },
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
            bindingId: "binding:static",
            kind: "agent",
            holderId: "entity:holder",
            sourceEntityId: agentEntityId,
            eligible: true,
            configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
          },
        ],
        actorSources: [{ entityId: "entity:holder", agentEntityId }],
        selections: [{ optionId, bindingId: "binding:static", layers: 1 }],
        hit: {
          actorId: "entity:holder",
          targetId: "entity:enemy",
          actionId: "action:m6-follow-up",
          skillCategory,
          element,
          skillTags: [],
          skillTargetIds: [targetId],
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId,
              damageMultiplier: 0,
              stat: "attack",
              statSource: { entityId: "entity:holder" },
            },
          ],
        },
        damage: {
          kind: "regular",
          damageBonus: [],
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
        },
      } as unknown as StaticCatalogDamageInput
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok, `${optionId}: ${JSON.stringify(result)}`).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(result.value.factors.nonCritical.baseDamage, optionId).toBeCloseTo(
        multiplier * 1000,
        6,
      )
    }
  })

  it("keeps real action parsing free of the M6 follow-up segments", async () => {
    const calculationData = await data()
    const itemId = new Set([
      "evelyn:lunalux-garrote",
      "s0anby:electromagnetic-vortex",
      "dialyn:aftertone-echo",
    ])
    const targetIds = new Set([
      "zzz-hp:skill:evelyn-lunalux-garrote",
      "zzz-hp:skill:s0anby-electromagnetic-vortex",
      "zzz-hp:skill:dialyn-aftertone-echo",
    ])
    // 三名角色的全部可计算动作：解析结果不自动携带 M6 独立项或独立目标，
    // 完整动作入口不会自动派生影画 6 追击。
    const fullLevels = {
      basic: { mode: "trained" as const, value: 12 },
      special: { mode: "trained" as const, value: 12 },
      dodge: { mode: "trained" as const, value: 12 },
      assist: { mode: "trained" as const, value: 12 },
      chain: { mode: "trained" as const, value: 12 },
      ultimate: { mode: "trained" as const, value: 12 },
    }
    for (const name of ["Evelyn", "Soldier 0 - Anby", "Dialyn"] as const) {
      const agent = calculationData.agents.find(
        (entry) => entry.attributes.entityId === agentEntityIdOf(name),
      )!
      for (const action of agent.actions.actions) {
        let resolved: ReturnType<typeof resolveAgentAction> | undefined
        try {
          resolved = resolveAgentAction({
            agent: agent.actions,
            actionId: action.actionId,
            mindscapeRank: 6,
            levels: fullLevels,
          })
        } catch {
          // 该动作需要特定潜能上下文（如零号·安比的分支动作），与影画 6
          // 独立追击的自动派生检查无关，跳过。
          continue
        }
        if (!resolved.ok) continue
        if (resolved.calculation.kind !== "damage") continue
        for (const segment of resolved.calculation.segments)
          for (const item of segment.damageItems)
            expect(
              itemId.has(item.itemId),
              `${action.actionId} auto-derives ${item.itemId}`,
            ).toBe(false)
        for (const id of resolved.skillTargetIds ?? [])
          expect(
            targetIds.has(id),
            `${action.actionId} carries the independent target ${id}`,
          ).toBe(false)
      }
    }
    // 白雷动作（特殊技身份、追加攻击标签）本身可用，且不含电磁涡流段。
    const s0anby = calculationData.agents.find(
      (entry) => entry.attributes.entityId === "1381",
    )!
    const whiteThunder = resolveAgentAction({
      agent: s0anby.actions,
      actionId: "action:agent:1381:action:0019",
      mindscapeRank: 6,
      levels: { special: { mode: "trained", value: 12 } },
    })
    if (!whiteThunder.ok) throw new Error(JSON.stringify(whiteThunder.issues))
    expect(whiteThunder.skillCategory).toBe("special")
    expect(whiteThunder.skillTags).toContain("zzz-hp:follow-up")
    if (whiteThunder.calculation.kind === "damage")
      for (const segment of whiteThunder.calculation.segments)
        expect(
          segment.damageItems.some((item: { itemId: string }) =>
            itemId.has(item.itemId),
          ),
        ).toBe(false)
  })
})

const agentEntityIdOf = (name: string): string =>
  name === "Evelyn" ? "1321" : name === "Soldier 0 - Anby" ? "1381" : "1481"

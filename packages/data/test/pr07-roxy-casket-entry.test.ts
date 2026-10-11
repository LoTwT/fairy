import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type { EntityId } from "@randomplay/shared"

/**
 * PR07 修复回归：完整静态动作入口装载真实数据（洛克茜与绯月银棺均为
 * Nanoka 3.2 补充实体/选项），验证显式初始回能输入按绑定透传、绯月银棺
 * 的全队唯一选项经入口可用，且同队双持有者同时启用被入口按同一目录契约
 * 拒绝。数值锚点（+100 攻击、×1.2 伤害）沿用目录级回归
 * （pr07-roxy-crimson-moon.test.ts）的独立算式。
 */
const ROXY_OPTION = "nanoka:agents:1621:initial-energy-regen-conversion"
const ROXY_INPUT = "roxy:initial-energy-regen:source"
const CMC_TEAM_OPTION = "nanoka:w-engines:14162:squad-damage-bonus"

const emptyDiscs = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
} as const

const actor = (
  entityId: EntityId,
  agentEntityId: string,
  wEngine: StaticActorConfiguration["wEngine"] = null,
): StaticActorConfiguration => ({
  entityId,
  teamId: "team:players",
  agentEntityId,
  coreSkillLevel: 7,
  mindscapeRank: 0,
  wEngine,
  driveDiscs: emptyDiscs,
  panel: { mode: "equipment" },
})

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["Roxy", "Qingyi"],
    wEngines: ["Crimson Moon Casket"],
  })
  return loaded
}

async function roxyActionInput(
  selections: readonly {
    holderId: EntityId
    optionId: string
    layers: number
  }[],
  inputs?: StaticActionCalculationInput["inputs"],
): Promise<StaticActionCalculationInput> {
  const calculationData = await data()
  const roxy = calculationData.agents.find(
    (entry) => entry.actions.entityId === "1621",
  )!
  const action = roxy.actions.actions.find(
    (candidate) =>
      candidate.calculation.kind === "damage" &&
      candidate.skillCategory === "basic" &&
      candidate.inputs.length === 0,
  )!
  const resolved = resolveAgentAction({
    agent: roxy.actions,
    actionId: action.actionId,
    mindscapeRank: 0,
    levels: { basic: { mode: "trained", value: 12 } },
  })
  if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
  return {
    data: calculationData,
    actors: [actor("entity:roxy", "1621"), actor("entity:qingyi", "1251")],
    actorId: "entity:roxy",
    action: resolved,
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 1000,
      resistances: {
        "physical": 0,
        "fire": 0,
        "ice": 0,
        "electric": 0,
        "ether": 0,
        "auric-ink": 0,
        "wind": 0,
        "frost": 0,
        "lumiflux": 0,
      },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: selections.map((selection) => ({
      holderId: selection.holderId,
      optionId: selection.optionId,
      layers: selection.layers,
    })),
    ...(inputs === undefined ? {} : { inputs }),
  }
}

async function qingyiActionInput(
  selections: readonly {
    holderId: EntityId
    optionId: string
    layers: number
  }[],
): Promise<StaticActionCalculationInput> {
  const input = await roxyActionInput([])
  const calculationData = input.data
  const qingyi = calculationData.agents.find(
    (entry) => entry.actions.entityId === "1251",
  )!
  const action = qingyi.actions.actions.find(
    (candidate) =>
      candidate.calculation.kind === "damage" &&
      candidate.skillCategory === "basic" &&
      candidate.inputs.length === 0,
  )!
  const resolved = resolveAgentAction({
    agent: qingyi.actions,
    actionId: action.actionId,
    mindscapeRank: 0,
    levels: { basic: { mode: "trained", value: 12 } },
  })
  if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
  return {
    ...input,
    actors: [
      actor("entity:roxy", "1621", {
        entityId: "14162",
        refinement: 1,
        eligible: true,
      }),
      actor("entity:qingyi", "1251"),
    ],
    actorId: "entity:qingyi",
    action: resolved,
    selections: selections.map((selection) => ({
      holderId: selection.holderId,
      optionId: selection.optionId,
      layers: selection.layers,
    })),
  }
}

describe("batch 07 supplements through the full static action entry", () => {
  it("feeds the explicit initial regen input into Roxy's real action", async () => {
    const withOption = calculateStaticActionDamage(
      await roxyActionInput(
        [{ holderId: "entity:roxy", optionId: ROXY_OPTION, layers: 1 }],
        [
          {
            bindingId: "binding:entity:roxy:agent:1621",
            name: ROXY_INPUT,
            value: { unit: "energy-per-second", value: 1.4 },
          },
        ],
      ),
    )
    expect(withOption.ok, JSON.stringify(withOption)).toBe(true)
    const withoutOption = calculateStaticActionDamage(await roxyActionInput([]))
    expect(withoutOption.ok, JSON.stringify(withoutOption)).toBe(true)
    if (
      !withOption.ok ||
      !withoutOption.ok ||
      withOption.value.kind !== "damage" ||
      withoutOption.value.kind !== "damage"
    )
      throw new Error("unexpected result kinds")
    // 核心档案 7、E=1.4 → 超出 0.2 → 攻击 +100、冲击 +8：结算面板是装备
    // 面板（不含局内 final-fixed 贡献），以伤害段求值里的当前攻击差核对。
    const currentAttack = (result: typeof withOption.value) => {
      const attribute = result.segments[0]!.damage.evaluation.attributes.find(
        (a) =>
          a.stat === "attack" &&
          a.entityId === "entity:roxy" &&
          a.stage === "current",
      )
      if (!attribute) throw new Error("missing current attack for roxy")
      return attribute.value.value
    }
    expect(
      currentAttack(withOption.value) - currentAttack(withoutOption.value),
    ).toBeCloseTo(100, 9)
    expect(withOption.value.totals.expected).toBeGreaterThan(
      withoutOption.value.totals.expected,
    )
    // 缺输入按目录契约拒绝。
    const missing = calculateStaticActionDamage(
      await roxyActionInput([
        { holderId: "entity:roxy", optionId: ROXY_OPTION, layers: 1 },
      ]),
    )
    expect(missing.ok).toBe(false)
  })

  it("applies the casket squad damage to a teammate's real action", async () => {
    const withBuff = calculateStaticActionDamage(
      await qingyiActionInput([
        { holderId: "entity:roxy", optionId: CMC_TEAM_OPTION, layers: 1 },
      ]),
    )
    expect(withBuff.ok, JSON.stringify(withBuff)).toBe(true)
    const without = calculateStaticActionDamage(await qingyiActionInput([]))
    expect(without.ok, JSON.stringify(without)).toBe(true)
    if (
      !withBuff.ok ||
      !without.ok ||
      withBuff.value.kind !== "damage" ||
      without.value.kind !== "damage"
    )
      throw new Error("unexpected result kinds")
    // 精 1 的全队增伤 +20%：同一动作、同一输入，仅切换选项选择。
    expect(withBuff.value.totals.expected).toBeGreaterThan(0)
    expect(
      withBuff.value.totals.expected / without.value.totals.expected,
    ).toBeCloseTo(1.2, 9)
  })

  it("rejects two same-team casket holders enabling the squad-unique option", async () => {
    const input = await qingyiActionInput([
      { holderId: "entity:roxy", optionId: CMC_TEAM_OPTION, layers: 1 },
      { holderId: "entity:qingyi", optionId: CMC_TEAM_OPTION, layers: 1 },
    ])
    // 青衣同队再装备一份绯月银棺并启用同一选项：入口按目录契约拒绝。
    const both = calculateStaticActionDamage({
      ...input,
      actors: [
        actor("entity:roxy", "1621", {
          entityId: "14162",
          refinement: 1,
          eligible: true,
        }),
        actor("entity:qingyi", "1251", {
          entityId: "14162",
          refinement: 5,
          eligible: true,
        }),
      ],
    })
    expect(both.ok).toBe(false)
    if (!both.ok)
      expect(
        both.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("squad-unique"),
        ),
      ).toBe(true)
  })
})

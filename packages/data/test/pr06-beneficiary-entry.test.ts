import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type { EntityId } from "@randomplay/shared"

/**
 * PR06 修复回归：完整静态动作入口必须把选项选择上的声明式同队受益者
 * （beneficiaryActorId）原样透传给目录消费层。经正式 loadStaticCalculationData
 * 装载与 resolveAgentAction 解析的真实入口验证：合法启用成功、缺声明/
 * 本人/异队/未观察按目录契约拒绝、关闭无需声明、未声明该契约的选项不
 * 接受该字段。普通动作不消费回能，其成功证明的是入口透传与目录校验，
 * 回能数值本身沿用目录级回归（pr06-agent-impact-energy.test.ts）。
 */
const M4_OPTION = "nanoka:agents:lighter:mindscape-4-frontline-energy-regen"

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
): StaticActorConfiguration => ({
  entityId,
  teamId: "team:players",
  agentEntityId,
  coreSkillLevel: 7,
  mindscapeRank: 0,
  wEngine: null,
  driveDiscs: emptyDiscs,
  panel: { mode: "equipment" },
})

let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>> | undefined
const data = async () => {
  loaded ??= await loadStaticCalculationData({
    agents: ["Lighter", "Qingyi", "Nicole"],
    wEngines: [],
  })
  return loaded
}

async function entryInput(
  selections: readonly {
    holderId: EntityId
    optionId: string
    layers: number
    beneficiaryActorId?: EntityId
  }[],
): Promise<StaticActionCalculationInput> {
  const calculationData = await data()
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
    data: calculationData,
    actors: [
      { ...actor("entity:lighter", "1161"), mindscapeRank: 4 },
      actor("entity:front", "1251"),
      actor("entity:bench", "1031"),
    ],
    actorId: "entity:front",
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
      ...(selection.beneficiaryActorId === undefined
        ? {}
        : { beneficiaryActorId: selection.beneficiaryActorId }),
    })),
  }
}

describe("declared teammate beneficiary passthrough through the full static entry", () => {
  it("accepts a valid declared front-line selection", async () => {
    const input = await entryInput([
      {
        holderId: "entity:lighter",
        optionId: M4_OPTION,
        layers: 1,
        beneficiaryActorId: "entity:front",
      },
    ])
    const result = calculateStaticActionDamage(input)
    // 修复前该合法声明在入口被丢弃，整次计算返回 /selections/0/
    // beneficiaryActorId 的 MISSING_FACT；修复后原样透传并由目录校验通过。
    // 本次动作为普通直伤，不消费回能：成功只证明入口透传与目录校验，
    // 回能数值与受益隔离沿用目录级回归（pr06-agent-impact-energy.test.ts）。
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok || result.value.kind !== "damage")
      throw new Error(JSON.stringify(result))
  })

  it("rejects a missing declaration and non-teammate declarations", async () => {
    for (const [label, selection] of [
      [
        "missing declaration",
        {
          holderId: "entity:lighter",
          optionId: M4_OPTION,
          layers: 1,
        },
      ],
      [
        "holder himself",
        {
          holderId: "entity:lighter",
          optionId: M4_OPTION,
          layers: 1,
          beneficiaryActorId: "entity:lighter",
        },
      ],
      [
        "enemy actor",
        {
          holderId: "entity:lighter",
          optionId: M4_OPTION,
          layers: 1,
          beneficiaryActorId: "entity:target",
        },
      ],
      [
        "unobserved actor",
        {
          holderId: "entity:lighter",
          optionId: M4_OPTION,
          layers: 1,
          beneficiaryActorId: "entity:missing",
        },
      ],
    ] as const) {
      const result = calculateStaticActionDamage(await entryInput([selection]))
      expect(result.ok, label).toBe(false)
      if (!result.ok) {
        expect(
          result.issues.some((issue) =>
            ["MISSING_FACT", "CONTEXT_MISMATCH"].includes(issue.code),
          ),
          `${label}: ${JSON.stringify(result.issues)}`,
        ).toBe(true)
      }
    }
  })

  it("keeps the closed selection free of any declaration requirement", async () => {
    const result = calculateStaticActionDamage(
      await entryInput([
        { holderId: "entity:lighter", optionId: M4_OPTION, layers: 0 },
      ]),
    )
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok || result.value.kind !== "damage")
      throw new Error(JSON.stringify(result))
    expect(
      result.value.panels.some((panel) =>
        panel.contributions.some(
          (entry) =>
            entry.origin.effectId ===
            "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
        ),
      ),
    ).toBe(false)
  })

  it("rejects the declaration field on an option without the contract", async () => {
    const result = calculateStaticActionDamage(
      await entryInput([
        {
          holderId: "entity:lighter",
          optionId: "nanoka:agents:lighter:morale-burst-impact",
          layers: 1,
          beneficiaryActorId: "entity:front",
        },
      ]),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
      ).toBe(true)
  })
})

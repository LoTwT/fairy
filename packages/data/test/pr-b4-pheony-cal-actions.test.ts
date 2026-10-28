import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { loadAgentActions, resolveAgentAction } from "../src/index.ts"
import type {
  AgentAction,
  AgentActionManifest,
  AgentActions,
  ResolvedAgentAction,
} from "../src/skills/types.ts"

interface SettledCalculation {
  readonly kind: "anomaly-settlement"
  readonly elements: readonly string[]
  readonly items: readonly {
    readonly itemId: string
    readonly stat: string
    readonly coefficient: {
      readonly levelGroup: string
      readonly base: number
      readonly growth: number
    }
  }[]
  readonly anomalySettlementCriticalDamage: number
}
interface SettledResolvedCalculation {
  readonly kind: "anomaly-settlement"
  readonly elements: readonly string[]
  readonly damageItems: readonly {
    readonly itemId: string
    readonly stat: string
    readonly damageMultiplier: number
  }[]
  readonly anomalySettlementCriticalDamage: number
}
const calculationOf = (action: AgentAction) =>
  action.calculation as unknown as SettledCalculation
const resolvedCalculationOf = (
  resolved: Extract<ResolvedAgentAction, { readonly ok: true }>,
) => resolved.calculation as unknown as SettledResolvedCalculation

/**
 * PR-B4：菲欧妮（1641）基础焚罪/烬火追魂的 `{CAL}` 异放，以及影画 4 的
 * 两次追加异放，必须是四个可独立选择、独立结算的动作。
 *
 * Nanoka 3.3.12+19634983：
 * - `/skill/basic/description/1/desc` 的 `{CAL:225+20*(AvatarSkillLevel(0)-1),1,2}%`
 *   与“该次[异放]效果触发暴击时，其暴击伤害额外提升40%”；
 * - `/skill/chain/description/2/desc` 的 `{CAL:300+27*(AvatarSkillLevel(3)-1),1,2}%`
 *   与同文 40% 条款；
 * - `/talent/4/desc` 的固定 600% 追加异放（六元素归一见 B2）。
 *
 * ZZZ-HP 991bb0e 的 `/skills` 中 `sk-pheony-nk-1641005-异放倍率` 与
 * `sk-pheony-nk-1641019-异放倍率` 是分开的 anomalyRelease 行；主 direct 行
 * `-main` 保持独立，不能合并。
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))

const manifest = read(
  "../definitions/skills/manifest.json",
) as AgentActionManifest & {
  readonly coverage: AgentActionManifest["coverage"] & {
    readonly anomalySettlement: number
  }
}
const actions = read("../definitions/skills/agents/1641.json") as AgentActions
type SettledAction = AgentAction & { readonly minimumMindscapeRank?: number }
const settledActionById = (id: string) => actionById(id) as SettledAction

const M4_TARGET = "zzz-hp:skill:pheony-m4-anomaly-settlement"
const M4_ITEM = "pheony:m4-anomaly-settlement"
const SIX_ELEMENTS = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
] as const

const baseActions = [
  {
    actionId: "action:agent:1641:action:0021",
    label: "普通攻击：焚罪 · 异放",
    levelGroup: "basic" as const,
    upstreamSkillId: "sk-pheony-nk-1641005-异放倍率",
    sourceExpression: "{CAL:225+20*(AvatarSkillLevel(0)-1),1,2}%",
    sourcePointer: "/skill/basic/description/1/desc",
    growth: 0.2,
    anchors: [
      { mindscapeRank: 0 as const, level: 1, multiplier: 2.25 },
      { mindscapeRank: 0 as const, level: 12, multiplier: 4.45 },
      { mindscapeRank: 3 as const, level: 14, multiplier: 4.85 },
      { mindscapeRank: 6 as const, level: 16, multiplier: 5.25 },
    ],
  },
  {
    actionId: "action:agent:1641:action:0022",
    label: "烬火追魂 · 异放",
    levelGroup: "chain" as const,
    upstreamSkillId: "sk-pheony-nk-1641019-异放倍率",
    sourceExpression: "{CAL:300+27*(AvatarSkillLevel(3)-1),1,2}%",
    sourcePointer: "/skill/chain/description/2/desc",
    growth: 0.27,
    anchors: [
      { mindscapeRank: 0 as const, level: 1, multiplier: 3 },
      { mindscapeRank: 0 as const, level: 12, multiplier: 5.97 },
      { mindscapeRank: 3 as const, level: 14, multiplier: 6.51 },
      { mindscapeRank: 6 as const, level: 16, multiplier: 7.05 },
    ],
  },
] as const

const m4Actions = [
  {
    actionId: "action:agent:1641:action:0023",
    label: "普通攻击：焚罪 · 影画4追加异放",
    levelGroup: "basic" as const,
  },
  {
    actionId: "action:agent:1641:action:0024",
    label: "烬火追魂 · 影画4追加异放",
    levelGroup: "chain" as const,
  },
] as const

function actionById(id: string): AgentAction {
  const action = actions.actions.find((entry) => entry.actionId === id)
  if (!action) throw new Error(`missing action ${id}`)
  return action
}

function resolve(
  actionId: string,
  mindscapeRank: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  levels?: Readonly<
    Partial<
      Record<
        "basic" | "chain",
        { readonly mode: "effective"; readonly value: number }
      >
    >
  >,
) {
  return resolveAgentAction({
    agent: actions,
    actionId,
    mindscapeRank,
    levels: levels ?? {},
  })
}

describe("Pheony CAL anomaly-settlement actions", () => {
  it("publishes four independent actions without changing the original twenty", () => {
    expect(manifest.rulesVersion).toBe("agent-actions/5")
    expect(manifest.coverage.anomalySettlement).toBe(4)
    expect(manifest.coverage.actions).toBe(1352)
    expect(actions.actions).toHaveLength(24)
    for (let index = 1; index <= 20; index++) {
      const id = `action:agent:1641:action:${String(index).padStart(4, "0")}`
      expect(actionById(id), id).toBeDefined()
    }
    for (const { actionId, label } of [...baseActions, ...m4Actions]) {
      const action = actionById(actionId)
      expect(action.name).toBe(label)
      expect(action.skillCategory).toBe("uncategorized")
      const calculation = calculationOf(action)
      expect(calculation.kind).toBe("anomaly-settlement")
      expect(calculation.elements).toEqual(SIX_ELEMENTS)
      expect(calculation.items).toHaveLength(1)
    }
  })

  it.each(baseActions)(
    "carries the $label CAL curve and its own 40% crit-damage rule",
    (spec) => {
      const action = settledActionById(spec.actionId)
      expect(action.levelGroup).toBe(spec.levelGroup)
      expect(action.upstreamSkillId).toBe(spec.upstreamSkillId)
      expect(action.sourceExpression).toBe(spec.sourceExpression)
      expect(action.source.pointer).toBe(spec.sourcePointer)
      expect(action.damageCoefficient).toEqual({
        levelGroup: spec.levelGroup,
        base: spec.anchors[0]!.multiplier,
        growth: spec.growth,
      })
      const calculation = calculationOf(action)
      expect(calculation.kind).toBe("anomaly-settlement")
      expect(calculation.anomalySettlementCriticalDamage).toBe(0.4)
      expect(action.minimumMindscapeRank).toBeUndefined()

      for (const anchor of spec.anchors) {
        const resolved = resolve(spec.actionId, anchor.mindscapeRank, {
          [spec.levelGroup]: {
            mode: "effective",
            value: anchor.level,
          },
        })
        expect(resolved.ok, JSON.stringify(resolved)).toBe(true)
        if (!resolved.ok) throw new Error("unexpected resolution")
        const settled = resolvedCalculationOf(resolved)
        expect(settled.kind).toBe("anomaly-settlement")
        expect(
          settled.damageItems[0]!.damageMultiplier,
          `${spec.label} L${anchor.level}`,
        ).toBeCloseTo(anchor.multiplier, 12)
        expect(settled.anomalySettlementCriticalDamage).toBe(0.4)
        expect(resolved.sourceDamageMultiplier).toBeCloseTo(
          anchor.multiplier,
          12,
        )
      }
    },
  )

  it.each(m4Actions)(
    "keeps $label at the zero initial multiplier and the M4-owned 40% rule",
    (spec) => {
      const action = settledActionById(spec.actionId)
      expect(action.levelGroup).toBe(spec.levelGroup)
      expect(action.upstreamSkillId).toBeNull()
      expect(action.damageCoefficient).toBeNull()
      expect(action.minimumMindscapeRank).toBe(4)
      expect(action.skillTargetIds).toEqual([M4_TARGET])
      expect(action.parameterIds).toEqual([])
      const calculation = calculationOf(action)
      expect(calculation.kind).toBe("anomaly-settlement")
      expect(calculation.anomalySettlementCriticalDamage).toBe(0)
      expect(calculation.items).toEqual([
        expect.objectContaining({
          itemId: M4_ITEM,
          stat: "attack",
          coefficient: expect.objectContaining({
            base: 0,
            growth: 0,
          }),
        }),
      ])

      const resolved = resolve(spec.actionId, 4)
      expect(resolved.ok, JSON.stringify(resolved)).toBe(true)
      if (!resolved.ok) throw new Error("unexpected resolution")
      const settled = resolvedCalculationOf(resolved)
      expect(settled.kind).toBe("anomaly-settlement")
      expect(settled.damageItems).toEqual([
        { itemId: M4_ITEM, stat: "attack", damageMultiplier: 0 },
      ])
      expect(settled.anomalySettlementCriticalDamage).toBe(0)
      expect(resolved.levels).toEqual({})
      expect(resolved.skillTargetIds).toEqual([M4_TARGET])
    },
  )

  it.each(m4Actions)("rejects $actionId below mindscape 4", (spec) => {
    for (const mindscapeRank of [0, 1, 2, 3] as const)
      expect(() => resolve(spec.actionId, mindscapeRank)).toThrow(
        /mindscape rank/i,
      )
  })

  it("keeps the two original direct actions unchanged and separate", () => {
    for (const [actionId, group, coefficient, category, upstream] of [
      [
        "action:agent:1641:action:0010",
        "basic",
        { base: 5.473, growth: 0.498 },
        "basic",
        "sk-pheony-nk-1641005-main",
      ],
      [
        "action:agent:1641:action:0014",
        "chain",
        { base: 0.955, growth: 0.087 },
        "ultimate",
        "sk-pheony-nk-1641019-main",
      ],
    ] as const) {
      const action = actionById(actionId)
      expect(action.levelGroup).toBe(group)
      expect(action.skillCategory).toBe(category)
      expect(action.upstreamSkillId).toBe(upstream)
      expect(action.damageCoefficient).toEqual({
        levelGroup: group,
        ...coefficient,
      })
      expect(action.calculation.kind).toBe("damage")
      if (action.calculation.kind !== "damage")
        throw new Error("unexpected calculation")
      expect(action.calculation.segments).toHaveLength(1)
      expect(action.calculation.segments[0]!.element).toBe("fire")
      expect(action.calculation.segments[0]!.items[0]!.coefficient).toEqual({
        levelGroup: group,
        ...coefficient,
      })
    }
  })

  it("proves the four actions cannot be merged without losing event identity (ablation)", () => {
    const ids = [...baseActions, ...m4Actions].map((entry) => entry.actionId)
    for (const removed of ids) {
      const without: AgentActions = {
        ...actions,
        actions: actions.actions.filter((entry) => entry.actionId !== removed),
      }
      expect(() =>
        resolveAgentAction({
          agent: without,
          actionId: removed,
          mindscapeRank: 4,
          levels: {},
        }),
      ).toThrow(new RegExp(`Unknown action: ${removed}`, "u"))
      for (const remaining of ids.filter((id) => id !== removed)) {
        const action = without.actions.find(
          (entry) => entry.actionId === remaining,
        )
        expect(action, remaining).toBeDefined()
        expect(
          resolveAgentAction({
            agent: without,
            actionId: remaining,
            mindscapeRank: 4,
            levels:
              action?.levelGroup === "basic"
                ? { basic: { mode: "effective", value: 14 } }
                : action?.levelGroup === "chain"
                  ? { chain: { mode: "effective", value: 14 } }
                  : {},
          }).ok,
          remaining,
        ).toBe(true)
      }
    }

    // A merged base action would have to lose either the 2.25/4.85 basic CAL or
    // the 3/6.51 chain CAL, and a merged M4 action would have to lose the
    // basic-vs-chain trigger identity or the M4 gate.
    const basicCal = settledActionById(baseActions[0].actionId)
    const chainCal = settledActionById(baseActions[1].actionId)
    expect(basicCal.levelGroup).toBe("basic")
    expect(chainCal.levelGroup).toBe("chain")
    expect(basicCal.upstreamSkillId).not.toBe(chainCal.upstreamSkillId)
    expect(basicCal.source.pointer).not.toBe(chainCal.source.pointer)
    expect(basicCal.damageCoefficient).not.toEqual(chainCal.damageCoefficient)

    const basicM4 = settledActionById(m4Actions[0].actionId)
    const chainM4 = settledActionById(m4Actions[1].actionId)
    expect(basicM4.levelGroup).toBe("basic")
    expect(chainM4.levelGroup).toBe("chain")
    expect(basicM4.source.pointer).toBe(chainM4.source.pointer)
    expect(basicM4.calculation).toMatchObject({
      kind: "anomaly-settlement",
      anomalySettlementCriticalDamage: 0,
    })
    expect(
      resolve(baseActions[0].actionId, 0, {
        basic: { mode: "effective", value: 1 },
      }).ok,
    ).toBe(true)
    expect(() => resolve(m4Actions[0].actionId, 0)).toThrow(/mindscape rank/i)
  })

  it("rejects malformed anomaly settlement registrations before evaluation", () => {
    const malformedCases: readonly {
      readonly label: string
      readonly actionId: string
      readonly levels: Readonly<
        Record<string, { mode: "effective"; value: number }>
      >
      readonly mutate: (calculation: Record<string, unknown>) => void
    }[] = [
      {
        label: "null element",
        actionId: baseActions[0].actionId,
        levels: { basic: { mode: "effective", value: 14 } },
        mutate: (calculation) => {
          calculation.elements = [null]
        },
      },
      {
        label: "unknown element",
        actionId: baseActions[0].actionId,
        levels: { basic: { mode: "effective", value: 14 } },
        mutate: (calculation) => {
          calculation.elements = ["quantum"]
        },
      },
      {
        label: "duplicate element",
        actionId: baseActions[0].actionId,
        levels: { basic: { mode: "effective", value: 14 } },
        mutate: (calculation) => {
          calculation.elements = ["fire", "fire"]
        },
      },
      {
        label: "empty items",
        actionId: baseActions[0].actionId,
        levels: { basic: { mode: "effective", value: 14 } },
        mutate: (calculation) => {
          calculation.items = []
        },
      },
      {
        label: "zero multiplier without a level group",
        actionId: m4Actions[0].actionId,
        levels: {},
        mutate: (calculation) => {
          const items = calculation.items as {
            coefficient: { levelGroup?: string }
          }[]
          delete items[0]!.coefficient.levelGroup
        },
      },
    ]
    for (const entry of malformedCases) {
      const malformed = structuredClone(actions)
      const action = malformed.actions.find(
        (candidate) => candidate.actionId === entry.actionId,
      )!
      entry.mutate(action.calculation as unknown as Record<string, unknown>)
      expect(
        () =>
          resolveAgentAction({
            agent: malformed,
            actionId: entry.actionId,
            mindscapeRank: 4,
            levels: entry.levels,
          }),
        entry.label,
      ).toThrow()
    }
  })

  it("loads the four actions through the public agent loader", async () => {
    const loaded = await loadAgentActions("Phoenix")
    if (!loaded) throw new Error("Pheony was not published")
    for (const { actionId } of [...baseActions, ...m4Actions])
      expect(
        loaded.actions.some((action) => action.actionId === actionId),
      ).toBe(true)
  })
})

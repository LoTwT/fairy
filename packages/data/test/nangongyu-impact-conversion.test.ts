import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  calculationDataVersion,
  staticPanelRules,
} from "../.generated/calculation-data.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import { calculateStaticDamage } from "../../core/src/effects/index.ts"
import type {
  GeneralStatInput,
  StaticDamageInput,
} from "../../core/src/effects/index.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type { StaticCalculationData } from "@randomplay/shared"

const json = async (path: string) =>
  JSON.parse(
    await readFile(
      new URL(`../.generated/definitions/${path}`, import.meta.url),
      "utf8",
    ),
  )

const emptyDiscs = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
} as const

async function fixture(
  extraInitialAnomalyMastery: number,
): Promise<StaticActionCalculationInput> {
  const attributes = await json("attributes/agents/1511.json")
  attributes.baseAttributes.anomalyMastery.value += extraInitialAnomalyMastery
  const actions = await json("skills/agents/1511.json")
  const data: StaticCalculationData = {
    version: calculationDataVersion,
    agents: [{ attributes, actions }],
    wEngines: [],
    driveDiscAffixes: await json("attributes/drive-disc-affixes.json"),
    definitions: await json("effects/static.json"),
    catalog: await json("effects/static-catalog.json"),
    panelRules: staticPanelRules,
  }
  const action = data.agents[0]!.actions.actions.find(
    (a) =>
      a.calculation.kind === "damage" &&
      a.skillCategory &&
      a.inputs.length === 0,
  )!
  return {
    data,
    actors: [
      {
        entityId: "entity:actor",
        teamId: "team:players",
        agentEntityId: "1511",
        mindscapeRank: 0,
        coreSkillLevel: 7,
        wEngine: null,
        driveDiscs: emptyDiscs,
        panel: { mode: "equipment" },
      } satisfies StaticActorConfiguration,
    ],
    actorId: "entity:actor",
    action: resolveAgentAction({
      agent: actions,
      actionId: action.actionId,
      mindscapeRank: 0,
      levels: {
        basic: { mode: "trained", value: 12 },
        dodge: { mode: "trained", value: 12 },
        assist: { mode: "trained", value: 12 },
        special: { mode: "trained", value: 12 },
        chain: { mode: "trained", value: 12 },
      },
    }),
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
    selections: [],
  }
}

function statValue(
  panel: { stats: Record<string, unknown> },
  key: string,
): number {
  const stat = panel.stats[key] as { value: number }
  return stat.value
}

function generalStat(
  baseValue: number,
  extra: { finalFixed?: number[]; finalPercentage?: number[] } = {},
): GeneralStatInput {
  return {
    baseValue,
    initialPercentage: [],
    initialFixed: [],
    finalPercentage: extra.finalPercentage ?? [],
    finalFixed: extra.finalFixed ?? [],
  }
}

describe("南宫玉初始异常掌控转冲击力常驻转化", () => {
  it("初始异常掌控每超出 110 点使冲击力提升 1 点", async () => {
    const base = await fixture(0)
    const baseResult = calculateStaticActionDamage(base)
    expect(baseResult.ok, JSON.stringify(baseResult)).toBe(true)
    if (!baseResult.ok) return
    const basePanel = baseResult.value.panels[0]!
    const baseImpact = statValue(basePanel, "impact")
    const baseMastery = statValue(basePanel, "anomalyMastery")
    expect(baseMastery).toBeGreaterThan(110)

    const shifted = await fixture(50)
    const shiftedResult = calculateStaticActionDamage(shifted)
    expect(shiftedResult.ok, JSON.stringify(shiftedResult)).toBe(true)
    if (!shiftedResult.ok) return
    const shiftedPanel = shiftedResult.value.panels[0]!
    expect(statValue(shiftedPanel, "anomalyMastery") - baseMastery).toBe(50)
    expect(statValue(shiftedPanel, "impact") - baseImpact).toBe(50)

    // 基准快照：120 基础冲击力 + (126 − 110) 转化
    expect(baseImpact).toBe(136)
  })

  /** 真实发布的常驻转化规则；低层入口逐项验证门槛、读取阶段与输出阶段。 */
  const masteryToImpact = staticPanelRules.agents[
    "1511"
  ]!.initialConversions.find(
    (rule) => rule.effectId === "agent:1511:permanent:mastery-to-impact",
  )!

  function conversionInput(
    mastery: GeneralStatInput,
    impact: GeneralStatInput,
  ): StaticDamageInput {
    return {
      definitions: {
        schemaVersion: 1,
        ruleSetId: "nangongyu-stage-regression",
        revision: "1",
        effects: [masteryToImpact],
        states: [],
        actions: [],
      },
      bindings: [
        {
          bindingId: "binding:source",
          kind: "agent",
          holderId: "entity:actor",
          sourceEntityId: "1511",
          eligible: true,
          configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
        },
      ],
      selections: [],
      world: {
        entities: [
          {
            kind: "actor",
            entityId: "entity:actor",
            teamId: "team:players",
            generalStats: {
              attack: {
                baseValue: 1000,
                initialPercentage: [],
                initialFixed: [],
                finalPercentage: [],
                finalFixed: [],
              },
              anomalyMastery: mastery,
              impact: impact,
            },
            directStats: {
              criticalRate: { baseValue: 0, additions: [] },
              criticalDamage: { baseValue: 0.5, additions: [] },
              penetrationRatio: { baseValue: 0, additions: [] },
            },
          },
          {
            kind: "actor",
            entityId: "entity:target",
            teamId: "team:enemies",
            generalStats: {},
            directStats: {},
          },
        ],
        states: [],
        distances: [],
      },
      hit: {
        actorId: "entity:actor",
        targetId: "entity:target",
        actionId: "action:regression",
        skillCategory: "basic",
        element: "ether",
        skillTags: [],
        damageItems: [
          { itemId: "impact-read", damageMultiplier: 1, stat: "impact" },
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
    }
  }

  it("按初始掌控结算门槛增量且不受当前掌控变化影响", () => {
    // 冻结 Nanoka 7 行证明：阈值 110、速率 1:1、输入为初始掌控
    const impactAt = (mastery: number) =>
      calculateStaticDamage(
        conversionInput(generalStat(mastery), generalStat(120)),
      )
    for (const [mastery, expected] of [
      [109, 120],
      [110, 120],
      [111, 121],
      [200, 210],
    ] as const) {
      const result = impactAt(mastery)
      expect(result.ok, `mastery ${mastery}`).toBe(true)
      if (result.ok)
        expect(
          result.value.factors.nonCritical.baseDamage,
          `mastery ${mastery}`,
        ).toBeCloseTo(expected, 6)
    }
    // initial 与 current 读取分离：局内把当前掌控抬到 1000（126 + 874），
    // 转化仍按初始 126 结算冲击力 136；同一命中里另一个伤害项直接读取
    // 当前掌控 1000，两者合计 1136。若误读当前掌控，冲击力会是
    // 120 + (1000 − 110) = 1010，合计 2010。
    const separated = calculateStaticDamage({
      ...conversionInput(
        generalStat(126, { finalFixed: [874] }),
        generalStat(120),
      ),
      hit: {
        ...conversionInput(generalStat(126), generalStat(120)).hit,
        damageItems: [
          { itemId: "impact-read", damageMultiplier: 1, stat: "impact" },
          {
            itemId: "mastery-read",
            damageMultiplier: 1,
            stat: "anomalyMastery",
          },
        ],
      },
    })
    expect(separated.ok, JSON.stringify(separated)).toBe(true)
    if (separated.ok)
      expect(separated.value.factors.nonCritical.baseDamage).toBeCloseTo(
        1136,
        6,
      )
  })

  it("在后续局内百分比修正下按初始阶段参与结算", () => {
    // 区分 initial-fixed 与 final-fixed：以有依据的局内冲击力百分比修正
    // （如燃狱齿轮天赋：强化特殊技后冲击力提升 10%、最多 2 层）作为
    // GeneralStatInput.finalPercentage 输入。当前实现把常驻转化登记为
    // initial-fixed：(120 + 16) × 1.2 = 163.2；若改为 final-fixed 则为
    // 120 × 1.2 + 16 = 160。本测试锁定现采用阶段；来源文本只证明输入
    // 掌控、阈值与速率，没有独立证明输出阶段（见规范的未验证说明）。
    const result = calculateStaticDamage(
      conversionInput(
        generalStat(126),
        generalStat(120, { finalPercentage: [0.2] }),
      ),
    )
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok)
      expect(result.value.factors.nonCritical.baseDamage).toBeCloseTo(163.2, 6)
  })
})

import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  calculationDataVersion,
  staticPanelRules,
} from "../.generated/calculation-data.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActionCalculationResult,
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
/** 各槽位选取该槽合法的固定主词条；副词条为空。 */
function discs(
  sets: readonly (string | null)[],
): StaticActorConfiguration["driveDiscs"] {
  const mainStatBySlot = {
    1: { attribute: "health" },
    2: { attribute: "attack" },
    3: { attribute: "defense" },
    4: { attribute: "criticalDamage" },
    5: { attribute: "attack" },
    6: { attribute: "attack" },
  } as const
  return Object.fromEntries(
    sets.map((setEntityId, index) => [
      index + 1,
      setEntityId === null
        ? null
        : {
            setEntityId,
            mainStat: mainStatBySlot[(index + 1) as 1 | 2 | 3 | 4 | 5 | 6],
            substats: [],
          },
    ]),
  ) as StaticActorConfiguration["driveDiscs"]
}

const settledPanel = {
  mode: "out-of-combat",
  stats: {
    attack: { unit: "attack-points", value: 1000 },
    criticalRate: { unit: "ratio", value: 0.05 },
    criticalDamage: { unit: "ratio", value: 0.5 },
    penetrationRatio: { unit: "ratio", value: 0 },
  },
  penetrationValue: 0,
  damageBonuses: {
    physical: 0,
    fire: 0,
    ice: 0,
    electric: 0,
    ether: 0,
  },
} as const

async function fixture(
  ids: readonly string[],
  wEngineIds: readonly string[] = [],
): Promise<StaticActionCalculationInput> {
  const agentRecords = await Promise.all(
    ids.map(async (id) => ({
      attributes: await json(`attributes/agents/${id}.json`),
      actions: await json(`skills/agents/${id}.json`),
    })),
  )
  const data: StaticCalculationData = {
    version: calculationDataVersion,
    agents: agentRecords,
    wEngines: await Promise.all(
      wEngineIds.map((engineId) =>
        json(`attributes/w-engines/${engineId}.json`),
      ),
    ),
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
  const attackerId = `entity:actor-${ids[0]!}` as `entity:${string}`
  return {
    data,
    actors: ids.map((id) => ({
      entityId: `entity:actor-${id}`,
      teamId: "team:players",
      agentEntityId: id,
      mindscapeRank: 0 as const,
      coreSkillLevel: 7,
      wEngine: null,
      driveDiscs: emptyDiscs,
      panel: { mode: "equipment" },
    })),
    actorId: attackerId,
    action: resolveAgentAction({
      agent: data.agents[0]!.actions,
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

function settleFromPanel(
  input: StaticActionCalculationInput,
  entityId: string,
): StaticActionCalculationInput {
  const panel = calculate(input).panels.find((p) => p.entityId === entityId)
  if (!panel) throw new Error("missing panel")
  return {
    ...input,
    actors: input.actors.map((actor) =>
      actor.entityId === entityId
        ? {
            ...actor,
            panel: {
              mode: "out-of-combat",
              stats: panel.stats,
              penetrationValue: panel.penetrationValue,
              damageBonuses: panel.damageBonuses,
            },
          }
        : actor,
    ),
  }
}

function calculate(
  input: StaticActionCalculationInput,
): Extract<StaticActionCalculationResult, { kind: "damage" }> {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}

function panelOf(
  input: StaticActionCalculationInput,
  entityId: string,
): StaticActionCalculationResult["panels"][number] {
  const panel = calculate(input).panels.find((p) => p.entityId === entityId)
  if (!panel) throw new Error("missing panel")
  return panel
}

/**
 * 三队原始配装的完整入口：震星迪斯科（31200）、山大王（33200）、原始朋克
 * （31900）此前因缺二件套选项被拒绝；现按覆盖注册表放行，已结算局外面板
 * 与 equipment 重建两种模式都接受原始 4+2 配装。
 */
describe("settled drive-disc set entry", () => {
  const loadouts = [
    [
      "莱特 4 震星 + 2 摇摆",
      "1161",
      ["31200", "31200", "31200", "31200", "31600", "31600"],
    ],
    [
      "橘福福 4 山大王 + 2 震星",
      "1391",
      ["33200", "33200", "33200", "33200", "31200", "31200"],
    ],
    [
      "凯撒 4 原始朋克 + 2 震星",
      "1071",
      ["31900", "31900", "31900", "31900", "31200", "31200"],
    ],
  ] as const

  it.each(loadouts)(
    "accepts the original %s loadout on a settled out-of-combat panel",
    async (_, id, sets) => {
      const input = await fixture([id])
      const result = calculateStaticActionDamage({
        ...input,
        actors: [
          {
            ...input.actors[0]!,
            driveDiscs: discs(sets),
            panel: settledPanel,
          },
        ],
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
    },
  )

  it.each(loadouts)(
    "accepts the original %s loadout on an equipment panel",
    async (_, id, sets) => {
      const input = await fixture([id])
      const result = calculateStaticActionDamage({
        ...input,
        actors: [{ ...input.actors[0]!, driveDiscs: discs(sets) }],
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
    },
  )

  it("accepts a previously blocked teammate loadout while another actor attacks", async () => {
    const input = await fixture(["1161", "1071"])
    const result = calculateStaticActionDamage({
      ...input,
      actors: [
        input.actors[0]!,
        {
          ...input.actors[1]!,
          driveDiscs: discs([
            "31900",
            "31900",
            "31900",
            "31900",
            "31200",
            "31200",
          ]),
          panel: settledPanel,
        },
      ],
    })
    expect(result.ok, JSON.stringify(result)).toBe(true)
  })
})

describe("drive-disc set identity and two-piece coverage", () => {
  it("rejects an unknown set identity at one, two and six pieces", async () => {
    const input = await fixture(["1161"])
    for (const pieces of [1, 2, 6] as const) {
      const result = calculateStaticActionDamage({
        ...input,
        actors: [
          {
            ...input.actors[0]!,
            driveDiscs: discs([
              ...Array.from({ length: pieces }, () => "unknown-set"),
              ...Array.from({ length: 6 - pieces }, () => "33200"),
            ]),
            panel: settledPanel,
          },
        ],
      })
      expect(result, `pieces=${pieces}`).toMatchObject({
        ok: false,
        issues: [
          {
            code: "MISSING_REFERENCE",
            pointer:
              "/bindings/binding:entity:actor-1161:drive-disc:unknown-set",
            message: expect.stringContaining("Unknown drive-disc set identity"),
          },
        ],
      })
    }
  })

  it("applies the shockstar disco two-piece impact once from two pieces upward", async () => {
    const input = await fixture(["1161"])
    const attributes = (await json("attributes/agents/1161.json")) as {
      baseAttributes: { impact: { value: number } }
      coreAttributeBonuses: Record<
        string,
        { attribute: string; operation: string; value: number }[]
      >
    }
    // initial-percentage 作用于基础阶段值：基础属性 + 核心同属性的 base-add。
    const percentageBase =
      attributes.baseAttributes.impact.value +
      attributes.coreAttributeBonuses["7"]!.filter(
        (bonus) =>
          bonus.attribute === "impact" && bonus.operation === "base-add",
      ).reduce((sum, bonus) => sum + bonus.value, 0)
    const impactAt = (sets: readonly (string | null)[]) =>
      panelOf(
        {
          ...input,
          actors: [{ ...input.actors[0]!, driveDiscs: discs(sets) }],
        },
        "entity:actor-1161",
      ).stats.impact!.value
    // 单件不触发二件套；驱动盘主词条不含冲击力，冲击力面板保持一致。
    expect(impactAt(["31200", null, null, null, null, null])).toBe(
      impactAt([null, null, null, null, null, null]),
    )
    const one = impactAt(["31200", "33200", "33200", "33200", "33200", "33200"])
    const two = impactAt(["31200", "31200", "33200", "33200", "33200", "33200"])
    const six = impactAt(Array.from({ length: 6 }, () => "31200"))
    expect(two - one).toBeCloseTo(percentageBase * 0.06, 9)
    expect(six - one).toBeCloseTo(percentageBase * 0.06, 9)
  })

  it("applies the soul rock two-piece defense percentage once", async () => {
    const input = await fixture(["1161"])
    const attributes = (await json("attributes/agents/1161.json")) as {
      baseAttributes: { defense: { value: number } }
      coreAttributeBonuses: Record<
        string,
        { attribute: string; operation: string; value: number }[]
      >
    }
    const percentageBase =
      attributes.baseAttributes.defense.value +
      attributes.coreAttributeBonuses["7"]!.filter(
        (bonus) =>
          bonus.attribute === "defense" && bonus.operation === "base-add",
      ).reduce((sum, bonus) => sum + bonus.value, 0)
    const defenseAt = (sets: readonly (string | null)[]) =>
      panelOf(
        {
          ...input,
          actors: [{ ...input.actors[0]!, driveDiscs: discs(sets) }],
        },
        "entity:actor-1161",
      ).stats.defense!.value
    // 单件不触发二件套；槽 1 主词条为生命，防御面板保持一致。
    expect(defenseAt(["31500", null, null, null, null, null])).toBe(
      defenseAt([null, null, null, null, null, null]),
    )
    const one = defenseAt([
      "31500",
      "33200",
      "33200",
      "33200",
      "33200",
      "33200",
    ])
    const two = defenseAt([
      "31500",
      "31500",
      "33200",
      "33200",
      "33200",
      "33200",
    ])
    const six = defenseAt(Array.from({ length: 6 }, () => "31500"))
    expect(two - one).toBeCloseTo(percentageBase * 0.16, 9)
    expect(six - one).toBeCloseTo(percentageBase * 0.16, 9)
  })

  it("keeps the equipment and settled panels equivalent without re-adding the two-piece stats", async () => {
    const input = await fixture(["1161"])
    const withSet = {
      ...input,
      actors: [
        {
          ...input.actors[0]!,
          driveDiscs: discs([
            "31200",
            "31200",
            "31500",
            "31500",
            "33200",
            "33200",
          ]),
        },
      ],
    }
    const equipment = calculate(withSet)
    const settledInput = settleFromPanel(withSet, "entity:actor-1161")
    const settled = calculate(settledInput)
    expect(settled.totals.nonCritical).toBeCloseTo(
      equipment.totals.nonCritical,
      9,
    )
    expect(settled.totals.expected).toBeCloseTo(equipment.totals.expected, 9)
    // 已结算输入包含二件套属性：面板逐项一致，再次结算不得重复叠加。
    expect(settled.panels[0]!.stats).toEqual(equipment.panels[0]!.stats)
    const settledAgain = calculate(
      settleFromPanel(settledInput, "entity:actor-1161"),
    )
    expect(settledAgain.totals.nonCritical).toBeCloseTo(
      settled.totals.nonCritical,
      9,
    )
    expect(settledAgain.panels[0]!.stats).toEqual(equipment.panels[0]!.stats)
  })

  it("still applies the declared conditional two-piece rules on settled panels", async () => {
    const input = await fixture(["1161"])
    const action = input.data.agents[0]!.actions.actions.find(
      (a) =>
        a.calculation.kind === "damage" &&
        a.skillCategory === "basic" &&
        a.inputs.length === 0,
    )
    if (!action) throw new Error("no basic action")
    const base = {
      ...input,
      action: resolveAgentAction({
        agent: input.data.agents[0]!.actions,
        actionId: action.actionId,
        mindscapeRank: 0,
        levels: { basic: { mode: "effective", value: 12 } },
      }),
    } as StaticActionCalculationInput
    const configured = (sets: readonly (string | null)[]) =>
      ({
        ...base,
        actors: [
          { ...base.actors[0]!, driveDiscs: discs(sets), panel: settledPanel },
        ],
      }) as StaticActionCalculationInput
    const withSet = calculate(
      configured(["33300", "33300", "33200", "33200", "33200", "33200"]),
    )
    const without = calculate(
      configured(["33200", "33200", "33200", "33200", "33200", "33200"]),
    )
    // 33300（拂晓生花）二件套是普通攻击增伤：已结算模式仍按命中筛选应用一次。
    expect(withSet.totals.nonCritical).toBeGreaterThan(
      without.totals.nonCritical,
    )
    expect(
      withSet.segments[0]!.damage.evaluation.contributions.filter(
        (c) =>
          c.address.kind === "factor" && c.address.channel === "damage-bonus",
      ),
    ).toHaveLength(1)
  })

  it("rejects selecting the declared out-of-scope two-piece options", async () => {
    const input = await fixture(["1071"])
    const result = calculateStaticActionDamage({
      ...input,
      actors: [
        {
          ...input.actors[0]!,
          driveDiscs: discs([
            "31900",
            "31900",
            "31900",
            "31900",
            "31200",
            "31200",
          ]),
          panel: settledPanel,
        },
      ],
      selections: [
        {
          holderId: "entity:actor-1071",
          optionId: "nanoka:drive-discs:31900:two-piece-shield-value",
          layers: 1,
        },
      ],
    })
    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          code: "INVALID_INPUT",
          message: expect.stringContaining("formula-out-of-scope"),
        },
      ],
    })
  })

  it("keeps rejecting the loss of necessary rules or coverage records", async () => {
    const shockstar = await fixture(["1161"])
    const withShockstar = {
      ...shockstar,
      actors: [
        {
          ...shockstar.actors[0]!,
          driveDiscs: discs([
            "31200",
            "31200",
            "33200",
            "33200",
            "33200",
            "33200",
          ]),
          panel: settledPanel,
        },
      ],
    }
    const tamper = (
      mutate: (data: StaticCalculationData) => StaticCalculationData,
    ) =>
      calculateStaticActionDamage({
        ...withShockstar,
        data: mutate(withShockstar.data),
      })
    // 覆盖注册表声明“自动选中”但选项被删：仍是必要规则缺失。
    expect(
      tamper((data) => ({
        ...data,
        panelRules: {
          ...data.panelRules,
          twoPieceOptions: data.panelRules.twoPieceOptions.filter(
            (o) => o.sourceEntityId !== "31200",
          ),
        },
      })),
    ).toMatchObject({
      ok: false,
      issues: [
        {
          code: "MISSING_REFERENCE",
          message: expect.stringContaining("Missing two-piece definitions"),
        },
      ],
    })
    // 注册表条目被删：套装身份回到未知身份拒绝。
    expect(
      tamper((data) => ({
        ...data,
        panelRules: {
          ...data.panelRules,
          driveDiscSets: data.panelRules.driveDiscSets.filter(
            (s) => s.sourceEntityId !== "31200",
          ),
        },
      })),
    ).toMatchObject({
      ok: false,
      issues: [
        {
          code: "MISSING_REFERENCE",
          message: expect.stringContaining("Unknown drive-disc set identity"),
        },
      ],
    })
    // 越界声明的套装被注入规则选项：注册表与目录选项矛盾，按数据不一致拒绝。
    const protoPunk = await fixture(["1071"])
    const withProtoPunk = {
      ...protoPunk,
      actors: [
        {
          ...protoPunk.actors[0]!,
          driveDiscs: discs([
            "31900",
            "31900",
            "31900",
            "31900",
            "31200",
            "31200",
          ]),
          panel: settledPanel,
        },
      ],
    }
    const soulRockOptions = protoPunk.data.panelRules.twoPieceOptions.filter(
      (o) => o.sourceEntityId === "31500",
    )
    expect(
      calculateStaticActionDamage({
        ...withProtoPunk,
        data: {
          ...withProtoPunk.data,
          panelRules: {
            ...withProtoPunk.data.panelRules,
            twoPieceOptions: [
              ...withProtoPunk.data.panelRules.twoPieceOptions,
              ...soulRockOptions.map((o) => ({
                ...o,
                sourceEntityId: "31900",
              })),
            ],
          },
        },
      }),
    ).toMatchObject({
      ok: false,
      issues: [
        {
          code: "CONTEXT_MISMATCH",
          message: expect.stringContaining("coverage disagrees"),
        },
      ],
    })
  })
})

/**
 * 青溟笼舍（14137）贯穿增伤的完整入口回归：玄墨继承以太条件、两层按层取值、
 * 暴击率固定增益不随层数翻倍，与目录级用例共同覆盖“按描述纠错”的行为。
 */
describe("qingming birdcage pierce layers through the complete entry", () => {
  const attacker = "entity:actor-1371"
  async function yixuanUltimateInput(): Promise<StaticActionCalculationInput> {
    const input = await fixture(["1371"], ["14137"])
    const actions = input.data.agents[0]!.actions
    return {
      ...input,
      actors: [
        {
          ...input.actors[0]!,
          wEngine: { entityId: "14137", refinement: 1, eligible: true },
        },
      ],
      action: resolveAgentAction({
        agent: actions,
        actionId: "action:agent:1371:action:0015",
        mindscapeRank: 0,
        levels: { chain: { mode: "effective", value: 12 } },
      }),
    }
  }
  const pierceOption =
    "w-engines:Qingming_Birdcage:refinement:blk-legacy:eff-ms1r9equ-l7imtb"
  const critOption =
    "w-engines:Qingming_Birdcage:refinement:blk-legacy:legacy-self-critRate"

  it.each([
    ["zero layers", 0, 1],
    ["one layer", 1, 1.1],
    ["two layers", 2, 1.2],
  ] as const)(
    "scales the inherited auric-ink sheer pierce bonus at %s",
    async (_, layers, sheerFactor) => {
      const result = calculate({
        ...(await yixuanUltimateInput()),
        selections: [{ holderId: attacker, optionId: pierceOption, layers }],
      })
      expect(
        result.segments[0]!.damage.factors.nonCritical.sheerDamageBonus,
      ).toBeCloseTo(sheerFactor, 12)
      // 末端乘区：非暴击随贯穿增伤按层放大，不重复叠加。
      const zero = calculate({
        ...(await yixuanUltimateInput()),
        selections: [{ holderId: attacker, optionId: pierceOption, layers: 0 }],
      })
      expect(
        zero.segments[0]!.damage.factors.nonCritical.sheerDamageBonus,
      ).toBe(1)
      expect(result.totals.nonCritical / zero.totals.nonCritical).toBeCloseTo(
        sheerFactor,
        10,
      )
    },
  )

  it("rejects an illegal layer count at the complete entry", async () => {
    const result = calculateStaticActionDamage({
      ...(await yixuanUltimateInput()),
      selections: [{ holderId: attacker, optionId: pierceOption, layers: 3 }],
    })
    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: "INVALID_INPUT", pointer: "/selections/0/layers" }],
    })
  })

  it("keeps the fixed critical-rate gain independent of pierce layers", async () => {
    const withBoth = calculate({
      ...(await yixuanUltimateInput()),
      selections: [
        { holderId: attacker, optionId: critOption, layers: 1 },
        { holderId: attacker, optionId: pierceOption, layers: 2 },
      ],
    })
    const withoutCrit = calculate({
      ...(await yixuanUltimateInput()),
      selections: [{ holderId: attacker, optionId: pierceOption, layers: 2 }],
    })
    expect(
      withBoth.segments[0]!.damage.criticalRate -
        withoutCrit.segments[0]!.damage.criticalRate,
    ).toBeCloseTo(0.2, 12)
  })
})

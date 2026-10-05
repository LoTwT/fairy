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
function equippedDisc(
  setEntityId: string,
  attribute: "health" | "attack" | "defense",
) {
  return { setEntityId, mainStat: { attribute }, substats: [] }
}

async function fixture(
  id = "1121",
  mindscapeRank: StaticActorConfiguration["mindscapeRank"] = 0,
): Promise<StaticActionCalculationInput> {
  const attributes = await json(`attributes/agents/${id}.json`)
  const actions = await json(`skills/agents/${id}.json`)
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
        agentEntityId: id,
        mindscapeRank,
        coreSkillLevel: 7,
        wEngine: null,
        driveDiscs: emptyDiscs,
        panel: { mode: "equipment" },
      },
    ],
    actorId: "entity:actor",
    action: resolveAgentAction({
      agent: actions,
      actionId: action.actionId,
      mindscapeRank,
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
function calculate(
  input: StaticActionCalculationInput,
): Extract<StaticActionCalculationResult, { kind: "damage" }> {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}
function manual(
  actor: StaticActorConfiguration,
  panel: StaticActionCalculationResult["panels"][number],
): StaticActorConfiguration {
  return {
    ...actor,
    panel: {
      mode: "out-of-combat",
      stats: panel.stats,
      penetrationValue: panel.penetrationValue,
      damageBonuses: panel.damageBonuses,
    },
  }
}

describe("single-element aggregate action consumption", () => {
  const damageBonuses = {
    physical: 0.11,
    fire: 0.22,
    electric: 0.33,
    ice: 0.44,
    ether: 0.55,
  }
  const resistances = {
    physical: 0.1,
    fire: 0.2,
    electric: 0.3,
    ice: 0.4,
    ether: 0.5,
  }

  async function aggregateInput(
    id: string,
    suffix: string,
    mindscapeRank: StaticActorConfiguration["mindscapeRank"] = 0,
  ): Promise<StaticActionCalculationInput> {
    const input = await fixture(id, mindscapeRank)
    const agent = input.data.agents[0]!.actions
    const action = agent.actions.find(
      (entry) => entry.actionId === `action:agent:${id}:action:${suffix}`,
    )!
    return {
      ...input,
      action: resolveAgentAction({
        agent,
        actionId: action.actionId,
        mindscapeRank,
        levels: { [action.levelGroup]: { mode: "effective", value: 12 } },
      }),
      actors: [
        {
          ...input.actors[0]!,
          panel: {
            mode: "out-of-combat",
            stats: {
              attack: { unit: "attack-points", value: 1000 },
              criticalRate: { unit: "ratio", value: 0 },
              criticalDamage: { unit: "ratio", value: 0.5 },
              penetrationRatio: { unit: "ratio", value: 0 },
            },
            penetrationValue: 0,
            damageBonuses,
          },
        },
      ],
      target: { ...input.target, baseDefense: 0, resistances },
    }
  }

  it.each([
    ["1151", "0006", "fire", 1.138],
    ["1181", "0003", "electric", 1.112],
    ["1181", "0007", "physical", 0.81],
    ["1241", "0003", "ether", 0.871],
    ["1291", "0008", "ice", 0.871],
  ] as const)(
    "uses only the recorded %s:%s element %s for the complete multiplier",
    async (id, suffix, element, multiplier) => {
      const input = await aggregateInput(id, suffix)
      const result = calculate(input)
      const expected =
        1000 *
        multiplier *
        (1 + damageBonuses[element]) *
        (1 - resistances[element])
      expect(result.segments).toHaveLength(1)
      expect(result.totals.nonCritical).toBeCloseTo(expected, 10)
      expect(result.totals.critical).toBeCloseTo(expected * 1.5, 10)
      expect(result.totals.expected).toBeCloseTo(expected, 10)
      expect(result.totals.displayedNonCritical).toBeNull()
      expect(result.totals.displayedCritical).toBeNull()
      const unrelated = element === "physical" ? "electric" : "physical"
      expect(
        calculate({
          ...input,
          target: {
            ...input.target,
            resistances: { ...resistances, [unrelated]: 0.99 },
          },
        }).totals,
      ).toEqual(result.totals)
      expect(
        calculateStaticActionDamage({ ...input, requireIndividualHits: true }),
      ).toMatchObject({ ok: false })
    },
  )

  it.each([
    ["1151", "0006", true],
    ["1171", "0001", false],
    ["1171", "0016", false],
    ["1241", "0002", false],
    ["1331", "0017", false],
    ["1341", "0015", false],
  ] as const)(
    "matches the basic bonus only to a basic aggregate: %s:%s",
    async (id, suffix, isBasic) => {
      const input = await aggregateInput(id, suffix)
      if (!input.action.ok || input.action.calculation.kind !== "damage")
        throw new Error("fixture")
      const element = input.action.calculation.segments[0]!
        .element as keyof typeof resistances
      const expectedExtra = isBasic
        ? 1000 *
          input.action.sourceDamageMultiplier! *
          0.15 *
          (1 - resistances[element])
        : 0
      const plain = calculate(input)
      const withSet = (setEntityId: string) =>
        calculate({
          ...input,
          actors: [
            {
              ...input.actors[0]!,
              driveDiscs: {
                ...emptyDiscs,
                1: { setEntityId },
                2: { setEntityId },
              },
            },
          ],
        })
      expect(
        withSet("33300").totals.nonCritical - plain.totals.nonCritical,
      ).toBeCloseTo(expectedExtra, 10)
      if (isBasic) expect(withSet("32900").totals).toEqual(plain.totals)
    },
  )

  // 固定 ZZZ-HP 的 /skillSubcategories/42、/51 与对应 M1 / 核心增益；
  // 倍率直接取 Nanoka 万分比整数，期望不从生产目标或增益规则反推。
  it.each([
    [
      "1161",
      "0021",
      1,
      8.71,
      "agents:lighter:mindscape:1:blk-legacy:eff-ms4axp99-6j88yd",
      0.3,
    ],
    [
      "1161",
      "0020",
      1,
      2.396,
      "agents:lighter:mindscape:1:blk-legacy:eff-ms4axp99-6j88yd",
      0,
    ],
    [
      "1301",
      "0011",
      0,
      3.168,
      "agents:orphie%26magus:mindscape:0:blk-legacy:eff-ms4hvpzg-frlpi8",
      0.85,
    ],
    [
      "1301",
      "0010",
      0,
      3.642,
      "agents:orphie%26magus:mindscape:0:blk-legacy:eff-ms4hvpzg-frlpi8",
      0,
    ],
  ] as const)(
    "matches the selected finisher or follow-up bonus only to its action: %s:%s",
    async (id, suffix, mindscapeRank, multiplier, optionId, bonus) => {
      const input = await aggregateInput(id, suffix, mindscapeRank)
      const plain = calculate(input)
      const selected = calculate({
        ...input,
        selections: [{ holderId: input.actorId, optionId, layers: 1 }],
      })
      expect(plain.totals.nonCritical).toBeCloseTo(
        1000 * multiplier * (1 + damageBonuses.fire) * (1 - resistances.fire),
        10,
      )
      expect(selected.totals.nonCritical).toBeCloseTo(
        1000 *
          multiplier *
          (1 + damageBonuses.fire + bonus) *
          (1 - resistances.fire),
        10,
      )
      const contributions =
        selected.segments[0]!.damage.evaluation.contributions.filter((entry) =>
          entry.origin.effectId.includes(optionId.split(":").at(-1)!),
        )
      expect(contributions).toHaveLength(bonus > 0 ? 1 : 0)
      if (bonus > 0) expect(contributions[0]!.value.value).toBe(bonus)
    },
  )

  it("keeps Orphie's fire blade basic classification alongside its follow-up identity", async () => {
    const input = await aggregateInput("1301", "0011")
    const result = calculate({
      ...input,
      actors: [
        {
          ...input.actors[0]!,
          driveDiscs: {
            ...emptyDiscs,
            1: { setEntityId: "32900" },
            2: { setEntityId: "32900" },
            3: { setEntityId: "33300" },
            4: { setEntityId: "33300" },
          },
        },
      ],
    })
    expect(result.totals.nonCritical).toBeCloseTo(
      1000 *
        3.168 *
        (1 + damageBonuses.fire + 0.15 + 0.15) *
        (1 - resistances.fire),
      10,
    )
  })

  it("rejects forged classification, targets, follow-up identity and segment structure", async () => {
    const input = await aggregateInput("1171", "0001")
    if (!input.action.ok || input.action.calculation.kind !== "damage")
      throw new Error("fixture")
    const action = input.action
    const segments = input.action.calculation.segments
    const altered = [
      { ...action, skillCategory: "basic" as const },
      { ...action, skillTargetIds: ["zzz-hp:skill:all-dodge-ms0dnpmr"] },
      { ...action, skillTags: ["zzz-hp:follow-up"] },
      ...[
        { repeat: 2 },
        { granularity: "individual" as const },
        { element: "physical" as const },
      ].map((patch) => ({
        ...action,
        calculation: {
          kind: "damage" as const,
          segments: segments.map((segment) => ({ ...segment, ...patch })),
        },
      })),
    ]
    for (const forged of altered)
      expect(
        calculateStaticActionDamage({ ...input, action: forged }),
      ).toMatchObject({
        ok: false,
        issues: [{ code: "CONTEXT_MISMATCH" }],
      })
  })

  it("still refuses Lighter per-hit additions on a newly available basic aggregate", async () => {
    const input = await aggregateInput("1161", "0006", 6)
    calculate(input)
    const result = calculateStaticActionDamage({
      ...input,
      selections: [
        {
          holderId: input.actorId,
          optionId:
            "agents:lighter:mindscape:6:blk-ms4b3uc2-5gulzo:eff-ms4b3uc2-oeaiao",
          layers: 1,
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.message.includes("per-hit")),
      ).toBe(true)
  })
})

describe("Lucy guard-pig panel proxy consumption", () => {
  // 固定 ZZZ-HP 露西面板代算约定：四条动作只消费调用方配置的露西面板，
  // 期望值由 Nanoka 万分比曲线与受控面板独立算出，不从生产转换器反推。
  const rows = [
    ["0011", 0.925, 1.86, 2.2],
    ["0012", 1.275, 2.551, 3.015],
    ["0013", 1.75, 3.51, 4.15],
    ["0014", 2.5, 5.008, 5.92],
  ] as const
  const controlledBonuses = { fire: 0.22, physical: 0.11 }
  const controlledResistances = { fire: 0.2, physical: 0.1 }
  const fireZone = 1 + controlledBonuses.fire
  const fireMitigation = 1 - controlledResistances.fire
  const cheerFixedOption = "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk"
  const cheerLinearOption =
    "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r"
  const cheerFixedEffect =
    "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0"
  const cheerLinearEffect =
    "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0"
  const cheerSourceName = `${cheerLinearEffect}:source`
  const mindscapeFourOption =
    "agents:lucy:mindscape:4:blk-legacy:legacy-team-critDmg"

  async function pigInput(
    suffix: string,
    options: {
      rank?: StaticActorConfiguration["mindscapeRank"]
      level?: number
      specialLevel?: number
      coreSkillLevel?: StaticActorConfiguration["coreSkillLevel"]
      criticalRate?: number
      sourceAttack?: number
      selections?: StaticActionCalculationInput["selections"]
      damageBonuses?: Record<string, number>
      resistances?: Record<string, number>
    } = {},
  ): Promise<StaticActionCalculationInput> {
    const rank = options.rank ?? 0
    const input = await fixture("1151", rank)
    const actions = input.data.agents[0]!.actions
    const actionId = `action:agent:1151:action:${suffix}`
    const resolved = resolveAgentAction({
      agent: actions,
      actionId,
      mindscapeRank: rank,
      levels: { basic: { mode: "effective", value: options.level ?? 12 } },
    })
    if (!resolved.ok || resolved.calculation.kind !== "damage")
      throw new Error(`expected a resolved guard-pig action: ${suffix}`)
    return {
      ...input,
      action: resolved,
      actors: [
        {
          ...input.actors[0]!,
          coreSkillLevel: options.coreSkillLevel ?? 7,
          // 只显式提供特殊技最终等级，供加油选项读取；基础等级由动作解析上下文校验。
          skillLevels: {
            special: {
              mode: "effective",
              value: options.specialLevel ?? 12,
            },
          },
          panel: {
            mode: "out-of-combat",
            stats: {
              attack: { unit: "attack-points", value: 1000 },
              criticalRate: {
                unit: "ratio",
                value: options.criticalRate ?? 0,
              },
              criticalDamage: { unit: "ratio", value: 0.5 },
              penetrationRatio: { unit: "ratio", value: 0 },
            },
            penetrationValue: 0,
            damageBonuses: options.damageBonuses ?? controlledBonuses,
          },
        },
      ],
      target: {
        ...input.target,
        baseDefense: 0,
        resistances: options.resistances ?? controlledResistances,
      },
      selections: options.selections ?? [],
      inputs:
        options.sourceAttack === undefined
          ? []
          : [
              {
                bindingId: "binding:entity:actor:agent:1151",
                name: cheerSourceName,
                value: {
                  unit: "attack-points",
                  value: options.sourceAttack,
                },
              },
            ],
    }
  }

  it.each(rows)(
    "consumes %s as one fire aggregate from the acting Lucy panel at levels 1/12/16",
    async (suffix, level1, level12, level16) => {
      for (const [level, rank, multiplier] of [
        [1, 0, level1],
        [12, 0, level12],
        [16, 6, level16],
      ] as const) {
        const input = await pigInput(suffix, { level, rank })
        const result = calculate(input)
        const expected = 1000 * multiplier * fireZone * fireMitigation
        // 显式次数一次：单段、单次重复，不自动乘三只小猪。
        expect(result.segments).toHaveLength(1)
        expect(result.totals.nonCritical).toBeCloseTo(expected, 10)
        expect(result.totals.critical).toBeCloseTo(expected * 1.5, 10)
        expect(result.totals.expected).toBeCloseTo(expected, 10)
        expect(result.totals.displayedNonCritical).toBeNull()
        expect(result.totals.displayedCritical).toBeNull()
        expect(
          calculateStaticActionDamage({
            ...input,
            requireIndividualHits: true,
          }),
        ).toMatchObject({ ok: false })
      }
    },
  )

  it.each(rows)(
    "uses the acting Lucy critical rate for the expectation: %s",
    async (suffix) => {
      const noCrit = calculate(await pigInput(suffix))
      const withCrit = calculate(await pigInput(suffix, { criticalRate: 0.5 }))
      // 非暴击与暴击事件数值只由面板攻击、增伤、抗性与暴伤决定，与暴击率无关；
      // 数学期望按露西面板 CR×CD 提高 25%，不引入小猪条件暴击继承。
      expect(withCrit.totals.nonCritical).toBeCloseTo(
        noCrit.totals.nonCritical,
        10,
      )
      expect(withCrit.totals.critical).toBeCloseTo(
        noCrit.totals.nonCritical * 1.5,
        10,
      )
      expect(noCrit.totals.expected).toBeCloseTo(noCrit.totals.nonCritical, 10)
      expect(withCrit.totals.expected).toBeCloseTo(
        noCrit.totals.nonCritical * 1.25,
        10,
      )
    },
  )

  it("reads the fire bonus and fire resistance, not the physical entries", async () => {
    const input = await pigInput("0011")
    const base = calculate(input)
    const shifted = calculate(
      await pigInput("0011", {
        damageBonuses: { fire: 0.22, physical: 0.99 },
        resistances: { fire: 0.2, physical: 0.99 },
      }),
    )
    expect(shifted.totals).toEqual(base.totals)
    const bonusOff = calculate(
      await pigInput("0011", { damageBonuses: { fire: 0, physical: 0.99 } }),
    )
    expect(bonusOff.totals.nonCritical).toBeCloseTo(
      1000 * 1.86 * fireMitigation,
      10,
    )
    const resistanceUp = calculate(
      await pigInput("0011", { resistances: { fire: 0.6, physical: 0.1 } }),
    )
    expect(resistanceUp.totals.nonCritical).toBeCloseTo(
      1000 * 1.86 * fireZone * 0.4,
      10,
    )
    // 登记火属性后，面板缺火伤加成或目标缺火抗必须报错，而不是回退到其他属性。
    const actor = input.actors[0]!
    if (actor.panel.mode !== "out-of-combat") throw new Error("panel")
    expect(
      calculateStaticActionDamage({
        ...input,
        actors: [
          {
            ...actor,
            panel: { ...actor.panel, damageBonuses: { physical: 0.11 } },
          },
        ],
      }),
    ).toMatchObject({ ok: false })
    expect(
      calculateStaticActionDamage({
        ...input,
        target: { ...input.target, resistances: { physical: 0.1 } },
      }),
    ).toMatchObject({ ok: false })
  })

  it.each(rows)(
    "matches the basic set bonus once and never a follow-up bonus: %s",
    async (suffix, _level1, level12) => {
      const input = await pigInput(suffix)
      const base = calculate(input)
      const withSet = (setEntityId: string) =>
        calculate({
          ...input,
          actors: [
            {
              ...input.actors[0]!,
              driveDiscs: {
                ...emptyDiscs,
                1: { setEntityId },
                2: { setEntityId },
              },
            },
          ],
        })
      expect(
        withSet("33300").totals.nonCritical - base.totals.nonCritical,
      ).toBeCloseTo(1000 * level12 * 0.15 * fireMitigation, 10)
      expect(withSet("32900").totals).toEqual(base.totals)
    },
  )

  it("applies the selected cheer options once to the acting Lucy panel", async () => {
    const closed = calculate(await pigInput("0011"))
    const selections = [cheerFixedOption, cheerLinearOption].map(
      (optionId) => ({
        holderId: "entity:actor" as const,
        optionId,
        layers: 1,
      }),
    )
    const withCheer = calculate(
      await pigInput("0011", {
        selections,
        specialLevel: 12,
        sourceAttack: 2000,
      }),
    )
    const cheerEffects = [cheerFixedEffect, cheerLinearEffect]
    expect(
      closed.segments[0]!.damage.evaluation.contributions.filter((entry) =>
        cheerEffects.includes(entry.origin.effectId),
      ),
    ).toEqual([])
    // L12：固定 40+4×12=88 点 + 转换 min(2000×(0.13+0.008×12), 560−4×12)=452 点，合计 540 点。
    expect(withCheer.totals.nonCritical).toBeCloseTo(
      (1000 + 540) * 1.86 * fireZone * fireMitigation,
      10,
    )
    const contributions =
      withCheer.segments[0]!.damage.evaluation.contributions.filter((entry) =>
        cheerEffects.includes(entry.origin.effectId),
      )
    expect(contributions).toHaveLength(2)
    expect(
      contributions.reduce((total, entry) => total + entry.value.value, 0),
    ).toBe(540)
    // 核心 1 与核心 7 相同：不额外计入小猪专属的核心 140%—200% 强化。
    const coreOne = calculate(
      await pigInput("0011", {
        selections,
        specialLevel: 12,
        sourceAttack: 2000,
        coreSkillLevel: 1,
      }),
    )
    expect(coreOne.totals).toEqual(withCheer.totals)
  })

  it("gates the mindscape-four crit damage option and never inherits it implicitly", async () => {
    const rankZero = calculate(await pigInput("0011"))
    expect(
      calculateStaticActionDamage({
        ...(await pigInput("0011")),
        selections: [
          {
            holderId: "entity:actor" as const,
            optionId: mindscapeFourOption,
            layers: 1,
          },
        ],
      }),
    ).toMatchObject({ ok: false, issues: [{ code: "CONTEXT_MISMATCH" }] })
    const rankFour = calculate(await pigInput("0011", { rank: 4 }))
    // 仅配置影画 4、未显式选择时不自动获得 +10% 暴击伤害。
    expect(rankFour.totals.nonCritical).toBeCloseTo(
      rankZero.totals.nonCritical,
      10,
    )
    expect(rankFour.totals.critical).toBeCloseTo(
      rankFour.totals.nonCritical * 1.5,
      10,
    )
    const selected = calculate({
      ...(await pigInput("0011", { rank: 4 })),
      selections: [
        {
          holderId: "entity:actor" as const,
          optionId: mindscapeFourOption,
          layers: 1,
        },
      ],
    })
    expect(selected.totals.nonCritical).toBeCloseTo(
      rankFour.totals.nonCritical,
      10,
    )
    expect(selected.totals.critical).toBeCloseTo(
      rankFour.totals.nonCritical * 1.6,
      10,
    )
  })
})

describe("Velina Condensed Cyclone direct damage", () => {
  // 具名 ZZZ-HP 维琳娜气旋直伤约定：uncategorized 分类、微域专属目标、单段风属性合计；
  // 期望值由 Nanoka 万分比曲线与受控面板独立算出，不从生产转换器或被测输出反推。
  const actionId = "action:agent:1561:action:0021"
  const wideTarget = "zzz-hp:skill:velina-special-ms4tnzvq"
  const microReleaseOption =
    "agents:velina:mindscape:0:blk-legacy:legacy-team-anomalyReleaseMult"
  const wideReleaseOption =
    "agents:velina:mindscape:0:blk-legacy:eff-ms4tphp6-6zyuxs"
  const microReleaseEffect =
    "agent:1561:zzz-hp:legacy-team-anomalyReleaseMult:blk-legacy:mindscape:0"
  const wideReleaseEffect =
    "agent:1561:zzz-hp:eff-ms4tphp6-6zyuxs:blk-legacy:mindscape:0"
  const coreBonusOption =
    "agents:velina:mindscape:0:blk-legacy:legacy-self-dmgBonus"
  const coreBonusEffect =
    "agent:1561:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0"

  interface MicroOptions {
    rank?: StaticActorConfiguration["mindscapeRank"]
    level?: { mode: "trained" | "effective"; value: number }
    coreSkillLevel?: StaticActorConfiguration["coreSkillLevel"]
    criticalRate?: number
    energyRegen?: number
    damageBonuses?: Record<string, number>
    resistances?: Record<string, number>
    selections?: StaticActionCalculationInput["selections"]
    skillLevels?: StaticActorConfiguration["skillLevels"]
  }

  async function microInput(
    options: MicroOptions = {},
  ): Promise<StaticActionCalculationInput> {
    const rank = options.rank ?? 0
    const input = await fixture("1561", rank)
    const actions = input.data.agents[0]!.actions
    const resolved = resolveAgentAction({
      agent: actions,
      actionId,
      mindscapeRank: rank,
      levels: {
        special: options.level ?? { mode: "effective", value: 12 },
      },
    })
    if (!resolved.ok || resolved.calculation.kind !== "damage")
      throw new Error("expected a resolved micro-domain action")
    return {
      ...input,
      action: resolved,
      actors: [
        {
          ...input.actors[0]!,
          coreSkillLevel: options.coreSkillLevel ?? 7,
          ...(options.skillLevels === undefined
            ? {}
            : { skillLevels: options.skillLevels }),
          panel: {
            mode: "out-of-combat",
            stats: {
              attack: { unit: "attack-points", value: 1000 },
              criticalRate: {
                unit: "ratio",
                value: options.criticalRate ?? 0,
              },
              criticalDamage: { unit: "ratio", value: 0.5 },
              penetrationRatio: { unit: "ratio", value: 0 },
              ...(options.energyRegen === undefined
                ? {}
                : {
                    energyRegen: {
                      unit: "energy-per-second" as const,
                      value: options.energyRegen,
                    },
                  }),
            },
            penetrationValue: 0,
            damageBonuses: options.damageBonuses ?? { wind: 0 },
          },
        },
      ],
      target: {
        ...input.target,
        baseDefense: 0,
        resistances: options.resistances ?? { wind: 0 },
      },
      selections: options.selections ?? [],
    }
  }

  it("consumes levels 1/12/16 as one wind aggregate with null displayed totals", async () => {
    for (const [level, rank, expected] of [
      [1, 0, 325],
      [12, 0, 655],
      [16, 5, 775],
    ] as const) {
      const input = await microInput({
        rank,
        level: { mode: "effective", value: level },
      })
      const result = calculate(input)
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0]!.granularity).toBe("aggregate")
      expect(result.segments[0]!.damage.factors.nonCritical.resistance).toBe(1)
      expect(result.totals.nonCritical).toBeCloseTo(expected, 10)
      expect(result.totals.critical).toBeCloseTo(expected * 1.5, 10)
      expect(result.totals.expected).toBeCloseTo(expected, 10)
      expect(result.totals.displayedNonCritical).toBeNull()
      expect(result.totals.displayedCritical).toBeNull()
    }
  })

  it("reads only the wind bonus and wind resistance", async () => {
    const input = await microInput({
      damageBonuses: { wind: 0.2 },
      resistances: { wind: 0.1 },
    })
    const result = calculate(input)
    expect(result.totals.nonCritical).toBeCloseTo(707.4, 10)
    const shifted = calculate(
      await microInput({
        damageBonuses: { wind: 0.2, physical: 0.99 },
        resistances: { wind: 0.1, physical: 0.99 },
      }),
    )
    expect(shifted.totals).toEqual(result.totals)
  })

  it("does not append the dissipation release and keeps the aggregate guard clear", async () => {
    const plain = calculate(await microInput())
    expect(plain.totals.nonCritical).toBeCloseTo(655, 10)
    for (const options of [
      [microReleaseOption],
      [wideReleaseOption],
      [microReleaseOption, wideReleaseOption],
    ] as const) {
      const selected = calculate(
        await microInput({
          selections: options.map((optionId) => ({
            holderId: "entity:actor",
            optionId,
            layers: 1,
          })),
        }),
      )
      expect(selected.totals).toEqual(plain.totals)
      expect(
        selected.segments[0]!.damage.evaluation.contributions.filter((entry) =>
          [microReleaseEffect, wideReleaseEffect].includes(
            entry.origin.effectId,
          ),
        ),
      ).toEqual([])
      expect(
        selected.segments[0]!.damage.evaluation.contributions.some(
          (entry) =>
            entry.address.kind === "factor" &&
            entry.address.channel === "base-multiplier-addition",
        ),
      ).toBe(false)
    }
  })
  it("applies the selected core damage bonus without mixing release settlement", async () => {
    const input = await microInput({
      energyRegen: 2,
      selections: [
        { holderId: "entity:actor", optionId: coreBonusOption, layers: 1 },
      ],
    })
    const result = calculate(input)
    // (2 − 1.2) × 0.21 = 0.168 → 655 × 1.168 = 765.04。
    expect(result.totals.nonCritical).toBeCloseTo(765.04, 10)
    const contributions =
      result.segments[0]!.damage.evaluation.contributions.filter(
        (entry) => entry.origin.effectId === coreBonusEffect,
      )
    expect(contributions).toHaveLength(1)
    expect(contributions[0]!.value.value).toBeCloseTo(0.168, 12)
    expect(
      result.segments[0]!.damage.evaluation.contributions.filter((entry) =>
        [microReleaseEffect, wideReleaseEffect].includes(entry.origin.effectId),
      ),
    ).toEqual([])
    // 不选择效果时直接动作在核心 1 与核心 7 均可用。
    const unselected = await microInput({ energyRegen: 2 })
    expect(unselected.action.ok).toBe(true)
    expect(calculate(unselected).totals.nonCritical).toBeCloseTo(655, 10)
    expect(
      calculate(await microInput({ coreSkillLevel: 1, energyRegen: 2 })).totals
        .nonCritical,
    ).toBeCloseTo(655, 10)
    // 已有异放选项保持原有核心 7 门槛，缺档拒绝而不补档。
    expect(
      calculateStaticActionDamage(
        await microInput({
          coreSkillLevel: 1,
          selections: [
            {
              holderId: "entity:actor",
              optionId: microReleaseOption,
              layers: 1,
            },
          ],
        }),
      ),
    ).toMatchObject({ ok: false, issues: [{ code: "MISSING_RANK" }] })
  })
  it("rejects forged classification, targets, tags, contexts and segment structure", async () => {
    const input = await microInput()
    const action = input.action
    if (!action.ok || action.calculation.kind !== "damage")
      throw new Error("fixture")
    const segments = action.calculation.segments
    const patchSegment = (patch: Record<string, unknown>) => ({
      ...action,
      calculation: {
        kind: "damage" as const,
        segments: segments.map((segment) => ({ ...segment, ...patch })),
      },
    })
    const altered = [
      { ...action, skillCategory: "special" as const },
      { ...action, skillCategory: "enhanced-special" as const },
      { ...action, skillCategory: "basic" as const },
      { ...action, skillTags: ["zzz-hp:follow-up"] },
      { ...action, skillTargetIds: [wideTarget] },
      {
        ...action,
        resolutionContext: {
          ...action.resolutionContext,
          agentEntityId: "1031",
        },
      },
      patchSegment({ element: "physical" }),
      patchSegment({ granularity: "individual" }),
      patchSegment({ repeat: 2 }),
      patchSegment({ segmentId: "forged-segment" }),
      patchSegment({
        damageItems: [
          { ...segments[0]!.damageItems[0]!, itemId: "forged-item" },
        ],
      }),
      patchSegment({
        damageItems: [{ ...segments[0]!.damageItems[0]!, stat: "health" }],
      }),
    ]
    for (const forged of altered)
      expect(
        calculateStaticActionDamage({ ...input, action: forged }),
      ).toMatchObject({
        ok: false,
        issues: [{ code: "CONTEXT_MISMATCH" }],
      })
    expect(
      calculateStaticActionDamage({
        ...input,
        action: { ...action, resolutionContext: undefined },
      } as unknown as StaticActionCalculationInput),
    ).toMatchObject({
      ok: false,
      issues: [
        { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
      ],
    })
    // 角色影画与显式 final special 等级必须与解析上下文一致。
    expect(
      calculateStaticActionDamage({
        ...input,
        actors: [{ ...input.actors[0]!, mindscapeRank: 3 }],
      }),
    ).toMatchObject({ ok: false, issues: [{ code: "CONTEXT_MISMATCH" }] })
    expect(
      calculateStaticActionDamage({
        ...input,
        actors: [
          {
            ...input.actors[0]!,
            skillLevels: { special: { mode: "effective", value: 10 } },
          },
        ],
      }),
    ).toMatchObject({
      ok: false,
      issues: [
        {
          code: "CONTEXT_MISMATCH",
          pointer: "/actors/entity:actor/skillLevels/special",
        },
      ],
    })
  })

  it("rejects strict individual hits and still refuses an active per-hit addition", async () => {
    const input = await microInput()
    expect(
      calculateStaticActionDamage({ ...input, requireIndividualHits: true }).ok,
    ).toBe(false)
    // 受控测试：把已选独立异放规则改为无条件命中倍率加项，验证合计段仍拒绝真正生效的
    // 逐命中加伤；这不是新的游戏效果，也不改变正式 definitions。
    const forgedDefinitions = {
      ...input.data.definitions,
      effects: input.data.definitions.effects.map((rule) =>
        rule.kind === "contribution" && rule.effectId === microReleaseEffect
          ? { ...rule, when: { kind: "constant", value: true } }
          : rule,
      ),
    } as unknown as StaticActionCalculationInput["data"]["definitions"]
    const rejected = calculateStaticActionDamage({
      ...input,
      data: { ...input.data, definitions: forgedDefinitions },
      selections: [
        { holderId: "entity:actor", optionId: microReleaseOption, layers: 1 },
      ],
    })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(
        rejected.issues.some((issue) => issue.message.includes("per-hit")),
      ).toBe(true)
  })
})

describe("generic assist entry action consumption", () => {
  // 具名通用 assist 登场技直伤约定：受控局外面板攻击 1000、辅助 L12、防御与抗性恒等，
  // 期望值取 Nanoka 万分比曲线的独立取值；四件套正例使用真实目录选项，
  // 由支援大类命中一次 damage-bonus 0.2，关闭即恢复。
  const rows = [
    {
      entityId: "1341",
      suffix: "0001",
      element: "ice",
      multiplier: 13.612,
      relatedBonuses: { ice: 0.2 },
      unrelatedBonuses: { physical: 0.99 },
      relatedResistances: { ice: 0.1 },
      unrelatedResistances: { physical: 0.99 },
    },
    {
      entityId: "1431",
      suffix: "0001",
      element: "physical",
      multiplier: 8.008,
      relatedBonuses: { physical: 0.2 },
      unrelatedBonuses: { ice: 0.99 },
      relatedResistances: { physical: 0.1 },
      unrelatedResistances: { ice: 0.99 },
    },
  ] as const
  const chaosJazzOption =
    "drive-discs:chaos-jazz:setPieces:4:blk-legacy:eff-ms0fd373-nsyrwm"
  const chaosJazzEffect =
    "disc:31800:zzz-hp:eff-ms0fd373-nsyrwm:blk-legacy:setPieces:4"
  const fourPiece = {
    ...emptyDiscs,
    1: equippedDisc("31800", "health"),
    2: equippedDisc("31800", "attack"),
    3: equippedDisc("31800", "defense"),
    4: equippedDisc("31800", "attack"),
    5: equippedDisc("31000", "attack"),
    6: equippedDisc("31000", "attack"),
  }
  type OutOfCombatPanel = Extract<
    StaticActorConfiguration["panel"],
    { mode: "out-of-combat" }
  >

  async function assistInput(
    row: (typeof rows)[number],
    options: {
      driveDiscs?: StaticActorConfiguration["driveDiscs"]
      damageBonuses?: OutOfCombatPanel["damageBonuses"]
      resistances?: StaticActionCalculationInput["target"]["resistances"]
      selections?: StaticActionCalculationInput["selections"]
    } = {},
  ): Promise<StaticActionCalculationInput> {
    const input = await fixture(row.entityId)
    const action = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: `action:agent:${row.entityId}:action:${row.suffix}`,
      mindscapeRank: 0,
      levels: { assist: { mode: "effective", value: 12 } },
    })
    if (!action.ok || action.calculation.kind !== "damage")
      throw new Error("expected a resolved entry action")
    expect(action.skillCategory).toBe("assist")
    return {
      ...input,
      action,
      actors: [
        {
          ...input.actors[0]!,
          driveDiscs: options.driveDiscs ?? emptyDiscs,
          panel: {
            mode: "out-of-combat",
            stats: {
              attack: { unit: "attack-points", value: 1000 },
              criticalRate: { unit: "ratio", value: 0 },
              criticalDamage: { unit: "ratio", value: 0.5 },
              penetrationRatio: { unit: "ratio", value: 0 },
            },
            penetrationValue: 0,
            damageBonuses: options.damageBonuses ?? { ice: 0, physical: 0 },
          },
        },
      ],
      target: {
        ...input.target,
        baseDefense: 0,
        resistances: options.resistances ?? { ice: 0, physical: 0 },
      },
      selections: options.selections ?? [],
    }
  }

  it.each(rows)(
    "consumes $entityId:$suffix as one attack aggregate with null displayed totals",
    async (row) => {
      const input = await assistInput(row)
      if (!input.action.ok || input.action.calculation.kind !== "damage")
        throw new Error("fixture")
      expect(input.action.sourceDamageMultiplier).toBeCloseTo(
        row.multiplier,
        12,
      )
      expect(input.action.calculation.segments).toHaveLength(1)
      const actionSegment = input.action.calculation.segments[0]!
      expect(actionSegment.segmentId).toBe(
        `action:agent:${row.entityId}:action:${row.suffix}:total`,
      )
      expect(actionSegment.damageKind).toBe("regular")
      expect(actionSegment.element).toBe(row.element)
      expect(actionSegment.granularity).toBe("aggregate")
      expect(actionSegment.repeat).toBe(1)
      expect(actionSegment.damageItems).toHaveLength(1)
      expect(actionSegment.damageItems[0]).toMatchObject({
        itemId: `action:agent:${row.entityId}:action:${row.suffix}:base`,
        stat: "attack",
      })
      expect(actionSegment.damageItems[0]!.damageMultiplier).toBeCloseTo(
        row.multiplier,
        12,
      )
      const result = calculate(input)
      expect(result.segments).toHaveLength(1)
      const segment = result.segments[0]!
      expect(segment.granularity).toBe("aggregate")
      expect(segment.repetition).toBe(1)
      expect(result.totals.nonCritical).toBeCloseTo(1000 * row.multiplier, 10)
      expect(result.totals.critical).toBeCloseTo(1500 * row.multiplier, 10)
      expect(result.totals.expected).toBeCloseTo(1000 * row.multiplier, 10)
      expect(result.totals.displayedNonCritical).toBeNull()
      expect(result.totals.displayedCritical).toBeNull()
      expect(segment.damage.evaluation.contributions).toEqual([])
      expect(
        calculateStaticActionDamage({ ...input, requireIndividualHits: true })
          .ok,
      ).toBe(false)
    },
  )

  it.each(rows)(
    "reads only the applicable element bonus and resistance for $entityId:$suffix",
    async (row) => {
      const input = await assistInput(row, {
        damageBonuses: { ...row.relatedBonuses, ...row.unrelatedBonuses },
        resistances: {
          ...row.relatedResistances,
          ...row.unrelatedResistances,
        },
      })
      const result = calculate(input)
      expect(result.totals.nonCritical).toBeCloseTo(
        1000 * row.multiplier * 1.2 * 0.9,
        10,
      )
      expect(
        calculate({
          ...input,
          actors: [
            {
              ...input.actors[0]!,
              panel: {
                ...(input.actors[0]!.panel as OutOfCombatPanel),
                damageBonuses: { ...row.relatedBonuses },
              },
            },
          ],
          target: {
            ...input.target,
            resistances: { ...row.relatedResistances },
          },
        }).totals,
      ).toEqual(result.totals)
    },
  )

  it.each(rows)(
    "applies the reviewed four-piece support bonus once for $entityId:$suffix",
    async (row) => {
      const plain = calculate(await assistInput(row, { driveDiscs: fourPiece }))
      const selected = calculate(
        await assistInput(row, {
          driveDiscs: fourPiece,
          selections: [
            {
              holderId: "entity:actor",
              optionId: chaosJazzOption,
              layers: 1,
            },
          ],
        }),
      )
      // 攻击 1000、L12：照 13612 → 16334.4；叶瞬光 8008 → 9609.6。
      expect(plain.totals.nonCritical).toBeCloseTo(1000 * row.multiplier, 10)
      expect(selected.totals.nonCritical).toBeCloseTo(
        1000 * row.multiplier * 1.2,
        10,
      )
      expect(
        selected.segments[0]!.damage.evaluation.contributions.filter(
          (entry) => entry.origin.effectId === chaosJazzEffect,
        ),
      ).toMatchObject([{ value: { value: 0.2 } }])
      expect(selected.panels).toEqual(plain.panels)
    },
  )

  it.each(rows)(
    "still refuses an active per-hit addition on the aggregate entry action for $entityId:$suffix",
    async (row) => {
      const input = await assistInput(row, {
        driveDiscs: fourPiece,
        selections: [
          { holderId: "entity:actor", optionId: chaosJazzOption, layers: 1 },
        ],
      })
      // 受控测试：把已选四件套规则改为无条件命中倍率加项，验证合计段仍拒绝真正生效的
      // 逐命中加伤；这不是新的游戏效果，也不改变正式 definitions。
      const forgedDefinitions = {
        ...input.data.definitions,
        effects: input.data.definitions.effects.map((rule) =>
          rule.kind === "contribution" && rule.effectId === chaosJazzEffect
            ? {
                ...rule,
                when: { kind: "constant", value: true } as const,
                operation: {
                  kind: "factor-contribution",
                  channel: "base-multiplier-addition",
                  value: { kind: "literal", unit: "multiplier", value: 0.2 },
                },
              }
            : rule,
        ),
      } as unknown as StaticActionCalculationInput["data"]["definitions"]
      const rejected = calculateStaticActionDamage({
        ...input,
        data: { ...input.data, definitions: forgedDefinitions },
      })
      expect(rejected.ok).toBe(false)
      if (!rejected.ok)
        expect(
          rejected.issues.some((issue) => issue.message.includes("per-hit")),
        ).toBe(true)
    },
  )

  it.each(rows)(
    "rejects forged classification, targets, tags, element and segments for $entityId:$suffix",
    async (row) => {
      const input = await assistInput(row)
      const action = input.action
      if (!action.ok || action.calculation.kind !== "damage")
        throw new Error("fixture")
      const segments = action.calculation.segments
      const patchSegment = (patch: Record<string, unknown>) => ({
        ...action,
        calculation: {
          kind: "damage" as const,
          segments: segments.map((segment) => ({ ...segment, ...patch })),
        },
      })
      const otherElement = row.element === "ice" ? "physical" : "ice"
      const altered = [
        { ...action, skillCategory: "quick-assist" as const },
        { ...action, skillCategory: "assist-follow-up" as const },
        { ...action, skillTags: ["zzz-hp:follow-up"] },
        { ...action, skillTargetIds: ["zzz-hp:skill:all-dodge-ms0dnpmr"] },
        {
          ...action,
          resolutionContext: {
            ...action.resolutionContext,
            agentEntityId: "1031",
          },
        },
        patchSegment({ element: otherElement }),
        patchSegment({ granularity: "individual" }),
        patchSegment({ repeat: 2 }),
        patchSegment({ segmentId: "forged-segment" }),
        patchSegment({
          damageItems: [
            { ...segments[0]!.damageItems[0]!, itemId: "forged-item" },
          ],
        }),
        patchSegment({
          damageItems: [{ ...segments[0]!.damageItems[0]!, stat: "health" }],
        }),
      ]
      for (const forged of altered)
        expect(
          calculateStaticActionDamage({ ...input, action: forged }),
        ).toMatchObject({
          ok: false,
          issues: [{ code: "CONTEXT_MISMATCH" }],
        })
      expect(
        calculateStaticActionDamage({
          ...input,
          actors: [{ ...input.actors[0]!, mindscapeRank: 1 }],
        }),
      ).toMatchObject({ ok: false, issues: [{ code: "CONTEXT_MISMATCH" }] })
      expect(
        calculateStaticActionDamage({
          ...input,
          actors: [
            {
              ...input.actors[0]!,
              skillLevels: { assist: { mode: "effective", value: 10 } },
            },
          ],
        }),
      ).toMatchObject({
        ok: false,
        issues: [
          {
            code: "CONTEXT_MISMATCH",
            pointer: "/actors/entity:actor/skillLevels/assist",
          },
        ],
      })
    },
  )
})

describe("static calculation assembly", () => {
  it("keeps Lucia M6 on initial health when her own health buff is selected", async () => {
    const input = await fixture("1451", 6)
    const panel = calculate(input).panels[0]!
    const actor = manual(input.actors[0]!, panel)
    if (actor.panel.mode !== "out-of-combat") throw new Error("panel")
    const conversion = {
      optionId: "agents:lucia:mindscape:6:blk-legacy:legacy-self-atk",
      holderId: actor.entityId,
      layers: 1,
    }
    const healthBuff = {
      optionId:
        "agents:lucia:mindscape:0:blk-ms46hxws-mu8xs8:eff-ms46hxws-g1rj8f",
      holderId: actor.entityId,
      layers: 1,
    }
    for (const selections of [[conversion], [conversion, healthBuff]]) {
      const result = calculate({
        ...input,
        actors: [
          {
            ...actor,
            panel: {
              ...actor.panel,
              stats: {
                ...actor.panel.stats,
                health: { unit: "health-points", value: 24000 },
              },
            },
          },
        ],
        selections,
      })
      const contribution =
        result.segments[0]!.damage.evaluation.contributions.find(
          (entry) =>
            entry.origin.effectId ===
            "agent:1451:zzz-hp:legacy-self-atk:blk-legacy:mindscape:6",
        )
      expect(contribution?.value.value).toBe(480)
    }
  })

  it.each([
    [0, 6],
    [6, 0],
    [0, 1],
  ] as const)(
    "rejects configured mindscape %i with an action resolved for %i",
    async (configuredRank, resolvedRank) => {
      const input = await fixture("1031")
      const actor = input.actors[0]!
      const action = resolveAgentAction({
        agent: input.data.agents[0]!.actions,
        actionId: "action:agent:1031:basic-enhanced-1",
        mindscapeRank: resolvedRank,
        levels: { basic: { mode: "trained", value: 12 } },
      })
      // Matching contexts remain valid, including different ranks with identical skill bonuses.
      calculate({
        ...input,
        action,
        actors: [{ ...actor, mindscapeRank: resolvedRank }],
      })
      expect(
        calculateStaticActionDamage({
          ...input,
          action,
          actors: [{ ...actor, mindscapeRank: configuredRank }],
        }),
      ).toMatchObject({
        ok: false,
        issues: [
          { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
        ],
      })
    },
  )

  it("rejects missing or foreign action resolution contexts", async () => {
    const input = await fixture()
    if (!input.action.ok) throw new Error("Expected resolved action")
    for (const resolutionContext of [
      undefined,
      { ...input.action.resolutionContext, agentEntityId: "1031" },
    ])
      expect(
        calculateStaticActionDamage({
          ...input,
          action: { ...input.action, resolutionContext },
        } as unknown as StaticActionCalculationInput),
      ).toMatchObject({
        ok: false,
        issues: [
          { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
        ],
      })
  })

  it.each([
    ["1371", "auric-ink", "ether", "32300"],
    ["1091", "frost", "ice", "32500"],
  ] as const)(
    "inherits %s elemental main stats and two-piece bonuses",
    async (id, special, base, setId) => {
      const input = await fixture(id)
      const actor: StaticActorConfiguration = {
        ...input.actors[0]!,
        driveDiscs: {
          ...emptyDiscs,
          1: {
            setEntityId: setId,
            mainStat: { attribute: "health" },
            substats: [],
          },
          5: {
            setEntityId: setId,
            mainStat: { attribute: "damageBonus", element: base },
            substats: [],
          },
        },
      }
      const result = calculate({ ...input, actors: [actor] })
      expect(result.panels[0]!.damageBonuses[base]).toBeCloseTo(0.4)
      expect(result.panels[0]!.damageBonuses[special]).toBeCloseTo(0.4)
      expect(
        calculate({ ...input, actors: [manual(actor, result.panels[0]!)] })
          .totals,
      ).toEqual(result.totals)
      expect(input.action.ok && input.action.calculation.kind).toBe("damage")
      if (input.action.ok && input.action.calculation.kind === "damage")
        expect(input.action.calculation.segments[0]!.element).toBe(special)
      const settledActor = manual(actor, result.panels[0]!)
      if (settledActor.panel.mode !== "out-of-combat") throw new Error("panel")
      const inherited = calculate({
        ...input,
        actors: [
          {
            ...settledActor,
            panel: { ...settledActor.panel, damageBonuses: { [base]: 0.4 } },
          },
        ],
        target: { ...input.target, resistances: { [base]: 0.2 } },
      })
      const explicit = calculate({
        ...input,
        actors: [
          {
            ...settledActor,
            panel: {
              ...settledActor.panel,
              damageBonuses: { [base]: 0.8, [special]: 0.4 },
            },
          },
        ],
        target: {
          ...input.target,
          resistances: { [base]: 0.8, [special]: 0.2 },
        },
      })
      expect(inherited.totals).toEqual(explicit.totals)
      expect(inherited.totals.expected).toBeCloseTo(
        result.totals.expected * 0.8,
      )
    },
  )

  it.each([
    [[31000, 31000, 31400, 31400, 31400, 31400], 2],
    [[31000, 31000, 31400, 31400, 34200, 34200], 3],
    [[31400, 31400, 31400, 31400, 31400, 31400], 1],
  ] as const)("settles each two-piece set once for %j", async (sets, count) => {
    const input = await fixture()
    const discs = Object.fromEntries(
      sets.map((id, index) => {
        const slot = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6
        const bonus = input.data.driveDiscAffixes.mainStatsBySlot[slot][0]!
        return [
          slot,
          {
            setEntityId: String(id),
            mainStat: {
              attribute: bonus.attribute,
              ...(bonus.attribute === "damageBonus"
                ? { element: bonus.element }
                : {}),
            },
            substats: [],
          },
        ]
      }),
    ) as unknown as StaticActorConfiguration["driveDiscs"]
    const actor = { ...input.actors[0]!, driveDiscs: discs }
    const result = calculate({ ...input, actors: [actor] })
    const panel = result.panels[0]!
    expect(
      panel.contributions.filter((c) => c.origin.effectId.startsWith("disc:")),
    ).toHaveLength(count)
    const fourPieceIds = new Set(
      input.data.catalog.options.flatMap((o) =>
        o.variants
          .filter((v) => v.configuration.minimumSetPieces === 4)
          .flatMap((v) => v.effectIds),
      ),
    )
    expect(
      result.segments
        .flatMap((s) => s.damage.evaluation.contributions)
        .some((c) => fourPieceIds.has(c.origin.effectId)),
    ).toBe(false)
    expect(
      calculate({ ...input, actors: [manual(actor, panel)] }).totals,
    ).toEqual(result.totals)
  })

  it("distinguishes flat and percentage substats of the same attribute", async () => {
    const input = await fixture()
    const base = {
      setEntityId: "31400",
      mainStat: { attribute: "health" as const },
      substats: [],
    }
    const first = calculate({
      ...input,
      actors: [{ ...input.actors[0]!, driveDiscs: { ...emptyDiscs, 1: base } }],
    })
    const result = calculate({
      ...input,
      actors: [
        {
          ...input.actors[0]!,
          driveDiscs: {
            ...emptyDiscs,
            1: {
              ...base,
              substats: [
                { attribute: "attack", operation: "initial-fixed", rolls: 1 },
                {
                  attribute: "attack",
                  operation: "initial-percentage",
                  rolls: 1,
                },
              ],
            },
          },
        },
      ],
    })
    expect(
      result.panels[0]!.stats.attack!.value -
        first.panels[0]!.stats.attack!.value,
    ).toBeCloseTo(19 + 653.0866 * 0.03, 8)
  })

  it("uses the sourced permanent conversion and preserves input precision and immutability", async () => {
    const input = await fixture()
    const before = structuredClone(input)
    const result = calculate(input)
    expect(result.panels[0]!.stats.attack!.value).toBeCloseTo(1232.31468, 8)
    expect(
      result.panels[0]!.contributions.some(
        (c) => c.origin.effectId === "agent:1121:permanent:defense-to-attack",
      ),
    ).toBe(true)
    const second = calculate({
      ...input,
      actors: [manual(input.actors[0]!, result.panels[0]!)],
    })
    expect(second.segments).toEqual(result.segments)
    expect(input).toEqual(before)
  })

  it("includes two-piece defense before Ben's initial conversion and applies each set once", async () => {
    const input = await fixture()
    const actor = input.actors[0]!
    const equipped: StaticActorConfiguration = {
      ...actor,
      driveDiscs: {
        ...emptyDiscs,
        1: {
          setEntityId: "34200",
          mainStat: { attribute: "health" },
          substats: [],
        },
        3: {
          setEntityId: "34200",
          mainStat: { attribute: "defense" },
          substats: [],
        },
      },
    }
    const result = calculate({ ...input, actors: [equipped] })
    const panel = result.panels[0]!
    // Ben's F-core attack baseline is 653.0866; the passive converts 80% of settled initial defense.
    expect(panel.stats.attack!.value).toBeCloseTo(
      653.0866 + panel.stats.defense!.value * 0.8,
      8,
    )
    expect(
      panel.contributions.filter(
        (c) =>
          c.origin.effectId.startsWith("disc:34200:") &&
          c.address.kind === "stat",
      ),
    ).toHaveLength(1)
    const second = calculate({ ...input, actors: [manual(equipped, panel)] })
    expect(second.totals).toEqual(result.totals)
  })

  it("retains settled sheer force without repeating its health/attack conversion", async () => {
    const input = await fixture("1371")
    const result = calculate(input)
    const panel = result.panels[0]!
    expect(panel.stats.sheerForce!.value).toBeCloseTo(
      panel.stats.health!.value * 0.1 + panel.stats.attack!.value * 0.3,
      8,
    )
    const second = calculate({
      ...input,
      actors: [manual(input.actors[0]!, panel)],
    })
    expect(second.totals).toEqual(result.totals)
  })

  it("keeps elemental two-piece bonuses in the panel and avoids double counting on the manual path", async () => {
    const input = await fixture()
    const actor = {
      ...input.actors[0]!,
      driveDiscs: {
        ...emptyDiscs,
        1: {
          setEntityId: "32200",
          mainStat: { attribute: "health" as const },
          substats: [],
        },
        2: {
          setEntityId: "32200",
          mainStat: { attribute: "attack" as const },
          substats: [],
        },
      },
    }
    const withoutTwoPiece = calculate({
      ...input,
      actors: [
        {
          ...actor,
          driveDiscs: {
            ...actor.driveDiscs,
            2: equippedDisc("32300", "attack"),
          },
        },
      ],
    })
    const result = calculate({ ...input, actors: [actor] })
    expect(result.panels[0]!.damageBonuses.fire).toBe(0.1)
    expect(
      result.totals.nonCritical / withoutTwoPiece.totals.nonCritical,
    ).toBeCloseTo(1.1, 12)
    const second = calculate({
      ...input,
      actors: [manual(actor, result.panels[0]!)],
    })
    expect(second.totals).toEqual(result.totals)
  })

  it("applies a selected four-piece attack buff after settling the panel", async () => {
    const input = await fixture()
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      driveDiscs: {
        ...emptyDiscs,
        1: equippedDisc("31400", "health"),
        2: equippedDisc("31400", "attack"),
        3: equippedDisc("31400", "defense"),
        4: equippedDisc("31400", "attack"),
      },
    }
    const base = calculate({ ...input, actors: [actor] })
    const selections = [
      {
        holderId: actor.entityId,
        optionId:
          "drive-discs:hormone:setPieces:4:blk-legacy:legacy-self-inCombatAtkPercent",
        layers: 1,
      },
    ]
    const buffed = calculate({ ...input, actors: [actor], selections })
    expect(buffed.totals.nonCritical / base.totals.nonCritical).toBeCloseTo(
      1.25,
      12,
    )
    expect(buffed.panels).toEqual(base.panels)
    expect(
      calculate({
        ...input,
        actors: [manual(actor, base.panels[0]!)],
        selections,
      }).totals,
    ).toEqual(buffed.totals)
  })

  it("reproduces Nicole's observed 342 + 144 × 3 through the complete calculation", async () => {
    const input = await fixture("1031")
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      mindscapeRank: 6,
      panel: {
        mode: "out-of-combat",
        stats: {
          attack: { unit: "attack-points", value: 649.1691 },
          penetrationRatio: { unit: "ratio", value: 0 },
          criticalRate: { unit: "ratio", value: 0 },
          criticalDamage: { unit: "ratio", value: 0.5 },
        },
        penetrationValue: 0,
        damageBonuses: { physical: 0 },
      },
    }
    const action = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: "action:agent:1031:basic-enhanced-1",
      mindscapeRank: 6,
      levels: { basic: { mode: "effective", value: 15 } },
      requireIndividualHits: true,
    })
    // Independent observed values are recorded in docs/specs/data/skill-actions.md.
    const result = calculate({
      ...input,
      actors: [actor],
      action,
      target: { ...input.target, baseDefense: 921.04 },
      requireIndividualHits: true,
      selections: [
        {
          holderId: actor.entityId,
          optionId:
            "agents:nicole:mindscape:0:blk-legacy:legacy-team-reduceDefense",
          layers: 1,
        },
      ],
    })
    expect(
      result.segments.map((segment) => Math.ceil(segment.damage.nonCritical)),
    ).toEqual([342, 144, 144, 144])
    expect(result.totals.displayedNonCritical).toBe(774)
  })

  it("rejects an active per-hit addition on an aggregate action", async () => {
    const input = await fixture("1161")
    if (!input.action.ok) throw new Error("Expected resolved action")
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      mindscapeRank: 6,
    }
    const action = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: input.action.actionId,
      mindscapeRank: 6,
      levels: { assist: { mode: "trained", value: 12 } },
    })
    // The aggregate action is valid until Lighter's per-hit extra damage is selected.
    calculate({ ...input, actors: [actor], action })
    const result = calculateStaticActionDamage({
      ...input,
      actors: [actor],
      action,
      selections: [
        {
          holderId: actor.entityId,
          optionId:
            "agents:lighter:mindscape:6:blk-ms4b3uc2-5gulzo:eff-ms4b3uc2-oeaiao",
          layers: 1,
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.message.includes("per-hit")),
      ).toBe(true)
  })

  it("applies conditional two-piece damage only to the matching skill category", async () => {
    const input = await fixture()
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      driveDiscs: {
        ...emptyDiscs,
        1: equippedDisc("33300", "health"),
        2: equippedDisc("32300", "attack"),
      },
    }
    const equipped = {
      ...actor,
      driveDiscs: { ...actor.driveDiscs, 2: equippedDisc("33300", "attack") },
    }
    const agent = input.data.agents[0]!.actions
    const basic = agent.actions.find(
      (action) =>
        action.skillCategory === "basic" &&
        action.calculation.kind === "damage" &&
        action.inputs.length === 0,
    )!
    const action = resolveAgentAction({
      agent,
      actionId: basic.actionId,
      mindscapeRank: 0,
      levels: { basic: { mode: "trained", value: 12 } },
    })
    const base = calculate({ ...input, actors: [actor], action })
    const buffed = calculate({ ...input, actors: [equipped], action })
    expect(buffed.totals.nonCritical / base.totals.nonCritical).toBeCloseTo(
      1.15,
      12,
    )
    expect(calculate({ ...input, actors: [equipped] }).totals).toEqual(
      calculate({ ...input, actors: [actor] }).totals,
    )
  })

  it("rejects incompatible versions, battle panels, illegal units and unverified hit splitting", async () => {
    const input = await fixture()
    for (const version of [
      { ...input.data.version, packageVersion: "99.0.0" },
      { ...input.data.version, contractVersion: 2 as 1 },
      { ...input.data.version, gameVersion: "unknown" },
      { ...input.data.version, snapshotId: "" },
    ]) {
      expect(
        calculateStaticActionDamage({
          ...input,
          data: { ...input.data, version },
        }).ok,
      ).toBe(false)
    }
    const wrong = {
      ...input,
      actors: [{ ...input.actors[0]!, panel: { mode: "in-combat" } }],
    }
    expect(
      calculateStaticActionDamage(
        wrong as unknown as StaticActionCalculationInput,
      ).ok,
    ).toBe(false)
    const result = calculate(input)
    const actor = manual(input.actors[0]!, result.panels[0]!)
    const corrupt = structuredClone(actor) as unknown as {
      panel: { stats: { attack: { unit: string } } }
    }
    corrupt.panel.stats.attack.unit = "ratio"
    expect(
      calculateStaticActionDamage({
        ...input,
        actors: [corrupt as unknown as StaticActorConfiguration],
      }).ok,
    ).toBe(false)
    if (
      input.action.ok &&
      input.action.calculation.kind === "damage" &&
      input.action.calculation.segments.some(
        (s) => s.granularity === "aggregate",
      )
    ) {
      expect(
        calculateStaticActionDamage({ ...input, requireIndividualHits: true })
          .ok,
      ).toBe(false)
    }
  })
})

describe("special skill level inputs", () => {
  const lucyLinearOption =
    "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r"
  const lucyFixedOption = "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk"
  const lucyLinearEffect =
    "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0"
  const lucyFixedEffect =
    "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0"

  async function lucyFixture(special: {
    mode: "trained" | "effective"
    value: number
  }) {
    const input = await fixture("1151")
    const action = input.action
    if (!action.ok) throw new Error("expected a resolved action")
    const levels = {
      basic: { mode: "trained", value: 12 } as const,
      dodge: { mode: "trained", value: 12 } as const,
      assist: { mode: "trained", value: 12 } as const,
      special: { mode: "effective", value: 12 } as const,
      chain: { mode: "trained", value: 12 } as const,
    }
    const reResolved = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: action.actionId,
      mindscapeRank: input.actors[0]!.mindscapeRank,
      levels,
    })
    if (!reResolved.ok) throw new Error("expected resolvable action")
    const selections = [lucyFixedOption, lucyLinearOption].map((optionId) => ({
      optionId,
      holderId: input.actors[0]!.entityId,
      layers: 1,
    }))
    const base = {
      ...input,
      action: reResolved,
      selections,
      actors: [
        {
          ...input.actors[0]!,
          skillLevels: { special },
        },
      ],
    }
    return base
  }

  it("feeds the acting actor's effective special level into her own team buff", async () => {
    const input = await lucyFixture({ mode: "effective", value: 12 })
    const bindingId = "binding:entity:actor:agent:1151"
    const result = calculate({
      ...input,
      inputs: [
        {
          bindingId,
          name: `${lucyLinearEffect}:source`,
          value: { unit: "attack-points", value: 2000 },
        },
      ],
    })
    const contributions =
      result.segments[0]!.damage.evaluation.contributions.filter((entry) =>
        [lucyFixedEffect, lucyLinearEffect].includes(entry.origin.effectId),
      )
    expect(
      contributions.reduce((total, entry) => total + entry.value.value, 0),
    ).toBe(540)
  })

  it("reports missing special level for a selected level-dependent option", async () => {
    const input = await lucyFixture({ mode: "effective", value: 12 })
    const { skillLevels: _omitted, ...actorWithoutLevels } = input.actors[0]!
    const result = calculateStaticActionDamage({
      ...input,
      actors: [actorWithoutLevels],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues.some((issue) => issue.code === "MISSING_RANK")).toBe(
        true,
      )
  })

  it("rejects an out-of-domain trained special level", async () => {
    const input = await lucyFixture({ mode: "effective", value: 12 })
    expect(
      calculateStaticActionDamage({
        ...input,
        actors: [
          {
            ...input.actors[0]!,
            skillLevels: { special: { mode: "trained", value: 17 } },
          },
        ],
      }),
    ).toMatchObject({ ok: false, issues: [{ code: "INVALID_INPUT" }] })
  })

  it("rejects skill levels that disagree with the resolved action", async () => {
    const input = await lucyFixture({ mode: "effective", value: 12 })
    const actions = input.data.agents[0]!.actions.actions
    const specialAction = actions.find(
      (entry) =>
        entry.calculation.kind === "damage" &&
        entry.calculation.segments.some((segment) =>
          segment.items.some(
            (item) => item.coefficient.levelGroup === "special",
          ),
        ),
    )
    if (!specialAction) throw new Error("expected a special-group action")
    const other = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: specialAction.actionId,
      mindscapeRank: input.actors[0]!.mindscapeRank,
      levels: {
        basic: { mode: "trained", value: 12 },
        dodge: { mode: "trained", value: 12 },
        assist: { mode: "trained", value: 12 },
        special: { mode: "effective", value: 10 },
        chain: { mode: "trained", value: 12 },
      },
    })
    if (!other.ok) throw new Error("expected resolvable action")
    // 动作按最终等级 10 解析、角色配置声明 12：重叠类别的解析结果不一致。
    expect(
      calculateStaticActionDamage({
        ...input,
        action: other,
        actors: [
          {
            ...input.actors[0]!,
            skillLevels: { special: { mode: "effective", value: 12 } },
          },
        ],
      }),
    ).toMatchObject({ ok: false, issues: [{ code: "CONTEXT_MISMATCH" }] })
  })

  it("enforces potential levels and the additional-ability fact on conditional action identities", async () => {
    const input = await fixture("1381")
    const actions = input.data.agents[0]!.actions
    const levels = {
      basic: { mode: "trained", value: 12 },
      dodge: { mode: "trained", value: 12 },
      assist: { mode: "trained", value: 12 },
      special: { mode: "trained", value: 12 },
      chain: { mode: "trained", value: 12 },
    } as const
    const resolve = (
      actionId: string,
      potentialLevel?: number,
      additionalAbilityActive?: boolean,
    ) =>
      resolveAgentAction({
        agent: actions,
        actionId,
        mindscapeRank: 0,
        levels,
        ...(potentialLevel === undefined ? {} : { potentialLevel }),
        ...(additionalAbilityActive === undefined
          ? {}
          : { additionalAbilityActive }),
      })
    const withActor = (
      action: ReturnType<typeof resolve>,
      potentialLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6,
    ): StaticActionCalculationInput => ({
      ...input,
      action,
      actors: [{ ...input.actors[0]!, potentialLevel }],
    })

    const active = resolve("action:agent:1381:action:0015", 6, true)
    expect(active.ok).toBe(true)
    if (!active.ok) return
    expect(active.skillTags).toEqual(["zzz-hp:follow-up"])
    expect(calculateStaticActionDamage(withActor(active, 6))).toMatchObject({
      ok: true,
    })

    // 伪造：保留追加攻击身份但抹掉事实，core 重新计算身份后拒绝
    const forged = {
      ...active,
      resolutionContext: {
        agentEntityId: "1381",
        mindscapeRank: 0,
        potentialLevel: 6,
      },
    } as typeof active
    expect(calculateStaticActionDamage(withActor(forged, 6))).toMatchObject({
      ok: false,
      issues: [
        { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
      ],
    })

    // 伪造：事实为假却携带追加攻击身份
    const inactive = resolve("action:agent:1381:action:0015", 6, false)
    expect(inactive.ok).toBe(true)
    if (!inactive.ok) return
    expect(
      calculateStaticActionDamage(
        withActor({ ...inactive, skillTargetIds: active.skillTargetIds }, 6),
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "CONTEXT_MISMATCH", pointer: "/action" }],
    })

    // 角色潜能与解析档位不一致
    expect(calculateStaticActionDamage(withActor(inactive, 5))).toMatchObject({
      ok: false,
      issues: [
        { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
      ],
    })

    // 潜能 0：保持连携/终结分类
    const ordinary = resolve("action:agent:1381:action:0015", 0, true)
    expect(ordinary.ok).toBe(true)
    if (!ordinary.ok) return
    expect(ordinary.skillTargetIds).toEqual([])
    expect(ordinary.skillTags).toEqual([])
    expect(calculateStaticActionDamage(withActor(ordinary, 0))).toMatchObject({
      ok: true,
    })

    // 无潜能依赖的动作不记录档位，可跨潜能复用
    const basic = resolve("action:agent:1381:action:0001")
    expect(basic.ok).toBe(true)
    if (!basic.ok) return
    expect(basic.resolutionContext.potentialLevel).toBeUndefined()
    expect(calculateStaticActionDamage(withActor(basic, 6))).toMatchObject({
      ok: true,
    })
  })
})

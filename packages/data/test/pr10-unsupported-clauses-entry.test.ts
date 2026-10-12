import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  calculationDataVersion,
  staticPanelRules,
} from "../.generated/calculation-data.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import {
  calculateStaticActionDamage,
  staticSourceBindingId,
} from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type {
  EntityId,
  MindscapeRank,
  PotentialLevel,
  StaticCalculationData,
} from "@randomplay/shared"

/**
 * PR10 越界登记经正式装载制品与完整静态入口的消费端验证：全部不可选登记
 * 按实体具名拒绝（formula-out-of-scope + 具体说明）、未选择时合法伤害计算
 * 保持非零；同一提供者的既有可执行选项与新增越界登记正常共存，不借声明
 * 生成贡献。数值本身不在本批（登记不创建规则、effectIds 为空）。S04
 * 「恒等式」-变格 12014 的目录实体、公开受益范围与条件说明同样在此断言。
 */
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

function discs(
  setEntityId: string,
  pieces: number,
  filler: string | null = null,
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
    [1, 2, 3, 4, 5, 6].map((slot) => {
      const set = slot <= pieces ? setEntityId : filler
      return [
        slot,
        set === null
          ? null
          : {
              setEntityId: set,
              mainStat: mainStatBySlot[slot as 1 | 2 | 3 | 4 | 5 | 6],
              substats: [],
            },
      ]
    }),
  ) as StaticActorConfiguration["driveDiscs"]
}

const AGENTS = [
  "1101",
  "1031",
  "1161",
  "1251",
  "1411",
  "1481",
  "1511",
  "1621",
] as const
const WENGINES = [
  "12003",
  "12014",
  "13011",
  "13127",
  "14114",
  "14148",
  "14162",
] as const

let cached: StaticCalculationData | undefined
async function fixture(
  overrides: {
    readonly discs?: StaticActorConfiguration["driveDiscs"]
    readonly wEngine?: StaticActorConfiguration["wEngine"]
    readonly mindscapeRank?: number
    readonly potentialLevel?: number
    readonly wEngineOwner?: string
  } = {},
): Promise<StaticActionCalculationInput> {
  if (!cached) {
    const agentRecords = await Promise.all(
      AGENTS.map(async (id) => ({
        attributes: await json(`attributes/agents/${id}.json`),
        actions: await json(`skills/agents/${id}.json`),
      })),
    )
    cached = {
      version: calculationDataVersion,
      agents: agentRecords,
      wEngines: await Promise.all(
        WENGINES.map((id) => json(`attributes/w-engines/${id}.json`)),
      ),
      driveDiscAffixes: await json("attributes/drive-disc-affixes.json"),
      definitions: await json("effects/static.json"),
      catalog: await json("effects/static-catalog.json"),
      panelRules: staticPanelRules,
    }
  }
  const data = cached
  const ownerEntity =
    `entity:actor-${overrides.wEngineOwner ?? "1101"}` as EntityId
  return {
    data,
    actors: AGENTS.map((id) => {
      const entityId = `entity:actor-${id}` as EntityId
      return {
        entityId,
        teamId: "team:players",
        agentEntityId: id,
        coreSkillLevel: 7 as const,
        mindscapeRank: (overrides.mindscapeRank ?? 0) as MindscapeRank,
        ...(overrides.potentialLevel === undefined
          ? {}
          : { potentialLevel: overrides.potentialLevel as PotentialLevel }),
        wEngine:
          overrides.wEngine && entityId === ownerEntity
            ? overrides.wEngine
            : null,
        driveDiscs: overrides.discs ?? emptyDiscs,
        panel: { mode: "equipment" as const },
      }
    }),
    actorId: ownerEntity,
    action: resolveAgentAction({
      agent: data.agents.find(
        (entry) =>
          entry.actions.entityId === (overrides.wEngineOwner ?? "1101"),
      )!.actions,
      actionId: data.agents
        .find(
          (entry) =>
            entry.actions.entityId === (overrides.wEngineOwner ?? "1101"),
        )!
        .actions.actions.find(
          (candidate) =>
            candidate.calculation.kind === "damage" &&
            candidate.skillCategory === "basic" &&
            candidate.inputs.length === 0,
        )!.actionId,
      mindscapeRank: (overrides.mindscapeRank ?? 0) as MindscapeRank,
      levels: {
        basic: { mode: "trained" as const, value: 12 as const },
        dodge: { mode: "trained" as const, value: 12 as const },
        assist: { mode: "trained" as const, value: 12 as const },
        special: { mode: "trained" as const, value: 12 as const },
        chain: { mode: "trained" as const, value: 12 as const },
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

function calculate(input: StaticActionCalculationInput) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}

describe("PR10 unsupported clause declarations in the published catalog", () => {
  it("registers each clause as an unsupported variant of an existing entity", async () => {
    const catalog = await json("effects/static-catalog.json")
    const expected = [
      // S02 驱动盘四件套
      [
        "nanoka:drive-discs:31200:four-piece-daze-value",
        "drive-discs:SuitShockstarDisco",
        { minimumSetPieces: 4 },
      ],
      [
        "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
        "drive-discs:SuitFreedomBlues",
        { minimumSetPieces: 4 },
      ],
      [
        "nanoka:drive-discs:31500:four-piece-damage-taken-reduction",
        "drive-discs:SuitSoulRock",
        { minimumSetPieces: 4 },
      ],
      // S05 九件音擎
      [
        "nanoka:w-engines:12003:ex-energy-recovery",
        "w-engines:Lunar_Noviluna",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:12012:anomaly-triggered-energy-recovery",
        "w-engines:Magnetic_Storm_Charlie",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:13002:decibel-and-energy-generation",
        "w-engines:Slice_Of_Time",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:13011:damage-taken-and-energy-generation-rate",
        "w-engines:Spring_Embrace",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:13016:damage-taken-and-miasma-contamination",
        "w-engines:Reel_Projector",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:12008:daze-on-main-target",
        "w-engines:Vortex_Arrow",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:12007:ex-daze",
        "w-engines:Vortex_Revolver",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:14003:charge-consumed-daze",
        "w-engines:Six_Shooter",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:13006:target-hp-daze",
        "w-engines:Precious_Fossilized_Core",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      // 前批提供者同一句的越界部分
      [
        "nanoka:w-engines:14114:basic-attack-daze",
        "w-engines:Weapon_S_1141",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
        "agents:nicole",
        { minimumMindscape: 1 },
      ],
      ["nanoka:agents:qingyi:flash-voltage-daze", "agents:qingyi", {}],
      [
        "nanoka:agents:koleda:enhanced-basic-second-daze",
        "agents:koleda",
        { potentialLevels: [1, 2, 3, 4, 5, 6] },
      ],
      [
        "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
        "agents:lighter",
        { minimumMindscape: 4 },
      ],
      [
        "nanoka:w-engines:14162:daze-value",
        "nanoka:w-engines:14162",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:agents:nangongyu:m6-vibrato-daze",
        "agents:nangongyu",
        { minimumMindscape: 6 },
      ],
      [
        "nanoka:agents:1621:wind-energy-acquisition",
        "nanoka:agents:1621",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      // 柚叶同一额外能力句的积蓄效率与影画 1 同一条目的瞬时能量（既有
      // 完整状态/抗性与 130% 选项保留）。
      [
        "nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency",
        "agents:yuzuha",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      [
        "nanoka:agents:yuzuha:mindscape-1-entry-energy",
        "agents:yuzuha",
        { minimumMindscape: 1 },
      ],
      // S04「恒等式」-变格 12014 由 coverage-only boundary 迁移为目录可发现的
      // 单份不可选声明（随声明携带真实元数据的补充实体）。
      [
        "nanoka:w-engines:12014:attacker-damage-reduction",
        "nanoka:w-engines:12014",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      // 前批已修/已补提供者同一被动段的确定缺口。
      [
        "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
        "w-engines:Peacekeeper_Specialized",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:w-engines:14148:ex-physical-daze-stacks",
        "w-engines:Yesterday_Calls",
        { refinements: [1, 2, 3, 4, 5] },
      ],
      [
        "nanoka:agents:lighter:morale-acquisition",
        "agents:lighter",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      [
        "nanoka:agents:lighter:collapse-stun-duration",
        "agents:lighter",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      [
        "nanoka:agents:dialyn:positive-reviews-and-complaints",
        "agents:dialyn",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      [
        "nanoka:agents:dialyn:malicious-complaint-stun-duration",
        "agents:dialyn",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      [
        "nanoka:agents:nangongyu:core-buildup-and-daze",
        "agents:nangongyu",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
      [
        "nanoka:agents:nangongyu:downbeat-acquisition",
        "agents:nangongyu",
        { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      ],
    ] as const
    const ids = new Set<string>()
    for (const [optionId, catalogEntityId, configuration] of expected) {
      const option = catalog.options.find(
        (candidate: { optionId: string }) => candidate.optionId === optionId,
      )
      expect(option, optionId).toBeDefined()
      expect(ids.has(optionId), optionId).toBe(false)
      ids.add(optionId)
      expect(option.catalogEntityId, optionId).toBe(catalogEntityId)
      expect(option.variants, optionId).toHaveLength(1)
      const variant = option.variants[0]
      expect(variant.status, optionId).toBe("unsupported")
      expect(variant.reason, optionId).toBe("formula-out-of-scope")
      expect(variant.effectIds, optionId).toEqual([])
      expect(variant.maximumLayers, optionId).toBe(1)
      expect(variant.inputs, optionId).toEqual([])
      expect(variant.configuration, optionId).toEqual(configuration)
      expect(variant.explanation?.length ?? 0, optionId).toBeGreaterThan(20)
      expect(option.conditionDescription.length, optionId).toBeGreaterThan(10)
      for (const reference of variant.references)
        expect(reference, optionId).toMatchObject({
          sourceId: "nanoka-integrated",
          version: "3.2",
        })
    }
    // 既有两条二件套越界声明身份、条款与配置逐字保留，不重复。
    for (const [optionId, description] of [
      [
        "nanoka:drive-discs:31900:two-piece-shield-value",
        "施加的护盾值提升15%。",
      ],
      [
        "nanoka:drive-discs:33200:two-piece-daze-value",
        "攻击造成的失衡值提升6%",
      ],
    ] as const) {
      const option = catalog.options.find(
        (candidate: { optionId: string }) => candidate.optionId === optionId,
      )
      expect(option.conditionDescription, optionId).toBe(description)
      expect(option.variants[0].configuration, optionId).toEqual({
        minimumSetPieces: 2,
      })
      expect(option.variants[0].status, optionId).toBe("unsupported")
      expect(option.variants[0].reason, optionId).toBe("formula-out-of-scope")
      expect(option.variants[0].effectIds, optionId).toEqual([])
    }
  })

  it("keeps the legal damage calculation non-zero while the declarations stay unselected", async () => {
    const baseline = calculate(await fixture())
    expect(baseline.totals.expected).toBeGreaterThan(0)
    const withDiscs = calculate(
      await fixture({ discs: discs("31200", 4, "33200") }),
    )
    expect(withDiscs.totals.expected).toBeGreaterThan(0)
    // S04 修复：装备「恒等式」-变格（补充实体 + 不可选声明）但未选择时，
    // 合法伤害计算照常非零。
    const withIdentityInflection = calculate(
      await fixture({
        wEngine: { entityId: "12014", refinement: 1, eligible: true },
      }),
    )
    expect(withIdentityInflection.totals.expected).toBeGreaterThan(0)
    const withDialyn = calculate(await fixture({ wEngineOwner: "1481" }))
    expect(withDialyn.totals.expected).toBeGreaterThan(0)
  })

  it("rejects each declaration by entity with its named out-of-scope reason", async () => {
    const cases: readonly {
      readonly label: string
      readonly optionId: string
      readonly phrase: string
      readonly fixture: Awaited<ReturnType<typeof fixture>>
    }[] = [
      {
        label: "four-piece daze with shockstar disco equipped",
        optionId: "nanoka:drive-discs:31200:four-piece-daze-value",
        phrase: "失衡值（daze）加成",
        fixture: await fixture({ discs: discs("31200", 4, "33200") }),
      },
      {
        label: "four-piece anomaly buildup resistance",
        optionId:
          "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
        phrase: "异常积蓄抗性降低",
        fixture: await fixture({ discs: discs("31300", 4, "33200") }),
      },
      {
        label: "four-piece damage taken reduction",
        optionId: "nanoka:drive-discs:31500:four-piece-damage-taken-reduction",
        phrase: "己方承伤方向",
        fixture: await fixture({ discs: discs("31500", 4, "33200") }),
      },
      {
        label: "w-engine instant energy",
        optionId: "nanoka:w-engines:12003:ex-energy-recovery",
        phrase: "即时能量（资源回复）方向",
        fixture: await fixture({
          wEngine: { entityId: "12003", refinement: 1, eligible: true },
        }),
      },
      {
        label: "w-engine energy generation rate",
        optionId:
          "nanoka:w-engines:13011:damage-taken-and-energy-generation-rate",
        phrase: "能量获得效率区（Energy Generation Rate）",
        fixture: await fixture({
          wEngine: { entityId: "13011", refinement: 1, eligible: true },
        }),
      },
      {
        label: "restrainer basic-attack daze sibling",
        optionId: "nanoka:w-engines:14114:basic-attack-daze",
        phrase: "失衡值提升6/7.5/9/10.5/12%",
        fixture: await fixture({
          wEngine: { entityId: "14114", refinement: 1, eligible: true },
        }),
      },
      {
        label: "nicole mindscape 1 buildup and field duration",
        optionId:
          "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
        phrase: "异常积蓄值提升16%",
        fixture: await fixture({ mindscapeRank: 1, wEngineOwner: "1031" }),
      },
      {
        label: "lighter mindscape 4 morale burst energy",
        optionId: "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
        phrase: "回复4点能量",
        fixture: await fixture({ mindscapeRank: 4, wEngineOwner: "1161" }),
      },
      {
        label: "nangongyu mindscape 6 daze",
        optionId: "nanoka:agents:nangongyu:m6-vibrato-daze",
        phrase: "失衡值提升50%",
        fixture: await fixture({ mindscapeRank: 6, wEngineOwner: "1511" }),
      },
      {
        label: "qingyi flash-voltage daze sibling",
        optionId: "nanoka:agents:qingyi:flash-voltage-daze",
        phrase: "失衡值额外提升0.5%",
        fixture: await fixture({ wEngineOwner: "1251" }),
      },
      {
        label: "koleda enhanced basic second daze sibling",
        optionId: "nanoka:agents:koleda:enhanced-basic-second-daze",
        phrase: "第二段强化[普通攻击]造成的失衡值提升20%",
        fixture: await fixture({ potentialLevel: 1, wEngineOwner: "1101" }),
      },
      {
        label: "roxy wind energy acquisition",
        optionId: "nanoka:agents:1621:wind-energy-acquisition",
        phrase: "[风能]",
        fixture: await fixture({ wEngineOwner: "1621" }),
      },
      {
        label: "yuzuha additional-ability anomaly buildup efficiency",
        optionId:
          "nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency",
        phrase: "属性异常积蓄效率提升0.2%",
        fixture: await fixture({ wEngineOwner: "1411" }),
      },
      {
        label: "yuzuha mindscape 1 entry energy",
        optionId: "nanoka:agents:yuzuha:mindscape-1-entry-energy",
        phrase: "回复30点能量",
        fixture: await fixture({ mindscapeRank: 1, wEngineOwner: "1411" }),
      },
    ]
    for (const entry of cases) {
      const result = calculateStaticActionDamage({
        ...entry.fixture,
        selections: [
          {
            holderId: entry.fixture.actorId,
            optionId: entry.optionId,
            layers: 1,
          },
        ],
      })
      expect(result.ok, entry.label).toBe(false)
      if (result.ok) continue
      expect(result.issues[0], entry.label).toMatchObject({
        code: "INVALID_INPUT",
      })
      expect(result.issues[0]!.message, entry.label).toContain(
        "formula-out-of-scope",
      )
      expect(result.issues[0]!.message, entry.label).toContain(entry.phrase)
    }
  })

  it("declares the reviewed beneficiary scope and public conditions per clause", async () => {
    const catalog = await json("effects/static-catalog.json")
    const optionOf = (optionId: string) => {
      const option = catalog.options.find(
        (candidate: { optionId: string }) => candidate.optionId === optionId,
      )
      expect(option, optionId).toBeDefined()
      return option
    }
    // 源文字明确队友/目标侧受益的条款按 team 概括（冻结文本未确认归属的
    // 时光切片喧响保持 self，不推断改写）。
    for (const [optionId, target] of [
      [
        "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
        "team",
      ],
      ["nanoka:w-engines:13016:damage-taken-and-miasma-contamination", "team"],
      [
        "nanoka:w-engines:13011:damage-taken-and-energy-generation-rate",
        "team",
      ],
      ["nanoka:agents:lighter:mindscape-4-morale-burst-energy", "team"],
      ["nanoka:w-engines:13002:decibel-and-energy-generation", "self"],
      ["nanoka:w-engines:12014:attacker-damage-reduction", "team"],
      ["nanoka:w-engines:13127:ex-and-assist-anomaly-buildup", "self"],
      ["nanoka:w-engines:14148:ex-physical-daze-stacks", "self"],
      ["nanoka:agents:lighter:morale-acquisition", "self"],
      ["nanoka:agents:lighter:collapse-stun-duration", "team"],
      ["nanoka:agents:dialyn:positive-reviews-and-complaints", "self"],
      ["nanoka:agents:dialyn:malicious-complaint-stun-duration", "team"],
      ["nanoka:agents:nangongyu:core-buildup-and-daze", "self"],
      ["nanoka:agents:nangongyu:downbeat-acquisition", "self"],
    ] as const)
      expect(optionOf(optionId).target, optionId).toBe(target)
    // 公开条件说明保留来源前提与持续时间/刷新。
    expect(
      optionOf("nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency")
        .conditionDescription,
    ).toContain("队伍中存在[异常]角色或与自身阵营相同的角色")
    const misfired = optionOf("nanoka:w-engines:14162:daze-value")
    expect(misfired.conditionDescription).toContain("持续50秒")
    expect(misfired.conditionDescription).toContain("重复触发时刷新")
    expect(misfired.variants[0].explanation).toContain("持续50秒")
    // 12014 目录实体真实元数据（补充实体：名称/职业/溯源）。
    const entity = catalog.entities.find(
      (candidate: { catalogEntityId: string }) =>
        candidate.catalogEntityId === "nanoka:w-engines:12014",
    )
    expect(entity).toMatchObject({
      upstreamId: null,
      name: "「恒等式」-变格",
      identity: { kind: "w-engine", entityId: "12014" },
      status: "mapped",
      profession: "防护",
      element: null,
    })
    expect(entity.supplementProvenance.resources.length).toBeGreaterThan(0)
  })

  it.each([
    [
      "identity inflecture attacker damage reduction",
      "nanoka:w-engines:12014:attacker-damage-reduction",
      "装备者受击后降低该攻击者输出的敌方减益",
      { wEngine: { entityId: "12014", refinement: 1, eligible: true } },
    ],
    [
      "peacekeeper anomaly buildup sibling",
      "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
      "属性异常积蓄值提升36/40/45/50/55%",
      { wEngine: { entityId: "13127", refinement: 1, eligible: true } },
    ],
    [
      "yesterday calls daze stacks sibling",
      "nanoka:w-engines:14148:ex-physical-daze-stacks",
      "失衡值提升9/10.3/11.7/13/14.5%",
      { wEngine: { entityId: "14148", refinement: 1, eligible: true } },
    ],
    [
      "lighter morale acquisition",
      "nanoka:agents:lighter:morale-acquisition",
      "每秒回复2.9点",
      { wEngineOwner: "1161" },
    ],
    [
      "lighter collapse stun duration",
      "nanoka:agents:lighter:collapse-stun-duration",
      "失衡持续时间提升3秒",
      { wEngineOwner: "1161" },
    ],
    [
      "dialyn positive reviews and complaints",
      "nanoka:agents:dialyn:positive-reviews-and-complaints",
      "积攒0.6点",
      { wEngineOwner: "1481" },
    ],
    [
      "dialyn malicious complaint stun duration",
      "nanoka:agents:dialyn:malicious-complaint-stun-duration",
      "失衡持续时间提升2秒",
      { wEngineOwner: "1481" },
    ],
    [
      "nangongyu core buildup and daze",
      "nanoka:agents:nangongyu:core-buildup-and-daze",
      "属性异常积蓄效率提升17/20/23/26/29/32/35%",
      { wEngineOwner: "1511" },
    ],
    [
      "nangongyu downbeat acquisition",
      "nanoka:agents:nangongyu:downbeat-acquisition",
      "每秒回复3.8点",
      { wEngineOwner: "1511" },
    ],
  ] as const)(
    "rejects the added clause %s by name without MISSING_REFERENCE",
    async (label, optionId, phrase, overrides) => {
      const input = await fixture(overrides)
      const result = calculateStaticActionDamage({
        ...input,
        selections: [{ holderId: input.actorId, optionId, layers: 1 }],
      })
      expect(result.ok, label).toBe(false)
      if (result.ok) return
      expect(result.issues[0], label).toMatchObject({ code: "INVALID_INPUT" })
      expect(result.issues[0]!.message, label).toContain("formula-out-of-scope")
      expect(result.issues[0]!.message, label).toContain(phrase)
      expect(result.issues[0]!.message, label).not.toContain(
        "MISSING_REFERENCE",
      )
    },
  )

  it("keeps the provider's executable options working beside the new declaration", async () => {
    const withEngine = await fixture({
      wEngine: { entityId: "14114", refinement: 1, eligible: true },
    })
    const baseline = calculate(withEngine)
    const supported = calculateStaticActionDamage({
      ...withEngine,
      selections: [
        {
          holderId: withEngine.actorId,
          optionId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
          layers: 2,
        },
      ],
    })
    expect(supported.ok, JSON.stringify(supported)).toBe(true)
    if (supported.ok && supported.value.kind === "damage") {
      // 既有每层普攻伤害选项照常贡献（2 层 × 精炼 1 的 6%），不被新增越界
      // 声明替换或清零。
      const bonus = supported.value.segments[0]!.damage.nonCritical!
      const base = baseline.segments[0]!.damage.nonCritical!
      expect(bonus).toBeGreaterThan(base)
      expect(bonus / base).toBeCloseTo(1.12, 6)
    }
    // 柚叶影画 1 的 130% 与既有抗性选项照常工作，新增瞬时能量登记不替换
    // 它们，也不把 130% 扩大到积蓄效率。
    const yuzuha = await fixture({ mindscapeRank: 1, wEngineOwner: "1411" })
    const completeOptionId =
      "agents:yuzuha:mindscape:0:tanuki-wish-complete-state"
    const completeInput = yuzuha.data.catalog.options.find(
      (option) => option.optionId === completeOptionId,
    )!.variants[0]!.inputs[0]!
    const complete = calculateStaticActionDamage({
      ...yuzuha,
      selections: [
        {
          holderId: yuzuha.actorId,
          optionId: completeOptionId,
          layers: 1,
        },
      ],
      inputs: [
        {
          bindingId: staticSourceBindingId(yuzuha.actorId, "agent", "1411"),
          name: completeInput.name,
          value: { unit: "anomaly-mastery-points", value: 200 },
        },
      ],
    })
    expect(complete.ok, JSON.stringify(complete)).toBe(true)
    const withEntryEnergy = calculateStaticActionDamage({
      ...yuzuha,
      inputs: [
        {
          bindingId: staticSourceBindingId(yuzuha.actorId, "agent", "1411"),
          name: completeInput.name,
          value: { unit: "anomaly-mastery-points", value: 200 },
        },
      ],
      selections: [
        {
          holderId: yuzuha.actorId,
          optionId: completeOptionId,
          layers: 1,
        },
        {
          holderId: yuzuha.actorId,
          optionId: "nanoka:agents:yuzuha:mindscape-1-entry-energy",
          layers: 1,
        },
      ],
    })
    expect(withEntryEnergy.ok).toBe(false)
    if (!withEntryEnergy.ok)
      expect(
        withEntryEnergy.issues.some((issue) =>
          issue.message.includes("yuzuha:mindscape-1-entry-energy"),
        ),
      ).toBe(true)
    const both = calculateStaticActionDamage({
      ...withEngine,
      selections: [
        {
          holderId: withEngine.actorId,
          optionId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
          layers: 2,
        },
        {
          holderId: withEngine.actorId,
          optionId: "nanoka:w-engines:14114:basic-attack-daze",
          layers: 1,
        },
      ],
    })
    expect(both.ok).toBe(false)
    if (!both.ok)
      expect(
        both.issues.some((issue) =>
          issue.message.includes("14114:basic-attack-daze"),
        ),
      ).toBe(true)
  })
})

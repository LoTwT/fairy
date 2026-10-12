import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  DamageElement,
  EntityId,
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general, inputFor } from "./static-fixtures.ts"

/**
 * 增益修复批次 09（修订 24）：南宫羽影画 6[天使的妄想][颤音：改]一次异放
 * 结算的具名回归。期望值全部来自冻结 Nanoka 3.2 天赋原文（中英文交叉
 * 核对：以太 800%/电 400%/火 1000%/物理 70%/冰 100%/风 40%、每层 +25%、
 * 最多 4 层、与[颤音]无法相互叠加）与固定提交 publicAnomalySkills.ts 的
 * 原异常系数表（blob eb7ffa39：以太 62.5%/电 125%/火 50%/物理 713%/
 * 冰 500%/风 1250%，注释明确不额外 ×10/×20）的独立归一算式——五非物理
 * 属性 5×(1+0.25×L)、物理 7.13×0.7=4.991×(1+0.25×L)，不从生成器反推。
 * 物理保留三位精度，不四舍五入为 5，也不是旧 M0 的 4.49（Q03 不在本批
 * 纠正）。触发事实（非失衡累计、进入失衡清除且存在原属性异常）由调用
 * 方声明并结算一次；首句失衡值 +50%、累计层数来源与清空时序不模拟。
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog
const oracle = read("./fixtures/zzz-hp-static-catalog.json") as {
  tables: { damage: unknown[] }
}
const settlementTable = structuredClone(
  oracle.tables.damage.find(
    (entry) => (entry as { kind?: string }).kind === "anomaly-settlement",
  ),
) as Record<string, unknown>

function calculateCatalogResult(
  input: StaticCatalogDamageInput,
): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

const M6_TARGET = "zzz-hp:skill:nangongyu-vibrato-modified"
const M6_ITEM = "nangongyu:vibrato-modified"
const M6_NONPHYSICAL = "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical"
const M6_PHYSICAL = "nanoka:agents:nangongyu:m6-vibrato-modified-physical"
const M6_NONPHYSICAL_EFFECT =
  "agent:1511:nanoka:m6-vibrato-modified-nonphysical:mindscape:6"
const M6_PHYSICAL_EFFECT =
  "agent:1511:nanoka:m6-vibrato-modified-physical:mindscape:6"
const M0_NONPHYSICAL_BASE =
  "agents:nangongyu:mindscape:0:blk-ms4cegmd-bwnttd:eff-ms4cey14-kzw7xx"
const M0_PHYSICAL_BASE =
  "agents:nangongyu:mindscape:0:blk-ms4cegmd-bwnttd:eff-ms4clm2r-e6xquw"
const M0_LAYERS =
  "agents:nangongyu:mindscape:0:blk-ms4cegmd-bwnttd:eff-ms4cm9a5-wou1p2"
const M2_LAYERS =
  "agents:nangongyu:mindscape:2:blk-legacy:legacy-team-anomalyReleaseMultFactor"
const M2_STAGGER_VULNERABLE =
  "agents:nangongyu:mindscape:2:blk-legacy:eff-ms4dpmaw-3wtd1m"

/** 六属性 × 归一基础倍率 × 元素分组选项；倍率来自独立算式，不从目录读取。 */
const ATTRIBUTE_CASES = [
  {
    element: "ether",
    base: 5,
    optionId: M6_NONPHYSICAL,
    effectId: M6_NONPHYSICAL_EFFECT,
  },
  {
    element: "electric",
    base: 5,
    optionId: M6_NONPHYSICAL,
    effectId: M6_NONPHYSICAL_EFFECT,
  },
  {
    element: "fire",
    base: 5,
    optionId: M6_NONPHYSICAL,
    effectId: M6_NONPHYSICAL_EFFECT,
  },
  {
    element: "ice",
    base: 5,
    optionId: M6_NONPHYSICAL,
    effectId: M6_NONPHYSICAL_EFFECT,
  },
  {
    element: "wind",
    base: 5,
    optionId: M6_NONPHYSICAL,
    effectId: M6_NONPHYSICAL_EFFECT,
  },
  {
    element: "physical",
    base: 4.991,
    optionId: M6_PHYSICAL,
    effectId: M6_PHYSICAL_EFFECT,
  },
] as const

interface M6RequestOptions {
  readonly element?: DamageElement
  readonly layers?: number
  readonly mindscapeRank?: MindscapeRank
  readonly coreSkillLevel?: CoreSkillLevel
  readonly sourceAttack?: number
  readonly holderAttack?: number
  readonly selections?: StaticCatalogDamageInput["selections"]
  readonly bindings?: StaticCatalogDamageInput["bindings"]
  readonly actorSources?: StaticCatalogDamageInput["actorSources"]
  readonly world?: StaticCatalogDamageInput["world"]
  readonly hit?: Partial<StaticCatalogDamageInput["hit"]>
  readonly damage?: StaticCatalogDamageInput["damage"]
  readonly snapshots?: StaticCatalogDamageInput["snapshots"]
  readonly omitAnomalySource?: boolean
  readonly extraItems?: readonly StaticCatalogDamageInput["hit"]["damageItems"][number][]
  readonly statSourceEntityId?: EntityId
  readonly statSourceSnapshotId?: string
  readonly anomalySnapshotId?: string
  readonly itemMultiplier?: number
  readonly itemStat?: "attack" | "impact"
  readonly itemRole?: "base" | "settlement"
  readonly carryTargetTag?: boolean
}

/**
 * 颤音：改结算请求：hit.actorId 是南宫羽（效果持有者与结算角色），原异常
 * 来源是另一名实体（不同攻击/精通/穿透/等级），damage.anomalySource 与
 * 伤害项 statSource 都指向该来源；伤害项从零倍率开始。
 */
function m6Request(overrides: M6RequestOptions = {}): StaticCatalogDamageInput {
  const base = inputFor()
  const sourceEntityId =
    overrides.statSourceEntityId ?? ("entity:source" as const)
  const statSource = {
    entityId: sourceEntityId,
    ...(overrides.statSourceSnapshotId === undefined
      ? {}
      : { snapshotId: overrides.statSourceSnapshotId }),
  }
  const anomalySnapshotId = overrides.anomalySnapshotId
  const items = [
    {
      mode: "direct" as const,
      role: overrides.itemRole ?? ("base" as const),
      itemId: M6_ITEM,
      damageMultiplier: overrides.itemMultiplier ?? 0,
      stat: overrides.itemStat ?? ("attack" as const),
      statSource,
    },
    ...(overrides.extraItems ?? []),
  ]
  const hitOverride = overrides.hit ?? {}
  return {
    ...base,
    definitions,
    catalog,
    actorSources: overrides.actorSources ?? [
      { entityId: "entity:attacker", agentEntityId: "1511" },
      { entityId: "entity:source", agentEntityId: "1561" },
    ],
    bindings: overrides.bindings ?? [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: "1511",
        eligible: true,
        configuration: {
          mindscapeRank: overrides.mindscapeRank ?? 6,
          coreSkillLevel: overrides.coreSkillLevel ?? 7,
        },
      },
    ],
    selections: overrides.selections ?? [
      {
        optionId: M6_NONPHYSICAL,
        bindingId: "binding:static",
        layers: overrides.layers ?? 1,
      },
    ],
    world: overrides.world ?? {
      ...base.world,
      entities: [
        {
          kind: "actor",
          entityId: "entity:attacker",
          teamId: "team:players",
          generalStats: {
            attack: general(overrides.holderAttack ?? 2400),
            anomalyProficiency: general(480),
          },
          directStats: {
            criticalRate: { baseValue: 0.28, additions: [] },
            criticalDamage: { baseValue: 1.2, additions: [] },
            penetrationRatio: { baseValue: 0.42, additions: [] },
            sharpCriticalDamage: { baseValue: 1.5, additions: [] },
          },
        },
        {
          // 原异常来源实体：与南宫羽使用明显不同的攻击/精通/穿透/等级。
          kind: "actor",
          entityId: "entity:source",
          teamId: "team:players",
          generalStats: {
            attack: general(overrides.sourceAttack ?? 1000),
            anomalyProficiency: general(115),
          },
          directStats: {
            criticalRate: { baseValue: 0.05, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
            sharpCriticalDamage: { baseValue: 1.5, additions: [] },
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
    hit: {
      ...base.hit,
      actorId: "entity:attacker",
      element: overrides.element ?? "ether",
      skillCategory: "uncategorized",
      skillTags: [],
      ...(overrides.carryTargetTag === false
        ? {}
        : { skillTargetIds: [M6_TARGET] }),
      ...hitOverride,
      // 显式覆盖伤害项时以覆盖为准（缺项负例）；否则使用声明的独立项。
      damageItems: (hitOverride.damageItems as never) ?? (items as never),
    },
    damage:
      overrides.damage ??
      ({
        ...settlementTable,
        anomalySource: {
          entityId: "entity:source",
          level: 52,
          ...(overrides.omitAnomalySource
            ? {}
            : anomalySnapshotId === undefined
              ? {}
              : { snapshotId: anomalySnapshotId }),
        },
        // 清除发生在进入失衡时：目标当前处于失衡（1.5 基础失衡乘区）。
      } as unknown as StaticCatalogDamageInput["damage"]),
    ...(overrides.omitAnomalySource
      ? {
          damage: {
            ...settlementTable,
            anomalySource: undefined,
          } as unknown as StaticCatalogDamageInput["damage"],
        }
      : {}),
    ...(overrides.snapshots === undefined
      ? {}
      : { snapshots: overrides.snapshots }),
  }
}

function settledItem(result: StaticDamageResult, itemId = M6_ITEM) {
  const item = result.evaluation.hit!.damageItems.find(
    (entry) => entry.itemId === itemId,
  )!
  expect(item, itemId).toBeDefined()
  return item
}

function effectContribution(
  result: StaticDamageResult,
  effectId: string,
): number {
  return result.evaluation.contributions
    .filter((c) => c.origin.effectId === effectId)
    .reduce((sum, c) => sum + c.value.value, 0)
}

describe("batch 09 Nangongyu M6 vibrato-modified settlement", () => {
  it.each(ATTRIBUTE_CASES)(
    "settles a full %s abloom once per effective layer count",
    ({ element, base, optionId }) => {
      for (const [layers, expected] of [
        [1, base * 1.25],
        [2, base * 1.5],
        [3, base * 1.75],
        [4, base * 2],
      ] as const) {
        const result = calculateCatalogResult(
          m6Request({
            element,
            layers,
            selections: [{ optionId, bindingId: "binding:static", layers }],
          }),
        )
        const item = settledItem(result)
        // 完整倍率一次赋值：基础倍率已并入原异常系数，层数经 count 桥接
        // 乘区相乘，不展开成多次结算，也不是复利。
        expect(item.damageMultiplier, `${element} L${layers}`).toBeCloseTo(
          expected,
          9,
        )
        // 仅基础伤害区：倍率 × 原异常来源虚拟攻击力（不是南宫羽的面板）。
        expect(
          item.damageMultiplier * item.finalStat,
          `${element} L${layers}`,
        ).toBeCloseTo(expected * 1000, 6)
        expect(item.finalStat).toBe(1000)
      }
    },
  )

  it.each([
    ["ether", 5, M6_NONPHYSICAL, 1000],
    ["physical", 4.991, M6_PHYSICAL, 1000],
    ["ether", 5, M6_NONPHYSICAL, 2400],
    ["physical", 4.991, M6_PHYSICAL, 2400],
  ] as const)(
    "keeps the %s anchor linear in the original anomaly source attack",
    (element, base, optionId, sourceAttack) => {
      for (const layers of [1, 4]) {
        const result = calculateCatalogResult(
          m6Request({
            element,
            layers,
            sourceAttack,
            selections: [{ optionId, bindingId: "binding:static", layers }],
          }),
        )
        const item = settledItem(result)
        expect(item.finalStat, `${element} ${sourceAttack} L${layers}`).toBe(
          sourceAttack,
        )
        expect(item.damageMultiplier * item.finalStat).toBeCloseTo(
          base * (1 + 0.25 * layers) * sourceAttack,
          6,
        )
      }
    },
  )

  it.each([0, 1, 2, 3, 4, 5] as const)(
    "rejects unlocking below mindscape 6 (rank %s)",
    (rank) => {
      const result = calculateStaticDamageFromCatalog(
        m6Request({ mindscapeRank: rank }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
        ).toBe(true)
    },
  )

  it.each([1, 3, 5, 7] as const)(
    "keeps the M6 ratio independent of the core skill level (%s)",
    (coreSkillLevel) => {
      // 天赋倍率与核心/特殊技培养档位无关：不设核心档位门槛，各档同值。
      const result = calculateCatalogResult(
        m6Request({ coreSkillLevel, layers: 3 }),
      )
      expect(settledItem(result).damageMultiplier).toBeCloseTo(8.75, 9)
    },
  )

  it("treats zero layers as a closed event and rejects illegal layer counts", () => {
    const closed = calculateCatalogResult(m6Request({ layers: 0 }))
    expect(settledItem(closed).damageMultiplier).toBe(0)
    // 未选择：无贡献。
    const unselected = calculateCatalogResult(m6Request({ selections: [] }))
    expect(settledItem(unselected).damageMultiplier).toBe(0)
    // 非法层数：负数、小数、5 都拒绝；0—4 之外的整数同样拒绝。
    for (const layers of [-1, 0.5, 5, 2.25, NaN]) {
      const rejected = calculateStaticDamageFromCatalog(m6Request({ layers }))
      expect(rejected.ok, String(layers)).toBe(false)
      if (!rejected.ok)
        expect(
          rejected.issues.some((issue) => issue.pointer.endsWith("/layers")),
          String(layers),
        ).toBe(true)
    }
    // 重复选择同一选项：拒绝，不叠加。
    const duplicated = calculateStaticDamageFromCatalog(
      m6Request({
        selections: [
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 2 },
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 2 },
        ],
      }),
    )
    expect(duplicated.ok).toBe(false)
    if (!duplicated.ok)
      expect(
        duplicated.issues.some((issue) => issue.code === "DUPLICATE_ID"),
      ).toBe(true)
  })

  it("does not accumulate across repeated settlements of the same declaration", () => {
    const request = m6Request({ layers: 4 })
    const first = calculateCatalogResult(request)
    const second = calculateCatalogResult(request)
    expect(settledItem(second).damageMultiplier).toBe(
      settledItem(first).damageMultiplier,
    )
    expect(settledItem(first).damageMultiplier).toBeCloseTo(10, 9)
  })

  it("requires the declared independent item starting from a zero multiplier", () => {
    // 缺项：MISSING_REFERENCE。
    const missing = calculateStaticDamageFromCatalog(
      m6Request({
        hit: {
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: "other",
              damageMultiplier: 2,
              stat: "attack",
              statSource: { entityId: "entity:source" },
            } as never,
          ],
        },
      }),
    )
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((issue) => issue.code === "MISSING_REFERENCE"),
      ).toBe(true)
    // 预填非零倍率：CONTEXT_MISMATCH，倍率只能由规则赋值一次。
    const prefilled = calculateStaticDamageFromCatalog(
      m6Request({ itemMultiplier: 5 }),
    )
    expect(prefilled.ok).toBe(false)
    if (!prefilled.ok)
      expect(
        prefilled.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("zero multiplier"),
        ),
      ).toBe(true)
    // 属性/角色错误：CONTEXT_MISMATCH。
    for (const [label, options] of [
      ["stat", { itemStat: "impact" as const }],
      ["role", { itemRole: "settlement" as const }],
    ] as const) {
      const mismatch = calculateStaticDamageFromCatalog(m6Request(options))
      expect(mismatch.ok, label).toBe(false)
      if (!mismatch.ok)
        expect(
          mismatch.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
          label,
        ).toBe(true)
    }
  })

  it("binds the item to the declared anomaly source and its snapshot", () => {
    // statSource 与 anomalySource 不一致：CONTEXT_MISMATCH。
    const mismatched = calculateStaticDamageFromCatalog(
      m6Request({ statSourceEntityId: "entity:attacker" as const }),
    )
    expect(mismatched.ok).toBe(false)
    if (!mismatched.ok)
      expect(
        mismatched.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("anomaly source"),
        ),
      ).toBe(true)
    // 声明快照时两处必须一致：statSource 带快照而 anomalySource 不带 → 拒绝。
    const halfSnapshot = calculateStaticDamageFromCatalog(
      m6Request({ statSourceSnapshotId: "snapshot:saved" }),
    )
    expect(halfSnapshot.ok).toBe(false)
    if (!halfSnapshot.ok)
      expect(
        halfSnapshot.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("anomaly source"),
        ),
      ).toBe(true)
    // 合法快照路径：历史攻击 200 与当前 1000 不同，项按快照读数结算。
    const historicalAttributes = [
      {
        entityId: "entity:source" as const,
        stat: "attack" as const,
        stage: "current" as const,
        value: { unit: "attack-points" as const, value: 200 },
      },
      {
        entityId: "entity:source" as const,
        stat: "anomalyProficiency" as const,
        stage: "current" as const,
        value: { unit: "anomaly-proficiency-points" as const, value: 115 },
      },
      {
        entityId: "entity:source" as const,
        stat: "penetrationRatio" as const,
        stage: "current" as const,
        value: { unit: "ratio" as const, value: 0 },
      },
    ]
    const snapshotted = calculateCatalogResult(
      m6Request({
        statSourceSnapshotId: "snapshot:saved",
        anomalySnapshotId: "snapshot:saved",
        snapshots: [
          {
            snapshotId: "snapshot:saved",
            atSeconds: 0,
            world: {
              entities: [
                {
                  kind: "actor",
                  entityId: "entity:source",
                  teamId: "team:players",
                  generalStats: {
                    attack: general(200),
                    anomalyProficiency: general(115),
                  },
                  directStats: {
                    penetrationRatio: { baseValue: 0, additions: [] },
                  },
                },
              ],
              states: [],
              distances: [],
            },
            attributes: historicalAttributes,
          },
        ],
      }),
    )
    const item = settledItem(snapshotted)
    expect(item.finalStat).toBe(200)
    expect(item.damageMultiplier * item.finalStat).toBeCloseTo(200 * 6.25, 6)
    // 快照缺攻击读数：明确拒绝，不用当前值兜底。
    const missingAttack = calculateStaticDamageFromCatalog(
      m6Request({
        statSourceSnapshotId: "snapshot:saved",
        anomalySnapshotId: "snapshot:saved",
        snapshots: [
          {
            snapshotId: "snapshot:saved",
            atSeconds: 0,
            world: {
              entities: [
                {
                  kind: "actor",
                  entityId: "entity:source",
                  teamId: "team:players",
                  generalStats: { anomalyProficiency: general(115) },
                  directStats: {
                    penetrationRatio: { baseValue: 0, additions: [] },
                  },
                },
              ],
              states: [],
              distances: [],
            },
            attributes: historicalAttributes.slice(1),
          },
        ],
      }),
    )
    expect(missingAttack.ok).toBe(false)
    if (!missingAttack.ok)
      expect(
        missingAttack.issues.some((issue) => issue.code === "MISSING_SNAPSHOT"),
      ).toBe(true)
    // 缺少显式异常来源（要求声明 anomaly-source）：缺事实明确拒绝。
    const noSource = calculateStaticDamageFromCatalog(
      m6Request({
        omitAnomalySource: true,
        damage: {
          ...(settlementTable as object),
        } as unknown as StaticCatalogDamageInput["damage"],
      }),
    )
    expect(noSource.ok).toBe(false)
    if (!noSource.ok)
      expect(
        noSource.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
  })

  it("keeps the normal vibrato path intact and out of vibrato-modified settlements", () => {
    const normalSelections = (
      layers: number,
    ): StaticCatalogDamageInput["selections"] => [
      { optionId: M0_NONPHYSICAL_BASE, bindingId: "binding:static", layers: 1 },
      { optionId: M0_LAYERS, bindingId: "binding:static", layers },
      { optionId: M2_LAYERS, bindingId: "binding:static", layers },
    ]
    // 普通颤音正例（不带颤音：改目标）：M0 基础 4.5 + 每层 0.25 与 M2 每层
    // 0.1（失衡内）在同一乘区相乘，4 层为 4.5×(1+1+0.4)=10.8。
    const normal = calculateCatalogResult(
      m6Request({
        carryTargetTag: false,
        layers: 4,
        selections: normalSelections(4),
      }),
    )
    const normalItem = settledItem(normal)
    expect(normalItem.damageMultiplier).toBeCloseTo(10.8, 9)
    // 物理正例保持来源精度：4.49×2.4=10.776。
    const normalPhysical = calculateCatalogResult(
      m6Request({
        element: "physical",
        carryTargetTag: false,
        layers: 4,
        selections: [
          {
            optionId: M0_PHYSICAL_BASE,
            bindingId: "binding:static",
            layers: 1,
          },
          { optionId: M0_LAYERS, bindingId: "binding:static", layers: 4 },
          { optionId: M2_LAYERS, bindingId: "binding:static", layers: 4 },
        ],
      }),
    )
    expect(settledItem(normalPhysical).damageMultiplier).toBeCloseTo(10.776, 9)
    // 同一绑定同时选中旧 M0/M2 与新 M6：颤音：改结算不叠旧基础/25%/10%。
    const coexisting = calculateCatalogResult(
      m6Request({
        layers: 3,
        selections: [
          ...normalSelections(3),
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 3 },
        ],
      }),
    )
    const coexistingItem = settledItem(coexisting)
    expect(coexistingItem.damageMultiplier).toBeCloseTo(8.75, 9)
    for (const effectId of [
      "agent:1511:zzz-hp:eff-ms4cey14-kzw7xx:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:eff-ms4cm9a5-wou1p2:blk-ms4cegmd-bwnttd:mindscape:0",
      "agent:1511:zzz-hp:legacy-team-anomalyReleaseMultFactor:blk-legacy:mindscape:2",
    ])
      expect(effectContribution(coexisting, effectId), effectId).toBe(0)
    // M2 的失衡易伤是独立条款：在颤音：改结算中照常贡献一次（+0.3 乘区）。
    const withVulnerable = calculateCatalogResult(
      m6Request({
        layers: 1,
        selections: [
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 1 },
          {
            optionId: M2_STAGGER_VULNERABLE,
            bindingId: "binding:static",
            layers: 1,
          },
        ],
      }),
    )
    const vulnerable = withVulnerable.evaluation.contributions.find(
      (c) =>
        c.address.kind === "factor" &&
        c.address.channel === "stun-damage-adjustment",
    )
    expect(vulnerable?.value.value).toBeCloseTo(0.3, 9)
    // 失衡乘区按基础 1.5 + 0.3 调整结算为 1.8：M2 独立易伤照常作用于
    // 颤音：改结算，不因互斥关闭。
    expect(withVulnerable.factors.nonCritical.stunDamage).toBeCloseTo(1.8, 9)
  })

  it("arbitrates the two element groups without cross-group leakage", () => {
    // 物理结算只开非物理选项：零贡献（可检测的零，不是错误）。
    const physicalOnlyNonphysical = calculateCatalogResult(
      m6Request({
        element: "physical",
        layers: 2,
        selections: [
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 2 },
        ],
      }),
    )
    expect(settledItem(physicalOnlyNonphysical).damageMultiplier).toBe(0)
    // 以太结算只开物理选项：零贡献。
    const etherOnlyPhysical = calculateCatalogResult(
      m6Request({
        element: "ether",
        layers: 2,
        selections: [
          { optionId: M6_PHYSICAL, bindingId: "binding:static", layers: 2 },
        ],
      }),
    )
    expect(settledItem(etherOnlyPhysical).damageMultiplier).toBe(0)
    // 两组同开：元素裁决，只有命中组的层数生效。
    const both = calculateCatalogResult(
      m6Request({
        element: "wind",
        layers: 4,
        selections: [
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 4 },
          { optionId: M6_PHYSICAL, bindingId: "binding:static", layers: 1 },
        ],
      }),
    )
    expect(settledItem(both).damageMultiplier).toBeCloseTo(10, 9)
    // 非六属性原异常（auric-ink）：两组都不匹配，零贡献。
    const outside = calculateCatalogResult(
      m6Request({
        element: "auric-ink",
        layers: 2,
        selections: [
          { optionId: M6_NONPHYSICAL, bindingId: "binding:static", layers: 2 },
          { optionId: M6_PHYSICAL, bindingId: "binding:static", layers: 2 },
        ],
      }),
    )
    expect(settledItem(outside).damageMultiplier).toBe(0)
  })

  it("does not contribute without the settlement target or with another damage kind", () => {
    // 不携带独立目标：规则条件不成立，零贡献（伤害项仍在，倍率保持 0）。
    const untagged = calculateCatalogResult(
      m6Request({ carryTargetTag: false, layers: 2 }),
    )
    expect(settledItem(untagged).damageMultiplier).toBe(0)
    expect(effectContribution(untagged, M6_NONPHYSICAL_EFFECT)).toBe(0)
    // 借用普通直伤种类：伤害对象无法声明 anomalySource，要求项缺事实拒绝。
    const regular = calculateStaticDamageFromCatalog(
      m6Request({
        layers: 2,
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
            isTargetStunned: true,
            targetBaseStunDamageMultiplier: 1.5,
            targetStunDamageMultiplierAdjustments: [],
          },
        } as unknown as StaticCatalogDamageInput["damage"],
      }),
    )
    expect(regular.ok).toBe(false)
    if (!regular.ok)
      expect(
        regular.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
  })

  it("scopes the multiplier to the declared item only", () => {
    const scoped = calculateCatalogResult(
      m6Request({
        layers: 2,
        extraItems: [
          {
            mode: "direct",
            role: "base",
            itemId: "other:settlement",
            damageMultiplier: 2,
            stat: "attack",
            statSource: { entityId: "entity:source" },
          } as never,
        ],
      }),
    )
    expect(settledItem(scoped).damageMultiplier).toBeCloseTo(7.5, 9)
    const other = settledItem(scoped, "other:settlement")
    // 附加伤害项不吃颤音：改倍率：精确 itemIds 绑定，不重复贡献整个请求。
    expect(other.damageMultiplier).toBeCloseTo(2, 9)
    expect(effectContribution(scoped, M6_NONPHYSICAL_EFFECT)).toBeCloseTo(
      7.5,
      9,
    )
  })

  it("keeps another holder's declaration out of this settlement", () => {
    const base = inputFor()
    const mkActor = (id: string, attack: number) => ({
      kind: "actor" as const,
      entityId: id as EntityId,
      teamId: "team:players" as const,
      generalStats: {
        attack: general(attack),
        anomalyProficiency: general(115),
      },
      directStats: {
        criticalRate: { baseValue: 0, additions: [] },
        criticalDamage: { baseValue: 0, additions: [] },
        penetrationRatio: { baseValue: 0, additions: [] },
        sharpCriticalDamage: { baseValue: 0, additions: [] },
      },
    })
    const result = calculateCatalogResult(
      m6Request({
        layers: 2,
        actorSources: [
          { entityId: "entity:attacker", agentEntityId: "1511" },
          { entityId: "entity:second", agentEntityId: "1511" },
          { entityId: "entity:source", agentEntityId: "1561" },
        ],
        bindings: [
          {
            bindingId: "binding:first",
            kind: "agent",
            holderId: "entity:attacker",
            sourceEntityId: "1511",
            eligible: true,
            configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
          },
          {
            bindingId: "binding:second",
            kind: "agent",
            holderId: "entity:second",
            sourceEntityId: "1511",
            eligible: true,
            configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
          },
        ] as never,
        selections: [
          {
            optionId: M6_NONPHYSICAL,
            bindingId: "binding:first",
            layers: 2,
          },
          {
            optionId: M6_NONPHYSICAL,
            bindingId: "binding:second",
            layers: 4,
          },
        ],
        world: {
          ...base.world,
          entities: [
            mkActor("entity:attacker", 2400),
            mkActor("entity:second", 3100),
            mkActor("entity:source", 1000),
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
      }),
    )
    // 只有本次结算角色（hit.actorId）绑定的层数生效：另一持有者的 4 层
    // 声明不串入本次事件。
    expect(settledItem(result).damageMultiplier).toBeCloseTo(7.5, 9)
  })

  /**
   * 分类锁定（round1 修复 R01）：[颤音：改]独立结算必须以 uncategorized
   * 分类进行，要求项声明 requiredSkillCategory 复用既有最终有效分类守卫
   * （原始 skillCategory、保留分类标签、合法目标展开的分类与追加攻击
   * 标签都参与比较）。以合法非零请求为对照，每次只改变一个分类来源：
   * 借用普通/连携原始分类、保留 category 标签、follow-up 标签、附加南宫
   * 羽自身真实普攻目标（可爱地雷飞天撞）都按 CONTEXT_MISMATCH 拒绝，
   * 不能让独立异放吃入按技能分类筛选的增益。
   */
  it.each([
    ["nonphysical", "ether", M6_NONPHYSICAL],
    ["physical", "physical", M6_PHYSICAL],
  ] as const)(
    "locks the %s settlement classification to uncategorized",
    (group, element, optionId) => {
      // 对照正例：合法独立结算（uncategorized、仅携带独立目标）非零可算。
      const control = calculateCatalogResult(
        m6Request({
          element,
          layers: 2,
          selections: [{ optionId, bindingId: "binding:static", layers: 2 }],
        }),
      )
      expect(settledItem(control).damageMultiplier).toBeCloseTo(
        element === "physical" ? 4.991 * 1.5 : 7.5,
        9,
      )
      for (const [label, hit] of [
        ["raw-category", { skillCategory: "chain" }],
        ["retained-category-tag", { skillTags: ["zzz-hp:category:chain"] }],
        ["follow-up-tag", { skillTags: ["zzz-hp:follow-up"] }],
        [
          "additional-real-basic-target",
          {
            skillTargetIds: [
              M6_TARGET,
              "zzz-hp:skill:nangongyu-basic-ms4dacwf",
            ],
          },
        ],
      ] as const) {
        const rejected = calculateStaticDamageFromCatalog(
          m6Request({
            element,
            layers: 2,
            selections: [{ optionId, bindingId: "binding:static", layers: 2 }],
            hit,
          }),
        )
        expect(rejected.ok, `${group}:${label}`).toBe(false)
        if (!rejected.ok) {
          expect(
            rejected.issues.some(
              (issue) =>
                issue.code === "CONTEXT_MISMATCH" &&
                issue.message.includes("must settle as uncategorized"),
            ),
            `${group}:${label}: ${JSON.stringify(rejected.issues)}`,
          ).toBe(true)
        }
      }
    },
  )

  it("keeps the real Koleda chain bonus out of the vibrato-modified settlement", () => {
    // 同队珂蕾妲开启真实团队连携增伤选项（legacy-team-skillDmgBonus +35%）：
    // 合法独立结算不吃该增益（damageBonus 保持 1，期望伤害 9313.630801104971，
    // 与 review round1 ABUSE 探针同输入）；修复前借 chain 分类或保留 chain
    // 标签会把异放算入该增益（×1.35 = 12573.401581491713），修复后按分类
    // 冲突明确拒绝，不产生零贡献伪通过。
    const koledaWorld = (overrides: M6RequestOptions): M6RequestOptions => {
      const base = inputFor()
      const actor = (id: string, attack: number, ap: number) => ({
        kind: "actor" as const,
        entityId: id as EntityId,
        teamId: "team:players" as const,
        generalStats: {
          attack: general(attack),
          anomalyProficiency: general(ap),
        },
        directStats: {
          criticalRate: { baseValue: 0, additions: [] },
          criticalDamage: { baseValue: 0, additions: [] },
          penetrationRatio: { baseValue: 0, additions: [] },
        },
      })
      return {
        ...overrides,
        actorSources: [
          { entityId: "entity:attacker", agentEntityId: "1511" },
          { entityId: "entity:source", agentEntityId: "1561" },
          { entityId: "entity:koleda", agentEntityId: "1101" },
        ],
        bindings: [
          {
            bindingId: "binding:static",
            kind: "agent",
            holderId: "entity:attacker",
            sourceEntityId: "1511",
            eligible: true,
            configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
          },
          {
            bindingId: "binding:koleda",
            kind: "agent",
            holderId: "entity:koleda",
            sourceEntityId: "1101",
            eligible: true,
            configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
          },
        ] as never,
        selections: [
          {
            optionId: M6_NONPHYSICAL,
            bindingId: "binding:static",
            layers: 2,
          },
          {
            optionId:
              "agents:koleda:mindscape:0:blk-legacy:legacy-team-skillDmgBonus",
            bindingId: "binding:koleda",
            layers: 1,
          },
        ],
        world: {
          ...base.world,
          entities: [
            actor("entity:attacker", 2400, 480),
            actor("entity:source", 1000, 115),
            actor("entity:koleda", 1500, 100),
            base.world.entities[1]!,
          ],
          states: [],
          distances: [],
        },
      }
    }
    const legal = calculateCatalogResult(m6Request(koledaWorld({ layers: 2 })))
    expect(legal.factors.nonCritical.damageBonus).toBeCloseTo(1, 9)
    expect(
      effectContribution(
        legal,
        "agent:1101:zzz-hp:legacy-team-skillDmgBonus:blk-legacy:mindscape:0",
      ),
    ).toBe(0)
    expect(legal.expected).toBeCloseTo(9313.630801104971, 6)
    // 只改一个分类来源（原始 chain 分类 / 保留 chain 标签）都拒绝。
    for (const [label, hit] of [
      ["raw-category", { skillCategory: "chain" }],
      ["retained-category-tag", { skillTags: ["zzz-hp:category:chain"] }],
    ] as const) {
      const rejected = calculateStaticDamageFromCatalog(
        m6Request(koledaWorld({ layers: 2, hit })),
      )
      expect(rejected.ok, label).toBe(false)
      if (!rejected.ok)
        expect(
          rejected.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("must settle as uncategorized"),
          ),
          `${label}: ${JSON.stringify(rejected.issues)}`,
        ).toBe(true)
    }
  })
})

import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  ContributionRule,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import { inputFor, literal } from "./static-fixtures.ts"

/**
 * PR09 完整状态层数桥接与 hit-adjustment 组合的公共入口边界（不定义游戏
 * 语义）：验证现行 core 目录入口已支持「hit-adjustment 的值表达式消费
 * layerCountInputName 派生 count 输入」——一条 supplied 单实例贡献按完整
 * 倍率表达式（基础 × (1 + 0.25 × 层数)）对独立伤害项赋值一次。该能力在
 * PR09 实施前经同形探针确认（无需 core 改动）；本用例以受控合成目录锁定
 * 该公共契约，防止引擎回归。目录定义校验强制恰好一条贡献真实消费 count
 * 输入（PR04 边界用例覆盖定义拒绝形态）。
 */
const LAYER_COUNT_INPUT_NAME = "test:vibrato-modified:layers"
const ITEM_ID = "test:vibrato-modified"

const reference = [
  {
    sourceId: "fairy-spec",
    version: "1",
    locale: "zh",
    resourcePath: "docs/specs/effects/static-snapshot.md",
    pointer: "",
  },
] as const

const source = {
  identity: { kind: "agent" as const, entityId: "1511" },
  section: "test",
  references: reference as unknown as ContributionRule["source"]["references"],
}

const rule: ContributionRule = {
  kind: "contribution",
  effectId: "agent:1511:test:vibrato-modified" as never,
  source,
  config: { kind: "constant", value: true },
  parameters: {},
  activation: {
    kind: "supplied",
    maximumLayers: literal("count", 1),
  },
  scope: "hit",
  beneficiary: { kind: "holder" },
  when: { kind: "constant", value: true },
  operation: {
    kind: "hit-adjustment",
    field: "damageMultiplier",
    operator: "add",
    itemIds: [ITEM_ID],
    value: {
      kind: "multiply",
      unit: "multiplier",
      value: { kind: "literal", unit: "multiplier", value: 5 },
      coefficient: {
        kind: "add",
        unit: "ratio",
        operands: [
          { kind: "literal", unit: "ratio", value: 1 },
          {
            kind: "convert",
            unit: "ratio",
            input: {
              kind: "input",
              unit: "count",
              name: LAYER_COUNT_INPUT_NAME,
            },
            rate: { kind: "literal", unit: "multiplier", value: 0.25 },
          },
        ],
      },
    },
  } as unknown as Extract<
    ContributionRule["operation"],
    { kind: "hit-adjustment" }
  >,
}

const definitions: RuleSet = {
  schemaVersion: 1,
  ruleSetId: "static-tests",
  revision: "1",
  effects: [rule],
  states: [],
  actions: [],
}

const catalog = {
  schemaVersion: 1,
  ruleSetId: definitions.ruleSetId,
  revision: definitions.revision,
  source: { repository: "test", commit: "1", files: [] },
  entities: [
    {
      catalogEntityId: "test:agent",
      upstreamId: "nangongyu",
      name: "南宫羽",
      identity: { kind: "agent", entityId: "1511" },
      status: "mapped",
      profession: "异常",
      element: "ether",
    },
  ],
  options: [
    {
      optionId: "option:vibrato-modified",
      catalogEntityId: "test:agent",
      name: "颤音：改",
      conditionDescription: "test",
      target: "self",
      variants: [
        {
          configuration: {},
          status: "converted",
          references: reference,
          effectIds: [rule.effectId],
          maximumLayers: 4,
          layerCountInputName: LAYER_COUNT_INPUT_NAME,
          inputs: [],
          applicability: {},
          differences: [],
        },
      ],
    },
  ],
  skillTargets: [],
  differences: [],
} as unknown as StaticEffectCatalog

describe("PR09 layer bridge: hit-adjustment consumes the bridged layer count", () => {
  it("validates the catalog shape and assigns the full multiplier once per logical layer count", () => {
    const parsed = parseEffectRuleSet(definitions)
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
    const validated = validateStaticCatalog(catalog, parsed.value)
    expect(validated.ok ? [] : validated.issues).toEqual([])

    const base = inputFor()
    const request = (layers: number): StaticCatalogDamageInput =>
      ({
        ...base,
        definitions: parsed.value,
        catalog,
        bindings: [
          {
            kind: "agent",
            bindingId: "binding:static",
            holderId: "entity:attacker",
            sourceEntityId: "1511",
            eligible: true,
            configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
          },
        ],
        actorSources: [{ entityId: "entity:attacker", agentEntityId: "1511" }],
        selections: [
          {
            optionId: "option:vibrato-modified",
            bindingId: "binding:static",
            layers,
          },
        ],
        hit: {
          ...base.hit,
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: ITEM_ID,
              stat: "attack",
              statSource: { entityId: "entity:attacker" },
              damageMultiplier: 0,
            },
          ],
        },
      }) as unknown as StaticCatalogDamageInput

    for (const [layers, expected] of [
      [1, 6.25],
      [2, 7.5],
      [3, 8.75],
      [4, 10],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(request(layers))
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      const item = result.value.evaluation.hit!.damageItems.find(
        (entry) => entry.itemId === ITEM_ID,
      )!
      expect(item.damageMultiplier).toBeCloseTo(expected, 9)
    }
    // 0 层关闭：不派生输入、不激活规则，伤害项保持零倍率。
    const closed = calculateStaticDamageFromCatalog(request(0))
    expect(closed.ok, JSON.stringify(closed)).toBe(true)
    if (!closed.ok) throw new Error(JSON.stringify(closed.issues))
    expect(
      closed.value.evaluation.hit!.damageItems.find(
        (entry) => entry.itemId === ITEM_ID,
      )!.damageMultiplier,
    ).toBe(0)
    // 非法层数：目录选择阶段按 0..4 严格整数拒绝。
    for (const layers of [-1, 0.5, 5]) {
      const rejected = calculateStaticDamageFromCatalog(request(layers))
      expect(rejected.ok).toBe(false)
      if (!rejected.ok)
        expect(
          rejected.issues.some((issue) => issue.pointer.endsWith("/layers")),
        ).toBe(true)
    }
  })
})

import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  ContributionRule,
  RuleSet,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import { inputFor } from "./static-fixtures.ts"

/**
 * PR04 目录桥接边界的独立夹具：完整状态层数输入由一条 supplied 单实例
 * contribution 通过 count 输入消费；可附相关 modification。
 */
const LAYER_COUNT_INPUT_NAME = "test:complete-state:layers"
const IMPACT_INPUT_NAME = "test:complete-state:impact"

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
  identity: { kind: "agent" as const, entityId: "1311" },
  section: "test",
  references: reference as unknown as ContributionRule["source"]["references"],
}

const completeStateOperation = {
  kind: "factor-contribution",
  channel: "damage-bonus",
  value: {
    kind: "minimum",
    unit: "ratio",
    operands: [
      { kind: "literal", unit: "ratio", value: 0.75 },
      {
        kind: "multiply",
        unit: "ratio",
        value: {
          kind: "convert",
          unit: "ratio",
          input: {
            kind: "input",
            unit: "impact-points",
            name: IMPACT_INPUT_NAME,
          },
          rate: { kind: "literal", unit: "multiplier", value: 0.00025 },
        },
        coefficient: {
          kind: "convert",
          unit: "multiplier",
          input: {
            kind: "input",
            unit: "count",
            name: LAYER_COUNT_INPUT_NAME,
          },
          rate: { kind: "literal", unit: "multiplier", value: 1 },
        },
      },
    ],
  },
} as unknown as Extract<
  ContributionRule["operation"],
  { kind: "factor-contribution" }
>

/** maximumLayers 字面量的键顺序可替换，用于验证目录不按 JSON 字节比较。 */
function completeStateActivation(
  keyOrder: "kind-first" | "value-first",
): ContributionRule["activation"] {
  const literalOne =
    keyOrder === "kind-first"
      ? { kind: "literal" as const, unit: "count" as const, value: 1 }
      : { value: 1, unit: "count" as const, kind: "literal" as const }
  return { kind: "supplied", maximumLayers: literalOne }
}

interface BoundaryOptions {
  readonly activation?: ContributionRule["activation"]
  readonly extraContribution?: boolean
  readonly modification?: boolean
  readonly variantInputs?: readonly {
    readonly name: string
    readonly unit: string
    readonly description: string
  }[]
  /**
   * 声明桥接输入名；`null` 表示真正省略该字段（退回普通叠层行为）。
   * 未提供时使用默认桥接名。
   */
  readonly layerCountInputName?: string | null
  /** 变体只引用普通叠层贡献且不声明桥接：验证既有按层展开。 */
  readonly stackedOnlyVariant?: boolean
  /** 追加第二个选项，也声明同名桥接，用于同 binding 派生同键冲突。 */
  readonly secondBridgedOption?: boolean
}

function boundaryFixture(options: BoundaryOptions = {}): {
  readonly catalog: StaticEffectCatalog
  readonly definitions: RuleSet
  readonly issues: readonly { code: string; pointer: string }[]
} {
  const completeStateEffect: ContributionRule = {
    kind: "contribution",
    effectId: "agent:1311:test:complete-state" as never,
    source,
    config: { kind: "constant", value: true },
    parameters: {},
    activation: options.activation ?? completeStateActivation("kind-first"),
    scope: "hit",
    beneficiary: { kind: "team" },
    when: { kind: "constant", value: true },
    operation: completeStateOperation,
  }
  const stackedContribution: ContributionRule = {
    ...completeStateEffect,
    effectId: "agent:1311:test:stacked" as never,
    activation: {
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 20 },
    },
    operation: {
      ...completeStateOperation,
      value: { kind: "literal", unit: "ratio", value: 0.01 },
    } as unknown as Extract<
      ContributionRule["operation"],
      { kind: "factor-contribution" }
    >,
  }
  const modification: RuleSet["effects"][number] = {
    kind: "modification",
    phase: "configuration",
    effectId: "agent:1311:test:scale" as never,
    source,
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: { kind: "literal", unit: "count", value: 2 },
    },
    parameters: {},
    target: {
      kind: "effect",
      effectId: "agent:1311:test:complete-state" as never,
    },
    modifications: [
      {
        field: "output",
        unit: "ratio",
        change: {
          operator: "scale",
          value: { kind: "literal", unit: "multiplier", value: 1.2 },
        },
      },
    ],
  }
  const definitions: RuleSet = {
    schemaVersion: 1,
    ruleSetId: "static-tests",
    revision: "1",
    effects: [
      completeStateEffect,
      ...(options.extraContribution || options.stackedOnlyVariant
        ? [stackedContribution]
        : []),
      ...(options.modification ? [modification] : []),
    ],
    states: [],
    actions: [],
  }
  const parsed = parseEffectRuleSet(definitions)
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
  // `null` 表示目录变体真正省略桥接字段；未声明桥接的叠层保持既有展开。
  const layerCountInputName =
    options.layerCountInputName === null
      ? null
      : (options.layerCountInputName ?? LAYER_COUNT_INPUT_NAME)
  const variantEffectIds =
    options.stackedOnlyVariant === true
      ? ["agent:1311:test:stacked"]
      : [
          "agent:1311:test:complete-state",
          ...(options.extraContribution ? ["agent:1311:test:stacked"] : []),
          ...(options.modification ? ["agent:1311:test:scale"] : []),
        ]
  const bridgedVariant = () => ({
    configuration: {},
    status: "corrected",
    references: reference,
    effectIds: variantEffectIds,
    maximumLayers: 20,
    inputs: options.variantInputs ?? [],
    applicability: {},
    differences: [],
    ...(layerCountInputName === null ? {} : { layerCountInputName }),
  })
  const catalog = {
    schemaVersion: 1,
    ruleSetId: definitions.ruleSetId,
    revision: definitions.revision,
    source: { repository: "test", commit: "1", files: [] },
    entities: [
      {
        catalogEntityId: "test:agent",
        upstreamId: "astra",
        name: "Astra",
        identity: { kind: "agent", entityId: "1311" },
        status: "mapped",
        profession: "支援",
        element: "ether",
      },
    ],
    options: [
      {
        optionId: "option:complete-state",
        catalogEntityId: "test:agent",
        name: "完整状态",
        conditionDescription: "test",
        target: "team",
        variants: [bridgedVariant()],
      },
      ...(options.secondBridgedOption
        ? [
            {
              optionId: "option:complete-state-copy",
              catalogEntityId: "test:agent",
              name: "完整状态副本",
              conditionDescription: "test",
              target: "team",
              variants: [bridgedVariant()],
            },
          ]
        : []),
    ],
    skillTargets: [],
    differences: [],
  } as unknown as StaticEffectCatalog
  const validated = validateStaticCatalog(catalog, parsed.value)
  return {
    catalog,
    definitions: parsed.value,
    issues: validated.ok
      ? []
      : validated.issues.map((issue) => ({
          code: issue.code,
          pointer: issue.pointer,
        })),
  }
}

function catalogInput(
  catalog: StaticEffectCatalog,
  definitions: RuleSet,
  selections: StaticCatalogDamageInput["selections"],
  inputs: StaticCatalogDamageInput["inputs"] = [],
): StaticCatalogDamageInput {
  const base = inputFor()
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: "entity:attacker",
        sourceEntityId: "1311",
        eligible: true,
        configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
      },
    ],
    selections,
    actorSources: [{ entityId: "entity:attacker", agentEntityId: "1311" }],
    hit: {
      ...base.hit,
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "base",
          damageMultiplier: 2,
          stat: "attack" as const,
          statSource: { entityId: "entity:attacker" as const },
        },
      ],
    },
    damage: base.damage as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
    ...(inputs === undefined || inputs.length === 0 ? {} : { inputs }),
  } as unknown as StaticCatalogDamageInput
}

function evaluate(input: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function damageBonusOf(result: StaticDamageResult): number {
  return result.factors.nonCritical["damageBonus"]! - 1
}

describe("PR04 layer-count bridge definition boundaries", () => {
  it("accepts the single-contribution definition regardless of literal key order", () => {
    for (const keyOrder of ["kind-first", "value-first"] as const) {
      const { issues } = boundaryFixture({
        activation: completeStateActivation(keyOrder),
      })
      expect(issues, keyOrder).toEqual([])
    }
  })

  it("accepts a related modification alongside the single contribution", () => {
    const { issues } = boundaryFixture({ modification: true })
    expect(issues).toEqual([])
  })

  it("rejects an external requirement that reuses the derived layer-count name", () => {
    const { issues } = boundaryFixture({
      variantInputs: [
        {
          name: LAYER_COUNT_INPUT_NAME,
          unit: "count",
          description: "Duplicated declaration",
        },
      ],
    })
    expect(issues).toEqual([
      expect.objectContaining({
        code: "INVALID_DEFINITION",
        pointer: expect.stringContaining("/layerCountInputName"),
      }),
    ])
  })

  it("rejects a second non-modification contribution in the same variant", () => {
    const { issues } = boundaryFixture({ extraContribution: true })
    expect(issues).toEqual([
      expect.objectContaining({
        code: "INVALID_DEFINITION",
        pointer: expect.stringContaining("/layerCountInputName"),
      }),
    ])
  })

  it("rejects a bridge name consumed only with the wrong unit", () => {
    // 桥接名指向同变体的 impact-points 输入：名字真实被消费，但单位不是
    // count，定义阶段拒绝。
    const wrongUnit = boundaryFixture({
      layerCountInputName: IMPACT_INPUT_NAME,
    })
    expect(wrongUnit.issues).toEqual([
      expect.objectContaining({
        code: "INVALID_DEFINITION",
        pointer: expect.stringContaining("/layerCountInputName"),
      }),
    ])
  })

  it("rejects a bridge name that no contribution consumes", () => {
    const unconsumed = boundaryFixture({
      layerCountInputName: "test:unconsumed:layers",
    })
    expect(unconsumed.issues).toEqual([
      expect.objectContaining({
        code: "INVALID_DEFINITION",
        pointer: expect.stringContaining("/layerCountInputName"),
      }),
    ])
  })

  it("omits the undeclared bridge and keeps ordinary stacked expansion", () => {
    const { catalog, definitions, issues } = boundaryFixture({
      layerCountInputName: null,
      stackedOnlyVariant: true,
    })
    expect(issues).toEqual([])
    const variant = catalog.options[0]!.variants[0]!
    expect(Object.hasOwn(variant, "layerCountInputName")).toBe(false)
    // 未声明桥接的普通叠层仍按 selection.layers 逐层展开：5 层 × 1% = 5%。
    expect(
      damageBonusOf(
        evaluate(
          catalogInput(catalog, definitions, [
            {
              optionId: "option:complete-state",
              bindingId: "binding:static",
              layers: 5,
            },
          ]),
        ),
      ),
    ).toBeCloseTo(0.05, 12)
  })

  it("rejects two options that derive the same layer-count key in one binding", () => {
    const { catalog, definitions, issues } = boundaryFixture({
      secondBridgedOption: true,
    })
    expect(issues).toEqual([])
    // 两个不同选项在同一 binding 上派生同一个 (bindingId, name) 键：拒绝，
    // 不静默覆盖。
    const collision = calculateStaticDamageFromCatalog(
      catalogInput(
        catalog,
        definitions,
        [
          {
            optionId: "option:complete-state",
            bindingId: "binding:static",
            layers: 5,
          },
          {
            optionId: "option:complete-state-copy",
            bindingId: "binding:static",
            layers: 5,
          },
        ],
        [
          {
            bindingId: "binding:static" as never,
            name: IMPACT_INPUT_NAME as never,
            value: { unit: "impact-points", value: 200 },
          },
        ],
      ),
    )
    expect(collision.ok).toBe(false)
    if (!collision.ok)
      expect(
        collision.issues.some(
          (issue) =>
            issue.code === "DUPLICATE_ID" &&
            issue.message.includes("derive the same layer-count input"),
        ),
      ).toBe(true)
  })

  it("keeps same-named derived inputs isolated between bindings", () => {
    const { catalog, definitions, issues } = boundaryFixture({
      modification: true,
    })
    expect(issues).toEqual([])
    // 两个独立 binding 使用同名冲击力输入与同名派生 count 键，但各自的
    // 层数与培养不同。夹具公式是 min(0.75, I × 0.00025 × L) 的独立探针：
    // M0 绑定 5 层 I200 = 0.25，M2 绑定 10 层 I270 = 0.675（未触及 0.75
    // 封顶，避免封顶同时遮住冲击力串值）× 1.2 = 0.81，合计 1.06；若第二
    // 绑定误用第一绑定的 I200，其贡献会是 0.5 × 1.2 = 0.6，可被分绑定
    // 断言直接区分。层数、冲击力或强化任一项串用都会改变这些数值。
    const base = catalogInput(catalog, definitions, [])
    const secondActor = {
      ...(base.world.entities[0] as unknown as Record<string, unknown>),
      entityId: "entity:second",
    }
    const result = evaluate({
      ...base,
      bindings: [
        {
          bindingId: "binding:first",
          kind: "agent",
          holderId: "entity:attacker",
          sourceEntityId: "1311",
          eligible: true,
          configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
        },
        {
          bindingId: "binding:second",
          kind: "agent",
          holderId: "entity:second",
          sourceEntityId: "1311",
          eligible: true,
          configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
        },
      ],
      selections: [
        {
          optionId: "option:complete-state",
          bindingId: "binding:first",
          layers: 5,
        },
        {
          optionId: "option:complete-state",
          bindingId: "binding:second",
          layers: 10,
        },
      ],
      inputs: [
        {
          bindingId: "binding:first" as never,
          name: IMPACT_INPUT_NAME as never,
          value: { unit: "impact-points", value: 200 },
        },
        {
          bindingId: "binding:second" as never,
          name: IMPACT_INPUT_NAME as never,
          value: { unit: "impact-points", value: 270 },
        },
      ],
      actorSources: [
        { entityId: "entity:attacker", agentEntityId: "1311" },
        { entityId: "entity:second", agentEntityId: "1311" },
      ],
      world: {
        ...base.world,
        entities: [...base.world.entities, secondActor],
      },
    } as unknown as StaticCatalogDamageInput)
    const byBinding = new Map<string, number>()
    for (const entry of result.evaluation.contributions)
      if (
        entry.address.kind === "factor" &&
        entry.address.channel === "damage-bonus"
      )
        byBinding.set(
          entry.origin.bindingId,
          (byBinding.get(entry.origin.bindingId) ?? 0) + entry.value.value,
        )
    expect(byBinding.get("binding:first")).toBeCloseTo(0.25, 12)
    expect(byBinding.get("binding:second")).toBeCloseTo(0.81, 12)
    expect(damageBonusOf(result)).toBeCloseTo(1.06, 12)
    // 影画 2 的强化只作用于 M2 绑定自己的实例，不串到 M0 绑定。
    const scaled = result.evaluation.contributions.filter((entry) =>
      entry.appliedModifications.includes("agent:1311:test:scale"),
    )
    expect(scaled.map((entry) => entry.origin.bindingId)).toEqual([
      "binding:second",
    ])
  })

  it("keeps runtime guards: external duplicates and the zero-layer close", () => {
    const { catalog, definitions, issues } = boundaryFixture()
    expect(issues).toEqual([])
    // 外部同键输入被拒绝，不静默覆盖派生值。
    const overridden = calculateStaticDamageFromCatalog(
      catalogInput(
        catalog,
        definitions,
        [
          {
            optionId: "option:complete-state",
            bindingId: "binding:static",
            layers: 5,
          },
        ],
        [
          {
            bindingId: "binding:static" as never,
            name: LAYER_COUNT_INPUT_NAME as never,
            value: { unit: "count", value: 5 },
          },
        ],
      ),
    )
    expect(overridden.ok).toBe(false)
    // 0 层关闭：不需要冲击力输入，也不派生内部 count。
    const closed = calculateStaticDamageFromCatalog(
      catalogInput(catalog, definitions, [
        {
          optionId: "option:complete-state",
          bindingId: "binding:static",
          layers: 0,
        },
      ]),
    )
    expect(closed.ok, JSON.stringify(closed)).toBe(true)
  })
})

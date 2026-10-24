import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { inputFor } from "./static-fixtures.ts"
import { resolveAgentAction } from "../../../data/src/skills/resolve.ts"
import type { AgentActions } from "../../../data/src/skills/types.ts"

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

/** M0—M6 共用的唯一完整状态选项：影画 2 起由配置修改自动强化同一贡献。 */
const COMPLETE_STATE_OPTION =
  "agents:lighter:mindscape:0:elation-complete-state"
/** 影画 2 的独立失衡易伤（另一项机制，不随昂扬完整状态开关）。 */
const M2_STAGGER_OPTION =
  "agents:lighter:mindscape:2:blk-legacy:legacy-team-staggerVulnerable"
/** 被完整状态取代的四条部分选项：继续作为语义冲突迁移入口。 */
const LEGACY_PARTIAL_OPTIONS = [
  "agents:lighter:mindscape:0:blk-ms4aoho0-grnxav:eff-ms4aoho0-q3wbdv",
  "agents:lighter:mindscape:0:blk-ms4aoho0-grnxav:eff-ms4atnfh-29yr0r",
  "agents:lighter:mindscape:2:blk-legacy:eff-ms4b0whf-x6n1xw",
  "agents:lighter:mindscape:2:blk-legacy:eff-ms4b2g6y-2q6n1w",
] as const
/** 被取代记录在规则集中的身份：完整状态落地后必须不再可执行。 */
const LEGACY_RULE_IDS = [
  "agent:1161:zzz-hp:eff-ms4atnfh-29yr0r:blk-ms4aoho0-grnxav:mindscape:0",
  "agent:1161:zzz-hp:eff-ms4b0whf-x6n1xw:blk-legacy:mindscape:2",
  "agent:1161:zzz-hp:eff-ms4b2g6y-2q6n1w:blk-legacy:mindscape:2",
] as const
const COMPLETE_STATE_CONTRIBUTION =
  "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0"
const SCALE_MODIFICATION_ID =
  "agent:1161:zzz-hp:complete-state-elation-scale:eff-ms4b0whf-x6n1xw"

const completeStateOption = catalog.options.find(
  (option) => option.optionId === COMPLETE_STATE_OPTION,
)!
const completeStateVariant = completeStateOption.variants[0]!

/**
 * 独立公式（验收锚点来源，不由被测实现计算）：
 *   base = min(.75, (.0125 + max(0, I − 170) × .00025) × L)
 *   M2   = base × 1.2
 */
const expectedBonus = (impact: number, layers: number, mindscape: number) =>
  Math.min(0.75, (0.0125 + Math.max(0, impact - 170) * 0.00025) * layers) *
  (mindscape >= 2 ? 1.2 : 1)

type ElationActor = "lighter" | "miyabi" | "zhuyuan" | "anby" | "enemy"

const actorEntityIds: Readonly<Record<ElationActor, string>> = {
  lighter: "entity:lighter",
  miyabi: "entity:miyabi",
  zhuyuan: "entity:zhuyuan",
  anby: "entity:anby",
  enemy: "entity:enemy",
}
/** 每个受观测角色对应的目录身份：昂扬按命中元素而非角色固有元素受益。 */
const actorAgentEntityIds: Readonly<Record<ElationActor, string>> = {
  lighter: "1161",
  miyabi: "1091",
  zhuyuan: "1241",
  anby: "1011",
  enemy: "1011",
}

function elationInput(options: {
  readonly mindscape: MindscapeRank
  readonly layers: number
  readonly impact?: number
  readonly extraOptions?: readonly string[]
  readonly duplicateSelection?: boolean
  readonly externalLayerCount?: number
  readonly element?: StaticCatalogDamageInput["hit"]["element"]
  readonly targetState?: "stunned"
  readonly actor?: ElationActor
  readonly damageItems?: StaticCatalogDamageInput["hit"]["damageItems"]
  readonly actionId?: string
  readonly skillCategory?: string
}): StaticCatalogDamageInput {
  const base = inputFor()
  const baseDamage = base.damage as Extract<
    StaticCatalogDamageInput["damage"],
    { kind: "regular" }
  >
  const actor = options.actor ?? "lighter"
  const actorEntityId = actorEntityIds[actor]
  const impactInputName = completeStateVariant.inputs[0]!.name
  if (completeStateVariant.mechanism?.kind !== "complete-state")
    throw new Error("test fixture: expected a complete-state mechanism")
  const layerCountInputName = completeStateVariant.mechanism.layerCountInputName
  const selections = [
    {
      optionId: COMPLETE_STATE_OPTION,
      bindingId: "binding:static",
      layers: options.layers,
    },
    ...(options.duplicateSelection
      ? [
          {
            optionId: COMPLETE_STATE_OPTION,
            bindingId: "binding:static",
            layers: options.layers,
          },
        ]
      : []),
    ...(options.extraOptions ?? []).map((optionId) => ({
      optionId,
      bindingId: "binding:static",
      layers: 1,
    })),
  ]
  const inputs = [
    ...(options.impact === undefined
      ? []
      : [
          {
            bindingId: "binding:static",
            name: impactInputName,
            value: { unit: "impact-points" as const, value: options.impact },
          },
        ]),
    ...(options.externalLayerCount === undefined
      ? []
      : [
          {
            bindingId: "binding:static",
            name: layerCountInputName,
            value: {
              unit: "count" as const,
              value: options.externalLayerCount,
            },
          },
        ]),
  ]
  const observedActors = [
    ...new Set<ElationActor>(["enemy", "lighter", actor]),
  ].map((entry) => ({
    kind: "actor" as const,
    entityId: actorEntityIds[entry],
    teamId: entry === "enemy" ? "team:enemies" : "team:players",
    generalStats: {
      attack: {
        baseValue: 1000,
        initialPercentage: [],
        initialFixed: [],
        finalPercentage: [],
        finalFixed: [],
      },
      health: {
        baseValue: 24000,
        initialPercentage: [],
        initialFixed: [],
        finalPercentage: [],
        finalFixed: [],
      },
      impact: {
        baseValue: 170,
        initialPercentage: [],
        initialFixed: [],
        finalPercentage: [],
        finalFixed: [],
      },
      sheerForce: {
        baseValue: 500,
        initialPercentage: [],
        initialFixed: [],
        finalPercentage: [],
        finalFixed: [],
      },
      anomalyProficiency: {
        baseValue: 300,
        initialPercentage: [],
        initialFixed: [],
        finalPercentage: [],
        finalFixed: [],
      },
    },
    directStats: {
      criticalRate: { baseValue: 0.25, additions: [] },
      criticalDamage: { baseValue: 0.5, additions: [] },
      penetrationRatio: { baseValue: 0.1, additions: [] },
    },
  }))
  const beneficiaryActors = observedActors.filter(
    (entry) => entry.entityId !== actorEntityIds.enemy || actor === "enemy",
  )
  return {
    ...base,
    definitions,
    catalog,
    bindings: [
      {
        bindingId: "binding:static",
        kind: "agent",
        holderId: actorEntityIds.lighter,
        sourceEntityId: "1161",
        eligible: true,
        configuration: { mindscapeRank: options.mindscape, coreSkillLevel: 7 },
      },
    ],
    selections,
    actorSources: beneficiaryActors.map((entry) => ({
      entityId: entry.entityId,
      agentEntityId:
        actorAgentEntityIds[
          (Object.entries(actorEntityIds).find(
            ([, id]) => id === entry.entityId,
          )?.[0] ?? "lighter") as ElationActor
        ],
    })),
    ...(inputs.length === 0 ? {} : { inputs }),
    world: {
      entities: observedActors,
      states: [],
      distances: [],
    },
    hit: {
      ...base.hit,
      actorId: actorEntityId as StaticCatalogDamageInput["hit"]["actorId"],
      element: options.element ?? "fire",
      ...(options.actionId === undefined ? {} : { actionId: options.actionId }),
      ...(options.skillCategory === undefined
        ? {}
        : { skillCategory: options.skillCategory }),
      damageItems: options.damageItems ?? [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "base",
          stat: "attack" as const,
          statSource: { entityId: actorEntityId as `entity:${string}` },
          damageMultiplier: 2,
        },
      ],
    },
    damage: {
      ...baseDamage,
      stunDamage: {
        ...(base.damage as { stunDamage?: object }).stunDamage,
        isTargetStunned: options.targetState === "stunned",
      },
    } as unknown as Extract<
      StaticCatalogDamageInput["damage"],
      { kind: "regular" }
    >,
  } as unknown as StaticCatalogDamageInput
}

function damageBonus(result: StaticDamageResult): number {
  return result.factors.nonCritical["damageBonus"]! - 1
}

function evaluate(input: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

const anchors: [number, number][] = [
  [170, 5],
  [200, 5],
  [270, 5],
  [200, 20],
  [270, 20],
  [370, 5],
  [770, 5],
]

/** 用正式技能制品解析出的真实动作倍率作为命中伤害项。 */
function actionDamageItems(
  agentId: string,
  actionSuffix: string,
  holderEntityId: `entity:${string}`,
): {
  readonly actionId: string
  readonly skillCategory: string
  readonly element: StaticCatalogDamageInput["hit"]["element"]
  readonly damageItems: StaticCatalogDamageInput["hit"]["damageItems"]
} {
  const agent = read(
    `../../../data/definitions/skills/agents/${agentId}.json`,
  ) as AgentActions
  const resolved = resolveAgentAction({
    agent,
    actionId: `action:agent:${agentId}:action:${actionSuffix}`,
    mindscapeRank: 0,
    levels: {
      basic: { mode: "trained", value: 12 },
      assist: { mode: "trained", value: 12 },
      dodge: { mode: "trained", value: 12 },
      special: { mode: "trained", value: 12 },
      chain: { mode: "trained", value: 12 },
    },
  })
  if (
    !resolved.ok ||
    resolved.calculation.kind !== "damage" ||
    !resolved.skillCategory
  )
    throw new Error("Expected a resolved damage action")
  const segment = resolved.calculation.segments[0]!
  const [firstItem, ...remainingItems] = segment.damageItems.map((item) => ({
    ...item,
    mode: "direct" as const,
    role: "base" as const,
    statSource: { entityId: holderEntityId },
  }))
  if (!firstItem) throw new Error("Expected action damage items")
  return {
    actionId: resolved.actionId,
    skillCategory: resolved.skillCategory,
    element: segment.element,
    damageItems: [firstItem, ...remainingItems],
  }
}

describe("Lighter elation complete state (PR04)", () => {
  it("matches the seven brief anchors at M0/M1 and M2 on the single option", () => {
    for (const mindscape of [0, 1, 2] as const) {
      for (const [impact, layers] of anchors) {
        const actual = damageBonus(
          evaluate(elationInput({ mindscape, layers, impact })),
        )
        expect(actual, `ms=${mindscape} I=${impact} L=${layers}`).toBeCloseTo(
          expectedBonus(impact, layers, mindscape),
          12,
        )
      }
    }
  }, 20_000)

  it("strengthens the same option automatically from mindscape 2 through 6", () => {
    for (const mindscape of [0, 1, 2, 3, 4, 5, 6] as const) {
      for (const [impact, layers] of [
        [200, 5],
        [270, 20],
      ] as [number, number][]) {
        const actual = damageBonus(
          evaluate(elationInput({ mindscape, layers, impact })),
        )
        expect(actual, `ms=${mindscape} I=${impact} L=${layers}`).toBeCloseTo(
          expectedBonus(impact, layers, mindscape),
          12,
        )
      }
    }
    // 满层满冲击：M0/M1 封顶 75%，M2 起 90%（只强化一次）。
    for (const mindscape of [0, 1] as const)
      expect(
        damageBonus(
          evaluate(elationInput({ mindscape, layers: 20, impact: 270 })),
        ),
      ).toBeCloseTo(0.75, 12)
    for (const mindscape of [2, 3, 6] as const)
      expect(
        damageBonus(
          evaluate(elationInput({ mindscape, layers: 20, impact: 270 })),
        ),
      ).toBeCloseTo(0.9, 12)
  })

  it("closes the state at zero layers without requiring impact", () => {
    for (const mindscape of [0, 2, 6] as const) {
      const result = evaluate(elationInput({ mindscape, layers: 0 }))
      expect(damageBonus(result), `ms=${mindscape}`).toBeCloseTo(0, 12)
    }
  })

  it("applies the threshold and the 75%/90% total cap exactly", () => {
    expect(
      damageBonus(
        evaluate(elationInput({ mindscape: 0, layers: 5, impact: 170 })),
      ),
    ).toBeCloseTo(0.0625, 12)
    expect(
      damageBonus(
        evaluate(elationInput({ mindscape: 0, layers: 5, impact: 169 })),
      ),
    ).toBeCloseTo(0.0625, 12)
    expect(
      damageBonus(
        evaluate(elationInput({ mindscape: 0, layers: 5, impact: 180 })),
      ),
    ).toBeCloseTo(0.075, 12)
    expect(
      damageBonus(
        evaluate(elationInput({ mindscape: 0, layers: 20, impact: 4000 })),
      ),
    ).toBeCloseTo(0.75, 12)
    expect(
      damageBonus(
        evaluate(elationInput({ mindscape: 2, layers: 20, impact: 4000 })),
      ),
    ).toBeCloseTo(0.9, 12)
  })

  it("requires the explicit impact reading and rejects an external layer count", () => {
    const missing = calculateStaticDamageFromCatalog(
      elationInput({ mindscape: 0, layers: 5 }),
    )
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some((issue) => issue.code === "MISSING_FACT"),
      ).toBe(true)
    const overridden = calculateStaticDamageFromCatalog(
      elationInput({
        mindscape: 0,
        layers: 5,
        impact: 200,
        externalLayerCount: 5,
      }),
    )
    expect(overridden.ok).toBe(false)
    if (!overridden.ok)
      expect(
        overridden.issues.some((issue) => issue.code === "DUPLICATE_ID"),
      ).toBe(true)
  })

  it("rejects repeated selection of the same complete state", () => {
    const repeated = calculateStaticDamageFromCatalog(
      elationInput({
        mindscape: 2,
        layers: 5,
        impact: 200,
        duplicateSelection: true,
      }),
    )
    expect(repeated.ok).toBe(false)
    if (!repeated.ok)
      expect(
        repeated.issues.some((issue) => issue.code === "DUPLICATE_ID"),
      ).toBe(true)
  })

  it("rejects illegal layer counts at the catalog boundary", () => {
    for (const layers of [-1, 1.5, 21, Number.NaN]) {
      const result = calculateStaticDamageFromCatalog(
        elationInput({ mindscape: 0, layers, impact: 200 }),
      )
      expect(result.ok, `layers=${layers}`).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer.endsWith("/layers"),
          ),
        ).toBe(true)
    }
  })

  it("keeps the mindscape-2 stagger vulnerability independent", () => {
    const withVulnerability = evaluate(
      elationInput({
        mindscape: 2,
        layers: 5,
        impact: 200,
        targetState: "stunned",
        extraOptions: [M2_STAGGER_OPTION],
      }),
    )
    expect(damageBonus(withVulnerability)).toBeCloseTo(
      expectedBonus(200, 5, 2),
      12,
    )
    expect(
      withVulnerability.evaluation.contributions.filter(
        (entry) =>
          entry.address.kind === "factor" &&
          entry.address.channel === "stun-damage-adjustment",
      ).length,
    ).toBeGreaterThan(0)
    const withoutStagger = evaluate(
      elationInput({
        mindscape: 2,
        layers: 5,
        impact: 200,
        extraOptions: [M2_STAGGER_OPTION],
      }),
    )
    expect(
      withoutStagger.evaluation.contributions.filter(
        (entry) =>
          entry.address.kind === "factor" &&
          entry.address.channel === "stun-damage-adjustment",
      ).length,
    ).toBe(0)
    expect(damageBonus(withoutStagger)).toBeCloseTo(
      expectedBonus(200, 5, 2),
      12,
    )
  })

  it("exposes exactly one selectable complete state option", () => {
    const selectable = catalog.options.filter((option) =>
      option.variants.some(
        (variant) =>
          variant.status === "corrected" &&
          variant.effectIds.includes(COMPLETE_STATE_CONTRIBUTION as never),
      ),
    )
    expect(selectable.map((option) => option.optionId)).toEqual([
      COMPLETE_STATE_OPTION,
    ])
    expect(
      catalog.options.some((option) =>
        option.optionId.includes("elation-complete-state-m2"),
      ),
    ).toBe(false)
    expect(completeStateVariant.status).toBe("corrected")
    expect(completeStateVariant.maximumLayers).toBe(20)
    expect(completeStateVariant.mechanism).toMatchObject({
      kind: "complete-state",
    })
    expect(completeStateVariant.applicability).toEqual({})
    // 四条旧部分选项继续以语义冲突入口迁移，并明确指向唯一新选项。
    for (const optionId of LEGACY_PARTIAL_OPTIONS) {
      const option = catalog.options.find(
        (candidate) => candidate.optionId === optionId,
      )!
      expect(option, optionId).toBeDefined()
      expect(option.variants[0]!.status, optionId).toBe("unsupported")
      expect(option.variants[0]!.reason, optionId).toBe("semantic-conflict")
      expect(option.variants[0]!.explanation, optionId).toContain("完整状态")
    }
  })

  it("keeps the replaced partial records out of the executable rule set", () => {
    for (const effectId of LEGACY_RULE_IDS)
      expect(
        definitions.effects.some((rule) => rule.effectId === effectId),
        effectId,
      ).toBe(false)
    expect(
      definitions.effects.find(
        (rule) => rule.effectId === SCALE_MODIFICATION_ID,
      ),
    ).toMatchObject({
      kind: "modification",
      target: { kind: "effect", effectId: COMPLETE_STATE_CONTRIBUTION },
    })
    // 低层入口引用旧部分 identity 必须拒绝，而不是与新完整状态叠加。
    const legacy = calculateStaticDamage({
      ...(inputFor() as StaticDamageInput),
      definitions,
      selections: LEGACY_RULE_IDS.map((effectId) => ({
        effectId: effectId as never,
        bindingId: "binding:static" as never,
        layers: 5,
      })),
      inputs: [
        {
          bindingId: "binding:static" as never,
          name: completeStateVariant.inputs[0]!.name as never,
          value: { unit: "impact-points", value: 200 },
        },
      ],
    } as unknown as StaticDamageInput)
    expect(legacy.ok).toBe(false)
    // 目录迁移入口逐个拒绝选择。
    for (const optionId of LEGACY_PARTIAL_OPTIONS) {
      const result = calculateStaticDamageFromCatalog({
        ...elationInput({ mindscape: 0, layers: 1, impact: 200 }),
        selections: [{ optionId, bindingId: "binding:static", layers: 1 }],
      })
      expect(result.ok, optionId).toBe(false)
    }
  })

  it("scopes the benefit to fire/ice/frost hits of the team, not actor elements", () => {
    // 火、冰、烈霜命中都受益（烈霜按冰属性结算伤害与增益）。
    for (const element of ["fire", "ice", "frost"] as const)
      expect(
        damageBonus(
          evaluate(
            elationInput({
              mindscape: 0,
              layers: 5,
              impact: 200,
              element,
            }),
          ),
        ),
        element,
      ).toBeCloseTo(expectedBonus(200, 5, 0), 12)
    // 其他元素命中不获得昂扬。
    for (const element of ["ether", "physical", "electric"] as const)
      expect(
        damageBonus(
          evaluate(
            elationInput({
              mindscape: 0,
              layers: 5,
              impact: 200,
              element,
            }),
          ),
        ),
        element,
      ).toBeCloseTo(0, 12)
    // 非同队角色命中不获得：昂扬只惠及队伍。
    expect(
      damageBonus(
        evaluate(
          elationInput({
            mindscape: 0,
            layers: 5,
            impact: 200,
            actor: "enemy",
            element: "fire",
          }),
        ),
      ),
    ).toBeCloseTo(0, 12)
    // 非冰/火角色造成的冰/火命中同样受益：筛选按伤害元素，不按角色固有
    // 元素（合成静态输入验证契约一致性，不声称游戏中存在该动作）。
    for (const actor of ["zhuyuan", "anby"] as const)
      for (const element of ["fire", "ice"] as const)
        expect(
          damageBonus(
            evaluate(
              elationInput({
                mindscape: 0,
                layers: 5,
                impact: 200,
                actor,
                element,
              }),
            ),
          ),
          `${actor} ${element}`,
        ).toBeCloseTo(expectedBonus(200, 5, 0), 12)
  })

  it("benefits the real Miyabi frost action at M0 and M2", () => {
    const action = actionDamageItems("1091", "0001", "entity:miyabi")
    expect(action.element).toBe("frost")
    for (const mindscape of [0, 2] as const) {
      const actual = damageBonus(
        evaluate(
          elationInput({
            mindscape,
            layers: 5,
            impact: 200,
            actor: "miyabi",
            element: action.element,
            damageItems: action.damageItems,
            actionId: action.actionId,
            skillCategory: action.skillCategory,
          }),
        ),
      )
      expect(actual, `ms=${mindscape}`).toBeCloseTo(
        expectedBonus(200, 5, mindscape),
        12,
      )
    }
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  EntityId,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { evaluateEffects } from "../../src/effects/internal/evaluate.ts"
import { validateStaticCatalog } from "../../src/effects/internal/static-catalog.ts"
import { prepareEffects } from "../../src/effects/internal/prepare.ts"
import { supplyEffectState } from "../../src/effects/internal/state.ts"
import { general, inputFor, rule } from "./static-fixtures.ts"

/**
 * 加农转子独立附伤的最终暴击概率由调用方显式声明
 * （hit.declaredCriticalRate：有限 [0,1]、无默认、替换最终概率、与命中级
 * 暴击率贡献互斥、加农转子独占结算且缺声明拒绝）。期望值
 * 来自独立算式（其他乘区为 1、ATK1000、CD0.5 时 non/critical = 2000/3000，
 * expected 按声明 r 混合），不从生成器反推。critical 分支沿用当前普通
 * 暴击伤害是本接口的条件计算模型，不证明游戏附伤能暴击或继承该暴伤。
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

const CANNON_ROTOR = "nanoka:w-engines:14001:critical-hit-bonus-damage"
const CANNON_ROTOR_DAMAGE = "w-engine:14001:nanoka:critical-hit-bonus-damage"
const CANNON_ROTOR_TARGET = "zzz-hp:skill:cannon-rotor-bonus-damage"
const BIG_CYLINDER_CRIT =
  "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical"
/** 真实固定来源的实体作用域暴击率增益（猫又 M4，+7%）：低层依赖/非冲突用例。 */
const NEKOMATA_M4_CRIT =
  "agent:1021:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:4"
/** 真实固定来源的“当前暴击率→增伤”转换（血髓秘匣 R1，读 holder CR）。 */
const BLOOD_CASKET_CONVERSION =
  "w-engine:13021:zzz-hp:eff-mtsg3tw6-gydnli:blk-mtsg3tw6-5rsbpt:refinement"

function calculateCatalogResult(
  input: StaticCatalogDamageInput,
): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function rotorInput(
  overrides: {
    readonly declaredCriticalRate?: number
    readonly declaredCriticalRateRaw?: unknown
    readonly attack?: number
    readonly critRate?: number
    readonly critDmg?: number
    readonly omitCriticalRateFact?: boolean
    readonly omitCriticalDamageFact?: boolean
    readonly layers?: number
    readonly extraItem?: {
      readonly itemId: string
      readonly damageMultiplier: number
    }
    readonly omitItem?: boolean
    readonly statSourceEntityId?: string
    readonly actorId?: EntityId
    readonly holderAgentEntityId?: string
    readonly eligible?: boolean
    readonly skillCategory?: string
    readonly skillTags?: readonly string[]
    readonly attributeSources?: Record<string, unknown>
    readonly damageKindOverride?: { kind: "sheer" }
    readonly selections?: StaticCatalogDamageInput["selections"]
    readonly bindings?: StaticCatalogDamageInput["bindings"]
    readonly actorSources?: StaticCatalogDamageInput["actorSources"]
  } = {},
): StaticCatalogDamageInput {
  const base = inputFor()
  const declared: { declaredCriticalRate?: number } =
    overrides.declaredCriticalRate !== undefined
      ? { declaredCriticalRate: overrides.declaredCriticalRate }
      : {}
  const items = [
    {
      mode: "direct" as const,
      role: "base" as const,
      itemId: "cannon-rotor:bonus-damage",
      damageMultiplier: 0,
      stat: "attack" as const,
      statSource: {
        entityId: overrides.statSourceEntityId ?? "entity:attacker",
      },
    },
    ...(overrides.extraItem
      ? [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: overrides.extraItem.itemId,
            damageMultiplier: overrides.extraItem.damageMultiplier,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ]
      : []),
  ]
  const request: StaticCatalogDamageInput = {
    ...base,
    definitions,
    catalog,
    // 其余乘区全 1（目标基础防御 0）：non/critical = 2000/3000 的独立算式
    // 锚点成立。
    damage: {
      ...base.damage,
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 0,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
    } as Extract<StaticCatalogDamageInput["damage"], { kind: "regular" }>,
    world: {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === base.hit.actorId
          ? {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                attack: general(overrides.attack ?? 1000),
              },
              directStats: {
                ...(overrides.omitCriticalRateFact
                  ? {}
                  : {
                      criticalRate: {
                        baseValue: overrides.critRate ?? 0.25,
                        additions: [],
                      },
                    }),
                ...(overrides.omitCriticalDamageFact
                  ? {}
                  : {
                      criticalDamage: {
                        baseValue: overrides.critDmg ?? 0.5,
                        additions: [],
                      },
                    }),
                penetrationRatio: { baseValue: 0, additions: [] },
              },
            }
          : entity,
      ),
    },
    bindings: [
      {
        bindingId: "binding:engine",
        kind: "w-engine" as const,
        holderId: "entity:attacker",
        sourceEntityId: "14001",
        eligible: overrides.eligible ?? true,
        configuration: { refinement: 1 },
      },
    ],
    actorSources: [
      {
        entityId: "entity:attacker",
        agentEntityId: overrides.holderAgentEntityId ?? "1321",
      },
    ],
    selections: overrides.selections ?? [
      {
        optionId: CANNON_ROTOR,
        bindingId: "binding:engine",
        layers: overrides.layers ?? 1,
      },
    ],
    hit: {
      ...base.hit,
      ...declared,
      ...(overrides.damageKindOverride
        ? { damageKind: overrides.damageKindOverride }
        : {}),
      actorId: (overrides.actorId ?? base.hit.actorId) as "entity:attacker",
      skillCategory: (overrides.skillCategory ??
        "uncategorized") as "uncategorized",
      element: "physical" as const,
      skillTags: [
        ...(base.hit.skillTags ?? []),
        ...(overrides.skillTags ?? []),
      ],
      skillTargetIds: [CANNON_ROTOR_TARGET],
      ...(overrides.attributeSources
        ? { attributeSources: overrides.attributeSources }
        : {}),
      damageItems: (overrides.omitItem
        ? [
            {
              mode: "direct" as const,
              role: "base" as const,
              itemId: "other",
              damageMultiplier: 2,
              stat: "attack" as const,
              statSource: { entityId: "entity:attacker" },
            },
          ]
        : items) as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    },
  }
  if (overrides.declaredCriticalRateRaw !== undefined)
    (request.hit as { declaredCriticalRate?: unknown }).declaredCriticalRate =
      overrides.declaredCriticalRateRaw
  return request
}

/** 低层公共入口请求（真实规则按 effectId 手选，不经目录授权）。 */
function lowLevelInput(
  overrides: {
    readonly declaredCriticalRate?: number
    readonly effectIds?: readonly string[]
    readonly extraBinding?: {
      readonly bindingId: string
      readonly holderId: string
      readonly effectIds: readonly string[]
    }
    readonly skillTags?: readonly string[]
    readonly damageItems?: readonly {
      readonly itemId: string
      readonly damageMultiplier: number
      readonly stat?: "attack" | "defense"
      readonly statSourceEntityId?: string
    }[]
    readonly damageKind?: "regular" | "sheer"
    readonly critRate?: number
    readonly critDmg?: number
    readonly attributeSources?: Record<string, unknown>
    readonly hitActorOther?: boolean
  } = {},
): StaticDamageInput {
  const base = inputFor()
  const bindings = [
    {
      bindingId: "binding:engine" as const,
      kind: "w-engine" as const,
      holderId: "entity:attacker" as EntityId,
      sourceEntityId: "14001",
      eligible: true,
      configuration: { refinement: 1 },
    },
    ...(overrides.extraBinding
      ? [
          {
            bindingId: overrides.extraBinding.bindingId as `binding:${string}`,
            kind: "agent" as const,
            holderId: overrides.extraBinding.holderId as EntityId,
            sourceEntityId: "1021",
            eligible: true,
            configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
          },
        ]
      : []),
  ]
  const selectionIds = overrides.effectIds ?? [CANNON_ROTOR_DAMAGE]
  const selections = [
    ...selectionIds.map((effectId) => ({
      effectId: effectId as `agent:${string}` | `w-engine:${string}`,
      bindingId: "binding:engine" as `binding:${string}`,
      layers: 1,
    })),
    ...(overrides.extraBinding
      ? overrides.extraBinding.effectIds.map((effectId) => ({
          effectId: effectId as `agent:${string}` | `w-engine:${string}`,
          bindingId: overrides.extraBinding!.bindingId as `binding:${string}`,
          layers: 1,
        }))
      : []),
  ]
  const request = {
    ...base,
    definitions,
    bindings: bindings as unknown as StaticDamageInput["bindings"],
    selections: selections as unknown as StaticDamageInput["selections"],
    world: {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.kind === "actor" && entity.entityId === base.hit.actorId
          ? {
              ...entity,
              generalStats: { ...entity.generalStats, attack: general(1000) },
              directStats: {
                criticalRate: {
                  baseValue: overrides.critRate ?? 0.25,
                  additions: [],
                },
                criticalDamage: {
                  baseValue: overrides.critDmg ?? 0.5,
                  additions: [],
                },
                penetrationRatio: { baseValue: 0, additions: [] },
              },
            }
          : entity,
      ),
    },
    hit: {
      ...base.hit,
      ...(overrides.declaredCriticalRate !== undefined
        ? { declaredCriticalRate: overrides.declaredCriticalRate }
        : {}),
      ...(overrides.attributeSources
        ? { attributeSources: overrides.attributeSources }
        : {}),
      ...(overrides.hitActorOther ? { actorId: "entity:enemy" } : {}),
      skillCategory: "uncategorized" as const,
      element: "physical" as const,
      skillTags: [
        ...(base.hit.skillTags ?? []),
        CANNON_ROTOR_TARGET,
        ...(overrides.skillTags ?? []),
      ],
      damageItems: (
        overrides.damageItems ?? [
          {
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            stat: "attack" as const,
          },
        ]
      ).map((item) => ({
        itemId: item.itemId,
        damageMultiplier: item.damageMultiplier,
        stat: item.stat ?? ("attack" as const),
        ...(item.statSourceEntityId
          ? { statSource: { entityId: item.statSourceEntityId } }
          : {}),
      })) as unknown as StaticDamageInput["hit"]["damageItems"],
    },
    damage: {
      ...base.damage,
      // 其余乘区全 1（目标基础防御 0）：2000/3000/2250 独立算式锚点成立。
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 0,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
      ...(overrides.damageKind === "sheer"
        ? {
            kind: "sheer" as const,
            sheerDamageBonus: [],
          }
        : {}),
    } as unknown as StaticDamageInput["damage"],
  }
  return request as StaticDamageInput
}

describe("Explicit declared critical rate for the cannon rotor settlement", () => {
  it("rejects an enabled cannon rotor settlement without a declared critical rate", () => {
    // 启用（layers 1、合法强攻持有者、携带独立项）而未声明最终暴击概率：
    // 不默许读取持有者面板普通暴击率充当该次独立命中的概率。
    const result = calculateStaticDamageFromCatalog(rotorInput())
    expect(result.ok, JSON.stringify(result)).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "MISSING_FACT" &&
            issue.pointer.includes("declaredCriticalRate") &&
            issue.message.includes("cannon-rotor:bonus-damage"),
        ),
      ).toBe(true)
  })

  it.each(
    [0, 0.25, 1].map((rate) => ({ label: `r=${String(rate)}`, r: rate })),
  )(
    "settles the declared critical rate $label without reading the panel",
    ({ r }: { r: number }) => {
      // 其他乘区为 1、ATK1000、CD0.5：non/critical 恒为 2000/3000，
      // expected 按声明 r 混合；面板 CR .25→.75 不改采用 r 或期望。
      for (const panelRate of [0.25, 0.75]) {
        const result = calculateCatalogResult(
          rotorInput({ declaredCriticalRate: r, critRate: panelRate }),
        )
        expect(result.criticalRate, `panel ${String(panelRate)}`).toBe(r)
        expect(result.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
        // critical 分支沿用普通 CD（0.5）：critical 乘区 1.5，总值 3000。
        expect(result.factors.critical?.critical).toBeCloseTo(1.5, 8)
        expect(result.critical).toBeCloseTo(3000, 6)
        expect(result.nonCritical).toBeCloseTo(2000, 6)
        expect(result.expected).toBeCloseTo((1 - r) * 2000 + r * 3000, 6)
        // 面板 CR 不进入声明概率：evaluation.attributes 不记录 criticalRate
        // 的概率读取（CR 事实本身仍提供，但未被消费为概率）。
        expect(
          result.evaluation.attributes.some(
            (attribute) =>
              attribute.stat === "criticalRate" &&
              attribute.entityId === "entity:attacker" &&
              attribute.hitId === "hit:static",
          ),
          `panel ${String(panelRate)}`,
        ).toBe(false)
      }
    },
  )

  it("succeeds without a panel critical rate fact when nothing else reads it", () => {
    // CR 事实缺失且无其他 CR 依赖：声明路径不读取面板 CR，最小请求仍可算。
    const result = calculateCatalogResult(
      rotorInput({
        declaredCriticalRate: 0.25,
        omitCriticalRateFact: true,
      }),
    )
    expect(result.criticalRate).toBeCloseTo(0.25, 12)
    expect(result.expected).toBeCloseTo(2250, 6)
    expect(
      result.evaluation.attributes.some(
        (attribute) => attribute.stat === "criticalRate",
      ),
    ).toBe(false)
  })

  it("keeps the regular critical damage fact requirement even at r=0", () => {
    // CD 事实缺失仍按既有 regular 必要事实拒绝：r=0 不伪造 critical 分支。
    const result = calculateStaticDamageFromCatalog(
      rotorInput({
        declaredCriticalRate: 0,
        omitCriticalDamageFact: true,
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) => issue.code === "MISSING_FACT" && issue.message !== "",
        ),
      ).toBe(true)
  })

  it("keeps the conditional critical on the regular critical damage model", () => {
    // 声明概率不改变 critical 分支的普通 CD 条件模型：CD 0.5→1 时 critical
    // 3000→4000；r=0 的 expected 仍为 2000（未采用的反事实分支照常输出）。
    const half = calculateCatalogResult(
      rotorInput({ declaredCriticalRate: 0, critDmg: 0.5 }),
    )
    expect(half.factors.critical?.critical).toBeCloseTo(1.5, 8)
    expect(half.critical).toBeCloseTo(3000, 6)
    expect(half.expected).toBeCloseTo(2000, 6)
    const full = calculateCatalogResult(
      rotorInput({ declaredCriticalRate: 0, critDmg: 1 }),
    )
    expect(full.factors.critical?.critical).toBeCloseTo(2, 8)
    expect(full.critical).toBeCloseTo(4000, 6)
    // r=0 的 expected 仍为 2000：未采用的 critical 是反事实分支，照常输出。
    expect(full.expected).toBeCloseTo(2000, 6)
  })

  it("does not let an entity-scope critical rate gain alter or fake the declared probability", () => {
    // 真实固定来源的实体作用域 CR 增益（猫又 M4 +7%）：低层公共入口同一
    // 命中者手选（不经目录职业/身份检查），不参与形成最终概率，也不被
    // 伪报为概率消费；声明结果保持 2000/3000/2250，且最终概率仍是声明值
    // 而不是面板 0.25+0.07。
    const request = lowLevelInput({ declaredCriticalRate: 0.25 })
    const result = calculateStaticDamage({
      ...request,
      bindings: [
        {
          bindingId: "binding:engine",
          kind: "w-engine" as const,
          holderId: "entity:attacker",
          sourceEntityId: "14001",
          eligible: true,
          configuration: { refinement: 1 },
        },
        {
          bindingId: "binding:nekomata",
          kind: "agent" as const,
          holderId: "entity:attacker",
          sourceEntityId: "1021",
          eligible: true,
          configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
        },
      ] as unknown as StaticDamageInput["bindings"],
      selections: [
        {
          effectId: CANNON_ROTOR_DAMAGE,
          bindingId: "binding:engine",
          layers: 1,
        },
        {
          effectId: NEKOMATA_M4_CRIT,
          bindingId: "binding:nekomata",
          layers: 1,
        },
      ] as unknown as StaticDamageInput["selections"],
    })
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(result.value.nonCritical).toBeCloseTo(2000, 6)
    expect(result.value.critical).toBeCloseTo(3000, 6)
    expect(result.value.expected).toBeCloseTo(2250, 6)
    // 该增益未被概率读取消费：不出现在已消费贡献里（它只会在被属性读取
    // 消费时出现，而声明路径不读 CR）。
    expect(
      result.value.evaluation.contributions.some(
        (contribution) =>
          contribution.origin.effectId === NEKOMATA_M4_CRIT &&
          contribution.address.kind === "stat" &&
          contribution.address.stat === "criticalRate",
      ),
    ).toBe(false)
  })

  it("keeps real critical-rate dependencies reading the world value under a declared probability", () => {
    // 真实“当前暴击率→增伤”转换（血髓秘匣 R1：CR 超过 100% 的部分每点
    // ×0.48 增伤、上限 24%）：低层公共入口同一持有者手选转子倍率与转换
    // 规则。CR 0.25（无超额）时增伤贡献为 0；CR 1.25 时超额 0.25×0.48
    // = 0.12 进入伤害乘区，而最终概率仍采用声明值——依赖读取与世界属性
    // 不受声明影响。
    const settle = (critRate: number) => {
      const request = lowLevelInput({
        declaredCriticalRate: 0.5,
        critRate,
      })
      const result = calculateStaticDamage({
        ...request,
        bindings: [
          {
            bindingId: "binding:engine",
            kind: "w-engine" as const,
            holderId: "entity:attacker",
            sourceEntityId: "14001",
            eligible: true,
            configuration: { refinement: 1 },
          },
          {
            bindingId: "binding:casket",
            kind: "w-engine" as const,
            holderId: "entity:attacker",
            sourceEntityId: "13021",
            eligible: true,
            configuration: { refinement: 1 },
          },
        ] as unknown as StaticDamageInput["bindings"],
        selections: [
          {
            effectId: CANNON_ROTOR_DAMAGE,
            bindingId: "binding:engine",
            layers: 1,
          },
          {
            effectId: BLOOD_CASKET_CONVERSION,
            bindingId: "binding:casket",
            layers: 1,
          },
        ] as unknown as StaticDamageInput["selections"],
      })
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      return result.value
    }
    const flat = settle(0.25)
    expect(flat.criticalRate).toBeCloseTo(0.5, 12)
    expect(flat.factors.nonCritical.damageBonus).toBeCloseTo(1, 8)
    const boosted = settle(1.25)
    expect(boosted.criticalRate).toBeCloseTo(0.5, 12)
    expect(boosted.factors.nonCritical.damageBonus).toBeCloseTo(1.12, 8)
    // 世界 CR 读取由乘区数值证明：CR 0.25（无超额）→ 1；CR 1.25 →
    // 超额 0.25 × 0.48 = 0.12 → 1.12。转换贡献照常进入已消费记录。
    expect(
      boosted.evaluation.contributions.some(
        (contribution) =>
          contribution.origin.effectId === BLOOD_CASKET_CONVERSION,
      ),
    ).toBe(true)
  })
})

describe("Low-level public entry boundaries of the declared critical rate", () => {
  it("accepts a valid declared rate for a regular sole direct item scaling the hit actor", () => {
    const result = calculateStaticDamage(
      lowLevelInput({ declaredCriticalRate: 0.25 }),
    )
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(result.value.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
    expect(result.value.expected).toBeCloseTo(2250, 6)
  })

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["negative", -0.5],
    ["above one", 1.5],
  ] as const)(
    "rejects a declared critical rate that is $label",
    (_label: string, value: number) => {
      const result = calculateStaticDamage(
        lowLevelInput({ declaredCriticalRate: value }),
      )
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer === "/hit/declaredCriticalRate",
          ),
        ).toBe(true)
    },
  )

  it.each(["a string", null, { value: 0.5 }] as const)(
    "rejects a declared critical rate of non-number shape %s",
    (raw: unknown) => {
      const base = lowLevelInput({ declaredCriticalRate: 0.25 })
      const result = calculateStaticDamage({
        ...base,
        hit: {
          ...base.hit,
          declaredCriticalRate: raw as unknown as number,
        },
      })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer === "/hit/declaredCriticalRate",
          ),
        ).toBe(true)
    },
  )

  it("rejects a declared critical rate for non-regular damage kinds", () => {
    const result = calculateStaticDamage(
      lowLevelInput({
        declaredCriticalRate: 0.25,
        damageKind: "sheer",
        damageItems: [
          { itemId: "cannon-rotor:bonus-damage", damageMultiplier: 0 },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" &&
            issue.pointer === "/hit/declaredCriticalRate" &&
            issue.message.includes("regular"),
        ),
      ).toBe(true)
  })

  it("rejects a declared critical rate on multi-item hits and borrowed scaling sources", () => {
    // 多项。
    const multi = calculateStaticDamage(
      lowLevelInput({
        declaredCriticalRate: 0.25,
        damageItems: [
          { itemId: "cannon-rotor:bonus-damage", damageMultiplier: 0 },
          { itemId: "other", damageMultiplier: 2 },
        ],
      }),
    )
    expect(multi.ok).toBe(false)
    if (!multi.ok)
      expect(
        multi.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" &&
            issue.message.includes("exactly one damage item"),
        ),
      ).toBe(true)
    // 缩放属性借另一实体。
    const foreign = calculateStaticDamage(
      lowLevelInput({
        declaredCriticalRate: 0.25,
        damageItems: [
          {
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            statSourceEntityId: "entity:enemy",
          },
        ],
      }),
    )
    expect(foreign.ok).toBe(false)
    if (!foreign.ok)
      expect(
        foreign.issues.some(
          (issue) =>
            issue.code === "INVALID_INPUT" &&
            issue.message.includes("hit actor's current attributes"),
        ),
      ).toBe(true)
  })

  it("rejects the dual probability sources of a declared rate and a redirected criticalRate source", () => {
    const result = calculateStaticDamage(
      lowLevelInput({
        declaredCriticalRate: 0.25,
        attributeSources: { criticalRate: { entityId: "entity:enemy" } },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.pointer === "/hit/declaredCriticalRate" &&
            issue.message.includes("probability source"),
        ),
      ).toBe(true)
  })

  it("keeps invalid damage input failing as a structured result with a declared rate", () => {
    // damage 缺失或 null：无声明时按 INVALID_INPUT /damage 结构化失败；
    // 带声明时必须同样返回 Result——声明分支不得在 damage 形状校验失败
    // 前读取 damage.kind 而抛 TypeError，也不追加声明字段的错误。
    for (const declared of [false, true]) {
      for (const badDamage of [undefined, null]) {
        const base = lowLevelInput(
          declared ? { declaredCriticalRate: 0.25 } : {},
        )
        const mutated: { damage?: unknown } = { ...base }
        if (badDamage === undefined) delete mutated.damage
        else mutated.damage = null
        expect(
          () => calculateStaticDamage(mutated as unknown as StaticDamageInput),
          `declared=${declared} damage=${String(badDamage)}`,
        ).not.toThrow()
        const outcome = calculateStaticDamage(
          mutated as unknown as StaticDamageInput,
        )
        expect(outcome.ok).toBe(false)
        if (!outcome.ok) {
          expect(
            outcome.issues.some(
              (issue) =>
                issue.code === "INVALID_INPUT" && issue.pointer === "/damage",
            ),
          ).toBe(true)
          expect(
            outcome.issues.some(
              (issue) => issue.pointer === "/hit/declaredCriticalRate",
            ),
          ).toBe(false)
        }
      }
    }
  })

  it("keeps the old panel-derived path when the field is absent", () => {
    const result = calculateStaticDamage(lowLevelInput())
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(result.value.expected).toBeCloseTo(2250, 6)
  })

  it("keeps the public evaluateEffects contract free of the declaration channel", () => {
    // 公共三参数 evaluateEffects 的命中求值不携带声明概率：经低层入口验证
    // 过的声明只在内部静态路径生效。普通命中查询仍读取面板 CR。
    const base = lowLevelInput()
    const prepared = prepareEffects(base.definitions, base.bindings)
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
    const selectionIds = base.selections.map((selection) => selection.effectId)
    const state = supplyEffectState(prepared.value, {
      sessionId: "session:static",
      atSeconds: 0,
      instances: selectionIds.map((effectId, index) => ({
        instanceId: `instance:static:${String(index)}`,
        effectId,
        bindingId: "binding:engine",
        beneficiaryIds: ["entity:attacker"],
        stackKey: [],
        lifetime: { kind: "supplied" },
        layers: [
          {
            layerId: `layer:static:${String(index)}:0`,
            startedAt: 0,
            expiresAt: null,
            trigger: null,
          },
        ],
      })),
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    if (!state.ok) throw new Error(JSON.stringify(state.issues))
    const evaluated = evaluateEffects(prepared.value, state.value, {
      kind: "hit",
      atSeconds: 0,
      world: base.world,
      observedSnapshots: [],
      hit: {
        hitId: "hit:static",
        actionInstanceId: "action-instance:static",
        actionSnapshotId: "snapshot:static-action",
        actorId: "entity:attacker",
        targetId: "entity:enemy",
        actionId: "action:basic",
        skillCategory: "uncategorized",
        skillTags: [],
        damageKind: "regular",
        targetState: "not-stunned",
        origin: { kind: "direct" },
        damageItems: [
          {
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            stat: "attack",
          },
        ],
      },
      stats: ["criticalDamage", "penetrationRatio"],
    })
    if (!evaluated.ok) throw new Error(JSON.stringify(evaluated.issues))
    expect(evaluated.value.hit!.criticalRate).toBeCloseTo(0.25, 12)
  })
})

describe("Declared critical rate conflicts with hit-scoped critical rate adjustments", () => {
  it("rejects a declared rate together with an applicable named guaranteed-critical source", () => {
    // 真实比格气缸来源现为具名 guaranteed-critical，须同时匹配独立项
    // 与目标条件才与声明冲突；仅给加农转子项贴上目标标签不构成必暴。
    const base = lowLevelInput({
      declaredCriticalRate: 0.25,
      skillTags: ["zzz-hp:skill:big-cylinder-retaliation"],
    })
    const result = calculateStaticDamage({
      ...base,
      hit: {
        ...base.hit,
        damageItems: [
          {
            itemId: "big-cylinder:retaliation",
            stat: "attack",
            damageMultiplier: 0,
          },
        ],
      },
      bindings: [
        {
          bindingId: "binding:big-cylinder",
          kind: "w-engine" as const,
          holderId: "entity:attacker",
          sourceEntityId: "13112",
          eligible: true,
          configuration: { refinement: 1 },
        },
      ],
      selections: [
        {
          effectId: BIG_CYLINDER_CRIT,
          bindingId: "binding:big-cylinder",
          layers: 1,
        },
      ],
    } as unknown as StaticDamageInput)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const conflict = result.issues.find(
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.pointer === "/hit/declaredCriticalRate",
      )!
      expect(conflict.effectId).toBe(BIG_CYLINDER_CRIT)
      expect(conflict.bindingId).toBe("binding:big-cylinder")
    }
  })

  it("does not treat inapplicable hit-scoped critical layers as conflicts", () => {
    // 同一规则在无独立目标或不匹配具名项的命中上不适用，不构成冲突。
    const noTag = calculateStaticDamage({
      ...lowLevelInput({ declaredCriticalRate: 0.25 }),
      bindings: [
        {
          bindingId: "binding:engine",
          kind: "w-engine" as const,
          holderId: "entity:attacker",
          sourceEntityId: "14001",
          eligible: true,
          configuration: { refinement: 1 },
        },
        {
          bindingId: "binding:big-cylinder",
          kind: "w-engine" as const,
          holderId: "entity:attacker",
          sourceEntityId: "13112",
          eligible: true,
          configuration: { refinement: 1 },
        },
      ],
      selections: [
        {
          effectId: CANNON_ROTOR_DAMAGE,
          bindingId: "binding:engine",
          layers: 1,
        },
        {
          effectId: BIG_CYLINDER_CRIT,
          bindingId: "binding:big-cylinder",
          layers: 1,
        },
      ],
    } as unknown as StaticDamageInput)
    if (!noTag.ok) throw new Error(JSON.stringify(noTag.issues))
    expect(noTag.value.criticalRate).toBeCloseTo(0.25, 12)
    // 未选该规则（不在 selections 中，低层关闭即删除选择）同样不冲突；
    // 目录入口的 0 层关闭由目录授权用例单独覆盖。
    const unselected = calculateStaticDamage(
      lowLevelInput({ declaredCriticalRate: 0.25 }),
    )
    if (!unselected.ok) throw new Error(JSON.stringify(unselected.issues))
    expect(unselected.value.criticalRate).toBeCloseTo(0.25, 12)
  })

  it("does not demand facts for entity-scope critical rate outputs the declaration replaces", () => {
    // 实体作用域 CR 增益不参与声明概率，也不得为冲突判定求值其输出：
    // 正式照核心 CR 规则（输出读 health）按真实 agent 绑定手选且不提供
    // health 时，声明结算仍按 2000/3000/2250 独立算式成功；提供 health
    // 的对照同样成功且最终概率保持声明值（增益不参与形成概率）。
    const entityRuleRequest = (
      effectId: string,
      agentEntityId: string,
      omitHealth: boolean,
    ): StaticDamageInput => {
      const base = inputFor()
      return {
        ...base,
        definitions,
        bindings: [
          {
            bindingId: "binding:agent",
            kind: "agent",
            holderId: "entity:attacker",
            sourceEntityId: agentEntityId,
            eligible: true,
            configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
          },
        ],
        selections: [{ effectId, bindingId: "binding:agent", layers: 1 }],
        world: {
          ...base.world,
          entities: base.world.entities.map((entity) => {
            if (
              entity.kind !== "actor" ||
              entity.entityId !== base.hit.actorId
            ) {
              return entity
            }
            if (!omitHealth) return entity
            const { health: _health, ...generalStats } = entity.generalStats
            return { ...entity, generalStats }
          }),
        },
        hit: { ...base.hit, declaredCriticalRate: 0.25 },
        damage: {
          ...base.damage,
          defense: {
            attackerLevel: 60,
            targetBaseDefense: 0,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
        },
      } as unknown as StaticDamageInput
    }
    const ZHAO_CORE_CRIT =
      "agent:1341:zzz-hp:eff-ms20rscc-nbz649:blk-legacy:mindscape:0"
    const missing = calculateStaticDamage(
      entityRuleRequest(ZHAO_CORE_CRIT, "1341", true),
    )
    if (!missing.ok) throw new Error(JSON.stringify(missing.issues))
    expect(missing.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(missing.value.nonCritical).toBeCloseTo(2000, 6)
    expect(missing.value.critical).toBeCloseTo(3000, 6)
    expect(missing.value.expected).toBeCloseTo(2250, 6)
    const present = calculateStaticDamage(
      entityRuleRequest(ZHAO_CORE_CRIT, "1341", false),
    )
    if (!present.ok) throw new Error(JSON.stringify(present.issues))
    expect(present.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(present.value.expected).toBeCloseTo(2250, 6)
  })

  it("does not demand the binding inputs of an entity-scope critical rate output", () => {
    // 正式克拉蕾实体 CR 规则的输出依赖其 :source 绑定输入：不提供该输入
    // 时声明结算照常成功（概率与期望不受影响），不为被替换的实体 CR
    // 输出索取输入事实。
    const CLARET_CRIT =
      "agent:1611:zzz-hp:eff-mtskqyss-1toefw:blk-mtrf598z-wr4jqt:mindscape:0"
    const base = inputFor()
    const request = {
      ...base,
      definitions,
      bindings: [
        {
          bindingId: "binding:agent",
          kind: "agent",
          holderId: "entity:attacker",
          sourceEntityId: "1611",
          eligible: true,
          configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
        },
      ],
      selections: [
        {
          effectId: CLARET_CRIT,
          bindingId: "binding:agent",
          layers: 1,
        },
      ],
      hit: { ...base.hit, declaredCriticalRate: 0.25 },
      damage: {
        ...base.damage,
        defense: {
          attackerLevel: 60,
          targetBaseDefense: 0,
          defensePercentageAdjustments: [],
          penetrationValues: [],
        },
      },
    } as unknown as StaticDamageInput
    const missing = calculateStaticDamage(request)
    if (!missing.ok) throw new Error(JSON.stringify(missing.issues))
    expect(missing.value.criticalRate).toBeCloseTo(0.25, 12)
    expect(missing.value.expected).toBeCloseTo(2250, 6)
  })

  it("reports an applicable hit-scoped critical layer without demanding its output facts", () => {
    // 真正适用的命中作用域 CR 层在输出依赖缺失时冲突即可判定：直接
    // CONTEXT_MISMATCH 携带 effectId/bindingId，而不是先为该层输出索取
    // MISSING_FACT。合成 supplied 规则的输出为未提供的 ratio 输入。
    const dynamicCritical = rule("dynamic-critical", {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: { kind: "input", unit: "ratio", name: "unused-critical-value" },
    })
    const base = inputFor([dynamicCritical])
    const request = {
      ...base,
      hit: { ...base.hit, declaredCriticalRate: 0.25 },
      damage: {
        ...base.damage,
        defense: {
          attackerLevel: 60,
          targetBaseDefense: 0,
          defensePercentageAdjustments: [],
          penetrationValues: [],
        },
      },
    } as unknown as StaticDamageInput
    const result = calculateStaticDamage(request)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "MISSING_FACT" &&
            issue.message.includes("unused-critical-value"),
        ),
      ).toBe(false)
      const conflict = result.issues.find(
        (issue) =>
          issue.code === "CONTEXT_MISMATCH" &&
          issue.pointer === "/hit/declaredCriticalRate",
      )
      expect(conflict).toBeDefined()
      expect(conflict?.effectId).toBe("environment:static:dynamic-critical")
      expect(conflict?.bindingId).toBe("binding:static")
    }
    // 对照：补齐该输出输入后仍为同一冲突（层适用性与输出值无关）。
    const supplied = calculateStaticDamage({
      ...request,
      inputs: [
        {
          bindingId: "binding:static",
          name: "unused-critical-value",
          value: { unit: "ratio", value: 0.3 },
        },
      ],
    } as unknown as StaticDamageInput)
    expect(supplied.ok).toBe(false)
    if (!supplied.ok)
      expect(
        supplied.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.pointer === "/hit/declaredCriticalRate",
        ),
      ).toBe(true)
  })
})

describe("Catalog declaration authorization of the declared critical rate", () => {
  it("rejects an unexpected declared critical rate without an authorizing settlement", () => {
    for (const [label, overrides] of [
      ["ordinary request without selections", { layers: 0 }],
      ["ineligible binding", { eligible: false }],
      ["profession-ineligible holder", { holderAgentEntityId: "1071" }],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(
        rotorInput({ ...overrides, declaredCriticalRate: 0.25 }),
      )
      expect(result.ok, label).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer === "/hit/declaredCriticalRate",
          ),
          label,
        ).toBe(true)
    }
  })

  it("rejects a declared rate attributed to a non-actor holder binding", () => {
    // 命中 actor 是伊芙琳身份的实体，但加农转子绑定在另一持有实体
    // （非命中 actor 的错持有者）：CONTEXT_MISMATCH。
    const result = calculateStaticDamageFromCatalog({
      ...rotorInput({
        declaredCriticalRate: 0.25,
        actorId: "entity:evelyn" as EntityId,
        statSourceEntityId: "entity:evelyn",
      }),
      world: {
        ...rotorInput().world,
        entities: [
          {
            kind: "actor" as const,
            entityId: "entity:evelyn" as EntityId,
            teamId: "team:players",
            generalStats: { attack: general(1000) },
            directStats: {
              criticalRate: { baseValue: 0.25, additions: [] },
              criticalDamage: { baseValue: 0.5, additions: [] },
              penetrationRatio: { baseValue: 0, additions: [] },
            },
          },
          {
            kind: "actor" as const,
            entityId: "entity:attacker" as EntityId,
            teamId: "team:players",
            generalStats: { attack: general(1000) },
            directStats: {
              criticalRate: { baseValue: 0.25, additions: [] },
              criticalDamage: { baseValue: 0.5, additions: [] },
              penetrationRatio: { baseValue: 0, additions: [] },
            },
          },
          {
            kind: "actor" as const,
            entityId: "entity:enemy" as EntityId,
            teamId: "team:enemies",
            generalStats: {},
            directStats: {},
          },
        ],
      },
      bindings: [
        {
          bindingId: "binding:engine",
          kind: "w-engine" as const,
          holderId: "entity:attacker",
          sourceEntityId: "14001",
          eligible: true,
          configuration: { refinement: 1 },
        },
      ],
      actorSources: [
        { entityId: "entity:attacker", agentEntityId: "1321" },
        { entityId: "entity:evelyn", agentEntityId: "1321" },
      ],
      hit: {
        ...rotorInput({
          declaredCriticalRate: 0.25,
          actorId: "entity:evelyn" as EntityId,
          statSourceEntityId: "entity:evelyn",
        }).hit,
      },
    } as unknown as StaticCatalogDamageInput)
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("hit actor's settlement"),
        ),
      ).toBe(true)
  })

  it("keeps zero-layer and closed selections free of the declaration requirement", () => {
    // 0 层关闭：不要求声明，独占也不施加，普通多项请求保持公开契约。
    const result = calculateCatalogResult({
      ...rotorInput({ layers: 0 }),
      hit: {
        ...rotorInput({ layers: 0 }).hit,
        damageItems: [
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "cannon-rotor:bonus-damage",
            damageMultiplier: 0,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
          {
            mode: "direct" as const,
            role: "base" as const,
            itemId: "other",
            damageMultiplier: 2,
            stat: "attack" as const,
            statSource: { entityId: "entity:attacker" },
          },
        ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
      },
    })
    expect(result.criticalRate).toBeCloseTo(0.25, 12)
    expect(result.factors.nonCritical.baseDamage).toBeCloseTo(2000, 6)
  })

  it("rejects mixed items for the exclusive declared settlement", () => {
    for (const [label, extra] of [
      ["non-zero item", { itemId: "other", damageMultiplier: 2 }],
      ["zero-multiplier item", { itemId: "other", damageMultiplier: 0 }],
      [
        "another source item",
        { itemId: "big-cylinder:retaliation", damageMultiplier: 0 },
      ],
    ] as const) {
      const result = calculateStaticDamageFromCatalog(
        rotorInput({ declaredCriticalRate: 0.25, extraItem: extra }),
      )
      expect(result.ok, label).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("sole damage item"),
          ),
          label,
        ).toBe(true)
    }
  })

  it("settles each declared holder separately with the other binding closed", () => {
    // 两名合法强攻持有者：当前 actor 的绑定启用、另一绑定 0 层关闭，
    // 各自单独结算；同请求两个启用声明归属按上下文冲突拒绝。
    const world: StaticCatalogDamageInput["world"] = {
      ...inputFor().world,
      entities: [
        {
          kind: "actor" as const,
          entityId: "entity:evelyn" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000) },
          directStats: {
            criticalRate: { baseValue: 0.75, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:s0anby" as EntityId,
          teamId: "team:players",
          generalStats: { attack: general(1000) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor" as const,
          entityId: "entity:enemy" as EntityId,
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
    }
    const bindings: StaticCatalogDamageInput["bindings"] = [
      {
        bindingId: "binding:rotor-evelyn",
        kind: "w-engine" as const,
        holderId: "entity:evelyn",
        sourceEntityId: "14001",
        eligible: true,
        configuration: { refinement: 1 },
      },
      {
        bindingId: "binding:rotor-s0anby",
        kind: "w-engine" as const,
        holderId: "entity:s0anby",
        sourceEntityId: "14001",
        eligible: true,
        configuration: { refinement: 1 },
      },
    ]
    const actorSources: StaticCatalogDamageInput["actorSources"] = [
      { entityId: "entity:evelyn", agentEntityId: "1321" },
      { entityId: "entity:s0anby", agentEntityId: "1381" },
    ]
    const hitFor = (actorId: EntityId) => ({
      actorId,
      targetId: "entity:enemy" as EntityId,
      actionId: "action:settlement" as const,
      skillCategory: "uncategorized" as const,
      element: "physical" as const,
      skillTags: [],
      declaredCriticalRate: 0.25,
      skillTargetIds: [CANNON_ROTOR_TARGET],
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "cannon-rotor:bonus-damage",
          damageMultiplier: 0,
          stat: "attack" as const,
          statSource: { entityId: actorId },
        },
      ] as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
    })
    const evelyn = calculateCatalogResult({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      selections: [
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-evelyn",
          layers: 1,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-s0anby",
          layers: 0,
        },
      ],
      hit: hitFor("entity:evelyn"),
      damage: {
        ...inputFor().damage,
        defense: {
          attackerLevel: 60,
          targetBaseDefense: 0,
          defensePercentageAdjustments: [],
          penetrationValues: [],
        },
      } as StaticCatalogDamageInput["damage"],
    })
    expect(evelyn.criticalRate).toBeCloseTo(0.25, 12)
    expect(evelyn.expected).toBeCloseTo(2250, 6)
    const s0anby = calculateCatalogResult({
      definitions,
      catalog,
      world,
      bindings,
      actorSources,
      selections: [
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-evelyn",
          layers: 0,
        },
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:rotor-s0anby",
          layers: 1,
        },
      ],
      hit: hitFor("entity:s0anby"),
      damage: {
        ...inputFor().damage,
        defense: {
          attackerLevel: 60,
          targetBaseDefense: 0,
          defensePercentageAdjustments: [],
          penetrationValues: [],
        },
      } as StaticCatalogDamageInput["damage"],
    })
    expect(s0anby.criticalRate).toBeCloseTo(0.25, 12)
    expect(s0anby.expected).toBeCloseTo(2250, 6)
  })

  it.each([
    ["beneficiary profession", { beneficiaryProfession: "防护" }],
    ["beneficiary element", { beneficiaryElements: ["ice"] }],
    [
      "team profession count",
      { teamProfession: { profession: "防护", counts: [1] } },
    ],
  ] as const)(
    "keeps an option filtered out by %s from authorizing or forcing the declaration",
    (_, applicability) => {
      // 合成目录只把变体 applicability 改为把当前 actor（伊芙琳：强攻、
      // 火、队内无防护）筛掉的合法配置，定义校验先行断言避免假负例；正
      // 式加农转子当前 applicability 为空，不宣称其正常请求数值受影响。
      // 被筛掉的选择不授权也不强制声明：无 r 保持零贡献成功，有 r 按
      // 无授权来源拒绝；去掉声明要求标志的对照证明零贡献语义与该标志
      // 无关。
      const mutatedCatalog = structuredClone(catalog) as StaticEffectCatalog
      const variant = mutatedCatalog.options.find(
        (option) => option.optionId === CANNON_ROTOR,
      )!.variants[0]! as unknown as { applicability: unknown }
      variant.applicability = applicability
      const valid = validateStaticCatalog(mutatedCatalog, definitions)
      expect(valid.ok, JSON.stringify(valid.ok ? null : valid.issues)).toBe(
        true,
      )
      const withoutRate = calculateStaticDamageFromCatalog({
        ...rotorInput(),
        catalog: mutatedCatalog,
      })
      if (!withoutRate.ok) throw new Error(JSON.stringify(withoutRate.issues))
      expect(withoutRate.value.factors.nonCritical.baseDamage).toBe(0)
      expect(withoutRate.value.expected).toBe(0)
      const withRate = calculateStaticDamageFromCatalog({
        ...rotorInput({ declaredCriticalRate: 0.25 }),
        catalog: mutatedCatalog,
      })
      expect(withRate.ok).toBe(false)
      if (!withRate.ok)
        expect(
          withRate.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer === "/hit/declaredCriticalRate",
          ),
        ).toBe(true)
      const unflaggedCatalog = structuredClone(
        mutatedCatalog,
      ) as StaticEffectCatalog
      const unflaggedVariant = unflaggedCatalog.options.find(
        (option) => option.optionId === CANNON_ROTOR,
      )!.variants[0]!
      if (unflaggedVariant.mechanism?.kind !== "independent-settlement")
        throw new Error("test fixture: expected an independent settlement")
      const unflaggedRequirement =
        unflaggedVariant.mechanism.damageItemRequirements[0]
      if (unflaggedRequirement !== undefined)
        delete (
          unflaggedRequirement as unknown as {
            requiredCriticalRateDeclaration?: true
          }
        ).requiredCriticalRateDeclaration
      const control = calculateStaticDamageFromCatalog({
        ...rotorInput(),
        catalog: unflaggedCatalog,
      })
      if (!control.ok) throw new Error(JSON.stringify(control.issues))
      expect(control.value.factors.nonCritical.baseDamage).toBe(0)
    },
  )

  it("keeps a single effective owner when a filtered second option shares the requirement", () => {
    // 同绑定两个合法选项消费同一要求项：被受益元素筛掉的第二项不登记
    // 归属也不结算，只有有效项授权声明——期望 2250 且顺序反转不改变；
    // 双有效对照仍按唯一归属冲突拒绝。合成目录与规则先行通过定义校验。
    const secondOption = (filtered: boolean) => {
      const mutatedCatalog = structuredClone(catalog) as unknown as {
        options: {
          optionId: string
          variants: { effectIds: string[]; applicability: unknown }[]
        }[]
      }
      const mutatedDefinitions = structuredClone(definitions) as unknown as {
        effects: { effectId: string }[]
      }
      const secondEffectId =
        "w-engine:14001:nanoka:critical-hit-bonus-damage:second-settlement"
      const secondRule = structuredClone(
        mutatedDefinitions.effects.find(
          (effect) => effect.effectId === CANNON_ROTOR_DAMAGE,
        )!,
      )
      secondRule.effectId = secondEffectId
      mutatedDefinitions.effects.push(secondRule)
      const additional = structuredClone(
        mutatedCatalog.options.find(
          (option) => option.optionId === CANNON_ROTOR,
        )!,
      )
      additional.optionId =
        "nanoka:w-engines:14001:critical-hit-bonus-damage:second-settlement"
      additional.variants[0]!.effectIds = [secondEffectId]
      if (filtered)
        additional.variants[0]!.applicability = {
          beneficiaryElements: ["ice"],
        }
      mutatedCatalog.options.push(additional)
      const valid = validateStaticCatalog(
        mutatedCatalog as unknown as StaticEffectCatalog,
        mutatedDefinitions as unknown as typeof definitions,
      )
      expect(valid.ok, JSON.stringify(valid.ok ? null : valid.issues)).toBe(
        true,
      )
      return {
        mutatedCatalog: mutatedCatalog as unknown as StaticEffectCatalog,
        mutatedDefinitions: mutatedDefinitions as unknown as typeof definitions,
        additional,
      }
    }
    const settle = (filtered: boolean, reverse: boolean) => {
      const { mutatedCatalog, mutatedDefinitions, additional } =
        secondOption(filtered)
      const selections = [
        {
          optionId: CANNON_ROTOR,
          bindingId: "binding:engine",
          layers: 1,
        },
        {
          optionId: additional.optionId,
          bindingId: "binding:engine",
          layers: 1,
        },
      ]
      return calculateStaticDamageFromCatalog({
        ...rotorInput({ declaredCriticalRate: 0.25 }),
        definitions: mutatedDefinitions,
        catalog: mutatedCatalog,
        selections: reverse ? [...selections].reverse() : selections,
      } as unknown as StaticCatalogDamageInput)
    }
    const single = settle(true, false)
    if (!single.ok) throw new Error(JSON.stringify(single.issues))
    expect(single.value.expected).toBeCloseTo(2250, 6)
    const reversed = settle(true, true)
    if (!reversed.ok) throw new Error(JSON.stringify(reversed.issues))
    expect(reversed.value.expected).toBeCloseTo(2250, 6)
    const bothEffective = settle(false, false)
    expect(bothEffective.ok).toBe(false)
    if (!bothEffective.ok)
      expect(
        bothEffective.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.pointer === "/hit/declaredCriticalRate" &&
            issue.message.includes("exactly one enabled settlement"),
        ),
      ).toBe(true)
  })
})

describe("Catalog definition boundaries of the declaration requirement", () => {
  const mutatedCatalog = (
    mutate: (value: StaticEffectCatalog) => void,
  ): StaticEffectCatalog => {
    const clone = structuredClone(catalog)
    mutate(clone)
    return clone
  }
  const validate = (value: StaticEffectCatalog) =>
    validateStaticCatalog(value, definitions)

  it("accepts the shipped catalog registration", () => {
    const result = validate(catalog)
    expect(result.ok, JSON.stringify(result)).toBe(true)
  })

  it("rejects invalid requiredCriticalRateDeclaration shapes", () => {
    const expectInvalid = (
      label: string,
      mutate: (value: StaticEffectCatalog) => void,
      code: string,
    ) => {
      const mutated = mutatedCatalog(mutate)
      const result = validate(mutated)
      expect(result.ok, label).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === code),
          label,
        ).toBe(true)
    }
    // 非字面量 true。
    expectInvalid(
      "non-literal flag",
      (clone) => {
        const option = clone.options.find((o) => o.optionId === CANNON_ROTOR)!
        const mechanism = option.variants[0]!.mechanism as {
          damageItemRequirements: readonly unknown[]
        }
        ;(
          mechanism.damageItemRequirements[0] as unknown as {
            requiredCriticalRateDeclaration?: unknown
          }
        ).requiredCriticalRateDeclaration = "yes"
      },
      "INVALID_INPUT",
    )
    // 无独占声明。
    expectInvalid(
      "without exclusivity",
      (clone) => {
        const option = clone.options.find((o) => o.optionId === CANNON_ROTOR)!
        delete (option.variants[0]!.mechanism as { isolateDamageItems?: true })
          .isolateDamageItems
      },
      "INVALID_DEFINITION",
    )
    // 双要求。
    expectInvalid(
      "two requirements",
      (clone) => {
        const option = clone.options.find((o) => o.optionId === CANNON_ROTOR)!
        const mechanism = option.variants[0]!.mechanism as unknown as {
          damageItemRequirements?: unknown[]
        }
        mechanism.damageItemRequirements = [
          ...mechanism.damageItemRequirements!,
          { ...mechanism.damageItemRequirements![0]!, itemId: "rotor:other" },
        ]
      },
      "INVALID_DEFINITION",
    )
    // 非 base 角色。
    expectInvalid(
      "settlement role",
      (clone) => {
        const option = clone.options.find((o) => o.optionId === CANNON_ROTOR)!
        ;(
          (
            option.variants[0]!.mechanism as {
              damageItemRequirements: readonly unknown[]
            }
          ).damageItemRequirements[0] as unknown as {
            role?: string
          }
        ).role = "settlement"
      },
      "INVALID_DEFINITION",
    )
    // 非 direct-only 模式。
    expectInvalid(
      "non-direct modes",
      (clone) => {
        const option = clone.options.find((o) => o.optionId === CANNON_ROTOR)!
        ;(
          (
            option.variants[0]!.mechanism as {
              damageItemRequirements: readonly unknown[]
            }
          ).damageItemRequirements[0] as unknown as {
            allowedModes?: string[]
          }
        ).allowedModes = ["direct", "standard-disorder"]
      },
      "INVALID_DEFINITION",
    )
    // 非 holder-current 来源。
    expectInvalid(
      "anomaly source",
      (clone) => {
        const option = clone.options.find((o) => o.optionId === CANNON_ROTOR)!
        ;(
          (
            option.variants[0]!.mechanism as {
              damageItemRequirements: readonly unknown[]
            }
          ).damageItemRequirements[0] as unknown as {
            source?: string
          }
        ).source = "anomaly-source"
      },
      "INVALID_DEFINITION",
    )
  })
})

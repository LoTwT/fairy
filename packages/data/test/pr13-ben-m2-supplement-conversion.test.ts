import { describe, expect, it } from "vitest"
import type { ContributionRule } from "@randomplay/shared"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  SUPPLEMENTS,
  type Supplement,
  type SupplementVariantSpec,
} from "../scripts/static-effects/supplements.ts"
import type {
  SourceBlock,
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"
import {
  BEN_BIGGER_M0_RECORD,
  BEN_BIGGER_M4_RECORD,
  benBiggerEntity,
} from "./fixtures/ben-m2-block-counter-source.ts"

/**
 * 增益修复批次 13（修订 28）的合成转换回归：本（benbigger）影画 2[以守为攻]
 * 格挡反击附伤按 Nanoka 补充登记编译；影画 2 的真实空 pack 上下文守卫
 * （该位置出现任何新编码即拒绝）按登记执行，不静默套用另一份含义；其他
 * rank 的独立条款与合法重排不误拒。真实固定来源的整体验证由生成入口完成
 * （fac62407 的 19 文件 SHA 校验与影画 2 空位核对），本文件用合成数据核对
 * 守卫行为本身。块 ID、note 与机器记录取自独立真实摘录夹具
 * （fixtures/ben-m2-block-counter-source.ts，逐字来自 fac62407 /agents/24），
 * 不从补充登记常量生成期望。
 */

const collect = (pack: SourcePack) => {
  const blocks = pack.effectBlocks?.flatMap((b) => b.effects) ?? []
  return blocks.length ? blocks : (pack.effects ?? [])
}
const normalize = (e: SourceEntity): SourceEntity => ({
  ...e,
  mindscapeBuffs: Array.from(
    { length: 7 },
    (_, i) => e.mindscapeBuffs?.[i] ?? {},
  ),
  refinementBuffs: Array.from(
    { length: 5 },
    (_, i) => e.refinementBuffs?.[i] ?? {},
  ),
})
const functions: SourceNormalization = {
  normalizeAgent: normalize,
  normalizeWengine: normalize,
  normalizeDriveDisc: normalize,
  collectEffectsFromPack: collect,
  applyAnomalyFlagsToPack: (p: SourcePack) => p,
}

const benSupplement = SUPPLEMENTS.find(
  (s) =>
    s.supplementId ===
    "nanoka:agents:benbigger:m2-block-counter-defense-damage",
)! as Supplement
const benSupplements: readonly Supplement[] = [benSupplement]

/** 未来同条款机器编码的合成形态：直接倍率记录（一般作用域，不限定分类）。 */
const {
  skillCategory: _m4SkillCategory,
  skillTargets: _m4SkillTargets,
  appliesToAnomaly: _m4Anomaly,
  ...M4_RECORD_BASE
} = BEN_BIGGER_M4_RECORD
const FUTURE_ENCODING: SourceEffect = {
  ...M4_RECORD_BASE,
  id: "eff-future-m2-encoding",
  scope: "general",
  stat: "directDmgMult",
  value: 3,
}

interface Pr13Overrides {
  /** 影画 2 位置的 pack（默认真实空 pack）。 */
  readonly rank2Pack?: {
    effectBlocks?: SourceBlock[]
    effects?: SourceEffect[]
  }
  /** 在其他 rank 追加独立合法条款块（不属本补充的条款）。 */
  readonly extraRankBlocks?: readonly {
    readonly rank: number
    readonly block: SourceBlock
  }[]
}

const pr13BenData = (overrides: Pr13Overrides = {}): SourceData => {
  const ben = benBiggerEntity(
    overrides.rank2Pack === undefined ? {} : { rank2Pack: overrides.rank2Pack },
  )
  const mindscapeBuffs = ben.mindscapeBuffs!.map((pack, rank) => {
    const extra = (overrides.extraRankBlocks ?? []).filter(
      (entry) => entry.rank === rank,
    )
    if (!extra.length) return pack
    return {
      ...pack,
      effectBlocks: [
        ...(pack.effectBlocks ?? []),
        ...extra.map((entry) => entry.block),
      ],
    }
  })
  const entities: SourceEntity[] = [
    // 数组顺序不影响身份匹配：本不在首位（凯撒是已映射的真实来源实体）。
    {
      id: "caesar",
      name: "凯撒",
      profession: "防护",
      element: "物理",
      mindscapeBuffs: Array.from({ length: 7 }, () => ({
        effectBlocks: [],
        effects: [],
      })),
    },
    { ...ben, mindscapeBuffs },
  ]
  return {
    agents: entities,
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [],
  }
}

const convert = (
  data: SourceData,
  supplements: readonly Supplement[] = benSupplements,
  normalization: SourceNormalization = functions,
) => convertSource(data, normalization, [], supplements)

const FUTURE_ENCODING_LEGACY: SourceEffect = {
  ...FUTURE_ENCODING,
  stat: "customBenM2Stat",
}

describe("batch 13 Ben M2 block counter supplement conversion", () => {
  it("registers the option, target, and rule beside the preserved fixed-source clauses", () => {
    const result = convert(pr13BenData())
    expect(result.definitions.revision).toBe("52")
    // 影画 0/4 的既有条款照常转换（公开 ID 与 effectId 保持）。
    for (const [optionId, effectId, record] of [
      [
        "agents:benbigger:mindscape:0:blk-legacy:legacy-team-critRate",
        "agent:1121:zzz-hp:legacy-team-critRate:blk-legacy:mindscape:0",
        BEN_BIGGER_M0_RECORD,
      ],
      [
        "agents:benbigger:mindscape:4:blk-ms207p9g-r0k49k:eff-ms207p9g-eg5grw",
        "agent:1121:zzz-hp:eff-ms207p9g-eg5grw:blk-ms207p9g-r0k49k:mindscape:4",
        BEN_BIGGER_M4_RECORD,
      ],
    ] as const) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.variants[0]!.effectIds).toEqual([effectId])
      expect(
        result.definitions.effects.some(
          (e) => e.kind === "contribution" && e.effectId === effectId,
        ),
        optionId,
      ).toBe(true)
      // 既有记录的真实身份仍在来源摘录里（合成数据不改写其 stat）。
      expect(JSON.stringify(result)).toContain(record.id)
    }
    // 独立目标：属于本（1121），uncategorized，非追加攻击身份。
    const target = result.catalog.skillTargets.find(
      (t) => t.targetId === "zzz-hp:skill:benbigger-block-counter-bonus-damage",
    )!
    expect(target).toMatchObject({
      upstreamId: null,
      agentEntityId: "1121",
      category: "uncategorized",
      name: "本格挡反击附伤",
      countsAsFollowUp: false,
    })
    // 补充选项：影画 2 起、一次状态、独占结算、显式暴击概率声明。
    const option = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "nanoka:agents:benbigger:m2-block-counter-defense-damage",
    )!
    expect(option.catalogEntityId).toBe("agents:benbigger")
    expect(option.variants).toHaveLength(1)
    const variant = option.variants[0]!
    expect(variant.status).toBe("converted")
    expect(variant.configuration).toEqual({ minimumMindscape: 2 })
    expect(variant.maximumLayers).toBe(1)
    expect(variant.effectIds).toEqual([
      "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
    ])
    expect(variant.mechanism).toEqual({
      kind: "independent-settlement",
      isolateDamageItems: true,
      damageItemRequirements: [
        {
          itemId: "benbigger:block-counter-bonus-damage",
          stat: "defense",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: "uncategorized",
          requiredCriticalRateDeclaration: true,
        },
      ],
    })
    expect(variant.references.map((r) => r.pointer)).toEqual(["/talent/2/desc"])
    // 规则：3× 本防御力，目标标签 + regular 直伤，不按元素筛选。
    const damageRule = result.definitions.effects.find(
      (e): e is ContributionRule =>
        e.kind === "contribution" &&
        e.effectId ===
          "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
    )!
    expect(damageRule.parameters).toEqual({
      amount: { kind: "constant", unit: "multiplier", value: 3 },
    })
    expect(damageRule.when).toEqual({
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:benbigger-block-counter-bonus-damage"],
        },
      ],
    })
    expect(damageRule.operation).toEqual({
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["benbigger:block-counter-bonus-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    })
  })

  it("rejects any new encoding at the registered empty mindscape 2 position", () => {
    // 未来同条款机器编码（直接倍率记录）出现在影画 2：拒绝生成。
    expect(() =>
      convert(
        pr13BenData({
          rank2Pack: {
            effectBlocks: [
              {
                id: "blk-future-m2",
                name: "影画2",
                note: "在[特殊技]或[强化特殊技]中，成功触发格挡反击时，额外造成本300%防御力的伤害。",
                effects: [FUTURE_ENCODING],
              },
            ],
            effects: [],
          },
        }),
      ),
    ).toThrowError(
      /registered agents:benbigger mindscape rank 2 as a currently empty pack/,
    )
    // note-only 块（无机器记录）同样改变该位置现状：拒绝并要求复核。
    expect(() =>
      convert(
        pr13BenData({
          rank2Pack: {
            effectBlocks: [
              {
                id: "blk-future-m2-note",
                name: "影画2",
                note: "在[特殊技]或[强化特殊技]中，成功触发格挡反击时，额外造成本300%防御力的伤害。",
                effects: [],
              },
            ],
            effects: [],
          },
        }),
      ),
    ).toThrowError(
      /registered agents:benbigger mindscape rank 2 as a currently empty pack/,
    )
    // pack 级 effects 记录（无块）：同样拒绝。
    expect(() =>
      convert(
        pr13BenData({
          rank2Pack: { effectBlocks: [], effects: [FUTURE_ENCODING] },
        }),
      ),
    ).toThrowError(
      /registered agents:benbigger mindscape rank 2 as a currently empty pack/,
    )
    // raw 表示无害、归一化把 stat 改写为 directDmgMult：记录本身已在位置上，
    // 拒绝不依赖 stat 家族（expectsEmptyPack 覆盖两份表示）。
    expect(() =>
      convert(
        pr13BenData({
          rank2Pack: {
            effectBlocks: [
              {
                id: "blk-future-m2-aliased",
                name: "影画2",
                note: "",
                effects: [FUTURE_ENCODING_LEGACY],
              },
            ],
            effects: [],
          },
        }),
        benSupplements,
        {
          ...functions,
          normalizeAgent: (entity) => ({
            ...normalize(entity),
            mindscapeBuffs: entity.mindscapeBuffs!.map((pack, rank) =>
              rank === 2
                ? {
                    ...pack,
                    effectBlocks: (pack.effectBlocks ?? []).map((block) => ({
                      ...block,
                      effects: block.effects.map((effect) =>
                        effect.stat === "customBenM2Stat"
                          ? { ...effect, stat: "directDmgMult" }
                          : effect,
                      ),
                    })),
                  }
                : pack,
            ),
          }),
        },
      ),
    ).toThrowError(
      /registered agents:benbigger mindscape rank 2 as a currently empty pack/,
    )
  })

  it("keeps the guard scoped to rank 2: other ranks' independent clauses do not reject", () => {
    // 其他 rank 的独立条款（影画 5 出现直接倍率记录——另一条款）不触发
    // 影画 2 守卫；影画 0/4 的既有记录照常共存。
    const withOtherRankClause = convert(
      pr13BenData({
        extraRankBlocks: [
          {
            rank: 5,
            block: {
              id: "blk-future-m5",
              name: "影画5",
              note: "",
              effects: [FUTURE_ENCODING],
            },
          },
        ],
      }),
    )
    expect(
      withOtherRankClause.catalog.options.some(
        (o) =>
          o.optionId ===
          "nanoka:agents:benbigger:m2-block-counter-defense-damage",
      ),
    ).toBe(true)
    expect(
      withOtherRankClause.definitions.effects.some(
        (e) =>
          e.kind === "contribution" &&
          e.effectId ===
            "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
      ),
    ).toBe(true)
  })

  it("keeps identities stable under real reordering of entities, blocks, and effects", () => {
    // 非平凡来源数据：两实体（凯撒在前、本在后）、影画 0/4 各两块、追加块内
    // 两条不同 ID 的记录。重排只改变实体数组、同 rank 的块数组与块内记录
    // 数组顺序；影画档数组本身以数组下标定义 rank，不参与重排。
    const extraRecord = (id: string, value: number): SourceEffect => ({
      ...BEN_BIGGER_M0_RECORD,
      id,
      applyTarget: "self",
      stat: "dmgBonus",
      value,
    })
    const original = pr13BenData({
      extraRankBlocks: [
        {
          rank: 0,
          block: {
            id: "blk-extra-m0",
            name: "影画0附注",
            note: "",
            effects: [
              extraRecord("eff-extra-m0-a", 10),
              extraRecord("eff-extra-m0-b", 12),
            ],
          },
        },
        {
          rank: 4,
          block: {
            id: "blk-extra-m4",
            name: "影画4附注",
            note: "",
            effects: [
              extraRecord("eff-extra-m4-a", 10),
              extraRecord("eff-extra-m4-b", 12),
            ],
          },
        },
      ],
    })
    const reordered = structuredClone(original)
    reordered.agents.reverse()
    for (const agent of reordered.agents)
      for (const pack of agent.mindscapeBuffs ?? []) {
        pack.effectBlocks?.reverse()
        for (const block of pack.effectBlocks ?? []) block.effects.reverse()
        pack.effects?.reverse()
      }
    // 先断言每种顺序确实改变：实体顺序、影画 0 的块顺序与追加块的记录顺序。
    const originalBen = original.agents.find((a) => a.id === "benbigger")!
    const reorderedBen = reordered.agents.find((a) => a.id === "benbigger")!
    expect(reordered.agents.map((a) => a.id)).not.toEqual(
      original.agents.map((a) => a.id),
    )
    const originalRank0 = originalBen.mindscapeBuffs![0]!
    const reorderedRank0 = reorderedBen.mindscapeBuffs![0]!
    expect(reorderedRank0.effectBlocks!.map((b) => b.id)).not.toEqual(
      originalRank0.effectBlocks!.map((b) => b.id),
    )
    const originalExtra = originalRank0.effectBlocks!.find(
      (b) => b.id === "blk-extra-m0",
    )!
    const reorderedExtra = reorderedRank0.effectBlocks!.find(
      (b) => b.id === "blk-extra-m0",
    )!
    expect(reorderedExtra.effects.map((e) => e.id)).not.toEqual(
      originalExtra.effects.map((e) => e.id),
    )
    // 两次转换均成功；按完整身份比较本补充、既有 M0/M4 与合成共存条款的
    // 语义：仅剔除 references 条目中随重排变动的位置型 pointer，规则的
    // source.identity/section 与引用其余字段、目录实体的完整身份/元数据
    // 全部保留参与比较——source.identity 参与目录绑定校验，不是可忽略的
    // 来源说明；规则/选项/目标的可执行语义不得漂移或丢失。
    const before = convert(structuredClone(original))
    const after = convert(reordered)
    const dropPointer = <T extends { readonly pointer: string }>(
      reference: T,
    ): Omit<T, "pointer"> => {
      const { pointer: _pointer, ...rest } = reference
      return rest
    }
    const project = (result: ReturnType<typeof convert>) => ({
      effects: result.definitions.effects
        .map((effect) => ({
          ...effect,
          source: {
            ...effect.source,
            references: effect.source.references.map(dropPointer),
          },
        }))
        .toSorted((a, b) => a.effectId.localeCompare(b.effectId)),
      options: result.catalog.options
        .map((option) => ({
          ...option,
          variants: option.variants.map((variant) => ({
            ...variant,
            references: variant.references.map(dropPointer),
          })),
        }))
        .toSorted((a, b) => a.optionId.localeCompare(b.optionId)),
      targets: result.catalog.skillTargets,
      entities: result.catalog.entities.toSorted((a, b) =>
        a.catalogEntityId.localeCompare(b.catalogEntityId),
      ),
    })
    expect(project(after)).toEqual(project(before))
    // 原值不丢失：本补充、影画 0/4 既有选项与四条合成共存记录全部按身份存在。
    for (const effectId of [
      "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
      "agent:1121:zzz-hp:legacy-team-critRate:blk-legacy:mindscape:0",
      "agent:1121:zzz-hp:eff-ms207p9g-eg5grw:blk-ms207p9g-r0k49k:mindscape:4",
    ])
      expect(
        after.definitions.effects.some(
          (e) => e.kind === "contribution" && e.effectId === effectId,
        ),
        effectId,
      ).toBe(true)
    expect(
      after.catalog.options.find(
        (o) =>
          o.optionId ===
          "agents:benbigger:mindscape:0:blk-legacy:legacy-team-critRate",
      )!.variants[0]!.effectIds,
    ).toEqual(["agent:1121:zzz-hp:legacy-team-critRate:blk-legacy:mindscape:0"])
    expect(
      after.catalog.options.filter(
        (o) =>
          o.optionId.includes("eff-extra-m0-") ||
          o.optionId.includes("eff-extra-m4-"),
      ).length,
    ).toBe(4)
  })

  it("rejects the critical rate declaration outside the exclusive sole-item shape for this supplement", () => {
    const variant = (
      benSupplement as Extract<Supplement, { variant: SupplementVariantSpec }>
    ).variant
    const requirement =
      variant.mechanism?.kind === "independent-settlement"
        ? variant.mechanism.damageItemRequirements[0]
        : undefined
    if (requirement === undefined)
      throw new Error("ben variant must declare a damage item requirement")
    const mutated = (
      mutate: (variant: SupplementVariantSpec) => SupplementVariantSpec,
    ) =>
      benSupplements.map((supplement) =>
        supplement.supplementId ===
        "nanoka:agents:benbigger:m2-block-counter-defense-damage"
          ? {
              ...supplement,
              variant: mutate(
                (
                  supplement as Extract<
                    Supplement,
                    { variant: SupplementVariantSpec }
                  >
                ).variant,
              ),
            }
          : supplement,
      )
    // 有声明要求但变体未声明独占。
    expect(() =>
      convert(
        pr13BenData(),
        mutated((variant) => {
          if (variant.mechanism?.kind !== "independent-settlement")
            return variant
          const { isolateDamageItems: _isolateDamageItems, ...mechanism } =
            variant.mechanism
          return { ...variant, mechanism }
        }),
      ),
    ).toThrowError(
      /requires a declared critical rate but its variant does not declare isolateDamageItems/,
    )
    // 有声明要求但要求项不满足形状（settlement 角色 / 非 direct 模式 /
    // 非 holder-current 来源）。
    expect(() =>
      convert(
        pr13BenData(),
        mutated((variant) => {
          if (variant.mechanism?.kind !== "independent-settlement")
            return variant
          return {
            ...variant,
            mechanism: {
              ...variant.mechanism,
              damageItemRequirements: [{ ...requirement, role: "settlement" }],
            },
          }
        }),
      ),
    ).toThrowError(/requires a declared critical rate but uses role settlement/)
    expect(() =>
      convert(
        pr13BenData(),
        mutated((variant) => {
          if (variant.mechanism?.kind !== "independent-settlement")
            return variant
          return {
            ...variant,
            mechanism: {
              ...variant.mechanism,
              damageItemRequirements: [
                {
                  ...requirement,
                  allowedModes: ["direct", "standard-disorder"],
                },
              ],
            },
          }
        }),
      ),
    ).toThrowError(
      /requires a declared critical rate but allows non-direct preparation modes/,
    )
    expect(() =>
      convert(
        pr13BenData(),
        mutated((variant) => {
          if (variant.mechanism?.kind !== "independent-settlement")
            return variant
          return {
            ...variant,
            mechanism: {
              ...variant.mechanism,
              damageItemRequirements: [
                { ...requirement, source: "anomaly-source" },
              ],
            },
          }
        }),
      ),
    ).toThrowError(
      /requires a declared critical rate but uses source anomaly-source/,
    )
    // 未改登记的正控：正常生成。
    expect(() => convert(pr13BenData())).not.toThrow()
  })
})

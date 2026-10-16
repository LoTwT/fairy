import { describe, expect, it } from "vitest"
import type { ContributionRule } from "@randomplay/shared"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  SUPPLEMENTS,
  type Supplement,
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
  MIYABI_ADDITIONAL_ABILITY_NOTE,
  MIYABI_RES_PEN_EFFECT_ID,
  MIYABI_SHIMOTSUKI_RES_PEN_RECORD,
  MIYABI_ULTIMATE_EFFECT_ID,
  MIYABI_ULTIMATE_NOTE,
  MIYABI_ULTIMATE_RECORD,
  miyabiEntity,
  miyabiM1Block,
  miyabiM6Block,
  reorderComparable,
} from "./fixtures/miyabi-frostburn-break-source.ts"

/**
 * 增益修复批次 14（修订 29）的合成转换回归：星见雅（miyabi）核心被动
 * [寒炎][霜灼·破]一次独立伤害与影画 4[皲裂]同事件增伤按 Nanoka 补充登记
 * 编译；条款上下文守卫（rank 0 两个真实锚块 + rank 4 真实空 pack）与两条
 * settlement-element-scope 元素修正的防漂移矩阵按登记执行，不静默套用另一
 * 份含义；其他 rank 的独立条款与合法重排不误拒。真实固定来源的整体验证由
 * 生成入口完成（fac62407 的 19 文件 SHA 校验与位置核对），本文件用合成数据
 * 核对守卫行为本身。块 ID、note 与机器记录取自独立真实摘录夹具
 * （fixtures/miyabi-frostburn-break-source.ts，逐字来自 fac62407 /agents/22），
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

const miyabiSupplement = SUPPLEMENTS.find(
  (s) => s.supplementId === "nanoka:agents:miyabi:frostburn-break-damage",
)! as Supplement
const miyabiSupplements: readonly Supplement[] = [miyabiSupplement]

/** 未来同条款机器编码的合成形态：直接倍率记录。 */
const FUTURE_DIRECT_MULTIPLIER: SourceEffect = {
  ...MIYABI_ULTIMATE_RECORD,
  id: "eff-future-frostburn-encoding",
  scope: "general",
  skillSubcategoryId: null,
  elementFilter: "all",
  stat: "directDmgMult",
  value: 750,
}

interface Pr14Overrides {
  /** 影画 0 位置的 pack（默认两个真实块）。 */
  readonly rank0Pack?: {
    effectBlocks?: SourceBlock[]
    effects?: SourceEffect[]
  }
  /** 影画 4 位置的 pack（默认真实空 pack）。 */
  readonly rank4Pack?: {
    effectBlocks?: SourceBlock[]
    effects?: SourceEffect[]
  }
  /** 在其他 rank 追加独立合法条款块（不属本补充的条款）。 */
  readonly extraRankBlocks?: readonly {
    readonly rank: number
    readonly block: SourceBlock
  }[]
  /** 归一化时对星见雅记录的改写（模拟上游归一化改 stat）。 */
  readonly normalizedMutation?: (effect: SourceEffect) => SourceEffect
}

const pr14MiyabiData = (overrides: Pr14Overrides = {}): SourceData => {
  const miyabi = miyabiEntity({
    ...(overrides.rank0Pack === undefined
      ? {}
      : { rank0Pack: overrides.rank0Pack }),
    ...(overrides.rank4Pack === undefined
      ? {}
      : { rank4Pack: overrides.rank4Pack }),
    ...(overrides.extraRankBlocks === undefined
      ? {}
      : { extraBlocks: overrides.extraRankBlocks }),
  })
  const entities: SourceEntity[] = [
    // 数组顺序不影响身份匹配：星见雅不在首位（凯撒是已映射的真实来源实体）。
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
    {
      ...miyabi,
      mindscapeBuffs: miyabi.mindscapeBuffs!.map((pack) => ({
        ...pack,
        effectBlocks: (pack.effectBlocks ?? []).map((block) => ({
          ...block,
          effects: block.effects.map((effect) => effect),
        })),
      })),
    },
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
  supplements: readonly Supplement[] = miyabiSupplements,
  normalization: SourceNormalization = functions,
) => convertSource(data, normalization, [], supplements)

const MAIN_DAMAGE = "agent:1091:nanoka:frostburn-break-damage:mindscape:0"
const M4_BONUS =
  "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4"
const MIYABI_OPTION = "nanoka:agents:miyabi:frostburn-break-damage"
const MIYABI_TARGET = "zzz-hp:skill:miyabi-frostburn-break-damage"

/** 归一化函数会按 mutation 改写星见雅记录（raw 保持原样）。 */
const normalizedMutationFunctions = (
  mutation: (effect: SourceEffect) => SourceEffect,
): SourceNormalization => ({
  ...functions,
  normalizeAgent: (entity: SourceEntity): SourceEntity => ({
    ...entity,
    mindscapeBuffs: Array.from(
      { length: 7 },
      (_, i) => entity.mindscapeBuffs?.[i] ?? {},
    ).map((pack) => ({
      ...pack,
      effectBlocks: (pack.effectBlocks ?? []).map((block) => ({
        ...block,
        effects: block.effects.map(mutation),
      })),
      effects: (pack.effects ?? []).map(mutation),
    })),
  }),
})

describe("batch 14 Miyabi frostburn break supplement conversion", () => {
  it("registers the option, target, and both rules beside the preserved fixed-source clauses", () => {
    const result = convert(pr14MiyabiData())
    expect(result.definitions.revision).toBe("42")
    // 影画 0 的既有条款照常转换（公开 ID 与 effectId 保持），两条元素修正
    // 将命中元素扩展为 [ice, frost]，其余条件与数值不变。
    const ultRule = result.definitions.effects.find(
      (e) =>
        e.kind === "contribution" && e.effectId === MIYABI_RES_PEN_EFFECT_ID,
    )! as ContributionRule & { when: { conditions: unknown[] } }
    expect(ultRule.when.conditions).toContainEqual({
      kind: "one-of",
      fact: "hit.element",
      values: ["ice", "frost"],
    })
    expect(ultRule.operation).toMatchObject({
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
    })
    expect(ultRule.parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    })
    // 独立目标：属于星见雅（1091），uncategorized，非追加攻击身份。
    const target = result.catalog.skillTargets.find(
      (t) => t.targetId === MIYABI_TARGET,
    )!
    expect(target).toMatchObject({
      upstreamId: null,
      agentEntityId: "1091",
      category: "uncategorized",
      name: "霜灼·破",
      countsAsFollowUp: false,
    })
    // 单一选项引用两条规则：主伤害（by-rank 核心 1—7）+ M4 增伤
    //（by-rank 影画 0—6，M0—3 为 0、M4—6 为 0.3）。
    const option = result.catalog.options.find(
      (o) => o.optionId === MIYABI_OPTION,
    )!
    expect(option.variants).toHaveLength(1)
    const variant = option.variants[0]!
    expect(variant.status).toBe("converted")
    expect(variant.configuration).toEqual({
      coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
    })
    expect(variant.maximumLayers).toBe(1)
    expect(variant.effectIds).toEqual([MAIN_DAMAGE, M4_BONUS])
    expect(variant.exclusiveDamageItem).toBe(true)
    expect(variant.damageItemRequirements).toEqual([
      {
        itemId: "miyabi:frostburn-break-damage",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        requiredCriticalRateDeclaration: true,
      },
    ])
    const mainRule = result.definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === MAIN_DAMAGE,
    )! as ContributionRule
    expect(mainRule.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: {
          1: 7.5,
          2: 8.75,
          3: 10,
          4: 11.25,
          5: 12.5,
          6: 13.75,
          7: 15,
        },
      },
    })
    const m4Rule = result.definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === M4_BONUS,
    )! as ContributionRule
    expect(m4Rule.config).toEqual({ kind: "constant", value: true })
    expect(m4Rule.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "mindscapeRank",
        unit: "ratio",
        values: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.3, 6: 0.3 },
      },
    })
    // 既有记录的真实身份仍在来源摘录里（合成数据不改写其 stat）。
    expect(JSON.stringify(result)).toContain(MIYABI_ULTIMATE_RECORD.id)
    expect(JSON.stringify(result)).toContain(
      MIYABI_SHIMOTSUKI_RES_PEN_RECORD.id,
    )
    // 补充来源记录登记为 integrated（规则 +2、选项 +1）。
    const supplementRecord = result.coverage.supplementalRecords.find(
      (r) => r.optionId === MIYABI_OPTION,
    )!
    expect(supplementRecord.status).toBe("integrated")
  })

  it("rejects a future direct-multiplier encoding anywhere in the registered rank-0 context", () => {
    // 未来同条款机器编码（无论出现在锚块内、新块还是 pack 级记录）都拒绝
    // 生成并要求重新核对，不静默叠加。
    const blockEncoding = (): SourceData =>
      pr14MiyabiData({
        rank0Pack: {
          effectBlocks: [
            miyabiEntity().mindscapeBuffs![0]!.effectBlocks![0]!,
            {
              ...miyabiEntity().mindscapeBuffs![0]!.effectBlocks![1]!,
              effects: [
                ...miyabiEntity().mindscapeBuffs![0]!.effectBlocks![1]!.effects,
                FUTURE_DIRECT_MULTIPLIER,
              ],
            },
          ],
          effects: [
            MIYABI_ULTIMATE_RECORD,
            ...miyabiEntity().mindscapeBuffs![0]!.effectBlocks![1]!.effects,
          ],
        },
      })
    expect(() => convert(blockEncoding())).toThrow(
      /conflicts with the fixed-source record.*directDmgMult|mindscape rank 0|field drift/s,
    )
    const newBlockEncoding = (): SourceData =>
      pr14MiyabiData({
        rank0Pack: {
          effectBlocks: [
            ...miyabiEntity().mindscapeBuffs![0]!.effectBlocks!,
            {
              id: "blk-future-frostburn",
              name: "核心被动：寒炎",
              note: "…[霜灼·破]…",
              effects: [FUTURE_DIRECT_MULTIPLIER],
            },
          ],
          effects: [
            MIYABI_ULTIMATE_RECORD,
            ...miyabiEntity().mindscapeBuffs![0]!.effectBlocks![1]!.effects,
            FUTURE_DIRECT_MULTIPLIER,
          ],
        },
      })
    expect(() => convert(newBlockEncoding())).toThrow(
      /mindscape rank 0|directDmgMult/,
    )
  })

  it("rejects when normalization alone rewrites a rank-0 record into the direct-multiplier family", () => {
    // raw 记录无害，但归一化把它改写为 directDmgMult：两份表示都核对，
    // 位置级拒绝覆盖 raw 与 normalized 任一表示（元素修正的登记编码核对
    // 先于补充守卫触发，同为拒绝，不静默降级）。
    expect(() =>
      convert(
        pr14MiyabiData(),
        miyabiSupplements,
        normalizedMutationFunctions((effect) =>
          effect.id === MIYABI_ULTIMATE_RECORD.id
            ? { ...effect, stat: "directDmgMult" }
            : effect,
        ),
      ),
    ).toThrow(/directDmgMult|mindscape rank 0|field drift/)
  })

  it("rejects any new encoding in the registered rank-4 empty pack", () => {
    // 影画 4 是真实空 pack：该位置出现任何新编码（无论 stat，含 note-only
    // 块）都拒绝——[皲裂]语义只从 Nanoka 补充登记，不伪造来源 note 或机器
    // 记录，也不让未来的上游编码与补充规则静默重复贡献。
    const m4NoteOnly = (): SourceData =>
      pr14MiyabiData({
        rank4Pack: {
          effectBlocks: [
            {
              id: "blk-legacy",
              name: "影画4",
              note: "[霜灼·破]造成的伤害提升30%，触发[霜灼·破]时，星见雅额外获得250点喧响值。",
              effects: [],
            },
          ],
          effects: [],
        },
      })
    expect(() => convert(m4NoteOnly())).toThrow(
      /registered agents:miyabi mindscape rank 4 as a currently empty pack/,
    )
    const m4Encoding = (): SourceData =>
      pr14MiyabiData({
        rank4Pack: {
          effectBlocks: [
            {
              id: "blk-legacy",
              name: "影画4",
              note: "…",
              effects: [
                (() => {
                  const { skillCategory, skillTargets, ...record } =
                    MIYABI_ULTIMATE_RECORD
                  void skillCategory
                  void skillTargets
                  return {
                    ...record,
                    id: "eff-future-m4-encoding",
                    stat: "skillDmgBonus",
                  }
                })(),
              ],
            },
          ],
          effects: [],
        },
      })
    expect(() => convert(m4Encoding())).toThrow(
      /registered agents:miyabi mindscape rank 4 as a currently empty pack/,
    )
  })

  it("rejects anchor block loss or note drift in the rank-0 context", () => {
    // 锚块缺失或 note 任何变化（追加、替换）都拒绝——上下文漂移要求重新
    // review，不做空白宽松归一。
    const lostAnchor = (): SourceData =>
      pr14MiyabiData({
        rank0Pack: {
          effectBlocks: [miyabiEntity().mindscapeBuffs![0]!.effectBlocks![1]!],
          effects: [
            ...miyabiEntity().mindscapeBuffs![0]!.effectBlocks![1]!.effects,
          ],
        },
      })
    expect(() => convert(lostAnchor())).toThrow(
      /lost its anchor block blk-legacy|lost its registered source record/,
    )
    const noteAppend = (): SourceData => {
      const miyabi = miyabiEntity()
      const blocks = miyabi.mindscapeBuffs![0]!.effectBlocks!.map((block) =>
        block.id === "blk-legacy"
          ? { ...block, note: `${MIYABI_ULTIMATE_NOTE}新增句子。` }
          : block,
      )
      return pr14MiyabiData({
        rank0Pack: {
          effectBlocks: blocks,
          effects: miyabi.mindscapeBuffs![0]!.effects ?? [],
        },
      })
    }
    expect(() => convert(noteAppend())).toThrow(/note drifted|block note drift/)
    const additionalAbilityNoteDrift = (): SourceData => {
      const miyabi = miyabiEntity()
      const blocks = miyabi.mindscapeBuffs![0]!.effectBlocks!.map((block) =>
        block.id === "blk-ms4msho4-fuuot6"
          ? {
              ...block,
              note: MIYABI_ADDITIONAL_ABILITY_NOTE.replace("60%", "65%"),
            }
          : block,
      )
      return pr14MiyabiData({
        rank0Pack: {
          effectBlocks: blocks,
          effects: miyabi.mindscapeBuffs![0]!.effects ?? [],
        },
      })
    }
    expect(() => convert(additionalAbilityNoteDrift())).toThrow(
      /note drifted|block note drift/,
    )
  })

  it("keeps real independent clauses in other ranks and full identities stable under reordering", () => {
    // 其他 rank 的真实独立条款不误拒：影画 1 减防与影画 6 霜月增伤直接用
    // 独立真实摘录夹具的块（miyabiM1Block/miyabiM6Block，逐字来自
    // fac62407 /agents/22），断言各自真实数值与作用域——M1 每层无视 6%
    // 防御力、最多 6 层（来源 note「每消耗1点[落霜]，[普通攻击：霜月]将
    // 无视目标6%防御力，最多叠加6层」），M6 霜月伤害 +30%（note「使
    // [普通攻击：霜月]造成的伤害提升30%」），两者都限定 basic+霜月精确
    // 目标。
    const withOtherRanks = pr14MiyabiData({
      extraRankBlocks: [
        { rank: 1, block: miyabiM1Block() },
        { rank: 6, block: miyabiM6Block() },
      ],
    })
    const ordered = convert(withOtherRanks)
    const m1Rule = ordered.definitions.effects.find(
      (e) =>
        e.kind === "contribution" &&
        e.effectId ===
          "agent:1091:zzz-hp:legacy-self-reduceDefense:blk-legacy:mindscape:1",
    ) as ContributionRule & { when: unknown }
    expect(m1Rule.parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.06 },
    })
    expect(m1Rule.activation).toMatchObject({
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 6 },
    })
    expect(m1Rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:miyabi-basic-ms4mtpk5"],
                },
              ],
            },
          ],
        },
      ],
    })
    const m6Rule = ordered.definitions.effects.find(
      (e) =>
        e.kind === "contribution" &&
        e.effectId ===
          "agent:1091:zzz-hp:legacy-self-skillDmgBonus:blk-legacy:mindscape:6",
    ) as ContributionRule & { when: unknown }
    expect(m6Rule.parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    })
    expect(m6Rule.activation).toMatchObject({
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 1 },
    })
    expect(m6Rule.when).toEqual({
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:miyabi-basic-ms4mtpk5"],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(ordered.definitions.revision).toBe("42")

    // 合法真实重排（实体数组、rank 0 块数组与块内记录数组顺序全部反转，
    // 先断言三类顺序确实改变；定义 rank 的影画档数组不参与重排）不改变
    // 规则/选项/目标/实体的完整身份语义。按完整 ID 排序后比较完整内容：
    // 保留 references 的 sourceId/version/locale/resourcePath 与成员、
    // Nanoka 语义 pointer、source.identity/section 与全部实体元数据，仅
    // 剔除随 ZZZ-HP 数组重排改变的位置型 pointer（reorderComparable）。
    const base = convert(pr14MiyabiData())
    const miyabi = miyabiEntity()
    const rank0 = miyabi.mindscapeBuffs![0]!
    const reorderedBlocks = rank0.effectBlocks!.toReversed()
    const reorderedRank0 = reorderedBlocks.map((block) => ({
      ...block,
      effects: block.effects.toReversed(),
    }))
    const caesar = {
      id: "caesar",
      name: "凯撒",
      profession: "防护",
      element: "物理",
      mindscapeBuffs: Array.from({ length: 7 }, () => ({
        effectBlocks: [],
        effects: [],
      })),
    }
    const reorderedMiyabi = {
      ...miyabi,
      mindscapeBuffs: miyabi.mindscapeBuffs!.map((pack, rank) =>
        rank === 0
          ? {
              effectBlocks: reorderedRank0,
              effects: reorderedRank0.flatMap((block) =>
                block.effects.map((effect) => ({ ...effect })),
              ),
            }
          : pack,
      ),
    }
    const reorderedAgents = [reorderedMiyabi, caesar]
    const baseAgentIds = pr14MiyabiData().agents.map((agent) => agent.id)
    expect(JSON.stringify(reorderedAgents.map((agent) => agent.id))).not.toBe(
      JSON.stringify(baseAgentIds),
    )
    expect(JSON.stringify(reorderedRank0.map((b) => b.id))).not.toBe(
      JSON.stringify(rank0.effectBlocks!.map((b) => b.id)),
    )
    expect(
      JSON.stringify(reorderedRank0[0]!.effects.map((e) => e.id)),
    ).not.toBe(JSON.stringify(rank0.effectBlocks![1]!.effects.map((e) => e.id)))
    const reordered = convert({
      ...pr14MiyabiData(),
      agents: reorderedAgents,
    })
    const byKey = (key: string) => (a: unknown, b: unknown) =>
      String((a as Record<string, unknown>)[key]).localeCompare(
        String((b as Record<string, unknown>)[key]),
      )
    const comparable = (
      result: ReturnType<typeof convert>,
    ): Record<string, unknown> => ({
      effects: result.definitions.effects
        .toSorted(byKey("effectId"))
        .map(reorderComparable),
      options: result.catalog.options
        .toSorted(byKey("optionId"))
        .map(reorderComparable),
      skillTargets: result.catalog.skillTargets
        .toSorted(byKey("targetId"))
        .map(reorderComparable),
      entities: result.catalog.entities
        .toSorted(byKey("catalogEntityId"))
        .map(reorderComparable),
    })
    expect(comparable(reordered)).toEqual(comparable(base))
  })
})

describe("batch 14 Miyabi settlement element scope correction conversion", () => {
  /** 命中修正的两条 effectId。 */
  const ULT_DMG_BONUS =
    "agent:1091:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0"

  const ruleOf = (result: ReturnType<typeof convert>, effectId: string) =>
    result.definitions.effects.find(
      (e) => e.kind === "contribution" && e.effectId === effectId,
    ) as ContributionRule & { when: { conditions: unknown[] } }

  it("extends exactly the two registered identities to [ice, frost] and marks them corrected", () => {
    const result = convert(pr14MiyabiData())
    for (const [effectId, operation] of [
      [ULT_DMG_BONUS, { kind: "factor-contribution", channel: "damage-bonus" }],
      [
        MIYABI_RES_PEN_EFFECT_ID,
        {
          kind: "factor-contribution",
          channel: "attacker-resistance-ignore",
        },
      ],
    ] as const) {
      const rule = ruleOf(result, effectId)
      expect(rule.when.conditions, effectId).toContainEqual({
        kind: "one-of",
        fact: "hit.element",
        values: ["ice", "frost"],
      })
      expect(rule.operation, effectId).toMatchObject(operation)
      expect(rule.parameters, effectId).toEqual({
        amount: { kind: "constant", unit: "ratio", value: 0.3 },
      })
    }
    // 修正状态与差异登记：两条选项的变体 corrected + 具名差异。
    for (const optionId of [
      "agents:miyabi:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4mu14z-vj4c3r",
    ]) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.variants[0]!.status, optionId).toBe("corrected")
      expect(option.variants[0]!.differences, optionId).toContainEqual(
        "miyabi-frost-settlement-element-scope",
      )
    }
    const difference = result.catalog.differences.find(
      (d) => d.differenceId === "miyabi-frost-settlement-element-scope",
    )!
    expect(difference.references).toEqual([
      {
        sourceId: "zzz-hp",
        version: "fac62407f3d3995f8200a66be0038f292b1455fa",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0",
      },
      {
        sourceId: "zzz-hp",
        version: "fac62407f3d3995f8200a66be0038f292b1455fa",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.2",
        locale: "zh",
        resourcePath: "agents/1091/details.zh.json",
        pointer: "/specialElementType/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.2",
        locale: "en",
        resourcePath: "agents/1091/details.en.json",
        pointer: "/specialElementType/desc",
      },
    ])
    // 同块的霜月 +60% 增伤记录（elementFilter=all）不受影响：无元素条件、
    // 状态保持 converted。
    const shimotsukiBonus = ruleOf(
      result,
      "agent:1091:zzz-hp:eff-ms4msho4-rjt6sj:blk-ms4msho4-fuuot6:mindscape:0",
    )
    expect(JSON.stringify(shimotsukiBonus.when.conditions)).not.toContain(
      '"hit.element"',
    )
    const shimotsukiBonusOption = result.catalog.options.find(
      (o) =>
        o.optionId ===
        "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4msho4-rjt6sj",
    )!
    expect(shimotsukiBonusOption.variants[0]!.status).toBe("converted")
  })

  it("rejects encoding drift, note drift, element filter change, and skill target drift on the two identities", () => {
    // 编码漂移（数值/stat）、elementFilter 变化、skillTargets 漂移、块 note
    // 漂移、normalized 删除都拒绝生成；未来偏移的记录不再静默纠正，也不以
    // 局部 ID 子串定位。
    const drift = (
      mutate: (effect: SourceEffect) => SourceEffect,
      blockId: string,
      note?: string,
    ): SourceData => {
      const miyabi = miyabiEntity()
      const blocks = miyabi.mindscapeBuffs![0]!.effectBlocks!.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...(note === undefined ? {} : { note }),
              effects: block.effects.map(mutate),
            }
          : block,
      )
      return pr14MiyabiData({
        rank0Pack: {
          effectBlocks: blocks,
          effects: blocks.flatMap((b) => b.effects.map((e) => ({ ...e }))),
        },
      })
    }
    expect(() =>
      convert(
        drift(
          (e) => (e.id === "legacy-self-dmgBonus" ? { ...e, value: 35 } : e),
          "blk-legacy",
        ),
      ),
    ).toThrow(/Settlement element scope correction.*field drift.*: value/)
    expect(() =>
      convert(
        drift(
          (e) =>
            e.id === "legacy-self-dmgBonus"
              ? { ...e, stat: "skillDmgBonus" }
              : e,
          "blk-legacy",
        ),
      ),
    ).toThrow(/Settlement element scope correction.*field drift.*: stat/)
    expect(() =>
      convert(
        drift(
          (e) =>
            e.id === "legacy-self-dmgBonus"
              ? { ...e, elementFilter: ["冰", "火"] }
              : e,
          "blk-legacy",
        ),
      ),
    ).toThrow(
      /Settlement element scope correction.*field drift.*: elementFilter/,
    )
    expect(() =>
      convert(
        drift(
          (e) =>
            e.id === MIYABI_SHIMOTSUKI_RES_PEN_RECORD.id
              ? {
                  ...e,
                  skillTargets: [{ category: "basic", subcategoryId: null }],
                }
              : e,
          "blk-ms4msho4-fuuot6",
        ),
      ),
    ).toThrow(
      /Settlement element scope correction.*field drift.*: skillTargets/,
    )
    expect(() =>
      convert(drift((e) => e, "blk-legacy", `${MIYABI_ULTIMATE_NOTE}追加句。`)),
    ).toThrow(
      /Supplement nanoka:agents:miyabi:frostburn-break-damage anchor block blk-legacy note drifted/,
    )
    // normalized 删除（归一化不再收集该记录）同样拒绝——重命名归一化记录
    // 会先触发收集不变量（未入账的归一化效果），同为拒绝，不静默降级。
    expect(() =>
      convert(
        pr14MiyabiData(),
        miyabiSupplements,
        normalizedMutationFunctions((effect) =>
          effect.id === "legacy-self-dmgBonus"
            ? { ...effect, id: "renamed-away" }
            : effect,
        ),
      ),
    ).toThrow(
      /lost the normalized record|Settlement element scope|unaccounted source effects/,
    )
  })

  it("does not touch other agents' ice-only rules or ice elements elsewhere", () => {
    // 未登记的其他实体 ice 记录保持原样（不扫描修全角色）：以同 fixture 的
    // 凯撒无关、星见雅未登记记录为例，元素条件不含 frost 的 ice 记录不改。
    const data = pr14MiyabiData({
      extraRankBlocks: [
        {
          rank: 2,
          block: {
            id: "blk-legacy",
            name: "影画2",
            note: "…",
            effects: [
              {
                ...MIYABI_ULTIMATE_RECORD,
                id: "eff-unregistered-ice-record",
                stat: "skillDmgBonus",
              },
            ],
          },
        },
      ],
    })
    const result = convert(data)
    const unregistered = result.definitions.effects.find(
      (e) =>
        e.kind === "contribution" &&
        e.effectId ===
          "agent:1091:zzz-hp:eff-unregistered-ice-record:blk-legacy:mindscape:2",
    ) as ContributionRule & { when: { conditions: unknown[] } }
    expect(unregistered.when.conditions).toContainEqual({
      kind: "one-of",
      fact: "hit.element",
      values: ["ice"],
    })
  })
})

describe("batch 14 settlement element scope identity presence", () => {
  /**
   * R01：两条 settlement-element-scope 登记身份（删除/改 ID/迁离登记 rank）在
   * 星见雅实体参与转换时必须拒绝生成。锚块与冻结 note 全部保留，失败不能
   * 依赖锚块缺失；raw 的 block.effects 与 pack.effects 一致变更，确保突变
   * 会真正进入记录收集。守卫与传入的 supplements 无关——两条元素修正本身
   * 不依赖任何补充选中（元素修正按 SOURCE_SEMANTICS 全局登记逐记录生效）。
   */
  const REGISTERED_IDENTITIES = [
    { id: "legacy-self-dmgBonus", label: "the ultimate ice bonus" },
    { id: "eff-ms4mu14z-vj4c3r", label: "the Shimotsuki ice RES ignore" },
  ] as const
  type IdentityMutation = "delete" | "rename" | "move-rank-3"

  const identityMutatedData = (
    targetId: string,
    mutation: IdentityMutation,
  ): SourceData => {
    const miyabi = miyabiEntity()
    const rank0 = miyabi.mindscapeBuffs![0]!
    const rank0Blocks = rank0.effectBlocks!.map((block) => ({
      ...block,
      effects: block.effects.flatMap((effect) => {
        if (effect.id !== targetId) return [{ ...effect }]
        if (mutation === "delete") return []
        if (mutation === "rename")
          return [{ ...effect, id: `${effect.id}-renamed` }]
        return []
      }),
    }))
    const movedRecord =
      mutation === "move-rank-3"
        ? rank0
            .effectBlocks!.flatMap((block) => block.effects)
            .find((effect) => effect.id === targetId)!
        : undefined
    const mindscapeBuffs = miyabi.mindscapeBuffs!.map((pack, rank) => {
      if (rank === 0)
        return {
          effectBlocks: rank0Blocks,
          effects: rank0Blocks.flatMap((block) =>
            block.effects.map((effect) => ({ ...effect })),
          ),
        }
      if (rank === 3 && movedRecord !== undefined) {
        return {
          effectBlocks: [
            {
              id: "blk-legacy",
              name: "影画3",
              note: "迁移位置的登记记录（合成突变）。",
              effects: [{ ...movedRecord }],
            },
          ],
          effects: [{ ...movedRecord }],
        }
      }
      return pack
    })
    return {
      agents: [
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
        { ...miyabi, mindscapeBuffs },
      ],
      driveDiscs: [],
      skillSubcategories: [],
      followUpSkillRules: [],
      wengines: [],
    }
  }

  it.each(
    REGISTERED_IDENTITIES.flatMap(({ id, label }) =>
      (["delete", "rename", "move-rank-3"] as const).map((mutation) => ({
        label,
        id,
        mutation,
      })),
    ),
  )(
    "rejects conversion when $mutation removes the registered identity of $label",
    ({ id, mutation }: { id: string; mutation: IdentityMutation }) => {
      // 锚块与 note 保持原样（突变只作用于记录身份本身）。
      expect(() => convert(identityMutatedData(id, mutation))).toThrow(
        /settlement element scope correction miyabi-frost-settlement-element-scope lost its registered source record/,
      )
    },
  )

  it("keeps the identity check independent of the frostburn supplement selection", () => {
    // 元素修正守卫不是新补充独有的副作用：不传入任何补充时，登记身份
    // 消失同样拒绝（修正按全局 SOURCE_SEMANTICS 登记，不依赖补充参与）。
    expect(() =>
      convert(identityMutatedData("legacy-self-dmgBonus", "delete"), []),
    ).toThrow(/lost its registered source record/)
    // 原样来源在不传补充时可正常转换，两条规则仍获得 [ice, frost] 修正。
    const withoutSupplements = convert(pr14MiyabiData(), [])
    for (const effectId of [
      MIYABI_ULTIMATE_EFFECT_ID,
      MIYABI_RES_PEN_EFFECT_ID,
    ]) {
      const rule = withoutSupplements.definitions.effects.find(
        (e) => e.kind === "contribution" && e.effectId === effectId,
      ) as ContributionRule & { when: { conditions: unknown[] } }
      expect(rule.when.conditions, effectId).toContainEqual({
        kind: "one-of",
        fact: "hit.element",
        values: ["ice", "frost"],
      })
    }
  })

  it("keeps partial conversions without Miyabi usable", () => {
    // 实体存在边界：完全不含星见雅的局部转换不受登记身份检查影响
    //（不传入依赖星见雅目录实体的补充）。
    const result = convert(
      {
        agents: [
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
        ],
        driveDiscs: [],
        skillSubcategories: [],
        followUpSkillRules: [],
        wengines: [],
      },
      [],
    )
    expect(result.definitions.revision).toBe("42")
  })
})

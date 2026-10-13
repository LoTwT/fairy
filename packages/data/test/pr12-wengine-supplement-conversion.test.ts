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
  CANNON_ROTOR_TIER_VALUES,
  bigCylinderRefinementBlocks,
  cannonRotorAtkRecord,
  cannonRotorRefinementNotes,
  wengineAdditionalDamageEntities,
} from "./fixtures/wengine-additional-damage-source.ts"

/**
 * 增益修复批次 12（修订 27）的合成转换回归：比格气缸受击附伤与加农转子
 * 暴击附伤按 Nanoka 补充登记编译，音擎精炼五档上下文守卫（锚块冻结 note、
 * 冲突 stat 家族 raw/normalized 双核、共存机器记录形状）按登记拒绝，不静默
 * 套用另一份含义；合法重排与无关条款记录不误伤。真实固定来源的整体验证
 * 由生成入口完成（两音擎五档块的实际形态与登记一致），本文件用合成数据
 * 核对守卫行为本身。
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

const bigCylinderSupplement = SUPPLEMENTS.find(
  (s): s is Supplement & { kind: "option" } =>
    s.supplementId === "nanoka:w-engines:13112:retaliation-defense-damage",
)! as Supplement
const cannonRotorSupplement = SUPPLEMENTS.find(
  (s) => s.supplementId === "nanoka:w-engines:14001:critical-hit-bonus-damage",
)! as Supplement
const pr12Supplements: readonly Supplement[] = [
  bigCylinderSupplement,
  cannonRotorSupplement,
]

/**
 * 冻结 note / 块 ID / 常驻记录形状取自独立夹具（逐字来自 fac62407 真实
 * 固定源，见 fixtures/wengine-additional-damage-source.ts），不从补充登记
 * 常量生成，避免夹具自证；登记与真实固定源的一致性由生成入口核对。
 */
const bigCylinderBlocks = bigCylinderRefinementBlocks()
const bigCylinderNotes: readonly string[] = bigCylinderBlocks.map(
  (block) => block.note,
)
const bigCylinderBlockIds: readonly string[] = bigCylinderBlocks.map(
  (block) => block.id,
)
const cannonRotorNotes: readonly string[] = cannonRotorRefinementNotes
const atkRecord = (value: number): SourceEffect => cannonRotorAtkRecord(value)

interface Pr12Overrides {
  /** 比格气缸：替换某档锚块（默认按 tier 取登记块 id 与冻结 note）。 */
  readonly bigCylinderTierBlock?: (tier: number) => {
    readonly id: string
    readonly note: string
    readonly effects: readonly SourceEffect[]
  }
  readonly bigCylinderExtraPackRecords?: readonly SourceEffect[]
  readonly bigCylinderTierCount?: number
  readonly cannonRotorTierBlock?: (tier: number) => {
    readonly effects: readonly SourceEffect[]
  }
  readonly cannonRotorExtraPackRecords?: readonly SourceEffect[]
}

const pr12WengineData = (overrides: Pr12Overrides = {}): SourceData => {
  const bigCylinderTiers: SourcePack[] = (
    overrides.bigCylinderTierCount === undefined
      ? [1, 2, 3, 4, 5]
      : Array.from({ length: overrides.bigCylinderTierCount }, (_, i) => i + 1)
  ).map((tier) => {
    const injected =
      overrides.bigCylinderTierBlock === undefined
        ? undefined
        : overrides.bigCylinderTierBlock(tier)
    return {
      effectBlocks: [
        {
          id: injected?.id ?? bigCylinderBlockIds[tier - 1]!,
          name: `精${String(tier)}`,
          note: injected?.note ?? bigCylinderNotes[tier - 1]!,
          effects: [...(injected?.effects ?? [])],
        },
      ],
      effects:
        tier === 1 ? [...(overrides.bigCylinderExtraPackRecords ?? [])] : [],
    }
  })
  const cannonRotorTiers: SourcePack[] = [1, 2, 3, 4, 5].map((tier) => {
    const injected =
      overrides.cannonRotorTierBlock === undefined
        ? undefined
        : overrides.cannonRotorTierBlock(tier)
    return {
      effectBlocks: [
        {
          id: "blk-legacy",
          name: `精${String(tier)}`,
          note: cannonRotorNotes[tier - 1]!,
          effects: [
            ...(injected?.effects ?? [
              atkRecord(CANNON_ROTOR_TIER_VALUES[tier - 1]!),
            ]),
          ],
        },
      ],
      effects:
        tier === 1 ? [...(overrides.cannonRotorExtraPackRecords ?? [])] : [],
    }
  })
  return {
    agents: [],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [
      {
        id: "Big_Cylinder",
        name: "比格气缸",
        profession: "防护",
        fixedBuffs: { effectBlocks: [], effects: [] },
        refinementBuffs: bigCylinderTiers,
      },
      {
        id: "Cannon_Rotor",
        name: "加农转子",
        profession: "强攻",
        fixedBuffs: { effectBlocks: [], effects: [] },
        refinementBuffs: cannonRotorTiers,
      },
    ],
  }
}

const convert = (
  data: SourceData,
  supplements: readonly Supplement[] = pr12Supplements,
  normalization: SourceNormalization = functions,
) => convertSource(data, normalization, [], supplements)

const DIRECT_DAMAGE_EFFECT = (stat: string, value: number): SourceEffect => ({
  ...atkRecord(0),
  id: "eff-future-encoding",
  stat,
  value,
})

describe("batch 12 w-engine additional damage supplements", () => {
  it("registers both options, targets, and rules beside the preserved fixed-source clause", () => {
    const result = convert(pr12WengineData())
    expect(result.definitions.revision).toBe("29")
    // 加农转子的常驻 ATK 记录照常转换为既有选项（公开 ID 保持）。
    expect(
      result.catalog.options.some(
        (o) =>
          o.optionId ===
          "w-engines:Cannon_Rotor:refinement:blk-legacy:legacy-self-inCombatAtkPercent",
      ),
    ).toBe(true)
    // 两个附伤目标：音擎独立目标不属于任何代理人。
    for (const targetId of [
      "zzz-hp:skill:big-cylinder-retaliation",
      "zzz-hp:skill:cannon-rotor-bonus-damage",
    ]) {
      const target = result.catalog.skillTargets.find(
        (t) => t.targetId === targetId,
      )!
      expect(target).toMatchObject({
        upstreamId: null,
        agentEntityId: null,
        category: "uncategorized",
        countsAsFollowUp: false,
      })
    }
    for (const [optionId, expected] of [
      [
        "nanoka:w-engines:13112:retaliation-defense-damage",
        {
          effectIds: [
            "w-engine:13112:nanoka:retaliation-defense-damage",
            "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
          ],
          item: "big-cylinder:retaliation",
          stat: "defense",
          values: { 1: 6, 2: 6.9, 3: 7.8, 4: 8.7, 5: 9.6 },
        },
      ],
      [
        "nanoka:w-engines:14001:critical-hit-bonus-damage",
        {
          effectIds: ["w-engine:14001:nanoka:critical-hit-bonus-damage"],
          item: "cannon-rotor:bonus-damage",
          stat: "attack",
          values: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
        },
      ],
    ] as const) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.variants).toHaveLength(1)
      const variant = option.variants[0]!
      expect(variant.status).toBe("converted")
      expect(variant.configuration).toEqual({ refinements: [1, 2, 3, 4, 5] })
      expect(variant.maximumLayers).toBe(1)
      expect(variant.effectIds).toEqual([...expected.effectIds])
      // 两选项均独占结算；加农转子的唯一要求项另声明最终暴击概率
      // （无默认、替换语义）。
      expect(variant.exclusiveDamageItem).toBe(true)
      expect(variant.damageItemRequirements).toEqual([
        {
          itemId: expected.item,
          stat: expected.stat,
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: "uncategorized",
          ...(optionId.includes("14001")
            ? { requiredCriticalRateDeclaration: true }
            : {}),
        },
      ])
      expect(variant.references.map((r) => r.pointer)).toEqual(
        ([1, 2, 3, 4, 5] as const).map(
          (tier) => `/talents/${String(tier)}/desc`,
        ),
      )
      const damageRule = result.definitions.effects.find(
        (e): e is ContributionRule =>
          e.kind === "contribution" && e.effectId === expected.effectIds[0],
      )!
      expect(damageRule.operation).toEqual({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [expected.item],
        value: { kind: "parameter", unit: "multiplier", name: "amount" },
      })
      expect(damageRule.parameters).toEqual({
        amount: {
          kind: "by-rank",
          rank: "refinement",
          unit: "multiplier",
          values: expected.values,
        },
      })
      // 规则条件：目标标签 + regular 直伤；不按元素筛选。
      expect(damageRule.when).toEqual({
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: [
              optionId.includes("13112")
                ? "zzz-hp:skill:big-cylinder-retaliation"
                : "zzz-hp:skill:cannon-rotor-bonus-damage",
            ],
          },
        ],
      })
    }
    // 比格气缸的第二条规则：必暴通道。
    const critRule = result.definitions.effects.find(
      (e): e is ContributionRule =>
        e.kind === "contribution" &&
        e.effectId ===
          "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
    )!
    expect(critRule.operation).toEqual({
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: { kind: "literal", unit: "ratio", value: 1 },
    })
    // 覆盖报告登记两条补充。
    expect(
      result.coverage.supplementalRecords.filter((record) =>
        [
          "nanoka:w-engines:13112:retaliation-defense-damage",
          "nanoka:w-engines:14001:critical-hit-bonus-damage",
        ].includes(record.supplementId),
      ),
    ).toHaveLength(2)
    // 无记录实体的来源 pack 保持 no-effect-record（比格气缸五档 note-only）。
    for (const pack of result.coverage.packs.filter(
      (entry) => entry.catalogEntityId === "w-engines:Big_Cylinder",
    ))
      expect(pack.status).toBe("no-effect-record")
  })

  it("rejects anchor, note, tier-count, and encoding drift at the big cylinder context", () => {
    // 锚块缺失（某档换块 ID）。
    expect(() =>
      convert(
        pr12WengineData({
          bigCylinderTierBlock: (tier) => ({
            id: "blk-renamed",
            note: bigCylinderNotes[tier - 1]!,
            effects: [],
          }),
        }),
      ),
    ).toThrowError(/lost its anchor block blk-ms1q9sxu-g88pag .* refinement 1/)
    // note 漂移：替换数值。
    expect(() =>
      convert(
        pr12WengineData({
          bigCylinderTierBlock: (tier) => ({
            id: bigCylinderBlockIds[tier - 1]!,
            note: bigCylinderNotes[tier - 1]!.replace("600", "700"),
            effects: [],
          }),
        }),
      ),
    ).toThrowError(/anchor block .* note drifted .* refinement 1/)
    // note 漂移：保留原文再追加新句。
    expect(() =>
      convert(
        pr12WengineData({
          bigCylinderTierBlock: (tier) => ({
            id: bigCylinderBlockIds[tier - 1]!,
            note: bigCylinderNotes[tier - 1]! + "追加的新句。",
            effects: [],
          }),
        }),
      ),
    ).toThrowError(/anchor block .* note drifted .* refinement 1/)
    // 档数不是五档。
    expect(() =>
      convert(pr12WengineData({ bigCylinderTierCount: 4 })),
    ).toThrowError(/expects five refinement tiers .* found 4 source tiers/)
    // 五档内出现直接倍率机器编码（raw 表示）。
    for (const stat of ["directDmgMult", "directDmgMultFactor"]) {
      expect(() =>
        convert(
          pr12WengineData({
            bigCylinderExtraPackRecords: [DIRECT_DAMAGE_EFFECT(stat, 600)],
          }),
        ),
      ).toThrowError(
        new RegExp(`conflicts with the fixed-source record .*stat ${stat}`),
      )
    }
    // “必定触发暴击”被上游编码为暴击率记录：同样拒绝重核。
    expect(() =>
      convert(
        pr12WengineData({
          bigCylinderExtraPackRecords: [DIRECT_DAMAGE_EFFECT("critRate", 100)],
        }),
      ),
    ).toThrowError(/conflicts with the fixed-source record .*stat critRate/)
    // raw 是未知 stat、归一化后被改写为 directDmgMult：normalized 表示拒绝
    // （错误同时报告 raw 与 normalized 两个 stat 名）。
    expect(() =>
      convert(
        pr12WengineData({
          bigCylinderExtraPackRecords: [
            DIRECT_DAMAGE_EFFECT("brandNewProcStat", 600),
          ],
        }),
        pr12Supplements,
        {
          ...functions,
          normalizeWengine: (entity) => {
            const normalized = normalize(entity)
            return {
              ...normalized,
              refinementBuffs: normalized.refinementBuffs!.map((pack) => ({
                ...pack,
                effects: (pack.effects ?? []).map((e) =>
                  e.stat === "brandNewProcStat"
                    ? { ...e, stat: "directDmgMult" }
                    : e,
                ),
              })),
            }
          },
        },
      ),
    ).toThrowError(
      /conflicts with the fixed-source record .*stat brandNewProcStat, normalized directDmgMult/,
    )
    // 无关条款（stat 不在登记家族内的真实已注册 stat，如未来出现的
    // 增伤/承伤类条款）不误拒，正常生成。
    expect(() =>
      convert(
        pr12WengineData({
          bigCylinderExtraPackRecords: [DIRECT_DAMAGE_EFFECT("dmgBonus", 15)],
        }),
      ),
    ).not.toThrow()
  })

  /**
   * 加农转子共存守卫的逐案例矩阵（永久回归）：锚块与 note 漂移、
   * raw/normalized 完整形状漂移、归一化存活、直接倍率机器编码与未修改正控。
   * 期望值不来自待验输入：拒绝信息对应登记的冻结形状字段。
   */
  interface RotorMutation {
    readonly label: string
    readonly expectError: RegExp | null
    readonly mutateData?: (data: ReturnType<typeof pr12WengineData>) => void
    readonly mutateFunctions?: (
      normalization: SourceNormalization,
    ) => SourceNormalization
  }
  /** raw 记录的按档覆盖：默认取登记形状，tier 1 用变更值。 */
  const withTierOneRecord =
    (
      change: (record: ReturnType<typeof atkRecord>) => SourceEffect,
    ): NonNullable<RotorMutation["mutateData"]> =>
    (data) => {
      for (const pack of data.wengines[1]!.refinementBuffs ?? [])
        for (const block of pack.effectBlocks ?? [])
          block.effects = block.effects.map((effect) =>
            effect.id === "legacy-self-inCombatAtkPercent"
              ? change(effect as ReturnType<typeof atkRecord>)
              : effect,
          )
    }
  /** 只改归一化产物（raw 保持冻结形状）：克隆后按记录身份改写。 */
  const mutateNormalizedOnly =
    (
      change: (effect: ReturnType<typeof atkRecord>) => void,
    ): NonNullable<RotorMutation["mutateFunctions"]> =>
    (normalization) => ({
      ...normalization,
      normalizeWengine: (entity) => {
        const normalized = normalize(entity)
        if (entity.id !== "Cannon_Rotor") return normalized
        const cloned = structuredClone(normalized)
        for (const pack of cloned.refinementBuffs ?? [])
          for (const block of pack.effectBlocks ?? [])
            for (const effect of block.effects)
              if (effect.id === "legacy-self-inCombatAtkPercent")
                change(effect as ReturnType<typeof atkRecord>)
        return cloned
      },
    })
  const removeNormalizedRecords = (
    normalization: SourceNormalization,
  ): SourceNormalization => ({
    ...normalization,
    normalizeWengine: (entity) => {
      const normalized = normalize(entity)
      if (entity.id !== "Cannon_Rotor") return normalized
      const cloned = structuredClone(normalized)
      for (const pack of cloned.refinementBuffs ?? []) {
        for (const block of pack.effectBlocks ?? [])
          if (
            block.effects.some((e) => e.id === "legacy-self-inCombatAtkPercent")
          )
            block.effects = []
        pack.effects = []
      }
      return cloned
    },
  })
  const ROTOR_MUTATIONS: readonly RotorMutation[] = [
    {
      label: "unmodified coexisting shape (control)",
      expectError: null,
    },
    {
      label: "anchor block loses the coexisting record at tier 3",
      expectError:
        /lost the coexisting record legacy-self-inCombatAtkPercent .* refinement 3/,
      mutateData: (data) => {
        const tier3 = data.wengines[1]!.refinementBuffs![2]!
        tier3.effectBlocks![0]!.effects = []
      },
    },
    {
      label: "anchor note drift at tier 1",
      expectError:
        /anchor block blk-legacy note drifted .* refinement 1: expected the frozen full note/,
      mutateData: (data) => {
        data.wengines[1]!.refinementBuffs![0]!.effectBlocks![0]!.note =
          cannonRotorNotes[0]!.replace("7.5", "9.9")
      },
    },
    {
      label: "raw field stat drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent raw field stat drifted/,
      mutateData: withTierOneRecord((record) => ({ ...record, stat: "atk" })),
    },
    {
      label: "raw field value drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent raw field value drifted to 9\.9 \(expected 7\.5\) .* refinement 1/,
      mutateData: withTierOneRecord((record) => ({ ...record, value: 9.9 })),
    },
    {
      label: "raw scope and skill-targeting drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent raw field scope drifted/,
      mutateData: withTierOneRecord((record) => ({
        ...record,
        scope: "skill",
        skillTargets: [{ category: "basic", subcategoryId: null }],
      })),
    },
    {
      label: "raw stacked encoding drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent raw field kind drifted/,
      mutateData: withTierOneRecord((record) => ({
        ...record,
        kind: "stacked",
        stackable: true,
        maxStacks: 2,
        valuePerStack: 100,
      })),
    },
    {
      label: "raw element filter drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent raw field elementFilter drifted/,
      mutateData: withTierOneRecord((record) => ({
        ...record,
        elementFilter: ["火"],
      })),
    },
    {
      label: "normalized coexisting record removed",
      expectError:
        /lost the normalized coexisting record legacy-self-inCombatAtkPercent .* refinement 1/,
      mutateFunctions: removeNormalizedRecords,
    },
    {
      label: "normalized field stat drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent normalized field stat drifted/,
      mutateFunctions: mutateNormalizedOnly((effect) => {
        effect.stat = "atk"
      }),
    },
    {
      label: "normalized field value drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent normalized field value drifted to 50 \(expected 7\.5\) .* refinement 1/,
      mutateFunctions: mutateNormalizedOnly((effect) => {
        effect.value = 50
      }),
    },
    {
      label: "normalized field scope drift",
      expectError:
        /coexisting record legacy-self-inCombatAtkPercent normalized field scope drifted/,
      mutateFunctions: mutateNormalizedOnly((effect) => {
        effect.scope = "skill"
        effect.skillTargets = [{ category: "basic", subcategoryId: null }]
      }),
    },
    {
      label: "direct multiplier machine encoding in the anchor block",
      expectError:
        /conflicts with the fixed-source record .*stat directDmgMult/,
      mutateData: (data) => {
        for (const pack of data.wengines[1]!.refinementBuffs ?? [])
          for (const block of pack.effectBlocks ?? [])
            block.effects.push(DIRECT_DAMAGE_EFFECT("directDmgMult", 200))
      },
    },
  ]

  it.each(ROTOR_MUTATIONS)(
    "cannon rotor coexisting guard: $label",
    (mutation) => {
      const data = pr12WengineData()
      mutation.mutateData?.(data)
      const normalization = mutation.mutateFunctions
        ? mutation.mutateFunctions(functions)
        : functions
      const attempt = () => convert(data, pr12Supplements, normalization)
      if (mutation.expectError === null) expect(attempt).not.toThrow()
      else expect(attempt).toThrowError(mutation.expectError)
    },
  )

  it("rejects critical rate declaration requirements outside the exclusive sole-item shape", () => {
    const rotorVariant = (
      cannonRotorSupplement as Extract<
        Supplement,
        { variant: SupplementVariantSpec }
      >
    ).variant
    const [rotorRequirement] = rotorVariant.damageItemRequirements ?? []
    if (rotorRequirement === undefined) {
      throw new Error("rotor variant must declare a damage item requirement")
    }
    const mutated = (
      mutate: (variant: SupplementVariantSpec) => SupplementVariantSpec,
    ) =>
      pr12Supplements.map((supplement) =>
        supplement.supplementId ===
        "nanoka:w-engines:14001:critical-hit-bonus-damage"
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
        pr12WengineData(),
        mutated(({ exclusiveDamageItem: _exclusive, ...variant }) => variant),
      ),
    ).toThrowError(
      /requires a declared critical rate but its variant does not declare exclusiveDamageItem/,
    )
    // 有声明要求但要求项不满足形状（settlement 角色）。
    expect(() =>
      convert(
        pr12WengineData(),
        mutated((variant) => ({
          ...variant,
          damageItemRequirements: [
            {
              ...rotorRequirement,
              role: "settlement",
            },
          ],
        })),
      ),
    ).toThrowError(/requires a declared critical rate but uses role settlement/)
    // 有声明要求但允许非 direct 模式。
    expect(() =>
      convert(
        pr12WengineData(),
        mutated((variant) => ({
          ...variant,
          damageItemRequirements: [
            {
              ...rotorRequirement,
              allowedModes: ["direct", "standard-disorder"],
            },
          ],
        })),
      ),
    ).toThrowError(
      /requires a declared critical rate but allows non-direct preparation modes/,
    )
    // 有声明要求但来源不是 holder-current。
    expect(() =>
      convert(
        pr12WengineData(),
        mutated((variant) => ({
          ...variant,
          damageItemRequirements: [
            {
              ...rotorRequirement,
              source: "anomaly-source",
            },
          ],
        })),
      ),
    ).toThrowError(
      /requires a declared critical rate but uses source anomaly-source/,
    )
    // 未改登记的正控：正常生成（上方用例已覆盖）。
    expect(() => convert(pr12WengineData())).not.toThrow()
  })

  it("keeps identities stable under legal reordering of entities, blocks, and effects", () => {
    // 真实重排正控：每档追加独立合法块（dmgBonus 条款）与锚块内第二条
    // 合法记录（比格气缸锚块原为空、加农转子锚块追加 def 记录），再
    // 反转实体数组、块数组与效果数组；精炼档顺序（1—5）保持不变。
    // 断言重排真的改变了输入顺序，且全部规则/选项身份与可执行语义
    // （除来源 pointer）逐字一致。
    const legalExtraBlock = (tier: number): SourceBlock => ({
      id: `blk-extra-${String(tier)}`,
      name: "独立合法条款",
      note: `独立条款（第 ${String(tier)} 档）。`,
      effects: [DIRECT_DAMAGE_EFFECT("dmgBonus", 15)],
    })
    const legalRotorExtraEffect = (): SourceEffect => ({
      ...atkRecord(20),
      id: "legacy-self-def",
      stat: "def",
      value: 20,
    })
    const buildStraight = () =>
      convert(
        {
          ...pr12WengineData(),
          wengines: [
            ...wengineAdditionalDamageEntities({
              bigCylinderExtraBlock: legalExtraBlock,
              cannonRotorExtraBlock: legalExtraBlock,
              cannonRotorExtraEffect: legalRotorExtraEffect,
            }),
          ],
        },
        pr12Supplements,
      )
    const reorder = (data: SourceData): SourceData => ({
      ...data,
      wengines: data.wengines.toReversed().map((entity) => ({
        ...entity,
        refinementBuffs: entity.refinementBuffs!.map((pack) => ({
          ...pack,
          effectBlocks: (pack.effectBlocks ?? [])
            .map((block) => ({
              ...block,
              effects: (block.effects ?? []).toReversed(),
            }))
            .toReversed(),
        })),
      })),
    })
    const straightInput = {
      ...pr12WengineData(),
      wengines: [
        ...wengineAdditionalDamageEntities({
          bigCylinderExtraBlock: legalExtraBlock,
          cannonRotorExtraBlock: legalExtraBlock,
          cannonRotorExtraEffect: legalRotorExtraEffect,
        }),
      ],
    }
    const reorderedInput = reorder(straightInput)
    // 重排正控：输入顺序真的不同（实体顺序与块顺序都反转）。
    expect(reorderedInput.wengines.map((w) => w.id)).toEqual([
      "Cannon_Rotor",
      "Big_Cylinder",
    ])
    expect(
      reorderedInput.wengines[1]!.refinementBuffs![0]!.effectBlocks![0]!.id,
    ).toBe("blk-extra-1")
    expect(
      straightInput.wengines[1]!.refinementBuffs![0]!.effectBlocks![0]!.id,
    ).toBe("blk-legacy")
    const straight = buildStraight()
    const reordered = convert(reorderedInput, pr12Supplements)
    expect(
      reordered.definitions.effects.map((e) => e.effectId).toSorted(),
    ).toEqual(straight.definitions.effects.map((e) => e.effectId).toSorted())
    expect(reordered.catalog.options.map((o) => o.optionId).toSorted()).toEqual(
      straight.catalog.options.map((o) => o.optionId).toSorted(),
    )
    // 语义逐字一致：除来源 pointer（实体/块/效果位置）外，规则与选项完全
    // 相同；追加的独立合法条款照常转换，不被守卫误拒。
    const stripPointers = (references: readonly { pointer: string }[]) =>
      references.map(({ pointer: _pointer, ...rest }) => rest)
    for (const effect of straight.definitions.effects) {
      const twin = reordered.definitions.effects.find(
        (candidate) => candidate.effectId === effect.effectId,
      )!
      expect({
        ...twin,
        source: {
          ...twin.source,
          references: stripPointers(twin.source.references),
        },
      }).toEqual({
        ...effect,
        source: {
          ...effect.source,
          references: stripPointers(effect.source.references),
        },
      })
    }
    for (const option of straight.catalog.options) {
      const twin = reordered.catalog.options.find(
        (candidate) => candidate.optionId === option.optionId,
      )!
      expect({
        ...twin,
        variants: twin.variants.map((variant) => ({
          ...variant,
          references: stripPointers(variant.references),
        })),
      }).toEqual({
        ...option,
        variants: option.variants.map((variant) => ({
          ...variant,
          references: stripPointers(variant.references),
        })),
      })
    }
    const rotorOption = reordered.catalog.options.find(
      (o) => o.optionId === "nanoka:w-engines:14001:critical-hit-bonus-damage",
    )!
    expect(rotorOption.variants[0]!.effectIds).toEqual([
      "w-engine:14001:nanoka:critical-hit-bonus-damage",
    ])
  })
})

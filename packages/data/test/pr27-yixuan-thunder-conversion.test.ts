import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import {
  SUPPLEMENTS,
  type Supplement,
} from "../scripts/static-effects/supplements.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
  SourcePack,
} from "../scripts/static-effects/source.ts"
import {
  YIXUAN_ADDITIONAL_ABILITY_NOTE,
  YIXUAN_AA_CRIT_RECORD,
  YIXUAN_AA_STAGGER_RECORD,
  YIXUAN_CORE_PASSIVE_RECORD,
  YIXUAN_MINDSCAPE1_NOTE,
  YIXUAN_MINDSCAPE1_RECORD,
  YIXUAN_MINDSCAPE2_RECORD,
  yixuanEntity,
} from "./fixtures/yixuan-thunder-source.ts"

/**
 * 增益修复批次 27（修订 46）的合成转换回归：仪玄影画 2[符法千重-破]、
 * 影画 1 落雷与额外能力[玄墨暗涌]落雷按 Nanoka 补充登记编译；三个条款
 * 位置的具名来源上下文守卫（锚块 note/name 逐字冻结、直接倍率 stat 家族
 * 拒绝）按登记执行，其他 rank 的独立条款与合法重排不误拒。真实固定来源
 * 的整体验证由生成入口完成（fac62407 的 19 文件 SHA 校验与三处锚块核
 * 对），本文件用合成数据核对守卫行为本身。块 ID、note 与机器记录取自
 * 独立真实摘录夹具（fixtures/yixuan-thunder-source.ts，逐字来自
 * fac62407 /agents/2），不从补充登记常量生成期望。
 */

const collect = (pack: SourcePack) => {
  const blocks = (pack.effectBlocks ?? []).flatMap((b) => b.effects)
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
  applyAnomalyFlagsToPack: (p) => p,
}

const yixuanSupplements = SUPPLEMENTS.filter((s) =>
  s.supplementId.startsWith("nanoka:agents:yixuan:"),
) as readonly Supplement[]
expect(yixuanSupplements).toHaveLength(3)

/** 未来同条款机器编码的合成形态：直接倍率记录（一般作用域，不限定分类）。 */
const {
  skillCategory: _coreSkillCategory,
  skillSubcategoryId: _coreSkillSubcategoryId,
  skillTargets: _coreSkillTargets,
  appliesToAnomaly: _coreAnomaly,
  ...FUTURE_ENCODING_BASE
} = YIXUAN_CORE_PASSIVE_RECORD
const FUTURE_ENCODING: SourceEffect = {
  ...FUTURE_ENCODING_BASE,
  id: "eff-future-encoding",
  scope: "general",
  stat: "directDmgMult",
  value: 12,
}

const yixuanData = (
  overrides: Parameters<typeof yixuanEntity>[0] = {},
): SourceData => {
  const yixuan = yixuanEntity(overrides)
  return {
    agents: [
      // 数组顺序不影响身份匹配：仪玄不在首位（凯撒是已映射的真实来源实体）。
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
      yixuan,
    ],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
    wengines: [],
  }
}

const convert = (data: SourceData) =>
  convertSource(data, functions, [], yixuanSupplements)

const M2_OPTION = "nanoka:agents:yixuan:m2-talisman-suppression-break-damage"
const M1_OPTION = "nanoka:agents:yixuan:m1-falling-thunder-damage"
const AA_OPTION = "nanoka:agents:yixuan:aa-falling-thunder-damage"

describe("batch 27 Yixuan thunder supplement conversion", () => {
  it("registers the three options, targets, and rules beside the preserved fixed-source clauses", () => {
    const result = convert(yixuanData())
    expect(result.definitions.revision).toBe("56")
    // 既有条款照常转换（公开 ID 与 effectId 保持，机器记录身份不变）。
    for (const [optionId, effectId, recordId] of [
      [
        "agents:yixuan:mindscape:0:blk-legacy:legacy-self-skillDmgBonus",
        "agent:1371:zzz-hp:legacy-self-skillDmgBonus:blk-legacy:mindscape:0",
        YIXUAN_CORE_PASSIVE_RECORD.id,
      ],
      [
        "agents:yixuan:mindscape:0:blk-ms31ao0d-1vjlok:eff-ms31ao0d-x9wd1s",
        "agent:1371:zzz-hp:eff-ms31ao0d-x9wd1s:blk-ms31ao0d-1vjlok:mindscape:0",
        YIXUAN_AA_STAGGER_RECORD.id,
      ],
      [
        "agents:yixuan:mindscape:0:blk-ms31ao0d-1vjlok:eff-ms31chig-cyxptm",
        "agent:1371:zzz-hp:eff-ms31chig-cyxptm:blk-ms31ao0d-1vjlok:mindscape:0",
        YIXUAN_AA_CRIT_RECORD.id,
      ],
      [
        "agents:yixuan:mindscape:1:blk-legacy:eff-ms31faa9-iulhjy",
        "agent:1371:zzz-hp:eff-ms31faa9-iulhjy:blk-legacy:mindscape:1",
        YIXUAN_MINDSCAPE1_RECORD.id,
      ],
      [
        "agents:yixuan:mindscape:2:blk-legacy:legacy-self-resPen",
        "agent:1371:zzz-hp:legacy-self-resPen:blk-legacy:mindscape:2",
        YIXUAN_MINDSCAPE2_RECORD.id,
      ],
    ] as const) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.variants[0]!.effectIds).toEqual([effectId])
      expect(
        result.definitions.effects.some((e) => e.effectId === effectId),
        optionId,
      ).toBe(true)
      expect(JSON.stringify(result)).toContain(recordId)
    }
    // 三个独立目标：符法千重-破 为 special（具名强化特殊技），两道落雷为
    // uncategorized（文本无分类分句的独立结算约定）。
    for (const [targetId, category, name] of [
      [
        "zzz-hp:skill:yixuan-talisman-suppression-break",
        "special",
        "强化特殊技：符法千重-破",
      ],
      [
        "zzz-hp:skill:yixuan-m1-falling-thunder",
        "uncategorized",
        "清灵道心·落雷",
      ],
      [
        "zzz-hp:skill:yixuan-aa-falling-thunder",
        "uncategorized",
        "玄墨暗涌·落雷",
      ],
    ] as const) {
      const target = result.catalog.skillTargets.find(
        (t) => t.targetId === targetId,
      )!
      expect(target).toMatchObject({
        upstreamId: null,
        agentEntityId: "1371",
        category,
        name,
        countsAsFollowUp: false,
      })
    }
    for (const [optionId, effectId, multiplier, configuration, requirement] of [
      [
        M2_OPTION,
        "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
        12,
        { minimumMindscape: 2 },
        {
          itemId: "yixuan:talisman-suppression-break-damage",
          stat: "sheerForce",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: "special",
        },
      ],
      [
        M1_OPTION,
        "agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1",
        0.5,
        { minimumMindscape: 1 },
        {
          itemId: "yixuan:m1-falling-thunder-damage",
          stat: "sheerForce",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: "uncategorized",
        },
      ],
      [
        AA_OPTION,
        "agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0",
        2.25,
        {},
        {
          itemId: "yixuan:aa-falling-thunder-damage",
          stat: "sheerForce",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
          requiredDirectMultiplier: 0,
          requiredSkillCategory: "uncategorized",
        },
      ],
    ] as const) {
      const option = result.catalog.options.find(
        (o) => o.optionId === optionId,
      )!
      expect(option.catalogEntityId).toBe("agents:yixuan")
      expect(option.variants).toHaveLength(1)
      const variant = option.variants[0]!
      expect(variant.status).toBe("converted")
      expect(variant.configuration).toEqual(configuration)
      expect(variant.maximumLayers).toBe(1)
      expect(variant.effectIds).toEqual([effectId])
      expect(variant.mechanism).toEqual({
        kind: "independent-settlement",
        damageItemRequirements: [requirement],
      })
      const rule = result.definitions.effects.find(
        (e) => e.effectId === effectId,
      )!
      expect(rule.parameters).toEqual({
        amount: { kind: "constant", unit: "multiplier", value: multiplier },
      })
      expect(rule.operation).toEqual({
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "add",
        itemIds: [requirement.itemId],
        value: { kind: "parameter", unit: "multiplier", name: "amount" },
      })
    }
    // M2/M1 双语天赋证据；AA 七档双语被动证据（rank 元数据由生成入口核对）。
    expect(
      result.catalog.options.find((o) => o.optionId === M2_OPTION)!.variants[0]!
        .references,
    ).toEqual([
      expect.objectContaining({
        sourceId: "nanoka-integrated",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/talent/2/desc",
      }),
      expect.objectContaining({
        sourceId: "nanoka-integrated",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/talent/2/desc",
      }),
    ])
    const aaReferences = result.catalog.options.find(
      (o) => o.optionId === AA_OPTION,
    )!.variants[0]!.references
    expect(aaReferences).toHaveLength(14)
    expect(
      new Set(aaReferences.map((r) => `${r.resourcePath} ${r.pointer}`)).size,
    ).toBe(14)
    // 额外能力队伍资格由目录 applicability 契约声明。
    expect(
      result.catalog.options.find((o) => o.optionId === AA_OPTION)!.variants[0]!
        .applicability,
    ).toEqual({ otherTeammateProfessions: ["击破", "支援", "防护"] })
  })

  it.each([
    ["mindscape 2 (talisman break)", 2],
    ["mindscape 1 (falling thunder)", 1],
    ["rank 0 (additional ability)", 0],
  ])(
    "rejects any new direct-multiplier encoding at the registered %s clause context",
    (_label, rank) => {
      // 未来同条款机器编码（直接倍率记录）以新块出现在该培养位置：拒绝生成。
      expect(() =>
        convert(
          yixuanData({
            extraRankBlocks: [
              {
                rank,
                block: {
                  id: "blk-future-encoding",
                  name: "影画",
                  note: "未来同条款机器编码",
                  effects: [FUTURE_ENCODING],
                },
              },
            ],
          }),
        ),
      ).toThrowError(/conflicts with the fixed-source record/)
    },
  )

  it.each([
    [
      "rank 2 anchor note drift",
      "rank2Block",
      {
        id: "blk-legacy",
        name: "影画2",
        note: "发动[强化特殊技：符法千重-破]，最多造成等同于1200%贯穿力的伤害。",
        enabledDefault: true,
        effects: [YIXUAN_MINDSCAPE2_RECORD],
      },
    ],
    [
      "rank 2 anchor renamed",
      "rank2Block",
      {
        id: "blk-renamed",
        name: "影画2",
        note: "",
        enabledDefault: true,
        effects: [YIXUAN_MINDSCAPE2_RECORD],
      },
    ],
    [
      "rank 1 anchor note drift",
      "rank1Block",
      {
        id: "blk-legacy",
        name: "影画1",
        note: "进入战场时，暴击率提升10%；队伍中任意角色命中敌人时追加落雷。",
        enabledDefault: true,
        effects: [YIXUAN_MINDSCAPE1_RECORD],
      },
    ],
    [
      "rank 1 anchor renamed",
      "rank1Block",
      {
        id: "blk-renamed",
        name: "影画1",
        note: YIXUAN_MINDSCAPE1_NOTE,
        enabledDefault: true,
        effects: [YIXUAN_MINDSCAPE1_RECORD],
      },
    ],
    [
      "rank 0 anchor note drift",
      "rank0AdditionalAbilityBlock",
      {
        id: "blk-ms31ao0d-1vjlok",
        name: "额外能力：玄墨暗涌",
        note: `${YIXUAN_ADDITIONAL_ABILITY_NOTE}\n仪玄被极限支援换下场时追加落雷。`,
        enabledDefault: true,
        effects: [YIXUAN_AA_STAGGER_RECORD, YIXUAN_AA_CRIT_RECORD],
      },
    ],
    [
      "rank 0 anchor renamed",
      "rank0AdditionalAbilityBlock",
      {
        id: "blk-renamed",
        name: "额外能力：玄墨暗涌",
        note: YIXUAN_ADDITIONAL_ABILITY_NOTE,
        enabledDefault: true,
        effects: [YIXUAN_AA_STAGGER_RECORD, YIXUAN_AA_CRIT_RECORD],
      },
    ],
  ])(
    "rejects anchor drift or deletion at %s before ordinary conversion",
    (_label, blockKey, mutatedBlock) => {
      expect(() =>
        convert(
          yixuanData({
            ...(blockKey === "rank2Block" ? { rank2Block: mutatedBlock } : {}),
            ...(blockKey === "rank1Block" ? { rank1Block: mutatedBlock } : {}),
            ...(blockKey === "rank0AdditionalAbilityBlock"
              ? { rank0AdditionalAbilityBlock: mutatedBlock }
              : {}),
          } as Parameters<typeof yixuanEntity>[0]),
        ),
      ).toThrowError(/anchor block|lost its anchor block/)
    },
  )

  it("keeps the guards scoped: other ranks' independent clauses do not reject", () => {
    // 影画 3—6 出现独立合法条款（含直接倍率以外的任何 stat 家族外的机器
    // 记录形态）不受三个守卫影响：本用例在影画 4 追加一条独立的合法记录。
    const result = convert(
      yixuanData({
        extraRankBlocks: [
          {
            rank: 4,
            block: {
              id: "blk-other-clause",
              name: "影画4",
              note: "其他独立条款",
              effects: [
                { ...YIXUAN_MINDSCAPE1_RECORD, id: "eff-other-clause" },
              ],
            },
          },
        ],
      }),
    )
    expect(result.definitions.revision).toBe("56")
    expect(result.catalog.options.some((o) => o.optionId === M2_OPTION)).toBe(
      true,
    )
  })

  it("rejects registration drift of the frozen Yixuan supplements", () => {
    const mutated = structuredClone(yixuanSupplements[0]!) as Supplement & {
      variant: { conditionDescription: string }
    }
    mutated.variant.conditionDescription = "drifted"
    expect(() =>
      convertSource(
        yixuanData(),
        functions,
        [],
        [...yixuanSupplements.slice(1), mutated],
      ),
    ).toThrowError(/Yixuan thunder registration drift/)
  })
})

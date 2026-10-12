import type {
  SourceBlock,
  SourceEffect,
  SourceEntity,
} from "../../scripts/static-effects/source.ts"

/**
 * 本（benbigger / agents/24）固定来源 fac62407 的独立真实摘录：影画 0
 * （额外能力：协议合同，团队暴率）与影画 4（反击增伤）的块、note 与机器
 * 记录逐字复制自 zzz-hp-calculator-buffs.json 的 /agents/24，不从补充
 * 登记常量生成，避免夹具自证；影画 2 是真实空 pack（effectBlocks/effects
 * 均为空）。登记与真实固定源的一致性由生成入口核对（19 文件 SHA 校验）。
 */

export const BEN_BIGGER_M0_NOTE =
  "队伍中存在与自身属性或阵营相同的角色时触发：\n拥有[核心被动：守卫]施加的护盾时，角色的暴击率提升16%。"

export const BEN_BIGGER_M0_RECORD: SourceEffect = {
  id: "legacy-team-critRate",
  origin: "",
  scope: "general",
  applyTarget: "team",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat: "critRate",
  value: 16,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

export const BEN_BIGGER_M4_NOTE =
  "在[特殊技]或[强化特殊技]中，通过无敌效果成功格挡攻击时 ，后继反击造成的伤害提升30%。"

export const BEN_BIGGER_M4_RECORD: SourceEffect = {
  id: "eff-ms207p9g-eg5grw",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "special",
  skillSubcategoryId: null,
  skillTargets: [{ category: "special", subcategoryId: null }],
  elementFilter: "all",
  kind: "fixed",
  stat: "skillDmgBonus",
  value: 30,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
  enabledDefault: true,
  note: "",
}

export const benBiggerM0Block = (): SourceBlock => ({
  id: "blk-legacy",
  name: "额外能力：协议合同",
  note: BEN_BIGGER_M0_NOTE,
  effects: [{ ...BEN_BIGGER_M0_RECORD }],
})

export const benBiggerM4Block = (): SourceBlock => ({
  id: "blk-ms207p9g-r0k49k",
  name: "影画4",
  note: BEN_BIGGER_M4_NOTE,
  effects: [{ ...BEN_BIGGER_M4_RECORD }],
})

/**
 * 影画 2 的真实现状是空 pack：effectBlocks 与 effects 都为空。
 * 任何新编码（无论 stat、含 note-only 块）都改变该位置的现状。
 */
export const benBiggerMindscapeBuffs = (
  overrides: {
    /** 替换影画 2 位置的 pack（默认真实空 pack）。 */
    readonly rank2Pack?: {
      effectBlocks?: SourceBlock[]
      effects?: SourceEffect[]
    }
  } = {},
): { effectBlocks?: SourceBlock[]; effects?: SourceEffect[] }[] =>
  Array.from({ length: 7 }, (_, rank) => {
    if (rank === 2)
      return overrides.rank2Pack ?? { effectBlocks: [], effects: [] }
    if (rank === 0)
      return {
        effectBlocks: [benBiggerM0Block()],
        effects: [{ ...BEN_BIGGER_M0_RECORD }],
      }
    if (rank === 4)
      return {
        effectBlocks: [benBiggerM4Block()],
        effects: [{ ...BEN_BIGGER_M4_RECORD }],
      }
    return { effectBlocks: [], effects: [] }
  })

export const benBiggerEntity = (
  overrides: Parameters<typeof benBiggerMindscapeBuffs>[0] = {},
): SourceEntity => ({
  id: "benbigger",
  name: "本",
  profession: "防护",
  element: "火",
  mindscapeBuffs: benBiggerMindscapeBuffs(overrides),
})

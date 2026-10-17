import type {
  SourceBlock,
  SourceEffect,
  SourceEntity,
} from "../../scripts/static-effects/source.ts"

/**
 * 仪玄（yixuan / agents/2）固定来源 fac62407 的独立真实摘录：核心被动
 * rank 0（术法宗师 60% 与额外能力：玄墨暗涌两块）、影画 1（入场暴击率）
 * 与影画 2（以太抗性忽视）的块、note 与机器记录逐字复制自
 * zzz-hp-calculator-buffs.json 的 /agents/2，不从补充登记常量生成，避免
 * 夹具自证。落雷与符法千重-破倍率句在固定来源无机器记录，也不出现在任何
 * note 中。登记与真实固定源的一致性由生成入口核对（19 文件 SHA 校验）。
 */

export const YIXUAN_CORE_PASSIVE_NOTE =
  "仪玄施展[普通攻击：玄墨极阵]、[普通攻击：青溟震击]、[强化特殊技]、[支援突击]、[连携技]、[终结技]造成的伤害提升60%；"

export const YIXUAN_CORE_PASSIVE_RECORD: SourceEffect = {
  id: "legacy-self-skillDmgBonus",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "basic",
  skillSubcategoryId: "yixuan-basic-ms319ks9",
  skillTargets: [
    { category: "basic", subcategoryId: "yixuan-basic-ms319ks9" },
    { category: "basic", subcategoryId: "yixuan-basic-ms319tsl" },
    { category: "special", subcategoryId: "all-special-ms0fcqv7" },
    { category: "assist", subcategoryId: null },
    { category: "chain", subcategoryId: null },
    { category: "ultimate", subcategoryId: null },
  ],
  elementFilter: "all",
  kind: "fixed",
  stat: "skillDmgBonus",
  value: 60,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
  enabledDefault: true,
  note: "",
}

export const YIXUAN_ADDITIONAL_ABILITY_NOTE =
  "队伍中存在[击破]角色或[支援]角色或[防护]角色时触发：\n[强化特殊技：凝云术]与[强化特殊技：墨烬影消]命中处于失衡状态下的敌人时，伤害提升30%；\n发动[终结技]后，仪玄进入[凝神]状态，[凝神]状态下，仪玄的暴击伤害提升40%，持续15秒。"

export const YIXUAN_AA_STAGGER_RECORD: SourceEffect = {
  id: "eff-ms31ao0d-x9wd1s",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "stagger",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "special",
  skillSubcategoryId: "yixuan-special-ms31byco",
  skillTargets: [
    { category: "special", subcategoryId: "yixuan-special-ms31byco" },
    { category: "special", subcategoryId: "yixuan-special-ms31c4nx" },
  ],
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

export const YIXUAN_AA_CRIT_RECORD: SourceEffect = {
  id: "eff-ms31chig-cyxptm",
  origin: "",
  scope: "general",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat: "critDmg",
  value: 40,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

export const YIXUAN_MINDSCAPE1_NOTE = "进入战场时，暴击率提升10%"

export const YIXUAN_MINDSCAPE1_RECORD: SourceEffect = {
  id: "eff-ms31faa9-iulhjy",
  origin: "",
  scope: "general",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat: "critRate",
  value: 10,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

/** 影画 2 的真实 note 是空串；resPen 15 是该位置唯一机器记录。 */
export const YIXUAN_MINDSCAPE2_NOTE = ""

export const YIXUAN_MINDSCAPE2_RECORD: SourceEffect = {
  id: "legacy-self-resPen",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "special",
  skillSubcategoryId: "all-special-ms0fcqv7",
  skillTargets: [
    { category: "special", subcategoryId: "all-special-ms0fcqv7" },
    { category: "ultimate", subcategoryId: null },
  ],
  elementFilter: ["以太"],
  kind: "fixed",
  stat: "resPen",
  value: 15,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

const corePassiveBlock = (): SourceBlock => ({
  id: "blk-legacy",
  name: "核心被动：术法宗师",
  note: YIXUAN_CORE_PASSIVE_NOTE,
  enabledDefault: true,
  effects: [{ ...YIXUAN_CORE_PASSIVE_RECORD }],
})

const additionalAbilityBlock = (): SourceBlock => ({
  id: "blk-ms31ao0d-1vjlok",
  name: "额外能力：玄墨暗涌",
  note: YIXUAN_ADDITIONAL_ABILITY_NOTE,
  enabledDefault: true,
  effects: [{ ...YIXUAN_AA_STAGGER_RECORD }, { ...YIXUAN_AA_CRIT_RECORD }],
})

const mindscape1Block = (): SourceBlock => ({
  id: "blk-legacy",
  name: "影画1",
  note: YIXUAN_MINDSCAPE1_NOTE,
  enabledDefault: true,
  effects: [{ ...YIXUAN_MINDSCAPE1_RECORD }],
})

const mindscape2Block = (): SourceBlock => ({
  id: "blk-legacy",
  name: "影画2",
  note: YIXUAN_MINDSCAPE2_NOTE,
  enabledDefault: true,
  effects: [{ ...YIXUAN_MINDSCAPE2_RECORD }],
})

export interface YixuanPackOverrides {
  /** 替换核心被动 rank 0 的额外能力块（默认真实摘录）。 */
  readonly rank0AdditionalAbilityBlock?: SourceBlock
  /** 替换影画 1 位置的块（默认真实摘录）。 */
  readonly rank1Block?: SourceBlock
  /** 替换影画 2 位置的块（默认真实摘录）。 */
  readonly rank2Block?: SourceBlock
  /** 在其他 rank 追加独立合法条款块（不属本补充的条款）。 */
  readonly extraRankBlocks?: readonly {
    readonly rank: number
    readonly block: SourceBlock
  }[]
}

export const yixuanMindscapeBuffs = (
  overrides: YixuanPackOverrides = {},
): { effectBlocks?: SourceBlock[]; effects?: SourceEffect[] }[] =>
  Array.from({ length: 7 }, (_, rank) => {
    const extra = (overrides.extraRankBlocks ?? []).filter(
      (entry) => entry.rank === rank,
    )
    const blocks =
      rank === 0
        ? [
            corePassiveBlock(),
            overrides.rank0AdditionalAbilityBlock ?? additionalAbilityBlock(),
          ]
        : rank === 1
          ? [overrides.rank1Block ?? mindscape1Block()]
          : rank === 2
            ? [overrides.rank2Block ?? mindscape2Block()]
            : []
    const withExtra =
      extra.length === 0 ? blocks : [...blocks, ...extra.map((e) => e.block)]
    const effects = withExtra.flatMap((block) =>
      block.effects.map((effect) => ({ ...effect })),
    )
    return { effectBlocks: withExtra, effects }
  })

export const yixuanEntity = (
  overrides: YixuanPackOverrides = {},
): SourceEntity => ({
  id: "yixuan",
  name: "仪玄",
  profession: "命破",
  element: "以太",
  mindscapeBuffs: yixuanMindscapeBuffs(overrides),
})

import type {
  SourceBlock,
  SourceEffect,
  SourceEntity,
} from "../../scripts/static-effects/source.ts"

/**
 * 星见雅（miyabi / agents/22）固定来源 fac62407 的独立真实摘录：影画 0
 * （终结技：名残雪 + 额外能力：同沐霜雪）的块、note 与机器记录逐字复制自
 * zzz-hp-calculator-buffs.json 的 /agents/22，影画 4 是真实空 pack
 * （effectBlocks/effects 均为空），不从补充登记常量生成，避免夹具自证；
 * 登记与真实固定源的一致性由生成入口核对（19 文件 SHA 校验）。影画 1/2/6
 * 的独立条款块按真实 note 摘录，供“其他 rank 不误拒”与重排正控使用。
 */

export const MIYABI_ULTIMATE_NOTE =
  "招式发动时，获得3点[落霜]，自身造成的冰属性伤害提升30%，持续12秒；"

/** 影画 0 终结技记录编译后的稳定 effectId（批次 14 元素修正对象一）。 */
export const MIYABI_ULTIMATE_EFFECT_ID =
  "agent:1091:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0"
/** 额外能力霜月 30% 冰抗忽视记录编译后的稳定 effectId（修正对象二）。 */
export const MIYABI_RES_PEN_EFFECT_ID =
  "agent:1091:zzz-hp:eff-ms4mu14z-vj4c3r:blk-ms4msho4-fuuot6:mindscape:0"

export const MIYABI_ULTIMATE_RECORD: SourceEffect = {
  id: "legacy-self-dmgBonus",
  origin: "",
  scope: "general",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: ["冰"],
  kind: "fixed",
  stat: "dmgBonus",
  value: 30,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

export const MIYABI_ADDITIONAL_ABILITY_NOTE =
  "队伍中存在[支援]角色或与自身阵营相同的角色或其他[异常]角色时触发：\n[普通攻击：霜月]造成的伤害提升60%；队伍中任意角色触发[紊乱]效果时，星见雅获得2点[落霜]，且在下一次[霜月架势]期间，[普通攻击：霜月]将无视目标30%冰属性伤害抗性。"

export const MIYABI_SHIMOTSUKI_DMG_BONUS_RECORD: SourceEffect = {
  id: "eff-ms4msho4-rjt6sj",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "basic",
  skillSubcategoryId: "miyabi-basic-ms4mtpk5",
  skillTargets: [{ category: "basic", subcategoryId: "miyabi-basic-ms4mtpk5" }],
  elementFilter: "all",
  kind: "fixed",
  stat: "skillDmgBonus",
  value: 60,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

export const MIYABI_SHIMOTSUKI_RES_PEN_RECORD: SourceEffect = {
  id: "eff-ms4mu14z-vj4c3r",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "basic",
  skillSubcategoryId: "miyabi-basic-ms4mtpk5",
  skillTargets: [{ category: "basic", subcategoryId: "miyabi-basic-ms4mtpk5" }],
  elementFilter: ["冰"],
  kind: "fixed",
  stat: "resPen",
  value: 30,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

export const MIYABI_M1_NOTE =
  "在[霜月架势]期间，每消耗1点[落霜]，[普通攻击：霜月]将无视目标6%防御力，最多叠加6层，退出[霜月架势]后增益效果结束；"

export const MIYABI_M1_RECORD: SourceEffect = {
  id: "legacy-self-reduceDefense",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "basic",
  skillSubcategoryId: "miyabi-basic-ms4mtpk5",
  skillTargets: [{ category: "basic", subcategoryId: "miyabi-basic-ms4mtpk5" }],
  elementFilter: "all",
  kind: "stacked",
  stat: "reduceDefense",
  value: 0,
  stackable: false,
  maxStacks: 6,
  valuePerStack: 6,
  defaultStacks: 6,
  enabledDefault: true,
  note: "",
}

export const MIYABI_M6_NOTE =
  "在[霜月架势]期间，星见雅将获得[极意]效果，使[普通攻击：霜月]造成的伤害提升30%"

export const MIYABI_M6_RECORD: SourceEffect = {
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
  skillSubcategoryId: "miyabi-basic-ms4mtpk5",
  skillTargets: [{ category: "basic", subcategoryId: "miyabi-basic-ms4mtpk5" }],
  elementFilter: "all",
  kind: "fixed",
  stat: "skillDmgBonus",
  value: 30,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
}

export const miyabiUltimateBlock = (): SourceBlock => ({
  id: "blk-legacy",
  name: "终结技：名残雪",
  note: MIYABI_ULTIMATE_NOTE,
  effects: [{ ...MIYABI_ULTIMATE_RECORD }],
})

export const miyabiAdditionalAbilityBlock = (): SourceBlock => ({
  id: "blk-ms4msho4-fuuot6",
  name: "额外能力：同沐霜雪",
  note: MIYABI_ADDITIONAL_ABILITY_NOTE,
  effects: [
    { ...MIYABI_SHIMOTSUKI_DMG_BONUS_RECORD },
    { ...MIYABI_SHIMOTSUKI_RES_PEN_RECORD },
  ],
})

export const miyabiM1Block = (): SourceBlock => ({
  id: "blk-legacy",
  name: "影画1",
  note: MIYABI_M1_NOTE,
  effects: [{ ...MIYABI_M1_RECORD }],
})

export const miyabiM6Block = (): SourceBlock => ({
  id: "blk-legacy",
  name: "影画6",
  note: MIYABI_M6_NOTE,
  effects: [{ ...MIYABI_M6_RECORD }],
})

/**
 * 影画 0—6 的真实 pack 现状：默认只带 rank 0 的两个真实块与 rank 4 的真实
 * 空 pack，其余 rank 默认为空；rank 1/2/6 等其他 rank 的独立条款块一律由
 * overrides.extraBlocks 按需注入（夹具导出 miyabiM1Block()/miyabiM6Block()
 * 等真实摘录块供注入）。
 */
export const miyabiMindscapeBuffs = (
  overrides: {
    /** 替换影画 0 位置的 pack（默认两个真实块）。 */
    readonly rank0Pack?: {
      effectBlocks?: SourceBlock[]
      effects?: SourceEffect[]
    }
    /** 替换影画 4 位置的 pack（默认真实空 pack）。 */
    readonly rank4Pack?: {
      effectBlocks?: SourceBlock[]
      effects?: SourceEffect[]
    }
    /** 额外携带的独立条款块（不属本批条款的其他 rank 记录）。 */
    readonly extraBlocks?: readonly {
      readonly rank: number
      readonly block: SourceBlock
    }[]
  } = {},
): { effectBlocks?: SourceBlock[]; effects?: SourceEffect[] }[] =>
  Array.from({ length: 7 }, (_, rank) => {
    if (rank === 0)
      return (
        overrides.rank0Pack ?? {
          effectBlocks: [miyabiUltimateBlock(), miyabiAdditionalAbilityBlock()],
          effects: [
            { ...MIYABI_ULTIMATE_RECORD },
            { ...MIYABI_SHIMOTSUKI_DMG_BONUS_RECORD },
            { ...MIYABI_SHIMOTSUKI_RES_PEN_RECORD },
          ],
        }
      )
    if (rank === 4)
      return overrides.rank4Pack ?? { effectBlocks: [], effects: [] }
    const extra = (overrides.extraBlocks ?? []).filter(
      (entry) => entry.rank === rank,
    )
    if (!extra.length) return { effectBlocks: [], effects: [] }
    return {
      effectBlocks: extra.map((entry) => entry.block),
      effects: extra.flatMap((entry) =>
        entry.block.effects.map((e) => ({ ...e })),
      ),
    }
  })

export const miyabiEntity = (
  overrides: Parameters<typeof miyabiMindscapeBuffs>[0] = {},
): SourceEntity => ({
  id: "miyabi",
  name: "星见雅",
  profession: "异常",
  element: "冰",
  mindscapeBuffs: miyabiMindscapeBuffs(overrides),
})

/**
 * 本批重排比较的共享投影（测试与仓库外辨别力探针共用同一实现）：保留全部
 * 来源语义——references 的 sourceId/version/locale/resourcePath 与成员、
 * Nanoka 的稳定语义 pointer、source.identity/section 与全部实体元数据；
 * 只剔除随 ZZZ-HP 数组重排改变的位置型 pointer（sourceId 为 zzz-hp 的
 * 引用指向固定提交 JSON 内的数组下标路径，块/记录重排后必然变化）。
 * 不丢弃整个 references、source 或实体字段；需要稳定顺序时由调用方按完整
 * ID 排序后比较。
 */
export const reorderComparable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reorderComparable)
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(record)
        .filter(
          ([key]) => !(key === "pointer" && record["sourceId"] === "zzz-hp"),
        )
        .map(([key, entry]) => [key, reorderComparable(entry)]),
    )
  }
  return value
}

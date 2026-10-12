import type {
  SourceBlock,
  SourceEffect,
  SourceEntity,
} from "../../scripts/static-effects/source.ts"

/**
 * fac62407 固定来源两音擎精炼五档的独立冻结夹具：比格气缸
 * `/wengines/54/refinementBuffs/{0..4}/effectBlocks/0`（note-only、effects
 * 为空）与加农转子 `/wengines/20/refinementBuffs/{0..4}/effectBlocks/0`
 * （note + 常驻 inCombatAtkPercent 记录）。字面值逐字取自该提交的真实
 * 来源文件（与 source-manifest 登记摘要一致），不依赖补充登记常量自证；
 * 转换守卫的登记正确性由生成入口对真实固定源的核对保证。
 */

/** 比格气缸五档精炼块（块 ID 与冻结完整 note 原文）。 */
export function bigCylinderRefinementBlocks(): (SourceBlock & {
  note: string
})[] {
  return [
    {
      id: "blk-ms1q9sxu-g88pag",
      name: "精1",
      note: "受到的伤害降低7.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者600%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
      effects: [],
    },
    {
      id: "blk-ms1qa2rg-yt84b0",
      name: "精2",
      note: "受到的伤害降低8.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者690%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
      effects: [],
    },
    {
      id: "blk-ms1qaa60-bhvo32",
      name: "精3",
      note: "受到的伤害降低9.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者780%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
      effects: [],
    },
    {
      id: "blk-ms1qafjw-h0do1p",
      name: "精4",
      note: "受到的伤害降低10.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者870%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
      effects: [],
    },
    {
      id: "blk-ms1qal4m-scu6gi",
      name: "精5",
      note: "受到的伤害降低12%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者960%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
      effects: [],
    },
  ]
}

/** 加农转子五档精炼块的冻结完整 note 原文。 */
export const cannonRotorRefinementNotes: readonly [
  string,
  string,
  string,
  string,
  string,
] = [
  "攻击力提升7.5%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，8秒内最多触发一次。",
  "攻击力提升8.6%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，7.5秒内最多触发一次。",
  "攻击力提升9.7%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，7秒内最多触发一次。",
  "攻击力提升10.8%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，6.5秒内最多触发一次。",
  "攻击力提升12%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，6秒内最多触发一次。",
]

/** 加农转子某档常驻 ATK 记录的冻结 raw 形状（20 字段与来源一致）。 */
export function cannonRotorAtkRecord(value: number): SourceEffect {
  return {
    id: "legacy-self-inCombatAtkPercent",
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
    stat: "inCombatAtkPercent",
    value,
    stackable: false,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    enabledDefault: true,
    note: "",
  }
}

/** 加农转子五档常驻记录的冻结逐档数值。 */
export const CANNON_ROTOR_TIER_VALUES: readonly [
  number,
  number,
  number,
  number,
  number,
] = [7.5, 8.6, 9.7, 10.8, 12]

/** 两音擎的固定来源实体骨架（note/记录形状取本夹具冻结字面值）。 */
export function wengineAdditionalDamageEntities(
  overrides: {
    /** 每档追加的独立合法块（如守卫重排正控用的第二块）。 */
    readonly bigCylinderExtraBlock?: (tier: number) => SourceBlock
    readonly cannonRotorExtraBlock?: (tier: number) => SourceBlock
    /** 锚块内追加的独立合法记录（重排正控用的第二 effect）。 */
    readonly cannonRotorExtraEffect?: (tier: number) => SourceEffect
  } = {},
): readonly SourceEntity[] {
  const cylinderBlocks = bigCylinderRefinementBlocks()
  return [
    {
      id: "Big_Cylinder",
      name: "比格气缸",
      profession: "防护",
      fixedBuffs: { effectBlocks: [], effects: [] },
      refinementBuffs: cylinderBlocks.map((block, index) => ({
        effectBlocks: [
          block,
          ...(overrides.bigCylinderExtraBlock
            ? [overrides.bigCylinderExtraBlock(index + 1)]
            : []),
        ],
        effects: [],
      })),
    },
    {
      id: "Cannon_Rotor",
      name: "加农转子",
      profession: "强攻",
      fixedBuffs: { effectBlocks: [], effects: [] },
      refinementBuffs: cannonRotorRefinementNotes.map((note, index) => ({
        effectBlocks: [
          {
            id: "blk-legacy",
            name: `精${String(index + 1)}`,
            note,
            effects: [
              cannonRotorAtkRecord(CANNON_ROTOR_TIER_VALUES[index]!),
              ...(overrides.cannonRotorExtraEffect
                ? [overrides.cannonRotorExtraEffect(index + 1)]
                : []),
            ],
          },
          ...(overrides.cannonRotorExtraBlock
            ? [overrides.cannonRotorExtraBlock(index + 1)]
            : []),
        ],
        effects: [],
      })),
    },
  ]
}

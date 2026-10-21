import type {
  SourceBlock,
  SourceData,
  SourceEffect,
  SourceEntity,
  SourcePack,
} from "../../scripts/static-effects/source.ts"

/**
 * ZZZ-HP 2628b32 的最小 3.2.5 形状夹具：只含因固定源 fac62407 缺失而由
 * Nanoka 补充实体承载的四个实体（洛克茜、绯月银棺、旋钻机-赤轴、
 * 「恒等式」-变格）及其真实机器记录。记录字面值逐项取自该提交的
 * `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json`；3.2.5 记录
 * 省略 `scope`，夹具保持同一形状，不补出 fac62407 才有的显式字段。
 */

const emptyPack = (): SourcePack => ({
  effectBlocks: [],
  effects: [],
  selfMods: {},
  teamMods: {},
})

const effect = (
  overrides: Pick<SourceEffect, "id"> & Partial<SourceEffect>,
): SourceEffect => ({
  origin: "",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  kind: "fixed",
  stat: "dmgBonus",
  value: 0,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
  ...overrides,
})

const block = (
  id: string,
  name: string,
  note: string,
  effects: readonly SourceEffect[],
): SourceBlock => ({ id, name, note, effects: [...effects] })

const roxyEntity = (): SourceEntity => ({
  id: "Roxy",
  name: "洛克茜",
  profession: "击破",
  element: "风",
  mindscapeNotes: ["", "", "", "", "", "", ""],
  mindscapeBuffs: [
    {
      effectBlocks: [
        block(
          "blk-mupowqtz-vpdi3u",
          "核心被动：热夜初拥",
          "洛克茜的初始能量自动回复大于1.2时，超过部分每超过0.01，攻击力提升5点，最多提升960点，冲击力提升0.4点，最多提升76.8点；\n队伍中任意队友触发[浸染]或[净化]效果时，洛克茜将根据[浸染]或[净化]的属性为全队角色提供增益效果：洛克茜每拥有1%暴击率，非[锋御]角色造成对应属性以及风属性伤害时，暴击伤害提升0.4%，最多提升40%；[锋御]角色造成对应属性以及风属性伤害时，锐暴伤害提升0.2%，最多提升20%；每个属性增益效果分别持续50秒，重复触发时刷新持续时间；",
          [
            effect({
              id: "eff-mupowqtz-c3lwdq",
              kind: "convert",
              stat: "atk",
              convert: {
                from: "energyRegen",
                panelSource: "external",
                ratioPercent: 500,
                cap: 960,
                defaultBase: null,
                initialBase: 120,
              },
            }),
            effect({
              id: "eff-mupozzur-l99yxv",
              applyTarget: "team",
              kind: "convert",
              stat: "critDmg",
              convert: {
                from: "critRate",
                panelSource: "external",
                ratioPercent: 40,
                cap: 40,
                defaultBase: null,
                initialBase: 0,
              },
            }),
            effect({
              id: "eff-muppa3a3-cb9a32",
              applyTarget: "team",
              applyProfession: "锋御",
              kind: "convert",
              stat: "sharpenCritDmgBonus",
              convert: {
                from: "critRate",
                panelSource: "external",
                ratioPercent: 20,
                cap: 20,
                defaultBase: null,
                initialBase: 0,
              },
            }),
          ],
        ),
        block(
          "blk-muppaptc-wl5q5a",
          "额外能力：辉金心脏",
          "队伍中存在[强攻]角色或[命破]角色或[锋御]角色时触发：\n洛克茜造成的伤害提升8%，该效果随角色等级提升，每级增加1.2%，最多提升80%；\n队伍中角色攻击命中敌人时，使其失衡易伤倍率提升30%，敌人进入失衡状态时，使其失衡时间延长2秒，失衡持续时间提升效果与同类效果不可叠加，失衡结束时移除该效果；\n敌人处于队伍中角色造成的[风化]状态下时，敌人受到的风属性直接攻击伤害和触发[浸染]属性的直接攻击伤害额外提升8%；",
          [
            effect({
              id: "eff-muppaptc-fn832t",
              stat: "dmgBonus",
              value: 8,
            }),
            effect({
              id: "eff-muppd7di-hf2fx8",
              kind: "convert",
              stat: "dmgBonus",
              convert: {
                from: "level",
                panelSource: "external",
                ratioPercent: 120,
                cap: 72,
                defaultBase: null,
                initialBase: 0,
              },
            }),
            effect({
              id: "eff-muppdqhh-3qsii7",
              applyTarget: "team",
              stat: "staggerVulnerable",
              value: 30,
            }),
            effect({
              id: "eff-muppe3ty-86s1uf",
              applyTarget: "team",
              stat: "special",
              value: 18,
            }),
          ],
        ),
      ],
      effects: [],
      selfMods: {},
      teamMods: {},
    },
    {
      effectBlocks: [
        block(
          "blk-muppfe6g-rax9gx",
          "影画1",
          "[强化特殊技：敬请安息]命中时，使敌方全属性伤害抗性降低15%，持续50秒，重复触发时刷新持续时间；自身暴击伤害提升40%。",
          [
            effect({
              id: "eff-muppfe6g-956sbb",
              applyTarget: "team",
              stat: "resPen",
              value: 15,
            }),
            effect({
              id: "eff-muppfukt-ck2j4e",
              stat: "critDmg",
              value: 40,
            }),
          ],
        ),
      ],
      effects: [],
      selfMods: {},
      teamMods: {},
    },
    {
      effectBlocks: [
        block(
          "blk-muppg5bs-g0tx3p",
          "影画2",
          "[强化特殊技：小心风寒]命中敌人时，使敌人失衡易伤倍率提升30%，持续到目标从失衡状态恢复。",
          [
            effect({
              id: "eff-muppg5bs-4w8a0e",
              applyTarget: "team",
              stat: "staggerVulnerable",
              value: 30,
            }),
          ],
        ),
      ],
      effects: [],
      selfMods: {},
      teamMods: {},
    },
    emptyPack(),
    {
      effectBlocks: [
        block(
          "blk-muppgwvr-qe48si",
          "影画4",
          "发动[招架支援]成功招架敌人攻击时，洛克茜回复1点能量，招式内至多回复1次；[闪避反击：礼尚往来]命中敌人时，回复2点能量，招式内至多回复1次；\n[终结技：葬夜安魂曲]造成的伤害提升20%，失衡值提升10%。",
          [
            effect({
              id: "eff-muppgwvr-e7am7i",
              stat: "skillDmgBonus",
              value: 20,
              skillCategory: "ultimate",
              skillTargets: [{ category: "ultimate", subcategoryId: null }],
            }),
          ],
        ),
      ],
      effects: [],
      selfMods: {},
      teamMods: {},
    },
    emptyPack(),
    {
      effectBlocks: [
        block(
          "blk-muppihiv-sh14rz",
          "影画6",
          "自身攻击造成的伤害无视目标15%风属性伤害抗性；[特殊技：恕不远送]引爆[风眼]生成巨型风旋时，主目标会被赋予[余响]效果，每间隔3秒在目标位置生成一次巨型风旋，共额外生成2次巨型风旋，重复触发时额外生成次数叠加且刷新[余响]的持续时间；巨型风旋造成的伤害倍率提升至原本的250%，造成的失衡提升20%。",
          [
            effect({
              id: "eff-muppihiv-mxxqb8",
              stat: "resPen",
              value: 15,
              elementFilter: ["风"],
            }),
          ],
        ),
      ],
      effects: [],
      selfMods: {},
      teamMods: {},
    },
  ],
})

const crimsonRefinementNotes = [
  "装备者暴击率提升24%；造成的伤害无视目标15%风属性伤害抗性；装备者发动[强化特殊技]造成风属性伤害时，造成的失衡值提升16%，全队其他角色造成的伤害提升20%，持续50秒，重复触发时刷新持续时间，伤害提升效果全队唯一。",
  "装备者暴击率提升26%；造成的伤害无视目标17.3%风属性伤害抗性；装备者发动[强化特殊技]造成风属性伤害时，造成的失衡值提升18.4%，全队其他角色造成的伤害提升23%，持续50秒，重复触发时刷新持续时间，伤害提升效果全队唯一。",
  "装备者暴击率提升28%；造成的伤害无视目标19.5%风属性伤害抗性；装备者发动[强化特殊技]造成风属性伤害时，造成的失衡值提升20.8%，全队其他角色造成的伤害提升26%，持续50秒，重复触发时刷新持续时间，伤害提升效果全队唯一。",
  "装备者暴击率提升30%；造成的伤害无视目标21.8%风属性伤害抗性；装备者发动[强化特殊技]造成风属性伤害时，造成的失衡值提升23.2%，全队其他角色造成的伤害提升29%，持续50秒，重复触发时刷新持续时间，伤害提升效果全队唯一。",
  "装备者暴击率提升32%；造成的伤害无视目标24%风属性伤害抗性；装备者发动[强化特殊技]造成风属性伤害时，造成的失衡值提升25.6%，全队其他角色造成的伤害提升32%，持续50秒，重复触发时刷新持续时间，伤害提升效果全队唯一。",
] as const
const crimsonCritRate = [24, 26, 28, 30, 32] as const
const crimsonResPen = [15, 17.3, 19.5, 21.8, 24] as const
const crimsonTeamDamageBonus = [20, 23, 26, 29, 32] as const
const crimsonSelfPenaltyEffectIds = [
  "eff-mv3gyasf-xhg50h",
  "eff-mv3gynto-znf5ed",
  "eff-mv3gz08q-54eubp",
  "eff-mv3gz8ua-3gr7fu",
  "eff-mv3gzfmo-vn2h6t",
] as const

const crimsonMoonCasketEntity = (): SourceEntity => ({
  id: "Crimson_Moon_Casket",
  name: "绯月银棺",
  profession: "击破",
  fixedBuffs: emptyPack(),
  refinementBuffs: crimsonRefinementNotes.map((note, index) => ({
    effectBlocks: [
      block("blk-muppptil-ym0iis", `精${String(index + 1)}`, note, [
        effect({
          id: "eff-muppptil-nbivsf",
          stat: "critRate",
          value: crimsonCritRate[index]!,
        }),
        effect({
          id: "eff-muppq45z-3q1p3g",
          stat: "resPen",
          value: crimsonResPen[index]!,
          elementFilter: ["风"],
        }),
        effect({
          id: "eff-muppqbyi-yhg7mq",
          applyTarget: "team",
          stat: "dmgBonus",
          value: crimsonTeamDamageBonus[index]!,
        }),
        effect({
          id: crimsonSelfPenaltyEffectIds[index]!,
          stat: "dmgBonus",
          value: -crimsonTeamDamageBonus[index]!,
        }),
      ]),
    ],
    effects: [],
    selfMods: {},
    teamMods: {},
  })),
})

const redAxisNotes = [
  "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升50%，持续10秒，15秒内最多触发一次。",
  "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升57.5%，持续10秒，15秒内最多触发一次。",
  "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升65%，持续10秒，15秒内最多触发一次。",
  "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升72.5%，持续10秒，15秒内最多触发一次。",
  "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升80%，持续10秒，15秒内最多触发一次。",
] as const
const redAxisDamageBonus = [50, 57.5, 65, 72.5, 80] as const

const drillRigRedAxisEntity = (): SourceEntity => ({
  id: "Drill_Rig_Red-Axis",
  name: "旋钻机-赤轴",
  profession: "强攻",
  fixedBuffs: emptyPack(),
  refinementBuffs: redAxisNotes.map((note, index) => ({
    effectBlocks: [
      block("blk-mv3hz56a-noc5nc", `精${String(index + 1)}`, note, [
        effect({
          id: "eff-mv3hz56a-anai9l",
          stat: "skillDmgBonus",
          value: redAxisDamageBonus[index]!,
          skillCategory: "basic",
          skillTargets: [
            { category: "basic", subcategoryId: null },
            { category: "dodge", subcategoryId: "all-dodge-ms0dnpmr" },
          ],
          elementFilter: ["电"],
        }),
      ]),
    ],
    effects: [],
    selfMods: {},
    teamMods: {},
  })),
})

const identityInflectionNotes = [
  "受到敌方攻击时，攻击者造成的伤害降低6%，持续12秒。",
  "受到敌方攻击时，攻击者造成的伤害降低7%，持续12秒。",
  "受到敌方攻击时，攻击者造成的伤害降低8%，持续12秒。",
  "受到敌方攻击时，攻击者造成的伤害降低9%，持续12秒。",
  "受到敌方攻击时，攻击者造成的伤害降低10%，持续12秒。",
] as const
const identityInflectionBlockIds = [
  "blk-ms1qmmme-21tzx2",
  "blk-ms1qmqnw-qdggr9",
  "blk-ms1qmvhw-c2j5hh",
  "blk-ms1qmzvd-ix6n57",
  "blk-ms1qn50y-caf3r7",
] as const

const identityInflectionEntity = (): SourceEntity => ({
  id: "Identity_Inflection",
  name: "「恒等式」-变格",
  profession: "防护",
  fixedBuffs: emptyPack(),
  refinementBuffs: identityInflectionNotes.map((note, index) => ({
    effectBlocks: [
      block(
        identityInflectionBlockIds[index]!,
        `精${String(index + 1)}`,
        note,
        [],
      ),
    ],
    effects: [],
    selfMods: {},
    teamMods: {},
  })),
})

export function fixedSource325Data(): SourceData {
  return {
    agents: [roxyEntity()],
    wengines: [
      crimsonMoonCasketEntity(),
      drillRigRedAxisEntity(),
      identityInflectionEntity(),
    ],
    driveDiscs: [],
    skillSubcategories: [],
    followUpSkillRules: [],
  }
}

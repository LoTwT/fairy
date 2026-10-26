import type { AuthoringOption } from "./types.ts"

export const ANBY_M2_OPTION = {
  optionId: "agents:anby:mindscape:2:blk-ms47xm3l-3pumvj:eff-ms47xm3l-nf7ga7",
  catalogEntityId: "agents:anby",
  name: "2 影 · skillDmgBonus",
  conditionDescription:
    "原文：[普通攻击：落雷]命中处于失衡状态下的敌人时，招式造成的伤害提升30%；[强化特殊技]命中未处于失衡状态下的敌人时，招式造成的失衡值提升10%。\n[关键字] 属性=招式增伤 元素=无 动作=提升 数值=30 单位=% 目标=全队 条件=无法提取 作用域=招式 层数=无 时长=无 对象=无\n作用域：招式",
  target: "self",
  variants: [
    {
      configuration: {
        minimumMindscape: 2,
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/16/mindscapeBuffs/2/effectBlocks/0/effects/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1011/details.zh.json",
          pointer: "/talent/2/desc",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "en",
          resourcePath: "agents/1011/details.en.json",
          pointer: "/talent/2/desc",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["anby-m2-damage-bonus"],
    },
  ],
} satisfies AuthoringOption

export const QINGMING_CRIT_RATE_OPTION = {
  optionId:
    "w-engines:Qingming_Birdcage:refinement:blk-legacy:legacy-self-critRate",
  catalogEntityId: "w-engines:Qingming_Birdcage",
  name: "精1 · critRate",
  conditionDescription:
    "暴击率提升20%；装备者释放[强化特殊技]时角色获得1层[青溟同行]效果，最多叠加2层，持续15秒，进入接战状态时直接获得2层，重复触发时刷新持续时间；每层[青溟同行]效果使装备者造成的以太伤害提升8%，[终结技]或[强化特殊技]造成的以太贯穿伤害提升10%。",
  target: "self",
  variants: [
    {
      configuration: {
        refinements: [1],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/wengines/100/refinementBuffs/0/effectBlocks/0/effects/0",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["qingming-crit-rate"],
    },
    {
      configuration: {
        refinements: [2],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/wengines/100/refinementBuffs/1/effectBlocks/0/effects/0",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["qingming-crit-rate"],
    },
    {
      configuration: {
        refinements: [3],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/wengines/100/refinementBuffs/2/effectBlocks/0/effects/0",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["qingming-crit-rate"],
    },
    {
      configuration: {
        refinements: [4],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/wengines/100/refinementBuffs/3/effectBlocks/0/effects/0",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["qingming-crit-rate"],
    },
    {
      configuration: {
        refinements: [5],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/wengines/100/refinementBuffs/4/effectBlocks/0/effects/0",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["qingming-crit-rate"],
    },
  ],
} satisfies AuthoringOption

export const MIYABI_TERMINAL_OPTION = {
  optionId: "agents:miyabi:mindscape:0:blk-legacy:legacy-self-dmgBonus",
  catalogEntityId: "agents:miyabi",
  name: "终结技：名残雪 · dmgBonus",
  conditionDescription:
    "招式发动时，获得3点[落霜]，自身造成的冰属性伤害提升30%，持续12秒；",
  target: "self",
  variants: [
    {
      configuration: {
        minimumMindscape: 0,
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/specialElementType/desc",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "en",
          resourcePath: "agents/1091/details.en.json",
          pointer: "/specialElementType/desc",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["miyabi-terminal-damage"],
    },
  ],
} satisfies AuthoringOption

export const MIYABI_BASIC_OPTION = {
  optionId: "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4mu14z-vj4c3r",
  catalogEntityId: "agents:miyabi",
  name: "额外能力：同沐霜雪 · resPen",
  conditionDescription:
    "队伍中存在[支援]角色或与自身阵营相同的角色或其他[异常]角色时触发：\n[普通攻击：霜月]造成的伤害提升60%；队伍中任意角色触发[紊乱]效果时，星见雅获得2点[落霜]，且在下一次[霜月架势]期间，[普通攻击：霜月]将无视目标30%冰属性伤害抗性。",
  target: "self",
  variants: [
    {
      configuration: {
        minimumMindscape: 0,
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091501/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091502/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091503/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091504/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091505/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091506/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091507/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/specialElementType/desc",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "en",
          resourcePath: "agents/1091/details.en.json",
          pointer: "/specialElementType/desc",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["miyabi-basic-resistance-ignore"],
    },
  ],
} satisfies AuthoringOption

export const REMIEL_COMPLETE_OPTION = {
  optionId:
    "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage",
  catalogEntityId: "agents:remiel",
  name: "相变时流 · 其他角色属性异常伤害",
  conditionDescription:
    "蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
  target: "team",
  variants: [
    {
      configuration: {
        minimumMindscape: 1,
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/1",
        },
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/2",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: [
        "remiel-m1-team-anomaly-damage",
        "remiel-m1-holder-anomaly-damage",
      ],
    },
  ],
} satisfies AuthoringOption

export const REMIEL_OLD_TEAM_OPTION = {
  optionId: "agents:remiel:mindscape:1:blk-legacy:eff-ms7tjecu-l3ocgm",
  catalogEntityId: "agents:remiel",
  name: "影画1 · anomalyDmgBonus",
  conditionDescription:
    "进入战场时，蕾米埃尔获得3个特殊[虚曜]，在勘域模式中此效果180秒内最多触发一次；蕾米埃尔触发[耀变]效果造成伤害时，无视目标50%的全属性伤害抗性；\n蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
  target: "team",
  variants: [
    {
      configuration: {
        minimumMindscape: 1,
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/1",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: [],
    },
  ],
} satisfies AuthoringOption

export const REMIEL_OLD_HOLDER_OPTION = {
  optionId: "agents:remiel:mindscape:1:blk-legacy:eff-ms7tjyzo-3v31wa",
  catalogEntityId: "agents:remiel",
  name: "影画1 · anomalyDmgBonus",
  conditionDescription:
    "进入战场时，蕾米埃尔获得3个特殊[虚曜]，在勘域模式中此效果180秒内最多触发一次；蕾米埃尔触发[耀变]效果造成伤害时，无视目标50%的全属性伤害抗性；\n蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
  target: "self",
  variants: [
    {
      configuration: {
        minimumMindscape: 1,
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/2",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: [],
    },
  ],
} satisfies AuthoringOption

export const LIGHTER_OLD_OPTION = {
  optionId:
    "agents:lighter:mindscape:0:blk-ms4aoho0-grnxav:eff-ms4aoho0-q3wbdv",
  catalogEntityId: "agents:lighter",
  name: "额外能力：斗志昂扬 · dmgBonus",
  conditionDescription:
    "队伍中存在[强攻]角色或与自身阵营相同的角色时触发：\n[士气喷发]状态下，莱特第五段[普通攻击]命中敌人时，全队角色获得一层[昂扬]，最多叠加20层，持续30秒，重复触发时刷新持续时间；\n每拥有一层[昂扬]，代理人造成的冰属性伤害和火属性伤害提升1.25%，获得[昂扬]时，若莱特的冲击力高于170点，每超过10点冲击力会使每层[昂扬]提供的增益效果额外提升0.25%；队伍中任意角色发动[连携技]时，会刷新全队角色[昂扬]的持续时间；\n[昂扬]最多使代理人造成的冰属性伤害和火属性伤害提升75%。",
  target: "team",
  variants: [
    {
      configuration: {
        minimumMindscape: 0,
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/51/mindscapeBuffs/0/effectBlocks/1/effects/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161501/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161502/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161503/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161504/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161505/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161506/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161507/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161501/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161502/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161503/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161504/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161505/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161506/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1161/details.zh.json",
          pointer: "/passive/level/1161507/desc/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/specialElementType/desc",
        },
      ],
      maximumLayers: 1,
      inputs: [
        {
          name: "agent:1161:zzz-hp:eff-ms4atnfh-29yr0r:blk-ms4aoho0-grnxav:mindscape:0:source",
          unit: "impact-points",
          description:
            "莱特获得[昂扬]时的冲击力（显式快照读数，手工输入）；与同一状态的其余部分共用同一读数，不使用预设或当前面板",
        },
      ],
      applicability: {
        beneficiaryElements: ["ice", "fire"],
      },
      effectKeys: [],
    },
  ],
} satisfies AuthoringOption

export const NEKOMATA_CLAW_OPTION = {
  optionId: "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz",
  catalogEntityId: "agents:nekomata",
  name: "核心被动：猫步诡影 · directDmgMult",
  conditionDescription:
    "猫又[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升60%，持续40秒，重复触发时刷新持续时间；、\n猫又发动[闪避反击：绒爪穿刺]会进入[肉球突袭]状态，持续40秒，重复触发时刷新持续时间，[肉球突袭]状态下猫又自身的攻击命中时均视为从背后命中；\n处于[肉球突袭]状态时，猫又自身的攻击命中时会触发[超凶爪印]效果，造成一次等同于自身30%攻击力的物理伤害，该效果每1秒最多触发一次；",
  target: "self",
  variants: [
    {
      configuration: {
        minimumMindscape: 0,
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
        potentialLevels: [1, 2, 3, 4, 5, 6],
      },
      references: [
        {
          sourceId: "zzz-hp",
          version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
          locale: "zh",
          resourcePath:
            "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
          pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/1",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021508/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021509/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021510/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021511/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021512/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021513/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021514/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021508/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021509/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021510/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021511/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021512/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021513/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1021/details.zh.json",
          pointer: "/passive/level/1021514/desc/0",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["nekomata-claw-mark"],
    },
  ],
} satisfies AuthoringOption

export const MIYABI_FROSTBURN_OPTION = {
  optionId: "nanoka:agents:miyabi:frostburn-break-damage",
  catalogEntityId: "agents:miyabi",
  name: "寒炎 · 霜灼·破（独立结算）",
  conditionDescription:
    "核心被动[寒炎]：对附着[冰焰]的敌人施加[霜寒]效果时，消除[冰焰]并触发[霜灼·破]，对目标造成星见雅攻击力缩放的烈霜伤害（按核心 1—7 为 750/875/1000/1125/1250/1375/1500%）。触发已发生由调用方选中本选项并提供独立项断言：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取星见雅当前攻击力，并显式声明本次独立命中的最终暴击概率（hit.declaredCriticalRate，无默认值；烈霜命中按 frost 结算，规则限定 hit.element=frost，非烈霜命中零贡献）。结果的暴击分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读星见雅当前普通暴击伤害），是本接口的条件计算模型，不证明游戏内该伤害能暴击或继承该暴击伤害。影画 4 起[皲裂]自动对同一事件伤害 +30%（影画 0—3 不生效，不要求另行选择）；同句的 250 点喧响值不模拟。异常积蓄、冰焰/霜寒/霜灼状态机、落霜取得、10 秒触发间隔与[霜灼]状态不模拟；霜月/风花等普通动作不经本选项结算。",
  target: "self",
  variants: [
    {
      target: "self",
      configuration: {
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
      },
      references: [
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091501/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091502/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091503/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091504/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091505/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091506/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/passive/level/1091507/desc/0",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "zh",
          resourcePath: "agents/1091/details.zh.json",
          pointer: "/talent/4/desc",
        },
        {
          sourceId: "nanoka-integrated",
          version: "3.3.12+19634983",
          locale: "en",
          resourcePath: "agents/1091/details.en.json",
          pointer: "/talent/4/desc",
        },
      ],
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["miyabi-frostburn-main", "miyabi-frostburn-m4"],
    },
  ],
} satisfies AuthoringOption

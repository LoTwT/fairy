import type {
  StaticBuildEffectDefinition,
  StaticBuildValueContext,
} from "./types.js"

function byCoreSkill(values: readonly number[]) {
  return ({ coreSkillLevel }: StaticBuildValueContext): number => {
    const index = Math.max(1, Math.min(coreSkillLevel, values.length)) - 1
    return values[index] ?? values[values.length - 1] ?? 0
  }
}

function byRefinement(values: readonly number[]) {
  return ({ wEngineRefinement }: StaticBuildValueContext): number => {
    const index = Math.max(1, Math.min(wEngineRefinement, values.length)) - 1
    return values[index] ?? values[values.length - 1] ?? 0
  }
}

// prettier-ignore
const nekomataCoreBonus = [
  0.3,
  0.35,
  0.4,
  0.45,
  0.5,
  0.55,
  0.6,
] as const
// prettier-ignore
const zeroAnbySilverStarBonus = [
  0.125,
  0.145,
  0.165,
  0.188,
  0.208,
  0.23,
  0.25,
] as const
// prettier-ignore
const zhuYuanCoreBonus = [
  0.2,
  0.233,
  0.266,
  0.3,
  0.333,
  0.366,
  0.4,
] as const
// prettier-ignore
const soldier11CoreBonus = [
  0.35,
  0.408,
  0.466,
  0.525,
  0.583,
  0.641,
  0.7,
] as const
// prettier-ignore
const evelynCoreCritRate = [
  0.125,
  0.146,
  0.167,
  0.188,
  0.208,
  0.23,
  0.25,
] as const
// prettier-ignore
const ellenCoreCritDamage = [
  0.5,
  0.583,
  0.666,
  0.75,
  0.833,
  0.916,
  1,
] as const
// prettier-ignore
const harumasaCoreCritRate = [
  0.106,
  0.13,
  0.154,
  0.178,
  0.202,
  0.226,
  0.25,
] as const
// prettier-ignore
const harumasaCoreCritDamagePerStack = [
  0.06,
  0.07,
  0.08,
  0.09,
  0.1,
  0.11,
  0.12,
] as const
// prettier-ignore
const hugoCoreCritRate = [
  0.06,
  0.07,
  0.08,
  0.09,
  0.1,
  0.11,
  0.12,
] as const
// prettier-ignore
const hugoCoreCritDamage = [
  0.125,
  0.145,
  0.165,
  0.188,
  0.208,
  0.23,
  0.25,
] as const
const matoMoltenEdgeCritRate = () => 0.1
const matoMoltenEdgeFireBonus = () => 0.2
const matoHpConsumedCritDamage = () => 0.5
const idhariLowHpBonus = () => 1
const idhariLowHpCritDamage = () => 0.3
const xisifuToxinCritDamage = () => 0.5
const sidRaidFlatAttack = () => 1000
const sidRaidCritDamage = () => 0.3
const sidEncirclementBonus = () => 0.25
const sidExtraBonus = () => 0.3
const sidExtraIgnoreResistance = () => 0.25
const yeshunguangHedaoCritRate = () => 0.3
const yeshunguangHedaoBonus = () => 0.25
// prettier-ignore
const yixuanCoreBonus = [
  0.3,
  0.35,
  0.4,
  0.45,
  0.5,
  0.55,
  0.6,
] as const

const brimstoneAttackPercent = [0.035, 0.044, 0.052, 0.06, 0.07] as const
const steelCushionPhysicalBonus = [0.2, 0.25, 0.3, 0.35, 0.4] as const
const steelCushionBackBonus = [0.25, 0.315, 0.38, 0.44, 0.5] as const
const deepSeaIceBonus = [0.25, 0.315, 0.38, 0.445, 0.5] as const
const deepSeaCritRate = [0.1, 0.125, 0.15, 0.175, 0.2] as const
const zanshinCritRate = [0.1, 0.115, 0.13, 0.145, 0.16] as const
const zanshinDashBonus = [0.4, 0.46, 0.52, 0.58, 0.64] as const
const myriadEclipseCritDamage = [0.45, 0.5175, 0.585, 0.6525, 0.72] as const
const riotCritRate = [0.15, 0.188, 0.226, 0.264, 0.3] as const
const riotChargeBonus = [0.35, 0.435, 0.52, 0.605, 0.7] as const
const heartstringCritDamage = [0.5, 0.575, 0.65, 0.725, 0.8] as const
const heartstringIgnoreResistance = [0.125, 0.145, 0.165, 0.185, 0.2] as const
const sacrificeCritDamage = [0.3, 0.345, 0.39, 0.435, 0.48] as const
const sacrificeStackCritDamage = [0.1, 0.115, 0.13, 0.145, 0.16] as const
const sacrificeElectricBonus = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const qingmingCritRate = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const qingmingAttributeBonus = [0.08, 0.092, 0.104, 0.116, 0.128] as const
const qingmingSheerBonus = [0.1, 0.115, 0.13, 0.145, 0.16] as const
const grillOwispBonus = [0.15, 0.1725, 0.195, 0.2175, 0.24] as const
const krakenSheerBonus = [0.06, 0.07, 0.08, 0.09, 0.1] as const
const krakenCritRate = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const fangedTraceCritRate = [0.25, 0.288, 0.325, 0.363, 0.4] as const
const chaosfireCritRate = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const cloudcleaveIgnoreResistance = [0.2, 0.22, 0.24, 0.26, 0.28] as const
const cloudcleaveBonus = [0.25, 0.287, 0.325, 0.362, 0.4] as const
const machinaseedCritRate = [0.15, 0.17, 0.19, 0.21, 0.23] as const
const machinaseedElectricBonus = [0.125, 0.145, 0.165, 0.185, 0.2] as const
const wrathfulVajraCritRate = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const wrathfulVajraSheerBonus = [0.09, 0.1035, 0.117, 0.1305, 0.144] as const

export const staticBuildEffectDefinitions = [
  {
    id: "nekomata-core-dash-assist-bonus",
    sourceType: "agent",
    sourceId: "1021",
    sourceName: "猫又",
    label: "核心被动：闪避反击/快速支援增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["dash", "assist"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(nekomataCoreBonus),
      },
    ],
  },
  {
    id: "nekomata-extra-assault-enhanced-special",
    sourceType: "agent",
    sourceId: "1021",
    sourceName: "猫又",
    label: "额外能力：强击后强化特殊技增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      requireExtraAbility: true,
      skillTags: ["enhancedSpecial"],
      combatTags: ["assaultTriggered"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.35,
      },
    ],
  },
  {
    id: "soldier-11-core-fire-suppression",
    sourceType: "agent",
    sourceId: "1041",
    sourceName: "「11号」",
    label: "核心被动：火力镇压增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["basic", "dash"],
      combatTags: ["fireSuppression"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(soldier11CoreBonus),
      },
    ],
  },
  {
    id: "ellen-core-flash-freeze-crit-damage",
    sourceType: "agent",
    sourceId: "1191",
    sourceName: "艾莲",
    label: "核心被动：急冻修剪/冰渊潜袭暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["flashFreezeCharge"],
      skillTags: ["basic", "dash", "chain", "ultimate"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: byCoreSkill(ellenCoreCritDamage),
      },
    ],
  },
  {
    id: "harumasa-core-sharpness-crit-rate",
    sourceType: "agent",
    sourceId: "1201",
    sourceName: "悠真",
    label: "核心被动：锋芒招式暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["harumasaSharpness"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: byCoreSkill(harumasaCoreCritRate),
      },
    ],
  },
  {
    id: "harumasa-core-sharpness-crit-damage",
    sourceType: "agent",
    sourceId: "1201",
    sourceName: "悠真",
    label: "核心被动：锋芒层数暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 3,
    fullBuffStacks: 6,
    maxStacks: 6,
    condition: {
      combatTags: ["harumasaSharpness"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: byCoreSkill(harumasaCoreCritDamagePerStack),
      },
    ],
  },
  {
    id: "hugo-core-dark-abyss-echo-crit-rate",
    sourceType: "agent",
    sourceId: "1291",
    sourceName: "雨果",
    label: "核心被动：暗渊回响暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["darkAbyssEcho"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: byCoreSkill(hugoCoreCritRate),
      },
    ],
  },
  {
    id: "hugo-core-dark-abyss-echo-crit-damage",
    sourceType: "agent",
    sourceId: "1291",
    sourceName: "雨果",
    label: "核心被动：暗渊回响暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["darkAbyssEcho"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: byCoreSkill(hugoCoreCritDamage),
      },
    ],
  },
  {
    id: "hugo-extra-chain-bonus",
    sourceType: "agent",
    sourceId: "1291",
    sourceName: "雨果",
    label: "额外能力：连携技增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      skillTags: ["chain"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.15,
      },
    ],
  },
  {
    id: "hugo-extra-chain-common-enemy-bonus",
    sourceType: "agent",
    sourceId: "1291",
    sourceName: "雨果",
    label: "额外能力：普通敌人连携技额外增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      skillTags: ["chain"],
      combatTags: ["commonEnemy"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.35,
      },
    ],
  },
  {
    id: "hugo-extra-execution-bonus",
    sourceType: "agent",
    sourceId: "1291",
    sourceName: "雨果",
    label: "额外能力：决算增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      combatTags: ["execution"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.4,
      },
    ],
  },
  {
    id: "idhari-core-low-hp-bonus",
    sourceType: "agent",
    sourceId: "1051",
    sourceName: "伊德海莉",
    label: "核心被动：低生命值伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["sheer"],
      combatTags: ["lowHp"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: idhariLowHpBonus,
      },
    ],
  },
  {
    id: "idhari-extra-low-hp-crit-damage",
    sourceType: "agent",
    sourceId: "1051",
    sourceName: "伊德海莉",
    label: "额外能力：低生命值暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      combatTags: ["lowHp"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: idhariLowHpCritDamage,
      },
    ],
  },
  {
    id: "xisifu-extra-toxin-crit-damage",
    sourceType: "agent",
    sourceId: "1521",
    sourceName: "希希芙",
    label: "额外能力：毒素状态暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      combatTags: ["toxin"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: xisifuToxinCritDamage,
      },
    ],
  },
  {
    id: "yeshunguang-core-hedao-crit-rate",
    sourceType: "agent",
    sourceId: "1431",
    sourceName: "叶瞬光",
    label: "核心被动：合道暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["hedao"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: yeshunguangHedaoCritRate,
      },
    ],
  },
  {
    id: "yeshunguang-core-hedao-bonus",
    sourceType: "agent",
    sourceId: "1431",
    sourceName: "叶瞬光",
    label: "核心被动：合道增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["hedao"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: yeshunguangHedaoBonus,
      },
    ],
  },
  {
    id: "zero-anby-core-silver-star-bonus",
    sourceType: "agent",
    sourceId: "1381",
    sourceName: "零号·安比",
    label: "核心被动：银星标记目标增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["silverStarTarget"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(zeroAnbySilverStarBonus),
      },
    ],
  },
  {
    id: "zero-anby-extra-crit-rate",
    sourceType: "agent",
    sourceId: "1381",
    sourceName: "零号·安比",
    label: "额外能力：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
    },
    modifiers: [
      {
        bucket: "critRate",
        value: () => 0.1,
      },
    ],
  },
  {
    id: "zero-anby-extra-follow-up-bonus",
    sourceType: "agent",
    sourceId: "1381",
    sourceName: "零号·安比",
    label: "额外能力：追加攻击对银星标记目标增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      combatTags: ["silverStarTarget", "followUp"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.25,
      },
    ],
  },
  {
    id: "zero-anby-extra-chain-ultimate-follow-up-bonus",
    sourceType: "agent",
    sourceId: "1381",
    sourceName: "零号·安比",
    label: "额外能力：连携技/终结技视为追加攻击增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      skillTags: ["chain", "ultimate"],
      combatTags: ["silverStarTarget"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.25,
      },
    ],
  },
  {
    id: "sid-core-raid-state-flat-attack",
    sourceType: "agent",
    sourceId: "1461",
    sourceName: "「席德」",
    label: "核心被动：强袭状态攻击力与暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["raidState"],
    },
    modifiers: [
      {
        bucket: "flatAttack",
        value: sidRaidFlatAttack,
      },
      {
        bucket: "critDamage",
        value: sidRaidCritDamage,
      },
    ],
  },
  {
    id: "sid-core-encirclement-bonus",
    sourceType: "agent",
    sourceId: "1461",
    sourceName: "「席德」",
    label: "核心被动：围杀状态增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["encirclement"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: sidEncirclementBonus,
      },
    ],
  },
  {
    id: "sid-extra-basic-ultimate-bonus",
    sourceType: "agent",
    sourceId: "1461",
    sourceName: "「席德」",
    label: "额外能力：普攻/终结技增伤与无视电抗",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      skillTags: ["basic", "ultimate"],
      attributes: ["Electric"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: sidExtraBonus,
      },
      {
        bucket: "ignoreResistance",
        value: sidExtraIgnoreResistance,
      },
    ],
  },
  {
    id: "orphie-core-crit-rate",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "核心被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: () => 0.25,
      },
    ],
  },
  {
    id: "orphie-core-follow-up-bonus",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "核心被动：追加攻击增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["followUp"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.85,
      },
    ],
  },
  {
    id: "orphie-core-crosshair-focus-flat-attack",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "核心被动：准星聚焦攻击力",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["crosshairFocus"],
    },
    modifiers: [
      {
        bucket: "flatAttack",
        value: () => 280,
      },
    ],
  },
  {
    id: "orphie-extra-follow-up-ignore-defense",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "额外能力：追加攻击无视防御",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      combatTags: ["followUp"],
    },
    modifiers: [],
  },
  {
    id: "mato-core-molten-edge-crit-rate",
    sourceType: "agent",
    sourceId: "1441",
    sourceName: "真斗",
    label: "核心被动：熔锋状态暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["sheer"],
      combatTags: ["moltenEdge"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: matoMoltenEdgeCritRate,
      },
    ],
  },
  {
    id: "mato-core-molten-edge-fire-bonus",
    sourceType: "agent",
    sourceId: "1441",
    sourceName: "真斗",
    label: "核心被动：熔锋状态火属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["sheer"],
      attributes: ["Fire"],
      combatTags: ["moltenEdge"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: matoMoltenEdgeFireBonus,
      },
    ],
  },
  {
    id: "mato-core-hp-consumed-crit-damage",
    sourceType: "agent",
    sourceId: "1441",
    sourceName: "真斗",
    label: "核心被动：耗血连续斩击暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["sheer"],
      skillTags: ["basic", "assist"],
      combatTags: ["hpConsumedSlash"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: matoHpConsumedCritDamage,
      },
    ],
  },
  {
    id: "zhu-yuan-core-suppression",
    sourceType: "agent",
    sourceId: "1241",
    sourceName: "朱鸢",
    label: "核心被动：压制模式强化霰弹增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["suppressionMode"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(zhuYuanCoreBonus),
      },
    ],
  },
  {
    id: "zhu-yuan-core-stunned",
    sourceType: "agent",
    sourceId: "1241",
    sourceName: "朱鸢",
    label: "核心被动：失衡目标额外增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["suppressionMode"],
      requireStunned: true,
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(zhuYuanCoreBonus),
      },
    ],
  },
  {
    id: "zhu-yuan-extra-crit-window",
    sourceType: "agent",
    sourceId: "1241",
    sourceName: "朱鸢",
    label: "额外能力：强化特殊技/连携技/终结技后暴击率",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
    },
    modifiers: [
      {
        bucket: "critRate",
        value: () => 0.3,
      },
    ],
  },
  {
    id: "evelyn-core-restrained",
    sourceType: "agent",
    sourceId: "1321",
    sourceName: "伊芙琳",
    label: "核心被动：牵缠禁制暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["restrained"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: byCoreSkill(evelynCoreCritRate),
      },
    ],
  },
  {
    id: "evelyn-extra-chain-bonus",
    sourceType: "agent",
    sourceId: "1321",
    sourceName: "伊芙琳",
    label: "额外能力：连携技/终结技增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      skillTags: ["chain", "ultimate"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.3,
      },
    ],
  },
  {
    id: "evelyn-extra-high-crit-skill-multiplier",
    sourceType: "agent",
    sourceId: "1321",
    sourceName: "伊芙琳",
    label: "额外能力：暴击率达标后技能倍率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      skillTags: ["chain", "ultimate"],
      minimumResolvedCritRate: 0.8,
    },
    modifiers: [
      {
        bucket: "skillMultiplierFactor",
        combine: "multiply",
        value: () => 1.25,
      },
    ],
  },
  {
    id: "yixuan-core-auric-ink-sheer-bonus",
    sourceType: "agent",
    sourceId: "1371",
    sourceName: "仪玄",
    label: "核心被动：指定招式伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["basic", "enhancedSpecial", "chain", "ultimate"],
      damageTypes: ["sheer"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(yixuanCoreBonus),
      },
    ],
  },
  {
    id: "yixuan-extra-stunned-enhanced-special",
    sourceType: "agent",
    sourceId: "1371",
    sourceName: "仪玄",
    label: "额外能力：失衡目标强化特殊技增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      requireStunned: true,
      skillTags: ["enhancedSpecial"],
      damageTypes: ["sheer"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.3,
      },
    ],
  },
  {
    id: "yixuan-extra-focused-crit-damage",
    sourceType: "agent",
    sourceId: "1371",
    sourceName: "仪玄",
    label: "额外能力：凝神状态暴击伤害",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["focusedMind"],
      damageTypes: ["sheer"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: () => 0.4,
      },
    ],
  },
  {
    id: "banyue-core-buff-bonus",
    sourceType: "agent",
    sourceId: "1471",
    sourceName: "般岳",
    label: "核心被动：核心招式增伤与暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["sheer"],
      attributes: ["Fire"],
      combatTags: ["banyueCoreBuff"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.36,
      },
      {
        bucket: "critDamage",
        value: () => 0.36,
      },
    ],
  },
  {
    id: "banyue-extra-mingwang-fire-bonus",
    sourceType: "agent",
    sourceId: "1471",
    sourceName: "般岳",
    label: "额外能力：明王层数火属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 3,
    maxStacks: 3,
    condition: {
      requireExtraAbility: true,
      damageTypes: ["sheer"],
      attributes: ["Fire"],
      combatTags: ["mingwang"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.05,
      },
    ],
  },
  {
    id: "banyue-core-sheer-force-scaling",
    sourceType: "agent",
    sourceId: "1471",
    sourceName: "般岳",
    label: "核心被动：生命值转贯穿力",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [],
  },
  {
    id: "brimstone-attack-percent",
    sourceType: "w-engine",
    sourceId: "14104",
    sourceName: "硫磺石",
    label: "音擎被动：攻击力层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 4,
    fullBuffStacks: 8,
    maxStacks: 8,
    modifiers: [
      {
        bucket: "attackPercent",
        value: byRefinement(brimstoneAttackPercent),
      },
    ],
  },
  {
    id: "steel-cushion-physical-bonus",
    sourceType: "w-engine",
    sourceId: "14102",
    sourceName: "钢铁肉垫",
    label: "音擎被动：物理伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Physical"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(steelCushionPhysicalBonus),
      },
    ],
  },
  {
    id: "steel-cushion-back-bonus",
    sourceType: "w-engine",
    sourceId: "14102",
    sourceName: "钢铁肉垫",
    label: "音擎被动：背后攻击增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["backAttack"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(steelCushionBackBonus),
      },
    ],
  },
  {
    id: "deep-sea-ice-bonus",
    sourceType: "w-engine",
    sourceId: "14119",
    sourceName: "深海访客",
    label: "音擎被动：冰属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Ice"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(deepSeaIceBonus),
      },
    ],
  },
  {
    id: "deep-sea-basic-crit-rate",
    sourceType: "w-engine",
    sourceId: "14119",
    sourceName: "深海访客",
    label: "音擎被动：普通攻击后暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(deepSeaCritRate),
      },
    ],
  },
  {
    id: "deep-sea-dash-crit-rate",
    sourceType: "w-engine",
    sourceId: "14119",
    sourceName: "深海访客",
    label: "音擎被动：冲刺攻击额外暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["dash"],
      attributes: ["Ice"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(deepSeaCritRate),
      },
    ],
  },
  {
    id: "zanshin-crit-rate",
    sourceType: "w-engine",
    sourceId: "14120",
    sourceName: "残心青囊",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(zanshinCritRate),
      },
    ],
  },
  {
    id: "zanshin-dash-electric-bonus",
    sourceType: "w-engine",
    sourceId: "14120",
    sourceName: "残心青囊",
    label: "音擎被动：冲刺攻击电伤增幅",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["dash"],
      attributes: ["Electric"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(zanshinDashBonus),
      },
    ],
  },
  {
    id: "zanshin-extra-crit-rate",
    sourceType: "w-engine",
    sourceId: "14120",
    sourceName: "残心青囊",
    label: "音擎被动：异常/失衡后额外暴击率",
    baselineEnabled: false,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(zanshinCritRate),
      },
    ],
  },
  {
    id: "myriad-eclipse-crit-damage",
    sourceType: "w-engine",
    sourceId: "14129",
    sourceName: "千面日陨",
    label: "音擎被动：暴击伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critDamage",
        value: byRefinement(myriadEclipseCritDamage),
      },
    ],
  },
  {
    id: "grill-owisp-fire-bonus",
    sourceType: "w-engine",
    sourceId: "13144",
    sourceName: "燔火胧夜",
    label: "音擎被动：火属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Fire"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(grillOwispBonus),
      },
    ],
  },
  {
    id: "grill-owisp-hp-loss-crit-rate",
    sourceType: "w-engine",
    sourceId: "13144",
    sourceName: "燔火胧夜",
    label: "音擎被动：生命值降低后暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["hpLoss"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(grillOwispBonus),
      },
    ],
  },
  {
    id: "kraken-cradle-low-hp-ice-sheer-bonus",
    sourceType: "w-engine",
    sourceId: "14105",
    sourceName: "海妖摇篮",
    label: "音擎被动：低生命值冰属性贯穿增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 3,
    maxStacks: 3,
    condition: {
      damageTypes: ["sheer"],
      attributes: ["Ice"],
      combatTags: ["hpLoss"],
    },
    modifiers: [
      {
        bucket: "sheerBonusSum",
        value: byRefinement(krakenSheerBonus),
      },
    ],
  },
  {
    id: "kraken-cradle-low-hp-crit-rate",
    sourceType: "w-engine",
    sourceId: "14105",
    sourceName: "海妖摇篮",
    label: "音擎被动：低生命值暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["lowHp"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(krakenCritRate),
      },
    ],
  },
  {
    id: "chaosfire-crit-rate",
    sourceType: "w-engine",
    sourceId: "14130",
    sourceName: "嚣枪喧焰",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(chaosfireCritRate),
      },
    ],
  },
  {
    id: "chaosfire-follow-up-ignore-defense",
    sourceType: "w-engine",
    sourceId: "14130",
    sourceName: "嚣枪喧焰",
    label: "音擎被动：追加攻击无视防御",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      attributes: ["Fire"],
      combatTags: ["followUp"],
    },
    modifiers: [],
  },
  {
    id: "cloudcleave-honed-edge-ignore-resistance",
    sourceType: "w-engine",
    sourceId: "14143",
    sourceName: "云霓孤光",
    label: "音擎被动：无视物理抗性",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Physical", "Honed Edge"],
    },
    modifiers: [
      {
        bucket: "ignoreResistance",
        value: byRefinement(cloudcleaveIgnoreResistance),
      },
    ],
  },
  {
    id: "cloudcleave-ether-curtain-bonus",
    sourceType: "w-engine",
    sourceId: "14143",
    sourceName: "云霓孤光",
    label: "音擎被动：以太帷幕期间增伤与暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["etherCurtain"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(cloudcleaveBonus),
      },
      {
        bucket: "critDamage",
        value: byRefinement(cloudcleaveBonus),
      },
    ],
  },
  {
    id: "riot-suppressor-crit-rate",
    sourceType: "w-engine",
    sourceId: "14124",
    sourceName: "防暴者Ⅵ型",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(riotCritRate),
      },
    ],
  },
  {
    id: "riot-suppressor-charge-bonus",
    sourceType: "w-engine",
    sourceId: "14124",
    sourceName: "防暴者Ⅵ型",
    label: "音擎被动：充能层增伤",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["basic", "dash"],
      attributes: ["Ether"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(riotChargeBonus),
      },
    ],
  },
  {
    id: "heartstring-crit-damage",
    sourceType: "w-engine",
    sourceId: "14132",
    sourceName: "心弦夜响",
    label: "音擎被动：暴击伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critDamage",
        value: byRefinement(heartstringCritDamage),
      },
    ],
  },
  {
    id: "sacrifice-purity-crit-damage",
    sourceType: "w-engine",
    sourceId: "14138",
    sourceName: "牺牲洁纯",
    label: "音擎被动：暴击伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critDamage",
        value: byRefinement(sacrificeCritDamage),
      },
    ],
  },
  {
    id: "sacrifice-purity-stack-crit-damage",
    sourceType: "w-engine",
    sourceId: "14138",
    sourceName: "牺牲洁纯",
    label: "音擎被动：增益层数暴击伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 3,
    maxStacks: 3,
    condition: {
      combatTags: ["purityBloom"],
    },
    modifiers: [
      {
        bucket: "critDamage",
        value: byRefinement(sacrificeStackCritDamage),
      },
    ],
  },
  {
    id: "sacrifice-purity-electric-bonus",
    sourceType: "w-engine",
    sourceId: "14138",
    sourceName: "牺牲洁纯",
    label: "音擎被动：满层电属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Electric"],
      combatTags: ["purityBloomMax"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(sacrificeElectricBonus),
      },
    ],
  },
  {
    id: "heartstring-fire-ignore-resistance",
    sourceType: "w-engine",
    sourceId: "14132",
    sourceName: "心弦夜响",
    label: "音擎被动：火属性无视抗性",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      skillTags: ["chain", "ultimate"],
      attributes: ["Fire"],
    },
    modifiers: [
      {
        bucket: "ignoreResistance",
        value: byRefinement(heartstringIgnoreResistance),
      },
    ],
  },
  {
    id: "qingming-crit-rate",
    sourceType: "w-engine",
    sourceId: "14137",
    sourceName: "青溟笼舍",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(qingmingCritRate),
      },
    ],
  },
  {
    id: "qingming-auric-ink-bonus",
    sourceType: "w-engine",
    sourceId: "14137",
    sourceName: "青溟笼舍",
    label: "音擎被动：青溟同行属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 2,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      attributes: ["Auric Ink"],
      damageTypes: ["sheer"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(qingmingAttributeBonus),
      },
    ],
  },
  {
    id: "qingming-sheer-bonus",
    sourceType: "w-engine",
    sourceId: "14137",
    sourceName: "青溟笼舍",
    label: "音擎被动：强化特殊技/终结技贯穿增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 2,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      damageTypes: ["sheer"],
      skillTags: ["enhancedSpecial", "ultimate"],
    },
    modifiers: [
      {
        bucket: "sheerBonusSum",
        value: byRefinement(qingmingSheerBonus),
      },
    ],
  },
  {
    id: "machinaseed-crit-rate",
    sourceType: "w-engine",
    sourceId: "14146",
    sourceName: "机巧心种",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(machinaseedCritRate),
      },
    ],
  },
  {
    id: "machinaseed-basic-enhanced-electric-bonus",
    sourceType: "w-engine",
    sourceId: "14146",
    sourceName: "机巧心种",
    label: "音擎被动：普攻/强化特殊技电属性增伤层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      attributes: ["Electric"],
      skillTags: ["basic", "enhancedSpecial"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(machinaseedElectricBonus),
      },
    ],
  },
  {
    id: "wrathful-vajra-crit-rate",
    sourceType: "w-engine",
    sourceId: "14147",
    sourceName: "怒目金刚",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(wrathfulVajraCritRate),
      },
    ],
  },
  {
    id: "wrathful-vajra-sheer-bonus",
    sourceType: "w-engine",
    sourceId: "14147",
    sourceName: "怒目金刚",
    label: "音擎被动：强化特殊技火属性贯穿增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      damageTypes: ["sheer"],
      attributes: ["Fire"],
      skillTags: ["enhancedSpecial"],
      combatTags: ["vajraFlame"],
    },
    modifiers: [
      {
        bucket: "sheerBonusSum",
        value: byRefinement(wrathfulVajraSheerBonus),
      },
    ],
  },
  {
    id: "fanged-trace-crit-rate",
    sourceType: "w-engine",
    sourceId: "14152",
    sourceName: "鳞齿寻踪",
    label: "音擎被动：暴击率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: byRefinement(fangedTraceCritRate),
      },
    ],
  },
  {
    id: "inferno-2pc-fire-bonus",
    sourceType: "drive-disc",
    sourceId: "32200",
    sourceName: "炎狱重金属",
    label: "2件套：火属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Fire"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.1,
      },
    ],
  },
  {
    id: "inferno-4pc-burning-crit-rate",
    sourceType: "drive-disc",
    sourceId: "32200",
    sourceName: "炎狱重金属",
    label: "4件套：灼烧目标暴击率",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["burningTarget"],
    },
    modifiers: [
      {
        bucket: "critRate",
        value: () => 0.28,
      },
    ],
  },
  {
    id: "thunder-2pc-electric-bonus",
    sourceType: "drive-disc",
    sourceId: "32400",
    sourceName: "雷暴重金属",
    label: "2件套：电属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Electric"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.1,
      },
    ],
  },
  {
    id: "thunder-4pc-shocked-attack",
    sourceType: "drive-disc",
    sourceId: "32400",
    sourceName: "雷暴重金属",
    label: "4件套：感电目标攻击力",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["shockedTarget"],
    },
    modifiers: [
      {
        bucket: "attackPercent",
        value: () => 0.28,
      },
    ],
  },
  {
    id: "polar-2pc-ice-bonus",
    sourceType: "drive-disc",
    sourceId: "32500",
    sourceName: "极地重金属",
    label: "2件套：冰属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Ice"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.1,
      },
    ],
  },
  {
    id: "polar-4pc-basic-dash-bonus",
    sourceType: "drive-disc",
    sourceId: "32500",
    sourceName: "极地重金属",
    label: "4件套：普通/冲刺伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["basic", "dash"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "polar-4pc-frozen-extra-bonus",
    sourceType: "drive-disc",
    sourceId: "32500",
    sourceName: "极地重金属",
    label: "4件套：冻结/碎冰额外增伤",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["basic", "dash"],
      combatTags: ["frozenTarget"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "woodpecker-2pc-crit-rate",
    sourceType: "drive-disc",
    sourceId: "31000",
    sourceName: "啄木鸟电音",
    label: "2件套：暴击率",
    alreadyInPanel: true,
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "critRate",
        value: () => 0.08,
      },
    ],
  },
  {
    id: "woodpecker-4pc-attack",
    sourceType: "drive-disc",
    sourceId: "31000",
    sourceName: "啄木鸟电音",
    label: "4件套：暴击触发攻击力层数",
    baselineEnabled: false,
    fullBuffEnabled: true,
    baselineStacks: 0,
    fullBuffStacks: 3,
    maxStacks: 3,
    modifiers: [
      {
        bucket: "attackPercent",
        value: () => 0.09,
      },
    ],
  },
  {
    id: "puffer-2pc-penetration-rate",
    sourceType: "drive-disc",
    sourceId: "31100",
    sourceName: "河豚电音",
    label: "2件套：穿透率",
    alreadyInPanel: true,
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "penetrationRate",
        value: () => 0.08,
      },
    ],
  },
  {
    id: "puffer-4pc-ultimate-bonus",
    sourceType: "drive-disc",
    sourceId: "31100",
    sourceName: "河豚电音",
    label: "4件套：终结技增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["ultimate"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "puffer-4pc-after-ultimate-attack",
    sourceType: "drive-disc",
    sourceId: "31100",
    sourceName: "河豚电音",
    label: "4件套：终结技后攻击力",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["afterUltimate"],
    },
    modifiers: [
      {
        bucket: "attackPercent",
        value: () => 0.15,
      },
    ],
  },
  {
    id: "yunkui-2pc-hp",
    sourceType: "drive-disc",
    sourceId: "33100",
    sourceName: "云岿如我",
    label: "2件套：生命值",
    alreadyInPanel: true,
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [],
  },
  {
    id: "yunkui-4pc-crit-rate",
    sourceType: "drive-disc",
    sourceId: "33100",
    sourceName: "云岿如我",
    label: "4件套：暴击率层数",
    baselineEnabled: false,
    fullBuffEnabled: true,
    baselineStacks: 0,
    fullBuffStacks: 3,
    maxStacks: 3,
    modifiers: [
      {
        bucket: "critRate",
        value: () => 0.04,
      },
    ],
  },
  {
    id: "yunkui-4pc-sheer-bonus",
    sourceType: "drive-disc",
    sourceId: "33100",
    sourceName: "云岿如我",
    label: "4件套：满层贯穿增伤",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["sheer"],
    },
    modifiers: [
      {
        bucket: "sheerBonusSum",
        value: () => 0.1,
      },
    ],
  },
] as const satisfies StaticBuildEffectDefinition[]

export function getStaticBuildEffectsForLoadout(loadout: {
  agentId: string
  wEngineId?: string
  driveDiscSets?: Array<{ id: string; pieces: 2 | 4 }>
}): StaticBuildEffectDefinition[] {
  const effects = staticBuildEffectDefinitions.filter((effect) => {
    if (effect.sourceType === "agent")
      return effect.sourceId === loadout.agentId
    if (effect.sourceType === "w-engine") {
      return effect.sourceId === loadout.wEngineId
    }
    return false
  })

  for (const set of loadout.driveDiscSets ?? []) {
    if (set.pieces >= 2) {
      effects.push(
        ...staticBuildEffectDefinitions.filter(
          (effect) =>
            effect.sourceType === "drive-disc" &&
            effect.sourceId === set.id &&
            effect.id.includes("-2pc-"),
        ),
      )
    }
    if (set.pieces >= 4) {
      effects.push(
        ...staticBuildEffectDefinitions.filter(
          (effect) =>
            effect.sourceType === "drive-disc" &&
            effect.sourceId === set.id &&
            effect.id.includes("-4pc-"),
        ),
      )
    }
  }

  return effects
}

export function hasStaticBuildEffectsForSource(
  sourceType: StaticBuildEffectDefinition["sourceType"],
  sourceId: string | undefined,
) {
  if (!sourceId) return false
  return staticBuildEffectDefinitions.some(
    (effect) =>
      effect.sourceType === sourceType && effect.sourceId === sourceId,
  )
}

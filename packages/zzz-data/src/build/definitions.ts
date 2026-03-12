import type {
  StaticBuildEffectDefinition,
  StaticBuildResolvedSnapshotBucketKey,
  StaticBuildResolvedSnapshotInput,
  StaticBuildResolvedSnapshotMultiplierKey,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceNoteGuidance,
  StaticBuildSourceNoteOwner,
  StaticBuildSourceNoteStatus,
  StaticBuildValueContext,
} from "./types.js"
import { calcDisorderDamageMultiplier } from "../calculator/factors.js"

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

function burniceFireDisorderDurationBonus({
  remainingTime,
}: StaticBuildValueContext): number {
  const time = remainingTime ?? 0
  const base = calcDisorderDamageMultiplier("fire", time)
  const extended = calcDisorderDamageMultiplier("fire", time + 3)
  return extended / base - 1
}

function aliceExtraAnomalyProficiencyFromMastery({
  anomalyMastery,
}: StaticBuildValueContext): number {
  return Math.max(0, ((anomalyMastery ?? 0) - 140) * 1.6)
}

function ariaM1AnomalyCritRate({
  anomalyMastery,
}: StaticBuildValueContext): number {
  return Math.max(0.25, 0.25 + Math.max(0, (anomalyMastery ?? 0) - 100) * 0.005)
}

function dynamicValue(
  key: keyof NonNullable<StaticBuildValueContext["dynamicSnapshot"]>["values"],
) {
  return ({ dynamicSnapshot }: StaticBuildValueContext): number =>
    dynamicSnapshot?.values?.[key] ?? 0
}

function stateMultiplierDelta(
  key: keyof NonNullable<StaticBuildValueContext["stateSnapshot"]>["values"],
) {
  return ({ stateSnapshot }: StaticBuildValueContext): number =>
    (stateSnapshot?.values?.[key] ?? 0) - 1
}

function multipliedDynamicCountAndValue(input: {
  countKey: keyof NonNullable<
    StaticBuildValueContext["dynamicSnapshot"]
  >["counts"]
  valueKey: keyof NonNullable<
    StaticBuildValueContext["dynamicSnapshot"]
  >["values"]
}) {
  return ({ dynamicSnapshot }: StaticBuildValueContext): number =>
    (dynamicSnapshot?.counts?.[input.countKey] ?? 0) *
    (dynamicSnapshot?.values?.[input.valueKey] ?? 0)
}

function steppedEnergyGenerationValue(input: {
  energyGenerationRate?: number
  threshold: number
  step: number
  perStep: number
  cap: number
}) {
  const { energyGenerationRate, threshold, step, perStep, cap } = input
  if (energyGenerationRate === undefined || energyGenerationRate < threshold) {
    return 0
  }
  const steps = Math.floor((energyGenerationRate - threshold + 1e-9) / step)
  return Math.min(cap, Math.max(0, steps) * perStep)
}

function burniceAwakeningAnomalyMastery({
  agentMindscape,
  energyGenerationRate,
}: StaticBuildValueContext): number {
  const perStepValues = [1, 1.3, 1.6, 2, 2.5] as const
  if (agentMindscape <= 0) return 0
  const perStep =
    perStepValues[Math.min(agentMindscape, perStepValues.length) - 1] ??
    perStepValues[perStepValues.length - 1]
  return steppedEnergyGenerationValue({
    energyGenerationRate,
    threshold: 1.8,
    step: 0.1,
    perStep,
    cap: 25,
  })
}

function burniceAwakeningBonus({
  agentMindscape,
  energyGenerationRate,
}: StaticBuildValueContext): number {
  const perStepValues = [0.01, 0.0125, 0.015, 0.0175, 0.02] as const
  if (agentMindscape <= 0) return 0
  const perStep =
    perStepValues[Math.min(agentMindscape, perStepValues.length) - 1] ??
    perStepValues[perStepValues.length - 1]
  return steppedEnergyGenerationValue({
    energyGenerationRate,
    threshold: 1.8,
    step: 0.1,
    perStep,
    cap: 0.2,
  })
}

function orphieCrosshairFocusFlatAttack({
  coreSkillLevel,
  energyGenerationRate,
}: StaticBuildValueContext): number {
  const baseValues = [130, 155, 180, 205, 230, 255, 280] as const
  const capValues = [340, 400, 460, 520, 580, 640, 700] as const
  const index = Math.max(1, Math.min(coreSkillLevel, baseValues.length)) - 1
  const base = baseValues[index] ?? baseValues[baseValues.length - 1]
  const cap = capValues[index] ?? capValues[capValues.length - 1]
  const extra = steppedEnergyGenerationValue({
    energyGenerationRate,
    threshold: 1.6,
    step: 0.1,
    perStep: 20,
    cap: Math.max(0, cap - base),
  })
  return base + extra
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
// prettier-ignore
const orphieCoreCritRate = [
  0.125,
  0.146,
  0.167,
  0.188,
  0.208,
  0.229,
  0.25,
] as const
// prettier-ignore
const orphieCoreFollowUpBonus = [
  0.425,
  0.496,
  0.567,
  0.637,
  0.708,
  0.779,
  0.85,
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
const fusionCompilerAttackPercent = [0.12, 0.15, 0.18, 0.21, 0.24] as const
const fusionCompilerAnomalyProficiency = [25, 31, 37, 43, 50] as const
const weepingGeminiAnomalyProficiency = [30, 34, 38, 42, 48] as const
// prettier-ignore
const yanagiCoreDisorderBonus = [
  1.25,
  1.45,
  1.66,
  1.88,
  2.08,
  2.3,
  2.5,
] as const
// prettier-ignore
const yanagiCoreElectricBonus = [
  0.1,
  0.116,
  0.133,
  0.15,
  0.166,
  0.183,
  0.2,
] as const
// prettier-ignore
const janeCoreAnomalyCritRate = [
  0.2,
  0.25,
  0.28,
  0.31,
  0.34,
  0.37,
  0.4,
] as const
// prettier-ignore
const janeCoreAnomalyCritRatePerProficiency = [
  0.001,
  0.0011,
  0.0012,
  0.0013,
  0.0014,
  0.0015,
  0.0016,
] as const
// prettier-ignore
const ariaCoreAnomalyProficiency = [
  45,
  52,
  60,
  67,
  75,
  82,
  90,
] as const
const soulShellAnomalyProficiency = [90, 103, 117, 130, 144] as const
const soulShellBonus = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const soulShellAnomalyBonus = [0.1, 0.115, 0.13, 0.145, 0.16] as const
const practicedPerfectionPhysicalBonus = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const flightOfFancyAnomalyProficiency = [20, 23, 26, 29, 32] as const
const sharpenedStingerPhysicalBonus = [0.12, 0.15, 0.18, 0.21, 0.24] as const
const timeweaverAnomalyProficiency = [75, 85, 95, 105, 115] as const
const timeweaverDisorderBonus = [0.25, 0.275, 0.3, 0.325, 0.35] as const
const flamemakerBonus = [0.035, 0.044, 0.052, 0.061, 0.07] as const
const flamemakerAnomalyProficiency = [50, 62, 75, 87, 100] as const
const hailstormFrostBonus = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const electroLipGlossAttackPercent = [0.1, 0.115, 0.13, 0.145, 0.16] as const
const electroLipGlossBonus = [0.15, 0.175, 0.2, 0.225, 0.25] as const
const rainforestAttackPercent = [0.025, 0.028, 0.032, 0.036, 0.04] as const

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
        value: byCoreSkill(orphieCoreCritRate),
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
        value: byCoreSkill(orphieCoreFollowUpBonus),
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
        value: orphieCrosshairFocusFlatAttack,
      },
    ],
  },
  {
    id: "orphie-m1-crosshair-focus-bonus",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "影画1：准星聚焦伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      combatTags: ["crosshairFocus"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "orphie-m1-fire-ignore-resistance",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "影画1：特殊技/强化特殊技无视火抗",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      skillTags: ["special", "enhancedSpecial"],
      attributes: ["Fire"],
    },
    modifiers: [
      {
        bucket: "ignoreResistance",
        value: () => 0.15,
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
    id: "orphie-m2-after-ultimate-attack",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "影画2：终结技后攻击力提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      combatTags: ["afterUltimate"],
    },
    modifiers: [
      {
        bucket: "attackPercent",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "orphie-m4-ex-ultimate-bonus",
    sourceType: "agent",
    sourceId: "1301",
    sourceName: "奥菲丝&「鬼火」",
    label: "影画4：强化特殊技/终结技增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 4,
      skillTags: ["enhancedSpecial", "ultimate"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.4,
      },
    ],
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
    id: "burnice-extra-fire-disorder-duration-bonus",
    sourceType: "agent",
    sourceId: "1171",
    sourceName: "柏妮思",
    label: "额外能力：灼烧持续时间延长转火源紊乱倍率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      damageTypes: ["disorder"],
      disorderSourceTypes: ["fire"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: burniceFireDisorderDurationBonus,
      },
    ],
  },
  {
    id: "burnice-awakening-energy-anomaly-mastery",
    sourceType: "agent",
    sourceId: "1171",
    sourceName: "柏妮思",
    label: "潜能觉醒：初始能量自动回复转异常掌控",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
    },
    modifiers: [
      {
        bucket: "anomalyMastery",
        value: burniceAwakeningAnomalyMastery,
      },
    ],
  },
  {
    id: "burnice-awakening-energy-bonus",
    sourceType: "agent",
    sourceId: "1171",
    sourceName: "柏妮思",
    label: "潜能觉醒：初始能量自动回复转伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: burniceAwakeningBonus,
      },
    ],
  },
  {
    id: "burnice-m2-heat-penetration",
    sourceType: "agent",
    sourceId: "1171",
    sourceName: "柏妮思",
    label: "影画2：热意洞穿层数穿透率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 5,
    maxStacks: 5,
    condition: {
      minimumMindscape: 2,
      combatTags: ["burniceHeatPenetration"],
    },
    modifiers: [
      {
        bucket: "penetrationRate",
        value: () => 0.04,
      },
    ],
  },
  {
    id: "burnice-dynamic-ember-bonus",
    sourceType: "agent",
    sourceId: "1171",
    sourceName: "柏妮思",
    label: "动态快照：[余烬]额外结算倍率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly", "disorder"],
      attributes: ["Fire"],
      dynamicSnapshotFlags: ["burniceEmberState"],
      requiredDynamicCounts: ["burniceEmberExtraTriggers"],
      requiredDynamicValues: ["burniceEmberDamageRatio"],
      minimumDynamicCounts: {
        burniceEmberExtraTriggers: 1,
      },
      minimumDynamicValues: {
        burniceEmberDamageRatio: Number.EPSILON,
      },
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: multipliedDynamicCountAndValue({
          countKey: "burniceEmberExtraTriggers",
          valueKey: "burniceEmberDamageRatio",
        }),
      },
    ],
  },
  {
    id: "grace-extra-shock-anomaly-bonus",
    sourceType: "agent",
    sourceId: "1181",
    sourceName: "格莉丝",
    label: "额外能力：下次感电伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      requireExtraAbility: true,
      damageTypes: ["anomaly"],
      attributes: ["Electric"],
      combatTags: ["graceShockPrepared"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.18,
      },
    ],
  },
  {
    id: "grace-m2-electric-resistance-reduction",
    sourceType: "agent",
    sourceId: "1181",
    sourceName: "格莉丝",
    label: "影画2：手雷命中后的电抗降低",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["anomaly", "disorder"],
      attributes: ["Electric"],
      combatTags: ["graceGrenadeHitTarget"],
    },
    modifiers: [
      {
        bucket: "resistanceReduction",
        value: () => 0.085,
      },
    ],
  },
  {
    id: "yanagi-core-disorder-bonus",
    sourceType: "agent",
    sourceId: "1221",
    sourceName: "柳",
    label: "核心被动：紊乱伤害倍率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["disorder"],
      combatTags: ["yanagiMoonEclipse"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: byCoreSkill(yanagiCoreDisorderBonus),
      },
    ],
  },
  {
    id: "yanagi-core-electric-bonus",
    sourceType: "agent",
    sourceId: "1221",
    sourceName: "柳",
    label: "核心被动：电属性伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly", "disorder"],
      attributes: ["Electric"],
      combatTags: ["yanagiMoonEclipse"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byCoreSkill(yanagiCoreElectricBonus),
      },
    ],
  },
  {
    id: "yanagi-m1-insight-anomaly-proficiency",
    sourceType: "agent",
    sourceId: "1221",
    sourceName: "柳",
    label: "影画1：洞悉异常精通提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["yanagiInsight"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: () => 80,
      },
    ],
  },
  {
    id: "yanagi-m2-polar-disorder-base-bonus",
    sourceType: "agent",
    sourceId: "1221",
    sourceName: "柳",
    label: "影画2：极性紊乱基础倍率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["disorder"],
      combatTags: ["yanagiMoonEclipse", "yanagiExtraThrustDisorder"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 20 / 15 - 1,
      },
    ],
  },
  {
    id: "yanagi-m2-polar-disorder-extra-thrust-bonus",
    sourceType: "agent",
    sourceId: "1221",
    sourceName: "柳",
    label: "影画2：极性紊乱额外突刺倍率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["disorder"],
      combatTags: ["yanagiMoonEclipse", "yanagiExtraThrustDisorder"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 1,
      },
    ],
  },
  {
    id: "yanagi-m4-recognized-penetration-rate",
    sourceType: "agent",
    sourceId: "1221",
    sourceName: "柳",
    label: "影画4：识破目标穿透率提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 4,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["yanagiRecognizedTarget"],
    },
    modifiers: [
      {
        bucket: "penetrationRate",
        value: () => 0.16,
      },
    ],
  },
  {
    id: "jane-m1-frenzy-ap-bonus",
    sourceType: "agent",
    sourceId: "1261",
    sourceName: "简",
    label: "影画1：狂热状态按异常精通追加增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["janeFrenzy"],
      minimumResolvedAnomalyProficiency: 0,
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: (context) =>
          Math.min((context.resolvedAnomalyProficiency ?? 0) * 0.001, 0.3),
      },
    ],
  },
  {
    id: "jane-core-assault-anomaly-crit-rate",
    sourceType: "agent",
    sourceId: "1261",
    sourceName: "简",
    label: "核心被动：强击异常暴击率（含异常精通追加）",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly"],
      attributes: ["Physical"],
      combatTags: ["gnawedTarget"],
      minimumResolvedAnomalyProficiency: 0,
    },
    modifiers: [
      {
        bucket: "anomalyCritRate",
        value: (context) =>
          byCoreSkill(janeCoreAnomalyCritRate)(context) +
          (context.resolvedAnomalyProficiency ?? 0) *
            byCoreSkill(janeCoreAnomalyCritRatePerProficiency)(context),
      },
    ],
  },
  {
    id: "jane-core-assault-anomaly-crit-damage",
    sourceType: "agent",
    sourceId: "1261",
    sourceName: "简",
    label: "核心被动：强击异常暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly"],
      attributes: ["Physical"],
      combatTags: ["gnawedTarget"],
    },
    modifiers: [
      {
        bucket: "anomalyCritDamage",
        value: () => 0.5,
      },
    ],
  },
  {
    id: "jane-m2-gnawed-defense-reduction",
    sourceType: "agent",
    sourceId: "1261",
    sourceName: "简",
    label: "影画2：啮咬目标减防",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["gnawedTarget"],
    },
    modifiers: [
      {
        bucket: "defenseReduction",
        value: () => 0.15,
      },
    ],
  },
  {
    id: "jane-m2-assault-anomaly-crit-damage",
    sourceType: "agent",
    sourceId: "1261",
    sourceName: "简",
    label: "影画2：强击异常暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["anomaly"],
      attributes: ["Physical"],
      combatTags: ["gnawedTarget"],
    },
    modifiers: [
      {
        bucket: "anomalyCritDamage",
        value: () => 0.5,
      },
    ],
  },
  {
    id: "jane-m4-anomaly-bonus",
    sourceType: "agent",
    sourceId: "1261",
    sourceName: "简",
    label: "影画4：强击/紊乱后异常伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 4,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["assaultOrDisorderTriggered"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.18,
      },
    ],
  },
  {
    id: "piper-extra-team-bonus",
    sourceType: "agent",
    sourceId: "1281",
    sourceName: "派派",
    label: "额外能力：满层动力全队增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      combatTags: ["piperOverdrive"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.18,
      },
    ],
  },
  {
    id: "vivian-extra-corruption-anomaly-bonus",
    sourceType: "agent",
    sourceId: "1331",
    sourceName: "薇薇安",
    label: "额外能力：侵蚀异常伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      damageTypes: ["anomaly"],
      attributes: ["Ether"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.12,
      },
    ],
  },
  {
    id: "vivian-extra-corruption-disorder-bonus",
    sourceType: "agent",
    sourceId: "1331",
    sourceName: "薇薇安",
    label: "额外能力：侵蚀来源紊乱伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      damageTypes: ["disorder"],
      disorderSourceTypes: ["ether"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.12,
      },
    ],
  },
  {
    id: "vivian-m1-prophecy-anomaly-bonus",
    sourceType: "agent",
    sourceId: "1331",
    sourceName: "薇薇安",
    label: "影画1：预言目标异常/紊乱伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["prophecyTarget"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.16,
      },
    ],
  },
  {
    id: "vivian-m2-ether-ignore-resistance",
    sourceType: "agent",
    sourceId: "1331",
    sourceName: "薇薇安",
    label: "影画2：以太异常/紊乱无视抗性",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["anomaly", "disorder"],
      attributes: ["Ether"],
    },
    modifiers: [
      {
        bucket: "ignoreResistance",
        value: () => 0.15,
      },
    ],
  },
  {
    id: "alice-core-physical-disorder-bonus",
    sourceType: "agent",
    sourceId: "1401",
    sourceName: "爱丽丝",
    label: "核心被动：物理异常剩余时间提升紊乱倍率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["disorder"],
      disorderSourceTypes: ["physical"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: (context) => Math.min((context.remainingTime ?? 0) * 0.18, 1.8),
      },
    ],
  },
  {
    id: "alice-extra-anomaly-mastery-to-proficiency",
    sourceType: "agent",
    sourceId: "1401",
    sourceName: "爱丽丝",
    label: "额外能力：异常掌控转异常精通",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      requireExtraAbility: true,
      damageTypes: ["anomaly", "disorder"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: aliceExtraAnomalyProficiencyFromMastery,
      },
    ],
  },
  {
    id: "alice-state-polarity-assault-ratio",
    sourceType: "agent",
    sourceId: "1401",
    sourceName: "爱丽丝",
    label: "状态快照：[极性强击] 结算倍率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly"],
      attributes: ["Physical"],
      stateSnapshotFlags: ["alicePolarityAssaultState"],
      requiredStateValues: ["alicePolarityAssaultDamageRatio"],
      minimumStateValues: {
        alicePolarityAssaultDamageRatio: Number.EPSILON,
      },
    },
    modifiers: [
      {
        bucket: "skillMultiplierFactor",
        value: stateMultiplierDelta("alicePolarityAssaultDamageRatio"),
      },
    ],
  },
  {
    id: "alice-m1-after-assault-defense-reduction",
    sourceType: "agent",
    sourceId: "1401",
    sourceName: "爱丽丝",
    label: "影画1：强击后减防",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["aliceAfterAssault"],
    },
    modifiers: [
      {
        bucket: "defenseReduction",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "alice-m2-physical-disorder-bonus",
    sourceType: "agent",
    sourceId: "1401",
    sourceName: "爱丽丝",
    label: "影画2：物理来源紊乱伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["disorder"],
      disorderSourceTypes: ["physical"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.15,
      },
    ],
  },
  {
    id: "alice-m4-physical-ignore-resistance",
    sourceType: "agent",
    sourceId: "1401",
    sourceName: "爱丽丝",
    label: "影画4：物理异常/紊乱无视抗性",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 4,
      damageTypes: ["anomaly", "disorder"],
      attributes: ["Physical"],
    },
    modifiers: [
      {
        bucket: "ignoreResistance",
        value: () => 0.1,
      },
    ],
  },
  {
    id: "aria-core-anomaly-proficiency",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "核心被动：异常精通提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byCoreSkill(ariaCoreAnomalyProficiency),
      },
    ],
  },
  {
    id: "aria-m1-anomaly-crit-rate",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "影画1：异放异常暴击率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      damageTypes: ["anomaly", "disorder"],
    },
    modifiers: [
      {
        bucket: "anomalyCritRate",
        value: ariaM1AnomalyCritRate,
      },
    ],
  },
  {
    id: "aria-m1-anomaly-crit-damage",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "影画1：异放异常暴击伤害",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 1,
      damageTypes: ["anomaly", "disorder"],
    },
    modifiers: [
      {
        bucket: "anomalyCritDamage",
        value: () => 0.25,
      },
    ],
  },
  {
    id: "aria-m2-defense-penetration",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "影画2：异放无视防御",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["anomaly", "disorder"],
    },
    modifiers: [
      {
        bucket: "defenseReduction",
        value: () => 0.16,
      },
    ],
  },
  {
    id: "aria-m2-dreamtime-defense-penetration",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "影画2：妄想时刻额外无视防御",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      minimumMindscape: 2,
      damageTypes: ["anomaly", "disorder"],
      combatTags: ["ariaDreamtime"],
    },
    modifiers: [
      {
        bucket: "defenseReduction",
        value: () => 0.08,
      },
    ],
  },
  {
    id: "aria-dynamic-exflow-bonus",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "动态快照：[异放]额外倍率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly", "disorder"],
      requiredDynamicValues: ["ariaExflowDamageRatio"],
      minimumDynamicValues: {
        ariaExflowDamageRatio: Number.EPSILON,
      },
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: dynamicValue("ariaExflowDamageRatio"),
      },
    ],
  },
  {
    id: "aria-dynamic-stunned-bonus",
    sourceType: "agent",
    sourceId: "1501",
    sourceName: "爱芮",
    label: "动态快照：失衡目标[异放]额外倍率",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly", "disorder"],
      requireStunned: true,
      requiredDynamicValues: ["ariaStunnedDamageRatio"],
      minimumDynamicValues: {
        ariaStunnedDamageRatio: Number.EPSILON,
      },
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: dynamicValue("ariaStunnedDamageRatio"),
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
    id: "fusion-compiler-attack-percent",
    sourceType: "w-engine",
    sourceId: "14118",
    sourceName: "嵌合编译器",
    label: "音擎被动：攻击力提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "attackPercent",
        value: byRefinement(fusionCompilerAttackPercent),
      },
    ],
  },
  {
    id: "fusion-compiler-special-anomaly-proficiency",
    sourceType: "w-engine",
    sourceId: "14118",
    sourceName: "嵌合编译器",
    label: "音擎被动：特殊技/强化特殊技异常精通层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 3,
    maxStacks: 3,
    condition: {
      skillTags: ["special", "enhancedSpecial"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byRefinement(fusionCompilerAnomalyProficiency),
      },
    ],
  },
  {
    id: "soul-shell-anomaly-proficiency",
    sourceType: "w-engine",
    sourceId: "14150",
    sourceName: "壳中之灵",
    label: "音擎被动：异常精通提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byRefinement(soulShellAnomalyProficiency),
      },
    ],
  },
  {
    id: "soul-shell-target-anomalous-bonus",
    sourceType: "w-engine",
    sourceId: "14150",
    sourceName: "壳中之灵",
    label: "音擎被动：异常目标增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Ether"],
      combatTags: ["targetAnomalous"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(soulShellBonus),
      },
    ],
  },
  {
    id: "soul-shell-anomaly-bonus",
    sourceType: "w-engine",
    sourceId: "14150",
    sourceName: "壳中之灵",
    label: "音擎被动：异常伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly"],
      attributes: ["Ether"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: byRefinement(soulShellAnomalyBonus),
      },
    ],
  },
  {
    id: "practiced-perfection-physical-bonus",
    sourceType: "w-engine",
    sourceId: "14140",
    sourceName: "十方锻星",
    label: "音擎被动：强击后物理伤害提升层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 2,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      attributes: ["Physical"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(practicedPerfectionPhysicalBonus),
      },
    ],
  },
  {
    id: "flight-of-fancy-anomaly-proficiency",
    sourceType: "w-engine",
    sourceId: "14133",
    sourceName: "飞鸟星梦",
    label: "音擎被动：以太伤害异常精通层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 6,
    maxStacks: 6,
    condition: {
      attributes: ["Ether"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byRefinement(flightOfFancyAnomalyProficiency),
      },
    ],
  },
  {
    id: "sharpened-stinger-physical-bonus",
    sourceType: "w-engine",
    sourceId: "14126",
    sourceName: "淬锋钳刺",
    label: "音擎被动：猎意层数物理伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 3,
    maxStacks: 3,
    condition: {
      attributes: ["Physical"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(sharpenedStingerPhysicalBonus),
      },
    ],
  },
  {
    id: "timeweaver-anomaly-proficiency",
    sourceType: "w-engine",
    sourceId: "14122",
    sourceName: "时流贤者",
    label: "音擎被动：异常目标异常精通提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["special", "enhancedSpecial"],
      combatTags: ["targetAnomalous"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byRefinement(timeweaverAnomalyProficiency),
      },
    ],
  },
  {
    id: "timeweaver-disorder-bonus",
    sourceType: "w-engine",
    sourceId: "14122",
    sourceName: "时流贤者",
    label: "音擎被动：异常精通达标后紊乱伤害提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["disorder"],
      minimumResolvedAnomalyProficiency: 375,
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: byRefinement(timeweaverDisorderBonus),
      },
    ],
  },
  {
    id: "flamemaker-shaker-bonus",
    sourceType: "w-engine",
    sourceId: "14117",
    sourceName: "灼心摇壶",
    label: "音擎被动：伤害提升层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 10,
    maxStacks: 10,
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(flamemakerBonus),
      },
    ],
  },
  {
    id: "flamemaker-shaker-threshold-anomaly-proficiency",
    sourceType: "w-engine",
    sourceId: "14117",
    sourceName: "灼心摇壶",
    label: "音擎被动：≥5层额外异常精通",
    baselineEnabled: false,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly", "disorder"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byRefinement(flamemakerAnomalyProficiency),
      },
    ],
  },
  {
    id: "hailstorm-shrine-frost-bonus",
    sourceType: "w-engine",
    sourceId: "14109",
    sourceName: "霰落星殿",
    label: "音擎被动：烈霜伤害提升层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 2,
    maxStacks: 2,
    condition: {
      attributes: ["Frost"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(hailstormFrostBonus),
      },
    ],
  },
  {
    id: "electro-lip-gloss-attack-percent",
    sourceType: "w-engine",
    sourceId: "13009",
    sourceName: "触电唇彩",
    label: "音擎被动：异常目标攻击力提升",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["targetAnomalous"],
    },
    modifiers: [
      {
        bucket: "attackPercent",
        value: byRefinement(electroLipGlossAttackPercent),
      },
    ],
  },
  {
    id: "electro-lip-gloss-damage-bonus",
    sourceType: "w-engine",
    sourceId: "13009",
    sourceName: "触电唇彩",
    label: "音擎被动：异常目标增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      combatTags: ["targetAnomalous"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: byRefinement(electroLipGlossBonus),
      },
    ],
  },
  {
    id: "rainforest-gourmet-attack-percent",
    sourceType: "w-engine",
    sourceId: "13003",
    sourceName: "雨林饕客",
    label: "音擎被动：攻击力层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 10,
    maxStacks: 10,
    modifiers: [
      {
        bucket: "attackPercent",
        value: byRefinement(rainforestAttackPercent),
      },
    ],
  },
  {
    id: "weeping-gemini-anomaly-proficiency",
    sourceType: "w-engine",
    sourceId: "13008",
    sourceName: "双生泣星",
    label: "音擎被动：属性异常触发后异常精通层数",
    baselineEnabled: true,
    fullBuffEnabled: true,
    baselineStacks: 1,
    fullBuffStacks: 4,
    maxStacks: 4,
    condition: {
      combatTags: ["anomalyApplied"],
    },
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: byRefinement(weepingGeminiAnomalyProficiency),
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
    id: "freedom-2pc-anomaly-proficiency",
    sourceType: "drive-disc",
    sourceId: "31300",
    sourceName: "自由蓝调",
    label: "2件套：异常精通",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: () => 30,
      },
    ],
  },
  {
    id: "chaos-jazz-2pc-anomaly-proficiency",
    sourceType: "drive-disc",
    sourceId: "31800",
    sourceName: "混沌爵士",
    label: "2件套：异常精通",
    baselineEnabled: true,
    fullBuffEnabled: true,
    modifiers: [
      {
        bucket: "anomalyProficiency",
        value: () => 30,
      },
    ],
  },
  {
    id: "chaos-jazz-4pc-fire-electric-bonus",
    sourceType: "drive-disc",
    sourceId: "31800",
    sourceName: "混沌爵士",
    label: "4件套：火/电属性增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      attributes: ["Fire", "Electric"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.15,
      },
    ],
  },
  {
    id: "chaos-jazz-4pc-off-field-bonus",
    sourceType: "drive-disc",
    sourceId: "31800",
    sourceName: "混沌爵士",
    label: "4件套：后场强化特殊技/支援攻击增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      skillTags: ["enhancedSpecial", "assist"],
      combatTags: ["offField"],
    },
    modifiers: [
      {
        bucket: "bonusDamageSum",
        value: () => 0.2,
      },
    ],
  },
  {
    id: "chaos-metal-2pc-ether-anomaly-bonus",
    sourceType: "drive-disc",
    sourceId: "32300",
    sourceName: "混沌重金属",
    label: "2件套：以太异常增伤",
    baselineEnabled: true,
    fullBuffEnabled: true,
    condition: {
      damageTypes: ["anomaly"],
      attributes: ["Ether"],
    },
    modifiers: [
      {
        bucket: "anomalyBonusDamageSum",
        value: () => 0.1,
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

interface StaticBuildSourceNote {
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId: string
  minimumPieces?: 2 | 4
  minimumMindscape?: number
  requireStunned?: boolean
  requiresAnomalyMastery?: boolean
  requiresMissingAnomalyMastery?: boolean
  requiresEnergyGenerationRate?: boolean
  requiresMissingEnergyGenerationRate?: boolean
  requiredDynamicFlags?: readonly ("ariaDreamtime" | "burniceEmberState")[]
  requiresMissingDynamicFlags?: readonly (
    | "ariaDreamtime"
    | "burniceEmberState"
  )[]
  requiredDynamicCounts?: readonly "burniceEmberExtraTriggers"[]
  requiresMissingDynamicCounts?: readonly "burniceEmberExtraTriggers"[]
  requiredDynamicValues?: readonly (
    | "ariaExflowDamageRatio"
    | "ariaStunnedDamageRatio"
    | "burniceEmberDamageRatio"
  )[]
  requiredStateFlags?: readonly (
    | "alicePolarityAssaultState"
    | "miyabiFrostburnBreakState"
  )[]
  requiresMissingStateFlags?: readonly (
    | "alicePolarityAssaultState"
    | "miyabiFrostburnBreakState"
  )[]
  requiredStateValues?: readonly (
    | "alicePolarityAssaultDamageRatio"
    | "miyabiFrostburnBreakDamageRatio"
  )[]
  requiresMissingStateValues?: readonly (
    | "alicePolarityAssaultDamageRatio"
    | "miyabiFrostburnBreakDamageRatio"
  )[]
  requiredResolvedSnapshotBuckets?: readonly StaticBuildResolvedSnapshotBucketKey[]
  requiresMissingResolvedSnapshotBuckets?: readonly StaticBuildResolvedSnapshotBucketKey[]
  requiredResolvedSnapshotMultipliers?: readonly StaticBuildResolvedSnapshotMultiplierKey[]
  requiresMissingResolvedSnapshotMultipliers?: readonly StaticBuildResolvedSnapshotMultiplierKey[]
  requiresMissingDynamicValues?: readonly (
    | "ariaExflowDamageRatio"
    | "ariaStunnedDamageRatio"
    | "burniceEmberDamageRatio"
  )[]
  damageTypes?: readonly ("normal" | "sheer" | "anomaly" | "disorder")[]
  disorderSourceTypes?: readonly (
    | "fire"
    | "electric"
    | "ether"
    | "ice"
    | "physical"
    | "auricInk"
    | "frost"
  )[]
  ownerOverride?: StaticBuildSourceNoteOwner
  statusOverride?: StaticBuildSourceNoteStatus
  keysOverride?: readonly string[]
  note: string
}

function hasNoteCondition(
  note: StaticBuildSourceNote,
  input: {
    missingKey: keyof StaticBuildSourceNote
    presentKey: keyof StaticBuildSourceNote
  },
) {
  return (
    (Array.isArray(note[input.missingKey]) &&
      note[input.missingKey].length > 0) ||
    (Array.isArray(note[input.presentKey]) && note[input.presentKey].length > 0)
  )
}

function inferStaticBuildSourceNoteOwner(
  note: StaticBuildSourceNote,
): StaticBuildSourceNoteOwner {
  if (note.ownerOverride) return note.ownerOverride
  if (
    note.requiresAnomalyMastery ||
    note.requiresMissingAnomalyMastery ||
    note.requiresEnergyGenerationRate ||
    note.requiresMissingEnergyGenerationRate
  ) {
    return "finalPanel"
  }
  if (
    hasNoteCondition(note, {
      missingKey: "requiresMissingDynamicFlags",
      presentKey: "requiredDynamicFlags",
    }) ||
    hasNoteCondition(note, {
      missingKey: "requiresMissingDynamicCounts",
      presentKey: "requiredDynamicCounts",
    }) ||
    hasNoteCondition(note, {
      missingKey: "requiresMissingDynamicValues",
      presentKey: "requiredDynamicValues",
    })
  ) {
    return "dynamicSnapshot"
  }
  if (
    hasNoteCondition(note, {
      missingKey: "requiresMissingStateFlags",
      presentKey: "requiredStateFlags",
    }) ||
    hasNoteCondition(note, {
      missingKey: "requiresMissingStateValues",
      presentKey: "requiredStateValues",
    })
  ) {
    return "stateSnapshot"
  }
  if (
    hasNoteCondition(note, {
      missingKey: "requiresMissingResolvedSnapshotBuckets",
      presentKey: "requiredResolvedSnapshotBuckets",
    }) ||
    hasNoteCondition(note, {
      missingKey: "requiresMissingResolvedSnapshotMultipliers",
      presentKey: "requiredResolvedSnapshotMultipliers",
    })
  ) {
    return "resolvedSnapshot"
  }
  return "process"
}

function inferStaticBuildSourceNoteStatus(
  note: StaticBuildSourceNote,
): StaticBuildSourceNoteStatus {
  if (note.statusOverride) return note.statusOverride
  if (
    note.requiresMissingAnomalyMastery ||
    note.requiresMissingEnergyGenerationRate ||
    (note.requiresMissingDynamicFlags?.length ?? 0) > 0 ||
    (note.requiresMissingDynamicCounts?.length ?? 0) > 0 ||
    (note.requiresMissingDynamicValues?.length ?? 0) > 0 ||
    (note.requiresMissingStateFlags?.length ?? 0) > 0 ||
    (note.requiresMissingStateValues?.length ?? 0) > 0 ||
    (note.requiresMissingResolvedSnapshotBuckets?.length ?? 0) > 0 ||
    (note.requiresMissingResolvedSnapshotMultipliers?.length ?? 0) > 0
  ) {
    return "missing-input"
  }
  if (
    note.requiresAnomalyMastery ||
    note.requiresEnergyGenerationRate ||
    (note.requiredDynamicFlags?.length ?? 0) > 0 ||
    (note.requiredDynamicCounts?.length ?? 0) > 0 ||
    (note.requiredDynamicValues?.length ?? 0) > 0 ||
    (note.requiredStateFlags?.length ?? 0) > 0 ||
    (note.requiredStateValues?.length ?? 0) > 0 ||
    (note.requiredResolvedSnapshotBuckets?.length ?? 0) > 0 ||
    (note.requiredResolvedSnapshotMultipliers?.length ?? 0) > 0
  ) {
    return "resolved"
  }
  return "process-only"
}

function inferStaticBuildSourceNoteGuidance(
  owner: StaticBuildSourceNoteOwner,
  status: StaticBuildSourceNoteStatus,
): StaticBuildSourceNoteGuidance {
  if (status === "research-only") {
    return { kind: "keep-research-only" }
  }
  if (status === "process-only") {
    return { kind: "keep-process-only" }
  }
  if (status === "resolved") {
    return {
      kind: "input-applied",
      target:
        owner === "finalPanel" ||
        owner === "dynamicSnapshot" ||
        owner === "stateSnapshot" ||
        owner === "resolvedSnapshot"
          ? owner
          : undefined,
    }
  }
  return {
    kind: "provide-input",
    target:
      owner === "finalPanel" ||
      owner === "dynamicSnapshot" ||
      owner === "stateSnapshot" ||
      owner === "resolvedSnapshot"
        ? owner
        : undefined,
  }
}

function collectStaticBuildSourceNoteKeys(
  note: StaticBuildSourceNote,
): string[] {
  if (note.keysOverride) {
    return [...note.keysOverride]
  }
  const keys = new Set<string>()
  if (note.requiresAnomalyMastery || note.requiresMissingAnomalyMastery) {
    keys.add("finalPanel.anomalyMastery")
  }
  if (
    note.requiresEnergyGenerationRate ||
    note.requiresMissingEnergyGenerationRate
  ) {
    keys.add("finalPanel.energyGenerationRate")
  }
  for (const key of note.requiredDynamicFlags ?? []) {
    keys.add(`scenario.dynamicSnapshot.flags.${key}`)
  }
  for (const key of note.requiresMissingDynamicFlags ?? []) {
    keys.add(`scenario.dynamicSnapshot.flags.${key}`)
  }
  for (const key of note.requiredDynamicCounts ?? []) {
    keys.add(`scenario.dynamicSnapshot.counts.${key}`)
  }
  for (const key of note.requiresMissingDynamicCounts ?? []) {
    keys.add(`scenario.dynamicSnapshot.counts.${key}`)
  }
  for (const key of note.requiredDynamicValues ?? []) {
    keys.add(`scenario.dynamicSnapshot.values.${key}`)
  }
  for (const key of note.requiresMissingDynamicValues ?? []) {
    keys.add(`scenario.dynamicSnapshot.values.${key}`)
  }
  for (const key of note.requiredStateFlags ?? []) {
    keys.add(`scenario.stateSnapshot.flags.${key}`)
  }
  for (const key of note.requiresMissingStateFlags ?? []) {
    keys.add(`scenario.stateSnapshot.flags.${key}`)
  }
  for (const key of note.requiredStateValues ?? []) {
    keys.add(`scenario.stateSnapshot.values.${key}`)
  }
  for (const key of note.requiresMissingStateValues ?? []) {
    keys.add(`scenario.stateSnapshot.values.${key}`)
  }
  for (const key of note.requiredResolvedSnapshotBuckets ?? []) {
    keys.add(`scenario.resolvedSnapshot.bucketDeltas.${key}`)
  }
  for (const key of note.requiresMissingResolvedSnapshotBuckets ?? []) {
    keys.add(`scenario.resolvedSnapshot.bucketDeltas.${key}`)
  }
  for (const key of note.requiredResolvedSnapshotMultipliers ?? []) {
    keys.add(`scenario.resolvedSnapshot.multiplierFactors.${key}`)
  }
  for (const key of note.requiresMissingResolvedSnapshotMultipliers ?? []) {
    keys.add(`scenario.resolvedSnapshot.multiplierFactors.${key}`)
  }
  return [...keys]
}

const staticBuildSourceNotes: readonly StaticBuildSourceNote[] = [
  {
    sourceType: "agent",
    sourceId: "1171",
    damageTypes: ["anomaly", "disorder"],
    requiresMissingDynamicFlags: ["burniceEmberState"],
    note: "柏妮思当前已展开额外能力带来的灼烧持续时间延长；[燃点]/[余烬]额外结算仍需要通过 scenario.dynamicSnapshot.flags.burniceEmberState 显式标记是否生效，未提供时不自动猜测。这一部分继续归 dynamicSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    damageTypes: ["anomaly", "disorder"],
    requiredDynamicFlags: ["burniceEmberState"],
    requiresMissingDynamicCounts: ["burniceEmberExtraTriggers"],
    note: "柏妮思的[燃点]/[余烬]额外结算次数当前需要通过 scenario.dynamicSnapshot.counts.burniceEmberExtraTriggers 显式提供；未提供时不自动猜测。这一部分继续归 dynamicSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    damageTypes: ["anomaly", "disorder"],
    requiredDynamicFlags: ["burniceEmberState"],
    requiresMissingDynamicValues: ["burniceEmberDamageRatio"],
    note: "柏妮思的[燃点]/[余烬]额外结算倍率当前需要通过 scenario.dynamicSnapshot.values.burniceEmberDamageRatio 显式提供；未提供时不自动猜测。这一部分继续归 dynamicSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    damageTypes: ["anomaly", "disorder"],
    requiredDynamicFlags: ["burniceEmberState"],
    requiredDynamicCounts: ["burniceEmberExtraTriggers"],
    requiredDynamicValues: ["burniceEmberDamageRatio"],
    note: "柏妮思当前已展开额外能力带来的灼烧持续时间延长，并按 scenario.dynamicSnapshot 的[燃点]/[余烬]快照展开额外结算倍率；触发链、异常积蓄效率与间隔降低仍未在 static resolver 中展开，属于真动态过程。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    minimumMindscape: 1,
    requiresMissingEnergyGenerationRate: true,
    note: "柏妮思的潜能觉醒：沸点派对 依赖 finalPanel.energyGenerationRate；未提供时，初始能量自动回复转异常掌控与伤害提升未展开。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    minimumMindscape: 1,
    requiresEnergyGenerationRate: true,
    note: "柏妮思当前已按 finalPanel.energyGenerationRate 展开潜能觉醒：沸点派对 的异常掌控与伤害提升；[余烬]间隔降低仍未在 static resolver 中展开，属于真动态过程，不继续扩 finalPanel。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    minimumMindscape: 1,
    note: "柏妮思的影画1[热络同心]中，[余烬]倍率提升与异常积蓄值提升仍未在 static resolver 中展开；若后续要静态快照化，优先继续归 dynamicSnapshot，而不是扩 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    minimumMindscape: 2,
    note: '柏妮思的影画2[热意洞穿]当前可通过 combatTags: ["burniceHeatPenetration"] 显式启用，full-buff 默认按 5 层处理，manual 可通过 effectOverrides 调整层数；施加时机与持续时间仍需通过 combatTags / effectOverrides 显式表达，不新增新的 snapshot key。',
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    minimumMindscape: 6,
    damageTypes: ["anomaly", "disorder"],
    requiresMissingResolvedSnapshotBuckets: ["ignoreResistance"],
    note: "柏妮思的影画6中，25% 火抗无视当前可通过 scenario.resolvedSnapshot.bucketDeltas.ignoreResistance 显式提供；特殊[余烬]与额外[灼烧]结算仍未在 static resolver 中展开。",
  },
  {
    sourceType: "agent",
    sourceId: "1171",
    minimumMindscape: 6,
    damageTypes: ["anomaly", "disorder"],
    requiredResolvedSnapshotBuckets: ["ignoreResistance"],
    note: "柏妮思的影画6 25% 火抗无视当前已按 scenario.resolvedSnapshot.bucketDeltas.ignoreResistance 记录；特殊[余烬]与额外[灼烧]结算仍未在 static resolver 中展开。",
  },
  {
    sourceType: "agent",
    sourceId: "1301",
    requiresMissingEnergyGenerationRate: true,
    damageTypes: ["normal"],
    note: "奥菲丝&「鬼火」的[准星聚焦]额外攻击力依赖 finalPanel.energyGenerationRate；未提供时仅展开核心技中的基础攻击力提升。",
  },
  {
    sourceType: "agent",
    sourceId: "1301",
    requiresEnergyGenerationRate: true,
    damageTypes: ["normal"],
    note: "奥菲丝&「鬼火」当前已按 finalPanel.energyGenerationRate 展开[准星聚焦]的额外攻击力；影画1的火抗无视、影画2的终结技后攻击力与影画4的强化特殊技/终结技增伤已可静态展开。后台自动释放与[蓄炎]循环属于真动态过程，不继续迁到 snapshot contract。",
  },
  {
    sourceType: "agent",
    sourceId: "1301",
    minimumMindscape: 2,
    note: "奥菲丝&「鬼火」的影画2喧响值回复仍未在 static resolver 中展开；当前只展开终结技后的攻击力提升。喧响值回复属于资源过程，不继续迁到 static snapshot contract。",
  },
  {
    sourceType: "agent",
    sourceId: "1301",
    minimumMindscape: 6,
    note: "奥菲丝&「鬼火」的影画6追加激光伤害与[蓄炎]回复仍未在 static resolver 中展开；两者都属于真动态过程，不继续迁到 static snapshot contract。",
  },
  {
    sourceType: "agent",
    sourceId: "1181",
    minimumMindscape: 2,
    damageTypes: ["anomaly", "disorder"],
    requiresMissingResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: '格莉丝的影画2当前可通过 combatTags: ["graceGrenadeHitTarget"] 显式展开电抗降低；[电能]层数获取与消耗仍属于状态 / 过程问题，不新增新的 snapshot key。若只关心电属性异常积蓄效率折算后的最终异常倍率，请通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 显式提供。',
  },
  {
    sourceType: "agent",
    sourceId: "1181",
    minimumMindscape: 2,
    damageTypes: ["anomaly", "disorder"],
    requiredResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: '格莉丝的影画2当前可通过 combatTags: ["graceGrenadeHitTarget"] 显式展开电抗降低；[电能]层数获取与消耗仍属于状态 / 过程问题，电属性异常积蓄效率折算后的最终异常倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。',
  },
  {
    sourceType: "agent",
    sourceId: "1221",
    damageTypes: ["anomaly", "disorder"],
    note: "柳的[月相]架势切换后电异常积蓄效率未在 static resolver 中展开；若 disorder 触发前未满足[月蚀]条件，请关闭对应 combatTags。月相切换与[月蚀]满足属于状态 / 战斗节奏问题，当前不新增新的 snapshot key。",
  },
  {
    sourceType: "agent",
    sourceId: "1221",
    minimumMindscape: 1,
    note: "柳的影画1当前已支持[洞悉]状态下的异常精通提升；洞悉层数获取与消耗仍未在 static resolver 中展开，属于资源 / 状态过程，不继续迁到新的 snapshot key。",
  },
  {
    sourceType: "agent",
    sourceId: "1221",
    minimumMindscape: 2,
    requiresMissingResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: '柳的影画2当前可通过 combatTags: ["yanagiExtraThrustDisorder"] 显式展开[极性紊乱]倍率提升，full-buff 默认按 2 次额外突刺处理，manual 可通过 effectOverrides 调整层数；电异常积蓄效率与能量消耗仍未在 static resolver 中展开。若已知该部分折算后的最终倍率，请通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 显式提供。',
  },
  {
    sourceType: "agent",
    sourceId: "1221",
    minimumMindscape: 2,
    requiredResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: '柳的影画2当前可通过 combatTags: ["yanagiExtraThrustDisorder"] 显式展开[极性紊乱]倍率提升，full-buff 默认按 2 次额外突刺处理，manual 可通过 effectOverrides 调整层数；电异常积蓄效率折算后的最终倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录，能量消耗仍未在 static resolver 中展开。',
  },
  {
    sourceType: "agent",
    sourceId: "1221",
    minimumMindscape: 4,
    note: "柳的影画4当前已支持[识破]目标的穿透率提升；[识破]施加时机与持续时间仍需通过 combatTags 显式表达。",
  },
  {
    sourceType: "agent",
    sourceId: "1261",
    damageTypes: ["anomaly", "disorder"],
    requiresMissingResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: '简的每点异常精通追加异常暴击率当前已自动折算；影画1的[狂热]状态异常精通转增伤当前可通过 combatTags: ["janeFrenzy"] 静态展开；[狂热]进入 / 退出属于状态问题，不新增新的 snapshot key。物理异常积蓄效率提升若已折算为最终异常倍率，请通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 显式提供。',
  },
  {
    sourceType: "agent",
    sourceId: "1261",
    damageTypes: ["anomaly", "disorder"],
    requiredResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: '简的每点异常精通追加异常暴击率当前已自动折算；影画1的[狂热]状态异常精通转增伤当前可通过 combatTags: ["janeFrenzy"] 静态展开；[狂热]进入 / 退出属于状态问题，物理异常积蓄效率折算后的最终异常倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。',
  },
  {
    sourceType: "agent",
    sourceId: "1261",
    minimumMindscape: 2,
    note: "简的影画2当前已支持[啮咬]目标减防与强击异常暴击伤害；队友触发[强击]时的同等判定仍需通过 combatTags 显式表达，不新增新的 snapshot key。",
  },
  {
    sourceType: "agent",
    sourceId: "1261",
    minimumMindscape: 4,
    note: "简的影画4当前已支持[强击]/[紊乱]后异常伤害提升；触发时机与持续时间仍需通过 combatTags 显式表达，不新增新的 snapshot key。",
  },
  {
    sourceType: "agent",
    sourceId: "1261",
    minimumMindscape: 6,
    note: "简的影画6[狂热]直入、暴击属性提升与额外攻击仍未在 static resolver 中展开；这些项都依赖真动态过程，不继续迁到静态 snapshot contract。",
  },
  {
    sourceType: "agent",
    sourceId: "1281",
    damageTypes: ["anomaly", "disorder"],
    requiresMissingResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: "派派的[动力]层数获取与消耗属于状态 / 过程问题，不新增新的 snapshot key；当前只支持额外能力的全队增伤快照。若已知[动力]层数对应的物理异常积蓄效率折算后的最终异常倍率，请通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 显式提供。",
  },
  {
    sourceType: "agent",
    sourceId: "1281",
    damageTypes: ["anomaly", "disorder"],
    requiredResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: "派派的[动力]层数获取与消耗属于状态 / 过程问题；其对应的物理异常积蓄效率折算后的最终异常倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。当前仍只支持额外能力的全队增伤快照。",
  },
  {
    sourceType: "agent",
    sourceId: "1331",
    damageTypes: ["anomaly", "disorder"],
    note: "薇薇安的[异放]比例与[薇薇安的预言]追击伤害未在 static resolver 中展开；当前已支持额外能力的侵蚀/紊乱增伤。若后续要静态快照化，优先评估是否应归到 dynamicSnapshot，而不是继续扩 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1331",
    minimumMindscape: 1,
    note: "薇薇安的影画1已支持[薇薇安的预言]目标的异常/紊乱增伤；[护羽]/[飞羽]消耗与回复仍未在 static resolver 中展开，属于真动态过程。",
  },
  {
    sourceType: "agent",
    sourceId: "1331",
    minimumMindscape: 2,
    requiresMissingResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: "薇薇安的影画2当前只展开以太异常/紊乱的 15% 无视抗性；[异放]精通收益提升若后续要静态快照化，优先仍归 dynamicSnapshot，不继续扩 resolvedSnapshot；异常积蓄效率若已折算为最终倍率，请通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 显式提供。",
  },
  {
    sourceType: "agent",
    sourceId: "1331",
    minimumMindscape: 2,
    requiredResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: "薇薇安的影画2当前只展开以太异常/紊乱的 15% 无视抗性；[异放]精通收益提升若后续要静态快照化，优先仍归 dynamicSnapshot；异常积蓄效率折算后的最终倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录。",
  },
  {
    sourceType: "agent",
    sourceId: "1401",
    requiresMissingAnomalyMastery: true,
    damageTypes: ["anomaly", "disorder"],
    note: "爱丽丝的异常掌控转异常精通未在 static resolver 中自动展开；如已知该快照，请通过 finalPanel.anomalyMastery 显式提供。当前已展开物理异常剩余时间对[紊乱]倍率的提升；若需计算[极性强击]，可通过 scenario.stateSnapshot 显式提供状态与倍率快照。",
  },
  {
    sourceType: "agent",
    sourceId: "1401",
    requiresAnomalyMastery: true,
    damageTypes: ["anomaly", "disorder"],
    note: "爱丽丝当前已按 finalPanel.anomalyMastery 快照展开异常掌控转异常精通；影画2的物理来源紊乱增伤与影画4的物理无视抗性可静态展开；若需计算[极性强击]，可通过 scenario.stateSnapshot 显式提供状态与倍率快照。",
  },
  {
    sourceType: "agent",
    sourceId: "1401",
    damageTypes: ["anomaly"],
    requiredStateFlags: ["alicePolarityAssaultState"],
    requiresMissingStateValues: ["alicePolarityAssaultDamageRatio"],
    note: "爱丽丝的[极性强击]当前需要通过 scenario.stateSnapshot.values.alicePolarityAssaultDamageRatio 显式提供 source-specific 结算倍率；未提供时不自动猜测。这一部分继续归 stateSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1401",
    damageTypes: ["anomaly"],
    requiredStateFlags: ["alicePolarityAssaultState"],
    requiredStateValues: ["alicePolarityAssaultDamageRatio"],
    note: "爱丽丝当前已按 scenario.stateSnapshot 展开[极性强击]的 source-specific 结算倍率；这一部分继续归 stateSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1401",
    minimumMindscape: 1,
    note: '爱丽丝的影画1当前可通过 combatTags: ["aliceAfterAssault"] 显式展开[强击]后的 20% 减防；[极性强击]可通过 scenario.stateSnapshot 显式提供倍率快照。',
  },
  {
    sourceType: "agent",
    sourceId: "1401",
    minimumMindscape: 6,
    note: "爱丽丝的影画6[决胜状态]追加攻击与次数上限仍未在 static resolver 中展开，属于真动态过程，不继续迁到新的 snapshot key。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    damageTypes: ["anomaly", "disorder"],
    requiresMissingDynamicValues: ["ariaExflowDamageRatio"],
    note: "爱芮的[异放]额外倍率当前需要通过 scenario.dynamicSnapshot.values.ariaExflowDamageRatio 显式提供；未提供时不自动猜测。这一部分继续归 dynamicSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    damageTypes: ["anomaly", "disorder"],
    requiredDynamicValues: ["ariaExflowDamageRatio"],
    note: "爱芮当前已按 scenario.dynamicSnapshot.values.ariaExflowDamageRatio 展开[异放]额外倍率。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    damageTypes: ["anomaly", "disorder"],
    requireStunned: true,
    requiresMissingDynamicValues: ["ariaStunnedDamageRatio"],
    note: "目标处于失衡时，爱芮的[异放]额外倍率当前需要通过 scenario.dynamicSnapshot.values.ariaStunnedDamageRatio 显式提供；未提供时不自动猜测。这一部分继续归 dynamicSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    damageTypes: ["anomaly", "disorder"],
    requireStunned: true,
    requiredDynamicValues: ["ariaStunnedDamageRatio"],
    note: "爱芮当前已按 scenario.dynamicSnapshot.values.ariaStunnedDamageRatio 展开失衡目标的[异放]额外倍率。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    minimumMindscape: 1,
    requiresMissingAnomalyMastery: true,
    damageTypes: ["anomaly", "disorder"],
    note: "爱芮的影画1当前已静态展开[异放]基础异常暴击率/暴击伤害；若已知初始异常掌控快照，请通过 finalPanel.anomalyMastery 显式提供，以展开超过100点后的额外暴击率。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    minimumMindscape: 1,
    requiresAnomalyMastery: true,
    damageTypes: ["anomaly", "disorder"],
    note: "爱芮的影画1当前已按 finalPanel.anomalyMastery 静态展开[异放]异常暴击率追加；基础异常暴击率/暴击伤害已默认纳入。",
  },
  {
    sourceType: "agent",
    sourceId: "1501",
    minimumMindscape: 2,
    damageTypes: ["anomaly", "disorder"],
    note: '爱芮的影画2当前已静态展开[异放]的 16% 无视防御；若处于[妄想时刻]，可通过 combatTags: ["ariaDreamtime"] 额外展开 8% 无视防御。[妄想时刻]本身继续通过 combatTags 显式表达，不新增新的 snapshot key。',
  },
  {
    sourceType: "agent",
    sourceId: "1091",
    damageTypes: ["anomaly", "disorder"],
    note: "雅的独立烈霜异常槽、[霜灼·破]与[霜灼]累积加成未在 static resolver 中展开；若当前轮次已知[霜灼·破]状态，可通过 scenario.stateSnapshot 显式提供。独立烈霜异常槽属于独立资源 / 积蓄过程，不继续迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1091",
    damageTypes: ["anomaly", "disorder"],
    requiredStateFlags: ["miyabiFrostburnBreakState"],
    requiresMissingStateValues: ["miyabiFrostburnBreakDamageRatio"],
    note: "雅的[霜灼·破]当前需要通过 scenario.stateSnapshot.values.miyabiFrostburnBreakDamageRatio 显式提供 source-specific 结算倍率；未提供时不自动猜测。这一部分继续归 stateSnapshot，不迁到 resolvedSnapshot。",
  },
  {
    sourceType: "agent",
    sourceId: "1091",
    damageTypes: ["anomaly", "disorder"],
    requiredStateFlags: ["miyabiFrostburnBreakState"],
    requiredStateValues: ["miyabiFrostburnBreakDamageRatio"],
    note: "雅当前已记录 scenario.stateSnapshot 的[霜灼·破]状态与倍率快照；这一部分继续归 stateSnapshot，不迁到 resolvedSnapshot。独立烈霜异常槽与额外烈霜伤害仍未并入现有 anomaly/disorder 公式。",
  },
  {
    sourceType: "w-engine",
    sourceId: "14117",
    damageTypes: ["anomaly", "disorder"],
    note: "灼心摇壶的后场能量自动回复未在 static resolver 中展开；当前已展开伤害层数与≥5层额外异常精通。后场能量自动回复属于真动态过程，不迁到 finalPanel 或 resolvedSnapshot。",
  },
  {
    sourceType: "w-engine",
    sourceId: "14122",
    damageTypes: ["anomaly", "disorder"],
    requiresMissingResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: "时流贤者的电属性异常积蓄效率未在 static resolver 中展开；当前只展开异常目标异常精通与异常精通达标后的紊乱增伤。若已知该部分折算后的最终倍率，请通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 显式提供。",
  },
  {
    sourceType: "w-engine",
    sourceId: "14122",
    damageTypes: ["anomaly", "disorder"],
    requiredResolvedSnapshotMultipliers: ["skillMultiplierFactor"],
    note: "时流贤者的电属性异常积蓄效率折算后的最终倍率已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 记录；当前只展开异常目标异常精通与异常精通达标后的紊乱增伤。",
  },
  {
    sourceType: "w-engine",
    sourceId: "14109",
    damageTypes: ["anomaly", "disorder"],
    ownerOverride: "sourceView",
    statusOverride: "research-only",
    note: "霰落星殿的暴击伤害被动不进入 anomaly/disorder 当前公式；若后续需要表达对应的额外伤害，优先走 source-specific damage view，而不是继续扩现有 snapshot contract。当前只展开烈霜伤害层数。",
  },
  {
    sourceType: "w-engine",
    sourceId: "13128",
    damageTypes: ["anomaly", "disorder"],
    note: "轰鸣座驾的随机三选一增益未在 static resolver 中确定展开；攻击力 / 异常精通分支若已确定，可分别折算到 finalPanel，异常积蓄效率分支若已折算为最终异常倍率，可通过 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 提供。随机分支选择本身仍属于真动态过程。",
  },
  {
    sourceType: "w-engine",
    sourceId: "14140",
    requiresMissingAnomalyMastery: true,
    damageTypes: ["anomaly", "disorder"],
    note: "十方锻星的异常掌控提升未在 static resolver 中自动推导；如已知该快照，请通过 finalPanel.anomalyMastery 显式提供。当前只展开稳定的物理伤害层数。",
  },
  {
    sourceType: "w-engine",
    sourceId: "14140",
    requiresAnomalyMastery: true,
    damageTypes: ["anomaly", "disorder"],
    note: "十方锻星的[强击]触发/接战即满层逻辑未在 static resolver 中展开；异常掌控部分可通过 finalPanel.anomalyMastery 快照体现，当前只展开稳定的物理伤害层数。满层触发时机属于状态 / 过程问题，不继续迁到新的 snapshot key。",
  },
  {
    sourceType: "drive-disc",
    sourceId: "31300",
    minimumPieces: 4,
    damageTypes: ["anomaly", "disorder"],
    note: "自由蓝调 4件 的属性异常积蓄抗性降低属于积蓄过程效果，未在 static resolver 中展开；这一类来源保留为真动态过程，不继续迁到 resolvedSnapshot。",
  },
  {
    sourceType: "drive-disc",
    sourceId: "32300",
    minimumPieces: 4,
    damageTypes: ["anomaly", "disorder"],
    ownerOverride: "sourceView",
    statusOverride: "research-only",
    note: "混沌重金属 4件 的暴击伤害层数主要面向侵蚀额外伤害，不直接映射到 anomaly/disorder 当前公式；这一类来源若后续需要表达，应优先走 source-specific damage view，而不是继续扩现有 snapshot contract。当前只展开 2件 以太异常增伤。",
  },
]

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

function matchesStaticBuildSourceNote(
  note: StaticBuildSourceNote,
  input: {
    sourceType: StaticBuildEffectDefinition["sourceType"]
    sourceId?: string
    damageType: "normal" | "sheer" | "anomaly" | "disorder"
    agentMindscape?: number
    energyGenerationRate?: number
    anomalyMastery?: number
    dynamicSnapshot?: StaticBuildValueContext["dynamicSnapshot"]
    stateSnapshot?: StaticBuildValueContext["stateSnapshot"]
    resolvedSnapshot?: StaticBuildResolvedSnapshotInput
    isStunned?: boolean
    disorderSourceType?:
      | "fire"
      | "electric"
      | "ether"
      | "ice"
      | "physical"
      | "auricInk"
      | "frost"
    pieces?: 2 | 4
  },
) {
  if (!input.sourceId) return false
  if (
    note.sourceType !== input.sourceType ||
    note.sourceId !== input.sourceId
  ) {
    return false
  }
  if (note.minimumPieces && (input.pieces ?? 0) < note.minimumPieces) {
    return false
  }
  if (
    note.minimumMindscape !== undefined &&
    (input.agentMindscape ?? 0) < note.minimumMindscape
  ) {
    return false
  }
  if (note.requiresAnomalyMastery && input.anomalyMastery === undefined) {
    return false
  }
  if (
    note.requiresMissingAnomalyMastery &&
    input.anomalyMastery !== undefined
  ) {
    return false
  }
  if (
    note.requiresEnergyGenerationRate &&
    input.energyGenerationRate === undefined
  ) {
    return false
  }
  if (
    note.requiresMissingEnergyGenerationRate &&
    input.energyGenerationRate !== undefined
  ) {
    return false
  }
  if (note.requireStunned && input.isStunned !== true) {
    return false
  }
  if (
    note.requiredDynamicFlags &&
    note.requiredDynamicFlags.some(
      (key) => input.dynamicSnapshot?.flags?.[key] !== true,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingDynamicFlags &&
    note.requiresMissingDynamicFlags.every(
      (key) => input.dynamicSnapshot?.flags?.[key] === true,
    )
  ) {
    return false
  }
  if (
    note.requiredDynamicCounts &&
    note.requiredDynamicCounts.some(
      (key) => input.dynamicSnapshot?.counts?.[key] === undefined,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingDynamicCounts &&
    note.requiresMissingDynamicCounts.every(
      (key) => input.dynamicSnapshot?.counts?.[key] !== undefined,
    )
  ) {
    return false
  }
  if (
    note.requiredDynamicValues &&
    note.requiredDynamicValues.some(
      (key) => input.dynamicSnapshot?.values?.[key] === undefined,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingDynamicValues &&
    note.requiresMissingDynamicValues.every(
      (key) => input.dynamicSnapshot?.values?.[key] !== undefined,
    )
  ) {
    return false
  }
  if (
    note.requiredStateFlags &&
    note.requiredStateFlags.some(
      (key) => input.stateSnapshot?.flags?.[key] !== true,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingStateFlags &&
    note.requiresMissingStateFlags.every(
      (key) => input.stateSnapshot?.flags?.[key] === true,
    )
  ) {
    return false
  }
  if (
    note.requiredStateValues &&
    note.requiredStateValues.some(
      (key) => input.stateSnapshot?.values?.[key] === undefined,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingStateValues &&
    note.requiresMissingStateValues.every(
      (key) => input.stateSnapshot?.values?.[key] !== undefined,
    )
  ) {
    return false
  }
  if (
    note.requiredResolvedSnapshotBuckets &&
    note.requiredResolvedSnapshotBuckets.some(
      (key) => input.resolvedSnapshot?.bucketDeltas?.[key] === undefined,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingResolvedSnapshotBuckets &&
    note.requiresMissingResolvedSnapshotBuckets.every(
      (key) => input.resolvedSnapshot?.bucketDeltas?.[key] !== undefined,
    )
  ) {
    return false
  }
  if (
    note.requiredResolvedSnapshotMultipliers &&
    note.requiredResolvedSnapshotMultipliers.some(
      (key) => input.resolvedSnapshot?.multiplierFactors?.[key] === undefined,
    )
  ) {
    return false
  }
  if (
    note.requiresMissingResolvedSnapshotMultipliers &&
    note.requiresMissingResolvedSnapshotMultipliers.every(
      (key) => input.resolvedSnapshot?.multiplierFactors?.[key] !== undefined,
    )
  ) {
    return false
  }
  if (
    note.damageTypes &&
    !note.damageTypes.includes(input.damageType as "anomaly" | "disorder")
  ) {
    return false
  }
  if (
    note.disorderSourceTypes &&
    input.damageType === "disorder" &&
    (!input.disorderSourceType ||
      !note.disorderSourceTypes.includes(input.disorderSourceType))
  ) {
    return false
  }
  return true
}

export function getStaticBuildSourceNoteEntries(input: {
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId?: string
  damageType: "normal" | "sheer" | "anomaly" | "disorder"
  agentMindscape?: number
  energyGenerationRate?: number
  anomalyMastery?: number
  dynamicSnapshot?: StaticBuildValueContext["dynamicSnapshot"]
  stateSnapshot?: StaticBuildValueContext["stateSnapshot"]
  resolvedSnapshot?: StaticBuildResolvedSnapshotInput
  isStunned?: boolean
  disorderSourceType?:
    | "fire"
    | "electric"
    | "ether"
    | "ice"
    | "physical"
    | "auricInk"
    | "frost"
  pieces?: 2 | 4
}) {
  if (!input.sourceId) return []
  return staticBuildSourceNotes
    .filter((note) => matchesStaticBuildSourceNote(note, input))
    .map((note, index): StaticBuildSourceNoteEntry => {
      const owner = inferStaticBuildSourceNoteOwner(note)
      const status = inferStaticBuildSourceNoteStatus(note)

      return {
        id: `${note.sourceType}:${note.sourceId}:${index}`,
        sourceType: note.sourceType,
        sourceId: note.sourceId,
        owner,
        status,
        guidance: inferStaticBuildSourceNoteGuidance(owner, status),
        keys: collectStaticBuildSourceNoteKeys(note),
        message: note.note,
      }
    })
}

export function getStaticBuildSourceNotes(input: {
  sourceType: StaticBuildEffectDefinition["sourceType"]
  sourceId?: string
  damageType: "normal" | "sheer" | "anomaly" | "disorder"
  agentMindscape?: number
  energyGenerationRate?: number
  anomalyMastery?: number
  dynamicSnapshot?: StaticBuildValueContext["dynamicSnapshot"]
  stateSnapshot?: StaticBuildValueContext["stateSnapshot"]
  resolvedSnapshot?: StaticBuildResolvedSnapshotInput
  isStunned?: boolean
  disorderSourceType?:
    | "fire"
    | "electric"
    | "ether"
    | "ice"
    | "physical"
    | "auricInk"
    | "frost"
  pieces?: 2 | 4
}) {
  return getStaticBuildSourceNoteEntries(input).map((note) => note.message)
}

export function hasStaticBuildCoverageForSource(
  sourceType: StaticBuildEffectDefinition["sourceType"],
  sourceId: string | undefined,
) {
  if (!sourceId) return false
  return (
    hasStaticBuildEffectsForSource(sourceType, sourceId) ||
    staticBuildSourceNotes.some(
      (note) => note.sourceType === sourceType && note.sourceId === sourceId,
    )
  )
}

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
const yixuanCoreBonus = [
  0.3,
  0.35,
  0.4,
  0.45,
  0.5,
  0.55,
  0.6,
] as const

const riotCritRate = [0.15, 0.188, 0.226, 0.264, 0.3] as const
const riotChargeBonus = [0.35, 0.435, 0.52, 0.605, 0.7] as const
const heartstringCritDamage = [0.5, 0.575, 0.65, 0.725, 0.8] as const
const heartstringIgnoreResistance = [0.125, 0.145, 0.165, 0.185, 0.2] as const
const qingmingCritRate = [0.2, 0.23, 0.26, 0.29, 0.32] as const
const qingmingAttributeBonus = [0.08, 0.092, 0.104, 0.116, 0.128] as const
const qingmingSheerBonus = [0.1, 0.115, 0.13, 0.145, 0.16] as const

export const staticBuildEffectDefinitions = [
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

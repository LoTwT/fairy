import type { EffectAuthoringRecord } from "./types.ts"
import {
  P2_4D_NANOKA_W_ENGINES_13111_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_12013_DEFENSE_ON_HIT_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14114_BASIC_ATTACK_DAMAGE_STACKS_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_12004_TEAM_IMPACT_AFTER_EX_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_12009_IMPACT_AS_ACTIVE_CHARACTER_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_13005_IMPACT_PER_RETAINED_LAYER_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_13007_IMPACT_ON_HIT_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14110_IMPACT_PER_STACK_AFTER_EX_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14116_IMPACT_AFTER_ASSIST_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14125_IMPACT_PER_TEA_LAYER_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_1_LAYER_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_2_LAYER_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_3_LAYER_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14157_FIXED_IMPACT_POINTS_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14162_CRIT_RATE_SUPPLEMENT,
  P2_4D_NANOKA_W_ENGINES_14162_WIND_RESISTANCE_IGNORE_SUPPLEMENT,
} from "./w-engine-supplement-records.ts"

/**
 * P2-4d 一次性转录：revision 52 中 16 个仅有补充来源的音擎选项。
 * 这里只扩大作者层覆盖，不改正式 effects 制品。
 */
export const P2_4D_W_ENGINE_AUTHORING_RECORDS = [
  {
    key: "w-engine:13111:nanoka:red-axis-talent",
    supplementalRecords: [P2_4D_NANOKA_W_ENGINES_13111_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Drill_Rig_Red-Axis",
      identity: {
        kind: "w-engine",
        entityId: "13111",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:13111:refinement:red-axis",
      effectId: "w-engine:13111:nanoka:red-axis-talent",
    },
    section: "红莲电机",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13111/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13111/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13111/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13111/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13111/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["basic", "dash"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["electric"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.5,
          "2": 0.575,
          "3": 0.65,
          "4": 0.725,
          "5": 0.8,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:13111:refinement:red-axis",
      catalogEntityId: "w-engines:Drill_Rig_Red-Axis",
      name: "红莲电机 · dmgBonus",
      conditionDescription:
        "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升（按精炼 50/57.5/65/72.5/80%），持续 10 秒，15 秒内最多触发一次；触发状态与持续由调用方显式选择，不模拟冷却。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13111/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13111/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13111/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13111/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13111/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:13111:nanoka:red-axis-talent"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:12013:nanoka:defense-on-hit",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_12013_DEFENSE_ON_HIT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Identity_Base",
      identity: {
        kind: "w-engine",
        entityId: "12013",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:12013:defense-on-hit",
      effectId: "w-engine:12013:nanoka:defense-on-hit",
    },
    section: "沉击",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12013/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12013/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12013/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12013/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12013/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "defense",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.2,
          "2": 0.23,
          "3": 0.26,
          "4": 0.29,
          "5": 0.32,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:12013:defense-on-hit",
      catalogEntityId: "w-engines:Identity_Base",
      name: "沉击 · def",
      conditionDescription:
        "受到敌方攻击时，装备者的防御力提升（按精炼 20/23/26/29/32%），持续8秒；受击状态由调用方显式选择断言。音擎高级属性的常驻防御力不替代本被动。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12013/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12013/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12013/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12013/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12013/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:12013:nanoka:defense-on-hit"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14114:nanoka:basic-attack-damage-stacks",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14114_BASIC_ATTACK_DAMAGE_STACKS_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Weapon_S_1141",
      identity: {
        kind: "w-engine",
        entityId: "14114",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
      effectId: "w-engine:14114:nanoka:basic-attack-damage-stacks",
    },
    section: "束缚枷锁",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14114/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14114/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14114/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14114/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14114/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 5,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.skillCategory",
              values: ["basic"],
            },
            {
              kind: "one-of",
              fact: "hit.skillTag",
              values: ["zzz-hp:category:basic"],
            },
          ],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.06,
          "2": 0.075,
          "3": 0.09,
          "4": 0.105,
          "5": 0.12,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
      catalogEntityId: "w-engines:Weapon_S_1141",
      name: "束缚枷锁 · skillDmgBonus",
      conditionDescription:
        "攻击命中敌人时，[普通攻击]造成的伤害提升（按精炼每层 6/7.5/9/10.5/12%），最多叠加5层，每层持续8秒、同一招式内最多触发一次；有效层数由调用方显式选择，0 层表示关闭。受益范围为普通攻击直伤（原始 basic 分类或目录归一的普攻分类标签，含本体为追加攻击的普攻复合身份；纯追加身份不受益）。本选项只含伤害条款，[普通攻击]造成的失衡值提升不在本选项内。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14114/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14114/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14114/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14114/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14114/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 5,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14114:nanoka:basic-attack-damage-stacks"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:12004:nanoka:team-impact-after-ex",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_12004_TEAM_IMPACT_AFTER_EX_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Reverb_Mark_I",
      identity: {
        kind: "w-engine",
        entityId: "12004",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:12004:team-impact-after-ex",
      effectId: "w-engine:12004:nanoka:team-impact-after-ex",
    },
    section: "潮汐",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12004/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12004/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12004/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12004/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12004/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "team",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.08,
          "2": 0.09,
          "3": 0.1,
          "4": 0.11,
          "5": 0.12,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:12004:team-impact-after-ex",
      catalogEntityId: "w-engines:Reverb_Mark_I",
      name: "潮汐 · impact",
      conditionDescription:
        "发动[强化特殊技]时，全队角色冲击力提升（按精炼 8/9/10/11/12%），持续10秒，20秒内最多触发一次，同名被动效果之间不可叠加；触发状态由调用方显式选择断言。",
      target: "team",
      variants: [
        {
          target: "team",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12004/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12004/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12004/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12004/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12004/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:12004:nanoka:team-impact-after-ex"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:12009:nanoka:impact-as-active-character",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_12009_IMPACT_AS_ACTIVE_CHARACTER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Vortex_Hatchet",
      identity: {
        kind: "w-engine",
        entityId: "12009",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:12009:impact-as-active-character",
      effectId: "w-engine:12009:nanoka:impact-as-active-character",
    },
    section: "疾潮",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12009/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12009/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12009/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12009/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/12009/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.09,
          "2": 0.1,
          "3": 0.11,
          "4": 0.12,
          "5": 0.13,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:12009:impact-as-active-character",
      catalogEntityId: "w-engines:Vortex_Hatchet",
      name: "疾潮 · impact",
      conditionDescription:
        "成为接战状态下的当前操作角色时，装备者的冲击力提升（按精炼 9/10/11/12/13%），持续10秒，20秒内最多触发一次；状态与触发由调用方显式选择断言。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12009/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12009/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12009/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12009/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/12009/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:12009:nanoka:impact-as-active-character"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:13005:nanoka:impact-per-retained-layer",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_13005_IMPACT_PER_RETAINED_LAYER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Steam_Oven",
      identity: {
        kind: "w-engine",
        entityId: "13005",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:13005:impact-per-retained-layer",
      effectId: "w-engine:13005:nanoka:impact-per-retained-layer",
    },
    section: "浓厚汤底",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13005/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13005/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13005/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13005/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13005/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 8,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.02,
          "2": 0.023,
          "3": 0.026,
          "4": 0.029,
          "5": 0.032,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:13005:impact-per-retained-layer",
      catalogEntityId: "w-engines:Steam_Oven",
      name: "浓厚汤底 · impact",
      conditionDescription:
        "每拥有10点能量值，装备者的冲击力提升（按精炼每层 2/2.3/2.6/2.9/3.2%），最多叠加8层，能量消耗后保留8秒；有效保留层数由调用方显式选择，不从当前能量值推导。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13005/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13005/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13005/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13005/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13005/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 8,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:13005:nanoka:impact-per-retained-layer"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:13007:nanoka:impact-on-hit",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_13007_IMPACT_ON_HIT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Original_Transmorpher",
      identity: {
        kind: "w-engine",
        entityId: "13007",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:13007:impact-on-hit",
      effectId: "w-engine:13007:nanoka:impact-on-hit",
    },
    section: "骑士飞踢",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13007/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13007/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13007/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13007/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13007/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.1,
          "2": 0.115,
          "3": 0.13,
          "4": 0.145,
          "5": 0.16,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:13007:impact-on-hit",
      catalogEntityId: "w-engines:Original_Transmorpher",
      name: "骑士飞踢 · impact",
      conditionDescription:
        "受到敌方攻击时，装备者的冲击力提升（按精炼 10/11.5/13/14.5/16%），持续12秒；受击状态由调用方显式选择断言。已有的生命值上限提升条款为独立选项，不重复加入。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13007/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13007/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13007/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13007/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13007/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:13007:nanoka:impact-on-hit"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14110:nanoka:impact-per-stack-after-ex",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14110_IMPACT_PER_STACK_AFTER_EX_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Hellfire_Gears",
      identity: {
        kind: "w-engine",
        entityId: "14110",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14110:impact-per-stack-after-ex",
      effectId: "w-engine:14110:nanoka:impact-per-stack-after-ex",
    },
    section: "热血施工",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14110/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14110/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14110/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14110/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14110/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 2,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.1,
          "2": 0.125,
          "3": 0.15,
          "4": 0.175,
          "5": 0.2,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14110:impact-per-stack-after-ex",
      catalogEntityId: "w-engines:Hellfire_Gears",
      name: "热血施工 · impact",
      conditionDescription:
        "发动[强化特殊技]时，装备者的冲击力提升（按精炼每层 10/12.5/15/17.5/20%），最多叠加2层，每层持续10秒；有效层数由调用方显式选择。已有的后场回能条款为独立选项。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14110/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14110/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14110/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14110/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14110/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 2,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14110:nanoka:impact-per-stack-after-ex"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14116:nanoka:impact-after-assist",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14116_IMPACT_AFTER_ASSIST_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Blazing_Laurel",
      identity: {
        kind: "w-engine",
        entityId: "14116",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14116:impact-after-assist",
      effectId: "w-engine:14116:nanoka:impact-after-assist",
    },
    section: "流动之火",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14116/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14116/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14116/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14116/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14116/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.25,
          "2": 0.2875,
          "3": 0.325,
          "4": 0.3625,
          "5": 0.4,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14116:impact-after-assist",
      catalogEntityId: "w-engines:Blazing_Laurel",
      name: "流动之火 · impact",
      conditionDescription:
        "发动[快速支援]或[极限支援]时，装备者的冲击力提升（按精炼 25/28.75/32.5/36.25/40%），持续8秒；触发状态由调用方显式选择断言。已有的[萎靡]暴击伤害规则为独立选项，不受本选项影响。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14116/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14116/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14116/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14116/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14116/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14116:nanoka:impact-after-assist"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14125:nanoka:impact-per-tea-layer",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14125_IMPACT_PER_TEA_LAYER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Ice-Jade_Teapot",
      identity: {
        kind: "w-engine",
        entityId: "14125",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14125:impact-per-tea-layer",
      effectId: "w-engine:14125:nanoka:impact-per-tea-layer",
    },
    section: "泠泠连奏",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14125/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14125/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14125/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14125/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14125/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 30,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.007,
          "2": 0.0088,
          "3": 0.0105,
          "4": 0.0122,
          "5": 0.014,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14125:impact-per-tea-layer",
      catalogEntityId: "w-engines:Ice-Jade_Teapot",
      name: "泠泠连奏 · impact",
      conditionDescription:
        "[普通攻击]命中敌人时获得1层[茶劲]，每层[茶劲]使装备者的冲击力提升（按精炼 0.7/0.88/1.05/1.22/1.4%），最多叠加30层，每层持续8秒；有效层数由调用方显式选择。获得[茶劲]时≥15层触发的全队增伤是独立的10秒状态，由既有选项单独表达，不与当前[茶劲]层数绑死。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14125/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14125/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14125/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14125/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14125/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 30,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14125:nanoka:impact-per-tea-layer"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14136:nanoka:soul-chain-1-layer",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_1_LAYER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Spectral_Gaze",
      identity: {
        kind: "w-engine",
        entityId: "14136",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14136:soul-chain-1-layer",
      effectId: "w-engine:14136:nanoka:soul-chain-1-layer",
    },
    section: "捕风寻踪",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.04,
          "2": 0.046,
          "3": 0.052,
          "4": 0.058,
          "5": 0.064,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14136:soul-chain-1-layer",
      catalogEntityId: "w-engines:Spectral_Gaze",
      name: "捕风寻踪 · soulChain1Layer",
      conditionDescription:
        "当前有 1 层有效[魂锁]时，装备者的冲击力提升 4/4.6/5.2/5.8/6.4%（按精炼取值，即每层值 × 1 层的完整档位）；选择本档位即断言当前有效魂锁恰为 1 层，与其他档位互斥，0 层表示关闭。取得条件（后台电属性追加攻击触发减防）不作受益条件，不以命中元素或分类筛选。",
      target: "self",
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14136:nanoka:soul-chain-1-layer"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14136:nanoka:soul-chain-2-layer",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_2_LAYER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Spectral_Gaze",
      identity: {
        kind: "w-engine",
        entityId: "14136",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14136:soul-chain-2-layer",
      effectId: "w-engine:14136:nanoka:soul-chain-2-layer",
    },
    section: "捕风寻踪",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.08,
          "2": 0.092,
          "3": 0.104,
          "4": 0.116,
          "5": 0.128,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14136:soul-chain-2-layer",
      catalogEntityId: "w-engines:Spectral_Gaze",
      name: "捕风寻踪 · soulChain2Layer",
      conditionDescription:
        "当前有 2 层有效[魂锁]时，装备者的冲击力提升 8/9.2/10.4/11.6/12.8%（按精炼取值，即每层值 × 2 层的完整档位）；选择本档位即断言当前有效魂锁恰为 2 层，与其他档位互斥，0 层表示关闭。取得条件（后台电属性追加攻击触发减防）不作受益条件，不以命中元素或分类筛选。",
      target: "self",
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14136:nanoka:soul-chain-2-layer"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14136:nanoka:soul-chain-3-layer",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_3_LAYER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Spectral_Gaze",
      identity: {
        kind: "w-engine",
        entityId: "14136",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14136:soul-chain-3-layer",
      effectId: "w-engine:14136:nanoka:soul-chain-3-layer",
    },
    section: "捕风寻踪",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14136/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.2,
          "2": 0.23,
          "3": 0.26,
          "4": 0.29,
          "5": 0.32,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14136:soul-chain-3-layer",
      catalogEntityId: "w-engines:Spectral_Gaze",
      name: "捕风寻踪 · soulChain3Layer",
      conditionDescription:
        "当前有 3 层有效[魂锁]（叠满）时，装备者的冲击力提升 20/23/26/29/32%（按精炼取值，即每层 4/4.6/5.2/5.8/6.4% × 3 层 + 叠满额外 8/9.2/10.4/11.6/12.8%，一次完整计算）；选择本档位即断言当前有效魂锁恰为 3 层，与 1/2 层档位互斥，0 层表示关闭。取得条件（后台电属性追加攻击触发减防）不作受益条件，不以命中元素或分类筛选。",
      target: "self",
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14136/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14136:nanoka:soul-chain-3-layer"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14157:nanoka:fixed-impact-points",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14157_FIXED_IMPACT_POINTS_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Head_Lackey",
      identity: {
        kind: "w-engine",
        entityId: "14157",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14157:fixed-impact-points",
      effectId: "w-engine:14157:nanoka:fixed-impact-points",
    },
    section: "天才的扈从",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14157/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14157/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14157/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14157/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14157/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-fixed",
      value: {
        kind: "parameter",
        unit: "impact-points",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "impact-points",
        values: {
          "1": 30,
          "2": 33,
          "3": 36,
          "4": 39,
          "5": 42,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14157:fixed-impact-points",
      catalogEntityId: "w-engines:Head_Lackey",
      name: "天才的扈从 · impact",
      conditionDescription:
        "装备者的冲击力提升固定点数（按精炼 30/33/36/39/42 点）；与百分比冲击力分别计算，不随基础冲击力缩放，可供既有冲击力读取链消费，不实现最终失衡值。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14157/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14157/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14157/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14157/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14157/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14157:nanoka:fixed-impact-points"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14162:nanoka:crit-rate",
    supplementalRecords: [P2_4D_NANOKA_W_ENGINES_14162_CRIT_RATE_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Crimson_Moon_Casket",
      identity: {
        kind: "w-engine",
        entityId: "14162",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14162:crit-rate",
      effectId: "w-engine:14162:nanoka:crit-rate",
    },
    section: "绯月银棺：暴击率",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.24,
          "2": 0.26,
          "3": 0.28,
          "4": 0.3,
          "5": 0.32,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14162:crit-rate",
      catalogEntityId: "w-engines:Crimson_Moon_Casket",
      name: "绯月银棺 · critRate",
      conditionDescription:
        "装备者暴击率提升 24/26/28/30/32%（按精炼 1—5）；持有者常驻收益，由调用方选中本选项断言装备生效，不依赖任何触发状态。与风抗忽视、触发增伤相互独立。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14162:nanoka:crit-rate"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14162:nanoka:wind-resistance-ignore",
    supplementalRecords: [
      P2_4D_NANOKA_W_ENGINES_14162_WIND_RESISTANCE_IGNORE_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Crimson_Moon_Casket",
      identity: {
        kind: "w-engine",
        entityId: "14162",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14162:wind-resistance-ignore",
      effectId: "w-engine:14162:nanoka:wind-resistance-ignore",
    },
    section: "绯月银棺：风属性伤害抗性无视",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14162/details.zh.json",
        pointer: "/talents/5/desc",
      },
    ],
    config: {
      kind: "constant",
      value: true,
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    beneficiary: {
      kind: "holder",
    },
    scope: "hit",
    when: {
      kind: "one-of",
      fact: "hit.element",
      values: ["wind"],
    },
    operation: {
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          "1": 0.15,
          "2": 0.173,
          "3": 0.195,
          "4": 0.218,
          "5": 0.24,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14162:wind-resistance-ignore",
      catalogEntityId: "w-engines:Crimson_Moon_Casket",
      name: "绯月银棺 · resPen",
      conditionDescription:
        "装备者造成的伤害无视目标 15/17.3/19.5/21.8/24% 风属性伤害抗性（按精炼 1—5）；持有者的风属性伤害收益（按命中元素筛选，覆盖现有抗性区契约支持的全部风伤种类），常驻条款，不依赖强化特殊技触发。与暴击率、触发增伤相互独立。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            refinements: [1, 2, 3, 4, 5],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14162/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14162:nanoka:wind-resistance-ignore"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
] as const satisfies readonly EffectAuthoringRecord[]

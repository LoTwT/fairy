import type { EffectAuthoringRecord } from "./types.ts"
import {
  P2_4E_NANOKA_SOLDIER11_FLAME_PROWESS_SUPPLEMENT,
  P2_4E_NANOKA_LYCAON_ICE_HUNT_IMPACT_SUPPLEMENT,
  P2_4E_NANOKA_ALEXANDRINA_PERFECT_SERVICE_PIERCE_SUPPLEMENT,
  P2_4E_NANOKA_DRIVE_DISCS_31200_TWO_PIECE_IMPACT_PERCENT_SUPPLEMENT,
  P2_4E_NANOKA_KOLEDA_ENHANCED_BASIC_SECOND_PER_LAYER_SUPPLEMENT,
  P2_4E_NANOKA_AGENTS_CAESAR_STANCE_SWITCH_IMPACT_SUPPLEMENT,
  P2_4E_NANOKA_AGENTS_LIGHTER_MORALE_BURST_IMPACT_SUPPLEMENT,
  P2_4E_NANOKA_AGENTS_JUFUFU_TIGERS_ROAR_IMPACT_SUPPLEMENT,
  P2_4E_NANOKA_AGENTS_DIALYN_INITIAL_CRIT_RATE_IMPACT_SUPPLEMENT,
  P2_4E_NANOKA_AGENTS_ALEXANDRINA_MINDSCAPE_4_DEPLOYED_DOLLS_ENERGY_REGEN_SUPPLEMENT,
} from "./agent-supplement-source-records.ts"

/**
 * P2-4e 一次性转录：revision 52 中 10 个仅有补充来源的单变体代理人/驱动盘选项。
 * 这里只扩大作者层覆盖，不改正式 effects 制品。
 */
export const P2_4E_AGENT_AUTHORING_RECORDS = [
  {
    key: "agent:1041:nanoka:flame-prowess:mindscape:0",
    supplementalRecords: [P2_4E_NANOKA_SOLDIER11_FLAME_PROWESS_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:soldier11",
      identity: {
        kind: "agent",
        entityId: "1041",
      },
    },
    ids: {
      optionId: "nanoka:agents:soldier11:potential:flame-prowess",
      effectId: "agent:1041:nanoka:flame-prowess:mindscape:0",
    },
    section: "潜能觉醒：绝焰",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1041/details.zh.json",
        pointer: "/potentialDetail/104101/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1041/details.zh.json",
        pointer: "/potentialDetail/104102/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1041/details.zh.json",
        pointer: "/potentialDetail/104103/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1041/details.zh.json",
        pointer: "/potentialDetail/104104/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1041/details.zh.json",
        pointer: "/potentialDetail/104105/desc",
      },
    ],
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "potentialLevel",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 2,
      },
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
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalDamage",
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
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.16,
          "3": 0.24,
          "4": 0.32,
          "5": 0.4,
          "6": 0.48,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:soldier11:potential:flame-prowess",
      catalogEntityId: "agents:soldier11",
      name: "潜能觉醒：绝焰 · critDmg",
      conditionDescription:
        "额外能力：燎原生效时（队伍中存在与自身属性或阵营相同的角色，由调用方断言），自身暴击伤害提升（潜能 2—6：16/24/32/40/48%）。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1041/details.zh.json",
              pointer: "/potentialDetail/104101/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1041/details.zh.json",
              pointer: "/potentialDetail/104102/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1041/details.zh.json",
              pointer: "/potentialDetail/104103/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1041/details.zh.json",
              pointer: "/potentialDetail/104104/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1041/details.zh.json",
              pointer: "/potentialDetail/104105/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1041:nanoka:flame-prowess:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1141:nanoka:ice-hunt-impact:mindscape:0",
    supplementalRecords: [P2_4E_NANOKA_LYCAON_ICE_HUNT_IMPACT_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:lycaon",
      identity: {
        kind: "agent",
        entityId: "1141",
      },
    },
    ids: {
      optionId: "nanoka:agents:lycaon:potential:ice-hunt-impact",
      effectId: "agent:1141:nanoka:ice-hunt-impact:mindscape:0",
    },
    section: "潜能觉醒：掠冰",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1141/details.zh.json",
        pointer: "/potentialDetail/114101/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1141/details.zh.json",
        pointer: "/potentialDetail/114102/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1141/details.zh.json",
        pointer: "/potentialDetail/114103/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1141/details.zh.json",
        pointer: "/potentialDetail/114104/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1141/details.zh.json",
        pointer: "/potentialDetail/114105/desc",
      },
    ],
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "potentialLevel",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 2,
      },
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
          values: ["regular", "sheer"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["basic", "dash", "dodge-counter"],
        },
      ],
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
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.05,
          "3": 0.075,
          "4": 0.1,
          "5": 0.125,
          "6": 0.15,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:lycaon:potential:ice-hunt-impact",
      catalogEntityId: "agents:lycaon",
      name: "潜能觉醒：掠冰 · impact",
      conditionDescription:
        "围猎状态持续期间，作为非当前操作中代理人发动[普通攻击]、[冲刺攻击]和[闪避反击]时，冲击力提升（潜能 2—6：5/7.5/10/12.5/15%）；围猎状态与出站事实由调用方断言。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1141/details.zh.json",
              pointer: "/potentialDetail/114101/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1141/details.zh.json",
              pointer: "/potentialDetail/114102/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1141/details.zh.json",
              pointer: "/potentialDetail/114103/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1141/details.zh.json",
              pointer: "/potentialDetail/114104/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1141/details.zh.json",
              pointer: "/potentialDetail/114105/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1141:nanoka:ice-hunt-impact:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1211:nanoka:perfect-service-pierce:mindscape:0",
    supplementalRecords: [
      P2_4E_NANOKA_ALEXANDRINA_PERFECT_SERVICE_PIERCE_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:alexandrina",
      identity: {
        kind: "agent",
        entityId: "1211",
      },
    },
    ids: {
      optionId: "nanoka:agents:alexandrina:potential:perfect-service-pierce",
      effectId: "agent:1211:nanoka:perfect-service-pierce:mindscape:0",
    },
    section: "潜能觉醒：完美侍奉",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1211/details.zh.json",
        pointer: "/potentialDetail/121101/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1211/details.zh.json",
        pointer: "/potentialDetail/121102/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1211/details.zh.json",
        pointer: "/potentialDetail/121103/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1211/details.zh.json",
        pointer: "/potentialDetail/121104/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1211/details.zh.json",
        pointer: "/potentialDetail/121105/desc",
      },
    ],
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "potentialLevel",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 2,
      },
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
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "penetrationRatio",
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
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.016,
          "3": 0.032,
          "4": 0.048,
          "5": 0.064,
          "6": 0.08,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:alexandrina:potential:perfect-service-pierce",
      catalogEntityId: "agents:alexandrina",
      name: "潜能觉醒：完美侍奉 · penRate",
      conditionDescription:
        "潜能升级档累计的自身穿透率提升（1.6/3.2/4.8/6.4/8.0 个百分点）；与核心被动存在期间的攻击/防御转化分开选择。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1211/details.zh.json",
              pointer: "/potentialDetail/121101/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1211/details.zh.json",
              pointer: "/potentialDetail/121102/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1211/details.zh.json",
              pointer: "/potentialDetail/121103/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1211/details.zh.json",
              pointer: "/potentialDetail/121104/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1211/details.zh.json",
              pointer: "/potentialDetail/121105/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1211:nanoka:perfect-service-pierce:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "disc:31200:nanoka:two-piece-impact-percent:setPieces:2",
    supplementalRecords: [
      P2_4E_NANOKA_DRIVE_DISCS_31200_TWO_PIECE_IMPACT_PERCENT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "drive-discs:SuitShockstarDisco",
      identity: {
        kind: "drive-disc",
        entityId: "31200",
      },
    },
    ids: {
      optionId: "nanoka:drive-discs:31200:two-piece-impact-percent",
      effectId: "disc:31200:nanoka:two-piece-impact-percent:setPieces:2",
    },
    section: "2件套",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "drive-discs/31200/details.zh.json",
        pointer: "/desc2",
      },
    ],
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "setPieces",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 2,
      },
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
      stage: "initial-percentage",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "ratio",
        value: 0.06,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:drive-discs:31200:two-piece-impact-percent",
      catalogEntityId: "drive-discs:SuitShockstarDisco",
      name: "2件套 · impact",
      conditionDescription: "冲击力+6%。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumSetPieces: 2,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "drive-discs/31200/details.zh.json",
              pointer: "/desc2",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "disc:31200:nanoka:two-piece-impact-percent:setPieces:2",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1101:nanoka:enhanced-basic-second-per-layer:mindscape:0",
    supplementalRecords: [
      P2_4E_NANOKA_KOLEDA_ENHANCED_BASIC_SECOND_PER_LAYER_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:koleda",
      identity: {
        kind: "agent",
        entityId: "1101",
      },
    },
    ids: {
      optionId: "nanoka:agents:koleda:enhanced-basic-second-per-layer",
      effectId: "agent:1101:nanoka:enhanced-basic-second-per-layer:mindscape:0",
    },
    section: "普通攻击：砸扁，粉碎（潜能分支：强化普攻二段）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1101/details.zh.json",
        pointer: "/skill/basic/description/1/desc",
      },
    ],
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "potentialLevel",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
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
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:koleda-enhanced-basic-second"],
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
        kind: "constant",
        unit: "ratio",
        value: 0.1,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:koleda:enhanced-basic-second-per-layer",
      catalogEntityId: "agents:koleda",
      name: "强化普攻二段 · dmgBonus",
      conditionDescription:
        "潜能分支：本次强化[普通攻击]消耗的每层[熔炉升温]使第二段强化普攻造成的伤害提升 10%（最多 2 层，按本次实际消耗选择 0/1/2 层）。只作用于第二段强化普攻（含协同版本）；消耗触发的全队伤害 +35%（持续 40 秒）是独立选项，不与本次层数绑定。失衡值 +20% 不在伤害计算范围。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1101/details.zh.json",
              pointer: "/skill/basic/description/1/desc",
            },
          ],
          maximumLayers: 2,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1101:nanoka:enhanced-basic-second-per-layer:mindscape:0",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1071:nanoka:stance-switch-impact:mindscape:0",
    supplementalRecords: [
      P2_4E_NANOKA_AGENTS_CAESAR_STANCE_SWITCH_IMPACT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:caesar",
      identity: {
        kind: "agent",
        entityId: "1071",
      },
    },
    ids: {
      optionId: "nanoka:agents:caesar:stance-switch-impact",
      effectId: "agent:1071:nanoka:stance-switch-impact:mindscape:0",
    },
    section: "特殊技：攻防转换",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1071/details.zh.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1071/details.zh.json",
        pointer: "/skill/special/description/5/param/0/desc",
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
        rank: "specialSkillLevel",
        unit: "ratio",
        values: {
          "1": 0.09,
          "2": 0.1,
          "3": 0.11,
          "4": 0.12,
          "5": 0.13,
          "6": 0.14,
          "7": 0.15,
          "8": 0.16,
          "9": 0.17,
          "10": 0.18,
          "11": 0.19,
          "12": 0.2,
          "13": 0.21,
          "14": 0.22,
          "15": 0.23,
          "16": 0.24,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:caesar:stance-switch-impact",
      catalogEntityId: "agents:caesar",
      name: "攻防转换 · impact",
      conditionDescription:
        "触发[精准格挡]、[防御反击]或[招架支援]时，自身冲击力提升 (8+特殊技最终等级)%（1—16 级为 9%—24%），持续 3 秒；触发事实与持续由调用方显式选择断言。等级为已含影画加级的最终等级，不重复加级。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            specialSkillLevels: [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
            ],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1071/details.zh.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1071/details.zh.json",
              pointer: "/skill/special/description/5/param/0/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1071:nanoka:stance-switch-impact:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1161:nanoka:morale-burst-impact:mindscape:0",
    supplementalRecords: [
      P2_4E_NANOKA_AGENTS_LIGHTER_MORALE_BURST_IMPACT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:lighter",
      identity: {
        kind: "agent",
        entityId: "1161",
      },
    },
    ids: {
      optionId: "nanoka:agents:lighter:morale-burst-impact",
      effectId: "agent:1161:nanoka:morale-burst-impact:mindscape:0",
    },
    section: "核心被动：斗志昂扬（士气喷发）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161501/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161502/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161503/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161504/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161505/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161506/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
        pointer: "/passive/level/1161507/desc/0",
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
        value: 10,
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
        rank: "coreSkillLevel",
        unit: "ratio",
        values: {
          "1": 0.01,
          "2": 0.0117,
          "3": 0.0133,
          "4": 0.015,
          "5": 0.0167,
          "6": 0.0183,
          "7": 0.02,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:lighter:morale-burst-impact",
      catalogEntityId: "agents:lighter",
      name: "士气喷发 · impact",
      conditionDescription:
        "[士气喷发]状态中，威力提升后的招式命中敌人会持续消耗[士气]，每消耗 10 点[士气]使冲击力提升（核心 1—7 每层 1/1.17/1.33/1.5/1.67/1.83/2%），最多 10 层（即来源上限 10%—20%），持续 6 秒；有效层数由调用方显式选择，不从当前士气推导，0 层表示关闭。与[昂扬]完整状态是不同机制，各自独立选择。",
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
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161501/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161502/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161503/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161504/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161505/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161506/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/passive/level/1161507/desc/0",
            },
          ],
          maximumLayers: 10,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1161:nanoka:morale-burst-impact:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1391:nanoka:tigers-roar-impact:mindscape:0",
    supplementalRecords: [
      P2_4E_NANOKA_AGENTS_JUFUFU_TIGERS_ROAR_IMPACT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:jufufu",
      identity: {
        kind: "agent",
        entityId: "1391",
      },
    },
    ids: {
      optionId: "nanoka:agents:jufufu:tigers-roar-impact",
      effectId: "agent:1391:nanoka:tigers-roar-impact:mindscape:0",
    },
    section: "核心被动：虎虎生威（虎啸）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391501/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391502/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391503/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391504/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391505/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391506/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1391/details.zh.json",
        pointer: "/passive/level/1391507/desc/0",
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
        rank: "coreSkillLevel",
        unit: "impact-points",
        values: {
          "1": 25,
          "2": 29.2,
          "3": 33.3,
          "4": 37.5,
          "5": 41.7,
          "6": 45.8,
          "7": 50,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:jufufu:tigers-roar-impact",
      catalogEntityId: "agents:jufufu",
      name: "虎啸 · impact",
      conditionDescription:
        "橘福福处于[虎啸]效果中时，冲击力提升固定点数（核心 1—7 为 25/29.2/33.3/37.5/41.7/45.8/50 点），状态持续 30 秒；[虎啸]状态由调用方显式选择断言。受益对象是橘福福自身，与全队暴伤、连携/终结增伤条款相互独立。",
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
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391501/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391502/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391503/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391504/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391505/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391506/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1391/details.zh.json",
              pointer: "/passive/level/1391507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1391:nanoka:tigers-roar-impact:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0",
    supplementalRecords: [
      P2_4E_NANOKA_AGENTS_DIALYN_INITIAL_CRIT_RATE_IMPACT_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:dialyn",
      identity: {
        kind: "agent",
        entityId: "1481",
      },
    },
    ids: {
      optionId: "nanoka:agents:dialyn:initial-crit-rate-impact",
      effectId: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0",
    },
    section: "核心被动：五星客服热线（初始暴击率转化）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481049/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481050/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481051/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481052/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481053/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481054/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/passive/level/1481055/desc/0",
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
        kind: "minimum",
        unit: "impact-points",
        operands: [
          {
            kind: "convert",
            unit: "impact-points",
            input: {
              kind: "maximum",
              unit: "ratio",
              operands: [
                {
                  kind: "literal",
                  unit: "ratio",
                  value: 0,
                },
                {
                  kind: "add",
                  unit: "ratio",
                  operands: [
                    {
                      kind: "input",
                      unit: "ratio",
                      name: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0:source",
                    },
                    {
                      kind: "parameter",
                      unit: "ratio",
                      name: "threshold",
                    },
                  ],
                },
              ],
            },
            rate: {
              kind: "parameter",
              unit: "multiplier",
              name: "rate",
            },
          },
          {
            kind: "parameter",
            unit: "impact-points",
            name: "cap",
          },
        ],
      },
    },
    parameters: {
      threshold: {
        kind: "constant",
        unit: "ratio",
        value: -0.5,
      },
      rate: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: {
          "1": 140,
          "2": 150,
          "3": 160,
          "4": 170,
          "5": 180,
          "6": 190,
          "7": 200,
        },
      },
      cap: {
        kind: "constant",
        unit: "impact-points",
        value: 100,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:dialyn:initial-crit-rate-impact",
      catalogEntityId: "agents:dialyn",
      name: "核心被动 · impact（初始暴击率转化）",
      conditionDescription:
        "初始暴击率超过 50% 时，每超过 1%，冲击力提升（核心 1—7 为 1.4/1.5/1.6/1.7/1.8/1.9/2 点），最多提升 100 点；由调用方显式输入琉音的初始暴击率（不含局内暴击率增益），50%/51%/75%/100% 在核心 7 下分别为 0/2/50/100 点。",
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
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481049/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481050/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481051/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481052/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481053/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481054/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/passive/level/1481055/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [
            {
              name: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0:source",
              unit: "ratio",
              description:
                "initial critRate，琉音的初始暴击率（比例，1% = 0.01；是初始值，不含局内暴击率增益，不用当前面板值代替）；超过 50% 的部分每 1% 按核心档位换算 1.4—2 点冲击力、封顶 100 点，低于或等于 50% 贡献 0，越界读数按表达式钳制，不使用默认值，不自动读取",
            },
          ],
          applicability: {},
          effectKeys: [
            "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4",
    supplementalRecords: [
      P2_4E_NANOKA_AGENTS_ALEXANDRINA_MINDSCAPE_4_DEPLOYED_DOLLS_ENERGY_REGEN_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:alexandrina",
      identity: {
        kind: "agent",
        entityId: "1211",
      },
    },
    ids: {
      optionId:
        "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
      effectId:
        "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4",
    },
    section: "影画4",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1211/details.zh.json",
        pointer: "/talent/4/desc",
      },
    ],
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 4,
      },
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
      stat: "energyRegen",
      stage: "final-fixed",
      value: {
        kind: "parameter",
        unit: "energy-per-second",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "energy-per-second",
        value: 0.5,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId:
        "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
      catalogEntityId: "agents:alexandrina",
      name: "影画4 · energyRegen",
      conditionDescription:
        "杜苏拉和安娜塔莎均被指派在外时，丽娜的能量自动回复速度提升 0.5 点/秒（固定点数/秒，不随基础回能缩放）；任一玩偶返回丽娜身边时效果结束。两个玩偶均在外的有效状态由调用方显式选择（0/1），不从单只召唤物推断，不模拟返回过程。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 4,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1211/details.zh.json",
              pointer: "/talent/4/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
] as const satisfies readonly EffectAuthoringRecord[]

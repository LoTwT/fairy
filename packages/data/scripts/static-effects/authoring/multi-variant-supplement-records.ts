import type { EffectAuthoringRecord } from "./types.ts"
import {
  P2_4F_NANOKA_NEKOMATA_ORDINARY_DMG_BONUS_SUPPLEMENT,
  P2_4F_NANOKA_NEKOMATA_ORDINARY_SHOW_SUPPLEMENT,
  P2_4F_NANOKA_ELLEN_ORDINARY_BLADE_DANCE_SUPPLEMENT,
  P2_4F_NANOKA_HARUMASA_ORDINARY_CRIT_RATE_SUPPLEMENT,
  P2_4F_NANOKA_HARUMASA_ORDINARY_CRIT_DMG_SUPPLEMENT,
} from "./multi-variant-supplement-source-records.ts"

/**
 * P2-4f 一次性转录：revision 52 中 5 个 corrected/converted 双 variant
 * 补充选项。每个变体一条规则记录，两个记录共享同一选项描述。
 */
export const P2_4F_MULTI_VARIANT_AUTHORING_RECORDS = [
  {
    key: "agent:1021:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:nekomata",
      identity: {
        kind: "agent",
        entityId: "1021",
      },
    },
    ids: {
      optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      effectId: "agent:1021:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0",
    },
    section: "核心被动：猫步诡影",
    references: [
      {
        sourceId: "zzz-hp",
        version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/0",
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
        pointer: "/passive/level/1021514/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
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
            value: 0,
          },
        },
        {
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
      ],
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
        value: 0.6,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-branch-gate"],
      positions: [
        {
          pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "dmgBonus",
          normalizationChanges: [],
          rawValue: 60,
          normalizedValue: 60,
        },
      ],
    },
    option: {
      optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      catalogEntityId: "agents:nekomata",
      name: "核心被动：猫步诡影 · dmgBonus",
      conditionDescription:
        "猫又[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升60%，持续40秒，重复触发时刷新持续时间；、\n猫又发动[闪避反击：绒爪穿刺]会进入[肉球突袭]状态，持续40秒，重复触发时刷新持续时间，[肉球突袭]状态下猫又自身的攻击命中时均视为从背后命中；\n处于[肉球突袭]状态时，猫又自身的攻击命中时会触发[超凶爪印]效果，造成一次等同于自身30%攻击力的物理伤害，该效果每1秒最多触发一次；",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/0",
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
              pointer: "/passive/level/1021514/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:nanoka:ordinary-dmgBonus:blk-legacy:mindscape:0",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1021:nanoka:ordinary-dmgBonus:blk-legacy:mindscape:0",
    supplementalRecords: [P2_4F_NANOKA_NEKOMATA_ORDINARY_DMG_BONUS_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:nekomata",
      identity: {
        kind: "agent",
        entityId: "1021",
      },
    },
    ids: {
      optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      effectId: "agent:1021:nanoka:ordinary-dmgBonus:blk-legacy:mindscape:0",
    },
    section: "核心被动：猫步诡影（普通分支）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021507/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "potentialLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 0,
          },
        },
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "coreSkillLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 7,
          },
        },
      ],
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
      kind: "constant",
      value: true,
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
        value: 0.6,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      catalogEntityId: "agents:nekomata",
      name: "核心被动：猫步诡影 · dmgBonus",
      conditionDescription:
        "猫又[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升60%，持续40秒，重复触发时刷新持续时间；、\n猫又发动[闪避反击：绒爪穿刺]会进入[肉球突袭]状态，持续40秒，重复触发时刷新持续时间，[肉球突袭]状态下猫又自身的攻击命中时均视为从背后命中；\n处于[肉球突袭]状态时，猫又自身的攻击命中时会触发[超凶爪印]效果，造成一次等同于自身30%攻击力的物理伤害，该效果每1秒最多触发一次；",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/0",
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
              pointer: "/passive/level/1021514/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:zzz-hp:legacy-self-dmgBonus:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:nanoka:ordinary-dmgBonus:blk-legacy:mindscape:0",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1021:zzz-hp:eff-ms4f4rbb-y2jon7:blk-ms4f4rbb-id7p58:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:nekomata",
      identity: {
        kind: "agent",
        entityId: "1021",
      },
    },
    ids: {
      optionId:
        "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7",
      effectId:
        "agent:1021:zzz-hp:eff-ms4f4rbb-y2jon7:blk-ms4f4rbb-id7p58:mindscape:0",
    },
    section: "额外能力：猫步秀",
    references: [
      {
        sourceId: "zzz-hp",
        version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/1/effects/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021508/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021509/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021510/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021511/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021512/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021513/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021514/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021514/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
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
            value: 0,
          },
        },
        {
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
      ],
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
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:special"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:all-special-ms0fcqv7"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:dodge"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:all-dodge-ms4e5xea"],
                },
              ],
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
        kind: "constant",
        unit: "ratio",
        value: 0.35000000000000003,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-branch-gate"],
      positions: [
        {
          pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/1/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "skillDmgBonus",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId:
        "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7",
      catalogEntityId: "agents:nekomata",
      name: "额外能力：猫步秀 · skillDmgBonus",
      conditionDescription:
        "队伍中存在[支援]角色或与自身属性或阵营相同的角色时触发：\n猫又发动[闪避：尾巴失踪术]或队伍中任意角色对敌人施加[强击]效果后，猫又[强化特殊技]或[闪避反击]命中时造成的伤害提升35%，该效果最多可叠加2层，持续30秒，重复触发时刷新持续时间。",
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
              pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/1/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021508/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021509/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021510/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021511/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021512/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021513/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021514/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021514/desc/0",
            },
          ],
          maximumLayers: 2,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:zzz-hp:eff-ms4f4rbb-y2jon7:blk-ms4f4rbb-id7p58:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021507/desc/1",
            },
          ],
          maximumLayers: 2,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:nanoka:ordinary-show:blk-ms4f4rbb-id7p58:mindscape:0",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1021:nanoka:ordinary-show:blk-ms4f4rbb-id7p58:mindscape:0",
    supplementalRecords: [P2_4F_NANOKA_NEKOMATA_ORDINARY_SHOW_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:nekomata",
      identity: {
        kind: "agent",
        entityId: "1021",
      },
    },
    ids: {
      optionId:
        "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7",
      effectId:
        "agent:1021:nanoka:ordinary-show:blk-ms4f4rbb-id7p58:mindscape:0",
    },
    section: "额外能力：猫步秀（普通分支）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1021/details.zh.json",
        pointer: "/passive/level/1021507/desc/1",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "potentialLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 0,
          },
        },
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "coreSkillLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 7,
          },
        },
      ],
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
          values: ["regular", "sheer"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["enhanced-special"],
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
        value: 0.35,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId:
        "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7",
      catalogEntityId: "agents:nekomata",
      name: "额外能力：猫步秀 · skillDmgBonus",
      conditionDescription:
        "队伍中存在[支援]角色或与自身属性或阵营相同的角色时触发：\n猫又发动[闪避：尾巴失踪术]或队伍中任意角色对敌人施加[强击]效果后，猫又[强化特殊技]或[闪避反击]命中时造成的伤害提升35%，该效果最多可叠加2层，持续30秒，重复触发时刷新持续时间。",
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
              pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/1/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021508/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021509/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021510/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021511/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021512/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021513/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021514/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021514/desc/0",
            },
          ],
          maximumLayers: 2,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:zzz-hp:eff-ms4f4rbb-y2jon7:blk-ms4f4rbb-id7p58:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1021/details.zh.json",
              pointer: "/passive/level/1021507/desc/1",
            },
          ],
          maximumLayers: 2,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1021:nanoka:ordinary-show:blk-ms4f4rbb-id7p58:mindscape:0",
          ],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1191:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:ellen",
      identity: {
        kind: "agent",
        entityId: "1191",
      },
    },
    ids: {
      optionId: "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg",
      effectId: "agent:1191:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:0",
    },
    section: "核心被动：凌牙厉齿",
    references: [
      {
        sourceId: "zzz-hp",
        version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/48/mindscapeBuffs/0/effectBlocks/0/effects/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1191/details.zh.json",
        pointer: "/passive/level/1191514/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1191/details.zh.json",
        pointer: "/passive/level/1191514/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
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
            value: 0,
          },
        },
        {
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
      ],
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
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:dodge"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:ellen-dodge-ms4fsyad"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:ellen-basic-ms4ftctx"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:ellen-basic-ms4ftyxj"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:ellen-basic-ms4fu3ym"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:chain"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:ultimate"],
                },
              ],
            },
          ],
        },
      ],
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
        kind: "constant",
        unit: "ratio",
        value: 1,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-branch-gate"],
      positions: [
        {
          pointer: "/agents/48/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "critDmg",
          normalizationChanges: [],
          rawValue: 100,
          normalizedValue: 100,
        },
      ],
    },
    option: {
      optionId: "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg",
      catalogEntityId: "agents:ellen",
      name: "核心被动：凌牙厉齿 · critDmg",
      conditionDescription:
        "艾莲在[冲刺攻击：冰渊潜袭]中发动蓄力剪击，或消耗[急冻充能]发动[普通攻击：急冻修剪法]时，招式的暴击伤害提升100%；\n上述效果对[连携技]、[终结技]、[普通攻击：霜锋]和[普通攻击：冰刃浪]同样生效。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/48/mindscapeBuffs/0/effectBlocks/0/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1191/details.zh.json",
              pointer: "/passive/level/1191514/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1191/details.zh.json",
              pointer: "/passive/level/1191514/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1191:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1191/details.zh.json",
              pointer: "/passive/level/1191507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1191:nanoka:ordinary-blade-dance:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1191:nanoka:ordinary-blade-dance:mindscape:0",
    supplementalRecords: [P2_4F_NANOKA_ELLEN_ORDINARY_BLADE_DANCE_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:ellen",
      identity: {
        kind: "agent",
        entityId: "1191",
      },
    },
    ids: {
      optionId: "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg",
      effectId: "agent:1191:nanoka:ordinary-blade-dance:mindscape:0",
    },
    section: "核心被动：凌牙厉齿（普通分支）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1191/details.zh.json",
        pointer: "/passive/level/1191507/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "coreSkillLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 7,
          },
        },
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "potentialLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 0,
          },
        },
      ],
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
          fact: "hit.skillTag",
          values: [
            "zzz-hp:skill:ellen-dodge-ms4fsyad",
            "zzz-hp:skill:ellen-basic-ms4ftctx",
          ],
        },
      ],
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
        kind: "constant",
        unit: "ratio",
        value: 1,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg",
      catalogEntityId: "agents:ellen",
      name: "核心被动：凌牙厉齿 · critDmg",
      conditionDescription:
        "艾莲在[冲刺攻击：冰渊潜袭]中发动蓄力剪击，或消耗[急冻充能]发动[普通攻击：急冻修剪法]时，招式的暴击伤害提升100%；\n上述效果对[连携技]、[终结技]、[普通攻击：霜锋]和[普通攻击：冰刃浪]同样生效。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/48/mindscapeBuffs/0/effectBlocks/0/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1191/details.zh.json",
              pointer: "/passive/level/1191514/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1191/details.zh.json",
              pointer: "/passive/level/1191514/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1191:zzz-hp:legacy-self-critDmg:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1191/details.zh.json",
              pointer: "/passive/level/1191507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1191:nanoka:ordinary-blade-dance:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1201:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:harumasa",
      identity: {
        kind: "agent",
        entityId: "1201",
      },
    },
    ids: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate",
      effectId: "agent:1201:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:0",
    },
    section: "核心被动：破晓",
    references: [
      {
        sourceId: "zzz-hp",
        version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1201/details.zh.json",
        pointer: "/passive/level/1201507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1201/details.zh.json",
        pointer: "/passive/level/1201514/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
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
            value: 0,
          },
        },
        {
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
      ],
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
          values: ["regular", "sheer", "sharpen"],
        },
        {
          kind: "any",
          conditions: [
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:dodge"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:harumasa-dodge-ms4gw5t2"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:dodge"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:harumasa-dodge-ms4gwjug"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:ultimate"],
                },
              ],
            },
          ],
        },
      ],
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
        kind: "constant",
        unit: "ratio",
        value: 0.25,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-branch-gate"],
      positions: [
        {
          pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 25,
          normalizedValue: 25,
        },
      ],
    },
    option: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate",
      catalogEntityId: "agents:harumasa",
      name: "核心被动：破晓 · critRate",
      conditionDescription:
        "[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]的暴击率提升25%；\n悠真的[冲刺攻击：飞弦·斩]/[终结技]命中敌人并触发暴击时，将获得1/6层[锋芒]，[冲刺攻击：飞弦·斩]在同一招式内最多获得3层，[锋芒]最多叠加6层，持续5秒，重复触发时刷新持续时间；\n每层[锋芒]会使[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]造成的暴击伤害提升12%。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201514/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1201:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1201:nanoka:ordinary-crit-rate:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1201:nanoka:ordinary-crit-rate:mindscape:0",
    supplementalRecords: [P2_4F_NANOKA_HARUMASA_ORDINARY_CRIT_RATE_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:harumasa",
      identity: {
        kind: "agent",
        entityId: "1201",
      },
    },
    ids: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate",
      effectId: "agent:1201:nanoka:ordinary-crit-rate:mindscape:0",
    },
    section: "核心被动：破晓（普通分支）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1201/details.zh.json",
        pointer: "/passive/level/1201507/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "coreSkillLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 7,
          },
        },
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "potentialLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 0,
          },
        },
      ],
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
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:harumasa-dodge-ms4gw5t2"],
        },
      ],
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
        kind: "constant",
        unit: "ratio",
        value: 0.25,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate",
      catalogEntityId: "agents:harumasa",
      name: "核心被动：破晓 · critRate",
      conditionDescription:
        "[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]的暴击率提升25%；\n悠真的[冲刺攻击：飞弦·斩]/[终结技]命中敌人并触发暴击时，将获得1/6层[锋芒]，[冲刺攻击：飞弦·斩]在同一招式内最多获得3层，[锋芒]最多叠加6层，持续5秒，重复触发时刷新持续时间；\n每层[锋芒]会使[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]造成的暴击伤害提升12%。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201514/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1201:zzz-hp:legacy-self-critRate:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1201:nanoka:ordinary-crit-rate:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1201:zzz-hp:eff-ms4gx7ds-ijkzuy:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:harumasa",
      identity: {
        kind: "agent",
        entityId: "1201",
      },
    },
    ids: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy",
      effectId: "agent:1201:zzz-hp:eff-ms4gx7ds-ijkzuy:blk-legacy:mindscape:0",
    },
    section: "核心被动：破晓",
    references: [
      {
        sourceId: "zzz-hp",
        version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1201/details.zh.json",
        pointer: "/passive/level/1201507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1201/details.zh.json",
        pointer: "/passive/level/1201514/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
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
            value: 0,
          },
        },
        {
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
      ],
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 6,
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
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:dodge"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:harumasa-dodge-ms4gw5t2"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:dodge"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:harumasa-dodge-ms4gwjug"],
                },
              ],
            },
            {
              kind: "all",
              conditions: [
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:category:ultimate"],
                },
              ],
            },
          ],
        },
      ],
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
        kind: "constant",
        unit: "ratio",
        value: 0.12,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-branch-gate"],
      positions: [
        {
          pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "critDmg",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy",
      catalogEntityId: "agents:harumasa",
      name: "核心被动：破晓 · critDmg",
      conditionDescription:
        "[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]的暴击率提升25%；\n悠真的[冲刺攻击：飞弦·斩]/[终结技]命中敌人并触发暴击时，将获得1/6层[锋芒]，[冲刺攻击：飞弦·斩]在同一招式内最多获得3层，[锋芒]最多叠加6层，持续5秒，重复触发时刷新持续时间；\n每层[锋芒]会使[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]造成的暴击伤害提升12%。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201514/desc/0",
            },
          ],
          maximumLayers: 6,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1201:zzz-hp:eff-ms4gx7ds-ijkzuy:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
          ],
          maximumLayers: 6,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1201:nanoka:ordinary-crit-dmg:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
  {
    key: "agent:1201:nanoka:ordinary-crit-dmg:mindscape:0",
    supplementalRecords: [P2_4F_NANOKA_HARUMASA_ORDINARY_CRIT_DMG_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:harumasa",
      identity: {
        kind: "agent",
        entityId: "1201",
      },
    },
    ids: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy",
      effectId: "agent:1201:nanoka:ordinary-crit-dmg:mindscape:0",
    },
    section: "核心被动：破晓（普通分支）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1201/details.zh.json",
        pointer: "/passive/level/1201507/desc/0",
      },
    ],
    config: {
      kind: "all",
      conditions: [
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "coreSkillLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 7,
          },
        },
        {
          kind: "compare-number",
          unit: "count",
          operator: "eq",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "potentialLevel",
          },
          right: {
            kind: "literal",
            unit: "count",
            value: 0,
          },
        },
      ],
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 6,
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
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:harumasa-dodge-ms4gw5t2"],
        },
      ],
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
        kind: "constant",
        unit: "ratio",
        value: 0.12,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy",
      catalogEntityId: "agents:harumasa",
      name: "核心被动：破晓 · critDmg",
      conditionDescription:
        "[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]的暴击率提升25%；\n悠真的[冲刺攻击：飞弦·斩]/[终结技]命中敌人并触发暴击时，将获得1/6层[锋芒]，[冲刺攻击：飞弦·斩]在同一招式内最多获得3层，[锋芒]最多叠加6层，持续5秒，重复触发时刷新持续时间；\n每层[锋芒]会使[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]造成的暴击伤害提升12%。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "991bb0ef2a00387f8a1fa18293bbda17256d7270",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/0/effects/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201514/desc/0",
            },
          ],
          maximumLayers: 6,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1201:zzz-hp:eff-ms4gx7ds-ijkzuy:blk-legacy:mindscape:0",
          ],
        },
        {
          target: "self",
          configuration: {
            coreSkillLevels: [7],
            potentialLevels: [0],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1201/details.zh.json",
              pointer: "/passive/level/1201507/desc/0",
            },
          ],
          maximumLayers: 6,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1201:nanoka:ordinary-crit-dmg:mindscape:0"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule-per-variant",
    },
  },
] as const satisfies readonly EffectAuthoringRecord[]

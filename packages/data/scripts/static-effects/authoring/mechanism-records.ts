import type { EffectAuthoringRecord } from "./types.ts"

/**
 * P4-1 一次性转录：revision 52 的 28 个未作者化机制选项。
 * 来自当前 static.json / static-catalog.json / static-coverage.json；
 * 生成路径不读取这些基线条目。catalogMechanism 是目录 arm 的完整来源，
 * 记录级 mechanism 只保留规则分组与 independent-settlement 的最小校验字段。
 */
export const P4_1_MECHANISM_AUTHORING_RECORDS = [
  {
    key: "agent:1401:zzz-hp:legacy-self-disorderBaseMult:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:alice",
      identity: {
        kind: "agent",
        entityId: "1401",
      },
    },
    ids: {
      optionId:
        "agents:alice:mindscape:0:blk-legacy:legacy-self-disorderBaseMult",
      effectId:
        "agent:1401:zzz-hp:legacy-self-disorderBaseMult:blk-legacy:mindscape:0",
    },
    section: "核心被动：剑心双虹",
    references: [
      {
        sourceId: "zzz-hp",
        version: "2628b32cece086e371bafa05518a9a12650d9f74",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/38/mindscapeBuffs/0/effectBlocks/0/effects/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1401/details.zh.json",
        pointer: "/passive/level/1401507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1401/details.zh.json",
        pointer: "/passive/level/1401507/desc/0",
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
        value: 0,
      },
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
      kind: "team",
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["disorder"],
        },
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["disorder"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["zzz-hp:alice:disorder-base:physical"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 0.18,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [
        {
          pointer: "/agents/38/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "disorderBaseMult",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId:
        "agents:alice:mindscape:0:blk-legacy:legacy-self-disorderBaseMult",
      catalogEntityId: "agents:alice",
      name: "核心被动：剑心双虹 · disorderBaseMult",
      conditionDescription:
        "队伍中任意角色对敌人施加物理异常状态后，在异常状态的持续期间，爱丽丝每0.95秒对其额外造成基于该物理异常伤害比例2.5%的伤害，并使物理异常状态下的敌人被触发[紊乱]效果时，每有1秒物理异常状态剩余时间，[紊乱]效果的伤害倍率提升18%，最多提升180.0%；",
      target: "team",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "2628b32cece086e371bafa05518a9a12650d9f74",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/38/mindscapeBuffs/0/effectBlocks/0/effects/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1401/details.zh.json",
              pointer: "/passive/level/1401507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1401/details.zh.json",
              pointer: "/passive/level/1401507/desc/0",
            },
          ],
          maximumLayers: 10,
          inputs: [],
          applicability: {
            beneficiaryElements: ["physical"],
          },
          effectKeys: [
            "agent:1401:zzz-hp:legacy-self-disorderBaseMult:blk-legacy:mindscape:0",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "zzz-hp:alice:disorder-base:physical",
                stat: "attack",
                role: "base",
                allowedModes: ["standard-disorder"],
                source: "anomaly-source",
                originalAnomalyAttribute: "physical",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      damageItem: {
        itemId: "zzz-hp:alice:disorder-base:physical",
        stat: "attack",
        role: "base",
        allowedModes: ["standard-disorder"],
        source: "anomaly-source",
        originalAnomalyAttribute: "physical",
      },
    },
  },
  {
    key: "agent:1551:zzz-hp:eff-ms4m4nah-o17lgq:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:pyrois",
      identity: {
        kind: "agent",
        entityId: "1551",
      },
    },
    ids: {
      optionId: "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m4nah-o17lgq",
      effectId: "agent:1551:zzz-hp:eff-ms4m4nah-o17lgq:blk-legacy:mindscape:0",
    },
    section: "核心被动：煊赫车辇",
    references: [
      {
        sourceId: "zzz-hp",
        version: "2628b32cece086e371bafa05518a9a12650d9f74",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/5/mindscapeBuffs/0/effectBlocks/0/effects/2",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1551/details.zh.json",
        pointer: "/passive/level/1551507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1551/details.zh.json",
        pointer: "/passive/level/1551507/desc/0",
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
        value: 0,
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
          values: ["regular", "sheer", "sharpen"],
        },
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
                  values: ["zzz-hp:category:ultimate"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:pyrois-ultimate-ms4m57ys"],
                },
              ],
            },
          ],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["pyrois:ult-left-extra"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 9,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [
        {
          pointer: "/agents/5/mindscapeBuffs/0/effectBlocks/0/effects/2",
          rank: 0,
          rankKind: "mindscape",
          stat: "directDmgMult",
          normalizationChanges: [],
          rawValue: 900,
          normalizedValue: 900,
        },
      ],
    },
    option: {
      optionId: "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m4nah-o17lgq",
      catalogEntityId: "agents:pyrois",
      name: "核心被动：煊赫车辇 · directDmgMult",
      conditionDescription:
        "佩洛伊斯发动不同[终结技]时，分别可获得如下效果：\n上分支-[终结技：万军诛绝]：获得30点[日珥]，并获得[阳炎]状态，[阳炎]状态下，佩洛伊斯发动[终结技]对处于失衡状态下的敌人造成的暴击伤害提升40%，[日珥]大于等于30点时，[普通攻击：天光]的第四段攻击期间长按普攻可直接衔接[普通攻击：天光]的第三段攻击，持续21秒，重复触发时刷新持续时间；\n下分支-[终结技：凯旋坦途]：获得[耀斑]状态，[耀斑]状态下，能量获得效率提升15%，造成的伤害提升40%，发动[强化特殊技]触发完美格挡时回复10点[日珥]，持续200秒，重复触发时刷新持续时间；\n左分支-[终结技：无拘剑势]：重击命中[浸染]状态下的敌人时，额外造成等同于900%攻击力的伤害；\n右分支-[终结技：永陷幽囚]：重击命中失衡敌人触发[决算]效果，额外造成等同于2250%攻击力的伤害，招式发动时，使所有处于失衡状态的敌人失衡持续时间提升3秒，终结一击命中时敌人失衡结束。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "2628b32cece086e371bafa05518a9a12650d9f74",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/5/mindscapeBuffs/0/effectBlocks/0/effects/2",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1551/details.zh.json",
              pointer: "/passive/level/1551507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1551/details.zh.json",
              pointer: "/passive/level/1551507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1551:zzz-hp:eff-ms4m4nah-o17lgq:blk-legacy:mindscape:0",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "pyrois:ult-left-extra",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:pyrois-ultimate-ms4m57ys",
        upstreamId: "pyrois-ultimate-ms4m57ys",
        agentEntityId: "1551",
        category: "ultimate",
        name: "左分支-[终结技：无拘剑势]",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "pyrois:ult-left-extra",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
      },
    },
  },
  {
    key: "agent:1551:zzz-hp:eff-ms4m5tqw-4wvfng:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:pyrois",
      identity: {
        kind: "agent",
        entityId: "1551",
      },
    },
    ids: {
      optionId: "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m5tqw-4wvfng",
      effectId: "agent:1551:zzz-hp:eff-ms4m5tqw-4wvfng:blk-legacy:mindscape:0",
    },
    section: "核心被动：煊赫车辇",
    references: [
      {
        sourceId: "zzz-hp",
        version: "2628b32cece086e371bafa05518a9a12650d9f74",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/5/mindscapeBuffs/0/effectBlocks/0/effects/3",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1551/details.zh.json",
        pointer: "/passive/level/1551507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1551/details.zh.json",
        pointer: "/passive/level/1551507/desc/0",
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
        value: 0,
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
                  values: ["zzz-hp:category:ultimate"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:pyrois-ultimate-ms4m66yy"],
                },
              ],
            },
          ],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["pyrois:ult-right-settlement"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 22.5,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [
        {
          pointer: "/agents/5/mindscapeBuffs/0/effectBlocks/0/effects/3",
          rank: 0,
          rankKind: "mindscape",
          stat: "settlementDmgMult",
          normalizationChanges: [],
          rawValue: 2250,
          normalizedValue: 2250,
        },
      ],
    },
    option: {
      optionId: "agents:pyrois:mindscape:0:blk-legacy:eff-ms4m5tqw-4wvfng",
      catalogEntityId: "agents:pyrois",
      name: "核心被动：煊赫车辇 · settlementDmgMult",
      conditionDescription:
        "佩洛伊斯发动不同[终结技]时，分别可获得如下效果：\n上分支-[终结技：万军诛绝]：获得30点[日珥]，并获得[阳炎]状态，[阳炎]状态下，佩洛伊斯发动[终结技]对处于失衡状态下的敌人造成的暴击伤害提升40%，[日珥]大于等于30点时，[普通攻击：天光]的第四段攻击期间长按普攻可直接衔接[普通攻击：天光]的第三段攻击，持续21秒，重复触发时刷新持续时间；\n下分支-[终结技：凯旋坦途]：获得[耀斑]状态，[耀斑]状态下，能量获得效率提升15%，造成的伤害提升40%，发动[强化特殊技]触发完美格挡时回复10点[日珥]，持续200秒，重复触发时刷新持续时间；\n左分支-[终结技：无拘剑势]：重击命中[浸染]状态下的敌人时，额外造成等同于900%攻击力的伤害；\n右分支-[终结技：永陷幽囚]：重击命中失衡敌人触发[决算]效果，额外造成等同于2250%攻击力的伤害，招式发动时，使所有处于失衡状态的敌人失衡持续时间提升3秒，终结一击命中时敌人失衡结束。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "2628b32cece086e371bafa05518a9a12650d9f74",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/5/mindscapeBuffs/0/effectBlocks/0/effects/3",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1551/details.zh.json",
              pointer: "/passive/level/1551507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1551/details.zh.json",
              pointer: "/passive/level/1551507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1551:zzz-hp:eff-ms4m5tqw-4wvfng:blk-legacy:mindscape:0",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "pyrois:ult-right-settlement",
                stat: "attack",
                role: "settlement",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:pyrois-ultimate-ms4m66yy",
        upstreamId: "pyrois-ultimate-ms4m66yy",
        agentEntityId: "1551",
        category: "ultimate",
        name: "右分支-[终结技：永陷幽囚]",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "pyrois:ult-right-settlement",
        stat: "attack",
        role: "settlement",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
      },
    },
  },
  {
    key: "agent:1581:zzz-hp:eff-ms7tarv6-tfz2kz:blk-legacy:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:remiel",
      identity: {
        kind: "agent",
        entityId: "1581",
      },
    },
    ids: {
      optionId: "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
      effectId: "agent:1581:zzz-hp:eff-ms7tarv6-tfz2kz:blk-legacy:mindscape:0",
    },
    section: "核心被动：时序=万色滞行1",
    references: [
      {
        sourceId: "zzz-hp",
        version: "2628b32cece086e371bafa05518a9a12650d9f74",
        locale: "zh",
        resourcePath:
          "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
        pointer: "/agents/53/mindscapeBuffs/0/effectBlocks/0/effects/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1581/details.zh.json",
        pointer: "/passive/level/1581507/desc/0",
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
        value: 0,
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
          values: ["luminize"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "luminize-proficiency-input",
      value: {
        kind: "stat",
        unit: "anomaly-proficiency-points",
        entity: {
          role: "holder",
        },
        stat: "anomalyProficiency",
        stage: "current",
        at: "evaluation",
      },
    },
    parameters: {
      threshold: {
        kind: "constant",
        unit: "anomaly-proficiency-points",
        value: 0,
      },
      rate: {
        kind: "constant",
        unit: "multiplier",
        value: 0.002,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["luminize-conversion-owner"],
      positions: [
        {
          pointer: "/agents/53/mindscapeBuffs/0/effectBlocks/0/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "radianceMultFactor",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId: "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
      catalogEntityId: "agents:remiel",
      name: "核心被动：时序=万色滞行1 · radianceMultFactor",
      conditionDescription:
        "蕾米埃尔的[异化系数]为自身异常精通的0.02%；\n基于已储存的所有[虚曜]中的[异常效果强度]，对敌人造成招式对应倍率的属性异常伤害，并根据自身异常精通的0.2%提升此伤害倍率；",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [7],
          },
          references: [
            {
              sourceId: "zzz-hp",
              version: "2628b32cece086e371bafa05518a9a12650d9f74",
              locale: "zh",
              resourcePath:
                "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json",
              pointer: "/agents/53/mindscapeBuffs/0/effectBlocks/0/effects/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1581/details.zh.json",
              pointer: "/passive/level/1581507/desc/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1581:zzz-hp:eff-ms7tarv6-tfz2kz:blk-legacy:mindscape:0",
          ],
          catalogMechanism: {
            kind: "luminize-proficiency-mapping",
            mapping: {
              kind: "luminize-proficiency",
              rate: 0.002,
              source: "holder-current",
            },
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:lighter",
      identity: {
        kind: "agent",
        entityId: "1161",
      },
    },
    ids: {
      optionId: "agents:lighter:mindscape:0:elation-complete-state",
      effectId:
        "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0",
    },
    section: "额外能力：斗志昂扬",
    references: [
      {
        sourceId: "zzz-hp",
        version: "2628b32cece086e371bafa05518a9a12650d9f74",
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
        value: 0,
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
      kind: "team",
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "all",
          conditions: [],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["ice", "fire", "frost"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "minimum",
        unit: "ratio",
        operands: [
          {
            kind: "literal",
            unit: "ratio",
            value: 0.75,
          },
          {
            kind: "multiply",
            unit: "ratio",
            value: {
              kind: "add",
              unit: "ratio",
              operands: [
                {
                  kind: "literal",
                  unit: "ratio",
                  value: 0.0125,
                },
                {
                  kind: "convert",
                  unit: "ratio",
                  input: {
                    kind: "maximum",
                    unit: "impact-points",
                    operands: [
                      {
                        kind: "literal",
                        unit: "impact-points",
                        value: 0,
                      },
                      {
                        kind: "add",
                        unit: "impact-points",
                        operands: [
                          {
                            kind: "input",
                            unit: "impact-points",
                            name: "agent:1161:zzz-hp:eff-ms4atnfh-29yr0r:blk-ms4aoho0-grnxav:mindscape:0:source",
                          },
                          {
                            kind: "parameter",
                            unit: "impact-points",
                            name: "threshold",
                          },
                        ],
                      },
                    ],
                  },
                  rate: {
                    kind: "literal",
                    unit: "multiplier",
                    value: 0.00025,
                  },
                },
              ],
            },
            coefficient: {
              kind: "convert",
              unit: "multiplier",
              input: {
                kind: "input",
                unit: "count",
                name: "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0:layers",
              },
              rate: {
                kind: "literal",
                unit: "multiplier",
                value: 1,
              },
            },
          },
        ],
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "ratio",
        value: 0.0125,
      },
      threshold: {
        kind: "constant",
        unit: "impact-points",
        value: -170,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["complete-state-elation-correction"],
      positions: [],
    },
    option: {
      optionId: "agents:lighter:mindscape:0:elation-complete-state",
      catalogEntityId: "agents:lighter",
      name: "昂扬 · 完整状态",
      conditionDescription:
        "队伍中存在[强攻]角色或与自身阵营相同的角色时，[士气喷发]状态下莱特第五段[普通攻击]命中敌人使全队获得一层[昂扬]，最多 20 层、持续 30 秒、重复触发刷新；每层使代理人造成的冰属性伤害和火属性伤害提升 1.25%；获得[昂扬]时若莱特冲击力高于 170 点，每超过 10 点使每层增益额外提升 0.25%；[昂扬]最多使冰/火伤害提升 75%。获得时冲击力与层数由调用方声明。",
      target: "team",
      variants: [
        {
          configuration: {},
          references: [
            {
              sourceId: "zzz-hp",
              version: "2628b32cece086e371bafa05518a9a12650d9f74",
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
          maximumLayers: 20,
          inputs: [
            {
              name: "agent:1161:zzz-hp:eff-ms4atnfh-29yr0r:blk-ms4aoho0-grnxav:mindscape:0:source",
              unit: "impact-points",
              description:
                "莱特获得[昂扬]时的冲击力（显式快照读数，手工输入）；与同一状态的其余部分共用同一读数，不使用预设或当前面板",
            },
          ],
          applicability: {},
          effectKeys: [
            "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0",
          ],
          catalogMechanism: {
            kind: "complete-state",
            layerCountInputName:
              "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0:layers",
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:m6-giant-windstorm",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:m6-giant-windstorm",
      effectId: "agent:1621:nanoka:m6-giant-windstorm",
    },
    section: "影画6 · 巨型风旋倍率",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/skill/special/description/9/param/3",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/skill/special/description/9/param/3",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["wind"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["special"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:roxy-giant-windstorm"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "scale",
      itemIds: ["action:agent:1621:action:0024:base"],
      value: {
        kind: "literal",
        unit: "multiplier",
        value: 2.5,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:m6-giant-windstorm",
      catalogEntityId: "agents:Roxy",
      name: "影画6 · 巨型风旋倍率",
      conditionDescription:
        "M6巨型风旋1秒合计原倍率×2.5，仅匹配正式动作0024的base项与巨型精确目标；使用持有者当前ATK与普通CR/CD。0关闭、1开启，与风抗忽视独立。传入未预乘M6的原倍率，最终special等级沿既有合法域（M6最低5）；不包含微型、爆鸣、自动余响次数或失衡。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/skill/special/description/9/param/3",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/skill/special/description/9/param/3",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1621:nanoka:m6-giant-windstorm"],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "action:agent:1621:action:0024:base",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:roxy-giant-windstorm",
        upstreamId: null,
        agentEntityId: "1621",
        category: "special",
        name: "风眼·巨型风旋（1秒合计）",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "action:agent:1621:action:0024:base",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
      },
    },
  },
  {
    key: "agent:1621:nanoka:additional-level-damage",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:additional-level-damage",
      effectId: "agent:1621:nanoka:additional-level-damage",
    },
    section: "额外能力 · 辉金心脏自身等级增伤",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621507/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621507/desc/1",
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
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "add",
        unit: "ratio",
        operands: [
          {
            kind: "literal",
            unit: "ratio",
            value: 0.08,
          },
          {
            kind: "minimum",
            unit: "ratio",
            operands: [
              {
                kind: "literal",
                unit: "ratio",
                value: 0.72,
              },
              {
                kind: "convert",
                unit: "ratio",
                input: {
                  kind: "input",
                  unit: "count",
                  name: "roxy:additional:holder-level",
                },
                rate: {
                  kind: "literal",
                  unit: "multiplier",
                  value: 0.012,
                },
              },
            ],
          },
        ],
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:additional-level-damage",
      catalogEntityId: "agents:Roxy",
      name: "额外能力 · 辉金心脏自身等级增伤",
      conditionDescription:
        "同队另一名强攻、命破或锋御角色任一满足时，洛克茜自身伤害增加(8+min(1.2×角色等级,72))/100。角色等级来自本绑定持有者的actorSources.level，须为真实当前等级的有限整数1—60，无默认值；不是核心或技能等级，也不取命中队友等级。多名合格队友只满足一次。独立0/1开关，不要求队伍攻击命中状态，不包含第三条8%直接伤害或核心团队双暴。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {},
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621507/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621507/desc/1",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {
            otherTeammateProfessions: ["强攻", "命破", "锋御"],
          },
          effectKeys: ["agent:1621:nanoka:additional-level-damage"],
          catalogMechanism: {
            kind: "holder-level",
            holderLevelInputName: "roxy:additional:holder-level",
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:additional-weathered-direct-damage",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:additional-weathered-direct-damage",
      effectId: "agent:1621:nanoka:additional-weathered-direct-damage",
    },
    section: "额外能力 · 风化直接攻击伤害",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621507/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621507/desc/1",
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
    scope: "hit",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "factor-contribution",
      channel: "windswept-direct-damage-coefficient-increase",
      value: {
        kind: "convert",
        unit: "ratio",
        input: {
          kind: "input",
          unit: "count",
          name: "roxy:weathered-direct-damage:applicable",
        },
        rate: {
          kind: "literal",
          unit: "multiplier",
          value: 0.08,
        },
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:additional-weathered-direct-damage",
      catalogEntityId: "agents:Roxy",
      name: "额外能力 · 风化直接攻击伤害",
      conditionDescription:
        "同队另一名强攻、命破或锋御满足资格时，当前目标处于本队施加的风化，风及当前浸染属性的直接攻击风化系数增加0.08。独立0/1开关；显式提供当前目标状态、施加者、浸染色（null为已知未浸染）、ratio基础系数及本次命中的directAttack。基础系数不含本次增量，无默认10%；关闭本选项仍保留基础风化乘区。同队仅声明一个实际有效的此类来源，不推断多洛克茜覆盖次序。",
      target: "team",
      variants: [
        {
          target: "team",
          configuration: {},
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621507/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621507/desc/1",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {
            otherTeammateProfessions: ["强攻", "命破", "锋御"],
          },
          effectKeys: ["agent:1621:nanoka:additional-weathered-direct-damage"],
          catalogMechanism: {
            kind: "windswept-direct",
            metadata: {
              applicabilityInputName: "roxy:weathered-direct-damage:applicable",
              applierTeam: "holder",
              singleActiveSourceGroup: "roxy-additional-windswept",
            },
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:yixuan",
      identity: {
        kind: "agent",
        entityId: "1371",
      },
    },
    ids: {
      optionId: "nanoka:agents:yixuan:m2-talisman-suppression-break-damage",
      effectId:
        "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
    },
    section: "影画2：消灾渡厄（符法千重-破）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/talent/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/talent/2/desc",
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
          values: ["sheer"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:yixuan-talisman-suppression-break"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["yixuan:talisman-suppression-break-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 12,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:yixuan:m2-talisman-suppression-break-damage",
      catalogEntityId: "agents:yixuan",
      name: "影画2 · 强化特殊技：符法千重-破（独立结算）",
      conditionDescription:
        "影画 2 起：发动[强化特殊技：青溟震击-破]后点按特殊技键，消耗一层[聚墨]发动[强化特殊技：符法千重-破]，按仪玄当前贯穿力的 1200% 结算一次独立贯穿伤害（「最多」按满额取舍）。触发与[聚墨]层数由调用方声明并逐次结算：独立项以 special 分类结算（可同时声明 all-special 目标消费特殊技作用域增益），元素由调用方按实际结算声明；[聚墨]取得链、一层上限与按键时序不模拟。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 2,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/talent/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/talent/2/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "yixuan:talisman-suppression-break-damage",
                stat: "sheerForce",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "special",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:yixuan-talisman-suppression-break",
        upstreamId: null,
        agentEntityId: "1371",
        category: "special",
        name: "强化特殊技：符法千重-破",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "yixuan:talisman-suppression-break-damage",
        stat: "sheerForce",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "special",
      },
    },
  },
  {
    key: "agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:yixuan",
      identity: {
        kind: "agent",
        entityId: "1371",
      },
    },
    ids: {
      optionId: "nanoka:agents:yixuan:m1-falling-thunder-damage",
      effectId: "agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1",
    },
    section: "影画1：清灵道心（落雷）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/talent/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/talent/1/desc",
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
        value: 1,
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
          values: ["sheer"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:yixuan-m1-falling-thunder"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["yixuan:m1-falling-thunder-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 0.5,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:yixuan:m1-falling-thunder-damage",
      catalogEntityId: "agents:yixuan",
      name: "影画1 · 清灵道心落雷（独立结算）",
      conditionDescription:
        "影画 1 起：队伍中任意角色命中敌人时，仪玄自动追加一道落雷，按仪玄当前贯穿力的 50% 结算一次独立贯穿伤害并额外回复 5 点闪能（资源不模拟）。触发由调用方声明并逐次结算：独立项以 uncategorized 分类锁定、元素由调用方按实际结算声明；6 秒内最多一次的触发间隔不模拟。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 1,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/talent/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/talent/1/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "yixuan:m1-falling-thunder-damage",
                stat: "sheerForce",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:yixuan-m1-falling-thunder",
        upstreamId: null,
        agentEntityId: "1371",
        category: "uncategorized",
        name: "清灵道心·落雷",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "yixuan:m1-falling-thunder-damage",
        stat: "sheerForce",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
    },
  },
  {
    key: "agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:yixuan",
      identity: {
        kind: "agent",
        entityId: "1371",
      },
    },
    ids: {
      optionId: "nanoka:agents:yixuan:aa-falling-thunder-damage",
      effectId: "agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0",
    },
    section: "额外能力：玄墨暗涌（落雷）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/passive/level/1371507/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/passive/level/1371507/desc/1",
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
          values: ["sheer"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:yixuan-aa-falling-thunder"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["yixuan:aa-falling-thunder-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 2.25,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:yixuan:aa-falling-thunder-damage",
      catalogEntityId: "agents:yixuan",
      name: "额外能力：玄墨暗涌 · 落雷（独立结算）",
      conditionDescription:
        "额外能力：同队存在[击破]、[支援]或[防护]角色时（由目录按绑定队伍校验资格），仪玄被极限支援换下场时自动追加一道落雷，按仪玄当前贯穿力的 225% 结算一次独立贯穿伤害并额外回复 5 点闪能（资源不模拟）。触发由调用方声明并逐次结算：独立项以 uncategorized 分类锁定、元素由调用方按实际结算声明；极限支援检测与换人时序不模拟。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {},
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/passive/level/1371507/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/passive/level/1371507/desc/1",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {
            otherTeammateProfessions: ["击破", "支援", "防护"],
          },
          effectKeys: [
            "agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "yixuan:aa-falling-thunder-damage",
                stat: "sheerForce",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:yixuan-aa-falling-thunder",
        upstreamId: null,
        agentEntityId: "1371",
        category: "uncategorized",
        name: "玄墨暗涌·落雷",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "yixuan:aa-falling-thunder-damage",
        stat: "sheerForce",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
    },
  },
  {
    key: "agent:1621:nanoka:core-element-critical-damage",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:core-element-critical-damage",
      effectId: "agent:1621:nanoka:core-element-critical-damage",
    },
    section: "核心 · 有效元素增益普通暴伤",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621501/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621502/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621503/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621504/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621505/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621506/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621501/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621502/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621503/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621504/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621505/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621506/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621507/desc/0",
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
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/specialElementType/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/specialElementType/desc",
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
      exclusiveGroup: "roxy:criticalDamage:core-state-model",
    },
    beneficiary: {
      kind: "team",
    },
    scope: "hit",
    when: {
      kind: "any",
      conditions: [
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["physical", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:physical",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["fire", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:fire",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["ice", "frost", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:ice",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["electric", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:electric",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["ether", "auric-ink", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:ether",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
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
        kind: "minimum",
        unit: "ratio",
        operands: [
          {
            kind: "parameter",
            unit: "ratio",
            name: "cap",
          },
          {
            kind: "multiply",
            unit: "ratio",
            value: {
              kind: "maximum",
              unit: "ratio",
              operands: [
                {
                  kind: "literal",
                  unit: "ratio",
                  value: 0,
                },
                {
                  kind: "input",
                  unit: "ratio",
                  name: "roxy:core:external-critical-rate",
                },
              ],
            },
            coefficient: {
              kind: "parameter",
              unit: "ratio",
              name: "coefficient",
            },
          },
        ],
      },
    },
    parameters: {
      coefficient: {
        kind: "constant",
        unit: "ratio",
        value: 0.4,
      },
      cap: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "ratio",
        values: {
          "1": 0.22,
          "2": 0.25,
          "3": 0.28,
          "4": 0.31,
          "5": 0.34,
          "6": 0.37,
          "7": 0.4,
        },
      },
    },
    uniqueness: {
      key: "nanoka:agents:1621:core-wind-critical-damage:single-source",
      scope: "team",
      select: {
        kind: "single-source-only",
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:core-element-critical-damage",
      catalogEntityId: "agents:Roxy",
      name: "核心 · 有效元素增益普通暴伤",
      conditionDescription:
        "调用方用activeBuffElements明确声明本来源仍有效的元素增益集合（physical/fire/ice/electric/ether），正层必须非空且无重复，0层关闭。每个元素状态分别由调用方维护50秒及刷新；不推算浸染、净化、风化覆盖或时间线，不代表敌人当前风化/浸染状态。按命中元素匹配已激活属性或风，冰包含烈霜，以太包含玄墨；不改实际攻击元素，不支持把wind/frost/auric-ink/lumiflux声明为独立浸染属性。多个属性取覆盖并集，同一命中只贡献一次；两职业分支共用本绑定的元素事实及局外CR，声明必须一致。非锋御普通CD、锋御锐暴伤，核心1—7与局外CR帽沿原文。同绑定同职业分支与旧core-wind选项互斥，不能双算；不同来源在实际消费同一输出时仍按single-source-only明确拒绝，不猜覆盖或最强来源。此选项不包括额外能力的8%直接伤害。",
      target: "team",
      exclusiveGroup: "roxy:criticalDamage:core-state-model",
      variants: [
        {
          target: "team",
          configuration: {
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621501/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621502/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621503/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621504/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621505/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621506/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621501/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621502/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621503/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621504/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621505/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621506/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621507/desc/0",
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
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/specialElementType/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/specialElementType/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [
            {
              name: "roxy:core:external-critical-rate",
              unit: "ratio",
              description:
                "该绑定洛克茜的局外暴击率读数，0.5代表50%；调用方显式提供，无默认值，不读战斗current CR。",
            },
          ],
          applicability: {
            excludedBeneficiaryProfession: "锋御",
          },
          effectKeys: ["agent:1621:nanoka:core-element-critical-damage"],
          catalogMechanism: {
            kind: "element-buff-inputs",
            inputs: [
              {
                element: "physical",
                inputName: "roxy:core:active-buff:physical",
              },
              {
                element: "fire",
                inputName: "roxy:core:active-buff:fire",
              },
              {
                element: "ice",
                inputName: "roxy:core:active-buff:ice",
              },
              {
                element: "electric",
                inputName: "roxy:core:active-buff:electric",
              },
              {
                element: "ether",
                inputName: "roxy:core:active-buff:ether",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:core-element-sharp-critical-damage",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:core-element-sharp-critical-damage",
      effectId: "agent:1621:nanoka:core-element-sharp-critical-damage",
    },
    section: "核心 · 有效元素增益锐暴伤",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621501/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621502/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621503/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621504/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621505/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621506/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/passive/level/1621507/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621501/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621502/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621503/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621504/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621505/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621506/desc/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
        pointer: "/passive/level/1621507/desc/0",
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
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1371/details.zh.json",
        pointer: "/specialElementType/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1371/details.en.json",
        pointer: "/specialElementType/desc",
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
      exclusiveGroup: "roxy:sharpCriticalDamage:core-state-model",
    },
    beneficiary: {
      kind: "team",
    },
    scope: "hit",
    when: {
      kind: "any",
      conditions: [
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["physical", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:physical",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["fire", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:fire",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["ice", "frost", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:ice",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["electric", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:electric",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
        {
          kind: "all",
          conditions: [
            {
              kind: "one-of",
              fact: "hit.element",
              values: ["ether", "auric-ink", "wind"],
            },
            {
              kind: "compare-number",
              unit: "count",
              operator: "eq",
              left: {
                kind: "input",
                unit: "count",
                name: "roxy:core:active-buff:ether",
              },
              right: {
                kind: "literal",
                unit: "count",
                value: 1,
              },
            },
          ],
        },
      ],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "sharpCriticalDamage",
      stage: "direct",
      value: {
        kind: "minimum",
        unit: "ratio",
        operands: [
          {
            kind: "parameter",
            unit: "ratio",
            name: "cap",
          },
          {
            kind: "multiply",
            unit: "ratio",
            value: {
              kind: "maximum",
              unit: "ratio",
              operands: [
                {
                  kind: "literal",
                  unit: "ratio",
                  value: 0,
                },
                {
                  kind: "input",
                  unit: "ratio",
                  name: "roxy:core:external-critical-rate",
                },
              ],
            },
            coefficient: {
              kind: "parameter",
              unit: "ratio",
              name: "coefficient",
            },
          },
        ],
      },
    },
    parameters: {
      coefficient: {
        kind: "constant",
        unit: "ratio",
        value: 0.2,
      },
      cap: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "ratio",
        values: {
          "1": 0.1,
          "2": 0.115,
          "3": 0.13,
          "4": 0.145,
          "5": 0.16,
          "6": 0.175,
          "7": 0.2,
        },
      },
    },
    uniqueness: {
      key: "nanoka:agents:1621:core-wind-sharp-critical-damage:single-source",
      scope: "team",
      select: {
        kind: "single-source-only",
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:core-element-sharp-critical-damage",
      catalogEntityId: "agents:Roxy",
      name: "核心 · 有效元素增益锐暴伤",
      conditionDescription:
        "调用方用activeBuffElements明确声明本来源仍有效的元素增益集合（physical/fire/ice/electric/ether），正层必须非空且无重复，0层关闭。每个元素状态分别由调用方维护50秒及刷新；不推算浸染、净化、风化覆盖或时间线，不代表敌人当前风化/浸染状态。按命中元素匹配已激活属性或风，冰包含烈霜，以太包含玄墨；不改实际攻击元素，不支持把wind/frost/auric-ink/lumiflux声明为独立浸染属性。多个属性取覆盖并集，同一命中只贡献一次；两职业分支共用本绑定的元素事实及局外CR，声明必须一致。非锋御普通CD、锋御锐暴伤，核心1—7与局外CR帽沿原文。同绑定同职业分支与旧core-wind选项互斥，不能双算；不同来源在实际消费同一输出时仍按single-source-only明确拒绝，不猜覆盖或最强来源。此选项不包括额外能力的8%直接伤害。",
      target: "team",
      exclusiveGroup: "roxy:sharpCriticalDamage:core-state-model",
      variants: [
        {
          target: "team",
          configuration: {
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621501/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621502/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621503/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621504/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621505/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621506/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/passive/level/1621507/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621501/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621502/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621503/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621504/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621505/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621506/desc/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/passive/level/1621507/desc/0",
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
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1371/details.zh.json",
              pointer: "/specialElementType/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1371/details.en.json",
              pointer: "/specialElementType/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [
            {
              name: "roxy:core:external-critical-rate",
              unit: "ratio",
              description:
                "该绑定洛克茜的局外暴击率读数，0.5代表50%；调用方显式提供，无默认值，不读战斗current CR。",
            },
          ],
          applicability: {
            beneficiaryProfession: "锋御",
          },
          effectKeys: ["agent:1621:nanoka:core-element-sharp-critical-damage"],
          catalogMechanism: {
            kind: "element-buff-inputs",
            inputs: [
              {
                element: "physical",
                inputName: "roxy:core:active-buff:physical",
              },
              {
                element: "fire",
                inputName: "roxy:core:active-buff:fire",
              },
              {
                element: "ice",
                inputName: "roxy:core:active-buff:ice",
              },
              {
                element: "electric",
                inputName: "roxy:core:active-buff:electric",
              },
              {
                element: "ether",
                inputName: "roxy:core:active-buff:ether",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1311:nanoka:m4-quick-assist-bonus-damage:mindscape:4",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:astrayao",
      identity: {
        kind: "agent",
        entityId: "1311",
      },
    },
    ids: {
      optionId: "nanoka:agents:astrayao:m4-quick-assist-bonus-damage",
      effectId: "agent:1311:nanoka:m4-quick-assist-bonus-damage:mindscape:4",
    },
    section: "后颈的碎发（一次强攻队友快速支援附伤）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1311/details.zh.json",
        pointer: "/talent/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1311/details.en.json",
        pointer: "/talent/4/desc",
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
            value: 4,
          },
        },
        {
          kind: "compare-number",
          unit: "count",
          operator: "gte",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "coreSkillLevel",
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
      kind: "team-except-holder",
    },
    scope: "hit",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "astra-yao-m4-quick-assist-damage",
      multiplier: {
        unit: "multiplier",
        value: 3,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:astrayao:m4-quick-assist-bonus-damage",
      catalogEntityId: "agents:astrayao",
      name: "后颈的碎发 · 强攻队友快速支援附伤（显式条件模型）",
      conditionDescription:
        "只由具名 astra-yao-m4-quick-assist-damage 事件结算一次 3×耀嘉音当前 ATK；队友为实际命中者。regular/uncategorized、元素、声明概率与 CD/穿透来源是条件模型，不是游戏实测结论。未选/0 层仍验证完整依赖，不向普通动作自动追加。",
      target: "team",
      variants: [
        {
          target: "team",
          configuration: {
            minimumMindscape: 4,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1311/details.zh.json",
              pointer: "/talent/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1311/details.en.json",
              pointer: "/talent/4/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1311:nanoka:m4-quick-assist-bonus-damage:mindscape:4",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            isolateDamageItems: true,
            damageItemRequirements: [
              {
                itemId: "astrayao:m4-quick-assist-bonus-damage",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      damageItem: {
        itemId: "astrayao:m4-quick-assist-bonus-damage",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "agent:1181:nanoka:m6-special-grenades:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:grace",
      identity: {
        kind: "agent",
        entityId: "1181",
      },
    },
    ids: {
      optionId: "nanoka:agents:grace:m6-special-grenades",
      effectId: "agent:1181:nanoka:m6-special-grenades:mindscape:6",
    },
    section: "影画6：起爆扳机（工程清障）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/0/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/5/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/6/param/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/0/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/5/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/6/param/0",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["electric"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["special"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:grace-special-grenades"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "scale",
      itemIds: ["action:agent:1181:action:0012:base"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 4,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:grace:m6-special-grenades",
      catalogEntityId: "agents:grace",
      name: "影画6 · 起爆扳机（工程清障）",
      conditionDescription:
        "本次已消耗全部电能发动工程清障，所有原组合手雷命中且各次乘区相同：原一颗变两颗，每颗×2，原合计×4。使用原动作倍率，不重复手动强化；不包含涡流、电磁场、循环或脉冲/异放的未证M6修正。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/0/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/5/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/6/param/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/0/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/5/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/6/param/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1181:nanoka:m6-special-grenades:mindscape:6"],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "action:agent:1181:action:0012:base",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:grace-special-grenades",
        upstreamId: null,
        agentEntityId: "1181",
        category: "special",
        name: "工程清障",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "action:agent:1181:action:0012:base",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
      },
    },
  },
  {
    key: "agent:1181:nanoka:m6-ex-special-grenades:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:grace",
      identity: {
        kind: "agent",
        entityId: "1181",
      },
    },
    ids: {
      optionId: "nanoka:agents:grace:m6-ex-special-grenades",
      effectId: "agent:1181:nanoka:m6-ex-special-grenades:mindscape:6",
    },
    section: "影画6：起爆扳机（超规工程清障（原两颗手雷））",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/0/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/5/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1181/details.zh.json",
        pointer: "/skill/special/description/7/param/0",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/0/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/5/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1181/details.en.json",
        pointer: "/skill/special/description/7/param/0",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["electric"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["enhanced-special"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:grace-ex-special-grenades"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "scale",
      itemIds: ["action:agent:1181:action:0013:base"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 3,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:grace:m6-ex-special-grenades",
      catalogEntityId: "agents:grace",
      name: "影画6 · 起爆扳机（超规工程清障（原两颗手雷））",
      conditionDescription:
        "本次已消耗全部电能发动超规工程清障（原两颗手雷），所有原组合手雷命中且各次乘区相同：原两颗变三颗，每颗×2，原合计×3。使用原动作倍率，不重复手动强化；不包含涡流、电磁场、循环或脉冲/异放的未证M6修正。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/0/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/5/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1181/details.zh.json",
              pointer: "/skill/special/description/7/param/0",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/0/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/5/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1181/details.en.json",
              pointer: "/skill/special/description/7/param/0",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1181:nanoka:m6-ex-special-grenades:mindscape:6"],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "action:agent:1181:action:0013:base",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:grace-ex-special-grenades",
        upstreamId: null,
        agentEntityId: "1181",
        category: "enhanced-special",
        name: "超规工程清障（原两颗手雷）",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "action:agent:1181:action:0013:base",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
      },
    },
  },
  {
    key: "agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:evelyn",
      identity: {
        kind: "agent",
        entityId: "1321",
      },
    },
    ids: {
      optionId: "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
      effectId: "agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6",
    },
    section: "影画6：光与影的牵绊（月辉丝·弦）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321501/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321502/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321503/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321504/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321505/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321506/desc/1",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1321/details.zh.json",
        pointer: "/passive/level/1321507/desc/1",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["fire"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:evelyn-lunalux-garrote"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["evelyn:lunalux-garrote"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 3.75,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
      catalogEntityId: "agents:evelyn",
      name: "影画6 · 月辉丝·弦（独立追击）",
      conditionDescription:
        "影画 6：连携/终结取得[弦影绝锋]后，[普通攻击]、[冲刺攻击]、[特殊技]或[强化特殊技]命中主要攻击目标时，额外释放一段[月辉丝·弦]，对范围内敌人造成等同于伊芙琳 375% 攻击力的火属性伤害（该伤害被视为[连携技]伤害）。本次追击由调用方声明触发并显式结算：命中须携带独立目标并以连携分类结算，16 次上限、20 秒持续与刷新不模拟。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321501/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321502/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321503/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321504/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321505/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321506/desc/1",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1321/details.zh.json",
              pointer: "/passive/level/1321507/desc/1",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "evelyn:lunalux-garrote",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "chain",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:evelyn-lunalux-garrote",
        upstreamId: null,
        agentEntityId: "1321",
        category: "chain",
        name: "月辉丝·弦",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "evelyn:lunalux-garrote",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "chain",
      },
    },
  },
  {
    key: "agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:s0anby",
      identity: {
        kind: "agent",
        entityId: "1381",
      },
    },
    ids: {
      optionId: "nanoka:agents:s0anby:m6-electromagnetic-vortex",
      effectId: "agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6",
    },
    section: "影画6：前传主角（电磁涡流）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1381/details.zh.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["electric"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:s0anby-electromagnetic-vortex"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["s0anby:electromagnetic-vortex"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 10,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:s0anby:m6-electromagnetic-vortex",
      catalogEntityId: "agents:s0anby",
      name: "影画6 · 电磁涡流（独立追击）",
      conditionDescription:
        "影画 6：触发 6 次[白雷]的额外伤害时引发电磁涡流，对目标及其周围的敌人造成零号·安比 1000% 攻击力的电属性伤害（该伤害被视为[追加攻击]伤害）。本次涡流由调用方声明触发并显式结算一次：命中须携带独立目标并以追加攻击分类结算（自动计入追加攻击增益），六次计数不自动累计，1000% 不乘 6，也不计作白雷本身。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1381/details.zh.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "s0anby:electromagnetic-vortex",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "follow-up",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:s0anby-electromagnetic-vortex",
        upstreamId: null,
        agentEntityId: "1381",
        category: "follow-up",
        name: "电磁涡流",
        countsAsFollowUp: true,
      },
      damageItem: {
        itemId: "s0anby:electromagnetic-vortex",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "follow-up",
      },
    },
  },
  {
    key: "agent:1481:nanoka:m6-aftertone-echo:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:dialyn",
      identity: {
        kind: "agent",
        entityId: "1481",
      },
    },
    ids: {
      optionId: "nanoka:agents:dialyn:m6-aftertone-echo",
      effectId: "agent:1481:nanoka:m6-aftertone-echo:mindscape:6",
    },
    section: "影画6：真言（余音额外伤害）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1481/details.zh.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["physical"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:dialyn-aftertone-echo"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["dialyn:aftertone-echo"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 4.8,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:dialyn:m6-aftertone-echo",
      catalogEntityId: "agents:dialyn",
      name: "影画6 · 余音（独立追击）",
      conditionDescription:
        "影画 6：经[核心被动]使队友以终结技入场取得[余音]后，该队友攻击命中敌人时，琉音对敌人造成额外一次等同于琉音 480% 攻击力的物理属性伤害（该伤害被视为[强化特殊技]伤害）。本次伤害由调用方声明触发并显式结算：hit.actorId 与伤害项均按琉音结算（队友只是触发者），命中须携带独立目标并以强化特殊技分类结算；1 秒冷却、12 次上限、刷新与唯一持有人不模拟。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1481/details.zh.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1481:nanoka:m6-aftertone-echo:mindscape:6"],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "dialyn:aftertone-echo",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "enhanced-special",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:dialyn-aftertone-echo",
        upstreamId: null,
        agentEntityId: "1481",
        category: "special",
        name: "余音额外伤害",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "dialyn:aftertone-echo",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "enhanced-special",
      },
    },
  },
  {
    key: "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:lighter",
      identity: {
        kind: "agent",
        entityId: "1161",
      },
    },
    ids: {
      optionId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
      effectId:
        "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
    },
    section: "影画4",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1161/details.zh.json",
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
      kind: "team-except-holder",
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
        kind: "multiply",
        unit: "energy-per-second",
        value: {
          kind: "stat",
          unit: "energy-per-second",
          entity: {
            role: "beneficiary",
          },
          stat: "energyRegen",
          stage: "base",
          at: "evaluation",
        },
        coefficient: {
          kind: "parameter",
          unit: "ratio",
          name: "amount",
        },
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
      optionId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
      catalogEntityId: "agents:lighter",
      name: "影画4 · energyRegen（前场角色）",
      conditionDescription:
        "莱特位于后场时，仅当前前场角色的能量自动回复效率提升 10%（受益者基础回能 × 10%；基础回能 1.2/5.0 下分别 +0.12/+0.5 点/秒）；选择本选项即断言莱特位于后场，并须以 beneficiaryActorId 显式声明当前前场角色（持有者同队的另一名实体），后场队友与莱特本人不受益。同句的后场回复 4 点能量（18 秒冷却）是独立瞬时机制，不在本选项内。",
      target: "team",
      variants: [
        {
          target: "team",
          configuration: {
            minimumMindscape: 4,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1161/details.zh.json",
              pointer: "/talent/4/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
          ],
          catalogMechanism: {
            kind: "declared-teammate-beneficiary",
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "w-engine:14162:nanoka:squad-damage-bonus",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Crimson_Moon_Casket",
      identity: {
        kind: "w-engine",
        entityId: "14162",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14162:squad-damage-bonus",
      effectId: "w-engine:14162:nanoka:squad-damage-bonus",
    },
    section: "绯月银棺：全队增伤（触发状态）",
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
      kind: "team-except-holder",
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
      optionId: "nanoka:w-engines:14162:squad-damage-bonus",
      catalogEntityId: "w-engines:Crimson_Moon_Casket",
      name: "绯月银棺 · teamDmgBonus",
      conditionDescription:
        "装备者发动[强化特殊技]造成风属性伤害时，全队其他角色造成的伤害提升 20/23/26/29/32%（按精炼 1—5），持续 50 秒，重复触发刷新持续时间；触发事实由调用方启用本选项断言，50 秒与刷新不模拟。受益者是持有者同队其他角色（本人与异队不受益），增伤不按元素或技能筛选受益者的伤害。伤害提升效果全队唯一：同一队伍最多一个启用来源，须声明单一有效来源（只在一名持有者的绑定上启用）；失衡值提升条款不在本选项。与暴击率、风抗忽视相互独立。",
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
          effectKeys: ["w-engine:14162:nanoka:squad-damage-bonus"],
          catalogMechanism: {
            kind: "squad-unique",
          },
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1511:nanoka:m6-vibrato-modified-nonphysical:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:nangongyu",
      identity: {
        kind: "agent",
        entityId: "1511",
      },
    },
    ids: {
      optionId: "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
      effectId: "agent:1511:nanoka:m6-vibrato-modified-nonphysical:mindscape:6",
    },
    section: "影画6：天使的妄想（颤音：改异放）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1511/details.zh.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["anomaly-settlement"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["ether", "electric", "fire", "ice", "wind"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:nangongyu-vibrato-modified"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["nangongyu:vibrato-modified"],
      value: {
        kind: "multiply",
        unit: "multiplier",
        value: {
          kind: "literal",
          unit: "multiplier",
          value: 5,
        },
        coefficient: {
          kind: "add",
          unit: "ratio",
          operands: [
            {
              kind: "literal",
              unit: "ratio",
              value: 1,
            },
            {
              kind: "convert",
              unit: "ratio",
              input: {
                kind: "input",
                unit: "count",
                name: "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical:layers",
              },
              rate: {
                kind: "literal",
                unit: "multiplier",
                value: 0.25,
              },
            },
          ],
        },
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
      catalogEntityId: "agents:nangongyu",
      name: "影画6 · 颤音：改（非物理异放结算）",
      conditionDescription:
        "影画 6：敌人不处于失衡时按所列事件累计[颤音：改]（最多 4 层），进入失衡时全部清除；清除时若存在原属性异常，南宫羽结算一次[异放]伤害，基础比例 = 原异常系数 × M6 比例（以太/电/火/冰/风归一为 5），每层再 +25%。本选项覆盖五种非物理原异常，按本次结算声明的命中元素匹配（物理走同组的物理选项）。调用方声明本次清除事件与有效层数（selection.layers：0 关闭、严格整数 1—4）：命中以 uncategorized 分类携带独立目标、以 damage.kind=anomaly-settlement 结算，伤害项倍率从 0 开始由规则一次赋值，statSource 与 damage.anomalySource 一致（复用原异常虚拟来源与快照）；携带其他技能分类/分类标签/其他真实目标按冲突拒绝。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1511/details.zh.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 4,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1511:nanoka:m6-vibrato-modified-nonphysical:mindscape:6",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "nangongyu:vibrato-modified",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "anomaly-source",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
            completeState: {
              layerCountInputName:
                "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical:layers",
            },
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:nangongyu-vibrato-modified",
        upstreamId: null,
        agentEntityId: "1511",
        category: "uncategorized",
        name: "颤音：改异放结算",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "nangongyu:vibrato-modified",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "anomaly-source",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
    },
  },
  {
    key: "agent:1511:nanoka:m6-vibrato-modified-physical:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:nangongyu",
      identity: {
        kind: "agent",
        entityId: "1511",
      },
    },
    ids: {
      optionId: "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
      effectId: "agent:1511:nanoka:m6-vibrato-modified-physical:mindscape:6",
    },
    section: "影画6：天使的妄想（颤音：改异放）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1511/details.zh.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["anomaly-settlement"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["physical"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:nangongyu-vibrato-modified"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["nangongyu:vibrato-modified"],
      value: {
        kind: "multiply",
        unit: "multiplier",
        value: {
          kind: "literal",
          unit: "multiplier",
          value: 4.991,
        },
        coefficient: {
          kind: "add",
          unit: "ratio",
          operands: [
            {
              kind: "literal",
              unit: "ratio",
              value: 1,
            },
            {
              kind: "convert",
              unit: "ratio",
              input: {
                kind: "input",
                unit: "count",
                name: "nanoka:agents:nangongyu:m6-vibrato-modified-physical:layers",
              },
              rate: {
                kind: "literal",
                unit: "multiplier",
                value: 0.25,
              },
            },
          ],
        },
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
      catalogEntityId: "agents:nangongyu",
      name: "影画6 · 颤音：改（物理异放结算）",
      conditionDescription:
        "影画 6：敌人不处于失衡时按所列事件累计[颤音：改]（最多 4 层），进入失衡时全部清除；清除时若存在原属性异常，南宫羽结算一次[异放]伤害，基础比例 = 原异常系数 × M6 比例（物理 7.13×0.7=4.991，保留精度），每层再 +25%。本选项只覆盖物理原异常（hit.element=physical），非物理原异常走同组的非物理选项。调用方声明本次清除事件与有效层数（selection.layers：0 关闭、严格整数 1—4）：命中以 uncategorized 分类携带独立目标、以 damage.kind=anomaly-settlement 结算，伤害项倍率从 0 开始由规则一次赋值，statSource 与 damage.anomalySource 一致（复用原异常虚拟来源与快照）；携带其他技能分类/分类标签/其他真实目标按冲突拒绝。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1511/details.zh.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 4,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1511:nanoka:m6-vibrato-modified-physical:mindscape:6",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "nangongyu:vibrato-modified",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "anomaly-source",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
            completeState: {
              layerCountInputName:
                "nanoka:agents:nangongyu:m6-vibrato-modified-physical:layers",
            },
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:nangongyu-vibrato-modified",
        upstreamId: null,
        agentEntityId: "1511",
        category: "uncategorized",
        name: "颤音：改异放结算",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "nangongyu:vibrato-modified",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "anomaly-source",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
    },
  },
  {
    key: "w-engine:13112:nanoka:retaliation-defense-damage",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Big_Cylinder",
      identity: {
        kind: "w-engine",
        entityId: "13112",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:13112:retaliation-defense-damage",
      effectId: "w-engine:13112:nanoka:retaliation-defense-damage",
    },
    section: "万斤顶（受击附伤）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
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
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:big-cylinder-retaliation"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["big-cylinder:retaliation"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "multiplier",
        values: {
          "1": 6,
          "2": 6.9,
          "3": 7.8,
          "4": 8.7,
          "5": 9.6,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:13112:retaliation-defense-damage",
      catalogEntityId: "w-engines:Big_Cylinder",
      name: "万斤顶 · 受击附伤（独立结算）",
      conditionDescription:
        "受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者 600/690/780/870/960% 防御力的伤害（按精炼 1—5），该额外伤害由来源保证最终暴击概率为 1，不接受显式 criticalRate 来源或 declaredCriticalRate，普通暴伤保留既有来源契约；7.5 秒内最多触发一次。本次附伤由调用方声明触发并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取装备者当前防御力（元素由调用方按实际结算声明，来源未标注）；7.5 秒冷却与触发检测不模拟。首句承伤降低不属于本选项。",
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
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "w-engine:13112:nanoka:retaliation-defense-damage",
            "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "big-cylinder:retaliation",
                stat: "defense",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
            isolateDamageItems: true,
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:big-cylinder-retaliation",
        upstreamId: null,
        agentEntityId: null,
        category: "uncategorized",
        name: "比格气缸受击附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "big-cylinder:retaliation",
        stat: "defense",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Big_Cylinder",
      identity: {
        kind: "w-engine",
        entityId: "13112",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:13112:retaliation-defense-damage",
      effectId:
        "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
    },
    section: "万斤顶（受击附伤 · 必定暴击）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/13112/details.zh.json",
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
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:big-cylinder-retaliation"],
        },
      ],
    },
    operation: {
      kind: "guaranteed-critical",
      itemId: "big-cylinder:retaliation",
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:13112:retaliation-defense-damage",
      catalogEntityId: "w-engines:Big_Cylinder",
      name: "万斤顶 · 受击附伤（独立结算）",
      conditionDescription:
        "受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者 600/690/780/870/960% 防御力的伤害（按精炼 1—5），该额外伤害由来源保证最终暴击概率为 1，不接受显式 criticalRate 来源或 declaredCriticalRate，普通暴伤保留既有来源契约；7.5 秒内最多触发一次。本次附伤由调用方声明触发并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取装备者当前防御力（元素由调用方按实际结算声明，来源未标注）；7.5 秒冷却与触发检测不模拟。首句承伤降低不属于本选项。",
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
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/13112/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "w-engine:13112:nanoka:retaliation-defense-damage",
            "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            damageItemRequirements: [
              {
                itemId: "big-cylinder:retaliation",
                stat: "defense",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
            isolateDamageItems: true,
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:big-cylinder-retaliation",
        upstreamId: null,
        agentEntityId: null,
        category: "uncategorized",
        name: "比格气缸受击附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "big-cylinder:retaliation",
        stat: "defense",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "w-engine:14001:nanoka:critical-hit-bonus-damage",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "w-engines:Cannon_Rotor",
      identity: {
        kind: "w-engine",
        entityId: "14001",
      },
    },
    ids: {
      optionId: "nanoka:w-engines:14001:critical-hit-bonus-damage",
      effectId: "w-engine:14001:nanoka:critical-hit-bonus-damage",
    },
    section: "口径超规（暴击附伤）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14001/details.zh.json",
        pointer: "/talents/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14001/details.zh.json",
        pointer: "/talents/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14001/details.zh.json",
        pointer: "/talents/3/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14001/details.zh.json",
        pointer: "/talents/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "w-engines/14001/details.zh.json",
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
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:cannon-rotor-bonus-damage"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["cannon-rotor:bonus-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "multiplier",
        values: {
          "1": 2,
          "2": 2,
          "3": 2,
          "4": 2,
          "5": 2,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:w-engines:14001:critical-hit-bonus-damage",
      catalogEntityId: "w-engines:Cannon_Rotor",
      name: "口径超规 · 暴击附伤（独立结算）",
      conditionDescription:
        "攻击命中敌人并触发暴击时，额外造成 200% 攻击力的伤害（五档同值），8/7.5/7/6.5/6 秒内最多触发一次。本次附伤由调用方声明触发攻击暴击并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取装备者当前攻击力，并显式声明本次独立附伤采用的最终暴击概率（hit.declaredCriticalRate，无默认值；元素同样由调用方按实际结算声明，来源未标注）。结果的暴击分支沿用装备者当前普通暴击伤害，是本接口的条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害。触发间隔与暴击检测不模拟。同音擎的常驻攻击力选项独立共存。",
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
              resourcePath: "w-engines/14001/details.zh.json",
              pointer: "/talents/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14001/details.zh.json",
              pointer: "/talents/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14001/details.zh.json",
              pointer: "/talents/3/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14001/details.zh.json",
              pointer: "/talents/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "w-engines/14001/details.zh.json",
              pointer: "/talents/5/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["w-engine:14001:nanoka:critical-hit-bonus-damage"],
          catalogMechanism: {
            kind: "independent-settlement",
            isolateDamageItems: true,
            damageItemRequirements: [
              {
                itemId: "cannon-rotor:bonus-damage",
                stat: "attack",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
                requiredCriticalRateDeclaration: true,
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:cannon-rotor-bonus-damage",
        upstreamId: null,
        agentEntityId: null,
        category: "uncategorized",
        name: "加农转子暴击附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "cannon-rotor:bonus-damage",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        requiredCriticalRateDeclaration: true,
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:benbigger",
      identity: {
        kind: "agent",
        entityId: "1121",
      },
    },
    ids: {
      optionId: "nanoka:agents:benbigger:m2-block-counter-defense-damage",
      effectId: "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
    },
    section: "影画2：以守为攻（格挡反击附伤）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1121/details.zh.json",
        pointer: "/talent/2/desc",
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:benbigger-block-counter-bonus-damage"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["benbigger:block-counter-bonus-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 3,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:benbigger:m2-block-counter-defense-damage",
      catalogEntityId: "agents:benbigger",
      name: "以守为攻 · 格挡反击附伤（独立结算）",
      conditionDescription:
        "影画 2：在[特殊技]或[强化特殊技]中，成功触发格挡反击时，额外造成本 300% 防御力的伤害。本次附伤由调用方声明触发并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取本当前防御力，并显式声明本次独立附伤采用的最终暴击概率（hit.declaredCriticalRate，无默认值；元素同样由调用方按实际结算声明，来源未标注）。结果的暴击分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读本当前普通暴击伤害），是本接口的条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害。格挡成功检测、时间窗、追击次数、盾值与冷却不模拟；[特殊技]/[强化特殊技]的主动攻击、追加攻击与格挡追击段不经本选项结算。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 2,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1121/details.zh.json",
              pointer: "/talent/2/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            isolateDamageItems: true,
            damageItemRequirements: [
              {
                itemId: "benbigger:block-counter-bonus-damage",
                stat: "defense",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
                requiredCriticalRateDeclaration: true,
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:benbigger-block-counter-bonus-damage",
        upstreamId: null,
        agentEntityId: "1121",
        category: "uncategorized",
        name: "本格挡反击附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "benbigger:block-counter-bonus-damage",
        stat: "defense",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        requiredCriticalRateDeclaration: true,
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "agent:1261:nanoka:m6-proficiency-damage:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:jane",
      identity: {
        kind: "agent",
        entityId: "1261",
      },
    },
    ids: {
      optionId: "nanoka:agents:jane:m6-proficiency-damage",
      effectId: "agent:1261:nanoka:m6-proficiency-damage:mindscape:6",
    },
    section: "「肮脏」技巧（精通附伤）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1261/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1261/details.en.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:jane-m6-proficiency-damage"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["physical"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["jane:m6-proficiency-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 16,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:jane:m6-proficiency-damage",
      catalogEntityId: "agents:jane",
      name: "「肮脏」技巧 · 精通附伤（独立结算）",
      conditionDescription:
        "队伍角色施加的该次强击暴击后，声明简触发一次物理附伤（自身当前异常精通 ×16）。独占 uncategorized 独立项、零初始倍率；调用方必须显式声明新附伤最终暴击概率 hit.declaredCriticalRate，触发强击已暴击不代替此声明。普通暴伤沿既有来源与命中贡献，这是条件计算，不证明附伤的游戏暴击能力或暴伤继承。狂热 CR/CD 选项独立选择，不自动加入。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1261/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1261/details.en.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1261:nanoka:m6-proficiency-damage:mindscape:6"],
          catalogMechanism: {
            kind: "independent-settlement",
            isolateDamageItems: true,
            damageItemRequirements: [
              {
                itemId: "jane:m6-proficiency-damage",
                stat: "anomalyProficiency",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
                requiredCriticalRateDeclaration: true,
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:jane-m6-proficiency-damage",
        upstreamId: null,
        agentEntityId: "1261",
        category: "uncategorized",
        name: "简影画六精通附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "jane:m6-proficiency-damage",
        stat: "anomalyProficiency",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        requiredCriticalRateDeclaration: true,
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "agent:1401:nanoka:m6-proficiency-damage:mindscape:6",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:alice",
      identity: {
        kind: "agent",
        entityId: "1401",
      },
    },
    ids: {
      optionId: "nanoka:agents:alice:m6-proficiency-damage",
      effectId: "agent:1401:nanoka:m6-proficiency-damage:mindscape:6",
    },
    section: "心中的百里香（精通附伤）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1401/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1401/details.en.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:alice-m6-proficiency-damage"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["physical"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["alice:m6-proficiency-damage"],
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "multiplier",
        value: 33,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:alice:m6-proficiency-damage",
      catalogEntityId: "agents:alice",
      name: "心中的百里香 · 精通必暴附伤（独立结算）",
      conditionDescription:
        "决胜状态内队伍角色命中后，声明爱丽丝触发一次物理必暴附伤（自身当前异常精通 ×33）。独占 uncategorized 独立项、零初始倍率；来源保证本次附伤最终暴击概率为 1，不接受显式 criticalRate 来源或 declaredCriticalRate。普通暴伤沿既有来源契约；30 秒状态、1 秒间隔、最多 6 次及刷新由调用方管理，本次不自动乘 6。核心周期附伤不属于本选项。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1401/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1401/details.en.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1401:nanoka:m6-proficiency-damage:mindscape:6",
            "agent:1401:nanoka:m6-proficiency-damage:mindscape:6:guaranteed-critical",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            isolateDamageItems: true,
            damageItemRequirements: [
              {
                itemId: "alice:m6-proficiency-damage",
                stat: "anomalyProficiency",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:alice-m6-proficiency-damage",
        upstreamId: null,
        agentEntityId: "1401",
        category: "uncategorized",
        name: "爱丽丝影画六精通附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "alice:m6-proficiency-damage",
        stat: "anomalyProficiency",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
      exclusiveDamageItem: true,
    },
  },
  {
    key: "agent:1401:nanoka:m6-proficiency-damage:mindscape:6:guaranteed-critical",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:alice",
      identity: {
        kind: "agent",
        entityId: "1401",
      },
    },
    ids: {
      optionId: "nanoka:agents:alice:m6-proficiency-damage",
      effectId:
        "agent:1401:nanoka:m6-proficiency-damage:mindscape:6:guaranteed-critical",
    },
    section: "心中的百里香（精通附伤 · 必定暴击）",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1401/details.zh.json",
        pointer: "/talent/6/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1401/details.en.json",
        pointer: "/talent/6/desc",
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
        value: 6,
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
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:alice-m6-proficiency-damage"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["physical"],
        },
      ],
    },
    operation: {
      kind: "guaranteed-critical",
      itemId: "alice:m6-proficiency-damage",
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:alice:m6-proficiency-damage",
      catalogEntityId: "agents:alice",
      name: "心中的百里香 · 精通必暴附伤（独立结算）",
      conditionDescription:
        "决胜状态内队伍角色命中后，声明爱丽丝触发一次物理必暴附伤（自身当前异常精通 ×33）。独占 uncategorized 独立项、零初始倍率；来源保证本次附伤最终暴击概率为 1，不接受显式 criticalRate 来源或 declaredCriticalRate。普通暴伤沿既有来源契约；30 秒状态、1 秒间隔、最多 6 次及刷新由调用方管理，本次不自动乘 6。核心周期附伤不属于本选项。",
      target: "self",
      variants: [
        {
          target: "self",
          configuration: {
            minimumMindscape: 6,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1401/details.zh.json",
              pointer: "/talent/6/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1401/details.en.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: [
            "agent:1401:nanoka:m6-proficiency-damage:mindscape:6",
            "agent:1401:nanoka:m6-proficiency-damage:mindscape:6:guaranteed-critical",
          ],
          catalogMechanism: {
            kind: "independent-settlement",
            isolateDamageItems: true,
            damageItemRequirements: [
              {
                itemId: "alice:m6-proficiency-damage",
                stat: "anomalyProficiency",
                role: "base",
                allowedModes: ["direct"],
                source: "holder-current",
                requiredDirectMultiplier: 0,
                requiredSkillCategory: "uncategorized",
              },
            ],
          },
        },
      ],
    },
    mechanism: {
      kind: "independent-settlement",
      skillTarget: {
        targetId: "zzz-hp:skill:alice-m6-proficiency-damage",
        upstreamId: null,
        agentEntityId: "1401",
        category: "uncategorized",
        name: "爱丽丝影画六精通附伤",
        countsAsFollowUp: false,
      },
      damageItem: {
        itemId: "alice:m6-proficiency-damage",
        stat: "anomalyProficiency",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
      exclusiveDamageItem: true,
    },
  },
] as const satisfies readonly EffectAuthoringRecord[]

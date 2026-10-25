import type { EffectAuthoringRecord } from "./types.ts"
import { P2_4H_NANOKA_AGENTS_1621_INITIAL_ENERGY_REGEN_CONVERSION_SUPPLEMENT } from "./multi-rule-supplement-source-records.ts"

/**
 * P2-4h 一次性转录：同一变体由两条 stat 规则共同表达的洛克茜补充选项。
 */
export const P2_4H_MULTI_RULE_AUTHORING_RECORDS = [
  {
    key: "agent:1621:nanoka:initial-energy-regen-conversion:attack",
    supplementalRecords: [
      P2_4H_NANOKA_AGENTS_1621_INITIAL_ENERGY_REGEN_CONVERSION_SUPPLEMENT,
    ],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:initial-energy-regen-conversion",
      effectId: "agent:1621:nanoka:initial-energy-regen-conversion:attack",
    },
    section: "核心被动：热夜初拥（初始能量自动回复转化 · 攻击力）",
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
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "minimum",
        unit: "attack-points",
        operands: [
          {
            kind: "convert",
            unit: "attack-points",
            input: {
              kind: "maximum",
              unit: "energy-per-second",
              operands: [
                {
                  kind: "literal",
                  unit: "energy-per-second",
                  value: 0,
                },
                {
                  kind: "add",
                  unit: "energy-per-second",
                  operands: [
                    {
                      kind: "input",
                      unit: "energy-per-second",
                      name: "roxy:initial-energy-regen:source",
                    },
                    {
                      kind: "parameter",
                      unit: "energy-per-second",
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
            unit: "attack-points",
            name: "cap",
          },
        ],
      },
    },
    parameters: {
      threshold: {
        kind: "constant",
        unit: "energy-per-second",
        value: -1.2,
      },
      rate: {
        kind: "constant",
        unit: "multiplier",
        value: 500,
      },
      cap: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "attack-points",
        values: {
          "1": 480,
          "2": 560,
          "3": 640,
          "4": 720,
          "5": 800,
          "6": 880,
          "7": 960,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:initial-energy-regen-conversion",
      catalogEntityId: "agents:Roxy",
      name: "核心被动 · 初始能量自动回复转化",
      conditionDescription:
        "初始能量自动回复大于 1.2 时，超过部分每 0.01 攻击力提升 5 点、冲击力提升 0.4 点，按核心 1—7 分别封顶（攻击 480/560/640/720/800/880/960 点，冲击 40/46/52/58/64/70/76.8 点）；初始能量自动回复由调用方显式输入（必填、无默认值），两项同时生效或同时关闭，是同一完整状态。本选项只覆盖该句条款，不包含同段其他机制。",
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
          ],
          maximumLayers: 1,
          inputs: [
            {
              name: "roxy:initial-energy-regen:source",
              unit: "energy-per-second",
              description:
                "initial energyRegen，洛克茜的初始能量自动回复（energy-per-second，显式手工读数，必填且无默认值；是初始值，不含局内回能增益，不用当前回能或音擎面板回能代替）；超过 1.2 的部分每 0.01 攻击力 +5、冲击力 +0.4，按核心档分别封顶（攻击 480—960、冲击 40—76.8 点），低于等于 1.2 贡献 0，越界按表达式钳制，非整 0.01 按连续表达式不自行取整",
            },
          ],
          applicability: {},
          effectKeys: [
            "agent:1621:nanoka:initial-energy-regen-conversion:attack",
            "agent:1621:nanoka:initial-energy-regen-conversion:impact",
          ],
        },
      ],
    },
    mechanism: {
      kind: "multi-rule",
    },
  },
  {
    key: "agent:1621:nanoka:initial-energy-regen-conversion:impact",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:initial-energy-regen-conversion",
      effectId: "agent:1621:nanoka:initial-energy-regen-conversion:impact",
    },
    section: "核心被动：热夜初拥（初始能量自动回复转化 · 冲击力）",
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
              unit: "energy-per-second",
              operands: [
                {
                  kind: "literal",
                  unit: "energy-per-second",
                  value: 0,
                },
                {
                  kind: "add",
                  unit: "energy-per-second",
                  operands: [
                    {
                      kind: "input",
                      unit: "energy-per-second",
                      name: "roxy:initial-energy-regen:source",
                    },
                    {
                      kind: "parameter",
                      unit: "energy-per-second",
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
        unit: "energy-per-second",
        value: -1.2,
      },
      rate: {
        kind: "constant",
        unit: "multiplier",
        value: 40,
      },
      cap: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "impact-points",
        values: {
          "1": 40,
          "2": 46,
          "3": 52,
          "4": 58,
          "5": 64,
          "6": 70,
          "7": 76.8,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:initial-energy-regen-conversion",
      catalogEntityId: "agents:Roxy",
      name: "核心被动 · 初始能量自动回复转化",
      conditionDescription:
        "初始能量自动回复大于 1.2 时，超过部分每 0.01 攻击力提升 5 点、冲击力提升 0.4 点，按核心 1—7 分别封顶（攻击 480/560/640/720/800/880/960 点，冲击 40/46/52/58/64/70/76.8 点）；初始能量自动回复由调用方显式输入（必填、无默认值），两项同时生效或同时关闭，是同一完整状态。本选项只覆盖该句条款，不包含同段其他机制。",
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
          ],
          maximumLayers: 1,
          inputs: [
            {
              name: "roxy:initial-energy-regen:source",
              unit: "energy-per-second",
              description:
                "initial energyRegen，洛克茜的初始能量自动回复（energy-per-second，显式手工读数，必填且无默认值；是初始值，不含局内回能增益，不用当前回能或音擎面板回能代替）；超过 1.2 的部分每 0.01 攻击力 +5、冲击力 +0.4，按核心档分别封顶（攻击 480—960、冲击 40—76.8 点），低于等于 1.2 贡献 0，越界按表达式钳制，非整 0.01 按连续表达式不自行取整",
            },
          ],
          applicability: {},
          effectKeys: [
            "agent:1621:nanoka:initial-energy-regen-conversion:attack",
            "agent:1621:nanoka:initial-energy-regen-conversion:impact",
          ],
        },
      ],
    },
    mechanism: {
      kind: "multi-rule",
    },
  },
] as const satisfies readonly EffectAuthoringRecord[]

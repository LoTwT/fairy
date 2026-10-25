import type { EffectAuthoringRecord } from "./types.ts"
import {
  P2_4G_NANOKA_AGENTS_1621_M1_HIT_RESISTANCE_REDUCTION_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_M1_CRITICAL_DAMAGE_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_M2_STUN_DAMAGE_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_M4_ULTIMATE_DAMAGE_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_M6_WIND_RESISTANCE_IGNORE_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_ADDITIONAL_HIT_STUN_DAMAGE_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_CORE_WIND_CRITICAL_DAMAGE_SUPPLEMENT,
  P2_4G_NANOKA_AGENTS_1621_CORE_WIND_SHARP_CRITICAL_DAMAGE_SUPPLEMENT,
} from "./roxy-supplement-source-records.ts"

/**
 * P2-4g 一次性转录：revision 52 中洛克茜的 8 个单规则、单变体补充选项。
 * 这里只扩大作者层覆盖，不改正式 effects 制品。
 */
export const P2_4G_ROXY_AUTHORING_RECORDS = [
  {
    key: "agent:1621:nanoka:m1-hit-resistance-reduction",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_M1_HIT_RESISTANCE_REDUCTION_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:m1-hit-resistance-reduction",
      effectId: "agent:1621:nanoka:m1-hit-resistance-reduction",
    },
    section: "影画1 · 敬请安息命中后的敌方减抗",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/talent/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
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
      kind: "team",
    },
    scope: "hit",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "factor-contribution",
      channel: "target-resistance-reduction",
      value: {
        kind: "literal",
        unit: "ratio",
        value: 0.15,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:m1-hit-resistance-reduction",
      catalogEntityId: "agents:Roxy",
      name: "影画1 · 敬请安息命中后的敌方减抗",
      conditionDescription:
        "声明[强化特殊技：敬请安息]已命中当前敌人且全属性减抗15%的状态仍有效，持有者及合法同队角色对该敌人的后续伤害受益，不要求后续命中仍为强化特殊技。持续50秒、重复触发刷新由调用方维护；更换敌人时须重新声明。与自身暴伤选项独立，0关闭、1开启。",
      target: "team",
      variants: [
        {
          target: "team",
          configuration: {
            minimumMindscape: 1,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/talent/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/talent/1/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1621:nanoka:m1-hit-resistance-reduction"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:m1-critical-damage",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_M1_CRITICAL_DAMAGE_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:m1-critical-damage",
      effectId: "agent:1621:nanoka:m1-critical-damage",
    },
    section: "影画1 · 自身暴击伤害",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/talent/1/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
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
    scope: "entity",
    when: {
      kind: "constant",
      value: true,
    },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalDamage",
      stage: "direct",
      value: {
        kind: "literal",
        unit: "ratio",
        value: 0.4,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:m1-critical-damage",
      catalogEntityId: "agents:Roxy",
      name: "影画1 · 自身暴击伤害",
      conditionDescription:
        "洛克茜自身普通暴击伤害提升40%。独立显式选择，不依赖[敬请安息]命中或敌方减抗开关，不给其他持有者增加暴伤；0关闭、1开启。",
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
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/talent/1/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/talent/1/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1621:nanoka:m1-critical-damage"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:m2-stun-damage",
    supplementalRecords: [P2_4G_NANOKA_AGENTS_1621_M2_STUN_DAMAGE_SUPPLEMENT],
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:Roxy",
      identity: {
        kind: "agent",
        entityId: "1621",
      },
    },
    ids: {
      optionId: "nanoka:agents:1621:m2-stun-damage",
      effectId: "agent:1621:nanoka:m2-stun-damage",
    },
    section: "影画2 · 小心风寒命中后的失衡易伤",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/talent/2/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
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
      kind: "team",
    },
    scope: "hit",
    when: {
      kind: "one-of",
      fact: "hit.targetState",
      values: ["stunned"],
    },
    operation: {
      kind: "factor-contribution",
      channel: "stun-damage-adjustment",
      value: {
        kind: "literal",
        unit: "multiplier",
        value: 0.3,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:m2-stun-damage",
      catalogEntityId: "agents:Roxy",
      name: "影画2 · 小心风寒命中后的失衡易伤",
      conditionDescription:
        "声明[强化特殊技：小心风寒]已命中当前敌人且失衡易伤提升30个百分点的状态仍有效，持有者及合法同队角色受益。进入普通失衡加数通道，基础1.5变为1.8；仅目标当前失衡时作用。状态持续至目标从失衡恢复由调用方维护，更换敌人须重新声明；0关闭、1开启。不含失衡值与流势。",
      target: "team",
      variants: [
        {
          target: "team",
          configuration: {
            minimumMindscape: 2,
          },
          references: [
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "zh",
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/talent/2/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/talent/2/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1621:nanoka:m2-stun-damage"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:m4-ultimate-damage",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_M4_ULTIMATE_DAMAGE_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:m4-ultimate-damage",
      effectId: "agent:1621:nanoka:m4-ultimate-damage",
    },
    section: "影画4 · 葬夜安魂曲伤害",
    references: [
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "zh",
        resourcePath: "agents/1621/details.zh.json",
        pointer: "/talent/4/desc",
      },
      {
        sourceId: "nanoka-integrated",
        version: "3.3.12+19634983",
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
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
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.actionId",
          values: ["action:agent:1621:action:0013"],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["ultimate"],
        },
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["regular"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:roxy-requiem-for-the-night-burial"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: {
        kind: "literal",
        unit: "ratio",
        value: 0.2,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:m4-ultimate-damage",
      catalogEntityId: "agents:Roxy",
      name: "影画4 · 葬夜安魂曲伤害",
      conditionDescription:
        "仅洛克茜自身[终结技：葬夜安魂曲]（action:agent:1621:action:0013）的伤害提升20%，与已有增伤同区加算；须使用正式动作的精确技能目标。0关闭、1开启，不含能量回复或失衡值。",
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
              resourcePath: "agents/1621/details.zh.json",
              pointer: "/talent/4/desc",
            },
            {
              sourceId: "nanoka-integrated",
              version: "3.3.12+19634983",
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/talent/4/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1621:nanoka:m4-ultimate-damage"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:m6-wind-resistance-ignore",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_M6_WIND_RESISTANCE_IGNORE_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:m6-wind-resistance-ignore",
      effectId: "agent:1621:nanoka:m6-wind-resistance-ignore",
    },
    section: "影画6 · 自身风属性抗性忽视",
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
        locale: "en",
        resourcePath: "agents/1621/details.en.json",
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
          fact: "hit.element",
          values: ["wind"],
        },
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [
            "regular",
            "anomaly",
            "disorder",
            "vortex",
            "anomaly-settlement",
          ],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
      value: {
        kind: "literal",
        unit: "ratio",
        value: 0.15,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:m6-wind-resistance-ignore",
      catalogEntityId: "agents:Roxy",
      name: "影画6 · 自身风属性抗性忽视",
      conditionDescription:
        "洛克茜自身风属性伤害无视目标15%风属性伤害抗性；0关闭、1开启，覆盖regular、anomaly、disorder、vortex及anomaly-settlement。命中actor与全部基础项实际属性提供者须为本绑定同一洛克茜；异常类另要求实际AP提供者同属本人。同实体历史快照保留原读数，其他实例提供者不受益。适用时混合本人和他人基础项须拆成独立请求，否则明确拒绝。已解析风眼按上述自身风伤条件受益；本选项不自动生成风眼或余响事件，不提供巨型风旋倍率与失衡值。",
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
              locale: "en",
              resourcePath: "agents/1621/details.en.json",
              pointer: "/talent/6/desc",
            },
          ],
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["agent:1621:nanoka:m6-wind-resistance-ignore"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:additional-hit-stun-damage",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_ADDITIONAL_HIT_STUN_DAMAGE_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:additional-hit-stun-damage",
      effectId: "agent:1621:nanoka:additional-hit-stun-damage",
    },
    section: "额外能力 · 队伍攻击命中后的失衡易伤",
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
      kind: "one-of",
      fact: "hit.targetState",
      values: ["stunned"],
    },
    operation: {
      kind: "factor-contribution",
      channel: "stun-damage-adjustment",
      value: {
        kind: "literal",
        unit: "multiplier",
        value: 0.3,
      },
    },
    parameters: {},
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: {
      optionId: "nanoka:agents:1621:additional-hit-stun-damage",
      catalogEntityId: "agents:Roxy",
      name: "额外能力 · 队伍攻击命中后的失衡易伤",
      conditionDescription:
        "同队另一名强攻、命破或锋御角色任一满足资格；声明队伍角色攻击已命中当前敌人且失衡易伤状态仍有效。持有者及合法同队角色均受益，不按受益者职业筛选；当前敌人失衡时普通失衡加数+0.30，与影画2的+0.30同区相加（基础1.5→1.8，两项有效时2.1）。独立0/1开关，不依赖自身等级增伤或角色等级输入，多名合格队友不倍增。命中、持续和失衡结束由调用方维护，更换目标必须重新声明；不含失衡时间延长、资源或风化/浸染直接伤害。",
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
          effectKeys: ["agent:1621:nanoka:additional-hit-stun-damage"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:core-wind-critical-damage",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_CORE_WIND_CRITICAL_DAMAGE_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:core-wind-critical-damage",
      effectId: "agent:1621:nanoka:core-wind-critical-damage",
    },
    section: "核心 · 单状态风伤普通暴伤",
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
      kind: "one-of",
      fact: "hit.element",
      values: ["wind"],
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
      optionId: "nanoka:agents:1621:core-wind-critical-damage",
      catalogEntityId: "agents:Roxy",
      name: "核心 · 单状态风伤普通暴伤",
      conditionDescription:
        "调用方声明洛克茜提供的一个真实有效属性增益状态；仅计算本次风属性命中。同队含本人，非锋御获得普通暴伤，锋御获得锐暴伤，按目录真实职业分流，不要求额外能力的另一名队友资格。0关闭、1开启，不代表属性层数；两个职业分支可同选并共用本绑定的局外暴击率ratio读数（0.5代表50%），无默认值，不读持有者战斗current CR或受益者CR。持续50秒、刷新和触发由调用方维护。当前实际消费的同一受益者/输出最多一个本分支有效来源，多来源包括同值或零值按既有UNIQUENESS_CONFLICT拒绝；非风、非适用职业分支、异队和关闭态隔离。这是单来源单状态条件模型，不是游戏全队唯一结论，不计算染色属性、多属性风伤叠加或事件时间线。",
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
          effectKeys: ["agent:1621:nanoka:core-wind-critical-damage"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
  {
    key: "agent:1621:nanoka:core-wind-sharp-critical-damage",
    supplementalRecords: [
      P2_4G_NANOKA_AGENTS_1621_CORE_WIND_SHARP_CRITICAL_DAMAGE_SUPPLEMENT,
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
      optionId: "nanoka:agents:1621:core-wind-sharp-critical-damage",
      effectId: "agent:1621:nanoka:core-wind-sharp-critical-damage",
    },
    section: "核心 · 单状态风伤锐暴伤",
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
      kind: "one-of",
      fact: "hit.element",
      values: ["wind"],
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
      optionId: "nanoka:agents:1621:core-wind-sharp-critical-damage",
      catalogEntityId: "agents:Roxy",
      name: "核心 · 单状态风伤锐暴伤",
      conditionDescription:
        "调用方声明洛克茜提供的一个真实有效属性增益状态；仅计算本次风属性命中。同队含本人，非锋御获得普通暴伤，锋御获得锐暴伤，按目录真实职业分流，不要求额外能力的另一名队友资格。0关闭、1开启，不代表属性层数；两个职业分支可同选并共用本绑定的局外暴击率ratio读数（0.5代表50%），无默认值，不读持有者战斗current CR或受益者CR。持续50秒、刷新和触发由调用方维护。当前实际消费的同一受益者/输出最多一个本分支有效来源，多来源包括同值或零值按既有UNIQUENESS_CONFLICT拒绝；非风、非适用职业分支、异队和关闭态隔离。这是单来源单状态条件模型，不是游戏全队唯一结论，不计算染色属性、多属性风伤叠加或事件时间线。",
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
          effectKeys: ["agent:1621:nanoka:core-wind-sharp-critical-damage"],
        },
      ],
    },
    mechanism: {
      kind: "single-rule",
    },
  },
] as const satisfies readonly EffectAuthoringRecord[]

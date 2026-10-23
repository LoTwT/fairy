import type { NonEmpty, SourceReference } from "@randomplay/shared"
import { BUFF_RESOURCE, SOURCE_COMMIT } from "../source.ts"
import { fixedSourceIds } from "./ids.ts"
import type { EffectAuthoringRecord } from "./types.ts"

/** 正式迁移记录的一次性转录；生成路径不读取选中基线条目。 */
const NANOKA_VERSION = "3.3.12+19634983"

function zzzHp(pointer: `/${string}`): SourceReference {
  return {
    sourceId: "zzz-hp",
    version: SOURCE_COMMIT,
    locale: "zh",
    resourcePath: BUFF_RESOURCE,
    pointer,
  }
}

function nanokaZh(
  resourcePath: string,
  pointer: `/${string}`,
): SourceReference {
  return {
    sourceId: "nanoka-integrated",
    version: NANOKA_VERSION,
    locale: "zh",
    resourcePath,
    pointer,
  }
}

function references(
  values: readonly SourceReference[],
): NonEmpty<SourceReference> {
  const [first, ...rest] = values
  if (!first) throw new Error("Authoring references must not be empty")
  return [first, ...rest]
}

const CLARET_CORE_CRITICAL_RATE_REFERENCES = references([
  zzzHp("/agents/6/mindscapeBuffs/0/effectBlocks/0/effects/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611501/desc/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611502/desc/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611503/desc/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611504/desc/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611505/desc/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611506/desc/0"),
  nanokaZh("agents/1611/details.zh.json", "/passive/level/1611507/desc/0"),
])

const GRACE_POTENTIAL_DAMAGE_BONUS_REFERENCES = references([
  zzzHp("/agents/29/mindscapeBuffs/0/effectBlocks/2/effects/0"),
  nanokaZh("agents/1181/details.zh.json", "/potentialDetail/118101/desc"),
  nanokaZh("agents/1181/details.zh.json", "/potentialDetail/118102/desc"),
  nanokaZh("agents/1181/details.zh.json", "/potentialDetail/118103/desc"),
  nanokaZh("agents/1181/details.zh.json", "/potentialDetail/118104/desc"),
  nanokaZh("agents/1181/details.zh.json", "/potentialDetail/118105/desc"),
])

const HARUMASA_POTENTIAL_ATTACK_PERCENT_REFERENCES = references([
  zzzHp("/agents/35/mindscapeBuffs/0/effectBlocks/2/effects/0"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120101/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120102/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120103/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120104/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120105/desc"),
])

const HARUMASA_POTENTIAL_RESISTANCE_IGNORE_REFERENCES = references([
  zzzHp("/agents/35/mindscapeBuffs/0/effectBlocks/2/effects/1"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120101/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120102/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120103/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120104/desc"),
  nanokaZh("agents/1201/details.zh.json", "/potentialDetail/120105/desc"),
])

const NEKOMATA_POTENTIAL_CRITICAL_DAMAGE_REFERENCES = references([
  zzzHp("/agents/40/mindscapeBuffs/0/effectBlocks/2/effects/0"),
  nanokaZh("agents/1021/details.zh.json", "/passive/level/1021514/desc/0"),
])

const CAESAR_CORE_TEAM_ATTACK_REFERENCES = references([
  zzzHp("/agents/7/mindscapeBuffs/0/effectBlocks/0/effects/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071501/desc/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071502/desc/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071503/desc/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071504/desc/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071505/desc/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071506/desc/0"),
  nanokaZh("agents/1071/details.zh.json", "/passive/level/1071507/desc/0"),
])

const LUCY_SPECIAL_TEAM_ATTACK_REFERENCES = references([
  zzzHp("/agents/60/mindscapeBuffs/0/effectBlocks/0/effects/0"),
  nanokaZh("agents/1151/details.zh.json", "/skill/special/description/2/desc"),
])

const S0ANBY_ADDITIONAL_TEAM_DAMAGE_BONUS_REFERENCES = references([
  zzzHp("/agents/59/mindscapeBuffs/0/effectBlocks/1/effects/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381508/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381509/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381510/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381511/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381512/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381513/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/passive/level/1381514/desc/1"),
  nanokaZh("agents/1381/details.zh.json", "/potentialDetail/138101/desc"),
  nanokaZh("agents/1381/details.zh.json", "/potentialDetail/138102/desc"),
  nanokaZh("agents/1381/details.zh.json", "/potentialDetail/138103/desc"),
  nanokaZh("agents/1381/details.zh.json", "/potentialDetail/138104/desc"),
  nanokaZh("agents/1381/details.zh.json", "/potentialDetail/138105/desc"),
])

export const CORRECTED_AUTHORING_RECORDS: readonly EffectAuthoringRecord[] = [
  // claret-core-critical-rate
  {
    key: "claret-core-critical-rate",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:claret",
      identity: {
        kind: "agent",
        entityId: "1611",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "claret",
      fairyEntityId: "1611",
      blockId: "blk-mtrf598z-wr4jqt",
      sourceEffectId: "eff-mtrf598z-80y7hh",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "核心被动：苍白血宴",
    references: CLARET_CORE_CRITICAL_RATE_REFERENCES,
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
    scope: "entity",
    when: {
      kind: "all",
      conditions: [],
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
        rank: "coreSkillLevel",
        unit: "ratio",
        values: {
          "1": 0.15,
          "2": 0.175,
          "3": 0.2,
          "4": 0.225,
          "5": 0.25,
          "6": 0.275,
          "7": 0.3,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["core-skill-level-parameters"],
      positions: [
        {
          pointer: "/agents/6/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: {
      optionId:
        "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtrf598z-80y7hh",
      catalogEntityId: "agents:claret",
      name: "核心被动：苍白血宴 · critRate",
      conditionDescription:
        "克拉蕾每拥有1%的初始暴击伤害，初始暴击率提升0.35%；\n\n克拉蕾处于[猩红铭刻]，或是在发动[连携技]、[终结技]、[反制支援]、[支援突击]期间，暴击率提升30%，残痕积蓄效率提升50%，在[普通攻击：血华誓·锻星]和[普通攻击：血华誓·伏钺]招式攻击期间触发极限闪避时，使招式剩余时间内造成的伤害提升15%。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: CLARET_CORE_CRITICAL_RATE_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["claret-core-critical-rate"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // grace-potential-damage-bonus
  {
    key: "grace-potential-damage-bonus",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:grace",
      identity: {
        kind: "agent",
        entityId: "1181",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "grace",
      fairyEntityId: "1181",
      blockId: "blk-ms4o8tep-z28y9w",
      sourceEffectId: "eff-ms4o8tep-htm584",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "潜能觉醒：超频工程引擎",
    references: GRACE_POTENTIAL_DAMAGE_BONUS_REFERENCES,
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
            value: 2,
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
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.1,
          "3": 0.15,
          "4": 0.2,
          "5": 0.25,
          "6": 0.3,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/29/mindscapeBuffs/0/effectBlocks/2/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "dmgBonus",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId:
        "agents:grace:mindscape:0:blk-ms4o8tep-z28y9w:eff-ms4o8tep-htm584",
      catalogEntityId: "agents:grace",
      name: "潜能觉醒：超频工程引擎 · dmgBonus",
      conditionDescription:
        "消耗[电能]时获得[电能强化]状态，造成的电属性伤害提升，持续25秒，重复触发时刷新持续时间。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: GRACE_POTENTIAL_DAMAGE_BONUS_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["grace-potential-damage-bonus"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // harumasa-potential-attack-percent
  {
    key: "harumasa-potential-attack-percent",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:harumasa",
      identity: {
        kind: "agent",
        entityId: "1201",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "harumasa",
      fairyEntityId: "1201",
      blockId: "blk-ms4gyswd-hl5ii6",
      sourceEffectId: "eff-ms4gyswd-zyloo3",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "潜能觉醒：贯注",
    references: HARUMASA_POTENTIAL_ATTACK_PERCENT_REFERENCES,
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
            value: 2,
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
    scope: "entity",
    when: {
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
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
          "2": 0.04,
          "3": 0.06,
          "4": 0.08,
          "5": 0.1,
          "6": 0.12,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/2/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "inCombatAtkPercent",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId:
        "agents:harumasa:mindscape:0:blk-ms4gyswd-hl5ii6:eff-ms4gyswd-zyloo3",
      catalogEntityId: "agents:harumasa",
      name: "潜能觉醒：贯注 · inCombatAtkPercent",
      conditionDescription:
        "发动[强化特殊技]、[连携技]或[终结技]时，攻击力提升，[冲刺攻击：飞弦·斩]和[逐雷]无视目标的电属性伤害抗性，持续12秒，重复触发时刷新持续时间；\n[核心被动]中[锋芒]的持续时间延长至10秒。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: HARUMASA_POTENTIAL_ATTACK_PERCENT_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["harumasa-potential-attack-percent"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // harumasa-potential-resistance-ignore
  {
    key: "harumasa-potential-resistance-ignore",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:harumasa",
      identity: {
        kind: "agent",
        entityId: "1201",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "harumasa",
      fairyEntityId: "1201",
      blockId: "blk-ms4gyswd-hl5ii6",
      sourceEffectId: "eff-ms4h0385-xlwhvy",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "潜能觉醒：贯注",
    references: HARUMASA_POTENTIAL_RESISTANCE_IGNORE_REFERENCES,
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
            value: 2,
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
          ],
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
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/35/mindscapeBuffs/0/effectBlocks/2/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "resPen",
          normalizationChanges: [],
          rawValue: 0,
          normalizedValue: 0,
        },
      ],
    },
    option: {
      optionId:
        "agents:harumasa:mindscape:0:blk-ms4gyswd-hl5ii6:eff-ms4h0385-xlwhvy",
      catalogEntityId: "agents:harumasa",
      name: "潜能觉醒：贯注 · resPen",
      conditionDescription:
        "发动[强化特殊技]、[连携技]或[终结技]时，攻击力提升，[冲刺攻击：飞弦·斩]和[逐雷]无视目标的电属性伤害抗性，持续12秒，重复触发时刷新持续时间；\n[核心被动]中[锋芒]的持续时间延长至10秒。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: HARUMASA_POTENTIAL_RESISTANCE_IGNORE_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["harumasa-potential-resistance-ignore"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // nekomata-potential-critical-damage
  {
    key: "nekomata-potential-critical-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:nekomata",
      identity: {
        kind: "agent",
        entityId: "1021",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "nekomata",
      fairyEntityId: "1021",
      blockId: "blk-ms4f5yzr-3tuoc1",
      sourceEffectId: "eff-ms4f5yzr-pivfr6",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "潜能觉醒：夜行习性",
    references: NEKOMATA_POTENTIAL_CRITICAL_DAMAGE_REFERENCES,
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
            value: 2,
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
    scope: "entity",
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
          "2": 0.2,
          "3": 0.3,
          "4": 0.4,
          "5": 0.5,
          "6": 0.6,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/2/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "critDmg",
          normalizationChanges: [],
          rawValue: 20,
          normalizedValue: 20,
        },
      ],
    },
    option: {
      optionId:
        "agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f5yzr-pivfr6",
      catalogEntityId: "agents:nekomata",
      name: "潜能觉醒：夜行习性 · critDmg",
      conditionDescription:
        "猫又处于[肉球突袭]状态时，暴击伤害提升。\n（v2+20%爆伤，后续每个影画+10%爆伤）",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: NEKOMATA_POTENTIAL_CRITICAL_DAMAGE_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["nekomata-potential-critical-damage"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // caesar-core-team-attack
  {
    key: "caesar-core-team-attack",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:caesar",
      identity: {
        kind: "agent",
        entityId: "1071",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "caesar",
      fairyEntityId: "1071",
      blockId: "blk-legacy",
      sourceEffectId: "legacy-team-atk",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "核心被动：坚韧之壁",
    references: CAESAR_CORE_TEAM_ATTACK_REFERENCES,
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
    scope: "entity",
    when: {
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "parameter",
        unit: "attack-points",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "attack-points",
        values: {
          "1": 40,
          "2": 135,
          "3": 240,
          "4": 400,
          "5": 650,
          "6": 900,
          "7": 1000,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["core-skill-level-parameters"],
      positions: [
        {
          pointer: "/agents/7/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "atk",
          normalizationChanges: [],
          rawValue: 1000,
          normalizedValue: 1000,
        },
      ],
    },
    option: {
      optionId: "agents:caesar:mindscape:0:blk-legacy:legacy-team-atk",
      catalogEntityId: "agents:caesar",
      name: "核心被动：坚韧之壁 · atk",
      conditionDescription:
        "[荣光之盾]存在期间，持有者的攻击力提升1000点，[荣光之盾]效果结束后，该增益效果仍然保留，持续5秒。",
      target: "team",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: CAESAR_CORE_TEAM_ATTACK_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["caesar-core-team-attack"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // lucy-special-team-attack
  {
    key: "lucy-special-team-attack",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:lucy",
      identity: {
        kind: "agent",
        entityId: "1151",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "lucy",
      fairyEntityId: "1151",
      blockId: "blk-legacy",
      sourceEffectId: "legacy-team-atk",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "强化特殊技·加油！",
    references: LUCY_SPECIAL_TEAM_ATTACK_REFERENCES,
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
    scope: "entity",
    when: {
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "parameter",
        unit: "attack-points",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "specialSkillLevel",
        unit: "attack-points",
        values: {
          "1": 44,
          "2": 48,
          "3": 52,
          "4": 56,
          "5": 60,
          "6": 64,
          "7": 68,
          "8": 72,
          "9": 76,
          "10": 80,
          "11": 84,
          "12": 88,
          "13": 92,
          "14": 96,
          "15": 100,
          "16": 104,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["special-skill-level-expression"],
      positions: [
        {
          pointer: "/agents/60/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "atk",
          normalizationChanges: [],
          rawValue: 88,
          normalizedValue: 88,
        },
      ],
    },
    option: {
      optionId: "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk",
      catalogEntityId: "agents:lucy",
      name: "强化特殊技·加油！ · atk",
      conditionDescription:
        "发动[强化特殊技]后，亲卫队小猪引发爆炸时，将为全队角色、邦布和亲卫队小猪施加[加油！]状态。\n[加油！]状态下，友方单位的攻击力提升，提升数值等同于露西22.6%初始攻击力+88.0点，最高不超过600点。",
      target: "team",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            specialSkillLevels: [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
            ],
          },
          references: LUCY_SPECIAL_TEAM_ATTACK_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["lucy-special-team-attack"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // s0anby-additional-team-damage-bonus
  {
    key: "s0anby-additional-team-damage-bonus",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:s0anby",
      identity: {
        kind: "agent",
        entityId: "1381",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "s0anby",
      fairyEntityId: "1381",
      blockId: "blk-ms4jqdq1-rkmmm3",
      sourceEffectId: "eff-ms4jqsm1-qkfx1a",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "额外能力：电极化",
    references: S0ANBY_ADDITIONAL_TEAM_DAMAGE_BONUS_REFERENCES,
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
      kind: "team",
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
                  values: ["zzz-hp:follow-up"],
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
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "0": 0.25,
          "1": 0.25,
          "2": 0.34,
          "3": 0.38,
          "4": 0.42,
          "5": 0.46,
          "6": 0.5,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/59/mindscapeBuffs/0/effectBlocks/1/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "skillDmgBonus",
          normalizationChanges: [],
          rawValue: 25,
          normalizedValue: 25,
        },
      ],
    },
    option: {
      optionId:
        "agents:s0anby:mindscape:0:blk-ms4jqdq1-rkmmm3:eff-ms4jqsm1-qkfx1a",
      catalogEntityId: "agents:s0anby",
      name: "额外能力：电极化 · skillDmgBonus",
      conditionDescription:
        "队伍中存在[击破]或[支援]角色时触发：\n零号·安比的暴击率提升10%；当前操作中的角色为零号·安比时，全队角色[追加攻击]对拥有[银星]标记的敌人造成的伤害提升25%；\n零号·安比的[连携技]和[终结技]视为[追加攻击]伤害。",
      target: "team",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
            potentialLevels: [0, 1, 2, 3, 4, 5, 6],
          },
          references: S0ANBY_ADDITIONAL_TEAM_DAMAGE_BONUS_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["s0anby-additional-team-damage-bonus"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },
]

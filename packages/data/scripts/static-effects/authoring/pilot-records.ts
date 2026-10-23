import type { NonEmpty, SourceReference } from "@randomplay/shared"
import { fixedSourceIds, stableIds } from "./ids.ts"
import {
  ANBY_M2_OPTION,
  LIGHTER_OLD_OPTION,
  MIYABI_BASIC_OPTION,
  MIYABI_FROSTBURN_OPTION,
  MIYABI_TERMINAL_OPTION,
  NEKOMATA_CLAW_OPTION,
  QINGMING_CRIT_RATE_OPTION,
  REMIEL_COMPLETE_OPTION,
  REMIEL_OLD_HOLDER_OPTION,
  REMIEL_OLD_TEAM_OPTION,
} from "./pilot-options.ts"
import type {
  EffectAuthoringRecord,
  EffectAuthoringUnsupportedRecord,
} from "./types.ts"

const ZZZ_HP_VERSION = "2628b32cece086e371bafa05518a9a12650d9f74"
const NANOKA_VERSION = "3.3.12+19634983"
const ZZZ_HP_PATH = "zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json"

function zzzHp(pointer: `/${string}`): SourceReference {
  return {
    sourceId: "zzz-hp",
    version: ZZZ_HP_VERSION,
    locale: "zh",
    resourcePath: ZZZ_HP_PATH,
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

function nanokaEn(
  resourcePath: string,
  pointer: `/${string}`,
): SourceReference {
  return {
    sourceId: "nanoka-integrated",
    version: NANOKA_VERSION,
    locale: "en",
    resourcePath,
    pointer,
  }
}

const MIYABI_PASSIVE_NODES = [
  1091501, 1091502, 1091503, 1091504, 1091505, 1091506, 1091507,
] as const

const NEKOMATA_PASSIVE_NODES = [
  1021508, 1021509, 1021510, 1021511, 1021512, 1021513, 1021514,
] as const

function passiveReferences(
  agentId: string,
  nodeIds: readonly number[],
  desc: number,
): readonly SourceReference[] {
  return nodeIds.map((nodeId) =>
    nanokaZh(
      `agents/${agentId}/details.zh.json`,
      `/passive/level/${nodeId}/desc/${desc}`,
    ),
  )
}

function nonEmptyReferences(
  references: readonly SourceReference[],
): NonEmpty<SourceReference> {
  const [first, ...rest] = references
  if (!first) throw new Error("Authoring references must not be empty")
  return [first, ...rest]
}

const SUPPLIED_ONCE = {
  kind: "supplied",
  maximumLayers: { kind: "literal", unit: "count", value: 1 },
} as const

function compareMindscape(value: number): {
  readonly kind: "compare-number"
  readonly unit: "count"
  readonly operator: "gte"
  readonly left: {
    readonly kind: "configuration-number"
    readonly unit: "count"
    readonly field: "mindscapeRank"
  }
  readonly right: {
    readonly kind: "literal"
    readonly unit: "count"
    readonly value: number
  }
} {
  return {
    kind: "compare-number",
    unit: "count",
    operator: "gte",
    left: {
      kind: "configuration-number",
      unit: "count",
      field: "mindscapeRank",
    },
    right: { kind: "literal", unit: "count", value },
  }
}

const ANBY_POINTER = "/agents/16/mindscapeBuffs/2/effectBlocks/0/effects/0"
const QINGMING_REFERENCES: NonEmpty<SourceReference> = [
  zzzHp("/wengines/100/refinementBuffs/0/effectBlocks/0/effects/0"),
  zzzHp("/wengines/100/refinementBuffs/1/effectBlocks/0/effects/0"),
  zzzHp("/wengines/100/refinementBuffs/2/effectBlocks/0/effects/0"),
  zzzHp("/wengines/100/refinementBuffs/3/effectBlocks/0/effects/0"),
  zzzHp("/wengines/100/refinementBuffs/4/effectBlocks/0/effects/0"),
]

const MIYABI_TERMINAL_REFERENCES: NonEmpty<SourceReference> = [
  zzzHp("/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0"),
  nanokaZh("agents/1091/details.zh.json", "/specialElementType/desc"),
  nanokaEn("agents/1091/details.en.json", "/specialElementType/desc"),
]

const MIYABI_BASIC_REFERENCES = nonEmptyReferences([
  zzzHp("/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1"),
  ...passiveReferences("1091", MIYABI_PASSIVE_NODES, 1),
  nanokaZh("agents/1091/details.zh.json", "/specialElementType/desc"),
  nanokaEn("agents/1091/details.en.json", "/specialElementType/desc"),
])

const MIYABI_FROSTBURN_REFERENCES = nonEmptyReferences([
  ...passiveReferences("1091", MIYABI_PASSIVE_NODES, 0),
  nanokaZh("agents/1091/details.zh.json", "/talent/4/desc"),
  nanokaEn("agents/1091/details.en.json", "/talent/4/desc"),
])

const NEKOMATA_REFERENCES = nonEmptyReferences([
  zzzHp("/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/1"),
  ...passiveReferences("1021", NEKOMATA_PASSIVE_NODES, 0),
  ...passiveReferences("1021", NEKOMATA_PASSIVE_NODES, 0),
])

const REMIEL_TEAM_POINTER =
  "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/1"
const REMIEL_HOLDER_POINTER =
  "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/2"

const REMIEL_M1_DIFFERENCE = "remielle-mindscape1-complete-anomaly-state"
const MIYABI_ELEMENT_DIFFERENCE = "miyabi-frost-settlement-element-scope"
const LIGHTER_ELATION_DIFFERENCE = "complete-state-elation-correction"

const REMIEL_TEAM_EXPLANATION = `该记录已并入完整状态选项 ${REMIEL_COMPLETE_OPTION.optionId}（行为修正 ${REMIEL_M1_DIFFERENCE}）：[相变时流]状态由 team +10% 与自身 −10% 两条记录同时生效才表示“队伍中其他角色”；块 note 与 Nanoka 天赋 1 同文确认该状态只提升队伍中其他角色；独立单选、两项齐选或与完整选项混选都不再接受，请改选完整状态选项。来源 ${REMIEL_TEAM_POINTER}。`
const REMIEL_HOLDER_EXPLANATION = `该记录已并入完整状态选项 ${REMIEL_COMPLETE_OPTION.optionId}（行为修正 ${REMIEL_M1_DIFFERENCE}）：[相变时流]状态由 team +10% 与自身 −10% 两条记录同时生效才表示“队伍中其他角色”；块 note 与 Nanoka 天赋 1 同文确认该状态只提升队伍中其他角色；独立单选、两项齐选或与完整选项混选都不再接受，请改选完整状态选项。来源 ${REMIEL_HOLDER_POINTER}。`
const LIGHTER_ELATION_EXPLANATION = `该来源记录是[昂扬]完整状态的一部分，已被完整状态选项取代：块 note 与 Nanoka 同文说明[昂扬]总增益按同一层数与同一获得时冲击力整体计算（影画 2 的 120% 是同一状态的比例强化）。请改选昂扬 · 完整状态；本记录不再单独生成按层增益。来源 /agents/51/mindscapeBuffs/0/effectBlocks/1/effects/0。`

const NEKOMATA_MECHANISM = {
  kind: "independent-settlement",
  skillTarget: {
    targetId: "zzz-hp:skill:nekomata-claw-mark",
    upstreamId: null,
    agentEntityId: "1021",
    category: "uncategorized",
    name: "超凶爪印",
    countsAsFollowUp: false,
  },
  damageItem: {
    itemId: "nekomata:claw-mark",
    stat: "attack",
    role: "base",
    allowedModes: ["direct"],
    source: "holder-current",
    requiredDirectMultiplier: 0,
    requiredSkillCategory: "uncategorized",
  },
} as const

const MIYABI_FROSTBURN_MECHANISM = {
  kind: "independent-settlement",
  skillTarget: {
    targetId: "zzz-hp:skill:miyabi-frostburn-break-damage",
    upstreamId: null,
    agentEntityId: "1091",
    category: "uncategorized",
    name: "霜灼·破",
    countsAsFollowUp: false,
  },
  damageItem: {
    itemId: "miyabi:frostburn-break-damage",
    stat: "attack",
    role: "base",
    allowedModes: ["direct"],
    source: "holder-current",
    requiredDirectMultiplier: 0,
    requiredSkillCategory: "uncategorized",
    requiredCriticalRateDeclaration: true,
  },
  exclusiveDamageItem: true,
} as const

const REMIEL_OLD_TEAM_RECORD: EffectAuthoringUnsupportedRecord = {
  key: "remiel-m1-team-record-migrated",
  entity: {
    sourceId: "zzz-hp",
    catalogEntityId: "agents:remiel",
    identity: { kind: "agent", entityId: "1581" },
  },
  ids: stableIds(
    REMIEL_OLD_TEAM_OPTION.optionId,
    "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
  ),
  coverage: {
    status: "unsupported",
    differenceIds: [],
    reason: "semantic-conflict",
    explanation: REMIEL_TEAM_EXPLANATION,
    positions: [
      {
        pointer: REMIEL_TEAM_POINTER,
        rank: 1,
        rankKind: "mindscape",
        stat: "anomalyDmgBonus",
        normalizationChanges: [],
        rawValue: 10,
        normalizedValue: 10,
      },
    ],
  },
  option: REMIEL_OLD_TEAM_OPTION,
  mechanism: { kind: "unsupported" },
}

const REMIEL_OLD_HOLDER_RECORD: EffectAuthoringUnsupportedRecord = {
  key: "remiel-m1-holder-record-migrated",
  entity: {
    sourceId: "zzz-hp",
    catalogEntityId: "agents:remiel",
    identity: { kind: "agent", entityId: "1581" },
  },
  ids: stableIds(
    REMIEL_OLD_HOLDER_OPTION.optionId,
    "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
  ),
  coverage: {
    status: "unsupported",
    differenceIds: [],
    reason: "semantic-conflict",
    explanation: REMIEL_HOLDER_EXPLANATION,
    positions: [
      {
        pointer: REMIEL_HOLDER_POINTER,
        rank: 1,
        rankKind: "mindscape",
        stat: "anomalyDmgBonus",
        normalizationChanges: [],
        rawValue: -10,
        normalizedValue: -10,
      },
    ],
  },
  option: REMIEL_OLD_HOLDER_OPTION,
  mechanism: { kind: "unsupported" },
}

const LIGHTER_OLD_RECORD: EffectAuthoringUnsupportedRecord = {
  key: "lighter-elation-record-migrated",
  entity: {
    sourceId: "zzz-hp",
    catalogEntityId: "agents:lighter",
    identity: { kind: "agent", entityId: "1161" },
  },
  ids: stableIds(
    LIGHTER_OLD_OPTION.optionId,
    "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0",
  ),
  coverage: {
    status: "unsupported",
    differenceIds: [LIGHTER_ELATION_DIFFERENCE],
    reason: "semantic-conflict",
    explanation: LIGHTER_ELATION_EXPLANATION,
    positions: [
      {
        pointer: "/agents/51/mindscapeBuffs/0/effectBlocks/1/effects/0",
        rank: 0,
        rankKind: "mindscape",
        stat: "dmgBonus",
        normalizationChanges: [],
        rawValue: 0,
        normalizedValue: 0,
      },
    ],
  },
  option: LIGHTER_OLD_OPTION,
  mechanism: { kind: "unsupported" },
}

/**
 * P2-1 试点作者记录：12 条真实记录，覆盖简单常量、精炼五档、
 * 影画门槛、完整状态、独立结算、corrected 与 unsupported。
 *
 * 记录中的规则语义、状态归属和 coverage 位置是作者输入；
 * `pilot-options.ts` 只保存一次性转录的目录展示与证据元数据。
 * 编译器不读取正式制品的选中条目来填充这些字段。
 */
export const PILOT_AUTHORING_RECORDS: readonly EffectAuthoringRecord[] = [
  {
    key: "anby-m2-damage-bonus",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:anby",
      identity: { kind: "agent", entityId: "1011" },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "anby",
      fairyEntityId: "1011",
      blockId: "blk-ms47xm3l-3pumvj",
      sourceEffectId: "eff-ms47xm3l-nf7ga7",
      rankKind: "mindscape",
      rank: 2,
    }),
    section: "影画2 ",
    references: [zzzHp(ANBY_POINTER)],
    config: compareMindscape(2),
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
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
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:anby-basic-ms47yaat"],
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [
        {
          pointer: ANBY_POINTER,
          rank: 2,
          rankKind: "mindscape",
          stat: "skillDmgBonus",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: ANBY_M2_OPTION,
    mechanism: { kind: "single-rule" },
  },
  {
    key: "qingming-crit-rate",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "w-engines:Qingming_Birdcage",
      identity: { kind: "w-engine", entityId: "14137" },
    },
    ids: fixedSourceIds({
      category: "w-engines",
      entitySlug: "Qingming_Birdcage",
      fairyEntityId: "14137",
      blockId: "blk-legacy",
      sourceEffectId: "legacy-self-critRate",
      rankKind: "refinement",
    }),
    section: "精1",
    references: QINGMING_REFERENCES,
    config: { kind: "constant", value: true },
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: { 1: 0.2, 2: 0.23, 3: 0.26, 4: 0.29, 5: 0.32 },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [
        {
          pointer: "/wengines/100/refinementBuffs/0/effectBlocks/0/effects/0",
          rank: 1,
          rankKind: "refinement",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 20,
          normalizedValue: 20,
        },
        {
          pointer: "/wengines/100/refinementBuffs/1/effectBlocks/0/effects/0",
          rank: 2,
          rankKind: "refinement",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 23,
          normalizedValue: 23,
        },
        {
          pointer: "/wengines/100/refinementBuffs/2/effectBlocks/0/effects/0",
          rank: 3,
          rankKind: "refinement",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 26,
          normalizedValue: 26,
        },
        {
          pointer: "/wengines/100/refinementBuffs/3/effectBlocks/0/effects/0",
          rank: 4,
          rankKind: "refinement",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 29,
          normalizedValue: 29,
        },
        {
          pointer: "/wengines/100/refinementBuffs/4/effectBlocks/0/effects/0",
          rank: 5,
          rankKind: "refinement",
          stat: "critRate",
          normalizationChanges: [],
          rawValue: 32,
          normalizedValue: 32,
        },
      ],
    },
    option: QINGMING_CRIT_RATE_OPTION,
    mechanism: { kind: "single-rule" },
  },
  {
    key: "miyabi-terminal-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:miyabi",
      identity: { kind: "agent", entityId: "1091" },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "miyabi",
      fairyEntityId: "1091",
      blockId: "blk-legacy",
      sourceEffectId: "legacy-self-dmgBonus",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "终结技：名残雪",
    references: MIYABI_TERMINAL_REFERENCES,
    config: compareMindscape(0),
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["ice", "frost"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    },
    coverage: {
      status: "corrected",
      differenceIds: [MIYABI_ELEMENT_DIFFERENCE],
      positions: [
        {
          pointer: "/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0",
          rank: 0,
          rankKind: "mindscape",
          stat: "dmgBonus",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: MIYABI_TERMINAL_OPTION,
    mechanism: { kind: "single-rule" },
  },
  {
    key: "miyabi-basic-resistance-ignore",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:miyabi",
      identity: { kind: "agent", entityId: "1091" },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "miyabi",
      fairyEntityId: "1091",
      blockId: "blk-ms4msho4-fuuot6",
      sourceEffectId: "eff-ms4mu14z-vj4c3r",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "额外能力：同沐霜雪",
    references: MIYABI_BASIC_REFERENCES,
    config: compareMindscape(0),
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
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
                  values: ["zzz-hp:category:basic"],
                },
                {
                  kind: "one-of",
                  fact: "hit.skillTag",
                  values: ["zzz-hp:skill:miyabi-basic-ms4mtpk5"],
                },
              ],
            },
          ],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["ice", "frost"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    },
    coverage: {
      status: "corrected",
      differenceIds: [MIYABI_ELEMENT_DIFFERENCE],
      positions: [
        {
          pointer: "/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "resPen",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: MIYABI_BASIC_OPTION,
    mechanism: { kind: "single-rule" },
  },
  {
    key: "remiel-m1-team-anomaly-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:remiel",
      identity: { kind: "agent", entityId: "1581" },
    },
    ids: stableIds(
      REMIEL_COMPLETE_OPTION.optionId,
      "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
    ),
    section: "影画1",
    references: [zzzHp(REMIEL_TEAM_POINTER)],
    config: compareMindscape(1),
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "team" },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["anomaly", "anomaly-settlement", "vortex", "luminize"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "anomaly-damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.1 },
    },
    coverage: {
      status: "corrected",
      differenceIds: [REMIEL_M1_DIFFERENCE],
      positions: [],
    },
    option: REMIEL_COMPLETE_OPTION,
    mechanism: { kind: "complete-state" },
  },
  {
    key: "remiel-m1-holder-anomaly-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:remiel",
      identity: { kind: "agent", entityId: "1581" },
    },
    ids: stableIds(
      REMIEL_COMPLETE_OPTION.optionId,
      "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
    ),
    section: "影画1",
    references: [zzzHp(REMIEL_HOLDER_POINTER)],
    config: compareMindscape(1),
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: ["anomaly", "anomaly-settlement", "vortex", "luminize"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "anomaly-damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: -0.1 },
    },
    coverage: {
      status: "corrected",
      differenceIds: [REMIEL_M1_DIFFERENCE],
      positions: [],
    },
    option: REMIEL_COMPLETE_OPTION,
    mechanism: { kind: "complete-state" },
  },
  REMIEL_OLD_TEAM_RECORD,
  REMIEL_OLD_HOLDER_RECORD,
  LIGHTER_OLD_RECORD,
  {
    key: "nekomata-claw-mark",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:nekomata",
      identity: { kind: "agent", entityId: "1021" },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "nekomata",
      fairyEntityId: "1021",
      blockId: "blk-legacy",
      sourceEffectId: "eff-ms4f47p3-p1s9yz",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "核心被动：猫步诡影",
    references: NEKOMATA_REFERENCES,
    config: {
      kind: "all",
      conditions: [
        compareMindscape(0),
        {
          kind: "compare-number",
          unit: "count",
          operator: "gte",
          left: {
            kind: "configuration-number",
            unit: "count",
            field: "potentialLevel",
          },
          right: { kind: "literal", unit: "count", value: 1 },
        },
      ],
    },
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
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
          fact: "hit.element",
          values: ["physical"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:nekomata-claw-mark"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["nekomata:claw-mark"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 0.3 },
    },
    coverage: {
      status: "converted",
      differenceIds: ["potential-branch-gate", "independent-hit-contract"],
      positions: [
        {
          pointer: "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "directDmgMult",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: NEKOMATA_CLAW_OPTION,
    mechanism: NEKOMATA_MECHANISM,
  },
  {
    key: "miyabi-frostburn-main",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:miyabi",
      identity: { kind: "agent", entityId: "1091" },
    },
    ids: stableIds(
      MIYABI_FROSTBURN_OPTION.optionId,
      "agent:1091:nanoka:frostburn-break-damage:mindscape:0",
    ),
    section: "核心被动：寒炎（霜灼·破）",
    references: MIYABI_FROSTBURN_REFERENCES,
    config: { kind: "constant", value: true },
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
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
          values: ["zzz-hp:skill:miyabi-frostburn-break-damage"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["frost"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["miyabi:frostburn-break-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: {
          1: 7.5,
          2: 8.75,
          3: 10,
          4: 11.25,
          5: 12.5,
          6: 13.75,
          7: 15,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: MIYABI_FROSTBURN_OPTION,
    mechanism: MIYABI_FROSTBURN_MECHANISM,
  },
  {
    key: "miyabi-frostburn-m4",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:miyabi",
      identity: { kind: "agent", entityId: "1091" },
    },
    ids: stableIds(
      MIYABI_FROSTBURN_OPTION.optionId,
      "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4",
    ),
    section: "影画4：皲裂（霜灼·破增伤）",
    references: MIYABI_FROSTBURN_REFERENCES,
    config: { kind: "constant", value: true },
    activation: SUPPLIED_ONCE,
    beneficiary: { kind: "holder" },
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
          values: ["zzz-hp:skill:miyabi-frostburn-break-damage"],
        },
        {
          kind: "one-of",
          fact: "hit.element",
          values: ["frost"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "mindscapeRank",
        unit: "ratio",
        values: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.3, 6: 0.3 },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    option: MIYABI_FROSTBURN_OPTION,
    mechanism: MIYABI_FROSTBURN_MECHANISM,
  },
]

import type { NonEmpty, SourceReference } from "@randomplay/shared"
import { BUFF_RESOURCE, SOURCE_COMMIT } from "../source.ts"
import { fixedSourceIds, stableIds } from "./ids.ts"
import { P4_1_MECHANISM_AUTHORING_RECORDS } from "./mechanism-records.ts"
import { P2_4D_W_ENGINE_AUTHORING_RECORDS } from "./w-engine-records.ts"
import { P2_4E_AGENT_AUTHORING_RECORDS } from "./agent-supplement-records.ts"
import type {
  AuthoringOption,
  AuthoringSupplementalRecord,
  EffectAuthoringRecord,
} from "./types.ts"

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

function references(
  values: readonly SourceReference[],
): NonEmpty<SourceReference> {
  const [first, ...rest] = values
  if (!first) throw new Error("Authoring references must not be empty")
  return [first, ...rest]
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

function comparePotential(value: number): {
  readonly kind: "compare-number"
  readonly unit: "count"
  readonly operator: "gte"
  readonly left: {
    readonly kind: "configuration-number"
    readonly unit: "count"
    readonly field: "potentialLevel"
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
      field: "potentialLevel",
    },
    right: { kind: "literal", unit: "count", value },
  }
}

const SUPPLIED_ONCE = {
  kind: "supplied",
  maximumLayers: { kind: "literal", unit: "count", value: 1 },
} as const

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

const REMIEL_M1_TEAM_POINTER =
  "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/1"
const REMIEL_M1_HOLDER_POINTER =
  "/agents/53/mindscapeBuffs/1/effectBlocks/0/effects/2"
const REMIEL_M1_DIFFERENCE = "remielle-mindscape1-complete-anomaly-state"

const REMIEL_M1_TEAM_REFERENCES = references([zzzHp(REMIEL_M1_TEAM_POINTER)])
const REMIEL_M1_HOLDER_REFERENCES = references([
  zzzHp(REMIEL_M1_HOLDER_POINTER),
])
const REMIEL_COMPLETE_STATE_REFERENCES = references([
  zzzHp(REMIEL_M1_TEAM_POINTER),
  zzzHp(REMIEL_M1_HOLDER_POINTER),
])

const NEKOMATA_CLAW_MARK_POINTER =
  "/agents/40/mindscapeBuffs/0/effectBlocks/0/effects/1"
const NEKOMATA_CLAW_MARK_REFERENCES = references([
  zzzHp(NEKOMATA_CLAW_MARK_POINTER),
  ...passiveReferences("1021", NEKOMATA_PASSIVE_NODES, 0),
  ...passiveReferences("1021", NEKOMATA_PASSIVE_NODES, 0),
])

const MIYABI_TERMINAL_REFERENCES = references([
  zzzHp("/agents/22/mindscapeBuffs/0/effectBlocks/0/effects/0"),
  nanokaZh("agents/1091/details.zh.json", "/specialElementType/desc"),
  nanokaEn("agents/1091/details.en.json", "/specialElementType/desc"),
])

const MIYABI_BASIC_REFERENCES = references([
  zzzHp("/agents/22/mindscapeBuffs/0/effectBlocks/1/effects/1"),
  ...passiveReferences("1091", MIYABI_PASSIVE_NODES, 1),
  nanokaZh("agents/1091/details.zh.json", "/specialElementType/desc"),
  nanokaEn("agents/1091/details.en.json", "/specialElementType/desc"),
])

const MIYABI_FROSTBURN_REFERENCES = references([
  ...passiveReferences("1091", MIYABI_PASSIVE_NODES, 0),
  nanokaZh("agents/1091/details.zh.json", "/talent/4/desc"),
  nanokaEn("agents/1091/details.en.json", "/talent/4/desc"),
])

const CAESAR_PASSIVE_NODES = [
  1071501, 1071502, 1071503, 1071504, 1071505, 1071506, 1071507,
] as const

const CAESAR_M2_TEAM_ATTACK_REFERENCES = references([
  zzzHp("/agents/7/mindscapeBuffs/2/effectBlocks/0/effects/0"),
  nanokaZh("agents/1071/details.zh.json", "/talent/2/desc"),
  ...passiveReferences("1071", CAESAR_PASSIVE_NODES, 0),
])

const LYCAON_CORE_TEAM_DAMAGE_BONUS_REFERENCES = references([
  zzzHp("/agents/50/mindscapeBuffs/0/effectBlocks/0/effects/1"),
  ...passiveReferences(
    "1141",
    [1141508, 1141509, 1141510, 1141511, 1141512, 1141513, 1141514],
    0,
  ),
  nanokaZh("agents/1141/details.zh.json", "/passive/level/1141514/desc/0"),
])

const ELLEN_POTENTIAL_REFERENCES = references([
  zzzHp("/agents/48/mindscapeBuffs/0/effectBlocks/2/effects/0"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119101/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119102/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119103/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119104/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119105/desc"),
])

const ELLEN_POTENTIAL_RESISTANCE_IGNORE_REFERENCES = references([
  zzzHp("/agents/48/mindscapeBuffs/0/effectBlocks/2/effects/1"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119101/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119102/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119103/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119104/desc"),
  nanokaZh("agents/1191/details.zh.json", "/potentialDetail/119105/desc"),
])

const REMIEL_COMPLETE_STATE_OPTION = {
  optionId:
    "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage",
  catalogEntityId: "agents:remiel",
  name: "相变时流 · 其他角色属性异常伤害",
  conditionDescription:
    "蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
  target: "team",
  variants: [
    {
      configuration: {
        minimumMindscape: 1,
      },
      references: REMIEL_COMPLETE_STATE_REFERENCES,
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: [
        "remiel-m1-team-anomaly-damage",
        "remiel-m1-holder-anomaly-damage",
      ],
    },
  ],
} satisfies AuthoringOption

const NEKOMATA_CLAW_MARK_OPTION = {
  optionId: "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz",
  catalogEntityId: "agents:nekomata",
  name: "核心被动：猫步诡影 · directDmgMult",
  conditionDescription:
    "猫又[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升60%，持续40秒，重复触发时刷新持续时间；、\n猫又发动[闪避反击：绒爪穿刺]会进入[肉球突袭]状态，持续40秒，重复触发时刷新持续时间，[肉球突袭]状态下猫又自身的攻击命中时均视为从背后命中；\n处于[肉球突袭]状态时，猫又自身的攻击命中时会触发[超凶爪印]效果，造成一次等同于自身30%攻击力的物理伤害，该效果每1秒最多触发一次；",
  target: "self",
  variants: [
    {
      configuration: {
        minimumMindscape: 0,
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
        potentialLevels: [1, 2, 3, 4, 5, 6],
      },
      references: NEKOMATA_CLAW_MARK_REFERENCES,
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["nekomata-claw-mark"],
    },
  ],
} satisfies AuthoringOption

const MIYABI_FROSTBURN_OPTION = {
  optionId: "nanoka:agents:miyabi:frostburn-break-damage",
  catalogEntityId: "agents:miyabi",
  name: "寒炎 · 霜灼·破（独立结算）",
  conditionDescription:
    "核心被动[寒炎]：对附着[冰焰]的敌人施加[霜寒]效果时，消除[冰焰]并触发[霜灼·破]，对目标造成星见雅攻击力缩放的烈霜伤害（按核心 1—7 为 750/875/1000/1125/1250/1375/1500%）。触发已发生由调用方选中本选项并提供独立项断言：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取星见雅当前攻击力，并显式声明本次独立命中的最终暴击概率（hit.declaredCriticalRate，无默认值；烈霜命中按 frost 结算，规则限定 hit.element=frost，非烈霜命中零贡献）。结果的暴击分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读星见雅当前普通暴击伤害），是本接口的条件计算模型，不证明游戏内该伤害能暴击或继承该暴击伤害。影画 4 起[皲裂]自动对同一事件伤害 +30%（影画 0—3 不生效，不要求另行选择）；同句的 250 点喧响值不模拟。异常积蓄、冰焰/霜寒/霜灼状态机、落霜取得、10 秒触发间隔与[霜灼]状态不模拟；霜月/风花等普通动作不经本选项结算。",
  target: "self",
  variants: [
    {
      target: "self",
      configuration: {
        coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
      },
      references: MIYABI_FROSTBURN_REFERENCES,
      maximumLayers: 1,
      inputs: [],
      applicability: {},
      effectKeys: ["miyabi-frostburn-main", "miyabi-frostburn-m4"],
    },
  ],
} satisfies AuthoringOption

/**
 * 霜灼·破补充来源记录的正式基线值一次性转录。该记录同时覆盖核心被动
 * 独立结算与影画 4 增伤，因此只挂在 `miyabi-frostburn-main` 上，
 * `miyabi-frostburn-m4` 不重复声明同一 `supplementId`。
 */
const MIYABI_FROSTBURN_SUPPLEMENT = {
  supplementId: "nanoka:agents:miyabi:frostburn-break-damage",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1091 /passive/level/1091501—1091507/desc/0 + /talent/4/desc",
  kind: "option",
  optionId: "nanoka:agents:miyabi:frostburn-break-damage",
  effectIds: [
    "agent:1091:nanoka:frostburn-break-damage:mindscape:0",
    "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4",
  ],
  supportedRanks: "核心 1—7；影画 0—6",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

const NEKOMATA_CLAW_MARK_MECHANISM = {
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

export const P4_2_AUTHORING_RECORDS: readonly EffectAuthoringRecord[] = [
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

  // remiel-m1-team-anomaly-damage
  {
    key: "remiel-m1-team-anomaly-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:remiel",
      identity: {
        kind: "agent",
        entityId: "1581",
      },
    },
    ids: stableIds(
      REMIEL_COMPLETE_STATE_OPTION.optionId,
      "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
    ),
    section: "影画1",
    references: REMIEL_M1_TEAM_REFERENCES,
    config: compareMindscape(1),
    activation: SUPPLIED_ONCE,
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
          values: ["anomaly", "anomaly-settlement", "vortex", "luminize"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "anomaly-damage-bonus",
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
      status: "corrected",
      differenceIds: [REMIEL_M1_DIFFERENCE],
      positions: [],
    },
    option: REMIEL_COMPLETE_STATE_OPTION,
    mechanism: { kind: "complete-state" },
  },

  // remiel-m1-holder-anomaly-damage
  {
    key: "remiel-m1-holder-anomaly-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:remiel",
      identity: {
        kind: "agent",
        entityId: "1581",
      },
    },
    ids: stableIds(
      REMIEL_COMPLETE_STATE_OPTION.optionId,
      "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
    ),
    section: "影画1",
    references: REMIEL_M1_HOLDER_REFERENCES,
    config: compareMindscape(1),
    activation: SUPPLIED_ONCE,
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
          values: ["anomaly", "anomaly-settlement", "vortex", "luminize"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "anomaly-damage-bonus",
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
        value: -0.1,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: [REMIEL_M1_DIFFERENCE],
      positions: [],
    },
    option: REMIEL_COMPLETE_STATE_OPTION,
    mechanism: { kind: "complete-state" },
  },

  // nekomata-claw-mark
  {
    key: "nekomata-claw-mark",
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
      blockId: "blk-legacy",
      sourceEffectId: "eff-ms4f47p3-p1s9yz",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "核心被动：猫步诡影",
    references: NEKOMATA_CLAW_MARK_REFERENCES,
    config: {
      kind: "all",
      conditions: [compareMindscape(0), comparePotential(1)],
    },
    activation: SUPPLIED_ONCE,
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
        value: 0.3,
      },
    },
    coverage: {
      status: "converted",
      differenceIds: ["potential-branch-gate", "independent-hit-contract"],
      positions: [
        {
          pointer: NEKOMATA_CLAW_MARK_POINTER,
          rank: 0,
          rankKind: "mindscape",
          stat: "directDmgMult",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: NEKOMATA_CLAW_MARK_OPTION,
    mechanism: NEKOMATA_CLAW_MARK_MECHANISM,
  },

  // miyabi-frostburn-main
  {
    key: "miyabi-frostburn-main",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:miyabi",
      identity: {
        kind: "agent",
        entityId: "1091",
      },
    },
    ids: stableIds(
      MIYABI_FROSTBURN_OPTION.optionId,
      "agent:1091:nanoka:frostburn-break-damage:mindscape:0",
    ),
    section: "核心被动：寒炎（霜灼·破）",
    references: MIYABI_FROSTBURN_REFERENCES,
    config: { kind: "constant", value: true },
    activation: SUPPLIED_ONCE,
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
      value: {
        kind: "parameter",
        unit: "multiplier",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: {
          "1": 7.5,
          "2": 8.75,
          "3": 10,
          "4": 11.25,
          "5": 12.5,
          "6": 13.75,
          "7": 15,
        },
      },
    },
    coverage: {
      status: "converted",
      differenceIds: [],
      positions: [],
    },
    supplementalRecords: [MIYABI_FROSTBURN_SUPPLEMENT],
    option: MIYABI_FROSTBURN_OPTION,
    mechanism: MIYABI_FROSTBURN_MECHANISM,
  },

  // miyabi-frostburn-m4
  {
    key: "miyabi-frostburn-m4",
    entity: {
      sourceId: "nanoka-integrated",
      catalogEntityId: "agents:miyabi",
      identity: {
        kind: "agent",
        entityId: "1091",
      },
    },
    ids: stableIds(
      MIYABI_FROSTBURN_OPTION.optionId,
      "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4",
    ),
    section: "影画4：皲裂（霜灼·破增伤）",
    references: MIYABI_FROSTBURN_REFERENCES,
    config: { kind: "constant", value: true },
    activation: SUPPLIED_ONCE,
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
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "mindscapeRank",
        unit: "ratio",
        values: {
          "0": 0,
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0.3,
          "5": 0.3,
          "6": 0.3,
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

  // miyabi-terminal-damage
  {
    key: "miyabi-terminal-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:miyabi",
      identity: {
        kind: "agent",
        entityId: "1091",
      },
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
          values: ["ice", "frost"],
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
        value: 0.3,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["miyabi-frost-settlement-element-scope"],
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
    option: {
      optionId: "agents:miyabi:mindscape:0:blk-legacy:legacy-self-dmgBonus",
      catalogEntityId: "agents:miyabi",
      name: "终结技：名残雪 · dmgBonus",
      conditionDescription:
        "招式发动时，获得3点[落霜]，自身造成的冰属性伤害提升30%，持续12秒；",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
          },
          references: MIYABI_TERMINAL_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["miyabi-terminal-damage"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // miyabi-basic-resistance-ignore
  {
    key: "miyabi-basic-resistance-ignore",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:miyabi",
      identity: {
        kind: "agent",
        entityId: "1091",
      },
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
        value: 0.3,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["miyabi-frost-settlement-element-scope"],
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
    option: {
      optionId:
        "agents:miyabi:mindscape:0:blk-ms4msho4-fuuot6:eff-ms4mu14z-vj4c3r",
      catalogEntityId: "agents:miyabi",
      name: "额外能力：同沐霜雪 · resPen",
      conditionDescription:
        "队伍中存在[支援]角色或与自身阵营相同的角色或其他[异常]角色时触发：\n[普通攻击：霜月]造成的伤害提升60%；队伍中任意角色触发[紊乱]效果时，星见雅获得2点[落霜]，且在下一次[霜月架势]期间，[普通攻击：霜月]将无视目标30%冰属性伤害抗性。",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: MIYABI_BASIC_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["miyabi-basic-resistance-ignore"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // caesar-m2-team-attack
  {
    key: "caesar-m2-team-attack",
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
      rank: 2,
    }),
    section: "影画2",
    references: CAESAR_M2_TEAM_ATTACK_REFERENCES,
    config: compareMindscape(2),
    activation: SUPPLIED_ONCE,
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
        kind: "multiply",
        unit: "attack-points",
        value: {
          kind: "parameter",
          unit: "attack-points",
          name: "amount",
        },
        coefficient: {
          kind: "parameter",
          unit: "multiplier",
          name: "incrementCoefficient",
        },
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
      incrementCoefficient: {
        kind: "constant",
        unit: "multiplier",
        value: 0.5,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: [
        "core-skill-level-parameters",
        "core-enhancement-independent-increment",
      ],
      positions: [
        {
          pointer: "/agents/7/mindscapeBuffs/2/effectBlocks/0/effects/0",
          rank: 2,
          rankKind: "mindscape",
          stat: "atk",
          normalizationChanges: [],
          rawValue: 500,
          normalizedValue: 500,
        },
      ],
    },
    option: {
      optionId: "agents:caesar:mindscape:2:blk-legacy:legacy-team-atk",
      catalogEntityId: "agents:caesar",
      name: "影画2 · atk",
      conditionDescription:
        "[核心被动：坚韧之壁]中，[荣光之盾]存在期间，凯撒的能量获得效率提升10%，持有者的攻击力提升效果提升至原本的150%。",
      target: "team",
      variants: [
        {
          configuration: {
            minimumMindscape: 2,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
          },
          references: CAESAR_M2_TEAM_ATTACK_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["caesar-m2-team-attack"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // lycaon-core-team-damage-bonus
  {
    key: "lycaon-core-team-damage-bonus",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:lycaon",
      identity: {
        kind: "agent",
        entityId: "1141",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "lycaon",
      fairyEntityId: "1141",
      blockId: "blk-legacy",
      sourceEffectId: "legacy-team-dmgBonus",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "核心被动：金属狼足",
    references: LYCAON_CORE_TEAM_DAMAGE_BONUS_REFERENCES,
    config: {
      kind: "all",
      conditions: [compareMindscape(0), comparePotential(1)],
    },
    activation: SUPPLIED_ONCE,
    beneficiary: {
      kind: "team",
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
        value: 0.3,
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-branch-gate"],
      positions: [
        {
          pointer: "/agents/50/mindscapeBuffs/0/effectBlocks/0/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "dmgBonus",
          normalizationChanges: [],
          rawValue: 30,
          normalizedValue: 30,
        },
      ],
    },
    option: {
      optionId: "agents:lycaon:mindscape:0:blk-legacy:legacy-team-dmgBonus",
      catalogEntityId: "agents:lycaon",
      name: "核心被动：金属狼足 · dmgBonus",
      conditionDescription:
        "[强化特殊技：狂猎时刻]、[支援突击：复仇反扑]或[支援突击：复仇反扑·冰舞]命中敌人时，目标的冰属性伤害抗性降低25%，受到的其他属性伤害提升30%，持续30秒。",
      target: "team",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
            potentialLevels: [1, 2, 3, 4, 5, 6],
          },
          references: LYCAON_CORE_TEAM_DAMAGE_BONUS_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {
            beneficiaryElements: [
              "wind",
              "fire",
              "electric",
              "physical",
              "ether",
            ],
          },
          effectKeys: ["lycaon-core-team-damage-bonus"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // ellen-potential-critical-damage
  {
    key: "ellen-potential-critical-damage",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:ellen",
      identity: {
        kind: "agent",
        entityId: "1191",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "ellen",
      fairyEntityId: "1191",
      blockId: "blk-ms4fuyir-dotq6c",
      sourceEffectId: "eff-ms4fuyir-e3fuww",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "潜能觉醒：极冰带v6",
    references: ELLEN_POTENTIAL_REFERENCES,
    config: {
      kind: "all",
      conditions: [compareMindscape(0), comparePotential(2)],
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
          "2": 0.016,
          "3": 0.024,
          "4": 0.032,
          "5": 0.04,
          "6": 0.048,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/48/mindscapeBuffs/0/effectBlocks/2/effects/0",
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
      optionId:
        "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fuyir-e3fuww",
      catalogEntityId: "agents:ellen",
      name: "潜能觉醒：极冰带v6 · critDmg",
      conditionDescription:
        "艾莲[额外能力：风暴潮]，每层暴击伤害提升4.8%。叠加至10层时，攻击目标无视10%的冰属性伤害抗性",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: ELLEN_POTENTIAL_REFERENCES,
          maximumLayers: 10,
          inputs: [],
          applicability: {},
          effectKeys: ["ellen-potential-critical-damage"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },

  // ellen-potential-resistance-ignore
  {
    key: "ellen-potential-resistance-ignore",
    entity: {
      sourceId: "zzz-hp",
      catalogEntityId: "agents:ellen",
      identity: {
        kind: "agent",
        entityId: "1191",
      },
    },
    ids: fixedSourceIds({
      category: "agents",
      entitySlug: "ellen",
      fairyEntityId: "1191",
      blockId: "blk-ms4fuyir-dotq6c",
      sourceEffectId: "eff-ms4fvlsz-x4x1hj",
      rankKind: "mindscape",
      rank: 0,
    }),
    section: "潜能觉醒：极冰带v6",
    references: ELLEN_POTENTIAL_RESISTANCE_IGNORE_REFERENCES,
    config: {
      kind: "all",
      conditions: [compareMindscape(0), comparePotential(2)],
    },
    activation: SUPPLIED_ONCE,
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
          values: ["ice"],
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
          "2": 0.033,
          "3": 0.05,
          "4": 0.067,
          "5": 0.083,
          "6": 0.1,
        },
      },
    },
    coverage: {
      status: "corrected",
      differenceIds: ["potential-level-expression"],
      positions: [
        {
          pointer: "/agents/48/mindscapeBuffs/0/effectBlocks/2/effects/1",
          rank: 0,
          rankKind: "mindscape",
          stat: "resPen",
          normalizationChanges: [],
          rawValue: 10,
          normalizedValue: 10,
        },
      ],
    },
    option: {
      optionId:
        "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fvlsz-x4x1hj",
      catalogEntityId: "agents:ellen",
      name: "潜能觉醒：极冰带v6 · resPen",
      conditionDescription:
        "艾莲[额外能力：风暴潮]，每层暴击伤害提升4.8%。叠加至10层时，攻击目标无视10%的冰属性伤害抗性",
      target: "self",
      variants: [
        {
          configuration: {
            minimumMindscape: 0,
            potentialLevels: [2, 3, 4, 5, 6],
          },
          references: ELLEN_POTENTIAL_RESISTANCE_IGNORE_REFERENCES,
          maximumLayers: 1,
          inputs: [],
          applicability: {},
          effectKeys: ["ellen-potential-resistance-ignore"],
        },
      ],
    },
    mechanism: { kind: "single-rule" },
  },
]

export const MIGRATED_AUTHORING_RECORDS: readonly EffectAuthoringRecord[] = [
  ...P4_2_AUTHORING_RECORDS,
  ...P4_1_MECHANISM_AUTHORING_RECORDS,
  ...P2_4D_W_ENGINE_AUTHORING_RECORDS,
  ...P2_4E_AGENT_AUTHORING_RECORDS,
]

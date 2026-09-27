import type {
  AnyParameter,
  Condition,
  ContributionOperation,
  CoreSkillLevel,
  EffectId,
  PotentialLevel,
  SourceIdentity,
  StaticCatalogEntity,
  StaticCatalogInputRequirement,
  StaticCatalogVariant,
} from "@randomplay/shared"

/**
 * Nanoka 补充来源登记：固定 ZZZ-HP 来源缺少对应位置、但资料明确且当前公式
 * 可计算的静态增益。补充条目不伪装成 ZZZ-HP SourceRecord，输出同一 RuleSet
 * 与目录；数值仍编译为现有 NumericExpression。核心档位证据仍由
 * rank-evidence.json 单独维护，本文件不重复登记。
 */

export interface SupplementEvidenceReference {
  readonly path: string
  readonly pointer: string
  readonly sha256: string
}

export interface SupplementRuleSpec {
  readonly effectId: EffectId
  readonly identity: SourceIdentity
  readonly section: string
  readonly config: Condition<"configuration">
  readonly parameters: Readonly<Record<string, AnyParameter>>
  readonly scope: "entity" | "hit"
  readonly when: Condition<"contribution">
  readonly operation: ContributionOperation
  readonly maximumLayers: number
}

export interface SupplementVariantSpec {
  readonly configuration: {
    readonly coreSkillLevels?: readonly CoreSkillLevel[]
    readonly refinements?: readonly (1 | 2 | 3 | 4 | 5)[]
    readonly potentialLevels?: readonly PotentialLevel[]
  }
  readonly inputs: readonly StaticCatalogInputRequirement[]
  readonly applicability: StaticCatalogVariant["applicability"]
  readonly conditionDescription: string
  readonly name: string
  readonly target: "self" | "team"
}

export interface SupplementBase {
  readonly supplementId: string
  readonly source: string
  readonly evidence: readonly SupplementEvidenceReference[]
  readonly verification: string
}

export type Supplement =
  | (SupplementBase & {
      readonly kind: "option-variant"
      readonly optionId: string
      readonly rule: SupplementRuleSpec
      readonly variant: SupplementVariantSpec
      readonly supportedRanks: string
      readonly computationTarget: string
    })
  | (SupplementBase & {
      readonly kind: "entity"
      readonly entity: StaticCatalogEntity
      readonly optionId: string
      readonly rule: SupplementRuleSpec
      readonly variant: SupplementVariantSpec
      readonly supportedRanks: string
      readonly computationTarget: string
    })
  | (SupplementBase & {
      readonly kind: "boundary"
      readonly reason: string
      readonly computationTarget: "none"
    })

const literal = <U extends import("@randomplay/shared").Unit>(
  unit: U,
  value: number,
) => ({ kind: "literal", unit, value }) as const

const directKinds = ["regular", "sheer"] as const

const nekomataOrdinaryEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021507/desc/0",
    sha256: "a265694efbc779a299d6a5c8c198b569ce43f22d354b02d4be4b4bf3d41d189e",
  },
] as const

const nekomataShowEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021507/desc/1",
    sha256: "a265694efbc779a299d6a5c8c198b569ce43f22d354b02d4be4b4bf3d41d189e",
  },
] as const

const redAxisEvidence = ([1, 2, 3, 4, 5] as const).map((tier) => ({
  path: "w-engines/13111/details.zh.json",
  pointer: `/talents/${tier}/desc`,
  sha256: "9e64b712f1b2e306e6083aa3bf2507b52396e83c6328df6118049db2fe2c1d43",
}))

const redAxisIdentity: SourceIdentity = { kind: "w-engine", entityId: "13111" }

/**
 * 猫又普通分支 60% 增伤：闪避反击或快速支援命中后 +60%、持续 6 秒；
 * 仅潜能未开启（0）时可用，与潜能分支的 40 秒记录互斥。
 */
const nekomataOrdinaryDmgBonus: Supplement = {
  kind: "option-variant",
  supplementId: "nanoka:nekomata:ordinary-dmg-bonus",
  source: "nanoka-integrated@3.1 agents/1021 /passive/level/1021507/desc/0",
  optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  evidence: nekomataOrdinaryEvidence,
  verification:
    "Nanoka 普通分支（/passive/level/1021507，potential 为 [0]）确认：[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升 60%、持续 6 秒。与潜能分支的 40 秒记录互斥：本变体声明潜能 0，潜在变体声明潜能 1—6；只支持已核实核心 7。",
  rule: {
    effectId: "agent:1021:nanoka:ordinary-dmgBonus:blk-legacy:mindscape:0",
    identity: { kind: "agent", entityId: "1021" },
    section: "核心被动：猫步诡影（普通分支）",
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
          right: literal("count", 0),
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
          right: literal("count", 7),
        },
      ],
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.6 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [...directKinds],
        },
        {
          kind: "one-of",
          fact: "hit.skillCategory",
          values: ["dodge-counter", "quick-assist"],
        },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { coreSkillLevels: [7], potentialLevels: [0] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "普通分支（潜能未开启）：[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升 60%，持续 6 秒；由调用方断言命中分类。",
    name: "核心被动：猫步诡影 · dmgBonus",
    target: "self",
  },
}

/**
 * 猫又普通分支的额外能力（猫步秀）：队伍同属性/阵营且任意角色施加[强击]后，
 * 下一次[强化特殊技]伤害 +35%，最多 2 层；仅潜能 0 时可用。
 */
const nekomataOrdinaryShow: Supplement = {
  kind: "option-variant",
  supplementId: "nanoka:nekomata:ordinary-show",
  source: "nanoka-integrated@3.1 agents/1021 /passive/level/1021507/desc/1",
  optionId:
    "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7",
  supportedRanks: "core 7；潜能 0；层数 1—2",
  computationTarget: "catalog option variant",
  evidence: nekomataShowEvidence,
  verification:
    "Nanoka 普通分支（/passive/level/1021507/desc/1）确认：队伍中存在与自身属性或阵营相同的角色时，任意角色施加[强击]后，猫又下一次[强化特殊技]伤害提升 35%、最多 2 层。与潜能分支（含[支援]角色与[闪避：尾巴失踪术]扩展、[闪避反击]受益）条件不同，各自独立登记、不并集。",
  rule: {
    effectId: "agent:1021:nanoka:ordinary-show:blk-ms4f4rbb-id7p58:mindscape:0",
    identity: { kind: "agent", entityId: "1021" },
    section: "额外能力：猫步秀（普通分支）",
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
          right: literal("count", 0),
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
          right: literal("count", 7),
        },
      ],
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.35 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [...directKinds],
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 2,
  },
  variant: {
    configuration: { coreSkillLevels: [7], potentialLevels: [0] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "普通分支（潜能未开启）：队伍中存在与自身属性或阵营相同的角色；任意角色施加[强击]后，下一次[强化特殊技]伤害提升 35%、最多 2 层。队伍条件与触发由调用方断言。",
    name: "额外能力：猫步秀 · skillDmgBonus",
    target: "self",
  },
}

/**
 * 旋钻机-赤轴（w-engines/13111）：五档精炼 0.50/0.575/0.65/0.725/0.80；
 * 发动强化特殊技或连携技后（显式状态），普通攻击与冲刺攻击造成的电属性直伤受益。
 */
const redAxis: Supplement = {
  kind: "entity",
  supplementId: "nanoka:w-engines:13111",
  source: "nanoka-integrated@3.1 w-engines/13111 /talents/1—5/desc",
  optionId: "nanoka:w-engines:13111:refinement:red-axis",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog entity + option",
  evidence: redAxisEvidence,
  verification:
    "Nanoka 五档天赋文本逐档核实：发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升 50/57.5/65/72.5/80%，持续 10 秒，15 秒内最多触发一次。冲刺为 dash 大类中的冲刺攻击动作，不含闪避反击；触发状态由调用方显式选择，不模拟 10 秒持续与 15 秒冷却。适用职业强攻由 Nanoka weaponType 1 与既有目录 93 台音擎的 profession 交叉核实。",
  entity: {
    catalogEntityId: "nanoka:w-engines:13111",
    upstreamId: null,
    name: "旋钻机-赤轴",
    identity: redAxisIdentity,
    status: "mapped",
    profession: "强攻",
    element: "electric",
    supplementProvenance: {
      sourceId: "nanoka-integrated",
      version: "3.1",
      resources: [
        {
          path: "w-engines/13111/details.zh.json",
          sha256:
            "9e64b712f1b2e306e6083aa3bf2507b52396e83c6328df6118049db2fe2c1d43",
        },
        {
          path: "w-engines/13111/data.json",
          sha256:
            "f15b78db778f650eadc03281d0408aba6b6a4bba603c2d8db304a129a2d757b6",
        },
      ],
    },
  },
  rule: {
    effectId: "w-engine:13111:nanoka:red-axis-talent",
    identity: redAxisIdentity,
    section: "红莲电机",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: {
          1: 0.5,
          2: 0.575,
          3: 0.65,
          4: 0.725,
          5: 0.8,
        },
      },
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
        { kind: "one-of", fact: "hit.element", values: ["electric"] },
      ],
    },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "发动[强化特殊技]或[连携技]时，[普通攻击]和[冲刺攻击]造成的电属性伤害提升（按精炼 50/57.5/65/72.5/80%），持续 10 秒，15 秒内最多触发一次；触发状态与持续由调用方显式选择，不模拟冷却。",
    name: "红莲电机 · dmgBonus",
    target: "self",
  },
}

/** 恒等式-变格（w-engines/12014）：敌方输出/己方承伤方向，公开路径不接入。 */
const identityInflectionBoundary: Supplement = {
  kind: "boundary",
  supplementId: "nanoka:w-engines:12014:boundary",
  source: "nanoka-integrated@3.1 w-engines/12014 /talents/1—5/desc",
  reason:
    "五档使攻击者造成的伤害降低 6/7/8/9/10%，属于敌方输出/己方承伤方向；当前公开路径计算己方对敌伤害，不能把它转换成 target damage-taken-reduction 来降低己方输出，也不能报告其增益为零后视为接入。保留五档来源证据，待承伤计算产品建立后另行接入。",
  evidence: [],
  verification:
    "Nanoka 五档天赋文本核实（受到敌方攻击时，攻击者造成的伤害降低 6/7/8/9/10%，持续 12 秒）；本轮仅登记消费方向边界，不新增承伤计算。",
  computationTarget: "none",
}

export const SUPPLEMENTS: readonly Supplement[] = [
  nekomataOrdinaryDmgBonus,
  nekomataOrdinaryShow,
  redAxis,
  identityInflectionBoundary,
]

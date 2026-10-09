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
    /** 驱动盘套装二件套选项的件数门槛；与规则的 setPieces 配置条件一致。 */
    readonly minimumSetPieces?: 2 | 4
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

/** 在既有目录实体新增选项的补充来源；不创建重复实体。 */
export interface SupplementOption extends SupplementBase {
  readonly kind: "option"
  readonly catalogEntityId: string
  readonly optionId: string
  readonly rule: SupplementRuleSpec
  readonly variant: SupplementVariantSpec
  readonly supportedRanks: string
  readonly computationTarget: string
}

export type Supplement =
  | SupplementOption
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
      /**
       * 在既有目录实体上登记一个如实不可选的选项变体（formula-out-of-scope）：
       * 来源效果存在（如驱动盘二件套的护盾值、失衡值条款），但当前伤害计算
       * 不承诺该乘区。不创建规则、不伪造数值；消费端显式选择时得到带解释的
       * 明确错误，静态计算的覆盖注册表据此声明该套装二件套“已声明越界”。
       */
      readonly kind: "unsupported-option"
      readonly catalogEntityId: string
      readonly optionId: string
      readonly name: string
      readonly conditionDescription: string
      readonly target: "self" | "team"
      readonly minimumSetPieces: 2 | 4
      readonly reason: "formula-out-of-scope"
      readonly explanation: string
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

/** 潜能门槛条件；门槛值来自 Nanoka potentialDetail 的每档数值。 */
const potentialFrom = (minimum: number): Condition<"configuration"> => ({
  kind: "compare-number",
  unit: "count",
  operator: "gte",
  left: {
    kind: "configuration-number",
    unit: "count",
    field: "potentialLevel",
  },
  right: literal("count", minimum),
})
const directKinds = ["regular", "sheer"] as const

const nekomataOrdinaryEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021507/desc/0",
    sha256: "68cfb9254d991cd3d59a0e7ec38c3f8f15ed8030a910cacd9627e7726074cb07",
  },
] as const

const nekomataShowEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021507/desc/1",
    sha256: "68cfb9254d991cd3d59a0e7ec38c3f8f15ed8030a910cacd9627e7726074cb07",
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
 * 闪反/快支命中是触发条件，由调用方选中本增益断言状态有效；
 * 受益范围是自身造成的伤害，不按命中分类筛选。
 */
const nekomataOrdinaryDmgBonus: Supplement = {
  kind: "option-variant",
  supplementId: "nanoka:nekomata:ordinary-dmg-bonus",
  source: "nanoka-integrated@3.2 agents/1021 /passive/level/1021507/desc/0",
  optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  evidence: nekomataOrdinaryEvidence,
  verification:
    "Nanoka 普通分支（/passive/level/1021507，potential 为 [0]）确认：[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升 60%、持续 6 秒。这两个动作是触发条件：静态入口由调用方显式选中有效增益断言触发已发生，不模拟此前的触发事件与持续时间；受益范围与潜能分支一致，为自身造成的全部伤害，普攻、强化特殊技、终结技、闪反、快支命中均获得同一 0.6 增伤贡献，不按命中分类筛选。与潜能分支的 40 秒记录互斥：本变体声明潜能 0，潜在变体声明潜能 1—6；只支持已核实核心 7（潜能分支数值随核心等级 30%—60% 变化，等级 7 之外缺档）。",
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
    when: { kind: "constant", value: true },
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
      "普通分支（潜能未开启）：[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升 60%，持续 6 秒；触发事实由调用方选中本增益断言，命中不限于触发分类。",
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
  source: "nanoka-integrated@3.2 agents/1021 /passive/level/1021507/desc/1",
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
  source: "nanoka-integrated@3.2 w-engines/13111 /talents/1—5/desc",
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
      version: "3.2",
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
  source: "nanoka-integrated@3.2 w-engines/12014 /talents/1—5/desc",
  reason:
    "五档使攻击者造成的伤害降低 6/7/8/9/10%，属于敌方输出/己方承伤方向；当前公开路径计算己方对敌伤害，不能把它转换成 target damage-taken-reduction 来降低己方输出，也不能报告其增益为零后视为接入。保留五档来源证据，待承伤计算产品建立后另行接入。",
  evidence: [],
  verification:
    "Nanoka 五档天赋文本核实（受到敌方攻击时，攻击者造成的伤害降低 6/7/8/9/10%，持续 12 秒）；本轮仅登记消费方向边界，不新增承伤计算。",
  computationTarget: "none",
}

/** 驱动盘二件套的件数门槛条件；与来源二件套规则的 setPieces 配置一致。 */
const driveDiscTwoPieceConfig = (
  minimumSetPieces: 2,
): Condition<"configuration"> => ({
  kind: "compare-number",
  unit: "count",
  operator: "gte",
  left: {
    kind: "configuration-number",
    unit: "count",
    field: "setPieces",
  },
  right: literal("count", minimumSetPieces),
})

const shockstarDiscoEvidence = [
  {
    path: "drive-discs/31200/details.zh.json",
    pointer: "/desc2",
    sha256: "109364e29c3ce07041963bfde98a39344645c8cfc59d32d7189e3e36bed7ee82",
  },
] as const

/**
 * 震星迪斯科（31200）二件套：冲击力 +6%。固定来源的二件套块只保留空 effects
 * 与同文 note（/driveDiscs/28/twoPieceEffectBlocks/0），机器记录缺失；按
 * integrated 描述补真实属性规则，使 equipment 面板可以重建该贡献。
 */
const shockstarDiscoTwoPieceImpact: Supplement = {
  kind: "option",
  supplementId: "nanoka:drive-discs:31200:two-piece-impact-percent",
  source: "nanoka-integrated@3.2 drive-discs/31200 /desc2",
  catalogEntityId: "drive-discs:SuitShockstarDisco",
  optionId: "nanoka:drive-discs:31200:two-piece-impact-percent",
  supportedRanks: "2 件起",
  computationTarget: "catalog option on the mapped drive-disc entity",
  evidence: shockstarDiscoEvidence,
  verification:
    "Nanoka drive-discs/31200 /desc2 原文“冲击力+6%。”；固定来源 fac62407 的二件套块（/driveDiscs/28/twoPieceEffectBlocks/0）note 与此逐字相同但 effects 为空、twoPieceMods 全零，没有可转换的机器记录。按补充来源在既有 drive-discs:SuitShockstarDisco 实体登记二件套选项：冲击力按基础百分比进入局外初始阶段（initial-percentage），与“属性+百分比”类二件套条款（如荆棘玫瑰 34200 的 externalDefPercent → defense initial-percentage、激素朋克 31400 的 externalAtkPercent → attack initial-percentage）同一口径；2 件起按实际件数自动选中、同一套只生效一次。已结算局外面板输入已含该贡献，静态入口不再重复叠加。",
  rule: {
    effectId: "disc:31200:nanoka:two-piece-impact-percent:setPieces:2",
    identity: { kind: "drive-disc", entityId: "31200" },
    section: "2件套",
    config: driveDiscTwoPieceConfig(2),
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.06 },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "initial-percentage",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumSetPieces: 2 },
    inputs: [],
    applicability: {},
    conditionDescription: "冲击力+6%。",
    name: "2件套 · impact",
    target: "self",
  },
}

const soulRockEvidence = [
  {
    path: "drive-discs/31500/details.zh.json",
    pointer: "/desc2",
    sha256: "bdf81529b0dad0bb91f0a7b6b14484af3b9b31ead6841103c177563aed101c0c",
  },
] as const

/**
 * 灵魂摇滚（31500）二件套：防御力 +16%。固定来源的二件套机器记录完全缺失
 * （无块、无 effects、mods 全零）；按 integrated 描述补真实属性规则。
 */
const soulRockTwoPieceDefense: Supplement = {
  kind: "option",
  supplementId: "nanoka:drive-discs:31500:two-piece-defense-percent",
  source: "nanoka-integrated@3.2 drive-discs/31500 /desc2",
  catalogEntityId: "drive-discs:SuitSoulRock",
  optionId: "nanoka:drive-discs:31500:two-piece-defense-percent",
  supportedRanks: "2 件起",
  computationTarget: "catalog option on the mapped drive-disc entity",
  evidence: soulRockEvidence,
  verification:
    "Nanoka drive-discs/31500 /desc2 原文“防御力+16%。”；固定来源 fac62407 没有任何二件套机器记录（twoPieceEffectBlocks 为 null、twoPieceEffects 为空、twoPieceMods 全零）。同文的“防御力+16%。”条款在荆棘玫瑰（34200）由来源编码为 externalDefPercent 并转换为 defense 的 initial-percentage，本补充沿用同一口径在既有 drive-discs:SuitSoulRock 实体登记二件套选项；2 件起按实际件数自动选中、同一套只生效一次。已结算局外面板输入已含该贡献，静态入口不再重复叠加；该防御进入面板后可被防御缩放类规则读取。",
  rule: {
    effectId: "disc:31500:nanoka:two-piece-defense-percent:setPieces:2",
    identity: { kind: "drive-disc", entityId: "31500" },
    section: "2件套",
    config: driveDiscTwoPieceConfig(2),
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.16 },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "defense",
      stage: "initial-percentage",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumSetPieces: 2 },
    inputs: [],
    applicability: {},
    conditionDescription: "防御力+16%。",
    name: "2件套 · externalDefPercent",
    target: "self",
  },
}

const protoPunkEvidence = [
  {
    path: "drive-discs/31900/details.zh.json",
    pointer: "/desc2",
    sha256: "9c6614381151e3568cd368deea6cbbf71579ed0c556f9faedf99b85f9cb904c8",
  },
] as const

/**
 * 原始朋克（31900）二件套：施加的护盾值 +15%。护盾值不属于当前伤害计算
 * 承诺的任何乘区；如实登记为不可选的 formula-out-of-scope 选项，不伪造
 * 属性或增伤规则。
 */
const protoPunkTwoPieceShieldBoundary: Supplement = {
  kind: "unsupported-option",
  supplementId: "nanoka:drive-discs:31900:two-piece-shield-value",
  source: "nanoka-integrated@3.2 drive-discs/31900 /desc2",
  catalogEntityId: "drive-discs:SuitProtoPunk",
  optionId: "nanoka:drive-discs:31900:two-piece-shield-value",
  name: "2件套 · shieldValue",
  conditionDescription: "施加的护盾值提升15%。",
  target: "self",
  minimumSetPieces: 2,
  reason: "formula-out-of-scope",
  explanation:
    "二件套条款为施加的护盾值提升15%。护盾值不属于当前伤害计算的任何乘区，也没有已核实的护盾公式；不能把它伪装成属性、增伤或减伤规则。装备该套装 2 件及以上时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
  supportedRanks: "2 件起（不可选）",
  computationTarget:
    "declared unavailable option on the mapped drive-disc entity",
  evidence: protoPunkEvidence,
  verification:
    "Nanoka drive-discs/31900 /desc2 原文“施加的护盾值提升15%。”；固定来源 fac62407 没有该条款的机器记录（twoPieceEffectBlocks 为 null、twoPieceEffects 为空、twoPieceMods 全零）。当前公开路径计算己方对敌伤害，护盾值（施加的护盾量）不在已核实的乘区与公式范围内，本轮不新增护盾公式，也不把它记为零贡献后冒充接入；登记为 formula-out-of-scope 的不可选变体，供覆盖注册表与调用方得到明确解释。",
}

const kingOfTheSummitEvidence = [
  {
    path: "drive-discs/33200/details.zh.json",
    pointer: "/desc2",
    sha256: "706bc00711de5fba049ee0b8f6d9985762b236674d532311072037a609385c18",
  },
] as const

/**
 * 山大王（33200）二件套：攻击造成的失衡值 +6%。失衡值不属于当前伤害计算
 * 承诺（完整入口的 daze-only 分支不计算最终失衡值）；如实登记为不可选的
 * formula-out-of-scope 选项。该条款是失衡值，不是冲击力或增伤。
 */
const kingOfTheSummitTwoPieceDazeBoundary: Supplement = {
  kind: "unsupported-option",
  supplementId: "nanoka:drive-discs:33200:two-piece-daze-value",
  source: "nanoka-integrated@3.2 drive-discs/33200 /desc2",
  catalogEntityId: "drive-discs:SuitKingoftheSummit",
  optionId: "nanoka:drive-discs:33200:two-piece-daze-value",
  name: "2件套 · dazeValue",
  conditionDescription: "攻击造成的失衡值提升6%",
  target: "self",
  minimumSetPieces: 2,
  reason: "formula-out-of-scope",
  explanation:
    "二件套条款为攻击造成的失衡值提升6%。这是失衡值（daze）加成，不是冲击力、攻击力或伤害加成；完整静态入口的 daze-only 分支不计算最终失衡值，当前没有已核实的失衡值乘区。装备该套装 2 件及以上时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
  supportedRanks: "2 件起（不可选）",
  computationTarget:
    "declared unavailable option on the mapped drive-disc entity",
  evidence: kingOfTheSummitEvidence,
  verification:
    "Nanoka drive-discs/33200 /desc2 原文“攻击造成的失衡值提升6%”；固定来源 fac62407 没有该条款的机器记录（twoPieceEffectBlocks 为 null、twoPieceEffects 为空、twoPieceMods 全零）。失衡值与伤害、冲击力是不同量纲：不能把它转换为 impact 或任何伤害乘区，也不在 daze-only 分支外新造最终失衡值公式。登记为 formula-out-of-scope 的不可选变体，供覆盖注册表与调用方得到明确解释。",
}

const potentialEvidence = (
  entityId: string,
  sha256: string,
  startId: number,
): readonly SupplementEvidenceReference[] =>
  [startId + 1, startId + 2, startId + 3, startId + 4, startId + 5].map(
    (id) => ({
      path: `agents/${entityId}/details.zh.json`,
      pointer: `/potentialDetail/${id}/desc`,
      sha256,
    }),
  )

const soldier11PotentialEvidence = potentialEvidence(
  "1041",
  "2e6e2beaf2858e974944ff415a0a640a15c0c5f446c60020b90ba59292eeb405",
  104100,
)
const lycaonPotentialEvidence = potentialEvidence(
  "1141",
  "86b72b728c26ebdf79acb4663aef806e10a7c0ad86632eb60d2d8254a18bf3d1",
  114100,
)
const alexandrinaPotentialEvidence = potentialEvidence(
  "1211",
  "ff04332f6e00a8e4ef654a1da8bfffbb577d90219c26b9f37cb1f4f69c0b9615",
  121100,
)
const ellenOrdinaryEvidence = [
  {
    path: "agents/1191/details.zh.json",
    pointer: "/passive/level/1191507/desc/0",
    sha256: "af6dfd6b8e63a6e2b460b63dc03bc7376d50e872bb8e26493364f5393176e222",
  },
] as const
const harumasaOrdinaryEvidence = [
  {
    path: "agents/1201/details.zh.json",
    pointer: "/passive/level/1201507/desc/0",
    sha256: "cc189bbe54821dcca7139a529ca283220154aa92fbc84e912eab01fb1bb1b8db",
  },
] as const

/** 11号（绝焰）：额外能力燎原条件下的自身暴伤，固定来源缺该具名项。 */
const soldier11FlameProwess: Supplement = {
  kind: "option",
  supplementId: "nanoka:soldier11:flame-prowess",
  source:
    "nanoka-integrated@3.2 agents/1041 /potentialDetail/104101—104105/desc",
  catalogEntityId: "agents:soldier11",
  optionId: "nanoka:agents:soldier11:potential:flame-prowess",
  supportedRanks: "潜能 2—6",
  computationTarget: "catalog option on the mapped agent entity",
  evidence: soldier11PotentialEvidence,
  verification:
    "Nanoka potentialDetail 104101—104105（level 2—6）明确：[额外能力：燎原]中，「11号」自身暴击伤害提升 16/24/32/40/48%。固定 ZZZ-HP 来源没有该具名条目（version 6 的额外能力只记录火属性增伤 10% 与失衡额外 22.5%），按补充来源在既有 agents:soldier11 实体新增选项；额外能力触发条件（队伍中存在与自身属性或阵营相同的角色）由调用方显式选择断言，不自动推断队伍构成。",
  rule: {
    effectId: "agent:1041:nanoka:flame-prowess:mindscape:0",
    identity: { kind: "agent", entityId: "1041" },
    section: "潜能觉醒：绝焰",
    config: potentialFrom(2),
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: { 2: 0.16, 3: 0.24, 4: 0.32, 5: 0.4, 6: 0.48 },
      },
    },
    scope: "hit",
    when: { kind: "all", conditions: [] },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalDamage",
      stage: "direct",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { potentialLevels: [2, 3, 4, 5, 6] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "额外能力：燎原生效时（队伍中存在与自身属性或阵营相同的角色，由调用方断言），自身暴击伤害提升（潜能 2—6：16/24/32/40/48%）。",
    name: "潜能觉醒：绝焰 · critDmg",
    target: "self",
  },
}

/** 莱卡恩（掠冰）：围猎期间作为非当前操作角色发动普攻/冲刺/闪避反击的冲击力。 */
const lycaonIceHunt: Supplement = {
  kind: "option",
  supplementId: "nanoka:lycaon:ice-hunt-impact",
  source:
    "nanoka-integrated@3.2 agents/1141 /potentialDetail/114101—114105/desc",
  catalogEntityId: "agents:lycaon",
  optionId: "nanoka:agents:lycaon:potential:ice-hunt-impact",
  supportedRanks: "潜能 2—6",
  computationTarget: "catalog option on the mapped agent entity",
  evidence: lycaonPotentialEvidence,
  verification:
    "Nanoka potentialDetail 114101—114105（level 2—6）明确：[围猎]状态持续期间，莱卡恩作为非当前操作中代理人发动[普通攻击]、[冲刺攻击]和[闪避反击]时，冲击力提升 5/7.5/10/12.5/15%。固定 ZZZ-HP 来源没有该具名条目，按补充来源在既有 agents:lycaon 实体新增选项；围猎状态与出站事实由调用方显式断言。围猎自动攻击、剩余时间 6% 失衡每秒等时间线机制不模拟。",
  rule: {
    effectId: "agent:1141:nanoka:ice-hunt-impact:mindscape:0",
    identity: { kind: "agent", entityId: "1141" },
    section: "潜能觉醒：掠冰",
    config: potentialFrom(2),
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: { 2: 0.05, 3: 0.075, 4: 0.1, 5: 0.125, 6: 0.15 },
      },
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { potentialLevels: [2, 3, 4, 5, 6] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "围猎状态持续期间，作为非当前操作中代理人发动[普通攻击]、[冲刺攻击]和[闪避反击]时，冲击力提升（潜能 2—6：5/7.5/10/12.5/15%）；围猎状态与出站事实由调用方断言。",
    name: "潜能觉醒：掠冰 · impact",
    target: "self",
  },
}

/** 丽娜（完美侍奉）：每个潜能升级档的自身穿透率。 */
const alexandrinaPerfectService: Supplement = {
  kind: "option",
  supplementId: "nanoka:alexandrina:perfect-service-pierce",
  source:
    "nanoka-integrated@3.2 agents/1211 /potentialDetail/121101—121105/desc",
  catalogEntityId: "agents:alexandrina",
  optionId: "nanoka:agents:alexandrina:potential:perfect-service-pierce",
  supportedRanks: "潜能 2—6",
  computationTarget: "catalog option on the mapped agent entity",
  evidence: alexandrinaPotentialEvidence,
  verification:
    "Nanoka potentialDetail 121101—121105（level 2—6）均写“穿透率提升1.6%”，即每个潜能升级档 +1.6 个百分点；按来源累计，level 2—6 为 1.6/3.2/4.8/6.4/8.0 个百分点。该常驻穿透率与 [核心被动：迷你毁灭拍档] 的存在条件无关，因此与核心存在期间才生效的攻击/防御转化分开登记，不合并为完整选项；转化读取值仍来自持有者显式输入。",
  rule: {
    effectId: "agent:1211:nanoka:perfect-service-pierce:mindscape:0",
    identity: { kind: "agent", entityId: "1211" },
    section: "潜能觉醒：完美侍奉",
    config: potentialFrom(2),
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: { 2: 0.016, 3: 0.032, 4: 0.048, 5: 0.064, 6: 0.08 },
      },
    },
    scope: "entity",
    when: { kind: "all", conditions: [] },
    operation: {
      kind: "stat-adjustment",
      stat: "penetrationRatio",
      stage: "direct",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { potentialLevels: [2, 3, 4, 5, 6] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "潜能升级档累计的自身穿透率提升（1.6/3.2/4.8/6.4/8.0 个百分点）；与核心被动存在期间的攻击/防御转化分开选择。",
    name: "潜能觉醒：完美侍奉 · penRate",
    target: "self",
  },
}

/** 艾莲：核心被动 100% 暴伤的普通分支受益范围（仅冰渊潜袭与急冻修剪法）。 */
const ellenOrdinaryBladeDance: Supplement = {
  kind: "option-variant",
  supplementId: "nanoka:ellen:ordinary-blade-dance",
  source: "nanoka-integrated@3.2 agents/1191 /passive/level/1191507/desc/0",
  optionId: "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg",
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  evidence: ellenOrdinaryEvidence,
  verification:
    "Nanoka 普通分支（/passive/level/1191507，potential [0]）明确：核心被动 100% 暴伤只作用于[冲刺攻击：冰渊潜袭]蓄力剪击与[普通攻击：急冻修剪法]；潜能分支（1191508—1191514）才扩展到[连携技]、[终结技]、[普通攻击：霜锋]和[普通攻击：冰刃浪]。本变体在潜能 0 提供限制在冰渊潜袭/急冻修剪法目标的 100% 暴伤，与潜能分支记录互斥；只开放已核实核心 7。",
  rule: {
    effectId: "agent:1191:nanoka:ordinary-blade-dance:mindscape:0",
    identity: { kind: "agent", entityId: "1191" },
    section: "核心被动：凌牙厉齿（普通分支）",
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
          right: literal("count", 7),
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
          right: literal("count", 0),
        },
      ],
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 1 },
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: {
      coreSkillLevels: [7],
      potentialLevels: [0],
    },
    inputs: [],
    applicability: {},
    conditionDescription:
      "普通分支（潜能未开启）：[冲刺攻击：冰渊潜袭]蓄力剪击或消耗[急冻充能]的[普通攻击：急冻修剪法]暴击伤害提升 100%；只有已核实核心等级 7。",
    name: "核心被动：凌牙厉齿（普通分支） · critDmg",
    target: "self",
  },
}
/** 悠真：核心被动 25% 暴率的普通分支受益范围（仅飞弦·斩）。 */
const harumasaOrdinaryCritRate: Supplement = {
  kind: "option-variant",
  supplementId: "nanoka:harumasa:ordinary-crit-rate",
  source: "nanoka-integrated@3.2 agents/1201 /passive/level/1201507/desc/0",
  optionId: "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate",
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  evidence: harumasaOrdinaryEvidence,
  verification:
    "Nanoka 普通分支（/passive/level/1201507，potential [0]）只列[冲刺攻击：飞弦·斩]的暴击率提升 25%；潜能分支（1201508—1201514）才扩展到[逐雷]和[终结技]。本变体在潜能 0 提供只作用于飞弦斩的 25% 暴率，与潜能分支记录互斥；只开放已核实核心 7。",
  rule: {
    effectId: "agent:1201:nanoka:ordinary-crit-rate:mindscape:0",
    identity: { kind: "agent", entityId: "1201" },
    section: "核心被动：破晓（普通分支）",
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
          right: literal("count", 7),
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
          right: literal("count", 0),
        },
      ],
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.25 },
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { coreSkillLevels: [7], potentialLevels: [0] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "普通分支（潜能未开启）：[冲刺攻击：飞弦·斩]暴击率提升 25%；只有已核实核心等级 7。",
    name: "核心被动：破晓（普通分支） · critRate",
    target: "self",
  },
}

/** 悠真：锋芒每层 12% 暴伤的普通分支受益范围（仅飞弦·斩）。 */
const harumasaOrdinaryCritDmg: Supplement = {
  kind: "option-variant",
  supplementId: "nanoka:harumasa:ordinary-crit-dmg",
  source: "nanoka-integrated@3.2 agents/1201 /passive/level/1201507/desc/0",
  optionId: "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy",
  supportedRanks: "core 7；潜能 0；层数 1—6",
  computationTarget: "catalog option variant",
  evidence: harumasaOrdinaryEvidence,
  verification:
    "Nanoka 普通分支（/passive/level/1201507，potential [0]）只把[锋芒]每层 12% 暴伤作用于[冲刺攻击：飞弦·斩]；潜能分支（1201508—1201514）才扩展到[逐雷]和[终结技]。本变体在潜能 0 提供只作用于飞弦斩的每层 12% 暴伤，真实[锋芒]层数上限 6 由调用方按实际层数选择，与潜能分支记录互斥；只开放已核实核心 7。",
  rule: {
    effectId: "agent:1201:nanoka:ordinary-crit-dmg:mindscape:0",
    identity: { kind: "agent", entityId: "1201" },
    section: "核心被动：破晓（普通分支）",
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
          right: literal("count", 7),
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
          right: literal("count", 0),
        },
      ],
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.12 },
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 6,
  },
  variant: {
    configuration: { coreSkillLevels: [7], potentialLevels: [0] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "普通分支（潜能未开启）：每层[锋芒]使[冲刺攻击：飞弦·斩]暴击伤害提升 12%，层数按真实层数选择（最多 6 层）；只有已核实核心等级 7。",
    name: "核心被动：破晓（普通分支） · critDmg",
    target: "self",
  },
}
export const SUPPLEMENTS: readonly Supplement[] = [
  nekomataOrdinaryDmgBonus,
  nekomataOrdinaryShow,
  redAxis,
  identityInflectionBoundary,
  soldier11FlameProwess,
  lycaonIceHunt,
  alexandrinaPerfectService,
  ellenOrdinaryBladeDance,
  harumasaOrdinaryCritRate,
  harumasaOrdinaryCritDmg,
  shockstarDiscoTwoPieceImpact,
  soulRockTwoPieceDefense,
  protoPunkTwoPieceShieldBoundary,
  kingOfTheSummitTwoPieceDazeBoundary,
]

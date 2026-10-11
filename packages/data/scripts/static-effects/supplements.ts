import type {
  AnyParameter,
  Condition,
  ContributionOperation,
  CoreSkillLevel,
  EffectId,
  MindscapeRank,
  PotentialLevel,
  SkillCategory,
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
  /**
   * 补充规则的受益者；缺省 holder。全队受益的条款（如残响Ⅰ型 EX 后
   * 全队冲击力）声明 team，与目录选项 target 同口径。
   */
  readonly beneficiary?: { readonly kind: "holder" | "team" }
}

export interface SupplementVariantSpec {
  readonly configuration: {
    /** 影画门槛（如影画 1 起解锁的天赋条款）；与规则的 mindscapeRank 配置条件一致。 */
    readonly minimumMindscape?: MindscapeRank
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
  /**
   * 重复补充防护：固定来源同实体若出现这些 stat 的机器记录，说明该条款
   * 已有真实编码（或上游补充了编码），补充并存会造成重复贡献；生成期
   * 拒绝并要求重新核对，不静默叠加。仅作用于固定来源实体上的补充。
   */
  readonly conflictingSourceStats?: readonly string[]
  /**
   * 定向重复补充防护：stat 级名单过粗（实体上存在同 stat 的其他条款）时，
   * 以同实体 stat 家族 + raw/normalized 记录的 skillTargets 命中登记分类或
   * 具名子分类（锚点）定位同一条款——固定来源同实体出现 stat 命中且
   * skillTargets 命中登记锚点的机器记录即拒绝生成。不限定来源 scope 字段。
   */
  readonly conflictingSourceRecords?: {
    readonly stats: readonly string[]
    readonly skillTargetCategories?: readonly string[]
    readonly skillTargetSubcategoryIds?: readonly string[]
  }
  /**
   * 补充条款的受益范围依赖固定来源没有的精确招式身份（如珂蕾妲潜能强化
   * 普攻第二段）时，登记本项目采用的具名技能目标（upstreamId 为 null，
   * 不是来源技能）：技能生成器把它绑定到声明动作的 skillTargetIds，消费
   * 端以该目标显式选中。固定来源出现同 ID 的真实目标即拒绝生成。
   */
  readonly skillTarget?: {
    readonly targetId: string
    readonly agentEntityId: string
    readonly category: SkillCategory
    readonly name: string
  }
  /**
   * 同一来源绑定内的互斥完整状态组（复用公开类型既有的
   * StaticCatalogOption.exclusiveGroup 与 supplied activation 的
   * exclusiveGroup）：同组选项在目录入口与直接规则入口都只能选择一条。
   * 用于把同一机制的互斥档位（如索魂影眸的有效魂锁层数）表达为完整的
   * 单选状态，不引入跨选项推理或时间线。
   */
  readonly exclusiveGroup?: string
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

/** 音擎五档精炼天赋证据：w-engines/<id>/details.zh.json 的 /talents/1—5/desc。 */
const wengineTalentEvidence = (
  entityId: string,
  sha256: string,
): readonly SupplementEvidenceReference[] =>
  ([1, 2, 3, 4, 5] as const).map((tier) => ({
    path: `w-engines/${entityId}/details.zh.json`,
    pointer: `/talents/${tier}/desc`,
    sha256,
  }))

/** 按精炼取值的比例参数表。 */
const refinementRatio = (
  values: readonly [number, number, number, number, number],
) =>
  ({
    kind: "by-rank",
    rank: "refinement",
    unit: "ratio",
    values: {
      1: values[0],
      2: values[1],
      3: values[2],
      4: values[3],
      5: values[4],
    },
  }) as const

/** 战斗内百分比冲击力条款的统一操作：impact 的 final-percentage。 */
const impactFinalPercentage = (name: string) =>
  ({
    kind: "stat-adjustment",
    stat: "impact",
    stage: "final-percentage",
    value: { kind: "parameter", unit: "ratio", name },
  }) as const

const wengineSupplement = (entityId: string, slug: string) => ({
  supplementId: `nanoka:w-engines:${entityId}:${slug}`,
  optionId: `nanoka:w-engines:${entityId}:${slug}`,
  effectId: `w-engine:${entityId}:nanoka:${slug}` as EffectId,
})

/** 冲击力条款可能出现的固定来源 stat 名；出现即触发重复补充防护。 */
const impactSourceStats = [
  "impact",
  "inCombatImpactPercent",
  "externalImpactPercent",
] as const

/**
 * 「恒等式」-本格（12013）：受击后装备者防御力提升（M19）。固定来源五档块
 * 只有 note、effects 为空；音擎高级属性（randProperty 防御力）是常驻面板
 * 词条，不能替代本条件被动。
 */
const identityBaseDefenseOnHit: Supplement = {
  kind: "option",
  ...wengineSupplement("12013", "defense-on-hit"),
  source: "nanoka-integrated@3.2 w-engines/12013 /talents/1—5/desc",
  catalogEntityId: "w-engines:Identity_Base",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: ["def", "inCombatDefPercent", "externalDefPercent"],
  evidence: wengineTalentEvidence(
    "12013",
    "71351b0c818f362454bff43a4d4fed98fc25120648eee884ab2e88a4b63a1415",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：受到敌方攻击时，装备者的防御力提升 20/23/26/29/32%，持续 8 秒；固定来源 fac62407 五档精炼块的 note 与此同文但 effects 为空（无机器记录）。本被动是受击后的条件增益，与音擎高级属性（randProperty 为“防御力”的常驻面板词条）互不替代，也不把它并入局外初始阶段：按 inCombatDefPercent 同类条款的既有口径进入 defense 的 final-percentage。受击触发与 8 秒持续由调用方显式选择断言，不模拟时间线。",
  rule: {
    effectId: wengineSupplement("12013", "defense-on-hit").effectId,
    identity: { kind: "w-engine", entityId: "12013" },
    section: "沉击",
    config: { kind: "constant", value: true },
    parameters: { amount: refinementRatio([0.2, 0.23, 0.26, 0.29, 0.32]) },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "defense",
      stage: "final-percentage",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "受到敌方攻击时，装备者的防御力提升（按精炼 20/23/26/29/32%），持续8秒；受击状态由调用方显式选择断言。音擎高级属性的常驻防御力不替代本被动。",
    name: "沉击 · def",
    target: "self",
  },
}

/**
 * 拘缚者（14114）：攻击命中后每层[普通攻击]伤害提升（M20，本批只补伤害
 * 条款；同句的失衡值条款不在本选项内，覆盖声明留待后续批次统一处理）。
 */
const restrainerBasicAttackDamageStacks: Supplement = {
  kind: "option",
  ...wengineSupplement("14114", "basic-attack-damage-stacks"),
  source: "nanoka-integrated@3.2 w-engines/14114 /talents/1—5/desc",
  catalogEntityId: "w-engines:Weapon_S_1141",
  supportedRanks: "refinement 1—5；层数 0—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: ["dmgBonus", "skillDmgBonus"],
  evidence: wengineTalentEvidence(
    "14114",
    "477d278159a7473afdaaadcced62eea6e95c74c7ad6ea2e0b6140395ca10621f",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：攻击命中敌人时，[普通攻击]造成的伤害和失衡值提升 6/7.5/9/10.5/12%，最多叠加 5 层，持续 8 秒，同一招式内最多触发一次，每层效果单独结算持续时间；固定来源 fac62407 五档块只有 note、effects 为空。本选项只接入伤害条款：攻击命中是取得层数的触发条件（由调用方按有效层数显式选择断言，同一招式限一次与逐层 8 秒持续不模拟）。受益范围是装备者造成的普通攻击伤害：伤害种类为直伤 regular/sheer/sharpen（部分角色的普通攻击存在贯穿/锐化段，不收缩为 regular），命中身份沿用目录已建立的普攻受益分类编码——原始 skillCategory 为 basic，或命中携带目录归一的 zzz-hp:category:basic 标签（含扳机“普通攻击：协奏狙杀”这类本体为追加攻击、但目录按已核实 skillTarget 标明 category basic/countsAsFollowUp 的复合身份；按评审 R02 修复，与固定来源既有普攻规则同一分类口径）。不把任意追加攻击当普攻：纯追加身份（无 basic 分类事实）不受益；不改全局 hit.skillCategory 的原值精确比较语义。失衡值条款不属于当前伤害计算承诺，本批不实现，留待后续批次统一登记覆盖说明，不能据此宣称该音擎全部条款完整。",
  rule: {
    effectId: wengineSupplement("14114", "basic-attack-damage-stacks").effectId,
    identity: { kind: "w-engine", entityId: "14114" },
    section: "束缚枷锁",
    config: { kind: "constant", value: true },
    parameters: {
      amount: refinementRatio([0.06, 0.075, 0.09, 0.105, 0.12]),
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
          // 原始 basic 分类，或目录归一的普攻分类标签（skillTargets 展开的
          // zzz-hp:category:basic，含本体为追加攻击的普攻复合身份）。
          kind: "any",
          conditions: [
            { kind: "one-of", fact: "hit.skillCategory", values: ["basic"] },
            {
              kind: "one-of",
              fact: "hit.skillTag",
              values: ["zzz-hp:category:basic"],
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
    maximumLayers: 5,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "攻击命中敌人时，[普通攻击]造成的伤害提升（按精炼每层 6/7.5/9/10.5/12%），最多叠加5层，每层持续8秒、同一招式内最多触发一次；有效层数由调用方显式选择，0 层表示关闭。受益范围为普通攻击直伤（原始 basic 分类或目录归一的普攻分类标签，含本体为追加攻击的普攻复合身份；纯追加身份不受益）。本选项只含伤害条款，[普通攻击]造成的失衡值提升不在本选项内。",
    name: "束缚枷锁 · skillDmgBonus",
    target: "self",
  },
}

/** 「残响」-Ⅰ型（12004）：发动[强化特殊技]后全队冲击力提升。 */
const reverbMarkITeamImpactAfterEx: Supplement = {
  kind: "option",
  ...wengineSupplement("12004", "team-impact-after-ex"),
  source: "nanoka-integrated@3.2 w-engines/12004 /talents/1—5/desc",
  catalogEntityId: "w-engines:Reverb_Mark_I",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "12004",
    "064c40023d0c399a94ae32ad5b5c404b4208fb40e3e9a4fcb3c1f1ad6488316e",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：发动[强化特殊技]时，全队角色冲击力提升 8/9/10/11/12%，持续 10 秒，20 秒内最多触发一次，同名被动效果之间不可叠加；固定来源 fac62407 五档块只有 note、effects 为空。受益对象是全队（与同家族「残响」-Ⅲ型既有 inCombatAtkPercent 记录的 team 编码同构），规则 beneficiary=team、目录 target=team；发动[强化特殊技]的触发事实、10 秒持续、20 秒间隔与同名被动不可叠加由调用方显式选择断言，不模拟时间线或唯一性。",
  rule: {
    effectId: wengineSupplement("12004", "team-impact-after-ex").effectId,
    identity: { kind: "w-engine", entityId: "12004" },
    section: "潮汐",
    config: { kind: "constant", value: true },
    parameters: { amount: refinementRatio([0.08, 0.09, 0.1, 0.11, 0.12]) },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 1,
    beneficiary: { kind: "team" },
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "发动[强化特殊技]时，全队角色冲击力提升（按精炼 8/9/10/11/12%），持续10秒，20秒内最多触发一次，同名被动效果之间不可叠加；触发状态由调用方显式选择断言。",
    name: "潮汐 · impact",
    target: "team",
  },
}

/** 「湍流」-斧型（12009）：接战状态下成为当前操作角色时装备者冲击力提升。 */
const vortexHatchetImpactAsActive: Supplement = {
  kind: "option",
  ...wengineSupplement("12009", "impact-as-active-character"),
  source: "nanoka-integrated@3.2 w-engines/12009 /talents/1—5/desc",
  catalogEntityId: "w-engines:Vortex_Hatchet",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "12009",
    "5ae75e57e305582bf7b5b5a8ff824045dcad4cce43cf50646d51cb26ceefb758",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：成为接战状态下的当前操作角色时，装备者的冲击力提升 9/10/11/12/13%，持续 10 秒，20 秒内最多触发一次；固定来源 fac62407 五档块只有 note、effects 为空。成为当前操作角色是触发条件，由调用方显式选择断言；冲击力按既有战斗内百分比条款进入 impact 的 final-percentage。",
  rule: {
    effectId: wengineSupplement("12009", "impact-as-active-character").effectId,
    identity: { kind: "w-engine", entityId: "12009" },
    section: "疾潮",
    config: { kind: "constant", value: true },
    parameters: { amount: refinementRatio([0.09, 0.1, 0.11, 0.12, 0.13]) },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "成为接战状态下的当前操作角色时，装备者的冲击力提升（按精炼 9/10/11/12/13%），持续10秒，20秒内最多触发一次；状态与触发由调用方显式选择断言。",
    name: "疾潮 · impact",
    target: "self",
  },
}

/**
 * 人为刀俎（13005）：每 10 点能量取得 1 层的冲击力提升。有效层数必须是
 * 调用方显式声明的保留层数，不以当前能量除 10 推导。
 */
const steamOvenImpactPerRetainedLayer: Supplement = {
  kind: "option",
  ...wengineSupplement("13005", "impact-per-retained-layer"),
  source: "nanoka-integrated@3.2 w-engines/13005 /talents/1—5/desc",
  catalogEntityId: "w-engines:Steam_Oven",
  supportedRanks: "refinement 1—5；层数 0—8",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "13005",
    "0eef324292cba51d5f2a2e31984fcec31c78f846db6f9528685bac9ddec1cb4a",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：每拥有10点能量值，装备者的冲击力提升 2/2.3/2.6/2.9/3.2%，最多叠加 8 层，能量消耗后该增益效果仍然保留，持续 8 秒，每层效果单独结算持续时间；固定来源 fac62407 五档块只有 note、effects 为空。取得与保留层数由调用方按实际有效层数显式选择（0 层表示关闭）：不实现“当前能量 ÷ 10”的自动推导，能量消耗后的保留与每层独立 8 秒持续也不模拟。",
  rule: {
    effectId: wengineSupplement("13005", "impact-per-retained-layer").effectId,
    identity: { kind: "w-engine", entityId: "13005" },
    section: "浓厚汤底",
    config: { kind: "constant", value: true },
    parameters: {
      amount: refinementRatio([0.02, 0.023, 0.026, 0.029, 0.032]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 8,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "每拥有10点能量值，装备者的冲击力提升（按精炼每层 2/2.3/2.6/2.9/3.2%），最多叠加8层，能量消耗后保留8秒；有效保留层数由调用方显式选择，不从当前能量值推导。",
    name: "浓厚汤底 · impact",
    target: "self",
  },
}

/** 正版变身器（13007）：受击后装备者冲击力提升；已有的生命值上限条款不动。 */
const originalTransmorpherImpactOnHit: Supplement = {
  kind: "option",
  ...wengineSupplement("13007", "impact-on-hit"),
  source: "nanoka-integrated@3.2 w-engines/13007 /talents/1—5/desc",
  catalogEntityId: "w-engines:Original_Transmorpher",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "13007",
    "a005e0ced36c0cd4236900b57ece1a64c6b2b2157358ea25d4b8c79ecf1e94fe",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：生命值上限提升 8—12.5%（固定来源已有 inCombatHpPercent 机器记录，本批不重复加入）；受到敌方攻击时，装备者的冲击力提升 10/11.5/13/14.5/16%，持续 12 秒——该条款在固定来源没有任何机器记录。受击触发与 12 秒持续由调用方显式选择断言；冲击力进入 impact 的 final-percentage。",
  rule: {
    effectId: wengineSupplement("13007", "impact-on-hit").effectId,
    identity: { kind: "w-engine", entityId: "13007" },
    section: "骑士飞踢",
    config: { kind: "constant", value: true },
    parameters: {
      amount: refinementRatio([0.1, 0.115, 0.13, 0.145, 0.16]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "受到敌方攻击时，装备者的冲击力提升（按精炼 10/11.5/13/14.5/16%），持续12秒；受击状态由调用方显式选择断言。已有的生命值上限提升条款为独立选项，不重复加入。",
    name: "骑士飞踢 · impact",
    target: "self",
  },
}

/** 燃狱齿轮（14110）：发动[强化特殊技]后每层冲击力提升；已有的回能条款不动。 */
const hellfireGearsImpactPerStack: Supplement = {
  kind: "option",
  ...wengineSupplement("14110", "impact-per-stack-after-ex"),
  source: "nanoka-integrated@3.2 w-engines/14110 /talents/1—5/desc",
  catalogEntityId: "w-engines:Hellfire_Gears",
  supportedRanks: "refinement 1—5；层数 0—2",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "14110",
    "ff9ccb3fa3763e4d5ddd7b828574c14f55dfca722acd8d03a7f778ea7bcdca8b",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：位于后场时能量自动回复提升 0.6—1.2 点/秒（批次 01 已按固定回能纠正，本批不重复）；发动[强化特殊技]时，装备者的冲击力提升 10/12.5/15/17.5/20%，最多叠加 2 层，持续 10 秒，每层效果单独结算持续时间——该条款在固定来源没有任何机器记录。发动[强化特殊技]的触发由调用方按有效层数显式选择断言，逐层 10 秒持续不模拟。",
  rule: {
    effectId: wengineSupplement("14110", "impact-per-stack-after-ex").effectId,
    identity: { kind: "w-engine", entityId: "14110" },
    section: "热血施工",
    config: { kind: "constant", value: true },
    parameters: {
      amount: refinementRatio([0.1, 0.125, 0.15, 0.175, 0.2]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 2,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "发动[强化特殊技]时，装备者的冲击力提升（按精炼每层 10/12.5/15/17.5/20%），最多叠加2层，每层持续10秒；有效层数由调用方显式选择。已有的后场回能条款为独立选项。",
    name: "热血施工 · impact",
    target: "self",
  },
}

/** 焰心桂冠（14116）：快速/极限支援后装备者冲击力提升；已有[萎靡]规则不混入。 */
const blazingLaurelImpactAfterAssist: Supplement = {
  kind: "option",
  ...wengineSupplement("14116", "impact-after-assist"),
  source: "nanoka-integrated@3.2 w-engines/14116 /talents/1—5/desc",
  catalogEntityId: "w-engines:Blazing_Laurel",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "14116",
    "0b2ae556d5d4547007bbc24f0b2f6a1eaf5623b7fde691b070fd3f03099fc21a",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：发动[快速支援]或[极限支援]时，装备者的冲击力提升 25/28.75/32.5/36.25/40%，持续 8 秒；同句的[萎靡]暴击伤害/增伤规则已由固定来源机器记录覆盖（critDmg 精炼 1—4、dmgBonus 精炼 5），冲击力条款则没有任何机器记录，固定来源 note 也未包含该句。本选项只接入冲击力条款，不与[萎靡]层数或其伤害规则绑定；快速/极限支援触发与 8 秒持续由调用方显式选择断言。",
  rule: {
    effectId: wengineSupplement("14116", "impact-after-assist").effectId,
    identity: { kind: "w-engine", entityId: "14116" },
    section: "流动之火",
    config: { kind: "constant", value: true },
    parameters: {
      amount: refinementRatio([0.25, 0.2875, 0.325, 0.3625, 0.4]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "发动[快速支援]或[极限支援]时，装备者的冲击力提升（按精炼 25/28.75/32.5/36.25/40%），持续8秒；触发状态由调用方显式选择断言。已有的[萎靡]暴击伤害/增伤规则为独立选项，不受本选项影响。",
    name: "流动之火 · impact",
    target: "self",
  },
}

/**
 * 玉壶青冰（14125）：每层[茶劲]的装备者冲击力提升。获得[茶劲]时 ≥15 层
 * 的全队增伤是独立的 10 秒状态（已有机器记录），不与当前[茶劲]层数绑定。
 */
const iceJadeTeapotImpactPerTeaLayer: Supplement = {
  kind: "option",
  ...wengineSupplement("14125", "impact-per-tea-layer"),
  source: "nanoka-integrated@3.2 w-engines/14125 /talents/1—5/desc",
  catalogEntityId: "w-engines:Ice-Jade_Teapot",
  supportedRanks: "refinement 1—5；层数 0—30",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "14125",
    "428ba7f98360c8c9094c3b79827d093798e2058ce793667346433447e82f8130",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：[普通攻击]命中敌人时获得1层[茶劲]，每层[茶劲]使装备者的冲击力提升 0.7/0.88/1.05/1.22/1.4%，最多叠加 30 层，持续 8 秒，每层效果单独结算持续时间；固定来源只编码了后半句的全队增伤（获得[茶劲]时若 ≥15 层，全队造成的伤害提升 20—32%、独立 10 秒状态、同名被动不可叠加），[茶劲]冲击力条款没有机器记录。本选项只按有效[茶劲]层数提供装备者冲击力，不把既有全队增伤选项与本层状态强制绑定（≥15 层触发与 10 秒持续由该独立选项自身的显式选择表达）；每层 8 秒独立持续不模拟。",
  rule: {
    effectId: wengineSupplement("14125", "impact-per-tea-layer").effectId,
    identity: { kind: "w-engine", entityId: "14125" },
    section: "泠泠连奏",
    config: { kind: "constant", value: true },
    parameters: {
      amount: refinementRatio([0.007, 0.0088, 0.0105, 0.0122, 0.014]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 30,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "[普通攻击]命中敌人时获得1层[茶劲]，每层[茶劲]使装备者的冲击力提升（按精炼 0.7/0.88/1.05/1.22/1.4%），最多叠加30层，每层持续8秒；有效层数由调用方显式选择。获得[茶劲]时≥15层触发的全队增伤是独立的10秒状态，由既有选项单独表达，不与当前[茶劲]层数绑死。",
    name: "泠泠连奏 · impact",
    target: "self",
  },
}

/**
 * 索魂影眸（14136）：有效[魂锁]层数的三个互斥完整档位（评审 R01 修复）。
 * 取得层数需后台电属性追加攻击触发原减防效果；状态有效后的受益不以本次
 * 命中元素或分类作条件。源文只规定同一[魂锁]状态的每层加成与叠满 3 层的
 * 一次性附加，没有独立持续的“满层额外”状态，因此不能拆成可独立选取的
 * 部分贡献：调用方声明当前有效层数，选择恰好一个完整档位（0/1 开关），
 * 目录与直接规则入口都拒绝同组混选。满 3 层档位一次给出完整加成
 * （每层×3 + 满层附加），不要求追踪叠层或 12 秒计时。
 */
const spectralGazeSoulChainTierData = [
  {
    tier: 1,
    // 每层 4/4.6/5.2/5.8/6.4% × 1。
    values: [0.04, 0.046, 0.052, 0.058, 0.064] as const,
  },
  {
    tier: 2,
    // 每层值 × 2：8/9.2/10.4/11.6/12.8%。
    values: [0.08, 0.092, 0.104, 0.116, 0.128] as const,
  },
  {
    tier: 3,
    // 每层值 × 3 + 满层附加 8/9.2/10.4/11.6/12.8% = 20/23/26/29/32%。
    values: [0.2, 0.23, 0.26, 0.29, 0.32] as const,
  },
] as const

const spectralGazeSoulChainTiers: readonly Supplement[] =
  spectralGazeSoulChainTierData.map(
    (tier): Supplement => ({
      kind: "option",
      ...wengineSupplement("14136", `soul-chain-${tier.tier}-layer`),
      source: "nanoka-integrated@3.2 w-engines/14136 /talents/1—5/desc",
      catalogEntityId: "w-engines:Spectral_Gaze",
      supportedRanks: `refinement 1—5；有效[魂锁] ${tier.tier} 层完整档位（0/1）`,
      computationTarget: "catalog option on the mapped w-engine entity",
      conflictingSourceStats: impactSourceStats,
      exclusiveGroup: "spectral-gaze:soul-chain-effective-layers",
      evidence: wengineTalentEvidence(
        "14136",
        "37e8a83a0bccda551819a1d5687de962d69fed6cfc0252e3861d370fff3e28bd",
      ),
      verification:
        "Nanoka 五档天赋逐档核实：装备者的[追加攻击]命中敌人并造成电属性伤害时，目标的防御力降低 25—40%（固定来源已有 reduceDefense 机器记录覆盖）；该效果触发时如果自身不是当前操作中的角色，装备者获得1层[魂锁]，最多叠加3层，同一招式内最多触发一次；每层[魂锁]使装备者的冲击力提升 4/4.6/5.2/5.8/6.4%，持续 12 秒，每层效果单独结算持续时间，[魂锁]层数叠满时额外给装备者的冲击力提升 8/9.2/10.4/11.6/12.8%。[魂锁]条款在固定来源没有任何机器记录，note 也未包含该句。满层附加没有独立持续时间或另行触发的状态证据，与每层条款同属一个[魂锁]状态：本批按评审 R01 修复把有效层数表达为 1/2/3 层三个互斥完整档位（同组 exclusiveGroup，同绑定只能选择一个档位，未选或 0 层表示关闭），档位数值为该层数下的完整加成——1 层 4—6.4%、2 层为每层值×2（8—12.8%）、3 层为每层值×3+满层附加（20—32%）。取得层数的条件（后台电属性追加攻击触发原减防）由调用方按当前有效层数选择档位断言，不作为受益条件：状态有效后冲击力提升不以本次命中的元素或技能分类筛选；逐层 12 秒独立持续不模拟，不追踪叠层历史。",
      rule: {
        effectId: wengineSupplement("14136", `soul-chain-${tier.tier}-layer`)
          .effectId,
        identity: { kind: "w-engine", entityId: "14136" },
        section: "捕风寻踪",
        config: { kind: "constant", value: true },
        parameters: { amount: refinementRatio(tier.values) },
        scope: "entity",
        when: { kind: "constant", value: true },
        operation: impactFinalPercentage("amount"),
        maximumLayers: 1,
      },
      variant: {
        configuration: { refinements: [1, 2, 3, 4, 5] },
        inputs: [],
        applicability: {},
        conditionDescription:
          tier.tier === 3
            ? "当前有 3 层有效[魂锁]（叠满）时，装备者的冲击力提升 20/23/26/29/32%（按精炼取值，即每层 4/4.6/5.2/5.8/6.4% × 3 层 + 叠满额外 8/9.2/10.4/11.6/12.8%，一次完整计算）；选择本档位即断言当前有效魂锁恰为 3 层，与 1/2 层档位互斥，0 层表示关闭。取得条件（后台电属性追加攻击触发减防）不作受益条件，不以命中元素或分类筛选。"
            : `当前有 ${tier.tier} 层有效[魂锁]时，装备者的冲击力提升 ${[null, "4/4.6/5.2/5.8/6.4", "8/9.2/10.4/11.6/12.8"][tier.tier]}%（按精炼取值，即每层值 × ${tier.tier} 层的完整档位）；选择本档位即断言当前有效魂锁恰为 ${tier.tier} 层，与其他档位互斥，0 层表示关闭。取得条件（后台电属性追加攻击触发减防）不作受益条件，不以命中元素或分类筛选。`,
        name: `捕风寻踪 · soulChain${tier.tier}Layer`,
        target: "self",
      },
    }),
  )

/**
 * 首席跟班（14157）：装备者冲击力提升固定点数。固定点数与百分比冲击力
 * 区分明确；可被既有冲击力读取链消费，不宣称实现最终失衡值。
 */
const headLackeyFixedImpactPoints: Supplement = {
  kind: "option",
  ...wengineSupplement("14157", "fixed-impact-points"),
  source: "nanoka-integrated@3.2 w-engines/14157 /talents/1—5/desc",
  catalogEntityId: "w-engines:Head_Lackey",
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  conflictingSourceStats: impactSourceStats,
  evidence: wengineTalentEvidence(
    "14157",
    "5f0852373824739812d5e4fed0f362d80638bddea1a868892d08373710e4066c",
  ),
  verification:
    "Nanoka 五档天赋逐档核实：装备者的冲击力提升 30/33/36/39/42 点（固定点数，不是百分比）；固定来源已编码同句的火抗无视（resPen）、非操作中回能（批次 01 已纠正的固定回能）与强化特殊技触发的全队增伤，唯独冲击力点数没有机器记录。按固定来源 atk/def 点数的既有口径进入 impact 的 final-fixed：不随基础冲击力缩放，也不写成百分比；基础冲击力改变时固定增量不变。冲击力进入面板后可供既有读取链消费（如冲击力转化），本选项不实现最终失衡值。",
  rule: {
    effectId: wengineSupplement("14157", "fixed-impact-points").effectId,
    identity: { kind: "w-engine", entityId: "14157" },
    section: "天才的扈从",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "impact-points",
        values: { 1: 30, 2: 33, 3: 36, 4: 39, 5: 42 },
      },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "impact",
      stage: "final-fixed",
      value: { kind: "parameter", unit: "impact-points", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "装备者的冲击力提升固定点数（按精炼 30/33/36/39/42 点）；与百分比冲击力分别计算，不随基础冲击力缩放，可供既有冲击力读取链消费，不实现最终失衡值。",
    name: "天才的扈从 · impact",
    target: "self",
  },
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

/**
 * 妮可（M01，批次 03）：影画 1 的[强化特殊技]伤害提升。固定来源 mindscape 1
 * 没有任何机器记录；受益范围是妮可本人的强化特殊技直伤（蓄力、炮击、能量场
 * 三个真实动作均携带 all-special-ms0fcqv7 目标），普通特殊技与其他招式不受益。
 * 同句的异常积蓄提升与能量场持续时间延长不在伤害计算范围，覆盖登记留待批次 10。
 */
const nicoleMindscape1ExDamage: Supplement = {
  kind: "option",
  supplementId: "nanoka:nicole:mindscape-1-ex-damage",
  source: "nanoka-integrated@3.2 agents/1031 /talent/1/desc",
  catalogEntityId: "agents:nicole",
  optionId: "nanoka:agents:nicole:mindscape-1-ex-damage",
  supportedRanks: "影画 1 及以上",
  computationTarget: "catalog option on the mapped agent entity",
  conflictingSourceRecords: {
    stats: ["skillDmgBonus", "dmgBonus"],
    skillTargetCategories: ["special"],
  },
  evidence: [
    {
      path: "agents/1031/details.zh.json",
      pointer: "/talent/1/desc",
      sha256:
        "f648a8ff0d98f18d9348c7b10c79d234bf4d52d8d6ac0d92e596822a9016aaf8",
    },
  ],
  verification:
    "Nanoka 影画 1（agents/1031/details.zh.json 的 /talent/1/desc）确认：[强化特殊技]造成的伤害和累积的属性异常积蓄值提升 16%；发动时每多蓄力 0.1 秒，能量场持续时间提升 0.15 秒。固定 ZZZ-HP 来源的 mindscape 1 没有任何机器记录，按补充来源在既有 agents:nicole 实体新增选项，只接入伤害部分（+16%）：受益范围是妮可本人的强化特殊技直伤——目录按强化特殊技目标（all-special-ms0fcqv7，与固定来源既有强化特殊技记录同一锚点）与直伤种类匹配，真实动作映射中属于该 EX 的蓄力（action:0021）、炮击（action:0022）、能量场（action:0023）命中均获得同一加成，普通特殊技（action:0020，无该目标）、其他招式与队友不受益。异常积蓄提升与能量场持续时间延长不属于当前伤害计算的最终输出，不在本选项表达，覆盖登记留待批次 10；M0 不解锁，选择本选项即断言影画 1 及以上。",
  rule: {
    effectId: "agent:1031:nanoka:mindscape-1-ex-damage:mindscape:1",
    identity: { kind: "agent", entityId: "1031" },
    section: "影画1",
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: literal("count", 1),
    },
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.16 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [...directKinds, "sharpen"],
        },
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
    configuration: { minimumMindscape: 1 },
    inputs: [],
    applicability: {},
    conditionDescription:
      "[强化特殊技]造成的伤害提升16%（影画1及以上）；作用于妮可本人的强化特殊技直伤（蓄力、炮击、能量场），普通特殊技、其他招式与队友不受益。同句的异常积蓄提升与能量场持续时间延长不在伤害计算范围。",
    name: "影画1 · dmgBonus",
    target: "self",
  },
}

/**
 * 青衣（M17，批次 03）：[普通攻击：醉花月云转]消耗[闪络电压]中超过 75% 部分
 * 的每 1% 使本次招式伤害 +1%。数值由调用方显式输入本次实际消耗的电压比例
 * （0—1），不是施放后的剩余电压；75% → 0、80% → +5%、100% → +25%。
 */
const qingyiFlashVoltageConsumedDamage: Supplement = {
  kind: "option",
  supplementId: "nanoka:qingyi:flash-voltage-consumed-damage",
  source: "nanoka-integrated@3.2 agents/1251 /skill/basic/description/2/desc",
  catalogEntityId: "agents:qingyi",
  optionId: "nanoka:agents:qingyi:flash-voltage-consumed-damage",
  supportedRanks: "无培养门槛；消耗电压 0—100%（比例 0—1）",
  computationTarget: "catalog option on the mapped agent entity",
  conflictingSourceRecords: {
    stats: ["skillDmgBonus", "dmgBonus"],
    skillTargetSubcategoryIds: ["qingyi-basic-ms4bcr00"],
  },
  evidence: [
    {
      path: "agents/1251/details.zh.json",
      pointer: "/skill/basic/description/2/desc",
      sha256:
        "d5344fa4979038c19f4120a2e9466aba07ed69be20ec2e948c367db4a59b16ef",
    },
  ],
  verification:
    "Nanoka 普通攻击描述（agents/1251/details.zh.json 的 /skill/basic/description/2/desc，闪络）确认：发动[普通攻击：醉花月云转]时，青衣会消耗所有[闪络电压]并退出[闪络]状态，所消耗的[闪络电压]中超过 75% 的部分，每 1% 使本次招式造成的伤害/失衡值额外提升 1%/0.5%。固定 ZZZ-HP 来源没有任何机器记录覆盖该条款（同技能的影画 6 暴伤记录编码的是另一条款），按补充来源在既有 agents:qingyi 实体新增选项，只接入伤害部分：max(0, 消耗电压 − 75%) × 1%，上限 +25%（电压至多 100%），锚点为 75% → 0、80% → +5%、100% → +25%。受益范围是携带醉花月云转目标（qingyi-basic-ms4bcr00）的直伤命中——真实动作映射中突进（action:0013）与终结一击（action:0014）都带该目标，一煞、醉花云、强化特殊技与队友不受益。消耗量由调用方显式输入本次招式实际消耗的电压比例（0—1，不是施放后剩余电压，越界读数按表达式钳制），不模拟积攒、消耗与闪络状态进出；失衡值 +0.5%/1% 不做最终输出，覆盖登记留待批次 10。",
  rule: {
    effectId: "agent:1251:nanoka:flash-voltage-consumed-damage:mindscape:0",
    identity: { kind: "agent", entityId: "1251" },
    section: "普通攻击：醉花月云转（闪络电压消耗）",
    config: { kind: "constant", value: true },
    parameters: {
      threshold: { kind: "constant", unit: "ratio", value: -0.75 },
      rate: { kind: "constant", unit: "multiplier", value: 1 },
      cap: { kind: "constant", unit: "ratio", value: 0.25 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [...directKinds, "sharpen"],
        },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:qingyi-basic-ms4bcr00"],
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
            kind: "convert",
            unit: "ratio",
            input: {
              kind: "maximum",
              unit: "ratio",
              operands: [
                literal("ratio", 0),
                {
                  kind: "add",
                  unit: "ratio",
                  operands: [
                    {
                      kind: "input",
                      unit: "ratio",
                      name: "agent:1251:nanoka:flash-voltage-consumed-damage:mindscape:0:source",
                    },
                    { kind: "parameter", unit: "ratio", name: "threshold" },
                  ],
                },
              ],
            },
            rate: { kind: "parameter", unit: "multiplier", name: "rate" },
          },
          { kind: "parameter", unit: "ratio", name: "cap" },
        ],
      },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: {},
    inputs: [
      {
        name: "agent:1251:nanoka:flash-voltage-consumed-damage:mindscape:0:source",
        unit: "ratio",
        description:
          "manual ratio，本次[普通攻击：醉花月云转]实际消耗的[闪络电压]比例（0—1）；是本次招式消耗的所有电压，不是施放后剩余电压。超过 75% 的部分每 1% 使本次招式伤害 +1%（75% → 0、80% → +5%、100% → +25%），越界读数按表达式钳制，不使用默认值，不模拟积攒/消耗",
      },
    ],
    applicability: {},
    conditionDescription:
      "本次[普通攻击：醉花月云转]消耗的[闪络电压]中超过 75% 的部分，每 1% 使本次招式造成的伤害提升 1%（失衡值 +0.5% 不在伤害计算范围）。选择本选项并输入本次消耗比例；受益范围是突进与终结一击两段醉花月云转直伤。",
    name: "闪络电压消耗 · dmgBonus",
    target: "self",
  },
}

/**
 * 珂蕾妲（M18，批次 03）：潜能分支的强化普攻第二段按消耗[熔炉升温]层数提升。
 * 每消耗一层 +10% 伤害（最多 2 层），只作用于第二段强化普攻（含协同版本）；
 * 层数为本次强化普攻实际消耗的有效层数，全队 +35%（40 秒）是独立既有选项。
 */
const koledaEnhancedBasicSecondPerLayer: Supplement = {
  kind: "option",
  supplementId: "nanoka:koleda:enhanced-basic-second-per-layer",
  source: "nanoka-integrated@3.2 agents/1101 /skill/basic/description/1/desc",
  catalogEntityId: "agents:koleda",
  optionId: "nanoka:agents:koleda:enhanced-basic-second-per-layer",
  supportedRanks: "潜能 1—6；消耗层数 0—2",
  computationTarget: "catalog option on the mapped agent entity",
  conflictingSourceRecords: {
    stats: ["skillDmgBonus", "dmgBonus"],
    skillTargetCategories: ["basic"],
  },
  skillTarget: {
    targetId: "koleda-enhanced-basic-second",
    agentEntityId: "1101",
    category: "basic",
    name: "强化普攻第二段",
  },
  evidence: [
    {
      path: "agents/1101/details.zh.json",
      pointer: "/skill/basic/description/1/desc",
      sha256:
        "4234d05a53ae34e4558929d46d222aab7435b094ab8877f312ca5b19403839e7",
    },
  ],
  verification:
    "Nanoka 普通攻击潜能分支描述（agents/1101/details.zh.json 的 /skill/basic/description/1/desc，被动行的 potential 节点为 110100—110105；普通分支 description/0 无此条款）确认：[熔炉升温]最多 2 层，发动强化[普通攻击]消耗所有层数；每消耗一层，第二段强化[普通攻击]造成的伤害提升 10%、失衡值提升 20%。固定 ZZZ-HP 来源只编码了同句的全队伤害 +35%（独立 40 秒状态，原样保留），没有任何机器记录覆盖按层条款，按补充来源在既有 agents:koleda 实体新增选项，只接入伤害部分：每消耗一层 +10%，激活层数上限 2（0/1/2 层由调用方按本次实际消耗显式选择），只作用于潜能分支的第二段强化普攻。固定来源与上游技能表都没有第二段的技能锚点（ZZZ-HP 无 koleda 的 skillSubcategories，倍率行 buffAnchorId 为 null），本登记按既有独立目标机制采用具名目标 zzz-hp:skill:koleda-enhanced-basic-second（upstreamId 为 null，不是来源技能），技能生成器把它绑定到强化普攻二段（action:0011）与协同版本（action:0012）两个动作；普通第二段普攻（action:0007）、第一段强化普攻（action:0010）、其他招式与队友不受益，不以宽泛 basic 类别替代第二段。失衡值 +20% 不做最终输出，覆盖登记留待批次 10。",
  rule: {
    effectId: "agent:1101:nanoka:enhanced-basic-second-per-layer:mindscape:0",
    identity: { kind: "agent", entityId: "1101" },
    section: "普通攻击：砸扁，粉碎（潜能分支：强化普攻二段）",
    config: potentialFrom(1),
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.1 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        {
          kind: "one-of",
          fact: "hit.damageKind",
          values: [...directKinds, "sharpen"],
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
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 2,
  },
  variant: {
    configuration: { potentialLevels: [1, 2, 3, 4, 5, 6] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "潜能分支：本次强化[普通攻击]消耗的每层[熔炉升温]使第二段强化普攻造成的伤害提升 10%（最多 2 层，按本次实际消耗选择 0/1/2 层）。只作用于第二段强化普攻（含协同版本）；消耗触发的全队伤害 +35%（持续 40 秒）是独立选项，不与本次层数绑定。失衡值 +20% 不在伤害计算范围。",
    name: "强化普攻二段 · dmgBonus",
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
  identityBaseDefenseOnHit,
  restrainerBasicAttackDamageStacks,
  reverbMarkITeamImpactAfterEx,
  vortexHatchetImpactAsActive,
  steamOvenImpactPerRetainedLayer,
  originalTransmorpherImpactOnHit,
  hellfireGearsImpactPerStack,
  blazingLaurelImpactAfterAssist,
  iceJadeTeapotImpactPerTeaLayer,
  ...spectralGazeSoulChainTiers,
  headLackeyFixedImpactPoints,
  nicoleMindscape1ExDamage,
  qingyiFlashVoltageConsumedDamage,
  koledaEnhancedBasicSecondPerLayer,
]

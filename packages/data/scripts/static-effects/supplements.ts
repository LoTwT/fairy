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
  SpecialSkillLevel,
  StaticCatalogDamageItemRequirement,
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

/**
 * 共存机器记录的冻结形状：与来源 SourceEffect 同形的可执行字段集
 * （守卫逐字段核对 raw 与 normalized 两份表示；字段缺省按登记原样比较，
 * 不做空白宽松归一）。
 */
export interface SourceRecordShape {
  readonly id: string
  readonly origin?: string
  readonly scope: string
  readonly applyTarget: "self" | "team"
  readonly applySituation?: string
  readonly applyProfession?: string | null
  readonly teamProfession?: string | null
  readonly teamProfessionValues?: (number | null)[] | null
  readonly teamProfessionMinCount?: number | null
  readonly skillCategory?: string
  readonly skillSubcategoryId?: string | null
  readonly skillTargets?: { category: string; subcategoryId?: string | null }[]
  readonly elementFilter: "all" | readonly string[]
  readonly kind: "fixed" | "stacked" | "convert"
  readonly stat: string
  readonly value: number
  readonly stackable?: boolean
  readonly maxStacks?: number
  readonly valuePerStack?: number
  readonly defaultStacks?: number
  readonly convert?: {
    readonly from: string
    readonly panelSource?: string
    readonly ratioPercent: number
    readonly cap?: number | null
    readonly defaultBase?: number | null
    readonly initialBase?: number
  }
  readonly appliesToAnomaly?: boolean
  readonly enabledDefault?: boolean
  readonly note?: string
}

/** 冻结形状逐字段核对的权威字段清单（与 SourceRecordShape 一一对应）。 */
export const SOURCE_RECORD_SHAPE_FIELDS: readonly string[] = Object.freeze([
  "id",
  "origin",
  "scope",
  "applyTarget",
  "applySituation",
  "applyProfession",
  "teamProfession",
  "teamProfessionValues",
  "teamProfessionMinCount",
  "skillCategory",
  "skillSubcategoryId",
  "skillTargets",
  "elementFilter",
  "kind",
  "stat",
  "value",
  "stackable",
  "maxStacks",
  "valuePerStack",
  "defaultStacks",
  "convert",
  "appliesToAnomaly",
  "enabledDefault",
  "note",
])

export interface SupplementEvidenceReference {
  readonly path: string
  readonly pointer: string
  readonly sha256: string
  /**
   * 被动行证据（/passive/level/<id>）对应的核心等级（1—7）：提供后生成器
   * 按同目录 data.json 的 level 元数据核对逐档映射，防止把等级行错绑到
   * 另一档位的证据。
   */
  readonly rank?: number
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
   * 全队冲击力）声明 team，与目录选项 target 同口径；受益者是持有者同队
   * 其他实体且由调用方逐次声明的条款（如莱特后场时的当前前场角色）声明
   * team-except-holder，并配合变体的 declaredTeammateBeneficiary 使用。
   */
  readonly beneficiary?: {
    readonly kind: "holder" | "team" | "team-except-holder"
  }
}

export interface SupplementVariantSpec {
  readonly configuration: {
    /** 影画门槛（如影画 1 起解锁的天赋条款）；与规则的 mindscapeRank 配置条件一致。 */
    readonly minimumMindscape?: MindscapeRank
    readonly coreSkillLevels?: readonly CoreSkillLevel[]
    readonly refinements?: readonly (1 | 2 | 3 | 4 | 5)[]
    readonly potentialLevels?: readonly PotentialLevel[]
    /**
     * 该选项有证据支持的特殊技最终等级（1—16）；依赖特殊技等级的补充条款
     * （如凯撒攻防转换的 8+最终等级表达式）必须列出，与固定来源的
     * special-skill-level 语义共用同一档位契约。
     */
    readonly specialSkillLevels?: readonly SpecialSkillLevel[]
    /** 驱动盘套装二件套选项的件数门槛；与规则的 setPieces 配置条件一致。 */
    readonly minimumSetPieces?: 2 | 4
  }
  readonly inputs: readonly StaticCatalogInputRequirement[]
  readonly applicability: StaticCatalogVariant["applicability"]
  /**
   * 声明式伤害项要求：与固定来源 damage-item-targeting 语义共用同一
   * StaticCatalogDamageItemRequirement 契约。选中该选项时，命中必须包含
   * 满足身份与元数据的伤害项；由规则的 itemIds 精确绑定，消费端据此发现
   * 需要提供的独立项。仅 hit-adjustment 的补充选项需要登记。
   */
  readonly damageItemRequirements?: readonly StaticCatalogDamageItemRequirement[]
  readonly conditionDescription: string
  readonly name: string
  readonly target: "self" | "team"
  /**
   * 声明式同队受益者：受益者是持有者同队的另一名实体，由每次选择以
   * beneficiaryActorId 显式声明（如莱特位于后场时的当前前场角色）。目录
   * 消费端校验声明实体并只把该实体纳入受益集合；不引入时间线或位置引擎。
   */
  readonly declaredTeammateBeneficiary?: true
  /**
   * 全队唯一效果声明（透传到目录变体）：该选项表示的效果全队唯一，目录
   * 选择阶段按（持有者队伍， optionId）跨绑定强制单一启用来源；同队第二
   * 个启用选择被拒绝，要求调用方声明单一有效来源。用于“伤害提升效果
   * 全队唯一”这类条款，见 StaticCatalogVariant.squadUniqueEffect。
   */
  readonly squadUniqueEffect?: true
  /**
   * 独占伤害项声明（透传到目录变体的 exclusiveDamageItem）：启用该选项时，
   * 命中的伤害项必须恰好是本变体 damageItemRequirements 声明的唯一项；
   * 混合请求被目录明确拒绝，不静默丢弃多余项。用于自带命中级机制（如
   * 必定暴击）会把同一请求全部伤害项卷入的选项；声明时必须恰好登记一个
   * 伤害项要求（convert 生成期同样校验）。
   */
  readonly exclusiveDamageItem?: true
  /**
   * 完整状态层数桥接（透传到目录变体的 layerCountInputName）：声明后
   * selection.layers 表示逻辑状态层数（0 关闭、严格安全整数
   * 0..layerCountMaximumLayers），目录按绑定派生 count 输入，实际展开固定
   * 单实例；规则必须是 maximumLayers 为 1 的单条 supplied 贡献，且其值
   * 表达式真实消费该 count 输入（目录定义校验强制，不靠名称猜测）。不
   * 声明时保持补充的普通逐层展开语义。
   */
  readonly layerCountInputName?: string
  /**
   * 桥接选项的逻辑层数上限（编译为目录变体 maximumLayers）；仅可与
   * layerCountInputName 一起声明，二者必须同时提供。
   */
  readonly layerCountMaximumLayers?: number
}

/**
 * 单个培养位置的具名来源上下文守卫条目：见 SupplementBase.clauseContextGuard
 * 的总说明；历史登记为单对象，跨多个培养位置的条款登记为数组逐条执行。
 */
export interface ClauseContextGuardEntry {
  readonly rankKind: "mindscape"
  readonly rank: number
  /**
   * 冲突 stat 家族：该培养位置内任一记录的 raw 或 normalized stat 命中
   * 即拒绝。固定来源当前没有条款块时（如凯撒攻防转换），此项同时登记
   * “该位置没有这些 stat 的编码”这一真实缺失现状。
   */
  readonly stats: readonly string[]
  /**
   * 锚块（条款所在的真实块）：块必须存在于该位置的 raw pack，且 note
   * 与登记的冻结全文逐字一致；缺失或任何变化（追加、插入、替换，包括
   * 保留全部旧内容再追加新句）即拒绝——锚块上下文的变化要求重新
   * review 是有意的固定来源约束，不做空白宽松归一。stat 检查作用于
   * 整个培养位置（捕捉其他块/新块的同条款编码），锚块按身份区分条款
   * 归属，不与同位置其他机制的块混同。
   */
  readonly anchorBlocks?: readonly {
    readonly blockId: string
    /** 冻结的完整原始 note（取自已固定 fac62407 的真实块全文）。 */
    readonly frozenNote: string
    readonly frozenName?: string
    readonly frozenEnabledDefault?: boolean
  }[]
  /**
   * 该位置完整的既有机器记录集合。登记时同时冻结锚块集合及每条记录的
   * raw/normalized 执行字段，任一新增、删除、迁位、重复或归一化丢失均拒绝。
   * 用于简 M6：CR/CD 与待补附伤共用真实块，不能把整个位置当成空 pack。
   */
  readonly coexistingRecords?: readonly {
    readonly blockId: string
    readonly raw: SourceRecordShape
    readonly normalized: SourceRecordShape
  }[]
  /**
   * 登记该位置当前真实为空（无任何块/记录）：出现任何新编码（无论
   * stat）即拒绝并要求复核。
   */
  readonly expectsEmptyPack?: true
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
    /**
     * 目标所属代理人；不属于任何固定代理人的目标（如音擎附伤的独立
     * 结算目标，任意职业适配的装备者都可能是命中角色）登记 null，
     * 目录消费端跳过“目标属于另一代理人”的所有权校验。
     */
    readonly agentEntityId: string | null
    readonly category: SkillCategory
    readonly name: string
    /**
     * 目标表达真实追加攻击身份（如零号·安比影画 6 的电磁涡流）时为 true：
     * 命中以 skillTargetIds 选中该目标即展开 zzz-hp:follow-up 标签，能消费
     * 目录既有的追加攻击增益，不要求调用方手工补标签；缺省 false。
     */
    readonly countsAsFollowUp?: boolean
  }
  /**
   * 同一来源绑定内的互斥完整状态组（复用公开类型既有的
   * StaticCatalogOption.exclusiveGroup 与 supplied activation 的
   * exclusiveGroup）：同组选项在目录入口与直接规则入口都只能选择一条。
   * 用于把同一机制的互斥档位（如索魂影眸的有效魂锁层数）表达为完整的
   * 单选状态，不引入跨选项推理或时间线。
   */
  readonly exclusiveGroup?: string
  /**
   * 具名来源上下文守卫：按完整实体 + 培养位置（rankKind/rank）定位本批
   * 条款在固定来源中的真实上下文，登记该上下文的冻结预期——已存在的
   * 锚块（块 id + 冻结完整 note 原文）或真实缺失（该位置当前没有任何
   * 块/记录）。上下文内出现登记 stat 家族的机器记录（raw 或 normalized
   * 任一表示）、锚块缺失、note 与冻结全文不一致（追加、插入、替换任一
   * 变化，包括保留全部旧内容再追加新句）或已登记缺失的位置出现任何新
   * 编码，都拒绝生成并要求重新核对条款归属；其他 rank/独立机制的同 stat
   * 记录不受影响，按实体身份与块 id 匹配，不依赖数组位置或局部 ID 子串。
   * 归一化可以改写记录 stat（如未知 stat 被归一为 dmgBonus），因此两份
   * 表示都必须核对；该守卫不替代 loadSource 对 19 个固定资源的 SHA 校验。
   * 单对象为历史形态；补充条款横跨多个培养位置时（如批次 14 的核心被动
   * rank 0 锚块与影画 4 真实空位）登记为数组，逐位置执行同一校验。
   */
  readonly clauseContextGuard?:
    | ClauseContextGuardEntry
    | readonly ClauseContextGuardEntry[]
  /**
   * 音擎精炼五档的具名来源上下文守卫（批次 12）：按固定来源 refinementBuffs
   * 的五个精炼档定位条款上下文。每档锚块（块 id + 冻结完整 note 原文）必须
   * 存在且 note 逐字一致；五个精炼档内任一来源记录（raw 或 normalized 表示，
   * 归一化可能改写 stat）命中登记 stat 家族即拒绝生成并要求重新核对条款归属
   * （未来同条款机器编码、raw/normalized 变义都触发）。可登记共存既有机器
   * 记录的冻结形状（每档锚块内必须存在该 effectId 且 stat 一致的记录），
   * 共存前提漂移或缺失即拒绝。块与记录按身份匹配，数组重排不误伤；其他
   * 条款（stat 不在登记家族内）不误拒。该守卫不替代 loadSource 对固定资源
   * 的 SHA 校验。
   */
  readonly wengineRefinementContextGuard?: {
    /** 冲突 stat 家族：五个精炼档内任一记录的 raw 或 normalized stat 命中即拒绝。 */
    readonly stats: readonly string[]
    /** 五个精炼档（1—5）的锚块：块 id 与冻结完整 note。 */
    readonly tiers: readonly {
      readonly blockId: string
      readonly frozenNote: string
    }[]
    /**
     * 共存既有机器记录的冻结形状（可选，如加农转子的常驻 ATK 记录）：按
     * 完整来源身份（实体、精炼档、锚块、effect ID）在五个精炼档内核对——
     * 锚块内必须存在该记录，且该档恰好存在一条同 ID 的来源记录，其 raw
     * 与 normalized 表示都存活并逐字段等于登记的冻结形状（见
     * SOURCE_RECORD_SHAPE_FIELDS；字段省略按登记原样核对，不从待验输入
     * 推导期望）。锚块缺失、记录缺失或重复、normalized 缺失、任一表示的
     * 任一字段漂移都拒绝生成，不静默降级。记录的可执行输出仍由正式转换
     * 和来源参考夹具逐位置锁定。
     */
    readonly coexistingRecords?: readonly {
      readonly effectId: string
      /**
       * 五档逐档的冻结形状（raw 与 normalized 独立登记；字面值取自已核对
       * 的真实固定源，两份表示在此记录上相同，如未来来源分化须重新登记）。
       */
      readonly tiers: readonly {
        readonly raw: SourceRecordShape
        readonly normalized: SourceRecordShape
      }[]
    }[]
  }
}

/**
 * 同一选项内与主规则同时启用的额外贡献规则（完整状态的多通道落点，如
 * 洛克茜初始回能同时转攻击与冲击）：全部规则共用同一变体、同一输入与
 * 同一层数语义，变体 effectIds 按登记顺序引用全部规则；每条额外规则的
 * maximumLayers 必须与主规则一致，生成期不一致即拒绝。0 层关闭同时关闭
 * 全部规则，1 层启用同时生效，不允许单条作为对外半状态选项。
 */
export interface SupplementAdditionalRule {
  readonly additionalRules?: readonly SupplementRuleSpec[]
}

/** 在既有目录实体新增选项的补充来源；不创建重复实体。 */
export interface SupplementOption
  extends SupplementBase, SupplementAdditionalRule {
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
  | (SupplementBase &
      SupplementAdditionalRule & {
        readonly kind: "option-variant"
        readonly optionId: string
        readonly rule: SupplementRuleSpec
        readonly variant: SupplementVariantSpec
        readonly supportedRanks: string
        readonly computationTarget: string
      })
  | (SupplementBase &
      SupplementAdditionalRule & {
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
       * 来源效果存在（如驱动盘二/四件套的护盾值、失衡值、承伤条款，或音擎
       * 五档、代理人影画/技能条款的越界部分），但当前公开静态伤害计算不承诺
       * 该量。不创建规则、不伪造数值；消费端显式选择时得到带解释的明确错误，
       * 覆盖报告据此声明该条款“已声明越界”。
       */
      readonly kind: "unsupported-option"
      readonly catalogEntityId: string
      readonly optionId: string
      readonly name: string
      readonly conditionDescription: string
      readonly target: "self" | "team"
      /**
       * 条款在既有目录实体上的真实培养范围：驱动盘件数门槛、音擎精炼档、
       * 代理人影画/核心/潜能档。生成期要求域名与实体类型一致（见 convert.ts
       * 的越界登记守卫），不伪造套装门槛，也不声明无法核对的档位。
       */
      readonly configuration: SupplementVariantSpec["configuration"]
      /**
       * 音擎五档越界声明依赖的真实缺失状态（本批核对时该音擎的五个精炼块
       * 都只有 note、effects 为空）：声明后生成期逐档核对这一状态，上游补出
       * 任何精炼档机器效果记录即拒绝生成并要求重新核对，不静默并存。
       */
      readonly expectsNoteOnlyRefinementTiers?: true
      readonly reason: "formula-out-of-scope"
      readonly explanation: string
      readonly supportedRanks: string
      readonly computationTarget: string
      /**
       * 该条款在固定来源没有目录实体（反向缺项，如「恒等式」-变格 12014）
       * 时随声明携带的补充实体：只含从 integrated 核对过的真实目录元数据
       * （名称/职业/溯源），复用既有补充实体 prepass 的目录 ID 与身份唯一性
       * 检查；实体本身不创建任何可执行规则，条款仍以 unsupported 变体登记。
       */
      readonly entity?: StaticCatalogEntity
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

/**
 * 恒等式-变格（w-engines/12014）：「致眩」五档使攻击者造成的伤害降低
 * 6/7/8/9/10%，持续 12 秒，属于敌方输出/己方承伤方向。该音擎在固定来源
 * 没有目录实体，按 integrated 真实元数据随声明携带补充实体（名称、职业、
 * 中英文与 data.json 摘要），使本条款可从正式目录发现并在显式选择时得到
 * 本条具名拒绝；声明本身不创建可执行规则，也不把该条款折算成己方对敌
 * 输出的减伤或易伤。旧 coverage-only boundary 记录由本声明唯一迁移。
 */
const identityInflectionAttackerDamageReduction: Supplement = {
  kind: "unsupported-option",
  supplementId: "nanoka:w-engines:12014:attacker-damage-reduction",
  source: "nanoka-integrated@3.2 w-engines/12014 /talents/1—5/desc",
  catalogEntityId: "nanoka:w-engines:12014",
  optionId: "nanoka:w-engines:12014:attacker-damage-reduction",
  name: "「恒等式」-变格 · attackerDamageReduction",
  conditionDescription:
    "受到敌方攻击时，攻击者造成的伤害降低6/7/8/9/10%，持续12秒（按精炼 1—5，五档同文）。这是装备者受击后降低该攻击者输出的敌方减益：团队受到该敌人攻击时均可受益，受益范围按 team 概括；本批不计算承伤，也不把它折算成己方对敌伤害的减伤或易伤。",
  target: "team",
  configuration: { refinements: [1, 2, 3, 4, 5] },
  reason: "formula-out-of-scope",
  explanation:
    "五档天赋「致眩」为受到敌方攻击时，攻击者造成的伤害降低6/7/8/9/10%，持续12秒。这是装备者受击后降低该攻击者输出的敌方减益，作用对象是该攻击者、受益范围是团队（团队受到该敌人攻击时均可受益），不是己方全队无条件获得直接减伤；当前公开静态伤害计算从己方对敌伤害入口计算，不计算承伤，也不新增该公式。不把它折算成目标减伤/减易伤、各类增伤或零贡献冒充支持，待承伤计算产品建立后另行接入。该音擎在固定来源没有目录实体（反向缺项），本声明随选项携带一个仅含真实目录元数据的补充实体（名称与职业按 integrated 核对、不创建可执行规则），使本条款可从正式目录发现并经显式选择得到本条具名拒绝。五档均为不可选。显式选择本选项会得到本错误。",
  supportedRanks: "精炼 1—5（不可选）",
  computationTarget:
    "declared unavailable option on the supplement w-engine entity",
  entity: {
    catalogEntityId: "nanoka:w-engines:12014",
    upstreamId: null,
    name: "「恒等式」-变格",
    identity: { kind: "w-engine", entityId: "12014" },
    status: "mapped",
    profession: "防护",
    element: null,
    supplementProvenance: {
      sourceId: "nanoka-integrated",
      version: "3.2",
      resources: [
        {
          path: "w-engines/12014/details.zh.json",
          sha256:
            "8b63e7e33ecf102c30023fe5692377055689d56001affe0a318148e1dba41d2e",
        },
        {
          path: "w-engines/12014/data.json",
          sha256:
            "91e2160ccd9b97a88acf254e82c37b05d648ac12842264f0b91baa7fd31567ba",
        },
      ],
    },
  },
  // 该常量位于同文件辅助函数之前，五档证据在此显式列出（同一 path/Pointer/摘要）。
  evidence: ([1, 2, 3, 4, 5] as const).map((tier) => ({
    path: "w-engines/12014/details.zh.json",
    pointer: `/talents/${tier}/desc`,
    sha256: "8b63e7e33ecf102c30023fe5692377055689d56001affe0a318148e1dba41d2e",
  })),
  verification:
    "Nanoka 五档天赋逐档核实（w-engines/12014/details.zh.json 的 /talents/1—5/desc，英文同文为 When attacked, reduces the attacker's DMG by 6% for 12s）：五档分别为 6/7/8/9/10%，持续 12 秒。该音擎在固定来源没有目录实体（coverage 的 reverseGaps 原有 w-engines/12014），元数据按 integrated 核对：中文名「恒等式」-变格、英文名 [Identity] Inflection、weaponType {5:防护}、rarity 2（Weapon_B_Common_14），data.json id 12014 与 identity 一致。本声明不创建可执行规则，只把原 coverage-only boundary 迁移为目录可发现的单份不可选变体；不把该条款写成目标减伤/减易伤或零贡献。",
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
  configuration: { minimumSetPieces: 2 },
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
  configuration: { minimumSetPieces: 2 },
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

/** 影画门槛条件；门槛值来自来源天赋描述。 */
const mindscapeFrom = (minimum: number): Condition<"configuration"> => ({
  kind: "compare-number",
  unit: "count",
  operator: "gte",
  left: {
    kind: "configuration-number",
    unit: "count",
    field: "mindscapeRank",
  },
  right: literal("count", minimum),
})

/**
 * 代理人核心被动逐档证据：/passive/level/<id>/desc/0 的连续 7 行，rank 为
 * 该行在 data.json level 元数据中的真实核心等级；生成器按 rank 逐行核对
 * 等级映射，防止把档位证据错绑到相邻行。
 */
const agentPassiveEvidence = (
  entityId: string,
  sha256: string,
  firstKey: number,
): readonly SupplementEvidenceReference[] =>
  [1, 2, 3, 4, 5, 6, 7].map((rank) => ({
    path: `agents/${entityId}/details.zh.json`,
    pointer: `/passive/level/${firstKey + rank - 1}/desc/0`,
    sha256,
    rank,
  }))

/** 按核心等级取值的参数表（1—7 档字面值，不插值）。 */
const coreRatio = (
  values: readonly [number, number, number, number, number, number, number],
) =>
  ({
    kind: "by-rank",
    rank: "coreSkillLevel",
    unit: "ratio",
    values: {
      1: values[0],
      2: values[1],
      3: values[2],
      4: values[3],
      5: values[4],
      6: values[5],
      7: values[6],
    },
  }) as const

/** 按核心等级取值的倍率参数表（1—7 档字面值，不插值；multiplier 单位）。 */
const coreMultiplier = (
  values: readonly [number, number, number, number, number, number, number],
) =>
  ({
    kind: "by-rank",
    rank: "coreSkillLevel",
    unit: "multiplier",
    values: {
      1: values[0],
      2: values[1],
      3: values[2],
      4: values[3],
      5: values[4],
      6: values[5],
      7: values[6],
    },
  }) as const

const coreImpactPoints = (
  values: readonly [number, number, number, number, number, number, number],
) =>
  ({
    kind: "by-rank",
    rank: "coreSkillLevel",
    unit: "impact-points",
    values: {
      1: values[0],
      2: values[1],
      3: values[2],
      4: values[3],
      5: values[4],
      6: values[5],
      7: values[6],
    },
  }) as const

/** 按核心等级取值的攻击点数参数表（1—7 档字面值，不插值）。 */
const coreAttackPoints = (
  values: readonly [number, number, number, number, number, number, number],
) =>
  ({
    kind: "by-rank",
    rank: "coreSkillLevel",
    unit: "attack-points",
    values: {
      1: values[0],
      2: values[1],
      3: values[2],
      4: values[3],
      5: values[4],
      6: values[5],
      7: values[6],
    },
  }) as const

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
    "Nanoka 五档天赋逐档核实：发动[快速支援]或[极限支援]时，装备者的冲击力提升 25/28.75/32.5/36.25/40%，持续 8 秒；同句的[萎靡]暴击伤害规则由固定来源机器记录覆盖（精炼 5 的 dmgBonus 编码按 blazing-laurel-r5-wilt-critical-damage 具名修正为 critDmg），冲击力条款则没有任何机器记录，固定来源 note 也未包含该句。本选项只接入冲击力条款，不与[萎靡]层数或其伤害规则绑定；快速/极限支援触发与 8 秒持续由调用方显式选择断言。",
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
      "发动[快速支援]或[极限支援]时，装备者的冲击力提升（按精炼 25/28.75/32.5/36.25/40%），持续8秒；触发状态由调用方显式选择断言。已有的[萎靡]暴击伤害规则为独立选项，不受本选项影响。",
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
/**
 * 凯撒（S01，批次 06）：攻防转换的冲击力提升。触发[精准格挡]、[防御反击]
 * 或[招架支援]后 3 秒内自身冲击力提升 (8+特殊技最终等级)%，按既有
 * specialSkillLevel 档位契约查表（1—16 由等级表达式生成），不默认最高级。
 */
const caesarStanceSwitchImpact: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:caesar:stance-switch-impact",
  source: "nanoka-integrated@3.2 agents/1071 /skill/special/description/4/desc",
  catalogEntityId: "agents:caesar",
  optionId: "nanoka:agents:caesar:stance-switch-impact",
  supportedRanks: "特殊技最终等级 1—16",
  computationTarget: "catalog option on the mapped agent entity",
  // 固定来源没有攻防转换块（该条款是特殊技被动，mindscape rank 0 只有
  // 坚韧之壁与战意激昂两块），登记这一真实缺失现状：rank 0 出现任何冲击力
  // 族编码（raw 或归一后）都要求重新核对条款归属，不编造已存在的块 ID。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 0,
    stats: impactSourceStats,
  },
  evidence: [
    {
      path: "agents/1071/details.zh.json",
      pointer: "/skill/special/description/4/desc",
      sha256:
        "e1cdf548442fdce60f0af409e8901deeefd01ddd846e24ace0883db966509294",
    },
    {
      path: "agents/1071/details.zh.json",
      pointer: "/skill/special/description/5/param/0/desc",
      sha256:
        "e1cdf548442fdce60f0af409e8901deeefd01ddd846e24ace0883db966509294",
    },
  ],
  verification:
    "Nanoka 特殊技描述（agents/1071/details.zh.json 的 /skill/special/description/4/desc 与 /skill/special/description/5/param/0/desc，英文文件同文核对）确认：凯撒触发[精准格挡]、[防御反击]或[招架支援]时，自身冲击力提升 {CAL:8+AvatarSkillLevel(1)*1,1,2}%，持续 3 秒。固定 ZZZ-HP 来源没有任何冲击力机器记录，按补充来源在既有 agents:caesar 实体新增选项。数值按特殊技最终等级查表（8+等级：1 级 9%、16 级 24%），与露西/卢西娅的 special-skill-level 档位契约共用同一表达式生成表：输入是已含影画加级的最终等级，影画 3/5 的技能等级提升由调用方在提供等级时结算，本选项不再重复加级；缺档等级按既有契约拒绝，不默认最高级。触发事实与 3 秒持续由调用方显式选择断言，不模拟时间线；局内百分比冲击进入 impact 的 final-percentage。",
  rule: {
    effectId: "agent:1071:nanoka:stance-switch-impact:mindscape:0",
    identity: { kind: "agent", entityId: "1071" },
    section: "特殊技：攻防转换",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "specialSkillLevel",
        unit: "ratio",
        values: Object.fromEntries(
          (
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const
          ).map((level) => [level, (8 + level) / 100]),
        ),
      } as AnyParameter,
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 1,
  },
  variant: {
    configuration: {
      specialSkillLevels: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ],
    },
    inputs: [],
    applicability: {},
    conditionDescription:
      "触发[精准格挡]、[防御反击]或[招架支援]时，自身冲击力提升 (8+特殊技最终等级)%（1—16 级为 9%—24%），持续 3 秒；触发事实与持续由调用方显式选择断言。等级为已含影画加级的最终等级，不重复加级。",
    name: "攻防转换 · impact",
    target: "self",
  },
}

/**
 * 莱特（S01，批次 06）：[士气喷发]中每消耗 10 点士气的冲击力提升。每层 1—2%
 * 随核心档位逐档变化，最高 10 层即来源上限（10%—20%），持续 6 秒。有效层数是
 * 调用方声明的完整状态层数，不用当前士气推导，也不自动消耗士气；与[昂扬]
 * 完整状态（施加时冲击力转化）是不同机制，互不替换对方的读数。
 */
const lighterMoraleBurstImpact: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:lighter:morale-burst-impact",
  source:
    "nanoka-integrated@3.2 agents/1161 /passive/level/1161501—1161507/desc/0",
  catalogEntityId: "agents:lighter",
  optionId: "nanoka:agents:lighter:morale-burst-impact",
  supportedRanks: "核心 1—7；层数 0—10",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：核心被动所在 mindscape rank 0 的 blk-legacy（助燃剂块），
  // 与同 rank 的[昂扬]块（blk-ms4aoho0-grnxav，记录 stat 为 dmgBonus）按
  // 块身份区分，不混同。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 0,
    stats: impactSourceStats,
    anchorBlocks: [
      {
        blockId: "blk-legacy",
        frozenNote:
          "[士气喷发]状态下，轻拳起攻或刺拳连击命中敌人时，目标的冰属性伤害抗性和火属性伤害抗性降低15%，持续30秒；",
      },
    ],
  },
  evidence: agentPassiveEvidence(
    "1161",
    "5905a577cc078f91031b3f14b5dff21bdba95952e2e74215d4cc3e22798fc3c5",
    1161501,
  ),
  verification:
    "Nanoka 核心被动七行（agents/1161/details.zh.json 的 /passive/level/1161501—1161507/desc/0，data.json level 元数据 1—7 逐行核对，英文文件同文核对：第 7 级为 With every 10 points of Morale consumed, Lighter's Impact increases by 2%, up to a maximum increase of 20%）确认：威力提升后的招式命中敌人时会持续消耗[士气]，每消耗 10 点[士气]，莱特的冲击力提升 1/1.17/1.33/1.5/1.67/1.83/2%（按核心 1—7），最多提升 10/11.7/13.3/15/16.7/18.3/20%，持续 6 秒。固定 ZZZ-HP 来源没有任何冲击力机器记录（[昂扬]的冲击力单次转化记录属另一机制，修订 19 已并入完整状态选项），按补充来源在既有 agents:lighter 实体新增选项。数值取来源字面值，不按等差插值；层数表达有效[士气喷发]状态：调用方按已消耗的每 10 点士气显式选择层数（0 层关闭、最多 10 层），10 层即为来源上限，不用当前士气值除以 10 推导，也不自动消耗士气；6 秒持续与士气消耗过程不模拟。与[昂扬]完整状态选项独立：昂扬读获得时冲击力快照，本选项不替换或复用该读数。",
  rule: {
    effectId: "agent:1161:nanoka:morale-burst-impact:mindscape:0",
    identity: { kind: "agent", entityId: "1161" },
    section: "核心被动：斗志昂扬（士气喷发）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: coreRatio([0.01, 0.0117, 0.0133, 0.015, 0.0167, 0.0183, 0.02]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: impactFinalPercentage("amount"),
    maximumLayers: 10,
  },
  variant: {
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "[士气喷发]状态中，威力提升后的招式命中敌人会持续消耗[士气]，每消耗 10 点[士气]使冲击力提升（核心 1—7 每层 1/1.17/1.33/1.5/1.67/1.83/2%），最多 10 层（即来源上限 10%—20%），持续 6 秒；有效层数由调用方显式选择，不从当前士气推导，0 层表示关闭。与[昂扬]完整状态是不同机制，各自独立选择。",
    name: "士气喷发 · impact",
    target: "self",
  },
}

/**
 * 橘福福（S01，批次 06）：[虎啸]状态中的自身固定冲击力点数。按核心七档取
 * 25—50 点；是自身固定点数，不是全队冲击，也不是百分比；与既有[虎啸]暴伤、
 * 连携/终结增伤选项共存，不重复既有条款。
 */
const jufufuTigersRoarImpact: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:jufufu:tigers-roar-impact",
  source:
    "nanoka-integrated@3.2 agents/1391 /passive/level/1391501—1391507/desc/0",
  catalogEntityId: "agents:jufufu",
  optionId: "nanoka:agents:jufufu:tigers-roar-impact",
  supportedRanks: "核心 1—7",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：核心被动（虎虎生威）所在 mindscape rank 0 的 blk-legacy；
  // 影画 4 的 critDmg 记录在 rank 4，不受本守卫影响。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 0,
    stats: impactSourceStats,
    anchorBlocks: [
      {
        blockId: "blk-legacy",
        frozenNote:
          "「虎威」命中敌人时，若拥有至少100点[威风]且橘福福不为当前操作中角色，橘福福会围绕目标敌人，发动[连携技：虎釜震煞]；\n发动时，全队角色获得[虎啸]效果：暴击伤害提升20%，橘福福的初始攻击力大于等于2800点时，每超过100点攻击力会使暴击伤害额外提升5%，最多额外提升30%；\n[虎啸]状态下，角色的[连携技]/[终结技]造成的伤害提升20%/40%；",
      },
    ],
  },
  evidence: agentPassiveEvidence(
    "1391",
    "cfb0b4b580900d4c3e6c668c63e89b5f61d69e577db361b19bca86d063b36ae6",
    1391501,
  ),
  verification:
    "Nanoka 核心被动七行（agents/1391/details.zh.json 的 /passive/level/1391501—1391507/desc/0，data.json level 元数据 1—7 逐行核对，英文文件同文核对，第 7 级英文为 While Ju Fufu is in the Tiger's Roar state, Impact increases by 50）确认：橘福福处于[虎啸]效果中时，冲击力提升 25/29.2/33.3/37.5/41.7/45.8/50 点（按核心 1—7）。固定 ZZZ-HP 来源已编码同状态的暴击伤害与连携/终结增伤，唯独冲击力点数没有机器记录，按补充来源在既有 agents:jufufu 实体新增选项，与既有条款共存、不重复贡献。数值取来源字面值；受益对象是橘福福自身（不是全队），量纲是固定点数（不是百分比）：按固定来源 atk/def 点数与批次 02 首席跟班固定冲击力的既有口径进入 impact 的 final-fixed，基础冲击力变化时固定增量不变。[虎啸]的取得与 30 秒持续由调用方显式选择断言，重复触发刷新不模拟。",
  rule: {
    effectId: "agent:1391:nanoka:tigers-roar-impact:mindscape:0",
    identity: { kind: "agent", entityId: "1391" },
    section: "核心被动：虎虎生威（虎啸）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: coreImpactPoints([25, 29.2, 33.3, 37.5, 41.7, 45.8, 50]),
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
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "橘福福处于[虎啸]效果中时，冲击力提升固定点数（核心 1—7 为 25/29.2/33.3/37.5/41.7/45.8/50 点），状态持续 30 秒；[虎啸]状态由调用方显式选择断言。受益对象是橘福福自身，与全队暴伤、连携/终结增伤条款相互独立。",
    name: "虎啸 · impact",
    target: "self",
  },
}

/**
 * 琉音（S01，批次 06）：初始暴击率超过 50% 的部分转冲击力。每超 1% 提升
 * 1.4—2 点（按核心 1—7），最多 100 点。读取的是初始暴击率（不含局内暴击率
 * 增益），沿用直接属性显式 :source 输入契约；输出阶段沿既有固定冲击力点数
 * 的面板契约，来源只证明换算与上限，未证明面板结算阶段。
 */
const dialynInitialCritRateImpact: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:dialyn:initial-crit-rate-impact",
  source:
    "nanoka-integrated@3.2 agents/1481 /passive/level/1481049—1481055/desc/0",
  catalogEntityId: "agents:dialyn",
  optionId: "nanoka:agents:dialyn:initial-crit-rate-impact",
  supportedRanks: "核心 1—7",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：核心被动（五星客服热线）所在 mindscape rank 0 的
  // blk-legacy；同 rank 的场外连线块（blk-ms0gb49m-zmm1r1）与影画 4 的
  // atk 记录（rank 4）按位置/块身份区分。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 0,
    stats: impactSourceStats,
    anchorBlocks: [
      {
        blockId: "blk-legacy",
        frozenNote:
          "[强化特殊技：布！]命中敌人时，敌人获得[恶意投诉]效果，[恶意投诉]效果下敌人进入失衡状态后的失衡持续时间提升2秒，失衡易伤倍率提升30%",
      },
    ],
  },
  evidence: agentPassiveEvidence(
    "1481",
    "c335486522cb3958f1430551fb07616364cd01f13cbe988c7bde6d21a41ca3ed",
    1481049,
  ),
  verification:
    "Nanoka 核心被动七行（agents/1481/details.zh.json 的 /passive/level/1481049—1481055/desc/0；该代理人的核心行键为 1481049—1481055，data.json level 元数据 1—7 逐行核对，英文文件同文核对，第 7 级英文为 Impact increases by 2 for each additional 1%, up to a maximum increase of 100）确认：进入战场时初始暴击率超过 50% 的情况下，每超过 1%，冲击力提升 1.4/1.5/1.6/1.7/1.8/1.9/2 点（按核心 1—7），最多提升 100 点。固定 ZZZ-HP 来源没有任何冲击力机器记录，按补充来源在既有 agents:dialyn 实体新增选项。输入必须区分直接属性的初始/当前阶段：沿用电位差/精准制导等直接属性转化先例的必填显式 :source 输入（比例 1% = 0.01），描述明确为初始暴击率，不冒称自动读取，也不把局内暴击率增益的当前值当初始值；越界与低于 50% 的读数按表达式钳制（核心 7：49%/50% → 0、51% → 2 点、75% → 50 点、100% 及以上 → 100 点封顶）。输出阶段按既有面板契约分层说明：来源证明的是固定点数、阈值与上限，本实现采用 impact 的 final-fixed（与批次 02 首席跟班固定冲击力及固定来源 atk/def 点数同口径），该阶段选择是契约推定，来源未证明面板结算阶段，未经游戏实测。",
  rule: {
    effectId: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0",
    identity: { kind: "agent", entityId: "1481" },
    section: "核心被动：五星客服热线（初始暴击率转化）",
    config: { kind: "constant", value: true },
    parameters: {
      threshold: { kind: "constant", unit: "ratio", value: -0.5 },
      rate: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "multiplier",
        values: { 1: 140, 2: 150, 3: 160, 4: 170, 5: 180, 6: 190, 7: 200 },
      },
      cap: { kind: "constant", unit: "impact-points", value: 100 },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
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
                      name: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0:source",
                    },
                    { kind: "parameter", unit: "ratio", name: "threshold" },
                  ],
                },
              ],
            },
            rate: { kind: "parameter", unit: "multiplier", name: "rate" },
          },
          { kind: "parameter", unit: "impact-points", name: "cap" },
        ],
      },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    inputs: [
      {
        name: "agent:1481:nanoka:initial-crit-rate-impact:mindscape:0:source",
        unit: "ratio",
        description:
          "initial critRate，琉音的初始暴击率（比例，1% = 0.01；是初始值，不含局内暴击率增益，不用当前面板值代替）；超过 50% 的部分每 1% 按核心档位换算 1.4—2 点冲击力、封顶 100 点，低于或等于 50% 贡献 0，越界读数按表达式钳制，不使用默认值，不自动读取",
      },
    ],
    applicability: {},
    conditionDescription:
      "初始暴击率超过 50% 时，每超过 1%，冲击力提升（核心 1—7 为 1.4/1.5/1.6/1.7/1.8/1.9/2 点），最多提升 100 点；由调用方显式输入琉音的初始暴击率（不含局内暴击率增益），50%/51%/75%/100% 在核心 7 下分别为 0/2/50/100 点。",
    name: "核心被动 · impact（初始暴击率转化）",
    target: "self",
  },
}

/**
 * 莱特（M14，批次 06）：影画 4 后场时仅当前前场角色的能量自动回复效率 +10%。
 * 按真实百分比回能契约（摇摆爵士二件套同构：受益者基础回能 × 10%），不是固定
 * +0.1 点/秒；受益者由每次选择显式声明为持有者同队的另一名实体（声明式
 * 同队受益者），全队不同时受益、后场的莱特本人不受益、不从命中身份推断
 * 前场。进入士气喷发给后场回复 4 点能量/18 秒冷却不在本批，留批次 10。
 */
const lighterMindscape4FrontlineEnergyRegen: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
  source: "nanoka-integrated@3.2 agents/1161 /talent/4/desc",
  catalogEntityId: "agents:lighter",
  optionId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
  supportedRanks: "影画 4 及以上",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：mindscape rank 4 的真实空 pack（影画 4 无任何块/记录）；
  // 其他 rank（如影画 1）的独立回能条款不受影响。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 4,
    stats: ["energyRegen"],
    expectsEmptyPack: true,
  },
  evidence: [
    {
      path: "agents/1161/details.zh.json",
      pointer: "/talent/4/desc",
      sha256:
        "5905a577cc078f91031b3f14b5dff21bdba95952e2e74215d4cc3e22798fc3c5",
    },
  ],
  verification:
    "Nanoka 影画 4（agents/1161/details.zh.json 的 /talent/4/desc，英文文件同文核对：When Lighter is off-field, the Energy Regen for the on-field character is increased by 10%）确认：莱特位于后场时，前场角色的能量自动回复效率提升 10%。固定 ZZZ-HP 来源的 mindscape 4 没有任何机器记录，按补充来源在既有 agents:lighter 实体新增选项。这是百分比效率提升，按现有真实百分比回能契约编码（与摇摆爵士二件套 +20% 同构：受益者基础回能 × 10%，基础回能 1.2/5.0 下分别 +0.12/+0.5 点/秒），不是固定 +0.1 点/秒。受益对象是当前前场角色且仅此一名：选择本选项即断言莱特位于后场，调用方以 beneficiaryActorId 显式声明当前前场角色（必须是持有者同队的另一名实体，目录校验其观察与身份并拒绝持有者本人），全队不同时受益、后场队友不受益，不从命中角色或任何位置引擎推断前场（后台攻击也可能有命中角色，不能把 hitActor 当前场角色）。同句“进入[士气喷发]状态时为后场角色回复 4 点能量，18 秒内最多触发一次”是独立瞬时机制，不在本批（留批次 10 统一登记覆盖说明），不并入本选项。",
  rule: {
    effectId:
      "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
    identity: { kind: "agent", entityId: "1161" },
    section: "影画4",
    config: mindscapeFrom(4),
    parameters: {
      amount: { kind: "constant", unit: "ratio", value: 0.1 },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
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
          entity: { role: "beneficiary" },
          stat: "energyRegen",
          stage: "base",
          at: "evaluation",
        },
        coefficient: { kind: "parameter", unit: "ratio", name: "amount" },
      },
    },
    maximumLayers: 1,
    beneficiary: { kind: "team-except-holder" },
  },
  variant: {
    configuration: { minimumMindscape: 4 },
    inputs: [],
    applicability: {},
    declaredTeammateBeneficiary: true,
    conditionDescription:
      "莱特位于后场时，仅当前前场角色的能量自动回复效率提升 10%（受益者基础回能 × 10%；基础回能 1.2/5.0 下分别 +0.12/+0.5 点/秒）；选择本选项即断言莱特位于后场，并须以 beneficiaryActorId 显式声明当前前场角色（持有者同队的另一名实体），后场队友与莱特本人不受益。同句的后场回复 4 点能量（18 秒冷却）是独立瞬时机制，不在本选项内。",
    name: "影画4 · energyRegen（前场角色）",
    target: "team",
  },
}

/**
 * 丽娜（M15，批次 06）：影画 4 两个玩偶均被指派在外时自身能量自动回复速度
 * +0.5 点/秒。固定点数/秒（非百分比、非全队）；任一玩偶返回即状态结束，
 * 由调用方以 0/1 显式选择声明，不从单只召唤物推断，不模拟召唤物行为。
 */
const alexandrinaMindscape4DeployedDollsEnergyRegen: Supplement = {
  kind: "option",
  supplementId:
    "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
  source: "nanoka-integrated@3.2 agents/1211 /talent/4/desc",
  catalogEntityId: "agents:alexandrina",
  optionId: "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
  supportedRanks: "影画 4 及以上",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：mindscape rank 4 的真实空 pack；影画 1 的穿透率条款在
  // rank 1，不受本守卫影响。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 4,
    stats: ["energyRegen"],
    expectsEmptyPack: true,
  },
  evidence: [
    {
      path: "agents/1211/details.zh.json",
      pointer: "/talent/4/desc",
      sha256:
        "ff04332f6e00a8e4ef654a1da8bfffbb577d90219c26b9f37cb1f4f69c0b9615",
    },
  ],
  verification:
    "Nanoka 影画 4（agents/1211/details.zh.json 的 /talent/4/desc，英文文件同文核对：Rina's Energy Regen increases by 0.5/s when both Drusilla and Anastella are deployed. The effect ends when Drusilla or Anastella returns to Rina.）确认：杜苏拉和安娜塔莎均被指派在外时，丽娜的能量自动回复速度提升 0.5 点/秒；任一返回丽娜身边时对应增益效果结束。固定 ZZZ-HP 来源的 mindscape 4 没有任何机器记录，按补充来源在既有 agents:alexandrina 实体新增选项。这是固定点数/秒（0.5 点/秒），不是百分比效率、不是全队效果、也不是基础回能的 50%：按批次 01 固定回能纠错后的固定回能编码（energy-per-second final-fixed，不随基础回能缩放），受益对象是丽娜自身，任一基础回能下增量恒为 +0.5。两个玩偶均在外的有效状态由调用方以 0/1 显式选择声明（0 层关闭），不从单只召唤物存在与否推断，也不模拟召唤物返回过程或持续时间。",
  rule: {
    effectId:
      "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4",
    identity: { kind: "agent", entityId: "1211" },
    section: "影画4",
    config: mindscapeFrom(4),
    parameters: {
      amount: { kind: "constant", unit: "energy-per-second", value: 0.5 },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "energyRegen",
      stage: "final-fixed",
      value: { kind: "parameter", unit: "energy-per-second", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 4 },
    inputs: [],
    applicability: {},
    conditionDescription:
      "杜苏拉和安娜塔莎均被指派在外时，丽娜的能量自动回复速度提升 0.5 点/秒（固定点数/秒，不随基础回能缩放）；任一玩偶返回丽娜身边时效果结束。两个玩偶均在外的有效状态由调用方显式选择（0/1），不从单只召唤物推断，不模拟返回过程。",
    name: "影画4 · energyRegen",
    target: "self",
  },
}

/**
 * 洛克茜（PR07，批次 07）：初始能量自动回复超过 1.2 的部分同时转化攻击力
 * 与冲击力的完整状态。两项是同一完整状态选择：0 层同时关闭、1 层同时
 * 生效，一条显式输入（energy-per-second）供两条规则消费；两项独立封顶
 * （低核心档两个封顶点不同），不先共用封顶比例。固定 ZZZ-HP 来源没有
 * 洛克茜实体（增益 JSON 全文无 Roxy/洛克茜），按补充实体登记真实身份。
 */
const ROXY_INPUT = "roxy:initial-energy-regen:source"
const roxyInitialEnergyRegenConversion: Supplement = {
  kind: "entity",
  supplementId: "nanoka:agents:1621:initial-energy-regen-conversion",
  source:
    "nanoka-integrated@3.2 agents/1621 /passive/level/1621501—1621507/desc/0",
  optionId: "nanoka:agents:1621:initial-energy-regen-conversion",
  supportedRanks: "核心 1—7",
  computationTarget: "catalog entity + complete-state option (two rules)",
  evidence: agentPassiveEvidence(
    "1621",
    "c2389b7393c05632b298733831b079f8d19dc74f7af54f121f93e9c54134b30e",
    1621501,
  ),
  verification:
    "Nanoka 核心被动七行（agents/1621/details.zh.json 的 /passive/level/1621501—1621507/desc/0 第 2 句，data.json level 元数据 1—7 逐行核对，被动行 name 元数据为核心被动：热夜初拥，英文文件同文核对：第 7 级为 When Roxy's initial Energy Regen exceeds 1.2, for every 0.01 above this value, ATK increases by 5, up to a maximum increase of 960, and Impact increases by 0.4, up to a maximum increase of 76.8）确认：洛克茜的初始能量自动回复大于 1.2 时，超过部分每超过 0.01，攻击力提升 5 点、冲击力提升 0.4 点，最多提升攻击 480/560/640/720/800/880/960 点、冲击 40/46/52/58/64/70/76.8 点（按核心 1—7，逐档字面值，不按最高档线性插值）。固定 ZZZ-HP 增益 JSON 没有任何洛克茜实体或记录，按补充来源创建目录实体（真实 agent 1621/击破/风，weaponType {2:击破}、elementType {204:风属性} 沿 details 官方枚举核验）。输入是显式必填、无默认值的“初始能量自动回复”读数（energy-per-second），按绑定隔离：不读 world 当前回能、不把局内回能增益或音擎面板当初始快照、不由战斗中的 E 误替代。两项输出按连续表达式静态契约：ATK=min(capA, max(0,E−1.2)×500)、Impact=min(capI, max(0,E−1.2)×40)，独立封顶：封顶点按完整读数 E 计，核心 1 的攻击/冲击分别在 E=2.16/2.20（超出量 0.96/1.00），核心 6 在 E=2.96/2.95（超出量 1.76/1.75），非整 0.01 的游戏取整未证，不自行 floor。输出阶段沿既有局内固定点数转化口径（批次 06 琉音 final-fixed 冲击、固定来源 atk/def 点数）采用 attack/impact 的 final-fixed：来源的“初始”限定的是输入读数，未证明输出面板结算阶段，该阶段选择是契约推定，未经游戏实测。两项作为同一完整状态选择（一个变体引用两条规则、共用同一输入），0 层同时关闭、1 层同时生效，不提供单条半状态选项；本补充只覆盖该句条款，同段的风能获取、[特殊技：恕不远送]触发、浸染/净化全队暴伤与锐暴条款及影画不在本次范围，不宣称整角色效果已完整。",
  entity: {
    catalogEntityId: "nanoka:agents:1621",
    upstreamId: null,
    name: "洛克茜",
    identity: { kind: "agent", entityId: "1621" },
    status: "mapped",
    profession: "击破",
    element: "wind",
    supplementProvenance: {
      sourceId: "nanoka-integrated",
      version: "3.2",
      resources: [
        {
          path: "agents/1621/details.zh.json",
          sha256:
            "c2389b7393c05632b298733831b079f8d19dc74f7af54f121f93e9c54134b30e",
        },
        {
          path: "agents/1621/data.json",
          sha256:
            "8a0e467f6cfd8f9d612669a21726730461deddff10d2f5fea088e0ed2bc89aa1",
        },
      ],
    },
  },
  rule: {
    effectId: "agent:1621:nanoka:initial-energy-regen-conversion:attack",
    identity: { kind: "agent", entityId: "1621" },
    section: "核心被动：热夜初拥（初始能量自动回复转化 · 攻击力）",
    config: { kind: "constant", value: true },
    parameters: {
      threshold: { kind: "constant", unit: "energy-per-second", value: -1.2 },
      rate: { kind: "constant", unit: "multiplier", value: 500 },
      cap: coreAttackPoints([480, 560, 640, 720, 800, 880, 960]),
    },
    scope: "entity",
    when: { kind: "constant", value: true },
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
                literal("energy-per-second", 0),
                {
                  kind: "add",
                  unit: "energy-per-second",
                  operands: [
                    {
                      kind: "input",
                      unit: "energy-per-second",
                      name: ROXY_INPUT,
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
            rate: { kind: "parameter", unit: "multiplier", name: "rate" },
          },
          { kind: "parameter", unit: "attack-points", name: "cap" },
        ],
      },
    },
    maximumLayers: 1,
  },
  additionalRules: [
    {
      effectId: "agent:1621:nanoka:initial-energy-regen-conversion:impact",
      identity: { kind: "agent", entityId: "1621" },
      section: "核心被动：热夜初拥（初始能量自动回复转化 · 冲击力）",
      config: { kind: "constant", value: true },
      parameters: {
        threshold: { kind: "constant", unit: "energy-per-second", value: -1.2 },
        rate: { kind: "constant", unit: "multiplier", value: 40 },
        cap: coreImpactPoints([40, 46, 52, 58, 64, 70, 76.8]),
      },
      scope: "entity",
      when: { kind: "constant", value: true },
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
                  literal("energy-per-second", 0),
                  {
                    kind: "add",
                    unit: "energy-per-second",
                    operands: [
                      {
                        kind: "input",
                        unit: "energy-per-second",
                        name: ROXY_INPUT,
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
              rate: { kind: "parameter", unit: "multiplier", name: "rate" },
            },
            { kind: "parameter", unit: "impact-points", name: "cap" },
          ],
        },
      },
      maximumLayers: 1,
    },
  ],
  variant: {
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    inputs: [
      {
        name: ROXY_INPUT,
        unit: "energy-per-second",
        description:
          "initial energyRegen，洛克茜的初始能量自动回复（energy-per-second，显式手工读数，必填且无默认值；是初始值，不含局内回能增益，不用当前回能或音擎面板回能代替）；超过 1.2 的部分每 0.01 攻击力 +5、冲击力 +0.4，按核心档分别封顶（攻击 480—960、冲击 40—76.8 点），低于等于 1.2 贡献 0，越界按表达式钳制，非整 0.01 按连续表达式不自行取整",
      },
    ],
    applicability: {},
    conditionDescription:
      "初始能量自动回复大于 1.2 时，超过部分每 0.01 攻击力提升 5 点、冲击力提升 0.4 点，按核心 1—7 分别封顶（攻击 480/560/640/720/800/880/960 点，冲击 40/46/52/58/64/70/76.8 点）；初始能量自动回复由调用方显式输入（必填、无默认值），两项同时生效或同时关闭，是同一完整状态。本选项只覆盖该句条款，不包含同段其他机制。",
    name: "核心被动 · 初始能量自动回复转化",
    target: "self",
  },
}

/**
 * 绯月银棺（PR07，批次 07）：固定 ZZZ-HP 增益 JSON 没有该音擎（全文无
 * 绯月/Crimson Moon Casket），按补充实体登记真实 w-engine 14162（击破，
 * weaponType {2:击破}）。本条是常驻暴击率：五档 24/26/28/30/32%，持有者
 * 收益；与风抗忽视、触发增伤相互独立选择。
 */
const crimsonMoonCasketCritRate: Supplement = {
  kind: "entity",
  supplementId: "nanoka:w-engines:14162:crit-rate",
  source: "nanoka-integrated@3.2 w-engines/14162 /talents/1—5/desc",
  optionId: "nanoka:w-engines:14162:crit-rate",
  supportedRanks: "精炼 1—5",
  computationTarget: "catalog entity + option",
  evidence: wengineTalentEvidence(
    "14162",
    "bc7c46871ff259a1c249fe62493ff69d22aa279273e084efcb0783bc4f48a456",
  ),
  verification:
    "Nanoka 五档天赋（w-engines/14162/details.zh.json 的 /talents/1—5/desc，英文文件同文核对）逐档确认：装备者暴击率提升 24/26/28/30/32%（按精炼 1—5）。固定 ZZZ-HP 增益 JSON 没有绯月银棺实体，按补充来源创建目录实体（真实 w-engine 14162/击破，weaponType {2:击破} 沿 details 官方枚举核验；职业门槛由目录消费端按装备者职业执行，音擎不限仅洛克茜装备）。暴击率是持有者常驻收益：按既有音擎暴击率契约（青溟笼舍 legacy-self-critRate 同构）进入 criticalRate 的 direct，受益对象是装备者本人，不是全队，也不由任何触发状态开启；不凭此条款赋予属性异常伤害暴击能力（异常暴击是独立通道）。与同实体的风抗忽视、触发增伤选项相互独立，各自分别选择。",
  entity: {
    catalogEntityId: "nanoka:w-engines:14162",
    upstreamId: null,
    name: "绯月银棺",
    identity: { kind: "w-engine", entityId: "14162" },
    status: "mapped",
    profession: "击破",
    element: null,
    supplementProvenance: {
      sourceId: "nanoka-integrated",
      version: "3.2",
      resources: [
        {
          path: "w-engines/14162/details.zh.json",
          sha256:
            "bc7c46871ff259a1c249fe62493ff69d22aa279273e084efcb0783bc4f48a456",
        },
        {
          path: "w-engines/14162/data.json",
          sha256:
            "1a9e005ff93a9479c72da50e19f58b46bf411cc814e08bdd37cbd7681df4e1d1",
        },
      ],
    },
  },
  rule: {
    effectId: "w-engine:14162:nanoka:crit-rate",
    identity: { kind: "w-engine", entityId: "14162" },
    section: "绯月银棺：暴击率",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: { 1: 0.24, 2: 0.26, 3: 0.28, 4: 0.3, 5: 0.32 },
      },
    },
    scope: "entity",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalRate",
      stage: "direct",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "装备者暴击率提升 24/26/28/30/32%（按精炼 1—5）；持有者常驻收益，由调用方选中本选项断言装备生效，不依赖任何触发状态。与风抗忽视、触发增伤相互独立。",
    name: "绯月银棺 · critRate",
    target: "self",
  },
}

/**
 * 绯月银棺（PR07，批次 07）第二条：造成的伤害无视目标 15/17.3/19.5/21.8/24%
 * 风属性伤害抗性。持有者造成的风伤收益，attacker-resistance-ignore 通道；
 * 常驻条款，不附加“EX 造成风伤”触发条件，也不无依据加直伤限制（风抗只
 * 对风伤生效，按命中元素筛选，全伤害种类沿用现有抗性区契约）。
 */
const crimsonMoonCasketWindResIgnore: Supplement = {
  kind: "option",
  supplementId: "nanoka:w-engines:14162:wind-resistance-ignore",
  source: "nanoka-integrated@3.2 w-engines/14162 /talents/1—5/desc",
  catalogEntityId: "nanoka:w-engines:14162",
  optionId: "nanoka:w-engines:14162:wind-resistance-ignore",
  supportedRanks: "精炼 1—5",
  computationTarget: "catalog option on the supplement entity",
  evidence: wengineTalentEvidence(
    "14162",
    "bc7c46871ff259a1c249fe62493ff69d22aa279273e084efcb0783bc4f48a456",
  ),
  verification:
    "Nanoka 五档天赋（w-engines/14162/details.zh.json 的 /talents/1—5/desc，英文文件同文核对：DMG dealt ignores 15/17.3/19.5/21.8/24% of the target's Wind RES）逐档确认：装备者造成的伤害无视目标 15/17.3/19.5/21.8/24% 风属性伤害抗性（按精炼 1—5）。在绯月银棺补充实体（nanoka:w-engines:14162）上新增选项。这是持有者造成的风伤收益：按既有抗穿通道进入 attacker-resistance-ignore，条件只按命中元素筛选（wind，与固定来源 agent:1021 物理 resPen 的元素级条件同构），受益对象是装备者本人，不是目标减抗、不是全队穿抗。风抗忽视只对风属性伤害有意义，因此按 hit.element 筛选即可表达完整范围：普通直伤、贯穿、锐化、异常、紊乱、乱流、耀变等全部风伤种类沿用现有抗性区契约，不无依据加直伤限制；同句“装备者发动[强化特殊技]造成风属性伤害”是第三条触发增伤的取得条件，不是本常驻条款的触发，不附加到本选项。与暴击率、触发增伤选项相互独立。",
  rule: {
    effectId: "w-engine:14162:nanoka:wind-resistance-ignore",
    identity: { kind: "w-engine", entityId: "14162" },
    section: "绯月银棺：风属性伤害抗性无视",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: { 1: 0.15, 2: 0.173, 3: 0.195, 4: 0.218, 5: 0.24 },
      },
    },
    scope: "hit",
    when: {
      kind: "one-of",
      fact: "hit.element",
      values: ["wind"],
    },
    operation: {
      kind: "factor-contribution",
      channel: "attacker-resistance-ignore",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    conditionDescription:
      "装备者造成的伤害无视目标 15/17.3/19.5/21.8/24% 风属性伤害抗性（按精炼 1—5）；持有者的风属性伤害收益（按命中元素筛选，覆盖现有抗性区契约支持的全部风伤种类），常驻条款，不依赖强化特殊技触发。与暴击率、触发增伤相互独立。",
    name: "绯月银棺 · resPen",
    target: "self",
  },
}

/**
 * 绯月银棺（PR07，批次 07）第三条：装备者发动[强化特殊技]造成风属性伤害时，
 * 全队其他角色造成的伤害提升 20/23/26/29/32%，持续 50 秒、重复触发刷新，
 * 伤害提升效果全队唯一。EX+风是取得该状态的条件，由调用方启用选择显式
 * 断言，不当作其他队友当前伤害的元素/技能受益筛选；受益者是同队其他实体
 * （holder 排除、异队排除）；50 秒与刷新不模拟。全队唯一按目录选择阶段的
 * 窄跨绑定约束（squadUniqueEffect）强制：同队最多一个启用来源，调用方声明
 * 单一有效来源，不猜 highest-value 或时间覆盖；引擎层 per-beneficiary
 * uniqueness 分组不能表达该约束（两名持有者互相受益时受益集合不重叠），
 * 不声称由数值引擎强制。同句的失衡值提升（16—25.6%）不做最终失衡输出，
 * 覆盖登记留批次 10。
 */
const crimsonMoonCasketSquadDamageBonus: Supplement = {
  kind: "option",
  supplementId: "nanoka:w-engines:14162:squad-damage-bonus",
  source: "nanoka-integrated@3.2 w-engines/14162 /talents/1—5/desc",
  catalogEntityId: "nanoka:w-engines:14162",
  optionId: "nanoka:w-engines:14162:squad-damage-bonus",
  supportedRanks: "精炼 1—5",
  computationTarget: "catalog option on the supplement entity",
  evidence: wengineTalentEvidence(
    "14162",
    "bc7c46871ff259a1c249fe62493ff69d22aa279273e084efcb0783bc4f48a456",
  ),
  verification:
    "Nanoka 五档天赋（w-engines/14162/details.zh.json 的 /talents/1—5/desc，英文文件同文核对：DMG dealt by all other squad members increases by 20/23/26/29/32%, for 50s. Repeated triggers reset the duration. Only one instance of the DMG increase effect can exist in the same squad）逐档确认：装备者发动[强化特殊技]造成风属性伤害时，全队其他角色造成的伤害提升 20/23/26/29/32%（按精炼 1—5），持续 50 秒，重复触发时刷新持续时间，伤害提升效果全队唯一。在绯月银棺补充实体上新增选项。触发后的增伤仅同队其他实体：规则受益者是 team-except-holder（持有者本人排除、异队排除）；“EX 造成风伤”只是取得该状态的条件，由调用方启用本选项（layers 1）显式断言已触发，不作为其他队友当前伤害的元素或技能受益筛选（增伤作用于受益者的全部伤害种类，与聚宝箱 team dmgBonus 同构）；50 秒持续与重复触发刷新不模拟时间线。“伤害提升效果全队唯一”按目录选择阶段的窄跨绑定约束实现：变体声明 squadUniqueEffect，同一队伍内该选项最多一个启用来源（layers > 0），第二个启用选择返回 CONTEXT_MISMATCH，要求调用方声明单一有效来源（只在一名持有者的绑定上启用），不猜 highest-value 或时间覆盖；0 层关闭与职业不适配的零贡献绑定不占用队伍名额。不能用绑定内 exclusiveGroup 替代（它只按 bindingId 分组），也不能依赖规则级 uniqueness（evaluate.ts 按 key+team+beneficiary+address 分组，两名持有者各受对方增益时受益集合不重叠，无法表达整队唯一），引擎层数值不变。两名持有者各持一份绯月银棺且都触发时，游戏内仅一个实例生效、排除哪名持有者由来源文本未证明，本契约要求调用方按实际单一有效来源声明。同句的失衡值提升 16/18.4/20.8/23.2/25.6% 不做最终失衡输出，覆盖登记留批次 10；与暴击率、风抗忽视两项常驻条款相互独立，团队状态关闭时常驻条款仍可用。",
  rule: {
    effectId: "w-engine:14162:nanoka:squad-damage-bonus",
    identity: { kind: "w-engine", entityId: "14162" },
    section: "绯月银棺：全队增伤（触发状态）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "ratio",
        values: { 1: 0.2, 2: 0.23, 3: 0.26, 4: 0.29, 5: 0.32 },
      },
    },
    scope: "hit",
    when: { kind: "constant", value: true },
    operation: {
      kind: "factor-contribution",
      channel: "damage-bonus",
      value: { kind: "parameter", unit: "ratio", name: "amount" },
    },
    maximumLayers: 1,
    beneficiary: { kind: "team-except-holder" },
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    squadUniqueEffect: true,
    conditionDescription:
      "装备者发动[强化特殊技]造成风属性伤害时，全队其他角色造成的伤害提升 20/23/26/29/32%（按精炼 1—5），持续 50 秒，重复触发刷新持续时间；触发事实由调用方启用本选项断言，50 秒与刷新不模拟。受益者是持有者同队其他角色（本人与异队不受益），增伤不按元素或技能筛选受益者的伤害。伤害提升效果全队唯一：同一队伍最多一个启用来源，须声明单一有效来源（只在一名持有者的绑定上启用）；失衡值提升条款不在本选项。与暴击率、风抗忽视相互独立。",
    name: "绯月银棺 · teamDmgBonus",
    target: "team",
  },
}

/** 直接伤害倍率条款可能出现的固定来源 stat 名；出现即触发重复补充防护。 */
const directMultiplierSourceStats = [
  "directDmgMult",
  "directDmgMultFactor",
] as const

/** 伊芙琳核心被动七行第二句：125% 倍率只提升具名连携与两个终结技。 */
const evelynPassiveNamedSkillMultiplierEvidence = (
  [1, 2, 3, 4, 5, 6, 7] as const
).map((rank) => ({
  path: "agents/1321/details.zh.json",
  pointer: `/passive/level/${1321501 + rank - 1}/desc/1`,
  sha256: "ec99d046c695ada6f090a4da5a38bfe5951552996ead6a85ce7f5385727c8783",
  rank,
}))

/**
 * 伊芙琳（M04，批次 08）：影画 6[光与影的牵绊]的[月辉丝·弦]独立追击。
 * 连携/终结取得[弦影绝锋]后，[普通攻击]、[冲刺攻击]、[特殊技]或[强化特殊
 * 技]命中主要攻击目标时，额外释放一段[月辉丝·弦]，造成等同于伊芙琳 375%
 * 攻击力的火属性伤害，该伤害被视为[连携技]伤害。每次命中结算一次独立
 * 事件；20 秒持续、16 次上限与刷新不模拟，不绑定到任何已有触发动作。
 */
const evelynMindscape6LunaluxGarroteFollowUp: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
  source: "nanoka-integrated@3.2 agents/1321 /talent/6/desc",
  catalogEntityId: "agents:evelyn",
  optionId: "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
  supportedRanks: "影画 6 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 6 的真实锚块（note 完整描述 M6、effects 为空）；块内
  // 或该 rank 任何位置出现直接倍率机器记录、锚块缺失或 note 任何变化
  // （包括保留原文再追加冲突句）都拒绝生成并要求重新核对。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 6,
    stats: directMultiplierSourceStats,
    anchorBlocks: [
      {
        blockId: "blk-ms4jc3w4-9he24i",
        frozenNote:
          "发动[连携技]或[终结技]时，伊芙琳将获得[弦影绝锋]，持续20秒；[弦影绝锋]期间，伊芙琳发动[普通攻击]、[冲刺攻击]、[特殊技]或[强化特殊技]命中主要攻击目标时，将额外释放一段[月辉丝·弦]进行追击，对范围内敌人造成等同于伊芙琳375%攻击力的火属性伤害，该伤害会被视为[连携技]伤害，最多触发16次，再次获得[弦影绝锋]时刷新可触发次数。",
      },
    ],
  },
  skillTarget: {
    targetId: "evelyn-lunalux-garrote",
    agentEntityId: "1321",
    category: "chain",
    name: "月辉丝·弦",
  },
  evidence: [
    {
      path: "agents/1321/details.zh.json",
      pointer: "/talent/6/desc",
      sha256:
        "ec99d046c695ada6f090a4da5a38bfe5951552996ead6a85ce7f5385727c8783",
    },
    ...evelynPassiveNamedSkillMultiplierEvidence,
  ],
  verification:
    "Nanoka 影画 6（agents/1321/details.zh.json 的 /talent/6/desc，英文文件同文核对：she additionally executes a Lunalux Garrote follow-up attack, dealing Fire DMG equal to 375% of her ATK… This DMG is considered Chain Attack DMG and can trigger up to 16 times）确认：发动[连携技]或[终结技]时伊芙琳获得[弦影绝锋]，持续 20 秒；期间[普通攻击]、[冲刺攻击]、[特殊技]或[强化特殊技]命中主要攻击目标时，额外释放一段[月辉丝·弦]进行追击，对范围内敌人造成等同于伊芙琳 375% 攻击力的火属性伤害，该伤害被视为[连携技]伤害，最多触发 16 次，再次获得时刷新次数。固定 ZZZ-HP 来源的影画 6 块（blk-ms4jc3w4-9he24i）只有 note、effects 为空，按补充来源在既有 agents:evelyn 实体新增选项。倍率固定 375%，不随技能等级、核心或潜能变化，不虚造训练倍率行；每次命中结算一次独立事件，16 次上限、20 秒持续与刷新由调用方显式声明，不模拟时间线与次数累计，也不把本目标绑定到任何已有触发动作（普通动作组装不自动追加）。“被视为[连携技]伤害”是文本明确的分类证据：目录为[月辉丝·弦]登记稳定独立目标（upstreamId 为 null），独立项按 chain 分类显式结算，普通连携/终结分类增益正常作用本伤害；核心被动七行（/passive/level/1321501—1321507/desc/1，中英文逐档同文核对）同时证明 125% 倍率只提升[连携技：月辉丝·绊]、[终结技：月辉丝·弦音]与[终结技：月辉丝·弦影]三个具名技能，[月辉丝·弦]不在列表——旧倍率规则对新目标已按具名语义修正排除（见 SOURCE_SEMANTICS 的 evelyn-lunalux-multiplier-scope）。独立结算目标、零初始倍率与逐次声明是本项目采用的独立结算契约，不是原始游戏证据。",
  rule: {
    effectId: "agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6",
    identity: { kind: "agent", entityId: "1321" },
    section: "影画6：光与影的牵绊（月辉丝·弦）",
    config: mindscapeFrom(6),
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 3.75 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        { kind: "one-of", fact: "hit.element", values: ["fire"] },
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
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 6 },
    inputs: [],
    applicability: {},
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
    conditionDescription:
      "影画 6：连携/终结取得[弦影绝锋]后，[普通攻击]、[冲刺攻击]、[特殊技]或[强化特殊技]命中主要攻击目标时，额外释放一段[月辉丝·弦]，对范围内敌人造成等同于伊芙琳 375% 攻击力的火属性伤害（该伤害被视为[连携技]伤害）。本次追击由调用方声明触发并显式结算：命中须携带独立目标并以连携分类结算，16 次上限、20 秒持续与刷新不模拟。",
    name: "影画6 · 月辉丝·弦（独立追击）",
    target: "self",
  },
}

/**
 * 零号·安比（M12，批次 08）：影画 6[前传主角]的电磁涡流独立追加伤害。
 * 触发 6 次[白雷]的额外伤害时引发电磁涡流，对目标及其周围敌人造成零号·
 * 安比 1000% 攻击力的电属性伤害，该伤害被视为[追加攻击]伤害。第六次白雷
 * 引发的是一次涡流：六次计数不自动累计，1000% 不乘 6，也不计作白雷本身。
 */
const s0anbyMindscape6ElectromagneticVortex: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:s0anby:m6-electromagnetic-vortex",
  source: "nanoka-integrated@3.2 agents/1381 /talent/6/desc",
  catalogEntityId: "agents:s0anby",
  optionId: "nanoka:agents:s0anby:m6-electromagnetic-vortex",
  supportedRanks: "影画 6 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 6 的真实空 pack；该位置出现任何新编码即拒绝生成。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 6,
    stats: directMultiplierSourceStats,
    expectsEmptyPack: true,
  },
  skillTarget: {
    targetId: "s0anby-electromagnetic-vortex",
    agentEntityId: "1381",
    category: "follow-up",
    name: "电磁涡流",
    countsAsFollowUp: true,
  },
  evidence: [
    {
      path: "agents/1381/details.zh.json",
      pointer: "/talent/6/desc",
      sha256:
        "600ca2500fb32c4bace09c67b196265e6f33fc276fa43f868f999ca4b416fe61",
    },
  ],
  verification:
    "Nanoka 影画 6（agents/1381/details.zh.json 的 /talent/6/desc，英文文件同文核对：Upon triggering 6 instances of White Thunder's additional DMG, an electromagnetic vortex will be generated, dealing 1,000% of Soldier 0 - Anby's ATK as Electric DMG… This DMG is considered Aftershock DMG）确认：触发 6 次[白雷]的额外伤害时引发电磁涡流，对目标及其周围的敌人造成零号·安比 1000% 攻击力的电属性伤害，该伤害被视为[追加攻击]伤害。固定 ZZZ-HP 来源的影画 6 是真实空 pack，按补充来源在既有 agents:s0anby 实体新增选项。倍率固定 1000%（一次涡流），不随技能等级、核心或潜能变化，不虚造训练倍率行，也不抄[白雷]的技能倍率或把潜能连携分类附条件搬到本目标；第六次白雷额外伤害引发的是本次涡流的单一事件：六次白雷计数不自动累计、1000% 不乘 6、不计作白雷本身，触发事实由调用方声明并显式结算一次，不模拟计数、时间线与次数累计。目录为电磁涡流登记稳定独立目标（upstreamId 为 null），分类为文本明确的[追加攻击]（follow-up）且 countsAsFollowUp=true：命中以 skillTargetIds 选中该目标即展开 zzz-hp:follow-up 标签，能消费目录既有的追加攻击增益，不要求调用方手工补标签；普通/潜能分支的 M6 天赋同一条（与[电极化]等潜能分支条款互不并集）。独立结算目标、零初始倍率与逐次声明是本项目采用的独立结算契约，不是原始游戏证据。",
  rule: {
    effectId: "agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6",
    identity: { kind: "agent", entityId: "1381" },
    section: "影画6：前传主角（电磁涡流）",
    config: mindscapeFrom(6),
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 10 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        { kind: "one-of", fact: "hit.element", values: ["electric"] },
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
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 6 },
    inputs: [],
    applicability: {},
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
    conditionDescription:
      "影画 6：触发 6 次[白雷]的额外伤害时引发电磁涡流，对目标及其周围的敌人造成零号·安比 1000% 攻击力的电属性伤害（该伤害被视为[追加攻击]伤害）。本次涡流由调用方声明触发并显式结算一次：命中须携带独立目标并以追加攻击分类结算（自动计入追加攻击增益），六次计数不自动累计，1000% 不乘 6，也不计作白雷本身。",
    name: "影画6 · 电磁涡流（独立追击）",
    target: "self",
  },
}

/**
 * 琉音（M13，批次 08）：影画 6[真言]的余音额外物理伤害。经[核心被动]使
 * 其他队友以终结技入场后，该队友获得[余音]效果，其攻击命中敌人时琉音对
 * 敌人造成额外一次等同于琉音 480% 攻击力的物理属性伤害，该伤害被视为
 * [强化特殊技]伤害。队友只是触发者：本次伤害按琉音面板与强化特殊技
 * 分类结算，hit.actorId 是琉音，不把余音队友伪装为该次伤害者。
 */
const dialynMindscape6AftertoneEcho: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:dialyn:m6-aftertone-echo",
  source: "nanoka-integrated@3.2 agents/1481 /talent/6/desc",
  catalogEntityId: "agents:dialyn",
  optionId: "nanoka:agents:dialyn:m6-aftertone-echo",
  supportedRanks: "影画 6 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 6 的真实空 pack；该位置出现任何新编码即拒绝生成。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 6,
    stats: directMultiplierSourceStats,
    expectsEmptyPack: true,
  },
  skillTarget: {
    targetId: "dialyn-aftertone-echo",
    agentEntityId: "1481",
    // 目录既有强化特殊技技能目标（如 all-special-ms0fcqv7）的分类均为归一
    // 大类 special；独立目标同用该分类，命中即展开 zzz-hp:category:special，
    // 既有强化特殊技分类增益正常作用；独立项的结算分类仍声明
    // enhanced-special（求值别名归一到 special，同一标签）。
    category: "special",
    name: "余音额外伤害",
  },
  evidence: [
    {
      path: "agents/1481/details.zh.json",
      pointer: "/talent/6/desc",
      sha256:
        "c335486522cb3958f1430551fb07616364cd01f13cbe988c7bde6d21a41ca3ed",
    },
  ],
  verification:
    "Nanoka 影画 6（agents/1481/details.zh.json 的 /talent/6/desc，英文文件同文核对：With this effect, landing an attack causes Dialyn to deal an additional instance of Physical DMG equal to 480% of Dialyn's ATK. This DMG is treated as EX Special Attack DMG）确认：通过[核心被动]使其他队友以终结技入场后，该队友获得[余音]效果，其攻击命中敌人时琉音对敌人造成额外一次等同于琉音 480% 攻击力的物理属性伤害，该伤害被视为[强化特殊技]伤害，1 秒内最多触发一次，最多触发 12 次，重复获得时刷新次数，同时只能有一名队友获得[余音]。固定 ZZZ-HP 来源的影画 6 是真实空 pack，按补充来源在既有 agents:dialyn 实体新增选项。倍率固定 480%，按琉音自身面板结算：结算请求的 hit.actorId 与伤害项 statSource 都是琉音，队友只是触发者而不是该次伤害者或面板来源，不把余音队友的面板、攻击或暴击数据串用到本次伤害；普通/潜能分支的 M6 天赋同一条。触发事实（队友经核心被动终结入场取得[余音]且其攻击命中）由调用方声明并显式结算一次：1 秒冷却、12 次上限、刷新与唯一余音持有人不模拟，不把本目标绑定到队友的动作（队友动作解析不自动追加）。目录为余音额外伤害登记稳定独立目标（upstreamId 为 null），分类为文本明确的[强化特殊技]：目录目标分类沿既有强化特殊技技能目标（如 all-special-ms0fcqv7）的归一大类 special，独立项的结算分类声明 enhanced-special（求值别名归一到 special，同一标签），独立项按强化特殊技分类结算，现有强化特殊技分类增益正常作用本伤害。独立结算目标、零初始倍率与逐次声明是本项目采用的独立结算契约，不是原始游戏证据。",
  rule: {
    effectId: "agent:1481:nanoka:m6-aftertone-echo:mindscape:6",
    identity: { kind: "agent", entityId: "1481" },
    section: "影画6：真言（余音额外伤害）",
    config: mindscapeFrom(6),
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 4.8 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        { kind: "one-of", fact: "hit.element", values: ["physical"] },
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
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 6 },
    inputs: [],
    applicability: {},
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
    conditionDescription:
      "影画 6：经[核心被动]使队友以终结技入场取得[余音]后，该队友攻击命中敌人时，琉音对敌人造成额外一次等同于琉音 480% 攻击力的物理属性伤害（该伤害被视为[强化特殊技]伤害）。本次伤害由调用方声明触发并显式结算：hit.actorId 与伤害项均按琉音结算（队友只是触发者），命中须携带独立目标并以强化特殊技分类结算；1 秒冷却、12 次上限、刷新与唯一持有人不模拟。",
    name: "影画6 · 余音（独立追击）",
    target: "self",
  },
}

/** 异放乘区 stat 家族：影画 6[颤音：改]结算比例的未来机器编码会命中。 */
const anomalyReleaseMultiplierStats = [
  "anomalyReleaseMult",
  "anomalyReleaseMultFactor",
] as const

/** 南宫羽影画 6 空块的冻结完整 note（实际空块：note 完整、effects 为空）。 */
const nangongyuMindscape6FrozenNote =
  "当敌人进入失衡状态时，[颤音：改]会被全部清除，[颤音：改]被清除时，若敌人处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态下，南宫羽会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为800%/400%/1000%/70%/100%/40%，敌人身上每有1层[颤音：改]，该次[异放]的伤害比例额外提升25%；[颤音：改]与[颤音]无法相互叠加。"

/** 南宫羽影画 6 的完整状态层数桥接输入名（按元素分组各一条，互不冲突）。 */
const nangongyuMindscape6LayerInput = (group: string) =>
  `nanoka:agents:nangongyu:m6-vibrato-modified-${group}:layers`

/**
 * 南宫羽（M03，批次 09）：影画 6[天使的妄想]的[颤音：改]一次异放结算。
 * 敌人不处于失衡时按所列事件累计、最多 4 层；进入失衡时全部清除，清除时
 * 若存在原属性异常则结算一次。每层把基础结算比例再提升 25%（不是每层多
 * 一次异放，也不是复利）；0 层关闭，有效层严格整数 1—4。倍率 = 原异常
 * 系数 × M6 比例（固定提交 publicAnomalySkills.ts 的系数表，五非物理属性
 * 归一为 5、物理 7.13×0.7=4.991），完整倍率由规则按 count 桥接一次赋值。
 * 两个元素分组选项共用同一独立结算目标与伤害项，按 hit.element 裁决。
 */
const nangongyuMindscape6VibratoModified = (
  group: "nonphysical" | "physical",
): Supplement => ({
  kind: "option",
  supplementId: `nanoka:agents:nangongyu:m6-vibrato-modified-${group}`,
  source: "nanoka-integrated@3.2 agents/1511 /talent/6/desc",
  catalogEntityId: "agents:nangongyu",
  optionId: `nanoka:agents:nangongyu:m6-vibrato-modified-${group}`,
  supportedRanks: "影画 6 及以上；层数 0—4（0 关闭，有效层 1—4）",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 6 的真实空块；该 rank 任何位置出现异放乘区家族的
  // 机器记录、锚块缺失或 note 任何变化（包括保留原文再追加冲突句）都
  // 拒绝生成并要求重新核对。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 6,
    stats: anomalyReleaseMultiplierStats,
    anchorBlocks: [
      {
        blockId: "blk-ms4dtzxa-touyxm",
        frozenNote: nangongyuMindscape6FrozenNote,
      },
    ],
  },
  // 独立结算目标只登记一次：两个元素分组选项共用同一[颤音：改]结算身份。
  ...(group === "nonphysical"
    ? {
        skillTarget: {
          targetId: "nangongyu-vibrato-modified",
          agentEntityId: "1511",
          // 异放结算是显式结算事件，不属于任何技能大类；沿[超凶爪印]/
          // 微域气旋等独立目标的 uncategorized 分类契约，不据此冒充游戏
          // 技能分类证据。
          category: "uncategorized" as SkillCategory,
          name: "颤音：改异放结算",
        },
      }
    : {}),
  evidence: [
    {
      path: "agents/1511/details.zh.json",
      pointer: "/talent/6/desc",
      sha256:
        "623a202f3d6b33c5c32d2ef6958595d02f0649cd76e57679858108b753a262b8",
    },
  ],
  verification:
    group === "nonphysical"
      ? "Nanoka 影画 6（agents/1511/details.zh.json 的 /talent/6/desc，英文文件同文核对：When the enemy is not Stunned … the enemy gains 1 stacks of Vibrato: Modified … Vibrato: Modified can stack up to 4 times. When the enemy becomes Stunned, all Vibrato: Modified stacks are cleared. When Vibrato: Modified is cleared, if the enemy is under an Ether, Electric, Fire, Physical, Ice, or Wind Anomaly, Nangong Yu triggers an instance of Abloom DMG … equal to 800%/400%/1,000%/70%/100%/40% of the original Attribute Anomaly DMG. Each stack … increases this Abloom DMG ratio by an additional 25%. Vibrato: Modified cannot stack with Vibrato）确认：敌人不处于失衡时按所列事件累计[颤音：改]、最多 4 层；进入失衡时全部清除，清除时若敌人处于六种原属性异常之一，南宫羽结算一次[异放]伤害，比例为原属性异常伤害的以太 800%/电 400%/火 1000%/物理 70%/冰 100%/风 40%，每层再提升该比例的 25%；[颤音：改]与[颤音]无法相互叠加。固定 ZZZ-HP 来源的影画 6 块（blk-ms4dtzxa-touyxm）note 完整、effects 为空，是实际空块而不是缺失实体，按补充来源在既有 agents:nangongyu 实体新增选项。倍率归一推导：固定提交 zzz-hp/src/utils/publicAnomalySkills.ts（blob eb7ffa39，整文件 SHA-256 336a5578…，注释明确倍率不额外 ×10/×20）给出原异常系数 以太 62.5%/电 125%/火 50%/物理 713%/冰 500%/风 1250%，与 M6 比例相乘得 以太 5/电 5/火 5/冰 5/风 5、物理 7.13×0.7=4.991（保留精度，不四舍五入为 5，也不是旧 M0 的 4.49）；该推导是二者结合的静态归一，未经游戏实测。本选项覆盖五种非物理原异常（以太/电/火/冰/风），按 hit.element 匹配；物理走同组的 physical 选项，两组互不叠加、由元素裁决，同启两组时仅元素命中者贡献。结算契约：调用方声明[颤音：改]已被清除且存在原属性异常的本次事件与有效层数（selection.layers 0 关闭、严格整数 1—4，由目录层数桥接派生 count 输入），hit 携带独立目标并以 anomaly-settlement 伤害种类结算；伤害项（nangongyu:vibrato-modified、attack、base、direct）damageMultiplier 必须为 0，完整倍率 5×(1+0.25×L) 由本规则一次赋值——原异常系数已并入归一基础值，不存在第二次乘/加系数；statSource 必须与 damage.anomalySource 的实体/快照一致，异放复用原异常虚拟来源的攻击、异常精通、等级、穿透与已声明快照，南宫羽只是本次效果持有者与结算角色，不因此改用她的实时面板。天赋倍率与核心/特殊技培养档位无关，不设核心档位限制；风属性经 hit.element=wind 真实可算，不据此声称标准风紊乱已支持（标准紊乱七值来源不含 wind，本登记不使用 originalAnomalyAttribute 元数据也不改其枚举）。旧 M0/M2 普通颤音规则经具名修正排除本独立目标（见 SOURCE_SEMANTICS 的 nangongyu-vibrato-modified-exclusivity），普通颤音结算保持原行为。首句失衡值 +50%、累计事件的具体层数（重击 +1/+2）与清空时序不做最终输出，留批次 10 登记；独立结算目标、零初始倍率、逐次声明与 uncategorized 独立分类要求（要求项声明 requiredSkillCategory，借用普通/连携/追加攻击分类、保留分类标签或混入其他真实目标的命中按最终有效分类冲突拒绝，独立异放不吃按技能分类筛选的增益）是本项目采用的独立结算契约，不是原始游戏证据。"
      : "同 nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical 的登记与归一推导：物理原异常的 M6 比例为 70%、原异常系数 7.13（固定提交 publicAnomalySkills.ts，物理属性异常 713%），归一基础倍率 7.13×0.7=4.991——保留精度，不四舍五入为 5，也不是旧 M0 物理来源项的 4.49；每层仍 +25% 基础比例（4.991×(1+0.25×L)，L=1—4 依次 6.23875/7.4865/8.73425/9.982）。固定来源影画 6 空块守卫、独立结算目标、层数桥接、anomaly-source 快照契约、uncategorized 独立分类要求、与普通颤音的互斥排除及留批次 10 的边界同 nonphysical 选项逐字适用；本选项只覆盖物理原异常（hit.element=physical），与非物理分组互不叠加、由元素裁决。",
  rule: {
    effectId: `agent:1511:nanoka:m6-vibrato-modified-${group}:mindscape:6`,
    identity: { kind: "agent", entityId: "1511" },
    section: "影画6：天使的妄想（颤音：改异放）",
    config: mindscapeFrom(6),
    parameters: {},
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
          values:
            group === "nonphysical"
              ? ["ether", "electric", "fire", "ice", "wind"]
              : ["physical"],
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
          value: group === "nonphysical" ? 5 : 4.991,
        },
        coefficient: {
          kind: "add",
          unit: "ratio",
          operands: [
            { kind: "literal", unit: "ratio", value: 1 },
            {
              kind: "convert",
              unit: "ratio",
              input: {
                kind: "input",
                unit: "count",
                name: nangongyuMindscape6LayerInput(group),
              },
              rate: { kind: "literal", unit: "multiplier", value: 0.25 },
            },
          ],
        },
      },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 6 },
    layerCountInputName: nangongyuMindscape6LayerInput(group),
    layerCountMaximumLayers: 4,
    inputs: [],
    applicability: {},
    damageItemRequirements: [
      {
        itemId: "nangongyu:vibrato-modified",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "anomaly-source",
        requiredDirectMultiplier: 0,
        // round1 修复 R01：独立结算分类契约。目标元数据的 uncategorized
        // 只负责标签展开；这里显式声明 requiredSkillCategory 复用既有
        // 最终有效分类守卫——原始分类、保留分类标签、合法目标展开的分类
        // 与追加攻击标签都参与比较，借用普通/连携/追加攻击分类或混入其他
        // 真实目标的命中按 CONTEXT_MISMATCH 拒绝，独立异放不吃按技能分类
        // 筛选的增益。
        requiredSkillCategory: "uncategorized",
      },
    ],
    conditionDescription:
      group === "nonphysical"
        ? "影画 6：敌人不处于失衡时按所列事件累计[颤音：改]（最多 4 层），进入失衡时全部清除；清除时若存在原属性异常，南宫羽结算一次[异放]伤害，基础比例 = 原异常系数 × M6 比例（以太/电/火/冰/风归一为 5），每层再 +25%。本选项覆盖五种非物理原异常，按本次结算声明的命中元素匹配（物理走同组的物理选项）。调用方声明本次清除事件与有效层数（selection.layers：0 关闭、严格整数 1—4）：命中以 uncategorized 分类携带独立目标、以 damage.kind=anomaly-settlement 结算，伤害项倍率从 0 开始由规则一次赋值，statSource 与 damage.anomalySource 一致（复用原异常虚拟来源与快照）；携带其他技能分类/分类标签/其他真实目标按冲突拒绝。"
        : "影画 6：敌人不处于失衡时按所列事件累计[颤音：改]（最多 4 层），进入失衡时全部清除；清除时若存在原属性异常，南宫羽结算一次[异放]伤害，基础比例 = 原异常系数 × M6 比例（物理 7.13×0.7=4.991，保留精度），每层再 +25%。本选项只覆盖物理原异常（hit.element=physical），非物理原异常走同组的非物理选项。调用方声明本次清除事件与有效层数（selection.layers：0 关闭、严格整数 1—4）：命中以 uncategorized 分类携带独立目标、以 damage.kind=anomaly-settlement 结算，伤害项倍率从 0 开始由规则一次赋值，statSource 与 damage.anomalySource 一致（复用原异常虚拟来源与快照）；携带其他技能分类/分类标签/其他真实目标按冲突拒绝。",
    name:
      group === "nonphysical"
        ? "影画6 · 颤音：改（非物理异放结算）"
        : "影画6 · 颤音：改（物理异放结算）",
    target: "self",
  },
})

/**
 * 批次 10（PR10）：未支持增益条款的覆盖登记。为本任务已审计、但当前公开
 * 静态伤害计算不承诺的条款提供目录可发现、带具体说明、显式选中明确拒绝的
 * 不可选登记。不创建规则、不新增失衡值/积蓄量/即时资源/护盾/承伤公式，
 * 不把这些量映射成 impact/dmgBonus/energyRegen 等其他量，也不以零贡献冒充
 * 支持；既有已支持的伤害、属性与每秒回能选项逐身份保留。
 */
const pr10DriveDiscBoundaries: readonly Supplement[] = [
  {
    kind: "unsupported-option",
    supplementId: "nanoka:drive-discs:31200:four-piece-daze-value",
    source: "nanoka-integrated@3.2 drive-discs/31200 /desc4",
    catalogEntityId: "drive-discs:SuitShockstarDisco",
    optionId: "nanoka:drive-discs:31200:four-piece-daze-value",
    name: "4件套 · dazeValue",
    conditionDescription:
      "[普通攻击]、[冲刺攻击]、[闪避反击]对主要攻击目标造成的失衡值提升20%。",
    target: "self",
    configuration: { minimumSetPieces: 4 },
    reason: "formula-out-of-scope",
    explanation:
      "四件套条款为[普通攻击]、[冲刺攻击]、[闪避反击]对主要攻击目标造成的失衡值提升20%。这是失衡值（daze）加成，不是冲击力、攻击力或伤害加成；完整静态入口的 daze-only 分支不计算最终失衡值，当前没有已核实的失衡值乘区。装备该套装 4 件及以上时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    supportedRanks: "4 件起（不可选）",
    computationTarget:
      "declared unavailable option on the mapped drive-disc entity",
    evidence: [
      {
        path: "drive-discs/31200/details.zh.json",
        pointer: "/desc4",
        sha256:
          "109364e29c3ce07041963bfde98a39344645c8cfc59d32d7189e3e36bed7ee82",
      },
    ],
    verification:
      "Nanoka drive-discs/31200 /desc4 原文与固定来源 fac62407 的四件套块（/driveDiscs/28/fourPieceBuffs/effectBlocks/0，note 同文、effects 为空）核实：4pc 为[普通攻击]、[冲刺攻击]、[闪避反击]对主要攻击目标造成的失衡值提升20%（动作范围与主要攻击目标由原文给出，不据简称猜）。本批不新增最终失衡值公式，也不把它映射为 impact 或任何伤害乘区；登记为 formula-out-of-scope 的不可选变体，供覆盖注册表与调用方得到明确解释。",
  },
  {
    kind: "unsupported-option",
    supplementId:
      "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
    source: "nanoka-integrated@3.2 drive-discs/31300 /desc4",
    catalogEntityId: "drive-discs:SuitFreedomBlues",
    optionId: "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
    name: "4件套 · anomalyBuildupResistance",
    // 四件套 note 守卫要求公开条件与来源 note 逐字一致；受益范围按结构化
    // target=team 表达（对象侧减益对全队积蓄有效），子条款限制见说明。
    conditionDescription:
      "[强化特殊技]命中敌人时，根据装备者的属性类型，使目标对应属性异常积蓄抗性降低20%，持续8秒，相同属性类型的效果不可叠加。",
    target: "team",
    configuration: { minimumSetPieces: 4 },
    reason: "formula-out-of-scope",
    explanation:
      "四件套条款为[强化特殊技]命中敌人时，根据装备者的属性类型，使目标对应属性异常积蓄抗性降低20%（持续8秒，相同属性类型的效果不可叠加）。这是作用在目标上的属性异常积蓄抗性减益（积蓄量方向，受益范围是全队而非仅装备者的积蓄），不是异常精通、减防或易伤；当前公开静态伤害计算不计算异常积蓄量，也没有已核实的积蓄抗性乘区。装备该套装 4 件及以上时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    supportedRanks: "4 件起（不可选）",
    computationTarget:
      "declared unavailable option on the mapped drive-disc entity",
    evidence: [
      {
        path: "drive-discs/31300/details.zh.json",
        pointer: "/desc4",
        sha256:
          "f7936957a70b83abe7661006f25fa4c5256bb2e7bac64d157989cb078f6852b6",
      },
    ],
    verification:
      "Nanoka drive-discs/31300 /desc4 原文与固定来源 fac62407 的四件套块（/driveDiscs/23/fourPieceBuffs/effectBlocks/0，note 同文、effects 为空）核实：4pc 触发为[强化特殊技]命中敌人（受益范围是目标对应属性异常积蓄抗性，按装备者属性类型），持续时间 8 秒、相同属性类型不可叠加均由原文给出。本批不新增异常积蓄量/积蓄抗性公式，也不把它折算为异常精通、目标防御或易伤；登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:drive-discs:31500:four-piece-damage-taken-reduction",
    source: "nanoka-integrated@3.2 drive-discs/31500 /desc4",
    catalogEntityId: "drive-discs:SuitSoulRock",
    optionId: "nanoka:drive-discs:31500:four-piece-damage-taken-reduction",
    name: "4件套 · damageTakenReduction",
    conditionDescription:
      "受到敌方攻击并损失生命值时，装备者受到的伤害降低40%，持续2.5秒，15秒内最多触发一次。",
    target: "self",
    configuration: { minimumSetPieces: 4 },
    reason: "formula-out-of-scope",
    explanation:
      "四件套条款为受到敌方攻击并损失生命值时，装备者受到的伤害降低40%（持续2.5秒，15秒内最多触发一次）。这是己方承伤方向；当前公开静态伤害计算计算己方对敌伤害，不能把它写成目标的减易伤——damage-taken-reduction 通道的语义是“受击方=本次伤害目标”，用在持有者身上会错误降低己方输出。装备该套装 4 件及以上时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    supportedRanks: "4 件起（不可选）",
    computationTarget:
      "declared unavailable option on the mapped drive-disc entity",
    evidence: [
      {
        path: "drive-discs/31500/details.zh.json",
        pointer: "/desc4",
        sha256:
          "bdf81529b0dad0bb91f0a7b6b14484af3b9b31ead6841103c177563aed101c0c",
      },
    ],
    verification:
      "Nanoka drive-discs/31500 /desc4 原文核实：4pc 触发为受到敌方攻击并损失生命值，装备者受到的伤害降低40%，持续2.5秒，15秒内最多触发一次；固定来源 fac62407 的该位置没有四件套块/机器记录（fourPieceBuffs.effectBlocks 为空、effects 为空、mods 全零），本登记据此声明真实缺失。不把它转换为目标减易伤或其他乘区，也不记为零贡献冒充接入；登记为 formula-out-of-scope 的不可选变体。",
  },
]

interface Pr10WEngineBoundarySpec {
  readonly entityId: string
  /** 固定来源目录实体 ID 使用来源实体名（如 w-engines:Lunar_Noviluna）。 */
  readonly catalogName: string
  readonly sha256: string
  readonly slug: string
  readonly name: string
  readonly conditionDescription: string
  readonly explanation: string
  readonly verification: string
  readonly conflictingSourceStats?: readonly string[]
  /**
   * 受益范围（缺省 self）：源文字明确队友/全队或对象侧受益的条款按 team
   * 概括，文字仍保留子条款限制；归属未确认的资源不推断改写。
   */
  readonly target?: "self" | "team"
}

/** 音擎五档越界登记（S05）：即时能量/喧响/承伤/能量获得效率/秽息/失衡。 */
const pr10WEngineBoundarySpecs: readonly Pr10WEngineBoundarySpec[] = [
  {
    entityId: "12003",
    catalogName: "Lunar_Noviluna",
    sha256: "2f6ce555847c472d952f5d7f37d31e63cb23aabf6acafe6ee13c90a54688cf52",
    slug: "ex-energy-recovery",
    name: "新月 · instantEnergy",
    conditionDescription:
      "发动[强化特殊技]时，装备者回复3/3.5/4/4.5/5点能量，12秒内最多触发一次。",
    explanation:
      "五档天赋为发动[强化特殊技]时装备者回复3/3.5/4/4.5/5点能量（12秒内最多触发一次）。这是即时能量（资源回复）方向，不是每秒自动回能（Energy Regen）、不是能量获得效率；当前公开静态伤害计算不输出即时资源。不把它折算成 energyRegen、增伤或任何伤害乘区，也不记为零贡献冒充接入。装备该音擎时静态计算正常进行，显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/12003/details.zh.json 的 /talents/1—5/desc，英文同文为 generates 3/3.5/4/4.5/5 Energy）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空，本批核对时无任何机器效果记录。即时资源不在当前公开静态伤害计算承诺范围；登记为 formula-out-of-scope 的不可选变体，不新增资源公式、不映射为每秒回能。",
  },
  {
    entityId: "12012",
    catalogName: "Magnetic_Storm_Charlie",
    sha256: "45271f96bb6ee1b6bcb1ad2eeef692f4370019e15777cf4806432d306218014b",
    slug: "anomaly-triggered-energy-recovery",
    name: "过载电荷 · instantEnergy",
    conditionDescription:
      "队伍中任意角色对敌人施加属性异常效果时，装备者回复3.5/4/4.5/5/5.5点能量，12秒内最多触发一次。",
    explanation:
      "五档天赋为队伍中任意角色对敌人施加属性异常效果时装备者回复3.5/4/4.5/5/5.5点能量（12秒内最多触发一次）。这是即时能量（资源回复）方向与队友触发的取得条件，不是每秒自动回能或能量获得效率；当前公开静态伤害计算不输出即时资源。不把它折算成 energyRegen、异常增伤或任何伤害乘区，也不记为零贡献冒充接入。装备该音擎时静态计算正常进行，显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/12012/details.zh.json 的 /talents/1—5/desc，英文同文为 Whenever a squad member inflicts an Attribute Anomaly on an enemy, the equipper generates 3.5/4/4.5/5/5.5 Energy）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。取得条件（任意角色施加属性异常）由原文给出，不据此扩大或收缩受益范围；即时资源不在当前公开静态伤害计算承诺范围，登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    entityId: "13002",
    catalogName: "Slice_Of_Time",
    sha256: "bd6450e90efb54b2291039d9b312039f3329220d5b58fff7f7360fff3fe0b09e",
    slug: "decibel-and-energy-generation",
    name: "说「茄子」 · decibelAndInstantEnergy",
    conditionDescription:
      "队伍中任意角色发动[闪避反击]/[强化特殊技]/[支援攻击]/[连携技]时，额外获得20/23/26/29/32、25/28.5/32/35.5/40、30/34.5/39/43.5/48、35/40/45/50/55点喧响值，并为装备者回复0.7/0.8/0.9/1/1.1点能量（按精炼 1—5），12秒内最多触发一次，不同招式分别结算冷却时间，同名被动效果之间不可叠加。",
    explanation:
      "五档天赋为队伍中任意角色发动[闪避反击]/[强化特殊技]/[支援攻击]/[连携技]时额外获得喧响值（四类招式各自取值）并为装备者回复0.7/0.8/0.9/1/1.1点能量（12秒内最多触发一次、各招式独立冷却、同名被动不可叠加）。喧响值（Decibel）与即时能量都是资源方向，不是每秒自动回能与能量获得效率；当前公开静态伤害计算不输出这两类资源。不把它们折算成 energyRegen、喧响生成率、增伤或任何伤害乘区，也不记为零贡献冒充接入。装备该音擎时静态计算正常进行，显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/13002/details.zh.json 的 /talents/1—5/desc，英文同文为 generates 20/25/30/35 more Decibels … generates 0.7 Energy for the equipper，逐档 23/28.5/34.5/40、26/32/39/45、29/35.5/43.5/50、32/40/48/55 与 0.8/0.9/1/1.1）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。动作范围、触发、12 秒冷却与逐招独立冷却、同名不可叠加均按原文登记；即时资源与喧响值不在当前公开静态伤害计算承诺范围，登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    entityId: "13011",
    catalogName: "Spring_Embrace",
    sha256: "7a1f903fc6ae49c90a3db86ecd9883d017440f73742aee2e4f49bda239d898ca",
    slug: "damage-taken-and-energy-generation-rate",
    name: "热泉汤 · damageTakenAndEnergyGenerationRate",
    // 混合范围：减伤属于装备者，能量获得效率明确转交新的前场角色，按 team
    // 概括并在 conditionDescription 保留子条款限制（不扩公共枚举）。
    target: "team",
    conditionDescription:
      "受到的伤害降低7.5/8.5/9.5/10.5/12%（按精炼 1—5，该段仅装备者受益）；受到敌方攻击时，装备者的能量获得效率提升10/11.5/13/14.5/16%，持续12秒；装备者换回后场时，该增益效果将传递给当前操作中的角色，并刷新持续时间，同名被动效果之间不可叠加——效率条款的受益范围随传递覆盖前场角色，故整体按 team 概括、子条款限制见本说明。",
    explanation:
      "五档天赋包含两个方向：受到的伤害降低7.5/8.5/9.5/10.5/12%是己方承伤方向，不能写成目标减易伤（damage-taken-reduction 通道语义是受击方=本次伤害目标）；受到敌方攻击时的能量获得效率提升10/11.5/13/14.5/16%（持续12秒、换回后场时传递并刷新、同名不可叠加）属于能量获得效率区（Energy Generation Rate），与每秒自动回能（Energy Regen）和即时能量都是不同的量，当前公开静态计算不输出该效率区。本批不新增该公式，也不把它折算成固定/百分比每秒回能、即时能量或任何伤害乘区，不记为零贡献冒充接入。装备该音擎时静态计算正常进行，显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/13011/details.zh.json 的 /talents/1—5/desc，英文同文为 Reduces DMG taken by 7.5% … the equipper's Energy Generation Rate increases by 10% for 12s … transferred to the new on-field character with its duration refreshed）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空；登记时额外核对当前机器词表没有该条款的编码，若上游把该条编成每秒回能（energyRegen）等已有 stat，conflictingSourceStats 守卫会拒绝生成并要求重新核对。受伤降低与能量获得效率均不在当前公开静态伤害计算承诺范围，登记为 formula-out-of-scope 的不可选变体。",
    conflictingSourceStats: ["energyRegen"],
  },
  {
    entityId: "13016",
    catalogName: "Reel_Projector",
    sha256: "a3b2ef0f4a3f9b1a07017cfa6eb012d152a545c9a728fb1424d5d936c8ccde26",
    slug: "damage-taken-and-miasma-contamination",
    name: "镌刻倏忽 · damageTakenAndMiasmaContamination",
    // 任一满足生命值门槛的队友受益，按 team 概括。
    target: "team",
    conditionDescription:
      "队伍中角色生命值大于等于50%时，受到的伤害降低7.5/8.6/9.7/10.8/12%，受到的[秽息浸染]值降低10/11.5/13/14.5/16%（按精炼 1—5），该效果全队唯一；受益者是生命值达标的队友（不限于装备者）。",
    explanation:
      "五档天赋为队伍中角色生命值大于等于50%时受到的伤害降低7.5/8.6/9.7/10.8/12%、受到的[秽息浸染]值降低10/11.5/13/14.5/16%（该效果全队唯一）。受伤降低是己方承伤方向；[秽息浸染]值不是伤害乘区（core 的秽盾削减值/效率是另一机制），当前公开静态伤害计算不输出这两项。不把它们折算成目标减易伤、防御调整、各类增伤或零贡献，也不新增公式。装备该音擎时静态计算正常进行，显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/13016/details.zh.json 的 /talents/1—5/desc，英文同文为 they take 7.5% less DMG, and 10% less Miasma Contamination … Only one instance of this effect can exist in the same squad；逐档 8.6/9.7/10.8 与 11.5/13/14.5 按档核对）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。生命值门槛与全队唯一均按原文登记、由调用方断言；登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    entityId: "12008",
    catalogName: "Vortex_Arrow",
    sha256: "961a9e97aea4d2476f9f2570a4c8394088e86f3ede0e206fdddb050d0168fdbd",
    slug: "daze-on-main-target",
    name: "巨浪 · dazeValue",
    conditionDescription:
      "攻击命中敌人时，装备者对主要攻击目标造成的失衡值提升8/9/10/11/12%（按精炼 1—5）。",
    explanation:
      "五档天赋为攻击命中敌人时装备者对主要攻击目标造成的失衡值提升8/9/10/11/12%。这是失衡值（daze）加成，不是冲击力、攻击力或伤害加成；完整静态入口的 daze-only 分支不计算最终失衡值，当前没有已核实的失衡值乘区。装备该音擎时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/12008/details.zh.json 的 /talents/1—5/desc，英文同文为 The equipper's attacks inflict 8% more Daze on their main target）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。动作范围（攻击命中、主要攻击目标）按原文登记；登记为 formula-out-of-scope 的不可选变体，不映射为 impact 或任何伤害乘区。",
  },
  {
    entityId: "12007",
    catalogName: "Vortex_Revolver",
    sha256: "06c4185be93eb398856e53e84d31f630da93b4a19d4c44180892e9fbec68906f",
    slug: "ex-daze",
    name: "暗涌 · dazeValue",
    conditionDescription:
      "[强化特殊技]造成的失衡值提升10/11.5/13/14.5/16%（按精炼 1—5）。",
    explanation:
      "五档天赋为[强化特殊技]造成的失衡值提升10/11.5/13/14.5/16%。这是失衡值（daze）加成，不是冲击力、攻击力或伤害加成；完整静态入口的 daze-only 分支不计算最终失衡值。装备该音擎时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/12007/details.zh.json 的 /talents/1—5/desc，英文同文为 EX Special Attacks inflict 10% more Daze）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。受益招式范围（强化特殊技）按原文登记；登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    entityId: "14003",
    catalogName: "Six_Shooter",
    sha256: "72049744c5cfe643bff5ed1921ced8ad548d52156429b85b0d90b243350b4f05",
    slug: "charge-consumed-daze",
    name: "开火！ · chargeConsumedDaze",
    conditionDescription:
      "每3秒为装备者提供1层充能效果，最多叠加6层；发动[强化特殊技]时，消耗所有充能，每层充能效果使招式造成的失衡值提升4/4.6/5.2/5.8/6.4%（按精炼 1—5）。",
    explanation:
      "五档天赋为每3秒提供1层充能（最多6层）并在发动[强化特殊技]时消耗所有充能，每层使招式造成的失衡值提升4/4.6/5.2/5.8/6.4%。充能取得是时间线机制（不模拟）；失衡值是 daze 加成，不是冲击力、攻击力或伤害加成，完整静态入口的 daze-only 分支不计算最终失衡值。装备该音擎时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/14003/details.zh.json 的 /talents/1—5/desc，英文同文为 gains 1 Charge stack every 3s, stacking up to 6 times … each stack consumed increases the skill's Daze inflicted by 4%）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。充能层数与每层值按原文登记，静态入口不自动按时间供层；登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    entityId: "13006",
    catalogName: "Precious_Fossilized_Core",
    sha256: "f7c6ab49fe4b785dc3002d4753b935353bd7723d6e863b58c71a8bd39334e3d2",
    slug: "target-hp-daze",
    name: "巨兽猎手 · dazeValue",
    conditionDescription:
      "敌方生命值大于等于50%时，装备者对目标造成的失衡值提升10/11.5/13/14.5/16%；敌方生命值大于等于75%时，该增益效果额外提升10/11.5/13/14.5/16%（按精炼 1—5）。",
    explanation:
      "五档天赋为敌方生命值大于等于50%时装备者对目标造成的失衡值提升10/11.5/13/14.5/16%，大于等于75%时额外提升同档幅度。这是失衡值（daze）加成，不是冲击力、攻击力或伤害加成；目标生命阈值是取得条件（由调用方声明，不模拟），完整静态入口的 daze-only 分支不计算最终失衡值。装备该音擎时静态计算正常进行（该条款不影响伤害），显式选择本选项会得到本错误。",
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/13006/details.zh.json 的 /talents/1—5/desc，英文同文为 When the target's HP is no lower than 50%, the equipper inflicts 10% more Daze … no lower than 75%, this bonus is further increased by 10%）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。两个生命阈值与额外提升按原文登记；登记为 formula-out-of-scope 的不可选变体。",
  },
]

const pr10WEngineBoundaries: readonly Supplement[] =
  pr10WEngineBoundarySpecs.map(
    (spec): Supplement => ({
      kind: "unsupported-option",
      supplementId: `nanoka:w-engines:${spec.entityId}:${spec.slug}`,
      source: `nanoka-integrated@3.2 w-engines/${spec.entityId} /talents/1—5/desc`,
      catalogEntityId: `w-engines:${spec.catalogName}`,
      optionId: `nanoka:w-engines:${spec.entityId}:${spec.slug}`,
      name: spec.name,
      conditionDescription: spec.conditionDescription,
      target: spec.target ?? "self",
      configuration: { refinements: [1, 2, 3, 4, 5] },
      expectsNoteOnlyRefinementTiers: true,
      reason: "formula-out-of-scope",
      explanation: spec.explanation,
      supportedRanks: "精炼 1—5（不可选）",
      computationTarget:
        "declared unavailable option on the mapped w-engine entity",
      ...(spec.conflictingSourceStats === undefined
        ? {}
        : { conflictingSourceStats: spec.conflictingSourceStats }),
      evidence: wengineTalentEvidence(spec.entityId, spec.sha256),
      verification: spec.verification,
    }),
  )

/**
 * 前批提供者同一被动词条内的越界部分（批次 10）：既有可执行选项按身份保留，
 * 这些附带部分单独登记为不可选，不重复、不替换既有贡献。
 */
const pr10ProviderBoundaries: readonly Supplement[] = [
  {
    kind: "unsupported-option",
    supplementId: "nanoka:w-engines:14114:basic-attack-daze",
    source: "nanoka-integrated@3.2 w-engines/14114 /talents/1—5/desc",
    catalogEntityId: "w-engines:Weapon_S_1141",
    optionId: "nanoka:w-engines:14114:basic-attack-daze",
    name: "束缚枷锁 · dazeValue",
    conditionDescription:
      "攻击命中敌人时，[普通攻击]造成的失衡值提升6/7.5/9/10.5/12%（按精炼 1—5，每层，最多 5 层，持续 8 秒，同一招式内最多触发一次，每层效果单独结算持续时间）。",
    target: "self",
    configuration: { refinements: [1, 2, 3, 4, 5] },
    expectsNoteOnlyRefinementTiers: true,
    reason: "formula-out-of-scope",
    explanation:
      "五档天赋同一句的失衡值部分：攻击命中敌人时[普通攻击]造成的失衡值提升6/7.5/9/10.5/12%（最多 5 层、每层 8 秒）。同句的伤害部分已有可执行选项（nanoka:w-engines:14114:basic-attack-damage-stacks），本选项不重复也不替换它；失衡值不是冲击力、攻击力或伤害加成，完整静态入口的 daze-only 分支不计算最终失衡值。装备该音擎时静态计算正常进行，显式选择本选项会得到本错误。",
    supportedRanks: "精炼 1—5（不可选）",
    computationTarget:
      "declared unavailable option on the mapped w-engine entity",
    evidence: wengineTalentEvidence(
      "14114",
      "477d278159a7473afdaaadcced62eea6e95c74c7ad6ea2e0b6140395ca10621f",
    ),
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/14114/details.zh.json 的 /talents/1—5/desc，英文同文为 DMG and Daze from Basic Attacks increase by 6% for 8s, stacking up to 5 times）：固定来源 fac62407 的五个精炼块只有同文 note、effects 为空。只登记失衡值部分，动作范围与层数按原文给出；与既有伤害选项共存，不宣称该音擎全部条款完整。",
  },
  {
    kind: "unsupported-option",
    supplementId:
      "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
    source: "nanoka-integrated@3.2 agents/1031 /talent/1/desc",
    catalogEntityId: "agents:nicole",
    optionId:
      "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
    name: "影画1 · anomalyBuildupAndFieldDuration",
    conditionDescription:
      "累积的属性异常积蓄值提升16%；发动时每多蓄力0.1秒，能量场持续时间提升0.15秒（影画 1 及以上）。",
    target: "self",
    configuration: { minimumMindscape: 1 },
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 1,
      stats: [],
      expectsEmptyPack: true,
    },
    reason: "formula-out-of-scope",
    explanation:
      "影画 1 同一句的越界部分：[强化特殊技]累积的属性异常积蓄值提升16%，以及每多蓄力0.1秒使能量场持续时间提升0.15秒。同句的伤害 +16% 已有可执行选项（nanoka:agents:nicole:mindscape-1-ex-damage），本选项不重复也不替换它；异常积蓄量与能量场持续时间不是当前公开静态伤害计算的输出，不能折算成异常精通、增伤或任何伤害乘区。选择影画 1 及以上时静态计算正常进行，显式选择本选项会得到本错误。",
    supportedRanks: "影画 1 及以上（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: [
      {
        path: "agents/1031/details.zh.json",
        pointer: "/talent/1/desc",
        sha256:
          "f648a8ff0d98f18d9348c7b10c79d234bf4d52d8d6ac0d92e596822a9016aaf8",
      },
    ],
    verification:
      "Nanoka 影画 1 原文核实（agents/1031/details.zh.json 的 /talent/1/desc，英文同文为 The DMG and the Anomaly Buildup inflicted … increases by 16% … the duration of the energy field … increases by 0.15s）：固定来源的 mindscape rank 1 是真实空 pack（无块、无 effects、无记录），登记这一真实缺失现状；同排位出现任何新编码即拒绝生成并要求重新核对。只登记积蓄与持续时间部分，不重复既有伤害选项。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:qingyi:flash-voltage-daze",
    source: "nanoka-integrated@3.2 agents/1251 /skill/basic/description/2/desc",
    catalogEntityId: "agents:qingyi",
    optionId: "nanoka:agents:qingyi:flash-voltage-daze",
    name: "闪络电压消耗 · dazeValue",
    conditionDescription:
      "所消耗的[闪络电压]中超过75%的部分，每1%使本次招式造成的失衡值额外提升0.5%（本次消耗比例由调用方显式输入）。",
    target: "self",
    configuration: {},
    reason: "formula-out-of-scope",
    explanation:
      "同一句的失衡值部分：所消耗的[闪络电压]中超过75%的部分，每1%使本次[普通攻击：醉花月云转]造成的失衡值额外提升0.5%（上限 +12.5%）。同句的伤害 +1%/1% 已有可执行选项（nanoka:agents:qingyi:flash-voltage-consumed-damage），本选项不重复也不替换它；失衡值不是冲击力、攻击力或伤害加成，完整静态入口的 daze-only 分支不计算最终失衡值。显式选择本选项会得到本错误。",
    supportedRanks: "无培养门槛（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: [
      {
        path: "agents/1251/details.zh.json",
        pointer: "/skill/basic/description/2/desc",
        sha256:
          "d5344fa4979038c19f4120a2e9466aba07ed69be20ec2e948c367db4a59b16ef",
      },
    ],
    verification:
      "Nanoka 普通攻击描述原文核实（agents/1251/details.zh.json 的 /skill/basic/description/2/desc，英文同文为 her Damage and Daze inflicted by this skill will be increased by 1%/0.5%）：条款在固定来源没有对应位置与机器记录；消耗比例与越界钳制沿用既有伤害选项的显式输入契约，本登记不新增输入、不新增公式。只登记失衡值部分。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:koleda:enhanced-basic-second-daze",
    source: "nanoka-integrated@3.2 agents/1101 /skill/basic/description/1/desc",
    catalogEntityId: "agents:koleda",
    optionId: "nanoka:agents:koleda:enhanced-basic-second-daze",
    name: "强化普攻二段 · dazeValue",
    conditionDescription:
      "潜能分支：每消耗一层[熔炉升温]，第二段强化[普通攻击]造成的失衡值提升20%（最多 2 层，按本次实际消耗选择 0/1/2 层）。",
    target: "self",
    configuration: { potentialLevels: [1, 2, 3, 4, 5, 6] },
    reason: "formula-out-of-scope",
    explanation:
      "潜能分支同一句的失衡值部分：每消耗一层[熔炉升温]，第二段强化[普通攻击]造成的失衡值提升20%（最多 2 层）。同句的伤害 +10%/层已有可执行选项（nanoka:agents:koleda:enhanced-basic-second-per-layer），消耗触发的全队 +35% 是既有独立选项；本选项不重复也不替换它们。失衡值不是冲击力、攻击力或伤害加成，完整静态入口的 daze-only 分支不计算最终失衡值。显式选择本选项会得到本错误。",
    supportedRanks: "潜能 1—6（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: [
      {
        path: "agents/1101/details.zh.json",
        pointer: "/skill/basic/description/1/desc",
        sha256:
          "4234d05a53ae34e4558929d46d222aab7435b094ab8877f312ca5b19403839e7",
      },
    ],
    verification:
      "Nanoka 潜能分支描述原文核实（agents/1101/details.zh.json 的 /skill/basic/description/1/desc，被动行 110100—110105；英文同文为 inflicts 20% more Daze）：条款在固定来源没有对应第二段锚点与机器记录；层数语义与既有伤害选项一致（本次实际消耗 0/1/2 层），本登记不新增输入与公式，只登记失衡值部分。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
    source: "nanoka-integrated@3.2 agents/1161 /talent/4/desc",
    catalogEntityId: "agents:lighter",
    optionId: "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
    name: "影画4 · instantEnergy",
    conditionDescription:
      "进入[士气喷发]状态时，为后场角色回复4点能量，18秒内最多触发一次（影画 4 及以上）；受益者是后场队友，不限于莱特本人。",
    target: "team",
    configuration: { minimumMindscape: 4 },
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 4,
      stats: [],
      expectsEmptyPack: true,
    },
    reason: "formula-out-of-scope",
    explanation:
      "影画 4 同一句的独立瞬时机制：进入[士气喷发]状态时为后场角色回复4点能量（18秒内最多触发一次）。这是即时能量方向，不是每秒自动回能效率；同句的“莱特位于后场时前场角色能量自动回复效率提升10%”已有可执行选项（nanoka:agents:lighter:mindscape-4-frontline-energy-regen），本选项不替换、不重复该每秒回能贡献，也不把 4 点能量折算成 energyRegen。显式选择本选项会得到本错误。",
    supportedRanks: "影画 4 及以上（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: [
      {
        path: "agents/1161/details.zh.json",
        pointer: "/talent/4/desc",
        sha256:
          "5905a577cc078f91031b3f14b5dff21bdba95952e2e74215d4cc3e22798fc3c5",
      },
    ],
    verification:
      "Nanoka 影画 4 原文核实（agents/1161/details.zh.json 的 /talent/4/desc，英文同文为 Upon entering the Morale Burst state, Lighter restores 4 Energy for off-field characters. This effect can trigger once every 18s）：固定来源的 mindscape rank 4 是真实空 pack，登记这一真实缺失现状；同排位出现任何新编码即拒绝生成并要求重新核对。只登记瞬时能量部分，不替换既有每秒回能选项。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:w-engines:14162:daze-value",
    source: "nanoka-integrated@3.2 w-engines/14162 /talents/1—5/desc",
    catalogEntityId: "nanoka:w-engines:14162",
    optionId: "nanoka:w-engines:14162:daze-value",
    name: "永夜辗眠 · dazeValue",
    conditionDescription:
      "装备者发动[强化特殊技]造成风属性伤害时，造成的失衡值提升16/18.4/20.8/23.2/25.6%（按精炼 1—5），持续50秒，重复触发时刷新持续时间；EX+风伤是该失衡增益的取得条件，受益攻击不限于触发时的该次 EX。",
    target: "self",
    configuration: { refinements: [1, 2, 3, 4, 5] },
    reason: "formula-out-of-scope",
    explanation:
      "五档天赋同一句的失衡值部分：装备者发动[强化特殊技]造成风属性伤害时造成的失衡值提升16/18.4/20.8/23.2/25.6%，持续50秒、重复触发时刷新持续时间；EX+风伤是取得该状态的条件，受益攻击不能因此被缩成只增强触发时的该次 EX。同句的全队其他角色增伤已有可执行选项（nanoka:w-engines:14162:squad-damage-bonus），本选项不重复也不替换它；增伤句的“全队唯一”不扩到本失衡条款。失衡值不是冲击力、攻击力或伤害加成，完整静态入口的 daze-only 分支不计算最终失衡值。显式选择本选项会得到本错误。",
    supportedRanks: "精炼 1—5（不可选）",
    computationTarget:
      "declared unavailable option on the supplement w-engine entity",
    evidence: wengineTalentEvidence(
      "14162",
      "bc7c46871ff259a1c249fe62493ff69d22aa279273e084efcb0783bc4f48a456",
    ),
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/14162/details.zh.json 的 /talents/1—5/desc，英文同文为 Daze dealt increases by 16% … for 50s. Repeated triggers reset the duration）：该音擎是补充实体（固定来源无该音擎），本登记只覆盖失衡值条款；公开说明按原文保留持续 50 秒与重复触发刷新（同句两段共享该持续句），“全队唯一”属增伤句不扩到失衡句；取得条件（EX 造成风伤）由调用方声明，本选项不新增触发模拟。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:nangongyu:m6-vibrato-daze",
    source: "nanoka-integrated@3.2 agents/1511 /talent/6/desc",
    catalogEntityId: "agents:nangongyu",
    optionId: "nanoka:agents:nangongyu:m6-vibrato-daze",
    name: "影画6 · dazeValue",
    conditionDescription: "南宫羽攻击造成的失衡值提升50%（影画 6 及以上）。",
    target: "self",
    configuration: { minimumMindscape: 6 },
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 6,
      stats: [],
      anchorBlocks: [
        {
          blockId: "blk-ms4dtzxa-touyxm",
          frozenNote: nangongyuMindscape6FrozenNote,
        },
      ],
    },
    reason: "formula-out-of-scope",
    explanation:
      "影画 6 同一句的失衡值部分：南宫羽攻击造成的失衡值提升50%。这是失衡值（daze）加成，不是冲击力、攻击力或伤害加成；同句的[颤音：改]异放结算已有可执行选项（nanoka:agents:nangongyu:m6-vibrato-modified-*），本选项不重复也不替换它（异放结算与失衡值加成相互独立）。完整静态入口的 daze-only 分支不计算最终失衡值，本批不新增公式。显式选择本选项会得到本错误。",
    supportedRanks: "影画 6 及以上（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: [
      {
        path: "agents/1511/details.zh.json",
        pointer: "/talent/6/desc",
        sha256:
          "623a202f3d6b33c5c32d2ef6958595d02f0649cd76e57679858108b753a262b8",
      },
    ],
    verification:
      "Nanoka 影画 6 原文核实（agents/1511/details.zh.json 的 /talent/6/desc，英文同文为 Nangong Yu's attacks deal 50% more Daze）：固定来源的影画 6 是 note 完整、effects 为空的实际空块（blk-ms4dtzxa-touyxm），本登记沿用既有[颤音：改]登记的同一条冻结完整 note 作为锚块守卫（锚块缺失、note 任何变化或该 rank 出现新编码即拒绝生成）。只登记失衡值部分。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:1621:wind-energy-acquisition",
    source:
      "nanoka-integrated@3.2 agents/1621 /passive/level/1621501—1621507/desc/0",
    catalogEntityId: "nanoka:agents:1621",
    optionId: "nanoka:agents:1621:wind-energy-acquisition",
    name: "核心被动 · windEnergy",
    conditionDescription:
      "每消耗25点能量，获得1点[风能]，[风能]上限为3点（核心被动首句）。",
    target: "self",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动首句的越界部分：每消耗25点能量获得1点[风能]、[风能]上限为3点。[风能]是战斗内角色资源（即时资源方向），当前公开静态伤害计算不计算资源获取；同段“初始能量自动回复超过1.2 的转化”已有可执行选项（nanoka:agents:1621:initial-energy-regen-conversion），本选项不重复、不替换该转化，也不把[风能]折算成能量、增伤或任何伤害乘区，不记为零贡献冒充接入。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget:
      "declared unavailable option on the supplement agent entity",
    evidence: agentPassiveEvidence(
      "1621",
      "c2389b7393c05632b298733831b079f8d19dc74f7af54f121f93e9c54134b30e",
      1621501,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1621/details.zh.json 的 /passive/level/1621501—1621507/desc/0 首句，data.json level 元数据 1—7 逐行核对）：七档文本一致，每消耗25点能量获得1点[风能]、上限3点。洛克茜是补充实体（固定来源无该角色），本登记只覆盖该句；资源获取不在当前公开静态伤害计算承诺范围，登记为 formula-out-of-scope 的不可选变体。",
  },
  {
    kind: "unsupported-option",
    supplementId:
      "nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency",
    source:
      "nanoka-integrated@3.2 agents/1411 /passive/level/1411049—1411055/desc/1",
    catalogEntityId: "agents:yuzuha",
    optionId: "nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency",
    name: "额外能力：人多乐趣大 · anomalyBuildupEfficiency",
    conditionDescription:
      "队伍中存在[异常]角色或与自身阵营相同的角色时触发：若柚叶的异常掌控大于100点，每超过1点使拥有[狸之愿]效果的角色的属性异常积蓄效率提升0.2%，最多提升20%（异常掌控达到200点时达到最大值；核心 1—7 同文）。",
    target: "team",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 0,
      stats: [],
      anchorBlocks: [
        {
          blockId: "blk-ms38y9v7-07td4j",
          frozenNote:
            "队伍中存在[异常]角色或与自身阵营相同的角色时触发：\n若柚叶的异常掌控大于100点，每超过1点异常掌控会使拥有[狸之愿]效果的角色的属性异常积蓄效率提升0.2%，最多提升20%，还会使其所有属性异常伤害和[紊乱]伤害提升0.2%，最多提升20%，当柚叶的异常掌控达到200点时，上述增益效果达到最大值。",
        },
      ],
    },
    reason: "formula-out-of-scope",
    explanation:
      "额外能力同一句的积蓄效率部分：队伍中存在[异常]角色或与自身阵营相同的角色时触发——若柚叶的异常掌控大于100点，每超过1点使拥有[狸之愿]效果的角色的属性异常积蓄效率提升0.2%、最多20%（掌控 200 点时达到最大值）。这是异常积蓄效率（积蓄量方向），不是异常精通、异常伤害或紊乱伤害；当前公开静态伤害计算不输出积蓄量/积蓄效率，也不新增该公式。同句的属性异常伤害与[紊乱]伤害部分已有可执行选项（agents:yuzuha:mindscape:0:tanuki-wish-complete-state）。影画 1 的 130% 强化按 M1 原文只作用于[额外能力]中属性异常伤害和[紊乱]伤害增益，不扩大到本积蓄效率条款，本声明不借用该强化。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: ([1, 2, 3, 4, 5, 6, 7] as const).map((rank) => ({
      path: "agents/1411/details.zh.json",
      pointer: `/passive/level/${1411049 + rank - 1}/desc/1`,
      sha256:
        "3c58a01094de2dc0c6298d8989a8b00f02f30afe36320524a01742ff7f99d560",
      rank,
    })),
    verification:
      "Nanoka 额外能力逐档核实（agents/1411/details.zh.json 的 /passive/level/1411049—1411055/desc/1，data.json level 元数据 1—7 与 rank 逐档核对；英文同文为 every point over increases the Anomaly Buildup Rate of characters with Tanuki Wish by 0.2%, up to a maximum of 20%, and all Attribute Anomaly DMG and Disorder DMG by 0.2%）：七档同文，积蓄效率与属性异常/紊乱伤害同句并列。固定来源同位置的额外能力块（agents/yuzuha mindscapeBuffs/0 effectBlocks 的 blk-ms38y9v7-07td4j）note 与整句同文，只编码异常伤害与紊乱伤害两组记录，没有积蓄效率记录；本登记冻结锚块完整 note，锚块缺失或 note 任何变化即拒绝生成。只登记积蓄效率部分，不重复完整状态选项，也不把 M1 的 130% 扩大到积蓄。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:yuzuha:mindscape-1-entry-energy",
    source: "nanoka-integrated@3.2 agents/1411 /talent/1/desc",
    catalogEntityId: "agents:yuzuha",
    optionId: "nanoka:agents:yuzuha:mindscape-1-entry-energy",
    name: "影画1 · instantEnergy",
    conditionDescription:
      "柚叶进入战场时，回复30点能量，在勘域模式中该效果每180秒最多触发一次（影画 1 及以上）。",
    target: "self",
    configuration: { minimumMindscape: 1 },
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 1,
      stats: ["energyRegen"],
      anchorBlocks: [
        {
          blockId: "blk-legacy",
          frozenNote:
            "处于[甜蜜惊吓]状态下的敌人全属性伤害抗性降低10%；[额外能力]中属性异常伤害和[紊乱]伤害增益效果提升至原本的130%。",
        },
      ],
    },
    reason: "formula-out-of-scope",
    explanation:
      "影画 1 同一条目的瞬时能量部分：柚叶进入战场时回复30点能量（勘域模式每180秒最多触发一次）。这是即时资源方向，不是每秒自动回能（Energy Regen）；当前公开静态伤害计算不输出即时资源，本批不新增该公式，也不把 30 点能量折算成 energyRegen。同条目的[甜蜜惊吓]全属性抗性降低10% 与“[额外能力]中属性异常伤害和[紊乱]伤害提升至原本的130%”已有可执行选项（agents:yuzuha:mindscape:1:blk-legacy:legacy-team-resPen 与 agents:yuzuha:mindscape:0:tanuki-wish-complete-state 的影画 1 配置强化），本选项不重复、不替换，也不把 130% 扩大到积蓄效率或本瞬时能量。显式选择本选项会得到本错误。",
    supportedRanks: "影画 1 及以上（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: [
      {
        path: "agents/1411/details.zh.json",
        pointer: "/talent/1/desc",
        sha256:
          "3c58a01094de2dc0c6298d8989a8b00f02f30afe36320524a01742ff7f99d560",
      },
    ],
    verification:
      "Nanoka 影画 1 原文核实（agents/1411/details.zh.json 的 /talent/1/desc，英文同文为 Yuzuha regains 30 Energy when she enters the battlefield. In Investigation Zone Mode, this effect can trigger at most once every 180s… The Attribute Anomaly DMG and Disorder DMG buff from her Additional Ability is increased to 130% of its original value）：固定来源影画 1 块（blk-legacy）note 只含全属性抗性与 130% 两句、没有瞬时能量句，本登记冻结该锚块完整 note（锚块缺失或 note 任何变化即拒绝生成）并登记 rank 1 不得出现 energyRegen 机器记录（出现即拒绝重核）。只登记瞬时能量部分，不重复既有抗性/130% 选项，也不把 130% 的适用范围扩大。",
  },
]

/**
 * 修复轮 R02：前九批已修/已补提供者同一被动段中仍未登记的确定缺口
 * （维序者-特化型 13127 积蓄、昨夜来电 14148 失衡层数、莱特/琉音/南宫羽
 * 同核心的资源与失衡延长、南宫羽 M0 同核心的积蓄与失衡）。这些量在正式
 * 目录没有具名不可选去向，逐档按 integrated 原文核对；不新增任何量值
 * 计算，既有伤害/回能/暴伤/冲击选项按身份保留。
 */
const pr10ReviewFixClauses: readonly Supplement[] = [
  {
    kind: "unsupported-option",
    supplementId: "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
    source: "nanoka-integrated@3.2 w-engines/13127 /talents/1—5/desc",
    catalogEntityId: "w-engines:Peacekeeper_Specialized",
    optionId: "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
    name: "标准格挡术 · anomalyBuildup",
    conditionDescription:
      "[强化特殊技]和[支援突击]累积的属性异常积蓄值提升36/40/45/50/55%（按精炼 1—5）；“拥有护盾”是同句每秒自动回能条款的取得条件，不扩到本积蓄条款。",
    target: "self",
    configuration: { refinements: [1, 2, 3, 4, 5] },
    reason: "formula-out-of-scope",
    explanation:
      "五档天赋同句的异常积蓄值部分：[强化特殊技]和[支援突击]累积的属性异常积蓄值提升36/40/45/50/55%。这是异常积蓄值（积蓄量方向），不是异常精通、伤害加成或每秒自动回能；当前公开静态伤害计算不输出积蓄量/积蓄值，也不新增该公式。同句的每秒自动回能（拥有护盾时 0.4/0.46/0.52/0.58/0.64 点/秒）已有可执行选项，本选项不重复、不替换；“拥有护盾”只是回能句的取得条件，无据不扩到积蓄句。显式选择本选项会得到本错误。",
    supportedRanks: "精炼 1—5（不可选）",
    computationTarget:
      "declared unavailable option on the mapped w-engine entity",
    evidence: wengineTalentEvidence(
      "13127",
      "6ede50ba4109867976d76b4dbce456a11f346ea42873c26c1dcdadbc122eacd3",
    ),
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/13127/details.zh.json 的 /talents/1—5/desc，英文同文为 The Anomaly Buildup of EX Special Attacks and Assist Follow-Ups increase by 36%）：五档字面值为 36/40/45/50/55%，第一句回能按档为 0.4/0.46/0.52/0.58/0.64 点/秒。固定来源该音擎五档只有回能机器记录（既有 corrected 选项）、没有积蓄编码；本声明不套用 note-only 空实体守卫（该实体已有机器记录），也不因已有 energyRegen 记录误拒，证据按整文件摘要与逐档 Pointer 核对。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:w-engines:14148:ex-physical-daze-stacks",
    source: "nanoka-integrated@3.2 w-engines/14148 /talents/1—5/desc",
    catalogEntityId: "w-engines:Yesterday_Calls",
    optionId: "nanoka:w-engines:14148:ex-physical-daze-stacks",
    name: "7×24 · dazeStacks",
    conditionDescription:
      "装备者发动[强化特殊技]造成物理属性伤害后，装备者攻击造成的失衡值提升9/10.3/11.7/13/14.5%（按精炼 1—5），最多叠加3层、持续10秒；EX+物理是该增益的取得条件，受益攻击不限该次 EX，也不限物理。",
    target: "self",
    configuration: { refinements: [1, 2, 3, 4, 5] },
    reason: "formula-out-of-scope",
    explanation:
      "五档天赋同句的失衡值部分：装备者发动[强化特殊技]造成物理属性伤害时，装备者攻击造成的失衡值提升9/10.3/11.7/13/14.5%（最多叠加3层、持续10秒）。EX 造成物理伤害是该失衡增益的取得条件，不是收益范围限制——后续装备者的攻击按原文受益，本声明只登记条款、不生成层数事件或最终失衡值。同句的每秒自动回能与 3 层时的全队暴击伤害（30/34.5/39/43.5/48%，持续40秒、重复触发刷新、全队唯一）已有可执行选项，本选项不重复、不替换，也不把 3 层暴伤的全队唯一扩到失衡条款。失衡值（daze）不在当前机器词表，不接受把物理触发缩成收益范围。显式选择本选项会得到本错误。",
    supportedRanks: "精炼 1—5（不可选）",
    computationTarget:
      "declared unavailable option on the mapped w-engine entity",
    evidence: wengineTalentEvidence(
      "14148",
      "3245466324100f866c221d3aa6d6de4621ecedef8a9e10f6d1c70953f409601e",
    ),
    verification:
      "Nanoka 五档天赋逐档核实（w-engines/14148/details.zh.json 的 /talents/1—5/desc，英文同文为 the Daze dealt by the equipper's attacks increases by 9% for 10s, stacking up to 3 times）：五档为 9/10.3/11.7/13/14.5%，最多 3 层、持续 10 秒；取得条件（EX 造成物理伤害）与暴伤句（30/34.5/39/43.5/48%、40 秒、刷新、全队唯一）按原文分列。固定来源该音擎五档只有回能与暴伤机器记录（既有选项）、没有失衡编码；本声明不套用 note-only 空实体守卫，也不因已有 energyRegen/critDmg 记录误拒。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:lighter:morale-acquisition",
    source:
      "nanoka-integrated@3.2 agents/1161 /passive/level/1161501—1161507/desc/0",
    catalogEntityId: "agents:lighter",
    optionId: "nanoka:agents:lighter:morale-acquisition",
    name: "核心被动 · moraleAcquisition",
    conditionDescription:
      "莱特随时间自动获得[士气]：每秒回复2.9点，队伍中任意角色每消耗1点能量值额外回复0.26点，上限100点；[士气喷发]期间停止随时间自动获得[士气]、退出时保留未消耗[士气]（核心 1—7 同文）。",
    target: "self",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动同段的资源部分：莱特随时间自动获得[士气]，每秒回复2.9点，队伍中任意角色每消耗1点能量值额外回复0.26点[士气]，最多拥有100点；[士气喷发]状态下不再随时间自动获得、退出时保留尚未消耗的[士气]。这是特殊角色资源方向，不是每秒自动回能（Energy Regen），也不折算成 energyRegen；当前公开静态伤害计算不输出战斗内资源获取，本批不新增资源公式或时间线。状态取得/消耗条件（回复至80点的下一次换入快速支援、80点以上第五段普攻进入[士气喷发]、每消耗10点士气冲击力提升、持续6秒）按原文保留在说明中，由调用方声明，不生成自动事件；同核心已支持的冲击力选项（nanoka:agents:lighter:morale-burst-impact）与[溃败]失衡延长（另有独立声明）不重复、不替换。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: agentPassiveEvidence(
      "1161",
      "5905a577cc078f91031b3f14b5dff21bdba95952e2e74215d4cc3e22798fc3c5",
      1161501,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1161/details.zh.json 的 /passive/level/1161501—1161507/desc/0，data.json level 元数据 1—7 与 rank 逐档核对；英文同文为 Lighter automatically gains Morale over time, at a rate of 2.9 points per second. For each point of Energy consumed by any squad member, Lighter recovers an additional 0.26 Morale, up to a maximum of 100）：七档同文；只有每 10 点士气提升冲击力的比例随核心档变化（既有已支持选项）。资源取得与状态边界在固定来源没有机器记录（该段文字不在 mindscapeBuffs 的块 note 中），证据按整文件摘要与逐档 Pointer 核对；不把它转成 energyRegen 或自动事件。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:lighter:collapse-stun-duration",
    source:
      "nanoka-integrated@3.2 agents/1161 /passive/level/1161501—1161507/desc/0",
    catalogEntityId: "agents:lighter",
    optionId: "nanoka:agents:lighter:collapse-stun-duration",
    name: "核心被动 · collapseStunDuration",
    conditionDescription:
      "[士气喷发]状态下终结一击命中敌人时施加[溃败]：敌人进入失衡后的失衡持续时间提升3秒，从失衡状态恢复前对同一目标最多触发一次（核心 1—7 同文）。",
    target: "team",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动同段的[溃败]部分：[士气喷发]状态下终结一击命中敌人时施加[溃败]，使该敌人进入失衡状态后的失衡持续时间提升3秒，从失衡状态恢复前[溃败]对同一目标最多触发一次。这是失衡持续时间（stun duration）方向，不是已支持的冲击力或失衡值：当前公开静态伤害计算的 daze-only 分支在进入目录执行前返回，不计算最终失衡时长，也不新增该公式。受益范围是全队（更长的失衡窗口对所有队友生效），与同句已支持的冲击力选项和抗性降低选项相互独立、不重复不替换。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: agentPassiveEvidence(
      "1161",
      "5905a577cc078f91031b3f14b5dff21bdba95952e2e74215d4cc3e22798fc3c5",
      1161501,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1161/details.zh.json 的 /passive/level/1161501—1161507/desc/0；英文同文为 it applies the Collapse effect on the target, extending its Stunned duration by 3s. The Collapse effect can trigger only once on the same target before they recover from Stun）：七档同文。该句在固定来源没有机器记录（rank 2 块 note 只登记了[溃败]相关的失衡易伤倍率），证据按整文件摘要与逐档 Pointer 核对；只登记持续时间增量，不把它折算为冲击力/易伤或最终失衡值。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:dialyn:positive-reviews-and-complaints",
    source:
      "nanoka-integrated@3.2 agents/1481 /passive/level/1481049—1481055/desc/0",
    catalogEntityId: "agents:dialyn",
    optionId: "nanoka:agents:dialyn:positive-reviews-and-complaints",
    name: "核心被动 · positiveReviewsAndComplaints",
    conditionDescription:
      "琉音进入战场时初始拥有60点[好评]；接战状态下每秒积攒0.6点，指定EX（石头/剪刀/布！）的重击命中时积攒7.5点（同一招式一次）；上限120点。每当[好评]积攒至90点或发动[终结技]时获得1点[客诉]，上限1点（核心 1—7 同文）。",
    target: "self",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动同段的资源部分：琉音入场初始拥有60点[好评]、接战每秒积攒0.6点、指定EX重击命中积攒7.5点（同一招式一次、上限120点）；好评满90点或发动[终结技]时获得1点[客诉]（上限1点）。这是特殊角色资源方向，不是每秒自动回能，也不折算成 energyRegen；当前公开静态伤害计算不输出战斗内资源，也不新增公式或时间线。资源消费与连携升级条件按原文保留在说明中：好评至少90点时，经[连携技：迎宾踏垫]/[强化特殊技：送客！]/[快速支援：呼叫转移]打开[连携技]窗口后，下一位出场角色的该次[连携技]升级为[终结技]，队友以此方式发动[终结技]时琉音消耗60点[好评]（不是打开窗口当下消耗）；另一条路径是好评至少90点时[强化特殊技：送客！]命中未打开[连携技]窗口的敌人，消耗90点[好评]强制打开窗口，下一位出场角色同样升级为[终结技]。以上条件由调用方声明，不生成事件。已支持的初始暴击率转冲击选项（nanoka:agents:dialyn:initial-crit-rate-impact）与[恶意投诉]失衡时长（另有独立声明）不重复、不替换。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: agentPassiveEvidence(
      "1481",
      "c335486522cb3958f1430551fb07616364cd01f13cbe988c7bde6d21a41ca3ed",
      1481049,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1481/details.zh.json 的 /passive/level/1481049—1481055/desc/0，data.json level 元数据 1—7 与 rank 逐档核对；英文同文为 Dialyn starts with 60 Positive Reviews … gains 0.6 Positive Reviews per second … gains 7.5 … up to a maximum of 120 … Dialyn obtains 1 Customer Complaint. A maximum of 1 Customer Complaint can be held）：好评取得与客诉句七档同文，只有初始暴击率转冲击比例随核心档变化（既有已支持选项）。资源取得与消费条件在固定来源没有机器记录，证据按整文件摘要与逐档 Pointer 核对。",
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:dialyn:malicious-complaint-stun-duration",
    source:
      "nanoka-integrated@3.2 agents/1481 /passive/level/1481049—1481055/desc/0",
    catalogEntityId: "agents:dialyn",
    optionId: "nanoka:agents:dialyn:malicious-complaint-stun-duration",
    name: "核心被动 · maliciousComplaintStunDuration",
    conditionDescription:
      "[强化特殊技：布！]命中敌人时施加[恶意投诉]：敌人进入失衡状态后的失衡持续时间提升2秒，从失衡状态恢复前对同一目标最多触发一次、与同类失衡延长不叠加、敌人失衡结束时效果结束（核心 1—7 同文）。",
    target: "team",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动同句的失衡持续时间部分：[恶意投诉]效果下敌人进入失衡状态后的失衡持续时间提升2秒，从失衡状态恢复前对同一目标最多触发一次，失衡持续时间提升效果与同类效果不可叠加，敌人失衡结束时效果结束。这是失衡持续时间（stun duration）方向，与同句已支持的失衡易伤倍率（+15/17.5/20/22.5/25/27.5/30% 按核心 1—7）是不同量——易伤已支持不等于时长已支持；当前公开静态伤害计算不输出最终失衡时长，daze-only 分支在进入目录执行前返回，也不新增该公式。受益范围是全队（更长的失衡窗口所有队友共享）。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: agentPassiveEvidence(
      "1481",
      "c335486522cb3958f1430551fb07616364cd01f13cbe988c7bde6d21a41ca3ed",
      1481049,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1481/details.zh.json 的 /passive/level/1481049—1481055/desc/0；英文同文为 the Stun duration is extended by 2s … can trigger on the same target only once. The Stun duration bonus does not stack with similar effects）：七档同文。固定来源的 mindscape rank 0 blk-legacy 块登记该句全文（note 同文、只编码 30% 失衡易伤记录），本登记冻结该锚块完整 note，锚块缺失或 note 任何变化即拒绝生成；只登记时长增量，不重复易伤选项、不把易伤已支持当作时长已支持。",
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 0,
      stats: [],
      anchorBlocks: [
        {
          blockId: "blk-legacy",
          frozenNote:
            "[强化特殊技：布！]命中敌人时，敌人获得[恶意投诉]效果，[恶意投诉]效果下敌人进入失衡状态后的失衡持续时间提升2秒，失衡易伤倍率提升30%",
        },
      ],
    },
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:nangongyu:core-buildup-and-daze",
    source:
      "nanoka-integrated@3.2 agents/1511 /passive/level/1511049—1511055/desc/0",
    catalogEntityId: "agents:nangongyu",
    optionId: "nanoka:agents:nangongyu:core-buildup-and-daze",
    name: "核心被动 · coreBuildupAndDaze",
    conditionDescription:
      "指定[普通攻击：可爱地雷飞天撞]或[强化特殊技：相当沉重的爱意]命中敌人时，自身属性异常积蓄效率提升17/20/23/26/29/32/35%、自身造成的失衡值提升11/12.5/14/15.5/17/18.5/20%（按核心 1—7，逐档字面值），持续30秒、重复触发时刷新。",
    target: "self",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动同句的积蓄与失衡部分：指定普攻/EX 命中敌人后，自身属性异常积蓄效率提升17/20/23/26/29/32/35%、自身造成的失衡值提升11/12.5/14/15.5/17/18.5/20%（按核心 1—7 逐档字面值，不按最高核心插值），持续30秒、重复触发时刷新。这是异常积蓄效率与失衡值方向，不是异常精通或伤害加成；当前公开静态伤害计算不输出积蓄量与最终失衡值，也不新增该公式。同句的全队伤害提升（13/15/17/19/21/23/25%）已有可执行选项，本选项不重复、不替换；M0 [颤音]/M6 [颤音：改]的显式层数与快照契约、影画 2 的独立条款不受影响。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: agentPassiveEvidence(
      "1511",
      "623a202f3d6b33c5c32d2ef6958595d02f0649cd76e57679858108b753a262b8",
      1511049,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1511/details.zh.json 的 /passive/level/1511049—1511055/desc/0，data.json level 元数据 1—7 与 rank 逐档核对；英文同文为 her Anomaly Buildup Rate increases by 35%, and her Daze dealt increases by 20%, and the whole squad's DMG dealt increases by 25% for 30s）：逐档字面值蓄积 17/20/23/26/29/32/35%、失衡 11/12.5/14/15.5/17/18.5/20%、团队增伤 13/15/17/19/21/23/25%。固定来源 mindscape rank 0 blk-ms4cegmd-bwnttd 是该核心被动块（note 同文、只编码精通/异放/团队增伤记录），本登记冻结该锚块完整 note，锚块缺失或 note 任何变化即拒绝生成；本声明不套用 note-only 空实体守卫，也不因块内已有 dmgBonus/anomalyReleaseMult 记录误拒。",
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 0,
      stats: [],
      anchorBlocks: [
        {
          blockId: "blk-ms4cegmd-bwnttd",
          frozenNote:
            "南宫羽的异常精通提升120点；\n敌人处于失衡状态时，任意角色对其造成一次[异放]伤害、[紊乱]伤害、使其进入一次属性异常状态时会为其累计1层[颤音]；\n同一敌人最多可被叠加4层[颤音]；\n若[颤音]叠加到最大层数且敌人处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态下时或当敌人持有[颤音]并从失衡状态恢复时，所有[颤音]会被清除；\n[颤音]被清除时，若敌人处于上述属性异常状态下，南宫羽会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为720%/360%/900%/63%/90%/36%，敌人身上每有1层[颤音]，该次[异放]的伤害比例额外提升25%，同一次失衡期间，若[颤音]已被清除，则敌人无法再被施加[颤音]；\n南宫羽的[普通攻击：可爱地雷飞天撞]或[强化特殊技：相当沉重的爱意]命中敌人时，会使自身的属性异常积蓄效率提升35%，造成的失衡值提升20%，使全队造成的伤害提升25%，持续30秒，重复触发时刷新持续时间；",
        },
      ],
    },
  },
  {
    kind: "unsupported-option",
    supplementId: "nanoka:agents:nangongyu:downbeat-acquisition",
    source:
      "nanoka-integrated@3.2 agents/1511 /passive/level/1511049—1511055/desc/0",
    catalogEntityId: "agents:nangongyu",
    optionId: "nanoka:agents:nangongyu:downbeat-acquisition",
    name: "核心被动 · downbeatAcquisition",
    conditionDescription:
      "进入战场时初始拥有30点[重拍]；接战状态下每秒回复3.8点，队伍中任意角色使敌人进入属性异常状态时额外回复12点（每6秒最多触发一次）；上限100点（核心 1—7 同文）。",
    target: "self",
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    reason: "formula-out-of-scope",
    explanation:
      "核心被动同段的资源部分：接战状态下每秒回复3.8点[重拍]、队伍中任意角色使敌人进入属性异常状态时额外回复12点（每6秒最多触发一次）、上限100点、进入战场时初始30点。这是特殊角色资源方向，不是每秒自动回能（Energy Regen），也不折算成 energyRegen；当前公开静态伤害计算不输出该资源，不新增公式或时间线。与 M6 [颤音：改]及其 +50% 失衡是不同条款，本声明不涉及。显式选择本选项会得到本错误。",
    supportedRanks: "核心 1—7（不可选）",
    computationTarget: "declared unavailable option on the mapped agent entity",
    evidence: agentPassiveEvidence(
      "1511",
      "623a202f3d6b33c5c32d2ef6958595d02f0649cd76e57679858108b753a262b8",
      1511049,
    ),
    verification:
      "Nanoka 核心被动七行逐档核实（agents/1511/details.zh.json 的 /passive/level/1511049—1511055/desc/0；英文同文为 Nangong Yu restores 3.8 Downbeats/s … an additional 12 Downbeats. This effect can trigger once every 6s … up to 100 Downbeats, and starts with 30 …）：七档同文。该资源句在固定来源没有机器记录，证据按整文件摘要与逐档 Pointer 核对；只登记资源取得与上限，不生成自动事件、不折算为每秒回能。",
  },
]

/**
 * 直接伤害倍率条款可能出现的固定来源 stat 名（批次 08 同族）：音擎附伤的
 * 未来机器编码会命中；比格气缸另核 critRate（“必定触发暴击”若被上游编码
 * 为命中/技能暴击率记录，同样说明该条款已有真实编码）。
 */
const wengineDirectDamageSourceStats = [
  "directDmgMult",
  "directDmgMultFactor",
] as const

/** 比格气缸（Big_Cylinder / Nanoka 13112）五档精炼块的冻结完整 note。 */
const bigCylinderRefinementNotes = [
  "受到的伤害降低7.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者600%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
  "受到的伤害降低8.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者690%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
  "受到的伤害降低9.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者780%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
  "受到的伤害降低10.5%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者870%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
  "受到的伤害降低12%；受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者960%防御力的伤害，且必定触发暴击，7.5秒内最多触发一次。",
] as const

/** 加农转子（Cannon_Rotor / Nanoka 14001）五档精炼块的冻结完整 note。 */
const cannonRotorRefinementNotes = [
  "攻击力提升7.5%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，8秒内最多触发一次。",
  "攻击力提升8.6%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，7.5秒内最多触发一次。",
  "攻击力提升9.7%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，7秒内最多触发一次。",
  "攻击力提升10.8%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，6.5秒内最多触发一次。",
  "攻击力提升12%；攻击命中敌人并触发暴击时，额外造成200%攻击力的伤害，6秒内最多触发一次。",
] as const

/**
 * 比格气缸（批次 12）：受击后下一次攻击命中的一次额外防御力伤害。
 * 五档 600/690/780/870/960% 装备者防御力；中文“额外造成…伤害，且必定
 * 触发暴击”支持附伤命中必暴（英文主语歧义如实登记，不据其扩展），本批
 * 仅实现附伤范围：来源 guaranteed-critical 保证本独立项最终概率为 1，选项同
 * 时声明独占伤害项，启用时命中只能携带本独立项（混合请求被目录拒绝）。
 */
const bigCylinderRetaliationDefenseDamage: Supplement = {
  kind: "option",
  ...wengineSupplement("13112", "retaliation-defense-damage"),
  source: "nanoka-integrated@3.2 w-engines/13112 /talents/1—5/desc",
  catalogEntityId: "w-engines:Big_Cylinder",
  supportedRanks: "refinement 1—5；层数 0—1",
  computationTarget:
    "catalog option on the mapped w-engine entity (two-rule complete state)",
  // 条款上下文：五档精炼块全部 note-only（effects 为空）；锚块缺失、note
  // 漂移（含保留原文再追加）或五档内出现直接倍率/暴击率家族的机器记录
  // （raw 或 normalized 任一表示）都拒绝生成并要求重新核对。
  wengineRefinementContextGuard: {
    stats: [...wengineDirectDamageSourceStats, "critRate"],
    tiers: [
      {
        blockId: "blk-ms1q9sxu-g88pag",
        frozenNote: bigCylinderRefinementNotes[0]!,
      },
      {
        blockId: "blk-ms1qa2rg-yt84b0",
        frozenNote: bigCylinderRefinementNotes[1]!,
      },
      {
        blockId: "blk-ms1qaa60-bhvo32",
        frozenNote: bigCylinderRefinementNotes[2]!,
      },
      {
        blockId: "blk-ms1qafjw-h0do1p",
        frozenNote: bigCylinderRefinementNotes[3]!,
      },
      {
        blockId: "blk-ms1qal4m-scu6gi",
        frozenNote: bigCylinderRefinementNotes[4]!,
      },
    ],
  },
  skillTarget: {
    targetId: "big-cylinder-retaliation",
    // 音擎附伤不属于任何固定代理人：任意防护职业装备者都可能是命中角色。
    agentEntityId: null,
    category: "uncategorized",
    name: "比格气缸受击附伤",
  },
  evidence: wengineTalentEvidence(
    "13112",
    "86a2ce694134ea780dcfe2181938f1bc91dbe7af70a653cbc78fc994875c3201",
  ),
  verification:
    "Nanoka 五档天赋逐档核实（w-engines/13112/details.zh.json 的 /talents/1—5/desc，英文文件同文核对：After being attacked, the next attack to hit an enemy will trigger a critical hit and deal 600%—960% of the equipper's DEF as additional DMG, triggerable once every 7.5s）：受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者 600/690/780/870/960% 防御力的伤害，且必定触发暴击，7.5 秒内最多触发一次。固定 ZZZ-HP 来源的五档精炼块只有 note、effects 为空，按补充来源在既有 w-engines:Big_Cylinder 实体新增选项。受击与下一次攻击命中是调用方显式声明的触发事实，7.5 秒冷却与次数上限不模拟，每次显式结算一次，倍率只经关联 hit-adjustment 贡献一次。“必定触发暴击”的归属：中文五档均为“额外造成…伤害，且必定触发暴击”，暴击分句紧随附伤、无独立主语，据此实现附伤独立命中必暴；英文译文把主语读成下一次攻击、存在更宽读法，该歧义如实登记、不据其扩展——本批只实现附伤范围的必暴，不据此声称游戏中的触发招式本体不受影响，触发招式的精确影响范围未经游戏实测，取得证据时应先登记来源再调整。实现为 hit 作用域 guaranteed-critical，仅在本具名独立项实际适用时保证最终暴击概率为 1，普通暴率及其加数不参与概率结算；显式 criticalRate 属性来源（含本人、他人及保存快照）或 declaredCriticalRate 不能与活动必暴并存。目录 exclusiveDamageItem 与 core 唯一 regular/direct 项边界共同拒绝混合请求，必暴不写通用面板。普通暴伤保留显式实体、保存快照和合法命中贡献，未指定来源才读取持有者当前普通暴伤；nonCritical 保留反事实分支，expected 等于 critical。附伤元素两处来源（中英文文本、块 note、data.json 面板字段）均未标注：规则不按元素筛选，独立结算的 hit.element 由调用方按实际游戏行为显式声明，不凭装备者元素、触发招式类别或音擎名称猜默认值。附伤以 regular 直伤独立项结算（固定来源同构条款直接倍率机器编码 directDmgMult 的直伤去向；本项目独立结算契约沿爪印先例）：伤害项读取绑定持有者当前防御力（holder-current，无快照），要求零初始倍率与 uncategorized 分类——独立目标身份、零初始倍率、逐次声明与 uncategorized 分类是本项目采用的独立结算契约，不是原始游戏证据。首句“受到的伤害降低7.5—12%”是装备者承伤方向，固定来源无机器记录，不属于本选项，也不折算为目标易伤或自身减伤。适用职业防护由目录绑定适用性校验（不适配职业零贡献）。",
  rule: {
    effectId: wengineSupplement("13112", "retaliation-defense-damage").effectId,
    identity: { kind: "w-engine", entityId: "13112" },
    section: "万斤顶（受击附伤）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "multiplier",
        values: { 1: 6, 2: 6.9, 3: 7.8, 4: 8.7, 5: 9.6 },
      },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
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
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  additionalRules: [
    {
      effectId: (wengineSupplement("13112", "retaliation-defense-damage")
        .effectId + ":guaranteed-critical") as EffectId,
      identity: { kind: "w-engine", entityId: "13112" },
      section: "万斤顶（受击附伤 · 必定暴击）",
      config: { kind: "constant", value: true },
      parameters: {},
      scope: "hit",
      when: {
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
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
      maximumLayers: 1,
    },
  ],
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
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
    // 独占伤害项：来源保证本具名项最终必暴，core 也验证唯一 regular/direct 项；
    // 启用时命中只能携带本选项声明的唯一独立项；
    // 混合请求按 CONTEXT_MISMATCH 拒绝（目录入口能力，选择阶段强制）。
    exclusiveDamageItem: true,
    conditionDescription:
      "受到敌方攻击后，下一次攻击命中敌人时，额外造成装备者 600/690/780/870/960% 防御力的伤害（按精炼 1—5），该额外伤害由来源保证最终暴击概率为 1，不接受显式 criticalRate 来源或 declaredCriticalRate，普通暴伤保留既有来源契约；7.5 秒内最多触发一次。本次附伤由调用方声明触发并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取装备者当前防御力（元素由调用方按实际结算声明，来源未标注）；7.5 秒冷却与触发检测不模拟。首句承伤降低不属于本选项。",
    name: "万斤顶 · 受击附伤（独立结算）",
    target: "self",
  },
}

/**
 * 加农转子（批次 12）：攻击暴击触发的一次额外攻击力伤害。五档均为
 * 200% 攻击力（触发间隔 8—6 秒随精炼缩短，不模拟）；触发攻击暴击是调用方
 * 声明的事实，不证明附伤本身的暴击能力——附伤最终暴击概率由调用方显式
 * 声明（declaredCriticalRate，无默认、替换语义），选项独占结算且缺声明
 * 拒绝；critical 分支沿用当前普通暴击伤害（条件计算模型，非游戏实测）。
 * 常驻 ATK 选项保持独立共存。
 */
const cannonRotorCriticalHitBonusDamage: Supplement = {
  kind: "option",
  ...wengineSupplement("14001", "critical-hit-bonus-damage"),
  source: "nanoka-integrated@3.2 w-engines/14001 /talents/1—5/desc",
  catalogEntityId: "w-engines:Cannon_Rotor",
  supportedRanks: "refinement 1—5；层数 0—1",
  computationTarget: "catalog option on the mapped w-engine entity",
  // 条款上下文：每档锚块 blk-legacy 的 note 冻结、常驻 ATK 机器记录
  // （legacy-self-inCombatAtkPercent / inCombatAtkPercent）的共存形状逐档核对；
  // 锚块缺失、note 漂移、共存记录缺失或变义、五档内出现直接倍率家族的
  // 机器记录（raw 或 normalized 任一表示）都拒绝生成并要求重新核对。
  wengineRefinementContextGuard: {
    stats: wengineDirectDamageSourceStats,
    tiers: cannonRotorRefinementNotes.map((note) => ({
      blockId: "blk-legacy",
      frozenNote: note,
    })),
    coexistingRecords: [
      {
        effectId: "legacy-self-inCombatAtkPercent",
        // 冻结形状字面值取自真实固定源 fac62407 的五档记录（指针
        // /wengines/20/refinementBuffs/{0..4}/effectBlocks/0/effects/0）；
        // raw 与 normalized 在该记录上逐字段相同（归一化不改写此记录），
        // 两份形状独立登记，未来来源分化须重新核对登记。
        tiers: ([7.5, 8.6, 9.7, 10.8, 12] as const).map((value) => {
          const shape: SourceRecordShape = {
            id: "legacy-self-inCombatAtkPercent",
            origin: "",
            scope: "general",
            applyTarget: "self",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            teamProfessionMinCount: null,
            skillSubcategoryId: null,
            elementFilter: "all",
            kind: "fixed",
            stat: "inCombatAtkPercent",
            value,
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            enabledDefault: true,
            note: "",
          }
          return { raw: shape, normalized: shape }
        }),
      },
    ],
  },
  skillTarget: {
    targetId: "cannon-rotor-bonus-damage",
    // 音擎附伤不属于任何固定代理人：任意强攻职业装备者都可能是命中角色。
    agentEntityId: null,
    category: "uncategorized",
    name: "加农转子暴击附伤",
  },
  evidence: wengineTalentEvidence(
    "14001",
    "e4ccbd28edd40413c974cbb05b520ac284b0c0006bd62529e8d7409b05cd95ea",
  ),
  verification:
    "Nanoka 五档天赋逐档核实（w-engines/14001/details.zh.json 的 /talents/1—5/desc，英文文件同文核对：Landing a critical hit on an enemy will inflict an additional 200% of ATK as DMG, triggerable once every 8/7.5/7/6.5/6s）：攻击命中敌人并触发暴击时，额外造成 200% 攻击力的伤害（五档同值），8/7.5/7/6.5/6 秒内最多触发一次。固定 ZZZ-HP 来源每档 blk-legacy 只编码常驻 inCombatAtkPercent 记录（既有选项与公开 ID 保持原样，与本补充共存、互不重复计算），附伤句无机器记录，按补充来源在既有 w-engines:Cannon_Rotor 实体新增选项。触发攻击命中并暴击是调用方显式声明的事实，触发间隔与次数上限不模拟，每次显式结算一次，倍率只经关联 hit-adjustment 贡献一次；触发攻击暴击不自动证明额外伤害本身必暴或不可暴——来源无该证据，附伤的暴击能力未被证实：本选项不默许任何默认概率，最终暴击概率由调用方以 hit.declaredCriticalRate 显式声明（有限 [0,1]、无默认值、替换该次独立命中的最终概率，不叠加持有者面板暴击率；启用本选项而缺声明按 MISSING_FACT 拒绝），与命中作用域暴击率贡献互斥。结果的 critical 分支沿用装备者当前普通暴击伤害：这是调用方采用的 regular 条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害（独立 item/target 与 holder-current 的结构先例来自批次 08；批次 09 南宫羽是 anomaly-settlement，不共享普通双暴通道）。附伤元素两处来源（中英文文本、块 note、data.json 面板字段）均未标注：规则不按元素筛选，独立结算的 hit.element 由调用方按实际游戏行为显式声明，不凭装备者元素、触发招式类别或音擎名称猜默认值。附伤以 regular 直伤独立项结算：伤害项读取绑定持有者当前攻击力（holder-current，无快照），要求零初始倍率与 uncategorized 分类——独立目标身份、零初始倍率、逐次声明与 uncategorized 分类是本项目采用的独立结算契约，不是原始游戏证据。适用职业强攻由目录绑定适用性校验（不适配职业零贡献）。",
  rule: {
    effectId: wengineSupplement("14001", "critical-hit-bonus-damage").effectId,
    identity: { kind: "w-engine", entityId: "14001" },
    section: "口径超规（暴击附伤）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "refinement",
        unit: "multiplier",
        values: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
      },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
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
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { refinements: [1, 2, 3, 4, 5] },
    inputs: [],
    applicability: {},
    // 独占结算：声明最终暴击概率与被结算的独立项一一对应，不留多项共享
    // 一个声明概率的歧义（目录入口在选择阶段强制）。
    exclusiveDamageItem: true,
    damageItemRequirements: [
      {
        itemId: "cannon-rotor:bonus-damage",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        // 最终暴击概率必须由调用方显式声明（hit.declaredCriticalRate），
        // 无默认值：不默许读取装备者面板普通暴击率充当该次独立命中的
        // 概率（来源未证明附伤的暴击能力）。
        requiredCriticalRateDeclaration: true,
      },
    ],
    conditionDescription:
      "攻击命中敌人并触发暴击时，额外造成 200% 攻击力的伤害（五档同值），8/7.5/7/6.5/6 秒内最多触发一次。本次附伤由调用方声明触发攻击暴击并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取装备者当前攻击力，并显式声明本次独立附伤采用的最终暴击概率（hit.declaredCriticalRate，无默认值；元素同样由调用方按实际结算声明，来源未标注）。结果的暴击分支沿用装备者当前普通暴击伤害，是本接口的条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害。触发间隔与暴击检测不模拟。同音擎的常驻攻击力选项独立共存。",
    name: "口径超规 · 暴击附伤（独立结算）",
    target: "self",
  },
}

/**
 * 本（Ben，批次 13）：影画 2[以守为攻]的格挡反击附伤。在[特殊技]或
 * [强化特殊技]中成功触发格挡反击时，额外造成本 300% 防御力的伤害。两条
 * 触发路径（技能目录的特殊技格挡反击 action:0014 与强化特殊技格挡反击
 * action:0017）是导航证据：附伤本身不继承路径的动作分类或元素，也不绑定
 * 任何已有动作（主动攻击/追加攻击/格挡追击段不经本选项结算）。触发已
 * 发生由调用方选中本选项并提供独立项断言；格挡成功检测、时间窗、追击
 * 次数、盾值与冷却不模拟。
 */
const benBiggerMindscape2BlockCounterDefenseDamage: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:benbigger:m2-block-counter-defense-damage",
  source: "nanoka-integrated@3.2 agents/1121 /talent/2/desc",
  catalogEntityId: "agents:benbigger",
  optionId: "nanoka:agents:benbigger:m2-block-counter-defense-damage",
  supportedRanks: "影画 2—6；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 2 是固定来源的真实空 pack（无块、无记录、无机器
  // 编码）；该位置出现任何新编码即拒绝生成并要求重新核对。影画 0 的
  // 团队暴率与影画 4 的反击增伤记录在其他 rank，不受本守卫影响。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 2,
    stats: directMultiplierSourceStats,
    expectsEmptyPack: true,
  },
  skillTarget: {
    targetId: "benbigger-block-counter-bonus-damage",
    agentEntityId: "1121",
    // 文本没有「被视为[X]伤害」分句：uncategorized 是本项目的独立结算
    // 约定（锁最终有效分类、不消费普通分类增益），不是游戏分类定论。
    category: "uncategorized",
    name: "本格挡反击附伤",
  },
  evidence: [
    {
      path: "agents/1121/details.zh.json",
      pointer: "/talent/2/desc",
      sha256:
        "7b29944c5851ca9da2b53fb909af7db7f34875043c4f44138b05cd9cdb41e741",
    },
  ],
  verification:
    "Nanoka 影画 2（agents/1121/details.zh.json 的 /talent/2/desc，英文文件同文核对：When successfully triggering a Block Counter during Ben's Special Attack or EX Special Attack, inflict an additional 300% of Ben's DEF as DMG）确认：在[特殊技]或[强化特殊技]中，成功触发格挡反击时，额外造成本 300% 防御力的伤害。固定 ZZZ-HP 来源的影画 2 是真实空 pack（effectBlocks/effects 为空、selfMods/teamMods 全 0），按补充来源在既有 agents:benbigger 实体新增选项；固定来源的整体 agent note（暂不支持本主 C、防御未纳入计算）是上游对本主 C 支持度的说明，不代表本项目没有防御力读取能力。触发路径导航：技能目录的特殊技格挡反击（action:agent:1121:action:0014，physical）与强化特殊技格挡反击（action:agent:1121:action:0017，fire）是文本所指的两条触发动作；主动攻击段（0013/0015）、追加攻击（0016）与格挡追击（0018）不自动等同 M2 触发，普通动作组装不自动追加本附伤。成功触发格挡反击是调用方显式声明的触发事实：选中本选项并提供独立项即断言触发已发生，本实现不检测格挡输入、时间窗、追击次数、盾值或冷却，每次显式结算一次，倍率只经关联 hit-adjustment 贡献一次。倍率为本 300% 防御力：伤害项读取绑定持有者（本）的当前防御力（holder-current，无快照），不读攻击力。附伤元素两处来源（中英文文本、固定源空块、data.json）均未标注：规则不按元素筛选，独立结算的 hit.element 由调用方按实际游戏行为显式声明，不把本固有火属性、触发动作的 physical/fire 或成功格挡本身当作证据。附伤暴击能力来源无证据：本选项不默许任何默认概率，最终暴击概率由调用方以 hit.declaredCriticalRate 显式声明（有限 [0,1]、无默认值、替换该次独立命中的最终概率，不读本面板普通暴击率；启用本选项而缺声明按 MISSING_FACT 拒绝），与命中作用域暴击率贡献互斥；r=0、r=1 与中间值都是调用方自选的条件计算假设，不是游戏结论。结果的 critical 分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读取本当前普通暴击伤害；显式来源与暴伤贡献按既有普通伤害读取契约，见执行契约的静态伤害计算）：这是调用方采用的 regular 条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害。附伤以 regular 直伤独立项结算，分类为 uncategorized（独立目标身份、零初始倍率、逐次声明与 uncategorized 分类是本项目采用的独立结算契约，不是原始游戏证据）：影画 4 反击增伤记录的 skillTargets 只含 special 分类，主动作用格挡反击动作段，uncategorized 独立项不消费影画 4 增伤（影画 4 是否覆盖本附伤未经游戏实测，属登记证据边界）；影画 0 团队暴率是实体作用域增益，不参与也不冲突本独立项的声明概率，对普通命中照常作用。与比格气缸（若本装备）是两个来源、两个事件：两选项均独占结算，同一请求混合两独立项或同时启用会被明确拒绝，合法共存是同一装备/世界下的两次独立结算，比格气缸命中级必暴的作用域不触及本独立项。适用职业防护由目录绑定适用性校验。",
  rule: {
    effectId: "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
    identity: { kind: "agent", entityId: "1121" },
    section: "影画2：以守为攻（格挡反击附伤）",
    config: mindscapeFrom(2),
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 3 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
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
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 2 },
    inputs: [],
    applicability: {},
    // 独占结算：声明最终暴击概率与被结算的独立项一一对应，不留多项共享
    // 一个声明概率的歧义（目录入口在选择阶段强制）。
    exclusiveDamageItem: true,
    damageItemRequirements: [
      {
        itemId: "benbigger:block-counter-bonus-damage",
        stat: "defense",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        // 最终暴击概率必须由调用方显式声明（hit.declaredCriticalRate），
        // 无默认值：不默许读本面板普通暴击率充当该次独立命中的概率
        // （来源未证明附伤的暴击能力）。
        requiredCriticalRateDeclaration: true,
      },
    ],
    conditionDescription:
      "影画 2：在[特殊技]或[强化特殊技]中，成功触发格挡反击时，额外造成本 300% 防御力的伤害。本次附伤由调用方声明触发并显式结算：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取本当前防御力，并显式声明本次独立附伤采用的最终暴击概率（hit.declaredCriticalRate，无默认值；元素同样由调用方按实际结算声明，来源未标注）。结果的暴击分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读本当前普通暴击伤害），是本接口的条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害。格挡成功检测、时间窗、追击次数、盾值与冷却不模拟；[特殊技]/[强化特殊技]的主动攻击、追加攻击与格挡追击段不经本选项结算。",
    name: "以守为攻 · 格挡反击附伤（独立结算）",
    target: "self",
  },
}

/**
 * 星见雅（Miyabi，批次 14）：核心被动[寒炎]的[霜灼·破]一次独立伤害与影画 4
 * [皲裂]的同事件增伤。星见雅对附着[冰焰]的敌人施加[霜寒]效果时，消除[冰焰]
 * 并触发[霜灼·破]，对目标造成星见雅攻击力缩放的烈霜伤害（按核心 1—7 取
 * 750%—1500%）。触发已发生由调用方选中本选项并提供独立项断言；异常积蓄、
 * 冰焰/霜寒/霜灼状态机、落霜取得、10 秒触发间隔与[霜灼]状态不模拟。影画 4
 * 起[皲裂]对同一独立事件的伤害 +30%（同变体 additionalRules，随影画自动
 * 生效一次，不生成第二份可漏选的完整附伤）；同句的 250 点喧响值是即时资源
 * 产出，不属于任何伤害乘区，不模拟。
 */
const miyabiFrostburnBreakDamage: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:miyabi:frostburn-break-damage",
  source:
    "nanoka-integrated@3.2 agents/1091 /passive/level/1091501—1091507/desc/0 + /talent/4/desc",
  catalogEntityId: "agents:miyabi",
  optionId: "nanoka:agents:miyabi:frostburn-break-damage",
  supportedRanks: "核心 1—7；影画 0—6",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：核心被动所在 mindscape rank 0 的两个真实块（终结技与额外
  // 能力）按锚块冻结完整 note，rank 0 位置出现直接倍率机器记录（raw 或
  // normalized）即拒绝生成并要求重新核对；影画 4 是真实空 pack
  // （effectBlocks/effects 均为空），[皲裂]语义只从 Nanoka /talent/4/desc
  // 补充登记，该位置出现任何新编码（无论 stat，含 note-only 块）同样拒绝
  // ——不伪造 M4 来源 note 或机器记录，也不让未来的上游编码与补充规则
  // 静默重复贡献。
  clauseContextGuard: [
    {
      rankKind: "mindscape",
      rank: 0,
      stats: directMultiplierSourceStats,
      anchorBlocks: [
        {
          blockId: "blk-legacy",
          frozenNote:
            "招式发动时，获得3点[落霜]，自身造成的冰属性伤害提升30%，持续12秒；",
        },
        {
          blockId: "blk-ms4msho4-fuuot6",
          frozenNote:
            "队伍中存在[支援]角色或与自身阵营相同的角色或其他[异常]角色时触发：\n[普通攻击：霜月]造成的伤害提升60%；队伍中任意角色触发[紊乱]效果时，星见雅获得2点[落霜]，且在下一次[霜月架势]期间，[普通攻击：霜月]将无视目标30%冰属性伤害抗性。",
        },
      ],
    },
    {
      rankKind: "mindscape",
      rank: 4,
      stats: [],
      expectsEmptyPack: true,
    },
  ],
  skillTarget: {
    targetId: "miyabi-frostburn-break-damage",
    agentEntityId: "1091",
    // 文本没有「被视为[X]伤害」分句：uncategorized 是本项目的独立结算
    // 约定（锁最终有效分类、不消费普通分类增益），不是游戏分类定论。
    category: "uncategorized",
    name: "霜灼·破",
  },
  evidence: [
    // 核心被动七行：倍率逐档核对（data.json level 元数据 1—7 逐行映射）。
    ...agentPassiveEvidence(
      "1091",
      "45f70931c081d73d085eadea5a23d6c21cc314019090d0577a76a9b3f722973e",
      1091501,
    ),
    // 影画 4[皲裂]：中英文同文核对（+30% 与 250 喧响值）。
    {
      path: "agents/1091/details.zh.json",
      pointer: "/talent/4/desc",
      sha256:
        "45f70931c081d73d085eadea5a23d6c21cc314019090d0577a76a9b3f722973e",
    },
    {
      path: "agents/1091/details.en.json",
      pointer: "/talent/4/desc",
      sha256:
        "bad069eb3645dde14af355e4121faef405c296d938bb0d7a512eb9f3b9c39a35",
    },
  ],
  verification:
    "Nanoka 核心被动七行（agents/1091/details.zh.json 的 /passive/level/1091501—1091507/desc/0，data.json level 元数据 1—7 逐行核对，英文文件同文核对，英文数值为千分位逗号格式 1,000% 等）确认：星见雅对附着[冰焰]的敌人施加[霜寒]效果时，将会消除[冰焰]并触发[霜灼·破]，对目标造成星见雅 750/875/1000/1125/1250/1375/1500% 攻击力（按核心 1—7）的烈霜伤害。固定 ZZZ-HP 来源的 rank 0 只有终结技块（blk-legacy）与额外能力块（blk-ms4msho4-fuuot6），没有核心寒炎机器记录；影画 4 是真实空 pack，[皲裂]语义（agents/1091 /talent/4/desc 中英文同文：[霜灼·破]造成的伤害提升30%，触发时额外获得250点喧响值）只从 Nanoka 补充登记。触发事实（对附着[冰焰]的敌人施加[霜寒]）由调用方选中本选项并提供独立项断言：不模拟异常积蓄、冰焰/霜寒/霜灼状态机、落霜取得、10 秒触发间隔、[霜灼]状态与 250 喧响值（即时资源产出不属于任何伤害乘区）。来源直接明确的是烈霜伤害与星见雅攻击力缩放，没有直接命名本项目的伤害分类枚举；本项目按已批准的 regular/direct 独立结算契约接入（分类锁定为 uncategorized，不归类为 anomaly/anomaly-settlement，不加入异常精通/等级乘区，也不与碎冰等同——这是项目契约映射，不是来源原文或游戏实测），倍率一次赋值读绑定持有者（星见雅）当前攻击力（holder-current，无快照）。烈霜按冰属性结算伤害与增益（/specialElementType/desc 中英文同文），命中元素枚举保持 frost（正式动作目录的元素伤害行全部 physical/frost，目录实体固有元素 ice 是资料属性）：规则条件按来源明文限定 hit.element=frost，非烈霜命中零贡献，不伪装 hit.element=ice 绕过。影画 4 起[皲裂]对同一独立事件的伤害 +30%：以同一变体的 additionalRules 登记进既有 damage-bonus 通道（与同通道其他增伤加法合并；影画语义按绑定档位查表取值——M0—3 为 0、M4—6 为 0.3，全档显式列出不缺档，选中即随影画自动生效一次，0 层关闭同时关闭两条规则，不生成第二份可同时开启而重复赋值的完整附伤，也不要求调用方另选可漏掉的 M4 强化开关）。显式暴击概率是项目的条件计算契约：来源未证明霜灼·破的暴击概率/能力，最终概率由调用方以 hit.declaredCriticalRate 显式声明（有限 [0,1]、无默认值、替换该次独立命中的最终概率；启用而缺声明按 MISSING_FACT 拒绝），r=0/1/中间值都是调用方自选的条件计算假设，不是游戏结论；critical 分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读星见雅当前普通暴击伤害），不证明游戏内该伤害能暴击或继承该暴击伤害。uncategorized 分类、独立目标（zzz-hp:skill:miyabi-frostburn-break-damage）、零初始倍率、一次赋值、独占结算与逐次声明是本项目采用的独立结算契约，不是原始游戏证据：防止借用 basic/chain/追加攻击或普通动作目标套增益；正式动作解析不自动派生该独立项，霜月（0011—0013）/风花（0006—0010）等普通动作不经本选项结算。终结技后的冰伤 +30%（legacy-self-dmgBonus）经批次 14 元素修正后覆盖 frost 命中，与本事件同通道加法共存（合计 ×1.60 是通道映射，非游戏实测）；额外能力的霜月增伤与冰抗忽视保持 basic+霜月精确目标，不作用于本独立事件；M1 减防、M2 普攻/闪反增伤及暴率、M6 霜月增伤的身份/数值/条件保持，M2 实体暴率不参与声明概率。",
  rule: {
    effectId: "agent:1091:nanoka:frostburn-break-damage:mindscape:0",
    identity: { kind: "agent", entityId: "1091" },
    section: "核心被动：寒炎（霜灼·破）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: coreMultiplier([7.5, 8.75, 10, 11.25, 12.5, 13.75, 15]),
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:miyabi-frostburn-break-damage"],
        },
        { kind: "one-of", fact: "hit.element", values: ["frost"] },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["miyabi:frostburn-break-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  additionalRules: [
    {
      // 影画 4[皲裂]：对同一独立事件的伤害 +30%（damage-bonus 通道）。影画
      // 语义不用规则配置门槛表达——配置不满足会把整个选择在目录阶段拒绝
      // （M0—3 连主事件都无法结算）；按绑定影画档位查表取值（M0—3 为 0、
      // M4—6 为 0.3，全档显式列出不缺档），与主规则共用同一变体、同一输入
      // 与同一层数语义，选中即随影画自动生效一次，0 层关闭同时关闭。
      effectId:
        "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4",
      identity: { kind: "agent", entityId: "1091" },
      section: "影画4：皲裂（霜灼·破增伤）",
      config: { kind: "constant", value: true },
      parameters: {
        amount: {
          kind: "by-rank",
          rank: "mindscapeRank",
          unit: "ratio",
          values: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 0.3, 6: 0.3 },
        },
      },
      scope: "hit",
      when: {
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: ["zzz-hp:skill:miyabi-frostburn-break-damage"],
          },
          { kind: "one-of", fact: "hit.element", values: ["frost"] },
        ],
      },
      operation: {
        kind: "factor-contribution",
        channel: "damage-bonus",
        value: { kind: "parameter", unit: "ratio", name: "amount" },
      },
      maximumLayers: 1,
    },
  ],
  variant: {
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    inputs: [],
    applicability: {},
    // 独占结算：声明最终暴击概率与被结算的独立项一一对应，不留多项共享
    // 一个声明概率的歧义（目录入口在选择阶段强制）。
    exclusiveDamageItem: true,
    damageItemRequirements: [
      {
        itemId: "miyabi:frostburn-break-damage",
        stat: "attack",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
        // 最终暴击概率必须由调用方显式声明（hit.declaredCriticalRate），
        // 无默认值：不默许读取星见雅面板普通暴击率充当该次独立命中的
        // 概率（来源未证明霜灼·破的暴击能力）。
        requiredCriticalRateDeclaration: true,
      },
    ],
    conditionDescription:
      "核心被动[寒炎]：对附着[冰焰]的敌人施加[霜寒]效果时，消除[冰焰]并触发[霜灼·破]，对目标造成星见雅攻击力缩放的烈霜伤害（按核心 1—7 为 750/875/1000/1125/1250/1375/1500%）。触发已发生由调用方选中本选项并提供独立项断言：命中须只携带本独立项（独占结算，混合其他伤害项会被拒绝）、以 uncategorized 分类结算、读取星见雅当前攻击力，并显式声明本次独立命中的最终暴击概率（hit.declaredCriticalRate，无默认值；烈霜命中按 frost 结算，规则限定 hit.element=frost，非烈霜命中零贡献）。结果的暴击分支沿用普通暴击伤害来源及本命中合法暴伤贡献（未显式指定来源时读星见雅当前普通暴击伤害），是本接口的条件计算模型，不证明游戏内该伤害能暴击或继承该暴击伤害。影画 4 起[皲裂]自动对同一事件伤害 +30%（影画 0—3 不生效，不要求另行选择）；同句的 250 点喧响值不模拟。异常积蓄、冰焰/霜寒/霜灼状态机、落霜取得、10 秒触发间隔与[霜灼]状态不模拟；霜月/风花等普通动作不经本选项结算。",
    name: "寒炎 · 霜灼·破（独立结算）",
    target: "self",
  },
}

/** 简 M6 同块的既有普通 CR/CD；raw 与固定来源归一化后的字段逐项一致。 */
const janeMindscape6CoexistingRecords = [
  { id: "legacy-self-critRate", stat: "critRate", value: 20 },
  { id: "legacy-self-critDmg", stat: "critDmg", value: 40 },
].map(({ id, stat, value }) => {
  const shape: SourceRecordShape = {
    id,
    origin: "",
    scope: "general",
    applyTarget: "self",
    applySituation: "global",
    applyProfession: null,
    teamProfession: null,
    teamProfessionValues: null,
    teamProfessionMinCount: null,
    skillSubcategoryId: null,
    elementFilter: "all",
    kind: "fixed",
    stat,
    value,
    stackable: false,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    enabledDefault: true,
    note: "",
  }
  return { blockId: "blk-legacy", raw: shape, normalized: { ...shape } }
})

const janeMindscape6ProficiencyDamage: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:jane:m6-proficiency-damage",
  source: "nanoka-integrated@3.2 agents/1261 /talent/6/desc",
  catalogEntityId: "agents:jane",
  optionId: "nanoka:agents:jane:m6-proficiency-damage",
  supportedRanks: "影画 6；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 6,
    stats: directMultiplierSourceStats,
    anchorBlocks: [
      {
        blockId: "blk-legacy",
        frozenName: "影画6",
        frozenEnabledDefault: true,
        frozenNote:
          "[狂热]状态下，简的暴击率提升20%，暴击伤害提升40%；\n\n（下面这条暂未补充）\n队伍中任意角色对敌人施加[强击]效果时，简将直接进入[狂热]状态，并使[狂热心流]回复至上限，此次[强击]伤害触发暴击时，将会对目标发动一次额外攻击，造成等同于简1600%异常精通的物理伤害。",
      },
    ],
    coexistingRecords: janeMindscape6CoexistingRecords,
  },
  skillTarget: {
    targetId: "jane-m6-proficiency-damage",
    agentEntityId: "1261",
    category: "uncategorized",
    name: "简影画六精通附伤",
  },
  evidence: [
    {
      path: "agents/1261/details.zh.json",
      pointer: "/talent/6/desc",
      sha256:
        "b69786037562711fda0389dc86940257a5df4504e100940781ce91a0311fa9ef",
    },
    {
      path: "agents/1261/details.en.json",
      pointer: "/talent/6/desc",
      sha256:
        "766e9864c4051ce8206a3e82e6b3f2124434063ac79f9a04557c99f2933ac689",
    },
  ],
  verification:
    "Nanoka 3.2 简影画 6 中英文 /talent/6/desc 均确认：队伍任意角色施加强击后，该次强击暴击时，简额外攻击一次，造成简自身 1600% 异常精通的物理伤害。固定 ZZZ-HP rank 6 的真实 blk-legacy 同时保留狂热状态的普通暴率 +20% / 普通暴伤 +40% 记录，note 明言附伤暂未补充；完整共存记录与块上下文分别核对 raw/normalized，不能把该位置登记为空，也不重复生成旧增益。触发强击已暴击由调用方声明，不等于新附伤必暴：本项目沿既有 declaredCriticalRate 条件计算契约，要求调用方显式给出新附伤的最终概率 r（有限 [0,1]、无默认值、替换最终概率）。普通实体暴率不能代替 r；普通暴伤使用既有显式来源及本命中合法暴伤贡献，未指定来源才读取简当前普通暴伤；不据此证明游戏中附伤能暴击或继承该暴伤。以 anomalyProficiency 点数 ×16 计算，一次赋值，不再乘攻击力或异常精通/100，不读异常掌控、触发队友或原异常虚拟代理人属性。holder-current、regular/direct、最终 uncategorized、具名目标、零初始倍率与独占一次结算是项目条件计算契约，并非来源对游戏分类或快照行为的证明；不借普通攻击、连携、追加攻击等分类增益，不自动追加到普通动作，不模拟狂热状态、强击判定或时间线。既有强击暴伤/异常增伤保持异常范围，与本 regular 附伤分离。",
  rule: {
    effectId: "agent:1261:nanoka:m6-proficiency-damage:mindscape:6",
    identity: { kind: "agent", entityId: "1261" },
    section: "「肮脏」技巧（精通附伤）",
    config: mindscapeFrom(6),
    parameters: { amount: { kind: "constant", unit: "multiplier", value: 16 } },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:jane-m6-proficiency-damage"],
        },
        { kind: "one-of", fact: "hit.element", values: ["physical"] },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["jane:m6-proficiency-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 6 },
    inputs: [],
    applicability: {},
    exclusiveDamageItem: true,
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
    conditionDescription:
      "队伍角色施加的该次强击暴击后，声明简触发一次物理附伤（自身当前异常精通 ×16）。独占 uncategorized 独立项、零初始倍率；调用方必须显式声明新附伤最终暴击概率 hit.declaredCriticalRate，触发强击已暴击不代替此声明。普通暴伤沿既有来源与命中贡献，这是条件计算，不证明附伤的游戏暴击能力或暴伤继承。狂热 CR/CD 选项独立选择，不自动加入。",
    name: "「肮脏」技巧 · 精通附伤（独立结算）",
    target: "self",
  },
}

const aliceMindscape6ProficiencyDamage: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:alice:m6-proficiency-damage",
  source: "nanoka-integrated@3.2 agents/1401 /talent/6/desc",
  catalogEntityId: "agents:alice",
  optionId: "nanoka:agents:alice:m6-proficiency-damage",
  supportedRanks: "影画 6；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 6,
    stats: [],
    expectsEmptyPack: true,
  },
  skillTarget: {
    targetId: "alice-m6-proficiency-damage",
    agentEntityId: "1401",
    category: "uncategorized",
    name: "爱丽丝影画六精通附伤",
  },
  evidence: [
    {
      path: "agents/1401/details.zh.json",
      pointer: "/talent/6/desc",
      sha256:
        "8468dbbd3d1ce6eff4fa743f96e369038ae959ec16f0aad980e500407139c42d",
    },
    {
      path: "agents/1401/details.en.json",
      pointer: "/talent/6/desc",
      sha256:
        "08eddd31bd56875c8c757156c28cf00493ec08267c9eb73b27f8f85583a827c8",
    },
  ],
  verification:
    "Nanoka 3.2 爱丽丝影画 6 中英文 /talent/6/desc 均确认：三段蓄力普通攻击或终结技使爱丽丝进入决胜状态，状态中队伍任意角色命中后，爱丽丝发动一次额外攻击，造成自身 3300% 异常精通的物理伤害，必定暴击。固定 ZZZ-HP rank 6 是真实空 pack，无 note 或机器记录，未来出现任何新块（含 note-only）或编码都需重新核对。一次事件读取绑定爱丽丝当前 anomalyProficiency 点数 ×33，不再乘攻击力或异常精通/100，不读异常掌控、触发队友或原异常虚拟代理人属性。必暴由具名附伤的 hit guaranteed-critical 来源规则保证最终概率为 1，与倍率规则同变体同步启闭，沿实际绑定、受益者、有效层与 when 判断。普通 CR 及其加数被替代，不因概率结算要求普通 CR 事实；其他真实表达式或条件的 CR 依赖仍保留。显式 criticalRate 属性来源（含本人、他人及保存快照）与 declaredCriticalRate 均不能与活动必暴共存。exclusiveDamageItem 和 core 唯一 regular/direct 项边界拒绝混合伤害项；来源必暴独立归因，不写入通用面板。普通 CD 保留显式实体、保存快照与合法命中贡献，未指定来源时才读爱丽丝当前普通暴伤；nonCritical 为反事实分支，expected 等于 critical。这一普通暴伤来源、holder-current、regular/direct、最终 uncategorized、具名目标、零初始倍率与独占一次结算是项目计算契约，不能当作游戏分类或快照实测。不把英文 follow up 描述直接映射成项目追加攻击标签，不借普通动作分类增益。调用方声明决胜状态内本次触发已发生；30 秒、1 秒触发间隔、最多 6 次及再次获得刷新只记边界，不模拟状态/时间线，不自动乘 6，不自动向普通动作追加；核心周期附伤与极性强击不由本选项计算。",
  rule: {
    effectId: "agent:1401:nanoka:m6-proficiency-damage:mindscape:6",
    identity: { kind: "agent", entityId: "1401" },
    section: "心中的百里香（精通附伤）",
    config: mindscapeFrom(6),
    parameters: { amount: { kind: "constant", unit: "multiplier", value: 33 } },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:alice-m6-proficiency-damage"],
        },
        { kind: "one-of", fact: "hit.element", values: ["physical"] },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["alice:m6-proficiency-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  additionalRules: [
    {
      effectId:
        "agent:1401:nanoka:m6-proficiency-damage:mindscape:6:guaranteed-critical",
      identity: { kind: "agent", entityId: "1401" },
      section: "心中的百里香（精通附伤 · 必定暴击）",
      config: mindscapeFrom(6),
      parameters: {},
      scope: "hit",
      when: {
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: ["zzz-hp:skill:alice-m6-proficiency-damage"],
          },
          { kind: "one-of", fact: "hit.element", values: ["physical"] },
        ],
      },
      operation: {
        kind: "guaranteed-critical",
        itemId: "alice:m6-proficiency-damage",
      },
      maximumLayers: 1,
    },
  ],
  variant: {
    configuration: { minimumMindscape: 6 },
    inputs: [],
    applicability: {},
    exclusiveDamageItem: true,
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
    conditionDescription:
      "决胜状态内队伍角色命中后，声明爱丽丝触发一次物理必暴附伤（自身当前异常精通 ×33）。独占 uncategorized 独立项、零初始倍率；来源保证本次附伤最终暴击概率为 1，不接受显式 criticalRate 来源或 declaredCriticalRate。普通暴伤沿既有来源契约；30 秒状态、1 秒间隔、最多 6 次及刷新由调用方管理，本次不自动乘 6。核心周期附伤不属于本选项。",
    name: "心中的百里香 · 精通必暴附伤（独立结算）",
    target: "self",
  },
}

/** 原手雷组合的合计强化；不推断潜能衍生手雷的增颗或倍率归属。 */
const graceMindscape6Grenades = (enhanced: boolean): Supplement => {
  const suffix = enhanced ? "ex-special" : "special"
  const actionId = `action:agent:1181:action:${enhanced ? "0013" : "0012"}`
  const skillCategory = enhanced ? "enhanced-special" : "special"
  const name = enhanced ? "超规工程清障（原两颗手雷）" : "工程清障"
  return {
    kind: "option",
    supplementId: `nanoka:agents:grace:m6-${suffix}-grenades`,
    source:
      "nanoka-integrated@3.2 agents/1181 /talent/6/desc + /skill/special/description",
    catalogEntityId: "agents:grace",
    optionId: `nanoka:agents:grace:m6-${suffix}-grenades`,
    supportedRanks: "影画 6；潜能 0—6；层数 0—1",
    computationTarget: "original grenade combination damage multiplier",
    clauseContextGuard: {
      rankKind: "mindscape",
      rank: 6,
      stats: directMultiplierSourceStats,
      anchorBlocks: [
        {
          blockId: "blk-ms4oag6c-pzzlxs",
          frozenName: "影画6",
          frozenEnabledDefault: true,
          frozenNote:
            "消耗所有[电能]发动[特殊技]或[强化特殊技]时，能够强化招式效果，额外投掷一颗手雷，并使每颗手雷造成的伤害提升至原本的200%。",
        },
      ],
      coexistingRecords: [],
    },
    skillTarget: {
      targetId: `grace-${suffix}-grenades`,
      agentEntityId: "1181",
      category: skillCategory,
      name,
    },
    evidence: (
      [
        [
          "zh",
          "39982521b198f62299a1cb4092dc1a3802c6b62748d04bcfda8f0f24b5afbdcf",
        ],
        [
          "en",
          "297e4569d52b871555ade0eb95920f40fd9aa5d9e3946404dd5903bcb4315a1a",
        ],
      ] as const
    ).flatMap(([language, sha256]) =>
      [
        "/talent/6/desc",
        ...[0, 1, 2, 3, 4, 5].map(
          (index) => `/skill/special/description/${index}/desc`,
        ),
        `/skill/special/description/${enhanced ? 7 : 6}/param/0`,
      ].map((pointer) => ({
        path: `agents/1181/details.${language}.json`,
        pointer,
        sha256,
      })),
    ),
    verification: `Nanoka 3.2 中英文 /talent/6/desc 与固定来源 rank6 的真实 note-only 块 blk-ms4oag6c-pzzlxs 一致：消耗全部电能发动特殊技或强化特殊技时，额外投掷一颗手雷，每颗伤害提升至原本的200%。普通/潜能描述 /skill/special/description/0—3 均保留普通一颗、强化两颗原手雷；倍率行 1181005 为单颗原式，1181006 原式已乘2。全部手雷命中且各次属性、元素、分类、暴击与其他乘区相同时，普通1→2颗且每颗×2，原合计×4；强化2→3颗且每颗×2，原合计×3。这是由文本与原式推导的合计表达，未经游戏实测。本选项只用 scale ${enhanced ? 3 : 4} 调整 ${actionId}:base，不改原倍率，不添加独立事件，不当作一般增伤；调用方传原始解析倍率，不能先手工乘M6。具名目标与精确原项是项目匹配契约，混合请求的其他项不受本倍率贡献影响。潜能1—6的涡流集束手雷、电磁场、工程清障·循环（29次原式除29的既有近似）和脉冲手雷/异放为不同来源行；现有证据未明确M6增颗与每颗倍率在这些衍生行的归属，未登记其M6修正，不表示游戏中它们不受益。选择1层仅声明本次消耗全部电能的强化已经触发，0层关闭；不模拟电能检测、脉冲、时间线、逐次命中、异常积蓄或失衡。技能最终等级沿既有输入，不重复增加M3/M5。`,
    rule: {
      effectId: `agent:1181:nanoka:m6-${suffix}-grenades:mindscape:6`,
      identity: { kind: "agent", entityId: "1181" },
      section: `影画6：起爆扳机（${name}）`,
      config: mindscapeFrom(6),
      parameters: {
        amount: {
          kind: "constant",
          unit: "multiplier",
          value: enhanced ? 3 : 4,
        },
      },
      scope: "hit",
      when: {
        kind: "all",
        conditions: [
          { kind: "one-of", fact: "hit.damageKind", values: ["regular"] },
          { kind: "one-of", fact: "hit.element", values: ["electric"] },
          {
            kind: "one-of",
            fact: "hit.skillCategory",
            values: [skillCategory],
          },
          {
            kind: "one-of",
            fact: "hit.skillTag",
            values: [`zzz-hp:skill:grace-${suffix}-grenades`],
          },
        ],
      },
      operation: {
        kind: "hit-adjustment",
        field: "damageMultiplier",
        operator: "scale",
        itemIds: [`${actionId}:base`],
        value: { kind: "parameter", unit: "multiplier", name: "amount" },
      },
      maximumLayers: 1,
    },
    variant: {
      configuration: { minimumMindscape: 6 },
      inputs: [],
      applicability: {},
      damageItemRequirements: [
        {
          itemId: `${actionId}:base`,
          stat: "attack",
          role: "base",
          allowedModes: ["direct"],
          source: "holder-current",
        },
      ],
      conditionDescription: `本次已消耗全部电能发动${name}，所有原组合手雷命中且各次乘区相同：${enhanced ? "原两颗变三颗，每颗×2，原合计×3" : "原一颗变两颗，每颗×2，原合计×4"}。使用原动作倍率，不重复手动强化；不包含涡流、电磁场、循环或脉冲/异放的未证M6修正。`,
      name: `影画6 · 起爆扳机（${name}）`,
      target: "self",
    },
  }
}

/** 入场比例由调用方声明；中英 based-on 文本未给出普通总乘数到比例的换算。 */
const yeshunguangVeilVulnerability: Supplement = {
  kind: "option",
  supplementId: "nanoka:agents:yeshunguang:veil-vulnerability",
  source:
    "nanoka-integrated@3.2 agents/1431 /passive/level/1431501—1431507/desc/0 + /talent/4/desc",
  catalogEntityId: "agents:yeshunguang",
  optionId: "nanoka:agents:yeshunguang:veil-vulnerability",
  supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
  computationTarget:
    "declared entry veil bonus replaces this hit's ordinary stun damage factor",
  clauseContextGuard: [
    {
      rankKind: "mindscape",
      rank: 0,
      stats: ["staggerVulnerable"],
      anchorBlocks: [
        {
          blockId: "blk-legacy",
          frozenName: "核心被动：照破无明",
          frozenEnabledDefault: true,
          frozenNote:
            "进入战场时，获得[合道]效果，暴击率提升30%，造成的伤害提升25%。",
        },
      ],
      coexistingRecords: [
        {
          blockId: "blk-legacy",
          raw: {
            id: "legacy-self-critRate",
            origin: "核心被动",
            scope: "general",
            applyTarget: "self",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            teamProfessionMinCount: null,
            skillSubcategoryId: null,
            elementFilter: "all",
            kind: "fixed",
            stat: "critRate",
            value: 30,
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            enabledDefault: true,
            note: "",
          },
          normalized: {
            id: "legacy-self-critRate",
            origin: "核心被动",
            scope: "general",
            applyTarget: "self",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            teamProfessionMinCount: null,
            skillSubcategoryId: null,
            elementFilter: "all",
            kind: "fixed",
            stat: "critRate",
            value: 30,
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            enabledDefault: true,
            note: "",
          },
        },
        {
          blockId: "blk-legacy",
          raw: {
            id: "legacy-self-dmgBonus",
            origin: "核心被动",
            scope: "general",
            applyTarget: "self",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            teamProfessionMinCount: null,
            skillSubcategoryId: null,
            elementFilter: "all",
            kind: "fixed",
            stat: "dmgBonus",
            value: 25,
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            appliesToAnomaly: true,
            enabledDefault: true,
            note: "进入战场时，获得[合道]效果，暴击率提升30%，造成的伤害提升25%。",
          },
          normalized: {
            id: "legacy-self-dmgBonus",
            origin: "核心被动",
            scope: "general",
            applyTarget: "self",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            teamProfessionMinCount: null,
            skillSubcategoryId: null,
            elementFilter: "all",
            kind: "fixed",
            stat: "dmgBonus",
            value: 25,
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            appliesToAnomaly: true,
            enabledDefault: true,
            note: "进入战场时，获得[合道]效果，暴击率提升30%，造成的伤害提升25%。",
          },
        },
      ],
    },
    {
      rankKind: "mindscape",
      rank: 4,
      stats: ["staggerVulnerable"],
      anchorBlocks: [
        {
          blockId: "blk-ms33yyc3-xr2q7r",
          frozenName: "影画4",
          frozenEnabledDefault: true,
          frozenNote:
            "进入战场时，获得1000点喧响值，在勘域模式中此效果180秒内最多触发一次；[以太帷幕·决裁]提供的帷幕易伤加成上限提升至200%。",
        },
      ],
      coexistingRecords: [],
    },
  ],
  evidence: (
    [
      [
        "zh",
        "8eeb89663329e6c021692386def9f86e19e01da5560b3b2e4b3720649cd77cad",
      ],
      [
        "en",
        "f97dddc1f6ba8661ba3f4564e1aec42afb1b20eb93d957d62fa805e1d5d6f630",
      ],
    ] as const
  ).flatMap(([language, sha256]) => [
    ...[1, 2, 3, 4, 5, 6, 7].map((rank) => ({
      path: `agents/1431/details.${language}.json`,
      pointer: `/passive/level/${1431500 + rank}/desc/0`,
      rank,
      sha256,
    })),
    {
      path: `agents/1431/details.${language}.json`,
      pointer: "/talent/4/desc",
      sha256,
    },
  ]),
  verification:
    "Nanoka 3.2 核心七档中英文描述均规定敌人进入以太帷幕·决裁时，基于当时失衡易伤施加帷幕易伤；叶瞬光招式改算帷幕易伤而不计算普通失衡易伤，加成上限110%；影画4将上限提高至200%。固定 rank0 只编码合道暴率30%/增伤25%，note不含帷幕公式；rank4是真实note-only块，冻结全文不表示实施喧响或180秒条款。中英“基于/based on”未证明普通失衡总乘数S到比例B的换算。本项目采用显式条件输入：调用方已确定的入场帷幕比例B（ratio，85%填0.85，有限非负、无默认），本命中最终失衡乘数为1+min(B,cap)，影画0—3 cap=1.1、4—6 cap=2，核心1—7相同；不从S、S−1或当前状态推算。B=0仍有效替代为1，0层才关闭。trigger.actorId是捕获敌人，activationSnapshotId给出入场时点与双方敌对观察，须匹配当前holder直伤目标；B与该事件的真实性由调用方负责，引擎不从快照核对B、不储存或跨请求冻结B。只支持holder-current缩放的regular/sharpen direct命中，不额外生成伤害项，不实施时间线。当前正式35个动作中32个伤害动作均解析为regular、3个为daze-only；分类保持原样，显式sharpen支持不证明凛刃动作映射已核实或游戏实测。普通失衡基线和队友加数被替代，其他乘区与真实when依赖保留；重复有效替代拒绝，来源单独归因。原合道及影画选项独立保留。",
  rule: {
    effectId: "agent:1431:nanoka:veil-vulnerability:mindscape:0",
    identity: { kind: "agent", entityId: "1431" },
    section: "核心被动：照破无明（帷幕易伤）",
    config: { kind: "constant", value: true },
    parameters: {
      maximumVeilBonus: {
        kind: "by-rank",
        rank: "mindscapeRank",
        unit: "ratio",
        values: { 0: 1.1, 1: 1.1, 2: 1.1, 3: 1.1, 4: 2, 5: 2, 6: 2 },
      },
    },
    scope: "hit",
    when: { kind: "constant", value: true },
    operation: {
      kind: "stun-damage-replacement",
      bonus: {
        kind: "input",
        unit: "ratio",
        name: "veilVulnerabilityBonusAtEntry",
      },
      maximumBonus: {
        kind: "parameter",
        unit: "ratio",
        name: "maximumVeilBonus",
      },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
    inputs: [
      {
        name: "veilVulnerabilityBonusAtEntry",
        unit: "ratio",
        description:
          "调用方已确定的本次入场帷幕比例B（85%填0.85，有限非负、无默认）；普通失衡总乘数S到B的换算待证，不由本输入推算。",
      },
    ],
    applicability: {},
    conditionDescription:
      "敌人本次进入以太帷幕·决裁后叶瞬光本人命中；显式提供入场敌人trigger、双方敌对快照及已确定比例B（85%=0.85）。条件模型1+min(B,影画0—3:1.1/4—6:2)替代普通失衡乘区，核心1—7相同；S→B换算待证。B=0仍替代，0层关闭；只结算本人当前属性regular/sharpen直伤，新入场须成组换事件、快照与B，历史真实性和状态时长由调用方负责。",
    name: "以太帷幕·决裁 · 帷幕易伤（声明入场比例）",
    target: "self",
  },
}

export const SUPPLEMENTS: readonly Supplement[] = [
  yeshunguangVeilVulnerability,
  graceMindscape6Grenades(false),
  graceMindscape6Grenades(true),
  evelynMindscape6LunaluxGarroteFollowUp,
  s0anbyMindscape6ElectromagneticVortex,
  dialynMindscape6AftertoneEcho,
  nekomataOrdinaryDmgBonus,
  nekomataOrdinaryShow,
  redAxis,
  identityInflectionAttackerDamageReduction,
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
  caesarStanceSwitchImpact,
  lighterMoraleBurstImpact,
  jufufuTigersRoarImpact,
  dialynInitialCritRateImpact,
  lighterMindscape4FrontlineEnergyRegen,
  alexandrinaMindscape4DeployedDollsEnergyRegen,
  roxyInitialEnergyRegenConversion,
  crimsonMoonCasketCritRate,
  crimsonMoonCasketWindResIgnore,
  crimsonMoonCasketSquadDamageBonus,
  nangongyuMindscape6VibratoModified("nonphysical"),
  nangongyuMindscape6VibratoModified("physical"),
  ...pr10DriveDiscBoundaries,
  ...pr10WEngineBoundaries,
  ...pr10ProviderBoundaries,
  ...pr10ReviewFixClauses,
  bigCylinderRetaliationDefenseDamage,
  cannonRotorCriticalHitBonusDamage,
  benBiggerMindscape2BlockCounterDefenseDamage,
  miyabiFrostburnBreakDamage,
  janeMindscape6ProficiencyDamage,
  aliceMindscape6ProficiencyDamage,
]

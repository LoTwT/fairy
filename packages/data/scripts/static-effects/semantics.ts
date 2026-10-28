import type {
  DamageElement,
  DamageKind,
  MindscapeRank,
  SkillCategory,
  SpecialSkillLevel,
  StaticCatalogDamageItemRequirement,
  Unit,
} from "@randomplay/shared"
import type { SourceRecordShape } from "./supplements.ts"
import {
  PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE,
  PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS,
  PHEONY_ADDITIONAL_ABILITY_TEAM_CONDITION_DIFFERENCE_ID,
} from "./pheony-additional.ts"
import {
  PHEONY_M2_BURN_DURATION_DAMAGE_KINDS,
  PHEONY_M2_BURN_DURATION_DIFFERENCE_ID,
  PHEONY_M2_BURN_DURATION_ELEMENT,
  PHEONY_M2_BURN_DURATION_EVIDENCE,
  PHEONY_M2_BURN_DURATION_EXPECTED_BLOCK_NOTE,
  PHEONY_M2_BURN_DURATION_EXPECTED_RAW_ENCODING,
  PHEONY_M2_BURN_DURATION_REQUIREMENT,
} from "./pheony-m2.ts"

/**
 * 本轮新增的来源记录语义登记。只描述对固定来源记录的已核实解释及其证据，
 * 不复制上游数据；数值仍由转换器编译为现有 NumericExpression。
 *
 * 键使用 category/entityId/rankKind/rank/blockId/effectId 的稳定组合，不以名称匹配；
 * 数组重排不影响键的稳定性。核心档位参数证据仍维护在 rank-evidence.json，
 * 本文件不重复维护同一份核心参数。
 */

export interface SemanticsEvidenceReference {
  /**
   * 证据根：integrated 表示相对发布副本的冻结资源路径；data-package 表示
   * 相对 packages/data 的已提交冻结夹具（3.2.5 补充来源层使用）。
   */
  readonly source?: "integrated" | "data-package"
  /** 相对证据根的冻结资源路径。 */
  readonly path: string
  readonly pointer: string
  readonly sha256: string
}

/**
 * ZZZ-HP 开发者修订导出的冻结证据：独立于 Nanoka integrated，也不属于固定
 * 增益提交。原始文件保存在本机 raw（不进 Git/npm）；生成时按整文件摘要与
 * Pointer 核对修订内容（见 developer-revision.ts），离线测试只使用已提交的
 * 修订参数与摘要元数据，不依赖 raw 存在。
 */
export interface DeveloperRevisionEvidence {
  /** 冻结导出文件相对数据包根目录（packages/data）的本地 raw 路径。 */
  readonly path: string
  readonly sha256: string
  readonly exportedAt: string
  readonly pointer: string
}

/**
 * 按特殊技最终等级取值的参数：value(level) = base + growth × level。
 * 表达式来自来源技能描述中的明确等级公式；由转换器生成合法等级表，
 * 与缺档猜测不同。
 */
export interface SpecialSkillLevelParameterSpec {
  readonly name: string
  readonly unit: Unit
  readonly base: number
  readonly growth: number
}

export interface CoreSkillLevelSemantics {
  readonly kind: "core-skill-level"
  /** 参数和逐档原文的唯一来源；必须是精确记录级键，不能扩大块级支持。 */
  readonly baseEvidenceKey: string
  readonly formula:
    | { readonly kind: "amount" | "capped-conversion" }
    | {
        readonly kind: "proportional-increment" | "capped-conversion-increment"
        readonly enhancementEvidenceKey: string
      }
  readonly evidence: readonly SemanticsEvidenceReference[]
  readonly verification: string
}

export const YUZUHA_COMPLETE_STATE_OPTION_ID =
  "agents:yuzuha:mindscape:0:tanuki-wish-complete-state"
export const YUZUHA_COMPLETE_STATE_DIFFERENCE_ID =
  "yuzuha-additional-ability-complete-state"

export const HUGO_ATTACK_SOURCE_KEY =
  "agents/hugo/mindscape/0/blk-legacy/legacy-self-atk"
export const HUGO_ATTACK_COUNT_DIFFERENCE_ID = "hugo-other-stun-teammate-count"
export const HUGO_ATTACK_COUNT_DESCRIPTION =
  "调用方声明其他击破队友人数：0 关闭，1/2 人分别获得对应核心档的一倍/三倍固定攻击力；不自动计数，不要求失衡或暗渊回响。旧 3 层须迁移为新 2 人；核心 7 的旧 2 层 +600 改为二人 +900，一人仍 +300。"

/**
 * 伤害种类范围修正的共享字段：既用于独立的 damage-kind-scope-correction，
 * 也允许嵌套在 potential-level 等已有语义上组合执行，避免同一记录因已有
 * 潜能档位修正而无法再登记宽口径收窄。
 */
export interface DamageKindScopeCorrectionFields {
  /** 防漂移：登记时来源记录（raw 与 normalized）应逐字段保持的编码。 */
  readonly expectedEncoding: Readonly<Record<string, unknown>>
  /** 全局映射当前生成的伤害种类集合；用于定位待改写的条件。 */
  readonly expectedDamageKinds: readonly DamageKind[]
  /** 按块 note 与 Nanoka 同文收窄后的伤害种类集合。 */
  readonly correctedDamageKinds: readonly DamageKind[]
  /** 防漂移：固定来源 raw/normalized 块的真实完整 note 原文。 */
  readonly expectedSourceBlockNote: string
}

export type SourceSemantics =
  | {
      /**
       * 已审计但当前不执行的来源条款：转换器不生成贡献，只保留带原因的
       * unsupported 迁移入口。用于 D4 的额外能力同队条件、M2 灼烧时长
       * 上游挂错、M4 40% 暴伤待 D4-1b 接管等明确缺口；不得用零值或近似
       * 通道冒充已支持。
       */
      readonly kind: "declared-unsupported"
      readonly reason:
        | "semantic-conflict"
        | "formula-out-of-scope"
        | "missing-parameter"
      readonly explanation: string
      readonly expectedEncoding?: Readonly<Record<string, unknown>>
      readonly expectedSourceBlockNote?: string
      readonly differenceId?: string
      readonly evidence?: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 3.2.5 补充来源的核心块记录是固定值（85 精通、30/25 暴击等），
       * 不依赖核心等级参数；登记后转换器不再要求 rank-evidence 的核心档位
       * 证据，避免把固定值误判为 missing-rank-evidence。
       */
      readonly kind: "supplemental-flat-source"
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 3.2.5 补充来源把异放暴击率/暴伤记为 anomalyReleaseCritRate/Dmg；
       * C1 的独立子类通道要求异放走 anomaly-settlement-critical-*。该登记
       * 只覆盖菲欧妮的已核对记录，不改变 fac62407 既有爱芮记录的映射。
       */
      readonly kind: "settlement-critical-channel"
      readonly correctedStat:
        | "anomalySettlementCritRate"
        | "anomalySettlementCritDmg"
      readonly expectedRawStat:
        | "anomalyReleaseCritRate"
        | "anomalyReleaseCritDmg"
      readonly expectedValue: number
      readonly explanation: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定记录缺少题注中已明文的条件（如菲欧妮额外能力的同队资格）。
       * 转换器按登记补齐 applicability 候选资格并标为 corrected；raw 与
       * normalized 的冻结字段、块 note 关键条款与“不得新增 conditions”
       * 任一漂移即拒绝生成。`correctedStat` 只用于同一条款同时需要改投
       * 专用通道的已核对记录。
       */
      readonly kind: "teammate-eligibility-correction"
      /** 生成错误的稳定主题前缀，避免通用处理器硬编码某个角色的名称。 */
      readonly sourceLabel: string
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      readonly expectedSourceBlockNoteIncludes: string
      readonly otherTeammateProfessions: readonly string[]
      readonly otherTeammateAgentEntityIds: readonly string[]
      readonly correctedStat?: "anomalySettlementCritDmg"
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /** 已展开的来源转化率发生舍入；以独立原文及单次异常基数恢复精度。 */
      readonly kind: "source-conversion-rate-correction"
      readonly expectedEncoding: SourceRecordShape
      readonly expectedSourceBlockNote: string
      readonly correctedRate: number
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | (Omit<CoreSkillLevelSemantics, "kind"> & {
      readonly kind: "hugo-stun-teammate-count"
      readonly expectedRaw: SourceRecordShape
      readonly expectedNormalized: SourceRecordShape
      readonly expectedSourceBlockNote: string
      readonly layerCountInputName: string
      readonly differenceId: string
    })
  | {
      /** 极性紊乱尚无完整结算；隔离三条误入普通紊乱/乱流的来源记录。 */
      readonly kind: "isolated-polarity-disorder"
      readonly expectedEncoding: SourceRecordShape
      readonly expectedSourceBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定记录的乘区与块原文及 Nanoka 同文矛盾（焰心桂冠 R5 的萎靡被记为
       * dmgBonus、克拉蕾影画一的"伤害倍率提升至原本的 130%"被记为
       * skillDmgBonus）：按登记的修正字段查既有 FIELD_MAPPINGS 编译，
       * 原始 stat 与数值保留在覆盖报告与固定源引用中；只覆盖登记身份。
       */
      readonly kind: "source-stat-correction"
      readonly correctedStat:
        | "critDmg"
        | "directDmgMultFactor"
        | "pierceDmgBonus"
      readonly expectedProfession: string
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      readonly expectedSourceBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /** 八条正/负部分记录全部迁移；新身份承载阈值钳零后的两条完整贡献。 */
      readonly kind: "complete-state-tanuki-wish"
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      readonly expectedBlockNoteIncludes: readonly string[]
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | CoreSkillLevelSemantics
  | {
      /**
       * 记录实际由调用方显式选择的状态启用；来源不提供核心等级依赖，
       * 转换器不得为其伪造核心门槛。
       */
      readonly kind: "explicit-selection-state"
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /** 记录按特殊技最终等级查表取参；variant 必须声明支持的最终等级集合。 */
      readonly kind: "special-skill-level"
      readonly levels: readonly SpecialSkillLevel[]
      readonly parameters: readonly SpecialSkillLevelParameterSpec[]
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 来源块原文及补充来源同时证明：该结算允许失衡内与失衡恢复后的固定快照；
       * 记录中的 applySituation: stagger 不构成游戏只允许失衡内结算的证据。
       * 是否失衡仍独立影响实际失衡乘区，由其他规则照常表达。
       *
       * 可选 vibratoModifiedExclusion：影画 6 的[颤音：改]与普通[颤音]无法
       * 相互叠加（Nanoka /talent/6/desc 明文）；携带[颤音：改]独立结算目标
       * 的命中不再吃本普通颤音贡献，普通颤音结算保持原行为。防漂移按
       * raw/normalized 编码与冻结块 note 双份核对；依赖的补充参与转换而
       * 本记录缺失时拒绝生成。
       */
      readonly kind: "stagger-recovery-settlement"
      readonly vibratoModifiedExclusion?: {
        /** 被排除的独立目标 ID（目录 targetId 的 zzz-hp:skill: 尾段）。 */
        readonly excludedTargetId: string
        readonly dependentSupplementIds: readonly string[]
        readonly differenceId: string
        /** 防漂移：登记时来源记录（raw 与 normalized）应逐字段保持的编码。 */
        readonly expectedEncoding: Readonly<Record<string, unknown>>
        /** 防漂移：固定来源 raw/normalized 核心块的真实完整 note 原文。 */
        readonly expectedSourceBlockNote: string
      }
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 颤音：改共存排除（独立登记）：影画 6 明文[颤音：改]与[颤音]无法相互
       * 叠加；固定来源把普通颤音条款编为不限独立结算身份的异常放乘区记录，
       * 携带[颤音：改]独立目标的命中会同时吃旧贡献。转换器保留原稳定
       * effectId、数值与既有条件，仅追加对登记独立目标的排除：携带该目标
       * 的命中不吃本贡献，普通颤音结算保持原行为。防漂移（raw/normalized
       * 编码与冻结块 note）在 compile 开头执行、早于通用 unsupported 降级；
       * 依赖的补充参与转换而本记录缺失时拒绝生成。
       */
      readonly kind: "exclude-settlement-target"
      readonly excludedTargetId: string
      readonly dependentSupplementIds: readonly string[]
      readonly differenceId: string
      /** 防漂移：登记时来源记录（raw 与 normalized）应逐字段保持的编码。 */
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      /** 防漂移：固定来源 raw/normalized 块的真实完整 note 原文。 */
      readonly expectedSourceBlockNote: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 记录的倍率只作用于声明身份的原异常基础项：转换器以 hit-adjustment 的
       * itemIds 精确绑定该伤害项，变体通过 damageItemRequirements 声明其
       * 身份、属性、角色、模式与原异常归属，供消费端发现与目录入口校验。
       */
      readonly kind: "damage-item-targeting"
      readonly requirement: {
        readonly itemId: string
        readonly stat:
          | "attack"
          | "health"
          | "defense"
          | "sheerForce"
          | "impact"
          | "anomalyProficiency"
          | "anomalyMastery"
          | "energyRegen"
          | "adrenalineRegen"
        readonly role: "base" | "settlement"
        readonly allowedModes: readonly (
          | "direct"
          | "standard-disorder"
          | "standard-vortex"
        )[]
        readonly source: "holder-current" | "anomaly-source"
        /** 仅 direct 模式：要求消费端输入的基础倍率为 0，实际倍率由关联规则贡献一次。 */
        readonly requiredDirectMultiplier?: 0
        /** 独立结算项要求的命中分类；命中借用其他分类时目录拒绝。 */
        readonly requiredSkillCategory?: SkillCategory
        readonly originalAnomalyAttribute?: DamageElement
      }
      /** 记录属于核心被动的潜能分支时补充潜能门槛；未开启潜能（0）不可用。 */
      readonly minimumPotential?: number
      /**
       * 独立命中契约：输出项作用声明的独立目标，规则条件只匹配该目标、
       * 声明元素与伤害种类；目录同时登记该目标的 skillTargets 条目，
       * 消费端以 skillTargetIds 显式选中。分类为项目采用的独立结算
       * 契约，不能冒充原始游戏证据，须在 verification 中如实分层记录。
       */
      readonly independentHit?: {
        readonly targetId: string
        readonly category: SkillCategory
        readonly element: DamageElement
        readonly name: string
      }
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把“持有者亲自施加的原异常持续时间 +N 秒”编成全队或仅某
       * 伤害种类的持续记录：修正为具名 corrected，并通过独立结算伤害项
       * 要求 `holder-anomaly-source` 验证明细绑定持有者、本次
       * `damage.anomalySource` 与伤害项 `statSource` 的实体与快照身份完全
       * 一致。秒数继续进入既有 `anomaly-duration-addition` 通道，只允许
       * 声明的伤害种类与元素读取；不新增机制 arm，也不模拟时间线。
       */
      readonly kind: "holder-anomaly-duration"
      readonly requirement: StaticCatalogDamageItemRequirement
      readonly damageKinds: readonly ("disorder" | "vortex")[]
      readonly element: DamageElement
      /** 防漂移：原始记录逐字段保持的固定源编码。 */
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      /** 防漂移：所属固定源块的完整 note 原文。 */
      readonly expectedSourceBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 独立目标的实际增益分类与来源临时归类不同：目录目标元数据与条件展开
       * 同步改为声明类别，条件只匹配独立目标本身、伤害种类与元素，
       * 不附加来源临时的大类要求。
       */
      readonly kind: "independent-target"
      readonly targetId: string
      readonly category: SkillCategory
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 记录对应来源的潜能分支（Nanoka passive 节点 potential 为 102100—102105）：
       * 规则与变体必须显式声明潜能门槛，未开启潜能时不可用。
       */
      readonly kind: "potential-branch"
      readonly minimumPotential: number
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 记录按潜能等级查表取参（Nanoka potentialDetail 明确各潜能数值）：
       * 不能由层数、影画或其他培养维度代替；maximumLayers 默认归一为 1，
       * 仅真实叠层效果（如艾莲极冰带每层）显式保留来源层数上限。
       */
      readonly kind: "potential-level"
      readonly minimumPotential: number
      readonly levels: readonly number[]
      readonly parameters: readonly {
        readonly name: string
        readonly unit: Unit
        readonly values: Readonly<Record<string, number>>
      }[]
      /** 选项实际适用的激活层数上限；省略表示单次状态。 */
      readonly maximumLayers?: number
      /**
       * 潜能档位记录仍可能使用比块 note 更宽的全局伤害种类映射。
       * 与 potential-level 组合执行：先按档位取参，再收窄 damageKind。
       */
      readonly damageKindScope?: DamageKindScopeCorrectionFields & {
        readonly differenceId: string
      }
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 同一触发状态的固定 + 升级部分记录已合并为一个完整状态选项：
       * 该部分记录不再进入规则集，输出带原因的 unsupported 变体，
       * 消费端选择时得到迁移说明而不是重复贡献。
       */
      readonly kind: "merged-partial-record"
      /** 接收该语义的完整状态选项 ID。 */
      readonly mergedIntoOptionId: string
      /** 部分记录原本覆盖的潜能等级；用于错误定位。 */
      readonly levels: readonly number[]
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 上游 elementFilter 只登记了目录实体的固有元素枚举（如烈霜角色实体
       * 固有元素 ice），而同一结算分支的证据（星见雅 /specialElementType：
       * 烈霜属性基于冰属性结算伤害与增益，中英文同文）与正式动作目录证明
       * 该条款的合法受益命中还包含另一个命中枚举（frost——星见雅正式动作
       * 的元素伤害行全部使用 physical/frost，无 ice）。转换器保留登记元素
       * 并显式追加补充元素，只在具名完整身份规则的命中元素条件里追加，
       * 不改全局元素归并、不扫描修全角色。防漂移：raw 与 normalized 两份
       * 记录编码（含 elementFilter 与完整 skillTargets 元组）与冻结完整块
       * note 逐字核对，先于通用 unsupported 降级拒绝；未来偏移的记录不再
       * 静默纠正，也不以局部 ID 子串定位。
       */
      readonly kind: "settlement-element-scope"
      /** 按结算证据显式追加的命中元素枚举（保留登记元素）。 */
      readonly additionalElement: "frost"
      /** 防漂移：登记时来源记录（raw 与 normalized）应逐字段保持的编码。 */
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      /** 防漂移：固定来源 raw/normalized 块的真实完整 note 原文。 */
      readonly expectedSourceBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | (DamageKindScopeCorrectionFields & {
      /**
       * stat 的全局伤害种类映射比块 note 与 Nanoka 同文更宽（维琳娜
       * M0/M2/M6 的 `anomalyDmgBonus` 同时覆盖 vortex，与同块的
       * `turbulenceDmgBonus` 记录重复计入同一乱流命中）。转换器保留
       * 记录、数值、通道与稳定 ID，只把 `hit.damageKind` 条件从
       * `expectedDamageKinds` 收窄为 `correctedDamageKinds`；raw 与
       * normalized 的登记编码、完整块 note 任一漂移即拒绝生成。
       */
      readonly kind: "damage-kind-scope-correction"
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    })
  | {
      /**
       * 记录按固定来源字段转换，但来源自身的字段与块说明文字存在具名差异
       * （如克拉蕾[残锋]锐暴提升的 applyTarget=self 与说明"全队[锋御]"）：
       * 转换遵循来源字段，不凭文字扩大受益范围或改写落点；差异记录在目录
       * differences，说明文字中的状态条件仍由调用方显式选择断言。
       * 记录编码本身与文本矛盾（克拉蕾影画一的倍率条款）时改用
       * source-stat-correction 按登记的修正字段编译，不属本类别。
       */
      readonly kind: "named-source-discrepancy"
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 上游 elementFilter 未编码正式文本中的元素限制（如猩红渴望的
       * "电属性伤害提升"与"电属性锐化伤害提升"记为 all）：规则条件补充
       * 声明元素，目录以具名差异记录该来源差异。
       */
      readonly kind: "explicit-element-scope"
      readonly element: DamageElement
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 上游记录未编码块 note 与 Nanoka 同文已明确的受益职业和伤害类别
       * （如蕾米埃尔影画 2 的"队伍中[异常]角色……造成属性异常伤害时，
       * 无视目标15%的防御力"记为 scope general、applyProfession null、
       * appliesToAnomaly true）：general 直接放行全部伤害种类且只有
       * applyProfession 非空才检查职业，直伤与其他职业都会受益。
       * 转换器按文本补充受益职业与伤害种类条件，状态记为 corrected 并登记
       * 具名差异；来源原始 scope/applyTarget/appliesToAnomaly 保留在覆盖报告。
       * 职业判断对象与减防读取对象是本次命中者（对应固定来源的异常类触发者
       * triggerAgentId），不是增益提供者、异常强度提供者或历史快照来源。
       */
      readonly kind: "attribute-anomaly-beneficiary-scope"
      /** 文本限定的受益职业；来源职业词汇原值（如 异常）。 */
      readonly profession: string
      /**
       * 本条对应的伤害种类；按固定计算链的异常类范围登记，与 anomalyDmgBonus
       * 等增伤通道各自独立，不共用同一适用集合。
       */
      readonly damageKinds: readonly DamageKind[]
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把该记录的机制错误编码为上游通用 `special` 乘区；ZZZ-HP
       * 开发者修订导出确认该记录实为异常伤害提升（anomalyDmgBonus），数值
       * 不变。转换器按修订后的字段查映射编译（进入既有异常增伤乘区，限
       * 普通异常、异放、乱流与耀变，不含紊乱），状态记为 corrected 并登记
       * 具名差异；原始 stat、原值与固定源 Pointer 保留在覆盖报告，修订
       * 证据以独立来源登记。原始 stat 或数值与登记不符即拒绝生成，不静默
       * 套用到其他 special 记录。
       */
      readonly kind: "developer-revised-stat"
      /** 修正所针对的原始来源字段名；来源记录仍使用该编码。 */
      readonly originalStat: string
      /** 修订后的来源字段名；必须在 FIELD_MAPPINGS 中有非拒绝映射。 */
      readonly revisedStat: string
      /** 修订后该记录的来源数值；与冻结导出及固定源原值同时核对。 */
      readonly revisedValue: number
      readonly differenceId: string
      readonly evidence: readonly DeveloperRevisionEvidence[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把按层结算的机制错误编码为固定单次贡献（kind=fixed、
       * stackable=false、maxStacks=1、valuePerStack=0），而块 note 与
       * Nanoka 同文明确该数值按层生效且存在层数上限（青溟笼舍精炼 1—5 的
       * 以太贯穿增伤：每层 10/11.5/13/14.5/16%，最多 2 层）。转换器保留
       * 稳定 effectId / optionId 与既有条件，把该贡献改为按层编译：每层值
       * 取来源 value，层数上限取登记值；状态记为 corrected 并登记具名差异。
       * 原始与规范化记录的编码或数值与登记不符即拒绝生成。证据级别为
       * “按一致描述纠错”，不是游戏实测结论。
       */
      readonly kind: "stacked-mechanism-correction"
      /** 编译后的选项激活层数上限；来自描述的层数上限。 */
      readonly maximumLayers: number
      /** 原始记录应携带的来源数值；与冻结 JSON 及描述的每层值同时核对。 */
      readonly expectedSourceValue: number
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把“能量自动回复提升若干点/秒”的固定值编入 energyRegen 百分比
       * 字段（读取为基础回能 × value/100，基础回能 1.2 时 +0.4 记录实际增加
       * 0.48 点/秒）；块 note 与 Nanoka 同文均为固定点数/秒。转换器按具名登记
       * 把该记录编译为固定回能加数（energy-per-second，value × 0.01），不随
       * 基础回能缩放；真正的百分比回能记录（摇摆爵士/月光安可二件套 +20%）
       * 不在登记内，energyRegen 的百分比语义保持不变。原始与规范化记录的
       * stat、编码或数值与登记不符即拒绝生成。
       */
      readonly kind: "flat-energy-regen"
      /** 原始记录应携带的来源数值（= 固定点数/秒 × 100）；漂移即拒绝。 */
      readonly expectedSourceValue: number
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源的记录数值与其自身块 note 及 Nanoka 同文矛盾（如千面日陨
       * 精炼 4 的暴伤记 62.25，note 与 Nanoka 均为 65.25）：按登记的修正值
       * 编译，原值保留在覆盖报告与固定源引用中。原始与规范化数值与登记的
       * 期望原值不符即拒绝生成，防止来源升级时静默套用旧修正。
       */
      readonly kind: "source-value-correction"
      readonly expectedSourceValue: number
      readonly correctedValue: number
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源的 applyTarget 与块 note 及 Nanoka 同文矛盾（如聚宝箱精炼 1
       * 的“所有单位”记为 self、喵运当头五档的装备者防御记为 team）：按登记
       * 修正受益对象，规则 beneficiary 与目录选项 target 同步更正，其余条件、
       * 数值与稳定 ID 不变。原始与规范化 applyTarget 或数值与登记不符即拒绝。
       */
      readonly kind: "beneficiary-target-correction"
      readonly expectedApplyTarget: "self" | "team"
      /** 修正后的目录对象："self" 表示仅装备者（holder），"team" 表示全队。 */
      readonly correctedOptionTarget: "self" | "team"
      /** 原始记录应携带的来源数值（fixed 记录取 value，stacked 记录取 valuePerStack）。 */
      readonly expectedSourceValue: number
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 来源把状态的触发条件（元素命中、追加攻击分类）编码为增益的受益筛选：
       * 块 note 与 Nanoka 同文证明该元素／招式分类只是取得状态的触发条件，
       * 状态期间的受益不限定触发时的元素或追加攻击分类。转换器按登记移除
       * 对应的命中条件；嚣枪喧焰规则保留固定来源 scope=skill 派生的直伤种类
       * （regular/sheer/sharpen）限制与层数上限——中文与英文文本及项目伤害
       * 分类契约均未界定异常类是否受益，该范围保留待证，不以文本为已证结论。
       * 触发事实、持续秒数与层数由调用方显式选择声明，不模拟时间线。个别
       * 记录伴随来源数值误录（嚣枪喧焰精炼 1 每层 16 应为 15），由
       * valueCorrection 一并登记。编码或数值漂移即拒绝。
       */
      readonly kind: "trigger-conditions-not-benefit-scope"
      /** 移除以元素命中筛选受益的条件（对应来源 elementFilter）。 */
      readonly removeElementCondition: boolean
      /** 移除以技能目标/追加攻击分类筛选受益的条件（对应来源 scope=skill）。 */
      readonly removeSkillTargetConditions: boolean
      /** 防漂移：登记时来源记录应携带的 elementFilter 原值。 */
      readonly expectedElementFilter: "all" | readonly string[]
      /** 防漂移：登记时来源记录 skillTargets 的分类序列（无目标时为空数组）。 */
      readonly expectedSkillTargetCategories: readonly string[]
      /** 可选：同记录每层/固定数值的来源误录与修正值。 */
      readonly valueCorrection?: {
        readonly expectedSourceValue: number
        readonly correctedValue: number
      }
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 五档精炼共用同一块 note，但 note 数值只描述精炼 1（血髓秘匣五档均写
       * “1%暴击率 转 0.48% 增伤 / 上限24%”）；来源数值本身按精炼正确，仅共享
       * 说明无法表达当前精炼。选项的 conditionDescription 按登记的精炼感知
       * 文本覆盖，数值、规则与稳定 ID 不变；块 note 漂移即拒绝生成。
       */
      readonly kind: "refinement-value-description"
      /** 覆盖后的选项说明，须能表达全部精炼档位的取值。 */
      readonly conditionDescription: string
      /** 防漂移：登记时各档共用的块 note 原文。 */
      readonly expectedBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把命中局部的直接属性增益错误编码为其他通道的层数记录
       * （如比利影画 4 的“强化特殊技命中暴击率最高 32%”被记为 stacked
       * skillDmgBonus、32 层 × 1%），而块 note 与 Nanoka 同文明确该数值是
       * 本次命中的暴击率提升。转换器按登记修正为 hit 作用域的直接属性
       * 贡献：数值改由调用方显式输入（比例，登记上下限内按表达式钳制，
       * 不推导距离等函数、不设默认值），废除来源层数编码，激活层数上限
       * 改为登记值；旧层数用法在目录层被拒绝并由具名差异说明迁移。原始
       * 与规范化记录的编码字段与登记不符即拒绝生成。
       */
      readonly kind: "hit-scope-direct-stat-input"
      /** 修正后的直接属性落点（如 criticalRate）。 */
      readonly stat: "criticalRate"
      /** 目录 inputs 的说明文字；声明输入含义、单位与合法范围。 */
      readonly inputDescription: string
      /** 输入下限（比例）；低于下限的读数按表达式钳制为下限。 */
      readonly minimum: number
      /** 输入上限（比例）；高于上限的读数按表达式钳制为上限。 */
      readonly maximum: number
      /** 修正后的激活层数上限；来源的 maxStacks 编码废除。 */
      readonly maximumLayers: number
      /** 防漂移：登记时来源记录应逐字段保持的编码。 */
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把“敌人进入失衡状态时触发”的限时增益记录编码为
       * applySituation: stagger（受益要求目标当前处于失衡），而块 note 与
       * Nanoka 同文明确进入失衡只是触发事实：增益持续登记秒数，期间是否
       * 失衡不影响受益。转换器移除派生的 hit.targetState 条件；状态是否
       * 仍有效由调用方显式选择 supplied 实例声明——当前失衡但未声明状态
       * 不自动获得，声明有效但目标已退出失衡仍照常贡献。触发、持续与
       * 刷新不模拟时间线。原始与规范化记录的登记字段漂移即拒绝生成。
       */
      readonly kind: "triggered-state-not-benefit-condition"
      /** 防漂移：登记时来源记录的 applySituation 原值。 */
      readonly expectedApplySituation: "stagger"
      /** 防漂移：登记时来源记录的 stat 与数值。 */
      readonly expectedStat: string
      readonly expectedValue: number
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 记录的倍率修正只描述具名技能（如伊芙琳核心被动“[月辉丝·绊]、
       * [月辉丝·弦音]与[月辉丝·弦影]的伤害倍率提升至原本的 125%”），固定
       * 来源把它编为整个技能大类的 base-multiplier-increase；同一大类内的
       * 新独立追击目标（影画 6 的[月辉丝·弦]）不在具名列表中，直接沿用
       * 大类条件会把追击倍率错误放大。转换器保留原稳定 ID、数值与大类
       * 条件，只追加对登记独立目标的明确排除：命中携带该目标时不吃本
       * 倍率修正，普通大类命中保持原行为；状态记为 corrected 并登记具名
       * 差异。防漂移校验（完整 skillTargets 元组与核心块冻结完整 note，
       * raw/normalized 双份）在 compile 开头执行、早于通用 unsupported
       * 降级；原始与规范化记录的编码与登记不符即拒绝生成。
       */
      readonly kind: "exclude-skill-target-scope"
      /** 被排除的独立目标 ID（目录 targetId 的 zzz-hp:skill: 尾段）。 */
      readonly excludedTargetId: string
      /**
       * 依赖本修正存在的补充登记：该补充参与本次转换而登记的来源记录
       * 完整身份（语义键）缺失——上游把原核心块或记录改名、移除都会让
       * 语义键落空、旧倍率不再排除而继续编译——生成期拒绝并要求重新
       * 核对。依赖补充不参与时不做无条件检查，避免误拒局部转换夹具。
       */
      readonly dependentSupplementIds: readonly string[]
      /** 防漂移：登记时来源记录应逐字段保持的编码。 */
      readonly expectedStat: string
      readonly expectedValue: number
      readonly expectedScope: string
      /**
       * 防漂移：登记时来源记录 skillTargets 的完整元组（category 与
       * subcategoryId，空子类为 null）；子类身份漂移即拒绝，不能只比对
       * category 序列。
       */
      readonly expectedSkillTargets: readonly {
        readonly category: string
        readonly subcategoryId: string | null
      }[]
      /**
       * 防漂移：固定来源 raw/normalized 核心块的真实完整 note 原文；
       * 追加、替换或缺失都拒绝，不从待验证输入推导期望。
       */
      readonly expectedSourceBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把普通攻击范围错误收窄到单个子类，而块 note 与 Nanoka
       * 同文说明覆盖全部普通攻击（可另带冲刺攻击目标）。转换器保留原
       * 稳定 ID 与数值，只按登记替换 skillTargets；raw/normalized 的
       * stat、数值、目标元组与完整块 note 任一漂移即拒绝生成。
       */
      readonly kind: "skill-target-scope-correction"
      readonly expectedStat: string
      readonly expectedValue: number
      readonly expectedSkillTargets: readonly {
        readonly category: string
        readonly subcategoryId: string | null
      }[]
      readonly correctedSkillTargets: readonly {
        readonly category: string
        readonly subcategoryId: string | null
      }[]
      readonly expectedSourceBlockNote: string
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * 固定来源把同一按层状态的各条款拆成多条可独立切换的记录（莱特
       * [昂扬]：基础每层 1.25% 的 stacked 记录 + 冲击力转化的 convert
       * 记录 + 影画 2 的两条复制记录），而块 note 与 Nanoka 同文说明它们
       * 共同表示一个完整状态：总增益为 `min(上限, (每层增益 + max(0,
       * 获得时冲击力 − 170) × 每点增量) × 层数)`，上限作用于乘层数后的
       * 总增益，影画 2 起对同一状态整体 ×1.2。转换器把基础记录改写为这
       * 一条完整贡献（supplied、maximumLayers=1）：冲击力按登记输入名
       * 要求调用方显式提供（无默认值），层数由目录按登记的输入名从
       * selection.layers 派生；影画 2 的 120% 由配置阶段 output scale
       * 修改直接作用于同一条贡献（M0—M6 共用同一选项，随影画自动生效）。
       * 被取代的三条来源记录（基础转化与影画 2 的两条复制）不再生成可执行
       * 贡献：只编译为带迁移说明的 unsupported 选项，来源位置保留在覆盖
       * 报告中。原始与规范化记录的 stat、编码与数值与登记不符即拒绝生成。
       */
      readonly kind: "complete-state-elation"
      /** 记录在完整状态中的角色：基础记录被改写为完整贡献。 */
      readonly role: "base"
      /** 完整状态的层数上限（如昂扬 20 层）。 */
      readonly maximumLayers: number
      /** 每层基础增益；与来源 stacked 每层值一致（防漂移）。 */
      readonly perLayerGain: number
      /** 超过阈值后每点冲击力增加的每层增益（如 0.00025）。 */
      readonly perPointGain: number
      /** 转化阈值（冲击力点数，如 170）。 */
      readonly threshold: number
      /** 完整状态总增益上限（如 0.75；影画强化后由 output scale 放大）。 */
      readonly maximum: number
      /** 目录 inputs 上的获得时冲击力输入名（与转化记录编译一致）。 */
      readonly impactInputName: string
      /** 目录层数派生的 count 输入名（完整贡献内部使用）。 */
      readonly layerCountInputName: string
      /**
       * 命中元素补充：登记的来源元素之外，按冻结证据与来源同一分支结算
       * 的元素（烈霜按冰属性结算伤害与增益，命中枚举本身仍是 frost）。
       * 只在具名完整状态规则的命中元素条件里追加，不改全局元素归并。
       */
      readonly additionalHitElements: readonly ("frost" | "ice" | "fire")[]
      /** 防漂移：登记时来源记录应逐字段保持的编码。 */
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      /** 防漂移：记录所属块 note 必须包含的关键条款，改变原文即拒绝生成。 */
      readonly expectedBlockNoteIncludes: readonly string[]
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
  | {
      /**
       * [昂扬]完整状态中被取代的来源记录（基础转化与影画 2 的两条按层复制）：
       * 只保留 unsupported 迁移入口与覆盖报告去向，不再生成可执行贡献。
       * 原始与规范化记录的编码与数值与登记不符即拒绝生成。
       */
      readonly kind: "complete-state-elation"
      readonly role: "replaced"
      /** 来源记录的层数上限（仅用于迁移入口的选项上限核对）。 */
      readonly maximumLayers: number
      /** 防漂移：登记时来源记录应逐字段保持的编码。 */
      readonly expectedEncoding: Readonly<Record<string, unknown>>
      /** 防漂移：记录所属块 note 必须包含的关键条款，改变原文即拒绝生成。 */
      readonly expectedBlockNoteIncludes: readonly string[]
      readonly differenceId: string
      readonly evidence: readonly SemanticsEvidenceReference[]
      readonly verification: string
    }
/**
 * 完整状态选项登记：固定来源把同一游戏状态拆成多条可独立切换的记录
 * （上游增益面板逐 effect 开关，自身读取 self+team、他人只取 team），而块
 * note 与 Nanoka 同文已明确该状态只提升队伍中其他角色。Fairy 只提供一个
 * 完整状态选项：登记的记录全部作为该选项的 effectIds 同时生效，原有选项
 * 保留为带迁移说明的语义冲突入口，不再接受单选或齐选。本登记只覆盖已核对
 * 的记录，不构成通用配对框架；记录身份或字段漂移即拒绝生成。
 */
export interface CompleteStateSourceRecord {
  readonly rankKind: "mindscape" | "refinement" | "setPieces" | "fixed"
  readonly rank: number
  readonly blockId: string
  readonly effectId: string
  /** 记录所属块 note 必须包含的完整条款文字。 */
  readonly blockNoteIncludes: string
  /** 原始与规范化记录都逐字段核对的期望值；任一项缺失或漂移即拒绝生成。 */
  readonly expectation: {
    readonly stat: string
    readonly value: number
    readonly scope: string | undefined
    readonly applyTarget: "self" | "team"
    readonly applySituation: string
    readonly applyProfession: null
    readonly teamProfession: null
    readonly teamProfessionValues: null
    readonly elementFilter: "all" | readonly string[]
    readonly kind: "fixed" | "convert"
    readonly stackable: false
    readonly maxStacks: number
    readonly valuePerStack: number
    readonly defaultStacks: number
    readonly appliesToAnomaly: boolean
    readonly enabledDefault: boolean
    readonly note: string
  }
}

export interface CompleteStateOptionRegistration {
  readonly optionId: string
  readonly catalogEntityId: string
  readonly name: string
  readonly conditionDescription: string
  readonly target: "self" | "team"
  /**
   * 同一完整状态的累计档位选项互斥组；同一绑定只能选其中一个，
   * 避免“M0 + M1”重复叠加核心记录。
   */
  readonly exclusiveGroup?: string
  /**
   * 历史形态：影画级完整状态的单一门槛。新登记优先使用 configuration，
   * 以便表达精炼级完整状态或“M0 起可选、记录各自按影画门槛生效”。
   */
  readonly minimumMindscape?: MindscapeRank
  /**
   * 完整状态选项自身的目录配置门槛；省略时回退 minimumMindscape。记录级
   * 规则仍保留各自 rank 配置（如 M1/M2 只在对应影画起贡献），本字段只
   * 决定该选项何时可被选择。
   */
  readonly configuration?: {
    readonly minimumMindscape?: MindscapeRank
    readonly refinements?: readonly (1 | 2 | 3 | 4 | 5)[]
  }
  readonly differenceId: string
  /** 迁移入口的说明正文：该状态的记录必须一起生效及文本依据。 */
  readonly migrationExplanation: string
  readonly records: readonly CompleteStateSourceRecord[]
  readonly evidence: readonly SemanticsEvidenceReference[]
  readonly verification: string
}

const lucyEvidence = [
  {
    path: "agents/1151/details.zh.json",
    pointer: "/skill/special/description/2/desc",
    sha256: "0619c5c2c868e7481ed8267ba65ddcd6477f8e7e17e1499db8bd0a169ac84129",
  },
] as const

const luciaEvidence = [
  {
    path: "agents/1451/details.zh.json",
    pointer: "/skill/special/description/1/desc",
    sha256: "0c4e1a4b9b7af5ef5dec535bd0a37ff6bd03789c494f456da821c513ed03fa5a",
  },
] as const

const aliceEvidence = [
  {
    path: "agents/1401/details.zh.json",
    pointer: "/passive/level/1401507/desc/0",
    sha256: "2fa6f4711a3138251c777d4b2b402ea414f03ee38c988ae92e588f26d8ecf41b",
  },
] as const

const anbyDetailsSha =
  "e15c3b72f3aeaa68824cb0229b591989ce9fc1a729c6c2864346e8315257d67d"
const anbyDetailsEnSha =
  "440b38afbea149b22c69aab93a06dfae06e9e0b92da8aba74f8f7b0f2bb581c2"
const aliceDetailsEnSha =
  "14bd2589be83c8bf80a9de3c8dcf467ce9bab78b630240c56ca6db7bdaff1091"
const janeDetailsEnSha =
  "f463218618d5a9bc5abffa440146ff262d343c027e2a469066c63d7bb0dc024c"
const graceDetailsZhSha =
  "0752c155856afbbe7212ecb80b1f5a38b4a5fdfff3eeb8ccf0d48c770d2ff9d7"
const graceDetailsEnSha =
  "ddb6e608d413216ab2d6bcb681dedca27ca38447bdf17a1d1bfa3183110f6ad1"
const vivianDetailsZhSha =
  "77b0fe60b82de02636b055772a227dd9a78f45256a25c149a9704fcf02592cbf"
const vivianDetailsEnSha =
  "f46db3dc80b96e0bc2430d3d5364bb94c103f2fb42c8b7d3daf8eacb900d75fc"
const joyauDoreDetailsZhSha =
  "b7145001a4ee1fd0fd165e83e8d6f6491f46501e10324a0472b0a59989acc9cd"
const joyauDoreDetailsEnSha =
  "5e352682548743fbad843c91f4e53f4b2474191867e704b302e1f89608b0834c"
const wrathfulVajraDetailsZhSha =
  "dcbfe378af09f3b56f55605005f50976e0aeb8dfadd29ab067d36e932bb6b111"
const wrathfulVajraDetailsEnSha =
  "380167ac516b7e14c9c6c4e8a086eacddf41118280c566a35a539d63b914714e"

const anbyTalentEvidence = (rank: 2 | 6) =>
  [
    {
      path: "agents/1011/details.zh.json",
      pointer: `/talent/${String(rank)}/desc`,
      sha256: anbyDetailsSha,
    },
    {
      path: "agents/1011/details.en.json",
      pointer: `/talent/${String(rank)}/desc`,
      sha256: anbyDetailsEnSha,
    },
  ] as const

const aliceMindscape2Evidence = [
  {
    path: "agents/1401/details.zh.json",
    pointer: "/talent/2/desc",
    sha256: "2fa6f4711a3138251c777d4b2b402ea414f03ee38c988ae92e588f26d8ecf41b",
  },
  {
    path: "agents/1401/details.en.json",
    pointer: "/talent/2/desc",
    sha256: aliceDetailsEnSha,
  },
] as const

const janeCorePassiveEvidence = [
  {
    path: "agents/1261/details.zh.json",
    pointer: "/passive/level/1261507/desc/0",
    sha256: "9961f4a46fe6c388901117810885964a5f38268462d24fa7e6c17a5c9865ae11",
  },
  {
    path: "agents/1261/details.en.json",
    pointer: "/passive/level/1261507/desc/0",
    sha256: janeDetailsEnSha,
  },
] as const

const janeMindscape2Evidence = [
  {
    path: "agents/1261/details.zh.json",
    pointer: "/talent/2/desc",
    sha256: "9961f4a46fe6c388901117810885964a5f38268462d24fa7e6c17a5c9865ae11",
  },
  {
    path: "agents/1261/details.en.json",
    pointer: "/talent/2/desc",
    sha256: janeDetailsEnSha,
  },
] as const

const graceAdditionalAbilityEvidence = [
  {
    path: "agents/1181/details.zh.json",
    pointer: "/passive/level/1181501/desc/1",
    sha256: graceDetailsZhSha,
  },
  {
    path: "agents/1181/details.en.json",
    pointer: "/passive/level/1181501/desc/1",
    sha256: graceDetailsEnSha,
  },
] as const

const vivianAdditionalAbilityEvidence = [
  {
    path: "agents/1331/details.zh.json",
    pointer: "/passive/level/1331501/desc/1",
    sha256: vivianDetailsZhSha,
  },
  {
    path: "agents/1331/details.en.json",
    pointer: "/passive/level/1331501/desc/1",
    sha256: vivianDetailsEnSha,
  },
] as const

const joyauDoreRefinementEvidence = [
  {
    path: "w-engines/14156/details.zh.json",
    pointer: "/talents/1/desc",
    sha256: joyauDoreDetailsZhSha,
  },
  {
    path: "w-engines/14156/details.en.json",
    pointer: "/talents/1/desc",
    sha256: joyauDoreDetailsEnSha,
  },
  {
    path: "w-engines/14156/details.zh.json",
    pointer: "/talents/5/desc",
    sha256: joyauDoreDetailsZhSha,
  },
  {
    path: "w-engines/14156/details.en.json",
    pointer: "/talents/5/desc",
    sha256: joyauDoreDetailsEnSha,
  },
] as const

const wrathfulVajraRefinement2Evidence = [
  {
    path: "w-engines/14147/details.zh.json",
    pointer: "/talents/2/desc",
    sha256: wrathfulVajraDetailsZhSha,
  },
  {
    path: "w-engines/14147/details.en.json",
    pointer: "/talents/2/desc",
    sha256: wrathfulVajraDetailsEnSha,
  },
] as const

const nangongyuEvidence = [
  {
    path: "agents/1511/details.zh.json",
    pointer: "/passive/level/1511055/desc/0",
    sha256: "0e93e4b483a5aa8faef8e3345cf849de56bb3e8c717554e661c4bd1aed120fdb",
  },
] as const

/** 南宫羽影画 6[天使的妄想]天赋证据（批次 09 补充与共存排除共用）。 */
const nangongyuMindscape6Evidence = [
  {
    path: "agents/1511/details.zh.json",
    pointer: "/talent/6/desc",
    sha256: "0e93e4b483a5aa8faef8e3345cf849de56bb3e8c717554e661c4bd1aed120fdb",
  },
] as const

/** 南宫羽影画 2 天赋证据（每层 +10% 只强化普通[颤音]结算的原文）。 */
const nangongyuTalent2Evidence = [
  {
    path: "agents/1511/details.zh.json",
    pointer: "/talent/2/desc",
    sha256: "0e93e4b483a5aa8faef8e3345cf849de56bb3e8c717554e661c4bd1aed120fdb",
  },
] as const

/** 南宫羽核心被动块的冻结完整 note（三条普通颤音记录所在块）。 */
const nangongyuCorePassiveFrozenNote =
  "南宫羽的异常精通提升120点；\n敌人处于失衡状态时，任意角色对其造成一次[异放]伤害、[紊乱]伤害、使其进入一次属性异常状态时会为其累计1层[颤音]；\n同一敌人最多可被叠加4层[颤音]；\n若[颤音]叠加到最大层数且敌人处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态下时或当敌人持有[颤音]并从失衡状态恢复时，所有[颤音]会被清除；\n[颤音]被清除时，若敌人处于上述属性异常状态下，南宫羽会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为720%/360%/900%/63%/90%/36%，敌人身上每有1层[颤音]，该次[异放]的伤害比例额外提升25%，同一次失衡期间，若[颤音]已被清除，则敌人无法再被施加[颤音]；\n南宫羽的[普通攻击：可爱地雷飞天撞]或[强化特殊技：相当沉重的爱意]命中敌人时，会使自身的属性异常积蓄效率提升35%，造成的失衡值提升20%，使全队造成的伤害提升25%，持续30秒，重复触发时刷新持续时间；"

/** 批次 09 的[颤音：改]共存排除登记（三条核心被动普通颤音记录共用）。 */
const nangongyuVibratoModifiedExclusion = (options: {
  readonly expectedEncoding: Readonly<Record<string, unknown>>
}) => ({
  excludedTargetId: "nangongyu-vibrato-modified",
  dependentSupplementIds: [
    "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
    "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
  ],
  differenceId: "nangongyu-vibrato-modified-exclusivity",
  expectedSourceBlockNote: nangongyuCorePassiveFrozenNote,
  ...options,
})

const nekomataPotentialEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021514/desc/0",
    sha256: "b381da617455bd8f5a1b40ed976e2fca25fdfe3b4b481d8208f5b7fe3a4afa86",
  },
] as const

/** 猫又潜能分支核心被动 1—7 行全文；爪印数值逐行核对。 */
const nekomataClawMarkEvidence = (
  [1021508, 1021509, 1021510, 1021511, 1021512, 1021513, 1021514] as const
).map((row) => ({
  path: "agents/1021/details.zh.json",
  pointer: `/passive/level/${row}/desc/0`,
  sha256: "b381da617455bd8f5a1b40ed976e2fca25fdfe3b4b481d8208f5b7fe3a4afa86",
}))

const pyroisEvidence = [
  {
    path: "agents/1551/details.zh.json",
    pointer: "/passive/level/1551507/desc/0",
    sha256: "57f9c0ea9c04f6a09787e6f41ac77133b4cafaf26a380a1c6cd735ef3cbcd4d3",
  },
] as const

const velinaEvidence = [
  {
    path: "agents/1561/details.zh.json",
    pointer: "/passive/level/1561507/desc/0",
    sha256: "f2da8dfc1357ffb98dcb775d0febbe0df55828d4c61e38701df39040766a3b6f",
  },
] as const

const velinaDetailsEnSha =
  "55ca8648c4cbf5baa91c0102da4cd61ef02b04d700d1875be077367112dbd28d"

const velinaAnomalyScopeEvidence = (pointer: string) =>
  [
    {
      path: "agents/1561/details.zh.json",
      pointer,
      sha256:
        "f2da8dfc1357ffb98dcb775d0febbe0df55828d4c61e38701df39040766a3b6f",
    },
    {
      path: "agents/1561/details.en.json",
      pointer,
      sha256: velinaDetailsEnSha,
    },
  ] as const

const velinaM0AnomalyBlockNote =
  "维琳娜造成的[风化]和[乱流]伤害提升10%，[终结技]重击命中处于风属性异常状态下的敌人时，会对目标造成一次[异放]伤害：额外结算一次属性异常伤害，固定结算680%倍率的风属性异常伤害；"
const velinaM2AnomalyBlockNote =
  "[额外能力：茶会礼仪]中，维琳娜造成的[风化]和[乱流]伤害提升效果额外提升15%。"
const velinaM6AnomalyBlockNote =
  "当维琳娜对处于[风化]状态的敌人再次施加[风化]时，会根据上一次[风化]的剩余持续时间提升此次[风化]的伤害，每1秒剩余持续时间会使伤害提升2.5%，最多提升40%。"

const velinaM0AnomalyEncoding = {
  id: "eff-ms4tpxkp-9jh4ly",
  origin: "",
  scope: "general",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: null,
  skillSubcategoryId: null,
  skillTargets: null,
  elementFilter: ["风"],
  kind: "fixed",
  stat: "anomalyDmgBonus",
  value: 10,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: null,
  enabledDefault: true,
  convert: null,
  note: "",
} as const

const velinaM2AnomalyEncoding = {
  ...velinaM0AnomalyEncoding,
  id: "legacy-self-anomalyDmgBonus",
  value: 15,
  appliesToAnomaly: true,
} as const

const velinaM6AnomalyEncoding = {
  ...velinaM0AnomalyEncoding,
  id: "eff-ms4u9q0d-6p259j",
  kind: "stacked",
  value: 0,
  maxStacks: 16,
  valuePerStack: 2.5,
  defaultStacks: 16,
} as const

const velinaAnomalyScopeCorrections = (): Record<string, SourceSemantics> => ({
  "agents/velina/mindscape/0/blk-ms4tpxkp-f964lw/eff-ms4tpxkp-9jh4ly": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: velinaM0AnomalyEncoding,
    expectedDamageKinds: [
      "anomaly",
      "anomaly-settlement",
      "vortex",
      "luminize",
    ],
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: velinaM0AnomalyBlockNote,
    differenceId: "velina-anomaly-damage-kind-scope",
    evidence: velinaAnomalyScopeEvidence("/passive/level/1561507/desc/1"),
    verification:
      "Nanoka agents/1561 /passive/level/1561507/desc/1 中英文同文：维琳娜造成的[风化]和[乱流]伤害提升10%。固定源把同一 10% 拆成 anomalyDmgBonus 与 turbulenceDmgBonus 两条；Fairy 的 anomalyDmgBonus 宽映射同时命中 vortex，会与 turbulenceDmgBonus 重复。修正保留两条记录、数值与公开 ID，只把 anomalyDmgBonus 收窄到 [anomaly]（风化），vortex 由 turbulenceDmgBonus 承担；不含异放与耀变。防漂移：raw/normalized 编码与块 note 逐字核对。",
  },
  "agents/velina/mindscape/2/blk-legacy/legacy-self-anomalyDmgBonus": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: velinaM2AnomalyEncoding,
    expectedDamageKinds: [
      "anomaly",
      "anomaly-settlement",
      "vortex",
      "luminize",
    ],
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: velinaM2AnomalyBlockNote,
    differenceId: "velina-anomaly-damage-kind-scope",
    evidence: velinaAnomalyScopeEvidence("/talent/2/desc"),
    verification:
      "Nanoka agents/1561 /talent/2/desc 中英文同文：茶会礼仪中维琳娜造成的[风化]和[乱流]伤害提升效果额外提升15%。固定源同样拆成 anomalyDmgBonus 与 turbulenceDmgBonus 两条；修正保留两条记录、数值与公开 ID，只把 anomalyDmgBonus 收窄到 [anomaly]（风化），vortex 由 turbulenceDmgBonus 承担。",
  },
  "agents/velina/mindscape/6/blk-ms4u9q0d-b63z88/eff-ms4u9q0d-6p259j": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: velinaM6AnomalyEncoding,
    expectedDamageKinds: [
      "anomaly",
      "anomaly-settlement",
      "vortex",
      "luminize",
    ],
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: velinaM6AnomalyBlockNote,
    differenceId: "velina-anomaly-damage-kind-scope",
    evidence: velinaAnomalyScopeEvidence("/talent/6/desc"),
    verification:
      "Nanoka agents/1561 /talent/6/desc 中英文同文：该条款只提升再次施加[风化]时此次[风化]的伤害，每 1 秒剩余持续时间 +2.5%，最多 +40%。固定源 anomalyDmgBonus 宽映射同时命中 vortex；修正只收窄到 [anomaly]（风化），不改变 2.5%/层与 16 层上限。",
  },
})

const graceAnomalyDamageBlockNote =
  "队伍中存在与自身属性或阵营相同的角色或其他[异常]角色时触发：\n格莉丝[强化特殊技]命中敌人时，目标下次被施加[感电]效果时，受到的[感电]伤害提升18%，最多叠加2层，同一招式内每个敌人最多触发一次效果，[感电]状态结束时效果重置。"
const vivianAnomalyDamageBlockNote =
  "队伍中存在其他[异常]角色或与自身属性相同的角色时触发：\n全队角色造成的[侵蚀]伤害和[侵蚀]状态被结算的[紊乱]伤害提升12%。"
const aliceAnomalyDamageBlockNote =
  "全队角色造成的[强击]伤害提升15%；\n物理异常状态下的敌人被结算的[紊乱]伤害提升15%；"
const janeCoreAnomalyCriticalBlockNote =
  "简攻击命中敌人时，会使其陷入[啮咬]状态，持续10秒；\n队伍中任意角色对处于[啮咬]状态下的敌人触发[强击]并施加[畏缩]效果时，[畏缩]效果的持续时间提升5秒；\n对处于[啮咬]状态下的敌人造成的[强击]伤害有概率触发暴击，基础暴击率为40%，暴击伤害为50%，简的每点异常精通会使该效果的暴击率额外提升0.16%。"
const janeMindscape2AnomalyCriticalBlockNote =
  "简攻击命中处于[啮咬]状态下的敌人，或队伍中任意角色对处于[啮咬]状态下的敌人触发[强击]时，将会无视其15%防御力，当[强击]伤害触发暴击时，其暴击伤害额外提升50%。"
const janePotentialAnomalyCriticalBlockNote =
  "简触发[强击]时，其暴击伤害额外提升。"
const joyauDoreAnomalyDamageBlockNote = (
  mastery: number,
  percent: number,
  teamMastery: number,
) =>
  `装备者的异常精通提升${mastery}点；装备者发动[强化特殊技]造成风属性伤害时，自身造成的[乱流]和[风化]伤害提升${percent}%，持续40秒，最多叠加2层，重复触发时刷新持续时间，同一招式内最多触发一次，拥有2层该效果时，全队代理人的异常精通提升${teamMastery}点，该效果全队唯一。`

const graceAnomalyDamageEncoding = {
  id: "eff-ms4o80e9-lgnv30",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["电"],
  kind: "stacked",
  stat: "anomalyDmgBonus",
  value: 0,
  maxStacks: 2,
  valuePerStack: 18,
  defaultStacks: 2,
  appliesToAnomaly: true,
} as const

const vivianAnomalyDamageEncoding = {
  id: "legacy-team-anomalyDmgBonus",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["以太"],
  kind: "fixed",
  stat: "anomalyDmgBonus",
  value: 12,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
} as const

const aliceAnomalyDamageEncoding = {
  id: "legacy-team-anomalyDmgBonus",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["物理"],
  kind: "fixed",
  stat: "anomalyDmgBonus",
  value: 15,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
} as const

const janeCoreAnomalyCriticalRateEncoding = {
  id: "eff-ms34bcgu-8f1m63",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["物理"],
  kind: "fixed",
  stat: "anomalyCritRate",
  value: 40,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
} as const

const janeCoreAnomalyCriticalDamageEncoding = {
  id: "eff-ms34c40c-3b3j3z",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["物理"],
  kind: "fixed",
  stat: "anomalyCritDmg",
  value: 50,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
} as const

const janeCoreAnomalyCriticalRateConversionEncoding = {
  id: "eff-ms34ci0p-usidux",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["物理"],
  kind: "convert",
  stat: "anomalyCritRate",
  value: 0,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
} as const

const janeMindscape2AnomalyCriticalDamageEncoding = {
  id: "legacy-team-anomalyCritDmg",
  applyTarget: "team",
  applySituation: "global",
  elementFilter: ["物理"],
  kind: "fixed",
  stat: "anomalyCritDmg",
  value: 50,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: true,
} as const

const joyauDoreAnomalyDamageEncoding = {
  id: "legacy-self-anomalyDmgBonus",
  applyTarget: "self",
  applySituation: "global",
  elementFilter: ["风"],
  kind: "stacked",
  stat: "anomalyDmgBonus",
  value: 0,
  maxStacks: 2,
  valuePerStack: 7,
  defaultStacks: 2,
  appliesToAnomaly: true,
} as const

const broadAnomalyDamageKinds = [
  "anomaly",
  "anomaly-settlement",
  "vortex",
  "luminize",
] as const
const broadAnomalyCriticalKinds = [
  "anomaly",
  "anomaly-settlement",
  "vortex",
] as const

const broadAnomalyScopeCorrections = (): Record<string, SourceSemantics> => ({
  "agents/grace/mindscape/0/blk-ms4o80e9-dqsih3/eff-ms4o80e9-lgnv30": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: graceAnomalyDamageEncoding,
    expectedDamageKinds: broadAnomalyDamageKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: graceAnomalyDamageBlockNote,
    differenceId: "grace-anomaly-damage-kind-scope",
    evidence: graceAdditionalAbilityEvidence,
    verification:
      "Nanoka agents/1181 /passive/level/1181501/desc/1 中英文同文：格莉丝额外能力只提升目标受到的[感电]（普通电属性异常）伤害，最多 2 层。固定源 anomalyDmgBonus 宽映射同时覆盖异放、乱流与耀变；修正保留记录、数值、层数与公开 ID，只把 hit.damageKind 收窄为 anomaly。",
  },
  "agents/vivian/mindscape/0/blk-legacy/legacy-team-anomalyDmgBonus": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: vivianAnomalyDamageEncoding,
    expectedDamageKinds: broadAnomalyDamageKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: vivianAnomalyDamageBlockNote,
    differenceId: "vivian-m0-anomaly-damage-kind-scope",
    evidence: vivianAdditionalAbilityEvidence,
    verification:
      "Nanoka agents/1331 /passive/level/1331501/desc/1 中英文同文：薇薇安额外能力只提升[侵蚀]（普通以太异常）伤害与[侵蚀]状态被结算的[紊乱]伤害。固定源 anomalyDmgBonus 宽映射同时覆盖异放、乱流与耀变；修正保留记录、数值与公开 ID，只把 anomalyDmgBonus 收窄为 anomaly，紊乱由独立 disorderDmgBonus 承担。",
  },
  "agents/alice/mindscape/2/blk-legacy/legacy-team-anomalyDmgBonus": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: aliceAnomalyDamageEncoding,
    expectedDamageKinds: broadAnomalyDamageKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: aliceAnomalyDamageBlockNote,
    differenceId: "alice-anomaly-damage-kind-scope",
    evidence: aliceMindscape2Evidence,
    verification:
      "Nanoka agents/1401 /talent/2/desc 中英文同文：爱丽丝 M2 只提升[强击]（普通物理异常）伤害与物理异常状态下被结算的[紊乱]伤害。固定源 anomalyDmgBonus 宽映射同时覆盖异放、乱流与耀变；修正保留记录、数值与公开 ID，只把 anomalyDmgBonus 收窄为 anomaly，紊乱由独立 disorderDmgBonus 承担，新增子类记录仍为 semantic-conflict。",
  },
  "agents/jane/mindscape/0/blk-ms349twy-zgu7b6/eff-ms34bcgu-8f1m63": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: janeCoreAnomalyCriticalRateEncoding,
    expectedDamageKinds: broadAnomalyCriticalKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: janeCoreAnomalyCriticalBlockNote,
    differenceId: "jane-anomaly-critical-kind-scope",
    evidence: janeCorePassiveEvidence,
    verification:
      "Nanoka agents/1261 核心被动 /passive/level/1261507/desc/0 中英文同文：[强击]伤害的暴击率 40% 只作用于普通物理异常。固定源 anomalyCritRate 宽映射同时覆盖异放与乱流；修正保留记录、数值与公开 ID，只把 hit.damageKind 收窄为 anomaly。",
  },
  "agents/jane/mindscape/0/blk-ms349twy-zgu7b6/eff-ms34c40c-3b3j3z": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: janeCoreAnomalyCriticalDamageEncoding,
    expectedDamageKinds: broadAnomalyCriticalKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: janeCoreAnomalyCriticalBlockNote,
    differenceId: "jane-anomaly-critical-kind-scope",
    evidence: janeCorePassiveEvidence,
    verification:
      "Nanoka agents/1261 核心被动 /passive/level/1261507/desc/0 中英文同文：[强击]伤害的暴击伤害 50% 只作用于普通物理异常。固定源 anomalyCritDmg 宽映射同时覆盖异放与乱流；修正保留记录、数值与公开 ID，只把 hit.damageKind 收窄为 anomaly。",
  },
  "agents/jane/mindscape/0/blk-ms349twy-zgu7b6/eff-ms34ci0p-usidux": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: janeCoreAnomalyCriticalRateConversionEncoding,
    expectedDamageKinds: broadAnomalyCriticalKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: janeCoreAnomalyCriticalBlockNote,
    differenceId: "jane-anomaly-critical-kind-scope",
    evidence: janeCorePassiveEvidence,
    verification:
      "Nanoka agents/1261 核心被动 /passive/level/1261507/desc/0 中英文同文：异常精通转化的暴击率同样只强化[强击]伤害。固定源 anomalyCritRate 宽映射同时覆盖异放与乱流；修正保留转换表达式、数值与公开 ID，只把 hit.damageKind 收窄为 anomaly。",
  },
  "agents/jane/mindscape/2/blk-legacy/legacy-team-anomalyCritDmg": {
    kind: "damage-kind-scope-correction",
    expectedEncoding: janeMindscape2AnomalyCriticalDamageEncoding,
    expectedDamageKinds: broadAnomalyCriticalKinds,
    correctedDamageKinds: ["anomaly"],
    expectedSourceBlockNote: janeMindscape2AnomalyCriticalBlockNote,
    differenceId: "jane-anomaly-critical-kind-scope",
    evidence: janeMindscape2Evidence,
    verification:
      "Nanoka agents/1261 /talent/2/desc 中英文同文：M2 额外 50% 暴击伤害只在[强击]伤害触发暴击时生效。固定源 anomalyCritDmg 宽映射同时覆盖异放与乱流；修正保留记录、数值与公开 ID，只把 hit.damageKind 收窄为 anomaly。",
  },
})

const joyauDoreRefinementValues = [
  { mastery: 70, percent: 7, teamMastery: 60 },
  { mastery: 80, percent: 8, teamMastery: 69 },
  { mastery: 90, percent: 9, teamMastery: 78 },
  { mastery: 100, percent: 10, teamMastery: 87 },
  { mastery: 110, percent: 11, teamMastery: 96 },
] as const

const joyauDoreAnomalyDamageScopes = (): Record<string, SourceSemantics> =>
  Object.fromEntries(
    joyauDoreRefinementValues.map(
      ({ mastery, percent, teamMastery }, index) => [
        `w-engines/Joyau_Dore/refinement/${String(index + 1)}/blk-legacy/legacy-self-anomalyDmgBonus`,
        {
          kind: "damage-kind-scope-correction",
          expectedEncoding: {
            ...joyauDoreAnomalyDamageEncoding,
            valuePerStack: percent,
          },
          expectedDamageKinds: broadAnomalyDamageKinds,
          correctedDamageKinds: ["anomaly"],
          expectedSourceBlockNote: joyauDoreAnomalyDamageBlockNote(
            mastery,
            percent,
            teamMastery,
          ),
          differenceId: "joyau-dore-anomaly-damage-kind-scope",
          evidence: joyauDoreRefinementEvidence,
          verification:
            "Nanoka w-engines/14156 /talents/1—5/desc 中英文同文：琳琅鎏心精炼 1—5 同时提升[乱流]和[风化]伤害，每层 7/8/9/10/11%，最多 2 层。固定源把同一句拆成 anomalyDmgBonus 与 turbulenceDmgBonus 两条；Fairy 的 anomalyDmgBonus 宽映射同时命中 vortex，会与 turbulenceDmgBonus 重复。修正保留两条记录、数值、层数与公开 ID，只把 anomalyDmgBonus 收窄为 anomaly（风化），vortex 由 turbulenceDmgBonus 承担。",
        } satisfies SourceSemantics,
      ],
    ),
  )

const allSpecialSkillLevels: readonly SpecialSkillLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
]

const claretDetailsSha =
  "470030f71d009a3dd3d4c9ab66aa4d33c0361e5b00038ef4d0a96ba38762a61e"
const claretDetailsEnSha =
  "4e237fb6c5d8875452b0279a9199f59498a8ba6e8fc0684ae15b8e82cd65f201"

/** 克拉蕾核心被动 1—7 行全文；暴击率加成按核心档位逐行核对。 */
const claretCorePassiveEvidence = (
  [1611501, 1611502, 1611503, 1611504, 1611505, 1611506, 1611507] as const
).map((row) => ({
  path: "agents/1611/details.zh.json",
  pointer: `/passive/level/${row}/desc/0`,
  sha256: claretDetailsSha,
}))

/** 克拉蕾额外能力（血裔传承）1—7 行全文；[残锋]锐暴提升逐行核对。 */
const claretAdditionalAbilityEvidence = (
  [1611501, 1611502, 1611503, 1611504, 1611505, 1611506, 1611507] as const
).map((row) => ({
  path: "agents/1611/details.zh.json",
  pointer: `/passive/level/${row}/desc/1`,
  sha256: claretDetailsSha,
}))

const claretTalentEvidence = (rank: 1 | 2 | 4) => [
  {
    path: "agents/1611/details.zh.json",
    pointer: `/talent/${rank}/desc`,
    sha256: claretDetailsSha,
  },
  {
    path: "agents/1611/details.en.json",
    pointer: `/talent/${rank}/desc`,
    sha256: claretDetailsEnSha,
  },
]

/** 猩红渴望精炼 1—5 的天赋描述；电属性限制按各精炼原文核对。 */
const scarletCravingEvidence = (refinement: 1 | 2 | 3 | 4 | 5) => [
  {
    path: "w-engines/14161/details.zh.json",
    pointer: `/talents/${refinement}/desc`,
    sha256: "0f0095be51b0b67133f0e583b34c79fa8cfb0e2eff520f6c1a56a7947e755d9e",
  },
]

/** 壳中之灵开发者修订导出：精炼 2—5 的异常伤害提升被固定来源记为 special。 */

/**
 * 蕾米埃尔影画 2：块 note 与 Nanoka 天赋同文限定受益职业与伤害类别。
 * 影画 1 同一份详情文件的天赋 1 原文确认“队伍中其他角色”条款。
 */
const remielleDetailsSha =
  "cb1cfa8134bd4e3fa0e496b9f95594ae1d599cc787ac0151d65817767198c2c6"
const remielleMindscape2Evidence: readonly SemanticsEvidenceReference[] = [
  {
    path: "agents/1581/details.zh.json",
    pointer: "/talent/2/desc",
    sha256: remielleDetailsSha,
  },
]
const remielleMindscape1Evidence: readonly SemanticsEvidenceReference[] = [
  {
    path: "agents/1581/details.zh.json",
    pointer: "/talent/1/desc",
    sha256: remielleDetailsSha,
  },
]
const remielleMindscape4Evidence: readonly SemanticsEvidenceReference[] = [
  {
    path: "agents/1581/details.zh.json",
    pointer: "/talent/4/desc",
    sha256: remielleDetailsSha,
  },
]

const burniceDetailsSha =
  "0768458e49d889444b7d83faab9586a9f5e6b1fa64638916b408b09b158fadb8"
const graceDetailsSha =
  "0752c155856afbbe7212ecb80b1f5a38b4a5fdfff3eeb8ccf0d48c770d2ff9d7"
const ellenDetailsSha =
  "ab0abe81b6375696597e65a9d29e6d1ff52db31eae9cedf7739c8403e8a7416e"
const harumasaDetailsSha =
  "619512443bf20df5b3efd3e50a8ae3919774825ee1c247519ef0de04f5416ab7"
const alexandrinaDetailsSha =
  "f804d9d945014cbc4548f8355b1523f234b33be98ce5fc72e4c4b59b471f8063"
const janeDetailsSha =
  "9961f4a46fe6c388901117810885964a5f38268462d24fa7e6c17a5c9865ae11"
const s0anbyDetailsSha =
  "c7cfcbd532b51197fa00c1790fb20fa2657c7dead2ecb153c8d7530be054b3f1"

/** 潜力条目 level 2—6 的 desc 指针（level 1 无独立说明，由 abilityList 继承）。 */
const potentialDetailEvidence = (
  entityId: string,
  sha256: string,
  startId: number,
): readonly SemanticsEvidenceReference[] =>
  [startId + 1, startId + 2, startId + 3, startId + 4, startId + 5].map(
    (id) => ({
      path: `agents/${entityId}/details.zh.json`,
      pointer: `/potentialDetail/${id}/desc`,
      sha256,
    }),
  )

const burnicePotentialEvidence = potentialDetailEvidence(
  "1171",
  burniceDetailsSha,
  117100,
)
const gracePotentialEvidence = potentialDetailEvidence(
  "1181",
  graceDetailsSha,
  118100,
)
const ellenPotentialEvidence = potentialDetailEvidence(
  "1191",
  ellenDetailsSha,
  119100,
)
const harumasaPotentialEvidence = potentialDetailEvidence(
  "1201",
  harumasaDetailsSha,
  120100,
)
const alexandrinaPotentialEvidence = potentialDetailEvidence(
  "1211",
  alexandrinaDetailsSha,
  121100,
)
const janePotentialEvidence = potentialDetailEvidence(
  "1261",
  janeDetailsSha,
  126100,
)
const s0anbyPotentialEvidence = potentialDetailEvidence(
  "1381",
  s0anbyDetailsSha,
  138100,
)
const ellenBranchEvidence = [
  {
    path: "agents/1191/details.zh.json",
    pointer: "/passive/level/1191514/desc/0",
    sha256: ellenDetailsSha,
  },
] as const
const harumasaBranchEvidence = [
  {
    path: "agents/1201/details.zh.json",
    pointer: "/passive/level/1201514/desc/0",
    sha256: harumasaDetailsSha,
  },
] as const
const s0anbyBranchEvidence = [
  {
    path: "agents/1381/details.zh.json",
    pointer: "/passive/level/1381514/desc/0",
    sha256: s0anbyDetailsSha,
  },
] as const
const lycaonPotentialBranchEvidence = [
  {
    path: "agents/1141/details.zh.json",
    pointer: "/passive/level/1141514/desc/0",
    sha256: "f4dd5b0862a14f429d924975851f3d0a9e33bfe3a591d2899809e8926485d54b",
  },
] as const

/**
 * 青溟笼舍（14137）：五档天赋 desc 与固定来源同一块的 note 逐字一致（去除
 * 富文本标记后），把贯穿增伤条款写在“每层[青溟同行]、最多 2 层”之下。
 */
/** 音擎天赋证据：按精炼档读取 integrated /talents/{rank}/desc。 */
const wengineTalentEvidence = (
  nanokaId: string,
  sha256: string,
  refinement: 1 | 2 | 3 | 4 | 5,
): readonly SemanticsEvidenceReference[] => [
  {
    path: `w-engines/${nanokaId}/details.zh.json`,
    pointer: `/talents/${refinement}/desc`,
    sha256,
  },
]

/** 千面日陨（14129）：五档暴伤 45/51.75/58.5/65.25/72%，固定来源 R4 记 62.25。 */
const myriadEclipseSha =
  "8884f4df64dc76eeec448954a70fa3185751e08c445afcf287506e3f9b968ac9"
const myriadEclipseIgnoreDefensePercent: Readonly<
  Record<1 | 2 | 3 | 4 | 5, string>
> = { 1: "25", 2: "28.75", 3: "32.5", 4: "36.25", 5: "40" }

/** 喵运当头（13017）：五档防御 8/9/10/11/12%，常驻与强化特殊技触发各一段。 */
/** 聚宝箱（13103）：精炼 1 增伤 15% 受益对象为“所有单位”，固定来源记 self。 */
const theVaultSha =
  "bf2b958f4e77151cb7d84641ca65a0caed5b4eabfd376b23f6180838e341a156"

/** 嚣枪喧焰（14130）：五档每层忽防 15/17.2/19.5/21.7/24%，固定来源 R1 记 16。 */
const bellicoseBlazeSha =
  "5e592499b36fbf076fd6dc38ae4c7b2f45523a5195ebf01b007c91a4f1c4bf0e"
const bellicoseBlazePerStackPercent: Readonly<
  Record<1 | 2 | 3 | 4 | 5, string>
> = { 1: "15", 2: "17.2", 3: "19.5", 4: "21.7", 5: "24" }

/** 血髓秘匣（13021）：五档换算 0.48/0.56/0.64/0.72/0.8%、上限 24—40%。 */
const bloodCasketSha =
  "eef5da868448dbd66f2dce088bfe57d47116487e798d06008c8dfd91bf36da26"
/** 血髓秘匣五档块 note 原文；3.2.5 固定源已逐档写出对应数值与上限。 */
const bloodCasketBlockNotes: Readonly<Record<1 | 2 | 3 | 4 | 5, string>> = {
  1: "装备者暴击率大于100%时，每超出1%暴击率，使装备者造成的伤害提升0.48%，至多提升24%。",
  2: "装备者暴击率大于100%时，每超出1%暴击率，使装备者造成的伤害提升0.56%，至多提升28%。",
  3: "装备者暴击率大于100%时，每超出1%暴击率，使装备者造成的伤害提升0.64%，至多提升32%。",
  4: "装备者暴击率大于100%时，每超出1%暴击率，使装备者造成的伤害提升0.72%，至多提升36%。",
  5: "装备者暴击率大于100%时，每超出1%暴击率，使装备者造成的伤害提升0.8%，至多提升40%。",
}
/** 血髓秘匣覆盖后的精炼感知说明；来源已逐档写出，仅合并给共享选项。 */
const bloodCasketRefinementDescription = Object.entries(bloodCasketBlockNotes)
  .map(([rank, note]) => `精炼${rank}：${note}`)
  .join("\n")

const formatFlatPoints = (sourceValue: number): string =>
  String(sourceValue / 100)

/**
 * C05：11 件音擎五档“能量自动回复提升若干点/秒”被固定来源编入 energyRegen
 * 百分比字段。records.value 为来源数值（固定点数/秒 × 100）；notePrefix 是
 * 各档块 note 回能条款中数值前的原文片段。
 */
interface FlatEnergyRegenRecord {
  readonly rank: 1 | 2 | 3 | 4 | 5
  readonly blockId: string
  readonly effectId: string
  readonly value: number
}
interface FlatEnergyRegenEngine {
  readonly upstreamId: string
  readonly name: string
  readonly nanokaId: string
  readonly sha256: string
  readonly notePrefix: string
  readonly records: readonly [
    FlatEnergyRegenRecord,
    FlatEnergyRegenRecord,
    FlatEnergyRegenRecord,
    FlatEnergyRegenRecord,
    FlatEnergyRegenRecord,
  ]
}
const flatEnergyRegenEngines: readonly FlatEnergyRegenEngine[] = [
  {
    upstreamId: "The_Vault",
    name: "聚宝箱",
    nanokaId: "13103",
    sha256: theVaultSha,
    notePrefix: "装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1zuvli-v2yjaz",
        value: 50,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1zv3lq-wkhzfm",
        value: 58,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1zv8x7-c9st7n",
        value: 65,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms1zve66-p2wn3a",
        value: 72,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms1zvkfu-7g8a4b",
        value: 80,
      },
    ],
  },
  {
    upstreamId: "Housekeeper",
    name: "家政员",
    nanokaId: "13106",
    sha256: "245041a7d461871ad49477a8f0956f99847409424135ed34f7b712616ed9818d",
    notePrefix: "位于后场时，装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 45,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 52,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 58,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 65,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 72,
      },
    ],
  },
  {
    upstreamId: "Peacekeeper_Specialized",
    name: "维序者-特化型",
    nanokaId: "13127",
    sha256: "6ede50ba4109867976d76b4dbce456a11f346ea42873c26c1dcdadbc122eacd3",
    notePrefix: "拥有护盾时，装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-ms1q8l6m-sw89dm",
        effectId: "eff-ms1zrtg4-v2bhlz",
        value: 40,
      },
      {
        rank: 2,
        blockId: "blk-ms1q8zbq-ysi7mh",
        effectId: "eff-ms1zryw8-45jrln",
        value: 46,
      },
      {
        rank: 3,
        blockId: "blk-ms1q978x-r8ti67",
        effectId: "eff-ms1zs2h2-udy588",
        value: 52,
      },
      {
        rank: 4,
        blockId: "blk-ms1q9c8o-q2of3b",
        effectId: "eff-ms1zs6yo-puc1b9",
        value: 58,
      },
      {
        rank: 5,
        blockId: "blk-ms1q9gz1-0kwnlx",
        effectId: "eff-ms1zsavo-fzwwl8",
        value: 64,
      },
    ],
  },
  {
    upstreamId: "Hellfire_Gears",
    name: "燃狱齿轮",
    nanokaId: "14110",
    sha256: "ff9ccb3fa3763e4d5ddd7b828574c14f55dfca722acd8d03a7f778ea7bcdca8b",
    notePrefix: "位于后场时，装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-ms1nik02-6x9k3x",
        effectId: "eff-ms1nik02-wn2n3p",
        value: 60,
      },
      {
        rank: 2,
        blockId: "blk-ms1nj1mz-5ajt8k",
        effectId: "eff-ms1nj1mz-33h9yh",
        value: 75,
      },
      {
        rank: 3,
        blockId: "blk-ms1njfpo-c2y68w",
        effectId: "eff-ms1njfpo-2zrguc",
        value: 90,
      },
      {
        rank: 4,
        blockId: "blk-ms1njtyu-fcmkxt",
        effectId: "eff-ms1njtyu-cvmyau",
        value: 105,
      },
      {
        rank: 5,
        blockId: "blk-ms1nk22a-ty79n2",
        effectId: "eff-ms1nk22a-0hwofq",
        value: 120,
      },
    ],
  },
  {
    upstreamId: "Flamemaker_Shaker",
    name: "灼心摇壶",
    nanokaId: "14117",
    sha256: "94bbddbe3344be28498493520e2dc78e1f2772498397ab7d42256bfc2c465d3e",
    notePrefix: "位于后场时，装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1wkhh3-zq9asn",
        value: 60,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1wtkfw-xqz9lo",
        value: 75,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1wu9xl-0og37t",
        value: 90,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms1wuy85-zp3e2n",
        value: 105,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms1wvm5e-jl6dgb",
        value: 120,
      },
    ],
  },
  {
    upstreamId: "Weeping_Cradle",
    name: "啜泣摇篮",
    nanokaId: "14121",
    sha256: "1ba0d52482bf316cf987ac17999bc6a0510fc90153e930664656286078daa4dd",
    notePrefix: "位于后场时，装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1zwc3t-y6iv02",
        value: 60,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1zwnfa-ib972o",
        value: 75,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1zwut7-09s4nv",
        value: 90,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms1zx37b-e1s233",
        value: 105,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms1zxc6r-9ssiac",
        value: 120,
      },
    ],
  },
  {
    upstreamId: "Half-Sugar_Bunny",
    name: "半糖雪兔",
    nanokaId: "14134",
    sha256: "91cbdf1c39ac0864b0c1df0a7078aecc0f8d9eeae912143fedcffd8e1e3a24c6",
    notePrefix: "装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1zsp0c-otdfbz",
        value: 46,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1ztd1n-xwqo0p",
        value: 53,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1zto8e-t2e2w4",
        value: 60,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms1ztwyr-lmgwoh",
        value: 67,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms1zu3k5-k5egz1",
        value: 74,
      },
    ],
  },
  {
    upstreamId: "Dreamlit_Hearth",
    name: "铸梦炉歌",
    nanokaId: "14145",
    sha256: "66c53683ba91fc669dcd91f08a6f229c2ac8954ed734ad6d9d60a77bbe751d97",
    notePrefix: "装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1zxwea-108qso",
        value: 40,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1zy5kv-qxy242",
        value: 46,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1zye58-m5xsoq",
        value: 52,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms1zymuj-jgthl4",
        value: 58,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms1zyw66-9cnhly",
        value: 64,
      },
    ],
  },
  {
    upstreamId: "Yesterday_Calls",
    name: "昨夜来电",
    nanokaId: "14148",
    sha256: "3245466324100f866c221d3aa6d6de4621ecedef8a9e10f6d1c70953f409601e",
    notePrefix: "位于后场时，装备者的能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 150,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 170,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 190,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 210,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "legacy-self-energyRegen",
        value: 230,
      },
    ],
  },
  {
    upstreamId: "Thoughtbop",
    name: "思络成歌",
    nanokaId: "14149",
    sha256: "7aeb67fed1144128ab46d06004b4075f449f230306420c3316633f0fa47cd252",
    notePrefix: "装备者为非操作中角色时，能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1zzc96-t16l30",
        value: 60,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1zzkj9-gxjv06",
        value: 69,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1zzstk-8h3ev8",
        value: 78,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms2001or-sr6i90",
        value: 87,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms200bfx-381kfh",
        value: 96,
      },
    ],
  },
  {
    upstreamId: "Head_Lackey",
    name: "首席跟班",
    nanokaId: "14157",
    sha256: "5f0852373824739812d5e4fed0f362d80638bddea1a868892d08373710e4066c",
    notePrefix: "装备者为非操作中角色时，能量自动回复提升",
    records: [
      {
        rank: 1,
        blockId: "blk-legacy",
        effectId: "eff-ms1ybpnc-milh2d",
        value: 40,
      },
      {
        rank: 2,
        blockId: "blk-legacy",
        effectId: "eff-ms1yc25b-jcc7jk",
        value: 46,
      },
      {
        rank: 3,
        blockId: "blk-legacy",
        effectId: "eff-ms1yc8f7-xtmpu8",
        value: 52,
      },
      {
        rank: 4,
        blockId: "blk-legacy",
        effectId: "eff-ms1ycgri-brrrrl",
        value: 58,
      },
      {
        rank: 5,
        blockId: "blk-legacy",
        effectId: "eff-ms1ycsvo-3n3n2g",
        value: 64,
      },
    ],
  },
]

const flatEnergyRegenVerification = (
  engine: FlatEnergyRegenEngine,
  record: FlatEnergyRegenRecord,
): string => {
  const flat = formatFlatPoints(record.value)
  const flatWithBase = formatFlatPoints(record.value * 1.2)
  return `块 note 与 Nanoka 同文（固定源 /wengines/*/refinementBuffs/${record.rank - 1}/effectBlocks/0/note，Nanoka w-engines/${engine.nanokaId} 的 /talents/${record.rank}/desc）均写明「${engine.notePrefix}${flat}点/秒」，是固定回能点数，不是基础回能百分比。固定来源却把该条款编入 energyRegen 百分比字段（value=${record.value}，经 basePercentage 读取为 基础回能 × ${flat}；基础回能 1.2 点/秒时实际增加 ${flatWithBase} 点/秒）。Fairy 按本登记把${engine.name}精炼 ${record.rank}编译为固定回能加数：+${flat} 点/秒（energy-per-second，value × 0.01），不随基础回能缩放；触发条件仍由调用方显式选择声明，持续时间与同名被动限制不模拟。真正的百分比回能记录（摇摆爵士、月光安可二件套 +20%）不在登记内，energyRegen 的百分比语义保持不变。来源 stat、编码或数值漂移即拒绝生成，不静默套用到其他 energyRegen 记录。`
}

const bellicoseBlazeVerification = (refinement: 1 | 2 | 3 | 4 | 5): string => {
  const perStack = bellicoseBlazePerStackPercent[refinement]!
  const valuePart =
    refinement === 1
      ? "固定来源早期曾把精炼 1 每层忽防记为 16，现固定源已修正为 15，与块 note 及 Nanoka 一致；仍需修正的误编是 "
      : "固定来源误编："
  return `块 note 与 Nanoka 同文（固定源 /wengines/29/refinementBuffs/${refinement - 1}/effectBlocks/0/note，Nanoka w-engines/14130 的 /talents/${refinement}/desc）：「装备者发动[追加攻击]造成火属性伤害时，装备者的攻击对敌人造成的伤害无视${perStack}%防御力，持续8秒，3秒内最多获得1层，最多叠加2层」。文本证明的只是火属性追加攻击命中为取得状态的触发条件。${valuePart}以 scope=skill 的 follow_up 技能目标与 elementFilter=[火] 把该触发条件当成受益筛选，非火属性或非追加攻击的命中被排除。Fairy 按本登记移除元素与追加攻击分类的受益筛选，保留固定来源 scope=skill 派生的直伤种类（regular/sheer/sharpen）限制与 2 层上限——中文「装备者的攻击」与英文「their attacks」均未界定异常类伤害是否受益，项目伤害分类契约亦不足以核定，异常受益范围保留待证，不以文本为已证结论。触发事实、8 秒持续、3 秒取层间隔与层数由调用方显式选择/层数声明，不模拟时间线。编码或数值漂移即拒绝生成。`
}

const myriadEclipseIgnoreDefenseVerification = (
  refinement: 1 | 2 | 3 | 4 | 5,
): string => {
  const percent = myriadEclipseIgnoreDefensePercent[refinement]!
  return `块 note 与 Nanoka 同文（固定源 /wengines/22/refinementBuffs/${refinement - 1}/effectBlocks/0/note，Nanoka w-engines/14129 的 /talents/${refinement}/desc）：「[强化特殊技]、[连携技]、[终结技]造成冰属性伤害时，角色获得[零度处刑宣言]效果，持续3秒；[零度处刑宣言]效果期间，角色命中敌人时无视${percent}%防御力」——冰属性强化特殊技/连携/终结命中只是触发条件，状态期间的忽防面向角色全部命中，不限定冰属性。固定来源却给精炼 ${refinement} 的忽防记录加了 elementFilter=[冰]（精炼 5 为 all，与本档 note 语义一致）。Fairy 按本登记移除该元素条件；[零度处刑宣言]状态有效由调用方显式选择声明，3 秒持续不模拟。数值 ${percent}% 保持来源原值；elementFilter 或 skillTargets 编码漂移即拒绝生成。`
}

const bloodCasketDescriptionVerification = (
  refinement: 1 | 2 | 3 | 4 | 5,
): string => {
  const rate: Readonly<Record<1 | 2 | 3 | 4 | 5, string>> = {
    1: "0.48",
    2: "0.56",
    3: "0.64",
    4: "0.72",
    5: "0.8",
  }
  const cap: Readonly<Record<1 | 2 | 3 | 4 | 5, string>> = {
    1: "24",
    2: "28",
    3: "32",
    4: "36",
    5: "40",
  }
  return `固定源 /wengines/76/refinementBuffs/${refinement - 1}/effectBlocks/0/note 已按精炼写出「每超出 1% 暴击率提升 ${rate[refinement]!}% 增伤、上限 ${cap[refinement]!}%」，与 Nanoka w-engines/13021 的 /talents/${refinement}/desc 同文。Fairy 的来源数值（convert 的 ratioPercent 与 cap 按精炼 48/56/64/72/80 与 24/28/32/36/40）本身正确；本登记只把五档来源 note 合并为共享选项的说明，数值、规则与稳定 ID 不变。块 note 漂移（与登记原文不符）即拒绝生成。`
}

/**
 * 本批具名登记的构造入口：以固定来源的稳定身份键（category/entityId/
 * rankKind/rank/blockId/effectId）逐条生成，登记表数值与来源原值一一对应。
 */
export const wengineCorrectionRegistrations = (): Record<
  string,
  SourceSemantics
> => {
  const registrations: Record<string, SourceSemantics> = {}
  // C05：11 件音擎 × 5 精炼，共 55 条固定回能记录。
  for (const engine of flatEnergyRegenEngines)
    for (const record of engine.records)
      registrations[
        `w-engines/${engine.upstreamId}/refinement/${record.rank}/${record.blockId}/${record.effectId}`
      ] = {
        kind: "flat-energy-regen",
        expectedSourceValue: record.value,
        differenceId: "wengine-flat-energy-regen",
        evidence: wengineTalentEvidence(
          engine.nanokaId,
          engine.sha256,
          record.rank,
        ),
        verification: flatEnergyRegenVerification(engine, record),
      }
  // C01：千面日陨精炼 4 暴伤 62.25 → 65.25（块 note 与 Nanoka 五档同文）。

  // C11：千面日陨精炼 1—4 的忽防不应限定冰元素命中；精炼 5 原为 all，无需登记。
  for (const refinement of [1, 2, 3, 4] as const)
    registrations[
      `w-engines/Myriad_Eclipse/refinement/${refinement}/blk-legacy/legacy-self-reduceDefense`
    ] = {
      kind: "trigger-conditions-not-benefit-scope",
      removeElementCondition: true,
      removeSkillTargetConditions: false,
      expectedElementFilter: ["冰"],
      expectedSkillTargetCategories: [],
      differenceId: "myriad-eclipse-zero-verdict-ignore-defense-scope",
      evidence: wengineTalentEvidence("14129", myriadEclipseSha, refinement),
      verification: myriadEclipseIgnoreDefenseVerification(refinement),
    }
  // C10：嚣枪喧焰五档——移除火元素/追加攻击受益限制；精炼 1 每层 16 → 15。
  for (const refinement of [1, 2, 3, 4, 5] as const)
    registrations[
      `w-engines/Bellicose_Blaze/refinement/${refinement}/blk-legacy/legacy-self-reduceDefense`
    ] = {
      kind: "trigger-conditions-not-benefit-scope",
      removeElementCondition: true,
      removeSkillTargetConditions: true,
      expectedElementFilter: ["火"],
      expectedSkillTargetCategories: ["follow_up"],
      differenceId: "bellicose-blaze-trigger-scope-ignore-defense",
      evidence: wengineTalentEvidence("14130", bellicoseBlazeSha, refinement),
      verification: bellicoseBlazeVerification(refinement),
    }
  // T01：血髓秘匣共享说明只描述精炼 1，覆盖为按精炼列值的文本。
  for (const refinement of [1, 2, 3, 4, 5] as const)
    registrations[
      `w-engines/BloodCasket/refinement/${refinement}/blk-mtsg3tw6-5rsbpt/eff-mtsg3tw6-gydnli`
    ] = {
      kind: "refinement-value-description",
      conditionDescription: bloodCasketRefinementDescription,
      expectedBlockNote: bloodCasketBlockNotes[refinement],
      differenceId: "blood-casket-refinement-aware-description",
      evidence: wengineTalentEvidence("13021", bloodCasketSha, refinement),
      verification: bloodCasketDescriptionVerification(refinement),
    }
  return registrations
}

/**
 * 莱特（1161）[昂扬]的冻结证据：额外能力的中文逐档说明（核心 1—7 的每层
 * 1.25%、冲击力转化条款与 75% 总上限相同）与影画 2 天赋原文。
 */
const lighterElationEvidence: readonly SemanticsEvidenceReference[] = (
  [1161501, 1161502, 1161503, 1161504, 1161505, 1161506, 1161507] as const
).map((row) => ({
  path: "agents/1161/details.zh.json",
  pointer: `/passive/level/${row}/desc/1`,
  sha256: "ba3315dad6950ade70e58d26d388c7faa189844a6fe6c7e11903e7dff18bf9c3",
}))

const lighterElationMindscape2Evidence: readonly SemanticsEvidenceReference[] =
  [
    {
      path: "agents/1161/details.zh.json",
      pointer: "/passive/level/1161501/desc/1",
      sha256:
        "ba3315dad6950ade70e58d26d388c7faa189844a6fe6c7e11903e7dff18bf9c3",
    },
    {
      path: "agents/1161/details.zh.json",
      pointer: "/talent/2/desc",
      sha256:
        "ba3315dad6950ade70e58d26d388c7faa189844a6fe6c7e11903e7dff18bf9c3",
    },
  ]

/**
 * 烈霜按冰属性结算伤害与增益的冻结证据：星见雅（1091）的烈霜属性说明
 * （“烈霜属性会基于冰属性结算伤害与增益效果”）。昂扬正文的“冰属性伤害”
 * 因此必须覆盖有正式动作的烈霜命中（如 /skill/assist 的霜刃斩击，动作
 * 元素的命中枚举是 frost），而不是把 frost 归并为 ice 或漏掉。
 */
const lighterElationFrostEvidence: readonly SemanticsEvidenceReference[] = [
  {
    path: "agents/1091/details.zh.json",
    pointer: "/specialElementType/desc",
    sha256: "5f00f24d508f8916dbfc94993a7ff4dffda09d0fafddb30259f64cee791aa841",
  },
]

/**
 * 星见雅（1091）烈霜结算的中英文证据：烈霜属性基于冰属性结算伤害与增益
 * （/specialElementType/desc，zh SHA 45f70931…、en SHA bad069eb…，两文件
 * 与固定来源版本核对）。两条批次 14 的元素修正共用。
 */
const miyabiFrostSettlementEvidence: readonly SemanticsEvidenceReference[] = [
  {
    path: "agents/1091/details.zh.json",
    pointer: "/specialElementType/desc",
    sha256: "5f00f24d508f8916dbfc94993a7ff4dffda09d0fafddb30259f64cee791aa841",
  },
  {
    path: "agents/1091/details.en.json",
    pointer: "/specialElementType/desc",
    sha256: "aa51b473f18c002f70fb7b68cdefd7425cd11b3255e86b62fca228674f9fb26e",
  },
]

/**
 * 星见雅影画 0 两个真实块的冻结完整 note（固定源 /agents/22/
 * mindscapeBuffs/0/effectBlocks/0 与 /1）。批次 14 的两条元素修正按各自
 * 所属块冻结。
 */
const miyabiUltimateBlockNote =
  "招式发动时，获得3点[落霜]，自身造成的冰属性伤害提升30%，持续12秒；"
const miyabiAdditionalAbilityBlockNote =
  "队伍中存在[支援]角色或与自身阵营相同的角色或其他[异常]角色时触发：\n[普通攻击：霜月]造成的伤害提升60%；队伍中任意角色触发[紊乱]效果时，星见雅获得2点[落霜]，且在下一次[霜月架势]期间，[普通攻击：霜月]将无视目标30%冰属性伤害抗性。"

/** 终结技后冰伤 +30% 记录（blk-legacy/effects/0）的登记编码。 */
const miyabiUltimateDamageBonusEncoding = {
  id: "legacy-self-dmgBonus",
  origin: "",
  scope: "general",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: null,
  skillSubcategoryId: null,
  skillTargets: null,
  elementFilter: ["冰"],
  kind: "fixed",
  stat: "dmgBonus",
  value: 30,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: null,
  enabledDefault: true,
  convert: null,
  note: "",
} as const

/** 额外能力霜月 30% 冰抗忽视记录（blk-ms4msho4-fuuot6/effects/1）的登记编码。 */
const miyabiShimotsukiResPenEncoding = {
  id: "eff-ms4mu14z-vj4c3r",
  origin: "",
  scope: "skill",
  applyTarget: "self",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillCategory: "basic",
  skillSubcategoryId: "miyabi-basic-ms4mtpk5",
  skillTargets: [{ category: "basic", subcategoryId: "miyabi-basic-ms4mtpk5" }],
  elementFilter: ["冰"],
  kind: "fixed",
  stat: "resPen",
  value: 30,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: null,
  enabledDefault: true,
  convert: null,
  note: "",
} as const

/** 基础 stacked 记录的登记编码（rank 0 与影画 2 复制记录只差每层值）。 */
function lighterBaseEncoding(rank: 0 | 2) {
  const elementFilter = rank === 0 ? ["冰", "火"] : ["火", "冰"]
  return {
    stat: "dmgBonus",
    scope: "general",
    applyTarget: "team",
    applySituation: "global",
    applyProfession: null,
    teamProfession: null,
    teamProfessionValues: null,
    teamProfessionMinCount: null,
    skillSubcategoryId: null,
    elementFilter,
    kind: "stacked",
    value: 0,
    stackable: false,
    maxStacks: 20,
    valuePerStack: rank === 0 ? 1.25 : 0.25,
    defaultStacks: 20,
    // 来源记录不含异常受益标记；出现该字段（无论 true/false）都会改变
    // 命中伤害种类范围，按漂移拒绝。
    appliesToAnomaly: null,
    enabledDefault: true,
    note: "",
  } as const
}

/** 转化记录的登记编码（rank 0 的 50% 与影画 2 的 10% 复制记录）。 */
function lighterConversionEncoding(rank: 0 | 2, ratioPercent: 50 | 10) {
  return {
    stat: "dmgBonus",
    scope: "general",
    applyTarget: "team",
    applySituation: "global",
    applyProfession: null,
    teamProfession: null,
    teamProfessionValues: null,
    teamProfessionMinCount: null,
    skillSubcategoryId: null,
    elementFilter: ["火", "冰"],
    kind: "convert",
    value: 0,
    stackable: false,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    appliesToAnomaly: null,
    enabledDefault: true,
    note: "",
    convertFrom: "impact",
    convertRatioPercent: ratioPercent,
    convertCap: rank === 0 ? 50 : 10,
    convertInitialBase: 170,
    convertPanelSource: "manual",
    convertDefaultBase: 270,
  } as const
}

/** 额外能力块 note 必须包含的关键条款（固定来源原文；漂移即拒绝生成）。 */
const lighterElationBaseBlockNoteIncludes = [
  "每拥有一层[昂扬]，代理人造成的冰属性伤害和火属性伤害提升1.25%",
  "每超过10点冲击力会使每层[昂扬]提供的增益效果额外提升0.25%",
  "[昂扬]最多使代理人造成的冰属性伤害和火属性伤害提升75%",
  // 完整状态硬编码依赖的读取时点、转化阈值与层数上限：获得[昂扬]时的
  // 冲击力快照读数、170 点阈值、最多 20 层重写原文即拒绝生成。
  "获得[昂扬]时，若莱特的冲击力高于170点",
  "全队角色获得一层[昂扬]，最多叠加20层",
] as const

/** 影画 2 块 note 必须包含的关键条款（固定来源原文；漂移即拒绝生成）。 */
const lighterElationMindscape2BlockNoteIncludes = [
  "[额外能力：斗志昂扬]中由[昂扬]提供的冰属性伤害和火属性伤害增益效果提升至原本的120%",
] as const

const lighterElationCompleteStateVerification =
  "固定来源把[昂扬]拆成两条可独立切换的记录：/agents/50/mindscapeBuffs/0/effectBlocks/1/effects/0 的每层 1.25% stacked 与 /effects/1 的冲击力转化 convert；块 note 与 Nanoka 额外能力说明（agents/1161/details.zh.json 的 /passive/level/1161501—1161507/desc/1，核心 1—7 同文）一致：每层[昂扬]使代理人造成的冰属性伤害和火属性伤害提升 1.25%；获得[昂扬]时若莱特冲击力高于 170 点，每超过 10 点使每层增益额外提升 0.25%（即每点 0.00025）；[昂扬]最多使冰/火伤害提升 75%。因此完整状态的总增益是 min(0.75, (0.0125 + max(0, 获得时冲击力 − 170) × 0.00025) × 层数)：上限作用于乘层数后的总增益（I200/L5 为 10%），不是把单次 50% 转化按层重复累加，也不是把 75% 除以 20 后当作每层封顶。命中元素按来源正文“冰属性伤害和火属性伤害”限制；烈霜按冰属性结算伤害与增益（agents/1091/details.zh.json 的 /specialElementType/desc），其命中枚举 frost 由本具名规则显式覆盖，不改全局元素归并。转换器只保留一条完整贡献：基础记录改写为上述表达式，supplied、maximumLayers 1（一次性完整状态），获得时冲击力按原有转化输入名要求调用方显式提供（无默认值，不读取当前面板），层数由目录按登记输入名从 selection.layers 派生（0 层关闭，不要求冲击力）。来源的被取代记录不再生成独立增益。显式冲击输入与层数由调用方声明，不模拟时间线。"

const lighterElationConversionReplacedVerification =
  "固定来源 /agents/50/mindscapeBuffs/0/effectBlocks/1/effects/1 的转化记录（convert impact、manual、ratioPercent 50、cap 50、initialBase 170）没有层数：把它当独立增益会得到 I200 单次 15%，与每层 1.25% stacked 记录叠加后 I200/L5 合计 21.25%，而完整状态应为每层 2% × 5 = 10%。块 note 与 Nanoka 说明里的 75% 上限作用于整个按层状态，故该记录并入基础记录改写出的完整状态贡献（min(0.75, (0.0125 + max(0, I−170)×0.00025) × L)），自身只编译为带迁移说明的 unsupported 选项，不生成可执行贡献。原始与规范化记录的 stat、编码与数值由登记逐字段防漂移。"

const lighterElationM2DuplicatesReplacedVerification =
  "固定来源把影画 2 的「[昂扬]效果提升至原本的 120%」另记为两条记录（/agents/50/mindscapeBuffs/2/effectBlocks/0/effects/1 为每层 +0.25% 的 stacked、/effects/2 为单次冲击力转化 convert、ratioPercent 10、maxStacks 1），块 note 与 Nanoka 天赋 2（agents/1161/details.zh.json 的 /talent/2/desc）同文说明这是对同一[昂扬]状态整体的乘数，不是第二个昂扬，也不构成第二条完整贡献（单次转化没有层数，不能按层重复累加）。两条记录因此都并入完整状态（只保留迁移说明，不再生成可执行贡献），120% 由配置阶段 output scale 1.2 修改直接作用于同一条完整贡献；M0—M6 共用同一选项，影画 2 起随配置自动强化一次。影画 2 的独立失衡易伤 +25%（/effects/0）保持独立选项与数值不变。"

const yuzuhaAdditionalAbilityEvidence: readonly SemanticsEvidenceReference[] = [
  ...[1411049, 1411050, 1411051, 1411052, 1411053, 1411054, 1411055].map(
    (row) => ({
      path: "agents/1411/details.zh.json",
      pointer: `/passive/level/${row}/desc/1`,
      sha256:
        "4922346ce3919844ad167b0e52e2ee4e3999d7a487429d549a27fe058e661920",
    }),
  ),
  ...["/passive/level/1411049/desc/0", "/talent/1/desc"].map((pointer) => ({
    path: "agents/1411/details.zh.json",
    pointer,
    sha256: "4922346ce3919844ad167b0e52e2ee4e3999d7a487429d549a27fe058e661920",
  })),
]

function yuzuhaPartialState(
  rank: 0 | 1,
  stat: "anomalyDmgBonus" | "disorderDmgBonus",
  conversion: boolean,
  appliesToAnomaly: true | null = true,
): SourceSemantics {
  return {
    kind: "complete-state-tanuki-wish",
    expectedEncoding: {
      stat,
      scope: "general",
      applyTarget: "team",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      skillCategory: null,
      skillSubcategoryId: null,
      skillTargets: null,
      elementFilter: "all",
      origin: "",
      kind: conversion ? "convert" : "fixed",
      value: conversion ? 0 : rank === 0 ? -20 : -6,
      stackable: false,
      maxStacks: 1,
      valuePerStack: 0,
      defaultStacks: 1,
      appliesToAnomaly,
      enabledDefault: true,
      note: "",
      convertPresent: conversion,
      convertFrom: conversion ? "anomalyControl" : null,
      convertPanelSource: conversion
        ? stat === "anomalyDmgBonus" || rank === 1
          ? "final"
          : "external"
        : null,
      convertRatioPercent: conversion ? (rank === 0 ? 20 : 6) : null,
      convertCap: conversion ? (rank === 0 ? 20 : 6) : null,
      convertInitialBase: conversion ? 100 : null,
      convertDefaultBase: conversion ? 201 : null,
    },
    expectedBlockNoteIncludes:
      rank === 0
        ? [
            "队伍中存在[异常]角色或与自身阵营相同的角色时触发",
            "若柚叶的异常掌控大于100点，每超过1点异常掌控",
            "拥有[狸之愿]效果的角色",
            "所有属性异常伤害和[紊乱]伤害提升0.2%，最多提升20%",
            "当柚叶的异常掌控达到200点时，上述增益效果达到最大值",
          ]
        : ["[额外能力]中属性异常伤害和[紊乱]伤害增益效果提升至原本的130%"],
    evidence: yuzuhaAdditionalAbilityEvidence,
    verification:
      "固定来源四条基础记录与四条 M1 记录被拆成独立正转化和负数抵消选项；配对高掌控时已有 20%/26% 上限正确，但 AM88 产生 -2.4%/-3.12%，且单选半状态不完整。块 note 与 Nanoka 3.2 全七档额外能力、M1 天赋同文：base=min(0.20,max(0,AM-100)*0.002)，M1—M6 对同一状态输出乘 1.3 一次。八条旧贡献全部退出，新完整状态统一启用异常与紊乱分支。来源 3.2.5 已把异常分支改为 final、紊乱分支改为 external，初始基础 100、每点 0.2%、上限 20%；Fairy 按分支分别提供 final/external 异常掌控显式读数，无默认值，不自动读取面板。编队资格、狸之愿有效状态和40秒持续/刷新由调用方声明；不扩展异常积蓄或瞬时能量输出，非整点游戏精度未实测。",
  }
}

export const YANAGI_POLARITY_DIFFERENCE_ID =
  "yanagi-polarity-disorder-isolation"
export const YANAGI_POLARITY_EXPLANATION =
  "柳影画 2 的极性紊乱比例提升与额外突刺、影画 6 的次数上限条款曾被误映射为普通紊乱或乱流倍率增益；完整极性紊乱（原紊乱比例与柳异常精通附加）尚未支持。三个旧选项保留身份与来源，但包括 0 层在内的显式选择均拒绝；请移除这些选择，低层调用也须移除对应旧 effectId，不存在可替换的新极性选项。影画 6 的独立 20% 特殊技增伤继续可用。"

function yanagiPolarityIsolation(
  rank: 2 | 6,
  id: string,
  stat: "disorderBaseMultFactor" | "turbulenceBaseMultFactor",
  stacked: boolean,
): SourceSemantics {
  return {
    kind: "isolated-polarity-disorder",
    expectedEncoding: {
      id,
      origin: "",
      scope: "skill",
      applyTarget: "self",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      skillCategory: "special",
      skillSubcategoryId: "all-special-ms0fcqv7",
      skillTargets: [
        { category: "special", subcategoryId: "all-special-ms0fcqv7" },
      ],
      elementFilter: "all",
      kind: stacked ? "stacked" : "fixed",
      stat,
      value: stacked ? 0 : 5,
      stackable: false,
      maxStacks: stacked ? 2 : 1,
      valuePerStack: stacked ? 15 : 0,
      defaultStacks: stacked ? 2 : 1,
      appliesToAnomaly: true,
      enabledDefault: true,
      note: "",
    },
    expectedSourceBlockNote:
      rank === 2
        ? "下落攻击命中处于属性异常状态下的敌人并触发[极性紊乱]效果时，对目标造成的伤害倍率提升至原本[紊乱]效果的20%，每额外发动一次突刺攻击，该伤害倍率额外提升15%，伤害倍率额外提升效果最多触发2次。"
        : "在[强化特殊技]中发动突刺攻击后，[森罗万象]状态的持续时间提升至30秒，状态持续期间，[强化特殊技]造成的伤害提升20%；\n[卓越适应性]中，[极性紊乱]伤害倍率额外提升效果的触发次数上限提升至4次，前4次额外发动突刺攻击时所需的能量消耗减半。",
    differenceId: YANAGI_POLARITY_DIFFERENCE_ID,
    evidence: [
      {
        path: "agents/1221/details.zh.json",
        pointer: `/talent/${rank}/desc`,
        sha256:
          "e7416b61f843bb5591298608c4a02e34d252f809d370e05a250b3b15e80a8734",
      },
      {
        path: "agents/1221/details.en.json",
        pointer: `/talent/${rank}/desc`,
        sha256:
          "7af184e0af52905667273934865073d3e6a0ce0a685cdb34ae97ed60501da3be",
      },
    ],
    verification: YANAGI_POLARITY_EXPLANATION,
  }
}

const ariaAbloomSourceNote =
  "爱芮的异常精通提升90点；\n爱芮的第三段[普通攻击：绝对音准]重击命中处于以太异常状态、电属性异常状态、火属性异常状态、物理属性异常状态、冰属性异常状态、风属性异常状态的目标时，触发一次[异放]：额外结算一次属性异常伤害，相对于原属性异常伤害的比例为每10点初始异常掌控27.5%/14.3%/35.7%/2.5%/3.6%/1.4%；\n当目标处于失衡状态下时，该伤害比例额外提升50%。"

const ariaAbloomPrecisionCorrections = Object.fromEntries(
  (
    [
      ["ether", "以太", "eff-ms36k7q1-vqttu0", 171.9, 253, 27.5, 0.625],
      ["electric", "电", "eff-ms36muwl-79wv54", 178.8, null, 14.3, 1.25],
      ["physical", "物理", "eff-ms36oy6h-izqgcq", 178.3, null, 2.5, 7.13],
    ] as const
  ).map(
    ([
      element,
      sourceElement,
      id,
      ratioPercent,
      defaultBase,
      percent,
      base,
    ]) => [
      `agents/aria/mindscape/0/blk-ms36joa0-0vxxo8/${id}`,
      {
        kind: "source-conversion-rate-correction",
        expectedEncoding: {
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
          elementFilter: [sourceElement],
          kind: "convert",
          stat: "anomalyReleaseMult",
          value: 0,
          stackable: false,
          maxStacks: 1,
          valuePerStack: 0,
          defaultStacks: 1,
          convert: {
            from: "anomalyControl",
            panelSource: "external",
            ratioPercent,
            cap: null,
            defaultBase,
            initialBase: 0,
          },
          appliesToAnomaly: true,
          enabledDefault: true,
          note: "",
        },
        expectedSourceBlockNote: ariaAbloomSourceNote,
        // Percent per ten mastery points × one original anomaly proc; no display rounding.
        correctedRate: (percent * base) / 1000,
        differenceId: `aria-abloom-${element}-precision`,
        evidence: [
          {
            path: "agents/1501/details.zh.json",
            pointer: "/passive/level/1501055/desc/0",
            sha256:
              "387d5054814f0f441f6341e5228299127c7c320f7bebb9620e0b9c32c7fe7e78",
          },
          {
            path: "agents/1501/details.en.json",
            pointer: "/passive/level/1501055/desc/0",
            sha256:
              "43c5795953a83bc6d15a50f6c189c545bcd0d07abb55b85c4e12fdefb1a3f167",
          },
        ],
        verification: `Nanoka 3.2 中英核心 7（1501055/desc/0）与固定 ZZZ-HP 块原文同文：${sourceElement}异放每 10 点初始异常掌控结算原异常的 ${percent}%。原异常单次倍率 ${base}（原始攻略 3.1.2—3.1.5；持续异常不取整段总和），每点系数为 ${percent} / 100 / 10 × ${base} = ${(Number(percent) * Number(base)) / 1000}。固定来源 ratioPercent=${ratioPercent} 已舍入；只替换该完整身份的转化率，保留初始掌控、核心 7、元素与一次失衡 ×1.5 的独立规则，不修改 M1 连续表达式。原值和引用保留；raw/normalized 完整编码与块 note 漂移均拒绝生成。推导及六属性审查见静态效果规范修订 42。`,
      } satisfies SourceSemantics,
    ],
  ),
)

/** 菲欧妮核心块的 3.2.5 stat 映射（完整状态登记与规则编译共用）。 */
const pheonyCoreStat = (effectId: string): string => {
  switch (effectId) {
    case "eff-1":
    case "eff-3":
      return "anomalyCritRate"
    case "eff-2":
      return "anomalyCritDmg"
    case "eff-6":
      return "anomalyReleaseCritDmg"
    case "eff-7":
      return "turbulenceCritDmg"
    case "eff-8":
      return "radianceCritDmg"
    case "eff-13":
    case "eff-16":
      return "anomalyReleaseCritRate"
    case "eff-14":
    case "eff-17":
      return "turbulenceCritRate"
    case "eff-15":
    case "eff-18":
      return "radianceCritRate"
    default:
      throw new Error(`Unexpected Pheony core effect ${effectId}`)
  }
}

/**
 * D4 的 3.2.5 补充来源证据根：已提交的冻结实体夹具，路径相对
 * packages/data；生成时按整文件摘要与 Pointer 核对。
 */
const d4Evidence = (pointer: string): SemanticsEvidenceReference => ({
  source: "data-package",
  path: "scripts/static-effects/evidence/zzz-hp-325-entities.json",
  pointer,
  sha256: "5826e29d7527e8013299c8cc9cee8a4d2725d3a522719893b3c7b123f611edca",
})

const aliceM2SubtypeConflicts = (): Record<string, SourceSemantics> =>
  Object.fromEntries(
    [
      ["eff-mvhhq6pm-b", "turbulenceDmgBonus"],
      ["eff-mvhhq6pm-d", "anomalyReleaseDmgBonus"],
    ].map(([effectId, stat]) => [
      `agents/alice/mindscape/2/blk-legacy/${effectId}`,
      {
        kind: "declared-unsupported",
        reason: "semantic-conflict",
        explanation: `爱丽丝 M2 的 ${stat} 15% 没有独立文本依据：Nanoka /talent/2/desc 只有“强击伤害提升15%”和“紊乱伤害提升15%”，而 Fairy 的宽口径 anomalyDmgBonus 已覆盖异放与乱流。本记录先登记为待口径裁定的冲突，不生成贡献。`,
        expectedEncoding: {
          applyTarget: "team",
          elementFilter: ["物理"],
          kind: "fixed",
          stat,
          value: 15,
        },
        evidence: aliceMindscape2Evidence,
        verification:
          "Nanoka agents/1401 /talent/2/desc 中英文核对；新增子类记录与宽口径 anomalyDmgBonus 重复，原文没有单列乱流或异放。",
      } satisfies SourceSemantics,
    ]),
  )

const janeSubtypeConflicts = (): Record<string, SourceSemantics> => {
  const row = (
    rank: 0 | 2,
    blockId: string,
    effectId: string,
    stat: string,
    kind: "fixed" | "stacked" | "convert",
    value: number,
    extra: Readonly<Record<string, unknown>> = {},
  ): [string, SourceSemantics] => [
    `agents/jane/mindscape/${String(rank)}/${blockId}/${effectId}`,
    {
      kind: "declared-unsupported",
      reason: "semantic-conflict",
      explanation: `简的 ${stat} 记录是“强击伤害”宽口径的展开版；Fairy 的 anomalyCritRate/anomalyCritDmg 已覆盖异放与乱流。先登记为待口径裁定的冲突，不生成可执行贡献。`,
      expectedEncoding: {
        applyTarget: "team",
        elementFilter: ["物理"],
        kind,
        stat,
        value,
        ...extra,
      },
      evidence: rank === 0 ? janeCorePassiveEvidence : janeMindscape2Evidence,
      verification:
        "Nanoka agents/1261 核心被动 /passive/level/1261507/desc/0 与 /talent/2/desc 中英文核对；原文只写[强击]伤害，新增子类记录与宽口径异常暴击通道重复。",
    } satisfies SourceSemantics,
  ]
  return Object.fromEntries([
    row(2, "blk-legacy", "eff-mvhhs5hr-l", "turbulenceCritDmg", "fixed", 50, {
      applyTarget: "team",
    }),
    row(
      2,
      "blk-legacy",
      "eff-mvhhs5hr-m",
      "anomalyReleaseCritDmg",
      "fixed",
      50,
      {
        applyTarget: "team",
      },
    ),
    row(
      0,
      "blk-ms349twy-zgu7b6",
      "eff-mvjcx1mw-5",
      "turbulenceCritRate",
      "fixed",
      40,
    ),
    row(
      0,
      "blk-ms349twy-zgu7b6",
      "eff-mvjcx1mw-6",
      "anomalyReleaseCritRate",
      "fixed",
      40,
    ),
    row(
      0,
      "blk-ms349twy-zgu7b6",
      "eff-mvjcx52e-9",
      "turbulenceCritDmg",
      "fixed",
      50,
    ),
    row(
      0,
      "blk-ms349twy-zgu7b6",
      "eff-mvjcx52e-a",
      "anomalyReleaseCritDmg",
      "fixed",
      50,
    ),
    row(
      0,
      "blk-ms349twy-zgu7b6",
      "eff-mvjcx8vt-b",
      "turbulenceCritRate",
      "convert",
      0,
    ),
    row(
      0,
      "blk-ms349twy-zgu7b6",
      "eff-mvjcx8vt-c",
      "anomalyReleaseCritRate",
      "convert",
      0,
    ),
    row(
      0,
      "blk-ms34gorp-m9dlxw",
      "eff-mvhhtmvu-3",
      "turbulenceCritDmg",
      "fixed",
      10,
      {
        applyTarget: "self",
      },
    ),
    row(
      0,
      "blk-ms34gorp-m9dlxw",
      "eff-mvhhtmvu-4",
      "anomalyReleaseCritDmg",
      "fixed",
      10,
      {
        applyTarget: "self",
      },
    ),
    row(
      0,
      "blk-ms34gorp-m9dlxw",
      "eff-mvhhtu2b-7",
      "turbulenceCritDmg",
      "stacked",
      0,
      {
        applyTarget: "self",
        maxStacks: 4,
        valuePerStack: 5,
      },
    ),
    row(
      0,
      "blk-ms34gorp-m9dlxw",
      "eff-mvhhtu2b-8",
      "anomalyReleaseCritDmg",
      "stacked",
      0,
      {
        applyTarget: "self",
        maxStacks: 4,
        valuePerStack: 5,
      },
    ),
  ])
}

/**
 * 菲欧妮额外能力[黑枝王牌]的固定记录守卫。四条记录在 991bb0e 中都是
 * 无条件 team 记录；块注（以及 Nanoka 七档 desc/1）明确要求敌人处于
 * [灼蚀]，且队伍中存在另一名[异常]角色或另一名同阵营角色。
 */
const PHEONY_ADDITIONAL_ABILITY_BLOCK_NOTE_INCLUDES =
  "队伍中存在其他[异常]角色或同阵营角色时触发：\n状态下的敌人受到属性异常伤害的暴击伤害提升15%。"
const PHEONY_ADDITIONAL_ABILITY_DETAILS_SHA256 = {
  zh: "d1aff9ae32d0a60fbf30cf41a998bd3a5cdee82daf2c6d78c6ae6a1863869a14",
  en: "1102a848035a054bafe6f570d38f8313686e33c9e6c965b7c000e6849852485e",
} as const

function pheonyAdditionalAbilityEvidence(): SemanticsEvidenceReference[] {
  return [
    ...(["zh", "en"] as const).flatMap((locale) =>
      Array.from({ length: 7 }, (_, index) => ({
        path: `agents/1641/details.${locale}.json`,
        pointer: `/passive/level/${1641501 + index}/desc/1`,
        sha256: PHEONY_ADDITIONAL_ABILITY_DETAILS_SHA256[locale],
      })),
    ),
    ...PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.pointers.map((pointer) => ({
      path: PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.path,
      pointer,
      sha256: PHEONY_ADDITIONAL_ABILITY_INDEX_EVIDENCE.sha256,
    })),
  ]
}

function pheonyAdditionalAbilityEncoding(
  id: string,
  stat: string,
): Readonly<Record<string, unknown>> {
  return {
    id,
    origin: "",
    applyTarget: "team",
    applySituation: "global",
    applyProfession: null,
    teamProfession: null,
    teamProfessionValues: null,
    teamProfessionMinCount: null,
    skillSubcategoryId: null,
    elementFilter: "all",
    kind: "fixed",
    stat,
    value: 15,
    stackable: false,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    appliesToAnomaly: true,
    enabledDefault: true,
    note: "目标默认：条件为敌人状态、未限定施放者",
    groupId: "grp-mviwkip4-4",
  }
}

function pheonyAdditionalAbilitySemantics(
  id: string,
  stat: string,
  correctedStat?: "anomalySettlementCritDmg",
): Extract<SourceSemantics, { kind: "teammate-eligibility-correction" }> {
  return {
    kind: "teammate-eligibility-correction",
    sourceLabel: "Pheony additional ability",
    expectedEncoding: pheonyAdditionalAbilityEncoding(id, stat),
    expectedSourceBlockNoteIncludes:
      PHEONY_ADDITIONAL_ABILITY_BLOCK_NOTE_INCLUDES,
    otherTeammateProfessions: ["异常"],
    otherTeammateAgentEntityIds: [
      ...PHEONY_ADDITIONAL_ABILITY_SAME_FACTION_AGENT_ENTITY_IDS,
    ],
    ...(correctedStat === undefined ? {} : { correctedStat }),
    differenceId: PHEONY_ADDITIONAL_ABILITY_TEAM_CONDITION_DIFFERENCE_ID,
    evidence: pheonyAdditionalAbilityEvidence(),
    verification:
      "固定源 /agents/52/mindscapeBuffs/0/effectBlocks/0/effects/13—16 的四条 15% 暴伤记录没有机器条件且 enabledDefault=true；块注的额外能力分句与 Nanoka /passive/level/1641501—1641507/desc/1 中英文同文要求敌人处于[灼蚀]，且队伍中存在另一名[异常]角色或同阵营角色。同队资格由目录 applicability 的两条 OR 候选在编队事实上判定，排除 holder 本人；异放 15% 按 C1 专用通道改为 anomaly-settlement-critical-damage。",
  }
}

/**
 * 仅在 991bb0e 完整固定源中启用的登记。局部真实源夹具仍使用旧冻结形状，
 * 不能让新提交的 beneficiary/target 守卫对它们执行“应命中”校验。
 */
export const SOURCE_COMMIT_991BB0E_SEMANTICS: ReadonlySet<string> = new Set([
  ...Object.keys(aliceM2SubtypeConflicts()),
  ...Object.keys(janeSubtypeConflicts()),
  ...Object.keys(broadAnomalyScopeCorrections()),
  ...Object.keys(joyauDoreAnomalyDamageScopes()),
  "agents/jane/mindscape/0/blk-ms34gorp-m9dlxw/eff-ms34gorp-xrbl8x",
  "agents/anby/mindscape/2/blk-ms47xm3l-3pumvj/eff-ms47xm3l-nf7ga7",
  "agents/anby/mindscape/6/blk-legacy/legacy-self-skillDmgBonus",
  "w-engines/Wrathful_Vajra/refinement/2/blk-legacy/legacy-self-turbulenceDmgBonus",
  "w-engines/Plume_of_Rebirth/refinement/5/blk-mviwn8gu-b8fedl/eff-mviwn8gu-8wi5ap",
])

export const SOURCE_SEMANTICS: Readonly<Record<string, SourceSemantics>> = {
  ...ariaAbloomPrecisionCorrections,
  ...aliceM2SubtypeConflicts(),
  ...janeSubtypeConflicts(),
  ...velinaAnomalyScopeCorrections(),
  ...broadAnomalyScopeCorrections(),
  ...joyauDoreAnomalyDamageScopes(),
  "agents/anby/mindscape/2/blk-ms47xm3l-3pumvj/eff-ms47xm3l-nf7ga7": {
    kind: "beneficiary-target-correction",
    expectedApplyTarget: "team",
    correctedOptionTarget: "self",
    expectedSourceValue: 30,
    differenceId: "anby-m2-beneficiary-target",
    evidence: anbyTalentEvidence(2),
    verification:
      "Nanoka agents/1011 /talent/2/desc 中英文只写“普通攻击：落雷命中失衡敌人时，招式造成的伤害提升30%”；上游把受益对象记为 team。保留 self，公开 ID 与数值不变。",
  },
  "w-engines/Plume_of_Rebirth/refinement/5/blk-mviwn8gu-b8fedl/eff-mviwn8gu-8wi5ap":
    {
      kind: "declared-unsupported",
      reason: "semantic-conflict",
      explanation:
        "991bb0e 在涅槃初翎精炼 5 新增一个 dmgBonus:0 的空效果块；Nanoka 五档天赋只写异常精通与火属性增伤，没有零值条款。该记录不生成可执行贡献，登记为待来源复核的冲突。",
      expectedEncoding: {
        applyTarget: "self",
        elementFilter: "all",
        kind: "fixed",
        stat: "dmgBonus",
        value: 0,
      },
      evidence: [
        {
          path: "w-engines/14164/details.zh.json",
          pointer: "/talents/5/desc",
          sha256:
            "610efdcce529cf93fe578fe0c3e29d1b875dabf0a904bb831449cb34a05d091d",
        },
        {
          path: "w-engines/14164/details.en.json",
          pointer: "/talents/5/desc",
          sha256:
            "b40ac9148fbd2433eaa9e896009c5e9bf4607b855eed5719060f4d8547c9b383",
        },
      ],
      verification:
        "Nanoka w-engines/14164 /talents/5/desc 中英文核对：精炼 5 只有异常精通 126 与火属性伤害 56% 两个条款；991bb0e 的空 dmgBonus:0 块没有文本依据，登记为 semantic-conflict，不生成规则。",
    },
  "agents/anby/mindscape/6/blk-legacy/legacy-self-skillDmgBonus": {
    kind: "skill-target-scope-correction",
    expectedStat: "skillDmgBonus",
    expectedValue: 45,
    expectedSkillTargets: [
      { category: "basic", subcategoryId: "anby-basic-ms47yaat" },
      { category: "dodge", subcategoryId: "all-dodge-ms0dnpmr" },
    ],
    correctedSkillTargets: [
      { category: "basic", subcategoryId: null },
      { category: "dodge", subcategoryId: "all-dodge-ms0dnpmr" },
    ],
    expectedSourceBlockNote:
      "原文：发动[强化特殊技]时，安比获得8层充能（上限8层）；[普通攻击]或[冲刺攻击]命中敌人时，消耗1层充能，使当前招式造成的伤害提升45%。\n[关键字] 属性=招式增伤 元素=无 动作=提升 数值=45 单位=% 目标=无 条件=无法提取 作用域=招式 层数=无 时长=无 对象=当前招式",
    differenceId: "anby-m6-all-basic-skill-targets",
    evidence: anbyTalentEvidence(6),
    verification:
      "Nanoka agents/1011 /talent/6/desc 中英文写[普通攻击]或[冲刺攻击]命中，未限定落雷；上游把 basic 收窄到 anby-basic-ms47yaat。保留所有 basic 与 all-dodge 目标，公开 ID 与数值不变。",
  },

  "agents/yanagi/mindscape/2/blk-ms4qhaez-8sfxa3/eff-ms4qhaez-6zbkbm":
    yanagiPolarityIsolation(
      2,
      "eff-ms4qhaez-6zbkbm",
      "disorderBaseMultFactor",
      false,
    ),
  "agents/yanagi/mindscape/2/blk-ms4qhaez-8sfxa3/eff-ms4qkjzo-r424yz":
    yanagiPolarityIsolation(
      2,
      "eff-ms4qkjzo-r424yz",
      "turbulenceBaseMultFactor",
      true,
    ),
  "agents/yanagi/mindscape/6/blk-ms4qn0z7-6fc8g6/eff-ms4qob0d-mk1bgo":
    yanagiPolarityIsolation(
      6,
      "eff-ms4qob0d-mk1bgo",
      "disorderBaseMultFactor",
      true,
    ),
  "w-engines/Blazing_Laurel/refinement/5/blk-legacy/legacy-team-dmgBonus": {
    kind: "source-stat-correction",
    correctedStat: "critDmg",
    expectedProfession: "击破",
    expectedEncoding: {
      stat: "dmgBonus",
      scope: "general",
      kind: "stacked",
      value: 0,
      stackable: false,
      valuePerStack: 2.4,
      maxStacks: 20,
      applyTarget: "team",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      elementFilter: ["火", "冰"],
      skillCategory: null,
      skillSubcategoryId: null,
      skillTargets: null,
      appliesToAnomaly: null,
      convert: null,
      note: "",
    },
    expectedSourceBlockNote:
      "装备者的[普通攻击]命中敌人时，对目标施加一层[萎靡]，最多叠加20层，持续30秒，重复触发时刷新持续时间；队伍中任意角色攻击命中敌人时，目标每拥有一层[萎靡]，本次攻击中冰属性伤害和火属性伤害的暴击伤害提升2.4%，该效果全队唯一。",
    differenceId: "blazing-laurel-r5-wilt-critical-damage",
    evidence: [
      {
        path: "w-engines/14116/details.zh.json",
        pointer: "/talents/5/desc",
        sha256:
          "0b2ae556d5d4547007bbc24f0b2f6a1eaf5623b7fde691b070fd3f03099fc21a",
      },
      {
        path: "w-engines/14116/details.en.json",
        pointer: "/talents/5/desc",
        sha256:
          "25cf01fce238107474bfd8c229f53b0b83ecb6d7a616e166e16882beb9992b6f",
      },
    ],
    verification:
      "固定来源 fac62407 的焰心桂冠 R5 萎靡记录误写 stat=dmgBonus，但所属块 note 与 Nanoka 3.2 中英文 /talents/5/desc 一致写明冰、火伤害的暴击伤害每层提升 2.4%，最多 20 层；五档原文均为暴伤，R1—4 已编码为 critDmg。仅该完整来源身份改用 critDmg 映射（criticalDamage direct 加数），保留 2.4%、20 层、团队与既有受益角色元素筛选、击破装备适配及公开 option/effect ID；历史 ID 中的 dmgBonus 保留作兼容身份，不再表示落点。来源 stat 与 Pointer 保留在覆盖报告，R5 标记 corrected，R1—4 的 1.5/1.72/1.95/2.17 数值不改。普通攻击只是施加萎靡的触发；有效状态与层数仍由调用方显式声明，30 秒、刷新及全队唯一不新增通用模拟。此为按一致描述纠错，未作游戏实测或混合元素命中契约扩展。",
  },
  "w-engines/Wrathful_Vajra/refinement/2/blk-legacy/legacy-self-turbulenceDmgBonus":
    {
      kind: "source-stat-correction",
      correctedStat: "pierceDmgBonus",
      expectedProfession: "命破",
      expectedEncoding: {
        stat: "turbulenceDmgBonus",
        kind: "stacked",
        value: 0,
        stackable: false,
        valuePerStack: 10.35,
        maxStacks: 2,
        applyTarget: "self",
        applySituation: "global",
        applyProfession: null,
        teamProfession: null,
        teamProfessionValues: null,
        teamProfessionMinCount: null,
        elementFilter: ["火"],
        skillSubcategoryId: null,
        appliesToAnomaly: true,
        note: "",
      },
      expectedSourceBlockNote:
        "暴击率提升23%；装备者发动[强化特殊技]时，装备者造成的火属性贯穿伤害提升10.35%，最多叠加2层，持续20秒，每层效果单独结算持续时间。",
      differenceId: "wrathful-vajra-r2-fire-sheer-stat",
      evidence: wrathfulVajraRefinement2Evidence,
      verification:
        "Nanoka w-engines/14147 /talents/2/desc 中英文同文：精炼 2 只提升火属性贯穿伤害 10.35%，最多 2 层；固定源误写 stat=turbulenceDmgBonus，精炼 1/3/4/5 同位置均为 pierceDmgBonus。仅该完整来源身份改用 pierceDmgBonus 映射（sheer-damage-bonus 加数），保留 10.35%、2 层、火元素筛选与公开 option/effect ID；历史 ID 中的 turbulenceDmgBonus 保留为兼容身份。",
    },
  "agents/yuzuha/mindscape/0/blk-ms38y9v7-07td4j/eff-ms38y9v7-2ded3l":
    yuzuhaPartialState(0, "anomalyDmgBonus", true),
  "agents/yuzuha/mindscape/0/blk-ms38y9v7-07td4j/eff-ms3969fx-lmmkyw":
    yuzuhaPartialState(0, "disorderDmgBonus", true, null),
  "agents/yuzuha/mindscape/1/blk-legacy/eff-ms44bnmi-zp616x":
    yuzuhaPartialState(1, "anomalyDmgBonus", true),
  "agents/yuzuha/mindscape/1/blk-legacy/eff-ms44dh8h-xb20mu":
    yuzuhaPartialState(1, "disorderDmgBonus", true),

  "agents/caesar/mindscape/0/blk-legacy/legacy-team-atk": {
    kind: "core-skill-level",
    baseEvidenceKey: "caesar:blk-legacy:mindscape:0:legacy-team-atk",
    formula: { kind: "amount" },
    evidence: [],
    verification:
      "按 rank-evidence 的七档原文读取基础攻击增益；固定 ZZZ-HP 只提供核心 7 的值。记录级补档不扩大同块其他效果的支持集合。",
  },
  "agents/caesar/mindscape/2/blk-legacy/legacy-team-atk": {
    kind: "core-skill-level",
    baseEvidenceKey: "caesar:blk-legacy:mindscape:0:legacy-team-atk",
    formula: {
      kind: "proportional-increment",
      enhancementEvidenceKey: "caesar:blk-legacy:mindscape:2:legacy-team-atk",
    },
    evidence: [],
    verification:
      "核心增益提升至原本 150%；保留既有独立增量选项，仅选择本项时贡献基础值的额外 50%。未选中不贡献，与基础项同时选择才组成完整增益；作为 modification 通则的兼容例外。参数及原文只从 rank-evidence 引用。",
  },
  "agents/panyinhu/mindscape/0/blk-legacy/legacy-team-pierce": {
    kind: "core-skill-level",
    baseEvidenceKey: "panyinhu:blk-legacy:mindscape:0:legacy-team-pierce",
    formula: { kind: "capped-conversion" },
    evidence: [],
    verification:
      "按 rank-evidence 的七档转换率和上限读取基础通窍；保留显式初始攻击读取名与 attack-points 单位，不回退至预设、受益者或当前战斗面板。",
  },
  "agents/panyinhu/mindscape/6/blk-legacy/legacy-team-pierce": {
    kind: "core-skill-level",
    baseEvidenceKey: "panyinhu:blk-legacy:mindscape:0:legacy-team-pierce",
    formula: {
      kind: "capped-conversion-increment",
      enhancementEvidenceKey:
        "panyinhu:blk-legacy:mindscape:6:legacy-team-pierce",
    },
    evidence: [],
    verification:
      "单条增量贡献内部计算强化封顶值减基础封顶值，两项同读本选项显式初始攻击 A。基础与本项组合时调用方提供同一施加时的 A；保持独立选择契约，作为 modification 通则的兼容例外。低档的两个封顶点不同，不能沿用核心 7 的 min(A×6%,180)。参数及原文只从 rank-evidence 引用。",
  },
  // 简·狂热：来源记录位于影画 0 的兼容块，实际由狂热状态启用；核心被动不提供该增益。
  "agents/jane/mindscape/0/blk-legacy/legacy-self-atk": {
    kind: "explicit-selection-state",
    evidence: [
      {
        path: "agents/1261/details.zh.json",
        pointer: "/skill/basic/description/2/desc",
        sha256:
          "9961f4a46fe6c388901117810885964a5f38268462d24fa7e6c17a5c9865ae11",
      },
    ],
    verification:
      "Nanoka 基础技能描述确认：狂热由狂热心流累积进入，[狂热]状态下异常精通超过 120 的部分每点使攻击力提升 2 点、上限 600 点。该条目与核心被动无关，由调用方显式选择启用；核心 1 与 7 的结果相同。",
  },
  // 露西·加油线性项：(13+0.8L)% 初始攻击力，线性项上限 600−(40+4L)，与固定项合计受 600 总上限约束。
  "agents/lucy/mindscape/0/blk-legacy/eff-ms384fjz-fgct7r": {
    kind: "special-skill-level",
    levels: allSpecialSkillLevels,
    parameters: [
      { name: "rate", unit: "multiplier", base: 0.13, growth: 0.008 },
      { name: "cap", unit: "attack-points", base: 560, growth: -4 },
    ],
    evidence: lucyEvidence,
    verification:
      "Nanoka 强化特殊技描述给出明确等级表达式：攻击力提升 (13+AvatarSkillLevel(1)×0.8)% 初始攻击力 + (40+AvatarSkillLevel(1)×4) 点，最高不超过 600 点。原始记录把最终等级 12 的数值固定为常量（22.6%、512 线性上限）；转换器按表达式生成最终等级 1—16 的合法参数表，固定项与线性项组合表达总公式且不重复添加固定项。施加时初始攻击保留显式输入，不读取已含自身贡献的当前攻击。",
  },
  // 露西·加油固定项：40+4L 点攻击力，随同一最终等级查表。
  "agents/lucy/mindscape/0/blk-legacy/legacy-team-atk": {
    kind: "special-skill-level",
    levels: allSpecialSkillLevels,
    parameters: [
      { name: "amount", unit: "attack-points", base: 40, growth: 4 },
    ],
    evidence: lucyEvidence,
    verification:
      "Nanoka 强化特殊技描述给出明确等级表达式：固定项为 (40+AvatarSkillLevel(1)×4) 点。原始记录把最终等级 12 的数值固定为 88 点；转换器按表达式生成最终等级 1—16 的合法参数表，两条原始贡献保留既有稳定 ID 并选同一来源角色/同一最终等级。",
  },
  // 卢西娅·合唱线性项：每 200 点初始生命提升 (5+0.2L) 点贯穿力，线性项上限 600+24L。
  "agents/lucia/mindscape/0/blk-legacy/eff-ms46h2gh-mbmhuc": {
    kind: "special-skill-level",
    levels: allSpecialSkillLevels,
    parameters: [
      { name: "rate", unit: "multiplier", base: 0.025, growth: 0.001 },
      { name: "cap", unit: "sheer-force-points", base: 600, growth: 24 },
    ],
    evidence: luciaEvidence,
    verification:
      "Nanoka 强化特殊技描述给出明确等级表达式：每拥有 200 点初始最大生命值额外提升 (5+AvatarSkillLevel(1)×0.2) 点贯穿力，[破暗]最多提升 (612+AvatarSkillLevel(1)×24) 点。原始记录把最终等级 12 的数值固定为常量（3.7%、888 线性上限）；转换器按表达式生成最终等级 1—16 的合法参数表，固定 12 点（独立规则）与线性项组合表达总公式。读取 holder 的初始生命，同次战斗生命加成不回流。",
  },
  // 爱丽丝：原物理异常的紊乱倍率提升只作用于声明身份的物理原异常紊乱基础项。
  "agents/alice/mindscape/0/blk-legacy/legacy-self-disorderBaseMult": {
    kind: "damage-item-targeting",
    requirement: {
      itemId: "zzz-hp:alice:disorder-base:physical",
      stat: "attack",
      role: "base",
      allowedModes: ["standard-disorder"],
      source: "anomaly-source",
      originalAnomalyAttribute: "physical",
    },
    evidence: aliceEvidence,
    verification:
      "Nanoka 核心被动第 7 级确认：物理异常状态下的敌人被触发[紊乱]效果时，每有 1 秒物理异常状态剩余时间，[紊乱]效果的伤害倍率提升 18%、最多提升 180%。来源记录 elementFilter 限定物理且为团队目标，不能简化为受益者属性筛选：倍率按声明身份精确绑定本次被结算的物理原异常紊乱基础项，层数 0—10 由调用方显式提供，不模拟经过时间。",
  },
  // 南宫羽：来源块原文与 Nanoka 同时证明持有颤音并从失衡恢复时也可结算。
  // 影画 6 的[颤音：改]与[颤音]无法相互叠加：三条普通颤音记录追加对
  // nangongyu-vibrato-modified 独立结算目标的排除（见批次 09 补充）。
  "agents/nangongyu/mindscape/0/blk-ms4cegmd-bwnttd/eff-ms4cey14-kzw7xx": {
    kind: "stagger-recovery-settlement",
    vibratoModifiedExclusion: nangongyuVibratoModifiedExclusion({
      expectedEncoding: {
        scope: "anomalyRelease",
        applyTarget: "self",
        applySituation: "stagger",
        elementFilter: ["以太", "电", "火", "冰", "风"],
        kind: "fixed",
        stat: "anomalyReleaseMult",
        value: 450,
        stackable: false,
        maxStacks: 1,
        valuePerStack: 0,
      },
    }),
    evidence: [...nangongyuEvidence, ...nangongyuMindscape6Evidence],
    verification:
      "Nanoka 核心被动第 7 级确认：若[颤音]叠加到最大层数且敌人处于各属性异常状态下，或当敌人持有[颤音]并从失衡状态恢复时，所有[颤音]会被清除，清除时造成一次[异放]伤害。固定 JSON 的 applySituation: stagger 不构成游戏只允许失衡内结算的证据；调用方显式提供本次结算与层数，允许失衡内与恢复后的固定快照，是否失衡仍独立影响实际失衡乘区。批次 09 追加：影画 6[颤音：改]（/talent/6/desc）明文与[颤音]无法相互叠加，携带 nangongyu-vibrato-modified 独立目标的命中不再吃本五元素基础比例（4.5），普通颤音结算保持原行为。",
  },
  "agents/nangongyu/mindscape/0/blk-ms4cegmd-bwnttd/eff-ms4clm2r-e6xquw": {
    kind: "stagger-recovery-settlement",
    vibratoModifiedExclusion: nangongyuVibratoModifiedExclusion({
      expectedEncoding: {
        scope: "anomalyRelease",
        applyTarget: "self",
        applySituation: "stagger",
        elementFilter: ["物理"],
        kind: "fixed",
        stat: "anomalyReleaseMult",
        value: 449,
        stackable: false,
        maxStacks: 1,
        valuePerStack: 0,
      },
    }),
    evidence: [...nangongyuEvidence, ...nangongyuMindscape6Evidence],
    verification:
      "同上：物理来源项与五元素来源项使用同一颤音清除机制；失衡内与恢复后的固定快照均可结算，倍率精度差异按来源原值保留（物理 449%）。批次 09 追加：[颤音：改]与[颤音]无法相互叠加，携带 nangongyu-vibrato-modified 独立目标的命中不再吃本物理基础比例（4.49），普通颤音结算保持原行为。",
  },
  "agents/nangongyu/mindscape/0/blk-ms4cegmd-bwnttd/eff-ms4cm9a5-wou1p2": {
    kind: "stagger-recovery-settlement",
    vibratoModifiedExclusion: nangongyuVibratoModifiedExclusion({
      expectedEncoding: {
        scope: "anomalyRelease",
        applyTarget: "self",
        applySituation: "stagger",
        elementFilter: "all",
        kind: "stacked",
        stat: "anomalyReleaseMultFactor",
        value: 0,
        stackable: false,
        maxStacks: 4,
        valuePerStack: 25,
      },
    }),
    evidence: [...nangongyuEvidence, ...nangongyuMindscape6Evidence],
    verification:
      "同上：颤音每层 +25%、最多 4 层，同一乘区增量相加（4 层为 ×2），由调用方显式提供本次结算层数；失衡内与恢复后的固定快照均可结算。批次 09 追加：[颤音：改]与[颤音]无法相互叠加，携带 nangongyu-vibrato-modified 独立目标的命中不再吃本每层增量，普通颤音结算保持原行为。",
  },
  // 南宫羽影画 2：每层普通颤音 +10% 只强化[核心被动：天才偶像]的[颤音]
  // 结算，不强化[颤音：改]；独立登记排除（该记录保留来源的失衡内条件）。
  "agents/nangongyu/mindscape/2/blk-legacy/legacy-team-anomalyReleaseMultFactor":
    {
      kind: "exclude-settlement-target",
      excludedTargetId: "nangongyu-vibrato-modified",
      dependentSupplementIds: [
        "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
        "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
      ],
      differenceId: "nangongyu-vibrato-modified-exclusivity",
      expectedEncoding: {
        scope: "anomalyRelease",
        applyTarget: "self",
        applySituation: "stagger",
        elementFilter: "all",
        kind: "stacked",
        stat: "anomalyReleaseMultFactor",
        value: 0,
        stackable: false,
        maxStacks: 4,
        valuePerStack: 10,
      },
      expectedSourceBlockNote:
        "每层[颤音]使[核心被动：天才偶像]中[异放]的伤害比例额外提升10%；\n[额外能力：天使队长]提供的失衡易伤倍率额外提升30%；\n操作中的角色[连携技]重击命中同时处于属性异常和失衡状态下的敌人时，会对敌人触发[极性紊乱]，对目标造成原本[紊乱]效果25%的伤害，敌人在同一失衡期间仅能触发一次该效果。",
      evidence: [...nangongyuTalent2Evidence, ...nangongyuMindscape6Evidence],
      verification:
        "Nanoka 影画 2（agents/1511/details.zh.json 的 /talent/2/desc，英文同文：Each stack of Vibrato's additional Abloom DMG ratio increase from Core Passive: Prodigious Idol increases by an additional 10%）确认：每层[颤音]只使[核心被动：天才偶像]中[颤音]结算的[异放]伤害比例额外提升 10%，不强化影画 6 的[颤音：改]；固定来源把该记录的实际受益对象编为 self（ID 中的 team 前缀不作为语义依据），并保留 applySituation: stagger 的失衡内条件。影画 6（/talent/6/desc）明文[颤音：改]与[颤音]无法相互叠加：携带 nangongyu-vibrato-modified 独立目标的命中不再吃本每层 +10%，普通颤音结算（含失衡内条件与 4 层上限）保持原行为；[额外能力]的失衡易伤与极性紊乱是独立条款，不随本排除关闭。防漂移：raw/normalized 编码（scope/applyTarget/applySituation/elementFilter/kind/stat/value/stackable/maxStacks/valuePerStack）与块 note 冻结全文逐字核对，任一漂移或 normalized 删除都拒绝生成；依赖的两个批次 09 补充参与转换而本记录缺失时同样拒绝。",
    },
  // 佩洛伊斯：核心被动的终结技分支增益。
  "agents/pyrois/mindscape/0/blk-legacy/legacy-self-critDmg": {
    kind: "explicit-selection-state",
    evidence: pyroisEvidence,
    verification:
      "Nanoka 核心被动第 7 级确认：上分支[终结技：万军诛绝]的[阳炎]状态下，发动[终结技]对处于失衡状态下的敌人造成的暴击伤害提升 40%。失衡目标条件由 applySituation: stagger 照常表达，分支与状态由调用方显式断言，不同属性基础项与多个 item 各只加一次。",
  },
  "agents/pyrois/mindscape/0/blk-legacy/eff-ms4m3n71-z780mg": {
    kind: "explicit-selection-state",
    evidence: pyroisEvidence,
    verification:
      "Nanoka 核心被动第 7 级确认：下分支[终结技：凯旋坦途]的[耀斑]状态下，造成的伤害提升 40%；通用增伤与上分支的失衡目标终结技暴伤分别登记，上/下有效状态是否共存由调用方断言，不凭同块说明猜互斥。",
  },
  "agents/pyrois/mindscape/0/blk-legacy/eff-ms4m4nah-o17lgq": {
    kind: "damage-item-targeting",
    requirement: {
      itemId: "pyrois:ult-left-extra",
      stat: "attack",
      role: "base",
      allowedModes: ["direct"],
      source: "holder-current",
      requiredDirectMultiplier: 0,
    },
    evidence: pyroisEvidence,
    verification:
      "Nanoka 核心被动第 7 级确认：左分支[终结技：无拘剑势]重击命中[浸染]状态下的敌人时，额外造成等同于 900% 攻击力的伤害。+9 攻击倍率写入声明的独立左分支附加项（direct、holder-current、零初始倍率，实际倍率由关联规则贡献一次），预填非零倍率由目录拒绝；浸染前提由调用方断言。",
  },
  "agents/pyrois/mindscape/0/blk-legacy/eff-ms4m5tqw-4wvfng": {
    kind: "damage-item-targeting",
    requirement: {
      itemId: "pyrois:ult-right-settlement",
      stat: "attack",
      role: "settlement",
      allowedModes: ["direct"],
      source: "holder-current",
      requiredDirectMultiplier: 0,
    },
    evidence: pyroisEvidence,
    verification:
      "Nanoka 核心被动第 7 级确认：右分支[终结技：永陷幽囚]重击命中失衡敌人触发效果，额外造成等同于 2250% 攻击力的伤害。+22.5 决算写入声明的独立结算项（role settlement、holder-current、零初始倍率，实际倍率由关联规则贡献一次），缺独立结算项或预填非零倍率时目录按既有契约拒绝；失衡前提由调用方断言。",
  },
  // 维琳娜：微域/广域气旋在来源中临时归入 special 大类，实际不属于任何类型。
  "agents/velina/mindscape/0/blk-legacy/legacy-team-anomalyReleaseMult": {
    kind: "independent-target",
    targetId: "velina-special-ms4tnsha",
    category: "uncategorized",
    evidence: velinaEvidence,
    verification:
      "来源块自带注记：微域气旋与广域气旋只是方便处理列入[特殊技]大类，实则不属于任何类型。Nanoka 核心被动第 7 级确认该爆炸为风属性异放、固定结算 145% 倍率。目录目标元数据改为 uncategorized，条件只匹配独立目标、异放伤害种类与风元素，不附加 special 大类要求。",
  },
  // 猫又：60% 增伤与爪印来自核心被动潜能分支（闪反/快速支援后，40 秒语义）。
  "agents/nekomata/mindscape/0/blk-legacy/legacy-self-dmgBonus": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: nekomataPotentialEvidence,
    verification:
      "Nanoka 潜能分支（/passive/level/1021514，potential 为 102100—102105）确认：[闪避反击]或[快速支援]命中敌人时，自身造成的伤害提升 60%、持续 40 秒；普通分支（1021507，potential 为 [0]）为同系数 6 秒版本，由补充变体单独登记。60% 增伤仅在潜能开启时可用，只开放已核实核心 7。",
  },
  "agents/nekomata/mindscape/0/blk-legacy/eff-ms4f47p3-p1s9yz": {
    kind: "damage-item-targeting",
    requirement: {
      itemId: "nekomata:claw-mark",
      stat: "attack",
      role: "base",
      allowedModes: ["direct"],
      source: "holder-current",
      requiredDirectMultiplier: 0,
      requiredSkillCategory: "uncategorized",
    },
    minimumPotential: 1,
    independentHit: {
      targetId: "nekomata-claw-mark",
      category: "uncategorized",
      element: "physical",
      name: "超凶爪印",
    },
    evidence: nekomataClawMarkEvidence,
    verification:
      "Nanoka 潜能分支 1—7 行（1021508—1021514，potential 节点 102100—102105）均明确：处于[肉球突袭]状态时，自身攻击命中触发[超凶爪印]，造成一次等同于自身 30% 攻击力的物理伤害（1 秒冷却由调用方声明，不模拟）。爪印数值不随核心等级变化，按记录级证据开放核心 1—7（rank-evidence 以 nekomata:blk-legacy:mindscape:0:eff-ms4f47p3-p1s9yz 单独登记，不继承 60% 增伤只核实核心 7 的块级限制）。分类证据如实分层：固定 ZZZ-HP 与当前 Nanoka 文本证明额外物理伤害，但没有独立证明命中分类；uncategorized 与稳定目标身份是本项目采用的独立结算契约（具名差异 independent-hit-contract），不是原始游戏证据。命中须包含声明目标并以 uncategorized 分类显式结算，不借用触发招式的普攻/闪反分类；爪印项要求零初始倍率，30% 由关联规则贡献一次，普通动作组装不自动追加。",
  },
  "agents/nekomata/mindscape/0/blk-ms4f4rbb-id7p58/eff-ms4f4rbb-y2jon7": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: nekomataPotentialEvidence,
    verification:
      "Nanoka 潜能分支（1021514 desc/1）确认：队伍中存在[支援]角色或与自身属性/阵营相同的角色时，[闪避：尾巴失踪术]或任意角色施加[强击]后，[强化特殊技]或[闪避反击]命中伤害提升 35%、最多 2 层、持续 30 秒——扩展触发、支援队伍条件与闪反受益属于潜能分支，补充潜能门槛；普通分支（1021507 desc/1）由补充变体单独登记，两个分支条件不并集。",
  },
  // 猫又：潜能觉醒暴伤按潜能等级查表，固定与增量记录合并为一个完整状态选项。
  "agents/nekomata/mindscape/0/blk-ms4f5yzr-3tuoc1/eff-ms4f5yzr-pivfr6": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.2, "3": 0.3, "4": 0.4, "5": 0.5, "6": 0.6 },
      },
    ],
    evidence: nekomataPotentialEvidence,
    verification:
      "Nanoka potentialDetail 102101—102105（level 2—6）明确：[肉球突袭]状态下暴击伤害提升 20/30/40/50/60%。本条承接同块固定 +20% 记录并改为完整档位值，自潜能 2 起可用，maximumLayers 归一为 1；同块的 +10%/层、最多 4 层的部分记录迁移至此，不再独立可选。来源 note 的“后续每个影画”与 potentialDetail.level 不符，属具名连带修正。",
  },
  "agents/nekomata/mindscape/0/blk-ms4f5yzr-3tuoc1/eff-ms4f845b-c51ysw": {
    kind: "merged-partial-record",
    mergedIntoOptionId:
      "agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f5yzr-pivfr6",
    levels: [2, 3, 4, 5, 6],
    evidence: nekomataPotentialEvidence,
    verification:
      "Nanoka potentialDetail 102101—102105（level 2—6）明确总值为 20/30/40/50/60%，来源 note 与上游把“固定 +20%”与“+10%/层、最多 4 层”拆成两条独立记录。二者属于同一触发状态的固定与升级部分，已合并为完整档位选项 agents:nekomata:mindscape:0:blk-ms4f5yzr-3tuoc1:eff-ms4f5yzr-pivfr6；本记录不再独立可选，防止 20% 与增量重复相加。",
  },
  "agents/velina/mindscape/0/blk-legacy/eff-ms4tphp6-6zyuxs": {
    kind: "independent-target",
    targetId: "velina-special-ms4tnzvq",
    category: "uncategorized",
    evidence: velinaEvidence,
    verification:
      "来源块自带注记：微域气旋与广域气旋只是方便处理列入[特殊技]大类，实则不属于任何类型。Nanoka 核心被动第 7 级确认该爆炸为风属性异放、固定结算 255% 倍率。目录目标元数据改为 uncategorized，条件只匹配独立目标、异放伤害种类与风元素，不附加 special 大类要求。",
  },
  // 简：致命舞步的强击暴伤按潜能等级取完整档位值；旧的固定 + 叠层部分记录合并。
  "agents/jane/mindscape/0/blk-ms34gorp-m9dlxw/eff-ms34gorp-xrbl8x": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.1, "3": 0.15, "4": 0.2, "5": 0.25, "6": 0.3 },
      },
    ],
    damageKindScope: {
      differenceId: "jane-anomaly-critical-kind-scope",
      expectedEncoding: {
        id: "eff-ms34gorp-xrbl8x",
        applyTarget: "self",
        applySituation: "global",
        elementFilter: ["物理"],
        kind: "fixed",
        stat: "anomalyCritDmg",
        value: 10,
        maxStacks: 1,
        valuePerStack: 0,
        defaultStacks: 1,
        appliesToAnomaly: true,
      },
      expectedDamageKinds: broadAnomalyCriticalKinds,
      correctedDamageKinds: ["anomaly"],
      expectedSourceBlockNote: janePotentialAnomalyCriticalBlockNote,
    },
    evidence: janePotentialEvidence,
    verification:
      "Nanoka potentialDetail 126101—126105（level 2—6）明确：简触发[强击]时，该次[强击]的暴击伤害额外提升 10/15/20/25/30%。上游把固定 +10% 与 +5%/层、最多 4 层拆成两条独立记录，总和 10—30% 与档位值一致；本条改为完整档位值，maximumLayers 归一为 1，自潜能 2 起可用。",
  },
  "agents/jane/mindscape/0/blk-ms34gorp-m9dlxw/eff-ms34hzuh-214aho": {
    kind: "merged-partial-record",
    mergedIntoOptionId:
      "agents:jane:mindscape:0:blk-ms34gorp-m9dlxw:eff-ms34gorp-xrbl8x",
    levels: [2, 3, 4, 5, 6],
    evidence: janePotentialEvidence,
    verification:
      "同一潜能状态下“固定 +10%”与“+5%/层、最多 4 层”是固定与升级部分，总和已被完整档位值 10/15/20/25/30% 取代；本记录不再独立可选，防止重复相加。",
  },
  // 零号安比：电脉冲的完整档位值取代 25% 基础 + 两条部分增量记录。
  "agents/s0anby/mindscape/0/blk-ms4jqdq1-rkmmm3/eff-ms4jqsm1-qkfx1a": {
    kind: "potential-level",
    minimumPotential: 0,
    levels: [0, 1, 2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
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
    ],
    evidence: s0anbyPotentialEvidence,
    verification:
      "Nanoka potentialDetail 138101—138105（level 2—6）明确：[额外能力：电极化]中，全队角色[追加攻击]对拥有[银星]标记的敌人造成的伤害提升效果提升至 34/38/42/46/50%；潜能 0—1 保持基础 25%。本条采用对已有 25% 记录的完整档位修改，而不是 25% 与增量叠加；上游 +9% 与 +4%/层、最多 4 层两条部分记录迁移至此。额外能力队伍条件与[银星]状态由调用方显式断言。",
  },
  "agents/s0anby/mindscape/0/blk-ms4jrci5-unykui/eff-ms4jrci5-nxk6sq": {
    kind: "merged-partial-record",
    mergedIntoOptionId:
      "agents:s0anby:mindscape:0:blk-ms4jqdq1-rkmmm3:eff-ms4jqsm1-qkfx1a",
    levels: [2, 3, 4, 5, 6],
    evidence: s0anbyPotentialEvidence,
    verification:
      "潜能的 +9% 增量已被完整档位值 34/38/42/46/50% 包含；本记录不再独立可选，防止与完整值重复相加。",
  },
  "agents/s0anby/mindscape/0/blk-ms4jrci5-unykui/eff-ms4jtmex-gz9fiw": {
    kind: "merged-partial-record",
    mergedIntoOptionId:
      "agents:s0anby:mindscape:0:blk-ms4jqdq1-rkmmm3:eff-ms4jqsm1-qkfx1a",
    levels: [2, 3, 4, 5, 6],
    evidence: s0anbyPotentialEvidence,
    verification:
      "潜能的 +4%/层、最多 4 层增量已被完整档位值包含；本记录不再独立可选，防止与完整值重复相加。",
  },
  "agents/s0anby/mindscape/0/blk-legacy/eff-ms4jp2fs-cmvkjd": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: s0anbyBranchEvidence,
    verification:
      "Nanoka 潜能分支（1381508—1381514 desc/0）明确：[银星]的[追加攻击]暴击伤害提升效果额外提升零号·安比暴击伤害的 5%；普通分支（1381507 desc/0）没有该增量。补充潜能门槛 1—6；[银星]状态与额外能力仍由调用方显式断言，不自动推断队伍条件。",
  },
  // 莱卡恩：其他元素 30% 增伤属于潜能分支新增；25% 冰抗在两条分支都存在。
  "agents/lycaon/mindscape/0/blk-legacy/legacy-team-dmgBonus": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: lycaonPotentialBranchEvidence,
    verification:
      "Nanoka 潜能分支（1141508—1141514）明确：[强化特殊技：狂猎时刻]、[支援突击：复仇反扑]或[支援突击：复仇反扑·冰舞]命中敌人时，目标的冰属性伤害抗性降低 25%、受到的其他属性伤害提升 30%。30% 其他元素贡献是潜能 1 起的新增效果（普通分支 1141507 只有 25% 冰抗），只对该记录补充潜能门槛；25% 冰抗记录在两条分支都存在，保持所有潜能可用。该贡献在来源与 Fairy 均位于 damage-bonus 通道，保留现状，不在本 PR 改写为抗性修复。",
  },
  // 伊芙琳：核心被动 125% 倍率只描述具名连携与两个终结技；影画 6 的
  // [月辉丝·弦]独立追击目标明确排除，普通连携/终结命中保持原行为。
  "agents/evelyn/mindscape/0/blk-ms4j94x5-1mflp4/eff-ms4j9nhd-9ya68m": {
    kind: "exclude-skill-target-scope",
    excludedTargetId: "evelyn-lunalux-garrote",
    dependentSupplementIds: [
      "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
    ],
    expectedStat: "directDmgMultFactor",
    expectedValue: 25,
    expectedScope: "skill",
    expectedSkillTargets: [
      { category: "chain", subcategoryId: null },
      { category: "ultimate", subcategoryId: null },
    ],
    expectedSourceBlockNote:
      "队伍中存在[击破]角色或[支援]角色时触发：\n伊芙琳的[连携技]和[终结技]造成的伤害提升30%；当伊芙琳的暴击率大于等于80%时，[连携技：月辉丝·绊]、[终结技：月辉丝·弦音]和[终结技：月辉丝·弦影]的伤害倍率提升至原本的125%。",
    differenceId: "evelyn-lunalux-multiplier-scope",
    evidence: [
      {
        path: "agents/1321/details.zh.json",
        pointer: "/talent/6/desc",
        sha256:
          "354cc0d37fb54146154670fcf729f8c0ab66495602d730b00241b093cc78365b",
      },
    ],
    verification:
      "Nanoka 核心被动七行（/passive/level/1321501—1321507/desc/1，中英文逐档同文核对）明确：暴击率大于等于 80% 时，伤害倍率提升至原本的 125% 只作用于[连携技：月辉丝·绊]、[终结技：月辉丝·弦音]和[终结技：月辉丝·弦影]三个具名技能；影画 6 的[月辉丝·弦]（/talent/6/desc）是独立的追击释放，不在该具名列表中。固定来源把 125% 编为整个连携/终结大类的 base-multiplier-increase，新增的[月辉丝·弦]独立目标（category chain）会被同一大类条件命中，3.75 倍率被错误放大到 4.6875。按具名语义修正：保留原稳定 effectId、数值与 chain/ultimate 大类条件，仅追加对 evelyn-lunalux-garrote 目标的排除——携带该目标的命中不吃本倍率，普通连携/终结命中保持 25% 不变；同块的一般连携/终结增伤（skillDmgBonus +30%）不受影响，仍作用于[月辉丝·弦]；影画 4 的显式护盾暴伤（/talent/4/desc 中英文已核对）按既有规则不变，取得护盾的连携/终结触发条件不是暴伤受益限制。防漂移完整守卫：完整 skillTargets 元组（category 与 subcategoryId）与核心块冻结完整 note（raw/normalized 双份）逐字核对，上游把原块或记录改名、移除、normalized 删除降级、子类身份漂移或 note 追加/替换/缺失都拒绝生成并要求重新核对；依赖的影画 6 补充参与转换时其登记来源记录的完整身份必须仍存在。排除范围只针对这一个新独立目标与本规则的共存，不重构技能大类条件，也不扩及其他待证事项。",
  },
  // 艾莲：核心被动 100% 暴伤的受益范围扩展属于潜能分支。
  "agents/ellen/mindscape/0/blk-legacy/legacy-self-critDmg": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: ellenBranchEvidence,
    verification:
      "Nanoka 潜能分支（1191508—1191514）明确：核心被动的 100% 暴伤对[连携技]、[终结技]、[普通攻击：霜锋]和[普通攻击：冰刃浪]同样生效；普通分支（1191507）只作用于[冲刺攻击：冰渊潜袭]蓄力剪击与[普通攻击：急冻修剪法]。上游记录的受益范围是潜能分支范围，补充潜能门槛 1—6；普通分支由补充变体单独登记，二者互斥。核心等级 7 证据不变。",
  },
  // 艾莲：极冰带按潜能等级取每层暴伤与满层冰抗无视。
  "agents/ellen/mindscape/0/blk-ms4fuyir-dotq6c/eff-ms4fuyir-e3fuww": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    maximumLayers: 10,
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.016, "3": 0.024, "4": 0.032, "5": 0.04, "6": 0.048 },
      },
    ],
    evidence: ellenPotentialEvidence,
    verification:
      "Nanoka potentialDetail 119101—119105（level 2—6）明确：艾莲[额外能力：风暴潮]每层暴击伤害提升 1.6/2.4/3.2/4/4.8%。真实层数上限 10 由调用方显式提供，不把培养等级或默认满层当作层数；潜能配置不强制把该叠层效果归一为 1 层。",
  },
  "agents/ellen/mindscape/0/blk-ms4fuyir-dotq6c/eff-ms4fvlsz-x4x1hj": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.033, "3": 0.05, "4": 0.067, "5": 0.083, "6": 0.1 },
      },
    ],
    evidence: ellenPotentialEvidence,
    verification:
      "Nanoka potentialDetail 119101—119105（level 2—6）明确：叠加至 10 层时攻击目标无视 3.3/5/6.7/8.3/10% 冰属性伤害抗性。阈值事实“已达到 10 层”由调用方在选中该选项时显式断言；本规则不从激活层数推断阈值。",
  },
  // 悠真：核心被动暴率与锋芒暴伤的作用范围扩展属于潜能分支。
  "agents/harumasa/mindscape/0/blk-legacy/legacy-self-critRate": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: harumasaBranchEvidence,
    verification:
      "Nanoka 潜能分支（1201508—1201514）明确：[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]的暴击率提升 25%；普通分支（1201507）只列[冲刺攻击：飞弦·斩]。上游记录的受益范围是潜能分支范围，补充潜能门槛 1—6；普通分支由补充变体单独登记，二者互斥。核心等级 7 证据不变。",
  },
  "agents/harumasa/mindscape/0/blk-legacy/eff-ms4gx7ds-ijkzuy": {
    kind: "potential-branch",
    minimumPotential: 1,
    evidence: harumasaBranchEvidence,
    verification:
      "Nanoka 潜能分支（1201508—1201514）明确：每层[锋芒]使[冲刺攻击：飞弦·斩]、[逐雷]和[终结技]暴击伤害提升 12%；普通分支（1201507）只列[冲刺攻击：飞弦·斩]。补充潜能门槛 1—6 与真实[锋芒]层数上限 6 分离；普通分支由补充变体单独登记，二者互斥。",
  },
  "agents/harumasa/mindscape/0/blk-ms4gyswd-hl5ii6/eff-ms4gyswd-zyloo3": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.04, "3": 0.06, "4": 0.08, "5": 0.1, "6": 0.12 },
      },
    ],
    evidence: harumasaPotentialEvidence,
    verification:
      "Nanoka potentialDetail 120101—120105（level 2—6）明确：发动[强化特殊技]、[连携技]或[终结技]时攻击力提升 4/6/8/10/12%，持续 12 秒。上游建模为 +2%/层、最多 6 层；本条改为完整档位值并把层数归一为 1，12 秒激活状态由调用方显式断言，不计算时间。",
  },
  "agents/harumasa/mindscape/0/blk-ms4gyswd-hl5ii6/eff-ms4h0385-xlwhvy": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.05, "3": 0.075, "4": 0.1, "5": 0.125, "6": 0.15 },
      },
    ],
    evidence: harumasaPotentialEvidence,
    verification:
      "Nanoka potentialDetail 120101—120105（level 2—6）明确：[冲刺攻击：飞弦·斩]和[逐雷]无视目标 5/7.5/10/12.5/15% 电属性伤害抗性，持续 12 秒。上游建模为 +2.5%/层、最多 6 层；本条改为完整档位值并把层数归一为 1，受益招式范围保持来源的飞弦斩/逐雷目标，12 秒状态由调用方显式断言。",
  },
  // 柏妮思：沸点派对按潜能等级取初始能量自动回复的换算率。
  "agents/burnice/mindscape/0/blk-ms4njqvi-f55a5p/eff-ms4njqvi-e0gd6d": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "rate",
        unit: "multiplier",
        values: { "2": 10, "3": 13, "4": 16, "5": 20, "6": 25 },
      },
    ],
    evidence: burnicePotentialEvidence,
    verification:
      "Nanoka potentialDetail 117101—117105（level 2—6）明确：初始能量自动回复大于等于 1.8 时，超过的部分每 0.1 点使异常掌控额外提升 1/1.3/1.6/2/2.5 点、最多 25 点。换算为每 1 点能量自动回复的 rate：10/13/16/20/25；阈值 1.8 与上限 25 保持来源连续转换公式，不模拟 1.35 秒触发周期。",
  },
  "agents/burnice/mindscape/0/blk-ms4njqvi-f55a5p/eff-ms4nnnk0-1esj6u": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "rate",
        unit: "multiplier",
        values: { "2": 0.1, "3": 0.125, "4": 0.15, "5": 0.175, "6": 0.2 },
      },
    ],
    evidence: burnicePotentialEvidence,
    verification:
      "Nanoka potentialDetail 117101—117105（level 2—6）明确：同一条目每 0.1 点超出初始能量自动回复使造成的伤害提升 1/1.25/1.5/1.75/2%、最多 20%。换算为每 1 点能量自动回复的 rate：0.1/0.125/0.15/0.175/0.2；阈值与 20% 上限保持来源公式，与异常掌控使用同一读取值、各自封顶。",
  },
  // 格莉丝：电能强化的完整档位值取代 +5%/层的叠层模型。
  "agents/grace/mindscape/0/blk-ms4o8tep-z28y9w/eff-ms4o8tep-htm584": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "amount",
        unit: "ratio",
        values: { "2": 0.1, "3": 0.15, "4": 0.2, "5": 0.25, "6": 0.3 },
      },
    ],
    evidence: gracePotentialEvidence,
    verification:
      "Nanoka potentialDetail 118101—118105（level 2—6）明确：消耗[电能]获得的[电能强化]状态使造成的电属性伤害提升 10/15/20/25/30%、持续 25 秒。上游建模为 +5%/层、最多 6 层；本条改为完整档位值并把层数归一为 1，激活状态与持续时间由调用方显式断言。潜能的额外能力队伍条件增加“其他[异常]角色”，仍按显式选择契约由调用方断言，不自动推断。",
  },
  // 丽娜：完美侍奉按潜能等级取核心转化的读取率。
  "agents/alexandrina/mindscape/0/blk-ms4719qz-139572/eff-ms4719qz-a5ce2o": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "rate",
        unit: "multiplier",
        values: { "2": 300, "3": 420, "4": 550, "5": 670, "6": 800 },
      },
    ],
    evidence: alexandrinaPotentialEvidence,
    verification:
      "Nanoka potentialDetail 121101—121105（level 2—6）明确：核心被动增益存在期间，基于丽娜自身穿透率每 1% 提升全队攻击力 3/4.2/5.5/6.7/8 点、至多 576 点。rate 按每 1 点穿透率（=1%）换算为 300/420/550/670/800；读取值仍来自持有者显式输入，封顶 576 保持。",
  },
  "agents/alexandrina/mindscape/0/blk-ms4719qz-139572/eff-ms478uay-hcl0vd": {
    kind: "potential-level",
    minimumPotential: 2,
    levels: [2, 3, 4, 5, 6],
    parameters: [
      {
        name: "rate",
        unit: "multiplier",
        values: { "2": 250, "3": 350, "4": 450, "5": 550, "6": 650 },
      },
    ],
    evidence: alexandrinaPotentialEvidence,
    verification:
      "Nanoka potentialDetail 121101—121105（level 2—6）明确：同一激活条件基于丽娜自身穿透率每 1% 提升全队防御力 2.5/3.5/4.5/5.5/6.5 点、至多 468 点。rate 换算为 250/350/450/550/650；与攻击转化分别登记、各自封顶，不合并为一个完整选项。",
  },
  // 克拉蕾：核心被动暴击率加成按核心 1—7 逐档取值（15/17.5/20/22.5/25/27.5/30%）。
  "agents/claret/mindscape/0/blk-mtrf598z-wr4jqt/eff-mtrf598z-80y7hh": {
    kind: "core-skill-level",
    baseEvidenceKey:
      "claret:blk-mtrf598z-wr4jqt:mindscape:0:eff-mtrf598z-80y7hh",
    formula: { kind: "amount" },
    evidence: claretCorePassiveEvidence,
    verification:
      "Nanoka 3.2 核心被动 1611501—1611507 逐行确认：克拉蕾处于[猩红铭刻]，或是在发动[连携技]、[终结技]、[反制支援]、[支援突击]期间，暴击率提升 15/17.5/20/22.5/25/27.5/30%。固定来源只记录核心 7 的 30%；转换器按逐档参数表展开，状态条件由调用方显式选择断言。",
  },
  // 克拉蕾：额外能力[残锋]锐暴提升的 applyTarget 与说明文字差异。
  "agents/claret/mindscape/0/blk-mtrgmqhd-srsnon/eff-mtrgmqhd-jgzfvq": {
    kind: "named-source-discrepancy",
    differenceId: "claret-remnant-edge-self-target",
    evidence: claretAdditionalAbilityEvidence,
    verification:
      "Nanoka 3.2 额外能力逐行确认：克拉蕾或队友触发[毁伤]时，全队[锋御]代理人进入[残锋]，[残锋]状态下锐暴伤害提升 25%、持续 40 秒。固定来源记录 applyTarget=self；Fairy 遵循来源字段仅对持有者生效，不凭说明文字无证据扩大为全队，选择该选项表示持有者处于[残锋]。全队语义留待取得适用范围证据后另行处理。",
  },
  // 克拉蕾：影画一的"伤害倍率提升至原本的130%"被固定来源记为 skillDmgBonus
  // +30；按中英文原文纠正为倍率乘区，数值与作用范围不变。
  "agents/claret/mindscape/1/blk-mtrkovf7-dqmjh3/eff-mtse9xm8-q641yp": {
    kind: "source-stat-correction",
    correctedStat: "directDmgMultFactor",
    expectedProfession: "锋御",
    expectedEncoding: {
      stat: "skillDmgBonus",
      scope: "skill",
      kind: "fixed",
      value: 30,
      stackable: false,
      valuePerStack: 0,
      maxStacks: 1,
      applyTarget: "self",
      applySituation: "global",
      applyProfession: null,
      teamProfession: null,
      teamProfessionValues: null,
      teamProfessionMinCount: null,
      elementFilter: "all",
      skillCategory: "special",
      skillSubcategoryId: "claret-special-mtsecz30",
      skillTargets: [
        { category: "special", subcategoryId: "claret-special-mtsecz30" },
      ],
      appliesToAnomaly: null,
      convert: null,
      note: "",
    },
    expectedSourceBlockNote:
      "克拉蕾攻击命中敌人并造成锐暴时，残痕积蓄效率提升20%；克拉蕾触发[毁伤]造成的伤害倍率提升至原本的130%。",
    differenceId: "claret-mindscape1-multiplier-encoding",
    evidence: claretTalentEvidence(1),
    verification:
      "Nanoka 3.2 影画一（agents/1611/details.zh.json 与 details.en.json 的 /talent/1/desc）中英文同文：克拉蕾触发[毁伤]造成的伤害倍率提升至原本的 130%（The DMG Multiplier of Maim triggered by Claret increases to 130% of its original value.）。固定来源 fac62407 把该条款记为毁伤专项目标（claret-special-mtsecz30）上的 skillDmgBonus +30，即通用增伤区的加数，与该来源对同句式条款的编码口径不一致（伊芙琳核心被动记 directDmgMultFactor 25、耀嘉音影画 6 记 directDmgMultFactor 100，均进入倍率修正区）。Fairy 按中英文原文把该记录编译为既有倍率乘区 base-multiplier-increase +0.30（目录伤害项乘以 1 + 0.3 = 1.3）：数值、培养门槛、作用对象、直伤范围与毁伤专项目标全部保持，只把增伤加数改为倍率乘区。原始 stat、原值与固定源 Pointer 保留在覆盖报告。证据级别为按一致描述纠错，未经游戏实测；取得相反游戏证据时先登记来源再调整。",
  },
  "w-engines/Scarlet-Craving/refinement/1/blk-mtsemp5m-ywlze6/eff-mtsemp5m-q1jh4f":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(1),
      verification:
        "Nanoka 3.2 精炼 1 原文确认：装备者电属性伤害提升（数值见来源记录）。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，非电属性命中不适用。",
    },
  "w-engines/Scarlet-Craving/refinement/1/blk-mtsenpok-3njiz7/eff-mtsenpok-prx4yj":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(1),
      verification:
        "Nanoka 3.2 精炼 1 原文确认：发动[强化特殊技]或触发[毁伤]时，造成的电属性锐化伤害提升（数值见来源记录），持续 40 秒。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，锐化增伤通道本身只在锐化伤害命中适用，触发条件由调用方显式选择断言。",
    },
  "w-engines/Scarlet-Craving/refinement/2/blk-mtsemp5m-ywlze6/eff-mtsemp5m-q1jh4f":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(2),
      verification:
        "Nanoka 3.2 精炼 2 原文确认：装备者电属性伤害提升（数值见来源记录）。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，非电属性命中不适用。",
    },
  "w-engines/Scarlet-Craving/refinement/2/blk-mtsenpok-3njiz7/eff-mtsenpok-prx4yj":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(2),
      verification:
        "Nanoka 3.2 精炼 2 原文确认：发动[强化特殊技]或触发[毁伤]时，造成的电属性锐化伤害提升（数值见来源记录），持续 40 秒。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，锐化增伤通道本身只在锐化伤害命中适用，触发条件由调用方显式选择断言。",
    },
  "w-engines/Scarlet-Craving/refinement/3/blk-mtsemp5m-ywlze6/eff-mtsemp5m-q1jh4f":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(3),
      verification:
        "Nanoka 3.2 精炼 3 原文确认：装备者电属性伤害提升（数值见来源记录）。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，非电属性命中不适用。",
    },
  "w-engines/Scarlet-Craving/refinement/3/blk-mtsenpok-3njiz7/eff-mtsenpok-prx4yj":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(3),
      verification:
        "Nanoka 3.2 精炼 3 原文确认：发动[强化特殊技]或触发[毁伤]时，造成的电属性锐化伤害提升（数值见来源记录），持续 40 秒。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，锐化增伤通道本身只在锐化伤害命中适用，触发条件由调用方显式选择断言。",
    },
  "w-engines/Scarlet-Craving/refinement/4/blk-mtsemp5m-ywlze6/eff-mtsemp5m-q1jh4f":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(4),
      verification:
        "Nanoka 3.2 精炼 4 原文确认：装备者电属性伤害提升（数值见来源记录）。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，非电属性命中不适用。",
    },
  "w-engines/Scarlet-Craving/refinement/4/blk-mtsenpok-3njiz7/eff-mtsenpok-prx4yj":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(4),
      verification:
        "Nanoka 3.2 精炼 4 原文确认：发动[强化特殊技]或触发[毁伤]时，造成的电属性锐化伤害提升（数值见来源记录），持续 40 秒。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，锐化增伤通道本身只在锐化伤害命中适用，触发条件由调用方显式选择断言。",
    },
  "w-engines/Scarlet-Craving/refinement/5/blk-mtsemp5m-ywlze6/eff-mtsemp5m-q1jh4f":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(5),
      verification:
        "Nanoka 3.2 精炼 5 原文确认：装备者电属性伤害提升（数值见来源记录）。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，非电属性命中不适用。",
    },
  "w-engines/Scarlet-Craving/refinement/5/blk-mtsenpok-3njiz7/eff-mtsenpok-prx4yj":
    {
      kind: "explicit-element-scope",
      element: "electric",
      differenceId: "scarlet-craving-explicit-element",
      evidence: scarletCravingEvidence(5),
      verification:
        "Nanoka 3.2 精炼 5 原文确认：发动[强化特殊技]或触发[毁伤]时，造成的电属性锐化伤害提升（数值见来源记录），持续 40 秒。固定来源 elementFilter=all 未编码电属性限制；Fairy 补显式电元素条件，锐化增伤通道本身只在锐化伤害命中适用，触发条件由调用方显式选择断言。",
    },
  // 蕾米埃尔影画 2 的[异常]角色忽防：来源记录 scope general、applyProfession
  // 为空、appliesToAnomaly true，只表示允许异常而非限定职业或伤害类别。
  // 3.3.12 来源省略 scope 但保留 skillTargets，固定转换会把影画 4 的
  // “触发[耀变]时伤害倍率额外提升 12%”误收窄为普通攻击命中。Nanoka
  // 天赋 4 原文只限定[耀变]效果，不限定招式类别；按触发条件纠错移除
  // skillTargets 派生的技能标签条件，保留 luminize 伤害种类。
  "agents/remiel/mindscape/4/blk-ms7tnn2n-4zw15u/eff-ms7tnn2n-mz69ez": {
    kind: "trigger-conditions-not-benefit-scope",
    removeElementCondition: false,
    removeSkillTargetConditions: true,
    expectedElementFilter: "all",
    expectedSkillTargetCategories: ["basic"],
    differenceId: "remielle-mindscape4-luminize-scope",
    evidence: remielleMindscape4Evidence,
    verification:
      "Nanoka 3.3.12 天赋 4（agents/1581/details.zh.json 的 /talent/4/desc）确认：“蕾米埃尔触发[耀变]效果时，伤害倍率额外提升12%”。固定来源 2628b32 的同一效果省略 scope，但仍携带 skillCategory/skillTargets=basic；Fairy 的省略 scope 兼容规则据此派生普通攻击标签，导致耀变命中被错误排除。本登记只移除这个由 skillTargets 派生的受益筛选，保留 luminize 伤害种类与影画 4 配置门槛；来源目标类别或元素筛选漂移即拒绝生成。",
  },
  "agents/remiel/mindscape/2/blk-ms7tkhei-q0ipfu/eff-ms7tlurw-vhelyf": {
    kind: "attribute-anomaly-beneficiary-scope",
    profession: "异常",
    damageKinds: [
      "anomaly",
      "anomaly-settlement",
      "vortex",
      "luminize",
      "disorder",
    ],
    differenceId: "remielle-mindscape2-attribute-anomaly-scope",
    evidence: remielleMindscape2Evidence,
    verification:
      "块 note 与 Nanoka 天赋 2 同文：“队伍中[异常]角色对[幻色]效果下的敌人造成属性异常伤害时，无视目标15%的防御力”。上游记录未编码受益职业（applyProfession null）与伤害类别（scope general、appliesToAnomaly 仅表示允许异常），effectMatchesContext 对 general 直接放行且职业门槛只在 applyProfession 非空时执行，因此显式选中后普通直伤与非异常职业都会受益。身份映射沿用固定来源的真实调用链：resolvedHit.ts 的 ResolvedHit 以 ownerAgentId 表示流程归属（“异常类只用于伤害归属，减防/无视取 triggerAgentId”）、anomalyPowerAgentId 表示异常强度提供者、triggerAgentId 表示异常类触发者；optimalAffixAlloc.ts 由 hit.triggerAgentId 取得触发者最终面板（anomalyTriggerPanel），元素取强度提供者；damageCalc.ts 的防御区从 anomalyTriggerPanel 读取 ignoreDefense/reduceDefense，穿透率与穿透值取强度提供者面板（anomalyBasePanel = triggerFinalPanel）。因此 Fairy 的 hit.actorId 对应本次结算触发者（职业门槛与减防读取对象），damage.anomalySource（可带 snapshotId）对应强度提供者；不是增益提供者，也不是另一角色的职业证据。[幻色]与消失后 8 秒仍由调用方显式选择表示条件有效。伤害类别采用固定计算链的异常类范围：damageCalc.ts 的 useTriggerBase 同时覆盖属性异常、异放、紊乱、乱流与耀变（skillNeedsDualAgents 对 mapEventKindToCalc 的 damageKind === 'anomaly' 全类成立），攻略 3.4.1 亦说明“[紊乱]应被视为一种属性异常效果”；本条因此把 disorder 与普通异常、异放、乱流、耀变一并纳入，不套用 anomalyDmgBonus/anomalyCritRate 等增伤或暴击通道的适用拆分（那是各自乘区的映射），也不以文本未列明[紊乱]自造排除。该范围是沿用固定计算链的静态约定，不是游戏实测结论；普通直伤（regular/sheer/sharpen）仍排除。",
  },
  // 青溟笼舍（14137）精炼 1—5 的以太贯穿增伤：块 note 与 Nanoka 同文把该条款
  // 写在“每层[青溟同行]”之下（最多 2 层），固定来源却把它编码为固定单次。
  // 增益修复批次 01 的具名登记（C01/C05/C07/C08/C10/C11/T01）。
  ...wengineCorrectionRegistrations(),
  // 增益修复批次 03 的具名登记（C02 比利影画 4、C13 流光咏叹四件套）。
  "agents/billy/mindscape/4/blk-ms4ebxf4-o288xu/eff-ms4ebxf4-pk138x": {
    kind: "hit-scope-direct-stat-input",
    stat: "criticalRate",
    inputDescription:
      "manual ratio，本次[强化特殊技]命中按自身与目标距离获得的暴击率提升（0—0.32，距离越近越显著）；由调用方按实际距离显式输入，不使用默认值，不推导距离函数，越界读数按表达式钳制",
    minimum: 0,
    maximum: 0.32,
    maximumLayers: 1,
    expectedEncoding: {
      scope: "skill",
      applyTarget: "self",
      applySituation: "global",
      skillCategory: "special",
      skillSubcategoryId: "all-special-ms0fcqv7",
      skillTargets: [
        { category: "special", subcategoryId: "all-special-ms0fcqv7" },
      ],
      elementFilter: "all",
      kind: "stacked",
      stat: "skillDmgBonus",
      value: 0,
      stackable: false,
      maxStacks: 32,
      valuePerStack: 1,
      defaultStacks: 32,
    },
    differenceId: "billy-mindscape4-hit-scope-critical-rate",
    evidence: [
      {
        path: "agents/1081/details.zh.json",
        pointer: "/talent/4/desc",
        sha256:
          "57f7f4ce660541b55483f4decb5235df904df7498a62c2fe64de56fe9c62f7bc",
      },
    ],
    verification:
      "块 note 与 Nanoka 影画 4（agents/1081/details.zh.json 的 /talent/4/desc）同文：[强化特殊技]命中敌人时，招式的暴击率随自身与目标距离提升、距离越近越显著、最高 32%。固定来源把该条款编码为 stacked skillDmgBonus（32 层 × 1%、defaultStacks 32），既不是伤害加成、也不能用层数表达连续距离。修正为 hit 作用域 criticalRate direct：数值由调用方显式输入（比例 0—0.32，表达式钳制），激活层数上限 1，废除来源层数编码；旧层数用法（如 layers 32）按目录层数上限拒绝并由具名差异说明迁移。受益范围保持来源编码的强化特殊技目标（all-special-ms0fcqv7）与直伤种类，仅比利本人命中获得，普通特殊技、普攻与其他角色不受益，不改全局面板暴击率。",
  },

  // 莱特（1161）[昂扬]：基础记录改写为一条完整状态贡献（含冲击力转化与
  // 总上限），影画 2 的 120% 由配置修改直接作用于同一条贡献；被取代的
  // 三条记录只保留迁移入口，不再生成可执行贡献。
  "agents/lighter/mindscape/0/blk-ms4aoho0-grnxav/eff-ms4aoho0-q3wbdv": {
    kind: "complete-state-elation",
    role: "base",
    maximumLayers: 20,
    perLayerGain: 0.0125,
    perPointGain: 0.00025,
    threshold: 170,
    maximum: 0.75,
    impactInputName:
      "agent:1161:zzz-hp:eff-ms4atnfh-29yr0r:blk-ms4aoho0-grnxav:mindscape:0:source",
    layerCountInputName:
      "agent:1161:zzz-hp:eff-ms4aoho0-q3wbdv:blk-ms4aoho0-grnxav:mindscape:0:layers",
    additionalHitElements: ["frost"],
    expectedEncoding: lighterBaseEncoding(0),
    expectedBlockNoteIncludes: lighterElationBaseBlockNoteIncludes,
    differenceId: "complete-state-elation-correction",
    evidence: [...lighterElationEvidence, ...lighterElationFrostEvidence],
    verification: lighterElationCompleteStateVerification,
  },
  "agents/lighter/mindscape/0/blk-ms4aoho0-grnxav/eff-ms4atnfh-29yr0r": {
    kind: "complete-state-elation",
    role: "replaced",
    maximumLayers: 20,
    expectedEncoding: lighterConversionEncoding(0, 50),
    expectedBlockNoteIncludes: lighterElationBaseBlockNoteIncludes,
    differenceId: "complete-state-elation-correction",
    evidence: lighterElationEvidence,
    verification: lighterElationConversionReplacedVerification,
  },
  "agents/lighter/mindscape/2/blk-legacy/eff-ms4b0whf-x6n1xw": {
    kind: "complete-state-elation",
    role: "replaced",
    maximumLayers: 20,
    expectedEncoding: lighterBaseEncoding(2),
    expectedBlockNoteIncludes: lighterElationMindscape2BlockNoteIncludes,
    differenceId: "complete-state-elation-correction",
    evidence: lighterElationMindscape2Evidence,
    verification: lighterElationM2DuplicatesReplacedVerification,
  },
  "agents/lighter/mindscape/2/blk-legacy/eff-ms4b2g6y-2q6n1w": {
    kind: "complete-state-elation",
    role: "replaced",
    maximumLayers: 20,
    expectedEncoding: lighterConversionEncoding(2, 10),
    expectedBlockNoteIncludes: lighterElationMindscape2BlockNoteIncludes,
    differenceId: "complete-state-elation-correction",
    evidence: lighterElationMindscape2Evidence,
    verification: lighterElationM2DuplicatesReplacedVerification,
  },

  // —— 增益修复批次 14：星见雅（miyabi）两条冰元素过滤的烈霜结算修正 ——
  // 证据：agents/1091 的 /specialElementType/desc 中英文同文（烈霜属性基于
  // 冰属性结算伤害与增益）+ 正式动作目录（星见雅元素伤害行全部
  // physical/frost，无 ice）；红测复现见批次 14 作者记录。仅这两条完整身份
  // 修正，保留 ice 并显式加入 frost；不改全局元素归并、不扫描修全角色。
  "agents/miyabi/mindscape/0/blk-legacy/legacy-self-dmgBonus": {
    kind: "settlement-element-scope",
    additionalElement: "frost",
    expectedEncoding: miyabiUltimateDamageBonusEncoding,
    expectedSourceBlockNote: miyabiUltimateBlockNote,
    differenceId: "miyabi-frost-settlement-element-scope",
    evidence: miyabiFrostSettlementEvidence,
    verification:
      "固定源 /agents/22/mindscapeBuffs/0/effectBlocks/0（终结技：名残雪）的块 note 与记录把条款编为自身造成的冰属性伤害提升 30%（elementFilter=[冰]）。星见雅的烈霜属性按冰属性结算伤害与增益效果（Nanoka agents/1091/details.zh.json 与 details.en.json 的 /specialElementType/desc 中英文同文），其正式动作目录的全部元素伤害行使用命中枚举 frost（霜月 0011—0013、风花后三段 0008—0010、连携 0014、终结 0015、闪反 0017、特殊/强化特殊 0018—0020 与快速/支援 0001/0005 共 14 行；其余为 physical 3 行与招架 daze-only 3 行），没有任何 ice 命中行：该条款在真实 frost 命中上零贡献（批次 14 红测复现）。Fairy 按本登记在该具名完整身份的命中元素条件里保留 ice 并显式加入 frost，数值、通道、其余条件与稳定 ID 不变；额外能力的霜月 +60% 增伤记录（eff-ms4msho4-rjt6sj，elementFilter=all）不在登记内。防漂移：raw 与 normalized 两份记录编码（含 elementFilter）与所属块冻结完整 note 逐字核对，先于通用 unsupported 降级拒绝；未来偏移的记录不再静默纠正。证据级别为同文结算分支映射与正式动作目录枚举，未经游戏实测。",
  },
  "agents/miyabi/mindscape/0/blk-ms4msho4-fuuot6/eff-ms4mu14z-vj4c3r": {
    kind: "settlement-element-scope",
    additionalElement: "frost",
    expectedEncoding: miyabiShimotsukiResPenEncoding,
    expectedSourceBlockNote: miyabiAdditionalAbilityBlockNote,
    differenceId: "miyabi-frost-settlement-element-scope",
    evidence: miyabiFrostSettlementEvidence,
    verification:
      "固定源 /agents/22/mindscapeBuffs/0/effectBlocks/1（额外能力：同沐霜雪）的 resPen 记录把「[普通攻击：霜月]将无视目标30%冰属性伤害抗性」编为 basic+霜月（miyabi-basic-ms4mtpk5）目标上的 elementFilter=[冰]。星见雅的烈霜按冰属性结算伤害与增益（agents/1091 /specialElementType/desc 中英文同文），真实霜月动作（0011—0013）的命中枚举是 frost：该 30% 冰抗忽视在霜月 frost 命中上零贡献（批次 14 红测复现）。Fairy 按本登记只扩命中元素：保留 ice 并显式加入 frost，basic+霜月精确目标、数值、通道与稳定 ID 全部保持，不泄漏给霜灼·破独立事件（uncategorized 目标不匹配本条件）。同块的霜月 +60% 增伤记录（eff-ms4msho4-rjt6sj）没有元素过滤，不在登记内。防漂移：raw 与 normalized 两份记录编码（含完整 skillTargets 元组与 elementFilter）与所属块冻结完整 note 逐字核对，先于通用 unsupported 降级拒绝；未来偏移的记录不再静默纠正，也不以局部 ID 子串定位。证据级别为同文结算分支映射与正式动作目录枚举，未经游戏实测。",
  },
  // —— D4：菲欧妮异放暴击记录改走 anomaly-settlement 独立通道 ——
  ...Object.fromEntries(
    [
      "eff-0",
      "eff-1",
      "eff-2",
      "eff-3",
      "eff-7",
      "eff-8",
      "eff-14",
      "eff-15",
      "eff-17",
      "eff-18",
    ].map((effectId) => [
      `agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/${effectId}`,
      {
        kind: "supplemental-flat-source" as const,
        evidence: [
          d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note"),
        ],
        verification:
          "ZZZ-HP 2628b32 菲欧妮 rank0 核心块记录是固定值，不依赖核心等级参数；D4 按固定值编译，不伪造核心档位证据。",
      },
    ]),
  ),
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-6": {
    kind: "settlement-critical-channel",
    correctedStat: "anomalySettlementCritDmg",
    expectedRawStat: "anomalyReleaseCritDmg",
    expectedValue: 25,
    explanation:
      "3.2.5 记录 anomalyReleaseCritDmg 25 是[灼蚀]下异放暴伤；C1 的独立异放通道为 anomaly-settlement-critical-damage，D4 按该通道编译，使核心25%与M4额外40%同通道相加，而不是回退到通用异常暴伤。",
    evidence: [d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note")],
    verification:
      "ZZZ-HP 2628b32 菲欧妮 rank0 块 note 与记录逐条核对；本登记只覆盖该记录，fac62407 既有爱芮 anomalyRelease* 记录保持原映射。",
  },
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-13": {
    kind: "settlement-critical-channel",
    correctedStat: "anomalySettlementCritRate",
    expectedRawStat: "anomalyReleaseCritRate",
    expectedValue: 30,
    explanation:
      "3.2.5 记录 anomalyReleaseCritRate 30 是[灼蚀]下异放暴击率；D4 按 anomaly-settlement-critical-rate 独立通道编译。",
    evidence: [d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note")],
    verification:
      "ZZZ-HP 2628b32 菲欧妮 rank0 块 note 与记录逐条核对；本登记只覆盖该记录。",
  },
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-16": {
    kind: "settlement-critical-channel",
    correctedStat: "anomalySettlementCritRate",
    expectedRawStat: "anomalyReleaseCritRate",
    expectedValue: 0,
    explanation:
      "3.2.5 的异常掌控→异放暴击率转化记录同样走 anomaly-settlement-critical-rate；基础155、每点0.7%、封顶70，与核心普通异常转化分别登记。",
    evidence: [d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note")],
    verification:
      "ZZZ-HP 2628b32 菲欧妮 rank0 块 note 与记录逐条核对；转化参数保持来源原值。",
  },
  "agents/pheony/mindscape/1/blk-mindscapeBuffs-1-1/eff-19": {
    kind: "settlement-critical-channel",
    correctedStat: "anomalySettlementCritDmg",
    expectedRawStat: "anomalyReleaseCritDmg",
    expectedValue: 25,
    explanation:
      "影画1的异放暴伤+25同样走 anomaly-settlement-critical-damage 独立通道，与核心25、M4额外40同通道相加。",
    evidence: [d4Evidence("/agents/0/mindscapeBuffs/1/effectBlocks/0/note")],
    verification:
      "ZZZ-HP 2628b32 菲欧妮 rank1 块 note 与记录逐条核对；本登记只覆盖该记录。",
  },
  // —— 额外能力[黑枝王牌]：四条 15% 暴伤按具名同队资格执行 ——
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-4":
    pheonyAdditionalAbilitySemantics("eff-4", "anomalyCritDmg"),
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-10":
    pheonyAdditionalAbilitySemantics(
      "eff-10",
      "anomalyReleaseCritDmg",
      "anomalySettlementCritDmg",
    ),
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-11":
    pheonyAdditionalAbilitySemantics("eff-11", "turbulenceCritDmg"),
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-12":
    pheonyAdditionalAbilitySemantics("eff-12", "radianceCritDmg"),
  "agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-9": {
    kind: "declared-unsupported",
    reason: "semantic-conflict",
    explanation:
      "M4 的“该次[异放]效果触发暴击时，其暴击伤害额外提升40%”只属于 M4 触发的异放结算；固定记录是自身常驻 anomalyReleaseCritDmg +40。该位置继续保持 semantic-conflict 迁移入口，不生成常驻异放暴伤；M4 六元素独立结算选项的附加规则把同一 40% 只追加到本次 anomaly-settlement-critical-damage。",
    expectedEncoding: {
      stat: "anomalyReleaseCritDmg",
      value: 40,
      applyTarget: "self",
      elementFilter: "all",
      kind: "fixed",
    },
    evidence: [d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note")],
    verification:
      "ZZZ-HP 991bb0e 菲欧妮 rank0 块 note 的 M4 分句；常驻异放暴伤会错误作用于所有异放。PR-B2 只把该 40% 作为 six-element [异放]选项的附加规则，本位置保持 unsupported/semantic-conflict，不变成常驻贡献。",
  },
  "agents/pheony/mindscape/2/blk-mindscapeBuffs-2-1/eff-mvdz21so-s2au9j": {
    kind: "holder-anomaly-duration",
    requirement: PHEONY_M2_BURN_DURATION_REQUIREMENT,
    damageKinds: [...PHEONY_M2_BURN_DURATION_DAMAGE_KINDS],
    element: PHEONY_M2_BURN_DURATION_ELEMENT,
    expectedEncoding: PHEONY_M2_BURN_DURATION_EXPECTED_RAW_ENCODING,
    expectedSourceBlockNote: PHEONY_M2_BURN_DURATION_EXPECTED_BLOCK_NOTE,
    differenceId: PHEONY_M2_BURN_DURATION_DIFFERENCE_ID,
    evidence: [
      PHEONY_M2_BURN_DURATION_EVIDENCE.zh,
      PHEONY_M2_BURN_DURATION_EVIDENCE.en,
    ],
    verification:
      "Nanoka 3.3.12+19634983 的 agents/1641/details.zh.json 与 details.en.json /talent/2/desc 同文确认：菲欧妮对敌人施加[灼烧]效果时，该效果的持续时间提升2秒（英文：When Phoenix applies Burn to an enemy, its duration is increased by 2s.），施加者限定为菲欧妮本人。固定 ZZZ-HP 991bb0e 的 /agents/52/mindscapeBuffs/2/effectBlocks/0/effects/1 把同一句编成 anomalyDuration 2、elementFilter 火，却附加 conditions.damageTypes=turbulence 并以 applyTarget=team 放行全队。本登记保留原 Pointer、数值与公开 optionId/effectId，把记录改为具名 corrected：目录变体使用 independent-settlement 与 holder-anomaly-source 伤害项要求，binding.holderId、damage.anomalySource.entityId、damageItem.statSource.entityId 必须一致且快照身份相同；火属性原异常紊乱或燃烧 profile 的标准乱流读取既有 anomaly-duration-addition 的 +2 秒，非火原异常零贡献，队友施加的火异常或跨快照来源拒绝。团队目标只表示任何队友结算该灼烧时都能读取，不代表其他施加者也获得加成。M0/M1 拒绝，M2—M6 可用；+2 只计算一次，经过时间超过原时长时沿用 max(0,…) 钳制。",
  },
}

/** 菲欧妮影画记录的 stat：核心块与影画 1 的暴击/暴伤四通道。 */
const pheonyAbrasionStat = (rank: 0 | 1 | 2, effectId: string): string => {
  if (rank === 0) return pheonyCoreStat(effectId)
  if (rank === 2) return "dmgBonus"
  switch (effectId) {
    case "eff-5":
      return "anomalyCritDmg"
    case "eff-19":
      return "anomalyReleaseCritDmg"
    case "eff-20":
      return "turbulenceCritDmg"
    case "eff-21":
      return "radianceCritDmg"
    default:
      throw new Error(`Unexpected Pheony M1 effect ${effectId}`)
  }
}

const pheonyAbrasionValue = (rank: 0 | 1 | 2, effectId: string): number => {
  if (rank === 2) return 30
  if (rank === 0 && ["eff-3", "eff-16", "eff-17", "eff-18"].includes(effectId))
    return 0
  return ["eff-1", "eff-13", "eff-14", "eff-15"].includes(effectId) ? 30 : 25
}

/** 菲欧妮[灼蚀]三组记录的完整状态期望；记录级影画门槛由规则配置承担。 */
const pheonyAbrasionRecord = (
  rank: 0 | 1 | 2,
  effectId: string,
): CompleteStateSourceRecord => ({
  rankKind: "mindscape",
  rank,
  blockId:
    rank === 0
      ? "blk-mindscapeBuffs-0-1"
      : rank === 1
        ? "blk-mindscapeBuffs-1-1"
        : "blk-mindscapeBuffs-2-1",
  effectId,
  blockNoteIncludes:
    rank === 0
      ? "队伍中任意角色对敌人造成属性异常伤害时，会使其陷入[灼蚀]状态"
      : rank === 1
        ? "[灼蚀]状态下的敌人受到属性异常伤害的暴击伤害额外提升25%"
        : "菲欧妮对[灼蚀]状态下的敌人造成的伤害提升30%",
  expectation: {
    stat: pheonyAbrasionStat(rank, effectId),
    value: pheonyAbrasionValue(rank, effectId),
    scope: undefined,
    applyTarget: rank === 2 ? "self" : "team",
    applySituation: "global",
    applyProfession: null,
    teamProfession: null,
    teamProfessionValues: null,
    elementFilter: "all",
    kind:
      rank === 0 && ["eff-3", "eff-16", "eff-17", "eff-18"].includes(effectId)
        ? "convert"
        : "fixed",
    stackable: false,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    appliesToAnomaly: true,
    enabledDefault: true,
    note:
      rank === 0 && ["eff-3", "eff-16", "eff-17", "eff-18"].includes(effectId)
        ? "转模：读取属性=异常掌控 折算比例=0.7"
        : rank === 2
          ? ""
          : "目标默认：条件为敌人状态、未限定施放者",
  },
})

const pheonyAbrasionCoreRecords = [
  "eff-1",
  "eff-2",
  "eff-3",
  "eff-6",
  "eff-7",
  "eff-8",
  "eff-13",
  "eff-14",
  "eff-15",
  "eff-16",
  "eff-17",
  "eff-18",
].map((effectId) => pheonyAbrasionRecord(0, effectId))
const pheonyAbrasionM1Records = ["eff-5", "eff-19", "eff-20", "eff-21"].map(
  (effectId) => pheonyAbrasionRecord(1, effectId),
)
const pheonyAbrasionM2Records = [pheonyAbrasionRecord(2, "eff-6")]

/**
 * 蕾米埃尔影画 1 的完整状态登记：块 note 与 Nanoka 天赋 1 同文的后一个条款
 * 是“蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升
 * 10%”；固定来源把它记录为两条记录（team +10% 与自身 −10%），两条必须同时
 * 生效才表达“其他角色”。
 */
export const COMPLETE_STATE_OPTIONS: readonly CompleteStateOptionRegistration[] =
  [
    {
      optionId:
        "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage",
      catalogEntityId: "agents:remiel",
      name: "相变时流 · 其他角色属性异常伤害",
      conditionDescription:
        "蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%。",
      target: "team",
      minimumMindscape: 1,
      differenceId: "remielle-mindscape1-complete-anomaly-state",
      migrationExplanation:
        "[相变时流]状态由 team +10% 与自身 −10% 两条记录同时生效才表示“队伍中其他角色”；块 note 与 Nanoka 天赋 1 同文确认该状态只提升队伍中其他角色",
      records: [
        {
          rankKind: "mindscape",
          rank: 1,
          blockId: "blk-legacy",
          effectId: "eff-ms7tjecu-l3ocgm",
          blockNoteIncludes:
            "蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%",
          expectation: {
            stat: "anomalyDmgBonus",
            value: 10,
            scope: "general",
            applyTarget: "team",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            elementFilter: "all",
            kind: "fixed",
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            appliesToAnomaly: true,
            enabledDefault: true,
            note: "",
          },
        },
        {
          rankKind: "mindscape",
          rank: 1,
          blockId: "blk-legacy",
          effectId: "eff-ms7tjyzo-3v31wa",
          blockNoteIncludes:
            "蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%",
          expectation: {
            stat: "anomalyDmgBonus",
            value: -10,
            scope: "general",
            applyTarget: "self",
            applySituation: "global",
            applyProfession: null,
            teamProfession: null,
            teamProfessionValues: null,
            elementFilter: "all",
            kind: "fixed",
            stackable: false,
            maxStacks: 1,
            valuePerStack: 0,
            defaultStacks: 1,
            appliesToAnomaly: true,
            enabledDefault: true,
            note: "",
          },
        },
      ],
      evidence: remielleMindscape1Evidence,
      verification:
        "块 note 与 Nanoka 天赋 1（agents/1581/details.zh.json 的 /talent/1/desc）同文确认后一条款：“蕾米埃尔处于[相变时流]状态下时，队伍中其他角色造成的属性异常伤害提升10%”。固定来源把它编码为同一块的两条记录：team anomalyDmgBonus +10 与自身 anomalyDmgBonus −10，后者把持有者自身排除，两条必须同时生效才表示“其他角色”。上游允许逐 effect 独立开关（固定版 BuffEffectPickerModal.vue 的 isEnabled/setEnabled/toggleEffect 按 effect、toggleCard 批量；panelBuffCalc.ts 的 buildDefaultBuffSelection 默认全开并按 team/self 槽位分别选择；resolvePackMods 对自身取 self+team、他人只取 team），因此固定来源不会强制成对激活，单选旧 +10% 记录会给持有者自身也多算 10%。Fairy 按本登记只提供完整状态选项并保留旧选项为迁移入口。",
    },
    {
      optionId: "agents:pheony:mindscape:0:abrasion-core-state",
      catalogEntityId: "agents:pheony",
      name: "灼蚀 · 完整状态（M0）",
      conditionDescription:
        "敌人处于[灼蚀]状态时，队伍中任意角色对其造成的属性异常伤害获得：异常/异放/乱流/耀变暴击率30%、暴击伤害25%，以及初始异常掌控超过155点后每点0.7%的暴击率（255点封顶+70%）。M0 档只包含核心12条记录；M1/M2 档为累计选项，必须整档选择，不能与 M0 档叠加。敌人是否处于[灼蚀]由调用方选中本选项声明，20秒持续与刷新不模拟。",
      target: "team",
      configuration: { minimumMindscape: 0 },
      exclusiveGroup: "pheony:abrasion-complete-state",
      differenceId: "pheony-abrasion-complete-state",
      migrationExplanation:
        "[灼蚀]核心与影画1/2记录属于同一敌人状态；目录拒绝把 M1/M2 的 effectId 放进 M0 选项（报 CONTEXT_MISMATCH），因此按影画累计为 M0/M1/M2 三档互斥选项：M0 只核心12条、M1 核心12+M1 4条、M2 核心12+M1 4+M2 1条。同一绑定只能选一档，M1/M2 档自带核心记录，未选核心也不会形成半状态；旧单项全部迁移为不可选入口。",
      records: pheonyAbrasionCoreRecords,
      evidence: [d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note")],
      verification:
        "ZZZ-HP 2628b32 菲欧妮 rank0 块 note 与12条记录逐条核对：核心四通道暴击率30%/暴伤25%与异常掌控155→255转模。M0 档只引用核心记录；M1/M2 档为累计选项并在同一 exclusiveGroup 内互斥。",
    },
    {
      optionId: "agents:pheony:mindscape:1:abrasion-mindscape-1-state",
      catalogEntityId: "agents:pheony",
      name: "灼蚀 · 完整状态（M1）",
      conditionDescription:
        "M1 累计档：包含核心12条与影画1的4条暴伤记录；影画1起[灼蚀]敌人受到属性异常伤害的暴击伤害在核心25%基础上再+25%（异常/异放/乱流/耀变四通道）。本档必须整档选择，不能与 M0 档叠加。",
      target: "team",
      configuration: { minimumMindscape: 1 },
      exclusiveGroup: "pheony:abrasion-complete-state",
      differenceId: "pheony-abrasion-complete-state",
      migrationExplanation:
        "影画1四通道暴伤与核心属于同一[灼蚀]状态；M1 档累计包含核心12条，避免未选核心的半状态。目录拒绝跨影画 effectIds 的单选项，因此使用互斥累计档。",
      records: [...pheonyAbrasionCoreRecords, ...pheonyAbrasionM1Records],
      evidence: [
        d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note"),
        d4Evidence("/agents/0/mindscapeBuffs/1/effectBlocks/0/note"),
      ],
      verification:
        "ZZZ-HP 2628b32 菲欧妮 rank1 块 note 与4条记录逐条核对：影画1起四通道暴伤+25%。M1 档引用核心12+影画1 4共16条记录，并与 M0/M2 档互斥；单独选择旧影画1单项被拒绝。",
    },
    {
      optionId: "agents:pheony:mindscape:2:abrasion-mindscape-2-state",
      catalogEntityId: "agents:pheony",
      name: "灼蚀 · 完整状态（M2）",
      conditionDescription:
        "M2 累计档：包含核心12条、影画1的4条暴伤记录与影画2的1条自身增伤；影画2起菲欧妮对[灼蚀]状态下的敌人造成的伤害+30%，受益者为本人。本档必须整档选择，不能与 M0/M1 档叠加。",
      target: "team",
      configuration: { minimumMindscape: 2 },
      exclusiveGroup: "pheony:abrasion-complete-state",
      differenceId: "pheony-abrasion-complete-state",
      migrationExplanation:
        "影画2自身增伤与核心/M1属于同一[灼蚀]状态；M2 档累计包含核心与M1记录，避免半状态。目录拒绝跨影画 effectIds 的单选项，因此使用互斥累计档。",
      records: [
        ...pheonyAbrasionCoreRecords,
        ...pheonyAbrasionM1Records,
        ...pheonyAbrasionM2Records,
      ],
      evidence: [
        d4Evidence("/agents/0/mindscapeBuffs/0/effectBlocks/0/note"),
        d4Evidence("/agents/0/mindscapeBuffs/1/effectBlocks/0/note"),
        d4Evidence("/agents/0/mindscapeBuffs/2/effectBlocks/0/note"),
      ],
      verification:
        "ZZZ-HP 2628b32 菲欧妮 rank2 块 note 与记录核对：菲欧妮对[灼蚀]敌人造成伤害+30%，受益者为本人。M2 档引用核心12+影画1 4+影画2 1共17条记录，并与 M0/M1 档互斥；同句的[灼烧]持续时间+2秒因上游挂在 turbulence 上标 unsupported，不并入本选项。",
    },
  ]

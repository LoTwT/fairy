import type {
  DamageElement,
  SkillCategory,
  SpecialSkillLevel,
  Unit,
} from "@randomplay/shared"

/**
 * 本轮新增的来源记录语义登记。只描述对固定来源记录的已核实解释及其证据，
 * 不复制上游数据；数值仍由转换器编译为现有 NumericExpression。
 *
 * 键使用 category/entityId/rankKind/rank/blockId/effectId 的稳定组合，不以名称匹配；
 * 数组重排不影响键的稳定性。核心档位参数证据仍维护在 rank-evidence.json，
 * 本文件不重复维护同一份核心参数。
 */

export interface SemanticsEvidenceReference {
  /** 相对 integrated 发布副本的冻结资源路径。 */
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

export type SourceSemantics =
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
       */
      readonly kind: "stagger-recovery-settlement"
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
       * 记录按固定来源字段转换，但来源自身的字段与块说明文字存在具名差异
       * （如克拉蕾[残锋]锐暴提升的 applyTarget=self 与说明"全队[锋御]"、
       * 影画一"倍率提升至原本的130%"被记为 skillDmgBonus +30）：
       * 转换遵循来源字段，不凭文字扩大受益范围或改写落点；差异记录在目录
       * differences，说明文字中的状态条件仍由调用方显式选择断言。
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

const lucyEvidence = [
  {
    path: "agents/1151/details.zh.json",
    pointer: "/skill/special/description/2/desc",
    sha256: "17ab67b8ec8413851f54a7a8823c643b72cf0a9c06546fa0720b3add2a7b1e9b",
  },
] as const

const luciaEvidence = [
  {
    path: "agents/1451/details.zh.json",
    pointer: "/skill/special/description/1/desc",
    sha256: "7f004d332642bca094a8c036dc76f625e18003d8c2ea253a2cdbfce95be2cad5",
  },
] as const

const aliceEvidence = [
  {
    path: "agents/1401/details.zh.json",
    pointer: "/passive/level/1401507/desc/0",
    sha256: "8468dbbd3d1ce6eff4fa743f96e369038ae959ec16f0aad980e500407139c42d",
  },
] as const

const nangongyuEvidence = [
  {
    path: "agents/1511/details.zh.json",
    pointer: "/passive/level/1511055/desc/0",
    sha256: "623a202f3d6b33c5c32d2ef6958595d02f0649cd76e57679858108b753a262b8",
  },
] as const

const nekomataPotentialEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021514/desc/0",
    sha256: "68cfb9254d991cd3d59a0e7ec38c3f8f15ed8030a910cacd9627e7726074cb07",
  },
] as const

/** 猫又潜能分支核心被动 1—7 行全文；爪印数值逐行核对。 */
const nekomataClawMarkEvidence = (
  [1021508, 1021509, 1021510, 1021511, 1021512, 1021513, 1021514] as const
).map((row) => ({
  path: "agents/1021/details.zh.json",
  pointer: `/passive/level/${row}/desc/0`,
  sha256: "68cfb9254d991cd3d59a0e7ec38c3f8f15ed8030a910cacd9627e7726074cb07",
}))

const pyroisEvidence = [
  {
    path: "agents/1551/details.zh.json",
    pointer: "/passive/level/1551507/desc/0",
    sha256: "b2915a1c094de9a5c88661c213080ad88498c1748e9a9fe71461729bcfe60856",
  },
] as const

const velinaEvidence = [
  {
    path: "agents/1561/details.zh.json",
    pointer: "/passive/level/1561507/desc/0",
    sha256: "a2089f5f829ed8646e768deee3f9b1424b39df3ffc25ade1e8d8ebb99ecf6659",
  },
] as const

const allSpecialSkillLevels: readonly SpecialSkillLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
]

const claretDetailsSha =
  "b1c682a050cd8cb1c9566a9cf4d5ae95409a6184db688474b20bd5b7c6d924d5"

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
const angelRevisionFile =
  "raw/zzz-hp/developer-revisions/zzz-hp-wengines-picked-1-2026-10-05.json"
const angelRevisionSha256 =
  "37bd836a70ec91e095133dc7de70599f6aa0bce073f090f3f5fc00da7d70345c"
const angelRevisionExportedAt = "2026-10-05T13:34:25.341Z"
const angelRevisionEvidence = (
  refinement: 2 | 3 | 4 | 5,
): readonly DeveloperRevisionEvidence[] => [
  {
    path: angelRevisionFile,
    sha256: angelRevisionSha256,
    exportedAt: angelRevisionExportedAt,
    pointer: `/wengines/0/refinementBuffs/${refinement - 1}/effectBlocks/0/effects/2`,
  },
]
const angelRevisionVerification = (refinement: 2 | 3 | 4 | 5): string => {
  const value = { 2: "11.5", 3: "13", 4: "14.5", 5: "16" }[refinement]!
  return `ZZZ-HP 开发者修订导出（exportedAt ${angelRevisionExportedAt}，整文件 SHA-256 ${angelRevisionSha256}，本机冻结于 ${angelRevisionFile}）按 ID 定位壳中之灵（wengines/0）后确认：精炼 ${refinement} 的 legacy-self-special 记录实为 anomalyDmgBonus（数值 ${value}%），effectBlocks 与 effects 两个表示同步改名，selfMods 数值从 special 迁至 anomalyDmgBonus。生成时逐字段核对导出与固定源仅存在该四条记录的登记差异。修订数据若交由上游 withRefinementAnomalyFlags 处理，会按 stat/kind/scope/target 从精炼 1 继承 appliesToAnomaly=true；Fairy 仍规范化固定旧源、不改写规范化记录（normalizationChanges 为空、stat 保持 special、记录不含该字段），修正后规则的 when 条件由修订字段映射与既有 whenFor 逻辑得到，与精炼 1 既有异常增伤规则一致（附件本身未写该字段，不冒充附件原始内容）。该修订导出不属于固定提交，不表示 ZZZ-HP 仓库已合入或发布。`
}

const burniceDetailsSha =
  "453f3284a6c8bcd52a4d2a99986d21beef4b695291d427fc43f4cad946902a18"
const graceDetailsSha =
  "39982521b198f62299a1cb4092dc1a3802c6b62748d04bcfda8f0f24b5afbdcf"
const ellenDetailsSha =
  "af6dfd6b8e63a6e2b460b63dc03bc7376d50e872bb8e26493364f5393176e222"
const harumasaDetailsSha =
  "cc189bbe54821dcca7139a529ca283220154aa92fbc84e912eab01fb1bb1b8db"
const alexandrinaDetailsSha =
  "ff04332f6e00a8e4ef654a1da8bfffbb577d90219c26b9f37cb1f4f69c0b9615"
const janeDetailsSha =
  "b69786037562711fda0389dc86940257a5df4504e100940781ce91a0311fa9ef"
const s0anbyDetailsSha =
  "600ca2500fb32c4bace09c67b196265e6f33fc276fa43f868f999ca4b416fe61"

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
    sha256: "86b72b728c26ebdf79acb4663aef806e10a7c0ad86632eb60d2d8254a18bf3d1",
  },
] as const

export const SOURCE_SEMANTICS: Readonly<Record<string, SourceSemantics>> = {
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
          "b69786037562711fda0389dc86940257a5df4504e100940781ce91a0311fa9ef",
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
  "agents/nangongyu/mindscape/0/blk-ms4cegmd-bwnttd/eff-ms4cey14-kzw7xx": {
    kind: "stagger-recovery-settlement",
    evidence: nangongyuEvidence,
    verification:
      "Nanoka 核心被动第 7 级确认：若[颤音]叠加到最大层数且敌人处于各属性异常状态下，或当敌人持有[颤音]并从失衡状态恢复时，所有[颤音]会被清除，清除时造成一次[异放]伤害。固定 JSON 的 applySituation: stagger 不构成游戏只允许失衡内结算的证据；调用方显式提供本次结算与层数，允许失衡内与恢复后的固定快照，是否失衡仍独立影响实际失衡乘区。",
  },
  "agents/nangongyu/mindscape/0/blk-ms4cegmd-bwnttd/eff-ms4clm2r-e6xquw": {
    kind: "stagger-recovery-settlement",
    evidence: nangongyuEvidence,
    verification:
      "同上：物理来源项与五元素来源项使用同一颤音清除机制；失衡内与恢复后的固定快照均可结算，倍率精度差异按来源原值保留（物理 449%）。",
  },
  "agents/nangongyu/mindscape/0/blk-ms4cegmd-bwnttd/eff-ms4cm9a5-wou1p2": {
    kind: "stagger-recovery-settlement",
    evidence: nangongyuEvidence,
    verification:
      "同上：颤音每层 +25%、最多 4 层，同一乘区增量相加（4 层为 ×2），由调用方显式提供本次结算层数；失衡内与恢复后的固定快照均可结算。",
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
  // 克拉蕾：影画一的"倍率提升至原本的130%"被固定来源记为 skillDmgBonus +30。
  "agents/claret/mindscape/1/blk-mtrkovf7-dqmjh3/eff-mtse9xm8-q641yp": {
    kind: "named-source-discrepancy",
    differenceId: "claret-mindscape1-multiplier-encoding",
    evidence: claretTalentEvidence(1),
    verification:
      "Nanoka 3.2 影画一确认：克拉蕾触发[毁伤]造成的伤害倍率提升至原本的 130%。固定来源把该条记为毁伤目标（claret-special-mtsecz30）上的 skillDmgBonus +30，即通用增伤区加成而非倍率乘区；Fairy 以固定来源为第一信任来源，按 +30% 增伤编码并登记差异，不改写为倍率乘区。",
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
  "w-engines/Angel_In_The_Shell/refinement/2/blk-legacy/legacy-self-special": {
    kind: "developer-revised-stat",
    originalStat: "special",
    revisedStat: "anomalyDmgBonus",
    revisedValue: 11.5,
    differenceId: "angel-in-the-shell-anomaly-stat-revision",
    evidence: angelRevisionEvidence(2),
    verification: angelRevisionVerification(2),
  },
  "w-engines/Angel_In_The_Shell/refinement/3/blk-legacy/legacy-self-special": {
    kind: "developer-revised-stat",
    originalStat: "special",
    revisedStat: "anomalyDmgBonus",
    revisedValue: 13,
    differenceId: "angel-in-the-shell-anomaly-stat-revision",
    evidence: angelRevisionEvidence(3),
    verification: angelRevisionVerification(3),
  },
  "w-engines/Angel_In_The_Shell/refinement/4/blk-legacy/legacy-self-special": {
    kind: "developer-revised-stat",
    originalStat: "special",
    revisedStat: "anomalyDmgBonus",
    revisedValue: 14.5,
    differenceId: "angel-in-the-shell-anomaly-stat-revision",
    evidence: angelRevisionEvidence(4),
    verification: angelRevisionVerification(4),
  },
  "w-engines/Angel_In_The_Shell/refinement/5/blk-legacy/legacy-self-special": {
    kind: "developer-revised-stat",
    originalStat: "special",
    revisedStat: "anomalyDmgBonus",
    revisedValue: 16,
    differenceId: "angel-in-the-shell-anomaly-stat-revision",
    evidence: angelRevisionEvidence(5),
    verification: angelRevisionVerification(5),
  },
}

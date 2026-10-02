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

export type SourceSemantics =
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

const lucyEvidence = [
  {
    path: "agents/1151/details.zh.json",
    pointer: "/skill/special/description/2/desc",
    sha256: "cecf218cd0535701d0059888273a8c74562da6f2f1d76bca4c52425673edc1e2",
  },
] as const

const luciaEvidence = [
  {
    path: "agents/1451/details.zh.json",
    pointer: "/skill/special/description/1/desc",
    sha256: "501102a4740b5b6e8814f180bbd1dc920d7d682ae5b42411d1b75f60277a98ce",
  },
] as const

const aliceEvidence = [
  {
    path: "agents/1401/details.zh.json",
    pointer: "/passive/level/1401507/desc/0",
    sha256: "7f59e46e9795d2af33ef9089cf0566c17a3ce9beab02c2970276c8e6b0d5bcb1",
  },
] as const

const nangongyuEvidence = [
  {
    path: "agents/1511/details.zh.json",
    pointer: "/passive/level/1511055/desc/0",
    sha256: "3ccdbfa4e58b8cba5b758fbfcfd512a6a06f09b56c929d6b102b9f54d7e5e3cf",
  },
] as const

const nekomataPotentialEvidence = [
  {
    path: "agents/1021/details.zh.json",
    pointer: "/passive/level/1021514/desc/0",
    sha256: "a265694efbc779a299d6a5c8c198b569ce43f22d354b02d4be4b4bf3d41d189e",
  },
] as const

/** 猫又潜能分支核心被动 1—7 行全文；爪印数值逐行核对。 */
const nekomataClawMarkEvidence = (
  [1021508, 1021509, 1021510, 1021511, 1021512, 1021513, 1021514] as const
).map((row) => ({
  path: "agents/1021/details.zh.json",
  pointer: `/passive/level/${row}/desc/0`,
  sha256: "a265694efbc779a299d6a5c8c198b569ce43f22d354b02d4be4b4bf3d41d189e",
}))

const pyroisEvidence = [
  {
    path: "agents/1551/details.zh.json",
    pointer: "/passive/level/1551507/desc/0",
    sha256: "18e48f62b4733432c0510a7e6b30446dc33ae5ab8350744d4fc7e5207b34a994",
  },
] as const

const velinaEvidence = [
  {
    path: "agents/1561/details.zh.json",
    pointer: "/passive/level/1561507/desc/0",
    sha256: "e8d2d37eedf1d4311d07994c594387cea1877c8fd66f7e09ab65ff6cadd8c33e",
  },
] as const

const allSpecialSkillLevels: readonly SpecialSkillLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
]

const burniceDetailsSha =
  "b55233c50a7314a5bcf365bd2d9e5bf94298e92fce284f749370e690a2740dae"
const graceDetailsSha =
  "feaf4be0396a002b3a96717e32e9b409ea068b31208c78ff8e91933fdb9be055"
const ellenDetailsSha =
  "7d42a516131172e8dadcfb9744cbbb0d56eba8d8909c795064fc3ea3b40288c8"
const harumasaDetailsSha =
  "344958cd98b57c943154eef3b203db52b79f8a659315154c9cdf3351cc163886"
const alexandrinaDetailsSha =
  "48658bb99713ac204c6b4e85a9ed7cc6bc74dbe206df79ac8ed001f4423d2c18"
const janeDetailsSha =
  "072cf7ca66133aa5a10a1a18ca08261a268a8950e652828cf18ccbd00784163a"
const s0anbyDetailsSha =
  "b2ec8c86f184122998a0100188800cbb073315f7d6573548da585c102f61ca47"

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
    sha256: "e183f9a19ea3534fa577d215ab5caa5c812fe6636c816a0db6e517379bfb55b3",
  },
] as const

export const SOURCE_SEMANTICS: Readonly<Record<string, SourceSemantics>> = {
  // 简·狂热：来源记录位于影画 0 的兼容块，实际由狂热状态启用；核心被动不提供该增益。
  "agents/jane/mindscape/0/blk-legacy/legacy-self-atk": {
    kind: "explicit-selection-state",
    evidence: [
      {
        path: "agents/1261/details.zh.json",
        pointer: "/skill/basic/description/2/desc",
        sha256:
          "072cf7ca66133aa5a10a1a18ca08261a268a8950e652828cf18ccbd00784163a",
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
}

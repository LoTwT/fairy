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
        readonly originalAnomalyAttribute?: DamageElement
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
  // 维琳娜：微域/广域气旋在来源中临时归入 special 大类，实际不属于任何类型。
  "agents/velina/mindscape/0/blk-legacy/legacy-team-anomalyReleaseMult": {
    kind: "independent-target",
    targetId: "velina-special-ms4tnsha",
    category: "uncategorized",
    evidence: velinaEvidence,
    verification:
      "来源块自带注记：微域气旋与广域气旋只是方便处理列入[特殊技]大类，实则不属于任何类型。Nanoka 核心被动第 7 级确认该爆炸为风属性异放、固定结算 145% 倍率。目录目标元数据改为 uncategorized，条件只匹配独立目标、异放伤害种类与风元素，不附加 special 大类要求。",
  },
  "agents/velina/mindscape/0/blk-legacy/eff-ms4tphp6-6zyuxs": {
    kind: "independent-target",
    targetId: "velina-special-ms4tnzvq",
    category: "uncategorized",
    evidence: velinaEvidence,
    verification:
      "来源块自带注记：微域气旋与广域气旋只是方便处理列入[特殊技]大类，实则不属于任何类型。Nanoka 核心被动第 7 级确认该爆炸为风属性异放、固定结算 255% 倍率。目录目标元数据改为 uncategorized，条件只匹配独立目标、异放伤害种类与风元素，不附加 special 大类要求。",
  },
}

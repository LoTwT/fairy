import type { SpecialSkillLevel, Unit } from "@randomplay/shared"

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
}

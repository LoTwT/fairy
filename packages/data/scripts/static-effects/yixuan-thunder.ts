import { isDeepStrictEqual } from "node:util"
import type { Supplement, SupplementOption } from "./supplements.ts"

/**
 * 仪玄（Yixuan，1371）批次 27：影画 2[消灾渡厄]的[强化特殊技：符法千重-破]、
 * 影画 1[清灵道心]的落雷与额外能力[玄墨暗涌]的落雷。三条倍率句只存在于
 * Nanoka 天赋/被动正文（无技能参数行），按本项目的独立结算补充契约接入：
 * 固定贯穿力倍率、零初始倍率、一次赋值、调用方声明触发事实。技能目录的
 * 25 条动作（含青溟震击-破 0023）不因此改动，也不自动派生本独立项。
 */

const identity = { kind: "agent", entityId: "1371" } as const
const yixuanZh =
  "bcf0924fe9fbdc799e4118e5590aef75e2b9bd1d0b0e0cf964179bfabcd77a01"
const yixuanEn =
  "f10dab754c5901446ddc404de6edd5c96e416911d0bc618fbde76acd32fd0c8e"
/** 直接倍率 stat 家族：影画/额外能力位置出现任何该家族机器记录即拒绝。 */
const directMultiplierStats = ["directDmgMult", "directDmgMultFactor"] as const

const mindscapeAtLeast = (minimum: number) =>
  ({
    kind: "compare-number",
    unit: "count",
    operator: "gte",
    left: {
      kind: "configuration-number",
      unit: "count",
      field: "mindscapeRank",
    },
    right: { kind: "literal", unit: "count", value: minimum },
  }) as const

/**
 * 影画 2[消灾渡厄]：发动[强化特殊技：青溟震击-破]后点按特殊技键，消耗一层
 * [聚墨]发动[强化特殊技：符法千重-破]，最多造成等同于 1200% 贯穿力的伤害。
 */
const yixuanMindscape2TalismanSuppressionBreak: SupplementOption = {
  kind: "option",
  supplementId: "nanoka:agents:yixuan:m2-talisman-suppression-break-damage",
  optionId: "nanoka:agents:yixuan:m2-talisman-suppression-break-damage",
  catalogEntityId: "agents:yixuan",
  source: "nanoka-integrated@3.3.12+19634983 agents/1371 /talent/2/desc",
  supportedRanks: "影画 2 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 2 的真实块（blk-legacy，note 为空串、resPen 15 记录为
  // 既有独立条款）；该位置出现直接倍率机器记录、锚块缺失或 note 任何变化
  // 即拒绝生成并要求重新核对。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 2,
    stats: directMultiplierStats,
    anchorBlocks: [
      {
        blockId: "blk-legacy",
        frozenNote: "",
        frozenName: "影画2",
        frozenEnabledDefault: true,
      },
    ],
  },
  skillTarget: {
    targetId: "yixuan-talisman-suppression-break",
    agentEntityId: "1371",
    category: "special",
    name: "强化特殊技：符法千重-破",
  },
  evidence: [
    {
      path: "agents/1371/details.zh.json",
      pointer: "/talent/2/desc",
      sha256: yixuanZh,
    },
    {
      path: "agents/1371/details.en.json",
      pointer: "/talent/2/desc",
      sha256: yixuanEn,
    },
  ],
  verification:
    "Nanoka 影画 2（agents/1371/details.zh.json 的 /talent/2/desc，英文文件同文核对：press the Special Attack button to consume one stack of Condensed Ink and launch EX Special Attack: Endless Talisman Suppression - Break, dealing DMG up to 1,200% of Sheer Force）确认：发动[强化特殊技：青溟震击-破]后点按特殊技键，可消耗一层[聚墨]发动[强化特殊技：符法千重-破]，最多造成等同于 1200% 贯穿力的伤害，[聚墨]效果最多维持一层。倍率句没有技能参数行（全文无 1371027 之后的新参数 ID），按固定 1200% 登记：「最多」按消耗一层[聚墨]的满额结算取舍（第二源 ZztIsolation/zzz_calculator da6a8c08 的 yixuan 条目 16 档同值 1200、damageBasis sheerForce，仅作交叉验证，不作为登记依据）；Nanoka 若未来出现分档参数行须重核本登记。固定 ZZZ-HP fac62407 的影画 2 块只有 resPen 15 记录（既有独立选项保持），聚墨句无机器记录，按补充来源在既有 agents:yixuan 实体新增选项；同仓库技能行 sk-yixuan-direct-mtwokbc9（baseMult 1200、skillTypes specialEnhanced/special、note 2影派生）与第二源 skillType special + exSpecial 标签一致支持按强化特殊技分类结算：独立目标登记 category special，与动作目录强化特殊技动作的 all-special-ms0fcqv7 目标组合一致，调用方应同时声明该目标以消费核心被动 60% 与影画 2 的 15% 以太抗性忽视等特殊技作用域增益（本登记不自动附加，与正式动作 0024/0025 的目标并列形态相同）。触发事实（[聚墨]的取得与消耗、青溟震击-破 后点按特殊技键）由调用方选中本选项并提供独立项断言：不模拟[聚墨]取得链、最多一层上限与按键时序；强化特殊技：青溟震击-破（action:agent:1371:action:0023）与终结技：符法千重（0016）是触发导航，不经本选项结算。倍率读绑定持有者（仪玄）当前贯穿力（holder-current，无快照），伤害种类为贯穿（sheer），要求零初始倍率与 special 分类；元素两处来源均未在倍率句标注（固定源与第二源把该行元素写为角色固有以太，是 agentElement 导入约定、不构成元素证据；仪玄正式动作目录 25 行伤害元素全部为 auric-ink 玄墨），规则不按元素筛选，独立结算的 hit.element 由调用方按实际结算显式声明。暴击沿用贯穿伤害的普通模型（面板暴击率与暴击伤害；declaredCriticalRate 声明只支持普通伤害结算，不适用于贯穿）。独立结算目标、零初始倍率、一次赋值与逐次声明是本项目采用的独立结算契约，不是原始游戏证据；正式动作解析不自动派生本独立项。",
  rule: {
    effectId:
      "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
    identity,
    section: "影画2：消灾渡厄（符法千重-破）",
    config: mindscapeAtLeast(2),
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 12 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["sheer"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:yixuan-talisman-suppression-break"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["yixuan:talisman-suppression-break-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 2 },
    inputs: [],
    applicability: {},
    damageItemRequirements: [
      {
        itemId: "yixuan:talisman-suppression-break-damage",
        stat: "sheerForce",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "special",
      },
    ],
    conditionDescription:
      "影画 2 起：发动[强化特殊技：青溟震击-破]后点按特殊技键，消耗一层[聚墨]发动[强化特殊技：符法千重-破]，按仪玄当前贯穿力的 1200% 结算一次独立贯穿伤害（「最多」按满额取舍）。触发与[聚墨]层数由调用方声明并逐次结算：独立项以 special 分类结算（可同时声明 all-special 目标消费特殊技作用域增益），元素由调用方按实际结算声明；[聚墨]取得链、一层上限与按键时序不模拟。",
    name: "影画2 · 强化特殊技：符法千重-破（独立结算）",
    target: "self",
  },
}

/**
 * 影画 1[清灵道心]：队伍中任意角色命中敌人时，仪玄自动追加一道落雷，
 * 造成等同于仪玄 50% 贯穿力的伤害并额外回复 5 点闪能，6 秒内最多一次。
 */
const yixuanMindscape1FallingThunder: SupplementOption = {
  kind: "option",
  supplementId: "nanoka:agents:yixuan:m1-falling-thunder-damage",
  optionId: "nanoka:agents:yixuan:m1-falling-thunder-damage",
  catalogEntityId: "agents:yixuan",
  source: "nanoka-integrated@3.3.12+19634983 agents/1371 /talent/1/desc",
  supportedRanks: "影画 1 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：影画 1 的真实块（blk-legacy，note 只冻结入场暴击率句，
  // 暴击率 10 记录为既有独立条款，落雷句无机器记录）；该位置出现直接倍率
  // 机器记录、锚块缺失或 note 任何变化即拒绝生成并要求重新核对。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 1,
    stats: directMultiplierStats,
    anchorBlocks: [
      {
        blockId: "blk-legacy",
        frozenNote: "进入战场时，暴击率提升10%",
        frozenName: "影画1",
        frozenEnabledDefault: true,
      },
    ],
  },
  skillTarget: {
    targetId: "yixuan-m1-falling-thunder",
    agentEntityId: "1371",
    // 文本没有分类分句：uncategorized 是本项目的独立结算约定（锁最终有效
    // 分类、不消费普通分类增益），不是游戏分类定论。
    category: "uncategorized",
    name: "清灵道心·落雷",
  },
  evidence: [
    {
      path: "agents/1371/details.zh.json",
      pointer: "/talent/1/desc",
      sha256: yixuanZh,
    },
    {
      path: "agents/1371/details.en.json",
      pointer: "/talent/1/desc",
      sha256: yixuanEn,
    },
  ],
  verification:
    "Nanoka 影画 1（agents/1371/details.zh.json 的 /talent/1/desc，英文文件同文核对：When any squad member lands a hit on an enemy, Yixuan automatically summons an extra lightning strike, dealing DMG equal to 50% of her Sheer Force and restoring an additional 5 Adrenaline. This can trigger once every 6s）确认：队伍中任意角色命中敌人时，仪玄会自动追加一道落雷，造成等同于仪玄 50% 贯穿力的伤害并额外回复 5 点闪能，6 秒内最多追加一次落雷；同句的入场暴击率 10% 与 120 点[术法值]由既有影画 1 选项与资源模型另行处理，不混入本倍率条款。倍率句没有技能参数行，按固定 50% 登记；固定 ZZZ-HP fac62407 的影画 1 块只有暴击率 10 记录（既有独立选项保持），落雷句无机器记录，按补充来源在既有 agents:yixuan 实体新增选项。触发事实（队伍中任意角色命中敌人）由调用方选中本选项并提供独立项断言：不模拟命中检测、6 秒触发间隔与次数上限，每次显式结算一次，倍率只经关联 hit-adjustment 贡献一次。倍率读绑定持有者（仪玄）当前贯穿力（holder-current，无快照），伤害种类为贯穿（sheer），要求零初始倍率与 uncategorized 分类锁定；文本没有「被视为[X]伤害」分句，不借用普通攻击/特殊技/追加攻击分类增益；额外回复的 5 点闪能是即时资源产出，不属于任何伤害乘区，不模拟。元素句未标注（第二源 ZztIsolation/zzz_calculator 同条记 ether 属 agentElement 导入约定；仪玄正式动作目录伤害元素全部为 auric-ink 玄墨），规则不按元素筛选，独立结算的 hit.element 由调用方按实际游戏行为显式声明。暴击沿用贯穿伤害的普通模型（面板暴击率与暴击伤害；declaredCriticalRate 声明只支持普通伤害结算，不适用于贯穿）。独立结算目标、零初始倍率、一次赋值与逐次声明是本项目采用的独立结算契约，不是原始游戏证据；正式动作解析不自动派生本独立项。",
  rule: {
    effectId: "agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1",
    identity,
    section: "影画1：清灵道心（落雷）",
    config: mindscapeAtLeast(1),
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 0.5 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["sheer"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:yixuan-m1-falling-thunder"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["yixuan:m1-falling-thunder-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: { minimumMindscape: 1 },
    inputs: [],
    applicability: {},
    damageItemRequirements: [
      {
        itemId: "yixuan:m1-falling-thunder-damage",
        stat: "sheerForce",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
    ],
    conditionDescription:
      "影画 1 起：队伍中任意角色命中敌人时，仪玄自动追加一道落雷，按仪玄当前贯穿力的 50% 结算一次独立贯穿伤害并额外回复 5 点闪能（资源不模拟）。触发由调用方声明并逐次结算：独立项以 uncategorized 分类锁定、元素由调用方按实际结算声明；6 秒内最多一次的触发间隔不模拟。",
    name: "影画1 · 清灵道心落雷（独立结算）",
    target: "self",
  },
}

/** 额外能力[玄墨暗涌]：仪玄被极限支援换下场时自动追加一道落雷。 */
const yixuanAdditionalAbilityFallingThunder: SupplementOption = {
  kind: "option",
  supplementId: "nanoka:agents:yixuan:aa-falling-thunder-damage",
  optionId: "nanoka:agents:yixuan:aa-falling-thunder-damage",
  catalogEntityId: "agents:yixuan",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1371 /passive/level/1371501—1371507/desc/1",
  supportedRanks: "影画 0—6；核心 1—7；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  // 条款上下文：核心被动 rank 0 的额外能力真实块（blk-ms31ao0d-1vjlok，
  // note 只冻结失衡增伤与凝神句，落雷句无机器记录）；该位置出现直接倍率
  // 机器记录、锚块缺失或 note 任何变化即拒绝生成并要求重新核对。
  clauseContextGuard: {
    rankKind: "mindscape",
    rank: 0,
    stats: directMultiplierStats,
    anchorBlocks: [
      {
        blockId: "blk-ms31ao0d-1vjlok",
        frozenNote:
          "队伍中存在[击破]角色或[支援]角色或[防护]角色时触发：\n[强化特殊技：凝云术]与[强化特殊技：墨烬影消]命中处于失衡状态下的敌人时，伤害提升30%；\n发动[终结技]后，仪玄进入[凝神]状态，[凝神]状态下，仪玄的暴击伤害提升40%，持续15秒。",
        frozenName: "额外能力：玄墨暗涌",
        frozenEnabledDefault: true,
      },
    ],
  },
  skillTarget: {
    targetId: "yixuan-aa-falling-thunder",
    agentEntityId: "1371",
    // 文本没有分类分句：uncategorized 是本项目的独立结算约定（锁最终有效
    // 分类、不消费普通分类增益），不是游戏分类定论。
    category: "uncategorized",
    name: "玄墨暗涌·落雷",
  },
  evidence: (["zh", "en"] as const).flatMap((locale) =>
    Array.from({ length: 7 }, (_, index) => ({
      rank: index + 1,
      path: `agents/1371/details.${locale}.json`,
      pointer: `/passive/level/${1371501 + index}/desc/1`,
      sha256: locale === "zh" ? yixuanZh : yixuanEn,
    })),
  ),
  verification:
    "Nanoka 额外能力七档（agents/1371/details.zh.json 的 /passive/level/1371501—1371507/desc/1，data.json level 元数据 1—7 与 rank 逐档核对；英文文件同文核对：If Yixuan is switched out by a Perfect Assist, she automatically follows up with a lightning strike attack, dealing DMG equal to 225% of her Sheer Force and restoring an additional 5 Adrenaline）确认七档同文：队伍中存在[击破]角色或[支援]角色或[防护]角色时触发，队友释放终结技时仪玄持续回复 2 点闪能（持续 10 秒）；仪玄被极限支援换下场时，仪玄会自动追加一道落雷，造成等同于仪玄 225% 贯穿力的伤害并额外回复 5 点闪能。同句的凝云术/墨烬影消失衡增伤与凝神暴伤由固定来源既有选项承载，队友终结技回能与本落雷的 5 点闪能是资源方向，不属于任何伤害乘区，均不混入本倍率条款。倍率句没有技能参数行，按固定 225% 登记；固定 ZZZ-HP fac62407 的 rank 0 额外能力块（blk-ms31ao0d-1vjlok）只编码失衡增伤与凝神暴伤两组记录、note 未含落雷句，按补充来源在既有 agents:yixuan 实体新增选项。额外能力的队伍资格（同队存在击破/支援/防护角色；仪玄自身为命破，资格只可能来自另一名队友）由目录 applicability 契约声明，消费端按绑定队伍事实校验，不自动推断队伍构成；触发事实（被极限支援换下场）由调用方选中本选项并提供独立项断言：不模拟极限支援检测、换人时序与冷却，每次显式结算一次，倍率只经关联 hit-adjustment 贡献一次。倍率读绑定持有者（仪玄）当前贯穿力（holder-current，无快照），伤害种类为贯穿（sheer），要求零初始倍率与 uncategorized 分类锁定；文本没有「被视为[X]伤害」分句，不借用普通攻击/特殊技/追加攻击分类增益。元素句未标注（第二源 ZztIsolation/zzz_calculator 同条记 ether 属 agentElement 导入约定；仪玄正式动作目录伤害元素全部为 auric-ink 玄墨），规则不按元素筛选，独立结算的 hit.element 由调用方按实际游戏行为显式声明。暴击沿用贯穿伤害的普通模型（面板暴击率与暴击伤害；declaredCriticalRate 声明只支持普通伤害结算，不适用于贯穿）。独立结算目标、零初始倍率、一次赋值与逐次声明是本项目采用的独立结算契约，不是原始游戏证据；正式动作解析不自动派生本独立项。",
  rule: {
    effectId: "agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0",
    identity,
    section: "额外能力：玄墨暗涌（落雷）",
    config: { kind: "constant", value: true },
    parameters: {
      amount: { kind: "constant", unit: "multiplier", value: 2.25 },
    },
    scope: "hit",
    when: {
      kind: "all",
      conditions: [
        { kind: "one-of", fact: "hit.damageKind", values: ["sheer"] },
        {
          kind: "one-of",
          fact: "hit.skillTag",
          values: ["zzz-hp:skill:yixuan-aa-falling-thunder"],
        },
      ],
    },
    operation: {
      kind: "hit-adjustment",
      field: "damageMultiplier",
      operator: "add",
      itemIds: ["yixuan:aa-falling-thunder-damage"],
      value: { kind: "parameter", unit: "multiplier", name: "amount" },
    },
    maximumLayers: 1,
  },
  variant: {
    configuration: {},
    inputs: [],
    applicability: { otherTeammateProfessions: ["击破", "支援", "防护"] },
    damageItemRequirements: [
      {
        itemId: "yixuan:aa-falling-thunder-damage",
        stat: "sheerForce",
        role: "base",
        allowedModes: ["direct"],
        source: "holder-current",
        requiredDirectMultiplier: 0,
        requiredSkillCategory: "uncategorized",
      },
    ],
    conditionDescription:
      "额外能力：同队存在[击破]、[支援]或[防护]角色时（由目录按绑定队伍校验资格），仪玄被极限支援换下场时自动追加一道落雷，按仪玄当前贯穿力的 225% 结算一次独立贯穿伤害并额外回复 5 点闪能（资源不模拟）。触发由调用方声明并逐次结算：独立项以 uncategorized 分类锁定、元素由调用方按实际结算声明；极限支援检测与换人时序不模拟。",
    name: "额外能力：玄墨暗涌 · 落雷（独立结算）",
    target: "self",
  },
}

export const YIXUAN_THUNDER_SUPPLEMENTS: readonly SupplementOption[] = [
  yixuanMindscape2TalismanSuppressionBreak,
  yixuanMindscape1FallingThunder,
  yixuanAdditionalAbilityFallingThunder,
]

/** 任一保留 supplement/option/规则身份命中都必须与登记逐字段一致。 */
export function verifyYixuanThunderRegistrations(
  supplements: readonly Supplement[],
): void {
  const expectedBySupplementId = new Map(
    YIXUAN_THUNDER_SUPPLEMENTS.map((entry) => [entry.supplementId, entry]),
  )
  const expectedByOptionId = new Map(
    YIXUAN_THUNDER_SUPPLEMENTS.map((entry) => [entry.optionId, entry]),
  )
  const expectedByEffectId = new Map(
    YIXUAN_THUNDER_SUPPLEMENTS.flatMap((entry) =>
      [entry.rule, ...(entry.additionalRules ?? [])].map(
        (rule) => [rule.effectId, entry] as const,
      ),
    ),
  )
  const selected = supplements.flatMap((actual) => {
    const reservedEffectIds = (
      "rule" in actual ? [actual.rule, ...(actual.additionalRules ?? [])] : []
    )
      .map((rule) => rule.effectId)
      .filter((effectId) => expectedByEffectId.has(effectId))
    if (new Set(reservedEffectIds).size !== reservedEffectIds.length)
      throw new Error("Duplicate Yixuan thunder effect registration")
    const matches = [
      expectedBySupplementId.get(actual.supplementId),
      "optionId" in actual
        ? expectedByOptionId.get(actual.optionId)
        : undefined,
      ...reservedEffectIds.map((effectId) => expectedByEffectId.get(effectId)),
    ].filter((entry) => entry !== undefined)
    if (new Set(matches).size > 1)
      throw new Error(
        `Yixuan thunder registration drift: ${actual.supplementId}; conflicting reserved identities`,
      )
    return matches.length === 0 ? [] : [{ actual, expected: matches[0]! }]
  })
  if (
    new Set(selected.map(({ expected }) => expected.supplementId)).size !==
    selected.length
  )
    throw new Error("Duplicate Yixuan thunder supplement registration")
  for (const { actual, expected } of selected) {
    if (!isDeepStrictEqual(actual, expected))
      throw new Error(
        `Yixuan thunder registration drift: ${actual.supplementId}; re-review the frozen clause`,
      )
  }
}

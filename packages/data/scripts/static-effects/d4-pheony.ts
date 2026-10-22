import type { Supplement } from "./supplements.ts"

const evidence = (
  pointer: string,
): {
  readonly source: "data-package"
  readonly path: string
  readonly pointer: string
  readonly sha256: string
} => ({
  source: "data-package",
  path: "scripts/static-effects/evidence/zzz-hp-325-entities.json",
  pointer,
  sha256: "5826e29d7527e8013299c8cc9cee8a4d2725d3a522719893b3c7b123f611edca",
})

const unsupported = (
  slug: string,
  name: string,
  conditionDescription: string,
  explanation: string,
  pointer: string,
): Supplement => ({
  kind: "unsupported-option",
  supplementId: `nanoka:agents:1641:${slug}`,
  source: "zzz-hp@2628b32 agents/pheony",
  catalogEntityId: "agents:pheony",
  optionId: `nanoka:agents:1641:${slug}`,
  name,
  conditionDescription,
  target: "self",
  configuration: {},
  reason: "formula-out-of-scope",
  explanation,
  supportedRanks: "核心 1—7；不可选",
  computationTarget:
    "declared unavailable clause on the 3.2.5 supplement entity",
  evidence: [evidence(pointer)],
  verification:
    "ZZZ-HP 2628b32 菲欧妮块 note 逐条核对；该条款是资源、动作替换或独立伤害事件，当前公开静态伤害计算不承诺，D4 只登记缺口，不折算成增伤、属性或零贡献。",
})

/**
 * D4-1a 的菲欧妮缺口登记：资源、动作替换与每 8 秒独立火伤不属于当前
 * 静态伤害乘区；M4 40% 与额外能力 15% 的机器记录另由 SOURCE_SEMANTICS
 * 标 unsupported。此处每个条款一个不可选目录入口，逐条保留去向。
 */
export const D4_PHEONY_UNSUPPORTED_SUPPLEMENTS: readonly Supplement[] = [
  unsupported(
    "rising-change",
    "升变 · 资源获取",
    "进入战场获得1点[升变]；M6 发动[强化特殊技：眩焰]时获得1点[升变]。",
    "升变是角色专属资源，不进入伤害或面板公式；D4 不模拟资源上限、获取时机或消耗。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
  unsupported(
    "flame-resource",
    "燔焰 · 资源获得与上限",
    "菲欧妮最多拥有120点[燔焰]；[燃烧攻击]造成伤害时回复[燔焰]；完美格挡获得5点，10秒内最多一次；M1 使[燔焰]获取效率提升15%。",
    "[燔焰]是角色专属资源；获取效率与上限不属于当前静态伤害乘区，D4 不模拟资源时间线。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
  unsupported(
    "withering-state",
    "枯荣 · 状态持续",
    "发动[强化特殊技]时进入[枯荣]状态，持续20秒；[燃烧攻击]命中或重复施加时刷新。",
    "[枯荣]状态的生命周期与刷新不进入静态伤害计算；D4 不模拟20秒持续或状态机。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
  unsupported(
    "rebirth",
    "重明 · 免死与回复",
    "受到致命伤害时不会战败退场，下一次换入前场时回复50%最大生命值；勘域模式1200秒内最多一次。",
    "免死、换入时点与生命回复不属于伤害乘区；D4 不生成任何可执行增益。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
  unsupported(
    "abrasion-periodic-fire",
    "灼蚀 · 每8秒50%火伤",
    "[灼蚀]状态下的敌人每8秒受到菲欧妮50%攻击力的火属性伤害，该伤害视为[强化特殊技]伤害。",
    "这是需要时间线的独立周期伤害事件，不是常驻增伤；D4 不新增动作或周期结算，留待动作/事件模型。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
  unsupported(
    "skill-replacement",
    "眩焰 → 坠阳 · 招式替换",
    "[枯荣]状态下发动[强化特殊技：眩焰]后，下次[眩焰]替换为[坠阳]；[燃烧攻击]后可跳过[掠火]/[燎斩]后撤动作。",
    "招式替换与动作衔接改变的是动作身份与时间线，不是静态倍率；D4 不修改动作目录。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
  unsupported(
    "burn-attack-interrupt",
    "燃烧攻击 · 抗打断",
    "[燃烧攻击]发动期间抗打断等级提升。",
    "抗打断等级不是伤害或面板属性；D4 不生成可执行贡献。",
    "/agents/0/mindscapeBuffs/0/effectBlocks/0/note",
  ),
]

/** D4-1b：影画 4 的 600% 异放结算按六种原异常分别归一。 */
const PHEONY_M4_ELEMENTS = [
  { element: "physical", label: "物理", multiplier: 42.78 },
  { element: "fire", label: "火", multiplier: 3 },
  { element: "ice", label: "冰", multiplier: 30 },
  { element: "electric", label: "电", multiplier: 7.5 },
  { element: "ether", label: "以太", multiplier: 3.75 },
  { element: "wind", label: "风", multiplier: 75 },
] as const

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

const pheonyM4SkillTag = "zzz-hp:skill:pheony-m4-anomaly-settlement"
const pheonyM4ItemId = "pheony:m4-anomaly-settlement"

const pheonyM4When = (element: string) =>
  ({
    kind: "all",
    conditions: [
      {
        kind: "one-of",
        fact: "hit.damageKind",
        values: ["anomaly-settlement"],
      },
      { kind: "one-of", fact: "hit.element", values: [element] },
      {
        kind: "one-of",
        fact: "hit.skillTag",
        values: [pheonyM4SkillTag],
      },
    ],
  }) as const

const pheonyM4Evidence = (locale: "zh" | "en") => ({
  source: "data-package" as const,
  sourceId: "nanoka-raw" as const,
  version: "3.3.12+19634983",
  locale,
  path: "scripts/static-effects/evidence/nanoka-3312-pheony-m4.json",
  pointer: `/${locale}/character/1641/talent/4/desc`,
  sha256: "5a1901fc91bd9bf3edf56519e866596c1d3a272ece60a0df09693c6ea456bb49",
})

/**
 * D4-1b：菲欧妮影画 4[生命尽头与冷酷仙境]的六元素异放结算。
 *
 * 终结一击命中异常状态敌人时额外触发一次异放，固定结算 600% × 原异常
 * 系数：物理 7.13→42.78、火 0.5→3、冰 5→30、电 1.25→7.5、以太
 * 0.625→3.75、风 12.5→75。六条选项共用独立目标与伤害项，按 hit.element
 * 裁决；该次异放暴击时额外暴伤 40% 只进入 anomaly-settlement 通道。
 */
export const D4_PHEONY_M4_SUPPLEMENTS: readonly Supplement[] =
  PHEONY_M4_ELEMENTS.map((spec, index) => {
    const optionId = `nanoka:agents:1641:m4-anomaly-settlement-${spec.element}`
    const effectId = `agent:1641:nanoka:m4-anomaly-settlement-${spec.element}:mindscape:4`
    const critEffectId = `${effectId}-crit-damage`
    const when = pheonyM4When(spec.element)
    const conditionDescription = `影画4：[烬火追魂]或[普通攻击：焚罪]终结一击命中处于异常状态的敌人时，额外触发一次[异放]，固定结算600%倍率的${spec.label}属性异常伤害（本项目的归一基础倍率 ${spec.multiplier} = 600% × ${spec.label}原异常系数）。本选项只覆盖${spec.label}原异常；调用方声明本次触发与命中元素，命中携带独立目标并以 anomaly-settlement 结算，伤害项倍率从0开始由规则一次赋值，statSource 与 damage.anomalySource 一致；该次异放暴击时额外暴伤+40%。具体招式、异常积蓄与状态机不模拟。`
    const verification = `Nanoka 3.3.12+19634983 的 agents/1641 /talent/4/desc 中英文同文（zh: “烬火追魂以及普通攻击：焚罪终结一击命中处于异常状态的敌人时，额外触发一次异放效果，固定结算600%倍率的对应属性的属性异常伤害”；en: “When the Finishing Move of Soul-Searching Blaze or Basic Attack: Purifying Flame hits an enemy affected by an Anomaly, it triggers 1 additional instance of Abloom, resolving the corresponding Attribute Anomaly at a fixed 600% multiplier”）确认：附加异放按原属性异常伤害的 600% 固定结算，${spec.label}的归一基础倍率为 ${spec.multiplier}。原异常系数取自固定来源 fac62407 的 publicAnomalySkills.ts（物理 713%、火 50%、冰 500%、电 125%、以太 62.5%、风 1250%）：${spec.label} ${spec.multiplier} = 600% × 原异常系数；该归一推导未经游戏实测。固定 3.2.5 摘录的 rank0 块同时把“该次异放触发暴击时暴伤额外+40%”编为常驻 anomalyReleaseCritDmg 40（eff-9）；D4-1b 不把该记录当常驻贡献，保留为 semantic-conflict 迁移入口，并以本选项的 additionalRules 只对本次异放追加 anomaly-settlement-critical-damage 40%。六条选项共用独立目标 ${pheonyM4SkillTag}、伤害项 ${pheonyM4ItemId} 与零初始倍率；按 hit.element 裁决，同启多条时只有元素匹配者贡献。伤害项必须由调用方以 attack/base/direct、anomaly-source 提供，且 statSource 与 damage.anomalySource 一致：异放复用原异常虚拟来源的攻击、异常精通、等级与穿透，菲欧妮是本次效果持有者与结算角色。触发招式、异常状态与命中时点由调用方显式声明，不模拟异常积蓄、持续时间或动作时间线；独立目标、零初始倍率、逐次声明与 uncategorized 分类要求是本项目采用的独立结算契约，不是原始游戏证据。证据文件 ${"nanoka-3312-pheony-m4.json"} 逐字保留 zh/en 原文，整文件 SHA-256 5a1901fc91bd9bf3edf56519e866596c1d3a272ece60a0df09693c6ea456bb49。`
    return {
      kind: "option",
      supplementId: `nanoka:agents:1641:m4-anomaly-settlement-${spec.element}`,
      source: "nanoka-raw@3.3.12+19634983 agents/1641 /talent/4/desc",
      catalogEntityId: "agents:pheony",
      optionId,
      supportedRanks: "影画 4—6",
      computationTarget:
        "catalog option on the 3.2.5 supplement entity; anomaly settlement reuses the original anomaly source",
      ...(index === 0
        ? {
            skillTarget: {
              targetId: "pheony-m4-anomaly-settlement",
              agentEntityId: "1641",
              category: "uncategorized" as const,
              name: "影画4异放结算",
            },
          }
        : {}),
      evidence: [pheonyM4Evidence("zh"), pheonyM4Evidence("en")],
      verification,
      rule: {
        effectId,
        identity: { kind: "agent", entityId: "1641" },
        section: "影画4：生命尽头与冷酷仙境（异放结算）",
        config: mindscapeAtLeast(4),
        parameters: {},
        scope: "hit",
        when,
        operation: {
          kind: "hit-adjustment",
          field: "damageMultiplier",
          operator: "add",
          itemIds: [pheonyM4ItemId],
          value: {
            kind: "literal",
            unit: "multiplier",
            value: spec.multiplier,
          },
        },
        maximumLayers: 1,
      },
      additionalRules: [
        {
          effectId: critEffectId,
          identity: { kind: "agent", entityId: "1641" },
          section: "影画4：生命尽头与冷酷仙境（异放暴伤）",
          config: mindscapeAtLeast(4),
          parameters: {},
          scope: "hit",
          when,
          operation: {
            kind: "factor-contribution",
            channel: "anomaly-settlement-critical-damage",
            value: { kind: "literal", unit: "ratio", value: 0.4 },
          },
          maximumLayers: 1,
        },
      ],
      variant: {
        configuration: { minimumMindscape: 4 },
        inputs: [],
        applicability: {},
        damageItemRequirements: [
          {
            itemId: pheonyM4ItemId,
            stat: "attack",
            role: "base",
            allowedModes: ["direct"],
            source: "anomaly-source",
            requiredDirectMultiplier: 0,
            requiredSkillCategory: "uncategorized",
          },
        ],
        conditionDescription,
        name: `影画4 · 异放结算（${spec.label}）`,
        target: "self",
      },
    } as Supplement
  })

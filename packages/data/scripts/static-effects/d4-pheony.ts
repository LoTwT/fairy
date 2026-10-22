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

import type { SourceIdentity } from "@randomplay/shared"
import type { SourceRecordShape } from "./supplements.ts"

/**
 * 固定来源补出实体后的同条款迁移登记。
 *
 * 3.2.5（ZZZ-HP 2628b32）已为洛克茜、绯月银棺、旋钻机-赤轴与「恒等式」-变格
 * 建立实体和机器记录，而 Fairy 当前固定源 fac62407 没有这些实体，相关条款由
 * Nanoka 补充实体承载。固定源补出实体后，补充选项继续使用既有的稳定
 * optionId/effectId，并挂到固定实体上；固定源同条款记录不再生成可执行贡献，
 * 而是保留为带迁移说明的 semantic-conflict 入口，避免同一效果重复计入。
 *
 * 每条登记只覆盖已经逐字段核对的固定源记录：记录身份（rankKind/rank/
 * blockId/effectId）与完整 raw 形状任一漂移都拒绝生成，要求重新核对，不能用
 * 迁移说明静默覆盖上游的新语义。补充登记未参与本次转换时不做任何迁移。
 */
export interface FixedSourceMigrationRecord {
  readonly rankKind: "mindscape" | "refinement" | "fixed" | "setPieces"
  readonly rank: number
  readonly blockId: string
  readonly raw: SourceRecordShape
}

export interface FixedSourceSupplementMigration {
  /** 补充登记 ID；必须全部参与本次转换，迁移才生效。 */
  readonly supplementIds: readonly string[]
  /** 固定源同条款记录被取代后仍保留的稳定补充目录选项。 */
  readonly optionIds: readonly string[]
  readonly identity: SourceIdentity
  readonly explanation: string
  readonly records: readonly FixedSourceMigrationRecord[]
}

type MigrationRecordOverrides = Partial<SourceRecordShape> &
  Pick<SourceRecordShape, "id" | "applyTarget" | "kind" | "stat" | "value">

/** 固定源 3.2.5 记录省略 scope；冻结形状不额外补出该字段。 */
const sourceRecord = (
  overrides: MigrationRecordOverrides,
): SourceRecordShape => ({
  origin: "",
  applySituation: "global",
  applyProfession: null,
  teamProfession: null,
  teamProfessionValues: null,
  teamProfessionMinCount: null,
  skillSubcategoryId: null,
  elementFilter: "all",
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  enabledDefault: true,
  note: "",
  ...overrides,
})

const roxyMindscape0 = "blk-mupowqtz-vpdi3u"
const roxyAdditional = "blk-muppaptc-wl5q5a"
const crimsonRefinement = "blk-muppptil-ym0iis"
const redAxisRefinement = "blk-mv3hz56a-noc5nc"

const crimsonCritRate = [24, 26, 28, 30, 32] as const
const crimsonResPen = [15, 17.3, 19.5, 21.8, 24] as const
const crimsonTeamDamageBonus = [20, 23, 26, 29, 32] as const
const crimsonSelfPenaltyEffectIds = [
  "eff-mv3gyasf-xhg50h",
  "eff-mv3gynto-znf5ed",
  "eff-mv3gz08q-54eubp",
  "eff-mv3gz8ua-3gr7fu",
  "eff-mv3gzfmo-vn2h6t",
] as const
const redAxisDamageBonus = [50, 57.5, 65, 72.5, 80] as const

const crimsonCritRateRecords: FixedSourceMigrationRecord[] =
  crimsonCritRate.map((value, index) => ({
    rankKind: "refinement",
    rank: index + 1,
    blockId: crimsonRefinement,
    raw: sourceRecord({
      id: "eff-muppptil-nbivsf",
      applyTarget: "self",
      kind: "fixed",
      stat: "critRate",
      value,
    }),
  }))

const crimsonResPenRecords: FixedSourceMigrationRecord[] = crimsonResPen.map(
  (value, index) => ({
    rankKind: "refinement",
    rank: index + 1,
    blockId: crimsonRefinement,
    raw: sourceRecord({
      id: "eff-muppq45z-3q1p3g",
      applyTarget: "self",
      kind: "fixed",
      stat: "resPen",
      value,
      elementFilter: ["风"],
    }),
  }),
)

const crimsonSquadDamageRecords: FixedSourceMigrationRecord[] = [
  ...crimsonTeamDamageBonus.map((value, index) => ({
    rankKind: "refinement" as const,
    rank: index + 1,
    blockId: crimsonRefinement,
    raw: sourceRecord({
      id: "eff-muppqbyi-yhg7mq",
      applyTarget: "team",
      kind: "fixed",
      stat: "dmgBonus",
      value,
    }),
  })),
  // 固定源用全队 +N 与自身 -N 两条记录表达“其他角色”；两条都迁移到同一
  // team-except-holder 补充选项，不能只留下其中一条继续重复贡献。
  ...crimsonSelfPenaltyEffectIds.map((id, index) => ({
    rankKind: "refinement" as const,
    rank: index + 1,
    blockId: crimsonRefinement,
    raw: sourceRecord({
      id,
      applyTarget: "self",
      kind: "fixed",
      stat: "dmgBonus",
      value: -crimsonTeamDamageBonus[index]!,
    }),
  })),
]

const redAxisRecords: FixedSourceMigrationRecord[] = redAxisDamageBonus.map(
  (value, index) => ({
    rankKind: "refinement",
    rank: index + 1,
    blockId: redAxisRefinement,
    raw: sourceRecord({
      id: "eff-mv3hz56a-anai9l",
      applyTarget: "self",
      kind: "fixed",
      stat: "skillDmgBonus",
      value,
      skillCategory: "basic",
      skillTargets: [
        { category: "basic", subcategoryId: null },
        { category: "dodge", subcategoryId: "all-dodge-ms0dnpmr" },
      ],
      elementFilter: ["电"],
    }),
  }),
)

const roxyIdentity: SourceIdentity = { kind: "agent", entityId: "1621" }
const crimsonIdentity: SourceIdentity = {
  kind: "w-engine",
  entityId: "14162",
}
const redAxisIdentity: SourceIdentity = {
  kind: "w-engine",
  entityId: "13111",
}
const identityInflectionIdentity: SourceIdentity = {
  kind: "w-engine",
  entityId: "12014",
}

export const FIXED_SOURCE_SUPPLEMENT_MIGRATIONS: readonly FixedSourceSupplementMigration[] =
  [
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:initial-energy-regen-conversion"],
      optionIds: ["nanoka:agents:1621:initial-energy-regen-conversion"],
      explanation:
        "固定源只把「初始能量自动回复超过 1.2」编码为外部回能到攻击力的单条转化（上限 960），没有冲击力通道与核心 1—7 分档封顶。Fairy 保留经 Nanoka 七档核对完整状态选项 nanoka:agents:1621:initial-energy-regen-conversion：攻击力与冲击力同时启用、共用显式初始回能读数，并按核心等级分别封顶；固定源该记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyMindscape0,
          raw: sourceRecord({
            id: "eff-mupowqtz-c3lwdq",
            applyTarget: "self",
            kind: "convert",
            stat: "atk",
            value: 0,
            convert: {
              from: "energyRegen",
              panelSource: "external",
              ratioPercent: 500,
              cap: 960,
              defaultBase: null,
              initialBase: 120,
            },
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: [
        "nanoka:agents:1621:core-wind-critical-damage",
        "nanoka:agents:1621:core-element-critical-damage",
      ],
      optionIds: [
        "nanoka:agents:1621:core-wind-critical-damage",
        "nanoka:agents:1621:core-element-critical-damage",
      ],
      explanation:
        "固定源把核心被动的非锋御暴伤编码为无元素条件、未排除锋御的全队 critRate→critDmg 转化。Fairy 保留按受益职业分流、只作用于对应属性与风属性命中的补充选项（nanoka:agents:1621:core-wind-critical-damage / nanoka:agents:1621:core-element-critical-damage）；固定源该记录不再单独贡献，避免把锋御与异属性命中重复计入。",
      records: [
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyMindscape0,
          raw: sourceRecord({
            id: "eff-mupozzur-l99yxv",
            applyTarget: "team",
            kind: "convert",
            stat: "critDmg",
            value: 0,
            convert: {
              from: "critRate",
              panelSource: "external",
              ratioPercent: 40,
              cap: 40,
              defaultBase: null,
              initialBase: 0,
            },
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: [
        "nanoka:agents:1621:core-wind-sharp-critical-damage",
        "nanoka:agents:1621:core-element-sharp-critical-damage",
      ],
      optionIds: [
        "nanoka:agents:1621:core-wind-sharp-critical-damage",
        "nanoka:agents:1621:core-element-sharp-critical-damage",
      ],
      explanation:
        "固定源把锋御锐暴伤编码为无元素条件的团队转化，受益范围与命中元素都比正文宽。Fairy 保留只对锋御、对应属性及风属性命中生效的补充选项（nanoka:agents:1621:core-wind-sharp-critical-damage / nanoka:agents:1621:core-element-sharp-critical-damage）；固定源该记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyMindscape0,
          raw: sourceRecord({
            id: "eff-muppa3a3-cb9a32",
            applyTarget: "team",
            applyProfession: "锋御",
            kind: "convert",
            stat: "sharpenCritDmgBonus",
            value: 0,
            convert: {
              from: "critRate",
              panelSource: "external",
              ratioPercent: 20,
              cap: 20,
              defaultBase: null,
              initialBase: 0,
            },
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:additional-level-damage"],
      optionIds: ["nanoka:agents:1621:additional-level-damage"],
      explanation:
        "固定源把额外能力自身增伤拆成固定 8% 与等级转化两条可独立开关的记录。Fairy 保留一条完整选项 nanoka:agents:1621:additional-level-damage：8% + min(1.2×角色等级, 72)，等级来自持有者真实等级且无默认值；两条固定源记录都不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyAdditional,
          raw: sourceRecord({
            id: "eff-muppaptc-fn832t",
            applyTarget: "self",
            kind: "fixed",
            stat: "dmgBonus",
            value: 8,
          }),
        },
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyAdditional,
          raw: sourceRecord({
            id: "eff-muppd7di-hf2fx8",
            applyTarget: "self",
            kind: "convert",
            stat: "dmgBonus",
            value: 0,
            convert: {
              from: "level",
              panelSource: "external",
              ratioPercent: 120,
              cap: 72,
              defaultBase: null,
              initialBase: 0,
            },
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:additional-hit-stun-damage"],
      optionIds: ["nanoka:agents:1621:additional-hit-stun-damage"],
      explanation:
        "固定源把队伍攻击命中后的失衡易伤编码为无条件团队记录。Fairy 保留补充选项 nanoka:agents:1621:additional-hit-stun-damage：只有声明当前目标处于失衡状态时才计入，30 个百分点数值与既有失衡加数通道不变；固定源该记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyAdditional,
          raw: sourceRecord({
            id: "eff-muppdqhh-3qsii7",
            applyTarget: "team",
            kind: "fixed",
            stat: "staggerVulnerable",
            value: 30,
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:additional-weathered-direct-damage"],
      optionIds: ["nanoka:agents:1621:additional-weathered-direct-damage"],
      explanation:
        "固定源把风化状态下的直接攻击增伤编码为 special 18，与正文“风属性直接攻击伤害和触发浸染属性的直接攻击伤害额外提升 8%”不一致。Fairy 不采用该 18，保留已修正的补充选项 nanoka:agents:1621:additional-weathered-direct-damage（风化直接攻击系数 +0.08，显式声明当前目标风化与浸染色）；固定源该记录不再贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 0,
          blockId: roxyAdditional,
          raw: sourceRecord({
            id: "eff-muppe3ty-86s1uf",
            applyTarget: "team",
            kind: "fixed",
            stat: "special",
            value: 18,
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:m1-hit-resistance-reduction"],
      optionIds: ["nanoka:agents:1621:m1-hit-resistance-reduction"],
      explanation:
        "固定源把影画 1 的「强化特殊技：敬请安息命中后使敌方全属性抗性降低 15%」编码为团队 resPen。Fairy 保留补充选项 nanoka:agents:1621:m1-hit-resistance-reduction：作为对当前敌人的目标减抗、由调用方声明命中与 50 秒有效状态，受益范围是持有者及合法同队角色；固定源该记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 1,
          blockId: "blk-muppfe6g-rax9gx",
          raw: sourceRecord({
            id: "eff-muppfe6g-956sbb",
            applyTarget: "team",
            kind: "fixed",
            stat: "resPen",
            value: 15,
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:m1-critical-damage"],
      optionIds: ["nanoka:agents:1621:m1-critical-damage"],
      explanation:
        "固定源的影画 1 自身暴伤 40% 与补充选项 nanoka:agents:1621:m1-critical-damage 同条款。Fairy 保留该补充选项的独立开关与持有者受益范围；固定源记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 1,
          blockId: "blk-muppfe6g-rax9gx",
          raw: sourceRecord({
            id: "eff-muppfukt-ck2j4e",
            applyTarget: "self",
            kind: "fixed",
            stat: "critDmg",
            value: 40,
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:m2-stun-damage"],
      optionIds: ["nanoka:agents:1621:m2-stun-damage"],
      explanation:
        "固定源把影画 2 的失衡易伤编码为无条件团队记录。Fairy 保留补充选项 nanoka:agents:1621:m2-stun-damage：只有当前目标处于失衡状态时才计入，30 个百分点与既有失衡加数通道不变；固定源该记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 2,
          blockId: "blk-muppg5bs-g0tx3p",
          raw: sourceRecord({
            id: "eff-muppg5bs-4w8a0e",
            applyTarget: "team",
            kind: "fixed",
            stat: "staggerVulnerable",
            value: 30,
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:m4-ultimate-damage"],
      optionIds: ["nanoka:agents:1621:m4-ultimate-damage"],
      explanation:
        "固定源把影画 4 的终结技增伤编码为整类 ultimate 命中。Fairy 保留补充选项 nanoka:agents:1621:m4-ultimate-damage：只匹配正式动作 action:agent:1621:action:0013 与[终结技：葬夜安魂曲]精确目标，20% 数值与伤害加成通道不变；固定源该记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 4,
          blockId: "blk-muppgwvr-qe48si",
          raw: sourceRecord({
            id: "eff-muppgwvr-e7am7i",
            applyTarget: "self",
            kind: "fixed",
            stat: "skillDmgBonus",
            value: 20,
            skillCategory: "ultimate",
            skillTargets: [{ category: "ultimate", subcategoryId: null }],
          }),
        },
      ],
    },
    {
      identity: roxyIdentity,
      supplementIds: ["nanoka:agents:1621:m6-wind-resistance-ignore"],
      optionIds: ["nanoka:agents:1621:m6-wind-resistance-ignore"],
      explanation:
        "固定源的影画 6 自身风抗忽视 15% 与补充选项 nanoka:agents:1621:m6-wind-resistance-ignore 同条款。Fairy 保留补充选项的受益范围（持有者自身风属性命中）与已登记的伤害种类覆盖；固定源记录不再单独贡献。",
      records: [
        {
          rankKind: "mindscape",
          rank: 6,
          blockId: "blk-muppihiv-sh14rz",
          raw: sourceRecord({
            id: "eff-muppihiv-mxxqb8",
            applyTarget: "self",
            kind: "fixed",
            stat: "resPen",
            value: 15,
            elementFilter: ["风"],
          }),
        },
      ],
    },
    {
      identity: crimsonIdentity,
      supplementIds: ["nanoka:w-engines:14162:crit-rate"],
      optionIds: ["nanoka:w-engines:14162:crit-rate"],
      explanation:
        "固定源按精炼档记录绯月银棺的常驻暴击率 24/26/28/30/32%。Fairy 保留单一稳定选项 nanoka:w-engines:14162:crit-rate（按精炼 1—5），受益对象限定装备者本人；五档固定源记录都不再单独贡献。",
      records: crimsonCritRateRecords,
    },
    {
      identity: crimsonIdentity,
      supplementIds: ["nanoka:w-engines:14162:wind-resistance-ignore"],
      optionIds: ["nanoka:w-engines:14162:wind-resistance-ignore"],
      explanation:
        "固定源按精炼档记录风属性抗性无视 15/17.3/19.5/21.8/24%。Fairy 保留稳定选项 nanoka:w-engines:14162:wind-resistance-ignore，按命中元素 wind 筛选、受益对象限定装备者本人，并沿用既有抗性区覆盖的全部风伤种类；五档固定源记录都不再单独贡献。",
      records: crimsonResPenRecords,
    },
    {
      identity: crimsonIdentity,
      supplementIds: ["nanoka:w-engines:14162:squad-damage-bonus"],
      optionIds: ["nanoka:w-engines:14162:squad-damage-bonus"],
      explanation:
        "固定源用全队 +N 与自身 −N 两条记录表达“全队其他角色增伤”。Fairy 保留稳定选项 nanoka:w-engines:14162:squad-damage-bonus：受益者是持有者同队其他角色（team-except-holder），并保留全队唯一效果选择约束；十档正负固定源记录都不再单独贡献。",
      records: crimsonSquadDamageRecords,
    },
    {
      identity: redAxisIdentity,
      supplementIds: ["nanoka:w-engines:13111"],
      optionIds: ["nanoka:w-engines:13111:refinement:red-axis"],
      explanation:
        "固定源把冲刺攻击登记为 dodge/all-dodge-ms0dnpmr，并把该条款编译为 skillDmgBonus。Fairy 保留稳定选项 nanoka:w-engines:13111:refinement:red-axis：普通攻击与冲刺攻击（dash）、电属性、regular 直伤、按精炼 1—5 的 50/57.5/65/72.5/80% 均按修正后的补充语义执行；五档固定源记录都不再单独贡献。",
      records: redAxisRecords,
    },
    {
      identity: identityInflectionIdentity,
      supplementIds: ["nanoka:w-engines:12014:attacker-damage-reduction"],
      optionIds: ["nanoka:w-engines:12014:attacker-damage-reduction"],
      explanation:
        "「恒等式」-变格 12014 在固定源没有机器记录；本登记只允许补充实体与不可选越界选项挂到固定实体，不声称固定源已编码「致眩」条款，也不创建任何可执行贡献。",
      records: [],
    },
  ]

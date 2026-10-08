import type { AgentName } from "../../src/index.ts"
import type {
  CoreSkillLevel,
  DamageElement,
  MindscapeRank,
  PotentialLevel,
} from "@randomplay/shared"

/**
 * 固定面板队伍差分批次的唯一输入来源：12 个预设、36 个状态、42 个独立事件。
 *
 * 面板是已声明的局外最终值（合成夹具，不声称可达成配装）：不按装备重建、
 * 不补角色默认值、不重复叠加初始/核心/装备属性。除本文件显式列出的增益组外，
 * 所有战斗效果、来源增益、音擎/驱动盘效果、潜能、自动额外能力、异常暴击修正、
 * 易伤、忽防/减防、持续时间延长与特殊修正一律关闭或恒等。
 *
 * 每个状态从声明面板的独立副本开始，不继承上一状态的改动；每个事件只计算一次，
 * 同队多个事件是彼此独立的探针，不相加为队伍 DPS、轮转或自动触发。
 */

export interface TeamDifferentialPanel {
  readonly attack: number
  readonly health: number
  readonly defense: number
  readonly impact: number
  readonly anomalyProficiency: number
  readonly anomalyMastery: number
  readonly energyRegen: number
  readonly criticalRate: number
  readonly criticalDamage: number
  readonly penetrationRatio: number
  readonly penetrationValue: number
  readonly sharpCriticalDamage: number
  /** 仅仪玄：已结算的 `0.1 × 生命 + 0.3 × 攻击` 贯穿力基线。 */
  readonly sheerForce?: number
  /** 未列出的元素增伤为 0。 */
  readonly damageBonuses: Readonly<Partial<Record<DamageElement, number>>>
}

export interface TeamDifferentialAgent {
  readonly key: string
  readonly agentName: AgentName
  readonly agentEntityId: string
  readonly upstreamAgentId: string
  readonly mindscapeRank: MindscapeRank
  readonly coreSkillLevel: CoreSkillLevel
  readonly potentialLevel: PotentialLevel
  readonly panel: TeamDifferentialPanel
}

export const actorEntityId = (key: string): `entity:${string}` =>
  `entity:${key}`

/**
 * 固定敌人：70 级杜拉罕，基础防御 921.04（显式覆写，不用资料库取整值 921），
 * 未失衡、基础失衡乘数 1；冰/以太抗性 -0.2，其余本批元素 0。
 * 流明没有独立抗性：耀变按调用方给出的等效元素抗性输入。
 */
export const teamDifferentialTarget: {
  readonly entityId: `entity:${string}`
  readonly teamId: `team:${string}`
  readonly baseDefense: number
  readonly isStunned: boolean
  readonly baseStunDamageMultiplier: number
  /** 本批使用元素的固定抗性；未列出的元素按 0 处理。 */
  readonly resistances: Readonly<Partial<Record<DamageElement, number>>>
} = {
  entityId: "entity:target",
  teamId: "team:enemies",
  baseDefense: 921.04,
  isStunned: false,
  baseStunDamageMultiplier: 1,
  resistances: {
    "physical": 0,
    "fire": 0,
    "ice": -0.2,
    "electric": 0,
    "ether": -0.2,
    "wind": 0,
    "auric-ink": -0.2,
    "frost": -0.2,
  },
} as const

export const teamDifferentialAgents: readonly TeamDifferentialAgent[] = [
  {
    key: "nicole",
    agentName: "Nicole",
    agentEntityId: "1031",
    upstreamAgentId: "nicole",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 2750.25,
      health: 12000,
      defense: 820.5,
      impact: 88,
      anomalyProficiency: 120,
      anomalyMastery: 90,
      energyRegen: 1.56,
      criticalRate: 0.42,
      criticalDamage: 1.05,
      penetrationRatio: 0,
      penetrationValue: 18,
      sharpCriticalDamage: 0,
      damageBonuses: { "ether": 0.3, "auric-ink": 0.3 },
    },
  },
  {
    key: "jane",
    agentName: "Jane",
    agentEntityId: "1261",
    upstreamAgentId: "jane",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 3100.5,
      health: 12600,
      defense: 790,
      impact: 86,
      anomalyProficiency: 320.25,
      anomalyMastery: 150,
      energyRegen: 1.2,
      criticalRate: 0.25,
      criticalDamage: 0.8,
      penetrationRatio: 0.1,
      penetrationValue: 18,
      sharpCriticalDamage: 0,
      damageBonuses: { physical: 0.3 },
    },
  },
  {
    key: "yixuan",
    agentName: "Yixuan",
    agentEntityId: "1371",
    upstreamAgentId: "yixuan",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 2300.75,
      health: 22000.5,
      defense: 900,
      impact: 83,
      anomalyProficiency: 93,
      anomalyMastery: 92,
      energyRegen: 1.2,
      criticalRate: 0.62,
      criticalDamage: 1.4,
      penetrationRatio: 0,
      penetrationValue: 0,
      sharpCriticalDamage: 0,
      sheerForce: 2890.275,
      damageBonuses: { "ether": 0.3, "auric-ink": 0.3 },
    },
  },
  {
    key: "claret",
    agentName: "Claret",
    agentEntityId: "1611",
    upstreamAgentId: "claret",
    mindscapeRank: 4,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 1700,
      health: 14500,
      defense: 3000.25,
      impact: 100,
      anomalyProficiency: 100,
      anomalyMastery: 90,
      energyRegen: 1.2,
      criticalRate: 0.45,
      criticalDamage: 1.1,
      penetrationRatio: 0,
      penetrationValue: 18,
      sharpCriticalDamage: 0.4,
      damageBonuses: { electric: 0.3 },
    },
  },
  {
    key: "astra",
    agentName: "Astra Yao",
    agentEntityId: "1311",
    upstreamAgentId: "astrayao",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 3450.5,
      health: 13000,
      defense: 900,
      impact: 83,
      anomalyProficiency: 100,
      anomalyMastery: 90,
      energyRegen: 2,
      criticalRate: 0.1,
      criticalDamage: 0.5,
      penetrationRatio: 0,
      penetrationValue: 0,
      sharpCriticalDamage: 0,
      damageBonuses: { "ether": 0.1, "auric-ink": 0.1 },
    },
  },
  {
    key: "rina",
    agentName: "Rina",
    agentEntityId: "1211",
    upstreamAgentId: "alexandrina",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 2400.25,
      health: 12500,
      defense: 800,
      impact: 83,
      anomalyProficiency: 160,
      anomalyMastery: 100,
      energyRegen: 1.8,
      criticalRate: 0.2,
      criticalDamage: 0.7,
      penetrationRatio: 0.24,
      penetrationValue: 27,
      sharpCriticalDamage: 0,
      damageBonuses: { electric: 0.2 },
    },
  },
  {
    key: "burnice",
    agentName: "Burnice",
    agentEntityId: "1171",
    upstreamAgentId: "burnice",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 2900.75,
      health: 13500,
      defense: 850,
      impact: 86,
      anomalyProficiency: 380,
      anomalyMastery: 148,
      energyRegen: 1.4,
      criticalRate: 0.22,
      criticalDamage: 0.9,
      penetrationRatio: 0,
      penetrationValue: 18,
      sharpCriticalDamage: 0,
      damageBonuses: { fire: 0.3 },
    },
  },
  {
    key: "velina",
    agentName: "Velina",
    agentEntityId: "1561",
    upstreamAgentId: "velina",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 3000.25,
      health: 13000,
      defense: 860,
      impact: 90,
      anomalyProficiency: 360,
      anomalyMastery: 148,
      energyRegen: 1.56,
      criticalRate: 0.18,
      criticalDamage: 0.75,
      penetrationRatio: 0.1,
      penetrationValue: 18,
      sharpCriticalDamage: 0,
      damageBonuses: { wind: 0.3 },
    },
  },
  {
    key: "remiel",
    agentName: "Remielle",
    agentEntityId: "1581",
    upstreamAgentId: "remiel",
    mindscapeRank: 6,
    coreSkillLevel: 7,
    potentialLevel: 0,
    panel: {
      attack: 3931,
      health: 11365,
      defense: 886,
      impact: 83,
      anomalyProficiency: 484,
      anomalyMastery: 115,
      energyRegen: 1.2,
      criticalRate: 0.074,
      criticalDamage: 0.5,
      penetrationRatio: 0,
      penetrationValue: 18,
      sharpCriticalDamage: 0,
      damageBonuses: {},
    },
  },
]

/** 本批命中的伤害类别；与招式段/异常事件一一对应。 */
export type TeamDifferentialDamageKind =
  | "regular"
  | "sheer"
  | "sharpen"
  | "anomaly"
  | "disorder"
  | "luminize"

export interface TeamDifferentialEffectSelection {
  readonly optionId: string
  /**
   * 该选项在固定上游原始记录中的全部指针；一个选项可以合并多条原始效果
   * （例如蕾米埃尔影画 1 的"队伍 +10"与"自身 -10"）。参考生成器按这些指针
   * 读取原始 stat/value/applyTarget/elementFilter，不另抄一份数值。
   */
  readonly pointers: readonly string[]
  readonly layers: number
  /**
   * 转化类选项的外读来源值；由持有者自己的代理人来源绑定提供。
   * `readFrom` 记录该值在声明面板上的真实出处。
   */
  readonly source?: {
    readonly unit: "attack-points" | "ratio"
    readonly value: number
    readonly readFrom: string
  }
  /**
   * 已核对的适用伤害类别；省略表示全部类别都适用。
   * 普通直伤/贯穿/锐化的类别名为 `regular` / `sheer` / `sharpen`。
   * 这些集合来自本批已核验的效果映射（例如异常类通道不进入紊乱），
   * 不是从测试实现反推的结果。
   */
  readonly damageKinds?: readonly TeamDifferentialDamageKind[]
}

export interface TeamDifferentialBuffGroup {
  readonly holder: string
  readonly mappingStatus: "converted" | "corrected"
  readonly effects: readonly TeamDifferentialEffectSelection[]
  /** 仅用于记录与上游原始效果的具名语义差异。 */
  readonly semanticNote?: string
}

export const teamDifferentialBuffGroups: Readonly<
  Record<string, TeamDifferentialBuffGroup>
> = {
  "nicole-defense": {
    holder: "nicole",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:nicole:mindscape:0:blk-legacy:legacy-team-reduceDefense",
        pointers: ["/agents/14/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
      },
    ],
  },
  "nicole-ether": {
    holder: "nicole",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:nicole:mindscape:0:blk-ms44nh0n-onk6p7:eff-ms44nh0n-d1cf4n",
        pointers: ["/agents/14/mindscapeBuffs/0/effectBlocks/1/effects/0"],
        layers: 1,
      },
    ],
  },
  "astra-song": {
    holder: "astra",
    mappingStatus: "converted",
    effects: [
      {
        optionId: "agents:astrayao:mindscape:0:blk-legacy:legacy-team-dmgBonus",
        pointers: ["/agents/45/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
      },
      {
        optionId: "agents:astrayao:mindscape:0:blk-legacy:legacy-team-critDmg",
        pointers: ["/agents/45/mindscapeBuffs/0/effectBlocks/0/effects/1"],
        layers: 1,
      },
    ],
  },
  "astra-attack": {
    holder: "astra",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:astrayao:mindscape:0:blk-ms38hwcr-q7y9sx:eff-ms38hwcr-m9hn4v",
        pointers: ["/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0"],
        layers: 1,
        source: {
          unit: "attack-points",
          value: 3450.5,
          readFrom: "actors.astra.panel.attack",
        },
      },
    ],
  },
  "rina-penetration": {
    holder: "rina",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:alexandrina:mindscape:0:blk-ms46w5pz-zdpplb:eff-ms46w5pz-93ry6b",
        pointers: ["/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
      },
      {
        optionId:
          "agents:alexandrina:mindscape:0:blk-ms46w5pz-zdpplb:eff-ms46xqjt-g3gxeb",
        pointers: ["/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/1"],
        layers: 1,
        source: {
          unit: "ratio",
          value: 0.24,
          readFrom: "actors.rina.panel.penetrationRatio",
        },
      },
    ],
  },
  "jane-frenzy": {
    holder: "jane",
    mappingStatus: "converted",
    effects: [
      {
        optionId: "agents:jane:mindscape:0:blk-legacy:legacy-self-atk",
        pointers: ["/agents/43/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
      },
    ],
  },
  "jane-bite": {
    holder: "jane",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34bcgu-8f1m63",
        pointers: ["/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/1"],
        layers: 1,
        damageKinds: ["anomaly"],
      },
      {
        optionId:
          "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34c40c-3b3j3z",
        pointers: ["/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/2"],
        layers: 1,
        damageKinds: ["anomaly"],
      },
      {
        optionId:
          "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34ci0p-usidux",
        pointers: ["/agents/43/mindscapeBuffs/0/effectBlocks/1/effects/3"],
        layers: 1,
        damageKinds: ["anomaly"],
      },
    ],
  },
  "yixuan-core": {
    holder: "yixuan",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:yixuan:mindscape:0:blk-legacy:legacy-self-skillDmgBonus",
        pointers: ["/agents/2/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
        damageKinds: ["regular", "sheer", "sharpen"],
      },
    ],
  },
  "claret-state": {
    holder: "claret",
    mappingStatus: "corrected",
    semanticNote:
      "局外面板已含永久暴伤转暴击率；这里只应用临时 +30% 暴击率，不重复换算。",
    effects: [
      {
        optionId:
          "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtrf598z-80y7hh",
        pointers: ["/agents/6/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
      },
    ],
  },
  "claret-m4": {
    holder: "claret",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:claret:mindscape:4:blk-mtseebl3-k0eoh9:eff-mtseebl3-6j53ci",
        pointers: ["/agents/6/mindscapeBuffs/4/effectBlocks/0/effects/0"],
        layers: 1,
        damageKinds: ["regular", "sheer", "sharpen"],
      },
    ],
  },
  "claret-remnant": {
    holder: "claret",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:claret:mindscape:0:blk-mtrgmqhd-srsnon:eff-mtrgmqhd-jgzfvq",
        pointers: ["/agents/6/mindscapeBuffs/0/effectBlocks/1/effects/0"],
        layers: 1,
      },
    ],
  },
  "burnice-duration": {
    holder: "burnice",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:burnice:mindscape:0:blk-ms4nig27-5ji2hh:eff-ms4nig27-6onrev",
        pointers: ["/agents/26/mindscapeBuffs/0/effectBlocks/2/effects/0"],
        layers: 1,
        damageKinds: ["anomaly", "disorder", "luminize"],
      },
    ],
  },
  "remiel-core": {
    holder: "remiel",
    mappingStatus: "corrected",
    semanticNote:
      "异化系数与耀变换算两条自身转化；不代表整队自动勾选或时间线。",
    effects: [
      {
        optionId: "agents:remiel:mindscape:0:blk-legacy:eff-ms7t5hb1-fqvxkz",
        pointers: ["/agents/51/mindscapeBuffs/0/effectBlocks/0/effects/0"],
        layers: 1,
        damageKinds: ["anomaly", "disorder", "luminize"],
      },
      {
        optionId: "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
        pointers: ["/agents/51/mindscapeBuffs/0/effectBlocks/0/effects/1"],
        layers: 1,
        damageKinds: ["luminize"],
      },
    ],
  },
  "remiel-m1-complete": {
    holder: "remiel",
    mappingStatus: "corrected",
    semanticNote:
      "上游同时启用队伍 +10 与自身 -10 两条原始效果；Fairy 使用一个完整选项，" +
      "队友净 +10、持有者净 0。不得改用已废弃的旧部分选项。",
    effects: [
      {
        optionId:
          "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage",
        // 完整选项合并上游的“队伍 +10”与“自身 -10”两条原始效果。
        pointers: [
          "/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/1",
          "/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/2",
        ],
        layers: 1,
        damageKinds: ["anomaly", "luminize"],
      },
    ],
  },
  "remiel-m1-radiance-penetration": {
    holder: "remiel",
    mappingStatus: "converted",
    effects: [
      {
        optionId: "agents:remiel:mindscape:1:blk-legacy:eff-ms7tin2y-0pja8e",
        pointers: ["/agents/51/mindscapeBuffs/1/effectBlocks/0/effects/0"],
        layers: 1,
        damageKinds: ["luminize"],
      },
    ],
  },
  "remiel-m2-mutation": {
    holder: "remiel",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:remiel:mindscape:2:blk-ms7tkhei-q0ipfu:eff-ms7tkhei-lhivxl",
        pointers: ["/agents/51/mindscapeBuffs/2/effectBlocks/0/effects/0"],
        layers: 1,
        damageKinds: ["anomaly", "disorder", "luminize"],
      },
    ],
  },
  "remiel-m2-ignore": {
    holder: "remiel",
    mappingStatus: "corrected",
    semanticNote:
      "同一选项只在[异常]来源的属性异常/紊乱命中贡献一次 15% 忽防；" +
      "普通直伤与未选中都不贡献。",
    effects: [
      {
        optionId:
          "agents:remiel:mindscape:2:blk-ms7tkhei-q0ipfu:eff-ms7tlurw-vhelyf",
        pointers: ["/agents/51/mindscapeBuffs/2/effectBlocks/0/effects/1"],
        layers: 1,
        damageKinds: ["anomaly", "disorder", "luminize"],
      },
    ],
  },
  "remiel-m4": {
    holder: "remiel",
    mappingStatus: "converted",
    effects: [
      {
        optionId:
          "agents:remiel:mindscape:4:blk-ms7tnn2n-4zw15u:eff-ms7tnn2n-mz69ez",
        pointers: ["/agents/51/mindscapeBuffs/4/effectBlocks/0/effects/0"],
        layers: 1,
        damageKinds: ["luminize"],
      },
    ],
  },
  "remiel-three-anomaly": {
    holder: "remiel",
    mappingStatus: "converted",
    semanticNote:
      "三[异常]档：异化系数 +10 与攻击转模 40%（上限 1600）；" +
      "来源读取声明的局外攻击，不是增益后的当前攻击。",
    effects: [
      {
        optionId:
          "agents:remiel:mindscape:0:blk-ms7tc2w4-mzvc69:eff-ms7tc2w3-mzcr6z",
        pointers: ["/agents/51/mindscapeBuffs/0/effectBlocks/1/effects/0"],
        layers: 1,
        damageKinds: ["anomaly", "disorder", "luminize"],
      },
      {
        optionId:
          "agents:remiel:mindscape:0:blk-ms7td2gs-rk1vtd:eff-ms7td2gs-4vbpdh",
        pointers: ["/agents/51/mindscapeBuffs/0/effectBlocks/2/effects/0"],
        layers: 1,
        source: {
          unit: "attack-points",
          value: 3931,
          readFrom: "actors.remiel.panel.attack",
        },
      },
    ],
  },
}

export interface TeamDifferentialAgentActionEvent {
  readonly kind: "agent-action"
  readonly actor: string
  readonly actionId: string
  readonly levelGroup: "basic" | "assist" | "special" | "chain"
  /** 显式有效等级 12；不使用训练等级再叠影画加级。 */
  readonly effectiveLevel: number
  readonly skillCategory: string
  readonly element: DamageElement
  readonly damageKind: "regular" | "sheer" | "sharpen" | "luminize"
  readonly multiplier: number
  /** 招式身份：已解析动作必须给出同一组技能目标，否则断言失败。 */
  readonly skillTargetIds: readonly string[]
  /** 固定技能记录身份与指针；参考生成器据此核对倍率。 */
  readonly upstreamSkillId: string
  readonly upstreamSkillPointer: string
  /** 耀变等效属性抗性：按槽序取下一个非流明队友的元素抗性。 */
  readonly luminizeEquivalentElementResistance?: number
}

export interface TeamDifferentialOrdinaryAnomalyEvent {
  readonly kind: "ordinary-anomaly"
  readonly actor: string
  readonly powerSource: string
  readonly element: DamageElement
  readonly baseMultiplier: number
  readonly sourceLevel: 60
  readonly upstreamSkillId: string
}

export interface TeamDifferentialStandardDisorderEvent {
  readonly kind: "standard-disorder"
  readonly actor: string
  readonly powerSource: string
  readonly originalAnomalyAttribute: "fire"
  readonly element: DamageElement
  readonly baseDurationSeconds: number
  readonly elapsedSeconds: number
  readonly sourceLevel: 60
}

export type TeamDifferentialEvent =
  | TeamDifferentialAgentActionEvent
  | TeamDifferentialOrdinaryAnomalyEvent
  | TeamDifferentialStandardDisorderEvent

export const teamDifferentialEvents: Readonly<
  Record<string, TeamDifferentialEvent>
> = {
  "nicole-cannon": {
    kind: "agent-action",
    actor: "nicole",
    actionId: "action:agent:1031:action:0014",
    levelGroup: "chain",
    effectiveLevel: 12,
    skillCategory: "ultimate",
    element: "ether",
    damageKind: "regular",
    multiplier: 12.936,
    skillTargetIds: [],
    upstreamSkillId: "sk-nicole-nk-1031304-炮击",
    upstreamSkillPointer: "/skills/609",
  },
  "yixuan-charge": {
    kind: "agent-action",
    actor: "yixuan",
    actionId: "action:agent:1371:action:0024",
    levelGroup: "special",
    effectiveLevel: 12,
    skillCategory: "enhanced-special",
    element: "auric-ink",
    damageKind: "sheer",
    multiplier: 13.439,
    skillTargetIds: [
      "zzz-hp:skill:all-special-ms0fcqv7",
      "zzz-hp:skill:yixuan-special-ms31byco",
    ],
    upstreamSkillId: "sk-yixuan-nk-1371022-蓄力期间总",
    upstreamSkillPointer: "/skills/1038",
  },
  "claret-ultimate": {
    kind: "agent-action",
    actor: "claret",
    actionId: "action:agent:1611:action:0019",
    levelGroup: "chain",
    effectiveLevel: 12,
    skillCategory: "ultimate",
    element: "electric",
    damageKind: "sharpen",
    multiplier: 45.048,
    skillTargetIds: ["zzz-hp:skill:claret-ultimate-mtsefude"],
    upstreamSkillId: "sk-claret-nk-1611021-main",
    upstreamSkillPointer: "/skills/243",
  },
  "remiel-radiance": {
    kind: "agent-action",
    actor: "remiel",
    actionId: "action:agent:1581:action:0007",
    levelGroup: "assist",
    effectiveLevel: 12,
    skillCategory: "uncategorized",
    element: "lumiflux",
    damageKind: "luminize",
    multiplier: 3.2,
    skillTargetIds: ["zzz-hp:skill:remiel-assist-ms8eijmj"],
    luminizeEquivalentElementResistance: 0,
    upstreamSkillId: "sk-remiel-radiance-mtsw2paj",
    upstreamSkillPointer: "/skills/771",
  },
  "jane-assault": {
    kind: "ordinary-anomaly",
    actor: "jane",
    powerSource: "jane",
    element: "physical",
    baseMultiplier: 7.13,
    sourceLevel: 60,
    upstreamSkillId: "sk-public-anomaly-physical",
  },
  "burnice-fire-disorder": {
    kind: "standard-disorder",
    actor: "jane",
    powerSource: "burnice",
    originalAnomalyAttribute: "fire",
    element: "fire",
    baseDurationSeconds: 10,
    elapsedSeconds: 3,
    sourceLevel: 60,
  },
}

export interface TeamDifferentialCase {
  readonly caseId: string
  readonly label: string
  readonly buffGroups: readonly string[]
  readonly panelOverrides?: Readonly<
    Record<string, Partial<TeamDifferentialPanel>>
  >
  readonly eventOverrides?: Readonly<
    Record<string, { readonly elapsedSeconds: number }>
  >
}

export interface TeamDifferentialPreset {
  readonly presetId: string
  /** 队伍槽位顺序；耀变等效属性按此顺序循环。 */
  readonly team: readonly string[]
  readonly events: readonly string[]
  readonly purpose: string
  readonly cases: readonly TeamDifferentialCase[]
}

export const teamDifferentialPresets: readonly TeamDifferentialPreset[] = [
  {
    presetId: "S1",
    team: ["nicole"],
    events: ["nicole-cannon"],
    purpose: "以太直伤、减防与暴击率钳制；只算炮击一行，不叠加能量场。",
    cases: [
      { caseId: "S1-0", label: "基线", buffGroups: [] },
      {
        caseId: "S1-1",
        label: "减防",
        buffGroups: ["nicole-defense"],
      },
      {
        caseId: "S1-2",
        label: "减防与暴击率钳制",
        buffGroups: ["nicole-defense"],
        panelOverrides: { nicole: { criticalRate: 1.1 } },
      },
    ],
  },
  {
    presetId: "S2",
    team: ["jane"],
    events: ["jane-assault"],
    purpose: "强击强度来源、阈值换算与异常专属暴击档位。",
    cases: [
      { caseId: "S2-0", label: "基线", buffGroups: [] },
      { caseId: "S2-1", label: "狂热", buffGroups: ["jane-frenzy"] },
      {
        caseId: "S2-2",
        label: "狂热与啮咬",
        buffGroups: ["jane-frenzy", "jane-bite"],
      },
    ],
  },
  {
    presetId: "S3",
    team: ["yixuan"],
    events: ["yixuan-charge"],
    purpose: "贯穿力、玄墨继承、忽防不进贯穿公式与暴击率钳制。",
    cases: [
      { caseId: "S3-0", label: "基线", buffGroups: [] },
      { caseId: "S3-1", label: "核心增伤", buffGroups: ["yixuan-core"] },
      {
        caseId: "S3-2",
        label: "核心与暴击率钳制",
        buffGroups: ["yixuan-core"],
        panelOverrides: { yixuan: { criticalRate: 1.1 } },
      },
    ],
  },
  {
    presetId: "S4",
    team: ["claret"],
    events: ["claret-ultimate"],
    purpose: "防御缩放、锐暴与招式限定影画；不重复永久暴伤转暴击率。",
    cases: [
      { caseId: "S4-0", label: "基线", buffGroups: [] },
      {
        caseId: "S4-1",
        label: "临时暴击状态",
        buffGroups: ["claret-state"],
      },
      {
        caseId: "S4-2",
        label: "临时状态与影画 4",
        buffGroups: ["claret-state", "claret-m4"],
      },
    ],
  },
  {
    presetId: "D1",
    team: ["nicole", "astra"],
    events: ["nicole-cannon"],
    purpose: "攻击转模上限、增益加算与以太目标适用性。",
    cases: [
      { caseId: "D1-0", label: "基线", buffGroups: [] },
      { caseId: "D1-1", label: "耀嘉音咏叹", buffGroups: ["astra-song"] },
      {
        caseId: "D1-2",
        label: "耀嘉音与妮可",
        buffGroups: [
          "astra-song",
          "astra-attack",
          "nicole-defense",
          "nicole-ether",
        ],
      },
    ],
  },
  {
    presetId: "D2",
    team: ["jane", "remiel"],
    events: ["jane-assault"],
    purpose: "影画 1 队友增伤与影画 2 适用忽防，来源身份无歧义。",
    cases: [
      { caseId: "D2-0", label: "基线", buffGroups: [] },
      {
        caseId: "D2-1",
        label: "狂热与完整影画 1",
        buffGroups: ["jane-frenzy", "remiel-m1-complete"],
      },
      {
        caseId: "D2-2",
        label: "追加啮咬与影画 2 忽防",
        buffGroups: [
          "jane-frenzy",
          "remiel-m1-complete",
          "jane-bite",
          "remiel-m2-ignore",
        ],
      },
    ],
  },
  {
    presetId: "D3",
    team: ["jane", "burnice"],
    events: ["burnice-fire-disorder"],
    purpose: "紊乱时长、已过时间与触发者/强度来源分离；不做伤害加总。",
    cases: [
      { caseId: "D3-0", label: "10 秒灼烧、已过 3 秒", buffGroups: [] },
      {
        caseId: "D3-1",
        label: "灼烧时长 +3 秒",
        buffGroups: ["burnice-duration"],
      },
      {
        caseId: "D3-2",
        label: "同时长、已过 6 秒",
        buffGroups: ["burnice-duration"],
        eventOverrides: { "burnice-fire-disorder": { elapsedSeconds: 6 } },
      },
    ],
  },
  {
    presetId: "T1",
    team: ["remiel", "jane", "velina"],
    events: ["remiel-radiance", "jane-assault"],
    purpose:
      "受限自身来源与完整当前面板、三异常额外能力、影画 1 自身/队友区分；事件彼此独立。",
    cases: [
      {
        caseId: "T1-0",
        label: "仅核心转化",
        buffGroups: ["remiel-core"],
      },
      {
        caseId: "T1-1",
        label: "自身影画",
        buffGroups: [
          "remiel-core",
          "remiel-m1-radiance-penetration",
          "remiel-m2-mutation",
          "remiel-m4",
        ],
      },
      {
        caseId: "T1-2",
        label: "三异常队伍增益与完整影画 1/2",
        buffGroups: [
          "remiel-core",
          "remiel-m1-radiance-penetration",
          "remiel-m2-mutation",
          "remiel-m4",
          "remiel-three-anomaly",
          "remiel-m1-complete",
          "remiel-m2-ignore",
        ],
      },
    ],
  },
  {
    presetId: "T2",
    team: ["nicole", "astra", "rina"],
    events: ["nicole-cannon"],
    purpose: "三人攻击/暴击/元素/减防/穿透组合；丽娜来源取增益前数值。",
    cases: [
      { caseId: "T2-0", label: "基线", buffGroups: [] },
      {
        caseId: "T2-1",
        label: "耀嘉音完整选中状态",
        buffGroups: ["astra-song", "astra-attack"],
      },
      {
        caseId: "T2-2",
        label: "追加妮可与丽娜效果",
        buffGroups: [
          "astra-song",
          "astra-attack",
          "nicole-defense",
          "nicole-ether",
          "rina-penetration",
        ],
      },
    ],
  },
  {
    presetId: "T3",
    team: ["yixuan", "astra", "nicole"],
    events: ["yixuan-charge"],
    purpose: "收到攻击后的贯穿增量、忽防不变性与以太增伤。",
    cases: [
      { caseId: "T3-0", label: "仅核心", buffGroups: ["yixuan-core"] },
      {
        caseId: "T3-1",
        label: "追加耀嘉音",
        buffGroups: ["yixuan-core", "astra-song", "astra-attack"],
      },
      {
        caseId: "T3-2",
        label: "追加妮可",
        buffGroups: [
          "yixuan-core",
          "astra-song",
          "astra-attack",
          "nicole-defense",
          "nicole-ether",
        ],
      },
    ],
  },
  {
    presetId: "T4",
    team: ["claret", "astra", "rina"],
    events: ["claret-ultimate"],
    purpose: "队友攻击与暴击下的锐暴与防御缩放；丽娜为电属性额外能力搭档。",
    cases: [
      { caseId: "T4-0", label: "基线", buffGroups: [] },
      {
        caseId: "T4-1",
        label: "克拉蕾状态/影画 4/残锋",
        buffGroups: ["claret-state", "claret-m4", "claret-remnant"],
      },
      {
        caseId: "T4-2",
        label: "追加耀嘉音与丽娜",
        buffGroups: [
          "claret-state",
          "claret-m4",
          "claret-remnant",
          "astra-song",
          "astra-attack",
          "rina-penetration",
        ],
      },
    ],
  },
  {
    presetId: "T5",
    team: ["jane", "burnice", "remiel"],
    events: ["jane-assault", "burnice-fire-disorder"],
    purpose:
      "同队物理强击与火紊乱并列：影画 1 异常增伤与紊乱通道区分、影画 2 五类适用；不相加为轮转。",
    cases: [
      { caseId: "T5-0", label: "基线", buffGroups: [] },
      {
        caseId: "T5-1",
        label: "狂热/啮咬/时长/完整影画 1",
        buffGroups: [
          "jane-frenzy",
          "jane-bite",
          "burnice-duration",
          "remiel-m1-complete",
        ],
      },
      {
        caseId: "T5-2",
        label: "追加影画 2 忽防",
        buffGroups: [
          "jane-frenzy",
          "jane-bite",
          "burnice-duration",
          "remiel-m1-complete",
          "remiel-m2-ignore",
        ],
      },
    ],
  },
]

export interface TeamDifferentialSlot {
  readonly slotId: string
  readonly presetId: string
  readonly case: TeamDifferentialCase
  readonly eventId: string
  readonly event: TeamDifferentialEvent
  readonly team: readonly string[]
}

/** 42 个独立事件槽位；顺序与预设/状态/事件声明的顺序一致。 */
export const teamDifferentialSlots: readonly TeamDifferentialSlot[] =
  teamDifferentialPresets.flatMap((preset) =>
    preset.cases.flatMap((entry) =>
      preset.events.map((eventId) => {
        const event = teamDifferentialEvents[eventId]!
        const override = entry.eventOverrides?.[eventId]
        return {
          slotId: `${entry.caseId}/${eventId}`,
          presetId: preset.presetId,
          case: entry,
          eventId,
          event:
            override && event.kind === "standard-disorder"
              ? { ...event, elapsedSeconds: override.elapsedSeconds }
              : event,
          team: preset.team,
        }
      }),
    ),
  )

export const teamDifferentialAgentByKey: Readonly<
  Record<string, TeamDifferentialAgent>
> = Object.fromEntries(teamDifferentialAgents.map((a) => [a.key, a]))

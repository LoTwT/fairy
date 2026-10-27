import type {
  CoreSkillLevel,
  DamageElement,
  MindscapeRank,
  PotentialLevel,
  RefinementRank,
} from "@randomplay/shared"
import type { AgentName, WEngineName } from "../../src/index.ts"
import type { StaticCatalogDamageInput } from "../../../core/src/index.ts"

/**
 * effects revision 54—56 伤害种类范围回归的唯一输入来源：每个案例只声明一名
 * 持有者、一次独立命中与显式选择的效果。面板是合成的中立面板（攻击 1,000、
 * 异常精通 100、其余伤害乘区为 1），不代表可达配装；除列出的选择外全部效果关闭。
 *
 * `perLayer` 来自 Nanoka 原文或本项目修正文档引用的原文，供独立参考使用；
 * `source` 是固定来源 991bb0e 的原始编码，供参考生成器逐字段核对，不参与期望回填。
 */
export type ScopeDamageKind = StaticCatalogDamageInput["damage"]["kind"]
export type ScopeChannel =
  | "anomaly-damage-bonus"
  | "anomaly-critical-rate"
  | "anomaly-critical-damage"
  | "sheer-damage-bonus"
export type ScopeSourceStat =
  | "anomalyDmgBonus"
  | "turbulenceDmgBonus"
  | "anomalyCritRate"
  | "anomalyCritDmg"

export interface ScopeSelection {
  readonly optionId: string
  readonly layers: number
  readonly channel: ScopeChannel
  /** 游戏原文在面板异常精通 100 / 对应档位下的每层贡献（比例）。 */
  readonly perLayer: number
  /** 固定来源原始记录按同一层数折算的每层贡献；仅用于核对上游投影。 */
  readonly sourcePerLayer: number
  readonly correctedKinds: readonly ScopeDamageKind[]
  /** 命中元素限制；缺省表示该记录没有命中元素条件。 */
  readonly correctedElements?: readonly DamageElement[]
  /** 该选项在目录中应携带的具名差异；转换记录为 null。 */
  readonly differenceId: string | null
  /** 修订 56 的固定来源 stat 笔误修正会改写通道，不只是收窄伤害种类。 */
  readonly sourceStatCorrected?: boolean
  readonly source: {
    readonly pointer: `/${string}`
    readonly stat: ScopeSourceStat
    readonly value: number
    readonly valuePerStack: number
    readonly maxStacks: number
    readonly defaultStacks: number
    readonly elementFilter: readonly string[] | "all"
    readonly applyTarget: "self" | "team"
  }
}

export interface ScopeCase {
  readonly caseId: string
  readonly correction: "revision-54" | "revision-55" | "revision-56"
  readonly holder: {
    readonly agentName: AgentName
    readonly element: DamageElement
    readonly mindscapeRank: MindscapeRank
    readonly coreSkillLevel: CoreSkillLevel
    readonly potentialLevel: PotentialLevel
  }
  readonly wEngine: {
    readonly name: WEngineName
    readonly refinement: RefinementRank
  } | null
  readonly hit: {
    readonly kind: ScopeDamageKind
    readonly element: DamageElement
  }
  readonly selections: readonly ScopeSelection[]
  /**
   * 固定来源原始记录能否在与本案例相同的选择下表达上游结果。简的潜能档位
   * 在 991bb0e 只存 +10% 基值与零值叠层记录，更高档位无原始投影。
   */
  readonly upstreamProjection: boolean
}

/** 中立面板：攻击 1,000、异常精通 100、等级 1、目标防御 0、目标抗性 0、暴击率 0。 */
export const scopePanel = {
  attack: 1_000,
  health: 10_000,
  defense: 500,
  impact: 100,
  anomalyProficiency: 100,
  anomalyMastery: 0,
  energyRegen: 1,
  criticalRate: 0,
  criticalDamage: 0,
  penetrationRatio: 0,
  sharpCriticalDamage: 0,
} as const

export const scopeTarget = {
  entityId: "entity:scope-target",
  teamId: "team:enemies",
  baseDefense: 0,
  isStunned: false,
  baseStunDamageMultiplier: 1,
  resistances: {},
} as const

const velinaBroadM0 = (): ScopeSelection => ({
  optionId: "agents:velina:mindscape:0:blk-ms4tpxkp-f964lw:eff-ms4tpxkp-9jh4ly",
  layers: 1,
  channel: "anomaly-damage-bonus",
  perLayer: 0.1,
  sourcePerLayer: 0.1,
  correctedKinds: ["anomaly"],
  correctedElements: ["wind"],
  differenceId: "velina-anomaly-damage-kind-scope",
  source: {
    pointer: "/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0",
    stat: "anomalyDmgBonus",
    value: 10,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["风"],
    applyTarget: "self",
  },
})

const velinaTurbulenceM0 = (): ScopeSelection => ({
  optionId: "agents:velina:mindscape:0:blk-ms4tpxkp-f964lw:eff-ms4tqvx2-vzordz",
  layers: 1,
  channel: "anomaly-damage-bonus",
  perLayer: 0.1,
  sourcePerLayer: 0.1,
  correctedKinds: ["vortex"],
  differenceId: null,
  source: {
    pointer: "/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/1",
    stat: "turbulenceDmgBonus",
    value: 10,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: "all",
    applyTarget: "self",
  },
})

const velinaBroadM2 = (): ScopeSelection => ({
  optionId: "agents:velina:mindscape:2:blk-legacy:legacy-self-anomalyDmgBonus",
  layers: 1,
  channel: "anomaly-damage-bonus",
  perLayer: 0.15,
  sourcePerLayer: 0.15,
  correctedKinds: ["anomaly"],
  correctedElements: ["wind"],
  differenceId: "velina-anomaly-damage-kind-scope",
  source: {
    pointer: "/agents/45/mindscapeBuffs/2/effectBlocks/0/effects/0",
    stat: "anomalyDmgBonus",
    value: 15,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["风"],
    applyTarget: "self",
  },
})

const velinaTurbulenceM2 = (): ScopeSelection => ({
  optionId:
    "agents:velina:mindscape:2:blk-legacy:legacy-self-turbulenceDmgBonus",
  layers: 1,
  channel: "anomaly-damage-bonus",
  perLayer: 0.15,
  sourcePerLayer: 0.15,
  correctedKinds: ["vortex"],
  differenceId: null,
  source: {
    pointer: "/agents/45/mindscapeBuffs/2/effectBlocks/0/effects/1",
    stat: "turbulenceDmgBonus",
    value: 15,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: "all",
    applyTarget: "self",
  },
})

const velinaM6Layers = (layers: number): ScopeSelection => ({
  optionId: "agents:velina:mindscape:6:blk-ms4u9q0d-b63z88:eff-ms4u9q0d-6p259j",
  layers,
  channel: "anomaly-damage-bonus",
  perLayer: 0.025,
  sourcePerLayer: 0.025,
  correctedKinds: ["anomaly"],
  correctedElements: ["wind"],
  differenceId: "velina-anomaly-damage-kind-scope",
  source: {
    pointer: "/agents/45/mindscapeBuffs/6/effectBlocks/0/effects/0",
    stat: "anomalyDmgBonus",
    value: 0,
    valuePerStack: 2.5,
    maxStacks: 16,
    defaultStacks: 16,
    elementFilter: ["风"],
    applyTarget: "self",
  },
})

const graceM0 = (): ScopeSelection => ({
  optionId: "agents:grace:mindscape:0:blk-ms4o80e9-dqsih3:eff-ms4o80e9-lgnv30",
  layers: 2,
  channel: "anomaly-damage-bonus",
  perLayer: 0.18,
  sourcePerLayer: 0.18,
  correctedKinds: ["anomaly"],
  differenceId: "grace-anomaly-damage-kind-scope",
  source: {
    pointer: "/agents/29/mindscapeBuffs/0/effectBlocks/1/effects/0",
    stat: "anomalyDmgBonus",
    value: 0,
    valuePerStack: 18,
    maxStacks: 2,
    defaultStacks: 2,
    elementFilter: ["电"],
    applyTarget: "team",
  },
})

const vivianM0 = (): ScopeSelection => ({
  optionId: "agents:vivian:mindscape:0:blk-legacy:legacy-team-anomalyDmgBonus",
  layers: 1,
  channel: "anomaly-damage-bonus",
  perLayer: 0.12,
  sourcePerLayer: 0.12,
  correctedKinds: ["anomaly"],
  differenceId: "vivian-m0-anomaly-damage-kind-scope",
  source: {
    pointer: "/agents/54/mindscapeBuffs/0/effectBlocks/0/effects/0",
    stat: "anomalyDmgBonus",
    value: 12,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["以太"],
    applyTarget: "team",
  },
})

const aliceM2 = (): ScopeSelection => ({
  optionId: "agents:alice:mindscape:2:blk-legacy:legacy-team-anomalyDmgBonus",
  layers: 1,
  channel: "anomaly-damage-bonus",
  perLayer: 0.15,
  sourcePerLayer: 0.15,
  correctedKinds: ["anomaly"],
  differenceId: "alice-anomaly-damage-kind-scope",
  source: {
    pointer: "/agents/38/mindscapeBuffs/2/effectBlocks/0/effects/0",
    stat: "anomalyDmgBonus",
    value: 15,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["物理"],
    applyTarget: "team",
  },
})

const janeCoreRate = (): ScopeSelection => ({
  optionId: "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34bcgu-8f1m63",
  layers: 1,
  channel: "anomaly-critical-rate",
  perLayer: 0.4,
  sourcePerLayer: 0.4,
  correctedKinds: ["anomaly"],
  differenceId: "jane-anomaly-critical-kind-scope",
  source: {
    pointer: "/agents/44/mindscapeBuffs/0/effectBlocks/1/effects/1",
    stat: "anomalyCritRate",
    value: 40,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["物理"],
    applyTarget: "team",
  },
})

const janeCoreDamage = (): ScopeSelection => ({
  optionId: "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34c40c-3b3j3z",
  layers: 1,
  channel: "anomaly-critical-damage",
  perLayer: 0.5,
  sourcePerLayer: 0.5,
  correctedKinds: ["anomaly"],
  differenceId: "jane-anomaly-critical-kind-scope",
  source: {
    pointer: "/agents/44/mindscapeBuffs/0/effectBlocks/1/effects/4",
    stat: "anomalyCritDmg",
    value: 50,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["物理"],
    applyTarget: "team",
  },
})

/** 面板异常精通 100、来源初始基值 0、每点 0.16% → 16%。 */
const janeCoreConversion = (): ScopeSelection => ({
  optionId: "agents:jane:mindscape:0:blk-ms349twy-zgu7b6:eff-ms34ci0p-usidux",
  layers: 1,
  channel: "anomaly-critical-rate",
  perLayer: 0.16,
  sourcePerLayer: 0.16,
  correctedKinds: ["anomaly"],
  differenceId: "jane-anomaly-critical-kind-scope",
  source: {
    pointer: "/agents/44/mindscapeBuffs/0/effectBlocks/1/effects/7",
    stat: "anomalyCritRate",
    value: 0,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["物理"],
    applyTarget: "team",
  },
})

const janePotential = (perLayer: number): ScopeSelection => ({
  optionId: "agents:jane:mindscape:0:blk-ms34gorp-m9dlxw:eff-ms34gorp-xrbl8x",
  layers: 1,
  channel: "anomaly-critical-damage",
  perLayer,
  sourcePerLayer: 0.1,
  correctedKinds: ["anomaly"],
  correctedElements: ["physical"],
  differenceId: "jane-anomaly-critical-kind-scope",
  source: {
    pointer: "/agents/44/mindscapeBuffs/0/effectBlocks/2/effects/0",
    stat: "anomalyCritDmg",
    value: 10,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["物理"],
    applyTarget: "self",
  },
})

const janeM2 = (): ScopeSelection => ({
  optionId: "agents:jane:mindscape:2:blk-legacy:legacy-team-anomalyCritDmg",
  layers: 1,
  channel: "anomaly-critical-damage",
  perLayer: 0.5,
  sourcePerLayer: 0.5,
  correctedKinds: ["anomaly"],
  differenceId: "jane-anomaly-critical-kind-scope",
  source: {
    pointer: "/agents/44/mindscapeBuffs/2/effectBlocks/0/effects/1",
    stat: "anomalyCritDmg",
    value: 50,
    valuePerStack: 0,
    maxStacks: 1,
    defaultStacks: 1,
    elementFilter: ["物理"],
    applyTarget: "team",
  },
})

const joyauBroad = (refinement: 1 | 2 | 3 | 4 | 5): ScopeSelection => {
  const percent = [7, 8, 9, 10, 11][refinement - 1]!
  return {
    optionId:
      "w-engines:Joyau_Dore:refinement:blk-legacy:legacy-self-anomalyDmgBonus",
    layers: 1,
    channel: "anomaly-damage-bonus",
    perLayer: percent / 100,
    sourcePerLayer: percent / 100,
    correctedKinds: ["anomaly"],
    correctedElements: ["wind"],
    differenceId: "joyau-dore-anomaly-damage-kind-scope",
    source: {
      pointer: `/wengines/74/refinementBuffs/${refinement - 1}/effectBlocks/0/effects/1`,
      stat: "anomalyDmgBonus",
      value: 0,
      valuePerStack: percent,
      maxStacks: 2,
      defaultStacks: 2,
      elementFilter: ["风"],
      applyTarget: "self",
    },
  }
}

const joyauTurbulence = (refinement: 1 | 2 | 3 | 4 | 5): ScopeSelection => {
  const percent = [7, 8, 9, 10, 11][refinement - 1]!
  return {
    optionId:
      "w-engines:Joyau_Dore:refinement:blk-legacy:legacy-self-turbulenceDmgBonus",
    layers: 1,
    channel: "anomaly-damage-bonus",
    perLayer: percent / 100,
    sourcePerLayer: percent / 100,
    correctedKinds: ["vortex"],
    differenceId: null,
    source: {
      pointer: `/wengines/74/refinementBuffs/${refinement - 1}/effectBlocks/0/effects/2`,
      stat: "turbulenceDmgBonus",
      value: 0,
      valuePerStack: percent,
      maxStacks: 2,
      defaultStacks: 2,
      elementFilter: "all",
      applyTarget: "self",
    },
  }
}

const wrathfulR2 = (): ScopeSelection => ({
  optionId:
    "w-engines:Wrathful_Vajra:refinement:blk-legacy:legacy-self-turbulenceDmgBonus",
  layers: 1,
  channel: "sheer-damage-bonus",
  perLayer: 0.1035,
  sourcePerLayer: 0.1035,
  correctedKinds: ["sheer"],
  correctedElements: ["fire"],
  differenceId: "wrathful-vajra-r2-fire-sheer-stat",
  sourceStatCorrected: true,
  source: {
    pointer: "/wengines/42/refinementBuffs/1/effectBlocks/0/effects/1",
    stat: "turbulenceDmgBonus",
    value: 0,
    valuePerStack: 10.35,
    maxStacks: 2,
    defaultStacks: 2,
    elementFilter: ["火"],
    applyTarget: "self",
  },
})

const velinaHolder = {
  agentName: "Velina",
  element: "wind",
  mindscapeRank: 0,
  coreSkillLevel: 7,
  potentialLevel: 0,
} as const

const janeHolder = {
  agentName: "Jane",
  element: "physical",
  mindscapeRank: 0,
  coreSkillLevel: 7,
  potentialLevel: 0,
} as const

export const scopeCases: readonly ScopeCase[] = [
  // ── revision 54：维琳娜宽口径只保留普通风化异常 ────────────────────────
  {
    caseId: "velina-m0-anomaly",
    correction: "revision-54",
    holder: velinaHolder,
    wEngine: null,
    hit: { kind: "anomaly", element: "wind" },
    selections: [velinaBroadM0()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m0-vortex-broad-only",
    correction: "revision-54",
    holder: velinaHolder,
    wEngine: null,
    hit: { kind: "vortex", element: "wind" },
    selections: [velinaBroadM0()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m0-vortex-both",
    correction: "revision-54",
    holder: velinaHolder,
    wEngine: null,
    hit: { kind: "vortex", element: "wind" },
    selections: [velinaBroadM0(), velinaTurbulenceM0()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m0-anomaly-settlement",
    correction: "revision-54",
    holder: velinaHolder,
    wEngine: null,
    hit: { kind: "anomaly-settlement", element: "wind" },
    selections: [velinaBroadM0()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m0-luminize",
    correction: "revision-54",
    holder: velinaHolder,
    wEngine: null,
    hit: { kind: "luminize", element: "lumiflux" },
    selections: [velinaBroadM0()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m2-anomaly",
    correction: "revision-54",
    holder: { ...velinaHolder, mindscapeRank: 2 },
    wEngine: null,
    hit: { kind: "anomaly", element: "wind" },
    selections: [velinaBroadM2()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m2-vortex-both",
    correction: "revision-54",
    holder: { ...velinaHolder, mindscapeRank: 2 },
    wEngine: null,
    hit: { kind: "vortex", element: "wind" },
    selections: [velinaBroadM2(), velinaTurbulenceM2()],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m6-anomaly",
    correction: "revision-54",
    holder: { ...velinaHolder, mindscapeRank: 6 },
    wEngine: null,
    hit: { kind: "anomaly", element: "wind" },
    selections: [velinaM6Layers(4)],
    upstreamProjection: true,
  },
  {
    caseId: "velina-m6-vortex",
    correction: "revision-54",
    holder: { ...velinaHolder, mindscapeRank: 6 },
    wEngine: null,
    hit: { kind: "vortex", element: "wind" },
    selections: [velinaM6Layers(4)],
    upstreamProjection: true,
  },

  // ── revision 55：格莉丝、薇薇安、爱丽丝、简、琳琅鎏心 ────────────────────
  {
    caseId: "grace-anomaly",
    correction: "revision-55",
    holder: {
      agentName: "Grace",
      element: "electric",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "anomaly", element: "electric" },
    selections: [graceM0()],
    upstreamProjection: true,
  },
  {
    caseId: "grace-anomaly-settlement",
    correction: "revision-55",
    holder: {
      agentName: "Grace",
      element: "electric",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "anomaly-settlement", element: "electric" },
    selections: [graceM0()],
    upstreamProjection: true,
  },
  {
    caseId: "grace-vortex",
    correction: "revision-55",
    holder: {
      agentName: "Grace",
      element: "electric",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "vortex", element: "electric" },
    selections: [graceM0()],
    upstreamProjection: true,
  },
  {
    caseId: "grace-luminize",
    correction: "revision-55",
    holder: {
      agentName: "Grace",
      element: "electric",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "luminize", element: "lumiflux" },
    selections: [graceM0()],
    upstreamProjection: true,
  },
  {
    caseId: "vivian-m0-anomaly",
    correction: "revision-55",
    holder: {
      agentName: "Vivian",
      element: "ether",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "anomaly", element: "ether" },
    selections: [vivianM0()],
    upstreamProjection: true,
  },
  {
    caseId: "vivian-m0-anomaly-settlement",
    correction: "revision-55",
    holder: {
      agentName: "Vivian",
      element: "ether",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "anomaly-settlement", element: "ether" },
    selections: [vivianM0()],
    upstreamProjection: true,
  },
  {
    caseId: "vivian-m0-vortex",
    correction: "revision-55",
    holder: {
      agentName: "Vivian",
      element: "ether",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "vortex", element: "ether" },
    selections: [vivianM0()],
    upstreamProjection: true,
  },
  {
    caseId: "vivian-m0-luminize",
    correction: "revision-55",
    holder: {
      agentName: "Vivian",
      element: "ether",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "luminize", element: "lumiflux" },
    selections: [vivianM0()],
    upstreamProjection: true,
  },
  {
    caseId: "alice-m2-anomaly",
    correction: "revision-55",
    holder: {
      agentName: "Alice",
      element: "physical",
      mindscapeRank: 2,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "anomaly", element: "physical" },
    selections: [aliceM2()],
    upstreamProjection: true,
  },
  {
    caseId: "alice-m2-anomaly-settlement",
    correction: "revision-55",
    holder: {
      agentName: "Alice",
      element: "physical",
      mindscapeRank: 2,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "anomaly-settlement", element: "physical" },
    selections: [aliceM2()],
    upstreamProjection: true,
  },
  {
    caseId: "alice-m2-vortex",
    correction: "revision-55",
    holder: {
      agentName: "Alice",
      element: "physical",
      mindscapeRank: 2,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "vortex", element: "physical" },
    selections: [aliceM2()],
    upstreamProjection: true,
  },
  {
    caseId: "alice-m2-luminize",
    correction: "revision-55",
    holder: {
      agentName: "Alice",
      element: "physical",
      mindscapeRank: 2,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: null,
    hit: { kind: "luminize", element: "lumiflux" },
    selections: [aliceM2()],
    upstreamProjection: true,
  },
  {
    caseId: "jane-core-anomaly",
    correction: "revision-55",
    holder: janeHolder,
    wEngine: null,
    hit: { kind: "anomaly", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janeCoreConversion()],
    upstreamProjection: true,
  },
  {
    caseId: "jane-core-anomaly-settlement",
    correction: "revision-55",
    holder: janeHolder,
    wEngine: null,
    hit: { kind: "anomaly-settlement", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janeCoreConversion()],
    upstreamProjection: true,
  },
  {
    caseId: "jane-core-vortex",
    correction: "revision-55",
    holder: janeHolder,
    wEngine: null,
    hit: { kind: "vortex", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janeCoreConversion()],
    upstreamProjection: true,
  },
  {
    caseId: "jane-m2-anomaly",
    correction: "revision-55",
    holder: { ...janeHolder, mindscapeRank: 2 },
    wEngine: null,
    hit: { kind: "anomaly", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janeM2()],
    upstreamProjection: true,
  },
  {
    caseId: "jane-m2-vortex",
    correction: "revision-55",
    holder: { ...janeHolder, mindscapeRank: 2 },
    wEngine: null,
    hit: { kind: "vortex", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janeM2()],
    upstreamProjection: true,
  },
  {
    caseId: "jane-potential-anomaly",
    correction: "revision-55",
    holder: { ...janeHolder, potentialLevel: 2 },
    wEngine: null,
    hit: { kind: "anomaly", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janePotential(0.1)],
    upstreamProjection: true,
  },
  {
    caseId: "jane-potential-vortex",
    correction: "revision-55",
    holder: { ...janeHolder, potentialLevel: 2 },
    wEngine: null,
    hit: { kind: "vortex", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janePotential(0.1)],
    upstreamProjection: true,
  },
  {
    caseId: "jane-potential-v-anomaly",
    correction: "revision-55",
    holder: { ...janeHolder, potentialLevel: 5 },
    wEngine: null,
    hit: { kind: "anomaly", element: "physical" },
    selections: [janeCoreRate(), janeCoreDamage(), janePotential(0.25)],
    upstreamProjection: false,
  },
  {
    caseId: "joyau-r1-anomaly",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 1 },
    hit: { kind: "anomaly", element: "wind" },
    selections: [joyauBroad(1)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r2-anomaly",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 2 },
    hit: { kind: "anomaly", element: "wind" },
    selections: [joyauBroad(2)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r3-anomaly",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 3 },
    hit: { kind: "anomaly", element: "wind" },
    selections: [joyauBroad(3)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r4-anomaly",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 4 },
    hit: { kind: "anomaly", element: "wind" },
    selections: [joyauBroad(4)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r5-anomaly",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 5 },
    hit: { kind: "anomaly", element: "wind" },
    selections: [joyauBroad(5)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r1-anomaly-settlement",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 1 },
    hit: { kind: "anomaly-settlement", element: "wind" },
    selections: [joyauBroad(1)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r2-anomaly-settlement",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 2 },
    hit: { kind: "anomaly-settlement", element: "wind" },
    selections: [joyauBroad(2)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r3-anomaly-settlement",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 3 },
    hit: { kind: "anomaly-settlement", element: "wind" },
    selections: [joyauBroad(3)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r4-anomaly-settlement",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 4 },
    hit: { kind: "anomaly-settlement", element: "wind" },
    selections: [joyauBroad(4)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r5-anomaly-settlement",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 5 },
    hit: { kind: "anomaly-settlement", element: "wind" },
    selections: [joyauBroad(5)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r1-vortex-both",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 1 },
    hit: { kind: "vortex", element: "wind" },
    selections: [joyauBroad(1), joyauTurbulence(1)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r2-vortex-both",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 2 },
    hit: { kind: "vortex", element: "wind" },
    selections: [joyauBroad(2), joyauTurbulence(2)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r3-vortex-both",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 3 },
    hit: { kind: "vortex", element: "wind" },
    selections: [joyauBroad(3), joyauTurbulence(3)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r4-vortex-both",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 4 },
    hit: { kind: "vortex", element: "wind" },
    selections: [joyauBroad(4), joyauTurbulence(4)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r5-vortex-both",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 5 },
    hit: { kind: "vortex", element: "wind" },
    selections: [joyauBroad(5), joyauTurbulence(5)],
    upstreamProjection: true,
  },
  {
    caseId: "joyau-r1-luminize",
    correction: "revision-55",
    holder: velinaHolder,
    wEngine: { name: "Joyau Dore", refinement: 1 },
    hit: { kind: "luminize", element: "lumiflux" },
    selections: [joyauBroad(1)],
    upstreamProjection: true,
  },

  // ── revision 56：怒目金刚精炼 2 只强化火属性贯穿伤害 ────────────────────
  {
    caseId: "wrathful-r2-fire-sheer",
    correction: "revision-56",
    holder: {
      agentName: "Banyue",
      element: "fire",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: { name: "Wrathful Vajra", refinement: 2 },
    hit: { kind: "sheer", element: "fire" },
    selections: [wrathfulR2()],
    upstreamProjection: true,
  },
  {
    caseId: "wrathful-r2-ice-sheer",
    correction: "revision-56",
    holder: {
      agentName: "Banyue",
      element: "fire",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: { name: "Wrathful Vajra", refinement: 2 },
    hit: { kind: "sheer", element: "ice" },
    selections: [wrathfulR2()],
    upstreamProjection: true,
  },
  {
    caseId: "wrathful-r2-fire-vortex",
    correction: "revision-56",
    holder: {
      agentName: "Banyue",
      element: "fire",
      mindscapeRank: 0,
      coreSkillLevel: 7,
      potentialLevel: 0,
    },
    wEngine: { name: "Wrathful Vajra", refinement: 2 },
    hit: { kind: "vortex", element: "fire" },
    selections: [wrathfulR2()],
    upstreamProjection: true,
  },
]

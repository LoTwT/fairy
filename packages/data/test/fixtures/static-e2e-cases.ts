import type {
  AgentName,
  WEngineName,
  SkillLevelInput,
} from "../../src/index.ts"
import type {
  StaticActorConfiguration,
  StaticActionCalculationInput,
} from "../../../core/src/index.ts"

type Disc = NonNullable<StaticActorConfiguration["driveDiscs"][1]>
type Substat = NonNullable<Disc["substats"]>[number]
const substat = (
  attribute: Substat["attribute"],
  operation: Substat["operation"],
  rolls: number,
): Substat => ({ attribute, operation, rolls })
const percent = (attribute: Substat["attribute"], rolls: number) =>
  substat(attribute, "initial-percentage", rolls)
const flat = (attribute: Substat["attribute"], rolls: number) =>
  substat(attribute, "initial-fixed", rolls)
const critical = (attribute: Substat["attribute"], rolls: number) =>
  substat(attribute, "ratio-add", rolls)

function discs(
  sets: readonly string[],
  mains: readonly NonNullable<
    StaticActorConfiguration["driveDiscs"][1]
  >["mainStat"][],
  substats: readonly NonNullable<
    StaticActorConfiguration["driveDiscs"][1]
  >["substats"][],
): StaticActorConfiguration["driveDiscs"] {
  return Object.fromEntries(
    sets.map((setEntityId, index) => [
      index + 1,
      {
        setEntityId,
        mainStat: mains[index],
        substats: substats[index],
      },
    ]),
  ) as StaticActorConfiguration["driveDiscs"]
}

export interface AcceptanceBuild {
  agentName: AgentName
  wEngineName: WEngineName
  upstreamAgentId: string
  upstreamWEngineId: string
  upstreamSets: readonly [string, string]
  actor: StaticActorConfiguration
}

const nicole: AcceptanceBuild = {
  agentName: "Nicole",
  wEngineName: "The Vault",
  upstreamAgentId: "nicole",
  upstreamWEngineId: "The_Vault",
  upstreamSets: ["hormone", "woodpecker"],
  actor: {
    entityId: "entity:nicole",
    teamId: "team:players",
    agentEntityId: "1031",
    coreSkillLevel: 7,
    mindscapeRank: 6,
    wEngine: { entityId: "13103", refinement: 3, eligible: true },
    panel: { mode: "equipment" },
    driveDiscs: discs(
      ["31400", "31400", "31400", "31400", "31000", "31000"],
      [
        { attribute: "health" },
        { attribute: "attack" },
        { attribute: "defense" },
        { attribute: "criticalDamage" },
        { attribute: "damageBonus", element: "physical" },
        { attribute: "attack" },
      ],
      [
        [
          percent("attack", 3),
          critical("criticalRate", 3),
          critical("criticalDamage", 2),
          flat("penetrationValue", 1),
        ],
        [
          percent("attack", 3),
          critical("criticalRate", 3),
          critical("criticalDamage", 2),
          flat("health", 1),
        ],
        [
          percent("attack", 3),
          critical("criticalRate", 3),
          critical("criticalDamage", 2),
          flat("health", 1),
        ],
        [
          percent("attack", 3),
          critical("criticalRate", 3),
          flat("attack", 2),
          flat("penetrationValue", 1),
        ],
        [
          percent("attack", 3),
          critical("criticalRate", 3),
          critical("criticalDamage", 2),
          flat("attack", 1),
        ],
        [
          critical("criticalRate", 3),
          critical("criticalDamage", 3),
          flat("attack", 2),
          flat("health", 1),
        ],
      ],
    ),
  },
}
const astra: AcceptanceBuild = {
  agentName: "Astra Yao",
  wEngineName: "Elegant Vanity",
  upstreamAgentId: "astrayao",
  upstreamWEngineId: "Elegant_Vanity",
  upstreamSets: ["SuitAstralVoice", "hormone"],
  actor: {
    entityId: "entity:astra",
    teamId: "team:players",
    agentEntityId: "1311",
    coreSkillLevel: 7,
    mindscapeRank: 0,
    wEngine: { entityId: "14131", refinement: 3, eligible: true },
    panel: { mode: "equipment" },
    driveDiscs: discs(
      ["32800", "32800", "32800", "32800", "31400", "31400"],
      [
        { attribute: "health" },
        { attribute: "attack" },
        { attribute: "defense" },
        { attribute: "attack" },
        { attribute: "attack" },
        { attribute: "attack" },
      ],
      [
        [
          percent("attack", 5),
          flat("attack", 2),
          critical("criticalRate", 1),
          critical("criticalDamage", 1),
        ],
        [
          percent("attack", 5),
          percent("health", 2),
          critical("criticalRate", 1),
          critical("criticalDamage", 1),
        ],
        [
          percent("attack", 5),
          flat("attack", 2),
          critical("criticalRate", 1),
          critical("criticalDamage", 1),
        ],
        ...Array.from({ length: 3 }, () => [
          flat("attack", 2),
          percent("health", 5),
          critical("criticalRate", 1),
          critical("criticalDamage", 1),
        ]),
      ],
    ),
  },
}
const ben: AcceptanceBuild = {
  agentName: "Ben",
  wEngineName: "Big Cylinder",
  upstreamAgentId: "benbigger",
  upstreamWEngineId: "Big_Cylinder",
  upstreamSets: ["hormone", "SuitThornedRose"],
  actor: {
    entityId: "entity:ben",
    teamId: "team:players",
    agentEntityId: "1121",
    coreSkillLevel: 3,
    mindscapeRank: 0,
    wEngine: { entityId: "13112", refinement: 5, eligible: true },
    panel: { mode: "equipment" },
    driveDiscs: discs(
      ["31400", "31400", "31400", "31400", "34200", "34200"],
      [
        { attribute: "health" },
        { attribute: "attack" },
        { attribute: "defense" },
        { attribute: "defense" },
        { attribute: "defense" },
        { attribute: "defense" },
      ],
      Array.from({ length: 6 }, () => [
        percent("attack", 3),
        critical("criticalRate", 3),
        critical("criticalDamage", 2),
        percent("health", 1),
      ]),
    ),
  },
}
const yixuan: AcceptanceBuild = {
  agentName: "Yixuan",
  wEngineName: "Qingming Birdcage",
  upstreamAgentId: "yixuan",
  upstreamWEngineId: "Qingming_Birdcage",
  upstreamSets: ["SuitYunkuiTales", "woodpecker"],
  actor: {
    entityId: "entity:yixuan",
    teamId: "team:players",
    agentEntityId: "1371",
    coreSkillLevel: 7,
    mindscapeRank: 0,
    wEngine: { entityId: "14137", refinement: 1, eligible: true },
    panel: { mode: "equipment" },
    driveDiscs: discs(
      ["33100", "33100", "33100", "33100", "31000", "31000"],
      [
        { attribute: "health" },
        { attribute: "attack" },
        { attribute: "defense" },
        { attribute: "criticalDamage" },
        { attribute: "damageBonus", element: "ether" },
        { attribute: "health" },
      ],
      [
        ...Array.from({ length: 5 }, () => [
          percent("health", 4),
          critical("criticalRate", 2),
          percent("attack", 2),
          flat("penetrationValue", 1),
        ]),
        [
          flat("health", 4),
          critical("criticalRate", 2),
          percent("attack", 2),
          flat("penetrationValue", 1),
        ],
      ],
    ),
  },
}
export const builds: Record<string, AcceptanceBuild> = {
  nicole,
  astra,
  ben,
  yixuan,
  astraM2: { ...astra, actor: { ...astra.actor, mindscapeRank: 2 } },
  benF: {
    ...ben,
    actor: { ...ben.actor, coreSkillLevel: 7, mindscapeRank: 4 },
  },
}

// Each pointer identifies the actual pinned upstream effect, not a value derived from Fairy.
export const effects = {
  nicoleDefense: {
    holderId: "entity:nicole",
    optionId: "agents:nicole:mindscape:0:blk-legacy:legacy-team-reduceDefense",
    pointer: "/agents/14/mindscapeBuffs/0/effectBlocks/0/effects/0",
  },
  nicoleHormone: {
    holderId: "entity:nicole",
    optionId:
      "drive-discs:hormone:setPieces:4:blk-legacy:legacy-self-inCombatAtkPercent",
    pointer: "/driveDiscs/19/fourPieceBuffs/effectBlocks/0/effects/0",
  },
  vault: {
    holderId: "entity:nicole",
    optionId: "w-engines:The_Vault:refinement:blk-legacy:legacy-self-dmgBonus",
    pointer: "/wengines/75/refinementBuffs/2/effectBlocks/0/effects/0",
  },
  astraAttack: {
    holderId: "entity:astra",
    optionId:
      "agents:astrayao:mindscape:0:blk-ms38hwcr-q7y9sx:eff-ms38hwcr-m9hn4v",
    pointer: "/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0",
  },
  astraDamage: {
    holderId: "entity:astra",
    optionId: "agents:astrayao:mindscape:0:blk-legacy:legacy-team-dmgBonus",
    pointer: "/agents/45/mindscapeBuffs/0/effectBlocks/0/effects/0",
  },
  astraCritical: {
    holderId: "entity:astra",
    optionId: "agents:astrayao:mindscape:0:blk-legacy:legacy-team-critDmg",
    pointer: "/agents/45/mindscapeBuffs/0/effectBlocks/0/effects/1",
  },
  vanity: {
    holderId: "entity:astra",
    optionId:
      "w-engines:Elegant_Vanity:refinement:blk-legacy:legacy-team-dmgBonus",
    pointer: "/wengines/67/refinementBuffs/2/effectBlocks/0/effects/0",
  },
  benHormone: {
    holderId: "entity:ben",
    optionId:
      "drive-discs:hormone:setPieces:4:blk-legacy:legacy-self-inCombatAtkPercent",
    pointer: "/driveDiscs/19/fourPieceBuffs/effectBlocks/0/effects/0",
  },
  yixuanCore: {
    holderId: "entity:yixuan",
    optionId: "agents:yixuan:mindscape:0:blk-legacy:legacy-self-skillDmgBonus",
    pointer: "/agents/2/mindscapeBuffs/0/effectBlocks/0/effects/0",
  },
  cageCritical: {
    holderId: "entity:yixuan",
    optionId:
      "w-engines:Qingming_Birdcage:refinement:blk-legacy:legacy-self-critRate",
    pointer: "/wengines/92/refinementBuffs/0/effectBlocks/0/effects/0",
  },
  cageDamage: {
    holderId: "entity:yixuan",
    optionId:
      "w-engines:Qingming_Birdcage:refinement:blk-legacy:eff-ms1r8tz7-juw8rc",
    pointer: "/wengines/92/refinementBuffs/0/effectBlocks/0/effects/1",
  },
  cageSheer: {
    holderId: "entity:yixuan",
    optionId:
      "w-engines:Qingming_Birdcage:refinement:blk-legacy:eff-ms1r9equ-l7imtb",
    pointer: "/wengines/92/refinementBuffs/0/effectBlocks/0/effects/2",
  },
  yunkuiCritical: {
    holderId: "entity:yixuan",
    optionId:
      "drive-discs:SuitYunkuiTales:setPieces:4:blk-legacy:legacy-self-critRate",
    pointer: "/driveDiscs/0/fourPieceBuffs/effectBlocks/0/effects/0",
  },
  yunkuiSheer: {
    holderId: "entity:yixuan",
    optionId:
      "drive-discs:SuitYunkuiTales:setPieces:4:blk-legacy:legacy-self-pierceDmgBonus",
    pointer: "/driveDiscs/0/fourPieceBuffs/effectBlocks/0/effects/1",
  },
} as const

export interface AcceptanceScenario {
  id: string
  label: string
  buildIds: string[]
  actionId: string
  levels: Partial<Record<"basic" | "assist" | "special", SkillLevelInput>>
  target: StaticActionCalculationInput["target"]
  buffs: { effect: keyof typeof effects; layers: number }[]
}
const normalTarget: StaticActionCalculationInput["target"] = {
  entityId: "entity:target",
  teamId: "team:enemies",
  baseDefense: 921.04,
  resistances: { physical: 0, ether: 0.2 },
  isStunned: false,
  baseStunDamageMultiplier: 1,
}
const nicoleCase = {
  actionId: "action:agent:1031:basic-enhanced-1",
  levels: { basic: { mode: "effective", value: 15 } } as const,
  target: normalTarget,
}
const buff = (effect: keyof typeof effects, layers = 1) => ({ effect, layers })
const nicoleBuffs = [
  buff("nicoleDefense"),
  buff("nicoleHormone"),
  buff("vault"),
]
const astraBuffs = [
  buff("astraAttack"),
  buff("astraDamage"),
  buff("astraCritical"),
]
const yixuanBuffs = [
  buff("yixuanCore"),
  buff("cageCritical"),
  buff("cageDamage", 2),
  buff("cageSheer"),
  buff("yunkuiCritical", 3),
  buff("yunkuiSheer"),
]
export const scenarios: AcceptanceScenario[] = [
  {
    id: "nicole-unbuffed",
    label: "妮可完整配装，条件增益关闭",
    buildIds: ["nicole"],
    ...nicoleCase,
    buffs: [],
  },
  {
    id: "nicole-self",
    label: "妮可减防、激素四件与聚宝箱 R3",
    buildIds: ["nicole"],
    ...nicoleCase,
    buffs: nicoleBuffs,
  },
  {
    id: "nicole-team-one",
    label: "妮可＋耀嘉音 M0，妆匣 R3 一层",
    buildIds: ["nicole", "astra"],
    ...nicoleCase,
    buffs: [...nicoleBuffs, ...astraBuffs, buff("vanity")],
  },
  {
    id: "nicole-team-two",
    label: "同配置妆匣 R3 两层",
    buildIds: ["nicole", "astra"],
    ...nicoleCase,
    buffs: [...nicoleBuffs, ...astraBuffs, buff("vanity", 2)],
  },
  {
    id: "nicole-astra-m2",
    label: "耀嘉音 M2 封顶具名修正",
    buildIds: ["nicole", "astraM2"],
    ...nicoleCase,
    buffs: [...nicoleBuffs, ...astraBuffs, buff("vanity", 2)],
  },
  {
    id: "ben-core-b",
    label: "本核心 B，防御转攻击 52%",
    buildIds: ["ben"],
    actionId: "action:agent:1121:action:0001",
    levels: { assist: { mode: "trained", value: 10 } },
    target: {
      ...normalTarget,
      resistances: { fire: 0.2 },
      isStunned: true,
      baseStunDamageMultiplier: 1.5,
    },
    buffs: [],
  },
  {
    id: "ben-core-f",
    label: "本核心 F、M4 技能加级、激素四件",
    buildIds: ["benF"],
    actionId: "action:agent:1121:action:0001",
    levels: { assist: { mode: "trained", value: 10 } },
    target: {
      ...normalTarget,
      resistances: { fire: 0.2 },
      isStunned: true,
      baseStunDamageMultiplier: 1.5,
    },
    buffs: [buff("benHormone")],
  },
  {
    id: "yixuan-self",
    label: "仪玄玄墨贯穿、青溟 R1 与云岿四件",
    buildIds: ["yixuan"],
    actionId: "action:agent:1371:action:0024",
    levels: { special: { mode: "trained", value: 12 } },
    target: {
      ...normalTarget,
      baseDefense: 1200,
      resistances: { ether: -0.2 },
      isStunned: true,
      baseStunDamageMultiplier: 1.5,
    },
    buffs: yixuanBuffs,
  },
  {
    id: "yixuan-team",
    label: "仪玄＋耀嘉音，新增攻击只转换贯穿增量",
    buildIds: ["yixuan", "astra"],
    actionId: "action:agent:1371:action:0024",
    levels: { special: { mode: "trained", value: 12 } },
    target: {
      ...normalTarget,
      baseDefense: 1200,
      resistances: { ether: -0.2 },
      isStunned: true,
      baseStunDamageMultiplier: 1.5,
    },
    buffs: [...yixuanBuffs, ...astraBuffs, buff("vanity", 2)],
  },
]

import {
  agentSourceIds,
  loadStaticCalculationData,
  resolveAgentAction,
  wEngineSourceIds,
} from "../../src/index.ts"
import type { AgentName, WEngineName } from "../../src/index.ts"
import {
  calculateStaticActionDamage,
  staticSourceBindingId,
} from "../../../core/src/index.ts"
import type {
  StaticActorConfiguration,
  StaticActionCalculationInput,
} from "../../../core/src/index.ts"

type Disc = NonNullable<StaticActorConfiguration["driveDiscs"][1]>
type Substat = NonNullable<Disc["substats"]>[number]

export interface StaticComparisonBuild {
  agentName: AgentName
  wEngineName: WEngineName
  upstreamAgentId: string | null
  upstreamWEngineId: string | null
  actor: StaticActorConfiguration
}

const substat = (
  attribute: Substat["attribute"],
  operation: Substat["operation"],
  rolls: number,
): Substat => ({ attribute, operation, rolls })

function createDriveDiscs(
  scale: "attack" | "health" | "defense",
  element: "fire" | "ether" | "electric" | "wind" | "physical",
  setEntityId: string,
): StaticActorConfiguration["driveDiscs"] {
  const result: {
    -readonly [K in keyof StaticActorConfiguration["driveDiscs"]]: Disc | null
  } = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
  for (const slot of [1, 2, 3, 4, 5, 6] as const) {
    const mainStat: Disc["mainStat"] =
      slot === 1
        ? { attribute: "health" }
        : slot === 2
          ? { attribute: "attack" }
          : slot === 3
            ? { attribute: "defense" }
            : slot === 4
              ? { attribute: "criticalDamage" }
              : slot === 5
                ? { attribute: "damageBonus", element }
                : { attribute: scale }
    result[slot] = {
      setEntityId: slot <= 4 ? setEntityId : "31000",
      mainStat,
      substats:
        slot === 4
          ? [
              substat(scale, "initial-percentage", 3),
              substat("criticalRate", "ratio-add", 3),
              substat(scale, "initial-fixed", 2),
              substat("penetrationValue", "initial-fixed", 1),
            ]
          : slot === 6
            ? [
                substat(scale, "initial-fixed", 3),
                substat("criticalRate", "ratio-add", 2),
                substat("criticalDamage", "ratio-add", 3),
                substat("penetrationValue", "initial-fixed", 1),
              ]
            : [
                substat(scale, "initial-percentage", 3),
                substat("criticalRate", "ratio-add", 2),
                substat("criticalDamage", "ratio-add", 3),
                substat("penetrationValue", "initial-fixed", 1),
              ],
    }
  }
  return result
}

function createBuild(
  key: string,
  agentName: AgentName,
  agentEntityId: string,
  upstreamAgentId: string | null,
  wEngineName: WEngineName,
  wEngineEntityId: string,
  upstreamWEngineId: string | null,
  scale: "attack" | "health" | "defense",
  element: "fire" | "ether" | "electric" | "wind" | "physical",
  setEntityId: string,
  mindscapeRank: StaticActorConfiguration["mindscapeRank"],
  refinement: NonNullable<StaticActorConfiguration["wEngine"]>["refinement"],
): StaticComparisonBuild {
  return {
    agentName,
    wEngineName,
    upstreamAgentId,
    upstreamWEngineId,
    actor: {
      entityId: `entity:${key}`,
      teamId: "team:players",
      agentEntityId,
      coreSkillLevel: 7,
      mindscapeRank,
      potentialLevel: 0,
      skillLevels: {
        basic: { mode: "effective", value: 12 },
        dodge: { mode: "effective", value: 12 },
        assist: { mode: "effective", value: 12 },
        special: { mode: "effective", value: 12 },
        chain: { mode: "effective", value: 12 },
      },
      wEngine: { entityId: wEngineEntityId, refinement, eligible: true },
      panel: { mode: "equipment" },
      driveDiscs: createDriveDiscs(scale, element, setEntityId),
    },
  }
}

// Raw choices and roll counts only: neither calculator's resolved panel is an input here.
export const builds = {
  soldier: createBuild(
    "soldier",
    "Soldier 11",
    "1041",
    "soldier_11",
    "The Brimstone",
    "14104",
    "zzz_wiki_223",
    "attack",
    "fire",
    "31400",
    2,
    3,
  ),
  yixuan: createBuild(
    "yixuan",
    "Yixuan",
    "1371",
    "yixuan",
    "Qingming Birdcage",
    "14137",
    "zzz_wiki_1342",
    "health",
    "ether",
    "33100",
    0,
    1,
  ),
  claret: createBuild(
    "claret",
    "Claret",
    "1611",
    "claret",
    "Crimson Thirst",
    "14161",
    "zzz_wiki_2188",
    "defense",
    "electric",
    "31500",
    4,
    2,
  ),
  remielle: createBuild(
    "remielle",
    "Remielle",
    "1581",
    "remielle_dan",
    "Ode of Resurrected Wings",
    "14158",
    "zzz_wiki_2109",
    "attack",
    "ether",
    "31400",
    2,
    1,
  ),
  alice: createBuild(
    "alice",
    "Alice",
    "1401",
    "alice_thymefield",
    "Practiced Perfection",
    "14140",
    "tenfold_starforge",
    "attack",
    "physical",
    "31400",
    0,
    1,
  ),
  // Upstream has teammate buffs only, so its source-panel assembly is explicitly uncovered.
  roxy: createBuild(
    "roxy",
    "Roxy",
    "1621",
    null,
    "Crimson Moon Casket",
    "14162",
    null,
    "attack",
    "wind",
    "31400",
    2,
    1,
  ),
} satisfies Record<string, StaticComparisonBuild>

export type BuildId = keyof typeof builds
export type DamageActor = "soldier" | "yixuan" | "claret"

export const actions = {
  soldier: {
    fairy: "action:agent:1041:action:0010",
    category: "basic",
    move: "fire_suppression",
    row: "hit_1",
    kind: "direct",
    element: "fire",
    level: 12,
  },
  yixuan: {
    fairy: "action:agent:1371:action:0024",
    category: "special",
    move: "cloud_condensing_art",
    row: "charged_total_damage",
    kind: "sheer",
    element: "ether",
    level: 12,
  },
  claret: {
    fairy: "action:agent:1611:action:0019",
    category: "chain",
    move: "ultimate_hundred_hammers",
    row: "damage",
    kind: "sharp",
    element: "electric",
    level: 12,
  },
} as const

export const options = {
  soldierCore:
    "agents:soldier11:mindscape:0:blk-legacy:legacy-self-skillDmgBonus",
  soldierM2:
    "agents:soldier11:mindscape:2:blk-legacy:legacy-self-skillDmgBonus",
  brimstone:
    "w-engines:The_Brimstone:refinement:blk-legacy:legacy-self-inCombatAtkPercent",
  yixuanCore: "agents:yixuan:mindscape:0:blk-legacy:legacy-self-skillDmgBonus",
  cageCritical:
    "w-engines:Qingming_Birdcage:refinement:blk-legacy:legacy-self-critRate",
  cageDamage:
    "w-engines:Qingming_Birdcage:refinement:blk-legacy:eff-ms1r8tz7-juw8rc",
  cageSheer:
    "w-engines:Qingming_Birdcage:refinement:blk-legacy:eff-ms1r9equ-l7imtb",
  claretConversion:
    "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtskqyss-1toefw",
  claretState:
    "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtrf598z-80y7hh",
  claretM4: "agents:claret:mindscape:4:blk-mtseebl3-k0eoh9:eff-mtseebl3-6j53ci",
  crimsonCritical:
    "w-engines:Scarlet-Craving:refinement:blk-mv3h4q1t-3m3v1q:eff-mv3h4q1t-4jb1zr",
  crimsonDamage:
    "w-engines:Scarlet-Craving:refinement:blk-mv3h4q1t-3m3v1q:eff-mv3h4zop-e2ecfr",
  crimsonSharp:
    "w-engines:Scarlet-Craving:refinement:blk-mv3h4q1t-3m3v1q:eff-mv3h5g2r-zj4y8t",
  remielleSpecial:
    "agents:remiel:mindscape:0:blk-ms8eep1j-jv0aut:eff-ms8eep1j-ljr5on",
  remielleAttack:
    "agents:remiel:mindscape:0:blk-ms7td2gs-rk1vtd:eff-ms7tgbsu-obb50g",
  roxyCore: "nanoka:agents:1621:core-wind-critical-damage",
  roxySharp: "nanoka:agents:1621:core-wind-sharp-critical-damage",
  roxyAdditional: "nanoka:agents:1621:additional-hit-stun-damage",
  roxyM1: "nanoka:agents:1621:m1-hit-resistance-reduction",
  roxyM2: "nanoka:agents:1621:m2-stun-damage",
} as const

export interface StaticComparisonScenario {
  id: string
  actor: DamageActor
  team: BuildId[]
  selfBuffs: boolean
  remielle: {
    special: boolean
    attack: boolean
    specialLevel: number
    anomalyCount: 2
  } | null
  roxy: {
    core: boolean
    additional: boolean
    mindscape1: boolean
    mindscape2: boolean
    sourceCriticalRate: number
  } | null
  target: {
    defense: number
    resistance: number
    stunned: boolean
    stunMultiplier: number
    imbued: false
  }
}

const target = {
  defense: 953,
  resistance: 0.2,
  stunned: true,
  stunMultiplier: 1.5,
  imbued: false,
} as const
export const scenarios: StaticComparisonScenario[] = []
for (const actor of ["soldier", "yixuan", "claret"] as const) {
  for (const selfBuffs of [false, true])
    scenarios.push({
      id: `${actor}-self-${selfBuffs ? "on" : "off"}`,
      actor,
      team: [actor],
      selfBuffs,
      remielle: null,
      roxy: null,
      target,
    })
  for (const state of [
    "off",
    "m1",
    "m2",
    "additional",
    "combined",
    "core-non-wind",
  ] as const)
    scenarios.push({
      id: `${actor}-roxy-${state}`,
      actor,
      team: [actor, "roxy"],
      selfBuffs: false,
      remielle: null,
      roxy: {
        core: state === "core-non-wind",
        additional: state === "additional" || state === "combined",
        mindscape1: state === "m1" || state === "combined",
        mindscape2: state === "m2" || state === "combined",
        sourceCriticalRate: 0.5,
      },
      target,
    })
}
for (const actor of ["soldier", "yixuan"] as const) {
  for (const state of ["off", "special", "attack", "combined"] as const)
    scenarios.push({
      id: `${actor}-remielle-${state}`,
      actor,
      team: [actor, "remielle", "alice"],
      selfBuffs: false,
      remielle: {
        special: state === "special" || state === "combined",
        attack: state === "attack" || state === "combined",
        specialLevel: 12,
        anomalyCount: 2,
      },
      roxy: null,
      target,
    })
}

export const inputFacts = {
  level: 60,
  discRarity: "S",
  discLevel: 15,
  event: { count: 1, critMode: "expected" },
  selfBuffLayers: { soldierM2: 4, brimstone: 2, cageDamage: 2, cageSheer: 2 },
  skillLevels:
    "explicit effective level 12 (no second mindscape level increase)",
  fourPieceEffects: "off; only automatic two-piece contributions",
  selfSwitch:
    "controlled explicit catalog selections; not a simulated combat timeline",
  claret:
    "initial CD-to-CR conversion and ultimate-period core CR are always active; on additionally selects R2 engine and M4",
  remielle:
    "two actual anomaly actors (Remielle + Alice); additional ability eligibility satisfied by Alice; initial ATK captured independently in each calculator",
  roxy: "M1/M2 hit states explicitly valid on this target; additional qualifying teammate present; target not imbued, imbuement coverage explicitly zero; external source CR is a declared 50% observation, not an upstream-computed panel",
} as const

/** Only public data/action/calculation APIs; external reads come from Fairy's own equipment pass. */
export async function fairyInputFor(
  scenario: StaticComparisonScenario,
): Promise<StaticActionCalculationInput> {
  const selected = scenario.team.map((id) => builds[id])
  const damageActor = builds[scenario.actor].actor
  const action = actions[scenario.actor]
  const data = await loadStaticCalculationData({
    agents: selected.map((build) => agentSourceIds[build.agentName]),
    wEngines: selected.map((build) => wEngineSourceIds[build.wEngineName]),
  })
  const base: StaticActionCalculationInput = {
    data,
    actors: selected.map((build) => build.actor),
    actorId: damageActor.entityId,
    action: resolveAgentAction({
      agent: data.agents.find(
        (agent) => agent.actions.entityId === damageActor.agentEntityId,
      )!.actions,
      actionId: action.fairy,
      mindscapeRank: damageActor.mindscapeRank,
      potentialLevel: 0,
      levels: { [action.category]: { mode: "effective", value: action.level } },
    }),
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: scenario.target.defense,
      resistances: { [action.element]: scenario.target.resistance },
      isStunned: scenario.target.stunned,
      baseStunDamageMultiplier: scenario.target.stunMultiplier,
    },
    selections: [],
    inputs: [],
  }
  const equipment = calculateStaticActionDamage(base)
  if (!equipment.ok || equipment.value.kind !== "damage")
    throw new Error(JSON.stringify(equipment))
  const selections: StaticActionCalculationInput["selections"][number][] = []
  const inputs: NonNullable<StaticActionCalculationInput["inputs"]>[number][] =
    []
  const choose = (holder: BuildId, key: keyof typeof options, layers = 1) => {
    selections.push({
      holderId: builds[holder].actor.entityId,
      optionId: options[key],
      layers,
    })
  }
  const read = (
    holder: BuildId,
    name: string,
    unit: "ratio" | "attack-points" | "count",
    value: number,
  ) => {
    const source = builds[holder].actor
    inputs.push({
      bindingId: staticSourceBindingId(
        source.entityId,
        "agent",
        source.agentEntityId,
      ),
      name,
      value: { unit, value },
    })
  }
  if (scenario.actor === "claret") choose("claret", "claretState")
  if (scenario.selfBuffs) {
    if (scenario.actor === "soldier") {
      choose("soldier", "soldierCore")
      choose("soldier", "soldierM2", inputFacts.selfBuffLayers.soldierM2)
      choose("soldier", "brimstone", inputFacts.selfBuffLayers.brimstone)
    } else if (scenario.actor === "yixuan") {
      choose("yixuan", "yixuanCore")
      choose("yixuan", "cageCritical")
      choose("yixuan", "cageDamage", inputFacts.selfBuffLayers.cageDamage)
      choose("yixuan", "cageSheer", inputFacts.selfBuffLayers.cageSheer)
    } else {
      for (const key of [
        "claretM4",
        "crimsonCritical",
        "crimsonDamage",
        "crimsonSharp",
      ] as const)
        choose("claret", key)
    }
  }
  if (scenario.remielle?.special) {
    choose("remielle", "remielleSpecial")
    read(
      "remielle",
      "agent:1581:zzz-hp:eff-ms8eep1j-ljr5on:blk-ms8eep1j-jv0aut:mindscape:0:source",
      "count",
      scenario.remielle.specialLevel,
    )
  }
  if (scenario.remielle?.attack) {
    choose("remielle", "remielleAttack")
    const panel = equipment.value.panels.find(
      (candidate) => candidate.entityId === builds.remielle.actor.entityId,
    )!
    read(
      "remielle",
      "agent:1581:zzz-hp:eff-ms7tgbsu-obb50g:blk-ms7td2gs-rk1vtd:mindscape:0:source",
      "attack-points",
      panel.stats.attack!.value,
    )
  }
  if (scenario.roxy) {
    if (scenario.roxy.core) {
      choose("roxy", "roxyCore")
      choose("roxy", "roxySharp")
      read(
        "roxy",
        "roxy:core:external-critical-rate",
        "ratio",
        scenario.roxy.sourceCriticalRate,
      )
    }
    if (scenario.roxy.additional) choose("roxy", "roxyAdditional")
    if (scenario.roxy.mindscape1) choose("roxy", "roxyM1")
    if (scenario.roxy.mindscape2) choose("roxy", "roxyM2")
  }
  return {
    ...base,
    actors: base.actors.map((actor) =>
      actor.agentEntityId === "1581" && scenario.remielle
        ? {
            ...actor,
            skillLevels: {
              ...actor.skillLevels,
              special: {
                mode: "effective",
                value: scenario.remielle.specialLevel,
              },
            },
          }
        : actor,
    ),
    selections,
    inputs,
  }
}

import {
  loadStaticCalculationData,
  resolveAgentAction,
} from "../../src/index.ts"
import {
  calculateStaticActionDamage,
  parseEffectRuleSet,
  staticSourceBindingId,
} from "../../../core/src/index.ts"
import type {
  AttributeSource,
  SnapshotId,
  StaticActionCalculationInput,
  StaticActorConfiguration,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
  WorldObservation,
} from "../../../core/src/index.ts"

export const upstreamCommit = "d58e276973c3df944bc36fc81a783f3d17018708"
export const fairyBase = "fe6b4e9180eade623740131422259df0ee542281"
export const actors = {
  vivian: {
    name: "Vivian",
    agent: "1331",
    engineName: "Flight of Fancy",
    engine: "14133",
    upstreamEngine: "zzz_wiki_1277",
    target: "zzz-hp:skill:vivian-basic-ms4qvvl9",
  },
  aria: {
    name: "Aria",
    agent: "1501",
    engineName: "Angel in the Shell",
    engine: "14150",
    upstreamEngine: "zzz_wiki_1883",
    target: null,
  },
} as const
export type Trigger = keyof typeof actors

export const options = {
  vivianCore:
    "agents:vivian:mindscape:0:blk-ms4qu5nj-ntz0qy:eff-ms4qu5nj-q9gcnu",
  vivianOrdinary:
    "agents:vivian:mindscape:0:blk-legacy:legacy-team-anomalyDmgBonus",
  vivianYield:
    "agents:vivian:mindscape:2:blk-legacy:legacy-self-anomalyReleaseMultFactor",
  vivianResistance: "agents:vivian:mindscape:2:blk-legacy:legacy-team-resPen",
  vivianEngine:
    "w-engines:Flight_of_Fancy:refinement:blk-legacy:legacy-self-mastery",
  ariaCore: "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36k7q1-vqttu0",
  ariaProficiency:
    "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36jo9z-7gl5e0",
  ariaStunned:
    "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36s2o3-l3fi3g",
  ariaCritConversion: "agents:aria:mindscape:1:blk-legacy:eff-ms36xf73-q2nimy",
  ariaCritOffset: "agents:aria:mindscape:1:blk-legacy:eff-ms36z5gn-gdbybu",
  ariaCritRate:
    "agents:aria:mindscape:1:blk-legacy:legacy-self-anomalyReleaseCritRate",
  ariaCritDamage:
    "agents:aria:mindscape:1:blk-legacy:legacy-self-anomalyReleaseCritDmg",
  ariaDefense: "agents:aria:mindscape:2:blk-legacy:legacy-self-reduceDefense",
  ariaDelusionDefense: "agents:aria:mindscape:2:blk-legacy:eff-ms371amr-rg003c",
  ariaEngineProficiency:
    "w-engines:Angel_In_The_Shell:refinement:blk-legacy:legacy-self-mastery",
  ariaEngineDamage:
    "w-engines:Angel_In_The_Shell:refinement:blk-legacy:legacy-self-dmgBonus",
  ariaOrdinary:
    "w-engines:Angel_In_The_Shell:refinement:blk-legacy:legacy-self-anomalyDmgBonus",
} as const

// Deliberately external observations, not panels calculated by either implementation.
// Ordinary CR/CD are decoys: neither release should inherit ordinary critical stats.
export interface SavedSource {
  actor: "alice_thymefield" | "burnice" | Trigger
  agent: string
  snapshotId: SnapshotId
  attack: number
  proficiency: number
  mastery: number
  penetrationRatio: number
  penetrationValue: number
  level: number
  damageBonus: number
  anomalyBonus: number
}
export const savedSource: SavedSource = {
  actor: "alice_thymefield",
  agent: "1401",
  snapshotId: "snapshot:alice-v1",
  attack: 2137,
  proficiency: 319,
  mastery: 173,
  penetrationRatio: 0.23,
  penetrationValue: 71,
  level: 60,
  damageBonus: 0.18,
  anomalyBonus: 0.17,
}
export interface AbloomScenario {
  id: string
  trigger: Trigger
  event: "release" | "attribute"
  ordinaryBonus: boolean
  releaseBonus: boolean
  defenseBonus: boolean
  stunned: boolean
  masteryDisc: boolean
  currentAdjustment: {
    attack: number
    proficiency: number
    mastery: number
    penetrationRatio: number
  }
  source: SavedSource | null
}
const defaults = {
  event: "release",
  ordinaryBonus: false,
  releaseBonus: false,
  defenseBonus: false,
  stunned: true,
  masteryDisc: false,
  currentAdjustment: {
    attack: 0,
    proficiency: 0,
    mastery: 0,
    penetrationRatio: 0,
  },
  source: null,
} as const
export const scenarios: AbloomScenario[] = []
for (const trigger of ["vivian", "aria"] as const) {
  for (const event of ["release", "attribute"] as const)
    for (const ordinaryBonus of [false, true])
      for (const releaseBonus of [false, true])
        scenarios.push({
          ...defaults,
          id: `${trigger}-${event}-ordinary-${Number(ordinaryBonus)}-exclusive-${Number(releaseBonus)}`,
          trigger,
          event,
          ordinaryBonus,
          releaseBonus,
        })
  const external = { ...defaults, trigger, source: savedSource }
  scenarios.push({ ...external, id: `${trigger}-saved` })
  scenarios.push({
    ...external,
    id: `${trigger}-saved-exclusive`,
    releaseBonus: true,
  })
  for (const [field, value] of [
    ["attack", 2873],
    ["proficiency", 427],
    ["penetrationRatio", 0.41],
    ["penetrationValue", 137],
    ["level", 50],
  ] as const)
    scenarios.push({
      ...external,
      id: `${trigger}-saved-${field}`,
      source: {
        ...savedSource,
        [field]: value,
        snapshotId: `snapshot:alice-${field}`,
      },
    })
  scenarios.push({
    ...external,
    id: `${trigger}-saved-replaced-source`,
    source: {
      ...savedSource,
      actor: "burnice",
      agent: "1171",
      snapshotId: "snapshot:burnice-v1",
      attack: 2831,
      proficiency: 257,
      mastery: 311,
      penetrationRatio: 0.37,
      penetrationValue: 113,
    },
  })
  scenarios.push({
    ...external,
    id: `${trigger}-changed-current`,
    currentAdjustment: {
      attack: 1700,
      proficiency: 107,
      mastery: 211,
      penetrationRatio: 0.43,
    },
  })
  scenarios.push({
    ...external,
    id: `${trigger}-changed-initial-mastery`,
    masteryDisc: true,
  })
  scenarios.push({ ...external, id: `${trigger}-not-stunned`, stunned: false })
}
scenarios.push({
  ...defaults,
  id: "aria-release-defense",
  trigger: "aria",
  defenseBonus: true,
})

export const historicalSelfScenarios: AbloomScenario[] = (
  ["vivian", "aria"] as const
).map((trigger) => ({
  ...defaults,
  id: `${trigger}-saved-self`,
  trigger,
  source: {
    ...savedSource,
    actor: trigger,
    agent: actors[trigger].agent,
    snapshotId: `snapshot:${trigger}-history`,
    level: 50,
  },
  currentAdjustment: {
    attack: 1700,
    proficiency: 107,
    mastery: 211,
    penetrationRatio: 0.43,
  },
}))

export const target = {
  defense: 953,
  levelCoefficient: 794,
  resistance: 0.2,
  stunMultiplier: 1.5,
} as const
export const inputFacts = {
  upstreamTests: ["tests/vivian-damage.test.js", "tests/aria-damage.test.js"],
  event:
    "one explicitly requested Ether corruption unit; no automatic trigger or rotation",
  triggerInput:
    "level 60, core F/7, M2, signature R1; empty discs except the declared legal slot-6 S15 mastery main; independently assembled equipment panels",
  sourceInput:
    "self current uses each calculator's own panel; saved sources are shared external resolved observations, not independently assembled source equipment",
  attribution:
    "request agent / hit.actorId is the trigger and settlement owner; anomalySource owns original strength; the owner never changes to the historical source",
  level:
    "saved source level is explicit; upstream normalizeDamageTarget fixes levelCoefficient at 794 and ignores the caller-supplied value (including 592 at source level 50); Fairy derives 592 from anomalySource.level 50",
  currentAdjustment:
    "external final fixed ATK/AP/AM and direct penetration additions; not taken from upstream results",
  ordinaryBonus:
    "Vivian additional 12% anomaly bonus; Aria signature 10% anomaly bonus. Aria AP90 and Ether20%, Vivian six AP stacks, and Aria core AP90 are separately always selected",
  releaseBonus:
    "Vivian M2 release yield30% and resistance ignore15%; Aria M1 release crit (base25%, initial mastery conversion, CD25%)",
  differences:
    "retain native ATK precision, Aria Ether coefficient and M1 floor, and upstream's fixed defense-level API limitation versus Fairy's source-level derivation",
} as const

export function snapshotRequestFor(source: SavedSource) {
  const panel = {
    atk: source.attack,
    anomalyProficiency: source.proficiency,
    anomalyMastery: source.mastery,
    penRatio: source.penetrationRatio,
    penFlat: source.penetrationValue,
    dmgBonus: source.damageBonus,
    etherDmg: 0,
    critRate: 0.79,
    critDmg: 2.3,
  }
  return {
    agentId: source.actor,
    agentLevel: source.level,
    inCombatPanel: panel,
    outOfCombatPanel: { ...panel },
    buffTotals: {
      damageModifiers: [
        {
          id: "observation:anomaly-bonus",
          kind: "anomalyDamageBonus",
          value: source.anomalyBonus,
          appliesTo: {
            damageKinds: ["anomaly"],
            settlementTypes: ["attribute"],
          },
        },
      ],
    },
    capturedAt: "2026-07-23T00:00:00.000Z",
    sourceConfigHash: source.snapshotId,
  }
}
export type NativeSnapshot = Omit<
  ReturnType<typeof snapshotRequestFor>,
  "inCombatPanel"
> & {
  schemaVersion: number
  panel: ReturnType<typeof snapshotRequestFor>["inCombatPanel"]
}

/** Native request assembly only; no damage, source selection, or profile evaluation here. */
export function upstreamInputFor(
  scenario: AbloomScenario,
  snapshot?: NativeSnapshot,
) {
  const { trigger, currentAdjustment: adjustment } = scenario
  const actor = actors[trigger]
  const activeBuffIds = [
    `agent:${trigger}.corePassive`,
    `wEngine:${actor.upstreamEngine}.self`,
  ]
  if (trigger === "vivian" && scenario.ordinaryBonus)
    activeBuffIds.push("agent:vivian.additionalAbility")
  if (scenario.releaseBonus)
    activeBuffIds.push(
      `agent:${trigger}.cinema.${trigger === "vivian" ? 2 : 1}`,
    )
  if (scenario.defenseBonus) activeBuffIds.push("agent:aria.cinema.2")
  const effects: Record<string, { coverage?: number; stacks?: number }> =
    trigger === "vivian"
      ? { effect_wiki_1277_self_ap: { stacks: 6 } }
      : {
          "vitality-hit-anomaly-proficiency": { coverage: 1 },
          "vitality-hit-ether-dmg": { coverage: 1 },
          "vitality-hit-anomaly-dmg": {
            coverage: Number(scenario.ordinaryBonus),
          },
          "vitality-hit-disorder-dmg": { coverage: 0 },
        }
  return {
    agentId: trigger,
    agentLevel: 60,
    coreSkillLevel: "F",
    cinemaLevel: 2,
    potentialLevel: 0,
    wEngineId: actor.upstreamEngine,
    wEngineModificationLevel: 1,
    driveDiscs: scenario.masteryDisc
      ? [
          {
            id: "mastery-six",
            ownerId: "default",
            setId: "astral_voice",
            partition: 6,
            rarity: "S",
            level: 15,
            maxLevel: 15,
            mainStat: { stat: "anomalyMastery", value: 30, mode: "pct" },
            subStats: [],
          },
        ]
      : [],
    combatBuffs: {
      activeBuffIds,
      runtimeInputs: { [`wEngine:${actor.upstreamEngine}.self`]: { effects } },
      manualStats: [
        { stat: "critRate", value: 74, mode: "flat" },
        { stat: "critDmg", value: 180, mode: "flat" },
        { stat: "atkFlat", value: adjustment.attack, mode: "flat" },
        {
          stat: "anomalyProficiencyFlat",
          value: adjustment.proficiency,
          mode: "flat",
        },
        { stat: "anomalyMasteryFlat", value: adjustment.mastery, mode: "flat" },
        {
          stat: "penRatio",
          value: adjustment.penetrationRatio * 100,
          mode: "flat",
        },
      ],
    },
    damage: {
      mode: "anomaly",
      selectedEventId: scenario.id,
      events: [
        {
          id: scenario.id,
          kind: "anomaly",
          settlementType: scenario.event,
          anomalyEffect: "corruption",
          procCount: 1,
          count: 1,
          stunned: scenario.stunned,
          critMode: "expected",
          triggerActorRef: { agentId: trigger, profileId: "core_passive" },
          anomalySource: {
            actorRef: { agentId: scenario.source?.actor ?? trigger },
            ...(snapshot ? { snapshot } : {}),
          },
        },
      ],
      target: {
        defense: target.defense,
        levelCoefficient: target.levelCoefficient,
        resistanceByElement: { ether: target.resistance * 100 },
        stunMultiplierPercent: target.stunMultiplier * 100,
      },
    },
  }
}

const loaded = loadStaticCalculationData({
  agents: ["Vivian", "Aria", "Alice", "Burnice"],
  wEngines: ["Flight of Fancy", "Angel in the Shell"],
})
const equipmentCache = new Map<string, ReturnType<typeof assembleEquipment>>()
async function assembleEquipment(trigger: Trigger, masteryDisc: boolean) {
  const data = await loaded
  const actor = actors[trigger]
  const configuration: StaticActorConfiguration = {
    entityId: `entity:${trigger}`,
    teamId: "team:players",
    agentEntityId: actor.agent,
    coreSkillLevel: 7,
    mindscapeRank: 2,
    potentialLevel: 0,
    wEngine: { entityId: actor.engine, refinement: 1, eligible: true },
    panel: { mode: "equipment" },
    driveDiscs: {
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: masteryDisc
        ? {
            setEntityId: "32700",
            mainStat: { attribute: "anomalyMastery" },
            substats: [],
          }
        : null,
    },
  }
  const input: StaticActionCalculationInput = {
    data,
    actors: [configuration],
    actorId: configuration.entityId,
    action: resolveAgentAction({
      agent: data.agents.find(
        (entry) => entry.attributes.entityId === actor.agent,
      )!.actions,
      actionId: `action:agent:${actor.agent}:action:0001`,
      mindscapeRank: 2,
      potentialLevel: 0,
      levels: { assist: { mode: "effective", value: 12 } },
    }),
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: target.defense,
      resistances: { ether: target.resistance },
      isStunned: true,
      baseStunDamageMultiplier: target.stunMultiplier,
    },
    selections: [],
    inputs: [],
  }
  const result = calculateStaticActionDamage(input)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return { input, result, panel: result.value.panels[0]! }
}
export function equipmentFor(scenario: AbloomScenario) {
  const key = `${scenario.trigger}:${scenario.masteryDisc}`
  if (!equipmentCache.has(key))
    equipmentCache.set(
      key,
      assembleEquipment(scenario.trigger, scenario.masteryDisc),
    )
  return equipmentCache.get(key)!
}

const general = (settledInitialValue: number, final = 0) => ({
  settledInitialValue,
  finalPercentage: [],
  finalFixed: [final],
})

/** Fairy consumes its own equipment panel plus explicitly authored historical observations. */
export async function fairyInputFor(
  scenario: AbloomScenario,
): Promise<StaticCatalogDamageInput> {
  const data = await loaded
  const parsed = parseEffectRuleSet(data.definitions)
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
  const actor = actors[scenario.trigger]
  const holder = `entity:${scenario.trigger}` as const
  const agentBinding = staticSourceBindingId(holder, "agent", actor.agent)
  const engineBinding = staticSourceBindingId(holder, "w-engine", actor.engine)
  const { panel } = await equipmentFor(scenario)
  const adjustment = scenario.currentAdjustment
  const entities: WorldObservation["entities"][number][] = [
    {
      kind: "actor",
      entityId: holder,
      teamId: "team:players",
      generalStats: {
        attack: general(panel.stats.attack!.value, adjustment.attack),
        anomalyProficiency: general(
          panel.stats.anomalyProficiency!.value,
          adjustment.proficiency,
        ),
        anomalyMastery: general(
          panel.stats.anomalyMastery!.value,
          adjustment.mastery,
        ),
      },
      directStats: {
        criticalRate: { baseValue: 0.79, additions: [] },
        criticalDamage: { baseValue: 2.3, additions: [] },
        penetrationRatio: {
          baseValue: panel.stats.penetrationRatio!.value,
          additions: [adjustment.penetrationRatio],
        },
      },
    },
    {
      kind: "actor",
      entityId: "entity:target",
      teamId: "team:enemies",
      generalStats: {},
      directStats: {},
    },
  ]
  const source = scenario.source
  if (source && source.actor !== scenario.trigger)
    entities.push({
      kind: "actor",
      entityId: `entity:${source.actor}`,
      teamId: "team:players",
      // The current source differs from both the trigger and its saved readings.
      generalStats: {
        attack: general(8903),
        anomalyProficiency: general(701),
        anomalyMastery: general(503),
      },
      directStats: {
        criticalRate: { baseValue: 0.91, additions: [] },
        penetrationRatio: { baseValue: 0.67, additions: [] },
      },
    })
  const world: WorldObservation = { entities, states: [], distances: [] }
  const selections: StaticCatalogDamageInput["selections"][number][] = []
  const select = (key: keyof typeof options, layers = 1) =>
    selections.push({
      optionId: options[key],
      bindingId: options[key].startsWith("w-engines:")
        ? engineBinding
        : agentBinding,
      layers,
    })
  if (scenario.trigger === "vivian") {
    select("vivianCore")
    select("vivianEngine", 6)
    if (scenario.ordinaryBonus) select("vivianOrdinary")
    if (scenario.releaseBonus) {
      select("vivianYield")
      select("vivianResistance")
    }
  } else {
    select("ariaCore")
    select("ariaStunned")
    select("ariaProficiency")
    select("ariaEngineProficiency")
    // A saved anomaly owns its damage bonus. The trigger's current engine does not replace it.
    if (!source) select("ariaEngineDamage")
    if (scenario.ordinaryBonus) select("ariaOrdinary")
    if (scenario.releaseBonus)
      for (const key of [
        "ariaCritConversion",
        "ariaCritOffset",
        "ariaCritRate",
        "ariaCritDamage",
      ] as const)
        select(key)
    if (scenario.defenseBonus) {
      select("ariaDefense")
      select("ariaDelusionDefense")
    }
  }
  const statSource: AttributeSource = source
    ? { entityId: `entity:${source.actor}`, snapshotId: source.snapshotId }
    : { entityId: holder }
  const historicalWorld: WorldObservation | undefined = source
    ? {
        entities: [
          {
            kind: "actor",
            entityId: statSource.entityId,
            teamId: "team:players",
            generalStats: {
              attack: general(source.attack),
              anomalyProficiency: general(source.proficiency),
              anomalyMastery: general(source.mastery),
            },
            directStats: {
              criticalRate: { baseValue: 0.79, additions: [] },
              criticalDamage: { baseValue: 2.3, additions: [] },
              penetrationRatio: {
                baseValue: source.penetrationRatio,
                additions: [],
              },
            },
          },
          entities[1]!,
        ],
        states: [],
        distances: [],
      }
    : undefined
  return {
    definitions: parsed.value,
    catalog: data.catalog as StaticEffectCatalog,
    bindings: [
      {
        kind: "agent",
        bindingId: agentBinding,
        holderId: holder,
        sourceEntityId: actor.agent,
        eligible: true,
        configuration: { coreSkillLevel: 7, mindscapeRank: 2 },
      },
      {
        kind: "w-engine",
        bindingId: engineBinding,
        holderId: holder,
        sourceEntityId: actor.engine,
        eligible: true,
        configuration: { refinement: 1 },
      },
    ],
    actorSources: [
      { entityId: holder, agentEntityId: actor.agent, level: 60 },
      ...(source && source.actor !== scenario.trigger
        ? [
            {
              entityId: `entity:${source.actor}` as const,
              agentEntityId: source.agent,
              level: 60,
            },
          ]
        : []),
    ],
    selections,
    world,
    atSeconds: 10,
    inputs: [],
    snapshots: source
      ? [
          {
            snapshotId: source.snapshotId,
            atSeconds: 0,
            world: historicalWorld!,
            attributes: [
              {
                entityId: statSource.entityId,
                stat: "attack",
                stage: "current",
                value: { unit: "attack-points", value: source.attack },
              },
              {
                entityId: statSource.entityId,
                stat: "anomalyProficiency",
                stage: "current",
                value: {
                  unit: "anomaly-proficiency-points",
                  value: source.proficiency,
                },
              },
              {
                entityId: statSource.entityId,
                stat: "penetrationRatio",
                stage: "current",
                value: { unit: "ratio", value: source.penetrationRatio },
              },
            ],
          },
        ]
      : [],
    hit: {
      actorId: holder,
      targetId: "entity:target",
      actionId: `action:${scenario.id}`,
      skillCategory: scenario.trigger === "vivian" ? "basic" : "uncategorized",
      element: "ether",
      skillTags: [],
      skillTargetIds: actor.target ? [actor.target] : [],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "abloom:original-strength",
          stat: "attack",
          statSource,
          damageMultiplier: scenario.event === "release" ? 0 : 0.625,
        },
      ],
    },
    damage: {
      kind: scenario.event === "release" ? "anomaly-settlement" : "anomaly",
      anomalySource: { ...statSource, level: source?.level ?? 60 },
      damageBonus: source ? { settledMultiplier: 1 + source.damageBonus } : [],
      defense: {
        attackerLevel: 60,
        targetBaseDefense: target.defense,
        defensePercentageAdjustments: [],
        penetrationValues: [source?.penetrationValue ?? panel.penetrationValue],
      },
      resistance: {
        targetResistance: target.resistance,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: scenario.stunned,
        targetBaseStunDamageMultiplier: scenario.stunned
          ? target.stunMultiplier
          : 1,
        targetStunDamageMultiplierAdjustments: [],
      },
      anomalyDamageBonus: source ? [source.anomalyBonus] : [],
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      refringe: { mode: "settled", multiplier: 1 },
    },
  }
}

/** Large immutable catalogs are identified by the version and file digests in the reference. */
export function nativeFairyRequest(input: StaticCatalogDamageInput) {
  const { definitions: _definitions, catalog: _catalog, ...request } = input
  return request
}

import { loadStaticCalculationData } from "../../src/index.ts"
import type {
  GeneralStatInput,
  StaticCatalogDamageInput,
  VortexDamageMultiplierProfile,
} from "../../../core/src/index.ts"

export const upstreamCommit = "d58e276973c3df944bc36fc81a783f3d17018708"
export const fairyBase = "fe6b4e9180eade623740131422259df0ee542281"
export const inputLayer = "externally-declared-resolved-source-state"
export const elements = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
] as const
export type Element = (typeof elements)[number]

export interface SourceReadings {
  attack: number
  anomalyProficiency: number
  penetrationRatio: number
  penetrationValue: number
  level: number
  damageBonus: number
  elementalDamageBonus: Record<Element, number>
}

// Authored observations, not either calculator's equipment output. The upstream
// manual-stat deltas express these readings on its mandatory equipment shell.
export const sourceReadings: SourceReadings = {
  attack: 2400,
  anomalyProficiency: 320,
  penetrationRatio: 0.12,
  penetrationValue: 73,
  level: 60,
  damageBonus: 0.07,
  elementalDamageBonus: {
    physical: 0.11,
    fire: 0.23,
    ice: 0.17,
    electric: 0.19,
    ether: 0.29,
    wind: 0.41,
  },
}
export const windReadings: SourceReadings = {
  attack: 1100,
  anomalyProficiency: 171,
  penetrationRatio: 0.03,
  penetrationValue: 19,
  level: 60,
  damageBonus: 0.31,
  elementalDamageBonus: {
    physical: 0.02,
    fire: 0.04,
    ice: 0.06,
    electric: 0.08,
    ether: 0.1,
    wind: 0.61,
  },
}
export const changedCurrentReadings: SourceReadings = {
  ...sourceReadings,
  attack: 4900,
  anomalyProficiency: 550,
  penetrationRatio: 0.42,
  penetrationValue: 211,
  damageBonus: 0.51,
}
export const target = {
  entityId: "entity:enemy",
  defense: 1200,
  resistance: {
    physical: 0.1,
    fire: 0.2,
    ice: 0.3,
    electric: 0.15,
    ether: 0.25,
    wind: 0.6,
  },
  stunMultiplier: 1.5,
} as const
export const actors = {
  wind: {
    entityId: "entity:wind",
    agentEntityId: "1561",
    upstreamAgentId: "velina",
  },
  strength: { entityId: "entity:strength" },
  qualifier: {
    entityId: "entity:qualifier",
    agentEntityId: "1501",
    upstreamAgentId: "aria",
  },
} as const

// Source table facts, not a replacement implementation. shatter is the upstream
// vortex row for Fairy frostbite; the separate instant shatter row is 5.
export const profiles = [
  {
    profile: "corruption",
    upstreamEffect: "corruption",
    element: "ether",
    agentEntityId: "1331",
    upstreamAgentId: "vivian",
    fixed: 6.5,
    tick: 0.625,
    interval: 0.5,
    duration: 10,
    ticks: 20,
    multiplier: 19,
    extendedTicks: 26,
    extendedMultiplier: 22.75,
    zero: 6.5,
    fractional: 19.3125,
    instant: null,
  },
  {
    profile: "shock",
    upstreamEffect: "shock",
    element: "electric",
    agentEntityId: "1011",
    upstreamAgentId: "anby_demara",
    fixed: 6.5,
    tick: 1.25,
    interval: 1,
    duration: 10,
    ticks: 10,
    multiplier: 19,
    extendedTicks: 13,
    extendedMultiplier: 22.75,
    zero: 6.5,
    fractional: 19.3125,
    instant: null,
  },
  {
    profile: "burn",
    upstreamEffect: "burn",
    element: "fire",
    agentEntityId: "1041",
    upstreamAgentId: "soldier_11",
    fixed: 9,
    tick: 0.5,
    interval: 0.5,
    duration: 10,
    ticks: 20,
    multiplier: 19,
    extendedTicks: 26,
    extendedMultiplier: 22,
    zero: 9,
    fractional: 19.25,
    instant: null,
  },
  {
    profile: "assault",
    upstreamEffect: "assault",
    element: "physical",
    agentEntityId: "1401",
    upstreamAgentId: "alice_thymefield",
    fixed: 8,
    tick: 0.075,
    interval: 1,
    duration: 10,
    ticks: 10,
    multiplier: 8.75,
    extendedTicks: 13,
    extendedMultiplier: 8.975,
    zero: 8,
    fractional: 8.76875,
    instant: 7.13,
  },
  {
    profile: "frostbite",
    upstreamEffect: "shatter",
    element: "ice",
    agentEntityId: "1191",
    upstreamAgentId: "ellen_joe",
    fixed: 13,
    tick: 0.075,
    interval: 1,
    duration: 10,
    ticks: 10,
    multiplier: 13.75,
    extendedTicks: 13,
    extendedMultiplier: 13.975,
    zero: 13,
    fractional: 13.76875,
    instant: 5,
  },
  {
    profile: "frost",
    upstreamEffect: "frost_frozen",
    element: "ice",
    agentEntityId: "1091",
    upstreamAgentId: "hoshimi_miyabi",
    fixed: 0,
    tick: 0.75,
    interval: 1,
    duration: 20,
    ticks: 20,
    multiplier: 15,
    extendedTicks: 23,
    extendedMultiplier: 17.25,
    zero: 0,
    fractional: 15.1875,
    instant: null,
  },
] as const satisfies readonly {
  profile: VortexDamageMultiplierProfile
  element: Element
  [key: string]: unknown
}[]

export const buffs = {
  core: {
    upstreamId: "velina.core.turbulence_f",
    optionId:
      "agents:velina:mindscape:0:blk-ms5nqnq1-bso2d5:eff-ms5nqnpz-3hs5ih",
    effectId:
      "agent:1561:zzz-hp:eff-ms5nqnpz-3hs5ih:blk-ms5nqnq1-bso2d5:mindscape:0",
    channel: "base-multiplier-addition",
    value: 1.5,
  },
  additional: {
    upstreamId: "velina.additional.turbulence",
    optionId:
      "agents:velina:mindscape:0:blk-ms4tpxkp-f964lw:eff-ms4tqvx2-vzordz",
    effectId:
      "agent:1561:zzz-hp:eff-ms4tqvx2-vzordz:blk-ms4tpxkp-f964lw:mindscape:0",
    channel: "anomaly-damage-bonus",
    value: 0.1,
  },
  mindscape1: {
    upstreamId: "velina.cinema_1.turbulence_res_ignore",
    optionId: "agents:velina:mindscape:1:blk-legacy:legacy-self-resPen",
    effectId: "agent:1561:zzz-hp:legacy-self-resPen:blk-legacy:mindscape:1",
    channel: "attacker-resistance-ignore",
    value: 0.2,
  },
  mindscape2: {
    upstreamId: "velina.cinema_2.turbulence",
    optionId:
      "agents:velina:mindscape:2:blk-legacy:legacy-self-turbulenceDmgBonus",
    effectId:
      "agent:1561:zzz-hp:legacy-self-turbulenceDmgBonus:blk-legacy:mindscape:2",
    channel: "anomaly-damage-bonus",
    value: 0.15,
  },
} as const
export type Buff = keyof typeof buffs
export interface VortexScenario {
  id: string
  profile: VortexDamageMultiplierProfile
  durationBonusSeconds: number
  buffs: Buff[]
  source: SourceReadings
  stunned: boolean
  genericAnomalyBonus: number
  manualVortexBonus: number
  extraElementalBonus: { element: Element; value: number } | null
  includeInstant: boolean
  conditions: {
    targetWindswept: true
    nonWindAnomalyJustApplied: true
    additionalAbilityUnlockedByAnomalyTeammate: true
    windErosionPoints: 0 | 2
  }
}
export function scenario(
  id: string,
  profile: VortexDamageMultiplierProfile,
  overrides: Partial<VortexScenario> = {},
): VortexScenario {
  return {
    id,
    profile,
    durationBonusSeconds: 0,
    buffs: [],
    source: structuredClone(sourceReadings),
    stunned: false,
    genericAnomalyBonus: 0,
    manualVortexBonus: 0,
    extraElementalBonus: null,
    includeInstant: false,
    conditions: {
      targetWindswept: true,
      nonWindAnomalyJustApplied: true,
      additionalAbilityUnlockedByAnomalyTeammate: true,
      windErosionPoints: overrides.buffs?.includes("core") ? 2 : 0,
    },
    ...overrides,
  }
}
export const scenarios: VortexScenario[] = profiles.flatMap((row) =>
  [0, 3].flatMap((extension) =>
    [false, true].map((enabled) =>
      scenario(
        `${row.profile}-${extension === 0 ? "standard" : "extended"}-${enabled ? "on" : "off"}`,
        row.profile,
        {
          durationBonusSeconds: extension,
          buffs: enabled
            ? ["core", "additional", "mindscape1", "mindscape2"]
            : [],
          stunned: extension === 3,
          includeInstant: extension === 0 && row.instant !== null,
        },
      ),
    ),
  ),
)
scenarios.push(
  ...(["core", "additional", "mindscape1", "mindscape2"] as const).map((buff) =>
    scenario(`burn-only-${buff}`, "burn", { buffs: [buff] }),
  ),
  scenario("burn-generic-anomaly", "burn", { genericAnomalyBonus: 0.1 }),
  scenario("burn-manual-vortex", "burn", { manualVortexBonus: 0.2 }),
  scenario("burn-both-bonuses", "burn", {
    genericAnomalyBonus: 0.1,
    manualVortexBonus: 0.2,
  }),
  scenario("burn-fire-bonus", "burn", {
    extraElementalBonus: { element: "fire", value: 0.25 },
  }),
  scenario("burn-wind-bonus", "burn", {
    extraElementalBonus: { element: "wind", value: 0.25 },
  }),
)

export const fractionalScenarios = profiles.map((row) =>
  scenario(`${row.profile}-fractional-duration`, row.profile, {
    durationBonusSeconds: 0.25,
  }),
)
export const levelScenario = scenario("burn-source-level-50", "burn", {
  source: { ...sourceReadings, level: 50 },
})
export const snapshotScenario = scenario("burn-historical-source", "burn", {
  source: { ...sourceReadings, level: 50 },
  buffs: ["core", "additional", "mindscape1", "mindscape2"],
})
export function profileFor(profile: VortexDamageMultiplierProfile) {
  const row = profiles.find((item) => item.profile === profile)
  if (!row) throw new Error(`Unknown vortex profile: ${profile}`)
  return row
}
const general = (baseValue: number): GeneralStatInput => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})
const actor = (
  entityId: StaticCatalogDamageInput["hit"]["actorId"],
  readings: SourceReadings,
) => ({
  kind: "actor" as const,
  entityId,
  teamId: "team:players" as const,
  generalStats: {
    attack: general(readings.attack),
    anomalyProficiency: general(readings.anomalyProficiency),
  },
  directStats: {
    criticalRate: { baseValue: 0, additions: [] },
    penetrationRatio: { baseValue: readings.penetrationRatio, additions: [] },
  },
})
const data = loadStaticCalculationData({ agents: [], wEngines: [] })

export async function fairyInputFor(
  sample: VortexScenario,
  mode: "vortex" | "instant" | "snapshot" = "vortex",
): Promise<StaticCatalogDamageInput> {
  const { definitions, catalog } = await data
  const row = profileFor(sample.profile)
  const strength = actors.strength.entityId
  const wind = actors.wind.entityId
  const saved = mode === "snapshot"
  const source = {
    entityId: strength,
    ...(saved ? { snapshotId: "snapshot:non-wind" as const } : {}),
  }
  const world: StaticCatalogDamageInput["world"] = {
    entities: [
      actor(wind, windReadings),
      actor(strength, saved ? changedCurrentReadings : sample.source),
      {
        kind: "actor",
        entityId: actors.qualifier.entityId,
        teamId: "team:players",
        generalStats: {},
        directStats: {},
      },
      {
        kind: "actor" as const,
        entityId: target.entityId,
        teamId: "team:enemies",
        generalStats: {},
        directStats: {},
      },
    ],
    states: [],
    distances: [],
  }
  const instant = mode === "instant"
  if (instant && row.instant === null)
    throw new Error("This branch has no immediate anomaly companion")
  return {
    definitions,
    catalog,
    actorSources: [
      { entityId: wind, agentEntityId: actors.wind.agentEntityId },
      { entityId: strength, agentEntityId: row.agentEntityId },
      {
        entityId: actors.qualifier.entityId,
        agentEntityId: actors.qualifier.agentEntityId,
      },
    ],
    bindings: [
      {
        bindingId: "binding:wind",
        kind: "agent",
        holderId: wind,
        sourceEntityId: actors.wind.agentEntityId,
        eligible: true,
        configuration: { coreSkillLevel: 7, mindscapeRank: 2 },
      },
    ],
    selections: sample.buffs.map((key) => ({
      optionId: buffs[key].optionId,
      bindingId: "binding:wind",
      layers: 1,
    })),
    world,
    atSeconds: saved ? 5 : 0,
    ...(saved
      ? {
          snapshots: [
            {
              snapshotId: "snapshot:non-wind",
              atSeconds: 0,
              world: {
                ...world,
                entities: world.entities.map((entity) =>
                  entity.entityId === strength
                    ? actor(strength, sample.source)
                    : entity,
                ),
              },
              attributes: [
                {
                  entityId: strength,
                  stat: "attack" as const,
                  stage: "current" as const,
                  value: {
                    unit: "attack-points" as const,
                    value: sample.source.attack,
                  },
                },
                {
                  entityId: strength,
                  stat: "anomalyProficiency" as const,
                  stage: "current" as const,
                  value: {
                    unit: "anomaly-proficiency-points" as const,
                    value: sample.source.anomalyProficiency,
                  },
                },
                {
                  entityId: strength,
                  stat: "penetrationRatio" as const,
                  stage: "current" as const,
                  value: {
                    unit: "ratio" as const,
                    value: sample.source.penetrationRatio,
                  },
                },
              ],
            },
          ],
        }
      : {}),
    hit: {
      actorId: instant ? strength : wind,
      targetId: target.entityId,
      actionId: `action:${sample.id}:${instant ? "instant" : "vortex"}`,
      skillCategory: "uncategorized",
      element: row.element,
      skillTags: [],
      damageItems: [
        {
          itemId: instant ? "instant" : "vortex",
          role: "base",
          stat: "attack",
          statSource: source,
          ...(instant
            ? { mode: "direct", damageMultiplier: row.instant! }
            : {
                mode: "standard-vortex",
                profile: sample.profile,
                baseDurationSeconds: row.duration + sample.durationBonusSeconds,
              }),
        },
      ],
    },
    damage: {
      kind: instant ? "anomaly" : "vortex",
      anomalySource: { ...source, level: sample.source.level },
      // These are explicitly supplied historical facts, not attributes fetched by
      // snapshotId: this API reads only ATK/AP/penetration ratio from the snapshot.
      damageBonus: {
        settledMultiplier:
          1 +
          sample.source.damageBonus +
          sample.source.elementalDamageBonus[row.element] +
          (sample.extraElementalBonus?.element === row.element
            ? sample.extraElementalBonus.value
            : 0),
      },
      defense: {
        attackerLevel: windReadings.level,
        targetBaseDefense: target.defense,
        defensePercentageAdjustments: [],
        penetrationValues: [sample.source.penetrationValue],
      },
      resistance: {
        targetResistance: target.resistance[row.element],
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: sample.stunned,
        targetBaseStunDamageMultiplier: sample.stunned
          ? target.stunMultiplier
          : 1,
        targetStunDamageMultiplierAdjustments: [],
      },
      anomalyDamageBonus: instant
        ? []
        : [sample.genericAnomalyBonus, sample.manualVortexBonus],
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      refringe: { mode: "settled", multiplier: 1 },
    },
  }
}

// Prepared definitions/catalog are identified by their frozen SHA-256 and data
// version in the reference; every remaining native argument is retained verbatim.
export function serializableFairyInput(input: StaticCatalogDamageInput) {
  const { definitions: _definitions, catalog: _catalog, ...request } = input
  return request
}

import type {
  DamageElement,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"

/** One explicitly selected core-7 Abloom, with an independently saved source. */
export function makeAriaAbloomRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  element: DamageElement = "ether",
  mastery = 196.3,
  stunned = false,
  critical = false,
): StaticCatalogDamageInput {
  const general = (baseValue: number) => ({
    baseValue,
    initialPercentage: [],
    initialFixed: [],
    finalPercentage: [],
    finalFixed: [],
  })
  const rateIds: Record<string, string> = {
    ether: "eff-ms36k7q1-vqttu0",
    electric: "eff-ms36muwl-79wv54",
    fire: "eff-ms36nek6-psc6pl",
    physical: "eff-ms36oy6h-izqgcq",
    ice: "eff-ms36o0uv-yslwma",
    wind: "eff-ms36pcqr-9tpwhs",
  }
  const source = {
    entityId: "entity:source",
    snapshotId: "snapshot:source",
  } as const
  const enemy = {
    kind: "actor",
    entityId: "entity:enemy",
    teamId: "team:enemies",
    generalStats: {},
    directStats: {},
  } as const
  return {
    definitions,
    catalog,
    bindings: [
      {
        kind: "agent",
        bindingId: "binding:aria",
        holderId: "entity:aria",
        sourceEntityId: "1501",
        eligible: true,
        configuration: { coreSkillLevel: 7, mindscapeRank: 1 },
      },
    ],
    actorSources: [
      { entityId: "entity:aria", agentEntityId: "1501", level: 60 },
      { entityId: "entity:source", agentEntityId: "1401", level: 60 },
    ],
    selections: [
      `agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:${rateIds[element]}`,
      "agents:aria:mindscape:0:blk-ms36joa0-0vxxo8:eff-ms36s2o3-l3fi3g",
      ...(critical
        ? [
            "legacy-self-anomalyReleaseCritRate",
            "legacy-self-anomalyReleaseCritDmg",
            "eff-ms36xf73-q2nimy",
            "eff-ms36z5gn-gdbybu",
          ].map((id) => `agents:aria:mindscape:1:blk-legacy:${id}`)
        : []),
    ].map((optionId) => ({ optionId, bindingId: "binding:aria", layers: 1 })),
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:aria",
          teamId: "team:players",
          generalStats: {
            attack: general(9999),
            anomalyProficiency: general(999),
            anomalyMastery: { ...general(mastery), finalFixed: [500] },
          },
          directStats: { criticalRate: { baseValue: 0.99, additions: [] } },
        },
        {
          kind: "actor",
          entityId: "entity:source",
          teamId: "team:players",
          generalStats: {
            attack: general(8888),
            anomalyProficiency: general(888),
            anomalyMastery: general(888),
          },
          directStats: {},
        },
        enemy,
      ],
      states: [],
      distances: [],
    },
    atSeconds: 10,
    snapshots: [
      {
        snapshotId: source.snapshotId,
        atSeconds: 0,
        world: {
          entities: [
            {
              kind: "actor",
              entityId: source.entityId,
              teamId: "team:players",
              generalStats: {
                attack: general(1000),
                anomalyProficiency: general(100),
                anomalyMastery: general(777),
              },
              directStats: {
                penetrationRatio: { baseValue: 0, additions: [] },
              },
            },
            enemy,
          ],
          states: [],
          distances: [],
        },
        attributes: [
          {
            entityId: source.entityId,
            stat: "attack",
            stage: "current",
            value: { unit: "attack-points", value: 1000 },
          },
          {
            entityId: source.entityId,
            stat: "anomalyProficiency",
            stage: "current",
            value: { unit: "anomaly-proficiency-points", value: 100 },
          },
          {
            entityId: source.entityId,
            stat: "penetrationRatio",
            stage: "current",
            value: { unit: "ratio", value: 0 },
          },
        ],
      },
    ],
    hit: {
      actorId: "entity:aria",
      targetId: enemy.entityId,
      actionId: "action:aria-abloom",
      skillCategory: "uncategorized",
      element,
      skillTags: [],
      skillTargetIds: [],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "abloom",
          stat: "attack",
          statSource: source,
          damageMultiplier: 0,
        },
      ],
    },
    damage: {
      kind: "anomaly-settlement",
      anomalySource: { ...source, level: 60 },
      damageBonus: { settledMultiplier: 1 },
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 0,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
      resistance: {
        targetResistance: 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: stunned,
        targetBaseStunDamageMultiplier: stunned ? 2 : 1,
        targetStunDamageMultiplierAdjustments: [],
      },
      anomalyDamageBonus: [],
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      refringe: { mode: "settled", multiplier: 1 },
    },
  }
}

export const ariaAbloomConsumerSource =
  makeAriaAbloomRequest.toString() +
  String.raw`
async function verifyAriaAbloomConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({agents:["1501","1401"],wEngines:[]})
  const close = (actual, expected) => { if (Math.abs(actual-expected)>1e-9*Math.max(1,Math.abs(expected))) throw new Error("Aria abloom: " + actual + " != " + expected) }
  // Nanoka core 7 percentages / 10 mastery points, times ONE original anomaly proc.
  for (const [element, percent, base] of [["ether",27.5,0.625],["electric",14.3,1.25],["physical",2.5,7.13]]) {
    const result = engine.calculateStaticDamageFromCatalog(makeAriaAbloomRequest(data.definitions, data.catalog, element, 196.3, true, true))
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const nonCritical = 1000 * (percent/100/10*base) * 196.3 * 1.5 * 2 * 2
    close(result.value.nonCritical, nonCritical)
    close(result.value.criticalRate, 0.7315)
    close(result.value.expected, nonCritical*(1+0.7315*0.25))
  }
  return {correctedElements:3,criticalRate:0.7315}
}
`

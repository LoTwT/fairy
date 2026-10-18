import type {
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"

type YanagiPolarityTestInput = StaticCatalogDamageInput & {
  readonly damage: Extract<
    StaticCatalogDamageInput["damage"],
    { readonly kind: "anomaly" | "disorder" | "vortex" | "anomaly-settlement" }
  > & {
    readonly kind: "disorder" | "vortex"
    readonly damageBonus: readonly number[]
  }
}

export const yanagiPolarityMigrations = [
  {
    rank: 2,
    blockId: "blk-ms4qhaez-8sfxa3",
    sourceEffectId: "eff-ms4qhaez-6zbkbm",
    pointer: "/agents/28/mindscapeBuffs/2/effectBlocks/0/effects/0",
    kind: "disorder",
    legacyIncrease: 0.05,
  },
  {
    rank: 2,
    blockId: "blk-ms4qhaez-8sfxa3",
    sourceEffectId: "eff-ms4qkjzo-r424yz",
    pointer: "/agents/28/mindscapeBuffs/2/effectBlocks/0/effects/1",
    kind: "vortex",
    legacyIncrease: 0.15,
  },
  {
    rank: 6,
    blockId: "blk-ms4qn0z7-6fc8g6",
    sourceEffectId: "eff-ms4qob0d-mk1bgo",
    pointer: "/agents/28/mindscapeBuffs/6/effectBlocks/0/effects/1",
    kind: "disorder",
    legacyIncrease: 0.15,
  },
] as const

/** 合法普通异常请求：ATK 1000 × 倍率 2 × AP 100/100 × 60 级系数 2。 */
export function makeYanagiPolarityRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  kind: "disorder" | "vortex" = "disorder",
): YanagiPolarityTestInput {
  const general = (baseValue: number) => ({
    baseValue,
    initialPercentage: [],
    initialFixed: [],
    finalPercentage: [],
    finalFixed: [],
  })
  return {
    definitions,
    catalog,
    bindings: [
      {
        kind: "agent",
        bindingId: "binding:yanagi",
        holderId: "entity:yanagi",
        sourceEntityId: "1221",
        eligible: true,
        configuration: { mindscapeRank: 6, coreSkillLevel: 7 },
      },
    ],
    selections: [],
    actorSources: [{ entityId: "entity:yanagi", agentEntityId: "1221" }],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:yanagi",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            anomalyProficiency: general(100),
          },
          directStats: {
            criticalRate: { baseValue: 0, additions: [] },
            criticalDamage: { baseValue: 0, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:enemy",
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    hit: {
      actorId: "entity:yanagi",
      targetId: "entity:enemy",
      actionId: "action:ordinary-anomaly",
      skillCategory: "special",
      skillTargetIds: ["zzz-hp:skill:all-special-ms0fcqv7"],
      element: kind === "vortex" ? "wind" : "electric",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "base",
          stat: "attack",
          statSource: { entityId: "entity:yanagi" },
          damageMultiplier: 2,
        },
      ],
    },
    damage: {
      kind,
      damageBonus: [],
      anomalyDamageBonus: [],
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      refringe: { mode: "from-effects" },
      anomalySource: { entityId: "entity:yanagi", level: 60 },
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
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  }
}

export const yanagiPolarityConsumerSource =
  `const yanagiPolarityMigrations = ${JSON.stringify(yanagiPolarityMigrations)};\n` +
  makeYanagiPolarityRequest.toString() +
  String.raw`
async function verifyYanagiPolarityConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({ agents: ["1221"], wEngines: [] })
  const require = (ok, message) => { if (!ok) throw new Error("Yanagi polarity consumer: " + message) }
  const results = []
  for (const migration of yanagiPolarityMigrations) {
    const request = makeYanagiPolarityRequest(data.definitions, data.catalog, migration.kind)
    const baseline = engine.calculateStaticDamageFromCatalog(request)
    require(baseline.ok && baseline.value.nonCritical === 4000, "nonzero unselected " + JSON.stringify(baseline))
    const optionId = "agents:yanagi:mindscape:" + migration.rank + ":" + migration.blockId + ":" + migration.sourceEffectId
    for (const layers of [0, 1]) {
      const result = engine.calculateStaticDamageFromCatalog({...request,selections:[{optionId,bindingId:"binding:yanagi",layers}]})
      require(!result.ok && result.issues.some(issue => issue.code === "INVALID_INPUT" && issue.pointer === "/selections/0" && issue.message.includes("semantic-conflict") && issue.message.includes(optionId)), "named rejection " + JSON.stringify(result))
    }
    results.push({optionId, nonCritical:baseline.value.nonCritical, rejectedLayers:[0,1]})
  }
  return results
}
`

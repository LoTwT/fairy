import type {
  CoreSkillLevel,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"

export const hugoAttackOptionId =
  "agents:hugo:mindscape:0:blk-legacy:legacy-self-atk"
export const hugoAttackEffectId =
  "agent:1291:zzz-hp:legacy-self-atk:blk-legacy:mindscape:0"
export const hugoTeammateCountInputName = "hugo:other-stun-teammates"

export function makeHugoAttackRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  coreSkillLevel: CoreSkillLevel = 7,
  baseAttack = 1000,
): StaticCatalogDamageInput & {
  readonly damage: Extract<
    StaticCatalogDamageInput["damage"],
    { readonly kind: "regular" }
  >
} {
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
        bindingId: "binding:hugo",
        holderId: "entity:hugo",
        sourceEntityId: "1291",
        eligible: true,
        configuration: { mindscapeRank: 0, coreSkillLevel },
      },
    ],
    actorSources: [{ entityId: "entity:hugo", agentEntityId: "1291" }],
    selections: [],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:hugo",
          teamId: "team:players",
          generalStats: { attack: general(baseAttack) },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
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
      actorId: "entity:hugo",
      targetId: "entity:enemy",
      actionId: "action:hugo-test",
      skillCategory: "basic",
      skillTargetIds: [],
      element: "ice",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "base",
          stat: "attack",
          statSource: { entityId: "entity:hugo" },
          damageMultiplier: 2,
        },
      ],
    },
    damage: {
      kind: "regular",
      damageBonus: [],
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

export const hugoAttackConsumerSource =
  makeHugoAttackRequest.toString() +
  String.raw`
async function verifyHugoAttackConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({agents:["1291"],wEngines:[]})
  const request = makeHugoAttackRequest(data.definitions, data.catalog)
  const optionId = "agents:hugo:mindscape:0:blk-legacy:legacy-self-atk"
  const calculate = layers => engine.calculateStaticDamageFromCatalog({...request,selections:layers===undefined?[]:[{optionId,bindingId:"binding:hugo",layers}]})
  const require = (condition, label) => { if(!condition) throw new Error("Hugo attack consumer: " + label) }
  for (const layers of [undefined,0]) { const result=calculate(layers);require(result.ok && result.value.nonCritical===2000,"closed " + JSON.stringify(result)) }
  const selected=calculate(2)
  require(selected.ok && selected.value.nonCritical===3800,"two teammates " + JSON.stringify(selected))
  const old=calculate(3)
  require(!old.ok && old.issues.some(issue=>issue.code==="INVALID_INPUT" && issue.pointer==="/selections/0/layers"),"old three " + JSON.stringify(old))
  return {nonCritical:selected.value.nonCritical,closed:2000,rejectedOldThree:true}
}
`

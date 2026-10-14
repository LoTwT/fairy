import type {
  CoreSkillLevel,
  MindscapeRank,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"

export const roxyMindscapeOptions = [
  "nanoka:agents:1621:m1-hit-resistance-reduction",
  "nanoka:agents:1621:m1-critical-damage",
  "nanoka:agents:1621:m2-stun-damage",
  "nanoka:agents:1621:m4-ultimate-damage",
  "nanoka:agents:1621:m6-wind-resistance-ignore",
] as const

export function makeRoxyMindscapeRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  mindscapeRank: MindscapeRank = 6,
  coreSkillLevel: CoreSkillLevel = 7,
): StaticCatalogDamageInput & {
  readonly damage: Extract<
    StaticCatalogDamageInput["damage"],
    { kind: "regular" }
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
        bindingId: "binding:roxy",
        holderId: "entity:roxy",
        sourceEntityId: "1621",
        eligible: true,
        configuration: { mindscapeRank, coreSkillLevel },
      },
    ],
    actorSources: [
      { entityId: "entity:roxy", agentEntityId: "1621" },
      { entityId: "entity:other", agentEntityId: "1251" },
    ],
    selections: [],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:roxy",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            impact: general(170),
            anomalyProficiency: general(300),
          },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:other",
          teamId: "team:players",
          generalStats: {
            attack: general(1700),
            anomalyProficiency: general(230),
          },
          directStats: {
            criticalRate: { baseValue: 0.35, additions: [] },
            criticalDamage: { baseValue: 0.7, additions: [] },
            penetrationRatio: { baseValue: 0.2, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:enemy",
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
        {
          kind: "actor",
          entityId: "entity:enemy2",
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    hit: {
      actorId: "entity:roxy",
      targetId: "entity:enemy",
      actionId: "action:agent:1621:action:0013",
      skillCategory: "ultimate",
      skillTargetIds: [],
      element: "wind",
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "action:agent:1621:action:0013:base",
          stat: "attack",
          statSource: { entityId: "entity:roxy" },
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
        targetResistance: 0.3,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.5,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  }
}

export const roxyMindscapeConsumerSource =
  makeRoxyMindscapeRequest.toString() +
  String.raw`
async function verifyRoxyMindscapeConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({agents:["Roxy"],wEngines:[]})
  const require = (condition, label) => { if(!condition) throw new Error("Roxy mindscape consumer: " + label) }
  const close = (actual, expected, label) => require(Math.abs(actual-expected)<1e-7, label + ": " + actual + " != " + expected)
  const action = api.resolveAgentAction({agent:data.agents[0].actions,actionId:"action:agent:1621:action:0013",mindscapeRank:6,levels:{chain:{mode:"effective",value:12}}})
  require(action.ok && action.calculation.kind==="damage","real ultimate resolution")
  require(action.skillTargetIds.length===1 && action.skillTargetIds[0]==="zzz-hp:skill:roxy-requiem-for-the-night-burial","precise action target")
  const segment = action.calculation.segments[0]
  close(segment.damageItems[0].damageMultiplier,42.633,"original ultimate multiplier")
  const base = makeRoxyMindscapeRequest(data.definitions,data.catalog)
  const request = {...base,damage:{...base.damage,damageBonus:[0.3]},hit:{...base.hit,actionId:action.actionId,skillCategory:action.skillCategory,skillTargetIds:action.skillTargetIds,element:segment.element,damageItems:segment.damageItems.map(item=>({...item,mode:"direct",role:"base",statSource:{entityId:"entity:roxy"}}))}}
  const select = slug => ({optionId:"nanoka:agents:1621:"+slug,bindingId:"binding:roxy",layers:1})
  const calculate = input => { const result=engine.calculateStaticDamageFromCatalog(input); require(result.ok,JSON.stringify(result)); require(result.value.expected>0,"nonzero request"); return result.value }
  const ultimate=calculate({...request,selections:[select("m4-ultimate-damage")]})
  close(ultimate.factors.nonCritical.damageBonus,1.5,"additive M4")
  close(ultimate.nonCritical,67146.975,"real M4 noncritical")
  close(ultimate.expected,75540.346875,"real M4 expected")
  const combined=calculate({...request,selections:[select("m1-hit-resistance-reduction"),select("m2-stun-damage"),select("m6-wind-resistance-ignore")]})
  close(combined.factors.nonCritical.resistance,1,"M1 and M6 additive")
  close(combined.factors.nonCritical.stunDamage,1.8,"M2 ordinary stun addition")
  close(combined.nonCritical,99761.22,"combined noncritical")
  const critical=calculate({...request,selections:[select("m1-critical-damage")]})
  close(critical.expected/critical.nonCritical,1.225,"independent M1 CD")
  const missingTarget=calculate({...request,hit:{...request.hit,skillTargetIds:[]},selections:[select("m4-ultimate-damage")]})
  close(missingTarget.factors.nonCritical.damageBonus,1.3,"same category without precise target")
  const foreignTarget=data.catalog.skillTargets.find(target=>target.category==="ultimate" && target.agentEntityId!=="1621")
  require(foreignTarget,"foreign ultimate target fixture")
  const wrongTarget=engine.calculateStaticDamageFromCatalog({...request,hit:{...request.hit,skillTargetIds:[foreignTarget.targetId]},selections:[select("m4-ultimate-damage")]})
  require(!wrongTarget.ok,"foreign target rejected")
  const lowRank=engine.calculateStaticDamageFromCatalog({...request,bindings:request.bindings.map(binding=>({...binding,configuration:{...binding.configuration,mindscapeRank:3}})),selections:[select("m4-ultimate-damage")]})
  require(!lowRank.ok && lowRank.issues.some(issue=>issue.code==="CONTEXT_MISMATCH"),"M4 cultivation rejected")
  const fire=calculate({...request,hit:{...request.hit,element:"fire",skillTargetIds:[]},selections:[select("m6-wind-resistance-ignore")]})
  close(fire.factors.nonCritical.resistance,0.7,"non-wind remains unmodified")
  const nonWindIgnore=fire.evaluation.contributions.filter(value=>value.origin.effectId==="agent:1621:nanoka:m6-wind-resistance-ignore").reduce((sum,value)=>sum+value.value.value,0)
  close(nonWindIgnore,0,"non-wind contribution")
  return {ultimate:Number(ultimate.nonCritical.toFixed(3)),combined:Number(combined.nonCritical.toFixed(2)),nonWindIgnore,rejectedLowRank:true}
}
`

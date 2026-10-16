import type {
  RuleSet,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"
import { makeRoxyAdditionalRequest } from "./roxy-additional-consumer.ts"
import type { StaticActionCalculationInput } from "../../../core/src/static/types.ts"
import type {
  ResolveAgentActionInput,
  ResolvedAgentAction,
  StaticCalculationData,
} from "@randomplay/shared"

export const roxyWeatheredOption =
  "nanoka:agents:1621:additional-weathered-direct-damage"
export const roxyWeatheredInput = "roxy:weathered-direct-damage:applicable"

export function makeRoxyWeatheredRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
) {
  return withRoxyWeatheredFacts(makeRoxyAdditionalRequest(definitions, catalog))
}

function withRoxyWeatheredFacts(
  base: ReturnType<typeof makeRoxyAdditionalRequest>,
) {
  return {
    ...base,
    hit: { ...base.hit, directAttack: true },
    targetWindswept: {
      targetId: base.hit.targetId,
      status: "active" as const,
      applierActorId: "entity:qualifier" as const,
      contaminationElement: null,
      baseCoefficient: { unit: "ratio" as const, value: 0.1 },
    },
    damage: {
      ...base.damage,
      damageBonus: [0.5],
      defense: { ...base.damage.defense, targetBaseDefense: 794 },
      resistance: { ...base.damage.resistance, targetResistance: 0.2 },
      damageTaken: {
        targetDamageTakenIncreases: [0.3],
        targetDamageTakenReductions: [],
      },
    },
  }
}

/** 加农转子的真实独立项，调用方的条件分类不冒充游戏标签证据。 */
export function makeWindsweptCannonRotorRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
) {
  const base = makeRoxyWeatheredRequest(definitions, catalog)
  return {
    ...base,
    actorSources: base.actorSources.map((source) =>
      source.entityId === "entity:qualifier"
        ? { ...source, agentEntityId: "1321" }
        : source,
    ),
    world: {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.entityId === "entity:qualifier"
          ? {
              ...base.world.entities[0]!,
              entityId: "entity:qualifier" as const,
            }
          : entity,
      ),
    },
    bindings: [
      ...base.bindings,
      {
        kind: "w-engine" as const,
        bindingId: "binding:cannon" as const,
        holderId: "entity:qualifier" as const,
        sourceEntityId: "14001",
        eligible: true,
        configuration: { refinement: 1 as const },
      },
    ],
    selections: [
      {
        optionId: "nanoka:w-engines:14001:critical-hit-bonus-damage",
        bindingId: "binding:cannon" as const,
        layers: 1,
      },
    ],
    targetWindswept: {
      ...base.targetWindswept,
      contaminationElement: "physical" as const,
    },
    hit: {
      actorId: "entity:qualifier" as const,
      targetId: "entity:enemy" as const,
      actionId: "action:cannon-rotor" as const,
      skillCategory: "uncategorized" as const,
      skillTags: [],
      skillTargetIds: ["zzz-hp:skill:cannon-rotor-bonus-damage"],
      element: "physical" as const,
      declaredCriticalRate: 0.25,
      damageItems: [
        {
          mode: "direct" as const,
          role: "base" as const,
          itemId: "cannon-rotor:bonus-damage",
          stat: "attack" as const,
          statSource: { entityId: "entity:qualifier" as const },
          damageMultiplier: 0,
        },
      ] as const,
    },
    damage: {
      ...base.damage,
      damageBonus: [],
      defense: { ...base.damage.defense, targetBaseDefense: 0 },
      resistance: { ...base.damage.resistance, targetResistance: 0 },
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

/** 用真实耀变动作检查高层风化事实的唯一输入位置，不伪造普通动作的路由。 */
export async function makeWindsweptLuminizeRequest(api: {
  loadStaticCalculationData(selection: {
    readonly agents: readonly ["Remielle"]
    readonly wEngines: readonly []
  }): Promise<StaticCalculationData>
  resolveAgentAction(input: ResolveAgentActionInput): ResolvedAgentAction
}): Promise<StaticActionCalculationInput> {
  const data = await api.loadStaticCalculationData({
    agents: ["Remielle"],
    wEngines: [],
  })
  const action = api.resolveAgentAction({
    agent: data.agents[0]!.actions,
    actionId: "action:agent:1581:action:0007",
    mindscapeRank: 1,
    levels: { assist: { mode: "effective", value: 12 } },
  })
  if (!action.ok || action.calculation.kind !== "luminize")
    throw new Error("Expected the real Remielle luminize action")
  return {
    data,
    actors: [
      {
        entityId: "entity:remielle",
        agentEntityId: "1581",
        teamId: "team:players",
        coreSkillLevel: 7,
        mindscapeRank: 1,
        wEngine: null,
        driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        panel: {
          mode: "out-of-combat",
          stats: {
            attack: { unit: "attack-points", value: 1000 },
            anomalyProficiency: {
              unit: "anomaly-proficiency-points",
              value: 100,
            },
            criticalRate: { unit: "ratio", value: 0 },
            criticalDamage: { unit: "ratio", value: 0.5 },
            penetrationRatio: { unit: "ratio", value: 0 },
          },
          penetrationValue: 0,
          damageBonuses: { lumiflux: 0 },
        },
      },
    ],
    actorId: "entity:remielle",
    action,
    target: {
      entityId: "entity:enemy",
      teamId: "team:enemies",
      baseDefense: 0,
      resistances: { lumiflux: 0 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
      windswept: {
        status: "active",
        applierActorId: "entity:remielle",
        contaminationElement: null,
        baseCoefficient: { unit: "ratio", value: 0.1 },
      },
    },
    selections: [
      "agents:remiel:mindscape:0:blk-legacy:eff-ms7t5hb1-fqvxkz",
      "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
    ].map((optionId) => ({ holderId: "entity:remielle", optionId, layers: 1 })),
    luminize: {
      hit: {
        element: "lumiflux",
        damageItems: [
          {
            mode: "direct",
            role: "base",
            itemId: "special-voidflare",
            stat: "attack",
            statSource: { entityId: "entity:remielle" },
            damageMultiplier: 1,
          },
        ],
      },
      damage: {
        kind: "luminize",
        damageBonus: [],
        anomalyDamageBonus: [],
        refringe: { mode: "from-effects" },
        anomalySource: {
          mechanism: "remielle-special-voidflare",
          entityId: "entity:remielle",
          level: 60,
          strength: "full",
        },
        luminizeMultiplier: {
          baseLuminizeMultiplier: action.calculation.multiplier,
          multiplicativeLuminizeMultiplierAdjustments: [],
        },
        defense: {
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
    },
  }
}

export const roxyWeatheredConsumerSource =
  makeWindsweptLuminizeRequest.toString() +
  "\n" +
  withRoxyWeatheredFacts.toString() +
  String.raw`
function makeRoxyWeatheredRequest(definitions, catalog) {
  return withRoxyWeatheredFacts(makeRoxyAdditionalRequest(definitions, catalog))
}
` +
  "\n" +
  makeWindsweptCannonRotorRequest.toString() +
  String.raw`
async function verifyRoxyWeatheredConsumer(api, engine) {
  const require = (value, message) => { if (!value) throw new Error("Windswept consumer: " + message) }
  const close = (actual, expected) => require(Math.abs(actual - expected) < 1e-7, actual + " != " + expected)
  const data = await api.loadStaticCalculationData({agents:["Roxy","Anton","Qingyi","Evelyn"],wEngines:["Cannon Rotor"]})
  const optionId = "nanoka:agents:1621:additional-weathered-direct-damage"
  const select = {optionId,bindingId:"binding:roxy",layers:1}
  const run = request => { const r=engine.calculateStaticDamageFromCatalog(request);require(r.ok,JSON.stringify(r));return r.value }
  const base = makeRoxyWeatheredRequest(data.definitions,data.catalog)
  close(run(base).nonCritical,2574)
  const increased = run({...base,selections:[select]})
  close(increased.nonCritical,2761.2);close(increased.critical,4141.8);close(increased.expected,3106.35)
  close(increased.factors.nonCritical.windsweptDirectDamage,1.18)
  close(engine.windsweptDirectDamageFactor.calculate({baseCoefficient:.2,coefficientIncreases:[.03,.04]}),1.27)
  const cannon = makeWindsweptCannonRotorRequest(data.definitions,data.catalog)
  const unknown = engine.calculateStaticDamageFromCatalog(cannon)
  require(!unknown.ok && unknown.issues.some(i=>i.code==="MISSING_FACT"&&i.pointer==="/hit/directAttack"),"unknown independent tag")
  const noDirect = run({...cannon,hit:{...cannon.hit,directAttack:false}})
  close(noDirect.nonCritical,2000);close(noDirect.critical,3000);close(noDirect.expected,2250)
  const baseDirect = run({...cannon,hit:{...cannon.hit,directAttack:true}})
  close(baseDirect.nonCritical,2200);close(baseDirect.critical,3300);close(baseDirect.expected,2475)
  const roxyDirect = run({...cannon,hit:{...cannon.hit,directAttack:true},selections:[...cannon.selections,select]})
  close(roxyDirect.nonCritical,2360);close(roxyDirect.critical,3540);close(roxyDirect.expected,2655)
  const roxy = data.agents.find(a=>a.actions.entityId==="1621")
  const action=api.resolveAgentAction({agent:roxy.actions,actionId:"action:agent:1621:action:0013",mindscapeRank:0,levels:{chain:{mode:"effective",value:12}}})
  require(action.ok,"real Roxy ultimate")
  const actor=(entityId,agentEntityId)=>({entityId,agentEntityId,teamId:"team:players",coreSkillLevel:7,mindscapeRank:0,wEngine:null,driveDiscs:{1:null,2:null,3:null,4:null,5:null,6:null},panel:{mode:"out-of-combat",stats:{attack:{unit:"attack-points",value:1000},criticalRate:{unit:"ratio",value:.25},criticalDamage:{unit:"ratio",value:.5},penetrationRatio:{unit:"ratio",value:0}},penetrationValue:0,damageBonuses:{wind:0}}})
  const high={data,actors:[actor("entity:roxy","1621"),actor("entity:qualifier","1111")],actorId:"entity:roxy",action,directAttack:true,target:{entityId:"entity:enemy",teamId:"team:enemies",baseDefense:0,resistances:{wind:.3},isStunned:true,baseStunDamageMultiplier:1.5,windswept:{status:"active",applierActorId:"entity:qualifier",contaminationElement:null,baseCoefficient:{unit:"ratio",value:.1}}},selections:[{holderId:"entity:roxy",optionId,layers:1}]}
  const highResult=engine.calculateStaticActionDamage(high)
  require(highResult.ok && highResult.value.kind==="damage",JSON.stringify(highResult))
  // 正式终结技系数 21.315 + 11×1.938 = 42.633；1000×42.633×.7×1.5×1.18。
  close(highResult.value.totals.nonCritical,52822.287)
  close(highResult.value.totals.expected,59425.072875)
  const missing=engine.calculateStaticActionDamage({...high,directAttack:undefined})
  require(!missing.ok&&missing.issues.some(i=>i.code==="MISSING_FACT"&&i.pointer==="/directAttack"),"high-level classification pointer")
  const misplacedState=engine.calculateStaticActionDamage({...high,targetWindswept:base.targetWindswept})
  require(!misplacedState.ok&&misplacedState.issues.some(i=>i.code==="INVALID_INPUT"&&i.pointer==="/targetWindswept"),"misplaced state must not be ignored")
  const misplacedClassification=engine.calculateStaticActionDamage({...high,directAttack:false,luminize:{hit:{directAttack:true}}})
  require(!misplacedClassification.ok&&misplacedClassification.issues.some(i=>i.code==="INVALID_INPUT"&&i.pointer==="/luminize/hit/directAttack"),"nested classification must not be ignored or inherited")
  const luminize=await makeWindsweptLuminizeRequest(api)
  const luminizeResult=engine.calculateStaticActionDamage(luminize)
  require(luminizeResult.ok&&luminizeResult.value.kind==="damage",JSON.stringify(luminizeResult))
  require(luminizeResult.value.totals.nonCritical>0&&luminizeResult.value.segments.every(s=>s.damage.factors.nonCritical.windsweptDirectDamage===undefined),"real luminize route excludes direct windswept damage")
  for(const input of [high,luminize]) {
    const nested=engine.calculateStaticActionDamage({...input,luminize:{...input.luminize,targetWindswept:undefined}})
    require(!nested.ok&&nested.issues.some(i=>i.code==="INVALID_INPUT"&&i.pointer==="/luminize/targetWindswept"),"nested state presence must not discard or replace target.windswept")
  }
  return {nonCritical:increased.nonCritical,cannon:roxyDirect.expected,high:highResult.value.totals.nonCritical,unknownRejected:true}
}
`

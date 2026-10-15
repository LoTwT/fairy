import type {
  CoreSkillLevel,
  RuleSet,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"
import { makeRoxyMindscapeRequest } from "./roxy-mindscape-consumer.ts"

export const roxyCoreWindOptions = [
  "nanoka:agents:1621:core-wind-critical-damage",
  "nanoka:agents:1621:core-wind-sharp-critical-damage",
] as const
export const roxyCoreExternalCriticalRate = "roxy:core:external-critical-rate"

export function makeRoxyCoreWindRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  armorer = false,
  externalCriticalRate = 0.5,
  coreSkillLevel: CoreSkillLevel = 7,
): StaticCatalogDamageInput {
  const base = makeRoxyMindscapeRequest(definitions, catalog, 6, coreSkillLevel)
  return withRoxyCoreWindFacts(base, armorer, externalCriticalRate)
}

function withRoxyCoreWindFacts(
  base: ReturnType<typeof makeRoxyMindscapeRequest>,
  armorer: boolean,
  externalCriticalRate: number,
): StaticCatalogDamageInput {
  const actorId = armorer ? "entity:other" : "entity:roxy"
  return {
    ...base,
    actorSources: base.actorSources.map((source) =>
      source.entityId === "entity:other" && armorer
        ? { ...source, agentEntityId: "1611" }
        : source,
    ),
    world: {
      ...base.world,
      entities: base.world.entities.map((entity) =>
        entity.entityId === "entity:other" && entity.kind === "actor"
          ? {
              ...entity,
              generalStats: {
                ...entity.generalStats,
                defense: {
                  baseValue: 1700,
                  initialPercentage: [],
                  initialFixed: [],
                  finalPercentage: [],
                  finalFixed: [],
                },
              },
              directStats: {
                ...entity.directStats,
                sharpCriticalDamage: { baseValue: 0.5, additions: [] },
              },
            }
          : entity,
      ),
    },
    hit: {
      ...base.hit,
      actorId,
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "core-wind-probe",
          stat: armorer ? "defense" : "attack",
          statSource: { entityId: actorId },
          damageMultiplier: 2,
        },
      ],
    },
    damage: armorer
      ? { ...base.damage, kind: "sharpen", sharpenDamageBonus: [] }
      : base.damage,
    selections: [
      "nanoka:agents:1621:core-wind-critical-damage",
      "nanoka:agents:1621:core-wind-sharp-critical-damage",
    ].map((optionId) => ({ optionId, bindingId: "binding:roxy", layers: 1 })),
    inputs: [
      {
        bindingId: "binding:roxy",
        name: "roxy:core:external-critical-rate",
        value: { unit: "ratio", value: externalCriticalRate },
      },
    ],
  }
}

export const roxyCoreWindConsumerSource =
  withRoxyCoreWindFacts.toString() +
  String.raw`
function makeRoxyCoreWindRequest(definitions,catalog,armorer=false,externalCriticalRate=.5,coreSkillLevel=7) {
  return withRoxyCoreWindFacts(makeRoxyMindscapeRequest(definitions,catalog,6,coreSkillLevel),armorer,externalCriticalRate)
}
async function verifyRoxyCoreWindConsumer(api, engine) {
  const require = (value, message) => { if (!value) throw new Error("Roxy core wind: " + message) }
  const close = (actual, expected) => require(Math.abs(actual - expected) < 1e-7, actual + " != " + expected)
  const data = await api.loadStaticCalculationData({agents:["Roxy","Claret"],wEngines:[]})
  const regular = makeRoxyCoreWindRequest(data.definitions, data.catalog)
  const run = input => { const result = engine.calculateStaticDamageFromCatalog(input); require(result.ok, JSON.stringify(result)); return result.value }
  const normal = run(regular)
  close(normal.nonCritical,2100); close(normal.critical,3570); close(normal.expected,2467.5)
  const sharp = run(makeRoxyCoreWindRequest(data.definitions,data.catalog,true))
  close(sharp.nonCritical,3570); close(sharp.critical,5712); close(sharp.expected,4319.7)
  require(sharp.evaluation.contributions.length===1 && sharp.evaluation.contributions[0].address.stat==="sharpCriticalDamage","profession split")
  close(run({...regular,selections:regular.selections.map(s=>({...s,layers:0})),inputs:[]}).critical,3150)
  const missing=engine.calculateStaticDamageFromCatalog({...regular,inputs:[]})
  require(!missing.ok && missing.issues.some(i=>i.code==="MISSING_FACT"),"missing external CR")
  const record=data.agents.find(a=>a.actions.entityId==="1621")
  const action=api.resolveAgentAction({agent:record.actions,actionId:"action:agent:1621:action:0024",mindscapeRank:6,levels:{special:{mode:"effective",value:12}}})
  require(action.ok,"real giant windstorm")
  const high={data,actors:[{entityId:"entity:roxy",teamId:"team:players",agentEntityId:"1621",coreSkillLevel:7,mindscapeRank:6,wEngine:null,driveDiscs:{1:null,2:null,3:null,4:null,5:null,6:null},panel:{mode:"out-of-combat",stats:{attack:{unit:"attack-points",value:1000},criticalRate:{unit:"ratio",value:.25},criticalDamage:{unit:"ratio",value:.5},penetrationRatio:{unit:"ratio",value:0}},penetrationValue:0,damageBonuses:{wind:0}}}],actorId:"entity:roxy",action,target:{entityId:"entity:enemy",teamId:"team:enemies",baseDefense:0,resistances:{wind:.3},isStunned:true,baseStunDamageMultiplier:1.5},selections:regular.selections.map(s=>({holderId:"entity:roxy",optionId:s.optionId,layers:1})),inputs:[{bindingId:"binding:entity:roxy:agent:1621",name:"roxy:core:external-critical-rate",value:{unit:"ratio",value:.5}}]}
  const result=engine.calculateStaticActionDamage(high)
  require(result.ok && result.value.kind==="damage",JSON.stringify(result))
  // Fixed action 4.174 × ATK 1000 × resistance .7 × stun 1.5; CD .5 + .2, CR .25.
  close(result.value.totals.nonCritical,4382.7)
  close(result.value.totals.expected,5149.6725)
  return {normal:normal.expected,sharp:sharp.expected,high:result.value.totals.expected,missingRejected:true}
}
`

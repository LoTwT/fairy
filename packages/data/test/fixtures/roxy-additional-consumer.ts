import type {
  RuleSet,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"
import { makeRoxyMindscapeRequest } from "./roxy-mindscape-consumer.ts"

export const roxyAdditionalLevelOption =
  "nanoka:agents:1621:additional-level-damage"
export const roxyAdditionalStunOption =
  "nanoka:agents:1621:additional-hit-stun-damage"
export const roxyAdditionalLevelInput = "roxy:additional:holder-level"

export function makeRoxyAdditionalRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  level: number | null = 60,
): ReturnType<typeof makeRoxyMindscapeRequest> {
  return withRoxyAdditionalFacts(
    makeRoxyMindscapeRequest(definitions, catalog),
    level,
  )
}

function withRoxyAdditionalFacts(
  base: ReturnType<typeof makeRoxyMindscapeRequest>,
  level: number | null,
): ReturnType<typeof makeRoxyMindscapeRequest> {
  return {
    ...base,
    actorSources: [
      ...base.actorSources.map((source) => ({
        ...source,
        ...(source.entityId === "entity:roxy" && level !== null
          ? { level }
          : {}),
      })),
      { entityId: "entity:qualifier" as const, agentEntityId: "1111" },
    ],
    world: {
      ...base.world,
      entities: [
        ...base.world.entities,
        { ...base.world.entities[1]!, entityId: "entity:qualifier" as const },
      ],
    },
  }
}

// 同一消费行为用于源码、真正安装的 Node 包及 Vite dev/prod。
// makeRoxyMindscapeRequest 在现有消费脚本中先定义，保持同一非零基础夹具。
export const roxyAdditionalConsumerSource =
  withRoxyAdditionalFacts.toString() +
  String.raw`
function makeRoxyAdditionalRequest(definitions, catalog, level = 60) {
  return withRoxyAdditionalFacts(makeRoxyMindscapeRequest(definitions, catalog), level)
}
async function verifyRoxyAdditionalConsumer(api, engine) {
  const require = (condition, label) => { if (!condition) throw new Error("Roxy additional consumer: " + label) }
  const close = (value, expected, label) => require(Math.abs(value-expected)<1e-7,label+": "+value+" != "+expected)
  const data = await api.loadStaticCalculationData({agents:["Roxy","Qingyi","Anton"],wEngines:[]})
  const base = makeRoxyAdditionalRequest(data.definitions,data.catalog)
  const levelId = "nanoka:agents:1621:additional-level-damage"
  const stunId = "nanoka:agents:1621:additional-hit-stun-damage"
  const m2Id = "nanoka:agents:1621:m2-stun-damage"
  const select = (optionId,layers=1) => ({optionId,bindingId:"binding:roxy",layers})
  const calculate = request => { const result=engine.calculateStaticDamageFromCatalog(request);require(result.ok,JSON.stringify(result));return result.value }
  const own = calculate({...base,selections:[select(levelId)]})
  close(own.nonCritical,3780,"L60 own damage")
  close(own.expected,4252.5,"L60 own expected")
  const team = {...base,hit:{...base.hit,actorId:"entity:other",damageItems:base.hit.damageItems.map(item=>({...item,statSource:{entityId:"entity:other"}}))}}
  const teammate = calculate({...team,selections:[select(stunId),select(m2Id)]})
  close(teammate.nonCritical,4998,"nonqualifying Stun teammate receives both stun additions")
  close(teammate.factors.nonCritical.stunDamage,2.1,"ordinary stun sum")
  const wrong = {...base,actorSources:base.actorSources.map(source=>source.entityId==="entity:qualifier"?{...source,agentEntityId:"1251"}:source)}
  close(calculate({...wrong,selections:[select(levelId),select(stunId)]}).nonCritical,2100,"no qualifying profession")
  const missing = {...base,actorSources:base.actorSources.map(source=>({entityId:source.entityId,agentEntityId:source.agentEntityId}))}
  const rejected = engine.calculateStaticDamageFromCatalog({...missing,selections:[select(levelId)]})
  require(!rejected.ok && rejected.issues.some(issue=>issue.code==="MISSING_FACT" && issue.pointer==="/actorSources/0/level"),"missing holder level")
  close(calculate({...missing,selections:[select(levelId,0),select(stunId,0)]}).nonCritical,2100,"closed without level")
  close(calculate({...missing,selections:[select(stunId)]}).nonCritical,2520,"stun independent of level")
  const roxy = data.agents.find(record=>record.actions.entityId==="1621")
  const action=api.resolveAgentAction({agent:roxy.actions,actionId:"action:agent:1621:action:0013",mindscapeRank:6,levels:{chain:{mode:"effective",value:12}}})
  require(action.ok,"real ultimate")
  const actor=(entityId,agentEntityId)=>({entityId,teamId:"team:players",agentEntityId,coreSkillLevel:7,mindscapeRank:6,wEngine:null,driveDiscs:{1:null,2:null,3:null,4:null,5:null,6:null},panel:{mode:"out-of-combat",stats:{attack:{unit:"attack-points",value:1000},criticalRate:{unit:"ratio",value:.25},criticalDamage:{unit:"ratio",value:.5},penetrationRatio:{unit:"ratio",value:0}},penetrationValue:0,damageBonuses:{wind:0}}})
  const high={data,actors:[actor("entity:roxy","1621"),actor("entity:qualifier","1111")],actorId:"entity:roxy",action,target:{entityId:"entity:enemy",teamId:"team:enemies",baseDefense:0,resistances:{wind:.3},isStunned:true,baseStunDamageMultiplier:1.5},selections:[{holderId:"entity:roxy",optionId:levelId,layers:1},{holderId:"entity:roxy",optionId:stunId,layers:1},{holderId:"entity:roxy",optionId:m2Id,layers:1}]}
  const highResult=engine.calculateStaticActionDamage(high)
  require(highResult.ok && highResult.value.kind==="damage",JSON.stringify(highResult))
  close(highResult.value.totals.nonCritical,112806.918,"high-level verified L60")
  const override=engine.calculateStaticActionDamage({...high,inputs:[{bindingId:"binding:entity:roxy:agent:1621",name:"roxy:additional:holder-level",value:{unit:"count",value:60}}]})
  require(!override.ok && override.issues.some(issue=>issue.code==="CONTEXT_MISMATCH" && issue.pointer==="/inputs/0"),"high-level override rejected")
  return {own:own.nonCritical,team:teammate.nonCritical,high:highResult.value.totals.nonCritical,missingRejected:true}
}
`

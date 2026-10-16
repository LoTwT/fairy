/** 同一真实动作夹具用于源码、离线安装和 Vite；不改写解析后的动作元素。 */
export const roxyCoreElementsConsumerSource = String.raw`
async function makeRoxyCoreElementsFixture(api) {
  const data = await api.loadStaticCalculationData({agents:["Roxy","Anby","Claret","Miyabi","Yixuan","Ellen","Nicole","Soldier 11"],wEngines:["Crimson Moon Casket"]})
  const options = ["nanoka:agents:1621:core-element-critical-damage", "nanoka:agents:1621:core-element-sharp-critical-damage"]
  const actor = (id, agentId) => ({entityId:id,teamId:"team:players",agentEntityId:agentId,coreSkillLevel:7,mindscapeRank:0,wEngine:null,driveDiscs:{1:null,2:null,3:null,4:null,5:null,6:null},panel:{mode:"out-of-combat",stats:{health:{unit:"health-points",value:10000},attack:{unit:"attack-points",value:1000},defense:{unit:"defense-points",value:1700},sheerForce:{unit:"sheer-force-points",value:1000},criticalRate:{unit:"ratio",value:.25},criticalDamage:{unit:"ratio",value:.5},sharpCriticalDamage:{unit:"ratio",value:.5},penetrationRatio:{unit:"ratio",value:0}},penetrationValue:0,damageBonuses:{physical:0,fire:0,electric:0,wind:0,ice:0,ether:0,"auric-ink":0,frost:0}}})
  const request = (agentId="1011", ordinal="0009", elements=["electric"], coreSkillLevel=7, cr=.5) => {
    const record=data.agents.find(a=>a.actions.entityId===agentId)
    const actionId="action:agent:"+agentId+":action:"+ordinal
    const levelGroup=record.actions.actions.find(a=>a.actionId===actionId).levelGroup
    const action=api.resolveAgentAction({agent:record.actions,actionId,mindscapeRank:0,levels:{[levelGroup]:{mode:"trained",value:12}}})
    if (!action.ok) throw new Error(JSON.stringify(action))
    const holder=actor("entity:roxy","1621"); holder.coreSkillLevel=coreSkillLevel
    return {data,actors:agentId==="1621"?[holder]:[holder,actor("entity:attacker",agentId)],actorId:agentId==="1621"?"entity:roxy":"entity:attacker",action,target:{entityId:"entity:target",teamId:"team:enemies",baseDefense:0,resistances:{physical:0,fire:0,ice:0,electric:0,ether:0,wind:0,"auric-ink":0,frost:0,lumiflux:0},isStunned:false,baseStunDamageMultiplier:1},selections:options.map(optionId=>({holderId:"entity:roxy",optionId,layers:1,activeBuffElements:elements})),inputs:[{bindingId:"binding:entity:roxy:agent:1621",name:"roxy:core:external-critical-rate",value:{unit:"ratio",value:cr}}]}
  }
  return {data,options,actor,request}
}

function makeRoxyCoreElementsConsumerScenarios(engine) {
  const require=(value,message)=>{if(!value)throw new Error("Roxy elemental core: "+message)}
  const close=(actual,expected)=>require(Math.abs(actual-expected)<1e-7,actual+" != "+expected)
  const run=input=>{const r=engine.calculateStaticActionDamage(input);require(r.ok&&r.value.kind==="damage",JSON.stringify(r));return r.value}
  const contributions=result=>result.segments[0].damage.evaluation.contributions.filter(c=>c.origin.effectId.includes(":core-element-"))
  const added=result=>contributions(result).reduce((sum,c)=>sum+c.value.value,0)
  const rejected=(input,code)=>{const r=engine.calculateStaticActionDamage(input);require(!r.ok&&r.issues.some(i=>i.code===code),"expected "+code+": "+JSON.stringify(r))}
  const scenarios=[
    {name:"Anby electric action with active electric buff",verify:({request})=>{
      const electric=run(request());close(electric.totals.nonCritical,4789);close(electric.totals.expected,5627.075)
      return {electric:electric.totals.expected}
    }},
    {name:"Anby electric action with inactive electric buff",verify:({request})=>{
      const unactivated=run(request("1011","0009",["fire"]));close(unactivated.totals.expected,5387.625);close(added(unactivated),0)
      return {unactivated:unactivated.totals.expected}
    }},
    {name:"Anby physical action requires physical buff",verify:({request})=>{
      close(run(request("1011","0006",["electric"])).totals.expected,709.875)
      close(run(request("1011","0006",["physical"])).totals.expected,741.425)
      return {}
    }},
    {name:"Roxy wind action counts multiple active elements once",verify:({request})=>{
      const wind=run(request("1621","0008",["electric","fire","ice"]));close(wind.totals.expected,1236.1);require(contributions(wind).length===1,"wind counted once")
      return {wind:wind.totals.expected}
    }},
    {name:"Claret electric action uses Armorer sharp channel",verify:({request})=>{
      const sharp=run(request("1611","0009"));close(sharp.totals.expected,2138.77);require(contributions(sharp).length===1&&contributions(sharp)[0].address.stat==="sharpCriticalDamage","Armorer uses sharp channel")
      return {sharp:sharp.totals.expected}
    }},
    {name:"Miyabi frost action uses ice buff",verify:({request})=>{
      close(run(request("1091","0008",["ice"])).totals.expected,1487.55)
      return {}
    }},
    {name:"Soldier 11 fire action uses fire buff",verify:({request})=>{
      close(run(request("1041","0010",["fire"])).totals.expected,1306.6)
      return {}
    }},
    {name:"Ellen ice action uses ice buff",verify:({request})=>{
      close(run(request("1191","0009",["ice"])).totals.expected,2346.475)
      return {}
    }},
    {name:"Nicole ether action uses ether buff",verify:({request})=>{
      close(run(request("1031","0001",["ether"])).totals.expected,1494.6)
      return {}
    }},
    {name:"Yixuan auric-ink action requires ether buff",verify:({request})=>{
      const ink=run(request("1371","0006",["ether"]));close(added(ink),.2)
      close(added(run(request("1371","0006",["ice"]))),0)
      return {}
    }},
  ]
  // 中英七档独立来源表；以下帽值不从生成器或目录读取。
  const normalCaps=[.22,.25,.28,.31,.34,.37,.4], sharpCaps=[.1,.115,.13,.145,.16,.175,.2]
  for(let rank=1;rank<=7;rank++) {
    for(const [profession,agentId,coefficient,caps] of [["normal","1011",.4,normalCaps],["Armorer","1611",.2,sharpCaps]]) {
      scenarios.push({name:profession+" core "+rank+" uncapped and capped source CR",verify:({request})=>{
        for(const cr of [.25,2]) {
          const r=run(request(agentId,"0009",["electric"],rank,cr))
          const expected=Math.min(caps[rank-1],coefficient*cr)
          close(added(r),expected)
          close(r.totals.critical,r.totals.nonCritical*(1+.5+expected))
          close(r.totals.expected,r.totals.nonCritical*(1+.25*(.5+expected)))
        }
        return {}
      }})
    }
  }
  scenarios.push(
    {name:"disabled and absent selections need no source CR",verify:({request})=>{
      const closed=request();closed.selections=closed.selections.map(s=>({...s,layers:0}));closed.inputs=[]
      close(run(closed).totals.expected,5387.625)
      const absent=request();absent.selections=[];absent.inputs=[];close(run(absent).totals.expected,5387.625)
      return {}
    }},
    {name:"legacy wind scope and mixed state rejection",verify:({request})=>{
      const old=request();old.selections=old.selections.map(({activeBuffElements,...s})=>({...s,optionId:s.optionId.replace("core-element","core-wind")}));close(run(old).totals.expected,5387.625)
      const mixed=request();mixed.selections.push({...old.selections[0]});rejected(mixed,"CONTEXT_MISMATCH")
      return {}
    }},
    {name:"missing active elements are rejected",verify:({request})=>{
      const missing=request();missing.selections=missing.selections.map(({activeBuffElements,...s})=>s);rejected(missing,"MISSING_FACT")
      return {}
    }},
    {name:"wind as active buff element is rejected",verify:({request})=>{
      rejected(request("1011","0009",["wind"]),"INVALID_INPUT")
      return {}
    }},
    {name:"duplicate active elements are rejected",verify:({request})=>{
      rejected(request("1011","0009",["electric","electric"]),"DUPLICATE_ID")
      return {}
    }},
    {name:"external derived-state override is rejected",verify:({request})=>{
      const external=request();external.inputs.push({bindingId:"binding:entity:roxy:agent:1621",name:"roxy:core:active-buff:fire",value:{unit:"count",value:1}});rejected(external,"DUPLICATE_ID")
      return {}
    }},
    {name:"fully equipped Roxy supplies source CR",verify:({request,actor})=>{
      const equipped=request();const holder=actor("entity:roxy","1621");holder.panel={mode:"equipment"};holder.wEngine={entityId:"14162",refinement:1,eligible:true}
      holder.driveDiscs=Object.fromEntries([1,2,3,4,5,6].map(slot=>[slot,{setEntityId:slot<=4?"31200":"31000",mainStat:slot===1?{attribute:"health"}:slot===2?{attribute:"attack"}:slot===3?{attribute:"defense"}:slot===4?{attribute:"criticalRate"}:slot===5?{attribute:"damageBonus",element:"wind"}:{attribute:"impact"},substats:slot===4?[]:[{attribute:"criticalRate",operation:"ratio-add",rolls:1}]}]))
      equipped.actors=[holder,equipped.actors[1]]
      const panel=run({...equipped,selections:[],inputs:[]}).panels.find(p=>p.entityId==="entity:roxy")
      // 基础 .05 + 核心7 .144 + 主词条 .24 + 五次副词条 .12 + 啄木鸟二件套 .08。
      close(panel.stats.criticalRate.value,.634)
      equipped.inputs[0].value.value=panel.stats.criticalRate.value
      const fromEquipment=run(equipped);close(added(fromEquipment),.2536);close(fromEquipment.totals.expected,5691.2476)
      return {sourceCriticalRate:panel.stats.criticalRate.value,equipped:fromEquipment.totals.expected}
    }},
  )
  return scenarios
}

async function verifyRoxyCoreElementsConsumer(api,engine) {
  const fixture=await makeRoxyCoreElementsFixture(api)
  const summary={}
  for(const scenario of makeRoxyCoreElementsConsumerScenarios(engine)) {
    Object.assign(summary,scenario.verify(fixture))
  }
  return summary
}
`

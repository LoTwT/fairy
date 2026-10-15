// Installed Node and both Vite modes use the same real action consumer.
// makeRoxyMindscapeRequest is supplied by the preceding mindscape consumer.
export const roxyWindEyeConsumerSource = String.raw`
async function verifyRoxyWindEyeConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({agents:["Roxy"],wEngines:[]})
  const require = (condition, label) => { if (!condition) throw new Error("Roxy wind eye: " + label) }
  const close = (actual, expected, label) => require(Math.abs(actual-expected)<1e-7, label + ": " + actual + " != " + expected)
  const optionId = "nanoka:agents:1621:m6-giant-windstorm"
  const effectId = "agent:1621:nanoka:m6-giant-windstorm"
  const results = []
  const requests = []
  const calculate = input => { const result = engine.calculateStaticDamageFromCatalog(input); require(result.ok,JSON.stringify(result)); require(result.value.expected>0,"nonzero"); return result.value }
  for (const [suffix, multiplier] of [["0022",1.049],["0023",1.049],["0024",4.174]]) {
    const action = api.resolveAgentAction({agent:data.agents[0].actions,actionId:"action:agent:1621:action:"+suffix,mindscapeRank:6,levels:{special:{mode:"effective",value:12}}})
    require(action.ok && action.calculation.kind==="damage","real action "+suffix)
    require(action.skillCategory==="special","special category")
    const segment=action.calculation.segments[0]
    require(segment.element==="wind" && segment.damageKind==="regular" && segment.repeat===1,"regular wind once")
    close(segment.damageItems[0].damageMultiplier,multiplier,"original multiplier")
    const base=makeRoxyMindscapeRequest(data.definitions,data.catalog)
    const request={...base,hit:{...base.hit,actionId:action.actionId,skillCategory:action.skillCategory,skillTargetIds:action.skillTargetIds,element:segment.element,damageItems:segment.damageItems.map(item=>({...item,mode:"direct",role:"base",statSource:{entityId:"entity:roxy"}}))},damage:{...base.damage,damageBonus:[0.3]}}
    requests.push(request)
    const closed=calculate(request)
    close(closed.nonCritical,1000*multiplier*1.3*0.7*1.5,"one event/one second")
    close(closed.expected,closed.nonCritical*1.125,"ordinary CR/CD")
    const zero=calculate({...request,selections:[{optionId,bindingId:"binding:roxy",layers:0}]})
    close(zero.expected,closed.expected,"zero disabled")
    if (suffix==="0024") {
      const open=calculate({...request,selections:[{optionId,bindingId:"binding:roxy",layers:1}]})
      close(open.expected,closed.expected*2.5,"giant M6")
      close(open.factors.nonCritical.damageBonus,1.3,"not damage bonus")
      close(open.factors.nonCritical.resistance,0.7,"no implicit resistance ignore")
      require(open.evaluation.contributions.some(c=>c.origin.effectId===effectId && c.value.value===2.5),"M6 attribution")
    } else {
      const wrong=engine.calculateStaticDamageFromCatalog({...request,selections:[{optionId,bindingId:"binding:roxy",layers:1}]})
      require(!wrong.ok && wrong.issues.some(issue=>issue.code==="MISSING_REFERENCE"),"missing giant rejected")
    }
    results.push(multiplier)
  }
  const giant=requests[2]
  const mixed=calculate({...giant,hit:{...giant.hit,damageItems:requests.flatMap(request=>request.hit.damageItems)},selections:[{optionId,bindingId:"binding:roxy",layers:1}]})
  close(mixed.nonCritical,1000*(1.049+1.049+4.174*2.5)*1.3*0.7*1.5,"only giant item scaled")
  close(mixed.expected,mixed.nonCritical*1.125,"mixed ordinary critical")
  return {multipliers:results,mixedBase:12.533,giantScale:2.5,missingGiantRejected:true}
}
`

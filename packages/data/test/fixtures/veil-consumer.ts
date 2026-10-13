/** 同一公开消费脚本分别在真实安装包 Node 和 Vite development/production 执行。 */
export const veilConsumerSource = String.raw`
async function verifyVeilConsumer(api, calculate) {
  const data = await api.loadStaticCalculationData({ agents: ["Ye Shunguang", "Lycaon"], wEngines: [] })
  const agent = data.agents.find(a => a.attributes.entityId === "1431").actions
  const actor = (entityId, agentEntityId, mindscapeRank) => ({ entityId, teamId: "team:players", agentEntityId, mindscapeRank, coreSkillLevel: 7, wEngine: null, driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }, panel: { mode: "out-of-combat", stats: { attack: { unit: "attack-points", value: 1000 }, criticalRate: { unit: "ratio", value: 0.25 }, criticalDamage: { unit: "ratio", value: 0.5 }, penetrationRatio: { unit: "ratio", value: 0 } }, penetrationValue: 0, damageBonuses: { physical: 0.3 } } })
  const trigger = { eventId: "event:veil", actorId: "entity:enemy", activationSnapshotId: "snapshot:veil" }
  const request = {
    data, actors: [actor("entity:ye", "1431", 4), actor("entity:lycaon", "1141", 0)], actorId: "entity:ye",
    action: api.resolveAgentAction({ agent, actionId: "action:agent:1431:action:0001", mindscapeRank: 4, levels: { assist: { mode: "effective", value: 12 } } }),
    target: { entityId: "entity:enemy", teamId: "team:enemies", baseDefense: 0, resistances: { physical: 0 }, isStunned: true, baseStunDamageMultiplier: 1.6 },
    selections: [{ holderId: "entity:ye", optionId: "nanoka:agents:yeshunguang:veil-vulnerability", layers: 1, trigger }, { holderId: "entity:lycaon", optionId: "agents:lycaon:mindscape:0:blk-ms49npw0-1i75ne:eff-ms49npw0-qzil8p", layers: 1 }],
    inputs: [{ bindingId: "binding:entity:ye:agent:1431", name: "veilVulnerabilityBonusAtEntry", value: { unit: "ratio", value: 1.375 } }], atSeconds: 5,
    snapshots: [{ snapshotId: "snapshot:veil", atSeconds: 2, attributes: [], world: { entities: [{ kind: "actor", entityId: "entity:ye", teamId: "team:players", generalStats: {}, directStats: {} }, { kind: "actor", entityId: "entity:enemy", teamId: "team:enemies", generalStats: {}, directStats: {} }], states: [], distances: [] } }],
  }
  const result = (input) => { const r = calculate(input); if (!r.ok || r.value.kind !== "damage") throw new Error(JSON.stringify(r)); return r.value }
  const close = (a, b) => { if (Math.abs(a - b) > 1e-8) throw new Error("Veil consumer mismatch: " + a + " != " + b) }
  const enabled = result(request), active = enabled.segments[0].damage.factors.nonCritical.stunDamage
  close(active, 2.375); close(enabled.totals.nonCritical, 1000 * 8.008 * 1.3 * 2.375)
  if (!enabled.segments[0].damage.evaluation.contributions.some(c => c.operator === "replace" && c.origin.bindingId === "binding:entity:ye:agent:1431")) throw new Error("Missing replacement attribution")
  const off = { ...request, selections: [{ ...request.selections[0], layers: 0, trigger: undefined }, request.selections[1]], inputs: [] }
  const ordinary = result(off).segments[0].damage.factors.nonCritical.stunDamage
  close(ordinary, 1.95)
  const moved = result({ ...request, target: { ...request.target, isStunned: false, baseStunDamageMultiplier: 0.6 } }).segments[0].damage.factors.nonCritical.stunDamage
  close(moved, 2.375)
  const zero = result({ ...request, inputs: [{ ...request.inputs[0], value: { unit: "ratio", value: 0 } }] }).segments[0].damage.factors.nonCritical.stunDamage
  close(zero, 1)
  const missing = calculate({ ...request, selections: [{ ...request.selections[0], trigger: undefined }, request.selections[1]] }).ok
  if (missing) throw new Error("Missing entry context was accepted")
  return { active, ordinary, moved, zero, missing }
}
`

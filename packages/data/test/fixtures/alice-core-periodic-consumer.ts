/** 同一公开消费脚本在真实安装包 Node 和 Vite dev/prod 中执行。 */
export const aliceCorePeriodicConsumerSource = String.raw`
async function verifyAliceCorePeriodicConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({ agents: ["Alice"], wEngines: [] })
  const { definitions, catalog } = data
  const optionId = "nanoka:agents:alice:core-periodic-damage"
  const effectId = "agent:1401:nanoka:core-periodic-damage:mindscape:0"
  const world = { entities: [
    { kind: "actor", entityId: "entity:alice", teamId: "team:players", generalStats: {}, directStats: {} },
    { kind: "actor", entityId: "entity:provider", teamId: "team:players", generalStats: {}, directStats: {} },
    { kind: "actor", entityId: "entity:enemy", teamId: "team:enemies", generalStats: {}, directStats: {} },
  ], states: [], distances: [] }
  const request = {
    mechanism: "alice-core-periodic-damage", definitions, catalog,
    bindings: [{ kind: "agent", bindingId: "binding:alice", holderId: "entity:alice", sourceEntityId: "1401", eligible: true, configuration: { mindscapeRank: 6, coreSkillLevel: 7 } }],
    selections: [{ optionId, bindingId: "binding:alice", layers: 1 }], actorSources: [{ entityId: "entity:alice", agentEntityId: "1401" }],
    world: structuredClone(world), snapshots: [{ snapshotId: "snapshot:original", atSeconds: 2, attributes: [], world: structuredClone(world) }], atSeconds: 9,
    event: { eventId: "event:periodic", actorId: "entity:alice", targetId: "entity:enemy", sourceBindingId: "binding:alice", originalAnomalyEventId: "event:original", originalAnomalySnapshotId: "snapshot:original", originalAnomalyActive: true },
    originalAnomalies: [{ eventId: "event:original", snapshotId: "snapshot:original", sourceActorId: "entity:provider", targetId: "entity:enemy", kind: "assault", element: "physical", isAnomalyCritical: true, settledDamage: { unit: "damage-points", value: 12345.6789 } }],
  }
  const require = (condition, message) => { if (!condition) throw new Error("Alice periodic consumer: " + message) }
  const result = (r) => { require(r.ok, JSON.stringify(r)); return r.value }
  const close = (a, b) => require(Math.abs(a-b) < 1e-8, String(a) + " != " + b)
  const high = result(engine.calculateStaticDamageFromCatalog(request))
  close(high.expected, 308.64197250000007)
  require(high.critical === null && high.criticalRate === 0 && high.nonCritical === high.expected && high.status === "applied", "deterministic branch")
  require(high.provenance.originalAnomaly.sourceActorId === "entity:provider" && high.contributions.length === 1 && high.contributions[0].effectId === effectId, "source attribution")
  const { catalog: _catalog, actorSources: _actors, ...base } = request
  const low = result(engine.calculateStaticDamage({ ...base, selections: [{ effectId, bindingId: "binding:alice", layers: 1 }] }))
  close(low.expected, high.expected)
  const off = result(engine.calculateStaticDamageFromCatalog({ ...request, selections: [] }))
  require(off.status === "inactive" && off.expected === 0 && off.contributions.length === 0, "inactive result")
  require(!engine.calculateStaticDamageFromCatalog({ ...request, snapshots: [] }).ok, "missing snapshot accepted")
  require(!engine.calculateStaticDamageFromCatalog({ ...request, selections: [], originalAnomalies: [] }).ok, "inactive hid a missing fact")
  require(!engine.calculateStaticDamage({ ...base, hit: {}, selections: [] }).ok, "mixed low shape accepted")
  require(!engine.calculateStaticDamageFromCatalog({ ...request, originalAnomalies: [{ ...request.originalAnomalies[0], kind: "polarity-assault" }] }).ok, "polarity accepted")
  require(!engine.calculateStaticDamageFromCatalog({ ...request, selections: [...request.selections, { bindingId: "binding:alice", optionId: "nanoka:agents:alice:m6-proficiency-damage", layers: 1 }] }).ok, "M6 mixed into a period")
  const agent = data.agents[0].actions
  require(agent.actions.length === 21, "formal action count")
  const levels = Object.fromEntries(["basic","dodge","assist","special","chain"].map(k => [k,{ mode: "trained", value: 12 }]))
  for (const action of agent.actions) {
    const r = api.resolveAgentAction({ agent, actionId: action.actionId, mindscapeRank: 6, levels })
    require(r.ok, "unresolved " + action.actionId)
    if (r.calculation.kind === "damage") require(r.calculation.segments.length > 0 && r.calculation.segments.every(s => s.damageItems.length > 0 && s.damageItems.every(i => !i.itemId.includes("core-periodic"))), "empty or auto-periodic action")
  }
  const action = api.resolveAgentAction({ agent, actionId: "action:agent:1401:action:0001", mindscapeRank: 6, levels })
  const ordinary = {
    data, actors: [{ entityId: "entity:alice", teamId: "team:players", agentEntityId: "1401", mindscapeRank: 6, coreSkillLevel: 7, wEngine: null, driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }, panel: { mode: "out-of-combat", stats: { attack: { unit: "attack-points", value: 1234.567 }, criticalRate: { unit: "ratio", value: .25 }, criticalDamage: { unit: "ratio", value: .61 }, penetrationRatio: { unit: "ratio", value: .2 } }, penetrationValue: 0, damageBonuses: { physical: .37 } } }], actorId: "entity:alice", action,
    target: { entityId: "entity:enemy", teamId: "team:enemies", baseDefense: 1000, resistances: { physical: .23 }, isStunned: true, baseStunDamageMultiplier: 1.61 }, selections: [],
  }
  const plain = result(engine.calculateStaticActionDamage(ordinary))
  require(plain.kind === "damage" && plain.totals.expected > 0 && plain.segments.length > 0, "ordinary action failed")
  const rejected = engine.calculateStaticActionDamage({ ...ordinary, selections: [{ holderId: "entity:alice", optionId, layers: 1 }] })
  require(!rejected.ok && rejected.issues.some(i => i.code === "CONTEXT_MISMATCH"), "ordinary action accepted named period")
  return { high: high.expected, low: low.expected, inactive: off.expected, actions: agent.actions.length, ordinaryDamage: plain.totals.expected, ordinaryRejectsPeriodic: !rejected.ok }
}
`

export const aliceCorePeriodicConsumerTypes = String.raw`
import * as periodicCore from "@randomplay/core"
import type { AliceCorePeriodicDamageInput, AliceCorePeriodicCatalogInput, AliceCorePeriodicDamageResult, AliceCorePeriodicRule, StaticDamageInput, StaticDamageResult, EffectEngine, Result } from "@randomplay/core"
declare const periodicLow: AliceCorePeriodicDamageInput
declare const periodicCatalog: AliceCorePeriodicCatalogInput
declare const ordinaryInput: StaticDamageInput
const periodicEngine: EffectEngine = periodicCore
const lowPeriod: Result<AliceCorePeriodicDamageResult> = periodicCore.calculateStaticDamage(periodicLow)
const catalogPeriod: Result<AliceCorePeriodicDamageResult> = periodicCore.calculateStaticDamageFromCatalog(periodicCatalog)
const throughEngine: Result<AliceCorePeriodicDamageResult> = periodicEngine.calculateStaticDamage(periodicLow)
const plainDamage: Result<StaticDamageResult> = periodicCore.calculateStaticDamage(ordinaryInput)
const originalReturnShape: ReturnType<typeof periodicCore.calculateStaticDamage> = plainDamage
const originalCatalogReturnShape: ReturnType<typeof periodicCore.calculateStaticDamageFromCatalog> = plainDamage
// @ts-expect-error a structural variable cannot mix the ordinary hit into a named request
periodicCore.calculateStaticDamage({ ...periodicLow, hit: ordinaryInput.hit })
// @ts-expect-error no probabilities on the named branch
periodicCore.calculateStaticDamageFromCatalog({ ...periodicCatalog, declaredCriticalRate: .5 })
// @ts-expect-error original actual damage uses a dedicated quantity
const badFact: AliceCorePeriodicDamageInput["originalAnomalies"][number] = { ...periodicLow.originalAnomalies[0]!, settledDamage: { unit: "ratio", value: .5 } }
// @ts-expect-error no polarity claim is exposed by the type
const badKind: AliceCorePeriodicDamageInput["originalAnomalies"][number] = { ...periodicLow.originalAnomalies[0]!, kind: "polarity-assault" }
// @ts-expect-error the ratio is fixed by this named operation
const wrongRatio: AliceCorePeriodicRule["operation"] = { kind: "alice-core-periodic-damage", ratio: { kind: "literal", unit: "ratio", value: .03 } }
void [lowPeriod,catalogPeriod,throughEngine,plainDamage,originalReturnShape,originalCatalogReturnShape,badFact,badKind,wrongRatio]
`

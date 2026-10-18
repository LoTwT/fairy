import type {
  LucyGuardBoarCatalogInput,
  RuleSet,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"
export type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }

/** 手算非整数输入；期望值不从生产规则或计算结果生成。 */
export function makeLucyGuardBoarRequest(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
): Mutable<LucyGuardBoarCatalogInput> {
  const general = (baseValue: number) => ({
    baseValue,
    initialPercentage: [],
    initialFixed: [],
    finalPercentage: [],
    finalFixed: [],
  })
  return {
    mechanism: "lucy-guard-boar",
    definitions: definitions as Mutable<RuleSet>,
    catalog: catalog as Mutable<StaticEffectCatalog>,
    sourceBindingId: "binding:lucy",
    atSeconds: 10,
    snapshots: [],
    bindings: [
      {
        kind: "agent",
        bindingId: "binding:lucy",
        holderId: "entity:lucy",
        sourceEntityId: "1151",
        eligible: true,
        configuration: {
          mindscapeRank: 6,
          coreSkillLevel: 1,
          specialSkillLevel: 12,
        },
      },
    ],
    selections: [
      "nanoka:agents:lucy:guard-boar-inheritance",
      "nanoka:agents:lucy:m6-boar-rain",
      "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk",
      "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r",
      "agents:lucy:mindscape:4:blk-legacy:legacy-team-critDmg",
    ].map((optionId) => ({ optionId, bindingId: "binding:lucy", layers: 1 })),
    actorSources: [
      { entityId: "entity:lucy", agentEntityId: "1151" },
      { entityId: "entity:trigger", agentEntityId: "1041" },
    ],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:lucy",
          teamId: "team:players",
          generalStats: {
            attack: general(1173.25),
            impact: general(143.5),
            anomalyProficiency: general(212.75),
          },
          directStats: {
            criticalRate: { baseValue: 0.37, additions: [] },
            criticalDamage: { baseValue: 0.83, additions: [] },
            penetrationRatio: { baseValue: 0.62, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:trigger",
          teamId: "team:players",
          generalStats: { attack: general(9999.75) },
          directStats: {
            criticalRate: { baseValue: 0.91, additions: [] },
            criticalDamage: { baseValue: 2.125, additions: [] },
            penetrationRatio: { baseValue: 0.88, additions: [] },
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
          kind: "summon",
          entityId: "entity:boar",
          teamId: "team:players",
          ownerId: "entity:lucy",
          summonKind: "lucy-guard-boar",
          deployed: true,
        },
      ],
      states: [],
      distances: [],
    },
    boar: {
      entityId: "entity:boar",
      ownerSource: { entityId: "entity:lucy" },
      ownStats: {
        attack: { unit: "attack-points", value: 37.25 },
        impact: { unit: "impact-points", value: 11.5 },
        anomalyProficiency: {
          unit: "anomaly-proficiency-points",
          value: 17.75,
        },
        criticalRate: { unit: "ratio", value: 0.07 },
        criticalDamage: { unit: "ratio", value: 0.19 },
        penetrationRatio: { unit: "ratio", value: 0.17 },
      },
    },
    teamCondition: {
      kind: "teammate",
      entityId: "entity:trigger",
      reason: "same-element",
    },
    conditionalModel: {
      statComposition: "own-plus-owner-current-without-selected-lucy-cheer",
      otherEffects: "lucy-options-only",
      damageFactors: "explicit-boar-baseline",
      criticalDamage: "resolved-boar",
    },
    settlement: {
      kind: "m6-explosion",
      event: {
        eventId: "event:lucy-m6",
        sourceBindingId: "binding:lucy",
        triggerActorId: "entity:trigger",
        targetId: "entity:enemy",
        skillCategory: "enhanced-special",
        cheerOn: true,
      },
      criticalRate: { unit: "ratio", value: 0.31 },
      damage: {
        kind: "regular",
        damageBonus: [0.173, 0.081],
        defense: {
          attackerLevel: 60,
          targetBaseDefense: 833.7,
          defensePercentageAdjustments: [-0.13],
          penetrationValues: [23.4],
        },
        resistance: {
          targetResistance: 0.23,
          targetResistanceReductions: [0.09],
          attackerResistanceIgnoreValues: [0.04],
        },
        damageTaken: {
          targetDamageTakenIncreases: [0.13],
          targetDamageTakenReductions: [0.07],
        },
        stunDamage: {
          isTargetStunned: true,
          targetBaseStunDamageMultiplier: 1.75,
          targetStunDamageMultiplierAdjustments: [0.2],
        },
      },
    },
  }
}

export const lucyGuardBoarConsumerSource =
  makeLucyGuardBoarRequest.toString() +
  String.raw`
async function verifyLucyGuardBoarConsumer(api, engine) {
  const data = await api.loadStaticCalculationData({ agents: ["1151", "1041"], wEngines: [] })
  const request = makeLucyGuardBoarRequest(data.definitions, data.catalog)
  const require = (ok, message) => { if (!ok) throw new Error("Lucy guard boar consumer: " + message) }
  const value = result => { require(result.ok, JSON.stringify(result)); return result.value }
  const close = (a,b) => require(Math.abs(a-b)<1e-8, a+" != "+b)
  const low = r => {
    const { catalog, actorSources, ...base } = r
    return { ...base, selections: r.selections.map(s => ({ effectId: catalog.options.find(o=>o.optionId===s.optionId).variants[0].effectIds[0], bindingId:s.bindingId, layers:s.layers })) }
  }
  const runs = [r=>engine.calculateStaticDamage(low(r)), engine.calculateStaticDamageFromCatalog, engine.calculateStaticActionDamage]
  const results = runs.map(run => value(run(request)))
  for (const result of results) {
    close(result.attributes.attack.value,1704.9163);close(result.attributes.criticalDamage.value,1.12)
    close(result.settlement.nonCritical,6902.0273326394645)
    close(result.settlement.critical,14632.297945195665)
    close(result.settlement.expected,9298.411222531886)
    require(result.settlement.attackProvider.entityId==="entity:boar" && result.settlement.event.triggerActorId==="entity:trigger", "distinct identities")
    require(result.settlement.effectId==="agent:1151:nanoka:m6-boar-rain:mindscape:6" && result.settlement.references.length===2,"M6 source attribution")
    require(result.provenance.conversionInput.source==="derived-owner-initial","derived initial ATK")
  }
  const off = {...request,selections:request.selections.filter(s=>s.optionId!=="nanoka:agents:lucy:m6-boar-rain")}
  for (const run of runs) {
    const inactive=value(run(off));require(inactive.settlement.status==="inactive" && inactive.settlement.expected===0,"M6 off")
    require(!run({...off,boar:{...off.boar,ownerSource:{entityId:"entity:lucy",snapshotId:"snapshot:old"}}}).ok,"snapshot even when off")
    require(!run({...off,settlement:{...off.settlement,event:{...off.settlement.event,skillCategory:"ex-special"}}}).ok,"invalid trigger category")
    const owner=structuredClone(request);owner.world.entities.find(e=>e.kind==="summon").ownerId="entity:trigger"
    require(!run(owner).ok,"wrong owner")
  }
  const attributes=value(engine.calculateStaticDamageFromCatalog({...off,settlement:{kind:"attributes"}}))
  require(attributes.settlement===null,"attributes only")
  return {expected:results[1].settlement.expected,low:results[0].settlement.expected,high:results[2].settlement.expected,attack:attributes.attributes.attack.value,inactive:0,boar:"entity:boar",trigger:"entity:trigger"}
}
`

export const lucyGuardBoarConsumerTypes = String.raw`
import * as lucyCore from "@randomplay/core"
import type { LucyGuardBoarDamageInput, LucyGuardBoarCatalogInput, LucyGuardBoarResult, LucyGuardBoarM6Event, LucyGuardBoarM6Rule, EffectEngine as LucyEffectEngine, Result as LucyResult } from "@randomplay/core"
declare const lucyLow: LucyGuardBoarDamageInput
declare const lucyCatalog: LucyGuardBoarCatalogInput
const lucyEngine: LucyEffectEngine = lucyCore
const lucyLowResult: LucyResult<LucyGuardBoarResult> = lucyEngine.calculateStaticDamage(lucyLow)
const lucyCatalogResult: LucyResult<LucyGuardBoarResult> = lucyCore.calculateStaticDamageFromCatalog(lucyCatalog)
const lucyHighResult: LucyResult<LucyGuardBoarResult> = lucyCore.calculateStaticActionDamage(lucyCatalog)
// @ts-expect-error this named path does not accept an ordinary hit
lucyCore.calculateStaticDamage({ ...lucyLow, hit: { actorId: "entity:lucy" } })
// @ts-expect-error current inheritance cannot take a historical owner source
const lucySnapshot: LucyGuardBoarDamageInput["boar"]["ownerSource"] = { entityId:"entity:lucy",snapshotId:"snapshot:old" }
// @ts-expect-error use the existing enhanced-special literal
const lucyCategory: LucyGuardBoarM6Event["skillCategory"] = "ex-special"
// @ts-expect-error M6 is one fixed triple-ATK event
const lucyMultiplier: LucyGuardBoarM6Rule["operation"] = {kind:"lucy-guard-boar-m6-damage",multiplier:{unit:"multiplier",value:9},element:"fire",damageKind:"regular",skillCategory:"uncategorized"}
void [lucyLowResult,lucyCatalogResult,lucyHighResult,lucySnapshot,lucyCategory,lucyMultiplier]
`

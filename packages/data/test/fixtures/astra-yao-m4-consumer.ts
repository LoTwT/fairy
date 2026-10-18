import type {
  AstraYaoM4CatalogInput,
  RuleSet,
  StaticEffectCatalog,
} from "../../../core/src/effects/types.ts"
export type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> }

/** 非中性输入与手算锚点独立于来源登记；同时用于 Node 安装包和真实浏览器。 */
export function makeAstraYaoM4Request(
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
): Mutable<AstraYaoM4CatalogInput> {
  const general = (baseValue: number) => ({
    baseValue,
    initialPercentage: [],
    initialFixed: [],
    finalPercentage: [],
    finalFixed: [],
  })
  return {
    mechanism: "astra-yao-m4-quick-assist-damage",
    definitions,
    catalog,
    bindings: [
      {
        kind: "agent",
        bindingId: "binding:astra",
        holderId: "entity:astra",
        sourceEntityId: "1311",
        eligible: true,
        configuration: { mindscapeRank: 4, coreSkillLevel: 7 },
      },
    ],
    selections: [
      {
        optionId: "nanoka:agents:astrayao:m4-quick-assist-bonus-damage",
        bindingId: "binding:astra",
        layers: 1,
      },
    ],
    actorSources: [
      { entityId: "entity:astra", agentEntityId: "1311" },
      { entityId: "entity:trigger", agentEntityId: "1021" },
    ],
    event: {
      eventId: "event:m4",
      sourceBindingId: "binding:astra",
      triggerActorId: "entity:trigger",
      targetId: "entity:enemy",
      triggerSpecialty: "attack",
      idyllicCadenza: true,
      enteredViaQuickAssist: true,
      nextQuickAssistHeavyHit: true,
    },
    conditionalModel: {
      attackReading: "holder-current",
      factorBeneficiary: "trigger-actor-current",
      criticalRate: { unit: "ratio", value: 0.375 },
      criticalDamageSource: { entityId: "entity:trigger" },
      penetrationRatioSource: { entityId: "entity:trigger" },
    },
    atSeconds: 10,
    snapshots: [],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:astra",
          teamId: "team:players",
          generalStats: { attack: general(3245.375) },
          directStats: {
            criticalRate: { baseValue: 0.91, additions: [] },
            criticalDamage: { baseValue: 1.7, additions: [] },
            penetrationRatio: { baseValue: 0.3, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:trigger",
          teamId: "team:players",
          generalStats: { attack: general(1873.625) },
          directStats: {
            criticalRate: { baseValue: 0.17, additions: [] },
            criticalDamage: { baseValue: 0.85, additions: [] },
            penetrationRatio: { baseValue: 0.12, additions: [] },
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
      actorId: "entity:trigger",
      targetId: "entity:enemy",
      actionId: "action:astra-m4-event",
      skillCategory: "uncategorized",
      skillTargetIds: ["zzz-hp:skill:astrayao-m4-quick-assist-bonus-damage"],
      element: "physical",
      damageItems: [
        {
          itemId: "astrayao:m4-quick-assist-bonus-damage",
          stat: "attack",
          statSource: { entityId: "entity:astra" },
          mode: "direct",
          role: "base",
          damageMultiplier: 0,
        },
      ],
    },
    damage: {
      kind: "regular",
      damageBonus: [0.2375],
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 987.5,
        defensePercentageAdjustments: [-0.13],
        penetrationValues: [23.75],
      },
      resistance: {
        targetResistance: 0.32,
        targetResistanceReductions: [0.045],
        attackerResistanceIgnoreValues: [0.0675],
      },
      damageTaken: {
        targetDamageTakenIncreases: [0.1875],
        targetDamageTakenReductions: [0.0375],
      },
      stunDamage: {
        isTargetStunned: true,
        targetBaseStunDamageMultiplier: 1.45,
        targetStunDamageMultiplierAdjustments: [0.175],
      },
    },
  } as unknown as Mutable<AstraYaoM4CatalogInput>
}

export const astraYaoM4ConsumerSource =
  makeAstraYaoM4Request.toString() +
  String.raw`
async function verifyAstraYaoM4Consumer(api, engine) {
  const data = await api.loadStaticCalculationData({ agents: ["1311", "1021"], wEngines: [] })
  const request = makeAstraYaoM4Request(data.definitions, data.catalog)
  const require = (condition, message) => { if (!condition) throw new Error("Astra Yao M4 consumer: " + message) }
  const result = (r) => { require(r.ok, JSON.stringify(r)); return r.value }
  const close = (a, b) => require(Math.abs(a-b) < 1e-8, a + " != " + b)
  const value = result(engine.calculateStaticDamageFromCatalog(request))
  close(value.nonCritical, 9282.567464197858); close(value.critical, 17172.74980876604); close(value.expected, 12241.385843410926)
  require(value.status === "applied" && value.provenance.holderId === "entity:astra" && value.provenance.hitActorId === "entity:trigger", "cross-actor attribution")
  const { catalog, actorSources, ...base } = request
  const { skillTargetIds, damageItems, ...hit } = base.hit
  const { mode, role, ...item } = damageItems[0]
  const low = { ...base, selections: [{ effectId: "agent:1311:nanoka:m4-quick-assist-bonus-damage:mindscape:4", bindingId: "binding:astra", layers: 1 }], hit: { ...hit, damageItems: [item] } }
  close(result(engine.calculateStaticDamage(low)).expected, value.expected)
  close(result(engine.calculateStaticActionDamage(request)).expected, value.expected)
  const inactive = result(engine.calculateStaticDamageFromCatalog({ ...request, selections: [] }))
  require(inactive.status === "inactive" && inactive.expected === 0 && inactive.criticalRate === .375, "inactive")
  require(!engine.calculateStaticDamageFromCatalog({ ...request, event: { ...request.event, triggerActorId: "entity:astra" } }).ok, "self trigger")
  require(!engine.calculateStaticActionDamage({ ...request, conditionalModel: { ...request.conditionalModel, criticalDamageSource: { entityId: "entity:trigger", snapshotId: "snapshot:missing" } } }).ok, "high missing snapshot")
  require(!engine.calculateStaticDamage({ ...low, hit: { ...low.hit, declaredCriticalRate: .375 } }).ok, "forbidden declaration")
  const { mechanism, event, conditionalModel, ...ordinary } = request
  require(!engine.calculateStaticDamageFromCatalog(ordinary).ok, "ordinary provider-owned target")
  return { expected: value.expected, low: result(engine.calculateStaticDamage(low)).expected, inactive: inactive.expected, holder: value.provenance.holderId, trigger: value.provenance.hitActorId }
}
`

export const astraYaoM4ConsumerTypes = String.raw`
import * as astraCore from "@randomplay/core"
import type { AstraYaoM4DamageInput, AstraYaoM4CatalogInput, AstraYaoM4DamageResult, AstraYaoM4Rule, EffectEngine as AstraEffectEngine, Result as AstraResult } from "@randomplay/core"
declare const m4Low: AstraYaoM4DamageInput
declare const m4Catalog: AstraYaoM4CatalogInput
const m4Engine: AstraEffectEngine = astraCore
const m4LowResult: AstraResult<AstraYaoM4DamageResult> = m4Engine.calculateStaticDamage(m4Low)
const m4CatalogResult: AstraResult<AstraYaoM4DamageResult> = astraCore.calculateStaticDamageFromCatalog(m4Catalog)
const m4HighResult: AstraResult<AstraYaoM4DamageResult> = astraCore.calculateStaticActionDamage(m4Catalog)
// @ts-expect-error probability belongs only to the named conditional model
astraCore.calculateStaticDamage({ ...m4Low, hit: { ...m4Low.hit, declaredCriticalRate: .5 } })
// @ts-expect-error this mechanism only accepts the regular conditional model
astraCore.calculateStaticDamageFromCatalog({ ...m4Catalog, damage: { ...m4Catalog.damage, kind: "sheer" } })
// @ts-expect-error the multiplier is a sealed constant quantity
const badM4Operation: AstraYaoM4Rule["operation"] = { kind: "astra-yao-m4-quick-assist-damage", multiplier: { unit: "multiplier", value: 4 } }
void [m4LowResult, m4CatalogResult, m4HighResult, badM4Operation]
`

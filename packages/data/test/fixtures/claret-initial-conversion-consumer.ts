import type { StaticActionCalculationInput } from "../../../core/src/index.ts"

/** 同一公开入口验收用于源码、离线安装包与真实浏览器。 */
export async function verifyClaretInitialConversionConsumer(
  api: Pick<
    typeof import("../../src/index.ts"),
    "loadStaticCalculationData" | "resolveAgentAction"
  >,
  engine: Pick<
    typeof import("../../../core/src/index.ts"),
    "calculateStaticActionDamage" | "staticSourceBindingId"
  >,
) {
  function close(actual: number, expected: number) {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-10)
      throw new Error(`Claret initial conversion: ${actual} != ${expected}`)
  }
  const data = await api.loadStaticCalculationData({
    agents: ["Claret"],
    wEngines: [],
  })
  const holderId = "entity:claret"
  const request: StaticActionCalculationInput = {
    data,
    actorId: holderId,
    actors: [
      {
        entityId: holderId,
        teamId: "team:players",
        agentEntityId: "1611",
        coreSkillLevel: 7,
        mindscapeRank: 0,
        wEngine: null,
        driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        panel: { mode: "equipment" },
      },
    ],
    action: api.resolveAgentAction({
      agent: data.agents[0]!.actions,
      actionId: "action:agent:1611:action:0019",
      mindscapeRank: 0,
      levels: { chain: { mode: "effective", value: 12 } },
    }),
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 1000,
      resistances: { electric: 0 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [
      {
        holderId,
        optionId:
          "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtrf598z-80y7hh",
        layers: 1,
      },
    ],
  }
  function run(input: StaticActionCalculationInput) {
    const result = engine.calculateStaticActionDamage(input)
    if (!result.ok || result.value.kind !== "damage")
      throw new Error(JSON.stringify(result))
    return result.value
  }
  const automatic = run(request)
  const initial = automatic.panels[0]!.stats.criticalRate!.value
  const hit = automatic.segments[0]!.damage.evaluation.hit!.criticalRate
  close(initial, 0.513)
  close(hit, 0.813)
  const legacy: StaticActionCalculationInput = {
    ...request,
    selections: [
      ...request.selections,
      {
        holderId,
        optionId:
          "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtskqyss-1toefw",
        layers: 1,
      },
    ],
    inputs: [
      {
        bindingId: engine.staticSourceBindingId(holderId, "agent", "1611"),
        name: "agent:1611:zzz-hp:eff-mtskqyss-1toefw:blk-mtrf598z-wr4jqt:mindscape:0:source",
        value: { unit: "ratio", value: 0.5 },
      },
    ],
  }
  close(run(legacy).totals.expected, automatic.totals.expected)
  const panel = automatic.panels[0]!
  const manual: StaticActionCalculationInput = {
    ...legacy,
    actors: [
      {
        ...request.actors[0]!,
        panel: {
          mode: "out-of-combat",
          stats: panel.stats,
          penetrationValue: panel.penetrationValue,
          damageBonuses: panel.damageBonuses,
        },
      },
    ],
  }
  const returned = run(manual)
  close(returned.panels[0]!.stats.criticalRate!.value, initial)
  close(returned.segments[0]!.damage.evaluation.hit!.criticalRate, hit)
  close(returned.totals.expected, automatic.totals.expected)
  const external = run({
    ...manual,
    inputs: [{ ...legacy.inputs![0]!, value: { unit: "ratio", value: 1.7 } }],
    actors: [
      {
        ...manual.actors[0]!,
        panel: {
          mode: "out-of-combat",
          stats: {
            ...panel.stats,
            criticalRate: { unit: "ratio", value: 1.325 },
            criticalDamage: { unit: "ratio", value: 1.7 },
          },
          penetrationValue: panel.penetrationValue,
          damageBonuses: panel.damageBonuses,
        },
      },
    ],
  })
  const externalHit = external.segments[0]!.damage.evaluation.hit!.criticalRate
  close(externalHit, 1.625)
  return { initial, hit, externalHit }
}

export const claretInitialConversionConsumerSource =
  verifyClaretInitialConversionConsumer.toString()

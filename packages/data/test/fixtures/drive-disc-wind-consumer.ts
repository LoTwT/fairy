import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../../core/src/static/types.ts"

/** 同一验收用于源码、离线 Node 安装包及 Vite 开发/生产浏览器。 */
export async function verifyWindDriveDiscConsumer(
  api: Pick<
    typeof import("../../src/index.ts"),
    "loadStaticCalculationData" | "resolveAgentAction"
  >,
  engine: Pick<
    typeof import("../../../core/src/index.ts"),
    "calculateStaticActionDamage"
  >,
) {
  function require(value: unknown, message: string): asserts value {
    if (!value) throw new Error(`Wind drive disc: ${message}`)
  }
  function close(actual: number, expected: number) {
    require(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
  }
  const data = await api.loadStaticCalculationData({
    agents: ["Roxy"],
    wEngines: [],
  })
  const action = api.resolveAgentAction({
    agent: data.agents[0]!.actions,
    actionId: "action:agent:1621:action:0003",
    mindscapeRank: 0,
    levels: { assist: { mode: "effective", value: 12 } },
  })
  require(action.ok && action.calculation.kind === "damage", "quick assist")
  // Nanoka 3.2：快速支援「听凭差遣」100.8% + 11 × 9.2% = 202%。
  // 不使用 ZZZ Calculator 的维琳娜倍率作为风伤比较基线。
  close(action.sourceDamageMultiplier!, 2.02)
  require(action.calculation.segments[0]!.element === "wind", "wind action")
  const actor: StaticActorConfiguration = {
    entityId: "entity:roxy",
    teamId: "team:players",
    agentEntityId: "1621",
    mindscapeRank: 0,
    coreSkillLevel: 7,
    wEngine: null,
    driveDiscs: {
      1: {
        setEntityId: "31000",
        mainStat: { attribute: "health" },
        substats: [],
      },
      2: {
        setEntityId: "31000",
        mainStat: { attribute: "attack" },
        substats: [],
      },
      3: {
        setEntityId: "31000",
        mainStat: { attribute: "defense" },
        substats: [],
      },
      4: {
        setEntityId: "31000",
        mainStat: { attribute: "health" },
        substats: [],
      },
      5: {
        setEntityId: "31200",
        mainStat: { attribute: "damageBonus", element: "wind" },
        substats: [],
      },
      6: {
        setEntityId: "31200",
        mainStat: { attribute: "impact" },
        substats: [],
      },
    },
    panel: { mode: "equipment" },
  }
  const request: StaticActionCalculationInput = {
    data,
    actors: [actor],
    actorId: actor.entityId,
    action,
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 0,
      resistances: { wind: 0.2 },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [],
  }
  function run(config: StaticActorConfiguration) {
    const result = engine.calculateStaticActionDamage({
      ...request,
      actors: [config],
    })
    require(result.ok && result.value.kind === "damage", JSON.stringify(result))
    return result.value
  }
  const wind = run(actor)
  const health = run({
    ...actor,
    driveDiscs: {
      ...actor.driveDiscs,
      5: { ...actor.driveDiscs[5]!, mainStat: { attribute: "health" } },
    },
  })
  const windPanel = wind.panels[0]!
  const healthPanel = health.panels[0]!
  close(windPanel.stats.attack!.value, 1057.2958)
  close(windPanel.stats.criticalRate!.value, 0.274)
  close(windPanel.stats.criticalDamage!.value, 0.5)
  close(windPanel.damageBonuses.wind!, 0.3)
  for (const [element, value] of Object.entries(windPanel.damageBonuses)) {
    close(
      healthPanel.damageBonuses[
        element as keyof typeof healthPanel.damageBonuses
      ]!,
      0,
    )
    if (element !== "wind") close(value, 0)
  }
  for (const [stat, value] of Object.entries(windPanel.stats))
    if (stat !== "health")
      close(
        value.value,
        healthPanel.stats[stat as keyof typeof healthPanel.stats]!.value,
      )
  close(
    healthPanel.stats.health!.value - windPanel.stats.health!.value,
    2525.44311,
  )
  // 独立十进制算式：ATK × 2.02 × (1 + 风伤) × 0.8，暴击乘 1.5，期望乘 1.137。
  close(health.totals.nonCritical, 1708.5900128)
  close(wind.totals.nonCritical, 2221.16701664)
  close(wind.totals.critical!, 3331.75052496)
  close(wind.totals.expected, 2525.46689791968)
  const difference = wind.totals.nonCritical - health.totals.nonCritical
  close(difference, 512.57700384)
  close(wind.totals.expected - health.totals.expected, 582.80005336608)
  close(run(actor).totals.nonCritical, wind.totals.nonCritical)
  const settled = run({
    ...actor,
    panel: {
      mode: "out-of-combat",
      stats: windPanel.stats,
      penetrationValue: windPanel.penetrationValue,
      damageBonuses: windPanel.damageBonuses,
    },
  })
  close(settled.totals.expected, wind.totals.expected)
  const rejectedSlots = [1, 2, 3, 4, 6] as const
  for (const slot of rejectedSlots) {
    const result = engine.calculateStaticActionDamage({
      ...request,
      actors: [
        {
          ...actor,
          driveDiscs: {
            ...actor.driveDiscs,
            [slot]: {
              ...actor.driveDiscs[slot]!,
              mainStat: { attribute: "damageBonus", element: "wind" },
            },
          },
        },
      ],
    })
    require(!result.ok &&
      result.issues.some(
        (issue) =>
          issue.code === "INVALID_INPUT" &&
          issue.pointer ===
            `/actors/${actor.entityId}/driveDiscs/${slot}/mainStat` &&
          issue.message === "Illegal main stat for this slot",
      ), `illegal slot ${slot}: ${JSON.stringify(result)}`)
  }
  return {
    nonCritical: wind.totals.nonCritical,
    expected: wind.totals.expected,
    difference,
    rejectedSlots,
  }
}

export const windDriveDiscConsumerSource =
  verifyWindDriveDiscConsumer.toString()

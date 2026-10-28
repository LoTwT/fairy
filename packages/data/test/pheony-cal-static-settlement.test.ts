import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { STAT_UNIT_MAP } from "@randomplay/shared"
import type { RefinementRank } from "@randomplay/shared"
import {
  agentSourceIds,
  loadStaticCalculationData,
  resolveAgentAction,
  wEngineSourceIds,
} from "../src/index.ts"
import {
  calculateStaticActionDamage,
  calculateStaticDamageFromCatalog,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import type {
  StaticActionCalculationInput,
  StaticActionCalculationResult,
  StaticActorConfiguration,
  StaticCatalogDamageInput,
  StaticDamageResult,
  StaticPanelValues,
} from "../../core/src/index.ts"

/**
 * PR-B4 complete-build acceptance for Pheony (1641).
 *
 * The reference numbers are derived from the frozen Nanoka parameters and the
 * pinned ZZZ-HP skill rows, not from Fairy output:
 * - D6 direct action 0010 uses the `/skills/...-main` direct row (L14 11.947);
 * - the base CAL actions use the separate `-异放倍率` rows (L14 4.85 / 6.51);
 * - M4 fire uses Nanoka's fixed 600% normalized by the pinned original fire
 *   anomaly coefficient 0.5, i.e. 3.0, as decided by PR-B2;
 * - core 25% + M1 25% + additional ability 15% + event 40% are independent
 *   clauses; only the additional ability depends on the same-team OR.
 *
 * The build is level 60, M4, core F, Plume of Rebirth R1, four Phaethon's
 * Melody pieces and two Freedom Blues pieces. Pheony's equipment panel is also
 * supplied as an explicit out-of-combat panel so both public input paths must
 * agree. Dialyn (1481, camp 12, non-Anomaly) is the original anomaly source and
 * the same-faction teammate; putting her on another team removes only the
 * additional ability's 15%.
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))

interface BuildFixture {
  readonly entityId: `entity:${string}`
  readonly teamId: `team:${string}`
  readonly agentEntityId: string
  readonly level: number
  readonly coreSkillLevel: number
  readonly mindscapeRank: number
  readonly wEngine?: {
    readonly entityId: string
    readonly refinement: RefinementRank
    readonly eligible: boolean
  }
  readonly driveDiscs?: StaticActorConfiguration["driveDiscs"]
  readonly panel: {
    readonly stats: Readonly<Record<string, number>>
    readonly penetrationValue: number
    readonly damageBonuses: Readonly<Record<string, number>>
  }
}
interface Fixture {
  readonly provenance: {
    readonly nanokaVersion: string
    readonly zzzHpCommit: string
    readonly cal: Record<
      "basic" | "chain",
      {
        readonly path: string
        readonly pointer: string
        readonly expression: string
        readonly upstreamSkillId: string
        readonly level12BaseMult: number
      }
    >
    readonly m4: {
      readonly path: string
      readonly pointer: string
      readonly fixedPercent: number
      readonly normalization: Readonly<Record<string, number>>
      readonly originalAnomalyCoefficients: Readonly<Record<string, number>>
    }
    readonly fortyPercent: Record<"basic" | "chain", string>
  }
  readonly build: {
    readonly pheony: BuildFixture
    readonly dialyn: BuildFixture
  }
  readonly target: StaticActionCalculationInput["target"]
  readonly references: {
    readonly direct: {
      readonly actionId: string
      readonly levelGroup: "basic" | "chain"
      readonly effectiveLevel: number
      readonly multiplier: number
      readonly defenseFactor: number
      readonly nonCritical: number
      readonly critical: number
      readonly expected: number
    }
    readonly baseCal: {
      readonly actionId: string
      readonly levelGroup: "basic" | "chain"
      readonly effectiveLevel: number
      readonly multiplier: number
      readonly nonCritical: number
      readonly critical: number
      readonly expected: number
      readonly withoutTeamCritical: number
    }
    readonly m4: {
      readonly actionId: string
      readonly multiplier: number
      readonly nonCritical: number
      readonly critical: number
      readonly expected: number
      readonly withoutTeamCritical: number
    }
    readonly anomalyFactors: {
      readonly defenseTargetEffective: number
      readonly defense: number
      readonly anomalyProficiency: number
      readonly anomalyDamageLevel: number
      readonly damageBonus: number
      readonly anomalySettlementCriticalDamageWithTeam: number
      readonly anomalySettlementCriticalFactorWithTeam: number
      readonly anomalySettlementCriticalFactorWithoutTeam: number
      readonly anomalySettlementCriticalRate: number
    }
    readonly m2Preparation: {
      readonly optionId: string
      readonly durationAdjustment: number
      readonly preparedMultiplier: number
    }
  }
  readonly derivation: Readonly<Record<string, readonly string[]>>
}
const fixture = read("./fixtures/pheony-cal-static-settlement.json") as Fixture

const PHEONY = "entity:pheony"
const DIALYN = "entity:dialyn"
const TARGET = fixture.target.entityId
const BASE_CAL_ACTION = fixture.references.baseCal.actionId
const M4_ACTION = fixture.references.m4.actionId
const DIRECT_ACTION = fixture.references.direct.actionId
const ABRASION_M1 = "agents:pheony:mindscape:1:abrasion-mindscape-1-state"
const ADDITIONAL_ABILITY =
  "agents:pheony:mindscape:0:blk-mindscapeBuffs-0-1:eff-10"
const M4_FIRE_OPTION = "nanoka:agents:1641:m4-anomaly-settlement-fire"
const M4_CRIT_EFFECT =
  "agent:1641:nanoka:m4-anomaly-settlement-fire:mindscape:4-crit-damage"

const emptyDiscs = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
} as const

function general(value: number) {
  return {
    baseValue: value,
    initialPercentage: [],
    initialFixed: [],
    finalPercentage: [],
    finalFixed: [],
  }
}

function panelStats(
  values: Readonly<Record<string, number>>,
): StaticPanelValues {
  return Object.fromEntries(
    Object.entries(values).map(([stat, value]) => [
      stat,
      {
        unit: STAT_UNIT_MAP[stat as keyof typeof STAT_UNIT_MAP],
        value,
      },
    ]),
  ) as StaticPanelValues
}

function equipmentActor(build: BuildFixture): StaticActorConfiguration {
  if (!build.driveDiscs || !build.wEngine)
    throw new Error("The equipment build requires discs and a W-engine")
  return {
    entityId: build.entityId,
    teamId: build.teamId,
    agentEntityId: build.agentEntityId,
    coreSkillLevel:
      build.coreSkillLevel as StaticActorConfiguration["coreSkillLevel"],
    mindscapeRank:
      build.mindscapeRank as StaticActorConfiguration["mindscapeRank"],
    wEngine: build.wEngine,
    driveDiscs: structuredClone(build.driveDiscs),
    panel: { mode: "equipment" },
  }
}

function settledActor(
  build: BuildFixture,
  extra: Partial<StaticActorConfiguration> = {},
): StaticActorConfiguration {
  return {
    entityId: build.entityId,
    teamId: build.teamId,
    agentEntityId: build.agentEntityId,
    coreSkillLevel:
      build.coreSkillLevel as StaticActorConfiguration["coreSkillLevel"],
    mindscapeRank:
      build.mindscapeRank as StaticActorConfiguration["mindscapeRank"],
    wEngine: null,
    driveDiscs: emptyDiscs,
    panel: {
      mode: "out-of-combat",
      stats: panelStats(build.panel.stats),
      penetrationValue: build.panel.penetrationValue,
      damageBonuses: build.panel.damageBonuses,
    },
    ...extra,
  }
}

const dialyn = settledActor(fixture.build.dialyn)
const dialynOtherTeam: StaticActorConfiguration = {
  ...dialyn,
  teamId: "team:other",
}

let dataPromise: ReturnType<typeof loadStaticCalculationData> | undefined
function loadData() {
  dataPromise ??= loadStaticCalculationData({
    agents: [agentSourceIds["Phoenix"], agentSourceIds["Dialyn"]],
    wEngines: [wEngineSourceIds["Plume of Rebirth"]],
  })
  return dataPromise
}

async function pheonyActions() {
  const data = await loadData()
  return data.agents.find((agent) => agent.attributes.entityId === "1641")!
    .actions
}

function resolvedAction(
  agent: Awaited<ReturnType<typeof pheonyActions>>,
  actionId: string,
  levels: Parameters<typeof resolveAgentAction>[0]["levels"] = {},
) {
  const action = resolveAgentAction({
    agent,
    actionId,
    mindscapeRank: 4,
    levels,
  })
  expect(action.ok, JSON.stringify(action)).toBe(true)
  if (!action.ok) throw new Error("unexpected resolution")
  return action
}

interface AnomalySettlementResult {
  readonly kind: "anomaly-settlement"
  readonly element: string
  readonly anomalySource: {
    readonly entityId: string
    readonly level: number
    readonly snapshotId?: string
  }
  readonly settlementCriticalDamage: number
  readonly damage: StaticDamageResult
  readonly panels: StaticActionCalculationResult["panels"]
  readonly limitations: readonly string[]
}

function resultOf(input: StaticActionCalculationInput) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

function anomalyResultOf(input: StaticActionCalculationInput) {
  const value = resultOf(input) as unknown as AnomalySettlementResult
  expect(value.kind).toBe("anomaly-settlement")
  return value
}

function damageResultOf(input: StaticActionCalculationInput) {
  const value = resultOf(input)
  expect(value.kind).toBe("damage")
  return value as Extract<typeof value, { readonly kind: "damage" }>
}

function close(
  actual: number | null | undefined,
  expected: number,
  label: string,
) {
  expect(typeof actual, label).toBe("number")
  expect(Math.abs(actual! - expected), label).toBeLessThanOrEqual(
    Math.max(1e-9, Math.abs(expected) * 1e-12),
  )
}

function contributionTotal(result: AnomalySettlementResult, part: string) {
  return result.damage.evaluation.contributions
    .filter((entry) => entry.origin.effectId.includes(part))
    .reduce((sum, entry) => sum + entry.value.value, 0)
}
function contributions(result: AnomalySettlementResult, part: string) {
  return result.damage.evaluation.contributions.filter((entry) =>
    entry.origin.effectId.includes(part),
  )
}
function damageContributions(
  result: Extract<StaticActionCalculationResult, { readonly kind: "damage" }>,
  part: string,
) {
  return result.segments
    .flatMap((segment) => segment.damage.evaluation.contributions)
    .filter((entry) => entry.origin.effectId.includes(part))
}

function expectContextMismatch(input: StaticActionCalculationInput) {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(false)
  if (result.ok) throw new Error("expected a rejected request")
  expect(
    result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
    JSON.stringify(result.issues),
  ).toBe(true)
}

function withAction(
  input: StaticActionCalculationInput,
  action: StaticActionCalculationInput["action"],
): StaticActionCalculationInput {
  return { ...input, action }
}

function selections(
  withM4: boolean,
): StaticActionCalculationInput["selections"] {
  return [
    { holderId: PHEONY, optionId: ABRASION_M1, layers: 1 },
    { holderId: PHEONY, optionId: ADDITIONAL_ABILITY, layers: 1 },
    ...(withM4
      ? [
          {
            holderId: PHEONY,
            optionId: M4_FIRE_OPTION,
            layers: 1,
          } as const,
        ]
      : []),
  ]
}

function anomalyInput(options: {
  readonly action: StaticActionCalculationInput["action"]
  readonly actors: readonly StaticActorConfiguration[]
  readonly selections: StaticActionCalculationInput["selections"]
}): StaticActionCalculationInput {
  return {
    data: undefined as never,
    actors: options.actors,
    actorId: PHEONY,
    action: options.action,
    target: fixture.target,
    selections: options.selections,
    anomalySettlement: {
      element: "fire",
      anomalySource: { entityId: DIALYN, level: 60 },
      damage: {
        kind: "anomaly-settlement",
        damageBonus: [fixture.build.dialyn.panel.damageBonuses.fire!],
        defense: {
          targetBaseDefense: fixture.target.baseDefense,
          defensePercentageAdjustments: [],
          penetrationValues: [fixture.build.dialyn.panel.penetrationValue],
        },
        resistance: {
          targetResistance: fixture.target.resistances.fire!,
          targetResistanceReductions: [],
          attackerResistanceIgnoreValues: [],
        },
        damageTaken: {
          targetDamageTakenIncreases: [],
          targetDamageTakenReductions: [],
        },
        stunDamage: {
          isTargetStunned: fixture.target.isStunned,
          targetBaseStunDamageMultiplier:
            fixture.target.baseStunDamageMultiplier,
          targetStunDamageMultiplierAdjustments: [],
        },
        anomalyDamageBonus: [],
        refringe: { mode: "from-effects" },
        anomalyCriticalRate: 0,
        anomalyCriticalDamage: [],
      },
    },
  } as unknown as StaticActionCalculationInput
}

async function inputData(input: StaticActionCalculationInput) {
  const data = await loadData()
  return {
    ...input,
    data,
  }
}

function expectPanel(
  result:
    | AnomalySettlementResult
    | Extract<StaticActionCalculationResult, { readonly kind: "damage" }>,
  expected: Readonly<Record<string, number>>,
) {
  const panel = result.panels.find((entry) => entry.entityId === PHEONY)
  if (!panel) throw new Error("missing Pheony panel")
  for (const [stat, value] of Object.entries(expected)) {
    const actual = panel.stats[stat as keyof typeof panel.stats]?.value
    close(actual, value, `panel ${stat}`)
  }
}

describe("Pheony CAL and M4 independent events against the frozen reference", () => {
  it("uses the pinned source identities and the independently derived build", () => {
    expect(fixture.provenance.nanokaVersion).toBe("3.3.12+19634983")
    expect(fixture.provenance.zzzHpCommit).toBe(
      "991bb0ef2a00387f8a1fa18293bbda17256d7270",
    )
    expect(fixture.provenance.cal.basic.expression).toBe(
      "{CAL:225+20*(AvatarSkillLevel(0)-1),1,2}%",
    )
    expect(fixture.provenance.cal.chain.expression).toBe(
      "{CAL:300+27*(AvatarSkillLevel(3)-1),1,2}%",
    )
    expect(fixture.provenance.cal.basic.level12BaseMult).toBe(445)
    expect(fixture.provenance.cal.chain.level12BaseMult).toBe(597)
    expect(fixture.provenance.m4.fixedPercent).toBe(600)
    expect(fixture.provenance.m4.normalization.fire).toBe(3)
    expect(fixture.provenance.m4.normalization.fire).toBeCloseTo(
      fixture.provenance.m4.originalAnomalyCoefficients.fire! * 6,
      12,
    )
    expect(wEngineSourceIds["Plume of Rebirth"]).toBe("14164")
    expect(agentSourceIds["Dialyn"]).toBe("1481")
    expect(agentSourceIds["Phoenix"]).toBe("1641")
  })

  it("settles direct, base CAL and M4 as separate results through both panel paths", async () => {
    const data = await loadData()
    const actions = await pheonyActions()
    const equipment = equipmentActor(fixture.build.pheony)
    const outOfCombat = settledActor(fixture.build.pheony)
    const direct = resolvedAction(actions, DIRECT_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    const baseCal = resolvedAction(actions, BASE_CAL_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    const m4 = resolvedAction(actions, M4_ACTION)

    for (const [label, pheony] of [
      ["equipment", equipment],
      ["out-of-combat", outOfCombat],
    ] as const) {
      const actors = [pheony, dialyn]
      const directInput = await inputData({
        data,
        actors,
        actorId: PHEONY,
        action: direct,
        target: fixture.target,
        selections: selections(false),
      })
      const directResult = damageResultOf(directInput)
      expectPanel(directResult, fixture.build.pheony.panel.stats)
      close(
        directResult.totals.nonCritical,
        fixture.references.direct.nonCritical,
        `${label} direct nonCritical`,
      )
      close(
        directResult.totals.critical,
        fixture.references.direct.critical,
        `${label} direct critical`,
      )
      close(
        directResult.totals.expected,
        fixture.references.direct.expected,
        `${label} direct expected`,
      )
      expect(
        damageContributions(directResult, "eff-6:blk-mindscapeBuffs-0-1"),
      ).toHaveLength(0)

      const baseInput = await inputData(
        anomalyInput({
          action: baseCal,
          actors,
          selections: selections(false),
        }),
      )
      const baseResult = anomalyResultOf(baseInput)
      expectPanel(baseResult, fixture.build.pheony.panel.stats)
      expect(baseResult.element).toBe("fire")
      expect(baseResult.anomalySource).toMatchObject({
        entityId: DIALYN,
        level: 60,
      })
      const baseItem = baseResult.damage.evaluation.hit!.damageItems[0]!
      expect(baseItem.finalStat).toBeCloseTo(
        fixture.build.dialyn.panel.stats.attack!,
        9,
      )
      close(
        baseItem.damageMultiplier,
        fixture.references.baseCal.multiplier,
        `${label} CAL multiplier`,
      )
      expect(baseResult.settlementCriticalDamage).toBe(0.4)
      const baseAttribute = (stat: string) =>
        baseResult.damage.evaluation.attributes.find(
          (attribute) => attribute.stat === stat,
        )
      expect(baseAttribute("anomalyProficiency")).toMatchObject({
        entityId: DIALYN,
        value: {
          unit: "anomaly-proficiency-points",
          value: fixture.build.dialyn.panel.stats.anomalyProficiency,
        },
      })
      expect(baseAttribute("penetrationRatio")).toMatchObject({
        entityId: DIALYN,
        value: {
          unit: "ratio",
          value: fixture.build.dialyn.panel.stats.penetrationRatio,
        },
      })
      close(
        baseResult.damage.factors.nonCritical.anomalyProficiency,
        fixture.references.anomalyFactors.anomalyProficiency,
        `${label} CAL anomaly proficiency`,
      )
      close(
        baseResult.damage.factors.nonCritical.anomalyDamageLevel,
        fixture.references.anomalyFactors.anomalyDamageLevel,
        `${label} CAL anomaly damage level`,
      )
      close(
        baseResult.damage.factors.nonCritical.defense,
        fixture.references.anomalyFactors.defense,
        `${label} CAL defense`,
      )
      close(
        baseResult.damage.factors.nonCritical.damageBonus,
        fixture.references.anomalyFactors.damageBonus,
        `${label} CAL damage bonus`,
      )
      close(
        baseResult.damage.nonCritical,
        fixture.references.baseCal.nonCritical,
        `${label} CAL nonCritical`,
      )
      close(
        baseResult.damage.critical,
        fixture.references.baseCal.critical,
        `${label} CAL critical`,
      )
      close(
        baseResult.damage.expected,
        fixture.references.baseCal.expected,
        `${label} CAL expected`,
      )
      close(
        baseResult.damage.criticalRate,
        fixture.references.anomalyFactors.anomalySettlementCriticalRate,
        `${label} CAL critical rate`,
      )
      close(
        baseResult.damage.factors.critical!.anomalyCritical,
        fixture.references.anomalyFactors
          .anomalySettlementCriticalFactorWithTeam,
        `${label} CAL anomalyCritical`,
      )
      for (const [part, value] of [
        ["eff-6:blk-mindscapeBuffs-0-1", 0.25],
        ["eff-19:blk-mindscapeBuffs-1-1", 0.25],
        ["eff-10:blk-mindscapeBuffs-0-1", 0.15],
      ] as const) {
        expect(
          contributions(baseResult, part),
          `${label} CAL ${part}`,
        ).toHaveLength(1)
        close(contributionTotal(baseResult, part), value, `${label} ${part}`)
      }
      expect(contributions(baseResult, M4_CRIT_EFFECT)).toHaveLength(0)

      const m4Input = await inputData(
        anomalyInput({
          action: m4,
          actors,
          selections: selections(true),
        }),
      )
      const m4Result = anomalyResultOf(m4Input)
      expectPanel(m4Result, fixture.build.pheony.panel.stats)
      const m4Item = m4Result.damage.evaluation.hit!.damageItems[0]!
      expect(m4Item.finalStat).toBeCloseTo(
        fixture.build.dialyn.panel.stats.attack!,
        9,
      )
      close(
        m4Item.damageMultiplier,
        fixture.references.m4.multiplier,
        `${label} M4 multiplier`,
      )
      expect(m4Result.settlementCriticalDamage).toBe(0)
      close(
        m4Result.damage.nonCritical,
        fixture.references.m4.nonCritical,
        `${label} M4 nonCritical`,
      )
      close(
        m4Result.damage.critical,
        fixture.references.m4.critical,
        `${label} M4 critical`,
      )
      close(
        m4Result.damage.expected,
        fixture.references.m4.expected,
        `${label} M4 expected`,
      )
      close(
        m4Result.damage.factors.critical!.anomalyCritical,
        fixture.references.anomalyFactors
          .anomalySettlementCriticalFactorWithTeam,
        `${label} M4 anomalyCritical`,
      )
      for (const [part, value] of [
        ["eff-6:blk-mindscapeBuffs-0-1", 0.25],
        ["eff-19:blk-mindscapeBuffs-1-1", 0.25],
        ["eff-10:blk-mindscapeBuffs-0-1", 0.15],
        [M4_CRIT_EFFECT, 0.4],
      ] as const) {
        expect(
          contributions(m4Result, part),
          `${label} M4 ${part}`,
        ).toHaveLength(1)
        close(contributionTotal(m4Result, part), value, `${label} ${part}`)
      }

      // The base CAL and the M4 additional settlement are two independent
      // events; neither one inherits the other's multiplier or 40% rule.
      expect(baseItem.itemId).toContain(":0021:")
      expect(m4Item.itemId).toBe("pheony:m4-anomaly-settlement")
      expect(baseItem.itemId).not.toBe(m4Item.itemId)
    }
  })

  it("removes only the additional ability's 15% when the teammate is outside the team", async () => {
    const actions = await pheonyActions()
    const pheony = settledActor(fixture.build.pheony)
    const baseCal = resolvedAction(actions, BASE_CAL_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    const m4 = resolvedAction(actions, M4_ACTION)
    const actors = [pheony, dialynOtherTeam]

    const base = anomalyResultOf(
      await inputData(
        anomalyInput({
          action: baseCal,
          actors,
          selections: selections(false),
        }),
      ),
    )
    close(
      base.damage.nonCritical,
      fixture.references.baseCal.nonCritical,
      "without team CAL nonCritical",
    )
    close(
      base.damage.critical,
      fixture.references.baseCal.withoutTeamCritical,
      "without team CAL critical",
    )
    expect(contributions(base, "eff-10:blk-mindscapeBuffs-0-1")).toHaveLength(0)
    expect(contributions(base, "eff-6:blk-mindscapeBuffs-0-1")).toHaveLength(1)
    expect(contributions(base, "eff-19:blk-mindscapeBuffs-1-1")).toHaveLength(1)
    close(
      base.damage.factors.critical!.anomalyCritical,
      fixture.references.anomalyFactors
        .anomalySettlementCriticalFactorWithoutTeam,
      "without team CAL anomalyCritical",
    )

    const additional = anomalyResultOf(
      await inputData(
        anomalyInput({
          action: m4,
          actors,
          selections: selections(true),
        }),
      ),
    )
    close(
      additional.damage.nonCritical,
      fixture.references.m4.nonCritical,
      "without team M4 nonCritical",
    )
    close(
      additional.damage.critical,
      fixture.references.m4.withoutTeamCritical,
      "without team M4 critical",
    )
    expect(
      contributions(additional, "eff-10:blk-mindscapeBuffs-0-1"),
    ).toHaveLength(0)
    expect(contributions(additional, M4_CRIT_EFFECT)).toHaveLength(1)
    close(
      additional.damage.factors.critical!.anomalyCritical,
      fixture.references.anomalyFactors
        .anomalySettlementCriticalFactorWithoutTeam,
      "without team M4 anomalyCritical",
    )
  })

  it("rejects tampered resolved actions, elements, multipliers, sources and levels", async () => {
    const actions = await pheonyActions()
    const pheony = settledActor(fixture.build.pheony)
    const actors = [pheony, dialyn]
    const baseCal = resolvedAction(actions, BASE_CAL_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    const m4 = resolvedAction(actions, M4_ACTION)
    const valid = await inputData(
      anomalyInput({
        action: baseCal,
        actors,
        selections: selections(false),
      }),
    )
    const tamperedCalculation = (
      patch: Readonly<Record<string, unknown>>,
    ): StaticActionCalculationInput["action"] => {
      const calculation = baseCal.calculation as unknown as Record<
        string,
        unknown
      >
      return {
        ...baseCal,
        calculation: { ...calculation, ...patch },
      } as unknown as StaticActionCalculationInput["action"]
    }
    const items = (
      baseCal.calculation as unknown as {
        readonly damageItems: readonly Record<string, unknown>[]
      }
    ).damageItems
    expectContextMismatch(
      withAction(
        valid,
        tamperedCalculation({
          damageItems: [{ ...items[0], damageMultiplier: 4.86 }],
        }),
      ),
    )
    expectContextMismatch(
      withAction(
        valid,
        tamperedCalculation({ anomalySettlementCriticalDamage: 0.5 }),
      ),
    )
    expectContextMismatch(
      withAction(valid, tamperedCalculation({ elements: ["fire"] })),
    )
    expectContextMismatch(
      withAction(valid, {
        ...baseCal,
        resolutionContext: { ...baseCal.resolutionContext, mindscapeRank: 3 },
      } as unknown as StaticActionCalculationInput["action"]),
    )
    expectContextMismatch({
      ...valid,
      anomalySettlement: {
        ...valid.anomalySettlement!,
        element: "auric-ink",
      },
    })
    expectContextMismatch({
      ...valid,
      anomalySettlement: {
        ...valid.anomalySettlement!,
        damage: {
          ...valid.anomalySettlement!.damage,
          anomalySettlementCriticalDamage: [0.4],
        },
      },
    })
    expectContextMismatch({
      ...valid,
      anomalySettlement: undefined,
    } as unknown as StaticActionCalculationInput)
    const direct = resolvedAction(actions, DIRECT_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    expectContextMismatch({
      ...valid,
      action: direct,
    })

    const m4Valid = await inputData(
      anomalyInput({
        action: m4,
        actors,
        selections: selections(true),
      }),
    )
    expectContextMismatch(
      withAction(m4Valid, {
        ...m4,
        skillTargetIds: ["other-target"],
      } as typeof m4),
    )
    expectContextMismatch(
      withAction(
        {
          ...m4Valid,
          actors: [{ ...pheony, mindscapeRank: 3 }, dialyn],
        } as StaticActionCalculationInput,
        {
          ...m4,
          resolutionContext: { ...m4.resolutionContext, mindscapeRank: 3 },
        } as typeof m4,
      ),
    )
  })

  it("keeps the M4 action at zero damage until its B2 option supplies the multiplier", async () => {
    const actions = await pheonyActions()
    const m4 = resolvedAction(actions, M4_ACTION)
    const baseInput = await inputData(
      anomalyInput({
        action: m4,
        actors: [settledActor(fixture.build.pheony), dialyn],
        selections: selections(false),
      }),
    )
    const result = anomalyResultOf(baseInput)
    expect(result.damage.evaluation.hit!.damageItems[0]!.damageMultiplier).toBe(
      0,
    )
    expect(result.damage.nonCritical).toBe(0)
    expect(result.damage.critical).toBe(0)
    expect(contributions(result, M4_CRIT_EFFECT)).toHaveLength(0)
  })

  it("reads attack, proficiency, level and penetration from the original anomaly source", async () => {
    const actions = await pheonyActions()
    const baseCal = resolvedAction(actions, BASE_CAL_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    const input = await inputData(
      anomalyInput({
        action: baseCal,
        actors: [settledActor(fixture.build.pheony), dialyn],
        selections: selections(false),
      }),
    )
    if (!input.anomalySettlement) throw new Error("missing settlement input")
    const result = anomalyResultOf({
      ...input,
      anomalySettlement: {
        ...input.anomalySettlement,
        anomalySource: {
          ...input.anomalySettlement.anomalySource,
          level: 50,
        },
      },
    })
    const item = result.damage.evaluation.hit!.damageItems[0]!
    expect(item.finalStat).toBeCloseTo(
      fixture.build.dialyn.panel.stats.attack!,
      9,
    )
    close(
      result.damage.factors.nonCritical.anomalyProficiency,
      fixture.build.dialyn.panel.stats.anomalyProficiency! / 100,
      "source proficiency",
    )
    expect(
      result.damage.evaluation.attributes.find(
        (attribute) => attribute.stat === "anomalyProficiency",
      )?.entityId,
    ).toBe(DIALYN)
    expect(
      result.damage.evaluation.attributes.find(
        (attribute) => attribute.stat === "penetrationRatio",
      )?.entityId,
    ).toBe(DIALYN)
    // Level 50 uses the 592 defense level base and the anomaly damage level
    // truncation for 50, not the trigger's 60.
    const level50 = Math.trunc(((50 + 58) * 10000) / 59) / 10000
    close(
      result.damage.factors.nonCritical.anomalyDamageLevel,
      level50,
      "source level factor",
    )
    close(
      result.damage.factors.nonCritical.defense,
      592 / (803.936 + 592),
      "source defense factor",
    )
  })

  it("proves a direct damage segment cannot replace the anomaly-settlement branch (ablation)", async () => {
    const data = await loadData()
    const bindingId = staticSourceBindingId(PHEONY, "agent", "1641")
    const request: StaticCatalogDamageInput = {
      definitions: data.definitions,
      catalog: data.catalog,
      actorSources: [
        { entityId: PHEONY, agentEntityId: "1641", level: 60 },
        { entityId: DIALYN, agentEntityId: "1481", level: 60 },
      ],
      bindings: [
        {
          kind: "agent",
          bindingId,
          holderId: PHEONY,
          sourceEntityId: "1641",
          eligible: true,
          configuration: { coreSkillLevel: 7, mindscapeRank: 4 },
        },
      ],
      selections: [
        { optionId: ABRASION_M1, bindingId, layers: 1 },
        { optionId: ADDITIONAL_ABILITY, bindingId, layers: 1 },
      ],
      world: {
        entities: [
          {
            kind: "actor",
            entityId: PHEONY,
            teamId: "team:players",
            generalStats: {
              attack: general(fixture.build.pheony.panel.stats.attack!),
              anomalyProficiency: general(
                fixture.build.pheony.panel.stats.anomalyProficiency!,
              ),
              anomalyMastery: general(
                fixture.build.pheony.panel.stats.anomalyMastery!,
              ),
            },
            directStats: {
              criticalRate: { baseValue: 0.482, additions: [] },
              criticalDamage: { baseValue: 1.028, additions: [] },
              penetrationRatio: { baseValue: 0, additions: [] },
            },
          },
          {
            kind: "actor",
            entityId: DIALYN,
            teamId: "team:players",
            generalStats: {
              attack: general(fixture.build.dialyn.panel.stats.attack!),
              anomalyProficiency: general(
                fixture.build.dialyn.panel.stats.anomalyProficiency!,
              ),
            },
            directStats: {
              criticalRate: { baseValue: 0.05, additions: [] },
              criticalDamage: { baseValue: 0.5, additions: [] },
              penetrationRatio: { baseValue: 0.1, additions: [] },
            },
          },
          {
            kind: "actor",
            entityId: TARGET,
            teamId: "team:enemies",
            generalStats: {},
            directStats: {},
          },
        ],
        states: [],
        distances: [],
      },
      hit: {
        actorId: PHEONY,
        targetId: TARGET,
        actionId: "action:ablation:direct-cal",
        skillCategory: "uncategorized",
        element: "fire",
        skillTags: [],
        damageItems: [
          {
            mode: "direct",
            role: "base",
            itemId: "pheony:cal-ablation",
            stat: "attack",
            statSource: { entityId: DIALYN },
            damageMultiplier: fixture.references.baseCal.multiplier,
          },
        ],
      },
      damage: {
        kind: "regular",
        damageBonus: [0.1],
        defense: {
          attackerLevel: 60,
          targetBaseDefense: fixture.target.baseDefense,
          defensePercentageAdjustments: [],
          penetrationValues: [],
        },
        resistance: {
          targetResistance: 0,
          targetResistanceReductions: [],
          attackerResistanceIgnoreValues: [],
        },
        damageTaken: {
          targetDamageTakenIncreases: [],
          targetDamageTakenReductions: [],
        },
        stunDamage: {
          isTargetStunned: false,
          targetBaseStunDamageMultiplier: 1,
          targetStunDamageMultiplierAdjustments: [],
        },
      },
    }
    const result = calculateStaticDamageFromCatalog(request)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const value = result.value
    expect(value.criticalSemantics).toBe("critical-hit")
    expect(value.factors.nonCritical.anomalyProficiency).toBeUndefined()
    expect(value.factors.nonCritical.anomalyDamageLevel).toBeUndefined()
    expect(
      value.evaluation.contributions.filter((entry) =>
        ["eff-6", "eff-19", "eff-10"].some((part) =>
          entry.origin.effectId.includes(part),
        ),
      ),
    ).toHaveLength(0)
    close(
      value.factors.nonCritical.defense,
      794 / (fixture.target.baseDefense + 794),
      "direct ablation defense uses the trigger panel",
    )
    close(
      value.factors.critical!.critical,
      1 + fixture.build.pheony.panel.stats.criticalDamage!,
      "direct ablation uses regular critical damage, not the event 40%",
    )
  })

  it("keeps M2 at a preparation-only +2s and out of the CAL totals", async () => {
    const data = await loadData()
    const actions = await pheonyActions()
    const baseCal = resolvedAction(actions, BASE_CAL_ACTION, {
      basic: { mode: "effective", value: 14 },
    })
    const base = anomalyResultOf(
      await inputData(
        anomalyInput({
          action: baseCal,
          actors: [settledActor(fixture.build.pheony), dialyn],
          selections: selections(false),
        }),
      ),
    )
    expect(base.damage.preparations ?? []).toHaveLength(0)

    const bindingId = staticSourceBindingId(PHEONY, "agent", "1641")
    const damage = {
      kind: "disorder",
      damageBonus: [],
      anomalyDamageBonus: [],
      anomalyCriticalRate: 0,
      anomalyCriticalDamage: [],
      refringe: { mode: "from-effects" },
      anomalySource: { entityId: PHEONY, level: 60 },
      defense: {
        targetBaseDefense: fixture.target.baseDefense,
        defensePercentageAdjustments: [],
        penetrationValues: [fixture.build.pheony.panel.penetrationValue],
      },
      resistance: {
        targetResistance: fixture.target.resistances.fire!,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
    } as unknown as StaticCatalogDamageInput["damage"]
    const request = {
      definitions: data.definitions,
      catalog: data.catalog,
      actorSources: [{ entityId: PHEONY, agentEntityId: "1641", level: 60 }],
      bindings: [
        {
          kind: "agent" as const,
          bindingId,
          holderId: PHEONY,
          sourceEntityId: "1641",
          eligible: true,
          configuration: {
            coreSkillLevel: fixture.build.pheony.coreSkillLevel,
            mindscapeRank: fixture.build.pheony.mindscapeRank,
            specialSkillLevel: 14,
          },
        },
      ],
      selections: [
        {
          optionId: fixture.references.m2Preparation.optionId,
          bindingId,
          layers: 1,
        },
      ],
      world: {
        entities: [
          {
            kind: "actor" as const,
            entityId: PHEONY,
            teamId: "team:players",
            generalStats: {
              attack: {
                baseValue: fixture.build.pheony.panel.stats.attack!,
                initialPercentage: [],
                initialFixed: [],
                finalPercentage: [],
                finalFixed: [],
              },
              anomalyProficiency: {
                baseValue: fixture.build.pheony.panel.stats.anomalyProficiency!,
                initialPercentage: [],
                initialFixed: [],
                finalPercentage: [],
                finalFixed: [],
              },
              anomalyMastery: {
                baseValue: fixture.build.pheony.panel.stats.anomalyMastery!,
                initialPercentage: [],
                initialFixed: [],
                finalPercentage: [],
                finalFixed: [],
              },
            },
            directStats: {
              criticalRate: { baseValue: 0.482, additions: [] },
              criticalDamage: { baseValue: 1.028, additions: [] },
              penetrationRatio: { baseValue: 0, additions: [] },
            },
          },
          {
            kind: "actor" as const,
            entityId: TARGET,
            teamId: "team:enemies",
            generalStats: {},
            directStats: {},
          },
        ],
        states: [],
        distances: [],
      },
      hit: {
        actorId: PHEONY,
        targetId: TARGET,
        actionId: "action:test:m2-preparation",
        skillCategory: "uncategorized",
        element: "fire",
        skillTags: [],
        damageItems: [
          {
            mode: "standard-disorder",
            role: "base",
            itemId: "pheony:m2-burn-duration",
            stat: "attack",
            statSource: { entityId: PHEONY },
            originalAnomalyAttribute: "fire",
            baseDurationSeconds: 10,
            elapsedSeconds: 3,
          },
        ],
      },
      damage,
    } as unknown as StaticCatalogDamageInput
    const result = calculateStaticDamageFromCatalog(request)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(
      result.value.preparations?.map((entry) => entry.durationAdjustment),
    ).toEqual([fixture.references.m2Preparation.durationAdjustment])
    close(
      result.value.evaluation.hit!.damageItems[0]!.damageMultiplier,
      fixture.references.m2Preparation.preparedMultiplier,
      "M2 prepared multiplier",
    )
  })
})

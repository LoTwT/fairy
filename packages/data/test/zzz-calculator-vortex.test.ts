import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { calculationDataVersion } from "../src/index.ts"
import {
  calculateDefenseLevelBase,
  calculateStandardDisorderDamageMultiplier,
  calculateStandardVortexDamageMultiplier,
  calculateStaticDamageFromCatalog,
} from "../../core/src/index.ts"
import type {
  Result,
  StaticCatalogDamageInput,
  StaticCatalogDamageItem,
  StaticDamageResult,
  VortexDamageMultiplierProfile,
} from "../../core/src/index.ts"
import {
  actors,
  buffs,
  elements,
  fairyBase,
  fairyInputFor,
  fractionalScenarios,
  inputLayer,
  levelScenario,
  profileFor,
  profiles,
  scenario,
  scenarios,
  serializableFairyInput,
  snapshotScenario,
  sourceReadings,
  target,
  upstreamCommit,
  windReadings,
} from "./fixtures/zzz-calculator-vortex-cases.ts"
import type { VortexScenario } from "./fixtures/zzz-calculator-vortex-cases.ts"

interface NativeEventInput {
  id: string
  kind: string
  settlementType: string
  anomalyEffect?: string
  count: number
  stunned: boolean
  critMode: string
  elapsedSeconds?: number
  procCount?: number
  baseDurationSeconds?: number
  windSource?: unknown
  anomalySource?: unknown
}
interface NativeManualEffect {
  id: string
  effects: {
    id: string
    type: string
    stat: string
    value: number
    mode: string
    target: { kind: string; settlementType?: string }
  }[]
}
interface NativeRequest {
  agentId: string
  agentLevel: number
  coreSkillLevel: string
  cinemaLevel: number
  potentialLevel: number
  wEngineId: string
  wEngineModificationLevel: number
  driveDiscs: unknown[]
  combatBuffs: {
    activeBuffIds: string[]
    manualStats: { id: string; stat: string; value: number; mode: string }[]
    manualEffects: NativeManualEffect[]
  }
  damage: {
    agentLevel: number
    selectedEventId: string
    events: NativeEventInput[]
    target: {
      defense: number
      levelCoefficient: number
      resistanceByElement: Record<string, number>
      stunMultiplierPercent: number
    }
  }
}
interface NativeEventResult {
  id: string
  settlementType: string
  finalDamage: number
  input: NativeEventInput & {
    damageElement: string
    baseMultiplier: number
    fixedMultiplier: number
    tickMultiplier: number
    tickIntervalSeconds: number
    durationBonusSeconds: number
    durationSeconds: number
    tickCount: number
    remainingSeconds: number
    agentLevel: number
  }
  panelSnapshot: { atk: number; anomalyProficiency: number }
  multipliers: Record<string, number>
  targetBreakdown: {
    damageElement: string
    panelPenRatio: number
    penFlat: number
    levelCoefficient: number
    effectiveDefense: number
    targetResistance: number
  }
}
interface NativeResult {
  inCombat: {
    panel: Record<string, number>
    ignoredEffects: unknown[]
    activeEffects: {
      key: string
      resolvedDamageModifiers: {
        id: string
        value: number
        stat: string
        sourceKey: string
        target: { settlementType: string }
      }[]
    }[]
  }
  damage: { totalFinalDamage: number; events: NativeEventResult[] }
}
interface FairyCall {
  request: ReturnType<typeof serializableFairyInput>
  result: Result<StaticDamageResult>
}
interface ReferenceCase {
  id: string
  scenario: VortexScenario
  upstream: { request: NativeRequest; result: NativeResult }
  fairy: FairyCall
  instant?: FairyCall
}
interface Reference {
  schemaVersion: number
  provenance: {
    repository: string
    commit: string
    fairyBase: string
    entrypoint: string
    upstreamSources: Record<string, string>
    fairySources: Record<string, string>
    fairyCalculationDataVersion: typeof calculationDataVersion
  }
  inputLayer: string
  identities: {
    actors: typeof actors
    profiles: typeof profiles
    buffs: typeof buffs
  }
  nativeIdentityMapping: Record<string, { id: string; name: string }>
  externalReadings: {
    sourceReadings: typeof sourceReadings
    windReadings: typeof windReadings
    target: typeof target
  }
  nativeTables: {
    turbulence: {
      id: string
      element: string
      fixedMultiplier: number
      tickMultiplier: number
      tickIntervalSeconds: number
      defaultDurationSeconds: number
      sourceStatus: string
    }[]
    instant: { id: string; baseMultiplier: number; defaultProcCount: number }[]
    buffs: {
      id: string
      ownerId: string
      effects: NativeManualEffect["effects"]
    }[]
  }
  baselines: { profile: string; request: NativeRequest; result: NativeResult }[]
  cases: ReferenceCase[]
  differences: ReferenceCase[]
  contracts: { snapshot: FairyCall & { scenario: VortexScenario } }
  diagnostics: {
    id: string
    request: NativeRequest
    result?: NativeResult
    error?: { name: string; message: string }
  }[]
  coverageGaps: string[]
  statistics: Record<string, number>
}
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/zzz-calculator-vortex-reference.json", import.meta.url),
    "utf8",
  ),
) as Reference

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
function required<T>(item: T | undefined): T {
  if (item === undefined) throw new Error("Missing frozen observation")
  return item
}
function near(actual: number, expected: number): void {
  expect(Number.isFinite(actual)).toBe(true)
  expect(Number.isFinite(expected)).toBe(true)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    1e-8 * Math.max(1, Math.abs(expected)),
  )
}
const common = (id: string) =>
  required(reference.cases.find((entry) => entry.id === id))
const difference = (id: string) =>
  required(reference.differences.find((entry) => entry.id === id))
const attribute = (result: StaticDamageResult, stat: string) =>
  required(
    result.evaluation.attributes.find(
      (entry) =>
        entry.entityId === actors.strength.entityId && entry.stat === stat,
    ),
  ).value.value
const item = (result: StaticDamageResult) =>
  required(result.evaluation.hit?.damageItems[0])

// This reconstructs only native request syntax and percentage units, never a
// damage formula. Baseline subtraction expresses external readings upstream;
// no native final damage, multiplier or panel is fed into fairyInputFor.
function expectedNativeRequest(sample: VortexScenario): NativeRequest {
  const row = profileFor(sample.profile)
  const baseline = required(
    reference.baselines.find((entry) => entry.profile === sample.profile),
  )
  const panel = baseline.result.inCombat.panel
  const source = sample.source
  const request: NativeRequest = {
    agentId: row.upstreamAgentId,
    agentLevel: 60,
    coreSkillLevel: "F",
    cinemaLevel: 0,
    potentialLevel: 0,
    wEngineId: "demara_battery_mark_ii",
    wEngineModificationLevel: 1,
    driveDiscs: [],
    combatBuffs: {
      activeBuffIds: sample.buffs.map((key) => buffs[key].upstreamId),
      manualStats: [
        ["atkFlat", source.attack - panel["atk"]!],
        [
          "anomalyProficiency",
          source.anomalyProficiency - panel["anomalyProficiency"]!,
        ],
        ["penRatio", (source.penetrationRatio - panel["penRatio"]!) * 100],
        ["penFlat", source.penetrationValue - panel["penFlat"]!],
        ["dmgBonus", (source.damageBonus - panel["dmgBonus"]!) * 100],
        ...elements.map(
          (element) =>
            [
              `${element}Dmg`,
              (source.elementalDamageBonus[element] - panel[`${element}Dmg`]!) *
                100,
            ] as const,
        ),
      ].map(([stat, amount]) => ({
        id: `external-${stat}`,
        stat: stat as string,
        value: amount as number,
        mode: "flat",
      })),
      manualEffects: [],
    },
    damage: {
      agentLevel: source.level,
      selectedEventId: `${sample.id}:vortex`,
      events: [
        {
          id: `${sample.id}:vortex`,
          kind: "anomaly",
          settlementType: "turbulence",
          anomalyEffect: row.upstreamEffect,
          elapsedSeconds: 0,
          count: 1,
          stunned: sample.stunned,
          critMode: "nonCrit",
        },
      ],
      target: {
        defense: target.defense,
        levelCoefficient: 794,
        resistanceByElement: Object.fromEntries(
          elements.map((element) => [
            element,
            target.resistance[element] * 100,
          ]),
        ),
        stunMultiplierPercent: target.stunMultiplier * 100,
      },
    },
  }
  const add = (id: string, stat: string, amount: number, targeted = true) => {
    request.combatBuffs.manualEffects.push({
      id,
      effects: [
        {
          id: `${id}-effect`,
          type: "fixed",
          stat,
          value: amount,
          mode: "flat",
          target: targeted
            ? { kind: "anomaly", settlementType: "turbulence" }
            : { kind: "default" },
        },
      ],
    })
  }
  if (sample.durationBonusSeconds)
    add(
      "duration-extension",
      "anomalyDurationBonusSeconds",
      sample.durationBonusSeconds,
    )
  if (sample.genericAnomalyBonus)
    add(
      "generic-anomaly",
      "anomalyDamageBonus",
      sample.genericAnomalyBonus * 100,
    )
  if (sample.manualVortexBonus)
    add(
      "specific-turbulence",
      "turbulenceDamageBonus",
      sample.manualVortexBonus * 100,
    )
  if (sample.extraElementalBonus)
    add(
      "elemental-bonus",
      `${sample.extraElementalBonus.element}Dmg`,
      sample.extraElementalBonus.value * 100,
      false,
    )
  if (sample.includeInstant)
    request.damage.events.push({
      id: `${sample.id}:instant`,
      kind: "anomaly",
      settlementType: "attribute",
      anomalyEffect: row.upstreamEffect,
      procCount: 1,
      count: 1,
      stunned: sample.stunned,
      critMode: "nonCrit",
    })
  return request
}
function assertAssociation(
  record: ReferenceCase,
  sample: VortexScenario,
  input: StaticCatalogDamageInput,
): void {
  expect(record.id).toBe(sample.id)
  expect(record.scenario).toEqual(sample)
  expect(record.upstream.request).toEqual(expectedNativeRequest(sample))
  expect(record.fairy.request).toEqual(serializableFairyInput(input))
  expect(record.upstream.result.damage.events.map((event) => event.id)).toEqual(
    record.upstream.request.damage.events.map((event) => event.id),
  )
}

const metricNames = [
  "attack",
  "proficiency",
  "penetrationRatio",
  "penetrationValue",
  "level",
  "multiplier",
  "baseDamage",
  "damageBonus",
  "proficiencyFactor",
  "defense",
  "resistance",
  "stun",
  "levelFactor",
  "anomalyBonus",
  "criticalFactor",
  "damage",
] as const
type Metrics = Record<(typeof metricNames)[number], number>
function fairyMetrics(
  result: StaticDamageResult,
  sample: VortexScenario,
): Metrics {
  const factors = result.factors.nonCritical
  return {
    attack: item(result).finalStat,
    proficiency: attribute(result, "anomalyProficiency"),
    penetrationRatio: attribute(result, "penetrationRatio"),
    penetrationValue: sample.source.penetrationValue,
    level: sample.source.level,
    multiplier: item(result).damageMultiplier,
    baseDamage: factors["baseDamage"]!,
    damageBonus: factors["damageBonus"]!,
    proficiencyFactor: factors["anomalyProficiency"]!,
    defense: factors["defense"]!,
    resistance: factors["resistance"]!,
    stun: factors["stunDamage"]!,
    levelFactor: factors["anomalyDamageLevel"]!,
    anomalyBonus: factors["anomalyDamageBonus"]!,
    criticalFactor: factors["anomalyCritical"]!,
    damage: result.nonCritical,
  }
}
function nativeMetrics(event: NativeEventResult): Metrics {
  const factors = event.multipliers
  return {
    attack: event.panelSnapshot.atk,
    proficiency: event.panelSnapshot.anomalyProficiency,
    penetrationRatio: event.targetBreakdown.panelPenRatio,
    penetrationValue: event.targetBreakdown.penFlat,
    level: event.input.agentLevel,
    multiplier: factors["anomaly"]!,
    baseDamage: factors["atk"]! * factors["anomaly"]!,
    damageBonus: factors["dmg"]!,
    proficiencyFactor: factors["anomalyProficiency"]!,
    defense: factors["defense"]!,
    resistance: factors["resistance"]!,
    stun: factors["stun"]!,
    levelFactor: factors["anomalyLevel"]!,
    anomalyBonus: factors["anomalyDamage"]!,
    criticalFactor: factors["anomalyCrit"]!,
    damage: event.finalDamage,
  }
}
function compareReadouts(
  fairy: Metrics,
  upstream: Metrics,
  excluded: readonly string[] = [],
): void {
  expect(Object.keys(fairy).toSorted()).toEqual(metricNames.toSorted())
  expect(Object.keys(upstream).toSorted()).toEqual(metricNames.toSorted())
  for (const key of metricNames) {
    expect(Number.isFinite(fairy[key]), key).toBe(true)
    expect(Number.isFinite(upstream[key]), key).toBe(true)
    if (!excluded.includes(key)) near(fairy[key], upstream[key])
    else
      expect(Math.abs(fairy[key] - upstream[key]), key).toBeGreaterThan(
        1e-8 * Math.max(1, Math.abs(upstream[key])),
      )
  }
}

describe("ZZZ Calculator vortex: declared source state, not equipment equivalence", () => {
  it("pins versions, prepared data, source digests, identities and nonempty inventories", () => {
    expect(reference.schemaVersion).toBe(1)
    expect(reference.provenance.repository).toBe(
      "https://github.com/ZztIsolation/zzz_calculator",
    )
    expect(reference.provenance.commit).toBe(upstreamCommit)
    expect(reference.provenance.fairyBase).toBe(fairyBase)
    expect(reference.provenance.entrypoint).toBe(
      "loadCalculatorContext -> calculateInCombatPanel",
    )
    expect(reference.provenance.fairyCalculationDataVersion).toEqual(
      calculationDataVersion,
    )
    expect(reference.inputLayer).toBe(inputLayer)
    expect(reference.identities).toEqual({ actors, profiles, buffs })
    for (const row of [...profiles, actors.wind, actors.qualifier])
      expect(reference.nativeIdentityMapping[row.agentEntityId]?.id).toBe(
        row.upstreamAgentId,
      )
    expect(reference.externalReadings).toEqual({
      sourceReadings,
      windReadings,
      target,
    })
    expect(reference.cases.map((entry) => entry.id)).toEqual(
      scenarios.map((sample) => sample.id),
    )
    expect(new Set(reference.cases.map((entry) => entry.id)).size).toBe(33)
    expect(reference.cases.filter((entry) => entry.instant)).toHaveLength(4)
    expect(reference.differences.map((entry) => entry.id)).toEqual([
      ...fractionalScenarios.map((sample) => sample.id),
      levelScenario.id,
      "burn-elapsed-0.6",
    ])
    expect(reference.diagnostics).toHaveLength(8)
    expect(reference.coverageGaps).toHaveLength(6)
    expect(reference.statistics).toEqual({
      commonVortexScenarios: 33,
      commonImmediateEvents: 4,
      commonEqualReadouts: 37 * metricNames.length,
      knownDifferenceScenarios: 8,
      knownDifferenceReadouts: 23,
      equalReadoutsWithinDifferenceScenarios: 8 * metricNames.length - 23,
      fairyOnlyContractTests: 24,
      upstreamDiagnosticCalls: 8,
      requestMismatchTests: 12,
      unitTests: 91,
    })
    expect(Object.keys(reference.provenance.upstreamSources)).toHaveLength(30)
    for (const path of [
      "tests/turbulence-damage.test.js",
      "backend/calculator.js",
      "core/calculator-core.js",
      "core/damageEventMultipliers.js",
      "core/anomalySettlement.js",
      "data/anomaly_effects.json",
      "data/combat_buffs.json",
    ])
      expect(reference.provenance.upstreamSources[path]).toMatch(
        /^[0-9a-f]{64}$/u,
      )
    expect(Object.keys(reference.provenance.fairySources)).toHaveLength(10)
    // Source bytes were audited at extraction time. Daily tests consume the
    // prepared version above; provenance does not lock future source code to
    // the old revision when the same public contract still holds.
    for (const digest of [
      ...Object.values(reference.provenance.fairySources),
      ...Object.values(reference.provenance.upstreamSources),
    ])
      expect(digest).toMatch(/^[0-9a-f]{64}$/u)
    expect(reference.baselines.map((entry) => entry.profile)).toEqual(
      profiles.map((row) => row.profile),
    )
    for (const baseline of reference.baselines) {
      const expected = expectedNativeRequest(
        scenario(
          `baseline-${baseline.profile}`,
          profileFor(baseline.profile as VortexDamageMultiplierProfile).profile,
        ),
      )
      expected.combatBuffs.manualStats = []
      expected.damage.events[0]!.id = `baseline-${baseline.profile}`
      expected.damage.selectedEventId = `baseline-${baseline.profile}`
      expect(baseline.request).toEqual(expected)
    }
  })

  it.each(profiles)(
    "checks the native $profile table and both full-duration facts",
    (row) => {
      const native = required(
        reference.nativeTables.turbulence.find(
          (entry) => entry.id === row.upstreamEffect,
        ),
      )
      expect(native).toMatchObject({
        element: row.element,
        fixedMultiplier: row.fixed,
        tickMultiplier: row.tick,
        tickIntervalSeconds: row.interval,
        defaultDurationSeconds: row.duration,
        sourceStatus: "confirmed",
      })
      for (const [extension, ticks, multiplier] of [
        [0, row.ticks, row.multiplier],
        [3, row.extendedTicks, row.extendedMultiplier],
      ]) {
        const event = common(
          `${row.profile}-${extension === 0 ? "standard" : "extended"}-off`,
        ).upstream.result.damage.events[0]!
        expect(event.input).toMatchObject({
          baseDurationSeconds: row.duration,
          durationBonusSeconds: extension,
          durationSeconds: row.duration + extension!,
          elapsedSeconds: 0,
          remainingSeconds: row.duration + extension!,
          tickCount: ticks,
          baseMultiplier: multiplier,
        })
        near(
          calculateStandardVortexDamageMultiplier({
            vortexDamageMultiplierProfile: row.profile,
            sourceAnomalyDurationInSeconds: row.duration + extension!,
          }),
          multiplier!,
        )
      }
    },
  )

  it.each(scenarios)(
    "compares native requests, sources, contributions and 16 readouts: $id",
    async (sample) => {
      const record = common(sample.id)
      const input = await fairyInputFor(sample)
      assertAssociation(record, sample, input)
      const result = value(calculateStaticDamageFromCatalog(input))
      expect(result).toEqual(value(record.fairy.result))
      const event = required(record.upstream.result.damage.events[0])
      const row = profileFor(sample.profile)
      expect(event.input.damageElement).toBe(row.element)
      expect(event.targetBreakdown.targetResistance).toBe(
        target.resistance[row.element],
      )
      expect(event.targetBreakdown.damageElement).toBe(row.element)
      compareReadouts(fairyMetrics(result, sample), nativeMetrics(event))
      expect(result.expected).toBe(result.nonCritical)
      expect(result.criticalRate).toBe(0)
      expect(event.multipliers["anomalyCritRate"]).toBe(0)
      expect(result.factors.nonCritical["damageTaken"]).toBe(1)
      expect(result.factors.nonCritical["refringe"]).toBe(1)
      expect(record.upstream.result.inCombat.ignoredEffects).toEqual([])
      const contributions = result.evaluation.contributions
      expect(contributions).toHaveLength(sample.buffs.length)
      for (const key of sample.buffs) {
        const buff = buffs[key]
        expect(contributions).toContainEqual(
          expect.objectContaining({
            address: expect.objectContaining({
              channel: buff.channel,
              entityId: actors.wind.entityId,
            }),
            value: expect.objectContaining({ value: buff.value }),
            origin: expect.objectContaining({
              effectId: buff.effectId,
              beneficiaryId: actors.wind.entityId,
              bindingId: "binding:wind",
            }),
          }),
        )
        const native = required(
          record.upstream.result.inCombat.activeEffects.find(
            (entry) => entry.key === buff.upstreamId,
          ),
        )
        expect(native.resolvedDamageModifiers).toHaveLength(1)
        expect(native.resolvedDamageModifiers[0]).toMatchObject({
          value: buff.value,
          sourceKey: buff.upstreamId,
          target: { settlementType: "turbulence" },
        })
        const source = required(
          reference.nativeTables.buffs.find(
            (entry) => entry.id === buff.upstreamId,
          ),
        )
        expect(source.ownerId).toBe("velina")
        expect(source.effects).toHaveLength(1)
        expect(source.effects[0]!.value).toBe(buff.value * 100)
      }
    },
  )

  it.each(scenarios.filter((sample) => sample.includeInstant))(
    "keeps immediate assault/shatter separate from vortex: $id",
    async (sample) => {
      const record = common(sample.id)
      const frozen = required(record.instant)
      const input = await fairyInputFor(sample, "instant")
      expect(serializableFairyInput(input)).toEqual(frozen.request)
      const result = value(calculateStaticDamageFromCatalog(input))
      expect(result).toEqual(value(frozen.result))
      const event = required(record.upstream.result.damage.events[1])
      expect(event.settlementType).toBe("attribute")
      expect(event.id).toBe(`${sample.id}:instant`)
      const row = profileFor(sample.profile)
      expect(reference.nativeTables.instant).toContainEqual(
        expect.objectContaining({
          id: row.upstreamEffect,
          baseMultiplier: row.instant,
          defaultProcCount: 1,
        }),
      )
      expect(item(result).damageMultiplier).toBe(row.instant)
      expect(result.evaluation.contributions).toEqual([])
      compareReadouts(fairyMetrics(result, sample), nativeMetrics(event))
      const vortex = required(record.upstream.result.damage.events[0])
      near(
        record.upstream.result.damage.totalFinalDamage,
        vortex.finalDamage + event.finalDamage,
      )
      expect(vortex.finalDamage).not.toBe(
        record.upstream.result.damage.totalFinalDamage,
      )
      near(
        result.nonCritical,
        value(common(`${sample.profile}-standard-off`).instant!.result)
          .nonCritical,
      )
    },
  )

  it("locates each buff in its own zone and keeps ordinary/vortex bonuses additive", () => {
    const off = value(common("burn-standard-off").fairy.result)
    const core = value(common("burn-only-core").fairy.result)
    near(item(core).damageMultiplier, 20.5)
    near(core.expected / off.expected, 20.5 / 19)
    for (const [id, ratio] of [
      ["additional", 1.1],
      ["mindscape1", 1 / 0.8],
      ["mindscape2", 1.15],
    ] as const)
      near(
        value(common(`burn-only-${id}`).fairy.result).expected / off.expected,
        ratio,
      )
    expect(
      value(common("burn-both-bonuses").fairy.result).factors.nonCritical[
        "anomalyDamageBonus"
      ],
    ).toBe(1.3)
    near(
      value(common("burn-both-bonuses").fairy.result).expected / off.expected,
      1.3,
    )
    expect(value(common("burn-wind-bonus").fairy.result).expected).toBe(
      off.expected,
    )
    near(
      value(common("burn-fire-bonus").fairy.result).expected / off.expected,
      1.55 / 1.3,
    )
  })
})

describe("preserved native differences; never counted as common passes", () => {
  it.each(fractionalScenarios)(
    "retains fractional full duration versus upstream whole ticks: $id",
    async (sample) => {
      const record = difference(sample.id)
      const input = await fairyInputFor(sample)
      assertAssociation(record, sample, input)
      const result = value(calculateStaticDamageFromCatalog(input))
      expect(result).toEqual(value(record.fairy.result))
      const row = profileFor(sample.profile)
      const event = required(record.upstream.result.damage.events[0])
      expect(event.input.durationSeconds).toBe(row.duration + 0.25)
      expect(event.input.tickCount).toBe(row.ticks)
      expect(event.input.baseMultiplier).toBe(row.multiplier)
      near(item(result).damageMultiplier, row.fractional)
      near(
        calculateStandardVortexDamageMultiplier({
          vortexDamageMultiplierProfile: row.profile,
          sourceAnomalyDurationInSeconds: row.duration + 0.25,
        }),
        row.fractional,
      )
      compareReadouts(fairyMetrics(result, sample), nativeMetrics(event), [
        "multiplier",
        "baseDamage",
        "damage",
      ])
      near(result.expected / event.finalDamage, row.fractional / row.multiplier)
    },
  )

  it("keeps the upstream fixed defense coefficient at source level 50", async () => {
    const record = difference(levelScenario.id)
    const input = await fairyInputFor(levelScenario)
    assertAssociation(record, levelScenario, input)
    const result = value(calculateStaticDamageFromCatalog(input))
    expect(result).toEqual(value(record.fairy.result))
    const event = required(record.upstream.result.damage.events[0])
    expect(event.targetBreakdown.levelCoefficient).toBe(794)
    expect(calculateDefenseLevelBase(50)).toBe(592)
    const defense = 1200 * (1 - 0.12) - 73
    expect(event.targetBreakdown.effectiveDefense).toBe(defense)
    near(result.factors.nonCritical["defense"]!, 592 / (592 + defense))
    compareReadouts(fairyMetrics(result, levelScenario), nativeMetrics(event), [
      "defense",
      "damage",
    ])
    near(
      result.expected / event.finalDamage,
      592 / (592 + defense) / (794 / (794 + defense)),
    )
  })

  it("does not substitute disorder remaining time for the full vortex duration", async () => {
    const sample = common("burn-standard-off").scenario
    const record = difference("burn-elapsed-0.6")
    const expectedRequest = expectedNativeRequest(sample)
    expectedRequest.damage.events[0]!.elapsedSeconds = 0.6
    expect(record.upstream.request).toEqual(expectedRequest)
    const input = await fairyInputFor(sample)
    expect(record.fairy.request).toEqual(serializableFairyInput(input))
    const result = value(calculateStaticDamageFromCatalog(input))
    const event = required(record.upstream.result.damage.events[0])
    expect(event.input).toMatchObject({
      elapsedSeconds: 0.5,
      remainingSeconds: 9.5,
      tickCount: 19,
      baseMultiplier: 18.5,
      durationSeconds: 10,
    })
    expect(item(result).damageMultiplier).toBe(19)
    expect(
      calculateStandardDisorderDamageMultiplier({
        originalAnomalyAttribute: "fire",
        remainingAnomalyDurationInSeconds: 9.5,
      }),
    ).toBe(14)
    compareReadouts(fairyMetrics(result, sample), nativeMetrics(event), [
      "multiplier",
      "baseDamage",
      "damage",
    ])
    near(result.expected / event.finalDamage, 19 / 18.5)
  })
})

describe("Fairy-only historical source and ownership contracts", () => {
  it("reads saved strength and level while ownership and resistance use their separate identities", async () => {
    const saved = reference.contracts.snapshot
    expect(saved.scenario).toEqual(snapshotScenario)
    const input = await fairyInputFor(snapshotScenario, "snapshot")
    expect(saved.request).toEqual(serializableFairyInput(input))
    const result = value(calculateStaticDamageFromCatalog(input))
    expect(result).toEqual(value(saved.result))
    expect(input.hit.actorId).toBe(actors.wind.entityId)
    for (const [stat, amount] of [
      ["attack", 2400],
      ["anomalyProficiency", 320],
      ["penetrationRatio", 0.12],
    ] as const)
      expect(result.evaluation.attributes).toContainEqual(
        expect.objectContaining({
          entityId: actors.strength.entityId,
          snapshotId: "snapshot:non-wind",
          stat,
          value: expect.objectContaining({ value: amount }),
        }),
      )
    expect(item(result).finalStat).toBe(2400)
    expect(result.factors.nonCritical["anomalyProficiency"]).toBe(3.2)
    expect(result.factors.nonCritical["anomalyDamageLevel"]).toBe(1.8305)
    near(result.factors.nonCritical["defense"]!, 592 / (592 + 983))
    expect(result.factors.nonCritical["resistance"]).toBe(1)
    expect(result.evaluation.contributions).toHaveLength(4)
    expect(
      result.evaluation.contributions.every(
        (entry) => entry.origin.beneficiaryId === actors.wind.entityId,
      ),
    ).toBe(true)

    const changedCurrent: StaticCatalogDamageInput = {
      ...input,
      world: {
        ...input.world,
        entities: input.world.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId !== target.entityId
            ? {
                ...entity,
                generalStats: {},
                directStats: { criticalRate: { baseValue: 0, additions: [] } },
              }
            : entity,
        ),
      },
    }
    expect(
      value(calculateStaticDamageFromCatalog(changedCurrent)).factors,
    ).toEqual(result.factors)

    const nonWindOwner = value(
      calculateStaticDamageFromCatalog({
        ...input,
        hit: { ...input.hit, actorId: actors.strength.entityId },
      }),
    )
    expect(nonWindOwner.evaluation.contributions).toEqual([])
    expect(item(nonWindOwner).damageMultiplier).toBe(19)
    expect(nonWindOwner.factors.nonCritical["anomalyDamageBonus"]).toBe(1)
    expect(nonWindOwner.factors.nonCritical["resistance"]).toBe(0.8)
    expect(item(nonWindOwner).finalStat).toBe(2400)
    near(result.expected / nonWindOwner.expected, ((20.5 / 19) * 1.25) / 0.8)
  })

  it.each(["attack", "anomalyProficiency", "penetrationRatio"] as const)(
    "changes only the saved %s reading",
    async (stat) => {
      const input = await fairyInputFor(snapshotScenario, "snapshot")
      const baseline = value(calculateStaticDamageFromCatalog(input))
      const replacement = {
        attack: 3000,
        anomalyProficiency: 400,
        penetrationRatio: 0.4,
      }[stat]
      const result = value(
        calculateStaticDamageFromCatalog({
          ...input,
          snapshots: input.snapshots!.map((snapshot) => ({
            ...snapshot,
            attributes: snapshot.attributes.map((entry) =>
              entry.stat === stat
                ? ({
                    ...entry,
                    value: { ...entry.value, value: replacement },
                  } as typeof entry)
                : entry,
            ),
          })),
        }),
      )
      expect(attribute(result, stat)).toBe(replacement)
      near(
        result.expected / baseline.expected,
        stat === "penetrationRatio"
          ? (592 + 983) / (592 + 1200 * 0.6 - 73)
          : 1.25,
      )
    },
  )

  it("can select a different saved provider without reading the old or current provider", async () => {
    const input = await fairyInputFor(snapshotScenario, "snapshot")
    if (input.damage.kind !== "vortex") throw new Error("vortex required")
    const source = {
      entityId: "entity:alternate",
      snapshotId: "snapshot:alternate",
    } as const
    const result = value(
      calculateStaticDamageFromCatalog({
        ...input,
        actorSources: [
          ...input.actorSources!,
          { entityId: source.entityId, agentEntityId: "1011" },
        ],
        world: {
          ...input.world,
          entities: [
            ...input.world.entities,
            {
              kind: "actor",
              entityId: source.entityId,
              teamId: "team:players",
              generalStats: {},
              directStats: {},
            },
          ],
        },
        snapshots: [
          ...input.snapshots!,
          {
            ...input.snapshots![0]!,
            snapshotId: source.snapshotId,
            attributes: input.snapshots![0]!.attributes.map(
              (entry) =>
                ({
                  ...entry,
                  entityId: source.entityId,
                  value: {
                    ...entry.value,
                    value:
                      entry.stat === "attack"
                        ? 3700
                        : entry.stat === "anomalyProficiency"
                          ? 280
                          : 0.27,
                  },
                }) as typeof entry,
            ),
          },
        ],
        hit: {
          ...input.hit,
          damageItems: [{ ...input.hit.damageItems[0], statSource: source }],
        },
        damage: {
          ...input.damage,
          anomalySource: { ...source, level: 55 },
          defense: { ...input.damage.defense, penetrationValues: [101] },
          damageBonus: { settledMultiplier: 1.6 },
        },
      }),
    )
    expect(item(result).finalStat).toBe(3700)
    expect(result.factors.nonCritical["anomalyProficiency"]).toBe(2.8)
    near(
      result.factors.nonCritical["defense"]!,
      689 / (689 + 1200 * 0.73 - 101),
    )
    expect(result.factors.nonCritical["anomalyDamageLevel"]).toBe(1.9152)
    expect(result.factors.nonCritical["damageBonus"]).toBe(1.6)
    expect(
      result.evaluation.attributes
        .filter((entry) =>
          ["attack", "anomalyProficiency", "penetrationRatio"].includes(
            entry.stat,
          ),
        )
        .every(
          (entry) =>
            entry.entityId === source.entityId &&
            entry.snapshotId === source.snapshotId,
        ),
    ).toBe(true)
  })

  it.each(profiles)(
    "preserves the core zero-duration contract for $profile",
    async (row) => {
      const sample = scenario(`${row.profile}-zero`, row.profile, {
        durationBonusSeconds: -row.duration,
      })
      expect(
        calculateStandardVortexDamageMultiplier({
          vortexDamageMultiplierProfile: row.profile,
          sourceAnomalyDurationInSeconds: 0,
        }),
      ).toBe(row.zero)
      const result = value(
        calculateStaticDamageFromCatalog(await fairyInputFor(sample)),
      )
      expect(item(result).damageMultiplier).toBe(row.zero)
    },
  )
})

describe("explicit diagnostics and frozen-request association", () => {
  it.each(["wind", "unknown"])(
    "rejects unsupported profile %s",
    async (profile) => {
      expect(() =>
        calculateStandardVortexDamageMultiplier({
          vortexDamageMultiplierProfile:
            profile as VortexDamageMultiplierProfile,
          sourceAnomalyDurationInSeconds: 10,
        }),
      ).toThrow(RangeError)
      const input = await fairyInputFor(scenarios[0]!)
      const result = calculateStaticDamageFromCatalog({
        ...input,
        hit: {
          ...input.hit,
          damageItems: [
            { ...input.hit.damageItems[0], profile } as StaticCatalogDamageItem,
          ],
        },
      })
      expect(result).toMatchObject({
        ok: false,
        issues: [
          expect.objectContaining({
            code: "INVALID_INPUT",
            pointer: "/hit/damageItems/0/profile",
          }),
        ],
      })
    },
  )
  it.each([-1, NaN, Infinity])(
    "rejects invalid full duration %s",
    async (duration) => {
      expect(() =>
        calculateStandardVortexDamageMultiplier({
          vortexDamageMultiplierProfile: "burn",
          sourceAnomalyDurationInSeconds: duration,
        }),
      ).toThrow(RangeError)
      const input = await fairyInputFor(scenarios[0]!)
      expect(
        calculateStaticDamageFromCatalog({
          ...input,
          hit: {
            ...input.hit,
            damageItems: [
              {
                ...input.hit.damageItems[0],
                baseDurationSeconds: duration,
              } as StaticCatalogDamageItem,
            ],
          },
        }),
      ).toMatchObject({
        ok: false,
        issues: [
          expect.objectContaining({
            code: "INVALID_INPUT",
            pointer: "/hit/damageItems/0/baseDurationSeconds",
          }),
        ],
      })
    },
  )
  it.each([
    "source",
    "actor-identity",
    "snapshot",
    "attack",
    "anomalyProficiency",
    "penetrationRatio",
    "level",
    "elapsed",
  ] as const)("diagnoses missing or misplaced %s facts", async (missing) => {
    const original = await fairyInputFor(snapshotScenario, "snapshot")
    let input: StaticCatalogDamageInput = original
    if (missing === "source") {
      const damage = { ...original.damage } as Record<string, unknown>
      delete damage["anomalySource"]
      input = {
        ...original,
        damage: damage as unknown as StaticCatalogDamageInput["damage"],
      }
    } else if (missing === "actor-identity")
      input = {
        ...original,
        actorSources: original.actorSources!.filter(
          (entry) => entry.entityId !== actors.strength.entityId,
        ),
      }
    else if (missing === "snapshot") input = { ...original, snapshots: [] }
    else if (missing === "elapsed")
      input = {
        ...original,
        hit: {
          ...original.hit,
          damageItems: [
            {
              ...original.hit.damageItems[0],
              elapsedSeconds: 3,
            } as StaticCatalogDamageItem,
          ],
        },
      }
    else if (missing === "level") {
      if (original.damage.kind !== "vortex") throw new Error("vortex required")
      const { level: _level, ...source } = original.damage.anomalySource
      input = {
        ...original,
        damage: {
          ...original.damage,
          anomalySource: source,
        } as StaticCatalogDamageInput["damage"],
      }
    } else
      input = {
        ...original,
        snapshots: original.snapshots!.map((snapshot) => ({
          ...snapshot,
          attributes: snapshot.attributes.filter(
            (entry) => entry.stat !== missing,
          ),
        })),
      }
    const result = calculateStaticDamageFromCatalog(input)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("Invalid input was accepted")
    const expectedIssues =
      missing === "source"
        ? [
            {
              code: "INVALID_INPUT",
              pointer: "/damage/anomalySource",
              message: "anomaly source must be a plain object",
            },
          ]
        : missing === "actor-identity"
          ? [
              {
                code: "MISSING_FACT",
                pointer: "/actorSources",
                message: "Missing teammate identity: entity:strength",
              },
            ]
          : missing === "level"
            ? [
                {
                  code: "INVALID_INPUT",
                  pointer: "/damage/anomalySource/level",
                  message: "source level must be a finite number",
                },
              ]
            : missing === "elapsed"
              ? [
                  {
                    code: "INVALID_INPUT",
                    pointer: "/hit/damageItems/0/elapsedSeconds",
                    message:
                      'Unknown field "elapsedSeconds" on catalog damage item',
                  },
                ]
              : (missing === "snapshot"
                  ? ["attack", "anomalyProficiency", "penetrationRatio"]
                  : [missing]
                ).map((stat) => ({
                  code: "MISSING_SNAPSHOT",
                  pointer: "/hit",
                  message: `Snapshot "snapshot:non-wind" does not save (entity:strength, ${stat}, current)`,
                }))
    expect(result.issues).toEqual(expectedIssues)
  })

  it("retains upstream rejections and normalization outside the common domain", () => {
    const messages: Record<string, string> = {
      "wind-agent": "风属性角色不能配置乱流事件。",
      "legacy-wind-source": "旧乱流事件已停用，请重新添加乱流事件。",
      "legacy-anomaly-snapshot": "旧乱流事件已停用，请重新添加乱流事件。",
      "invalid-profile": "Unknown turbulence effect: wind",
      "missing-profile": "Unknown turbulence effect: turbulence",
    }
    const base = required(
      scenarios.find((sample) => sample.id === "burn-standard-off"),
    )
    for (const record of reference.diagnostics) {
      const expected = expectedNativeRequest(base)
      const event = expected.damage.events[0]!
      switch (record.id) {
        case "wind-agent":
          expected.agentId = "velina"
          break
        case "legacy-wind-source":
          event.windSource = { actorRef: { agentId: "velina" } }
          break
        case "legacy-anomaly-snapshot":
          event.anomalySource = {
            actorRef: { agentId: "soldier_11" },
            snapshot: { agentId: "soldier_11" },
          }
          break
        case "invalid-profile":
          event.anomalyEffect = "wind"
          break
        case "missing-profile":
          delete event.anomalyEffect
          break
        case "negative-elapsed":
          event.elapsedSeconds = -1
          break
        case "zero-duration-not-accepted":
          event.baseDurationSeconds = 0
          break
        case "negative-extension":
          expected.combatBuffs.manualEffects = expectedNativeRequest({
            ...base,
            durationBonusSeconds: -3,
          }).combatBuffs.manualEffects
          break
        default:
          throw new Error(`Unclassified upstream diagnostic: ${record.id}`)
      }
      expect(record.request).toEqual(expected)
    }
    for (const [id, message] of Object.entries(messages))
      expect(
        required(reference.diagnostics.find((entry) => entry.id === id)).error,
      ).toEqual({ name: "Error", message })
    for (const id of [
      "negative-elapsed",
      "zero-duration-not-accepted",
      "negative-extension",
    ]) {
      const record = required(
        reference.diagnostics.find((entry) => entry.id === id),
      )
      expect(record.error).toBeUndefined()
      expect(required(record.result).damage.events[0]!.input).toMatchObject({
        durationSeconds: 10,
        elapsedSeconds: 0,
        durationBonusSeconds: 0,
        baseMultiplier: 19,
      })
    }
  })

  const mismatches: [string, (entry: ReferenceCase) => void][] = [
    [
      "source identity",
      (entry) => {
        entry.upstream.request.agentId = "alice_thymefield"
      },
    ],
    [
      "external attack",
      (entry) => {
        entry.scenario.source.attack += 300
      },
    ],
    [
      "native manual AP",
      (entry) => {
        entry.upstream.request.combatBuffs.manualStats[1]!.value += 100
      },
    ],
    [
      "native buff switch",
      (entry) => {
        entry.upstream.request.combatBuffs.activeBuffIds.pop()
      },
    ],
    [
      "duration extension",
      (entry) => {
        entry.upstream.request.combatBuffs.manualEffects[0]!.effects[0]!.value += 1
      },
    ],
    [
      "event branch",
      (entry) => {
        entry.upstream.request.damage.events[0]!.anomalyEffect = "shock"
      },
    ],
    [
      "event settlement",
      (entry) => {
        entry.upstream.request.damage.events[0]!.settlementType = "disorder"
      },
    ],
    [
      "event count",
      (entry) => {
        entry.upstream.request.damage.events[0]!.count = 2
      },
    ],
    [
      "target fire resistance",
      (entry) => {
        entry.upstream.request.damage.target.resistanceByElement["fire"] = 60
      },
    ],
    [
      "source level",
      (entry) => {
        entry.upstream.request.damage.agentLevel = 50
      },
    ],
    [
      "Fairy source binding",
      (entry) => {
        entry.fairy.request = {
          ...entry.fairy.request,
          hit: {
            ...entry.fairy.request.hit,
            damageItems: [
              {
                ...entry.fairy.request.hit.damageItems[0],
                statSource: { entityId: actors.wind.entityId },
              },
            ],
          },
        }
      },
    ],
    [
      "Fairy owner",
      (entry) => {
        entry.fairy.request = {
          ...entry.fairy.request,
          hit: {
            ...entry.fairy.request.hit,
            actorId: actors.strength.entityId,
          },
        }
      },
    ],
  ]
  it.each(mismatches)(
    "rejects a frozen request mismatched at %s",
    async (_label, mutate) => {
      const entry = structuredClone(common("burn-extended-on"))
      const sample = required(
        scenarios.find((candidate) => candidate.id === entry.id),
      )
      const input = await fairyInputFor(sample)
      assertAssociation(entry, sample, input)
      mutate(entry)
      expect(() => assertAssociation(entry, sample, input)).toThrow()
    },
  )
  it("rejects empty numeric expectations and missing native damage", () => {
    const record = common("burn-standard-off")
    const actual = fairyMetrics(value(record.fairy.result), record.scenario)
    expect(() => compareReadouts(actual, {} as Metrics)).toThrow()
    const expected = nativeMetrics(record.upstream.result.damage.events[0]!)
    expect(() =>
      compareReadouts(actual, {
        ...expected,
        damage: undefined,
      } as unknown as Metrics),
    ).toThrow()
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { calculationDataVersion } from "../src/index.ts"
import type { CalculationDataVersion } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import type {
  StaticActionCalculationInput,
  StaticActionCalculationResult,
  StaticActorConfiguration,
  StaticPanelValues,
} from "../../core/src/index.ts"
import {
  actions,
  builds,
  fairyInputFor,
  inputFacts,
  options,
  scenarios,
} from "./fixtures/zzz-calculator-static-cases.ts"
import type {
  StaticComparisonBuild,
  StaticComparisonScenario,
} from "./fixtures/zzz-calculator-static-cases.ts"

interface NativePanelResult {
  panel: Record<string, number>
  bonusTotals: Record<string, number>
  baseBreakdown: {
    agent: Record<string, number>
    wEngine: Record<string, number>
  }
}
interface NativeEquipmentRequest {
  agentId: string
  agentLevel: number
  coreSkillLevel: string
  cinemaLevel: number
  potentialLevel: number
  wEngineId: string
  wEngineLevel: number
  wEngineModificationLevel: number
  driveDiscs: {
    id: string
    setId: string
    partition: number
    rarity: string
    level: number
    maxLevel: number
    mainStat: { stat: string; value: number }
    subStats: { stat: string; value: number }[]
  }[]
}
interface NativeRequest extends NativeEquipmentRequest {
  combatBuffs: {
    activeBuffIds: string[]
    runtimeInputs: Record<
      string,
      {
        effects: Record<
          string,
          { coverage?: number; sourceValue?: number; stacks?: number }
        >
        parameters?: Record<string, number>
      }
    >
    manualStats: unknown[]
    manualEffects: unknown[]
    teammateDriveDiscSetIds: string[]
  }
  damage: {
    mode: string
    agentLevel: number
    cinemaLevel: number
    potentialLevel: number
    skillLevelsByCategory: Record<string, number>
    selectedEventId: string
    events: {
      id: string
      kind: string
      count: number
      stunned: boolean
      critMode: string
      skillRef: {
        agentSkillId: string
        categoryId: string
        moveId: string
        rowId: string
        level: number
      }
    }[]
    target: {
      defense: number
      levelCoefficient: number
      resistanceByElement: Record<string, number>
      stunMultiplierPercent: number
    }
  }
}
interface NativeResult {
  outOfCombat: NativePanelResult
  inCombat: { panel: Record<string, number> }
  damage: {
    totalFinalDamage: number
    input: {
      skillSource: { level: number }
      target: { resistanceByElement: Record<string, number> }
    }
    multipliers: Record<string, number>
    events: {
      damageVariants: Record<
        string,
        { finalDamage: number; critMultiplier: number }
      >
    }[]
  }
}
interface SourceValues {
  health: number
  attack: number
  defense: number
  energyRegen: number
  wEngineAttribute: string
  wEngineValue: number
}
interface ReferenceCase {
  id: string
  scenario: StaticComparisonScenario
  builds: Record<string, StaticComparisonBuild>
  upstream: {
    request: NativeRequest
    result: NativeResult
    sourcePanels: Record<
      string,
      { request: NativeEquipmentRequest; result: NativePanelResult }
    >
  }
  fairyNative: {
    totals: { nonCritical: number; critical: number; expected: number }
    factors: { critical: Record<string, number> }
    criticalSemantics: string
  }
  comparison: {
    equalMetrics: string[]
    knownDifferences: {
      metric: string
      reason: string
      fairy: number
      upstream: number
    }[]
  }
}
interface Reference {
  schemaVersion: number
  provenance: {
    repository: string
    commit: string
    fairyBase: string
    sources: Record<string, string>
    fairySources: Record<string, string>
    fairyCalculationDataVersion: CalculationDataVersion
    fairyCalculationSources: Record<string, string>
  }
  inputFacts: typeof inputFacts
  identity: {
    driveDiscSets: Record<string, string>
    actions: typeof actions
    options: typeof options
    agents: Record<string, { id: string }>
    wEngines: Record<string, { id: string }>
  }
  sourceValues: Record<string, { fairy: SourceValues; upstream: SourceValues }>
  inputSources: {
    driveDiscs: {
      file: string
      pointer: string
      sRankMaxMainStat: Record<string, number>
      sRankSubStatBaseStep: Record<string, number>
    }
    buffEffects: Record<
      string,
      {
        file: string
        pointer: string
        effectIds: string[]
      }
    >
    damageLevelCoefficient: {
      file: string
      declaration: string
      value: number
    }
  }
  differences: Record<string, string>
  coverageGaps: string[]
  statistics: {
    scenarios: number
    equalReadouts: number
    knownDifferenceReadouts: number
    sharpSemanticCases: number
  }
  cases: ReferenceCase[]
}
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/zzz-calculator-static-reference.json", import.meta.url),
    "utf8",
  ),
) as Reference

type DamageResult = Extract<StaticActionCalculationResult, { kind: "damage" }>
const statMap = {
  health: "hp",
  attack: "atk",
  defense: "def",
  impact: "impact",
  anomalyProficiency: "anomalyProficiency",
  anomalyMastery: "anomalyMastery",
  energyRegen: "energyRegen",
  criticalRate: "critRate",
  criticalDamage: "critDmg",
  penetrationRatio: "penRatio",
  sharpCriticalDamage: "lacerationDmg",
} as const
const elements = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
] as const
const tolerance = (value: number) => 1e-8 * Math.max(1, Math.abs(value))
function close(
  actual: number | null | undefined,
  expected: number,
  label: string,
) {
  expect(Number.isFinite(actual), label).toBe(true)
  expect(Number.isFinite(expected), label).toBe(true)
  expect(Math.abs(actual! - expected), label).toBeLessThanOrEqual(
    tolerance(expected),
  )
}
function calculate(input: StaticActionCalculationInput): DamageResult {
  const result = calculateStaticActionDamage(input)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}
const calculations = new Map<
  string,
  Promise<{ input: StaticActionCalculationInput; result: DamageResult }>
>()
function calculateCase(scenario: StaticComparisonScenario) {
  let pending = calculations.get(scenario.id)
  if (!pending) {
    pending = fairyInputFor(scenario).then((input) => ({
      input,
      result: calculate(input),
    }))
    calculations.set(scenario.id, pending)
  }
  return pending
}
function upstreamPanel(record: ReferenceCase, actor: string) {
  return actor === record.scenario.actor
    ? record.upstream.result.outOfCombat
    : record.upstream.sourcePanels[actor]!.result
}
function upstreamReadouts(record: ReferenceCase): Record<string, number> {
  const values: Record<string, number> = {}
  for (const [id, build] of Object.entries(record.builds)) {
    if (!build.upstreamAgentId) continue
    const panel = upstreamPanel(record, id).panel
    for (const [stat, key] of Object.entries(statMap))
      values[`panel.${id}.${stat}`] = panel[key]!
    values[`panel.${id}.penetrationValue`] = panel.penFlat!
    for (const element of elements)
      values[`panel.${id}.bonus.${element}`] = panel[`${element}Dmg`]!
    if (id === "yixuan") values[`panel.${id}.sheerForce`] = panel.sheerForce!
  }
  const damage = record.upstream.result.damage,
    m = damage.multipliers,
    variants = damage.events[0]!.damageVariants
  return {
    ...values,
    "action.multiplier": m.skill!,
    "action.level": damage.input.skillSource.level,
    "hit.scalingStat": m.sheerForce ?? m.damageBasisValue!,
    "hit.criticalRate": m.rawCritRate!,
    "factor.damageBonus": m.dmg ?? m.damage!,
    "factor.kindBonus": m.sheerDamage ?? m.sharpDmg ?? 1,
    "factor.defense": m.defense!,
    "factor.resistance": m.resistance!,
    "factor.stun": m.stun!,
    "factor.expectedCritical": m.crit!,
    "damage.nonCritical": variants.nonCrit!.finalDamage,
    "damage.expected": variants.expected!.finalDamage,
    ...(record.scenario.actor === "claret"
      ? {}
      : {
          "factor.critical": variants.crit!.critMultiplier,
          "damage.critical": variants.crit!.finalDamage,
        }),
  }
}
function fairyReadouts(
  record: ReferenceCase,
  input: StaticActionCalculationInput,
  result: DamageResult,
): Record<string, number> {
  const values: Record<string, number> = {}
  for (const [id, build] of Object.entries(record.builds)) {
    if (!build.upstreamAgentId) continue
    const panel = result.panels.find(
      (candidate) => candidate.entityId === build.actor.entityId,
    )!
    for (const stat of Object.keys(statMap) as (keyof typeof statMap)[])
      values[`panel.${id}.${stat}`] = panel.stats[stat]!.value
    values[`panel.${id}.penetrationValue`] = panel.penetrationValue
    for (const element of elements)
      values[`panel.${id}.bonus.${element}`] = panel.damageBonuses[element] ?? 0
    if (id === "yixuan")
      values[`panel.${id}.sheerForce`] = panel.stats.sheerForce!.value
  }
  if (!input.action.ok) throw new Error("Unavailable action")
  const damage = result.segments[0]!.damage,
    factors = damage.factors.nonCritical
  return {
    ...values,
    "action.multiplier": input.action.sourceDamageMultiplier!,
    "action.level": Object.values(input.action.levels)[0]!.effective,
    "hit.scalingStat": damage.evaluation.hit!.damageItems[0]!.finalStat,
    "hit.criticalRate": damage.evaluation.hit!.criticalRate,
    "factor.damageBonus": factors.damageBonus!,
    "factor.kindBonus":
      factors.sheerDamageBonus ?? factors.sharpenDamageBonus ?? 1,
    "factor.defense": factors.defense ?? 1,
    "factor.resistance": factors.resistance!,
    "factor.stun": factors.stunDamage!,
    "factor.expectedCritical": damage.expected / damage.nonCritical,
    "damage.nonCritical": result.totals.nonCritical,
    "damage.expected": result.totals.expected,
    ...(record.scenario.actor === "claret"
      ? {}
      : {
          "factor.critical": damage.factors.critical!.critical!,
          "damage.critical": result.totals.critical!,
        }),
  }
}

function finiteTree(value: unknown): void {
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("Non-finite reference value")
  if (value && typeof value === "object")
    for (const child of Object.values(value)) finiteTree(child)
}

// Input translation only: no panel, buff amount or damage formula is reproduced here.
function upstreamAffixId(
  choice: { attribute: string; element?: string },
  slot: number,
  operation?: string,
): string {
  if (choice.attribute === "damageBonus") return `${choice.element}Dmg`
  const base = { health: "hp", attack: "atk", defense: "def" }[
    choice.attribute as "health" | "attack" | "defense"
  ]
  if (base)
    return (
      base +
      ((operation ? operation === "initial-percentage" : slot > 3)
        ? "Pct"
        : "Flat")
    )
  const stat = {
    criticalRate: "critRate",
    criticalDamage: "critDmg",
    penetrationValue: "penFlat",
  }[choice.attribute as "criticalRate" | "criticalDamage" | "penetrationValue"]
  if (!stat) throw new Error(`Uncovered affix ${choice.attribute}`)
  return stat
}
function expectedEquipmentRequest(
  build: StaticComparisonBuild,
  value: Reference,
): NativeEquipmentRequest {
  const actor = build.actor,
    affixes = value.inputSources.driveDiscs
  expect(actor.coreSkillLevel).toBe(7) // These cases select the source's final F tier.
  expect(build.upstreamAgentId).not.toBeNull()
  expect(build.upstreamWEngineId).not.toBeNull()
  return {
    agentId: build.upstreamAgentId!,
    agentLevel: inputFacts.level,
    coreSkillLevel: "F",
    cinemaLevel: actor.mindscapeRank,
    potentialLevel: actor.potentialLevel!,
    wEngineId: build.upstreamWEngineId!,
    wEngineLevel: inputFacts.level,
    wEngineModificationLevel: actor.wEngine!.refinement,
    driveDiscs: Object.entries(actor.driveDiscs).map(([slot, disc]) => {
      if (!disc?.mainStat || !disc.substats)
        throw new Error(
          "These cases require all six slots with main and substats",
        )
      const mainStatId = upstreamAffixId(disc.mainStat, Number(slot))
      const mainStatValue = affixes.sRankMaxMainStat[mainStatId]!
      expect(Number.isFinite(mainStatValue), mainStatId).toBe(true)
      return {
        id: `${actor.entityId}:disc:${slot}`,
        setId: value.identity.driveDiscSets[disc.setEntityId]!,
        partition: Number(slot),
        rarity: inputFacts.discRarity,
        level: inputFacts.discLevel,
        maxLevel: inputFacts.discLevel,
        mainStat: { stat: mainStatId, value: mainStatValue },
        subStats: disc.substats!.map((substat) => {
          const stat = upstreamAffixId(substat, Number(slot), substat.operation)
          const step = affixes.sRankSubStatBaseStep[stat]!
          expect(Number.isFinite(step), stat).toBe(true)
          return { stat, value: step * substat.rolls }
        }),
      }
    }),
  }
}
function expectedCombatBuffs(
  record: ReferenceCase,
  scenario: StaticComparisonScenario,
  value: Reference,
): NativeRequest["combatBuffs"] {
  const runtimeInputs: NativeRequest["combatBuffs"]["runtimeInputs"] = {}
  const enable = (
    buffId: string,
    effects: NativeRequest["combatBuffs"]["runtimeInputs"][string]["effects"],
    parameters?: Record<string, number>,
  ) => {
    const source = value.inputSources.buffEffects[buffId]!
    expect(value.provenance.sources[source.file]).toMatch(/^[a-f0-9]{64}$/u)
    expect(source.pointer).toMatch(/^\//u)
    expect(source.effectIds).toEqual(Object.keys(effects).toSorted())
    runtimeInputs[buffId] = { effects, ...(parameters ? { parameters } : {}) }
  }
  const layers = inputFacts.selfBuffLayers
  if (scenario.actor === "claret")
    enable("agent:claret.corePassive", {
      "claret-sharp-state-crit-rate": { coverage: 1 },
    })
  if (scenario.selfBuffs) {
    if (scenario.actor === "soldier") {
      enable("agent:soldier_11.corePassive", {
        "heat-wave-fire-suppression-damage": { coverage: 1 },
      })
      enable("agent:soldier_11.cinema.2", {
        "high-temperature-convergence-damage": {
          coverage: 1,
          stacks: layers.soldierM2,
        },
      })
      enable("wEngine:zzz_wiki_223.self", {
        effect_wiki_223_self_atk: { coverage: 1, stacks: layers.brimstone },
      })
    } else if (scenario.actor === "yixuan") {
      enable("agent:yixuan.corePassive", { "effect-1": { coverage: 1 } })
      enable("wEngine:zzz_wiki_1342.self", {
        effect_wiki_1342_self_crit_rate: { coverage: 1 },
        effect_wiki_1342_self_ether_dmg: {
          coverage: 1,
          stacks: layers.cageDamage,
        },
        effect_wiki_1342_self_ether_sheer: {
          coverage: 1,
          stacks: layers.cageSheer,
        },
      })
    } else {
      enable("agent:claret.cinema.4", {
        "claret-c4-selected-damage": { coverage: 1 },
      })
      enable("wEngine:zzz_wiki_2188.self", {
        "scarlet-crit-rate": { coverage: 1 },
        "scarlet-electric-dmg": { coverage: 1 },
        "scarlet-electric-sharp-dmg": { coverage: 1 },
      })
    }
  }
  if (scenario.remielle?.special)
    enable("remielle_dan.special.timeflow_hymn", {
      remielle_dan_special_team_dmg: {
        coverage: 1,
        sourceValue: scenario.remielle.specialLevel,
      },
    })
  if (scenario.remielle?.attack) {
    const sourceValue = record.upstream.sourcePanels.remielle!.result.panel.atk!
    enable(
      "remielle_dan.additional.fragrant_invitation",
      {
        remielle_dan_additional_atk_one_anomaly: { coverage: 1, sourceValue },
        remielle_dan_additional_atk_two_anomaly: { coverage: 1, sourceValue },
        remielle_dan_additional_atk_three_anomaly: { coverage: 1, sourceValue },
      },
      { anomalyAgentCount: scenario.remielle.anomalyCount },
    )
  }
  if (scenario.roxy?.core) {
    const sourceValue = scenario.roxy.sourceCriticalRate * 100
    enable("roxy.core_crit_damage", {
      roxy_core_crit_dmg: { coverage: 1, sourceValue },
      roxy_core_laceration_dmg: { coverage: 1, sourceValue },
    })
  }
  if (scenario.roxy?.additional)
    enable("roxy.additional_ability", {
      roxy_additional_stun: { coverage: 1 },
      roxy_additional_imbuement: { coverage: Number(scenario.target.imbued) },
    })
  if (scenario.roxy?.mindscape1)
    enable("roxy.cinema_1_res_reduction", {
      roxy_cinema_1_res_reduction: { coverage: 1 },
    })
  if (scenario.roxy?.mindscape2)
    enable("roxy.cinema_2_stun", { roxy_cinema_2_stun: { coverage: 1 } })
  return {
    activeBuffIds: Object.keys(runtimeInputs),
    runtimeInputs,
    manualStats: [],
    manualEffects: [],
    teammateDriveDiscSetIds: [],
  }
}
function validateNativeInputs(value: Reference, record: ReferenceCase): void {
  const scenario = scenarios.find((candidate) => candidate.id === record.id)!
  expect(record.scenario, record.id).toEqual(scenario)
  expect(record.builds, record.id).toEqual(
    Object.fromEntries(scenario.team.map((id) => [id, builds[id]])),
  )
  expect(
    Object.keys(record.upstream.sourcePanels).toSorted(),
    record.id,
  ).toEqual(
    scenario.team
      .filter((id) => id !== scenario.actor && builds[id].upstreamAgentId)
      .toSorted(),
  )
  for (const id of scenario.team) {
    const build = builds[id]
    if (!build.upstreamAgentId) continue
    expect(value.identity.agents[id]!.id).toBe(build.upstreamAgentId)
    expect(value.identity.wEngines[id]!.id).toBe(build.upstreamWEngineId)
    if (id !== scenario.actor)
      expect(
        record.upstream.sourcePanels[id]!.request,
        `${record.id} source ${id}`,
      ).toEqual(expectedEquipmentRequest(build, value))
  }
  const build = builds[scenario.actor],
    action = actions[scenario.actor]
  expect(record.upstream.request, `${record.id} native request`).toEqual({
    ...expectedEquipmentRequest(build, value),
    combatBuffs: expectedCombatBuffs(record, scenario, value),
    damage: {
      mode: "custom",
      agentLevel: inputFacts.level,
      cinemaLevel: build.actor.mindscapeRank,
      potentialLevel: build.actor.potentialLevel!,
      skillLevelsByCategory: Object.fromEntries(
        Object.entries(build.actor.skillLevels!).map(([category, level]) => [
          category,
          level.value,
        ]),
      ),
      selectedEventId: scenario.id,
      events: [
        {
          id: scenario.id,
          kind: action.kind,
          count: inputFacts.event.count,
          critMode: inputFacts.event.critMode,
          stunned: scenario.target.stunned,
          skillRef: {
            agentSkillId: build.upstreamAgentId!,
            categoryId: action.category,
            moveId: action.move,
            rowId: action.row,
            level: action.level,
          },
        },
      ],
      target: {
        defense: scenario.target.defense,
        levelCoefficient: value.inputSources.damageLevelCoefficient.value,
        resistanceByElement: {
          [action.element]: scenario.target.resistance * 100,
        },
        stunMultiplierPercent: scenario.target.stunMultiplier * 100,
      },
    },
  } satisfies NativeRequest)
}
function validateReference(value: Reference) {
  finiteTree(value)
  if (value.schemaVersion !== 1) throw new Error("Unknown reference schema")
  const ids = value.cases.map((record) => record.id)
  if (
    new Set(ids).size !== ids.length ||
    ids.toSorted().join() !==
      scenarios
        .map((s) => s.id)
        .toSorted()
        .join()
  )
    throw new Error("Missing, duplicate or unexpected sample")
  let equal = 0,
    different = 0
  for (const record of value.cases) {
    validateNativeInputs(value, record)
    const expected = upstreamReadouts(record)
    const { equalMetrics, knownDifferences } = record.comparison
    const metrics = [...equalMetrics, ...knownDifferences.map((d) => d.metric)]
    if (
      !equalMetrics.length ||
      !knownDifferences.length ||
      metrics.toSorted().join() !== Object.keys(expected).toSorted().join()
    )
      throw new Error("Empty, duplicate or incomplete expectations")
    if (!Object.values(expected).every(Number.isFinite))
      throw new Error("Missing native readout")
    for (const difference of knownDifferences) {
      if (
        !value.differences[difference.reason] ||
        !Number.isFinite(difference.fairy) ||
        !Number.isFinite(difference.upstream)
      )
        throw new Error("Unknown or non-finite difference")
      if (
        difference.upstream !== expected[difference.metric] ||
        Math.abs(difference.fairy - difference.upstream) <=
          tolerance(difference.upstream)
      )
        throw new Error("Difference does not match native output")
    }
    const variants = record.upstream.result.damage.events[0]!.damageVariants
    const branches =
      record.scenario.actor === "claret"
        ? ["expected", "nonCrit", "sharpCrit", "lacerationCrit"]
        : ["expected", "nonCrit", "crit"]
    if (
      record.upstream.result.damage.events.length !== 1 ||
      Object.keys(variants).toSorted().join() !== branches.toSorted().join()
    )
      throw new Error("Missing native damage branch")
    for (const branch of Object.values(variants))
      if (!Number.isFinite(branch.finalDamage) || branch.finalDamage <= 0)
        throw new Error("Invalid native damage expectation")
    equal += equalMetrics.length
    different += knownDifferences.length
  }
  if (
    equal !== value.statistics.equalReadouts ||
    different !== value.statistics.knownDifferenceReadouts
  )
    throw new Error("Incorrect comparison counts")
}

// These small diagnostic equations prove the recorded deltas. They never assemble a calculation input.
function panelPrecisionDelta(
  record: ReferenceCase,
  id: string,
  stat: "health" | "attack" | "defense",
): number {
  const source = reference.sourceValues[id]!,
    key = statMap[stat]
  const agentDelta = source.fairy[stat] - source.upstream[stat]
  const engineDelta =
    source.fairy.wEngineAttribute === stat
      ? source.fairy.wEngineValue - source.upstream.wEngineValue
      : 0
  return (
    (agentDelta + engineDelta) *
    (1 + upstreamPanel(record, id).bonusTotals[`${key}Pct`]!)
  )
}
function scalingPrecisionDelta(record: ReferenceCase): number {
  const s = record.scenario
  const sharedAttackDelta = s.remielle?.attack
    ? 0.12 * panelPrecisionDelta(record, "remielle", "attack")
    : 0
  if (s.actor === "yixuan")
    return (
      0.1 * panelPrecisionDelta(record, "yixuan", "health") +
      0.3 *
        (panelPrecisionDelta(record, "yixuan", "attack") + sharedAttackDelta)
    )
  if (s.actor === "claret")
    return panelPrecisionDelta(record, "claret", "defense")
  return (
    panelPrecisionDelta(record, "soldier", "attack") *
      (s.selfBuffs ? 1 + 0.052 * 2 : 1) +
    sharedAttackDelta
  )
}
function fairyCriticalFactors(record: ReferenceCase) {
  const m = record.upstream.result.damage.multipliers
  if (!record.scenario.roxy?.core)
    return { expected: m.crit!, critical: 1 + (m.critDmg ?? m.lacerationDmg!) }
  if (record.scenario.actor === "claret") {
    // Source CR=50% gives upstream +10% sharp damage; Fairy excludes this non-wind hit.
    const sharp = m.lacerationDmg! - 0.1
    return {
      expected: (1 + sharp) * (1 + (m.rawCritRate! - 1) * sharp),
      critical: 1 + sharp,
    }
  }
  const criticalDamage = m.critDmg! - 0.2
  return {
    expected: 1 + m.rawCritRate! * criticalDamage,
    critical: 1 + criticalDamage,
  }
}
function explainedValue(record: ReferenceCase, metric: string): number {
  const upstream = upstreamReadouts(record),
    parts = metric.split(".")
  if (parts[0] === "panel") {
    const id = parts[1]!,
      stat = parts[2]!
    if (stat === "sheerForce")
      return (
        upstream[metric]! +
        0.1 * panelPrecisionDelta(record, id, "health") +
        0.3 * panelPrecisionDelta(record, id, "attack")
      )
    if (stat === "energyRegen")
      return reference.sourceValues[id]!.fairy.energyRegen
    if (stat === "health" || stat === "attack" || stat === "defense")
      return upstream[metric]! + panelPrecisionDelta(record, id, stat)
  }
  if (metric === "hit.scalingStat")
    return upstream[metric]! + scalingPrecisionDelta(record)
  const crit = fairyCriticalFactors(record)
  if (metric === "factor.expectedCritical") return crit.expected
  if (metric === "factor.critical") return crit.critical
  if (metric.startsWith("damage.")) {
    const scale =
      (upstream["hit.scalingStat"]! + scalingPrecisionDelta(record)) /
      upstream["hit.scalingStat"]!
    const critRatio =
      metric === "damage.expected"
        ? crit.expected / upstream["factor.expectedCritical"]!
        : metric === "damage.critical"
          ? crit.critical / upstream["factor.critical"]!
          : 1
    return upstream[metric]! * scale * critRatio
  }
  throw new Error(`Unexplained metric ${record.id}: ${metric}`)
}

describe("ZZZ Calculator static reference integrity", () => {
  it("freezes 32 complete inputs, native returns, source hashes and an exhaustive readout partition", () => {
    validateReference(reference)
    expect(reference.statistics).toEqual({
      scenarios: 32,
      equalReadouts: 1007,
      knownDifferenceReadouts: 301,
      sharpSemanticCases: 8,
    })
    expect(reference.provenance.commit).toBe(
      "d58e276973c3df944bc36fc81a783f3d17018708",
    )
    expect(reference.provenance.fairyBase).toBe(
      "e95e40562be8ed537e247cad88b0334b9033fc00",
    )
    expect(reference.provenance.repository).toBe(
      "https://github.com/ZztIsolation/zzz_calculator",
    )
    expect(reference.inputFacts).toEqual(inputFacts)
    expect(reference.provenance.fairyCalculationDataVersion).toEqual(
      calculationDataVersion,
    )
    expect(
      Object.keys(reference.provenance.fairyCalculationSources),
    ).toHaveLength(7)
    expect(reference.inputSources.driveDiscs.file).toBe("data/stat_rules.json")
    expect(reference.inputSources.driveDiscs.pointer).toBe("/driveDisc")
    expect(reference.inputSources.damageLevelCoefficient).toEqual({
      file: "core/calculator-core.js",
      declaration: "const DEFAULT_DAMAGE_LEVEL_COEFFICIENT = 794",
      value: 794,
    })
    expect(Object.keys(reference.inputSources.buffEffects).toSorted()).toEqual(
      [
        ...new Set(
          reference.cases.flatMap(
            (record) => record.upstream.request.combatBuffs.activeBuffIds,
          ),
        ),
      ].toSorted(),
    )
    expect(reference.identity.actions).toEqual(actions)
    expect(reference.identity.options).toEqual(options)
    for (const key of [
      "backend/calculator.js",
      "core/calculator-core.js",
      "data/agents.json",
      "data/agent_skills.json",
      "data/w_engines.json",
      "data/stat_rules.json",
      "data/enka_zzz_mapping.json",
      "tests/remielle-teammate-buffs.test.js",
      "tests/roxy-teammate-buffs.test.js",
    ])
      expect(reference.provenance.sources[key], key).toMatch(/^[a-f0-9]{64}$/u)
    for (const hash of [
      ...Object.values(reference.provenance.sources),
      ...Object.values(reference.provenance.fairySources),
      ...Object.values(reference.provenance.fairyCalculationSources),
    ])
      expect(hash).toMatch(/^[a-f0-9]{64}$/u)
    for (const record of reference.cases) {
      const scenario = scenarios.find((s) => s.id === record.id)!
      const action = actions[scenario.actor],
        native = record.upstream.result
      // The upstream public request uses percent; its normalized return confirms the ratio.
      expect(
        record.upstream.request.damage.target.resistanceByElement[
          action.element
        ],
      ).toBe(scenario.target.resistance * 100)
      expect(
        native.damage.input.target.resistanceByElement[action.element],
      ).toBe(scenario.target.resistance)
      close(
        native.damage.totalFinalDamage,
        native.damage.events[0]!.damageVariants.expected!.finalDamage,
        "single event total",
      )
      expect(native.damage.multipliers.imbuement).toBe(1)
      if (scenario.roxy?.additional)
        expect(
          record.upstream.request.combatBuffs.runtimeInputs[
            "roxy.additional_ability"
          ]!.effects.roxy_additional_imbuement!.coverage,
        ).toBe(0)
    }
  })
  it.each([
    [
      "output main value +1000",
      "soldier-self-off",
      (record) => {
        record.upstream.request.driveDiscs[0]!.mainStat.value += 1000
      },
    ],
    [
      "output main attribute",
      "soldier-self-off",
      (record) => {
        record.upstream.request.driveDiscs[0]!.mainStat.stat = "atkFlat"
      },
    ],
    [
      "output substat roll mapping",
      "soldier-self-off",
      (record) => {
        const substats = record.upstream.request.driveDiscs[0]!.subStats
        ;[substats[0]!.value, substats[1]!.value] = [
          substats[1]!.value,
          substats[0]!.value,
        ]
      },
    ],
    [
      "source main value +1000",
      "soldier-remielle-combined",
      (record) => {
        record.upstream.sourcePanels.remielle!.request.driveDiscs[0]!.mainStat.value += 1000
      },
    ],
    [
      "source substat roll mapping",
      "soldier-remielle-combined",
      (record) => {
        record.upstream.sourcePanels.remielle!.request.driveDiscs[0]!.subStats[0]!.value =
          3 * 2
      },
    ],
    [
      "source substat attribute",
      "soldier-remielle-combined",
      (record) => {
        record.upstream.sourcePanels.alice!.request.driveDiscs[0]!.subStats[0]!.stat =
          "defPct"
      },
    ],
    [
      "buff switch",
      "soldier-self-on",
      (record) => {
        record.upstream.request.combatBuffs.activeBuffIds.pop()
      },
    ],
    [
      "buff stacks",
      "soldier-self-on",
      (record) => {
        record.upstream.request.combatBuffs.runtimeInputs[
          "agent:soldier_11.cinema.2"
        ]!.effects["high-temperature-convergence-damage"]!.stacks = 3
      },
    ],
    [
      "source attack identity",
      "soldier-remielle-combined",
      (record) => {
        record.upstream.request.combatBuffs.runtimeInputs[
          "remielle_dan.additional.fragrant_invitation"
        ]!.effects.remielle_dan_additional_atk_two_anomaly!.sourceValue =
          record.upstream.result.outOfCombat.panel.atk!
      },
    ],
    [
      "source skill level",
      "soldier-remielle-combined",
      (record) => {
        record.upstream.request.combatBuffs.runtimeInputs[
          "remielle_dan.special.timeflow_hymn"
        ]!.effects.remielle_dan_special_team_dmg!.sourceValue = 11
      },
    ],
    [
      "source critical rate unit",
      "soldier-roxy-core-non-wind",
      (record) => {
        record.upstream.request.combatBuffs.runtimeInputs[
          "roxy.core_crit_damage"
        ]!.effects.roxy_core_crit_dmg!.sourceValue = 0.5
      },
    ],
    [
      "anomaly actor count",
      "soldier-remielle-combined",
      (record) => {
        record.upstream.request.combatBuffs.runtimeInputs[
          "remielle_dan.additional.fragrant_invitation"
        ]!.parameters!.anomalyAgentCount = 3
      },
    ],
    [
      "imbuement coverage",
      "soldier-roxy-additional",
      (record) => {
        record.upstream.request.combatBuffs.runtimeInputs[
          "roxy.additional_ability"
        ]!.effects.roxy_additional_imbuement!.coverage = 1
      },
    ],
    [
      "target defense",
      "soldier-self-off",
      (record) => {
        record.upstream.request.damage.target.defense += 1000
      },
    ],
    [
      "target stunned state",
      "soldier-self-off",
      (record) => {
        record.upstream.request.damage.events[0]!.stunned = false
      },
    ],
    [
      "target stun multiplier",
      "soldier-self-off",
      (record) => {
        record.upstream.request.damage.target.stunMultiplierPercent = 100
      },
    ],
    [
      "event kind",
      "soldier-self-off",
      (record) => {
        record.upstream.request.damage.events[0]!.kind = "sharp"
      },
    ],
    [
      "event count",
      "soldier-self-off",
      (record) => {
        record.upstream.request.damage.events[0]!.count = 2
      },
    ],
  ] satisfies [string, string, (record: ReferenceCase) => void][])(
    "rejects %s native request mismatch",
    (_name, scenarioId, mutate) => {
      const changed = structuredClone(reference)
      const record = changed.cases.find(
        (candidate) => candidate.id === scenarioId,
      )!
      mutate(record)
      expect(() => validateReference(changed)).toThrow()
    },
  )
  it.each([
    "empty",
    "missing-sample",
    "duplicate-sample",
    "non-finite",
    "unknown-metric",
    "missing-branch",
    "unmarked-difference",
  ] as const)("rejects %s reference corruption", (corruption) => {
    const changed = structuredClone(reference),
      record = changed.cases[0]!
    if (corruption === "empty") record.comparison.equalMetrics = []
    if (corruption === "missing-sample") changed.cases.pop()
    if (corruption === "duplicate-sample") changed.cases.push(record)
    if (corruption === "non-finite")
      record.comparison.knownDifferences[0]!.fairy = Number.NaN
    if (corruption === "unknown-metric")
      record.comparison.equalMetrics[0] = "unknown"
    if (corruption === "missing-branch")
      delete record.upstream.result.damage.events[0]!.damageVariants.nonCrit
    if (corruption === "unmarked-difference")
      record.comparison.knownDifferences.pop()
    expect(() => validateReference(changed)).toThrow()
  })
})

for (const record of reference.cases) {
  const scenario = scenarios.find((s) => s.id === record.id)!
  it(`${record.id}: common readouts (${record.comparison.equalMetrics.length})`, async () => {
    const { input, result } = await calculateCase(scenario)
    const actual = fairyReadouts(record, input, result),
      expected = upstreamReadouts(record)
    expect(Object.keys(actual).toSorted()).toEqual(
      Object.keys(expected).toSorted(),
    )
    expect(result.segments).toHaveLength(1)
    for (const metric of record.comparison.equalMetrics)
      close(actual[metric], expected[metric]!, metric)
    if (scenario.actor === "yixuan")
      expect(
        result.segments[0]!.damage.factors.nonCritical.defense,
      ).toBeUndefined()
  })
  it(`${record.id}: explained native differences (${record.comparison.knownDifferences.length})`, async () => {
    const { input, result } = await calculateCase(scenario)
    const actual = fairyReadouts(record, input, result)
    for (const difference of record.comparison.knownDifferences) {
      close(
        difference.fairy,
        explainedValue(record, difference.metric),
        `${difference.metric} causal proof`,
      )
      close(actual[difference.metric], difference.fairy, difference.metric)
      expect(
        Math.abs(actual[difference.metric]! - difference.upstream),
        difference.metric,
      ).toBeGreaterThan(tolerance(difference.upstream))
    }
    for (const id of scenario.team) {
      if (!builds[id].upstreamAgentId) continue
      const source = reference.sourceValues[id]!,
        build = builds[id]
      const agent = input.data.agents.find(
        (a) => a.attributes.entityId === build.actor.agentEntityId,
      )!.attributes
      const engine = input.data.wEngines.find(
        (e) => e.entityId === build.actor.wEngine!.entityId,
      )!
      for (const stat of [
        "health",
        "attack",
        "defense",
        "energyRegen",
      ] as const)
        close(
          agent.baseAttributes[stat]!.value,
          source.fairy[stat],
          `${id} source ${stat}`,
        )
      expect(engine.baseAttribute.attribute).toBe(source.fairy.wEngineAttribute)
      close(
        engine.baseAttribute.value,
        source.fairy.wEngineValue,
        `${id} source engine`,
      )
      const native = upstreamPanel(record, id)
      for (const stat of ["health", "attack", "defense"] as const)
        close(
          native.baseBreakdown.agent[statMap[stat]],
          source.upstream[stat],
          `${id} native source ${stat}`,
        )
    }
  })
  it(`${record.id}: equipment and its returned panel do not add equipment twice`, async () => {
    const { input, result } = await calculateCase(scenario)
    const actors: StaticActorConfiguration[] = input.actors.map((actor) => {
      const panel = result.panels.find(
        (candidate) => candidate.entityId === actor.entityId,
      )!
      return {
        ...actor,
        panel: {
          mode: "out-of-combat",
          stats: panel.stats,
          penetrationValue: panel.penetrationValue,
          damageBonuses: {
            [actions[scenario.actor].element]: 0,
            ...panel.damageBonuses,
          },
        },
      }
    })
    const settled = calculate({ ...input, actors })
    for (const key of ["nonCritical", "critical", "expected"] as const)
      close(settled.totals[key], result.totals[key]!, key)
    close(
      settled.segments[0]!.damage.evaluation.hit!.damageItems[0]!.finalStat,
      result.segments[0]!.damage.evaluation.hit!.damageItems[0]!.finalStat,
      "final scaling stat",
    )
  })
}

describe("explicit buff switches and source reads", () => {
  it.each(["soldier", "yixuan", "claret"] as const)(
    "%s self buffs change the intended quantities",
    async (actor) => {
      const off = await calculateCase(
        scenarios.find((s) => s.id === `${actor}-self-off`)!,
      )
      const on = await calculateCase(
        scenarios.find((s) => s.id === `${actor}-self-on`)!,
      )
      const base = off.result.segments[0]!.damage,
        buffed = on.result.segments[0]!.damage
      expect(on.result.panels).toEqual(off.result.panels)
      expect(on.result.totals.expected).toBeGreaterThan(
        off.result.totals.expected,
      )
      if (actor === "soldier") {
        close(
          buffed.evaluation.hit!.damageItems[0]!.finalStat,
          base.evaluation.hit!.damageItems[0]!.finalStat * 1.104,
          "R3 Brimstone two stacks",
        )
        close(
          buffed.factors.nonCritical.damageBonus! -
            base.factors.nonCritical.damageBonus!,
          0.7 + 0.03 * 4,
          "core + four M2 stacks",
        )
      } else if (actor === "yixuan") {
        close(
          buffed.evaluation.hit!.damageItems[0]!.finalStat,
          base.evaluation.hit!.damageItems[0]!.finalStat,
          "unchanged sheer force",
        )
        close(
          buffed.evaluation.hit!.criticalRate -
            base.evaluation.hit!.criticalRate,
          0.2,
          "R1 crit",
        )
        close(
          buffed.factors.nonCritical.damageBonus! -
            base.factors.nonCritical.damageBonus!,
          0.6 + 0.08 * 2,
          "core + two ether stacks",
        )
        close(
          buffed.factors.nonCritical.sheerDamageBonus,
          1.2,
          "two sheer stacks",
        )
      } else {
        close(
          buffed.evaluation.hit!.criticalRate -
            base.evaluation.hit!.criticalRate,
          0.275,
          "R2 crit",
        )
        close(
          buffed.factors.nonCritical.damageBonus! -
            base.factors.nonCritical.damageBonus!,
          0.175 + 0.2,
          "R2 electric + M4",
        )
        close(buffed.factors.nonCritical.sharpenDamageBonus, 1.115, "R2 sharp")
      }
    },
  )
  it.each(["soldier", "yixuan"] as const)(
    "%s receives Remielle's own initial ATK and effective special level",
    async (actor) => {
      const off = await calculateCase(
        scenarios.find((s) => s.id === `${actor}-remielle-off`)!,
      )
      const special = await calculateCase(
        scenarios.find((s) => s.id === `${actor}-remielle-special`)!,
      )
      const attack = await calculateCase(
        scenarios.find((s) => s.id === `${actor}-remielle-attack`)!,
      )
      const combined = await calculateCase(
        scenarios.find((s) => s.id === `${actor}-remielle-combined`)!,
      )
      const source = off.result.panels.find(
        (p) => p.entityId === builds.remielle.actor.entityId,
      )!.stats.attack!.value
      const base = off.result.segments[0]!.damage
      for (const selected of [special, combined])
        close(
          selected.result.segments[0]!.damage.factors.nonCritical.damageBonus! -
            base.factors.nonCritical.damageBonus!,
          0.015 * 12,
          "special level 12",
        )
      for (const selected of [attack, combined]) {
        close(
          selected.result.segments[0]!.damage.evaluation.hit!.damageItems[0]!
            .finalStat - base.evaluation.hit!.damageItems[0]!.finalStat,
          source * 0.12 * (actor === "yixuan" ? 0.3 : 1),
          "two-anomaly attack share and conversion",
        )
        const read = selected.input.inputs!.find(
          (input) => input.value.unit === "attack-points",
        )!
        expect(read.bindingId).toBe(
          staticSourceBindingId("entity:remielle", "agent", "1581"),
        )
        close(
          read.value.value,
          source,
          "Fairy-derived source, never upstream panel",
        )
      }
      expect(combined.result.panels).toEqual(off.result.panels)
    },
  )
  it.each(["soldier", "yixuan", "claret"] as const)(
    "%s Roxy states add 0.3 + 0.3 stun and 0.15 resistance reduction",
    async (actor) => {
      for (const [state, stun, resistance] of [
        ["off", 1.5, 0.8],
        ["m1", 1.5, 0.95],
        ["m2", 1.8, 0.8],
        ["additional", 1.8, 0.8],
        ["combined", 2.1, 0.95],
      ] as const) {
        const { input, result } = await calculateCase(
          scenarios.find((s) => s.id === `${actor}-roxy-${state}`)!,
        )
        close(
          result.segments[0]!.damage.factors.nonCritical.stunDamage,
          stun,
          state,
        )
        close(
          result.segments[0]!.damage.factors.nonCritical.resistance,
          resistance,
          state,
        )
        if (state === "combined") {
          const recovered = calculate({
            ...input,
            target: {
              ...input.target,
              isStunned: false,
              baseStunDamageMultiplier: 1,
            },
          })
          close(
            recovered.segments[0]!.damage.factors.nonCritical.stunDamage,
            1,
            "not stunned",
          )
        }
      }
    },
  )
})

describe("sharp branches retain their native semantics", () => {
  it.each(
    reference.cases.filter((record) => record.scenario.actor === "claret"),
  )(
    "$id: one sharp crit, double sharp crit, and forced first layer",
    async (record) => {
      const { result } = await calculateCase(
        scenarios.find((s) => s.id === record.id)!,
      )
      const damage = result.segments[0]!.damage,
        native = record.upstream.result.damage
      const variants = native.events[0]!.damageVariants,
        sharp = native.multipliers.lacerationDmg!
      close(
        variants.sharpCrit!.finalDamage,
        variants.nonCrit!.finalDamage * (1 + sharp),
        "upstream one-layer branch",
      )
      close(
        variants.lacerationCrit!.finalDamage,
        variants.nonCrit!.finalDamage * (1 + sharp) ** 2,
        "upstream two-layer branch",
      )
      expect(damage.criticalSemantics).toBe("sharp-critical-forced-first-layer")
      const sourceSharp = result.panels[0]!.stats.sharpCriticalDamage!.value
      const forced =
        (1 + sourceSharp) *
        (1 + (damage.evaluation.hit!.criticalRate - 1) * sourceSharp)
      close(
        damage.critical,
        damage.nonCritical * forced,
        "Fairy forced first / expected second layer",
      )
      close(
        record.fairyNative.totals.critical,
        damage.critical!,
        "frozen native Fairy branch",
      )
      expect(
        Math.abs(
          damage.critical! / damage.nonCritical -
            variants.sharpCrit!.critMultiplier,
        ),
      ).toBeGreaterThan(1)
      expect(
        Math.abs(
          damage.critical! / damage.nonCritical -
            variants.lacerationCrit!.critMultiplier,
        ),
      ).toBeGreaterThan(0.1)
    },
  )
  it("settles Claret's initial conversion once with equipment or a settled panel, including legacy selections", async () => {
    const { input, result } = await calculateCase(
      scenarios.find((scenario) => scenario.id === "claret-self-off")!,
    )
    const panel = result.panels[0]!
    const conversionEffect =
      "agent:1611:zzz-hp:eff-mtskqyss-1toefw:blk-mtrf598z-wr4jqt:mindscape:0"
    expect(
      input.selections.some(
        (selection) => selection.optionId === options.claretConversion,
      ),
    ).toBe(false)
    expect(input.inputs).toEqual([])
    close(panel.stats.criticalDamage!.value, 1.7, "initial critical damage")
    close(
      panel.stats.criticalRate!.value,
      1.325,
      "settled initial critical rate",
    )
    const settledStats: StaticPanelValues = {
      ...panel.stats,
      criticalRate: { unit: "ratio", value: 1.325 },
    }
    for (const legacy of [false, true]) {
      const compatible: StaticActionCalculationInput = legacy
        ? {
            ...input,
            selections: [
              ...input.selections,
              {
                holderId: builds.claret.actor.entityId,
                optionId: options.claretConversion,
                layers: 1,
              },
            ],
            inputs: [
              {
                bindingId: staticSourceBindingId(
                  builds.claret.actor.entityId,
                  "agent",
                  builds.claret.actor.agentEntityId,
                ),
                name: `${conversionEffect}:source`,
                value: { unit: "ratio", value: 1.7 },
              },
            ],
          }
        : input
      const equipment = calculate(compatible)
      const settled = calculate({
        ...compatible,
        actors: [
          {
            ...compatible.actors[0]!,
            panel: {
              mode: "out-of-combat",
              stats: settledStats,
              penetrationValue: panel.penetrationValue,
              damageBonuses: panel.damageBonuses,
            },
          },
        ],
      })
      const conversions = equipment.panels[0]!.contributions.filter(
        (contribution) => contribution.origin.effectId === conversionEffect,
      )
      expect(conversions).toHaveLength(1)
      close(
        conversions[0]!.value.value,
        0.595,
        "initial CD 1.7 converts at 35%",
      )
      close(
        equipment.panels[0]!.stats.criticalRate!.value -
          conversions[0]!.value.value,
        0.73,
        "raw equipment critical rate",
      )
      expect(
        settled.panels[0]!.contributions.filter(
          (contribution) => contribution.origin.effectId === conversionEffect,
        ),
      ).toHaveLength(0)
      for (const actual of [equipment, settled]) {
        close(
          actual.panels[0]!.stats.criticalRate!.value,
          1.325,
          "initial conversion included once",
        )
        close(
          actual.segments[0]!.damage.evaluation.hit!.criticalRate,
          1.625,
          "conditional core adds 0.3 at the hit",
        )
        expect(
          actual.segments[0]!.damage.evaluation.contributions.filter(
            (contribution) => contribution.origin.effectId === conversionEffect,
          ),
        ).toHaveLength(0)
        for (const branch of ["nonCritical", "critical", "expected"] as const)
          close(
            actual.totals[branch],
            result.totals[branch]!,
            `same ${branch} damage with legacy=${legacy}`,
          )
      }
    }
  })
})

describe("reject invalid equipment and source identities", () => {
  it.each([
    "wrong-holder",
    "wrong-input-binding",
    "missing-special-level-read",
    "mutually-exclusive-tier",
    "unknown-set",
    "illegal-main",
    "negative-rolls",
    "wrong-action-agent",
    "missing-engine",
    "locked-mindscape",
  ] as const)("rejects %s", async (kind) => {
    const scenario = scenarios.find(
      (s) =>
        s.id ===
        (kind === "locked-mindscape"
          ? "soldier-roxy-m2"
          : "soldier-remielle-combined"),
    )!
    const { input } = await calculateCase(scenario)
    let changed: StaticActionCalculationInput = structuredClone(input)
    if (kind === "wrong-holder")
      changed = {
        ...changed,
        selections: changed.selections.map((selection) => ({
          ...selection,
          holderId: "entity:soldier",
        })),
      }
    if (kind === "wrong-input-binding")
      changed = {
        ...changed,
        inputs: changed.inputs!.map((boundInput) => ({
          ...boundInput,
          bindingId: staticSourceBindingId("entity:soldier", "agent", "1041"),
        })),
      }
    if (kind === "missing-special-level-read")
      changed = {
        ...changed,
        inputs: changed.inputs!.filter(
          (boundInput) => boundInput.value.unit !== "count",
        ),
      }
    if (kind === "mutually-exclusive-tier")
      changed = {
        ...changed,
        selections: [
          ...changed.selections,
          {
            holderId: "entity:remielle",
            optionId:
              "agents:remiel:mindscape:0:blk-ms7td2gs-rk1vtd:eff-ms7td2gs-4vbpdh",
            layers: 1,
          },
        ],
      }
    if (kind === "wrong-action-agent")
      changed = { ...changed, actorId: "entity:alice" }
    if (kind === "locked-mindscape")
      changed = {
        ...changed,
        actors: changed.actors.map((actor) =>
          actor.entityId === "entity:roxy"
            ? { ...actor, mindscapeRank: 0 }
            : actor,
        ),
      }
    if (
      [
        "unknown-set",
        "illegal-main",
        "negative-rolls",
        "missing-engine",
      ].includes(kind)
    )
      changed = {
        ...changed,
        actors: changed.actors.map((actor, index) =>
          index !== 0
            ? actor
            : {
                ...actor,
                ...(kind === "missing-engine"
                  ? {
                      wEngine: {
                        entityId: "unknown-engine",
                        refinement: 1 as const,
                        eligible: true,
                      },
                    }
                  : {}),
                driveDiscs: {
                  ...actor.driveDiscs,
                  4: {
                    ...actor.driveDiscs[4]!,
                    ...(kind === "unknown-set"
                      ? { setEntityId: "unknown-set" }
                      : {}),
                    ...(kind === "illegal-main"
                      ? {
                          mainStat: {
                            attribute: "damageBonus" as const,
                            element: "fire" as const,
                          },
                        }
                      : {}),
                    ...(kind === "negative-rolls"
                      ? {
                          substats: [
                            {
                              attribute: "attack" as const,
                              operation: "initial-fixed" as const,
                              rolls: -1,
                            },
                          ],
                        }
                      : {}),
                  },
                },
              },
        ),
      }
    const rejected = calculateStaticActionDamage(changed)
    expect(rejected.ok, kind).toBe(false)
    if (!rejected.ok) {
      expect(rejected.issues.length).toBeGreaterThan(0)
      expect(
        rejected.issues.every(
          (issue) => issue.code && issue.pointer && issue.message,
        ),
      ).toBe(true)
      if (kind === "mutually-exclusive-tier")
        expect(
          rejected.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes("Conflicting exclusive option"),
          ),
        ).toBe(true)
      if (kind === "wrong-holder" || kind === "wrong-action-agent")
        expect(
          rejected.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
        ).toBe(true)
      if (
        kind === "wrong-input-binding" ||
        kind === "missing-special-level-read"
      )
        expect(
          rejected.issues.some((issue) => issue.code === "MISSING_FACT"),
        ).toBe(true)
    }
  })
})

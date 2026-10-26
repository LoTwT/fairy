import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { calculationDataVersion } from "../src/index.ts"
import {
  calculateDefenseLevelBase,
  calculateStaticDamageFromCatalog,
} from "../../core/src/index.ts"
import type {
  StaticCatalogDamageInput,
  StaticDamageResult,
} from "../../core/src/index.ts"
import {
  actors,
  equipmentFor,
  fairyBase,
  fairyInputFor,
  historicalSelfScenarios,
  inputFacts,
  nativeFairyRequest,
  options,
  savedSource,
  scenarios,
  snapshotRequestFor,
  target,
  upstreamCommit,
  upstreamInputFor,
} from "./fixtures/zzz-calculator-abloom-cases.ts"
import type {
  AbloomScenario,
  NativeSnapshot,
} from "./fixtures/zzz-calculator-abloom-cases.ts"

interface NativeEvent {
  id: string
  finalDamage: number
  input: {
    settlementType: string
    anomalyEffect: string
    count: number
    procCount: number
    triggerActorRef?: { agentId: string; profileId: string }
    anomalySource?: { actorRef: { agentId: string }; snapshot?: NativeSnapshot }
    target: { levelCoefficient: number }
  }
  panelSnapshot: {
    atk: number
    anomalyProficiency: number
    penRatio: number
    penFlat: number
    sourceAgentId?: string
    sourceSnapshot?: NativeSnapshot | null
  }
  multipliers: {
    atk: number
    anomaly: number
    anomalyProficiency: number
    anomalyLevel: number
    dmg: number
    defense: number
    resistance: number
    stun: number
    anomalyDamage: number
    originalAnomalyBaseMultiplier?: number
    releaseScale?: number
    releaseProficiencyYieldFactor?: number
  }
  critInfo: {
    available: boolean
    critRate: number
    critDmg: number
    baseCritRate: number
    convertedCritRate: number
    effectiveMode: string
  }
  damageVariants?: Record<
    "nonCrit" | "crit" | "expected",
    { finalDamage: number }
  >
  targetBreakdown: {
    levelCoefficient: number
    penRatio: number
    penFlat: number
    effectiveDefense: number
    resIgnore: number
    enemyDefReduction: number
  }
}
interface NativeResult {
  outOfCombat: { panel: Record<string, number> }
  inCombat: {
    panel: Record<string, number>
    buffTotals: { damageModifiers: { id: string; value: number }[] }
  }
  damage: { events: NativeEvent[]; totalFinalDamage: number }
}
interface FrozenRecord {
  id: string
  scenario: AbloomScenario
  inputLevel: string
  lineage: { test: string; sample: string; variation: string }
  upstream: {
    entrypoint: string
    catalogCommit: string
    request: ReturnType<typeof upstreamInputFor>
    result: NativeResult
    snapshotCall: null | {
      entrypoint: string
      request: ReturnType<typeof snapshotRequestFor>
      result: NativeSnapshot
    }
  }
  fairy: {
    entrypoint: string
    dataVersion: typeof calculationDataVersion
    equipmentId: string
    request: ReturnType<typeof nativeFairyRequest>
    result: { ok: true; value: StaticDamageResult }
  }
}
interface Boundary {
  id: string
  baseId: string
  kind: string
  entrypoint: string
  request: ReturnType<typeof upstreamInputFor>
  result:
    | { ok: true; value: NativeResult }
    | { ok: false; error: { name: string; message: string } }
}
interface Evidence {
  system: string
  file: string
  pointer: string
  value: unknown
}
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/zzz-calculator-abloom-reference.json", import.meta.url),
    "utf8",
  ),
) as {
  schemaVersion: number
  upstream: {
    repository: string
    commit: string
    files: { file: string; sha256: string }[]
  }
  fairy: {
    base: string
    dataVersion: typeof calculationDataVersion
    files: { file: string; sha256: string }[]
  }
  inputFacts: typeof inputFacts
  actors: typeof actors
  options: typeof options
  target: typeof target
  evidence: Evidence[]
  codeEvidence: { file: string; first: number; last: number; text: string }[]
  equipment: Record<
    string,
    {
      entrypoint: string
      dataVersion: typeof calculationDataVersion
      request: unknown
      result: unknown
    }
  >
  records: FrozenRecord[]
  historicalSelf: FrozenRecord[]
  upstreamBoundaries: Boundary[]
  coverageGaps: string[]
  fairyCorrections: {
    preservedNativeSha256: string
    previousComparison: {
      common: number
      differences: number
      equalDamage: number
      multiplierDifferences: number
    }
    records: {
      id: string
      initialAM: number
      before: {
        multiplier: number
        nonCritical: number
        critical: number
        expected: number
      }
      after: {
        multiplier: number
        nonCritical: number
        critical: number
        expected: number
      }
    }[]
  }[]
}

const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
function close(actual: number, expected: number, label = "reading") {
  expect(Number.isFinite(actual), `${label}: actual`).toBe(true)
  expect(Number.isFinite(expected), `${label}: expected`).toBe(true)
  expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(
    1e-8 * Math.max(1, Math.abs(expected)),
  )
}
function recordFor(id: string) {
  const record = [...reference.records, ...reference.historicalSelf].find(
    (entry) => entry.id === id,
  )
  if (!record) throw new Error(`Missing native record: ${id}`)
  return record
}
function nativeEvent(record: FrozenRecord): NativeEvent {
  expect(record.upstream.result.damage.events).toHaveLength(1)
  return record.upstream.result.damage.events[0]!
}
function calculate(input: StaticCatalogDamageInput) {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}
const currentRuns = new Map<
  string,
  Promise<{ input: StaticCatalogDamageInput; result: StaticDamageResult }>
>()
function run(scenario: AbloomScenario) {
  if (!currentRuns.has(scenario.id))
    currentRuns.set(
      scenario.id,
      (async () => {
        const input = await fairyInputFor(scenario)
        return { input, result: calculate(input) }
      })(),
    )
  return currentRuns.get(scenario.id)!
}

/** Link authored scenario -> native snapshot call -> native damage request -> returned event. */
function assertNativeLink(record: FrozenRecord, scenario: AbloomScenario) {
  expect(record.scenario).toEqual(scenario)
  expect(record.id).toBe(scenario.id)
  expect(record.lineage).toMatchObject({
    test: `tests/${scenario.trigger}-damage.test.js`,
    variation: scenario.id,
  })
  expect(record.lineage.sample.length).toBeGreaterThan(0)
  expect(record.inputLevel).toBe(
    scenario.source
      ? "independent-trigger-equipment + external-resolved-source-snapshot"
      : "independent-equipment + explicit-event",
  )
  expect(record.upstream.entrypoint).toBe("calculateInCombatPanel")
  expect(record.upstream.catalogCommit).toBe(upstreamCommit)
  const snapshotCall = record.upstream.snapshotCall
  if (scenario.source) {
    expect(snapshotCall).not.toBeNull()
    const request = snapshotRequestFor(scenario.source)
    expect(snapshotCall!.entrypoint).toBe("createAnomalySourceSnapshot")
    expect(snapshotCall!.request).toEqual(request)
    const { inCombatPanel, ...rest } = request
    expect(snapshotCall!.result).toEqual({
      ...rest,
      schemaVersion: 1,
      panel: inCombatPanel,
    })
  } else expect(snapshotCall).toBeNull()
  expect(record.upstream.request).toEqual(
    upstreamInputFor(scenario, snapshotCall?.result),
  )
  const event = nativeEvent(record)
  expect(event.id).toBe(scenario.id)
  expect(event.input).toMatchObject({
    settlementType: scenario.event,
    anomalyEffect: "corruption",
    count: 1,
    procCount: 1,
  })
  expect(event.finalDamage).toBeGreaterThan(0)
  close(record.upstream.result.damage.totalFinalDamage, event.finalDamage)
  if (scenario.event === "release") {
    expect(event.input.triggerActorRef).toEqual({
      agentId: scenario.trigger,
      profileId: "core_passive",
    })
    expect(event.panelSnapshot.sourceAgentId).toBe(
      scenario.source?.actor ?? scenario.trigger,
    )
    expect(event.panelSnapshot.sourceSnapshot).toEqual(
      scenario.source?.actor !== scenario.trigger && scenario.source
        ? snapshotCall!.result
        : null,
    )
    close(event.multipliers.originalAnomalyBaseMultiplier!, 0.625)
  }
  if (event.critInfo.available) {
    expect(Object.keys(event.damageVariants!).toSorted()).toEqual([
      "crit",
      "expected",
      "nonCrit",
    ])
    expect(event.damageVariants!.crit.finalDamage).toBeGreaterThan(
      event.damageVariants!.nonCrit.finalDamage,
    )
    close(event.damageVariants!.expected.finalDamage, event.finalDamage)
  } else {
    expect(event.damageVariants).toBeUndefined()
    expect(event.critInfo.critRate).toBe(0)
    expect(event.critInfo.critDmg).toBe(0)
  }
}

function upstreamReadings(record: FrozenRecord) {
  const result = record.upstream.result
  const event = nativeEvent(record),
    m = event.multipliers
  return {
    equipmentAttack: result.outOfCombat.panel["atk"]!,
    equipmentProficiency: result.outOfCombat.panel["anomalyProficiency"]!,
    equipmentMastery: result.outOfCombat.panel["anomalyMastery"]!,
    attack: m.atk,
    proficiency: m.anomalyProficiency,
    penetration: event.targetBreakdown.penRatio,
    multiplier: m.anomaly,
    damageBonus: m.dmg,
    defense: m.defense,
    resistance: m.resistance,
    stun: m.stun,
    level: m.anomalyLevel,
    anomalyBonus: m.anomalyDamage,
    criticalRate: event.critInfo.critRate,
    criticalDamage: event.critInfo.critDmg,
    nonCritical: event.critInfo.available
      ? event.damageVariants!.nonCrit.finalDamage
      : event.finalDamage,
    critical: event.critInfo.available
      ? event.damageVariants!.crit.finalDamage
      : event.finalDamage,
    expected: event.finalDamage,
  }
}
type Readings = ReturnType<typeof upstreamReadings>
async function fairyReadings(
  scenario: AbloomScenario,
  result: StaticDamageResult,
): Promise<Readings> {
  const panel = (await equipmentFor(scenario)).panel
  const factors = result.factors.nonCritical
  const sourceId = `entity:${scenario.source?.actor ?? scenario.trigger}`
  const penetration = result.evaluation.attributes.find(
    (entry) =>
      entry.entityId === sourceId &&
      entry.snapshotId === scenario.source?.snapshotId &&
      entry.stat === "penetrationRatio",
  )
  expect(penetration, "explicit penetration owner").toBeDefined()
  expect(result.evaluation.hit!.damageItems).toHaveLength(1)
  expect(result.critical).not.toBeNull()
  return {
    equipmentAttack: panel.stats.attack!.value,
    equipmentProficiency: panel.stats.anomalyProficiency!.value,
    equipmentMastery: panel.stats.anomalyMastery!.value,
    attack: result.evaluation.hit!.damageItems[0]!.finalStat,
    proficiency: factors["anomalyProficiency"]!,
    penetration: penetration!.value.value,
    multiplier: result.evaluation.hit!.damageItems[0]!.damageMultiplier,
    damageBonus: factors["damageBonus"]!,
    defense: factors["defense"]!,
    resistance: factors["resistance"]!,
    stun: factors["stunDamage"]!,
    level: factors["anomalyDamageLevel"]!,
    anomalyBonus: factors["anomalyDamageBonus"]!,
    criticalRate: result.criticalRate,
    criticalDamage: result.factors.critical!["anomalyCritical"]! - 1,
    nonCritical: result.nonCritical,
    critical: result.critical!,
    expected: result.expected,
  }
}

// Proofs of retained native differences, not adjusted inputs or an alternative damage calculator.
function explainedFairyReadings(record: FrozenRecord): Readings {
  const scenario = record.scenario,
    u = upstreamReadings(record)
  const attackDifference =
    scenario.trigger === "vivian"
      ? 805.6952 - 805 + (713.76 - 713)
      : 788.4528 - 788 + (713.76 - 713)
  const sourceAttackDifference = scenario.source ? 0 : attackDifference
  const defenseLevelBase = calculateDefenseLevelBase(
    scenario.source?.level ?? 60,
  )
  const { effectiveDefense, levelCoefficient } =
    nativeEvent(record).targetBreakdown
  const defenseRatio =
    defenseLevelBase /
    (defenseLevelBase + effectiveDefense) /
    (levelCoefficient / (levelCoefficient + effectiveDefense))
  const flooredEquipmentMastery = Math.floor(u.equipmentMastery)
  // 3.2.5 起异常掌控在读取层取整，原先由小数掌控产生的暴击率差消失。
  const rateDifference = 0
  const masteryRatio =
    scenario.trigger === "aria" && scenario.event === "release"
      ? flooredEquipmentMastery / u.equipmentMastery
      : 1
  // Revision 55 narrows Vivian M0 to [侵蚀] (ordinary ether anomaly); the
  // upstream broad anomalyDamage modifier must not apply to explicit release.
  const vivianReleaseOrdinaryCorrection =
    scenario.trigger === "vivian" &&
    scenario.event === "release" &&
    scenario.ordinaryBonus === true
  const damageRatio =
    ((u.attack + sourceAttackDifference) / u.attack) *
    defenseRatio *
    masteryRatio *
    (vivianReleaseOrdinaryCorrection ? 1 / 1.12 : 1)
  return {
    ...u,
    equipmentAttack: u.equipmentAttack + attackDifference,
    equipmentMastery: flooredEquipmentMastery,
    attack: u.attack + sourceAttackDifference,
    anomalyBonus: vivianReleaseOrdinaryCorrection ? 1 : u.anomalyBonus,
    multiplier: u.multiplier * masteryRatio,
    defense: u.defense * defenseRatio,
    criticalRate: u.criticalRate + rateDifference,
    nonCritical: u.nonCritical * damageRatio,
    critical: u.critical * damageRatio,
    expected:
      (u.expected *
        damageRatio *
        (1 + (u.criticalRate + rateDifference) * u.criticalDamage)) /
      (1 + u.criticalRate * u.criticalDamage),
  }
}
function isDifferent(a: number, b: number) {
  return Math.abs(a - b) > 1e-8 * Math.max(1, Math.abs(b))
}

function contributionValues(
  input: StaticCatalogDamageInput,
  result: StaticDamageResult,
  key: keyof typeof options,
) {
  const option = input.catalog.options.find(
    (entry) => entry.optionId === options[key],
  )!
  expect(option, key).toBeDefined()
  const effects = option.variants.flatMap((variant) => variant.effectIds)
  return result.evaluation.contributions.filter((entry) =>
    effects.includes(entry.origin.effectId),
  )
}

function assertFairyLink(
  record: FrozenRecord,
  input: StaticCatalogDamageInput,
) {
  expect(record.fairy.entrypoint).toBe("calculateStaticDamageFromCatalog")
  expect(record.fairy.dataVersion).toEqual(calculationDataVersion)
  expect(nativeFairyRequest(input)).toEqual(record.fairy.request)
}

describe("ZZZ Calculator explicit abloom / historical source comparison", () => {
  it("preserves every historical native result and records the independently recomputed precision correction", () => {
    const correction = reference.fairyCorrections[0]!
    expect(
      createHash("sha256")
        .update(
          JSON.stringify([
            reference.upstream,
            reference.records.map((record) => record.upstream),
            reference.historicalSelf.map((record) => record.upstream),
            reference.upstreamBoundaries,
          ]),
        )
        .digest("hex"),
    ).toBe(correction.preservedNativeSha256)
    expect(correction.previousComparison).toEqual({
      common: 538,
      differences: 164,
      equalDamage: 10,
      multiplierDifferences: 16,
    })
    expect(correction.records).toHaveLength(17)
    for (const row of correction.records) {
      const record = recordFor(row.id)
      const result = record.fairy.result.value
      const flooredInitialAM = Math.floor(row.initialAM)
      const multiplier =
        (27.5 / 100 / 10) *
        0.625 *
        flooredInitialAM *
        (record.scenario.stunned ? 1.5 : 1)
      close(row.after.multiplier, multiplier)
      close(
        row.before.multiplier,
        row.initialAM * 0.01719 * (record.scenario.stunned ? 1.5 : 1),
      )
      close(
        result.evaluation.hit!.damageItems[0]!.damageMultiplier,
        row.after.multiplier,
      )
      for (const field of ["nonCritical", "critical"] as const) {
        close(
          row.after[field],
          (row.before[field] *
            ((27.5 / 100 / 10) * 0.625) *
            (flooredInitialAM / row.initialAM)) /
            0.01719,
        )
        close(result[field]!, row.after[field])
      }
      // expected 同时受暴击率变化影响；读取取整后的掌控后不能沿用非暴击倍率直接缩放。
      const criticalDamage = result.factors.critical!.anomalyCritical - 1
      close(
        row.after.expected,
        row.after.nonCritical * (1 + result.criticalRate * criticalDamage),
      )
      close(result.expected, row.after.expected)
    }
  })
  it("pins versions, semantic mappings, native provenance and a nonempty exact case inventory", () => {
    expect(reference.schemaVersion).toBe(1)
    expect(reference.upstream.repository).toBe("ZztIsolation/zzz_calculator")
    expect(reference.upstream.commit).toBe(upstreamCommit)
    expect(reference.fairy.base).toBe(fairyBase)
    expect(reference.fairy.dataVersion).toEqual(calculationDataVersion)
    expect(reference.inputFacts).toEqual(inputFacts)
    expect(reference.actors).toEqual(actors)
    expect(reference.options).toEqual(options)
    expect(reference.target).toEqual(target)
    expect(reference.records.map((entry) => entry.id)).toEqual(
      scenarios.map((entry) => entry.id),
    )
    expect(new Set(scenarios.map((entry) => entry.id)).size).toBe(39)
    expect(reference.historicalSelf.map((entry) => entry.id)).toEqual(
      historicalSelfScenarios.map((entry) => entry.id),
    )
    expect(reference.upstreamBoundaries.map((entry) => entry.id)).toEqual([
      ...(["vivian", "aria"] as const).flatMap((trigger) =>
        [
          "missing-source",
          "missing-snapshot",
          "wrong-snapshot-identity",
          "wrong-trigger",
          "missing-attack",
          "missing-proficiency",
          "missing-penetration",
          "missing-level",
        ].map((kind) => `${trigger}-${kind}`),
      ),
      "vivian-ignored-level-coefficient",
      "aria-ignored-level-coefficient",
    ])
    expect(reference.upstream.files).toHaveLength(30)
    expect(
      new Set(reference.upstream.files.map((entry) => entry.file)).size,
    ).toBe(30)
    for (const entry of reference.upstream.files)
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/u)
    for (const file of [
      "tests/vivian-damage.test.js",
      "tests/aria-damage.test.js",
      "core/calculator-core.js",
      "core/anomalyRelease.js",
      "data/agents.json",
      "data/w_engines.json",
    ])
      expect(
        reference.upstream.files.some((entry) => entry.file === file),
      ).toBe(true)
    expect(
      reference.codeEvidence.some((entry) =>
        entry.text.includes("sourceAgentId !== triggerAgentId"),
      ),
    ).toBe(true)
    expect(reference.codeEvidence).toHaveLength(8)
    for (const text of [
      "const DEFAULT_DAMAGE_LEVEL_COEFFICIENT = 794",
      "const levelCoefficient = DEFAULT_DAMAGE_LEVEL_COEFFICIENT",
      "target: normalizeDamageTarget(expandedInput, firstElement)",
    ])
      expect(
        reference.codeEvidence.some(
          (entry) =>
            entry.file === "core/calculator-core.js" &&
            entry.text.includes(text),
        ),
        text,
      ).toBe(true)
    expect(reference.coverageGaps).toHaveLength(6)
  })

  it("checks prepared Fairy artifact hashes and the actual data behind each explained difference", () => {
    expect(reference.fairy.files).toHaveLength(16)
    for (const entry of reference.fairy.files.filter((candidate) =>
      candidate.file.startsWith("packages/data/definitions/"),
    )) {
      const preparedPath = entry.file.replace(
        "/definitions/",
        "/.generated/definitions/",
      )
      const digest = createHash("sha256")
        .update(
          readFileSync(new URL(`../../../${preparedPath}`, import.meta.url)),
        )
        .digest("hex")
      expect(digest, entry.file).toBe(entry.sha256)
    }
    expect(reference.evidence.length).toBeGreaterThan(40)
    for (const evidence of reference.evidence.filter(
      (entry) => entry.system === "fairy",
    )) {
      const path = evidence.file.startsWith("packages/data/definitions/")
        ? evidence.file.replace("/definitions/", "/.generated/definitions/")
        : evidence.file
      let value: unknown = JSON.parse(
        readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"),
      )
      for (const key of evidence.pointer.slice(1).split("/"))
        value = (value as Record<string, unknown>)[key]
      expect(value, `${evidence.file}${evidence.pointer}`).toEqual(
        evidence.value,
      )
    }
    for (const [trigger, attack] of [
      ["vivian", 805.6952],
      ["aria", 788.4528],
    ] as const) {
      expect(
        reference.evidence.find(
          (entry) =>
            entry.file ===
            `packages/data/definitions/attributes/agents/${actors[trigger].agent}.json`,
        )!.value,
      ).toEqual({ unit: "attack-points", value: attack })
    }
    const rules = reference.evidence
      .filter(
        (entry) =>
          entry.file === "packages/data/definitions/effects/static.json",
      )
      .map(
        (entry) =>
          entry.value as {
            effectId: string
            parameters: Record<string, { value: number }>
          },
      )
    expect(
      rules.find((rule) => rule.effectId.includes("eff-ms36k7q1-vqttu0"))!
        .parameters["rate"]!.value,
    ).toBe(0.0171875)
    expect(
      rules.find((rule) => rule.effectId.includes("eff-ms36xf73-q2nimy"))!
        .parameters["rate"]!.value,
    ).toBe(0.005)
    const upstreamAriaCore = reference.evidence.find(
      (entry) =>
        entry.system === "upstream" &&
        entry.pointer.endsWith("/coreSkill") &&
        JSON.stringify(entry.value).includes("控场核心"),
    )!.value as {
      corePassiveScaling: {
        levels: { releaseCoefficientPctByElement: { ether: number } }[]
      }
    }
    expect(
      (upstreamAriaCore.corePassiveScaling.levels[6]!
        .releaseCoefficientPctByElement.ether /
        100 /
        10) *
        0.625,
    ).toBeCloseTo(0.0171875, 15)
    expect(calculateDefenseLevelBase(50)).toBe(592)
    expect(calculateDefenseLevelBase(60)).toBe(794)
  })

  it.each(scenarios)(
    "$id: links both native calls and verifies every reading or its specific difference",
    async (scenario) => {
      const record = recordFor(scenario.id)
      assertNativeLink(record, scenario)
      const { input, result } = await run(scenario)
      assertFairyLink(record, input)
      expect(json({ ok: true, value: result })).toEqual(record.fairy.result)
      const equipment = await equipmentFor(scenario)
      const { data, ...equipmentRequest } = equipment.input
      expect(reference.equipment[record.fairy.equipmentId]).toEqual({
        entrypoint: "calculateStaticActionDamage",
        dataVersion: data.version,
        request: json(equipmentRequest),
        result: json(equipment.result),
      })
      const actual = await fairyReadings(scenario, result),
        native = upstreamReadings(record),
        explained = explainedFairyReadings(record)
      expect(Object.keys(actual)).toHaveLength(18)
      for (const key of Object.keys(actual) as (keyof Readings)[]) {
        close(actual[key], explained[key], `${scenario.id}/${key}`)
        // Every unexplained difference fails; equality is never inferred from a green snapshot.
        if (!isDifferent(explained[key], native[key]))
          close(actual[key], native[key], `common ${key}`)
        else
          expect(
            isDifferent(actual[key], native[key]),
            `retained difference ${key}`,
          ).toBe(true)
      }
      expect(result.expected).toBeGreaterThan(0)
      expect(input.hit.actorId).toBe(`entity:${scenario.trigger}`)
      expect(input.hit.damageItems[0].statSource).toEqual({
        entityId: `entity:${scenario.source?.actor ?? scenario.trigger}`,
        ...(scenario.source ? { snapshotId: scenario.source.snapshotId } : {}),
      })
      expect(result.criticalSemantics).toBe("critical-hit")
      close(
        result.expected,
        result.nonCritical * (1 + result.criticalRate * actual.criticalDamage),
      )
    },
  )

  it("counts common readings separately from explained differences and damage equality", () => {
    let common = 0,
      differences = 0,
      equalDamage = 0
    const byField: Record<string, number> = {}
    for (const record of reference.records) {
      const native = upstreamReadings(record),
        explained = explainedFairyReadings(record)
      for (const key of Object.keys(native) as (keyof Readings)[]) {
        if (isDifferent(explained[key], native[key])) {
          differences++
          byField[key] = (byField[key] ?? 0) + 1
        } else common++
      }
      if (!isDifferent(explained.expected, native.expected)) equalDamage++
    }
    expect({ common, differences, equalDamage }).toEqual({
      common: 518,
      differences: 184,
      equalDamage: 10,
    })
    expect(byField).toEqual({
      anomalyBonus: 2,
      equipmentAttack: 39,
      attack: 17,
      defense: 2,
      equipmentMastery: 21,
      multiplier: 16,
      nonCritical: 29,
      critical: 29,
      expected: 29,
    })
  })

  it.each(["vivian", "aria"] as const)(
    "%s: positive ordinary/release switches, matching conditions, contributions and crit semantics",
    async (trigger) => {
      for (const event of ["release", "attribute"] as const) {
        const get = (ordinary: number, exclusive: number) =>
          scenarios.find(
            (scenario) =>
              scenario.id ===
              `${trigger}-${event}-ordinary-${ordinary}-exclusive-${exclusive}`,
          )!
        const off = await run(get(0, 0)),
          ordinary = await run(get(1, 0)),
          exclusive = await run(get(0, 1)),
          both = await run(get(1, 1))
        const ordinaryKey =
          trigger === "vivian" ? "vivianOrdinary" : "ariaOrdinary"
        expect(
          contributionValues(off.input, off.result, ordinaryKey),
        ).toHaveLength(0)
        const contributions = contributionValues(
          ordinary.input,
          ordinary.result,
          ordinaryKey,
        )
        const nativeModifiers = recordFor(get(1, 0).id).upstream.result.inCombat
          .buffTotals.damageModifiers
        const nativeModifier = nativeModifiers.find(
          (entry) =>
            entry.id ===
            (trigger === "vivian"
              ? "vivian-additional-corruption-damage"
              : "vitality-hit-anomaly-dmg"),
        )
        expect(nativeModifier).toBeDefined()
        if (trigger === "vivian" && event === "release") {
          // Revision 55 narrows Vivian M0 to [侵蚀] (ordinary ether anomaly);
          // the upstream broad modifier must not leak into explicit release.
          expect(contributions).toHaveLength(0)
          close(ordinary.result.expected / off.result.expected, 1)
          close(both.result.expected / exclusive.result.expected, 1)
        } else {
          expect(contributions).toHaveLength(1)
          expect(contributions[0]!.address).toMatchObject({
            kind: "factor",
            channel: "anomaly-damage-bonus",
            entityId: `entity:${trigger}`,
          })
          close(
            contributions[0]!.value.value,
            trigger === "vivian" ? 0.12 : 0.1,
          )
          close(nativeModifier!.value, contributions[0]!.value.value)
          close(
            ordinary.result.expected / off.result.expected,
            trigger === "vivian" ? 1.12 : 1.1,
          )
          close(
            both.result.expected / exclusive.result.expected,
            trigger === "vivian" ? 1.12 : 1.1,
          )
        }
        const exclusiveKey =
          trigger === "vivian" ? "vivianYield" : "ariaCritRate"
        if (event === "attribute") {
          expect(
            contributionValues(exclusive.input, exclusive.result, exclusiveKey),
          ).toHaveLength(0)
          close(exclusive.result.expected, off.result.expected)
          expect(exclusive.result.criticalRate).toBe(0)
          close(exclusive.result.critical!, exclusive.result.nonCritical)
        } else {
          expect(
            contributionValues(exclusive.input, exclusive.result, exclusiveKey),
          ).toHaveLength(1)
          expect(exclusive.result.expected).toBeGreaterThan(off.result.expected)
          if (trigger === "vivian") {
            close(
              exclusive.result.factors.nonCritical["baseDamage"]! /
                off.result.factors.nonCritical["baseDamage"]!,
              1.3,
            )
            close(exclusive.result.factors.nonCritical["resistance"]!, 0.95)
            expect(exclusive.result.criticalRate).toBe(0)
            close(exclusive.result.critical!, exclusive.result.nonCritical)
          } else {
            close(
              contributionValues(
                exclusive.input,
                exclusive.result,
                "ariaCritConversion",
              )[0]!.value.value,
              196 * 0.005,
            )
            close(
              contributionValues(
                exclusive.input,
                exclusive.result,
                "ariaCritOffset",
              )[0]!.value.value,
              -0.5,
            )
            close(exclusive.result.criticalRate, 0.73)
            close(
              exclusive.result.critical! / exclusive.result.nonCritical,
              1.25,
            )
            close(
              nativeEvent(recordFor(get(0, 1).id)).critInfo.convertedCritRate,
              0.48,
            )
          }
        }
        // Ordinary CR79%/CD230% are present, but never become anomaly critical stats.
        close(off.result.evaluation.hit!.criticalRate, 0.79)
        close(
          recordFor(get(0, 0).id).upstream.result.inCombat.panel["critRate"]!,
          0.79,
        )
        expect(off.result.criticalRate).toBe(0)
      }
    },
  )

  it.each(["vivian", "aria"] as const)(
    "%s: reads each changed saved field, preserves ownership, and reads the trigger's own conversion",
    async (trigger) => {
      const baseline = (
        await run(
          scenarios.find((scenario) => scenario.id === `${trigger}-saved`)!,
        )
      ).result
      const get = async (suffix: string) =>
        (
          await run(
            scenarios.find(
              (scenario) => scenario.id === `${trigger}-${suffix}`,
            )!,
          )
        ).result
      close(
        (await get("saved-attack")).nonCritical / baseline.nonCritical,
        2873 / savedSource.attack,
      )
      close(
        (await get("saved-proficiency")).nonCritical / baseline.nonCritical,
        427 / savedSource.proficiency,
      )
      for (const suffix of [
        "penetrationRatio",
        "penetrationValue",
        "level",
      ] as const) {
        const changed = await get(`saved-${suffix}`)
        expect(changed.factors.nonCritical["defense"]).not.toBe(
          baseline.factors.nonCritical["defense"],
        )
        expect(changed.evaluation.hit!.damageItems).toEqual(
          baseline.evaluation.hit!.damageItems,
        )
        if (suffix === "level")
          close(changed.factors.nonCritical["anomalyDamageLevel"]!, 1.8305)
      }
      const replaced = await get("saved-replaced-source")
      expect(replaced.evaluation.attributes).toContainEqual(
        expect.objectContaining({
          entityId: "entity:burnice",
          snapshotId: "snapshot:burnice-v1",
          stat: "attack",
          value: { unit: "attack-points", value: 2831 },
        }),
      )
      const changedCurrent = await get("changed-current"),
        changedInitial = await get("changed-initial-mastery")
      for (const value of [changedCurrent, changedInitial]) {
        close(
          value.evaluation.hit!.damageItems[0]!.finalStat,
          savedSource.attack,
        )
        close(
          value.factors.nonCritical["anomalyProficiency"]!,
          savedSource.proficiency / 100,
        )
        close(
          value.factors.nonCritical["defense"]!,
          baseline.factors.nonCritical["defense"]!,
        )
      }
      close(
        changedCurrent.expected / baseline.expected,
        trigger === "vivian" ? 435 / 328 : 1,
      )
      close(
        changedInitial.expected / baseline.expected,
        trigger === "aria" ? 241 / 196 : 1,
      )
      const normal = await get("not-stunned")
      close(normal.factors.nonCritical["stunDamage"]!, 1)
      close(
        baseline.expected / normal.expected,
        trigger === "aria" ? 2.25 : 1.5,
      )
    },
  )

  it("keeps distinct explicit attack and anomaly sources visible in the result trace", async () => {
    const { input } = await run(
      scenarios.find((entry) => entry.id === "vivian-saved")!,
    )
    const changed = calculate({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          {
            ...input.hit.damageItems[0],
            statSource: { entityId: "entity:vivian" },
          },
        ],
      },
    })
    close(changed.evaluation.hit!.damageItems[0]!.finalStat, 1594.4552)
    close(changed.factors.nonCritical["anomalyProficiency"]!, 3.19)
    expect(changed.evaluation.attributes).toContainEqual(
      expect.objectContaining({
        entityId: "entity:vivian",
        stat: "attack",
        value: { unit: "attack-points", value: 1594.4551999999999 },
      }),
    )
    expect(changed.evaluation.attributes).toContainEqual(
      expect.objectContaining({
        entityId: "entity:alice_thymefield",
        snapshotId: savedSource.snapshotId,
        stat: "anomalyProficiency",
      }),
    )
  })

  it("consumes Aria's two explicit release defense contributions in the defense zone", async () => {
    const scenario = scenarios.find(
      (entry) => entry.id === "aria-release-defense",
    )!
    const { input, result } = await run(scenario)
    for (const [key, amount] of [
      ["ariaDefense", -0.16],
      ["ariaDelusionDefense", -0.08],
    ] as const) {
      const contributions = contributionValues(input, result, key)
      expect(contributions).toHaveLength(1)
      expect(contributions[0]!.address).toMatchObject({
        kind: "factor",
        channel: "target-defense-adjustment",
      })
      close(contributions[0]!.value.value, amount)
    }
    close(
      nativeEvent(recordFor(scenario.id)).targetBreakdown.enemyDefReduction,
      0.24,
    )
    close(result.factors.nonCritical["defense"]!, 794 / (794 + 953 * 0.76))
  })

  it.each(historicalSelfScenarios)(
    "$id: Fairy-only history, with native evidence that upstream reads current self",
    async (scenario) => {
      const record = recordFor(scenario.id)
      assertNativeLink(record, scenario)
      const { input, result } = await run(scenario)
      expect(nativeFairyRequest(input)).toEqual(record.fairy.request)
      expect(json({ ok: true, value: result })).toEqual(record.fairy.result)
      const event = nativeEvent(record)
      expect(event.panelSnapshot.sourceSnapshot).toBeNull()
      close(
        event.panelSnapshot.atk,
        record.upstream.result.inCombat.panel["atk"]!,
      )
      expect(event.panelSnapshot.atk).not.toBe(scenario.source!.attack)
      close(
        result.evaluation.hit!.damageItems[0]!.finalStat,
        scenario.source!.attack,
      )
      close(
        result.factors.nonCritical["anomalyProficiency"]!,
        scenario.source!.proficiency / 100,
      )
      close(
        result.factors.nonCritical["defense"]!,
        592 / (592 + 953 * (1 - 0.23) - 71),
      )
      close(result.factors.nonCritical["anomalyDamageLevel"]!, 1.8305)
      expect(result.expected).not.toBe(event.finalDamage)

      const changed = calculate({
        ...input,
        snapshots: input.snapshots!.map((snapshot) => ({
          ...snapshot,
          attributes: snapshot.attributes.map((entry) =>
            entry.stat === "attack"
              ? {
                  ...entry,
                  value: { ...entry.value, value: entry.value.value * 2 },
                }
              : entry,
          ),
        })),
      })
      close(
        changed.evaluation.hit!.damageItems[0]!.finalStat,
        scenario.source!.attack * 2,
      )
      close(changed.nonCritical, result.nonCritical * 2)
      close(changed.expected, result.expected * 2)
    },
  )

  it.each(["vivian", "aria"] as const)(
    "%s: changing current external source does not refresh saved attributes (Fairy-only world interface)",
    async (trigger) => {
      const { input, result } = await run(
        scenarios.find((entry) => entry.id === `${trigger}-saved`)!,
      )
      const changed = calculate({
        ...input,
        actorSources: input.actorSources.map((entry) =>
          entry.entityId === "entity:alice_thymefield"
            ? { ...entry, level: 20 }
            : entry,
        ),
        world: {
          ...input.world,
          entities: input.world.entities.map((entry) =>
            entry.kind === "actor" &&
            entry.entityId === "entity:alice_thymefield"
              ? { ...entry, generalStats: {}, directStats: {} }
              : entry,
          ),
        },
      })
      expect(changed.expected).toBe(result.expected)
      expect(
        changed.evaluation.attributes.filter((entry) => entry.snapshotId),
      ).toEqual(
        result.evaluation.attributes.filter((entry) => entry.snapshotId),
      )
    },
  )
})

describe("frozen request binding rejects meaningful mismatches", () => {
  const mutations: [string, string, (record: FrozenRecord) => void][] = [
    [
      "wrong original source",
      "vivian-saved",
      (record) => {
        record.upstream.request.damage.events[0]!.anomalySource.actorRef.agentId =
          "burnice"
      },
    ],
    [
      "wrong saved attack",
      "vivian-saved",
      (record) => {
        record.upstream.request.damage.events[0]!.anomalySource.snapshot!.panel.atk += 500
      },
    ],
    [
      "wrong saved level",
      "vivian-saved",
      (record) => {
        record.upstream.snapshotCall!.result.agentLevel = 50
      },
    ],
    [
      "wrong historical identity",
      "vivian-saved",
      (record) => {
        record.upstream.snapshotCall!.result.sourceConfigHash =
          "snapshot:unrelated"
      },
    ],
    [
      "wrong trigger",
      "aria-saved",
      (record) => {
        record.upstream.request.damage.events[0]!.triggerActorRef.agentId =
          "vivian"
      },
    ],
    [
      "wrong settlement",
      "aria-saved",
      (record) => {
        record.upstream.request.damage.events[0]!.settlementType = "attribute"
      },
    ],
    [
      "wrong target",
      "aria-saved",
      (record) => {
        Reflect.set(record.upstream.request.damage.target, "defense", 1953)
      },
    ],
    [
      "wrong mastery main",
      "aria-changed-initial-mastery",
      (record) => {
        record.upstream.request.driveDiscs[0]!.mainStat.value = 40
      },
    ],
    [
      "missing release buff",
      "aria-release-ordinary-0-exclusive-1",
      (record) => {
        record.upstream.request.combatBuffs.activeBuffIds.pop()
      },
    ],
    [
      "empty native result",
      "vivian-saved",
      (record) => {
        record.upstream.result.damage.events = []
      },
    ],
  ]
  it.each(mutations)("rejects %s", (_name, id, mutate) => {
    const record = structuredClone(recordFor(id))
    mutate(record)
    expect(() =>
      assertNativeLink(
        record,
        scenarios.find((entry) => entry.id === id)!,
      ),
    ).toThrow()
  })
  it.each(["attack-owner", "anomaly-history"] as const)(
    "rejects frozen Fairy %s mismatch",
    async (kind) => {
      const scenario = scenarios.find((entry) => entry.id === "vivian-saved")!
      const record = structuredClone(recordFor(scenario.id))
      if (kind === "attack-owner")
        Reflect.set(
          record.fairy.request.hit.damageItems[0].statSource,
          "entityId",
          "entity:vivian",
        )
      else if ("anomalySource" in record.fairy.request.damage)
        Reflect.set(
          record.fairy.request.damage.anomalySource,
          "snapshotId",
          "snapshot:wrong",
        )
      const { input } = await run(scenario)
      expect(() => assertFairyLink(record, input)).toThrow()
    },
  )
})

describe("source and history diagnostics", () => {
  const invalid: [
    string,
    string,
    string,
    (input: StaticCatalogDamageInput) => void,
  ][] = [
    [
      "missing-source",
      "vivian-saved",
      "INVALID_INPUT",
      (input) => {
        Reflect.deleteProperty(input.damage, "anomalySource")
      },
    ],
    [
      "missing-history",
      "vivian-saved",
      "MISSING_SNAPSHOT",
      (input) => {
        Reflect.set(input, "snapshots", [])
      },
    ],
    [
      "missing-attack",
      "vivian-saved",
      "MISSING_SNAPSHOT",
      (input) => {
        Reflect.set(
          input.snapshots![0]!,
          "attributes",
          input.snapshots![0]!.attributes.filter(
            (entry) => entry.stat !== "attack",
          ),
        )
      },
    ],
    [
      "missing-proficiency",
      "vivian-saved",
      "MISSING_SNAPSHOT",
      (input) => {
        Reflect.set(
          input.snapshots![0]!,
          "attributes",
          input.snapshots![0]!.attributes.filter(
            (entry) => entry.stat !== "anomalyProficiency",
          ),
        )
      },
    ],
    [
      "missing-penetration",
      "vivian-saved",
      "MISSING_SNAPSHOT",
      (input) => {
        Reflect.set(
          input.snapshots![0]!,
          "attributes",
          input.snapshots![0]!.attributes.filter(
            (entry) => entry.stat !== "penetrationRatio",
          ),
        )
      },
    ],
    [
      "wrong-snapshot-owner",
      "vivian-saved",
      "MISSING_SNAPSHOT",
      (input) => {
        for (const entry of input.snapshots![0]!.attributes)
          Reflect.set(entry, "entityId", "entity:vivian")
      },
    ],
    [
      "missing-source-identity",
      "vivian-saved",
      "MISSING_FACT",
      (input) => {
        Reflect.set(
          input,
          "actorSources",
          input.actorSources.filter(
            (entry) => entry.entityId !== "entity:alice_thymefield",
          ),
        )
      },
    ],
    [
      "wrong-option-holder",
      "vivian-saved",
      "CONTEXT_MISMATCH",
      (input) => {
        Reflect.set(input.bindings[0]!, "holderId", "entity:alice_thymefield")
      },
    ],
    [
      "missing-level",
      "vivian-saved",
      "INVALID_INPUT",
      (input) => {
        if ("anomalySource" in input.damage)
          Reflect.deleteProperty(input.damage.anomalySource, "level")
      },
    ],
    [
      "missing-trigger-proficiency",
      "vivian-saved",
      "MISSING_FACT",
      (input) => {
        const actor = input.world.entities[0]!
        if (actor.kind === "actor")
          Reflect.deleteProperty(actor.generalStats, "anomalyProficiency")
      },
    ],
    [
      "missing-trigger-mastery",
      "aria-saved",
      "MISSING_FACT",
      (input) => {
        const actor = input.world.entities[0]!
        if (actor.kind === "actor")
          Reflect.deleteProperty(actor.generalStats, "anomalyMastery")
      },
    ],
  ]
  it.each(invalid)(
    "Fairy rejects %s with a diagnostic instead of a current-value fallback",
    async (_name, id, code, mutate) => {
      const original = await run(scenarios.find((entry) => entry.id === id)!)
      const input = structuredClone(original.input)
      mutate(input)
      const result = calculateStaticDamageFromCatalog(input)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues.length).toBeGreaterThan(0)
        expect(
          result.issues.some((issue) => issue.code === code),
          JSON.stringify(result),
        ).toBe(true)
        // An empty JSON Pointer denotes the evaluator root; its diagnostic still names the missing stat.
        for (const issue of result.issues) {
          expect(typeof issue.pointer).toBe("string")
          expect(issue.message.length).toBeGreaterThan(0)
        }
        if (_name.startsWith("missing-trigger-"))
          expect(result.issues[0]!.message).toContain(
            _name.endsWith("mastery")
              ? "entity:aria, anomalyMastery"
              : "entity:vivian, anomalyProficiency",
          )
      }
    },
  )

  it.each(reference.upstreamBoundaries)(
    "$id: preserves upstream's actual rejection, fallback or fixed normalization",
    (boundary) => {
      expect(boundary.entrypoint).toBe("calculateInCombatPanel")
      const base = recordFor(boundary.baseId)
      expect(boundary.id).toBe(`${base.scenario.trigger}-${boundary.kind}`)
      const expectedRequest = structuredClone(base.upstream.request)
      const event = expectedRequest.damage.events[0]!
      switch (boundary.kind) {
        case "missing-source":
          Reflect.deleteProperty(event, "anomalySource")
          break
        case "missing-snapshot":
          Reflect.deleteProperty(event.anomalySource, "snapshot")
          break
        case "wrong-snapshot-identity":
          event.anomalySource.snapshot!.agentId = "burnice"
          break
        case "wrong-trigger":
          Reflect.set(event.triggerActorRef, "agentId", "alice_thymefield")
          break
        case "missing-attack":
          Reflect.deleteProperty(event.anomalySource.snapshot!.panel, "atk")
          break
        case "missing-proficiency":
          Reflect.deleteProperty(
            event.anomalySource.snapshot!.panel,
            "anomalyProficiency",
          )
          break
        case "missing-penetration":
          Reflect.deleteProperty(
            event.anomalySource.snapshot!.panel,
            "penRatio",
          )
          break
        case "missing-level":
          Reflect.deleteProperty(event.anomalySource.snapshot!, "agentLevel")
          break
        case "ignored-level-coefficient":
          Reflect.set(expectedRequest.damage.target, "levelCoefficient", 592)
          break
        default:
          throw new Error(`Unknown boundary: ${boundary.kind}`)
      }
      expect(boundary.request).toEqual(expectedRequest)
      if (
        [
          "missing-snapshot",
          "wrong-snapshot-identity",
          "wrong-trigger",
        ].includes(boundary.kind)
      ) {
        expect(boundary.result).toEqual({
          ok: false,
          error: {
            name: "Error",
            message:
              boundary.kind === "wrong-trigger"
                ? "异放触发者必须是当前配装角色。"
                : "外部原异常施加者必须提供与角色一致的冻结快照。",
          },
        })
      } else {
        expect(boundary.result.ok).toBe(true)
        if (!boundary.result.ok)
          throw new Error("Expected a documented successful native return")
        expect(boundary.result.value.damage.events).toHaveLength(1)
        const returned = boundary.result.value.damage.events[0]!
        if (["missing-attack", "missing-proficiency"].includes(boundary.kind))
          expect(returned.finalDamage).toBe(0)
        else expect(returned.finalDamage).toBeGreaterThan(0)
        if (boundary.kind === "missing-penetration")
          expect(returned.panelSnapshot.penRatio).toBe(0)
        if (boundary.kind === "missing-level")
          expect(returned.panelSnapshot.sourceSnapshot!.agentLevel).toBe(60)
        if (boundary.kind === "missing-source")
          expect(returned.panelSnapshot.sourceSnapshot).toBeNull()
        if (boundary.kind === "ignored-level-coefficient") {
          expect(boundary.baseId).toBe(`${base.scenario.trigger}-saved-level`)
          expect(base.scenario.source!.level).toBe(50)
          expect(boundary.request.damage.target.levelCoefficient).toBe(592)
          expect(event.anomalySource.snapshot!.agentLevel).toBe(50)
          expect(returned.panelSnapshot.sourceSnapshot!.agentLevel).toBe(50)
          expect(returned.input.target.levelCoefficient).toBe(794)
          expect(returned.targetBreakdown.levelCoefficient).toBe(794)
          expect(returned.multipliers.anomalyLevel).toBe(1.8305)
          expect(boundary.result.value).toEqual(base.upstream.result)
          // These two native API probes are separate from the 39 common scenarios / 702 readings.
          expect(
            scenarios.some((scenario) => scenario.id === boundary.id),
          ).toBe(false)
        }
      }
    },
  )
})

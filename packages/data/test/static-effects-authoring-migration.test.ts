import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it } from "vitest"
import {
  applyStaticEffectsAuthoring,
  resolveAuthoringMode,
  type StaticEffectsGenerationOptions,
} from "../scripts/generate-static-effects.ts"
import {
  compareStaticArtifacts,
  stableStringify,
} from "../scripts/static-effects/authoring/canonical.ts"
import {
  compileAuthoringPilot,
  compileAuthoringRecords,
  readStaticArtifacts,
} from "../scripts/static-effects/authoring/compile.ts"
import { PILOT_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/pilot-records.ts"
import { MIGRATED_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/records.ts"
import { verifyFormalAuthoring } from "../scripts/static-effects/authoring/run-migration.ts"
import type {
  EffectAuthoringRecord,
  EffectAuthoringRuleRecord,
} from "../scripts/static-effects/authoring/types.ts"
import { validateAuthoringRecords } from "../scripts/static-effects/authoring/validation.ts"

const BASELINE_DIRECTORY = fileURLToPath(
  new URL("../definitions/effects", import.meta.url),
)
const temporaryDirectories: string[] = []

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

afterAll(() => {
  for (const directory of temporaryDirectories)
    rmSync(directory, { recursive: true, force: true })
})

function cloneRecords(): EffectAuthoringRecord[] {
  return structuredClone(MIGRATED_AUTHORING_RECORDS) as EffectAuthoringRecord[]
}

function ruleRecord(record: EffectAuthoringRecord): EffectAuthoringRuleRecord {
  if (record.mechanism.kind === "unsupported")
    throw new Error(`Expected a rule record: ${record.key}`)
  return record as EffectAuthoringRuleRecord
}

function recordByKey(key: string): EffectAuthoringRuleRecord {
  const record = MIGRATED_AUTHORING_RECORDS.find(
    (candidate) => candidate.key === key,
  )
  if (!record) throw new Error(`Missing migrated record: ${key}`)
  return ruleRecord(record)
}

function coverageKey(record: {
  readonly pointer: string
  readonly catalogEntityId: string
}): string {
  return `${record.pointer}|${record.catalogEntityId}`
}

describe("static effects authoring migration records", () => {
  it("accepts the 99 migrated records and their mechanism mix", () => {
    const result = validateAuthoringRecords(MIGRATED_AUTHORING_RECORDS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.records).toHaveLength(99)
    expect(new Set(result.records.map((record) => record.key)).size).toBe(99)

    const mechanisms = result.records.map((record) => record.mechanism.kind)
    expect(mechanisms.filter((kind) => kind === "single-rule")).toHaveLength(60)
    expect(
      mechanisms.filter((kind) => kind === "single-rule-per-variant"),
    ).toHaveLength(10)
    expect(mechanisms.filter((kind) => kind === "multi-rule")).toHaveLength(2)
    expect(mechanisms.filter((kind) => kind === "complete-state")).toHaveLength(
      2,
    )
    expect(
      mechanisms.filter((kind) => kind === "independent-settlement"),
    ).toHaveLength(25)
    expect(mechanisms.filter((kind) => kind === "unsupported")).toHaveLength(0)

    const statuses = result.records.map((record) => record.coverage.status)
    expect(statuses.filter((status) => status === "corrected")).toHaveLength(23)
    expect(statuses.filter((status) => status === "converted")).toHaveLength(76)
    for (const record of result.records) {
      if (record.mechanism.kind === "independent-settlement")
        expect(record.coverage.status).toBe("converted")
      const rule = ruleRecord(record)
      expect(rule.activation.kind).toBe("supplied")
      expect(["entity", "hit"]).toContain(rule.scope)
    }
    expect(
      result.records.filter(
        (record) => "uniqueness" in record && record.uniqueness !== undefined,
      ),
    ).toHaveLength(4)
    expect(
      new Set(
        result.records
          .map((record) => ruleRecord(record).operation.kind)
          .filter(
            (kind) =>
              kind === "guaranteed-critical" ||
              kind === "astra-yao-m4-quick-assist-damage",
          ),
      ),
    ).toEqual(
      new Set(["guaranteed-critical", "astra-yao-m4-quick-assist-damage"]),
    )
  })

  it("covers the 30 frozen authoring mechanism variants across every arm", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const selectedOptionIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    const mechanismOptions = baseline.catalog.options.filter((option) =>
      option.variants.some((variant) => variant.mechanism !== undefined),
    )
    // PR-B2 的六条 M4 独立结算选项由 converter 维护，明确不扩张 authoring
    // 覆盖；其余机制选项必须仍由冻结的作者记录完整覆盖。
    expect(mechanismOptions).toHaveLength(36)
    const pheonyM4OptionIds = new Set(
      mechanismOptions
        .map((option) => option.optionId)
        .filter((optionId) => optionId.startsWith("nanoka:agents:1641:m4-")),
    )
    expect(pheonyM4OptionIds.size).toBe(6)
    expect(
      mechanismOptions
        .map((option) => option.optionId)
        .filter((optionId) => !selectedOptionIds.has(optionId))
        .sort(),
    ).toEqual([...pheonyM4OptionIds].sort())

    const armCounts = new Map<string, number>()
    for (const option of mechanismOptions) {
      for (const variant of option.variants) {
        if (variant.mechanism === undefined) continue
        armCounts.set(
          variant.mechanism.kind,
          (armCounts.get(variant.mechanism.kind) ?? 0) + 1,
        )
      }
      const records = MIGRATED_AUTHORING_RECORDS.filter(
        (record) => record.ids.optionId === option.optionId,
      )
      if (pheonyM4OptionIds.has(option.optionId)) {
        expect(records).toHaveLength(0)
        continue
      }
      expect(records.length).toBeGreaterThan(0)
      const declared = records[0]?.option.variants[0]?.catalogMechanism
      if (declared !== undefined)
        expect(declared).toEqual(option.variants[0]?.mechanism)
    }
    expect(Object.fromEntries(armCounts)).toEqual({
      "independent-settlement": 28,
      "element-buff-inputs": 2,
      "complete-state": 1,
      "holder-level": 1,
      "windswept-direct": 1,
      "declared-teammate-beneficiary": 1,
      "squad-unique": 1,
      "luminize-proficiency-mapping": 1,
    })
  })

  it("selects 89 option groups with 24 fixed-source coverage positions", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const selectedOptionIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    expect(selectedOptionIds.size).toBe(89)
    const selectedCoverage = baseline.coverage.records.filter((record) =>
      selectedOptionIds.has(record.optionId),
    )
    expect(selectedCoverage).toHaveLength(24)
    expect(
      selectedCoverage.filter((record) => record.status === "corrected"),
    ).toHaveLength(20)
    expect(
      selectedCoverage.filter((record) => record.status === "converted"),
    ).toHaveLength(4)
    expect(
      baseline.coverage.records.filter(
        (record) => record.status === "corrected",
      ),
    ).toHaveLength(138)
    expect(
      baseline.coverage.records.filter(
        (record) => record.status === "converted",
      ),
    ).toHaveLength(1149)
    const selectedSupplementalRecords =
      baseline.coverage.supplementalRecords.filter(
        (record) =>
          record.optionId !== undefined &&
          selectedOptionIds.has(record.optionId),
      )
    expect(selectedSupplementalRecords).toHaveLength(68)
    expect(selectedSupplementalRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplementId: "nanoka:agents:miyabi:frostburn-break-damage",
          optionId: "nanoka:agents:miyabi:frostburn-break-damage",
          status: "integrated",
        }),
      ]),
    )
    const baselineIntegratedSupplementIds = new Set(
      baseline.coverage.supplementalRecords
        .filter((record) => record.status === "integrated")
        .map((record) => record.supplementId),
    )
    const authoredSupplementIds = new Set(
      MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
        (record.supplementalRecords ?? []).map(
          (supplement) => supplement.supplementId,
        ),
      ),
    )
    const pheonyM4SupplementIds = new Set(
      baseline.catalog.options
        .map((option) => option.optionId)
        .filter((optionId) =>
          optionId.startsWith("nanoka:agents:1641:m4-anomaly-settlement-"),
        ),
    )
    expect(
      [...pheonyM4SupplementIds].filter((id) => authoredSupplementIds.has(id)),
    ).toEqual([])
    expect(
      new Set([...authoredSupplementIds, ...pheonyM4SupplementIds]),
    ).toEqual(baselineIntegratedSupplementIds)

    const recordsByOption = new Map<string, EffectAuthoringRecord[]>()
    for (const record of MIGRATED_AUTHORING_RECORDS) {
      const records = recordsByOption.get(record.ids.optionId) ?? []
      records.push(record)
      recordsByOption.set(record.ids.optionId, records)
    }
    for (const [optionId, records] of recordsByOption) {
      const baselineRows = baseline.coverage.records.filter(
        (row) => row.optionId === optionId,
      )
      const positions = records.flatMap((record) => record.coverage.positions)
      expect(baselineRows).toHaveLength(positions.length)
      for (const record of records) {
        for (const position of record.coverage.positions) {
          const baselineRow = baselineRows.find(
            (row) => row.pointer === position.pointer,
          )
          expect(baselineRow?.catalogEntityId).toBe(
            record.entity.catalogEntityId,
          )
          expect(baselineRow?.status).toBe(record.coverage.status)
          expect(baselineRow?.effectIds).toEqual([record.ids.effectId])
        }
      }
    }
  })

  it("projects 99 records to 99 rules, 89 options and 24 coverage positions", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      baseline,
    )
    expect(compilation.ruleIds).toHaveLength(99)
    expect(compilation.optionIds).toHaveLength(89)
    expect(compilation.coverageKeys).toHaveLength(24)
    const declaredSupplementIds = MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
      (record.supplementalRecords ?? []).map(
        (supplement) => supplement.supplementId,
      ),
    )
    expect(declaredSupplementIds).toHaveLength(68)
    expect(compilation.supplementalRecordIds).toEqual(declaredSupplementIds)
    expect(compilation.supplementalRecordIds).toContain(
      "nanoka:agents:miyabi:frostburn-break-damage",
    )
    expect(compilation.skillTargetIds).toHaveLength(19)

    const groups = new Map<string, EffectAuthoringRuleRecord[]>()
    for (const record of MIGRATED_AUTHORING_RECORDS) {
      const group = groups.get(record.ids.optionId) ?? []
      group.push(ruleRecord(record))
      groups.set(record.ids.optionId, group)
    }

    for (const [optionId, records] of groups) {
      const [first] = records
      if (!first) throw new Error(`Empty record group: ${optionId}`)
      const option = compilation.artifacts.catalog.options.find(
        (candidate) => candidate.optionId === optionId,
      )
      expect(option?.catalogEntityId).toBe(first.entity.catalogEntityId)
      expect(option?.variants).toHaveLength(first.option.variants.length)
      for (const [index, authoringVariant] of first.option.variants.entries()) {
        const contributing = authoringVariant.effectKeys.map((key) => {
          const record = records.find((candidate) => candidate.key === key)
          if (!record)
            throw new Error(`Missing record ${key} in option ${optionId}`)
          return record
        })
        const [contributingFirst] = contributing
        if (!contributingFirst)
          throw new Error(`Variant ${index} of ${optionId} has no records`)
        const variant = option?.variants[index]
        expect(variant?.status).toBe(contributingFirst.coverage.status)
        expect(variant?.effectIds).toEqual(
          contributing.map((record) => record.ids.effectId),
        )
        expect(variant?.differences).toEqual([
          ...new Set(
            contributing.flatMap((record) => record.coverage.differenceIds),
          ),
        ])
        expect(variant?.references).toEqual(authoringVariant.references)
        expect(variant?.configuration).toEqual(authoringVariant.configuration)
        expect(variant?.maximumLayers).toBe(authoringVariant.maximumLayers)
      }

      for (const authoring of records) {
        const rule = compilation.artifacts.definitions.effects.find(
          (candidate) => candidate.effectId === authoring.ids.effectId,
        )
        expect(rule?.kind).toBe("contribution")
        if (rule?.kind === "contribution") {
          expect(rule.source.identity).toEqual(authoring.entity.identity)
          expect(rule.source.section).toBe(authoring.section)
          expect(rule.source.references).toEqual(authoring.references)
          expect(rule.config).toEqual(authoring.config)
          expect(rule.activation).toEqual(authoring.activation)
          expect(rule.beneficiary).toEqual(authoring.beneficiary)
          expect(rule.scope).toBe(authoring.scope)
          expect(rule.when).toEqual(authoring.when)
          expect(rule.operation).toEqual(authoring.operation)
          expect(rule.parameters).toEqual(authoring.parameters)
        }

        for (const position of authoring.coverage.positions) {
          const coverage = compilation.artifacts.coverage.records.find(
            (candidate) =>
              candidate.optionId === authoring.ids.optionId &&
              candidate.pointer === position.pointer,
          )
          expect(coverage?.status).toBe(authoring.coverage.status)
          expect(coverage?.effectIds).toEqual([authoring.ids.effectId])
          expect(coverage?.normalizationChanges).toEqual(
            position.normalizationChanges,
          )
          expect(coverage?.rawValue).toBe(position.rawValue)
          expect(coverage?.normalizedValue).toBe(position.normalizedValue)
        }
      }
    }
  })

  it("requires at least two records for single-rule-per-variant", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate) => candidate.mechanism.kind === "single-rule-per-variant",
    )
    if (!record) throw new Error("Missing multi-variant authoring record")
    expect(() =>
      compileAuthoringRecords(
        [record],
        readStaticArtifacts(BASELINE_DIRECTORY),
      ),
    ).toThrow(
      /single-rule-per-variant group .* must contain at least two records/u,
    )
  })

  it("requires at least two records for multi-rule", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate) => candidate.mechanism.kind === "multi-rule",
    )
    if (!record) throw new Error("Missing multi-rule authoring record")
    expect(() =>
      compileAuthoringRecords(
        [record],
        readStaticArtifacts(BASELINE_DIRECTORY),
      ),
    ).toThrow(/multi-rule group .* must contain at least two records/u)
  })

  it("rejects a single-rule-per-variant variant that references two records", () => {
    const records = cloneRecords()
    const sample = records.find(
      (candidate) => candidate.mechanism.kind === "single-rule-per-variant",
    )
    if (!sample) throw new Error("Missing multi-variant authoring record")
    const group = records.filter(
      (candidate) => candidate.ids.optionId === sample.ids.optionId,
    )
    const [first, second] = group
    if (!first || !second) throw new Error("Missing multi-variant record pair")
    const mutableGroup = group as unknown as Array<{
      option: { variants: Array<{ effectKeys: string[] }> }
    }>
    for (const record of mutableGroup) {
      const [firstVariant, secondVariant] = record.option.variants
      if (!firstVariant || !secondVariant)
        throw new Error("Missing multi-variant option")
      firstVariant.effectKeys = [first.key, second.key]
      secondVariant.effectKeys = [second.key]
    }
    expect(() =>
      compileAuthoringRecords(records, readStaticArtifacts(BASELINE_DIRECTORY)),
    ).toThrow(
      new RegExp(
        `single-rule-per-variant group ${sample.ids.optionId} variant 0 must reference exactly one record`,
        "u",
      ),
    )
  })

  it("does not accept a multi-rule label for a single-rule-per-variant group", () => {
    const records = cloneRecords()
    const sample = records.find(
      (candidate) => candidate.mechanism.kind === "single-rule-per-variant",
    )
    if (!sample) throw new Error("Missing multi-variant authoring record")
    for (const record of records.filter(
      (candidate) => candidate.ids.optionId === sample.ids.optionId,
    )) {
      const mutable = record as unknown as {
        mechanism: EffectAuthoringRecord["mechanism"]
      }
      mutable.mechanism = { kind: "multi-rule" }
    }
    expect(() =>
      compileAuthoringRecords(records, readStaticArtifacts(BASELINE_DIRECTORY)),
    ).toThrow(
      /must have at least one variant that references two or more records/u,
    )
  })

  it("does not accept a single-rule-per-variant label for a multi-rule group", () => {
    const records = cloneRecords()
    const sample = records.find(
      (candidate) => candidate.mechanism.kind === "multi-rule",
    )
    if (!sample) throw new Error("Missing multi-rule authoring record")
    for (const record of records.filter(
      (candidate) => candidate.ids.optionId === sample.ids.optionId,
    )) {
      const mutable = record as unknown as {
        mechanism: EffectAuthoringRecord["mechanism"]
      }
      mutable.mechanism = { kind: "single-rule-per-variant" }
    }
    expect(() =>
      compileAuthoringRecords(records, readStaticArtifacts(BASELINE_DIRECTORY)),
    ).toThrow(/must declare one variant per record/u)
  })

  it("binds the complete-state label to the registered option", () => {
    const completeStateRecords = cloneRecords()
    const registered = completeStateRecords.find(
      (candidate) => candidate.mechanism.kind === "complete-state",
    )
    if (!registered) throw new Error("Missing complete-state authoring record")
    for (const record of completeStateRecords.filter(
      (candidate) => candidate.ids.optionId === registered.ids.optionId,
    )) {
      const mutable = record as unknown as {
        mechanism: EffectAuthoringRecord["mechanism"]
      }
      mutable.mechanism = { kind: "multi-rule" }
    }
    expect(() =>
      compileAuthoringRecords(
        completeStateRecords,
        readStaticArtifacts(BASELINE_DIRECTORY),
      ),
    ).toThrow(/must use the complete-state mechanism kind/u)

    const unregistered = cloneRecords()
    const multiRule = unregistered.find(
      (candidate) => candidate.mechanism.kind === "multi-rule",
    )
    if (!multiRule) throw new Error("Missing multi-rule authoring record")
    for (const record of unregistered.filter(
      (candidate) => candidate.ids.optionId === multiRule.ids.optionId,
    )) {
      const mutable = record as unknown as {
        mechanism: EffectAuthoringRecord["mechanism"]
      }
      mutable.mechanism = { kind: "complete-state" }
    }
    expect(() =>
      compileAuthoringRecords(
        unregistered,
        readStaticArtifacts(BASELINE_DIRECTORY),
      ),
    ).toThrow(/must be registered in COMPLETE_STATE_OPTIONS/u)
  })

  it("rejects a malformed specialized operation payload", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "lucy-guard-boar-m6-damage",
    )
    if (!record) throw new Error("Missing Lucy M6 authoring record")
    const mutated = structuredClone(record) as unknown as {
      operation: { multiplier: { value: number } }
    }
    mutated.operation.multiplier.value = 2
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: "[0]/operation/multiplier/value",
        message: "expected the literal 3",
      })
  })

  it("rejects a non-multiplier Lucy cheer multiplier unit", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "lucy-guard-boar-inheritance",
    )
    if (!record) throw new Error("Missing Lucy inheritance authoring record")
    const mutated = structuredClone(record) as unknown as {
      operation: { cheerMultiplier: { unit: string } }
    }
    mutated.operation.cheerMultiplier.unit = "ratio"
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: "[0]/operation/cheerMultiplier/unit",
        message: "expected one of: multiplier",
      })
  })

  it("rejects an Alice periodic ratio other than 0.025", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "alice-core-periodic-damage",
    )
    if (!record) throw new Error("Missing Alice periodic authoring record")
    const mutated = structuredClone(record) as unknown as {
      operation: { ratio: { value: number } }
    }
    mutated.operation.ratio.value = 0.03
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: "[0]/operation/ratio/value",
        message: "expected the literal 0.025",
      })
  })

  it("rejects a stun replacement maximum bonus outside [0, 2]", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "stun-damage-replacement",
    )
    if (!record) throw new Error("Missing stun replacement authoring record")
    const mutated = structuredClone(record) as unknown as {
      operation: { maximumBonus: unknown }
    }
    mutated.operation.maximumBonus = {
      kind: "literal",
      unit: "ratio",
      value: 2.5,
    }
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: "[0]/operation/maximumBonus/value",
        message: "expected a number within [0, 2]",
      })
  })

  it("rejects out-of-range stun replacement parameter values", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "stun-damage-replacement",
    )
    if (!record) throw new Error("Missing stun replacement authoring record")
    const mutated = structuredClone(record) as unknown as {
      parameters: {
        maximumVeilBonus: { values: Record<string, number> }
      }
    }
    mutated.parameters.maximumVeilBonus.values["6"] = 2.5
    mutated.parameters.maximumVeilBonus.values["0"] = -1
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        path: "[0]/parameters/maximumVeilBonus/values/6",
        message: "expected a number within [0, 2]",
      })
      expect(result.issues).toContainEqual({
        path: "[0]/parameters/maximumVeilBonus/values/0",
        message: "expected a non-negative number",
      })
    }
  })

  it("rejects an unknown field on a specialized operation", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "lucy-guard-boar-m6-damage",
    )
    if (!record) throw new Error("Missing Lucy M6 authoring record")
    const mutated = structuredClone(record) as unknown as {
      operation: Record<string, unknown>
    }
    mutated.operation.extra = true
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: "[0]/operation/extra",
        message: "unknown operation field",
      })
  })

  it("rejects a stun damage adjustment with a ratio unit", () => {
    const record = MIGRATED_AUTHORING_RECORDS.find(
      (candidate): candidate is EffectAuthoringRuleRecord =>
        "operation" in candidate &&
        candidate.operation.kind === "factor-contribution" &&
        candidate.operation.channel === "stun-damage-adjustment",
    )
    if (!record) throw new Error("Missing stun damage adjustment record")
    const mutated = structuredClone(record) as unknown as {
      operation: { value: { unit: string } }
    }
    mutated.operation.value.unit = "ratio"
    const result = validateAuthoringRecords([
      mutated as unknown as EffectAuthoringRecord,
    ])
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: "[0]/operation/value/unit",
        message: 'expected "multiplier" but found "ratio"',
      })
  })

  it("keeps the complete-state option as one team/holder pair", () => {
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      readStaticArtifacts(BASELINE_DIRECTORY),
    )
    const optionId =
      "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage"
    const option = compilation.artifacts.catalog.options.find(
      (candidate) => candidate.optionId === optionId,
    )
    expect(option?.name).toBe("相变时流 · 其他角色属性异常伤害")
    expect(option?.target).toBe("team")
    expect(option?.variants).toHaveLength(1)
    expect(option?.variants[0]?.status).toBe("corrected")
    expect(option?.variants[0]?.effectIds).toEqual([
      "agent:1581:zzz-hp:eff-ms7tjecu-l3ocgm:blk-legacy:mindscape:1",
      "agent:1581:zzz-hp:eff-ms7tjyzo-3v31wa:blk-legacy:mindscape:1",
    ])
    expect(option?.variants[0]?.differences).toEqual([
      "remielle-mindscape1-complete-anomaly-state",
    ])
    expect(
      compilation.artifacts.coverage.records.filter(
        (record) => record.optionId === optionId,
      ),
    ).toEqual([])

    const team = recordByKey("remiel-m1-team-anomaly-damage")
    const holder = recordByKey("remiel-m1-holder-anomaly-damage")
    expect(team.beneficiary).toEqual({ kind: "team" })
    expect(holder.beneficiary).toEqual({ kind: "holder" })
    expect(ruleRecord(team).parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.1 },
    })
    expect(ruleRecord(holder).parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: -0.1 },
    })
  })

  it("projects the three independent settlements as converted", () => {
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      readStaticArtifacts(BASELINE_DIRECTORY),
    )
    const expected = [
      {
        optionId: "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz",
        targetId: "zzz-hp:skill:nekomata-claw-mark",
        itemId: "nekomata:claw-mark",
        exclusive: false,
      },
      {
        optionId: "nanoka:agents:miyabi:frostburn-break-damage",
        targetId: "zzz-hp:skill:miyabi-frostburn-break-damage",
        itemId: "miyabi:frostburn-break-damage",
        exclusive: true,
      },
    ]
    for (const entry of expected) {
      const option = compilation.artifacts.catalog.options.find(
        (candidate) => candidate.optionId === entry.optionId,
      )
      expect(option?.variants[0]?.status).toBe("converted")
      const mechanism = option?.variants[0]?.mechanism
      if (mechanism?.kind !== "independent-settlement")
        throw new Error(`test fixture: ${entry.optionId} is not a settlement`)
      expect(mechanism.damageItemRequirements).toEqual([
        expect.objectContaining({ itemId: entry.itemId }),
      ])
      expect(mechanism.isolateDamageItems).toBe(
        entry.exclusive ? true : undefined,
      )
      expect(
        compilation.skillTargetIds.filter((id) => id === entry.targetId),
      ).toEqual([entry.targetId])
    }
    expect(
      compilation.artifacts.coverage.records.filter(
        (record) =>
          record.optionId ===
          "agents:nekomata:mindscape:0:blk-legacy:eff-ms4f47p3-p1s9yz",
      ),
    ).toHaveLength(1)
    expect(
      compilation.artifacts.coverage.records.filter(
        (record) =>
          record.optionId === "nanoka:agents:miyabi:frostburn-break-damage",
      ),
    ).toEqual([])
    expect(recordByKey("miyabi-frostburn-m4").coverage.status).toBe("converted")
  })

  it("transcribes the new corrected single-rule records from catalog metadata", () => {
    const caesar = recordByKey("caesar-m2-team-attack")
    expect(caesar.ids.optionId).toBe(
      "agents:caesar:mindscape:2:blk-legacy:legacy-team-atk",
    )
    expect(caesar.coverage.positions[0]).toEqual({
      pointer: "/agents/7/mindscapeBuffs/2/effectBlocks/0/effects/0",
      rank: 2,
      rankKind: "mindscape",
      stat: "atk",
      normalizationChanges: [],
      rawValue: 500,
      normalizedValue: 500,
    })
    expect(caesar.coverage.differenceIds).toEqual([
      "core-skill-level-parameters",
      "core-enhancement-independent-increment",
    ])
    expect(caesar.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "coreSkillLevel",
        unit: "attack-points",
        values: {
          "1": 40,
          "2": 135,
          "3": 240,
          "4": 400,
          "5": 650,
          "6": 900,
          "7": 1000,
        },
      },
      incrementCoefficient: {
        kind: "constant",
        unit: "multiplier",
        value: 0.5,
      },
    })
    expect(caesar.option.variants[0]?.configuration).toEqual({
      minimumMindscape: 2,
      coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
    })

    const lycaon = recordByKey("lycaon-core-team-damage-bonus")
    expect(lycaon.ids.optionId).toBe(
      "agents:lycaon:mindscape:0:blk-legacy:legacy-team-dmgBonus",
    )
    expect(lycaon.coverage.positions[0]).toEqual({
      pointer: "/agents/50/mindscapeBuffs/0/effectBlocks/0/effects/1",
      rank: 0,
      rankKind: "mindscape",
      stat: "dmgBonus",
      normalizationChanges: [],
      rawValue: 30,
      normalizedValue: 30,
    })
    expect(lycaon.coverage.differenceIds).toEqual(["potential-branch-gate"])
    expect(lycaon.beneficiary).toEqual({ kind: "team" })
    expect(lycaon.parameters).toEqual({
      amount: { kind: "constant", unit: "ratio", value: 0.3 },
    })
    expect(lycaon.option.variants[0]?.applicability).toEqual({
      beneficiaryElements: ["wind", "fire", "electric", "physical", "ether"],
    })

    const ellenCriticalDamage = recordByKey("ellen-potential-critical-damage")
    expect(ellenCriticalDamage.ids.optionId).toBe(
      "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fuyir-e3fuww",
    )
    expect(ellenCriticalDamage.coverage.positions[0]?.rawValue).toBe(0)
    expect(ellenCriticalDamage.coverage.positions[0]?.normalizedValue).toBe(0)
    expect(ellenCriticalDamage.activation).toEqual({
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 10 },
    })
    expect(ellenCriticalDamage.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.016,
          "3": 0.024,
          "4": 0.032,
          "5": 0.04,
          "6": 0.048,
        },
      },
    })

    const ellenResistanceIgnore = recordByKey(
      "ellen-potential-resistance-ignore",
    )
    expect(ellenResistanceIgnore.ids.optionId).toBe(
      "agents:ellen:mindscape:0:blk-ms4fuyir-dotq6c:eff-ms4fvlsz-x4x1hj",
    )
    expect(ellenResistanceIgnore.coverage.positions[0]?.rawValue).toBe(10)
    expect(ellenResistanceIgnore.coverage.positions[0]?.normalizedValue).toBe(
      10,
    )
    expect(ellenResistanceIgnore.when).toEqual({
      kind: "all",
      conditions: [{ kind: "one-of", fact: "hit.element", values: ["ice"] }],
    })
    expect(ellenResistanceIgnore.parameters).toEqual({
      amount: {
        kind: "by-rank",
        rank: "potentialLevel",
        unit: "ratio",
        values: {
          "2": 0.033,
          "3": 0.05,
          "4": 0.067,
          "5": 0.083,
          "6": 0.1,
        },
      },
    })
  })

  it("leaves every unselected entry unchanged", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      MIGRATED_AUTHORING_RECORDS,
      baseline,
    )
    const selectedEffectIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.effectId),
    )
    const selectedOptionIds = new Set(
      MIGRATED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    const selectedCoverageKeys = new Set(
      MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
        record.coverage.positions.map((position) =>
          coverageKey({
            pointer: position.pointer,
            catalogEntityId: record.entity.catalogEntityId,
          }),
        ),
      ),
    )
    const selectedSupplementIds = new Set(
      MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
        (record.supplementalRecords ?? []).map(
          (supplement) => supplement.supplementId,
        ),
      ),
    )

    for (const rule of baseline.definitions.effects) {
      if (selectedEffectIds.has(rule.effectId)) continue
      const candidate = compilation.artifacts.definitions.effects.find(
        (entry) => entry.effectId === rule.effectId,
      )
      expect(stableStringify(candidate)).toBe(stableStringify(rule))
    }
    for (const option of baseline.catalog.options) {
      if (selectedOptionIds.has(option.optionId)) continue
      const candidate = compilation.artifacts.catalog.options.find(
        (entry) => entry.optionId === option.optionId,
      )
      expect(stableStringify(candidate)).toBe(stableStringify(option))
    }
    for (const record of baseline.coverage.records) {
      if (selectedCoverageKeys.has(coverageKey(record))) continue
      const candidate = compilation.artifacts.coverage.records.find(
        (entry) =>
          entry.pointer === record.pointer &&
          entry.catalogEntityId === record.catalogEntityId,
      )
      expect(stableStringify(candidate)).toBe(stableStringify(record))
    }
    expect(compilation.artifacts.definitions.effects).toHaveLength(
      baseline.definitions.effects.length,
    )
    expect(compilation.artifacts.catalog.options).toHaveLength(
      baseline.catalog.options.length,
    )
    expect(compilation.artifacts.coverage.records).toHaveLength(
      baseline.coverage.records.length,
    )
    expect(
      compilation.artifacts.coverage.supplementalRecords.filter(
        (record) => !selectedSupplementIds.has(record.supplementId),
      ),
    ).toEqual(
      baseline.coverage.supplementalRecords.filter(
        (record) => !selectedSupplementIds.has(record.supplementId),
      ),
    )
    expect(compareStaticArtifacts(baseline, compilation.artifacts)).toEqual({
      equivalent: true,
      differences: [],
    })
  })

  it("uses authoring values instead of selected baseline semantics", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const target = MIGRATED_AUTHORING_RECORDS[0]
    if (!target) throw new Error("Missing formal record")
    const authoring = ruleRecord(target)

    const definitions = structuredClone(baseline.definitions) as unknown as {
      effects: Array<{
        effectId: string
        kind: string
        parameters?: Record<string, unknown>
      }>
    }
    const baselineRule = definitions.effects.find(
      (rule) => rule.effectId === target.ids.effectId,
    )
    if (!baselineRule || baselineRule.kind !== "contribution")
      throw new Error("Missing selected baseline rule")
    baselineRule.parameters = {
      amount: { kind: "constant", unit: "ratio", value: 0.999 },
    }

    const catalog = structuredClone(baseline.catalog) as unknown as {
      options: Array<{ optionId: string; name: string }>
    }
    const baselineOption = catalog.options.find(
      (option) => option.optionId === target.ids.optionId,
    )
    if (!baselineOption) throw new Error("Missing selected baseline option")
    baselineOption.name = "baseline mutation must not leak"

    const compilation = compileAuthoringRecords([target], {
      definitions: definitions as unknown as typeof baseline.definitions,
      catalog: catalog as unknown as typeof baseline.catalog,
      coverage: baseline.coverage,
    })
    const compiledRule = compilation.artifacts.definitions.effects.find(
      (rule) => rule.effectId === target.ids.effectId,
    )
    expect(compiledRule?.kind).toBe("contribution")
    if (compiledRule?.kind === "contribution")
      expect(compiledRule.parameters).toEqual(authoring.parameters)
    const compiledOption = compilation.artifacts.catalog.options.find(
      (option) => option.optionId === target.ids.optionId,
    )
    expect(compiledOption?.name).toBe(target.option.name)
    expect(compiledOption?.name).not.toBe("baseline mutation must not leak")
  })

  it("formats byte-identical artifacts and removes the auto-created output", async () => {
    const result = await verifyFormalAuthoring()
    expect(result.outputRetained).toBe(false)
    expect(existsSync(result.outputDirectory)).toBe(false)
    expect(result.recordCount).toBe(99)
    expect(result.summary).toBe(
      "rules: 99, options: 89, coverage positions: 24, skill targets: 19, supplemental records: 68",
    )
    expect(result.equivalent).toBe(true)
    expect(result.differences).toEqual([])
    expect(result.byteIdentical).toBe(true)
    for (const hash of result.hashes) expect(hash.candidate).toBe(hash.baseline)
  })

  it("keeps the formal records independent from the P2-1 pilot inputs", () => {
    const authoringDirectory = new URL(
      "../scripts/static-effects/authoring/",
      import.meta.url,
    )
    for (const file of ["records.ts", "run-migration.ts"]) {
      const source = readFileSync(new URL(file, authoringDirectory), "utf8")
      expect(source).not.toMatch(
        /from ["']\.\/(?:pilot-records|pilot-options)\.ts["']/u,
      )
    }
    const generator = readFileSync(
      new URL("../scripts/generate-static-effects.ts", import.meta.url),
      "utf8",
    )
    expect(generator).not.toMatch(/pilot-records|pilot-options/u)
    const pilotRecords = new Set<unknown>(PILOT_AUTHORING_RECORDS)
    for (const record of MIGRATED_AUTHORING_RECORDS)
      expect(pilotRecords.has(record)).toBe(false)
  })

  it("rejects structurally invalid authoring before writing a candidate", () => {
    const record = MIGRATED_AUTHORING_RECORDS[0]
    if (!record) throw new Error("Missing formal record")
    const invalid = [
      {
        ...record,
        operation: { kind: "json-path", path: "$.operation" },
      },
    ] as unknown as EffectAuthoringRecord[]
    const outputDirectory = join(
      temporaryDirectory("fairy-authoring-invalid-"),
      "candidate",
    )
    expect(() =>
      compileAuthoringPilot({
        records: invalid,
        baselineDirectory: BASELINE_DIRECTORY,
        outputDirectory,
      }),
    ).toThrow(/Authoring records are invalid/u)
    expect(existsSync(outputDirectory)).toBe(false)
  })

  it("resolves the authoring mode and rejects unknown values", () => {
    expect(resolveAuthoringMode(undefined)).toBe("authoring")
    expect(resolveAuthoringMode("authoring")).toBe("authoring")
    expect(resolveAuthoringMode("converter-fallback")).toBe(
      "converter-fallback",
    )
    expect(() => resolveAuthoringMode("unknown")).toThrow(
      /Unknown authoring mode/u,
    )
  })

  it("does not apply authoring when the explicit fallback is selected", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const changed = cloneRecords()
    const first = changed[0]
    if (!first) throw new Error("Missing formal record")
    const parameters = ruleRecord(first).parameters as unknown as Record<
      string,
      { kind: string; values?: Record<string, number> }
    >
    const amount = parameters["amount"]
    if (!amount?.values) throw new Error("Missing amount parameters")
    amount.values["1"] = 0.1501

    expect(() =>
      applyStaticEffectsAuthoring(baseline, {
        authoringRecords: changed,
      }),
    ).toThrow(/not semantically equivalent/u)

    const fallback = applyStaticEffectsAuthoring(baseline, {
      authoring: "converter-fallback",
      authoringRecords: changed,
    } satisfies StaticEffectsGenerationOptions)
    expect(fallback).toBe(baseline)

    expect(() =>
      applyStaticEffectsAuthoring(baseline, {
        authoring: "unknown" as never,
      }),
    ).toThrow(/Unknown authoring mode/u)
  })
})

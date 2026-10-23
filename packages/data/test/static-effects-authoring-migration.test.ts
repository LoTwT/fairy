import { existsSync, mkdtempSync, rmSync } from "node:fs"
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
import { CORRECTED_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/records.ts"
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
  return structuredClone(CORRECTED_AUTHORING_RECORDS) as EffectAuthoringRecord[]
}

function ruleRecord(record: EffectAuthoringRecord): EffectAuthoringRuleRecord {
  if (record.mechanism.kind === "unsupported")
    throw new Error(`Expected a rule record: ${record.key}`)
  return record as EffectAuthoringRuleRecord
}

function coverageKey(record: {
  readonly pointer: string
  readonly catalogEntityId: string
}): string {
  return `${record.pointer}|${record.catalogEntityId}`
}

describe("corrected authoring migration records", () => {
  it("accepts eight single-rule corrected records within the P2-2 range", () => {
    const result = validateAuthoringRecords(CORRECTED_AUTHORING_RECORDS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.records.length).toBeGreaterThanOrEqual(5)
    expect(result.records.length).toBeLessThanOrEqual(10)
    expect(result.records).toHaveLength(8)
    expect(new Set(result.records.map((record) => record.key)).size).toBe(8)
    for (const record of result.records) {
      expect(record.coverage.status).toBe("corrected")
      expect(record.coverage.positions).toHaveLength(1)
      expect(record.option.variants).toHaveLength(1)
      expect(record.option.variants[0]?.effectKeys).toEqual([record.key])
      expect(record.mechanism.kind).toBe("single-rule")
      const rule = ruleRecord(record)
      expect(rule.activation.kind).toBe("supplied")
      expect(["entity", "hit"]).toContain(rule.scope)
    }
  })

  it("selects only complete fixed-source corrected positions", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const selectedOptionIds = new Set(
      CORRECTED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    const selectedCoverage = baseline.coverage.records.filter((record) =>
      selectedOptionIds.has(record.optionId),
    )
    expect(selectedCoverage).toHaveLength(8)
    expect(
      selectedCoverage.every((record) => record.status === "corrected"),
    ).toBe(true)
    expect(
      baseline.coverage.records.filter(
        (record) => record.status === "corrected",
      ),
    ).toHaveLength(116)
    expect(
      baseline.coverage.supplementalRecords.filter(
        (record) =>
          record.optionId !== undefined &&
          selectedOptionIds.has(record.optionId),
      ),
    ).toEqual([])

    for (const record of CORRECTED_AUTHORING_RECORDS) {
      const position = record.coverage.positions[0]
      if (!position) throw new Error(`Missing position for ${record.key}`)
      const baselineRow = baseline.coverage.records.find(
        (row) => row.optionId === record.ids.optionId,
      )
      expect(baselineRow?.pointer).toBe(position.pointer)
      expect(baselineRow?.catalogEntityId).toBe(record.entity.catalogEntityId)
      expect(baselineRow?.status).toBe("corrected")
      expect(baselineRow?.effectIds).toEqual([record.ids.effectId])
    }
  })

  it("projects each record to one corrected option, rule and coverage row", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      CORRECTED_AUTHORING_RECORDS,
      baseline,
    )
    expect(compilation.ruleIds).toHaveLength(8)
    expect(compilation.optionIds).toHaveLength(8)
    expect(compilation.coverageKeys).toHaveLength(8)
    expect(compilation.skillTargetIds).toEqual([])

    for (const record of CORRECTED_AUTHORING_RECORDS) {
      const authoring = ruleRecord(record)
      const option = compilation.artifacts.catalog.options.find(
        (candidate) => candidate.optionId === record.ids.optionId,
      )
      expect(option?.catalogEntityId).toBe(record.entity.catalogEntityId)
      expect(option?.variants).toHaveLength(1)
      expect(option?.variants[0]?.status).toBe("corrected")
      expect(option?.variants[0]?.effectIds).toEqual([record.ids.effectId])
      expect(option?.variants[0]?.differences).toEqual(
        record.coverage.differenceIds,
      )
      expect(option?.variants[0]?.references).toEqual(authoring.references)

      const rule = compilation.artifacts.definitions.effects.find(
        (candidate) => candidate.effectId === record.ids.effectId,
      )
      expect(rule?.kind).toBe("contribution")
      if (rule?.kind === "contribution") {
        expect(rule.source.identity).toEqual(record.entity.identity)
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

      const coverage = compilation.artifacts.coverage.records.find(
        (candidate) =>
          candidate.optionId === record.ids.optionId &&
          candidate.pointer === record.coverage.positions[0]?.pointer,
      )
      expect(coverage?.status).toBe("corrected")
      expect(coverage?.effectIds).toEqual([record.ids.effectId])
      expect(coverage?.normalizationChanges).toEqual(
        record.coverage.positions[0]?.normalizationChanges,
      )
      expect(coverage?.rawValue).toBe(record.coverage.positions[0]?.rawValue)
      expect(coverage?.normalizedValue).toBe(
        record.coverage.positions[0]?.normalizedValue,
      )
    }
  })

  it("leaves every unselected entry unchanged", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      CORRECTED_AUTHORING_RECORDS,
      baseline,
    )
    const selectedEffectIds = new Set(
      CORRECTED_AUTHORING_RECORDS.map((record) => record.ids.effectId),
    )
    const selectedOptionIds = new Set(
      CORRECTED_AUTHORING_RECORDS.map((record) => record.ids.optionId),
    )
    const selectedCoverageKeys = new Set(
      CORRECTED_AUTHORING_RECORDS.flatMap((record) =>
        record.coverage.positions.map((position) =>
          coverageKey({
            pointer: position.pointer,
            catalogEntityId: record.entity.catalogEntityId,
          }),
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
    expect(compareStaticArtifacts(baseline, compilation.artifacts)).toEqual({
      equivalent: true,
      differences: [],
    })
  })

  it("uses authoring values instead of selected baseline semantics", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const target = CORRECTED_AUTHORING_RECORDS[0]
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

  it("formats byte-identical artifacts for the selected records", async () => {
    const result = await verifyFormalAuthoring({
      outputDirectory: join(
        temporaryDirectory("fairy-authoring-migration-"),
        "output",
      ),
    })
    expect(result.recordCount).toBe(8)
    expect(result.equivalent).toBe(true)
    expect(result.differences).toEqual([])
    expect(result.byteIdentical).toBe(true)
    for (const hash of result.hashes) expect(hash.candidate).toBe(hash.baseline)
  })

  it("rejects structurally invalid authoring before writing a candidate", () => {
    const record = CORRECTED_AUTHORING_RECORDS[0]
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

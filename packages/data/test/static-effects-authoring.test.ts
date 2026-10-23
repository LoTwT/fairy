import { createHash } from "node:crypto"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it } from "vitest"
import { parseEffectRuleSet } from "../../core/src/effects/index.ts"
import { compareStaticArtifacts } from "../scripts/static-effects/authoring/canonical.ts"
import {
  compileAuthoringPilot,
  readStaticArtifacts,
  unsupportedRecordCount,
} from "../scripts/static-effects/authoring/compile.ts"
import { PILOT_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/pilot-records.ts"
import type {
  EffectAuthoringRecord,
  EffectAuthoringRuleRecord,
} from "../scripts/static-effects/authoring/types.ts"
import { validateAuthoringRecords } from "../scripts/static-effects/authoring/validation.ts"

const BASELINE_DIRECTORY = fileURLToPath(
  new URL("../definitions/effects", import.meta.url),
)
const ARTIFACT_FILES = [
  "static.json",
  "static-catalog.json",
  "static-coverage.json",
] as const
const temporaryDirectories: string[] = []

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

afterAll(() => {
  for (const directory of temporaryDirectories)
    rmSync(directory, { recursive: true, force: true })
})

function cloneRecords(): EffectAuthoringRecord[] {
  return structuredClone(PILOT_AUTHORING_RECORDS) as EffectAuthoringRecord[]
}

function ruleRecord(record: EffectAuthoringRecord): EffectAuthoringRuleRecord {
  if (record.mechanism.kind === "unsupported")
    throw new Error(`Expected a rule record: ${record.key}`)
  return record as EffectAuthoringRuleRecord
}

describe("authoring pilot records", () => {
  it("accepts the 12 representative records", () => {
    const result = validateAuthoringRecords(PILOT_AUTHORING_RECORDS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.records).toHaveLength(12)
    expect(new Set(result.records.map((record) => record.key)).size).toBe(12)
    expect(unsupportedRecordCount(result.records)).toBe(3)
  })

  it.each([
    [
      "operation",
      (record: EffectAuthoringRecord) =>
        ({
          ...record,
          operation: { kind: "json-path", path: "$.operation" },
        }) as unknown,
      "/operation/kind",
    ],
    [
      "condition",
      (record: EffectAuthoringRecord) =>
        ({
          ...record,
          when: { kind: "json-path", path: "$.when" },
        }) as unknown,
      "/when/kind",
    ],
    [
      "mechanism",
      (record: EffectAuthoringRecord) =>
        ({
          ...record,
          mechanism: { kind: "json-path", path: "$.mechanism" },
        }) as unknown,
      "/mechanism/kind",
    ],
  ])("rejects an unknown %s kind with a field path", (_label, mutate, path) => {
    const [first] = PILOT_AUTHORING_RECORDS
    if (!first) throw new Error("Pilot records are empty")
    const result = validateAuthoringRecords([mutate(first)])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.path.endsWith(path))).toBe(true)
  })

  it("rejects unsupported coverage without a migration mechanism", () => {
    const [first] = cloneRecords()
    if (!first) throw new Error("Pilot records are empty")
    const mutated = {
      ...first,
      coverage: {
        ...first.coverage,
        status: "unsupported",
        reason: "semantic-conflict",
        explanation: "migration",
      },
      mechanism: { kind: "single-rule" },
    }
    const result = validateAuthoringRecords([mutated])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.issues.some((issue) => issue.path.endsWith("/coverage/status")),
    ).toBe(true)
  })
})

describe("authoring compiler and semantic harness", () => {
  it("compiles selected entries to a temp directory and matches all three artifacts", () => {
    const outputDirectory = temporaryDirectory("fairy-authoring-pass-")
    const compilation = compileAuthoringPilot({
      records: PILOT_AUTHORING_RECORDS,
      baselineDirectory: BASELINE_DIRECTORY,
      outputDirectory,
    })
    expect(compilation.recordCount).toBe(12)
    expect(compilation.ruleIds).toHaveLength(9)
    expect(compilation.optionIds).toHaveLength(10)
    expect(compilation.coverageKeys).toHaveLength(12)
    expect(compilation.skillTargetIds).toHaveLength(2)

    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const candidate = readStaticArtifacts(outputDirectory)
    const comparison = compareStaticArtifacts(baseline, candidate)
    expect(comparison.differences).toEqual([])
    expect(comparison.equivalent).toBe(true)

    expect(candidate.definitions.revision).toBe(baseline.definitions.revision)
    expect(candidate.definitions.effects).toHaveLength(
      baseline.definitions.effects.length,
    )
    expect(candidate.catalog.options).toHaveLength(
      baseline.catalog.options.length,
    )
    expect(candidate.coverage.records).toHaveLength(
      baseline.coverage.records.length,
    )

    const parsed = parseEffectRuleSet(candidate.definitions)
    expect(parsed.ok).toBe(true)

    const coverageKeys = new Set(compilation.coverageKeys)
    const selectedCoverage = candidate.coverage.records.filter((record) =>
      coverageKeys.has(`${record.pointer}|${record.catalogEntityId}`),
    )
    expect(selectedCoverage).toHaveLength(12)
    expect(
      selectedCoverage.filter((record) => record.status === "converted"),
    ).toHaveLength(7)
    expect(
      selectedCoverage.filter((record) => record.status === "corrected"),
    ).toHaveLength(2)
    expect(
      selectedCoverage.filter((record) => record.status === "unsupported"),
    ).toHaveLength(3)
  })

  it("reports a semantic difference when one authoring value is corrupted", () => {
    const records = cloneRecords()
    const anby = records.find((record) => record.key === "anby-m2-damage-bonus")
    if (!anby) throw new Error("Missing Anby pilot record")
    const rule = ruleRecord(anby)
    const mutated: EffectAuthoringRecord = {
      ...rule,
      parameters: {
        ...rule.parameters,
        amount: { kind: "constant", unit: "ratio", value: 0.3001 },
      },
    }
    records[records.indexOf(anby)] = mutated

    const outputDirectory = temporaryDirectory("fairy-authoring-negative-")
    const compilation = compileAuthoringPilot({
      records,
      baselineDirectory: BASELINE_DIRECTORY,
      outputDirectory,
    })
    const comparison = compareStaticArtifacts(
      readStaticArtifacts(BASELINE_DIRECTORY),
      readStaticArtifacts(compilation.outputDirectory),
    )
    expect(comparison.equivalent).toBe(false)
    expect(
      comparison.differences.some(
        (difference) =>
          difference.path.includes("agent:1011:") &&
          difference.path.endsWith("/parameters/amount/value"),
      ),
    ).toBe(true)
  })

  it("is deterministic for repeated compilation", () => {
    const first = compileAuthoringPilot({
      records: PILOT_AUTHORING_RECORDS,
      baselineDirectory: BASELINE_DIRECTORY,
      outputDirectory: temporaryDirectory("fairy-authoring-determinism-a-"),
    })
    const second = compileAuthoringPilot({
      records: PILOT_AUTHORING_RECORDS,
      baselineDirectory: BASELINE_DIRECTORY,
      outputDirectory: temporaryDirectory("fairy-authoring-determinism-b-"),
    })
    for (const file of ARTIFACT_FILES)
      expect(sha256(join(first.outputDirectory, file))).toBe(
        sha256(join(second.outputDirectory, file)),
      )
  }, 20_000)

  it("refuses to write into the official definitions directory", () => {
    const forbidden = join(
      BASELINE_DIRECTORY,
      "authoring-pilot-should-not-write",
    )
    expect(() =>
      compileAuthoringPilot({
        records: PILOT_AUTHORING_RECORDS,
        baselineDirectory: BASELINE_DIRECTORY,
        outputDirectory: forbidden,
      }),
    ).toThrow(/must not write into a managed/u)
    expect(existsSync(forbidden)).toBe(false)
  })

  it("does not modify the official artifacts", () => {
    const before = ARTIFACT_FILES.map((file) =>
      sha256(join(BASELINE_DIRECTORY, file)),
    )
    compileAuthoringPilot({
      records: PILOT_AUTHORING_RECORDS,
      baselineDirectory: BASELINE_DIRECTORY,
      outputDirectory: temporaryDirectory("fairy-authoring-official-"),
    })
    const after = ARTIFACT_FILES.map((file) =>
      sha256(join(BASELINE_DIRECTORY, file)),
    )
    expect(after).toEqual(before)
  })
})

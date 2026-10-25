import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { compareStaticArtifacts } from "../scripts/static-effects/authoring/canonical.ts"
import {
  compileAuthoringArtifacts,
  compileAuthoringRecords,
  readStaticArtifacts,
  replaceSupplementalRecords,
  summarizeCompilation,
  type StaticArtifacts,
  type StaticCoverageDocument,
} from "../scripts/static-effects/authoring/compile.ts"
import { MIGRATED_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/records.ts"
import type {
  AuthoringSupplementalRecord,
  EffectAuthoringRecord,
} from "../scripts/static-effects/authoring/types.ts"
import { validateAuthoringRecords } from "../scripts/static-effects/authoring/validation.ts"

const BASELINE_DIRECTORY = fileURLToPath(
  new URL("../definitions/effects", import.meta.url),
)
const MIYABI_OPTION_ID = "nanoka:agents:miyabi:frostburn-break-damage"
const MIYABI_SUPPLEMENT_ID = MIYABI_OPTION_ID

/**
 * 正式制品中霜灼·破补充记录的真实形状，键序刻意不同于基线，用于验证
 * 原位替换沿用基线条目的键序。
 */
const MIYABI_SUPPLEMENT: AuthoringSupplementalRecord = {
  status: "integrated",
  supplementId: MIYABI_SUPPLEMENT_ID,
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1091 /passive/level/1091501—1091507/desc/0 + /talent/4/desc",
  kind: "option",
  optionId: MIYABI_OPTION_ID,
  effectIds: [
    "agent:1091:nanoka:frostburn-break-damage:mindscape:0",
    "agent:1091:nanoka:m4-rupture-frostburn-break-bonus:mindscape:4",
  ],
  supportedRanks: "核心 1—7；影画 0—6",
  computationTarget: "catalog option on the mapped agent entity",
}

function cloneRecords(): EffectAuthoringRecord[] {
  return structuredClone(MIGRATED_AUTHORING_RECORDS) as EffectAuthoringRecord[]
}

function cloneRecordsWithoutSupplements(): EffectAuthoringRecord[] {
  return cloneRecords().map((record) => {
    const { supplementalRecords: _supplementalRecords, ...withoutSupplements } =
      record
    return withoutSupplements
  })
}

function attachSupplements(
  records: EffectAuthoringRecord[],
  recordKey: string,
  supplements: readonly AuthoringSupplementalRecord[],
): EffectAuthoringRecord[] {
  const index = records.findIndex((record) => record.key === recordKey)
  const record = records[index]
  if (!record) throw new Error(`Missing authoring record: ${recordKey}`)
  records[index] = { ...record, supplementalRecords: supplements }
  return records
}

function supplementalIndex(coverage: StaticCoverageDocument): number {
  const index = coverage.supplementalRecords.findIndex(
    (record) => record.supplementId === MIYABI_SUPPLEMENT_ID,
  )
  if (index < 0) throw new Error("Missing Miyabi supplemental record")
  return index
}

describe("authoring supplemental records", () => {
  it("declares 55 real supplemental records matching the baseline", () => {
    expect(MIGRATED_AUTHORING_RECORDS).toHaveLength(85)
    const declared = MIGRATED_AUTHORING_RECORDS.flatMap((record) =>
      (record.supplementalRecords ?? []).map((supplement) => ({
        recordKey: record.key,
        supplement,
      })),
    )
    expect(declared).toHaveLength(55)
    expect(
      new Set(declared.map(({ supplement }) => supplement.supplementId)).size,
    ).toBe(55)
    expect(declared[0]?.recordKey).toBe("miyabi-frostburn-main")

    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const baselineById = new Map(
      baseline.coverage.supplementalRecords.map((record) => [
        record.supplementId,
        record,
      ]),
    )
    const miyabiRecord = baselineById.get(MIYABI_SUPPLEMENT_ID)
    expect(miyabiRecord).toBeDefined()
    expect(declared[0]?.supplement).toEqual(miyabiRecord)
    expect(Object.keys(declared[0]?.supplement ?? {})).toEqual(
      Object.keys(miyabiRecord ?? {}),
    )

    for (const { supplement } of declared) {
      const baselineRecord = baselineById.get(supplement.supplementId)
      expect(baselineRecord).toBeDefined()
      expect(supplement).toEqual(baselineRecord)
      expect(Object.keys(supplement)).toEqual(Object.keys(baselineRecord ?? {}))
    }
  })

  it("replaces the real Miyabi supplemental record in place", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const index = supplementalIndex(baseline.coverage)
    const baselineRecord = baseline.coverage.supplementalRecords[index]
    expect(baselineRecord).toEqual(MIYABI_SUPPLEMENT)

    const records = attachSupplements(
      cloneRecordsWithoutSupplements(),
      "miyabi-frostburn-main",
      [MIYABI_SUPPLEMENT],
    )
    const compilation = compileAuthoringRecords(records, baseline)
    const supplementalRecords =
      compilation.artifacts.coverage.supplementalRecords

    expect(compilation.supplementalRecordIds).toEqual([MIYABI_SUPPLEMENT_ID])
    expect(supplementalRecords).toHaveLength(101)
    expect(supplementalRecords[index]).toEqual(MIYABI_SUPPLEMENT)
    expect(Object.keys(supplementalRecords[index] ?? {})).toEqual(
      Object.keys(baselineRecord ?? {}),
    )
    expect(
      supplementalRecords.filter((_, position) => position !== index),
    ).toEqual(
      baseline.coverage.supplementalRecords.filter(
        (_, position) => position !== index,
      ),
    )
    expect(summarizeCompilation(compilation)).toContain(
      "supplemental records: 1",
    )
    expect(compareStaticArtifacts(baseline, compilation.artifacts)).toEqual({
      equivalent: true,
      differences: [],
    })
  })

  it("uses authoring supplemental values instead of the baseline", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const index = supplementalIndex(baseline.coverage)
    const mutatedCoverage = structuredClone(baseline.coverage) as unknown as {
      supplementalRecords: Array<Record<string, unknown>>
    }
    const mutated = mutatedCoverage.supplementalRecords[index]
    if (!mutated) throw new Error("Missing Miyabi supplemental record")
    mutated["source"] = "baseline mutation"
    mutated["kind"] = "entity"
    mutated["effectIds"] = []
    mutated["supportedRanks"] = "baseline mutation"
    mutated["computationTarget"] = "baseline mutation"
    mutated["status"] = "out-of-scope"
    const mutatedBaseline: StaticArtifacts = {
      ...baseline,
      coverage: mutatedCoverage as unknown as StaticCoverageDocument,
    }

    const records = attachSupplements(
      cloneRecordsWithoutSupplements(),
      "miyabi-frostburn-main",
      [MIYABI_SUPPLEMENT],
    )
    const compilation = compileAuthoringRecords(records, mutatedBaseline)
    const compiled = compilation.artifacts.coverage.supplementalRecords[index]
    expect(compiled).toEqual(MIYABI_SUPPLEMENT)

    const comparison = compareStaticArtifacts(
      mutatedBaseline,
      compilation.artifacts,
    )
    expect(comparison.equivalent).toBe(false)
    for (const field of [
      "source",
      "kind",
      "effectIds",
      "supportedRanks",
      "computationTarget",
      "status",
    ])
      expect(
        comparison.differences.some((difference) =>
          difference.path.includes(
            `/coverage/supplementalRecords/${MIYABI_SUPPLEMENT_ID}/${field}`,
          ),
        ),
      ).toBe(true)
  })

  it("leaves supplemental records untouched when none are declared", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const compilation = compileAuthoringRecords(
      cloneRecordsWithoutSupplements(),
      baseline,
    )
    expect(compilation.supplementalRecordIds).toEqual([])
    expect(compilation.artifacts.coverage.supplementalRecords).toEqual(
      baseline.coverage.supplementalRecords,
    )
    expect(summarizeCompilation(compilation)).toContain(
      "supplemental records: 0",
    )
  })

  it("rejects a supplemental ID that is not in the baseline", () => {
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      { ...MIYABI_SUPPLEMENT, supplementId: "authoring:unknown-supplement" },
    ])
    expect(() =>
      compileAuthoringRecords(records, readStaticArtifacts(BASELINE_DIRECTORY)),
    ).toThrow(/not present in the baseline/u)
  })

  it("rejects duplicate supplemental IDs across authoring records", () => {
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      MIYABI_SUPPLEMENT,
    ])
    attachSupplements(records, "miyabi-frostburn-m4", [MIYABI_SUPPLEMENT])

    expect(() =>
      compileAuthoringArtifacts(
        records,
        readStaticArtifacts(BASELINE_DIRECTORY),
      ),
    ).toThrow(/Duplicate authoring supplement ID/u)

    const validation = validateAuthoringRecords(records)
    expect(validation.ok).toBe(false)
    if (validation.ok) return
    expect(
      validation.issues.some(
        (issue) =>
          issue.path.endsWith("/supplementId") &&
          issue.message.includes("duplicate supplement ID"),
      ),
    ).toBe(true)
  })

  it("rejects a supplemental optionId that differs from its record", () => {
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      {
        ...MIYABI_SUPPLEMENT,
        optionId:
          "agents:anby:mindscape:2:blk-ms47xm3l-3pumvj:eff-ms47xm3l-nf7ga7",
      },
    ])
    const validation = validateAuthoringRecords(records)
    expect(validation.ok).toBe(false)
    if (!validation.ok)
      expect(
        validation.issues.some((issue) =>
          issue.path.endsWith("/supplementalRecords[0]/optionId"),
        ),
      ).toBe(true)
    expect(() =>
      compileAuthoringArtifacts(
        records,
        readStaticArtifacts(BASELINE_DIRECTORY),
      ),
    ).toThrow(/declares option/u)
  })

  it.each([
    ["status", "skipped"],
    ["kind", "boundary"],
  ])("rejects an unknown supplemental %s", (field, value) => {
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      {
        ...MIYABI_SUPPLEMENT,
        [field]: value,
      } as unknown as AuthoringSupplementalRecord,
    ])
    const validation = validateAuthoringRecords(records)
    expect(validation.ok).toBe(false)
    if (validation.ok) return
    expect(
      validation.issues.some((issue) =>
        issue.path.endsWith(`/supplementalRecords[0]/${field}`),
      ),
    ).toBe(true)
  })

  it("rejects supplemental effect IDs unknown to the compilation and baseline", () => {
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      {
        ...MIYABI_SUPPLEMENT,
        effectIds: ["agent:0000:unknown:effect"],
      },
    ])
    expect(() =>
      compileAuthoringRecords(records, readStaticArtifacts(BASELINE_DIRECTORY)),
    ).toThrow(/references unknown effect ID agent:0000:unknown:effect/u)
  })

  it("reports a path error for a missing supplemental field", () => {
    const { computationTarget: _omitted, ...incomplete } = MIYABI_SUPPLEMENT
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      incomplete as unknown as AuthoringSupplementalRecord,
    ])
    const recordIndex = records.findIndex(
      (record) => record.key === "miyabi-frostburn-main",
    )
    const result = validateAuthoringRecords(records)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toContainEqual({
      path: `[${recordIndex}]/supplementalRecords[0]/computationTarget`,
      message: "expected a string",
    })
  })

  it("reports a path error for a missing supplemental optionId", () => {
    const { optionId: _omitted, ...incomplete } = MIYABI_SUPPLEMENT
    const records = attachSupplements(cloneRecords(), "miyabi-frostburn-main", [
      incomplete as unknown as AuthoringSupplementalRecord,
    ])
    const recordIndex = records.findIndex(
      (record) => record.key === "miyabi-frostburn-main",
    )
    const result = validateAuthoringRecords(records)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toContainEqual({
      path: `[${recordIndex}]/supplementalRecords[0]/optionId`,
      message: "expected a string",
    })
  })

  it("refuses baseline supplemental fields the authoring layer cannot express", () => {
    const baseline = readStaticArtifacts(BASELINE_DIRECTORY)
    const withReason = baseline.coverage.supplementalRecords.find(
      (record) => record.reason !== undefined,
    )
    if (!withReason) throw new Error("Missing out-of-scope supplemental record")
    expect(() =>
      replaceSupplementalRecords(baseline.coverage, [
        {
          supplementId: withReason.supplementId,
          source: "authoring source",
          kind: "unsupported-option",
          optionId: "authoring:option",
          supportedRanks: "作者声明",
          computationTarget: "authoring target",
          status: "out-of-scope",
        },
      ]),
    ).toThrow(/cannot express .* field reason/u)
  })
})

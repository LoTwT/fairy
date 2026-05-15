import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type CoverageRow = {
  fieldId: string
  fieldClass: string
  status: string
  promotable: boolean
  blockedBy?: string[]
}

type CoverageMatrix = {
  rows: CoverageRow[]
}

type GateReport = {
  releaseReady: boolean
  missingFields: Array<{ fieldId: string }>
  deferredRows: Array<{ fieldId: string }>
  forbiddenRows: Array<{ fieldId: string }>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function assertReleaseGate(report: GateReport) {
  const blockers = [
    ...report.missingFields.map(row => `missing:${row.fieldId}`),
    ...report.deferredRows.map(row => `deferred:${row.fieldId}`),
    ...report.forbiddenRows.map(row => `forbidden:${row.fieldId}`),
  ]

  if (blockers.length > 0)
    throw new Error(`source gate blockers present: ${blockers.join(", ")}`)

  if (!report.releaseReady)
    throw new Error("source gate report is not release ready")
}

describe("missing-fields fail-loud gate", () => {
  it("keeps unresolved source-backed rows machine-readable with blockers", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const unresolved = matrix.rows.filter(row => row.status === "needs-tl-research")

    expect(unresolved).not.toHaveLength(0)
    expect(unresolved.every(row => Array.isArray(row.blockedBy) && row.blockedBy.length > 0)).toBe(true)
    expect(unresolved.map(row => row.fieldId)).toEqual(
      expect.arrayContaining([
        "bangboos.element",
        "driveDiscs.slotAndSubstatTables",
        "rules.disorderFormula",
      ]),
    )
    expect(unresolved.map(row => row.fieldId)).not.toEqual(expect.arrayContaining([
      "metadata.sources",
      "metadata.sourceRefs",
      "agents.promotionExtraStats",
    ]))
  })

  it("fails loudly when missing, deferred, or forbidden rows are present in a release report", () => {
    expect(() =>
      assertReleaseGate({
        releaseReady: false,
        missingFields: [{ fieldId: "driveDiscs.slotAndSubstatTables" }],
        deferredRows: [],
        forbiddenRows: [],
      }),
    ).toThrow("missing:driveDiscs.slotAndSubstatTables")

    expect(() =>
      assertReleaseGate({
        releaseReady: false,
        missingFields: [],
        deferredRows: [{ fieldId: "metadata.aliases" }],
        forbiddenRows: [],
      }),
    ).toThrow("deferred:metadata.aliases")

    expect(() =>
      assertReleaseGate({
        releaseReady: false,
        missingFields: [],
        deferredRows: [],
        forbiddenRows: [{ fieldId: "deadlyAssault.futurePeriod" }],
      }),
    ).toThrow("forbidden:deadlyAssault.futurePeriod")
  })

  it("passes only when no blockers remain and releaseReady is true", () => {
    expect(() =>
      assertReleaseGate({
        releaseReady: true,
        missingFields: [],
        deferredRows: [],
        forbiddenRows: [],
      }),
    ).not.toThrow()
  })
})

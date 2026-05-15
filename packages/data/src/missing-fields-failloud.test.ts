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
  auditArtifact?: string
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
        "rules.disorderDazeLevelZone",
      ]),
    )
    expect(unresolved.map(row => row.fieldId)).not.toContain("driveDiscs.slotAndSubstatTables")
    expect(unresolved.map(row => row.fieldId)).not.toContain("rules.disorderFormula")
    expect(unresolved.map(row => row.fieldId)).not.toEqual(expect.arrayContaining([
      "metadata.sources",
      "metadata.sourceRefs",
      "agents.promotionExtraStats",
      "bangboos.element",
    ]))
  })

  it("keeps owner-escalated rows machine-readable and non-promotable", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const ownerRows = matrix.rows.filter(row => row.status === "needs-owner-research")
    const driveDiscRow = ownerRows.find(row => row.fieldId === "driveDiscs.slotAndSubstatTables")

    expect(driveDiscRow).toBeDefined()
    expect(driveDiscRow?.promotable).toBe(false)
    expect(driveDiscRow?.blockedBy).toContain("owner:drive-disc-slot-stat-source-required")
    expect(driveDiscRow?.auditArtifact).toBe("data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json")
  })

  it("keeps implementation-owned formulas out of TL research rows", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const disorderFormulaRow = matrix.rows.find(row => row.fieldId === "rules.disorderFormula")

    expect(disorderFormulaRow).toBeDefined()
    expect(disorderFormulaRow?.status).toBe("deferred")
    expect(disorderFormulaRow?.blockedBy).toContain("implementation-owned-runtime-formula")
    expect(disorderFormulaRow?.auditArtifact).toBe("data/cleaned/audit/nanoka-disorder-formula-audit.json")
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

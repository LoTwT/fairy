import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const dataPackageRoot = join(repoRoot, "packages/data")
const syncId = "phase3-sync-000-foundation"
const firstSyncId = "phase3-sync-001-g01-g26"

type DriftReport = {
  schemaVersion: string
  syncId: string
  candidate: {
    sourceId: string
    sourceVersion: string
    contentHash: string
  }
  baselines: Array<{
    sourceId: string
    sourceVersion: string
    archived: boolean
  }>
  matrixStatus: string
  runtimeCutoverReady: boolean
  exitCleanSyncEligible: boolean
  counts: Record<"same" | "changed" | "missing" | "new" | "semantic-mismatch", number>
  rows: Array<{
    entityType: string
    entityId: string
    fieldId: string
    candidateSourceRef: {
      sourceId: string
      sourceVersion: string
      sourceAnchor: string
      dataPath: string
    }
    baselineValue: unknown
    candidateValue: {
      coverageStatus: string
      fieldIds: string[]
      requiredSampleEntities: string[]
      availableSampleEntities: string[]
      missingRequiredSampleEntities: string[]
      rulingSummary?: string
    }
    status: string
    severity: string
    rulingStatus: string
    rulingId?: string
    rulingDecisionLog?: string
    blockedBy: string[]
  }>
  unresolvedCount: number
  exitGateEvidence?: {
    cleanSyncIds: string[]
    anchorIds: string[]
    goldenReplayStatus: string
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function npmPackFiles(): string[] {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: dataPackageRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  const result = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>
  return result[0]?.files.map(file => file.path) ?? []
}

describe("Phase 3 source migration drift report foundation", () => {
  it("passes the executable source-migration verifier", () => {
    const output = execFileSync("node", ["scripts/source-migration-drift.mjs", "verify", "--sync-id", syncId], {
      cwd: dataPackageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })

    expect(output).toContain(`source migration drift verification passed for ${syncId}`)
  })

  it("keeps the package drift report mirror byte-identical", () => {
    expect(readFileSync(join(repoRoot, `packages/data/cleaned/audit/nanoka-drift-report/${syncId}.json`), "utf8")).toBe(
      readFileSync(join(repoRoot, `data/cleaned/audit/nanoka-drift-report/${syncId}.json`), "utf8"),
    )
  })

  it("locks the minimal report contract without runtime cutover", () => {
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${syncId}.json`)

    expect(report).toMatchObject({
      schemaVersion: "nanoka-drift-report/v0.1",
      syncId,
      candidate: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        contentHash: "sha256:91494c2c3bfda6ec47beccbf71066506ab0a315513aa751cf30e4c3a1dc0817d",
      },
      matrixStatus: "phase-3-drift-foundation-gate",
      runtimeCutoverReady: false,
      exitCleanSyncEligible: false,
      counts: {
        same: 0,
        changed: 0,
        missing: 0,
        new: 0,
        "semantic-mismatch": 0,
      },
      unresolvedCount: 0,
    })
    expect(report.rows).toEqual([])
    expect(report.baselines).toEqual(expect.arrayContaining([
      {
        sourceId: "lo-user-excel",
        sourceVersion: "2.6.0_R14028417",
        archived: true,
      },
      {
        sourceId: "mihoyo-zzz-critical-assault",
        sourceVersion: "2026-05-05T0850Z",
        archived: true,
      },
      {
        sourceId: "buhflipexplode-zzz-da",
        sourceVersion: "2026-05-05T0445Z",
        archived: true,
      },
    ]))
  })

  it("rejects non-same drift rows that try to bypass the ruling queue", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "fairy-drift-report-"))
    const fixturePath = join(tempDir, "bypassing-report.json")
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${syncId}.json`)
    const bypassingReport = {
      ...report,
      counts: {
        same: 0,
        changed: 1,
        missing: 0,
        new: 0,
        "semantic-mismatch": 0,
      },
      rows: [
        {
          entityType: "agent",
          entityId: "1021",
          fieldId: "agents.baseStats",
          canonicalPath: "GameData.agents[1021].baseStats",
          fieldPath: "/stats",
          baselineSourceRef: {
            sourceId: "lo-user-excel",
            sourceVersion: "2.6.0_R14028417",
            sourceAnchor: "data/source/excel/data.xlsx",
            dataPath: "/agents/1021/baseStats",
          },
          candidateSourceRef: {
            sourceId: "nanoka-zzz",
            sourceVersion: "2.8",
            sourceAnchor: "https://static.nanoka.cc/zzz/2.8/zh/character/1021.json",
            dataPath: "/stats",
          },
          baselineValue: "excel",
          candidateValue: "nanoka",
          status: "changed",
          severity: "blocking",
          rulingStatus: "not-required",
          rulingId: "D-TEST-BYPASS",
          blockedBy: [],
          notes: "Regression fixture for Gate 8 ruling queue bypass.",
        },
      ],
      unresolvedCount: 0,
    }

    try {
      writeFileSync(fixturePath, `${JSON.stringify(bypassingReport, null, 2)}\n`)

      expect(() =>
        execFileSync("node", ["scripts/source-migration-drift.mjs", "verify-fixture", "--sync-id", syncId, "--report", fixturePath], {
          cwd: dataPackageRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      ).toThrow("non-same rows require explicit ruling queue status")
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("rejects resolved non-same drift rows without decision-log backlinks", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "fairy-drift-report-"))
    const fixturePath = join(tempDir, "missing-ruling-log-report.json")
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${firstSyncId}.json`)
    const missingBacklinkReport = {
      ...report,
      rows: report.rows.map((row, index) => {
        if (index !== 0)
          return row
        const withoutBacklink = { ...row }
        delete withoutBacklink.rulingDecisionLog
        return withoutBacklink
      }),
    }

    try {
      writeFileSync(fixturePath, `${JSON.stringify(missingBacklinkReport, null, 2)}\n`)

      expect(() =>
        execFileSync("node", ["scripts/source-migration-drift.mjs", "verify-fixture", "--sync-id", firstSyncId, "--report", fixturePath], {
          cwd: dataPackageRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      ).toThrow("resolved non-same rows require rulingDecisionLog")
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("rejects first-sync reports that claim exit-clean eligibility before G27/G28 and two clean syncs", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "fairy-drift-report-"))
    const fixturePath = join(tempDir, "premature-exit-clean-report.json")
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${firstSyncId}.json`)
    const prematureExitCleanReport = {
      ...report,
      exitCleanSyncEligible: true,
    }

    try {
      writeFileSync(fixturePath, `${JSON.stringify(prematureExitCleanReport, null, 2)}\n`)

      expect(() =>
        execFileSync("node", ["scripts/source-migration-drift.mjs", "verify-fixture", "--sync-id", firstSyncId, "--report", fixturePath], {
          cwd: dataPackageRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      ).toThrow("first G01-G26 sync cannot be exit-clean eligible before G27/G28 and two clean sync evidence")
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("documents the no-runtime-fallback boundary in the human report", () => {
    const report = readFileSync(join(repoRoot, `docs/data-source/drift-reports/${syncId}.md`), "utf8")

    expect(report).toContain(`# Nanoka Drift Report: ${syncId}`)
    expect(report).toContain("full G01-G26 comparison begins in the next Phase 3 slice")
    expect(report).toContain("Archived Excel / D-17 / D-12 sources remain audit baselines")
    expect(report).toContain("Runtime cutover ready: **false**")
  })

  it("verifies the first G01-G26 sync report", () => {
    const output = execFileSync("node", ["scripts/source-migration-drift.mjs", "verify", "--sync-id", firstSyncId], {
      cwd: dataPackageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${firstSyncId}.json`)

    expect(output).toContain(`source migration drift verification passed for ${firstSyncId}`)
    expect(report).toMatchObject({
      schemaVersion: "nanoka-drift-report/v0.1",
      syncId: firstSyncId,
      candidate: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
      },
      runtimeCutoverReady: false,
      exitCleanSyncEligible: false,
      counts: {
        same: 0,
        changed: 0,
        missing: 0,
        new: 0,
        "semantic-mismatch": 26,
      },
      unresolvedCount: 0,
    })
    expect(report.rows).toHaveLength(26)
    expect(report.rows.map(row => row.entityId)).toEqual(Array.from({ length: 26 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`))
    expect(report.rows.every(row =>
      row.severity === "info"
      && row.rulingStatus === "accepted"
      && row.rulingId?.startsWith("phase3-r")
      && row.rulingDecisionLog?.startsWith("docs/product/decisions/data-source-rulings.md#phase3-r")
      && row.blockedBy.length === 0,
    )).toBe(true)
    expect(report.rows.some(row => row.candidateSourceRef.sourceAnchor.startsWith("data/source/raw/nanoka/zzz/2.8/"))).toBe(true)
    expect(report.rows.some(row => row.candidateSourceRef.sourceAnchor.endsWith("nanoka-disorder-formula-audit.json"))).toBe(true)
    expect(report.rows.every(row => row.fieldId.endsWith(".nanokaCandidateCoverage"))).toBe(true)
    expect(report.rows.every(row => row.baselineValue !== "passed")).toBe(true)
    expect(report.rows.every(row => row.candidateValue.coverageStatus !== "passed")).toBe(true)
    expect(report.rows.every(row => row.status === "semantic-mismatch")).toBe(true)
    expect(report.rows.every(row => row.candidateValue.rulingSummary !== undefined)).toBe(true)

    const g22 = report.rows.find(row => row.entityId === "G22")
    const g24 = report.rows.find(row => row.entityId === "G24")
    const g26 = report.rows.find(row => row.entityId === "G26")
    expect(g22).toMatchObject({
      status: "semantic-mismatch",
      rulingStatus: "accepted",
      rulingId: "phase3-r022",
      candidateValue: {
        missingRequiredSampleEntities: [],
        requiredSampleEntities: ["nanoka-character-nicole-live-1031"],
      },
      candidateSourceRef: {
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/character/1031.json",
        dataPath: "/stats",
      },
    })
    expect(g24).toMatchObject({
      status: "semantic-mismatch",
      rulingStatus: "accepted",
      rulingId: "phase3-r024",
      candidateValue: {
        missingRequiredSampleEntities: [],
        requiredSampleEntities: ["nanoka-bangboo-penguinboo-live-53001"],
      },
      candidateSourceRef: {
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/bangboo/53001.json",
        dataPath: "/stats",
      },
    })
    expect(g26).toMatchObject({
      status: "semantic-mismatch",
      rulingStatus: "accepted",
      rulingId: "phase3-r026",
      candidateSourceRef: {
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json",
        dataPath: "/stats",
      },
      candidateValue: {
        coverageStatus: "candidate-covered-not-yet-ruled-equivalent",
        requiredSampleEntities: ["nanoka-bangboo-plugboo-live-54008"],
      },
    })
  })

  it("keeps the first sync report mirror and human report in sync", () => {
    expect(readFileSync(join(repoRoot, `packages/data/cleaned/audit/nanoka-drift-report/${firstSyncId}.json`), "utf8")).toBe(
      readFileSync(join(repoRoot, `data/cleaned/audit/nanoka-drift-report/${firstSyncId}.json`), "utf8"),
    )

    const report = readFileSync(join(repoRoot, `docs/data-source/drift-reports/${firstSyncId}.md`), "utf8")
    expect(report).toContain(`# Nanoka Drift Report: ${firstSyncId}`)
    expect(report).toContain("Phase 3 drift audit first G01-G26 sync")
    expect(report).toContain("Unresolved blocking drift rows: **0**")
    expect(report).toContain("Exit-clean sync eligible: **false**")
    expect(report).toContain("`phase3-r026`")
    expect(report).toContain("`goldenAnchors.G26.nanokaCandidateCoverage`")
    expect(report).toContain("Runtime cutover ready: **false**")
  })

  it("packs the drift report artifact without raw source archives", () => {
    const files = npmPackFiles()

    expect(files).toContain(`cleaned/audit/nanoka-drift-report/${syncId}.json`)
    expect(files).toContain(`cleaned/audit/nanoka-drift-report/${firstSyncId}.json`)
    expect(files.some(file => file.startsWith("source/raw/"))).toBe(false)
    expect(files.some(file => file.endsWith(".xlsx"))).toBe(false)
  })
})

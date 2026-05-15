import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const dataPackageRoot = join(repoRoot, "packages/data")
const syncId = "phase3-sync-000-foundation"
const firstSyncId = "phase3-sync-001-g01-g26"
const secondSyncId = "phase3-sync-002-g27-g28"

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
      normalizedValues?: unknown
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
    requiredNewProofAnchorIds?: string[]
    previousCleanSyncId?: string
    currentSyncId?: string
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function nanokaContentHash(): string {
  const registry = readJson<{ sources: Array<{ sourceId: string, contentHash: string }> }>("data/source-registry.json")
  const source = registry.sources.find(item => item.sourceId === "nanoka-zzz")
  expect(source, "missing nanoka source registry entry").toBeDefined()
  return source!.contentHash
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
        contentHash: nanokaContentHash(),
      },
      matrixStatus: "phase-4-runtime-cutover-gate",
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

  it("verifies the second G27/G28 sync report and exit-clean evidence", () => {
    const output = execFileSync("node", ["scripts/source-migration-drift.mjs", "verify", "--sync-id", secondSyncId], {
      cwd: dataPackageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${secondSyncId}.json`)

    expect(output).toContain(`source migration drift verification passed for ${secondSyncId}`)
    expect(report).toMatchObject({
      schemaVersion: "nanoka-drift-report/v0.1",
      syncId: secondSyncId,
      candidate: {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
      },
      runtimeCutoverReady: false,
      exitCleanSyncEligible: true,
      counts: {
        same: 0,
        changed: 0,
        missing: 0,
        new: 2,
        "semantic-mismatch": 26,
      },
      unresolvedCount: 0,
      exitGateEvidence: {
        cleanSyncIds: [firstSyncId, secondSyncId],
        requiredNewProofAnchorIds: ["G27", "G28"],
        previousCleanSyncId: firstSyncId,
        currentSyncId: secondSyncId,
        goldenReplayStatus: "passed",
      },
    })
    expect(report.exitGateEvidence?.anchorIds).toEqual(Array.from({ length: 28 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`))
    expect(report.rows).toHaveLength(28)
    expect(report.rows.slice(0, 26).every(row => row.status === "semantic-mismatch" && row.rulingStatus === "accepted")).toBe(true)

    const g27 = report.rows.find(row => row.entityId === "G27")
    const g28 = report.rows.find(row => row.entityId === "G28")
    expect(g27).toMatchObject({
      status: "new",
      rulingStatus: "accepted",
      rulingId: "phase3-r027",
      candidateSourceRef: {
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json",
        dataPath: "/stats",
      },
      candidateValue: {
        coverageStatus: "new-source-proof-passed",
        requiredSampleEntities: ["nanoka-character-yixuan-live-1371"],
        normalizedValues: {
          identity: {
            id: 1371,
            codeName: "Yixuan",
            name: "仪玄",
          },
          level60Panel: {
            maxHp: 7953.8621,
            attack: 872.5748,
            defence: 441.1145,
          },
          resource: {
            maxAdrenaline: 120,
            automaticAdrenalineAccumulation: 2,
            resonanceRecovery: 71.5,
            adrenalineRecovery: 0.52,
          },
          rupture: {
            ruptureLevel: 1,
            ruptureCorrectionFactor: 1,
            ruptureProbability: 0,
          },
        },
      },
    })
    expect(g28).toMatchObject({
      status: "new",
      rulingStatus: "accepted",
      rulingId: "phase3-r028",
      candidateSourceRef: {
        sourceAnchor: "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json",
        dataPath: "/stats",
      },
      candidateValue: {
        coverageStatus: "new-source-proof-passed",
        requiredSampleEntities: ["nanoka-bangboo-plugboo-live-54008"],
        normalizedValues: {
          identity: {
            id: 54008,
            codeName: "Plugboo",
            name: "插头布",
          },
          level60Panel: {
            maxHp: 4210.2983,
            attack: 8057.0996,
            defence: 723.8011,
          },
          activeSkill: {
            damageMultiplier: 5.12,
            dazeMultiplier: 1.87,
            anomalyBuildup: 240,
            element: "electric",
          },
        },
      },
    })
  })

  it("rejects exit-clean reports without G27/G28 proof rows", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "fairy-drift-report-"))
    const fixturePath = join(tempDir, "missing-g28-proof-report.json")
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${secondSyncId}.json`)
    const missingG28Report = {
      ...report,
      rows: report.rows.filter(row => row.entityId !== "G28"),
      counts: {
        ...report.counts,
        new: 1,
      },
    }

    try {
      writeFileSync(fixturePath, `${JSON.stringify(missingG28Report, null, 2)}\n`)

      expect(() =>
        execFileSync("node", ["scripts/source-migration-drift.mjs", "verify-fixture", "--sync-id", secondSyncId, "--report", fixturePath], {
          cwd: dataPackageRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      ).toThrow("exit-clean drift sync requires G28 row evidence")
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("rejects exit-clean reports whose G27/G28 proof values drift from approved-live raw evidence", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "fairy-drift-report-"))
    const fixturePath = join(tempDir, "mutated-proof-values-report.json")
    const report = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${secondSyncId}.json`)
    const mutatedReport = structuredClone(report)
    const g27 = mutatedReport.rows.find(row => row.entityId === "G27")!
    const g28 = mutatedReport.rows.find(row => row.entityId === "G28")!
    const g27Values = g27.candidateValue.normalizedValues as { resource: { adrenalineRecovery: number } }
    const g28Values = g28.candidateValue.normalizedValues as { activeSkill: { damageMultiplier: number, element: string } }
    g27Values.resource.adrenalineRecovery = 0.53
    g28Values.activeSkill.damageMultiplier = 5.13
    g28Values.activeSkill.element = "fire"

    try {
      writeFileSync(fixturePath, `${JSON.stringify(mutatedReport, null, 2)}\n`)

      expect(() =>
        execFileSync("node", ["scripts/source-migration-drift.mjs", "verify-fixture", "--sync-id", secondSyncId, "--report", fixturePath], {
          cwd: dataPackageRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      ).toThrow("G27: proof anchor normalizedValues must match approved-live nanoka raw evidence")
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("rejects forged exit-clean evidence for the second sync", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "fairy-drift-report-"))
    const baseReport = readJson<DriftReport>(`data/cleaned/audit/nanoka-drift-report/${secondSyncId}.json`)
    const tamperedReports = [
      {
        name: "foundation-current-clean-syncs",
        mutate(report: DriftReport) {
          report.exitGateEvidence!.cleanSyncIds = [syncId, secondSyncId]
        },
      },
      {
        name: "duplicate-current-clean-syncs",
        mutate(report: DriftReport) {
          report.exitGateEvidence!.cleanSyncIds = [secondSyncId, secondSyncId]
        },
      },
      {
        name: "truncated-anchor-set",
        mutate(report: DriftReport) {
          report.exitGateEvidence!.anchorIds = ["G27", "G28"]
        },
      },
      {
        name: "mismatched-current-sync-id",
        mutate(report: DriftReport) {
          report.exitGateEvidence!.currentSyncId = firstSyncId
        },
      },
      {
        name: "foundation-previous-sync-id",
        mutate(report: DriftReport) {
          report.exitGateEvidence!.previousCleanSyncId = syncId
          report.exitGateEvidence!.cleanSyncIds = [syncId, secondSyncId]
        },
      },
    ]

    try {
      for (const tampered of tamperedReports) {
        const fixturePath = join(tempDir, `${tampered.name}.json`)
        const report = structuredClone(baseReport)
        tampered.mutate(report)
        writeFileSync(fixturePath, `${JSON.stringify(report, null, 2)}\n`)

        expect(() =>
          execFileSync("node", ["scripts/source-migration-drift.mjs", "verify-fixture", "--sync-id", secondSyncId, "--report", fixturePath], {
            cwd: dataPackageRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          }),
        ).toThrow(/exitGateEvidence|foundation sync/)
      }
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("packs the drift report artifact without raw source archives", () => {
    const files = npmPackFiles()

    expect(files).toContain(`cleaned/audit/nanoka-drift-report/${syncId}.json`)
    expect(files).toContain(`cleaned/audit/nanoka-drift-report/${firstSyncId}.json`)
    expect(files).toContain(`cleaned/audit/nanoka-drift-report/${secondSyncId}.json`)
    expect(files.some(file => file.startsWith("source/raw/"))).toBe(false)
    expect(files.some(file => file.endsWith(".xlsx"))).toBe(false)
  })
})

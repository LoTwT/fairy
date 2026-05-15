import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const dataPackageRoot = join(repoRoot, "packages/data")
const syncId = "phase3-sync-000-foundation"

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
  counts: Record<"same" | "changed" | "missing" | "new" | "semantic-mismatch", number>
  rows: unknown[]
  unresolvedCount: number
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

  it("documents the no-runtime-fallback boundary in the human report", () => {
    const report = readFileSync(join(repoRoot, `docs/data-source/drift-reports/${syncId}.md`), "utf8")

    expect(report).toContain(`# Nanoka Drift Report: ${syncId}`)
    expect(report).toContain("full G01-G26 comparison begins in the next Phase 3 slice")
    expect(report).toContain("Archived Excel / D-17 / D-12 sources remain audit baselines")
    expect(report).toContain("Runtime cutover ready: **false**")
  })

  it("packs the drift report artifact without raw source archives", () => {
    const files = npmPackFiles()

    expect(files).toContain(`cleaned/audit/nanoka-drift-report/${syncId}.json`)
    expect(files.some(file => file.startsWith("source/raw/"))).toBe(false)
    expect(files.some(file => file.endsWith(".xlsx"))).toBe(false)
  })
})

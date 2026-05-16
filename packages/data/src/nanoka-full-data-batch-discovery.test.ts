import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type Discovery = {
  kind: string
  configuredLiveVersion: string
  decisionContext: {
    decisions: Record<string, string>
    excludedOrDeferred: Array<{ field: string }>
  }
  domains: Array<{
    domain: string
    currentLiveIndexCount: number
    currentLiveDetailAccessibleCount: number
    retainedRawDetailCount: number
    runtimeRecordCount: number
    missingRawDetailCount: number
    missingRuntimeRecordCount?: number
    targetRuntimeBucket: string
    schemaFit: string
  }>
  historicalDeadlyAssault: {
    targetBucket: string
    currentLiveBucket: string
    implementationStatus: string
    summary: {
      snapshotCount: number
      historicalRuntimePeriodCount: number
      zoneCount: number
      bossAdjustmentCount: number
      scheduleKnownCount: number
      scheduleMissingCount: number
    }
    policy: string
    snapshots: Array<{
      snapshot: string
      bossIndexCount: number
      scheduleKnownCount: number
      scheduleMissingCount: number
    }>
  }
  recommendedPrSequence: string[]
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka full-data batch discovery", () => {
  it("keeps the canonical discovery artifact readable from the data package", () => {
    const discovery = readJson<Discovery>("packages/data/cleaned/audit/nanoka-full-data-batch-discovery.json")

    expect(discovery.kind).toBe("nanokaFullDataBatchDiscovery")
  })

  it("locks the lo-user/Product batch decisions before implementation PRs", () => {
    const discovery = readJson<Discovery>("packages/data/cleaned/audit/nanoka-full-data-batch-discovery.json")

    expect(discovery.kind).toBe("nanokaFullDataBatchDiscovery")
    expect(discovery.configuredLiveVersion).toBe("2.8")
    expect(discovery.decisionContext.decisions).toMatchObject({
      batchOrder: "sequential-per-domain",
      enemyScope: "all-current-live-monster-index-records",
      deadlyAssaultScope: "current-live-plus-historical-periods-in-a-dedicated-historicalDAPeriods-bucket",
      versionBumpPolicy: "do-not-bump-until-batch-work-is-complete",
      goldenAnchorPolicy: "do-not-add-new-golden-anchors",
      sourceConsistencyPolicy: "nanoka-self-consistency",
    })
    expect(discovery.decisionContext.excludedOrDeferred.map(item => item.field)).toEqual(expect.arrayContaining([
      "resonium",
      "driveDiscs.slotAndSubstatTables",
      "formula-owned anomaly/disorder/daze constants",
    ]))
  })

  it("records current-live domain counts and batch gaps", () => {
    const discovery = readJson<Discovery>("packages/data/cleaned/audit/nanoka-full-data-batch-discovery.json")
    const rows = new Map(discovery.domains.map(row => [row.domain, row]))

    expect(rows.get("characters")).toMatchObject({
      currentLiveIndexCount: 53,
      currentLiveDetailAccessibleCount: 53,
      retainedRawDetailCount: 53,
      runtimeRecordCount: 53,
      missingRawDetailCount: 0,
      missingRuntimeRecordCount: 0,
      targetRuntimeBucket: "GameData.agents",
      schemaFit: "existing-bucket-batch-complete-pr-a",
    })
    expect(rows.get("wEngines")).toMatchObject({
      currentLiveIndexCount: 89,
      currentLiveDetailAccessibleCount: 89,
      retainedRawDetailCount: 89,
      runtimeRecordCount: 89,
      missingRawDetailCount: 0,
      missingRuntimeRecordCount: 0,
      targetRuntimeBucket: "GameData.wEngines",
      schemaFit: "existing-bucket-batch-complete-pr-b",
    })
    expect(rows.get("driveDiscs")).toMatchObject({
      currentLiveIndexCount: 26,
      currentLiveDetailAccessibleCount: 26,
      retainedRawDetailCount: 26,
      runtimeRecordCount: 26,
      missingRawDetailCount: 0,
      missingRuntimeRecordCount: 0,
      schemaFit: "existing-bucket-batch-complete-pr-c",
    })
    expect(rows.get("enemies")).toMatchObject({
      currentLiveIndexCount: 269,
      currentLiveDetailAccessibleCount: 269,
      retainedRawDetailCount: 269,
      runtimeRecordCount: 269,
      missingRawDetailCount: 0,
      missingRuntimeRecordCount: 0,
      targetRuntimeBucket: "GameData.enemies",
      schemaFit: "existing-bucket-batch-complete-pr-d",
    })
    expect(rows.get("deadlyAssaultCurrent")).toMatchObject({
      currentLiveIndexCount: 38,
      currentLiveDetailAccessibleCount: 38,
      retainedRawDetailCount: 38,
      runtimeRecordCount: 38,
      missingRawDetailCount: 0,
      missingRuntimeRecordCount: 0,
      targetRuntimeBucket: "GameData.deadlyAssaultPeriods",
      schemaFit: "schema-additive-complete-pr-e",
      implementationStatus: "complete-pr-e",
    })
    expect(rows.get("bangboos")).toMatchObject({
      currentLiveIndexCount: 39,
      retainedRawDetailCount: 39,
      runtimeRecordCount: 39,
      missingRawDetailCount: 0,
    })
  })

  it("keeps historical Deadly Assault separated from configured-live runtime data", () => {
    const discovery = readJson<Discovery>("packages/data/cleaned/audit/nanoka-full-data-batch-discovery.json")

    expect(discovery.historicalDeadlyAssault.targetBucket).toBe("historicalDAPeriods")
    expect(discovery.historicalDeadlyAssault.currentLiveBucket).toBe("deadlyAssaultPeriods")
    expect(discovery.historicalDeadlyAssault.policy).toContain("must not be mixed into configured-live runtime records")
    expect(discovery.historicalDeadlyAssault.policy).toContain("current-runtime fallback")
    expect(discovery.historicalDeadlyAssault.implementationStatus).toBe("complete-pr-f")
    expect(discovery.historicalDeadlyAssault.summary).toMatchObject({
      snapshotCount: 10,
      historicalRuntimePeriodCount: 505,
      zoneCount: 1506,
      bossAdjustmentCount: 58445,
      scheduleKnownCount: 198,
      scheduleMissingCount: 307,
    })
    expect(discovery.historicalDeadlyAssault.snapshots).toHaveLength(10)
    expect(discovery.historicalDeadlyAssault.snapshots.map(snapshot => snapshot.snapshot)).toEqual([
      "2.8.12",
      "3.0.1+15348292",
      "3.0.1+15370273",
      "3.0.1+15377279",
      "3.0.1+15390262",
      "3.0.2+15596677",
      "3.0.2+15597809",
      "3.0.2+15599986",
      "3.0.2+15602810",
      "3.0.2+15625449",
    ])
    expect(discovery.historicalDeadlyAssault.snapshots.at(0)).toMatchObject({
      snapshot: "2.8.12",
      bossIndexCount: 46,
      scheduleKnownCount: 39,
      scheduleMissingCount: 7,
    })
    expect(discovery.historicalDeadlyAssault.snapshots.at(-1)).toMatchObject({ snapshot: "3.0.2+15625449", bossIndexCount: 50 })
  })

  it("locks an implementation PR sequence that does not add golden anchors or release versions", () => {
    const discovery = readJson<Discovery>("packages/data/cleaned/audit/nanoka-full-data-batch-discovery.json")

    expect(discovery.recommendedPrSequence).toEqual([
      "PR-A: retain and batch-promote all current-live characters",
      "PR-B: retain and batch-promote all current-live W-Engines",
      "PR-C: retain and batch-promote current-live Drive Disc set identity/effect text; keep slot/main/substat excluded",
      "PR-D: retain all current-live monster details and batch-promote selected enemy variants with skipped-variant audit",
      "PR-E: add current DA period bucket if needed and retain/promote all 2.8 DA periods",
      "PR-F: add historicalDAPeriods schema bucket and retain/promote historical DA periods across manifest.available snapshots (complete)",
    ])
  })
})

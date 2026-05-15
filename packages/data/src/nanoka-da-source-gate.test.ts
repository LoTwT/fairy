import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type CoverageMatrix = {
  sampleSources: Array<{
    id: string
    entityType: string
    version: string
    approvedForCleanedOutput: boolean
    url: string
  }>
  rows: Array<{
    fieldId: string
    status: string
    sampleEntity?: string
    supportingSamples?: string[]
    rawFieldPaths: string[]
    promotable: boolean
    blockedBy?: string[]
    transformRule: string
  }>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka Deadly Assault source gate", () => {
  it("records live DA raw availability but blocks runtime promotion", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const row = matrix.rows.find(item => item.fieldId === "deadlyAssault.periodsBossesBuffs")

    expect(row).toMatchObject({
      status: "verified-from-nanoka",
      sampleEntity: "nanoka-boss-live-69036",
      promotable: false,
    })
    expect(row?.supportingSamples).toContain("nanoka-boss-live-index-2.8")
    expect(row?.rawFieldPaths).toEqual(
      expect.arrayContaining([
        "/begin_time",
        "/zone/*/layer_buff/*/desc",
        "/zone/*/layer_room/*/monster_list",
        "/boss_adjust/*",
      ]),
    )
    expect(row?.blockedBy).toEqual(
      expect.arrayContaining([
        "field:boss-adjust-semantics-required",
        "field:score-hp-semantics-required",
        "field:period-live-filter-required",
      ]),
    )
    expect(row?.transformRule).toContain("reject period rows with begin_time after configuredLiveSnapshotDate")
  })

  it("uses only live DA samples as release-gate evidence", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const samplesById = new Map(matrix.sampleSources.map(sample => [sample.id, sample]))

    expect(samplesById.get("nanoka-boss-live-index-2.8")).toMatchObject({
      entityType: "deadlyAssaultIndex",
      version: "2.8",
      approvedForCleanedOutput: true,
      url: "https://static.nanoka.cc/zzz/2.8/boss.json",
    })
    expect(samplesById.get("nanoka-boss-live-69036")).toMatchObject({
      entityType: "deadlyAssaultPeriod",
      version: "2.8",
      approvedForCleanedOutput: true,
      url: "https://static.nanoka.cc/zzz/2.8/zh/boss/69036.json",
    })
  })
})

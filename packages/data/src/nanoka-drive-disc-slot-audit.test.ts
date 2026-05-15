import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type DriveDiscSlotStatAudit = {
  schemaVersion: string
  sourceId: string
  sourceVersion: string
  status: string
  fieldId: string
  sampleEntity: string
  runtimeCutoverReady: boolean
  summary: {
    checkedEndpointCount: number
    foundSlotMainSubstatTable: boolean
    ownerResearchRequired: boolean
  }
  checkedEndpoints: Array<{
    url: string
    status: number
    contentSha256?: string
    presentRawFieldPaths?: string[]
    missingRawFieldPaths?: string[]
  }>
  decision: {
    matrixStatus: string
    blockedBy: string[]
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka Drive Disc slot/stat failed-evidence audit", () => {
  it("keeps the package audit artifact mirror byte-identical", () => {
    expect(readFileSync(join(repoRoot, "packages/data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json"), "utf8")).toBe(
      readFileSync(join(repoRoot, "data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json"), "utf8"),
    )
  })

  it("records failed nanoka evidence without promoting or fabricating stat tables", () => {
    const audit = readJson<DriveDiscSlotStatAudit>("data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json")

    expect(audit).toMatchObject({
      schemaVersion: "nanoka-drive-disc-slot-stat-audit/v0.1",
      sourceId: "nanoka-zzz",
      sourceVersion: "2.8",
      status: "not-found",
      fieldId: "driveDiscs.slotAndSubstatTables",
      sampleEntity: "nanoka-equipment-woodpecker-live-31000",
      runtimeCutoverReady: false,
      summary: {
        foundSlotMainSubstatTable: false,
        ownerResearchRequired: true,
      },
      decision: {
        matrixStatus: "needs-owner-research",
      },
    })
    expect(audit.decision.blockedBy).toContain("owner:drive-disc-slot-stat-source-required")
    expect(audit.checkedEndpoints).toHaveLength(audit.summary.checkedEndpointCount)
    expect(audit.checkedEndpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/equipment.json",
        status: 200,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/equipment_main_property.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/equipment_rand_property.json",
        status: 404,
      }),
    ]))
  })

  it("locks the observed live equipment detail shape", () => {
    const audit = readJson<DriveDiscSlotStatAudit>("data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json")
    const detail = audit.checkedEndpoints.find(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/zh/equipment/31000.json")

    expect(detail).toBeDefined()
    expect(detail).toMatchObject({
      status: 200,
      contentSha256: "4190f6084521aead931a28ada9a44e6d9cd26a7fdb2401ffd0ab4e00a257f1ec",
    })
    expect(detail?.presentRawFieldPaths).toEqual(expect.arrayContaining([
      "/id",
      "/name",
      "/desc2",
      "/desc4",
    ]))
    expect(detail?.missingRawFieldPaths).toEqual(expect.arrayContaining([
      "/slot",
      "/part",
      "/main_property",
      "/rand_property",
      "/level",
      "/stats",
    ]))
  })
})

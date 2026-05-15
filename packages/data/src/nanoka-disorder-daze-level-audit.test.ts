import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type DisorderDazeLevelAudit = {
  schemaVersion: string
  sourceId: string
  sourceVersion: string
  status: string
  fieldId: string
  runtimeCutoverReady: boolean
  summary: {
    checkedEndpointCount: number
    foundDisorderDazeLevelTable: boolean
    implementationOwnedRuntimeFormula: boolean
    ownerResearchRequired: boolean
  }
  checkedEndpoints: Array<{
    url: string
    status: number
    contentSha256?: string
  }>
  implementationContract: {
    sourceAnchors: string[]
    coreFormula: string
    sampleExpectation: {
      level: number
      multiplier: number
    }
  }
  decision: {
    matrixStatus: string
    sourcePolicy: string
    blockedBy: string[]
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka Disorder daze-level failed-evidence audit", () => {
  it("keeps the package audit artifact mirror byte-identical", () => {
    expect(readFileSync(join(repoRoot, "packages/data/cleaned/audit/nanoka-disorder-daze-level-audit.json"), "utf8")).toBe(
      readFileSync(join(repoRoot, "data/cleaned/audit/nanoka-disorder-daze-level-audit.json"), "utf8"),
    )
  })

  it("records missing daze-level endpoints and implementation-owned classification", () => {
    const audit = readJson<DisorderDazeLevelAudit>("data/cleaned/audit/nanoka-disorder-daze-level-audit.json")

    expect(audit).toMatchObject({
      schemaVersion: "nanoka-disorder-daze-level-audit/v0.1",
      sourceId: "nanoka-zzz",
      sourceVersion: "2.8",
      status: "not-found",
      fieldId: "rules.disorderDazeLevelZone",
      runtimeCutoverReady: false,
      summary: {
        foundDisorderDazeLevelTable: false,
        implementationOwnedRuntimeFormula: true,
        ownerResearchRequired: false,
      },
      decision: {
        matrixStatus: "deferred",
        sourcePolicy: "implementation-owned",
      },
    })
    expect(audit.checkedEndpoints).toHaveLength(audit.summary.checkedEndpointCount)
    expect(audit.checkedEndpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/daze_level.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/disorder_daze_level.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/disorder_daze_level_zone.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/level_zone.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/character.json",
        status: 200,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/monster.json",
        status: 200,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/boss.json",
        status: 200,
        contentSha256: "d9519738c6100082760f59bb92fd17fdba93afb853c845b1c90d0718788a79f9",
      }),
    ]))
    expect(audit.decision.blockedBy).toContain("implementation-owned-runtime-formula")
  })

  it("locks the guide/golden-backed daze-level formula contract", () => {
    const audit = readJson<DisorderDazeLevelAudit>("data/cleaned/audit/nanoka-disorder-daze-level-audit.json")

    expect(audit.implementationContract.sourceAnchors).toEqual(expect.arrayContaining([
      "guide-3.4.2",
      "golden-v1:G16",
    ]))
    expect(audit.implementationContract.coreFormula).toBe("disorderDazeLevelZone = 1 + 0.0075 * level")
    expect(audit.implementationContract.sampleExpectation).toEqual({
      level: 60,
      multiplier: 1.45,
    })
  })
})

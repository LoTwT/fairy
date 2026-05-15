import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type DisorderFormulaAudit = {
  schemaVersion: string
  sourceId: string
  sourceVersion: string
  status: string
  fieldId: string
  runtimeCutoverReady: boolean
  summary: {
    checkedEndpointCount: number
    foundDisorderFormulaTable: boolean
    implementationOwnedRuntimeFormula: boolean
    ownerResearchRequired: boolean
  }
  checkedEndpoints: Array<{
    url: string
    status: number
  }>
  implementationContract: {
    sourceAnchors: string[]
    coreFormulaIds: string[]
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

describe("nanoka Disorder formula failed-evidence audit", () => {
  it("keeps the package audit artifact mirror byte-identical", () => {
    expect(readFileSync(join(repoRoot, "packages/data/cleaned/audit/nanoka-disorder-formula-audit.json"), "utf8")).toBe(
      readFileSync(join(repoRoot, "data/cleaned/audit/nanoka-disorder-formula-audit.json"), "utf8"),
    )
  })

  it("records missing formula endpoints and implementation-owned classification", () => {
    const audit = readJson<DisorderFormulaAudit>("data/cleaned/audit/nanoka-disorder-formula-audit.json")

    expect(audit).toMatchObject({
      schemaVersion: "nanoka-disorder-formula-audit/v0.1",
      sourceId: "nanoka-zzz",
      sourceVersion: "2.8",
      status: "not-found",
      fieldId: "rules.disorderFormula",
      runtimeCutoverReady: false,
      summary: {
        foundDisorderFormulaTable: false,
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
        url: "https://static.nanoka.cc/zzz/2.8/formula.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/disorder.json",
        status: 404,
      }),
      expect.objectContaining({
        url: "https://static.nanoka.cc/zzz/2.8/anomaly_disorder.json",
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
    ]))
    expect(audit.decision.blockedBy).toContain("implementation-owned-runtime-formula")
  })

  it("locks the guide/golden-backed core formula ids", () => {
    const audit = readJson<DisorderFormulaAudit>("data/cleaned/audit/nanoka-disorder-formula-audit.json")

    expect(audit.implementationContract.sourceAnchors).toEqual(expect.arrayContaining([
      "guide-3.4.1",
      "golden-v1:G15",
    ]))
    expect(audit.implementationContract.coreFormulaIds).toEqual(expect.arrayContaining([
      "disorder-burn",
      "disorder-shock",
      "disorder-corruption",
      "disorder-frost",
      "disorder-physical-or-ice",
      "disorder-polarity",
    ]))
  })
})

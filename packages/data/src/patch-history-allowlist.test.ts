import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")

type RegistrySource = {
  sourceId: string
  configuredLiveVersion: string
  latestResearchVersion?: string
  approvedLiveVersions: string[]
  approvedLiveVersionsScope?: string
}

type SourceRegistry = {
  sources: RegistrySource[]
}

type CoverageMatrix = {
  rows: Array<{
    fieldId: string
    fieldClass: string
    sourcePolicy: string
    status: string
    promotable: boolean
    blockedBy?: string[]
    transformRule: string
  }>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function nanokaSource() {
  const registry = readJson<SourceRegistry>("data/source-registry.json")
  const source = registry.sources.find(item => item.sourceId === "nanoka-zzz")
  expect(source).toBeDefined()
  return source!
}

function assertSnapshotDiffInput(version: string, source: RegistrySource) {
  if (!source.approvedLiveVersions.includes(version))
    throw new Error(`snapshot-diff input ${version} is not in approvedLiveVersions`)
}

describe("patch history allowlist gate", () => {
  it("models patch history as derived snapshot diff data, not prose patch notes", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const row = matrix.rows.find(item => item.fieldId === "metadata.snapshotDiffHistory")

    expect(row).toMatchObject({
      fieldClass: "derived",
      sourcePolicy: "derived-from-source-registry",
      status: "verified-from-nanoka",
      promotable: true,
    })
    expect(row?.blockedBy).toEqual(["field:additional-approved-live-version-required-for-non-empty-history"])
    expect(row?.transformRule).toContain("approved-live snapshot hashes")
  })

  it("allows only approved live snapshots as diff inputs", () => {
    const source = nanokaSource()

    expect(source.approvedLiveVersionsScope).toContain("snapshot-diff")
    expect(() => assertSnapshotDiffInput(source.configuredLiveVersion, source)).not.toThrow()
    expect(() => assertSnapshotDiffInput(source.latestResearchVersion ?? "latest", source)).toThrow(
      "not in approvedLiveVersions",
    )
  })
})

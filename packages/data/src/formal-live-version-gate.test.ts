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
  sourceVersionPolicy: {
    defaultReleaseSourceVersion: string
    latestResearchVersion: string
  }
  sourceVersionResolved: string
  sampleSources: Array<{
    id: string
    version: string
    entityType: string
    approvedForCleanedOutput: boolean
    evidenceUse: string
  }>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function nanokaSource() {
  const registry = readJson<SourceRegistry>("packages/data/source-registry.json")
  const source = registry.sources.find(item => item.sourceId === "nanoka-zzz")
  expect(source).toBeDefined()
  return source!
}

function assertCurrentCleanedSourceVersion(sourceVersion: string, configuredLiveVersion: string) {
  if (sourceVersion !== configuredLiveVersion)
    throw new Error(`current cleaned output must use ${configuredLiveVersion}, got ${sourceVersion}`)
}

describe("formal-live version gate", () => {
  it("matches registry configuredLiveVersion with the coverage matrix live version", () => {
    const source = nanokaSource()
    const matrix = readJson<CoverageMatrix>("packages/data/cleaned/audit/nanoka-coverage-matrix.json")

    expect(source.configuredLiveVersion).toBe(matrix.sourceVersionPolicy.defaultReleaseSourceVersion)
    expect(source.configuredLiveVersion).toBe(matrix.sourceVersionResolved)
    expect(source.latestResearchVersion).toBe(matrix.sourceVersionPolicy.latestResearchVersion)
  })

  it("does not let approvedLiveVersions authorize non-live current cleaned rows", () => {
    const source = nanokaSource()
    const historical = "2.7"

    expect(source.approvedLiveVersionsScope).toContain("snapshot-diff")
    expect(() => assertCurrentCleanedSourceVersion(source.configuredLiveVersion, source.configuredLiveVersion)).not.toThrow()
    expect(() => assertCurrentCleanedSourceVersion(historical, source.configuredLiveVersion)).toThrow(
      "current cleaned output must use",
    )
  })

  it("keeps latest research samples out of cleaned output", () => {
    const source = nanokaSource()
    const matrix = readJson<CoverageMatrix>("packages/data/cleaned/audit/nanoka-coverage-matrix.json")

    const latestSamples = matrix.sampleSources.filter(sample => sample.version === source.latestResearchVersion)
    expect(latestSamples).not.toHaveLength(0)
    expect(latestSamples.every(sample => sample.approvedForCleanedOutput === false)).toBe(true)
    expect(latestSamples.every(sample => sample.evidenceUse.includes("research"))).toBe(true)
  })
})

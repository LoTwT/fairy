import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const dataPackageRoot = join(repoRoot, "packages/data")

type SourceRegistry = {
  sources: Array<{
    sourceId: string
    configuredLiveVersion: string
    urlAllowlist?: Record<string, string>
  }>
}

type CoverageMatrix = {
  status: string
  sampleSources: Array<{
    id: string
    entityType?: string
    version: string
    approvedForCleanedOutput: boolean
    evidenceUse?: string
  }>
  rows: Array<{
    fieldId: string
    fieldClass?: string
    status: string
    promotable: boolean
    sampleEntity?: string
    supportingSampleEntities?: string[]
    blockedBy?: string[]
    sourcePolicy?: string
    rawFieldPaths?: string[]
    transformRule?: string
    auditArtifact?: string
    notes?: string
  }>
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function nanokaSource() {
  const registry = readJson<SourceRegistry>("data/source-registry.json")
  const source = registry.sources.find(item => item.sourceId === "nanoka-zzz")
  expect(source, "missing nanoka registry entry").toBeDefined()
  return source!
}

function requirePattern(allowlist: Record<string, string> | undefined, key: string) {
  const pattern = allowlist?.[key]
  expect(pattern, `missing ${key} allowlist pattern`).toBeDefined()
  return new RegExp(pattern!)
}

describe("nanoka source gate", () => {
  it("passes the executable source-registry verifier", () => {
    const output = execFileSync("node", ["scripts/verify-source-registry.mjs"], {
      cwd: dataPackageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })

    expect(output).toContain("source registry verification passed")
  })

  it("keeps the package source-registry mirror byte-identical", () => {
    expect(readFileSync(join(repoRoot, "packages/data/source-registry.json"), "utf8")).toBe(
      readFileSync(join(repoRoot, "data/source-registry.json"), "utf8"),
    )
  })

  it("allowlists manifest, approved versioned indexes, and localized detail URLs separately", () => {
    const source = nanokaSource()

    expect(requirePattern(source.urlAllowlist, "manifestUrl").test("https://static.nanoka.cc/manifest.json")).toBe(true)
    expect(requirePattern(source.urlAllowlist, "versionedIndexUrls").test("https://static.nanoka.cc/zzz/2.8/boss.json")).toBe(true)
    expect(requirePattern(source.urlAllowlist, "versionedIndexUrls").test("https://static.nanoka.cc/zzz/2.8/character.json")).toBe(true)
    expect(requirePattern(source.urlAllowlist, "versionedIndexUrls").test("https://static.nanoka.cc/zzz/2.8/bangboo.json")).toBe(true)
    expect(requirePattern(source.urlAllowlist, "versionedIndexUrls").test("https://static.nanoka.cc/zzz/2.8/weapon.json")).toBe(true)
    expect(requirePattern(source.urlAllowlist, "localizedDetailUrls").test("https://static.nanoka.cc/zzz/2.8/zh/character/1021.json")).toBe(true)
    expect(requirePattern(source.urlAllowlist, "localizedDetailUrls").test("https://static.nanoka.cc/zzz/2.8/zh/monster/30000.json")).toBe(true)
  })

  it("rejects beta, preview, leak, datamine, unapproved indexes, and non-nanoka routes", () => {
    const source = nanokaSource()
    const patterns = Object.values(source.urlAllowlist ?? {}).map(pattern => new RegExp(pattern))
    const isAllowed = (url: string) => patterns.some(pattern => pattern.test(url))

    expect(isAllowed("https://static.nanoka.cc/zzz/2.8/beta.json")).toBe(false)
    expect(isAllowed("https://static.nanoka.cc/zzz/2.8/preview.json")).toBe(false)
    expect(isAllowed("https://static.nanoka.cc/zzz/2.8/leak.json")).toBe(false)
    expect(isAllowed("https://static.nanoka.cc/zzz/2.8/datamine.json")).toBe(false)
    expect(isAllowed("https://static.nanoka.cc/zzz/2.8/monster.json")).toBe(false)
    expect(isAllowed("https://static.nanoka.cc/zzz/beta/zh/character/1021.json")).toBe(false)
    expect(isAllowed("https://static.nanoka.cc/zzz/preview/zh/boss/69036.json")).toBe(false)
    expect(isAllowed("https://zzz.gachabase.net/beta/agents/1371/yixuan?lang=en")).toBe(false)
  })

  it("locks Adrenaline and Resonance resource rows to canonical promotable live evidence", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))

    expect([...rows.keys()].filter(fieldId => fieldId.startsWith("sentinel."))).toEqual([])
    for (const fieldId of [
      "adrenaline.maxAdrenaline",
      "adrenaline.automaticAdrenalineAccumulation",
      "skills.resonanceRecovery",
      "skills.adrenalineRecovery",
    ]) {
      expect(rows.get(fieldId)).toMatchObject({
        status: "verified-from-nanoka",
        promotable: true,
        sampleEntity: "nanoka-character-yixuan-live-1371",
      })
    }
  })

  it("promotes metadata source registry and SourceRef rows only after executable gates exist", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))

    expect(matrix.status).toBe("phase-4-runtime-cutover-gate")
    expect(rows.get("metadata.sources")).toMatchObject({
      status: "verified-from-nanoka",
      promotable: true,
      sampleEntity: "nanoka-manifest",
      sourcePolicy: "derived-from-source-registry",
    })
    expect(rows.get("metadata.sources")?.blockedBy ?? []).toEqual([])
    expect(rows.get("metadata.sources")?.rawFieldPaths).toEqual(expect.arrayContaining([
      "/zzz/live",
      "/zzz/latest",
      "/zzz/available",
    ]))

    expect(rows.get("metadata.sourceRefs")).toMatchObject({
      status: "verified-from-nanoka",
      promotable: true,
      sampleEntity: "nanoka-bangboo-plugboo-live-54008",
      sourcePolicy: "derived-from-source-registry",
    })
    expect(rows.get("metadata.sourceRefs")?.blockedBy ?? []).toEqual([])
    expect(rows.get("metadata.sourceRefs")?.rawFieldPaths).toEqual(expect.arrayContaining([
      "/assets/*/url",
      "/assets/*/localPath",
      "/assets/*/sourceVersion",
    ]))
  })

  it("promotes agent promotion extra stats only as a structured source artifact", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const row = rows.get("agents.promotionExtraStats")

    expect(matrix.status).toBe("phase-4-runtime-cutover-gate")
    expect(row).toMatchObject({
      status: "verified-from-nanoka",
      promotable: true,
      sampleEntity: "nanoka-character-nekomata-live-1021",
    })
    expect(row?.supportingSampleEntities).toEqual(expect.arrayContaining([
      "nanoka-character-nekomata-live-1021",
      "nanoka-character-yixuan-live-1371",
    ]))
    expect(row?.rawFieldPaths).toEqual(expect.arrayContaining([
      "/id",
      "/extra_level/*/max_level",
      "/extra_level/*/extra/*/prop",
      "/extra_level/*/extra/*/name",
      "/extra_level/*/extra/*/value",
    ]))
    expect(row?.blockedBy ?? []).not.toContain("field:runtime-cutover-drift-required")
    expect(row?.transformRule).toContain("/id matches the requested agent id")
    expect(row?.transformRule).toContain("Phase 3 drift rulings and Phase 4 cutover clear the runtime gate")
  })

  it("promotes Bangboo element only from deterministic live skill damage text", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const row = rows.get("bangboos.element")

    expect(matrix.status).toBe("phase-4-runtime-cutover-gate")
    expect(row).toMatchObject({
      status: "verified-from-nanoka",
      promotable: true,
      sampleEntity: "nanoka-bangboo-plugboo-live-54008",
    })
    expect(row?.blockedBy ?? []).toEqual([])
    expect(row?.rawFieldPaths).toEqual(expect.arrayContaining([
      "/id",
      "/skill/*/level/*/desc",
    ]))
    expect(row?.transformRule).toContain("colored damage phrase")
    expect(row?.transformRule).toContain("source /id to match the requested Bangboo id")
  })

  it("adds Phase 3 missing-anchor candidate samples without marking them exit-clean", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const samples = new Map(matrix.sampleSources.map(sample => [sample.id, sample]))
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))

    for (const sampleId of [
      "nanoka-character-nicole-live-1031",
      "nanoka-character-yanagi-live-1221",
      "nanoka-bangboo-penguinboo-live-53001",
      "nanoka-bangboo-sharkboo-live-54001",
    ]) {
      expect(samples.get(sampleId)).toMatchObject({
        version: "2.8",
        approvedForCleanedOutput: true,
      })
    }

    expect(rows.get("agents.passiveModifiers")?.supportingSampleEntities).toEqual(expect.arrayContaining([
      "nanoka-character-nicole-live-1031",
      "nanoka-character-yanagi-live-1221",
    ]))
    expect(rows.get("agents.passiveModifiers")?.blockedBy).toContain("typed-modifier-template-required")

    for (const fieldId of ["bangboos.basePanel", "bangboos.skillSegments"]) {
      expect(rows.get(fieldId)?.supportingSampleEntities).toEqual(expect.arrayContaining([
        "nanoka-bangboo-penguinboo-live-53001",
        "nanoka-bangboo-sharkboo-live-54001",
      ]))
    }
  })

  it("locks the V1.2.1 Bangboo batch to the full approved-live index", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const samples = new Map(matrix.sampleSources.map(sample => [sample.id, sample]))
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const bangbooSamples = matrix.sampleSources.filter(sample => sample.entityType === "bangboo" && sample.version === "2.8")

    expect(samples.get("nanoka-bangboo-index-live-2.8")).toMatchObject({
      version: "2.8",
      approvedForCleanedOutput: true,
      evidenceUse: "v1.2.1-bangboo-batch-source-gate",
    })
    expect(bangbooSamples).toHaveLength(39)

    for (const fieldId of ["bangboos.identity", "bangboos.basePanel", "bangboos.skillSegments"]) {
      expect(rows.get(fieldId)).toMatchObject({
        sampleEntity: "nanoka-bangboo-index-live-2.8",
        auditArtifact: "data/cleaned/audit/nanoka-bangboo-batch-audit.json",
      })
      expect(rows.get(fieldId)?.supportingSampleEntities).toHaveLength(39)
      expect(rows.get(fieldId)?.notes).toContain("no new golden anchors")
    }

    expect(rows.get("bangboos.element")?.supportingSampleEntities).toHaveLength(39)
    expect(rows.get("bangboos.element")?.auditArtifact).toBe("data/cleaned/audit/nanoka-bangboo-batch-audit.json")
  })

  it("locks the V1.2.x character batch to the full approved-live index", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const samples = new Map(matrix.sampleSources.map(sample => [sample.id, sample]))
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const characterSamples = matrix.sampleSources.filter(sample => sample.entityType === "agent" && sample.version === "2.8")

    expect(samples.get("nanoka-character-index-live-2.8")).toMatchObject({
      version: "2.8",
      approvedForCleanedOutput: true,
      evidenceUse: "v1.2.x-character-batch-source-gate",
    })
    expect(characterSamples).toHaveLength(53)

    for (const fieldId of ["agents.identity", "agents.enums", "agents.basePanel"]) {
      expect(rows.get(fieldId)).toMatchObject({
        sampleEntity: "nanoka-character-index-live-2.8",
        auditArtifact: "data/cleaned/audit/nanoka-character-batch-audit.json",
      })
      expect(rows.get(fieldId)?.supportingSampleEntities).toHaveLength(53)
      expect(rows.get(fieldId)?.notes).toContain("no new golden anchors")
    }

    expect(rows.get("agents.passiveModifiers")?.blockedBy).toContain("typed-modifier-template-required")
  })

  it("locks the V1.2.x W-Engine batch to the full approved-live index", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const samples = new Map(matrix.sampleSources.map(sample => [sample.id, sample]))
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const wEngineSamples = matrix.sampleSources.filter(sample => sample.entityType === "wEngine" && sample.version === "2.8")

    expect(samples.get("nanoka-weapon-index-live-2.8")).toMatchObject({
      version: "2.8",
      approvedForCleanedOutput: true,
      evidenceUse: "v1.2.x-wengine-batch-source-gate",
    })
    expect(wEngineSamples).toHaveLength(89)

    for (const fieldId of ["wEngines.identity", "wEngines.baseStats"]) {
      expect(rows.get(fieldId)).toMatchObject({
        sampleEntity: "nanoka-weapon-index-live-2.8",
        auditArtifact: "data/cleaned/audit/nanoka-wengine-batch-audit.json",
      })
      expect(rows.get(fieldId)?.supportingSampleEntities).toHaveLength(89)
      expect(rows.get(fieldId)?.notes).toContain("no new golden anchors")
    }

    expect(rows.get("wEngines.baseStats")?.promotable).toBe(true)
    expect(rows.get("wEngines.baseStats")?.blockedBy ?? []).toEqual([])
    expect(rows.get("wEngines.passiveModifiers")?.supportingSampleEntities).toHaveLength(89)
    expect(rows.get("wEngines.passiveModifiers")?.blockedBy).toContain("typed-modifier-template-required")
  })

  it("locks enemy variant mapping to approved live monster detail samples", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const variantRow = rows.get("enemies.variantMapping")

    expect(variantRow).toMatchObject({
      status: "verified-from-nanoka",
      promotable: true,
      sampleEntity: "nanoka-monster-dullahan-live-30000",
    })
    expect(variantRow?.blockedBy ?? []).not.toContain("field:runtime-cutover-drift-required")
    expect(variantRow?.supportingSampleEntities).toEqual(expect.arrayContaining([
      "nanoka-monster-dullahan-live-30000",
      "nanoka-monster-greta-live-30004",
      "nanoka-monster-ruthless-fiend-live-200141",
      "nanoka-monster-notorious-hati-live-200014",
      "nanoka-monster-notorious-armored-hati-live-200034",
      "nanoka-monster-miasma-priest-live-30033",
      "nanoka-monster-notorious-pompey-live-300211",
    ]))
    for (const row of matrix.rows)
      expect(row.blockedBy ?? []).not.toContain("field:variant-mapping-required")
  })

  it("excludes Drive Disc slot/stat tables from V0.1.0 formal data after owner decision", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const row = rows.get("driveDiscs.slotAndSubstatTables")

    expect(row).toMatchObject({
      fieldClass: "removed-out-of-product-scope",
      sourcePolicy: "out-of-scope",
      status: "deferred",
      promotable: false,
      sampleEntity: "nanoka-equipment-woodpecker-live-31000",
      auditArtifact: "data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json",
    })
    expect(row?.blockedBy).toContain("scope:user-provided-snapshot-boundary")
    expect(row?.rawFieldPaths).toEqual(expect.arrayContaining([
      "/id",
      "/name",
      "/desc2",
      "/desc4",
    ]))
    expect(row?.transformRule).toContain("do not synthesize")
    expect(row?.transformRule).toContain("user snapshot input supplies the final Agent panel")
    expect(row?.transformRule).toContain("do not reverse-engineer user panel values")
  })

  it("classifies the Disorder formula as implementation-owned after failed nanoka evidence", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const row = rows.get("rules.disorderFormula")

    expect(row).toMatchObject({
      fieldClass: "implementation-owned",
      sourcePolicy: "implementation-owned",
      status: "deferred",
      promotable: false,
      auditArtifact: "data/cleaned/audit/nanoka-disorder-formula-audit.json",
    })
    expect(row?.sampleEntity).toBeNull()
    expect(row?.blockedBy).toContain("implementation-owned-runtime-formula")
    expect(row?.transformRule).toContain("guide-anchored golden replay G15")
    expect(row?.transformRule).toContain("Do not synthesize")
  })

  it("classifies the Disorder daze-level formula as implementation-owned after failed nanoka evidence", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const row = rows.get("rules.disorderDazeLevelZone")

    expect(row).toMatchObject({
      fieldClass: "implementation-owned",
      sourcePolicy: "implementation-owned",
      status: "deferred",
      promotable: false,
      auditArtifact: "data/cleaned/audit/nanoka-disorder-daze-level-audit.json",
    })
    expect(row?.sampleEntity).toBeNull()
    expect(row?.blockedBy).toContain("implementation-owned-runtime-formula")
    expect(row?.transformRule).toContain("guide-anchored golden replay G16")
    expect(row?.transformRule).toContain("Do not synthesize")
  })
})

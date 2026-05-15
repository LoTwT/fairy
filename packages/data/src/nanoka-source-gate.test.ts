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
  rows: Array<{
    fieldId: string
    status: string
    promotable: boolean
    sampleEntity?: string
    supportingSampleEntities?: string[]
    blockedBy?: string[]
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

  it("locks enemy variant mapping to approved live monster detail samples", () => {
    const matrix = readJson<CoverageMatrix>("data/cleaned/audit/nanoka-coverage-matrix.json")
    const rows = new Map(matrix.rows.map(row => [row.fieldId, row]))
    const variantRow = rows.get("enemies.variantMapping")

    expect(variantRow).toMatchObject({
      status: "verified-from-nanoka",
      promotable: true,
      sampleEntity: "nanoka-monster-dullahan-live-30000",
    })
    expect(variantRow?.blockedBy).toContain("field:runtime-cutover-drift-required")
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
})

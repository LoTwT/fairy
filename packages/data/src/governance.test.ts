import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { SourceManifest } from "./types/source-manifest"

const repoRoot = join(import.meta.dirname, "../../..")
const dataPackageRoot = join(repoRoot, "packages/data")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function sha256(path: string): string {
  return createHash("sha256")
    .update(readFileSync(join(repoRoot, path)))
    .digest("hex")
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

describe("S5 data governance", () => {
  it("records source files with matching SHA-256 hashes", () => {
    const manifest = readJson<SourceManifest>("data/source/source-manifest.json")

    expect(manifest.distributionPolicy).toEqual({
      rawSourceArchive: "versioned-in-git-not-packaged",
      publishedArtifacts: "cleaned-json-and-types-only",
    })

    for (const source of manifest.sources)
      expect(sha256(source.path)).toBe(source.sha256)
  })

  it("keeps raw source paths out of package distribution rules", () => {
    const npmIgnore = readFileSync(join(repoRoot, ".npmignore"), "utf8")
    const packageJson = readJson<{ files?: string[] }>("packages/data/package.json")

    expect(npmIgnore).toContain("data/source/")
    expect(packageJson.files).toEqual(
      expect.arrayContaining(["dist", "cleaned", "source-registry.json"]),
    )
    expect(packageJson.files).not.toContain("src")
    expect(packageJson.files?.some(entry => entry.startsWith("source/"))).toBe(false)
  })

  it("packs synced cleaned JSON while excluding retained source files", () => {
    const syncOutput = execFileSync("node", ["scripts/sync-cleaned.mjs", "--check"], {
      cwd: dataPackageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    const files = npmPackFiles()

    expect(syncOutput).toContain("cleaned mirror check passed")
    expect(files).toContain("cleaned/golden/v1-replay-report.json")
    expect(files).toContain("cleaned/audit/nanoka-coverage-matrix.json")
    expect(files).toContain("source-registry.json")
    expect(files.some(file => file.startsWith("data/source/"))).toBe(false)
    expect(files.some(file => file.startsWith("docs/reference/"))).toBe(false)
    expect(files.some(file => file.endsWith(".xlsx"))).toBe(false)
    expect(files.some(file => file.endsWith(".test.ts"))).toBe(false)
  })

  it("keeps the guide as reference material instead of formal cleaned data", () => {
    const manifest = readJson<SourceManifest>("data/source/source-manifest.json")
    const guide = manifest.sources.find(source => source.id === "zzz-data-introduction")

    expect(guide).toMatchObject({
      path: "docs/reference/zzz-data-introduction.txt",
      distribution: "reference-retained-not-packaged",
    })
    expect(guide?.usage).toContain("not a formal data source")
  })
})

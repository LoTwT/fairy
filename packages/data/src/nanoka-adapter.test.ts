import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertNanokaSnapshotManifest,
  buildSourceDocument,
  createNanokaSnapshotAdapter,
  getDataSourceDescriptor,
  nanokaSnapshotRecords,
  type NanokaRawSnapshotManifest,
  type SourceManifest,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")
const dataPackageRoot = join(repoRoot, "packages/data")
const snapshotManifestPath = "data/source/raw/nanoka/zzz/2.8/fetch-manifest.json"

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

function sha256(path: string): string {
  return createHash("sha256")
    .update(readFileSync(join(repoRoot, path)))
    .digest("hex")
}

describe("nanoka raw snapshot adapter skeleton", () => {
  it("passes the retained raw snapshot verifier", () => {
    const output = execFileSync("node", ["scripts/nanoka-source.mjs", "verify", "--snapshot", "2.8"], {
      cwd: dataPackageRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })

    expect(output).toContain("nanoka snapshot 2.8 verification passed")
  })

  it("records the nanoka raw snapshot in the source manifest with a matching hash", () => {
    const manifest = readJson<SourceManifest>("data/source/source-manifest.json")
    const entry = manifest.sources.find(source => source.id === "nanoka-zzz-2.8")

    expect(entry).toMatchObject({
      kind: "rawHttpSnapshot",
      path: snapshotManifestPath,
      distribution: "raw-retained-not-packaged",
    })
    expect(entry?.sha256).toBe(sha256(snapshotManifestPath))
  })

  it("keeps the source registry hash aligned with the retained live manifest", () => {
    const registry = readJson<{ sources: Array<{ sourceId: string, contentHash: string }> }>("data/source-registry.json")
    const snapshot = readJson<NanokaRawSnapshotManifest>(snapshotManifestPath)
    const registrySource = registry.sources.find(source => source.sourceId === "nanoka-zzz")
    const retainedManifest = snapshot.assets.find(asset => asset.id === "manifest")

    expect(registrySource?.contentHash).toBe(`sha256:${retainedManifest?.sha256}`)
  })

  it("documents nanoka as ready for adapter work without marking formal rows ready", () => {
    const descriptor = getDataSourceDescriptor("nanoka-zzz")

    expect(descriptor.status).toBe("readyForAdapter")
    expect(descriptor.formalDataReady).toBe(false)
    expect(descriptor.discoveredAssets).toEqual(
      expect.arrayContaining([
        snapshotManifestPath,
        "data/source/raw/nanoka/zzz/2.8/boss.json",
        "data/source/raw/nanoka/zzz/2.8/zh/character/1021.json",
        "data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json",
      ]),
    )
    expect(descriptor.compliance.notes.join("\n")).toContain("manifest.zzz.live")
  })

  it("builds schema-valid SourceDocument metadata for nanoka", () => {
    const sourceDocument = buildSourceDocument(getDataSourceDescriptor("nanoka-zzz"), {
      sourceVersion: "2.8",
      fetchedAt: "2026-05-15T11:35:00+08:00",
      parsedAt: "2026-05-15T11:35:00+08:00",
      gameVersion: "ZZZ-live",
      licenseNote: "cleaned data only; source review required before redistribution",
    })

    expect(sourceDocument).toMatchObject({
      id: "nanoka-zzz",
      kind: "thirdPartySite",
      url: "https://static.nanoka.cc/manifest.json",
      sourceVersion: "2.8",
    })
  })

  it("parses retained snapshot assets as metadata records without formal data promotion", async () => {
    const manifest = readJson<NanokaRawSnapshotManifest>(snapshotManifestPath)
    const adapter = createNanokaSnapshotAdapter({ manifest })
    const raw = await adapter.fetch({ now: "2026-05-15T11:40:00+08:00" })
    const parsed = await adapter.parse(raw, { now: "2026-05-15T11:40:00+08:00" })

    expect(parsed).toMatchObject({
      sourceId: "nanoka-zzz",
      sourceVersion: "2.8",
      formalDataReady: false,
    })
    expect(parsed.records).toHaveLength(manifest.assets.length)
    expect(parsed.records.map(record => record.id)).toEqual(
      expect.arrayContaining(["manifest", "boss-index", "character-nekomata-1021", "boss-69036"]),
    )
    expect(parsed.notes.join("\n")).toContain("source-gate only")
  })

  it("fails loud when raw adapter metadata does not match the payload snapshot", async () => {
    const manifest = readJson<NanokaRawSnapshotManifest>(snapshotManifestPath)
    const adapter = createNanokaSnapshotAdapter({ manifest })
    const raw = await adapter.fetch({ now: "2026-05-15T11:40:00+08:00" })

    await expect(adapter.parse({
      ...raw,
      sourceVersion: "3.0.2+15625449",
    }, { now: "2026-05-15T11:40:00+08:00" })).rejects.toThrow("sourceVersion must match payload snapshotId")

    await expect(adapter.parse({
      ...raw,
      sourceId: "evil-source",
    }, { now: "2026-05-15T11:40:00+08:00" })).rejects.toThrow("sourceId mismatch")
  })

  it("rejects malformed snapshots before adapter parsing", () => {
    const manifest = readJson<NanokaRawSnapshotManifest>(snapshotManifestPath)
    const forbiddenIndex: NanokaRawSnapshotManifest = {
      ...manifest,
      assets: [
        ...manifest.assets,
        {
          ...manifest.assets.find(asset => asset.id === "boss-index")!,
          id: "forbidden-preview-index",
          url: "https://static.nanoka.cc/zzz/2.8/preview.json",
        },
      ],
    }

    const evilHost: NanokaRawSnapshotManifest = {
      ...manifest,
      assets: [
        ...manifest.assets,
        {
          ...manifest.assets.find(asset => asset.id === "boss-index")!,
          id: "evil-boss-index",
          url: "https://evil.example/zzz/2.8/boss.json",
        },
      ],
    }

    const unapprovedIndex: NanokaRawSnapshotManifest = {
      ...manifest,
      assets: [
        ...manifest.assets,
        {
          ...manifest.assets.find(asset => asset.id === "boss-index")!,
          id: "unapproved-character-index",
          url: "https://static.nanoka.cc/zzz/2.8/character.json",
        },
      ],
    }

    expect(() => assertNanokaSnapshotManifest(forbiddenIndex)).toThrow("forbidden nanoka route")
    expect(() => nanokaSnapshotRecords(forbiddenIndex)).toThrow("forbidden nanoka route")
    expect(() => assertNanokaSnapshotManifest(evilHost)).toThrow("not allowed by nanoka urlPolicy")
    expect(() => assertNanokaSnapshotManifest(unapprovedIndex)).toThrow("not allowed by nanoka urlPolicy")
  })
})

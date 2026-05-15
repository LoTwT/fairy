import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertNanokaSnapshotManifest,
  buildSourceDocument,
  buildSourceDocumentFromRegistryEntry,
  buildSourceRefsForParsedBatch,
  createNanokaSnapshotAdapter,
  getDataSourceDescriptor,
  nanokaSnapshotRecords,
  type NanokaRawSnapshotManifest,
  type ParsedSourceRecord,
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
        "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json",
        "data/source/raw/nanoka/zzz/2.8/zh/character/1031.json",
        "data/source/raw/nanoka/zzz/2.8/zh/character/1221.json",
        "data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json",
        "data/source/raw/nanoka/zzz/2.8/zh/bangboo/53001.json",
        "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54001.json",
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

  it("derives SourceDocument metadata from the source-registry contract", () => {
    const registry = readJson<{
      sources: Array<{
        sourceId: string
        configuredLiveVersion: string
        fetchedAt?: string
        contentHash: string
        liveVersionRef?: string
        approvedLiveVersions?: string[]
      }>
    }>("data/source-registry.json")
    const registryEntry = registry.sources.find(source => source.sourceId === "nanoka-zzz")

    expect(registryEntry, "missing nanoka source registry entry").toBeDefined()

    const sourceDocument = buildSourceDocumentFromRegistryEntry(
      getDataSourceDescriptor("nanoka-zzz"),
      registryEntry!,
      {
        parsedAt: "2026-05-15T13:50:00+08:00",
        parserVersion: "nanoka-source-v0.1.0",
        gameVersion: "ZZZ-live",
      },
    )

    expect(sourceDocument).toMatchObject({
      id: "nanoka-zzz",
      kind: "thirdPartySite",
      url: "https://static.nanoka.cc/manifest.json",
      sourceVersion: "2.8",
      fetchedAt: registryEntry?.fetchedAt,
    })
    expect(registryEntry?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(registryEntry?.liveVersionRef).toBe("manifest.zzz.live")
    expect(registryEntry?.approvedLiveVersions).toContain(sourceDocument.sourceVersion)
  })

  it("fails loud when source-registry metadata cannot back SourceDocument derivation", () => {
    const descriptor = getDataSourceDescriptor("nanoka-zzz")

    expect(() =>
      buildSourceDocumentFromRegistryEntry(descriptor, {
        sourceId: "other-source",
        configuredLiveVersion: "2.8",
        contentHash: "sha256:91494c2c3bfda6ec47beccbf71066506ab0a315513aa751cf30e4c3a1dc0817d",
      }, {
        parsedAt: "2026-05-15T13:50:00+08:00",
      }),
    ).toThrow("does not match descriptor")

    expect(() =>
      buildSourceDocumentFromRegistryEntry(descriptor, {
        sourceId: "nanoka-zzz",
        configuredLiveVersion: "2.8",
        contentHash: "not-a-sha",
      }, {
        parsedAt: "2026-05-15T13:50:00+08:00",
      }),
    ).toThrow("contentHash must be sha256-prefixed")
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
      expect.arrayContaining(["manifest", "boss-index", "character-nekomata-1021", "character-yixuan-1371", "boss-69036"]),
    )
    expect(parsed.notes.join("\n")).toContain("source-gate only")
  })

  it("emits SourceRef anchors for every retained nanoka metadata record", async () => {
    const manifest = readJson<NanokaRawSnapshotManifest>(snapshotManifestPath)
    const adapter = createNanokaSnapshotAdapter({ manifest })
    const raw = await adapter.fetch({ now: "2026-05-15T11:40:00+08:00" })
    const parsed = await adapter.parse(raw, { now: "2026-05-15T11:40:00+08:00" })
    const sourceRefs = buildSourceRefsForParsedBatch(parsed)

    expect(sourceRefs).toHaveLength(parsed.records.length)
    expect(sourceRefs).toEqual(expect.arrayContaining([
      {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "https://static.nanoka.cc/manifest.json",
        dataPath: "data/source/raw/nanoka/zzz/2.8/manifest.json",
      },
      {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "https://static.nanoka.cc/zzz/2.8/boss.json",
        dataPath: "data/source/raw/nanoka/zzz/2.8/boss.json",
      },
      {
        sourceId: "nanoka-zzz",
        sourceVersion: "2.8",
        sourceAnchor: "https://static.nanoka.cc/zzz/2.8/zh/character/1021.json",
        dataPath: "data/source/raw/nanoka/zzz/2.8/zh/character/1021.json",
      },
    ]))
  })

  it("fails loud when a parsed metadata record cannot emit a SourceRef", async () => {
    const manifest = readJson<NanokaRawSnapshotManifest>(snapshotManifestPath)
    const adapter = createNanokaSnapshotAdapter({ manifest })
    const raw = await adapter.fetch({ now: "2026-05-15T11:40:00+08:00" })
    const parsed = await adapter.parse(raw, { now: "2026-05-15T11:40:00+08:00" })

    expect(() =>
      buildSourceRefsForParsedBatch({
        ...parsed,
        records: [withoutSourceAnchor(parsed.records[0]!)],
      }),
    ).toThrow("sourceAnchor is required")

    expect(() =>
      buildSourceRefsForParsedBatch({
        ...parsed,
        records: [withoutDataPath(parsed.records[0]!)],
      }),
    ).toThrow("dataPath is required")
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

function withoutSourceAnchor(record: ParsedSourceRecord): ParsedSourceRecord {
  const { sourceAnchor: _sourceAnchor, ...rest } = record
  return rest
}

function withoutDataPath(record: ParsedSourceRecord): ParsedSourceRecord {
  const { dataPath: _dataPath, ...rest } = record
  return rest
}

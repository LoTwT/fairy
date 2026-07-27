import { createHash } from "node:crypto"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  discoverCharacterIds,
  validateCharacterDetail,
} from "../scripts/nanoka/characters.ts"
import {
  discoverEquipmentIds,
  validateEquipmentDetail,
} from "../scripts/nanoka/equipment.ts"
import type { FetchedHttpAsset } from "../scripts/nanoka/http.ts"
import { NanokaHttpClient } from "../scripts/nanoka/http.ts"
import { loadSourcePolicy, validateManifest } from "../scripts/nanoka/policy.ts"
import {
  fetchNanokaSnapshot,
  fetchUpstreamManifest,
  nanokaArtifactNameForTest,
  recoverNanokaRawDirectory,
  type SnapshotFetchProgress,
  verifyNanokaSnapshots,
} from "../scripts/nanoka/snapshot.ts"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe("Nanoka character resources", () => {
  it("discovers canonical IDs in numeric order", () => {
    expect(discoverCharacterIds({ "20": {}, "3": {}, "1011": {} })).toEqual([
      "3",
      "20",
      "1011",
    ])
    expect(() => discoverCharacterIds({ "01": {} })).toThrow("非法 Agent ID")
    expect(() => discoverCharacterIds({ "1": [] })).toThrow("必须是普通对象")
    expect(() => discoverCharacterIds({})).toThrow("不能为空")
  })

  it("validates optional detail IDs", () => {
    expect(() =>
      validateCharacterDetail({ name: "Anby" }, "1011"),
    ).not.toThrow()
    expect(() => validateCharacterDetail({ id: 1011 }, "1011")).not.toThrow()
    expect(() => validateCharacterDetail({ id: 1012 }, "1011")).toThrow(
      "ID 与路径不一致",
    )
  })
})

describe("Nanoka equipment resources", () => {
  it("discovers canonical Drive Disc IDs and validates details", () => {
    const index = {
      "31100": {
        icon: "UI/31100.png",
        zh: { name: "河豚电音", desc2: "二件套", desc4: "四件套" },
        en: { name: "Puffer Electro", desc2: "2-piece", desc4: "4-piece" },
      },
      "31000": {
        icon: "UI/31000.png",
        zh: { name: "啄木鸟电音", desc2: "二件套", desc4: "四件套" },
        en: {
          name: "Woodpecker Electro",
          desc2: "2-piece",
          desc4: "4-piece",
        },
      },
    }
    expect(discoverEquipmentIds(index)).toEqual(["31000", "31100"])
    expect(() => discoverEquipmentIds({ "031000": {} })).toThrow(
      "非法 Drive Disc ID",
    )
    expect(() =>
      validateEquipmentDetail(
        {
          id: 31000,
          name: "啄木鸟电音",
          desc2: "二件套",
          desc4: "四件套",
          story: "...",
          icon: "UI/31000.png",
          icon2: "UI/31000.png",
        },
        "31000",
        index,
        "zh",
      ),
    ).not.toThrow()
    expect(() =>
      validateEquipmentDetail(
        {
          id: 31100,
          name: "啄木鸟电音",
          desc2: "二件套",
          desc4: "四件套",
          story: "...",
          icon: "UI/31000.png",
          icon2: "UI/31000.png",
        },
        "31000",
        index,
        "zh",
      ),
    ).toThrow("ID 与路径不一致")
  })
})

describe("Nanoka snapshots", () => {
  it("writes a complete raw-byte snapshot and verifies it offline", async () => {
    const directory = await temporaryDirectory()
    const result = await createSnapshot(directory, false)
    expect(result.manifest.summary).toMatchObject({
      entityTypeCount: 2,
      assetCount: 11,
      entities: {
        character: {
          recordCount: 2,
          detailCountByLanguage: { zh: 2, en: 2 },
          assetCount: 5,
        },
        equipment: {
          recordCount: 2,
          detailCountByLanguage: { zh: 2, en: 2 },
          assetCount: 5,
        },
      },
    })
    const rawIndex = await readFile(join(directory, "3.0", "character.json"))
    expect(rawIndex.toString()).toBe('{"1011":{},"2":{}}')
    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification).toEqual([{ snapshotVersion: "3.0", errors: [] }])
  })

  it("reports structured fetch progress", async () => {
    const directory = await temporaryDirectory()
    const stages: string[] = []
    const detailProgress: Array<{ completed: number; total: number }> = []
    await createSnapshot(
      directory,
      false,
      {},
      {
        onProgress: (progress) => {
          stages.push(progress.stage)
          if (progress.stage === "entity-details") detailProgress.push(progress)
        },
      },
    )

    expect(stages).toEqual([
      "preparing",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-discovered",
      "entity-details",
      "entity-details",
      "entity-details",
      "entity-details",
      "verifying",
      "verifying",
      "verifying",
      "verifying",
      "publishing",
    ])
    expect(detailProgress).toHaveLength(8)
    expect(detailProgress.at(-1)).toMatchObject({ completed: 4, total: 4 })
  })

  it("rebuilds selected equipment while carrying validated character assets", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)

    const result = await createSnapshot(
      directory,
      false,
      {},
      { entities: ["equipment"] },
    )

    expect(result.manifest.fetchScope).toEqual({
      mode: "selected",
      requestedEntities: ["equipment"],
    })
    expect(result.carriedForwardAssetCount).toBe(5)
    expect(
      result.manifest.assets
        .filter((asset) => asset.result === "carried-forward")
        .every((asset) => asset.entity === "character"),
    ).toBe(true)
  })

  it("migrates a strict v1 character snapshot only after selected equipment succeeds", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const snapshotDirectory = join(directory, "3.0")
    const manifestPath = join(snapshotDirectory, "fetch-manifest.json")
    const v2 = JSON.parse(await readFile(manifestPath, "utf8")) as {
      schemaVersion: string
      entities: string[]
      fetchScope: unknown
      validation: unknown
      assets: Array<Record<string, unknown>>
      summary: {
        assetCount: number
        totalBytes: number
        entities: {
          character: {
            recordCount: number
            detailCountByLanguage: { zh: number; en: number }
          }
        }
      }
    }
    const characterAssets = v2.assets
      .filter(
        (asset) =>
          asset.entity === "character" || asset.kind === "upstream-manifest",
      )
      .map((asset) => {
        if (asset.kind === "upstream-manifest") return asset
        if (asset.kind === "entity-index")
          return {
            ...asset,
            assetId: "character-index",
            kind: "character-index",
            entity: undefined,
          }
        return {
          ...asset,
          assetId: `character-detail:${String(asset.language)}:${String(asset.entityId)}`,
          kind: "character-detail",
          characterId: asset.entityId,
          entity: undefined,
          entityId: undefined,
        }
      })
    const v1 = {
      ...v2,
      schemaVersion: "nanoka-fetch-manifest/v1",
      assets: characterAssets,
      summary: {
        characterCount: v2.summary.entities.character.recordCount,
        zhDetailCount: v2.summary.entities.character.detailCountByLanguage.zh,
        enDetailCount: v2.summary.entities.character.detailCountByLanguage.en,
        assetCount: characterAssets.length,
        totalBytes: characterAssets.reduce(
          (sum, asset) => sum + Number(asset.bytes),
          0,
        ),
      },
    } as Record<string, unknown>
    delete v1.entities
    delete v1.fetchScope
    delete v1.validation
    await rm(join(snapshotDirectory, "equipment.json"))
    await rm(join(snapshotDirectory, "zh", "equipment"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "equipment"), { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(v1)}\n`)

    expect(
      await verifyNanokaSnapshots({
        policy: await loadSourcePolicy(),
        rawDirectory: directory,
      }),
    ).toEqual([{ snapshotVersion: "3.0", errors: [] }])
    const migrated = await createSnapshot(
      directory,
      false,
      {},
      { entities: ["equipment"] },
    )
    expect(migrated.manifest.schemaVersion).toBe("nanoka-fetch-manifest/v2")
    expect(migrated.manifest.entities).toEqual(["character", "equipment"])
  })

  it("reuses validated files on 304 and reports drift", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const reused = await createSnapshot(directory, true)
    expect(reused.reusedAssetCount).toBe(10)
    expect(reused.driftedAssetIds).toEqual([])

    const drifted = await createSnapshot(directory, false, {
      "/zzz/3.0/en/character/1011.json": '{"id":1011,"name":"changed"}',
    })
    expect(drifted.driftedAssetIds).toContain("entity-detail:character:en:1011")
  })

  it("refetches unconditionally after a 304 finds damaged cached bytes", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const indexPath = join(directory, "3.0", "character.json")
    await writeFile(indexPath, "damaged")

    const refreshed = await createSnapshot(directory, true)
    expect(refreshed.manifest.summary.entities.character.recordCount).toBe(2)
    expect(await readFile(indexPath, "utf8")).toBe('{"1011":{},"2":{}}')
  })

  it("rejects unsafe persisted asset paths before reading the cache", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<{ assetId: string; localPath: string }>
    }
    const index = manifest.assets.find(
      (asset) => asset.assetId === "entity-index:character",
    )
    if (index === undefined) throw new Error("missing fixture asset")
    index.localPath = "../outside.json"
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)

    await expect(createSnapshot(directory, true)).rejects.toThrow(
      "资源本地路径不安全",
    )
    expect(await readdir(directory)).toContain("3.0")
  })

  it("isolates unrelated broken directories when finding manifest cache", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await mkdir(join(directory, "broken"))
    await writeFile(join(directory, "broken", "fetch-manifest.json"), "invalid")

    const policy = await loadSourcePolicy()
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: { ...policy.requestPolicy, minimumStartIntervalMs: 0 },
      },
      {
        fetchImplementation: async () => new Response(null, { status: 304 }),
        sleep: async () => {},
      },
    )
    await expect(
      fetchUpstreamManifest(policy, client, directory),
    ).resolves.toMatchObject({ manifest: { zzz: { live: "3.0" } } })
  })

  it("reports staging and backup artifacts without modifying them", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const staging = nanokaArtifactNameForTest("3.0", "staging", "active")
    const backup = nanokaArtifactNameForTest("3.0", "backup", "active")
    await mkdir(join(directory, staging))
    await mkdir(join(directory, backup))

    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification).toEqual([
      {
        snapshotVersion: "3.0",
        errors: [`存在未恢复的 Nanoka artifact：${backup}`],
      },
      {
        snapshotVersion: "3.0",
        errors: [`存在未恢复的 Nanoka artifact：${staging}`],
      },
      { snapshotVersion: "3.0", errors: [] },
    ])
    expect(await readdir(directory)).toContain(staging)
    expect(await readdir(directory)).toContain(backup)

    const scopedVerification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      version: "3.0",
    })
    expect(scopedVerification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${staging}`],
    })
    expect(scopedVerification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${backup}`],
    })
  })

  it("reports lock and pending-lock artifacts without modifying them", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const lock = nanokaArtifactNameForTest("3.0", "lock")
    const pending = `${lock}-abandoned.pending`
    await writeFile(join(directory, lock), "malformed\n")
    await writeFile(join(directory, pending), "complete but abandoned\n")

    const verification = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification).toHaveLength(3)
    expect(verification).toContainEqual({ snapshotVersion: "3.0", errors: [] })
    expect(verification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${lock}`],
    })
    expect(verification).toContainEqual({
      snapshotVersion: "3.0",
      errors: [`存在未恢复的 Nanoka artifact：${pending}`],
    })
    expect(await readdir(directory)).toContain(lock)
    expect(await readdir(directory)).toContain(pending)
  })

  it("recovers stale artifacts only when no version lock is active", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const backup = nanokaArtifactNameForTest("3.0", "backup", "stale")
    const staging = nanokaArtifactNameForTest("3.0", "staging", "stale")
    const activeStaging = nanokaArtifactNameForTest("4.0", "staging", "active")
    const unknownLock = nanokaArtifactNameForTest("4.0", "lock")
    await rename(join(directory, "3.0"), join(directory, backup))
    await mkdir(join(directory, staging))
    await mkdir(join(directory, activeStaging))
    await writeFile(
      join(directory, unknownLock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version: "4.0",
        pid: process.pid,
        ownerToken: "active-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )

    await recoverNanokaRawDirectory(directory)
    expect(await readdir(directory)).toContain("3.0")
    expect(await readdir(directory)).not.toContain(backup)
    expect(await readdir(directory)).not.toContain(staging)
    expect(await readdir(directory)).toContain(activeStaging)
    expect(await readdir(directory)).toContain(unknownLock)
  })

  it("preserves stale and malformed locks for manual recovery", async () => {
    const directory = await temporaryDirectory()
    const staleVersion = "3.0"
    const malformedVersion = "5.0"
    const emptyVersion = "6.0"
    const fixtures = [
      {
        version: staleVersion,
        lockContents: `${JSON.stringify({
          schemaVersion: "nanoka-version-lock/v1",
          version: staleVersion,
          pid: 2_147_483_647,
          ownerToken: "stale-owner",
          createdAt: new Date().toISOString(),
        })}\n`,
      },
      { version: malformedVersion, lockContents: "unknown lock contents\n" },
      { version: emptyVersion, lockContents: "" },
    ]

    for (const fixture of fixtures) {
      const lock = nanokaArtifactNameForTest(fixture.version, "lock")
      const staging = nanokaArtifactNameForTest(
        fixture.version,
        "staging",
        "crashed",
      )
      await writeFile(join(directory, lock), fixture.lockContents)
      await mkdir(join(directory, staging))
    }

    await recoverNanokaRawDirectory(directory)
    const entries = await readdir(directory)
    for (const fixture of fixtures) {
      expect(entries).toContain(
        nanokaArtifactNameForTest(fixture.version, "lock"),
      )
      expect(entries).toContain(
        nanokaArtifactNameForTest(fixture.version, "staging", "crashed"),
      )
    }
    await expect(createSnapshot(directory, false)).rejects.toThrow(
      "请确认没有抓取进程正在运行，再手动删除残留锁",
    )
  })

  it("preserves an active lock during recovery", async () => {
    const directory = await temporaryDirectory()
    const version = "3.0"
    const lock = nanokaArtifactNameForTest(version, "lock")
    const staging = nanokaArtifactNameForTest(version, "staging", "active")
    await writeFile(
      join(directory, lock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version,
        pid: process.pid,
        ownerToken: "active-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )
    await mkdir(join(directory, staging))

    await recoverNanokaRawDirectory(directory)
    expect(await readdir(directory)).toContain(lock)
    expect(await readdir(directory)).toContain(staging)
  })

  it("uses exact artifact namespaces without version-prefix collisions", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const ownStaging = nanokaArtifactNameForTest("3.0", "staging", "stale")
    const neighboringVersion = "3.0-extra"
    const neighboringStaging = nanokaArtifactNameForTest(
      neighboringVersion,
      "staging",
      "active",
    )
    const neighboringLock = nanokaArtifactNameForTest(
      neighboringVersion,
      "lock",
    )
    await mkdir(join(directory, ownStaging))
    await mkdir(join(directory, neighboringStaging))
    await writeFile(
      join(directory, neighboringLock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version: neighboringVersion,
        pid: process.pid,
        ownerToken: "neighbor-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )

    await recoverNanokaRawDirectory(directory)
    expect(await readdir(directory)).not.toContain(ownStaging)
    expect(await readdir(directory)).toContain(neighboringStaging)
    expect(await readdir(directory)).toContain(neighboringLock)
  })

  it("saves exact cached manifest bytes into a different target version on 304", async () => {
    const directory = await temporaryDirectory()
    const cachedManifest = validateManifest({
      zzz: {
        live: "3.0",
        latest: "4.0",
        available: ["3.0", "4.0"],
      },
    })
    await createSnapshot(
      directory,
      false,
      {},
      {
        manifest: cachedManifest,
        version: "3.0",
        selectedBy: "live",
      },
    )
    const previousTargetManifest = validateManifest({
      zzz: {
        live: "4.0",
        latest: "4.0",
        available: ["4.0"],
      },
    })
    await createSnapshot(
      directory,
      false,
      {},
      {
        manifest: previousTargetManifest,
        version: "4.0",
        selectedBy: "latest",
      },
    )
    const cachedFetchManifestPath = join(
      directory,
      "3.0",
      "fetch-manifest.json",
    )
    const cachedFetchManifest = JSON.parse(
      await readFile(cachedFetchManifestPath, "utf8"),
    ) as {
      assets: Array<{
        assetId: string
        etag: string | null
        lastModified: string | null
        contentType: string | null
        cacheControl: string | null
        contentFetchedAt: string
        lastCheckedAt: string
      }>
    }
    const cachedManifestAsset = cachedFetchManifest.assets.find(
      (asset) => asset.assetId === "upstream-manifest",
    )
    if (cachedManifestAsset === undefined)
      throw new Error("missing fixture asset")
    cachedManifestAsset.lastModified = "Sat, 25 Jul 2026 12:00:00 GMT"
    cachedManifestAsset.cacheControl = "public, max-age=3600"
    cachedManifestAsset.lastCheckedAt = "9999-12-31T23:59:59.999Z"
    await writeFile(
      cachedFetchManifestPath,
      `${JSON.stringify(cachedFetchManifest)}\n`,
    )

    const policy = await loadSourcePolicy()
    let conditionalEtag: string | null = null
    let conditionalLastModified: string | null = null
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: {
          ...policy.requestPolicy,
          minimumStartIntervalMs: 0,
        },
      },
      {
        fetchImplementation: async (_input, init) => {
          const headers = new Headers(init?.headers)
          conditionalEtag = headers.get("If-None-Match")
          conditionalLastModified = headers.get("If-Modified-Since")
          return new Response(null, { status: 304 })
        },
        sleep: async () => {},
      },
    )

    const result = await fetchUpstreamManifest(policy, client, directory)
    expect(conditionalEtag).toBe(cachedManifestAsset.etag)
    expect(conditionalLastModified).toBe(cachedManifestAsset.lastModified)
    expect(result.manifest).toEqual(cachedManifest)
    expect(result.response).toMatchObject({
      result: "not-modified",
      status: 304,
      etag: cachedManifestAsset.etag,
      lastModified: cachedManifestAsset.lastModified,
      contentType: cachedManifestAsset.contentType,
      cacheControl: cachedManifestAsset.cacheControl,
      contentFetchedAt: cachedManifestAsset.contentFetchedAt,
    })
    expect(result.response.bytes).not.toBeNull()

    const refreshed = await createSnapshot(
      directory,
      false,
      {},
      {
        manifest: cachedManifest,
        version: "4.0",
        selectedBy: "latest",
        upstreamManifestResponse: result.response,
      },
    )
    expect(refreshed.reusedAssetCount).toBe(1)
    expect(refreshed.driftedAssetIds).toContain("upstream-manifest")
    const savedManifestBytes = await readFile(
      join(directory, "4.0", "manifest.json"),
    )
    expect(savedManifestBytes).toEqual(Buffer.from(result.response.bytes ?? []))
    const savedFetchManifest = JSON.parse(
      await readFile(join(directory, "4.0", "fetch-manifest.json"), "utf8"),
    ) as {
      observedLiveVersion: string
      observedLatestVersion: string
      observedAvailableVersions: string[]
      assets: Array<{
        assetId: string
        result: string
        httpStatus: number
        sha256: string
        bytes: number
        etag: string | null
        lastModified: string | null
        contentType: string | null
        cacheControl: string | null
        contentFetchedAt: string
      }>
    }
    expect(savedFetchManifest).toMatchObject({
      observedLiveVersion: "3.0",
      observedLatestVersion: "4.0",
      observedAvailableVersions: ["3.0", "4.0"],
    })
    expect(
      savedFetchManifest.assets.find(
        (asset) => asset.assetId === "upstream-manifest",
      ),
    ).toMatchObject({
      result: "not-modified",
      httpStatus: 304,
      bytes: savedManifestBytes.byteLength,
      sha256: sha(savedManifestBytes),
      etag: cachedManifestAsset.etag,
      lastModified: cachedManifestAsset.lastModified,
      contentType: cachedManifestAsset.contentType,
      cacheControl: cachedManifestAsset.cacheControl,
      contentFetchedAt: cachedManifestAsset.contentFetchedAt,
    })
    const verification = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
      version: "4.0",
    })
    expect(verification).toEqual([{ snapshotVersion: "4.0", errors: [] }])
  })

  it("rejects concurrent same-version fetches without touching active staging", async () => {
    const directory = await temporaryDirectory()
    const lock = nanokaArtifactNameForTest("3.0", "lock")
    const staging = nanokaArtifactNameForTest("3.0", "staging", "active")
    await writeFile(
      join(directory, lock),
      `${JSON.stringify({
        schemaVersion: "nanoka-version-lock/v1",
        version: "3.0",
        pid: process.pid,
        ownerToken: "concurrent-owner",
        createdAt: new Date().toISOString(),
      })}\n`,
    )
    await mkdir(join(directory, staging))

    await expect(createSnapshot(directory, false)).rejects.toThrow(
      "请确认没有抓取进程正在运行，再手动删除残留锁",
    )
    expect(await readdir(directory)).toContain(staging)
    expect(await readdir(directory)).toContain(lock)
  })

  it("rejects invalid UTF-8 in fetched JSON", async () => {
    const directory = await temporaryDirectory()
    const policy = await loadSourcePolicy()
    const manifest = validateManifest({
      zzz: { live: "3.0", latest: "3.0", available: ["3.0"] },
    })
    const client = new NanokaHttpClient(
      {
        ...policy,
        requestPolicy: { ...policy.requestPolicy, minimumStartIntervalMs: 0 },
      },
      {
        fetchImplementation: async () =>
          new Response(new Uint8Array([0xff]), { status: 200 }),
        sleep: async () => {},
      },
    )
    await expect(
      fetchNanokaSnapshot({
        policy,
        httpClient: client,
        upstreamManifestResponse: fetched(JSON.stringify(manifest)),
        upstreamManifest: manifest,
        version: "3.0",
        selectedBy: "live",
        rawDirectory: directory,
      }),
    ).rejects.toThrow("不是有效 UTF-8")
  })

  it("rejects incomplete or malformed fetch manifests", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<{ kind: string }>
      summary: { assetCount: number }
      completedAt?: string
    }
    delete manifest.completedAt
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
    let [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("结构无效")

    await rm(join(directory, "3.0"), { recursive: true })
    await createSnapshot(directory, false)
    const duplicateManifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as {
      assets: Array<{ kind: string; entity?: string }>
      summary: { assetCount: number }
    }
    duplicateManifest.assets = duplicateManifest.assets.filter(
      (asset) => asset.kind !== "entity-index" || asset.entity !== "character",
    )
    duplicateManifest.summary.assetCount = duplicateManifest.assets.length
    await writeFile(manifestPath, `${JSON.stringify(duplicateManifest)}\n`)
    ;[verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain(
      "存在未登记文件：character.json",
    )
  })

  it("rejects malformed v2 scope, entity closure, and result semantics", async () => {
    const directory = await temporaryDirectory()
    const policy = await loadSourcePolicy()
    await createSnapshot(directory, false)
    const manifestPath = join(directory, "3.0", "fetch-manifest.json")

    const partial = JSON.parse(await readFile(manifestPath, "utf8")) as {
      entities: string[]
      fetchScope: { mode: string; requestedEntities: string[] }
    }
    partial.entities = ["character"]
    partial.fetchScope = { mode: "all", requestedEntities: ["character"] }
    await writeFile(manifestPath, `${JSON.stringify(partial)}\n`)
    let [verification] = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("全部启用实体")
    expect(verification?.errors.join("\n")).toContain(
      "实体集合与 entities 不匹配",
    )

    await rm(join(directory, "3.0"), { recursive: true })
    await createSnapshot(directory, false)
    await createSnapshot(directory, false, {}, { entities: ["equipment"] })
    const selected = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<{
        entity?: string
        result: string
        httpStatus: number
      }>
    }
    const carried = selected.assets.find(
      (asset) => asset.entity === "character",
    )
    if (carried === undefined) throw new Error("missing carried fixture asset")
    carried.result = "fetched"
    carried.httpStatus = 200
    await writeFile(manifestPath, `${JSON.stringify(selected)}\n`)
    ;[verification] = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain(
      "未选实体资源必须为 carried-forward",
    )

    carried.result = "not-modified"
    carried.httpStatus = 200
    await writeFile(manifestPath, `${JSON.stringify(selected)}\n`)
    ;[verification] = await verifyNanokaSnapshots({
      policy,
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("结构无效")
  })

  it("strictly rejects malformed v1 asset fields and stable IDs", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const snapshotDirectory = join(directory, "3.0")
    const manifestPath = join(snapshotDirectory, "fetch-manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      assets: Array<Record<string, unknown>>
      summary: {
        entities: {
          character: {
            recordCount: number
            detailCountByLanguage: { zh: number; en: number }
          }
        }
      }
    } & Record<string, unknown>
    const characterAssets = manifest.assets
      .filter(
        (asset) =>
          asset.entity === "character" || asset.kind === "upstream-manifest",
      )
      .map((asset) => {
        if (asset.kind === "upstream-manifest") return asset
        if (asset.kind === "entity-index")
          return {
            ...asset,
            assetId: "character-index",
            kind: "character-index",
            entity: undefined,
          }
        return {
          ...asset,
          assetId: `character-detail:${String(asset.language)}:${String(asset.entityId)}`,
          kind: "character-detail",
          characterId: asset.entityId,
          entity: undefined,
          entityId: undefined,
        }
      })
    const v1 = {
      ...manifest,
      schemaVersion: "nanoka-fetch-manifest/v1",
      assets: characterAssets,
      summary: {
        characterCount: manifest.summary.entities.character.recordCount,
        zhDetailCount:
          manifest.summary.entities.character.detailCountByLanguage.zh,
        enDetailCount:
          manifest.summary.entities.character.detailCountByLanguage.en,
        assetCount: characterAssets.length,
        totalBytes: characterAssets.reduce(
          (sum, asset) => sum + Number(asset.bytes),
          0,
        ),
      },
    } as Record<string, unknown>
    delete v1.entities
    delete v1.fetchScope
    delete v1.validation
    const v1Assets = v1.assets as Array<Record<string, unknown>>
    const index = v1Assets.find((asset) => asset.kind === "character-index")
    if (index === undefined) throw new Error("missing v1 index fixture")
    index.characterId = "1011"
    index.assetId = "wrong-index"
    await rm(join(snapshotDirectory, "equipment.json"))
    await rm(join(snapshotDirectory, "zh", "equipment"), { recursive: true })
    await rm(join(snapshotDirectory, "en", "equipment"), { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(v1)}\n`)

    const [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
    })
    expect(verification?.errors.join("\n")).toContain("结构无效")
  })

  it("rejects symbolic links in managed snapshot files", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const target = join(directory, "outside.json")
    const asset = join(directory, "3.0", "zh", "character", "1011.json")
    await writeFile(target, '{"id":1011,"name":"outside"}')
    await rm(asset)
    await symlink(target, asset)

    const [verification] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      version: "3.0",
    })
    expect(verification?.errors.join("\n")).toContain("资源不是普通文件")
  })

  it("rejects empty character indexes without replacing an existing snapshot", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const before = await readFile(join(directory, "3.0", "character.json"))

    await expect(
      createSnapshot(directory, false, {
        "/zzz/3.0/character.json": "{}",
      }),
    ).rejects.toThrow("character.json 不能为空")
    expect(await readFile(join(directory, "3.0", "character.json"))).toEqual(
      before,
    )
  })

  it("does not replace an existing snapshot when a fetch fails", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    const before = await readFile(join(directory, "3.0", "fetch-manifest.json"))
    await expect(
      createSnapshot(directory, false, {
        "/zzz/3.0/zh/character/1011.json": undefined,
      }),
    ).rejects.toThrow("返回 404")
    expect(
      await readFile(join(directory, "3.0", "fetch-manifest.json")),
    ).toEqual(before)
  })

  it("reports tampering, missing files, and unregistered files", async () => {
    const directory = await temporaryDirectory()
    await createSnapshot(directory, false)
    await writeFile(
      join(directory, "3.0", "zh", "character", "1011.json"),
      "{}",
    )
    await rm(join(directory, "3.0", "en", "character", "2.json"))
    await writeFile(join(directory, "3.0", "extra.json"), "{}")
    const [result] = await verifyNanokaSnapshots({
      policy: await loadSourcePolicy(),
      rawDirectory: directory,
      version: "3.0",
    })
    expect(result?.errors.join("\n")).toContain("SHA-256 不匹配")
    expect(result?.errors.join("\n")).toContain("缺少文件")
    expect(result?.errors.join("\n")).toContain("存在未登记文件")
  })
})

async function createSnapshot(
  rawDirectory: string,
  notModified: boolean,
  overrides: Record<string, string | undefined> = {},
  options: {
    manifest?: ReturnType<typeof validateManifest>
    version?: string
    selectedBy?: "live" | "latest" | "version" | "interactive"
    upstreamManifestResponse?: FetchedHttpAsset
    entities?: string[]
    onProgress?: (progress: SnapshotFetchProgress) => void
  } = {},
) {
  const policy = await loadSourcePolicy()
  const manifest =
    options.manifest ??
    validateManifest({
      zzz: { live: "3.0", latest: "3.0", available: ["3.0"] },
    })
  const version = options.version ?? "3.0"
  const contents: Record<string, string | undefined> = {
    [`/zzz/${version}/character.json`]: '{"1011":{},"2":{}}',
    [`/zzz/${version}/zh/character/2.json`]: '{"id":2,"name":"二"}',
    [`/zzz/${version}/en/character/2.json`]: '{"id":2,"name":"Two"}',
    [`/zzz/${version}/zh/character/1011.json`]: '{"id":1011,"name":"安比"}',
    [`/zzz/${version}/en/character/1011.json`]: '{"id":1011,"name":"Anby"}',
    [`/zzz/${version}/equipment.json`]:
      '{"31000":{"icon":"UI/31000.png","zh":{"name":"啄木鸟电音","desc2":"二件套","desc4":"四件套"},"en":{"name":"Woodpecker Electro","desc2":"2-piece","desc4":"4-piece"}},"31100":{"icon":"UI/31100.png","zh":{"name":"河豚电音","desc2":"二件套","desc4":"四件套"},"en":{"name":"Puffer Electro","desc2":"2-piece","desc4":"4-piece"}}}',
    [`/zzz/${version}/zh/equipment/31000.json`]:
      '{"id":31000,"name":"啄木鸟电音","desc2":"二件套","desc4":"四件套","story":"...","icon":"UI/31000.png","icon2":"UI/31000.png"}',
    [`/zzz/${version}/en/equipment/31000.json`]:
      '{"id":31000,"name":"Woodpecker Electro","desc2":"2-piece","desc4":"4-piece","story":"...","icon":"UI/31000.png","icon2":"UI/31000.png"}',
    [`/zzz/${version}/zh/equipment/31100.json`]:
      '{"id":31100,"name":"河豚电音","desc2":"二件套","desc4":"四件套","story":"...","icon":"UI/31100.png","icon2":"UI/31100.png"}',
    [`/zzz/${version}/en/equipment/31100.json`]:
      '{"id":31100,"name":"Puffer Electro","desc2":"2-piece","desc4":"4-piece","story":"...","icon":"UI/31100.png","icon2":"UI/31100.png"}',
    ...overrides,
  }
  const httpClient = new NanokaHttpClient(
    {
      ...policy,
      requestPolicy: {
        ...policy.requestPolicy,
        minimumStartIntervalMs: 0,
      },
    },
    {
      fetchImplementation: async (input, init) => {
        const url = new URL(String(input))
        const content = contents[url.pathname]
        if (content === undefined)
          return new Response("missing", { status: 404 })
        const hasValidator = new Headers(init?.headers).has("If-None-Match")
        if (notModified && hasValidator)
          return new Response(null, { status: 304 })
        return new Response(content, {
          status: 200,
          headers: {
            "ETag": `"${sha(content)}"`,
            "Content-Type": "application/json",
          },
        })
      },
      sleep: async () => {},
    },
  )
  return fetchNanokaSnapshot({
    policy,
    httpClient,
    upstreamManifestResponse:
      options.upstreamManifestResponse ?? fetched(JSON.stringify(manifest)),
    upstreamManifest: manifest,
    version,
    selectedBy: options.selectedBy ?? "live",
    rawDirectory,
    ...(options.entities === undefined ? {} : { entities: options.entities }),
    ...(options.onProgress === undefined
      ? {}
      : { onProgress: options.onProgress }),
  })
}

function fetched(content: string): FetchedHttpAsset {
  return {
    status: 200,
    result: "fetched",
    bytes: new TextEncoder().encode(content),
    etag: `"${sha(content)}"`,
    lastModified: null,
    contentType: "application/json",
    cacheControl: null,
    checkedAt: new Date().toISOString(),
  }
}

function sha(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex")
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "nanoka-snapshot-"))
  temporaryDirectories.push(directory)
  return directory
}

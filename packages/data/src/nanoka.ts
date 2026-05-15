import type { ParsedSourceBatch, ParsedSourceRecord, RawSourceFetchResult, SourceAdapter, SourceFetchContext } from "./adapters"

export const NANOKA_SOURCE_ID = "nanoka-zzz"
export const NANOKA_PARSER_VERSION = "nanoka-source-v0.1.0"

export type NanokaRawEntityType =
  | "sourceManifest"
  | "bossIndex"
  | "character"
  | "boss"
  | "bangboo"
  | "weapon"
  | "equipment"

export interface NanokaRawSnapshotAsset {
  id: string
  url: string
  path: string
  localPath: string
  entityType: NanokaRawEntityType
  language?: "zh" | "en" | "ja" | "ko"
  entityId?: number
  sourceVersion: string
  approvedForCleanedOutput: boolean
  evidenceUse: string
  bytes: number
  sha256: string
}

export interface NanokaRawSnapshotManifest {
  schemaVersion: "nanoka-fetch-manifest-v1"
  sourceId: typeof NANOKA_SOURCE_ID
  snapshotId: string
  fetchedAt: string
  generatedAt: string
  parserVersion: typeof NANOKA_PARSER_VERSION
  formalLivePolicy: {
    liveVersionRef: "manifest.zzz.live"
    configuredLiveVersion: string
    latestPolicy: "research-and-drift-only"
    rawSnapshotPurpose: string
  }
  urlPolicy: {
    manifestUrl: string
    approvedIndexUrls: string[]
    approvedLocalizedDetailUrlPatterns: string[]
    forbiddenIndexNames: string[]
  }
  assets: NanokaRawSnapshotAsset[]
  summary: {
    manifestLiveVersion: string
    manifestLatestVersion: string
    bossIndexCount: number
    characterSample: {
      id: number
      codeName?: string
      hasStats: boolean
      resourceRawPaths: string[]
    }
    sentinelSample?: {
      id: number
      codeName?: string
      hasStats: boolean
      rpMaxRaw?: number
      rpRecoverRaw?: number
      firstSkillParam?: {
        id: number
        feverRecoveryRaw?: number
        rpRecoveryRaw?: number
      }
      rawPaths: string[]
    }
    deadlyAssaultSample: {
      id: number
      zoneCount: number
      hasBossAdjust: boolean
    }
    bangbooSample?: {
      id: number
      codeName?: string
      hasStats: boolean
      hasSkillProp: boolean
    }
    wEngineSample?: {
      id: number
      codeName?: string
      hasBaseProperty: boolean
      hasRandProperty: boolean
    }
    driveDiscSample?: {
      id: number
      name?: string
      hasSetDescriptions: boolean
    }
    retainedAssetCount: number
  }
}

export interface NanokaSnapshotAdapterOptions {
  manifest: NanokaRawSnapshotManifest
}

export function assertNanokaSnapshotManifest(
  manifest: NanokaRawSnapshotManifest,
): void {
  if (manifest.schemaVersion !== "nanoka-fetch-manifest-v1")
    throw new Error("Unexpected nanoka snapshot schemaVersion")
  if (manifest.sourceId !== NANOKA_SOURCE_ID)
    throw new Error(`Unexpected nanoka sourceId: ${manifest.sourceId}`)
  if (manifest.parserVersion !== NANOKA_PARSER_VERSION)
    throw new Error(`Unexpected nanoka parserVersion: ${manifest.parserVersion}`)
  if (manifest.formalLivePolicy.liveVersionRef !== "manifest.zzz.live")
    throw new Error("nanoka snapshot must be tied to manifest.zzz.live")
  if (manifest.snapshotId !== manifest.formalLivePolicy.configuredLiveVersion)
    throw new Error("nanoka snapshotId must match configuredLiveVersion")

  assertNanokaUrlPolicy(manifest)

  const assetIds = manifest.assets.map(asset => asset.id)
  if (new Set(assetIds).size !== assetIds.length)
    throw new Error("nanoka snapshot asset ids must be unique")
  if (!assetIds.includes("manifest"))
    throw new Error("nanoka snapshot must retain manifest.json")
  if (!assetIds.includes("boss-index"))
    throw new Error("nanoka snapshot must retain boss.json index")

  for (const asset of manifest.assets) {
    if (asset.sourceVersion !== manifest.snapshotId)
      throw new Error(`${asset.id}: sourceVersion must match snapshotId`)
    assertNanokaAssetUrlAllowed(manifest, asset)
    if (asset.entityType === "sourceManifest" && asset.approvedForCleanedOutput)
      throw new Error("source manifest gates must not be marked cleaned-output evidence")
  }
}

function assertNanokaUrlPolicy(manifest: NanokaRawSnapshotManifest): void {
  if (manifest.urlPolicy.manifestUrl !== "https://static.nanoka.cc/manifest.json")
    throw new Error("nanoka urlPolicy manifestUrl must point to static.nanoka.cc manifest.json")
  if (!manifest.urlPolicy.approvedIndexUrls.includes(`https://static.nanoka.cc/zzz/${manifest.snapshotId}/boss.json`))
    throw new Error("nanoka urlPolicy must approve the live boss index")
  for (const forbiddenIndexName of ["beta", "preview", "leak", "datamine"]) {
    if (!manifest.urlPolicy.forbiddenIndexNames.includes(forbiddenIndexName))
      throw new Error(`nanoka urlPolicy must forbid ${forbiddenIndexName}.json indexes`)
  }
}

function assertNanokaAssetUrlAllowed(
  manifest: NanokaRawSnapshotManifest,
  asset: NanokaRawSnapshotAsset,
): void {
  let url: URL
  try {
    url = new URL(asset.url)
  }
  catch {
    throw new Error(`${asset.id}: invalid nanoka asset URL`)
  }

  if (url.origin !== "https://static.nanoka.cc")
    throw new Error(`${asset.id}: asset URL is not allowed by nanoka urlPolicy`)

  if (asset.entityType === "sourceManifest") {
    if (asset.url !== manifest.urlPolicy.manifestUrl)
      throw new Error(`${asset.id}: asset URL is not allowed by nanoka urlPolicy`)
    return
  }

  for (const forbiddenIndexName of manifest.urlPolicy.forbiddenIndexNames) {
    if (url.pathname === `/zzz/${manifest.snapshotId}/${forbiddenIndexName}.json`)
      throw new Error(`${asset.id}: forbidden nanoka route in snapshot`)
  }

  const pathSegments = url.pathname.split("/")
  const fileName = pathSegments.at(-1)
  if (fileName !== undefined && manifest.urlPolicy.forbiddenIndexNames.includes(fileName.replace(/\.json$/, "")))
    throw new Error(`${asset.id}: forbidden nanoka route in snapshot`)

  if (asset.entityType === "bossIndex") {
    if (!manifest.urlPolicy.approvedIndexUrls.includes(asset.url))
      throw new Error(`${asset.id}: asset URL is not allowed by nanoka urlPolicy`)
    return
  }

  const detailPattern = new RegExp(
    `^/zzz/${escapeRegExp(manifest.snapshotId)}/(?:zh|en|ja|ko)/(?:character|bangboo|monster|weapon|equipment|boss)/\\d+\\.json$`,
  )
  if (!detailPattern.test(url.pathname))
    throw new Error(`${asset.id}: asset URL is not allowed by nanoka urlPolicy`)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function nanokaSnapshotRecords(
  manifest: NanokaRawSnapshotManifest,
): ParsedSourceRecord[] {
  assertNanokaSnapshotManifest(manifest)

  return manifest.assets.map(asset => ({
    id: asset.id,
    sourceAnchor: asset.url,
    dataPath: asset.localPath,
    raw: {
      entityType: asset.entityType,
      entityId: asset.entityId,
      language: asset.language,
      sha256: asset.sha256,
      approvedForCleanedOutput: asset.approvedForCleanedOutput,
      evidenceUse: asset.evidenceUse,
    },
  }))
}

export function createNanokaSnapshotAdapter(
  options: NanokaSnapshotAdapterOptions,
): SourceAdapter<NanokaRawSnapshotManifest> {
  assertNanokaSnapshotManifest(options.manifest)

  return {
    sourceId: NANOKA_SOURCE_ID,
    async fetch(context: SourceFetchContext): Promise<RawSourceFetchResult<NanokaRawSnapshotManifest>> {
      return {
        sourceId: NANOKA_SOURCE_ID,
        sourceVersion: options.manifest.snapshotId,
        fetchedAt: context.now,
        payload: options.manifest,
        fileName: `data/source/raw/nanoka/zzz/${options.manifest.snapshotId}/fetch-manifest.json`,
        contentType: "application/json",
      }
    },
    async parse(raw): Promise<ParsedSourceBatch> {
      if (raw.sourceId !== NANOKA_SOURCE_ID)
        throw new Error(`nanoka adapter raw sourceId mismatch: ${raw.sourceId}`)
      if (raw.sourceVersion !== raw.payload.snapshotId)
        throw new Error("nanoka adapter raw sourceVersion must match payload snapshotId")
      assertNanokaSnapshotManifest(raw.payload)

      return {
        sourceId: NANOKA_SOURCE_ID,
        sourceVersion: raw.sourceVersion,
        formalDataReady: false,
        records: nanokaSnapshotRecords(raw.payload),
        notes: [
          "Nanoka snapshot adapter is source-gate only in this slice.",
          "Formal cleaned data promotion waits for Phase 2 normalization and semantic mapping.",
        ],
      }
    },
  }
}

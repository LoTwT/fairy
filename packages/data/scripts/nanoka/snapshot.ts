import { createHash, randomUUID } from "node:crypto"
import {
  link,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"
import {
  createCharacterDetailResource,
  createCharacterDetailResources,
  discoverCharacterIds,
  validateCharacterDetail,
} from "./characters.ts"
import type { FetchedHttpAsset, NanokaHttpClient } from "./http.ts"
import {
  buildCharacterDetailUrl,
  buildCharacterIndexUrl,
  buildManifestUrl,
  decodeUtf8Json,
  isNonNegativeInteger,
  isPlainObject,
  packageDirectory,
  supportedLanguages,
  type NanokaManifest,
  type SourcePolicy,
  type SupportedLanguage,
  type VersionSelection,
  validateManifest,
  validateVersion,
} from "./policy.ts"

export interface FetchAssetRecord {
  assetId: string
  kind: "upstream-manifest" | "character-index" | "character-detail"
  language?: SupportedLanguage
  characterId?: string
  url: string
  localPath: string
  httpStatus: number
  result: "fetched" | "not-modified"
  etag: string | null
  lastModified: string | null
  contentType: string | null
  cacheControl: string | null
  bytes: number
  sha256: string
  contentFetchedAt: string
  lastCheckedAt: string
}

export interface FetchManifest {
  schemaVersion: "nanoka-fetch-manifest/v1"
  sourceId: string
  game: "zzz"
  snapshotVersion: string
  selectedBy: VersionSelection
  observedLiveVersion: string
  observedLatestVersion: string
  observedAvailableVersions: string[]
  startedAt: string
  completedAt: string
  userAgent: string
  languages: SupportedLanguage[]
  assets: FetchAssetRecord[]
  summary: {
    characterCount: number
    zhDetailCount: number
    enDetailCount: number
    assetCount: number
    totalBytes: number
  }
}

export interface SnapshotFetchResult {
  manifest: FetchManifest
  reusedAssetCount: number
  driftedAssetIds: string[]
  cleanupWarnings: string[]
}

export interface VerificationResult {
  snapshotVersion: string
  errors: string[]
}

export type SnapshotFetchProgress =
  | { stage: "preparing" }
  | {
      stage: "characters-discovered"
      characterCount: number
      detailCount: number
    }
  | { stage: "details"; completed: number; total: number }
  | { stage: "verifying" }
  | { stage: "publishing" }

export const rawNanokaDirectory = join(packageDirectory, "raw", "nanoka")

const artifactNamespacePrefix = ".nanoka-artifact-"

function artifactVersionLabel(name: string): string {
  const match =
    /^\.nanoka-artifact-([A-Za-z0-9_-]+)-(?:lock|staging|backup)(?:-.+)?$/u.exec(
      name,
    )
  if (match?.[1] === undefined) return name
  return versionFromNamespace(match[1]) ?? name
}

function versionNamespace(version: string): string {
  return Buffer.from(version, "utf8").toString("base64url")
}

function versionFromNamespace(namespace: string): string | undefined {
  try {
    const bytes = Buffer.from(namespace, "base64url")
    const version = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    if (versionNamespace(version) !== namespace) return undefined
    return validateVersion(version)
  } catch {
    return undefined
  }
}

function artifactName(
  version: string,
  kind: "lock" | "staging" | "backup",
  runIdentifier?: string,
): string {
  const base = `${artifactNamespacePrefix}${versionNamespace(version)}-${kind}`
  return runIdentifier === undefined ? base : `${base}-${runIdentifier}`
}

export function nanokaArtifactNameForTest(
  version: string,
  kind: "lock" | "staging" | "backup",
  runIdentifier?: string,
): string {
  return artifactName(validateVersion(version), kind, runIdentifier)
}

export async function fetchUpstreamManifest(
  policy: SourcePolicy,
  httpClient: NanokaHttpClient,
  rawDirectory = rawNanokaDirectory,
): Promise<{ response: FetchedHttpAsset; manifest: NanokaManifest }> {
  await recoverNanokaRawDirectory(rawDirectory)
  const cachedAsset = await findCachedUpstreamManifest(rawDirectory)
  const response = await fetchAssetWithValidatedCacheFallback({
    httpClient,
    url: buildManifestUrl(policy),
    cachedAsset,
  })
  if (response.result === "not-modified") {
    if (cachedAsset === undefined || response.bytes === null) {
      throw new Error("manifest 返回 304，但没有可验证的本地缓存")
    }
    return {
      response,
      manifest: validateManifest(
        decodeUtf8Json(response.bytes, "Nanoka manifest"),
      ),
    }
  }
  if (response.bytes === null) throw new Error("manifest 成功响应缺少字节内容")
  const manifest = validateManifest(
    decodeUtf8Json(response.bytes, "Nanoka manifest"),
  )
  return { response, manifest }
}

export async function recoverNanokaRawDirectory(
  rawDirectory = rawNanokaDirectory,
): Promise<void> {
  if (!(await pathExists(rawDirectory))) return
  const entries = await readdir(rawDirectory, { withFileTypes: true })
  const interruptedVersions = new Set<string>()
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const match =
      /^\.nanoka-artifact-([A-Za-z0-9_-]+)-(?:staging|backup)-.+$/u.exec(
        entry.name,
      )
    if (match?.[1] === undefined) continue
    const version = versionFromNamespace(match[1])
    if (version !== undefined) interruptedVersions.add(version)
  }
  for (const version of interruptedVersions) {
    const releaseVersionLock = await tryAcquireVersionLock(
      rawDirectory,
      version,
    )
    if (releaseVersionLock === undefined) continue
    try {
      await recoverVersionArtifacts(rawDirectory, version)
    } finally {
      await releaseVersionLock()
    }
  }
}

export async function fetchNanokaSnapshot(options: {
  policy: SourcePolicy
  httpClient: NanokaHttpClient
  upstreamManifestResponse: FetchedHttpAsset
  upstreamManifest: NanokaManifest
  version: string
  selectedBy: VersionSelection
  rawDirectory?: string
  onProgress?: (progress: SnapshotFetchProgress) => void
}): Promise<SnapshotFetchResult> {
  const {
    policy,
    httpClient,
    upstreamManifestResponse,
    upstreamManifest,
    selectedBy,
  } = options
  const version = validateVersion(options.version)
  const rawDirectory = options.rawDirectory ?? rawNanokaDirectory
  const targetDirectory = join(rawDirectory, version)
  const runIdentifier = `${process.pid}-${Date.now()}-${randomUUID()}`
  const stagingDirectory = join(
    rawDirectory,
    artifactName(version, "staging", runIdentifier),
  )
  const backupDirectory = join(
    rawDirectory,
    artifactName(version, "backup", runIdentifier),
  )
  const startedAt = new Date().toISOString()

  await mkdir(rawDirectory, { recursive: true })
  const releaseVersionLock = await acquireVersionLock(rawDirectory, version)
  let publicationCommitted = false
  let result: SnapshotFetchResult | undefined
  let operationError: unknown
  try {
    options.onProgress?.({ stage: "preparing" })
    await recoverVersionArtifacts(rawDirectory, version)
    const existingManifest = await readExistingFetchManifest(targetDirectory)
    const existingAssets = new Map(
      (existingManifest?.assets ?? []).map((asset) => [asset.assetId, asset]),
    )
    const assets: FetchAssetRecord[] = []
    const driftedAssetIds: string[] = []

    try {
      await mkdir(stagingDirectory, { recursive: true })
      const manifestAsset = await saveFetchedAsset({
        response: upstreamManifestResponse,
        assetId: "upstream-manifest",
        kind: "upstream-manifest",
        url: buildManifestUrl(policy).href,
        localPath: "manifest.json",
        stagingDirectory,
        existingDirectory: targetDirectory,
        existing: existingAssets.get("upstream-manifest"),
      })
      assets.push(manifestAsset.record)
      if (manifestAsset.drifted)
        driftedAssetIds.push(manifestAsset.record.assetId)

      const indexAssetId = "character-index"
      const indexUrl = buildCharacterIndexUrl(policy, version)
      const indexResponse = await fetchAssetWithValidatedCacheFallback({
        httpClient,
        url: indexUrl,
        cachedAsset: cachedAssetFor(
          targetDirectory,
          existingAssets.get(indexAssetId),
          "character.json",
        ),
      })
      const indexAsset = await saveFetchedAsset({
        response: indexResponse,
        assetId: indexAssetId,
        kind: "character-index",
        url: indexUrl.href,
        localPath: "character.json",
        stagingDirectory,
        existingDirectory: targetDirectory,
        existing: existingAssets.get(indexAssetId),
      })
      assets.push(indexAsset.record)
      if (indexAsset.drifted) driftedAssetIds.push(indexAssetId)
      const characterIndex = decodeUtf8Json(indexAsset.bytes, "character.json")
      const characterIds = discoverCharacterIds(characterIndex)

      const detailResources = createCharacterDetailResources(
        characterIds,
        policy.languages,
      )
      options.onProgress?.({
        stage: "characters-discovered",
        characterCount: characterIds.length,
        detailCount: detailResources.length,
      })
      let completedDetailCount = 0
      const detailAssets = await mapConcurrent(
        detailResources,
        policy.requestPolicy.maxConcurrency,
        async (resource) => {
          const existing = existingAssets.get(resource.assetId)
          const url = buildCharacterDetailUrl(
            policy,
            version,
            resource.language,
            resource.characterId,
          )
          const response = await fetchAssetWithValidatedCacheFallback({
            httpClient,
            url,
            cachedAsset: cachedAssetFor(
              targetDirectory,
              existing,
              resource.localPath,
            ),
          })
          const saved = await saveFetchedAsset({
            response,
            assetId: resource.assetId,
            kind: "character-detail",
            language: resource.language,
            characterId: resource.characterId,
            url: url.href,
            localPath: resource.localPath,
            stagingDirectory,
            existingDirectory: targetDirectory,
            existing,
          })
          validateCharacterDetail(
            decodeUtf8Json(saved.bytes, resource.localPath),
            resource.characterId,
          )
          completedDetailCount += 1
          options.onProgress?.({
            stage: "details",
            completed: completedDetailCount,
            total: detailResources.length,
          })
          return { record: saved.record, drifted: saved.drifted }
        },
      )
      for (const detailAsset of detailAssets) {
        assets.push(detailAsset.record)
        if (detailAsset.drifted) {
          driftedAssetIds.push(detailAsset.record.assetId)
        }
      }

      assets.sort((left, right) => left.assetId.localeCompare(right.assetId))
      const fetchManifest: FetchManifest = {
        schemaVersion: "nanoka-fetch-manifest/v1",
        sourceId: policy.sourceId,
        game: "zzz",
        snapshotVersion: version,
        selectedBy,
        observedLiveVersion: upstreamManifest.zzz.live,
        observedLatestVersion: upstreamManifest.zzz.latest,
        observedAvailableVersions: [...upstreamManifest.zzz.available],
        startedAt,
        completedAt: new Date().toISOString(),
        userAgent: policy.userAgent,
        languages: [...policy.languages],
        assets,
        summary: {
          characterCount: characterIds.length,
          zhDetailCount: detailAssets.filter(
            (asset) => asset.record.language === "zh",
          ).length,
          enDetailCount: detailAssets.filter(
            (asset) => asset.record.language === "en",
          ).length,
          assetCount: assets.length,
          totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
        },
      }
      await writeFile(
        join(stagingDirectory, "fetch-manifest.json"),
        `${JSON.stringify(fetchManifest, undefined, 2)}\n`,
      )

      options.onProgress?.({ stage: "verifying" })
      const verification = await verifySnapshotDirectory(
        policy,
        stagingDirectory,
        version,
      )
      if (verification.errors.length > 0) {
        throw new Error(
          `staging 快照校验失败：\n${verification.errors.join("\n")}`,
        )
      }
      options.onProgress?.({ stage: "publishing" })
      const exchange = await exchangeSnapshot(
        targetDirectory,
        stagingDirectory,
        backupDirectory,
      )
      publicationCommitted = true

      result = {
        manifest: fetchManifest,
        reusedAssetCount: assets.filter(
          (asset) => asset.result === "not-modified",
        ).length,
        driftedAssetIds,
        cleanupWarnings:
          exchange.cleanupWarning === undefined
            ? []
            : [exchange.cleanupWarning],
      }
    } catch (error) {
      await rm(stagingDirectory, { force: true, recursive: true })
      throw error
    }
  } catch (error) {
    operationError = error
  }
  try {
    await releaseVersionLock()
  } catch (error) {
    const message = `版本 ${version} 已发布，但版本锁清理失败：${error instanceof Error ? error.message : String(error)}`
    if (publicationCommitted && result !== undefined) {
      result.cleanupWarnings.push(message)
    } else if (operationError === undefined) {
      operationError = error
    } else {
      operationError = new AggregateError(
        [operationError, error],
        `版本 ${version} 处理失败，且版本锁清理失败`,
      )
    }
  }
  if (operationError !== undefined) throw operationError
  if (result === undefined) throw new Error(`版本 ${version} 抓取未生成结果`)
  return result
}

export async function verifyNanokaSnapshots(options: {
  policy: SourcePolicy
  version?: string
  rawDirectory?: string
}): Promise<VerificationResult[]> {
  const rawDirectory = options.rawDirectory ?? rawNanokaDirectory
  if (options.version !== undefined) {
    const version = validateVersion(options.version)
    const directory = join(rawDirectory, version)
    if (!(await pathExists(directory))) {
      throw new Error(`本地快照不存在：${version}`)
    }
    const results = [
      await verifySnapshotDirectory(options.policy, directory, version),
    ]
    if (await pathExists(rawDirectory)) {
      const entries = await readdir(rawDirectory, { withFileTypes: true })
      for (const entry of entries) {
        if (
          !entry.name.startsWith(artifactNamespacePrefix) ||
          artifactVersionLabel(entry.name) !== version
        ) {
          continue
        }
        results.push({
          snapshotVersion: version,
          errors: [`存在未恢复的 Nanoka artifact：${entry.name}`],
        })
      }
    }
    return results
  }

  if (!(await pathExists(rawDirectory))) return []
  const entries = await readdir(rawDirectory, { withFileTypes: true })
  const results: VerificationResult[] = []
  const versions: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith(artifactNamespacePrefix)) {
      results.push({
        snapshotVersion: artifactVersionLabel(entry.name),
        errors: [`存在未恢复的 Nanoka artifact：${entry.name}`],
      })
      continue
    }
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    try {
      versions.push(validateVersion(entry.name))
    } catch (error) {
      results.push({
        snapshotVersion: entry.name,
        errors: [error instanceof Error ? error.message : String(error)],
      })
    }
  }
  const verified = await Promise.all(
    versions
      .toSorted()
      .map((version) =>
        verifySnapshotDirectory(
          options.policy,
          join(rawDirectory, version),
          version,
        ),
      ),
  )
  return [...results, ...verified].toSorted((left, right) =>
    left.snapshotVersion.localeCompare(right.snapshotVersion),
  )
}

async function verifySnapshotDirectory(
  policy: SourcePolicy,
  directory: string,
  expectedVersion: string,
): Promise<VerificationResult> {
  const errors: string[] = []
  let manifest: FetchManifest
  try {
    manifest = parseFetchManifest(
      decodeUtf8Json(
        new Uint8Array(await readFile(join(directory, "fetch-manifest.json"))),
        "fetch-manifest.json",
      ),
    )
  } catch (error) {
    return {
      snapshotVersion: expectedVersion,
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }

  if (manifest.sourceId !== policy.sourceId)
    errors.push(`sourceId 不匹配：${manifest.sourceId}`)
  if (manifest.game !== policy.game)
    errors.push(`game 不匹配：${manifest.game}`)
  if (manifest.snapshotVersion !== expectedVersion)
    errors.push(`snapshotVersion 不匹配：${manifest.snapshotVersion}`)
  if (
    manifest.languages.length !== policy.languages.length ||
    !policy.languages.every((language) => manifest.languages.includes(language))
  ) {
    errors.push("languages 与来源配置不匹配")
  }
  try {
    const savedUpstreamManifest = validateManifest(
      decodeUtf8Json(
        new Uint8Array(await readFile(join(directory, "manifest.json"))),
        "manifest.json",
      ),
    )
    if (
      savedUpstreamManifest.zzz.live !== manifest.observedLiveVersion ||
      savedUpstreamManifest.zzz.latest !== manifest.observedLatestVersion ||
      !sameStringArray(
        savedUpstreamManifest.zzz.available,
        manifest.observedAvailableVersions,
      )
    ) {
      errors.push("保存的 manifest 内容与 observed 字段不匹配")
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  const expectedPaths = new Set(["fetch-manifest.json"])
  const manifestAssets = manifest.assets.filter(
    (asset) => asset.kind === "upstream-manifest",
  )
  const indexAssets = manifest.assets.filter(
    (asset) => asset.kind === "character-index",
  )
  if (manifestAssets.length !== 1) {
    errors.push(`upstream-manifest 资源数量必须为 1：${manifestAssets.length}`)
  }
  if (indexAssets.length !== 1) {
    errors.push(`character-index 资源数量必须为 1：${indexAssets.length}`)
  }
  const assetIds = new Set<string>()
  const assetPaths = new Set<string>()
  for (const asset of manifest.assets) {
    if (assetIds.has(asset.assetId))
      errors.push(`重复 assetId：${asset.assetId}`)
    assetIds.add(asset.assetId)
    if (assetPaths.has(asset.localPath))
      errors.push(`重复 localPath：${asset.localPath}`)
    assetPaths.add(asset.localPath)
    try {
      validateAssetRecord(policy, expectedVersion, asset)
      expectedPaths.add(asset.localPath)
      const bytes = new Uint8Array(
        await readFile(resolveSnapshotAssetPath(directory, asset.localPath)),
      )
      const hash = sha256(bytes)
      if (bytes.byteLength !== asset.bytes) {
        errors.push(`${asset.localPath} 字节数不匹配`)
      }
      if (hash !== asset.sha256) {
        errors.push(`${asset.localPath} SHA-256 不匹配`)
      }
    } catch (error) {
      errors.push(
        `${asset.localPath} 无法验证：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const actualPaths = new Set(await listRelativeFiles(directory))
  for (const expectedPath of expectedPaths) {
    if (!actualPaths.has(expectedPath)) errors.push(`缺少文件：${expectedPath}`)
  }
  for (const actualPath of actualPaths) {
    if (!expectedPaths.has(actualPath))
      errors.push(`存在未登记文件：${actualPath}`)
  }

  try {
    const indexValue = decodeUtf8Json(
      new Uint8Array(await readFile(join(directory, "character.json"))),
      "character.json",
    )
    const ids = discoverCharacterIds(indexValue)
    const expectedDetailPaths = new Set(
      createCharacterDetailResources(ids, policy.languages).map(
        (resource) => resource.localPath,
      ),
    )
    const registeredDetailPaths = new Set(
      manifest.assets
        .filter((asset) => asset.kind === "character-detail")
        .map((asset) => asset.localPath),
    )
    for (const path of expectedDetailPaths) {
      if (!registeredDetailPaths.has(path)) errors.push(`缺少详情登记：${path}`)
    }
    for (const path of registeredDetailPaths) {
      if (!expectedDetailPaths.has(path)) errors.push(`多余详情登记：${path}`)
    }
    for (const asset of manifest.assets.filter(
      (candidate) => candidate.kind === "character-detail",
    )) {
      if (asset.characterId === undefined || asset.language === undefined) {
        errors.push(`${asset.assetId} 缺少 language 或 characterId`)
        continue
      }
      try {
        validateAssetRecord(policy, expectedVersion, asset)
        validateCharacterDetail(
          decodeUtf8Json(
            new Uint8Array(
              await readFile(
                resolveSnapshotAssetPath(directory, asset.localPath),
              ),
            ),
            asset.localPath,
          ),
          asset.characterId,
        )
      } catch (error) {
        errors.push(
          `${asset.localPath} 内容无效：${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    const zhCount = manifest.assets.filter(
      (asset) => asset.kind === "character-detail" && asset.language === "zh",
    ).length
    const enCount = manifest.assets.filter(
      (asset) => asset.kind === "character-detail" && asset.language === "en",
    ).length
    if (manifest.summary.characterCount !== ids.length)
      errors.push("summary.characterCount 不匹配")
    if (manifest.summary.zhDetailCount !== zhCount)
      errors.push("summary.zhDetailCount 不匹配")
    if (manifest.summary.enDetailCount !== enCount)
      errors.push("summary.enDetailCount 不匹配")
    if (manifest.summary.assetCount !== manifest.assets.length)
      errors.push("summary.assetCount 不匹配")
    if (
      manifest.summary.totalBytes !==
      manifest.assets.reduce((total, asset) => total + asset.bytes, 0)
    )
      errors.push("summary.totalBytes 不匹配")
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { snapshotVersion: expectedVersion, errors }
}

async function saveFetchedAsset(options: {
  response: FetchedHttpAsset
  assetId: string
  kind: FetchAssetRecord["kind"]
  language?: SupportedLanguage
  characterId?: string
  url: string
  localPath: string
  stagingDirectory: string
  existingDirectory: string
  existing?: FetchAssetRecord
}): Promise<{ record: FetchAssetRecord; bytes: Uint8Array; drifted: boolean }> {
  validateAssetPath(options.localPath)
  let bytes: Uint8Array
  let record: FetchAssetRecord
  if (options.response.result === "not-modified") {
    if (options.existing === undefined) {
      if (options.response.bytes === null) {
        throw new Error(`${options.assetId} 返回 304，但没有已有资源记录`)
      }
      bytes = options.response.bytes
      record = {
        assetId: options.assetId,
        kind: options.kind,
        ...(options.language === undefined
          ? {}
          : { language: options.language }),
        ...(options.characterId === undefined
          ? {}
          : { characterId: options.characterId }),
        url: options.url,
        localPath: options.localPath,
        httpStatus: 304,
        result: "not-modified",
        etag: options.response.etag,
        lastModified: options.response.lastModified,
        contentType: options.response.contentType,
        cacheControl: options.response.cacheControl,
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
        contentFetchedAt:
          options.response.contentFetchedAt ?? options.response.checkedAt,
        lastCheckedAt: options.response.checkedAt,
      }
    } else if (options.response.bytes !== null) {
      bytes = options.response.bytes
      const hash = sha256(bytes)
      record = {
        ...options.existing,
        httpStatus: 304,
        result: "not-modified",
        etag: options.response.etag ?? options.existing.etag,
        lastModified:
          options.response.lastModified ?? options.existing.lastModified,
        contentType:
          options.response.contentType ?? options.existing.contentType,
        cacheControl:
          options.response.cacheControl ?? options.existing.cacheControl,
        bytes: bytes.byteLength,
        sha256: hash,
        contentFetchedAt:
          options.response.contentFetchedAt ??
          options.existing.contentFetchedAt,
        lastCheckedAt: options.response.checkedAt,
      }
    } else {
      const existingPath = cachedAssetFor(
        options.existingDirectory,
        options.existing,
        options.localPath,
      )?.path
      if (existingPath === undefined) {
        throw new Error(`${options.assetId} 返回 304，但没有已有资源文件`)
      }
      bytes = new Uint8Array(await readFile(existingPath))
      if (
        bytes.byteLength !== options.existing.bytes ||
        sha256(bytes) !== options.existing.sha256
      ) {
        throw new Error(`${options.assetId} 返回 304，但已有文件完整性校验失败`)
      }
      record = {
        ...options.existing,
        httpStatus: 304,
        result: "not-modified",
        lastCheckedAt: options.response.checkedAt,
      }
    }
  } else {
    if (options.response.bytes === null) {
      throw new Error(`${options.assetId} 成功响应缺少字节内容`)
    }
    bytes = options.response.bytes
    const hash = sha256(bytes)
    record = {
      assetId: options.assetId,
      kind: options.kind,
      ...(options.language === undefined ? {} : { language: options.language }),
      ...(options.characterId === undefined
        ? {}
        : { characterId: options.characterId }),
      url: options.url,
      localPath: options.localPath,
      httpStatus: options.response.status,
      result: "fetched",
      etag: options.response.etag,
      lastModified: options.response.lastModified,
      contentType: options.response.contentType,
      cacheControl: options.response.cacheControl,
      bytes: bytes.byteLength,
      sha256: hash,
      contentFetchedAt:
        options.response.contentFetchedAt ?? options.response.checkedAt,
      lastCheckedAt: options.response.checkedAt,
    }
  }

  const destination = join(options.stagingDirectory, options.localPath)
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, bytes)
  const drifted =
    options.existing !== undefined &&
    (options.existing.sha256 !== record.sha256 ||
      options.existing.bytes !== record.bytes ||
      options.existing.etag !== record.etag)
  return { record, bytes, drifted }
}

function cachedAssetFor(
  directory: string,
  record: FetchAssetRecord | undefined,
  expectedLocalPath: string,
): { record: FetchAssetRecord; path: string } | undefined {
  if (record === undefined) return undefined
  validateAssetPath(record.localPath)
  if (record.localPath !== expectedLocalPath) {
    throw new Error(
      `${record.assetId} 的已有 localPath 不匹配：${record.localPath}`,
    )
  }
  return { record, path: resolveSnapshotAssetPath(directory, record.localPath) }
}

async function fetchAssetWithValidatedCacheFallback(options: {
  httpClient: NanokaHttpClient
  url: URL
  cachedAsset?: { record: FetchAssetRecord; path: string }
}): Promise<FetchedHttpAsset> {
  const response = await options.httpClient.fetchAsset(
    options.url,
    validatorsFor(options.cachedAsset?.record),
  )
  if (response.result !== "not-modified") return response
  if (options.cachedAsset === undefined) return response

  let bytes: Uint8Array | undefined
  try {
    bytes = new Uint8Array(await readFile(options.cachedAsset.path))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  if (
    bytes === undefined ||
    bytes.byteLength !== options.cachedAsset.record.bytes ||
    sha256(bytes) !== options.cachedAsset.record.sha256
  ) {
    return options.httpClient.fetchAsset(options.url)
  }
  return {
    ...response,
    bytes,
    etag: options.cachedAsset.record.etag,
    lastModified: options.cachedAsset.record.lastModified,
    contentType: options.cachedAsset.record.contentType,
    cacheControl: options.cachedAsset.record.cacheControl,
    contentFetchedAt: options.cachedAsset.record.contentFetchedAt,
  }
}

function validatorsFor(
  existing: FetchAssetRecord | undefined,
): { etag: string | null; lastModified: string | null } | undefined {
  return existing === undefined
    ? undefined
    : { etag: existing.etag, lastModified: existing.lastModified }
}

async function recoverVersionArtifacts(
  rawDirectory: string,
  version: string,
): Promise<void> {
  const entries = await readdir(rawDirectory, { withFileTypes: true })
  const namespace = versionNamespace(version)
  const stagingPattern = new RegExp(
    `^${escapeRegularExpression(artifactNamespacePrefix)}${escapeRegularExpression(namespace)}-staging-.+$`,
    "u",
  )
  const backupPattern = new RegExp(
    `^${escapeRegularExpression(artifactNamespacePrefix)}${escapeRegularExpression(namespace)}-backup-.+$`,
    "u",
  )
  const stagingDirectories = entries
    .filter((entry) => entry.isDirectory() && stagingPattern.test(entry.name))
    .map((entry) => join(rawDirectory, entry.name))
  const backupDirectories = entries
    .filter((entry) => entry.isDirectory() && backupPattern.test(entry.name))
    .map((entry) => join(rawDirectory, entry.name))
  const target = join(rawDirectory, version)
  if (!(await pathExists(target)) && backupDirectories.length > 0) {
    const [restore, ...discard] = backupDirectories.toSorted()
    if (restore !== undefined) await rename(restore, target)
    await Promise.all(
      discard.map((directory) => rm(directory, { recursive: true })),
    )
  } else {
    await Promise.all(
      backupDirectories.map((directory) => rm(directory, { recursive: true })),
    )
  }
  await Promise.all(
    stagingDirectories.map((directory) => rm(directory, { recursive: true })),
  )
}

async function acquireVersionLock(
  rawDirectory: string,
  version: string,
): Promise<() => Promise<void>> {
  const release = await tryAcquireVersionLock(rawDirectory, version)
  if (release === undefined) {
    throw new Error(
      `版本锁已存在：${version}；请确认没有抓取进程正在运行，再手动删除残留锁`,
    )
  }
  return release
}

async function tryAcquireVersionLock(
  rawDirectory: string,
  version: string,
): Promise<(() => Promise<void>) | undefined> {
  const lockPath = join(rawDirectory, artifactName(version, "lock"))
  const ownerToken = randomUUID()
  const temporaryLockPath = `${lockPath}-${ownerToken}.pending`
  const lockData = JSON.stringify({
    schemaVersion: "nanoka-version-lock/v1",
    version,
    pid: process.pid,
    ownerToken,
    createdAt: new Date().toISOString(),
  })
  await writeFile(temporaryLockPath, `${lockData}\n`, { flag: "wx" })
  try {
    try {
      await link(temporaryLockPath, lockPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return undefined
      throw error
    }
    return async () => {
      const current = await readLockFile(lockPath)
      if (current === undefined) return
      if (parseLockData(current)?.ownerToken !== ownerToken) {
        throw new Error(`版本锁所有权已变化，拒绝删除：${version}`)
      }
      await rm(lockPath)
    }
  } finally {
    await rm(temporaryLockPath, { force: true })
  }
}

interface VersionLockData {
  version: string
  pid: number
  ownerToken: string
}

async function readLockFile(lockPath: string): Promise<Buffer | undefined> {
  try {
    return await readFile(lockPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}

function parseLockData(bytes: Buffer): VersionLockData | undefined {
  let value: unknown
  try {
    value = decodeUtf8Json(new Uint8Array(bytes), "Nanoka version lock")
  } catch {
    return undefined
  }
  if (
    !isPlainObject(value) ||
    value.schemaVersion !== "nanoka-version-lock/v1" ||
    typeof value.version !== "string" ||
    !Number.isSafeInteger(value.pid) ||
    Number(value.pid) <= 0 ||
    typeof value.ownerToken !== "string" ||
    value.ownerToken.length === 0 ||
    typeof value.createdAt !== "string"
  ) {
    return undefined
  }
  if (Number.isNaN(Date.parse(value.createdAt))) return undefined
  return {
    version: value.version,
    pid: Number(value.pid),
    ownerToken: value.ownerToken,
  }
}

async function exchangeSnapshot(
  target: string,
  staging: string,
  backup: string,
): Promise<{ cleanupWarning?: string }> {
  const hasTarget = await pathExists(target)
  if (!hasTarget) {
    await rename(staging, target)
    return {}
  }
  await rename(target, backup)
  try {
    await rename(staging, target)
  } catch (publicationError) {
    try {
      await rename(backup, target)
    } catch (rollbackError) {
      const recoveryError = new Error(
        `快照发布失败且回滚失败；可恢复 backup 保留在：${backup}`,
        { cause: publicationError },
      )
      Object.defineProperty(recoveryError, "errors", {
        value: [publicationError, rollbackError],
      })
      throw recoveryError
    }
    throw publicationError
  }
  try {
    await rm(backup, { recursive: true })
    return {}
  } catch (error) {
    return {
      cleanupWarning: `快照发布成功，但 backup 清理失败：${backup}（${error instanceof Error ? error.message : String(error)}）`,
    }
  }
}

async function findCachedUpstreamManifest(rawDirectory: string): Promise<
  | {
      record: FetchAssetRecord
      path: string
    }
  | undefined
> {
  if (!(await pathExists(rawDirectory))) return undefined
  const candidates: Array<{
    record: FetchAssetRecord
    path: string
  }> = []
  const versions = await readdir(rawDirectory, { withFileTypes: true })
  for (const entry of versions) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    try {
      validateVersion(entry.name)
      const directory = join(rawDirectory, entry.name)
      const manifest = await readExistingFetchManifest(directory)
      const record = manifest?.assets.find(
        (asset) => asset.assetId === "upstream-manifest",
      )
      const cachedAsset = cachedAssetFor(directory, record, "manifest.json")
      if (cachedAsset !== undefined) candidates.push(cachedAsset)
    } catch {
      continue
    }
  }
  return candidates.toSorted((left, right) =>
    right.record.lastCheckedAt.localeCompare(left.record.lastCheckedAt),
  )[0]
}

async function readExistingFetchManifest(
  directory: string,
): Promise<FetchManifest | undefined> {
  try {
    return parseFetchManifest(
      decodeUtf8Json(
        new Uint8Array(await readFile(join(directory, "fetch-manifest.json"))),
        "existing fetch-manifest.json",
      ),
    )
  } catch (error) {
    if (!(await pathExists(directory))) return undefined
    throw error
  }
}

function parseFetchManifest(value: unknown): FetchManifest {
  if (!isPlainObject(value)) throw invalidFetchManifest()
  const selectedByValues: VersionSelection[] = [
    "live",
    "latest",
    "version",
    "interactive",
  ]
  if (
    value.schemaVersion !== "nanoka-fetch-manifest/v1" ||
    typeof value.sourceId !== "string" ||
    value.game !== "zzz" ||
    typeof value.snapshotVersion !== "string" ||
    !selectedByValues.includes(value.selectedBy as VersionSelection) ||
    typeof value.observedLiveVersion !== "string" ||
    typeof value.observedLatestVersion !== "string" ||
    !isStringArray(value.observedAvailableVersions) ||
    typeof value.startedAt !== "string" ||
    typeof value.completedAt !== "string" ||
    typeof value.userAgent !== "string" ||
    !isSupportedLanguageArray(value.languages) ||
    !Array.isArray(value.assets) ||
    !value.assets.every(isFetchAssetRecord) ||
    !isFetchSummary(value.summary)
  ) {
    throw invalidFetchManifest()
  }
  validateVersion(value.snapshotVersion)
  validateVersion(value.observedLiveVersion)
  validateVersion(value.observedLatestVersion)
  value.observedAvailableVersions.forEach(validateVersion)
  return value as unknown as FetchManifest
}

function isFetchAssetRecord(value: unknown): value is FetchAssetRecord {
  if (!isPlainObject(value)) return false
  const kinds: FetchAssetRecord["kind"][] = [
    "upstream-manifest",
    "character-index",
    "character-detail",
  ]
  const results: FetchAssetRecord["result"][] = ["fetched", "not-modified"]
  return (
    typeof value.assetId === "string" &&
    kinds.includes(value.kind as FetchAssetRecord["kind"]) &&
    (value.language === undefined ||
      value.language === "zh" ||
      value.language === "en") &&
    (value.characterId === undefined ||
      typeof value.characterId === "string") &&
    typeof value.url === "string" &&
    typeof value.localPath === "string" &&
    isNonNegativeInteger(value.httpStatus) &&
    results.includes(value.result as FetchAssetRecord["result"]) &&
    isNullableString(value.etag) &&
    isNullableString(value.lastModified) &&
    isNullableString(value.contentType) &&
    isNullableString(value.cacheControl) &&
    isNonNegativeInteger(value.bytes) &&
    typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(value.sha256) &&
    typeof value.contentFetchedAt === "string" &&
    typeof value.lastCheckedAt === "string"
  )
}

function isFetchSummary(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    isNonNegativeInteger(value.characterCount) &&
    isNonNegativeInteger(value.zhDetailCount) &&
    isNonNegativeInteger(value.enDetailCount) &&
    isNonNegativeInteger(value.assetCount) &&
    isNonNegativeInteger(value.totalBytes)
  )
}

function isSupportedLanguageArray(
  value: unknown,
): value is SupportedLanguage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (language): language is SupportedLanguage =>
        typeof language === "string" &&
        supportedLanguages.includes(language as SupportedLanguage),
    )
  )
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  )
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function invalidFetchManifest(): Error {
  return new Error("fetch-manifest.json 结构无效")
}

function validateAssetRecord(
  policy: SourcePolicy,
  version: string,
  asset: FetchAssetRecord,
): void {
  let expectedUrl: string
  let expectedPath: string
  if (asset.kind === "upstream-manifest") {
    if (asset.assetId !== "upstream-manifest") {
      throw new Error(`manifest assetId 无效：${asset.assetId}`)
    }
    expectedUrl = buildManifestUrl(policy).href
    expectedPath = "manifest.json"
  } else if (asset.kind === "character-index") {
    if (asset.assetId !== "character-index") {
      throw new Error(`index assetId 无效：${asset.assetId}`)
    }
    expectedUrl = buildCharacterIndexUrl(policy, version).href
    expectedPath = "character.json"
  } else {
    if (asset.language === undefined || asset.characterId === undefined) {
      throw new Error(`${asset.assetId} 缺少 language 或 characterId`)
    }
    const expectedResource = createCharacterDetailResource(
      asset.characterId,
      asset.language,
    )
    if (asset.assetId !== expectedResource.assetId) {
      throw new Error(`详情 assetId 无效：${asset.assetId}`)
    }
    expectedUrl = buildCharacterDetailUrl(
      policy,
      version,
      asset.language,
      asset.characterId,
    ).href
    expectedPath = expectedResource.localPath
  }
  if (asset.url !== expectedUrl) throw new Error(`${asset.assetId} URL 不匹配`)
  if (asset.localPath !== expectedPath) {
    throw new Error(`${asset.assetId} localPath 不匹配`)
  }
}

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  )
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function validateAssetPath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`资源本地路径不安全：${path}`)
  }
}

function resolveSnapshotAssetPath(
  directory: string,
  localPath: string,
): string {
  validateAssetPath(localPath)
  const path = join(directory, localPath)
  const relativePath = relative(directory, path)
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.startsWith(sep)
  ) {
    throw new Error(`资源本地路径超出快照目录：${localPath}`)
  }
  return path
}

async function listRelativeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        return (await listRelativeFiles(path)).map((child) =>
          join(entry.name, child).split(sep).join("/"),
        )
      }
      return [relative(directory, path).split(sep).join("/")]
    }),
  )
  return files.flat().toSorted()
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

async function mapConcurrent<Input, Output>(
  inputs: Input[],
  concurrency: number,
  operation: (input: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = Array.from<Output>({ length: inputs.length })
  let nextIndex = 0
  let firstError: unknown
  const workers = Array.from(
    { length: Math.min(concurrency, inputs.length) },
    async () => {
      while (firstError === undefined && nextIndex < inputs.length) {
        const index = nextIndex
        nextIndex += 1
        try {
          results[index] = await operation(inputs[index]!)
        } catch (error) {
          firstError ??= error
        }
      }
    },
  )
  await Promise.all(workers)
  if (firstError !== undefined) throw firstError
  return results
}

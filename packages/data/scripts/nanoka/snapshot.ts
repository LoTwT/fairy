import { createHash, randomUUID } from "node:crypto"
import {
  copyFile,
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"
import {
  entityRegistry,
  getEntityAdapter,
  isEntityName,
  normalizeSelectedEntities,
  supportedEntityNames,
  type EntityName,
} from "./entities.ts"
import type { FetchedHttpAsset, NanokaHttpClient } from "./http.ts"
import {
  buildEntityDetailUrl,
  buildEntityIndexUrl,
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
  kind: "upstream-manifest" | "entity-index" | "entity-detail"
  entity?: EntityName
  language?: SupportedLanguage
  entityId?: string
  url: string
  localPath: string
  httpStatus: number
  result: "fetched" | "not-modified" | "carried-forward"
  etag: string | null
  lastModified: string | null
  contentType: string | null
  cacheControl: string | null
  bytes: number
  sha256: string
  contentFetchedAt: string
  lastCheckedAt: string
}

interface V1AssetRecord extends Omit<
  FetchAssetRecord,
  "kind" | "result" | "entity" | "entityId"
> {
  kind: "upstream-manifest" | "character-index" | "character-detail"
  result: "fetched" | "not-modified"
  characterId?: string
}

export interface EntitySummary {
  recordCount: number
  detailCountByLanguage: Record<SupportedLanguage, number>
  assetCount: number
  totalBytes: number
}

export interface FetchManifestV2 {
  schemaVersion: "nanoka-fetch-manifest/v2"
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
  entities: EntityName[]
  fetchScope: { mode: "all" | "selected"; requestedEntities: EntityName[] }
  assets: FetchAssetRecord[]
  summary: {
    entityTypeCount: number
    assetCount: number
    totalBytes: number
    entities: Record<EntityName, EntitySummary>
  }
  validation: {
    entities: Record<EntityName, "passed">
    crossEntityReferences: []
  }
}

interface FetchManifestV1 {
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
  assets: V1AssetRecord[]
  summary: {
    characterCount: number
    zhDetailCount: number
    enDetailCount: number
    assetCount: number
    totalBytes: number
  }
}

type StoredFetchManifest = FetchManifestV1 | FetchManifestV2
export type FetchManifest = FetchManifestV2
export interface SnapshotFetchResult {
  manifest: FetchManifestV2
  notModifiedAssetCount: number
  carriedForwardAssetCount: number
  reusedAssetCount: number
  driftedAssetIds: string[]
  cleanupWarnings: string[]
}
export interface VerificationResult {
  snapshotVersion: string
  errors: string[]
}
export type SnapshotFetchProgress =
  | {
      stage: "preparing"
      requestedEntities: EntityName[]
      carriedEntities: EntityName[]
    }
  | {
      stage: "entity-discovered"
      entity: EntityName
      displayName: string
      recordCount: number
      detailCount: number
    }
  | {
      stage: "entity-details"
      entity: EntityName
      displayName: string
      completed: number
      total: number
    }
  | {
      stage: "verifying"
      layer: "manifest" | "files" | "entities" | "cross-entity"
    }
  | { stage: "publishing" }

export const rawNanokaDirectory = join(packageDirectory, "raw", "nanoka")
const artifactNamespacePrefix = ".nanoka-artifact-"

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
  if (response.bytes === null) throw new Error("manifest 成功响应缺少字节内容")
  return {
    response,
    manifest: validateManifest(
      decodeUtf8Json(response.bytes, "Nanoka manifest"),
    ),
  }
}

export async function fetchNanokaSnapshot(options: {
  policy: SourcePolicy
  httpClient: NanokaHttpClient
  upstreamManifestResponse: FetchedHttpAsset
  upstreamManifest: NanokaManifest
  version: string
  selectedBy: VersionSelection
  entities?: readonly string[]
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
  const requestedEntities = normalizeSelectedEntities(options.entities)
  const allEntities = entityRegistry.map(({ name }) => name)
  const mode =
    requestedEntities.length === allEntities.length ? "all" : "selected"
  const carriedEntities = allEntities.filter(
    (entity) => !requestedEntities.includes(entity),
  )
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
  const releaseLock = await acquireVersionLock(rawDirectory, version)
  let committed = false
  let result: SnapshotFetchResult | undefined
  let operationError: unknown
  try {
    options.onProgress?.({
      stage: "preparing",
      requestedEntities,
      carriedEntities,
    })
    await recoverVersionArtifacts(rawDirectory, version)
    const existing = await readExistingFetchManifest(targetDirectory)
    if (mode === "selected") {
      if (existing === undefined)
        throw new Error("定向实体重跑需要完整旧快照；请执行全量抓取")
      const oldVerification = await verifySnapshotDirectory(
        policy,
        targetDirectory,
        version,
      )
      if (oldVerification.errors.length > 0)
        throw new Error(
          `旧快照校验失败，不能定向重跑：\n${oldVerification.errors.join("\n")}`,
        )
      const oldEntities = entitiesForManifest(existing)
      const unknownEntities = oldEntities.filter(
        (entity) => !supportedEntityNames.includes(entity as EntityName),
      )
      if (unknownEntities.length > 0)
        throw new Error(`旧快照包含未知实体：${unknownEntities.join(", ")}`)
      const missing = carriedEntities.filter(
        (entity) => !oldEntities.includes(entity),
      )
      if (missing.length > 0)
        throw new Error(
          `旧快照缺少未选实体 ${missing.join(", ")}；请执行全量抓取`,
        )
    }
    await mkdir(stagingDirectory, { recursive: true })
    try {
      const existingAssets = new Map(
        (existing === undefined ? [] : adaptAssets(existing)).map((asset) => [
          asset.assetId,
          asset,
        ]),
      )
      const assets: FetchAssetRecord[] = []
      const driftedAssetIds: string[] = []
      const manifestSaved = await saveFetchedAsset({
        response: upstreamManifestResponse,
        assetId: "upstream-manifest",
        kind: "upstream-manifest",
        url: buildManifestUrl(policy).href,
        localPath: "manifest.json",
        stagingDirectory,
        existingDirectory: targetDirectory,
        existing: existingAssets.get("upstream-manifest"),
      })
      assets.push(manifestSaved.record)
      if (manifestSaved.drifted)
        driftedAssetIds.push(manifestSaved.record.assetId)

      for (const entity of carriedEntities) {
        const records = [...existingAssets.values()].filter(
          (asset) => asset.entity === entity,
        )
        if (records.length === 0)
          throw new Error(`旧快照没有可沿用的 ${entity} 资产`)
        for (const asset of records)
          assets.push(
            await carryForwardAsset(targetDirectory, stagingDirectory, asset),
          )
      }

      for (const entity of requestedEntities) {
        const adapter = getEntityAdapter(entity)
        const indexAssetId = `entity-index:${entity}`
        const indexPath = `${entity}.json`
        const indexUrl = buildEntityIndexUrl(policy, version, entity)
        const indexResponse = await fetchAssetWithValidatedCacheFallback({
          httpClient,
          url: indexUrl,
          cachedAsset: cachedAssetFor(
            targetDirectory,
            existingAssets.get(indexAssetId),
            indexPath,
          ),
        })
        const indexSaved = await saveFetchedAsset({
          response: indexResponse,
          assetId: indexAssetId,
          kind: "entity-index",
          entity,
          url: indexUrl.href,
          localPath: indexPath,
          stagingDirectory,
          existingDirectory: targetDirectory,
          existing: existingAssets.get(indexAssetId),
        })
        assets.push(indexSaved.record)
        if (indexSaved.drifted) driftedAssetIds.push(indexAssetId)
        const ids = adapter.discoverIds(
          decodeUtf8Json(indexSaved.bytes, indexPath),
        )
        const resources = ids.flatMap((entityId) =>
          policy.languages.map((language) =>
            adapter.createDetailResource(entityId, language),
          ),
        )
        options.onProgress?.({
          stage: "entity-discovered",
          entity,
          displayName: adapter.displayName,
          recordCount: ids.length,
          detailCount: resources.length,
        })
        let completed = 0
        const details = await mapConcurrent(
          resources,
          policy.requestPolicy.maxConcurrency,
          async (resource) => {
            const existingAsset = existingAssets.get(resource.assetId)
            const url = buildEntityDetailUrl(
              policy,
              version,
              resource.language,
              entity,
              resource.entityId,
            )
            const response = await fetchAssetWithValidatedCacheFallback({
              httpClient,
              url,
              cachedAsset: cachedAssetFor(
                targetDirectory,
                existingAsset,
                resource.localPath,
              ),
            })
            const saved = await saveFetchedAsset({
              response,
              assetId: resource.assetId,
              kind: "entity-detail",
              entity,
              language: resource.language,
              entityId: resource.entityId,
              url: url.href,
              localPath: resource.localPath,
              stagingDirectory,
              existingDirectory: targetDirectory,
              existing: existingAsset,
            })
            adapter.validateDetail(
              decodeUtf8Json(saved.bytes, resource.localPath),
              resource.entityId,
              decodeUtf8Json(indexSaved.bytes, indexPath),
              resource.language,
            )
            completed += 1
            options.onProgress?.({
              stage: "entity-details",
              entity,
              displayName: adapter.displayName,
              completed,
              total: resources.length,
            })
            return saved
          },
        )
        for (const detail of details) {
          assets.push(detail.record)
          if (detail.drifted) driftedAssetIds.push(detail.record.assetId)
        }
      }

      assets.sort(compareAssets)
      const summary = await createSummary(
        stagingDirectory,
        assets,
        allEntities,
        policy.languages,
      )
      const validationEntities = Object.fromEntries(
        allEntities.map((entity) => [entity, "passed"]),
      ) as Record<EntityName, "passed">
      const fetchManifest: FetchManifestV2 = {
        schemaVersion: "nanoka-fetch-manifest/v2",
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
        entities: allEntities,
        fetchScope: { mode, requestedEntities },
        assets,
        summary,
        validation: { entities: validationEntities, crossEntityReferences: [] },
      }
      await writeFile(
        join(stagingDirectory, "fetch-manifest.json"),
        `${JSON.stringify(fetchManifest, undefined, 2)}\n`,
      )
      for (const layer of [
        "manifest",
        "files",
        "entities",
        "cross-entity",
      ] as const)
        options.onProgress?.({ stage: "verifying", layer })
      const verification = await verifySnapshotDirectory(
        policy,
        stagingDirectory,
        version,
      )
      if (verification.errors.length > 0)
        throw new Error(
          `staging 快照校验失败：\n${verification.errors.join("\n")}`,
        )
      options.onProgress?.({ stage: "publishing" })
      const exchange = await exchangeSnapshot(
        targetDirectory,
        stagingDirectory,
        backupDirectory,
      )
      committed = true
      const notModifiedAssetCount = assets.filter(
        (asset) => asset.result === "not-modified",
      ).length
      const carriedForwardAssetCount = assets.filter(
        (asset) => asset.result === "carried-forward",
      ).length
      result = {
        manifest: fetchManifest,
        notModifiedAssetCount,
        carriedForwardAssetCount,
        reusedAssetCount: notModifiedAssetCount,
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
    await releaseLock()
  } catch (error) {
    const message = `版本 ${version} ${committed ? "已发布，但" : "处理失败，且"}版本锁清理失败：${error instanceof Error ? error.message : String(error)}`
    if (committed && result !== undefined) result.cleanupWarnings.push(message)
    else
      operationError =
        operationError === undefined
          ? error
          : new AggregateError([operationError, error], message)
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
    if (!(await pathExists(join(rawDirectory, version))))
      throw new Error(`本地快照不存在：${version}`)
    const results = [
      await verifySnapshotDirectory(
        options.policy,
        join(rawDirectory, version),
        version,
      ),
    ]
    return [...results, ...(await artifactResults(rawDirectory, version))]
  }
  if (!(await pathExists(rawDirectory))) return []
  const entries = await readdir(rawDirectory, { withFileTypes: true })
  const results: VerificationResult[] = []
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
      const version = validateVersion(entry.name)
      results.push(
        await verifySnapshotDirectory(
          options.policy,
          join(rawDirectory, version),
          version,
        ),
      )
    } catch (error) {
      results.push({
        snapshotVersion: entry.name,
        errors: [error instanceof Error ? error.message : String(error)],
      })
    }
  }
  return results.toSorted((left, right) =>
    left.snapshotVersion.localeCompare(right.snapshotVersion),
  )
}

async function verifySnapshotDirectory(
  policy: SourcePolicy,
  directory: string,
  expectedVersion: string,
): Promise<VerificationResult> {
  const errors: string[] = []
  let stored: StoredFetchManifest
  try {
    stored = parseFetchManifest(
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
  if (stored.sourceId !== policy.sourceId)
    errors.push(`sourceId 不匹配：${stored.sourceId}`)
  if (stored.snapshotVersion !== expectedVersion)
    errors.push(`snapshotVersion 不匹配：${stored.snapshotVersion}`)
  if (!sameStringArray(stored.languages, policy.languages))
    errors.push("languages 与来源配置不匹配")
  const assets = adaptAssets(stored)
  const entities = entitiesForManifest(stored)
  if (stored.schemaVersion === "nanoka-fetch-manifest/v2")
    validateV2ManifestShape(stored, errors)
  const expectedPaths = new Set(["fetch-manifest.json"])
  const assetIds = new Set<string>()
  const paths = new Set<string>()
  for (const asset of assets) {
    if (assetIds.has(asset.assetId))
      errors.push(`重复 assetId：${asset.assetId}`)
    assetIds.add(asset.assetId)
    if (paths.has(asset.localPath))
      errors.push(`重复 localPath：${asset.localPath}`)
    paths.add(asset.localPath)
    try {
      validateAssetRecord(policy, expectedVersion, asset)
      expectedPaths.add(asset.localPath)
      const assetPath = resolveSnapshotAssetPath(directory, asset.localPath)
      await validateRegularSnapshotFile(directory, assetPath, asset.localPath)
      const bytes = new Uint8Array(await readFile(assetPath))
      if (bytes.byteLength !== asset.bytes)
        errors.push(`${asset.localPath} 字节数不匹配`)
      if (sha256(bytes) !== asset.sha256)
        errors.push(`${asset.localPath} SHA-256 不匹配`)
      decodeUtf8Json(bytes, asset.localPath)
    } catch (error) {
      errors.push(
        `${asset.localPath} 无法验证：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  try {
    const saved = validateManifest(
      decodeUtf8Json(
        new Uint8Array(await readFile(join(directory, "manifest.json"))),
        "manifest.json",
      ),
    )
    if (
      saved.zzz.live !== stored.observedLiveVersion ||
      saved.zzz.latest !== stored.observedLatestVersion ||
      !sameStringArray(saved.zzz.available, stored.observedAvailableVersions)
    )
      errors.push("保存的 manifest 内容与 observed 字段不匹配")
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  try {
    const actual = new Set(await listRelativeFiles(directory))
    for (const path of expectedPaths)
      if (!actual.has(path)) errors.push(`缺少文件：${path}`)
    for (const path of actual)
      if (!expectedPaths.has(path)) errors.push(`存在未登记文件：${path}`)
  } catch (error) {
    errors.push(String(error))
  }
  const recomputed: Partial<Record<EntityName, EntitySummary>> = {}
  for (const entityName of entities) {
    if (!isEntityName(entityName)) {
      errors.push(`未知实体：${entityName}`)
      continue
    }
    const adapter = getEntityAdapter(entityName)
    try {
      const indexPath = `${entityName}.json`
      const indexValue = decodeUtf8Json(
        new Uint8Array(await readFile(join(directory, indexPath))),
        indexPath,
      )
      const ids = adapter.discoverIds(indexValue)
      const expectedDetails = new Set(
        ids.flatMap((id) =>
          policy.languages.map(
            (language) => adapter.createDetailResource(id, language).localPath,
          ),
        ),
      )
      const registeredDetails = assets.filter(
        (asset) =>
          asset.kind === "entity-detail" && asset.entity === entityName,
      )
      for (const path of expectedDetails)
        if (!registeredDetails.some((asset) => asset.localPath === path))
          errors.push(`缺少详情登记：${path}`)
      for (const asset of registeredDetails) {
        if (!expectedDetails.has(asset.localPath))
          errors.push(`多余详情登记：${asset.localPath}`)
        if (asset.entityId === undefined || asset.language === undefined) {
          errors.push(`${asset.assetId} 缺少 entityId 或 language`)
          continue
        }
        adapter.validateDetail(
          decodeUtf8Json(
            new Uint8Array(
              await readFile(
                resolveSnapshotAssetPath(directory, asset.localPath),
              ),
            ),
            asset.localPath,
          ),
          asset.entityId,
          indexValue,
          asset.language,
        )
      }
      const entityAssets = assets.filter((asset) => asset.entity === entityName)
      recomputed[entityName] = {
        recordCount: ids.length,
        detailCountByLanguage: {
          zh: registeredDetails.filter((asset) => asset.language === "zh")
            .length,
          en: registeredDetails.filter((asset) => asset.language === "en")
            .length,
        },
        assetCount: entityAssets.length,
        totalBytes: entityAssets.reduce((sum, asset) => sum + asset.bytes, 0),
      }
    } catch (error) {
      errors.push(
        `${entityName} 实体验证失败：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  if (stored.schemaVersion === "nanoka-fetch-manifest/v1") {
    const character = recomputed.character
    if (
      character !== undefined &&
      (stored.summary.characterCount !== character.recordCount ||
        stored.summary.zhDetailCount !== character.detailCountByLanguage.zh ||
        stored.summary.enDetailCount !== character.detailCountByLanguage.en)
    )
      errors.push("v1 summary 实体计数不匹配")
    if (
      stored.summary.assetCount !== assets.length ||
      stored.summary.totalBytes !==
        assets.reduce((sum, asset) => sum + asset.bytes, 0)
    )
      errors.push("v1 summary 全局计数不匹配")
  } else {
    if (JSON.stringify(stored.summary.entities) !== JSON.stringify(recomputed))
      errors.push("summary.entities 不匹配")
    if (
      stored.summary.entityTypeCount !== entities.length ||
      stored.summary.assetCount !== assets.length ||
      stored.summary.totalBytes !==
        assets.reduce((sum, asset) => sum + asset.bytes, 0)
    )
      errors.push("summary 全局计数不匹配")
  }
  return { snapshotVersion: expectedVersion, errors }
}

function validateV2ManifestShape(
  manifest: FetchManifestV2,
  errors: string[],
): void {
  const enabledEntities = entityRegistry.map(({ name }) => name)
  if (!sameStringArray(manifest.entities, enabledEntities))
    errors.push("entities 必须恰好包含全部启用实体并按注册表顺序排列")
  const assetEntities = [
    ...new Set(
      manifest.assets.flatMap((asset) =>
        asset.entity === undefined ? [] : [asset.entity],
      ),
    ),
  ].toSorted(
    (left, right) =>
      supportedEntityNames.indexOf(left) - supportedEntityNames.indexOf(right),
  )
  if (!sameStringArray(assetEntities, manifest.entities))
    errors.push("assets 的实体集合与 entities 不匹配")
  const requested = manifest.fetchScope.requestedEntities
  if (
    requested.length === 0 ||
    !requested.every((entity) => manifest.entities.includes(entity))
  )
    errors.push("fetchScope.requestedEntities 无效")
  if (
    (manifest.fetchScope.mode === "all") !==
    sameStringArray(requested, manifest.entities)
  )
    errors.push("fetchScope.mode 与 requestedEntities 不匹配")
  if (
    !sameStringArray(
      Object.keys(manifest.validation.entities),
      manifest.entities,
    ) ||
    Object.values(manifest.validation.entities).some(
      (status) => status !== "passed",
    )
  )
    errors.push("validation.entities 无效")
  if (manifest.validation.crossEntityReferences.length !== 0)
    errors.push("存在未知跨实体 validator 记录")
  for (const entity of manifest.entities) {
    const indexCount = manifest.assets.filter(
      (asset) => asset.kind === "entity-index" && asset.entity === entity,
    ).length
    if (indexCount !== 1)
      errors.push(`${entity} entity-index 资源数量必须为 1：${indexCount}`)
  }
  for (const asset of manifest.assets) {
    if (
      asset.result === "carried-forward" &&
      (manifest.fetchScope.mode !== "selected" ||
        asset.entity === undefined ||
        requested.includes(asset.entity))
    )
      errors.push(`${asset.assetId} carried-forward 语义无效`)
    if (
      manifest.fetchScope.mode === "selected" &&
      asset.entity !== undefined &&
      !requested.includes(asset.entity) &&
      asset.result !== "carried-forward"
    )
      errors.push(`${asset.assetId} 未选实体资源必须为 carried-forward`)
  }
}

function parseFetchManifest(value: unknown): StoredFetchManifest {
  if (!isPlainObject(value)) throw invalidFetchManifest()
  if (
    value.schemaVersion !== "nanoka-fetch-manifest/v1" &&
    value.schemaVersion !== "nanoka-fetch-manifest/v2"
  )
    throw new Error(
      `不支持的 fetch manifest schema：${String(value.schemaVersion)}`,
    )
  if (
    typeof value.sourceId !== "string" ||
    value.game !== "zzz" ||
    typeof value.snapshotVersion !== "string" ||
    !["live", "latest", "version", "interactive"].includes(
      String(value.selectedBy),
    ) ||
    typeof value.observedLiveVersion !== "string" ||
    typeof value.observedLatestVersion !== "string" ||
    !isStringArray(value.observedAvailableVersions) ||
    typeof value.startedAt !== "string" ||
    typeof value.completedAt !== "string" ||
    typeof value.userAgent !== "string" ||
    !isSupportedLanguageArray(value.languages) ||
    !Array.isArray(value.assets)
  )
    throw invalidFetchManifest()
  validateVersion(value.snapshotVersion)
  validateVersion(value.observedLiveVersion)
  validateVersion(value.observedLatestVersion)
  value.observedAvailableVersions.forEach(validateVersion)
  if (value.schemaVersion === "nanoka-fetch-manifest/v1") {
    if (
      !value.assets.every(isV1Asset) ||
      !isPlainObject(value.summary) ||
      ![
        value.summary.characterCount,
        value.summary.zhDetailCount,
        value.summary.enDetailCount,
        value.summary.assetCount,
        value.summary.totalBytes,
      ].every(isNonNegativeInteger)
    )
      throw invalidFetchManifest()
  } else {
    if (
      !value.assets.every(isV2Asset) ||
      !Array.isArray(value.entities) ||
      !value.entities.every(isEntityName) ||
      !isPlainObject(value.fetchScope) ||
      (value.fetchScope.mode !== "all" &&
        value.fetchScope.mode !== "selected") ||
      !Array.isArray(value.fetchScope.requestedEntities) ||
      !value.fetchScope.requestedEntities.every(isEntityName) ||
      !isPlainObject(value.summary) ||
      !isPlainObject(value.summary.entities) ||
      !isPlainObject(value.validation) ||
      !isPlainObject(value.validation.entities) ||
      !Array.isArray(value.validation.crossEntityReferences)
    )
      throw invalidFetchManifest()
  }
  return value as unknown as StoredFetchManifest
}

function isBaseAsset(value: Record<string, unknown>): boolean {
  const validResultStatus =
    (value.result === "fetched" &&
      isNonNegativeInteger(value.httpStatus) &&
      value.httpStatus >= 200 &&
      value.httpStatus < 300) ||
    (value.result === "not-modified" && value.httpStatus === 304) ||
    (value.result === "carried-forward" &&
      isNonNegativeInteger(value.httpStatus) &&
      (value.httpStatus === 304 ||
        (value.httpStatus >= 200 && value.httpStatus < 300)))
  return (
    typeof value.assetId === "string" &&
    typeof value.url === "string" &&
    typeof value.localPath === "string" &&
    validResultStatus &&
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
function isV1Asset(value: unknown): value is V1AssetRecord {
  if (
    !isPlainObject(value) ||
    !isBaseAsset(value) ||
    (value.result !== "fetched" && value.result !== "not-modified")
  )
    return false
  if (value.kind === "upstream-manifest")
    return (
      value.assetId === "upstream-manifest" &&
      value.language === undefined &&
      value.characterId === undefined
    )
  if (value.kind === "character-index")
    return (
      value.assetId === "character-index" &&
      value.language === undefined &&
      value.characterId === undefined
    )
  if (value.kind !== "character-detail") return false
  if (
    !supportedLanguages.includes(value.language as SupportedLanguage) ||
    typeof value.characterId !== "string" ||
    !/^(0|[1-9]\d*)$/u.test(value.characterId)
  )
    return false
  return (
    value.assetId ===
    `character-detail:${String(value.language)}:${value.characterId}`
  )
}
function isV2Asset(value: unknown): value is FetchAssetRecord {
  return (
    isPlainObject(value) &&
    isBaseAsset(value) &&
    ["upstream-manifest", "entity-index", "entity-detail"].includes(
      String(value.kind),
    ) &&
    ["fetched", "not-modified", "carried-forward"].includes(
      String(value.result),
    ) &&
    (value.entity === undefined || isEntityName(value.entity)) &&
    (value.language === undefined ||
      supportedLanguages.includes(value.language as SupportedLanguage)) &&
    (value.entityId === undefined || typeof value.entityId === "string")
  )
}

function adaptAssets(manifest: StoredFetchManifest): FetchAssetRecord[] {
  if (manifest.schemaVersion === "nanoka-fetch-manifest/v2")
    return manifest.assets
  return manifest.assets.map((asset) =>
    asset.kind === "upstream-manifest"
      ? { ...asset, kind: "upstream-manifest" }
      : asset.kind === "character-index"
        ? {
            ...asset,
            assetId: "entity-index:character",
            kind: "entity-index",
            entity: "character",
          }
        : {
            ...asset,
            assetId: `entity-detail:character:${asset.language}:${asset.characterId}`,
            kind: "entity-detail",
            entity: "character",
            entityId: asset.characterId,
          },
  )
}
function entitiesForManifest(manifest: StoredFetchManifest): string[] {
  return manifest.schemaVersion === "nanoka-fetch-manifest/v1"
    ? ["character"]
    : manifest.entities
}

async function createSummary(
  directory: string,
  assets: FetchAssetRecord[],
  entities: EntityName[],
  languages: SupportedLanguage[],
): Promise<FetchManifestV2["summary"]> {
  const summaries = {} as Record<EntityName, EntitySummary>
  for (const entity of entities) {
    const adapter = getEntityAdapter(entity)
    const ids = adapter.discoverIds(
      decodeUtf8Json(
        new Uint8Array(await readFile(join(directory, `${entity}.json`))),
        `${entity}.json`,
      ),
    )
    const entityAssets = assets.filter((asset) => asset.entity === entity)
    summaries[entity] = {
      recordCount: ids.length,
      detailCountByLanguage: Object.fromEntries(
        languages.map((language) => [
          language,
          entityAssets.filter(
            (asset) =>
              asset.kind === "entity-detail" && asset.language === language,
          ).length,
        ]),
      ) as Record<SupportedLanguage, number>,
      assetCount: entityAssets.length,
      totalBytes: entityAssets.reduce((sum, asset) => sum + asset.bytes, 0),
    }
  }
  return {
    entityTypeCount: entities.length,
    assetCount: assets.length,
    totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    entities: summaries,
  }
}

async function carryForwardAsset(
  existingDirectory: string,
  stagingDirectory: string,
  asset: FetchAssetRecord,
): Promise<FetchAssetRecord> {
  validateAssetPath(asset.localPath)
  const source = resolveSnapshotAssetPath(existingDirectory, asset.localPath)
  await validateRegularSnapshotFile(existingDirectory, source, asset.localPath)
  const bytes = new Uint8Array(await readFile(source))
  if (bytes.byteLength !== asset.bytes || sha256(bytes) !== asset.sha256)
    throw new Error(`${asset.assetId} 沿用前完整性校验失败`)
  const destination = resolveSnapshotAssetPath(
    stagingDirectory,
    asset.localPath,
  )
  await mkdir(dirname(destination), { recursive: true })
  await copyFile(source, destination)
  return { ...asset, result: "carried-forward" }
}

async function saveFetchedAsset(options: {
  response: FetchedHttpAsset
  assetId: string
  kind: FetchAssetRecord["kind"]
  entity?: EntityName
  language?: SupportedLanguage
  entityId?: string
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
    if (options.existing === undefined || options.response.bytes === null)
      throw new Error(`${options.assetId} 返回 304，但没有可验证的已有资源`)
    bytes = options.response.bytes
    record = {
      ...options.existing,
      assetId: options.assetId,
      kind: options.kind,
      ...(options.entity === undefined ? {} : { entity: options.entity }),
      ...(options.language === undefined ? {} : { language: options.language }),
      ...(options.entityId === undefined ? {} : { entityId: options.entityId }),
      url: options.url,
      localPath: options.localPath,
      httpStatus: 304,
      result: "not-modified",
      etag: options.response.etag ?? options.existing.etag,
      lastModified:
        options.response.lastModified ?? options.existing.lastModified,
      contentType: options.response.contentType ?? options.existing.contentType,
      cacheControl:
        options.response.cacheControl ?? options.existing.cacheControl,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      contentFetchedAt:
        options.response.contentFetchedAt ?? options.existing.contentFetchedAt,
      lastCheckedAt: options.response.checkedAt,
    }
  } else {
    if (options.response.bytes === null)
      throw new Error(`${options.assetId} 成功响应缺少字节内容`)
    bytes = options.response.bytes
    record = {
      assetId: options.assetId,
      kind: options.kind,
      ...(options.entity === undefined ? {} : { entity: options.entity }),
      ...(options.language === undefined ? {} : { language: options.language }),
      ...(options.entityId === undefined ? {} : { entityId: options.entityId }),
      url: options.url,
      localPath: options.localPath,
      httpStatus: options.response.status,
      result: "fetched",
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
  }
  const destination = resolveSnapshotAssetPath(
    options.stagingDirectory,
    options.localPath,
  )
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
  if (record.localPath !== expectedLocalPath)
    throw new Error(
      `${record.assetId} 的已有 localPath 不匹配：${record.localPath}`,
    )
  return { record, path: resolveSnapshotAssetPath(directory, record.localPath) }
}
async function fetchAssetWithValidatedCacheFallback(options: {
  httpClient: NanokaHttpClient
  url: URL
  cachedAsset?: { record: FetchAssetRecord; path: string }
}): Promise<FetchedHttpAsset> {
  const response = await options.httpClient.fetchAsset(
    options.url,
    options.cachedAsset === undefined
      ? undefined
      : {
          etag: options.cachedAsset.record.etag,
          lastModified: options.cachedAsset.record.lastModified,
        },
  )
  if (response.result !== "not-modified" || options.cachedAsset === undefined)
    return response
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
  )
    return options.httpClient.fetchAsset(options.url)
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

async function readExistingFetchManifest(
  directory: string,
): Promise<StoredFetchManifest | undefined> {
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
async function findCachedUpstreamManifest(
  rawDirectory: string,
): Promise<{ record: FetchAssetRecord; path: string } | undefined> {
  if (!(await pathExists(rawDirectory))) return undefined
  const candidates: Array<{ record: FetchAssetRecord; path: string }> = []
  for (const entry of await readdir(rawDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    try {
      validateVersion(entry.name)
      const directory = join(rawDirectory, entry.name)
      const manifest = await readExistingFetchManifest(directory)
      const record =
        manifest === undefined
          ? undefined
          : adaptAssets(manifest).find(
              (asset) => asset.assetId === "upstream-manifest",
            )
      const cached = cachedAssetFor(directory, record, "manifest.json")
      if (cached !== undefined) candidates.push(cached)
    } catch {
      continue
    }
  }
  return candidates.toSorted((left, right) =>
    right.record.lastCheckedAt.localeCompare(left.record.lastCheckedAt),
  )[0]
}

export async function recoverNanokaRawDirectory(
  rawDirectory = rawNanokaDirectory,
): Promise<void> {
  if (!(await pathExists(rawDirectory))) return
  const versions = new Set<string>()
  for (const entry of await readdir(rawDirectory, { withFileTypes: true })) {
    const match =
      /^\.nanoka-artifact-([A-Za-z0-9_-]+)-(?:staging|backup)-.+$/u.exec(
        entry.name,
      )
    const version =
      match?.[1] === undefined ? undefined : versionFromNamespace(match[1])
    if (entry.isDirectory() && version !== undefined) versions.add(version)
  }
  for (const version of versions) {
    const release = await tryAcquireVersionLock(rawDirectory, version)
    if (release === undefined) continue
    try {
      await recoverVersionArtifacts(rawDirectory, version)
    } finally {
      await release()
    }
  }
}
async function recoverVersionArtifacts(
  rawDirectory: string,
  version: string,
): Promise<void> {
  const namespace = versionNamespace(version)
  const entries = await readdir(rawDirectory, { withFileTypes: true })
  const staging = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(
          `${artifactNamespacePrefix}${namespace}-staging-`,
        ),
    )
    .map((entry) => join(rawDirectory, entry.name))
  const backups = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(`${artifactNamespacePrefix}${namespace}-backup-`),
    )
    .map((entry) => join(rawDirectory, entry.name))
    .toSorted()
  const target = join(rawDirectory, version)
  if (!(await pathExists(target)) && backups[0] !== undefined)
    await rename(backups.shift()!, target)
  await Promise.all(
    [...staging, ...backups].map((path) => rm(path, { recursive: true })),
  )
}
async function acquireVersionLock(
  rawDirectory: string,
  version: string,
): Promise<() => Promise<void>> {
  const release = await tryAcquireVersionLock(rawDirectory, version)
  if (release === undefined)
    throw new Error(
      `版本锁已存在：${version}；请确认没有抓取进程正在运行，再手动删除残留锁`,
    )
  return release
}
async function tryAcquireVersionLock(
  rawDirectory: string,
  version: string,
): Promise<(() => Promise<void>) | undefined> {
  const lockPath = join(rawDirectory, artifactName(version, "lock"))
  const ownerToken = randomUUID()
  const pending = `${lockPath}-${ownerToken}.pending`
  await writeFile(
    pending,
    `${JSON.stringify({ schemaVersion: "nanoka-version-lock/v1", version, pid: process.pid, ownerToken, createdAt: new Date().toISOString() })}\n`,
    { flag: "wx" },
  )
  try {
    try {
      await link(pending, lockPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return undefined
      throw error
    }
    return async () => {
      const value = decodeUtf8Json(
        new Uint8Array(await readFile(lockPath)),
        "Nanoka version lock",
      )
      if (!isPlainObject(value) || value.ownerToken !== ownerToken)
        throw new Error(`版本锁所有权已变化，拒绝删除：${version}`)
      await rm(lockPath)
    }
  } finally {
    await rm(pending, { force: true })
  }
}
async function exchangeSnapshot(
  target: string,
  staging: string,
  backup: string,
): Promise<{ cleanupWarning?: string }> {
  if (!(await pathExists(target))) {
    await rename(staging, target)
    return {}
  }
  await rename(target, backup)
  try {
    await rename(staging, target)
  } catch (error) {
    await rename(backup, target)
    throw error
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
async function artifactResults(
  rawDirectory: string,
  version: string,
): Promise<VerificationResult[]> {
  if (!(await pathExists(rawDirectory))) return []
  return (await readdir(rawDirectory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.name.startsWith(artifactNamespacePrefix) &&
        artifactVersionLabel(entry.name) === version,
    )
    .map((entry) => ({
      snapshotVersion: version,
      errors: [`存在未恢复的 Nanoka artifact：${entry.name}`],
    }))
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
function artifactVersionLabel(name: string): string {
  const match =
    /^\.nanoka-artifact-([A-Za-z0-9_-]+)-(?:lock|staging|backup)(?:-.+)?$/u.exec(
      name,
    )
  return match?.[1] === undefined
    ? name
    : (versionFromNamespace(match[1]) ?? name)
}
function versionNamespace(version: string): string {
  return Buffer.from(version, "utf8").toString("base64url")
}
function versionFromNamespace(namespace: string): string | undefined {
  try {
    const version = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.from(namespace, "base64url"),
    )
    return versionNamespace(version) === namespace
      ? validateVersion(version)
      : undefined
  } catch {
    return undefined
  }
}
function validateAssetRecord(
  policy: SourcePolicy,
  version: string,
  asset: FetchAssetRecord,
): void {
  let expectedUrl: string
  let expectedPath: string
  let expectedId: string
  if (asset.kind === "upstream-manifest") {
    if (
      asset.entity !== undefined ||
      asset.language !== undefined ||
      asset.entityId !== undefined
    )
      throw new Error("manifest 不得包含实体字段")
    expectedId = "upstream-manifest"
    expectedUrl = buildManifestUrl(policy).href
    expectedPath = "manifest.json"
  } else {
    if (asset.entity === undefined)
      throw new Error(`${asset.assetId} 缺少 entity`)
    if (asset.kind === "entity-index") {
      if (asset.language !== undefined || asset.entityId !== undefined)
        throw new Error(`${asset.assetId} index 字段组合无效`)
      expectedId = `entity-index:${asset.entity}`
      expectedUrl = buildEntityIndexUrl(policy, version, asset.entity).href
      expectedPath = `${asset.entity}.json`
    } else {
      if (asset.language === undefined || asset.entityId === undefined)
        throw new Error(`${asset.assetId} 缺少 language 或 entityId`)
      const resource = getEntityAdapter(asset.entity).createDetailResource(
        asset.entityId,
        asset.language,
      )
      expectedId = resource.assetId
      expectedUrl = buildEntityDetailUrl(
        policy,
        version,
        asset.language,
        asset.entity,
        asset.entityId,
      ).href
      expectedPath = resource.localPath
    }
  }
  if (asset.assetId !== expectedId)
    throw new Error(`${asset.assetId} assetId 无效`)
  if (asset.url !== expectedUrl) throw new Error(`${asset.assetId} URL 不匹配`)
  if (asset.localPath !== expectedPath)
    throw new Error(`${asset.assetId} localPath 不匹配`)
}
function compareAssets(
  left: FetchAssetRecord,
  right: FetchAssetRecord,
): number {
  if (left.kind === "upstream-manifest") return -1
  if (right.kind === "upstream-manifest") return 1
  const leftEntity = supportedEntityNames.indexOf(left.entity!)
  const rightEntity = supportedEntityNames.indexOf(right.entity!)
  return (
    leftEntity - rightEntity ||
    (left.kind === "entity-index"
      ? -1
      : right.kind === "entity-index"
        ? 1
        : left.assetId.localeCompare(right.assetId))
  )
}
function validateAssetPath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  )
    throw new Error(`资源本地路径不安全：${path}`)
}
function resolveSnapshotAssetPath(
  directory: string,
  localPath: string,
): string {
  validateAssetPath(localPath)
  const path = join(directory, localPath)
  const rel = relative(directory, path)
  if (
    rel === "" ||
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    rel.startsWith(sep)
  )
    throw new Error(`资源本地路径超出快照目录：${localPath}`)
  return path
}
async function validateRegularSnapshotFile(
  directory: string,
  path: string,
  localPath: string,
): Promise<void> {
  const metadata = await lstat(path)
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new Error(`资源不是普通文件：${localPath}`)
  const [directoryPath, filePath] = await Promise.all([
    realpath(directory),
    realpath(path),
  ])
  const relativePath = relative(directoryPath, filePath)
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.startsWith(sep)
  )
    throw new Error(`资源真实路径超出快照目录：${localPath}`)
}

async function listRelativeFiles(directory: string): Promise<string[]> {
  const groups = await Promise.all(
    (await readdir(directory, { withFileTypes: true })).map(
      async (entry): Promise<string[]> =>
        entry.isDirectory()
          ? (await listRelativeFiles(join(directory, entry.name))).map(
              (child) => `${entry.name}/${child}`,
            )
          : [entry.name],
    ),
  )
  return groups.flat().toSorted()
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
async function mapConcurrent<I, O>(
  inputs: I[],
  concurrency: number,
  operation: (input: I) => Promise<O>,
): Promise<O[]> {
  const results = Array.from<O>({ length: inputs.length })
  let next = 0
  let firstError: unknown
  const workers = Array.from(
    { length: Math.min(concurrency, inputs.length) },
    async () => {
      while (firstError === undefined && next < inputs.length) {
        const index = next++
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
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}
function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  )
}
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  )
}
function isSupportedLanguageArray(
  value: unknown,
): value is SupportedLanguage[] {
  return (
    Array.isArray(value) &&
    value.every((entry) =>
      supportedLanguages.includes(entry as SupportedLanguage),
    )
  )
}
function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}
function invalidFetchManifest(): Error {
  return new Error("fetch-manifest.json 结构无效")
}

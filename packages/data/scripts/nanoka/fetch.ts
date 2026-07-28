import { randomUUID } from "node:crypto"
import { mkdir, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { NanokaHttpClient } from "./http.ts"
import {
  buildEntityDetailUrl,
  buildEntityIndexUrl,
  buildManifestUrl,
  decodeUtf8Json,
  isPlainObject,
  isValidEntityId,
  packageDirectory,
  supportedEntityNames,
  type EntityName,
  type NanokaManifest,
  type SourcePolicy,
  validateManifest,
  validateVersion,
} from "./policy.ts"

export const rawNanokaCacheDirectory = join(packageDirectory, "raw", "nanoka")

export type FetchProgress =
  | {
      stage: "preparing"
      requestedEntities: EntityName[]
    }
  | {
      stage: "entity-discovered"
      entity: EntityName
      recordCount: number
      detailCount: number
    }
  | {
      stage: "entity-details"
      entity: EntityName
      completed: number
      total: number
    }

export interface NanokaFetchResult {
  entities: EntityName[]
  recordCounts: Record<EntityName, number>
  fetchedAssetCount: number
  fetchedBytes: number
  cacheDirectory: string
}

export async function fetchUpstreamManifest(
  policy: SourcePolicy,
  httpClient: NanokaHttpClient,
): Promise<{
  bytes: Uint8Array
  manifest: NanokaManifest
}> {
  const bytes = await httpClient.fetchAsset(buildManifestUrl(policy))
  return {
    bytes,
    manifest: validateManifest(decodeUtf8Json(bytes, "Nanoka manifest")),
  }
}

export async function fetchNanokaData(options: {
  policy: SourcePolicy
  httpClient: NanokaHttpClient
  upstreamManifestBytes: Uint8Array
  upstreamManifest: NanokaManifest
  version: string
  entities?: readonly string[]
  cacheRoot?: string
  onProgress?: (progress: FetchProgress) => void
}): Promise<NanokaFetchResult> {
  const {
    policy,
    httpClient,
    upstreamManifest,
    upstreamManifestBytes,
    version,
  } = options
  validateVersion(version)
  if (!upstreamManifest.zzz.available.includes(version))
    throw new Error(`版本不在 manifest available 中：${version}`)

  const entities = normalizeSelectedEntities(options.entities)
  const cacheDirectory = join(
    options.cacheRoot ?? rawNanokaCacheDirectory,
    version,
  )
  const budget = createFetchBudget(policy)
  const recordCounts = Object.fromEntries(
    supportedEntityNames.map((entity) => [entity, 0]),
  ) as Record<EntityName, number>

  options.onProgress?.({ stage: "preparing", requestedEntities: entities })

  budget.reserveAsset(upstreamManifestBytes.byteLength)
  await writeCacheFileAtomically(
    join(cacheDirectory, "manifest.json"),
    upstreamManifestBytes,
  )

  for (const entity of entities) {
    const indexBytes = await httpClient.fetchAsset(
      buildEntityIndexUrl(policy, version, entity),
    )
    budget.reserveAsset(indexBytes.byteLength)
    const indexValue = decodeUtf8Json(indexBytes, `${entity} 索引`)
    const entityIds = discoverEntityIds(
      indexValue,
      entity,
      policy.fetchLimits.maximumRecordsPerEntity,
    )
    budget.reserveAdditionalAssets(entityIds.length * policy.languages.length)
    recordCounts[entity] = entityIds.length

    const detailTasks = entityIds.flatMap((entityId) =>
      policy.languages.map((language) => ({ entityId, language })),
    )
    options.onProgress?.({
      stage: "entity-discovered",
      entity,
      recordCount: entityIds.length,
      detailCount: detailTasks.length,
    })

    let completed = 0
    await runWithConcurrency(
      detailTasks,
      policy.requestPolicy.maxConcurrency,
      async ({ entityId, language }) => {
        const bytes = await httpClient.fetchAsset(
          buildEntityDetailUrl(policy, version, language, entity, entityId),
        )
        budget.reserveAsset(bytes.byteLength)
        const detailValue = decodeUtf8Json(
          bytes,
          `${entity} ${language}/${entityId} 详情`,
        )
        if (!isPlainObject(detailValue))
          throw new Error(
            `${entity} ${language}/${entityId} 详情必须是普通对象`,
          )
        await writeCacheFileAtomically(
          join(cacheDirectory, language, entity, `${entityId}.json`),
          bytes,
        )
        completed += 1
        options.onProgress?.({
          stage: "entity-details",
          entity,
          completed,
          total: detailTasks.length,
        })
      },
    )

    // 索引是缓存的发现边界，仅在其声明的全部详情成功后写入。
    await writeCacheFileAtomically(
      join(cacheDirectory, `${entity}.json`),
      indexBytes,
    )
  }

  return {
    entities,
    recordCounts,
    fetchedAssetCount: budget.assetCount(),
    fetchedBytes: budget.totalBytes(),
    cacheDirectory,
  }
}

function normalizeSelectedEntities(names?: readonly string[]): EntityName[] {
  if (names === undefined || names.length === 0)
    return [...supportedEntityNames]
  const requested = new Set<EntityName>()
  for (const name of names) {
    if (!isEntityName(name))
      throw new Error(`未知或未实现的 Nanoka 实体：${name}`)
    requested.add(name)
  }
  return supportedEntityNames.filter((name) => requested.has(name))
}

function isEntityName(value: string): value is EntityName {
  return supportedEntityNames.includes(value as EntityName)
}

function discoverEntityIds(
  value: unknown,
  entity: EntityName,
  maximumRecords: number,
): string[] {
  if (!isPlainObject(value)) throw new Error(`${entity} 索引必须是普通对象`)
  const entries = Object.entries(value)
  if (entries.length === 0) throw new Error(`${entity} 索引不能为空`)
  if (entries.length > maximumRecords)
    throw new Error(
      `${entity} 记录数 ${entries.length} 超过单实体上限 ${maximumRecords}`,
    )
  for (const [entityId, summary] of entries) {
    if (!isValidEntityId(entityId))
      throw new Error(`${entity} 索引包含非法实体 ID`)
    if (!isPlainObject(summary))
      throw new Error(`${entity} 索引 ${entityId} 必须是普通对象`)
  }
  return entries
    .map(([entityId]) => entityId)
    .toSorted((left, right) => {
      const leftId = BigInt(left)
      const rightId = BigInt(right)
      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0
    })
}

function createFetchBudget(policy: SourcePolicy): {
  reserveAsset(bytes: number): void
  reserveAdditionalAssets(count: number): void
  assetCount(): number
  totalBytes(): number
} {
  let assetCount = 0
  let totalBytes = 0
  const reserveAdditionalAssets = (count: number): void => {
    if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > policy.fetchLimits.maximumAssetsPerRun - assetCount
    )
      throw new Error(
        `本次抓取资源数量超过上限 ${policy.fetchLimits.maximumAssetsPerRun}`,
      )
  }
  return {
    reserveAsset(bytes) {
      reserveAdditionalAssets(1)
      if (bytes > policy.fetchLimits.maximumBytesPerRun - totalBytes)
        throw new Error(
          `本次抓取总字节数超过上限 ${policy.fetchLimits.maximumBytesPerRun}`,
        )
      assetCount += 1
      totalBytes += bytes
    },
    reserveAdditionalAssets,
    assetCount: () => assetCount,
    totalBytes: () => totalBytes,
  }
}

async function writeCacheFileAtomically(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function runWithConcurrency<T>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0
  let failure: unknown
  const worker = async (): Promise<void> => {
    while (failure === undefined) {
      const index = nextIndex
      nextIndex += 1
      if (index >= values.length) return
      try {
        await operation(values[index] as T)
      } catch (error) {
        failure = error
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () =>
      worker(),
    ),
  )
  if (failure !== undefined) throw failure
}

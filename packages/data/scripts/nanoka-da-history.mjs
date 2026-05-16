import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const sourceRoot = join(repoRoot, "packages/data/source/raw/nanoka/zzz")
const aggregateManifestPath = join(sourceRoot, "historical-da-fetch-manifest.json")
const sourceId = "nanoka-zzz"
const parserVersion = "nanoka-da-history-source-v0.1.0"
const userAgent = "fairy-data-source-audit/0.1 (+https://github.com/LoTwT/fairy)"

function parseArgs(argv) {
  const [command, ...rest] = argv
  const flags = {}

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (!token.startsWith("--"))
      throw new Error(`Unexpected positional argument: ${token}`)
    const key = token.slice(2)
    const next = rest[i + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
    }
    else {
      flags[key] = next
      i += 1
    }
  }

  return { command: command ?? "verify", flags }
}

function sha256(bufferOrString) {
  return createHash("sha256").update(bufferOrString).digest("hex")
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
    },
  })

  if (!response.ok)
    throw new Error(`Fetch failed for ${url}: HTTP ${response.status}`)

  const rawText = await response.text()
  return {
    json: JSON.parse(rawText),
    headers: {
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"),
    },
    status: response.status,
  }
}

function currentManifest() {
  const manifest = readJson(join(sourceRoot, "2.8/manifest.json"))
  const zzz = manifest.zzz
  if (zzz?.live !== "2.8")
    throw new Error(`Expected configured live 2.8, got ${zzz?.live}`)
  if (!Array.isArray(zzz.available))
    throw new Error("manifest.zzz.available must be an array")
  return zzz
}

function historicalVersions() {
  const zzz = currentManifest()
  return zzz.available.filter(version => version !== zzz.live)
}

function normalizeNanokaChinaDate(value) {
  if (value === undefined || value === null)
    throw new Error(`Invalid nanoka date: ${value}`)
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(value)
  if (match === null)
    throw new Error(`Invalid nanoka date: ${value}`)
  return `${match[1]}T${match[2]}+08:00`
}

function summarizeHistoricalSnapshots(sourceVersions) {
  const snapshots = sourceVersions.map((sourceVersion) => {
    const indexPath = join(sourceRoot, sourceVersion, "boss.json")
    const bossIndex = readJson(indexPath)
    const periodIds = Object.keys(bossIndex).sort((left, right) => Number(left) - Number(right))
    const details = periodIds.map((periodId) => {
      const indexEntry = bossIndex[periodId]
      const detail = readJson(join(sourceRoot, sourceVersion, `zh/boss/${periodId}.json`))
      const numericId = Number(periodId)
      if (detail.id !== numericId)
        throw new Error(`${sourceVersion}/${periodId}: detail id drifted`)
      if (detail.name !== indexEntry.zh)
        throw new Error(`${sourceVersion}/${periodId}: zh name drifted against index`)
      const indexBegin = indexEntry.begin ?? indexEntry.live_begin
      const indexEnd = indexEntry.end ?? indexEntry.live_end
      if (detail.begin_time !== undefined && detail.begin_time !== indexBegin)
        throw new Error(`${sourceVersion}/${periodId}: begin_time drifted against index`)
      if (detail.end_time !== undefined && detail.end_time !== indexEnd)
        throw new Error(`${sourceVersion}/${periodId}: end_time drifted against index`)
      if (indexBegin !== undefined)
        normalizeNanokaChinaDate(indexBegin)
      if (indexEnd !== undefined)
        normalizeNanokaChinaDate(indexEnd)
      return detail
    })
    const scheduleKnownCount = periodIds.filter((periodId) => {
      const indexEntry = bossIndex[periodId]
      const detail = readJson(join(sourceRoot, sourceVersion, `zh/boss/${periodId}.json`))
      return (detail.begin_time ?? indexEntry.begin ?? indexEntry.live_begin) !== undefined
        && (detail.end_time ?? indexEntry.end ?? indexEntry.live_end) !== undefined
    }).length
    return {
      sourceVersion,
      bossIndexCount: periodIds.length,
      retainedDetailCount: details.length,
      firstPeriodId: periodIds[0],
      lastPeriodId: periodIds.at(-1),
      scheduleKnownCount,
      scheduleMissingCount: periodIds.length - scheduleKnownCount,
      zoneCount: details.reduce((total, detail) => total + Object.keys(detail.zone ?? {}).length, 0),
      bossAdjustmentCount: details.reduce((total, detail) => total + Object.keys(detail.boss_adjust ?? {}).length, 0),
      periodIds,
    }
  })

  return {
    snapshotCount: snapshots.length,
    totalIndexCount: snapshots.reduce((total, snapshot) => total + snapshot.bossIndexCount, 0),
    totalRetainedDetailCount: snapshots.reduce((total, snapshot) => total + snapshot.retainedDetailCount, 0),
    totalZoneCount: snapshots.reduce((total, snapshot) => total + snapshot.zoneCount, 0),
    totalBossAdjustmentCount: snapshots.reduce((total, snapshot) => total + snapshot.bossAdjustmentCount, 0),
    uniquePeriodIdCount: new Set(snapshots.flatMap(snapshot => snapshot.periodIds)).size,
    snapshots,
  }
}

async function fetchHistoricalSnapshots(generatedAt) {
  const zzz = currentManifest()
  const sourceVersions = historicalVersions()
  const assets = []

  for (const sourceVersion of sourceVersions) {
    const indexUrl = `https://static.nanoka.cc/zzz/${sourceVersion}/boss.json`
    const indexPath = join(sourceRoot, sourceVersion, "boss.json")
    const fetchedIndex = await fetchJson(indexUrl)
    writeJson(indexPath, fetchedIndex.json)
    const indexBytes = readFileSync(indexPath)
    assets.push({
      id: `boss-index-${sourceVersion}`,
      sourceVersion,
      url: indexUrl,
      localPath: relative(repoRoot, indexPath),
      entityType: "bossIndex",
      approvedForCleanedOutput: false,
      evidenceUse: "v1.2.x-da-historical-batch-source-gate",
      status: fetchedIndex.status,
      headers: fetchedIndex.headers,
      bytes: indexBytes.length,
      sha256: sha256(indexBytes),
    })

    for (const periodId of Object.keys(fetchedIndex.json).sort((left, right) => Number(left) - Number(right))) {
      const detailUrl = `https://static.nanoka.cc/zzz/${sourceVersion}/zh/boss/${periodId}.json`
      const detailPath = join(sourceRoot, sourceVersion, `zh/boss/${periodId}.json`)
      const fetchedDetail = await fetchJson(detailUrl)
      writeJson(detailPath, fetchedDetail.json)
      const detailBytes = readFileSync(detailPath)
      assets.push({
        id: `boss-${sourceVersion}-${periodId}`,
        sourceVersion,
        url: detailUrl,
        localPath: relative(repoRoot, detailPath),
        entityType: "boss",
        language: "zh",
        entityId: Number(periodId),
        approvedForCleanedOutput: false,
        evidenceUse: "v1.2.x-da-historical-batch-source-gate",
        status: fetchedDetail.status,
        headers: fetchedDetail.headers,
        bytes: detailBytes.length,
        sha256: sha256(detailBytes),
      })
    }
  }

  const manifest = {
    schemaVersion: "nanoka-da-history-fetch-manifest-v1",
    sourceId,
    fetchedAt: generatedAt,
    generatedAt,
    parserVersion,
    userAgent,
    configuredLiveVersion: zzz.live,
    latestResearchVersion: zzz.latest,
    sourceVersions,
    policy: {
      currentRuntimeBucket: "deadlyAssaultPeriods",
      historicalRuntimeBucket: "historicalDAPeriods",
      currentCleanedOutputVersion: zzz.live,
      historicalVersionsAreNotCurrentRuntime: true,
      noRuntimeFallbackToHistorical: true,
    },
    assets,
    summary: summarizeHistoricalSnapshots(sourceVersions),
  }

  writeJson(aggregateManifestPath, manifest)
  console.log(`fetched nanoka historical DA snapshots to ${relative(repoRoot, sourceRoot)}`)
}

function assetFromExisting({
  id,
  sourceVersion,
  url,
  localPath,
  entityType,
  language,
  entityId,
}) {
  const filePath = join(repoRoot, localPath)
  if (!existsSync(filePath))
    throw new Error(`Missing historical DA asset for manifest refresh: ${localPath}`)
  const bytes = readFileSync(filePath)
  return {
    id,
    sourceVersion,
    url,
    localPath,
    entityType,
    ...(language === undefined ? {} : { language }),
    ...(entityId === undefined ? {} : { entityId }),
    approvedForCleanedOutput: false,
    evidenceUse: "v1.2.x-da-historical-batch-source-gate",
    status: 200,
    headers: {
      etag: null,
      lastModified: null,
      contentType: "application/json; charset=utf-8",
      cacheControl: null,
    },
    bytes: bytes.length,
    sha256: sha256(bytes),
  }
}

function refreshHistoricalManifest(generatedAt) {
  const zzz = currentManifest()
  const sourceVersions = historicalVersions()
  const assets = []

  for (const sourceVersion of sourceVersions) {
    const indexPath = join(sourceRoot, sourceVersion, "boss.json")
    const bossIndex = readJson(indexPath)
    assets.push(assetFromExisting({
      id: `boss-index-${sourceVersion}`,
      sourceVersion,
      url: `https://static.nanoka.cc/zzz/${sourceVersion}/boss.json`,
      localPath: relative(repoRoot, indexPath),
      entityType: "bossIndex",
    }))

    for (const periodId of Object.keys(bossIndex).sort((left, right) => Number(left) - Number(right))) {
      const detailPath = join(sourceRoot, sourceVersion, `zh/boss/${periodId}.json`)
      assets.push(assetFromExisting({
        id: `boss-${sourceVersion}-${periodId}`,
        sourceVersion,
        url: `https://static.nanoka.cc/zzz/${sourceVersion}/zh/boss/${periodId}.json`,
        localPath: relative(repoRoot, detailPath),
        entityType: "boss",
        language: "zh",
        entityId: Number(periodId),
      }))
    }
  }

  const manifest = {
    schemaVersion: "nanoka-da-history-fetch-manifest-v1",
    sourceId,
    fetchedAt: generatedAt,
    generatedAt,
    parserVersion,
    userAgent,
    configuredLiveVersion: zzz.live,
    latestResearchVersion: zzz.latest,
    sourceVersions,
    policy: {
      currentRuntimeBucket: "deadlyAssaultPeriods",
      historicalRuntimeBucket: "historicalDAPeriods",
      currentCleanedOutputVersion: zzz.live,
      historicalVersionsAreNotCurrentRuntime: true,
      noRuntimeFallbackToHistorical: true,
    },
    assets,
    summary: summarizeHistoricalSnapshots(sourceVersions),
  }

  writeJson(aggregateManifestPath, manifest)
  console.log(`refreshed nanoka historical DA manifest at ${relative(repoRoot, aggregateManifestPath)}`)
}

function verifyHistoricalSnapshots() {
  if (!existsSync(aggregateManifestPath))
    throw new Error(`Missing historical DA fetch manifest: ${relative(repoRoot, aggregateManifestPath)}`)

  const manifest = readJson(aggregateManifestPath)
  if (manifest.schemaVersion !== "nanoka-da-history-fetch-manifest-v1")
    throw new Error("Unexpected historical DA manifest schemaVersion")
  if (manifest.sourceId !== sourceId)
    throw new Error("Unexpected historical DA sourceId")
  if (manifest.configuredLiveVersion !== currentManifest().live)
    throw new Error("configuredLiveVersion drifted")
  if (JSON.stringify(manifest.sourceVersions) !== JSON.stringify(historicalVersions()))
    throw new Error("historical source version list drifted from manifest.zzz.available")

  for (const asset of manifest.assets ?? []) {
    const filePath = join(repoRoot, asset.localPath)
    if (!existsSync(filePath))
      throw new Error(`Missing nanoka historical DA asset ${asset.localPath}`)
    const bytes = readFileSync(filePath)
    if (bytes.length !== asset.bytes)
      throw new Error(`${asset.id}: byte length drifted`)
    if (sha256(bytes) !== asset.sha256)
      throw new Error(`${asset.id}: sha256 drifted`)
    if (asset.sourceVersion === manifest.configuredLiveVersion)
      throw new Error(`${asset.id}: current configured-live version must not be duplicated in historical DA manifest`)
    if (asset.approvedForCleanedOutput !== false)
      throw new Error(`${asset.id}: historical DA assets must not be marked current cleaned output`)
  }

  const summary = summarizeHistoricalSnapshots(manifest.sourceVersions)
  if (JSON.stringify(summary) !== JSON.stringify(manifest.summary))
    throw new Error("historical DA summary drifted")

  console.log("nanoka historical DA verification passed")
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))
  const generatedAt = String(flags["generated-at"] ?? new Date().toISOString())

  if (command === "fetch") {
    await fetchHistoricalSnapshots(generatedAt)
    return
  }
  if (command === "refresh-manifest") {
    refreshHistoricalManifest(generatedAt)
    return
  }
  if (command === "verify") {
    verifyHistoricalSnapshots()
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

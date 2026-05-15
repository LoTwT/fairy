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
const sourceRoot = join(repoRoot, "data/source/raw/nanoka/zzz")
const sourceId = "nanoka-zzz"
const parserVersion = "nanoka-source-v0.1.0"
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

function snapshotAssets(snapshot) {
  return [
    {
      id: "manifest",
      url: "https://static.nanoka.cc/manifest.json",
      path: "manifest.json",
      entityType: "sourceManifest",
      approvedForCleanedOutput: false,
      evidenceUse: "formal-live-version-gate",
    },
    {
      id: "boss-index",
      url: `https://static.nanoka.cc/zzz/${snapshot}/boss.json`,
      path: "boss.json",
      entityType: "bossIndex",
      approvedForCleanedOutput: true,
      evidenceUse: "deadly-assault-source-gate",
    },
    {
      id: "character-nekomata-1021",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/character/1021.json`,
      path: "zh/character/1021.json",
      entityType: "character",
      language: "zh",
      entityId: 1021,
      approvedForCleanedOutput: true,
      evidenceUse: "agent-panel-sentinel-source-gate",
    },
    {
      id: "boss-69036",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/boss/69036.json`,
      path: "zh/boss/69036.json",
      entityType: "boss",
      language: "zh",
      entityId: 69036,
      approvedForCleanedOutput: true,
      evidenceUse: "deadly-assault-detail-source-gate",
    },
  ]
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

function summarizeSnapshot(snapshot, assets) {
  const manifest = readJson(join(sourceRoot, snapshot, "manifest.json"))
  const bossIndex = readJson(join(sourceRoot, snapshot, "boss.json"))
  const character = readJson(join(sourceRoot, snapshot, "zh/character/1021.json"))
  const boss = readJson(join(sourceRoot, snapshot, "zh/boss/69036.json"))

  if (manifest.zzz?.live !== snapshot)
    throw new Error(`manifest.zzz.live=${manifest.zzz?.live} does not match snapshot ${snapshot}`)
  if (manifest.zzz?.latest === snapshot)
    throw new Error("nanoka live snapshot unexpectedly equals latest research snapshot")
  if (!Object.hasOwn(bossIndex, "69036"))
    throw new Error("boss index is missing sample DA boss 69036")
  if (character.id !== 1021)
    throw new Error("character sample id drifted")
  if (boss.id !== 69036)
    throw new Error("boss sample id drifted")

  return {
    manifestLiveVersion: manifest.zzz.live,
    manifestLatestVersion: manifest.zzz.latest,
    bossIndexCount: Object.keys(bossIndex).length,
    characterSample: {
      id: character.id,
      codeName: character.code_name,
      hasStats: character.stats !== undefined,
      sentinelRawPaths: [
        "/stats/rp_max",
        "/stats/rp_recover",
        "/skill_list/*/level/*/fever_recovery",
        "/skill_list/*/level/*/rp_recovery",
      ],
    },
    deadlyAssaultSample: {
      id: boss.id,
      zoneCount: Object.keys(boss.zone ?? {}).length,
      hasBossAdjust: boss.boss_adjust !== undefined,
    },
    retainedAssetCount: assets.length,
  }
}

async function fetchSnapshot(snapshot, generatedAt) {
  const snapshotRoot = join(sourceRoot, snapshot)
  const assets = []

  for (const asset of snapshotAssets(snapshot)) {
    const fetched = await fetchJson(asset.url)
    const filePath = join(snapshotRoot, asset.path)
    writeJson(filePath, fetched.json)
    const bytes = readFileSync(filePath)

    assets.push({
      ...asset,
      sourceVersion: snapshot,
      localPath: relative(repoRoot, filePath),
      status: fetched.status,
      headers: fetched.headers,
      bytes: bytes.length,
      sha256: sha256(bytes),
    })
  }

  const manifest = {
    schemaVersion: "nanoka-fetch-manifest-v1",
    sourceId,
    snapshotId: snapshot,
    fetchedAt: generatedAt,
    generatedAt,
    parserVersion,
    userAgent,
    formalLivePolicy: {
      liveVersionRef: "manifest.zzz.live",
      configuredLiveVersion: snapshot,
      latestPolicy: "research-and-drift-only",
      rawSnapshotPurpose: "Phase 2 adapter fixture; not runtime cleaned data cutover",
    },
    urlPolicy: {
      manifestUrl: "https://static.nanoka.cc/manifest.json",
      approvedIndexUrls: [
        `https://static.nanoka.cc/zzz/${snapshot}/boss.json`,
      ],
      approvedLocalizedDetailUrlPatterns: [
        `https://static.nanoka.cc/zzz/${snapshot}/{locale}/{entityType}/{id}.json`,
      ],
      forbiddenIndexNames: ["beta", "preview", "leak", "datamine"],
    },
    assets,
    summary: summarizeSnapshot(snapshot, assets),
  }

  writeJson(join(snapshotRoot, "fetch-manifest.json"), manifest)
  console.log(`fetched nanoka snapshot ${snapshot} to ${relative(repoRoot, snapshotRoot)}`)
}

function verifySnapshot(snapshot) {
  const snapshotRoot = join(sourceRoot, snapshot)
  const manifestPath = join(snapshotRoot, "fetch-manifest.json")
  if (!existsSync(manifestPath))
    throw new Error(`Missing nanoka fetch manifest: ${relative(repoRoot, manifestPath)}`)

  const manifest = readJson(manifestPath)
  if (manifest.schemaVersion !== "nanoka-fetch-manifest-v1")
    throw new Error("Unexpected nanoka fetch manifest schemaVersion")
  if (manifest.sourceId !== sourceId)
    throw new Error("Unexpected nanoka sourceId")
  if (manifest.snapshotId !== snapshot)
    throw new Error(`snapshotId ${manifest.snapshotId} does not match ${snapshot}`)
  if (manifest.formalLivePolicy?.configuredLiveVersion !== snapshot)
    throw new Error("configuredLiveVersion must match snapshot")

  for (const asset of manifest.assets ?? []) {
    const filePath = join(repoRoot, asset.localPath)
    if (!existsSync(filePath))
      throw new Error(`Missing nanoka asset ${asset.localPath}`)
    const bytes = readFileSync(filePath)
    if (bytes.length !== asset.bytes)
      throw new Error(`${asset.id}: byte length drifted`)
    if (sha256(bytes) !== asset.sha256)
      throw new Error(`${asset.id}: sha256 drifted`)
    if (asset.sourceVersion !== snapshot)
      throw new Error(`${asset.id}: sourceVersion must match snapshot`)
  }

  const summary = summarizeSnapshot(snapshot, manifest.assets ?? [])
  if (summary.manifestLiveVersion !== manifest.summary?.manifestLiveVersion)
    throw new Error("manifest live version summary drifted")
  if (summary.bossIndexCount !== manifest.summary?.bossIndexCount)
    throw new Error("boss index count summary drifted")
  if (summary.deadlyAssaultSample.zoneCount !== manifest.summary?.deadlyAssaultSample?.zoneCount)
    throw new Error("DA sample zone count summary drifted")

  console.log(`nanoka snapshot ${snapshot} verification passed`)
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))
  const snapshot = String(flags.snapshot ?? "2.8")
  const generatedAt = String(flags["generated-at"] ?? new Date().toISOString())

  if (command === "fetch") {
    await fetchSnapshot(snapshot, generatedAt)
    return
  }
  if (command === "verify") {
    verifySnapshot(snapshot)
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

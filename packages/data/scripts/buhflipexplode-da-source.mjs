import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const sourceRoot = join(repoRoot, "data/source/raw/buhflipexplode")
const sourceId = "buhflipexplode-zzz-da"
const userAgent = "fairy-data-source-audit/0.1 (+https://github.com/LoTwT/fairy)"

const assets = [
  {
    id: "da-page",
    url: "https://www.buhflipexplode.org/zzz/da/",
    path: "da/index.html",
    kind: "html",
    retain: "raw",
  },
  {
    id: "da-js",
    url: "https://www.buhflipexplode.org/zzz/da/da.js",
    path: "da/da.js",
    kind: "javascript",
    retain: "raw",
  },
  {
    id: "da-versions",
    url: "https://www.buhflipexplode.org/zzz/da/da-versions.json",
    path: "da/da-versions.live.json",
    kind: "json",
    retain: "live-filtered",
  },
  {
    id: "enemies",
    url: "https://www.buhflipexplode.org/assets/zzz/enemies.json",
    path: "assets/zzz/enemies.live.json",
    kind: "json",
    retain: "live-filtered",
  },
  {
    id: "buffs",
    url: "https://www.buhflipexplode.org/assets/zzz/buffs.json",
    path: "assets/zzz/buffs.live.json",
    kind: "json",
    retain: "live-filtered",
  },
  {
    id: "about-page",
    url: "https://www.buhflipexplode.org/about/",
    path: "about/index.html",
    kind: "html",
    retain: "raw",
  },
  {
    id: "source-license",
    url: "https://raw.githubusercontent.com/spiritfxxxx/buhflipexplode-src/main/LICENSE",
    path: "source/LICENSE",
    kind: "license",
    retain: "raw",
  },
]

const algorithmSectionMarkers = [
  ["loadHPData", "function loadHPData()", "async function showVersion"],
  ["showEnemies", "function showEnemies()", "function generateWR"],
  ["generateEnemyStats", "function generateEnemyStats", "function loadSavedState"],
  ["calculateBoss", "function calculateBoss", "function toggleChart"],
]

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

function writeText(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
}

async function fetchAsset(asset) {
  const response = await fetch(asset.url, {
    headers: {
      "User-Agent": userAgent,
    },
  })

  if (!response.ok)
    throw new Error(`Fetch failed for ${asset.url}: HTTP ${response.status}`)

  const bytes = Buffer.from(await response.arrayBuffer())
  return {
    asset,
    bytes,
    headers: {
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"),
    },
    status: response.status,
  }
}

function parseRuntimeConfig(daJs) {
  const numberConst = name => Number(daJs.match(new RegExp(`${name}=(\\d+)`))?.[1])
  const fetchAssets = [...daJs.matchAll(/fetch\("([^"]+)"\)/g)].map(match => match[1])

  const runtimeConfig = {
    vLive: numberConst("vLive"),
    vBeta: numberConst("vBeta"),
    v22: numberConst("v22"),
    v28: numberConst("v28"),
    fetchAssets,
  }

  for (const [key, value] of Object.entries(runtimeConfig)) {
    if (key !== "fetchAssets" && !Number.isFinite(value))
      throw new Error(`Unable to extract ${key} from da.js`)
  }

  return runtimeConfig
}

function filterLiveData(versionData, enemyData, buffData, runtimeConfig) {
  const versionEntries = Object.entries(versionData)
  const liveEntries = versionEntries.slice(0, runtimeConfig.vLive)
  const excludedEntries = versionEntries.slice(runtimeConfig.vLive)
  const liveEnemyIds = new Set()
  const liveBuffIds = new Set()

  for (const [, version] of liveEntries) {
    for (const enemy of version.versionEnemies)
      liveEnemyIds.add(enemy.id)
    for (const buffId of version.versionBuffIDs)
      liveBuffIds.add(buffId)
  }

  return {
    liveVersionData: Object.fromEntries(liveEntries),
    liveEnemyData: Object.fromEntries(
      [...liveEnemyIds].sort().map(id => [id, enemyData[id]]),
    ),
    liveBuffData: Object.fromEntries(
      [...liveBuffIds].sort().map(id => [id, buffData[id]]),
    ),
    liveVersionKeys: liveEntries.map(([key]) => key),
    excludedVersionKeys: excludedEntries.map(([key]) => key),
    liveEnemyIds: [...liveEnemyIds].sort(),
    liveBuffIds: [...liveBuffIds].sort(),
  }
}

function normalizeJavaScript(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\s+/g, "")
}

function extractSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end < 0)
    throw new Error(`Unable to extract algorithm section ${startMarker}`)
  return source.slice(start, end)
}

function buildAlgorithmManifest(options) {
  const daJs = readFileSync(options.daJsPath, "utf8")
  const runtimeConfig = parseRuntimeConfig(daJs)
  const normalizedDaJs = normalizeJavaScript(daJs)
  const sections = algorithmSectionMarkers.map(([name, startMarker, endMarker]) => {
    const source = extractSection(daJs, startMarker, endMarker)
    const normalized = normalizeJavaScript(source)
    return {
      name,
      sourceStartMarker: startMarker,
      sourceEndMarker: endMarker,
      bytes: Buffer.byteLength(source),
      sha256: sha256(source),
      normalizedSha256: sha256(normalized),
    }
  })

  return {
    schemaVersion: "buhflipexplode-algorithm-manifest-v1",
    sourceId,
    generatedAt: options.generatedAt,
    snapshotId: options.snapshotId,
    runtimePolicy: {
      licenseDecision: "option-b-fairy-mit-independent-implementation",
      runtimeCodePolicy:
        "Do not copy GPL-3.0 buhflipexplode JS into MIT Fairy runtime packages.",
      rawArchivePolicy:
        "Retain fetched JS/JSON snapshots in git but exclude them from npm/package outputs.",
    },
    runtimeConfig,
    liveDataPolicy: {
      liveVersionCount: runtimeConfig.vLive,
      betaStartIndex: runtimeConfig.vBeta,
      liveVersionKeys: options.liveData.liveVersionKeys,
      excludedVersionKeys: options.liveData.excludedVersionKeys,
      excludedReason:
        "da.js labels versions with index >= vBeta as BETA and changeVersion hides versions above vLive unless leaks are enabled.",
    },
    algorithmSource: {
      path: "da/da.js",
      sha256: sha256(daJs),
      normalizedSha256: sha256(normalizedDaJs),
      sectionHashMode:
        "selected algorithm section normalized hash; upgrade to AST/function-level extraction if da.js structure changes.",
    },
    sections,
  }
}

function fileEntry(snapshotDir, manifestFile, asset, upstreamBytes, retainedPath, retainedBytes, headers, status) {
  return {
    id: asset.id,
    url: asset.url,
    path: retainedPath,
    retain: asset.retain,
    status,
    contentType: headers.contentType,
    etag: headers.etag,
    lastModified: headers.lastModified,
    cacheControl: headers.cacheControl,
    upstream: {
      bytes: upstreamBytes.length,
      sha256: sha256(upstreamBytes),
    },
    retained: {
      bytes: retainedBytes.length,
      sha256: sha256(retainedBytes),
    },
    retainedPath: relative(snapshotDir, join(snapshotDir, retainedPath)),
    manifestPath: manifestFile,
  }
}

async function fetchCommand(flags) {
  const snapshotId = String(flags["snapshot-id"] ?? new Date().toISOString().replace(/[:.]/g, "-"))
  const fetchedAt = String(flags["fetched-at"] ?? new Date().toISOString())
  const snapshotDir = join(sourceRoot, snapshotId)
  const fetched = new Map()

  rmSync(snapshotDir, { recursive: true, force: true })
  mkdirSync(snapshotDir, { recursive: true })

  for (const asset of assets)
    fetched.set(asset.id, await fetchAsset(asset))

  const daJs = fetched.get("da-js").bytes.toString("utf8")
  const runtimeConfig = parseRuntimeConfig(daJs)
  const versionData = JSON.parse(fetched.get("da-versions").bytes.toString("utf8"))
  const enemyData = JSON.parse(fetched.get("enemies").bytes.toString("utf8"))
  const buffData = JSON.parse(fetched.get("buffs").bytes.toString("utf8"))
  const liveData = filterLiveData(versionData, enemyData, buffData, runtimeConfig)
  const files = []

  for (const asset of assets) {
    const result = fetched.get(asset.id)
    let retainedBytes = result.bytes

    if (asset.id === "da-versions")
      retainedBytes = Buffer.from(`${JSON.stringify(liveData.liveVersionData, null, 2)}\n`)
    else if (asset.id === "enemies")
      retainedBytes = Buffer.from(`${JSON.stringify(liveData.liveEnemyData, null, 2)}\n`)
    else if (asset.id === "buffs")
      retainedBytes = Buffer.from(`${JSON.stringify(liveData.liveBuffData, null, 2)}\n`)

    writeText(join(snapshotDir, asset.path), retainedBytes)
    files.push(fileEntry(
      snapshotDir,
      "fetch-manifest.json",
      asset,
      result.bytes,
      asset.path,
      retainedBytes,
      result.headers,
      result.status,
    ))
  }

  const algorithmManifest = buildAlgorithmManifest({
    daJsPath: join(snapshotDir, "da/da.js"),
    generatedAt: fetchedAt,
    snapshotId,
    liveData,
  })

  writeJson(join(snapshotDir, "algorithm-manifest.json"), algorithmManifest)

  const fetchManifest = {
    schemaVersion: "buhflipexplode-fetch-manifest-v1",
    sourceId,
    snapshotId,
    fetchedAt,
    generatedAt: fetchedAt,
    userAgent,
    pageUrl: "https://www.buhflipexplode.org/zzz/da/",
    sourceRepository: {
      url: "https://github.com/spiritfxxxx/buhflipexplode-src",
      license: "GPL-3.0",
      runtimeUseDecision:
        "Reference algorithm behavior only; Fairy runtime implementation remains independent MIT code.",
    },
    liveDataPolicy: algorithmManifest.liveDataPolicy,
    liveDataSummary: {
      liveVersionCount: liveData.liveVersionKeys.length,
      liveEnemyCount: liveData.liveEnemyIds.length,
      liveBuffCount: liveData.liveBuffIds.length,
    },
    files,
  }

  writeJson(join(snapshotDir, "fetch-manifest.json"), fetchManifest)

  if (flags.accept === true) {
    writeJson(
      join(sourceRoot, "accepted-algorithm-manifest.json"),
      algorithmManifest,
    )
  }
}

function listFiles(dir) {
  if (!existsSync(dir))
    return []

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return listFiles(path)
    return [path]
  })
}

function verifyCommand(flags) {
  const snapshot = String(flags.snapshot ?? "")
  if (snapshot.length === 0)
    throw new Error("verify requires --snapshot <snapshot-id>")

  const snapshotDir = join(sourceRoot, snapshot)
  const fetchManifestPath = join(snapshotDir, "fetch-manifest.json")
  const algorithmManifestPath = join(snapshotDir, "algorithm-manifest.json")
  const acceptedManifestPath = join(sourceRoot, "accepted-algorithm-manifest.json")
  const fetchManifest = readJson(fetchManifestPath)
  const algorithmManifest = readJson(algorithmManifestPath)

  for (const file of fetchManifest.files) {
    const path = join(snapshotDir, file.path)
    if (!existsSync(path))
      throw new Error(`Manifest file missing: ${file.path}`)
    const bytes = readFileSync(path)
    if (sha256(bytes) !== file.retained.sha256)
      throw new Error(`SHA-256 mismatch for ${file.path}`)
  }

  const rebuiltAlgorithmManifest = buildAlgorithmManifest({
    daJsPath: join(snapshotDir, "da/da.js"),
    generatedAt: algorithmManifest.generatedAt,
    snapshotId: snapshot,
    liveData: {
      liveVersionKeys: algorithmManifest.liveDataPolicy.liveVersionKeys,
      excludedVersionKeys: algorithmManifest.liveDataPolicy.excludedVersionKeys,
    },
  })

  if (
    rebuiltAlgorithmManifest.algorithmSource.normalizedSha256
    !== algorithmManifest.algorithmSource.normalizedSha256
  ) {
    throw new Error("Algorithm normalized hash mismatch")
  }

  for (const section of algorithmManifest.sections) {
    const rebuilt = rebuiltAlgorithmManifest.sections.find(candidate =>
      candidate.name === section.name)
    if (rebuilt?.normalizedSha256 !== section.normalizedSha256)
      throw new Error(`Algorithm section hash mismatch: ${section.name}`)
  }

  if (existsSync(acceptedManifestPath)) {
    const acceptedManifest = readJson(acceptedManifestPath)
    const currentSections = Object.fromEntries(
      algorithmManifest.sections.map(section => [section.name, section.normalizedSha256]),
    )
    const acceptedSections = Object.fromEntries(
      acceptedManifest.sections.map(section => [section.name, section.normalizedSha256]),
    )
    const changedSections = Object.keys(currentSections).filter(
      name => currentSections[name] !== acceptedSections[name],
    )
    if (changedSections.length > 0) {
      throw new Error(
        `algorithmChanged=true; section hash changed: ${changedSections.join(", ")}`,
      )
    }
  }

  const retainedFiles = listFiles(snapshotDir).map(path => relative(snapshotDir, path))
  const forbiddenFullPayloads = [
    "da-versions.json",
    "enemies.json",
    "buffs.json",
  ]
  const retainedFullPayload = retainedFiles.find(file =>
    forbiddenFullPayloads.some(name => file.endsWith(name)))
  if (retainedFullPayload !== undefined) {
    throw new Error(
      `Full upstream JSON must not be retained (${retainedFullPayload}); use live-filtered *.live.json files`,
    )
  }
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))

  if (command === "fetch")
    await fetchCommand(flags)
  else if (command === "verify")
    verifyCommand(flags)
  else
    throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

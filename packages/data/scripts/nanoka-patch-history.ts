import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { deriveNanokaSnapshotDiffHistory, type NanokaSnapshotDiffInput } from "../src/nanoka-patch-history"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const rootRegistryPath = join(repoRoot, "data/source-registry.json")
const rootArtifactPath = join(repoRoot, "data/cleaned/audit/nanoka-snapshot-diff-history.json")
const packageArtifactPath = join(packageDir, "cleaned/audit/nanoka-snapshot-diff-history.json")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function parseArgs(argv: string[]) {
  const flags: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!
    if (token === "--")
      continue
    if (!token.startsWith("--"))
      throw new Error(`Unexpected positional argument: ${token}`)
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
    }
    else {
      flags[key] = next
      i += 1
    }
  }
  return flags
}

function nanokaRegistrySource() {
  const registry = readJson<{
    sources: Array<{
      sourceId: string
      configuredLiveVersion: string
      latestResearchVersion?: string
      approvedLiveVersions: string[]
      contentHash: string
    }>
  }>(rootRegistryPath)
  const source = registry.sources.find(item => item.sourceId === "nanoka-zzz")
  if (source === undefined)
    throw new Error("Missing nanoka-zzz source registry entry")
  return source
}

function buildApprovedSnapshotInput(version: string, contentHash: string): NanokaSnapshotDiffInput {
  const snapshotRoot = join(repoRoot, "data/source/raw/nanoka/zzz", version)
  const manifest = readJson<{
    zzz: {
      live: string
      latest: string
      available: string[]
    }
  }>(join(snapshotRoot, "manifest.json"))
  const fetchManifestPath = join(snapshotRoot, "fetch-manifest.json")
  const fetchManifest = readJson<{
    assets: Array<{
      id: string
      entityType: string
      sourceVersion: string
      sha256: string
      approvedForCleanedOutput: boolean
    }>
    summary: unknown
  }>(fetchManifestPath)

  return {
    sourceVersion: version,
    contentHash,
    records: {
      manifest: {
        live: manifest.zzz.live,
        latest: manifest.zzz.latest,
        availableCount: manifest.zzz.available.length,
      },
      retainedSnapshot: {
        contentHash: `sha256:${sha256(fetchManifestPath)}`,
        assetCount: fetchManifest.assets.length,
        approvedAssetCount: fetchManifest.assets.filter(asset => asset.approvedForCleanedOutput).length,
      },
      summary: fetchManifest.summary,
    },
  }
}

function main() {
  const flags = parseArgs(process.argv.slice(2))
  const generatedAt = String(flags["generated-at"] ?? new Date().toISOString())
  const source = nanokaRegistrySource()

  const inputs = source.approvedLiveVersions.map((version) => {
    const contentHash = version === source.configuredLiveVersion
      ? source.contentHash
      : (() => {
          throw new Error(`Approved snapshot ${version} is missing retained contentHash metadata`)
        })()
    return buildApprovedSnapshotInput(version, contentHash)
  })

  const history = deriveNanokaSnapshotDiffHistory(inputs, {
    sourceId: source.sourceId,
    generatedAt,
    approvedLiveVersions: source.approvedLiveVersions,
    latestResearchVersion: source.latestResearchVersion,
  })

  const artifact = {
    ...history,
    approvedSnapshots: inputs.map(input => ({
      sourceVersion: input.sourceVersion,
      contentHash: input.contentHash,
    })),
    summary: {
      approvedSnapshotCount: inputs.length,
      comparedPairCount: history.comparedPairs.length,
      changed: history.comparedPairs.reduce((sum, pair) => sum + pair.changes.filter(change => change.kind === "changed").length, 0),
      new: history.comparedPairs.reduce((sum, pair) => sum + pair.changes.filter(change => change.kind === "new").length, 0),
      missing: history.comparedPairs.reduce((sum, pair) => sum + pair.changes.filter(change => change.kind === "missing").length, 0),
    },
  }

  writeJson(rootArtifactPath, artifact)
  writeJson(packageArtifactPath, artifact)
  console.log(`wrote ${rootArtifactPath}`)
}

main()

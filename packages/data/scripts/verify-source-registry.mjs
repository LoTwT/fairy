import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const rootRegistryPath = join(repoRoot, "data/source-registry.json")
const packageRegistryPath = join(packageDir, "source-registry.json")
const matrixPath = join(repoRoot, "data/cleaned/audit/nanoka-coverage-matrix.json")

const redistributionRisks = new Set([
  "accepted-by-owner",
  "archived-audit-baseline",
  "cross-check-only",
  "derived",
  "forbidden",
])

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function assert(condition, message) {
  if (!condition)
    throw new Error(message)
}

function compile(pattern, label) {
  assert(typeof pattern === "string" && pattern.length > 0, `${label} must be a non-empty regex string`)
  return new RegExp(pattern)
}

function urlMatchesAllowlist(url, allowlist) {
  return Object.entries(allowlist ?? {}).some(([, pattern]) => compile(pattern, "urlAllowlist entry").test(url))
}

function sourceById(registry, sourceId) {
  const source = registry.sources.find(item => item.sourceId === sourceId)
  assert(source !== undefined, `Missing source-registry entry for ${sourceId}`)
  return source
}

function validateRegistryShape(registry) {
  assert(registry.schemaVersion === "source-registry/v0.1.0", "Unexpected source-registry schemaVersion")
  assert(Array.isArray(registry.sources) && registry.sources.length > 0, "source-registry.sources must be non-empty")

  const ids = registry.sources.map(source => source.sourceId)
  assert(new Set(ids).size === ids.length, "source-registry sourceId values must be unique")

  for (const source of registry.sources) {
    assert(typeof source.sourceId === "string" && source.sourceId.length > 0, "sourceId is required")
    assert(typeof source.kind === "string" && source.kind.length > 0, `${source.sourceId}: kind is required`)
    assert(redistributionRisks.has(source.redistributionRisk), `${source.sourceId}: invalid redistributionRisk ${source.redistributionRisk}`)
    assert(typeof source.configuredLiveVersion === "string" && source.configuredLiveVersion.length > 0, `${source.sourceId}: configuredLiveVersion is required`)
    assert(Array.isArray(source.approvedLiveVersions), `${source.sourceId}: approvedLiveVersions must be an array`)
    assert(typeof source.contentHash === "string" && source.contentHash.length > 0, `${source.sourceId}: contentHash is required`)
    assert(typeof source.takedownPath === "string" && source.takedownPath.length > 0, `${source.sourceId}: takedownPath is required`)

    if (source.redistributionRisk === "accepted-by-owner")
      assert(typeof source.redistributionRiskRef === "string" && source.redistributionRiskRef.length > 0, `${source.sourceId}: accepted-by-owner requires redistributionRiskRef`)
  }
}

function validateNanokaRegistry(source) {
  assert(source.sourceId === "nanoka-zzz", "validateNanokaRegistry requires nanoka-zzz")
  assert(source.liveVersionRef === "manifest.zzz.live", "nanoka liveVersionRef must be manifest.zzz.live")
  assert(source.server === "live", "nanoka server must be live")
  assert(source.releaseChannel === "stable", "nanoka releaseChannel must be stable")
  assert(source.approvedLiveVersions.includes(source.configuredLiveVersion), "nanoka approvedLiveVersions must include configuredLiveVersion")
  assert(source.approvedLiveVersionsScope?.includes("snapshot-diff"), "nanoka approvedLiveVersionsScope must be restricted to snapshot-diff/archive usage")

  const manifestPattern = compile(source.urlAllowlist?.manifestUrl, "nanoka manifestUrl allowlist")
  const indexPattern = compile(source.urlAllowlist?.versionedIndexUrls, "nanoka versionedIndexUrls allowlist")
  const detailPattern = compile(source.urlAllowlist?.localizedDetailUrls, "nanoka localizedDetailUrls allowlist")

  assert(manifestPattern.test("https://static.nanoka.cc/manifest.json"), "nanoka allowlist must accept manifest.json")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/boss.json`), "nanoka allowlist must accept versioned boss index")
  for (const forbiddenIndex of ["beta", "preview", "leak", "datamine"]) {
    assert(
      !indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/${forbiddenIndex}.json`),
      `nanoka index allowlist must reject ${forbiddenIndex}.json`,
    )
  }
  assert(detailPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/zh/character/1021.json`), "nanoka allowlist must accept localized character detail")
  assert(!detailPattern.test("https://static.nanoka.cc/zzz/beta/zh/character/1021.json"), "nanoka detail allowlist must reject beta routes")
}

function validateMatrixAgainstRegistry(matrix, registry) {
  const nanoka = sourceById(registry, "nanoka-zzz")
  validateNanokaRegistry(nanoka)

  assert(matrix.sourceVersionPolicy?.liveVersionRef === nanoka.liveVersionRef, "matrix liveVersionRef must match nanoka registry")
  assert(matrix.sourceVersionPolicy?.defaultReleaseSourceVersion === nanoka.configuredLiveVersion, "matrix default release version must match configuredLiveVersion")
  assert(matrix.sourceVersionResolved === nanoka.configuredLiveVersion, "matrix resolved sourceVersion must match configuredLiveVersion")
  assert(matrix.sourceVersionPolicy?.latestResearchVersion === nanoka.latestResearchVersion, "matrix latestResearchVersion must match registry")

  for (const sample of matrix.sampleSources ?? []) {
    if (!sample.id?.startsWith("nanoka-"))
      continue

    assert(urlMatchesAllowlist(sample.url, nanoka.urlAllowlist), `${sample.id}: URL is not allowed by nanoka urlAllowlist`)

    if (sample.version === nanoka.latestResearchVersion) {
      assert(sample.approvedForCleanedOutput === false, `${sample.id}: latest research sample must not be approved for cleaned output`)
      assert(sample.evidenceUse?.includes("research"), `${sample.id}: latest research sample must be marked research-only`)
    }

    if (sample.approvedForCleanedOutput === true && sample.entityType !== "sourceManifest")
      assert(sample.version === nanoka.configuredLiveVersion, `${sample.id}: current cleaned evidence must use configuredLiveVersion`)
  }

  const sampleById = new Map((matrix.sampleSources ?? []).map(sample => [sample.id, sample]))
  for (const row of matrix.rows ?? []) {
    assert(!row.fieldId?.startsWith("sentinel."), `${row.fieldId}: provisional sentinel fieldId must use canonical Adrenaline/Resonance naming`)

    if (row.promotable !== true)
      continue

    const sample = sampleById.get(row.sampleEntity)
    assert(sample !== undefined, `${row.fieldId}: promotable row sampleEntity is missing from sampleSources`)
    assert(sample.approvedForCleanedOutput === true, `${row.fieldId}: promotable row must use approved live sample evidence`)
    if (sample.entityType !== "sourceManifest")
      assert(sample.version === nanoka.configuredLiveVersion, `${row.fieldId}: promotable row must use configuredLiveVersion sample evidence`)
  }

  const resourceRows = new Map((matrix.rows ?? []).map(row => [row.fieldId, row]))
  for (const fieldId of [
    "adrenaline.maxAdrenaline",
    "adrenaline.automaticAdrenalineAccumulation",
    "skills.resonanceRecovery",
    "skills.adrenalineRecovery",
  ]) {
    const row = resourceRows.get(fieldId)
    assert(row !== undefined, `${fieldId}: missing Adrenaline/Resonance typed promote row`)
    assert(row.status === "verified-from-nanoka", `${fieldId}: resource row must be verified-from-nanoka`)
    assert(row.promotable === true, `${fieldId}: resource row must be promotable after unit mapping lock`)
    assert(row.sampleEntity === "nanoka-character-yixuan-live-1371", `${fieldId}: resource row must use live Yixuan sample evidence`)
  }

  const daRow = resourceRows.get("deadlyAssault.periodsBossesBuffs")
  assert(daRow !== undefined, "deadlyAssault.periodsBossesBuffs: missing DA formal-live row")
  assert(daRow.promotable === true, "deadlyAssault.periodsBossesBuffs: DA source artifact row must be promotable after semantic mapping gate")
  assert(daRow.sampleEntity === "nanoka-boss-live-69036", "deadlyAssault.periodsBossesBuffs: DA row must use live period detail evidence")
  assert(daRow.blockedBy?.includes("field:runtime-cutover-drift-required"), "deadlyAssault.periodsBossesBuffs: DA row must keep runtime cutover blocked until drift audit")
}

function validateCoveredSourceRefs(registry) {
  const sourceIds = new Set(registry.sources.map(source => source.sourceId))
  const files = [
    "data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json",
    "data/cleaned/audit/source-migration-field-diff.json",
    "data/cleaned/golden/v1-replay-report.json",
  ]

  for (const relativePath of files) {
    const raw = readFileSync(join(repoRoot, relativePath), "utf8")
    const matches = raw.matchAll(/"sourceId":\s*"([^"]+)"/g)
    for (const match of matches)
      assert(sourceIds.has(match[1]), `${relativePath}: missing source-registry entry for ${match[1]}`)
  }
}

function main() {
  const rootText = readFileSync(rootRegistryPath, "utf8")
  const packageText = readFileSync(packageRegistryPath, "utf8")
  assert(rootText === packageText, "packages/data/source-registry.json must mirror data/source-registry.json byte-for-byte")

  const registry = JSON.parse(rootText)
  const matrix = readJson(matrixPath)

  validateRegistryShape(registry)
  validateMatrixAgainstRegistry(matrix, registry)
  validateCoveredSourceRefs(registry)

  console.log("source registry verification passed")
}

main()

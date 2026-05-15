import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const rootRegistryPath = join(repoRoot, "data/source-registry.json")
const packageRegistryPath = join(packageDir, "source-registry.json")
const matrixPath = join(repoRoot, "data/cleaned/audit/nanoka-coverage-matrix.json")
const rootReportDir = join(repoRoot, "data/cleaned/audit/nanoka-drift-report")
const packageReportDir = join(packageDir, "cleaned/audit/nanoka-drift-report")
const docsReportDir = join(repoRoot, "docs/data-source/drift-reports")

const schemaVersion = "nanoka-drift-report/v0.1"
const defaultSyncId = "phase3-sync-000-foundation"
const defaultGeneratedAt = "2026-05-15T16:20:00+08:00"
const driftStatuses = ["same", "changed", "missing", "new", "semantic-mismatch"]
const entityTypes = ["agent", "bangboo", "enemy", "wEngine", "driveDisc", "deadlyAssault", "metadata", "rules"]
const severities = ["info", "blocking"]
const rulingStatuses = ["not-required", "pending", "accepted", "fixed", "deferred", "owner-required"]
const requiredBaselineIds = ["lo-user-excel", "mihoyo-zzz-critical-assault", "buhflipexplode-zzz-da"]

function parseArgs(argv) {
  const [command = "verify", ...rest] = argv
  const flags = {}

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (token === "--")
      continue
    if (!token.startsWith("--"))
      throw new Error(`Unexpected positional argument: ${token}`)
    const key = token.slice(2)
    const next = rest[index + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
    }
    else {
      flags[key] = next
      index += 1
    }
  }

  return { command, flags }
}

function assert(condition, message) {
  if (!condition)
    throw new Error(message)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function sourceById(registry, sourceId) {
  const source = registry.sources.find(item => item.sourceId === sourceId)
  assert(source !== undefined, `Missing source-registry entry for ${sourceId}`)
  return source
}

function baselineFromRegistry(registry, sourceId) {
  const source = sourceById(registry, sourceId)
  assert(source.redistributionRisk === "archived-audit-baseline", `${sourceId}: drift baselines must be archived audit baselines`)
  return {
    sourceId,
    sourceVersion: source.configuredLiveVersion,
    archived: true,
  }
}

function zeroCounts() {
  return {
    same: 0,
    changed: 0,
    missing: 0,
    new: 0,
    "semantic-mismatch": 0,
  }
}

function reportPaths(syncId) {
  return {
    rootJson: join(rootReportDir, `${syncId}.json`),
    packageJson: join(packageReportDir, `${syncId}.json`),
    markdown: join(docsReportDir, `${syncId}.md`),
  }
}

function buildFoundationReport({ syncId, generatedAt }) {
  const registry = readJson(rootRegistryPath)
  const matrix = readJson(matrixPath)
  const nanoka = sourceById(registry, "nanoka-zzz")

  return {
    schemaVersion,
    syncId,
    generatedAt,
    candidate: {
      sourceId: "nanoka-zzz",
      sourceVersion: nanoka.configuredLiveVersion,
      contentHash: nanoka.contentHash,
    },
    baselines: requiredBaselineIds.map(sourceId => baselineFromRegistry(registry, sourceId)),
    matrixStatus: matrix.status,
    runtimeCutoverReady: false,
    counts: zeroCounts(),
    rows: [],
    unresolvedCount: 0,
    notes: [
      "Phase 3 foundation fixture only: this artifact locks the drift-report contract, mirror, verifier, and package inclusion before full field comparison lands.",
      "Archived Excel, D-17 Mihoyo, and D-12 buhflipexplode sources are audit baselines only; they are not runtime fallback inputs.",
    ],
  }
}

function renderMarkdown(report) {
  const countRows = driftStatuses
    .map(status => `| \`${status}\` | ${report.counts[status]} |`)
    .join("\n")
  const baselines = report.baselines
    .map(baseline => `| \`${baseline.sourceId}\` | \`${baseline.sourceVersion}\` | ${baseline.archived ? "yes" : "no"} |`)
    .join("\n")

  return `# Nanoka Drift Report: ${report.syncId}

Status: Phase 3 drift audit foundation fixture
Generated: ${report.generatedAt}

This report is a schema/verifier fixture. It intentionally contains no field
comparison rows; full G01-G26 comparison begins in the next Phase 3 slice.

## Candidate

| Source | Version | Content Hash |
|---|---|---|
| \`${report.candidate.sourceId}\` | \`${report.candidate.sourceVersion}\` | \`${report.candidate.contentHash}\` |

## Baselines

| Source | Version | Archived |
|---|---|---|
${baselines}

## Counts

| Status | Count |
|---|---:|
${countRows}

Unresolved blocking drift rows: **${report.unresolvedCount}**

Runtime cutover ready: **${report.runtimeCutoverReady}**

## Boundary

- This artifact does not compare production fields yet.
- Archived Excel / D-17 / D-12 sources remain audit baselines, not runtime
  fallback.
- Any future \`changed\`, \`missing\`, \`new\`, or \`semantic-mismatch\` row must
  carry source refs and a ruling before Phase 3 exit.
`
}

function validateSourceRef(ref, label) {
  assert(ref !== null && typeof ref === "object", `${label}: SourceRef is required`)
  for (const key of ["sourceId", "sourceVersion", "sourceAnchor", "dataPath"])
    assert(typeof ref[key] === "string" && ref[key].length > 0, `${label}: ${key} is required`)
}

function validateRows(report) {
  const actualCounts = zeroCounts()
  let unresolvedCount = 0

  assert(Array.isArray(report.rows), "rows must be an array")
  for (const [index, row] of report.rows.entries()) {
    const label = `rows[${index}]`
    assert(entityTypes.includes(row.entityType), `${label}: invalid entityType ${row.entityType}`)
    assert(typeof row.entityId === "string" && row.entityId.length > 0, `${label}: entityId is required`)
    assert(typeof row.fieldId === "string" && row.fieldId.length > 0, `${label}: fieldId is required`)
    assert(typeof row.canonicalPath === "string" && row.canonicalPath.length > 0, `${label}: canonicalPath is required`)
    assert(typeof row.fieldPath === "string" && row.fieldPath.length > 0, `${label}: fieldPath is required`)
    validateSourceRef(row.baselineSourceRef, `${label}.baselineSourceRef`)
    validateSourceRef(row.candidateSourceRef, `${label}.candidateSourceRef`)
    assert(driftStatuses.includes(row.status), `${label}: invalid status ${row.status}`)
    assert(severities.includes(row.severity), `${label}: invalid severity ${row.severity}`)
    assert(rulingStatuses.includes(row.rulingStatus), `${label}: invalid rulingStatus ${row.rulingStatus}`)
    assert(Array.isArray(row.blockedBy), `${label}: blockedBy must be an array`)
    assert(typeof row.notes === "string", `${label}: notes must be a string`)

    actualCounts[row.status] += 1

    if (row.status === "same") {
      assert(row.severity === "info", `${label}: same rows must be informational`)
      assert(row.rulingStatus === "not-required", `${label}: same rows must not require a ruling`)
      assert(row.blockedBy.length === 0, `${label}: same rows must not carry blockers`)
    }
    else {
      assert(row.severity === "blocking", `${label}: non-same drift rows are blocking until ruled`)
      assert(row.rulingStatus !== "not-required", `${label}: non-same rows require explicit ruling queue status`)
      if (row.rulingStatus === "pending" || row.rulingStatus === "owner-required") {
        unresolvedCount += 1
      }
      else {
        assert(typeof row.rulingId === "string" && row.rulingId.length > 0, `${label}: resolved non-same rows require rulingId`)
      }
    }
  }

  assert(JSON.stringify(report.counts) === JSON.stringify(actualCounts), "counts must equal row status totals")
  assert(report.unresolvedCount === unresolvedCount, "unresolvedCount must equal pending/owner-required blocking rows")
}

function validateReportShape(report, { registry, matrix, syncId }) {
  assert(report.schemaVersion === schemaVersion, "Unexpected drift report schemaVersion")
  assert(report.syncId === syncId, "syncId must match requested report")
  assert(typeof report.generatedAt === "string" && report.generatedAt.length > 0, "generatedAt is required")

  const nanoka = sourceById(registry, "nanoka-zzz")
  assert(report.candidate?.sourceId === "nanoka-zzz", "candidate sourceId must be nanoka-zzz")
  assert(report.candidate?.sourceVersion === nanoka.configuredLiveVersion, "candidate sourceVersion must match configured live version")
  assert(report.candidate?.contentHash === nanoka.contentHash, "candidate contentHash must match source registry")
  assert(report.candidate.sourceVersion !== nanoka.latestResearchVersion, "candidate must not use latest research version")
  assert(report.matrixStatus === matrix.status, "matrixStatus must match current nanoka coverage matrix")
  assert(report.runtimeCutoverReady === false, "Phase 3 drift reports must not imply runtime cutover")

  assert(Array.isArray(report.baselines), "baselines must be an array")
  for (const sourceId of requiredBaselineIds) {
    const baseline = report.baselines.find(item => item.sourceId === sourceId)
    const registrySource = sourceById(registry, sourceId)
    assert(baseline !== undefined, `Missing drift baseline ${sourceId}`)
    assert(baseline.sourceVersion === registrySource.configuredLiveVersion, `${sourceId}: baseline sourceVersion drifted`)
    assert(baseline.archived === true, `${sourceId}: baseline must be archived`)
  }

  validateRows(report)
}

function validateReport({ syncId }) {
  const { rootJson, packageJson, markdown } = reportPaths(syncId)
  assert(existsSync(rootJson), `Missing root drift report ${rootJson}`)
  assert(existsSync(packageJson), `Missing package drift report ${packageJson}`)
  assert(readFileSync(rootJson, "utf8") === readFileSync(packageJson, "utf8"), "package drift report must mirror root report byte-for-byte")

  const rootRegistryText = readFileSync(rootRegistryPath, "utf8")
  const packageRegistryText = readFileSync(packageRegistryPath, "utf8")
  assert(rootRegistryText === packageRegistryText, "package source-registry must mirror root source-registry byte-for-byte")

  const report = JSON.parse(readFileSync(rootJson, "utf8"))
  validateReportShape(report, {
    registry: JSON.parse(rootRegistryText),
    matrix: readJson(matrixPath),
    syncId,
  })

  assert(existsSync(markdown), `Missing human drift report ${markdown}`)
  const markdownText = readFileSync(markdown, "utf8")
  assert(markdownText.includes(`# Nanoka Drift Report: ${syncId}`), "human report must include sync heading")
  assert(markdownText.includes("Archived Excel / D-17 / D-12 sources remain audit baselines"), "human report must document no runtime fallback boundary")
}

function validateReportFixture({ reportPath, syncId }) {
  assert(typeof reportPath === "string" && reportPath.length > 0, "verify-fixture requires --report <path>")
  const rootRegistryText = readFileSync(rootRegistryPath, "utf8")
  const report = readJson(reportPath)
  validateReportShape(report, {
    registry: JSON.parse(rootRegistryText),
    matrix: readJson(matrixPath),
    syncId,
  })
}

function audit({ syncId, generatedAt }) {
  const report = buildFoundationReport({ syncId, generatedAt })
  const { rootJson, packageJson, markdown } = reportPaths(syncId)
  writeJson(rootJson, report)
  writeJson(packageJson, report)
  writeText(markdown, renderMarkdown(report))
  validateReport({ syncId })
  console.log(`source migration drift audit wrote ${syncId}`)
}

function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))
  const syncId = String(flags["sync-id"] ?? defaultSyncId)
  const generatedAt = String(flags["generated-at"] ?? defaultGeneratedAt)

  if (command === "audit") {
    audit({ syncId, generatedAt })
    return
  }

  if (command === "verify") {
    validateReport({ syncId })
    console.log(`source migration drift verification passed for ${syncId}`)
    return
  }

  if (command === "verify-fixture") {
    validateReportFixture({ reportPath: flags.report, syncId })
    console.log(`source migration drift fixture verification passed for ${syncId}`)
    return
  }

  throw new Error(`Unsupported source migration drift command: ${command}`)
}

main()

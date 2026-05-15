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
const goldenReplayReportPath = join(repoRoot, "data/cleaned/golden/v1-replay-report.json")

const schemaVersion = "nanoka-drift-report/v0.1"
const defaultSyncId = "phase3-sync-000-foundation"
const firstSyncId = "phase3-sync-001-g01-g26"
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

function countsForRows(rows) {
  const counts = zeroCounts()
  for (const row of rows)
    counts[row.status] += 1
  return counts
}

function reportPaths(syncId) {
  return {
    rootJson: join(rootReportDir, `${syncId}.json`),
    packageJson: join(packageReportDir, `${syncId}.json`),
    markdown: join(docsReportDir, `${syncId}.md`),
  }
}

function reportHeader({ syncId, generatedAt }) {
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
  }
}

function buildFoundationReport({ syncId, generatedAt }) {
  return {
    ...reportHeader({ syncId, generatedAt }),
    counts: zeroCounts(),
    rows: [],
    unresolvedCount: 0,
    notes: [
      "Phase 3 foundation fixture only: this artifact locks the drift-report contract, mirror, verifier, and package inclusion before full field comparison lands.",
      "Archived Excel, D-17 Mihoyo, and D-12 buhflipexplode sources are audit baselines only; they are not runtime fallback inputs.",
    ],
  }
}

const anchorCandidateSpecs = {
  G01: {
    entityType: "enemy",
    fieldIds: ["deadlyAssault.periodsBossesBuffs", "enemies.levelDefaults", "enemies.variantMapping"],
    requiredSampleEntities: ["nanoka-boss-live-69036"],
    expectedCandidate: "DA boss context plus enemy defense defaults for the sourced boss replay.",
  },
  G02: {
    entityType: "enemy",
    fieldIds: ["deadlyAssault.periodsBossesBuffs", "enemies.levelDefaults", "enemies.variantMapping"],
    requiredSampleEntities: ["nanoka-boss-live-69036"],
    expectedCandidate: "DA boss context plus corrupted-shield defense-state coverage.",
  },
  G03: {
    entityType: "agent",
    fieldIds: ["agents.basePanel"],
    requiredSampleEntities: ["nanoka-character-nekomata-live-1021"],
    expectedCandidate: "Agent panel fields needed by crit expected-value replay.",
  },
  G04: {
    entityType: "rules",
    fieldIds: ["rules.baseDamageFormula", "rules.rounding"],
    expectedCandidate: "Implementation-owned penetration and damage formula constants.",
  },
  G05: {
    entityType: "agent",
    fieldIds: ["agents.ruptureStats", "rules.baseDamageFormula", "deadlyAssault.periodsBossesBuffs"],
    requiredSampleEntities: ["nanoka-character-yixuan-1371", "nanoka-boss-live-69036"],
    expectedCandidate: "Rupture/sheer semantics and DA boss context for defense-skip replay.",
  },
  G06: {
    entityType: "agent",
    fieldIds: ["agents.ruptureStats", "rules.baseDamageFormula", "deadlyAssault.periodsBossesBuffs"],
    requiredSampleEntities: ["nanoka-character-yixuan-1371", "nanoka-boss-live-69036"],
    expectedCandidate: "Rupture/sheer semantics and DA boss context for sheer-vs-default ratio replay.",
  },
  G07: {
    entityType: "rules",
    fieldIds: ["rules.rounding"],
    expectedCandidate: "Implementation-owned rounding contract for per-segment ceil behavior.",
  },
  G08: {
    entityType: "agent",
    fieldIds: ["agents.basePanel", "rules.rounding"],
    requiredSampleEntities: ["nanoka-character-nekomata-live-1021"],
    expectedCandidate: "Agent anomaly panel fields plus rounding behavior for buildup replay.",
  },
  G09: {
    entityType: "deadlyAssault",
    fieldIds: ["deadlyAssault.periodsBossesBuffs", "enemies.levelDefaults"],
    requiredSampleEntities: ["nanoka-boss-live-69036"],
    expectedCandidate: "DA boss max-daze and enemy-level context for daze-cap replay.",
  },
  G10: {
    entityType: "agent",
    fieldIds: ["rules.attributeMapping", "enemies.resistance"],
    requiredSampleEntities: ["nanoka-character-yixuan-1371", "nanoka-monster-dullahan-live-30000"],
    expectedCandidate: "Attribute alias mapping and enemy resistance source coverage.",
  },
  G11: {
    entityType: "agent",
    fieldIds: ["rules.attributeMapping", "agents.combatPanelStats"],
    requiredSampleEntities: ["nanoka-character-yixuan-1371"],
    expectedCandidate: "Attribute alias mapping and combat-panel damage-bonus source coverage.",
  },
  G12: {
    entityType: "enemy",
    fieldIds: ["rules.anomalyThresholdRankTriggerTable", "enemies.anomalyThresholds"],
    requiredSampleEntities: ["nanoka-monster-dullahan-live-30000"],
    expectedCandidate: "Enemy anomaly threshold source coverage and trigger-rank rule mapping.",
  },
  G13: {
    entityType: "enemy",
    fieldIds: ["rules.anomalyThresholdRankTriggerTable", "enemies.anomalyThresholds", "enemies.variantMapping"],
    requiredSampleEntities: ["nanoka-monster-dullahan-live-30000", "nanoka-monster-notorious-pompey-live-300211"],
    expectedCandidate: "Enemy anomaly threshold modifiers plus monster_info variant mapping.",
  },
  G14: {
    entityType: "agent",
    fieldIds: ["metadata.sourceRefs", "rules.baseDamageFormula"],
    expectedCandidate: "SourceRef emission plus implementation-owned virtual-contribution behavior.",
  },
  G15: {
    entityType: "rules",
    fieldIds: ["rules.disorderFormula"],
    expectedCandidate: "Implementation-owned Disorder formula boundary with failed nanoka evidence.",
  },
  G16: {
    entityType: "rules",
    fieldIds: ["rules.disorderDazeLevelZone"],
    expectedCandidate: "Implementation-owned Disorder daze-level zone boundary with failed nanoka evidence.",
  },
  G17: {
    entityType: "deadlyAssault",
    fieldIds: ["deadlyAssault.periodsBossesBuffs", "enemies.levelDefaults"],
    requiredSampleEntities: ["nanoka-boss-live-69036"],
    expectedCandidate: "DA boss max HP and enemy context for corrupted-shield cleanse replay.",
  },
  G18: {
    entityType: "enemy",
    fieldIds: ["enemies.variantMapping", "enemies.levelDefaults", "enemies.specialRules"],
    requiredSampleEntities: ["nanoka-monster-greta-live-30004"],
    expectedCandidate: "Greta monster_info variant, level defaults, and part-break special-rule coverage.",
  },
  G19: {
    entityType: "enemy",
    fieldIds: ["enemies.variantMapping", "enemies.dazeRecovery"],
    requiredSampleEntities: ["nanoka-monster-ruthless-fiend-live-200141"],
    expectedCandidate: "Ruthless Fiend variant identity plus daze-recovery semantic coverage.",
  },
  G20: {
    entityType: "enemy",
    fieldIds: ["enemies.variantMapping", "enemies.dazeRecovery"],
    requiredSampleEntities: ["nanoka-monster-notorious-hati-live-200014", "nanoka-monster-notorious-armored-hati-live-200034"],
    expectedCandidate: "Hati/Armored Hati variant identity plus daze-recovery semantic coverage.",
  },
  G21: {
    entityType: "agent",
    fieldIds: ["agents.ruptureStats", "agents.basePanel"],
    requiredSampleEntities: ["nanoka-character-yixuan-1371"],
    expectedCandidate: "Yixuan panel and rupture/sheer source coverage.",
  },
  G22: {
    entityType: "agent",
    fieldIds: ["agents.passiveModifiers"],
    requiredSampleEntities: ["nanoka-character-nicole-live-1031"],
    expectedCandidate: "Nicole passive modifier source coverage.",
  },
  G23: {
    entityType: "agent",
    fieldIds: ["agents.passiveModifiers", "rules.disorderFormula"],
    requiredSampleEntities: ["nanoka-character-yanagi-live-1221"],
    expectedCandidate: "Yanagi passive/disorder source coverage.",
  },
  G24: {
    entityType: "bangboo",
    fieldIds: ["bangboos.basePanel", "bangboos.skillSegments"],
    requiredSampleEntities: ["nanoka-bangboo-penguinboo-live-53001"],
    expectedCandidate: "Penguinboo panel and skill numeric coverage.",
  },
  G25: {
    entityType: "bangboo",
    fieldIds: ["bangboos.basePanel", "bangboos.skillSegments"],
    requiredSampleEntities: ["nanoka-bangboo-sharkboo-live-54001"],
    expectedCandidate: "Sharkboo panel and skill numeric coverage.",
  },
  G26: {
    entityType: "bangboo",
    fieldIds: ["bangboos.basePanel", "bangboos.skillSegments", "bangboos.element"],
    requiredSampleEntities: ["nanoka-bangboo-plugboo-live-54008"],
    expectedCandidate: "Plugboo panel, skill numeric, and element source coverage.",
  },
}

function sourceRefWithDataPath(ref, anchorId, index) {
  assert(ref !== undefined, `${anchorId}: baseline sourceRef is required`)
  return {
    sourceId: ref.sourceId,
    sourceVersion: ref.sourceVersion,
    sourceAnchor: ref.sourceAnchor,
    dataPath: ref.dataPath ?? `/anchors/${anchorId}/sourceRefs/${index}`,
  }
}

function unique(values) {
  return [...new Set(values.filter(value => value !== null && value !== undefined && value !== ""))]
}

function matrixRowsByFieldId(matrix) {
  const rows = new Map()
  for (const [index, row] of matrix.rows.entries())
    rows.set(row.fieldId, { ...row, matrixRowIndex: index })
  return rows
}

function rowBlockers(row) {
  return Array.isArray(row.blockedBy) ? row.blockedBy : []
}

function rowSamples(row) {
  return unique([
    row.sampleEntity,
    ...(Array.isArray(row.supportingSampleEntities) ? row.supportingSampleEntities : []),
  ])
}

function rawAnchorForSample(sampleEntity, sourceVersion) {
  if (sampleEntity === "nanoka-manifest")
    return `data/source/raw/nanoka/zzz/${sourceVersion}/manifest.json`

  const idMatch = sampleEntity.match(/-(\d+)$/)
  if (idMatch === null)
    return null

  const id = idMatch[1]
  let kind = null
  if (sampleEntity.includes("character"))
    kind = "character"
  else if (sampleEntity.includes("bangboo"))
    kind = "bangboo"
  else if (sampleEntity.includes("monster"))
    kind = "monster"
  else if (sampleEntity.includes("boss"))
    kind = "boss"
  else if (sampleEntity.includes("equipment"))
    kind = "equipment"
  else if (sampleEntity.includes("weapon"))
    kind = "weapon"

  if (kind === null)
    return null

  const sourceAnchor = `data/source/raw/nanoka/zzz/${sourceVersion}/zh/${kind}/${id}.json`
  return existsSync(join(repoRoot, sourceAnchor)) ? sourceAnchor : null
}

function dataPathForSample(sampleEntity) {
  if (sampleEntity === "nanoka-manifest")
    return "/zzz/live"
  if (sampleEntity.includes("character"))
    return "/stats"
  if (sampleEntity.includes("bangboo"))
    return "/stats"
  if (sampleEntity.includes("monster"))
    return "/monster_info"
  if (sampleEntity.includes("boss"))
    return "/boss_adjust"
  if (sampleEntity.includes("equipment"))
    return "/desc2"
  if (sampleEntity.includes("weapon"))
    return "/stats"
  return "/"
}

function coverageMatrixSourceRef({ sourceVersion, matrixRow }) {
  return {
    sourceId: "nanoka-zzz",
    sourceVersion,
    sourceAnchor: "data/cleaned/audit/nanoka-coverage-matrix.json",
    dataPath: `/rows/${matrixRow?.matrixRowIndex ?? "unmapped"}`,
  }
}

function sourceRefForMatrixRow({ sourceVersion, matrixRow }) {
  const sampleEntity = rowSamples(matrixRow)[0]
  if (sampleEntity !== undefined) {
    const sourceAnchor = rawAnchorForSample(sampleEntity, sourceVersion)
    if (sourceAnchor !== null) {
      return {
        sourceId: "nanoka-zzz",
        sourceVersion,
        sourceAnchor,
        dataPath: dataPathForSample(sampleEntity),
      }
    }
  }

  if (typeof matrixRow.auditArtifact === "string" && matrixRow.auditArtifact.length > 0) {
    return {
      sourceId: "nanoka-zzz",
      sourceVersion,
      sourceAnchor: matrixRow.auditArtifact,
      dataPath: "/summary",
    }
  }

  return coverageMatrixSourceRef({ sourceVersion, matrixRow })
}

function rowSummary(row) {
  return {
    fieldId: row.fieldId,
    status: row.status,
    sourcePolicy: row.sourcePolicy,
    fieldClass: row.fieldClass,
    promotable: row.promotable === true,
    rawAvailable: row.rawAvailable === true,
    sampleEntities: rowSamples(row),
    auditArtifact: row.auditArtifact ?? null,
    blockedBy: rowBlockers(row),
  }
}

function candidateSourceRefForAnchor({ sourceVersion, matrixRows, requiredSampleEntities, missingRequiredSampleEntities }) {
  if (missingRequiredSampleEntities.length > 0)
    return coverageMatrixSourceRef({ sourceVersion, matrixRow: matrixRows[0]?.row })

  for (const sampleEntity of requiredSampleEntities) {
    const sourceAnchor = rawAnchorForSample(sampleEntity, sourceVersion)
    if (sourceAnchor !== null) {
      return {
        sourceId: "nanoka-zzz",
        sourceVersion,
        sourceAnchor,
        dataPath: dataPathForSample(sampleEntity),
      }
    }
  }

  const sourceBackedRow = matrixRows.find(({ row }) => rowSamples(row).some(sample => rawAnchorForSample(sample, sourceVersion) !== null))
  if (sourceBackedRow !== undefined)
    return sourceRefForMatrixRow({ sourceVersion, matrixRow: sourceBackedRow.row })

  const auditRow = matrixRows.find(({ row }) => typeof row.auditArtifact === "string" && row.auditArtifact.length > 0)
  if (auditRow !== undefined)
    return sourceRefForMatrixRow({ sourceVersion, matrixRow: auditRow.row })

  return coverageMatrixSourceRef({ sourceVersion, matrixRow: matrixRows[0]?.row })
}

function buildG01G26Report({ syncId, generatedAt }) {
  const header = reportHeader({ syncId, generatedAt })
  const matrix = readJson(matrixPath)
  const rowsByFieldId = matrixRowsByFieldId(matrix)
  const replay = readJson(goldenReplayReportPath)
  const anchorIds = Array.from({ length: 26 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`)

  assert(JSON.stringify(replay.v1AnchorIds) === JSON.stringify(anchorIds), "G01-G26 replay anchor set must stay complete and ordered")
  assert(replay.summary?.passed === 26, "G01-G26 replay report must have 26 passed anchors")
  assert(replay.summary?.releaseReady === true, "G01-G26 replay report must remain releaseReady")

  const rows = anchorIds.map((anchorId) => {
    const anchor = replay.anchors.find(item => item.id === anchorId)
    const spec = anchorCandidateSpecs[anchorId]
    assert(anchor !== undefined, `${anchorId}: replay anchor is missing`)
    assert(anchor.status === "passed", `${anchorId}: replay anchor must be passed before drift sync`)
    assert(spec !== undefined, `${anchorId}: candidate drift spec is missing`)

    const matrixRows = spec.fieldIds.map((fieldId) => {
      const row = rowsByFieldId.get(fieldId)
      assert(row !== undefined, `${anchorId}: missing matrix row for ${fieldId}`)
      return { fieldId, row }
    })
    const availableSampleEntities = unique(matrixRows.flatMap(({ row }) => rowSamples(row)))
    const requiredSampleEntities = spec.requiredSampleEntities ?? []
    const missingRequiredSampleEntities = requiredSampleEntities.filter(sample => !availableSampleEntities.includes(sample))
    const status = missingRequiredSampleEntities.length > 0 ? "missing" : "semantic-mismatch"
    const blockedBy = unique([
      "phase3:ruling-required",
      status === "missing" ? "phase3:candidate-source-missing" : "phase3:semantic-equivalence-ruling-required",
      ...matrixRows.flatMap(({ row }) => rowBlockers(row)),
    ])

    return {
      entityType: spec.entityType,
      entityId: anchorId,
      fieldId: `goldenAnchors.${anchorId}.nanokaCandidateCoverage`,
      canonicalPath: `data.cleaned.golden.v1Replay.anchors.${anchorId}.nanokaCandidateCoverage`,
      fieldPath: `/anchors/${anchorId}/nanokaCandidateCoverage`,
      baselineSourceRef: sourceRefWithDataPath(anchor.sourceRefs[0], anchorId, 0),
      candidateSourceRef: candidateSourceRefForAnchor({
        sourceVersion: header.candidate.sourceVersion,
        matrixRows,
        requiredSampleEntities,
        missingRequiredSampleEntities,
      }),
      baselineValue: {
        replayStatus: anchor.status,
        sourceRefs: anchor.sourceRefs.map((ref, index) => sourceRefWithDataPath(ref, anchorId, index)),
        notes: anchor.notes ?? [],
      },
      candidateValue: {
        coverageStatus: status === "missing" ? "missing-required-sample" : "candidate-covered-not-yet-ruled-equivalent",
        expectedCandidate: spec.expectedCandidate,
        fieldIds: spec.fieldIds,
        matrixRows: matrixRows.map(({ row }) => rowSummary(row)),
        requiredSampleEntities,
        availableSampleEntities,
        missingRequiredSampleEntities,
      },
      status,
      severity: "blocking",
      rulingStatus: "pending",
      blockedBy,
      notes: status === "missing"
        ? `First sync is missing required approved-live nanoka candidate sample(s): ${missingRequiredSampleEntities.join(", ")}.`
        : "First sync has nanoka candidate coverage, but Phase 3 has not ruled semantic equivalence against the archived golden replay baseline.",
    }
  })

  return {
    ...header,
    counts: countsForRows(rows),
    rows,
    unresolvedCount: rows.length,
    notes: [
      "Phase 3 first sync compares G01-G26 archived golden replay baselines against real nanoka candidate coverage/status/source paths.",
      "This sync intentionally exposes unresolved missing/semantic drift rows; it does not count as an exit-clean sync until Product/TL rulings clear the queue.",
      "Archived Excel, D-17 Mihoyo, and D-12 buhflipexplode sources are audit baselines only; they are not runtime fallback inputs.",
    ],
  }
}

function buildReport({ syncId, generatedAt }) {
  if (syncId === defaultSyncId)
    return buildFoundationReport({ syncId, generatedAt })
  if (syncId === firstSyncId)
    return buildG01G26Report({ syncId, generatedAt })
  throw new Error(`Unsupported source migration drift syncId: ${syncId}`)
}

function renderMarkdown(report) {
  const countRows = driftStatuses
    .map(status => `| \`${status}\` | ${report.counts[status]} |`)
    .join("\n")
  const baselines = report.baselines
    .map(baseline => `| \`${baseline.sourceId}\` | \`${baseline.sourceVersion}\` | ${baseline.archived ? "yes" : "no"} |`)
    .join("\n")
  const hasRows = report.rows.length > 0
  const statusLine = hasRows ? "Phase 3 drift audit first G01-G26 sync" : "Phase 3 drift audit foundation fixture"
  const intro = hasRows
    ? "This report compares archived G01-G26 replay baselines against nanoka candidate coverage/status/source paths. Full runtime cutover remains disabled."
    : `This report is a schema/verifier fixture. It intentionally contains no field
comparison rows; full G01-G26 comparison begins in the next Phase 3 slice.`
  const driftRows = hasRows
    ? report.rows
        .map(row => `| \`${row.entityId}\` | \`${row.fieldId}\` | \`${row.status}\` | \`${row.rulingStatus}\` | ${row.notes} |`)
        .join("\n")
    : ""

  return `# Nanoka Drift Report: ${report.syncId}

Status: ${statusLine}
Generated: ${report.generatedAt}

${intro}

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

${hasRows
  ? `## Drift Rows

| Entity | Field | Status | Ruling | Notes |
|---|---|---|---|---|
${driftRows}
`
  : ""}

## Boundary

- ${hasRows ? "This sync does not promote nanoka to runtime cleaned data." : "This artifact does not compare production fields yet."}
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
    assert(Object.hasOwn(row, "baselineValue"), `${label}: baselineValue is required`)
    assert(Object.hasOwn(row, "candidateValue"), `${label}: candidateValue is required`)
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
      assert(JSON.stringify(row.baselineValue) === JSON.stringify(row.candidateValue), `${label}: same rows must have equal normalized values`)
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
  const report = buildReport({ syncId, generatedAt })
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

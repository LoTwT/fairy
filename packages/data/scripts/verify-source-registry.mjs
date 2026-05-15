import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const rootRegistryPath = join(repoRoot, "data/source-registry.json")
const packageRegistryPath = join(packageDir, "source-registry.json")
const matrixPath = join(repoRoot, "data/cleaned/audit/nanoka-coverage-matrix.json")
const rootSnapshotDiffHistoryPath = join(repoRoot, "data/cleaned/audit/nanoka-snapshot-diff-history.json")
const packageSnapshotDiffHistoryPath = join(packageDir, "cleaned/audit/nanoka-snapshot-diff-history.json")
const rootDriveDiscSlotStatAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json")
const packageDriveDiscSlotStatAuditPath = join(packageDir, "cleaned/audit/nanoka-drive-disc-slot-stat-audit.json")
const rootDisorderFormulaAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-disorder-formula-audit.json")
const packageDisorderFormulaAuditPath = join(packageDir, "cleaned/audit/nanoka-disorder-formula-audit.json")
const rootDisorderDazeLevelAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-disorder-daze-level-audit.json")
const packageDisorderDazeLevelAuditPath = join(packageDir, "cleaned/audit/nanoka-disorder-daze-level-audit.json")
const rootRuntimeGameDataPath = join(repoRoot, "data/cleaned/runtime/game-data.json")
const packageRuntimeGameDataPath = join(packageDir, "cleaned/runtime/game-data.json")
const rootCharacterBatchAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-character-batch-audit.json")
const packageCharacterBatchAuditPath = join(packageDir, "cleaned/audit/nanoka-character-batch-audit.json")
const rootBangbooBatchAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-bangboo-batch-audit.json")
const packageBangbooBatchAuditPath = join(packageDir, "cleaned/audit/nanoka-bangboo-batch-audit.json")
const rootWEngineBatchAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-wengine-batch-audit.json")
const packageWEngineBatchAuditPath = join(packageDir, "cleaned/audit/nanoka-wengine-batch-audit.json")
const rootDriveDiscBatchAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-drive-disc-batch-audit.json")
const packageDriveDiscBatchAuditPath = join(packageDir, "cleaned/audit/nanoka-drive-disc-batch-audit.json")
const rootEnemyBatchAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-enemy-batch-audit.json")
const packageEnemyBatchAuditPath = join(packageDir, "cleaned/audit/nanoka-enemy-batch-audit.json")

const archivedRuntimeSourceIds = new Set([
  "lo-user-excel",
  "mihoyo-zzz-critical-assault",
  "buhflipexplode-zzz-da",
  "nanoka-zzz-boss-manual-2026-05-07",
])

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

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function readMirroredText(rootPath, packagePath, label) {
  let lastError

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const rootText = readFileSync(rootPath, "utf8")
      const packageText = readFileSync(packagePath, "utf8")
      if (rootText === packageText)
        return { rootText, packageText }

      lastError = new Error(`${label} contents differ`)
    }
    catch (error) {
      lastError = error
    }

    sleep(25)
  }

  throw new Error(`${label} must mirror data artifact byte-for-byte${lastError instanceof Error ? `: ${lastError.message}` : ""}`)
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
  assert(source.runtimeRole === "runtime-primary", "nanoka runtimeRole must be runtime-primary after Phase 4 cutover")
  assert(source.liveVersionRef === "manifest.zzz.live", "nanoka liveVersionRef must be manifest.zzz.live")
  assert(source.server === "live", "nanoka server must be live")
  assert(source.releaseChannel === "stable", "nanoka releaseChannel must be stable")
  assert(source.approvedLiveVersions.includes(source.configuredLiveVersion), "nanoka approvedLiveVersions must include configuredLiveVersion")
  assert(source.approvedLiveVersionsScope?.includes("runtime-primary"), "nanoka approvedLiveVersionsScope must include runtime-primary after Phase 4 cutover")
  assert(source.approvedLiveVersionsScope?.includes("snapshot-diff"), "nanoka approvedLiveVersionsScope must preserve snapshot-diff/archive usage")

  const manifestPattern = compile(source.urlAllowlist?.manifestUrl, "nanoka manifestUrl allowlist")
  const indexPattern = compile(source.urlAllowlist?.versionedIndexUrls, "nanoka versionedIndexUrls allowlist")
  const detailPattern = compile(source.urlAllowlist?.localizedDetailUrls, "nanoka localizedDetailUrls allowlist")

  assert(manifestPattern.test("https://static.nanoka.cc/manifest.json"), "nanoka allowlist must accept manifest.json")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/boss.json`), "nanoka allowlist must accept versioned boss index")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/character.json`), "nanoka allowlist must accept versioned character index")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/bangboo.json`), "nanoka allowlist must accept versioned Bangboo index")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/weapon.json`), "nanoka allowlist must accept versioned W-Engine index")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/equipment.json`), "nanoka allowlist must accept versioned Drive Disc index")
  assert(indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/monster.json`), "nanoka allowlist must accept versioned monster index")
  for (const forbiddenIndex of ["beta", "preview", "leak", "datamine"]) {
    assert(
      !indexPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/${forbiddenIndex}.json`),
      `nanoka index allowlist must reject ${forbiddenIndex}.json`,
    )
  }
  assert(detailPattern.test(`https://static.nanoka.cc/zzz/${source.configuredLiveVersion}/zh/character/1021.json`), "nanoka allowlist must accept localized character detail")
  assert(!detailPattern.test("https://static.nanoka.cc/zzz/beta/zh/character/1021.json"), "nanoka detail allowlist must reject beta routes")
}

function validateArchivedRuntimeRegistry(registry) {
  for (const sourceId of archivedRuntimeSourceIds) {
    const source = sourceById(registry, sourceId)
    assert(source.scope === "archived-audit-baseline" || source.scope === "historical-conflict-resolution", `${sourceId}: archived runtime source scope drifted`)
    assert(source.runtimeRole === "deprecated-runtime-archive", `${sourceId}: runtimeRole must be deprecated-runtime-archive`)
    assert(source.releaseChannel === "archived", `${sourceId}: deprecated runtime source must stay archived`)
    assert(
      source.notes?.some(note => /not (be )?referenced by runtime|must not reference|must not enter MIT runtime code|not part of the new nanoka adapter/i.test(note)),
      `${sourceId}: notes must document no runtime use after Phase 4 cutover`,
    )
  }
}

function validateMatrixAgainstRegistry(matrix, registry) {
  const nanoka = sourceById(registry, "nanoka-zzz")
  validateNanokaRegistry(nanoka)

  assert(matrix.status === "phase-4-runtime-cutover-gate", "matrix status must match the Phase 4 runtime cutover gate")
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
    assert(!row.blockedBy?.includes("field:variant-mapping-required"), `${row.fieldId}: enemy variant mapping blocker must be resolved or replaced with the remaining precise blocker`)

    if (row.promotable !== true)
      continue

    const sample = sampleById.get(row.sampleEntity)
    assert(sample !== undefined, `${row.fieldId}: promotable row sampleEntity is missing from sampleSources`)
    assert(sample.approvedForCleanedOutput === true, `${row.fieldId}: promotable row must use approved live sample evidence`)
    if (sample.entityType !== "sourceManifest")
      assert(sample.version === nanoka.configuredLiveVersion, `${row.fieldId}: promotable row must use configuredLiveVersion sample evidence`)
  }

  const resourceRows = new Map((matrix.rows ?? []).map(row => [row.fieldId, row]))
  const metadataSourcesRow = resourceRows.get("metadata.sources")
  assert(metadataSourcesRow !== undefined, "metadata.sources: missing source registry metadata row")
  assert(metadataSourcesRow.status === "verified-from-nanoka", "metadata.sources: source registry row must be verified after executable source-registry gate")
  assert(metadataSourcesRow.promotable === true, "metadata.sources: source registry metadata must be promotable after contract gate")
  assert(metadataSourcesRow.sampleEntity === "nanoka-manifest", "metadata.sources: row must use nanoka manifest evidence")
  assert(metadataSourcesRow.sourcePolicy === "derived-from-source-registry", "metadata.sources: row must derive from source registry")
  assert((metadataSourcesRow.blockedBy ?? []).length === 0, "metadata.sources: resolved source registry blockers must be removed")
  for (const rawPath of ["/zzz/live", "/zzz/latest", "/zzz/available"]) {
    assert(metadataSourcesRow.rawFieldPaths?.includes(rawPath), `metadata.sources: missing raw path ${rawPath}`)
  }

  const metadataSourceRefsRow = resourceRows.get("metadata.sourceRefs")
  assert(metadataSourceRefsRow !== undefined, "metadata.sourceRefs: missing SourceRef metadata row")
  assert(metadataSourceRefsRow.status === "verified-from-nanoka", "metadata.sourceRefs: SourceRef row must be verified after adapter emission gate")
  assert(metadataSourceRefsRow.promotable === true, "metadata.sourceRefs: SourceRef metadata must be promotable after emission gate")
  assert(metadataSourceRefsRow.sampleEntity === "nanoka-bangboo-plugboo-live-54008", "metadata.sourceRefs: row must use approved live Plugboo metadata evidence")
  assert(metadataSourceRefsRow.sourcePolicy === "derived-from-source-registry", "metadata.sourceRefs: row must derive from source registry")
  assert((metadataSourceRefsRow.blockedBy ?? []).length === 0, "metadata.sourceRefs: resolved SourceRef blockers must be removed")
  for (const rawPath of ["/assets/*/url", "/assets/*/localPath", "/assets/*/sourceVersion"]) {
    assert(metadataSourceRefsRow.rawFieldPaths?.includes(rawPath), `metadata.sourceRefs: missing raw path ${rawPath}`)
  }

  const bangbooElementRow = resourceRows.get("bangboos.element")
  assert(bangbooElementRow !== undefined, "bangboos.element: missing Bangboo element row")
  assert(bangbooElementRow.status === "verified-from-nanoka", "bangboos.element: row must be verified after live skill damage text mapping")
  assert(bangbooElementRow.promotable === true, "bangboos.element: structured source artifact must be promotable after live mapping gate")
  assert(bangbooElementRow.sampleEntity === "nanoka-bangboo-plugboo-live-54008", "bangboos.element: row must use live Plugboo sample evidence")
  assert((bangbooElementRow.blockedBy ?? []).length === 0, "bangboos.element: resolved element blockers must be removed")
  assert(bangbooElementRow.transformRule?.includes("colored damage phrase"), "bangboos.element: transform must bind to explicit colored damage text")
  assert(bangbooElementRow.transformRule?.includes("source /id to match the requested Bangboo id"), "bangboos.element: transform must bind source /id to requested Bangboo id")
  for (const rawPath of ["/id", "/skill/*/level/*/desc"]) {
    assert(bangbooElementRow.rawFieldPaths?.includes(rawPath), `bangboos.element: missing raw path ${rawPath}`)
  }

  const passiveModifierRow = resourceRows.get("agents.passiveModifiers")
  assert(passiveModifierRow !== undefined, "agents.passiveModifiers: missing passive modifier row")
  assert(passiveModifierRow.status === "verified-from-nanoka", "agents.passiveModifiers: row must stay verified after passive candidate fetch")
  assert(passiveModifierRow.promotable === false, "agents.passiveModifiers: row must not become promotable before typed modifier template")
  assert(passiveModifierRow.blockedBy?.includes("typed-modifier-template-required"), "agents.passiveModifiers: typed modifier blocker must remain until ruling/template work")
  for (const sampleId of [
    "nanoka-character-nicole-live-1031",
    "nanoka-character-yanagi-live-1221",
  ]) {
    const sample = sampleById.get(sampleId)
    assert(sample !== undefined, `agents.passiveModifiers: missing Phase 3 live sample ${sampleId}`)
    assert(sample.approvedForCleanedOutput === true, `${sampleId}: passive supporting sample must be approved live evidence`)
    assert(sample.version === nanoka.configuredLiveVersion, `${sampleId}: passive supporting sample must use configuredLiveVersion`)
    assert(passiveModifierRow.supportingSampleEntities?.includes(sampleId), `agents.passiveModifiers: supporting samples must include ${sampleId}`)
  }

  for (const fieldId of ["bangboos.basePanel", "bangboos.skillSegments"]) {
    const row = resourceRows.get(fieldId)
    assert(row !== undefined, `${fieldId}: missing Bangboo candidate row`)
    assert(row.status === "verified-from-nanoka", `${fieldId}: row must stay verified after Phase 3 candidate fetch`)
    for (const sampleId of [
      "nanoka-bangboo-penguinboo-live-53001",
      "nanoka-bangboo-sharkboo-live-54001",
    ]) {
      const sample = sampleById.get(sampleId)
      assert(sample !== undefined, `${fieldId}: missing Phase 3 live sample ${sampleId}`)
      assert(sample.approvedForCleanedOutput === true, `${sampleId}: Bangboo supporting sample must be approved live evidence`)
      assert(sample.version === nanoka.configuredLiveVersion, `${sampleId}: Bangboo supporting sample must use configuredLiveVersion`)
      assert(row.supportingSampleEntities?.includes(sampleId), `${fieldId}: supporting samples must include ${sampleId}`)
    }
  }

  const bangbooIndexSample = sampleById.get("nanoka-bangboo-index-live-2.8")
  assert(bangbooIndexSample !== undefined, "Bangboo batch: missing approved-live bangboo index sample")
  assert(bangbooIndexSample.approvedForCleanedOutput === true, "Bangboo batch index must be approved live evidence")
  assert(bangbooIndexSample.version === nanoka.configuredLiveVersion, "Bangboo batch index must use configuredLiveVersion")
  const liveBangbooSamples = [...sampleById.values()].filter(sample => sample.entityType === "bangboo" && sample.version === nanoka.configuredLiveVersion)
  assert(liveBangbooSamples.length === 39, `Bangboo batch must retain 39 approved-live detail samples, got ${liveBangbooSamples.length}`)
  for (const fieldId of ["bangboos.identity", "bangboos.basePanel", "bangboos.skillSegments"]) {
    const row = resourceRows.get(fieldId)
    assert(row?.sampleEntity === "nanoka-bangboo-index-live-2.8", `${fieldId}: V1.2.1 batch row must use the approved-live index sample`)
    assert(row?.auditArtifact === "data/cleaned/audit/nanoka-bangboo-batch-audit.json", `${fieldId}: V1.2.1 batch row must point to the batch audit`)
    assert((row?.supportingSampleEntities ?? []).length === 39, `${fieldId}: V1.2.1 batch row must support all 39 Bangboos`)
  }
  assert((bangbooElementRow.supportingSampleEntities ?? []).length === 39, "bangboos.element: V1.2.1 audit must cover all retained Bangboos")
  assert(bangbooElementRow.auditArtifact === "data/cleaned/audit/nanoka-bangboo-batch-audit.json", "bangboos.element: V1.2.1 row must point to the batch audit")

  const characterIndexSample = sampleById.get("nanoka-character-index-live-2.8")
  assert(characterIndexSample !== undefined, "Character batch: missing approved-live character index sample")
  assert(characterIndexSample.approvedForCleanedOutput === true, "Character batch index must be approved live evidence")
  assert(characterIndexSample.version === nanoka.configuredLiveVersion, "Character batch index must use configuredLiveVersion")
  const liveCharacterSamples = [...sampleById.values()].filter(sample => sample.entityType === "agent" && sample.version === nanoka.configuredLiveVersion)
  assert(liveCharacterSamples.length === 53, `Character batch must retain 53 approved-live detail samples, got ${liveCharacterSamples.length}`)
  for (const fieldId of ["agents.identity", "agents.enums", "agents.basePanel"]) {
    const row = resourceRows.get(fieldId)
    assert(row?.sampleEntity === "nanoka-character-index-live-2.8", `${fieldId}: V1.2.x batch row must use the approved-live character index sample`)
    assert(row?.auditArtifact === "data/cleaned/audit/nanoka-character-batch-audit.json", `${fieldId}: V1.2.x batch row must point to the character batch audit`)
    assert((row?.supportingSampleEntities ?? []).length === 53, `${fieldId}: V1.2.x batch row must support all 53 characters`)
  }

  const wEngineIndexSample = sampleById.get("nanoka-weapon-index-live-2.8")
  assert(wEngineIndexSample !== undefined, "W-Engine batch: missing approved-live weapon index sample")
  assert(wEngineIndexSample.approvedForCleanedOutput === true, "W-Engine batch index must be approved live evidence")
  assert(wEngineIndexSample.version === nanoka.configuredLiveVersion, "W-Engine batch index must use configuredLiveVersion")
  const liveWEngineSamples = [...sampleById.values()].filter(sample => sample.entityType === "wEngine" && sample.version === nanoka.configuredLiveVersion)
  assert(liveWEngineSamples.length === 89, `W-Engine batch must retain 89 approved-live detail samples, got ${liveWEngineSamples.length}`)
  for (const fieldId of ["wEngines.identity", "wEngines.baseStats"]) {
    const row = resourceRows.get(fieldId)
    assert(row?.sampleEntity === "nanoka-weapon-index-live-2.8", `${fieldId}: V1.2.x batch row must use the approved-live W-Engine index sample`)
    assert(row?.auditArtifact === "data/cleaned/audit/nanoka-wengine-batch-audit.json", `${fieldId}: V1.2.x batch row must point to the W-Engine batch audit`)
    assert((row?.supportingSampleEntities ?? []).length === 89, `${fieldId}: V1.2.x batch row must support all 89 W-Engines`)
  }
  const wEnginePassiveRow = resourceRows.get("wEngines.passiveModifiers")
  assert(wEnginePassiveRow !== undefined, "wEngines.passiveModifiers: missing W-Engine passive modifier row")
  assert(wEnginePassiveRow.promotable === false, "wEngines.passiveModifiers must stay not-promotable until typed modifier templates exist")
  assert(wEnginePassiveRow.blockedBy?.includes("typed-modifier-template-required"), "wEngines.passiveModifiers must keep typed modifier blocker")
  assert(wEnginePassiveRow.auditArtifact === "data/cleaned/audit/nanoka-wengine-batch-audit.json", "wEngines.passiveModifiers must point to the W-Engine batch audit")
  assert((wEnginePassiveRow.supportingSampleEntities ?? []).length === 89, "wEngines.passiveModifiers row must support all 89 W-Engines")

  const driveDiscIndexSample = sampleById.get("nanoka-equipment-index-live-2.8")
  assert(driveDiscIndexSample !== undefined, "Drive Disc batch: missing approved-live equipment index sample")
  assert(driveDiscIndexSample.approvedForCleanedOutput === true, "Drive Disc batch index must be approved live evidence")
  assert(driveDiscIndexSample.version === nanoka.configuredLiveVersion, "Drive Disc batch index must use configuredLiveVersion")
  const liveDriveDiscSamples = [...sampleById.values()].filter(sample => sample.entityType === "driveDisc" && sample.version === nanoka.configuredLiveVersion)
  assert(liveDriveDiscSamples.length === 26, `Drive Disc batch must retain 26 approved-live detail samples, got ${liveDriveDiscSamples.length}`)
  const driveDiscIdentityRow = resourceRows.get("driveDiscs.identity")
  assert(driveDiscIdentityRow !== undefined, "driveDiscs.identity: missing Drive Disc identity row")
  assert(driveDiscIdentityRow.sampleEntity === "nanoka-equipment-index-live-2.8", "driveDiscs.identity: V1.2.x batch row must use the approved-live equipment index sample")
  assert(driveDiscIdentityRow.auditArtifact === "data/cleaned/audit/nanoka-drive-disc-batch-audit.json", "driveDiscs.identity: V1.2.x batch row must point to the Drive Disc batch audit")
  assert((driveDiscIdentityRow.supportingSampleEntities ?? []).length === 26, "driveDiscs.identity row must support all 26 Drive Disc sets")
  const driveDiscSetRow = resourceRows.get("driveDiscs.setModifiers")
  assert(driveDiscSetRow !== undefined, "driveDiscs.setModifiers: missing Drive Disc set modifier row")
  assert(driveDiscSetRow.sampleEntity === "nanoka-equipment-index-live-2.8", "driveDiscs.setModifiers: V1.2.x batch row must use the approved-live equipment index sample")
  assert(driveDiscSetRow.promotable === false, "driveDiscs.setModifiers must stay not-promotable until typed modifier templates exist")
  assert(driveDiscSetRow.blockedBy?.includes("typed-modifier-template-required"), "driveDiscs.setModifiers must keep typed modifier blocker")
  assert(driveDiscSetRow.auditArtifact === "data/cleaned/audit/nanoka-drive-disc-batch-audit.json", "driveDiscs.setModifiers must point to the Drive Disc batch audit")
  assert((driveDiscSetRow.supportingSampleEntities ?? []).length === 26, "driveDiscs.setModifiers row must support all 26 Drive Disc sets")

  const driveDiscSlotRow = resourceRows.get("driveDiscs.slotAndSubstatTables")
  assert(driveDiscSlotRow !== undefined, "driveDiscs.slotAndSubstatTables: missing Drive Disc slot/stat row")
  assert(driveDiscSlotRow.status === "deferred", "driveDiscs.slotAndSubstatTables: row must be deferred after owner scope decision")
  assert(driveDiscSlotRow.sourcePolicy === "out-of-scope", "driveDiscs.slotAndSubstatTables: row must be out-of-scope for V0.1.0 formal data")
  assert(driveDiscSlotRow.fieldClass === "removed-out-of-product-scope", "driveDiscs.slotAndSubstatTables: fieldClass must be removed-out-of-product-scope")
  assert(driveDiscSlotRow.promotable === false, "driveDiscs.slotAndSubstatTables: out-of-scope row must not be promotable")
  assert(driveDiscSlotRow.sampleEntity === "nanoka-equipment-woodpecker-live-31000", "driveDiscs.slotAndSubstatTables: row must use approved live Woodpecker sample evidence")
  assert(driveDiscSlotRow.blockedBy?.includes("scope:user-provided-snapshot-boundary"), "driveDiscs.slotAndSubstatTables: row must carry user-provided snapshot boundary blocker")
  assert(driveDiscSlotRow.auditArtifact === "data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json", "driveDiscs.slotAndSubstatTables: row must point to failed-evidence audit artifact")
  assert(driveDiscSlotRow.transformRule?.includes("do not synthesize"), "driveDiscs.slotAndSubstatTables: transform must preserve no-fabrication boundary")
  assert(driveDiscSlotRow.transformRule?.includes("user snapshot input supplies the final Agent panel"), "driveDiscs.slotAndSubstatTables: transform must document final panel snapshot boundary")
  assert(driveDiscSlotRow.transformRule?.includes("do not reverse-engineer user panel values"), "driveDiscs.slotAndSubstatTables: transform must reject runtime reverse engineering")
  for (const rawPath of ["/id", "/name", "/desc2", "/desc4"]) {
    assert(driveDiscSlotRow.rawFieldPaths?.includes(rawPath), `driveDiscs.slotAndSubstatTables: missing observed raw path ${rawPath}`)
  }

  const disorderFormulaRow = resourceRows.get("rules.disorderFormula")
  assert(disorderFormulaRow !== undefined, "rules.disorderFormula: missing Disorder formula row")
  assert(disorderFormulaRow.status === "deferred", "rules.disorderFormula: row must be deferred after implementation-owned classification")
  assert(disorderFormulaRow.sourcePolicy === "implementation-owned", "rules.disorderFormula: row must be implementation-owned after failed nanoka audit")
  assert(disorderFormulaRow.fieldClass === "implementation-owned", "rules.disorderFormula: fieldClass must be implementation-owned")
  assert(disorderFormulaRow.promotable === false, "rules.disorderFormula: implementation-owned formula row must not be nanoka-promotable")
  assert(disorderFormulaRow.sampleEntity === null, "rules.disorderFormula: implementation-owned row must not point to a nanoka sample entity")
  assert(disorderFormulaRow.blockedBy?.includes("implementation-owned-runtime-formula"), "rules.disorderFormula: row must carry implementation-owned runtime blocker")
  assert(disorderFormulaRow.auditArtifact === "data/cleaned/audit/nanoka-disorder-formula-audit.json", "rules.disorderFormula: row must point to failed-evidence audit artifact")
  assert(disorderFormulaRow.transformRule?.includes("guide-anchored golden replay G15"), "rules.disorderFormula: transform must document guide/golden ownership")
  assert(disorderFormulaRow.transformRule?.includes("Do not synthesize"), "rules.disorderFormula: transform must preserve no-fabrication boundary")

  const disorderDazeLevelRow = resourceRows.get("rules.disorderDazeLevelZone")
  assert(disorderDazeLevelRow !== undefined, "rules.disorderDazeLevelZone: missing Disorder daze-level row")
  assert(disorderDazeLevelRow.status === "deferred", "rules.disorderDazeLevelZone: row must be deferred after implementation-owned classification")
  assert(disorderDazeLevelRow.sourcePolicy === "implementation-owned", "rules.disorderDazeLevelZone: row must be implementation-owned after failed nanoka audit")
  assert(disorderDazeLevelRow.fieldClass === "implementation-owned", "rules.disorderDazeLevelZone: fieldClass must be implementation-owned")
  assert(disorderDazeLevelRow.promotable === false, "rules.disorderDazeLevelZone: implementation-owned formula row must not be nanoka-promotable")
  assert(disorderDazeLevelRow.sampleEntity === null, "rules.disorderDazeLevelZone: implementation-owned row must not point to a nanoka sample entity")
  assert(disorderDazeLevelRow.blockedBy?.includes("implementation-owned-runtime-formula"), "rules.disorderDazeLevelZone: row must carry implementation-owned runtime blocker")
  assert(disorderDazeLevelRow.auditArtifact === "data/cleaned/audit/nanoka-disorder-daze-level-audit.json", "rules.disorderDazeLevelZone: row must point to failed-evidence audit artifact")
  assert(disorderDazeLevelRow.transformRule?.includes("guide-anchored golden replay G16"), "rules.disorderDazeLevelZone: transform must document guide/golden ownership")
  assert(disorderDazeLevelRow.transformRule?.includes("Do not synthesize"), "rules.disorderDazeLevelZone: transform must preserve no-fabrication boundary")

  const promotionExtraRow = resourceRows.get("agents.promotionExtraStats")
  assert(promotionExtraRow !== undefined, "agents.promotionExtraStats: missing promotion extra row")
  assert(promotionExtraRow.status === "verified-from-nanoka", "agents.promotionExtraStats: row must be verified after live extra_level mapping")
  assert(promotionExtraRow.promotable === true, "agents.promotionExtraStats: structured source artifact must be promotable after live mapping gate")
  assert(promotionExtraRow.sampleEntity === "nanoka-character-nekomata-live-1021", "agents.promotionExtraStats: row must use live Nekomata sample evidence")
  assert(!promotionExtraRow.blockedBy?.includes("field:runtime-cutover-drift-required"), "agents.promotionExtraStats: runtime cutover blocker must be cleared after Phase 3/4")
  assert(promotionExtraRow.transformRule?.includes("/id matches the requested agent id"), "agents.promotionExtraStats: transform must bind source /id to requested agent id")
  assert(promotionExtraRow.transformRule?.includes("Phase 3 drift rulings and Phase 4 cutover clear the runtime gate"), "agents.promotionExtraStats: transform must document runtime cutover clearance")
  for (const rawPath of [
    "/id",
    "/extra_level/*/max_level",
    "/extra_level/*/extra/*/prop",
    "/extra_level/*/extra/*/name",
    "/extra_level/*/extra/*/value",
  ]) {
    assert(promotionExtraRow.rawFieldPaths?.includes(rawPath), `agents.promotionExtraStats: missing raw path ${rawPath}`)
  }
  for (const sampleId of [
    "nanoka-character-nekomata-live-1021",
    "nanoka-character-yixuan-live-1371",
  ]) {
    const sample = sampleById.get(sampleId)
    assert(sample !== undefined, `agents.promotionExtraStats: missing supporting live sample ${sampleId}`)
    assert(sample.approvedForCleanedOutput === true, `${sampleId}: promotion extra supporting sample must be approved live evidence`)
    assert(sample.version === nanoka.configuredLiveVersion, `${sampleId}: promotion extra supporting sample must use configuredLiveVersion`)
    assert(promotionExtraRow.supportingSampleEntities?.includes(sampleId), `agents.promotionExtraStats: supporting samples must include ${sampleId}`)
  }

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
  assert(!daRow.blockedBy?.includes("field:runtime-cutover-drift-required"), "deadlyAssault.periodsBossesBuffs: DA runtime cutover blocker must be cleared after Phase 3/4")

  const enemyIndexSample = sampleById.get("nanoka-monster-index-live-2.8")
  assert(enemyIndexSample !== undefined, "enemy batch: missing approved-live monster index sample")
  assert(enemyIndexSample.approvedForCleanedOutput === true, "enemy batch index must be approved live evidence")
  assert(enemyIndexSample.version === nanoka.configuredLiveVersion, "enemy batch index must use configuredLiveVersion")
  const liveEnemySamples = [...sampleById.values()].filter(sample => sample.entityType === "enemy" && sample.version === nanoka.configuredLiveVersion)
  assert(liveEnemySamples.length === 269, `enemy batch must retain 269 approved-live detail samples, got ${liveEnemySamples.length}`)
  const enemyIdentityRow = resourceRows.get("enemies.identity")
  assert(enemyIdentityRow !== undefined, "enemies.identity: missing enemy identity row")
  assert(enemyIdentityRow.sampleEntity === "nanoka-monster-index-live-2.8", "enemies.identity: V1.2.x batch row must use the approved-live monster index sample")
  assert(enemyIdentityRow.promotable === true, "enemies.identity: runtime identity row must be promotable after PR-D")
  assert((enemyIdentityRow.blockedBy ?? []).length === 0, "enemies.identity: full enemy catalog blocker must be cleared after PR-D")
  assert(enemyIdentityRow.auditArtifact === "data/cleaned/audit/nanoka-enemy-batch-audit.json", "enemies.identity must point to the enemy batch audit")
  assert((enemyIdentityRow.supportingSampleEntities ?? []).length === 269, "enemies.identity row must support all 269 enemies")

  const enemyVariantRow = resourceRows.get("enemies.variantMapping")
  assert(enemyVariantRow !== undefined, "enemies.variantMapping: missing enemy variant mapping row")
  assert(enemyVariantRow.status === "verified-from-nanoka", "enemies.variantMapping: row must be verified after live monster_info mapping")
  assert(enemyVariantRow.promotable === true, "enemies.variantMapping: structured source artifact must be promotable after live mapping gate")
  assert(enemyVariantRow.sampleEntity === "nanoka-monster-index-live-2.8", "enemies.variantMapping: row must use live monster index evidence after PR-D")
  assert(enemyVariantRow.auditArtifact === "data/cleaned/audit/nanoka-enemy-batch-audit.json", "enemies.variantMapping must point to the enemy batch audit")
  assert((enemyVariantRow.supportingSampleEntities ?? []).length === 269, "enemies.variantMapping row must support all 269 enemies")
  assert(!enemyVariantRow.blockedBy?.includes("field:runtime-cutover-drift-required"), "enemies.variantMapping: runtime cutover blocker must be cleared after Phase 3/4")
  for (const rawPath of [
    "/monster_id",
    "/monster_info/{monster_id}",
    "/monster_info/{monster_id}/id",
    "/monster_info/{monster_id}/code_name",
    "/monster_info/{monster_id}/tag",
    "/monster_info/{monster_id}/type",
    "/monster_info/{monster_id}/stats",
    "/monster_info/*",
  ]) {
    assert(enemyVariantRow.rawFieldPaths?.includes(rawPath), `enemies.variantMapping: missing raw path ${rawPath}`)
  }
  for (const fieldId of ["enemies.levelDefaults", "enemies.resistance", "enemies.anomalyThresholds", "enemies.dazeRecovery", "enemies.specialRules"]) {
    const row = resourceRows.get(fieldId)
    assert(row !== undefined, `${fieldId}: missing enemy field row`)
    assert(row.sampleEntity === "nanoka-monster-index-live-2.8", `${fieldId}: row must use the approved-live monster index sample after PR-D`)
    assert(row.auditArtifact === "data/cleaned/audit/nanoka-enemy-batch-audit.json", `${fieldId}: row must point to the enemy batch audit`)
    assert((row.supportingSampleEntities ?? []).length === 269, `${fieldId}: row must support all 269 enemies`)
  }

  const snapshotDiffRow = resourceRows.get("metadata.snapshotDiffHistory")
  assert(snapshotDiffRow !== undefined, "metadata.snapshotDiffHistory: missing snapshot diff history row")
  assert(snapshotDiffRow.fieldClass === "derived", "metadata.snapshotDiffHistory: row must stay derived")
  assert(snapshotDiffRow.sourcePolicy === "derived-from-source-registry", "metadata.snapshotDiffHistory: row must derive from source registry")
  assert(snapshotDiffRow.status === "verified-from-nanoka", "metadata.snapshotDiffHistory: row must be verified from nanoka manifest")
  assert(snapshotDiffRow.promotable === true, "metadata.snapshotDiffHistory: row must be promotable after snapshot-diff tool gate")
  assert(snapshotDiffRow.sampleEntity === "nanoka-manifest", "metadata.snapshotDiffHistory: row must use nanoka manifest sample")
  assert(!snapshotDiffRow.blockedBy?.includes("snapshot-diff-tool-required"), "metadata.snapshotDiffHistory: tool-required blocker must be removed after this gate")
  assert(!snapshotDiffRow.blockedBy?.includes("approved-live-version-allowlist-required"), "metadata.snapshotDiffHistory: allowlist-required blocker must be removed after this gate")
  assert(snapshotDiffRow.auditArtifact === "data/cleaned/audit/nanoka-snapshot-diff-history.json", "metadata.snapshotDiffHistory: row must point to snapshot diff artifact")
}

function collectSourceRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value)
      collectSourceRefs(item, refs)
    return refs
  }

  if (typeof value !== "object" || value === null)
    return refs

  if (typeof value.sourceId === "string")
    refs.push(value)

  for (const item of Object.values(value))
    collectSourceRefs(item, refs)

  return refs
}

function validateRuntimeGameData(registry) {
  const { rootText } = readMirroredText(
    rootRuntimeGameDataPath,
    packageRuntimeGameDataPath,
    "packages/data/cleaned/runtime/game-data.json",
  )
  const nanoka = sourceById(registry, "nanoka-zzz")
  const artifact = JSON.parse(rootText)
  assert(artifact.kind === "gameData", "runtime artifact kind must be gameData")
  assert(artifact.schemaVersion === "cleaned-game-data-artifact/v0.1", "runtime artifact schemaVersion drifted")
  assert(artifact.dataVersion === "fairy-v0.1.0-nanoka-runtime", "runtime artifact dataVersion drifted")
  assert(artifact.runtimeCutoverReady === true, "runtimeCutoverReady must be true after Phase 4 cutover")
  assert(artifact.runtimeSourcePolicy?.primarySourceId === "nanoka-zzz", "runtime policy primary source must be nanoka")
  assert(artifact.runtimeSourcePolicy?.configuredLiveVersion === nanoka.configuredLiveVersion, "runtime policy source version must match configured live")
  assert(artifact.runtimeSourcePolicy?.archivedSourcesRuntimeAllowed === false, "runtime policy must forbid archived runtime sources")
  assert(artifact.runtimeSourcePolicy?.phase3ExitSyncId === "phase3-sync-002-g27-g28", "runtime cutover must cite Phase 3 exit sync")

  const deprecatedIds = artifact.runtimeSourcePolicy?.deprecatedRuntimeSourceIds ?? []
  assert(JSON.stringify(deprecatedIds) === JSON.stringify([...archivedRuntimeSourceIds]), "runtime policy deprecated source list drifted")

  const data = artifact.data
  assert(data?.schemaVersion === "fairy-game-data-v0.1.0", "runtime GameData schemaVersion drifted")
  assert(data?.sourceVersion === `nanoka-zzz@${nanoka.configuredLiveVersion}`, "runtime GameData sourceVersion must match nanoka configured live")
  assert(Array.isArray(data.sources) && data.sources.length === 1, "runtime GameData must expose exactly one runtime source document")
  assert(data.sources[0]?.id === "nanoka-zzz", "runtime GameData source document must be nanoka")
  assert(data.sources[0]?.sourceVersion === nanoka.configuredLiveVersion, "runtime GameData source document must use configured live")
  assert(Object.keys(data.agents ?? {}).length === 53, "runtime GameData must include the full approved-live character batch")
  assert(Object.keys(data.wEngines ?? {}).length === 89, "runtime GameData must include the full approved-live W-Engine batch")
  assert(Object.keys(data.bangboos ?? {}).length === 39, "runtime GameData must include the full approved-live Bangboo batch")
  assert(Object.keys(data.bangbooSkills ?? {}).length === 63, "runtime GameData Bangboo skill count drifted")
  assert(Object.keys(data.enemies ?? {}).length === 269, "runtime GameData must include the full approved-live enemy batch")

  for (const ref of collectSourceRefs(data)) {
    assert(!archivedRuntimeSourceIds.has(ref.sourceId), `runtime GameData must not reference archived source ${ref.sourceId}`)
    assert(ref.sourceId === "nanoka-zzz", `runtime GameData must not reference non-nanoka source ${ref.sourceId}`)
    assert(ref.sourceVersion === nanoka.configuredLiveVersion, `${ref.sourceAnchor ?? ref.sourceId}: runtime source refs must use configured live`)
  }
}

function validateCharacterBatchAudit(registry) {
  const { rootText } = readMirroredText(
    rootCharacterBatchAuditPath,
    packageCharacterBatchAuditPath,
    "packages/data/cleaned/audit/nanoka-character-batch-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.kind === "nanokaCharacterBatchAudit", "Character batch audit kind drifted")
  assert(audit.schemaVersion === "nanoka-character-batch-audit/v0.1", "Character batch audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Character batch audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Character batch audit must use configured live version")
  assert(audit.runtimeCutoverReady === true, "Character batch audit must reflect runtime cutover state")
  assert(audit.indexSource?.sourceId === "nanoka-zzz", "Character batch audit index source must be nanoka")
  assert(audit.indexSource?.sourceVersion === nanoka.configuredLiveVersion, "Character batch audit index source must use configured live version")
  assert(audit.indexSource?.sourceAnchor === "data/source/raw/nanoka/zzz/2.8/character.json", "Character batch audit index source anchor drifted")
  assert(audit.summary?.characterCount === 53, "Character batch audit count drifted")
  assert(audit.summary?.runtimeAgentCount === 53, "Character batch runtime agent count drifted")
  assert(audit.summary?.promotedRuntimeSkillCount === 1, "Character batch promoted skill count drifted")
  assert(audit.summary?.nonPromotedSkillAgentCount === 52, "Character batch non-promoted skill count drifted")
  assert(JSON.stringify(audit.summary?.specialElementPromotedIds) === JSON.stringify(["1091", "1371"]), "Character special-element promoted list drifted")
  assert(JSON.stringify(audit.summary?.specialElementNotPromotedIds) === JSON.stringify(["1431"]), "Character special-element not-promoted list drifted")
  assert(Array.isArray(audit.characters) && audit.characters.length === 53, "Character batch audit rows must cover 53 characters")
  for (const row of audit.characters) {
    assert(row.source?.sourceId === "nanoka-zzz", `${row.id}: Character audit source must be nanoka`)
    assert(row.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: Character audit source version drifted`)
    assert(row.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/character/${row.id}.json`, `${row.id}: Character audit source anchor drifted`)
    assert(row.level60Panel?.maxHp !== undefined, `${row.id}: Character audit must include level-60 maxHp`)
    assert(row.skillPromotion?.status === "sample-preserved" || row.skillPromotion?.status === "not-promoted", `${row.id}: Character skill promotion status drifted`)
    assert(row.passiveModifiers?.status === "not-promoted", `${row.id}: Character passive modifier template must remain not-promoted`)
  }
}

function validateWEngineBatchAudit(registry) {
  const { rootText } = readMirroredText(
    rootWEngineBatchAuditPath,
    packageWEngineBatchAuditPath,
    "packages/data/cleaned/audit/nanoka-wengine-batch-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.kind === "nanokaWEngineBatchAudit", "W-Engine batch audit kind drifted")
  assert(audit.schemaVersion === "nanoka-wengine-batch-audit/v0.1", "W-Engine batch audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "W-Engine batch audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "W-Engine batch audit must use configured live version")
  assert(audit.runtimeCutoverReady === true, "W-Engine batch audit must reflect runtime cutover state")
  assert(audit.indexSource?.sourceId === "nanoka-zzz", "W-Engine batch audit index source must be nanoka")
  assert(audit.indexSource?.sourceVersion === nanoka.configuredLiveVersion, "W-Engine batch audit index source must use configured live version")
  assert(audit.indexSource?.sourceAnchor === "data/source/raw/nanoka/zzz/2.8/weapon.json", "W-Engine batch audit index source anchor drifted")
  assert(audit.summary?.wEngineCount === 89, "W-Engine batch audit count drifted")
  assert(audit.summary?.runtimeWEngineCount === 89, "W-Engine batch runtime count drifted")
  assert(audit.summary?.passiveNotPromotedCount === 89, "W-Engine passive promotion boundary drifted")
  assert(Array.isArray(audit.wEngines) && audit.wEngines.length === 89, "W-Engine batch audit rows must cover 89 W-Engines")
  for (const row of audit.wEngines) {
    assert(row.source?.sourceId === "nanoka-zzz", `${row.id}: W-Engine audit source must be nanoka`)
    assert(row.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: W-Engine audit source version drifted`)
    assert(row.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/weapon/${row.id}.json`, `${row.id}: W-Engine audit source anchor drifted`)
    assert(row.level60Panel?.attack !== undefined, `${row.id}: W-Engine audit must include level-60 attack`)
    assert(row.formulaProof?.indexAttackFloorMatches === true, `${row.id}: W-Engine attack formula must match index atk floor`)
    assert(row.passiveModifiers?.status === "not-promoted", `${row.id}: W-Engine passive modifiers must remain not-promoted`)
    assert(Array.isArray(row.passiveModifiers?.talents) && row.passiveModifiers.talents.length === 5, `${row.id}: W-Engine audit must retain all five passive talent text rows`)
    for (const talent of row.passiveModifiers.talents) {
      assert(/^[1-5]$/.test(talent.level), `${row.id}: W-Engine talent level drifted`)
      assert(typeof talent.name === "string" && talent.name.length > 0, `${row.id}: W-Engine talent name must be retained`)
      assert(typeof talent.desc === "string" && talent.desc.length > 0, `${row.id}: W-Engine talent desc must be retained`)
      assert(talent.source?.sourceId === "nanoka-zzz", `${row.id}: W-Engine talent source must be nanoka`)
      assert(talent.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: W-Engine talent source version drifted`)
      assert(talent.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/weapon/${row.id}.json`, `${row.id}: W-Engine talent source anchor drifted`)
      assert(talent.source?.dataPath === `/talents/${talent.level}`, `${row.id}: W-Engine talent dataPath drifted`)
    }
  }
}

function validateBangbooBatchAudit(registry) {
  const { rootText } = readMirroredText(
    rootBangbooBatchAuditPath,
    packageBangbooBatchAuditPath,
    "packages/data/cleaned/audit/nanoka-bangboo-batch-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.kind === "nanokaBangbooBatchAudit", "Bangboo batch audit kind drifted")
  assert(audit.schemaVersion === "nanoka-bangboo-batch-audit/v0.1", "Bangboo batch audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Bangboo batch audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Bangboo batch audit must use configured live version")
  assert(audit.runtimeCutoverReady === true, "Bangboo batch audit must reflect runtime cutover state")
  assert(audit.indexSource?.sourceId === "nanoka-zzz", "Bangboo batch audit index source must be nanoka")
  assert(audit.indexSource?.sourceVersion === nanoka.configuredLiveVersion, "Bangboo batch audit index source must use configured live version")
  assert(audit.indexSource?.sourceAnchor === "data/source/raw/nanoka/zzz/2.8/bangboo.json", "Bangboo batch audit index source anchor drifted")
  assert(audit.summary?.bangbooCount === 39, "Bangboo batch audit count drifted")
  assert(audit.summary?.runtimeBangbooCount === 39, "Bangboo batch runtime count drifted")
  assert(audit.summary?.promotedSkillCount === 63, "Bangboo batch promoted skill count drifted")
  assert(JSON.stringify(audit.summary?.noRuntimeSkillBangbooIds) === JSON.stringify(["53003", "53008", "53012"]), "Bangboo no-runtime-skill support list drifted")
  assert(Array.isArray(audit.bangboos) && audit.bangboos.length === 39, "Bangboo batch audit rows must cover 39 Bangboos")
  for (const row of audit.bangboos) {
    assert(row.source?.sourceId === "nanoka-zzz", `${row.id}: Bangboo audit source must be nanoka`)
    assert(row.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: Bangboo audit source version drifted`)
    assert(row.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/bangboo/${row.id}.json`, `${row.id}: Bangboo audit source anchor drifted`)
    assert(row.level60Panel?.attack !== undefined, `${row.id}: Bangboo audit must include level-60 attack`)
    assert(Array.isArray(row.skillSections), `${row.id}: Bangboo audit must include skill section rows`)
  }
}

function validateDriveDiscBatchAudit(registry) {
  const { rootText } = readMirroredText(
    rootDriveDiscBatchAuditPath,
    packageDriveDiscBatchAuditPath,
    "packages/data/cleaned/audit/nanoka-drive-disc-batch-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.kind === "nanokaDriveDiscBatchAudit", "Drive Disc batch audit kind drifted")
  assert(audit.schemaVersion === "nanoka-drive-disc-batch-audit/v0.1", "Drive Disc batch audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Drive Disc batch audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Drive Disc batch audit must use configured live version")
  assert(audit.runtimeCutoverReady === true, "Drive Disc batch audit must reflect runtime cutover state")
  assert(audit.indexSource?.sourceId === "nanoka-zzz", "Drive Disc batch audit index source must be nanoka")
  assert(audit.indexSource?.sourceVersion === nanoka.configuredLiveVersion, "Drive Disc batch audit index source must use configured live version")
  assert(audit.indexSource?.sourceAnchor === "data/source/raw/nanoka/zzz/2.8/equipment.json", "Drive Disc batch audit index source anchor drifted")
  assert(audit.summary?.driveDiscCount === 26, "Drive Disc batch audit count drifted")
  assert(audit.summary?.runtimeDriveDiscCount === 26, "Drive Disc batch runtime count drifted")
  assert(audit.summary?.retainedSetEffectTextCount === 52, "Drive Disc retained set-effect text count drifted")
  assert(audit.summary?.typedModifierPendingCount === 26, "Drive Disc typed modifier pending count drifted")
  assert(Array.isArray(audit.driveDiscs) && audit.driveDiscs.length === 26, "Drive Disc batch audit rows must cover 26 sets")
  for (const row of audit.driveDiscs) {
    assert(row.source?.sourceId === "nanoka-zzz", `${row.id}: Drive Disc audit source must be nanoka`)
    assert(row.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: Drive Disc audit source version drifted`)
    assert(row.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/equipment/${row.id}.json`, `${row.id}: Drive Disc audit source anchor drifted`)
    for (const piece of ["twoPiece", "fourPiece"]) {
      const effect = row.setEffects?.[piece]
      assert(effect?.status === "not-promoted", `${row.id}: Drive Disc ${piece} set effect must remain not-promoted`)
      assert(effect.reason === "typed-modifier-template-required", `${row.id}: Drive Disc ${piece} set effect must keep typed modifier blocker`)
      assert(typeof effect.rawText === "string" && effect.rawText.length > 0, `${row.id}: Drive Disc ${piece} set effect raw text must be retained`)
      assert(effect.source?.sourceId === "nanoka-zzz", `${row.id}: Drive Disc ${piece} source must be nanoka`)
      assert(effect.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: Drive Disc ${piece} source version drifted`)
      assert(effect.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/equipment/${row.id}.json`, `${row.id}: Drive Disc ${piece} source anchor drifted`)
      assert(effect.source?.dataPath === (piece === "twoPiece" ? "/desc2" : "/desc4"), `${row.id}: Drive Disc ${piece} source dataPath drifted`)
    }
    assert(row.slotAndSubstatTables?.status === "out-of-scope", `${row.id}: Drive Disc slot/stat boundary must remain out-of-scope`)
  }
}

function validateEnemyBatchAudit(registry) {
  const { rootText } = readMirroredText(
    rootEnemyBatchAuditPath,
    packageEnemyBatchAuditPath,
    "packages/data/cleaned/audit/nanoka-enemy-batch-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.kind === "nanokaEnemyBatchAudit", "Enemy batch audit kind drifted")
  assert(audit.schemaVersion === "nanoka-enemy-batch-audit/v0.1", "Enemy batch audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Enemy batch audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Enemy batch audit must use configured live version")
  assert(audit.runtimeCutoverReady === true, "Enemy batch audit must reflect runtime cutover state")
  assert(audit.indexSource?.sourceId === "nanoka-zzz", "Enemy batch audit index source must be nanoka")
  assert(audit.indexSource?.sourceVersion === nanoka.configuredLiveVersion, "Enemy batch audit index source must use configured live version")
  assert(audit.indexSource?.sourceAnchor === "data/source/raw/nanoka/zzz/2.8/monster.json", "Enemy batch audit index source anchor drifted")
  assert(audit.summary?.enemyCount === 269, "Enemy batch audit count drifted")
  assert(audit.summary?.runtimeEnemyCount === 269, "Enemy batch runtime count drifted")
  assert(audit.summary?.selectedVariantCount === 201, "Enemy selected variant count drifted")
  assert(audit.summary?.missingSelectedVariantCount === 68, "Enemy missing selected variant count drifted")
  assert(audit.summary?.skippedVariantCount === 372, "Enemy skipped variant count drifted")
  assert(Array.isArray(audit.enemies) && audit.enemies.length === 269, "Enemy batch audit rows must cover 269 enemies")
  for (const row of audit.enemies) {
    assert(row.source?.sourceId === "nanoka-zzz", `${row.id}: Enemy audit source must be nanoka`)
    assert(row.source?.sourceVersion === nanoka.configuredLiveVersion, `${row.id}: Enemy audit source version drifted`)
    assert(row.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/monster/${row.id}.json`, `${row.id}: Enemy audit source anchor drifted`)
    assert(row.rankMapping?.status === "promoted", `${row.id}: Enemy rank mapping must be promoted from nanoka rarity`)
    assert(row.rankMapping?.source?.sourceAnchor === "data/source/raw/nanoka/zzz/2.8/monster.json", `${row.id}: Enemy rank source anchor drifted`)
    assert(row.selectedVariant?.status === "promoted" || row.selectedVariant?.status === "not-promoted", `${row.id}: Enemy selected variant status drifted`)
    if (row.selectedVariant?.status === "promoted") {
      assert(typeof row.selectedVariant.monsterInfoId === "number", `${row.id}: Enemy selected variant id must be numeric`)
      assert(typeof row.selectedVariant.codeName === "string" && row.selectedVariant.codeName.length > 0, `${row.id}: Enemy selected codeName must be retained`)
      assert(row.selectedVariant.source?.sourceAnchor === `data/source/raw/nanoka/zzz/2.8/zh/monster/${row.id}.json`, `${row.id}: Enemy selected variant source anchor drifted`)
      assert(row.selectedVariant.statsRaw !== undefined, `${row.id}: Enemy selected raw stats must be retained`)
    }
    else {
      assert(row.selectedVariant?.reason === "missing-selected-monster_info-variant", `${row.id}: Enemy missing selected variant reason drifted`)
    }
    for (const fieldId of ["levelDefaults", "resistance", "anomalyThresholds", "dazeRecovery", "specialRules"]) {
      assert(row.pendingPromotions?.[fieldId]?.status === "not-promoted", `${row.id}: ${fieldId} must remain not-promoted`)
    }
  }
}

function validateSnapshotDiffHistory(registry) {
  const { rootText } = readMirroredText(
    rootSnapshotDiffHistoryPath,
    packageSnapshotDiffHistoryPath,
    "packages/data/cleaned/audit/nanoka-snapshot-diff-history.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const history = JSON.parse(rootText)
  assert(history.schemaVersion === "nanoka-snapshot-diff-history/v0.1", "snapshot diff history schemaVersion drifted")
  assert(history.sourceId === "nanoka-zzz", "snapshot diff history sourceId drifted")
  assert(history.diffKind === "snapshot-derived-numeric-diff", "snapshot diff history must stay numeric-diff derived")
  assert(history.officialPatchNoteText?.status === "not-found", "official patch note prose must stay not-found unless a nanoka endpoint is proven")
  assert(history.runtimeCutoverReady === false, "snapshot diff history must not imply runtime cutover")
  assert(JSON.stringify(history.approvedLiveVersions) === JSON.stringify(nanoka.approvedLiveVersions), "snapshot diff approvedLiveVersions must match source registry")
  assert(history.latestResearchVersion === nanoka.latestResearchVersion, "snapshot diff latestResearchVersion must match source registry")
  for (const snapshot of history.approvedSnapshots ?? []) {
    assert(nanoka.approvedLiveVersions.includes(snapshot.sourceVersion), `${snapshot.sourceVersion}: snapshot diff artifact uses unapproved version`)
    assert(/^sha256:[a-f0-9]{64}$/.test(snapshot.contentHash), `${snapshot.sourceVersion}: snapshot diff artifact requires sha256 contentHash`)
  }
  for (const pair of history.comparedPairs ?? []) {
    assert(nanoka.approvedLiveVersions.includes(pair.fromVersion), `${pair.fromVersion}: snapshot diff pair fromVersion is not approved`)
    assert(nanoka.approvedLiveVersions.includes(pair.toVersion), `${pair.toVersion}: snapshot diff pair toVersion is not approved`)
    assert(pair.fromVersion !== nanoka.latestResearchVersion, "snapshot diff pair must not use latest research fromVersion")
    assert(pair.toVersion !== nanoka.latestResearchVersion, "snapshot diff pair must not use latest research toVersion")
  }
}

function validateDriveDiscSlotStatAudit(registry) {
  const { rootText } = readMirroredText(
    rootDriveDiscSlotStatAuditPath,
    packageDriveDiscSlotStatAuditPath,
    "packages/data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.schemaVersion === "nanoka-drive-disc-slot-stat-audit/v0.1", "Drive Disc slot/stat audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Drive Disc slot/stat audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Drive Disc slot/stat audit must use configured live version")
  assert(audit.status === "not-found", "Drive Disc slot/stat audit must remain failed-evidence until a source is proven")
  assert(audit.fieldId === "driveDiscs.slotAndSubstatTables", "Drive Disc slot/stat audit fieldId drifted")
  assert(audit.sampleEntity === "nanoka-equipment-woodpecker-live-31000", "Drive Disc slot/stat audit sampleEntity drifted")
  assert(audit.runtimeCutoverReady === false, "Drive Disc slot/stat audit must not imply runtime cutover")
  assert(audit.summary?.foundSlotMainSubstatTable === false, "Drive Disc slot/stat audit must not claim slot/stat table found")
  assert(audit.summary?.ownerResearchRequired === false, "Drive Disc slot/stat audit owner research should be resolved by the V0.1.0 scope decision")

  const endpoints = audit.checkedEndpoints ?? []
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/equipment.json" && endpoint.status === 200), "Drive Disc slot/stat audit must record live equipment index check")
  const detail = endpoints.find(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/zh/equipment/31000.json")
  assert(detail?.status === 200, "Drive Disc slot/stat audit must record live Woodpecker detail check")
  assert(detail.contentSha256 === "4190f6084521aead931a28ada9a44e6d9cd26a7fdb2401ffd0ab4e00a257f1ec", "Drive Disc slot/stat audit detail hash drifted")
  for (const rawPath of ["/id", "/name", "/desc2", "/desc4"]) {
    assert(detail.presentRawFieldPaths?.includes(rawPath), `Drive Disc slot/stat audit detail missing present raw path ${rawPath}`)
  }
  for (const rawPath of ["/slot", "/part", "/main_property", "/rand_property", "/level", "/stats"]) {
    assert(detail.missingRawFieldPaths?.includes(rawPath), `Drive Disc slot/stat audit detail missing absent raw path ${rawPath}`)
  }
  assert(endpoints.some(endpoint => endpoint.status === 404 && endpoint.url.endsWith("/equipment_main_property.json")), "Drive Disc slot/stat audit must record missing main-property candidate endpoint")
  assert(endpoints.some(endpoint => endpoint.status === 404 && endpoint.url.endsWith("/equipment_rand_property.json")), "Drive Disc slot/stat audit must record missing substat candidate endpoint")
  assert(audit.decision?.matrixStatus === "deferred", "Drive Disc slot/stat audit decision must match deferred matrix status")
  assert(audit.decision?.sourcePolicy === "out-of-scope", "Drive Disc slot/stat audit decision must mark the row out-of-scope")
  assert(audit.decision?.blockedBy?.includes("scope:user-provided-snapshot-boundary"), "Drive Disc slot/stat audit decision must carry user-provided snapshot boundary")
  assert(audit.decision?.ownerDecision?.includes("remove Drive Disc slot/main/substat tables from V0.1.0 formal-data scope"), "Drive Disc slot/stat audit must record the owner scope decision")
}

function validateDisorderFormulaAudit(registry) {
  const { rootText } = readMirroredText(
    rootDisorderFormulaAuditPath,
    packageDisorderFormulaAuditPath,
    "packages/data/cleaned/audit/nanoka-disorder-formula-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.schemaVersion === "nanoka-disorder-formula-audit/v0.1", "Disorder formula audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Disorder formula audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Disorder formula audit must use configured live version")
  assert(audit.status === "not-found", "Disorder formula audit must remain failed-evidence unless a nanoka source is proven")
  assert(audit.fieldId === "rules.disorderFormula", "Disorder formula audit fieldId drifted")
  assert(audit.runtimeCutoverReady === false, "Disorder formula audit must not imply runtime cutover")
  assert(audit.summary?.foundDisorderFormulaTable === false, "Disorder formula audit must not claim a formula table was found")
  assert(audit.summary?.implementationOwnedRuntimeFormula === true, "Disorder formula audit must classify the row as implementation-owned")
  assert(audit.summary?.ownerResearchRequired === false, "Disorder formula audit must not require owner research")

  const endpoints = audit.checkedEndpoints ?? []
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/formula.json" && endpoint.status === 404), "Disorder formula audit must record missing formula endpoint")
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/disorder.json" && endpoint.status === 404), "Disorder formula audit must record missing Disorder endpoint")
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/anomaly_disorder.json" && endpoint.status === 404), "Disorder formula audit must record missing anomaly/Disorder endpoint")
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/character.json" && endpoint.status === 200), "Disorder formula audit must record character index check")
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/monster.json" && endpoint.status === 200), "Disorder formula audit must record monster index check")
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/zh/monster/30000.json" && endpoint.status === 200), "Disorder formula audit must record retained monster detail check")
  assert(audit.implementationContract?.sourceAnchors?.includes("guide-3.4.1"), "Disorder formula audit must keep guide source anchor")
  assert(audit.implementationContract?.sourceAnchors?.includes("golden-v1:G15"), "Disorder formula audit must keep golden replay anchor")
  for (const formulaId of [
    "disorder-burn",
    "disorder-shock",
    "disorder-corruption",
    "disorder-frost",
    "disorder-physical-or-ice",
    "disorder-polarity",
  ]) {
    assert(audit.implementationContract?.coreFormulaIds?.includes(formulaId), `Disorder formula audit missing core formula id ${formulaId}`)
  }
  assert(audit.decision?.matrixStatus === "deferred", "Disorder formula audit decision must match deferred matrix status")
  assert(audit.decision?.sourcePolicy === "implementation-owned", "Disorder formula audit decision must classify source policy as implementation-owned")
  assert(audit.decision?.blockedBy?.includes("implementation-owned-runtime-formula"), "Disorder formula audit decision must carry implementation-owned blocker")
}

function validateDisorderDazeLevelAudit(registry) {
  const { rootText } = readMirroredText(
    rootDisorderDazeLevelAuditPath,
    packageDisorderDazeLevelAuditPath,
    "packages/data/cleaned/audit/nanoka-disorder-daze-level-audit.json",
  )

  const nanoka = sourceById(registry, "nanoka-zzz")
  const audit = JSON.parse(rootText)
  assert(audit.schemaVersion === "nanoka-disorder-daze-level-audit/v0.1", "Disorder daze-level audit schemaVersion drifted")
  assert(audit.sourceId === "nanoka-zzz", "Disorder daze-level audit sourceId drifted")
  assert(audit.sourceVersion === nanoka.configuredLiveVersion, "Disorder daze-level audit must use configured live version")
  assert(audit.status === "not-found", "Disorder daze-level audit must remain failed-evidence unless a nanoka source is proven")
  assert(audit.fieldId === "rules.disorderDazeLevelZone", "Disorder daze-level audit fieldId drifted")
  assert(audit.runtimeCutoverReady === false, "Disorder daze-level audit must not imply runtime cutover")
  assert(audit.summary?.foundDisorderDazeLevelTable === false, "Disorder daze-level audit must not claim a daze-level formula table was found")
  assert(audit.summary?.implementationOwnedRuntimeFormula === true, "Disorder daze-level audit must classify the row as implementation-owned")
  assert(audit.summary?.ownerResearchRequired === false, "Disorder daze-level audit must not require owner research")

  const endpoints = audit.checkedEndpoints ?? []
  for (const endpointName of [
    "daze_level.json",
    "disorder_daze_level.json",
    "disorder_daze_level_zone.json",
    "level_zone.json",
    "formula.json",
    "rules.json",
  ]) {
    assert(
      endpoints.some(endpoint => endpoint.url === `https://static.nanoka.cc/zzz/2.8/${endpointName}` && endpoint.status === 404),
      `Disorder daze-level audit must record missing ${endpointName}`,
    )
  }
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/character.json" && endpoint.status === 200), "Disorder daze-level audit must record character index check")
  assert(endpoints.some(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/monster.json" && endpoint.status === 200), "Disorder daze-level audit must record monster index check")
  const bossIndex = endpoints.find(endpoint => endpoint.url === "https://static.nanoka.cc/zzz/2.8/boss.json")
  assert(bossIndex?.status === 200, "Disorder daze-level audit must record boss index check")
  assert(bossIndex.contentSha256 === "d9519738c6100082760f59bb92fd17fdba93afb853c845b1c90d0718788a79f9", "Disorder daze-level boss index hash drifted")
  assert(audit.implementationContract?.sourceAnchors?.includes("guide-3.4.2"), "Disorder daze-level audit must keep guide source anchor")
  assert(audit.implementationContract?.sourceAnchors?.includes("golden-v1:G16"), "Disorder daze-level audit must keep golden replay anchor")
  assert(audit.implementationContract?.coreFormula === "disorderDazeLevelZone = 1 + 0.0075 * level", "Disorder daze-level audit core formula drifted")
  assert(audit.implementationContract?.sampleExpectation?.level === 60, "Disorder daze-level audit sample level drifted")
  assert(audit.implementationContract?.sampleExpectation?.multiplier === 1.45, "Disorder daze-level audit sample multiplier drifted")
  assert(audit.decision?.matrixStatus === "deferred", "Disorder daze-level audit decision must match deferred matrix status")
  assert(audit.decision?.sourcePolicy === "implementation-owned", "Disorder daze-level audit decision must classify source policy as implementation-owned")
  assert(audit.decision?.blockedBy?.includes("implementation-owned-runtime-formula"), "Disorder daze-level audit decision must carry implementation-owned blocker")
}

function validateCoveredSourceRefs(registry) {
  const sourceIds = new Set(registry.sources.map(source => source.sourceId))
  const files = [
    "data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json",
    "data/cleaned/audit/nanoka-character-batch-audit.json",
    "data/cleaned/audit/nanoka-bangboo-batch-audit.json",
    "data/cleaned/audit/nanoka-wengine-batch-audit.json",
    "data/cleaned/audit/nanoka-drive-disc-batch-audit.json",
    "data/cleaned/audit/nanoka-enemy-batch-audit.json",
    "data/cleaned/audit/source-migration-field-diff.json",
    "data/cleaned/golden/v1-replay-report.json",
    "data/cleaned/runtime/game-data.json",
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
  validateArchivedRuntimeRegistry(registry)
  validateSnapshotDiffHistory(registry)
  validateDriveDiscSlotStatAudit(registry)
  validateDisorderFormulaAudit(registry)
  validateDisorderDazeLevelAudit(registry)
  validateRuntimeGameData(registry)
  validateCharacterBatchAudit(registry)
  validateWEngineBatchAudit(registry)
  validateDriveDiscBatchAudit(registry)
  validateEnemyBatchAudit(registry)
  validateBangbooBatchAudit(registry)
  validateCoveredSourceRefs(registry)

  console.log("source registry verification passed")
}

main()

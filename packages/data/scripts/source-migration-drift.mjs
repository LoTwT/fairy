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
const secondSyncId = "phase3-sync-002-g27-g28"
const defaultGeneratedAt = "2026-05-15T16:20:00+08:00"
const rulingDecisionLogPath = "docs/product/decisions/data-source-rulings.md"
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

function arrayEquals(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index])
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
    exitCleanSyncEligible: false,
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
  G27: {
    entityType: "agent",
    fieldIds: [
      "agents.basePanel",
      "agents.combatPanelStats",
      "agents.ruptureStats",
      "agents.promotionExtraStats",
      "adrenaline.maxAdrenaline",
      "adrenaline.automaticAdrenalineAccumulation",
      "skills.resonanceRecovery",
      "skills.adrenalineRecovery",
    ],
    requiredSampleEntities: ["nanoka-character-yixuan-live-1371"],
    expectedCandidate: "Yixuan approved-live character proof anchor with panel, Adrenaline/Resonance, rupture, and promotion-extra source coverage.",
  },
  G28: {
    entityType: "bangboo",
    fieldIds: ["bangboos.identity", "bangboos.basePanel", "bangboos.skillSegments", "bangboos.element"],
    requiredSampleEntities: ["nanoka-bangboo-plugboo-live-54008"],
    expectedCandidate: "Plugboo approved-live Bangboo proof anchor with identity, panel, skill numeric, and electric element source coverage.",
  },
}

const phase3Rulings = {
  G01: {
    rulingId: "phase3-r001",
    summary: "Accepted DA boss-context source replacement: nanoka approved-live period detail covers boss_adjust and period context used by the archived G01 default-defense replay; Phase 4 still owns runtime cutover.",
  },
  G02: {
    rulingId: "phase3-r002",
    summary: "Accepted DA boss-context source replacement for corrupted-shield defense replay; the shield formula remains implementation-owned and nanoka supplies the period/boss evidence only.",
  },
  G03: {
    rulingId: "phase3-r003",
    summary: "Accepted agent panel normalization contract: nanoka live character stats/level rows deterministically derive base panel values; G03 crit expected-value behavior is formula-owned.",
  },
  G04: {
    rulingId: "phase3-r004",
    summary: "Accepted implementation-owned penetration/damage formula boundary; nanoka has no formula table and the archived guide/golden replay remains the executable proof anchor.",
  },
  G05: {
    rulingId: "phase3-r005",
    summary: "Accepted split responsibility: nanoka supplies Yixuan rupture raw fields and DA boss context, while sheer defense-skip semantics remain implementation-owned until the rupture semantic mapper lands.",
  },
  G06: {
    rulingId: "phase3-r006",
    summary: "Accepted split responsibility for sheer-vs-default ratio replay: nanoka source coverage is present and the ratio formula remains implementation-owned.",
  },
  G07: {
    rulingId: "phase3-r007",
    summary: "Accepted implementation-owned rounding boundary; no nanoka source table is expected for per-segment ceil behavior.",
  },
  G08: {
    rulingId: "phase3-r008",
    summary: "Accepted agent combat-panel unit boundary for anomaly mastery flooring; nanoka provides raw panel fields and core owns the floor-before-buildup behavior.",
  },
  G09: {
    rulingId: "phase3-r009",
    summary: "Accepted DA daze-context source replacement: nanoka period detail covers boss context and daze-related source evidence while display flooring remains implementation-owned.",
  },
  G10: {
    rulingId: "phase3-r010",
    summary: "Accepted attribute-alias boundary: nanoka supplies Yixuan/monster raw coverage, while Frost->Ice and Auric Ink->Ether alias semantics stay implementation-owned.",
  },
  G11: {
    rulingId: "phase3-r011",
    summary: "Accepted damage-bonus alias boundary: nanoka supplies combat-panel raw fields and core owns alias routing to Ice/Ether damage-bonus fields.",
  },
  G12: {
    rulingId: "phase3-r012",
    summary: "Accepted anomaly-threshold split responsibility: nanoka enemy threshold raw coverage exists, while trigger-count/rank threshold formula constants remain implementation-owned.",
  },
  G13: {
    rulingId: "phase3-r013",
    summary: "Accepted variant-mapping source replacement plus implementation-owned threshold modifiers; monster_info identity is source-backed and guide constants remain the formula proof anchor.",
  },
  G14: {
    rulingId: "phase3-r014",
    summary: "Accepted SourceRef/virtual-contribution boundary: nanoka sourceRefs contract is promoted, while virtual-agent contribution behavior remains implementation-owned.",
  },
  G15: {
    rulingId: "phase3-r015",
    summary: "Accepted failed-evidence ruling: nanoka has no Disorder formula endpoint/table, so the runtime formula remains implementation-owned with golden replay proof.",
  },
  G16: {
    rulingId: "phase3-r016",
    summary: "Accepted failed-evidence ruling: nanoka has no Disorder daze-level zone endpoint/table, so the runtime formula remains implementation-owned with golden replay proof.",
  },
  G17: {
    rulingId: "phase3-r017",
    summary: "Accepted DA boss max-HP source replacement for corrupted-shield cleanse; nanoka supplies period/boss context and core owns the 15% true-damage rule.",
  },
  G18: {
    rulingId: "phase3-r018",
    summary: "Accepted enemy variant source replacement for Greta plus implementation-owned part-break rule; level-stat formula remains blocked from runtime cutover until Phase 4.",
  },
  G19: {
    rulingId: "phase3-r019",
    summary: "Accepted Ruthless Fiend variant source replacement with daze-recovery semantic boundary; nanoka supplies raw enemy evidence and guide/core own the recovery formula.",
  },
  G20: {
    rulingId: "phase3-r020",
    summary: "Accepted Hati/Armored Hati variant source replacement with daze-recovery semantic boundary; nanoka supplies raw enemy evidence and guide/core own the recovery formula.",
  },
  G21: {
    rulingId: "phase3-r021",
    summary: "Accepted Yixuan panel/rupture source coverage with implementation-owned sheer defense-skip semantics; no runtime cutover is implied.",
  },
  G22: {
    rulingId: "phase3-r022",
    summary: "Accepted Nicole passive source coverage for the existing lo-user-approved defense-reduction replay; typed modifier template promotion remains a later source-backed transform task.",
  },
  G23: {
    rulingId: "phase3-r023",
    summary: "Accepted Yanagi passive/source-text coverage for the existing lo-user-approved disorder boost and polarity-disorder replay; typed modifier template promotion remains later.",
  },
  G24: {
    rulingId: "phase3-r024",
    summary: "Accepted Penguinboo numeric parity: nanoka live panel and active skill raw values reproduce the archived Excel Path X attack, daze, and anomaly-buildup values after unit conversion.",
  },
  G25: {
    rulingId: "phase3-r025",
    summary: "Accepted Sharkboo numeric parity: nanoka live panel and active skill raw values reproduce the archived Excel Path X attack, daze, and anomaly-buildup values after unit conversion.",
  },
  G26: {
    rulingId: "phase3-r026",
    summary: "Accepted Plugboo numeric and element parity: nanoka live panel/skill raw values reproduce the archived Excel Path X values and approved-live skill text proves electric element evidence.",
  },
  G27: {
    rulingId: "phase3-r027",
    summary: "Accepted new-source proof anchor: lo-user selected Yixuan 1371 for G27; approved-live nanoka evidence proves identity, panel/resource raw values, rupture fields, and promotion-extra source coverage without runtime cutover.",
  },
  G28: {
    rulingId: "phase3-r028",
    summary: "Accepted new-source proof anchor: lo-user selected Plugboo 54008 for G28; approved-live nanoka evidence proves Bangboo identity, level-60 panel, active-skill numeric values, and electric element text without runtime cutover.",
  },
}

const proofAnchorOwnerDecision = {
  sourceId: "lo-user-owner-decision",
  sourceVersion: "2026-05-15T18:11:57+08:00",
  sourceAnchor: "slock:#fairy/3d649e33",
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

function requiredNumber(value, label) {
  assert(typeof value === "number" && Number.isFinite(value), `${label}: numeric value is required`)
  return value
}

function panelValue(source, { baseKey, levelKey, growthKey, level = 60, promotionPhase = "6" }) {
  const base = requiredNumber(source.stats?.[baseKey], `stats.${baseKey}`)
  const levelBonus = requiredNumber(source.level?.[promotionPhase]?.[levelKey], `level.${promotionPhase}.${levelKey}`)
  const growth = requiredNumber(source.stats?.[growthKey], `stats.${growthKey}`)
  return Number((base + levelBonus + growth * (level - 1) / 10000).toFixed(8))
}

function yixuanProofValues() {
  const yixuan = readJson(join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json"))
  assert(yixuan.id === 1371, "G27 Yixuan proof source id drifted")
  const firstBasic = yixuan.skill?.basic?.description?.[4]?.param?.[0]?.param?.["1371001"]
  assert(firstBasic !== undefined, "G27 Yixuan proof skill param 1371001 is missing")

  return {
    identity: {
      id: yixuan.id,
      codeName: yixuan.code_name,
      name: yixuan.name,
    },
    level60Panel: {
      maxHp: panelValue(yixuan, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hp_growth" }),
      attack: panelValue(yixuan, { baseKey: "attack", levelKey: "attack", growthKey: "attack_growth" }),
      defence: panelValue(yixuan, { baseKey: "defence", levelKey: "defence", growthKey: "defence_growth" }),
      critRate: requiredNumber(yixuan.stats?.crit, "stats.crit") / 10000,
      critDamage: requiredNumber(yixuan.stats?.crit_damage, "stats.crit_damage") / 10000,
      anomalyMastery: requiredNumber(yixuan.stats?.element_abnormal_power, "stats.element_abnormal_power"),
      anomalyProficiency: requiredNumber(yixuan.stats?.element_mystery, "stats.element_mystery"),
      impact: requiredNumber(yixuan.stats?.break_stun, "stats.break_stun"),
    },
    resource: {
      maxAdrenaline: requiredNumber(yixuan.stats?.rp_max, "stats.rp_max"),
      automaticAdrenalineAccumulation: requiredNumber(yixuan.stats?.rp_recover, "stats.rp_recover") / 100,
      resonanceRecovery: requiredNumber(firstBasic.fever_recovery, "skill.basic.description.4.param.0.param.1371001.fever_recovery") / 1000,
      adrenalineRecovery: requiredNumber(firstBasic.rp_recovery, "skill.basic.description.4.param.0.param.1371001.rp_recovery") / 10000,
    },
    rupture: {
      ruptureLevel: requiredNumber(yixuan.stats?.rbl, "stats.rbl"),
      ruptureCorrectionFactor: requiredNumber(yixuan.stats?.rbl_correction_factor, "stats.rbl_correction_factor") / 10000,
      ruptureProbability: requiredNumber(yixuan.stats?.rbl_probability, "stats.rbl_probability") / 10000,
    },
  }
}

function plugbooProofValues() {
  const plugboo = readJson(join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json"))
  assert(plugboo.id === 54008, "G28 Plugboo proof source id drifted")
  const active = plugboo.skill_prop?.["5400801"]
  assert(active !== undefined, "G28 Plugboo proof active skill prop 5400801 is missing")

  return {
    identity: {
      id: plugboo.id,
      codeName: plugboo.code_name,
      name: plugboo.name,
    },
    level60Panel: {
      maxHp: panelValue(plugboo, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hpupgrade" }),
      attack: panelValue(plugboo, { baseKey: "attack", levelKey: "attack", growthKey: "attack_upgrade" }),
      defence: panelValue(plugboo, { baseKey: "defence", levelKey: "defence", growthKey: "def_upgrade" }),
      impact: requiredNumber(plugboo.stats?.break_stun, "stats.break_stun"),
      anomalyMastery: requiredNumber(plugboo.stats?.element_abnormal_power, "stats.element_abnormal_power"),
    },
    activeSkill: {
      damageMultiplier: requiredNumber(active["1001"]?.main, "skill_prop.5400801.1001.main") / 10000,
      dazeMultiplier: requiredNumber(active["1002"]?.main, "skill_prop.5400801.1002.main") / 10000,
      anomalyBuildup: requiredNumber(active.element_accumulation_value, "skill_prop.5400801.element_accumulation_value") / 100,
      element: "electric",
    },
  }
}

function proofAnchorRow({ header, anchorId, values }) {
  const spec = anchorCandidateSpecs[anchorId]
  const ruling = phase3Rulings[anchorId]
  assert(spec !== undefined, `${anchorId}: proof anchor spec is missing`)
  assert(ruling !== undefined, `${anchorId}: proof anchor ruling is missing`)
  const sampleEntity = spec.requiredSampleEntities[0]
  const sourceAnchor = rawAnchorForSample(sampleEntity, header.candidate.sourceVersion)
  assert(sourceAnchor !== null, `${anchorId}: proof anchor source fixture is missing for ${sampleEntity}`)

  return {
    entityType: spec.entityType,
    entityId: anchorId,
    fieldId: `goldenAnchors.${anchorId}.newSourceProof`,
    canonicalPath: `data.cleaned.golden.v1Replay.anchors.${anchorId}.newSourceProof`,
    fieldPath: `/anchors/${anchorId}/newSourceProof`,
    baselineSourceRef: {
      ...proofAnchorOwnerDecision,
      dataPath: `/${anchorId}`,
    },
    candidateSourceRef: {
      sourceId: "nanoka-zzz",
      sourceVersion: header.candidate.sourceVersion,
      sourceAnchor,
      dataPath: dataPathForSample(sampleEntity),
    },
    baselineValue: {
      ownerDecision: `${anchorId} = ${values.identity.name} (${values.identity.id})`,
      priorArchivedBaseline: "not-applicable-new-proof-anchor",
    },
    candidateValue: {
      coverageStatus: "new-source-proof-passed",
      expectedCandidate: spec.expectedCandidate,
      fieldIds: spec.fieldIds,
      requiredSampleEntities: spec.requiredSampleEntities,
      availableSampleEntities: spec.requiredSampleEntities,
      missingRequiredSampleEntities: [],
      normalizedValues: values,
      rulingSummary: ruling.summary,
    },
    status: "new",
    severity: "info",
    rulingStatus: "accepted",
    rulingId: ruling.rulingId,
    rulingDecisionLog: `${rulingDecisionLogPath}#${ruling.rulingId}-${anchorId.toLowerCase()}`,
    blockedBy: [],
    notes: ruling.summary,
  }
}

function buildG01G26Report({ syncId, generatedAt }) {
  const header = reportHeader({ syncId, generatedAt })
  const matrix = readJson(matrixPath)
  const rowsByFieldId = matrixRowsByFieldId(matrix)
  const replay = readJson(goldenReplayReportPath)
  const anchorIds = Array.from({ length: 26 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`)

  assert(JSON.stringify(replay.v1AnchorIds?.slice?.(0, 26)) === JSON.stringify(anchorIds), "G01-G26 replay anchor set must stay complete and ordered")
  assert(replay.summary?.passed >= 26, "G01-G26 replay report must have at least 26 passed anchors")
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
    const ruling = status === "semantic-mismatch" ? phase3Rulings[anchorId] : undefined
    const rulingStatus = ruling === undefined ? "pending" : "accepted"
    const blockedBy = rulingStatus === "pending"
      ? unique([
          "phase3:ruling-required",
          status === "missing" ? "phase3:candidate-source-missing" : "phase3:semantic-equivalence-ruling-required",
          ...matrixRows.flatMap(({ row }) => rowBlockers(row)),
        ])
      : []

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
        rulingSummary: ruling?.summary,
      },
      status,
      severity: rulingStatus === "pending" ? "blocking" : "info",
      rulingStatus,
      ...(ruling === undefined
        ? {}
        : {
            rulingId: ruling.rulingId,
            rulingDecisionLog: `${rulingDecisionLogPath}#${ruling.rulingId}-${anchorId.toLowerCase()}`,
          }),
      blockedBy,
      notes: status === "missing"
        ? `First sync is missing required approved-live nanoka candidate sample(s): ${missingRequiredSampleEntities.join(", ")}.`
        : ruling?.summary ?? "First sync has nanoka candidate coverage, but Phase 3 has not ruled semantic equivalence against the archived golden replay baseline.",
    }
  })

  return {
    ...header,
    counts: countsForRows(rows),
    rows,
    unresolvedCount: rows.filter(row => row.rulingStatus === "pending" || row.rulingStatus === "owner-required").length,
    notes: [
      "Phase 3 first sync compares G01-G26 archived golden replay baselines against real nanoka candidate coverage/status/source paths.",
      "This sync has Product/TL rulings for G01-G26, but it does not count as an exit-clean sync because G27/G28 and the two-clean-sync exit condition are still pending.",
      "Archived Excel, D-17 Mihoyo, and D-12 buhflipexplode sources are audit baselines only; they are not runtime fallback inputs.",
    ],
  }
}

function buildG27G28Report({ syncId, generatedAt }) {
  const header = reportHeader({ syncId, generatedAt })
  const previousRows = buildG01G26Report({ syncId: firstSyncId, generatedAt }).rows
  const rows = [
    ...previousRows,
    proofAnchorRow({ header, anchorId: "G27", values: yixuanProofValues() }),
    proofAnchorRow({ header, anchorId: "G28", values: plugbooProofValues() }),
  ]

  return {
    ...header,
    exitCleanSyncEligible: true,
    exitGateEvidence: {
      cleanSyncIds: [firstSyncId, syncId],
      anchorIds: Array.from({ length: 28 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`),
      goldenReplayStatus: "passed",
      requiredNewProofAnchorIds: ["G27", "G28"],
      previousCleanSyncId: firstSyncId,
      currentSyncId: syncId,
      notes: [
        "G01-G26 are accepted in phase3-sync-001-g01-g26.",
        "G27/G28 are lo-user-selected approved-live nanoka proof anchors.",
        "Runtime cutover remains disabled until Phase 4.",
      ],
    },
    counts: countsForRows(rows),
    rows,
    unresolvedCount: rows.filter(row => row.rulingStatus === "pending" || row.rulingStatus === "owner-required").length,
    notes: [
      "Phase 3 second sync carries forward accepted G01-G26 rulings and adds lo-user-selected G27/G28 approved-live nanoka proof anchors.",
      "This sync is exit-clean eligible for Phase 3 only; runtime cleaned-data cutover remains disabled until Phase 4.",
      "Archived Excel, D-17 Mihoyo, and D-12 buhflipexplode sources are audit baselines only; they are not runtime fallback inputs.",
    ],
  }
}

function buildReport({ syncId, generatedAt }) {
  if (syncId === defaultSyncId)
    return buildFoundationReport({ syncId, generatedAt })
  if (syncId === firstSyncId)
    return buildG01G26Report({ syncId, generatedAt })
  if (syncId === secondSyncId)
    return buildG27G28Report({ syncId, generatedAt })
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
  const statusLine = report.exitCleanSyncEligible
    ? "Phase 3 drift audit second sync with G27/G28 proof anchors"
    : hasRows ? "Phase 3 drift audit first G01-G26 sync" : "Phase 3 drift audit foundation fixture"
  const intro = report.exitCleanSyncEligible
    ? "This report carries forward accepted G01-G26 rulings, adds G27/G28 approved-live proof anchors, and records Phase 3 exit-clean evidence. Full runtime cutover remains disabled."
    : hasRows
    ? "This report compares archived G01-G26 replay baselines against nanoka candidate coverage/status/source paths and records Product/TL rulings. Full runtime cutover remains disabled."
    : `This report is a schema/verifier fixture. It intentionally contains no field
comparison rows; full G01-G26 comparison begins in the next Phase 3 slice.`
  const driftRows = hasRows
    ? report.rows
        .map(row => `| \`${row.entityId}\` | \`${row.fieldId}\` | \`${row.status}\` | \`${row.rulingStatus}\` | ${row.rulingId === undefined ? "" : `\`${row.rulingId}\``} | ${row.notes} |`)
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

Exit-clean sync eligible: **${report.exitCleanSyncEligible}**

${hasRows
  ? `## Drift Rows

| Entity | Field | Status | Ruling | Ruling ID | Notes |
|---|---|---|---|---|---|
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
      assert(row.rulingStatus !== "not-required", `${label}: non-same rows require explicit ruling queue status`)
      if (row.rulingStatus === "pending" || row.rulingStatus === "owner-required") {
        assert(row.severity === "blocking", `${label}: unresolved non-same rows must be blocking`)
        assert(row.blockedBy.length > 0, `${label}: unresolved non-same rows must carry blockers`)
        unresolvedCount += 1
      }
      else {
        assert(row.severity === "info", `${label}: resolved non-same rows must be informational`)
        assert(row.blockedBy.length === 0, `${label}: resolved non-same rows must not carry blockers`)
        assert(typeof row.rulingId === "string" && row.rulingId.length > 0, `${label}: resolved non-same rows require rulingId`)
        assert(typeof row.rulingDecisionLog === "string" && row.rulingDecisionLog.length > 0, `${label}: resolved non-same rows require rulingDecisionLog`)
        const [decisionLogPath] = row.rulingDecisionLog.split("#")
        assert(decisionLogPath === rulingDecisionLogPath, `${label}: rulingDecisionLog must point to ${rulingDecisionLogPath}`)
        const decisionLogText = readFileSync(join(repoRoot, decisionLogPath), "utf8")
        assert(decisionLogText.includes(row.rulingId), `${label}: rulingDecisionLog must contain ${row.rulingId}`)
      }
    }
  }

  assert(JSON.stringify(report.counts) === JSON.stringify(actualCounts), "counts must equal row status totals")
  assert(report.unresolvedCount === unresolvedCount, "unresolvedCount must equal pending/owner-required blocking rows")
}

function validateExitCleanEligibility(report, { syncId }) {
  if (!report.exitCleanSyncEligible)
    return

  assert(syncId !== defaultSyncId, `${syncId}: foundation sync cannot be exit-clean eligible`)
  assert(syncId !== firstSyncId, `${syncId}: first G01-G26 sync cannot be exit-clean eligible before G27/G28 and two clean sync evidence`)
  assert(report.runtimeCutoverReady === false, "exit-clean drift sync must still not cut runtime over")
  assert(report.unresolvedCount === 0, "exit-clean drift sync cannot have unresolved rows")

  const evidence = report.exitGateEvidence
  const expectedAnchorIds = Array.from({ length: 28 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`)
  const expectedProofAnchorIds = ["G27", "G28"]
  assert(evidence !== null && typeof evidence === "object" && !Array.isArray(evidence), "exitCleanSyncEligible requires exitGateEvidence")
  assert(typeof evidence.previousCleanSyncId === "string" && evidence.previousCleanSyncId.length > 0, "exitGateEvidence.previousCleanSyncId is required")
  assert(typeof evidence.currentSyncId === "string" && evidence.currentSyncId.length > 0, "exitGateEvidence.currentSyncId is required")
  assert(evidence.currentSyncId === syncId, "exitGateEvidence.currentSyncId must equal the verified syncId")
  assert(evidence.previousCleanSyncId !== syncId, "exitGateEvidence.previousCleanSyncId must be distinct from the current syncId")
  assert(evidence.previousCleanSyncId !== defaultSyncId, "foundation sync cannot count as clean sync evidence")
  assert(Array.isArray(evidence.cleanSyncIds), "exitGateEvidence.cleanSyncIds must be an array")
  assert(evidence.cleanSyncIds.length === new Set(evidence.cleanSyncIds).size, "exitGateEvidence.cleanSyncIds must be unique")
  assert(arrayEquals(evidence.cleanSyncIds, [evidence.previousCleanSyncId, evidence.currentSyncId]), "exitGateEvidence.cleanSyncIds must equal previous/current clean sync ids")
  assert(!evidence.cleanSyncIds.includes(defaultSyncId), "foundation sync cannot count as clean sync evidence")
  assert(arrayEquals(evidence.anchorIds, expectedAnchorIds), "exitGateEvidence.anchorIds must equal the complete G01-G28 anchor set")
  assert(arrayEquals(evidence.requiredNewProofAnchorIds, expectedProofAnchorIds), "exitGateEvidence.requiredNewProofAnchorIds must equal G27/G28")
  assert(evidence.goldenReplayStatus === "passed", "exitGateEvidence.goldenReplayStatus must be passed")
  const rowByEntityId = new Map(report.rows.map(row => [row.entityId, row]))
  for (const anchorId of expectedAnchorIds) {
    const row = rowByEntityId.get(anchorId)
    assert(row !== undefined, `exit-clean drift sync requires ${anchorId} row evidence`)
    assert(row.rulingStatus === "accepted", `exit-clean drift sync requires ${anchorId} accepted ruling`)
  }
  for (const anchorId of ["G27", "G28"]) {
    const row = rowByEntityId.get(anchorId)
    assert(row.status === "new", `exit-clean drift sync requires ${anchorId} new-source proof row`)
    assert(row.candidateValue?.coverageStatus === "new-source-proof-passed", `exit-clean drift sync requires ${anchorId} passed proof coverage`)
  }
  validateProofAnchorValues(rowByEntityId.get("G27"), yixuanProofValues(), "G27")
  validateProofAnchorValues(rowByEntityId.get("G28"), plugbooProofValues(), "G28")
  for (const cleanSyncId of evidence.cleanSyncIds) {
    const cleanReport = cleanSyncId === syncId
      ? report
      : readJson(reportPaths(cleanSyncId).rootJson)
    assert(cleanReport.unresolvedCount === 0, `${cleanSyncId}: clean sync evidence cannot have unresolved rows`)
    assert(cleanReport.runtimeCutoverReady === false, `${cleanSyncId}: clean sync evidence must not cut runtime over`)
  }
}

function validateProofAnchorValues(row, expectedValues, anchorId) {
  assert(row !== undefined, `${anchorId}: proof anchor row is required`)
  const actualValues = row.candidateValue?.normalizedValues
  assert(actualValues !== undefined, `${anchorId}: normalizedValues are required`)
  assert(JSON.stringify(actualValues) === JSON.stringify(expectedValues), `${anchorId}: proof anchor normalizedValues must match approved-live nanoka raw evidence`)
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
  assert(
    report.matrixStatus === matrix.status || report.matrixStatus === "phase-3-drift-foundation-gate",
    "matrixStatus must match current matrix or the historical Phase 3 drift gate",
  )
  assert(report.runtimeCutoverReady === false, "Phase 3 drift reports must not imply runtime cutover")
  assert(typeof report.exitCleanSyncEligible === "boolean", "exitCleanSyncEligible is required")
  validateExitCleanEligibility(report, { syncId })

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

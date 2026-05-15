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

const characterEntityIds = [
  1011,
  1021,
  1031,
  1041,
  1051,
  1061,
  1071,
  1081,
  1091,
  1101,
  1111,
  1121,
  1131,
  1141,
  1151,
  1161,
  1171,
  1181,
  1191,
  1201,
  1211,
  1221,
  1241,
  1251,
  1261,
  1271,
  1281,
  1291,
  1301,
  1311,
  1321,
  1331,
  1341,
  1351,
  1361,
  1371,
  1381,
  1391,
  1401,
  1411,
  1421,
  1431,
  1441,
  1451,
  1461,
  1471,
  1481,
  1491,
  1501,
  1511,
  1521,
  1531,
  1541,
]

const weaponEntityIds = [
  12001,
  12002,
  12003,
  12004,
  12005,
  12006,
  12007,
  12008,
  12009,
  12010,
  12011,
  12012,
  12013,
  12014,
  12015,
  13001,
  13002,
  13003,
  13004,
  13005,
  13006,
  13007,
  13008,
  13009,
  13010,
  13011,
  13012,
  13013,
  13014,
  13015,
  13016,
  13019,
  13020,
  13101,
  13103,
  13106,
  13108,
  13111,
  13112,
  13113,
  13115,
  13127,
  13128,
  13135,
  13142,
  13144,
  14001,
  14002,
  14003,
  14102,
  14104,
  14105,
  14107,
  14109,
  14110,
  14114,
  14116,
  14117,
  14118,
  14119,
  14120,
  14121,
  14122,
  14124,
  14125,
  14126,
  14129,
  14130,
  14131,
  14132,
  14133,
  14134,
  14136,
  14137,
  14138,
  14139,
  14140,
  14141,
  14143,
  14145,
  14146,
  14147,
  14148,
  14149,
  14150,
  14151,
  14152,
  14153,
  14154,
]

const bangbooEntityIds = [
  53001,
  53002,
  53003,
  53004,
  53005,
  53006,
  53007,
  53008,
  53009,
  53010,
  53011,
  53012,
  53013,
  53014,
  53015,
  53016,
  53017,
  53019,
  53021,
  54001,
  54002,
  54003,
  54004,
  54005,
  54006,
  54008,
  54009,
  54010,
  54011,
  54012,
  54013,
  54014,
  54015,
  54016,
  54017,
  54018,
  54019,
  54020,
  54021,
]

function characterEvidenceUse(entityId) {
  if (entityId === 1021)
    return "agent-panel-resonance-source-gate"
  if (entityId === 1371)
    return "adrenaline-resonance-source-gate"
  if (entityId === 1031)
    return "phase3-g22-passive-candidate-gate"
  if (entityId === 1221)
    return "phase3-g23-passive-candidate-gate"
  return "v1.2.x-character-batch-source-gate"
}

function bangbooEvidenceUse(entityId) {
  if (entityId === 54008)
    return "bangboo-panel-skill-source-gate"
  if (entityId === 53001)
    return "phase3-g24-bangboo-candidate-gate"
  if (entityId === 54001)
    return "phase3-g25-bangboo-candidate-gate"
  return "v1.2.1-bangboo-batch-source-gate"
}

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
  const characterAssets = [
    {
      id: "character-index",
      url: `https://static.nanoka.cc/zzz/${snapshot}/character.json`,
      path: "character.json",
      entityType: "characterIndex",
      approvedForCleanedOutput: true,
      evidenceUse: "v1.2.x-character-batch-source-gate",
    },
    ...characterEntityIds.map(entityId => ({
      id: `character-${entityId}`,
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/character/${entityId}.json`,
      path: `zh/character/${entityId}.json`,
      entityType: "character",
      language: "zh",
      entityId,
      approvedForCleanedOutput: true,
      evidenceUse: characterEvidenceUse(entityId),
    })),
  ]

  const bangbooAssets = [
    {
      id: "bangboo-index",
      url: `https://static.nanoka.cc/zzz/${snapshot}/bangboo.json`,
      path: "bangboo.json",
      entityType: "bangbooIndex",
      approvedForCleanedOutput: true,
      evidenceUse: "v1.2.1-bangboo-batch-source-gate",
    },
    ...bangbooEntityIds.map(entityId => ({
      id: `bangboo-${entityId}`,
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/bangboo/${entityId}.json`,
      path: `zh/bangboo/${entityId}.json`,
      entityType: "bangboo",
      language: "zh",
      entityId,
      approvedForCleanedOutput: true,
      evidenceUse: bangbooEvidenceUse(entityId),
    })),
  ]

  const weaponAssets = [
    {
      id: "weapon-index",
      url: `https://static.nanoka.cc/zzz/${snapshot}/weapon.json`,
      path: "weapon.json",
      entityType: "weaponIndex",
      approvedForCleanedOutput: true,
      evidenceUse: "v1.2.x-wengine-batch-source-gate",
    },
    ...weaponEntityIds.map(entityId => ({
      id: `weapon-${entityId}`,
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/weapon/${entityId}.json`,
      path: `zh/weapon/${entityId}.json`,
      entityType: "weapon",
      language: "zh",
      entityId,
      approvedForCleanedOutput: true,
      evidenceUse: entityId === 14137 ? "w-engine-identity-source-gate" : "v1.2.x-wengine-batch-source-gate",
    })),
  ]

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
    ...characterAssets,
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
    {
      id: "monster-dullahan-30000",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/30000.json`,
      path: "zh/monster/30000.json",
      entityType: "monster",
      language: "zh",
      entityId: 30000,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    {
      id: "monster-greta-30004",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/30004.json`,
      path: "zh/monster/30004.json",
      entityType: "monster",
      language: "zh",
      entityId: 30004,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    {
      id: "monster-ruthless-fiend-200141",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/200141.json`,
      path: "zh/monster/200141.json",
      entityType: "monster",
      language: "zh",
      entityId: 200141,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    {
      id: "monster-notorious-hati-200014",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/200014.json`,
      path: "zh/monster/200014.json",
      entityType: "monster",
      language: "zh",
      entityId: 200014,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    {
      id: "monster-notorious-armored-hati-200034",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/200034.json`,
      path: "zh/monster/200034.json",
      entityType: "monster",
      language: "zh",
      entityId: 200034,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    {
      id: "monster-miasma-priest-30033",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/30033.json`,
      path: "zh/monster/30033.json",
      entityType: "monster",
      language: "zh",
      entityId: 30033,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    {
      id: "monster-notorious-pompey-300211",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/monster/300211.json`,
      path: "zh/monster/300211.json",
      entityType: "monster",
      language: "zh",
      entityId: 300211,
      approvedForCleanedOutput: true,
      evidenceUse: "enemy-variant-mapping-source-gate",
    },
    ...bangbooAssets,
    ...weaponAssets,
    {
      id: "equipment-woodpecker-31000",
      url: `https://static.nanoka.cc/zzz/${snapshot}/zh/equipment/31000.json`,
      path: "zh/equipment/31000.json",
      entityType: "equipment",
      language: "zh",
      entityId: 31000,
      approvedForCleanedOutput: true,
      evidenceUse: "drive-disc-identity-source-gate",
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
  const characterIndex = readJson(join(sourceRoot, snapshot, "character.json"))
  const character = readJson(join(sourceRoot, snapshot, "zh/character/1021.json"))
  const sentinelCharacter = readJson(join(sourceRoot, snapshot, "zh/character/1371.json"))
  const nicoleCharacter = readJson(join(sourceRoot, snapshot, "zh/character/1031.json"))
  const yanagiCharacter = readJson(join(sourceRoot, snapshot, "zh/character/1221.json"))
  const boss = readJson(join(sourceRoot, snapshot, "zh/boss/69036.json"))
  const monsterSamples = [
    {
      id: "monster-dullahan-30000",
      expectedDetailId: 30000,
      expectedMonsterInfoId: 11154,
      path: "zh/monster/30000.json",
    },
    {
      id: "monster-greta-30004",
      expectedDetailId: 30004,
      expectedMonsterInfoId: 11301,
      path: "zh/monster/30004.json",
    },
    {
      id: "monster-ruthless-fiend-200141",
      expectedDetailId: 200141,
      expectedMonsterInfoId: 11521,
      path: "zh/monster/200141.json",
    },
    {
      id: "monster-notorious-hati-200014",
      expectedDetailId: 200014,
      expectedMonsterInfoId: 11195,
      path: "zh/monster/200014.json",
    },
    {
      id: "monster-notorious-armored-hati-200034",
      expectedDetailId: 200034,
      expectedMonsterInfoId: 11195,
      path: "zh/monster/200034.json",
    },
    {
      id: "monster-miasma-priest-30033",
      expectedDetailId: 30033,
      expectedMonsterInfoId: 31031,
      path: "zh/monster/30033.json",
    },
    {
      id: "monster-notorious-pompey-300211",
      expectedDetailId: 300211,
      expectedMonsterInfoId: 11881,
      path: "zh/monster/300211.json",
    },
  ].map((sample) => {
    const detail = readJson(join(sourceRoot, snapshot, sample.path))
    if (detail.id !== sample.expectedDetailId)
      throw new Error(`${sample.id}: monster detail id drifted`)
    if (detail.monster_id !== sample.expectedMonsterInfoId)
      throw new Error(`${sample.id}: monster_id drifted`)
    const canonicalInfo = detail.monster_info?.[String(sample.expectedMonsterInfoId)]
    if (canonicalInfo === undefined)
      throw new Error(`${sample.id}: missing canonical monster_info ${sample.expectedMonsterInfoId}`)
    return {
      id: sample.id,
      detailId: detail.id,
      monsterInfoId: detail.monster_id,
      name: detail.name,
      codeName: canonicalInfo.code_name,
      tag: canonicalInfo.tag,
      hasStats: canonicalInfo.stats !== undefined,
    }
  })
  const bangbooIndex = readJson(join(sourceRoot, snapshot, "bangboo.json"))
  const bangbooDetails = bangbooEntityIds.map((entityId) => {
    const indexEntry = bangbooIndex[String(entityId)]
    if (indexEntry === undefined)
      throw new Error(`bangboo index is missing ${entityId}`)
    const detail = readJson(join(sourceRoot, snapshot, `zh/bangboo/${entityId}.json`))
    if (detail.id !== entityId)
      throw new Error(`bangboo ${entityId}: detail id drifted`)
    if (detail.code_name !== indexEntry.codename)
      throw new Error(`bangboo ${entityId}: code_name drifted against index`)
    if (detail.name !== indexEntry.zh)
      throw new Error(`bangboo ${entityId}: zh name drifted against index`)
    return { indexEntry, detail }
  })
  const bangboo = bangbooDetails.find(({ detail }) => detail.id === 54008)?.detail
  const penguinboo = bangbooDetails.find(({ detail }) => detail.id === 53001)?.detail
  const sharkboo = bangbooDetails.find(({ detail }) => detail.id === 54001)?.detail
  const characterDetails = characterEntityIds.map((entityId) => {
    const indexEntry = characterIndex[String(entityId)]
    if (indexEntry === undefined)
      throw new Error(`character index is missing ${entityId}`)
    const detail = readJson(join(sourceRoot, snapshot, `zh/character/${entityId}.json`))
    if (detail.id !== entityId)
      throw new Error(`character ${entityId}: detail id drifted`)
    if (String(detail.code_name).toLowerCase() !== String(indexEntry.code).toLowerCase())
      throw new Error(`character ${entityId}: code_name drifted against index`)
    if (detail.name !== indexEntry.zh)
      throw new Error(`character ${entityId}: zh name drifted against index`)
    return { indexEntry, detail }
  })
  const weapon = readJson(join(sourceRoot, snapshot, "zh/weapon/14137.json"))
  const weaponIndex = readJson(join(sourceRoot, snapshot, "weapon.json"))
  const weaponDetails = weaponEntityIds.map((entityId) => {
    const indexEntry = weaponIndex[String(entityId)]
    if (indexEntry === undefined)
      throw new Error(`weapon index is missing ${entityId}`)
    const detail = readJson(join(sourceRoot, snapshot, `zh/weapon/${entityId}.json`))
    if (detail.id !== entityId)
      throw new Error(`weapon ${entityId}: detail id drifted`)
    if (detail.name !== indexEntry.zh)
      throw new Error(`weapon ${entityId}: zh name drifted against index`)
    return { indexEntry, detail }
  })
  const equipment = readJson(join(sourceRoot, snapshot, "zh/equipment/31000.json"))

  if (manifest.zzz?.live !== snapshot)
    throw new Error(`manifest.zzz.live=${manifest.zzz?.live} does not match snapshot ${snapshot}`)
  if (manifest.zzz?.latest === snapshot)
    throw new Error("nanoka live snapshot unexpectedly equals latest research snapshot")
  if (!Object.hasOwn(bossIndex, "69036"))
    throw new Error("boss index is missing sample DA boss 69036")
  if (Object.keys(characterIndex).length !== characterEntityIds.length)
    throw new Error(`character index count drifted: expected ${characterEntityIds.length}, got ${Object.keys(characterIndex).length}`)
  if (character.id !== 1021)
    throw new Error("character sample id drifted")
  if (sentinelCharacter.id !== 1371)
    throw new Error("sentinel character sample id drifted")
  if (nicoleCharacter.id !== 1031)
    throw new Error("Nicole character sample id drifted")
  if (yanagiCharacter.id !== 1221)
    throw new Error("Yanagi character sample id drifted")
  if (boss.id !== 69036)
    throw new Error("boss sample id drifted")
  if (Object.keys(bangbooIndex).length !== bangbooEntityIds.length)
    throw new Error(`bangboo index count drifted: expected ${bangbooEntityIds.length}, got ${Object.keys(bangbooIndex).length}`)
  if (bangboo?.id !== 54008)
    throw new Error("bangboo sample id drifted")
  if (penguinboo?.id !== 53001)
    throw new Error("Penguinboo sample id drifted")
  if (sharkboo?.id !== 54001)
    throw new Error("Sharkboo sample id drifted")
  if (weapon.id !== 14137)
    throw new Error("weapon sample id drifted")
  if (Object.keys(weaponIndex).length !== weaponEntityIds.length)
    throw new Error(`weapon index count drifted: expected ${weaponEntityIds.length}, got ${Object.keys(weaponIndex).length}`)
  if (equipment.id !== 31000)
    throw new Error("equipment sample id drifted")

  return {
    manifestLiveVersion: manifest.zzz.live,
    manifestLatestVersion: manifest.zzz.latest,
    bossIndexCount: Object.keys(bossIndex).length,
    characterBatch: {
      indexCount: Object.keys(characterIndex).length,
      retainedDetailCount: characterDetails.length,
      ids: characterDetails.map(({ detail }) => detail.id),
      approvedForCleanedOutputCount: assets.filter(asset => asset.entityType === "character" && asset.approvedForCleanedOutput === true).length,
    },
    characterSample: {
      id: character.id,
      codeName: character.code_name,
      hasStats: character.stats !== undefined,
      resourceRawPaths: [
        "/stats/rp_max",
        "/stats/rp_recover",
        "/skill_list/*/level/*/fever_recovery",
        "/skill_list/*/level/*/rp_recovery",
      ],
    },
    sentinelSample: {
      id: sentinelCharacter.id,
      codeName: sentinelCharacter.code_name,
      hasStats: sentinelCharacter.stats !== undefined,
      rpMaxRaw: sentinelCharacter.stats?.rp_max,
      rpRecoverRaw: sentinelCharacter.stats?.rp_recover,
      firstSkillParam: {
        id: 1371001,
        feverRecoveryRaw: sentinelCharacter.skill?.basic?.description?.[4]?.param?.[0]?.param?.["1371001"]?.fever_recovery,
        rpRecoveryRaw: sentinelCharacter.skill?.basic?.description?.[4]?.param?.[0]?.param?.["1371001"]?.rp_recovery,
      },
      rawPaths: [
        "/stats/rp_max",
        "/stats/rp_recover",
        "/skill/basic/description/4/param/0/param/1371001/fever_recovery",
        "/skill/basic/description/4/param/0/param/1371001/rp_recovery",
      ],
    },
    passiveCharacterSamples: [
      {
        id: nicoleCharacter.id,
        codeName: nicoleCharacter.code_name,
        hasStats: nicoleCharacter.stats !== undefined,
        skillKeys: Object.keys(nicoleCharacter.skill ?? {}),
      },
      {
        id: yanagiCharacter.id,
        codeName: yanagiCharacter.code_name,
        hasStats: yanagiCharacter.stats !== undefined,
        skillKeys: Object.keys(yanagiCharacter.skill ?? {}),
      },
    ],
    deadlyAssaultSample: {
      id: boss.id,
      zoneCount: Object.keys(boss.zone ?? {}).length,
      hasBossAdjust: boss.boss_adjust !== undefined,
    },
    enemySamples: {
      mappingCount: monsterSamples.length,
      canonicalMappings: monsterSamples.map(sample => ({
        detailId: sample.detailId,
        monsterInfoId: sample.monsterInfoId,
        name: sample.name,
        codeName: sample.codeName,
        tag: sample.tag,
        hasStats: sample.hasStats,
      })),
    },
    bangbooSample: {
      id: bangboo.id,
      codeName: bangboo.code_name,
      hasStats: bangboo.stats !== undefined,
      hasSkillProp: bangboo.skill_prop !== undefined,
    },
    bangbooCandidateSamples: [
      {
        id: penguinboo.id,
        codeName: penguinboo.code_name,
        hasStats: penguinboo.stats !== undefined,
        hasSkillProp: penguinboo.skill_prop !== undefined,
      },
      {
        id: sharkboo.id,
        codeName: sharkboo.code_name,
        hasStats: sharkboo.stats !== undefined,
        hasSkillProp: sharkboo.skill_prop !== undefined,
      },
    ],
    bangbooBatch: {
      indexCount: Object.keys(bangbooIndex).length,
      retainedDetailCount: bangbooDetails.length,
      ids: bangbooDetails.map(({ detail }) => detail.id),
      approvedForCleanedOutputCount: assets.filter(asset => asset.entityType === "bangboo" && asset.approvedForCleanedOutput === true).length,
    },
    wEngineSample: {
      id: weapon.id,
      codeName: weapon.code_name,
      hasBaseProperty: weapon.base_property !== undefined,
      hasRandProperty: weapon.rand_property !== undefined,
    },
    wEngineBatch: {
      indexCount: Object.keys(weaponIndex).length,
      retainedDetailCount: weaponDetails.length,
      ids: weaponDetails.map(({ detail }) => detail.id),
      approvedForCleanedOutputCount: assets.filter(asset => asset.entityType === "weapon" && asset.approvedForCleanedOutput === true).length,
    },
    driveDiscSample: {
      id: equipment.id,
      name: equipment.name,
      hasSetDescriptions: typeof equipment.desc2 === "string" && typeof equipment.desc4 === "string",
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
        `https://static.nanoka.cc/zzz/${snapshot}/character.json`,
        `https://static.nanoka.cc/zzz/${snapshot}/bangboo.json`,
        `https://static.nanoka.cc/zzz/${snapshot}/weapon.json`,
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
  if (summary.characterBatch?.indexCount !== manifest.summary?.characterBatch?.indexCount)
    throw new Error("character index count summary drifted")
  if (summary.characterBatch?.retainedDetailCount !== manifest.summary?.characterBatch?.retainedDetailCount)
    throw new Error("character retained detail count summary drifted")
  if (JSON.stringify(summary.characterBatch?.ids) !== JSON.stringify(manifest.summary?.characterBatch?.ids))
    throw new Error("character retained detail ids summary drifted")
  if (summary.deadlyAssaultSample.zoneCount !== manifest.summary?.deadlyAssaultSample?.zoneCount)
    throw new Error("DA sample zone count summary drifted")
  if (summary.sentinelSample?.rpMaxRaw !== manifest.summary?.sentinelSample?.rpMaxRaw)
    throw new Error("sentinel sample rp_max summary drifted")
  if (summary.sentinelSample?.firstSkillParam?.rpRecoveryRaw !== manifest.summary?.sentinelSample?.firstSkillParam?.rpRecoveryRaw)
    throw new Error("sentinel sample rp_recovery summary drifted")
  if (summary.enemySamples?.mappingCount !== manifest.summary?.enemySamples?.mappingCount)
    throw new Error("enemy sample mapping count summary drifted")
  if (summary.bangbooBatch?.indexCount !== manifest.summary?.bangbooBatch?.indexCount)
    throw new Error("Bangboo index count summary drifted")
  if (summary.bangbooBatch?.retainedDetailCount !== manifest.summary?.bangbooBatch?.retainedDetailCount)
    throw new Error("Bangboo retained detail count summary drifted")
  if (JSON.stringify(summary.bangbooBatch?.ids) !== JSON.stringify(manifest.summary?.bangbooBatch?.ids))
    throw new Error("Bangboo retained detail ids summary drifted")
  if (summary.wEngineBatch?.indexCount !== manifest.summary?.wEngineBatch?.indexCount)
    throw new Error("W-Engine index count summary drifted")
  if (summary.wEngineBatch?.retainedDetailCount !== manifest.summary?.wEngineBatch?.retainedDetailCount)
    throw new Error("W-Engine retained detail count summary drifted")
  if (JSON.stringify(summary.wEngineBatch?.ids) !== JSON.stringify(manifest.summary?.wEngineBatch?.ids))
    throw new Error("W-Engine retained detail ids summary drifted")

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

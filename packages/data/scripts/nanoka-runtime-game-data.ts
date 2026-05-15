import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseGameData, type GameData, type SourceRef } from "../../core/src/index"
import { assertNanokaRuntimeGameDataArtifact } from "../src/runtime-policy"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const generatedAt = "2026-05-15T18:46:10+08:00"
const sourceVersion = "2.8"
const rootArtifactPath = join(repoRoot, "data/cleaned/runtime/game-data.json")
const packageArtifactPath = join(packageDir, "cleaned/runtime/game-data.json")
const yixuanPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")
const plugbooPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json")

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(message)
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function requiredNumber(value: unknown, label: string): number {
  assert(typeof value === "number" && Number.isFinite(value), `${label}: numeric value is required`)
  return value
}

function panelValue(
  source: Record<string, any>,
  { baseKey, levelKey, growthKey, level = 60, promotionPhase = "6" }: {
    baseKey: string
    levelKey: string
    growthKey: string
    level?: number
    promotionPhase?: string
  },
): number {
  const base = requiredNumber(source.stats?.[baseKey], `stats.${baseKey}`)
  const levelBonus = requiredNumber(source.level?.[promotionPhase]?.[levelKey], `level.${promotionPhase}.${levelKey}`)
  const growth = requiredNumber(source.stats?.[growthKey], `stats.${growthKey}`)
  return Number((base + levelBonus + growth * (level - 1) / 10000).toFixed(8))
}

function sourceRef(sourceAnchor: string, dataPath: string): SourceRef {
  return {
    sourceId: "nanoka-zzz",
    sourceVersion,
    sourceAnchor,
    dataPath,
  }
}

function yixuanProofValues() {
  const yixuan = readJson<Record<string, any>>(yixuanPath)
  assert(yixuan.id === 1371, "Yixuan runtime source id drifted")
  const firstBasic = yixuan.skill?.basic?.description?.[4]?.param?.[0]?.param?.["1371001"]
  assert(firstBasic !== undefined, "Yixuan first basic param 1371001 is missing")

  return {
    raw: yixuan,
    identity: {
      id: yixuan.id,
      codeName: String(yixuan.code_name),
      name: String(yixuan.name),
    },
    level60Panel: {
      maxHp: panelValue(yixuan, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hp_growth" }),
      attack: panelValue(yixuan, { baseKey: "attack", levelKey: "attack", growthKey: "attack_growth" }),
      defense: panelValue(yixuan, { baseKey: "defence", levelKey: "defence", growthKey: "defence_growth" }),
      impact: requiredNumber(yixuan.stats?.break_stun, "stats.break_stun"),
      critRate: requiredNumber(yixuan.stats?.crit, "stats.crit") / 10000,
      critDamage: requiredNumber(yixuan.stats?.crit_damage, "stats.crit_damage") / 10000,
      anomalyMastery: requiredNumber(yixuan.stats?.element_abnormal_power, "stats.element_abnormal_power"),
      anomalyProficiency: requiredNumber(yixuan.stats?.element_mystery, "stats.element_mystery"),
      sheerForce: Number((panelValue(yixuan, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hp_growth" }) * 0.1).toFixed(8)),
    },
    resource: {
      maxAdrenaline: requiredNumber(yixuan.stats?.rp_max, "stats.rp_max"),
      automaticAdrenalineAccumulation: requiredNumber(yixuan.stats?.rp_recover, "stats.rp_recover") / 100,
      resonanceRecovery: requiredNumber(firstBasic.fever_recovery, "skill.basic.description.4.param.0.param.1371001.fever_recovery") / 1000,
      adrenalineRecovery: requiredNumber(firstBasic.rp_recovery, "skill.basic.description.4.param.0.param.1371001.rp_recovery") / 10000,
    },
    firstBasic: {
      damageMultiplier: requiredNumber(firstBasic.damage_percentage, "skill.basic.description.4.param.0.param.1371001.damage_percentage") / 10000,
      dazeMultiplier: requiredNumber(firstBasic.stun_ratio, "skill.basic.description.4.param.0.param.1371001.stun_ratio") / 10000,
    },
  }
}

function plugbooProofValues() {
  const plugboo = readJson<Record<string, any>>(plugbooPath)
  assert(plugboo.id === 54008, "Plugboo runtime source id drifted")
  const active = plugboo.skill_prop?.["5400801"]
  assert(active !== undefined, "Plugboo active skill prop 5400801 is missing")

  return {
    raw: plugboo,
    identity: {
      id: plugboo.id,
      codeName: String(plugboo.code_name),
      name: String(plugboo.name),
    },
    level60Panel: {
      maxHp: panelValue(plugboo, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hpupgrade" }),
      attack: panelValue(plugboo, { baseKey: "attack", levelKey: "attack", growthKey: "attack_upgrade" }),
      defense: panelValue(plugboo, { baseKey: "defence", levelKey: "defence", growthKey: "def_upgrade" }),
      impact: requiredNumber(plugboo.stats?.break_stun, "stats.break_stun"),
      critRate: requiredNumber(plugboo.stats?.crit, "stats.crit") / 10000,
      critDamage: requiredNumber(plugboo.stats?.crit_dmg, "stats.crit_dmg") / 10000,
      anomalyMastery: requiredNumber(plugboo.stats?.element_abnormal_power, "stats.element_abnormal_power"),
    },
    activeSkill: {
      damageMultiplier: requiredNumber(active["1001"]?.main, "skill_prop.5400801.1001.main") / 10000,
      dazeMultiplier: requiredNumber(active["1002"]?.main, "skill_prop.5400801.1002.main") / 10000,
      anomalyBuildup: requiredNumber(active.element_accumulation_value, "skill_prop.5400801.element_accumulation_value") / 100,
      element: "electric" as const,
    },
  }
}

function buildArtifact() {
  const yixuan = yixuanProofValues()
  const plugboo = plugbooProofValues()
  const yixuanAnchor = "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json"
  const plugbooAnchor = "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json"
  const yixuanSource = sourceRef(yixuanAnchor, "/")
  const yixuanSkillSource = sourceRef(yixuanAnchor, "/skill/basic/description/4/param/0/param/1371001")
  const plugbooSource = sourceRef(plugbooAnchor, "/")
  const plugbooSkillSource = sourceRef(plugbooAnchor, "/skill_prop/5400801")

  const data: GameData = {
    schemaVersion: "fairy-game-data-v0.1.0",
    gameVersion: "ZZZ-2.8",
    dataVersion: "0.1.0",
    sourceVersion: "nanoka-zzz@2.8",
    generatedAt,
    sources: [
      {
        id: "nanoka-zzz",
        kind: "thirdPartySite",
        url: "https://static.nanoka.cc/manifest.json",
        gameVersion: "ZZZ-2.8",
        sourceVersion,
        fetchedAt: "2026-05-15T17:15:00+08:00",
        parsedAt: generatedAt,
        parserVersion: "nanoka-runtime-cutover-v0.1.0",
        licenseNote: "Runtime cleaned data uses lo-user-approved nanoka live 2.8 evidence; archived Excel/D-17/D-12 sources are retained for audit only.",
      },
    ],
    agents: {
      "1371": {
        id: "1371",
        label: { zh: yixuan.identity.name, en: "Yixuan" },
        source: yixuanSource,
        attribute: "auricInk",
        agentSpecialty: "rupture",
        baseStatsByLevel: {
          "60": yixuan.level60Panel,
        },
        skillIds: ["1371001"],
        sourceAliases: [yixuan.identity.name, yixuan.identity.codeName, "Yixuan"],
      },
    },
    skills: {
      "1371001": {
        id: "1371001",
        agentId: "1371",
        label: { zh: "普通攻击：霄云劲（一段）", en: "Basic Attack: Xiao Yun Jin (Hit 1)" },
        source: yixuanSkillSource,
        tags: ["basic"],
        attribute: "auricInk",
        segments: [
          {
            id: "1371001-hit-1",
            levelKey: "1",
            multiplierByLevel: { "1": yixuan.firstBasic.damageMultiplier },
            dazeMultiplierByLevel: { "1": yixuan.firstBasic.dazeMultiplier },
            resonanceRecoveryByLevel: { "1": yixuan.resource.resonanceRecovery },
            adrenalineRecoveryByLevel: { "1": yixuan.resource.adrenalineRecovery },
            damageType: "regular",
            hitCount: 1,
            defaultTags: ["basic"],
            source: yixuanSkillSource,
          },
        ],
      },
    },
    bangboos: {
      "54008": {
        id: "54008",
        label: { zh: plugboo.identity.name, en: "Plugboo" },
        source: plugbooSource,
        baseStatsByLevel: {
          "60": plugboo.level60Panel,
        },
        skillIds: ["5400801"],
        sourceAliases: [plugboo.identity.name, plugboo.identity.codeName, "Plugboo"],
      },
    },
    bangbooSkills: {
      "5400801": {
        id: "5400801",
        bangbooId: "54008",
        label: { zh: "电流狙击", en: "Electric Current Snipe" },
        source: plugbooSkillSource,
        tags: ["special"],
        segments: [
          {
            id: "5400801-hit",
            levelKey: "1",
            multiplierByLevel: { "1": plugboo.activeSkill.damageMultiplier },
            dazeMultiplierByLevel: { "1": plugboo.activeSkill.dazeMultiplier },
            damageType: "regular",
            hitCount: 1,
            defaultTags: ["special"],
            source: plugbooSkillSource,
          },
        ],
      },
    },
    wEngines: {},
    driveDiscs: {},
    enemies: {},
    resonium: {},
    modifiers: {},
    rules: {
      runtimePrimarySourceId: "nanoka-zzz",
      configuredLiveVersion: sourceVersion,
      runtimeCutoverReady: true,
      archivedRuntimeSourcesAllowed: false,
      driveDiscSlotAndSubstatTables: "out-of-scope:user-provided-snapshot-final-panel",
      implementationOwnedFormulaBoundary: ["rules.disorderFormula", "rules.disorderDazeLevelZone"],
    },
    aliases: {
      fields: {
        defence: "defense",
        rp: "adrenaline",
        fever: "resonance",
      },
      enumValues: {
        "element_type.205": "auricInk",
        "specialty.rupture": "rupture",
      },
      sourceTerms: {
        "玄墨": "auricInk",
        "闪能": "adrenaline",
        "喧响值": "resonance",
        "电属性伤害": "electric",
      },
    },
  }

  parseGameData(data)

  const artifact = {
    kind: "gameData",
    schemaVersion: "cleaned-game-data-artifact/v0.1",
    dataVersion: "fairy-v0.1.0-nanoka-runtime",
    generatedAt,
    sourceManifestPath: "data/source/source-manifest.json",
    runtimeCutoverReady: true,
    runtimeSourcePolicy: {
      primarySourceId: "nanoka-zzz",
      configuredLiveVersion: sourceVersion,
      deprecatedRuntimeSourceIds: [
        "lo-user-excel",
        "mihoyo-zzz-critical-assault",
        "buhflipexplode-zzz-da",
        "nanoka-zzz-boss-manual-2026-05-07",
      ],
      archivedSourcesRuntimeAllowed: false,
      phase3ExitSyncId: "phase3-sync-002-g27-g28",
    },
    data,
  }
  assertNanokaRuntimeGameDataArtifact(artifact)
  return artifact
}

function assertArtifactFresh(): void {
  const expected = buildArtifact()
  const actualRoot = readJson<unknown>(rootArtifactPath)
  const actualPackage = readJson<unknown>(packageArtifactPath)
  if (JSON.stringify(actualRoot) !== JSON.stringify(expected))
    throw new Error("Runtime game data artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackage) !== JSON.stringify(expected))
    throw new Error("Package runtime game data mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  assertNanokaRuntimeGameDataArtifact(actualRoot)
  assertNanokaRuntimeGameDataArtifact(actualPackage)
}

function auditCommand(): void {
  const artifact = buildArtifact()
  writeJson(rootArtifactPath, artifact)
  writeJson(packageArtifactPath, artifact)
}

function verifyCommand(): void {
  if (!existsSync(rootArtifactPath))
    throw new Error("Missing data/cleaned/runtime/game-data.json; run audit:nanoka-runtime first")
  if (!existsSync(packageArtifactPath))
    throw new Error("Missing packages/data/cleaned/runtime/game-data.json; run audit:nanoka-runtime first")
  assertArtifactFresh()
}

const command = process.argv[2] ?? "verify"
if (command === "audit")
  auditCommand()
else if (command === "verify")
  verifyCommand()
else
  throw new Error(`Unknown command: ${command}`)

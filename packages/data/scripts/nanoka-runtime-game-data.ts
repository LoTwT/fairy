import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseGameData, type BangbooData, type BangbooSkillData, type GameData, type SourceRef } from "../../core/src/index"
import { deriveNanokaBangbooElement } from "../src/nanoka-bangboo-element"
import { assertNanokaRuntimeGameDataArtifact } from "../src/runtime-policy"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const generatedAt = "2026-05-15T20:56:00+08:00"
const sourceVersion = "2.8"
const rootArtifactPath = join(repoRoot, "data/cleaned/runtime/game-data.json")
const packageArtifactPath = join(packageDir, "cleaned/runtime/game-data.json")
const rootBangbooBatchAuditPath = join(repoRoot, "data/cleaned/audit/nanoka-bangboo-batch-audit.json")
const packageBangbooBatchAuditPath = join(packageDir, "cleaned/audit/nanoka-bangboo-batch-audit.json")
const yixuanPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")
const bangbooIndexPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/bangboo.json")
const bangbooSourceDir = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/bangboo")

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

type BangbooIndexEntry = {
  codename?: string
  en?: string
  zh?: string
}

type BangbooSkillSection = {
  level?: Record<string, {
    name?: string
    desc?: string
    property?: string[]
    param?: string
  }>
}

type BangbooRaw = Record<string, any> & {
  id: number
  code_name: string
  name: string
  skill?: Record<string, BangbooSkillSection>
  skill_prop?: Record<string, any>
}

type BangbooRuntimeBuild = {
  bangboos: Record<string, BangbooData>
  bangbooSkills: Record<string, BangbooSkillData>
  audit: unknown
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))]
}

function bangbooAnchor(entityId: string | number): string {
  return `data/source/raw/nanoka/zzz/2.8/zh/bangboo/${entityId}.json`
}

function readBangbooRaw(entityId: string): BangbooRaw {
  return readJson<BangbooRaw>(join(bangbooSourceDir, `${entityId}.json`))
}

function bangbooPanel(source: BangbooRaw) {
  return {
    maxHp: panelValue(source, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hpupgrade" }),
    attack: panelValue(source, { baseKey: "attack", levelKey: "attack", growthKey: "attack_upgrade" }),
    defense: panelValue(source, { baseKey: "defence", levelKey: "defence", growthKey: "def_upgrade" }),
    impact: requiredNumber(source.stats?.break_stun, `bangboo.${source.id}.stats.break_stun`),
    critRate: requiredNumber(source.stats?.crit, `bangboo.${source.id}.stats.crit`) / 10000,
    critDamage: requiredNumber(source.stats?.crit_dmg, `bangboo.${source.id}.stats.crit_dmg`) / 10000,
    anomalyMastery: requiredNumber(source.stats?.element_abnormal_power, `bangboo.${source.id}.stats.element_abnormal_power`),
  }
}

function skillTag(sectionKey: string): "special" | "chain" | "followUp" {
  if (sectionKey === "c")
    return "chain"
  if (sectionKey === "b")
    return "followUp"
  return "special"
}

function splitParam(param: string, label: string): string[] {
  const parts = param.split("|")
  assert(parts.length > 0, `${label}: skill param must not be empty`)
  return parts
}

function expressionSkillPropIds(expression: string): string[] {
  const ids = new Set<string>()
  for (const match of expression.matchAll(/\{Skill:(\d+), Prop:(1001|1002)\}/g))
    ids.add(match[1]!)
  return [...ids]
}

function evaluateSkillPropExpression(
  source: BangbooRaw,
  expression: string,
  propKey: "1001" | "1002",
  label: string,
): { value: number, skillPropIds: string[] } {
  const skillPropIds: string[] = []
  let arithmetic = expression.replace(/\{Skill:(\d+), Prop:(1001|1002)\}/g, (_match, skillId: string, propId: string) => {
    assert(propId === propKey, `${label}: expected Prop:${propKey}, got Prop:${propId}`)
    const raw = requiredNumber(source.skill_prop?.[skillId]?.[propId]?.main, `${label}: skill_prop.${skillId}.${propId}.main`)
    skillPropIds.push(skillId)
    return String(raw)
  })

  assert(skillPropIds.length > 0, `${label}: missing Skill:${propKey} reference`)
  arithmetic = arithmetic.replaceAll("{", "(").replaceAll("}", ")").replace(/\s+/g, "")
  assert(/^[\d.+\-*/()]+$/.test(arithmetic), `${label}: unsupported skill expression ${expression}`)

  // Expressions are source-authored arithmetic over raw basis-point values.
  const rawValue = Function(`"use strict"; return (${arithmetic})`)()
  assert(typeof rawValue === "number" && Number.isFinite(rawValue), `${label}: expression did not evaluate to a finite number`)

  return {
    value: Number((rawValue / 10000).toFixed(8)),
    skillPropIds: uniqueStrings(skillPropIds),
  }
}

function damagePairs(properties: string[], sectionLabel: string): Array<{ damageIndex: number, dazeIndex: number, labelSuffix?: string }> {
  const pairs: Array<{ damageIndex: number, dazeIndex: number, labelSuffix?: string }> = []
  for (let index = 0; index < properties.length - 1; index += 1) {
    const damageProperty = properties[index]!
    const dazeProperty = properties[index + 1]!
    if (!damageProperty.includes("伤害倍率") || !dazeProperty.includes("失衡倍率"))
      continue

    const labelSuffix = damageProperty
      .replace("伤害倍率", "")
      .replace(/^[[【]/, "")
      .replace(/[\]】]$/, "")
      .trim()
    pairs.push({
      damageIndex: index,
      dazeIndex: index + 1,
      labelSuffix: labelSuffix.length > 0 ? labelSuffix : undefined,
    })
  }

  assert(new Set(pairs.map(pair => `${pair.damageIndex}:${pair.dazeIndex}`)).size === pairs.length, `${sectionLabel}: duplicate damage/daze pair`)
  return pairs
}

function buildBangbooRuntimeBatch(): BangbooRuntimeBuild {
  const index = readJson<Record<string, BangbooIndexEntry>>(bangbooIndexPath)
  const bangbooIds = Object.keys(index).sort((left, right) => Number(left) - Number(right))
  assert(bangbooIds.length === 39, `Bangboo runtime batch expected 39 live Bangboos, got ${bangbooIds.length}`)

  const bangboos: Record<string, BangbooData> = {}
  const bangbooSkills: Record<string, BangbooSkillData> = {}
  const auditRows: any[] = []

  for (const bangbooId of bangbooIds) {
    const indexEntry = index[bangbooId]!
    const raw = readBangbooRaw(bangbooId)
    const numericId = Number(bangbooId)
    assert(raw.id === numericId, `Bangboo ${bangbooId}: raw id drifted`)
    assert(raw.code_name === indexEntry.codename, `Bangboo ${bangbooId}: code_name drifted against index`)
    assert(raw.name === indexEntry.zh, `Bangboo ${bangbooId}: zh name drifted against index`)

    const anchor = bangbooAnchor(bangbooId)
    const bangbooSource = sourceRef(anchor, "/")
    const panel = bangbooPanel(raw)
    const skillIds: string[] = []
    const skillAuditRows: any[] = []

    for (const sectionKey of Object.keys(raw.skill ?? {}).sort()) {
      const section = raw.skill?.[sectionKey]
      const levelOne = section?.level?.["1"]
      if (levelOne === undefined) {
        skillAuditRows.push({ sectionKey, status: "not-promoted", reason: "missing-level-1" })
        continue
      }

      const properties = Array.isArray(levelOne.property) ? levelOne.property : []
      const param = typeof levelOne.param === "string" ? levelOne.param : ""
      const pairs = damagePairs(properties, `Bangboo ${bangbooId} skill ${sectionKey}`)
      if (pairs.length === 0) {
        skillAuditRows.push({
          sectionKey,
          sourceName: levelOne.name,
          status: "not-promoted",
          reason: "no-damage-daze-pair-in-current-runtime-schema",
          properties,
        })
        continue
      }

      const paramParts = splitParam(param, `Bangboo ${bangbooId} skill ${sectionKey}`)
      const segmentBuilds = pairs.map((pair, pairIndex) => {
        const damageExpression = paramParts[pair.damageIndex]
        const dazeExpression = paramParts[pair.dazeIndex]
        assert(damageExpression !== undefined, `Bangboo ${bangbooId} skill ${sectionKey}: missing damage param ${pair.damageIndex}`)
        assert(dazeExpression !== undefined, `Bangboo ${bangbooId} skill ${sectionKey}: missing daze param ${pair.dazeIndex}`)
        const damage = evaluateSkillPropExpression(raw, damageExpression, "1001", `Bangboo ${bangbooId} skill ${sectionKey} damage`)
        const daze = evaluateSkillPropExpression(raw, dazeExpression, "1002", `Bangboo ${bangbooId} skill ${sectionKey} daze`)
        return {
          pairIndex,
          labelSuffix: pair.labelSuffix,
          damage,
          daze,
          damageExpression,
          dazeExpression,
        }
      })

      const referencedSkillPropIds = uniqueStrings(segmentBuilds.flatMap(segment => [
        ...segment.damage.skillPropIds,
        ...segment.daze.skillPropIds,
      ]))
      const skillId = segmentBuilds.length === 1 && referencedSkillPropIds.length === 1
        ? referencedSkillPropIds[0]!
        : `${bangbooId}-${sectionKey}`
      assert(bangbooSkills[skillId] === undefined, `Duplicate Bangboo runtime skill id ${skillId}`)

      const sectionSource = sourceRef(anchor, `/skill/${sectionKey}/level/1`)
      const tag = skillTag(sectionKey)
      const sourceName = String(levelOne.name ?? `${raw.name} ${sectionKey}`)
      bangbooSkills[skillId] = {
        id: skillId,
        bangbooId,
        label: { zh: sourceName },
        source: sectionSource,
        tags: [tag],
        segments: segmentBuilds.map((segment, index) => ({
          id: segmentBuilds.length === 1 ? `${skillId}-hit` : `${skillId}-hit-${index + 1}`,
          levelKey: "1",
          multiplierByLevel: { "1": segment.damage.value },
          dazeMultiplierByLevel: { "1": segment.daze.value },
          damageType: "regular",
          hitCount: 1,
          defaultTags: [tag],
          source: sectionSource,
        })),
      }
      skillIds.push(skillId)
      skillAuditRows.push({
        sectionKey,
        sourceName,
        status: "promoted",
        runtimeSkillId: skillId,
        referencedSkillPropIds,
        segmentCount: segmentBuilds.length,
        segments: segmentBuilds.map(segment => ({
          labelSuffix: segment.labelSuffix,
          damageExpression: segment.damageExpression,
          dazeExpression: segment.dazeExpression,
          damageMultiplier: segment.damage.value,
          dazeMultiplier: segment.daze.value,
        })),
      })
    }

    let elementAudit: unknown
    try {
      const element = deriveNanokaBangbooElement(raw, {
        sourceVersion,
        bangbooId: numericId,
      })
      elementAudit = {
        status: "derived",
        attribute: element.attribute,
        evidenceCount: element.evidence.length,
        sourcePaths: uniqueStrings(element.evidence.map(item => item.sourcePath)),
      }
    }
    catch (error) {
      elementAudit = {
        status: "not-promoted",
        reason: error instanceof Error ? error.message : String(error),
      }
    }

    bangboos[bangbooId] = {
      id: bangbooId,
      label: { zh: raw.name, en: indexEntry.en },
      source: bangbooSource,
      baseStatsByLevel: {
        "60": panel,
      },
      skillIds,
      sourceAliases: uniqueStrings([raw.name, raw.code_name, indexEntry.en, indexEntry.codename]),
    }

    auditRows.push({
      id: bangbooId,
      codeName: raw.code_name,
      label: { zh: raw.name, en: indexEntry.en },
      source: bangbooSource,
      level60Panel: panel,
      rawSkillPropCount: Object.keys(raw.skill_prop ?? {}).length,
      promotedSkillCount: skillIds.length,
      skillSections: skillAuditRows,
      element: elementAudit,
    })
  }

  const promotedSkillCount = Object.keys(bangbooSkills).length
  const audit = {
    kind: "nanokaBangbooBatchAudit",
    schemaVersion: "nanoka-bangboo-batch-audit/v0.1",
    sourceId: "nanoka-zzz",
    sourceVersion,
    generatedAt,
    runtimeCutoverReady: true,
    indexSource: sourceRef("data/source/raw/nanoka/zzz/2.8/bangboo.json", "/"),
    summary: {
      bangbooCount: bangbooIds.length,
      runtimeBangbooCount: Object.keys(bangboos).length,
      promotedSkillCount,
      bangbooIds,
      noRuntimeSkillBangbooIds: auditRows.filter(row => row.promotedSkillCount === 0).map(row => row.id),
      elementDerivedCount: auditRows.filter(row => row.element?.status === "derived").length,
      elementNotPromotedCount: auditRows.filter(row => row.element?.status !== "derived").length,
    },
    bangboos: auditRows,
  }

  return { bangboos, bangbooSkills, audit }
}

function buildArtifact() {
  const yixuan = yixuanProofValues()
  const bangbooBatch = buildBangbooRuntimeBatch()
  const yixuanAnchor = "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json"
  const yixuanSource = sourceRef(yixuanAnchor, "/")
  const yixuanSkillSource = sourceRef(yixuanAnchor, "/skill/basic/description/4/param/0/param/1371001")

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
        fetchedAt: "2026-05-15T20:56:00+08:00",
        parsedAt: generatedAt,
        parserVersion: "nanoka-runtime-bangboo-batch-v0.1.0",
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
    bangboos: bangbooBatch.bangboos,
    bangbooSkills: bangbooBatch.bangbooSkills,
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
        "火属性伤害": "fire",
        "电属性伤害": "electric",
        "冰属性伤害": "ice",
        "物理伤害": "physical",
        "以太伤害": "ether",
        "烈霜伤害": "frost",
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
  return {
    artifact,
    bangbooBatchAudit: bangbooBatch.audit,
  }
}

function assertArtifactFresh(): void {
  const { artifact: expected, bangbooBatchAudit: expectedBangbooBatchAudit } = buildArtifact()
  const actualRoot = readJson<unknown>(rootArtifactPath)
  const actualPackage = readJson<unknown>(packageArtifactPath)
  const actualRootBangbooBatchAudit = readJson<unknown>(rootBangbooBatchAuditPath)
  const actualPackageBangbooBatchAudit = readJson<unknown>(packageBangbooBatchAuditPath)
  if (JSON.stringify(actualRoot) !== JSON.stringify(expected))
    throw new Error("Runtime game data artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackage) !== JSON.stringify(expected))
    throw new Error("Package runtime game data mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualRootBangbooBatchAudit) !== JSON.stringify(expectedBangbooBatchAudit))
    throw new Error("Bangboo batch audit artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackageBangbooBatchAudit) !== JSON.stringify(expectedBangbooBatchAudit))
    throw new Error("Package Bangboo batch audit mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  assertNanokaRuntimeGameDataArtifact(actualRoot)
  assertNanokaRuntimeGameDataArtifact(actualPackage)
}

function auditCommand(): void {
  const { artifact, bangbooBatchAudit } = buildArtifact()
  writeJson(rootArtifactPath, artifact)
  writeJson(packageArtifactPath, artifact)
  writeJson(rootBangbooBatchAuditPath, bangbooBatchAudit)
  writeJson(packageBangbooBatchAuditPath, bangbooBatchAudit)
}

function verifyCommand(): void {
  if (!existsSync(rootArtifactPath))
    throw new Error("Missing data/cleaned/runtime/game-data.json; run audit:nanoka-runtime first")
  if (!existsSync(packageArtifactPath))
    throw new Error("Missing packages/data/cleaned/runtime/game-data.json; run audit:nanoka-runtime first")
  if (!existsSync(rootBangbooBatchAuditPath))
    throw new Error("Missing data/cleaned/audit/nanoka-bangboo-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(packageBangbooBatchAuditPath))
    throw new Error("Missing packages/data/cleaned/audit/nanoka-bangboo-batch-audit.json; run audit:nanoka-runtime first")
  assertArtifactFresh()
}

const command = process.argv[2] ?? "verify"
if (command === "audit")
  auditCommand()
else if (command === "verify")
  verifyCommand()
else
  throw new Error(`Unknown command: ${command}`)

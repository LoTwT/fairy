import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseGameData, type AgentData, type BangbooData, type BangbooSkillData, type DriveDiscData, type EnemyData, type GameData, type SourceRef, type WEngineData } from "../../core/src/index"
import { deriveNanokaBangbooElement } from "../src/nanoka-bangboo-element"
import { assertNanokaRuntimeGameDataArtifact } from "../src/runtime-policy"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const generatedAt = "2026-05-16T01:05:00+08:00"
const sourceVersion = "2.8"
const rootArtifactPath = join(repoRoot, "data/cleaned/runtime/game-data.json")
const packageArtifactPath = join(packageDir, "cleaned/runtime/game-data.json")
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
const characterIndexPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/character.json")
const characterSourceDir = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/character")
const bangbooIndexPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/bangboo.json")
const bangbooSourceDir = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/bangboo")
const weaponIndexPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/weapon.json")
const weaponSourceDir = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/weapon")
const equipmentIndexPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/equipment.json")
const equipmentSourceDir = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/equipment")
const monsterIndexPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/monster.json")
const monsterSourceDir = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/monster")

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

type CharacterIndexEntry = {
  code?: string
  en?: string
  zh?: string
  element?: number
  type?: number
  spelement?: string
}

type CharacterRaw = Record<string, any> & {
  id: number
  code_name: string
  name: string
  element_type?: Record<string, string>
  weapon_type?: Record<string, string>
  special_element_type?: {
    name?: string
    title?: string
    desc?: string
  }
}

type CharacterRuntimeBuild = {
  agents: Record<string, AgentData>
  yixuanProof: ReturnType<typeof yixuanProofValues>
  audit: unknown
}

function characterAnchor(entityId: string | number): string {
  return `data/source/raw/nanoka/zzz/2.8/zh/character/${entityId}.json`
}

function readCharacterRaw(entityId: string): CharacterRaw {
  return readJson<CharacterRaw>(join(characterSourceDir, `${entityId}.json`))
}

function yixuanProofValues(yixuan: CharacterRaw) {
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

function characterPanel(source: CharacterRaw) {
  const maxHp = panelValue(source, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hp_growth" })
  const panel: Record<string, number> = {
    maxHp,
    attack: panelValue(source, { baseKey: "attack", levelKey: "attack", growthKey: "attack_growth" }),
    defense: panelValue(source, { baseKey: "defence", levelKey: "defence", growthKey: "defence_growth" }),
    impact: requiredNumber(source.stats?.break_stun, `character.${source.id}.stats.break_stun`),
    critRate: requiredNumber(source.stats?.crit, `character.${source.id}.stats.crit`) / 10000,
    critDamage: requiredNumber(source.stats?.crit_damage, `character.${source.id}.stats.crit_damage`) / 10000,
    anomalyMastery: requiredNumber(source.stats?.element_abnormal_power, `character.${source.id}.stats.element_abnormal_power`),
    anomalyProficiency: requiredNumber(source.stats?.element_mystery, `character.${source.id}.stats.element_mystery`),
  }

  if (source.id === 1371)
    panel.sheerForce = Number((maxHp * 0.1).toFixed(8))

  return panel
}

function characterSpecialty(source: CharacterRaw): AgentData["agentSpecialty"] {
  const specialtyCode = Object.keys(source.weapon_type ?? {})[0]
  if (specialtyCode === "1")
    return "attack"
  if (specialtyCode === "2")
    return "stun"
  if (specialtyCode === "3")
    return "anomaly"
  if (specialtyCode === "4")
    return "support"
  if (specialtyCode === "5")
    return "defense"
  if (specialtyCode === "6")
    return "rupture"
  throw new Error(`character ${source.id}: unsupported weapon_type ${specialtyCode}`)
}

function baseCharacterAttribute(source: CharacterRaw): AgentData["attribute"] {
  const elementCode = Object.keys(source.element_type ?? {})[0]
  if (elementCode === "200")
    return "physical"
  if (elementCode === "201")
    return "fire"
  if (elementCode === "202")
    return "ice"
  if (elementCode === "203")
    return "electric"
  if (elementCode === "205")
    return "ether"
  throw new Error(`character ${source.id}: unsupported element_type ${elementCode}`)
}

function characterAttribute(source: CharacterRaw): { attribute: AgentData["attribute"], specialElement: unknown } {
  const specialName = source.special_element_type?.name
  if (specialName === "玄墨") {
    return {
      attribute: "auricInk",
      specialElement: {
        status: "promoted",
        sourceName: specialName,
        attribute: "auricInk",
        rawPath: "/special_element_type/name",
      },
    }
  }
  if (specialName === "烈霜") {
    return {
      attribute: "frost",
      specialElement: {
        status: "promoted",
        sourceName: specialName,
        attribute: "frost",
        rawPath: "/special_element_type/name",
      },
    }
  }
  if (typeof specialName === "string" && specialName.length > 0) {
    return {
      attribute: baseCharacterAttribute(source),
      specialElement: {
        status: "not-promoted",
        sourceName: specialName,
        reason: "core-attribute-enum-does-not-yet-define-this-special-element",
        fallbackAttribute: baseCharacterAttribute(source),
        rawPath: "/special_element_type/name",
      },
    }
  }
  return {
    attribute: baseCharacterAttribute(source),
    specialElement: { status: "not-present" },
  }
}

function buildCharacterRuntimeBatch(): CharacterRuntimeBuild {
  const index = readJson<Record<string, CharacterIndexEntry>>(characterIndexPath)
  const characterIds = Object.keys(index).sort((left, right) => Number(left) - Number(right))
  assert(characterIds.length === 53, `character runtime batch expected 53 live characters, got ${characterIds.length}`)

  const agents: Record<string, AgentData> = {}
  const auditRows: any[] = []
  let yixuanProof: ReturnType<typeof yixuanProofValues> | undefined

  for (const characterId of characterIds) {
    const indexEntry = index[characterId]!
    const raw = readCharacterRaw(characterId)
    const numericId = Number(characterId)
    assert(raw.id === numericId, `character ${characterId}: raw id drifted`)
    assert(String(raw.code_name).toLowerCase() === String(indexEntry.code).toLowerCase(), `character ${characterId}: code_name drifted against index`)
    assert(raw.name === indexEntry.zh, `character ${characterId}: zh name drifted against index`)

    const anchor = characterAnchor(characterId)
    const characterSource = sourceRef(anchor, "/")
    const attribute = characterAttribute(raw)
    const specialty = characterSpecialty(raw)
    const panel = characterPanel(raw)
    const skillIds = characterId === "1371" ? ["1371001"] : []

    if (characterId === "1371")
      yixuanProof = yixuanProofValues(raw)

    agents[characterId] = {
      id: characterId,
      label: { zh: raw.name, en: indexEntry.en },
      source: characterSource,
      attribute: attribute.attribute,
      agentSpecialty: specialty,
      baseStatsByLevel: {
        "60": panel,
      },
      skillIds,
      sourceAliases: uniqueStrings([raw.name, raw.code_name, indexEntry.en, indexEntry.code]),
    }

    auditRows.push({
      id: characterId,
      codeName: raw.code_name,
      indexCode: indexEntry.code,
      label: { zh: raw.name, en: indexEntry.en },
      source: characterSource,
      attribute: attribute.attribute,
      agentSpecialty: specialty,
      elementTypeRaw: raw.element_type,
      specialElement: attribute.specialElement,
      weaponTypeRaw: raw.weapon_type,
      level60Panel: panel,
      runtimeSkillIds: skillIds,
      skillPromotion: characterId === "1371"
        ? {
            status: "sample-preserved",
            runtimeSkillIds: skillIds,
            reason: "existing G27/Yixuan Adrenaline and Resonance executable sample remains the only character skill promoted in PR-A",
          }
        : {
            status: "not-promoted",
            reason: "typed-skill-template-not-in-current-batch",
          },
      passiveModifiers: {
        status: "not-promoted",
        reason: "typed-modifier-template-required",
      },
    })
  }

  assert(yixuanProof !== undefined, "character batch must include Yixuan proof values")
  const audit = {
    kind: "nanokaCharacterBatchAudit",
    schemaVersion: "nanoka-character-batch-audit/v0.1",
    sourceId: "nanoka-zzz",
    sourceVersion,
    generatedAt,
    runtimeCutoverReady: true,
    indexSource: sourceRef("data/source/raw/nanoka/zzz/2.8/character.json", "/"),
    summary: {
      characterCount: characterIds.length,
      runtimeAgentCount: Object.keys(agents).length,
      promotedRuntimeSkillCount: 1,
      nonPromotedSkillAgentCount: auditRows.filter(row => row.skillPromotion.status === "not-promoted").length,
      typedModifierPendingCount: auditRows.filter(row => row.passiveModifiers.status === "not-promoted").length,
      characterIds,
      attributeCounts: countBy(auditRows, row => row.attribute),
      specialtyCounts: countBy(auditRows, row => row.agentSpecialty),
      specialElementPromotedIds: auditRows.filter(row => row.specialElement.status === "promoted").map(row => row.id),
      specialElementNotPromotedIds: auditRows.filter(row => row.specialElement.status === "not-promoted").map(row => row.id),
    },
    characters: auditRows,
  }

  return { agents, yixuanProof, audit }
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

type WEngineIndexEntry = {
  icon?: string
  rank?: number
  type?: number
  en?: string
  zh?: string
  sub?: string
  atk?: number
}

type WEngineRaw = Record<string, any> & {
  id: number
  code_name: string
  name: string
  weapon_type?: Record<string, string>
  base_property?: {
    name?: string
    name2?: string
    format?: string
    value?: number
  }
  rand_property?: {
    name?: string
    name2?: string
    format?: string
    value?: number
  }
  level?: Record<string, {
    rate?: number
    rate2?: number
  }>
  stars?: Record<string, {
    star_rate?: number
    rand_rate?: number
  }>
  talents?: Record<string, {
    name?: string
    desc?: string
  }>
}

type WEngineRuntimeBuild = {
  wEngines: Record<string, WEngineData>
  audit: unknown
}

type EquipmentIndexEntry = {
  icon?: string
  en?: {
    name?: string
    desc2?: string
    desc4?: string
  }
  zh?: {
    name?: string
    desc2?: string
    desc4?: string
  }
  ja?: {
    name?: string
    desc2?: string
    desc4?: string
  }
  ko?: {
    name?: string
    desc2?: string
    desc4?: string
  }
}

type EquipmentRaw = Record<string, any> & {
  id: number
  name: string
  desc2?: string
  desc4?: string
  story?: string
  icon?: string
  icon2?: string
}

type DriveDiscRuntimeBuild = {
  driveDiscs: Record<string, DriveDiscData>
  audit: unknown
}

type MonsterIndexEntry = {
  icon?: string
  rarity?: number
  group?: number
  en?: string
  zh?: string
  ja?: string
  ko?: string
  desc?: string
}

type MonsterInfoRaw = Record<string, any> & {
  id?: number
  code_name?: string
  type?: string
  tag?: string[]
  element?: Record<string, number>
  stats?: Record<string, number | boolean>
  curves?: Record<string, unknown>
}

type MonsterRaw = Record<string, any> & {
  id: number
  name: string
  monster_id?: number
  group_id?: number
  rarity?: number
  desc?: string
  card_skill_desc?: string
  group_desc?: string
  monster_info?: Record<string, MonsterInfoRaw>
}

type EnemyRuntimeBuild = {
  enemies: Record<string, EnemyData>
  audit: unknown
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))]
}

function countBy<T>(values: T[], getKey: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const value of values) {
    const key = getKey(value)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)))
}

function bangbooAnchor(entityId: string | number): string {
  return `data/source/raw/nanoka/zzz/2.8/zh/bangboo/${entityId}.json`
}

function readBangbooRaw(entityId: string): BangbooRaw {
  return readJson<BangbooRaw>(join(bangbooSourceDir, `${entityId}.json`))
}

function wEngineAnchor(entityId: string | number): string {
  return `data/source/raw/nanoka/zzz/2.8/zh/weapon/${entityId}.json`
}

function readWEngineRaw(entityId: string): WEngineRaw {
  return readJson<WEngineRaw>(join(weaponSourceDir, `${entityId}.json`))
}

function driveDiscAnchor(entityId: string | number): string {
  return `data/source/raw/nanoka/zzz/2.8/zh/equipment/${entityId}.json`
}

function readEquipmentRaw(entityId: string): EquipmentRaw {
  return readJson<EquipmentRaw>(join(equipmentSourceDir, `${entityId}.json`))
}

function enemyAnchor(entityId: string | number): string {
  return `data/source/raw/nanoka/zzz/2.8/zh/monster/${entityId}.json`
}

function readMonsterRaw(entityId: string): MonsterRaw {
  return readJson<MonsterRaw>(join(monsterSourceDir, `${entityId}.json`))
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

function wEngineSpecialty(raw: WEngineRaw): string {
  const specialtyCode = Object.keys(raw.weapon_type ?? {})[0]
  if (specialtyCode === "1")
    return "attack"
  if (specialtyCode === "2")
    return "stun"
  if (specialtyCode === "3")
    return "anomaly"
  if (specialtyCode === "4")
    return "support"
  if (specialtyCode === "5")
    return "defense"
  if (specialtyCode === "6")
    return "rupture"
  throw new Error(`W-Engine ${raw.id}: unsupported weapon_type ${specialtyCode}`)
}

function wEngineSubStatKey(name: string | undefined, entityId: string): string {
  if (name === "攻击力百分比")
    return "attackPercent"
  if (name === "生命值百分比")
    return "hpPercent"
  if (name === "防御力百分比")
    return "defensePercent"
  if (name === "暴击率")
    return "critRate"
  if (name === "暴击伤害")
    return "critDamage"
  if (name === "穿透率")
    return "penetrationRatio"
  if (name === "异常精通")
    return "anomalyProficiency"
  if (name === "异常掌控")
    return "anomalyMastery"
  if (name === "能量自动回复")
    return "energyRegen"
  if (name === "冲击力")
    return "impact"
  throw new Error(`W-Engine ${entityId}: unsupported rand_property.name2 ${name}`)
}

function normalizeWEngineSubStat(rawValue: number, format: string | undefined): number {
  if (format === "{0:0.#%}")
    return Number((rawValue / 10000).toFixed(8))
  if (format === "{0:0}")
    return Number(rawValue.toFixed(8))
  throw new Error(`unsupported W-Engine substat format ${format}`)
}

function wEnginePanel(raw: WEngineRaw, indexEntry: WEngineIndexEntry) {
  const level60 = raw.level?.["60"]
  const star5 = raw.stars?.["5"]
  assert(level60 !== undefined, `W-Engine ${raw.id}: missing level.60`)
  assert(star5 !== undefined, `W-Engine ${raw.id}: missing stars.5`)
  assert(raw.base_property?.name2 === "基础攻击力", `W-Engine ${raw.id}: unsupported base_property ${raw.base_property?.name2}`)

  const baseAttack = requiredNumber(raw.base_property?.value, `W-Engine ${raw.id}.base_property.value`)
  const levelRate = requiredNumber(level60.rate, `W-Engine ${raw.id}.level.60.rate`)
  const starRate = requiredNumber(star5.star_rate, `W-Engine ${raw.id}.stars.5.star_rate`)
  const randBase = requiredNumber(raw.rand_property?.value, `W-Engine ${raw.id}.rand_property.value`)
  const randRate = requiredNumber(star5.rand_rate, `W-Engine ${raw.id}.stars.5.rand_rate`)
  const attack = Number((baseAttack * (1 + levelRate / 10000 + starRate / 10000)).toFixed(8))
  const rawSubStat = Number((randBase * (1 + randRate / 10000)).toFixed(8))
  const subStatKey = wEngineSubStatKey(raw.rand_property?.name2, String(raw.id))
  const subStat = normalizeWEngineSubStat(rawSubStat, raw.rand_property?.format)

  return {
    panel: {
      attack,
      [subStatKey]: subStat,
    },
    proof: {
      baseAttack,
      level60Rate: levelRate,
      star5AttackRate: starRate,
      attack,
      indexAttack: indexEntry.atk,
      indexAttackFloorMatches: Math.floor(attack) === indexEntry.atk,
      randBase,
      star5RandRate: randRate,
      rawSubStat,
      subStatKey,
      subStat,
      subStatFormat: raw.rand_property?.format,
    },
  }
}

function buildWEngineRuntimeBatch(): WEngineRuntimeBuild {
  const index = readJson<Record<string, WEngineIndexEntry>>(weaponIndexPath)
  const wEngineIds = Object.keys(index).sort((left, right) => Number(left) - Number(right))
  assert(wEngineIds.length === 89, `W-Engine runtime batch expected 89 live W-Engines, got ${wEngineIds.length}`)

  const wEngines: Record<string, WEngineData> = {}
  const auditRows: any[] = []

  for (const wEngineId of wEngineIds) {
    const indexEntry = index[wEngineId]!
    const raw = readWEngineRaw(wEngineId)
    const numericId = Number(wEngineId)
    assert(raw.id === numericId, `W-Engine ${wEngineId}: raw id drifted`)
    assert(raw.name === indexEntry.zh, `W-Engine ${wEngineId}: zh name drifted against index`)
    assert(raw.base_property !== undefined, `W-Engine ${wEngineId}: missing base_property`)
    assert(raw.rand_property !== undefined, `W-Engine ${wEngineId}: missing rand_property`)

    const anchor = wEngineAnchor(wEngineId)
    const wEngineSource = sourceRef(anchor, "/")
    const specialty = wEngineSpecialty(raw)
    const { panel, proof } = wEnginePanel(raw, indexEntry)
    const talentLevels = Object.keys(raw.talents ?? {}).sort((left, right) => Number(left) - Number(right))
    const talents = talentLevels.map((level) => {
      const talent = raw.talents?.[level]
      assert(typeof talent?.name === "string" && talent.name.length > 0, `W-Engine ${wEngineId}: missing talent ${level} name`)
      assert(typeof talent?.desc === "string" && talent.desc.length > 0, `W-Engine ${wEngineId}: missing talent ${level} desc`)
      return {
        level,
        name: talent.name,
        desc: talent.desc,
        source: sourceRef(anchor, `/talents/${level}`),
      }
    })
    assert(talents.length === 5, `W-Engine ${wEngineId}: expected 5 retained talent levels, got ${talents.length}`)

    wEngines[wEngineId] = {
      id: wEngineId,
      label: { zh: raw.name, en: indexEntry.en },
      source: wEngineSource,
      baseStatsByLevel: {
        "60": panel,
      },
      sourceAliases: uniqueStrings([raw.name, raw.code_name, indexEntry.en, indexEntry.zh]),
    }

    auditRows.push({
      id: wEngineId,
      codeName: raw.code_name,
      label: { zh: raw.name, en: indexEntry.en },
      source: wEngineSource,
      rarity: raw.rarity,
      indexRank: indexEntry.rank,
      weaponTypeRaw: raw.weapon_type,
      compatibleSpecialty: specialty,
      baseProperty: raw.base_property,
      randProperty: raw.rand_property,
      level60Panel: panel,
      formulaProof: proof,
      passiveModifiers: {
        status: "not-promoted",
        reason: "typed-modifier-template-required",
        talents,
      },
    })
  }

  const audit = {
    kind: "nanokaWEngineBatchAudit",
    schemaVersion: "nanoka-wengine-batch-audit/v0.1",
    sourceId: "nanoka-zzz",
    sourceVersion,
    generatedAt,
    runtimeCutoverReady: true,
    indexSource: sourceRef("data/source/raw/nanoka/zzz/2.8/weapon.json", "/"),
    summary: {
      wEngineCount: wEngineIds.length,
      runtimeWEngineCount: Object.keys(wEngines).length,
      passiveNotPromotedCount: auditRows.filter(row => row.passiveModifiers.status === "not-promoted").length,
      wEngineIds,
      rarityCounts: countBy(auditRows, row => String(row.rarity)),
      compatibleSpecialtyCounts: countBy(auditRows, row => row.compatibleSpecialty),
      subStatCounts: countBy(auditRows, row => row.formulaProof.subStatKey),
    },
    wEngines: auditRows,
  }

  return { wEngines, audit }
}

function buildDriveDiscRuntimeBatch(): DriveDiscRuntimeBuild {
  const index = readJson<Record<string, EquipmentIndexEntry>>(equipmentIndexPath)
  const driveDiscIds = Object.keys(index).sort((left, right) => Number(left) - Number(right))
  assert(driveDiscIds.length === 26, `Drive Disc runtime batch expected 26 live sets, got ${driveDiscIds.length}`)

  const driveDiscs: Record<string, DriveDiscData> = {}
  const auditRows: any[] = []

  for (const driveDiscId of driveDiscIds) {
    const indexEntry = index[driveDiscId]!
    const raw = readEquipmentRaw(driveDiscId)
    const numericId = Number(driveDiscId)
    assert(raw.id === numericId, `Drive Disc ${driveDiscId}: raw id drifted`)
    assert(raw.name === indexEntry.zh?.name, `Drive Disc ${driveDiscId}: zh name drifted against index`)
    assert(typeof raw.desc2 === "string" && raw.desc2.length > 0, `Drive Disc ${driveDiscId}: missing desc2`)
    assert(typeof raw.desc4 === "string" && raw.desc4.length > 0, `Drive Disc ${driveDiscId}: missing desc4`)
    assert(raw.desc2 === indexEntry.zh?.desc2, `Drive Disc ${driveDiscId}: desc2 drifted against index`)
    assert(raw.desc4 === indexEntry.zh?.desc4, `Drive Disc ${driveDiscId}: desc4 drifted against index`)

    const anchor = driveDiscAnchor(driveDiscId)
    const driveDiscSource = sourceRef(anchor, "/")
    driveDiscs[driveDiscId] = {
      id: driveDiscId,
      label: { zh: raw.name, en: indexEntry.en?.name },
      source: driveDiscSource,
      sourceAliases: uniqueStrings([raw.name, indexEntry.en?.name, indexEntry.ja?.name, indexEntry.ko?.name]),
    }

    auditRows.push({
      id: driveDiscId,
      label: {
        zh: raw.name,
        en: indexEntry.en?.name,
        ja: indexEntry.ja?.name,
        ko: indexEntry.ko?.name,
      },
      source: driveDiscSource,
      icon: raw.icon,
      icon2: raw.icon2,
      setEffects: {
        twoPiece: {
          status: "not-promoted",
          reason: "typed-modifier-template-required",
          rawText: raw.desc2,
          source: sourceRef(anchor, "/desc2"),
          localizedIndexText: {
            en: indexEntry.en?.desc2,
            zh: indexEntry.zh?.desc2,
            ja: indexEntry.ja?.desc2,
            ko: indexEntry.ko?.desc2,
          },
        },
        fourPiece: {
          status: "not-promoted",
          reason: "typed-modifier-template-required",
          rawText: raw.desc4,
          source: sourceRef(anchor, "/desc4"),
          localizedIndexText: {
            en: indexEntry.en?.desc4,
            zh: indexEntry.zh?.desc4,
            ja: indexEntry.ja?.desc4,
            ko: indexEntry.ko?.desc4,
          },
        },
      },
      slotAndSubstatTables: {
        status: "out-of-scope",
        reason: "scope:user-provided-snapshot-boundary",
        auditArtifact: "data/cleaned/audit/nanoka-drive-disc-slot-stat-audit.json",
      },
    })
  }

  const audit = {
    kind: "nanokaDriveDiscBatchAudit",
    schemaVersion: "nanoka-drive-disc-batch-audit/v0.1",
    sourceId: "nanoka-zzz",
    sourceVersion,
    generatedAt,
    runtimeCutoverReady: true,
    indexSource: sourceRef("data/source/raw/nanoka/zzz/2.8/equipment.json", "/"),
    summary: {
      driveDiscCount: driveDiscIds.length,
      runtimeDriveDiscCount: Object.keys(driveDiscs).length,
      retainedSetEffectTextCount: auditRows.length * 2,
      typedModifierPendingCount: auditRows.length,
      driveDiscIds,
    },
    driveDiscs: auditRows,
  }

  return { driveDiscs, audit }
}

function enemyRankFromRarity(rarity: number, enemyId: string): EnemyData["rank"] {
  if (rarity === 1)
    return "normal"
  if (rarity === 2)
    return "elite"
  if (rarity === 3)
    return "special"
  if (rarity === 4)
    return "boss"
  throw new Error(`enemy ${enemyId}: unsupported nanoka rarity ${rarity}`)
}

function buildEnemyRuntimeBatch(): EnemyRuntimeBuild {
  const index = readJson<Record<string, MonsterIndexEntry>>(monsterIndexPath)
  const enemyIds = Object.keys(index).sort((left, right) => Number(left) - Number(right))
  assert(enemyIds.length === 269, `enemy runtime batch expected 269 live monsters, got ${enemyIds.length}`)

  const enemies: Record<string, EnemyData> = {}
  const auditRows: any[] = []

  for (const enemyId of enemyIds) {
    const indexEntry = index[enemyId]!
    const raw = readMonsterRaw(enemyId)
    const numericId = Number(enemyId)
    assert(raw.id === numericId, `enemy ${enemyId}: raw id drifted`)
    assert(raw.name === indexEntry.zh, `enemy ${enemyId}: zh name drifted against index`)
    assert(raw.group_id === indexEntry.group, `enemy ${enemyId}: group drifted against index`)
    assert(raw.rarity === indexEntry.rarity, `enemy ${enemyId}: rarity drifted against index`)
    const selectedVariantId = requiredNumber(raw.monster_id, `enemy.${enemyId}.monster_id`)
    const selectedVariant = raw.monster_info?.[String(selectedVariantId)]
    if (selectedVariant !== undefined) {
      assert(selectedVariant.id === selectedVariantId, `enemy ${enemyId}: selected monster_info id drifted`)
      assert(typeof selectedVariant.code_name === "string" && selectedVariant.code_name.length > 0, `enemy ${enemyId}: selected code_name is missing`)
      assert(typeof selectedVariant.type === "string" && selectedVariant.type.length > 0, `enemy ${enemyId}: selected type is missing`)
      assert(typeof selectedVariant.stats === "object" && selectedVariant.stats !== null, `enemy ${enemyId}: selected stats are missing`)
    }

    const rarity = requiredNumber(indexEntry.rarity, `enemy.${enemyId}.rarity`)
    const anchor = enemyAnchor(enemyId)
    const enemySource = sourceRef(anchor, "/")
    const selectedVariantSource = sourceRef(anchor, `/monster_info/${selectedVariantId}`)
    const skippedVariantIds = Object.keys(raw.monster_info ?? {})
      .map(Number)
      .filter(variantId => variantId !== selectedVariantId)
      .sort((left, right) => left - right)

    enemies[enemyId] = {
      id: enemyId,
      label: { zh: raw.name, en: indexEntry.en },
      source: enemySource,
      rank: enemyRankFromRarity(rarity, enemyId),
      sourceAliases: uniqueStrings([
        raw.name,
        indexEntry.en,
        indexEntry.ja,
        indexEntry.ko,
        selectedVariant?.code_name,
        String(selectedVariantId),
      ]),
    }

    auditRows.push({
      id: enemyId,
      label: {
        zh: raw.name,
        en: indexEntry.en,
        ja: indexEntry.ja,
        ko: indexEntry.ko,
      },
      source: enemySource,
      icon: indexEntry.icon,
      group: raw.group_id,
      rarity,
      rank: enemies[enemyId]!.rank,
      rankMapping: {
        status: "promoted",
        rule: "nanoka monster index rarity 1/2/3/4 -> fairy normal/elite/special/boss",
        source: sourceRef("data/source/raw/nanoka/zzz/2.8/monster.json", `/${enemyId}/rarity`),
      },
      selectedVariant: selectedVariant === undefined
        ? {
            status: "not-promoted",
            reason: "missing-selected-monster_info-variant",
            rule: "detail.monster_id -> monster_info[monster_id]",
            monsterInfoId: selectedVariantId,
            source: sourceRef(anchor, "/monster_id"),
          }
        : {
            status: "promoted",
            rule: "detail.monster_id -> monster_info[monster_id]",
            monsterInfoId: selectedVariantId,
            codeName: selectedVariant.code_name,
            type: selectedVariant.type,
            tags: Array.isArray(selectedVariant.tag) ? selectedVariant.tag : [],
            source: selectedVariantSource,
            statsRaw: selectedVariant.stats,
            elementProfileRaw: selectedVariant.element ?? {},
            curvesRawStatus: selectedVariant.curves === undefined ? "not-present" : "retained-in-raw-source",
          },
      skippedVariants: skippedVariantIds.map(variantId => ({
        monsterInfoId: variantId,
        status: "audit-only",
        reason: "non-selected-monster_info-variant",
        source: sourceRef(anchor, `/monster_info/${variantId}`),
      })),
      rawText: {
        description: {
          status: typeof raw.desc === "string" && raw.desc.length > 0 ? "retained-audit-only" : "not-present",
          rawText: raw.desc,
          source: sourceRef(anchor, "/desc"),
        },
        cardSkillDescription: {
          status: typeof raw.card_skill_desc === "string" && raw.card_skill_desc.length > 0 ? "retained-audit-only" : "not-present",
          rawText: raw.card_skill_desc,
          source: sourceRef(anchor, "/card_skill_desc"),
        },
        groupDescription: {
          status: typeof raw.group_desc === "string" && raw.group_desc.length > 0 ? "retained-audit-only" : "not-present",
          rawText: raw.group_desc,
          source: sourceRef(anchor, "/group_desc"),
        },
        indexDescription: {
          status: typeof indexEntry.desc === "string" && indexEntry.desc.length > 0 ? "retained-audit-only" : "not-present",
          rawText: indexEntry.desc,
          source: sourceRef("data/source/raw/nanoka/zzz/2.8/monster.json", `/${enemyId}/desc`),
        },
      },
      pendingPromotions: {
        levelDefaults: {
          status: "not-promoted",
          reason: "field:enemy-level-formula-required",
        },
        resistance: {
          status: "not-promoted",
          reason: "field:resistance-unit-mapping-required",
        },
        anomalyThresholds: {
          status: "not-promoted",
          reason: "field:anomaly-threshold-mapping-required",
        },
        dazeRecovery: {
          status: "not-promoted",
          reason: "field:daze-recovery-semantic-mapping-required",
        },
        specialRules: {
          status: "not-promoted",
          reason: "typed-modifier-template-required",
        },
      },
    })
  }

  const audit = {
    kind: "nanokaEnemyBatchAudit",
    schemaVersion: "nanoka-enemy-batch-audit/v0.1",
    sourceId: "nanoka-zzz",
    sourceVersion,
    generatedAt,
    runtimeCutoverReady: true,
    indexSource: sourceRef("data/source/raw/nanoka/zzz/2.8/monster.json", "/"),
    summary: {
      enemyCount: enemyIds.length,
      runtimeEnemyCount: Object.keys(enemies).length,
      selectedVariantCount: auditRows.filter(row => row.selectedVariant.status === "promoted").length,
      missingSelectedVariantCount: auditRows.filter(row => row.selectedVariant.status === "not-promoted").length,
      skippedVariantCount: auditRows.reduce((total, row) => total + row.skippedVariants.length, 0),
      retainedTextRowCount: auditRows.reduce((total, row) => {
        return total + Object.values(row.rawText).filter((entry: any) => entry.status === "retained-audit-only").length
      }, 0),
      enemyIds,
      rankCounts: countBy(auditRows, row => row.rank),
      groupCounts: countBy(auditRows, row => String(row.group)),
      selectedVariantTypeCounts: countBy(auditRows.filter(row => row.selectedVariant.status === "promoted"), row => String(row.selectedVariant.type)),
    },
    enemies: auditRows,
  }

  return { enemies, audit }
}

function buildArtifact() {
  const characterBatch = buildCharacterRuntimeBatch()
  const yixuan = characterBatch.yixuanProof
  const bangbooBatch = buildBangbooRuntimeBatch()
  const wEngineBatch = buildWEngineRuntimeBatch()
  const driveDiscBatch = buildDriveDiscRuntimeBatch()
  const enemyBatch = buildEnemyRuntimeBatch()
  const yixuanAnchor = "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json"
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
        fetchedAt: generatedAt,
        parsedAt: generatedAt,
        parserVersion: "nanoka-runtime-enemy-batch-v0.1.0",
        licenseNote: "Runtime cleaned data uses lo-user-approved nanoka live 2.8 evidence; archived Excel/D-17/D-12 sources are retained for audit only.",
      },
    ],
    agents: characterBatch.agents,
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
    wEngines: wEngineBatch.wEngines,
    driveDiscs: driveDiscBatch.driveDiscs,
    enemies: enemyBatch.enemies,
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
    characterBatchAudit: characterBatch.audit,
    bangbooBatchAudit: bangbooBatch.audit,
    wEngineBatchAudit: wEngineBatch.audit,
    driveDiscBatchAudit: driveDiscBatch.audit,
    enemyBatchAudit: enemyBatch.audit,
  }
}

function assertArtifactFresh(): void {
  const {
    artifact: expected,
    characterBatchAudit: expectedCharacterBatchAudit,
    bangbooBatchAudit: expectedBangbooBatchAudit,
    wEngineBatchAudit: expectedWEngineBatchAudit,
    driveDiscBatchAudit: expectedDriveDiscBatchAudit,
    enemyBatchAudit: expectedEnemyBatchAudit,
  } = buildArtifact()
  const actualRoot = readJson<unknown>(rootArtifactPath)
  const actualPackage = readJson<unknown>(packageArtifactPath)
  const actualRootCharacterBatchAudit = readJson<unknown>(rootCharacterBatchAuditPath)
  const actualPackageCharacterBatchAudit = readJson<unknown>(packageCharacterBatchAuditPath)
  const actualRootBangbooBatchAudit = readJson<unknown>(rootBangbooBatchAuditPath)
  const actualPackageBangbooBatchAudit = readJson<unknown>(packageBangbooBatchAuditPath)
  const actualRootWEngineBatchAudit = readJson<unknown>(rootWEngineBatchAuditPath)
  const actualPackageWEngineBatchAudit = readJson<unknown>(packageWEngineBatchAuditPath)
  const actualRootDriveDiscBatchAudit = readJson<unknown>(rootDriveDiscBatchAuditPath)
  const actualPackageDriveDiscBatchAudit = readJson<unknown>(packageDriveDiscBatchAuditPath)
  const actualRootEnemyBatchAudit = readJson<unknown>(rootEnemyBatchAuditPath)
  const actualPackageEnemyBatchAudit = readJson<unknown>(packageEnemyBatchAuditPath)
  if (JSON.stringify(actualRoot) !== JSON.stringify(expected))
    throw new Error("Runtime game data artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackage) !== JSON.stringify(expected))
    throw new Error("Package runtime game data mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualRootCharacterBatchAudit) !== JSON.stringify(expectedCharacterBatchAudit))
    throw new Error("Character batch audit artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackageCharacterBatchAudit) !== JSON.stringify(expectedCharacterBatchAudit))
    throw new Error("Package Character batch audit mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualRootBangbooBatchAudit) !== JSON.stringify(expectedBangbooBatchAudit))
    throw new Error("Bangboo batch audit artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackageBangbooBatchAudit) !== JSON.stringify(expectedBangbooBatchAudit))
    throw new Error("Package Bangboo batch audit mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualRootWEngineBatchAudit) !== JSON.stringify(expectedWEngineBatchAudit))
    throw new Error("W-Engine batch audit artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackageWEngineBatchAudit) !== JSON.stringify(expectedWEngineBatchAudit))
    throw new Error("Package W-Engine batch audit mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualRootDriveDiscBatchAudit) !== JSON.stringify(expectedDriveDiscBatchAudit))
    throw new Error("Drive Disc batch audit artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackageDriveDiscBatchAudit) !== JSON.stringify(expectedDriveDiscBatchAudit))
    throw new Error("Package Drive Disc batch audit mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualRootEnemyBatchAudit) !== JSON.stringify(expectedEnemyBatchAudit))
    throw new Error("Enemy batch audit artifact is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  if (JSON.stringify(actualPackageEnemyBatchAudit) !== JSON.stringify(expectedEnemyBatchAudit))
    throw new Error("Package Enemy batch audit mirror is stale; rerun pnpm --filter @randomplay/data audit:nanoka-runtime")
  assertNanokaRuntimeGameDataArtifact(actualRoot)
  assertNanokaRuntimeGameDataArtifact(actualPackage)
}

function auditCommand(): void {
  const { artifact, characterBatchAudit, bangbooBatchAudit, wEngineBatchAudit, driveDiscBatchAudit, enemyBatchAudit } = buildArtifact()
  writeJson(rootArtifactPath, artifact)
  writeJson(packageArtifactPath, artifact)
  writeJson(rootCharacterBatchAuditPath, characterBatchAudit)
  writeJson(packageCharacterBatchAuditPath, characterBatchAudit)
  writeJson(rootBangbooBatchAuditPath, bangbooBatchAudit)
  writeJson(packageBangbooBatchAuditPath, bangbooBatchAudit)
  writeJson(rootWEngineBatchAuditPath, wEngineBatchAudit)
  writeJson(packageWEngineBatchAuditPath, wEngineBatchAudit)
  writeJson(rootDriveDiscBatchAuditPath, driveDiscBatchAudit)
  writeJson(packageDriveDiscBatchAuditPath, driveDiscBatchAudit)
  writeJson(rootEnemyBatchAuditPath, enemyBatchAudit)
  writeJson(packageEnemyBatchAuditPath, enemyBatchAudit)
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
  if (!existsSync(rootCharacterBatchAuditPath))
    throw new Error("Missing data/cleaned/audit/nanoka-character-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(packageCharacterBatchAuditPath))
    throw new Error("Missing packages/data/cleaned/audit/nanoka-character-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(rootWEngineBatchAuditPath))
    throw new Error("Missing data/cleaned/audit/nanoka-wengine-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(packageWEngineBatchAuditPath))
    throw new Error("Missing packages/data/cleaned/audit/nanoka-wengine-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(rootDriveDiscBatchAuditPath))
    throw new Error("Missing data/cleaned/audit/nanoka-drive-disc-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(packageDriveDiscBatchAuditPath))
    throw new Error("Missing packages/data/cleaned/audit/nanoka-drive-disc-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(rootEnemyBatchAuditPath))
    throw new Error("Missing data/cleaned/audit/nanoka-enemy-batch-audit.json; run audit:nanoka-runtime first")
  if (!existsSync(packageEnemyBatchAuditPath))
    throw new Error("Missing packages/data/cleaned/audit/nanoka-enemy-batch-audit.json; run audit:nanoka-runtime first")
  assertArtifactFresh()
}

const command = process.argv[2] ?? "verify"
if (command === "audit")
  auditCommand()
else if (command === "verify")
  verifyCommand()
else
  throw new Error(`Unknown command: ${command}`)

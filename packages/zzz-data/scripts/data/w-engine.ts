import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../../data")
const SOURCE_DIR = path.join(DATA_DIR, "source")
const OUTPUT_DIR = path.join(DATA_DIR, "w-engine")

const PROFILE_LOCALES = ["en", "zh-CN"] as const
const REFINE_RANKS = [1, 2, 3, 4, 5] as const

type Locale = (typeof PROFILE_LOCALES)[number]
type RefineRank = (typeof REFINE_RANKS)[number]
type WEngineId = string

type WEngineAdvancedStatKey =
  | "hpPercent"
  | "atkPercent"
  | "defPercent"
  | "critRate"
  | "critDamage"
  | "impact"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "penRate"
  | "energyRegen"

interface XlsxWEngineStatRecord {
  id: number
  name: string
  rarity: "A" | "S" | "B"
  profession: string
  baseAtkLv0: number
  baseAtkLv60: number
  advancedStat?: string
  advancedStatLv0?: number
  advancedStatLv60?: number
}

interface XlsxWEngineDescRecord {
  id: number
  name: string
  description: string
  summary: string
  skillName: string
  skillDescriptionLv1?: string
  skillDescriptionLv2?: string
  skillDescriptionLv3?: string
  skillDescriptionLv4?: string
  skillDescriptionLv5?: string
}

interface GachabaseWEngineListRecord {
  id: string
  slug: string
  name: string
  icon?: string
  rarity: number
  baseStat: {
    id: string
    name: string
    value: number
  }
  specialty?: {
    id: string
    name: string
  }
  advancedStat?: {
    id: string
    name: string
    value: number
  }
  effects?: Array<{
    level: number
    name: string
    effect: string
  }>
}

interface GachabaseWEngineDetailRecord {
  id: string
  slug: string
  name: string
  shortComment?: string
  longComment?: string
  assets?: {
    splashArt?: {
      url: string
    }
  }
  levels: Array<{
    level: number
    baseStatGrowth: number
  }>
  stars: Array<{
    star: number
    minLevel: number
    maxLevel: number
    baseStatGrowth: number
    advancedStatGrowth: number
  }>
}

interface LocalizedText {
  "en"?: string
  "zh-CN"?: string
}

interface StaticValueDefinition {
  kind: "static"
  value: number
}

interface LevelTableValueDefinition {
  kind: "by-level"
  inputKey: string
  values: Record<number, number>
}

type ValueDefinition = StaticValueDefinition | LevelTableValueDefinition

type ExtraModifierKey =
  | "hpPercent"
  | "atkPercent"
  | "defPercent"
  | "impact"
  | "sheerForce"
  | "critRate"
  | "critDamage"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "penRate"
  | "penFlat"
  | "energyRegen"
  | "physicalDamageBonus"
  | "fireDamageBonus"
  | "iceDamageBonus"
  | "electricDamageBonus"
  | "etherDamageBonus"
  | "damageBonus"
  | "normalAttackDamageBonus"
  | "dashAttackDamageBonus"
  | "followUpAttackDamageBonus"
  | "chainAttackDamageBonus"
  | "ultimateDamageBonus"
  | "specialAttackDamageBonus"
  | "enhancedSpecialDamageBonus"
  | "assistDamageBonus"
  | "sheerBonus"
  | "defenseReduction"
  | "resistanceReduction"
  | "vulnerabilityBonus"
  | "dazeVulnerabilityBonus"
  | "specialMultiplier"

interface StructuredExtraModifierEffect {
  id: string
  label: string
  bucket: "modifier"
  key: ExtraModifierKey
  value: ValueDefinition
  unit: "ratio" | "flat" | "multiplier"
  target: "self" | "team" | "enemy"
  conditionText?: string
}

interface StructuredOverrideEffect {
  id: string
  label: string
  bucket: "override"
  key: "dazeVulnerabilityBonus"
  value: ValueDefinition
  capValue?: number
  conditionText?: string
}

interface WEngineIndexEntry {
  id: WEngineId
  slug: string
  names: Partial<Record<Locale, string>>
  imageKey?: string
  rank?: "A" | "S"
  locales: Locale[]
}

type WEngineIndexFile = Record<WEngineId, WEngineIndexEntry>

interface WEngineProfileFile {
  id: WEngineId
  locale: Locale
  name: string
  imageKey?: string
  rank?: "A" | "S"
  summaryText?: string
  descriptionText?: string
}

interface WEngineAdvancedStatByLevelEntry {
  key: WEngineAdvancedStatKey
  value: number
}

interface WEngineMechanicsFile {
  id: WEngineId
  panel: {
    baseAtkByLevel: Record<number, number>
    advancedStatByLevel?: Record<number, WEngineAdvancedStatByLevelEntry>
  }
  effects: {
    modifiers: StructuredExtraModifierEffect[]
    overrides: StructuredOverrideEffect[]
  }
  trace: {
    sourceRefs: string[]
    skillNameTexts?: LocalizedText
    skillDescriptionsByRefine?: Record<RefineRank, LocalizedText>
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`generate w-engine failed: ${message}`)
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
  console.log(`  → ${filePath}`)
}

function createStageDir(): string {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  return fs.mkdtempSync(path.join(DATA_DIR, ".generate-stage-"))
}

function stripHtml(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return normalized.length > 0 ? normalized : undefined
}

function mapRarity(value: string | number | undefined): "A" | "S" | undefined {
  if (value === "S" || value === 4) {
    return "S"
  }

  if (value === "A" || value === 3) {
    return "A"
  }

  return undefined
}

function mapAdvancedStatKey(value: string | undefined): WEngineAdvancedStatKey {
  switch (value) {
    case "生命值":
    case "生命值百分比":
      return "hpPercent"
    case "攻击力":
    case "攻击力百分比":
      return "atkPercent"
    case "防御力":
    case "防御力百分比":
      return "defPercent"
    case "暴击率":
      return "critRate"
    case "暴击伤害":
      return "critDamage"
    case "冲击力":
      return "impact"
    case "异常掌控":
      return "anomalyMastery"
    case "异常精通":
      return "anomalyProficiency"
    case "穿透率":
      return "penRate"
    case "能量自动回复":
      return "energyRegen"
    default:
      throw new Error(
        `generate w-engine failed: unsupported advanced stat ${value}`,
      )
  }
}

function roundStatValue(value: number): number {
  return Number(value.toFixed(4))
}

function stripBrackets(value: string): string {
  return value.replace(/\[[^\]]+\]/g, "").trim()
}

function normalizeClause(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function splitClauses(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(/[；;]/)
    .map((part) => normalizeClause(part))
    .filter((part) => part.length > 0)
}

function levelValue(values: Record<number, number>): LevelTableValueDefinition {
  return {
    kind: "by-level",
    inputKey: "refineRank",
    values,
  }
}

interface ParsedModifierToken {
  effectKey: string
  label: string
  key: ExtraModifierKey
  value: number
  unit: StructuredExtraModifierEffect["unit"]
  target: StructuredExtraModifierEffect["target"]
  conditionText?: string
}

interface ModifierAccumulator {
  effectKey: string
  label: string
  key: ExtraModifierKey
  unit: StructuredExtraModifierEffect["unit"]
  target: StructuredExtraModifierEffect["target"]
  conditionText?: string
  values: Record<number, number>
}

function parsePercent(value: string): number {
  return roundStatValue(Number(value) / 100)
}

function parseFlat(value: string): number {
  return roundStatValue(Number(value))
}

function parseAttributeKey(
  value: string,
): Extract<
  ExtraModifierKey,
  | "physicalDamageBonus"
  | "fireDamageBonus"
  | "iceDamageBonus"
  | "electricDamageBonus"
  | "etherDamageBonus"
> {
  switch (value) {
    case "物理":
      return "physicalDamageBonus"
    case "火":
      return "fireDamageBonus"
    case "冰":
      return "iceDamageBonus"
    case "电":
      return "electricDamageBonus"
    case "以太":
      return "etherDamageBonus"
    default:
      throw new Error(
        `generate w-engine failed: unsupported attribute ${value}`,
      )
  }
}

function parseClauseModifiers(clause: string): ParsedModifierToken[] {
  const normalized = normalizeClause(clause)
  const stripped = stripBrackets(normalized)

  if (
    stripped.includes("最多叠加") ||
    stripped.includes("每层") ||
    stripped.includes("叠加到") ||
    stripped.includes("层数") ||
    /(?:获得|拥有)\d+层/.test(stripped)
  ) {
    return []
  }

  const tokens: ParsedModifierToken[] = []

  const critRateMatch = stripped.match(/暴击率提升([0-9.]+)%/)
  if (critRateMatch) {
    tokens.push({
      effectKey: "crit-rate",
      label: "被动暴击率",
      key: "critRate",
      value: parsePercent(critRateMatch[1]),
      unit: "ratio",
      target: "self",
      conditionText: stripped === critRateMatch[0] ? undefined : normalized,
    })
  }

  const critDamageMatch = stripped.match(/暴击伤害(?:额外)?提升([0-9.]+)%/)
  if (critDamageMatch) {
    const isTeam = stripped.includes("全队角色")
    tokens.push({
      effectKey: `${isTeam ? "team" : "self"}-crit-damage`,
      label: `${isTeam ? "全队" : "自身"}暴击伤害`,
      key: "critDamage",
      value: parsePercent(critDamageMatch[1]),
      unit: "ratio",
      target: isTeam ? "team" : "self",
      conditionText: stripped === critDamageMatch[0] ? undefined : normalized,
    })
  }

  const anomalyProficiencyMatch = stripped.match(/异常精通提升([0-9.]+)点/)
  if (anomalyProficiencyMatch) {
    const isTeam = stripped.includes("全队角色")
    tokens.push({
      effectKey: `${isTeam ? "team" : "self"}-anomaly-proficiency`,
      label: `${isTeam ? "全队" : "自身"}异常精通`,
      key: "anomalyProficiency",
      value: parseFlat(anomalyProficiencyMatch[1]),
      unit: "flat",
      target: isTeam ? "team" : "self",
      conditionText:
        stripped === anomalyProficiencyMatch[0] ? undefined : normalized,
    })
  }

  const anomalyMasteryMatch = stripped.match(/异常掌控提升([0-9.]+)点/)
  if (anomalyMasteryMatch) {
    tokens.push({
      effectKey: "self-anomaly-mastery",
      label: "自身异常掌控",
      key: "anomalyMastery",
      value: parseFlat(anomalyMasteryMatch[1]),
      unit: "flat",
      target: "self",
      conditionText:
        stripped === anomalyMasteryMatch[0] ? undefined : normalized,
    })
  }

  const energyRegenMatch = stripped.match(/能量自动回复提升([0-9.]+)点\/秒/)
  if (energyRegenMatch) {
    tokens.push({
      effectKey: "self-energy-regen",
      label: "自身能量自动回复",
      key: "energyRegen",
      value: parseFlat(energyRegenMatch[1]),
      unit: "flat",
      target: "self",
      conditionText: stripped === energyRegenMatch[0] ? undefined : normalized,
    })
  }

  const damageBonusMatch = stripped.match(
    /(?:全队角色|角色|自身|装备者)?造成的伤害提升([0-9.]+)%/,
  )
  if (damageBonusMatch) {
    const isTeam = stripped.includes("全队角色") || stripped.startsWith("角色")
    tokens.push({
      effectKey: `${isTeam ? "team" : "self"}-damage-bonus`,
      label: `${isTeam ? "全队" : "自身"}造成伤害`,
      key: "damageBonus",
      value: parsePercent(damageBonusMatch[1]),
      unit: "ratio",
      target: isTeam ? "team" : "self",
      conditionText: stripped === damageBonusMatch[0] ? undefined : normalized,
    })
  }

  const atkPercentMatch = stripped.match(/攻击力(?:额外)?提升([0-9.]+)%/)
  if (atkPercentMatch) {
    const isTeam = stripped.includes("全队角色") || stripped.startsWith("角色")
    tokens.push({
      effectKey: `${isTeam ? "team" : "self"}-atk-percent`,
      label: `${isTeam ? "全队" : "自身"}攻击力`,
      key: "atkPercent",
      value: parsePercent(atkPercentMatch[1]),
      unit: "ratio",
      target: isTeam ? "team" : "self",
      conditionText: stripped === atkPercentMatch[0] ? undefined : normalized,
    })
  }

  const attributeDamageMatch = stripped.match(
    /(物理|火|冰|电|以太)(?:属性)?(?:贯穿)?伤害提升([0-9.]+)%/,
  )
  if (attributeDamageMatch) {
    const isSheer = stripped.includes("贯穿伤害")
    tokens.push({
      effectKey: isSheer
        ? `${attributeDamageMatch[1]}-sheer-bonus`
        : `${attributeDamageMatch[1]}-damage-bonus`,
      label: isSheer
        ? `${attributeDamageMatch[1]}属性贯穿伤害`
        : `${attributeDamageMatch[1]}属性伤害`,
      key: isSheer ? "sheerBonus" : parseAttributeKey(attributeDamageMatch[1]),
      value: parsePercent(attributeDamageMatch[2]),
      unit: "ratio",
      target: stripped.includes("全队角色") ? "team" : "self",
      conditionText:
        stripped === attributeDamageMatch[0] ? undefined : normalized,
    })
  }

  const defenseReductionMatch =
    stripped.match(/目标的防御力降低([0-9.]+)%/) ??
    stripped.match(/无视([0-9.]+)%防御力/)
  if (defenseReductionMatch) {
    tokens.push({
      effectKey: "enemy-defense-reduction",
      label: "敌方防御力降低",
      key: "defenseReduction",
      value: parsePercent(defenseReductionMatch[1]),
      unit: "ratio",
      target: "enemy",
      conditionText:
        stripped === defenseReductionMatch[0] ? undefined : normalized,
    })
  }

  return tokens
}

function buildPassiveModifiers(
  descriptions: Record<RefineRank, LocalizedText>,
): StructuredExtraModifierEffect[] {
  const byEffectKey = new Map<string, ModifierAccumulator>()

  for (const rank of REFINE_RANKS) {
    const text = descriptions[rank]?.["zh-CN"]
    for (const clause of splitClauses(text)) {
      for (const token of parseClauseModifiers(clause)) {
        let current = byEffectKey.get(token.effectKey)
        if (!current) {
          current = {
            effectKey: token.effectKey,
            label: token.label,
            key: token.key,
            unit: token.unit,
            target: token.target,
            conditionText: token.conditionText,
            values: {},
          }
          byEffectKey.set(token.effectKey, current)
        }
        current.values[rank] = token.value
      }
    }
  }

  return [...byEffectKey.values()]
    .filter(
      (effect) =>
        !(
          effect.conditionText &&
          (effect.conditionText.includes("最多叠加") ||
            effect.conditionText.includes("每层") ||
            effect.conditionText.includes("叠加到") ||
            effect.conditionText.includes("层数") ||
            /(?:获得|拥有)\d+层/.test(effect.conditionText))
        ),
    )
    .map((effect) => ({
      id: `passive:${effect.effectKey}`,
      label: effect.label,
      bucket: "modifier" as const,
      key: effect.key,
      value: levelValue(effect.values),
      unit: effect.unit,
      target: effect.target,
      conditionText: effect.conditionText,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

function buildBaseAtkByLevel(
  baseAtkLv0: number,
  levels: GachabaseWEngineDetailRecord["levels"],
  stars: GachabaseWEngineDetailRecord["stars"],
): Record<number, number> {
  const result: Record<number, number> = {}

  for (const level of levels) {
    const star = stars.find(
      (entry) => level.level >= entry.minLevel && level.level <= entry.maxLevel,
    )
    assert(star, `missing star bracket for level ${level.level}`)

    result[level.level] = roundStatValue(
      baseAtkLv0 * (1 + (level.baseStatGrowth + star.baseStatGrowth) / 10000),
    )
  }

  return result
}

function buildAdvancedStatByLevel(
  advancedStatName: string | undefined,
  advancedStatLv0: number | undefined,
  levels: GachabaseWEngineDetailRecord["levels"],
  stars: GachabaseWEngineDetailRecord["stars"],
): Record<number, WEngineAdvancedStatByLevelEntry> | undefined {
  if (!advancedStatName || advancedStatLv0 === undefined) {
    return undefined
  }

  const key = mapAdvancedStatKey(advancedStatName)
  const result: Record<number, WEngineAdvancedStatByLevelEntry> = {}

  for (const level of levels) {
    const star = stars.find(
      (entry) => level.level >= entry.minLevel && level.level <= entry.maxLevel,
    )
    assert(star, `missing star bracket for advanced stat level ${level.level}`)

    result[level.level] = {
      key,
      value: roundStatValue(
        advancedStatLv0 * (1 + star.advancedStatGrowth / 10000),
      ),
    }
  }

  return result
}

function getSkillDescriptionByLevel(
  record: XlsxWEngineDescRecord | undefined,
  level: RefineRank,
): string | undefined {
  if (!record) {
    return undefined
  }

  return record[`skillDescriptionLv${level}` as const]
}

function getEffectTextByLevel(
  effects: GachabaseWEngineListRecord["effects"],
  level: RefineRank,
): string | undefined {
  return effects?.find((entry) => entry.level === level)?.effect
}

function main(): void {
  const xlsxStat = readJson<XlsxWEngineStatRecord[]>(
    path.join(SOURCE_DIR, "xlsx/zh-CN/w-engine-stat.json"),
  )
  const xlsxDesc = readJson<XlsxWEngineDescRecord[]>(
    path.join(SOURCE_DIR, "xlsx/zh-CN/w-engine-desc.json"),
  )
  const zhList = readJson<GachabaseWEngineListRecord[]>(
    path.join(SOURCE_DIR, "gachabase/zh-CN/w-engines.json"),
  )
  const enList = readJson<GachabaseWEngineListRecord[]>(
    path.join(SOURCE_DIR, "gachabase/en/w-engines.json"),
  )
  const zhDetails = readJson<GachabaseWEngineDetailRecord[]>(
    path.join(SOURCE_DIR, "gachabase/zh-CN/w-engine-details.json"),
  )
  const enDetails = readJson<GachabaseWEngineDetailRecord[]>(
    path.join(SOURCE_DIR, "gachabase/en/w-engine-details.json"),
  )

  const xlsxStatById = new Map(
    xlsxStat.map((record) => [String(record.id), record]),
  )
  const xlsxDescById = new Map(
    xlsxDesc.map((record) => [String(record.id), record]),
  )
  const zhListById = new Map(zhList.map((record) => [record.id, record]))
  const enListById = new Map(enList.map((record) => [record.id, record]))
  const zhDetailsById = new Map(zhDetails.map((record) => [record.id, record]))
  const enDetailsById = new Map(enDetails.map((record) => [record.id, record]))

  const ids = [...zhListById.keys()].sort(
    (left, right) => Number(left) - Number(right),
  )

  const index: WEngineIndexFile = {}
  const stageDir = createStageDir()
  const stageOutputDir = path.join(stageDir, "w-engine")
  const profileDir = path.join(stageOutputDir, "profile")
  const mechanicsDir = path.join(stageOutputDir, "mechanics")

  for (const id of ids) {
    const zhStat = xlsxStatById.get(id)
    const zhDesc = xlsxDescById.get(id)
    const zhListEntry = zhListById.get(id)
    const enListEntry = enListById.get(id)
    const zhDetail = zhDetailsById.get(id)
    const enDetail = enDetailsById.get(id)

    assert(zhListEntry, `missing gachabase zh list for w-engine ${id}`)
    assert(enListEntry, `missing gachabase en list for w-engine ${id}`)
    assert(zhDetail, `missing gachabase zh details for w-engine ${id}`)
    assert(enDetail, `missing gachabase en details for w-engine ${id}`)

    const imageKey =
      zhListEntry.icon ??
      zhDetail.assets?.splashArt?.url ??
      enDetail.assets?.splashArt?.url

    index[id] = {
      id,
      slug: enListEntry.slug,
      names: {
        "en": enDetail.name,
        "zh-CN": zhDetail.name,
      },
      imageKey,
      rank: mapRarity(zhStat?.rarity ?? zhListEntry.rarity),
      locales: [...PROFILE_LOCALES],
    }

    const profiles: Record<Locale, WEngineProfileFile> = {
      "en": {
        id,
        locale: "en",
        name: enDetail.name,
        imageKey,
        rank: mapRarity(enListEntry.rarity),
        summaryText: stripHtml(enDetail.shortComment),
        descriptionText: stripHtml(enDetail.longComment),
      },
      "zh-CN": {
        id,
        locale: "zh-CN",
        name: zhDetail.name,
        imageKey,
        rank: mapRarity(zhStat?.rarity ?? zhListEntry.rarity),
        summaryText: stripHtml(zhDetail.shortComment),
        descriptionText: stripHtml(zhDetail.longComment),
      },
    }

    for (const locale of PROFILE_LOCALES) {
      writeJson(path.join(profileDir, locale, `${id}.json`), profiles[locale])
    }

    const skillDescriptionsByRefine = Object.fromEntries(
      REFINE_RANKS.map((rank) => [
        rank,
        {
          "en": stripHtml(getEffectTextByLevel(enListEntry.effects, rank)),
          "zh-CN": stripHtml(getSkillDescriptionByLevel(zhDesc, rank)),
        },
      ]),
    ) as Record<RefineRank, LocalizedText>

    const mechanics: WEngineMechanicsFile = {
      id,
      panel: {
        baseAtkByLevel: buildBaseAtkByLevel(
          zhStat?.baseAtkLv0 ?? zhListEntry.baseStat.value,
          zhDetail.levels,
          zhDetail.stars,
        ),
        advancedStatByLevel: buildAdvancedStatByLevel(
          zhListEntry.advancedStat?.name ?? zhStat?.advancedStat,
          zhListEntry.advancedStat?.value ?? zhStat?.advancedStatLv0,
          zhDetail.levels,
          zhDetail.stars,
        ),
      },
      effects: {
        modifiers: buildPassiveModifiers(skillDescriptionsByRefine),
        overrides: [],
      },
      trace: {
        sourceRefs: [
          "data/source/gachabase/zh-CN/w-engines.json",
          "data/source/gachabase/en/w-engines.json",
          "data/source/gachabase/zh-CN/w-engine-details.json",
          "data/source/gachabase/en/w-engine-details.json",
          ...(zhStat ? ["data/source/xlsx/zh-CN/w-engine-stat.json"] : []),
          ...(zhDesc ? ["data/source/xlsx/zh-CN/w-engine-desc.json"] : []),
        ],
        skillNameTexts: {
          "en": stripHtml(enListEntry.effects?.[0]?.name),
          "zh-CN": stripHtml(
            zhDesc?.skillName ?? zhListEntry.effects?.[0]?.name,
          ),
        },
        skillDescriptionsByRefine,
      },
    }

    writeJson(path.join(mechanicsDir, `${id}.json`), mechanics)
  }

  writeJson(path.join(stageOutputDir, "index.json"), index)

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
  fs.renameSync(stageOutputDir, OUTPUT_DIR)
  fs.rmSync(stageDir, { recursive: true, force: true })

  console.log(
    `Generated ${ids.length} w-engines into ${path.relative(process.cwd(), OUTPUT_DIR)}`,
  )
}

main()

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../../data")
const SOURCE_DIR = path.join(DATA_DIR, "source")
const OUTPUT_DIR = path.join(DATA_DIR, "agent")

const PROFILE_LOCALES = ["en", "zh-CN"] as const
const CINEMA_LEVELS = [1, 2, 3, 4, 5, 6] as const
const POTENTIAL_LEVELS = [1, 2, 3, 4, 5, 6] as const

type Locale = (typeof PROFILE_LOCALES)[number]
type AgentId = string
type PanelStatKey =
  | "hp"
  | "atk"
  | "def"
  | "impact"
  | "sheerForce"
  | "critRate"
  | "critDamage"
  | "anomalyMastery"
  | "anomalyProficiency"
  | "penRate"
  | "penFlat"
  | "energyRegen"
type PercentStatKey = "hpPercent" | "atkPercent" | "defPercent"
type DamageBonusKey =
  | "physicalDamageBonus"
  | "fireDamageBonus"
  | "iceDamageBonus"
  | "electricDamageBonus"
  | "etherDamageBonus"
type SourcePanelStatKey = PanelStatKey | PercentStatKey | DamageBonusKey

const RATIO_SOURCE_PANEL_STAT_KEYS = new Set<SourcePanelStatKey>([
  "critRate",
  "critDamage",
  "hpPercent",
  "atkPercent",
  "defPercent",
  "physicalDamageBonus",
  "fireDamageBonus",
  "iceDamageBonus",
  "electricDamageBonus",
  "etherDamageBonus",
])

const OMITTED_SPECIAL_PANEL_STAT_IDS = new Set([
  "32001", // 闪能自动累积
])

const SOURCE_PANEL_STAT_NAMES: Partial<Record<string, string>> = {
  "11102": "生命值",
  "12102": "攻击力",
  "13102": "防御力",
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

interface StructuredPanelEffect {
  id: string
  label: string
  bucket: "panel"
  key: SourcePanelStatKey
  value: ValueDefinition
  unit: "flat" | "ratio"
}

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

interface AgentStatRecord {
  id: number
  agent: string
  name: string
  attribute?: string
  specialty?: string
}

interface GachabaseAgentListRecord {
  id: string
  slug: string
  name: string
  rarity: number
  specialty?: string
  attributes?: string[]
}

interface GachabaseAgentDetailRecord {
  id: string
  fullName: string
  profile?: {
    details?: string
    details2?: string
  }
  skins?: Array<{
    assets?: {
      circleIcon?: string
      splashArt?: {
        url: string
      }
    }
  }>
  stats: Array<{
    id: string
    name: string
    value: number
    growthPerLevel: number | null
  }>
  promotions: Array<{
    promotion: number
    maxLevel: number
    statBoosts: Array<{
      statId: string
      value: number
    }>
  }>
  coreSkills: Array<{
    typeName: string
    level: number
    skills: Array<{
      id: string
      name: string
      description: string
    }>
    statBoosts: Array<{
      statId: string
      value: number
    }>
  }>
  mindscapes?: Array<{
    level: number
    description: string
  }>
  potentialVisions?: Array<{
    level: number
    description: string
  }>
}

interface PanelStatBlock {
  hp?: number
  atk?: number
  def?: number
  impact?: number
  sheerForce?: number
  critRate?: number
  critDamage?: number
  anomalyMastery?: number
  anomalyProficiency?: number
  penRate?: number
  penFlat?: number
  energyRegen?: number
}

type StatsByLevel<T> = Record<number, T>

interface AgentIndexEntry {
  id: AgentId
  slug: string
  names: Partial<Record<Locale, string>>
  imageKey?: string
  rank?: "A" | "S"
  attribute?: string
  specialty?: string
  locales: Locale[]
}

type AgentIndexFile = Record<AgentId, AgentIndexEntry>

interface AgentProfileFile {
  id: AgentId
  locale: Locale
  name: string
  aliases: string[]
  imageKey?: string
  rank?: "A" | "S"
  attribute?: string
  specialty?: string
  descriptionText?: string
}

interface AgentMechanicsFile {
  id: AgentId
  panel: {
    baseStatsByLevel: StatsByLevel<PanelStatBlock>
    promotionStatsByLevel?: StatsByLevel<
      Partial<Pick<PanelStatBlock, "hp" | "atk" | "def">>
    >
    coreSpecialPanelEffects?: StructuredPanelEffect[]
    cinemaPanelEffects?: StructuredPanelEffect[]
    potentialPanelEffects?: StructuredPanelEffect[]
  }
  effects: {
    modifiers: StructuredExtraModifierEffect[]
    overrides: StructuredOverrideEffect[]
  }
  trace: {
    sourceRefs: string[]
    coreTexts?: LocalizedText
    additionalAbilityTexts?: LocalizedText
    cinemaTexts?: LocalizedText[]
    potentialTexts?: LocalizedText[]
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`generate agent failed: ${message}`)
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

function staticValue(value: number): StaticValueDefinition {
  return {
    kind: "static",
    value,
  }
}

function levelValue(
  inputKey: string,
  values: Record<number, number>,
): LevelTableValueDefinition {
  return {
    kind: "by-level",
    inputKey,
    values,
  }
}

function parsePercent(value: string): number {
  return roundStatValue(Number(value) / 100)
}

function parseFlat(value: string): number {
  return roundStatValue(Number(value))
}

function parseDamageBonusKey(
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
      throw new Error(`generate agent failed: unsupported attribute ${value}`)
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

function shouldSkipComplexClause(value: string): boolean {
  return (
    value.includes("无视目标") ||
    value.includes("最多叠加") ||
    value.includes("每层") ||
    value.includes("每有") ||
    value.includes("叠加到") ||
    value.includes("层数") ||
    value.includes("每超过") ||
    value.includes("上限") ||
    value.includes("转而计算") ||
    value.includes("不计算") ||
    /(?:获得|拥有)\d+层/.test(value)
  )
}

function parseClauseModifiers(clause: string): ParsedModifierToken[] {
  const normalized = normalizeClause(clause)
  const stripped = stripBrackets(normalized)

  if (shouldSkipComplexClause(stripped)) {
    return []
  }

  const tokens: ParsedModifierToken[] = []

  const target: StructuredExtraModifierEffect["target"] = stripped.includes(
    "全队角色",
  )
    ? "team"
    : "self"

  const critRateMatch = stripped.match(/暴击率提升([0-9.]+)%/)
  if (critRateMatch) {
    tokens.push({
      effectKey: `${target}-crit-rate`,
      label: `${target === "team" ? "全队" : "自身"}暴击率`,
      key: "critRate",
      value: parsePercent(critRateMatch[1]),
      unit: "ratio",
      target,
      conditionText: stripped === critRateMatch[0] ? undefined : normalized,
    })
  }

  const critDamageMatch = stripped.match(/暴击伤害(?:额外)?提升([0-9.]+)%/)
  if (critDamageMatch) {
    tokens.push({
      effectKey: `${target}-crit-damage`,
      label: `${target === "team" ? "全队" : "自身"}暴击伤害`,
      key: "critDamage",
      value: parsePercent(critDamageMatch[1]),
      unit: "ratio",
      target,
      conditionText: stripped === critDamageMatch[0] ? undefined : normalized,
    })
  }

  const atkPercentMatch = stripped.match(/攻击力(?:额外)?提升([0-9.]+)%/)
  if (atkPercentMatch) {
    tokens.push({
      effectKey: `${target}-atk-percent`,
      label: `${target === "team" ? "全队" : "自身"}攻击力`,
      key: "atkPercent",
      value: parsePercent(atkPercentMatch[1]),
      unit: "ratio",
      target,
      conditionText: stripped === atkPercentMatch[0] ? undefined : normalized,
    })
  }

  const damageBonusMatch = stripped.match(/造成的伤害提升([0-9.]+)%/)
  if (damageBonusMatch) {
    tokens.push({
      effectKey: `${target}-damage-bonus`,
      label: `${target === "team" ? "全队" : "自身"}造成伤害`,
      key: "damageBonus",
      value: parsePercent(damageBonusMatch[1]),
      unit: "ratio",
      target,
      conditionText: stripped === damageBonusMatch[0] ? undefined : normalized,
    })
  }

  const typedDamageBonusMatch = stripped.match(
    /(普通攻击|冲刺攻击|追加攻击|连携技|终结技|特殊技|强化特殊技|支援攻击|支援突击)造成的伤害提升([0-9.]+)%/,
  )
  if (typedDamageBonusMatch) {
    const [_, attackType, rawValue] = typedDamageBonusMatch
    const mapping: Record<string, Extract<
      ExtraModifierKey,
      | "normalAttackDamageBonus"
      | "dashAttackDamageBonus"
      | "followUpAttackDamageBonus"
      | "chainAttackDamageBonus"
      | "ultimateDamageBonus"
      | "specialAttackDamageBonus"
      | "enhancedSpecialDamageBonus"
      | "assistDamageBonus"
    >> = {
      普通攻击: "normalAttackDamageBonus",
      冲刺攻击: "dashAttackDamageBonus",
      追加攻击: "followUpAttackDamageBonus",
      连携技: "chainAttackDamageBonus",
      终结技: "ultimateDamageBonus",
      特殊技: "specialAttackDamageBonus",
      强化特殊技: "enhancedSpecialDamageBonus",
      支援攻击: "assistDamageBonus",
      支援突击: "assistDamageBonus",
    }

    tokens.push({
      effectKey: `${target}-${mapping[attackType]}`,
      label: `${target === "team" ? "全队" : "自身"}${attackType}伤害`,
      key: mapping[attackType],
      value: parsePercent(rawValue),
      unit: "ratio",
      target,
      conditionText:
        stripped === typedDamageBonusMatch[0] ? undefined : normalized,
    })
  }

  const anomalyProficiencyMatch = stripped.match(/异常精通提升([0-9.]+)点/)
  if (anomalyProficiencyMatch) {
    tokens.push({
      effectKey: `${target}-anomaly-proficiency`,
      label: `${target === "team" ? "全队" : "自身"}异常精通`,
      key: "anomalyProficiency",
      value: parseFlat(anomalyProficiencyMatch[1]),
      unit: "flat",
      target,
      conditionText:
        stripped === anomalyProficiencyMatch[0] ? undefined : normalized,
    })
  }

  const anomalyMasteryMatch = stripped.match(/异常掌控提升([0-9.]+)点/)
  if (anomalyMasteryMatch) {
    tokens.push({
      effectKey: `${target}-anomaly-mastery`,
      label: `${target === "team" ? "全队" : "自身"}异常掌控`,
      key: "anomalyMastery",
      value: parseFlat(anomalyMasteryMatch[1]),
      unit: "flat",
      target,
      conditionText:
        stripped === anomalyMasteryMatch[0] ? undefined : normalized,
    })
  }

  const energyRegenMatch = stripped.match(/能量自动回复提升([0-9.]+)点/)
  if (energyRegenMatch) {
    tokens.push({
      effectKey: `${target}-energy-regen`,
      label: `${target === "team" ? "全队" : "自身"}能量自动回复`,
      key: "energyRegen",
      value: parseFlat(energyRegenMatch[1]),
      unit: "flat",
      target,
      conditionText: stripped === energyRegenMatch[0] ? undefined : normalized,
    })
  }

  const attributeDamageMatch = stripped.match(
    /造成的(物理|火|冰|电|以太)(?:属性)?伤害提升([0-9.]+)%/,
  )
  if (attributeDamageMatch) {
    tokens.push({
      effectKey: `${target}-${attributeDamageMatch[1]}-damage-bonus`,
      label: `${target === "team" ? "全队" : "自身"}${attributeDamageMatch[1]}属性伤害`,
      key: parseDamageBonusKey(attributeDamageMatch[1]),
      value: parsePercent(attributeDamageMatch[2]),
      unit: "ratio",
      target,
      conditionText:
        stripped === attributeDamageMatch[0] ? undefined : normalized,
    })
  }

  const sheerBonusMatch = stripped.match(/贯穿伤害提升([0-9.]+)%/)
  if (sheerBonusMatch) {
    tokens.push({
      effectKey: `${target}-sheer-bonus`,
      label: `${target === "team" ? "全队" : "自身"}贯穿伤害`,
      key: "sheerBonus",
      value: parsePercent(sheerBonusMatch[1]),
      unit: "ratio",
      target,
      conditionText: stripped === sheerBonusMatch[0] ? undefined : normalized,
    })
  }

  const defenseReductionMatch = stripped.match(/目标的防御力降低([0-9.]+)%/)
  if (defenseReductionMatch) {
    tokens.push({
      effectKey: "enemy-defense-reduction",
      label: "目标防御力降低",
      key: "defenseReduction",
      value: parsePercent(defenseReductionMatch[1]),
      unit: "ratio",
      target: "enemy",
      conditionText:
        stripped === defenseReductionMatch[0] ? undefined : normalized,
    })
  }

  const dazeVulnerabilityMatch = stripped.match(
    /(?:目标的)?失衡易伤倍率提升([0-9.]+)%/,
  )
  if (dazeVulnerabilityMatch) {
    tokens.push({
      effectKey: "enemy-daze-vulnerability-bonus",
      label: "目标失衡易伤倍率",
      key: "dazeVulnerabilityBonus",
      value: parsePercent(dazeVulnerabilityMatch[1]),
      unit: "ratio",
      target: "enemy",
      conditionText:
        stripped === dazeVulnerabilityMatch[0] ? undefined : normalized,
    })
  }

  return tokens
}

function buildStaticModifiers(
  sourceId: string,
  sourceTexts: Array<{
    sourceKey: string
    labelPrefix: string
    text: string | undefined
  }>,
): StructuredExtraModifierEffect[] {
  const effects: StructuredExtraModifierEffect[] = []

  for (const source of sourceTexts) {
    for (const clause of splitClauses(stripHtml(source.text))) {
      for (const token of parseClauseModifiers(clause)) {
        effects.push({
          id: `${sourceId}:${source.sourceKey}:${token.effectKey}`,
          label: `${source.labelPrefix}${token.label}`,
          bucket: "modifier",
          key: token.key,
          value: staticValue(token.value),
          unit: token.unit,
          target: token.target,
          conditionText: token.conditionText,
        })
      }
    }
  }

  return effects
}

function buildLevelledModifiers(
  sourceId: string,
  sourceTexts: Array<{
    inputLevel: number
    text: string | undefined
  }>,
  inputKey: string,
  labelPrefix: string,
): StructuredExtraModifierEffect[] {
  const byEffectKey = new Map<string, ModifierAccumulator>()

  for (const source of sourceTexts) {
    for (const clause of splitClauses(stripHtml(source.text))) {
      for (const token of parseClauseModifiers(clause)) {
        let current = byEffectKey.get(token.effectKey)
        if (!current) {
          current = {
            effectKey: token.effectKey,
            label: `${labelPrefix}${token.label}`,
            key: token.key,
            unit: token.unit,
            target: token.target,
            conditionText: token.conditionText,
            values: {},
          }
          byEffectKey.set(token.effectKey, current)
        }

        current.values[source.inputLevel] = token.value
      }
    }
  }

  return [...byEffectKey.values()].map((effect) => ({
    id: `${sourceId}:${effect.effectKey}`,
    label: effect.label,
    bucket: "modifier",
    key: effect.key,
    value: levelValue(inputKey, effect.values),
    unit: effect.unit,
    target: effect.target,
    conditionText: effect.conditionText,
  }))
}

function mapRarity(value: number | undefined): "A" | "S" | undefined {
  if (value === 4) {
    return "S"
  }

  if (value === 3) {
    return "A"
  }

  return undefined
}

function mapBasePanelStatKey(
  statId: string,
  statName: string,
): PanelStatKey | undefined {
  if (OMITTED_SPECIAL_PANEL_STAT_IDS.has(statId)) {
    return undefined
  }

  switch (statId) {
    case "11101":
      return "hp"
    case "12101":
      return "atk"
    case "13101":
      return "def"
    case "12201":
      return "impact"
    case "12301":
      return "sheerForce"
    case "20101":
      return "critRate"
    case "21101":
      return "critDamage"
    case "31401":
      return "anomalyMastery"
    case "31201":
      return "anomalyProficiency"
    case "23101":
      return "penRate"
    case "23201":
      return "penFlat"
    case "30501":
      return "energyRegen"
    default:
      throw new Error(
        `generate agent failed: unsupported stat ${statId} (${statName})`,
      )
  }
}

function mapSourcePanelStatKey(
  statId: string,
  statName: string | undefined,
): SourcePanelStatKey | undefined {
  if (OMITTED_SPECIAL_PANEL_STAT_IDS.has(statId)) {
    return undefined
  }

  switch (statId) {
    case "11102":
      return "hpPercent"
    case "12102":
      return "atkPercent"
    case "13102":
      return "defPercent"
    default:
      return mapBasePanelStatKey(statId, statName ?? statId)
  }
}

function getSourcePanelUnit(
  key: SourcePanelStatKey,
): StructuredPanelEffect["unit"] {
  return RATIO_SOURCE_PANEL_STAT_KEYS.has(key) ? "ratio" : "flat"
}

function buildBaseStatsByLevel(
  stats: GachabaseAgentDetailRecord["stats"],
): StatsByLevel<PanelStatBlock> {
  const result: StatsByLevel<PanelStatBlock> = {}

  for (let level = 1; level <= 60; level += 1) {
    const block: PanelStatBlock = {}

    for (const stat of stats) {
      const key = mapBasePanelStatKey(stat.id, stat.name)
      if (!key) {
        continue
      }
      const value =
        stat.growthPerLevel === null
          ? stat.value
          : stat.value + stat.growthPerLevel * (level - 1)
      block[key] = roundStatValue(value)
    }

    result[level] = block
  }

  return result
}

function buildPromotionStatsByLevel(
  promotions: GachabaseAgentDetailRecord["promotions"],
): StatsByLevel<Partial<Pick<PanelStatBlock, "hp" | "atk" | "def">>> {
  const result: StatsByLevel<
    Partial<Pick<PanelStatBlock, "hp" | "atk" | "def">>
  > = {}

  for (let level = 1; level <= 60; level += 1) {
    const promotion = promotions.find((entry) => level <= entry.maxLevel)
    assert(promotion, `missing promotion bracket for level ${level}`)

    const block: Partial<Pick<PanelStatBlock, "hp" | "atk" | "def">> = {}
    for (const statBoost of promotion.statBoosts) {
      if (statBoost.statId === "11101") {
        block.hp = statBoost.value
      } else if (statBoost.statId === "12101") {
        block.atk = statBoost.value
      } else if (statBoost.statId === "13101") {
        block.def = statBoost.value
      }
    }

    result[level] = block
  }

  return result
}

function buildCoreSpecialPanelEffects(
  detail: GachabaseAgentDetailRecord,
): StructuredPanelEffect[] {
  const coreLevels = detail.coreSkills
    .filter((entry) => entry.typeName === "核心技")
    .sort((left, right) => left.level - right.level)

  const statNameById = new Map(detail.stats.map((stat) => [stat.id, stat.name]))
  const valuesByStatId = new Map<string, Record<number, number>>()

  for (const coreLevel of coreLevels) {
    for (const statBoost of coreLevel.statBoosts) {
      let values = valuesByStatId.get(statBoost.statId)
      if (!values) {
        values = {}
        valuesByStatId.set(statBoost.statId, values)
      }

      values[coreLevel.level] = statBoost.value
    }
  }

  const effects: StructuredPanelEffect[] = []

  for (const [statId, values] of valuesByStatId) {
    const allLevels = Object.keys(values)
      .map(Number)
      .sort((left, right) => left - right)
    const hasNonZero = allLevels.some((level) => values[level] !== 0)
    if (!hasNonZero) {
      continue
    }

    const statName = statNameById.get(statId) ?? SOURCE_PANEL_STAT_NAMES[statId]
    assert(statName, `missing stat name for core stat boost ${statId}`)
    const key = mapSourcePanelStatKey(statId, statName)
    if (!key) {
      continue
    }
    effects.push({
      id: `core:${statId}`,
      label: `核心技${statName}`,
      bucket: "panel",
      key,
      value: {
        kind: "by-level",
        inputKey: "coreSkillLevel",
        values,
      },
      unit: getSourcePanelUnit(key),
    })
  }

  return effects
}

function pickImageKey(detail: GachabaseAgentDetailRecord): string | undefined {
  return (
    detail.skins?.[0]?.assets?.circleIcon ??
    detail.skins?.[0]?.assets?.splashArt?.url
  )
}

function buildProfileDescription(
  detail: GachabaseAgentDetailRecord | undefined,
): string | undefined {
  if (!detail?.profile) {
    return undefined
  }

  const sections = [
    stripHtml(detail.profile.details),
    stripHtml(detail.profile.details2),
  ].filter((value): value is string => Boolean(value))

  return sections.length > 0 ? sections.join("\n\n") : undefined
}

function buildAliases(
  mainName: string,
  xlsxRecord: AgentStatRecord | undefined,
  detail: GachabaseAgentDetailRecord | undefined,
): string[] {
  const candidates = [xlsxRecord?.agent, xlsxRecord?.name, detail?.fullName]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== mainName)

  return [...new Set(candidates)]
}

function buildCoreTraceTexts(detail: GachabaseAgentDetailRecord | undefined): {
  core?: string
  additional?: string
} {
  if (!detail) {
    return {}
  }

  const highestCore = detail.coreSkills
    .filter((entry) => entry.typeName === "核心技")
    .sort((left, right) => right.level - left.level)[0]

  if (!highestCore) {
    return {}
  }

  const coreText = stripHtml(
    highestCore.skills.find((skill) => skill.name.startsWith("核心被动"))
      ?.description,
  )
  const additionalText = stripHtml(
    highestCore.skills.find((skill) => skill.name.startsWith("额外能力"))
      ?.description,
  )

  return {
    core: coreText,
    additional: additionalText,
  }
}

function buildCoreLevelledModifiers(
  detail: GachabaseAgentDetailRecord,
): StructuredExtraModifierEffect[] {
  const coreTexts = detail.coreSkills
    .filter((entry) => entry.typeName === "核心技")
    .sort((left, right) => left.level - right.level)
    .map((entry) => ({
      inputLevel: entry.level,
      text: entry.skills.find((skill) => skill.name.startsWith("核心被动"))
        ?.description,
    }))

  return buildLevelledModifiers(
    detail.id,
    coreTexts,
    "coreSkillLevel",
    "核心被动",
  )
}

function buildAdditionalAbilityModifiers(
  detail: GachabaseAgentDetailRecord,
): StructuredExtraModifierEffect[] {
  const additionalTexts = detail.coreSkills
    .filter((entry) => entry.typeName === "核心技")
    .sort((left, right) => left.level - right.level)
    .map((entry) => ({
      inputLevel: entry.level,
      text: entry.skills.find((skill) => skill.name.startsWith("额外能力"))
        ?.description,
    }))

  return buildLevelledModifiers(
    detail.id,
    additionalTexts,
    "coreSkillLevel",
    "额外能力",
  )
}

function buildCinemaModifiers(
  detail: GachabaseAgentDetailRecord,
): StructuredExtraModifierEffect[] {
  return buildStaticModifiers(
    detail.id,
    CINEMA_LEVELS.map((level) => ({
      sourceKey: `cinema:${level}`,
      labelPrefix: `影画${level}`,
      text: detail.mindscapes?.find((entry) => entry.level === level)
        ?.description,
    })),
  )
}

function buildPotentialModifiers(
  detail: GachabaseAgentDetailRecord,
): StructuredExtraModifierEffect[] {
  return buildStaticModifiers(
    detail.id,
    POTENTIAL_LEVELS.map((level) => ({
      sourceKey: `potential:${level}`,
      labelPrefix: `潜能激化${level}`,
      text: detail.potentialVisions?.find((entry) => entry.level === level)
        ?.description,
    })),
  )
}

function buildCinemaTexts(
  zhDetail: GachabaseAgentDetailRecord,
  enDetail: GachabaseAgentDetailRecord,
): LocalizedText[] | undefined {
  const texts = CINEMA_LEVELS.map((level) => ({
    "en": stripHtml(
      enDetail.mindscapes?.find((entry) => entry.level === level)?.description,
    ),
    "zh-CN": stripHtml(
      zhDetail.mindscapes?.find((entry) => entry.level === level)?.description,
    ),
  })).filter((entry) => entry.en || entry["zh-CN"])

  return texts.length > 0 ? texts : undefined
}

function buildPotentialTexts(
  zhDetail: GachabaseAgentDetailRecord,
  enDetail: GachabaseAgentDetailRecord,
): LocalizedText[] | undefined {
  const texts = POTENTIAL_LEVELS.map((level) => ({
    "en": stripHtml(
      enDetail.potentialVisions?.find((entry) => entry.level === level)
        ?.description,
    ),
    "zh-CN": stripHtml(
      zhDetail.potentialVisions?.find((entry) => entry.level === level)
        ?.description,
    ),
  })).filter((entry) => entry.en || entry["zh-CN"])

  return texts.length > 0 ? texts : undefined
}

function main(): void {
  const xlsxStats = readJson<AgentStatRecord[]>(
    path.join(SOURCE_DIR, "xlsx/zh-CN/agent-stat.json"),
  )
  const zhList = readJson<GachabaseAgentListRecord[]>(
    path.join(SOURCE_DIR, "gachabase/zh-CN/agents.json"),
  )
  const enList = readJson<GachabaseAgentListRecord[]>(
    path.join(SOURCE_DIR, "gachabase/en/agents.json"),
  )
  const zhDetails = readJson<GachabaseAgentDetailRecord[]>(
    path.join(SOURCE_DIR, "gachabase/zh-CN/agent-details.json"),
  )
  const enDetails = readJson<GachabaseAgentDetailRecord[]>(
    path.join(SOURCE_DIR, "gachabase/en/agent-details.json"),
  )

  const xlsxById = new Map(
    xlsxStats.map((record) => [String(record.id), record]),
  )
  const zhListById = new Map(zhList.map((record) => [record.id, record]))
  const enListById = new Map(enList.map((record) => [record.id, record]))
  const zhDetailsById = new Map(zhDetails.map((record) => [record.id, record]))
  const enDetailsById = new Map(enDetails.map((record) => [record.id, record]))
  const ids = [...zhListById.keys()].sort(
    (left, right) => Number(left) - Number(right),
  )

  const index: AgentIndexFile = {}
  const stageDir = createStageDir()
  const stageOutputDir = path.join(stageDir, "agent")
  const profileDir = path.join(stageOutputDir, "profile")
  const mechanicsDir = path.join(stageOutputDir, "mechanics")

  for (const id of ids) {
    const xlsxRecord = xlsxById.get(id)
    const zhListEntry = zhListById.get(id)
    const enListEntry = enListById.get(id)
    const zhDetail = zhDetailsById.get(id)
    const enDetail = enDetailsById.get(id)

    assert(zhListEntry, `missing zh list for agent ${id}`)
    assert(enListEntry, `missing en list for agent ${id}`)
    assert(zhDetail, `missing zh detail for agent ${id}`)
    assert(enDetail, `missing en detail for agent ${id}`)

    const imageKey = pickImageKey(zhDetail) ?? pickImageKey(enDetail)
    const attribute = zhListEntry.attributes?.[0] ?? xlsxRecord?.attribute

    index[id] = {
      id,
      slug: enListEntry.slug,
      names: {
        "en": enListEntry.name,
        "zh-CN": zhListEntry.name,
      },
      imageKey,
      rank: mapRarity(zhListEntry.rarity),
      attribute,
      specialty: zhListEntry.specialty ?? xlsxRecord?.specialty,
      locales: [...PROFILE_LOCALES],
    }

    const profiles: Record<Locale, AgentProfileFile> = {
      "en": {
        id,
        locale: "en",
        name: enListEntry.name,
        aliases: buildAliases(enListEntry.name, undefined, enDetail),
        imageKey,
        rank: mapRarity(enListEntry.rarity),
        attribute,
        specialty: enListEntry.specialty,
        descriptionText: buildProfileDescription(enDetail),
      },
      "zh-CN": {
        id,
        locale: "zh-CN",
        name: zhListEntry.name,
        aliases: buildAliases(zhListEntry.name, xlsxRecord, zhDetail),
        imageKey,
        rank: mapRarity(zhListEntry.rarity),
        attribute,
        specialty: zhListEntry.specialty ?? xlsxRecord?.specialty,
        descriptionText: buildProfileDescription(zhDetail),
      },
    }

    for (const locale of PROFILE_LOCALES) {
      writeJson(path.join(profileDir, locale, `${id}.json`), profiles[locale])
    }

    const zhCoreTrace = buildCoreTraceTexts(zhDetail)
    const enCoreTrace = buildCoreTraceTexts(enDetail)
    const modifiers = [
      ...buildCoreLevelledModifiers(zhDetail),
      ...buildAdditionalAbilityModifiers(zhDetail),
      ...buildCinemaModifiers(zhDetail),
      ...buildPotentialModifiers(zhDetail),
    ]

    const mechanics: AgentMechanicsFile = {
      id,
      panel: {
        baseStatsByLevel: buildBaseStatsByLevel(zhDetail.stats),
        promotionStatsByLevel: buildPromotionStatsByLevel(zhDetail.promotions),
        coreSpecialPanelEffects: buildCoreSpecialPanelEffects(zhDetail),
        cinemaPanelEffects: [],
        potentialPanelEffects: [],
      },
      effects: {
        modifiers,
        overrides: [],
      },
      trace: {
        sourceRefs: [
          "data/source/xlsx/zh-CN/agent-stat.json",
          "data/source/gachabase/zh-CN/agents.json",
          "data/source/gachabase/en/agents.json",
          "data/source/gachabase/zh-CN/agent-details.json",
          "data/source/gachabase/en/agent-details.json",
        ],
        coreTexts:
          zhCoreTrace.core || enCoreTrace.core
            ? {
                "en": enCoreTrace.core,
                "zh-CN": zhCoreTrace.core,
              }
            : undefined,
        additionalAbilityTexts:
          zhCoreTrace.additional || enCoreTrace.additional
            ? {
                "en": enCoreTrace.additional,
                "zh-CN": zhCoreTrace.additional,
              }
            : undefined,
        cinemaTexts: buildCinemaTexts(zhDetail, enDetail),
        potentialTexts: buildPotentialTexts(zhDetail, enDetail),
      },
    }

    writeJson(path.join(mechanicsDir, `${id}.json`), mechanics)
  }

  writeJson(path.join(stageOutputDir, "index.json"), index)

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
  fs.renameSync(stageOutputDir, OUTPUT_DIR)
  fs.rmSync(stageDir, { recursive: true, force: true })

  console.log(
    `Generated ${ids.length} agents into ${path.relative(process.cwd(), OUTPUT_DIR)}`,
  )
}

main()

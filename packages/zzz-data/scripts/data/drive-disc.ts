import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, "../../data")
const SOURCE_DIR = path.join(DATA_DIR, "source")
const OUTPUT_DIR = path.join(DATA_DIR, "drive-disc")

const PROFILE_LOCALES = ["en", "zh-CN"] as const

type Locale = (typeof PROFILE_LOCALES)[number]
type DriveDiscId = string
type PanelStatKey =
  | "hp"
  | "atk"
  | "def"
  | "impact"
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
type ExtraModifierKey =
  | "hpPercent"
  | "atkPercent"
  | "defPercent"
  | "impact"
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

interface LocalizedText {
  "en"?: string
  "zh-CN"?: string
}

interface ValueDefinition {
  kind: "static"
  value: number
}

interface StructuredPanelEffect {
  id: string
  label: string
  bucket: "panel"
  key: SourcePanelStatKey
  value: ValueDefinition
  unit: "flat" | "ratio"
}

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

type StructuredEffect =
  | StructuredPanelEffect
  | StructuredExtraModifierEffect
  | StructuredOverrideEffect

interface XlsxDriveDiscDescRecord {
  id: number
  name: string
  set2Effect: string
  set4Effect: string
  story?: string
}

interface GachabaseDriveDiscRecord {
  id: string
  slug: string
  name: string
  icon?: string
  tag?: string
  setEffects: Array<{
    pieces: 2 | 4
    bonus: string
  }>
}

interface DriveDiscIndexEntry {
  id: DriveDiscId
  slug: string
  names: Partial<Record<Locale, string>>
  imageKey?: string
  locales: Locale[]
}

type DriveDiscIndexFile = Record<DriveDiscId, DriveDiscIndexEntry>

interface DriveDiscProfileFile {
  id: DriveDiscId
  locale: Locale
  name: string
  imageKey?: string
  descriptionText?: string
}

interface DriveDiscMechanicsFile {
  id: DriveDiscId
  effects: {
    twoPiece: StructuredEffect[]
    fourPiece: StructuredEffect[]
  }
  trace: {
    sourceRefs: string[]
    twoPieceEffectTexts?: LocalizedText
    fourPieceEffectTexts?: LocalizedText
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`generate drive-disc failed: ${message}`)
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

function staticValue(value: number): ValueDefinition {
  return { kind: "static", value }
}

function panelEffect(
  id: string,
  label: string,
  key: SourcePanelStatKey,
  unit: "flat" | "ratio",
  value: number,
): StructuredPanelEffect {
  return {
    id,
    label,
    bucket: "panel",
    key,
    value: staticValue(value),
    unit,
  }
}

function modifierEffect(
  id: string,
  label: string,
  key: ExtraModifierKey,
  unit: "ratio" | "flat" | "multiplier",
  value: number,
  target: "self" | "team" | "enemy",
  conditionText?: string,
): StructuredExtraModifierEffect {
  return {
    id,
    label,
    bucket: "modifier",
    key,
    value: staticValue(value),
    unit,
    target,
    conditionText,
  }
}

function normalizeText(value: string | undefined): string {
  return (
    value
      ?.replace(/[。．]/g, "")
      .replace(/\s+/g, "")
      .trim() ?? ""
  )
}

function parseTwoPieceEffects(
  record: XlsxDriveDiscDescRecord,
): StructuredEffect[] {
  const id = String(record.id)
  const text = normalizeText(record.set2Effect)

  switch (text) {
    case "暴击率+8%":
      return [
        panelEffect(
          `${id}:2pc:crit-rate`,
          "2 件套暴击率",
          "critRate",
          "ratio",
          0.08,
        ),
      ]
    case "穿透率+8%":
      return [
        panelEffect(
          `${id}:2pc:pen-rate`,
          "2 件套穿透率",
          "penRate",
          "ratio",
          0.08,
        ),
      ]
    case "冲击力+6%":
      return [
        panelEffect(
          `${id}:2pc:impact`,
          "2 件套冲击力",
          "impact",
          "ratio",
          0.06,
        ),
      ]
    case "异常精通+30点":
      return [
        panelEffect(
          `${id}:2pc:anomaly-proficiency`,
          "2 件套异常精通",
          "anomalyProficiency",
          "flat",
          30,
        ),
      ]
    case "攻击力+10%":
      return [
        panelEffect(
          `${id}:2pc:atk-percent`,
          "2 件套攻击力",
          "atkPercent",
          "ratio",
          0.1,
        ),
      ]
    case "防御力+16%":
      return [
        panelEffect(
          `${id}:2pc:def-percent`,
          "2 件套防御力",
          "defPercent",
          "ratio",
          0.16,
        ),
      ]
    case "能量自动回复+20%":
      return [
        panelEffect(
          `${id}:2pc:energy-regen`,
          "2 件套能量自动回复",
          "energyRegen",
          "ratio",
          0.2,
        ),
      ]
    case "火属性伤害+10%":
      return [
        panelEffect(
          `${id}:2pc:fire-dmg`,
          "2 件套火属性伤害",
          "fireDamageBonus",
          "ratio",
          0.1,
        ),
      ]
    case "以太伤害+10%":
      return [
        panelEffect(
          `${id}:2pc:ether-dmg`,
          "2 件套以太伤害",
          "etherDamageBonus",
          "ratio",
          0.1,
        ),
      ]
    case "电属性伤害+10%":
      return [
        panelEffect(
          `${id}:2pc:electric-dmg`,
          "2 件套电属性伤害",
          "electricDamageBonus",
          "ratio",
          0.1,
        ),
      ]
    case "冰属性伤害+10%":
      return [
        panelEffect(
          `${id}:2pc:ice-dmg`,
          "2 件套冰属性伤害",
          "iceDamageBonus",
          "ratio",
          0.1,
        ),
      ]
    case "物理伤害+10%":
      return [
        panelEffect(
          `${id}:2pc:physical-dmg`,
          "2 件套物理属性伤害",
          "physicalDamageBonus",
          "ratio",
          0.1,
        ),
      ]
    case "暴击伤害+16%":
      return [
        panelEffect(
          `${id}:2pc:crit-dmg`,
          "2 件套暴击伤害",
          "critDamage",
          "ratio",
          0.16,
        ),
      ]
    case "异常掌控+8%":
      return [
        panelEffect(
          `${id}:2pc:anomaly-mastery`,
          "2 件套异常掌控",
          "anomalyMastery",
          "ratio",
          0.08,
        ),
      ]
    case "生命值+10%":
      return [
        panelEffect(
          `${id}:2pc:hp-percent`,
          "2 件套生命值",
          "hpPercent",
          "ratio",
          0.1,
        ),
      ]
    case "[普通攻击]造成的伤害提升15%":
      return [
        modifierEffect(
          `${id}:2pc:basic-dmg`,
          "2 件套普通攻击伤害",
          "normalAttackDamageBonus",
          "ratio",
          0.15,
          "self",
        ),
      ]
    case "[追加攻击]和[冲刺攻击]造成的伤害提升15%":
      return [
        modifierEffect(
          `${id}:2pc:follow-up-dmg`,
          "2 件套追加攻击伤害",
          "followUpAttackDamageBonus",
          "ratio",
          0.15,
          "self",
        ),
        modifierEffect(
          `${id}:2pc:dash-dmg`,
          "2 件套冲刺攻击伤害",
          "dashAttackDamageBonus",
          "ratio",
          0.15,
          "self",
        ),
      ]
    case "施加的护盾值提升15%":
    case "攻击造成的失衡值提升6%":
      return []
    default:
      throw new Error(
        `generate drive-disc failed: unsupported 2pc effect for ${id}: ${record.set2Effect}`,
      )
  }
}

function parseFourPieceEffects(
  record: XlsxDriveDiscDescRecord,
): StructuredEffect[] {
  const id = String(record.id)

  switch (id) {
    case "31100":
      return [
        modifierEffect(
          `${id}:4pc:ultimate-dmg`,
          "4 件套终结技伤害",
          "ultimateDamageBonus",
          "ratio",
          0.2,
          "self",
        ),
        modifierEffect(
          `${id}:4pc:atk-percent`,
          "4 件套攻击力",
          "atkPercent",
          "ratio",
          0.15,
          "self",
          "发动[终结技]时，持续12秒。",
        ),
      ]
    case "31400":
      return [
        modifierEffect(
          `${id}:4pc:atk-percent`,
          "4 件套攻击力",
          "atkPercent",
          "ratio",
          0.25,
          "self",
          "成为接战状态下的当前操作角色时，持续10秒，20秒内最多触发一次。",
        ),
      ]
    case "31600":
      return [
        modifierEffect(
          `${id}:4pc:team-dmg`,
          "4 件套全队伤害",
          "damageBonus",
          "ratio",
          0.15,
          "team",
          "发动[连携技]或[终结技]时，持续12秒。",
        ),
      ]
    case "31800":
      return [
        modifierEffect(
          `${id}:4pc:fire-dmg`,
          "4 件套火属性伤害",
          "fireDamageBonus",
          "ratio",
          0.15,
          "self",
        ),
        modifierEffect(
          `${id}:4pc:electric-dmg`,
          "4 件套电属性伤害",
          "electricDamageBonus",
          "ratio",
          0.15,
          "self",
        ),
        modifierEffect(
          `${id}:4pc:ex-special-dmg`,
          "4 件套强化特殊技伤害",
          "enhancedSpecialDamageBonus",
          "ratio",
          0.2,
          "self",
          "位于后场时生效；换入前场后效果保留5秒，保留效果7.5秒内最多触发一次。",
        ),
        modifierEffect(
          `${id}:4pc:assist-dmg`,
          "4 件套支援攻击伤害",
          "assistDamageBonus",
          "ratio",
          0.2,
          "self",
          "位于后场时生效；换入前场后效果保留5秒，保留效果7.5秒内最多触发一次。",
        ),
      ]
    case "31900":
      return [
        modifierEffect(
          `${id}:4pc:team-dmg`,
          "4 件套全队伤害",
          "damageBonus",
          "ratio",
          0.15,
          "team",
          "队伍中任意角色发动[招架支援]或[回避支援]时，持续10秒。",
        ),
      ]
    case "32200":
      return [
        modifierEffect(
          `${id}:4pc:crit-rate`,
          "4 件套暴击率",
          "critRate",
          "ratio",
          0.28,
          "self",
          "攻击命中处于[灼烧]状态下的敌人时，持续8秒。",
        ),
      ]
    case "32300":
      return [
        modifierEffect(
          `${id}:4pc:crit-dmg`,
          "4 件套暴击伤害",
          "critDamage",
          "ratio",
          0.2,
          "self",
        ),
      ]
    case "32400":
      return [
        modifierEffect(
          `${id}:4pc:atk-percent`,
          "4 件套攻击力",
          "atkPercent",
          "ratio",
          0.28,
          "self",
          "当场上存在处于[感电]状态下的敌人时。",
        ),
      ]
    case "32500":
      return [
        modifierEffect(
          `${id}:4pc:basic-dmg`,
          "4 件套普通攻击伤害",
          "normalAttackDamageBonus",
          "ratio",
          0.2,
          "self",
        ),
        modifierEffect(
          `${id}:4pc:dash-dmg`,
          "4 件套冲刺攻击伤害",
          "dashAttackDamageBonus",
          "ratio",
          0.2,
          "self",
        ),
        modifierEffect(
          `${id}:4pc:basic-dmg-bonus`,
          "4 件套普通攻击额外伤害",
          "normalAttackDamageBonus",
          "ratio",
          0.2,
          "self",
          "队伍中任意角色对敌人施加[冻结]或触发[碎冰]效果时，额外提升20%，持续12秒。",
        ),
        modifierEffect(
          `${id}:4pc:dash-dmg-bonus`,
          "4 件套冲刺攻击额外伤害",
          "dashAttackDamageBonus",
          "ratio",
          0.2,
          "self",
          "队伍中任意角色对敌人施加[冻结]或触发[碎冰]效果时，额外提升20%，持续12秒。",
        ),
      ]
    case "32600":
      return [
        modifierEffect(
          `${id}:4pc:damage-bonus`,
          "4 件套对目标造成的伤害",
          "damageBonus",
          "ratio",
          0.35,
          "self",
          "队伍中任意角色对敌人施加[强击]效果时，对目标造成的伤害提升35%，持续12秒。",
        ),
      ]
    case "32700":
      return [
        modifierEffect(
          `${id}:4pc:crit-dmg`,
          "4 件套暴击伤害",
          "critDamage",
          "ratio",
          0.3,
          "self",
          "异常掌控大于等于115点时。",
        ),
        modifierEffect(
          `${id}:4pc:crit-rate`,
          "4 件套暴击率",
          "critRate",
          "ratio",
          0.12,
          "self",
          "队伍中任意角色对敌人施加[冻结]或触发[碎冰]效果时，持续15秒。",
        ),
      ]
    case "33000":
      return [
        modifierEffect(
          `${id}:4pc:anomaly-proficiency`,
          "4 件套异常精通",
          "anomalyProficiency",
          "flat",
          45,
          "self",
          "队伍中任意角色发动[强化特殊技]时，持续8秒。",
        ),
        modifierEffect(
          `${id}:4pc:ether-dmg`,
          "4 件套以太伤害",
          "etherDamageBonus",
          "ratio",
          0.25,
          "self",
          "发动[强化特殊技]的角色不是装备者本人时。",
        ),
      ]
    case "33100":
      return [
        modifierEffect(
          `${id}:4pc:sheer-dmg`,
          "4 件套贯穿伤害",
          "sheerBonus",
          "ratio",
          0.1,
          "self",
          "拥有3层效果时。",
        ),
      ]
    case "33200":
      return [
        modifierEffect(
          `${id}:4pc:team-crit-dmg`,
          "4 件套全队暴击伤害",
          "critDamage",
          "ratio",
          0.15,
          "team",
          "装备者为[击破]角色时，发动[强化特殊技]或[连携技]后持续15秒。",
        ),
        modifierEffect(
          `${id}:4pc:team-crit-dmg-extra`,
          "4 件套全队额外暴击伤害",
          "critDamage",
          "ratio",
          0.15,
          "team",
          "装备者暴击率大于等于50%时，持续15秒。",
        ),
      ]
    case "33300":
      return [
        modifierEffect(
          `${id}:4pc:basic-dmg`,
          "4 件套普通攻击伤害",
          "normalAttackDamageBonus",
          "ratio",
          0.2,
          "self",
        ),
        modifierEffect(
          `${id}:4pc:basic-dmg-extra`,
          "4 件套普通攻击额外伤害",
          "normalAttackDamageBonus",
          "ratio",
          0.2,
          "self",
          "装备者为[强攻]角色时，发动[强化特殊技]或[终结技]后持续25秒。",
        ),
      ]
    case "33400":
      return [
        modifierEffect(
          `${id}:4pc:team-dmg`,
          "4 件套全队伤害",
          "damageBonus",
          "ratio",
          0.18,
          "team",
          "装备者为[支援]角色时，发动[强化特殊技]或[终结技]后持续25秒。",
        ),
      ]
    case "33500":
      return [
        modifierEffect(
          `${id}:4pc:crit-rate-in-veil`,
          "4 件套帷幕内暴击率",
          "critRate",
          "ratio",
          0.1,
          "self",
          "装备者处于任意[以太帷幕]中时；离开后效果仍保留15秒。",
        ),
        modifierEffect(
          `${id}:4pc:crit-rate-attack`,
          "4 件套帷幕触发暴击率",
          "critRate",
          "ratio",
          0.1,
          "self",
          "装备者为[强攻]角色时，开启[以太帷幕]或延长[以太帷幕]持续时间后持续30秒。",
        ),
        modifierEffect(
          `${id}:4pc:atk-percent`,
          "4 件套帷幕触发攻击力",
          "atkPercent",
          "ratio",
          0.1,
          "self",
          "装备者为[强攻]角色时，开启[以太帷幕]或延长[以太帷幕]持续时间后持续30秒。",
        ),
      ]
    case "33600":
      return [
        modifierEffect(
          `${id}:4pc:anomaly-proficiency`,
          "4 件套异常精通",
          "anomalyProficiency",
          "flat",
          36,
          "self",
          "装备者发动[普通攻击]命中敌人时，持续8秒。",
        ),
        modifierEffect(
          `${id}:4pc:damage-bonus`,
          "4 件套伤害",
          "damageBonus",
          "ratio",
          0.25,
          "self",
          "当场上有敌人进入失衡状态时，持续18秒。",
        ),
      ]
    case "31000":
    case "31200":
    case "31300":
    case "31500":
    case "32800":
    case "32900":
      return []
    default:
      return []
  }
}

function main(): void {
  const xlsxDesc = readJson<XlsxDriveDiscDescRecord[]>(
    path.join(SOURCE_DIR, "xlsx/zh-CN/drive-disc-desc.json"),
  )
  const zhList = readJson<GachabaseDriveDiscRecord[]>(
    path.join(SOURCE_DIR, "gachabase/zh-CN/drive-discs.json"),
  )
  const enList = readJson<GachabaseDriveDiscRecord[]>(
    path.join(SOURCE_DIR, "gachabase/en/drive-discs.json"),
  )

  const xlsxById = new Map(
    xlsxDesc.map((record) => [String(record.id), record]),
  )
  const zhById = new Map(zhList.map((record) => [record.id, record]))
  const enById = new Map(enList.map((record) => [record.id, record]))
  const ids = [...zhById.keys()].sort(
    (left, right) => Number(left) - Number(right),
  )

  const index: DriveDiscIndexFile = {}
  const stageDir = createStageDir()
  const stageOutputDir = path.join(stageDir, "drive-disc")
  const profileDir = path.join(stageOutputDir, "profile")
  const mechanicsDir = path.join(stageOutputDir, "mechanics")

  for (const id of ids) {
    const xlsxEntry = xlsxById.get(id)
    const zhEntry = zhById.get(id)
    const enEntry = enById.get(id)

    assert(zhEntry, `missing zh gachabase entry for drive-disc ${id}`)
    assert(enEntry, `missing en gachabase entry for drive-disc ${id}`)
    assert(xlsxEntry, `missing xlsx entry for drive-disc ${id}`)

    index[id] = {
      id,
      slug: enEntry.slug,
      names: {
        "en": enEntry.name,
        "zh-CN": zhEntry.name,
      },
      imageKey: zhEntry.icon ?? enEntry.icon,
      locales: [...PROFILE_LOCALES],
    }

    const profiles: Record<Locale, DriveDiscProfileFile> = {
      "en": {
        id,
        locale: "en",
        name: enEntry.name,
        imageKey: enEntry.icon ?? zhEntry.icon,
      },
      "zh-CN": {
        id,
        locale: "zh-CN",
        name: zhEntry.name,
        imageKey: zhEntry.icon ?? enEntry.icon,
        descriptionText: xlsxEntry.story?.trim() || undefined,
      },
    }

    for (const locale of PROFILE_LOCALES) {
      writeJson(path.join(profileDir, locale, `${id}.json`), profiles[locale])
    }

    const zhTwoPieceText =
      stripHtml(
        zhEntry.setEffects.find((effect) => effect.pieces === 2)?.bonus,
      ) ?? xlsxEntry.set2Effect
    const zhFourPieceText =
      stripHtml(
        zhEntry.setEffects.find((effect) => effect.pieces === 4)?.bonus,
      ) ?? xlsxEntry.set4Effect
    const enTwoPieceText = stripHtml(
      enEntry.setEffects.find((effect) => effect.pieces === 2)?.bonus,
    )
    const enFourPieceText = stripHtml(
      enEntry.setEffects.find((effect) => effect.pieces === 4)?.bonus,
    )

    const mechanics: DriveDiscMechanicsFile = {
      id,
      effects: {
        twoPiece: parseTwoPieceEffects(xlsxEntry),
        fourPiece: parseFourPieceEffects(xlsxEntry),
      },
      trace: {
        sourceRefs: [
          "data/source/xlsx/zh-CN/drive-disc-desc.json",
          "data/source/gachabase/zh-CN/drive-discs.json",
          "data/source/gachabase/en/drive-discs.json",
        ],
        twoPieceEffectTexts: {
          "en": enTwoPieceText,
          "zh-CN": zhTwoPieceText,
        },
        fourPieceEffectTexts: {
          "en": enFourPieceText,
          "zh-CN": zhFourPieceText,
        },
      },
    }

    writeJson(path.join(mechanicsDir, `${id}.json`), mechanics)
  }

  writeJson(path.join(stageOutputDir, "index.json"), index)

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
  fs.renameSync(stageOutputDir, OUTPUT_DIR)
  fs.rmSync(stageDir, { recursive: true, force: true })

  console.log(
    `Generated ${ids.length} drive-disc sets into ${path.relative(process.cwd(), OUTPUT_DIR)}`,
  )
}

main()

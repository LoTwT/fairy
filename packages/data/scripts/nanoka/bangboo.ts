import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

const canonicalIdPattern = /^(0|[1-9]\d*)$/u
const positiveIdPattern = /^[1-9]\d*$/u
const statsFields = [
  "endurance",
  "hp_max",
  "hpupgrade",
  "attack",
  "attack_upgrade",
  "break_stun",
  "element_abnormal_power",
  "defence",
  "def_upgrade",
  "crit",
  "pen_ratio",
  "crit_dmg",
] as const

export function isValidBangbooId(value: string): boolean {
  return canonicalIdPattern.test(value)
}

export function createBangbooDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidBangbooId(entityId))
    throw new Error(`Bangboo ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:bangboo:${language}:${entityId}`,
    localPath: `${language}/bangboo/${entityId}.json`,
  }
}

export function discoverBangbooIds(value: unknown): string[] {
  if (!isPlainObject(value)) throw new Error("bangboo.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("bangboo.json 不能为空")
  for (const id of ids) {
    if (!isValidBangbooId(id))
      throw new Error(`bangboo.json 包含非法 Bangboo ID：${id}`)
    validateSummary(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateBangbooDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
  language?: SupportedLanguage,
): void {
  if (!isPlainObject(value))
    throw new Error(`Bangboo ${expectedEntityId} 详情必须是普通对象`)
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    String(value.id) !== expectedEntityId
  )
    throw new Error(`Bangboo 详情 ID 与路径不一致：期望 ${expectedEntityId}`)
  for (const field of ["code_name", "name", "desc", "icon"] as const)
    requireString(value, field, `Bangboo ${expectedEntityId}`)
  requireInteger(value, "rarity", `Bangboo ${expectedEntityId}`)
  validateStats(value.stats, expectedEntityId)
  validateLevels(value.level, expectedEntityId)
  validateSkills(value.skill, expectedEntityId)
  const skillProperties = validateSkillProperties(
    value.skill_prop,
    expectedEntityId,
  )
  validateSkillReferences(value.skill, skillProperties, expectedEntityId)

  if (indexValue === undefined || language === undefined) return
  if (!isPlainObject(indexValue))
    throw new Error("bangboo.json 顶层必须是普通对象")
  const summaryValue = indexValue[expectedEntityId]
  validateSummary(summaryValue, expectedEntityId)
  const summary = summaryValue as Record<string, unknown>
  if (summary[language] !== value.name)
    throw new Error(
      `Bangboo ${expectedEntityId} 的 ${language} 摘要名称与详情不一致`,
    )
  if (language === "en" && summary.desc !== value.desc)
    throw new Error(`Bangboo ${expectedEntityId} 的 en 摘要描述与详情不一致`)
  if (summary.rank !== value.rarity)
    throw new Error(`Bangboo ${expectedEntityId} 的 rank 与 rarity 不一致`)
  if (summary.icon !== value.icon)
    throw new Error(`Bangboo ${expectedEntityId} 的摘要与详情 icon 不一致`)
}

export function validateBangbooEntityDetails(
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
): void {
  if (detailsByLanguage.zh.size !== detailsByLanguage.en.size)
    throw new Error("Bangboo zh/en 详情集合不一致")
  for (const [entityId, zhValue] of detailsByLanguage.zh) {
    const enValue = detailsByLanguage.en.get(entityId)
    if (!isPlainObject(zhValue) || !isPlainObject(enValue))
      throw new Error(`Bangboo ${entityId} zh/en 详情必须是普通对象`)
    const zhComparable = comparableDetail(zhValue)
    const enComparable = comparableDetail(enValue)
    if (JSON.stringify(zhComparable) !== JSON.stringify(enComparable))
      throw new Error(`Bangboo ${entityId} 的 zh/en 非本地化结构不一致`)
  }
}

function validateSummary(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`bangboo.json 的 Bangboo ${entityId} 必须是普通对象`)
  for (const field of [
    "icon",
    "codename",
    "en",
    "desc",
    "ko",
    "zh",
    "ja",
  ] as const)
    requireString(value, field, `bangboo.json 的 Bangboo ${entityId}`)
  requireInteger(value, "rank", `bangboo.json 的 Bangboo ${entityId}`)
}

function validateStats(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`Bangboo ${entityId} 的 stats 必须是普通对象`)
  for (const field of statsFields)
    requireInteger(value, field, `Bangboo ${entityId} stats`)
}

function validateLevels(value: unknown, entityId: string): void {
  validatePositiveKeyObject(
    value,
    `Bangboo ${entityId} level`,
    (stage, key) => {
      for (const field of [
        "hp_max",
        "attack",
        "defence",
        "level_max",
        "level_min",
      ] as const)
        requireInteger(stage, field, `Bangboo ${entityId} level.${key}`)
      validatePositiveKeyObject(
        stage.materials,
        `Bangboo ${entityId} level.${key}.materials`,
        (amount, materialId) => {
          if (!Number.isInteger(amount) || Number(amount) <= 0)
            throw new Error(
              `Bangboo ${entityId} level.${key}.materials.${materialId} 必须是正整数`,
            )
        },
        false,
      )
      validatePositiveKeyObject(
        stage.extra,
        `Bangboo ${entityId} level.${key}.extra`,
        (extra, propId) => {
          requireInteger(
            extra,
            "prop",
            `Bangboo ${entityId} level.${key}.extra.${propId}`,
          )
          requireInteger(
            extra,
            "value",
            `Bangboo ${entityId} level.${key}.extra.${propId}`,
          )
          requireString(
            extra,
            "name",
            `Bangboo ${entityId} level.${key}.extra.${propId}`,
          )
          requireString(
            extra,
            "format",
            `Bangboo ${entityId} level.${key}.extra.${propId}`,
          )
          if (String(extra.prop) !== propId)
            throw new Error(
              `Bangboo ${entityId} level.${key}.extra key 与 prop 不一致`,
            )
        },
      )
    },
  )
}

function validateSkills(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`Bangboo ${entityId} 的 skill 必须是普通对象`)
  const keys = Object.keys(value)
  if (
    keys.length !== 3 ||
    !["a", "b", "c"].every((key) => Object.hasOwn(value, key))
  )
    throw new Error(`Bangboo ${entityId} 的 skill 必须恰好包含 a/b/c`)
  for (const slot of ["a", "b", "c"] as const) {
    const skill = value[slot]
    if (!isPlainObject(skill))
      throw new Error(`Bangboo ${entityId} skill.${slot} 必须是普通对象`)
    validatePositiveKeyObject(
      skill.level,
      `Bangboo ${entityId} skill.${slot}.level`,
      (entry, level) => {
        for (const field of ["name", "desc", "param"] as const)
          requireString(
            entry,
            field,
            `Bangboo ${entityId} skill.${slot}.level.${level}`,
          )
        if (
          !Array.isArray(entry.property) ||
          !entry.property.every((item) => typeof item === "string")
        )
          throw new Error(
            `Bangboo ${entityId} skill.${slot}.level.${level}.property 必须是字符串数组`,
          )
      },
    )
  }
}

function validateSkillProperties(
  value: unknown,
  entityId: string,
): Record<string, Record<string, unknown>> {
  return validatePositiveKeyObject(
    value,
    `Bangboo ${entityId} skill_prop`,
    (entry, skillId) => {
      for (const propId of ["1001", "1002"] as const) {
        const property = entry[propId]
        if (!isPlainObject(property))
          throw new Error(
            `Bangboo ${entityId} skill_prop.${skillId}.${propId} 必须是普通对象`,
          )
        requireInteger(
          property,
          "main",
          `Bangboo ${entityId} skill_prop.${skillId}.${propId}`,
        )
        requireInteger(
          property,
          "growth",
          `Bangboo ${entityId} skill_prop.${skillId}.${propId}`,
        )
        requireString(
          property,
          "format",
          `Bangboo ${entityId} skill_prop.${skillId}.${propId}`,
        )
      }
      requireInteger(
        entry,
        "element_accumulation_value",
        `Bangboo ${entityId} skill_prop.${skillId}`,
      )
    },
  )
}

function validateSkillReferences(
  skillValue: unknown,
  skillProperties: Record<string, Record<string, unknown>>,
  entityId: string,
): void {
  if (!isPlainObject(skillValue)) return
  const referencePattern = /Skill:(\d+),\s*Prop:(\d+)/gu
  for (const slot of ["a", "b", "c"] as const) {
    const skill = skillValue[slot]
    if (!isPlainObject(skill) || !isPlainObject(skill.level)) continue
    for (const level of Object.values(skill.level)) {
      if (!isPlainObject(level) || typeof level.param !== "string") continue
      for (const match of level.param.matchAll(referencePattern)) {
        const skillId = match[1]!
        const propId = match[2]!
        const property = skillProperties[skillId]
        if (property === undefined || !Object.hasOwn(property, propId))
          throw new Error(
            `Bangboo ${entityId} 的技能引用未闭合：Skill:${skillId}, Prop:${propId}`,
          )
      }
    }
  }
}

function comparableDetail(value: Record<string, unknown>): unknown {
  const levels = value.level as Record<string, Record<string, unknown>>
  const skill = value.skill as Record<string, Record<string, unknown>>
  const skillProperties = value.skill_prop as Record<
    string,
    Record<string, unknown>
  >
  return {
    id: value.id,
    rarity: value.rarity,
    icon: value.icon,
    stats: value.stats,
    level: Object.fromEntries(
      Object.entries(levels).map(([key, stage]) => [
        key,
        {
          hp_max: stage.hp_max,
          attack: stage.attack,
          defence: stage.defence,
          level_max: stage.level_max,
          level_min: stage.level_min,
          materials: stage.materials,
          extra: Object.fromEntries(
            Object.entries(
              stage.extra as Record<string, Record<string, unknown>>,
            ).map(([propId, extra]) => [
              propId,
              { prop: extra.prop, value: extra.value, format: extra.format },
            ]),
          ),
        },
      ]),
    ),
    skill: Object.fromEntries(
      ["a", "b", "c"].map((slot) => [
        slot,
        Object.keys(skill[slot]!.level as Record<string, unknown>),
      ]),
    ),
    skill_prop: Object.fromEntries(
      Object.entries(skillProperties).map(([skillId, entry]) => [
        skillId,
        {
          "1001": entry["1001"],
          "1002": entry["1002"],
          "element_accumulation_value": entry.element_accumulation_value,
        },
      ]),
    ),
  }
}

function validatePositiveKeyObject<T extends Record<string, unknown>>(
  value: unknown,
  description: string,
  validateEntry: (entry: T, key: string) => void,
  entryMustBeObject = true,
): Record<string, T> {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [key, entry] of Object.entries(value)) {
    if (!positiveIdPattern.test(key))
      throw new Error(`${description} 包含非法正整数 key：${key}`)
    if (entryMustBeObject && !isPlainObject(entry))
      throw new Error(`${description}.${key} 必须是普通对象`)
    validateEntry(entry as T, key)
  }
  return value as Record<string, T>
}

function requireString(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  if (typeof value[field] !== "string")
    throw new Error(`${description}.${field} 必须是字符串`)
}

function requireInteger(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  if (!Number.isInteger(value[field]))
    throw new Error(`${description}.${field} 必须是整数`)
}

function compareDecimalIds(left: string, right: string): number {
  const leftNumber = BigInt(left)
  const rightNumber = BigInt(right)
  return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0
}

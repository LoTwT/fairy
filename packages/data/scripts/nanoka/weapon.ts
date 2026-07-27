import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

export function isValidWeaponId(value: string): boolean {
  return /^(0|[1-9]\d*)$/u.test(value)
}

export function createWeaponDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidWeaponId(entityId))
    throw new Error(`W-Engine ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:weapon:${language}:${entityId}`,
    localPath: `${language}/weapon/${entityId}.json`,
  }
}

export function discoverWeaponIds(value: unknown): string[] {
  if (!isPlainObject(value)) throw new Error("weapon.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("weapon.json 不能为空")
  for (const id of ids) {
    if (!isValidWeaponId(id))
      throw new Error(`weapon.json 包含非法 W-Engine ID：${id}`)
    validateWeaponSummaryRecord(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateWeaponDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
  language?: SupportedLanguage,
): void {
  if (!isPlainObject(value))
    throw new Error(`W-Engine ${expectedEntityId} 详情必须是普通对象`)
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    String(value.id) !== expectedEntityId
  )
    throw new Error(
      `W-Engine 详情 ID 与路径不一致：期望 ${expectedEntityId}，实际 ${String(value.id)}`,
    )
  for (const field of [
    "code_name",
    "name",
    "desc",
    "desc2",
    "desc3",
    "icon",
  ] as const)
    requireStringField(value, field, expectedEntityId)
  requireIntegerField(value, "rarity", expectedEntityId)

  const weaponType = requireSingleIntegerKeyStringObject(
    value.weapon_type,
    `W-Engine ${expectedEntityId} 详情的 weapon_type`,
  )
  const baseProperty = validateProperty(
    value.base_property,
    `W-Engine ${expectedEntityId} 详情的 base_property`,
  )
  const randProperty = validateProperty(
    value.rand_property,
    `W-Engine ${expectedEntityId} 详情的 rand_property`,
  )
  const levels = validateNumberedObject(
    value.level,
    0,
    60,
    `W-Engine ${expectedEntityId} 详情的 level`,
    (entry, key) => {
      for (const field of ["exp", "rate", "rate2"] as const)
        requireIntegerField(entry, field, `${expectedEntityId} level ${key}`)
      if (key === 60 ? entry.exp !== 0 : Number(entry.exp) <= 0)
        throw new Error(
          `W-Engine ${expectedEntityId} 详情的 level.${key}.exp 无效`,
        )
    },
  )
  for (let level = 1; level <= 60; level += 1) {
    if (
      Number(levels[String(level)]?.rate) <
      Number(levels[String(level - 1)]?.rate)
    )
      throw new Error(
        `W-Engine ${expectedEntityId} 详情的 level.rate 必须单调不减`,
      )
  }
  const stars = validateNumberedObject(
    value.stars,
    0,
    5,
    `W-Engine ${expectedEntityId} 详情的 stars`,
    (entry, key) => {
      for (const field of ["star_rate", "rand_rate"] as const)
        requireIntegerField(entry, field, `${expectedEntityId} stars ${key}`)
    },
  )
  validateNumberedObject(
    value.talents,
    1,
    5,
    `W-Engine ${expectedEntityId} 详情的 talents`,
    (entry, key) => {
      for (const field of ["name", "desc"] as const)
        requireStringField(entry, field, `${expectedEntityId} talents ${key}`)
    },
  )
  validateMaterials(value.materials, expectedEntityId)

  if (indexValue === undefined || language === undefined) return
  if (!isPlainObject(indexValue))
    throw new Error("weapon.json 顶层必须是普通对象")
  const summaryValue = indexValue[expectedEntityId]
  validateWeaponSummaryRecord(summaryValue, expectedEntityId)
  const summary = summaryValue as Record<string, unknown>
  if (summary[language] !== value.name)
    throw new Error(
      `W-Engine ${expectedEntityId} 的 ${language} 摘要名称与详情不一致`,
    )
  if (summary.icon !== value.code_name)
    throw new Error(`W-Engine ${expectedEntityId} 的 icon 与 code_name 不一致`)
  if (!String(value.icon).endsWith(`/${String(summary.icon)}.png`))
    throw new Error(`W-Engine ${expectedEntityId} 的详情 icon 路径无效`)
  if (summary.rank !== value.rarity)
    throw new Error(`W-Engine ${expectedEntityId} 的 rank 与 rarity 不一致`)
  if (summary.type !== Number(weaponType.key))
    throw new Error(
      `W-Engine ${expectedEntityId} 的 type 与 weapon_type 不一致`,
    )
  if (language === "en" && summary.desc !== value.desc3)
    throw new Error(`W-Engine ${expectedEntityId} 的 en desc 与 desc3 不一致`)
  if (language === "en" && summary.sub !== randProperty.name)
    throw new Error(
      `W-Engine ${expectedEntityId} 的 en sub 与 rand_property.name 不一致`,
    )
  const expectedAttack = Math.floor(
    (baseProperty.value *
      (10_000 + Number(levels["60"]?.rate) + Number(stars["5"]?.star_rate))) /
      10_000,
  )
  if (summary.atk !== expectedAttack)
    throw new Error(`W-Engine ${expectedEntityId} 的 atk 与详情公式不一致`)
}

export function validateWeaponEntityDetails(
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
): void {
  const zh = detailsByLanguage.zh
  const en = detailsByLanguage.en
  if (zh.size !== en.size) throw new Error("W-Engine zh/en 详情集合不一致")
  for (const [entityId, zhValue] of zh) {
    const enValue = en.get(entityId)
    if (!isPlainObject(zhValue) || !isPlainObject(enValue))
      throw new Error(`W-Engine ${entityId} zh/en 详情必须是普通对象`)
    if (zhValue.materials !== enValue.materials)
      throw new Error(`W-Engine ${entityId} 的 zh/en materials 不一致`)
  }
}

function validateWeaponSummaryRecord(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`weapon.json 的 W-Engine ${entityId} 必须是普通对象`)
  for (const field of ["icon", "en", "zh", "ja", "ko", "desc", "sub"] as const)
    requireStringField(value, field, entityId, "weapon.json 的 W-Engine")
  for (const field of ["rank", "type", "atk"] as const)
    requireIntegerField(value, field, entityId, "weapon.json 的 W-Engine")
}

function validateProperty(
  value: unknown,
  description: string,
): { name: string; name2: string; format: string; value: number } {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const field of ["name", "name2", "format"] as const)
    if (typeof value[field] !== "string")
      throw new Error(`${description}.${field} 必须是字符串`)
  if (!Number.isInteger(value.value))
    throw new Error(`${description}.value 必须是整数`)
  return value as unknown as {
    name: string
    name2: string
    format: string
    value: number
  }
}

function validateNumberedObject(
  value: unknown,
  first: number,
  last: number,
  description: string,
  validateEntry: (entry: Record<string, unknown>, key: number) => void,
): Record<string, Record<string, unknown>> {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  const expectedKeys = Array.from({ length: last - first + 1 }, (_, index) =>
    String(first + index),
  )
  const keys = Object.keys(value)
  if (
    keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error(`${description} 必须完整包含 keys ${first}..${last}`)
  for (const key of expectedKeys) {
    const entry = value[key]
    if (!isPlainObject(entry))
      throw new Error(`${description}.${key} 必须是普通对象`)
    validateEntry(entry, Number(key))
  }
  return value as Record<string, Record<string, unknown>>
}

function validateMaterials(value: unknown, entityId: string): void {
  if (typeof value !== "string")
    throw new Error(`W-Engine ${entityId} 详情的 materials 必须是字符串`)
  const positiveDecimal = "[1-9]\\d*"
  const pair = `${positiveDecimal}:${positiveDecimal}`
  const group = `${pair},${pair}`
  if (!new RegExp(`^${group}(?:\\|${group}){4}$`, "u").test(value))
    throw new Error(
      `W-Engine ${entityId} 详情的 materials 必须严格为五组、每组两个正整数 itemId:amount`,
    )
}

function requireSingleIntegerKeyStringObject(
  value: unknown,
  description: string,
): { key: string; value: string } {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  const entries = Object.entries(value)
  if (
    entries.length !== 1 ||
    !/^(0|[1-9]\d*)$/u.test(entries[0]![0]) ||
    typeof entries[0]![1] !== "string"
  )
    throw new Error(`${description} 必须恰有一个规范整数 key 和字符串 value`)
  return { key: entries[0]![0], value: entries[0]![1] as string }
}

function requireStringField(
  value: Record<string, unknown>,
  field: string,
  entityId: string,
  prefix = "W-Engine",
): void {
  if (typeof value[field] !== "string")
    throw new Error(`${prefix} ${entityId} 的 ${field} 必须是字符串`)
}

function requireIntegerField(
  value: Record<string, unknown>,
  field: string,
  entityId: string,
  prefix = "W-Engine",
): void {
  if (!Number.isInteger(value[field]))
    throw new Error(`${prefix} ${entityId} 的 ${field} 必须是整数`)
}

function compareDecimalIds(left: string, right: string): number {
  const leftNumber = BigInt(left)
  const rightNumber = BigInt(right)
  return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0
}

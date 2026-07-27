import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

const canonicalIdPattern = /^(0|[1-9]\d*)$/u
const positiveIdPattern = /^[1-9]\d*$/u
const detailStringFields = [
  "name",
  "desc",
  "group_desc",
  "image_path",
  "card_obtain",
  "card_quote",
  "card_skill_desc",
] as const
const elementFields = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
] as const
const curveFields = ["hp", "attack", "defence", "stun"] as const

export function isValidMonsterId(value: string): boolean {
  return canonicalIdPattern.test(value)
}

export function createMonsterDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidMonsterId(entityId))
    throw new Error(`Monster ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:monster:${language}:${entityId}`,
    localPath: `${language}/monster/${entityId}.json`,
  }
}

export function discoverMonsterIds(value: unknown): string[] {
  if (!isPlainObject(value)) throw new Error("monster.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("monster.json 不能为空")
  for (const id of ids) {
    if (!isValidMonsterId(id))
      throw new Error(`monster.json 包含非法 Monster ID：${id}`)
    validateMonsterSummary(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateMonsterDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
  language?: SupportedLanguage,
): void {
  if (!isPlainObject(value))
    throw new Error(`Monster ${expectedEntityId} 详情必须是普通对象`)
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    String(value.id) !== expectedEntityId
  )
    throw new Error(`Monster 详情 ID 与路径不一致：期望 ${expectedEntityId}`)

  requireNonNegativeInteger(value, "monster_id", `Monster ${expectedEntityId}`)
  requireInteger(value, "rarity", `Monster ${expectedEntityId}`)
  requireInteger(value, "group_id", `Monster ${expectedEntityId}`)
  for (const field of detailStringFields)
    requireString(value, field, `Monster ${expectedEntityId}`)

  validateElementAbnormal(value.element_abnormal, expectedEntityId)
  validateMonsterInfo(value.monster_info, value.monster_id, expectedEntityId)

  if (indexValue === undefined || language === undefined) return
  if (!isPlainObject(indexValue))
    throw new Error("monster.json 顶层必须是普通对象")
  const summaryValue = indexValue[expectedEntityId]
  validateMonsterSummary(summaryValue, expectedEntityId)
  const summary = summaryValue as Record<string, unknown>
  if (summary[language] !== value.name)
    throw new Error(
      `Monster ${expectedEntityId} 的 ${language} 摘要名称与详情不一致`,
    )
  if (summary.group !== value.group_id)
    throw new Error(`Monster ${expectedEntityId} 的 group 与 group_id 不一致`)
  if (summary.rarity !== value.rarity)
    throw new Error(`Monster ${expectedEntityId} 的摘要与详情 rarity 不一致`)
}

export function validateMonsterEntityDetails(
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
): void {
  const zh = detailsByLanguage.zh
  const en = detailsByLanguage.en
  if (zh.size !== en.size) throw new Error("Monster zh/en 详情集合不一致")
  for (const [entityId, zhValue] of zh) {
    if (!en.has(entityId)) throw new Error(`Monster ${entityId} 缺少 en 详情`)
    compareCrossLanguageValue(zhValue, en.get(entityId), `Monster ${entityId}`)
  }
}

function validateMonsterSummary(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`monster.json 的 Monster ${entityId} 必须是普通对象`)
  for (const field of ["zh", "en", "icon", "desc"] as const)
    requireString(value, field, `monster.json 的 Monster ${entityId}`)
  requireInteger(value, "group", `monster.json 的 Monster ${entityId}`)
  requireInteger(value, "rarity", `monster.json 的 Monster ${entityId}`)
}

function validateElementAbnormal(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`Monster ${entityId} 的 element_abnormal 必须是普通对象`)
  for (const [key, amount] of Object.entries(value)) {
    if (!positiveIdPattern.test(key))
      throw new Error(
        `Monster ${entityId} 的 element_abnormal 包含非法正整数 key：${key}`,
      )
    if (!Number.isInteger(amount))
      throw new Error(
        `Monster ${entityId} 的 element_abnormal.${key} 必须是整数`,
      )
  }
}

function validateMonsterInfo(
  value: unknown,
  mainBattleUnitId: unknown,
  entityId: string,
): void {
  if (!isPlainObject(value))
    throw new Error(`Monster ${entityId} 的 monster_info 必须是普通对象`)
  const battleUnitIds = Object.keys(value)
  for (const battleUnitId of battleUnitIds) {
    if (!positiveIdPattern.test(battleUnitId))
      throw new Error(
        `Monster ${entityId} 的 monster_info 包含非法战斗单位 ID：${battleUnitId}`,
      )
    validateBattleUnit(value[battleUnitId], battleUnitId, entityId)
  }

  if (battleUnitIds.length === 0 && mainBattleUnitId !== 0)
    throw new Error(
      `Monster ${entityId} 的空 monster_info 必须使用 monster_id=0`,
    )
}

function validateBattleUnit(
  value: unknown,
  battleUnitId: string,
  entityId: string,
): void {
  const description = `Monster ${entityId} 战斗单位 ${battleUnitId}`
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    String(value.id) !== battleUnitId
  )
    throw new Error(`${description} 的 key 与 id 不一致`)
  for (const field of ["code_name", "type", "icon"] as const)
    requireString(value, field, description)
  if (
    !Array.isArray(value.tag) ||
    !value.tag.every((item) => typeof item === "string")
  )
    throw new Error(`${description}.tag 必须是字符串数组`)

  if (!isPlainObject(value.element))
    throw new Error(`${description}.element 必须是普通对象`)
  for (const field of elementFields)
    requireInteger(value.element, field, `${description}.element`)

  if (!isPlainObject(value.curves))
    throw new Error(`${description}.curves 必须是普通对象`)
  for (const field of curveFields)
    validateBattleUnitCurve(
      value.curves[field],
      `${description}.curves.${field}`,
    )

  if (!isPlainObject(value.stats))
    throw new Error(`${description}.stats 必须是普通对象`)
}

function validateBattleUnitCurve(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireInteger(value, "ratio", description)
  if (
    !Array.isArray(value.curve) ||
    value.curve.length === 0 ||
    !value.curve.every((item) => Number.isInteger(item))
  )
    throw new Error(`${description}.curve 必须是非空整数数组`)
}

function compareCrossLanguageValue(
  zhValue: unknown,
  enValue: unknown,
  description: string,
): void {
  if (Array.isArray(zhValue)) {
    if (!Array.isArray(enValue) || zhValue.length !== enValue.length)
      throw new Error(`${description} 的 zh/en 容器结构不一致`)
    for (let index = 0; index < zhValue.length; index += 1)
      compareCrossLanguageValue(
        zhValue[index],
        enValue[index],
        `${description}[${index}]`,
      )
    return
  }
  if (isPlainObject(zhValue)) {
    if (!isPlainObject(enValue))
      throw new Error(`${description} 的 zh/en 容器结构不一致`)
    const zhKeys = Object.keys(zhValue).toSorted()
    const enKeys = Object.keys(enValue).toSorted()
    if (
      zhKeys.length !== enKeys.length ||
      zhKeys.some((key, index) => key !== enKeys[index])
    )
      throw new Error(`${description} 的 zh/en 对象字段集合不一致`)
    for (const key of zhKeys)
      compareCrossLanguageValue(
        zhValue[key],
        enValue[key],
        `${description}.${key}`,
      )
    return
  }

  if (
    typeof zhValue !== typeof enValue ||
    (zhValue === null) !== (enValue === null)
  )
    throw new Error(`${description} 的 zh/en 标量类型不一致`)
  if (
    typeof zhValue === "number" &&
    (typeof enValue !== "number" || !Object.is(zhValue, enValue))
  )
    throw new Error(`${description} 的 zh/en 数值不一致`)
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

function requireNonNegativeInteger(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  if (!Number.isInteger(value[field]) || Number(value[field]) < 0)
    throw new Error(`${description}.${field} 必须是非负整数`)
}

function compareDecimalIds(left: string, right: string): number {
  const leftNumber = BigInt(left)
  const rightNumber = BigInt(right)
  return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0
}

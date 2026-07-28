import type { CrossEntityValidator, EntityValidationData } from "./entities.ts"
import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

const canonicalIdPattern = /^(0|[1-9]\d*)$/u
const positiveIdPattern = /^[1-9]\d*$/u
const rankingGoalFields = [
  "ss_rank_goal",
  "s_rank_goal",
  "a_rank_goal",
  "b_rank_goal",
] as const

export function isValidShiyuId(value: string): boolean {
  return canonicalIdPattern.test(value)
}

export function createShiyuDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidShiyuId(entityId)) throw new Error(`Shiyu ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:shiyu:${language}:${entityId}`,
    localPath: `${language}/shiyu/${entityId}.json`,
  }
}

export function discoverShiyuIds(value: unknown): string[] {
  if (!isPlainObject(value)) throw new Error("shiyu.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("shiyu.json 不能为空")
  for (const id of ids) {
    if (!isValidShiyuId(id))
      throw new Error(`shiyu.json 包含非法 Shiyu ID：${id}`)
    validateShiyuSummary(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateShiyuDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
): void {
  if (!isPlainObject(value))
    throw new Error(`Shiyu ${expectedEntityId} 详情必须是普通对象`)
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    String(value.id) !== expectedEntityId
  )
    throw new Error(`Shiyu 详情 ID 与路径不一致：期望 ${expectedEntityId}`)

  validateOptionalTimePair(
    value,
    "begin_time",
    "end_time",
    `Shiyu ${expectedEntityId} 详情`,
  )
  if (!isPlainObject(value.zone) || Object.keys(value.zone).length === 0)
    throw new Error(`Shiyu ${expectedEntityId}.zone 必须是非空普通对象`)

  const zoneIds = new Set(Object.keys(value.zone))
  for (const zoneId of [...zoneIds].toSorted(compareDecimalIds)) {
    if (!positiveIdPattern.test(zoneId))
      throw new Error(
        `Shiyu ${expectedEntityId}.zone 包含非法 zone ID：${zoneId}`,
      )
    validateZone(value.zone[zoneId], expectedEntityId, zoneId, zoneIds)
  }

  if (indexValue === undefined) return
  if (!isPlainObject(indexValue))
    throw new Error("shiyu.json 顶层必须是普通对象")
  const summaryValue = indexValue[expectedEntityId]
  validateShiyuSummary(summaryValue, expectedEntityId)
  const summary = summaryValue as Record<string, unknown>
  if (summary.begin !== undefined) {
    if (value.begin_time !== summary.begin || value.end_time !== summary.end)
      throw new Error(`Shiyu ${expectedEntityId} 的摘要与详情普通时间不一致`)
  }
}

export function validateShiyuEntityDetails(
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
): void {
  if (detailsByLanguage.zh.size !== detailsByLanguage.en.size)
    throw new Error("Shiyu zh/en 详情集合不一致")
  for (const [entityId, zhValue] of detailsByLanguage.zh) {
    if (!detailsByLanguage.en.has(entityId))
      throw new Error(`Shiyu ${entityId} 缺少 en 详情`)
    const enValue = detailsByLanguage.en.get(entityId)
    if (isPlainObject(zhValue) && isPlainObject(enValue)) {
      for (const field of ["begin_time", "end_time"] as const) {
        if (zhValue[field] !== enValue[field])
          throw new Error(`Shiyu ${entityId} 的 zh/en ${field} 不一致`)
      }
    }
    compareCrossLanguageValue(zhValue, enValue, `Shiyu ${entityId}`)
  }
}

export const shiyuMonsterReferenceValidator: CrossEntityValidator = {
  checkId: "shiyu-monster-reference/v1",
  fromEntity: "shiyu",
  toEntity: "monster",
  introducedInEntityEpoch: [
    "character",
    "equipment",
    "weapon",
    "bangboo",
    "monster",
    "shiyu",
  ],
  validate({ entities }) {
    const shiyu = requireValidationData(entities.get("shiyu"), "shiyu")
    const monster = requireValidationData(entities.get("monster"), "monster")
    const monsterIds = new Set(monster.ids)
    let checkedReferenceCount = 0

    for (const language of ["zh", "en"] as const) {
      for (const shiyuId of shiyu.ids) {
        const detail = shiyu.detailsByLanguage[language].get(shiyuId)
        if (!isPlainObject(detail) || !isPlainObject(detail.zone))
          throw new Error(`shiyu ${shiyuId} ${language} 详情缺少 zone`)
        for (const [zoneId, zone] of Object.entries(detail.zone)) {
          if (!isPlainObject(zone) || !isPlainObject(zone.layer_room)) continue
          for (const [roomId, room] of Object.entries(zone.layer_room)) {
            if (!isPlainObject(room) || !isPlainObject(room.monster_list))
              continue
            for (const [monsterListEntryKey, entry] of Object.entries(
              room.monster_list,
            )) {
              checkedReferenceCount += 1
              const path = `zone.${zoneId}.layer_room.${roomId}.monster_list.${monsterListEntryKey}.id`
              const monsterId =
                isPlainObject(entry) && Number.isSafeInteger(entry.id)
                  ? String(entry.id)
                  : String(isPlainObject(entry) ? entry.id : undefined)
              if (!monsterIds.has(monsterId))
                throw new Error(
                  `shiyu ${shiyuId} 的 ${language}.${path}（monsterListEntryKey=${monsterListEntryKey}）引用了未解析 Monster ID ${monsterId}`,
                )
            }
          }
        }
      }
    }
    return { checkedReferenceCount, unresolvedReferenceCount: 0 }
  },
}

function validateShiyuSummary(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`shiyu.json 的 Shiyu ${entityId} 必须是普通对象`)
  for (const field of ["zh", "en", "ja", "ko"] as const)
    requireString(value, field, `shiyu.json 的 Shiyu ${entityId}`)
  requireInteger(value, "sort", `shiyu.json 的 Shiyu ${entityId}`)
  validateOptionalTimePair(
    value,
    "begin",
    "end",
    `shiyu.json 的 Shiyu ${entityId}`,
  )
  validateOptionalTimePair(
    value,
    "live_begin",
    "live_end",
    `shiyu.json 的 Shiyu ${entityId}`,
  )
}

function validateOptionalTimePair(
  value: Record<string, unknown>,
  beginField: string,
  endField: string,
  description: string,
): void {
  const hasBegin = Object.hasOwn(value, beginField)
  const hasEnd = Object.hasOwn(value, endField)
  if (hasBegin !== hasEnd)
    throw new Error(
      `${description} 的 ${beginField}/${endField} 必须同时存在或缺失`,
    )
  if (hasBegin) {
    requireString(value, beginField, description)
    requireString(value, endField, description)
  }
}

function validateZone(
  value: unknown,
  shiyuId: string,
  zoneId: string,
  zoneIds: ReadonlySet<string>,
): void {
  const description = `Shiyu ${shiyuId}.zone.${zoneId}`
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireString(value, "name", description)
  for (const field of ["stage_num", "monster_level", "goal_type"] as const)
    requireInteger(value, field, description)
  for (const field of rankingGoalFields)
    requireInteger(value, field, description)
  if (!isPlainObject(value.layer_buff))
    throw new Error(`${description}.layer_buff 必须是普通对象`)
  if (!Array.isArray(value.child))
    throw new Error(`${description}.child 必须是数组`)
  for (let index = 0; index < value.child.length; index += 1) {
    const child = value.child[index]
    if (!Number.isSafeInteger(child) || Number(child) <= 0)
      throw new Error(`${description}.child[${index}] 必须是正整数 zone 引用`)
    if (!zoneIds.has(String(child)))
      throw new Error(
        `${description}.child[${index}] 引用未闭合：${String(child)}`,
      )
  }
  if (!isPlainObject(value.layer_room))
    throw new Error(`${description}.layer_room 必须是普通对象`)
  for (const [roomId, room] of Object.entries(value.layer_room))
    validateRoom(room, `${description}.layer_room.${roomId}`)
}

function validateRoom(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireString(value, "monster_icon", description)
  requireInteger(value, "waves_num", description)
  if (!isPlainObject(value.monster_weakness))
    throw new Error(`${description}.monster_weakness 必须是普通对象`)
  for (const [key, weakness] of Object.entries(value.monster_weakness)) {
    if (!positiveIdPattern.test(key) || typeof weakness !== "string")
      throw new Error(`${description}.monster_weakness.${key} 必须是字符串`)
  }
  if (!isPlainObject(value.monster_list))
    throw new Error(`${description}.monster_list 必须是普通对象`)
  for (const [monsterListEntryKey, entry] of Object.entries(
    value.monster_list,
  )) {
    if (!positiveIdPattern.test(monsterListEntryKey) || !isPlainObject(entry))
      throw new Error(
        `${description}.monster_list.${monsterListEntryKey} 必须是普通对象`,
      )
    if (!Number.isSafeInteger(entry.id) || Number(entry.id) <= 0)
      throw new Error(
        `${description}.monster_list.${monsterListEntryKey}.id 必须是正整数`,
      )
  }
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
    (typeof zhValue === "number" || typeof zhValue === "boolean") &&
    !Object.is(zhValue, enValue)
  )
    throw new Error(`${description} 的 zh/en 机器值不一致`)
}

function requireValidationData(
  value: EntityValidationData | undefined,
  entity: string,
): EntityValidationData {
  if (value === undefined) throw new Error(`缺少 ${entity} 验证数据`)
  return value
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

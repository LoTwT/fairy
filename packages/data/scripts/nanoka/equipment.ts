import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

export function isValidEquipmentId(value: string): boolean {
  return /^(0|[1-9]\d*)$/u.test(value)
}

export function createEquipmentDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidEquipmentId(entityId))
    throw new Error(`Drive Disc ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:equipment:${language}:${entityId}`,
    localPath: `${language}/equipment/${entityId}.json`,
  }
}

export function discoverEquipmentIds(value: unknown): string[] {
  if (!isPlainObject(value))
    throw new Error("equipment.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("equipment.json 不能为空")
  for (const id of ids) {
    if (!isValidEquipmentId(id))
      throw new Error(`equipment.json 包含非法 Drive Disc ID：${id}`)
    validateEquipmentSummaryRecord(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateEquipmentDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
  language?: SupportedLanguage,
): void {
  if (!isPlainObject(value))
    throw new Error(`Drive Disc ${expectedEntityId} 详情必须是普通对象`)
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    String(value.id) !== expectedEntityId
  ) {
    throw new Error(
      `Drive Disc 详情 ID 与路径不一致：期望 ${expectedEntityId}，实际 ${String(value.id)}`,
    )
  }
  for (const field of [
    "name",
    "desc2",
    "desc4",
    "story",
    "icon",
    "icon2",
  ] as const) {
    if (typeof value[field] !== "string")
      throw new Error(
        `Drive Disc ${expectedEntityId} 详情的 ${field} 必须是字符串`,
      )
  }
  if (indexValue === undefined || language === undefined) return
  if (!isPlainObject(indexValue))
    throw new Error("equipment.json 顶层必须是普通对象")
  const summaryValue = indexValue[expectedEntityId]
  validateEquipmentSummaryRecord(summaryValue, expectedEntityId)
  const summary = summaryValue as Record<string, unknown>
  const localizedSummary = summary[language]
  if (!isPlainObject(localizedSummary))
    throw new Error(
      `equipment.json 的 Drive Disc ${expectedEntityId} 缺少 ${language} 摘要`,
    )
  for (const field of ["name", "desc2", "desc4"] as const) {
    if (localizedSummary[field] !== value[field])
      throw new Error(
        `Drive Disc ${expectedEntityId} 的 ${language} 摘要与详情 ${field} 不一致`,
      )
  }
  if (summary.icon !== value.icon)
    throw new Error(`Drive Disc ${expectedEntityId} 的摘要与详情 icon 不一致`)
}

function validateEquipmentSummaryRecord(
  value: unknown,
  entityId: string,
): void {
  if (!isPlainObject(value))
    throw new Error(`equipment.json 的 Drive Disc ${entityId} 必须是普通对象`)
  if (typeof value.icon !== "string")
    throw new Error(
      `equipment.json 的 Drive Disc ${entityId} icon 必须是字符串`,
    )
  for (const language of ["zh", "en"] as const) {
    const localized = value[language]
    if (!isPlainObject(localized))
      throw new Error(
        `equipment.json 的 Drive Disc ${entityId} ${language} 必须是普通对象`,
      )
    for (const field of ["name", "desc2", "desc4"] as const) {
      if (typeof localized[field] !== "string")
        throw new Error(
          `equipment.json 的 Drive Disc ${entityId} ${language}.${field} 必须是字符串`,
        )
    }
  }
}

function compareDecimalIds(left: string, right: string): number {
  const leftNumber = BigInt(left)
  const rightNumber = BigInt(right)
  return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0
}

import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import {
  driveDiscDetailFields,
  driveDiscSummaryFields,
  driveDiscSummaryLanguageFields,
  driveDiscSummaryOptionalLocales,
  driveDiscSummaryRequiredLocales,
} from "./drive-disc-schema.ts"
import type { DriveDiscData, DriveDiscDetails } from "./drive-disc-types.ts"
import {
  at,
  copyJson,
  DriveDiscIntegrationError,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单驱动盘已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateDriveDiscInput {
  /** 对应来源索引 key 的规范十进制实体 ID。 */
  entityId: string
  /** 独立来源索引记录，须经运行时 JSON/object 校验；摘要与详情的同名字段不要求相等。 */
  sourceRecord: unknown
  /** 语言 → 原始详情；必须恰好覆盖 detailLocales，不用索引补齐。 */
  details: unknown
  /** 显式有序、非空且不重复的已取得详情语言；纯函数允许子集，生产完整性留在快照构建层。 */
  detailLocales: readonly DetailLocale[]
}

/** 包内整合结果；不代表含摘要与总索引的完整可追溯制品。 */
export interface IntegratedDriveDisc {
  /** data.json 对应的顶层对象。 */
  data: DriveDiscData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, DriveDiscDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段，按配置语言及来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-drive-disc-reference/1 校验、复制和拆分单个驱动盘套装。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 DriveDiscIntegrationError，不返回部分整合结果。
 */
export function integrateDriveDisc(
  input: IntegrateDriveDiscInput,
): IntegratedDriveDisc {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failDriveDisc(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    DriveDiscIntegrationError,
  )
  if (
    !Array.isArray(configuredLocales) ||
    configuredLocales.length === 0 ||
    configuredLocales.some(
      (locale) =>
        typeof locale !== "string" ||
        !supportedLanguages.includes(locale as DetailLocale),
    ) ||
    new Set(configuredLocales).size !== configuredLocales.length
  )
    failDriveDisc(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    DriveDiscIntegrationError,
  )
  if (!isObject(sourceRecord))
    failDriveDisc(indexLocation, "索引记录必须是普通对象")
  const sources = input.details
  if (!isObject(sources)) failDriveDisc(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failDriveDisc(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failDriveDisc(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failDriveDisc(at(location, key), "未配置的详情语言")
  }
  const diagnostics: UnknownFieldDiagnostic[] = []
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failDriveDisc(context, "缺失详情")
    const source = copyJson(sources[locale], context, DriveDiscIntegrationError)
    if (!isObject(source)) failDriveDisc(context, "详情必须是普通对象")
    if (Object.hasOwn(source, "locale"))
      failDriveDisc(at(context, "locale"), "辅助字段重名")
    const record = validateDriveDiscDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failDriveDisc(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  validateDriveDiscSummary(sourceRecord, indexLocation, diagnostics)
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(driveDiscDetailFields).toSorted()) {
    if (!driveDiscDetailFields[key].shared) continue
    for (const index of records.keys())
      if (!equalJson(records[index][key], records[0][key]))
        failDriveDisc(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, key, records[0][key])
    for (const record of records) delete record[key]
  }
  const details: Partial<Record<DetailLocale, DriveDiscDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as DriveDiscDetails
  })
  return {
    data: data as unknown as DriveDiscData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验与未知字段诊断；输出名与来源 key 相同，不改名、不嵌套共享。 */
function validateDriveDiscDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  for (const key of Object.keys(driveDiscDetailFields).toSorted())
    if (!Object.hasOwn(source, key))
      failDriveDisc(at(location, key), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    const definition = Object.hasOwn(driveDiscDetailFields, key)
      ? driveDiscDetailFields[key]
      : undefined
    if (definition === undefined) {
      put(record, key, source[key])
      diagnostics.push({ ...at(location, key), kind: "unknown-field" })
      continue
    }
    if (typeof source[key] !== definition.kind)
      failDriveDisc(at(location, key), `字段类型必须为 ${definition.kind}`)
    put(record, key, source[key])
  }
  return record
}

/** 来源摘要的已登记结构校验；只报告未知字段，不改写 sourceRecord 的原值。 */
function validateDriveDiscSummary(
  record: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): void {
  for (const key of Object.keys(driveDiscSummaryFields).toSorted())
    if (!Object.hasOwn(record, key))
      failDriveDisc(at(location, key), "缺失必需字段")
  for (const locale of driveDiscSummaryRequiredLocales)
    if (!Object.hasOwn(record, locale))
      failDriveDisc(at(location, locale), "缺失必需字段")
  for (const key of Object.keys(record).toSorted()) {
    if (Object.hasOwn(driveDiscSummaryFields, key)) {
      const kind = driveDiscSummaryFields[key]
      if (typeof record[key] !== kind)
        failDriveDisc(at(location, key), `字段类型必须为 ${kind}`)
      continue
    }
    if (
      driveDiscSummaryRequiredLocales.includes(key) ||
      driveDiscSummaryOptionalLocales.includes(key)
    ) {
      validateDriveDiscSummaryLanguage(
        record[key],
        at(location, key),
        diagnostics,
      )
      continue
    }
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
}

/** 摘要语言对象的已登记文本字段校验；可选语言只在存在时进入本检查。 */
function validateDriveDiscSummaryLanguage(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): void {
  if (!isObject(value)) failDriveDisc(location, "摘要语言记录必须是普通对象")
  for (const key of Object.keys(driveDiscSummaryLanguageFields).toSorted()) {
    if (!Object.hasOwn(value, key))
      failDriveDisc(at(location, key), "缺失必需字段")
    const kind = driveDiscSummaryLanguageFields[key]
    if (typeof value[key] !== kind)
      failDriveDisc(at(location, key), `字段类型必须为 ${kind}`)
  }
  for (const key of Object.keys(value).toSorted())
    if (!Object.hasOwn(driveDiscSummaryLanguageFields, key))
      diagnostics.push({ ...at(location, key), kind: "unknown-field" })
}

/** 统一抛出驱动盘整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failDriveDisc(location: SourceLocation, reason: string): never {
  fail(location, reason, DriveDiscIntegrationError)
}

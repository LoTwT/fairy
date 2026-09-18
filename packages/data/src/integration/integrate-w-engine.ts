import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import type {
  WEngineFieldKind,
  WEngineLocalizedDetailField,
  WEngineObjectMember,
  WEngineSharedDetailField,
} from "./w-engine-schema.ts"
import {
  wEngineIndexFields,
  wEngineLocalizedDetailFields,
  wEnginePropertyFields,
  wEnginePropertyTextMembers,
  wEnginePropertyValueMember,
  wEngineSharedDetailFields,
} from "./w-engine-schema.ts"
import type { WEngineData, WEngineDetails } from "./w-engine-types.ts"
import {
  at,
  copyJson,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
  sortedIds,
  WEngineIntegrationError,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单 WEngine 已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateWEngineInput {
  /** 对应来源索引 key 的规范十进制实体 ID。 */
  entityId: string
  /** 独立来源索引记录，须经运行时 JSON/object 校验；与详情的同名字段不要求相等。 */
  sourceRecord: unknown
  /** 语言 → 原始详情；必须恰好覆盖 detailLocales，不用索引补齐。 */
  details: unknown
  /** 显式有序、非空且不重复的已取得详情语言；纯函数允许子集，生产完整性留在快照构建层。 */
  detailLocales: readonly DetailLocale[]
}

/** 包内整合结果；不代表含来源索引的完整可追溯制品。 */
export interface IntegratedWEngine {
  /** data.json 对应的顶层对象。 */
  data: WEngineData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, WEngineDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值；未知顶层字段另进入维护诊断。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段；索引记录的未知顶层字段在前、按来源 key 顺序，语言详情按配置语言与来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-w-engine-reference/1 校验、复制和拆分单个 WEngine。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 WEngineIntegrationError，不返回部分整合结果。
 */
export function integrateWEngine(
  input: IntegrateWEngineInput,
): IntegratedWEngine {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failWEngine(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    WEngineIntegrationError,
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
    failWEngine(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    WEngineIntegrationError,
  )
  if (!isObject(sourceRecord))
    failWEngine(indexLocation, "索引记录必须是普通对象")
  const diagnostics: UnknownFieldDiagnostic[] = []
  // 只识别来源索引的未知顶层字段；登记不要求字段存在或类型相符，未知容器内部不递归推断。
  for (const key of Object.keys(sourceRecord).toSorted())
    if (!wEngineIndexFields.includes(key))
      diagnostics.push({ ...at(indexLocation, key), kind: "unknown-field" })
  const sources = input.details
  if (!isObject(sources)) failWEngine(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failWEngine(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failWEngine(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failWEngine(at(location, key), "未配置的详情语言")
  }
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failWEngine(context, "缺失详情")
    const source = copyJson(sources[locale], context, WEngineIntegrationError)
    if (!isObject(source)) failWEngine(context, "详情必须是普通对象")
    for (const key of ["locale", "classificationIds"])
      if (Object.hasOwn(source, key))
        failWEngine(at(context, key), "辅助字段重名")
    const record = validateWEngineDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failWEngine(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(wEngineSharedDetailFields).toSorted()) {
    const definition = wEngineSharedDetailFields[key]!
    for (const index of records.keys())
      if (
        !equalJson(
          records[index][definition.output],
          records[0][definition.output],
        )
      )
        failWEngine(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, definition.output, records[0][definition.output])
    for (const record of records) delete record[definition.output]
  }
  for (const property of wEnginePropertyFields) {
    const reference = (records[0][property.output] as JsonObject)[
      wEnginePropertyValueMember
    ]
    for (const index of records.keys()) {
      const value = (records[index][property.output] as JsonObject)[
        wEnginePropertyValueMember
      ]
      if (!equalJson(value, reference))
        failWEngine(
          at({ ...location, locale: locales[index] }, property.source),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    }
    const extracted: JsonObject = {}
    put(extracted, wEnginePropertyValueMember, reference)
    put(data, property.output, extracted)
    for (const record of records)
      delete (record[property.output] as JsonObject)[wEnginePropertyValueMember]
  }
  const weaponTypeIds = sortedIds(
    Object.keys(records[0].weaponType as JsonObject),
  )
  records.forEach((record, index) => {
    if (
      !equalJson(
        weaponTypeIds,
        sortedIds(Object.keys(record.weaponType as JsonObject)),
      )
    )
      failWEngine(
        {
          entityId: input.entityId,
          locale: locales[index],
          pointer: "/weapon_type",
        },
        "分类 ID 集合冲突",
      )
  })
  const classificationIds: JsonObject = {}
  put(classificationIds, "weaponType", weaponTypeIds)
  put(data, "classificationIds", classificationIds)
  const details: Partial<Record<DetailLocale, WEngineDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as WEngineDetails
  })
  return {
    data: data as unknown as WEngineData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验与未知字段诊断；输出名按登记表写入。 */
function validateWEngineDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  const registered = Object.keys(wEngineSharedDetailFields).concat(
    Object.keys(wEngineLocalizedDetailFields),
  )
  for (const key of registered.toSorted()) {
    const output = Object.hasOwn(wEngineSharedDetailFields, key)
      ? wEngineSharedDetailFields[key]!.output
      : wEngineLocalizedDetailFields[key]!.output
    if (key !== output && Object.hasOwn(source, output))
      failWEngine(at(location, output), `改名冲突：${key} → ${output}`)
    if (!Object.hasOwn(source, key))
      failWEngine(at(location, key), "缺失必需字段")
  }
  for (const property of wEnginePropertyFields) {
    if (
      property.source !== property.output &&
      Object.hasOwn(source, property.output)
    )
      failWEngine(
        at(location, property.output),
        `改名冲突：${property.source} → ${property.output}`,
      )
    if (!Object.hasOwn(source, property.source))
      failWEngine(at(location, property.source), "缺失必需字段")
  }
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    if (Object.hasOwn(wEngineSharedDetailFields, key)) {
      const definition = wEngineSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateSharedField(
          source[key],
          definition,
          at(location, key),
          diagnostics,
        ),
      )
      continue
    }
    if (Object.hasOwn(wEngineLocalizedDetailFields, key)) {
      const definition = wEngineLocalizedDetailFields[key]!
      put(
        record,
        definition.output,
        validateLocalizedField(
          source[key],
          definition,
          at(location, key),
          diagnostics,
        ),
      )
      continue
    }
    const property = wEnginePropertyFields.find((entry) => entry.source === key)
    if (property) {
      put(
        record,
        property.output,
        validateProperty(source[key], at(location, key), diagnostics),
      )
      continue
    }
    put(record, key, source[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 顶层共享字段的形状校验；阶段字典逐条目核对登记成员。 */
function validateSharedField(
  value: SourceJson,
  definition: WEngineSharedDetailField,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): SourceJson {
  if (definition.shape === "stageDictionary")
    return validateStageDictionary(
      value,
      definition.members,
      location,
      diagnostics,
    )
  return validateField(value, definition.shape, location)
}

/** 顶层本语言字段的形状校验；分类字典要求规范十进制 key 与字符串值。 */
function validateLocalizedField(
  value: SourceJson,
  definition: WEngineLocalizedDetailField,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): SourceJson {
  if (definition.shape === "idDictionary")
    return validateIdDictionary(value, location)
  if (definition.shape === "stageDictionary")
    return validateStageDictionary(
      value,
      definition.members,
      location,
      diagnostics,
    )
  return validateField(value, definition.shape, location)
}

/** 单个已登记字段的类型检查；零、空字符串等合法原值不受真值判断影响。 */
function validateField(
  value: SourceJson,
  kind: WEngineFieldKind,
  location: SourceLocation,
): SourceJson {
  if (typeof value !== kind) failWEngine(location, `字段类型必须为 ${kind}`)
  return value
}

/** 阶段字典的校验与拼写转换；条目必须为登记成员对象。 */
function validateStageDictionary(
  value: SourceJson,
  members: Readonly<Record<string, WEngineObjectMember>>,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failWEngine(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateObjectMembers(
        value[key],
        members,
        at(location, key),
        diagnostics,
      ),
    )
  return record
}

/** 登记成员对象的校验与拼写转换；未登记成员原样保留并报告待登记。 */
function validateObjectMembers(
  value: SourceJson,
  members: Readonly<Record<string, WEngineObjectMember>>,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failWEngine(location, "字段类型必须为普通对象")
  for (const key of Object.keys(members).toSorted()) {
    const member = members[key]!
    if (key !== member.output && Object.hasOwn(value, member.output))
      failWEngine(
        at(location, member.output),
        `改名冲突：${key} → ${member.output}`,
      )
    if (!Object.hasOwn(value, key))
      failWEngine(at(location, key), "缺失必需字段")
  }
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    const member = Object.hasOwn(members, key) ? members[key] : undefined
    if (member === undefined) {
      put(record, key, value[key])
      diagnostics.push({ ...at(location, key), kind: "unknown-field" })
      continue
    }
    put(
      record,
      member.output,
      validateField(value[key], member.kind, at(location, key)),
    )
  }
  return record
}

/** 分类字典的校验；key 必须为规范十进制 ID，值必须为字符串。 */
function validateIdDictionary(
  value: SourceJson,
  location: SourceLocation,
): JsonObject {
  if (!isObject(value)) failWEngine(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isSourceId(key))
      failWEngine(at(location, key), "字典 key 必须为规范十进制 ID")
    put(record, key, validateField(value[key], "string", at(location, key)))
  }
  return record
}

/** 属性对象的校验；`value` 数值与文本成员都必须提供，未知成员原样保留。 */
function validateProperty(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failWEngine(location, "字段类型必须为普通对象")
  for (const key of Object.keys(wEnginePropertyTextMembers).toSorted())
    if (!Object.hasOwn(value, key))
      failWEngine(at(location, key), "缺失必需字段")
  if (!Object.hasOwn(value, wEnginePropertyValueMember))
    failWEngine(at(location, wEnginePropertyValueMember), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (key === wEnginePropertyValueMember) {
      put(record, key, validateField(value[key], "number", at(location, key)))
      continue
    }
    const member = Object.hasOwn(wEnginePropertyTextMembers, key)
      ? wEnginePropertyTextMembers[key]
      : undefined
    if (member === undefined) {
      put(record, key, value[key])
      diagnostics.push({ ...at(location, key), kind: "unknown-field" })
      continue
    }
    put(
      record,
      member.output,
      validateField(value[key], member.kind, at(location, key)),
    )
  }
  return record
}

/** 统一抛出 WEngine 整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failWEngine(location: SourceLocation, reason: string): never {
  fail(location, reason, WEngineIntegrationError)
}

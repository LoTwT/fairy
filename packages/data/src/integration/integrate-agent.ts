import { supportedLanguages } from "../nanoka-identity.ts"
import type {
  AgentData,
  AgentDetails,
  DetailLocale,
  SourceJson,
} from "./agent-types.ts"
import { agentSchema, registeredName } from "./agent-schema.ts"
import type { Schema } from "./agent-schema.ts"
import {
  at,
  copyJson,
  equalJson,
  escapePointer,
  fail,
  isObject,
  isSourceId,
  put,
  sortedIds,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单实体已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateAgentInput {
  /** 对应来源索引 key 的规范十进制实体 ID。 */
  entityId: string
  /** 独立来源索引记录，须经运行时 JSON/object 校验。 */
  sourceRecord: unknown
  /** 语言 → 原始详情；必须恰好覆盖 detailLocales，不用索引补齐。 */
  details: unknown
  /** 显式有序、非空且不重复的已取得详情语言；首项决定 codeName。 */
  detailLocales: readonly DetailLocale[]
}

/** codeName 特例的独立维护记录。 */
export interface CodeNameDifference extends SourceLocation {
  /** 决定 data.codeName 的详情语言。 */
  selectedLocale: DetailLocale
  /** 所选详情中的完整原值。 */
  selectedValue: string
  /** 当前语言的不同原值；不会写入实体详情。 */
  value: string
}

/** 包内整合结果；不代表含摘要与总索引的完整可追溯制品。 */
export interface IntegratedAgent {
  /** data.json 对应的顶层对象。 */
  data: AgentData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, AgentDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段，按配置语言及来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
    /** 仅记录与所选 codeName 不同的语言。 */
    codeNameDifferences: CodeNameDifference[]
  }
}

/**
 * 按规则 v4 校验、复制、改名和拆分单个代理人。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 AgentIntegrationError；不支持的维护登记另抛出含 schema 路径的 Error。
 */
export function integrateAgent(input: IntegrateAgentInput): IntegratedAgent {
  assertSupportedSharing(agentSchema)
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    fail(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
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
    fail(at(location, "detailLocales"), "详情语言列表须非空、受支持且不重复")
  const locales = configuredLocales as DetailLocale[]
  const sourceRecord = copyJson(input.sourceRecord, {
    ...location,
    locale: "index",
  })
  if (!isObject(sourceRecord))
    fail({ ...location, locale: "index" }, "索引记录必须是普通对象")
  const sources = input.details
  if (!isObject(sources)) fail(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string") fail(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      fail(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      fail(at(location, key), "未配置的详情语言")
  }
  const diagnostics: UnknownFieldDiagnostic[] = []
  const codeNameDifferences: CodeNameDifference[] = []
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) fail(context, "缺失详情")
    const source = copyJson(sources[locale], context)
    if (!isObject(source)) fail(context, "详情必须是普通对象")
    for (const key of [
      "locale",
      "navigation",
      "classification_ids",
      "classificationIds",
    ])
      if (Object.hasOwn(source, key)) fail(at(context, key), "辅助字段重名")
    const record = transform(
      source,
      agentSchema,
      context,
      diagnostics,
    ) as JsonObject
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      fail(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const selectedLocale = locales[0]
  const codeName = records[0].codeName as string
  records.forEach((record, index) => {
    if (record.codeName !== codeName)
      codeNameDifferences.push({
        entityId: input.entityId,
        locale: locales[index],
        pointer: "/code_name",
        selectedLocale,
        selectedValue: codeName,
        value: record.codeName as string,
      })
    delete record.codeName
  })
  const classificationIds: JsonObject = {}
  for (const [sourceKey, key] of [
    ["weapon_type", "weaponType"],
    ["element_type", "elementType"],
    ["hit_type", "hitType"],
    ["camp", "camp"],
  ]) {
    const ids = sortedIds(Object.keys(records[0][key] as JsonObject))
    records.forEach((record, index) => {
      if (!equalJson(ids, sortedIds(Object.keys(record[key] as JsonObject))))
        fail(
          {
            entityId: input.entityId,
            locale: locales[index],
            pointer: `/${sourceKey}`,
          },
          "分类 ID 集合冲突",
        )
    })
    put(classificationIds, key, ids)
  }
  const data = split(
    agentSchema,
    records,
    locales.map((locale) => ({ ...location, locale })),
  )!
  data.id = records[0].id
  data.codeName = codeName
  data.classificationIds = classificationIds
  const details: Partial<Record<DetailLocale, AgentDetails>> = {}
  records.forEach((record, index) => {
    record.locale = locales[index]
    record.navigation = navigation(record)
    // transform 已校验全部登记字段；split 仅移动登记的共享载荷，保留语言字段和空壳。
    details[locales[index]] = record as unknown as AgentDetails
  })
  return {
    data: data as unknown as AgentData,
    details,
    sourceRecord,
    maintenance: { diagnostics, codeNameDifferences },
  }
}

function transform(
  value: SourceJson,
  schema: Schema,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): SourceJson {
  if (schema.kind === "string" || schema.kind === "number") {
    if (typeof value !== schema.kind)
      fail(location, `字段类型必须为 ${schema.kind}`)
    return value
  }
  if (schema.kind === "strategy") {
    if (isObject(value) && Object.keys(value).length === 0) return value
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
      fail(location, "strategy 必须为字符串数组或空对象")
    return value
  }
  if (schema.kind === "array") {
    if (!Array.isArray(value)) fail(location, "字段类型必须为数组")
    return value.map((item, index) =>
      transform(item, schema.item, at(location, String(index)), diagnostics),
    )
  }
  if (!isObject(value)) fail(location, "字段类型必须为普通对象")
  const result: JsonObject = {}
  if (schema.kind === "dictionary") {
    for (const key of Object.keys(value).toSorted()) {
      if (schema.ids && !isSourceId(key))
        fail(at(location, key), "字典 key 必须为规范十进制 ID")
      put(
        result,
        key,
        transform(value[key], schema.item, at(location, key), diagnostics),
      )
    }
    return result
  }
  if (schema.empty && Object.keys(value).length === 0) return result
  for (const key of Object.keys(schema.fields).toSorted()) {
    const target = registeredName(key)
    if (key !== target && Object.hasOwn(value, target))
      fail(at(location, target), `改名冲突：${key} → ${target}`)
    if (!schema.fields[key].optional && !Object.hasOwn(value, key))
      fail(at(location, key), "缺失必需字段")
  }
  for (const key of Object.keys(value).toSorted()) {
    if (Object.hasOwn(schema.fields, key))
      put(
        result,
        registeredName(key),
        transform(
          value[key],
          schema.fields[key],
          at(location, key),
          diagnostics,
        ),
      )
    else {
      put(result, key, value[key])
      diagnostics.push({ ...at(location, key), kind: "unknown-field" })
    }
  }
  return result
}

/** 检查维护者的登记表，路径指向 schema；不依赖来源是否出现某字段或数组是否为空。 */
function assertSupportedSharing(
  schema: Schema,
  pointer = "",
  position: "root" | "field" | "dictionary-item" | "whole-value" = "root",
): void {
  if (
    (schema.shared && position !== "field") ||
    (position === "root" && schema.kind !== "object")
  )
    throw new Error(
      `不支持的共享结构登记 ${pointer || "/"}：shared 只能标记可拆分对象的字段，不能标记根、字典元素或整块值内部`,
    )
  const wholeValue = position === "whole-value" || Boolean(schema.shared)
  switch (schema.kind) {
    case "object":
      for (const key of Object.keys(schema.fields).toSorted())
        assertSupportedSharing(
          schema.fields[key],
          `${pointer}/fields/${escapePointer(key)}`,
          wholeValue ? "whole-value" : "field",
        )
      return
    case "dictionary":
      assertSupportedSharing(
        schema.item,
        `${pointer}/item`,
        wholeValue ? "whole-value" : "dictionary-item",
      )
      return
    case "array":
      assertSupportedSharing(schema.item, `${pointer}/item`, "whole-value")
      return
    case "number":
    case "string":
    case "strategy":
      return
    default:
      schema satisfies never
      throw new Error(`不支持的结构登记 ${pointer || "/"}：未知 kind`)
  }
}

/** 只有登记共享后代的容器生成 data 空壳；不抽取普通文本或未知成员。 */
function hasShared(schema: Schema): boolean {
  return (
    Boolean(schema.shared) ||
    (schema.kind === "object" &&
      Object.values(schema.fields).some(hasShared)) ||
    (schema.kind === "dictionary" && hasShared(schema.item))
  )
}

function split(
  schema: Schema,
  records: JsonObject[],
  locations: SourceLocation[],
): JsonObject | undefined {
  if (!hasShared(schema)) return undefined
  if (schema.kind !== "dictionary" && schema.kind !== "object")
    throw new Error(`不支持的共享拆分结构：${schema.kind}`)
  const data: JsonObject = {}
  if (schema.kind === "dictionary") {
    for (const key of Object.keys(records[0]).toSorted()) {
      if (records.every((record) => Object.hasOwn(record, key))) {
        const child = split(
          schema.item,
          records.map((record) => record[key] as JsonObject),
          locations.map((location) => at(location, key)),
        )
        if (child) put(data, key, child)
      }
    }
  } else if (schema.kind === "object") {
    for (const sourceKey of Object.keys(schema.fields).toSorted()) {
      const field = schema.fields[sourceKey]
      const key = registeredName(sourceKey)
      if (!hasShared(field)) continue
      const present = records.flatMap((record, index) =>
        Object.hasOwn(record, key) ? [index] : [],
      )
      if (field.shared) {
        for (const index of present.slice(1))
          if (!equalJson(records[present[0]][key], records[index][key]))
            fail(
              at(locations[index], sourceKey),
              `共享冲突（与 ${locations[present[0]].locale} 的完整值不同）`,
            )
        if (present.length === records.length) {
          put(data, key, records[0][key])
          records.forEach((record) => {
            delete record[key]
          })
        }
      } else if (present.length === records.length) {
        const child = split(
          field,
          records.map((record) => record[key] as JsonObject),
          locations.map((location) => at(location, sourceKey)),
        )
        if (child) put(data, key, child)
      }
    }
  }
  return data
}

function navigation(record: JsonObject): JsonObject {
  const parameterIdsByGroup: JsonObject = {}
  const parameterRowsById: Record<string, string[]> = {}
  const skill = record.skill as JsonObject
  for (const group of Object.keys(skill).toSorted()) {
    const ids = new Set<string>()
    const sections = (skill[group] as JsonObject).description as JsonObject[]
    sections.forEach((section, sectionIndex) => {
      if (!Object.hasOwn(section, "param")) return
      ;(section.param as JsonObject[]).forEach((row, rowIndex) => {
        if (!Object.hasOwn(row, "param")) return
        for (const id of sortedIds(Object.keys(row.param as JsonObject))) {
          ids.add(id)
          if (!Object.hasOwn(parameterRowsById, id))
            put(parameterRowsById, id, [])
          parameterRowsById[id].push(
            `/skill/${escapePointer(group)}/description/${sectionIndex}/param/${rowIndex}`,
          )
        }
      })
    })
    put(parameterIdsByGroup, group, sortedIds([...ids]))
  }
  return { parameterIdsByGroup, parameterRowsById }
}

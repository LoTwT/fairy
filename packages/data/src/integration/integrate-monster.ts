import { supportedLanguages } from "../nanoka-identity.ts"
import type { DetailLocale, SourceJson } from "./agent-types.ts"
import type { MonsterFieldKind, MonsterObjectMember } from "./monster-schema.ts"
import {
  monsterCurveMembers,
  monsterIndexFields,
  monsterLocalizedDetailFields,
  monsterSharedBlockFields,
  monsterSharedDetailFields,
  monsterUnitMembers,
} from "./monster-schema.ts"
import type { MonsterData, MonsterDetails } from "./monster-types.ts"
import {
  at,
  copyJson,
  equalJson,
  fail,
  isObject,
  isSourceId,
  put,
  MonsterIntegrationError,
} from "./source-json.ts"
import type {
  JsonObject,
  SourceLocation,
  UnknownFieldDiagnostic,
} from "./source-json.ts"

/** 单怪物已解析输入；语言顺序由调用方明确提供，不隐式加载来源配置。 */
export interface IntegrateMonsterInput {
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
export interface IntegratedMonster {
  /** data.json 对应的顶层对象。 */
  data: MonsterData
  /** 本次输入语言 → details.{locale}.json 顶层对象；未读取语言不存在。 */
  details: Partial<Record<DetailLocale, MonsterDetails>>
  /** 完整独立来源索引记录副本，供后续总索引使用，保持原 key 与原值；未知顶层字段另进入维护诊断。 */
  sourceRecord: JsonObject
  /** 与实体数据分开的维护信息。 */
  maintenance: {
    /** 未登记结构字段；索引记录的未知顶层字段在前、按来源 key 顺序，语言详情按配置语言与来源路径的确定性顺序排列。 */
    diagnostics: UnknownFieldDiagnostic[]
  }
}

/**
 * 按规则 nanoka-monster-reference/1 校验、复制和拆分单个怪物。无 I/O、默认值或语言回退。
 * 来源校验失败抛出含来源位置的 MonsterIntegrationError，不返回部分整合结果。
 */
export function integrateMonster(
  input: IntegrateMonsterInput,
): IntegratedMonster {
  const location: SourceLocation = {
    entityId: input.entityId,
    locale: "input",
    pointer: "",
  }
  if (typeof input.entityId !== "string" || !isSourceId(input.entityId))
    failMonster(at(location, "entityId"), "实体 ID 不是规范十进制 key")
  const configuredLocales = copyJson(
    input.detailLocales,
    at(location, "detailLocales"),
    MonsterIntegrationError,
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
    failMonster(
      at(location, "detailLocales"),
      "详情语言列表须非空、受支持且不重复",
    )
  const locales = configuredLocales as DetailLocale[]
  const indexLocation: SourceLocation = { ...location, locale: "index" }
  const sourceRecord = copyJson(
    input.sourceRecord,
    indexLocation,
    MonsterIntegrationError,
  )
  if (!isObject(sourceRecord))
    failMonster(indexLocation, "索引记录必须是普通对象")
  const diagnostics: UnknownFieldDiagnostic[] = []
  // 只识别来源索引的未知顶层字段；登记不要求字段存在或类型相符，未知容器内部不递归推断。
  for (const key of Object.keys(sourceRecord).toSorted())
    if (!monsterIndexFields.includes(key))
      diagnostics.push({ ...at(indexLocation, key), kind: "unknown-field" })
  const sources = input.details
  if (!isObject(sources)) failMonster(location, "details 必须是语言记录对象")
  for (const key of Reflect.ownKeys(sources)) {
    if (typeof key !== "string")
      failMonster(location, "语言记录不能包含 Symbol key")
    const descriptor = Object.getOwnPropertyDescriptor(sources, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      failMonster(at(location, key), "语言记录必须是可枚举数据属性")
    if (!locales.includes(key as DetailLocale))
      failMonster(at(location, key), "未配置的详情语言")
  }
  const records = locales.map((locale) => {
    const context: SourceLocation = { ...location, locale }
    if (!Object.hasOwn(sources, locale)) failMonster(context, "缺失详情")
    const source = copyJson(sources[locale], context, MonsterIntegrationError)
    if (!isObject(source)) failMonster(context, "详情必须是普通对象")
    if (Object.hasOwn(source, "locale"))
      failMonster(at(context, "locale"), "辅助字段重名")
    const record = validateMonsterDetail(source, context, diagnostics)
    if (
      !Number.isSafeInteger(record.id) ||
      String(record.id) !== input.entityId
    )
      failMonster(at(context, "id"), "详情身份与实体 ID 不一致")
    return record
  })
  const data: JsonObject = { id: records[0].id }
  for (const key of Object.keys(monsterSharedDetailFields).toSorted()) {
    const definition = monsterSharedDetailFields[key]!
    for (const index of records.keys())
      if (
        !equalJson(
          records[index][definition.output],
          records[0][definition.output],
        )
      )
        failMonster(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, definition.output, records[0][definition.output])
    for (const record of records) delete record[definition.output]
  }
  for (const key of Object.keys(monsterSharedBlockFields).toSorted()) {
    const output = monsterSharedBlockFields[key]!
    for (const index of records.keys())
      if (!equalJson(records[index][output], records[0][output]))
        failMonster(
          at({ ...location, locale: locales[index] }, key),
          `共享冲突（与 ${locales[0]} 的完整值不同）`,
        )
    put(data, output, records[0][output])
    for (const record of records) delete record[output]
  }
  const details: Partial<Record<DetailLocale, MonsterDetails>> = {}
  records.forEach((record, index) => {
    put(record, "locale", locales[index])
    details[locales[index]] = record as unknown as MonsterDetails
  })
  return {
    data: data as unknown as MonsterData,
    details,
    sourceRecord,
    maintenance: { diagnostics },
  }
}

/** 详情记录的已登记字段校验与未知字段诊断；输出名按登记表写入。 */
function validateMonsterDetail(
  source: JsonObject,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  const namedFields: Readonly<Record<string, { output: string }>> = {
    ...monsterSharedDetailFields,
    ...Object.fromEntries(
      Object.entries(monsterSharedBlockFields).map(([key, output]) => [
        key,
        { output },
      ]),
    ),
    ...monsterLocalizedDetailFields,
  }
  for (const key of Object.keys(namedFields).toSorted()) {
    const output = namedFields[key]!.output
    if (key !== output && Object.hasOwn(source, output))
      failMonster(at(location, output), `改名冲突：${key} → ${output}`)
    if (!Object.hasOwn(source, key))
      failMonster(at(location, key), "缺失必需字段")
  }
  const record: JsonObject = {}
  for (const key of Object.keys(source).toSorted()) {
    if (Object.hasOwn(monsterSharedDetailFields, key)) {
      const definition = monsterSharedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(monsterSharedBlockFields, key)) {
      const output = monsterSharedBlockFields[key]!
      put(
        record,
        output,
        key === "monster_info"
          ? validateMonsterInfo(source[key], at(location, key), diagnostics)
          : validateElementAbnormal(source[key], at(location, key)),
      )
      continue
    }
    if (Object.hasOwn(monsterLocalizedDetailFields, key)) {
      const definition = monsterLocalizedDetailFields[key]!
      put(
        record,
        definition.output,
        validateField(source[key], definition.kind, at(location, key)),
      )
      continue
    }
    put(record, key, source[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 单个已登记字段的类型检查；零、空字符串等合法原值不受真值判断影响。 */
function validateField(
  value: SourceJson,
  kind: MonsterFieldKind,
  location: SourceLocation,
): SourceJson {
  switch (kind) {
    case "string":
      if (typeof value !== "string")
        failMonster(location, "字段类型必须为 string")
      return value
    case "number":
      if (typeof value !== "number")
        failMonster(location, "字段类型必须为 number")
      return value
    case "stringArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        failMonster(location, "字段类型必须为 string[]")
      return value
    case "numberArray":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "number")
      )
        failMonster(location, "字段类型必须为 number[]")
      return value
  }
}

/** 登记成员对象的改名冲突与必需检查；未登记成员由调用方原样保留并报告待登记。 */
function assertRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, MonsterObjectMember>>,
  location: SourceLocation,
): void {
  for (const key of Object.keys(members).toSorted()) {
    const member = members[key]!
    if (key !== member.output && Object.hasOwn(value, member.output))
      failMonster(
        at(location, member.output),
        `改名冲突：${key} → ${member.output}`,
      )
    if (!Object.hasOwn(value, key))
      failMonster(at(location, key), "缺失必需字段")
  }
}

/** 按登记成员转换一个对象：已登记成员校验类型并转换拼写，未登记成员原样保留并诊断。 */
function transformRegisteredMembers(
  value: JsonObject,
  members: Readonly<Record<string, MonsterObjectMember>>,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
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

/**
 * 来源 `monster_info` 完整共享块的校验与拼写转换；内部单位 key 即单位身份。
 * 单位 key 必须是规范十进制 ID 且与其自身 `id` 一致；它不要求等于顶层详情 ID 或 `monsterId`，
 * 顶层 `monsterId` 也不要求出现在单位集合中。空对象是合法原值。
 */
function validateMonsterInfo(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (!isSourceId(key))
      failMonster(at(location, key), "内部单位 key 不是规范十进制 ID")
    const unit = validateMonsterUnit(value[key], at(location, key), diagnostics)
    if (!Number.isSafeInteger(unit.id) || String(unit.id) !== key)
      failMonster(at(at(location, key), "id"), "内部单位 id 与其 key 不一致")
    put(record, key, unit)
  }
  return record
}

/** 单个内部战斗单位的校验与拼写转换；`element`、`stats`、`curves` 是字典结构另行校验。 */
function validateMonsterUnit(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, monsterUnitMembers, location)
  for (const key of ["element", "stats", "curves"])
    if (!Object.hasOwn(value, key))
      failMonster(at(location, key), "缺失必需字段")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (Object.hasOwn(monsterUnitMembers, key)) {
      const member = monsterUnitMembers[key]!
      put(
        record,
        member.output,
        validateField(value[key], member.kind, at(location, key)),
      )
      continue
    }
    if (key === "element") {
      put(record, "element", validateElement(value[key], at(location, key)))
      continue
    }
    if (key === "stats") {
      put(record, "stats", validateStats(value[key], at(location, key)))
      continue
    }
    if (key === "curves") {
      put(
        record,
        "curves",
        validateCurves(value[key], at(location, key), diagnostics),
      )
      continue
    }
    put(record, key, value[key])
    diagnostics.push({ ...at(location, key), kind: "unknown-field" })
  }
  return record
}

/** 来源 `element` 弱点抗性字典的校验；元素编码 key 原样保留。 */
function validateElement(
  value: SourceJson,
  location: SourceLocation,
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "number")
      failMonster(at(location, key), "元素数值必须为 number")
    put(record, key, value[key])
  }
  return record
}

/** 来源 `stats` 属性字典的校验；属性编码 key 原样保留，数值与布尔开关都合法。 */
function validateStats(
  value: SourceJson,
  location: SourceLocation,
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    const entry = value[key]
    if (typeof entry !== "number" && typeof entry !== "boolean")
      failMonster(at(location, key), "属性数值必须为 number 或 boolean")
    put(record, key, entry)
  }
  return record
}

/** 来源 `curves` 成长曲线字典的校验；曲线 key 原样保留。 */
function validateCurves(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted())
    put(
      record,
      key,
      validateCurveEntry(value[key], at(location, key), diagnostics),
    )
  return record
}

/** 单条成长曲线的校验与拼写转换；未登记成员原样保留并报告待登记。 */
function validateCurveEntry(
  value: SourceJson,
  location: SourceLocation,
  diagnostics: UnknownFieldDiagnostic[],
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  assertRegisteredMembers(value, monsterCurveMembers, location)
  return transformRegisteredMembers(
    value,
    monsterCurveMembers,
    location,
    diagnostics,
  )
}

/** 来源 `element_abnormal` 属性异常字典的校验；属性编码 key 原样保留。 */
function validateElementAbnormal(
  value: SourceJson,
  location: SourceLocation,
): JsonObject {
  if (!isObject(value)) failMonster(location, "字段类型必须为普通对象")
  const record: JsonObject = {}
  for (const key of Object.keys(value).toSorted()) {
    if (typeof value[key] !== "number")
      failMonster(at(location, key), "属性异常数值必须为 number")
    put(record, key, value[key])
  }
  return record
}

/** 统一抛出 Monster 整合错误；共享 JSON 保真边界也沿用同一类型报告。 */
function failMonster(location: SourceLocation, reason: string): never {
  fail(location, reason, MonsterIntegrationError)
}
